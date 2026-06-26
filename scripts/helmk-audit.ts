// ─────────────────────────────────────────────────────────────────────────────
// HELMHOLTZ–KOHLRAUSCH AUDIT  ·  Phase-A diagnostic (read-only, no engine change)
// ─────────────────────────────────────────────────────────────────────────────
//
// QUESTION: the engine pins each light stop at a fixed OKLCH L across every hue,
// then hand-corrects the hues that don't *look* right at that L — YELLOW_L_LIFT
// and the loudnessCap dips. Are those eyeballed constants approximating a real,
// measurable effect (Helmholtz–Kohlrausch: saturated colors appear lighter than
// their luminance), and do they push the ramp toward perceptually-equal lightness
// across hue, or fight it?
//
// METHOD: measure APPARENT lightness (not OKLCH L) across the hue wheel, two ways
// — NAIVE (stops pinned at the fixed OKLCH L, no corrections) vs CORRECTED (the
// real generateScale output). Two independent peer-reviewed predictors (Nayatani
// 1997, Fairchild–Pirrotta 1991) live in ./helmk-lib. Lower apparent-L SPREAD
// across hue = flatter perceived lightness = brands generate consistently.
//
// Run:  esbuild scripts/helmk-audit.ts --bundle --platform=node --outfile=dist/helmk-audit.js && node dist/helmk-audit.js
// ─────────────────────────────────────────────────────────────────────────────

import { clampChromaToGamut } from '../src/engine/constraints'
import { generateScale } from '../src/engine/colorEngine'
import { LIGHT_STOPS, LIGHT_BASE_C, YELLOW_L_LIFT } from '../src/engine/stopTable'
import { BRANDS } from '../src/brands'
import {
  nayataniApparentL, fairchildApparentL, baseLstar, oklchToHex, solveLForApparent,
  PREDICTORS, mean, spread, pearson, padN, pad, type Predictor,
} from './helmk-lib'

const f2 = (n: number) => n.toFixed(2)
const HUES = Array.from({ length: 24 }, (_, i) => i * 15)
const PROBE_L = 0.62, PROBE_C = 0.16 // a vivid mid brand — H-K bites hardest here

// One corrected ramp per hue (the real engine light stops 1–8).
const correctedRamps = HUES.map(H => {
  const scale = generateScale(oklchToHex(PROBE_L, PROBE_C, H), 'probe')
  return scale.light.slice(0, 8).map(s => ({ L: s.L, C: s.C, H: s.H }))
})

console.log('\n══════════════════════════════════════════════════════════════════════════')
console.log(' HELMHOLTZ–KOHLRAUSCH AUDIT — does fixed-OKLCH-L hold apparent lightness?')
console.log('══════════════════════════════════════════════════════════════════════════')
console.log(` Hue sweep: ${HUES.length} hues × 8 light stops · probe brand L${PROBE_L} C${PROBE_C}`)
console.log(' Apparent lightness in CIELAB L* units (0–100). SPREAD = max−min across hue.')
console.log(' Lower spread = flatter perceived lightness across hue = brands generate consistently.\n')

for (const { name, fn } of PREDICTORS) {
  console.log(`── ${name} ${'─'.repeat(60 - name.length)}`)
  console.log(`  stop  rootL   naiveSpread  corrSpread   Δ flatter   worst-naive-hue`)
  let totN = 0, totC = 0
  for (let i = 0; i < 8; i++) {
    const rootL = LIGHT_STOPS[i].rootL
    const naive = HUES.map(H => fn(rootL, clampChromaToGamut(rootL, LIGHT_BASE_C[i], H), H))
    const corr = HUES.map((H, k) => { const s = correctedRamps[k][i]; return fn(s.L, s.C, s.H) })
    const sN = spread(naive), sC = spread(corr)
    totN += sN; totC += sC
    const mN = mean(naive)
    const worstIdx = naive.map((v, k) => [Math.abs(v - mN), k] as [number, number]).sort((a, b) => b[0] - a[0])[0][1]
    const flatter = sN > 1e-6 ? `${(((sN - sC) / sN) * 100).toFixed(0).padStart(3)}%` : '  – '
    console.log(`   ${i + 1}    ${rootL.toFixed(3)}    ${padN(sN, 7)}     ${padN(sC, 7)}    ${flatter}        H${HUES[worstIdx]}°`)
  }
  console.log(`  ${pad('TOTAL', 14)}${padN(totN, 9)}     ${padN(totC, 7)}    ${(((totN - totC) / totN) * 100).toFixed(0)}% flatter overall\n`)
}

