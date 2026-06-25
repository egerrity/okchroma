// The generated neutral's chroma curve (engine-spec Stage 6, Decision 2).
//
// The neutral is produced by REUSING generateScale (a faint gray at the brand
// hue + the 'light' archetype), with this curve supplied as GenerateOptions.
// chromaCurve so the only thing that differs from a brand ramp is the chroma
// profile — a quiet, Radix-derived tint instead of the brand's vivid ladder.
//
// Derivation (all measured from Radix's own neutral families, evaluated BY
// LIGHTNESS so the curve also covers the off-grid roles — the archetype cta and
// the rung-shifted highlight):
//   - shape  = Radix per-step chroma, normalized to its peak (step 9 = 1.0).
//     The light/dark split is real: dark's text stop collapses to ~0.195 of
//     peak while light keeps ~0.74.
//   - L-anchors = the lightnesses those steps sit at, averaged across the four
//     non-excluded families (gray is achromatic, sage an outlier). Light anchors
//     descend with step; dark anchors ascend — interpolation is order-agnostic.
//   - peak C  = per-hue, interpolated around the wheel from four family anchors.

export type NeutralLevel = 'pure' | 'default' | 'branded'

// Radix step lightnesses (mauve/slate/olive/sand average). Light descends with
// step index, dark ascends.
const LANCHOR = {
  light: [0.993, 0.983, 0.956, 0.932, 0.91, 0.886, 0.852, 0.793, 0.643, 0.609, 0.501, 0.243],
  dark: [0.179, 0.213, 0.252, 0.283, 0.312, 0.347, 0.4, 0.49, 0.537, 0.583, 0.768, 0.949],
}
// Per-step chroma normalized to the step-9 peak.
const SHAPE = {
  light: [0.108, 0.179, 0.253, 0.32, 0.45, 0.503, 0.599, 0.818, 1, 0.939, 0.841, 0.74],
  dark: [0.236, 0.229, 0.276, 0.394, 0.469, 0.551, 0.648, 0.859, 1, 0.94, 0.745, 0.195],
}
// Per-hue PEAK chroma anchors (hue° → light/dark), interpolated circularly.
const PEAK = [
  { h: 97, light: 0.0102, dark: 0.0109 },  // sand   (amber/yellow/orange band)
  { h: 143, light: 0.0119, dark: 0.0181 }, // olive  (lime/grass)
  { h: 270, light: 0.0165, dark: 0.0156 }, // slate  (cyan/blue/indigo)
  { h: 301, light: 0.0193, dark: 0.0172 }, // mauve  (violet/purple/pink/red)
]
// Level multipliers on the peak. pure = true gray; default = the measured curve;
// branded = an amplified, intentionally-tinted neutral.
const LEVEL: Record<NeutralLevel, number> = { pure: 0, default: 1, branded: 1.75 }

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

// Interpolate the normalized shape at an arbitrary lightness. Order-agnostic:
// build (L, shape) points and sort by L so light (descending anchors) and dark
// (ascending anchors) both interpolate correctly. Clamps past the ends.
const interpShape = (L: number, mode: 'light' | 'dark'): number => {
  const pts = LANCHOR[mode].map((l, i) => ({ l, s: SHAPE[mode][i] })).sort((a, b) => a.l - b.l)
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

// The chromaCurve to hand to generateScale: absolute chroma at a lightness +
// mode for a neutral tinted toward `brandH` at the chosen `level`. makeStop
// gamut-clamps after.
export function neutralChromaCurve(
  brandH: number,
  level: NeutralLevel = 'default',
): (L: number, mode: 'light' | 'dark') => number {
  const mult = LEVEL[level]
  return (L, mode) => mult * peakC(brandH, mode) * interpShape(L, mode)
}
