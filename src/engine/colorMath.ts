// colorMath.ts — leaf module: the engine's shared color math and producer constants, hoisted VERBATIM from
// colorEngine.ts so the requirement-token resolver and the engine can share one implementation without an
// import cycle (colorEngine → reqtoken/resolve → colorMath). No formula here may change without a parity
// dump (scripts/p3-parity-dump.ts, before/after byte-compare) proving the output is byte-identical.
import { clampChromaToGamut, oklchToLinearRgb, apcaLc, contrastRatio, wcagY, MASTER_GAMUT, type Gamut } from './constraints'
import { GOLD_SPINE, WARM_TORSION } from './stopTable'

function goldSpineHueTable(L: number): number {
  const pts = GOLD_SPINE
  if (L <= pts[0][0]) return pts[0][1]
  for (let i = 1; i < pts.length; i++) {
    if (L <= pts[i][0]) {
      const [l0, h0] = pts[i - 1]
      const [l1, h1] = pts[i]
      return h0 + ((h1 - h0) * (L - l0)) / (l1 - l0)
    }
  }
  return pts[pts.length - 1][1]
}

export function goldSpineHue(L: number): number {
  return goldSpineHueTable(L)
}

export function torsionedHue(brandH: number, stopL: number, anchorL: number, offPathG: number): number {
  const { bandLo, bandHi, taperDeg, travel, capDeg } = WARM_TORSION
  const w = Math.min(
    1,
    Math.max(0, (brandH - bandLo) / taperDeg),
    Math.max(0, (bandHi - brandH) / taperDeg)
  )
  if (w <= 0) return brandH
  const drift = travel * (goldSpineHue(stopL) - goldSpineHue(anchorL)) * w * offPathG
  return brandH + Math.max(-capDeg, Math.min(capDeg, drift))
}

export const SPINE_OFFPATH_SIGMA = 20

export const sigmoid = (x: number) => 1 / (1 + Math.exp(-x))
export const gauss = (x: number, sigma: number) => Math.exp(-0.5 * (x / sigma) ** 2)

export function hueDelta(h: number, center: number): number {
  let d = (h - center) % 360
  if (d > 180) d -= 360
  if (d < -180) d += 360
  return d
}

export const RED_TORSION_CENTER_H = 35.5
export const RED_TORSION_SOFTNESS = 3.5

export const RED_BAND_LO_H = 12

export const RED_BAND_LO_SOFTNESS = 2

export const VIVID_C = 0.13

export const HUE_NOISE_C = 0.008

export const MUTED_BLEND_DENOM = 0.55

export const CREAM_UPPER_H = 105
export const CREAM_UPPER_SOFTNESS = 5

export const DEEPER_BAND_H_LO = 55
export const DEEPER_BAND_H_HI = 100
export const DEEPER_BAND_H_SOFT = 4
export const DEEPER_BAND_U_LO = 0.10
export const DEEPER_BAND_U_HI = 0.70
export const DEEPER_BAND_U_SOFT = 0.015

export const DEEPER_STRENGTH = 0.85

export const RED_COOL_DEG = 10.8

export function redCoolWeight(brandH: number): number {
  return (
    sigmoid((brandH - RED_BAND_LO_H) / RED_BAND_LO_SOFTNESS) *
    (1 - sigmoid((brandH - RED_TORSION_CENTER_H) / RED_TORSION_SOFTNESS))
  )
}

export function inRedBand(h: number): boolean {
  return h > RED_BAND_LO_H && h <= RED_TORSION_CENTER_H
}

// The repel watershed = the red SIGNAL hue (signals.ts red, H 33.3) — not the torsion center
// 35.5. A brand at exactly the pivot exits cool (status quo tie-break).
export const RED_PIVOT_H = 33.3

// Warm-side falloff: full push at the watershed (nearest-exit), gone by ~H50. Mirrors the
// cool side's falloff shape (RED_TORSION_SOFTNESS register).
export const RED_WARM_EXIT_H = 44
export const RED_WARM_EXIT_SOFTNESS = 3.5

// The band where red-adjacency machinery (rung-1 / dark collider / cta render shift) is
// eligible. Upper edge = the measured re-conflict window (H29–41; 42+ recovers). Distinct
// from inRedBand, which keeps the signal-fidelity meaning (audits gate on it).
export const RED_REPEL_HI_H = 41.5
export function inRedRepelBand(h: number): boolean {
  return h > RED_BAND_LO_H && h <= RED_REPEL_HI_H
}

// Direction-aware red repel (owner directive 2026-07-07, CATALOG C6): the hue shift that
// separates a brand from the red signal exits by the NEAREST side. Cool of the pivot keeps
// the shipped cool curve byte-identical; warm of it the same magnitude pushes warmer
// ("tomato goes orange-er"), so a warm-of-red brand is never dragged THROUGH the signal.
//
// Near-pivot exit floor (owner directive 2026-07-07, CATALOG C7): the cool branch reuses
// the torsion fade, which sags to ~0.65 exactly at the pivot — the brands ON the signal
// hue got the weakest push (measured: dH0 light wash ΔE 0.003–0.005, under the 0.006 bar).
// The floor restores full exit strength approaching the pivot; below ~H30.5 the shipped
// curve wins the max and stays byte-identical. Ties at the pivot exit cool (owner rule).
export const RED_EXIT_FLOOR_H = 30.8
export const RED_EXIT_FLOOR_SOFTNESS = 0.9
export const RED_WARM_EXIT_FLOOR_H = 35.3
export const RED_WARM_EXIT_FLOOR_SOFTNESS = 0.8
// 14, not RED_COOL_DEG: the spine drift eats ~3° of the exit at the wash stops (sweep:
// a full 10.8 push lands dHueWash ≈ 9.4 — under the yardstick; 14 lands ≈ 12+, clearing
// the 0.006 bar at the pivot). Both floors fade into the shipped curves away from the
// pivot (cool of ~H31 / warm of ~H34.5 the shipped curve wins the max — unchanged).
export const RED_PIVOT_EXIT_DEG = 14

