// Phase A — derive the warm path from the gamut surface (plan doc §5).
// The generator: P(L) = chroma-room-weighted hue centroid inside the warm
// family window, with sharpening exponent k:
//
//     P(L) = Σ H · C(L,H)^k  /  Σ C(L,H)^k     over H ∈ [LO, HI]
//
// Three named dials, all fit here against the hand-fitted GOLD_SPINE:
//   LO  warm-family lower bound (how red the dark landing may get)
//   HI  warm-family upper bound (how green papers may get)
//   k   room-vs-identity exchange: k→∞ chases the vividest hue (argmax),
//       k→0 ignores room and sits at the window center
//
// Output: best-fit dials, derived-vs-fitted overlay with residuals
// (overall + at the L values the engine actually evaluates), a room-
// surface diagnostic (where the red/yellow "mountains" and the mid-L
// valley sit), and the same generator run on the green and blue families
// — the dark-mode future where there is no Radix to fit. Read-only.

import { clampChromaToGamut } from '../src/engine/constraints'
import { GOLD_SPINE } from '../src/engine/stopTable'

const maxChromaAt = (L: number, H: number) => clampChromaToGamut(L, 0.52, H)

function spineAt(L: number): number {
  const pts = GOLD_SPINE
  if (L <= pts[0][0]) return pts[0][1]
  for (let i = 1; i < pts.length; i++)
    if (L <= pts[i][0]) {
      const [l0, h0] = pts[i - 1]
      const [l1, h1] = pts[i]
      return h0 + ((h1 - h0) * (L - l0)) / (l1 - l0)
    }
  return pts[pts.length - 1][1]
}

// ── room surface (computed once) ─────────────────────────────────────────────
const L_LO = 0.18
const L_HI = 0.99
const L_STEP = 0.01
const H_LO = 20
const H_HI = 145
const H_STEP = 0.25
const Ls: number[] = []
for (let L = L_LO; L <= L_HI + 1e-9; L += L_STEP) Ls.push(Number(L.toFixed(2)))
const Hs: number[] = []
for (let H = H_LO; H <= H_HI + 1e-9; H += H_STEP) Hs.push(H)
const room: number[][] = Ls.map(L => Hs.map(H => maxChromaAt(L, H)))

// ── generator ────────────────────────────────────────────────────────────────
function derivedPath(lo: number, hi: number, k: number): number[] {
  return Ls.map((_, li) => {
    let wSum = 0
    let whSum = 0
    for (let hi2 = 0; hi2 < Hs.length; hi2++) {
      const H = Hs[hi2]
      if (H < lo || H > hi) continue
      const w = room[li][hi2] ** k
      wSum += w
      whSum += w * H
    }
    return whSum / wSum
  })
}

// ── fit dials to GOLD_SPINE ──────────────────────────────────────────────────
const spineVals = Ls.map(spineAt)
function rms(path: number[]): number {
  let s = 0
  for (let i = 0; i < path.length; i++) s += (path[i] - spineVals[i]) ** 2
  return Math.sqrt(s / path.length)
}

let best = { lo: 0, hi: 0, k: 0, rms: Infinity }
for (let lo = 32; lo <= 58; lo += 1)
  for (let hi = 100; hi <= 140; hi += 1)
    for (const k of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12]) {
      const e = rms(derivedPath(lo, hi, k))
      if (e < best.rms) best = { lo, hi, k, rms: e }
    }

const path = derivedPath(best.lo, best.hi, best.k)
console.log(
  `── best fit: LO ${best.lo}  HI ${best.hi}  k ${best.k}  → RMS ${best.rms.toFixed(2)}° vs GOLD_SPINE ──`
)

// overlay + residuals
console.log('\nL      derived  spine   Δ      | room@derived  room@spine  inband-argmaxH  inband-minH')
for (let i = 0; i < Ls.length; i += 4) {
  const L = Ls[i]
  let amH = 0
  let amC = 0
  let mnH = 0
  let mnC = Infinity
  for (let hi2 = 0; hi2 < Hs.length; hi2++) {
    const H = Hs[hi2]
    if (H < best.lo || H > best.hi) continue
    const c = room[i][hi2]
    if (c > amC) {
      amC = c
      amH = H
    }
    if (c < mnC) {
      mnC = c
      mnH = H
    }
  }
  console.log(
    `${L.toFixed(2)}   ${path[i].toFixed(1).padStart(6)}  ${spineVals[i].toFixed(1).padStart(5)}  ${(path[i] - spineVals[i]).toFixed(1).padStart(5)}  | ${maxChromaAt(L, path[i]).toFixed(3).padStart(11)}  ${maxChromaAt(L, spineVals[i]).toFixed(3).padStart(10)}  ${amH.toFixed(0).padStart(13)}  ${mnH.toFixed(0).padStart(10)}`
  )
}

// residuals where the engine actually evaluates the spine
const ENGINE_LS = [
  ['light 1–3 papers', [0.993, 0.982, 0.96]],
  ['light 4–8', [0.936, 0.903, 0.86, 0.806, 0.738]],
  ['light 11/12 roots', [0.53, 0.3]],
  ['dark roots 1–8', [0.18, 0.21, 0.245, 0.28, 0.315, 0.355, 0.41, 0.48]],
  ['dark 11/12', [0.75, 0.94]],
] as Array<[string, number[]]>
const pathAt = (L: number): number => {
  const Lc = Math.min(L_HI, Math.max(L_LO, L))
  const i = Math.min(Ls.length - 1, Math.round((Lc - L_LO) / L_STEP))
  return path[i]
}
console.log('\nresiduals at engine evaluation points (derived − spine):')
for (const [label, list] of ENGINE_LS) {
  const ds = list.map(L => pathAt(L) - spineAt(L))
  const worst = ds.reduce((a, b) => (Math.abs(b) > Math.abs(a) ? b : a), 0)
  console.log(
    `   ${label.padEnd(18)} ${ds.map(d => d.toFixed(1).padStart(6)).join(' ')}   worst ${worst.toFixed(1)}°`
  )
}

// ── generalization: same generator, no Radix to fit ──────────────────────────
console.log('\n── same generator on other families (dark-mode future; nothing fitted) ──')
for (const [name, lo, hi] of [
  ['green', 125, 165],
  ['blue', 230, 280],
] as Array<[string, number, number]>) {
  // green/blue hues are outside the precomputed H window — compute directly
  const vals: string[] = []
  for (const L of [0.25, 0.4, 0.55, 0.7, 0.85, 0.97]) {
    let wSum = 0
    let whSum = 0
    for (let H = lo; H <= hi; H += 0.5) {
      const w = maxChromaAt(L, H) ** best.k
      wSum += w
      whSum += w * H
    }
    vals.push(`L${L} → H ${(whSum / wSum).toFixed(0)}`)
  }
  console.log(`   ${name.padEnd(6)} [${lo},${hi}] k=${best.k}: ${vals.join('   ')}`)
}
