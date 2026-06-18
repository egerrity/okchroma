# Signal collisions

The engine reserves four signal colors with fixed meaning: error, warning,
success, info. A generated brand or accent color can land too close to one. This
doc covers both parts: detecting the clash, then resolving it.

## Why

Signals carry meaning users rely on: red is destructive, green is done. If a
brand fill reads like the error red, a brand button and a delete button look
alike. The engine generates scales from arbitrary hexes, so some inputs will sit
in a signal's region. It has to both detect that and act on it.

## Detecting a collision

A collision needs two gates, both tripped:

1. **Hue gate.** The brand hue is within 30° of the signal's hue (same color
   family). A cheap pre-filter: a maroon and the error red share a family; a teal
   does not.
2. **Distance gate.** The OKLab ΔE between the two rendered step-9 fills is below a
   threshold. This is what lets a dark maroon pass: same family, far enough in
   lightness that no one confuses the fills.

It runs per mode. Dark mode pins every step-9 lightness, so a color can be clear
in light and collide in dark. The dark threshold is therefore stricter (0.10 vs
0.16).

**Engineering.**
- **Detection:** [`src/engine/collision.ts`](../../src/engine/collision.ts) →
  `checkCollision()` (the two gates), `stopDeltaE()` (OKLab ΔE between two stops).
- **Thresholds:** `HUE_GATE_DEG = 30`, `DELTA_E_THRESHOLD = 0.16` (light),
  `DARK_DELTA_E_THRESHOLD = 0.10` (dark).
- **Signals:** [`src/engine/signals.ts`](../../src/engine/signals.ts). Canonical
  hexes: error `#E54D2E` (H 33.3°), warning `#FFC53D` (H 84.1°), success `#46A758`
  (H 147.4°), info `#6E56CF` (H 288°).

**Worked example.** Gold accent `#F7C980` against the warning signal, light mode:
hue distance 5.9° (inside the 30° gate) and step-9 ΔE 0.054 (under 0.16). Result:
collides. (Reproduce: `checkCollision(generateScale('#F7C980'), warningScale,
warningDef, 'light')`.)

## Resolving a collision

Resolution is a ladder. The engine makes the smallest move that restores
separation while preserving brand identity. The error case is handled
automatically; for warning, success, and info the signal moves instead of the
brand.

- **Rung 1 (automatic).** A brand in the error-red register re-anchors to the dark
  archetype, darkened so a destructive action stays unmistakable. The brand hue is
  kept. Ships in Recommended mode.
- **Component rule.** A warm neighbor on the orange side of error keeps its exact
  color. Instead, destructive buttons render as outline plus a required icon, so
  meaning never rides on hue alone (WCAG 1.4.1).
- **Signal yield (warning / success / info).** The signal moves, not the brand.
  Warning resolves binary: a warm-yellow brand pushes warning to a cooler lemon; a
  cool-yellow brand keeps the standard macaroni amber. Success and info shift
  within a tolerance cap; any residual is left to component rules.
- **Rungs 2–3 (offered, not automatic).** Brand-shifts-cool / signal-shifts-warm,
  then Exact mode (component treatment only). These are choices the brand owner
  makes, not gate-driven.

**Engineering.**
- **Brand-side:** [`src/engine/resolve.ts`](../../src/engine/resolve.ts) →
  `collisionStatus()`, rung-1 re-anchor (`RUNG1_ARCHETYPE = 'dark'`),
  `errorComponentRule`.
- **Signal-side:** [`src/engine/collision.ts`](../../src/engine/collision.ts) →
  `signalYieldShift()` (smallest whole-degree shift that clears the gate, capped),
  `warningVariant()` (`YELLOW_SPLIT_H = 96`), `SIGNAL_SHIFT_CAPS`. Applied as
  `signalOverrides` via [`src/engine/signalShift.ts`](../../src/engine/signalShift.ts).

**Worked examples** (from `resolveBrand()`):
- Warm gold `#C8A35D` (H 82.1°, under 96) → `warningVariant = 'lemon'`. The warning
  signal shifts cooler; the brand is untouched.
- Red `#D8261C` (H 29.1°) → `rung1 = 'error'`. The brand re-anchors to the dark
  archetype; hue kept.

---

**Provenance:** `docs/SPEC-signal-color-shifting.md`,
`docs/handoff-2026-06-11-minimal-model.md` (archive).
**See also:** [the accent warning](./accent-warning.md), [escape
hatches](./escape-hatches.md), [dark mode](./dark-mode.md).
