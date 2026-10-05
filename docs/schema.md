# The DTCG documents

`tokensToDtcg` emits the engine's primitives as two documents in the Design Tokens Format
Module 2025.10 shape, one for light and one for dark, on identical paths. The format is
the Design Tokens Community Group's; the color value shape is its Color Module and the
way two modes join is its Resolver Module. It is a W3C Community Group report, not a W3C
Standard.

```ts
import { resolveTheme, themeTokens, tokensToDtcg } from 'okchroma'

const theme = resolveTheme({ primaryHex: '#E93D82', name: 'acme', deriveSecondary: true })
const tokens = themeTokens({ slug: 'acme', brand: theme.themed, secondary: theme.secondary?.scale ?? null, secondaryStyle: theme.secondary?.style })
const { light, dark } = tokensToDtcg(tokens)
```

In the repo, `npm run tokens:emit -- '#E93D82' acme` writes `dist/tokens/acme.light.tokens.json`
and `dist/tokens/acme.dark.tokens.json`.

## What the documents hold

Every primitive the engine emits, once: the seven color families (`neutral`, `brand`,
`brand-alt`, `critical`, `warning`, `positive`, `info`), each with its scale stops and
its five stamp tokens; the neutral's two poles; the two link trios; the two seed
absolutes. The roster is `tokenPaths()`, and the emitter throws if the structured emit
carries a name outside it or lacks one inside it. Nothing sits at the document root but
the groups.

```
neutral
├─ paper-0, paper-1, paper-3, paper-5, chalk-8, chalk-11, chalk-15, chalk-20,
│  highlighter-26, pencil-47, pen-58, pen-70, pen-100
└─ stamp: fill, fill-hover, fill-pressed, edge, on
brand, brand-alt, critical, warning, positive, info
├─ the same eleven stops
└─ stamp: fill, fill-hover, fill-pressed, edge, on
link
├─ default: enabled, hover, pressed        text on the papers
└─ inverse: enabled, hover, pressed        text on the pen ground
absolute
└─ brand, brand-alt                        the seeds as given, reference values
```

A path joined with hyphens is the CSS custom property (`brand.stamp.fill` is
`--brand-stamp-fill`, `neutral.paper-0` is `--neutral-paper-0`, `link.default.enabled`
is `--link-default-enabled`); joined with slashes it is the Figma variable
(`brand/stamp/fill`). One grammar, every output.

## A token

```json
"highlighter-26": {
  "$type": "color",
  "$value": { "colorSpace": "srgb", "components": [0.3451, 0.5255, 0.8667], "alpha": 1, "hex": "#5886dd" },
  "$description": "Req for: focus rings, icons, large text, translucent state layers over any ground\nAA large text and UI elements on every paper of this family and of the neutral\nTheming: tints carry brand hue; re-solved to clear its floor"
}
```

The `\n` in a description is a line break, one per part, the way the Figma variable's
description is written; a reader of the file sees the lines.

| field | value |
|---|---|
| `$type` | always `color` |
| `$value` | the Color Module object, or an alias in the curly-brace form |
| `colorSpace` | always `srgb`. The wide-gamut rendition the CSS ships behind its gates is not in the file |
| `components` | the 8-bit channels over 255, to four decimals: they name the same color as `hex`, the pair the guarantee audits measure |
| `alpha` | 1 for a solid color; the edge and the quiet fills' soft on-text carry theirs; `transparent` is alpha 0 |
| `hex` | six digits, lower case: the value the CSS custom property carries |
| `$description` | the agent-readable rendering of the token's description: the requirement the token serves; its conformance level in plain English with the ground it holds against (`AA standard body text on every paper and chalk of this family and of the neutral`); on a ground, which stops clear it and at which level; on the stamp tokens, the links and the seeds, a usage line; how the theme moves it. The Figma variable carries the same lines without the grounds and the usage, because Figma's picker searches descriptions. The grounds render from `GUARANTEE_SCOPE`, the table the guarantee audit asserts it measures |

