// floor-trigger-blast.ts — the dark require-floor trigger (resolve.ts:186) uses tol=1e-3 and runs for EVERY
// dark stop (today seed-keyed AND delta carry). Tightening it re-solves any stop currently in [target-1e-3,
// target). Count those across three surfaces so we know the true blast radius of the change BEFORE editing:
//   light | today-dark (SHIPPED, non-delta) | delta-carry dark. Only stops in that band would move.
import { resolveRamp, type ResolveOpts } from '../src/reqtoken/resolve'
import { MODE_SPECS } from '../src/reqtoken/spec'
import { legalRatio, wcagY } from '../src/engine/constraints'
import { srgbEmitChannels } from '../src/engine/colorMath'
import { darkChromaCurve } from '../src/engine/darkChromaCurve'
import { DARK_BRAND_FILL_MIN_L } from '../src/engine/stopTable'

const base: ResolveOpts = { highlight: true, enforceOnFillContrast: true, coolRedDark: true, darkChromaCurve, darkFillMinL: DARK_BRAND_FILL_MIN_L }
const hx = (s: { L: number; C: number; H: number }) => '#' + (Object.values(srgbEmitChannels(s)) as number[]).map(c => Math.round(Math.max(0, Math.min(1, c)) * 255).toString(16).padStart(2, '0')).join('')
const seeds: string[] = []
for (let H = 0; H < 360; H += 20) for (const C of [0.06, 0.13, 0.19]) for (const L of [0.5, 0.68]) seeds.push(hx({ L, C, H }))
const BAR: Record<number, number> = { 8: 3.0, 11: 4.5, 12: 7.0 }
const ratioVs2 = (r: ReturnType<typeof resolveRamp>, n: number) => { const p2 = r.stops.find(s => s.stop === 2)!, s = r.stops.find(s => s.stop === n)!; return legalRatio(s.L, s.C, s.H, wcagY(p2.L, p2.C, p2.H)) }

// stops in [target-1e-3, target) would newly re-solve if the trigger tightens (these are the ONLY ones that move)
for (const [label, mk] of [
  ['light', (hex: string) => resolveRamp(hex, 'light', MODE_SPECS.light, base)],
  ['today-dark (SHIPPED)', (hex: string) => resolveRamp(hex, 'dark', MODE_SPECS.dark, base)],
  ['delta-carry dark', (hex: string) => { const l = resolveRamp(hex, 'light', MODE_SPECS.light, base); return resolveRamp(hex, 'dark', MODE_SPECS.dark, { ...base, deltaLightStops: l.stops, deltaLightCta: l.roles.cta, deltaCarry: true }) }],
] as [string, (hex: string) => ReturnType<typeof resolveRamp>][]) {
  const inBand: Record<number, number> = { 8: 0, 11: 0, 12: 0 }
  for (const hex of seeds) { const r = mk(hex); for (const n of [8, 11, 12]) { const g = ratioVs2(r, n); if (g >= BAR[n] - 1e-3 && g < BAR[n]) inBand[n]++ } }
  console.log(`  ${label.padEnd(22)} in [target-1e-3, target): stop8 ${inBand[8]}   ink11 ${inBand[11]}   ink12 ${inBand[12]}   (of ${seeds.length})`)
}
