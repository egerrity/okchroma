// paper2-seam.ts — OWNER EYE-CHECK for the warm-hue seam finding: the 0.028 paper-2 push lands on top of
// wash-3 for muted warm hues (H60 low-chroma: ΔE(2,3) collapses to 0.0016). Renders three variants so the
// owner picks the resolution: current (no separation) · 0.028 only (collapse visible) · 0.028 + the CHAINED
// wash-3 separation (stop 3 must stand ΔE ≥ 0.012 off the resolved paper-2 — same rule, next seam).
// Writes render/paper2-seam.html.
import { writeFileSync, mkdirSync } from 'fs'
import { resolveRamp, type ResolvedRamp } from '../src/reqtoken/resolve'
import { MODE_SPECS, type ModeSpec, type Require } from '../src/reqtoken/spec'
import { oklchToLinearRgb } from '../src/engine/constraints'

const enc = (c: number) => { c = Math.max(0, Math.min(1, c)); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055 }
const hx = (L: number, C: number, H: number) => '#' + oklchToLinearRgb(L, C, H).map(c => Math.round(enc(c) * 255).toString(16).padStart(2, '0')).join('')

// the affected band + controls: muted warm (the collapse), saturated warm, and a blue control
const SEEDS: [string, string][] = [
  [hx(0.62, 0.06, 60), 'H60 C0.06 — muted warm (THE collapse case)'],
  [hx(0.62, 0.13, 75), 'H75 C0.13 — warm'],
  ['#c8a018', 'saturated yellow'],
  ['#3060c0', 'mid blue (control — unaffected)'],
]

const P2SEP: Require = { metric: 'min-separation', against: 'paper-1', target: 0.028 }
const W3SEP: Require = { metric: 'min-separation', against: 'prev', target: 0.012 }
const variant = (p2: boolean, w3: boolean): ModeSpec => {
  const base = MODE_SPECS.light
  return {
    ...base,
    stops: base.stops.map(sp =>
      sp.stop === 2 ? { ...sp, require: p2 ? P2SEP : undefined }
      : sp.stop === 3 ? { ...sp, require: w3 ? W3SEP : undefined }
      : sp),
  }
}

const by = (r: ResolvedRamp, n: number) => r.stops.find(s => s.stop === n)!
const dE = (a: { L: number; C: number; H: number }, b: { L: number; C: number; H: number }) => {
  const rad = (h: number) => (h * Math.PI) / 180
  return Math.sqrt((a.L - b.L) ** 2
    + (a.C * Math.cos(rad(a.H)) - b.C * Math.cos(rad(b.H))) ** 2
    + (a.C * Math.sin(rad(a.H)) - b.C * Math.sin(rad(b.H))) ** 2)
}

function panel(label: string, r: ResolvedRamp): string {
  const p1 = by(r, 1), p2 = by(r, 2), p3 = by(r, 3), ink = by(r, 12)
  const strip = [1, 2, 3, 4, 5].map(n => {
    const s = by(r, n)
    return `<div style="flex:1"><div style="height:72px;background:${s.hex}"></div><div class="lbl">${n}</div></div>`
  }).join('')
  return `<div class="panel" style="background:${p1.hex};color:${ink.hex}">
    <div class="cap"><b>${label}</b><br>ΔE 1↔2 = ${dE(p1, p2).toFixed(3)} · ΔE 2↔3 = ${dE(p2, p3).toFixed(3)}</div>
    <div class="row" style="border-radius:8px;overflow:hidden">${strip}</div>
    <div style="margin-top:8px"><span class="chip" style="background:${p2.hex}">on paper-2</span>
    <span class="chip" style="background:${p3.hex}">wash-3 badge</span></div>
  </div>`
}

const sections = SEEDS.map(([hex, note]) => {
  const panels = [
    panel('current (no separation)', resolveRamp(hex, 'light', variant(false, false))),
    panel('0.028 only', resolveRamp(hex, 'light', variant(true, false))),
    panel('0.028 + chained wash-3 (0.012)', resolveRamp(hex, 'light', variant(true, true))),
  ].join('')
  return `<section><h2><span class="dot" style="background:${hex}"></span> ${hex} — ${note}</h2><div class="grid">${panels}</div></section>`
}).join('')

const html = `<!doctype html><meta charset="utf-8"><title>paper-2 seam: chained wash-3 separation</title>
<style>
  body{margin:0;padding:28px;background:#f4f2ee;color:#222;font:14px/1.4 -apple-system,system-ui,sans-serif}
  h1{font-size:17px;font-weight:650} h2{font-size:13px;font-weight:600;margin:26px 0 8px}
  .dot{display:inline-block;width:12px;height:12px;border-radius:50%;vertical-align:-1px;margin-right:6px}
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
  .panel{border-radius:12px;padding:14px;border:1px solid #00000014}
  .cap{font-size:11.5px;margin-bottom:8px;opacity:.85;line-height:1.5}
  .row{display:flex}
  .lbl{font-size:10px;opacity:.65;margin-top:3px;text-align:center}
  .chip{display:inline-block;padding:5px 12px;border-radius:6px;font-size:12px;margin-right:6px}
</style>
<h1>the warm-hue seam: 0.028 pushes paper-2 onto wash-3 for muted warm hues — pick the resolution</h1>
<div style="opacity:.65;font-size:12px">middle column shows the collapse (H60: ΔE 2↔3 = 0.002 — wash-3 badge vanishes on paper-2) · right column adds the CHAINED rule: wash-3 must stand ΔE ≥ 0.012 off the resolved paper-2 (same min-separation rule, next seam; floor semantics — unaffected hues don't move)</div>
${sections}`

mkdirSync('render', { recursive: true })
writeFileSync('render/paper2-seam.html', html)
console.log('written → render/paper2-seam.html')
