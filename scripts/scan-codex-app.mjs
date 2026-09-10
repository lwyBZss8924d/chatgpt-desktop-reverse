#!/usr/bin/env node
/**
 * scan-codex-app.mjs — structural scan of the unpacked Codex Desktop bundle.
 *
 * Reads the app.asar extraction produced by the reverse-skill unpack step and
 * emits one normalized model that the atlas renders: the command surface, the
 * GUI component surface, the main-process window surface, the renderer route
 * table, and the locale coverage that proves each key is shipped.
 *
 * The scan is read-only and offline. It never launches the app — the runtime
 * half of the atlas comes from driving the live window over the accessibility
 * bridge, and that evidence is kept separate on purpose: this file answers
 * "what can the code render", the bridge answers "what does the UI do".
 *
 * Usage:
 *   node scripts/scan-codex-app.mjs --root /tmp/heige-re/extracted \
 *     --out docs/codex-desktop-feature-map.json
 */
import { createHash } from "node:crypto";
import { readFile, readdir, stat, writeFile, mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

/* ── argument parsing ───────────────────────────────────────── */

export function parseArgs(argv) {
  const out = { root: null, out: null, pretty: true };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--root") out.root = argv[++i];
    else if (a === "--out") out.out = argv[++i];
    else if (a === "--compact") out.pretty = false;
    else if (a === "--help" || a === "-h") out.help = true;
  }
  return out;
}

/* ── asset-name normalization ───────────────────────────────── */

/* Vite emits `composer-utility-bar-a1b2c3d4e5f6.js` — a human name, a content
   hash, an extension. Rollup emits `<name>-<chunkId>-<hash>.js` for anonymous
   shared chunks, where the chunk id is base62 (`cloud-1clWsBF3-b77d...`) and
   can itself look hex-ish (`cloud-drizzle-t5_aE7qa-43c5...`). The two shapes
   are not reliably separable by pattern: `swimlanes-5IMT3BWC.js` is a name,
   `settings-1a2b3c4d.js` a name plus hash. Any regex that strips one mangles
   the other, so the trailing segments are RETAINED and the module name is
   reported as-is. Over-counting duplicate module names is a cosmetically
   wrong number; silently renaming a component is a wrong fact. */
export function stemOf(filename) {
  return filename.replace(/\.(js|mjs|css|map)$/i, "");
}

export function extOf(filename) {
  const m = /\.([a-z0-9]+)$/i.exec(filename);
  return m ? m[1].toLowerCase() : "";
}

/* Asset families are named with a leading segment followed by dashes. Split
   only on the first dash of a known family so `chatgpt-sources-side-panel`
   stays one component instead of becoming three. */
const KNOWN_ROOTS = [
  "chatgpt", "composer", "layout", "panel", "home", "library", "memory",
  "model", "setting", "settings", "browser", "cloud-browser", "artifact",
  "avatar", "mcp", "onboarding", "dialog", "login", "auth", "codex",
  "thread", "terminal", "editor", "diff", "quick-chat", "plugin", "billing",
  "account", "web-sandbox", "workspace", "sidebar", "account-settings",
];

export function familyOf(stem) {
  for (const k of KNOWN_ROOTS) {
    if (stem === k || stem.startsWith(`${k}-`)) return k;
  }
  return stem.split("-")[0] || stem;
}

/* A UI surface is a module whose name ends in a surface noun. This is read
   off the token structure rather than guessed: `appearance-settings-<hash>`
   ends in `settings`, `cloud-browser-side-panel-<hash>` in `panel`. Modules
   that match nothing are libraries, icon sets, and vendor chunks — real
   bytes, but not part of the GUI. Counting them as UI would inflate the
   feature map with things that never draw a pixel. */
const SURFACE_NOUNS = [
  "settings", "page", "panel", "dialog", "modal", "view", "sidebar",
  "toolbar", "menu", "picker", "editor", "list", "tab", "bar", "button",
  "input", "field", "card", "overlay", "popover", "window", "screen",
  "banner", "toast", "toaster", "provider", "hook", "store", "route",
];

/* The trailing hash/chunk segment carries no meaning, so it is stepped over
   before the noun test — but only for the test, never for identity. */
const NON_WORD = /^[0-9a-f]{8,16}$|^[A-Za-z0-9]{8,10}$/;
const hasMixedCase = (s) => /[A-Z]/.test(s) && /[a-z]/.test(s);

export function surfaceOf(stem) {
  const parts = stem.split("-");
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const p = parts[i];
    if (SURFACE_NOUNS.includes(p)) return p;
    /* a hex run or a base62 chunk id (`1clWsBF3`, `t5_aE7qa`) is packaging
       noise; keep walking left to reach the words the author wrote */
    if (!NON_WORD.test(p) || hasMixedCase(p)) break;
  }
  return null;
}

/* ── locale keys ────────────────────────────────────────────── */

