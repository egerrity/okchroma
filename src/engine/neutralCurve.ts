

import { LIGHT_L, DARK_L } from './stopTable'

export type NeutralLevel = 'pure' | 'default' | 'branded'

// SHAPE = the neutral's CHROMA shape: the relative tint at each stop, sampled across
// lightness. Its x-axis is the shared stop-lightness scaffold (LIGHT_L / DARK_L) — the
// neutral's stops sit there via the main generateScale loop, so SHAPE[i] is the tint at
// stop i+1's lightness. (Previously sampled over a separate, near-identical LANCHOR
// table; consolidated onto the scaffold 2026-06-29 — the two were the same axis.)
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
  const pts = (mode === 'light' ? LIGHT_L : DARK_L).map((l, i) => ({ l, s: SHAPE[mode][i] })).sort((a, b) => a.l - b.l)
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