console.log('── Per-hue H-K boost at stop 8 (apparent − nominal L*, naive ramp) ───────────')
console.log('  Positive = looks LIGHTER than its L (needs darkening/chroma-cut to equalize).\n')
const rootL8 = LIGHT_STOPS[7].rootL
console.log('   hue    Nayatani  Fairchild   note')
for (const H of HUES) {
  const C = clampChromaToGamut(rootL8, LIGHT_BASE_C[7], H)
  const base = baseLstar(rootL8, C, H)
  let note = ''
  if (H >= 75 && H <= 105) note = '← YELLOW (YELLOW_L_LIFT centerH 92)'
  else if (H >= 255 && H <= 285) note = '← BLUE (loudnessCap dip 265°)'
  else if (H >= 330 || H <= 15) note = '← RED/MAGENTA (loudnessCap dip 345°)'
  console.log(`   ${String(H).padStart(3)}°   ${padN(nayataniApparentL(rootL8, C, H) - base, 7)}   ${padN(fairchildApparentL(rootL8, C, H) - base, 7)}    ${note}`)
}

console.log('\n── DERIVED correction at stop 8 — OKLCH-L shift to equalize apparent L* ───────')
console.log('  (Nayatani target = mean apparent-L across hue. + lighten / − darken.)\n')
const apprAbs = HUES.map(H => nayataniApparentL(rootL8, clampChromaToGamut(rootL8, LIGHT_BASE_C[7], H), H))
const targetA = mean(apprAbs)
console.log(`   target apparent-L* = ${f2(targetA)}   (naive range ${f2(Math.min(...apprAbs))}–${f2(Math.max(...apprAbs))})`)
console.log('   hue    apparentL*  ΔL needed   note')
for (let k = 0; k < HUES.length; k++) {
  const H = HUES[k]
  const dL = solveLForApparent(targetA, LIGHT_BASE_C[7], H, nayataniApparentL) - rootL8
  let note = ''
  if (H === 90) note = `← yellow; engine does YELLOW_L_LIFT = +${YELLOW_L_LIFT.max} (sign check!)`
  else if (H >= 255 && H <= 300) note = '← blue/violet'
  else if (H === 0 || H >= 330) note = '← red/magenta'
  console.log(`   ${String(H).padStart(3)}°    ${padN(apprAbs[k], 6)}    ${dL >= 0 ? '+' : ''}${dL.toFixed(3)}     ${note}`)
}

const allN: number[] = [], allF: number[] = []
for (let i = 0; i < 8; i++) {
  const rootL = LIGHT_STOPS[i].rootL
  for (const H of HUES) {
    const C = clampChromaToGamut(rootL, LIGHT_BASE_C[i], H)
    allN.push(nayataniApparentL(rootL, C, H) - baseLstar(rootL, C, H))
    allF.push(fairchildApparentL(rootL, C, H) - baseLstar(rootL, C, H))
  }
}
console.log('\n── Cross-model agreement ─────────────────────────────────────────────────────')
console.log(`  Nayatani-97 vs Fairchild-91 H-K boost, all stops × hues:  r = ${pearson(allN, allF).toFixed(3)}`)
console.log('  (r→1 = two independent peer-reviewed models agree on the per-hue shape.)')

console.log('\n── Real fleet: apparent-L boost of each brand\'s stop-8 (Nayatani) ────────────')
const fleet = BRANDS.filter(b => b.demo).slice(0, 12).map(b => {
  const s = generateScale(b.hex, b.slug).light[7]
  return { name: b.name, H: s.H, boost: nayataniApparentL(s.L, s.C, s.H) - baseLstar(s.L, s.C, s.H) }
}).sort((a, b) => b.boost - a.boost)
for (const f of fleet) console.log(`   ${pad(f.name, 18)} H${padN(f.H, 6, 0)}°   boost ${padN(f.boost, 6)} L*`)
console.log('')
