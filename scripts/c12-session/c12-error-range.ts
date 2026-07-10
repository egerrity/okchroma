// c12-error-range.ts — INSTRUMENT D (owner gap-call 2026-07-10): "we don't have an
// established range of reds that I would choose to be errors."
// The P1 CATEGORY calibration: each cell = a lone Delete button in a color — NO red anchor
// beside it, NO distance labels, nothing to lean on. She checks every color she would ACCEPT
// as the error color. Broad agnostic red-territory sweep (magenta edge -> orange edge, dusty
// -> vivid, deep -> light), deduped after gamut clamp. Checks live-save via the marks server
// (POST /marks/error-range -> error-range-checks.json). Light mode only — dark derives.
import { writeFileSync, mkdirSync } from 'fs'
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
const HS = [344, 352, 0, 8, 16, 24, 32, 40, 48, 56]
const CS = [0.08, 0.12, 0.16, 0.20]
const LS = [0.35, 0.45, 0.55, 0.65, 0.75]

const seen = new Set<string>()
let cells = 0, dupes = 0
const sections: string[] = []
for (const L of LS) {
  const rows: string[] = []
  for (const H of HS) {
    const cols: string[] = []
    for (const C of CS) {
      const hex = hx(L, C, H)
      if (seen.has(hex)) { dupes++; cols.push('<div class="cell gap"></div>'); continue }
      seen.add(hex)
      cells++
      const white = whiteTextLcAt(L, clampChromaToGamut(L, C, H), H) >= bLcAt(L, C, H)
      cols.push(`<label class="cell"><div class="btn" style="background:${hex};color:${white ? '#fff' : '#000'}">Delete</div>
<span class="meta"><input type="checkbox" class="ck" data-id="H${H}|C${C}|L${L}"> H${H} C${C} L${L}</span></label>`)
    }
    rows.push(`<div class="hrow">${cols.join('')}</div>`)
  }
  sections.push(`<h1>L ${L.toFixed(2)}</h1><div class="slice">${rows.join('')}</div>`)
}
const html = `<!doctype html><meta charset="utf-8"><title>C12 — error range</title>
<style>
  body { font: 14px/1.5 -apple-system, sans-serif; margin:0; background:#faf9f7; color:#1a1a1a; }
  .note { padding:.9rem 1.4rem; background:#f2f0ec; font-size:.88rem; }
  h1 { margin:1.6rem 1.4rem .4rem; font-size:.95rem; }
  .slice { padding:0 1.4rem 1rem; }
  .hrow { display:flex; gap:1.1rem; margin-bottom:.85rem; }
  .cell { display:flex; flex-direction:column; gap:.2rem; align-items:flex-start; cursor:pointer; width:130px; }
  .cell.gap { visibility:hidden; }
  .btn { padding:.55rem 1.6rem; border-radius:8px; font-size:.85rem; font-weight:600; }
  .meta { font-size:.62rem; opacity:.55; display:flex; align-items:center; gap:.3rem; }
  .ck { width:15px; height:15px; accent-color:#1a7f37; }
  #save { position:fixed; right:14px; top:10px; font-size:.72rem; opacity:.7; background:#faf9f7; padding:2px 6px; }
</style>
<div id="save"></div>
<div class="note"><b>C12 — the error range.</b> Check every color you would ACCEPT as the error color (a destructive action).
Each button stands alone — judge it by itself, not against anything. Click anywhere on a cell to toggle.
Checks save automatically (open via <b>http://localhost:8324/c12-error-range.html</b>).</div>
${sections.join('\n')}
<script>
// absolute endpoint: saves work no matter which port serves the page (marks server has CORS)
const EP = 'http://localhost:8324/marks/error-range'
const cks = [...document.querySelectorAll('.ck')]
const state = () => Object.fromEntries(cks.filter(c => c.checked).map(c => [c.dataset.id, true]))
const save = document.getElementById('save')
async function push() {
  try {
    const r = await fetch(EP, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ savedAt: new Date().toISOString(), marks: state() }) })
    save.textContent = r.ok || r.status === 204 ? 'saved ✓' : 'NOT SAVED — is the marks server up?'
  } catch (e) { save.textContent = 'NOT SAVED — marks server (8324) not reachable' }
}
cks.forEach(c => c.addEventListener('change', push))
fetch(EP).then(r => r.json()).then(d => {
  const m = (d && d.marks) || {}
  cks.forEach(c => { if (m[c.dataset.id]) c.checked = true })
  save.textContent = Object.keys(m).length ? 'restored ' + Object.keys(m).length + ' ✓' : ''
}).catch(() => { save.textContent = 'marks server (8324) not reachable' })
</script>`
mkdirSync('/Users/emilygerrity/okchroma/render', { recursive: true })
writeFileSync('/Users/emilygerrity/okchroma/render/c12-error-range.html', html)
console.log(`written -> render/c12-error-range.html (${cells} cells, ${dupes} gamut-dupes hidden)`)
