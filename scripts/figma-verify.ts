// Verifies themeToFigma end-to-end for a real brand with a secondary (Dark
// Roast), exercising the same merge the demo handler does. Checks structure +
// spot values against ground truth, then discards output (verification only).

import { BRANDS } from '../src/brands'
import { SECONDARIES } from '../src/secondaries'
import { SIGNALS } from '../src/engine/signals'
import { resolveBrand, resolveTheme, SIGNAL_SCALES, SOFT_ON_CTA_ALPHA } from '../src/engine/resolve'
import { themeToFigma } from '../src/engine/figmaRender'
import { brandCss, signalsCss, ctaNeedsBorder, ctaPageLc, pageStopFor } from '../src/engine/cssRender'
import { generateNeutralScale } from '../src/engine/colorEngine'

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

// banded-leaf access (owner 2026-07-27 band grouping): flat leaf names resolve
// to their nested homes (paper/1, cta/enabled, cta/on, highlight/on, ...) so the
// assertions below keep reading in the familiar flat vocabulary
const BAND_STATE: Record<string, string> = {
  'cta': 'cta/enabled', 'cta-hover': 'cta/hover', 'cta-pressed': 'cta/pressed',
  'cta-border': 'cta/border', 'on-cta': 'cta/on',
  'cta-ink': 'cta-ink/enabled', 'cta-ink-hover': 'cta-ink/hover', 'cta-ink-pressed': 'cta-ink/pressed',
  'cta-ink-strong': 'cta-ink-strong/enabled', 'cta-ink-strong-hover': 'cta-ink-strong/hover', 'cta-ink-strong-pressed': 'cta-ink-strong/pressed',
  // 'on-highlight' mapping DROPPED — died with the highlight band, 2026-07-29.
}
// Stage B (owner 2026-08-07, names only): band-split regex mirrors figmaRender's
// bandedLeaf — 'highlight' left the band-word set, 'mark' joined; leaf now carries
// everything after the FIRST hyphen (LL(-rNNN) forms) instead of one digit group.
const leaf = (g: any, flat: string): any =>
  (BAND_STATE[flat] ?? flat.replace(/^(paper|wash|mark|ink)-(.+)$/, '$1/$2'))
    .split('/').reduce((cur: any, seg: string) => cur?.[seg], g)

