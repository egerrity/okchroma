// p3-d3-exhibit.ts — the D3 eye-check (P3-DESIGN §5): pastel-normalizer OLD (sRGB
// ceiling) vs NEW (P3 ceiling). Both registers are in-sRGB colors — the gamut toggle
// cannot show this; it is a before/after of the normalization itself. NEW = the real
// pipeline (resolveTheme deriveSecondary). OLD = generateSubtleSecondary's exact call
// shape with the pastel curve re-pinned to the sRGB ceiling (the only changed input;
// residual solver-basis drift is sub-perceptual, ≤0.13 L*). The tint model is an
// absolute curve — unchanged by the flip, not shown. Emits render/p3-d3-normalizers.html.
// Run: esbuild scripts/p3-d3-exhibit.ts --bundle --platform=node --outfile=dist/p3-d3-exhibit.js && node dist/p3-d3-exhibit.js
import { writeFileSync, mkdirSync } from 'fs'
import { resolveTheme, subtleCtaLFor, SUBTLE_PASTEL_K } from '../src/engine/resolve'
import { generateScale, type GeneratedScale, type ColorStop } from '../src/engine/colorEngine'
import { hexToOklch, maxChromaAt, makeStop } from '../src/engine/colorMath'
import { hoverL } from '../src/engine/archetypes'
import { clampChromaToGamut } from '../src/engine/constraints'
import { oklchToSrgbUnclamped } from '../src/engine/colorMath'
import { stopHex } from '../src/engine/cssRender'
import { stopTokenName } from '../src/engine/tokenNames'

function seedHex(L: number, C: number, H: number): string {
  const c = clampChromaToGamut(L, C, H, 'srgb') * 0.999
  const { r, g, b } = oklchToSrgbUnclamped(L, c, H)
  const q = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')
  return `#${q(r)}${q(g)}${q(b)}`
}

// OLD pastel: generateSubtleSecondary's exact shape, curve pinned to the sRGB ceiling
function oldPastel(primaryHex: string, ctaL: { light: number; dark: number }): GeneratedScale {
  const { H } = hexToOklch(primaryHex)
  const curve = (L: number, _mode: 'light' | 'dark') => SUBTLE_PASTEL_K * maxChromaAt(L, H, 'srgb')
  const scale = generateScale(primaryHex, 'secondary', 'light', {
    chromaCurve: curve, highlight: true, enforceOnFillContrast: true,
  })
  const mk = (stop: number, L: number, mode: 'light' | 'dark') => makeStop(stop, L, curve(L, mode), scale.brandH)
  scale.cta = mk(9, ctaL.light, 'light')
  scale.ctaHover = mk(10, hoverL(ctaL.light), 'light')
  scale.ctaDark = mk(9, ctaL.dark, 'dark')
  scale.ctaHoverDark = mk(10, hoverL(ctaL.dark), 'dark')
  return scale
}

const HUES: Array<[string, number]> = [
  ['red-orange', 30], ['orange', 60], ['yellow-gold', 85], ['green', 150], ['blue', 250], ['pink', 330],
]

const row = (s: GeneratedScale, mode: 'light' | 'dark', label: string): string => {
  const stops: ColorStop[] = mode === 'light' ? s.light : s.dark
  const cta = mode === 'light' ? s.cta : s.ctaDark
  const ctaHover = mode === 'light' ? s.ctaHover : s.ctaHoverDark
  const onCtaWhite = mode === 'light' ? s.onFillTextIsWhite : s.onFillTextIsWhiteDark
  const onHlWhite = mode === 'light' ? s.onHighlightIsWhite : s.onHighlightIsWhiteDark
  const cell = (cs: ColorStop, name: string, aa?: boolean, white?: boolean) =>
    `<div class="cell" style="background:${stopHex(cs)}" title="${name} ${stopHex(cs)} C${cs.C.toFixed(3)}">${aa ? `<span style="color:${white ? '#fff' : '#000'}">Aa</span>` : ''}</div>`
  return `<div class="rowline"><span class="lbl">${label}</span>${[
    ...stops.map(cs => cell(cs, stopTokenName(cs.stop), cs.stop === 9, onHlWhite)),
    cell(cta, 'cta-1', true, onCtaWhite),
    cell(ctaHover, 'cta-2', true, onCtaWhite),
  ].join('')}</div>`
}

const sections: string[] = []
for (const mode of ['light', 'dark'] as const) {
  const pairs = HUES.map(([name, H]) => {
    const hex = seedHex(0.55, 0.14, H)
    const t = resolveTheme({ primaryHex: hex, name, deriveSecondary: true })
    const neu = t.secondary!.scale                                  // NEW: the real pipeline
    const old = oldPastel(hex, subtleCtaLFor(t.primary.scale))      // OLD: sRGB-normalized
    return `<div class="pair"><h3>${name} · seed ${hex}</h3>${row(old, mode, 'sRGB-norm (old)')}${row(neu, mode, 'P3-norm (new)')}</div>`
  }).join('\n')
  sections.push(`<section class="${mode}"><h2>${mode} mode — derived pastel secondary, old vs new normalization</h2>${pairs}</section>`)
}

const html = `<!doctype html><meta charset="utf-8"><title>D3 — pastel normalizer: sRGB vs P3 ceiling</title>
<style>
  body { font: 14px/1.5 -apple-system, sans-serif; margin: 0; }
  section { padding: 1.5rem 2rem 2rem; }
  section.light { background:#faf9f7; color:#1a1a1a; }
  section.dark { background:#111110; color:#e8e6e1; }
  h2 { font-size: 1.05rem; margin: 0 0 1rem; }
  .pair { margin-bottom: 1.1rem; }
  .pair h3 { font-size: .85rem; font-weight: 600; margin: 0 0 .3rem; opacity: .8; }
  .rowline { display:flex; align-items:center; gap:2px; margin-bottom:3px; }
  .lbl { width: 110px; font-size: .72rem; opacity: .7; flex-shrink: 0; }
  .cell { width: 52px; height: 34px; border-radius: 4px; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:.85rem; }
  .note { padding: 1rem 2rem; background:#fff; font-size:.9rem; border-bottom:1px solid #ddd; }
</style>
<div class="note"><b>D3 exhibit.</b> Same derived pastel secondary, two normalizations: the pastel
register = 35% of the hue's chroma ceiling — OLD row uses the sRGB ceiling (pre-flip), NEW row the
P3 ceiling (what the engine ships now). Every color here is inside sRGB; the gamut toggle does
nothing on this page by design. Judge: does the NEW pastel register still read "light and airy",
or too chromatic? If too chromatic → the normalizers get pinned to sRGB constants instead.</div>
${sections.join('\n')}
`
mkdirSync('render', { recursive: true })
writeFileSync('render/p3-d3-normalizers.html', html)
console.log('written → render/p3-d3-normalizers.html')
