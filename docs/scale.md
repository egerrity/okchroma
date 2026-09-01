# The scale

One brand color in, a full ramp out: 3 papers, 4 highlighters, 1 crayon, 1 pencil, and 2
pens, plus the two poles and the off-scale stamp family with its on-text color. Every
name follows one pattern, `instrument-NN`: the instrument word (`paper`, `highlighter`,
`crayon`, `pencil`, `pen`) says which law the stop serves; the number places it on the
ladder. The engine still carries internal stop indices 1 to 11 for its own scale
machinery, but those indices are not the names: a stop is addressed by what it is, not
by its position. Each stop has a pre-reserved role and an accessibility guarantee, so the
same name does the same thing on every brand.

Lightness comes from a declared ladder; chroma is saturation-preserving (a fraction of
the gamut the step allows, scaled by how saturated the brand is). Names fall in five
instruments — `paper`, `highlighter`, `crayon`, `pencil`, `pen` — plus the off-scale
`stamp` roles.

## The instruments

The five words are the five contrast duties, and the boundaries between them are exact:
measured over the seed roster in both modes, no stop straddles a duty.

| instrument | stops | the duty |
|---|---|---|
| `paper` | 0 · 1 · 3 · 5 | grounds: the surface planes and role backgrounds; no contrast obligation of their own |
| `highlighter` | 8 · 11 · 15 · 20 | decorative and state grounds (hover, selected, pressed — the highlighter law); never text |
| `crayon` | 26 | **3:1 on every paper** — WCAG 1.4.11 non-text: borders, focus rings, icons, large text |
| `pencil` | 47 | **4.5:1 on every paper** — regular text, AA |
| `pen` | 58 · 70 · 100 | **4.5:1 on every highlighter and every paper** — text that must hold on tinted grounds, AA |

The promise, in one line: **pen writes on paper and highlighter; pencil writes on
paper; crayon writes large and draws on paper.** That is the whole guarantee — and
large text is 3:1, which is why it is crayon's.

"On every paper" means the family's own papers and the worst paper the family's
generated neutral can produce across all hues. Pencil and crayon are cleared against
paper only; pen is anchored at `highlighter-20`, the darkest highlighter, and by ladder
monotonicity therefore clears every paper as well. The promise is a **guaranteed minimum**
of 4.5:1 (AA) on every text stop. WCAG has three levels — 3:1, 4.5:1, 7:1 — and 4.5 is
the one promised; where the engine places a stop above it, the surplus is placement, not
a promise, and no AAA claim is made anywhere.

## The number

The number is the stop's **declared light rootL, rounded, then inverted**: `100 − round(rootL × 100)`.
The order of those three steps is the rule — derive, round, invert — and it is never
re-rounded after inversion. So `paper-0` is pure white (rootL 1.00), `paper-1` is
rootL 0.987, `crayon-26` is rootL 0.738, `pen-70` is rootL 0.300, and `pen-100` is the
black pole. Bigger means stronger. A future stop names itself by the same three steps,
from its own declared rootL.

(History: Stage B, 2026-08-07, first replaced index names with `band-LL`, the rootL
digit un-inverted; the `-aa`/`-aaa` conformance suffixes came and went the same month,
retired 2026-08-21 because Figma's picker searches descriptions and the letters flooded
it. The instruments rename, 2026-08-31, replaced the pigment-carrier band words
paper/wash/wax/lead/ink with the instruments and inverted the digit. Names only, every
time — no value has moved through any rename.)

### Reading a name

In the extended Figma plugin, a full path adds two segments in front of the instrument
word: the register (which panel a row lives in) and the family. The register and family
are groups (slash-separated); the instrument joins its number with a hyphen, so the
token name itself is one flat leaf. Read left to right, `base/neutral/pencil-47`:

| segment | example | meaning |
|---|---|---|
| register | `base` | the extended plugin's wrapper, carried by every row |
| family | `neutral` | which color family the stop belongs to: neutral, brand, brand-alt, or a signal |
| instrument | `pencil` | which law the stop serves: `paper`, `highlighter`, `crayon`, `pencil`, or `pen` |
| number | `47` | 100 − the stop's light rootL × 100, rounded |

The plain engine/CSS name drops the first two segments (there is one register, one
family per emitted block): `pencil-47`, not the full path; the CSS custom property is
`--neutral-pencil-47`. One spelling everywhere — engine identity, Figma leaf, CSS var
body — is the rule. The register mechanism is documented in
[architecture.md](architecture.md).

Code: the **declaration** is [`spec.ts`](../src/engine/requirements/spec.ts) (per-stop rootL,
producers, and requirements: the edit surface); the base ladders it draws from are in
[`stopTable.ts`](../src/engine/stopTable.ts) (`ROOT_L_LIGHT` / `ROOT_L_DARK`); the names
are the one table in [`tokenNames.ts`](../src/engine/tokenNames.ts) — every emitter and
plugin reads it, so a rename is an edit there plus a migration entry in the plugins'
`RENAMED_LEAVES`.

## Stops

Per-stop lightness targets (light and dark), the requirement each stop declares (where
one exists), and the accessibility category it carries.

