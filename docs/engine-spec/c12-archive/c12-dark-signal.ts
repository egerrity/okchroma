// c12-dark-signal.ts — DARK-MODE visualize (owner 2026-07-10: "add the same mechanism we use
// to make things dark mode to the signal ctas — visualize first"). The gap she caught: the
// per-brand red VARIANT is LIGHT-ONLY — its dark cta stays canonical red, so in dark the
// error signal is mode-inconsistent AND collides with the brand's (prominence-floored) dark
// cta. This page shows, per near-red brand, on a DARK ground (her rule), the brand's dark cta
// (the button) beside three candidate dark red-signal ctas:
//   A NOW      — canonical red dark (what ships; frozen, ignores the light variant)
//   B FLOORED  — the variant run through the dark mechanism AS-IS (prominence floor) — the
//                literal reading of her ask; COLLAPSES: every deep variant floors back to
//                the same bright salmon at L0.70, on top of the brand cta.
//   C CARRIED  — the variant delta-carried (kept at its light depth) — preserves the light
//                separation, but a deep/quiet dark button.
// Brands whose light solve needed NO red variant still collide in dark (brand cta floored up
// next to canonical red) — flagged: they have no variant to carry, so they need their own
// dark answer. Marks (optional) → /marks/dark-signal.
import { writeFileSync, mkdirSync } from 'fs'
import { resolveBrand, signalScalesFor } from '/Users/emilygerrity/okchroma/src/engine/resolve'
import { p2Diff } from '/Users/emilygerrity/okchroma/src/engine/p2'
import { hexToOklch, maxChromaAt } from '/Users/emilygerrity/okchroma/src/engine/colorMath'
import { clampChromaToGamut, oklchToLinearRgb } from '/Users/emilygerrity/okchroma/src/engine/constraints'

const hx = (L: number, C: number, H: number) => {
  const c = clampChromaToGamut(L, C, H)
  const [rl, gl, bl] = oklchToLinearRgb(L, c, H)
  const gm = (v: number) => { const x = Math.min(1, Math.max(0, v)); return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055 }
  const ch = (v: number) => Math.round(gm(v) * 255).toString(16).padStart(2, '0')
  return `#${ch(rl)}${ch(gl)}${ch(bl)}`
}

const seeds: string[] = ['#FF2600', '#BD0000', '#CC2631', '#E5484D', '#FF3D3D', '#D0021B']
for (const H of [16, 24, 32]) for (const L of [0.50, 0.60]) {
  const hex = hx(L, 0.9 * maxChromaAt(L, H), H).toUpperCase()
  if (!seeds.includes(hex)) seeds.push(hex)
}

const rows: string[] = []
const probe: any[] = []
for (const profile of ['wcag', 'apca'] as const) {
  const p = profile === 'apca' ? 'apca' as const : undefined
  for (const hex of seeds) {
    const rb = resolveBrand(hex, 'p', { contrastProfile: p })
    const red = signalScalesFor(p).get('red')!.scale
    const ov = rb.signalOverrides.find(o => o.name === 'red')
    const bL = rb.scale.cta, bD = rb.scale.ctaDark
    const rLnow = ov ? ov.scale.cta : red.cta
    const A = ov ? ov.scale.ctaDark : red.ctaDark   // = canonical dark either way (variant is light-only)
    let B: any = null, C: any = null
    if (ov) {
      const vLightHex = hx(ov.scale.cta.L, ov.scale.cta.C, ov.scale.cta.H)
      B = resolveBrand(vLightHex, 'v', { exact: true, contrastProfile: p }).scale.ctaDark  // prominence-floored
      C = { L: ov.scale.cta.L, C: ov.scale.cta.C, H: ov.scale.cta.H }                        // delta-carried (verbatim depth)
    }
    const pair = (redSw: any, label: string, id: string) => `<div class="cand">
<div class="clab">${label}</div>
<div class="pair"><div class="sw" style="background:${hx(redSw.L, redSw.C, redSw.H)}"></div><div class="sw" style="background:${hx(bD.L, bD.C, bD.H)}"></div></div>
<div class="pm">p2 ${p2Diff(bD, redSw).toFixed(3)}</div>
<input type="checkbox" class="ck" data-id="${id}"></div>`
    const id0 = `ds|${profile}|${hex}`
    probe.push({ profile, hex, variant: !!ov, brandD: +bD.L.toFixed(3), A_p2: +p2Diff(bD, A).toFixed(3), B_p2: B ? +p2Diff(bD, B).toFixed(3) : null, C_p2: C ? +p2Diff(bD, C).toFixed(3) : null })
    rows.push(`<div class="brand">
<div class="bhead"><div class="sw idsw" style="background:${hex}"></div>
<div class="bmeta"><b>${hex}</b> ${profile.toUpperCase()} · light: brand ${hx(bL.L, bL.C, bL.H)} ${rb.redRepel?.light ? '(exited)' : '(kept)'} · red ${hx(rLnow.L, rLnow.C, rLnow.H)} ${ov ? '(variant)' : '(canonical)'}<br>
DARK: brand cta ${hx(bD.L, bD.C, bD.H)} L${bD.L.toFixed(2)} — the button each red-dark must read distinct from</div></div>
<div class="cands">
${pair(A, 'A · NOW (frozen canonical)', id0 + '|A')}
${ov ? pair(B, 'B · FLOORED (through dark mech)', id0 + '|B') : '<div class="cand none">no variant → nothing to floor/carry.<br>brand cta still collides w/ canonical red in dark — needs its own answer</div>'}
${ov ? pair(C, 'C · CARRIED (kept at light depth)', id0 + '|C') : ''}
</div></div>`)
  }
}

