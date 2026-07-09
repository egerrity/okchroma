// ink-fix-eyecheck.ts — before/after for the 2 yellow ink-11 seeds the floor-trigger fix moved. Before L/C/H
// are the exact pre-fix values (from the full-dump diff); after is resolved live. Show hex + WCAG ratio vs the
// dark paper-2 both ways, so the move (a ~0.003 L nudge that lifts 4.4999→≥4.5) is concrete.
import { resolveRamp, type ResolveOpts } from '../src/reqtoken/resolve'
import { MODE_SPECS } from '../src/reqtoken/spec'
import { legalRatio, wcagY } from '../src/engine/constraints'
import { srgbEmitChannels } from '../src/engine/colorMath'
import { darkChromaCurve } from '../src/engine/darkChromaCurve'
import { DARK_BRAND_FILL_MIN_L } from '../src/engine/stopTable'

const base: ResolveOpts = { highlight: true, enforceOnFillContrast: true, coolRedDark: true, darkChromaCurve, darkFillMinL: DARK_BRAND_FILL_MIN_L }
const hx = (s: { L: number; C: number; H: number }) => '#' + (Object.values(srgbEmitChannels(s)) as number[]).map(c => Math.round(Math.max(0, Math.min(1, c)) * 255).toString(16).padStart(2, '0')).join('')

// exact pre-fix ink-11 (L,C,H) from the before-dump
const BEFORE: Record<string, { L: number; C: number; H: number }> = {
  '#75603b': { L: 0.601012, C: 0.056509, H: 80.9727 },
  '#825b00': { L: 0.603217, C: 0.098406, H: 79.6811 },
}
for (const seed of ['#75603b', '#825b00']) {
  const l = resolveRamp(seed, 'light', MODE_SPECS.light, base)
  const d = resolveRamp(seed, 'dark', MODE_SPECS.dark, { ...base, deltaLightStops: l.stops, deltaLightCta: l.roles.cta, deltaCarry: true, noDeltaHover: true })
  const p2 = d.stops.find(s => s.stop === 2)!, after = d.stops.find(s => s.stop === 11)!
  const bef = BEFORE[seed]
  const p2Y = wcagY(p2.L, p2.C, p2.H)
  const rB = legalRatio(bef.L, bef.C, bef.H, p2Y), rA = legalRatio(after.L, after.C, after.H, p2Y)
  console.log(`${seed}  (paper-2 ${hx(p2)})`)
  console.log(`   before: L ${bef.L.toFixed(4)}  ${hx(bef)}  ratio ${rB.toFixed(4)}   ${rB < 4.5 ? '← under 4.5' : ''}`)
  console.log(`   after : L ${after.L.toFixed(4)}  ${hx(after)}  ratio ${rA.toFixed(4)}   ${rA >= 4.5 ? '✓ clears 4.5' : ''}`)
}
