// Verifies themeToFigma end-to-end for a real brand with an accent (Dark
// Roast), exercising the same merge the demo handler does. Checks structure +
// spot values against ground truth, then discards output (verification only).

import { BRANDS } from '../src/brands'
import { SECONDARIES } from '../src/secondaries'
import { SIGNALS } from '../src/engine/signals'
import { resolveBrand, SIGNAL_SCALES } from '../src/engine/resolve'
import { themeToFigma } from '../src/engine/figmaRender'

const brand = BRANDS.find(b => b.slug === 'dark-roast')!
const r = resolveBrand(brand.hex, brand.name, { exact: brand.exact, archetypeOverride: brand.archetypeOverride, style: brand.style })
const sec = SECONDARIES[brand.slug]
const accent = sec ? resolveBrand(sec, `${brand.name} accent`, { exact: brand.exact, style: brand.style }).scale : null
const signals = SIGNALS.map(s => {
  const o = r.signalOverrides.find(x => x.name === s.name)
  return { name: s.name, scale: o?.scale ?? SIGNAL_SCALES.get(s.name)!.scale }
})

// The neutral is now generated per brand (tinted to the brand hue) at a level —
// no longer passed as hex strings.
const figma = themeToFigma(r, { accent, neutralLevel: 'default', signals })

const fails: string[] = []
const ok = (cond: boolean, msg: string) => { if (!cond) fails.push(msg) }

// Same families/modes. brand + secondary are CTA-bearing (stop 9 → cta-1,
// on-fill → on-cta); neutral + signals are highlight-bearing (stop 9 →
// highlight-1, on-fill → on-highlight). Surface stop 1 (paper-1) and text
// role 12 (ink) are shared across all ramps.
for (const mode of ['light', 'dark'] as const) {
  const m = figma[mode] as any
  for (const fam of ['brand', 'secondary', 'neutral', 'red', 'yellow', 'green', 'info-color']) {
    ok(!!m[fam], `${mode}.${fam} missing`)
    // brand/secondary: full surface scale + cta + highlight + identity + both
    // on-text tokens. neutral: surface scale + highlight + cta + both on-text.
    // signals: SYMMETRIC now — surface scale + highlight + cta (= a duplicate of
    // highlight) + both on-text, but still NO identity (no user-input hex to echo).
    const isBrand = fam === 'brand' || fam === 'secondary'
    const tokens = isBrand
      ? ['paper-1', 'cta-1', 'cta-2', 'highlight-1', 'highlight-2', 'ink-alt', 'ink', 'on-cta', 'on-highlight', 'identity']
      : ['paper-1', 'highlight-1', 'highlight-2', 'cta-1', 'cta-2', 'ink', 'on-highlight', 'on-cta']
    for (const t of tokens) ok(!!m[fam][t], `${mode}.${fam}.${t} missing`)
    // Signals carry cta as a DUPLICATE of highlight (symmetric roles, identical
    // values for now); they still have no identity (no user-input hex).
    if (!isBrand && fam !== 'neutral') {
      ok(m[fam]['cta-1'].$value.hex === m[fam]['highlight-1'].$value.hex
        && m[fam]['cta-2'].$value.hex === m[fam]['highlight-2'].$value.hex,
        `${mode}.${fam} cta should duplicate highlight`)
      ok(!m[fam]['identity'], `${mode}.${fam} should not have identity`)
    }
  }
}
// Color token shape (brand stop 9 is now `cta-1`)
const bcta = (figma.light as any).brand['cta-1']
ok(bcta.$type === 'color', 'brand/cta-1 not type color')
ok(bcta.$value && bcta.$value.colorSpace === 'srgb' && Array.isArray(bcta.$value.components) && bcta.$value.components.length === 3, 'brand/cta-1 $value not srgb-components object')
// Spot value vs known engine output (dark-roast brand cta light #07074f, dark #7f9aeb)
ok((figma.light as any).brand['cta-1'].$value.hex === '#07074f', `brand/cta-1 light hex ${(figma.light as any).brand['cta-1'].$value.hex} != #07074f`)
ok((figma.dark as any).brand['cta-1'].$value.hex === '#7f9aeb', `brand/cta-1 dark hex ${(figma.dark as any).brand['cta-1'].$value.hex} != #7f9aeb`)
// Identical token names across modes
ok(JSON.stringify(Object.keys((figma.light as any).brand)) === JSON.stringify(Object.keys((figma.dark as any).brand)), 'brand keys differ across modes')

if (fails.length) { console.error('FAIL:\n' + fails.map(f => '  - ' + f).join('\n')); process.exit(1) }
console.log('PASS — themeToFigma: brand/secondary/neutral + 4 signals, light+dark, srgb-components shape, spot hexes match, keys aligned across modes.')
