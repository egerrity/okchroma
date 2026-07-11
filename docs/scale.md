# The scale

One brand color in, a full ramp out: 2 papers, 5 washes, 2 highlights, and 2 inks (numbered contiguously 1–11), plus the off-scale cta/hover and their on-text colors. Each step has a pre-reserved role and intended accessibility category — so the same step number does the same thing on every brand.
Lightness comes from a declared ladder; chroma is saturation-preserving (a fraction of the
gamut the step allows, scaled by how saturated the brand is). Names fall in four groups
— `paper`, `wash`, `highlight`, `ink` — plus the off-scale `cta` roles.

Code: the **declaration** is [`spec.ts`](../src/reqtoken/spec.ts) (per-stop rootL,
producers, and requirements — the edit surface); the base ladders it draws from are in
[`stopTable.ts`](../src/engine/stopTable.ts) (`LIGHT_L` / `DARK_L`, with the light wash
re-space in `spec.ts` `LIGHT_WASH_ROOT_L`); the names are
[`tokenNames.ts`](../src/engine/tokenNames.ts).

## Stops

Per-stop lightness targets (light and dark), the requirement each stop declares, and the
accessibility category it carries.

| stop | light L | dark L | declared requirement | accessibility |
|---|---:|---:|---|---|
| `paper-1`      | 0.993  | 0.178 | — | app background, inverted text |
| `paper-2`      | 0.982¹ | 0.213 | ΔE ≥ 0.028 off `paper-1` (light) | raised background, inverted text |
| `wash-3`       | 0.945  | 0.252 | ΔE ≥ 0.012 off `paper-2` (light) | low-hierarchy fill, interaction |
| `wash-4`       | 0.9225 | 0.285 | ΔE ≥ 0.012 off `wash-3` (light) | low-hierarchy fill, interaction, decorative |
| `wash-5`       | 0.891  | 0.313 | ΔE ≥ 0.012 off `wash-4` (light) | low-hierarchy fill, interaction, decorative |
| `wash-6`       | 0.8495 | 0.348 | ΔE ≥ 0.012 off `wash-5` (light) | decorative |
| `wash-7`       | 0.797  | 0.420 | ΔE ≥ 0.012 off `wash-6` (light) | decorative |
| `highlight-8`  | 0.738  | 0.550 | 3:1 vs `paper-2` (both modes) | WCAG 1.4.11 non-text: boundaries, UI elements |
| `highlight-9`  | 0.600  | 0.600 | — (placed) | element fills with on-text |
| `ink-10`       | 0.530  | 0.800 | 4.5:1 vs `paper-2` (both modes) | text, inverted fill |
| `ink-11`       | 0.300  | 0.940 | 7:1 vs `paper-2` (both modes) | text, inverted fill |

¹ `paper-2`'s rootL is the producer target; the separation requirement pushes the resolved
stop darker per seed (typically to L ≈ 0.967) until it stands ΔE ≥ 0.028 off `paper-1`.
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
- Off the scale: `cta-1` / `cta-2` are **roles**, not stops — the pulled-out button fill +
  hover (also a 3:1 UI element). Fills that carry text ship `on-highlight` / `on-cta` —
  see [On-fill text](#on-fill-text).
- Also off the scale despite the contiguous number: `ink-12` is the **universal anchor**
  (literal #000000 light / #ffffff dark, paired with `paper-0`) — a mode-flipping constant,
  not a per-brand resolved stop.
- **Target vs emitted:** stops are H-K-solved from their rootL target (emitted L shifts by
  hue — see below), then the declared requirements bind: for luminous hues `highlight-8`
  lands well below its 0.738 target.

## On-fill text

A fill that carries text ships its text color — `on-highlight`, `on-cta`. The only
criterion is that it **passes**: the engine picks white or black, whichever clears the
bar on that fill. White and black are the contrast extremes, so if neither clears, no
color does — and the fill's L has to move. The highlight is judged by APCA (body-text
Lc 60), because WCAG has a dead zone on mid-lightness chromatic fills where neither pole
clears 4.5:1; the cta uses WCAG 4.5. Declared per mode as the `ons` block of the spec
(`apca-pole`, with the WCAG enforce fallback on `on-cta`); the pole choice is
`onTextIsWhite` ([`colorMath.ts`](../src/engine/colorMath.ts)).

## The Helmholtz–Kohlrausch curve

At equal measured luminance, a saturated color looks *brighter* than a gray — the
Helmholtz–Kohlrausch effect. The size of that boost depends on hue: large for blue,
red, and violet; small for yellow-green, which is already luminous. Left uncorrected,
`highlight-9` would read as a different lightness on every brand.

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

Example — `highlight-9` (target 0.600):
- **blue** (large boost) emits at L ≈ 0.560 — placed darker
- **yellow-green** (small boost) emits at L ≈ 0.631 — placed lighter
- on screen, both read as the same step

Dark mode runs the same solve, but only where uniform apparent lightness is the stop's
job: the paper/wash **surfaces** (1–7) and the ink **text** stops (10/11) are H-K-solved
like light, so they read at one perceived lightness on every brand. The **highlight band**
(8–9) is the exception — it stays placed at its `DARK_L` target, because those stops carry
on-text (highlight-9) or a 3:1 border (highlight-8) and is hand-tuned for legibility;
solving them would push some hues into the APCA body-text dead zone (and ride a solved
surface up past the placed band). So the highlight band keeps a small per-hue
apparent-lightness *wave* by design — legibility over uniformity — and `divergence-audit`
reports that residual so it stays visible. (The off-scale CTA isn't solved in either mode;
it carries the brand fill's own lightness.)

Code: [`perceptualL.ts`](../src/engine/perceptualL.ts) — `apparentL()` is the Nayatani
(1997) H-K model; `perceptualRungL()` is the solve. It's the `'perceptual'` lightness
producer, applied per declared stop by the resolver
([`producers.ts`](../src/reqtoken/producers.ts) / [`resolve.ts`](../src/reqtoken/resolve.ts)).
