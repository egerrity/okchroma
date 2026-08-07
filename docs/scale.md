# The scale

One brand color in, a full ramp out: 3 papers, 4 washes, 1 mark, and 3 inks (numbered contiguously 1–11), plus the off-scale cta/hover and their on-text colors. Each step has a pre-reserved role and intended accessibility category — so the same step number does the same thing on every brand.
Lightness comes from a declared ladder; chroma is saturation-preserving (a fraction of the
gamut the step allows, scaled by how saturated the brand is). Names fall in four groups
— `paper`, `wash`, `mark`, `ink` — plus the off-scale `cta` roles.

Stage B (2026-08-07, names only, no color changed): every name carries its own placement.
A bare number is the stop's light rootL times 100, rounded (`paper-99` sits at rootL ≈
0.99). A stop whose usage keys on a declared WCAG floor also carries `-rNNN`, the floor
times 100 (`mark-74-r300` is the rootL-74 stop with a declared 3.0 floor; `ink-53-r450` is
rootL-53 with a 4.5 floor). The floor suffix is present only where a requirement is central
to the stop's job, not on every stop that happens to declare one.

Code: the **declaration** is [`spec.ts`](../src/reqtoken/spec.ts) (per-stop rootL,
producers, and requirements — the edit surface); the base ladders it draws from are in
[`stopTable.ts`](../src/engine/stopTable.ts) (`ROOT_L_LIGHT` / `ROOT_L_DARK` — the wash
re-space is baked directly into `ROOT_L_LIGHT`'s values, not a separate constant); the
names are [`tokenNames.ts`](../src/engine/tokenNames.ts).

## Stops

Per-stop lightness targets (light and dark), the requirement each stop declares, and the
accessibility category it carries.

| stop | light L | dark L | declared requirement | accessibility |
|---|---:|---:|---|---|
| `paper-99`          | 0.987  | 0.178 | — | app background, inverted text |
| `paper-97`          | 0.970¹ | 0.213 | ΔE ≥ 0.028 off `paper-99` (light) | raised background, inverted text |
| `paper-95`          | 0.950  | 0.252 | ΔE ≥ 0.012 off `paper-97` (light) | surface plane (light sink / dark pop) |
| `wash-92`           | 0.924  | 0.285 | ΔE ≥ 0.012 off `paper-95` (light) | low-hierarchy fill, interaction, decorative |
| `wash-89`           | 0.892  | 0.313 | ΔE ≥ 0.012 off `wash-92` (light) | low-hierarchy fill, interaction, decorative |
| `wash-85`           | 0.852  | 0.348 | ΔE ≥ 0.012 off `wash-89` (light) | decorative |
| `wash-80`           | 0.801  | 0.420 | ΔE ≥ 0.012 off `wash-85` (light) | decorative |
| `mark-74-r300`      | 0.738  | 0.550 | 3:1 vs `paper-97` (both modes) | WCAG 1.4.11 non-text: boundaries, UI elements |
| `ink-53-r450`       | 0.530  | 0.767 | 4.5:1 vs `paper-97` (both modes) | first text stop AND emphasis fill (the 2026-07-29 highlight collapse) |
| `ink-42-r650`       | 0.415  | 0.843 | 6.5:1 vs `paper-97` (both modes) | the between text stop (C49 — the promoted cta-ink-hover value) |
| `ink-30-r700`       | 0.300  | 0.919 | 7:1 vs `paper-97` (both modes) | strong text, inverted fill |

¹ `paper-97`'s rootL is the producer target; the separation requirement pushes the resolved
stop darker per seed (typically to L ≈ 0.967) until it stands ΔE ≥ 0.028 off `paper-99`.
The wash rootLs were re-spaced downward to absorb that push holistically (the light wash
values above), and every wash seam carries a ΔE ≥ 0.012 floor so no seed — including
low-chroma grays and muted warms, where chroma contributes nothing to seam distance — can
collapse two adjacent steps.

- A **requirement is a floor**, not a re-placement: a hue whose produced placement already
  clears it doesn't move. In light the contrast floors clamp L *down* (lightest L that
  still clears); in dark they raise L *up* off the near-black paper. Today the dark
  scaffold clears its declared floors everywhere measured — declaring them means any
  future seed or tuning that would break dark legibility fails the gate
  (`npm run req:audit`) instead of shipping.
