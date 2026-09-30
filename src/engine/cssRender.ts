// The CSS emitter: one brand's light and dark blocks, the brand-independent signal block,
// and the display-p3 renditions behind their gates. Every name is spelled through the one
// grammar in tokenNames.ts; every value is the sRGB clamp-down of the resolved color.
import { generateNeutralScale, type GeneratedScale, type ColorStop, type NeutralLevel, type ContrastProfile } from './colorEngine'
import { srgbEmitChannels, masterEmitChannels } from './colorMath'
import { clampChromaToGamut, apcaY, apcaLc } from './constraints'
import { stopTokenName, tokenOrder, PAPER_0, PEN_100, STAMP_FILL, STAMP_FILL_HOVER, STAMP_FILL_PRESSED, STAMP_EDGE, STAMP_ON, cssVarName, familyPath, linkPath, absolutePath, type LinkState } from './tokenNames'
import { signalScalesFor, OUTLINE_HOVER_ALPHA, OUTLINE_PRESSED_ALPHA, SOFT_ON_CTA_ALPHA, softOnCtaPasses, escapeCtaFamily, resolveLinkTrio, resolveLinkInverseTrio, type ResolvedBrand, type SecondaryStyle } from './resolve'
import { SIGNALS, SIGNAL_EMIT_NAME } from './signals'
import { CSS_FAMILY } from './tokenDescriptions'

// the CSS grammar words, single-sourced — a family rename edits the CSS_FAMILY
// table, never this file
const { brandPrimary: CSS_BRAND, brandSecondary: CSS_SECONDARY, neutral: CSS_NEUTRAL } = CSS_FAMILY

export function toHex(r: number, g: number, b: number): string {
  const ch = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')
  return `#${ch(r)}${ch(g)}${ch(b)}`
}

// The emit split (§4B): hex = the sRGB clamp-down (gamut-mapped chroma-reduce); the P3
// rendition ships as a color(display-p3 …) override behind @supports, emitted ONLY for
// stops whose master chroma exceeds the sRGB ceiling — in-gamut stops need no override.
export const stopHex = (s: ColorStop): string => {
  const { r, g, b } = srgbEmitChannels(s)
  return toHex(r, g, b)
}
const p3Value = (s: ColorStop): string => {
  const e = (v: number) => Math.min(1, Math.max(0, v)).toFixed(4)
  const [r, g, b] = masterEmitChannels(s)
  return `color(display-p3 ${e(r)} ${e(g)} ${e(b)})`
}
const p3Differs = (s: ColorStop): boolean => s.C > clampChromaToGamut(s.L, s.C, s.H, 'srgb') + 1e-4
// Two gates, both required: @media (color-gamut: p3) = the DISPLAY can show P3 (an sRGB
// display keeps the engine's own chroma-reduced fallback — never the browser's cruder
// clamp of the P3 value); @supports = the browser parses color() (custom properties
// accept any token stream, so without this an old browser would carry the unparsed
// value to the var() site and break the property there).
export const P3_SUPPORTS = '@supports (color: color(display-p3 1 1 1))'
export const P3_MEDIA = '@media (color-gamut: p3)'

export function stopsToVars(stops: ColorStop[], prefix: string): string {
  return [...stops]
    .sort((a, b) => tokenOrder(stopTokenName(a.stop)) - tokenOrder(stopTokenName(b.stop)))
    .map(s => `  ${cssVarName(familyPath(prefix, stopTokenName(s.stop)))}: ${stopHex(s)};`)
    .join('\n')
}

const onColor = (white: boolean) => (white ? '#ffffff' : '#000000')

// A ramp body for one mode: the scale stops sorted by token order, the off-scale stamp
// fill trio, the edge and the on-text. Used for the brand, the secondary and the generated
// neutral, so every family is emitted the same way. The seed absolute is mode-invariant and
// the caller emits it once.
//
// THE EDGE is a decorative stroke, not a conformance requirement: a fill that cannot
// separate itself from the page earns a stroke so it sits on the page instead of vibrating
// against it. Layout never shifts; components carry the border unconditionally and the
// token resolves to transparent when the gate does not fire.
//
// The gate reads APCA as a taste instrument, never an accessibility one: a fill under
// CTA_BORDER_LC_FLOOR against the page earns the stroke, and the stroke lands between APCA's
// discernibility floor and its text minimum. The page is the neutral's paper-3 in light and
// paper-1 in dark, one ruler for every family; |Lc| is absolute, so both modes share one
// branch. The measurements behind the floor and the rungs are in CATALOG C39 and C41.
export const CTA_BORDER_LC_FLOOR = 15
const CTA_BORDER_PAGE_STOP = { light: 2, dark: 1 } as const

