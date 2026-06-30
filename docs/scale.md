# The scale

One brand color in, a 12-step scale out. Each step has a pre-reserved role and intended accessibility category — so the same step number does the same thing on every brand.
Lightness comes from a fixed ladder; chroma is saturation-preserving (a fraction of the
gamut the step allows, scaled by how saturated the brand is). Names fall in four groups
— `paper`, `wash`, `highlight`, `ink` — plus an off-scale `cta` fill.

Code: [`stopTable.ts`](../src/engine/stopTable.ts) (`LIGHT_L` / `DARK_L`),
[`colorEngine.ts`](../src/engine/colorEngine.ts) (`generateScale`),
[`tokenNames.ts`](../src/engine/tokenNames.ts) (the names).

## Stops

Per-stop lightness targets (light and dark) and the accessibility category each stop
carries. The L targets are the shape — they live in `stopTable.ts` as `LIGHT_L` /
`DARK_L`; edit them there.

| stop | light L | dark L | accessibility |
|---|---:|---:|---|
| `paper-1`      | 0.993 | 0.178 | surface, inverted text |
| `paper-2`      | 0.982 | 0.213 | surface, inverted text |
| `wash-3`       | 0.960 | 0.252 | surface, surface interaction |
| `wash-4`       | 0.936 | 0.285 | surface, surface interaction, decorative |
| `wash-5`       | 0.903 | 0.313 | surface, surface interaction, decorative |
| `wash-6`       | 0.860 | 0.348 | decorative |
| `wash-7`       | 0.806 | 0.420 | decorative |
| `highlight-8`  | 0.738 | 0.550 | 3:1 UI element, accessible borders |
| `highlight-9`  | 0.600 | 0.600 | 3:1 UI element, accessible borders, element fills |
| `highlight-10` | 0.560 | 0.640 | 3:1 UI element, accessible borders, element fills |
| `ink-11`       | 0.530 | 0.800 | 4.5:1 text, inverted surface |
| `ink-12`       | 0.300 | 0.940 | 7:1 text, inverted surface |

- Contrast-floored in light; in dark these stops are placed directly (no clamp) — the
  `DARK_L` scaffold already clears the ratio across the whole gamut, verified by
  `divergence-audit` (worst dark: `highlight-8` 3.4:1, `ink-11` 9.1:1, `ink-12` 14.7:1)
  rather than actively clamped like light. The floors: `highlight-8`
  (`STOP_8_NONTEXT_CONTRAST` 3.0), `ink-11` (`STOP_11_CONTRAST` 4.5), `ink-12`
  (`STOP_12_CONTRAST_FLOOR` 7.0). In light each is clamped down to the lightest L that
  still clears its ratio against `paper-2`.
- Off the scale: `cta-1` / `cta-2`, the pulled-out button fill (also a 3:1 UI element).
  Fills that carry text ship `on-highlight` / `on-cta` — see [On-fill text](#on-fill-text).
- **Target vs emitted:** dark is placed directly (target = emitted); light is H-K-solved
  (the target is what the solver aims at — emitted shifts by hue); light `highlight-8`
  and `ink-11/12` are additionally capped by the contrast floor (3:1 / 4.5 / 7 against
  `paper-2`), so for luminous hues `highlight-8` lands well below its 0.738 target.

## On-fill text

A fill that carries text ships its text color — `on-highlight`, `on-cta`. The only
criterion is that it **passes**: the engine picks white or black, whichever clears the
bar on that fill. White and black are the contrast extremes, so if neither clears, no
color does — and the fill's L has to move. The highlight is judged by APCA (body-text
Lc 60), because WCAG has a dead zone on mid-lightness chromatic fills where neither pole
clears 4.5:1; the cta uses WCAG 4.5. Code: `onTextIsWhite`
([`colorEngine.ts`](../src/engine/colorEngine.ts)).

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
job: the paper/wash **surfaces** (1–7) and the ink **text** stops (11/12) are H-K-solved
like light, so they read at one perceived lightness on every brand. The **highlight band**
(8–10) is the exception — it stays placed at its `DARK_L` target, because those stops carry
on-text (highlight-9/10) or a 3:1 border (highlight-8) and are hand-tuned for legibility;
solving them would push some hues into the APCA body-text dead zone (and ride a solved
surface up past the placed band). So the highlight band keeps a small per-hue
apparent-lightness *wave* by design — legibility over uniformity — and `divergence-audit`
reports that residual so it stays visible. (The off-scale CTA isn't solved in either mode;
it carries the brand fill's own lightness.)

Code: [`perceptualL.ts`](../src/engine/perceptualL.ts) — `apparentL()` is the Nayatani
(1997) H-K model; `perceptualRungL()` is the solve. It's applied per stop in
`generateScale` ([`colorEngine.ts`](../src/engine/colorEngine.ts), the `LIGHT_STOPS`
loop).
