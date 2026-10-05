// guarantee-audit: THE GROUP GUARANTEES AS A GATE. The five bands each carry ONE flat
// claim, no caveats. SCOPE: a stop reads against its own family's grounds and the
// neutral's, and the scope is symmetric: a stop and a ground are in scope when they share
// a family or either side is the neutral, both directions. So the neutral's stops also
// read against every chromatic family's grounds: its highlighter-26 and pencil-47 against
// their papers, its pens against their papers and chalks. Blanket any-on-any is not
// claimed: a sibling family's chalk-20 sits structurally out of a chromatic pen's reach.
//
//   paper (0/1/3/5)          passes highlighter-26 at 3:1 and every pen at 4.5
//   chalk (8/11/15/20) passes the pen group (58/70/100) at 4.5
//   highlighter-26                3:1 against paper only
//   pencil-47                4.5 against paper only
//   pen (58/70/100)          4.5 against paper AND chalk      (spec.ts T10, the chalk-20 law)
//   pen (58/70/100)          4.5 against highlighter-26 at every state rung, composited
//                            over every paper in scope (the translucent state layers)
//
// Plus the STAMP/ON pairing: a quiet cta's shipped on-text (the soft composite where
// softOnCtaPasses gates it in, the solid pole at rest where it is gated out), measured as
// a WCAG ratio in the shipped basis. The neutral is read on the wcag lane, the derived
// brand-alt on both solver lanes. GATES: the soft composite (both lanes: the checker's
// bar is the 4.5 ratio in both, C47) and the wcag lane's solid fallback. The APCA lane's
// solid fallback is REPORT-ONLY: that lane judges its pole on Lc alone and the pole can
// read under 4.5; whether its quiet text takes the ratio floor is undecided (CATALOG C81).
//
// Basis: the SHIPPED 8-bit pair (shippedY both sides, the value every browser and audit
// tool measures). Sweep: agnostic hue×chroma seeds + the audit fixtures, every family
// (neutral, brand, derived brand-alt, the four signals), both modes. Both directions are
// measured: a chromatic family's stops against its own grounds and the theme's neutral's,
// and the NEUTRAL's against its own and every chromatic family's. A gate that read one
// direction would pass while a neutral pen sat under the bar on a chromatic chalk.
import { resolveTheme, signalScalesFor, softOnCtaPasses, SOFT_ON_CTA_ALPHA } from '../src/engine/resolve'
import { generateNeutralScale, type GeneratedScale } from '../src/engine/colorEngine'
import { contrastRatio, shippedY } from '../src/engine/constraints'
import { oklchToLinearRgb } from '../src/engine/constraints'
import { srgbEmitChannels, hexToOklch } from '../src/engine/colorMath'
import { stopHex } from '../src/engine/cssRender'
import { GUARANTEE_SCOPE, BAND_STOPS, AA_LARGE, AA_BODY } from '../src/engine/tokenDescriptions'
// the translucency weights a state layer built on highlighter-26 may take: the engine
// emits no opacity ladder (C68), and this audit holds the highlighter under these weights
// so a semantic layer that composites it over a paper keeps the pen text bar. The weights
// are the rungs of the interaction register kept in research/semantic-layer/
// (interaction.ts INTERACTION_RUNGS).
const STATE_LAYER_WEIGHTS = [0.08, 0.12, 0.16, 0.24, 0.32] as const
import { compositeHex } from '../src/engine/alphaPapers'
import { FIXTURES } from './fixture'
import type { NeutralLevel } from '../src/engine/neutralCurve'
// every tint level the neutral ships at — each level resolves its own pens, so each is measured
const NEUTRAL_LEVELS: readonly NeutralLevel[] = ['default', 'medium', 'pure', 'branded']

const enc = (c: number) => { c = Math.max(0, Math.min(1, c)); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055 }
const seedHex = (L: number, C: number, H: number) => '#' + oklchToLinearRgb(L, C, H).map(c => Math.round(enc(c) * 255).toString(16).padStart(2, '0')).join('')

