// alpha-audit — the paper-overlay law gates (owner round 2026-08-13), fixture-sweep wide.
//
// HARD GATES, per theme × family × mode:
//   1. pen bars on the QUANTIZED rgba: pencil-47/42/30 keep 4.5/6.5/7.0 (shipped 8-bit
//      basis) against the worst overlay composite — the lightest on the lightest
//      paper in dark, the darkest on the darkest paper in light.
//   2. the TOL bound, observed: each rung's composite apparent L* spans ≤ 2×TOL
//      across the four neutral papers (both within ±TOL of one target).
//   3. the visibility floor: a non-neutral rung's worst-field ΔE ≥ the theme bar,
//      OR its pen chroma sits at the sRGB ceiling (the reported near-white cap).
//   4. snapshot: every overlay value byte-stable vs the blessed build (--bless).
//
// REPORTS (no gate): dark step evenness vs K × light steps · the canonical-vs-theme
// signal overlay spread (the signalsCss canonical-plane note's measurement).
import * as fs from 'fs'
import * as path from 'path'
import { resolveTheme, signalScalesFor } from '../src/engine/resolve'
import { generateNeutralScale, type GeneratedScale } from '../src/engine/colorEngine'
import { alphaPapersFor, alphaSep, compositeHex, ALPHA_TOL_APP, type AlphaPaper } from '../src/engine/alphaPapers'
import { stopHex } from '../src/engine/cssRender'
import { hexToOklch, type ColorStop } from '../src/engine/colorMath'
import { apparentL } from '../src/engine/perceptualL'
import { clampChromaToGamut, contrastRatio, shippedY } from '../src/engine/constraints'
import { stopDeltaE } from '../src/engine/collision'
import { FIXTURES } from './fixture'

// process.cwd(), not __dirname — the esbuild bundle runs from dist/ and the
// snapshot must live with the others in scripts/
const SNAPSHOT = path.join(process.cwd(), 'scripts', 'alpha-snapshot.json')
const bless = process.argv.includes('--bless')
const appHex = (h: string) => { const o = hexToOklch(h); return apparentL(o.L, o.C, o.H, 'srgb') }

interface Fam { name: string; scale: GeneratedScale }
function familiesFor(hex: string): { fams: Fam[]; neutral: GeneratedScale } {
  const theme = resolveTheme({ primaryHex: hex, name: 'brand' })
  const brand = theme.themed.scale
  const neutral = generateNeutralScale(brand.brandH)
  const sig = signalScalesFor()
  const overrides = new Map(theme.signalOverrides.map(o => [o.name, o.scale]))
  const fams: Fam[] = [
    { name: 'neutral', scale: neutral }, { name: 'brand', scale: brand },
    ...(['red', 'yellow', 'green', 'blue'] as const).map(n => {
      const entry = sig.get(n)!
      return { name: entry.def.emitName, scale: overrides.get(n) ?? entry.scale }
    }),
  ]
  return { fams, neutral }
}

const stopAt = (s: GeneratedScale, mode: 'light' | 'dark', stop: number): ColorStop =>
  stop === 0 ? (mode === 'light' ? s.paper0! : s.paper0Dark!) : (mode === 'light' ? s.light : s.dark)[stop - 1]

const TEXT_BARS: Array<[number, number]> = [[9, 4.5], [10, 6.5], [11, 7.0]]
let hardFails = 0
const fail = (msg: string) => { hardFails++; console.log(`  ✗ ${msg}`) }
const snapshot: Record<string, string> = {}
const evenness: number[] = []

