// Public API for the OKChroma engine.
//
// Import from here and call `resolveBrand` (the recommended entry, with
// collision/signal policy) or `generateScale` (the pure color math) to turn
// a hex into a full token set, then hand the result to the CSS, Figma, or
// DTCG emitter. The published bundle is self-contained: the one runtime
// dependency (helmlab, the P2 adjacency metric) is inlined at build time.
//
// Example:
//   import { resolveBrand, brandCss } from 'okchroma'
//   const resolved = resolveBrand('#E93D82', 'Acme')
//   const css = brandCss('acme', 'Acme', resolved)

// ── Core generation ──────────────────────────────────────────────────────────
export {
  generateScale,
  generateNeutralScale,
  generateSubtleSecondary,
  type GeneratedScale,
  type ColorStop,
  type GenerateOptions,
  type NeutralLevel,
  type ContrastProfile,
} from './engine/colorEngine'

// ── Policy layer (collision + signal resolution) — recommended entry ─────────
export {
  resolveBrand,
  resolveTheme,
  resolveLinkTrio,
  resolveLinkInverseTrio,
  DEFAULT_LINK_HEX,
  SIGNAL_SCALES,
  signalScalesFor,
  SECONDARY_DISTINCT_DELTA_E,
  SUBTLE_TINT_MULT,
  SUBTLE_PASTEL_K,
  OUTLINE_HOVER_ALPHA,
  type ResolvedBrand,
  type ResolvedTheme,
  type ResolvedSecondary,
  type SecondaryLevel,
  type SecondaryStyle,
  type SignalOverride,
} from './engine/resolve'

// ── Emitters ─────────────────────────────────────────────────────────────────
export { brandCss, neutralCss, signalsCss, stopsToVars, toHex, stopHex, OFFSET_ALPHAS } from './engine/cssRender'
export {
  themeToFigma,
  type FigmaGroup,
  type FigmaColorToken,
  type ThemeInput,
} from './engine/figmaRender'
export {
  emitDtcgRamp,
  resolveDtcgRamp,
  parseToken,
  EXT_KEY,
  RESOLVER_ID,
  type DtcgRampGroup,
  type DtcgRequirementToken,
  type DtcgSeedToken,
  type DtcgColorValue,
} from './engine/requirements/dtcg'
export { MODE_SPECS, type ModeSpec } from './engine/requirements/spec'

// ── Token vocabulary ─────────────────────────────────────────────────────────
// External consumers must ride these rosters instead of spelling token names —
// a rename then breaks their build instead of silently mis-mapping.
export {
  stopTokenName,
  tokenOrder,
  SCALE_STOP_COUNT,
  PAPER_100,
  INK_0,
  STAMP_FILL,
  STAMP_FILL_HOVER,
  STAMP_FILL_PRESSED,
  STAMP_EDGE,
  STAMP_ON,
  STAMP_STATE_LEAVES,
} from './engine/tokenNames'
export { SIGNAL_EMIT_NAME } from './engine/signals'

// ── Supporting types + data ──────────────────────────────────────────────────
export { classifyArchetype, type Archetype } from './engine/archetypes'
export { SIGNALS, type SignalDef } from './engine/signals'
export { checkCollision, checkHueCollision, checkAllCollisions, type HueCollisionCheck } from './engine/collision'
