// Verifies themeToFigma end-to-end for a real fixture with a secondary
// (near-black-indigo — same hex + secondary as the retired 'dark-roast' brand),
// exercising the same merge the demo handler does. Checks structure + spot
// values against ground truth, then discards output (verification only).

import { FIXTURES, FIXTURE_SECONDARIES } from './fixture'
import { SIGNALS } from '../src/engine/signals'
import { resolveBrand, resolveTheme, SIGNAL_SCALES, SOFT_ON_CTA_ALPHA } from '../src/engine/resolve'
import { themeToFigma } from '../src/engine/figmaRender'
import { brandCss, signalsCss, ctaNeedsBorder, ctaPageLc, pageStopFor } from '../src/engine/cssRender'
import { generateNeutralScale } from '../src/engine/colorEngine'

const brand = FIXTURES.find(b => b.slug === 'near-black-indigo')!
const r = resolveBrand(brand.hex, brand.name, { exact: brand.exact, archetypeOverride: brand.archetypeOverride, style: brand.style })
const sec = FIXTURE_SECONDARIES[brand.slug]
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

// every leaf is flat in its group: a leaf is read by its one word. The names are spelled
// here as ground truth on purpose, so a vocabulary change has to be deliberate here too.
const leaf = (g: any, flat: string): any => g?.[flat]

