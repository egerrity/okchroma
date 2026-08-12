# The scale

One brand color in, a full ramp out: 3 papers, 4 washes, 1 mark, and 3 inks, plus the
off-scale cta/hover and their on-text colors. Every name follows one pattern,
`band-LL` or `band-LL-aa` / `band-LL-aaa`: the band word (`paper`, `wash`, `mark`,
`ink`), the stop's visibility (its light rootL times 100, rounded), and, where a WCAG
level is central to the stop's job, the conformance letters it certifies. The engine
still carries internal stop indices 1 to 11 for its own scale machinery, but those
indices are not the names: a stop is addressed by what it is, not by its position.
Each stop has a pre-reserved role and intended accessibility category, so the same
name does the same thing on every brand.

Lightness comes from a declared ladder; chroma is saturation-preserving (a fraction of
the gamut the step allows, scaled by how saturated the brand is). Names fall in four
groups: `paper`, `wash`, `mark`, and `ink`, plus the off-scale `cta` roles.

Stage B (2026-08-07, names only, no color changed) gave every name its own placement: a
bare number is the stop's light rootL times 100, rounded (`paper-99` sits at rootL ≈
0.99). A same-day follow-up (2026-08-07, also names only) replaced the mark/ink stops'
ratio-coded suffix with a WCAG conformance letter. A stop whose job is a certified WCAG
floor carries the suffix `-aa` or `-aaa`: `mark-74-aa` is the rootL-74 stop, its non-text
1.4.11 gate carried by the band word `mark` itself, certified AA at 3:1; `ink-53-aa` is
rootL-53, certified AA at 4.5:1 text contrast; `ink-42-aa` is rootL-42, certified against
a 6.5:1 house floor, stricter than the AA text minimum but short of AAA, so the name
states the conformance level it clears rather than its own ratio; `ink-30-aaa` is rootL-30,
certified AAA at 7:1. The exact ratio each stop targets is engine mechanism (`spec.ts` /
`stopTable.ts`), not part of the name. The conformance suffix is present only where a
requirement is central to the stop's job, not on every stop that happens to declare one.

### Reading a name

In the extended Figma plugin, a full path adds two more segments in front of the band
word: the register (which panel a row lives in) and the family. The register and family
are groups (slash-separated); the band joins its visibility and conformance with
hyphens, so the token name itself is one flat leaf. Read left to right,
`primitive/neutral/ink-53-aa`:

| segment | example | meaning |
|---|---|---|
| register | `primitive` | the extended plugin's wrapper, carried by every row |
| family | `neutral` | which color family the stop belongs to: neutral, brand-primary, brand-secondary, or a signal |
| band | `ink` | which law the stop serves: `paper`, `wash`, `mark`, or `ink` |
| visibility | `53` | the stop's light rootL times 100, rounded |
| conformance | `aa` | the WCAG level this stop certifies, present only where a requirement is central to the stop's job |

The plain engine/CSS name drops the first two segments (there is one register, one
family per emitted block): `ink-53-aa`, not the full path. The register mechanism is
documented in [architecture.md](architecture.md).

Code: the **declaration** is [`spec.ts`](../src/engine/requirements/spec.ts) (per-stop rootL,
producers, and requirements: the edit surface); the base ladders it draws from are in
[`stopTable.ts`](../src/engine/stopTable.ts) (`ROOT_L_LIGHT` / `ROOT_L_DARK`: the wash
re-space is baked directly into `ROOT_L_LIGHT`'s values, not a separate constant); the
names are [`tokenNames.ts`](../src/engine/tokenNames.ts).

## Stops

Per-stop lightness targets (light and dark), the requirement each stop declares (where
one exists), and the accessibility category it carries.

| stop | light L | dark L | declared requirement | accessibility |
|---|---:|---:|---|---|
| `paper-99`          | 0.987  | 0.178 | – | app background, inverted text |
| `paper-97`          | 0.970  | 0.213 | – | raised background, inverted text |
| `paper-95`          | 0.950  | 0.252 | – | surface plane (light sink / dark pop) |
| `wash-92`           | 0.924  | 0.285 | – | low-hierarchy fill, interaction, decorative |
| `wash-89`           | 0.892  | 0.313 | – | low-hierarchy fill, interaction, decorative |
| `wash-85`           | 0.852  | 0.348 | – | decorative |
| `wash-80`           | 0.801  | 0.420 | – | decorative |
| `mark-74-aa`      | 0.738  | 0.550 | 3:1, on every paper | WCAG 1.4.11 non-text: boundaries, UI elements |
| `ink-53-aa`       | 0.530  | 0.767 | 4.5:1, on every paper | first text stop AND emphasis fill (the 2026-07-29 highlight collapse) |
| `ink-42-aa`       | 0.415  | 0.843 | 6.5:1, on every paper | the between text stop (C49, promoted from the retired text-cta hover state) |
| `ink-30-aaa`       | 0.300  | 0.919 | 7:1, on every paper | strong text, inverted fill |

Paper and wash carry no declared requirement: their seam distinctness is a property of
the `ROOT_L_LIGHT` ladder's own shape, not a runtime floor. The near-white gaps grow
geometrically (about 1.25x per step), so `paper-97` already stands roughly 0.017 ΔE off
`paper-99` by construction, with no push or clamp applied at resolve time. The resolver
still supports a declared `min-separation` requirement for portable specs (see
[schema.md](schema.md)), but the shipped spec declares none: the shape alone holds every
seam open, including for low-chroma grays and muted warms, the cases that used to need a
runtime push (`spec.ts`, the comment directly above the `LIGHT` export).

`mark-74-aa` and the three ink stops do carry a declared WCAG requirement, checked and
enforced against the resolved reference stop on every apply. "On every paper" is a
deliberately unnamed floor: in the shipped WCAG lane the resolver anchors every stop from
`mark-74-aa` up at the nearest paper rather than at whichever paper `spec.ts` happens to
name, and separately clears the worst paper the family's own generated neutral can
produce across all hues. The mechanism, including which stop is actually named where, is
documented in [architecture.md](architecture.md)'s requirement section.

- A **requirement is a floor**, not a re-placement: a hue whose produced placement already
  clears it doesn't move. In light the contrast floors clamp L *down* (lightest L that
  still clears); in dark they raise L *up* off the near-black paper. Today the dark
  scaffold clears its declared floors everywhere measured; declaring them means any
  future seed or tuning that would break dark legibility fails the gate
  (`npm run req:audit`) instead of shipping.