export function redRepelShiftDeg(brandH: number): number {
  if (brandH <= RED_PIVOT_H) {
    const shipped = RED_COOL_DEG * redCoolWeight(brandH)
    const floor = RED_PIVOT_EXIT_DEG * sigmoid((brandH - RED_EXIT_FLOOR_H) / RED_EXIT_FLOOR_SOFTNESS)
    return -Math.max(shipped, floor)
  }
  const shipped = RED_COOL_DEG * (1 - sigmoid((brandH - RED_WARM_EXIT_H) / RED_WARM_EXIT_SOFTNESS))
  const floor = RED_PIVOT_EXIT_DEG * (1 - sigmoid((brandH - RED_WARM_EXIT_FLOOR_H) / RED_WARM_EXIT_FLOOR_SOFTNESS))
  return Math.max(shipped, floor)
}

export function maxChromaAt(L: number, H: number, gamut: Gamut = MASTER_GAMUT): number {
  return clampChromaToGamut(L, 0.52, H, gamut)
}

export function hexToOklch(hex: string): { L: number; C: number; H: number } {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  const r = parseInt(full.slice(0, 2), 16) / 255
  const g = parseInt(full.slice(2, 4), 16) / 255
  const b = parseInt(full.slice(4, 6), 16) / 255
  const lin = (c: number) => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  const rl = lin(r), gl = lin(g), bl = lin(b)
  const lms_l = 0.4121656120 * rl + 0.5362752080 * gl + 0.0514575653 * bl
  const lms_m = 0.2118591070 * rl + 0.6807189584 * gl + 0.1074065790 * bl
  const lms_s = 0.0883097947 * rl + 0.2818474174 * gl + 0.6302613616 * bl
  const l_ = Math.cbrt(lms_l), m_ = Math.cbrt(lms_m), s_ = Math.cbrt(lms_s)
  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_
  const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_
  const bv = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_
  return { L, C: Math.sqrt(a * a + bv * bv), H: (Math.atan2(bv, a) * 180 / Math.PI + 360) % 360 }
}

export function oklchToSrgbUnclamped(L: number, C: number, H: number): { r: number; g: number; b: number } {
  const [rl, gl, bl] = oklchToLinearRgb(L, C, H)
  const gm = (c: number) => c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055
  return { r: gm(rl), g: gm(gl), b: gm(bl) }
}

export interface ColorStop {
  stop: number
  L: number
  C: number
  H: number
  r: number
  g: number
  b: number
}

export function applyChromaFloor(C: number, multiplier: number, stopIndex: number, floorStrength: number): number {
  const raw = C * multiplier
  if (floorStrength <= 0) return raw
  const floor = (0.02 + (0.04 - 0.02) * (stopIndex / 7)) * floorStrength
  return Math.max(raw, floor)
}

export const DARK_FLOOR_FULL_C = 0.022

export const DARK_FLOOR_MUTED_MAX_C = 0.04

// The master-gamut fork: chroma is clamped in the MASTER gamut. The r/g/b channels
// stay sRGB-encoded in Phase A (master = srgb, so they coincide); the render/emit
// channel split lands with the Phase-B flip (P3-DESIGN.md §4B).
export function makeStop(stop: number, L: number, C: number, H: number, gamut: Gamut = MASTER_GAMUT): ColorStop {
  const gamutC = clampChromaToGamut(L, C, H, gamut)
  const { r, g, b } = oklchToSrgbUnclamped(L, gamutC, H)
  return { stop, L, C: gamutC, H, r, g, b }
}

// The on-text pole. The PREFERENCE is perceptual (max-|APCA Lc| — which pole reads better) in
// both profiles; the FLOOR is the profile's law (owner 2026-07-04, the true wcag/apca split):
// under the wcag profile every CHOSEN pole must pass the 4.5 ratio — `ratioFloor` flips to the
// other pole when the preferred one fails (WCAG 4.5:1 has no dead zone, so the other pole
// always passes; fills never move). The apca profile carries no ratio floor — its law is the
// Lc bar (enforceLc re-solves enforced ctas; the highlight band clears Lc 60 by placement).
export function onTextIsWhite(Y: number, L: number, C: number, H: number, enforce: boolean, ratioFloor?: number, gamut: Gamut = MASTER_GAMUT): boolean {
  let white = Math.abs(apcaLc(1.0, Y)) >= Math.abs(apcaLc(0.0, Y))
  if (enforce) {
    if (white && contrastRatio(1.0, wcagY(L, C, H, gamut)) < 4.5) {
      if (contrastRatio(wcagY(L, C, H, gamut), 0) >= 4.5 && Math.abs(apcaLc(0.0, Y)) >= 45) white = false
    } else if (!white && contrastRatio(wcagY(L, C, H, gamut), 0) < 4.5) {
      if (contrastRatio(1.0, wcagY(L, C, H, gamut)) >= 4.5 && Math.abs(apcaLc(1.0, Y)) >= 45) white = true
    }
  }
  // the conformance floor: the chosen pole must PASS — legality overrides preference
  if (ratioFloor !== undefined) {
    const fillY = wcagY(L, C, H, gamut)
    const chosen = white ? contrastRatio(1.0, fillY) : contrastRatio(fillY, 0)
    if (chosen < ratioFloor) white = !white
  }
  return white
}