// Every family is emitted uniformly: the 11 scale stops, the off-scale stamp fill trio
// (the fill at rest and at one and two steps), the edge and the on-text. The tree is
// spelled in the one grammar (tokenNames.ts): the signals under their role names, the alt
// as brand-alt, the six link rows flat in the link group (default-0 to default-2,
// inverse-0 to inverse-2), the seed absolutes under absolute/. Nothing else: no system
// group, no identity leaf (C68), no state word anywhere.
const CTA_FAMILY = ['stamp-0', 'stamp-1', 'stamp-2']
const LINK_LEAVES = ['default-0', 'default-1', 'default-2', 'inverse-0', 'inverse-1', 'inverse-2']
const FAMILY_KEYS = ['neutral', 'brand', 'brand-alt', 'critical', 'warning', 'positive', 'info']
for (const mode of ['light', 'dark'] as const) {
  const m = figma[mode] as any
  ok(Object.keys(m).join(',') === [...FAMILY_KEYS, 'link', 'absolute'].join(','),
    `${mode} tree groups are ${Object.keys(m).join(',')}, expected the seven families, link, absolute`)
  for (const fam of FAMILY_KEYS) {
    ok(!!m[fam], `${mode}.${fam} missing`)
    const tokens = ['paper-1', 'paper-3', 'paper-5', 'chalk-8', 'chalk-11', 'chalk-15', 'chalk-20', 'highlighter-26', 'pencil-47', 'pen-58', 'pen-70', ...CTA_FAMILY, 'stamp-edge', 'stamp-on']
    for (const t of tokens) ok(!!leaf(m[fam], t), `${mode}.${fam}.${t} missing`)
    ok(!m[fam]['identity'], `${mode}.${fam}.identity is still emitted (the seeds live under absolute/)`)
    for (const gone of ['highlight-9', 'on-highlight', 'cta-ink', 'paper-99-overlay', 'stamp', 'stamp-fill'])
      ok(!leaf(m[fam], gone), `${mode}.${fam}.${gone} is still emitted`)
    // the soft on-text, the quiet-fill rule: the neutral's fill is the scale-fed
    // chalk-level fill, so its button text is the pole at alpha, the register the
    // default-model secondary carries too. Loud fills keep the solid pole; a signal or
    // the brand going soft here would be a leak.
    const onCta = leaf(m[fam], 'stamp-on').$value
    const isPole = onCta.components.every((c: number) => c === 0) || onCta.components.every((c: number) => c === 1)
    ok(isPole, `${mode}.${fam} on-cta is not a pole (${onCta.hex})`)
    if (fam === 'neutral')
      ok(onCta.alpha === SOFT_ON_CTA_ALPHA[mode], `${mode}.neutral on-cta alpha ${onCta.alpha} != the soft register ${SOFT_ON_CTA_ALPHA[mode]}`)
    else if (fam !== 'brand-alt')
      ok(onCta.alpha === 1, `${mode}.${fam} on-cta must stay a SOLID pole (got alpha ${onCta.alpha}) — the soft register is the quiet fills only`)
    // signals carry a distinct loud fill, diverged from the emphasis fill
    if (['critical', 'warning', 'positive', 'info'].includes(fam))
      ok(leaf(m[fam], 'stamp-0').$value.hex !== leaf(m[fam], 'pencil-47').$value.hex,
        `${mode}.${fam} cta should DIVERGE from pencil-47 (signals routed through the scale)`)
    // every leaf's components name the same 8-bit color as its hex
    const walk = (g: any, path: string) => {
      for (const [k, v] of Object.entries<any>(g)) {
        if (v.$type) {
          const back = '#' + v.$value.components.map((c: number) => Math.round(c * 255).toString(16).padStart(2, '0')).join('')
          ok(back === v.$value.hex, `${mode}.${path}/${k} components round to ${back}, hex is ${v.$value.hex}`)
        } else walk(v, `${path}/${k}`)
      }
    }
    walk(m[fam], fam)
  }
  // the neutral's poles, in ladder position
  ok(!!m.neutral['paper-0'] && !!m.neutral['pen-100'], `${mode}.neutral poles missing`)
  ok(!m.brand['paper-0'], `${mode}.brand carries a pole (neutral only)`)
  // the link group: six flat leaves and nothing else, no posture subgroup
  ok(Object.keys(m.link ?? {}).join(',') === LINK_LEAVES.join(','), `${mode}.link leaves are ${Object.keys(m.link ?? {}).join(',')}, expected ${LINK_LEAVES.join(',')}`)
  // the seed absolutes: the inputs as given
  ok(m.absolute?.brand?.$value.hex === brand.hex.toLowerCase(), `${mode}.absolute.brand ${m.absolute?.brand?.$value.hex} != the seed ${brand.hex.toLowerCase()}`)
  ok(m.absolute?.['brand-alt']?.$value.hex === (sec ?? brand.hex).toLowerCase(), `${mode}.absolute.brand-alt != the secondary seed`)
  ok(!m.system, `${mode}.system is still emitted (the engine emits primitives only)`)
}
// Color token shape (brand cta is the off-scale fill)
const bcta = leaf((figma.light as any).brand, 'stamp-0')
ok(bcta.$type === 'color', 'brand/cta not type color')
ok(bcta.$value && bcta.$value.colorSpace === 'srgb' && Array.isArray(bcta.$value.components) && bcta.$value.components.length === 3, 'brand/cta $value not srgb-components object')
// Spot value vs known engine output (the near-black indigo fixture's brand fill: light
// #07074f; dark #a4bafa, the dark clearance lightening the fill until its pole clears
// the legibility booster).
ok(leaf((figma.light as any).brand, 'stamp-0').$value.hex === '#07074f', `brand/cta light hex ${leaf((figma.light as any).brand, 'stamp-0').$value.hex} != #07074f`)
ok(leaf((figma.dark as any).brand, 'stamp-0').$value.hex === '#a4bafa', `brand/cta dark hex ${leaf((figma.dark as any).brand, 'stamp-0').$value.hex} != #a4bafa`)
// Identical token names across modes
// deep key walk: a shallow compare would only see the group names
const keyTree = (g: any): any => g?.$type ? 1 : Object.fromEntries(Object.keys(g ?? {}).map(k => [k, keyTree(g[k])]))
ok(JSON.stringify(keyTree((figma.light as any).brand)) === JSON.stringify(keyTree((figma.dark as any).brand)), 'brand keys differ across modes')

