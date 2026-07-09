// ink-margin-size.ts — how big a safety margin actually catches the edge cases? Two things:
// (1) the CARRY DROP: light-solved ink ratio → dark-carried ink ratio. The needed margin must exceed the WORST
//     drop among seeds sitting near the bar (those are the only ones that can fall under). Sizes "4.51 vs 4.55".
// (2) the TRIGGER-TIGHTEN blast radius: how many require-stops (8/11/12, light AND dark) currently sit in
//     [target-1e-3, target) — i.e. how many would newly re-solve if the floor trigger dropped its 1e-3 slack.
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

// (1) carry drop for ink-11/12 (light ratio − dark ratio), and the worst drop among NEAR-BAR light seeds
for (const n of [11, 12]) {
  let maxDrop = -9, maxDropNearBar = -9, nearBarCount = 0
  for (const hex of seeds) {
    const l = resolveRamp(hex, 'light', MODE_SPECS.light, base)
    const d = resolveRamp(hex, 'dark', MODE_SPECS.dark, { ...base, deltaLightStops: l.stops, deltaLightCta: l.roles.cta, deltaCarry: true })
    const lr = ratioVs2(l, n), dr = ratioVs2(d, n), drop = lr - dr
    maxDrop = Math.max(maxDrop, drop)
    if (lr <= BAR[n] + 0.05) { nearBarCount++; maxDropNearBar = Math.max(maxDropNearBar, drop) }   // light sits within 0.05 of bar
  }
  console.log(`ink-${n}: worst carry drop (light→dark) = ${maxDrop.toFixed(4)}   |   among ${nearBarCount} near-bar seeds, worst drop = ${maxDropNearBar.toFixed(4)}`)
  console.log(`         → a light-solve margin of ${(maxDropNearBar > 0 ? maxDropNearBar : 0).toFixed(4)} guarantees dark ≥ ${BAR[n]}; 4.51 gives ${(BAR[n] === 4.5 ? (0.01).toFixed(4) : '—')} headroom`)
}

// (2) trigger-tighten blast radius: require-stops sitting in [target-1e-3, target) right now, per mode
console.log(`\ntrigger-tighten blast radius — require-stops currently in [target-1e-3, target) (would newly re-solve):`)
for (const mode of ['light', 'dark'] as const) {
  const counts: Record<number, number> = { 8: 0, 11: 0, 12: 0 }
  for (const hex of seeds) {
    const l = resolveRamp(hex, 'light', MODE_SPECS.light, base)
    const r = mode === 'light' ? l : resolveRamp(hex, 'dark', MODE_SPECS.dark, { ...base, deltaLightStops: l.stops, deltaLightCta: l.roles.cta, deltaCarry: true })
    for (const n of [8, 11, 12]) { const g = ratioVs2(r, n); if (g >= BAR[n] - 1e-3 && g < BAR[n]) counts[n]++ }
  }
  console.log(`  ${mode.padEnd(5)}: stop8 ${counts[8]}   ink11 ${counts[11]}   ink12 ${counts[12]}   (of ${seeds.length})`)
}
