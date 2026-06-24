// Renders a ResolvedBrand to CSS custom-property blocks. Shared by the
// build script (node, brands.css) and the demo's any-color tab (browser,
// injected <style>) so both ship byte-identical rules.

import { generateIllustrationScale, type GeneratedScale, type ColorStop } from './colorEngine'
import { stopTokenName, onFillTokenName, tokenOrder, type RampKind } from './tokenNames'
import type { ResolvedBrand } from './resolve'

export function toHex(r: number, g: number, b: number): string {
  const ch = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')
  return `#${ch(r)}${ch(g)}${ch(b)}`
}

export function stopsToVars(stops: ColorStop[], prefix: string, kind: RampKind): string {
  return [...stops]
    .sort((a, b) => tokenOrder(stopTokenName(a.stop, kind)) - tokenOrder(stopTokenName(b.stop, kind)))
    .map(s => `  --${prefix}-${stopTokenName(s.stop, kind)}: ${toHex(s.r, s.g, s.b)};`)
    .join('\n')
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

// One brand's CSS: light + dark blocks with brand vars, on-fill, accent
// vars (secondary ramp when given, else stubbed to brand), and per-brand
// signal overrides (always from the PRIMARY's resolution — signals react
// to the dominant brand color; an accent's own signal conflicts are
// annotated upstream, not resolved, in v1).
export function brandCss(
  slug: string,
  displayName: string,
  r: ResolvedBrand,
  accent?: GeneratedScale | null,
  noteSuffix = ''
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
  const accentIllus = accent ? generateIllustrationScale(accent) : null
  const altStops = accentIllus ? accentIllus.stops : illus.stops
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

  const onColor = (white: boolean) => (white ? '#ffffff' : '#000000')

  // A brand-kind ramp body for one mode: the surface + text stops, the
  // highlight-9/10 ext pair (Stage 2), and the on-cta / on-highlight text
  // tokens. identity is mode-invariant — the caller emits it once in the light
  // block. Used for both the brand and the (real) secondary ramp.
  const brandKindBody = (prefix: string, s: GeneratedScale, mode: 'light' | 'dark'): string[] => {
    const stops = mode === 'light' ? s.light : s.dark
    const onCta = mode === 'light' ? s.onFillTextIsWhite : s.onFillTextIsWhiteDark
    const onHl = mode === 'light' ? s.onHighlightIsWhite : s.onHighlightIsWhiteDark
    return [
      stopsToVars(stops, prefix, 'brand'),
      `  --${prefix}-${onFillTokenName('brand')}: ${onColor(onCta)};`,
      `  --${prefix}-${onFillTokenName('neutral')}: ${onColor(onHl ?? true)};`,
    ]
  }
  // When no secondary ramp is given, secondary mirrors brand var-for-var
  // (stops, highlight ext, and both on-text tokens).
  const mirrorBody = (prefix: string, mode: 'light' | 'dark'): string[] => {
    const stops = mode === 'light' ? scale.light : scale.dark
    const alias = (x: ColorStop) =>
      `  --${prefix}-${stopTokenName(x.stop, 'brand')}: var(--brand-${stopTokenName(x.stop, 'brand')});`
    return [
      ...stops.map(alias),
      `  --${prefix}-${onFillTokenName('brand')}: var(--brand-${onFillTokenName('brand')});`,
      `  --${prefix}-${onFillTokenName('neutral')}: var(--brand-${onFillTokenName('neutral')});`,
    ]
  }

  const accentLight = accent ? brandKindBody('secondary', accent, 'light') : mirrorBody('secondary', 'light')
  const accentDark = accent ? brandKindBody('secondary', accent, 'dark') : mirrorBody('secondary', 'dark')
  // identity — literal input hex, mode-invariant (light block only). Secondary
  // mirrors the brand's when no secondary ramp exists.
  const brandIdentity = `  --brand-identity: ${scale.identityHex};`
  const secondaryIdentity = accent
    ? `  --secondary-identity: ${accent.identityHex};`
    : `  --secondary-identity: var(--brand-identity);`

  return [
    `/* ${displayName}${note} */`,
    `[data-brand="${slug}"] {`,
    ...brandKindBody('brand', scale, 'light'),
    brandIdentity,
    ...illusVars,
    ...accentLight,
    secondaryIdentity,
    ...r.signalOverrides.map(o => stopsToVars(o.scale.light, o.name, 'neutral')),
    `}`,
    `[data-brand="${slug}"][data-theme="dark"] {`,
    ...brandKindBody('brand', scale, 'dark'),
    ...accentDark,
    ...r.signalOverrides.map(o => stopsToVars(o.scale.dark, o.name, 'neutral')),
    `}`,
  ].join('\n')
}
