# Deployment and CI/CD

> Generated from the committed research model. Update with `npm run docs:build`; verify with `npm run docs:check`.

| Setting | Value |
| --- | --- |
| GitHub | https://github.com/lwyBZss8924d/chatgpt-desktop-reverse |
| Vercel scope | `<VERCEL_SCOPE>` |
| Project | codex-desktop-deepwiki |
| Production URL | https://codex-desktop-deepwiki.vercel.app |
| Production branch | main |
| Install | `npm ci --ignore-scripts` |
| Build | `npm run ci` |
| Output | `site/` |
| Node.js | 24 |

## Delivery flow

Push changes to a feature branch and open a pull request against main. GitHub CI validates types, research inputs, the static build, document links and browser behavior. Vercel Git integration builds a branch preview. Merge after both checks pass; the main commit automatically triggers production delivery to the URL above. The deployment build generates pages before validating their document links, so it works without a prebuilt site directory.

The local research archive preserves original screenshots and prior research commits. The public repository contains the current source, normalized evidence and real screenshots with privacy mosaics. Keep these Git histories separate: update public code through its own clone and pull requests. For a new research snapshot, run the export command below from the local research checkout, review the publication diff, then build and test it before pushing. Do not push the archive history into the public remote.

```bash
# Run only when exporting a new snapshot from the local research archive.
node scripts/export-public.mjs --out /path/to/publication-checkout
```

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