// Same families/modes — every family is emitted UNIFORMLY now: the scale runs 1–10
// (highlight-9 + on-highlight deleted and the inks renumbered down, owner 2026-07-29 —
// so ink-53-r450 is the emphasis fill AND the first text stop), and the cta is the off-scale
// SIX-token family (cta/cta-hover/cta-pressed + the cta-ink trio + on-cta, semantic
// names — owner 2026-07-16). ONE on-color per family now.
const CTA_FAMILY = ['cta', 'cta-hover', 'cta-pressed', 'cta-ink', 'cta-ink-hover', 'cta-ink-pressed']
for (const mode of ['light', 'dark'] as const) {
  const m = figma[mode] as any
  for (const fam of ['brand', 'secondary', 'neutral', 'red', 'yellow', 'green', 'blue']) {
    ok(!!m[fam], `${mode}.${fam} missing`)
    // brand/secondary: full scale + off-scale cta family + identity + on-cta.
    // neutral: scale + cta family + on-cta. signals: scale + a DISTINCT loud cta +
    // on-cta, but still NO identity (no user-input hex to echo).
    // ⚠️ highlight-9 and on-highlight MUST BE ABSENT — a reappearance means an emitter
    // regressed the collapse.
    const isBrand = fam === 'brand' || fam === 'secondary'
    const tokens = isBrand
      ? ['paper-99', ...CTA_FAMILY, 'mark-74-r300', 'ink-53-r450', 'ink-42-r650', 'ink-30-r700', 'on-cta', 'identity']
      : ['paper-99', 'mark-74-r300', ...CTA_FAMILY, 'ink-30-r700', 'on-cta']
    for (const t of tokens) ok(!!leaf(m[fam], t), `${mode}.${fam}.${t} missing`)
    for (const gone of ['highlight-9', 'on-highlight'])
      ok(!leaf(m[fam], gone), `${mode}.${fam}.${gone} is still emitted — the highlight collapse regressed`)
    // the cta-ink trio is the ink band as states (C49): enabled ≡ ink-53-r450, hover ≡
    // ink-42-r650 (the between text stop — the retired raw value's successor), pressed ≡
    // ink-30-r700
    for (const [state, sib] of [['cta-ink', 'ink-53-r450'], ['cta-ink-hover', 'ink-42-r650'], ['cta-ink-pressed', 'ink-30-r700']] as const)
      ok(leaf(m[fam], state).$value.hex === leaf(m[fam], sib).$value.hex,
        `${mode}.${fam} ${state} ${leaf(m[fam], state).$value.hex} != ${sib} ${leaf(m[fam], sib).$value.hex}`)
    // the STRONG text-cta mirror (owner 2026-08-04) is NEUTRAL-ONLY: it descends the same
    // three stops cta-ink ascends — enabled ≡ ink-30-r700, hover ≡ ink-42-r650 (shared
    // through cta-ink-hover), pressed ≡ ink-53-r450 (C49). Any other family emitting it is a regression.
    if (fam === 'neutral') {
      for (const [strong, sib] of [['cta-ink-strong', 'ink-30-r700'], ['cta-ink-strong-hover', 'cta-ink-hover'], ['cta-ink-strong-pressed', 'ink-53-r450']] as const)
        ok(leaf(m[fam], strong)?.$value.hex === leaf(m[fam], sib).$value.hex,
          `${mode}.${fam} ${strong} ${leaf(m[fam], strong)?.$value.hex} != ${sib} ${leaf(m[fam], sib).$value.hex}`)
    } else {
      ok(!leaf(m[fam], 'cta-ink-strong'), `${mode}.${fam} emits cta-ink-strong — the strong trio is neutral-only`)
    }
    // the SOFT on-cta (the quiet-fill rule): the neutral's cta is the scale-fed wash-level
    // fill, so its button text is the on-text POLE AT ALPHA (owner 2026-08-04) — same
    // register the default-model secondary carries. LOUD fills keep the solid pole; a
    // signal or the brand going soft here would be a leak.
    const onCta = leaf(m[fam], 'on-cta').$value
    const isPole = onCta.components.every((c: number) => c === 0) || onCta.components.every((c: number) => c === 1)
    ok(isPole, `${mode}.${fam} on-cta is not a pole (${onCta.hex})`)
    if (fam === 'neutral')
      ok(onCta.alpha === SOFT_ON_CTA_ALPHA[mode], `${mode}.neutral on-cta alpha ${onCta.alpha} != the soft register ${SOFT_ON_CTA_ALPHA[mode]}`)
    else if (fam !== 'secondary')
      ok(onCta.alpha === 1, `${mode}.${fam} on-cta must stay a SOLID pole (got alpha ${onCta.alpha}) — the soft register is the quiet fills only`)
    // Signals carry a DISTINCT loud cta (diverged from the emphasis fill, F1);
    // they still have no identity (no user-input hex).
    if (!isBrand && fam !== 'neutral') {
      ok(leaf(m[fam], 'cta').$value.hex !== leaf(m[fam], 'ink-53-r450').$value.hex,
        `${mode}.${fam} cta should DIVERGE from ink-53-r450 (F1 — signals routed through the scale)`)
      ok(!m[fam]['identity'], `${mode}.${fam} should not have identity`)
    }
  }
}
// Color token shape (brand cta is the off-scale fill)
const bcta = leaf((figma.light as any).brand, 'cta')
ok(bcta.$type === 'color', 'brand/cta not type color')
ok(bcta.$value && bcta.$value.colorSpace === 'srgb' && Array.isArray(bcta.$value.components) && bcta.$value.components.length === 3, 'brand/cta $value not srgb-components object')
// Spot value vs known engine output (dark-roast brand cta light #07074f; dark
// #a4bafa — the C42 dark clearance lightens the flat-register cta until its black
// pole clears the Lc law; before C42 this read #869cda).
ok(leaf((figma.light as any).brand, 'cta').$value.hex === '#07074f', `brand/cta light hex ${leaf((figma.light as any).brand, 'cta').$value.hex} != #07074f`)
ok(leaf((figma.dark as any).brand, 'cta').$value.hex === '#a4bafa', `brand/cta dark hex ${leaf((figma.dark as any).brand, 'cta').$value.hex} != #a4bafa`)
// Identical token names across modes
// DEEP key walk (review-caught 2026-07-27: with banded groups a shallow
// Object.keys compare only sees the 7 band names — a dropped dark leaf passed)
const keyTree = (g: any): any => g?.$type ? 1 : Object.fromEntries(Object.keys(g ?? {}).map(k => [k, keyTree(g[k])]))
ok(JSON.stringify(keyTree((figma.light as any).brand)) === JSON.stringify(keyTree((figma.dark as any).brand)), 'brand keys differ across modes')