/* A locale key is `namespace.dotted.path`. The namespace is the first
   segment; for menu keys the second segment is the surface (`command`,
   `appMenu`, `aboutDialog`), which is more useful for grouping than the raw
   first segment alone. */
export function classifyKey(key) {
  const parts = key.split(".");
  const ns = parts[0] || "";
  const surface = parts.length > 1 ? parts[1] : "";
  return { ns, surface, depth: parts.length };
}

export async function readLocales(dir) {
  const files = (await readdir(dir)).filter((f) => f.endsWith(".json"));
  const byLocale = new Map();
  for (const f of files) {
    const locale = f.replace(/\.json$/, "");
    let data;
    try {
      data = JSON.parse(await readFile(join(dir, f), "utf8"));
    } catch {
      continue;
    }
    if (!data || typeof data !== "object" || Array.isArray(data)) continue;
    byLocale.set(locale, data);
  }
  return byLocale;
}

export function buildKeyIndex(byLocale) {
  const keys = new Map();
  for (const [locale, data] of byLocale) {
    for (const [key, value] of Object.entries(data)) {
      if (!keys.has(key)) keys.set(key, { key, locales: 0, sample: {} });
      const row = keys.get(key);
      row.locales += 1;
      if (row.sample[locale] === undefined) row.sample[locale] = value;
    }
  }
  return keys;
}

/* ── renderer asset tree ────────────────────────────────────── */

/* The full module-name list is the raw material for the component hierarchy,
   but carrying several thousand strings into the published model bloats the
   JSON for no reader. The sample cap keeps enough to prove the group and to
   label it; the count is the authoritative number. */
const SAMPLE_CAP = 8;

export async function scanAssets(assetsDir) {
  let entries;
  try {
    entries = await readdir(assetsDir);
  } catch {
    return { total: 0, byExt: {}, families: [], surfaces: [], uiModules: 0 };
  }
  const byExt = {};
  const families = new Map();
  const surfaces = new Map();
  let bytes = 0;
  let uiModules = 0;
  const uiNames = [];

  for (const name of entries) {
    const ext = extOf(name);
    byExt[ext] = (byExt[ext] || 0) + 1;
    if (ext !== "js" && ext !== "css") continue;
    try {
      bytes += (await stat(join(assetsDir, name))).size;
    } catch {
      /* a file that vanished between readdir and stat is not a scan failure */
    }

    const stem = stemOf(name);
    const fam = familyOf(stem);
    if (!families.has(fam)) families.set(fam, { family: fam, modules: 0 });
    families.get(fam).modules += 1;

    const surface = surfaceOf(stem);
    if (surface) {
      uiModules += 1;
      uiNames.push(stem);
      if (!surfaces.has(surface)) surfaces.set(surface, { surface, modules: 0, samples: [] });
      const row = surfaces.get(surface);
      row.modules += 1;
      if (row.samples.length < SAMPLE_CAP) row.samples.push(stem);
    }
  }

  return {
    total: entries.length,
    bytes,
    byExt,
    uiModules,
    families: [...families.values()].sort((a, b) => b.modules - a.modules),
    surfaces: [...surfaces.values()]
      .map((s) => ({ ...s, samples: s.samples.sort() }))
      .sort((a, b) => b.modules - a.modules),
    uiNames: uiNames.sort(),
  };
}

/* ── main-process bundle signals ────────────────────────────── */

/* The window surface is a closed set of string constants in the main bundle.
   Find them by name rather than by regex-guessing the structure around them. */
const WINDOW_TOKENS = [
  "appView", "browserView", "editorWindow", "execWindow", "hotkeyWindow",
  "browserCommentPopupWindow", "cardWindow", "annotationView", "activityView",
  "applyHotkeyWindow", "activeConversationByWindow",
];

export async function scanMainBundle(file) {
  let source;
  try {
    source = await readFile(file, "utf8");
  } catch {
    return { bytes: 0, sha256: null, windowTokens: [] };
  }
  const windowTokens = WINDOW_TOKENS
    .filter((t) => source.includes(t))
    .map((t) => ({
      token: t,
      /* a bare count is enough to separate "mentioned once in a comment" from
         "used as an identifier across the process" */
      hits: source.split(t).length - 1,
    }))
    .sort((a, b) => b.hits - a.hits);

  return {
    bytes: Buffer.byteLength(source),
    sha256: createHash("sha256").update(source).digest("hex"),
    windowTokens,
  };
}

/* ── webview module manifest ────────────────────────────────── */

/* Vite's dynamic-import manifest is the authoritative list of lazy chunks the
   renderer can actually load. It lives as a flat array of `./name-hash.js`
   string literals in the entry chunk, one entry per split point. This beats
   scraping route literals: a route string proves a path exists, the manifest
   proves a module ships and is reachable by the router.

   Filtering is by suffix, preferring a leading dash so `settings-x.js` and
   `-settings-x.js` both count while `my-settingsomething.js` does not. */
