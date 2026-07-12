// c12-gate-calibrate.ts v2 — RAW gate calibration (owner 2026-07-10: "without resolving
// anything"). Buttons = raw seed hex vs raw red signal hex. ΔE measured on exactly those two
// raw colors. NO engine resolve, no enforcement, no repel render — the judgment is "does this
// color conflict with red", prior to any machinery. Text pole = display-only best APCA pole.
// Section A: same-distance bands split by composition (VALUE-carried vs HUE-carried vs mixed).
// Section B: full ladder sorted by raw ΔE.
import { writeFileSync, mkdirSync } from 'fs'
import { SIGNALS } from '/Users/emilygerrity/okchroma/src/engine/signals'
import { hexToOklch, oklabDist } from '/Users/emilygerrity/okchroma/src/engine/colorMath'
import { clampChromaToGamut, oklchToLinearRgb, apcaY, apcaLc, encodedChannels } from '/Users/emilygerrity/okchroma/src/engine/constraints'

const hx = (L: number, C: number, H: number) => {
  const c = clampChromaToGamut(L, C, H)
  const [rl, gl, bl] = oklchToLinearRgb(L, c, H)
  const gm = (v: number) => { const x = Math.min(1, Math.max(0, v)); return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055 }
  const ch = (v: number) => Math.round(gm(v) * 255).toString(16).padStart(2, '0')
  return `#${ch(rl)}${ch(gl)}${ch(bl)}`
}
const RED_HEX = SIGNALS.find(s => s.name === 'red')!.hex
const redO = hexToOklch(RED_HEX)
const blackY = apcaY(...encodedChannels(0, 0, 0))
const bestPoleWhite = (hex: string) => {
  const o = hexToOklch(hex)
  const y = apcaY(...encodedChannels(o.L, o.C, o.H))
  return Math.abs(apcaLc(1.0, y)) >= Math.abs(apcaLc(blackY, y))
}
const btn = (bg: string, label: string) => `<div class="btn" style="background:${bg};color:${bestPoleWhite(bg) ? '#fff' : '#000'}">${label}</div>`

type Row = { hex: string; H: number; C: number; L: number; dE: number; dL: number; dAB: number }
const rows: Row[] = []
for (let H = 0; H <= 72; H += 4) for (const C of [0.04, 0.08, 0.12, 0.14, 0.17, 0.20]) for (const L of [0.42, 0.46, 0.5, 0.55, 0.6, 0.65, 0.73, 0.8, 0.84]) {
  const hex = hx(L, C, H)
  const o = hexToOklch(hex)
  const dE = oklabDist(o, redO)
  if (dE >= 0.20 || dE < 0.03) continue
  const rad = (h: number) => h * Math.PI / 180
  const dAB = Math.hypot(o.C * Math.cos(rad(o.H)) - redO.C * Math.cos(rad(redO.H)), o.C * Math.sin(rad(o.H)) - redO.C * Math.sin(rad(redO.H)))
  rows.push({ hex, H, C, L, dE, dL: Math.abs(o.L - redO.L), dAB })
}
rows.sort((a, b) => a.dE - b.dE)

const card = (r: Row) =>
  `<div class="opt"><div class="olabel">H${r.H} C${r.C} L${r.L}<br>ΔE ${r.dE.toFixed(3)}</div>${btn(r.hex, 'Primary action')}${btn(RED_HEX, 'Delete')}</div>`

// Section A: composition split per band
const outA: string[] = []
for (const [lo, hi] of [[0.06, 0.08], [0.08, 0.10], [0.10, 0.12], [0.12, 0.14], [0.14, 0.16]] as const) {
  const band = rows.filter(r => r.dE >= lo && r.dE < hi)
  const groups: Array<[string, (r: Row) => boolean]> = [
    ['VALUE-carried — same hue family, different depth', r => r.dL * r.dL >= 0.6 * r.dE * r.dE],
    ['HUE/CHROMA-carried — different color, similar depth', r => r.dAB * r.dAB >= 0.6 * r.dE * r.dE],
    ['mixed', r => r.dL * r.dL < 0.6 * r.dE * r.dE && r.dAB * r.dAB < 0.6 * r.dE * r.dE],
  ]
  outA.push(`<h2>band ΔE ${lo.toFixed(2)}–${hi.toFixed(2)}</h2>`)
  for (const [label, pred] of groups) {
    const g = band.filter(pred).slice(0, 6).sort((x, y) => x.H - y.H)
    if (!g.length) continue
    outA.push(`<div class="ghead2">${label}</div>`, ...g.map(card))
  }
}
// Section B: ladder, ~6 per 0.01 band
const bands = new Map<number, Row[]>()
for (const r of rows) {
  const b = Math.floor(r.dE * 100)  // B ladder now reaches 0.19
  const list = bands.get(b) ?? []
  if (list.length < 6) { list.push(r); bands.set(b, list) }
}
const outB: string[] = []
for (const [b, list] of [...bands.entries()].sort((x, y) => x[0] - y[0])) {
  outB.push(`<h2>ΔE 0.${String(b).padStart(2, '0')}–0.${String(b + 1).padStart(2, '0')}</h2>`, ...list.sort((x, y) => x.H - y.H).map(card))
}

