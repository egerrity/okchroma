# The relative spine & gaussian attenuation

## Concept

A warm brand isn't pulled onto the gold spine; it borrows the spine's shape
relative to its own hue. A brand sitting on the path takes the full rotation; a
brand off the path takes a softened version, so it keeps its own identity.

## Why

The first version treated the spine as an absolute attractor: every warm stop was
pulled toward the same fixed path. That dragged off-path brands (near-neutrals and
odd hues) toward a hue that wasn't theirs, inventing color they never had (the
"nano/ireland" defect class). The fix applies the path as a relative adjustment and
fades it out the further a brand sits from the spine.

## How

The spine contributes a shape, not a target: at each stop, the hue delta between
that stop's lightness and the brand's anchor lightness is added to the brand's own
hue. For a brand exactly on the path this is identical to the old absolute form;
off the path it preserves the brand hue plus a fraction of the designed swing.

That fraction is set by a gaussian of how far the brand sits from the spine:

```
g = gauss( brandH − spine(brandL),  σ ≈ 20° )
```

On-path brands (the vivid oranges/golds/yellows the spine is shaped around) get the
full designed swing (`g → 1`); off-path brands get about half. The same
machinery runs the light, dark, and illustration ramps.

## Engineering

- [`src/engine/colorEngine.ts`](../../src/engine/colorEngine.ts) → `torsionedHue()`
  (relative drift + cap), the off-path gaussian weight (`offPathG`), and
  `__setSpineSourceForAnalysis()` (an analysis-only hook to swap the spine source,
  bit-identical when unset).

**Worked example.** A vivid gold sits on the spine, so it takes the full rotation
seen in [why dark yellow goes gold](./warm-hues.md). A near-neutral brand with a
faint warm cast sits far off the spine, so the same machinery moves it only
slightly, and it stays the quiet color it is instead of being dragged to gold.

---

**Provenance:** `docs/handoff-2026-06-11-relative-spine-migration.md`,
`docs/handoff-2026-06-11-math-interrogation.md` (archive).
**See also:** [why dark yellow goes gold](./warm-hues.md).
