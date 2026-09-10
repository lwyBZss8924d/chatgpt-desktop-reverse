#!/usr/bin/env node
/**
 * sweep-settings.mjs — walk every Settings section and capture it.
 *
 * The settings nav is a stable, fully addressable list, so navigation is by
 * label throughout. Sections whose label opens a sub-page are captured once;
 * the point is coverage of the settings surface, not of every control.
 */
import * as b from "./lib/bridge.mjs";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, "../../evidence/runtime/shots/settings");
const TMP = path.resolve(HERE, ".tmp");
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(TMP, { recursive: true });
const PID = await b.PID();
const results = [];

const find = (n, pred, out = []) => { if (!n) return out; if (pred(n)) out.push(n); for (const c of n.children || []) find(c, pred, out); return out; };
const byLabel = (n, label) => find(n, (x) => (x.title || "").trim() === label || (x.value || "").trim() === label);
async function win() { const ws = await b.windows(PID); return ws.find((w) => w.isMain) ?? ws[0]; }
async function focus() { execSync(`osascript -e 'tell application "ChatGPT" to activate'`); await b.sleep(600); }
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
  if (!hits.length) throw new Error(`not found: ${label}`);
  await b.clickRef(PID, hits[hits.length - 1].ref);
  return hits[hits.length - 1];
}
async function snap(tag) { const w = await win(); const t = path.join(TMP, tag + ".jpg"); await b.shot(w.windowId, t); return { file: t, hash: b.digest(t) }; }

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/* Open settings once. */
async function openSettings() {
  await focus();
  for (let i = 0; i < 3; i++) { await keys(["Escape"]).catch(() => {}); await b.sleep(250); }
  await keys(["Meta", ","]);
  await b.sleep(1600);
}

async function captureSection(label, idx) {
  const name = `${String(idx).padStart(2, "0")}-${slug(label)}`;
  const rec = { name, label, at: new Date().toISOString() };
  try {
    await openSettings();
    const hit = await clickLabel(label);
    await b.sleep(1400);
    const s = await snap(name);
    fs.copyFileSync(s.file, path.join(OUT, name + ".jpg"));
    rec.hash = s.hash; rec.ok = true;
  } catch (e) { rec.ok = false; rec.error = e.message; }
  results.push(rec);
  console.log((rec.ok ? "OK   " : "MISS ") + name + (rec.ok ? ` [${rec.hash}]` : ` — ${rec.error}`));
}

const SECTIONS = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["General", "Import", "Profile", "Appearance", "Voice", "Configuration", "Personalization",
     "Pets", "Keyboard shortcuts", "Usage & billing", "Analytics", "Account",
     "Computer use", "Computer history", "Appshots", "Plugins", "Browser",
     "Hooks", "Connections", "Git", "Environments", "Worktrees", "Archived chats"];

let i = 0;
for (const s of SECTIONS) { await captureSection(s, ++i); }

fs.writeFileSync(path.join(OUT, "settings-results.json"), JSON.stringify({ pid: PID, at: new Date().toISOString(), results }, null, 2));
console.log(`\n${results.filter((r) => r.ok).length}/${results.length} captured → ${OUT}`);