// Section C v2 (owner 3D model 2026-07-10): SIX single-axis ladders straight out from red —
// darker / lighter / dustier / vivider / magenta-ward / gold-ward. She marks each edge; the
// six semi-axis lengths fit the asymmetric 3D gate.
const axisCard = (label: string, L: number, C: number, H: number) => {
  const o = hexToOklch(hx(L, C, H))
  const d = oklabDist(o, redO)
  return `<div class="opt"><div class="olabel">${label}<br>ΔE ${d.toFixed(3)}</div>${btn(hx(L, C, H), 'Primary action')}${btn(RED_HEX, 'Delete')}</div>`
}
const outC: string[] = []
outC.push('<h2>darker — L down, C/H red\'s</h2>')
for (let L = redO.L - 0.02; L >= 0.36; L -= 0.02) outC.push(axisCard(`L ${L.toFixed(2)}`, L, redO.C, redO.H))
outC.push('<h2>lighter — L up</h2>')
for (let L = redO.L + 0.02; L <= 0.88; L += 0.02) outC.push(axisCard(`L ${L.toFixed(2)}`, L, redO.C, redO.H))
outC.push('<h2>dustier — C down</h2>')
for (let C = redO.C - 0.015; C >= 0.02; C -= 0.015) outC.push(axisCard(`C ${C.toFixed(3)}`, redO.L, C, redO.H))
outC.push('<h2>vivider — C up (gamut-capped)</h2>')
for (let C = redO.C + 0.015; C <= 0.30; C += 0.015) outC.push(axisCard(`C ${C.toFixed(3)}`, redO.L, C, redO.H))
outC.push('<h2>magenta-ward — H down</h2>')
for (let H = redO.H - 4; H >= redO.H - 44; H -= 4) outC.push(axisCard(`H ${H.toFixed(0)}`, redO.L, redO.C, (H + 360) % 360))
outC.push('<h2>gold-ward — H up</h2>')
for (let H = redO.H + 4; H <= redO.H + 44; H += 4) outC.push(axisCard(`H ${H.toFixed(0)}`, redO.L, redO.C, H))
const html = `<!doctype html><meta charset="utf-8"><title>C12 — raw conflict calibration</title>
<style>
  body { font: 14px/1.5 -apple-system, sans-serif; margin:0; background:#faf9f7; color:#1a1a1a; }
  .note { padding:.9rem 1.4rem; background:#f2f0ec; font-size:.88rem; }
  h1 { margin:1.4rem 1.4rem .2rem; font-size:1rem; }
  h2 { margin:1.1rem 1.4rem .4rem; font-size:.85rem; letter-spacing:.04em; }
  .ghead2 { margin:.6rem 1.4rem .2rem; font-size:.72rem; text-transform:uppercase; letter-spacing:.05em; opacity:.65; }
  .opt { margin:.3rem 1.4rem .3rem 1.4rem; padding:.5rem .7rem; border-radius:8px; background:#fff; display:inline-flex; gap:.5rem; align-items:center; margin-right:.6rem; }
  .olabel { font-size:.63rem; text-transform:uppercase; letter-spacing:.04em; opacity:.6; width:80px; }
  .btn { padding:.45rem 1rem; border-radius:999px; font-weight:700; font-size:.8rem; }
</style>
<div class="note"><b>C12 — RAW conflict calibration.</b> Buttons = raw seed hex vs raw red signal ${RED_HEX}. NOTHING resolved — no enforcement, no repel, no engine.
ΔE measured on the raw pair. Scroll until pairs stop reading as confusable-with-red — that's the gate.</div>
<h1>A — same distance, different composition</h1>
${outA.join('\n')}
<h1>C — six axis ladders from red (mark each edge)</h1>
<div class="note">Single-axis walks straight out from red ${RED_HEX}. Mark where each stops being confusable — six edges = the 3D gate's semi-axes (dark long · light short · dust shortest · vivid long, per your model — confirm or correct).</div>
${outC.join('\n')}
<h1>B — the full ladder</h1>
${outB.join('\n')}`
mkdirSync('/Users/emilygerrity/okchroma/render', { recursive: true })
writeFileSync('/Users/emilygerrity/okchroma/render/c12-gate-calibrate.html', html)
console.log(`written -> render/c12-gate-calibrate.html (${rows.length} raw pairs)`)
