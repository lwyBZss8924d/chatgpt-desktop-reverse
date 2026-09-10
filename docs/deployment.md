# Deployment and CI/CD

> Generated from the committed research model. Update with `npm run docs:build`; verify with `npm run docs:check`.

| Setting | Value |
| --- | --- |
| GitHub | https://github.com/lwyBZss8924d/chatgpt-desktop-reverse |
| Vercel scope | `<VERCEL_SCOPE>` |
| Project | codex-desktop-deepwiki |
| Production URL | Not deployed yet |
| Production branch | main |
| Install | `npm ci --ignore-scripts` |
| Build | `npm run ci` |
| Output | `site/` |
| Node.js | 24 |

## Delivery flow

The first local package is committed with a machine-readable Git PoUW note. Initialize the specified GitHub remote with the reviewed commit, then use a pull request for deployment integration changes. CI validates types, research inputs, documents, the static build and browser behavior. Vercel Git integration provides branch previews and production delivery from main.

The output preserves `.html` routes, relative local assets, subpath hosting and direct refresh. There is no application backend or required runtime secret. A Vercel project link and Git connection are deployment configuration; they do not alter the archived research snapshot.

## Verify the target before deployment

```bash
vercel project inspect --non-interactive
vercel --help
```

Run from the repository root and verify the owner/project. A missing link requires deliberate initialization of the intended project. Do not substitute another existing project. The local `.vercel/` directory is not committed.

## Checks and release evidence

The workflow stores browser verification and the built static site as CI artifacts. Release closeout records the exact Git commit, CI result, Vercel deployment and final URL in PoUW. Never describe a queued build or a failed deployment as a successful release.

Reference implementation: [codex-plugins-market-audit](https://github.com/lwyBZss8924d/codex-plugins-market-data) · [Published report](https://codex-chatgpt-plugins-index.vercel.app/report.html)
