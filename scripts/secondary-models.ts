// secondary-models.ts — the secondary-ramp round, v2.1 (owner "Perfect!" on the v2 pair →
// WIRED in the working tree: 'tint' id rides the MUTED model (identity ramp × 0.5), 'pastel'
// rides VIBRANT (uniform apparent-colorfulness boost, solveCForApparent), derived secondary →
// vibrant. Ids unchanged pending her rename call.
//
// v2.1 adds the DARK consequence for her verdict: under the C13 delta model the dark ramp is a
// FUNCTION of the light twin (dark L solves from light's apparent lightness, which includes its
// chroma) — so the light redesign flows into dark structurally (measured max ΔE 0.03–0.106; the
// 2026-07-04 "dark closed as-is" ruling predates the delta model — the bespoke dark curves it
// protected no longer exist independently). This page renders BEFORE (pre-wiring capture) vs
// AFTER for both modes: light on light ground, dark on dark ground.
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { clampChromaToGamut, oklchToLinearRgb } from '/Users/emilygerrity/okchroma/src/engine/constraints'

const SP = '/private/tmp/claude-501/-Users-emilygerrity-okchroma/ebd31ad1-e60f-4409-bafd-b31c7e4ee31e/scratchpad'
const before: any = JSON.parse(readFileSync(`${SP}/sec-before.json`, 'utf8'))
const after: any = JSON.parse(readFileSync(`${SP}/sec-after.json`, 'utf8'))
const HUES = [['#3BA55C', 'green'], ['#0E7490', 'teal'], ['#B45309', 'gold'], ['#7C3AED', 'violet'], ['#DB2777', 'pink'], ['#DC2626', 'red']]

const hx = (c: { L: number; C: number; H: number }) => {
  const cc = clampChromaToGamut(c.L, c.C, c.H)
  const [rl, gl, bl] = oklchToLinearRgb(c.L, cc, c.H)
  const gm = (v: number) => { const x = Math.min(1, Math.max(0, v)); return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055 }
  const ch = (v: number) => Math.round(gm(v) * 255).toString(16).padStart(2, '0')
  return `#${ch(rl)}${ch(gl)}${ch(bl)}`
}

const card = (d: any, mode: 'light' | 'dark', title: string, note: string, dim = false) => {
  const stops = mode === 'light' ? d.light : d.dark
  const at = (n: number) => stops.find((x: any, i: number) => i === n - 1)
  const ink11 = hx(at(11)), ink10 = hx(at(10)), hl9 = hx(at(9)), wash3 = hx(at(3)), p1 = hx(at(1))
  const cta = mode === 'light' ? hx(d.cta) : hx(d.ctaDark)
  const onW = mode === 'light' ? d.onW : d.onWD
  const onCta = onW ? '#fff' : (mode === 'light' ? ink11 : '#000')
  const strip = stops.map((st: any) => `<div class="chip" style="background:${hx(st)}"></div>`).join('')
  return `<div class="card${dim ? ' dim' : ''}${mode === 'dark' ? ' dk' : ''}">
<div class="ctitle">${title} <span class="cnote">${note}</span></div>
<div class="h" style="color:${ink11}">Aa Heading</div>
<div class="b" style="color:${ink10}">Body copy in the ink register.</div>
<div class="btn" style="background:${cta};color:${onCta}">cta-1 button</div>
<div class="insets">
  <div class="inset" style="background:${wash3};color:${ink10}">wash inset</div>
  <div class="inset" style="background:${hl9};color:${p1}">highlight inset</div>
</div>
<div class="strip">${strip}</div></div>`
}

