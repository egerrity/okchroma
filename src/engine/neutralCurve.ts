

export type NeutralLevel = 'pure' | 'default' | 'branded'

// LANCHOR/SHAPE define the neutral's CHROMA as a function of lightness: LANCHOR
// is the L-breakpoints the curve is sampled at, SHAPE the relative chroma at each.
// These are a derived artifact (Stage-0) and intentionally NOT the stop-lightness
// scaffold — the neutral's stops sit at the shared LIGHT_L/DARK_L (stopTable) via
// the main generateScale loop; this table is only the x-axis of the chroma curve.
// It reads close to LIGHT_L/DARK_L by coincidence of derivation; do NOT "consolidate"
// it onto them — that would resample (re-tune) the curve.
const LANCHOR = {
  light: [0.993, 0.983, 0.956, 0.932, 0.91, 0.886, 0.852, 0.793, 0.643, 0.609, 0.501, 0.243],
  dark: [0.179, 0.213, 0.252, 0.283, 0.312, 0.347, 0.4, 0.49, 0.537, 0.583, 0.768, 0.949],
}

const SHAPE = {
  light: [0.108, 0.179, 0.253, 0.32, 0.45, 0.503, 0.599, 0.818, 1, 0.939, 0.841, 0.74],
  dark: [0.236, 0.229, 0.276, 0.394, 0.469, 0.551, 0.648, 0.859, 1, 0.94, 0.745, 0.195],
}

const PEAK = [
  { h: 97, light: 0.0102, dark: 0.0109 },
  { h: 143, light: 0.0119, dark: 0.0181 },
  { h: 270, light: 0.0165, dark: 0.0156 },
  { h: 301, light: 0.0193, dark: 0.0172 },
]

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

export function neutralChromaCurve(
  brandH: number,
  level: NeutralLevel = 'default',
): (L: number, mode: 'light' | 'dark') => number {
  const mult = LEVEL[level]
  return (L, mode) => mult * peakC(brandH, mode) * interpShape(L, mode)
}
