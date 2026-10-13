# OKChroma

okchroma is a color engine. A fixed set of formulas generates a color system's base
tokens from a seed color and a set of options. Each token gets a light and a dark value,
and the contrast requirements are solved while the values are generated. The set is
emitted as CSS custom properties, as DTCG documents, and as Figma variables.

The seed is one brand hex. The options add a second seed or derive a companion from the
first, pin a family's fill to a lightness anchor, and pick the contrast profile. They are
listed with the API: [Install and API](https://egerrity.github.io/okchroma/#/docs/install).

okchroma writes base tokens, designed for use under any semantic layer, including one
that must cover many themes. It writes no semantic tokens. The semantic tokens in this
repo, in [demo/semantic.css](demo/semantic.css), style the demo site and are not engine
output.

## Install

```bash
npm install okchroma
```

The package ships ESM and CommonJS builds with TypeScript declarations. It has no
runtime dependencies: the one library the engine uses, for perceptual color distance, is
bundled at build time. Node 18 or later; no DOM.

```ts
import { resolveTheme, brandCss, signalsCss, themeTokens, tokensToDtcg, neutralTintHue } from 'okchroma'

const theme = resolveTheme({ primaryHex: '#E93D82', name: 'acme', deriveSecondary: true })
const neutralH = neutralTintHue(theme.themed.scale.brandH)

// CSS custom properties: a light and a dark block per brand, the signal block once
const css = brandCss('acme', 'Acme', theme.themed, theme.secondary?.scale ?? null,
  '', 'default', undefined, theme.secondary?.style, false, null, true, neutralH)
  + '\n' + signalsCss()
// put css in a stylesheet; set data-brand="acme" on the themed root,
// and data-theme="dark" on it for dark mode

// the same values as one object per mode, every var() resolved
const tokens = themeTokens({ slug: 'acme', brand: theme.themed, secondary: theme.secondary?.scale ?? null, secondaryStyle: theme.secondary?.style, neutralH })

// the DTCG documents: one per mode, every token with its description
const { light, dark } = tokensToDtcg(tokens)
```

The Figma tree comes from `themeToFigma`. Signatures, the full input, and an end-to-end
example: [Install and API](https://egerrity.github.io/okchroma/#/docs/install).

## The tokens

Every family emits the same set of names, so a name says the token's job whichever
family carries it. The families are `neutral`, `brand`, `brand-alt`, `critical`,
`warning`, `positive` and `info`; the neutral adds the two poles. The link rows and the
seeds sit outside the families.

| Token | Job | Contrast guarantee |
|---|---|---|
| `{family}/paper-1` | background | none; the contrast stops are measured against the papers |
| `{family}/paper-3` | background | none |
| `{family}/paper-5` | background; the paper the contrast stops are solved against | none |
| `{family}/chalk-8` | decorative border, illustration, ground for inverted text; never text | none; the pens are measured against the chalks |
| `{family}/chalk-11` | the same | none |
| `{family}/chalk-15` | the same | none |
| `{family}/chalk-20` | the same | none |
| `{family}/highlighter-26` | focus ring, icon, large text; at a translucency, the state layer | 3:1 on the papers, the non-text bar |
| `{family}/pencil-47` | regular text; the emphasis fill | 4.5:1 on the papers |
| `{family}/pen-58` | text; inverted background | 4.5:1 on the papers and the chalks, both directions |
| `{family}/pen-70` | heavy-emphasis text; inverted background | 4.5:1 on the papers and the chalks, both directions |
| `neutral/paper-0` | white in light; in dark, the plane one seam below `paper-1` | none stated |
| `neutral/pen-100` | black in light, white in dark; the strongest text | none stated |
| `{family}/stamp-0` | the call-to-action fill at rest, solved per family and mode | `stamp-on` reads on it at 4.5:1 |
| `{family}/stamp-1` | the fill one step from rest | `stamp-on` reads on it at 4.5:1 |
| `{family}/stamp-2` | the fill two steps from rest | `stamp-on` reads on it at 4.5:1 |
| `{family}/stamp-edge` | a stroke: an offset where the fill sits close to the page, transparent elsewhere, so a component always renders it | none stated |
| `{family}/stamp-on` | the text on the fill, whichever pole passes; at alpha on a quiet fill | 4.5:1 on the three fills |
| `link/default-0` | link text on the papers, at rest | none stated |
| `link/default-1` | one step from rest | none stated |
| `link/default-2` | two steps from rest | none stated |
| `link/inverse-0` | link text on the pen ground, at rest | none stated |
| `link/inverse-1` | one step from rest | none stated |
| `link/inverse-2` | two steps from rest | none stated |
| `absolute/brand` | the seed as given; a reference value, not a UI color | none stated |
| `absolute/brand-alt` | the second seed as given | none stated |

The papers and chalks a stop is measured against are its own family's and the neutral's.
APCA is used once: the stamp fill also moves until its text clears Lc 65. The full
claims and their audits: [Guarantees](https://egerrity.github.io/okchroma/#/docs/guarantees).
The lightness targets behind the numbers: [docs/scale.md](docs/scale.md).

> The reserved-role-per-stop model is a conceptual nod to
> [Radix Colors](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale).
> It is not a dependency and does not touch the math; the color computation is original.

## The grammar

A name is a group and a leaf:

```
group/leaf
```

The group is a family, `link`, or `absolute`. The leaf names a position, never a state;
a consumer's semantic layer names the states and aliases the positions.

| Leaf | Pattern | Example |
|---|---|---|
| a scale stop | `{instrument}-{number}` | `pen-58` |
| a stamp fill | `stamp-{step}` | `stamp-0` |
| the stamp's edge and text | `stamp-edge`, `stamp-on` | `stamp-on` |
| a link | `{posture}-{step}`, the postures `default` and `inverse` | `default-1` |
| a seed | the family word | `brand-alt` |

The instrument is the job. On the scale (paper, chalk, highlighter, pencil, pen) the
number is 100 minus the light-mode lightness target, so a bigger number is a stronger
color. In the brand identity (stamp, link) the number is the step from rest: 0 at rest,
1 one step away, 2 two steps.

Each output spells the same name its own way:

| Output | Spelling | `brand/stamp-0` becomes |
|---|---|---|
| CSS custom property | `--group-leaf` | `--brand-stamp-0` |
| Figma variable | `group/leaf`; the extended plugin writes it under `color/` | `color/brand/stamp-0` |
| DTCG token | nested as `group.leaf`, referenced as `{group.leaf}`; `rootGroup: 'color'` nests it under `color` | `{brand.stamp-0}` |

Which token to use for which job: [docs/agents.md](docs/agents.md).

## The outputs

- CSS: `brandCss` writes a `[data-brand="acme"]` block and a
  `[data-brand="acme"][data-theme="dark"]` block; `signalsCss` writes the
  brand-independent signal block at `:root`. Values are sRGB hexes, or `rgba()` where a
  token carries alpha. A stop whose chroma exceeds sRGB gets a `color(display-p3 …)`
  override behind a browser gate. In the repo, `npm run generate` writes the signal block
  to `dist/signals.css`.
- Objects: `themeTokens` returns one object per mode with every reference resolved, for a
  consumer with no cascade.
- DTCG: `tokensToDtcg` returns one document per mode. Each token has a `$type`, an sRGB
  `$value` (or an alias where the CSS writes a reference) and a `$description`; a
  resolver document joins the two modes. The format: [docs/schema.md](docs/schema.md).
  In the repo, `npm run tokens:emit -- '#E93D82' acme` writes both files; `--root color`
  (or `{ rootGroup: 'color' }` in code) nests the paths under that group.
- Figma: `themeToFigma` returns a light and a dark group tree on the same paths; the
  extended plugin writes them into a file.

## Documentation

The docs site renders the mechanisms with live values from the engine:
[egerrity.github.io/okchroma/#/docs](https://egerrity.github.io/okchroma/#/docs).

- [Overview](https://egerrity.github.io/okchroma/#/docs/overview): what goes in, what comes out, the token roster.
- [Output contract](https://egerrity.github.io/okchroma/#/docs/output): the naming grammar, families and prefixes, modes and selectors, a live CSS block and Figma tree.
- [Guarantees](https://egerrity.github.io/okchroma/#/docs/guarantees): each claim as stated, and how it is verified.
- [How the theme is generated](https://egerrity.github.io/okchroma/#/docs/generation): the pipeline in execution order, with the constants and the code that runs each step.
- [Signals and companions](https://egerrity.github.io/okchroma/#/docs/signals) and the [Reference](https://egerrity.github.io/okchroma/#/docs/reference): glossary, constants, option types.

In the repo:

- [docs/agents.md](docs/agents.md): the consumer contract, what each token means and the rules for using it.
- [docs/schema.md](docs/schema.md): the DTCG documents.
- [docs/scale.md](docs/scale.md): the scale and its declared targets.
- [docs/architecture.md](docs/architecture.md): the maintainer's map, modules, pipeline stages, data structures, the extended plugin's write path.
- [CHANGELOG.md](CHANGELOG.md).

## Run from source

```bash
npm install
npm run demo:build      # writes dist/signals.css and bundles the demo
npx serve .             # open http://localhost:3000/demo/index.html
npm run dev             # watch mode
```

`npm run typecheck` runs the compiler. The audit scripts in `package.json`
(`npm run req:audit`, `npm run audit:guarantee`, `npm run audit:dtcg`, and the rest)
check the guarantees and the outputs. What each proves:
[How it is verified](https://egerrity.github.io/okchroma/#/docs/guarantees/how-it-is-verified).

## The Figma plugins

- OKChroma Extended (`plugin-ext/`) is the shipped Figma plugin. It needs the Figma
  desktop app and a Figma Enterprise plan, because it writes extended variable
  collections: one collection with light and dark modes, and an extension per brand that
  overrides only what differs. Download and install steps:
  [install page](https://egerrity.github.io/okchroma/install.html). Build from source with
  `npm run plugin-ext:build`; see [plugin-ext/README.md](plugin-ext/README.md).
- OKChroma (`plugin/`, the community plugin) is not offered for download. It has no
  rename table for the last scale change, so updating an installed copy would leave the
  old names in the file. It builds with `npm run plugin:build` and imports from
  `plugin/manifest.json`; a fresh file gets the current shape.

## License

MIT
