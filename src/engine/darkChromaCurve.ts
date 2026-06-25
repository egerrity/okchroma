// Phase-3 dark CHROMA curve (greenfield dark rebuild, Stage 10). Reuses the
// neutralChromaCurve architecture (peak × shape, evaluated by lightness) but
// rebuilt for brands: peak is the BRAND's chroma (pinned at the fill, identity),
// shape is re-derived from Radix's COLORED dark scales (it collapses the text
// tiers — s11 0.745 ≫ s12 0.20 — so 11↔12 separates by CHROMA, not lightness),
// and a per-hue loudness cap (CIECAM02 surround × an H-K / chromostereopsis
// U-shape) folds into the surfaces + text while the fill stays loud. The result
// is an ABSOLUTE chroma per stop, gamut-clamped by makeStop — replacing the old
// proportional darkStops.chromaMultiplier as the dark loudness source.
//
//   C(L, H, brandC) = brandC · shape(L) · capMix(L, H)
//
// Dark-only; light mode is untouched. Lightness is the fixed blessed scaffold
// (Phase 2) — this only sets chroma.

import { DARK_NEUTRAL_L } from './stopTable'

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const rad = (d: number) => (d * Math.PI) / 180
const norm = (h: number) => ((h % 360) + 360) % 360
const smoothstep = (x: number) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t) }
const angDist = (h: number, c: number) => Math.abs((((h - c + 540) % 360)) - 180)
const lobe = (h: number, c: number, w: number) => Math.pow(Math.max(0, Math.cos(rad((90 * angDist(h, c)) / w))), 1.5)

// Normalized per-stop chroma, re-derived from Radix's COLORED dark scales (fill
// stop 9 = 1.0). Rises across the surfaces, peaks at the fill, collapses at text.
// Deep stops 1–2 nudged up from the raw grand-mean (0.097/0.127) so the app-bg /
// subtle-bg carry a touch more brand tint (they were reading slightly grey).
const SHAPE_DARK = [0.125, 0.16, 0.305, 0.429, 0.483, 0.522, 0.57, 0.674, 1, 0.94, 0.745, 0.2]

const FILL_L = 0.66        // the blessed stop-9 lightness; cap eases to 0 above it
const GLOBAL_TRIM = 0.76   // CIECAM02 dark-surround colorfulness trim
const BLUE_DEPTH = 0.30    // blue/violet (~265°) trough depth
const REDMAG_DEPTH = 0.26  // red/magenta (~345°) trough depth

// Per-hue loudness cap (0..1): deepest at blue/violet and red/magenta (they
// bloom/halo on near-black), ≈1 at yellow/green (perceptually quiet + the gamut
// self-clamps them anyway). Two lobes combined with max() so the violet overlap
// isn't double-cut.
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

// The per-hue loudness cap bites only in the SURFACE MID-BAND (≈ stops 3–8). It
// eases to 1.0 (NO cap) at the DEEP darks (1–2): near-black, they don't bloom —
// they just need their tint, and capping them greyed them out. It is also 1.0
// above the fill, so text-low (11) keeps its hue (reads as a colored link) while
// text-high (12) is left to the shape's collapse. So the cap calms exactly the
// mid-lightness saturated surfaces where bloom happens, and nowhere else.
const bandWeight = (L: number): number => {
  if (L <= 0.22) return 0
  if (L < 0.30) return smoothstep((L - 0.22) / 0.08)
  if (L <= 0.55) return 1
  if (L < FILL_L) return 1 - smoothstep((L - 0.55) / (FILL_L - 0.55))
  return 0
}
const capMix = (L: number, H: number): number => 1 - (1 - loudnessCap(H)) * bandWeight(L)

// Absolute dark chroma at a stop. peak = brandC (pinned, fill identity); shape is
// Radix's colored-dark distribution (tinted surfaces, text collapse); the cap calms
// the mid-band surfaces of the bloom-prone hues only. makeStop gamut-clamps after.
export const darkChromaCurve = (L: number, H: number, brandC: number): number =>
  brandC * shapeAt(L) * capMix(L, H)

// The cta fill keeps MOST of its loudness (it's the primary action, brand-true) but
// trims gently on the bloom-prone hues — halfway to the surface cap, so cool ctas
// come down a touch and warm ctas stay essentially full. Louder than the highlight,
// quieter than the raw brand.
export const darkCtaTrim = (H: number): number => 1 - 0.5 * (1 - loudnessCap(H))
