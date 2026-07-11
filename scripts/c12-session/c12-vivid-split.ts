// c12-vivid-split.ts — INSTRUMENT E v2 (owner sketch 2026-07-10): the vivid-arc de-conflict is
// an OPPOSED SPLIT — the brand gets LIGHTER, the red gets DARKER (identity preserved on both
// sides; red-lighter is a dead concept). One representative per hue family (pink / red /
// orange, her anchors). Per representative: COLUMNS = 3-4 lighter versions of the seed
// (brand cta formula at seed L + 0/.04/.08/.12), ROWS = the full darker-red ramp (ΔL 0.02
// steps to −0.16). She picks the winning combo per color; then we test whether the picked
// rule holds across other hues (follow-up page). RAW pairs (standing calibration rule —
// nothing resolved/enforced); data labels only. Marks → /marks/vivid-split (server 8324).
import { writeFileSync, mkdirSync } from 'fs'
import { signalScalesFor } from '/Users/emilygerrity/okchroma/src/engine/resolve'
import { redGateDist, hexToOklch, maxChromaAt } from '/Users/emilygerrity/okchroma/src/engine/colorMath'
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
const redAt = (L: number) => ({ L, C: clampChromaToGamut(L, rctx.cAt('light', L, rctx.brandC), rctx.brandH), H: rctx.brandH })

// representatives — her anchors, one per hue family
const REPS: Array<{ hex: string; label: string }> = [
  { hex: '#FF006F', label: 'PINK' }, { hex: '#FF0000', label: 'RED' }, { hex: '#FF7300', label: 'ORANGE' },
]
const BRAND_STEPS = [0, 0.04, 0.08, 0.12]
const RED_STEPS = Array.from({ length: 9 }, (_, k) => -k * 0.02) // 0 … −0.16

const probe: any[] = []
const sections: string[] = []

for (const rep of REPS) {
  const seed = hexToOklch(rep.hex)
  const bctx = buildContext(rep.hex, ctxOpts)
  const brandAt = (L: number) => ({ L, C: clampChromaToGamut(L, bctx.cAt('light', L, bctx.brandC), bctx.brandH), H: bctx.brandH })

  const cols = BRAND_STEPS.map(bd => {
    const b = brandAt(seed.L + bd)
    const rungs = RED_STEPS.map(rd => {
      const r = redAt(redCta.L + rd)
      return { bd, rd, b, r, p2: p2Diff(b, r), gate: redGateDist(b, r), bHex: hx(b.L, b.C, b.H), rHex: hx(r.L, r.C, r.H) }
    })
    return { bd, b, rungs }
  })
  probe.push({
    hex: rep.hex, label: rep.label, seed, vivid: +(seed.C / maxChromaAt(seed.L, seed.H)).toFixed(3),
    cols: cols.map(c => ({ brandDL: c.bd, brandL: +c.b.L.toFixed(3), brandHex: hx(c.b.L, c.b.C, c.b.H), rungs: c.rungs.map(r => ({ redDL: r.rd, redL: +r.r.L.toFixed(3), p2: +r.p2.toFixed(3), gate: +r.gate.toFixed(3), redHex: r.rHex, brandHex: r.bHex })) })),
  })

  sections.push(`<div class="brand"><div class="bhead">
<div class="sw chip" style="background:${rep.hex}"></div>
<div class="bmeta"><b>${rep.label} — ${rep.hex}</b> · seed L${seed.L.toFixed(2)} H${seed.H.toFixed(0)} · columns = brand lighter (seed +ΔL), rows = red darker</div></div>
<div class="cols">${cols.map(c => `<div class="col"><div class="chead">brand +${c.bd.toFixed(2)}${c.bd === 0 ? ' (seed)' : ''} · L${c.b.L.toFixed(2)} ${hx(c.b.L, c.b.C, c.b.H)}</div>
${c.rungs.map(r => `<div class="rung"><input type="checkbox" class="ck" data-id="vs|${rep.hex}|b+${r.bd.toFixed(2)}|r${r.rd.toFixed(2)}">
<div class="rl">red ${r.rd === 0 ? '±0.00' : r.rd.toFixed(2)} · p2 ${r.p2.toFixed(3)} · gate ${r.gate.toFixed(3)}</div>
<div class="pair"><div class="sw" style="background:${r.rHex}"></div><div class="sw" style="background:${r.bHex}"></div></div></div>`).join('')}</div>`).join('')}</div></div>`)
}

const html = `<!doctype html><meta charset="utf-8"><title>C12 — vivid split: brand lighter × red darker</title>
<style>
  body { font: 14px/1.5 -apple-system, sans-serif; margin:0; background:#faf9f7; color:#1a1a1a; }
  .note { padding:.9rem 1.4rem; background:#f2f0ec; font-size:.88rem; }
  .brand { padding:.8rem 1.4rem 1rem; border-bottom:1px solid #e4e1db; }
  .bhead { display:flex; gap:.7rem; align-items:center; margin-bottom:.45rem; }
  .chip { width:44px; height:44px; flex:0 0 44px; }
  .bmeta { font-size:.78rem; opacity:.8; }
  .cols { display:flex; gap:1.8rem; align-items:flex-start; overflow-x:auto; }
  .col { min-width:330px; }
  .chead { font-size:.7rem; font-weight:700; text-transform:uppercase; letter-spacing:.05em; opacity:.6; margin-bottom:.35rem; }
  .rung { display:flex; align-items:center; gap:.55rem; padding:.16rem 0; }
  .ck { width:16px; height:16px; flex:0 0 16px; accent-color:#1a7f37; }
  .rl { font-size:.62rem; opacity:.55; width:140px; }
  .pair { display:flex; }
  .sw { width:110px; height:52px; }
  #save { position:fixed; right:14px; top:10px; font-size:.75rem; padding:.2rem .5rem; }
  #save.bad { background:#b3261e; color:#fff; font-weight:700; opacity:1; }
</style>
<div id="save"></div>
<div class="note"><b>C12 — the opposed split: brand gets LIGHTER (columns), red gets DARKER (rows).</b>
One representative per hue family. Each pair, flush: darker-red candidate beside the lighter-brand candidate — raw, nothing resolved.
Check the combo(s) that read clean for each color — that pick becomes the rule we then test across other hues.
Top-left cell = both as shipped today. Checks save automatically (open via <b>http://localhost:8324/c12-vivid-split.html</b>).</div>
${sections.join('')}
<script>
const cks = [...document.querySelectorAll('.ck')]
const state = () => Object.fromEntries(cks.filter(c => c.checked).map(c => [c.dataset.id, true]))
const save = document.getElementById('save')
const EP = 'http://localhost:8324/marks/vivid-split'
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
writeFileSync('/Users/emilygerrity/okchroma/render/c12-vivid-split.html', html)
writeFileSync('/Users/emilygerrity/okchroma/scripts/c12-session/vivid-split-probe.json',
  JSON.stringify({ date: '2026-07-10', profile: PROFILE, redCta: { L: +redCta.L.toFixed(3), C: +redCta.C.toFixed(3), H: +redCta.H.toFixed(1) }, brands: probe }, null, 1))
console.log(`written -> render/c12-vivid-split.html (${REPS.length} representatives × ${BRAND_STEPS.length} brand cols × ${RED_STEPS.length} red rungs)`)
for (const p of probe) console.log(`${p.label} ${p.hex}: brand cols L ${p.cols.map((c: any) => c.brandL).join(' / ')}`)