// NEUTRAL CTA ESCAPE (Phase 3 + the ALL-ctas amendment): with the flag on, the brand's
// fill trio re-resolves from the brand-neutral's ink register (cta anchors at neutral
// ink-30-r700 exactly; near-black light / near-white dark; on-cta flips) AND the text-style
// cta trio swaps to the NEUTRAL's cta-ink (its ink-53-r450 register); the ramp stays the
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
    ok(leaf(b, 'cta').$value.hex === leaf(n, 'ink-30-r700').$value.hex, `${mode} escape cta ${leaf(b, 'cta').$value.hex} != neutral ink-30-r700 ${leaf(n, 'ink-30-r700').$value.hex}`)
    ok(leaf(b, 'cta').$value.hex !== leaf(p, 'cta').$value.hex, `${mode} escape cta did not move off the brand cta`)
    ok(leaf(b, 'cta-ink').$value.hex === leaf(n, 'ink-53-r450').$value.hex, `${mode} escape cta-ink ${leaf(b, 'cta-ink').$value.hex} != neutral ink-53-r450 ${leaf(n, 'ink-53-r450').$value.hex} (ALL the ctas de-red)`)
    ok(leaf(b, 'cta-ink-pressed').$value.hex === leaf(n, 'ink-30-r700').$value.hex, `${mode} escape cta-ink-pressed ${leaf(b, 'cta-ink-pressed').$value.hex} != neutral ink-30-r700 ${leaf(n, 'ink-30-r700').$value.hex}`)
    ok(leaf(b, 'paper-99').$value.hex === leaf(p, 'paper-99').$value.hex, `${mode} escape touched the ramp`)
    ok((esc[mode] as any).link['link'].$value.hex === leaf(b, 'cta-ink').$value.hex, `${mode} default link does not follow the escaped cta-ink`)
    // the RED RESET (owner amendment): under the escape the red group ships CANONICAL —
    // byte-equal to the canonical emit, different from this brand's variant
    for (const leafName of ['cta', 'cta-hover', 'cta-pressed', 'mark-74-r300', 'ink-53-r450']) {
      ok(leaf((esc[mode] as any).red, leafName).$value.hex === leaf((canon[mode] as any).red, leafName).$value.hex,
        `${mode} escape red/${leafName} ${leaf((esc[mode] as any).red, leafName).$value.hex} != canonical ${leaf((canon[mode] as any).red, leafName).$value.hex} (the escape must reset red)`)
    }
    ok(leaf((esc[mode] as any).red, 'cta').$value.hex !== leaf((plain[mode] as any).red, 'cta').$value.hex
      || leaf((plain[mode] as any).red, 'cta').$value.hex === leaf((canon[mode] as any).red, 'cta').$value.hex,
      `${mode} escape red cta still matches the VARIANT (the probe's filter regressed)`)
  }
  ok(leaf((esc.light as any).brand, 'on-cta').$value.hex === '#ffffff', `escape light on-cta should be white on the near-black fill (got ${leaf((esc.light as any).brand, 'on-cta').$value.hex})`)
  ok(leaf((esc.dark as any).brand, 'on-cta').$value.hex === '#000000', `escape dark on-cta should be black on the near-white fill (got ${leaf((esc.dark as any).brand, 'on-cta').$value.hex})`)
  // the escape's fill is the neutral's LOUD ink-42-r650 register, not the quiet wash cta, so it
  // keeps the SOLID pole (owner-confirmed 2026-08-04). The hex assertions above check the
  // pole but not its opacity — a soft-on-cta leak would slip past them.
  for (const mode of ['light', 'dark'] as const)
    ok(leaf((esc[mode] as any).brand, 'on-cta').$value.alpha === 1,
      `${mode} escape on-cta must stay a SOLID pole (got alpha ${leaf((esc[mode] as any).brand, 'on-cta').$value.alpha})`)
}

