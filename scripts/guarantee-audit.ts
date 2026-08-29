// guarantee-audit — THE GROUP GUARANTEES AS A GATE (guarantee-groups round, owner
// 2026-08-27). The five bands each carry ONE flat claim, no caveats, scoped to the
// stop's OWN family plus the NEUTRAL (blanket any-on-any is owner-rejected — a sibling
// family's wash-80 sits structurally out of reach):
//
//   paper (100/99/97/95)  passes mark-74 at 3:1 and every ink at 4.5
//   wash  (92/89/85/80)   passes the ink group (42/30/0) at 4.5
//   mark-74               3:1 against paper only
//   lead-53               4.5 against paper only          (lead-53 pre guarantee round)
//   ink   (42/30/0)       4.5 against paper AND wash      (the T10 wash-80 law)
//
// Plus the STAMP/ON pairing (owner ruling 2026-08-29): a quiet cta's shipped on-text —
// the soft composite where softOnCtaPasses gates it in, the solid pole at rest where
// gated out — measured WCAG in the shipped basis, both solver lanes ("apca is the
// optimizer only; the text needs to pass WCAG"). GATES: soft (both lanes — the checker's
// bar is WCAG by the C47 design) and the wcag lane's solid fallback. The APCA lane's
// solid fallback is REPORT-ONLY: its pole rides the loud Lc dialect (the 2026-07-04
// profile split) and can dip under 4.5 WCAG — whether that lane's quiet text takes the
// WCAG floor is a pending owner call.
//
// Basis: the SHIPPED 8-bit pair (shippedY both sides — the value every browser and
// audit tool measures). Sweep: agnostic hue×chroma seeds + the audit fixtures, every
// family (neutral, brand, derived brand-alt, the four signals), both modes. An ink of
// family F is checked against the surfaces of F and of the theme's neutral; the
// neutral's own inks are covered by the same rule (own = neutral).
import { resolveTheme, signalScalesFor, softOnCtaPasses, SOFT_ON_CTA_ALPHA } from '../src/engine/resolve'
import { generateNeutralScale, type GeneratedScale } from '../src/engine/colorEngine'
import { contrastRatio, shippedY } from '../src/engine/constraints'
import { oklchToLinearRgb } from '../src/engine/constraints'
import { srgbEmitChannels } from '../src/engine/colorMath'
import { FIXTURES } from './fixture'

const enc = (c: number) => { c = Math.max(0, Math.min(1, c)); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055 }
const seedHex = (L: number, C: number, H: number) => '#' + oklchToLinearRgb(L, C, H).map(c => Math.round(enc(c) * 255).toString(16).padStart(2, '0')).join('')

// surfaces (array index = stop-1) and marks, by the guarantee bands
const PAPERS = [1, 2, 3] as const          // paper-99 / 97 / 95 (paper-100 poles below)
const WASHES = [4, 5, 6, 7] as const       // wash-92 / 89 / 85 / 80
const MARK = 8, LEAD = 9, INKS = [10, 11] as const   // + ink-0, the resolved extreme (below)
const BAR = { mark: 3.0, text: 4.5 }

type Worst = { r: number; where: string }
const cells: Record<string, Worst> = {}
const fails: string[] = []
const seen = (k: string, r: number, where: string, bar: number) => {
  if (!cells[k] || r < cells[k].r) cells[k] = { r, where }
  if (r < bar) fails.push(`${k}: ${r.toFixed(3)} < ${bar} @ ${where}`)
}

