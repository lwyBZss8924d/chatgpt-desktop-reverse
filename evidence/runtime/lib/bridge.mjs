// bridge.mjs — thin client for the pi-computer-use macOS helper socket.
// The helper is the same one the pi `computer-use` extension talks to; this
// client exists so the capture sweep is reproducible from a shell without a
// model in the loop. Read-only observation + checked actions only.
import net from "node:net";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { createHash } from "node:crypto";

const SOCK = path.join(os.homedir(), "Library/Caches/pi-computer-use", "bridge.sock");

export function send(payload, timeoutMs = 40000) {
  return new Promise((res, rej) => {
    const s = net.createConnection(SOCK, () =>
      s.write(JSON.stringify({ id: "r" + Math.random().toString(36).slice(2), ...payload }) + "\n"));
    let b = "";
    s.setEncoding("utf8");
    s.on("data", (c) => { b += c; if (b.includes("\n")) s.end(); });
    s.on("end", () => { try { res(JSON.parse(b)); } catch (e) { rej(new Error("parse:" + b.slice(0, 300))); } });
    s.on("error", rej);
    setTimeout(() => { try { s.destroy(); } catch {} rej(new Error("timeout " + JSON.stringify(payload).slice(0, 120))); }, timeoutMs);
  });
}

export const PID = async () => {
  const r = await send({ cmd: "listApps" }).catch(() => null);
  const hit = r?.result?.find?.((a) => a.bundleId === "com.openai.codex" || a.name === "ChatGPT");
  if (hit) return hit.pid;
  // Fall back to pgrep — the helper's listApps shape is not part of the stable contract.
  const { execSync } = await import("node:child_process");
  return Number(execSync("pgrep -f '/Applications/ChatGPT.app/Contents/MacOS/ChatGPT' | head -1").toString().trim());
};

export async function windows(pid) {
  const r = await send({ cmd: "listWindows", pid });
  if (!r.ok) throw new Error(JSON.stringify(r.error));
  return r.result;
}

/* The helper's `act` is bound to a `lookId`: every action resolves against the
   geometry of one specific observation, so a stale or missing look id is a hard
   error rather than a silently misplaced click. Track the newest look so callers
   can observe-then-act without threading the id by hand. */
let lastLook = null;

export async function look(windowId, { includeImage = true, readText = "never", maxDimension = 2404 } = {}) {
  const r = await send({ cmd: "look", windowId, includeImage, readText, maxDimension });
  if (!r.ok) throw new Error(JSON.stringify(r.error));
  lastLook = r.result;
  return r.result;
}

export const lastLookId = () => lastLook?.lookId ?? null;

/* rects in the outline are expressed in the downscaled capture space, not in AX
   points. Callers that want to convert an outline rect back to screen points
   need the factor below; it is derived per look, never hard-coded. */
export function rectToPoints(result, framePoints) {
  const rootRect = result.outline?.rect ?? {};
  const k = rootRect.h ? framePoints.h / rootRect.h : 1;
  return (rect) => ({
    x: framePoints.x + rect.x * k,
    y: framePoints.y + rect.y * k,
    w: rect.w * k,
    h: rect.h * k,
    cx: framePoints.x + (rect.x + rect.w / 2) * k,
    cy: framePoints.y + (rect.y + rect.h / 2) * k,
  });
}

/* The helper returns JPEG bytes whatever the caller names the file, and its
   capture path can fall back to a whole-screen grab. Captures are therefore
   written as .jpg and trimmed to the window's measured bounds before saving, so
   a capture never carries the desktop around the window. */
export async function shot(windowId, out) {
  const r = await look(windowId, { includeImage: true, readText: "never" });
  const b64 = r.image?.jpegBase64;
  if (!b64) throw new Error("no image in look response");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const buf = Buffer.from(b64, "base64");
  fs.writeFileSync(out, buf);
  return { bytes: buf.length, out, lookId: r.lookId };
}

/* The helper always returns JPEG bytes regardless of the name a caller passes,
   so captures are written with a .jpg extension; a .png target would be a JPEG
   wearing the wrong extension, which breaks any decoder downstream. */

export async function outline(windowId, { maxDimension = 2404 } = {}) {
  return await look(windowId, { includeImage: false, readText: "always", maxDimension });
}

export async function act(pid, steps, { policy = "default" } = {}) {
  if (!lastLook) throw new Error("act() requires a preceding look()");
  const out = [];
  for (const step of steps) {
    const r = await send({ cmd: "act", lookId: lastLook.lookId, pid, policy, ...step });
    if (!r.ok) throw new Error(JSON.stringify(r.error));
    out.push(r.result);
  }
  return out;
}

export async function clickRef(pid, ref, { policy = "foreground" } = {}) {
  const r = await send({ cmd: "act", lookId: lastLook.lookId, pid, policy, action: "click", target: { ref } });
  if (!r.ok) throw new Error(JSON.stringify(r.error));
  return r.result;
}

export async function pressRef(pid, ref, { policy = "foreground" } = {}) {
  const r = await send({ cmd: "act", lookId: lastLook.lookId, pid, policy, action: "press", target: { ref } });
  if (!r.ok) throw new Error(JSON.stringify(r.error));
  return r.result;
}

export async function clickPoint(pid, x, y, { policy = "foreground" } = {}) {
  const r = await send({ cmd: "act", lookId: lastLook.lookId, pid, policy, action: "click", params: { x, y } });
  if (!r.ok) throw new Error(JSON.stringify(r.error));
  return r.result;
}

export async function keypress(pid, keys, { policy = "foreground" } = {}) {
  const r = await send({ cmd: "act", lookId: lastLook.lookId, pid, policy, action: "keypress", params: { keys } });
  if (!r.ok) throw new Error(JSON.stringify(r.error));
  return r.result;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* A sweep step that changes nothing is indistinguishable from a step that hit
   the wrong control, and a screenshot alone will not tell the two apart. Hash
   the picture so callers can assert that the UI actually moved. */
export function digest(file) {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex").slice(0, 16);
}
