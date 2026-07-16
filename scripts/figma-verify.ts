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
    // cta-ink matches the family's own ink-10 exactly (the 4.5 text-register link escape);
    // cta-ink-pressed matches ink-11 (the 2026-07-16 restrengthening — press lands on the
    // family's 7:1 register)
    ok(m[fam]['cta-ink'].$value.hex === m[fam]['ink-10'].$value.hex,
      `${mode}.${fam} cta-ink ${m[fam]['cta-ink'].$value.hex} != ink-10 ${m[fam]['ink-10'].$value.hex}`)
    ok(m[fam]['cta-ink-pressed'].$value.hex === m[fam]['ink-11'].$value.hex,
      `${mode}.${fam} cta-ink-pressed ${m[fam]['cta-ink-pressed'].$value.hex} != ink-11 ${m[fam]['ink-11'].$value.hex}`)
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

// NEUTRAL CTA ESCAPE (Phase 3 + the ALL-ctas amendment): with the flag on, the brand's
// fill trio re-resolves from the brand-neutral's ink register (cta anchors at neutral
// ink-11 exactly; near-black light / near-white dark; on-cta flips) AND the text-style
// cta trio swaps to the NEUTRAL's cta-ink (its ink-10 register); the ramp stays the
// brand's own; the default link follows the escaped cta-ink; flag OFF is unchanged.
{
  const red = resolveBrand('#EA3E3E', 'escape-probe')
  const redSignals = SIGNALS.map(s => {
    const o = red.signalOverrides.find(x => x.name === s.name)
    return { name: s.name, scale: o?.scale ?? SIGNAL_SCALES.get(s.name)!.scale }
  })
  // the ESCAPE payload carries the FILTERED signal set — red resets to canonical (the
  // real callers' contract: plugin/ui.ts, plugin-ext/payload.ts, cssRender effOverrides).
  // The old probe fed the VARIANT red under ctaEscape — modeling the exact forbidden
  // state and asserting nothing about it (review-caught 2026-07-16).
  ok(!!red.signalOverrides.find(x => x.name === 'red'), 'escape probe brand no longer mints a red variant — pick a new red-range probe hex')
  const escSignals = SIGNALS.map(s => {
    const o = s.name === 'red' ? undefined : red.signalOverrides.find(x => x.name === s.name)
    return { name: s.name, scale: o?.scale ?? SIGNAL_SCALES.get(s.name)!.scale }
  })
  const canonSignals = SIGNALS.map(s => ({ name: s.name, scale: SIGNAL_SCALES.get(s.name)!.scale }))
  const esc = themeToFigma(red, { secondary: null, neutralLevel: 'default', signals: escSignals, ctaEscape: true })
  const plain = themeToFigma(red, { secondary: null, neutralLevel: 'default', signals: redSignals })
  const canon = themeToFigma(red, { secondary: null, neutralLevel: 'default', signals: canonSignals })
  for (const mode of ['light', 'dark'] as const) {
    const b = (esc[mode] as any).brand, n = (esc[mode] as any).neutral, p = (plain[mode] as any).brand
    ok(b['cta'].$value.hex === n['ink-11'].$value.hex, `${mode} escape cta ${b['cta'].$value.hex} != neutral ink-11 ${n['ink-11'].$value.hex}`)
    ok(b['cta'].$value.hex !== p['cta'].$value.hex, `${mode} escape cta did not move off the brand cta`)
    ok(b['cta-ink'].$value.hex === n['ink-10'].$value.hex, `${mode} escape cta-ink ${b['cta-ink'].$value.hex} != neutral ink-10 ${n['ink-10'].$value.hex} (ALL the ctas de-red)`)
    ok(b['cta-ink-pressed'].$value.hex === n['ink-11'].$value.hex, `${mode} escape cta-ink-pressed ${b['cta-ink-pressed'].$value.hex} != neutral ink-11 ${n['ink-11'].$value.hex}`)
    ok(b['paper-1'].$value.hex === p['paper-1'].$value.hex, `${mode} escape touched the ramp`)
    ok((esc[mode] as any).link['link'].$value.hex === b['cta-ink'].$value.hex, `${mode} default link does not follow the escaped cta-ink`)
    // the RED RESET (owner amendment): under the escape the red group ships CANONICAL —
    // byte-equal to the canonical emit, different from this brand's variant
    for (const leaf of ['cta', 'cta-hover', 'cta-pressed', 'highlight-9', 'ink-10']) {
      ok((esc[mode] as any).red[leaf].$value.hex === (canon[mode] as any).red[leaf].$value.hex,
        `${mode} escape red/${leaf} ${(esc[mode] as any).red[leaf].$value.hex} != canonical ${(canon[mode] as any).red[leaf].$value.hex} (the escape must reset red)`)
    }
    ok((esc[mode] as any).red['cta'].$value.hex !== (plain[mode] as any).red['cta'].$value.hex
      || (plain[mode] as any).red['cta'].$value.hex === (canon[mode] as any).red['cta'].$value.hex,
      `${mode} escape red cta still matches the VARIANT (the probe's filter regressed)`)
  }
  ok((esc.light as any).brand['on-cta'].$value.hex === '#ffffff', `escape light on-cta should be white on the near-black fill (got ${(esc.light as any).brand['on-cta'].$value.hex})`)
  ok((esc.dark as any).brand['on-cta'].$value.hex === '#000000', `escape dark on-cta should be black on the near-white fill (got ${(esc.dark as any).brand['on-cta'].$value.hex})`)
}

