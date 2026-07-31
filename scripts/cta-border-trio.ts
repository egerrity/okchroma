// cta-border-trio.ts — your ladder vs the in-band pick, across a validation set (owner 2026-07-31).
//
// OWNER RULINGS BAKED IN, do not re-solve them:
//   · THE NEUTRAL IS NOT BEING TOUCHED — offset-08 in both modes, in BOTH strips. Never solved.
//   · The band is hers: Lc 15 floor, Lc 30 ceiling. "We aren't making something readable, we are
//     adding a stylistic pop."
//   · The gate runs first: a fill already clear of Lc 15 against the page gets NO stroke. Scoring
//     a stroke over a deep fill is meaningless — it just inherits the fill's own distance.
//
// LEFT  = your hand edit, 08 / 12 / 24.
// RIGHT = the in-band pick: quietest rung whose stroke reaches Lc 15, capped by the Lc 30 ceiling.
// Only the secondary and primary are ever solved.
import { writeFileSync, mkdirSync } from 'fs'
import { resolveTheme } from '../src/engine/resolve'
import { generateNeutralScale, type ColorStop, type GeneratedScale } from '../src/engine/colorEngine'
import { maxChromaAt } from '../src/engine/colorMath'
import { clampChromaToGamut, oklchToLinearRgb, apcaY, apcaLc } from '../src/engine/constraints'

const P = 'wcag' as const
const LADDER = [4, 8, 12, 16, 24, 32]
const NEUTRAL_RUNG = 8
const HER: Record<string, number> = { secondary: 12, primary: 24 }
const BAND: [number, number] = [15, 30]

