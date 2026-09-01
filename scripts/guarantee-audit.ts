// guarantee-audit — THE GROUP GUARANTEES AS A GATE (guarantee-groups round, owner
// 2026-08-27). The five bands each carry ONE flat claim, no caveats. SCOPE: a stop reads
// against its own family's grounds and the neutral's; the PEN band is symmetric (owner
// 2026-09-01: a pen and a ground are in scope when they share a family or either side is
// the neutral, both directions), so the neutral's pens also read against every chromatic
// family's grounds. Blanket any-on-any is owner-rejected: a sibling family's highlighter-20
// sits structurally out of reach. The neutral's crayon-26 and pencil-47 read against every
// chromatic family's papers as well (owner 2026-09-01: the rule is true for every band).
//
//   paper (0/1/3/5)          passes crayon-26 at 3:1 and every pen at 4.5
//   highlighter (8/11/15/20) passes the pen group (58/70/100) at 4.5
//   crayon-26                3:1 against paper only
//   pencil-47                4.5 against paper only          (pencil-47 pre guarantee round)
//   pen (58/70/100)          4.5 against paper AND highlighter      (the T10 highlighter-20 law)
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
// family (neutral, brand, derived brand-alt, the four signals), both modes. A pen of a
// chromatic family F reads against the surfaces of F and of the theme's neutral; the
// NEUTRAL's pens read against the neutral's surfaces and every chromatic family's — the
// direction this audit never measured before T13 (owner-caught 2026-09-01: neutral pen-58
// light sat at 4.16 on info highlighter-20 while the gate read PASS).
import { resolveTheme, signalScalesFor, softOnCtaPasses, SOFT_ON_CTA_ALPHA } from '../src/engine/resolve'
import { generateNeutralScale, type GeneratedScale } from '../src/engine/colorEngine'
import { contrastRatio, shippedY } from '../src/engine/constraints'
import { oklchToLinearRgb } from '../src/engine/constraints'
import { srgbEmitChannels } from '../src/engine/colorMath'
import { FIXTURES } from './fixture'
import type { NeutralLevel } from '../src/engine/neutralCurve'
// every tint level the neutral ships at — each level resolves its own pens, so each is measured
const NEUTRAL_LEVELS: readonly NeutralLevel[] = ['default', 'medium', 'pure', 'branded']

const enc = (c: number) => { c = Math.max(0, Math.min(1, c)); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055 }
const seedHex = (L: number, C: number, H: number) => '#' + oklchToLinearRgb(L, C, H).map(c => Math.round(enc(c) * 255).toString(16).padStart(2, '0')).join('')

// surfaces (array index = stop-1) and crayon stops, by the guarantee bands
const PAPERS = [1, 2, 3] as const          // paper-1 / 97 / 95 (paper-0 poles below)
const HIGHLIGHTERS = [4, 5, 6, 7] as const       // highlighter-8 / 89 / 85 / 80
const CRAYON = 8, PENCIL = 9, PENS = [10, 11] as const   // + pen-100, the resolved extreme (below)
const PEN_NAME = { 10: 'pen-58', 11: 'pen-70' } as const
const nameOf = (st: number) => ['paper-1', 'paper-3', 'paper-5', 'highlighter-8', 'highlighter-11', 'highlighter-15', 'highlighter-20'][st - 1]
const BAR = { crayon: 3.0, text: 4.5 }

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
  for (const level of NEUTRAL_LEVELS) {
  const neutral = generateNeutralScale(brand.brandH, level)
  const lv = level === 'default' ? '' : `${level} `
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
    // pen-100 is the LITERAL pole again (owner 2026-08-31, walking back the 2026-08-28
    // resolver) — the claim measures the shipped field, which now IS the pole; a
    // missing field falls back to the same pole so a partial build still gates
    const nI0 = mode === 'light' ? neutral.pen100 : neutral.pen100Dark
    const penPoleY = nI0 ? yOf(nI0) : mode === 'light' ? 0 : 1
    for (const f of fams) {
      const arr = mode === 'light' ? f.scale.light : f.scale.dark
      // the claim's scope, both directions: a chromatic family's stops read against its own
      // surfaces and the neutral's; the neutral's read against its own and EVERY chromatic
      // family's. Grounds are labeled by token name so the worst pair prints as a pair.
      const surfaces = (stops: readonly number[]): Array<[string, number]> => {
        const out: Array<[string, number]> = []
        for (const st of stops) {
          out.push([`own ${nameOf(st)}`, yOf(arr[st - 1])])
          if (f.name !== 'neutral') out.push([`neutral ${nameOf(st)}`, yOf(nArr[st - 1])])
          else for (const g of fams) if (g.name !== 'neutral')
            out.push([`${g.name} ${nameOf(st)}`, yOf((mode === 'light' ? g.scale.light : g.scale.dark)[st - 1])])
        }
        return out
      }
      const paperY = surfaces(PAPERS)
      if (f.name === 'neutral' && nP0) paperY.push(['paper-0', yOf(nP0)])
      const highlighterY = surfaces(HIGHLIGHTERS)
      const crayonY = yOf(arr[CRAYON - 1]), pencilY = yOf(arr[PENCIL - 1])
      const where = (s: string) => `${tag} ${mode} ${lv}${f.name} on ${s}`
      for (const [s, y] of paperY) {
        seen('crayon-26 vs paper', contrastRatio(crayonY, y), where(s), BAR.crayon)
        seen('pencil-47 vs paper', contrastRatio(pencilY, y), where(s), BAR.text)
        for (const pen of PENS) seen(`${PEN_NAME[pen]} vs paper`, contrastRatio(yOf(arr[pen - 1]), y), where(s), BAR.text)
        if (f.name === 'neutral') seen('pen-100 vs paper', contrastRatio(penPoleY, y), where(s), BAR.text)
      }
      for (const [s, y] of highlighterY) {
        for (const pen of PENS) seen(`${PEN_NAME[pen]} vs highlighter`, contrastRatio(yOf(arr[pen - 1]), y), where(s), BAR.text)
        if (f.name === 'neutral') seen('pen-100 vs highlighter', contrastRatio(penPoleY, y), where(s), BAR.text)
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
          seen('stamp/on soft vs fill', contrastRatio(textY, relY(fr, fg, fb)), `${tag} ${mode} ${lv}${qn} state ${i}`, BAR.text)
        })
      } else {
        // apca lane's solid pole = the Lc dialect (report-only, pending the owner's lane
        // ruling); the wcag lane's is gated hard at 4.5
        const cell = qn.includes('apca') ? 'stamp/on solid (apca · report)' : 'stamp/on solid vs fill'
        seen(cell, contrastRatio(pole, shippedY(states[0].L, states[0].C, states[0].H)), `${tag} ${mode} ${lv}${qn} rest`, qn.includes('apca') ? 0 : BAR.text)
      }
    }
  }
  }
}

