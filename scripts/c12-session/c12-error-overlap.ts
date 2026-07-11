// c12-error-overlap.ts — INSTRUMENT F (owner ruling 2026-07-10 round 3): when the brand's
// FINAL cta sits inside the calibrated ERROR RANGE (Instrument-D core L.45–.55 + edge tier
// L.65–.75), the brand "LOOKS like an error more than red cta does" → RED DARKENS — always,
// both lanes; the coral/lighter variant branch dies. Uncalibrated geometry this page asks her
// to mark: how deep red goes per overlap class, especially the DEEP-CORE case (brand cta
// L≈0.50) where the split window lands red only ~0.05 below the brand.
// Reps = real per-lane brand ctas (live pipeline) beside a darker-red ladder from the lane's
// canonical red cta down to L0.42 (0.45 = her recorded error floor; 0.44/0.42 rungs probe it —
// labels carry the L). Flush pairs, first-clean check per rep. Marks → /marks/error-overlap.
import { writeFileSync, mkdirSync } from 'fs'
import { resolveBrand, signalScalesFor } from '/Users/emilygerrity/okchroma/src/engine/resolve'
import { redGateDist } from '/Users/emilygerrity/okchroma/src/engine/colorMath'
import { p2Diff } from '/Users/emilygerrity/okchroma/src/engine/p2'
import { darkChromaCurve } from '/Users/emilygerrity/okchroma/src/engine/darkChromaCurve'
import { buildContext } from '/Users/emilygerrity/okchroma/src/reqtoken/producers'
import { clampChromaToGamut, oklchToLinearRgb } from '/Users/emilygerrity/okchroma/src/engine/constraints'

const hx = (L: number, C: number, H: number) => {
  const c = clampChromaToGamut(L, C, H)
  const [rl, gl, bl] = oklchToLinearRgb(L, c, H)
  const gm = (v: number) => { const x = Math.min(1, Math.max(0, v)); return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055 }
  const ch = (v: number) => Math.round(gm(v) * 255).toString(16).padStart(2, '0')
  return `#${ch(rl)}${ch(gl)}${ch(bl)}`
}

const REPS: Array<{ hex: string; label: string }> = [
  { hex: '#BD0000', label: 'DEEP CORE (brand cta ≈ L0.50)' },
  { hex: '#FF3D3D', label: 'EDGE TIER vivid (below the arc bar)' },
  { hex: '#E5484D', label: 'EDGE mid (the old seed register)' },
]
const rows: string[] = []
const probe: any[] = []

for (const profile of ['wcag', 'apca'] as const) {
  const p = profile === 'apca' ? 'apca' as const : undefined
  const redSig = signalScalesFor(p).get('red')!
  const redCta = redSig.scale.cta
  const rctx = buildContext(redSig.def.hex, {
    highlight: true, darkChromaCurve, loudCta: true, darkFillMinL: redSig.def.darkFillMinL,
    enforceOnFillContrast: true, suppressRedCool: true, goldBoost: true, contrastProfile: p,
  } as any)
  const redAt = (L: number) => ({ L, C: clampChromaToGamut(L, rctx.cAt('light', L, rctx.brandC), rctx.brandH), H: rctx.brandH })

  for (const rep of REPS) {
    const rb = resolveBrand(rep.hex, 'p', { contrastProfile: p })
    const cta = rb.scale.cta
    const rungs: any[] = []
    const cells: string[] = []
    for (let L = redCta.L; L >= 0.42 - 1e-9; L -= 0.02) {
      const r = redAt(L)
      const p2 = p2Diff(cta, r), gate = redGateDist(cta, r)
      rungs.push({ redL: +L.toFixed(3), p2: +p2.toFixed(3), gate: +gate.toFixed(3), hex: hx(r.L, r.C, r.H) })
      cells.push(`<div class="rung"><input type="checkbox" class="ck" data-id="eo|${profile}|${rep.hex}|L${L.toFixed(2)}">
<div class="rl">red L${L.toFixed(2)} · p2 ${p2.toFixed(3)} · gate ${gate.toFixed(3)}</div>
<div class="pair"><div class="sw" style="background:${hx(r.L, r.C, r.H)}"></div><div class="sw" style="background:${hx(cta.L, cta.C, cta.H)}"></div></div></div>`)
    }
    probe.push({ profile, hex: rep.hex, label: rep.label, brandCta: { L: +cta.L.toFixed(3), hex: hx(cta.L, cta.C, cta.H) }, redCtaL: +redCta.L.toFixed(3), rungs })
    rows.push(`<div class="brand"><div class="bhead">
<div class="sw chip" style="background:${rep.hex}"></div>
<div class="bmeta"><b>${profile.toUpperCase()} · ${rep.hex}</b> — ${rep.label}<br>brand final cta L${cta.L.toFixed(2)} ${hx(cta.L, cta.C, cta.H)} (kept fixed) · ladder = red darkening from canonical L${redCta.L.toFixed(2)} · error floor on record: L0.45</div></div>
<div class="cols"><div class="col">${cells.join('')}</div></div></div>`)
  }
}

