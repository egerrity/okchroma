// wash-respace-sweep.ts — OWNER EYE-CHECK: holistic re-spacing of the light wash band (stops 3–7) to absorb
// the paper-2 push (owner: "universally re-bless 3-7 as a whole... most room between 7 and 8"). Variants shift
// the 3–7 rootL scaffold DOWN by S at stop 3, tapering to 60% of S at stop 7 (consuming some 7↔8 room), with
// the seam floors declared (paper-2 ≥ 0.028 off paper-1; every wash seam ≥ 0.012 off its resolved neighbor).
// Writes render/wash-respace.html.
import { writeFileSync, mkdirSync } from 'fs'
import { resolveRamp, type ResolvedRamp } from '../../../src/reqtoken/resolve'
import { MODE_SPECS, type ModeSpec, type Require, type StopReq } from '../../../src/reqtoken/spec'
import { LIGHT_L } from '../../../src/engine/stopTable'
import { oklchToLinearRgb } from '../../../src/engine/constraints'

const enc = (c: number) => { c = Math.max(0, Math.min(1, c)); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055 }
const hx = (L: number, C: number, H: number) => '#' + oklchToLinearRgb(L, C, H).map(c => Math.round(enc(c) * 255).toString(16).padStart(2, '0')).join('')

const SEEDS: [string, string][] = [
  [hx(0.62, 0.06, 60), 'H60 C0.06 — muted warm (the collapse case)'],
  ['#c8a018', 'saturated yellow'],
  ['#3060c0', 'mid blue'],
  ['#2a9d5c', 'green'],
  ['#8a8a8a', 'near-gray'],
]

const P2SEP: Require = { metric: 'min-separation', against: 'paper-1', target: 0.028 }

// scaffold variant built from the PRE-respace LIGHT_L scaffold (the live spec already carries the adopted
// S=0.015 shift — this script reconstructs the historical decision space, so it stays honest if re-run):
// rootL[3..7] = LIGHT_L − S·taper(i), taper 1.0 → 0.6 linearly; no wash seam floors (the decision predates them).
function variant(S: number): ModeSpec {
  const base = MODE_SPECS.light
  const taper = (stop: number) => 1 - 0.4 * ((stop - 3) / 4)
  return {
    ...base,
    stops: base.stops.map((sp): StopReq => {
      if (sp.stop === 2) return { ...sp, require: P2SEP }
      if (sp.stop >= 3 && sp.stop <= 7) return { ...sp, rootL: LIGHT_L[sp.stop - 1] - S * taper(sp.stop), require: undefined }
      return sp
    }),
  }
}
// baseline: 0.028 declared, scaffold untouched (the state the owner flagged as too tight)
const baseline = variant(0)

const VARIANTS: [string, ModeSpec][] = [
  ['0.028 only (scaffold unchanged)', baseline],
  ['re-space S=0.010 (subtle)', variant(0.010)],
  ['re-space S=0.015 (matches median push)', variant(0.015)],
  ['re-space S=0.020 (roomier)', variant(0.020)],
]

const by = (r: ResolvedRamp, n: number) => r.stops.find(s => s.stop === n)!
const dE = (a: { L: number; C: number; H: number }, b: { L: number; C: number; H: number }) => {
  const rad = (h: number) => (h * Math.PI) / 180
  return Math.sqrt((a.L - b.L) ** 2
    + (a.C * Math.cos(rad(a.H)) - b.C * Math.cos(rad(b.H))) ** 2
    + (a.C * Math.sin(rad(a.H)) - b.C * Math.sin(rad(b.H))) ** 2)
}

function panel(label: string, r: ResolvedRamp): string {
  const p1 = by(r, 1), ink = by(r, 12)
  const seams = [1, 2, 3, 4, 5, 6, 7].map(n => dE(by(r, n), by(r, n + 1)))
  const worst = Math.min(...seams)
  const strip = [1, 2, 3, 4, 5, 6, 7, 8].map(n => {
    const s = by(r, n)
    return `<div style="flex:1"><div style="height:64px;background:${s.hex}"></div><div class="lbl">${n}</div></div>`
  }).join('')
  const seamRow = seams.map(v => `<div style="flex:1;text-align:center" class="seam${v < 0.010 ? ' bad' : ''}">${v.toFixed(3)}</div>`).join('')
  return `<div class="panel" style="background:${p1.hex};color:${ink.hex}">
    <div class="cap"><b>${label}</b> · worst seam ΔE ${worst.toFixed(3)}</div>
    <div class="row" style="border-radius:8px;overflow:hidden">${strip}</div>
    <div class="row" style="margin-top:3px;padding:0 4%">${seamRow}</div>
    <div style="margin-top:8px">${[2, 3, 4].map(n => `<span class="chip" style="background:${by(r, n).hex}">badge ${n}</span>`).join('')}</div>
  </div>`
}

const sections = SEEDS.map(([hex, note]) => {
  const panels = VARIANTS.map(([label, spec]) => panel(label, resolveRamp(hex, 'light', spec))).join('')
  return `<section><h2><span class="dot" style="background:${hex}"></span> ${hex} — ${note}</h2><div class="grid">${panels}</div></section>`
}).join('')

const html = `<!doctype html><meta charset="utf-8"><title>wash re-space sweep</title>
<style>
  body{margin:0;padding:28px;background:#f4f2ee;color:#222;font:14px/1.4 -apple-system,system-ui,sans-serif}
  h1{font-size:17px;font-weight:650} h2{font-size:13px;font-weight:600;margin:26px 0 8px}
  .dot{display:inline-block;width:12px;height:12px;border-radius:50%;vertical-align:-1px;margin-right:6px}
  .grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
  .panel{border-radius:12px;padding:14px;border:1px solid #00000014}
  .cap{font-size:11.5px;margin-bottom:8px;opacity:.85}
  .row{display:flex}
  .lbl{font-size:10px;opacity:.65;margin-top:3px;text-align:center}
  .seam{font-size:9.5px;opacity:.6}
  .seam.bad{opacity:1;font-weight:700;color:#c0262b}
  .chip{display:inline-block;padding:5px 12px;border-radius:6px;font-size:12px;margin-right:6px}
</style>
<h1>wash 3–7 holistic re-space — pick the shift (paper-2 ≥ 0.028 declared in all variants)</h1>
<div style="opacity:.65;font-size:12px">numbers under each strip = seam ΔE (1↔2 … 7↔8); red = under 0.010 · scaffold shifts DOWN by S at stop 3 tapering to 0.6·S at stop 7 (uses part of the 7↔8 room) · stops 8/10/11 re-solve automatically vs the pushed paper-2</div>
${sections}`

mkdirSync('render', { recursive: true })
writeFileSync('render/wash-respace.html', html)
console.log(`written → render/wash-respace.html (${SEEDS.length} seeds × ${VARIANTS.length} variants)`)
