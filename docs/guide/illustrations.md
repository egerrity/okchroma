# Illustration palettes (4-slot ramp)

## Concept

Illustrations get their own small, bespoke palette: four slots (wash, tint, mid,
deep) at fixed lightnesses. It's derived from the raw brand and deliberately
ignores the UI rules.

## Why

An illustration isn't UI. It doesn't need WCAG contrast, collision yields, or
on-fill text guarantees, and forcing those on it would flatten the artwork. What it
needs is a few harmonious fills at painterly lightnesses that still read as the
brand.

## How

Four slots at fixed lightness targets, chroma-weighted, measured from the
designer's 4-tier reference sets:

| Slot | L | use |
|------|------|-----|
| wash | 0.97 | background shapes, halos |
| tint | 0.88 | light bodies |
| mid  | 0.63 | primary bodies |
| deep | 0.47 | emphasis / ink |

They derive from the raw brand: no collision yields, no red cool-shift, no contrast
darkening. The only transform kept is the warm hue-shift along the gold spine, so
warm brands stay clean, not olive. A designer paints shapes labeled by slot; the
engine swaps each legend hex for the brand's slot color. Mono by default;
two-color brings in the secondary.

## Engineering

- [`src/engine/colorEngine.ts`](../../src/engine/colorEngine.ts) →
  `generateIllustrationScale()`.
- [`src/engine/stopTable.ts`](../../src/engine/stopTable.ts) → `ILLUS_STOPS` (the
  four slots above).
- [`src/illustration.ts`](../../src/illustration.ts) → `remapSvg()` (legend-hex →
  slot-color substitution), `SAMPLE_ILLUSTRATION`.

---

**Provenance:** `docs/roadmap-2026-06-11-product-phase.md` (§1, archive).
**See also:** [why dark yellow goes gold](./warm-hues.md).
