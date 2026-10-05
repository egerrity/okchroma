# OKChroma

**A color-system engine.** Give it one brand hex, or two, and it resolves a complete set
of light and dark color primitives whose contrast requirements are solved during
generation, then emits it as CSS custom properties, as DTCG documents, and as Figma
variables, every token spelled the same way in each.

Every family (neutral, brand, brand-alt, critical, warning, positive, info) carries the
same scale: 3 papers, 4 chalks, 1 highlighter, 1 pencil, 2 pens, plus the stamp (the
solid fill with its hover and pressed states, its edge, and its text). The neutral adds
the two poles. Two link trios and the two brand seeds complete the set. Light and dark
resolve together and ship on the same names, so a token is mapped once and holds for any
brand.

Contrast is built into the math, not checked afterwards: highlighter reads on every paper at
3:1 (the non-text bar), pencil at 4.5:1, pen at 4.5:1 on every paper and chalk in
both directions; the stamp's text passes 4.5:1 on its fill. APCA is used once, as a booster
that nudges the stamp fill until its text reads at Lc 65. Each claim, its scope, and the audit that
proves it: [Guarantees](https://egerrity.github.io/okchroma/#/docs/guarantees).

The engine emits primitives only: values it calculates from the seed. Elevation planes,
shadows, opacity ladders and state layers are a design system's to author on top of these,
and [docs/agents.md](docs/agents.md) says which primitive each of those decisions reads.

> The reserved-role-per-stop model is a conceptual nod to
> [Radix Colors](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale).
> It is not a dependency and does not touch the math; the color computation is original.

## Install

```bash
npm install okchroma
```

ESM and CommonJS builds with TypeScript declarations; no runtime dependencies (the one
perceptual-distance library the engine uses is bundled in). Node 18 or later; no DOM.

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

## What it emits

Every token has one path, and every output spells it: `brand/stamp/fill`,
`neutral/paper-0`, `link/default/enabled`, `absolute/brand`. Joined with hyphens it is the
CSS custom property (`--brand-stamp-fill`); joined with slashes it is the Figma variable
and the DTCG token path. A consumer whose paths start with the category puts a `color`
group in front: the extended plugin writes `color/brand/stamp/fill`, and the DTCG
documents nest under the same word when asked. The CSS names never carry it.

| Group | Tokens |
|---|---|
| `neutral` | `paper-0`, `paper-1`, `paper-3`, `paper-5`, `chalk-8`, `chalk-11`, `chalk-15`, `chalk-20`, `highlighter-26`, `pencil-47`, `pen-58`, `pen-70`, `pen-100`, and the stamp: `stamp/fill`, `stamp/fill-hover`, `stamp/fill-pressed`, `stamp/edge`, `stamp/on` |
| `brand`, `brand-alt`, `critical`, `warning`, `positive`, `info` | the same eleven stops and the same five stamp tokens |
| `link` | `default/enabled`, `default/hover`, `default/pressed` for text on the papers; `inverse/enabled`, `inverse/hover`, `inverse/pressed` for text on the pen ground |
| `absolute` | `brand`, `brand-alt`: the seeds as given, reference values |

What each name means, which stop to read for which job, and the rules for an agent
writing UI against these: [docs/agents.md](docs/agents.md). The scale and its declared
targets: [docs/scale.md](docs/scale.md).

**The stops.** The instrument word is the job, the number is 100 minus the light-mode
lightness target, and bigger is stronger. Papers are backgrounds; chalks are decorative
borders and illustration, never text; the highlighter is the non-text contrast stop (focus
rings, icons, large text, and the one stop to build translucent state layers on); the
pencil and the pens are text, and the pencil doubles as the emphasis fill.

**The stamp.** `stamp/fill` is the call-to-action fill, re-solved per family and theme;
`fill-hover` and `fill-pressed` are its states; `stamp/on` is the text over it, the pole
that passes (the pole at alpha on a quiet fill); `stamp/edge` is a stroke that resolves to
a visible offset only where the fill sits close to the page, else transparent, so a
component renders the border unconditionally and layout never shifts.

**The outputs.**

- CSS: `brandCss` writes `[data-brand="acme"]` and `[data-brand="acme"][data-theme="dark"]`
  blocks, `signalsCss` the brand-independent signal block at `:root`. Values are sRGB
  hexes (or `rgba()` where a token carries alpha); stops whose chroma exceeds sRGB get a
  `color(display-p3 …)` override behind a browser gate. The repo's `npm run generate`
  writes the signal block to `dist/signals.css`.
- The structured emit: `themeTokens` reads the CSS emission back into one object per
  mode with every reference resolved, for consumers with no cascade.
- DTCG: `tokensToDtcg` returns one Design Tokens Format Module 2025.10 document per mode,
  every token with `$type`, an sRGB `$value` whose components and hex are the same 8-bit
  color (or an alias where the CSS writes a reference), and a `$description`. The two join
  through a resolver document. The format: [docs/schema.md](docs/schema.md). The repo's
  `npm run tokens:emit -- '#E93D82' acme` writes both files. Pass `{ rootGroup: 'color' }`,
  or `--root color` to the script, to nest every path and alias under that group.
- Figma: `themeToFigma` returns a light and a dark group tree on the same paths; the
  extended plugin writes it into a file.

## Run from source

```bash
npm install
npm run demo:build      # writes dist/signals.css and bundles the demo
npx serve .             # open http://localhost:3000/demo/index.html
npm run dev             # watch mode
```

`npm run typecheck` runs the compiler; the audit gates (`npm run req:audit`,
`npm run audit:guarantee`, `npm run audit:dtcg`, and the rest of `package.json`) each
sweep agnostic seeds and fail on the worst case. What each proves:
[How it is verified](https://egerrity.github.io/okchroma/#/docs/guarantees/how-it-is-verified).

## Documentation

The docs site renders the mechanisms with live values from the engine:
[egerrity.github.io/okchroma/#/docs](https://egerrity.github.io/okchroma/#/docs).

- [Overview](https://egerrity.github.io/okchroma/#/docs/overview): what goes in, what comes out, the token roster.
- [Output contract](https://egerrity.github.io/okchroma/#/docs/output): the naming grammar, families and prefixes, modes and selectors, a live CSS block and Figma tree.
- [Guarantees](https://egerrity.github.io/okchroma/#/docs/guarantees): every claim stated exactly, and how it is verified.
- [How the theme is generated](https://egerrity.github.io/okchroma/#/docs/generation): the pipeline in execution order, with the constants and the code that runs each step.
- [Signals and companions](https://egerrity.github.io/okchroma/#/docs/signals) and the [Reference](https://egerrity.github.io/okchroma/#/docs/reference): glossary, constants, option types.

In the repo: [docs/agents.md](docs/agents.md) (the consumer contract: what every token
means and the rules for using it), [docs/schema.md](docs/schema.md) (the DTCG documents),
[docs/scale.md](docs/scale.md) (the scale and its declared targets),
[docs/architecture.md](docs/architecture.md) (the maintainer's map: modules, pipeline
stages, data structures, the extended plugin's write path), and
[CHANGELOG.md](CHANGELOG.md).

## The Figma plugins

- **OKChroma Extended** (`plugin-ext/`) is the shipped Figma front-end. It requires the
  Figma desktop app and a Figma Enterprise plan: it writes extended variable collections,
  one base collection with light and dark modes plus one extension per brand that
  overrides only what differs. Download and install steps:
  [install page](https://egerrity.github.io/okchroma/install.html). Build from source with
  `npm run plugin-ext:build`; see [plugin-ext/README.md](plugin-ext/README.md).
- **OKChroma** (`plugin/`, the community plugin) is withdrawn from download until it
  carries the rename table that migrates an existing file across the scale change of July
  2026. It still builds from source with `npm run plugin:build` and imports from
  `plugin/manifest.json`; a fresh file gets the current shape.

The demo and the plugins are front-ends. The product is the engine and what it emits.

## License

MIT
