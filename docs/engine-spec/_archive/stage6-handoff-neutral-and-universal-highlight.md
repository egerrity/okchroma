# Handoff — generated neutral + universal highlight rule (Stage 6)

Start here. Today's session pivoted a lot before converging; this is the clean entry point.
Everything below is **decided and owner-approved via read-only previews**. **No engine or demo
code has changed** — the working tree is clean at `1584cd6` on branch `scope/engine-spec`
(do NOT merge to `main`). The whole exploration was throwaway scripts + chat previews.

## The two objectives (both designed, neither implemented)

1. **Generate the neutral** from the brand hue instead of assigning Radix families.
2. **Make the highlight ONE universal rung rule** across every ramp (the original Stage-5 goal).

## Read first (memory)

`[[neutral-generation-from-brand-hue]]` (the live project + the approved curve),
`[[explain-before-engine-changes]]` (process rule — see below), `[[no-corrective-patch-layers]]`,
`[[engine-color-rules]]`, `[[product-boundary-and-identity-naming]]`, `[[engine-spec-effort]]`.

## PROCESS RULES (these caused real friction today — honor them)

- **Before ANY engine add/change/subtract: explain exactly what, where, and how, then WAIT for
  the owner's explicit "go."** Do not make engine/design decisions unilaterally. Twice today an
  agent unilaterally picked neutral role values (near-black cta; archetype highlight) — both
  wrong, both the owner's call.
- **Reuse the generator; do NOT reinvent.** "Duplicate the secondary generator" = call
  `generateScale` and add only the one new thing. The highlight rung and the cta archetype
  already exist in it — don't rebuild them.
- **Provenance honesty:** commits authored by `egerrity` in these sessions are made by the agent
  under the owner's git identity. Don't present prior-session code as the owner's deliberate
  design; show it exists and is callable, let the owner judge.
- **Read-only previews need no permission** — just run them and show the output.
- Roles, never stop numbers. Product = engine + output; demo is a preview. Re-bless blessed
  snapshots only with owner visual approval.

## DECISION 1 — the universal highlight rule (SETTLED)

> **One rung, zero exceptions.** Every highlight — brand, secondary, neutral, all 4 signals,
> both modes — is the SAME `generateScale` rung. It is a **predictable VALUE, not the vivid
> color**: it lands at **L ≈ 0.55–0.59** (between `accent-8` 0.738 and `ink-alt` 0.53) and
> **holds white**. The bright/vivid color lives in the **cta**.

- **The rung already exists** and is correct: `colorEngine.ts:606–654` (the `if (opts?.highlight)`
  block), anchored at `HIGHLIGHT_LIGHT.rootL = 0.62` (`stopTable.ts:49`), darkens L to the
  white-4.6 edge via `findLForContrast`. Its fixed chroma (`HIGHLIGHT_LIGHT.baseC = 0.142`) is
  FINE — the slight desaturation is the POINT (a quiet consistent value). **Do NOT make the rung
  chroma hue-aware / "increase the chroma"** — that was a wrong detour today.
- **The one change: drop the `isYellow` guard** at `colorEngine.ts:629` so yellow also darkens to
  hold white (yellow highlight `#ffc53d`/black → `#ad6300`/white). This **supersedes
  `engine-color-rules`' "white-text-except-yellow"** → white-text ALWAYS for the highlight.
- **The cta holds the bright color.** Signals now have ctas (the bright alert fill), so the
  highlight is free to be the quiet value. Resolves the old "do signal cta/highlight differ?" →
  **yes: cta = bright fill, highlight = rung value.** This also dissolves the dark
  polarity-ladder worry (the bright dark fills are the cta's job, not the highlight's).

Approved preview values (the rung holding white, yellow dropped), both modes ≈ identical:

| ramp | light highlight | dark highlight |
|---|---|---|
| brand | `#bc5175` L0.581 | `#d92b75` L0.591 |
| red | `#ca4a44` L0.582 | `#d63e1e` L0.585 |
| yellow | `#ad6300` L0.570 | `#ac6300` L0.570 |
| green | `#008630` L0.539 | `#1f8739` L0.547 |
| info-color | `#7668c7` L0.574 | `#7862dc` L0.579 |

## DECISION 2 — generate the neutral (SETTLED)

Replace Radix families entirely. The neutral = **`generateScale` reused**, fed a faint gray at
the brand hue:
```
generateScale(<gray @ brandHue, C < HUE_NOISE_C (0.008) so the hue machinery stays quiet>,
              'neutral', 'light' /* archetype → the cta */,
              { chromaCurve, highlight: true, enforceOnFillContrast: true })
```
- **cta** = the `'light'` archetype fill (near-white button, dark text) — the generator already
  does this via `forcedArchetype`.
