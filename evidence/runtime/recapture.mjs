#!/usr/bin/env node
/**
 * recapture.mjs — re-shoot every surface with the window sized to the display.
 *
 * Why a full re-shoot rather than a re-crop: the earlier captures were made while
 * the window was 1499x1440 pt on a 2560x1440 display. The bridge's capture path
 * caps output at the 1920x1080 screen raster, so each of those frames was the
 * window's top-left corner with the rest cut off — a fact that only became
 * visible once the bounds were measured rather than assumed. No crop can recover
 * pixels that were never captured, so the surfaces are visited again with the
 * window resized to something the display can actually hold.
 *
 * The window is restored to its original size on the way out.
 */
import * as b from "./lib/bridge.mjs";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { windowBox, idealWindowSize } from "../../scripts/lib/window-bounds.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const OUT = path.join(ROOT, "evidence/runtime/shots");
const TMP = path.join(HERE, ".tmp");
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(TMP, { recursive: true });

const PID = await b.PID();

/* Target window size. The capture raster is 16:9 and the frame is the window
   scaled to fit it, so a 16:9 window fills the raster exactly — any other
   aspect is scaled down and the surplus becomes padding. 1776x1000 is the
   largest such size that still fits the 2560x1440 display. */
const { w: WIN_W, h: WIN_H } = idealWindowSize(1000);


const results = [];

async function mainWindow() {
  const ws = await b.windows(PID);
  return ws.find((w) => w.isMain) ?? ws[0];
}

function systemEvents(script) {
  return execFileSync("osascript", ["-e",
    `tell application "System Events" to tell process "ChatGPT" to ${script}`], { encoding: "utf8" }).trim();
}

async function focus() {
  execFileSync("osascript", ["-e", 'tell application "ChatGPT" to activate']);
  await b.sleep(600);
}

/* The window is also moved to the display origin: a window that drifts partly
   off-screen is captured only where it overlaps the raster, which is how the
   earlier frames lost their left edge without anyone noticing. */
async function resize(w, h) {
  try {
    systemEvents(`set position of window 1 to {0, 0}`);
    systemEvents(`set size of window 1 to {${w}, ${h}}`);
    systemEvents(`set position of window 1 to {0, 0}`);
    await b.sleep(900);
  } catch (e) {
    /* Not fatal: some window states refuse AX resize, and a full-screen window
       is already the right shape. The capture below still measures what it got. */
    console.log("  (resize refused:", e.message.split("\n")[0], ")");
  }
}

const find = (n, pred, out = []) => {
  if (!n) return out;
  if (pred(n)) out.push(n);
  for (const c of n.children || []) find(c, pred, out);
  return out;
};
const byLabel = (n, label) =>
  find(n, (x) => (x.title || "").trim() === label || (x.value || "").trim() === label);
const editable = (n) =>
  n.ref && (n.isTextInput || ["AXTextField", "AXTextArea", "AXComboBox", "AXWebArea"].includes(n.role));

