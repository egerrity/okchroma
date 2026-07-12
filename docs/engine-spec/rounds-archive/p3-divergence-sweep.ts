// p3-divergence-sweep.ts — P3 master-gamut kickoff instrument (P3-DESIGN.md §1a/1b/1d).
// Measurement only. Sections:
//   A: pure-math chroma headroom P3 vs sRGB over an L×H grid
//   B: in-gamut Y equivalence (wcagY vs true XYZ-Y; apcaY basis dependence)
//   C: real-pipeline sweep (resolveTheme, agnostic hue×chroma×L seeds, both profiles):
//      which emitted stops are pinned at the sRGB boundary, P3 headroom there,
//      contrast deltas at full headroom (exact-P3 read vs sRGB-clamp-down read)
// Run: esbuild scripts/p3-divergence-sweep.ts --bundle --platform=node --outfile=dist/p3-divergence-sweep.js && node dist/p3-divergence-sweep.js
import { resolveTheme } from '../../../src/engine/resolve'
import { generateNeutralScale, type GeneratedScale } from '../../../src/engine/colorEngine'
import { clampChromaToGamut, wcagY, contrastRatio, apcaY, apcaLc } from '../../../src/engine/constraints'
import { oklchToSrgbUnclamped, type ColorStop } from '../../../src/engine/colorMath'
import { trueY, clampChromaToGamutP3, apcaYP3 } from './p3-math'

const maxCsrgb = (L: number, H: number) => clampChromaToGamut(L, 0.52, H)
const maxCp3 = (L: number, H: number) => clampChromaToGamutP3(L, 0.52, H)

function apcaYSrgbOf(L: number, C: number, H: number): number {
  const cS = clampChromaToGamut(L, C, H)
  const { r, g, b } = oklchToSrgbUnclamped(L, cS, H)
  return apcaY(r, g, b)
}
const srgbClampY = (L: number, C: number, H: number) => wcagY(L, clampChromaToGamut(L, C, H), H)
const f = (n: number, d = 4) => n.toFixed(d)

// ── A: headroom grid ──────────────────────────────────────────────────────────────
console.log('══ A. P3 vs sRGB max-chroma headroom (L×H grid) ══')
const bands: Array<[string, number, number]> = [
  ['red 20-40', 20, 40], ['orange 40-70', 40, 70], ['gold 70-95', 70, 95],
  ['yellow-green 95-130', 95, 130], ['green 130-165', 130, 165], ['teal-cyan 165-220', 165, 220],
  ['blue 220-280', 220, 280], ['violet-magenta 280-330', 280, 330], ['pink-red 330-380', 330, 380],
]
console.log('band | avg ΔC | max ΔC (at L) | avg ratio p3/srgb')
for (const [name, lo, hi] of bands) {
  let sum = 0, n = 0, mx = 0, mxL = 0, ratioSum = 0
  for (let H = lo; H < hi; H += 5) {
    for (let L = 0.2; L <= 0.9; L += 0.05) {
      const s = maxCsrgb(L, H % 360), p = maxCp3(L, H % 360)
      const d = p - s
      sum += d; ratioSum += p / Math.max(s, 1e-6); n++
      if (d > mx) { mx = d; mxL = L }
    }
  }
  console.log(`${name} | ${f(sum / n)} | ${f(mx)} (L=${f(mxL, 2)}) | ${f(ratioSum / n, 3)}`)
}

// ── B: in-gamut Y equivalence ──────────────────────────────────────────────────────
console.log('\n══ B. wcagY (linear-sRGB path) vs true XYZ-Y, in-sRGB-gamut colors ══')
let mxdY = 0, mxdApca = 0
for (let H = 0; H < 360; H += 7) {
  for (let L = 0.05; L <= 0.98; L += 0.04) {
    const c = maxCsrgb(L, H) * 0.999
    for (const cc of [0, c * 0.5, c]) {
      mxdY = Math.max(mxdY, Math.abs(wcagY(L, cc, H) - trueY(L, cc, H)))
      mxdApca = Math.max(mxdApca, Math.abs(apcaYP3(L, cc, H) - apcaYSrgbOf(L, cc, H)))
    }
  }
}
console.log(`max |wcagY − trueY| in-gamut: ${mxdY.toExponential(2)}`)
console.log(`max |apcaY(p3 path) − apcaY(srgb path)| in-gamut: ${mxdApca.toExponential(2)}`)

