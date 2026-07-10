// c12-lane-compare.ts — owner ask (2026-07-10): "do any differ significantly between apca and
// wcag that we should eyeball before I approve?" Renders exactly the divergent seeds from
// proposal-sim2.json: the 1 variant side-flip, 2 zone-differers, 16 one-lane-only fires, 11
// wcag variant-stuck. Per row: seed chip · apca was→now · wcag was→now.
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { whiteTextLcAt, apcaYAt } from '/Users/emilygerrity/okchroma/src/reqtoken/producers'
import { clampChromaToGamut, oklchToLinearRgb, apcaLc } from '/Users/emilygerrity/okchroma/src/engine/constraints'

const sim = JSON.parse(readFileSync('/Users/emilygerrity/okchroma/scripts/c12-session/proposal-sim2.json', 'utf8'))
type P = { L: number; C: number; H: number }
const hx = (p: P) => {
  const c = clampChromaToGamut(p.L, p.C, p.H)
  const [rl, gl, bl] = oklchToLinearRgb(p.L, c, p.H)
  const gm = (v: number) => { const x = Math.min(1, Math.max(0, v)); return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055 }
  const ch = (v: number) => Math.round(gm(v) * 255).toString(16).padStart(2, '0')
  return `#${ch(rl)}${ch(gl)}${ch(bl)}`
}
const white = (p: P) => whiteTextLcAt(p.L, clampChromaToGamut(p.L, p.C, p.H), p.H) >= Math.abs(apcaLc(apcaYAt(0, 0, 0), apcaYAt(p.L, clampChromaToGamut(p.L, p.C, p.H), p.H)))
const btn = (p: P, label: string) => `<div class="btn" style="background:${hx(p)};color:${white(p) ? '#fff' : '#000'}">${label}</div>`
const chip = (p: P) => `<span class="chip" style="background:${hx(p)}"></span>`

const by: Record<string, any> = {}
for (const r of sim.rows) { const k = `${r.H}|${r.C}|${r.L}`; (by[k] ??= {})[r.profile] = r }

const laneCell = (r: any) => {
  if (!r) return `<span class="xlab">not fired — untouched</span>`
  const lt = r.light
  if (r.unreachable === 'variant') return `${btn(lt?.base ?? { L: r.L, C: r.C, H: r.H }, 'Primary action')}<span class="xlab">variant STUCK</span>`
  if (!lt) return `<span class="xlab">dark-only fire</span>`
  if (lt.variant) return `${btn(lt.base, 'Primary action')}<span class="xlab">red→</span>${btn(lt.variant, 'Delete')}<span class="xlab">${lt.side} L${lt.variant.L.toFixed(2)}</span>`
  return `${btn(lt.base, 'Primary action')}<span class="xlab">→</span>${btn(lt.treated, 'Primary action')}<span class="xlab">L${lt.treated.L.toFixed(2)}${(Math.max(0, lt.lc ?? 99) < 60) ? ' SUB-60' : ''}</span>`
}
const row = (k: string, tag: string) => {
  const [H, C, L] = k.split('|').map(Number)
  const v = by[k] ?? {}
  return `<div class="row"><div class="rlab">H${H} C${C} L${L}<br><span class="mk">${tag}</span></div>
  ${chip({ L, C, H })}
  <div class="lane"><div class="lhead">apca</div>${laneCell(v.apca)}</div>
  <div class="lane"><div class="lhead">wcag</div>${laneCell(v.wcag)}</div></div>`
}

const sideFlip = ['24|0.22|0.55']
const zoneDiff = ['32|0.2|0.65', '40|0.22|0.65']
const stuck = Object.entries(by).filter(([, v]: any) => v.wcag?.unreachable === 'variant').map(([k]) => k)
const oneLane = Object.entries(by).filter(([, v]: any) => (!v.apca) !== (!v.wcag)).map(([k]) => k)

const html = `<!doctype html><meta charset="utf-8"><title>C12 — lane compare</title>
<style>
  body { font: 14px/1.5 -apple-system, sans-serif; margin:0; background:#faf9f7; color:#1a1a1a; }
  .note { padding:.9rem 1.4rem; background:#f2f0ec; font-size:.88rem; }
  h1 { margin:1.5rem 1.4rem .3rem; font-size:.95rem; }
  .row { display:flex; align-items:center; gap:1rem; padding:.45rem 1.4rem; border-bottom:1px solid #e5e2dd; }
  .rlab { width:130px; font-size:.72rem; opacity:.65; }
  .mk { font-size:.64rem; font-weight:600; }
  .chip { flex:0 0 26px; width:26px; height:26px; border-radius:6px; }
  .lane { display:flex; align-items:center; gap:.5rem; flex:1; }
  .lhead { font-size:.66rem; text-transform:uppercase; letter-spacing:.05em; opacity:.5; width:38px; }
  .btn { padding:.45rem 1.1rem; border-radius:8px; font-size:.8rem; font-weight:600; white-space:nowrap; }
  .xlab { font-size:.66rem; opacity:.55; }
</style>
<div class="note"><b>C12 — where the two lanes diverge</b> (everything else treats identically; class mismatches across lanes: ZERO). Per row: seed · apca outcome · wcag outcome.</div>
<h1>1 · The one true oddity — variant lands on OPPOSITE sides per lane (1)</h1>
${sideFlip.map(k => row(k, 'side flip')).join('')}
<h1>2 · Treated result differs >0.05 L (2) — apca pushes past the zone, wcag stops at 4.5-white</h1>
${zoneDiff.map(k => row(k, 'zone differ')).join('')}
<h1>3 · wcag variant-stuck, served fine in apca (${stuck.length})</h1>
${stuck.map(k => row(k, 'wcag stuck')).join('')}
<h1>4 · Fires in one lane only (${oneLane.length}) — wcag bases sit darker (4.5≈Lc75) so wcag fires more</h1>
${oneLane.map(k => row(k, 'one-lane fire')).join('')}`
mkdirSync('/Users/emilygerrity/okchroma/render', { recursive: true })
writeFileSync('/Users/emilygerrity/okchroma/render/c12-lane-compare.html', html)
console.log(`written -> render/c12-lane-compare.html (flip 1 · zone 2 · stuck ${stuck.length} · one-lane ${oneLane.length})`)
