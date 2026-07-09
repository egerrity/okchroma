// paper2-distributions.ts — TASK 1 eye-check exhibit (real pipeline). Plain ramps, no borders/gaps.
// Columns: current (clamp/delta ON) | A (delta off, paper-2 rootL nudged alone) | B (geometric redistribute
// 1-8, paper-1→0.987) | C (geometric, paper-1 held at 0.993). Rendered in BOTH profiles (apca, wcag).
// A/B/C drop the min-separation DELTAS entirely (stops fall where placed, on-curve) and KEEP stop-8's
// contrast require (mapped per profile). Stops 0-8 shown.
import { writeFileSync, mkdirSync } from 'fs'
import { resolveRamp } from '../src/reqtoken/resolve'
import { MODE_SPECS, type ModeSpec } from '../src/reqtoken/spec'
import { withProfile, type ContrastProfile } from '../src/reqtoken/profiles'

// column rootL overrides (stop -> rootL); null = current LIGHT_L. dropDelta strips min-separation requires.
type Col = { label: string; rootLs: Record<number, number> | null; dropDelta: boolean }
const COLS: Col[] = [
  { label: 'current', rootLs: null, dropDelta: false },
  { label: 'A', rootLs: { 2: 0.974 }, dropDelta: true },
  { label: 'B', rootLs: { 1: 0.987, 2: 0.970, 3: 0.950, 4: 0.924, 5: 0.892, 6: 0.852, 7: 0.801, 8: 0.738 }, dropDelta: true },
  { label: 'C', rootLs: { 1: 0.993, 2: 0.976, 3: 0.955, 4: 0.928, 5: 0.895, 6: 0.854, 7: 0.802, 8: 0.738 }, dropDelta: true },
]
const SEEDS: [string, string][] = [
  ['#1D5432', 'green'], ['#c9a227', 'gold'], ['#b56576', 'mauve'],
]
const PROFILES: ContrastProfile[] = ['apca', 'wcag']
const STOPS = [0, 1, 2, 3, 4, 5, 6, 7, 8]

const specFor = (col: Col, profile: ContrastProfile): ModeSpec => {
  const s = withProfile(MODE_SPECS.light, profile)
  return { ...s, stops: s.stops.map(sp => {
    const nsp: any = { ...sp }
    if (col.rootLs && col.rootLs[sp.stop] !== undefined) nsp.rootL = col.rootLs[sp.stop]
    if (col.dropDelta && sp.require?.metric === 'min-separation') nsp.require = undefined
    return nsp
  }) }
}

const ramp = (hex: string, col: Col, profile: ContrastProfile): string[] => {
  const r = resolveRamp(hex, 'light', specFor(col, profile))
  return STOPS.map(n => r.stops.find(s => s.stop === n)!.hex)
}

const H = 40, W = 150, GAP = 22
const rampDiv = (hexes: string[]) =>
  `<div style="width:${W}px">` + hexes.map(h => `<div style="height:${H}px;background:${h}"></div>`).join('') + `</div>`
const labels = `<div style="display:flex;gap:${GAP}px;margin:0 0 10px">` +
  COLS.map(c => `<div style="width:${W}px;text-align:center;font:500 17px system-ui,sans-serif">${c.label}</div>`).join('') + `</div>`

let body = `<div style="background:#f0f0ee;padding:28px 24px;font:14px system-ui,sans-serif;color:#333">`
for (const profile of PROFILES) {
  body += `<div style="font:600 13px system-ui;letter-spacing:.08em;color:#888;margin:8px 0 14px;text-transform:uppercase">${profile}</div>`
  body += labels
  for (const [hex, note] of SEEDS) {
    body += `<div style="display:flex;gap:${GAP}px;margin:0 0 22px">` +
      COLS.map(c => rampDiv(ramp(hex, c, profile))).join('') + `</div>`
  }
  body += `<div style="height:20px"></div>`
}
body += `</div>`

mkdirSync('render', { recursive: true })
writeFileSync('render/paper2-distributions.html', body)
console.log(`written render/paper2-distributions.html (${body.length} bytes)`)