// NEUTRAL HUE SOURCE (owner 2026-08-04): ThemeInput.neutralH re-tints the neutral toward a
// non-primary hue (Match secondary / Custom resolve to a hue via colorEngine.neutralTintHue);
// ABSENT must stay byte-equal to the primary-hued emit — every pre-source caller unchanged.
{
  const base = themeToFigma(r, { secondary: null, neutralLevel: 'default', signals })
  const sourced = themeToFigma(r, { secondary: null, neutralLevel: 'default', neutralH: 200, signals })
  const dflt = themeToFigma(r, { secondary: null, neutralLevel: 'default', neutralH: r.scale.brandH, signals })
  for (const mode of ['light', 'dark'] as const) {
    ok(JSON.stringify((sourced[mode] as any).neutral) !== JSON.stringify((base[mode] as any).neutral),
      `${mode} neutralH=200 did not move the neutral off the primary-hued emit`)
    ok(JSON.stringify((sourced[mode] as any).brand) === JSON.stringify((base[mode] as any).brand),
      `${mode} neutralH leaked outside the neutral group`)
    ok(JSON.stringify((dflt[mode] as any).neutral) === JSON.stringify((base[mode] as any).neutral),
      `${mode} explicit neutralH=brandH should be byte-equal to the absent default`)
  }
}

