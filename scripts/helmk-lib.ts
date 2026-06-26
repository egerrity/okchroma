// ─────────────────────────────────────────────────────────────────────────────
// Shared color-science helpers for the Helmholtz–Kohlrausch analysis scripts.
// READ-ONLY analysis — imports the engine's OKLCH/gamut primitives, adds the
// XYZ/CIELAB pipeline and two peer-reviewed H-K apparent-lightness predictors.
// No engine code changes; nothing here is imported by a build path.
// ─────────────────────────────────────────────────────────────────────────────
import { oklchToLinearRgb, clampChromaToGamut, wcagY } from '../src/engine/constraints'

const Xn = 0.95047, Yn = 1.0, Zn = 1.08883 // D65 2° white

export function oklchToXyz(L: number, C: number, H: number): [number, number, number] {
  const [r, g, b] = oklchToLinearRgb(L, C, H)
  const R = Math.max(0, r), G = Math.max(0, g), B = Math.max(0, b)
  return [
    0.4123907993 * R + 0.3575843394 * G + 0.1804807884 * B,
    0.2126390059 * R + 0.7151686788 * G + 0.0721923154 * B,
    0.0193308187 * R + 0.1191947798 * G + 0.9505321522 * B,
  ]
}
const labF = (t: number) => (t > (6 / 29) ** 3 ? Math.cbrt(t) : t / (3 * (6 / 29) ** 2) + 4 / 29)
export function xyzToLab(X: number, Y: number, Z: number) {
  const fx = labF(X / Xn), fy = labF(Y / Yn), fz = labF(Z / Zn)
  return { Lstar: 116 * fy - 16, C: Math.hypot(500 * (fx - fy), 200 * (fy - fz)), h: (Math.atan2(200 * (fy - fz), 500 * (fx - fy)) * 180) / Math.PI }
}
export const lstarFromY = (Y: number) => 116 * labF(Y / Yn) - 16
function xyzToUv(X: number, Y: number, Z: number): [number, number] {
  const d = X + 15 * Y + 3 * Z
  return d === 0 ? [0, 0] : [(4 * X) / d, (9 * Y) / d]
}

// ── Predictor 1: Nayatani 1997 (VCC/VAC blend) — coeffs from github.com/ilia3101/HKE
const La = 65
const K_Br = (0.2717 * (6.469 + 6.362 * La ** 0.4495)) / (6.469 + La ** 0.4495)
const nayQ = (t: number) =>
  -0.01585 - 0.03017 * Math.cos(t) - 0.04556 * Math.cos(2 * t) - 0.02667 * Math.cos(3 * t) -
  0.00295 * Math.cos(4 * t) + 0.14592 * Math.sin(t) + 0.05084 * Math.sin(2 * t) -
  0.0190 * Math.sin(3 * t) - 0.00764 * Math.sin(4 * t)
const WP: [number, number] = [0.31271, 0.32902]
const wpUv = xyzToUv(WP[0], WP[1], 1 - WP[0] - WP[1])
function gamma(X: number, Y: number, Z: number, kQ: number): number {
  const [u, v] = xyzToUv(X, Y, Z)
  const sUv = 13 * Math.hypot(u - wpUv[0], v - wpUv[1])
  return 0.4462 * (1 + (kQ * nayQ(Math.atan2(v - wpUv[1], u - wpUv[0])) + 0.0872 * K_Br) * sUv + 0.3086) ** 3
}
const GAMMA_WHITE = 0.5 * (gamma(WP[0], WP[1], 1 - WP[0] - WP[1], -0.866) + gamma(WP[0], WP[1], 1 - WP[0] - WP[1], -0.134))
export function nayataniApparentL(L: number, C: number, H: number): number {
  const [X, Y, Z] = oklchToXyz(L, C, H)
  return lstarFromY(Y * ((0.5 * (gamma(X, Y, Z, -0.866) + gamma(X, Y, Z, -0.134))) / GAMMA_WHITE))
}

// ── Predictor 2: Fairchild & Pirrotta 1991  L** = L* + (2.5−0.025L*)·f1(h)·C*ab
export function fairchildApparentL(L: number, C: number, H: number): number {
  const { Lstar, C: Cab, h } = xyzToLab(...oklchToXyz(L, C, H))
  const f1 = 0.116 * Math.abs(Math.sin((((h - 90) / 2) * Math.PI) / 180)) + 0.085
  return Lstar + (2.5 - 0.025 * Lstar) * f1 * Cab
}
export const baseLstar = (L: number, C: number, H: number) => xyzToLab(...oklchToXyz(L, C, H)).Lstar
// Perceived lightness of the achromatic (gray) ladder at lightness L — the
// neutral scale's lightness identity; the natural "everything should read here" target.
export const grayApparentL = (L: number) => lstarFromY(wcagY(L, 0, 0))

export type Predictor = (L: number, C: number, H: number) => number
export const PREDICTORS: { name: string; fn: Predictor }[] = [
  { name: 'Nayatani-97', fn: nayataniApparentL },
  { name: 'Fairchild-91', fn: fairchildApparentL },
]

// Solve the OKLCH L that lands a (chroma-intent, hue) stop on a target apparent
// lightness — chroma re-clamped to gamut at each candidate L. This is the curve:
// the per-hue L correction falls out of the predictor; nothing is hand-set.
export function solveLForApparent(target: number, cIntent: number, H: number, fn: Predictor): number {
  let lo = 0.20, hi = 0.999
  for (let i = 0; i < 34; i++) {
    const mid = (lo + hi) / 2
    fn(mid, clampChromaToGamut(mid, cIntent, H), H) < target ? (lo = mid) : (hi = mid)
  }
  return (lo + hi) / 2
}

export function oklchToHex(L: number, C: number, H: number): string {
  const [rl, gl, bl] = oklchToLinearRgb(L, clampChromaToGamut(L, C, H), H)
  const gm = (c: number) => { const v = Math.min(1, Math.max(0, c)); return v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055 }
  const ch = (v: number) => Math.round(gm(v) * 255).toString(16).padStart(2, '0')
  return `#${ch(rl)}${ch(gl)}${ch(bl)}`
}

// ── stats + formatting ───────────────────────────────────────────────────────
export const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length
export const spread = (a: number[]) => Math.max(...a) - Math.min(...a)
export const stdev = (a: number[]) => { const m = mean(a); return Math.sqrt(mean(a.map(x => (x - m) ** 2))) }
export function pearson(a: number[], b: number[]): number {
  const ma = mean(a), mb = mean(b)
  let n = 0, da = 0, db = 0
  for (let i = 0; i < a.length; i++) { n += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2 }
  return n / Math.sqrt(da * db || 1)
}
export const padN = (n: number, w: number, d = 2) => n.toFixed(d).padStart(w)
export const pad = (s: string, n: number) => s.padEnd(n)
