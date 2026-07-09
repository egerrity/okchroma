// delta-cta-check.ts — CORRECT cta dead-zone metric (owner: prior session botched it). A dead zone = BOTH
// on-text poles fail the legibility bar (Lc 60), so no legible text exists → the ONLY reason to move a fill.
// The exhibit's "Lc<60" counted the CHOSEN pole (meaningless — the other pole may pass). Measure delta cta
// vs shipped (today) cta: real dead zones + worst best-pole Lc.
import { resolveRamp, type ResolveOpts } from '../src/reqtoken/resolve'
import { MODE_SPECS } from '../src/reqtoken/spec'
import { clampChromaToGamut, apcaY, apcaLc, encodedChannels } from '../src/engine/constraints'
import { srgbEmitChannels } from '../src/engine/colorMath'
import { darkChromaCurve } from '../src/engine/darkChromaCurve'
import { DARK_BRAND_FILL_MIN_L } from '../src/engine/stopTable'

const base: ResolveOpts = { highlight: true, enforceOnFillContrast: true, coolRedDark: true, darkChromaCurve, darkFillMinL: DARK_BRAND_FILL_MIN_L }
const hx = (L: number, C: number, H: number) => '#' + (Object.values(srgbEmitChannels({ L, C, H })) as number[]).map(c => Math.round(Math.max(0, Math.min(1, c)) * 255).toString(16).padStart(2, '0')).join('')
const cE = (s: any) => clampChromaToGamut(s.L, s.C, s.H)
const blackY = apcaY(...encodedChannels(0, 0, 0))
const poleLc = (c: any, white: boolean) => Math.abs(apcaLc(white ? 1.0 : blackY, apcaY(...encodedChannels(c.L, cE(c), c.H))))
const bestPole = (c: any) => Math.max(poleLc(c, true), poleLc(c, false))

const seeds: string[] = []
for (let H = 0; H < 360; H += 20) for (const C of [0.06, 0.13, 0.19]) for (const L of [0.5, 0.68]) seeds.push(hx(L, C, H))
const BAR = 60

function scan(getCta: (hex: string) => any) {
  let dead = 0, chosenBelow = 0, worstBest = 999
  for (const hex of seeds) {
    const c = getCta(hex)
    const best = bestPole(c)
    if (best < BAR) dead++                 // REAL dead zone: both poles fail
    // approximate "chosen" as the better pole for the flawed-metric comparison isn't meaningful; skip
    worstBest = Math.min(worstBest, best)
  }
  return { dead, worstBest }
}
const today = scan(hex => resolveRamp(hex, 'dark', MODE_SPECS.dark, base).roles.cta)
const delta = scan(hex => { const l = resolveRamp(hex, 'light', MODE_SPECS.light, base); return resolveRamp(hex, 'dark', MODE_SPECS.dark, { ...base, deltaLightStops: l.stops, deltaLightCta: l.roles.cta, deltaCarry: true }).roles.cta })

console.log(`\ncta REAL dead zones (both poles Lc < ${BAR}), ${seeds.length} agnostic seeds:`)
console.log(`  shipped (today darkCtaTrim): ${today.dead}   worst best-pole Lc ${today.worstBest.toFixed(1)}`)
console.log(`  delta (carried from light) : ${delta.dead}   worst best-pole Lc ${delta.worstBest.toFixed(1)}`)
console.log(`\n${delta.dead <= today.dead ? `delta cta is NOT worse on legibility (${delta.dead} vs ${today.dead} real dead zones) — replacing darkCtaTrim with the carry is viable, pending eye-check on prominence.` : `delta cta has MORE dead zones (${delta.dead} vs ${today.dead}) — carry alone insufficient; a floored rule may be needed.`}`)
