// c12-vivid-delivery.ts — INSTRUMENT E (the HANDOFF open item, 2026-07-10): vivid-arc variant
// DELIVERY. Her catches on v6: "re-conflicting in shot 1" (arc-end brands: nearest-first lands
// the variant ≈ canonical red) · "not far enough … it needs to move dynamically based on the
// end color" (#FF0000). The nearest-first solve is right for keep-box (minimal intervention),
// wrong for the arc, whose point is vibration relief BEYOND legality.
//
// This instrument: per arc brand (her 3 anchors + agnostic sweep), the REAL pipeline's final
// cta beside a ladder of red-variant candidates stepping outward from canonical red's cta —
// flush pairs, both directions, checkbox per rung (FIRST rung that reads clean). Rung 0 =
// canonical red today (the pair she called vibrating). Marks → /marks/vivid-delivery (server
// 8324). Rung tables dumped to vivid-delivery-probe.json so ANY dynamic rule (p2-bar step-up /
// positional mirror / vividness-scaled) can be fit offline against her marks. ZERO engine edits.
import { writeFileSync, mkdirSync } from 'fs'
import { resolveBrand, signalScalesFor } from '/Users/emilygerrity/okchroma/src/engine/resolve'
import { redGateDist, hexToOklch, maxChromaAt, inRedVividArc, RED_GATE, RED_VARIANT_L_MIN } from '/Users/emilygerrity/okchroma/src/engine/colorMath'
import { p2Diff } from '/Users/emilygerrity/okchroma/src/engine/p2'
import { darkChromaCurve } from '/Users/emilygerrity/okchroma/src/engine/darkChromaCurve'
import { buildContext, whiteTextLcAt } from '/Users/emilygerrity/okchroma/src/reqtoken/producers'
import { clampChromaToGamut, oklchToLinearRgb } from '/Users/emilygerrity/okchroma/src/engine/constraints'

const hx = (L: number, C: number, H: number) => {
  const c = clampChromaToGamut(L, C, H)
  const [rl, gl, bl] = oklchToLinearRgb(L, c, H)
  const gm = (v: number) => { const x = Math.min(1, Math.max(0, v)); return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055 }
  const ch = (v: number) => Math.round(gm(v) * 255).toString(16).padStart(2, '0')
  return `#${ch(rl)}${ch(gl)}${ch(bl)}`
}

const PROFILE = 'apca' as const // shipped default; wcag re-checked after the rule is fit
const redSig = signalScalesFor(PROFILE).get('red')!
const redCta = redSig.scale.cta

// the variant's chroma formula and white-text cap, exactly as redMoveVariant computes them
const rctx = buildContext(redSig.def.hex, {
  highlight: true, darkChromaCurve, loudCta: true, darkFillMinL: redSig.def.darkFillMinL,
  enforceOnFillContrast: true, suppressRedCool: true, goldBoost: true, contrastProfile: PROFILE,
} as any)
const vFor = (L: number) => rctx.cAt('light', L, rctx.brandC)
let CAP = RED_VARIANT_L_MIN
for (let L = RED_VARIANT_L_MIN; L <= 0.72; L += 0.002) {
  if (whiteTextLcAt(L, clampChromaToGamut(L, vFor(L), rctx.brandH), rctx.brandH) >= 60) CAP = L
  else break
}

// ── population: her anchors + agnostic arc sweep (H × L × vividness, nominal-seed members) ──
const seeds: Array<{ hex: string; tag: string }> = [
  { hex: '#FF7300', tag: 'anchor' }, { hex: '#FF0000', tag: 'anchor' }, { hex: '#FF006F', tag: 'anchor' },
]
for (const H of [8, 16, 24, 32, 40, 48]) {
  for (const L of [0.60, 0.70]) {
    const C = 0.90 * maxChromaAt(L, H)
    const hex = hx(L, C, H).toUpperCase()
    const o = hexToOklch(hex)
    if (inRedVividArc(o.L, o.C, o.H) && !seeds.some(s => s.hex === hex)) seeds.push({ hex, tag: `H${H} L${L}` })
  }
}