const rows: string[] = []
for (const mode of ['light', 'dark'] as const) {
  rows.push(`<div class="modesect${mode === 'dark' ? ' dks' : ''}">${mode.toUpperCase()} MODE ${mode === 'dark' ? '— the delta-model consequence, your verdict' : ''}</div>`)
  for (const profile of ['wcag', 'apca'] as const) {
    rows.push(`<div class="sect${mode === 'dark' ? ' dks' : ''}">${profile.toUpperCase()} LANE</div>`)
    for (const [hex, name] of HUES) {
      const cells: string[] = []
      for (const [style, label] of [['tint', 'MUTED (tint id)'], ['pastel', 'VIBRANT (pastel id)']] as any) {
        const k = `${profile}|${hex}|${style}`
        cells.push(card(after[k], mode, label, 'NEW'))
        cells.push(card(before[k], mode, `was · ${style}`, '', true))
      }
      rows.push(`<div class="hue${mode === 'dark' ? ' dks' : ''}"><div class="hlab"><div class="idsw" style="background:${hex}"></div><b style="${mode === 'dark' ? 'color:#e8e8e8' : ''}">${hex}</b>&nbsp;${name} · ${profile}</div>
<div class="cards">${cells.join('')}</div></div>`)
    }
  }
}

const html = `<!doctype html><meta charset="utf-8"><title>Secondary v2.1 — muted + vibrant, wired (dark consequence)</title>
<style>
  body { font: 14px/1.5 -apple-system, sans-serif; margin:0; background:#faf9f7; color:#1a1a1a; }
  .note { padding:.9rem 1.4rem; background:#f2f0ec; font-size:.86rem; }
  .modesect { padding:.9rem 1.4rem .1rem; font-weight:800; font-size:1rem; }
  .sect { padding:.5rem 1.4rem .1rem; font-weight:700; font-size:.8rem; letter-spacing:.05em; opacity:.65; }
  .hue { padding: .7rem 1.4rem; border-bottom: 1px solid #e7e4de; }
  .dks { background:#141416; color:#cfcfcf; border-color:#26262b !important; }
  .hlab { display:flex; gap:.5rem; align-items:center; margin-bottom:.5rem; }
  .idsw { width:22px; height:22px; border-radius:5px; }
  .cards { display:flex; gap:.8rem; flex-wrap:wrap; }
  .card { width:250px; background:#fff; border:1px solid #e7e4de; border-radius:12px; padding:.7rem; }
  .card.dk { background:#1b1b1e; border-color:#2b2b30; }
  .card.dim { opacity:.5; }
  .ctitle { font-size:.6rem; text-transform:uppercase; letter-spacing:.04em; opacity:.6; margin-bottom:.35rem; }
  .cnote { text-transform:none; letter-spacing:0; opacity:.85; }
  .h { font-weight:800; font-size:1.05rem; }
  .b { font-size:.74rem; margin:.1rem 0 .45rem; }
  .btn { display:inline-flex; padding:.4rem .85rem; border-radius:17px; font-weight:700; font-size:.74rem; margin-bottom:.45rem; }
  .insets { display:flex; gap:.35rem; margin-bottom:.45rem; }
  .inset { flex:1; border-radius:7px; padding:.4rem .45rem; font-size:.64rem; }
  .strip { display:flex; gap:2px; }
  .chip { flex:1; height:22px; border-radius:3px; }
</style>
<div class="note"><b>Secondary v2.1 — muted + vibrant WIRED (working tree, not committed).</b> 'tint' id → MUTED (identity ramp × 0.5) · 'pastel' id → VIBRANT (uniform apparent boost) · derived → vibrant. Light matches the page you approved (mirror 12/12).<br>
<b>The dark consequence needs your verdict:</b> under the delta model dark is a FUNCTION of light — the light redesign flows into dark structurally (max ΔE 0.03–0.106, biggest on red-vibrant stop 6 / teal-muted stop 9). The old "dark closed as-is" ruling predates the delta model. NEW vs the dimmed "was" cards below, dark on dark ground.</div>
${rows.join('')}`

mkdirSync('/Users/emilygerrity/okchroma/render', { recursive: true })
writeFileSync('/Users/emilygerrity/okchroma/render/secondary-models.html', html)
console.log('written -> render/secondary-models.html (v2.1: light+dark, before/after)')
