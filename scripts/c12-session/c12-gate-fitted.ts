// FITTED GATE panels (owner confirm): the fitted 3D gate (wDark .5, wLight 1.5, wDust 1.0,
// G .07) shown as identity-chip panels per L-slice — conflict set left, clear right.
import { writeFileSync, mkdirSync } from 'fs'
import { SIGNALS } from '/Users/emilygerrity/okchroma/src/engine/signals'
import { hexToOklch } from '/Users/emilygerrity/okchroma/src/engine/colorMath'
import { clampChromaToGamut, oklchToLinearRgb } from '/Users/emilygerrity/okchroma/src/engine/constraints'
const hx = (L: number, C: number, H: number) => {
  const c = clampChromaToGamut(L, C, H)
  const [rl, gl, bl] = oklchToLinearRgb(L, c, H)
  const gm = (v: number) => { const x = Math.min(1, Math.max(0, v)); return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055 }
  const ch = (v: number) => Math.round(gm(v) * 255).toString(16).padStart(2, '0')
  return `#${ch(rl)}${ch(gl)}${ch(bl)}`
}
const red = hexToOklch(SIGNALS.find(s => s.name === 'red')!.hex)
const W = { dark: 0.65, light: 1.60, dust: 1.40, gold: 1.60, G: 0.090 }   // fit v5 (0/67 hard marks)
const gateD = (L: number, C: number, H: number) => {
  const o = hexToOklch(hx(L, C, H))
  const dh = ((o.H - red.H + 540) % 360) - 180
  const arcMag = 2 * Math.sqrt(o.C * red.C) * Math.sin(Math.abs(Math.min(0, dh)) * Math.PI / 360)
  const arcGold = 2 * Math.sqrt(o.C * red.C) * Math.sin(Math.max(0, dh) * Math.PI / 360)
  return Math.hypot(W.dark * Math.max(0, red.L - o.L), W.light * Math.max(0, o.L - red.L), W.dust * Math.max(0, red.C - o.C), Math.max(0, o.C - red.C), arcMag, W.gold * arcGold)
}
const HS: number[] = []; for (let H = 352; H < 352 + 88; H += 4) HS.push(H % 360)
const CS = [0.04, 0.06, 0.08, 0.10, 0.12, 0.14, 0.17, 0.20]
const rowsHtml: string[] = []
let total = 0
for (const L of [0.45, 0.50, 0.55, 0.60, 0.65, 0.70, 0.73]) {
  const inG: string[] = [], out: string[] = []
  let n = 0
  for (const H of HS) for (const C of CS) {
    const conf = gateD(L, C, H) <= W.G
    const chip = (show: boolean) => show ? `<span class="chip" title="H${H} C${C}" style="background:${hx(L, C, H)}"></span>` : `<span class="chip gap"></span>`
    inG.push(chip(conf)); out.push(chip(!conf))
    if (conf) n++
  }
  total += n
  rowsHtml.push(`<div class="trow"><div class="tlab">L ${L.toFixed(2)}</div>
  <div class="panel"><div class="phead">conflict (${n})</div><div class="chips">${inG.join('')}</div></div>
  <div class="panel"><div class="phead">clear</div><div class="chips">${out.join('')}</div></div></div>`)
}
const html = `<!doctype html><meta charset="utf-8"><title>C12 — fitted gate</title>
<style>
  body { font: 14px/1.5 -apple-system, sans-serif; margin:0; background:#faf9f7; color:#1a1a1a; }
  .note { padding:.9rem 1.4rem; background:#f2f0ec; font-size:.88rem; }
  .trow { display:flex; gap:1rem; align-items:flex-start; padding:.7rem 1.4rem; border-bottom:1px solid #e5e2dd; }
  .tlab { width:56px; font-weight:700; padding-top:1rem; }
  .panel { }
  .phead { font-size:.7rem; text-transform:uppercase; letter-spacing:.05em; opacity:.6; margin-bottom:.3rem; }
  .chips { display:grid; grid-template-columns: repeat(${CS.length}, 20px); gap:3px; }
  .chip { width:18px; height:18px; border-radius:4px; display:inline-block; }
  .chip.gap { background:transparent; }
</style>
<div class="note"><b>C12 — the fitted conflict gate</b> (fit v5 — 0/67 hard marks, 11/15 fence): dark ×0.65 · light ×1.6 · dust ×1.4 · gold arc ×1.6 · magenta arc ×1 · vivid never exits · radius 0.090.
Panels per lightness slice: hue 352→76 top→bottom, chroma dusty→vivid left→right. LEFT = fires (true conflict, gets the repel). RIGHT = untouched. Total fired cells across slices: ${total}.</div>
${rowsHtml.join('\n')}`
mkdirSync('/Users/emilygerrity/okchroma/render', { recursive: true })
writeFileSync('/Users/emilygerrity/okchroma/render/c12-gate-fitted.html', html)
console.log(`written -> render/c12-gate-fitted.html (fired cells ${total})`)