| stop | index | light L | dark L | declared requirement | accessibility |
|---|---:|---:|---:|---|---|
| `paper-0` | — | 1.000 | 0.000 | – | the light pole (white; black in dark): the high plane in light, the dim plane in dark |
| `paper-1` | 1 | 0.987 | 0.178 | – | app background, inverted text |
| `paper-3` | 2 | 0.970 | 0.213 | – | raised background, inverted text |
| `paper-5` | 3 | 0.950 | 0.252 | – | surface plane (light sunken / dark high) |
| `highlighter-8` | 4 | 0.924 | 0.285 | – | hover ground, low-hierarchy fill, decorative |
| `highlighter-11` | 5 | 0.892 | 0.313 | – | selected ground, low-hierarchy fill, decorative |
| `highlighter-15` | 6 | 0.852 | 0.348 | – | pressed ground, decorative |
| `highlighter-20` | 7 | 0.801 | 0.420 | – | decorative; the ground pen is cleared against |
| `crayon-26` | 8 | 0.738 | 0.550 | 3:1 on every paper | WCAG 1.4.11 non-text: boundaries, UI elements, icons, large text |
| `pencil-47` | 9 | 0.530 | 0.767 | 4.5:1 on every paper | first text stop AND the emphasis fill |
| `pen-58` | 10 | 0.415 | 0.843 | 4.5:1 on every highlighter (anchored at `highlighter-20`) | the between text stop |
| `pen-70` | 11 | 0.300 | 0.919 | 4.5:1 guaranteed minimum on every highlighter and paper | strong text, inverted fill |
| `pen-100` | — | 0.000 | 1.000 | – | the dark pole (black; white in dark): the universal anchor |

Paper and highlighter carry no declared requirement: their seam distinctness is a
property of the `ROOT_L_LIGHT` ladder's own shape, not a runtime floor. The near-white
gaps grow geometrically (about 1.25x per step), so `paper-3` already stands roughly
0.017 ΔE off `paper-1` by construction, with no push or clamp applied at resolve time.
The resolver still supports a declared `min-separation` requirement for portable specs
(see [schema.md](schema.md)), but the shipped spec declares none: the shape alone holds
every seam open, including for low-chroma grays and muted warms.

`crayon-26`, `pencil-47`, and the two pens do carry a declared WCAG requirement, checked
and enforced against the resolved reference stop on every apply. In the shipped WCAG lane
the resolver anchors crayon and pencil at the nearest paper (`paper-5`) rather than at
whichever paper `spec.ts` names, and separately clears the worst paper the family's own
generated neutral can produce; the pens anchor at `highlighter-20`. The mechanism is
documented in [architecture.md](architecture.md)'s requirement section.

- A **requirement is a floor**, not a re-placement: a hue whose produced placement already
  clears it doesn't move. In light the contrast floors clamp L *down* (lightest L that
  still clears); in dark they raise L *up* off the near-black paper. Declaring them means
  any future seed or tuning that would break legibility fails the gate
  (`npm run req:audit`, `npm run audit:guarantee`) instead of shipping.
- Off the scale: the `stamp` state family (`stamp/fill`, `stamp/fill-hover`,
  `stamp/fill-pressed`, `stamp/edge`) are **roles**, not stops: the pulled-out button
  fill, its states, and its always-rendered edge. Fills that carry text ship `stamp/on`
  (see [On-fill text](#on-fill-text)). The text-style cta is the text stops read directly
  (rest ≡ `pencil-47`, hover ≡ `pen-58`, pressed ≡ `pen-70`).
- The poles: `paper-0` is resolved (white in light; in dark the deep, brand-tinted plane
  one seam below `paper-1`) and `pen-100` is the literal anchor (#000000 light / #ffffff
  dark). Both flip with the mode; neither is a per-brand ladder stop. They exist under
  `neutral` only.
- **Target vs emitted:** stops are H-K-solved from their rootL target (emitted L shifts by
  hue, see below), then the declared requirements bind: for luminous hues `crayon-26`
  lands well below its 0.738 target.

## On-fill text

A fill that carries text ships its text color: `stamp/on`, the one on-fill token every
family emits. The only criterion is that it **passes**: the engine picks white or black,
whichever clears the bar on that fill. White and black are the contrast extremes, so if
neither clears, no color does, and the fill's L has to move. The pole is chosen by APCA
(`apca-pole`, because WCAG has a dead zone on mid-lightness chromatic fills where neither
pole clears 4.5:1), with a WCAG 4.5 enforce floor and a co-enforced Lc 65 on the stamp.
Declared per mode as the `ons` block of the spec; the pole choice is `onTextIsWhite`
([`colorMath.ts`](../src/engine/colorMath.ts)).

## The Helmholtz–Kohlrausch curve

At equal measured luminance, a saturated color looks *brighter* than a gray: the
Helmholtz–Kohlrausch effect. The size of that boost depends on hue: large for blue,
red, and violet; small for yellow-green, which is already luminous. Left uncorrected,
`pencil-47` would read as a different lightness on every brand.

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

Example: `pencil-47` (target 0.600):
- **blue** (large boost) emits at L ≈ 0.560, placed darker
- **yellow-green** (small boost) emits at L ≈ 0.631, placed lighter
- on screen, both read as the same step

Dark mode runs the same solve, but only where uniform apparent lightness is the stop's
job: the paper/highlighter **surfaces** (indices 1–7) and the **text** stops (9/10/11) are
H-K-solved like light, so they read at one perceived lightness on every brand. The
**crayon** (index 8) is the exception: it stays placed at its `DARK_L` target, because it
carries a 3:1 border and is hand-tuned for legibility; solving it would push some hues
into the APCA body-text dead zone (and ride a solved surface up past the placed stop). So
the crayon keeps a small per-hue apparent-lightness *wave* by design, legibility over
uniformity, and `divergence-audit` reports that residual so it stays visible. (The
off-scale stamp isn't solved in either mode; it carries the brand fill's own lightness.)

Code: [`perceptualL.ts`](../src/engine/perceptualL.ts): `apparentL()` is the Nayatani
(1997) H-K model; `perceptualRungL()` is the solve. It's the `'perceptual'` lightness
producer, applied per declared stop by the resolver
([`producers.ts`](../src/engine/requirements/producers.ts) / [`resolve.ts`](../src/engine/requirements/resolve.ts)).
