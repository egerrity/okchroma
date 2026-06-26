# OKChroma

A deterministic color engine that turns any brand hex (plus an optional
secondary) into a complete, WCAG-compliant design system — primitives,
semantic tokens, signal handling, dark mode, and illustration palettes.

**The promise:** for ANY hex, the outcome is one of three things —
*recommended* (engine-adjusted), *shifted* (a documented, human-gated
adjustment), or *exact* (the untouched hex with component-level rules).
No per-brand tuning, no rigs at onboarding time.

## Quick start

```bash
npm install
npm run build     # generate tokens (dist/*.css) + bundle the demo
npx serve .       # any static server; open /demo/index.html
```

Demo views: **Custom theme** (live hex input — paste any color, see the
full system) · **Example palettes** (curated set exercising every
archetype and edge case) · **Documentation** (coming soon).

## Architecture (three layers)

1. **Generated primitives** — `dist/brands.css` (`--brand-N`, `--accent-N`,
   `--illus-*` under `[data-brand="slug"]`, dark via `[data-theme="dark"]`),
   `dist/signals.css`, `dist/neutral.css`. All output of the engine.
2. **Fixed semantic layer** — `tokens/semantic.css`. Role names → stop
   numbers. Never changes per brand.
3. **Components** — reference semantic vars only.

All rules live in `src/engine/resolveBrand()` — `src/build.ts` and the
demo's custom-theme view are renderers over the same engine + the shared
`src/engine/cssRender.ts`, so they ship identical CSS.

## The rules (each calibrated once with design, then hard-coded)

- **12-stop OKLCH ramp** anchored at the brand color (stop 9), stops
  luminance-equalized across hues on a ladder of contrast-grouping L
  targets (each step lands in its reserved-role grouping —
  backgrounds / borders / fills / text). Light
  1–8 chroma is saturation-preserving: C = brandSat × satFraction ×
  gamut-max at the stop's lightness (the gamut envelope is tiny near
  white, wide in the mid — that's the perceived quiet→vivid curve), with
  a banded luminance lift for yellows. Stops 11 and 12 are
  luminance-anchored dark with 4.5:1 / 7:1 floors against stop 2.
- **Signals** (error/warning/success/info) generated from canonical hexes
  through the same engine.
- **Collision system**: hue gate ±30° + OKLab ΔE between rendered fills,
  per mode. RED-side error colliders re-anchor to the dark archetype
  (rung 1); ORANGE-side keep their identity — separation comes from the
  uniform destructive component rule (outline in button groups, fill only
  alone/primary, icon required). Warning resolves binary: warm-yellow
  brands push it to LEMON, cool keep MACARONI.
- **Yellow torsion**: low-lightness stops of yellow-band brands rotate
  warm toward gold (sRGB's dark yellow is olive; dark gold is not).
- **Dark mode**: fills keep identity and only LIFT; black-first on-fill
  text; red colliders float to a pastel register.
- **Compliance ladder**: APCA picks on-fill polarity, WCAG bounds the
  pair — every fill passes WCAG 4.5:1 AND APCA Lc 45 in both modes, by
  construction. Exact mode skips this; that caveat is part of the
  exact-mode contract.
- **Escape hatches** per brand: `exact`, `archetypeOverride`.
- **Illustrations**: bespoke 4-slot ramp, legend-hex painting workflow
  in `src/illustration.ts`.

## QA

```bash
npm run audit     # parity metrics A–F + blessed-snapshot regression
npm run sweep     # 1800-color gamut totality: rules hold for ANY hex
npm run typecheck
```

The snapshot (`scripts/dark-audit-snapshot.json`) records every stop of
every approved scale; `npm run audit:bless` re-records it ONLY after
visual approval. Rule changes can't silently move an approved color.

## Data

`src/brands.ts` (curated example set covering all archetypes and edge
cases) · `src/secondaries.ts` (accent hexes per example brand).

## License

MIT — see [LICENSE](LICENSE).
