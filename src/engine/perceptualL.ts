

import { oklchToLinearRgb, clampChromaToGamut, wcagY } from './constraints'

const Xn = 0.95047, Yn = 1.0, Zn = 1.08883
function oklchToXyz(L: number, C: number, H: number): [number, number, number] {
  const [r, g, b] = oklchToLinearRgb(L, C, H)
  const R = Math.max(0, r), G = Math.max(0, g), B = Math.max(0, b)
  return [
    0.4123907993 * R + 0.3575843394 * G + 0.1804807884 * B,
    0.2126390059 * R + 0.7151686788 * G + 0.0721923154 * B,
    0.0193308187 * R + 0.1191947798 * G + 0.9505321522 * B,
  ]
}
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

export function apparentL(L: number, C: number, H: number): number {
  const [X, Y, Z] = oklchToXyz(L, C, H)
  return lstarFromY(Y * ((0.5 * (nayGamma(X, Y, Z, -0.866) + nayGamma(X, Y, Z, -0.134))) / GAMMA_WHITE))
}

export const grayApparentL = (L: number) => lstarFromY(wcagY(L, 0, 0))

export function solveLForApparent(target: number, C: number, H: number): number {
  let lo = 0.05, hi = 0.999
  for (let i = 0; i < 34; i++) {
    const m = (lo + hi) / 2
    apparentL(m, clampChromaToGamut(m, C, H), H) < target ? (lo = m) : (hi = m)
  }
  return (lo + hi) / 2
}

export function solveCForApparent(L: number, H: number, target: number): number {
  let lo = 0, hi = 0.4
  for (let i = 0; i < 32; i++) {
    const m = (lo + hi) / 2
    apparentL(L, clampChromaToGamut(L, m, H), H) < target ? (lo = m) : (hi = m)
  }
  return (lo + hi) / 2
}

export const KEEP_LIGHT = 1.0
export const KEEP_DARK = 1.0

const SWEEP = Array.from({ length: 18 }, (_, i) => i * 20)
const boostCache = new Map<string, number>()

function meanBoost(rootL: number, C: number): number {
  const key = `${rootL.toFixed(4)}|${C.toFixed(4)}`
  const hit = boostCache.get(key)
  if (hit !== undefined) return hit
  const gray = grayApparentL(rootL)
  let s = 0
  for (const h of SWEEP) s += apparentL(rootL, clampChromaToGamut(rootL, C, h), h) - gray
  const v = s / SWEEP.length
  boostCache.set(key, v)
  return v
}

// LIGHT rung target lightness: solve L so apparent = gray + KEEP·meanBoost. C/H
// are the rung's own (already-derived) chroma/hue.
export function perceptualRungL(rootL: number, C: number, H: number, keep = KEEP_LIGHT): number {
  return solveLForApparent(grayApparentL(rootL) + keep * meanBoost(rootL, C), C, H)
}

// Bloom is a MID-lightness effect, so the redistribution is band-limited to the
// scale mid-band (≈ stops 3–8): the deep darks keep their tint and the fill +
// text tiers (≥ fill L) keep their native chroma — so ink-11/ink-12 keep their
// separation. Mirrors the old loudnessCap bandWeight, now wrapping the principled
// solve instead of a hand-tuned cap.
export function perceptualDarkC(L: number, H: number, nativeC: number, keep = KEEP_DARK): number {
  if (nativeC <= 0) return 0
  return solveCForApparent(L, H, grayApparentL(L) + keep * meanBoost(L, nativeC))
}
