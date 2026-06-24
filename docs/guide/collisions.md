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

There is no offered choice ladder. Resolution is two **automatic** mechanisms,
split by which signal is involved: the brand yields to **error**, the **signal**
yields for warning / success / info.

**Error → the brand yields (brand-side).** Gated by the red band `(12, 35.5]` on
the *raw* brand hue:

- **In-band (maroon/red).** Rung-1 re-anchor: the whole scale is regenerated forced
  to the **dark** archetype, with the 11/12 text stops deepened ("opt3", L −0.07 /
  −0.05) so brand and body text stand off error's own text register. The hue is
  kept; only lightness moves. Ships in Recommended mode.
- **Out-of-band (pink below 12, orange above 35.5).** Left alone by *value* —
  instead `errorComponentRule` flags that destructive controls should render as an
  outline plus a required icon, so meaning never rides on hue alone (WCAG 1.4.1).
  (That component treatment is enforced in the consumer, not the color engine.)

**Warning / success / info → the signal yields (signal-side).** The brand is
untouched; the *signal* swaps to a different base, chosen by which side of a
per-signal hue split the brand sits on (`pickSignalShift` / `SHIFT_RULES`):

| signal | split H | brand below split | brand at/above split |
|---|---|---|---|
| warning | 96 | shift to **lemon** | keep canonical **macaroni** |
| success | 147 | swap to **teal-side** `#18AA6C` | swap to **yellow-side** `#5DA447` |
| info | 273 | swap to **magenta** `#AB4ABA` | swap to **blue** `#0090FF` |

**error never shifts** — it is the reference everything else is kept distinct from.
Crucially, these signal moves are **output-only** (`signalOverrides`): they change
the emitted signal scale but never re-enter any engine decision, which is why a
shift can't cascade into a new collision.

**Engineering.**
- **Brand-side:** [`src/engine/resolve.ts`](../../src/engine/resolve.ts) →
  rung-1 re-anchor (`RUNG1_ARCHETYPE = 'dark'`, gated by `inRedBand`),
  `errorComponentRule`.
- **Signal-side:** [`src/engine/signalShift.ts`](../../src/engine/signalShift.ts) →
  `pickSignalShift()` over `SHIFT_RULES` (the split table above), applied as
  output-only `signalOverrides`.
- **Superseded (dead):** `signalYieldShift()` / `SIGNAL_SHIFT_CAPS` /
  `YIELD_DIRECTION` and `warningVariant()` in `collision.ts` — the old
  "smallest capped whole-degree shift" / binary-chooser framing. Still defined,
  no longer called; warning now routes through `pickSignalShift`'s shift side.

**Worked examples** (from `resolveBrand()`):
- Warm gold `#C8A35D` (H 82.1°, under the 96 split) → warning shifts to **lemon**;
  the brand is untouched.
- Red `#D8261C` (H 29.1°, inside the red band) → rung-1 re-anchor to the dark
  archetype; hue kept.

---

**Provenance:** `docs/SPEC-signal-color-shifting.md`,
`docs/handoff-2026-06-11-minimal-model.md` (archive).
**See also:** [the accent warning](./accent-warning.md), [escape
hatches](./escape-hatches.md), [dark mode](./dark-mode.md).
