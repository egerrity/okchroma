// Renders a ResolvedBrand to CSS custom-property blocks. Shared by the
// build script (node, brands.css) and the demo's any-color tab (browser,
// injected <style>) so both ship byte-identical rules.

import { generateIllustrationScale, type GeneratedScale, type ColorStop } from './colorEngine'
import { stopTokenName, onFillTokenName, type RampKind } from './tokenNames'
import type { ResolvedBrand } from './resolve'

export function toHex(r: number, g: number, b: number): string {
  const ch = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')
  return `#${ch(r)}${ch(g)}${ch(b)}`
}

export function stopsToVars(stops: ColorStop[], prefix: string, kind: RampKind): string {
  return stops.map(s => `  --${prefix}-${stopTokenName(s.stop, kind)}: ${toHex(s.r, s.g, s.b)};`).join('\n')
}

export function annotationNote(r: ResolvedBrand, opts?: { archetypeOverride?: string }): string {
  let note = ''
  if (r.shearDeg !== 0) note += ` · shear ${r.shearDeg > 0 ? '+' : ''}${r.shearDeg.toFixed(1)}°`
  if (opts?.archetypeOverride) note += ` · archetype override → ${opts.archetypeOverride}`
  if (r.rung1) note += ` · conflict with ${r.rung1} red resolved — primary darkened`
  if (r.darkCollider) note += ` · dark mode: fill shifts to a softer register to stay distinct from error red`
  if (r.errorComponentRule) note += ` · neighbors error red — destructive actions use outline styling in groups`
  if (r.warningVariant === 'lemon') note += ` · warning signal shifted to a cooler yellow`
  if (r.warningVariant === 'macaroni') note += ` · warning signal kept standard amber (cool-yellow brand)`
  for (const o of r.signalOverrides.filter(o => o.name !== 'warning')) note += ` · ${o.note}`
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

  const onFill = scale.onFillTextIsWhite ? '#ffffff' : '#000000'
  const onFillDark = scale.onFillTextIsWhiteDark ? '#ffffff' : '#000000'

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

  // Secondary ramp (role formerly "accent"). on-fill is brand-kind → on-cta.
  const secOnFill = `  --secondary-${onFillTokenName('brand')}`
  const accentLight = accent
    ? [stopsToVars(accent.light, 'secondary', 'brand'), `${secOnFill}: ${accent.onFillTextIsWhite ? '#ffffff' : '#000000'};`]
    : [...scale.light.map(s => `  --secondary-${stopTokenName(s.stop, 'brand')}: var(--brand-${stopTokenName(s.stop, 'brand')});`), `${secOnFill}: ${onFill};`]
  const accentDark = accent
    ? [stopsToVars(accent.dark, 'secondary', 'brand'), `${secOnFill}: ${accent.onFillTextIsWhiteDark ? '#ffffff' : '#000000'};`]
    : [...scale.dark.map(s => `  --secondary-${stopTokenName(s.stop, 'brand')}: var(--brand-${stopTokenName(s.stop, 'brand')});`), `${secOnFill}: ${onFillDark};`]

  return [
    `/* ${displayName}${note} */`,
    `[data-brand="${slug}"] {`,
    stopsToVars(scale.light, 'brand', 'brand'),
    `  --brand-${onFillTokenName('brand')}: ${onFill};`,
    ...illusVars,
    ...accentLight,
    ...r.signalOverrides.map(o => stopsToVars(o.scale.light, o.name, 'neutral')),
    `}`,
    `[data-brand="${slug}"][data-theme="dark"] {`,
    stopsToVars(scale.dark, 'brand', 'brand'),
    `  --brand-${onFillTokenName('brand')}: ${onFillDark};`,
    ...accentDark,
    ...r.signalOverrides.map(o => stopsToVars(o.scale.dark, o.name, 'neutral')),
    `}`,
  ].join('\n')
}
