# Neutral tinting

## Concept

The neutral (gray) scale is a **generated** near-gray carrying a whisper of the brand's hue, so the
UI's grays feel related to the brand instead of dead. (It used to offer a ready-made Radix family;
that path was deleted — the neutral is now generated per brand, always.)

## Why

A pure gray next to a saturated brand can look lifeless; a faint brand tint makes
the whole UI feel cohesive. But push the tint too far and the "grays" stop reading
as neutral. The tint has to be a whisper, shaped per step: almost absent on the
paper-white backgrounds, a touch more through the mids, gone again by body text.

## How

The neutral is **generated per brand** from the brand hue — both the core build (`cssRender.ts:113`)
and the plugin/Figma path (`figmaRender.ts:93`) call the same `generateNeutralScale(brandH, level)`.
There is **no Radix-family path** any more (`src/radixNeutrals.ts` / `closestNeutralFamily` was
deleted). What is selectable is the **tint LEVEL**, not Radix-vs-generated:

- **`pure`** — a flat gray (no brand tint).
- **`default`** — a whisper of the brand hue, shaped per step by the neutral chroma curve.
- **`branded`** — more tint (the stretch level).

> **Status:** `pure` and `default` ship. The neutral chroma curve (`neutralCurve.ts`) is the live
> shaping; its constants were fit from Radix family measurements (a derivation input, not a runtime
> lookup).

And when the chosen secondary is itself near-gray, it informs the neutral rather
than becoming an accent.

**The neutral's own roles.** Like every ramp, neutral splits into a surface scale
plus pulled-out roles, with two neutral-specific quirks worth knowing if you
consume it:

- Its emphasis fill is a **highlight** whose lightness is a **hardcoded `L = 0.57`**
  (mid-gray), not contrast-solved — so its `on-highlight` text polarity is
  WCAG-computed per mode (white fails on mid-gray, so it often resolves to black).
- It additionally carries a bespoke **`cta` button** (near-black in light, near-white
  in dark) — the additive role stop neutral gets on top of its highlight.

## Engineering

- [`src/engine/colorEngine.ts`](../../src/engine/colorEngine.ts) →
  `generateNeutralScale(brandH, level)`: synthesizes a faint gray AT the brand hue and runs it
  through `generateScale` with the neutral chroma curve. **The neutral is GENERATED, not selected
  from a Radix family** — the old `src/radixNeutrals.ts` / `closestNeutralFamily()` / `neutralRadixCss`
  lookup was **deleted**.
- [`src/engine/neutralCurve.ts`](../../src/engine/neutralCurve.ts) →
  `neutralChromaCurve(brandH, level)`: the per-hue, per-level chroma curve. Its numeric constants
  were *fit from* Radix family measurements — a derivation input, **not** a runtime color lookup.
- Both emitters call the SAME `generateNeutralScale` (`cssRender.ts:113`, `figmaRender.ts:93`), so
  CSS and Figma agree; the plugin dedups same-hue brands onto one shared primitive
  (`plugin/ui.ts` key `<level>-h<round(brandH)>`, or `pure` for grey).

**Worked example.** With a peak chroma of 0.016 (Radix slate's level), step 1
carries 0.08 × 0.016 ≈ 0.0013 chroma (essentially white), while step 9 carries the
full 0.016. The tint is present where surfaces are colored and absent where text
must read as ink.

---

**Provenance:** `docs/handoff-2026-06-10-color-math.md` (end notes),
`docs/ROADMAP-engine-and-export.md` (archive).
**See also:** [the stop ladder](./stop-ladder.md), [lineage / Radix](./lineage.md).
