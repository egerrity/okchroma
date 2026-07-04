# OKChroma

**A color-system engine.** Give it one (or two) brand color(s) and it generates a complete,
accessible, theme-ready color system around it.

The system includes a 12-step light ramp and dark ramp with pre-reserved roles + a
solid CTA resting/hover pairing for each brand hex inputted. Alongside the brand color(s), it generates neutral, info-color, and red/yellow/green signal color scales. The inputted hex color(s) is/are preserved in identity swatches for logos or other brand identity moments.

The point is **white-label predictability**: every ramps's stops land at the same
perceived lightness and play the same role, so you map your design tokens to step
**numbers** once and they hold for any color scale. Contrast is built into the math, not
bolted on after — and the whole system re-solves under your choice of contrast law:
**APCA** (the shipped default — the perceptual model) or **WCAG** (the strict ratios,
every text color guaranteed to pass its ratio).

Output comes in two interchangeable forms carrying the same values:

- **CSS custom properties** — `dist/brands.css` + `dist/signals.css`, via the semantic
  layer `tokens/semantic.css`.
- **Figma variables** — written into a Figma file by the bundled plugin.

The live demo and the Figma plugin are previews/front-ends; the engine and its output are
the product.

> The 12-step "reserved role per step" model is a conceptual nod to
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

## How it works (30 seconds)

Every token is a **requirement the engine solves, not a frozen value**. A pure-data
declaration (`src/reqtoken/spec.ts`) states each stop's producer (perceptual placement,
warm drift, chroma ladder) and its requirements (contrast floors, seam separations,
on-text rules); a resolver executes it per seed — **produce → require → refine**.
`resolveBrand(hex)` runs that engine, applies **policy** (status-color collisions, signal
shifts), and an **emitter** (`cssRender` / `figmaRender`) maps the resolved stops onto
named tokens and picks light vs dark. The declaration also round-trips to DTCG tokens
(`$value` fallback + the live requirement in `$extensions`).

- **Engine:** `src/engine/*` + `src/reqtoken/*` — zero runtime dependencies, pure TypeScript.
- **Entry points:** `resolveBrand` (`src/engine/resolve.ts`) and `generateScale`
  (`src/engine/colorEngine.ts`, an adapter over the resolver — same signature as always).
- **Batch build:** `src/build.ts` runs the engine over the brand fixtures in
  `src/brands.ts` and writes `dist/*.css`.

## The Figma plugin

The bundled plugin runs the same engine inside Figma and writes the resolved system into
your file as variables: **theme** + **mode** collections whose semantic tokens alias onto
shared primitives — per-brand ramps under `brand/<name>`, with neutrals and signals
deduplicated across brands, light + dark values on every token.

**Install** — from the Figma Community listing (search "OKChroma"), or from source:

```bash
npm install && npm run plugin:build
```

then Figma → Plugins → Development → **Import plugin from manifest** →
`plugin/manifest.json`.

**Use** — name the brand, pick a primary, and Apply. Optional before applying:

- **Secondary color** — "+ Add secondary" starts on *From primary* (a pastel derived from
  your primary); type any hex for a custom secondary in **Tint / Pastel / Outline / Exact**
  style.
- **Neutral color** — *Default* (a touch of primary hue), *Intense*, or *True grey*.
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
