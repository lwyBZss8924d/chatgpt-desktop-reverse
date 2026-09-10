# Archived runtime evidence

> Generated from the committed research model. Update with `npm run docs:build`; verify with `npm run docs:check`.

The current site mirrors 42 JPG images from `shots/`: 19 application frames and 23 settings frames. `shots/recapture-results.json` contains 23 settings results. Image integrity and interaction success remain separate checks.

| Path | Purpose |
| --- | --- |
| `shots/`, `shots/settings/` | Archived frames used by the workbench |
| `recapture.mjs` | Historical change-detecting capture driver |
| `sweep*.mjs` | Earlier capture drivers retained for methodology |
| `lib/bridge.mjs` | Client for the macOS accessibility capture bridge |
| `.tmp/`, `.derived/` | Ignored scratch output |

A new capture run requires fresh window observation, valid macOS permissions and an explicitly versioned archive. Stored refs/coordinates must not be replayed as live addresses. The current site build, CI and deployment do not invoke these drivers or modify the installed app.

[Capture method and corrections](../../docs/codex-desktop-runtime-evidence.md) · [Complete GUI evidence](../../docs/codex-desktop-gui-map-evidence.md)
