#!/usr/bin/env node
/** Static React build. Reads committed artifacts; never scans the installed app. */
import { readFile, writeFile, mkdir, rm, cp, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'vite';
import { createHighlighter, bundledLanguages } from 'shiki';
import { format } from 'prettier';
import { pageMeta } from './research/content.mjs';
import { validateModel } from './research/analyze.mjs';
import { layoutGraph, mermaidFor } from '../web/layout.mjs';
import { documentHtml } from './lib/document.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const outIndex = args.indexOf('--out-dir');
const OUT = resolve(outIndex >= 0 ? args[outIndex + 1] : join(ROOT, 'site'));
const CACHE = join(ROOT, '.cache');
const STAGE = join(CACHE, 'atlas-stage');
const raw = await readFile(join(ROOT, 'evidence/static/atlas-model.json'), 'utf8');
const model = JSON.parse(raw);
const errors = validateModel(model);
if (errors.length) throw new Error(errors.join('\n'));
const sha = (s) => createHash('sha256').update(s).digest('hex');
for (const [name, digest] of Object.entries(model.provenance.inputDigests))
  if (sha(await readFile(join(ROOT, `evidence/static/${name}.json`))) !== digest)
    throw new Error(`Research input drift: ${name}. Refresh the research model explicitly.`);
await rm(STAGE, { recursive: true, force: true });
await mkdir(join(STAGE, 'assets/data'), { recursive: true });
await mkdir(join(STAGE, 'assets/evidence'), { recursive: true });
console.log('atlas: compiling the React workbench');
const shared = { root: ROOT, configFile: false, base: './', logLevel: 'warn' };
await build({
  ...shared,
  build: {
    outDir: join(CACHE, 'atlas-client'),
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: join(ROOT, 'web/entry-client.tsx'),
      output: {
        entryFileNames: 'assets/workbench-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
await build({
  ...shared,
  build: {
    ssr: join(ROOT, 'web/entry-server.tsx'),
    outDir: join(CACHE, 'atlas-server'),
    emptyOutDir: true,
    rollupOptions: { output: { entryFileNames: 'render.mjs' } },
  },
});
await cp(join(CACHE, 'atlas-client/assets'), join(STAGE, 'assets'), { recursive: true });
const manifest = JSON.parse(
  await readFile(join(CACHE, 'atlas-client/.vite/manifest.json'), 'utf8')
);
const entry = Object.values(manifest).find((v) => v.isEntry);
const { render, graphFor } = await import(
  pathToFileURL(join(CACHE, 'atlas-server/render.mjs')).href + '?build=' + Date.now()
);
const languages = [
  'javascript',
  'typescript',
  'tsx',
  'rust',
  'json',
  'bash',
  'html',
  'css',
  ...('mermaid' in bundledLanguages ? ['mermaid'] : []),
];
const highlighter = await createHighlighter({
  themes: ['github-light', 'github-dark-dimmed'],
  langs: languages,
});
const highlight = (text, language) =>
  highlighter.codeToHtml(text, {
    lang: languages.includes(language) ? language : 'text',
    themes: { light: 'github-light', dark: 'github-dark-dimmed' },
  });
console.log(`atlas: preparing ${model.sources.length} source excerpts`);
const highlightCache = join(CACHE, 'atlas-highlight');
await mkdir(highlightCache, { recursive: true });
const highlightRecipe = sha(Buffer.concat([await readFile(fileURLToPath(import.meta.url)), await readFile(join(ROOT, 'package-lock.json'))]));
for (const [i, source] of model.sources.entries()) {
  const cacheFile = join(highlightCache, sha(highlightRecipe + JSON.stringify(source)) + '.json');
  try {
    const cached = await readFile(cacheFile);
    await writeFile(join(STAGE, `assets/evidence/${source.id}.json`), cached);
    continue;
  } catch { /* A cold build prepares the exact same artifacts. */ }
  const prepared = { ...source, html: highlight(source.excerpt, source.language) };
  if (source.language === 'javascript' && source.excerpt.length < 9000) {
    try {
      const formatted = (
        await format(source.excerpt, { parser: 'babel', printWidth: 76 })
      ).trimEnd();
      if (formatted !== source.excerpt.trimEnd()) {
        prepared.formatted = formatted;
        prepared.formattedHtml = highlight(formatted, 'javascript');
      }
    } catch {
      /* Incomplete context spans retain exact original text. */
    }
  }
  const serialized = JSON.stringify(prepared);
  await writeFile(cacheFile, serialized);
  await writeFile(join(STAGE, `assets/evidence/${source.id}.json`), serialized);
  if (i > 0 && i % 600 === 0) console.log(`  highlighted ${i}/${model.sources.length}`);
}
const code = {};
const recipe = (id, text, language) => {
  code[id] = { text, language, html: highlight(text, language) };
};
recipe(
  'build',
  `npm ci\nnpm run typecheck\nnpm test\nnpm run build\n\n# Serve the generated site without a backend\npython3 -m http.server 8000 --directory site\n\n# React development server with hot updates\nnpm run dev`,
  'bash'
);
recipe(
  'research',
  [
    '# Requires the archived extracted package and the local OSS repository.',
    '# Ordinary builds do not need either source directory.',
    'npm run research -- --snapshot /path/to/extracted-app --repo /path/to/codex --ref ' +
      model.provenance.coreRevision,
    '',
    'npm run build',
  ].join('\n'),
  'bash'
);
await cp(join(ROOT, 'evidence/runtime/shots'), join(STAGE, 'assets/shots'), {
  recursive: true,
  filter: (src) => !src.endsWith('.json') && !src.endsWith('.mjs'),
});
for (const capture of model.captures) {
  if (sha(await readFile(join(STAGE, capture.src))) !== capture.sha256)
    throw new Error(`Capture digest mismatch: ${capture.name}`);
}
await writeFile(join(STAGE, 'assets/data/research.json'), raw);
await writeFile(join(STAGE, 'assets/data/bundle.json'), JSON.stringify(model.bundle));
const moduleNode = (m) => ({
  id: m.id,
  kind: 'module',
  label: { en: m.path.split('/').at(-1), zh: m.path.split('/').at(-1) },
  summary: { en: m.path, zh: m.path },
  layers: m.zone === 'main' ? ['shell'] : [],
  page: 'bundle',
  sourceIds: m.sourceIds,
  evidence: ['manifest'],
  group: m.family,
});
await writeFile(
  join(STAGE, 'assets/data/search.json'),
  JSON.stringify([...model.nodes, ...model.bundle.modules.map(moduleNode)])
);
await mkdir(join(STAGE, 'assets/licenses'), { recursive: true });
await cp(
  join(ROOT, 'evidence/static/licenses/codex-LICENSE.txt'),
  join(STAGE, 'assets/licenses/codex-LICENSE.txt')
);
for (const name of [
  'react',
  'react-dom',
  '@xyflow/react',
  'elkjs',
  'lucide-react',
  '@fontsource/ibm-plex-sans',
  '@fontsource/ibm-plex-serif',
  '@fontsource/ibm-plex-mono',
  '@fontsource/noto-sans-sc',
]) {
  for (const candidate of ['LICENSE', 'LICENSE.txt', 'LICENSE.md', 'license', 'OFL.txt']) {
    try {
      const content = await readFile(join(ROOT, 'node_modules', name, candidate));
      await writeFile(
        join(STAGE, 'assets/licenses', name.replaceAll('/', '-').replace('@', '') + '-LICENSE.txt'),
        content
      );
      break;
    } catch {}
  }
}
const sourceMetadata = model.sources.map(({ excerpt, formatted, html, formattedHtml, ...s }) => ({
  ...s,
  excerpt: '',
}));
const compactModules = model.bundle.modules.filter(
  (m) => m.zone === 'main' || model.findings.some((f) => f.nodes.includes(m.id))
);
const scopeLayouts = {};
for (const id of [
  ...model.contexts.map((c) => `context:${c.id}`),
  ...model.capabilities.map((c) => `cap:${c.id}`),
])
  scopeLayouts[id] = await layoutGraph(graphFor('features', model, id));
await mkdir(join(CACHE, 'atlas-pages'), { recursive: true });
const pageSizes = {};
const pageDigests = {};
for (const page of pageMeta) {
  const initialSourceIds = new Set([
    ...model.findings.flatMap((f) => f.sourceIds),
    ...model.scenarios.flatMap((s) => s.steps.flatMap((step) => step.sourceIds)),
    ...model.bundle.csp.map((c) => c.sourceId),
    ...(page.id === 'core-api' ? model.methods.map((m) => m.sourceIds[0]) : []),
  ]);
  const pageModel = {
    ...model,
    sources: sourceMetadata.filter((s) => initialSourceIds.has(s.id)),
    bundle: {
      ...model.bundle,
      modules: compactModules,
      missingImports: page.id === 'bundle' ? model.bundle.missingImports : [],
    },
  };
  const spec = graphFor(page.id, pageModel);
  const graphLayout = await layoutGraph(spec);
  recipe(`mermaid:${page.id}`, mermaidFor(spec), 'mermaid');
  const data = {
    page: page.id,
    model: pageModel,
    code: {
      build: code.build,
      research: code.research,
      [`mermaid:${page.id}`]: code[`mermaid:${page.id}`],
    },
    graphLayout,
    scopeLayouts,
    bundleUrl: 'assets/data/bundle.json',
    searchUrl: 'assets/data/search.json',
    sourcesUrl: 'assets/evidence/',
  };
  const markup = render(data);
  const html = documentHtml(page, markup, data, entry.css ?? [], entry.file);
  await writeFile(join(STAGE, `${page.id}.html`), html);
  await writeFile(join(CACHE, `atlas-pages/${page.id}.json`), JSON.stringify(data));
  pageSizes[`${page.id}.html`] = Buffer.byteLength(html);
  pageDigests[`${page.id}.html`] = sha(html);
  console.log(`  ${page.id}.html · ${Math.round(pageSizes[`${page.id}.html`] / 1024)} KB`);
}
await cp(join(ROOT, 'web/assets/logos'), join(STAGE, 'assets/logos'), { recursive: true });
const officialLogo = await readFile(join(ROOT, 'web/assets/logos/chatgpt.svg'), 'utf8');
await writeFile(
  join(STAGE, 'favicon.svg'),
  officialLogo.replace(
    /(<svg\b[^>]*>)/,
    '$1<style>:root{color:#202b3b}@media(prefers-color-scheme:dark){:root{color:#e5ebf5}}</style>'
  )
);
const pkg = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8'));
const clientAssets = [];
for (const name of (await readdir(join(CACHE, 'atlas-client/assets'))).sort()) {
  const content = await readFile(join(CACHE, 'atlas-client/assets', name));
  clientAssets.push({ file: `assets/${name}`, bytes: content.length, sha256: sha(content) });
}
await writeFile(
  join(STAGE, 'assets/data/build-manifest.json'),
  JSON.stringify(
    {
      schemaVersion: 1,
      appVersion: model.provenance.appVersion,
      coreRevision: model.provenance.coreRevision,
      modelSha256: sha(raw),
      packageLockSha256: sha(await readFile(join(ROOT, 'package-lock.json'))),
      react: pkg.dependencies.react,
      pageSizes,
      pageDigests,
      clientAssets,
      logoProvenance: JSON.parse(await readFile(join(ROOT, 'web/assets/logos/provenance.json'), 'utf8')),
      captures: model.captures.map((c) => ({ path: c.src, sha256: c.sha256 })),
      sourceCount: model.sources.length,
      buildInputs:
        'Committed research artifacts only; no external source checkout or network at build time.',
    },
    null,
    2
  )
);
// Replace only the generated site after every page and capture has succeeded.
await mkdir(OUT, { recursive: true });
for (const f of await readdir(OUT)) await rm(join(OUT, f), { recursive: true, force: true });
await cp(STAGE, OUT, { recursive: true });
highlighter.dispose();
console.log(`atlas: all nine pages rendered to ${relative(ROOT, OUT) || OUT}`);