type Rung = { dL: number; L: number; p2: number; gate: number; hex: string }
const probe: any[] = []
const rows: string[] = []

const rung = (id: string, r: Rung, brand: { L: number; C: number; H: number }) =>
  `<div class="rung"><input type="checkbox" class="ck" data-id="${id}">
<div class="rl">ΔL ${r.dL >= 0 ? '+' : ''}${r.dL.toFixed(2)} · p2 ${r.p2.toFixed(3)} · gate ${r.gate.toFixed(3)}</div>
<div class="pair"><div class="sw" style="background:${r.hex}"></div><div class="sw" style="background:${hx(brand.L, brand.C, brand.H)}"></div></div></div>`

for (const s of seeds) {
  const seed = hexToOklch(s.hex)
  const rb = resolveBrand(s.hex, 'probe', { contrastProfile: PROFILE })
  const cta = rb.scale.cta
  const fired = redGateDist(cta, redCta) <= RED_GATE.G || rb.redRepel?.light === true
  const ov = rb.signalOverrides.find(o => o.name === 'red')
  const vivid = seed.C / maxChromaAt(seed.L, seed.H)

  const mkRungs = (dir: 1 | -1): Rung[] => {
    const out: Rung[] = []
    for (let k = 0; ; k++) {
      const L = redCta.L + dir * k * 0.02
      if (dir < 0 && L < RED_VARIANT_L_MIN - 1e-9) break
      if (dir > 0 && (L > CAP + 1e-9 || k > 12)) break
      const v = { L, C: clampChromaToGamut(L, vFor(L), rctx.brandH), H: rctx.brandH }
      out.push({ dL: dir * k * 0.02, L, p2: p2Diff(cta, v), gate: redGateDist(cta, v), hex: hx(v.L, v.C, v.H) })
    }
    return out
  }
  const down = mkRungs(-1), up = mkRungs(1).slice(1) // rung 0 lives in the down column only

  const wired = ov ? { note: ov.note, L: ov.scale.cta.L, p2: p2Diff(cta, ov.scale.cta), dL: ov.scale.cta.L - redCta.L } : null
  probe.push({
    hex: s.hex, tag: s.tag, seed, vivid: +vivid.toFixed(3), fired, class: fired ? 'BOTH (fired + variant)' : 'arc-only (variant)',
    finalCta: { L: +cta.L.toFixed(3), hex: hx(cta.L, cta.C, cta.H) },
    wired: wired ? { ...wired, L: +wired.L.toFixed(3), p2: +wired.p2.toFixed(3), dL: +wired.dL.toFixed(3) } : 'NO VARIANT (bug if arc member)',
    rungs: { down, up },
  })

  rows.push(`<div class="brand"><div class="bhead">
<div class="sw chip" style="background:${s.hex}"></div>
<div class="bmeta"><b>${s.hex}</b> (${s.tag}) · vivid ${vivid.toFixed(2)} · seed L${seed.L.toFixed(2)} H${seed.H.toFixed(0)} · ${fired ? 'BOTH: brand exits + red variant' : 'arc-only: red variant, brand stays'}<br>
brand final cta L${cta.L.toFixed(2)} ${hx(cta.L, cta.C, cta.H)} · <b>wired v6: ${wired ? `${wired.note} · ΔL ${wired.dL >= 0 ? '+' : ''}${wired.dL.toFixed(2)} · p2 ${wired.p2.toFixed(3)}` : 'none'}</b></div></div>
<div class="cols">
<div class="col"><div class="chead">DOWN (deeper red) — ΔL 0 = canonical red today</div>${down.map(r => rung(`vd|${s.hex}|down|${r.dL.toFixed(2)}`, r, cta)).join('')}</div>
<div class="col"><div class="chead">UP (lighter red) — capped by white-text law L${CAP.toFixed(2)}</div>${up.length ? up.map(r => rung(`vd|${s.hex}|up|+${r.dL.toFixed(2)}`, r, cta)).join('') : '<div class="rl">no legal up rungs</div>'}</div>
</div></div>`)
}

