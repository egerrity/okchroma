// Illustration recoloring pipeline.
//
// Designers paint vectors with LEGEND placeholder hexes and export SVG;
// remapSvg() swaps each legend fill for its --illus-* semantic var. Any
// color NOT in the legend passes through untouched — deliberate, so skin
// tones and other never-brand colors stay literal.
//
// Every slot maps to a FIXED stop (2026-06-11 — areas must be
// defined by step, with an explicit rule for what switches):
//   #0057FF primary       brand-9 — always
//   #9DC4FF primary-soft  brand-4 — always
//   #FF7A00 alt           brand-7 mono → accent-9 when two-color is on
//   #FFD6A8 alt-soft      brand-3 mono → accent-4 when two-color is on
//   #1A1A1A ink           neutral-12   #9E9E9E muted  neutral-8
//   #FFFFFF paper         neutral-1
// Mono is the DEFAULT; two-color is opt-in (data-illustration="two-color")
// and only when a real secondary exists.
// V1 constraints: flat fills (no gradients), strokes outlined or painted
// from the legend, text outlined.

export const ILLUSTRATION_LEGEND: Record<string, string> = {
  '#0057FF': 'var(--illus-primary)',
  '#9DC4FF': 'var(--illus-primary-soft)',
  '#FF7A00': 'var(--illus-alt)',
  '#FFD6A8': 'var(--illus-alt-soft)',
  '#1A1A1A': 'var(--illus-ink)',
  '#9E9E9E': 'var(--illus-muted)',
  '#FFFFFF': 'var(--illus-paper)',
}

export function remapSvg(svgText: string): string {
  let out = svgText
  for (const [hex, cssVar] of Object.entries(ILLUSTRATION_LEGEND)) {
    // match fill/stroke attribute or inline-style values, any casing,
    // including the 3-digit shorthand when one exists
    const short = hex[1] === hex[2] && hex[3] === hex[4] && hex[5] === hex[6]
      ? `#${hex[1]}${hex[3]}${hex[5]}` : null
    for (const form of short ? [hex, short] : [hex]) {
      // negative lookahead: don't let the 3-digit form eat the head of a
      // longer non-legend hex (#FFF inside #FFF7A0)
      out = out.replace(new RegExp(`${form}(?![0-9A-Fa-f])`, 'gi'), cssVar)
    }
  }
  return out
}

// Sample vector (card + coins + growth) painted in legend hexes — stands
// in until the visual designer's numbered file arrives; proves the
// pipeline end-to-end.
export const SAMPLE_ILLUSTRATION = `
<svg viewBox="0 0 200 140" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sample brand illustration">
  <ellipse cx="100" cy="124" rx="78" ry="9" fill="#9E9E9E" opacity="0.25"/>
  <rect x="28" y="34" width="104" height="68" rx="10" fill="#0057FF"/>
  <rect x="28" y="50" width="104" height="12" fill="#1A1A1A"/>
  <rect x="40" y="74" width="36" height="9" rx="4.5" fill="#FFFFFF"/>
  <rect x="40" y="88" width="22" height="6" rx="3" fill="#9DC4FF"/>
  <circle cx="146" cy="92" r="26" fill="#FF7A00"/>
  <circle cx="146" cy="92" r="18" fill="#FFD6A8"/>
  <text x="146" y="99" text-anchor="middle" font-family="system-ui, sans-serif" font-size="20" font-weight="700" fill="#1A1A1A">$</text>
  <path d="M44 28 L60 12 L76 24 L96 6" fill="none" stroke="#1A1A1A" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M96 6 L96 20 M96 6 L82 6" fill="none" stroke="#1A1A1A" stroke-width="4" stroke-linecap="round"/>
  <circle cx="170" cy="34" r="6" fill="#9DC4FF"/>
  <circle cx="14" cy="58" r="5" fill="#FFD6A8"/>
</svg>`
