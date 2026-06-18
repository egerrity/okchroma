# Escape hatches: exact mode & archetype override

## Concept

Two per-brand overrides for when the engine's defaults aren't what the brand owner
wants: exact mode (ship the hex untouched) and archetype override (choose the
collision-resolution direction).

## Why

The engine is opinionated so the defaults are good. But a brand owner sometimes
needs the literal hex (brand-guideline compliance), or a different resolution than
the gate picked. Making those explicit, named modes keeps them honest:
"recommended, with adjustments" vs "exact, you own the outcome."

## How

- **Exact mode** skips every recommended-mode adjustment: no collision resolution,
  no warm-red cool-shift, no contrast darkening. The hex ships as-is, and
  accessibility is reviewed with the user rather than guaranteed by the engine.
  (It's also the entry point for brands that must ship an exact hex.)
- **Archetype override** lets the brand owner pick the rung-1 archetype direction
  instead of the one the engine would choose automatically.

Both are flags on the brand, read by `resolveBrand()`. ([The style
lever](./style-lever.md) is a third, narrower dial.)

## Engineering

- [`src/engine/resolve.ts`](../../src/engine/resolve.ts) → `resolveBrand(hex, name,
  { exact?, archetypeOverride?, style? })`. `exact` gates the whole resolution
  block; `archetypeOverride` feeds `generateScale()` and the rung-1 anchor.

**Worked example.** Red `#D8261C` in Recommended mode → `rung1 = 'error'` (the
brand re-anchors so destructive stays unmistakable). The same hex in Exact mode →
`rung1 = null`, so the engine ships the hex untouched and the resolution is
skipped. (Reproduce: `resolveBrand('#D8261C')` vs `resolveBrand('#D8261C', n,
{ exact: true })`.)

---

**Provenance:** `docs/handoff-2026-06-11-minimal-model.md`,
`docs/decision-2026-06-11-style-lever.md` (archive).
**See also:** [resolving a collision](./collisions.md#resolving-a-collision),
[compliance](./compliance.md), [the style lever](./style-lever.md).
