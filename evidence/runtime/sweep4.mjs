#!/usr/bin/env node
/**
 * sweep4.mjs — open a real conversation, then exercise the right-hand panels.
 * Panels are thread-scoped: they only exist once a chat is open, so the pass
 * starts by leaving Settings and entering a thread.
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
const byLabel = (n, label) =>
  find(n, (x) => (x.title || "").trim() === label || (x.value || "").trim() === label);
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
async function clickLabel(label) {
  const w = await win();
  const r = await b.outline(w.windowId, { maxDimension: 1600 });
  const hits = byLabel(r.outline, label);
  if (!hits.length) throw new Error(`label not found: ${label}`);
  await b.clickRef(PID, hits[0].ref);
  return { ref: hits[0].ref };
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
    await b.sleep(1400);
    const after = await snap(name + "-after");
    rec.changed = before.hash !== after.hash;
    if (!rec.changed) throw new Error("no visual change");
    fs.copyFileSync(after.file, path.join(OUT, name + ".jpg"));
    rec.hash = after.hash;
    rec.ok = true;
  } catch (e) {
    rec.ok = false; rec.error = e.message;
  }
  results.push(rec);
  console.log((rec.ok ? "OK   " : "MISS ") + name + (rec.ok ? ` [${rec.hash}]` : ` — ${rec.error}`));
}
async function dismiss() {
  await focus();
  for (let i = 0; i < 3; i++) { await keys(["Escape"]).catch(() => {}); await b.sleep(300); }
}

/* 1. leave settings, 2. open the first recent chat, 3. exercise panels */
await dismiss();
await step("19-thread-open", async () => {
  const w = await win();
  const r = await b.outline(w.windowId, { maxDimension: 1600 });
  /* A recent-chat row is a pressable node whose label is a conversation title;
     fall back to the sidebar's Recents disclosure if none is addressable. */
  const rows = find(r.outline, (x) =>
    x.canPress && /^[A-Za-z0-9]/.test((x.title || "").trim()) &&
    (x.title || "").trim().length > 3 &&
    !/^(New chat|Pull requests|Scheduled|Plugins|Security|Explore|Recents)$/.test((x.title || "").trim()));
  if (!rows.length) throw new Error("no recent-chat row addressable");
  await b.clickRef(PID, rows[0].ref);
  return { opened: rows[0].title };
});

const panels = [
  ["20-panel-review",   ["Alt", "Meta", "g"]],
  ["21-panel-terminal", ["Alt", "Meta", "t"]],
  ["22-panel-browser",  ["Alt", "Meta", "b"]],
  ["23-panel-files",    ["Alt", "Meta", "e"]],
  ["24-panel-sidechat", ["Alt", "Meta", "s"]],
];
for (const [name, combo] of panels) {
  await step(name, async () => { await keys(combo); return { keys: combo.join("+") }; });
}
fs.writeFileSync(path.join(OUT, "sweep4-results.json"), JSON.stringify({ pid: PID, at: new Date().toISOString(), results }, null, 2));
console.log(`\n${results.filter((r) => r.ok).length}/${results.length} changed`);
