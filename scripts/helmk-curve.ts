// ─────────────────────────────────────────────────────────────────────────────
// HELMHOLTZ–KOHLRAUSCH CURVE  ·  the per-hue fix, prototyped (read-only)
// ─────────────────────────────────────────────────────────────────────────────
//
// THE THING THE OWNER HAS BEEN ASKING FOR FOR TWO WEEKS: not point patches at
// 92°/265°/345°, but ONE continuous per-hue curve that places every stop at a
// constant *perceived* (Helmholtz–Kohlrausch-corrected) lightness — the lightness
// the neutral ladder reads at for that step. The per-hue L shift FALLS OUT of the
// predictor (Nayatani-97); nothing is hand-set. It is continuous over all 360°,
// it scales with chroma (so it auto-fades to ZERO for neutrals — no special case),
// and it would REPLACE YELLOW_L_LIFT + the loudnessCap lightness role with one
// principled function.
//
// This script PROVES three things and changes no engine code:
//   1. it flattens the perceived-lightness wave (spread → ~0 across hue),
//   2. it is one continuous, chroma-scaled curve (auto-fades for neutral),
//   3. it unifies the fleet — every brand's stop reads at the SAME perceived
//      lightness regardless of hue ("brands stop generating all over the place").
//
// Run:  esbuild scripts/helmk-curve.ts --bundle --platform=node --outfile=dist/helmk-curve.js && node dist/helmk-curve.js
// ─────────────────────────────────────────────────────────────────────────────

import { clampChromaToGamut } from '../src/engine/constraints'
import { generateScale } from '../src/engine/colorEngine'
import { LIGHT_STOPS, LIGHT_BASE_C } from '../src/engine/stopTable'
import { BRANDS } from '../src/brands'
import {
  nayataniApparentL, grayApparentL, solveLForApparent, oklchToHex,
  mean, spread, padN, pad,
} from './helmk-lib'

const fn = nayataniApparentL
const HUES = Array.from({ length: 24 }, (_, i) => i * 15)

// ── THE CURVE ────────────────────────────────────────────────────────────────
// target perceived lightness for a stop = what the GRAY ladder reads at that L
// (the scale's lightness identity). equalizedL solves the OKLCH L that lands a
// (chroma, hue) stop on that target — re-clamping chroma to gamut. That solve,
// swept over hue, IS the curve. No constants, no per-hue branches.
const target = (rootL: number) => grayApparentL(rootL)
const equalizedL = (rootL: number, C: number, H: number) => solveLForApparent(target(rootL), C, H, fn)
const apparentAt = (L: number, C: number, H: number) => fn(L, clampChromaToGamut(L, C, H), H)

console.log('\n══════════════════════════════════════════════════════════════════════════')
console.log(' HELMHOLTZ–KOHLRAUSCH CURVE — one continuous per-hue perceived-lightness fix')
console.log('══════════════════════════════════════════════════════════════════════════')
console.log(' Target per stop = the gray ladder\'s perceived lightness. The per-hue L shift')
console.log(' falls out of Nayatani-97. No hand-set constants; no per-hue branches.\n')

// ── PROOF 1: the wave flattens ───────────────────────────────────────────────
console.log('── PROOF 1 · perceived-lightness spread across hue: today vs the curve ───────')
console.log('  stop  rootL   grayTarget   todaySpread   curveSpread')
let tTot = 0, cTot = 0
for (let i = 0; i < 8; i++) {
  const rootL = LIGHT_STOPS[i].rootL, C = LIGHT_BASE_C[i]
  const today = HUES.map(H => apparentAt(rootL, C, H))
  const curve = HUES.map(H => apparentAt(equalizedL(rootL, C, H), C, H))
  tTot += spread(today); cTot += spread(curve)
  console.log(`   ${i + 1}    ${rootL.toFixed(3)}     ${padN(target(rootL), 6)}      ${padN(spread(today), 7)}      ${padN(spread(curve), 7)}`)
}
console.log(`  ${pad('TOTAL', 33)}${padN(tTot, 7)}      ${padN(cTot, 7)}   → wave ${(((tTot - cTot) / tTot) * 100).toFixed(0)}% flatter\n`)

// ── PROOF 2: one continuous, chroma-scaled curve (auto-fades for neutral) ─────
console.log('── PROOF 2 · the curve is continuous in hue AND auto-fades with chroma ───────')
console.log('  ΔL applied at stop 8, three chroma levels. Vivid moves; neutral barely does')
console.log('  (so the SAME function leaves the neutral ramp untouched — no special case).\n')
const rootL8 = LIGHT_STOPS[7].rootL
console.log('   hue     vivid C0.16   muted C0.04   neutral C0.008')
for (const H of HUES) {
  if (H % 30 !== 0) continue
  const dV = equalizedL(rootL8, 0.16, H) - rootL8
  const dM = equalizedL(rootL8, 0.04, H) - rootL8
  const dN = equalizedL(rootL8, 0.008, H) - rootL8
  const s = (d: number) => `${d >= 0 ? '+' : ''}${d.toFixed(3)}`
  console.log(`   ${String(H).padStart(3)}°      ${s(dV).padStart(7)}       ${s(dM).padStart(7)}       ${s(dN).padStart(7)}`)
}

// ── PROOF 3: the fleet stops generating all over the place ───────────────────
console.log('\n── PROOF 3 · fleet at accent-8: today every brand reads at a DIFFERENT ───────')
console.log('  perceived lightness; under the curve they all lock to the gray target.\n')
const tgt8 = target(rootL8)
const rows = BRANDS.filter(b => b.demo).slice(0, 12).map(b => {
  const s = generateScale(b.hex, b.slug).light[7] // today's accent-8 (incl. engine corrections)
  const todayA = fn(s.L, s.C, s.H)
  const Leq = solveLForApparent(tgt8, s.C, s.H, fn)
  return {
    name: b.name, H: s.H, todayA,
    eqA: apparentAt(Leq, s.C, s.H),
    before: oklchToHex(s.L, s.C, s.H), after: oklchToHex(Leq, s.C, s.H),
  }
}).sort((a, b) => a.todayA - b.todayA)
console.log('   brand               hue    today L*  → curve L*   hex before → after')
for (const r of rows) {
  console.log(`   ${pad(r.name, 18)} H${padN(r.H, 5, 0)}°   ${padN(r.todayA, 6)}  →  ${padN(r.eqA, 6)}    ${r.before} → ${r.after}`)
}
const todaySpread = spread(rows.map(r => r.todayA)), curveSpread = spread(rows.map(r => r.eqA))
console.log(`\n   cross-brand perceived-L spread:  today ${todaySpread.toFixed(2)} L*   →   curve ${curveSpread.toFixed(2)} L*`)
console.log(`   (today a ${rows[0].name} and a ${rows[rows.length - 1].name} accent-8 read ${todaySpread.toFixed(1)} L* apart;`)
console.log(`    under the curve they read the same. THAT is "brands stop generating all over the place".)`)

// ── chart feed: stop-8 today wave vs flat target (for the before/after viz) ───
console.log('\n── chart feed (stop 8) ───────────────────────────────────────────────────────')
const todayWave = HUES.map(H => +apparentAt(rootL8, LIGHT_BASE_C[7], H).toFixed(2))
console.log('  hues   =', JSON.stringify(HUES))
console.log('  today  =', JSON.stringify(todayWave))
console.log('  target =', +tgt8.toFixed(2), '(flat)')
console.log('')
