# OKChroma

**A color-system engine.** Give it one brand hex, or two, and it resolves a complete
light and dark token system whose contrast requirements are solved during generation,
then emits it as CSS custom properties or Figma variables.

Every family (neutral, brand, brand-alt, critical, warning, positive, info) carries the
same scale: 3 papers, 4 highlighters, 1 crayon, 1 pencil, 2 pens, plus the stamp (the
solid fill with its hover and pressed states, its edge, and its text). The neutral adds
the two poles. Light and dark resolve together and ship on the same names, so a token is
mapped once and holds for any brand.

Contrast is built into the math, not checked afterwards: crayon reads on every paper at
3:1 (the non-text bar), pencil at 4.5:1, pen at 4.5:1 on every paper and highlighter in
both directions; the stamp's text passes 4.5:1 on its fill. APCA is used once, as a booster
that nudges the stamp fill until its text reads at Lc 65. Each claim, its scope, and the audit that
proves it: [Guarantees](https://egerrity.github.io/okchroma/#/docs/guarantees).

> The reserved-role-per-stop model is a conceptual nod to
> [Radix Colors](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale).
> It is not a dependency and does not touch the math; the color computation is original.

## Install

```bash
npm install okchroma
```

ESM and CommonJS builds with TypeScript declarations; no runtime dependencies (the one
perceptual-distance library the engine uses is bundled in).

```ts
import { resolveTheme, brandCss, signalsCss, neutralTintHue } from 'okchroma'

const theme = resolveTheme({ primaryHex: '#E93D82', name: 'acme', deriveSecondary: true })
const neutralH = neutralTintHue(theme.themed.scale.brandH)
const css = brandCss('acme', 'Acme', theme.themed, theme.secondary?.scale ?? null,
  '', 'default', undefined, theme.secondary?.style, false, null, true, neutralH)
  + '\n' + signalsCss()
// put css in a stylesheet; set data-brand="acme" on the themed root,
// and data-theme="dark" on it for dark mode
```

The Figma tree comes from `themeToFigma`. Signatures, the full input, and an end-to-end example:
[Install and API](https://egerrity.github.io/okchroma/#/docs/install).

## Run from source

```bash
npm install
npm run demo:build      # writes dist/signals.css and bundles the demo
npx serve .             # open http://localhost:3000/demo/index.html
npm run dev             # watch mode
```

`npm run typecheck` runs the compiler; the audit gates (`npm run req:audit`,
`npm run audit:guarantee`, and the rest of `package.json`) each sweep agnostic seeds and
fail on the worst case. What each proves:
[How it is verified](https://egerrity.github.io/okchroma/#/docs/guarantees/how-it-is-verified).

## Documentation

The docs site is the source: [egerrity.github.io/okchroma/#/docs](https://egerrity.github.io/okchroma/#/docs).

- [Overview](https://egerrity.github.io/okchroma/#/docs/overview): what goes in, what comes out, the token roster.
- [Output contract](https://egerrity.github.io/okchroma/#/docs/output): the naming grammar, families and prefixes, modes and selectors, a live CSS block and Figma tree.
- [Guarantees](https://egerrity.github.io/okchroma/#/docs/guarantees): every claim stated exactly, and how it is verified.
- [How the theme is generated](https://egerrity.github.io/okchroma/#/docs/generation): the pipeline in execution order, with the constants and the code that runs each step.
- [Signals and companions](https://egerrity.github.io/okchroma/#/docs/signals) and the [Reference](https://egerrity.github.io/okchroma/#/docs/reference): glossary, constants, option types.

In the repo: [docs/architecture.md](docs/architecture.md) (the maintainer's map: modules,
pipeline stages, data structures, the extended plugin's zones),
[docs/scale.md](docs/scale.md) (the scale and its declared targets),
[docs/schema.md](docs/schema.md) (the format of the experimental DTCG export),
[docs/agents.md](docs/agents.md) (how a coding agent consuming the tokens should read
them), and [CHANGELOG.md](CHANGELOG.md).

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
