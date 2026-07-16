

import { generateIllustrationScale, generateNeutralScale, type GeneratedScale, type ColorStop, type NeutralLevel, type ContrastProfile } from './colorEngine'
import { srgbEmitChannels, masterEmitChannels } from './colorMath'
import { clampChromaToGamut } from './constraints'
import { stopTokenName, onFillTokenName, tokenOrder } from './tokenNames'
import { signalScalesFor, OUTLINE_HOVER_ALPHA, OUTLINE_PRESSED_ALPHA, escapeCtaFamily, type ResolvedBrand, type SecondaryStyle } from './resolve'
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
// array, sorted by token order), the off-scale cta family (cta/cta-hover/cta-pressed + the cta-ink trio), and the
// on-cta / on-highlight text tokens. identity is mode-invariant — the caller emits
// it once (the neutral has none). Used for the brand, the (real) secondary, AND
// the generated neutral — every family is emitted the same way.
export function brandKindBody(prefix: string, s: GeneratedScale, mode: 'light' | 'dark'): string[] {
  const stops = mode === 'light' ? s.light : s.dark
  const f = ctaFamilyOf(s, mode)
  const onCta = mode === 'light' ? s.onFillTextIsWhite : s.onFillTextIsWhiteDark
  const onHl = mode === 'light' ? s.onHighlightIsWhite : s.onHighlightIsWhiteDark
  // cta-border: TRANSPARENT everywhere (owner 2026-07-04: the conditional 3:1 gate is gone —
  // filled is filled). The token stays in the vocabulary so components carry
  // `border: 1.5px solid var(...-cta-border)` unconditionally (layout never shifts) and a
  // future high-contrast mode can re-solve it; the OUTLINE secondary override is the only
  // resolver today (→ its own highlight-8). Renamed from cta-stroke (owner 2026-07-09);
  // the Figma side renamed with it — plugins migrate existing variables in place.
  // cta family SEMANTIC-named (owner ruling 2026-07-16): cta/cta-hover/cta-pressed +
  // the cta-ink trio (the 4.5 text-register link escape; rest matches ink-10).
  return [
    stopsToVars(stops, prefix),
    `  --${prefix}-cta: ${stopHex(f.cta)};`,
    `  --${prefix}-cta-hover: ${stopHex(f.ctaHover)};`,
    `  --${prefix}-cta-pressed: ${stopHex(f.ctaPressed)};`,
    `  --${prefix}-cta-ink: ${stopHex(f.ctaInk)};`,
    `  --${prefix}-cta-ink-hover: ${stopHex(f.ctaInkHover)};`,
    `  --${prefix}-cta-ink-pressed: ${stopHex(f.ctaInkPressed)};`,
    `  --${prefix}-cta-border: transparent;`,
    `  --${prefix}-${onFillTokenName('brand')}: ${onColor(onCta)};`,
    `  --${prefix}-${onFillTokenName('neutral')}: ${onColor(onHl!)};`,
  ]
}

// the full cta family for one mode — shared by the base body and the P3 override body
function ctaFamilyOf(s: GeneratedScale, mode: 'light' | 'dark') {
  return mode === 'light'
    ? { cta: s.cta, ctaHover: s.ctaHover, ctaPressed: s.ctaPressed, ctaInk: s.ctaInk, ctaInkHover: s.ctaInkHover, ctaInkPressed: s.ctaInkPressed }
    : { cta: s.ctaDark, ctaHover: s.ctaHoverDark, ctaPressed: s.ctaPressedDark, ctaInk: s.ctaInkDark, ctaInkHover: s.ctaInkHoverDark, ctaInkPressed: s.ctaInkPressedDark }
}

// the P3 override body for one family+mode: only vars whose master rendition exceeds
// sRGB (on-colors are poles, cta-border transparent — never overridden)
export function brandKindP3Body(prefix: string, s: GeneratedScale, mode: 'light' | 'dark'): string[] {
  const stops = mode === 'light' ? s.light : s.dark
  const f = ctaFamilyOf(s, mode)
  const out: string[] = []
  for (const st of stops) if (p3Differs(st)) out.push(`  --${prefix}-${stopTokenName(st.stop)}: ${p3Value(st)};`)
  for (const [name, st] of [['cta', f.cta], ['cta-hover', f.ctaHover], ['cta-pressed', f.ctaPressed], ['cta-ink', f.ctaInk], ['cta-ink-hover', f.ctaInkHover], ['cta-ink-pressed', f.ctaInkPressed]] as const)
    if (p3Differs(st)) out.push(`  --${prefix}-${name}: ${p3Value(st)};`)
  return out
}

