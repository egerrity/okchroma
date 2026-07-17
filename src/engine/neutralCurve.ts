

import { LIGHT_L, DARK_L } from './stopTable'

export type NeutralLevel = 'pure' | 'default' | 'branded'

// SHAPE = the SUBTLE SECONDARY's chroma shape: the relative tint at each stop, sampled
// across lightness. Its x-axis is the shared stop-lightness scaffold (LIGHT_L / DARK_L),
// so SHAPE[i] is the tint at stop i+1's lightness. (Previously sampled over a separate,
// near-identical LANCHOR table; consolidated onto the scaffold 2026-06-29 — the two were
// the same axis.) The NEUTRAL rode this shape too until the 2026-07-17 tint round gave it
// its own declared curve (NEUTRAL_SHAPE below); the secondary keeps this one pending its
// own round. NOTE SHAPE.dark is vestigial for any ramp that delta-carries: dark chroma is
// the light twin's, carried verbatim (reqtoken/resolve.ts).
const SHAPE = {
  light: [0.108, 0.179, 0.253, 0.32, 0.45, 0.503, 0.599, 0.818, 1, 0.939, 0.841, 0.74],
  dark: [0.236, 0.229, 0.276, 0.394, 0.469, 0.551, 0.648, 0.859, 1, 0.94, 0.745, 0.195],
}

// PEAK = the SUBTLE SECONDARY's per-hue absolute tint ceiling (see peakC). The neutral no
// longer reads this table — it evens hues by salience instead (neutralTintPeak below).
const PEAK = [
  { h: 97, light: 0.0102, dark: 0.0109 },
  { h: 143, light: 0.0119, dark: 0.0181 },
  { h: 270, light: 0.0165, dark: 0.0156 },
  { h: 301, light: 0.0193, dark: 0.0172 },
]

const LEVEL: Record<NeutralLevel, number> = { pure: 0, default: 1, branded: 1.75 }

// ── THE NEUTRAL'S TINT CURVE (owner round 2026-07-17) ────────────────────────────────
// The neutral is a grey carrying a touch of the brand's hue. Two owner laws set its shape,
// and the shape it used to borrow from SHAPE broke both:
//   1. "add a bit more chroma to help differentiate" — the elevation planes (paper-1 …
//      wash-3) must separate from each other, so the tint LIFTS across them.
//   2. "the hue has to drop off as you get higher" — so it TAPERS through the highlight
//      and ink band, landing text ~neutral.
// The borrowed shape did the exact opposite: it rose monotonically to highlight-9 and was
// still near peak at the inks — least tint on the planes that needed separating, most where
// it should be clean. Measured cost: dark ink-11 burned ~32% of its available chroma room,
// so text carried a visible cast, while dark paper-1/2 sat at ~.002/.003 and read flat.
//
// ONE curve serves BOTH modes by construction: dark chroma is the light twin's chroma,
// carried verbatim (the delta carry, reqtoken/resolve.ts) — so this is the single place the
// neutral's tint is set, for the whole ramp, in both modes. That is also its price: one
// absolute chroma has to suit a near-white light paper AND a near-black dark paper; lifting
// the planes for dark necessarily tints the light papers by the same amount (owner-accepted
// 2026-07-17, having seen both ramps).
//
// NEUTRAL_SHAPE[i] pairs with LIGHT_L[i] / DARK_L[i] (stop i+1), as a share of the peak.
// One array for both modes — the carry makes a per-mode shape meaningless here.
const NEUTRAL_TINT_PEAK = 0.0095
const NEUTRAL_SHAPE = [
  0.474, // paper-1  ─┐
  0.684, // paper-2   │ the differentiation lift: tint grows with elevation
  0.895, // wash-3   ─┘
  1.000, // wash-4   ─┐ peak: the mid-wash band, the neutral's most-branded moment
  1.000, // wash-5   ─┘
  0.842, // wash-6   ─┐
  0.653, // wash-7    │
  0.505, // highlight-8
  0.400, // highlight-9   the drop-off: hue fades as you climb
  0.347, // (scaffold slot between highlight-9 and ink-10)
  0.295, // ink-10    │
  0.189, // ink-11   ─┘ text lands ~neutral
]

