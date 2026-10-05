# okchroma for agents

A reference for coding agents working in a project that consumes okchroma tokens. It explains what the token names mean and how to pick the right one. It is not a spec of the engine; the engine source and the docs site ([egerrity.github.io/okchroma/#/docs](https://egerrity.github.io/okchroma/#/docs)) are the sources of truth.

## The one-scale model

Every color family emits the same scale: eleven stops plus a small set of pulled-out tokens. The scale shape is identical across all families, so anything you learn about `neutral` applies to `brand`, `brand-alt`, `critical`, `warning`, `positive`, and `info`. The only per-family differentiated value is the stamp (the solid fill).

Everything the engine emits is a primitive: a value it calculates from the seed. There are no semantic tokens in the output, no elevation planes, shadows, opacity ladders or state-layer rows. Those are the consuming system's to author on the primitives, and this file tells you which primitive each of those decisions should read.

A scale token name reads as `instrument-number`:

- The instrument word tells you the job (paper, chalk, highlighter, pencil, pen).
- The number is `100 − round(light rootL × 100)`: derive, round, invert, in that order and never re-rounded. Bigger means stronger: `paper-0` is white, `pen-100` is black. A future stop names itself the same way.
- Names carry no WCAG conformance suffix. The guarantee exists; it is stated in the variable's description, not the name. See the guarantee listed per stop below.

## These are primitives

In a conventional token architecture, primitives are raw named values (`blue-500`) with no promises attached, and a semantic layer above them assigns meaning and accessibility (`text-primary`). okchroma's scale tokens do not fit that split, and reading them as semantic tokens will mislead you.

Every scale token here is a primitive. What is unusual is that the requirement is built into the primitive itself: the name states a contract (instrument, lightness rung), and the engine solves the actual color value per brand and per theme so that the contract holds, including a specific WCAG guarantee carried in the description. `pen-58` is not "the text color role"; it is a primitive whose generated value is guaranteed to clear 4.5:1 against every paper and chalk of its family and of the neutral, whatever seed color the brand supplies.

## The scale

**paper: `paper-1`, `paper-3`, `paper-5`.** Backgrounds and inverted text. No contrast claim of their own; every contrast stop is cleared against them. `paper-5` is the darkest light paper (the lightest dark paper), the one the contrast stops are solved against.

**chalk: `chalk-8`, `chalk-11`, `chalk-15`, `chalk-20`.** Decorative borders, grounds for inverted text, illustration, signal hierarchy. Never text. The pens are cleared against them; the highlighter and the pencil are not. Interactive states are not chalk's job: they are `highlighter-26` at an opacity rung.

**highlighter: `highlighter-26`.** Focus rings, icons, borders, large text. AA large text and UI elements: 3:1 against every paper of its family and of the neutral. As a translucent layer it is the state layer over any paper or inverted ground: hover, pressed, and selected are this one stop at a translucency the semantic layer chooses, never a chalk step. AA body text holds under such a layer: the pen band clears 4.5:1 on the composite over every paper of its family and of the neutral, up to the weight the guarantee audit measures (roughly a third).

**pencil: `pencil-47`.** Regular text, and the emphasis fill. AA body text: 4.5:1 against every paper of its family and of the neutral. Its on-text, when used as a fill, is `paper-0`.

**pen: `pen-58`, `pen-70`.** Regular and heavy-emphasis text, inverted backgrounds. AA body text: 4.5:1 against every paper and every chalk of its family and of the neutral, both directions.

**near-poles (neutral only): `paper-0`, `pen-100`.** The scale's extended endpoints, beyond `paper-1` and `pen-70`, emitted inside the neutral family (`--neutral-paper-0`, `--neutral-pen-100`). `paper-0` is engine-resolved: white in light (rootL 1.0, zero chroma) and, in dark, the deep brand-tinted plane one seam below `paper-1`. `pen-100` is the literal pole: pure black in light, pure white in dark, no tint. `pen-100` is the max-emphasis text anchor and flips with the mode; prefer `pen-70` for running text. There is no mode-invariant absolute black or white token; where a pole is needed as a value (an on-text, a stroke), the engine writes the hex.

## The stamp tokens (the CTA family)

The token name is `stamp`. Say "CTA" out loud when talking about these (the engine's own internal fields still call them that), but the variable name is `stamp`.

`stamp-fill`, `stamp-fill-hover`, `stamp-fill-pressed`: the call-to-action fill and its states. These sit off the scale and are fully re-solved per theme and family; never substitute a scale stop for them. (In Figma these nest under a `stamp` group: `stamp/fill`, `stamp/fill-hover`, `stamp/fill-pressed`.)

`stamp-edge`: a gated outline stroke. It resolves to a visible offset only in themes where the CTA fill sits close to the page; otherwise it resolves to transparent. Always render the border with it, never conditionally add or remove the border, so layout never shifts.

`stamp-on`: the only sanctioned text color over a CTA fill. It is whichever pole passes on that fill; do not compute or pick your own. On the neutral, and on a secondary whose fill is quiet enough, it is the pole at alpha (an `rgba()` value composited over the fill), so it must be painted over the fill it belongs to.

## The grammar

Every token has one path, and every output spells it: `brand/stamp/fill`, `neutral/paper-0`, `link/default/enabled`, `absolute/brand`. Joined with hyphens it is the CSS custom property (`--brand-stamp-fill`, `--neutral-paper-0`, `--link-default-enabled`, `--absolute-brand`); joined with slashes it is the Figma variable and the DTCG token path. Family rows are the family word plus the leaf, with the stamp nested; the neutral's poles sit in the neutral group; the link trios and the seed absolutes are their own groups. The extended Figma plugin writes every path under a `color` group (`color/brand/stamp/fill`), and the DTCG documents nest under the same group when the caller asks for it (`color.brand.stamp.fill`, and `{color.brand.stamp.fill}` in an alias). The CSS custom properties never carry the group.

## Families and CSS variable prefixes

| Family | CSS prefix | Meaning |
|---|---|---|
| neutral | `--neutral-` | grays, generated from a tint hue (the brand's by default) |
| brand primary | `--brand-` | the main brand family |
| brand alt | `--brand-alt-` | the companion family, derived or custom |
| critical | `--critical-` | destructive and error signal |
| warning | `--warning-` | caution signal |
| positive | `--positive-` | success signal |
| info | `--info-` | informational signal |

Signal families are named by role, always `critical`/`warning`/`positive`/`info`, never `error`/`success`/`danger`. Signal stops may be shifted from the canonical value to stay visually distinct from the brand; that is by design, do not "correct" them.

Example composed names: `--brand-chalk-11`, `--critical-pen-58`, `--neutral-highlighter-26`, `--brand-alt-stamp-fill-hover`.

## The link trios and the seeds

- `--link-default-enabled`, `--link-default-hover`, `--link-default-pressed`: the system link color for text on normal surfaces; without a custom link seed they alias the primary's `pencil-47`, `pen-58`, `pen-70`. `--link-inverse-enabled`, `--link-inverse-hover`, `--link-inverse-pressed`: the same seed, re-solved for text on inverted (`pen-70`-filled) surfaces, always its own values. A link is not a text-style CTA; do not restyle links with the text stops. Emitted by `brandCss`.
- `--absolute-brand`, `--absolute-brand-alt`: the raw seeds as given, reference values, never UI colors. In Figma, `absolute/brand` and `absolute/brand-alt`.

## What the semantic layer authors

The engine emits no elevation planes, shadows, scrim, opacity or alpha ladders, disabled opacity, or state-layer rows. A design system authors those on the primitives; the demo's own `demo/semantic.css` is a worked example. The primitive each decision should read:

- Elevation planes: the neutral papers, the same four stops in reversed order per mode, so elevation always moves toward `paper-0`'s side of the ramp (light descends `paper-5`, `paper-3`, `paper-1`, `paper-0` as elevation rises; dark ascends `paper-0`, `paper-1`, `paper-3`, `paper-5`).
- Shadows and scrims: black at a translucency; dark needs a heavier weight than light. Shadows are always dark, never glows.
- State layers on a paper or an inverted ground: `highlighter-26` at a translucency; the pen band holds the text bar on the composite over every paper of the family and of the neutral, up to the weight the guarantee audit measures.
- Disabled: an opacity on the component, never a color swap.

## The structured emit and the DTCG documents

`themeTokens` returns the values the CSS carries as one object: every name with its light value and its dark value, `var()` references resolved, plus the list of names that do not vary by mode. It reads the engine's own CSS emission back, so it cannot disagree with it. Consumers with no cascade, native styling engines and theme objects, read this instead of parsing CSS.

`tokensToDtcg` turns that object into two Design Tokens Format Module 2025.10 documents, light and dark, on identical paths: every primitive once, `$type` color, an sRGB `$value` whose components and hex are the same 8-bit color (or an alias where the CSS writes a reference), and a `$description` written for an agent: the token's requirement, its conformance level in plain English with the ground it holds against, what clears a ground and at which level, a usage line on the stamp tokens, the links and the seeds, and how the theme moves it. The grounds are the guarantee audit's own scope, so a description never claims more than the gate holds. The format, and how the two modes join through a resolver document, is in `docs/schema.md`. Called with `{ rootGroup: 'color' }`, it nests every path under that group and writes every alias with it; values, descriptions and CSS names are the same either way.

## Rules for agents

1. Never hardcode a hex. Every color in UI code is a token reference.
2. Text comes from the text stops (`pencil-47`/`pen-58`/`pen-70`), or `stamp-on` over a CTA fill. The WCAG guarantee is documented per stop, not spelled in the name; do not run your own contrast checks or add compensating colors.
3. The same token is used in both light and dark. Theming moves the values, not the references; never swap to a different stop for dark mode.
4. States move along the scale in the order the names imply: rest, hover, pressed follow `stamp-fill`/`stamp-fill-hover`/`stamp-fill-pressed`, and text-style CTAs follow `pencil-47`/`pen-58`/`pen-70`. A state on a paper or an inverted ground is `highlighter-26` at a translucency the semantic layer defines.
5. Do not invent intermediate values (no ad-hoc opacities, no color-mix between stops). The one sanctioned translucency is `highlighter-26` as a state layer. If a needed value seems missing, that is a design-system question, not something to patch locally.
6. Contrast is stated as WCAG conformance levels in each variable's description, never as ratios, and never encoded in the name.
