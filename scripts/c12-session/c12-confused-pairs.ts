// c12-confused-pairs.ts — INSTRUMENT G (owner ask 2026-07-10: "show me a bunch of ones you
// are confused about and i will tell you if they are right or wrong"). Current WIRED engine
// output, one pair per row (effective red cta beside brand final cta, live pipeline, per
// lane), RIGHT / WRONG verdict boxes. The confused classes: deep core reds near red's hue
// (her BD0000 ruling: should go DARKER — not red-coral, not lighten), the magenta-side deeps
// (where does "noticeably magenta → lighten" begin), and the edge-tier vivids the arc bar
// misses (FF3D3D/E5484D). Marks → /marks/confused-pairs.
import { writeFileSync, mkdirSync } from 'fs'
import { resolveBrand, signalScalesFor } from '/Users/emilygerrity/okchroma/src/engine/resolve'
import { hexToOklch, maxChromaAt } from '/Users/emilygerrity/okchroma/src/engine/colorMath'
import { clampChromaToGamut, oklchToLinearRgb } from '/Users/emilygerrity/okchroma/src/engine/constraints'

const hx = (L: number, C: number, H: number) => {
  const c = clampChromaToGamut(L, C, H)
  const [rl, gl, bl] = oklchToLinearRgb(L, c, H)
  const gm = (v: number) => { const x = Math.min(1, Math.max(0, v)); return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055 }
  const ch = (v: number) => Math.round(gm(v) * 255).toString(16).padStart(2, '0')
  return `#${ch(rl)}${ch(gl)}${ch(bl)}`
}

// the confused population: named cases + agnostic deep/magenta/edge sweep
const seeds: string[] = ['#BD0000', '#FF3D3D', '#E5484D']
for (const H of [12, 18, 24, 30, 36]) {
  for (const L of [0.44, 0.50, 0.56]) {
    const hex = hx(L, 0.9 * maxChromaAt(L, H), H).toUpperCase()
    if (!seeds.includes(hex)) seeds.push(hex)
  }
}

const canon: Record<string, { L: number; C: number; H: number }> = {
  wcag: signalScalesFor(undefined).get('red')!.scale.cta,
  apca: signalScalesFor('apca').get('red')!.scale.cta,
}

const rows: any[] = []
const probe: any[] = []
for (const profile of ['wcag', 'apca'] as const) {
  const p = profile === 'apca' ? 'apca' as const : undefined
  for (const hex of seeds) {
    const seed = hexToOklch(hex)
    const rb = resolveBrand(hex, 'p', { contrastProfile: p })
    const cta = rb.scale.cta
    const ov = rb.signalOverrides.find(o => o.name === 'red')
    const treat = [
      rb.redRepel?.light ? `brand exit ${cta.L > seed.L + 0.005 ? '↑' : cta.L < seed.L - 0.005 ? '↓' : '·'} L${cta.L.toFixed(2)}` : `brand kept L${cta.L.toFixed(2)}`,
      ov ? ov.note : 'red canonical',
    ].join(' · ')
    probe.push({ profile, hex, seedL: +seed.L.toFixed(3), seedH: +seed.H.toFixed(1), treat })
    rows.push({ profile, hex, seed, cta, ov, treat })
  }
}

const rowHtml = rows.map((r: any) => {
  const red = r.ov ? r.ov.scale.cta : canon[r.profile]
  const id = `cp|${r.profile}|${r.hex}`
  return `<div class="row">
<label class="vd"><input type="checkbox" class="ck right" data-id="${id}|right">✓</label>
<label class="vd"><input type="checkbox" class="ck wrong" data-id="${id}|wrong">✗</label>
<div class="rl"><b>${r.hex}</b> ${r.profile.toUpperCase()} · seed L${r.seed.L.toFixed(2)} H${r.seed.H.toFixed(0)}<br>${r.treat}</div>
<div class="pair"><div class="sw" style="background:${hx(red.L, red.C, red.H)}"></div><div class="sw" style="background:${hx(r.cta.L, r.cta.C, r.cta.H)}"></div><div class="sw chip" style="background:${r.hex}" title="brand ID (exact)"></div></div>
<select class="why" data-id="${id}|why">
<option value="">why…</option>
<option>brand should go darker</option>
<option>brand darker + red stays (never lighter)</option>
<option>brand should go lighter</option>
<option>brand shouldn't move</option>
<option>brand moved too far</option>
<option>red should darken</option>
<option>red shouldn't move</option>
<option>red not far enough</option>
<option>still too similar</option>
<option>red doesn't read as THE error</option>
<option>other (say in chat)</option>
</select></div>`
}).join('')