// the page a family's cta is judged against, exported so the audit gate measures the same
// plane the emitter does
export function pageStopFor(neutral: GeneratedScale, mode: 'light' | 'dark'): ColorStop | undefined {
  const stops = mode === 'light' ? neutral.light : neutral.dark
  return stops.find(x => x.stop === CTA_BORDER_PAGE_STOP[mode])
}

// The stroke is an alpha, never a ramp stop: the page-polarity pole (black in light, white
// in dark) at one rung per family, fixed by role. The rungs are not evenly spaced because
// the same alpha lands at a different Lc over different fills; each was chosen on the
// resulting Lc. The neutral is fixed at 08 and not solved: its quiet fill sits under APCA's
// reporting floor against the page in both modes, and the rung that would lift its dark
// stroke into the band was ruled too loud.
export const OFFSET_ALPHAS = { 6: 0.06, 8: 0.08, 16: 0.16 } as const
export type OffsetRung = keyof typeof OFFSET_ALPHAS
export const ctaBorderRung = (prefix: string): OffsetRung =>
  prefix === CSS_NEUTRAL ? 8 : prefix === CSS_SECONDARY ? 6 : 16
// The edge is a literal in every output: the page-polarity pole (black in light, white
// in dark) at the family's rung, or transparent when the gate does not fire. No alpha row
// exists for it to alias (C68).
export const offsetRgba = (rung: OffsetRung, mode: 'light' | 'dark'): string =>
  mode === 'light' ? `rgba(0, 0, 0, ${OFFSET_ALPHAS[rung]})` : `rgba(255, 255, 255, ${OFFSET_ALPHAS[rung]})`

// |Lc| of the cta against the page. apcaLc is SIGNED and order-sensitive — it branches on which
// side is lighter with different exponents — so every caller in this engine takes the magnitude,
// and discernibility is a magnitude question. ColorStop.r/g/b are already the master basis's own
// gamma-encoded components, which is exactly what apcaY consumes; nothing to convert.
export function ctaPageLc(s: GeneratedScale, mode: 'light' | 'dark', page: ColorStop): number {
  const cta = mode === 'light' ? s.cta : s.ctaDark
  return Math.abs(apcaLc(apcaY(cta.r, cta.g, cta.b), apcaY(page.r, page.g, page.b)))
}

// A cta earns the stroke when it cannot separate itself from the page. Absent a page (no neutral
// in scope) nothing fires — the same conservative default the missing-anchor case had.
export function ctaNeedsBorder(s: GeneratedScale, mode: 'light' | 'dark', page: ColorStop | undefined): boolean {
  if (!page) return false
  return ctaPageLc(s, mode, page) < CTA_BORDER_LC_FLOOR
}

// `on` is the stamp-on register: 'soft' is the pole at SOFT_ON_CTA_ALPHA (the quiet fills),
// 'solid' the pole. Defaults soft for the neutral, solid for everyone else; brandCss passes
// the secondary's per-mode verdict (softOnCtaPasses) so the body writes the right line once
// instead of a post-body cascade override. (The paper overlays are parked: nothing emits
// them; the solve lives in alphaPapers.ts under audit:alpha.)
export function brandKindBody(prefix: string, s: GeneratedScale, mode: 'light' | 'dark', page: ColorStop | undefined, on: 'soft' | 'solid' = prefix === CSS_NEUTRAL ? 'soft' : 'solid'): string[] {
  const stops = mode === 'light' ? s.light : s.dark
  const f = ctaFamilyOf(s, mode)
  const onCta = mode === 'light' ? s.onFillTextIsWhite : s.onFillTextIsWhiteDark
  // the edge: the gated stroke at this family's rung, else transparent. The outline
  // secondary overrides it with its own highlighter-26 after this body, where the border is
  // the button's identity, not a safety.
  const border = ctaNeedsBorder(s, mode, page)
  // the scale block in canonical token order
  const scaleBlock = [
    ...stops.map(x => ({ name: stopTokenName(x.stop), line: `  ${cssVarName(familyPath(prefix, stopTokenName(x.stop)))}: ${stopHex(x)};` })),
  ].sort((a, b) => tokenOrder(a.name) - tokenOrder(b.name)).map(v => v.line).join('\n')
  return [
    scaleBlock,
    `  ${cssVarName(familyPath(prefix, STAMP_FILL))}: ${stopHex(f.cta)};`,
    `  ${cssVarName(familyPath(prefix, STAMP_FILL_HOVER))}: ${stopHex(f.ctaHover)};`,
    `  ${cssVarName(familyPath(prefix, STAMP_FILL_PRESSED))}: ${stopHex(f.ctaPressed)};`,
    `  ${cssVarName(familyPath(prefix, STAMP_EDGE))}: ${border ? offsetRgba(ctaBorderRung(prefix), mode) : 'transparent'};`,
    // the soft on-text: a quiet fill's button text is the pole at alpha, composited over
    // whatever state the fill is in so hover and pressed carry their own legibility (C47).
    // The neutral's is unconditional (the parameter default); the secondary's is the
    // caller's per-mode verdict. Loud fills (the brand, the signals, the cta escape) keep
    // the solid pole.
    on === 'soft'
      ? `  ${cssVarName(familyPath(prefix, STAMP_ON))}: rgba(${onCta ? '255, 255, 255' : '0, 0, 0'}, ${SOFT_ON_CTA_ALPHA[mode]});`
      : `  ${cssVarName(familyPath(prefix, STAMP_ON))}: ${onColor(onCta)};`,
  ]
}