async function keys(list) {
  const w = await mainWindow();
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

/**
 * Click a control by its visible label.
 *
 * A ref is only valid for the outline that produced it, and this app re-renders
 * its sidebar on hover and on route settle — so a ref resolved from one outline
 * can already be stale by the time the click is dispatched. That is what killed
 * the Security capture. The fix is to re-read the outline and retry rather than
 * to sleep longer: the race is not about elapsed time, it is about whether the
 * tree changed between the read and the click.
 */
async function clickLabel(label, attempts = 3) {
  let last;
  for (let i = 0; i < attempts; i++) {
    const w = await mainWindow();
    const r = await b.outline(w.windowId, { maxDimension: 1600 });
    const hits = byLabel(r.outline, label);
    if (!hits.length) { last = new Error(`not found: ${label}`); await b.sleep(600); continue; }
    const target = hits[hits.length - 1];
    try {
      await b.clickRef(PID, target.ref);
      return target;
    } catch (e) {
      /* Retry only the stale case. Anything else is a real failure and must not
         be retried into looking like a success. */
      if (!/stale/i.test(e.message)) throw e;
      last = e;
      await b.sleep(500);
    }
  }
  throw last ?? new Error(`could not click: ${label}`);
}

async function dismiss() {
  await focus();
  for (let i = 0; i < 3; i++) { await keys(["Escape"]).catch(() => {}); await b.sleep(280); }
}

/**
 * Capture one surface: PNG from the bridge, trimmed to the window's measured
 * bounds, written as JPEG (the bytes the bridge returns are JPEG whatever the
 * extension says).
 */
async function capture(name, out) {
  const w = await mainWindow();
  const raw = path.join(TMP, `${name.replace(/\//g, "__")}-raw.jpg`);
  await b.shot(w.windowId, raw);
  const box = windowBox(raw, w.framePoints);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  execFileSync("sips", [
    "--cropOffset", String(box.y), String(box.x),
    "-c", String(box.height), String(box.width),
    "-s", "format", "jpeg", "-s", "formatOptions", "82",
    raw, "--out", out,
  ], { stdio: "ignore" });
  return { out, box, bytes: fs.statSync(out).size };
}

async function step(name, fn, outFile) {
  const rec = { name, at: new Date().toISOString() };
  try {
    await focus();
    const before = path.join(TMP, `${name}-before.jpg`);
    await b.shot((await mainWindow()).windowId, before);
    const beforeHash = b.digest(before);

    rec.detail = (await fn()) ?? null;
    await b.sleep(1400);

    const after = path.join(TMP, `${name}-after.jpg`);
    await b.shot((await mainWindow()).windowId, after);
    if (b.digest(after) === beforeHash) throw new Error("no visual change — control did not engage");

    const cap = await capture(name, outFile ?? path.join(OUT, `${name}.jpg`));
    rec.box = cap.box;
    rec.coverage = Number(cap.box.coverage.toFixed(3));
    rec.bytes = cap.bytes;
    rec.ok = true;
  } catch (e) {
    rec.ok = false;
    rec.error = e.message;
  }
  results.push(rec);
  const note = rec.ok ? `${String(rec.bytes).padStart(6)}B cov=${rec.coverage}` : `— ${rec.error}`;
  console.log((rec.ok ? "OK   " : "MISS ") + name.padEnd(22) + note);
  return rec;
}

/* ── the surface list ───────────────────────────────────────── */

const only = process.argv.slice(2);
const want = (n) => !only.length || only.some((o) => n === o || n.startsWith(o + "-"));

const original = (await mainWindow()).framePoints;
console.log(`window was ${original.w}x${original.h} at (${original.x},${original.y})`);
console.log(`resizing to ${WIN_W}x${WIN_H} for capture\n`);

const PLAN = [
  // sidebar destinations and overlays
  ["01-sidebar-home",    async () => { await dismiss(); await clickLabel("New chat"); }],
  ["02-scheduled",       async () => { await dismiss(); await clickLabel("Scheduled"); }],
  ["03-pull-requests",   async () => { await dismiss(); await clickLabel("Pull requests"); }],
  ["04-plugins",         async () => { await dismiss(); await clickLabel("Plugins"); }],
  ["05-security",        async () => { await dismiss(); await clickLabel("Security"); }],
  ["06-explore",         async () => { await dismiss(); await clickLabel("Explore"); }],
  ["07-command-palette", async () => { await dismiss(); await keys(["meta", "k"]); }],
  /* The palette's own filter modes. Each is the palette plus a typed prefix, so
     the palette must be open first — dismissing between them would close it. */
  ["08-palette-chats",   async () => { await dismiss(); await keys(["meta", "k"]); await b.sleep(500); await keys(["c", "h", "a", "t"]); }],
  ["09-palette-panels",  async () => { await dismiss(); await keys(["meta", "k"]); await b.sleep(500); await keys(["p", "a", "n", "e", "l"]); }],
  ["10-palette-settings",async () => { await dismiss(); await keys(["meta", "k"]); await b.sleep(500); await keys(["s", "e", "t", "t"]); }],
  ["11-quick-chat",      async () => { await dismiss(); await keys(["Alt", "Meta", "n"]); }],
  // thread + panels
  ["19-thread-open",     async () => { await dismiss(); await clickLabel("New chat"); }],
  ["20-panel-review",    async () => { await dismiss(); await keys(["Control", "Shift", "g"]); }],
  ["21-panel-terminal",  async () => { await dismiss(); await keys(["Control", "`"]); }],
  ["22-panel-browser",   async () => { await dismiss(); await keys(["Meta", "t"]); }],
  ["23-panel-files",     async () => { await dismiss(); await keys(["Meta", "p"]); }],
  ["24-panel-sidechat",  async () => { await dismiss(); await keys(["Control", "Shift", "c"]); }],
  /* Settings as a full-page route rather than a section: captured from the
     thread surface so the route transition itself is what changes the frame. */
  ["25-settings-open",   async () => { await dismiss(); await keys(["Meta", ","]); }],
  ["26-settings-search", async () => { await dismiss(); await keys(["Meta", ","]); await b.sleep(1200); await keys(["g", "i", "t"]); }],
];

await resize(WIN_W, WIN_H);
for (const [name, fn] of PLAN) if (want(name)) await step(name, fn);

/* Settings pages: open settings, click each section. */
const SECTIONS = [
  ["01-general", "General"], ["02-import", "Import"], ["03-profile", "Profile"],
  ["04-appearance", "Appearance"], ["05-voice", "Voice"], ["06-configuration", "Configuration"],
  ["07-personalization", "Personalization"], ["08-pets", "Pets"],
  ["09-keyboard-shortcuts", "Keyboard shortcuts"], ["10-usage-billing", "Usage & billing"],
  ["11-analytics", "Analytics"], ["12-account", "Account"],
  ["13-computer-use", "Computer use"], ["14-computer-history", "Computer history"],
  ["15-appshots", "Appshots"], ["16-plugins", "Plugins"], ["17-browser", "Browser"],
  ["18-hooks", "Hooks"], ["19-connections", "Connections"], ["20-git", "Git"],
  ["21-environments", "Environments"], ["22-worktrees", "Worktrees"],
  ["23-archived-chats", "Archived chats"],
];

if (want("settings")) {
  const sdir = path.join(OUT, "settings");
  fs.mkdirSync(sdir, { recursive: true });
  for (const [slug, label] of SECTIONS) {
    await step(`settings/${slug}`, async () => {
      await dismiss();
      await keys(["Meta", ","]);
      await b.sleep(1300);
      const hit = await clickLabel(label);
      await b.sleep(1100);
      return { label, ref: hit.ref };
    }, path.join(sdir, `${slug}.jpg`));
  }
}

/* Restore the window the way we found it. */
await resize(original.w, original.h);
console.log(`\nrestored window to ${original.w}x${original.h}`);

fs.writeFileSync(path.join(OUT, "recapture-results.json"),
  JSON.stringify({ pid: PID, at: new Date().toISOString(), window: original, target: { w: WIN_W, h: WIN_H }, results }, null, 2));
const ok = results.filter((r) => r.ok).length;
const cov = results.filter((r) => r.ok).map((r) => r.coverage);
console.log(`${ok}/${results.length} captured`);
if (cov.length) console.log(`coverage min=${Math.min(...cov)} max=${Math.max(...cov)} (1.0 = no desktop in frame)`);
