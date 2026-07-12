// secondary-cta-hierarchy.ts — the PRIMARY-vs-SECONDARY cta read (owner 2026-07-11: "I should
// be comparing them to the primary ctas... suspicion that the secondary ctas might have too
// much contrast from the background in dark mode to read as secondary"). Real pipeline: per
// lane × mode, each hue's row = [Primary cta][muted Secondary][vibrant Secondary][Neutral cta]
// on the theme's REAL paper-0 ground, with L + bg-ΔL data. NOTHING to mark — a hierarchy read.
import { writeFileSync, mkdirSync } from 'fs'
import { resolveTheme } from '/Users/emilygerrity/okchroma/src/engine/resolve'
import { generateNeutralScale } from '/Users/emilygerrity/okchroma/src/engine/colorEngine'
import { hexToOklch } from '/Users/emilygerrity/okchroma/src/engine/colorMath'
import { clampChromaToGamut, oklchToLinearRgb } from '/Users/emilygerrity/okchroma/src/engine/constraints'

const hx = (c: { L: number; C: number; H: number }) => {
  const cc = clampChromaToGamut(c.L, c.C, c.H)
  const [rl, gl, bl] = oklchToLinearRgb(c.L, cc, c.H)
  const gm = (v: number) => { const x = Math.min(1, Math.max(0, v)); return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055 }
  const ch = (v: number) => Math.round(gm(v) * 255).toString(16).padStart(2, '0')
  return `#${ch(rl)}${ch(gl)}${ch(bl)}`
}

// each row = a REAL THEME: the row hex IS the primary (its own resolved cta), the secondary =
// the same hue through the muted/vibrant styles (owner: "render the primary cta color that
// belongs" — a fixed blue primary made every row's primary cta blue). Neutral from that theme.
const HUES = [['#3BA55C', 'green'], ['#0E7490', 'teal'], ['#B45309', 'gold'], ['#7C3AED', 'violet'], ['#DB2777', 'pink'], ['#DC2626', 'red']]

const sections: string[] = []
for (const mode of ['light', 'dark'] as const) {
  for (const profile of ['wcag', 'apca'] as const) {
    const cp = profile === 'apca' ? 'apca' as const : undefined
    const rows: string[] = []
    for (const [hex, name] of HUES) {
      const nScale = generateNeutralScale(hexToOklch(hex).H, 'default', cp)
      const paper0 = mode === 'light' ? (nScale.paper0 ? hx(nScale.paper0) : '#ffffff') : (nScale.paper0Dark ? hx(nScale.paper0Dark) : '#141416')
      const paperL = mode === 'light' ? (nScale.paper0?.L ?? 1) : (nScale.paper0Dark?.L ?? 0.17)
      const tm = resolveTheme({ primaryHex: hex, secondaryHex: hex, secondaryStyle: 'tint', contrastProfile: cp })
      const tv = resolveTheme({ primaryHex: hex, secondaryHex: hex, secondaryStyle: 'pastel', contrastProfile: cp })
      const pick = (s: any) => mode === 'light' ? { c: s.cta, w: s.onFillTextIsWhite } : { c: s.ctaDark, w: s.onFillTextIsWhiteDark }
      const prim = pick(tm.primary.scale)
      const mut = pick(tm.secondary!.scale)
      const vib = pick(tv.secondary!.scale)
      const neu = pick(nScale)
      const btn = (x: any, label: string) =>
        `<div class="cell"><div class="lab">${label} · L${x.c.L.toFixed(2)} · ΔLbg ${Math.abs(x.c.L - paperL).toFixed(2)}</div>
<div class="btn" style="background:${hx(x.c)};color:${x.w ? '#fff' : '#000'}">${label.split(' ')[0]} cta</div></div>`
      rows.push(`<div class="row" style="background:${paper0};color:${mode === 'light' ? '#1a1a1a' : '#d5d5d5'}"><div class="rid"><div class="idsw" style="background:${hex}"></div><b>${hex}</b>&nbsp;${name} <span style="opacity:.55;font-size:.68rem">paper-0 ${paper0}</span></div>
<div class="cells">${btn(prim, 'Primary')}${btn(mut, 'Muted secondary')}${btn(vib, 'Vibrant secondary')}${btn(neu, 'Neutral')}</div></div>`)
    }
    sections.push(`<div class="sect">
<div class="stitle">${mode.toUpperCase()} · ${profile.toUpperCase()} — each row on ITS theme's real paper-0</div>
${rows.join('')}</div>`)
  }
}

const html = `<!doctype html><meta charset="utf-8"><title>Secondary cta hierarchy — vs primary</title>
<style>
  body { font: 14px/1.5 -apple-system, sans-serif; margin:0; background:#faf9f7; color:#1a1a1a; }
  .note { padding:.9rem 1.4rem; background:#f2f0ec; font-size:.86rem; }
  .sect { padding:.6rem 0 .9rem; }
  .stitle { padding:.5rem 1.4rem; font-weight:800; font-size:.8rem; letter-spacing:.04em; opacity:.75; background:#f2f0ec; }
  .row { display:flex; gap:1.2rem; align-items:center; padding:.5rem 1.4rem; }
  .rid { display:flex; gap:.5rem; align-items:center; width:190px; flex:0 0 190px; font-size:.8rem; }
  .idsw { width:20px; height:20px; border-radius:5px; }
  .cells { display:flex; gap:1.1rem; }
  .cell { display:flex; flex-direction:column; align-items:center; gap:.2rem; }
  .lab { font-size:.58rem; text-transform:uppercase; letter-spacing:.03em; opacity:.6; }
  .btn { min-width:120px; height:44px; border-radius:22px; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:.78rem; padding:0 .9rem; }
</style>
<div class="note"><b>Cta hierarchy — primary vs secondary, both modes, both lanes (real paper-0 grounds).</b>
Each row = a real theme: the row hue IS the primary; secondary = the same hue through muted/vibrant (the belongs-together pairing). Labels carry the fill L and its distance from the ground (ΔLbg) — the prominence read.
Your suspicion under test: do the secondary ctas carry too much ground-contrast in dark to read as second-tier beside the primary?</div>
${sections.join('')}`

mkdirSync('/Users/emilygerrity/okchroma/render', { recursive: true })
writeFileSync('/Users/emilygerrity/okchroma/render/secondary-cta-hierarchy.html', html)
console.log('written -> render/secondary-cta-hierarchy.html')
