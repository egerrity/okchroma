// p2.ts — P2, the "truly different SIDE BY SIDE" metric (C12 two-problem design, owner 2026-07-10).
//
// Distinct from the P1 gate (redGateDist, colorMath.ts): P1 answers "could this be MISTAKEN
// for the red signal at a glance" — a CATEGORY her 100 raw-pair marks define (0/100 fit). P2
// answers "do these two read distinct when adjacent" — a perceptual DISTANCE. Her 9 flush-strip
// delivery marks sit at one radius in helmlab MetricSpace (mean .116, CV 12%; the metric's
// COMBVD training task is literally adjacent-pair judgment). Neither metric can do the other's
// job (research record: docs/engine-spec/c12-archive/helmlab-collision-research.md). Runtime helmlab use
// owner-cleared 2026-07-10 ("we can use helmlab for collisions … they pass here").
import { Helmlab } from 'helmlab'
import { clampChromaToGamut, oklchToLinearRgb } from './constraints'

// Delivery bars — how far a treated cta must sit from red (and a red variant from its brand).
export const P2_D = 0.12           // down exits + variants (her down-marks: .126/.128/.133)
// UP exits deliver to her up-mark mean (.112) — NOT the dark-persists asymmetry (that is
// categorical and already lives in the gate's weights) but dead-zone geometry: the apca
// text dead zone starts ~L0.70 and a .12-up delivery would land past it (no passing pole).
export const P2_D_UP = 0.11
export const P2_D_FALLBACK = 0.115 // her mean mark — variant fallback when the domain traps

// helmlab judges sRGB hexes — the same rendition all of her calibration pages showed.
const gm = (v: number) => { const x = Math.min(1, Math.max(0, v)); return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055 }
const hexOf = (L: number, C: number, H: number): string => {
  const [r, g, b] = oklchToLinearRgb(L, clampChromaToGamut(L, C, H), H)
  const ch = (v: number) => Math.round(gm(v) * 255).toString(16).padStart(2, '0')
  return `#${ch(r)}${ch(g)}${ch(b)}`
}
const hl = new Helmlab()
export function p2Diff(a: { L: number; C: number; H: number }, b: { L: number; C: number; H: number }): number {
  return hl.difference(hexOf(a.L, a.C, a.H), hexOf(b.L, b.C, b.H))
}