// THE NEUTRAL CTA ESCAPE, fill-trio-only: with the flag on, the brand's fill trio
// re-resolves from the brand neutral's pen register (the fill anchors at neutral pen-70
// exactly; near-black light, near-white dark; the on-text flips). The brand's pen stops,
// and the default link that carries them, keep the brand's own values; the rest of the
// ramp stays the brand's own; flag off is unchanged.
{
  const red = resolveBrand('#EA3E3E', 'escape-probe')
  const redSignals = SIGNALS.map(s => {
    const o = red.signalOverrides.find(x => x.name === s.name)
    return { name: s.name, scale: o?.scale ?? SIGNAL_SCALES.get(s.name)!.scale }
  })
  // the escape payload carries the filtered signal set: red resets to canonical (the
  // callers' contract: plugin/ui.ts, plugin-ext/payload.ts, cssRender effOverrides)
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
    ok(leaf(b, 'stamp-0').$value.hex === leaf(n, 'pen-70').$value.hex, `${mode} escape cta ${leaf(b, 'stamp-0').$value.hex} != neutral pen-70 ${leaf(n, 'pen-70').$value.hex}`)
    ok(leaf(b, 'stamp-0').$value.hex !== leaf(p, 'stamp-0').$value.hex, `${mode} escape cta did not move off the brand cta`)
    // the pen stops stay the brand's own: the escape is fill-trio-only
    for (const pen of ['pencil-47', 'pen-58', 'pen-70'])
      ok(leaf(b, pen).$value.hex === leaf(p, pen).$value.hex, `${mode} escape ${pen} ${leaf(b, pen).$value.hex} != the brand's own ${leaf(p, pen).$value.hex} (the pens must stay)`)
    ok(leaf(b, 'paper-1').$value.hex === leaf(p, 'paper-1').$value.hex, `${mode} escape touched the ramp`)
    ok((esc[mode] as any).link['default-0'].$value.hex === leaf(p, 'pencil-47').$value.hex, `${mode} default link should stay on the brand's pencil-47`)
    // the red reset: under the escape the critical group ships canonical, byte-equal to
    // the canonical emit, different from this brand's variant
    for (const leafName of ['stamp-0', 'stamp-1', 'stamp-2', 'highlighter-26', 'pencil-47']) {
      ok(leaf((esc[mode] as any).critical, leafName).$value.hex === leaf((canon[mode] as any).critical, leafName).$value.hex,
        `${mode} escape critical/${leafName} ${leaf((esc[mode] as any).critical, leafName).$value.hex} != canonical ${leaf((canon[mode] as any).critical, leafName).$value.hex} (the escape must reset red)`)
    }
    ok(leaf((esc[mode] as any).critical, 'stamp-0').$value.hex !== leaf((plain[mode] as any).critical, 'stamp-0').$value.hex
      || leaf((plain[mode] as any).critical, 'stamp-0').$value.hex === leaf((canon[mode] as any).critical, 'stamp-0').$value.hex,
      `${mode} escape red cta still matches the VARIANT (the probe's filter regressed)`)
  }
  ok(leaf((esc.light as any).brand, 'stamp-on').$value.hex === '#ffffff', `escape light on-cta should be white on the near-black fill (got ${leaf((esc.light as any).brand, 'stamp-on').$value.hex})`)
  ok(leaf((esc.dark as any).brand, 'stamp-on').$value.hex === '#000000', `escape dark on-cta should be black on the near-white fill (got ${leaf((esc.dark as any).brand, 'stamp-on').$value.hex})`)
  // the escape's fill is the neutral's loud pen register, not the quiet chalk fill, so it
  // keeps the solid pole. The hex assertions above check the pole but not its opacity.
  for (const mode of ['light', 'dark'] as const)
    ok(leaf((esc[mode] as any).brand, 'stamp-on').$value.alpha === 1,
      `${mode} escape on-cta must stay a SOLID pole (got alpha ${leaf((esc[mode] as any).brand, 'stamp-on').$value.alpha})`)
}