- **highlight** = the rung (per Decision 1).
- **tint** = the new `chromaCurve` option (below).
- **Three chroma LEVELS:** pure (curve → 0), default (the curve), branded (amplified peak).

### The approved chroma curve (derived from Radix's measured per-family C; ship-as-is)

Evaluate **by lightness** (build the 12 `(L, C)` points, interpolate at any role's L — covers the
cta and the rung-shifted highlight, which sit off the 12-step grid). Normalized shapes (peak=1.0
at step 9):
- **light:** `[0.108, 0.179, 0.253, 0.32, 0.45, 0.503, 0.599, 0.818, 1, 0.939, 0.841, 0.74]`
- **dark:** `[0.236, 0.229, 0.276, 0.394, 0.469, 0.551, 0.648, 0.859, 1, 0.94, 0.745, 0.195]`
  (dark text stop collapses to ~0.195 of peak; light keeps ~0.74 — the key split.)

**Per-HUE peak C** (interpolate around the wheel). Anchors `hue → light/dark`:
`sand 97 → 0.0102/0.0109 · olive 143 → 0.0119/0.0181 · slate 270 → 0.0165/0.0156 ·
mauve 301 → 0.0193/0.0172`. Constant fallback: light 0.0145, dark 0.0155. Excluded from the
canonical shape: `gray` (achromatic) and `sage` (outlier — its light ramp peaks at step 12).
Fit is ~0.003 C (sub-perceptual); a hue-dependent shoulder would tighten it but isn't needed.

## The `chromaCurve` option (the engine seam)

Chroma is set at ~10 `makeStop` sites in `generateScale` (stops 1–8, the fill, text stops, the
rung) plus the fill-polarity precompute (`fill9` ~line 389). Add
`chromaCurve?: (L, mode) => number` to `GenerateOptions`, a one-line helper
`cAt(L, mode, nativeC) = opts?.chromaCurve ? opts.chromaCurve(L, mode) : nativeC`, and wrap each
chroma argument with `cAt(...)`. `makeStop` already gamut-clamps. **When unset → byte-identical**
for brand/secondary/signals. Verified path: the real `generateScale` already produces the right
L-ladder, rung highlight, cta archetype, and polarities (proven via raw dumps this session); the
curve only overlays chroma.

## Implementation steps (each gated on explain-then-confirm)

1. **Drop `isYellow`** in the rung → universal highlight. *(Moves yellow-BRAND highlights →
   owner re-bless.)*
2. **Add `chromaCurve`** + a `neutralChromaCurve(hue, level)` builder (curve data → `stopTable.ts`
   or a small module); route the neutral through `generateScale` as above. Retire the bespoke
   `generateNeutralScale` body (`colorEngine.ts:726` — the `0.57` hardcode, old `NEUTRAL_TINT_CURVE`,
   fixed-gray cta).
3. **Route signals through the rung** (`highlight: true` in `resolve.ts:43` SIGNAL_SCALES),
   **retire green's `enforceWhiteFill`**, and give signals their **bright-fill cta** (= the
   canonical stop-9 alert color).
4. **Emission rewiring** — neutral becomes a **brand-kind** ramp (cta = stop 9, highlight = rung
   13/14): `figmaRender.ts` (drop the special `neutralGroup`/12-hex path), `cssRender.ts` (drop
   `neutralRadixCss`), `tokenNames.ts`, `build.ts` (per-brand neutrals), `demo/CustomTheme.tsx`
   (family picker → pure/default/branded level picker, drop `closestNeutralFamily`),
   `plugin/ui.ts`+`code.ts`. **Delete** `RADIX_NEUTRALS`/`closestNeutralFamily`/`NeutralFamily`
   (`src/radixNeutrals.ts`). Re-bless `highlight-snapshot.json` / dark-audit after confirming diffs.

## Verification

`npm run typecheck` · `audit` · `highlight-audit` · `figma:verify` · `plugin:build` must stay
green; existing brand/secondary output must be byte-identical until step 1 (then yellow-brand
highlight moves — re-bless). Demo: `npm run demo:build`, open `demo/index.html`, sweep hues ×
levels × light/dark; read computed `--neutral-*` / signal highlights via `preview_eval`; screenshot
for owner sign-off. Grep clean of `RADIX_NEUTRALS` / `closestNeutralFamily` / `radixNeutralCss`
when step 4 is done.

## What was wrong today (don't repeat)

- The highlight is a **value, not a color** — its desaturation is intended. Don't "increase chroma"
  or make the rung hue-aware.
- Don't give the highlight an **archetype**, don't bolt a **darken loop** — the rung IS the
  mechanism (it's a contrast solve, and the owner accepts it as the universal rule).
- cta = **`'light'` archetype**, not near-black.
- Confirm before engine edits; reuse `generateScale`, don't reinvent.