const html = `<!doctype html><meta charset="utf-8"><title>C12 — vivid-arc variant delivery</title>
<style>
  body { font: 14px/1.5 -apple-system, sans-serif; margin:0; background:#faf9f7; color:#1a1a1a; }
  .note { padding:.9rem 1.4rem; background:#f2f0ec; font-size:.88rem; }
  .brand { padding:.8rem 1.4rem 1rem; border-bottom:1px solid #e4e1db; }
  .bhead { display:flex; gap:.7rem; align-items:center; margin-bottom:.45rem; }
  .chip { width:44px; height:44px; flex:0 0 44px; }
  .bmeta { font-size:.75rem; opacity:.8; }
  .cols { display:flex; gap:2.2rem; align-items:flex-start; }
  .col { min-width:340px; }
  .chead { font-size:.7rem; font-weight:700; text-transform:uppercase; letter-spacing:.05em; opacity:.6; margin-bottom:.35rem; }
  .rung { display:flex; align-items:center; gap:.55rem; padding:.16rem 0; }
  .ck { width:16px; height:16px; flex:0 0 16px; accent-color:#1a7f37; }
  .rl { font-size:.62rem; opacity:.55; width:150px; }
  .pair { display:flex; }
  .sw { width:110px; height:52px; }
  #save { position:fixed; right:14px; top:10px; font-size:.72rem; opacity:.7; }
</style>
<div id="save"></div>
<div class="note"><b>C12 — vivid-arc red-VARIANT delivery ("it needs to move dynamically based on the end color").</b>
Each pair, flush: red-variant candidate beside the brand's REAL final cta (live pipeline, apca lane).
Check the FIRST rung per direction where the pair reads clean — truly different, no vibration. ΔL 0 (top of DOWN) = canonical red as shipped today.
Light mode only: the variant is light-side by design (dark stays canonical, delta model). Checks save automatically
(open via <b>http://localhost:8324/c12-vivid-delivery.html</b>).</div>
${rows.join('')}
<script>
const cks = [...document.querySelectorAll('.ck')]
const state = () => Object.fromEntries(cks.filter(c => c.checked).map(c => [c.dataset.id, true]))
const save = document.getElementById('save')
const EP = 'http://localhost:8324/marks/vivid-delivery'
async function push() {
  try {
    await fetch(EP, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ savedAt: new Date().toISOString(), marks: state() }) })
    save.textContent = 'saved ✓'
  } catch (e) { save.textContent = 'NOT SAVED — is the marks server (8324) running?' }
}
cks.forEach(c => c.addEventListener('change', push))
fetch(EP).then(r => r.json()).then(d => {
  const m = (d && d.marks) || {}
  cks.forEach(c => { if (m[c.dataset.id]) c.checked = true })
  save.textContent = Object.keys(m).length ? 'restored ' + Object.keys(m).length + ' ✓' : ''
}).catch(() => { save.textContent = 'marks server not reachable' })
</script>`

mkdirSync('/Users/emilygerrity/okchroma/render', { recursive: true })
writeFileSync('/Users/emilygerrity/okchroma/render/c12-vivid-delivery.html', html)
writeFileSync('/Users/emilygerrity/okchroma/scripts/c12-session/vivid-delivery-probe.json',
  JSON.stringify({ date: '2026-07-10', profile: PROFILE, redCta: { L: redCta.L, C: redCta.C, H: redCta.H }, cap: CAP, brands: probe }, null, 1))
console.log(`written -> render/c12-vivid-delivery.html (${seeds.length} brands) + vivid-delivery-probe.json`)
console.log(`red cta L${redCta.L.toFixed(3)} · variant white-text cap L${CAP.toFixed(3)}`)
for (const p of probe) console.log(`${p.hex} ${p.tag} vivid ${p.vivid} ${p.fired ? 'BOTH' : 'arc'} cta L${p.finalCta.L} -> wired ${typeof p.wired === 'string' ? p.wired : `${p.wired.note} dL ${p.wired.dL} p2 ${p.wired.p2}`}`)
