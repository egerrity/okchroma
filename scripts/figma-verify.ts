// Verifies themeToFigma end-to-end for a real brand with a secondary (Dark
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
const secondary = sec ? resolveBrand(sec, `${brand.name} accent`, { exact: brand.exact, style: brand.style }).scale : null
const signals = SIGNALS.map(s => {
  const o = r.signalOverrides.find(x => x.name === s.name)
  return { name: s.name, scale: o?.scale ?? SIGNAL_SCALES.get(s.name)!.scale }
})

// The neutral is now generated per brand (tinted to the brand hue) at a level —
// no longer passed as hex strings.
const figma = themeToFigma(r, { secondary, neutralLevel: 'default', signals })

const fails: string[] = []
const ok = (cond: boolean, msg: string) => { if (!cond) fails.push(msg) }

// Same families/modes — every family is emitted UNIFORMLY now: scale slot 9
// is highlight-9 (stop 10 deleted, owner 2026-07-09), the cta is the off-scale SIX-token
// family (cta/cta-hover/cta-pressed + the cta-ink trio + on-cta, semantic names — owner
// 2026-07-16), and on-highlight rides the rung. paper-1 (stop 1) and ink-11 (stop 11)
// are shared across ramps.
const CTA_FAMILY = ['cta', 'cta-hover', 'cta-pressed', 'cta-ink', 'cta-ink-hover', 'cta-ink-pressed']
for (const mode of ['light', 'dark'] as const) {
  const m = figma[mode] as any
  for (const fam of ['brand', 'secondary', 'neutral', 'red', 'yellow', 'green', 'blue']) {
    ok(!!m[fam], `${mode}.${fam} missing`)
    // brand/secondary: full scale + highlight + off-scale cta family + identity + both
    // on-text tokens. neutral: scale + highlight + cta family + both on-text. signals:
    // scale + highlight + a DISTINCT loud cta + both on-text, but still NO identity
    // (no user-input hex to echo).
    const isBrand = fam === 'brand' || fam === 'secondary'
    const tokens = isBrand
      ? ['paper-1', ...CTA_FAMILY, 'highlight-9', 'ink-10', 'ink-11', 'on-cta', 'on-highlight', 'identity']
      : ['paper-1', 'highlight-9', ...CTA_FAMILY, 'ink-11', 'on-highlight', 'on-cta']
    for (const t of tokens) ok(!!m[fam][t], `${mode}.${fam}.${t} missing`)
    // cta-ink matches the family's own ink-10 exactly (the 4.5 text-register link escape)
    ok(m[fam]['cta-ink'].$value.hex === m[fam]['ink-10'].$value.hex,
      `${mode}.${fam} cta-ink ${m[fam]['cta-ink'].$value.hex} != ink-10 ${m[fam]['ink-10'].$value.hex}`)
    // Signals carry a DISTINCT loud cta (diverged from the highlight rung, F1);
    // they still have no identity (no user-input hex).
    if (!isBrand && fam !== 'neutral') {
      ok(m[fam]['cta'].$value.hex !== m[fam]['highlight-9'].$value.hex,
        `${mode}.${fam} cta should now DIVERGE from highlight-9 (F1 — signals routed through the scale)`)
      ok(!m[fam]['identity'], `${mode}.${fam} should not have identity`)
    }
  }
}
// Color token shape (brand cta is the off-scale fill)
const bcta = (figma.light as any).brand['cta']
ok(bcta.$type === 'color', 'brand/cta not type color')
ok(bcta.$value && bcta.$value.colorSpace === 'srgb' && Array.isArray(bcta.$value.components) && bcta.$value.components.length === 3, 'brand/cta $value not srgb-components object')
// Spot value vs known engine output (dark-roast brand cta light #07074f; dark
// #869cda — the Phase-3 darkChromaCurve's darkCtaTrim gently trims the dark cta
// chroma per hue, e.g. #8b9dce → #869cda).
ok((figma.light as any).brand['cta'].$value.hex === '#07074f', `brand/cta light hex ${(figma.light as any).brand['cta'].$value.hex} != #07074f`)
ok((figma.dark as any).brand['cta'].$value.hex === '#869cda', `brand/cta dark hex ${(figma.dark as any).brand['cta'].$value.hex} != #869cda`)
// Identical token names across modes
ok(JSON.stringify(Object.keys((figma.light as any).brand)) === JSON.stringify(Object.keys((figma.dark as any).brand)), 'brand keys differ across modes')

if (fails.length) { console.error('FAIL:\n' + fails.map(f => '  - ' + f).join('\n')); process.exit(1) }
console.log('PASS — themeToFigma: brand/secondary/neutral + 4 signals, light+dark, srgb-components shape, spot hexes match, keys aligned across modes.')
