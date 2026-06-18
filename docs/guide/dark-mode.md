# Dark mode: lifting & the red pastel float

## Concept

Dark mode isn't a separate palette; it's the same engine run against a dark
background. Fills keep their identity and only *lift* when they'd vanish, text
flips, and a brand that would now collide with the error red floats to a pastel
register.

## Why

A brand should still look like itself in dark mode. Naive approaches either invert
the scale (wrong colors) or re-tint fills (which manufactures mustard golds and
brown oranges). The rule is conservative: keep the brand's hue and chroma, and fix
only the two things that actually break in the dark: a fill too dark to see on a
dark background, and a red that can no longer be told apart from error.

## How

- **Backgrounds (1–8)** ride their own dark ladder, raised and chroma-boosted,
  because OKLab under-weights perceived steps at low lightness.
- **Fills (step 9)** keep hue and chroma and only **LIFT** to a floor so they stand
  off the dark background; they're never pulled *down* (that's what made mustard).
  On-fill text goes black-first once the lifted fill is light enough.
- **Red colliders** can't be separated from error in dark mode, so they **float**
  to a pastel rose register (reduced chroma) and take black on-fill text, a second
  differentiation channel beyond hue.

## Engineering

- [`src/engine/colorEngine.ts`](../../src/engine/colorEngine.ts) → the dark path in
  `makeStop()`/`generateScale()`.
- [`src/engine/stopTable.ts`](../../src/engine/stopTable.ts) → `DARK_STOPS`,
  `DARK_STOP_9_MIN_L = 0.63` (lift floor, not a remap target), `DARK_STOP_11/12`,
  `DARK_COLLIDER_MUTED_L`/`_CHROMA_SCALE` (the red float).

**Worked example.** Navy `#003865`'s solid fill is dark (light-mode step 9 L
0.335). In dark mode it lifts to L 0.630 so it reads on a dark background, same hue
(249.9°), same chroma. Navy dark steps 9–12 lightness: `0.630, 0.589, 0.750, 0.940`
(fill, hover, then light text). (Reproduce: `generateScale('#003865').dark[i].L`.)

---

**Provenance:** `docs/handoff-2026-06-11-relative-spine-migration.md` (dark-pass
notes, archive). **See also:** [compliance](./compliance.md), [resolving a
collision](./collisions.md#resolving-a-collision).
