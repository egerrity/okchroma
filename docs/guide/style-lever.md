# The style lever (deeper / full-chroma)

## Concept

A per-brand dial (`default` / `deeper` / `full-chroma`), set by a person at intake.
It nudges how muted or brown a semi-muted warm brand goes, and does nothing outside
that narrow zone.

## Why

Some warm secondaries (a semi-muted "navy gold") can resolve two legitimate ways:
stay vivid, or lean into the cream/brown register. Geometry alone can't choose;
it's a taste call that depends on the brand's intent. So a human sets the direction
at intake instead of the engine guessing. Most brands never need it; it only bites
in the ambiguous band.

## How

`deeper` lifts the brand's effective mutedness toward the cream/brown envelope, so
papers and dark stops engage the warm register more. It's band-gated: it only acts
in the semi-muted warm zone (hue ≈ 55–100°, mid mutedness) and is a no-op
everywhere else, so a blue or a vivid red ignores it entirely. `full-chroma` is
plumbed but not yet wired to the math. The flag is set by a person, never derived.

## Engineering

- Flag: `style?: 'default' | 'deeper' | 'full-chroma'`, carried on each brand in
  [`src/brands.ts`](../../src/brands.ts) and passed through `resolveBrand()`.
- [`src/engine/colorEngine.ts`](../../src/engine/colorEngine.ts) → the `deeper`
  band gate (`DEEPER_STRENGTH`, `bandGate`, `deeperEffect = style==='deeper' ?
  DEEPER_STRENGTH * bandGate : 0`). Outside the band, `bandGate → 0`, so the lever
  is inert.

**Worked example.** A semi-muted gold brand tagged `style: 'deeper'` lands browner
papers and a deeper dark end than the same brand at `default`. Tag a blue brand
`deeper` and nothing changes; the band gate zeroes it out.

---

**Provenance:** `docs/decision-2026-06-11-style-lever.md`,
`docs/handoff-2026-06-11-style-categories.md`,
`docs/analysis-2026-06-11-style-category-evidence.md` (archive).
**See also:** [why dark yellow goes gold](./warm-hues.md), [escape
hatches](./escape-hatches.md).
