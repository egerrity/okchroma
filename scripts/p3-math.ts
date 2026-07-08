// p3-math.ts — Display-P3 color math for the P3 master-gamut instruments (P3-DESIGN.md).
// INSTRUMENT-ONLY today: nothing in src/ imports this. It is also the reference
// implementation for the Phase-A gamut parameterization — the P3 branch of each of the
// four bakes (P3-DESIGN.md §2) matches a function here. The sRGB lane keeps the
// engine's existing expressions verbatim (measured: even "equivalent" matrix chains
// differ ~1e-4 XYZ / 8.3e-5 Y in-gamut — see §1d).
import { wcagY } from '../src/engine/constraints'

// OKLCH → cone response (cubed). Same expressions as constraints.oklchToLinearRgb's
// front half; duplicated here so the instrument never touches engine internals.
export function lms3(L: number, C: number, H: number): [number, number, number] {
  const h = (H * Math.PI) / 180
  const a = C * Math.cos(h), b = C * Math.sin(h)
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b
  return [l_ ** 3, m_ ** 3, s_ ** 3]
}

// OKLab M1⁻¹ (Ottosson): exact XYZ(D65), basis-free — valid for colors outside sRGB
// (no channel crush). Y row = true relative luminance for ANY gamut.
export function oklchToXyz(L: number, C: number, H: number): [number, number, number] {
  const [l3, m3, s3] = lms3(L, C, H)
  return [
    1.2270138511 * l3 - 0.5577999807 * m3 + 0.2812561490 * s3,
    -0.0405801784 * l3 + 1.1122568696 * m3 - 0.0716766787 * s3,
    -0.0763812845 * l3 - 0.4214819784 * m3 + 1.5861632204 * s3,
  ]
}
export const trueY = (L: number, C: number, H: number) => oklchToXyz(L, C, H)[1]

// XYZ(D65) → linear Display-P3
export function oklchToLinearP3(L: number, C: number, H: number): [number, number, number] {
  const [x, y, z] = oklchToXyz(L, C, H)
  return [
    2.4934969119 * x - 0.9313836179 * y - 0.4027107845 * z,
    -0.8294889696 * x + 1.7626640603 * y + 0.0236246858 * z,
    0.0358458302 * x - 0.0761723893 * y + 0.9568845240 * z,
  ]
}

// P3-cube chroma clamp — mirrors constraints.clampChromaToGamut (same epsilons, same
// 20-iteration bisection) against the P3 cube.
export function clampChromaToGamutP3(L: number, C: number, H: number): number {
  const inG = (c: number) => {
    const [r, g, b] = oklchToLinearP3(L, c, H)
    return r >= -1e-4 && r <= 1.0001 && g >= -1e-4 && g <= 1.0001 && b >= -1e-4 && b <= 1.0001
  }
  if (inG(C)) return C
  let lo = 0, hi = C
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2
    inG(mid) ? (lo = mid) : (hi = mid)
  }
  return lo
}
export const maxChromaAtP3 = (L: number, H: number) => clampChromaToGamutP3(L, 0.52, H)

// display-p3 uses the sRGB transfer curve
export const gmEnc = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.max(0, c) ** (1 / 2.4) - 0.055)

// APCA screen luminance, P3 basis (SAPC displayP3 coefficients, same ^2.4 soft clamp).
// NOTE (P3-DESIGN.md §1d): apcaY is basis-DEPENDENT — the same in-gamut color reads up
// to 0.0105 different through P3 vs sRGB primaries (≈1–1.5 Lc). Owner decision D2.
export function apcaYP3(L: number, C: number, H: number): number {
  const [r, g, b] = oklchToLinearP3(L, C, H)
  const ch = (c: number) => Math.min(1, Math.max(0, gmEnc(c))) ** 2.4
  return 0.2289829595 * ch(r) + 0.6917492626 * ch(g) + 0.0792677779 * ch(b)
}

