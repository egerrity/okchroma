# Neutral tinting

## Concept

The neutral (gray) scale is either a ready-made Radix family or a brand-tinted
gray: a near-gray carrying a whisper of the brand's hue, so the UI's grays feel
related to the brand instead of dead.

## Why

A pure gray next to a saturated brand can look lifeless; a faint brand tint makes
the whole UI feel cohesive. But push the tint too far and the "grays" stop reading
as neutral. The tint has to be a whisper, shaped per step: almost absent on the
paper-white backgrounds, a touch more through the mids, gone again by body text.

## How

Two options exist in principle:

- **A Radix neutral family** (gray, mauve, slate, sage, olive, or sand), chosen by
  the brand's hue. This is what actually ships today.
- **A branded neutral:** gray tinted with the brand's hue at a tiny peak chroma,
  shaped by a per-step curve.

> **Status: the brand-tinted path is wired but unexercised.** `generateNeutralScale`
> takes an optional tint, but **no caller passes one** — the core build emits a pure
> gray and the plugin/Figma path assigns a Radix family. The tint machinery and its
> per-step curve are real code, but nothing exercises them; treat the branded
> neutral as a *generative-neutral opportunity* the spec hasn't yet turned on, not a
> live option. (See [stage-2 adjudication](../engine-spec/stage2-adjudication.md).)

And when the chosen secondary is itself near-gray, it informs the neutral rather
than becoming an accent.

**The neutral's own roles.** Like every ramp, neutral splits into a surface scale
plus pulled-out roles, with two neutral-specific quirks worth knowing if you
consume it:

- Its emphasis fill is a **highlight** whose lightness is a **hardcoded `L = 0.57`**
  (mid-gray), not contrast-solved — so its `on-highlight` text polarity is
  WCAG-computed per mode (white fails on mid-gray, so it often resolves to black).
- It additionally carries a bespoke **`cta` button** (near-black in light, near-white
  in dark) — the additive role stop neutral gets on top of its highlight.

## Engineering

- [`src/engine/colorEngine.ts`](../../src/engine/colorEngine.ts) →
  `generateNeutralScale({ H, C })` (C is the peak; each step scales it).
- [`src/engine/stopTable.ts`](../../src/engine/stopTable.ts) →
  `NEUTRAL_TINT_CURVE`, the per-step tint multipliers derived from Radix slate:
  `[0.08, 0.15, 0.25, 0.33, 0.42, 0.55, 0.68, 0.95, 1.0, 0.95, 0.83, 0.60]`
  (≈8% of peak on step 1, peaks at steps 8–9, tapers into 12).
- [`src/radixNeutrals.ts`](../../src/radixNeutrals.ts) → the families +
  `closestNeutralFamily()`. Note `radixNeutralCss` emits numeric `--neutral-1..12`,
  while the Figma path renames the same hexes to `paper`/`wash`/…/`ink` — a known
  CSS/Figma name divergence for the neutral ramp (engine-spec open question).

**Worked example.** With a peak chroma of 0.016 (Radix slate's level), step 1
carries 0.08 × 0.016 ≈ 0.0013 chroma (essentially white), while step 9 carries the
full 0.016. The tint is present where surfaces are colored and absent where text
must read as ink.

---

**Provenance:** `docs/handoff-2026-06-10-color-math.md` (end notes),
`docs/ROADMAP-engine-and-export.md` (archive).
**See also:** [the stop ladder](./stop-ladder.md), [lineage / Radix](./lineage.md).
