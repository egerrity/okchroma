# OKChroma

**A color-system engine.** Give it one (or two) brand color(s) and it generates a complete,
accessible, theme-ready color system around it.

The system includes a 12-step light ramp and dark ramp with pre-reserved roles + a
solid CTA resting/hover pairing for each brand hex inputted. Alongside the brand color(s), it generates neutral, info-color, and red/yellow/green signal color scales. The inputted hex color(s) is/are preserved in identity swatches for logos or other brand identity moments.

The point is **white-label predictability**: every ramps's stops land at the same
perceived lightness and play the same role, so you map your design tokens to step
**numbers** once and they hold for any color scale. Contrast (WCAG, plus APCA for emphasis
fills) is built into the math, not bolted on after.

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

`resolveBrand(hex)` → calls the pure `generateScale` (the OKLCH color math) → applies
**policy** (status-color collisions, signal shifts) → an **emitter** (`cssRender` /
`figmaRender`) maps the computed stops onto named tokens and picks light vs dark.

- **Engine:** `src/engine/*` — zero runtime dependencies, pure TypeScript.
- **Entry points:** `resolveBrand` (`src/engine/resolve.ts`) and `generateScale`
  (`src/engine/colorEngine.ts`).
- **Batch build:** `src/build.ts` runs the engine over the brand fixtures in
  `src/brands.ts` and writes `dist/*.css`.

## Documentation

Full system documentation — overview, architecture (data flow + design decisions),
dependencies, setup — is in **[docs/architecture.md](docs/architecture.md)**.
The scale model and its per-stop targets are in **[docs/scale.md](docs/scale.md)**.

## License

MIT
