import * as fs from 'fs'
import * as path from 'path'
import { generateNeutralScale, type ColorStop } from './engine/colorEngine'
import { contrastRatio, wcagY } from './engine/constraints'
import { BRANDS, type Brand } from './brands'
import { SECONDARIES } from './secondaries'
import { SIGNALS } from './engine/signals'
import { resolveBrand, SIGNAL_SCALES } from './engine/resolve'
import { brandCss, stopsToVars } from './engine/cssRender'
import { onFillTokenName, stopTokenName } from './engine/tokenNames'

function generateBrandCss(brand: Brand): string {
  const { name, hex, slug } = brand

  // All rules live in resolveBrand (src/engine/resolve.ts); rendering is
  // shared with the demo's any-color tab (src/engine/cssRender.ts).
  const r = resolveBrand(hex, name, { exact: brand.exact, archetypeOverride: brand.archetypeOverride, style: brand.style })

  // Secondary runs through the SAME pipeline (a secondary red earns rung 1
  // like a primary would). Signals follow the primary only — an accent's
  // own signal conflicts are annotated for review, never resolved, in v1.
  const secondary = SECONDARIES[slug]
  let accent = null
  let noteSuffix = brand.archetypeOverride ? ` · archetype override → ${brand.archetypeOverride}` : ''
  if (secondary) {
    const ra = resolveBrand(secondary, `${name} accent`, { exact: brand.exact, style: brand.style })
    accent = ra.scale
    if (ra.shearDeg !== 0) noteSuffix += ` · accent shear ${ra.shearDeg > 0 ? '+' : ''}${ra.shearDeg.toFixed(1)}°`
    if (ra.rung1) noteSuffix += ` · accent rung 1 → dark`
    if (ra.errorComponentRule) noteSuffix += ` · accent error collision → component rule`
  }

  return brandCss(slug, name, r, accent, noteSuffix)
}

// White text wins iff it out-contrasts black on this fill (WCAG).
function fillWantsWhite(s: ColorStop): boolean {
  return contrastRatio(1.0, wcagY(s.L, s.C, s.H)) >= contrastRatio(wcagY(s.L, s.C, s.H), 0)
}

function generateNeutralCss(): string {
  const scale = generateNeutralScale()
  const onColor = (w: boolean) => (w ? '#ffffff' : '#000000')
  // on-cta polarity from the cta fill (stop 15): white on the near-black light
  // button, black on the near-white dark one.
  const onCtaLight = onColor(fillWantsWhite(scale.light.find(s => s.stop === 15)!))
  const onCtaDark = onColor(fillWantsWhite(scale.dark.find(s => s.stop === 15)!))

  return [
    `/* Neutral scale — shared across all brands (V1: no chroma tint) */`,
    `:root {`,
    stopsToVars(scale.light, 'neutral', 'neutral'),
    `  --neutral-${onFillTokenName('brand')}: ${onCtaLight};`,
    `  --neutral-${onFillTokenName('neutral')}: ${onColor(scale.onHighlightIsWhite ?? false)};`,
    `}`,
    `[data-theme="dark"] {`,
    stopsToVars(scale.dark, 'neutral', 'neutral'),
    `  --neutral-${onFillTokenName('brand')}: ${onCtaDark};`,
    `  --neutral-${onFillTokenName('neutral')}: ${onColor(scale.onHighlightIsWhiteDark ?? false)};`,
    `}`,
  ].join('\n')
}

function generateSignalsCss(): string {
  const lightBlocks: string[] = []
  const darkBlocks: string[] = []

  for (const sig of SIGNALS) {
    const { scale } = SIGNAL_SCALES.get(sig.name)!
    const onFill = scale.onFillTextIsWhite ? '#ffffff' : '#000000'
    const onFillDark = scale.onFillTextIsWhiteDark ? '#ffffff' : '#000000'
    lightBlocks.push(
      stopsToVars(scale.light, sig.name, 'neutral'),
      `  --${sig.name}-${onFillTokenName('neutral')}: ${onFill};`,
      // Symmetric role structure: signals carry `cta` = a duplicate of their
      // `highlight`. Aliased so it tracks per-brand signal shifts via the cascade;
      // one :root declaration covers both modes. Identical values for now — whether
      // signal cta should diverge from highlight is a deferred decision.
      `  --${sig.name}-${stopTokenName(9, 'brand')}: var(--${sig.name}-${stopTokenName(9, 'neutral')});`,
      `  --${sig.name}-${stopTokenName(10, 'brand')}: var(--${sig.name}-${stopTokenName(10, 'neutral')});`,
      `  --${sig.name}-${onFillTokenName('brand')}: var(--${sig.name}-${onFillTokenName('neutral')});`,
    )
    darkBlocks.push(stopsToVars(scale.dark, sig.name, 'neutral'), `  --${sig.name}-${onFillTokenName('neutral')}: ${onFillDark};`)
  }

  return [
    `/* Signal scales — engine-generated from canonical hexes, shared across brands */`,
    `:root {`,
    ...lightBlocks,
    `}`,
    `[data-theme="dark"] {`,
    ...darkBlocks,
    `}`,
  ].join('\n')
}

function run() {
  const distDir = path.join(__dirname, '..', 'dist')
  fs.mkdirSync(distDir, { recursive: true })

  // neutral.css
  fs.writeFileSync(path.join(distDir, 'neutral.css'), generateNeutralCss())
  console.log('  neutral.css')

  // signals.css
  fs.writeFileSync(path.join(distDir, 'signals.css'), generateSignalsCss())
  console.log('  signals.css')

  // one CSS block per brand, concatenated into brands.css
  const brandBlocks = BRANDS.map(b => generateBrandCss(b))
  fs.writeFileSync(path.join(distDir, 'brands.css'), brandBlocks.join('\n\n'))
  console.log(`  brands.css (${BRANDS.length} brands)`)

  console.log('Token generation complete.')
}

run()