// the cta fill trio for one mode — shared by the base body and the P3 override body
function ctaFamilyOf(s: GeneratedScale, mode: 'light' | 'dark') {
  return mode === 'light'
    ? { cta: s.cta, ctaHover: s.ctaHover, ctaPressed: s.ctaPressed }
    : { cta: s.ctaDark, ctaHover: s.ctaHoverDark, ctaPressed: s.ctaPressedDark }
}

// the P3 override body for one family and mode: only the properties whose master
// rendition exceeds sRGB (the on-text poles and the edge never do)
export function brandKindP3Body(prefix: string, s: GeneratedScale, mode: 'light' | 'dark'): string[] {
  const stops = mode === 'light' ? s.light : s.dark
  const f = ctaFamilyOf(s, mode)
  const out: string[] = []
  for (const st of stops) if (p3Differs(st)) out.push(`  ${cssVarName(familyPath(prefix, stopTokenName(st.stop)))}: ${p3Value(st)};`)
  for (const [name, st] of [[STAMP_FILL, f.cta], [STAMP_FILL_HOVER, f.ctaHover], [STAMP_FILL_PRESSED, f.ctaPressed]] as const)
    if (p3Differs(st)) out.push(`  ${cssVarName(familyPath(prefix, name))}: ${p3Value(st)};`)
  return out
}

// The neutral as its own light and dark block under `selector`: the demo's brandless
// chrome reuses this. The product emits the neutral inline per brand (see brandCss); this
// is the same body scoped to an arbitrary selector.
export function neutralCss(selector: string, brandH: number, level: NeutralLevel = 'default', contrastProfile?: ContrastProfile, ctaBorder = true): string {
  const s = generateNeutralScale(brandH, level, contrastProfile)
  const nPage = (mode: 'light' | 'dark') => ctaBorder ? pageStopFor(s, mode) : undefined
  // the poles ride along: any scope that carries the ladder also carries its mode-flipping
  // extremes. paper-0 resolves; pen-100 is the literal pole (black in light, white in dark)
  // and the fallbacks below match it by construction.
  const p0 = (st: ColorStop | undefined, fallback: string) => (st ? stopHex(st) : fallback)
  const p3Light = brandKindP3Body(CSS_NEUTRAL, s, 'light')
  const p3Dark = brandKindP3Body(CSS_NEUTRAL, s, 'dark')
  return [
    `${selector} {`,
    `  ${cssVarName(familyPath(CSS_NEUTRAL, PAPER_0))}: ${p0(s.paper0, '#ffffff')};`,
    `  ${cssVarName(familyPath(CSS_NEUTRAL, PEN_100))}: ${p0(s.pen100, '#000000')};`,
    // the neutral is the page, so it is judged against its own paper stop
    ...brandKindBody(CSS_NEUTRAL, s, 'light', nPage('light')),
    `}`,
    `${selector}[data-theme="dark"] {`,
    `  ${cssVarName(familyPath(CSS_NEUTRAL, PAPER_0))}: ${p0(s.paper0Dark, '#000000')};`,
    `  ${cssVarName(familyPath(CSS_NEUTRAL, PEN_100))}: ${p0(s.pen100Dark, '#ffffff')};`,
    ...brandKindBody(CSS_NEUTRAL, s, 'dark', nPage('dark')),
    `}`,
    ...(p3Light.length || p3Dark.length ? [
      `${P3_SUPPORTS} {`,
      `${P3_MEDIA} {`,
      ...(p3Light.length ? [`${selector} {`, ...p3Light, `}`] : []),
      ...(p3Dark.length ? [`${selector}[data-theme="dark"] {`, ...p3Dark, `}`] : []),
      `}`,
      `}`,
    ] : []),
  ].join('\n')
}

