# The semantic layer that shipped with the engine (record)

okchroma 0.4.0 through 0.6.1 emitted, beside the color primitives, a semantic layer: the
elevation planes, the shadows, the scrim, the disabled opacity, an opacity ladder, two
alpha ladders, an absolute black and white, a soft on-text row, and (from 0.6.0) the
interaction register. CATALOG C68 ruled that the engine emits primitives only, a
primitive being a value the engine calculates from the seed, and everything static or
aliased left every output. This folder is the record: what the layer was, the values it
carried, the claim it held, and where the code went. Nothing here is emitted or audited.

## What left, and its values

**The elevation planes**: four aliases onto the neutral papers, the same four stops in
reversed order per mode, so elevation always moves toward paper-0's side of the ramp.

| plane | light | dark |
|---|---|---|
| dim | neutral paper-5 | neutral paper-0 |
| low | neutral paper-3 | neutral paper-1 |
| mid | neutral paper-1 | neutral paper-3 |
| high | neutral paper-0 | neutral paper-5 |

**The opacity ladder**: eight bare numbers, `004 008 012 016 024 032 048 064`, the same in
both modes; in CSS as fractions, in Figma as the percent.

**The shadows**: black at `004`, `008`, `012` in light and at `032`, `048`, `064` in dark.
**The scrim**: black at `064` in both modes. **The disabled opacity**: `0.38`, a
component-level opacity.

**The alpha ladders**: `away-from-bg` at `06`, `08`, `16`, the page-polarity pole (black
in light, white in dark) at that alpha, the rows the stamp edge aliased; `toward-bg`, the
same rungs with the pole flipped, for state layers on inverted grounds; `transparent`.
The engine still calculates the edge (`OFFSET_ALPHAS` in cssRender.ts) and writes it as a
literal.

**The absolute black and white**: the mode-invariant poles, the rows the loud stamp
on-text aliased. **The ink row**: the pole at the soft on-text alpha (`0.75` light,
`0.80` dark), the row the quiet fills' on-text aliased. Both values still ship inside the
stamp/on leaf as raw values.

**The interaction register**: the state layer as named rows, per family, in
`interaction.ts` beside this file (self-contained; the constants it imported from the
engine are inlined). Three tiers of ground and the text that sits on them, on nine
families: the seven color families and two pole families, `neutral-strong` (the neutral's
pen pole used as a stamp) and `neutral-inverse` (its paper pole).

| row | value |
|---|---|
| `fg`, `fg-strong`, `fg-on-hint` | the family's pen-58, pen-70, pencil-47 (the pole families: the pole) |
| `solid-bg-enabled`, `-hover`, `-pressed`, `solid-border`, `solid-fg` | aliases onto the stamp: fill, fill-hover, fill-pressed, edge, on |
| `subtle-bg-enabled`, `-hover`, `-pressed`, `-selected` | the family's highlighter-26 at `012`, `016`, `024`, `032` |
| `hint-bg-enabled`, `-hover`, `-pressed`, `-selected` | transparent, then highlighter-26 at `008`, `012`, `016` |

The register's CSS also wrote one scope block per family (`[data-family="brand"]`)
mapping the family-agnostic names (`--solid-bg-enabled`, `--fg`) onto that family.

## The claim it held

AA body text on every rung: `fg` and `fg-strong` cleared 4.5:1 over every `subtle` and
`hint` row composited over every paper of the family and of the neutral, in both modes,
across the fixture roster (the register half of `audit:tokens`, reproduced in `check.ts`
beside this file). The pole families were judged over their straight pole:
`neutral-strong` over paper-0, `neutral-inverse` over pen-100 (CATALOG C67).

Measured at the cut (CATALOG C70): `fg-on-hint` (pencil-47) clears the bar over the
resting hint ground only; over the hovered, pressed and selected hint rungs its worst
case in the color families is under the bar. A semantic layer that reuses that row must
pair it with the resting ground or re-solve it.

The engine keeps the part of the claim that is about a primitive: `audit:guarantee` holds
highlighter-26 under translucent layers at the register's weights, so a semantic layer
built on that stop keeps the pen text bar.

## The stylesheet

`semantic.css` beside this file is `tokens/semantic.css` as it shipped in 0.6.1: the
planes, the shadows, the scrim, the disabled opacity, and role aliases (`--brand-fg`,
`--brand-bg-emphasis`, `--critical-border-default`, the link roles) onto the primitives.
Six of its role names (`--brand-fg` and the same for brand-alt and the four signals) held
a different value from the register's rows of the same name (CATALOG C69). The demo keeps
a live descendant of this file as its own semantic layer (`demo/semantic.css`), on the
current names.

## Why it left

A semantic layer is a design system's, authored on the primitives with its own names and
its own decisions about weights and planes. Shipping one from the engine meant a second
vocabulary, static values beside calculated ones, and rows that aliased other rows, all
of which had to be spelled and maintained in every output. The primitives-only emit
carries one grammar and nothing that is not calculated from the seed.

## Running the record

The register module bundles by hand, like the rest of research:

```
npx esbuild research/semantic-layer/check.ts --bundle --platform=node --outfile=dist/semantic-check.js && node dist/semantic-check.js
```
