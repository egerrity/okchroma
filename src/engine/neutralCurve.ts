

export type NeutralLevel = 'pure' | 'default' | 'medium' | 'branded'

// ── TINT-CURVE CONTROL POINTS ──────────────────────────────────────────────────────────
// The tint curves are declared as their own (L, share) control points, one set per mode
// axis — they no longer borrow the stop scaffold arrays (decoupled 2026-08-05; the stop
// tables are stop-keyed in stopTable.ts and the retired scaffold slots live on only here,
// as the curve knees they always actually were). Values are the verbatim pairing of the
// former positional arrays: nothing moved, byte-identical by construction.
//
// SHAPE = the SUBTLE SECONDARY's chroma shape: the relative tint sampled across lightness.
// (The neutral rode this shape too until the 2026-07-17 tint round gave it its own curve,
// NEUTRAL_TINT_POINTS below; the secondary keeps this one pending its own round. The dark
// branch is vestigial for any ramp that delta-carries: dark chroma is the light twin's,
// carried verbatim — reqtoken/resolve.ts.)
type TintPoint = readonly [number, number] // [L, share]
const SHAPE_POINTS: Record<'light' | 'dark', readonly TintPoint[]> = {
  light: [
    [0.987, 0.108], [0.970, 0.179], [0.950, 0.253], [0.924, 0.32], [0.892, 0.45],
    [0.852, 0.503], [0.801, 0.599], [0.738, 0.818], [0.600, 1], [0.560, 0.939],
    [0.530, 0.841], [0.300, 0.74],
  ],
  dark: [
    [0.178, 0.236], [0.213, 0.229], [0.252, 0.276], [0.285, 0.394], [0.313, 0.469],
    [0.348, 0.551], [0.420, 0.648], [0.550, 0.859], [0.600, 1], [0.640, 0.94],
    [0.767, 0.745], [0.919, 0.195],
  ],
}

// PEAK = the SUBTLE SECONDARY's per-hue absolute tint ceiling (see peakC). The neutral no
// longer reads this table — it evens hues by salience instead (neutralTintPeak below).
const PEAK = [
  { h: 97, light: 0.0102, dark: 0.0109 },
  { h: 143, light: 0.0119, dark: 0.0181 },
  { h: 270, light: 0.0165, dark: 0.0156 },
  { h: 301, light: 0.0193, dark: 0.0172 },
]

// 'medium' is the pre-2026-08-11 default strength, kept as the middle rung; the owner's
// retune made the shipped default 25% quieter (0.75x of the same curve). Stored recipes
// and engine fallbacks say 'default' and adopt the new strength with no migration.
const LEVEL: Record<NeutralLevel, number> = { pure: 0, default: 0.75, medium: 1, branded: 1.75 }

// ── THE NEUTRAL'S TINT CURVE (owner round 2026-07-17) ────────────────────────────────
// The neutral is a grey carrying a touch of the brand's hue. Two owner laws set its shape,
// and the shape it used to borrow from SHAPE broke both:
//   1. "add a bit more chroma to help differentiate" — the elevation planes (paper-1 …
//      paper-3) must separate from each other, so the tint LIFTS across them.
//   2. "the hue has to drop off as you get higher" — so it TAPERS through the highlight
//      and ink band, landing text ~neutral.
// The borrowed shape did the exact opposite: it rose monotonically through the highlight
// band and was still near peak at the inks — least tint on the planes that needed
// separating, most where it should be clean. Measured cost: the dark strong ink burned
// ~32% of its available chroma room, so text carried a visible cast, while dark
// paper-1/2 sat at ~.002/.003 and read flat.
//
// ONE curve serves BOTH modes by construction: dark chroma is the light twin's chroma,
// carried verbatim (the delta carry, reqtoken/resolve.ts) — so this is the single place the
// neutral's tint is set, for the whole ramp, in both modes. That is also its price: one
// absolute chroma has to suit a near-white light paper AND a near-black dark paper; lifting
// the planes for dark necessarily tints the light papers by the same amount (owner-accepted
// 2026-07-17, having seen both ramps).
//
// Each point is (L on that mode's axis, share of the peak). The two mid-band knees at
// light L 0.600/0.560 (dark 0.600/0.640) are ex-scaffold positions of stops that no
// longer exist — kept as curve geometry, labeled as nothing else.
const NEUTRAL_TINT_PEAK = 0.0095
const NEUTRAL_TINT_POINTS: Record<'light' | 'dark', readonly TintPoint[]> = {
  light: [
    [0.987, 0.474], // paper-1  ─┐
    [0.970, 0.684], // paper-2   │ the differentiation lift: tint grows with elevation
    [0.950, 0.895], // paper-3  ─┘
    [0.924, 1.000], // wash-4   ─┐ peak: the mid-wash band, the neutral's most-branded moment
    [0.892, 1.000], // wash-5   ─┘
    [0.852, 0.842], // wash-6   ─┐
    [0.801, 0.653], // wash-7    │
    [0.738, 0.505], // highlight-8
    [0.600, 0.400], // knee (ex-scaffold)   the drop-off: hue fades as you climb
    [0.560, 0.347], // knee (ex-scaffold)
    [0.530, 0.295], // first text stop
    [0.300, 0.189], // strong text ─┘ lands ~neutral
  ],
  dark: [
    [0.178, 0.474], // paper-1
    [0.213, 0.684], // paper-2
    [0.252, 0.895], // paper-3
    [0.285, 1.000], // wash-4
    [0.313, 1.000], // wash-5
    [0.348, 0.842], // wash-6
    [0.420, 0.653], // wash-7
    [0.550, 0.505], // highlight-8
    [0.600, 0.400], // knee (ex-scaffold)
    [0.640, 0.347], // knee (ex-scaffold)
    [0.767, 0.295], // first text stop
    [0.919, 0.189], // strong text
  ],
}

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

// ONE interpolator, two declared point sets (the neutral's and the secondary's) — the
// points are a parameter, not a second mechanism. Interpolates a share at an arbitrary L,
// clamping to the end points outside the declared range (paper-0 sits outside it, so it
// takes paper-1's share).
const interpTintAt = (L: number, points: readonly TintPoint[]): number => {
  const pts = points.map(([l, s]) => ({ l, s })).sort((a, b) => a.l - b.l)
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
  return (L, mode) => mult * peak * interpTintAt(L, NEUTRAL_TINT_POINTS[mode])
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
  return (L, mode) => mult * peakC(brandH, mode) * interpTintAt(L, SHAPE_POINTS[mode])
}
