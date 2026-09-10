#!/usr/bin/env node
/**
 * build-codex-feature-map.mjs — render the app-scan model as a standalone HTML atlas.
 *
 * Input  : the JSON emitted by scripts/scan-codex-app.mjs
 * Output : one self-contained HTML file (no network, no external assets) holding
 *          the full feature hierarchy, a link graph, and an inspector.
 *
 * The graph is the point of the document: every number in it is a node that can
 * be traced back through its parent chain to a file, a locale key, or a bundle
 * constant. Nothing is illustrated for looks.
 *
 * Usage:
 *   node scripts/build-codex-feature-map.mjs \
 *     --model /tmp/heige-re/scan-model.json \
 *     --out docs/codex-desktop-feature-map.html
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const HERE = new URL(".", import.meta.url).pathname;

/* ── model assembly ─────────────────────────────────────────── */

/* Icon sets, fonts, vendor libraries and mermaid's own bundled diagrams are
   real bytes in the bundle but never draw a product surface. They stay in the
   totals and are grouped under one node so the hierarchy stays about Codex.
   The list is explicit rather than pattern-based: a wrong entry here silently
   hides product code, so each name was read off the asset inventory. */
const VENDOR_FAMILIES = new Set([
  "visualization", "examples", "model", "type", "dist", "registered",
  "template", "src", "workbook", "xychartdiagram", "swimlanes", "swimlanesdiagram",
  "statediagram", "timeline", "thumbnail", "mermaid.core", "chunk",
  "square", "arrow", "circle", "folder", "file", "align", "book", "chart",
  "calendar", "clock", "move", "monitor", "clipboard", "shield", "chevron",
  "chevrons", "user", "badge", "list", "map", "mail", "receipt", "icon",
  "glyph", "material", "gruvbox", "table", "grid", "star", "heart",
  "check", "plus", "minus", "close", "search", "play", "pause", "stop",
]);

export function isVendor(family) {
  return VENDOR_FAMILIES.has(family);
}

/* Each command namespace is a surface in its own right: `codex.command` is the
   palette, `electron.appMenu` is the native menubar. The middle segment is
   what separates them, so the grouping key is namespace + surface. */
export function commandClusters(commandSurface) {
  const out = [];
  for (const ns of commandSurface.namespaces) {
    const bySurface = new Map();
    for (const e of ns.entries) {
      const surface = e.surface || "(top)";
      if (!bySurface.has(surface)) bySurface.set(surface, []);
      bySurface.get(surface).push(e);
    }
    for (const [surface, entries] of bySurface) {
      out.push({
        id: `cmd.${ns.namespace}${surface === "(top)" ? "" : `.${surface}`}`,
        namespace: ns.namespace,
        surface,
        entries,
        count: entries.length,
      });
    }
  }
  return out.sort((a, b) => b.count - a.count);
}

/* Lazy-chunk groups are named by their leading two segments, which is where
   the product vocabulary lives (`local-conversation`, `pull-request`,
   `codex-micro`). Groups of one are folded into a remainder bucket: with 552
   one-segment families the layer would be mostly singletons, and a hierarchy
   whose leaves are individually meaningless is not a hierarchy. */
const GROUP_MIN = 2;

export function manifestGroups(manifest) {
  const groups = new Map();
  const rest = [];
  for (const group of manifest.groups) {
    if (group.count < GROUP_MIN) {
      rest.push(...group.modules);
      continue;
    }
    groups.set(group.family, { family: group.family, count: group.count, modules: group.modules });
  }
  const vendorModules = [];
  const product = [];
  for (const g of groups.values()) {
    (isVendor(g.family) ? vendorModules : product).push(g);
  }
  return {
    product: product.sort((a, b) => b.count - a.count),
    vendor: vendorModules.sort((a, b) => b.count - a.count),
    rest,
  };
}

