// c12-helmlab-research.ts — RESEARCH (owner ask 2026-07-10): can helmlab (MetricSpace,
// H-K embedded, COMBVD-fit) do the collision work more intelligently?
// Empirical, against HER data:
//   T1  P1 marks (100, scenario-B truth): single helmlab threshold vs the 5-weight fitted gate
//   T2  P2 ladder marks (9): is "first truly different" a CONSTANT helmlab distance?
//   T3  the dark/light asymmetry: does H-K reproduce "dark persists / scarier" (wDark .70 vs wLight 1.6)?
//   T4  her FENCE (on-the-fence) cells: does differenceWithConfidence flag them unreliable?
// Diagnostic-only standing rule respected: findings inform a DECLARED in-engine rule, no migration.
import { Helmlab } from 'helmlab'
import { SIGNALS } from '/Users/emilygerrity/okchroma/src/engine/signals'
import { signalScalesFor } from '/Users/emilygerrity/okchroma/src/engine/resolve'
import { clampChromaToGamut, oklchToLinearRgb } from '/Users/emilygerrity/okchroma/src/engine/constraints'

const hl = new Helmlab()
const hx = (L: number, C: number, H: number) => {
  const c = clampChromaToGamut(L, C, H)
  const [rl, gl, bl] = oklchToLinearRgb(L, c, H)
  const gm = (v: number) => { const x = Math.min(1, Math.max(0, v)); return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055 }
  const ch = (v: number) => Math.round(gm(v) * 255).toString(16).padStart(2, '0')
  return `#${ch(rl)}${ch(gl)}${ch(bl)}`
}
const RED_SEED = SIGNALS.find(s => s.name === 'red')!.hex
const redCta = signalScalesFor('apca').get('red')!.scale.cta
const RED_CTA = hx(redCta.L, redCta.C, redCta.H)

// scenario-B truth (fit v7 marks, 0/100 under the fitted gate)
const MARKS: Array<[number, number, number, boolean]> = [
  [0.55, 0.2, 32, true], [0.55, 0.17, 32, true], [0.55, 0.2, 36, true], [0.55, 0.2, 40, true], [0.55, 0.2, 44, true],
  [0.65, 0.14, 28, true], [0.6, 0.14, 28, true], [0.65, 0.14, 40, true], [0.6, 0.14, 40, true],
  [0.55, 0.2, 28, true], [0.55, 0.17, 28, true], [0.55, 0.17, 36, true], [0.55, 0.17, 40, true],
  [0.73, 0.2, 28, false], [0.73, 0.2, 32, false],
  [0.65, 0.12, 24, false], [0.6, 0.12, 28, false], [0.6, 0.12, 40, false], [0.6, 0.14, 52, false], [0.6, 0.17, 60, false],
  [0.73, 0.2, 16, false], [0.73, 0.17, 24, false], [0.73, 0.17, 28, false], [0.73, 0.17, 32, false], [0.73, 0.17, 36, false], [0.73, 0.2, 48, false],
  [0.65, 0.14, 4, false], [0.65, 0.2, 4, false], [0.6, 0.2, 4, false], [0.6, 0.14, 4, false], [0.65, 0.12, 8, false], [0.6, 0.12, 8, false],
  [0.55, 0.14, 20, false], [0.55, 0.12, 36, false], [0.55, 0.14, 48, false], [0.55, 0.17, 56, false], [0.55, 0.2, 56, false],
  [0.60, 0.12, 8, false], [0.60, 0.12, 16, false], [0.60, 0.12, 24, false], [0.60, 0.12, 32, false], [0.60, 0.12, 40, false],
  [0.60, 0.14, 0, false], [0.60, 0.14, 44, false], [0.60, 0.14, 48, false],
  [0.65, 0.12, 12, false], [0.65, 0.12, 20, false], [0.65, 0.12, 28, false], [0.65, 0.12, 36, false],
  [0.65, 0.14, 4, false], [0.65, 0.14, 8, false], [0.65, 0.17, 4, false], [0.65, 0.14, 12, false],
  [0.65, 0.14, 44, false], [0.65, 0.14, 48, false], [0.65, 0.17, 48, false],
  [0.5, 0.2, 36, true],
  [0.73, 0.17, 12, false], [0.73, 0.14, 16, false], [0.73, 0.14, 20, false], [0.73, 0.14, 48, false], [0.73, 0.17, 52, false],
  [0.55, 0.17, 4, false], [0.65, 0.08, 16, false], [0.6, 0.08, 20, false], [0.6, 0.08, 48, false],
  // session L0.55 (scenario B final)
  [0.55, 0.17, 356, false], [0.55, 0.14, 0, false], [0.55, 0.17, 0, false], [0.55, 0.14, 4, false], [0.55, 0.17, 4, false],
  [0.55, 0.12, 8, false], [0.55, 0.14, 8, false], [0.55, 0.17, 8, false], [0.55, 0.12, 12, false], [0.55, 0.14, 12, false],
  [0.55, 0.12, 16, false], [0.55, 0.14, 16, false], [0.55, 0.12, 20, false], [0.55, 0.12, 24, false],
  [0.55, 0.12, 28, false], [0.55, 0.12, 32, false],
  [0.55, 0.12, 36, false], [0.55, 0.12, 40, false], [0.55, 0.12, 44, false], [0.55, 0.14, 44, false], [0.55, 0.2, 56, false], [0.55, 0.2, 60, false],
  [0.55, 0.17, 12, false], [0.55, 0.14, 20, false], [0.55, 0.14, 24, false], [0.55, 0.14, 28, false], [0.55, 0.14, 32, false],
  [0.55, 0.14, 36, false], [0.55, 0.14, 40, false], [0.55, 0.2, 52, false],
  [0.55, 0.17, 16, true], [0.55, 0.17, 20, true], [0.55, 0.17, 24, true], [0.55, 0.17, 28, true], [0.55, 0.17, 32, true],
]
const FENCE: Array<[number, number, number, boolean]> = [
  [0.6, 0.17, 52, true],
  [0.50, 0.20, 16, true], [0.50, 0.17, 16, true], [0.55, 0.20, 8, true], [0.55, 0.20, 12, true],
  [0.60, 0.20, 4, true], [0.60, 0.17, 8, true], [0.60, 0.20, 8, true],
  [0.60, 0.12, 44, false], [0.60, 0.14, 48, false], [0.60, 0.12, 40, false],
  [0.65, 0.12, 16, false], [0.65, 0.12, 24, false], [0.65, 0.12, 32, false], [0.65, 0.14, 44, false],
]

