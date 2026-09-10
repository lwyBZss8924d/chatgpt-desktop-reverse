# Codex(ChatGPT) Desktop App DeepWiki

An independent engineering analysis workbench for the macOS ChatGPT (Codex) desktop application. Follow a GUI surface through its domain, Electron bridge, Rust protocol or Cloud interface to the source evidence.

[GitHub](https://github.com/lwyBZss8924d/chatgpt-desktop-reverse) · [Official app documentation](https://learn.chatgpt.com/docs/app) · [中文](README_Zh.md)

App archive: **26.903.61454**. OSS reference: [`ddea03ad049142943bdbf13e937b1d67e8c1ba0c`](https://github.com/openai/codex/tree/ddea03ad049142943bdbf13e937b1d67e8c1ba0c). The app binary's exact equivalence to that OSS revision is **unverified**.

> Public edition: these are real captures with privacy mosaics. Original images and historical research remain in the local archive.

## Build and open

Use Node.js 24 and npm. A clean checkout builds from committed artifacts; it does not need the installed app, a temporary extraction, a Rust checkout, or API credentials.

```bash
npm ci
npm run typecheck
npm test
npm run docs:check
npm run build
python3 -m http.server 8000 --directory site
# http://localhost:8000/
```

For React development with hot updates, run `npm run dev` (port 8000; override with `npm run dev -- --port 8001`). Interactive browsing uses HTTP. Pre-rendered text and diagrams remain readable without JavaScript.

## The nine-page workbench

| Page | What to explore |
| --- | --- |
| [Research atlas](site/index.html) | Follow a feature from the interface to its implementation, then inspect the evidence. |
| [Execution map](site/three-way.html) | Separate domain grouping from the actual direction of calls. |
| [Rust core API](site/core-api.html) | Explore all four channels, their data structures and pinned source definitions. |
| [Cloud API](site/cloud-api.html) | Trace client calls, route rewriting and service boundaries inside the shipped bundle. |
| [Electron shell](site/shell.html) | Inspect the bridges between rendered UI, native windows and subprocesses. |
| [Feature graph](site/features.html) | Explore bounded contexts, capabilities, commands and the surfaces that expose them. |
| [GUI map](site/gui-map.html) | Navigate archived captures, entry paths and thread-scoped surfaces. |
| [Bundle explorer](site/bundle.html) | Move from the file census into imports, interface references and evidence-backed findings. |
| [Method & evidence](site/method.html) | See how sources become claims, what was observed, and what remains unknown. |

The workbench uses React, TypeScript and Vite, with React Flow 12 (`@xyflow/react`), deterministic ELK layouts and build-time Shiki highlighting. Graphs have pan/zoom, fit, 100% reading, minimaps, fullscreen and relationship highlighting. Code blocks copy on click and provide an explicit copy button. Search, filters and selected records have deep links.

English and Chinese share the same data. English documents have no suffix; Chinese documents use `_Zh`. Latin typography uses IBM Plex and Chinese UI uses self-hosted Noto Sans SC. Official SVG geometry is preserved in `web/assets/logos/`, with provenance from the official app page.

## Snapshot and coverage

| Measure | Value |
| --- | --- |
| Package files / unpacked bytes | 8,967 / 312.30 MB |
| JavaScript files parsed | 7,262 / 7,262 |
| Import references / dynamic imports | 26,219 / 4,343 |
| Core methods / archived literal matches | 191 / 184 |
| Cloud paths / original baseline | 350 / 343 |
| Desktop IPC channels | 22 |
| Command keys / locales | 192 / 64 |
| Archived captures / matching recapture receipts | 42 / 23 |

Protocol declarations, bundle literals, static call sites, captured UI and analytical mappings are independent evidence types. A literal or call expression does not prove execution. A screenshot proves appearance, not a complete workflow. Domain associations do not automatically establish dependencies.

The original 7,981 renderer assets and the 8,967-file package census use different scopes. The larger census includes main-process files, dependencies, locales and package metadata. Import resolution distinguishes exact files, CommonJS resolution, filename candidates and external packages. Counts are not traffic, popularity or runtime memory metrics.

## Repository map

| Path | Purpose |
| --- | --- |
| `web/` | React pages, shared controls, graph rendering, design tokens and official logo assets |
| `site/` | Generated static deployment artifact: nine HTML pages and local assets |
| `scripts/build-atlas.mjs` | Validated static build and screenshot mirroring |
| `scripts/build-research-model.mjs` | Read-only enrichment of a fixed extracted snapshot and pinned OSS source |
| `evidence/static/atlas-model.json` | Normalized nodes, relations, source excerpts, interface structures and findings |
| `evidence/static/*-model.json` | Original scans retained as baseline inputs |
| `evidence/runtime/shots/` | Archived images and the available recapture receipt |
| `tests/` | Model, source, layout and browser validation |
| `vercel.json`, `.github/workflows/ci.yml` | Vercel static-build configuration and CI validation |

## Analysis documents

- [Feature graph](docs/codex-desktop-feature-map.md)
- [Structural GUI map](docs/codex-desktop-gui-map.md)
- [GUI capture evidence](docs/codex-desktop-gui-map-evidence.md)
- [Capture method and corrections](docs/codex-desktop-runtime-evidence.md)
- [Workbench architecture](docs/workbench.md)
- [Deployment and CI/CD](docs/deployment.md)

## Refresh the research deliberately

The enrichment command validates the archived app version and main-bundle digest before scanning. It reads the OSS revision through Git objects, without switching the source checkout. It never runs shipped JavaScript or modifies the installed application.

```bash
npm run research -- --snapshot /path/to/extracted-app --repo /path/to/codex --ref ddea03ad049142943bdbf13e937b1d67e8c1ba0c
npm run docs:build
npm run docs:check
npm run build
```

The legacy structural scanners remain available for reproducing the original scans. Ordinary builds do not run them or recapture a newer installed app. The skin project `heige-codex-skin-studio` is not a build dependency.

## Validation and limits

```bash
npm run typecheck
npm test
npm run docs:check
npm run build
npm run test:e2e
```

Browser validation covers nine pages, EN/ZH, light/dark and 1440/1024/768/390px widths, plus code copying, source inspection, graph controls, fullscreen, right-panel geometry, URL restoration, capture navigation, subpath hosting and no-JavaScript reading. It uses an isolated copy of the built site and records the tested build identity in `test-results/`.

The 42 images are retained, but the current recapture receipt has 23 settings results. Scheduled, Pull requests, Security and Explore were not walked end to end; side-chat sending was not exercised. There are no source maps in the extracted snapshot. Dynamic runtime values, live responses and binary-to-source equivalence remain separate research gaps.
