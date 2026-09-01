# okchroma for agents

A reference for coding agents working in a project that consumes okchroma tokens. It explains what the token names mean and how to pick the right one. It is not a spec of the engine; the engine source is the source of truth.

## The one-scale model

Every color family emits the same scale: eleven stops plus a small set of pulled-out tokens. The scale shape is identical across all families, so anything you learn about `neutral` applies to `brand`, `brand-alt`, `critical`, `warning`, `positive`, and `info`. The only per-family differentiated value is the stamp (the CTA fill).

A scale token name reads as `band-lightness`:

- The band word tells you the job (paper, highlighter, crayon, pencil, pen).
- The number is `100 − round(light rootL × 100)`: derive, round, invert, in that order and never re-rounded. Bigger means stronger — `paper-0` is white, `pen-100` is black. A future stop names itself the same way.
- Names carry no WCAG conformance suffix. `-aa`/`-aaa` used to be part of the name; they were dropped because Figma's picker searches the description text too, and the letters were flooding unrelated "on" queries (cONtrast, collisiONs). The guarantee still exists; it is stated in the variable's description, not the name. See the guarantee listed per stop below.

## These are primitives, not semantic tokens

In a conventional token architecture, primitives are raw named values (`blue-500`) with no promises attached, and a semantic layer above them assigns meaning and accessibility (`text-primary`). okchroma's scale tokens do not fit that split, and reading them as semantic tokens will mislead you.

Every scale token here is a primitive. What is unusual is that the requirement is built into the primitive itself: the name states a contract (band, lightness rung), and the engine solves the actual color value per brand and per theme so that the contract holds, including a specific WCAG guarantee carried in the description. `pen-58` is not "the text color role"; it is a primitive whose generated value is guaranteed to clear AA body-text contrast against the paper band, whatever seed color the brand supplies.

This is what makes theming work over a range of input colors while keeping the output predictable. The names and their guarantees never move; the values are re-solved for each brand seed and theme. An agent can rely on the contract without knowing which brand is active, which theme is active, or what hex the token currently resolves to.

So: do not go looking for the "real" primitives underneath these, and do not treat the requirement in the name as a semantic role assignment. The band-and-rung names are the bottom layer. A thin semantic layer (`--fg-default`, `--border-subtle`, see below) exists above them as optional aliases, and that is the only layer that assigns usage roles.

## The bands

**paper: `paper-1`, `paper-3`, `paper-5`.** Backgrounds and inverted text. `paper-1` is the lightest working background; `paper-5` is the deepest, and the worst case the text stops are solved against.

**highlighter: `highlighter-8`, `highlighter-11`, `highlighter-15`, `highlighter-20`.** Subtle interactive states, decorative borders, illustrations, signal hierarchy. Highlighters are tinted with the family hue but carry no text guarantee. Do not put body text on or in a highlighter color.

**crayon: `crayon-26`.** Focus rings, icons, large text. Guaranteed WCAG AA for large text and UI elements (this also satisfies the 3:1 non-text contrast requirement for UI components against the papers).

**text stops: `pencil-47`, `pen-58`, `pen-70`.**

- `pencil-47`: regular text, WCAG AA (4.5:1) on every paper — never on a highlighter. Also serves as the emphasis fill: the first of three states in the text-style CTA below.
- `pen-58`: regular text, WCAG AA (4.5:1) on every highlighter and every paper — the first stop that holds on a tinted ground.
- `pen-70`: heavy-emphasis text. Guaranteed minimum 4.5:1 (AA) on every highlighter and paper — the same promise as `pen-58`, placed darker. No AAA claim is made.
- The three, read in sequence (`pencil-47`, `pen-58`, `pen-70`), ARE the text-style CTA's rest/hover/pressed states. There is no separate cta-ink or pen-cta token; if you see one referenced, it is stale.

**near-poles (neutral only): `paper-0`, `pen-100`.** The scale's extended endpoints, beyond `paper-1` and `pen-70`. `paper-0` is engine-resolved: white in light (rootL 1.0, zero chroma) and, in dark, the deep brand-tinted plane one seam below `paper-1`. `pen-100` is the literal pole: pure black in light, pure white in dark, no tint (it spent three days on the tinted lane; the owner walked that back 2026-08-31). `pen-100` is the max-emphasis text anchor and flips with the mode; prefer `pen-70` for running text. The mode-invariant poles are `abs-black` / `abs-white` under system tokens.

## The stamp tokens (the CTA family)