// Per-hue evening. Warm tint is far MORE salient on grey than cool at the SAME chroma — a
// blue-grey reads "clean", an orange-grey reads "dirty". So magnitude alone can never even
// them out, and measurement proved it: the PEAK table already handed amber the LEAST chroma
// of any hue and amber still read hottest (owner-caught). Damp the warm lobe (centred ~60°)
// so every brand's neutral reads equally neutral. Gamut clamping at emit is the hard backstop.
const warmDamp = (hue: number): number => {
  const h = ((hue % 360) + 360) % 360
  const d = Math.min(Math.abs(h - 60), 360 - Math.abs(h - 60))
  return 1 - 0.45 * Math.max(0, 1 - d / 140)
}
const neutralTintPeak = (hue: number): number => NEUTRAL_TINT_PEAK * warmDamp(hue)

const peakC = (hue: number, mode: 'light' | 'dark'): number => {
  const h = ((hue % 360) + 360) % 360
  const pts = PEAK.map(p => ({ h: p.h, c: p[mode] })).sort((a, b) => a.h - b.h)
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length]
    const span = (b.h - a.h + 360) % 360
    const off = (h - a.h + 360) % 360
    if (off <= span) return a.c + (b.c - a.c) * (off / span)
  }
  return mode === 'light' ? 0.0145 : 0.0155
}

// ONE interpolator, two declared shapes (the neutral's and the secondary's) — the shape is
// a parameter, not a second mechanism. Reads a shape off the stop-lightness scaffold and
// interpolates it at an arbitrary L, clamping to the end stops outside the scaffold's range
// (paper-0 sits outside it, so it takes paper-1's share).
const interpShapeAt = (L: number, mode: 'light' | 'dark', shape: number[]): number => {
  const pts = (mode === 'light' ? LIGHT_L : DARK_L).map((l, i) => ({ l, s: shape[i] })).sort((a, b) => a.l - b.l)
  if (L <= pts[0].l) return pts[0].s
  if (L >= pts[pts.length - 1].l) return pts[pts.length - 1].s
  for (let i = 0; i < pts.length - 1; i++) {
    if (L >= pts[i].l && L <= pts[i + 1].l) {
      const t = (L - pts[i].l) / (pts[i + 1].l - pts[i].l)
      return pts[i].s + (pts[i + 1].s - pts[i].s) * t
    }
  }
  return pts[pts.length - 1].s
}

export function neutralChromaCurve(
  brandH: number,
  level: NeutralLevel = 'default',
): (L: number, mode: 'light' | 'dark') => number {
  const mult = LEVEL[level]
  const peak = neutralTintPeak(brandH)
  return (L, mode) => mult * peak * interpShapeAt(L, mode, NEUTRAL_SHAPE)
}

// The SUBTLE SECONDARY (the neutral is "the secondary engine + a chroma clamp" —
// SECONDARY-PLAN §3): the secondary hue through the SHAPE/PEAK axis at a point above
// 'branded'. Candidate strengths for the owner's render sweep; the default is provisional
// until picked (scripts/secondary-sweep.ts → render/secondary.html).
// The neutral shared this axis until the 2026-07-17 tint round; the secondary deliberately
// stays on it (unchanged, byte-identical) — re-shaping it is its own owner round.
export const SUBTLE_SECONDARY_MULT = 4.5
export const SUBTLE_SECONDARY_MULT_CANDIDATES = [3, 4.5, 6]
export function subtleSecondaryChromaCurve(
  brandH: number,
  mult: number = SUBTLE_SECONDARY_MULT,
): (L: number, mode: 'light' | 'dark') => number {
  return (L, mode) => mult * peakC(brandH, mode) * interpShapeAt(L, mode, SHAPE[mode])
}
