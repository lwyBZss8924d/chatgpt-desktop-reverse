#!/usr/bin/env node
/**
 * scan-three-way.mjs — join the desktop app against its two backends.
 *
 * The question this answers is the one a feature graph alone cannot: for any
 * capability in the app, *who executes it*. There are exactly three answers,
 * and each is established differently:
 *
 *   core   the OSS Rust binary over stdio. Evidence: the method name appears
 *          both as a schema enum literal (scan-rust-core.mjs) and as a string
 *          in the shipped bundle. Both halves are required — a schema method
 *          absent from the bundle is capability the app declines to use.
 *   cloud  ChatGPT's backend over HTTPS. Evidence: a relative path passed to
 *          the typed HTTP client, which the renderer rewrites to a local
 *          same-origin proxy route before fetch.
 *   shell  the Electron main process itself. Evidence: a `codex_desktop:`
 *          IPC channel. Nothing in the Rust core can satisfy these; they are
 *          the desktop's own surface (windows, native menus, OS permissions).
 *
 * A capability may be backed by more than one — that overlap is the
 * interesting part, not noise, so it is recorded rather than collapsed.
 *
 * Usage
 *   node scripts/scan-three-way.mjs [--extracted /tmp/heige-re/extracted]
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const expand = (p) => p.replace(/^~/, homedir());

const EXTRACTED = resolve(expand(flag("extracted", "/tmp/heige-re/extracted")));
const OUT = resolve(expand(flag("out", join(ROOT, "evidence/static/three-way-model.json"))));
const RUST = join(ROOT, "evidence/static/rust-core-model.json");

for (const [label, p] of [["unpacked bundle", EXTRACTED], ["rust core model", RUST]]) {
  if (!existsSync(p)) { console.error(`${label} not found: ${p}`); process.exit(1); }
}

const rust = JSON.parse(await readFile(RUST, "utf8"));

/* ── read the bundle once ───────────────────────────────────────
   These files are single-line multi-megabyte bundles. Regex scanning them is
   fine; what is not fine is `grep -o` with a permissive pattern, which blows
   past ugrep's complexity limit on a 3MB line. Reading into memory and using
   anchored patterns avoids that entirely. */

function walk(dir, pred, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, pred, out);
    else if (pred(p)) out.push(p);
  }
  return out;
}

const mainFiles = walk(join(EXTRACTED, ".vite/build"), (p) => p.endsWith(".js"));
const rendererFiles = walk(join(EXTRACTED, "webview/assets"), (p) => p.endsWith(".js"));

console.log(`reading ${mainFiles.length} main-process and ${rendererFiles.length} renderer bundles`);

/** Concatenated text per layer, plus a per-file index so a hit can name its file. */
async function loadLayer(files) {
  const parts = [];
  for (const f of files) parts.push({ file: basename(f), text: await readFile(f, "utf8") });
  return parts;
}
const mainLayer = await loadLayer(mainFiles);
const rendererLayer = await loadLayer(rendererFiles);

const allText = [...mainLayer, ...rendererLayer];

/** Which files contain a literal. Returns [] when absent. */
function filesContaining(layer, needle) {
  return layer.filter((p) => p.text.includes(needle)).map((p) => p.file);
}

/* ── 1. core: schema methods actually present in the shipped app ── */

const coreMethods = [];
for (const [channel, c] of Object.entries(rust.channels)) {
  for (const e of c.entries) {
    /* Quoted match only. A bare `thread/start` would also hit a comment or a
       doc string; `"thread/start"` is a protocol literal the code sends. */
    const quoted = [`"${e.method}"`, `'${e.method}'`, `\`${e.method}\``];
    const inMain = quoted.flatMap((q) => filesContaining(mainLayer, q));
    const inRenderer = quoted.flatMap((q) => filesContaining(rendererLayer, q));
    coreMethods.push({
      method: e.method, domain: e.domain, channel, direction: c.direction,
      type: e.type, params: e.params,
      presentInApp: inMain.length + inRenderer.length > 0,
      inMain: [...new Set(inMain)], inRenderer: [...new Set(inRenderer)],
    });
  }
}

const corePresent = coreMethods.filter((m) => m.presentInApp);
const coreUnused = coreMethods.filter((m) => !m.presentInApp);

/* ── 2. shell: desktop-only IPC ─────────────────────────────── */

