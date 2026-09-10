# Codex(ChatGPT) Desktop App DeepWiki — workbench architecture

> Generated from the committed research model. Update with `npm run docs:build`; verify with `npm run docs:check`.

## Build contract

`scripts/build-atlas.mjs` validates the committed model and original input digests, builds the React client and server renderer, pre-renders nine HTML pages, prepares Shiki snippets, copies local fonts/logos/captures and writes a build manifest. The installed app and OSS checkout are only inputs to the separate research command.

| Interface | Meaning |
| --- | --- |
| `SourceRef` | File, revision/digest, locator, excerpt and source kind |
| `AtlasNode` / `AtlasRelation` | Stable entities and explicit relationships with inference markers |
| `Finding` | Bilingual finding, supporting sources and interpretation limits |
| `Scenario` | Ordered explanatory steps and their source records |
| `PageData` | Static initial data plus locally loaded evidence/file indexes |

## Interaction contract

- Desktop graphs use React Flow 12. Static diagrams provide pre-rendered and no-JavaScript reading; narrow screens begin with a navigable list.
- Graph controls expose zoom, fit, 100% reading, minimap and fullscreen. Fullscreen and panel resizing trigger viewport fitting.
- Core, Cloud and Shell have semantic colors for nodes and edges in both themes. Dashed analytical relations remain distinct from declared direction/imports.
- Every code block has syntax highlighting and a copy button; clicking code copies its displayed excerpt. Selection and source-link clicks are excluded. Clipboard failure is visible.
- The URL stores search, filters, graph scope and selected records. Existing `#cap-*` anchors remain supported.
- Source excerpts and the full file index load from local static files. Ordinary browsing makes no external service calls.

## Typography and branding

IBM Plex serves Latin editorial, UI and code roles; self-hosted Noto Sans SC provides consistent Chinese headings and controls. The official ChatGPT header mark and Codex CLI surface icon were extracted from the official app page, with their geometry unchanged. The favicon uses the ChatGPT mark with a theme-aware color treatment. Resource provenance is in `web/assets/logos/provenance.json`.

## Validation

Model tests verify source digests, complete inventories, reference integrity, syntax extraction, import resolution and deterministic layouts. Browser tests cover the full locale/theme/viewport matrix and interactive paths. In particular, edge SVGs must have nonzero viewports: a global SVG max-width rule must never collapse XYFlow's overflowing edge layer.

[Deployment](deployment.md) · [Main README](../README.md)