- Off the scale: the `cta` state family (`cta`/`cta-hover`/`cta-pressed`) are **roles**,
  not stops: the pulled-out button fill and its states. Fills that carry text ship
  `on-cta` (see [On-fill text](#on-fill-text)). The text-style cta is the ink stops
  read directly (rest ≡ ink-53-aa, hover ≡ ink-42-aa, pressed ≡ ink-30-aaa); the
  separate `cta-ink` alias trio was deleted 2026-08-12.
- Also off the scale despite sitting at the ink band's zero end: `ink-0` is the
  **universal anchor** (literal #000000 light / #ffffff dark, paired with `paper-100`), a
  mode-flipping constant, not a per-brand resolved stop.
- **Target vs emitted:** stops are H-K-solved from their rootL target (emitted L shifts by
  hue, see below), then the declared requirements bind: for luminous hues `mark-74-aa`
  lands well below its 0.738 target.

## On-fill text

A fill that carries text ships its text color: `on-cta`, the one on-fill token every
family emits (`on-highlight` was deleted with the highlight collapse, 2026-07-29). The only
criterion is that it **passes**: the engine picks white or black, whichever clears the
bar on that fill. White and black are the contrast extremes, so if neither clears, no
color does, and the fill's L has to move. The pole is chosen by APCA (`apca-pole`,
because WCAG has a dead zone on mid-lightness chromatic fills where neither pole clears
4.5:1), with a WCAG 4.5 enforce floor and a co-enforced Lc 65 on the cta. Declared per
mode as the `ons` block of the spec; the pole choice is `onTextIsWhite`
([`colorMath.ts`](../src/engine/colorMath.ts)).

## The Helmholtz–Kohlrausch curve

At equal measured luminance, a saturated color looks *brighter* than a gray: the
Helmholtz–Kohlrausch effect. The size of that boost depends on hue: large for blue,
red, and violet; small for yellow-green, which is already luminous. Left uncorrected,
`ink-53-aa` would read as a different lightness on every brand.

So the light stops don't use their target lightness directly. For each stop the engine
solves the measured L at which the color's **apparent** (H-K-corrected) lightness equals
a common target, the gray lightness of the stop plus the average boost at that stop's
chroma:

```
target  = grayLightness(stop) + averageBoost(stop chroma)
emitted = the L where apparentL(L, chroma, hue) == target
```

A high-boost hue is placed at a *lower* measured L to compensate; a low-boost hue is
placed *higher*. They differ in measured L but match in apparent lightness, so the step
reads the same across brands.

Example: `ink-53-aa` (target 0.600):
- **blue** (large boost) emits at L ≈ 0.560, placed darker
- **yellow-green** (small boost) emits at L ≈ 0.631, placed lighter
- on screen, both read as the same step

Dark mode runs the same solve, but only where uniform apparent lightness is the stop's
job: the paper/wash **surfaces** (1–7) and the ink **text** stops (9/10/11) are H-K-solved
like light, so they read at one perceived lightness on every brand. The **mark stop**
(8) is the exception: it stays placed at its `DARK_L` target, because it carries a 3:1
border (`mark-74-aa`) and is hand-tuned for legibility; solving it would push some hues
into the APCA body-text dead zone (and ride a solved surface up past the placed stop). So
the mark stop keeps a small per-hue apparent-lightness *wave* by design, legibility over
uniformity, and `divergence-audit` reports that residual so it stays visible. (The
off-scale CTA isn't solved in either mode; it carries the brand fill's own lightness.)

Code: [`perceptualL.ts`](../src/engine/perceptualL.ts): `apparentL()` is the Nayatani
(1997) H-K model; `perceptualRungL()` is the solve. It's the `'perceptual'` lightness
producer, applied per declared stop by the resolver
([`producers.ts`](../src/engine/requirements/producers.ts) / [`resolve.ts`](../src/engine/requirements/resolve.ts)).
