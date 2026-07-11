

import { generateIllustrationScale, generateNeutralScale, type GeneratedScale, type ColorStop, type NeutralLevel, type ContrastProfile } from './colorEngine'
import { srgbEmitChannels, masterEmitChannels } from './colorMath'
import { clampChromaToGamut } from './constraints'
import { stopTokenName, onFillTokenName, tokenOrder } from './tokenNames'
import { signalScalesFor, OUTLINE_HOVER_ALPHA, type ResolvedBrand, type SecondaryStyle } from './resolve'
import { SIGNALS } from './signals'

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
    .map(s => `  --${prefix}-${stopTokenName(s.stop)}: ${stopHex(s)};`)
    .join('\n')
}

const onColor = (white: boolean) => (white ? '#ffffff' : '#000000')

// A ramp body for one mode: the scale + highlight + text stops (from the scale
// array, sorted by token order), the off-scale cta pair (cta-1/cta-2), and the
// on-cta / on-highlight text tokens. identity is mode-invariant — the caller emits
// it once (the neutral has none). Used for the brand, the (real) secondary, AND
// the generated neutral — every family is emitted the same way.
export function brandKindBody(prefix: string, s: GeneratedScale, mode: 'light' | 'dark'): string[] {
  const stops = mode === 'light' ? s.light : s.dark
  const cta = mode === 'light' ? s.cta : s.ctaDark
  const ctaHover = mode === 'light' ? s.ctaHover : s.ctaHoverDark
  const onCta = mode === 'light' ? s.onFillTextIsWhite : s.onFillTextIsWhiteDark
  const onHl = mode === 'light' ? s.onHighlightIsWhite : s.onHighlightIsWhiteDark
  // cta-border: TRANSPARENT everywhere (owner 2026-07-04: the conditional 3:1 gate is gone —
  // filled is filled). The token stays in the vocabulary so components carry
  // `border: 1.5px solid var(...-cta-border)` unconditionally (layout never shifts) and a
  // future high-contrast mode can re-solve it; the OUTLINE secondary override is the only
  // resolver today (→ its own highlight-8). Renamed from cta-stroke (owner 2026-07-09);
  // the Figma side renamed with it — plugins migrate existing variables in place.
  return [
    stopsToVars(stops, prefix),
    `  --${prefix}-cta-1: ${stopHex(cta)};`,
    `  --${prefix}-cta-2: ${stopHex(ctaHover)};`,
    `  --${prefix}-cta-border: transparent;`,
    `  --${prefix}-${onFillTokenName('brand')}: ${onColor(onCta)};`,
    `  --${prefix}-${onFillTokenName('neutral')}: ${onColor(onHl!)};`,
  ]
}

// the P3 override body for one family+mode: only vars whose master rendition exceeds
// sRGB (on-colors are poles, cta-border transparent — never overridden)
export function brandKindP3Body(prefix: string, s: GeneratedScale, mode: 'light' | 'dark'): string[] {
  const stops = mode === 'light' ? s.light : s.dark
  const cta = mode === 'light' ? s.cta : s.ctaDark
  const ctaHover = mode === 'light' ? s.ctaHover : s.ctaHoverDark
  const out: string[] = []
  for (const st of stops) if (p3Differs(st)) out.push(`  --${prefix}-${stopTokenName(st.stop)}: ${p3Value(st)};`)
  if (p3Differs(cta)) out.push(`  --${prefix}-cta-1: ${p3Value(cta)};`)
  if (p3Differs(ctaHover)) out.push(`  --${prefix}-cta-2: ${p3Value(ctaHover)};`)
  return out
}

