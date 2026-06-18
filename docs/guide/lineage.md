# Lineage: built on Radix, extended

## Concept

OKChroma is inspired by [Radix Colors](https://www.radix-ui.com/colors). It keeps
Radix's model (a 12-step scale where each step is reserved for a role) and
replaces Radix's hand-tuned, fixed palettes with a generator that produces that
structure from any single brand color.

## Why

Building an accessible 12-step scale by hand is real design work, and it does not
scale across many brands and many decision-makers. A white-label product needs the
scales generated to a guaranteed standard, not crafted one at a time.

## How

Radix gives the model we start from: 12 steps, each mapped to the contrast a
reserved role needs (backgrounds, borders, a solid fill, text), calibrated so the
steps line up across hues. We keep that model and add what a generator needs:

- **Generation.** The full 12-step system is computed from one hex, for any input.
- **Brand fidelity.** The brand's real color anchors the scale (step 9) instead of
  snapping to a preset.
- **Collision-awareness.** Generated colors can clash with the fixed signal colors.
  The engine detects and navigates that; Radix's static palettes never face the
  problem.

Radix is a reference, not a spec. We derive scales from gamut geometry first and
validate them against Radix's families; where we diverge it is a deliberate
choice. Radix is MIT-licensed and credited in the repo.

## Engineering

Radix shows up in two places in the code:

- [`src/engine/stopTable.ts`](../../src/engine/stopTable.ts): the light-stop
  lightness ladder (`LIGHT_STOPS`) is the median OKLCH lightness of Radix's 11
  chromatic scales; `REFERENCE_H = 245` is the calibration hue.
- [`src/radixNeutrals.ts`](../../src/radixNeutrals.ts): Radix's neutral families
  (gray/mauve/slate/sage/olive/sand), offered directly and used to validate the
  generated neutral tinting.

This topic is orientation. The mechanics it points at are covered in [the stop
ladder](./stop-ladder.md), [chroma & the gamut envelope](./chroma-envelope.md),
and [compliance](./compliance.md).

---

**Provenance:** `docs/plan-2026-06-11-geometry-vs-taste.md`,
`docs/documentation-source-notes-2026-06-10-color-model.md` (archive).
**See also:** [why OKLCH](./oklch.md), [the 12-step ramp](./the-12-stop-ramp.md).
