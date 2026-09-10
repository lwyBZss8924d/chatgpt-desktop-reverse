#!/usr/bin/env node
/**
 * scan-rust-core.mjs — the Codex OSS Rust core's app-server contract, as a model.
 *
 * The desktop app does not invent its agent protocol; it speaks the one the OSS
 * `codex` binary exposes over stdio. That contract is generated from Rust types
 * into a JSON Schema, which makes it the one part of this analysis that needs no
 * inference at all: every method name below is a schema `enum` literal.
 *
 *   ClientRequest      app -> core   (the app asks the core to do something)
 *   ServerRequest      core -> app   (the core asks the app to decide/approve)
 *   ClientNotification app -> core   (fire and forget)
 *   ServerNotification core -> app   (streaming progress, state changes)
 *
 * The direction matters for the three-way map: a ServerRequest is the core
 * refusing to act without the UI, which is precisely where desktop-only policy
 * surfaces live.
 *
 * Usage
 *   node scripts/scan-rust-core.mjs [--repo ~/dev-space/openai/codex] [--out evidence/static/rust-core-model.json]
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");

const argv = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
};
const expand = (p) => p.replace(/^~/, homedir());

const REPO = resolve(expand(flag("repo", join(homedir(), "dev-space/openai/codex"))));
const OUT = resolve(expand(flag("out", join(ROOT, "evidence/static/rust-core-model.json"))));

if (!existsSync(REPO)) {
  console.error(`Codex OSS checkout not found: ${REPO}`);
  process.exit(1);
}

const SCHEMA_DIR = join(REPO, "codex-rs/app-server-protocol/schema/json");

/* ── method extraction ──────────────────────────────────────── */

/**
 * Each oneOf variant carries its method as a single-element `enum`, its params
 * as a `$ref`, and its title as the Rust type name. Reading all three keeps the
 * model traceable back to the type that produced it.
 */
function variants(schema, key) {
  const node = schema.definitions?.[key];
  if (!node?.oneOf) return [];
  return node.oneOf.flatMap((v) => {
    const method = v.properties?.method?.enum?.[0];
    if (!method) return [];
    const ref = v.properties?.params?.$ref ?? v.properties?.params?.anyOf?.[0]?.$ref;
    return [{
      method,
      type: v.title ?? null,
      params: ref ? ref.replace("#/definitions/", "") : null,
      /* The domain is the segment before the slash — `thread/start` is the
         thread domain. Methods without a slash (`initialize`) are protocol
         lifecycle, not a domain. */
      domain: method.includes("/") ? method.split("/")[0] : "(lifecycle)",
      description: v.description ?? null,
    }];
  });
}

/* The two schema files are not layered the way their names suggest: the v2 file
   carries ClientRequest/ServerNotification, while ServerRequest and
   ClientNotification appear only in the combined file (with `definitions/v2/`
   refs). Each channel therefore names the file it must be read from — asking the
   v2 file for ServerRequest silently yields zero, which is how the approval
   channel went missing on the first pass. */
const CHANNELS = [
  ["clientRequests", "ClientRequest", "v2", "app → core", "The app asks the core to act."],
  ["serverRequests", "ServerRequest", "combined", "core → app", "The core will not proceed without a UI decision."],
  ["clientNotifications", "ClientNotification", "combined", "app → core", "Fire-and-forget input from the app."],
  ["serverNotifications", "ServerNotification", "v2", "core → app", "Streaming progress and state change."],
];

async function readSchema(file) {
  const p = join(SCHEMA_DIR, file);
  if (!existsSync(p)) return null;
  return JSON.parse(await readFile(p, "utf8"));
}

const v2 = await readSchema("codex_app_server_protocol.v2.schemas.json");
const v1 = await readSchema("codex_app_server_protocol.schemas.json");
if (!v2) {
  console.error(`schema not found under ${SCHEMA_DIR}`);
  process.exit(1);
}

const SCHEMAS = { v2, combined: v1 };

const channels = {};
for (const [key, defName, which, direction, blurb] of CHANNELS) {
  const schema = SCHEMAS[which];
  const entries = schema ? variants(schema, defName) : [];
  if (!entries.length) {
    /* Loud, not silent: an empty channel means the definition moved, and a
       zero here would otherwise read as "the core has no approval channel". */
    console.warn(`  warning: ${defName} yielded no methods from the ${which} schema`);
  }
  channels[key] = { definition: defName, schema: which, direction, blurb, count: entries.length, entries };
}

const allMethods = new Set(Object.values(channels).flatMap((c) => c.entries.map((e) => e.method)));

/* Methods present in the combined schema's request channel but absent from v2 —
   the legacy surface the app would be using had it not migrated. */
const v1Only = v1
  ? [...new Set(variants(v1, "ClientRequest").map((e) => e.method))].filter((m) => !allMethods.has(m)).sort()
  : [];

/* ── crate inventory ────────────────────────────────────────── */

/* The crate list is the core's own module decomposition. Pairing it with the
   protocol tells you which crates are reachable from the desktop app at all:
   a crate with no method naming it is either internal or CLI/TUI-only. */
const crates = execFileSync("ls", ["-1", join(REPO, "codex-rs")], { encoding: "utf8" })
  .split("\n").map((s) => s.trim())
  .filter((s) => s && !s.includes(".") && existsSync(join(REPO, "codex-rs", s, "Cargo.toml")))
  .sort();

const head = (() => {
  try {
    return execFileSync("git", ["-C", REPO, "log", "--format=%h %cs", "-1"], { encoding: "utf8" }).trim();
  } catch { return null; }
})();

const domains = {};
for (const [key, c] of Object.entries(channels)) {
  for (const e of c.entries) {
    (domains[e.domain] ??= { domain: e.domain, total: 0, byChannel: {} });
    domains[e.domain].total++;
    domains[e.domain].byChannel[key] = (domains[e.domain].byChannel[key] ?? 0) + 1;
  }
}

const model = {
  generatedFrom: {
    repo: REPO,
    head,
    schema: "codex-rs/app-server-protocol/schema/json/codex_app_server_protocol.v2.schemas.json",
    at: new Date().toISOString(),
    note: "Method names are schema enum literals, not inferred from code.",
  },
  totals: {
    methods: allMethods.size,
    ...Object.fromEntries(Object.entries(channels).map(([k, c]) => [k, c.count])),
    domains: Object.keys(domains).length,
    crates: crates.length,
    v1OnlyMethods: v1Only.length,
  },
  channels,
  domains: Object.values(domains).sort((a, b) => b.total - a.total),
  v1Only,
  crates,
};

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, JSON.stringify(model, null, 2));

console.log(`rust core model -> ${OUT}`);
console.log(`  ${model.totals.methods} methods over ${model.totals.domains} domains, ${crates.length} crates`);
for (const [k, c] of Object.entries(channels)) console.log(`  ${k.padEnd(20)} ${String(c.count).padStart(3)}  ${c.direction}`);
if (v1Only.length) console.log(`  ${String(v1Only.length).padStart(3)} v1-only methods retained`);
