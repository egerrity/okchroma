// Perceptual-lightness placement for the SCALE rungs (Helmholtz–Kohlrausch).
// ─────────────────────────────────────────────────────────────────────────────
// OKLCH's L does not model the H-K effect: at equal L, saturated hues appear
// lighter (blue/violet/red bloom; yellow/green sit low). Holding L fixed across
// hue therefore does NOT hold *apparent* lightness, which is why the old engine
// hand-patched it (YELLOW_L_LIFT, the dark loudnessCap dips). This module makes
// the value FALL OUT instead: it places every scale rung at a derived perceived
// lightness, with the per-hue correction coming from a peer-reviewed H-K
// predictor (Nayatani 1997) rather than eyeballed constants.
//
//   LIGHT mode  — lightness is the free variable: solve L so the rung's apparent
//                 lightness hits a per-rung target (KEEP_LIGHT dials match-neutral
//                 ↔ keep-vibrancy). cta is NOT a rung and is never touched.
//   DARK mode   — lightness is the fixed DARK_NEUTRAL_L scaffold, so chroma is the
//                 free variable: solve C so the surface reads at consistent
//                 prominence on dark (the principled replacement for loudnessCap).
//
// The correction is chroma-proportional (H-K boost ∝ C^p), so it auto-fades to
// ~0 as chroma → 0 — neutrals need no special case. Coefficients for the
// predictor are Nayatani 1997 ("Simple Estimation Methods for the H-K Effect"),
// verbatim from the reference impl github.com/ilia3101/HKE; validated against
// Fairchild-Pirrotta 1991 (r≈0.81 on the per-hue shape) in scripts/helmk-audit.
// ─────────────────────────────────────────────────────────────────────────────
import { oklchToLinearRgb, clampChromaToGamut, wcagY } from './constraints'

// ── OKLCH → XYZ (D65) → CIELAB L* + CIE 1976 u'v' ────────────────────────────
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

// ── Nayatani 1997 apparent (equivalent-achromatic) lightness, in L* units ────
const La = 65
const K_Br = (0.2717 * (6.469 + 6.362 * La ** 0.4495)) / (6.469 + La ** 0.4495)
const nayQ = (t: number) =>
  -0.01585 - 0.03017 * Math.cos(t) - 0.04556 * Math.cos(2 * t) - 0.02667 * Math.cos(3 * t) -
  0.00295 * Math.cos(4 * t) + 0.14592 * Math.sin(t) + 0.05084 * Math.sin(2 * t) -
  0.0190 * Math.sin(3 * t) - 0.00764 * Math.sin(4 * t)
const WP: [number, number] = [0.31271, 0.32902] // D65
const wpUv = xyzToUv(WP[0], WP[1], 1 - WP[0] - WP[1])
function nayGamma(X: number, Y: number, Z: number, kQ: number): number {
  const [u, v] = xyzToUv(X, Y, Z)
  const sUv = 13 * Math.hypot(u - wpUv[0], v - wpUv[1])
  return 0.4462 * (1 + (kQ * nayQ(Math.atan2(v - wpUv[1], u - wpUv[0])) + 0.0872 * K_Br) * sUv + 0.3086) ** 3
}
const GAMMA_WHITE =
  0.5 * (nayGamma(WP[0], WP[1], 1 - WP[0] - WP[1], -0.866) + nayGamma(WP[0], WP[1], 1 - WP[0] - WP[1], -0.134))

// Apparent lightness of an OKLCH color (CIELAB L* units). > grayApparentL ⇒ the
// color reads lighter than a gray of equal OKLCH L (the H-K boost).
export function apparentL(L: number, C: number, H: number): number {
  const [X, Y, Z] = oklchToXyz(L, C, H)
  return lstarFromY(Y * ((0.5 * (nayGamma(X, Y, Z, -0.866) + nayGamma(X, Y, Z, -0.134))) / GAMMA_WHITE))
}
// Apparent lightness of the achromatic ladder at OKLCH lightness L — the
// scale's lightness identity and the equalization reference.
export const grayApparentL = (L: number) => lstarFromY(wcagY(L, 0, 0))