// T1 — single-threshold classification, per anchor × per metric
const bestThreshold = (rows: Array<{ d: number; conf: boolean }>) => {
  const ds = [...new Set(rows.map(r => r.d))].sort((a, b) => a - b)
  let best = { t: 0, wrong: rows.length + 1 }
  for (let i = 0; i <= ds.length; i++) {
    const t = i === 0 ? ds[0] - 1e-6 : i === ds.length ? ds[ds.length - 1] + 1e-6 : (ds[i - 1] + ds[i]) / 2
    const wrong = rows.filter(r => (r.d <= t) !== r.conf).length
    if (wrong < best.wrong) best = { t, wrong }
  }
  return best
}
console.log('=== T1 — P1 marks (100): one helmlab threshold vs the 5-weight fitted gate (0/100) ===')
for (const [anchorName, anchor] of [['red SEED', RED_SEED], ['red CTA', RED_CTA]] as const) {
  for (const metric of ['difference', 'deltaE'] as const) {
    const rows = MARKS.map(([L, C, H, conf]) => ({ d: (hl as any)[metric](hx(L, C, H), anchor), conf }))
    const b = bestThreshold(rows)
    console.log(`  ${metric} vs ${anchorName}: best threshold ${b.t.toFixed(4)} -> ${b.wrong}/100 misclassified`)
    if (b.wrong <= 12) {
      for (const [L, C, H, conf] of MARKS) {
        const d = (hl as any)[metric](hx(L, C, H), anchor)
        if ((d <= b.t) !== conf) console.log(`     MISS H${H} C${C} L${L} d ${d.toFixed(4)} her=${conf ? 'conflict' : 'clear'}`)
      }
    }
  }
}

// T2 — P2 ladder marks: constant helmlab distance?
console.log('\n=== T2 — P2 "first truly different" marks: helmlab distance at the marked rung ===')
const LADDER: Array<[number, number, string, number]> = [
  [16, 0.18, 'up', 0.08], [28, 0.2, 'up', 0.10], [36, 0.2, 'up', 0.10], [36, 0.14, 'up', 0.02], [44, 0.17, 'up', 0.02],
  [16, 0.18, 'down', 0.02], [28, 0.2, 'down', 0.18], [36, 0.2, 'down', 0.18], [36, 0.14, 'down', 0.02],
]
const t2: number[] = []
for (const [H, C, dir, d] of LADDER) {
  const L = redCta.L + (dir === 'up' ? d : -d)
  const cand = hx(L, C, H)
  const dd = hl.difference(cand, RED_CTA)
  const de = hl.deltaE(cand, RED_CTA)
  t2.push(dd)
  console.log(`  H${H} C${C} ${dir} ${d.toFixed(2)}: difference ${dd.toFixed(4)} · deltaE ${de.toFixed(4)}`)
}
const mean = t2.reduce((a, b) => a + b, 0) / t2.length
const cv = Math.sqrt(t2.reduce((a, b) => a + (b - mean) ** 2, 0) / t2.length) / mean
console.log(`  difference: mean ${mean.toFixed(4)} · CV ${(cv * 100).toFixed(0)}% (constant would be small CV)`)

// T3 — the dark/light asymmetry: same raw dL both directions, helmlab distances
console.log('\n=== T3 — dark-persists asymmetry (her wDark .70 vs wLight 1.6 => light exits ~2.3x cheaper) ===')
for (const d of [0.06, 0.10, 0.14, 0.18]) {
  const up = hl.difference(hx(redCta.L + d, redCta.C, redCta.H), RED_CTA)
  const dn = hl.difference(hx(redCta.L - d, redCta.C, redCta.H), RED_CTA)
  console.log(`  dL ${d.toFixed(2)}: up ${up.toFixed(4)} · down ${dn.toFixed(4)} · up/down ${(up / dn).toFixed(2)} (her metric implies ~2.3)`)
}

// T4 — fence cells: does confidence flag them?
console.log('\n=== T4 — her on-the-fence cells: differenceWithConfidence (reliability) ===')
let fenceUnreliable = 0, hardReliable = 0, hardN = 0
for (const [L, C, H] of FENCE) {
  const c = hl.differenceWithConfidence(hx(L, C, H), RED_SEED)
  if (!c.reliable) fenceUnreliable++
}
for (const [L, C, H] of MARKS.slice(0, 40)) {
  const c = hl.differenceWithConfidence(hx(L, C, H), RED_SEED)
  hardN++
  if (c.reliable) hardReliable++
}
console.log(`  fence cells unreliable: ${fenceUnreliable}/${FENCE.length} · first-40 hard marks reliable: ${hardReliable}/${hardN}`)
console.log(`  (if fence ~unreliable while hard marks ~reliable, helmlab's noise model matches her hesitation)`)
