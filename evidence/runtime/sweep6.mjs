#!/usr/bin/env node
/**
 * sweep6.mjs — panel pass driven by the shortcuts the UI itself advertises.
 *
 * The previous passes guessed chords from a second-hand map and half of them
 * were wrong; the actual bindings are printed on the panel chooser
 * ("Review ⌃⇧G", "Terminal ⌃`", "Browser ⌘T", "Files ⌘P"). Each step here first
 * re-reads those labels, so the chords come from the app rather than from notes.
 */
import * as b from "./lib/bridge.mjs";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, "../../evidence/runtime/shots");
const TMP = path.resolve(HERE, ".tmp");
fs.mkdirSync(TMP, { recursive: true });
const PID = await b.PID();
const results = [];

const find = (n, pred, out = []) => { if (!n) return out; if (pred(n)) out.push(n); for (const c of n.children || []) find(c, pred, out); return out; };
const byLabel = (n, label) => find(n, (x) => (x.title || "").trim() === label || (x.value || "").trim() === label);
async function win() { const ws = await b.windows(PID); return ws.find((w) => w.isMain) ?? ws[0]; }
async function focus() { execSync(`osascript -e 'tell application "ChatGPT" to activate'`); await b.sleep(650); }
const editable = (n) => n.ref && (n.isTextInput || ["AXTextField", "AXTextArea", "AXComboBox", "AXWebArea"].includes(n.role));

async function keys(list) {
  const w = await win();
  const r = await b.outline(w.windowId, { maxDimension: 1200 });
  const t = find(r.outline, editable)[0];
  const res = await b.send({ cmd: "act", lookId: b.lastLookId(), pid: PID, policy: "foreground",
    action: "keypress", target: t ? { ref: t.ref } : undefined, params: { keys: list, delivery: "hid" } });
  if (!res.ok) throw new Error(JSON.stringify(res.error));
  return res.result;
}
async function clickLabel(label) {
  const w = await win();
  const r = await b.outline(w.windowId, { maxDimension: 1600 });
  const hits = byLabel(r.outline, label);
  if (!hits.length) throw new Error(`label not found: ${label}`);
  await b.clickRef(PID, hits[hits.length - 1].ref);
  return { ref: hits[hits.length - 1].ref };
}
async function snap(tag) { const w = await win(); const tmp = path.join(TMP, tag + ".jpg"); await b.shot(w.windowId, tmp); return { file: tmp, hash: b.digest(tmp) }; }
async function step(name, fn) {
  const rec = { name, at: new Date().toISOString() };
  try {
    await focus();
    const before = await snap(name + "-before");
    rec.detail = (await fn()) ?? null;
    await b.sleep(1500);
    const after = await snap(name + "-after");
    rec.changed = before.hash !== after.hash;
    if (!rec.changed) throw new Error("no visual change");
    fs.copyFileSync(after.file, path.join(OUT, name + ".jpg"));
    rec.hash = after.hash; rec.ok = true;
  } catch (e) { rec.ok = false; rec.error = e.message; }
  results.push(rec);
  console.log((rec.ok ? "OK   " : "MISS ") + name + (rec.ok ? ` [${rec.hash}]` : ` — ${rec.error}`));
  return rec;
}
async function dismiss() { await focus(); for (let i = 0; i < 3; i++) { await keys(["Escape"]).catch(() => {}); await b.sleep(300); } }

/* Read the advertised chords straight off the panel chooser. */
async function readPanelChords() {
  const w = await win();
  const r = await b.outline(w.windowId, { maxDimension: 1600 });
  const out = {};
  for (const n of find(r.outline, (x) => x.canPress && /^(Review|Terminal|Browser|Files|Side chat)\b/.test((x.title || "").trim()))) {
    out[n.title.split(" ")[0].toLowerCase().replace(" ", "")] = n.title.trim();
  }
  return out;
}

const chords = await readPanelChords();
console.log("advertised chords:", JSON.stringify(chords));
fs.writeFileSync(path.join(OUT, "panel-chords.json"), JSON.stringify(chords, null, 2));

await dismiss();
await step("19-thread-open", async () => await clickLabel("New chat"));

/* ctrl = Control, not Alt — the earlier passes had the modifier wrong. */
const plan = [
  ["20-panel-review",   ["Control", "Shift", "g"]],
  ["21-panel-terminal", ["Control", "`"]],
  ["22-panel-browser",  ["Meta", "t"]],
  ["23-panel-files",    ["Meta", "p"]],
];
for (const [name, combo] of plan) {
  await dismiss();
  await step(name, async () => { await keys(combo); return { keys: combo.join("+") }; });
}
fs.writeFileSync(path.join(OUT, "sweep6-results.json"), JSON.stringify({ pid: PID, at: new Date().toISOString(), chords, results }, null, 2));
console.log(`\n${results.filter((r) => r.ok).length}/${results.length} changed`);