// THE NEUTRAL HUE SOURCE: ThemeInput.neutralH re-tints the neutral toward a non-primary
// hue (the sources resolve to a hue via colorEngine.neutralTintHue); absent must stay
// byte-equal to the primary-hued emit.
{
  const base = themeToFigma(r, { secondary: null, neutralLevel: 'default', signals })
  const sourced = themeToFigma(r, { secondary: null, neutralLevel: 'default', neutralH: 200, signals })
  const dflt = themeToFigma(r, { secondary: null, neutralLevel: 'default', neutralH: r.scale.brandH, signals })
  for (const mode of ['light', 'dark'] as const) {
    ok(JSON.stringify((sourced[mode] as any).neutral) !== JSON.stringify((base[mode] as any).neutral),
      `${mode} neutralH=200 did not move the neutral off the primary-hued emit`)
    ok(JSON.stringify((sourced[mode] as any).brand) === JSON.stringify((base[mode] as any).brand),
      `${mode} neutralH leaked outside the neutral group`)
    // the paper overlays are parked; a reappearance means an emitter regressed the park
    for (const gone of ['paper-99-overlay', 'paper-97-overlay', 'paper-95-overlay'])
      ok(!leaf((base[mode] as any).brand, gone), `${mode} brand ${gone} is still emitted — the overlay park regressed`)
    ok(JSON.stringify((dflt[mode] as any).neutral) === JSON.stringify((base[mode] as any).neutral),
      `${mode} explicit neutralH=brandH should be byte-equal to the absent default`)
  }
}

// THE SYSTEM LINK: one trio per theme for text on the papers (the default posture is
// the primary's pen stops verbatim; a custom seed is its own pen-register resolution)
// and one for text on the pen ground, six flat leaves in the link group: the posture at
// a step, default-0 the link at rest, default-1 and default-2 the steps; inverse-0 to
// inverse-2 the same on the pen ground.
{
  for (const mode of ['light', 'dark'] as const) {
    const l = (figma[mode] as any).link, b = (figma[mode] as any).brand
    for (const name of LINK_LEAVES) ok(!!l?.[name]?.$type, `${mode}.link.${name} missing`)
    ok(!l?.default && !l?.inverse, `${mode}.link still nests a posture group`)
    ok(l['default-0'].$value.hex === leaf(b, 'pencil-47').$value.hex, `${mode} default link ${l['default-0'].$value.hex} != brand pencil-47 ${leaf(b, 'pencil-47').$value.hex}`)
    ok(l['default-1'].$value.hex === leaf(b, 'pen-58').$value.hex && l['default-2'].$value.hex === leaf(b, 'pen-70').$value.hex, `${mode} default link steps are not the brand's pen-58 and pen-70`)
  }
  const custom = themeToFigma(r, { secondary, neutralLevel: 'default', signals, linkHex: '#0B57D0' })
  for (const mode of ['light', 'dark'] as const) {
    const l = (custom[mode] as any).link, b = (custom[mode] as any).brand
    ok(l['default-0'].$value.hex !== leaf(b, 'pencil-47').$value.hex, `${mode} custom link should differ from the brand's pencil-47`)
  }
  ok((custom.light as any).link['default-0'].$value.hex === '#2a5cb4', `custom link light hex ${(custom.light as any).link['default-0'].$value.hex} != #2a5cb4 (the #0B57D0 seed through the wcag register, gamut-mapped emit)`)

  // the inverse trio: the same seed re-solved for text on the pen-70 ground, always raw
  // values (no alias posture). The light-mode inverse is a light color (dark-ramp
  // construction) so it must differ from the light-mode link; the custom seed must move
  // the inverse with it.
  for (const mode of ['light', 'dark'] as const) {
    const l = (figma[mode] as any).link
    ok(l['inverse-0'].$value.hex !== l['default-0'].$value.hex,
      `${mode} inverse link should differ from the link on the same seed`)
  }
  ok((figma.light as any).link['inverse-0'].$value.hex !== (figma.dark as any).link['inverse-0'].$value.hex,
    'inverse link should differ across modes (each mode solves against its own ground)')
  ok((custom.light as any).link['inverse-0'].$value.hex !== (figma.light as any).link['inverse-0'].$value.hex,
    'a custom link seed should re-seed the inverse trio too')
}

