// c12-delivery-ladders.ts — INSTRUMENT C v2 (owner requests 2026-07-10, redo after the
// True-Tone void): DELIVERY distance per direction, raw pairs.
//   1. dead-zone boundaries stay as PLAIN LINES — no text on them ("coloring my decisions")
//   2. the pair is FLUSH: [candidate][red], bare color blocks, no gap, no button text
//   3. checkboxes per rung — state saves live to scripts/c12-session/ladder-checks.json via
//      the marks server (scripts/c12-session/c12-marks-server.py, port 8324); she marks, I read.
// She marks the FIRST rung that reads truly different, per direction, per column.
import { writeFileSync, mkdirSync } from 'fs'
import { signalScalesFor } from '/Users/emilygerrity/okchroma/src/engine/resolve'
import { redGateDist } from '/Users/emilygerrity/okchroma/src/engine/colorMath'
import { whiteTextLcAt, apcaYAt } from '/Users/emilygerrity/okchroma/src/reqtoken/producers'
import { clampChromaToGamut, oklchToLinearRgb, apcaLc } from '/Users/emilygerrity/okchroma/src/engine/constraints'

const hx = (L: number, C: number, H: number) => {
  const c = clampChromaToGamut(L, C, H)
  const [rl, gl, bl] = oklchToLinearRgb(L, c, H)
  const gm = (v: number) => { const x = Math.min(1, Math.max(0, v)); return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055 }
  const ch = (v: number) => Math.round(gm(v) * 255).toString(16).padStart(2, '0')
  return `#${ch(rl)}${ch(gl)}${ch(bl)}`
}
const bLcAt = (L: number, C: number, H: number) => Math.abs(apcaLc(apcaYAt(0, 0, 0), apcaYAt(L, C, H)))
const wLcAt = (L: number, C: number, H: number) => whiteTextLcAt(L, clampChromaToGamut(L, C, H), H)
const red = signalScalesFor('apca').get('red')!.scale.cta
const redDark = signalScalesFor('apca').get('red')!.scale.ctaDark

const COLS: Array<{ H: number; C: number }> = [
  { H: 16, C: 0.18 }, { H: 28, C: 0.20 }, { H: 36, C: 0.20 }, { H: 36, C: 0.14 }, { H: 44, C: 0.17 },
]
const bound = (C: number, H: number, white: boolean) => {
  let lo = 0.3, hi = 0.95
  for (let i = 0; i < 30; i++) {
    const m = (lo + hi) / 2
    const pass = white ? wLcAt(m, C, H) >= 60 : bLcAt(m, C, H) >= 60
    if (white) { pass ? (lo = m) : (hi = m) } else { pass ? (hi = m) : (lo = m) }
  }
  return white ? lo : hi
}
const rung = (id: string, L: number, C: number, H: number, anchor: { L: number; C: number; H: number }) => {
  const o = { L, C: clampChromaToGamut(L, C, H), H }
  const w = wLcAt(L, C, H), b = bLcAt(L, C, H)
  return `<div class="rung"><input type="checkbox" class="ck" data-id="${id}">
<div class="rl">ΔL ${(L - anchor.L) >= 0 ? '+' : ''}${(L - anchor.L).toFixed(2)} · gate ${redGateDist(o, anchor).toFixed(3)} · Lc ${Math.max(w, b).toFixed(0)}</div>
<div class="pair"><div class="sw" style="background:${hx(L, C, H)}"></div><div class="sw" style="background:${hx(anchor.L, anchor.C, anchor.H)}"></div></div></div>`
}
const ladder = (mode: string, H: number, C: number, anchor: { L: number; C: number; H: number }, up: boolean) => {
  const wTop = bound(C, H, true), bBot = bound(C, H, false)
  const out: string[] = []
  let sepW = false, sepB = false
  for (let i = 1; i <= 16; i++) {
    const L = anchor.L + (up ? i : -i) * 0.02
    if (L < 0.2 || L > 0.95) break
    if (up && !sepW && L > wTop) { out.push('<div class="sepline"></div>'); sepW = true }
    if (up && !sepB && L > bBot) { out.push('<div class="sepline"></div>'); sepB = true }
    out.push(rung(`${mode}|H${H}|C${C}|${up ? 'up' : 'down'}|${(up ? '+' : '-')}${(i * 0.02).toFixed(2)}`, L, C, H, anchor))
  }
  return `<div class="col"><div class="chead">H${H} C${C} · ${up ? 'UP (lighter)' : 'DOWN (deeper)'}</div>${out.join('')}</div>`
}
const section = (mode: string, anchor: { L: number; C: number; H: number }, title: string) => `
<h1>${title}</h1>
<div class="cols">${COLS.map(c => ladder(mode, c.H, c.C, anchor, true)).join('')}</div>
<div class="cols">${COLS.map(c => ladder(mode, c.H, c.C, anchor, false)).join('')}</div>`