// ── Solvers (apparent lightness is monotone in both L and C) ──────────────────
// Free variable L: find the OKLCH L whose rung hits `target` apparent lightness.
export function solveLForApparent(target: number, C: number, H: number): number {
  let lo = 0.05, hi = 0.999
  for (let i = 0; i < 34; i++) {
    const m = (lo + hi) / 2
    apparentL(m, clampChromaToGamut(m, C, H), H) < target ? (lo = m) : (hi = m)
  }
  return (lo + hi) / 2
}
// Free variable C: find the chroma (at fixed L,H) whose surface hits `target`.
export function solveCForApparent(L: number, H: number, target: number): number {
  let lo = 0, hi = 0.4
  for (let i = 0; i < 32; i++) {
    const m = (lo + hi) / 2
    apparentL(L, clampChromaToGamut(L, m, H), H) < target ? (lo = m) : (hi = m)
  }
  return (lo + hi) / 2
}

// ── Targets ──────────────────────────────────────────────────────────────────
// The single tunable knob: how far to carry each rung from "match the neutral
// ladder" (0) toward "keep each color's own-chroma average brightness" (1).
// Default 1 = keep-vibrancy (the approved look); 0 = strict perceptual equality
// to gray. Both are FLAT across hue (the rung target never depends on H), which
// is what unifies the ladder; the knob only sets the level. Tunable live, then
// re-bless. (A future per-mode split is trivial — kept as two constants.)
export const KEEP_LIGHT = 1.0
export const KEEP_DARK = 1.0

const SWEEP = Array.from({ length: 18 }, (_, i) => i * 20) // 18-hue mean, memoized
const boostCache = new Map<string, number>()
// Mean H-K boost over the hue wheel at a given lightness + chroma — the
// "keep-vibrancy" allowance. Hue-independent ⇒ flattens the wave; ∝ chroma ⇒
// auto-fades for neutrals. Memoized by (L,C) since rungs/chromas repeat.
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
// surface mid-band (≈ stops 3–8): the deep darks keep their tint and the fill +
// text tiers (≥ fill L) keep their native chroma — so ink-11/ink-12 keep their
// separation. Mirrors the old loudnessCap bandWeight, now wrapping the principled
// solve instead of a hand-tuned cap.
const smoothstep = (x: number) => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t) }
const darkBandWeight = (L: number): number => {
  if (L <= 0.22) return 0
  if (L < 0.30) return smoothstep((L - 0.22) / 0.08)
  if (L <= 0.55) return 1
  if (L < 0.66) return 1 - smoothstep((L - 0.55) / 0.11)
  return 0
}

// DARK surface chroma redistribution — the principled replacement for the
// hand-tuned loudnessCap. `nativeC` is the brand's intended dark chroma at this
// stop (brandC · shape(L)). In the surface mid-band we hold its hue-AVERAGE
// prominence and redistribute per hue: solve C so the surface reads at
// gray + KEEP·meanBoost(L, nativeC). The bloom-prone hues (blue/violet/red) come
// down; the perceptually-quiet ones (yellow/green, which read grey today) come up
// — so every hue lands at the same prominence on dark. Self-scaling: meanBoost ∝
// nativeC, so muted brands stay muted and neutrals (nativeC→0) are untouched.
export function perceptualDarkC(L: number, H: number, nativeC: number, keep = KEEP_DARK): number {
  if (nativeC <= 0) return 0
  const w = darkBandWeight(L)
  if (w <= 0) return nativeC
  const solved = solveCForApparent(L, H, grayApparentL(L) + keep * meanBoost(L, nativeC))
  return nativeC + w * (solved - nativeC)
}
