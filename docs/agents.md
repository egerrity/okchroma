# okchroma for agents

A reference for coding agents working in a project that consumes okchroma tokens. It explains what the token names mean and how to pick the right one. It is not a spec of the engine; the engine source and the docs site ([egerrity.github.io/okchroma/#/docs](https://egerrity.github.io/okchroma/#/docs)) are the sources of truth.

## The one-scale model

Every color family emits the same scale: eleven stops plus a small set of pulled-out tokens. The scale shape is identical across all families, so anything you learn about `neutral` applies to `brand`, `brand-alt`, `critical`, `warning`, `positive`, and `info`. The only per-family differentiated value is the stamp (the solid fill).

A scale token name reads as `instrument-number`:

- The instrument word tells you the job (paper, highlighter, crayon, pencil, pen).
- The number is `100 − round(light rootL × 100)`: derive, round, invert, in that order and never re-rounded. Bigger means stronger: `paper-0` is white, `pen-100` is black. A future stop names itself the same way.
- Names carry no WCAG conformance suffix. The guarantee exists; it is stated in the variable's description, not the name. See the guarantee listed per stop below.

## These are primitives

In a conventional token architecture, primitives are raw named values (`blue-500`) with no promises attached, and a semantic layer above them assigns meaning and accessibility (`text-primary`). okchroma's scale tokens do not fit that split, and reading them as semantic tokens will mislead you.

Every scale token here is a primitive. What is unusual is that the requirement is built into the primitive itself: the name states a contract (instrument, lightness rung), and the engine solves the actual color value per brand and per theme so that the contract holds, including a specific WCAG guarantee carried in the description. `pen-58` is not "the text color role"; it is a primitive whose generated value is guaranteed to clear 4.5:1 against every paper and highlighter of its family and of the neutral, whatever seed color the brand supplies.

## The scale

**paper: `paper-1`, `paper-3`, `paper-5`.** Backgrounds and inverted text. No contrast claim of their own; every contrast stop is cleared against them. `paper-5` is the darkest light paper (the lightest dark paper), the one the contrast stops are solved against.

**highlighter: `highlighter-8`, `highlighter-11`, `highlighter-15`, `highlighter-20`.** Subtle interactive states, decorative borders, illustration, signal hierarchy. Never text. The pens are cleared against them; the crayon and the pencil are not.

**crayon: `crayon-26`.** Focus rings, icons, borders, large text. AA large text and UI elements: 3:1 against every paper of its family and of the neutral.

**pencil: `pencil-47`.** Regular text, and the emphasis fill. AA body text: 4.5:1 against every paper of its family and of the neutral. Its on-text, when used as a fill, is `paper-0`.

**pen: `pen-58`, `pen-70`.** Regular and heavy-emphasis text, inverted backgrounds. AA body text: 4.5:1 against every paper and every highlighter of its family and of the neutral, both directions.

**near-poles (neutral only): `paper-0`, `pen-100`.** The scale's extended endpoints, beyond `paper-1` and `pen-70`. `paper-0` is engine-resolved: white in light (rootL 1.0, zero chroma) and, in dark, the deep brand-tinted plane one seam below `paper-1`. `pen-100` is the literal pole: pure black in light, pure white in dark, no tint. `pen-100` is the max-emphasis text anchor and flips with the mode; prefer `pen-70` for running text. The mode-invariant poles are `abs-black` / `abs-white` under the system tokens (Figma only).

## The stamp tokens (the CTA family)

The token name is `stamp`. Say "CTA" out loud when talking about these (the engine's own internal fields still call them that), but the variable name is `stamp`.

`stamp-fill`, `stamp-fill-hover`, `stamp-fill-pressed`: the call-to-action fill and its states. These sit off the scale and are fully re-solved per theme and family; never substitute a scale stop for them. (In Figma these nest under a `stamp` group: `stamp/fill`, `stamp/fill-hover`, `stamp/fill-pressed`.)

`stamp-edge`: a gated outline stroke. It resolves to a visible offset only in themes where the CTA fill sits close to the page; otherwise it resolves to transparent. Always render it (`border: 1.5px solid var(...-stamp-edge)`), never conditionally add or remove the border, so layout never shifts.

`stamp-on`: the only sanctioned text color over a CTA fill. It is whichever pole passes on that fill; do not compute or pick your own. On the neutral, and on a secondary whose fill is quiet enough, it is the pole at alpha (an `rgba()` value composited over the fill), so it must be painted over the fill it belongs to.

`identity`: the raw brand seed as given. A reference value, not a UI color.

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

Example composed names: `--brand-highlighter-11`, `--critical-pen-58`, `--neutral-crayon-26`, `--brand-alt-stamp-fill-hover`.

## Elevation planes

Four aliases onto the neutral papers, provided by the package's `tokens/semantic.css` (not by `brandCss`): `--surface-dim`, `--surface-low`, `--surface-mid`, `--surface-high`.

- `dim`: recessed plane (wells, inset areas)
- `low`: the resting page
- `mid`: the raised plane components sit on (cards, menus)
- `high`: the topmost plane (modals, dialogs)

Light theme descends the papers as elevation rises toward white; dark ascends them from black. Use the plane aliases for anything that is an elevation decision; use raw paper stops only for color decisions that are not elevation.

## System tokens

- `--link`, `--link-hover`, `--link-pressed`: the system link color for text on normal surfaces. `--link-inverse`, `--link-inverse-hover`, `--link-inverse-pressed`: the same seed, re-solved for text on inverted (`pen-70`-filled) surfaces. A link is not a text-style CTA; do not restyle links with the text stops. Emitted by `brandCss`.
- `--alpha-away-from-bg-06/-08/-16`: the alpha rungs `stamp-edge` draws from. The `--alpha-toward-bg-` trio is the same ladder with the pole flipped, for state layers on inverted grounds. `--alpha-transparent` is the aliased off-state. Emitted by `signalsCss` at `:root`.
- `--shadow-04/-08/-12`: drop shadow alphas, from `tokens/semantic.css`. Shadows are always dark, never glows.
- The scrim (black at 60%) and the absolute poles `abs-black` / `abs-white` exist in the Figma output only; there is no CSS custom property for them. `paper-0` is a tinted near-pole, not an absolute; `pen-100` is a true pole but flips with the mode, while the absolutes never flip.
- `--disabled-opacity` (from `tokens/semantic.css`): disabled is an opacity on the component, never a color swap.

## Rules for agents

1. Never hardcode a hex. Every color in UI code is a token reference.
2. Text comes from the text stops (`pencil-47`/`pen-58`/`pen-70`), or `stamp-on` over a CTA fill. The WCAG guarantee is documented per stop, not spelled in the name; do not run your own contrast checks or add compensating colors.
3. The same token is used in both light and dark. Theming moves the values, not the references; never swap to a different stop for dark mode.
4. States move along the scale in the order the names imply: rest, hover, pressed follow `stamp-fill`/`stamp-fill-hover`/`stamp-fill-pressed`, and text-style CTAs follow `pencil-47`/`pen-58`/`pen-70`.
5. Do not invent intermediate values (no opacity tweaks on stops, no color-mix between stops). If a needed value seems missing, that is a design-system question, not something to patch locally.
6. Contrast is stated as WCAG conformance levels in each variable's description, never as ratios, and never encoded in the name.
