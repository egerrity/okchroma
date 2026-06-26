# OKChroma Figma plugin

Generates a full Figma **variable** collection (brand + secondary + neutral + the four
signals, Light/Dark) from a single brand hex, using the same engine as the demo.

## Build

```bash
npm run plugin:build
```

Writes the loadable plugin to `plugin/dist/`:
- `plugin-code.js` — the Figma sandbox code (`plugin/code.ts`, bundled)
- `plugin-ui.html` — the UI (`plugin/ui-template.html` with `plugin/ui.ts` inlined)

`plugin/manifest.json` points Figma at those (`main` / `ui`).

## Load it in Figma

1. **Figma desktop** → **Plugins → Development → Import plugin from manifest…**
2. Select **`plugin/manifest.json`**.

It now lives under **Plugins → Development → OKChroma**.

- After a rebuild you **don't re-import** — Figma re-reads `dist/` on every run.
- For a truly clean slate (e.g. after renaming tokens), **remove the dev plugin and
  re-import**, and **apply to a fresh Figma file** — the plugin leaves any pre-existing
  `system/*` variables as-is, so old token names linger in old files.

## Use it

In the plugin UI: enter a **collection/brand name** + **primary hex** (optional accent,
neutral level, engine mode) → **Apply**.

## What it creates

Two variable collections (it owns them via plugin-data, so renames survive):

- **`mode`** — modes = **Light / Dark**. The raw primitives:
  - per-brand ramps `brand/<name>/<primary|secondary>/*`
  - shared neutral/signal ramps `system/<family>/<variant>/*`
  - `system/*` utilities — `paper-0` / `ink-13` (mode-FLIPPING scale anchors:
    white↔black by mode), `abs-white` / `abs-black` (mode-INVARIANT, for on-fills that
    never flip), `paper-0e` / `paper-2e` (mode-divergent card-elevation anchors —
    `paper-0e` raised = paper-0/neutral-paper-2, `paper-2e` sunken = its mirror),
    `transparent`, `scrim`.
- **`theme`** — modes = **one per brand**. Aliases (`brand/primary/*`, `neutral/*`,
  `red/*`, …) that point into the `mode` primitives, so switching the theme mode swaps
  the whole brand while Light/Dark stays on the `mode` axis.

A frame picks a mode from **each** collection independently (e.g. {Dark, Blueberry}) —
that's how `paper-0e` resolves to the active brand's dark neutral.

## Source

| File | Role |
|---|---|
| `plugin/code.ts` | sandbox: creates collections, variables, aliases |
| `plugin/ui.ts` | UI logic: reads inputs, runs the engine (`themeToFigma`), posts to the sandbox |
| `plugin/ui-template.html` | UI markup/styles (`__BUNDLE__` is replaced with the built `ui.ts`) |
| `plugin/manifest.json` | Figma entry points |

Build wiring lives in `esbuild.config.js` (the `--plugin` path).
