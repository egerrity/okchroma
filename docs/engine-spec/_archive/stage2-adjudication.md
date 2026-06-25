# Stage 2 — Owner adjudication of the bolt-on list

Owner-ruled 2026-06-24, against [stage1-code-truth.md](./stage1-code-truth.md).
Conservative labeling: only confident post-hoc individual patches are "fixes"; anything
uncertain is a spec decision; intentional mechanisms are off-limits.

**Q3 resolved:** the code is a trustworthy spec base. Old repo NOT needed.

## A. Confirmed fixes (real bugs/inconsistencies)
1. `enforceWhiteFill` not threaded into the signal-shift path → a shifted success
   **highlight** can render black, breaking white-except-yellow (highlights).
   `signalShift.ts:72`. (The green/yellow/info shift concern the owner raised.)
2. `radixNeutralCss` emits numeric `--neutral-1..12`, bypassing `stopTokenName` → CSS
   and Figma disagree on neutral token names. `radixNeutrals.ts:55`.
3. on-highlight `?? true` fallback → three emitters can disagree on highlight polarity.
   `cssRender.ts:87`.

## B. Spec decisions (decide in-context during Stage 4 — NOT labeled bolt-ons)
- Highlight white-enforcement **mechanism** is fragmented (success pre-darken vs
  error/info runtime ladder vs neutral hardcoded `0.57`). Intent is right (white
  highlight, non-yellow); whether to unify the mechanism = spec.
- Neutral highlight `L=0.57` hardcode vs solve-to-hold-white (it's a highlight).
- Dark-mode floors (brand 0.70 vs signal 0.63; per-signal `darkFillMinL` ladder).
- `lemonScale` forced-`light` archetype; magic-4.6 target; manual unrolled passes
  (11/12, highlight); dark chroma cliff 0.0399/0.0401.

## C. Intentional — OFF-LIMITS (do not touch / do not call bolt-ons)
- **Yellow** machinery: `creamGate`, `yellowLift`, yellow chroma boost/fade,
  `yieldChromaScale`. Deliberate — yellow is hard, works as wanted.
- **Red-band cluster:** rung-1 regen + 11/12 deepen, cool-render, `coolRedDark`,
  `inRedBand` watershed, dark `muted` collider. Intentional brand↔error separation.
- **cta** brand-true behavior (true to brand, can be light, on-cta polarity follows).
- **Single (un-flipped) dark mode** — known tradeoff (flipping needed too much math).

## D. Leave for spec
- Possibly-dead: `signalYieldShift`/`SIGNAL_SHIFT_CAPS`/`YIELD_DIRECTION` (uncalled),
  `warningVariant` (back-compat label only). Note in spec; decide removal there.
- **`generateNeutralScale` tint machinery — OPPORTUNITY, not dead.** Wired but no caller
  passes a tint (neutrals are hardcoded Radix). May be the seed for moving neutrals from
  hardcoded → **generative**. Evaluate cost/benefit in the spec; unclear if worth it.

## Structural questions for the spec (owner-flagged)
- **cta/highlight asymmetry.** `highlight` exists in EVERY palette (brand, secondary,
  neutral, signals); `cta` does NOT (brand/secondary/neutral only — signals have none).
  Both are ROLES pulled out of the 1-12 scale; do not describe by stop number. This
  asymmetry keeps resurfacing as a bug source — the spec must address it head-on
  (define the role model + why the asymmetry exists or how to resolve it), not paper over.

## Byte-compat posture
Not sacred, but caveated: holistic fixes may move output values, re-blessing snapshots
with owner visual approval — EXCEPT never the yellow/red-band intentional mechanisms;
treat uncertain items as spec decisions, not bolt-ons.