// SYSTEM LINK (Phase 4): one trio per theme. Default = the primary's cta-ink verbatim;
// a custom seed = its ink-register resolution (differs from the brand's own ink).
{
  for (const mode of ['light', 'dark'] as const) {
    const l = (figma[mode] as any).link, b = (figma[mode] as any).brand
    for (const leaf of ['link', 'link-hover', 'link-pressed'])
      ok(!!l?.[leaf], `${mode}.link.${leaf} missing`)
    ok(l['link'].$value.hex === leaf(b, 'cta-ink').$value.hex, `${mode} default link ${l['link'].$value.hex} != brand cta-ink ${leaf(b, 'cta-ink').$value.hex}`)
  }
  const custom = themeToFigma(r, { secondary, neutralLevel: 'default', signals, linkHex: '#0B57D0' })
  for (const mode of ['light', 'dark'] as const) {
    const l = (custom[mode] as any).link, b = (custom[mode] as any).brand
    ok(l['link'].$value.hex !== leaf(b, 'cta-ink').$value.hex, `${mode} custom link should differ from the brand's cta-ink`)
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
  ok(w5v.C > w5p.C + 1e-4, `full-chroma wash-89 chroma did not rise (${w5v.C.toFixed(3)} vs ${w5p.C.toFixed(3)}) — cap release`)
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

// BAND-ROUTING coverage (review-caught 2026-07-27: neither the neutral paper/100
// nesting nor the outline block's putLeaf routes were exercised before)
{
  for (const mode of ['light', 'dark'] as const) {
    ok(!!leaf((figma[mode] as any).neutral, 'paper-100'), `${mode}.neutral.paper/100 missing (banded home)`)
    ok(!(figma[mode] as any).neutral['paper-100'], `${mode}.neutral has a FLAT paper-100 leaf (band regression)`)
    ok(!!leaf((figma[mode] as any).brand, 'cta-border'), `${mode}.brand.cta/border missing (banded home)`)
  }
  const outline = themeToFigma(r, { secondary, secondaryStyle: 'outline', neutralLevel: 'default', signals })
  for (const mode of ['light', 'dark'] as const) {
    const sg = (outline[mode] as any).secondary
    ok(leaf(sg, 'cta').$value.alpha === 0, `${mode} outline cta/enabled should be transparent`)
    ok(!!leaf(sg, 'cta-border') && leaf(sg, 'cta-border').$value.alpha === 1, `${mode} outline cta/border should carry mark/74-r300 (opaque)`)
    ok(leaf(sg, 'cta-border').$value.hex === leaf(sg, 'mark-74-r300').$value.hex, `${mode} outline cta/border != its mark/74-r300`)
    ok(leaf(sg, 'on-cta').$value.hex === leaf(sg, 'ink-53-r450').$value.hex, `${mode} outline cta/on should be the family ink/53-r450`)
    ok(!sg['cta'] || !sg['cta'].$type, `${mode} outline left a FLAT cta leaf (band regression)`)
  }
}

// ── THE CTA-BORDER GATE (owner 2026-07-31) ───────────────────────────────────────────────────
// Until this round NOTHING asserted ctaNeedsBorder: the only regression evidence was an
// ext-overrides-snapshot diff, which is exactly the blind spot CATALOG C40 was written about —
// a snapshot tells you a number moved, never whether the rule still means what it says.
//
// Three properties, each of which a plausible refactor breaks silently:
//   1. the two emitters DECIDE IDENTICALLY (css var vs figma alpha) — they own separate copies
//      of the decision and have drifted before (figmaRender's banner described a rule that never
//      shipped, for two rounds);
//   2. the rung matches the family — a ladder keyed by prefix is easy to mis-thread;
//   3. the gate tracks the PAGE, not the family's own ramp — the C39 rule it replaced was
//      family-relative, and reverting to that shape would still typecheck.
{
  const probes: Array<[string, string, string]> = [
    // [primary, custom secondary, what it exercises]
    ['#B8FFB9', '#C4DAF2', 'pale primary — brand + secondary + neutral all fire in light'],
    ['#004E75', '#B45309', 'deep primary — only the neutral fires'],
  ]
  const RUNG: Record<string, number> = { brand: 0.16, secondary: 0.06, neutral: 0.08 }
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
      for (const fam of ['brand', 'secondary', 'neutral'] as const) {
        const scale = fam === 'brand' ? t.themed.scale : fam === 'secondary' ? t.secondary!.scale : nScale
        const should = ctaNeedsBorder(scale, mode, page)
        const alpha = leaf((fg[mode] as any)[fam], 'cta-border').$value.alpha
        // (3) the gate is page-relative and agrees with a freshly measured |Lc|
        const measured = ctaPageLc(scale, mode, page!) < 15
        ok(measured === should, `${what}: ${mode}.${fam} gate disagrees with a re-measured |Lc| vs the page`)
        // (1) both emitters reached the same verdict
        const cssFires = new RegExp(`--${fam}-cta-border: var\\(--alpha-offset-`).test(block)
        ok(cssFires === should, `${what}: ${mode}.${fam} css says ${cssFires}, gate says ${should}`)
        ok((alpha > 0) === should, `${what}: ${mode}.${fam} figma says ${alpha > 0}, gate says ${should}`)
        // (2) and when it fires, at this family's rung, in both emitters
        if (should) {
          ok(Math.abs(alpha - RUNG[fam]) < 1e-9, `${what}: ${mode}.${fam} figma rung ${alpha}, expected ${RUNG[fam]}`)
          const want = `--${fam}-cta-border: var(--alpha-offset-${String(RUNG[fam] * 100).padStart(2, '0')});`
          ok(block.includes(want), `${what}: ${mode}.${fam} css missing ${want}`)
        }
      }
    }
  }
  // the ladder's rows must exist in :root for every rung an emitter can name, or a firing
  // family aliases a variable nothing declares
  const root = signalsCss('wcag')
  for (const rung of [6, 8, 16])
    for (const mode of ['light', 'dark'] as const)
      ok(root.includes(`--alpha-offset-${String(rung).padStart(2, '0')}: rgba(${mode === 'light' ? '0, 0, 0' : '255, 255, 255'}`),
        `system alpha row --alpha-offset-${String(rung).padStart(2, '0')} missing from :root (${mode})`)
}

if (fails.length) { console.error('FAIL:\n' + fails.map(f => '  - ' + f).join('\n')); process.exit(1) }
console.log('PASS — themeToFigma: brand/secondary/neutral + 4 signals, light+dark, srgb-components shape, spot hexes match, keys aligned across modes.')