const html = `<!doctype html><meta charset="utf-8"><title>C12 — delivery ladders</title>
<style>
  body { font: 14px/1.5 -apple-system, sans-serif; margin:0; background:#faf9f7; color:#1a1a1a; }
  .note { padding:.9rem 1.4rem; background:#f2f0ec; font-size:.88rem; }
  h1 { margin:1.6rem 1.4rem .4rem; font-size:.95rem; }
  .cols { display:flex; gap:1.6rem; padding:.6rem 1.4rem 1.2rem; align-items:flex-start; overflow-x:auto; }
  .col { min-width:330px; }
  .chead { font-size:.72rem; font-weight:700; text-transform:uppercase; letter-spacing:.05em; opacity:.65; margin-bottom:.4rem; }
  .rung { display:flex; align-items:center; gap:.55rem; padding:.18rem 0; }
  .ck { width:16px; height:16px; flex:0 0 16px; accent-color:#1a7f37; }
  .rl { font-size:.62rem; opacity:.55; width:135px; }
  .pair { display:flex; }
  .sw { width:110px; height:56px; }
  .sepline { border-top:1.5px solid #b9b4ac; margin:.45rem 0 .45rem 24px; }
  .dark { background:#141416; color:#e8e8e8; }
  .dark .note { background:#1e1e22; color:#d5d5d5; }
  .dark h1 { color:#e8e8e8; }
  .dark .sepline { border-top-color:#4a4a50; }
  #save { position:fixed; right:14px; top:10px; font-size:.72rem; opacity:.7; }
</style>
<div id="save"></div>
<div class="note"><b>C12 — how far is "truly different", per direction.</b> Raw pairs, flush: candidate beside canonical red, dL 0.02 rungs outward from red's cta.
Check the FIRST rung that reads truly different — per direction (up/down), per column if it differs. Checks save automatically (open this page via <b>http://localhost:8324/c12-delivery-ladders.html</b>).</div>
${section('light', red, 'LIGHT mode — vs red cta')}
<div class="dark">${section('dark', redDark, 'DARK mode — vs red dark cta (on dark ground)')}</div>
<script>
const cks = [...document.querySelectorAll('.ck')]
const state = () => Object.fromEntries(cks.filter(c => c.checked).map(c => [c.dataset.id, true]))
const save = document.getElementById('save')
async function push() {
  try {
    await fetch('/ladder-marks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ savedAt: new Date().toISOString(), marks: state() }) })
    save.textContent = 'saved ✓'
  } catch (e) { save.textContent = 'NOT SAVED — open via localhost:8324' }
}
cks.forEach(c => c.addEventListener('change', push))
fetch('/ladder-marks').then(r => r.json()).then(d => {
  const m = (d && d.marks) || {}
  cks.forEach(c => { if (m[c.dataset.id]) c.checked = true })
  save.textContent = Object.keys(m).length ? 'restored ' + Object.keys(m).length + ' ✓' : ''
}).catch(() => { save.textContent = 'marks server not reachable — open via localhost:8324' })
</script>`
mkdirSync('/Users/emilygerrity/okchroma/render', { recursive: true })
writeFileSync('/Users/emilygerrity/okchroma/render/c12-delivery-ladders.html', html)
console.log('written -> render/c12-delivery-ladders.html (v2: flush pairs, mute zone lines, live checkboxes)')