for (const fx of FIXTURES) {
  const { fams, neutral } = familiesFor(fx.hex)
  const sep = alphaSep(fams.map(f => f.scale))
  for (const mode of ['light', 'dark'] as const) {
    const fields = [0, 1, 2, 3].map(fs => stopHex(stopAt(neutral, mode, fs)))
    for (const { name, scale } of fams) {
      const twins = alphaPapersFor(scale, neutral, mode, sep)
      snapshot[`${fx.name}|${mode}|${name}`] = twins.map(t => `${t.overlayHex}@${t.alpha}`).join(' ')
      // 1: pen bars on the worst composite
      const ys = twins.map(t => { const o = hexToOklch(compositeHex(t.overlayHex, fields[3], t.alpha)); return shippedY(o.L, o.C, o.H) })
      const worstY = mode === 'dark' ? Math.max(...ys) : Math.min(...ys)
      for (const [st, bar] of TEXT_BARS) {
        const pen = stopAt(scale, mode, st)
        const r = contrastRatio(shippedY(pen.L, pen.C, pen.H), worstY)
        if (r < bar) fail(`${fx.name} ${mode} ${name}: pen bar ${bar} vs worst overlay = ${r.toFixed(2)}`)
      }
      for (const t of twins) {
        const comps = fields.map(f => compositeHex(t.overlayHex, f, t.alpha))
        // 2: the TOL bound, observed as span
        const apps = comps.map(appHex)
        const span = Math.max(...apps) - Math.min(...apps)
        if (span > 2 * ALPHA_TOL_APP + 0.2) fail(`${fx.name} ${mode} ${name} ${t.name}: apparent span ${span.toFixed(2)} across the papers`)
        // 3: the visibility floor, or a declared cap (gamut near white, or the pen
        // law's chroma ceiling — the law outranks the look). A capped rung must SAY
        // so; a silent shortfall fails.
        if (name !== 'neutral') {
          const minDE = Math.min(...comps.map((c, i) => stopDeltaE(hexToOklch(c) as ColorStop, hexToOklch(fields[i]) as ColorStop)))
          const pen = hexToOklch(t.overlayHex)
          const gamutCapped = pen.C >= clampChromaToGamut(pen.L, 0.4, pen.H, 'srgb') - 1e-3
          if (minDE < sep - 0.002 && !t.capped && !gamutCapped)
            fail(`${fx.name} ${mode} ${name} ${t.name}: ΔE ${minDE.toFixed(3)} under the bar with no declared cap`)
        }
      }
      // evenness report input (dark, vs the sunken field)
      if (mode === 'dark') {
        const apps = twins.map(t => appHex(compositeHex(t.overlayHex, fields[0], t.alpha)))
        evenness.push(Math.abs((apps[2] - apps[1]) - (apps[1] - apps[0])))
      }
    }
  }
}

// canonical-vs-theme signal spread (the signalsCss canonical-plane measurement)
{
  const canonicalNeutral = generateNeutralScale(0)
  const sig = signalScalesFor()
  const sigScales = (['red', 'yellow', 'green', 'blue'] as const).map(n => sig.get(n)!.scale)
  const canonSep = alphaSep([canonicalNeutral, ...sigScales])
  let maxA = 0, maxDE = 0
  for (const fx of FIXTURES.slice(0, 6)) {
    const { fams, neutral } = familiesFor(fx.hex)
    const sep = alphaSep(fams.map(f => f.scale))
    for (const mode of ['light', 'dark'] as const)
      for (const s of sigScales) {
        const themed = alphaPapersFor(s, neutral, mode, sep)
        const canon = alphaPapersFor(s, canonicalNeutral, mode, canonSep)
        themed.forEach((t, i) => {
          maxA = Math.max(maxA, Math.abs(t.alpha - canon[i].alpha))
          maxDE = Math.max(maxDE, stopDeltaE(hexToOklch(t.overlayHex) as ColorStop, hexToOklch(canon[i].overlayHex) as ColorStop))
        })
      }
  }
  console.log(`canonical signal overlay spread vs 6 themes: max alpha Δ ${maxA.toFixed(2)}, max pen ΔE ${maxDE.toFixed(3)}`)
}
console.log(`dark step unevenness (|Δstep| on the ground): worst ${Math.max(...evenness).toFixed(2)} apparent`)

if (bless) {
  fs.writeFileSync(SNAPSHOT, JSON.stringify(snapshot, null, 1))
  console.log(`blessed: ${SNAPSHOT}`)
} else if (fs.existsSync(SNAPSHOT)) {
  const blessed = JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8'))
  let drift = 0
  for (const k of Object.keys(snapshot))
    if (blessed[k] !== snapshot[k]) { drift++; if (drift <= 5) console.log(`  drift ${k}: ${blessed[k]} → ${snapshot[k]}`) }
  if (drift) fail(`snapshot drift: ${drift} rows`)
  else console.log('snapshot: clean — matches blessed build')
} else console.log('no snapshot yet — run with --bless to freeze')

console.log(hardFails ? `alpha-audit FAIL: ${hardFails}` : 'alpha-audit: PASS')
process.exit(hardFails ? 1 : 0)
