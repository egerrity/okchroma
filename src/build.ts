import * as fs from 'fs'
import * as path from 'path'
import { BRANDS, type Brand } from './brands'
import { SECONDARIES } from './secondaries'
import { resolveBrand } from './engine/resolve'
import { brandCss, signalsCss } from './engine/cssRender'

function generateBrandCss(brand: Brand): string {
  const { name, hex, slug } = brand

  // All rules live in resolveBrand (src/engine/resolve.ts); rendering is
  // shared with the demo's any-color tab (src/engine/cssRender.ts).
  const r = resolveBrand(hex, name, { exact: brand.exact, archetypeOverride: brand.archetypeOverride, style: brand.style })

  // Secondary runs through the SAME pipeline (a secondary red earns rung 1
  // like a primary would). Signals follow the primary only — a secondary's
  // own signal conflicts are annotated for review, never resolved, in v1.
  const secondaryHex = SECONDARIES[slug]
  let secondary = null
  let noteSuffix = brand.archetypeOverride ? ` · archetype override → ${brand.archetypeOverride}` : ''
  if (secondaryHex) {
    const ra = resolveBrand(secondaryHex, `${name} accent`, { exact: brand.exact, style: brand.style })
    secondary = ra.scale
    if (ra.shearDeg !== 0) noteSuffix += ` · secondary shear ${ra.shearDeg > 0 ? '+' : ''}${ra.shearDeg.toFixed(1)}°`
    if (ra.rung1) noteSuffix += ` · secondary rung 1 → dark`
    if (ra.errorComponentRule) noteSuffix += ` · secondary error collision → component rule`
  }

  return brandCss(slug, name, r, secondary, noteSuffix)
}

// the signal block body moved to cssRender.signalsCss (shared with the demo's APCA override)

function run() {
  const distDir = path.join(__dirname, '..', 'dist')
  fs.mkdirSync(distDir, { recursive: true })

  // The neutral is no longer a global block — it's generated per brand and
  // emitted inside each brand's block by brandCss (brands.css below).

  // signals.css
  fs.writeFileSync(path.join(distDir, 'signals.css'), signalsCss())
  console.log('  signals.css')

  // one CSS block per brand, concatenated into brands.css
  const brandBlocks = BRANDS.map(b => generateBrandCss(b))
  fs.writeFileSync(path.join(distDir, 'brands.css'), brandBlocks.join('\n\n'))
  console.log(`  brands.css (${BRANDS.length} brands)`)

  console.log('Token generation complete.')
}

run()