// grounds (array index = stop-1) and the contrast stops, by the guarantee bands
const PAPERS = [1, 2, 3] as const          // paper-1 / 3 / 5 (the paper-0 pole below)
const CHALKS = [4, 5, 6, 7] as const       // chalk-8 / 11 / 15 / 20
const HIGHLIGHTER = 8, PENCIL = 9, PENS = [10, 11] as const   // + pen-100, the neutral's literal pole (below)
const PEN_NAME = { 10: 'pen-58', 11: 'pen-70' } as const
const nameOf = (st: number) => ['paper-1', 'paper-3', 'paper-5', 'chalk-8', 'chalk-11', 'chalk-15', 'chalk-20'][st - 1]
const BAR = { highlighter: 3.0, text: 4.5 }

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
  // five band claims are measured on the shipped wcag lane)
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
    // pen-100 is the LITERAL pole, and the claim measures the shipped field; a missing
    // field falls back to the same pole so a partial build still gates
    const nI0 = mode === 'light' ? neutral.pen100 : neutral.pen100Dark
    const penPoleY = nI0 ? yOf(nI0) : mode === 'light' ? 0 : 1
    for (const f of fams) {
      const arr = mode === 'light' ? f.scale.light : f.scale.dark
      // the claim's scope, both directions: a chromatic family's stops read against its own
      // grounds and the neutral's; the neutral's read against its own and EVERY chromatic
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
      const chalkY = surfaces(CHALKS)
      const highlighterY = yOf(arr[HIGHLIGHTER - 1]), pencilY = yOf(arr[PENCIL - 1])
      const where = (s: string) => `${tag} ${mode} ${lv}${f.name} on ${s}`
      for (const [s, y] of paperY) {
        seen('highlighter-26 vs paper', contrastRatio(highlighterY, y), where(s), BAR.highlighter)
        seen('pencil-47 vs paper', contrastRatio(pencilY, y), where(s), BAR.text)
        for (const pen of PENS) seen(`${PEN_NAME[pen]} vs paper`, contrastRatio(yOf(arr[pen - 1]), y), where(s), BAR.text)
        if (f.name === 'neutral') seen('pen-100 vs paper', contrastRatio(penPoleY, y), where(s), BAR.text)
      }
      for (const [s, y] of chalkY) {
        for (const pen of PENS) seen(`${PEN_NAME[pen]} vs chalk`, contrastRatio(yOf(arr[pen - 1]), y), where(s), BAR.text)
        if (f.name === 'neutral') seen('pen-100 vs chalk', contrastRatio(penPoleY, y), where(s), BAR.text)
      }
      // THE STATE-LAYER CLAIM: highlighter-26 at every state-layer weight, composited over
      // every paper in scope (gamma sRGB, the basis every renderer composites in), holds
      // the pen group at 4.5. The composite's Y is read from its 8-bit hex like any
      // shipped pair.
      const hlHex = stopHex(arr[HIGHLIGHTER - 1])
      const paperHex: Array<[string, string]> = []
      for (const st of PAPERS) {
        paperHex.push([`own ${nameOf(st)}`, stopHex(arr[st - 1])])
        if (f.name !== 'neutral') paperHex.push([`neutral ${nameOf(st)}`, stopHex(nArr[st - 1])])
        else for (const g of fams) if (g.name !== 'neutral')
          paperHex.push([`${g.name} ${nameOf(st)}`, stopHex((mode === 'light' ? g.scale.light : g.scale.dark)[st - 1])])
      }
      if (f.name === 'neutral' && nP0) paperHex.push(['paper-0', stopHex(nP0)])
      for (const weight of STATE_LAYER_WEIGHTS) for (const [s, gHex] of paperHex) {
        const o = hexToOklch(compositeHex(hlHex, gHex, weight))
        const cy = shippedY(o.L, o.C, o.H)
        const at = `${s} under highlighter-26 at ${Math.round(weight * 100)}%`
        for (const pen of PENS) seen(`${PEN_NAME[pen]} vs state rung`, contrastRatio(yOf(arr[pen - 1]), cy), where(at), BAR.text)
        if (f.name === 'neutral') seen('pen-100 vs state rung', contrastRatio(penPoleY, cy), where(at), BAR.text)
      }
    }
    // stamp/on over the quiet cta fill: the soft composite is engine-gated per mode
    // (softOnCtaPasses). Wherever it SHIPS it holds 4.5 on every fill state, and a
    // gated-off fill's solid pole holds 4.5 at rest, the regular button law. Both
    // branches are measured here in the shipped 8-bit basis so the pairing cannot
    // silently regress.
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
        // the apca lane's solid pole is judged on Lc alone and is report-only (CATALOG
        // C81); the wcag lane's is gated hard at 4.5
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
// chalk-20 sinks below the bound the neutral pens are clamped to
// (CHROMATIC_W80_WORST_SHIP_Y). No UI offers it; the GenerateOptions lever remains for
// instruments, outside the guarantee. Measured so the residual stays visible; never gated.
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
        seen(`${PEN_NAME[pen]} vs full-chroma chalk-20 (report)`, contrastRatio(shippedY(p.L, p.C, p.H), y), `${tag} ${mode} neutral on full-chroma ${g}`, 0)
      }
    }
  }
}
for (let h = 0; h < 360; h += 5) for (const c of [0.13, 0.2, 0.32]) reportFullChroma(seedHex(0.62, c, h), `H${h}/C${c}`)

