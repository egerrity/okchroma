// paper2-sweep.ts — Stage-6 OWNER EYE-CHECK: renders the paper-2 min-separation candidates side by side so
// the owner picks the target. Per seed: the current output (no require) vs each candidate ΔE target, light
// mode, with the stop-1/2/3 strip enlarged and the downstream ripple (stops 8/11/12 re-solve vs the pushed
// paper-2) annotated. Writes render/paper2.html (served by the reqtoken-render preview config).
import { writeFileSync, mkdirSync } from 'fs'
import { resolveRamp, type ResolvedRamp } from '../src/reqtoken/resolve'
import { MODE_SPECS, PAPER2_SEPARATION_CANDIDATES, type ModeSpec, type Require } from '../src/reqtoken/spec'

const SEEDS: [string, string][] = [
  ['#3060c0', 'mid blue (control)'],
  ['#c8a018', 'saturated yellow'],
  ['#2a9d5c', 'green'],
  ['#d94f1e', 'red-orange'],
  ['#8a8a8a', 'near-gray'],
]

const withSeparation = (target: number): ModeSpec => {
  const base = MODE_SPECS.light
  const require: Require = { metric: 'min-separation', against: 'paper-1', target }
  return { ...base, stops: base.stops.map(sp => (sp.stop === 2 ? { ...sp, require } : sp)) }
}

const by = (r: ResolvedRamp, n: number) => r.stops.find(s => s.stop === n)!
const dE = (a: { L: number; C: number; H: number }, b: { L: number; C: number; H: number }) => {
  const rad = (h: number) => (h * Math.PI) / 180
  return Math.sqrt((a.L - b.L) ** 2
    + (a.C * Math.cos(rad(a.H)) - b.C * Math.cos(rad(b.H))) ** 2
    + (a.C * Math.sin(rad(a.H)) - b.C * Math.sin(rad(b.H))) ** 2)
}

function panel(label: string, r: ResolvedRamp, baseline: ResolvedRamp): string {
  const p1 = by(r, 1), p2 = by(r, 2), p3 = by(r, 3), ink = by(r, 12)
  const sep = dE(p1, p2)
  const ripple = [8, 11, 12].filter(n => by(r, n).hex !== by(baseline, n).hex)
  const strip = [1, 2, 3, 4, 5].map(n => {
    const s = by(r, n)
    return `<div style="flex:1"><div style="height:64px;background:${s.hex};${n === 2 ? 'outline:2px solid ' + ink.hex + '55;outline-offset:-2px;' : ''}"></div><div class="lbl">${n}</div></div>`
  }).join('')
  const rest = r.stops.filter(s => s.stop >= 6 && s.stop <= 10).map(s =>
    `<div style="flex:1"><div style="height:26px;background:${s.hex}"></div><div class="lbl">${s.stop}</div></div>`).join('')
  return `<div class="panel" style="background:${p1.hex};color:${ink.hex}">
    <div class="cap"><b>${label}</b> · stop1↔2 ΔE ${sep.toFixed(3)}${ripple.length ? ` · re-solved: ${ripple.join(', ')}` : ' · no ripple'}</div>
    <div class="row" style="border-radius:8px;overflow:hidden">${strip}</div>
    <div class="row" style="margin-top:6px;border-radius:6px;overflow:hidden">${rest}</div>
    <div class="chip" style="background:${p2.hex};color:${ink.hex}">badge on paper-2</div>
  </div>`
}

const sections = SEEDS.map(([hex, note]) => {
  const baseline = resolveRamp(hex, 'light')
  const panels = [
    panel('current (no require)', baseline, baseline),
    ...PAPER2_SEPARATION_CANDIDATES.map(t => panel(`ΔE ≥ ${t}`, resolveRamp(hex, 'light', withSeparation(t)), baseline)),
  ].join('')
  return `<section><h2><span class="dot" style="background:${hex}"></span> ${hex} — ${note}</h2><div class="grid">${panels}</div></section>`
}).join('')

const html = `<!doctype html><meta charset="utf-8"><title>paper-2 separation sweep</title>
<style>
  body{margin:0;padding:28px;background:#f4f2ee;color:#222;font:14px/1.4 -apple-system,system-ui,sans-serif}
  h1{font-size:17px;font-weight:650} h2{font-size:13px;font-weight:600;margin:26px 0 8px}
  .dot{display:inline-block;width:12px;height:12px;border-radius:50%;vertical-align:-1px;margin-right:6px}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px}
  .panel{border-radius:12px;padding:14px;border:1px solid #00000014}
  .cap{font-size:11.5px;margin-bottom:8px;opacity:.85}
  .row{display:flex}
  .lbl{font-size:10px;opacity:.65;margin-top:3px;text-align:center}
  .chip{display:inline-block;margin-top:8px;padding:5px 12px;border-radius:6px;font-size:12px}
</style>
<h1>paper-2 min-separation — pick the target (light mode; dark already sits at ΔE ≈ 0.035)</h1>
<div style="opacity:.65;font-size:12px">stop 2 is outlined in each strip · "re-solved" lists downstream stops that moved because their contrast requires reference the pushed paper-2 · current light median ΔE ≈ 0.013</div>
${sections}`

mkdirSync('render', { recursive: true })
writeFileSync('render/paper2.html', html)
console.log(`written → render/paper2.html (${SEEDS.length} seeds × ${1 + PAPER2_SEPARATION_CANDIDATES.length} variants)`)
