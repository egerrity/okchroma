# okchroma for agents

A reference for coding agents working in a project that consumes okchroma tokens. It explains what the token names mean and how to pick the right one. It is not a spec of the engine; the engine source is the source of truth.

## The one-scale model

Every color family emits the same scale: eleven stops plus a small set of pulled-out tokens. The scale shape is identical across all families, so anything you learn about `neutral` applies to `brand`, `secondary`, `critical`, `warning`, `positive`, and `info`. The only per-family differentiated value is the cta.

A token name reads as `band-lightness(-conformance)`:

- The band word tells you the job (paper, wash, mark, ink).
- The number is the stop's nominal lightness rung. Higher means lighter.
- A conformance suffix (`-aa`, `-aaa`) states the WCAG text-contrast level that stop is guaranteed to clear against the paper band. No suffix means the stop carries no text guarantee.

## These are primitives, not semantic tokens

In a conventional token architecture, primitives are raw named values (`blue-500`) with no promises attached, and a semantic layer above them assigns meaning and accessibility (`text-primary`). okchroma's scale tokens do not fit that split, and reading them as semantic tokens will mislead you.

Every scale token here is a primitive. What is unusual is that the requirement is built into the primitive itself: the name states a contract (band, lightness rung, WCAG conformance level), and the engine solves the actual color value per brand and per theme so that the contract holds. `ink-42-aa` is not "the text color role"; it is a primitive whose generated value is guaranteed to clear AA body-text contrast against the paper band, whatever seed color the brand supplies.

This is what makes theming work over a range of input colors while keeping the output predictable. The names and their guarantees never move; the values are re-solved for each brand seed and theme. An agent can rely on the contract in the name without knowing which brand is active, which theme is active, or what hex the token currently resolves to.

So: do not go looking for the "real" primitives underneath these, and do not treat the requirement in the name as a semantic role assignment. The band-and-rung names are the bottom layer. A thin semantic layer (`--fg-default`, `--border-subtle`, see below) exists above them as optional aliases, and that is the only layer that assigns usage roles.

## The bands

**paper: `paper-99`, `paper-97`, `paper-95`.** Backgrounds and inverted text. `paper-99` is the lightest working background; `paper-95` is the deepest, and the worst case the text stops are solved against.

**wash: `wash-92`, `wash-89`, `wash-85`, `wash-80`.** Subtle interaction states, decorative edges, illustrations, signal hierarchy. Washes are tinted with the family hue but carry no text guarantee. Do not put body text on or in a wash color.

**mark: `mark-74-aa`.** Focus rings, icons, large text. Guaranteed WCAG AA for large text and UI elements (this also satisfies the 3:1 non-text contrast requirement for UI components against the papers).

**ink: `ink-53-aa`, `ink-42-aa`, `ink-30-aaa`.** The text stops.

- `ink-53-aa` and `ink-42-aa`: regular text, WCAG AA for standard body text (AAA for large text). `ink-53-aa` also serves as the emphasis fill.
- `ink-30-aaa`: strong-emphasis text, WCAG AAA for standard body text.
- The three ink stops read in sequence ARE the text-style CTA (rest, hover, pressed). There is no separate cta-ink token; if you see one referenced, it is stale.

**poles (neutral only): `paper-100`, `ink-0`.** The absolute endpoints. `ink-0` is the max-emphasis anchor; prefer `ink-30-aaa` for running text.

## The cta tokens

`cta`, `cta-hover`, `cta-pressed`: the call-to-action fill and its states. These sit off the scale and are fully re-solved per theme and family; never substitute a scale stop for them.

`cta-border`: a gated outline stroke. It resolves to a visible offset only in themes where the cta fill sits close to the page; otherwise it resolves to transparent. Always render it (`border: 1.5px solid var(...-cta-border)`), never conditionally add or remove the border, so layout never shifts.

`on-cta`: the only sanctioned text color over a cta fill. It is whichever pole passes on that fill; do not compute or pick your own.

`identity`: the raw brand seed as given. A reference value, not a UI color.

## Families and CSS variable prefixes

| Family | CSS prefix | Meaning |
|---|---|---|
| neutral | `--neutral-` | grays, generated from the brand hue |
| brand primary | `--brand-` | the main brand family |
| brand secondary | `--secondary-` | the companion family, derived or custom |
| critical | `--critical-` | destructive and error signal |
| warning | `--warning-` | caution signal |
| positive | `--positive-` | success signal |
| info | `--info-` | informational signal |

Signal families are named by identity, always `critical`/`warning`/`positive`/`info`, never `error`/`success`/`danger`. Signal stops may be shifted slightly from the naive value to stay visually distinct from the brand; that is by design, do not "correct" them.

Example composed names: `--brand-wash-89`, `--critical-ink-42-aa`, `--neutral-mark-74-aa`, `--secondary-cta-hover`.

## Elevation planes

Four aliases onto the neutral papers: `--surface-sunken`, `--surface-low`, `--surface-base`, `--surface-high`.

- `sunken`: recessed plane (wells, inset areas)
- `low`: the resting page
- `base`: the raised plane components sit on (cards, menus)
- `high`: the topmost plane (overlays, dialogs)

Light theme descends the papers as elevation rises toward white; dark ascends them from black. Use the plane aliases for anything that is an elevation decision; use raw paper stops only for color decisions that are not elevation.

## System tokens

- `--link`, `--link-hover`, `--link-pressed`: the one system link color. A link is not a text-style CTA; do not restyle links with ink stops.
- `--alpha-offset-06/-08/-16`: the alpha rungs cta-border draws from.
- `--shadow-04/-08/-12`: drop shadow alphas. Shadows are always dark, never glows.
- scrim, transparent: dimming and aliased off-states.

## Semantic layer (tokens/semantic.css)

If the project consumes the semantic layer, prefer it over raw stops:

- `--fg-default` (`ink-30-aaa`), `--fg-subtle` (`ink-53-aa`)
- `--border-default` (`mark-74-aa`), `--border-subtle` (`wash-89`)
- `--brand-bg-faint/-subtle/-emphasis` and their hover/pressed variants
- `--brand-fg`, `--brand-fg-on-emphasis` (`on-cta`)

## Rules for agents

1. Never hardcode a hex. Every color in UI code is a token reference.
2. Text comes from the ink band (or `on-cta` over a cta fill). The conformance letters in the name tell you what is already guaranteed; do not run your own contrast checks or add compensating colors.
3. The same token is used in both light and dark. Theming moves the values, not the references; never swap to a different stop for dark mode.
4. States move along the scale in the order the names imply: rest, hover, pressed follow `cta`/`cta-hover`/`cta-pressed`, and text-style CTAs follow `ink-53-aa`/`ink-42-aa`/`ink-30-aaa`.
5. Do not invent intermediate values (no opacity tweaks on stops, no color-mix between stops). If a needed value seems missing, that is a design-system question, not something to patch locally.
6. Contrast language is WCAG conformance levels, not ratios.