// ── C: real pipeline ────────────────────────────────────────────────────────────────
console.log('\n══ C. Real pipeline (resolveTheme): sRGB-pinned stops + P3 deltas ══')
function seedHex(L: number, C: number, H: number): string {
  const c = clampChromaToGamut(L, C, H, 'srgb') * 0.999   // seeds are sRGB hexes by contract (D4)
  const { r, g, b } = oklchToSrgbUnclamped(L, c, H)
  const q = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')
  return `#${q(r)}${q(g)}${q(b)}`
}
type Row = {
  role: string; mode: 'light' | 'dark'; stop: number | string
  L: number; C: number; H: number
  headC: number                     // P3 max C − current C (only pinned rows recorded)
  wcagWhiteA: number; wcagWhiteB: number  // ratio vs white: srgb-clamp-down Y vs exact-P3 Y at full headroom
  wcagBlackA: number; wcagBlackB: number
  lcWhiteA: number; lcWhiteB: number      // APCA Lc white-on-fill: srgb apcaY vs p3 apcaY at full headroom
  lcBlackA: number; lcBlackB: number
  poleFlip: boolean
  seed: string; profile: string
}
const rows: Row[] = []
let totalStops = 0
const pinnedByStop = new Map<string, { pinned: number; total: number }>()

function scanScale(s: GeneratedScale, role: string, seed: string, profile: string) {
  const entries: Array<{ mode: 'light' | 'dark'; stop: number | string; cs: ColorStop }> = []
  for (const cs of s.light) entries.push({ mode: 'light', stop: cs.stop, cs })
  for (const cs of s.dark) entries.push({ mode: 'dark', stop: cs.stop, cs })
  entries.push({ mode: 'light', stop: 'cta', cs: s.cta }, { mode: 'light', stop: 'ctaHover', cs: s.ctaHover })
  entries.push({ mode: 'dark', stop: 'cta', cs: s.ctaDark }, { mode: 'dark', stop: 'ctaHover', cs: s.ctaHoverDark })
  for (const { mode, stop, cs } of entries) {
    totalStops++
    const key = `${role}:${mode}:${stop}`
    const bucket = pinnedByStop.get(key) ?? { pinned: 0, total: 0 }
    bucket.total++
    const mS = maxCsrgb(cs.L, cs.H)
    const pinned = cs.C >= mS - 5e-4 && cs.C > 0.02
    if (pinned) {
      bucket.pinned++
      const mP = maxCp3(cs.L, cs.H)
      const headC = mP - cs.C
      if (headC > 1e-4) {
        const Cp = mP * 0.999   // full-headroom hypothetical P3 color at this stop
        const yExact = trueY(cs.L, Cp, cs.H)
        const yClamp = srgbClampY(cs.L, Cp, cs.H)
        const aW = contrastRatio(1.0, yClamp), bW = contrastRatio(1.0, yExact)
        const aB = contrastRatio(yClamp, 0), bB = contrastRatio(yExact, 0)
        const apS = apcaYSrgbOf(cs.L, Cp, cs.H), apP = apcaYP3(cs.L, Cp, cs.H)
        const lwA = apcaLc(1.0, apS), lwB = apcaLc(1.0, apP)
        const lbA = apcaLc(0.0, apS), lbB = apcaLc(0.0, apP)
        const flip = (Math.abs(lwA) >= Math.abs(lbA)) !== (Math.abs(lwB) >= Math.abs(lbB))
        rows.push({
          role, mode, stop, L: cs.L, C: cs.C, H: cs.H, headC,
          wcagWhiteA: aW, wcagWhiteB: bW, wcagBlackA: aB, wcagBlackB: bB,
          lcWhiteA: lwA, lcWhiteB: lwB, lcBlackA: lbA, lcBlackB: lbB,
          poleFlip: flip, seed, profile,
        })
      }
    }
    pinnedByStop.set(key, bucket)
  }
}

const HS = Array.from({ length: 36 }, (_, i) => i * 10)
const LS = [0.40, 0.55, 0.70]
const CS = [0.08, 0.13, 0.18]
for (const profile of ['wcag', 'apca'] as const) {
  for (const H of HS) for (const L of LS) for (const C of CS) {
    const hex = seedHex(L, C, H)
    const t = resolveTheme({ primaryHex: hex, name: 'sweep', contrastProfile: profile === 'wcag' ? undefined : 'apca' })
    scanScale(t.themed.scale, 'brand', hex, profile)
    for (const o of t.signalOverrides) scanScale(o.scale, `sig:${o.name}`, hex, profile)
  }
  const t0 = resolveTheme({ primaryHex: '#3366cc', name: 'n', contrastProfile: profile === 'wcag' ? undefined : 'apca' })
  scanScale(t0.themed.scale, 'canary', '#3366cc', profile)
  const n = generateNeutralScale(250, 'default', profile === 'wcag' ? undefined : 'apca')
  scanScale(n, 'neutral', 'H250', profile)
}

console.log(`stops scanned: ${totalStops}, pinned-with-headroom rows: ${rows.length}`)

console.log('\n— pinned incidence by role:mode:stop (only >0, sorted) —')
const inc = [...pinnedByStop.entries()].filter(([, v]) => v.pinned > 0)
  .sort((a, b) => b[1].pinned / b[1].total - a[1].pinned / a[1].total)