// The neutral as its own light+dark block under `selector` — the demo's
// brandless contexts (the app chrome :root, where there is no [data-brand]
// theme to carry a per-brand neutral) reuse this. The product emits the
// neutral inline per brand (see brandCss); this is the same brand-kind body,
// just scoped to an arbitrary selector.
export function neutralCss(selector: string, brandH: number, level: NeutralLevel = 'default', contrastProfile?: ContrastProfile): string {
  const s = generateNeutralScale(brandH, level, contrastProfile)
  // The universal paper-0/ink-13 anchors ride along: any scope that carries the
  // ladder must also carry its mode-flipping extremes (semantic aliases like
  // --surface-raised resolve through them). paper-0 = the neutral's resolved
  // stop 0 (white in light; one seam below paper-1 in dark, never absolute black).
  const p0 = (st: ColorStop | undefined, fallback: string) => (st ? stopHex(st) : fallback)
  const p3Light = brandKindP3Body('neutral', s, 'light')
  const p3Dark = brandKindP3Body('neutral', s, 'dark')
  return [
    `${selector} {`,
    `  --paper-0: ${p0(s.paper0, '#ffffff')};`,
    `  --ink-13: #000000;`,
    ...brandKindBody('neutral', s, 'light'),
    `}`,
    `${selector}[data-theme="dark"] {`,
    `  --paper-0: ${p0(s.paper0Dark, '#000000')};`,
    `  --ink-13: #ffffff;`,
    ...brandKindBody('neutral', s, 'dark'),
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

// The canonical signal block (`:root` light + `[data-theme="dark"]`), per profile — the build
// writes the wcag one to signals.css; the demo re-emits the apca one as an override when toggled.
export function signalsCss(contrastProfile?: ContrastProfile): string {
  const sigScales = signalScalesFor(contrastProfile)
  const lightBlocks: string[] = []
  const darkBlocks: string[] = []
  const p3LightBlocks: string[] = []
  const p3DarkBlocks: string[] = []

  for (const sig of SIGNALS) {
    const { scale } = sigScales.get(sig.name)!
    // F1: signals are brand-kind now — a real loud cta (stop 9) AND a distinct
    // highlight rung (13/14), plus computed on-cta + on-highlight. No more alias.
    lightBlocks.push(...brandKindBody(sig.name, scale, 'light'))
    darkBlocks.push(...brandKindBody(sig.name, scale, 'dark'))
    p3LightBlocks.push(...brandKindP3Body(sig.name, scale, 'light'))
    p3DarkBlocks.push(...brandKindP3Body(sig.name, scale, 'dark'))
  }

  return [
    `/* Signal scales — engine-generated from canonical hexes, shared across brands */`,
    `:root {`,
    ...lightBlocks,
    `}`,
    `[data-theme="dark"] {`,
    ...darkBlocks,
    `}`,
    ...(p3LightBlocks.length || p3DarkBlocks.length ? [
      `${P3_SUPPORTS} {`,
      `${P3_MEDIA} {`,
      ...(p3LightBlocks.length ? [`:root {`, ...p3LightBlocks, `}`] : []),
      ...(p3DarkBlocks.length ? [`[data-theme="dark"] {`, ...p3DarkBlocks, `}`] : []),
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

// One brand's CSS: light + dark blocks with brand vars, on-fill, secondary
// vars (secondary ramp when given, else stubbed to brand), and per-brand
// signal overrides (always from the PRIMARY's resolution — signals react
// to the dominant brand color; a secondary's own signal conflicts are
// annotated upstream, not resolved, in v1).
export function brandCss(
  slug: string,
  displayName: string,
  r: ResolvedBrand,
  secondary?: GeneratedScale | null,
  noteSuffix = '',
  neutralLevel: NeutralLevel = 'default',
  // the per-brand neutral is generated here, so it needs the caller's profile (the brand/secondary
  // scales inside `r` were already resolved under it by resolveBrand)
  contrastProfile?: ContrastProfile,
  // the secondary's mode chip: 'outline' re-resolves the cta pair — cta-1 transparent, cta-2 the
  // cta color at OUTLINE_HOVER_ALPHA (the tinted hover), on-cta ink-11, cta-border ALWAYS the
  // gated highlight-8. Same tokens, different resolution — no component changes needed.
  secondaryStyle?: SecondaryStyle
): string {
  const { scale } = r
  const note = annotationNote(r) + noteSuffix

  // Illustration palette (PoC 2026-06-11): FOUR fixed-L slots per color —
  // primary 1–4 from the brand, alt 1–4 from the secondary (falls back to
  // the brand's own slots when no secondary exists). Shapes in
  // illustration files are labeled by slot. Legacy semantic vars remap
  // onto fixed slots (primary = mid 3, soft = tint 2; alt-mono = deep 4 /
  // wash 1 so mono two-area files never collapse). Same values both
  // modes — emitted once in the light block, vars cascade.
  const illus = generateIllustrationScale(scale)
  const secondaryIllus = secondary ? generateIllustrationScale(secondary) : null
  const altStops = secondaryIllus ? secondaryIllus.stops : illus.stops
  const illusVars = [
    ...illus.stops.map(s => `  --illus-primary-${s.stop}: ${stopHex(s)};`),
    ...altStops.map(s => `  --illus-alt-${s.stop}: ${stopHex(s)};`),
    `  --illus-primary: var(--illus-primary-3);`,
    `  --illus-primary-soft: var(--illus-primary-2);`,
    // mono and two-color use the SAME slots (alt = deep 4, alt-soft =
    // tint 2) — the toggle switches color family only, never depth
    // (2026-06-11; soft moved wash→tint so it shows on the bg)
    `  --illus-alt-mono: var(--illus-primary-4);`,
    `  --illus-alt-soft-mono: var(--illus-primary-2);`,
    `  --illus-alt-2c: var(--illus-alt-4);`,
    `  --illus-alt-soft-2c: var(--illus-alt-2);`,
  ]

  // The neutral is now GENERATED per brand (tinted toward the brand hue), so it
  // rides inside this brand's block as a brand-kind ramp — no longer a shared
  // global :root block.
  const nScale = generateNeutralScale(scale.brandH, neutralLevel, contrastProfile)

  // When no secondary ramp is given, secondary mirrors brand var-for-var
  // (scale stops, off-scale cta, and both on-text tokens).
  const mirrorBody = (prefix: string, mode: 'light' | 'dark'): string[] => {
    const stops = mode === 'light' ? scale.light : scale.dark
    const alias = (name: string) => `  --${prefix}-${name}: var(--brand-${name});`
    return [
      ...stops.map(x => alias(stopTokenName(x.stop))),
      alias('cta-1'),
      alias('cta-2'),
      alias('cta-border'),
      alias(onFillTokenName('brand')),
      alias(onFillTokenName('neutral')),
    ]
  }

  const secondaryLight = secondary ? brandKindBody('secondary', secondary, 'light') : mirrorBody('secondary', 'light')
  const secondaryDark = secondary ? brandKindBody('secondary', secondary, 'dark') : mirrorBody('secondary', 'dark')
  // identity — literal input hex, mode-invariant (light block only). Secondary
  // mirrors the brand's when no secondary ramp exists.
  const brandIdentity = `  --brand-identity: ${scale.identityHex};`
  const secondaryIdentity = secondary
    ? `  --secondary-identity: ${secondary.identityHex};`
    : `  --secondary-identity: var(--brand-identity);`

  // Universal scale anchors — positions 0 and 13 that extend the paper→ink
  // ladder past its generated stops, flipping with the mode. paper-0 is now a
  // RESOLVED stop of the neutral ramp (white in light; one seam below paper-1
  // in dark — never absolute black). ink-13 stays the literal ink extreme.
  // Emitted per mode block so each resolves to the right pole.
  const p0hex = (s: ColorStop | undefined, fallback: string) => (s ? stopHex(s) : fallback)
  const lightAnchors = [`  --paper-0: ${p0hex(nScale.paper0, '#ffffff')};`, `  --ink-13: #000000;`]
  const darkAnchors = [`  --paper-0: ${p0hex(nScale.paper0Dark, '#000000')};`, `  --ink-13: #ffffff;`]

  // outline re-resolution: emitted AFTER the secondary body so the cascade takes these values.
  // cta-2 = highlight-8 at OUTLINE_HOVER_ALPHA — the STABLE contrast-gated stop, the same one
  // the ring aliases (owner: 9% of the generated subtle cta was imperceptible — it's a very
  // light/dark color; the hover must reference a stable value).
  const outline = (mode: 'light' | 'dark'): string[] => {
    if (secondaryStyle !== 'outline' || !secondary) return []
    const s8 = (mode === 'light' ? secondary.light : secondary.dark).find(s => s.stop === 8)
    const c = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255)
    const s8e = s8 ? srgbEmitChannels(s8) : null
    return [
      `  --secondary-cta-1: transparent;`,
      ...(s8e ? [`  --secondary-cta-2: rgba(${c(s8e.r)}, ${c(s8e.g)}, ${c(s8e.b)}, ${OUTLINE_HOVER_ALPHA});`] : []),
      `  --secondary-cta-border: var(--secondary-highlight-8);`,
      `  --secondary-${onFillTokenName('brand')}: var(--secondary-ink-11);`,
    ]
  }

  // the P3 renditions, behind @supports — same cascade shape as the base blocks
  const p3Light = [
    ...brandKindP3Body('brand', scale, 'light'),
    ...(secondary ? brandKindP3Body('secondary', secondary, 'light') : []),
    ...brandKindP3Body('neutral', nScale, 'light'),
    ...r.signalOverrides.flatMap(o => brandKindP3Body(o.name, o.scale, 'light')),
  ]
  const p3Dark = [
    ...brandKindP3Body('brand', scale, 'dark'),
    ...(secondary ? brandKindP3Body('secondary', secondary, 'dark') : []),
    ...brandKindP3Body('neutral', nScale, 'dark'),
    ...r.signalOverrides.flatMap(o => brandKindP3Body(o.name, o.scale, 'dark')),
  ]

  return [
    ``,
    `[data-brand="${slug}"] {`,
    ...lightAnchors,
    ...brandKindBody('brand', scale, 'light'),
    brandIdentity,
    ...illusVars,
    ...secondaryLight,
    ...outline('light'),
    secondaryIdentity,
    ...brandKindBody('neutral', nScale, 'light'),
    ...r.signalOverrides.flatMap(o => brandKindBody(o.name, o.scale, 'light')),
    `}`,
    `[data-brand="${slug}"][data-theme="dark"] {`,
    ...darkAnchors,
    ...brandKindBody('brand', scale, 'dark'),
    ...secondaryDark,
    ...outline('dark'),
    ...brandKindBody('neutral', nScale, 'dark'),
    ...r.signalOverrides.flatMap(o => brandKindBody(o.name, o.scale, 'dark')),
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

