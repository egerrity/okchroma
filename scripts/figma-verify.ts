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

// Same families/modes
for (const mode of ['light', 'dark'] as const) {
  const m = figma[mode] as any
  for (const fam of ['brand', 'accent', 'neutral', 'error', 'warning', 'success', 'info']) {
    ok(!!m[fam], `${mode}.${fam} missing`)
    for (const stop of [1, 9, 12, 'on-fill']) ok(!!m[fam][stop], `${mode}.${fam}.${stop} missing`)
  }
}
// Color token shape
const b9 = (figma.light as any).brand['9']
ok(b9.$type === 'color', 'brand/9 not type color')
ok(b9.$value && b9.$value.colorSpace === 'srgb' && Array.isArray(b9.$value.components) && b9.$value.components.length === 3, 'brand/9 $value not srgb-components object')
// Spot value vs known engine output (dark-roast brand-9 light #07074f, dark #7f9aeb)
ok((figma.light as any).brand['9'].$value.hex === '#07074f', `brand/9 light hex ${(figma.light as any).brand['9'].$value.hex} != #07074f`)
ok((figma.dark as any).brand['9'].$value.hex === '#7f9aeb', `brand/9 dark hex ${(figma.dark as any).brand['9'].$value.hex} != #7f9aeb`)
// Identical token names across modes
ok(JSON.stringify(Object.keys((figma.light as any).brand)) === JSON.stringify(Object.keys((figma.dark as any).brand)), 'brand keys differ across modes')

if (fails.length) { console.error('FAIL:\n' + fails.map(f => '  - ' + f).join('\n')); process.exit(1) }
console.log('PASS — themeToFigma: brand/accent/neutral + 4 signals, light+dark, srgb-components shape, spot hexes match, keys aligned across modes.')