- Off the scale: the `cta` state family (`cta`/`cta-hover`/`cta-pressed`) are **roles**,
  not stops — the pulled-out button fill and its states. Fills that carry text ship
  `on-cta` — see [On-fill text](#on-fill-text). The `cta-ink` trio is the ink band read
  as states (enabled ≡ ink-53-r450, hover ≡ ink-42-r650, pressed ≡ ink-30-r700 — C49).
- Also off the scale despite the contiguous number: `ink-0` is the **universal anchor**
  (literal #000000 light / #ffffff dark, paired with `paper-100`) — a mode-flipping constant,
  not a per-brand resolved stop.
- **Target vs emitted:** stops are H-K-solved from their rootL target (emitted L shifts by
  hue — see below), then the declared requirements bind: for luminous hues `mark-74-r300`
  lands well below its 0.738 target.

## On-fill text

A fill that carries text ships its text color: `on-cta`, the one on-fill token every
family emits (`on-highlight` was deleted with the highlight collapse, 2026-07-29). The only
criterion is that it **passes**: the engine picks white or black, whichever clears the
bar on that fill. White and black are the contrast extremes, so if neither clears, no
color does — and the fill's L has to move. The pole is chosen by APCA (`apca-pole`,
because WCAG has a dead zone on mid-lightness chromatic fills where neither pole clears
4.5:1), with a WCAG 4.5 enforce floor and a co-enforced Lc 65 on the cta. Declared per
mode as the `ons` block of the spec; the pole choice is `onTextIsWhite`
([`colorMath.ts`](../src/engine/colorMath.ts)).

## The Helmholtz–Kohlrausch curve

At equal measured luminance, a saturated color looks *brighter* than a gray — the
Helmholtz–Kohlrausch effect. The size of that boost depends on hue: large for blue,
red, and violet; small for yellow-green, which is already luminous. Left uncorrected,
`ink-53-r450` would read as a different lightness on every brand.

So the light stops don't use their target lightness directly. For each stop the engine
solves the measured L at which the color's **apparent** (H-K-corrected) lightness equals
a common target — the gray lightness of the stop, plus the average boost at that stop's
chroma:

```
target  = grayLightness(stop) + averageBoost(stop chroma)
emitted = the L where apparentL(L, chroma, hue) == target
```

A high-boost hue is placed at a *lower* measured L to compensate; a low-boost hue is
placed *higher*. They differ in measured L but match in apparent lightness, so the step
reads the same across brands.

Example — `ink-53-r450` (target 0.600):
- **blue** (large boost) emits at L ≈ 0.560 — placed darker
- **yellow-green** (small boost) emits at L ≈ 0.631 — placed lighter
- on screen, both read as the same step

Dark mode runs the same solve, but only where uniform apparent lightness is the stop's
job: the paper/wash **surfaces** (1–7) and the ink **text** stops (9/10/11) are H-K-solved
like light, so they read at one perceived lightness on every brand. The **mark stop**
(8) is the exception: it stays placed at its `DARK_L` target, because it carries a 3:1
border (`mark-74-r300`) and is hand-tuned for legibility; solving it would push some hues
into the APCA body-text dead zone (and ride a solved surface up past the placed stop). So
the mark stop keeps a small per-hue apparent-lightness *wave* by design, legibility over
uniformity, and `divergence-audit` reports that residual so it stays visible. (The
off-scale CTA isn't solved in either mode; it carries the brand fill's own lightness.)

Code: [`perceptualL.ts`](../src/engine/perceptualL.ts) — `apparentL()` is the Nayatani
(1997) H-K model; `perceptualRungL()` is the solve. It's the `'perceptual'` lightness
producer, applied per declared stop by the resolver
([`producers.ts`](../src/reqtoken/producers.ts) / [`resolve.ts`](../src/reqtoken/resolve.ts)).