// Nayatani H-K apparent lightness, P3 basis: exact-XYZ path (no sRGB crush) + P3 clamp.
// Constants verbatim from src/engine/perceptualL.ts.
const Yn = 1.0
const labF = (t: number) => (t > (6 / 29) ** 3 ? Math.cbrt(t) : t / (3 * (6 / 29) ** 2) + 4 / 29)
const lstarFromY = (Y: number) => 116 * labF(Y / Yn) - 16
function xyzToUv(X: number, Y: number, Z: number): [number, number] {
  const d = X + 15 * Y + 3 * Z
  return d === 0 ? [0, 0] : [(4 * X) / d, (9 * Y) / d]
}
const La = 65
const K_Br = (0.2717 * (6.469 + 6.362 * La ** 0.4495)) / (6.469 + La ** 0.4495)
const nayQ = (t: number) =>
  -0.01585 - 0.03017 * Math.cos(t) - 0.04556 * Math.cos(2 * t) - 0.02667 * Math.cos(3 * t) -
  0.00295 * Math.cos(4 * t) + 0.14592 * Math.sin(t) + 0.05084 * Math.sin(2 * t) -
  0.0190 * Math.sin(3 * t) - 0.00764 * Math.sin(4 * t)
const WP: [number, number] = [0.31271, 0.32902]
const wpUv = xyzToUv(WP[0], WP[1], 1 - WP[0] - WP[1])
function nayGamma(X: number, Y: number, Z: number, kQ: number): number {
  const [u, v] = xyzToUv(X, Y, Z)
  const sUv = 13 * Math.hypot(u - wpUv[0], v - wpUv[1])
  return 0.4462 * (1 + (kQ * nayQ(Math.atan2(v - wpUv[1], u - wpUv[0])) + 0.0872 * K_Br) * sUv + 0.3086) ** 3
}
const GAMMA_WHITE =
  0.5 * (nayGamma(WP[0], WP[1], 1 - WP[0] - WP[1], -0.866) + nayGamma(WP[0], WP[1], 1 - WP[0] - WP[1], -0.134))
export function apparentLP3(L: number, C: number, H: number): number {
  const [X, Y, Z] = oklchToXyz(L, C, H)
  return lstarFromY(Y * ((0.5 * (nayGamma(X, Y, Z, -0.866) + nayGamma(X, Y, Z, -0.134))) / GAMMA_WHITE))
}
export const grayApparentL = (L: number) => lstarFromY(wcagY(L, 0, 0))

export function solveLForApparentP3(target: number, C: number, H: number): number {
  let lo = 0.05, hi = 0.999
  for (let i = 0; i < 34; i++) {
    const m = (lo + hi) / 2
    apparentLP3(m, clampChromaToGamutP3(m, C, H), H) < target ? (lo = m) : (hi = m)
  }
  return (lo + hi) / 2
}
export function solveCForApparentP3(L: number, H: number, target: number): number {
  let lo = 0, hi = 0.4
  for (let i = 0; i < 32; i++) {
    const m = (lo + hi) / 2
    apparentLP3(L, clampChromaToGamutP3(L, m, H), H) < target ? (lo = m) : (hi = m)
  }
  return (lo + hi) / 2
}
const SWEEP = Array.from({ length: 18 }, (_, i) => i * 20)
export function meanBoostP3(rootL: number, C: number): number {
  const gray = grayApparentL(rootL)
  let s = 0
  for (const h of SWEEP) s += apparentLP3(rootL, clampChromaToGamutP3(rootL, C, h), h) - gray
  return s / SWEEP.length
}
export function perceptualRungLP3(rootL: number, C: number, H: number): number {
  return solveLForApparentP3(grayApparentL(rootL) + meanBoostP3(rootL, C), C, H)
}
export function perceptualDarkCP3(L: number, H: number, nativeC: number): number {
  if (nativeC <= 0) return 0
  return solveCForApparentP3(L, H, grayApparentL(L) + meanBoostP3(L, nativeC))
}
