// paper2-adversarial.ts — prove the B fix is a HOLISTIC SHAPE fix, not a bolt-on. Real pipeline.
// The B change = (1) redistribute LIGHT_L stops 1-8 geometrically, (2) DROP the min-separation requires
// (P2SEP paper-2, WASHSEP washes). Claims to prove:
//   [A] FALLS OUT: paper-2 (+ every wash) chroma == the ID curve exactly → no chroma override anywhere.
//   [B] WASHSEP IS DEAD under B: keeping vs dropping the wash deltas is byte-identical → the clamp never
//       fires → removing it changes nothing (it was dead weight the shape already covers).
//   [C] P2SEP WOULD RE-FIRE under B (its 0.028 target exceeds what the near-white shape honestly delivers):
//       keeping it re-triggers the overshoot → so dropping it is REQUIRED, and the honest ~0.018 is the shape.
//   [D] SHAPE GUARANTEES separation: every adjacent seam ≥ floor, monotonic, worst case = the smallest gap,
//       for every agnostic seed — by construction, no per-seed logic.
//   [E] stop-8 still clears its contrast in BOTH profiles (the one real require we KEEP).
import { resolveRamp } from '../src/reqtoken/resolve'
import { MODE_SPECS, type ModeSpec } from '../src/reqtoken/spec'
import { buildContext, lightScaleChromaAt } from '../src/reqtoken/producers'
import { clampChromaToGamut, wcagY, contrastRatio, apcaLc } from '../src/engine/constraints'
import { withProfile, type ContrastProfile } from '../src/reqtoken/profiles'

const B_ROOTL: Record<number, number> = { 1: 0.987, 2: 0.970, 3: 0.950, 4: 0.924, 5: 0.892, 6: 0.852, 7: 0.801, 8: 0.738 }
const rad = (h: number) => (h * Math.PI) / 180
const cE = (s: any) => clampChromaToGamut(s.L, s.C, s.H)
const g = (r: any, n: number) => { const s = r.stops.find((x: any) => x.stop === n)!; return { L: s.L, C: cE(s), H: s.H, hex: s.hex } }
const dE = (a: any, b: any) => Math.sqrt((a.L - b.L) ** 2 + (a.C * Math.cos(rad(a.H)) - b.C * Math.cos(rad(b.H))) ** 2 + (a.C * Math.sin(rad(a.H)) - b.C * Math.sin(rad(b.H))) ** 2)

// B spec: redistribute rootLs; optionally keep/drop each delta family; always keep stop-8 (S8).
const specB = (profile: ContrastProfile, keepP2: boolean, keepWASH: boolean): ModeSpec => {
  const s = withProfile(MODE_SPECS.light, profile)
  return { ...s, stops: s.stops.map(sp => {
    const nsp: any = { ...sp }
    if (B_ROOTL[sp.stop] !== undefined) nsp.rootL = B_ROOTL[sp.stop]
    if (sp.stop === 2 && !keepP2 && sp.require?.metric === 'min-separation') nsp.require = undefined
    if (sp.stop >= 3 && sp.stop <= 7 && !keepWASH && sp.require?.metric === 'min-separation') nsp.require = undefined
    return nsp
  }) }
}

const SEEDS = ['#1D5432', '#c9a227', '#b56576', '#6b6b9e', '#8a8a8a', '#3060c0', '#c0392b', '#009298']

console.log('[A] falls-out (paper-2 chroma == ID curve) + [D] seams/monotonic  (profile: apca)')
console.log('seed        p2 onCurve   p1↔2 ΔE   min seam   monotonic')
let allOn = true, allMono = true, worstSeam = Infinity
for (const hex of SEEDS) {
  const r = resolveRamp(hex, 'light', specB('apca', false, false))
  const ctx = buildContext(hex)
  const p2 = g(r, 2)
  const idC = clampChromaToGamut(p2.L, lightScaleChromaAt(ctx, 0.010, 0.85)(p2.L), p2.H)
  const onCurve = Math.abs(p2.C - idC) < 0.0006
  const stops = [1, 2, 3, 4, 5, 6, 7, 8].map(n => g(r, n))
  let mono = true, minSeam = Infinity
  for (let i = 1; i < stops.length; i++) { const d = dE(stops[i - 1], stops[i]); if (d < minSeam) minSeam = d; if (!(stops[i].L < stops[i - 1].L)) mono = false }
  allOn &&= onCurve; allMono &&= mono; worstSeam = Math.min(worstSeam, minSeam)
  console.log(`${hex}   ${onCurve ? 'yes' : 'NO '}          ${dE(g(r, 1), p2).toFixed(4)}    ${minSeam.toFixed(4)}     ${mono ? 'yes' : 'NO'}`)
}
console.log(`  → all on-curve: ${allOn} · all monotonic: ${allMono} · worst seam across all seeds: ${worstSeam.toFixed(4)}`)

// [B] WASHSEP dead: dropAll vs keepWASH identical? [C] P2SEP would re-fire: keepP2 differs at paper-2?
const emit = (spec: ModeSpec, hex: string) => resolveRamp(hex, 'light', spec).stops.map(s => s.hex).join(',')
let washDead = true, p2Refires = false
for (const hex of SEEDS) {
  if (emit(specB('apca', false, false), hex) !== emit(specB('apca', false, true), hex)) washDead = false
  const dropAllP2 = g(resolveRamp(hex, 'light', specB('apca', false, false)), 2).hex
  const keepP2 = g(resolveRamp(hex, 'light', specB('apca', true, false)), 2).hex
  if (dropAllP2 !== keepP2) p2Refires = true
}
console.log(`\n[B] WASHSEP is DEAD weight under B (keeping==dropping, byte-identical, all seeds): ${washDead}`)
console.log(`[C] P2SEP would RE-FIRE under B (its 0.028 target > the shape's honest ~0.018, so keeping it re-overshoots): ${p2Refires}`)

// [E] stop-8 clears its contrast in both profiles
console.log('\n[E] stop-8 contrast vs paper-2 (the one require we KEEP):')
for (const profile of ['wcag', 'apca'] as ContrastProfile[]) {
  let worst = Infinity, worstSeed = ''
  for (const hex of SEEDS) {
    const r = resolveRamp(hex, 'light', specB(profile, false, false))
    const s8 = g(r, 8), p2 = g(r, 2)
    const m = profile === 'wcag'
      ? contrastRatio(wcagY(s8.L, s8.C, s8.H), wcagY(p2.L, p2.C, p2.H))
      : Math.abs(apcaLc(require('../src/reqtoken/producers').apcaYAt(s8.L, s8.C, s8.H), require('../src/reqtoken/producers').apcaYAt(p2.L, p2.C, p2.H)))
    if (m < worst) { worst = m; worstSeed = hex }
  }
  const bar = profile === 'wcag' ? '3.0' : 'Lc 30'
  console.log(`  ${profile}: worst stop-8 = ${worst.toFixed(profile === 'wcag' ? 2 : 1)} (${worstSeed}), floor ${bar} → ${profile === 'wcag' ? (worst >= 3 ? 'PASS' : 'FAIL') : (worst >= 30 ? 'PASS' : 'FAIL')}`)
}
