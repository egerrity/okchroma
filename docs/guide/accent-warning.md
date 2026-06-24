# The accent-collision warning

## Concept

The accent (secondary) color is the user's deliberate pick. When it collides with
a signal color, the engine warns instead of reshaping it. The warning is a
dismissible notice suggesting a more distinct accent.

## Why

The primary brand gets resolved because the engine owns the generated system. The
accent is the user's choice. Reshaping it silently would betray that intent, so
the engine flags the clash and lets the user decide. (We prototyped auto-muting
the accent toward the gamut floor; it was too aggressive for a user-chosen color.)

## How

Run the same collision check (hue gate plus ΔE, in light and dark) on the resolved
accent against all four signals. If it collides with any, show a dismissible toast
that names the signal (e.g. "reads close to the `yellow` signal — consider a more
distinct accent"). It fires in both Recommended and Exact mode and never changes
the accent.

## Engineering

- [`demo/CustomTheme.tsx`](../../demo/CustomTheme.tsx) → `checkAllCollisions(
  rRecAccent.scale, signalScales)` gives the colliding signals; a `warn` toast is
  added to the existing notice list. (Shipped in PR #5.)
- Reuses [`src/engine/collision.ts`](../../src/engine/collision.ts) →
  `checkAllCollisions()` (light plus dark, deduped).

**Worked example.** Accent `#F7C980` (gold) warns that it reads close to the
`yellow` signal. Accent `#0076A8` (teal) does not warn (no signal within the gate).

---

**Provenance:** session memory `accent-signal-collision` (warn-only decision;
auto-mute-by-gamut-fraction explored and rejected).
**See also:** [detecting a collision](./collisions.md#detecting-a-collision),
[resolving a collision](./collisions.md#resolving-a-collision).