const IPC_RE = /codex_desktop:[a-zA-Z0-9_.:-]+/g;
const ipc = new Map();
for (const p of allText) {
  for (const m of p.text.matchAll(IPC_RE)) {
    const ch = m[0].replace(/[:.]+$/, "");
    if (!ipc.has(ch)) ipc.set(ch, new Set());
    ipc.get(ch).add(p.file);
  }
}
const ipcChannels = [...ipc.entries()].map(([channel, files]) => ({
  channel, suffix: channel.slice("codex_desktop:".length), files: [...files].sort(),
})).sort((a, b) => a.channel.localeCompare(b.channel));

/* ── 3. cloud: relative paths handed to the typed HTTP client ── */

/* Call-site anchored: a bare `/wham/tasks` string could be anything, but one
   passed to `.get(`/wham/tasks`)` is a request. The renderer rewrites these to
   a same-origin `/__codex-api/*` proxy route, so the literal is relative. */
const CLOUD_RE = /(?:safeGet|safePost|safePut|safePatch|safeDelete|\.get|\.post|\.put|\.patch|\.delete)\(\s*[`"'](\/[a-zA-Z0-9_./{}$-]{2,80})[`"'$]/g;
const cloud = new Map();
for (const p of rendererLayer) {
  for (const m of p.text.matchAll(CLOUD_RE)) {
    const path = m[1];
    if (!cloud.has(path)) cloud.set(path, new Set());
    cloud.get(path).add(p.file);
  }
}

/* First segment is the backend service: /wham/* is the Codex cloud task
   backend, /conversation/* the chat backend, /payments/* billing. */
const cloudPaths = [...cloud.entries()].map(([path, files]) => ({
  path, service: path.split("/")[1] ?? "(root)", files: [...files].sort().slice(0, 3),
})).sort((a, b) => a.path.localeCompare(b.path));

const cloudServices = {};
for (const c of cloudPaths) (cloudServices[c.service] ??= []).push(c.path);

/* ── 4. the join: capability → backing ──────────────────────── */

/* Each capability names the evidence that decides its backing. Written by hand
   because the grouping *is* the analysis; the counts under it are mechanical. */
const CAPABILITIES = [
  { id: "thread-lifecycle", title: "Thread lifecycle", zh: "会话生命周期",
    coreDomains: ["thread", "threadSection", "turn", "item"],
    cloudServices: ["conversation", "conversations", "stop_conversation", "f", "share", "export_doc", "projects", "pins", "task_suggestions", "system_hints", "sidebar"], ipc: [],
    note: "Local threads run entirely on the core. The cloud paths are the web-thread equivalent — a parallel implementation of the same idea, not a dependency of the local path." },
  /* Selected by channel, not domain: an approval request is defined by its
     direction (core → app, blocking) rather than by which noun it concerns.
     Its methods live in the `item` domain alongside ordinary streaming items,
     so a domain-only selector would file them under thread-lifecycle and this
     capability would read as almost empty. */
  { id: "approval", title: "Approval and permission gates", zh: "审批与权限闸门",
    coreDomains: ["permissionProfile", "autoApprovalReview"], coreChannels: ["serverRequests"],
    cloudServices: [], ipc: [],
    note: "The core refuses to act and asks the app: every method here is a blocking ServerRequest. Enforcement is core-only; the decision UI exists only in the desktop." },
  { id: "exec", title: "Command execution", zh: "命令执行",
    coreDomains: ["command", "process"], cloudServices: [], ipc: [],
    note: "Sandboxing and spawn live in the core. The desktop renders a terminal over it." },
  { id: "fs", title: "Filesystem and search", zh: "文件系统与搜索",
    coreDomains: ["fs", "fuzzyFileSearch"], cloudServices: ["files"], ipc: ["start-file-drag"],
    note: "Local file access is core-backed; the /files/library/* surface is a separate cloud file store." },
  { id: "extensions", title: "MCP, skills, plugins, hooks", zh: "扩展体系",
    coreDomains: ["mcpServer", "mcpServerStatus", "skills", "plugin", "hook", "hooks", "marketplace", "externalAgentConfig"], cloudServices: ["ps", "ecosystem", "aip"], ipc: ["mcp-app-sandbox-guest-message", "mcp-app-sandbox-host-message", "connect-app-host"],
    note: "The extension runtime is core-side; discovery/marketplace metadata and OAuth connector linking are cloud; the sandboxed app frame is Electron." },
  { id: "account", title: "Account, auth, entitlement", zh: "账号与授权",
    coreDomains: ["account"], cloudServices: ["accounts", "payments", "subscriptions", "credits", "me"], ipc: [],
    note: "The core holds the token and refreshes it; everything about who you are and what you may spend is cloud." },
  { id: "cloud-tasks", title: "Cloud tasks and code review", zh: "云任务与代码评审",
    coreDomains: ["review"], cloudServices: ["wham"], ipc: [],
    note: "The largest cloud-only surface: remote task execution, environments, GitHub integration, worktree snapshots. The core exposes review but not task orchestration." },
  { id: "browser", title: "Embedded browser and computer use", zh: "内嵌浏览器与计算机操作",
    coreDomains: [], cloudServices: ["flora"], ipc: ["browser-page-event", "browser-sidebar-runtime-message", "get-browser-webmcp-policy"],
    note: "No Rust core domain backs this. The browser is an Electron WebContentsView driven over IPC, with form-fill assistance from cloud." },
  { id: "shell-ui", title: "Windows, menus, OS integration", zh: "窗口与系统集成",
    coreDomains: [], cloudServices: [], ipc: ["show-context-menu", "get-system-theme-variant", "system-theme-variant-updated", "check-for-updates", "get-initial-sidebar-bootstrap", "message-for-view", "message-from-view", "remote-hosted-pip-video-frame"],
    note: "Entirely desktop-only. Nothing in the OSS core has a concept of a window, a native menu, or a system theme." },
  { id: "config", title: "Configuration and models", zh: "配置与模型",
    coreDomains: ["config", "configRequirements", "model", "modelProvider", "experimentalFeature", "app", "(lifecycle)"], cloudServices: ["models", "settings"], ipc: ["get-build-flavor", "get-shared-object-snapshot"],
    note: "Config resolution is core; model availability and user settings are read from cloud; build identity is desktop." },
  { id: "telemetry", title: "Telemetry and feedback", zh: "遥测与反馈",
    coreDomains: ["feedback"], cloudServices: ["statsig", "beacons"],
    ipc: ["get-sentry-init-options", "trigger-sentry-test", "get-fast-mode-rollout-metrics"],
    note: "Three independent pipelines that happen to share a purpose: core feedback submission, cloud experiment gating, and a desktop-only Sentry channel." },
  { id: "transport", title: "Renderer transport plumbing", zh: "渲染层传输管道",
    coreDomains: [], cloudServices: [], ipc: ["chunked-message-ack", "worker"],
    note: "Not a product capability — the message plumbing that carries the rest. Listed so the IPC inventory has no unexplained residue: payloads above Electron's structured-clone limit are chunked and acknowledged, and worker traffic is routed by prefix." },
  { id: "sandbox-windows", title: "Windows sandbox / remote control", zh: "沙箱与远程控制",
    coreDomains: ["windowsSandbox", "windows", "remoteControl", "project", "serverRequest"], cloudServices: [], ipc: [],
    note: "Present in the core protocol; the macOS build has no surface for the Windows-specific half." },
  { id: "memory", title: "Memory and personalization", zh: "记忆与个性化",
    coreDomains: [], cloudServices: ["memories", "personality_types", "personality_trait_types", "personality_settings_impression", "profiles", "unified_user_signals"], ipc: [],
    note: "Cloud-only. The OSS core has no memory concept — AGENTS.md is a file the core reads, not a service it calls." },
  { id: "agents", title: "Hosted agents and widgets", zh: "托管 Agent 与小组件",
    coreDomains: [], cloudServices: ["hermes", "gizmos", "gizmo_creators", "apps", "client_applications", "public-api", "paragen_submission"], ipc: [],
    note: "Cloud-only. Distinct from the core's subagent spawn: these run server-side with their own persistent folders." },
  { id: "automation", title: "Automations and scheduling", zh: "自动化与定时任务",
    coreDomains: [], cloudServices: ["automation", "automations", "notifications"], ipc: [],
    note: "Cloud-only. The Scheduled destination in the sidebar is backed here; nothing local schedules work." },
  /* `attestation/generate` is itself a blocking ServerRequest, so it is counted
     under approval rather than here — the core cannot attest without asking the
     desktop, which holds the DeviceCheck key. This capability is therefore the
     cloud half of that handshake. */
  { id: "trust", title: "Attestation and anti-abuse", zh: "设备认证与滥用防护",
    coreDomains: [], cloudServices: ["sentinel", "ios", "cyber_verification", "compliance", "legalapi", "report_flow"], ipc: [],
    note: "The cloud half of device trust. Its core counterpart, attestation/generate, is a blocking request the core makes *to* the desktop — counted under approval, because the desktop holds the DeviceCheck key the core cannot reach." },
  { id: "growth", title: "Pets, promotions, referrals", zh: "宠物与增长功能",
    coreDomains: [], cloudServices: ["pets", "hazelnuts", "promotions", "referrals", "gift-credits", "premium-usage", "checkout_pricing_config", "tpp", "celsius", "codex", "global", "workspace-resources", "user_system_messages", "plugins"], ipc: [],
    note: "Cloud-only surfaces with no core counterpart, grouped because they share that property rather than a domain." },
];

const byDomain = {};
for (const m of coreMethods) (byDomain[m.domain] ??= []).push(m);

const byChannel = {};
for (const m of coreMethods) (byChannel[m.channel] ??= []).push(m);

const capabilities = CAPABILITIES.map((c) => {
  /* A blocking approval request belongs to the approval capability and nowhere
     else, so domain selection skips that channel: without this, `item/*`
     approvals would also be counted under thread-lifecycle and both numbers
     would overstate. Channel selection below is what puts them back. */
  const fromDomains = c.coreDomains
    .flatMap((d) => byDomain[d] ?? [])
    .filter((m) => m.channel !== "serverRequests");
  const fromChannels = (c.coreChannels ?? []).flatMap((ch) => byChannel[ch] ?? []);
  /* Deduplicate: a method selected by both its domain and its channel must be
     counted once. */
  const methods = [...new Map([...fromDomains, ...fromChannels].map((m) => [m.method, m])).values()];
  const paths = c.cloudServices.flatMap((s) => cloudServices[s] ?? []);
  const channels = c.ipc.map((s) => `codex_desktop:${s}`).filter((ch) => ipc.has(ch));
  const backing = [methods.length && "core", paths.length && "cloud", channels.length && "shell"].filter(Boolean);
  return {
    ...c, backing,
    core: {
      total: methods.length,
      present: methods.filter((m) => m.presentInApp).length,
      methods: methods.map((m) => m.method).sort(),
      /* Per-method detail so a renderer can show direction and presence without
         re-joining against the protocol model. */
      detail: methods
        .map((m) => ({ method: m.method, channel: m.channel, direction: m.direction, presentInApp: m.presentInApp }))
        .sort((a, b) => a.method.localeCompare(b.method)),
    },
    cloud: { total: paths.length, paths: paths.sort() },
    shell: { total: channels.length, channels },
  };
});

/* Anything the mechanical scan found but no capability claimed. An unclaimed
   item is a hole in the hand-written grouping above, so it is reported rather
   than dropped.

   Core coverage is checked per *method*, not per domain: a capability may
   select by channel (approval does), so a domain can be fully claimed without
   appearing in any `coreDomains` list. Checking domains here reported
   `attestation` as unclaimed while its only method was in fact filed. */
const claimedMethods = new Set(capabilities.flatMap((c) => c.core.methods));
const claimedServices = new Set(CAPABILITIES.flatMap((c) => c.cloudServices));
const claimedIpc = new Set(capabilities.flatMap((c) => c.shell.channels));

const unclaimed = {
  coreMethods: coreMethods.map((m) => m.method).filter((m) => !claimedMethods.has(m)).sort(),
  cloudServices: Object.keys(cloudServices).filter((s) => !claimedServices.has(s)).sort(),
  ipcChannels: ipcChannels.filter((c) => !claimedIpc.has(c.channel)).map((c) => c.channel),
};

const model = {
  generatedFrom: {
    extracted: EXTRACTED,
    rustCore: { repo: rust.generatedFrom.repo, head: rust.generatedFrom.head },
    mainBundles: mainFiles.length, rendererBundles: rendererFiles.length,
    at: new Date().toISOString(),
  },
  totals: {
    coreMethods: coreMethods.length,
    coreMethodsPresentInApp: corePresent.length,
    coreMethodsUnused: coreUnused.length,
    ipcChannels: ipcChannels.length,
    cloudPaths: cloudPaths.length,
    cloudServices: Object.keys(cloudServices).length,
    capabilities: capabilities.length,
  },
  capabilities,
  core: { present: corePresent, unused: coreUnused },
  shell: { channels: ipcChannels },
  cloud: { services: Object.entries(cloudServices).map(([service, paths]) => ({ service, count: paths.length, paths: paths.sort() })).sort((a, b) => b.count - a.count), paths: cloudPaths },
  unclaimed,
};

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, JSON.stringify(model, null, 2));

console.log(`three-way model -> ${OUT}`);
console.log(`  core   ${corePresent.length}/${coreMethods.length} schema methods present in the shipped bundle`);
console.log(`  shell  ${ipcChannels.length} codex_desktop: IPC channels`);
console.log(`  cloud  ${cloudPaths.length} paths over ${Object.keys(cloudServices).length} services`);
for (const [k, v] of Object.entries(unclaimed)) if (v.length) console.log(`  unclaimed ${k}: ${v.length}`);
