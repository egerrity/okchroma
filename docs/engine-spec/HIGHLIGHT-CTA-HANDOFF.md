# Handoff — the highlight + cta problems (next session)

> Written 2026-06-26 (branch `scope/helmk-curve`, about to merge to `main`). Pick this
> up in a fresh session, on a **new branch off `main`**, per the owner's plan: fix the
> highlight, merge down; the cta is the related second front.
>
> Companions: [`ENGINE-SPEC.md`](./ENGINE-SPEC.md) (vocabulary + deviation model),
> [`helmk-research.md`](./helmk-research.md) (why the curve exists).

## ⚠️ Read this first — the CATALOG is stale on these two

[`CATALOG.md`](./CATALOG.md) entries **C13 / C24 / C25 / C26** describe the *old*
`SHAPE_DARK` + `loudnessCap` dark machinery. **That machinery was replaced** by the
H-K perceptual curve (`src/engine/perceptualL.ts`) and the catalog was never
reconciled. Do **not** ground the highlight/cta fix in those entries — they describe
code that no longer runs. Treat this doc as the current truth; reconcile the catalog
as part of the work if you touch it.

## Current architecture (post-H-K migration)

The engine generates each ramp's stops in `src/engine/colorEngine.ts::generateScale`.
The migration was **asymmetric** — and that asymmetry is the whole story here:

| | LIGHT | DARK |
|---|---|---|
| **L (lightness)** | solved on the perceptual curve — `perceptualRungL(rootL, C, H)` per rung (stops 1–8 ~`:549`, highlight ~`:718`, text anchored) | **fixed blessed scaffold** `DARK_NEUTRAL_L[]` emitted directly (`:621`); highlight = fixed `HIGHLIGHT_DARK.rootL = 0.62` (`:731`) |
| **C (chroma)** | provisional `chromaAt(L)` then gamut-clamp | redistributed per hue — `perceptualDarkC(L,H,nativeC)` via `darkChromaCurve` |

So **light L is perceptual; dark L is a hand-blessed ladder.** `perceptualRungL` was
wired into the light path and `perceptualDarkC` into the dark *chroma* — but **dark L
was never brought onto the curve.** `KEEP_LIGHT` / `KEEP_DARK` in `perceptualL.ts`
are both `1.0` (keep-vibrancy; `0` = match-neutral) — the open target-level knob.

## Problem 1 — highlight doesn't fit the dark ladder

**Symptom (owner, eyeballing the demo):** in dark mode the highlight rungs (9/10) don't
sit where you'd expect between `accent-8` and `ink-11`; the ladder reads broken at the
highlight. In **light** it's fine — the light highlight is placed by `perceptualRungL`
(`:718`), so it's on the same curve as every other light rung.

**Root cause:** the dark highlight L is `HIGHLIGHT_DARK.rootL = 0.62`
(`stopTable.ts:49`), a fixed scaffold value — *not* derived from the dark ladder's
perceived-lightness progression. Same class of problem as the rest of the dark ladder
(fixed `DARK_NEUTRAL_L`), just most visible at the highlight because it's an emphasis
chip the eye lands on.

**Fix direction (not started):** bring **dark L onto the perceptual curve**, the way
light already is — derive `DARK_NEUTRAL_L` (and the dark highlight rung L) from the
same perceived-lightness target as light instead of the blessed constants. Then the
dark highlight falls where the curve puts it and the ladder is continuous in both
modes. The chroma side (`perceptualDarkC`) already works and shouldn't need to move.

**Where:**
- `colorEngine.ts` dark stop loop `~:614–633` (uses `DARK_NEUTRAL_L[i]` for L); dark
  highlight `~:727–733` (`placeLegibleRung(13, HIGHLIGHT_DARK.rootL, …)`).
- `stopTable.ts`: `DARK_NEUTRAL_L` (`:97`), `HIGHLIGHT_DARK` (`:49`), `HIGHLIGHT_LIGHT`
  (`:48`, the light analogue that works), `DARK_STOP_9_MIN_L`/`DARK_STOP_11/12`.
- `perceptualL.ts`: `perceptualRungL` (the light solver to mirror), `grayApparentL` /
  `solveLForApparent` (the primitives a dark-L solver would use), `KEEP_DARK`.

## Problem 2 — cta (the related second front)

The cta is **pinned off the perceptual curve** by design — it's the brand-identity
fill, placed at the archetype lightness, not a scale rung
(`classifyArchetype`/`medianLForArchetype`, `archetypes.ts`). Dark cta: L = `dark9L`
(the dark-ramp anchor, `colorEngine.ts:~605/629`), chroma = `brandC * darkCtaTrim(H)`
where `darkCtaTrim` is the surviving per-hue trim from the old `loudnessCap`
(`darkChromaCurve.ts:93`).