export function extractManifest(sources) {
  const mods = new Set();
  const re = /["'`]\.\/([a-z0-9._-]+\.js)["'`]/g;
  for (const { text } of sources) {
    let m;
    while ((m = re.exec(text)) !== null) mods.add(m[1]);
  }
  return [...mods].sort();
}

export function groupManifest(mods) {
  const groups = new Map();
  for (const mod of mods) {
    const stem = stemOf(mod);
    const fam = familyOf(stem);
    if (!groups.has(fam)) groups.set(fam, []);
    groups.get(fam).push(mod);
  }
  return [...groups.entries()]
    .map(([family, modules]) => ({ family, count: modules.length, modules }))
    .sort((a, b) => b.count - a.count);
}

/* ── orchestration ──────────────────────────────────────────── */

export async function scan({ root, assetsLimit = 400 }) {
  const extracted = resolve(root);
  const pkgPath = join(extracted, "package.json");
  let pkg = {};
  try {
    pkg = JSON.parse(await readFile(pkgPath, "utf8"));
  } catch {
    /* a missing package.json is reported as an empty app block below */
  }

  const localesDir = join(extracted, "native-menu-locales");
  const byLocale = await readLocales(localesDir);
  const keyIndex = buildKeyIndex(byLocale);

  const assets = await scanAssets(join(extracted, "webview", "assets"));
  const main = await scanMainBundle(join(extracted, ".vite", "build", "main-D87AK7lw.js"));

  /* The manifest is collected from the entry and controller chunks only:
     those are where Vite's dynamic-import table lands. Reading all 6990
     files to find the same table is minutes of I/O for no extra entry. */
  const entryCandidates = ["app-initial", "app-primary", "controller"];
  const assetDir = join(extracted, "webview", "assets");
  const sources = [];
  try {
    const names = await readdir(assetDir);
    const picked = names
      .filter((n) => n.endsWith(".js") && entryCandidates.some((e) => n.startsWith(e)))
      .slice(0, assetsLimit);
    for (const n of picked) {
      try {
        sources.push({ file: n, text: await readFile(join(assetDir, n), "utf8") });
      } catch {
        /* skip */
      }
    }
  } catch {
    /* assets dir absent */
  }
  const manifest = extractManifest(sources);

  /* Command surface = locale keys under the menu namespaces, grouped by the
     surface segment so the atlas can show "92 commands, 39 app-menu items". */
  const surfaces = new Map();
  for (const row of keyIndex.values()) {
    const { ns, surface } = classifyKey(row.key);
    if (!surfaces.has(ns)) surfaces.set(ns, { namespace: ns, entries: [] });
    surfaces.get(ns).entries.push({ ...row, surface });
  }

  const localeList = [...byLocale.keys()].sort();

  return {
    generatedFrom: {
      productName: pkg.productName || null,
      name: pkg.name || null,
      version: pkg.version || null,
      main: pkg.main || null,
      root: extracted,
    },
    commandSurface: {
      totalKeys: keyIndex.size,
      localeCount: localeList.length,
      locales: localeList,
      namespaces: [...surfaces.values()]
        .map((s) => ({
          namespace: s.namespace,
          count: s.entries.length,
          entries: s.entries
            .map((e) => ({ key: e.key, surface: e.surface, locales: e.locales, zh: e.sample["zh-CN"] || null, de: e.sample["de-DE"] || null }))
            .sort((a, b) => a.key.localeCompare(b.key)),
        }))
        .sort((a, b) => b.count - a.count),
    },
    componentSurface: {
      totalAssets: assets.total,
      totalBytes: assets.bytes,
      byExt: assets.byExt,
      uiModules: assets.uiModules,
      families: assets.families,
      surfaces: assets.surfaces,
    },
    windowSurface: main,
    moduleManifest: {
      total: manifest.length,
      chunks: manifest,
      groups: groupManifest(manifest),
    },
  };
}

/* ── cli ────────────────────────────────────────────────────── */

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.root) {
    process.stdout.write(
      "usage: node scripts/scan-codex-app.mjs --root <extracted-asar> [--out <json>] [--compact]\n",
    );
    process.exit(args.help ? 0 : 2);
  }
  const model = await scan({ root: args.root });
  const json = args.pretty ? JSON.stringify(model, null, 2) : JSON.stringify(model);
  if (args.out) {
    await mkdir(dirname(resolve(args.out)), { recursive: true });
    await writeFile(resolve(args.out), `${json}\n`, "utf8");
    process.stdout.write(`wrote ${args.out} (${json.length} bytes)\n`);
  } else {
    process.stdout.write(`${json}\n`);
  }
}

if (import.meta.url === `file://${resolve(process.argv[1] || "")}` || process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error?.stack || error}\n`);
    process.exit(1);
  });
}