// THE SCOPE TABLE IS THE GATE'S OWN: the document descriptions render each claim's ground
// from tokenDescriptions.GUARANTEE_SCOPE, so the pairs this audit measured must be exactly
// that table's pairs, at that table's level. A band the table names that was not measured,
// a ground measured that the table does not name, or a level that differs, fails here, so
// a token can never describe a claim the gate does not hold.
{
  const measured = new Set(Object.keys(cells).filter(k => / vs (paper|chalk)$/.test(k)))
  const expected = new Set<string>()
  const levelOf: Record<number, string> = { [BAR.highlighter]: AA_LARGE, [BAR.text]: AA_BODY }
  for (const band of Object.keys(GUARANTEE_SCOPE) as Array<keyof typeof GUARANTEE_SCOPE>) {
    const bar = band === 'highlighter' ? BAR.highlighter : BAR.text
    if (GUARANTEE_SCOPE[band].level !== levelOf[bar]) fails.push(`scope table: ${band} says "${GUARANTEE_SCOPE[band].level}", the gate measures it at ${bar}`)
    const stops = [...BAND_STOPS[band], ...(band === 'pen' ? ['pen-100'] : [])]
    for (const ground of GUARANTEE_SCOPE[band].grounds) for (const stop of stops) expected.add(`${stop} vs ${ground}`)
  }
  for (const k of expected) if (!measured.has(k)) fails.push(`scope table names ${k}, which this audit did not measure`)
  for (const k of measured) if (!expected.has(k)) fails.push(`this audit measured ${k}, which the scope table does not name`)
}

console.log(`\n=== guarantee-audit: the five band claims, shipped basis, ${seeds} seeds × 2 modes × 7 families × ${NEUTRAL_LEVELS.length} neutral levels ===`)
for (const [k, w] of Object.entries(cells).sort())
  console.log(`  ${k.padEnd(20)} worst ${w.r.toFixed(3)}  @ ${w.where}`)
if (fails.length) {
  console.log(`\nFAILURES: ${fails.length}`)
  for (const f of fails.slice(0, 20)) console.log('  ✗ ' + f)
  console.log('\nGATE: FAIL')
  process.exit(1)
}
console.log('\nGATE: PASS — every band claim holds at its bar (highlighter 3:1, text 4.5), own family or neutral, both directions, both modes')
