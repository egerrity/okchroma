// dark-badges.ts — OWNER EYE-CHECK for the blue-recede fix: dark scale stops 1–7 produced with
// 'perceptual-lift' (the H-K solve floored at the scaffold — lift, never sink) vs today's 'perceptual'.
// Rendered in the REAL failing context: wash-3/wash-4 badges on the neutral dark card (the Customers
// table), where blue/violet badges currently sit BELOW their own background's luminance.
// Writes render/dark-badges.html. The DEFAULT spec is unchanged — this is the proposal.
import { writeFileSync, mkdirSync } from 'fs'
import { resolveRamp, type ResolvedRamp } from '../src/reqtoken/resolve'
import { MODE_SPECS, type ModeSpec } from '../src/reqtoken/spec'
import { generateNeutralScale } from '../src/engine/colorEngine'
import { SIGNALS } from '../src/engine/signals'

const hx = (s: { r: number; g: number; b: number }) => '#' + [s.r, s.g, s.b].map(c => Math.round(Math.max(0, Math.min(1, c)) * 255).toString(16).padStart(2, '0')).join('')

// the proposal: dark stops 1–7 lift (8–10 stay hand-placed; ink 11/12 unchanged)
const LIFTED: ModeSpec = {
  ...MODE_SPECS.dark,
  stops: MODE_SPECS.dark.stops.map(sp =>
    sp.stop <= 7 && sp.produce.L === 'perceptual'
      ? { ...sp, produce: { ...sp.produce, L: 'perceptual-lift' as const } }
      : sp),
}

const neutral = generateNeutralScale(250, 'default')
const page = hx(neutral.dark[0])       // neutral paper-1: the app background
const card = hx(neutral.dark[2])       // neutral wash-3: the table/card the badges sit on
const cardText = hx(neutral.dark[11])  // neutral ink-12

const SEEDS: [string, string][] = [
  ...SIGNALS.map(s => [s.name, s.hex] as [string, string]),
  ['blue brand', '#2255cc'],
  ['violet brand', '#6633cc'],
]

const by = (r: ResolvedRamp, n: number) => r.stops.find(s => s.stop === n)!
const pill = (bg: string, fg: string, label: string) =>
  `<span style="display:inline-block;background:${bg};color:${fg};border-radius:999px;padding:5px 14px;font-size:12.5px;font-weight:600;margin-right:8px">${label}</span>`

function badgeRow(label: string, hex: string, spec: ModeSpec | undefined): string {
  const r = resolveRamp(hex, 'dark', spec)
  const w3 = by(r, 3), w4 = by(r, 4), ink = by(r, 11)
  return `<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid #ffffff12">
    <span style="width:86px;font-size:11px;opacity:.6">${label}</span>
    ${pill(w3.hex, ink.hex, 'wash-3 badge')}${pill(w4.hex, ink.hex, 'wash-4 badge')}
    <span style="font-size:10.5px;opacity:.45">w3 L ${w3.L.toFixed(3)}</span>
  </div>`
}

function panel(title: string, spec: ModeSpec | undefined): string {
  const rows = SEEDS.map(([label, hex]) => badgeRow(label, hex, spec)).join('')
  return `<div style="flex:1;min-width:430px;background:${page};border-radius:14px;padding:16px">
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;opacity:.55;color:${cardText};margin-bottom:10px">${title}</div>
    <div style="background:${card};border-radius:10px;padding:6px 16px;color:${cardText}">${rows}</div>
  </div>`
}

// the blue ladder itself, current vs lifted
function ladder(title: string, spec: ModeSpec | undefined): string {
  const r = resolveRamp('#2255cc', 'dark', spec)
  const cells = r.stops.filter(s => s.stop <= 8).map(s =>
    `<div style="flex:1"><div style="height:44px;background:${s.hex}"></div><div style="font-size:9.5px;opacity:.55;text-align:center;margin-top:2px">${s.stop}<br>${s.L.toFixed(3)}</div></div>`).join('')
  return `<div style="flex:1;min-width:430px"><div style="font-size:11px;opacity:.6;margin-bottom:6px">${title}</div>
    <div style="display:flex;border-radius:8px;overflow:hidden">${cells}</div></div>`
}

const html = `<!doctype html><meta charset="utf-8"><title>dark badge lift — blue recede fix</title>
<style>body{margin:0;padding:28px;background:#131316;color:#e8e8ea;font:14px/1.45 -apple-system,system-ui,sans-serif} h1{font-size:16px;font-weight:650}</style>
<h1>blue-recede fix: dark scale 'perceptual-lift' (H-K solve floored at the scaffold) — pick</h1>
<div style="opacity:.6;font-size:12px;margin-bottom:18px">badges = family wash-3/4 with ink-11 text, on the NEUTRAL dark card (the real Customers-table context) · left = today (blue/violet sink below the card) · right = lifted (floored at the scaffold; yellow/green keep their H-K lift, nothing ever sinks)</div>
<div style="display:flex;gap:16px;flex-wrap:wrap">${panel('current (perceptual)', undefined)}${panel("proposed (perceptual-lift)", LIFTED)}</div>
<div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:22px">${ladder('blue #2255cc dark ladder — current', undefined)}${ladder('blue — lifted', LIFTED)}</div>`

mkdirSync('render', { recursive: true })
writeFileSync('render/dark-badges.html', html)
console.log('written → render/dark-badges.html')
