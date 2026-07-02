// reqtoken-render.ts — EYE-CHECK page generator. Renders the reqtoken ramp for the documented edge seeds
// (plus a mid-blue control), light + dark side by side, each panel on ITS OWN resolved paper-1 background
// (dark is never judged on white). Static HTML, no client JS: node resolves, writes render/index.html.
import { writeFileSync, mkdirSync } from 'fs'
import { resolveRamp, type ResolvedRamp, type ResolvedStop } from '../src/reqtoken/resolve'

const SEEDS: [string, string][] = [
  ['#3060c0', 'mid blue (control)'],
  ['#c8a018', 'saturated yellow — H-K/gamut edge'],
  ['#2255cc', 'blue — dark-contrast edge'],
  ['#d94f1e', 'red-orange — torsion-band edge'],
  ['#2a9d5c', 'green'],
  ['#8a8a8a', 'near-gray — min-chroma edge'],
]

const by = (r: ResolvedRamp, n: number) => r.stops.find(s => s.stop === n)!
const sw = (s: ResolvedStop, w = 64) =>
  `<div style="width:${w}px"><div style="height:56px;border-radius:8px;background:${s.hex}"></div>
   <div class="lbl">${s.stop}${s.clamped ? '·req' : ''}</div></div>`

function panel(r: ResolvedRamp): string {
  const paper = by(r, 1), p2 = by(r, 2), ink = by(r, 12), ink11 = by(r, 11)
  const cta = r.roles.cta
  const onCta = r.ons.onFillIsWhite ? '#ffffff' : '#000000'
  const scale = r.stops.filter(s => s.stop <= 10).map(s => sw(s)).join('')
  return `<div class="panel" style="background:${paper.hex};color:${ink.hex}">
    <div class="mode">${r.mode}</div>
    <div class="row">${scale}</div>
    <div class="row" style="margin-top:10px;align-items:center">
      <div style="width:136px"><div style="height:56px;border-radius:8px;background:${cta.hex};display:flex;align-items:center;justify-content:center;color:${onCta};font-size:18px">Aa</div><div class="lbl">cta (off-scale)</div></div>
      <div class="chip" style="background:${p2.hex}">
        <span style="color:${ink11.hex};font-size:21px">Aa</span>
        <span style="color:${ink.hex};font-size:21px;font-weight:700">Aa</span>
      </div>
      <div class="lbl" style="align-self:center">ink 11 / 12 on paper-2</div>
    </div>
  </div>`
}

const sections = SEEDS.map(([hex, note]) => `
  <section>
    <h2><span class="dot" style="background:${hex}"></span> ${hex} — ${note}</h2>
    <div class="pair">${panel(resolveRamp(hex, 'light'))}${panel(resolveRamp(hex, 'dark'))}</div>
  </section>`).join('')

const html = `<!doctype html><meta charset="utf-8"><title>reqtoken eye-check</title>
<style>
  body{margin:0;padding:28px;background:#131316;color:#e8e8ea;font:14px/1.4 -apple-system,system-ui,sans-serif}
  h1{font-size:17px;font-weight:650} h2{font-size:13px;font-weight:600;margin:26px 0 8px}
  .dot{display:inline-block;width:12px;height:12px;border-radius:50%;vertical-align:-1px;margin-right:6px}
  .pair{display:flex;gap:14px;flex-wrap:wrap}
  .panel{flex:1;min-width:560px;border-radius:14px;padding:18px 18px 14px}
  .mode{font-size:11px;text-transform:uppercase;letter-spacing:.08em;opacity:.65;margin-bottom:10px}
  .row{display:flex;gap:6px}
  .lbl{font-size:10px;opacity:.72;margin-top:4px;text-align:center}
  .chip{display:flex;gap:14px;align-items:center;padding:10px 18px;border-radius:8px;height:36px}
</style>
<h1>reqtoken ramps — scale stops 1–10 + off-scale cta + ink text (parity-shaped declaration)</h1>
<div style="opacity:.65;font-size:12px">paper 1–2 · wash 3–7 · highlight 8–10 · cta = off-scale role with on-cta text · ink 11/12 as Aa on paper-2 · "·req" = the require clamp bound</div>
${sections}`

mkdirSync('render', { recursive: true })
writeFileSync('render/index.html', html)
console.log(`written → render/index.html (${SEEDS.length} seeds × 2 modes)`)
