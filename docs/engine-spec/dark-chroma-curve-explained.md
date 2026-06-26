# Dark-mode chroma, explained (plain-language)

How the dark-mode color curve works, why it relates to light mode, and why it scales
to *any* brand color without per-color patches. Written for a non-engineer. Ladders into
the "chroma curve vs neutral" graph task. Code lives in `src/engine/darkChromaCurve.ts`
and the dark sites of `src/engine/colorEngine.ts`.

## The mental model

Every color is three numbers: how **light** it is (L), its **hue** (H — where it sits on
the color wheel), and its **chroma** (C — how colorful/saturated). Dark mode keeps the
lightness and hue and only recomputes **how colorful each step is**.

## Light mode already works as "brand chroma × a recipe"

Simplified light-mode line (`colorEngine.ts`, the stops 1–8 loop):

```
LIGHT  →  chroma = brandColorfulness  ×  recipe[step]
                   └ the brand's own      └ a fixed list of 12 numbers (LIGHT_BASE_C),
                     colorfulness            the SAME for every brand
```

Step 1 (palest) gets a tiny fraction; the solid fill gets the most. One shared recipe —
not per color.

## Dark mode is the same shape, plus one dial

```
DARK   →  chroma = brandColorfulness  ×  shape[step]  ×  calmDown(hue)
                   └ same                └ a recipe       └ NEW: the only
                     brand value           tuned for         dark-specific part
                                           dark legibility
```

The first two pieces are light's structure (`brandC × shapeAt(L)`). Dark's recipe
(`SHAPE_DARK`) is a different list of numbers — a per-stop dark chroma shape with the
deep stops bumped for dark legibility — but the structure is identical. The third piece is
the only thing dark adds.

## The dial — why it isn't bolted-on per color

`calmDown(hue)` (`loudnessCap` + `capMix` in `darkChromaCurve.ts`):

```
calmDown(hue) = 0.76 × (1 − dip near blue/violet − dip near red/magenta)
```

`dip` is a smooth cosine bump. **There is no "if the color is blue, do X" anywhere.** A
color's hue is a *number* fed into one formula. Blue gets calmed because blue's hue
(≈265°) lands in the dip of the curve — geometry, not a rule. Yellow/green (≈90–150°) sit
at the top and pass through. The `0.76` is an overall "everything is a touch calmer on
dark" baseline; the dips below it are the *extra* calming for the hues that actually glow.

Refinement: the dial only bites the **mid-surface tones** (`bandWeight`) — the near-black
deep stops keep their tint and the text/fill stay uncapped — because bloom is a
mid-lightness effect.

## Why it scales

- **A brand-new color needs zero new code.** Its three numbers flow through the same three
  functions. A brand at hue 200° automatically reads ~62% off the curve — nobody wrote
  that case.
- **Light and dark are siblings**, not two hand-built systems: both are
  `colorfulness × recipe`. Dark adds the one hue-dial.
- **The tuned constants are all GLOBAL knobs** — the two recipe lists (light's
  `LIGHT_BASE_C`, dark's `SHAPE_DARK`), the dial's depth/center, the highlight's black-flip
  lightness. Every one applies to all colors at once. **Zero per-color rules.** The only
  per-color input is the brand's own hex.

This is the opposite of the old dark mode ("lift this fill, darken that rung, mute this
red"). The value now falls out of one pipeline.

## The two accents (cta vs highlight)

- **cta** = `brandColorfulness × darkCtaTrim(hue)` — keeps most of its loudness (it's the
  primary action), trimmed gently on the glowy hues. The bright, brand-true element.
- **highlight** = a *predictable* moderate chip that, in dark mode, **flips to black
  on-text** and sits at the lightness where black is legible (~L0.58), with a midpoint
  chroma. Darker and quieter than the cta — draws attention without screaming. One rule
  for all colors (it finds the black-legible lightness by formula, not per color).

Role hierarchy on dark: **cta** (bright/loud) → **highlight** (deep/predictable) →
**surfaces** (calm, tinted) → **paper** (deep, faintly tinted).
