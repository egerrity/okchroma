# The luminance-first stop ladder

## Concept

The lightness of each step comes from a fixed ladder that every hue shares. Step 6
sits at the same lightness whether the brand is blue, green, or red; only the
chroma and hue change between brands.

## Why

A layout is built on step numbers (card border is step 6, body text is step 12).
If step 6 were a different lightness per hue, swapping the brand would change every
contrast in the UI. A shared ladder keeps the structure when the brand changes:
same numbers, same lightness, same contrasts.

## How

Steps 1–8 read their lightness from a fixed table calibrated to the median OKLCH
lightness of Radix's 11 chromatic scales, which are remarkably uniform across
hues, so one ladder fits all. Chroma is layered on afterward (see [chroma & the
gamut envelope](./chroma-envelope.md)); lightness comes first, hence
"luminance-first."

Two adjustments sit on top:

- **Yellows get a small lift** so they keep their natural brightness instead of
  being forced down the shared ladder (yellow is intrinsically light).
- **Step 9 is the exception:** its lightness is the brand's own (the anchor), and
  steps 10–12 are the dark end. The shared ladder governs 1–8.

## Engineering

- **The ladder:** [`src/engine/stopTable.ts`](../../src/engine/stopTable.ts) →
  `LIGHT_STOPS` (`rootL` per step), `REFERENCE_H = 245` (calibration hue).
  `rootL` is the direct lightness of stops 1–8: `[0.993, 0.982, 0.960, 0.936,
  0.903, 0.860, 0.806, 0.738]`.
- **Yellow lift:** `YELLOW_L_LIFT`, up to +0.03 by stop 8, centered at H 92,
  gaussian σ 20°.

**Worked example.** Two brands of different hue ride the same ladder. Navy
`#003865` (H 249.9°) and green `#2E7D32` (H 144.2°), stops 1–8 lightness:

| Stop | Navy L | Green L |
|----:|------|------|
| 1 | 0.993 | 0.993 |
| 2 | 0.982 | 0.982 |
| 3 | 0.960 | 0.960 |
| 4 | 0.936 | 0.936 |
| 5 | 0.903 | 0.904 |
| 6 | 0.860 | 0.861 |
| 7 | 0.806 | 0.807 |
| 8 | 0.738 | 0.739 |

Identical to ±0.001: the lightness is the ladder, not the brand. (Reproduce: run
both hexes through `generateScale()` and compare `light[i].L`.)

---

**Provenance:** `docs/handoff-2026-06-10-color-math.md` (archive).
**See also:** [chroma & the gamut envelope](./chroma-envelope.md), [the 12-step
ramp](./the-12-stop-ramp.md), [compliance](./compliance.md).
