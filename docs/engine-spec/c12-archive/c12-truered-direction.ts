// c12-truered-direction.ts — the true-red DIRECTION fix (owner 2026-07-11): the vivid≥0.85
// gate on the dark throw carved a subset — high-L / less-vivid true reds exit UP (bright
// salmon) + red moves deep (the exact-mode-safety pattern) instead of shooting the brand DARK.
// Owner: delete the exception → on-hue reds shoot dark uniformly (hue-band direction, no vivid
// gate). This page shows, LIGHT mode, the on-hue band + gold edge across L0.44–0.72 (the high-L
// band that was never on the 50-row marking page): CURRENT (resolveBrand) vs PROPOSED (vivid
// gates deleted → on-hue shoots dark, gold flips bright). Owner marks the right one per row.
import { writeFileSync, mkdirSync } from 'fs'
import { resolveBrand, signalScalesFor } from '/Users/emilygerrity/okchroma/src/engine/resolve'
import { hexToOklch, maxChromaAt, redSolveDist, RED_GATE, RED_SOLVE, hueDelta, inBrickBand } from '/Users/emilygerrity/okchroma/src/engine/colorMath'
import { whiteTextLcAt, apcaYAt } from '/Users/emilygerrity/okchroma/src/reqtoken/producers'
import { clampChromaToGamut, oklchToLinearRgb, apcaLc } from '/Users/emilygerrity/okchroma/src/engine/constraints'

const hx = (L: number, C: number, H: number) => {
  const c = clampChromaToGamut(L, C, H)
  const [rl, gl, bl] = oklchToLinearRgb(L, c, H)
  const gm = (v: number) => { const x = Math.min(1, Math.max(0, v)); return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055 }
  const ch = (v: number) => Math.round(gm(v) * 255).toString(16).padStart(2, '0')
  return `#${ch(rl)}${ch(gl)}${ch(bl)}`
}

// PROPOSED = current engine EXCEPT strictly ON-HUE reds (magentaDh < dh < goldDh, ~H19–35):
// those shoot the brand DOWN (dark) instead of up. Pink (dh ≤ magentaDh) and orange/gold
// (dh ≥ goldDh) are UNTOUCHED — their red-deep / bright treatments stay byte-identical. This
// is the SCOPED fix (the global vivid-gate deletion cascaded into pink/orange — owner caught).
const isOnHue = (dh: number) => dh > RED_SOLVE.magentaDh && dh < RED_SOLVE.goldDh
function onHueDownLanding(seed: { L: number; C: number; H: number }, cFor: (L: number) => number, brandH: number, red: any, enforceLc?: number) {
  const at = (L: number) => ({ L, C: clampChromaToGamut(L, cFor(L), brandH), H: brandH })
  const poleOk = (L: number, C: number, H: number) => enforceLc === undefined ? true :
    (whiteTextLcAt(L, C, H) >= enforceLc || Math.abs(apcaLc(apcaYAt(0, 0, 0), apcaYAt(L, clampChromaToGamut(L, C, H), H))) >= enforceLc)
  const release = RED_GATE.G + RED_SOLVE.ring
  let dn: number | null = null
  for (let L = seed.L; L >= 0.28; L -= 0.002) { const c = at(L); if (redSolveDist(c, red) >= release && poleOk(L, c.C, c.H)) { dn = seed.L - L; break } }
  if (dn === null) return null
  let landing = { L: seed.L - dn, H: brandH, cMul: 1 }
  const l = at(landing.L)
  if (inBrickBand(l.L, l.C, l.H)) landing = { L: landing.L - RED_SOLVE.brickExtraDeep, H: brandH + RED_SOLVE.brickCool, cMul: RED_SOLVE.brickDesat }
  return landing
}

const rows: string[] = []
const probe: any[] = []
for (const profile of ['wcag', 'apca'] as const) {
  const p = profile === 'apca' ? 'apca' as const : undefined
  const red = signalScalesFor(p).get('red')!.scale
  const enforceLc = p === 'apca' ? 60 : undefined
  const combos: Array<{ H: number; L: number; vf: number }> = []
  // pink (H14/18) · on-hue reds (H26/30/34) · orange/gold (H44/50) — pink & orange must stay put
  for (const H of [14, 18, 26, 30, 34, 44, 50]) for (const L of [0.48, 0.56, 0.62, 0.68]) for (const vf of [0.72, 0.80, 0.90]) combos.push({ H, L, vf })
  for (const { H, L, vf } of combos) {
    const C = vf * maxChromaAt(L, H)
    const hex = hx(L, C, H).toUpperCase()
    const seed = hexToOklch(hex)
    if (redSolveDist({ L: seed.L, C: clampChromaToGamut(seed.L, seed.C, seed.H), H: seed.H }, red.cta) > RED_GATE.G && !inBrickBand(seed.L, seed.C, seed.H)) continue // members only
    const rb = resolveBrand(hex, 'b', { contrastProfile: p })
    const ovC = rb.signalOverrides.find(o => o.name === 'red')
    const curB = rb.scale.cta, curR = ovC ? ovC.scale.cta : red.cta
    const dh = hueDelta(seed.H, red.cta.H)
    // SCOPED: only on-hue reds change (brand shoots dark, red canonical). Pink/orange = current.
    const cFor = (LL: number) => clampChromaToGamut(LL, seed.C, seed.H)
    const land = isOnHue(dh) ? onHueDownLanding(seed, cFor, seed.H, red.cta, enforceLc) : null
    const propB = land ? { L: land.L, C: clampChromaToGamut(land.L, seed.C * land.cMul, land.H), H: land.H } : curB
    const propR = land ? red.cta : curR // on-hue brand-dark → red canonical; else unchanged
    const same = !land || (Math.abs(propB.L - curB.L) < 0.01 && Math.abs(curR.L - propR.L) < 0.01)
    probe.push({ profile, hex, H: +seed.H.toFixed(0), L, curBL: +curB.L.toFixed(3), propBL: +propB.L.toFixed(3), changed: !same })
    const pair = (b: any, r: any, title: string, id: string) => `<div class="cand"><div class="clab">${title}</div>
<div class="pair"><div class="sw" style="background:${hx(b.L, b.C, b.H)}"><span>Primary</span></div><div class="sw" style="background:${hx(r.L, r.C, r.H)}"><span>Red</span></div></div>
<input type="checkbox" class="ck" data-id="${id}"></div>`
    const id0 = `td|${profile}|${hex}`
    const band = isOnHue(dh) ? 'on-hue red' : dh <= RED_SOLVE.magentaDh ? 'PINK (untouched)' : 'ORANGE (untouched)'
    rows.push(`<div class="row ${same ? 'same' : ''}"><div class="rid"><div class="idsw" style="background:${hex}"></div>
<div class="rmeta"><b>${hex}</b> ${profile.toUpperCase()} · H${seed.H.toFixed(0)} L${L} · ${band}<br>${same ? (isOnHue(dh) ? 'unchanged (already shoots dark)' : 'unchanged by design') : `current brand L${curB.L.toFixed(2)} ↑ bright + red deep → proposed L${propB.L.toFixed(2)} ↓ dark`}</div></div>
<div class="cells">${pair(curB, curR, 'CURRENT', id0 + '|current')}${pair(propB, propR, 'PROPOSED (deleted)', id0 + '|proposed')}</div></div>`)
  }
}

