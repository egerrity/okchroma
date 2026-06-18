# Dark anchors & the compliance ladder (WCAG + APCA)

## Concept

Every fill the engine produces comes with readable on-fill text that passes both
WCAG AA and APCA, in light and dark mode, by construction. The text shades (steps
11–12) and the dark end are anchored to hit contrast targets, not eyeballed.

## Why

When non-experts pick brand colors for a white-label product, legibility can't be
left to chance per brand. The system has to guarantee that text on any generated
fill is readable in both modes, or some brand eventually ships an unreadable
button. Accessibility is built in, not reviewed in.

## How

Two standards, each doing the job it's best at:

- **WCAG 2.x contrast ratio** bounds the text/fill pair. The ratio is
  `(Y_lighter + 0.05) / (Y_darker + 0.05)` from relative luminance; the fill's
  on-text must clear 4.5:1 (AA).
- **APCA Lc** picks the on-fill polarity (black vs white text), because WCAG 2.x
  overweights black on saturated mid-tone fills where APCA matches perception
  better. Target around Lc 45.

The text steps are luminance-anchored. Step 11 (low-contrast text) sits at its dark
root bounded by 4.5:1 against step 2; step 12 (high-contrast text) clears a 7:1
floor with headroom. Their cross-brand uniformity comes from each brand's step 2
already being luminance-equalized. **Exact mode** skips all of this: it ships the
hex untouched, so accessibility is reviewed with the user, not guaranteed.

## Engineering

- **Luminance + contrast:** [`src/engine/constraints.ts`](../../src/engine/constraints.ts)
  → `wcagY()` (relative luminance from linear RGB), `contrastRatio()`.
- **Polarity:** `apcaLc()` (APCA-W3 0.1.9) and `computeLFlip()` (the L where white
  on-fill overtakes black).
- **Anchoring 11/12:** `findMaxLForContrast()` finds the lightest L meeting a
  target ratio; constants in [`stopTable.ts`](../../src/engine/stopTable.ts)
  (`STOP_11_CONTRAST = 4.5`, `STOP_12_CONTRAST_FLOOR = 7.0`).

**Worked example.** The navy solid fill `#003865` (L 0.335, C 0.095, H 249.9) has
relative luminance Y = 0.038:

- white text → contrast 11.99 : 1 ✓ (clears 4.5 with room)
- black text → contrast 1.75 : 1 ✗

The engine ships white on-fill text for this brand. (Reproduce:
`contrastRatio(1.0, wcagY(0.335, 0.095, 249.9))` and the same against `0.0`.)

---

**Provenance:** `docs/documentation-source-notes-2026-06-10-color-model.md`
(archive, §5). **See also:** [the stop ladder](./stop-ladder.md), [dark
mode](./dark-mode.md), [escape hatches](./escape-hatches.md).
