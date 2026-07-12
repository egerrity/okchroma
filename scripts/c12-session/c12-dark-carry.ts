// ⛔ SUPERSEDED (2026-07-11) — historical record only. The carry+loudnessFloor(H) rule this page
// was built to calibrate DIED on computation (a hue-keyed floor re-piles same-hue pairs at red's
// own level; the owner also ruled the floor must be derived, never mark-fitted). The shipped
// answer = solveDarkCtaExit (producers.ts), the same travel solve on dark geometry keyed on P2 —
// see c12-dark-solve.ts + CATALOG C12. The "awaits owner marks" plan is dead; do not resurrect.
//
// c12-dark-carry.ts — DARK-CTA carry+floor visualize (owner 2026-07-10, plan
// i-think-we-are-smooth-pearl). The agnostic rule: darkCtaL = max( carry , loudnessFloor(H) ).
// carry = deltaDarkTargetL (the surface delta, reused). loudnessFloor(H) = hue/gamut-room floor:
// HIGH near the bright corner (yellow/orange/cyan/green — "high room"), LOW for deep hues
// (red/magenta/blue) so they carry deep and de-collide for free. This page shows, per color, on
// DARK ground, the dark cta as a real button (Aa on-fill pole) under four treatments:
//   CURRENT  — the shipped prominence floor
//   CARRY    — pure carry (bright hues go dead — the reason floor exists)
//   COMBO-A  — max(carry, floorA)  [carry-leaning floor]
//   COMBO-B  — max(carry, floorB)  [floor-leaning]
// Owner marks the treatment that reads as a good, loud-enough, in-identity dark button per row →
// fits loudnessFloor(H). Population = 4 signals + agnostic hue×L sweep (full wheel). Both lanes.
// Marks → /marks/dark-carry.
import { writeFileSync, mkdirSync } from 'fs'
import { resolveBrand, signalScalesFor } from '/Users/emilygerrity/okchroma/src/engine/resolve'
import { deltaDarkTargetL, apcaYAt } from '/Users/emilygerrity/okchroma/src/reqtoken/producers'
import { hexToOklch, maxChromaAt, onTextIsWhite } from '/Users/emilygerrity/okchroma/src/engine/colorMath'
import { clampChromaToGamut, oklchToLinearRgb } from '/Users/emilygerrity/okchroma/src/engine/constraints'

const hx = (L: number, C: number, H: number) => {
  const c = clampChromaToGamut(L, C, H)
  const [rl, gl, bl] = oklchToLinearRgb(L, c, H)
  const gm = (v: number) => { const x = Math.min(1, Math.max(0, v)); return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055 }
  const ch = (v: number) => Math.round(gm(v) * 255).toString(16).padStart(2, '0')
  return `#${ch(rl)}${ch(gl)}${ch(bl)}`
}

// gamut-room signal (label-only reference; the floor curve is FIT from her marks, not assumed):
// the L where the hue reaches peak chroma (bright-corner hues peak high = "high room").
function peakChromaL(H: number): number {
  let bestL = 0.5, bestC = -1
  for (let L = 0.2; L <= 0.95; L += 0.01) {
    const c = clampChromaToGamut(L, 0.5, H)
    if (c > bestC) { bestC = c; bestL = L }
  }
  return bestL
}

type Item = { hex: string; label: string }
const items: Item[] = []
// signals first (labelled)
for (const [name, def] of [['red', '#E5484D'], ['yellow', '#F5D90A'], ['green', '#30A46C'], ['info', '#3E63DD']] as const)
  items.push({ hex: def, label: `SIGNAL ${name}` })
// agnostic hue sweep, two L per hue
for (const H of [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330])
  for (const L of [0.55, 0.70]) {
    const hex = hx(L, 0.85 * maxChromaAt(L, H), H).toUpperCase()
    items.push({ hex, label: `H${H} L${L}` })
  }