// The canonical signal block (`:root` light plus the dark selector below), per profile: the
// build writes the wcag one to signals.css; the demo re-emits the apca one as an override.
//
// Dark selector: the compound `:root[data-theme="dark"]` (0,2,0) is the cascade guarantee.
// The P3 light block re-declares out-of-sRGB stops under bare `:root` (0,1,0) later in the
// file, and at equal specificity source order wins, so a flat `[data-theme="dark"]` dark
// base would lose every property the P3 dark block omits to its light display-p3 rendition
// on a root-themed page. brandCss and neutralCss are immune because their dark selectors
// compound the base selector. The bare `[data-theme="dark"]` stays in the list for scoped
// carriers (the demo rides the attribute on divs, which `:root` never matches).
const SIGNALS_DARK_SELECTOR = ':root[data-theme="dark"], [data-theme="dark"]'
export function signalsCss(contrastProfile?: ContrastProfile): string {
  const sigScales = signalScalesFor(contrastProfile)
  // The one place with no brand in scope: signals.css is one shared file across every
  // brand, so a per-brand neutral is unreachable here. The neutral's lightness scaffold is
  // brand-independent and only its chroma tints, so a canonical plane is a faithful page
  // for the edge gate; the spread across brand hues sits far under the gate's resolution,
  // and no signal reaches the floor in either mode anyway.
  const canonicalNeutral = generateNeutralScale(0, 'default', contrastProfile)
  const sigPage = { light: pageStopFor(canonicalNeutral, 'light'), dark: pageStopFor(canonicalNeutral, 'dark') }
  const lightBlocks: string[] = []
  const darkBlocks: string[] = []
  const p3LightBlocks: string[] = []
  const p3DarkBlocks: string[] = []

  for (const sig of SIGNALS) {
    const { scale } = sigScales.get(sig.name)!
    // a signal is brand-kind: its own ramp, a loud stamp, a solved on-text. The emitted
    // prefix is the role name; the identity name stays engine-internal.
    lightBlocks.push(...brandKindBody(sig.emitName, scale, 'light', sigPage.light))
    darkBlocks.push(...brandKindBody(sig.emitName, scale, 'dark', sigPage.dark))
    p3LightBlocks.push(...brandKindP3Body(sig.emitName, scale, 'light'))
    p3DarkBlocks.push(...brandKindP3Body(sig.emitName, scale, 'dark'))
  }

  return [
    `/* Signal scales — engine-generated from canonical hexes, shared across brands */`,
    `:root {`,
    ...lightBlocks,
    `}`,
    `${SIGNALS_DARK_SELECTOR} {`,
    ...darkBlocks,
    `}`,
    ...(p3LightBlocks.length || p3DarkBlocks.length ? [
      `${P3_SUPPORTS} {`,
      `${P3_MEDIA} {`,
      ...(p3LightBlocks.length ? [`:root {`, ...p3LightBlocks, `}`] : []),
      ...(p3DarkBlocks.length ? [`${SIGNALS_DARK_SELECTOR} {`, ...p3DarkBlocks, `}`] : []),
      `}`,
      `}`,
    ] : []),
  ].join('\n')
}

export function annotationNote(r: ResolvedBrand, opts?: { archetypeOverride?: string }): string {
  let note = ''
  if (r.shearDeg !== 0) note += ` · shear ${r.shearDeg > 0 ? '+' : ''}${r.shearDeg.toFixed(1)}°`
  if (opts?.archetypeOverride) note += ` · archetype override → ${opts.archetypeOverride}`
  if (r.redRepel) note += ` · conflict with red resolved — the action color exits the error register by its nearest edge`
  else if (r.signalOverrides.some(o => o.name === 'red')) note += ` · conflict with red resolved — the brand keeps its exact color and the error signal ships a per-brand variant`
  if (r.warningVariant === 'lemon') note += ` · yellow signal shifted to a cooler lemon`
  if (r.warningVariant === 'macaroni') note += ` · yellow signal kept standard amber (cool-yellow brand)`
  for (const o of r.signalOverrides.filter(o => o.name !== 'yellow')) note += ` · ${o.note}`
  if (r.pending.length) note += ` · overlaps ${r.pending.join(', ')} — softened treatment still in design`
  return note
}