const html = `<!doctype html><meta charset="utf-8"><title>C12 — error overlap: how deep does red go</title>
<style>
  body { font: 14px/1.5 -apple-system, sans-serif; margin:0; background:#faf9f7; color:#1a1a1a; }
  .note { padding:.9rem 1.4rem; background:#f2f0ec; font-size:.88rem; }
  .brand { padding:.8rem 1.4rem 1rem; border-bottom:1px solid #e4e1db; }
  .bhead { display:flex; gap:.7rem; align-items:center; margin-bottom:.45rem; }
  .chip { width:44px; height:44px; flex:0 0 44px; }
  .bmeta { font-size:.78rem; opacity:.8; }
  .cols { display:flex; gap:1.8rem; align-items:flex-start; }
  .col { min-width:340px; }
  .rung { display:flex; align-items:center; gap:.55rem; padding:.16rem 0; }
  .ck { width:16px; height:16px; flex:0 0 16px; accent-color:#1a7f37; }
  .rl { font-size:.62rem; opacity:.55; width:150px; }
  .pair { display:flex; }
  .sw { width:110px; height:52px; }
  #save { position:fixed; right:14px; top:10px; font-size:.75rem; padding:.2rem .5rem; }
  #save.bad { background:#b3261e; color:#fff; font-weight:700; opacity:1; }
</style>
<div id="save"></div>
<div class="note"><b>C12 — error-overlap: the brand's cta looks like the error, so RED darkens. How deep?</b>
Each pair, flush: darker-red candidate beside the brand's REAL final cta (live pipeline, per lane).
Check the FIRST rung where red clearly reads as THE error beside the brand — distinct, no vibration.
Rungs run past your L0.45 error floor (0.44 / 0.42) — a pick there is a ruling on the floor.
Leave a rep unchecked if NO depth works (that means red-darker alone can't solve this class — tell me).
Checks save automatically (open via <b>http://localhost:8324/c12-error-overlap.html</b>).</div>
${rows.join('')}
<script>
const cks = [...document.querySelectorAll('.ck')]
const state = () => Object.fromEntries(cks.filter(c => c.checked).map(c => [c.dataset.id, true]))
const save = document.getElementById('save')
const EP = 'http://localhost:8324/marks/error-overlap'
async function push() {
  try {
    const r = await fetch(EP, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ savedAt: new Date().toISOString(), marks: state() }) })
    if (!r.ok) throw new Error()
    save.textContent = 'saved ✓'; save.className = ''
  } catch (e) { save.textContent = 'NOT SAVED — marks server (8324) down'; save.className = 'bad' }
}
cks.forEach(c => c.addEventListener('change', push))
fetch(EP).then(r => r.json()).then(d => {
  const m = (d && d.marks) || {}
  cks.forEach(c => { if (m[c.dataset.id]) c.checked = true })
  save.textContent = Object.keys(m).length ? 'restored ' + Object.keys(m).length + ' ✓' : ''
  save.className = ''
}).catch(() => { save.textContent = 'marks server (8324) not reachable — marks will NOT save'; save.className = 'bad' })
</script>`

mkdirSync('/Users/emilygerrity/okchroma/render', { recursive: true })
writeFileSync('/Users/emilygerrity/okchroma/render/c12-error-overlap.html', html)
writeFileSync('/Users/emilygerrity/okchroma/scripts/c12-session/error-overlap-probe.json',
  JSON.stringify({ date: '2026-07-10', reps: probe }, null, 1))
console.log(`written -> render/c12-error-overlap.html (${probe.length} rep×lane sections)`)
for (const x of probe) console.log(`${x.profile} ${x.hex}: brand cta L${x.brandCta.L} vs red canonical L${x.redCtaL}`)