for (let h = 0; h < 360; h += 5) for (const c of [0.06, 0.13, 0.2]) check(seedHex(0.62, c, h), `H${h}/C${c}`)
for (const fx of FIXTURES) check(fx.hex, fx.slug, { exact: fx.exact, archetypeOverride: fx.archetypeOverride, style: fx.style })

// REPORT-ONLY: the `full-chroma` register releases the ramp's vividness cap and its violet-band
// highlighter-20 sinks below the bound the neutral pens are clamped to
// (CHROMATIC_W80_WORST_SHIP_Y). The owner removed its checkbox from every UI 2026-09-01; the
// GenerateOptions lever remains for instruments, outside the guarantee. Measured so the
// residual stays visible; never gated.
function reportFullChroma(hex: string, tag: string) {
  const theme = resolveTheme({ primaryHex: hex, name: 'brand', deriveSecondary: true, style: 'full-chroma' })
  const neutral = generateNeutralScale(theme.themed.scale.brandH)
  const grounds: Array<[string, GeneratedScale]> = [['brand', theme.themed.scale], ...theme.signalOverrides.map(o => [o.name, o.scale] as [string, GeneratedScale])]
  if (theme.secondary) grounds.push(['brand-alt', theme.secondary.scale])
  for (const mode of ['light', 'dark'] as const) {
    const nArr = mode === 'light' ? neutral.light : neutral.dark
    for (const [g, sc] of grounds) {
      const s7 = (mode === 'light' ? sc.light : sc.dark)[6]
      const y = shippedY(s7.L, s7.C, s7.H)
      for (const pen of PENS) {
        const p = nArr[pen - 1]
        seen(`${PEN_NAME[pen]} vs full-chroma highlighter-20 (report)`, contrastRatio(shippedY(p.L, p.C, p.H), y), `${tag} ${mode} neutral on full-chroma ${g}`, 0)
      }
    }
  }
}
for (let h = 0; h < 360; h += 5) for (const c of [0.13, 0.2, 0.32]) reportFullChroma(seedHex(0.62, c, h), `H${h}/C${c}`)

console.log(`\n=== guarantee-audit: the five band claims, shipped basis, ${seeds} seeds × 2 modes × 7 families × ${NEUTRAL_LEVELS.length} neutral levels ===`)
for (const [k, w] of Object.entries(cells).sort())
  console.log(`  ${k.padEnd(20)} worst ${w.r.toFixed(3)}  @ ${w.where}`)
if (fails.length) {
  console.log(`\nFAILURES: ${fails.length}`)
  for (const f of fails.slice(0, 20)) console.log('  ✗ ' + f)
  console.log('\nGATE: FAIL')
  process.exit(1)
}
console.log('\nGATE: PASS — every band claim holds at its bar (crayon 3:1, text 4.5), own family or neutral, both directions, both modes')
