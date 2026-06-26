// Swatch data + 3-predictor agreement for the H-K curve (read-only analysis).
// Emits, per representative hue, the light ladder under three options:
//   today     — current engine output (eyeballed L placement)
//   moderate  — curve, target = today's mean apparent-L per stop (keep vibrancy)
//   strict    — curve, target = the gray ladder's apparent-L per stop (match neutral)
// Also prints the per-hue ΔL at stop 8 under Nayatani / Fairchild / HelmLab to
// confirm the curve is predictor-robust. Prints a JSON blob for the swatch widget.
//
// Run: esbuild scripts/helmk-swatch-data.ts --bundle --platform=node --outfile=dist/helmk-swatch-data.js && node dist/helmk-swatch-data.js

import { Helmlab } from 'helmlab'
import { clampChromaToGamut } from '../src/engine/constraints'
import { generateScale } from '../src/engine/colorEngine'
import { LIGHT_STOPS, LIGHT_BASE_C } from '../src/engine/stopTable'
import {
  nayataniApparentL, fairchildApparentL, solveLForApparent, oklchToHex, mean, padN,
  type Predictor,
} from './helmk-lib'

const hl = new Helmlab()
// HelmLab MetricSpace lightness (H-K embedded) as a predictor in OKLCH terms.
const helmlabApparentL: Predictor = (L, C, H) => hl.info(oklchToHex(L, C, H)).L

const PRED = nayataniApparentL // curve predictor (primary)
const HUES24 = Array.from({ length: 24 }, (_, i) => i * 15)

// Per-stop targets (constants, brand-independent).
const grayTarget = (i: number, p: Predictor) => p(LIGHT_STOPS[i].rootL, 0, 0)
const moderateTarget = (i: number) =>
  mean(HUES24.map(H => PRED(LIGHT_STOPS[i].rootL, clampChromaToGamut(LIGHT_STOPS[i].rootL, LIGHT_BASE_C[i], H), H)))

const PROBES = [
  { name: 'red', H: 25 }, { name: 'orange', H: 55 }, { name: 'yellow', H: 92 },
  { name: 'green', H: 150 }, { name: 'blue', H: 255 }, { name: 'violet', H: 290 },
]

// ── 3-predictor agreement at stop 8 (ΔL in OKLCH units) ──────────────────────
console.log('\n── Predictor robustness · ΔL at stop 8 to match the neutral ladder ───────────')
console.log('  If Nayatani / Fairchild / HelmLab agree on the per-hue ΔL, the curve is')
console.log('  not a bet on one model.\n')
console.log('   hue     Nayatani   Fairchild   HelmLab')
const rootL8 = LIGHT_STOPS[7].rootL, C8 = LIGHT_BASE_C[7]
for (const p of PROBES) {
  const dN = solveLForApparent(grayTarget(7, nayataniApparentL), C8, p.H, nayataniApparentL) - rootL8
  const dF = solveLForApparent(grayTarget(7, fairchildApparentL), C8, p.H, fairchildApparentL) - rootL8
  const dH = solveLForApparent(grayTarget(7, helmlabApparentL), C8, p.H, helmlabApparentL) - rootL8
  const s = (d: number) => `${d >= 0 ? '+' : ''}${d.toFixed(3)}`
  console.log(`   ${String(p.H).padStart(3)}° ${p.name.padEnd(7)} ${s(dN).padStart(7)}    ${s(dF).padStart(7)}    ${s(dH).padStart(7)}`)
}

// ── swatch ramps ─────────────────────────────────────────────────────────────
function ramps(H: number) {
  const today = generateScale(oklchToHex(0.62, 0.16, H), 'p').light.slice(0, 8).map(s => ({ L: s.L, C: s.C, H: s.H }))
  const reSolve = (tgt: (i: number) => number) =>
    today.map((s, i) => oklchToHex(solveLForApparent(tgt(i), s.C, s.H, PRED), s.C, s.H))
  return {
    today: today.map(s => oklchToHex(s.L, s.C, s.H)),
    moderate: reSolve(moderateTarget),
    strict: reSolve(i => grayTarget(i, PRED)),
  }
}
const data = PROBES.map(p => ({ name: p.name, H: p.H, ...ramps(p.H) }))

console.log('\n── SWATCH_JSON ───────────────────────────────────────────────────────────────')
console.log(JSON.stringify(data))
console.log('')
