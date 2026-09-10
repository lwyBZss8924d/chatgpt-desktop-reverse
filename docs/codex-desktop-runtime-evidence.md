# Runtime evidence — collection method and corrections

> Generated from the committed research model. Update with `npm run docs:build`; verify with `npm run docs:check`.

> Public edition: these are real captures with privacy mosaics. Original images and historical research remain in the local archive.

App archive: **26.903.61454**. OSS reference: [`ddea03ad049142943bdbf13e937b1d67e8c1ba0c`](https://github.com/openai/codex/tree/ddea03ad049142943bdbf13e937b1d67e8c1ba0c). The app binary's exact equivalence to that OSS revision is **unverified**.

## What the stored evidence contains

There are 42 archived JPG images: 19 application surfaces and 23 settings sections. The current receipt contains only the 23 settings results, with `ok` and coverage fields. It does not contain per-frame before/after hashes. The workbench computes and validates image digests for integrity, which is separate from proving the original interaction.

The recorded application was `/Applications/ChatGPT.app`, bundle ID `com.openai.codex`, process name `ChatGPT`. Old window IDs, accessibility refs and coordinates are observations from those captures, not reusable control addresses.

## Driver behavior

The archived driver `evidence/runtime/recapture.mjs` observes the window, addresses a control, captures before/after frames and rejects a byte-identical result. It writes a receipt for the selected steps of that invocation. A driver supporting all surfaces does not mean its latest receipt contains all surfaces.

The earlier `sweep*.mjs` files and legacy capture sets are retained as history. They are not run by `npm run build`, CI or Vercel. Recollection needs a deliberately versioned archive and fresh observation of the actual installed build.

## Corrections worth preserving

| Failure | Correction |
| --- | --- |
| An unchanged screenshot was counted as success | Capture return alone is insufficient; compare the before/after frames. |
| Shortcuts were guessed | Read the bindings advertised by the UI. |
| Panels were opened outside a thread | Respect the conversation scope and observe the mounted surface. |
| Keystrokes had no target | Address input against a fresh observation. |
| Image coordinates were treated as screen points | AX rectangles belong to the associated capture coordinate system. |

| Panel | Recorded binding |
| --- | --- |
| Review | `⌃⇧G` |
| Terminal | `` ⌃` `` |
| Browser | `⌘T` |
| Files | `⌘P` |

Quick chat was recorded with `⌥⌘N` and the palette with `⌘K`. These describe the archived observation, not a current-build guarantee.

## Evidence boundaries

Protocol declarations, bundle literals, static call sites, captured UI and analytical mappings are independent evidence types. A literal or call expression does not prove execution. A screenshot proves appearance, not a complete workflow. Domain associations do not automatically establish dependencies.

[Complete capture inventory](codex-desktop-gui-map-evidence.md) · [Method in the workbench](../site/method.html)