const html = `<!doctype html><meta charset="utf-8"><title>C12 — right or wrong</title>
<style>
  body { font: 14px/1.5 -apple-system, sans-serif; margin:0; background:#faf9f7; color:#1a1a1a; }
  .note { padding:.9rem 1.4rem; background:#f2f0ec; font-size:.88rem; }
  .rows { padding:.8rem 1.4rem; display:flex; flex-direction:column; gap:.5rem; }
  .row { display:flex; align-items:center; gap:.6rem; }
  .vd { display:flex; align-items:center; gap:.2rem; font-size:.8rem; }
  .ck { width:16px; height:16px; accent-color:#1a7f37; }
  .ck.wrong { accent-color:#b3261e; }
  .rl { font-size:.64rem; opacity:.6; width:230px; line-height:1.5; }
  .pair { display:flex; }
  .sw { width:150px; height:60px; }
  .chip { width:60px; flex:0 0 60px; margin-left:.8rem; }
  .why { display:none; font-size:.72rem; max-width:190px; margin-left:.6rem; }
  .row.no .why { display:inline-block; }
  #save { position:fixed; right:14px; top:10px; font-size:.75rem; padding:.2rem .5rem; }
  #save.bad { background:#b3261e; color:#fff; font-weight:700; opacity:1; }
</style>
<div id="save"></div>
<div class="note"><b>C12 — current engine output, v2 (C6 render cooling REMOVED — ctas keep identity hue).</b> Left = the red cta that ships (variant or canonical) · middle = the brand's final cta · right chip = the exact brand ID.
Mark ✓ right or ✗ wrong per row; ✗ reveals the why dropdown. Fresh marks (your v1 verdicts are archived). Saves via <b>http://localhost:8324/c12-confused-pairs.html</b>.</div>
<div class="rows">${rowHtml}</div>
<script>
const cks = [...document.querySelectorAll('.ck')]
const whys = [...document.querySelectorAll('.why')]
const state = () => Object.fromEntries([
  ...cks.filter(c => c.checked).map(c => [c.dataset.id, true]),
  ...whys.filter(s => s.value).map(s => [s.dataset.id, s.value]),
])
const save = document.getElementById('save')
const EP = 'http://localhost:8324/marks/confused-pairs-v2'
function pairOf(c) { const base = c.dataset.id.replace(/\\|(right|wrong)$/, ''); return cks.filter(o => o !== c && o.dataset.id.startsWith(base + '|')) }
function syncWhy(row) { row.classList.toggle('no', !!row.querySelector('.ck.wrong').checked) }
async function push() {
  try {
    const r = await fetch(EP, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ savedAt: new Date().toISOString(), marks: state() }) })
    if (!r.ok) throw new Error()
    save.textContent = 'saved ✓'; save.className = ''
  } catch (e) { save.textContent = 'NOT SAVED — marks server (8324) down'; save.className = 'bad' }
}
cks.forEach(c => c.addEventListener('change', () => {
  if (c.checked) pairOf(c).forEach(o => { o.checked = false })
  syncWhy(c.closest('.row'))
  push()
}))
whys.forEach(s => s.addEventListener('change', push))
fetch(EP).then(r => r.json()).then(d => {
  const m = (d && d.marks) || {}
  cks.forEach(c => { if (m[c.dataset.id]) c.checked = true })
  whys.forEach(s => { if (typeof m[s.dataset.id] === 'string') s.value = m[s.dataset.id] })
  document.querySelectorAll('.row').forEach(syncWhy)
  save.textContent = Object.keys(m).length ? 'restored ' + Object.keys(m).length + ' ✓' : ''
  save.className = ''
}).catch(() => { save.textContent = 'marks server (8324) not reachable — marks will NOT save'; save.className = 'bad' })
</script>`

mkdirSync('/Users/emilygerrity/okchroma/render', { recursive: true })
writeFileSync('/Users/emilygerrity/okchroma/render/c12-confused-pairs.html', html)
writeFileSync('/Users/emilygerrity/okchroma/scripts/c12-session/confused-pairs-probe.json', JSON.stringify({ date: '2026-07-10', rows: probe }, null, 1))
console.log(`written -> render/c12-confused-pairs.html (${probe.length} rows)`)
