# Saturation-preserving chroma & the gamut envelope

## Concept

Once a step's lightness is set, its chroma (saturation) is sized to the gamut
envelope (the most chroma sRGB can show at that lightness and hue), scaled by how
vivid the brand itself is. That makes the light steps a smooth quiet→vivid curve
that always stays a true, in-gamut version of the brand.

## Why

A fixed chroma per step can't work: the same chroma is impossible (out of gamut)
for some hues at some lightnesses and looks washed-out for others. The envelope is
narrow near white and wide in the mid-tones, so chroma has to follow it. Sizing
each step to a fraction of what the gamut allows keeps the scale vivid where it
can be, calm where it must be, and always inside sRGB.

## How

For the light steps, chroma is a fraction of the gamut maximum at that step,
scaled by the brand's own vividness:

```
brandSat = brandC / maxChromaAt(brandL, brandH)     // how vivid the brand is, 0..1
C(step)  = brandSat · satFraction(step) · maxChromaAt(L_step, H)
```

`maxChromaAt(L, H)` is the gamut envelope. Clamping into gamut reduces *C* at fixed
*L* and *H*, never per-channel clipping, which would skew the hue (saturated yellow
into khaki). Vivid brands ride a tuned base-chroma ladder (`LIGHT_BASE_C`) weighted
by vividness `v = min(1, C/0.13)`; muted warm brands blend toward the "cream"
envelope endpoint.

## Engineering

- **Envelope + build:** [`src/engine/colorEngine.ts`](../../src/engine/colorEngine.ts)
  → `maxChromaAt()` (`= clampChromaToGamut(L, 0.52, H)`), `makeStop()`
  (builds + gamut-clamps a step).
- **Gamut clamp:** [`src/engine/constraints.ts`](../../src/engine/constraints.ts)
  → `clampChromaToGamut()` (binary-search the largest in-gamut chroma at fixed L/H).
- **Ladders:** [`src/engine/stopTable.ts`](../../src/engine/stopTable.ts) →
  `LIGHT_BASE_C`, `LIGHT_STOPS.satFraction`.

**Worked example.** The envelope at hue 249.9° (the navy), `maxChromaAt(L, 249.9)`:

| L | max chroma |
|------|------|
| 0.99 | 0.005 |
| 0.90 | 0.051 |
| 0.80 | 0.105 |
| 0.738 | 0.141 |
| 0.50 | 0.141 |
| 0.335 | 0.095 |

Tiny near white, widest through the mid-tones. The navy's chroma rides a fraction
of that envelope and so climbs 0.003 → 0.082 across stops 1–8 (see [the
ramp](./the-12-stop-ramp.md)). The quiet→vivid curve falls out of the geometry.
(Reproduce: `clampChromaToGamut(L, 0.52, 249.9)`.)

---

**Provenance:** `docs/handoff-2026-06-10-color-math.md`,
`docs/handoff-2026-06-11-relative-spine-migration.md` (archive).
**See also:** [the stop ladder](./stop-ladder.md), [why dark yellow goes
gold](./warm-hues.md).