export function buildGraph(model) {
  const nodes = [];
  const edges = [];
  const add = (n) => { nodes.push(n); return n; };

  const from = model.generatedFrom;
  const app = add({
    id: "app",
    level: 0,
    kind: "app",
    label: from.productName || "Codex Desktop",
    meta: {
      bundle: from.name,
      version: from.version,
      entry: from.main,
      source: from.root,
    },
  });

  /* L1 — the four evidence surfaces, each one an independent proof channel.
     A fact is only in this atlas because it was read from one of them. */
  const surfaces = [
    { id: "s.command", kind: "surface", label: "命令面", labelEn: "Command surface",
      note: "64 个语言包里逐条抽取的界面文案键", count: model.commandSurface.totalKeys },
    { id: "s.component", kind: "surface", label: "组件面", labelEn: "Component surface",
      note: "渲染器 assets 目录中名字以界面名词收尾的模块", count: model.componentSurface.uiModules },
    { id: "s.manifest", kind: "surface", label: "分包面", labelEn: "Chunk manifest",
      note: "入口 chunk 的动态导入表：路由可懒加载的模块", count: model.moduleManifest.total },
    { id: "s.window", kind: "surface", label: "窗口面", labelEn: "Window surface",
      note: "主进程 bundle 里的窗口标识常量", count: model.windowSurface.windowTokens.length },
  ];
  for (const s of surfaces) {
    add({ ...s, level: 1, parent: "app", color: s.id.replace("s.", "") });
    edges.push({ source: "app", target: s.id, kind: "contains" });
  }

  /* L2 — command namespaces, grouped by namespace then surface. Each carries
     its full key list; that list is the leaf layer of the command branch. */
  for (const c of commandClusters(model.commandSurface)) {
    add({
      id: c.id,
      level: 2,
      parent: "s.command",
      kind: "cmdGroup",
      color: "command",
      label: c.id.replace(/^cmd\./, ""),
      count: c.count,
      leaves: c.entries.map((e) => ({ label: e.key, kind: "commandKey",
        meta: { 语言包: e.locales, 中文: e.zh } })),
      meta: { namespace: c.namespace, surface: c.surface, 语言包: model.commandSurface.localeCount },
    });
    edges.push({ source: "s.command", target: c.id, kind: "contains" });
  }

  /* L2 — UI surfaces: modules whose name ends in a surface noun. */
  for (const s of model.componentSurface.surfaces) {
    add({
      id: `ui.${s.surface}`,
      level: 2,
      parent: "s.component",
      kind: "uiSurface",
      color: "component",
      label: s.surface,
      count: s.modules,
      leaves: s.samples.map((m) => ({ label: m, kind: "module" })),
      leavesTruncated: s.modules > s.samples.length,
      meta: { 示例模块: s.samples },
    });
    edges.push({ source: "s.component", target: `ui.${s.surface}`, kind: "contains" });
  }

  /* L2 — the icon/font/vendor bulk, rolled up so the hierarchy stays about
     the product. Its size is real and stays visible in the count. */
  const vendorFamilies = model.componentSurface.families.filter((f) => isVendor(f.family));
  const vendorModules = vendorFamilies.reduce((a, f) => a + f.modules, 0);
  if (vendorModules > 0) {
    add({
      id: "ui.vendor",
      level: 2,
      parent: "s.component",
      kind: "vendor",
      color: "vendor",
      label: "图标 / 字体 / 第三方库",
      count: vendorModules,
      meta: { 家族: vendorFamilies.slice(0, 30).map((f) => `${f.family} (${f.modules})`) },
    });
    edges.push({ source: "s.component", target: "ui.vendor", kind: "contains" });
  }

  /* L2 — manifest groups. */
  const mg = manifestGroups(model.moduleManifest);
  for (const g of mg.product.slice(0, 40)) {
    add({
      id: `mod.${g.family}`,
      level: 2,
      parent: "s.manifest",
      kind: "moduleFamily",
      color: "manifest",
      label: g.family,
      count: g.count,
      leaves: g.modules.slice(0, 40).map((m) => ({ label: m, kind: "module" })),
      leavesTruncated: g.modules.length > 40,
      meta: { 模块数: g.count, 示例: g.modules.slice(0, 12) },
    });
    edges.push({ source: "s.manifest", target: `mod.${g.family}`, kind: "contains" });
  }
  const foldedCount =
    mg.product.slice(40).reduce((a, g) => a + g.count, 0) +
    mg.vendor.reduce((a, g) => a + g.count, 0) +
    mg.rest.length;
  if (foldedCount > 0) {
    add({
      id: "mod.other",
      level: 2,
      parent: "s.manifest",
      kind: "moduleFamily",
      color: "manifest",
      label: "其余分组与长尾分包",
      count: foldedCount,
      meta: {
        说明: "少于 " + GROUP_MIN + " 个模块的分组，以及第三方与主题分包，按家族归并",
        家族: [...mg.vendor, ...mg.product.slice(40)].slice(0, 30).map((g) => `${g.family} (${g.count})`),
        长尾模块: mg.rest.slice(0, 40),
      },
    });
    edges.push({ source: "s.manifest", target: "mod.other", kind: "contains" });
  }

  /* L2 — window identifiers, with the occurrence count as the weight. */
  for (const t of model.windowSurface.windowTokens) {
    add({
      id: `win.${t.token}`,
      level: 2,
      parent: "s.window",
      kind: "windowToken",
      color: "window",
      label: t.token,
      count: t.hits,
      meta: {
        出现次数: t.hits,
        来源: "main-D87AK7lw.js",
        sha256前缀: model.windowSurface.sha256.slice(0, 16),
      },
    });
    edges.push({ source: "s.window", target: `win.${t.token}`, kind: "contains" });
  }

  return { root: app, nodes, edges };
}

