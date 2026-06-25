// The production dark-mode chroma reduction — option D ("hybrid"), chosen by the
// owner after reviewing A/B/C/D on the fleet (2026-06-25). A gentle product of an
// L-taper × hue factor × chroma factor, fed to generateScale as
// GenerateOptions.darkChromaReduce on the brand/secondary/signal paths (the
// neutral and the muted-rose collider fill are exempt). Dark reads LOUDER than
// light perceptually (same chroma glows more on dark, worst blue/violet); this
// pulls it back where the glow is — blue/violet hardest, yellow/green spared
// (the gamut self-clamps them), the already-quiet deep stops untouched.
//
// The exploration registry (scripts/darkCurves.ts) imports D from here, so the
// reviewed curve and the shipped curve are the same function.

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const rad = (d: number) => (d * Math.PI) / 180
const norm = (h: number) => ((h % 360) + 360) % 360
const smooth = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t) }

// Never strip a stop below half its chroma — on dark, chroma is doing double
// duty as the discriminability signal.
export const DARK_MIN_RETAIN = 0.5

// Dip at blue/violet (~265°, the gamut won't clamp dark blue), floored ≥0.99
// across green/yellow so the cusp leads there.
const hueFactor = (H: number, depth: number): number => {
  const h = norm(H)
  let f = 1 - depth * Math.pow(Math.max(0, Math.cos(rad(h - 265))), 1.5)
  if (h >= 120 && h <= 175) f = Math.max(f, 0.99)
  return f
}
// Concentrate the cut on the hot mid-band (L≈0.64 — fills + boosted signal
// surfaces); ~1 at the already-quiet deep stops and the gamut-clamped text tier.
const retain = (L: number, depth: number): number => 1 - depth * Math.max(0, 1 - Math.pow((L - 0.64) / 0.46, 2))
// Low chroma → ~1 (leave muted stops alone); high chroma → cut by `depth`.
const chromaFactor = (C: number, depth: number): number => 1 - depth * smooth(0.05, 0.18, C)

// Option D — the shipped curve. Depths are gentle (reviewed first pass).
export const darkChromaReduce = (L: number, C: number, H: number): number =>
  clamp(retain(L, 0.16) * hueFactor(H, 0.16) * chromaFactor(C, 0.22), DARK_MIN_RETAIN, 1)
