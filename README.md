# OKChroma

**A color-system engine.** Give it one (or two) brand color(s) and it generates a complete,
accessible, theme-ready color system around it.

Each color family is a light and dark ramp built from pre-reserved roles — 3 papers,
4 highlighters, 1 crayon, 1 pencil, and 2 pens — plus the stamp fill with its hover and
pressed states and its on-text color, for each brand hex inputted. Alongside the brand color(s), it generates a neutral and the critical / warning / positive / info signal scales. The inputted hex color(s) is/are preserved in identity swatches for logos or other brand identity moments.

The point is **white-label predictability**: every ramps's stops land at the same
perceived lightness and play the same role, so you map your design tokens to step
**numbers** once and they hold for any color scale. Contrast is built into the math, not
bolted on after: the system solves against **WCAG** ratios (every text color guaranteed
to pass), with **APCA** as an added legibility floor on CTA text (Lc 65 clearance on top
of the 4.5:1 requirement).

Output comes in two interchangeable forms carrying the same values:

- **CSS custom properties** — per-brand CSS generated live (`brandCss`) + the static
  `dist/signals.css`.
- **Figma variables** — written into a Figma file by the bundled plugin.

The live demo and the Figma plugin are previews/front-ends; the engine and its output are
the product.

> The "reserved role per step" model is a conceptual nod to
> [Radix Colors](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale).
> It is **not** a dependency and does not affect the math — all color computation is original.

## Quick start

```bash
npm install
npm run demo:build      # generate token CSS + bundle the demo
npx serve .             # then open http://localhost:3000/demo/index.html
```

Live editing: `npm run dev` (watch mode). Build the Figma plugin: `npm run plugin:build`,
then import `plugin/manifest.json` in Figma.

## Use as an npm package

```bash
npm install okchroma
```

```ts
import { resolveTheme, brandCss, signalsCss } from 'okchroma'

const t = resolveTheme({ primaryHex: '#E93D82', name: 'Acme' })
const css = brandCss('acme', 'Acme', t.themed) + '\n' + signalsCss()
```

`resolveTheme` solves the full system for a seed (primary, optional secondary, neutral
source, signal policy). `brandCss` emits the solved light and dark values as CSS custom
properties scoped to `[data-brand="acme"]`, with dark values under
`[data-brand="acme"][data-theme="dark"]`; the per-brand neutral is included in the same
block. Variables are named `--brand-<token>`, `--neutral-<token>`, and
`--<signal>-<token>`. Inject the string into a `<style>` tag at runtime or write it to a
file at build time; `signalsCss()` is brand-independent and emitted once.

The same resolved theme feeds the other emitters: `themeToFigma` returns the Figma
variable payload, and `emitDtcgRamp` returns DTCG JSON carrying the live requirement in
`$extensions`. ESM and CJS builds ship with TypeScript declarations. The package bundles
its one runtime dependency (helmlab), so installing it adds nothing transitive.

**Versioning** (0.x): a patch changes only resolved values, internal fixes, and docs; any
release that adds, renames, or removes token keys, or changes the emit structure, ships as
at least a minor. Release notes: [CHANGELOG.md](CHANGELOG.md).

## How it works (30 seconds)

Every token is a **requirement the engine solves, not a frozen value**. A pure-data
declaration (`src/engine/requirements/spec.ts`) states each stop's producer (perceptual
placement, warm drift, chroma ladder) and its requirements (contrast floors, seam
separations, on-text rules); a resolver executes it per seed — **produce → require →
refine**. `resolveBrand(hex)` runs that engine, applies **policy** (status-color
collisions, signal shifts), and an **emitter** (`cssRender` / `figmaRender`) maps the
resolved stops onto named tokens and picks light vs dark. The declaration also
round-trips to DTCG tokens (`$value` fallback + the live requirement in `$extensions`).

- **Engine:** `src/engine/*` — pure TypeScript with one runtime dependency (helmlab,
  the P2 adjacency metric), bundled into the npm package at build time.
- **Entry points:** `resolveBrand` (`src/engine/resolve.ts`) and `generateScale`
  (`src/engine/colorEngine.ts`, an adapter over the resolver — same signature as always).
- **Build:** `src/build.ts` writes the one static output, `dist/signals.css`. There is no
  brand roster: per-brand CSS is generated live by whichever caller resolves a hex (the
  demo's hex input, a plugin's form field).

## The Figma plugin

The bundled plugin runs the same engine inside Figma and writes the resolved system into
your file as variables: **theme** + **mode** collections whose tokens alias onto
shared primitives — per-brand ramps under `brand/<name>`, with neutrals and signals
deduplicated across brands, light + dark values on every token.

**Install** — from source:

```bash
npm install && npm run plugin:build
```

then Figma → Plugins → Development → **Import plugin from manifest** →
`plugin/manifest.json`.

> The hosted download for **this** plugin is **withdrawn** as of 2026-07-29. The scale
> changed shape in that round — `highlight-9` and `on-highlight` were removed and the pen
> stops renumbered — and this plugin does not yet carry the rename table that migrates an
> existing Figma file across it, so updating an installed copy would orphan its variable
> bindings. Building from source is unaffected: a fresh file gets the new shape correctly.
>
> The **extended collections** plugin (Figma Enterprise) does carry the migration and is
> published as normal — **[install it here](https://egerrity.github.io/okchroma/install.html)**.

**Use** — name the brand, pick a primary, and Apply. Optional before applying:

- **Secondary color** — "+ Add secondary" starts on *From primary* (a pastel derived from
  your primary); type any hex for a custom secondary in **Tint / Pastel / Outline / Exact**
  style.
- **Neutral color** — *Default* (a touch of primary hue), *Medium* (slightly more tint), *Intense*, or *True grey*.
- **Contrast standard** — **APCA** (default) or **WCAG**. One profile per collection pair:
  applying the other profile to an existing file forks a clearly-labeled second pair
  (`theme-wcag`/`mode-wcag`) instead of ever mixing values.

Re-applying the same brand name updates it in place (after a confirm); a new name adds a
brand to the same collections — two applies with two brand colors is a multi-brand system
on shared foundations.

## Documentation

Full system documentation — overview, architecture (data flow + design decisions),
dependencies, setup — is in **[docs/architecture.md](docs/architecture.md)**.
The scale model and its per-stop targets are in **[docs/scale.md](docs/scale.md)**.
The requirement-token schema — the DTCG token format, field by field, with real
emitted examples — is in **[docs/schema.md](docs/schema.md)**.

## License

MIT