/* ── html ───────────────────────────────────────────────────── */

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function renderHtml(model, graph) {
  /* Only the sequence that could close the host script element is escaped.
     Escaping every `<` would corrupt readable text such as `<hash>` in a
     module name; the data is all local strings, so the sole hazard is a
     literal `</script`. */
  const payload = JSON.stringify({
    from: model.generatedFrom,
    commands: { total: model.commandSurface.totalKeys, locales: model.commandSurface.localeCount },
    components: {
      total: model.componentSurface.totalAssets,
      bytes: model.componentSurface.totalBytes,
      byExt: model.componentSurface.byExt,
      uiModules: model.componentSurface.uiModules,
    },
    manifest: { total: model.moduleManifest.total },
    windows: model.windowSurface.windowTokens.length,
    nodes: graph.nodes,
    edges: graph.edges,
  }).replace(/<\//g, "<\\/");

  const html = `<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Codex Desktop Feature Graph</title>
<style>
  :root {
    color-scheme: light;
    --ground: #f5f7f9; --surface: #ffffff; --ink: #0e141a; --muted: #5b6875;
    --rule: #dde3e9; --accent: #0b6f78; --accent-soft: #d8eef0;
    --k-command: #0b6f78; --k-component: #7b5cd6; --k-manifest: #c2662a;
    --k-window: #2f7d32; --k-vendor: #8b929a;
  }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
    color-scheme: dark;
    --ground: #0b0f14; --surface: #141a21; --ink: #e4ebf2; --muted: #93a1b0;
    --rule: #232c36; --accent: #4fd1d9; --accent-soft: #10333a;
    --k-command: #4fd1d9; --k-component: #a88bfa; --k-manifest: #e89a5c;
    --k-window: #7ec97f; --k-vendor: #6b7683;
  } }
  :root[data-theme="dark"] {
    color-scheme: dark;
    --ground: #0b0f14; --surface: #141a21; --ink: #e4ebf2; --muted: #93a1b0;
    --rule: #232c36; --accent: #4fd1d9; --accent-soft: #10333a;
    --k-command: #4fd1d9; --k-component: #a88bfa; --k-manifest: #e89a5c;
    --k-window: #7ec97f; --k-vendor: #6b7683;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--ground); color: var(--ink);
    font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; }
  header { padding: 2.2rem 1.6rem 1rem; border-bottom: 1px solid var(--rule); }
  h1 { margin: 0 0 .3rem; font-size: 1.5rem; letter-spacing: -.01em; }
  .sub { color: var(--muted); font-size: .86rem; }
  .sub code { background: var(--accent-soft); padding: .1rem .35rem; border-radius: 3px; }
  .stats { display: flex; flex-wrap: wrap; gap: 1.6rem; padding: 1rem 1.6rem;
    border-bottom: 1px solid var(--rule); background: var(--surface); }
  .stat b { display: block; font-size: 1.35rem; font-variant-numeric: tabular-nums;
    letter-spacing: -.02em; }
  .stat span { color: var(--muted); font-size: .78rem; }
  main { display: grid; grid-template-columns: minmax(240px, 20rem) 1fr;
    min-height: 60vh; }
  @media (max-width: 860px) { main { grid-template-columns: 1fr; } }
  .tree { border-right: 1px solid var(--rule); overflow: auto;
    max-height: 78vh; padding: .5rem 0; }
  @media (max-width: 860px) { .tree { max-height: 40vh; border-right: 0;
    border-bottom: 1px solid var(--rule); } }
  .row { display: flex; align-items: baseline; gap: .5rem; width: 100%;
    border: 0; background: none; color: inherit; font: inherit; text-align: left;
    padding: .26rem .8rem; cursor: pointer; }
  .row:hover { background: var(--accent-soft); }
  .row[aria-current="true"] { background: var(--accent-soft);
    box-shadow: inset 3px 0 0 var(--accent); }
  .rail { font-family: ui-monospace, "SF Mono", Menlo, monospace; color: var(--muted);
    white-space: pre; font-size: .8rem; }
  .tree .row > .label { overflow: hidden; text-overflow: ellipsis;
    white-space: nowrap; }
  .tree .row.d0 { font-weight: 600; font-size: .95rem; }
  .tree .row.d1 { font-weight: 600; padding-left: 1.4rem; }
  .tree .row.d2 { padding-left: 2.8rem; font-size: .86rem; }
  .tree .row.d3 { padding-left: 4.2rem; font-size: .8rem; }
  .count { margin-left: auto; color: var(--muted); font-variant-numeric: tabular-nums;
    font-size: .78rem; }
  .stage { position: relative; overflow: hidden; }
  svg { display: block; width: 100%; height: 78vh; cursor: grab; }
  svg:active { cursor: grabbing; }
  .node { cursor: pointer; }
  .node circle { stroke: var(--surface); stroke-width: 2; }
  .node text { font-size: 10px; fill: var(--muted); pointer-events: none; }
  .node.sel circle { stroke: var(--ink); stroke-width: 3; }
  .link { stroke: var(--rule); fill: none; }
  .link.hi { stroke: var(--accent); stroke-width: 2; }
  .legend { position: absolute; left: 1rem; bottom: 1rem; display: flex;
    flex-wrap: wrap; gap: .7rem; font-size: .74rem; color: var(--muted);
    background: var(--surface); border: 1px solid var(--rule);
    border-radius: 6px; padding: .5rem .7rem; }
  .legend i { display: inline-block; width: .6rem; height: .6rem;
    border-radius: 50%; margin-right: .3rem; }
  .reset { position: absolute; right: 1rem; top: 1rem; font: inherit;
    font-size: .78rem; padding: .3rem .7rem; border-radius: 6px;
    border: 1px solid var(--rule); background: var(--surface); color: var(--muted);
    cursor: pointer; }
  .reset:hover { color: var(--ink); border-color: var(--accent); }
  .note { color: var(--muted); font-size: .82rem; margin: .5rem 0 0; }
  .inspector { padding: 1.2rem 1.6rem; border-top: 1px solid var(--rule);
    background: var(--surface); }
  .inspector h2 { margin: 0 0 .2rem; font-size: 1.05rem; }
  .inspector .kind { color: var(--muted); font-size: .78rem; }
  dl { display: grid; grid-template-columns: max-content 1fr; gap: .3rem 1.2rem;
    margin: 1rem 0 0; font-size: .84rem; }
  dt { color: var(--muted); }
  dd { margin: 0; font-family: ui-monospace, "SF Mono", Menlo, monospace;
    overflow-wrap: anywhere; }
  table { border-collapse: collapse; width: 100%; margin-top: .8rem;
    font-size: .82rem; }
  th, td { text-align: left; padding: .3rem .6rem; border-bottom: 1px solid var(--rule); }
  th { color: var(--muted); font-weight: 500; }
  td.mono { font-family: ui-monospace, "SF Mono", Menlo, monospace; }
  .empty { color: var(--muted); font-size: .84rem; }
  footer { padding: 1.4rem 1.6rem 2rem; color: var(--muted); font-size: .78rem;
    border-top: 1px solid var(--rule); }
</style>
<header>
  <h1>Codex Desktop · Feature Graph</h1>
  <div class="sub">
    <code>${esc(model.generatedFrom.name)}</code> ${esc(model.generatedFrom.version || "")} ·
    从解包后的 app.asar 静态抽取，未经运行
  </div>
</header>
<div class="stats" id="stats"></div>
<main>
  <nav class="tree" id="tree" aria-label="功能层级"></nav>
  <div class="stage">
    <svg id="graph" role="img" aria-label="功能关系图"></svg>
    <button class="reset" id="reset" type="button">重置视图</button>
    <div class="legend">
      <span><i style="background:var(--k-command)"></i>命令</span>
      <span><i style="background:var(--k-component)"></i>组件</span>
      <span><i style="background:var(--k-manifest)"></i>分包</span>
      <span><i style="background:var(--k-window)"></i>窗口</span>
      <span><i style="background:var(--k-vendor)"></i>第三方</span>
    </div>
  </div>
</main>
<div class="inspector" id="inspector"></div>
<footer>
  每个节点都可回溯到具体来源：命令键来自 <code>native-menu-locales/*.json</code>，
  模块名来自 <code>webview/assets/</code>，分包表来自入口 chunk 的动态导入清单，
  窗口常量来自主进程 bundle。数量统计以未去重的原始条目为准。
</footer>
<script>
var DATA = ${payload};

/* Colour is the reader's fastest way to tell which evidence surface a node
   belongs to, so each of the four branches gets its own hue and every node
   under it inherits that hue. KIND_VAR below handles the child kinds. */
var SURFACE_VAR = {
  "s.command": "--k-command",
  "s.component": "--k-component",
  "s.manifest": "--k-manifest",
  "s.window": "--k-window"
};

var KIND_VAR = {
  app: "--ink",
  cmdGroup: "--k-command", uiSurface: "--k-component",
  moduleFamily: "--k-manifest", windowToken: "--k-window",
  vendor: "--k-vendor"
};

function cssv(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function fmt(n) {
  return n.toLocaleString("en-US");
}

function bytes(n) {
  var u = ["B", "KB", "MB", "GB"], i = 0;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i += 1; }
  return n.toFixed(i === 0 ? 0 : 1) + " " + u[i];
}

/* ── stats strip ─────────────────────────────────────────────── */

(function () {
  var d = DATA, items = [
    [fmt(d.commands.total), "命令键 · " + d.commands.locales + " 个语言包"],
    [fmt(d.components.uiModules), "界面模块"],
    [fmt(d.components.total), "渲染器资源文件"],
    [bytes(d.components.bytes), "assets 目录体积"],
    [fmt(d.manifest.total), "可懒加载分包"],
    [fmt(d.windows), "窗口标识常量"]
  ];
  document.getElementById("stats").innerHTML = items.map(function (it) {
    return '<div class="stat"><b>' + it[0] + "</b><span>" + it[1] + "</span></div>";
  }).join("");
})();

/* ── hierarchy tree ──────────────────────────────────────────── */

var byId = {};
DATA.nodes.forEach(function (n) { byId[n.id] = n; });

var childrenOf = {};
DATA.nodes.forEach(function (n) {
  if (!n.parent) return;
  (childrenOf[n.parent] = childrenOf[n.parent] || []).push(n);
});
/* Children keep the order the model declared them in, which is already the
   size-descending order each surface was built with. */

var treeEl = document.getElementById("tree");

function renderNode(n, rail, depth, isLast) {
  var rows = [];
  var btn = document.createElement("button");
  btn.className = "row d" + Math.min(depth, 3);
  btn.setAttribute("data-id", n.id);
  btn.innerHTML =
    (depth > 0 ? '<span class="rail">' + rail + "</span>" : "") +
    '<span class="label"></span>' +
    (n.count !== undefined ? '<span class="count">' + fmt(n.count) + "</span>" : "");
  btn.querySelector(".label").textContent = n.label;
  btn.addEventListener("click", function () { select(n.id, true); });
  rows.push(btn);

  var kids = childrenOf[n.id] || [];
  kids.forEach(function (kid, i) {
    var last = i === kids.length - 1;
    var bar = depth === 0 ? "" : (isLast ? "   " : "│  ");
    rows.push.apply(rows, renderNode(kid, bar + (last ? "└─ " : "├─ "), depth + 1, last));
  });
  return rows;
}

renderNode(DATA.nodes[0], "", 0, true).forEach(function (el) { treeEl.appendChild(el); });

/* ── graph layout ────────────────────────────────────────────── */

/* A radial tidy tree rather than a force simulation. A force layout answers
   "what clusters", which is the wrong question for a feature map: the edges
   here are all parent/child, so a force graph just re-derives the hierarchy
   as a blob. A radial tree shows the panorama (every branch at a glance) and
   the hierarchy (radius = depth, angle = sibling order) at the same time.

   Angle is allocated by leaf count, not by child count, so a surface with 91
   keys gets an arc proportional to what it carries instead of the same wedge
   as a surface with 2. */
var R0 = 108, DR = 168;
var CX = 0, CY = 0;
var pos = {};

function leafCount(n) {
  var kids = childrenOf[n.id] || [];
  if (!kids.length) return 1;
  return kids.reduce(function (a, k) { return a + leafCount(k); }, 0);
}

(function place(node, a0, a1, depth) {
  var mid = (a0 + a1) / 2;
  pos[node.id] = { x: CX + Math.cos(mid) * (R0 + depth * DR),
                   y: CY + Math.sin(mid) * (R0 + depth * DR), a: mid };
  var kids = childrenOf[node.id] || [];
  if (!kids.length) return;
  var total = kids.reduce(function (a, k) { return a + leafCount(k); }, 0);
  var a = a0;
  kids.forEach(function (kid) {
    var span = ((a1 - a0) * leafCount(kid)) / total;
    place(kid, a, a + span, depth + 1);
    a += span;
  });
})(DATA.nodes[0], -Math.PI / 2, (Math.PI * 3) / 2, 0);

/* Bounds include the label extent, or labels on outer nodes clip. */
var bounds = { x0: 0, y0: 0, x1: 0, y1: 0 };
DATA.nodes.forEach(function (n) {
  var p = pos[n.id], r = radiusOf(n) + 26;
  bounds.x0 = Math.min(bounds.x0, p.x - r);
  bounds.y0 = Math.min(bounds.y0, p.y - r);
  bounds.x1 = Math.max(bounds.x1, p.x + r);
  bounds.y1 = Math.max(bounds.y1, p.y + r);
});

/* Radii encode the count a node stands for, on a compressed scale: the range
   in this data is 1..1500, and a linear mapping would make every leaf
   invisible. */
function radiusOf(n) {
  if (n.kind === "app") return 20;
  if (n.kind === "surface") return 13;
  var c = n.count || 1;
  return 4 + Math.min(15, Math.sqrt(c) * 0.9);
}

var svg = document.getElementById("graph");
var NS = "http://www.w3.org/2000/svg";
var gLink = document.createElementNS(NS, "g");
var gNode = document.createElementNS(NS, "g");
svg.appendChild(gLink);
svg.appendChild(gNode);

/* Links are quadratic curves bowed away from the centre: straight radii from
   a shared origin overlap near the hub, and the curve separates siblings that
   would otherwise be drawn on top of each other. */
var links = DATA.edges.map(function (e) { return { source: e.source, target: e.target }; });

function linkPath(l) {
  var a = pos[l.source], b = pos[l.target];
  var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  var bow = 1.12;
  return "M" + a.x + "," + a.y + "Q" + mx * bow + "," + my * bow + " " + b.x + "," + b.y;
}

var linkEls = {};
links.forEach(function (l) {
  var path = document.createElementNS(NS, "path");
  path.setAttribute("class", "link");
  path.setAttribute("d", linkPath(l));
  gLink.appendChild(path);
  linkEls[l.source + "|" + l.target] = path;
});

var nodeEls = {};
DATA.nodes.forEach(function (n) {
  var p = pos[n.id], r = radiusOf(n);
  var g = document.createElementNS(NS, "g");
  g.setAttribute("class", "node");
  var c = document.createElementNS(NS, "circle");
  c.setAttribute("cx", p.x); c.setAttribute("cy", p.y); c.setAttribute("r", r);
  c.setAttribute("fill", cssv(SURFACE_VAR[n.id] || KIND_VAR[n.kind] || "--accent"));
  g.appendChild(c);

  /* Labels stay on the hub and the four surfaces by default. The second ring
     has ~120 entries; writing all of them produces a solid ring of text that
     hides the graph it is meant to explain, so those label on hover and in
     the inspector instead, and the tree already names them in reading order. */
  if (n.level <= 1) {
    var t = document.createElementNS(NS, "text");
    var right = Math.cos(p.a) >= 0;
    t.setAttribute("x", p.x + (n.level === 0 ? 0 : (right ? r + 5 : -r - 5)));
    t.setAttribute("y", p.y + (n.level === 0 ? -r - 8 : 3.5));
    t.setAttribute("text-anchor", n.level === 0 ? "middle" : (right ? "start" : "end"));
    t.textContent = n.label;
    g.appendChild(t);
  }
  var title = document.createElementNS(NS, "title");
  title.textContent = n.label + (n.count !== undefined ? " · " + fmt(n.count) : "");
  g.appendChild(title);
  g.addEventListener("click", function () { select(n.id, false); });
  gNode.appendChild(g);
  nodeEls[n.id] = g;
});

/* Panning and zooming: the outer ring is wider than most viewports, and a
   static viewBox that cannot be moved hides part of the hierarchy. */
(function () {
  var pad = 40;
  var x0 = bounds.x0 - pad, y0 = bounds.y0 - pad;
  var vw = (bounds.x1 - bounds.x0) + pad * 2;
  var vh = (bounds.y1 - bounds.y0) + pad * 2;
  var home = { x: x0, y: y0, w: vw, h: vh };
  var view = { x: x0, y: y0 };
  var drag = null;

  function apply() {
    svg.setAttribute("viewBox", view.x + " " + view.y + " " + vw + " " + vh);
  }

  svg.addEventListener("pointerdown", function (e) {
    drag = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
    svg.setPointerCapture(e.pointerId);
  });
  svg.addEventListener("pointermove", function (e) {
    if (!drag) return;
    var rect = svg.getBoundingClientRect();
    view.x = drag.vx - (e.clientX - drag.x) * (vw / rect.width);
    view.y = drag.vy - (e.clientY - drag.y) * (vh / rect.height);
    apply();
  });
  svg.addEventListener("pointerup", function () { drag = null; });
  svg.addEventListener("pointercancel", function () { drag = null; });
  svg.addEventListener("wheel", function (e) {
    e.preventDefault();
    var f = e.deltaY > 0 ? 1.12 : 0.89;
    /* zoom about the pointer, so the node under the cursor stays put */
    var rect = svg.getBoundingClientRect();
    var fx = (e.clientX - rect.left) / rect.width;
    var fy = (e.clientY - rect.top) / rect.height;
    var cx = view.x + vw * fx, cy = view.y + vh * fy;
    vw *= f; vh *= f;
    view.x = cx - vw * fx;
    view.y = cy - vh * fy;
    apply();
  }, { passive: false });

  var reset = document.getElementById("reset");
  reset.addEventListener("click", function () {
    view.x = home.x; view.y = home.y; vw = home.w; vh = home.h; apply();
  });

  apply();
})();

/* ── selection + inspector ───────────────────────────────────── */

var selected = null;

/* Every string in the inspector comes from the bundle, so it is inserted as
   text and never as markup: a module name that contains a left-angle-bracket
   would otherwise be parsed as a tag. */
function el(tag, text, cls) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  e.textContent = text;
  return e;
}

function select(id, scrollTree) {
  var n = byId[id];

  Object.keys(nodeEls).forEach(function (k) {
    nodeEls[k].classList.toggle("sel", k === id);
  });
  Object.keys(linkEls).forEach(function (k) {
    var parts = k.split("|");
    var hit = parts[0] === id || parts[1] === id;
    linkEls[k].classList.toggle("hi", hit);
  });

  if (scrollTree) {
    var btn = treeEl.querySelector('[data-id="' + CSS.escape(id) + '"]');
    if (btn) { btn.scrollIntoView({ block: "nearest" }); }
  }

  var insp = document.getElementById("inspector");
  insp.textContent = "";
  insp.appendChild(el("h2", n.label));
  insp.appendChild(el("div",
    n.kind + (n.count !== undefined ? " · " + fmt(n.count) + " 项" : "") +
    (n.labelEn ? " · " + n.labelEn : ""), "kind"));
  if (n.note) insp.appendChild(el("p", n.note, "note"));

  if (n.meta) {
    var dl = document.createElement("dl");
    Object.keys(n.meta).forEach(function (k) {
      var v = n.meta[k];
      dl.appendChild(el("dt", k));
      dl.appendChild(el("dd", Array.isArray(v) ? v.join("   ") : String(v)));
    });
    insp.appendChild(dl);
  }

  if (n.leaves && n.leaves.length) {
    var table = document.createElement("table");
    var thead = document.createElement("thead");
    var hr = document.createElement("tr");
    ["条目", n.kind === "cmdGroup" ? "语言包" : "", n.kind === "cmdGroup" ? "中文" : ""]
      .filter(Boolean)
      .forEach(function (h) { hr.appendChild(el("th", h)); });
    thead.appendChild(hr);
    table.appendChild(thead);

    var tbody = document.createElement("tbody");
    n.leaves.forEach(function (leaf) {
      var tr = document.createElement("tr");
      tr.appendChild(el("td", leaf.label, "mono"));
      if (n.kind === "cmdGroup") {
        tr.appendChild(el("td", String(leaf.meta["语言包"]), "mono"));
        tr.appendChild(el("td", leaf.meta["中文"] || "—"));
      }
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    insp.appendChild(table);

    if (n.leavesTruncated) {
      insp.appendChild(el("p", "仅列出前 " + n.leaves.length + " 条，共 " + n.count + " 条。", "note"));
    }
  }

  selected = id;
}

select(DATA.nodes[0].id, false);
</script>
`;
  return html;
}

/* ── cli ────────────────────────────────────────────────────── */

export function parseArgs(argv) {
  const out = { model: null, out: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--model") out.model = argv[++i];
    else if (argv[i] === "--out") out.out = argv[++i];
    else if (argv[i] === "--help" || argv[i] === "-h") out.help = true;
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.model || !args.out) {
    process.stdout.write(
      "usage: node scripts/build-codex-feature-map.mjs --model <scan-model.json> --out <html>\n",
    );
    process.exit(args.help ? 0 : 2);
  }
  const model = JSON.parse(await readFile(resolve(args.model), "utf8"));
  const graph = buildGraph(model);
  const html = renderHtml(model, graph);
  await mkdir(dirname(resolve(args.out)), { recursive: true });
  await writeFile(resolve(args.out), html, "utf8");
  process.stdout.write(
    `wrote ${args.out} — ${graph.nodes.length} nodes, ${graph.edges.length} edges, ${html.length} bytes\n`,
  );
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  main().catch((error) => {
    process.stderr.write(`${error?.stack || error}\n`);
    process.exit(1);
  });
}
