// Dark CHROMA curve. The lightness is the fixed DARK_NEUTRAL_L scaffold, so this
// sets only chroma. Two pieces:
//
//   nativeC(L) = max( brandC · shape(L),  floorFracAt(L) · ctaC )   — the brand's
//               intended dark chroma: a per-stop dark chroma shape (deep stops
//               bumped for dark legibility; rises across surfaces, peaks at the
//               fill, collapses at text) with an identity-proportional deep-surface
//               floor so the app/subtle backgrounds don't wash to grey.
//   C(L,H)    = perceptualDarkC(L, H, nativeC)   — the per-hue REDISTRIBUTION that
//               replaces the old hand-tuned loudnessCap: it holds nativeC's hue-
//               average prominence and solves chroma per hue so every hue reads at
//               the same prominence on dark (bloom-prone blue/violet/red come down,
//               perceptually-quiet yellow/green come up — fixing the "reads grey"
//               surfaces). Falls out of the H-K predictor; no per-hue constants.
//
// The cta is NOT a surface — darkCtaTrim (below) is unchanged, so the dark cta and
// its #869cda canary are untouched. ctaC omitted ⇒ no floor. gamut-clamped by makeStop.

import { DARK_NEUTRAL_L } from './stopTable'
import { perceptualDarkC } from './perceptualL'

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const rad = (d: number) => (d * Math.PI) / 180
const norm = (h: number) => ((h % 360) + 360) % 360
const smoothstep = (x: number) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t) }
const angDist = (h: number, c: number) => Math.abs((((h - c + 540) % 360)) - 180)
const lobe = (h: number, c: number, w: number) => Math.pow(Math.max(0, Math.cos(rad((90 * angDist(h, c)) / w))), 1.5)

// Normalized per-stop dark chroma shape (fill stop 9 = 1.0), deep stops bumped
// for dark legibility. Rises across the surfaces, peaks at the fill, collapses at
// text. Deep stops 1–2 nudged up from the raw grand-mean (0.097/0.127) so the
// app-bg / subtle-bg carry a touch more brand tint (they were reading slightly grey).
const SHAPE_DARK = [0.125, 0.16, 0.305, 0.429, 0.483, 0.522, 0.57, 0.674, 1, 0.94, 0.745, 0.2]

const GLOBAL_TRIM = 0.76   // CIECAM02 dark-surround colorfulness trim
const BLUE_DEPTH = 0.30    // blue/violet (~265°) trough depth
const REDMAG_DEPTH = 0.26  // red/magenta (~345°) trough depth

// Per-hue loudness cap (0..1): deepest at blue/violet and red/magenta (they
// bloom/halo on near-black), ≈1 at yellow/green. Two lobes combined with max() so
// the violet overlap isn't double-cut. NOW drives ONLY the cta trim (darkCtaTrim);
// the surfaces use the perceptual redistribution instead.
const loudnessCap = (H: number): number => {
  const h = norm(H)
  return GLOBAL_TRIM * (1 - Math.max(BLUE_DEPTH * lobe(h, 265, 115), REDMAG_DEPTH * lobe(h, 345, 110)))
}

// Interpolate the normalized shape at an arbitrary lightness — anchors are the
// blessed DARK_NEUTRAL_L, order-agnostic (same approach as neutralCurve.interpShape).
const shapeAt = (L: number): number => {
  const pts = DARK_NEUTRAL_L.map((l, i) => ({ l, s: SHAPE_DARK[i] })).sort((a, b) => a.l - b.l)
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

// Identity-proportional surface chroma FLOOR — a FRACTION of the resolved cta chroma
// (passed in as ctaC). The DEEP surfaces (app-bg / subtle-bg, stops ~1–3) wash out
// worst because their shape factor is only ~0.125–0.16; the floor lifts those. Mid+
// surfaces already carry enough from the shape, so the fraction tapers to 0 by ~0.50
// (the curve naturally exceeds the floor there) — and so the floor never touches the
// fill (0.66), text (0.80/0.93), or the highlight rung. The fraction must EXCEED the
// deep shape (~0.125) to bite. Coefficients tuned against the dark swatch grid.
const FLOOR_FRAC = 0.22       // deep-surface floor as a fraction of ctaC (stops 1–3)
const FLOOR_TAPER_LO = 0.30   // full floor at/below this L
const FLOOR_TAPER_HI = 0.50   // floor gone at/above this L (curve carries mid+)
const floorFracAt = (L: number): number => {
  if (L <= FLOOR_TAPER_LO) return FLOOR_FRAC
  if (L >= FLOOR_TAPER_HI) return 0
  return FLOOR_FRAC * (1 - smoothstep((L - FLOOR_TAPER_LO) / (FLOOR_TAPER_HI - FLOOR_TAPER_LO)))
}

// Absolute dark chroma at a stop: the brand's intended chroma (shape + identity-
// proportional floor), redistributed per hue for equal prominence on dark (see
// perceptualDarkC). makeStop gamut-clamps after.
export const darkChromaCurve = (L: number, H: number, brandC: number, ctaC?: number): number => {
  const nativeC = ctaC === undefined
    ? brandC * shapeAt(L)
    : Math.max(brandC * shapeAt(L), floorFracAt(L) * ctaC)
  return perceptualDarkC(L, H, nativeC)
}

// The cta fill keeps MOST of its loudness (it's the primary action, brand-true) but
// trims gently on the bloom-prone hues — halfway to the surface cap, so cool ctas
// come down a touch and warm ctas stay essentially full. Louder than the highlight,
// quieter than the raw brand.
export const darkCtaTrim = (H: number): number => 1 - 0.5 * (1 - loudnessCap(H))
