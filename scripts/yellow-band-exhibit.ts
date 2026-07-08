// yellow-band-exhibit.ts — calibration-round diagnostic (owner direction 2026-07-08):
// the yellow band HOLISTICALLY — a hue range from the orange side through gold to the
// yellow-green side, each hue's LIGHT ramp (left, on paper) beside its DARK counterpart
// (right, on dark). The canonical yellow signal rides pinned at top. Real pipeline
// (resolveTheme brand ramps + the signal scale). No remedies here — the whole-band view
// the register/hue decisions get made against. Emits render/yellow-band.html.
// Run: esbuild scripts/yellow-band-exhibit.ts --bundle --platform=node --outfile=dist/yellow-band-exhibit.js && node dist/yellow-band-exhibit.js
import { writeFileSync, mkdirSync } from 'fs'
import { resolveTheme, signalScalesFor } from '../src/engine/resolve'
import { type GeneratedScale, type ColorStop } from '../src/engine/colorEngine'
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

const strip = (s: GeneratedScale, mode: 'light' | 'dark'): string => {
  const stops: ColorStop[] = mode === 'light' ? s.light : s.dark
  const cta = mode === 'light' ? s.cta : s.ctaDark
  const ctaHover = mode === 'light' ? s.ctaHover : s.ctaHoverDark
  const onCta = mode === 'light' ? s.onFillTextIsWhite : s.onFillTextIsWhiteDark
  const onHl = mode === 'light' ? s.onHighlightIsWhite : s.onHighlightIsWhiteDark
  const cell = (cs: ColorStop, name: string, aa?: boolean, white?: boolean) =>
    `<div class="cell" style="background:${stopHex(cs)}" title="${name} ${stopHex(cs)} L${cs.L.toFixed(2)} C${cs.C.toFixed(3)} H${cs.H.toFixed(0)}">${aa ? `<span style="color:${white ? '#fff' : '#000'}">Aa</span>` : ''}</div>`
  return [
    ...stops.map(cs => cell(cs, stopTokenName(cs.stop), cs.stop === 9, onHl)),
    cell(cta, 'cta-1', true, onCta),
    cell(ctaHover, 'cta-2', true, onCta),
  ].join('')
}

// two continuous COLUMNS (owner rule: the eye judges light on white, dark on dark —
// never light strips floating on a dark page): rows aligned across both columns
const leftRows: string[] = []
const rightRows: string[] = []
const addRow = (label: string, sub: string, scale: GeneratedScale, marked = false) => {
  leftRows.push(`<div class="rrow${marked ? ' marked' : ''}">
    <div class="lbl"><b>${label}</b><br><span>${sub}</span></div>
    <div class="strip">${strip(scale, 'light')}</div>
  </div>`)
  rightRows.push(`<div class="rrow${marked ? ' marked-d' : ''}">
    <div class="strip">${strip(scale, 'dark')}</div>
  </div>`)
}

// the canonical yellow signal, pinned at top (the flagged reader)
addRow('yellow signal', 'canonical', signalScalesFor(undefined).get('yellow')!.scale, true)

// the band: orange side → gold → yellow-green side; vivid seeds, light register (yellows live light)
for (const H of [55, 62, 69, 76, 83, 90, 97, 104, 111]) {
  const hex = seedHex(0.78, 0.16, H)
  const t = resolveTheme({ primaryHex: hex, name: `h${H}` })
  addRow(`H ${H}`, `seed ${hex}`, t.themed.scale)
}
// bright lemon (owner request): very light, vivid, green-side yellow
{
  const hex = seedHex(0.92, 0.2, 105)
  const t = resolveTheme({ primaryHex: hex, name: 'lemon' })
  addRow('lemon', `seed ${hex}`, t.themed.scale, true)
}

const html = `<!doctype html><meta charset="utf-8"><title>Yellow band — light vs dark counterparts</title>
<style>
  body { font: 14px/1.5 -apple-system, sans-serif; margin: 0; background:#8a8783; }
  .note { padding: .9rem 1.4rem; background:#f2f0ec; color:#222; font-size:.88rem; }
  .cols { display:flex; align-items:stretch; }
  .col { flex:1; padding: 1rem 1.2rem 2rem; }
  .col.light { background:#faf9f7; color:#1a1a1a; }
  .col.dark { background:#111110; color:#e8e6e1; }
  .colhead { font-size:.72rem; letter-spacing:.06em; text-transform:uppercase; opacity:.6; margin-bottom:.6rem; }
  .rrow { display:flex; align-items:center; height:46px; }
  .rrow.marked { background:#f3edda; border-radius:6px; }
  .rrow.marked-d { background:#221e12; border-radius:6px; }
  .lbl { width:96px; flex-shrink:0; font-size:.76rem; line-height:1.15; }
  .lbl span { opacity:.6; font-size:.68rem; }
  .strip { display:flex; gap:2px; flex:1; }
  .cell { flex:1; height:34px; border-radius:3px; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:.8rem; min-width:0; }
</style>
<div class="note"><b>Yellow band, holistically.</b> Left column (white): each hue's LIGHT ramp.
Right column (dark): the same hue's DARK counterpart, row-aligned. Full stops + cta pair,
Aa = the computed on-color. Hues run the orange side (55) → gold (83–90, the signal's home) →
the yellow-green side (111); the flagged yellow-signal row is first, tinted. Hover any cell for L/C/H.</div>
<div class="cols">
  <div class="col light"><div class="colhead">light</div>${leftRows.join('\n')}</div>
  <div class="col dark"><div class="colhead">dark</div>${rightRows.join('\n')}</div>
</div>
`
mkdirSync('render', { recursive: true })
writeFileSync('render/yellow-band.html', html)
console.log('written → render/yellow-band.html')
