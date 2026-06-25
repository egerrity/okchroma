// Candidate darkChromaReduce curves — the OPTIONS to review. Each is a
// (L, C, H) => factor in [MIN_RETAIN, 1] multiplied onto a dark stop's rendered
// chroma. Four distinct philosophies, deliberately gentle for a first pass
// (dial up later). Pure functions — no engine deps — so they're easy to read
// and tweak. fn:null = "before" (no reduction).
//
//   A  hue-led L-taper  — WHERE (mid-band L) + WHICH HUE. The spec-v1 shape; no
//                         chroma term. Conservative, predictable.
//   B  chroma-led       — HOW LOUD (input chroma). Cut scales with saturation,
//                         so loud fills get trimmed and already-muted stops are
//                         left alone. Lightness-independent; self-targeting.
//   C  chroma ceiling   — a hard CAP on rendered chroma per L+hue. Only stops
//                         above the ceiling are pulled down (to it); everything
//                         below is untouched. Directly bounds "loudness."
//   D  hybrid           — gentle PRODUCT of L-taper x hue x chroma. The
//                         everything-balanced option.

export type DarkCurve = (L: number, C: number, H: number) => number

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const rad = (d: number) => (d * Math.PI) / 180
const norm = (h: number) => ((h % 360) + 360) % 360
const smooth = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t) }

export const MIN_RETAIN = 0.5

// Dip at blue/violet (~265°, gamut won't clamp dark blue), ~1 at green/yellow
// (the cusp self-clamps them — floored so the gamut leads there).
const hueFactor = (H: number, depth: number): number => {
  const h = norm(H)
  let f = 1 - depth * Math.pow(Math.max(0, Math.cos(rad(h - 265))), 1.5)
  if (h >= 120 && h <= 175) f = Math.max(f, 0.99)
  return f
}
// Cut concentrated on the hot mid-band (L≈0.64 — fills + boosted signal
// surfaces); ~1 at the already-quiet deep stops and the gamut-clamped text tier.
const retain = (L: number, depth: number): number => 1 - depth * Math.max(0, 1 - Math.pow((L - 0.64) / 0.46, 2))
// Low chroma → ~1 (leave muted stops alone); high chroma → cut by `depth`.
const chromaFactor = (C: number, depth: number): number => 1 - depth * smooth(0.05, 0.18, C)
// Perceptual chroma cap per L+hue: lower for blue/violet, quieter as L rises.
const ceiling = (L: number, H: number): number => {
  const h = norm(H)
  const blueBias = 1 - 0.3 * Math.max(0, Math.cos(rad(h - 265)))  // 0.70 at blue → 1.0 green/yellow
  const lScale = 1 - 0.35 * Math.max(0, (L - 0.5) / 0.5)          // quieter above L 0.5
  return 0.135 * blueBias * lScale
}

export interface CurveDef { label: string; desc: string; fn: DarkCurve | null }

export const DARK_CURVES: Record<string, CurveDef> = {
  before: { label: 'Before', desc: 'current dark — no reduction', fn: null },
  A: {
    label: 'A · hue-led L-taper',
    desc: 'mid-band L cut, blue/violet hardest; no chroma term',
    fn: (L, _C, H) => clamp(retain(L, 0.22) * hueFactor(H, 0.18), MIN_RETAIN, 1),
  },
  B: {
    label: 'B · chroma-led',
    desc: 'cut scales with saturation — loud fills trimmed, muted spared',
    fn: (_L, C, H) => clamp(chromaFactor(C, 0.35) * hueFactor(H, 0.1), MIN_RETAIN, 1),
  },
  C: {
    label: 'C · chroma ceiling',
    desc: 'hard cap per L+hue; only over-bright stops pulled to the cap',
    fn: (L, C, H) => clamp(C > 0 ? Math.min(1, ceiling(L, H) / C) : 1, MIN_RETAIN, 1),
  },
  D: {
    label: 'D · hybrid',
    desc: 'gentle product of L-taper × hue × chroma',
    fn: (L, C, H) => clamp(retain(L, 0.16) * hueFactor(H, 0.16) * chromaFactor(C, 0.22), MIN_RETAIN, 1),
  },
}

// An intentionally-louder variant of the hybrid, to show how far it can go.
export const AGGRESSIVE: CurveDef = {
  label: 'D+ · hybrid (aggressive)',
  desc: 'same shape as D, deeper (L 0.30 / hue 0.26 / chroma 0.38)',
  fn: (L, C, H) => clamp(retain(L, 0.3) * hueFactor(H, 0.26) * chromaFactor(C, 0.38), MIN_RETAIN, 1),
}
