

import { generateIllustrationScale, generateNeutralScale, type GeneratedScale, type ColorStop, type NeutralLevel } from './colorEngine'
import { stopTokenName, onFillTokenName, tokenOrder } from './tokenNames'
import type { ResolvedBrand } from './resolve'

export function toHex(r: number, g: number, b: number): string {
  const ch = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')
  return `#${ch(r)}${ch(g)}${ch(b)}`
}

export function stopsToVars(stops: ColorStop[], prefix: string): string {
  return [...stops]
    .sort((a, b) => tokenOrder(stopTokenName(a.stop)) - tokenOrder(stopTokenName(b.stop)))
    .map(s => `  --${prefix}-${stopTokenName(s.stop)}: ${toHex(s.r, s.g, s.b)};`)
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
  return [
    stopsToVars(stops, prefix),
    `  --${prefix}-cta-1: ${toHex(cta.r, cta.g, cta.b)};`,
    `  --${prefix}-cta-2: ${toHex(ctaHover.r, ctaHover.g, ctaHover.b)};`,
    `  --${prefix}-${onFillTokenName('brand')}: ${onColor(onCta)};`,
    `  --${prefix}-${onFillTokenName('neutral')}: ${onColor(onHl!)};`,
  ]
}

// The neutral as its own light+dark block under `selector` — the demo's
// brandless contexts (the app chrome :root, where there is no [data-brand]
// theme to carry a per-brand neutral) reuse this. The product emits the
// neutral inline per brand (see brandCss); this is the same brand-kind body,
// just scoped to an arbitrary selector.
export function neutralCss(selector: string, brandH: number, level: NeutralLevel = 'default'): string {
  const s = generateNeutralScale(brandH, level)
  // The universal paper-0/ink-13 anchors ride along: any scope that carries the
  // ladder must also carry its mode-flipping extremes (semantic aliases like
  // --surface-raised resolve through them). paper-0 = the neutral's resolved
  // stop 0 (white in light; one seam below paper-1 in dark, never absolute black).
  const p0 = (st: ColorStop | undefined, fallback: string) => (st ? toHex(st.r, st.g, st.b) : fallback)
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
  ].join('\n')
}

export function annotationNote(r: ResolvedBrand, opts?: { archetypeOverride?: string }): string {
  let note = ''
  if (r.shearDeg !== 0) note += ` · shear ${r.shearDeg > 0 ? '+' : ''}${r.shearDeg.toFixed(1)}°`
  if (opts?.archetypeOverride) note += ` · archetype override → ${opts.archetypeOverride}`
  if (r.rung1) note += ` · conflict with red resolved — primary darkened`
  if (r.darkCollider) note += ` · dark mode: fill shifts to a softer register to stay distinct from red`
  if (r.errorComponentRule) note += ` · neighbors red — destructive actions use outline styling in groups`
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
  neutralLevel: NeutralLevel = 'default'
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
    ...illus.stops.map(s => `  --illus-primary-${s.stop}: ${toHex(s.r, s.g, s.b)};`),
    ...altStops.map(s => `  --illus-alt-${s.stop}: ${toHex(s.r, s.g, s.b)};`),
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
  const nScale = generateNeutralScale(scale.brandH, neutralLevel)

  // When no secondary ramp is given, secondary mirrors brand var-for-var
  // (scale stops, off-scale cta, and both on-text tokens).
  const mirrorBody = (prefix: string, mode: 'light' | 'dark'): string[] => {
    const stops = mode === 'light' ? scale.light : scale.dark
    const alias = (name: string) => `  --${prefix}-${name}: var(--brand-${name});`
    return [
      ...stops.map(x => alias(stopTokenName(x.stop))),
      alias('cta-1'),
      alias('cta-2'),
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
  const p0hex = (s: ColorStop | undefined, fallback: string) => (s ? toHex(s.r, s.g, s.b) : fallback)
  const lightAnchors = [`  --paper-0: ${p0hex(nScale.paper0, '#ffffff')};`, `  --ink-13: #000000;`]
  const darkAnchors = [`  --paper-0: ${p0hex(nScale.paper0Dark, '#000000')};`, `  --ink-13: #ffffff;`]

  return [
    ``,
    `[data-brand="${slug}"] {`,
    ...lightAnchors,
    ...brandKindBody('brand', scale, 'light'),
    brandIdentity,
    ...illusVars,
    ...secondaryLight,
    secondaryIdentity,
    ...brandKindBody('neutral', nScale, 'light'),
    ...r.signalOverrides.flatMap(o => brandKindBody(o.name, o.scale, 'light')),
    `}`,
    `[data-brand="${slug}"][data-theme="dark"] {`,
    ...darkAnchors,
    ...brandKindBody('brand', scale, 'dark'),
    ...secondaryDark,
    ...brandKindBody('neutral', nScale, 'dark'),
    ...r.signalOverrides.flatMap(o => brandKindBody(o.name, o.scale, 'dark')),
    `}`,
  ].join('\n')
}

