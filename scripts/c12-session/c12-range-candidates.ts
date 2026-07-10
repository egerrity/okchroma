// c12-range-candidates.ts — INSTRUMENT A of the restart (2026-07-10): the FIRE-RANGE
// recalibration panels. Owner correction: G .090 too tight ("almost nothing fires").
// Candidates shown as fired/clear identity-chip panels per L-slice (the format of
// c12-gate-fitted.html she already marked on):
//   P… = the v5 point-anchored metric (LIVE redGateDist, her weights) at a wider radius
//   R… = REGION-anchored (her range hypothesis): distance = min metric distance to a
//        "true red" CORE segment along L (red cta −0.08 … +0.02 — dark persists ~3× light)
// Anchor = the apca red signal CTA (the object the wired gate actually compares against).
// She marks over-firing / under-firing cells; the fit script refits from her marks.
import { writeFileSync, mkdirSync } from 'fs'
import { signalScalesFor } from '/Users/emilygerrity/okchroma/src/engine/resolve'
import { hexToOklch, redGateDist, RED_GATE } from '/Users/emilygerrity/okchroma/src/engine/colorMath'
import { clampChromaToGamut, oklchToLinearRgb } from '/Users/emilygerrity/okchroma/src/engine/constraints'

const hx = (L: number, C: number, H: number) => {
  const c = clampChromaToGamut(L, C, H)
  const [rl, gl, bl] = oklchToLinearRgb(L, c, H)
  const gm = (v: number) => { const x = Math.min(1, Math.max(0, v)); return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055 }
  const ch = (v: number) => Math.round(gm(v) * 255).toString(16).padStart(2, '0')
  return `#${ch(rl)}${ch(gl)}${ch(bl)}`
}
const red = signalScalesFor('apca').get('red')!.scale.cta
const CORE: Array<{ L: number; C: number; H: number }> = []
for (let t = -0.08; t <= 0.021; t += 0.01) CORE.push({ L: red.L + t, C: red.C, H: red.H })
const pointD = (c: { L: number; C: number; H: number }) => redGateDist(c, red)
const regionD = (c: { L: number; C: number; H: number }) => Math.min(...CORE.map(a => redGateDist(c, a)))

// F7 = the FINAL 2026-07-10 refit on her 100 marks (0/100 after her eye retired the net
// flips): wDark .70 · wLight 1.6 · wDust 1.4 · wGold 1.6 · G .090 — v5 shape CONFIRMED.
const f7D = (c: { L: number; C: number; H: number }) => {
  const dh = ((c.H - red.H + 540) % 360) - 180
  const meanC = 2 * Math.sqrt(Math.max(0, c.C) * Math.max(0, red.C))
  return Math.hypot(
    0.70 * Math.max(0, red.L - c.L), 1.6 * Math.max(0, c.L - red.L), 1.4 * Math.max(0, red.C - c.C),
    Math.max(0, c.C - red.C), meanC * Math.sin(Math.abs(Math.min(0, dh)) * Math.PI / 360), 1.6 * meanC * Math.sin(Math.max(0, dh) * Math.PI / 360),
  )
}
const CANDS: Array<{ key: string; label: string; d: (c: any) => number; G: number }> = [
  { key: 'F7', label: 'F7 .090 — FINAL refit, 0/100 of your marks (v5 shape confirmed, wDark .70)', d: f7D, G: 0.090 },
  { key: 'P090', label: 'P .090 — wired today (v5)', d: pointD, G: 0.090 },
  { key: 'P110', label: 'P .110 — point anchor, wider', d: pointD, G: 0.110 },
  { key: 'P130', label: 'P .130 — point anchor, wider still', d: pointD, G: 0.130 },
  { key: 'P150', label: 'P .150 — point anchor, widest', d: pointD, G: 0.150 },
  { key: 'R090', label: 'R .090 — REGION core (L −.08…+.02), same radius', d: regionD, G: 0.090 },
  { key: 'R110', label: 'R .110 — REGION core, wider', d: regionD, G: 0.110 },
]

const HS: number[] = []; for (let H = 352; H < 352 + 88; H += 4) HS.push(H % 360)
const CS = [0.04, 0.06, 0.08, 0.10, 0.12, 0.14, 0.17, 0.20]
const LS = [0.45, 0.50, 0.55, 0.60, 0.65, 0.70, 0.73]

const sections: string[] = []
for (const cand of CANDS) {
  const rowsHtml: string[] = []
  let total = 0
  for (const L of LS) {
    const inG: string[] = [], out: string[] = []
    let n = 0
    for (const H of HS) for (const C of CS) {
      const o = hexToOklch(hx(L, C, H))
      const fires = cand.d(o) <= cand.G
      const chip = (show: boolean) => show ? `<span class="chip" title="H${H} C${C} L${L}" style="background:${hx(L, C, H)}"></span>` : `<span class="chip gap"></span>`
      inG.push(chip(fires)); out.push(chip(!fires))
      if (fires) n++
    }
    total += n
    rowsHtml.push(`<div class="trow"><div class="tlab">L ${L.toFixed(2)}</div>
  <div class="panel"><div class="phead">fires (${n})</div><div class="chips">${inG.join('')}</div></div>
  <div class="panel"><div class="phead">clear</div><div class="chips">${out.join('')}</div></div></div>`)
  }
  sections.push(`<h1>${cand.label} — ${total} fired cells</h1>${rowsHtml.join('\n')}`)
  console.log(`${cand.key}: ${total} fired cells`)
}
const html = `<!doctype html><meta charset="utf-8"><title>C12 — fire-range candidates</title>
<style>
  body { font: 14px/1.5 -apple-system, sans-serif; margin:0; background:#faf9f7; color:#1a1a1a; }
  .note { padding:.9rem 1.4rem; background:#f2f0ec; font-size:.88rem; }
  h1 { margin:1.6rem 1.4rem .3rem; font-size:.95rem; }
  .trow { display:flex; gap:1rem; align-items:flex-start; padding:.7rem 1.4rem; border-bottom:1px solid #e5e2dd; }
  .tlab { width:56px; font-weight:700; padding-top:1rem; }
  .phead { font-size:.7rem; text-transform:uppercase; letter-spacing:.05em; opacity:.6; margin-bottom:.3rem; }
  .chips { display:grid; grid-template-columns: repeat(${CS.length}, 20px); gap:3px; }
  .chip { width:18px; height:18px; border-radius:4px; display:inline-block; }
  .chip.gap { background:transparent; }
</style>
<div class="note"><b>C12 — who should FIRE (range recalibration).</b> Same metric (your fitted weights, untouched), candidate boundaries.
Per candidate: panels per lightness slice — hue 352→76 top→bottom, chroma dusty→vivid left→right. LEFT = inside the range (gets treated). RIGHT = untouched.
P = distance from red's cta point (wired today at .090). R = distance from a "true red" core segment (your range idea — red from deeper to brighter, not one point).
Mark cells that should fire but don't / fire but shouldn't — the fit refits from your marks.</div>
${sections.join('\n')}`
mkdirSync('/Users/emilygerrity/okchroma/render', { recursive: true })
writeFileSync('/Users/emilygerrity/okchroma/render/c12-range-candidates.html', html)
console.log('written -> render/c12-range-candidates.html')
