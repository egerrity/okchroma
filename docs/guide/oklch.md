# Why OKLCH, not hex/RGB

## Concept

OKChroma reasons about color in OKLCH (Lightness, Chroma, Hue) and converts to
hex/sRGB only at the end. OKLCH is perceptually uniform: equal number-steps look
like equal visual steps.

## Why

A scale has to feel evenly spaced and hold one hue from top to bottom. Hex and RGB
numbers don't track how the eye reads a color: equal RGB increments look uneven,
and changing "lightness" in RGB drags the hue with it. You can't build a smooth,
hue-stable, evenly-contrasted scale on numbers that don't match perception.

## How

OKLCH is the cylindrical form of Björn Ottosson's OKLab. Three numbers:

- **L**: perceived lightness, 0 (black) to 1 (white).
- **C**: chroma, how far from gray (0 is neutral).
- **H**: hue angle in degrees.

The engine does all its reasoning in L/C/H, stepping lightness down a ladder,
sizing chroma to the gamut, holding hue fixed, and converts to sRGB only to render.
Moving down a scale is "change L and C, keep H," which is what makes the steps read
as one consistent color family.

## Engineering

- **Conversion:** [`src/engine/constraints.ts`](../../src/engine/constraints.ts) →
  `oklchToLinearRgb()` (Ottosson's matrices) is the OKLCH→linear-RGB step; every
  downstream check (luminance, contrast, gamut) runs off it.
  `src/engine/colorEngine.ts` → `oklchToSrgbUnclamped()` gives the final sRGB.
- **Why it's load-bearing:** gamut clamping
  ([`clampChromaToGamut()`](../../src/engine/constraints.ts)) reduces *C* at fixed
  *L/H* to stay in sRGB. That's possible only because OKLCH lets you move chroma
  without touching hue. Per-channel RGB clipping would skew the hue (saturated
  yellow into khaki).

**Worked example.** The navy ramp (`#003865`) holds H = 249.9° on every one of its
12 steps while L runs 0.993 → 0.300 and C runs 0.003 → 0.095. One hue, top to
bottom (see [the 12-step ramp](./the-12-stop-ramp.md)). In hex that constancy would
be an accident; in OKLCH it is the representation.

---

**Provenance:** `docs/handoff-2026-06-10-color-math.md` (archive).
**See also:** [the 12-step ramp](./the-12-stop-ramp.md), [chroma & the gamut
envelope](./chroma-envelope.md).
