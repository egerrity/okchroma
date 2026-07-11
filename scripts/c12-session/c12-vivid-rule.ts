// c12-vivid-rule.ts — INSTRUMENT E v3 (2026-07-10): the fitted DYNAMIC split rule, rendered
// across the whole vivid arc for her holds/doesn't-hold pass ("once we pick for each we
// should be able to see if it holds for other hues").
//
// Her three calibration picks (vivid-split-checks + vivid-orange-checks + her words):
//   PINK   #FF006F (dh −25): brand +0.04 · red −0.08 · hue 0
//   RED    #FF0000 (dh  −4): brand +0.08 · red −0.12 · hue 0
//   ORANGE #FF7300 (dh +22): brand +0.00 · red −0.08 · hue −5 (−10 also passed; −15 too cool)
// Fitted shape (dh = brand seed hue − red cta hue, signed; + = gold side):
//   redDL   = −0.10 − 0.04·gauss(dh, 7)             (owner shift: window .10–.14 across the board)
//   brandDL = +0.08·gauss(dh, magenta σ21.5 / gold σ6)  (gold side ~never lightens)
//   redDH   = −5°·sigmoid((dh − 9)/2.5)             (cools only gold-side)
// (v1 constants assumed orange dh +22; its true dh is +14.5 — σs tightened to reproduce
//  all three picks: pink +0.039/−0.080/0° · red +0.079/−0.118/−0.0° · orange +0.004/−0.085/−4.5°)
// Reproduction at her anchors printed below — verify before showing. One pair per arc brand,
// checkbox = "holds". Marks → /marks/vivid-rule (server 8324). ZERO engine edits.
import { writeFileSync, mkdirSync } from 'fs'
import { signalScalesFor } from '/Users/emilygerrity/okchroma/src/engine/resolve'
import { redGateDist, hexToOklch, maxChromaAt, inRedVividArc, gauss, sigmoid, hueDelta } from '/Users/emilygerrity/okchroma/src/engine/colorMath'
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

const PROFILE = 'apca' as const
const redSig = signalScalesFor(PROFILE).get('red')!
const redCta = redSig.scale.cta
const ctxOpts = {
  highlight: true, darkChromaCurve, loudCta: true, darkFillMinL: redSig.def.darkFillMinL,
  enforceOnFillContrast: true, suppressRedCool: true, goldBoost: true, contrastProfile: PROFILE,
} as any
const rctx = buildContext(redSig.def.hex, ctxOpts)

// ── the fitted rule (candidate registers — wiring names/values are the owner's call) ──
// owner shift 2026-07-10: red-darken window moved across the board .08–.12 → .10–.14
const rule = (dh: number) => ({
  redDL: -0.10 - 0.04 * gauss(dh, 7),
  brandDL: 0.08 * gauss(dh, dh < 0 ? 21.5 : 6),
  redDH: -5 * sigmoid((dh - 9) / 2.5),
})

// population: her anchors + agnostic arc sweep
const seeds: Array<{ hex: string; tag: string }> = [
  { hex: '#FF006F', tag: 'anchor PINK' }, { hex: '#FF0000', tag: 'anchor RED' }, { hex: '#FF7300', tag: 'anchor ORANGE' },
]
for (const H of [4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48]) {
  for (const L of [0.58, 0.64, 0.70]) {
    const C = 0.90 * maxChromaAt(L, H)
    const hex = hx(L, C, H).toUpperCase()
    const o = hexToOklch(hex)
    if (inRedVividArc(o.L, o.C, o.H) && !seeds.some(s => s.hex === hex)) seeds.push({ hex, tag: `H${H} L${L}` })
  }
}

