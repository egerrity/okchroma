// delta-hover-check.ts — the honest 9→10. Hover rule (resolve.ts:296) forces s10.L ≥ s9.L+0.04 in delta.
// Strip it (noDeltaHover) to see the PURE gap: does 9→10 genuinely collapse, or is the hover masking nothing?
import { resolveRamp, type ResolveOpts } from '../src/reqtoken/resolve'
import { MODE_SPECS } from '../src/reqtoken/spec'
import { srgbEmitChannels } from '../src/engine/colorMath'
import { darkChromaCurve } from '../src/engine/darkChromaCurve'
import { DARK_BRAND_FILL_MIN_L } from '../src/engine/stopTable'

const base: ResolveOpts = { highlight: true, enforceOnFillContrast: true, coolRedDark: true, darkChromaCurve, darkFillMinL: DARK_BRAND_FILL_MIN_L }
const hx = (L: number, C: number, H: number) => '#' + (Object.values(srgbEmitChannels({ L, C, H })) as number[]).map(c => Math.round(Math.max(0, Math.min(1, c)) * 255).toString(16).padStart(2, '0')).join('')
const seeds: string[] = []
for (let H = 0; H < 360; H += 20) for (const C of [0.06, 0.13, 0.19]) for (const L of [0.5, 0.68]) seeds.push(hx(L, C, H))

const pureGaps: number[] = []
let fired = 0, collapse02 = 0, collapse01 = 0, inverted = 0
for (const hex of seeds) {
  const l = resolveRamp(hex, 'light', MODE_SPECS.light, base)
  const d = resolveRamp(hex, 'dark', MODE_SPECS.dark, { ...base, deltaLightStops: l.stops, deltaLightCta: l.roles.cta, deltaCarry: true, noDeltaHover: true })
  const s9 = d.stops.find(s => s.stop === 9)!, s10 = d.stops.find(s => s.stop === 10)!
  const gap = s10.L - s9.L
  pureGaps.push(gap)
  if (gap < 0.04) fired++          // hover rule would fire
  if (gap < 0.02) collapse02++
  if (gap < 0.01) collapse01++
  if (gap <= 0) inverted++         // 10 not lighter than 9 at all
}
pureGaps.sort((a, b) => a - b)
const med = pureGaps[Math.floor(pureGaps.length / 2)]
console.log(`\nPURE 9→10 gap (hover stripped), ${seeds.length} agnostic seeds:`)
console.log(`  worst (min) ΔL : ${pureGaps[0].toFixed(4)}`)
console.log(`  median ΔL     : ${med.toFixed(4)}`)
console.log(`  inverted (≤0) : ${inverted}   (stop 10 NOT lighter than 9 — real break)`)
console.log(`  < 0.01        : ${collapse01}`)
console.log(`  < 0.02        : ${collapse02}`)
console.log(`  < 0.04 (hover would fire): ${fired} / ${seeds.length}`)
console.log(`\n${inverted > 0 || collapse01 > 5 ? 'PURE 9→10 genuinely collapses on some hues → the hover is masking a real break (intrinsic to the delta compression; source-fix vs keep a minimal floor is the owner call).' : 'PURE 9→10 mostly holds; the hover only nudges a few — the break is mild.'}`)
