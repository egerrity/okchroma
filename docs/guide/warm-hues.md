# Why dark yellow goes gold, not olive

## Concept

Warm colors (yellow, gold, orange) can't keep their exact hue as they darken, or
they turn muddy. The engine rotates warm stops along a fixed gold spine: cream
near white, gold/orange-brown in the depths. The result reads as the same warm
family at every step instead of olive.

## Why

In sRGB, "staying on hue" while lightness drops is what makes warm colors muddy:
dark orange at its own hue is brown; dark yellow is olive. Holding the exact hue
down the scale works fine for blues but breaks warm brands. Keeping a gold brand
looking gold at step 11 means not keeping its literal hue there.

## How

A gold spine defines the clean hue at each lightness, solved from Radix's
orange/amber/yellow scales, which all share this attractor. Warm stops drift toward
the spine with partial, capped travel:

- light tints lean yellow-green (the spine's light end),
- the solid steps (9/10) keep the brand hue exactly,
- dark stops rotate toward gold/orange (the spine's dark end).

Only the warm band moves. Reds (H < 40°) and greens (H > 122°) are outside it, so
the engine barely touches them, as Radix barely moves them either.

## Engineering

- [`src/engine/colorEngine.ts`](../../src/engine/colorEngine.ts) → `spineHue()`
  (piecewise-linear hue along the path), `torsionedHue()` (applies the capped
  drift).
- [`src/engine/stopTable.ts`](../../src/engine/stopTable.ts) → `GOLD_SPINE` (the
  knots) and `WARM_TORSION` (`bandLo 40`, `bandHi 122`, `travel 0.55`,
  `capDeg 24`).

`GOLD_SPINE` runs from H 110° at L 0.97 (light, yellow-green) down to H 47° at L
0.30 (dark, orange-gold). That downward rotation is the "gold not olive" path.

**Worked example.** Gold brand `#B18D0B` (brand H 90.1°), hue per step:

| Step | 1 | 5 | 8 | **9** | 11 | 12 |
|------|----|----|----|------|----|----|
| H° | 99.1 | 98.5 | 93.4 | **90.1** | 88.1 | 87.7 |

Light tints lean yellow-green (99°), the solid fill is exactly the brand (90.1°),
and the dark text shades rotate toward gold (87.7°). The hard-band rotation is
strongest on the dark ramp and the illustration ramp. (Reproduce: `generateScale(
'#B18D0B').light[i].H`.)

---

**Provenance:** `docs/handoff-2026-06-11-relative-spine-migration.md`,
`docs/plan-2026-06-11-geometry-vs-taste.md` (archive).
**See also:** [the relative spine](./relative-spine.md), [the style
lever](./style-lever.md), [chroma & the gamut envelope](./chroma-envelope.md).
