# The model: contrast-grouping scales

## Concept

A color system is built on **contrast pairs**: a fill needs text that reads on it, a border needs
to separate from its background, a background needs to sit quietly behind content. Rather than emit
N evenly-spaced colors and hope the pairs land, OKChroma purposefully chooses lightness targets so
each step falls in the contrast grouping its reserved role needs (backgrounds, borders, a solid
fill, text). The engine then generates the whole 12-step scale per brand from one hex, using
Helmholtz–Kohlrausch (H-K) perceptual math for the per-hue lightness and chroma.

## Why

Building an accessible 12-step scale by hand is real design work, and it does not
scale across many brands and many decision-makers. A white-label product needs the
scales generated to a guaranteed standard, not crafted one at a time.

## How

The reserved-role model — 12 steps, each mapped to the contrast a reserved role needs (backgrounds,
borders, a solid fill, text), calibrated so the steps line up across hues — is the structural
foundation. OKChroma derives that structure from gamut geometry and an H-K perceptual solve, and
adds what a generator needs:

- **Generation.** The full 12-step system is computed from one hex, for any input.
- **Brand fidelity.** The brand's real color anchors the scale (step 9) instead of
  snapping to a preset.
- **Collision-awareness.** Generated colors can clash with the fixed signal colors.
  The engine detects and navigates that; a static, hand-built palette never faces
  the problem.

Scales are derived from gamut geometry first, then validated against the contrast
requirements of each reserved role.

## Engineering

The contrast-grouping constants live in two places:

- [`src/engine/stopTable.ts`](../../src/engine/stopTable.ts): the light-stop
  lightness ladder (`LIGHT_STOPS`) is a set of contrast-grouping L targets — Ls
  chosen so each step lands in its reserved-role contrast grouping; `REFERENCE_H =
  245` is the calibration hue.
- [`src/engine/neutralCurve.ts`](../../src/engine/neutralCurve.ts): the neutral chroma curve's
  numeric constants (lightness anchors, shape, per-hue peak chroma) define a per-hue, per-level
  near-gray chroma curve. (The old neutral family-lookup was deleted; neutrals are now GENERATED
  per brand hue, not selected.)

This topic is orientation. The mechanics it points at are covered in [the stop
ladder](./stop-ladder.md), [chroma & the gamut envelope](./chroma-envelope.md),
and [compliance](./compliance.md).

---

**Provenance:** `docs/plan-2026-06-11-geometry-vs-taste.md`,
`docs/documentation-source-notes-2026-06-10-color-model.md` (archive).
**See also:** [why OKLCH](./oklch.md), [the 12-step ramp](./the-12-stop-ramp.md).