// VIVIDNESS LEVER (Phase 5): style:'full-chroma' releases the ramp's vividness cap
// (min(1, C/0.13) on the ladder) and reassigns the dark cta to the identity chroma policy.
// OFF is the shipped registers — the spot hexes above pin that. Signals and the light cta
// (identity chroma already) never move.
{
  const vivid = resolveBrand('#0B5FFF', 'vivid-probe', { style: 'full-chroma' })
  const plain = resolveBrand('#0B5FFF', 'vivid-probe')
  const w5v = vivid.scale.light.find(s => s.stop === 5)!, w5p = plain.scale.light.find(s => s.stop === 5)!
  ok(w5v.C > w5p.C + 1e-4, `full-chroma chalk-11 chroma did not rise (${w5v.C.toFixed(3)} vs ${w5p.C.toFixed(3)}) — cap release`)
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

// LEAF-ROUTING coverage: every leaf is flat in its group (a nested band group or a stamp
// group reappearing is the regression).
{
  for (const mode of ['light', 'dark'] as const) {
    ok(!!(figma[mode] as any).neutral['paper-0'], `${mode}.neutral.paper-0 missing (flat home)`)
    ok(!(figma[mode] as any).neutral['paper']?.['100'], `${mode}.neutral has a BANDED paper/100 leaf (flatten regression)`)
    ok(!(figma[mode] as any).neutral['ink']?.['53-aa'], `${mode}.neutral has a BANDED ink/53-aa leaf (flatten regression)`)
    ok(!!leaf((figma[mode] as any).brand, 'stamp-edge')?.$type, `${mode}.brand.stamp-edge missing (flat home)`)
    ok(!(figma[mode] as any).brand['stamp'], `${mode}.brand has a stamp group (the rows are flat)`)
  }
  const outline = themeToFigma(r, { secondary, secondaryStyle: 'outline', neutralLevel: 'default', signals })
  for (const mode of ['light', 'dark'] as const) {
    const sg = (outline[mode] as any)['brand-alt']
    ok(leaf(sg, 'stamp-0').$value.alpha === 0, `${mode} outline stamp-0 should be transparent`)
    ok(!!leaf(sg, 'stamp-edge') && leaf(sg, 'stamp-edge').$value.alpha === 1, `${mode} outline stamp-edge should carry highlighter-26 (opaque)`)
    ok(leaf(sg, 'stamp-edge').$value.hex === leaf(sg, 'highlighter-26').$value.hex, `${mode} outline stamp-edge != its highlighter-26`)
    ok(leaf(sg, 'stamp-on').$value.hex === leaf(sg, 'pencil-47').$value.hex, `${mode} outline stamp-on should be the family pencil-47`)
    ok(!sg['stamp'], `${mode} outline re-expression left a stamp group (the rows are flat)`)
  }
}

// ── THE EDGE GATE ─────────────────────────────────────────────────────────────────────
// A snapshot tells you a number moved, never whether the rule still means what it says
// (CATALOG C40), so three properties are asserted here, each of which a plausible
// refactor breaks silently:
//   1. the two emitters decide identically (the CSS literal vs the Figma alpha): they own
//      separate copies of the decision and have drifted before;
//   2. the rung matches the family: a ladder keyed by prefix is easy to mis-thread;
//   3. the gate tracks the page, not the family's own ramp.
{
  const probes: Array<[string, string, string]> = [
    // [primary, custom secondary, what it exercises]
    ['#B8FFB9', '#C4DAF2', 'pale primary — brand + secondary + neutral all fire in light'],
    ['#004E75', '#B45309', 'deep primary — only the neutral fires'],
  ]
  const RUNG: Record<string, number> = { brand: 0.16, 'brand-alt': 0.06, neutral: 0.08 }
  for (const [pHex, sHex, what] of probes) {
    const t = resolveTheme({ primaryHex: pHex, secondaryHex: sHex, secondaryStyle: 'default', contrastProfile: 'wcag' })
    const nScale = generateNeutralScale(t.primary.scale.brandH, 'default', 'wcag')
    const css = brandCss('probe', 'Probe', t.themed, t.secondary!.scale, '', 'default', 'wcag', 'default')
    const fg = themeToFigma(t.themed, {
      secondary: t.secondary!.scale, secondaryStyle: 'default', neutralLevel: 'default',
      contrastProfile: 'wcag', signals: t.signalOverrides.map(o => ({ name: o.name, scale: o.scale })),
    })
    for (const mode of ['light', 'dark'] as const) {
      const page = pageStopFor(nScale, mode)
      // the css block for this mode — dark is the second occurrence of each var
      const blocks = css.split('[data-theme="dark"]')
      const block = mode === 'light' ? blocks[0] : blocks.slice(1).join('')
      for (const fam of ['brand', 'brand-alt', 'neutral'] as const) {
        const scale = fam === 'brand' ? t.themed.scale : fam === 'brand-alt' ? t.secondary!.scale : nScale
        const should = ctaNeedsBorder(scale, mode, page)
        const alpha = leaf((fg[mode] as any)[fam], 'stamp-edge').$value.alpha
        // (3) the gate is page-relative and agrees with a freshly measured |Lc|
        const measured = ctaPageLc(scale, mode, page!) < 15
        ok(measured === should, `${what}: ${mode}.${fam} gate disagrees with a re-measured |Lc| vs the page`)
        // (1) both emitters reached the same verdict: the CSS edge is a literal, the pole
        // at the rung when the gate fires and `transparent` when it does not
        const cssFires = new RegExp(`--${fam}-stamp-edge: rgba\\(`).test(block)
        const cssTransparent = block.includes(`--${fam}-stamp-edge: transparent;`)
        ok(cssFires === should && cssTransparent === !should, `${what}: ${mode}.${fam} css says ${cssFires}, gate says ${should}`)
        ok((alpha > 0) === should, `${what}: ${mode}.${fam} figma says ${alpha > 0}, gate says ${should}`)
        // (2) and when it fires, at this family's rung, in both emitters
        if (should) {
          ok(Math.abs(alpha - RUNG[fam]) < 1e-9, `${what}: ${mode}.${fam} figma rung ${alpha}, expected ${RUNG[fam]}`)
          const want = `--${fam}-stamp-edge: rgba(${mode === 'light' ? '0, 0, 0' : '255, 255, 255'}, ${RUNG[fam]});`
          ok(block.includes(want), `${what}: ${mode}.${fam} css missing ${want}`)
        }
      }
    }
  }
  // the brand-independent block carries the four signal families and nothing else: no
  // alpha ladder, no opacity ladder, no scrim
  const root = signalsCss('wcag')
  for (const gone of ['--alpha-', '--opacity-', '--abs-black', '--scrim', '--surface-', '--shadow-'])
    ok(!root.includes(gone), `the signal block still carries ${gone}`)
}

if (fails.length) { console.error('FAIL:\n' + fails.map(f => '  - ' + f).join('\n')); process.exit(1) }
console.log('PASS — themeToFigma: the seven families, the six link rows and the seed absolutes in the one grammar, every leaf flat and no state word, light+dark, srgb components equal to the hex, spot hexes match, keys aligned across modes.')