const gm = (v: number) => { const x = Math.min(1, Math.max(0, v)); return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055 }
const enc = (c: { L: number; C: number; H: number }): [number, number, number] => {
  const [r, g, b] = oklchToLinearRgb(c.L, clampChromaToGamut(c.L, c.C, c.H), c.H); return [gm(r), gm(g), gm(b)]
}
const hx = (c: { L: number; C: number; H: number }) => { const [r, g, b] = enc(c); const ch = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0'); return `#${ch(r)}${ch(g)}${ch(b)}` }
const Yof = (c: { L: number; C: number; H: number }) => { const [r, g, b] = enc(c); return apcaY(r, g, b) }
const strokeLc = (fill: ColorStop, plane: ColorStop, mode: 'light' | 'dark', pct: number) => {
  const [r, g, b] = enc(fill), p = mode === 'light' ? 0 : 1, a = pct / 100
  return Math.abs(apcaLc(apcaY(r + (p - r) * a, g + (p - g) * a, b + (p - b) * a), Yof(plane)))
}
const fillLc = (f: ColorStop, pl: ColorStop) => Math.abs(apcaLc(Yof(f), Yof(pl)))
const inBand = (fill: ColorStop, plane: ColorStop, mode: 'light' | 'dark') => {
  const s = LADDER.map(r => ({ r, v: strokeLc(fill, plane, mode, r) }))
  const hit = s.filter(x => x.v >= BAND[0] && x.v <= BAND[1])
  return hit.length ? hit[0] : s.reduce((a, b) => Math.abs(b.v - 22) < Math.abs(a.v - 22) ? b : a)
}
const seed = (L: number, H: number, s: number) => hx({ L, C: s * maxChromaAt(L, H), H })

// VALIDATION SET: the hue wheel at three lightness tiers — pale (where this fires), mid, deep
// (where it should not). Agnostic seeds, not named brands.
const CASES: { p: string; s: string; label: string }[] = []
for (const [tier, pL, sL] of [['pale', 0.94, 0.90], ['mid', 0.78, 0.74], ['deep', 0.58, 0.52]] as const)
  for (const H of [145, 250, 30, 85, 300, 190])
    CASES.push({ p: seed(pL, H, 1.0), s: seed(sL, (H + 130) % 360, 0.75), label: `${tier} · hue ${H}` })

const rows: string[] = []
let agree = 0, differ = 0, herOut = 0, fired = 0
const inWho: Record<string, number> = {}, outWho: Record<string, number> = {}
for (const c of CASES) {
  const t = resolveTheme({ primaryHex: c.p, secondaryHex: c.s, secondaryStyle: 'default', contrastProfile: P })
  const n = generateNeutralScale(t.primary.scale.brandH, 'default', P)
  for (const mode of ['light', 'dark'] as const) {
    const plane = mode === 'light' ? n.light.find(x => x.stop === 2)! : n.dark.find(x => x.stop === 1)!
    const pole = mode === 'light' ? '0,0,0' : '255,255,255'
    const cell = (sc: GeneratedScale, text: string, circle: boolean, rung: number | null, note: string, bold: boolean) =>
      `<div class="cell"><div class="btn${circle ? ' circ' : ''}" style="background:${hx(mode === 'light' ? sc.cta : sc.ctaDark)};color:${(mode === 'light' ? sc.onFillTextIsWhite : sc.onFillTextIsWhiteDark) ? '#fff' : '#000'};border-color:${rung === null ? 'transparent' : `rgba(${pole},${(rung / 100).toFixed(2)})`}">${text}</div>
        <div class="lab">${rung === null ? '—' : `offset-${String(rung).padStart(2, '0')}`}</div><div class="lab v${bold ? ' out' : ''}">${note}</div></div>`
    const strip = (title: string, pick: (fam: 'secondary' | 'primary', fill: ColorStop) => number) => {
      const parts = [cell(n, '+', true, NEUTRAL_RUNG, 'fixed', false)]
      for (const fam of ['secondary', 'primary'] as const) {
        const sc = fam === 'secondary' ? t.secondary!.scale : t.primary.scale
        const text = fam === 'secondary' ? 'Secondary' : 'Transfer tokens'
        const fill = mode === 'light' ? sc.cta : sc.ctaDark
        if (fillLc(fill, plane) >= BAND[0]) { parts.push(cell(sc, text, false, null, 'clears', false)); continue }
        const r = pick(fam, fill)
        const v = strokeLc(fill, plane, mode, r)
        parts.push(cell(sc, text, false, r, `Lc ${v.toFixed(1)}`, v < BAND[0] || v > BAND[1]))
      }
      return `<div class="tool" style="background:${hx(plane)}"><div class="tt">${title}</div>${parts.join('')}</div>`
    }
    // tally: where do the two strips actually disagree?
    for (const fam of ['secondary', 'primary'] as const) {
      const sc = fam === 'secondary' ? t.secondary!.scale : t.primary.scale
      const fill = mode === 'light' ? sc.cta : sc.ctaDark
      if (fillLc(fill, plane) >= BAND[0]) continue
      fired++
      const hv = strokeLc(fill, plane, mode, HER[fam])
      // the useful tally is whether YOUR rung lands in band — not whether it happens to be the
      // quietest one, which it never is by construction.
      if (hv < BAND[0] || hv > BAND[1]) { herOut++; outWho[fam] = (outWho[fam] ?? 0) + 1 }
      else { agree++; inWho[fam] = (inWho[fam] ?? 0) + 1 }
      differ++
    }
    rows.push(`<div class="row ${mode}"><div class="rid"><b>${mode}</b> · ${c.label}<br><span class="dim">${c.p} / ${c.s}</span></div>
      <div class="strips">${strip('your ladder', f => HER[f])}${strip('in band', (_f, fill) => inBand(fill, plane, mode).r)}</div></div>`)
  }
}

const html = `<!doctype html><meta charset="utf-8"><title>CTA border — validation set</title>
<style>
  body { font: 14px/1.5 -apple-system, sans-serif; margin:0; background:#faf9f7; color:#1a1a1a; }
  .note { padding:1rem 1.4rem; background:#f2f0ec; font-size:.85rem; }
  .row { display:flex; gap:1rem; align-items:center; padding:.6rem 1.4rem; }
  .row.dark { background:#141416; color:#d8d8d8; }
  .rid { width:190px; flex:0 0 190px; font-size:.72rem; }
  .dim { opacity:.55; font-size:.66rem; }
  .strips { display:flex; gap:1.4rem; flex-wrap:wrap; }
  .tool { display:flex; gap:.75rem; align-items:flex-start; padding:1.35rem .95rem .7rem; border-radius:13px; position:relative; }
  .tt { position:absolute; top:.4rem; left:.95rem; font-size:.54rem; text-transform:uppercase; letter-spacing:.05em; opacity:.5; }
  .row.dark .tt { color:#c9c9c9; }
  .cell { display:flex; flex-direction:column; align-items:center; gap:.12rem; }
  .btn { min-width:112px; height:38px; border-radius:999px; border:1.5px solid transparent; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:.72rem; padding:0 .9rem; }
  .btn.circ { min-width:38px; width:38px; padding:0; font-size:1.05rem; }
  .lab { font-size:.53rem; text-transform:uppercase; letter-spacing:.03em; opacity:.6; }
  .lab.v { font-variant-numeric:tabular-nums; }
  .lab.out { opacity:1; font-weight:800; }
</style>
<div class="note"><b>Your ladder vs the in-band pick — ${CASES.length} brands × both modes.</b> Hue wheel at three lightness tiers. Strokes render as the component renders them: <code>border: 1.5px solid rgba(…)</code> over the fill.<br>
<b>Neutral is fixed at offset-08</b> in both strips and both modes — not solved, not ranked. Only the secondary and primary are picked. <b>clears</b> = the fill already reads on its own, so no stroke. Bold Lc = outside your 15–30 band.<br>
Of <b>${fired}</b> fills that fire, your ladder lands <b>in band on ${agree}</b> (secondary ${inWho.secondary ?? 0} · primary ${inWho.primary ?? 0}) and <b>outside on ${herOut}</b> (secondary ${outWho.secondary ?? 0} · primary ${outWho.primary ?? 0}). The right strip is always the <i>quietest</i> in-band rung, so it never matches yours by construction — read it as the floor, not as a rival pick.</div>
${rows.join('')}
<div style="height:1.5rem"></div>`

mkdirSync(`${__dirname}/../render`, { recursive: true })
writeFileSync(`${__dirname}/../render/cta-border-trio.html`, html)
console.log(`written -> render/cta-border-trio.html · ${CASES.length} brands`)
console.log(`fired ${fired} · agree ${agree} · differ ${differ} · your ladder out of band ${herOut}`)