const html = `<!doctype html><meta charset="utf-8"><title>C12 — true-red direction</title>
<style>
  body { font: 14px/1.5 -apple-system, sans-serif; margin:0; background:#faf9f7; color:#1a1a1a; }
  .note { padding:.9rem 1.4rem; background:#f2f0ec; font-size:.86rem; }
  .row { display:flex; gap:1.4rem; align-items:center; padding:.55rem 1.4rem; border-bottom:1px solid #e7e4de; }
  .row.same { opacity:.4; }
  .rid { display:flex; gap:.6rem; align-items:center; width:280px; flex:0 0 280px; }
  .idsw { width:40px; height:40px; flex:0 0 40px; border-radius:6px; }
  .rmeta { font-size:.72rem; opacity:.82; }
  .cells { display:flex; gap:1.8rem; }
  .cand { display:flex; flex-direction:column; align-items:center; gap:.25rem; }
  .clab { font-size:.62rem; text-transform:uppercase; letter-spacing:.03em; opacity:.55; }
  .pair { display:flex; }
  .sw { width:104px; height:44px; border-radius:22px; display:flex; align-items:center; justify-content:center; }
  .sw:first-child { border-radius:22px 0 0 22px; } .sw:last-child { border-radius:0 22px 22px 22px; }
  .sw span { font-size:.6rem; font-weight:700; color:#fff; mix-blend-mode:difference; }
  .ck { width:16px; height:16px; accent-color:#1a7f37; }
  #save { position:fixed; right:14px; top:10px; font-size:.75rem; padding:.2rem .5rem; }
  #save.bad { background:#b3261e; color:#fff; font-weight:700; }
</style>
<div id="save"></div>
<div class="note"><b>C12 — the true-red direction: delete the vivid-gate exception. Light mode, on-hue band + gold edge, L0.44→0.72.</b>
<b>CURRENT</b> = shipped (vivid&lt;0.85 high-L reds exit UP → brand bright + red deep, the safety-like pattern) · <b>PROPOSED</b> = vivid gates deleted → on-hue reds shoot the brand DARK uniformly, gold flips bright. Each pair = [Primary cta][Red cta].
Check the correct pair per row. Greyed rows are already unchanged. Saves via <b>http://localhost:8324/c12-truered-direction.html</b>.</div>
${rows.join('')}
<script>
const cks=[...document.querySelectorAll('.ck')]
const save=document.getElementById('save'); const EP='http://localhost:8324/marks/truered-dir'
async function push(){try{const r=await fetch(EP,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({savedAt:new Date().toISOString(),marks:Object.fromEntries(cks.filter(c=>c.checked).map(c=>[c.dataset.id,true]))})});if(!r.ok)throw 0;save.textContent='saved ✓';save.className=''}catch(e){save.textContent='NOT SAVED — marks server (8324) down';save.className='bad'}}
cks.forEach(c=>c.addEventListener('change',push))
fetch(EP).then(r=>r.json()).then(d=>{const m=(d&&d.marks)||{};cks.forEach(c=>{if(m[c.dataset.id])c.checked=true});save.textContent=Object.keys(m).length?'restored '+Object.keys(m).length+' ✓':''}).catch(()=>{save.textContent='marks server (8324) not reachable';save.className='bad'})
</script>`

mkdirSync('/Users/emilygerrity/okchroma/render', { recursive: true })
writeFileSync('/Users/emilygerrity/okchroma/render/c12-truered-direction.html', html)
writeFileSync('/Users/emilygerrity/okchroma/scripts/c12-session/truered-dir-probe.json', JSON.stringify({ date: '2026-07-11', rows: probe }, null, 1))
const changed = probe.filter(r => r.changed).length
console.log(`written -> render/c12-truered-direction.html (${probe.length} member rows, ${changed} change under the deletion)`)
for (const r of probe.filter(r => r.changed)) console.log(`${r.profile} ${r.hex} H${r.H} L${r.L}: brand L${r.curBL} -> L${r.propBL}`)
