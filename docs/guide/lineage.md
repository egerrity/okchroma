# Lineage: reverse-engineered from Radix (not built on it)

## Concept

OKChroma is **inspired by** [Radix Colors](https://www.radix-ui.com/colors), but it is **not built on
Radix** — Radix is not a dependency and appears nowhere in the runtime or output. The reserved
12-step-role convention is the owner's own pre-existing idea (Radix happens to use a similar one).
OKChroma's numeric constants (the lightness ladder, dark scaffold, neutral chroma curve) were
**reverse-engineered by fitting to** Radix's hand-tuned palettes as a one-time reference; the engine
then generates the whole structure from any single brand color, with a principled
Helmholtz–Kohlrausch solve increasingly replacing the Radix-fit pieces.

## Why

Building an accessible 12-step scale by hand is real design work, and it does not
scale across many brands and many decision-makers. A white-label product needs the
scales generated to a guaranteed standard, not crafted one at a time.

## How

The reserved-role model — 12 steps, each mapped to the contrast a reserved role needs (backgrounds,
borders, a solid fill, text), calibrated so the steps line up across hues — was the reference point
(Radix popularized the same convention). OKChroma re-derives that structure from gamut geometry and an
H-K perceptual solve, retaining no Radix artifact at runtime, and adds what a generator needs:

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
- [`src/engine/neutralCurve.ts`](../../src/engine/neutralCurve.ts): the neutral chroma curve's
  numeric constants (lightness anchors, shape, per-hue peak chroma) were **fit from** Radix's neutral
  families — a derivation input only. (The old `src/radixNeutrals.ts` family-lookup was deleted;
  neutrals are now GENERATED per brand hue, not selected.)

This topic is orientation. The mechanics it points at are covered in [the stop
ladder](./stop-ladder.md), [chroma & the gamut envelope](./chroma-envelope.md),
and [compliance](./compliance.md).

---

**Provenance:** `docs/plan-2026-06-11-geometry-vs-taste.md`,
`docs/documentation-source-notes-2026-06-10-color-model.md` (archive).
**See also:** [why OKLCH](./oklch.md), [the 12-step ramp](./the-12-stop-ramp.md).
