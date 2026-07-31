// cta-border-hierarchy.ts — the four candidate pairings (owner 2026-07-31: "04 is too low. I
// think we are going to end up needing to do 06 or 08 and 16 or 20").
//
// 06 and 20 are NEW RUNGS — the ladder was 04/08/12/16/24/32 and neither existed.
//
// OWNER RULINGS BAKED IN: neutral fixed at offset-08, never solved · band is Lc 15-30 · the gate
// runs first, a fill already clear of Lc 15 gets no stroke · light only, which is the only mode
// where a secondary or primary ever fires.
import { writeFileSync, mkdirSync } from 'fs'
import { resolveTheme } from '../src/engine/resolve'
import { generateNeutralScale, type ColorStop, type GeneratedScale } from '../src/engine/colorEngine'
import { maxChromaAt } from '../src/engine/colorMath'
import { clampChromaToGamut, oklchToLinearRgb, apcaY, apcaLc } from '../src/engine/constraints'

const P = 'wcag' as const
const NEUTRAL_RUNG = 8
const BAND: [number, number] = [15, 30]
const COMBOS: [number, number][] = [[6, 16], [6, 20], [8, 16], [8, 20]]

const gm = (v: number) => { const x = Math.min(1, Math.max(0, v)); return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055 }
const enc = (c: any): [number, number, number] => { const [r, g, b] = oklchToLinearRgb(c.L, clampChromaToGamut(c.L, c.C, c.H), c.H); return [gm(r), gm(g), gm(b)] }
const hx = (c: any) => { const [r, g, b] = enc(c); const ch = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0'); return `#${ch(r)}${ch(g)}${ch(b)}` }
const Yof = (c: any) => { const [r, g, b] = enc(c); return apcaY(r, g, b) }
const lcv = (a: any, b: any) => Math.abs(apcaLc(Yof(a), Yof(b)))
const strokeLc = (fill: ColorStop, plane: ColorStop, pct: number) => {
  const [r, g, b] = enc(fill), a = pct / 100
  return Math.abs(apcaLc(apcaY(r * (1 - a), g * (1 - a), b * (1 - a)), Yof(plane)))
}
const seed = (L: number, H: number, s: number) => hx({ L, C: s * maxChromaAt(L, H), H })

const HUES = Array.from({ length: 12 }, (_, i) => i * 30)
const CASES: { p: string; s: string; tier: string }[] = []
for (const [tier, pL, sL] of [['pale', 0.94, 0.86], ['pale', 0.90, 0.78], ['mid', 0.80, 0.74]] as const)
  for (const H of HUES) CASES.push({ p: seed(pL, H, 1.0), s: seed(sL, (H + 130) % 360, 0.75), tier })

const tally: Record<string, { hold: number; fail: number; secOut: number; priOut: number; n: number }> = {}
for (const [sr, pr] of COMBOS) tally[`${sr}/${pr}`] = { hold: 0, fail: 0, secOut: 0, priOut: 0, n: 0 }

const rows: string[] = []
for (const c of CASES) {
  const t = resolveTheme({ primaryHex: c.p, secondaryHex: c.s, secondaryStyle: 'default', contrastProfile: P })
  const n = generateNeutralScale(t.primary.scale.brandH, 'default', P)
  const plane = n.light.find(x => x.stop === 2)!
  const pf = t.primary.scale.cta, sf = t.secondary!.scale.cta
  const pFill = lcv(pf, plane), sFill = lcv(sf, plane)
  const pFires = pFill < BAND[0], sFires = sFill < BAND[0]
  if (!pFires && !sFires) continue

  const strips = COMBOS.map(([sr, pr]) => {
    const secLc = sFires ? strokeLc(sf, plane, sr) : null
    const priLc = pFires ? strokeLc(pf, plane, pr) : null
    const sPresence = Math.max(sFill, secLc ?? 0)
    const pPresence = Math.max(pFill, priLc ?? 0)
    const holds = pPresence > sPresence
    const k = `${sr}/${pr}`
    tally[k].n++; holds ? tally[k].hold++ : tally[k].fail++
    if (secLc !== null && (secLc < BAND[0] || secLc > BAND[1])) tally[k].secOut++
    if (priLc !== null && (priLc < BAND[0] || priLc > BAND[1])) tally[k].priOut++
    const cell = (sc: GeneratedScale, text: string, circle: boolean, rung: number | null, lc: number | null) => {
      const out = lc !== null && (lc < BAND[0] || lc > BAND[1])
      return `<div class="cell"><div class="btn${circle ? ' circ' : ''}" style="background:${hx(sc.cta)};color:${sc.onFillTextIsWhite ? '#fff' : '#000'};border-color:${rung === null ? 'transparent' : `rgba(0,0,0,${(rung / 100).toFixed(2)})`}">${text}</div>
        <div class="lab">${rung === null ? '—' : `offset-${String(rung).padStart(2, '0')}`}</div><div class="lab v${out ? ' out' : ''}">${lc === null ? 'clears' : `Lc ${lc.toFixed(1)}`}</div></div>`
    }
    return `<div class="tool" style="background:${hx(plane)}"><div class="tt">${sr} / ${pr}</div>
      ${cell(n, '+', true, NEUTRAL_RUNG, null)}
      ${cell(t.secondary!.scale, 'Secondary', false, sFires ? sr : null, secLc)}
      ${cell(t.primary.scale, 'Transfer tokens', false, pFires ? pr : null, priLc)}
      <div class="verdict ${holds ? 'ok' : 'no'}">${holds ? `primary leads by ${(pPresence - sPresence).toFixed(1)}` : `secondary leads by ${(sPresence - pPresence).toFixed(1)}`}</div></div>`
  }).join('')
  if (rows.length < 16)
    rows.push(`<div class="row"><div class="rid"><span class="dim">${c.tier}<br>${c.p} / ${c.s}<br>fills — pri Lc ${pFill.toFixed(1)} · sec Lc ${sFill.toFixed(1)}</span></div><div class="strips">${strips}</div></div>`)
}

const summary = COMBOS.map(([sr, pr]) => {
  const t = tally[`${sr}/${pr}`]
  return `<tr><td class="fam">${sr} / ${pr}</td><td class="n">${t.n}</td><td class="n hit">${t.hold}</td><td class="n">${t.fail}</td><td class="n">${t.secOut}</td><td class="n">${t.priOut}</td></tr>`
}).join('')

const html = `<!doctype html><meta charset="utf-8"><title>CTA border — 06/08 × 16/20</title>
<style>
  body { font: 14px/1.5 -apple-system, sans-serif; margin:0; background:#faf9f7; color:#1a1a1a; }
  .note { padding:1rem 1.4rem; background:#f2f0ec; font-size:.85rem; }
  table { border-collapse:collapse; margin:.7rem 1.4rem; font-size:.78rem; }
  th, td { padding:.3rem .8rem; border-bottom:1px solid #e7e4de; text-align:left; }
  th { font-size:.62rem; text-transform:uppercase; letter-spacing:.04em; opacity:.6; }
  td.n { text-align:right; font-variant-numeric:tabular-nums; }
  td.fam { font-weight:700; }
  td.hit { font-weight:800; }
  .row { display:flex; gap:1rem; align-items:center; padding:.7rem 1.4rem; border-bottom:1px solid #eceae4; }
  .rid { width:190px; flex:0 0 190px; font-size:.71rem; }
  .dim { opacity:.6; }
  .strips { display:flex; gap:1.1rem; flex-wrap:wrap; }
  .tool { display:flex; gap:.7rem; align-items:flex-start; padding:1.3rem .9rem 1.55rem; border-radius:13px; position:relative; }
  .tt { position:absolute; top:.38rem; left:.9rem; font-size:.56rem; text-transform:uppercase; letter-spacing:.06em; opacity:.55; font-weight:700; }
  .verdict { position:absolute; bottom:.38rem; left:.9rem; font-size:.53rem; text-transform:uppercase; letter-spacing:.04em; }
  .verdict.ok { opacity:.5; }
  .verdict.no { opacity:.95; font-weight:800; }
  .cell { display:flex; flex-direction:column; align-items:center; gap:.12rem; }
  .btn { min-width:108px; height:37px; border-radius:999px; border:1.5px solid transparent; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:.7rem; padding:0 .85rem; }
  .btn.circ { min-width:37px; width:37px; padding:0; font-size:1rem; }
  .lab { font-size:.52rem; text-transform:uppercase; letter-spacing:.03em; opacity:.6; }
  .lab.v { font-variant-numeric:tabular-nums; }
  .lab.out { opacity:1; font-weight:800; }
</style>
<div class="note"><b>Secondary 06 or 08 · primary 16 or 20.</b> Light mode. Neutral fixed at offset-08. <b>06 and 20 are new rungs</b> — the ladder held 04/08/12/16/24/32 and neither existed.<br>
Bold Lc = outside the 15–30 band. The line under each strip is which button reads loudest and by how much.</div>
<table><tr><th>sec / pri</th><th>cases</th><th>hierarchy holds</th><th>fails</th><th>secondary out of band</th><th>primary out of band</th></tr>${summary}</table>
${rows.join('')}
<div style="height:1.5rem"></div>`

mkdirSync(`${__dirname}/../render`, { recursive: true })
writeFileSync(`${__dirname}/../render/cta-border-hierarchy.html`, html)
console.log('written -> render/cta-border-hierarchy.html')
for (const [sr, pr] of COMBOS) { const t = tally[`${sr}/${pr}`]; console.log(`${sr}/${pr}: n ${t.n} hold ${t.hold} fail ${t.fail} secOut ${t.secOut} priOut ${t.priOut}`) }