let seeds = 0
function check(hex: string, tag: string, opts: { exact?: boolean; archetypeOverride?: any; style?: any } = {}) {
  seeds++
  const theme = resolveTheme({ primaryHex: hex, name: 'brand', deriveSecondary: true, ...opts })
  // the apca-lane resolution, for the stamp/on pairing only (its quiet fills differ; the
  // five band claims stay measured on the shipped wcag lane as before)
  const themeApca = resolveTheme({ primaryHex: hex, name: 'brand', deriveSecondary: true, ...opts, contrastProfile: 'apca' })
  const brand = theme.themed.scale
  const neutral = generateNeutralScale(brand.brandH)
  const sig = signalScalesFor()
  const overrides = new Map(theme.signalOverrides.map(o => [o.name, o.scale]))
  const fams: Array<{ name: string; scale: GeneratedScale }> = [
    { name: 'neutral', scale: neutral }, { name: 'brand', scale: brand },
    ...(theme.secondary ? [{ name: 'brand-alt', scale: theme.secondary.scale }] : []),
    ...(['red', 'yellow', 'green', 'blue'] as const).map(n => {
      const entry = sig.get(n)!
      return { name: entry.def.emitName, scale: overrides.get(n) ?? entry.scale }
    }),
  ]
  for (const mode of ['light', 'dark'] as const) {
    const nArr = mode === 'light' ? neutral.light : neutral.dark
    const nP0 = mode === 'light' ? neutral.paper0 : neutral.paper0Dark
    const yOf = (s: { L: number; C: number; H: number }) => shippedY(s.L, s.C, s.H)
    // ink-0 RESOLVED off the pole 2026-08-28 (near-black light / near-white dark) — the
    // claim now measures the shipped extreme, not the literal; missing field falls back
    // to the old pole so a partial build still gates
    const nI0 = mode === 'light' ? neutral.ink0 : neutral.ink0Dark
    const inkPoleY = nI0 ? yOf(nI0) : mode === 'light' ? 0 : 1
    for (const f of fams) {
      const arr = mode === 'light' ? f.scale.light : f.scale.dark
      // the claim's scope: the stop's own family's surfaces + the neutral's
      const surfaces = (stops: readonly number[]): Array<[string, number]> => {
        const out: Array<[string, number]> = []
        for (const st of stops) {
          out.push([`own s${st + 1}`, yOf(arr[st - 1])])
          if (f.name !== 'neutral') out.push([`neutral s${st + 1}`, yOf(nArr[st - 1])])
        }
        return out
      }
      const paperY = surfaces(PAPERS)
      if (f.name === 'neutral' && nP0) paperY.push(['paper-100', yOf(nP0)])
      const washY = surfaces(WASHES)
      const markY = yOf(arr[MARK - 1]), leadY = yOf(arr[LEAD - 1])
      const where = (s: string) => `${tag} ${mode} ${f.name} on ${s}`
      for (const [s, y] of paperY) {
        seen('mark-74 vs paper', contrastRatio(markY, y), where(s), BAR.mark)
        seen('lead-53 vs paper', contrastRatio(leadY, y), where(s), BAR.text)
        for (const ink of INKS) seen(`ink-${ink === 10 ? 42 : 30} vs paper`, contrastRatio(yOf(arr[ink - 1]), y), where(s), BAR.text)
        if (f.name === 'neutral') seen('ink-0 vs paper', contrastRatio(inkPoleY, y), where(s), BAR.text)
      }
      for (const [s, y] of washY) {
        for (const ink of INKS) seen(`ink-${ink === 10 ? 42 : 30} vs wash`, contrastRatio(yOf(arr[ink - 1]), y), where(s), BAR.text)
        if (f.name === 'neutral') seen('ink-0 vs wash', contrastRatio(inkPoleY, y), where(s), BAR.text)
      }
    }
    // stamp/on over the quiet cta fill (owner ruling 2026-08-29): the soft composite is
    // engine-gated per mode (softOnCtaPasses) — wherever it SHIPS it holds 4.5 on every
    // fill state, and a gated-off fill's solid pole holds 4.5 at rest, the regular button
    // law. Both branches measured here in the shipped 8-bit basis so the pairing cannot
    // silently regress (the round-2 PoC finding: the old default-model bypass shipped a
    // 2.83:1 dark pressed composite).
    const q8 = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255) / 255
    const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
    const relY = (r: number, g: number, b: number) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
    const quiet: Array<[string, GeneratedScale]> = [
      ['neutral', neutral],
      ...(theme.secondary ? [['brand-alt', theme.secondary.scale] as [string, GeneratedScale]] : []),
      ...(themeApca.secondary ? [['brand-alt apca', themeApca.secondary.scale] as [string, GeneratedScale]] : []),
    ]
    for (const [qn, qs] of quiet) {
      const white = mode === 'light' ? qs.onFillTextIsWhite : qs.onFillTextIsWhiteDark
      const pole = white ? 1 : 0
      const states = mode === 'light' ? [qs.cta, qs.ctaHover, qs.ctaPressed] : [qs.ctaDark, qs.ctaHoverDark, qs.ctaPressedDark]
      if (softOnCtaPasses(qs, mode)) {
        const a = SOFT_ON_CTA_ALPHA[mode]
        states.forEach((st, i) => {
          const e = srgbEmitChannels(st)
          const fr = q8(e.r), fg = q8(e.g), fb = q8(e.b)
          const textY = relY(pole * a + fr * (1 - a), pole * a + fg * (1 - a), pole * a + fb * (1 - a))
          seen('stamp/on soft vs fill', contrastRatio(textY, relY(fr, fg, fb)), `${tag} ${mode} ${qn} state ${i}`, BAR.text)
        })
      } else {
        // apca lane's solid pole = the Lc dialect (report-only, pending the owner's lane
        // ruling); the wcag lane's is gated hard at 4.5
        const cell = qn.includes('apca') ? 'stamp/on solid (apca · report)' : 'stamp/on solid vs fill'
        seen(cell, contrastRatio(pole, shippedY(states[0].L, states[0].C, states[0].H)), `${tag} ${mode} ${qn} rest`, qn.includes('apca') ? 0 : BAR.text)
      }
    }
  }
}

for (let h = 0; h < 360; h += 5) for (const c of [0.06, 0.13, 0.2]) check(seedHex(0.62, c, h), `H${h}/C${c}`)
for (const fx of FIXTURES) check(fx.hex, fx.slug, { exact: fx.exact, archetypeOverride: fx.archetypeOverride, style: fx.style })

console.log(`\n=== guarantee-audit: the five band claims, shipped basis, ${seeds} seeds × 2 modes × 7 families ===`)
for (const [k, w] of Object.entries(cells).sort())
  console.log(`  ${k.padEnd(20)} worst ${w.r.toFixed(3)}  @ ${w.where}`)
if (fails.length) {
  console.log(`\nFAILURES: ${fails.length}`)
  for (const f of fails.slice(0, 20)) console.log('  ✗ ' + f)
  console.log('\nGATE: FAIL')
  process.exit(1)
}
console.log('\nGATE: PASS — every band claim holds at its bar (mark 3:1, text 4.5), own family + neutral, both modes')