The token name is `stamp`. Say "CTA" out loud when talking about these (the engine's own text still calls them that), but the variable name is `stamp`.

`stamp-fill`, `stamp-fill-hover`, `stamp-fill-pressed`: the call-to-action fill and its states. These sit off the scale and are fully re-solved per theme and family; never substitute a scale stop for them. (In Figma these nest under a `stamp` group: `stamp/fill`, `stamp/fill-hover`, `stamp/fill-pressed`.)

`stamp-edge`: a gated outline stroke. It resolves to a visible offset only in themes where the CTA fill sits close to the page; otherwise it resolves to transparent. Always render it (`border: 1.5px solid var(...-stamp-edge)`), never conditionally add or remove the border, so layout never shifts.

`stamp-on`: the only sanctioned text color over a CTA fill. It is whichever pole passes on that fill; do not compute or pick your own.

`identity`: the raw brand seed as given. A reference value, not a UI color.

## Families and CSS variable prefixes

| Family | CSS prefix | Meaning |
|---|---|---|
| neutral | `--neutral-` | grays, generated from the brand hue |
| brand primary | `--brand-` | the main brand family |
| brand alt | `--brand-alt-` | the companion family, derived or custom |
| critical | `--critical-` | destructive and error signal |
| warning | `--warning-` | caution signal |
| positive | `--positive-` | success signal |
| info | `--info-` | informational signal |

Signal families are named by identity, always `critical`/`warning`/`positive`/`info`, never `error`/`success`/`danger`. Signal stops may be shifted slightly from the naive value to stay visually distinct from the brand; that is by design, do not "correct" them.

Example composed names: `--brand-highlighter-11`, `--critical-pen-58`, `--neutral-crayon-26`, `--brand-alt-stamp-fill-hover`.

## Elevation planes

Four aliases onto the neutral papers: `--surface-dim`, `--surface-low`, `--surface-mid`, `--surface-high`.

- `dim`: recessed plane (wells, inset areas)
- `low`: the resting page
- `mid`: the raised plane components sit on (cards, menus)
- `high`: the topmost plane (modals, dialogs)

Light theme descends the papers as elevation rises toward white; dark ascends them from black. Use the plane aliases for anything that is an elevation decision; use raw paper stops only for color decisions that are not elevation.

## System tokens

- `--link`, `--link-hover`, `--link-pressed`: the system link color for text on normal surfaces. `--link-inverse`, `--link-inverse-hover`, `--link-inverse-pressed`: the same seed, re-solved for text on inverted (`pen-70`-filled) surfaces. A link is not a text-style CTA; do not restyle links with the text stops.
- `--alpha-away-from-bg-06/-08/-16`: the alpha rungs `stamp-edge` draws from. The `--alpha-toward-bg-` trio is the same ladder with the pole flipped, for state layers on inverted grounds.
- `--shadow-04/-08/-12`: drop shadow alphas. Shadows are always dark, never glows.
- scrim, transparent: dimming and aliased off-states.
- `abs-black` / `abs-white`: the mode-invariant literal poles. `paper-0` is a tinted near-pole, not this; `pen-100` is a true pole but flips with the mode, while these never flip.

## Semantic layer (tokens/semantic.css)

If the project consumes the semantic layer, prefer it over raw stops:

- `--fg-default` (`pen-70`), `--fg-subtle` (`pencil-47`)
- `--border-default` (`crayon-26`), `--border-subtle` (`highlighter-11`)
- `--brand-bg-faint/-subtle/-emphasis` and their hover/pressed variants
- `--brand-fg`, `--brand-fg-on-emphasis` (`stamp-on`)
- `--fg-link` and `--fg-link-inverse`, each with hover/pressed pairs

## Rules for agents

1. Never hardcode a hex. Every color in UI code is a token reference.
2. Text comes from the text stops (`pencil-47`/`pen-58`/`pen-70`), or `stamp-on` over a CTA fill. The WCAG guarantee is documented per stop, not spelled in the name; do not run your own contrast checks or add compensating colors.
3. The same token is used in both light and dark. Theming moves the values, not the references; never swap to a different stop for dark mode.
4. States move along the scale in the order the names imply: rest, hover, pressed follow `stamp-fill`/`stamp-fill-hover`/`stamp-fill-pressed`, and text-style CTAs follow `pencil-47`/`pen-58`/`pen-70`.
5. Do not invent intermediate values (no opacity tweaks on stops, no color-mix between stops). If a needed value seems missing, that is a design-system question, not something to patch locally.
6. Contrast is stated as WCAG conformance levels in each variable's description, never as ratios, and never encoded in the name.