const rows: string[] = []
const probe: any[] = []
for (const profile of ['wcag', 'apca'] as const) {
  const p = profile === 'apca' ? 'apca' as const : undefined
  for (const it of items) {
    const seed = hexToOklch(it.hex)
    const rb = resolveBrand(it.hex, 'p', { exact: true, contrastProfile: p }) // exact = own color, no collision move
    const lightCta = rb.scale.cta
    const current = rb.scale.ctaDark
    const carryL = deltaDarkTargetL(lightCta, lightCta.C, lightCta.H)
    const mk = (L: number) => ({ L, C: clampChromaToGamut(L, lightCta.C, lightCta.H), H: lightCta.H })
    // a ladder from full CARRY to full CURRENT-floor — she marks the rung that reads right per
    // hue; the floor curve is fit from her picks (target = the marked L), gamut-room-validated.
    const liftA = carryL + 0.40 * (current.L - carryL)
    const liftB = carryL + 0.70 * (current.L - carryL)
    const cands = [
      { key: 'carry', L: carryL, sw: mk(carryL) },
      { key: 'liftA', L: liftA, sw: mk(liftA) },
      { key: 'liftB', L: liftB, sw: mk(liftB) },
      { key: 'current', L: current.L, sw: { L: current.L, C: current.C, H: current.H } },
    ]
    probe.push({ profile, hex: it.hex, label: it.label, H: +seed.H.toFixed(0), lightCtaL: +lightCta.L.toFixed(3), currentL: +current.L.toFixed(3), carryL: +carryL.toFixed(3), liftA: +liftA.toFixed(3), liftB: +liftB.toFixed(3), peakChromaL: +peakChromaL(seed.H).toFixed(3) })
    const cell = (c: any, title: string) => {
      const white = onTextIsWhite(apcaYAt(c.sw.L, c.sw.C, c.sw.H), c.sw.L, c.sw.C, c.sw.H, false)
      return `<div class="cell"><div class="clab">${title} · L${c.L.toFixed(2)}</div>
<div class="btn" style="background:${hx(c.sw.L, c.sw.C, c.sw.H)};color:${white ? '#fff' : '#000'}">Aa</div>
<input type="checkbox" class="ck" data-id="dc|${profile}|${it.hex}|${c.key}"></div>`
    }
    rows.push(`<div class="row"><div class="rid"><div class="idsw" style="background:${it.hex}"></div>
<div class="rmeta"><b>${it.label}</b> ${profile.toUpperCase()}<br>${it.hex} · light L${lightCta.L.toFixed(2)} · carry L${carryL.toFixed(2)} → current L${current.L.toFixed(2)}</div></div>
<div class="cells">${cell(cands[0], 'CARRY')}${cell(cands[1], '+40%')}${cell(cands[2], '+70%')}${cell(cands[3], 'CURRENT')}</div></div>`)
  }
}

const html = `<!doctype html><meta charset="utf-8"><title>C12 — dark cta carry+floor</title>
<style>
  body { font: 14px/1.5 -apple-system, sans-serif; margin:0; background:#141416; color:#e8e8e8; }
  .note { padding:.9rem 1.4rem; background:#1e1e22; font-size:.86rem; color:#d5d5d5; }
  .row { display:flex; gap:1.4rem; align-items:center; padding:.6rem 1.4rem; border-bottom:1px solid #26262b; }
  .rid { display:flex; gap:.6rem; align-items:center; width:290px; flex:0 0 290px; }
  .idsw { width:40px; height:40px; flex:0 0 40px; border-radius:6px; }
  .rmeta { font-size:.72rem; opacity:.82; }
  .cells { display:flex; gap:1.1rem; }
  .cell { display:flex; flex-direction:column; align-items:center; gap:.25rem; }
  .clab { font-size:.6rem; text-transform:uppercase; letter-spacing:.03em; opacity:.55; }
  .btn { width:96px; height:46px; border-radius:22px; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:.95rem; }
  .ck { width:16px; height:16px; accent-color:#4ea1ff; }
  #save { position:fixed; right:14px; top:10px; font-size:.75rem; padding:.2rem .5rem; }
  #save.bad { background:#b3261e; color:#fff; font-weight:700; }
</style>
<div id="save"></div>
<div class="note"><b>C12 — the dark cta: carry + floor, one agnostic rule. Each row on dark ground, the dark cta as a button on a ladder from full-carry to today's floor.</b>
<b>CARRY</b> = pure delta-carry (deep; watch bright-corner hues go dead) · <b>+40% / +70%</b> = carry lifted toward the floor · <b>CURRENT</b> = today's prominence floor.
Check the rung that reads as a good, loud-enough, in-identity dark button per row. Deep hues (red/blue/magenta) should read right at CARRY (they de-collide for free); bright-corner hues (yellow/orange/cyan/green) need a lift. I fit the floor curve from your picks. Saves via <b>http://localhost:8324/c12-dark-carry.html</b>.</div>
${rows.join('')}
<script>
const cks=[...document.querySelectorAll('.ck')]
const save=document.getElementById('save'); const EP='http://localhost:8324/marks/dark-carry'
async function push(){try{const r=await fetch(EP,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({savedAt:new Date().toISOString(),marks:Object.fromEntries(cks.filter(c=>c.checked).map(c=>[c.dataset.id,true]))})});if(!r.ok)throw 0;save.textContent='saved ✓';save.className=''}catch(e){save.textContent='NOT SAVED — marks server (8324) down';save.className='bad'}}
cks.forEach(c=>c.addEventListener('change',push))
fetch(EP).then(r=>r.json()).then(d=>{const m=(d&&d.marks)||{};cks.forEach(c=>{if(m[c.dataset.id])c.checked=true});save.textContent=Object.keys(m).length?'restored '+Object.keys(m).length+' ✓':''}).catch(()=>{save.textContent='marks server (8324) not reachable';save.className='bad'})
</script>`

mkdirSync('/Users/emilygerrity/okchroma/render', { recursive: true })
writeFileSync('/Users/emilygerrity/okchroma/render/c12-dark-carry.html', html)
writeFileSync('/Users/emilygerrity/okchroma/scripts/c12-session/dark-carry-probe.json', JSON.stringify({ date: '2026-07-10', rows: probe }, null, 1))
console.log(`written -> render/c12-dark-carry.html (${probe.length} rows)`)
// sanity: gamut-room reference per hue (the label signal the floor will be fit against)
for (const H of [30, 60, 100, 140, 200, 260, 340]) console.log(`H${H}: peakChromaL ${peakChromaL(H).toFixed(2)}`)