// One brand's CSS: light and dark blocks with the neutral's poles, the brand family, the
// link trios, the seed absolutes, the secondary (its own ramp when given, else a mirror of
// the brand), the generated neutral, and the per-brand signal overrides (always from the
// primary's resolution: signals react to the dominant brand color).
export function brandCss(
  slug: string,
  displayName: string,
  r: ResolvedBrand,
  secondary?: GeneratedScale | null,
  noteSuffix = '',
  neutralLevel: NeutralLevel = 'default',
  // the per-brand neutral is generated here, so it needs the caller's profile (the brand/alt
  // scales inside `r` were already resolved under it by resolveBrand)
  contrastProfile?: ContrastProfile,
  // the secondary's mode chip: 'outline' re-resolves the fill trio (fill transparent, hover
  // the highlighter at OUTLINE_HOVER_ALPHA, pressed at double), the on-text to pencil-47 and
  // the edge to the highlighter unconditionally. Same tokens, a different resolution.
  secondaryStyle?: SecondaryStyle,
  // the neutral cta escape: the brand's fill trio and on-text re-resolve from the brand
  // neutral's pen register, the red-collision de-conflict. Default off.
  ctaEscape?: boolean,
  // the system link: one trio per theme. Absent, the default trio aliases the primary's
  // pen stops; a custom seed ships its own pen-register resolution (the red de-conflict for
  // links). The inverse trio always ships its own values.
  linkHex?: string | null,
  // the edge opt-out, default on. Off withholds the page rather than adding a branch to
  // the gate: ctaNeedsBorder returns false without a page, so one place decides.
  ctaBorder = true,
  // the neutral's resolved tint hue: callers resolve the source through
  // colorEngine.neutralTintHue and pass the hue; absent, the primary's. The emitter stays
  // dumb, like figmaRender's ThemeInput.neutralH.
  neutralH?: number,
): string {
  const { scale } = r
  // the escape resets the red collision: with the brand's fills swapped to the neutral
  // register nothing collides with red, so the per-brand red variant is dropped and the
  // canonical red ships. The annotation reflects the escape.
  const effOverrides = ctaEscape ? r.signalOverrides.filter(o => o.name !== 'red') : r.signalOverrides
  const rEff: ResolvedBrand = ctaEscape ? { ...r, redRepel: null, signalOverrides: effOverrides } : r
  const note = annotationNote(rEff)
    + (ctaEscape ? ' · neutral cta escape active — the action colors ride the brand neutral; the red signal ships canonical' : '')
    + noteSuffix

  // the neutral is generated per brand, tinted toward the brand hue, and rides inside this
  // brand's block as a brand-kind ramp
  const nScale = generateNeutralScale(neutralH ?? scale.brandH, neutralLevel, contrastProfile)
  // the page every family in this brand is judged against for the edge gate: this brand's
  // own neutral. Withheld entirely when the opt-out is off (see the ctaBorder param).
  const page = ctaBorder
    ? { light: pageStopFor(nScale, 'light'), dark: pageStopFor(nScale, 'dark') }
    : { light: undefined, dark: undefined }

  // when no secondary ramp is given, the secondary mirrors the brand property for
  // property: the scale stops and the five stamp tokens
  const mirrorBody = (prefix: string, mode: 'light' | 'dark'): string[] => {
    const stops = mode === 'light' ? scale.light : scale.dark
    const alias = (name: string) => `  ${cssVarName(familyPath(prefix, name))}: var(${cssVarName(familyPath(CSS_BRAND, name))});`
    return [
      ...stops.map(x => alias(stopTokenName(x.stop))),
      alias(STAMP_FILL),
      alias(STAMP_FILL_HOVER),
      alias(STAMP_FILL_PRESSED),
      alias(STAMP_EDGE),
      alias(STAMP_ON),
    ]
  }

  // the secondary's stamp-on register: every non-outline secondary takes the soft pole per
  // mode wherever softOnCtaPasses says the composite holds the text bar on every fill state
  // (a text that clears rest can fail on pressed, so all three are judged; see the carriers
  // note in resolve.ts). A failing fill keeps the solid pole. Outline overrides stamp-on
  // to pencil-47 below; the no-secondary mirror keeps the brand's. Decided here so the body
  // writes the line once, not as a post-body cascade override.
  const secondaryOn = (mode: 'light' | 'dark'): 'soft' | 'solid' =>
    secondary && secondaryStyle !== 'outline' && softOnCtaPasses(secondary, mode) ? 'soft' : 'solid'
  const secondaryLight = secondary ? brandKindBody(CSS_SECONDARY, secondary, 'light', page.light, secondaryOn('light')) : mirrorBody(CSS_SECONDARY, 'light')
  const secondaryDark = secondary ? brandKindBody(CSS_SECONDARY, secondary, 'dark', page.dark, secondaryOn('dark')) : mirrorBody(CSS_SECONDARY, 'dark')
  // the seed absolutes: the literal input hexes, mode-invariant (light block only), a
  // reference value never used as a UI color. The alt mirrors the brand's when no
  // secondary ramp exists.
  const brandIdentity = `  ${cssVarName(absolutePath(CSS_BRAND))}: ${scale.identityHex};`
  const secondaryIdentity = secondary
    ? `  ${cssVarName(absolutePath(CSS_SECONDARY))}: ${secondary.identityHex};`
    : `  ${cssVarName(absolutePath(CSS_SECONDARY))}: var(${cssVarName(absolutePath(CSS_BRAND))});`

  // the neutral's poles, the two off-scale ends that extend the ladder past its generated
  // stops and flip with the mode: paper-0 is a resolved stop of the neutral ramp (white in
  // light, one seam below paper-1 in dark, never absolute black); pen-100 is the literal
  // pole (pure black in light, pure white in dark). Emitted per mode block; the fallbacks
  // match the pole by construction.
  const p0hex = (s: ColorStop | undefined, fallback: string) => (s ? stopHex(s) : fallback)
  const lightAnchors = [`  ${cssVarName(familyPath(CSS_NEUTRAL, PAPER_0))}: ${p0hex(nScale.paper0, '#ffffff')};`, `  ${cssVarName(familyPath(CSS_NEUTRAL, PEN_100))}: ${p0hex(nScale.pen100, '#000000')};`]
  const darkAnchors = [`  ${cssVarName(familyPath(CSS_NEUTRAL, PAPER_0))}: ${p0hex(nScale.paper0Dark, '#000000')};`, `  ${cssVarName(familyPath(CSS_NEUTRAL, PEN_100))}: ${p0hex(nScale.pen100Dark, '#ffffff')};`]

  // the system link trio: the default posture aliases the primary's pen stops directly
  // (mode-blind, the var chain resolves per block); a custom seed ships its pen-register
  // resolution raw
  const linkTrio = linkHex ? resolveLinkTrio(linkHex, contrastProfile) : null
  const linkVar = (state: LinkState) => cssVarName(linkPath('default', state))
  const link = (mode: 'light' | 'dark'): string[] => linkTrio
    ? (mode === 'light'
      ? [`  ${linkVar('enabled')}: ${stopHex(linkTrio.link)};`, `  ${linkVar('hover')}: ${stopHex(linkTrio.linkHover)};`, `  ${linkVar('pressed')}: ${stopHex(linkTrio.linkPressed)};`]
      : [`  ${linkVar('enabled')}: ${stopHex(linkTrio.linkDark)};`, `  ${linkVar('hover')}: ${stopHex(linkTrio.linkHoverDark)};`, `  ${linkVar('pressed')}: ${stopHex(linkTrio.linkPressedDark)};`])
    : [
      `  ${linkVar('enabled')}: var(${cssVarName(familyPath(CSS_BRAND, stopTokenName(9)))});`,
      `  ${linkVar('hover')}: var(${cssVarName(familyPath(CSS_BRAND, stopTokenName(10)))});`,
      `  ${linkVar('pressed')}: var(${cssVarName(familyPath(CSS_BRAND, stopTokenName(11)))});`,
    ]
  // the custom trio's P3 renditions: the default posture rides the pen stops' own P3
  // overrides through the alias chain, but a custom trio ships raw hexes, and without
  // these lines an out-of-sRGB custom link renders duller than the pen text beside it. The
  // link is its own property, so there is no cascade-pop hazard.
  const linkP3 = (mode: 'light' | 'dark'): string[] => {
    if (!linkTrio) return []
    const trio = mode === 'light'
      ? [['enabled', linkTrio.link], ['hover', linkTrio.linkHover], ['pressed', linkTrio.linkPressed]] as const
      : [['enabled', linkTrio.linkDark], ['hover', linkTrio.linkHoverDark], ['pressed', linkTrio.linkPressedDark]] as const
    return trio.filter(([, s]) => p3Differs(s)).map(([n, s]) => `  ${linkVar(n)}: ${p3Value(s)};`)
  }

  // the inverse link trio: the same link seed re-solved for text on the pen-70 ground
  // (resolve.resolveLinkInverseTrio, modes crossed). No alias posture exists, since no
  // emitted stop is anchored at that ground, so the default seeds from the brand's own hex
  // and the trio always ships raw hexes, with its own P3 lines. (identityHex is typed
  // optional but generateScale always sets it; the pen-stop fallback keeps a hand-built
  // scale on its own hue rather than throwing.)
  const inverseSeed = linkHex ?? scale.identityHex
    ?? stopHex(scale.light.find(x => x.stop === 9)!)
  const linkInverseTrio = resolveLinkInverseTrio(inverseSeed, contrastProfile)
  const inverseVar = (state: LinkState) => cssVarName(linkPath('inverse', state))
  const linkInverse = (mode: 'light' | 'dark'): string[] => (mode === 'light'
    ? [`  ${inverseVar('enabled')}: ${stopHex(linkInverseTrio.link)};`, `  ${inverseVar('hover')}: ${stopHex(linkInverseTrio.linkHover)};`, `  ${inverseVar('pressed')}: ${stopHex(linkInverseTrio.linkPressed)};`]
    : [`  ${inverseVar('enabled')}: ${stopHex(linkInverseTrio.linkDark)};`, `  ${inverseVar('hover')}: ${stopHex(linkInverseTrio.linkHoverDark)};`, `  ${inverseVar('pressed')}: ${stopHex(linkInverseTrio.linkPressedDark)};`])
  const linkInverseP3 = (mode: 'light' | 'dark'): string[] => {
    const trio = mode === 'light'
      ? [['enabled', linkInverseTrio.link], ['hover', linkInverseTrio.linkHover], ['pressed', linkInverseTrio.linkPressed]] as const
      : [['enabled', linkInverseTrio.linkDark], ['hover', linkInverseTrio.linkHoverDark], ['pressed', linkInverseTrio.linkPressedDark]] as const
    return trio.filter(([, s]) => p3Differs(s)).map(([n, s]) => `  ${inverseVar(n)}: ${p3Value(s)};`)
  }

  // the neutral cta escape, emitted after the brand body so the cascade takes these
  // values. The fill trio and the on-text only: the brand's pen stops, and the default
  // link's alias onto them, keep the brand's own chroma under the escape.
  const escape = (mode: 'light' | 'dark'): string[] => {
    if (!ctaEscape) return []
    const esc = escapeCtaFamily(nScale, mode, contrastProfile)
    return [
      `  ${cssVarName(familyPath(CSS_BRAND, STAMP_FILL))}: ${stopHex(esc.cta)};`,
      `  ${cssVarName(familyPath(CSS_BRAND, STAMP_FILL_HOVER))}: ${stopHex(esc.ctaHover)};`,
      `  ${cssVarName(familyPath(CSS_BRAND, STAMP_FILL_PRESSED))}: ${stopHex(esc.ctaPressed)};`,
      `  ${cssVarName(familyPath(CSS_BRAND, STAMP_ON))}: ${onColor(esc.onFillIsWhite)};`,
    ]
  }

  const outline = (mode: 'light' | 'dark'): string[] => {
    if (secondaryStyle !== 'outline' || !secondary) return []
    const s8 = (mode === 'light' ? secondary.light : secondary.dark).find(s => s.stop === 8)
    const c = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255)
    const s8e = s8 ? srgbEmitChannels(s8) : null
    // the outline re-resolution, emitted after the secondary body so the cascade takes
    // these values: the fill transparent, the hover the highlighter-26 tint at
    // OUTLINE_HOVER_ALPHA (the stable contrast-gated stop, not the generated quiet fill, which
    // can be imperceptible), pressed the same tint at double, the edge the highlighter
    // unconditionally, the on-text pencil-47. The pen stops stay untouched.
    const v = (leaf: string) => cssVarName(familyPath(CSS_SECONDARY, leaf))
    return [
      `  ${v(STAMP_FILL)}: transparent;`,
      ...(s8e ? [
        `  ${v(STAMP_FILL_HOVER)}: rgba(${c(s8e.r)}, ${c(s8e.g)}, ${c(s8e.b)}, ${OUTLINE_HOVER_ALPHA});`,
        `  ${v(STAMP_FILL_PRESSED)}: rgba(${c(s8e.r)}, ${c(s8e.g)}, ${c(s8e.b)}, ${OUTLINE_PRESSED_ALPHA});`,
      ] : []),
      `  ${v(STAMP_EDGE)}: var(${v(stopTokenName(8))});`,
      `  ${v(STAMP_ON)}: var(${v(stopTokenName(9))});`,
    ]
  }

  // the P3 renditions, behind the gates, in the same cascade shape as the base blocks.
  // Under the outline chip the secondary's fill trio is re-resolved and the P3 block sits
  // last in the cascade, so an out-of-sRGB secondary fill would pop back in over
  // `transparent`: the fill trio's P3 overrides are dropped for outline, the scale stops
  // keep theirs.
  const dropOutlineCta = (lines: string[]): string[] =>
    secondaryStyle === 'outline'
      ? lines.filter(l => ![STAMP_FILL, STAMP_FILL_HOVER, STAMP_FILL_PRESSED].some(leaf => l.startsWith(`  ${cssVarName(familyPath(CSS_SECONDARY, leaf))}:`)))
      : lines
  // the same pop for the escape: the escaped fill trio ships the neutral's whisper chroma,
  // and an out-of-sRGB brand fill's P3 override sitting last in the cascade would pop the
  // brand fill back in over it. The pen stops keep the brand's chroma under the escape, so
  // their P3 lines stay.
  const dropEscapeCta = (lines: string[]): string[] =>
    ctaEscape
      ? lines.filter(l => ![STAMP_FILL, STAMP_FILL_HOVER, STAMP_FILL_PRESSED].some(leaf => l.startsWith(`  ${cssVarName(familyPath(CSS_BRAND, leaf))}:`)))
      : lines
  const p3Light = [
    ...dropEscapeCta(brandKindP3Body(CSS_BRAND, scale, 'light')),
    ...(secondary ? dropOutlineCta(brandKindP3Body(CSS_SECONDARY, secondary, 'light')) : []),
    ...brandKindP3Body(CSS_NEUTRAL, nScale, 'light'),
    ...effOverrides.flatMap(o => brandKindP3Body(SIGNAL_EMIT_NAME[o.name], o.scale, 'light')),
    ...linkP3('light'),
    ...linkInverseP3('light'),
  ]
  const p3Dark = [
    ...dropEscapeCta(brandKindP3Body(CSS_BRAND, scale, 'dark')),
    ...(secondary ? dropOutlineCta(brandKindP3Body(CSS_SECONDARY, secondary, 'dark')) : []),
    ...brandKindP3Body(CSS_NEUTRAL, nScale, 'dark'),
    ...effOverrides.flatMap(o => brandKindP3Body(SIGNAL_EMIT_NAME[o.name], o.scale, 'dark')),
    ...linkP3('dark'),
    ...linkInverseP3('dark'),
  ]

  return [
    ``,
    `[data-brand="${slug}"] {`,
    ...lightAnchors,
    ...brandKindBody(CSS_BRAND, scale, 'light', page.light),
    ...escape('light'),
    ...link('light'),
    ...linkInverse('light'),
    brandIdentity,
    ...secondaryLight,
    ...outline('light'),
    secondaryIdentity,
    ...brandKindBody(CSS_NEUTRAL, nScale, 'light', page.light),
    ...effOverrides.flatMap(o => brandKindBody(SIGNAL_EMIT_NAME[o.name], o.scale, 'light', page.light)),
    `}`,
    `[data-brand="${slug}"][data-theme="dark"] {`,
    ...darkAnchors,
    ...brandKindBody(CSS_BRAND, scale, 'dark', page.dark),
    ...escape('dark'),
    ...link('dark'),
    ...linkInverse('dark'),
    ...secondaryDark,
    ...outline('dark'),
    ...brandKindBody(CSS_NEUTRAL, nScale, 'dark', page.dark),
    ...effOverrides.flatMap(o => brandKindBody(SIGNAL_EMIT_NAME[o.name], o.scale, 'dark', page.dark)),
    `}`,
    ...(p3Light.length || p3Dark.length ? [
      `${P3_SUPPORTS} {`,
      `${P3_MEDIA} {`,
      ...(p3Light.length ? [`[data-brand="${slug}"] {`, ...p3Light, `}`] : []),
      ...(p3Dark.length ? [`[data-brand="${slug}"][data-theme="dark"] {`, ...p3Dark, `}`] : []),
      `}`,
      `}`,
    ] : []),
  ].join('\n')
}