**It is currently UNTOUCHED and canary-protected** — see Guardrails. The open question
for the owner to pin down: *what is the cta defect exactly* — does cta need to join the
perceptual placement (so it sits coherently with the new dark ladder), is it a
contrast/legibility issue, or a hover (cta-1→cta-2) spacing issue? Document the precise
symptom at the start of the next session; the current state is captured here so you can
dive straight in.

## Guardrails — do NOT trip these silently

- **cta byte-identity canary** — `scripts/figma-verify.ts:60–61` asserts brand `cta-1`
  is `#07074f` (light) / `#869cda` (dark). This is *the proof the cta math is
  untouched.* If you intentionally change cta, update the canary **deliberately** (with
  a note + visual approval), never by reflex. If you're only fixing the highlight, the
  canary must stay green.
- **`npm run audit`** (dark-audit) — on-fill WCAG 4.5 + APCA. Known deferred: **D
  (dark text 11/12 separation)** sits small; not your target. Re-bless: `audit:bless`.
- **`npm run highlight-audit`** — highlight legibility + identity + neutral cta + on-text
  polarity. Re-bless: `highlight-audit:bless`.
- **`npm run smooth`** — monotonic/smoothness baseline. **Moving dark L WILL change
  smoothness across the fleet — that's expected, re-baseline after visual approval**
  (`smooth:baseline`), it is not a regression.
- **`npm run figma:verify`** — token export shape + the canary.
- **Re-bless discipline:** changing dark L moves *every brand's* dark stops. A full-fleet
  re-bless is **expected**, not a regression — but bless ONLY after visual approval, and
  review **dark mode on a DARK background** (memory `dark-mode-on-dark-bg`; the eye can't
  judge dark tokens on white).

## Existing WIP to reconcile (don't redo it)

There's prior highlight/cta exploration already started, preserved on branch
**`wip/highlight-sim`** (commit `125d048`, in the worktree `/private/tmp/okchroma-sim`).
It was made on the **old base `4a1c7e0`** (pre-merge), so reconcile — don't branch from it:

- **New files** — `scripts/highlight-render.ts`, `scripts/highlight-sim.ts`,
  `scripts/neutral-cta-sim.ts`. Pure additions; bring straight over:
  `git checkout wip/highlight-sim -- scripts/highlight-sim.ts …`
- **Edited files** — `src/engine/colorEngine.ts`, `src/engine/resolve.ts`. These were
  edited on `4a1c7e0`; the engine moved a lot before the published `d87c8bf`, so **diff
  them carefully** against `fix/highlight` and port the intent by hand rather than
  cherry-picking blind.

Do the work on **`fix/highlight`** (already branched off the published `origin/main` =
`d87c8bf`), not in the sim worktree.

## Demo tools for eyeballing (already built)

- **Temp compare grid** — top of the Palette tab (`demo/CustomTheme.tsx::swatchMatrix`):
  every ramp × every stop, **cta moved to the end** so the 1–12 ladder reads unbroken.
  This is the fastest way to *see* the dark highlight not fitting — scan the brand row
  in dark mode.
- **Showcase cards** (`demo/TokenCards.tsx`): roles in realistic context (incl. the
  cta-1↔cta-2 hover button, the highlight surface).
- Run the demo: `npm run demo:build` then the `demo` preview server.

## Quick file map

| File | Role |
|---|---|
| `src/engine/perceptualL.ts` | H-K curve — `perceptualRungL` (light L), `perceptualDarkC` (dark C), `solveLForApparent`, `KEEP_LIGHT/KEEP_DARK` |
| `src/engine/colorEngine.ts` | `generateScale` — light loop `~:540–558`, dark loop `~:614–633`, highlight `~:670–733`, cta `~:605–630` |
| `src/engine/stopTable.ts` | constants — `DARK_NEUTRAL_L`, `HIGHLIGHT_LIGHT/DARK`, dark stop floors |
| `src/engine/darkChromaCurve.ts` | `darkChromaCurve`→`perceptualDarkC`; `darkCtaTrim`/`loudnessCap` (cta-only now) |
| `src/engine/archetypes.ts` | cta lightness (`medianLForArchetype`), `hoverL` |
| `scripts/figma-verify.ts` | cta canary `#07074f`/`#869cda` |

**TL;DR:** light L is perceptual, dark L is a fixed scaffold; bring dark L onto the
same curve and the dark highlight stops misbehaving. Keep the cta canary green unless
you're deliberately taking on the cta. Expect (and bless) a full-fleet dark re-bless.