const html = `<!doctype html><meta charset="utf-8"><title>C12 — dark-mode signal cta</title>
<style>
  body { font: 14px/1.5 -apple-system, sans-serif; margin:0; background:#141416; color:#e8e8e8; }
  .note { padding:.9rem 1.4rem; background:#1e1e22; font-size:.88rem; color:#d5d5d5; }
  .brand { padding:.85rem 1.4rem 1rem; border-bottom:1px solid #2a2a30; }
  .bhead { display:flex; gap:.7rem; align-items:center; margin-bottom:.5rem; }
  .idsw { width:44px; height:44px; flex:0 0 44px; border-radius:6px; }
  .bmeta { font-size:.76rem; opacity:.85; }
  .cands { display:flex; gap:2rem; align-items:flex-start; flex-wrap:wrap; }
  .cand { display:flex; flex-direction:column; gap:.25rem; }
  .cand.none { font-size:.72rem; opacity:.6; max-width:230px; padding-top:.6rem; }
  .clab { font-size:.66rem; text-transform:uppercase; letter-spacing:.04em; opacity:.6; }
  .pair { display:flex; }
  .sw { width:120px; height:60px; }
  .pm { font-size:.64rem; opacity:.55; }
  .ck { width:16px; height:16px; accent-color:#4ea1ff; margin-top:.15rem; }
  #save { position:fixed; right:14px; top:10px; font-size:.75rem; padding:.2rem .5rem; }
  #save.bad { background:#b3261e; color:#fff; font-weight:700; }
</style>
<div id="save"></div>
<div class="note"><b>C12 — the dark-mode error-signal cta. Each pair = [red-signal dark cta][brand dark cta button], on dark ground.</b>
Every red-dark candidate must read clearly distinct from the brand button beside it.
<b>A</b> = what ships now (frozen canonical red — mode-inconsistent, the collision you saw). <b>B</b> = the variant run through the dark mechanism as-is (prominence floor) — note it collapses toward the brand. <b>C</b> = the variant kept at its light depth (delta-carry) — separates, but a deeper/quieter button.
Check the candidate that reads right per row (optional). Saves via <b>http://localhost:8324/c12-dark-signal.html</b>.</div>
${rows.join('')}
<script>
const cks=[...document.querySelectorAll('.ck')]
const save=document.getElementById('save'); const EP='http://localhost:8324/marks/dark-signal'
async function push(){try{const r=await fetch(EP,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({savedAt:new Date().toISOString(),marks:Object.fromEntries(cks.filter(c=>c.checked).map(c=>[c.dataset.id,true]))})});if(!r.ok)throw 0;save.textContent='saved ✓';save.className=''}catch(e){save.textContent='NOT SAVED — marks server (8324) down';save.className='bad'}}
cks.forEach(c=>c.addEventListener('change',push))
fetch(EP).then(r=>r.json()).then(d=>{const m=(d&&d.marks)||{};cks.forEach(c=>{if(m[c.dataset.id])c.checked=true});save.textContent=Object.keys(m).length?'restored '+Object.keys(m).length+' ✓':''}).catch(()=>{save.textContent='marks server (8324) not reachable';save.className='bad'})
</script>`

mkdirSync('/Users/emilygerrity/okchroma/render', { recursive: true })
writeFileSync('/Users/emilygerrity/okchroma/render/c12-dark-signal.html', html)
writeFileSync('/Users/emilygerrity/okchroma/scripts/c12-session/dark-signal-probe.json', JSON.stringify({ date: '2026-07-10', rows: probe }, null, 1))
console.log(`written -> render/c12-dark-signal.html (${probe.length} rows)`)
for (const r of probe) console.log(`${r.profile} ${r.hex}: variant=${r.variant} brandD L${r.brandD} | A p2 ${r.A_p2} · B ${r.B_p2} · C ${r.C_p2}`)
