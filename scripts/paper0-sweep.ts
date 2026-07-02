// paper0-sweep.ts — OWNER EYE-CHECK: the dark paper-0 rootL (the adaptive anchor replacing hard #000000).
// Rendered in the real context: a dark app shell — sunken side rail (paper-0 candidate) beside the paper-1
// page with a raised paper-2 card. Candidates vs the old absolute black. Writes render/paper0.html.
import { writeFileSync, mkdirSync } from 'fs'
import { resolveRamp, type ResolvedRamp } from '../src/reqtoken/resolve'
import { MODE_SPECS, type ModeSpec } from '../src/reqtoken/spec'
import { oklchToLinearRgb } from '../src/engine/constraints'

const enc = (c: number) => { c = Math.max(0, Math.min(1, c)); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055 }
const hx = (L: number, C: number, H: number) => '#' + oklchToLinearRgb(L, C, H).map(c => Math.round(enc(c) * 255).toString(16).padStart(2, '0')).join('')

const withPaper0 = (rootL: number): ModeSpec => ({
  ...MODE_SPECS.dark,
  stops: MODE_SPECS.dark.stops.map(sp => (sp.stop === 0 ? { ...sp, rootL } : sp)),
})

const by = (r: ResolvedRamp, n: number) => r.stops.find(s => s.stop === n)!
const graySeed = hx(0.5, 0.006, 250)   // the neutral's near-gray seed shape

function shell(label: string, p0hex: string, r: ResolvedRamp): string {
  const p1 = by(r, 1), p2 = by(r, 2), w3 = by(r, 3), ink = by(r, 12), ink11 = by(r, 11)
  return `<div style="flex:1;min-width:300px">
    <div style="font-size:11.5px;opacity:.65;margin-bottom:6px"><b>${label}</b> · rail ${p0hex}</div>
    <div style="display:grid;grid-template-columns:88px 1fr;height:190px;border-radius:12px;overflow:hidden;background:${p1.hex}">
      <div style="background:${p0hex};padding:10px 9px;color:${ink11.hex};font-size:10px">
        <div style="font-weight:700;color:${ink.hex};margin-bottom:8px">Brand</div>
        <div style="background:${w3.hex};border-radius:5px;padding:3px 6px;margin-bottom:4px;color:${ink.hex}">Dashboard</div>
        <div style="padding:3px 6px">Projects</div>
        <div style="padding:3px 6px">Tasks</div>
      </div>
      <div style="padding:12px;color:${ink.hex}">
        <div style="font-size:12px;font-weight:700;margin-bottom:8px">Dashboard</div>
        <div style="background:${p2.hex};border-radius:8px;padding:10px;font-size:10.5px;color:${ink11.hex}">
          raised card on paper-2<br><span style="color:${ink.hex};font-size:15px;font-weight:700">24</span>
        </div>
      </div>
    </div>
  </div>`
}

const base = resolveRamp(graySeed, 'dark')
const variants: [string, string][] = [
  ['current shipped (L 0.145)', by(resolveRamp(graySeed, 'dark', withPaper0(0.145)), 0).hex],
  ['old absolute black', '#000000'],
  ['L 0.16 (shallowest)', by(resolveRamp(graySeed, 'dark', withPaper0(0.16)), 0).hex],
  ['L 0.13 (deeper)', by(resolveRamp(graySeed, 'dark', withPaper0(0.13)), 0).hex],
]

const html = `<!doctype html><meta charset="utf-8"><title>dark paper-0 sweep</title>
<style>body{margin:0;padding:28px;background:#131316;color:#e8e8ea;font:14px/1.45 -apple-system,system-ui,sans-serif} h1{font-size:16px;font-weight:650}</style>
<h1>adaptive dark paper-0 — the sunken rail (page = paper-1 L 0.178, raised card = paper-2)</h1>
<div style="opacity:.6;font-size:12px;margin-bottom:16px">paper-0 is now a resolved neutral stop, one seam below paper-1 · pick the depth</div>
<div style="display:flex;gap:14px;flex-wrap:wrap">${variants.map(([l, h]) => shell(l, h, base)).join('')}</div>`

mkdirSync('render', { recursive: true })
writeFileSync('render/paper0.html', html)
console.log('written → render/paper0.html · candidates: ' + variants.map(([l, h]) => `${l}=${h}`).join(' · '))
