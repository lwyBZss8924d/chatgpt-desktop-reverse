import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import {
  analyzeJavaScript,
  fieldsOf,
  resolveFileReference,
  resolveImport,
  validateModel,
} from '../scripts/research/analyze.mjs';
import { graphFor, treemapRects } from '../web/model.ts';
import { layoutGraph, mermaidFor } from '../web/layout.mjs';
import { pageMeta } from '../scripts/research/content.mjs';
const model = JSON.parse(
  await readFile(new URL('../evidence/static/atlas-model.json', import.meta.url), 'utf8')
);
const sha = (value) => createHash('sha256').update(value).digest('hex');

test('AST extraction separates real syntax from strings and comments', () => {
  const source =
    'import x from "./entry.js"; const note="import(\\\"./fake.js\\\")"; /* api.get("/wham/fake") */ const schema=["thread/start"]; api.post(`/wham/tasks/${taskId}/retry`, {body: payload}); import("./lazy.js"); ipc.handle("codex_desktop:message", handler);';
  const result = analyzeJavaScript(source, 'webview/assets/main.js', {
    methods: new Set(['thread/start']),
    channels: new Set(['codex_desktop:message']),
    services: new Set(['wham']),
  });
  assert.equal(result.parseError, null);
  assert.equal(result.calls.length, 1);
  assert.equal(result.calls[0].path, '/wham/tasks/{taskId}/retry');
  assert.equal(result.calls[0].verb, 'POST');
  assert.deepEqual(result.calls[0].args, ['{body: payload}']);
  assert.deepEqual(
    result.imports.map((i) => i.target),
    ['webview/assets/entry.js', 'webview/assets/lazy.js']
  );
  assert.equal(result.imports[1].dynamic, true);
  assert.equal(result.ipc[0].operation, 'handle');
  assert.equal(result.literals.filter((l) => l.value === 'thread/start').length, 1);
});
test('parse failure is explicit, never an empty successful inventory', () => {
  const r = analyzeJavaScript('function {', 'broken.js');
  assert.match(r.parseError, /SyntaxError/);
});
test('imports preserve external boundaries and relative locations', () => {
  assert.equal(resolveImport('.vite/build/main.js', './worker.js'), '.vite/build/worker.js');
  assert.equal(resolveImport('webview/assets/a.js', '../b.js?x'), 'webview/b.js');
  assert.equal(resolveImport('a.js', 'node:fs'), 'external:node:fs');
});
test('directory and extension references do not become false missing-file findings', () => {
  const files = new Set(['pkg/index.js', 'pkg/value.js']);
  assert.equal(
    resolveFileReference({ target: 'pkg/', kind: 'require' }, files).target,
    'pkg/index.js'
  );
  assert.equal(
    resolveFileReference({ target: 'pkg/value', kind: 'require' }, files).resolution,
    'commonjs'
  );
  assert.equal(
    resolveFileReference({ target: 'pkg/value', kind: 'import' }, files).resolution,
    'filename-candidate'
  );
  assert.equal(resolveFileReference({ target: 'pkg/missing' }, files).resolution, 'unresolved');
});
test('schema fields keep required, union and reference semantics', () => {
  assert.deepEqual(
    fieldsOf({
      required: ['a'],
      properties: {
        a: { $ref: '#/definitions/Thread' },
        b: { anyOf: [{ type: 'string' }, { type: 'null' }] },
      },
    }),
    [
      { name: 'a', type: 'Thread', required: true, description: '' },
      { name: 'b', type: 'string | null', required: false, description: '' },
    ]
  );
});
test('committed model has complete baseline inventories and connected provenance', () => {
  assert.deepEqual(validateModel(model), []);
  assert.equal(model.methods.length, 191);
  assert.equal(model.methods.filter((m) => m.presentInApp).length, 184);
  assert.equal(model.endpoints.filter((e) => e.baseline).length, 343);
  assert.equal(model.captures.length, 42);
  assert.equal(model.commands.length, 192);
  assert.equal(model.ipc.length, 22);
  assert.equal(model.bundle.modules.length, model.bundle.stats.files);
  assert.equal(model.bundle.stats.parsed + model.bundle.stats.failed, model.bundle.stats.js);
  assert.equal(model.coverage.unresolvedCoreSources.length, 0);
  for (const c of model.capabilities)
    assert.ok(!('note' in c), 'Old overconfident prose must not leak into the normalized model');
  for (const c of model.commands)
    assert.ok(c.sourceIds.length > 0, `Missing locale source: ${c.key}`);
});
test('source excerpts and all original input digests are intact', async () => {
  for (const s of model.sources) {
    assert.equal(sha(s.excerpt), s.excerptSha256, s.id);
    if (s.path.startsWith('codex-rs/'))
      assert.match(
        s.href,
        new RegExp(`/blob/${model.provenance.coreRevision}/codex-rs/.+#L\\d+-L\\d+$`)
      );
  }
  for (const [name, digest] of Object.entries(model.provenance.inputDigests))
    assert.equal(
      sha(await readFile(new URL(`../evidence/static/${name}.json`, import.meta.url))),
      digest
    );
});
test('a dangling relationship and unpinned source fail validation', () => {
  const invalid = {
    ...model,
    relations: [
      ...model.relations,
      { id: 'bad', from: 'absent', to: model.nodes[0].id, evidenceIds: [], inference: false },
    ],
    sources: [
      ...model.sources,
      {
        id: 'bad-source',
        path: 'codex-rs/a.rs',
        href: 'https://github.com/openai/codex/blob/main/codex-rs/a.rs',
      },
    ],
  };
  const errors = validateModel(invalid);
  assert.ok(errors.some((e) => e.includes('dangling')));
  assert.ok(errors.some((e) => e.includes('unpinned')));
  assert.ok(errors.some((e) => e.includes('unsubstantiated')));
});
test('treemap areas match quantities and partition the complete rectangle', () => {
  const input = [
    { name: 'a', value: 70 },
    { name: 'b', value: 20 },
    { name: 'c', value: 10 },
  ];
  const rects = treemapRects(input);
  let total = 0;
  for (const r of rects) {
    assert.ok(Math.abs((r.width * r.height) / 100 - r.value) < 1e-8);
    assert.ok(r.x >= 0 && r.y >= 0 && r.x + r.width <= 100.0001 && r.y + r.height <= 100.0001);
    total += r.width * r.height;
  }
  assert.ok(Math.abs(total - 10000) < 1e-8);
});
test('every page graph has deterministic, non-overlapping node geometry', async () => {
  for (const page of pageMeta) {
    const spec = graphFor(page.id, model);
    const a = await layoutGraph(spec),
      b = await layoutGraph(spec);
    assert.deepEqual(a, b, page.id);
    assert.ok(spec.nodes.length <= 9, page.id);
    assert.ok(spec.edges.length <= 12, page.id);
    assert.ok(a.width > 0 && a.height > 0);
    const rects = Object.values(a.nodes);
    for (let i = 0; i < rects.length; i++)
      for (let j = i + 1; j < rects.length; j++) {
        const x = rects[i],
          y = rects[j];
        assert.ok(
          x.x + x.width <= y.x ||
            y.x + y.width <= x.x ||
            x.y + x.height <= y.y ||
            y.y + y.height <= x.y,
          `${page.id}: overlapping nodes`
        );
      }
    for (const e of spec.edges) {
      assert.ok(a.edges[e.id]?.path, `${page.id}: missing edge`);
      assert.ok(spec.nodes.some((n) => n.id === e.from) && spec.nodes.some((n) => n.id === e.to));
    }
    assert.match(mermaidFor(spec), /^flowchart LR\n/);
  }
});
