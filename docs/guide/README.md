# OKChroma: how the engine thinks

This guide explains the logic behind OKChroma's color engine. It comes in two
tracks:

- **Engineering:** one file per topic below (mechanic, core formula, source
  pointers, a worked example). Each opens with a plain `Concept` / `Why` / `How`.
- **Design:** a single consolidated doc, **[For designers](./for-designers.md)**,
  reframing the same topics around what a designer does, sees, and decides.

## Lineage: built on Radix, extended for white-label

OKChroma is **inspired by [Radix Colors](https://www.radix-ui.com/colors)** and
extends it. Radix gives us the model we start from: a perceptual, 12-step scale
where each step has a fixed *role* (backgrounds, borders, a solid fill, text),
calibrated so steps line up across hues. We measure and validate against Radix's
families (see [`src/radixNeutrals.ts`](../../src/radixNeutrals.ts),
[`src/engine/stopTable.ts`](../../src/engine/stopTable.ts)).

What Radix does **not** do is what a white-label product needs:

- **Radix ships fixed, hand-tuned palettes.** A white-label tool can't hand-tune
  one palette per client. OKChroma **generates** a complete 12-step system from a
  single brand hex, automatically, for any input color.
- **Fidelity to the brand's actual color.** The brand's real hex anchors the
  scale (step 9) instead of being snapped to a pre-made palette.
- **Collision-awareness.** Generated brand colors can collide with the fixed
  signal colors (error/warning/success/info). OKChroma detects and navigates that
  automatically; Radix's static palettes never face the problem.

Honest framing: **Radix is a reference, not a spec.** We derive scales from gamut
geometry first and validate them against Radix; where we diverge, it's a
deliberate decision, not an error. (Radix is MIT-licensed; see the repo
acknowledgment.)

## Engineering topics

Read in order for a first pass, or jump to one. (Designers: start with [For
designers](./for-designers.md).)

**Foundations**
1. [Lineage: built on Radix, extended](./lineage.md)
2. [Why OKLCH, not hex/RGB](./oklch.md)
3. [The 12-step OKLCH ramp](./the-12-stop-ramp.md)
4. [The luminance-first stop ladder](./stop-ladder.md)
5. [Saturation-preserving chroma & the gamut envelope](./chroma-envelope.md)
6. [Dark anchors & the compliance ladder (WCAG + APCA)](./compliance.md)

**Collisions & signals**
7. [Signal collisions](./collisions.md): [detecting](./collisions.md#detecting-a-collision) · [resolving](./collisions.md#resolving-a-collision)
8. [The accent-collision warning](./accent-warning.md)

**Warm-hue logic**
9. [Why dark yellow goes gold, not olive](./warm-hues.md)
10. [The relative spine & gaussian attenuation](./relative-spine.md)
11. [The style lever (deeper / full-chroma)](./style-lever.md)

**Modes & extras**
12. [Dark mode: lifting & the red pastel float](./dark-mode.md)
13. [Illustration palettes (4-slot ramp)](./illustrations.md)
14. [Neutral tinting](./neutrals.md)
15. [Escape hatches: exact mode & archetype override](./escape-hatches.md)

> Authoring against [`_TEMPLATE.md`](./_TEMPLATE.md). Engineering sections first;
> design sections follow. Each topic cites the internal decision record(s) it
> draws from as provenance.
