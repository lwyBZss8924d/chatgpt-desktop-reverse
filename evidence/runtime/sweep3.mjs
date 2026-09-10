#!/usr/bin/env node
/**
 * sweep3.mjs — panel + settings pass with change detection.
 *
 * sweep2 recorded "captured" for steps that produced an identical frame, which
 * is the same signature as a keystroke that went nowhere. Here every step takes
 * a baseline digest, acts, and re-digests: a step only counts as captured when
 * the picture actually changed.
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
const find = (n, pred, out = []) => {
  if (!n) return out;
  if (pred(n)) out.push(n);
  for (const c of n.children || []) find(c, pred, out);
  return out;
};
async function win() {
  const ws = await b.windows(PID);
  return ws.find((w) => w.isMain) ?? ws[0];
}
async function focus() {
  execSync(`osascript -e 'tell application "ChatGPT" to activate'`);
  await b.sleep(600);
}
const editable = (n) =>
  n.ref && (n.isTextInput || ["AXTextField", "AXTextArea", "AXComboBox", "AXWebArea"].includes(n.role));

async function keys(list) {
  const w = await win();
  const r = await b.outline(w.windowId, { maxDimension: 1200 });
  const t = find(r.outline, editable)[0];
  const res = await b.send({
    cmd: "act", lookId: b.lastLookId(), pid: PID, policy: "foreground",
    action: "keypress", target: t ? { ref: t.ref } : undefined,
    params: { keys: list, delivery: "hid" },
  });
  if (!res.ok) throw new Error(JSON.stringify(res.error));
  return res.result;
}

async function snap(tag) {
  const w = await win();
  const tmp = path.join(TMP, tag + ".jpg");
  await b.shot(w.windowId, tmp);
  return { file: tmp, hash: b.digest(tmp) };
}

async function step(name, fn) {
  const rec = { name, at: new Date().toISOString() };
  try {
    await focus();
    const before = await snap(name + "-before");
    rec.detail = (await fn()) ?? null;
    await b.sleep(1300);
    const after = await snap(name + "-after");
    rec.changed = before.hash !== after.hash;
    if (!rec.changed) throw new Error("no visual change — control did not engage");
    const final = path.join(OUT, name + ".jpg");
    fs.copyFileSync(after.file, final);
    rec.hash = after.hash;
    rec.ok = true;
  } catch (e) {
    rec.ok = false;
    rec.error = e.message;
  }
  results.push(rec);
  console.log((rec.ok ? "OK   " : "MISS ") + name + (rec.ok ? ` [${rec.hash}]` : ` — ${rec.error}`));
  return rec;
}

/* Dismiss whatever overlay is up (quick chat, palette) before the next step. */
async function dismiss() {
  await focus();
  for (let i = 0; i < 2; i++) { await keys(["Escape"]).catch(() => {}); await b.sleep(350); }
}

const plan = [
  ["20-panel-review",   async () => { await dismiss(); await keys(["Alt", "Meta", "g"]); return { keys: "Alt+Cmd+G" }; }],
  ["21-panel-terminal", async () => { await dismiss(); await keys(["Alt", "Meta", "t"]); return { keys: "Alt+Cmd+T" }; }],
  ["22-panel-browser",  async () => { await dismiss(); await keys(["Alt", "Meta", "b"]); return { keys: "Alt+Cmd+B" }; }],
  ["23-panel-files",    async () => { await dismiss(); await keys(["Alt", "Meta", "e"]); return { keys: "Alt+Cmd+E" }; }],
  ["24-panel-sidechat", async () => { await dismiss(); await keys(["Alt", "Meta", "s"]); return { keys: "Alt+Cmd+S" }; }],
  ["25-settings-open",  async () => { await dismiss(); await keys(["Meta", ","]); return { keys: "Cmd+," }; }],
];

const only = process.argv.slice(2);
for (const [name, fn] of plan) {
  if (only.length && !only.includes(name) && !only.includes(name.split("-")[0])) continue;
  await step(name, fn);
}
fs.writeFileSync(path.join(OUT, "sweep3-results.json"), JSON.stringify({ pid: PID, at: new Date().toISOString(), results }, null, 2));
const ok = results.filter((r) => r.ok).length;
console.log(`\n${ok}/${results.length} changed → ${OUT}`);