const rows: string[] = []
const probe: any[] = []
for (const s of seeds) {
  const seed = hexToOklch(s.hex)
  const dh = hueDelta(seed.H, redCta.H)
  const { redDL, brandDL, redDH } = rule(dh)
  const bctx = buildContext(s.hex, ctxOpts)
  const bL = seed.L + brandDL
  const b = { L: bL, C: clampChromaToGamut(bL, bctx.cAt('light', bL, bctx.brandC), bctx.brandH), H: bctx.brandH }
  const rL = redCta.L + redDL, rH = redCta.H + redDH
  const r = { L: rL, C: clampChromaToGamut(rL, rctx.cAt('light', rL, rctx.brandC), rH), H: rH }
  const p2 = p2Diff(b, r), gate = redGateDist(b, r)
  probe.push({ hex: s.hex, tag: s.tag, dh: +dh.toFixed(1), rule: { brandDL: +brandDL.toFixed(3), redDL: +redDL.toFixed(3), redDH: +redDH.toFixed(1) }, brand: { L: +b.L.toFixed(3), hex: hx(b.L, b.C, b.H) }, red: { L: +r.L.toFixed(3), H: +r.H.toFixed(1), hex: hx(r.L, r.C, r.H) }, p2: +p2.toFixed(3), gate: +gate.toFixed(3) })
  rows.push(`<div class="row"><input type="checkbox" class="ck" data-id="vr|${s.hex}">
<div class="rl"><b>${s.hex}</b> ${s.tag}<br>dh ${dh >= 0 ? '+' : ''}${dh.toFixed(0)}° · brand ${brandDL >= 0.005 ? '+' + brandDL.toFixed(2) : '±0.00'} · red ${redDL.toFixed(2)}${redDH <= -0.5 ? ' / ' + redDH.toFixed(0) + '°' : ''}<br>p2 ${p2.toFixed(3)} · gate ${gate.toFixed(3)}</div>
<div class="pair"><div class="sw" style="background:${hx(r.L, r.C, r.H)}"></div><div class="sw" style="background:${hx(b.L, b.C, b.H)}"></div></div></div>`)
}

const html = `<!doctype html><meta charset="utf-8"><title>C12 — the split rule across the arc</title>
<style>
  body { font: 14px/1.5 -apple-system, sans-serif; margin:0; background:#faf9f7; color:#1a1a1a; }
  .note { padding:.9rem 1.4rem; background:#f2f0ec; font-size:.88rem; }
  .rows { padding:.8rem 1.4rem; display:flex; flex-direction:column; gap:.5rem; }
  .row { display:flex; align-items:center; gap:.7rem; }
  .ck { width:16px; height:16px; flex:0 0 16px; accent-color:#1a7f37; }
  .rl { font-size:.64rem; opacity:.6; width:210px; line-height:1.5; }
  .pair { display:flex; }
  .sw { width:150px; height:60px; }
  #save { position:fixed; right:14px; top:10px; font-size:.75rem; padding:.2rem .5rem; }
  #save.bad { background:#b3261e; color:#fff; font-weight:700; opacity:1; }
</style>
<div id="save"></div>
<div class="note"><b>C12 — the fitted split rule, applied across the vivid arc.</b> One pair per brand:
the rule's red variant beside the rule's brand position (raw). Derived from your three picks —
red darkens −0.08→−0.12 toward on-hue · brand lightens only near/magenta-side · red cools −5° gold-side only.
Check each pair that HOLDS (reads clean); leave unchecked what fails and tell me what it's doing wrong.
Checks save automatically (open via <b>http://localhost:8324/c12-vivid-rule.html</b>).</div>
<div class="rows">${rows.join('')}</div>
<script>
const cks = [...document.querySelectorAll('.ck')]
const state = () => Object.fromEntries(cks.filter(c => c.checked).map(c => [c.dataset.id, true]))
const save = document.getElementById('save')
const EP = 'http://localhost:8324/marks/vivid-rule'
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
writeFileSync('/Users/emilygerrity/okchroma/render/c12-vivid-rule.html', html)
writeFileSync('/Users/emilygerrity/okchroma/scripts/c12-session/vivid-rule-probe.json',
  JSON.stringify({ date: '2026-07-10', profile: PROFILE, redCta: { L: +redCta.L.toFixed(3), C: +redCta.C.toFixed(3), H: +redCta.H.toFixed(1) }, ruleNote: 'FINAL (blessed 28/28): redDL=-0.10-0.04*gauss(dh,7) · brandDL=0.08*gauss(dh, dh<0?21.5:6) · redDH=-5*sigmoid((dh-9)/2.5)', brands: probe }, null, 1))
console.log(`written -> render/c12-vivid-rule.html (${seeds.length} brands)`)
console.log('anchor reproduction (rule vs her picks):')
for (const p of probe.filter((x: any) => x.tag.startsWith('anchor'))) {
  console.log(`  ${p.tag} ${p.hex}: dh ${p.dh} -> brand +${p.rule.brandDL} (picked ${p.hex === '#FF006F' ? '+0.04' : p.hex === '#FF0000' ? '+0.08' : '+0.00'}) · red ${p.rule.redDL} (picked ${p.hex === '#FF0000' ? '-0.12' : '-0.08'}) · hue ${p.rule.redDH}° (picked ${p.hex === '#FF7300' ? '-5..-10' : '0'})`)
}