// SYSTEM LINK (Phase 4): one trio per theme. Default = the primary's cta-ink verbatim;
// a custom seed = its ink-register resolution (differs from the brand's own ink).
{
  for (const mode of ['light', 'dark'] as const) {
    const l = (figma[mode] as any).link, b = (figma[mode] as any).brand
    for (const leaf of ['link', 'link-hover', 'link-pressed'])
      ok(!!l?.[leaf], `${mode}.link.${leaf} missing`)
    ok(l['link'].$value.hex === b['cta-ink'].$value.hex, `${mode} default link ${l['link'].$value.hex} != brand cta-ink ${b['cta-ink'].$value.hex}`)
  }
  const custom = themeToFigma(r, { secondary, neutralLevel: 'default', signals, linkHex: '#0B57D0' })
  for (const mode of ['light', 'dark'] as const) {
    const l = (custom[mode] as any).link, b = (custom[mode] as any).brand
    ok(l['link'].$value.hex !== b['cta-ink'].$value.hex, `${mode} custom link should differ from the brand's cta-ink`)
  }
  ok((custom.light as any).link['link'].$value.hex === '#2a5cb4', `custom link light hex ${(custom.light as any).link['link'].$value.hex} != #2a5cb4 (the #0B57D0 seed through the wcag register, gamut-mapped emit)`)
}

// VIVIDNESS LEVER (Phase 5): style:'full-chroma' releases the ramp's vividness cap
// (min(1, C/0.13) on the ladder) and reassigns the dark cta to the identity chroma policy.
// OFF is the shipped registers — the spot hexes above pin that. Signals and the light cta
// (identity chroma already) never move.
{
  const vivid = resolveBrand('#0B5FFF', 'vivid-probe', { style: 'full-chroma' })
  const plain = resolveBrand('#0B5FFF', 'vivid-probe')
  const w5v = vivid.scale.light.find(s => s.stop === 5)!, w5p = plain.scale.light.find(s => s.stop === 5)!
  ok(w5v.C > w5p.C + 1e-4, `full-chroma wash-5 chroma did not rise (${w5v.C.toFixed(3)} vs ${w5p.C.toFixed(3)}) — cap release`)
  // the trim release probes a MODERATE blue: at a saturated blue the sRGB gamut ceiling
  // binds tighter than the trim (both paths clamp to the same ceiling — the lever's dark
  // gain lives where trim < ceiling; measured +31% at this seed, +8% at #487bff)
  const modV = resolveBrand('#4f6eb7', 'trim-probe', { style: 'full-chroma' })
  const modP = resolveBrand('#4f6eb7', 'trim-probe')
  ok(modV.scale.ctaDark.C > modP.scale.ctaDark.C * 1.2, `full-chroma dark cta chroma did not rise (${modV.scale.ctaDark.C.toFixed(3)} vs ${modP.scale.ctaDark.C.toFixed(3)}) — trim release`)
  ok(Math.abs(vivid.scale.cta.C - plain.scale.cta.C) < 1e-9 && Math.abs(vivid.scale.cta.L - plain.scale.cta.L) < 1e-9,
    'full-chroma moved the LIGHT cta (identity chroma — the lever must not touch it)')
  // a seed under the vividness threshold has no cap to release — byte-stable
  const softHex = '#9a8578'
  const softV = resolveBrand(softHex, 'soft-probe', { style: 'full-chroma' })
  const softP = resolveBrand(softHex, 'soft-probe')
  for (let i = 0; i < softP.scale.light.length; i++) {
    const a = softV.scale.light[i], b = softP.scale.light[i]
    ok(Math.abs(a.C - b.C) < 1e-9 && Math.abs(a.L - b.L) < 1e-9, `full-chroma moved a sub-threshold seed's light stop ${b.stop}`)
  }
}

if (fails.length) { console.error('FAIL:\n' + fails.map(f => '  - ' + f).join('\n')); process.exit(1) }
console.log('PASS — themeToFigma: brand/secondary/neutral + 4 signals, light+dark, srgb-components shape, spot hexes match, keys aligned across modes.')
