#!/usr/bin/env node
import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { dirname, join, relative, resolve, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  analyzeJavaScript,
  fieldsOf,
  resolveFileReference,
  validateModel,
} from './research/analyze.mjs';
import {
  contexts,
  capabilityNotes,
  surfaceGroups,
  surfaces,
  settingsLabels,
  text as T,
} from './research/content.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (name, fallback) =>
  args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : fallback;
const readJSON = async (file) => JSON.parse(await readFile(file, 'utf8'));
const scan = await readJSON(join(ROOT, 'evidence/static/scan-model.json'));
const rust = await readJSON(join(ROOT, 'evidence/static/rust-core-model.json'));
const three = await readJSON(join(ROOT, 'evidence/static/three-way-model.json'));
const SNAPSHOT = resolve(flag('snapshot', scan.generatedFrom.root));
const REPO = resolve(flag('repo', rust.generatedFrom.repo));
const OUT = resolve(flag('out', join(ROOT, 'evidence/static/atlas-model.json')));
const sha = (value) => createHash('sha256').update(value).digest('hex');
const git = (...argv) =>
  execFileSync('git', ['-C', REPO, ...argv], { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
const REV = git(
  'rev-parse',
  `${flag('ref', rust.generatedFrom.head.split(' ')[0])}^{commit}`
).trim();
const pkg = await readJSON(join(SNAPSHOT, 'package.json'));
if (pkg.version !== scan.generatedFrom.version)
  throw new Error(`Snapshot version mismatch: ${pkg.version}`);
const mainFile = (await readdir(join(SNAPSHOT, '.vite/build'))).find((n) =>
  /^main-.*\.js$/.test(n)
);
if (
  !mainFile ||
  sha(await readFile(join(SNAPSHOT, '.vite/build', mainFile))) !== scan.windowSurface.sha256
)
  throw new Error('Snapshot main bundle does not match the archived model');

const sources = new Map();
function sourceRef(path, content, start, end, kind, revision = undefined, note = undefined) {
  start = Math.max(0, start);
  end = Math.min(content.length, end);
  const excerpt = content.slice(start, end);
  const digest = sha(content);
  const id = 'src-' + sha(`${kind}:${path}:${digest}:${start}:${end}`).slice(0, 18);
  if (sources.has(id)) return id;
  const lineStart = content.slice(0, start).split('\n').length;
  const lineEnd = lineStart + excerpt.split('\n').length - 1;
  const language = path.endsWith('.rs')
    ? 'rust'
    : path.endsWith('.json')
      ? 'json'
      : /\.[cm]?js$/.test(path)
        ? 'javascript'
        : 'text';
  sources.set(id, {
    id,
    kind,
    path,
    sha256: digest,
    excerpt,
    excerptSha256: sha(excerpt),
    lineStart,
    lineEnd,
    byteStart: Buffer.byteLength(content.slice(0, start)),
    byteEnd: Buffer.byteLength(content.slice(0, end)),
    language,
    ...(revision
      ? {
          revision,
          href: `https://github.com/openai/codex/blob/${revision}/${path}#L${lineStart}-L${lineEnd}`,
        }
      : {}),
    ...(note ? { note } : {}),
  });
  return id;
}
const around = (path, content, position, kind, size = 1000) =>
  sourceRef(path, content, position - 160, position + size - 160, kind);
const inputDigests = {};
for (const name of ['scan-model', 'rust-core-model', 'three-way-model'])
  inputDigests[name] = sha(await readFile(join(ROOT, `evidence/static/${name}.json`)));

console.log(`research: ${pkg.version}, core ${REV.slice(0, 12)} (read-only sources)`);
const rustPaths = git('ls-tree', '-r', '--name-only', REV, '--', 'codex-rs/app-server-protocol/src')
  .trim()
  .split('\n')
  .filter((p) => p.endsWith('.rs') && !/test/.test(p));
const rustFiles = rustPaths.map((path) => ({ path, content: git('show', `${REV}:${path}`) }));
const common = rustFiles.find((f) => f.path.endsWith('/protocol/common.rs'));
const schemaPaths = [
  'codex-rs/app-server-protocol/schema/json/codex_app_server_protocol.v2.schemas.json',
  'codex-rs/app-server-protocol/schema/json/codex_app_server_protocol.schemas.json',
];
const schemas = schemaPaths
  .map((path) => ({ path, content: git('show', `${REV}:${path}`) }))
  .map((f) => ({ ...f, data: JSON.parse(f.content) }));
const definition = (name) => {
  if (!name) return null;
  for (const s of schemas)
    for (const key of [name, name.replace(/^v2\//, ''), `v2/${name}`])
      if (s.data.definitions?.[key]) return s.data.definitions[key];
  return null;
};
function rustDefinition(name) {
  if (!name) return null;
  const simple = name.split(/::|\//).at(-1);
  const regex = new RegExp(`(?:pub\\s+)?(?:struct|enum|type)\\s+${simple}\\b`);
  for (const f of rustFiles) {
    const hit = regex.exec(f.content);
    if (!hit) continue;
    const start = f.content.lastIndexOf('\n', hit.index) + 1;
    const tail = f.content.slice(start);
    const endOf = tail.indexOf('\n}\n');
    const end =
      start +
      (endOf >= 0 ? Math.min(endOf + 3, 9000) : Math.min(tail.indexOf('\n') + 1 || 250, 1000));
    return sourceRef(f.path, f.content, start, end, 'protocol', REV);
  }
  return null;
}
const methodRecords = [...three.core.present, ...three.core.unused].sort((a, b) =>
  a.method.localeCompare(b.method)
);
const methods = methodRecords.map((m) => {
  const ids = [];
  const needle = `=> "${m.method}"`;
  const at = common.content.indexOf(needle);
  let response = null;
  if (at >= 0) {
    const start = common.content.lastIndexOf('\n', at) + 1;
    const end = common.content.indexOf('\n    }', at);
    const limit = end >= 0 ? Math.min(end + 6, at + 1600) : at + 220;
    ids.push(sourceRef(common.path, common.content, start, limit, 'protocol', REV));
    response =
      common.content
        .slice(start, limit)
        .match(/response:\s*([\w:]+)/)?.[1]
        ?.split('::')
        .at(-1) ?? null;
  } else {
    for (const s of schemas) {
      const p = s.content.indexOf(`"${m.method}"`);
      if (p >= 0) {
        ids.push(
          sourceRef(
            s.path,
            s.content,
            Math.max(0, s.content.lastIndexOf('\n', p - 100)),
            p + m.method.length + 120,
            'protocol',
            REV
          )
        );
        break;
      }
    }
  }
  for (const name of [m.params, response]) {
    const s = rustDefinition(name);
    if (s) ids.push(s);
  }
  const schemaEntry = Object.values(rust.channels)
    .flatMap((c) => c.entries)
    .find((e) => e.method === m.method);
  return {
    id: `core:${m.method}`,
    method: m.method,
    domain: m.domain,
    channel: m.channel,
    direction: m.direction,
    type: m.type,
    params: m.params,
    response,
    presentInApp: m.presentInApp,
    files: [
      ...m.inMain.map((f) => `.vite/build/${f}`),
      ...m.inRenderer.map((f) => `webview/assets/${f}`),
    ],
    sourceIds: [...new Set(ids)],
    fields: fieldsOf(definition(m.params)),
    resultFields: fieldsOf(definition(response)),
    description: schemaEntry?.description ?? '',
  };
});
const methodMap = new Map(methods.map((m) => [m.method, m]));
const ipc = three.shell.channels.map((c) => ({
  id: `ipc:${c.suffix}`,
  channel: c.channel,
  suffix: c.suffix,
  files: [],
  sourceIds: [],
  roles: [],
}));
const ipcMap = new Map(ipc.map((c) => [c.channel, c]));
const endpointMap = new Map(
  three.cloud.paths.map((c) => [
    c.path,
    {
      id: `cloud:${c.path}`,
      path: c.path,
      service: c.service,
      verbs: [],
      sourceIds: [],
      files: [],
      inputs: [],
      outputs: [],
      baseline: true,
      layers: [],
    },
  ])
);

async function walk(dir) {
  const result = [];
  for (const ent of (await readdir(dir, { withFileTypes: true })).sort((a, b) =>
    a.name.localeCompare(b.name)
  )) {
    if (ent.isSymbolicLink()) continue;
    const full = join(dir, ent.name);
    if (ent.isDirectory()) result.push(...(await walk(full)));
    else result.push(full);
  }
  return result;
}
const allFiles = await walk(SNAPSHOT);
const modules = [];
const flags = [];
const csp = [];
const nameSources = new Set();
const stats = {
  files: allFiles.length,
  bytes: 0,
  js: 0,
  parsed: 0,
  failed: 0,
  imports: 0,
  dynamicImports: 0,
  missingImports: 0,
  sourceMaps: 0,
  exactDuplicateFiles: 0,
  duplicateBytes: 0,
};
const markers = new Map();
const markerNeedles = [
  '/__codex-api/',
  '/backend-api/',
  'chatgpt.com',
  'app-server',
  'BrowserWindow',
  'ipcMain.handle',
  'spawn(',
  'contextBridge.exposeInMainWorld',
];
const services = new Set(three.cloud.services.map((s) => s.service));
const opts = { methods: new Set(methodMap.keys()), channels: new Set(ipcMap.keys()), services };
for (const [index, full] of allFiles.entries()) {
  const path = relative(SNAPSHOT, full).split('\\').join('/');
  const bytes = await readFile(full);
  const ext = extname(path).slice(1) || '(none)';
  const zone = path.startsWith('webview/')
    ? 'renderer'
    : path.startsWith('.vite/')
      ? 'main'
      : path.startsWith('node_modules/')
        ? 'dependencies'
        : path.startsWith('native-menu-locales/')
          ? 'locales'
          : 'package';
  const family = basename(path)
    .split('-')[0]
    .replace(/\.[^.]+$/, '');
  const mod = {
    id: `mod:${path}`,
    path,
    family,
    bytes: bytes.length,
    sha256: sha(bytes),
    ext,
    zone,
    imports: [],
    parsed: null,
    sourceIds: [],
    coreMethods: [],
    endpointIds: [],
    ipc: [],
  };
  stats.bytes += bytes.length;
  if (ext === 'map') stats.sourceMaps++;
  if (['js', 'mjs', 'cjs'].includes(ext)) {
    stats.js++;
    const content = bytes.toString('utf8');
    const analyzed = analyzeJavaScript(content, path, opts);
    mod.parsed = !analyzed.parseError;
    if (analyzed.parseError) {
      stats.failed++;
      mod.parseError = analyzed.parseError;
    } else stats.parsed++;
    mod.imports = analyzed.imports;
    stats.imports += mod.imports.length;
    stats.dynamicImports += mod.imports.filter((i) => i.dynamic).length;
    if (zone === 'main' || (!nameSources.has(family) && zone === 'renderer')) {
      mod.sourceIds.push(sourceRef(path, content, 0, Math.min(700, content.length), 'manifest'));
      nameSources.add(family);
    }
    for (const hit of analyzed.literals) {
      const m = methodMap.get(hit.value);
      const ch = ipcMap.get(hit.value);
      if (m) {
        mod.coreMethods.push(m.method);
        if (m.sourceIds.filter((id) => sources.get(id)?.kind === 'bundle-literal').length < 2)
          m.sourceIds.push(around(path, content, hit.start, 'bundle-literal'));
      }
      if (ch) {
        mod.ipc.push(ch.channel);
        ch.files.push(path);
        if (ch.sourceIds.length < 4)
          ch.sourceIds.push(around(path, content, hit.start, 'bundle-literal'));
      }
    }
    for (const hit of analyzed.ipc) {
      const ch = ipcMap.get(hit.channel);
      ch.roles.push(hit.operation);
      if (ch.sourceIds.filter((id) => sources.get(id)?.kind === 'callsite').length < 4)
        ch.sourceIds.push(
          sourceRef(path, content, hit.start, Math.min(hit.end, hit.start + 1500), 'callsite')
        );
    }
    for (const hit of analyzed.calls) {
      let ep = endpointMap.get(hit.path);
      if (!ep) {
        ep = {
          id: `cloud:${hit.path}`,
          path: hit.path,
          service: hit.service,
          verbs: [],
          sourceIds: [],
          files: [],
          inputs: [],
          outputs: [],
          baseline: false,
          layers: [],
        };
        endpointMap.set(hit.path, ep);
      }
      ep.verbs.push(hit.verb);
      ep.files.push(path);
      ep.layers.push(zone);
      ep.inputs.push(...hit.args);
      mod.endpointIds.push(ep.id);
      if (ep.sourceIds.length < 2)
        ep.sourceIds.push(
          sourceRef(
            path,
            content,
            hit.start,
            Math.min(hit.end, hit.start + 2000),
            'callsite',
            undefined,
            T(
              'Static call expression. Execution, authorization and response shape are not established by this excerpt.',
              '静态调用表达式。该片段不证明调用执行、授权结果或响应结构。'
            )
          )
        );
    }
    for (const hit of analyzed.flags.slice(0, 4)) {
      if (flags.length < 120)
        flags.push({
          file: path,
          marker: hit.marker,
          sourceId: sourceRef(
            path,
            content,
            hit.start,
            Math.min(hit.end, hit.start + 600),
            'callsite'
          ),
        });
    }
    for (const needle of markerNeedles) {
      const key = `${zone}:${needle}`;
      if (markers.has(key)) continue;
      const p = content.indexOf(needle);
      if (p >= 0) markers.set(key, around(path, content, p, 'bundle-literal', 1800));
    }
  }
  if (path.endsWith('.html') && zone === 'renderer') {
    const content = bytes.toString('utf8');
    const hit = content.match(
      /<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]+content=["']([^"']*(?:'[^']*'[^"']*)*)["']/i
    );
    // A bounded attribute extractor handles the single quotes inside CSP directives.
    const policy =
      content.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/i)?.[1] ??
      content.match(/content="([^"]+)"\s+http-equiv="Content-Security-Policy"/i)?.[1];
    if (policy) {
      const p = content.indexOf(policy);
      const sid = sourceRef(path, content, p, p + policy.length, 'manifest');
      for (const item of policy.split(';')) {
        const [directive, ...values] = item.trim().split(/\s+/);
        if (directive) csp.push({ directive, values, sourceId: sid });
      }
    }
  }
  mod.coreMethods = [...new Set(mod.coreMethods)];
  mod.endpointIds = [...new Set(mod.endpointIds)];
  mod.ipc = [...new Set(mod.ipc)];
  modules.push(mod);
  if (index % 1000 === 0)
    console.log(
      `  indexed ${index + 1}/${allFiles.length} files; ${stats.parsed} JavaScript files parsed`
    );
}
const fileSet = new Set(modules.map((m) => m.path));
const missingImports = [];
const packageMains = new Map();
for (const m of modules.filter((m) => m.path.endsWith('/package.json'))) {
  try {
    const p = await readJSON(join(SNAPSHOT, m.path));
    if (p.main)
      packageMains.set(
        dirname(m.path),
        relative(SNAPSHOT, resolve(SNAPSHOT, dirname(m.path), p.main))
      );
  } catch {
    /* No guessed entry for an unreadable manifest. */
  }
}
for (const m of modules)
  m.imports = m.imports.map((i) => resolveFileReference(i, fileSet, packageMains));
for (const m of modules)
  for (const i of m.imports)
    if (!i.target.startsWith('external:') && !fileSet.has(i.target))
      missingImports.push({ from: m.path, target: i.target });
stats.missingImports = missingImports.length;
const duplicates = new Map();
for (const m of modules) {
  if (duplicates.has(m.sha256)) {
    stats.exactDuplicateFiles++;
    stats.duplicateBytes += m.bytes;
  } else duplicates.set(m.sha256, m.path);
}
const aggregate = (key) =>
  [...Map.groupBy(modules, (m) => m[key])]
    .map(([value, items]) => ({
      [key]: value,
      files: items.length,
      bytes: items.reduce((n, m) => n + m.bytes, 0),
    }))
    .sort((a, b) => b.bytes - a.bytes || a[key].localeCompare(b[key]));
const endpoints = [...endpointMap.values()].sort((a, b) => a.path.localeCompare(b.path));
for (const ep of endpoints) {
  for (const k of ['verbs', 'files', 'inputs', 'layers']) ep[k] = [...new Set(ep[k])];
}
for (const c of ipc) {
  for (const k of ['files', 'sourceIds', 'roles']) c[k] = [...new Set(c[k])];
}

// Preserve every old path even where the old regex truncated a dynamic template.
for (const ep of endpoints.filter((e) => e.baseline && !e.sourceIds.length)) {
  const old = three.cloud.paths.find((p) => p.path === ep.path);
  for (const f of old.files) {
    const path = `webview/assets/${f}`;
    if (!fileSet.has(path)) continue;
    const content = await readFile(join(SNAPSHOT, path), 'utf8');
    const at = content.indexOf(ep.path);
    if (at >= 0) {
      ep.sourceIds.push(around(path, content, at, 'bundle-literal'));
      ep.files.push(path);
      ep.layers.push('renderer');
      break;
    }
  }
}

const captures = [];
const shotRoot = join(ROOT, 'evidence/runtime/shots');
const receipt = await readJSON(join(shotRoot, 'recapture-results.json'));
for (const full of (await walk(shotRoot)).filter((f) => f.endsWith('.jpg'))) {
  const name = relative(shotRoot, full).replace(/\.jpg$/, '');
  const isSettings = name.startsWith('settings/');
  const number = Number(basename(name).slice(0, 2));
  const spec = isSettings ? settingsLabels[number - 1] : surfaces[name];
  const group = isSettings
    ? 'settings'
    : (surfaceGroups.find((g) => g.names.includes(name))?.id ?? 'unassigned');
  const label = T(spec?.[0] ?? name, spec?.[1] ?? name);
  const digest = sha(await readFile(full));
  const how = isSettings
    ? T(`Settings → ${label.en}`, `设置 → ${label.zh}`)
    : T(spec?.[2] ?? 'Archived capture', spec?.[3] ?? '归档截图');
  const sid = `shot-${name.replaceAll('/', '-')}`;
  const matchingReceipt = receipt.results.find((r) => r.name === name);
  const excerpt = JSON.stringify(
    { capture: name, sha256: digest, receipt: matchingReceipt ?? null },
    null,
    2
  );
  sources.set(sid, {
    id: sid,
    kind: 'capture',
    path: `evidence/runtime/shots/${name}.jpg`,
    sha256: digest,
    excerpt,
    excerptSha256: sha(excerpt),
    language: 'json',
    note: T(
      'Archived frame. A capture proves appearance; it is not an API execution trace.',
      '归档画面。截图证明界面出现，不等同于 API 执行轨迹。'
    ),
  });
  captures.push({
    id: `gui:${name}`,
    name,
    label,
    group,
    src: `assets/shots/${name}.jpg`,
    sha256: digest,
    how,
    scope:
      group === 'workspace'
        ? T('Requires an active conversation', '需要活动会话')
        : group === 'overlay'
          ? T('Separate desktop window', '独立桌面窗口')
          : T('Application navigation', '应用导航'),
    capabilities: isSettings ? [spec?.[2] ?? 'config'] : (spec?.[4] ?? []),
    sourceIds: [sid],
    receipt: Boolean(matchingReceipt?.ok),
    hotspots: [],
  });
}
const annotated = captures.find((c) => c.name === '19-thread-open');
if (annotated)
  annotated.hotspots = [
    {
      label: T('Navigation', '导航'),
      x: 0.01,
      y: 0.06,
      width: 0.16,
      height: 0.24,
      target: 'gui:01-sidebar-home',
    },
    {
      label: T('Conversation area', '会话区域'),
      x: 0.2,
      y: 0.35,
      width: 0.4,
      height: 0.31,
      target: 'cap:thread-lifecycle',
    },
    {
      label: T('Review surface', '审阅界面'),
      x: 0.64,
      y: 0.02,
      width: 0.34,
      height: 0.27,
      target: 'gui:20-panel-review',
    },
  ];
const commands = [];
const localeFiles = await readdir(join(SNAPSHOT, 'native-menu-locales'));
const englishFile = localeFiles.find((f) => /^en(?:-|\.)/.test(f));
const localeFile = englishFile ?? localeFiles.find((f) => f === 'zh-CN.json');
const localeContent = localeFile
  ? await readFile(join(SNAPSHOT, 'native-menu-locales', localeFile), 'utf8')
  : null;
const english = englishFile && localeContent ? JSON.parse(localeContent) : {};
for (const ns of scan.commandSurface.namespaces)
  for (const e of ns.entries) {
    const keyText = JSON.stringify(e.key);
    const at = localeContent?.indexOf(keyText) ?? -1;
    const sid =
      at >= 0
        ? sourceRef(
            `native-menu-locales/${localeFile}`,
            localeContent,
            at,
            Math.min(
              localeContent.indexOf('\n', at) > at ? localeContent.indexOf('\n', at) : at + 250,
              localeContent.length
            ),
            'manifest'
          )
        : null;
    const derivedLabel = e.key
      .split('.')
      .at(-1)
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/^./, (s) => s.toUpperCase());
    commands.push({
      key: e.key,
      namespace: ns.namespace,
      surface: e.surface,
      label: T(english[e.key] ?? derivedLabel, e.zh ?? e.key),
      locales: e.locales,
      sourceIds: sid ? [sid] : [],
    });
  }
const capabilities = three.capabilities.map((c) => ({
  id: c.id,
  title: c.title,
  zh: c.zh,
  backing: c.backing,
  summary: capabilityNotes[c.id] ?? T(c.title, c.zh),
  core: { total: c.core.total, present: c.core.present, methods: c.core.methods },
  cloud: c.cloud,
  shell: c.shell,
  coreDomains: c.coreDomains,
  cloudServices: c.cloudServices,
}));
const nodes = [];
const relations = [];
function node(id, kind, label, summary, layers, page, sourceIds = [], group) {
  nodes.push({
    id,
    kind,
    label,
    summary,
    layers,
    page,
    sourceIds: [...new Set(sourceIds)],
    evidence: [...new Set(sourceIds.map((s) => sources.get(s)?.kind).filter(Boolean))],
    ...(group ? { group } : {}),
  });
}
function relation(from, to, kind, evidenceIds = [], inference = true, label) {
  relations.push({
    id: 'rel-' + sha(`${from}:${kind}:${to}`).slice(0, 18),
    from,
    to,
    kind,
    evidenceIds,
    inference,
    ...(label ? { label } : {}),
  });
}
const layerMeta = {
  core: ['Rust core', 'Rust 内核'],
  cloud: ['Cloud services', '云端服务'],
  shell: ['Electron shell', 'Electron 壳层'],
};
for (const [id, [en, zh]] of Object.entries(layerMeta))
  node(
    `layer:${id}`,
    'layer',
    T(en, zh),
    T('Execution boundary', '执行边界'),
    [id],
    id === 'core' ? 'core-api' : id === 'cloud' ? 'cloud-api' : 'shell'
  );
for (const c of contexts) node(`context:${c.id}`, 'context', c.label, c.summary, [], 'features');
for (const c of capabilities) {
  node(`cap:${c.id}`, 'capability', T(c.title, c.zh), c.summary, c.backing, 'three-way', []);
  for (const layer of c.backing)
    relation(
      `cap:${c.id}`,
      `layer:${layer}`,
      'maps-to',
      [],
      true,
      T('Interface grouping', '接口分组')
    );
  for (const ctx of contexts.filter((ctx) => ctx.capabilities.includes(c.id)))
    relation(`context:${ctx.id}`, `cap:${c.id}`, 'contains', [], true);
  for (const m of c.core.methods) relation(`cap:${c.id}`, `core:${m}`, 'maps-to', [], true);
  for (const p of c.cloud.paths) relation(`cap:${c.id}`, `cloud:${p}`, 'maps-to', [], true);
  for (const ch of c.shell.channels)
    relation(`cap:${c.id}`, `ipc:${ch.replace('codex_desktop:', '')}`, 'maps-to', [], true);
}
for (const m of methods) {
  node(
    m.id,
    'method',
    T(m.method, m.method),
    T(`${m.channel} · ${m.direction}`, `${m.channel} · ${m.direction}`),
    ['core'],
    'core-api',
    m.sourceIds,
    m.domain
  );
  for (const path of m.files.filter((p) => fileSet.has(p)))
    relation(
      `mod:${path}`,
      m.id,
      'contains-literal',
      m.sourceIds.filter((id) => sources.get(id)?.path === path),
      true
    );
}
for (const ep of endpoints) {
  node(
    ep.id,
    'endpoint',
    T(ep.path, ep.path),
    T(
      `${ep.verbs.join(' / ') || 'Method unresolved'} · ${ep.service}`,
      `${ep.verbs.join(' / ') || '方法未解析'} · ${ep.service}`
    ),
    ['cloud'],
    'cloud-api',
    ep.sourceIds,
    ep.service
  );
  for (const path of ep.files)
    relation(
      `mod:${path}`,
      ep.id,
      'call-candidate',
      ep.sourceIds.filter((id) => sources.get(id)?.path === path),
      true
    );
}
for (const ch of ipc) {
  node(
    ch.id,
    'ipc',
    T(ch.suffix, ch.suffix),
    T(ch.channel, ch.channel),
    ['shell'],
    'shell',
    ch.sourceIds
  );
  for (const path of ch.files)
    relation(
      `mod:${path}`,
      ch.id,
      'contains-literal',
      ch.sourceIds.filter((id) => sources.get(id)?.path === path),
      true
    );
}
for (const c of captures) {
  node(c.id, 'surface', c.label, c.scope, [], 'gui-map', c.sourceIds, c.group);
  for (const cap of c.capabilities) relation(c.id, `cap:${cap}`, 'maps-to', [], true);
}
for (const c of commands) {
  node(
    `command:${c.key}`,
    'command',
    c.label,
    T(c.key, c.key),
    [],
    'features',
    c.sourceIds,
    c.namespace
  );
  const ctx = contexts.find((x) => x.namespaces.includes(c.namespace));
  if (ctx) relation(`context:${ctx.id}`, `command:${c.key}`, 'contains', [], true);
}
const windows = scan.windowSurface.windowTokens.map((w) => ({ ...w, sourceIds: [] }));
const mainContent = await readFile(join(SNAPSHOT, '.vite/build', mainFile), 'utf8');
for (const w of windows) {
  const at = mainContent.indexOf(w.token);
  if (at >= 0)
    w.sourceIds.push(around(`.vite/build/${mainFile}`, mainContent, at, 'bundle-literal'));
  node(
    `window:${w.token}`,
    'window',
    T(w.token, w.token),
    T('Structural token; runtime correspondence unverified', '结构令牌；运行时对应关系未验证'),
    ['shell'],
    'shell',
    w.sourceIds
  );
}

const sourceFor = (needle) =>
  [...markers].filter(([k]) => k.endsWith(`:${needle}`)).map(([, v]) => v);
const moduleByPath = new Map(modules.map((m) => [m.path, m]));
const early = moduleByPath.get(pkg.main);
const families = aggregate('family');
const findings = [
  {
    id: 'path-recovery',
    title: T('Syntax recovers paths that regex misses', '语法恢复正则遗漏的路径'),
    body: T(
      `${endpoints.filter((e) => !e.baseline).length} additional paths were recovered from call expressions, including parameterized templates and query strings. The original ${three.totals.cloudPaths} paths remain individually traceable.`,
      `从调用表达式恢复了 ${endpoints.filter((e) => !e.baseline).length} 条新增路径，包括参数模板和查询字符串。原有 ${three.totals.cloudPaths} 条路径仍可逐项追踪。`
    ),
    limit: T(
      'These are static client expressions. Live behavior and remote response schemas are not established.',
      '这些是静态客户端表达式，不证明线上行为或远程响应 Schema。'
    ),
    sourceIds: endpoints
      .filter((e) => !e.baseline)
      .slice(0, 3)
      .flatMap((e) => e.sourceIds),
    nodes: endpoints.filter((e) => !e.baseline).map((e) => e.id),
  },
  {
    id: 'startup',
    title: T('Bootstrap is a staged hand-off', '启动由分阶段交接构成'),
    body: T(
      `The entry ${pkg.main} has ${early?.imports.length ?? 0} statically resolved imports/requires. Its local dependency path can be followed into the bootstrap and main bundles.`,
      `入口 ${pkg.main} 有 ${early?.imports.length ?? 0} 条已解析导入／require，可继续追踪到 bootstrap 和 main 包。`
    ),
    limit: T(
      'The graph records static module references, not a timed startup trace.',
      '该图记录静态模块引用，不是启动计时轨迹。'
    ),
    sourceIds: early?.sourceIds ?? [],
    nodes: [`mod:${pkg.main}`],
  },
  {
    id: 'lazy-loading',
    title: T('Shipped does not mean loaded', '已打包不等于已加载'),
    body: T(
      `${stats.dynamicImports.toLocaleString('en-US')} dynamic import edges occur across ${stats.parsed.toLocaleString('en-US')} parsed JavaScript files. They expose deferred boundaries that a filename census cannot describe.`,
      `${stats.parsed.toLocaleString('en-US')} 个成功解析的 JavaScript 文件中发现 ${stats.dynamicImports.toLocaleString('en-US')} 条动态导入边，揭示文件名统计无法描述的延迟边界。`
    ),
    limit: T(
      'An import expression does not prove its branch executes for this account.',
      '导入表达式不证明其分支在当前账号下执行。'
    ),
    sourceIds: modules
      .filter((m) => m.imports.some((i) => i.dynamic))
      .slice(0, 3)
      .flatMap((m) => m.sourceIds),
    nodes: modules
      .filter((m) => m.imports.some((i) => i.dynamic))
      .slice(0, 3)
      .map((m) => m.id),
  },
  {
    id: 'proxy',
    title: T('A path is not a wire destination', '路径不等于线上目标'),
    body: T(
      'The bundle contains both /backend-api/ and /__codex-api/ references. Inspect the rewrite conditions alongside the main-process handling before attributing a relative request to a host.',
      '发行包同时包含 /backend-api/ 与 /__codex-api/ 引用。应结合改写条件及主进程处理，才能将相对请求归属到主机。'
    ),
    limit: T(
      'Static excerpts establish routing code; they do not prove a request or authentication succeeded.',
      '静态片段证明路由代码存在，不证明请求或认证成功。'
    ),
    sourceIds: [...sourceFor('/__codex-api/'), ...sourceFor('/backend-api/')],
    nodes: endpoints
      .filter((e) => e.service === 'wham')
      .slice(0, 2)
      .map((e) => e.id),
  },
  {
    id: 'families',
    title: T('Chunk names are clues, not a domain model', '块名称是线索，不是领域模型'),
    body: T(
      `The largest family by unpacked bytes is “${families[0].family}”. File count and byte share answer different questions. Names alone cannot establish which code is model selection, rendering or agent execution.`,
      `按解包字节数最大的族是“${families[0].family}”。文件数与字节占比回答不同问题，单靠名称无法判定模型选择、渲染或 Agent 执行。`
    ),
    limit: T(
      'Families are filename-based classifications. Use import and interface references to test their meaning.',
      '模块族是按文件名归类的，应结合导入与接口引用检验其含义。'
    ),
    sourceIds: modules
      .filter((m) => m.family === families[0].family)
      .slice(0, 2)
      .flatMap((m) => m.sourceIds),
    nodes: modules
      .filter((m) => m.family === families[0].family)
      .slice(0, 2)
      .map((m) => m.id),
  },
  {
    id: 'duplication',
    title: T('Packaging has measurable repetition', '打包具有可测量的重复'),
    body: T(
      `${stats.exactDuplicateFiles} files duplicate an earlier file byte-for-byte (${(stats.duplicateBytes / 1e6).toFixed(2)} MB of additional unpacked bytes). Hash equality distinguishes exact duplication from similar names.`,
      `${stats.exactDuplicateFiles} 个文件与此前文件逐字节相同，额外占用 ${(stats.duplicateBytes / 1e6).toFixed(2)} MB 解包字节。哈希相同可以区分真正重复与名称相似。`
    ),
    limit: T(
      'This is disk representation, not compressed download size or runtime memory use.',
      '这是磁盘表示，不是压缩下载大小或运行时内存。'
    ),
    sourceIds: [],
    nodes: [],
  },
  {
    id: 'gates',
    title: T('Reachability needs a second kind of proof', '可达性需要另一类证据'),
    body: T(
      `${flags.length} bounded examples of named gate-check calls were recovered. Window tokens, gate checks and screenshots represent different observations and remain separate in the model.`,
      `提取了 ${flags.length} 个具名开关检查调用的有界示例。窗口令牌、开关检查与截图属于不同观测，在模型中分别记录。`
    ),
    limit: T(
      'Minified aliases and server-delivered flags are outside this named-call inventory. No gate value is inferred.',
      '压缩别名与服务端下发开关不在此具名调用清单内，不推断开关取值。'
    ),
    sourceIds: flags.slice(0, 3).map((f) => f.sourceId),
    nodes: [],
  },
  {
    id: 'native',
    title: T('Native integration is an explicit boundary', '原生集成具有明确边界'),
    body: T(
      'The package declares native and bridge dependencies alongside app-server-manager, browser and git workers. Follow require/import edges to distinguish a declared dependency from an actual reference.',
      '包清单声明了原生桥、app-server-manager、浏览器与 Git worker 依赖。继续追踪 require／import 边，区分依赖声明与实际引用。'
    ),
    limit: T(
      'Package declarations do not prove a permission was granted or a native operation ran.',
      '包声明不证明权限已授予或原生操作已运行。'
    ),
    sourceIds: [
      sourceRef(
        'package.json',
        await readFile(join(SNAPSHOT, 'package.json'), 'utf8'),
        0,
        6000,
        'manifest'
      ),
    ],
    nodes: [`mod:${pkg.main}`],
  },
];
const methodSources = (name) => methodMap.get(name)?.sourceIds ?? [];
const scenario = (id, title, summary, steps) => ({ id, title, summary, steps });
const scenarios = [
  scenario(
    'thread',
    T('A local conversation', '本地会话'),
    T(
      'A protocol-guided reading, not a captured execution trace.',
      '依据协议的阅读路径，不是已捕获的执行轨迹。'
    ),
    [
      {
        title: T('Start at the interface', '从界面开始'),
        body: T(
          'The archived conversation capture identifies a user-visible surface. Its relationship to the protocol is an analytical mapping.',
          '归档会话截图标识用户可见的界面，其与协议的关系属于分析映射。'
        ),
        nodeIds: ['gui:19-thread-open'],
        sourceIds: ['shot-19-thread-open'],
      },
      {
        title: T('Create the thread', '创建会话'),
        body: T(
          'thread/start declares the input configuration and returns the thread record. Inspect the Rust definition and parameter fields.',
          'thread/start 声明输入配置并返回会话记录，可查看 Rust 定义及参数字段。'
        ),
        nodeIds: ['core:thread/start'],
        sourceIds: methodSources('thread/start'),
      },
      {
        title: T('Begin a turn', '开始轮次'),
        body: T(
          'turn/start supplies input for work within a thread. This separates durable conversation state from one unit of execution.',
          'turn/start 为会话内的一轮工作提供输入，将持久会话状态与单次执行单元分开。'
        ),
        nodeIds: ['core:turn/start'],
        sourceIds: methodSources('turn/start'),
      },
      {
        title: T('Receive progress', '接收进展'),
        body: T(
          'Server notifications report item deltas and completion. Their direction is core → client.',
          '服务端通知报告条目增量与完成状态，方向为内核 → 客户端。'
        ),
        nodeIds: ['core:item/agentMessage/delta', 'core:turn/completed'],
        sourceIds: [
          ...methodSources('item/agentMessage/delta'),
          ...methodSources('turn/completed'),
        ].slice(0, 3),
      },
    ]
  ),
  scenario(
    'approval',
    T('A decision requested by the core', '内核请求一次决策'),
    T(
      'Request direction explains the boundary; the exact desktop surface remains separately evidenced.',
      '请求方向解释边界，具体桌面界面另有证据。'
    ),
    [
      {
        title: T('The core asks', '内核发问'),
        body: T(
          'A server request asks the client for a decision. Read the declared request payload.',
          '服务端请求向客户端征求决策，可查看其声明的请求载荷。'
        ),
        nodeIds: ['core:item/commandExecution/requestApproval'],
        sourceIds: methodSources('item/commandExecution/requestApproval'),
      },
      {
        title: T('The client evaluates', '客户端评估'),
        body: T(
          'The schema records decision alternatives. A protocol alternative does not prove which branch was selected.',
          'Schema 记录可选决策；某个选项存在并不证明该分支被选择。'
        ),
        nodeIds: ['cap:approval'],
        sourceIds: methodSources('item/commandExecution/requestApproval'),
      },
      {
        title: T('Work continues or stops', '工作继续或停止'),
        body: T(
          'The response answers the outstanding request. This walkthrough is descriptive and does not execute commands.',
          '响应回答待处理请求。本解读用于描述，不执行命令。'
        ),
        nodeIds: ['cap:exec'],
        sourceIds: methodSources('item/commandExecution/requestApproval'),
      },
    ]
  ),
  scenario(
    'cloud',
    T('Following a cloud request', '追踪云端请求'),
    T(
      'Follow code references across routing boundaries; unresolved wire behavior stays visible.',
      '跨越路由边界追踪代码引用，同时保留线上行为的未决部分。'
    ),
    [
      {
        title: T('Client call', '客户端调用'),
        body: T(
          'A get/post-style call supplies a relative path and arguments. A call-shaped expression is static evidence, not network telemetry.',
          'get／post 风格调用提供相对路径与参数。调用表达式是静态证据，并非网络遥测。'
        ),
        nodeIds: endpoints
          .filter((e) => e.service === 'wham' && e.verbs.length)
          .slice(0, 1)
          .map((e) => e.id),
        sourceIds: endpoints
          .filter((e) => e.service === 'wham' && e.verbs.length)
          .slice(0, 1)
          .flatMap((e) => e.sourceIds),
      },
      {
        title: T('Same-origin rewrite', '同源改写'),
        body: T(
          'Inspect /__codex-api/ and /backend-api/ references together with their conditions.',
          '结合条件阅读 /__codex-api/ 与 /backend-api/ 引用。'
        ),
        nodeIds: ['layer:shell'],
        sourceIds: sourceFor('/__codex-api/'),
      },
      {
        title: T('Desktop boundary', '桌面边界'),
        body: T(
          'The main-process code carries routing and host references. This is where the renderer and remote service boundaries meet.',
          '主进程代码包含路由与主机引用，渲染层与远程服务边界在这里交汇。'
        ),
        nodeIds: ['layer:shell', 'layer:cloud'],
        sourceIds: sourceFor('/backend-api/'),
      },
      {
        title: T('What is not observed', '尚未观测的部分'),
        body: T(
          'Response schemas, live host selection and authorization results require evidence beyond a static client call.',
          '响应 Schema、实际主机选择和授权结果需要静态客户端调用以外的证据。'
        ),
        nodeIds: ['layer:cloud'],
        sourceIds: sourceFor('chatgpt.com'),
      },
    ]
  ),
  scenario(
    'shell',
    T('From bootstrap to desktop services', '从引导到桌面服务'),
    T(
      'A static reading of module hand-offs and interface boundaries.',
      '对模块交接与接口边界的静态解读。'
    ),
    [
      {
        title: T('Early bootstrap', '早期引导'),
        body: T(
          'The package entry loads its bootstrap dependencies before the main application module.',
          '包入口先加载引导依赖，再进入主应用模块。'
        ),
        nodeIds: [`mod:${pkg.main}`],
        sourceIds: early?.sourceIds ?? [],
      },
      {
        title: T('Preload bridge', 'Preload 桥'),
        body: T(
          'Preload code exposes or forwards desktop messages. Read the channel and operation together.',
          'Preload 代码暴露或转发桌面消息，应同时查看通道与操作。'
        ),
        nodeIds: ipc.slice(0, 2).map((c) => c.id),
        sourceIds: sourceFor('contextBridge.exposeInMainWorld'),
      },
      {
        title: T('Main process', '主进程'),
        body: T(
          'The Electron side hosts window, worker and native integration responsibilities.',
          'Electron 侧承载窗口、worker 与原生集成职责。'
        ),
        nodeIds: ['layer:shell'],
        sourceIds: sourceFor('BrowserWindow'),
      },
      {
        title: T('Core boundary', '内核边界'),
        body: T(
          'App-server references connect desktop orchestration to the Rust protocol. Exact binary-to-source revision matching remains unverified.',
          'App-server 引用连接桌面编排与 Rust 协议，二进制与源码的精确版本匹配仍未验证。'
        ),
        nodeIds: ['layer:core'],
        sourceIds: sourceFor('app-server'),
      },
    ]
  ),
];
await mkdir(join(ROOT, 'evidence/static/licenses'), { recursive: true });
await writeFile(
  join(ROOT, 'evidence/static/licenses/codex-LICENSE.txt'),
  git('show', `${REV}:LICENSE`)
);
const model = {
  schemaVersion: 1,
  provenance: {
    appVersion: pkg.version,
    coreRevision: REV,
    snapshotRoot: SNAPSHOT,
    mainSha256: scan.windowSurface.sha256,
    inputDigests,
    sourceAt: three.generatedFrom.at,
    coreBinaryMatch: 'unverified',
    commandEnglishLabels: englishFile ? 'native-locale' : 'derived-from-key',
  },
  baseline: {
    methods: rust.totals.methods,
    present: three.totals.coreMethodsPresentInApp,
    paths: three.totals.cloudPaths,
    services: three.totals.cloudServices,
    ipc: three.totals.ipcChannels,
    assets: scan.componentSurface.totalAssets,
    commandKeys: scan.commandSurface.totalKeys,
    locales: scan.commandSurface.localeCount,
    captures: captures.length,
  },
  contexts,
  capabilities,
  methods,
  endpoints,
  ipc,
  commands,
  captures,
  nodes,
  relations,
  sources: [...sources.values()],
  findings,
  scenarios,
  windows,
  crates: rust.crates.map((name) => ({
    name,
    href: `https://github.com/openai/codex/blob/${REV}/codex-rs/${name}/Cargo.toml`,
  })),
  bundle: {
    modules,
    stats,
    families,
    extensions: aggregate('ext'),
    missingImports,
    flags,
    nativeDependencies: Object.keys(pkg.dependencies ?? {}).sort(),
    csp,
  },
  coverage: {
    unresolvedCoreSources: methods
      .filter((m) => !m.sourceIds.some((id) => sources.get(id)?.kind === 'protocol'))
      .map((m) => m.method),
    unmappedCommands: commands
      .filter((c) => !contexts.some((x) => x.namespaces.includes(c.namespace)))
      .map((c) => c.key),
    unmatchedLegacyPaths: endpoints.filter((e) => e.baseline && !e.verbs.length).map((e) => e.path),
    parseFailures: modules.filter((m) => m.parseError).map((m) => m.path),
  },
};
const errors = validateModel(model);
if (errors.length) throw new Error(errors.slice(0, 20).join('\n'));
await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, JSON.stringify(model));
console.log(
  `research: wrote ${relative(ROOT, OUT)}; ${nodes.length} entities, ${relations.length} relations, ${sources.size} sources`
);
console.log(
  JSON.stringify({
    stats,
    coreSourceGaps: model.coverage.unresolvedCoreSources.length,
    legacyPathsWithoutParsedVerb: model.coverage.unmatchedLegacyPaths.length,
    endpoints: endpoints.length,
  })
);