Where the CSS emission writes a reference, the document writes the alias: the alt
mirrors the brand when the theme has no secondary (`{brand.paper-1}`), the outline
secondary's edge and on-text point at its own stops, and the default link trio points at
the primary's text stops (`{brand.pencil-47}`). Everywhere else the value is a literal.
An alias always resolves inside the same document.

## The root group

A design system whose paths start with their category (`space.400`, `radius.200`) wants
color to start the same way. `tokensToDtcg` takes the group as an option, and the script
takes it as a flag:

```ts
import { tokensToDtcg, COLOR_GROUP } from 'okchroma'

const { light, dark } = tokensToDtcg(tokens, { rootGroup: COLOR_GROUP }) // 'color'
```

`npm run tokens:emit -- '#E93D82' acme --root color` writes the same two files.

```
color
├─ neutral, brand, brand-alt, critical, warning, positive, info
├─ link
└─ absolute
```

Every path gains the group as its first segment and nothing else changes:
`color.brand.stamp.fill`. An alias is written with it (`{color.brand.pencil-47}`), so it
still resolves inside the same document. Joined with slashes the path is the variable the
extended plugin writes (`color/brand/stamp/fill`). The CSS custom property never carries
the group: it stays `--brand-stamp-fill`. A description does not name the group either.

The group is one segment, lower-case words and digits joined by hyphens; anything else
throws. Without the option the grammar's groups sit at the document root.

## Modes

The two documents share every path. They join through a resolver document, the
Resolver Module's way of tying sets and modes together, which is also where a design
system's hand-authored groups attach as their own sources. Regeneration rewrites only the
two generated files.

```json
{
  "version": "2025.10",
  "sets": {
    "foundation": { "sources": [{ "$ref": "typography.tokens.json" }, { "$ref": "space.tokens.json" }] }
  },
  "modifiers": {
    "theme": {
      "contexts": {
        "light": [{ "$ref": "acme.light.tokens.json" }],
        "dark": [{ "$ref": "acme.dark.tokens.json" }]
      },
      "default": "light"
    }
  },
  "resolutionOrder": [{ "$ref": "#/sets/foundation" }, { "$ref": "#/modifiers/theme" }]
}
```

## What is not in the file

Nothing the engine does not calculate from the seed: no elevation planes, shadows, scrim,
opacity or alpha ladders, no absolute black or white, no state layer rows. Those are a
semantic layer's to author on the primitives; the demo's own `demo/semantic.css` is a
worked example.

## Verification

- `npm run audit:dtcg`: over the fixture roster in every posture plus an agnostic hue by
  chroma sweep, every roster path has exactly one token, its hyphen-joined path is a
  custom property the CSS emission declares with the same value, its slash-joined path is
  a leaf of the Figma tree with the same value, every alias resolves inside the document,
  every token has a description, every name is legal, light and dark hold the same paths,
  and the documents survive a JSON round trip. Every case runs in both forms. Nested, the
  Figma check compares against the path the extended plugin writes, the CSS check compares
  with the group taken off, and the nested documents must equal the plain ones once the
  group is removed from every path and alias.
- An independent parser: the audit cannot prove conformance to the format, so a release
  is also checked with a third-party DTCG 2025.10 parser (Terrazzo's `tz check` over both
  files, run through `npx`).

## Consumers

Style Dictionary's own documentation says the 2025.10 format does not have full support
yet. A pipeline on it reads `$value.hex` and `$value.alpha` through a short preprocessor;
every color token carries `hex` for that reason. A plain hex string as `$value` is not a
valid 2025.10 color, so the emitter never writes one.

Figma's native variables import takes one file per mode on identical token names, which
is the shape these documents have; nested under `color`, a token's name is the name of the
variable the extended plugin writes. The extended plugin remains the way the engine writes
Figma files; it aliases nothing the documents do not.

The requirement-token experiment, which serialized the declaration behind each value into
`$extensions`, is parked research: `research/reqtoken/FORMAT.md`.
