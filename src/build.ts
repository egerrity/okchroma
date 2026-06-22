import * as fs from 'fs'
import * as path from 'path'
import { generateNeutralScale, type ColorStop } from './engine/colorEngine'
import { contrastRatio, wcagY } from './engine/constraints'
import { BRANDS, type Brand } from './brands'
import { SECONDARIES } from './secondaries'
import { SIGNALS } from './engine/signals'
import { resolveBrand, SIGNAL_SCALES } from './engine/resolve'
import { brandCss, stopsToVars } from './engine/cssRender'
import { onFillTokenName } from './engine/tokenNames'

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
  // on-cta polarity from the cta fill (extLight/extDark[0]): white on the
  // near-black light button, black on the near-white dark one.
  const onCtaLight = onColor(fillWantsWhite(scale.extLight![0]))
  const onCtaDark = onColor(fillWantsWhite(scale.extDark![0]))

  return [
    `/* Neutral scale — shared across all brands (V1: no chroma tint) */`,
    `:root {`,
    stopsToVars(scale.light, 'neutral', 'neutral'),
    stopsToVars(scale.extLight ?? [], 'neutral', 'neutral'),
    `  --neutral-${onFillTokenName('neutral')}: ${onColor(scale.onHighlightIsWhite ?? false)};`,
    `  --neutral-${onFillTokenName('brand')}: ${onCtaLight};`,
    `}`,
    `[data-theme="dark"] {`,
    stopsToVars(scale.dark, 'neutral', 'neutral'),
    stopsToVars(scale.extDark ?? [], 'neutral', 'neutral'),
    `  --neutral-${onFillTokenName('neutral')}: ${onColor(scale.onHighlightIsWhiteDark ?? false)};`,
    `  --neutral-${onFillTokenName('brand')}: ${onCtaDark};`,
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
    lightBlocks.push(stopsToVars(scale.light, sig.name, 'neutral'), `  --${sig.name}-${onFillTokenName('neutral')}: ${onFill};`)
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
