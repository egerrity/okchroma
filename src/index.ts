// Public API for the OKChroma engine.
//
// The engine is dependency-free — import from here and call `resolveBrand`
// (the recommended entry, with collision/signal policy) or `generateScale`
// (the pure color math) to turn a hex into a full token set, then hand the
// result to the CSS or Figma emitter.
//
// Example:
//   import { resolveBrand, brandCss } from 'okchroma/src'
//   const resolved = resolveBrand('#E93D82', 'Acme')
//   const css = brandCss('acme', 'Acme', resolved)

// ── Core generation ──────────────────────────────────────────────────────────
export {
  generateScale,
  generateNeutralScale,
  generateIllustrationScale,
  type GeneratedScale,
  type ColorStop,
  type IllustrationScale,
  type GenerateOptions,
  type NeutralLevel,
  type ContrastProfile,
} from './engine/colorEngine'

// ── Policy layer (collision + signal resolution) — recommended entry ─────────
export {
  resolveBrand,
  SIGNAL_SCALES,
  signalScalesFor,
  type ResolvedBrand,
  type SignalOverride,
} from './engine/resolve'

// ── Emitters ─────────────────────────────────────────────────────────────────
export { brandCss, neutralCss, signalsCss, stopsToVars, toHex } from './engine/cssRender'
export {
  themeToFigma,
  type FigmaGroup,
  type FigmaColorToken,
  type ThemeInput,
} from './engine/figmaRender'

// ── Token vocabulary ─────────────────────────────────────────────────────────
export { stopTokenName, onFillTokenName, tokenOrder, type RampKind } from './engine/tokenNames'

// ── Supporting types + data ──────────────────────────────────────────────────
export { classifyArchetype, type Archetype } from './engine/archetypes'
export { SIGNALS, type SignalDef } from './engine/signals'
export { checkCollision, checkAllCollisions } from './engine/collision'
