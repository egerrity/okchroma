// Public API for the OKChroma engine.
//
// Import from here and call `resolveTheme` (the recommended entry: the primary with its
// signal policy, plus the secondary) or `resolveBrand` (one family with the policy) or
// `generateScale` (the pure color math) to turn a hex into a full set of primitives, then
// hand the result to an emitter: `brandCss` and `signalsCss` for CSS custom properties,
// `themeTokens` for the same values as one object per mode, `themeToFigma` for the Figma
// tree, and `tokensToDtcg` for the two DTCG documents. Every emitter spells every name
// through the one grammar in tokenNames.ts. The published bundle is self-contained: the
// one runtime dependency (helmlab, the P2 adjacency metric) is inlined at build time.
//
// Example:
//   import { resolveTheme, brandCss, themeTokens, tokensToDtcg } from 'okchroma'
//   const theme = resolveTheme({ primaryHex: '#E93D82', name: 'acme', deriveSecondary: true })
//   const css = brandCss('acme', 'Acme', theme.themed, theme.secondary?.scale ?? null)
//   const { light, dark } = tokensToDtcg(themeTokens({ slug: 'acme', brand: theme.themed, secondary: theme.secondary?.scale ?? null }))

// ── Core generation ──────────────────────────────────────────────────────────
export {
  generateScale,
  generateNeutralScale,
  generateSubtleSecondary,
  neutralTintHue,
  type NeutralSource,
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
export {
  brandCss,
  neutralCss,
  signalsCss,
  stopsToVars,
  toHex,
  stopHex,
  OFFSET_ALPHAS,
  type OffsetRung,
  ctaNeedsBorder,
  ctaBorderRung,
  pageStopFor,
} from './engine/cssRender'
export { CSS_FAMILY, describeToken, describeDocument, GUARANTEE_SCOPE, BAND_STOPS } from './engine/tokenDescriptions'
export {
  themeTokens,
  tokensFromEmission,
  readEmission,
  resolveReferences,
  type ThemeTokens,
  type ThemeTokensInput,
  type TokenMode,
} from './engine/tokensRender'
export {
  themeToFigma,
  groupEntries,
  type FigmaGroup,
  type FigmaColorToken,
  type FigmaLeaf,
  type ThemeInput,
} from './engine/figmaRender'
export {
  tokensToDtcg,
  tokenPathOf,
  descriptionPathOf,
  type DtcgDocument,
  type DtcgGroup,
  type DtcgToken,
  type DtcgColorValue,
  type DtcgOptions,
} from './engine/dtcgRender'
export { MODE_SPECS, type ModeSpec } from './engine/requirements/spec'

// ── Token vocabulary ─────────────────────────────────────────────────────────
// External consumers must ride these rosters instead of spelling token names —
// a rename then breaks their build instead of silently mis-mapping.
export {
  stopTokenName,
  tokenOrder,
  SCALE_STOP_COUNT,
  PAPER_0,
  PEN_100,
  STAMP_FILL,
  STAMP_FILL_HOVER,
  STAMP_FILL_PRESSED,
  STAMP_EDGE,
  STAMP_ON,
  STAMP_STATE_LEAVES,
  STAMP_LEAF,
  cssVarName,
  figmaPathOf,
  familyPath,
  linkPath,
  absolutePath,
  LINK_GROUP,
  LINK_POSTURES,
  LINK_STATES,
  ABSOLUTE_GROUP,
  COLOR_GROUP,
  type TokenPath,
  type LinkPosture,
  type LinkState,
} from './engine/tokenNames'
export { SIGNAL_EMIT_NAME } from './engine/signals'

// ── Supporting types + data ──────────────────────────────────────────────────
export { classifyArchetype, type Archetype } from './engine/archetypes'
export { SIGNALS, type SignalDef } from './engine/signals'
export { checkCollision, checkHueCollision, checkAllCollisions, type HueCollisionCheck } from './engine/collision'
