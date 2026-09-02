# The scale

One brand color in, a full ramp out: 3 papers, 4 highlighters, 1 crayon, 1 pencil, and 2
pens, plus the two poles (neutral only) and the off-scale stamp with its on-text color.
Every name follows one pattern, `instrument-NN`: the instrument word (`paper`,
`highlighter`, `crayon`, `pencil`, `pen`) says which law the stop serves; the number places
it on the ladder. The engine carries internal stop indices 1 to 11 for its own machinery,
but those indices are not the names: a stop is addressed by what it is, not by its position.
Each stop has a reserved role and a contrast guarantee, so the same name does the same
thing on every brand.

The site is the source for the scale's mechanism and claims:
[Output contract](https://egerrity.github.io/okchroma/#/docs/output),
[Guarantees](https://egerrity.github.io/okchroma/#/docs/guarantees),
[How the theme is generated](https://egerrity.github.io/okchroma/#/docs/generation). This
file is the repo-side summary with the code pointers.

## The instruments

| instrument | stops | the duty |
|---|---|---|
| `paper` | 0 · 1 · 3 · 5 | grounds: the surface planes and role backgrounds; no contrast obligation of their own |
| `highlighter` | 8 · 11 · 15 · 20 | grounds for subtle states and decoration; never text |
| `crayon` | 26 | **3:1 on every paper**: focus rings, icons, borders, large text. The bar for anything that must be visible to operate the interface (the WCAG non-text contrast requirement) |
| `pencil` | 47 | **4.5:1 on every paper**: regular text, AA; also the emphasis fill |
| `pen` | 58 · 70 · 100 | **4.5:1 on every paper and highlighter of its own family or of the neutral, both directions**: text that must hold on tinted grounds, AA |

The promise in one line: pen writes on paper and highlighter; pencil writes on paper;
crayon writes large and draws on paper.

"On every paper" means the family's own papers and the worst paper the family's generated
neutral can produce across all hues; for the neutral's own stops it means the neutral's
papers and the worst paper any chromatic family can produce. Crayon and pencil are cleared
against paper only. `pen-58` is anchored at `highlighter-20`, the darkest highlighter, and
so clears every paper by ladder order; `pen-70` is declared against a paper at a stricter
target and clears the highlighters by sitting past `pen-58`. The neutral's pens are also
cleared against the worst `highlighter-20` any chromatic family can produce. The promise is a
guaranteed minimum of 4.5:1 (AA) on every text stop. Where the engine places a stop above
it, the surplus is placement, not a promise, and no AAA claim is made anywhere.

## The number

The number is the stop's declared light rootL, rounded, then inverted:
`100 − round(rootL × 100)`. The order of those three steps is the rule (derive, round,
invert) and it is never re-rounded after inversion. So `paper-0` is pure white (rootL 1.00),
`paper-1` is rootL 0.987, `crayon-26` is rootL 0.738, `pen-70` is rootL 0.300, and `pen-100`
is the black pole. Bigger means stronger. A future stop names itself by the same three steps
from its own declared rootL. Renames are recorded in [CHANGELOG.md](../CHANGELOG.md);
every rename has been names only, no value has moved through one.

### Reading a name

In the extended Figma plugin a full path adds two segments in front of the instrument word:
the ownership zone and the family. The zone and family are groups (slash-separated); the
instrument joins its number with a hyphen, so the token name itself is one flat leaf. Read
left to right, `base/neutral/pencil-47`:

| segment | example | meaning |
|---|---|---|
| zone | `base` | the extended plugin's ownership zone: `base/` engine-owned, `utility/` team-touchable |
| family | `neutral` | which family the stop belongs to: neutral, brand, brand-alt, or a signal |
| instrument | `pencil` | which law the stop serves |
| number | `47` | 100 − the stop's light rootL × 100, rounded |

The plain engine and CSS name drops the first two segments (there is one zone, one family
per emitted block): `pencil-47`, and the CSS custom property is `--neutral-pencil-47`. One
spelling everywhere (engine identity, Figma leaf, CSS variable body) is the rule.

Code: the declaration is [`spec.ts`](../src/engine/requirements/spec.ts) (per-stop rootL,
producers, and requirements: the edit surface); the ladders it draws from are in
[`stopTable.ts`](../src/engine/stopTable.ts) (`ROOT_L_LIGHT` / `ROOT_L_DARK`); the names are
the one table in [`tokenNames.ts`](../src/engine/tokenNames.ts). Every emitter and plugin
reads it, so a rename is an edit there plus a migration entry in the plugins' `RENAMED_LEAVES`.

## Stops

Per-stop lightness targets (light and dark), the requirement each stop declares (where one
exists), and its role as the plugin describes it. The targets are what the solve starts
from; the emitted lightness differs per hue.

| stop | index | light rootL | dark rootL | declared requirement | role |
|---|---:|---:|---:|---|---|
| `paper-0` | 0 | 1.000 | 0.160 | – | the ladder floor: white in light; in dark, one seam below `paper-1` (neutral only) |
| `paper-1` | 1 | 0.987 | 0.178 | – | backgrounds, inverted text |
| `paper-3` | 2 | 0.970 | 0.213 | – | backgrounds, inverted text |
| `paper-5` | 3 | 0.950 | 0.252 | – | backgrounds, inverted text; the paper the contrast stops are cleared against |
| `highlighter-8` | 4 | 0.924 | 0.285 | – | subtle interactive states, decorative borders, illustration, signal hierarchy |
| `highlighter-11` | 5 | 0.892 | 0.313 | – | the same |
| `highlighter-15` | 6 | 0.852 | 0.348 | – | the same |
| `highlighter-20` | 7 | 0.801 | 0.420 | – | the same; the ground `pen-58` is cleared against |
| `crayon-26` | 8 | 0.738 | 0.550 | 3:1 against `paper-5` | focus rings, icons, large text |
| `pencil-47` | 9 | 0.530 | 0.767 | 4.5:1 against `paper-5` | regular text, inverted backgrounds; the emphasis fill |
| `pen-58` | 10 | 0.415 | 0.843 | 4.5:1 against `highlighter-20` | regular text, inverted backgrounds |
| `pen-70` | 11 | 0.300 | 0.919 | 7:1 against `paper-5` (the promise is 4.5) | heavy-emphasis text, inverted backgrounds |
| `pen-100` | 12 | 0.000 | 1.000 | – | the literal pole: black in light, white in dark (neutral only) |

Paper and highlighter carry no declared requirement: their seam distinctness is a property
of the `ROOT_L_LIGHT` ladder's own shape, not a runtime floor. The near-white gaps grow
geometrically (about 1.25× per step), so `paper-3` already stands roughly 0.017 ΔE off
`paper-1` by construction, with no push or clamp applied at resolve time. The resolver still
supports a declared minimum-separation requirement for portable specs, but the shipped
declaration carries none.

`crayon-26`, `pencil-47`, and the two pens carry a declared WCAG requirement, enforced
against the resolved ground on every resolve: `paper-5`, the nearest paper, for the crayon,
the pencil and `pen-70`; `highlighter-20` for `pen-58`. Every stop from the crayon up is
additionally held against the worst paper the family's generated neutral can produce (the
frozen bounds in [`requirements/resolve.ts`](../src/engine/requirements/resolve.ts)).

- A requirement is a floor, not a re-placement: a hue whose produced placement already
  clears it does not move. In light the floors clamp L down (the lightest L that still
  clears); in dark they raise L up off the near-black paper. Declaring them means any future
  seed or tuning that would break legibility fails the gate (`npm run req:audit`,
  `npm run audit:guarantee`) instead of shipping.
- Off the scale: the stamp (`stamp/fill`, `stamp/fill-hover`, `stamp/fill-pressed`,
  `stamp/edge`, `stamp/on`) is a set of roles, not stops: the pulled-out button fill, its
  states, its always-rendered edge, and its text. The text-style action is the text stops
  read directly (rest `pencil-47`, hover `pen-58`, pressed `pen-70`).
- The poles: `paper-0` is resolved (white in light; in dark the deep, brand-tinted plane one
  seam below `paper-1`) and `pen-100` is the literal anchor (#000000 light / #ffffff dark).
  Both flip with the mode; neither is a per-brand ladder stop. They exist under `neutral` only.
- Target versus emitted: light stops are solved from their rootL target for apparent
  lightness (below), then the declared requirements bind, so for luminous hues `crayon-26`
  lands well below its 0.738 target.

## On-fill text

A fill that carries text ships its text color: `stamp/on`, the one on-fill token every family
emits. The only criterion is that it passes. The preference is which pole reads better on the fill
(judged with APCA, `onTextIsWhite` in [`colorMath.ts`](../src/engine/colorMath.ts)); the
law is WCAG 4.5:1 on the chosen pole, with the fill re-solving darker only when white is
preferred and cannot be flipped. On top of the law, APCA is used once, as a booster: brand
and signal fills are nudged until the text reads at Lc 65 (critical 50). White and black
are the contrast extremes under WCAG, so for any fill at least one of them clears 4.5:1.
Declared per mode as the `ons` block of the spec.

## The Helmholtz-Kohlrausch solve

At equal measured luminance, a saturated color looks brighter than a gray: the
Helmholtz-Kohlrausch effect. The size of that boost depends on hue: large for blue, red, and
violet; small for yellow-green, which is already luminous. Left uncorrected, `pencil-47`
would read as a different lightness on every brand.

So the light stops do not use their target lightness directly. For each stop the engine
solves the measured L at which the color's apparent (H-K-corrected) lightness equals a
common target, the gray lightness of the stop plus the average boost at that stop's chroma:

```
target  = grayApparentL(rootL) + meanBoost(rootL, chroma)
emitted = the L where apparentL(L, chroma, hue) == target
```

A high-boost hue is placed at a lower measured L to compensate; a low-boost hue higher.
They differ in measured L but match in apparent lightness, so the step reads the same across
brands. A live example, solved for two hues, is on the
[generation page](https://egerrity.github.io/okchroma/#/docs/generation/step-3).

Dark mode is derived from the resolved light ramp. The paper and highlighter stops (1 to 7)
land on one shared luminance ladder: each sits above the dark ground by a computed band lift
times the depth of the achromatic light stop below white, tinted by its own carried hue and
resampled chroma, so every family lands at the same luminance per rung. `crayon-26` carries
light's hue and chroma and is placed by its 3:1 requirement against the dark `paper-5`. The
pens are solved dark-native with the same apparent-lightness solve to the dark scaffold, then
floored by their requirements. `divergence-audit` reports the residual apparent-lightness
spread across hues in dark.

Code: [`perceptualL.ts`](../src/engine/perceptualL.ts): `apparentL()` is the Nayatani (1997)
H-K model; `perceptualRungL()` is the solve. It is the `'perceptual'` lightness producer,
applied per declared stop by the resolver
([`producers.ts`](../src/engine/requirements/producers.ts) /
[`resolve.ts`](../src/engine/requirements/resolve.ts)); the dark carry is the delta branch
of the same resolver.
