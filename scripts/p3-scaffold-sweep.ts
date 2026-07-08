// p3-scaffold-sweep.ts — P3 master-gamut kickoff instrument (P3-DESIGN.md §1c).
// H-K scaffold movement under P3: perceptualRungL and perceptualDarkC compared between
// (a) the shipped sRGB basis (engine functions, verbatim) and (b) the P3 basis
// (exact OKLab→XYZ + P3 clamp, scripts/p3-math.ts). The rung solves clamp candidate
// chroma to the gamut INSIDE the solve, so the master-gamut switch moves the scaffold —
// this instrument measures how far, per (rootL, C, hue).
// Run: esbuild scripts/p3-scaffold-sweep.ts --bundle --platform=node --outfile=dist/p3-scaffold-sweep.js && node dist/p3-scaffold-sweep.js
import { clampChromaToGamut } from '../src/engine/constraints'
import { apparentL as apparentLShipped, perceptualRungL as rungShipped, perceptualDarkC as darkCShipped, grayApparentL } from '../src/engine/perceptualL'
import { apparentLP3, clampChromaToGamutP3, meanBoostP3, perceptualRungLP3, perceptualDarkCP3 } from './p3-math'

const SWEEP = Array.from({ length: 18 }, (_, i) => i * 20)
function meanBoostShipped(rootL: number, C: number): number {
  const gray = grayApparentL(rootL)
  let s = 0
  for (const h of SWEEP) s += apparentLShipped(rootL, clampChromaToGamut(rootL, C, h), h) - gray
  return s / SWEEP.length
}

const f = (n: number, d = 4) => n.toFixed(d)

// sanity: in-gamut apparentL basis agreement (exact-XYZ vs composed sRGB-matrix path).
// Expected ≤ ~0.13 ΔL* (published-matrix rounding, ≤7.1e-4 XYZ) — sub-perceptual but
// NOT byte-identical: the reason Phase A keeps the sRGB expressions verbatim.
console.log('══ sanity: apparentL basis diff (in-sRGB-gamut, ΔL* units) ══')
let mx = 0, mxHi = 0
for (let H = 0; H < 360; H += 15) for (const L of [0.3, 0.5, 0.7, 0.9]) {
  for (const C of [0.01, 0.03, 0.06]) {
    const d = Math.abs(apparentLP3(L, C, H) - apparentLShipped(L, C, H))
    mx = Math.max(mx, d)
  }
  const cHi = clampChromaToGamut(L, 0.52, H) * 0.98
  mxHi = Math.max(mxHi, Math.abs(apparentLP3(L, cHi, H) - apparentLShipped(L, cHi, H)))
}
console.log(`max ΔapparentL* wash chroma (C≤0.06): ${f(mx)}   near sRGB boundary: ${f(mxHi)}`)

console.log('\n══ meanBoost shipped(sRGB) vs P3 by (rootL, C) — L* units ══')
console.log('rootL | C | boost sRGB | boost P3 | Δ')
for (const rootL of [0.25, 0.40, 0.55, 0.66, 0.75, 0.85, 0.95]) {
  for (const C of [0.02, 0.05, 0.09, 0.13, 0.17]) {
    const a = meanBoostShipped(rootL, C), b = meanBoostP3(rootL, C)
    if (Math.abs(b - a) > 0.005) console.log(`${f(rootL, 2)} | ${f(C, 2)} | ${f(a, 3)} | ${f(b, 3)} | ${f(b - a, 3)}`)
  }
}

console.log('\n══ perceptualRungL shipped vs P3 — ΔL (OKLCH L units) ══')
console.log('rootL | C | hue | L sRGB | L P3 | ΔL   (worst hue of the probe set per cell)')
const hues = [30, 85, 150, 250, 330]
for (const rootL of [0.40, 0.55, 0.66, 0.75, 0.85, 0.95]) {
  for (const C of [0.02, 0.06, 0.13, 0.17]) {
    let worst = { h: 0, a: 0, b: 0 }
    for (const h of hues) {
      const a = rungShipped(rootL, C, h), b = perceptualRungLP3(rootL, C, h)
      if (Math.abs(b - a) > Math.abs(worst.b - worst.a)) worst = { h, a, b }
    }
    const d = worst.b - worst.a
    if (Math.abs(d) > 0.0005)
      console.log(`${f(rootL, 2)} | ${f(C, 2)} | H${worst.h} | ${f(worst.a)} | ${f(worst.b)} | ${d >= 0 ? '+' : ''}${f(d)}`)
  }
}

console.log('\n══ perceptualDarkC shipped vs P3 — ΔC ══')
console.log('L | hue | nativeC | C sRGB | C P3 | ΔC   (0.4000 = solve saturated at the search cap)')
for (const L of [0.20, 0.30, 0.40, 0.55]) {
  for (const h of [30, 60, 85, 150, 250, 330]) {
    for (const nc of [0.05, 0.10, 0.15]) {
      const a = darkCShipped(L, h, nc), b = perceptualDarkCP3(L, h, nc)
      if (Math.abs(b - a) > 0.004)
        console.log(`${f(L, 2)} | H${h} | ${f(nc, 2)} | ${f(a)} | ${f(b)} | ${b - a >= 0 ? '+' : ''}${f(b - a)}`)
    }
  }
}
console.log('\n(rows shown only where the delta clears noise thresholds)')
