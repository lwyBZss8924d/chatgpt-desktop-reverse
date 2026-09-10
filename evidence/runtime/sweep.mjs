#!/usr/bin/env node
/**
 * sweep.mjs — drive the live Codex Desktop window and capture one screenshot per
 * feature surface, keyed to the node ids used by the feature-graph artifact.
 *
 * Two rules shape this file:
 *   1. Navigation is by accessibility ref, never by pixel: every step re-reads
 *      the outline, finds the named node, and clicks its ref. Coordinates are
 *      only used where the UI genuinely has no addressable node (canvas, menus).
 *   2. A step that cannot find its target is recorded as a miss, not skipped
 *      silently — the sweep output is evidence, so a failure has to be visible.
 */
import * as b from "./lib/bridge.mjs";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, "../../evidence/runtime/shots");
const PID = await b.PID();

const results = [];

function find(n, want, out = []) {
  if (!n) return out;
  const t = n.title || "";
  const v = n.value || "";
  if (t === want || v === want) out.push(n);
  for (const c of n.children || []) find(c, want, out);
  return out;
}
function findBy(n, pred, out = []) {
  if (!n) return out;
  if (pred(n)) out.push(n);
  for (const c of n.children || []) find(c, n && pred, out);
  return out;
}

async function win() {
  const ws = await b.windows(PID);
  return ws.find((w) => w.isMain) ?? ws[0];
}

async function focus() {
  execSync(`osascript -e 'tell application "ChatGPT" to activate'`);
  await b.sleep(700);
}

/* Click a node addressed by its visible title or value. */
async function clickLabel(label, { nth = 0, policy = "foreground" } = {}) {
  const w = await win();
  const r = await b.outline(w.windowId);
  const hits = find(r.outline, label);
  if (!hits.length) return { ok: false, reason: "not_found", label };
  const hit = hits[Math.min(nth, hits.length - 1)];
  await b.clickRef(PID, hit.ref, { policy });
  return { ok: true, ref: hit.ref, rect: hit.rect };
}

/* The helper refuses a keypress with no target, and for web content it needs a
   pointer-capable delivery clause. Anchor on the first editable node, falling
   back to the web area, so a keystroke lands wherever focus already is. */
function firstEditable(n) {
  if (!n) return null;
  if (n.ref && (n.isTextInput || ["AXTextField", "AXTextArea", "AXComboBox", "AXWebArea"].includes(n.role))) return n;
  for (const c of n.children || []) { const hit = firstEditable(c); if (hit) return hit; }
  return null;
}

async function key(keys) {
  const w = await win();
  const r = await b.outline(w.windowId);
  const target = firstEditable(r.outline);
  const res = await b.send({
    cmd: "act", lookId: b.lastLookId(), pid: PID, policy: "foreground",
    action: "keypress", target: target ? { ref: target.ref } : undefined,
    params: { keys, delivery: "hid" },
  });
  if (!res.ok) throw new Error(JSON.stringify(res.error));
  return res.result;
}

async function typeText(text) {
  const w = await win();
  const r = await b.outline(w.windowId);
  const target = firstEditable(r.outline);
  if (!target) throw new Error("no editable node to receive text");
  const res = await b.send({
    cmd: "act", lookId: b.lastLookId(), pid: PID, policy: "foreground",
    action: "typeText", target: { ref: target.ref }, params: { text, delivery: "hid" },
  });
  if (!res.ok) throw new Error(JSON.stringify(res.error));
  return res.result;
}

async function shot(name) {
  const w = await win();
  const out = path.join(OUT, name + ".jpg");
  return await b.shot(w.windowId, out);
}

async function step(name, fn) {
  const rec = { name, at: new Date().toISOString() };
  try {
    await focus();
    const detail = await fn();
    await b.sleep(1100);
    const s = await shot(name);
    rec.ok = true;
    rec.detail = detail ?? null;
    rec.bytes = s.bytes;
  } catch (e) {
    rec.ok = false;
    rec.error = e.message;
  }
  results.push(rec);
  console.log((rec.ok ? "OK   " : "MISS ") + name + (rec.ok ? ` (${rec.bytes}B)` : ` — ${rec.error}`));
  return rec;
}

const only = process.argv.slice(2);

/* ── the sweep ──────────────────────────────────────────────── */

const plan = [
  ["01-sidebar-home",     async () => ({ nav: "New chat", r: await clickLabel("New chat") })],
  ["02-scheduled",        async () => ({ r: await clickLabel("Scheduled") })],
  ["03-pull-requests",    async () => ({ r: await clickLabel("Pull requests") })],
  ["04-plugins",          async () => ({ r: await clickLabel("Plugins") })],
  ["05-security",         async () => ({ r: await clickLabel("Security") })],
  ["06-explore",          async () => ({ r: await clickLabel("Explore") })],
  ["07-command-palette",  async () => { await key(["Meta", "k"]); return { keys: "Cmd+K" }; }],
  ["08-palette-chats",    async () => { await typeText("chat"); return { query: "chat" }; }],
  ["09-palette-panels",   async () => { await typeText("panel"); return { query: "panel" }; }],
  ["10-palette-settings", async () => { await typeText("setting"); return { query: "setting" }; }],
  ["11-quick-chat",       async () => { await key(["Meta", "Escape"]); await b.sleep(400); await key(["Alt", "Meta", "n"]); return { keys: "Alt+Cmd+N" }; }],
];

for (const [name, fn] of plan) {
  if (only.length && !only.includes(name) && !only.includes(name.split("-")[0])) continue;
  await step(name, fn);
  await key(["Escape"]).catch(() => {});
  await b.sleep(300);
}

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "sweep-results.json"), JSON.stringify({ pid: PID, at: new Date().toISOString(), results }, null, 2));
console.log("\nwrote", path.join(OUT, "sweep-results.json"));
const ok = results.filter((r) => r.ok).length;
console.log(`${ok}/${results.length} captured`);
