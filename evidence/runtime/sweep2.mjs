#!/usr/bin/env node
/**
 * sweep2.mjs — second pass: the surfaces that need a keystroke or a palette
 * round-trip rather than a clickable sidebar node. Same rules as sweep.mjs:
 * navigate by addressable target, record misses rather than hiding them.
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

const has = (n, pred, out = []) => {
  if (!n) return out;
  if (pred(n)) out.push(n);
  for (const c of n.children || []) has(c, pred, out);
  return out;
};

async function win() {
  const ws = await b.windows(PID);
  return ws.find((w) => w.isMain) ?? ws[0];
}
async function focus() {
  execSync(`osascript -e 'tell application "ChatGPT" to activate'`);
  await b.sleep(650);
}
const editable = (n) =>
  n.ref && (n.isTextInput || ["AXTextField", "AXTextArea", "AXComboBox", "AXWebArea"].includes(n.role));

async function keys(list) {
  const w = await win();
  const r = await b.outline(w.windowId, { maxDimension: 1200 });
  const t = has(r.outline, editable)[0];
  const res = await b.send({
    cmd: "act", lookId: b.lastLookId(), pid: PID, policy: "foreground",
    action: "keypress", target: t ? { ref: t.ref } : undefined,
    params: { keys: list, delivery: "hid" },
  });
  if (!res.ok) throw new Error(JSON.stringify(res.error));
  return res.result;
}

async function shot(name) {
  const w = await win();
  const out = path.join(OUT, name + ".jpg");
  await b.shot(w.windowId, out);
  return out;
}

async function step(name, fn) {
  const rec = { name, at: new Date().toISOString() };
  try {
    await focus();
    rec.detail = (await fn()) ?? null;
    await b.sleep(1300);
    await shot(name);
    rec.ok = true;
  } catch (e) {
    rec.ok = false;
    rec.error = e.message;
  }
  results.push(rec);
  console.log((rec.ok ? "OK   " : "MISS ") + name + (rec.ok ? "" : ` — ${rec.error}`));
  return rec;
}

/* Palette is the reliable router: open with Cmd+K, type the command, Enter. */
async function viaPalette(query) {
  await keys(["meta", "k"]);
  await b.sleep(700);
  const w = await win();
  const r = await b.outline(w.windowId, { maxDimension: 1200 });
  const box = has(r.outline, (n) => n.role === "AXComboBox" || n.role === "AXTextField").pop();
  if (!box) throw new Error("palette input not found");
  let res = await b.send({
    cmd: "act", lookId: b.lastLookId(), pid: PID, policy: "foreground",
    action: "typeText", target: { ref: box.ref }, params: { text: query, delivery: "hid" },
  });
  if (!res.ok) throw new Error(JSON.stringify(res.error));
  await b.sleep(900);
  await keys(["Enter"]);
  return { query };
}

const plan = [
  ["20-panel-review",    async () => { await keys(["Alt", "Meta", "g"]); return { keys: "Alt+Cmd+G" }; }],
  ["21-panel-terminal",  async () => { await keys(["Alt", "Meta", "t"]); return { keys: "Alt+Cmd+T" }; }],
  ["22-panel-browser",   async () => { await keys(["Alt", "Meta", "b"]); return { keys: "Alt+Cmd+B" }; }],
  ["23-panel-files",     async () => { await keys(["Alt", "Meta", "e"]); return { keys: "Alt+Cmd+E" }; }],
  ["24-panel-sidechat",  async () => { await keys(["Alt", "Meta", "s"]); return { keys: "Alt+Cmd+S" }; }],
  ["25-settings-open",   async () => { await keys(["Meta", ","]); return { keys: "Cmd+," }; }],
  ["26-settings-search", async () => { return { note: "settings landing" }; }],
];

const only = process.argv.slice(2);
for (const [name, fn] of plan) {
  if (only.length && !only.includes(name) && !only.includes(name.split("-")[0])) continue;
  await step(name, fn);
  await b.sleep(400);
}

fs.writeFileSync(path.join(OUT, "sweep2-results.json"), JSON.stringify({ pid: PID, at: new Date().toISOString(), results }, null, 2));
const ok = results.filter((r) => r.ok).length;
console.log(`\n${ok}/${results.length} captured → ${OUT}`);