for (const [k, v] of inc) console.log(`${k}  ${v.pinned}/${v.total} (${(100 * v.pinned / v.total).toFixed(0)}%)`)

const low = rows.filter(r => typeof r.stop === 'number' && (r.stop as number) <= 8)
console.log(`\npinned rows at stops ≤8: ${low.length} of ${rows.length}`)
if (low.length) {
  const byStop = new Map<number, number>()
  for (const r of low) byStop.set(r.stop as number, (byStop.get(r.stop as number) ?? 0) + 1)
  console.log('  by stop:', [...byStop.entries()].sort((a, b) => a[0] - b[0]).map(([s, n]) => `${s}:${n}`).join(' '))
  const worst = low.reduce((a, b) => (b.headC > a.headC ? b : a))
  console.log(`  worst headroom ΔC at low stop: ${f(worst.headC)} (${worst.role} ${worst.mode} stop ${worst.stop}, L=${f(worst.L, 3)} H=${f(worst.H, 1)})`)
}

console.log('\n— per group: median/max ΔC headroom; max |ΔLc| white & black; WCAG boundary crossings; pole flips —')
const groups = new Map<string, Row[]>()
for (const r of rows) {
  const g = `${r.role.startsWith('sig') ? 'signals' : r.role}:${r.mode}:${typeof r.stop === 'string' ? 'cta' : (r.stop as number) <= 2 ? 'paper' : (r.stop as number) <= 7 ? 'wash' : (r.stop as number) <= 10 ? 'highlight' : 'text/ink'}`
  ;(groups.get(g) ?? groups.set(g, []).get(g)!).push(r)
}
const med = (xs: number[]) => xs.slice().sort((a, b) => a - b)[Math.floor(xs.length / 2)]
const crosses = (a: number, b: number, bar: number) => (a >= bar) !== (b >= bar)
for (const [g, rs] of [...groups.entries()].sort()) {
  const dC = rs.map(r => r.headC)
  const dLcW = Math.max(...rs.map(r => Math.abs(r.lcWhiteB - r.lcWhiteA)))
  const dLcB = Math.max(...rs.map(r => Math.abs(r.lcBlackB - r.lcBlackA)))
  const x45 = rs.filter(r => crosses(r.wcagWhiteA, r.wcagWhiteB, 4.5) || crosses(r.wcagBlackA, r.wcagBlackB, 4.5)).length
  const x30 = rs.filter(r => crosses(r.wcagWhiteA, r.wcagWhiteB, 3.0) || crosses(r.wcagBlackA, r.wcagBlackB, 3.0)).length
  const flips = rs.filter(r => r.poleFlip).length
  console.log(`${g}  n=${rs.length}  ΔC med ${f(med(dC))} max ${f(Math.max(...dC))}  |ΔLc| w ${dLcW.toFixed(1)} b ${dLcB.toFixed(1)}  x4.5 ${x45}  x3.0 ${x30}  poleFlip ${flips}`)
}

console.log('\n— top 8 |ΔLc white| rows (srgb-clamp read vs exact-P3 read, full headroom) —')
for (const r of rows.slice().sort((a, b) => Math.abs(b.lcWhiteB - b.lcWhiteA) - Math.abs(a.lcWhiteB - a.lcWhiteA)).slice(0, 8))
  console.log(`${r.role} ${r.mode} ${r.stop} L${f(r.L, 2)} C${f(r.C, 3)}→+${f(r.headC, 3)} H${f(r.H, 0)}  LcW ${r.lcWhiteA.toFixed(1)}→${r.lcWhiteB.toFixed(1)}  LcB ${r.lcBlackA.toFixed(1)}→${r.lcBlackB.toFixed(1)}  wcagW ${f(r.wcagWhiteA, 2)}→${f(r.wcagWhiteB, 2)}  [${r.profile}] ${r.seed}`)

console.log('\n— pole flips (all) —')
for (const r of rows.filter(r => r.poleFlip).slice(0, 20))
  console.log(`${r.role} ${r.mode} ${r.stop} L${f(r.L, 2)} H${f(r.H, 0)} C${f(r.C, 3)}+${f(r.headC, 3)} LcW ${r.lcWhiteA.toFixed(1)}→${r.lcWhiteB.toFixed(1)} LcB ${r.lcBlackA.toFixed(1)}→${r.lcBlackB.toFixed(1)} [${r.profile}]`)

console.log('\n— gold band (H 70–95) pinned stops: headroom detail —')
const gold = rows.filter(r => r.H >= 70 && r.H <= 95)
for (const r of gold.slice(0, 12))
  console.log(`${r.role} ${r.mode} ${r.stop} L${f(r.L, 3)} C${f(r.C, 4)} +ΔC ${f(r.headC, 4)} H${f(r.H, 1)} [${r.profile}]`)
console.log(`gold-band pinned rows total: ${gold.length}`)