// The neutral as its own light+dark block under `selector` — the demo's
// brandless contexts (the app chrome :root, where there is no [data-brand]
// theme to carry a per-brand neutral) reuse this. The product emits the
// neutral inline per brand (see brandCss); this is the same brand-kind body,
// just scoped to an arbitrary selector.
export function neutralCss(selector: string, brandH: number, level: NeutralLevel = 'default', contrastProfile?: ContrastProfile): string {
  const s = generateNeutralScale(brandH, level, contrastProfile)
  // The universal paper-0/ink-12 anchors ride along: any scope that carries the
  // ladder must also carry its mode-flipping extremes (semantic aliases like
  // --surface-raised resolve through them). paper-0 = the neutral's resolved
  // stop 0 (white in light; one seam below paper-1 in dark, never absolute black).
  const p0 = (st: ColorStop | undefined, fallback: string) => (st ? stopHex(st) : fallback)
  const p3Light = brandKindP3Body('neutral', s, 'light')
  const p3Dark = brandKindP3Body('neutral', s, 'dark')
  return [
    `${selector} {`,
    `  --paper-0: ${p0(s.paper0, '#ffffff')};`,
    `  --ink-12: #000000;`,
    ...brandKindBody('neutral', s, 'light'),
    `}`,
    `${selector}[data-theme="dark"] {`,
    `  --paper-0: ${p0(s.paper0Dark, '#000000')};`,
    `  --ink-12: #ffffff;`,
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

// The canonical signal block (`:root` light + the dark selector below), per profile — the build
// writes the wcag one to signals.css; the demo re-emits the apca one as an override when toggled.
//
// Dark selector: the compound `:root[data-theme="dark"]` (0,2,0) is the cascade guarantee — the
// P3 light block re-declares out-of-sRGB stops under bare `:root` (0,1,0) LATER in the file, and
// at equal specificity source order wins, so a flat `[data-theme="dark"]` (0,1,0) dark base lost
// every var the P3 dark block omits to its LIGHT display-p3 rendition on a root-themed page
// (near-white red washes inside dark UI). Same bug class as the owner-caught outline P3 pop
// (2026-07-11, see brandCss) — brandCss/neutralCss were always immune because their dark
// selectors compound the base selector. The bare `[data-theme="dark"]` stays in the list for
// scoped carriers (the demo rides the attribute on divs, which `:root` P3 light never matches).
const SIGNALS_DARK_SELECTOR = ':root[data-theme="dark"], [data-theme="dark"]'
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
  // the secondary's mode chip: 'outline' re-resolves the fill trio — cta transparent, cta-hover the
  // cta color at OUTLINE_HOVER_ALPHA (the tinted hover), on-cta ink-10, cta-border ALWAYS the
  // gated highlight-8. Same tokens, different resolution — no component changes needed.
  secondaryStyle?: SecondaryStyle,
  // the NEUTRAL CTA ESCAPE (Phase 3, owner 2026-07-16): the brand's cta FILL trio + on-cta
  // re-resolve from the brand-neutral's ink register (near-black light / near-white dark) —
  // the red-collision de-conflict. Same outline idiom; default off = byte-identical.
  ctaEscape?: boolean
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
      alias('cta'),
      alias('cta-hover'),
      alias('cta-pressed'),
      alias('cta-ink'),
      alias('cta-ink-hover'),
      alias('cta-ink-pressed'),
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
  // in dark — never absolute black). ink-12 (the anchor) stays the literal ink extreme.
  // Emitted per mode block so each resolves to the right pole.
  const p0hex = (s: ColorStop | undefined, fallback: string) => (s ? stopHex(s) : fallback)
  const lightAnchors = [`  --paper-0: ${p0hex(nScale.paper0, '#ffffff')};`, `  --ink-12: #000000;`]
  const darkAnchors = [`  --paper-0: ${p0hex(nScale.paper0Dark, '#000000')};`, `  --ink-12: #ffffff;`]

  // outline re-resolution: emitted AFTER the secondary body so the cascade takes these values.
  // cta-hover = highlight-8 at OUTLINE_HOVER_ALPHA (pressed doubles it) — the STABLE contrast-gated stop, the same one
  // the ring aliases (owner: 9% of the generated subtle cta was imperceptible — it's a very
  // light/dark color; the hover must reference a stable value).
  // neutral cta escape re-resolution: emitted AFTER the brand body so the cascade takes
  // these values (the outline idiom). Fill trio + on-cta only — cta-ink and the ramp stay
  // the brand's own.
  const escape = (mode: 'light' | 'dark'): string[] => {
    if (!ctaEscape) return []
    const esc = escapeCtaFamily(nScale, mode, contrastProfile)
    return [
      `  --brand-cta: ${stopHex(esc.cta)};`,
      `  --brand-cta-hover: ${stopHex(esc.ctaHover)};`,
      `  --brand-cta-pressed: ${stopHex(esc.ctaPressed)};`,
      `  --brand-${onFillTokenName('brand')}: ${onColor(esc.onFillIsWhite)};`,
    ]
  }

  const outline = (mode: 'light' | 'dark'): string[] => {
    if (secondaryStyle !== 'outline' || !secondary) return []
    const s8 = (mode === 'light' ? secondary.light : secondary.dark).find(s => s.stop === 8)
    const c = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255)
    const s8e = s8 ? srgbEmitChannels(s8) : null
    // fill trio re-resolved; pressed = the hover tint at doubled alpha (pressed-doubles-hover).
    // cta-ink trio untouched — links keep the exact ramp's text-register values.
    return [
      `  --secondary-cta: transparent;`,
      ...(s8e ? [
        `  --secondary-cta-hover: rgba(${c(s8e.r)}, ${c(s8e.g)}, ${c(s8e.b)}, ${OUTLINE_HOVER_ALPHA});`,
        `  --secondary-cta-pressed: rgba(${c(s8e.r)}, ${c(s8e.g)}, ${c(s8e.b)}, ${OUTLINE_PRESSED_ALPHA});`,
      ] : []),
      `  --secondary-cta-border: var(--secondary-highlight-8);`,
      `  --secondary-${onFillTokenName('brand')}: var(--secondary-ink-10);`,
    ]
  }

  // the P3 renditions, behind @supports — same cascade shape as the base blocks.
  // Under the OUTLINE chip the secondary cta fill trio is re-resolved (cta transparent, cta-hover the
  // rgba hover tint) and the P3 block sits LAST in the cascade — an out-of-sRGB secondary cta
  // (the vivid cyan corner) would pop its fill back in over `transparent` (owner-caught,
  // 2026-07-11). The cta-pair P3 overrides are dropped for outline; scale stops keep theirs.
  const dropOutlineCta = (lines: string[]): string[] =>
    secondaryStyle === 'outline'
      ? lines.filter(l => !l.startsWith('  --secondary-cta:') && !l.startsWith('  --secondary-cta-hover:') && !l.startsWith('  --secondary-cta-pressed:'))
      : lines
  // same P3-pop class for the ESCAPE (the owner-caught outline lesson, 2026-07-11): the
  // escaped fill trio ships the neutral's whisper chroma — an out-of-sRGB BRAND cta's P3
  // override sitting last in the cascade would pop the brand fill back in over it.
  const dropEscapeCta = (lines: string[]): string[] =>
    ctaEscape
      ? lines.filter(l => !l.startsWith('  --brand-cta:') && !l.startsWith('  --brand-cta-hover:') && !l.startsWith('  --brand-cta-pressed:'))
      : lines
  const p3Light = [
    ...dropEscapeCta(brandKindP3Body('brand', scale, 'light')),
    ...(secondary ? dropOutlineCta(brandKindP3Body('secondary', secondary, 'light')) : []),
    ...brandKindP3Body('neutral', nScale, 'light'),
    ...r.signalOverrides.flatMap(o => brandKindP3Body(o.name, o.scale, 'light')),
  ]
  const p3Dark = [
    ...dropEscapeCta(brandKindP3Body('brand', scale, 'dark')),
    ...(secondary ? dropOutlineCta(brandKindP3Body('secondary', secondary, 'dark')) : []),
    ...brandKindP3Body('neutral', nScale, 'dark'),
    ...r.signalOverrides.flatMap(o => brandKindP3Body(o.name, o.scale, 'dark')),
  ]

  return [
    ``,
    `[data-brand="${slug}"] {`,
    ...lightAnchors,
    ...brandKindBody('brand', scale, 'light'),
    ...escape('light'),
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
    ...escape('dark'),
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

