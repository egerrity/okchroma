// Verifies themeToFigma end-to-end for a real brand with an accent (Dark
// Roast), exercising the same merge the demo handler does. Checks structure +
// spot values against ground truth, then discards output (verification only).

import { generateNeutralScale } from '../src/engine/colorEngine'
import { BRANDS } from '../src/brands'
import { SECONDARIES } from '../src/secondaries'
import { SIGNALS } from '../src/engine/signals'
import { resolveBrand, SIGNAL_SCALES } from '../src/engine/resolve'
import { toHex } from '../src/engine/cssRender'
import { themeToFigma } from '../src/engine/figmaRender'

const brand = BRANDS.find(b => b.slug === 'dark-roast')!
const r = resolveBrand(brand.hex, brand.name, { exact: brand.exact, archetypeOverride: brand.archetypeOverride, style: brand.style })
const sec = SECONDARIES[brand.slug]
const accent = sec ? resolveBrand(sec, `${brand.name} accent`, { exact: brand.exact, style: brand.style }).scale : null
const neutral = generateNeutralScale()
const neutralHexes = { light: neutral.light.map(s => toHex(s.r, s.g, s.b)), dark: neutral.dark.map(s => toHex(s.r, s.g, s.b)) }
const signals = SIGNALS.map(s => {
  const o = r.signalOverrides.find(x => x.name === s.name)
  return { name: s.name, scale: o?.scale ?? SIGNAL_SCALES.get(s.name)!.scale }
})

const figma = themeToFigma(r, { accent, neutral: neutralHexes, signals })

const fails: string[] = []
const ok = (cond: boolean, msg: string) => { if (!cond) fails.push(msg) }

// Same families/modes. brand + secondary are CTA-bearing (stop 9 → cta,
// on-fill → on-cta); neutral + signals are highlight-bearing (stop 9 →
// highlight-9, on-fill → on-highlight). Surface stop 1 (paper-1) and text
// role 12 (ink) are shared across all ramps.
for (const mode of ['light', 'dark'] as const) {
  const m = figma[mode] as any
  for (const fam of ['brand', 'secondary', 'neutral', 'error', 'warning', 'success', 'info']) {
    ok(!!m[fam], `${mode}.${fam} missing`)
    const isCta = fam === 'brand' || fam === 'secondary'
    const tokens = isCta ? ['paper-1', 'cta', 'ink', 'on-cta'] : ['paper-1', 'highlight-9', 'ink', 'on-highlight']
    for (const t of tokens) ok(!!m[fam][t], `${mode}.${fam}.${t} missing`)
  }
}
// Color token shape (brand stop 9 is now `cta`)
const bcta = (figma.light as any).brand['cta']
ok(bcta.$type === 'color', 'brand/cta not type color')
ok(bcta.$value && bcta.$value.colorSpace === 'srgb' && Array.isArray(bcta.$value.components) && bcta.$value.components.length === 3, 'brand/cta $value not srgb-components object')
// Spot value vs known engine output (dark-roast brand cta light #07074f, dark #7f9aeb)
ok((figma.light as any).brand['cta'].$value.hex === '#07074f', `brand/cta light hex ${(figma.light as any).brand['cta'].$value.hex} != #07074f`)
ok((figma.dark as any).brand['cta'].$value.hex === '#7f9aeb', `brand/cta dark hex ${(figma.dark as any).brand['cta'].$value.hex} != #7f9aeb`)
// Identical token names across modes
ok(JSON.stringify(Object.keys((figma.light as any).brand)) === JSON.stringify(Object.keys((figma.dark as any).brand)), 'brand keys differ across modes')

if (fails.length) { console.error('FAIL:\n' + fails.map(f => '  - ' + f).join('\n')); process.exit(1) }
console.log('PASS — themeToFigma: brand/secondary/neutral + 4 signals, light+dark, srgb-components shape, spot hexes match, keys aligned across modes.')
