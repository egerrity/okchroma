// delta-purity.ts — LAYER 1 of the true-fall-out check. Is DELTA_DARK+DELTA_CARRY an HONEST pure carry?
// Pure carry ⇒ each dark stop (C,H) == clamp(darkL, lightC, lightH): H carried exactly (gamut clamp can't
// move hue), C = light C reduced ONLY by gamut. Any stop with ΔH≠0 or C ABOVE the gamut-carry = a bolt-on
// tell: the value was recomputed by the old dark machinery (resolve.ts:188 require-floor → darkScaleChromaAt
// / torsionedHue). Sweep agnostic seeds; report per stop.
import { resolveRamp, type ResolveOpts } from '../src/reqtoken/resolve'
import { MODE_SPECS } from '../src/reqtoken/spec'
import { clampChromaToGamut } from '../src/engine/constraints'
import { srgbEmitChannels, hueDelta } from '../src/engine/colorMath'
import { darkChromaCurve } from '../src/engine/darkChromaCurve'
import { DARK_BRAND_FILL_MIN_L } from '../src/engine/stopTable'

const base: ResolveOpts = { highlight: true, enforceOnFillContrast: true, coolRedDark: true, darkChromaCurve, darkFillMinL: DARK_BRAND_FILL_MIN_L }
const hx = (L: number, C: number, H: number) => { const { L: l } = { L }; return '#' + (Object.values(srgbEmitChannels({ L, C, H })) as number[]).map(c => Math.round(Math.max(0, Math.min(1, c)) * 255).toString(16).padStart(2, '0')).join('') }
const cE = (s: any) => clampChromaToGamut(s.L, s.C, s.H)

const seeds: string[] = []
for (let H = 0; H < 360; H += 20) for (const C of [0.06, 0.13, 0.19]) for (const L of [0.5, 0.68]) seeds.push(hx(L, C, H))

const STOPS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
const impureH: Record<number, number> = {}, impureC: Record<number, number> = {}, worstH: Record<number, number> = {}, worstC: Record<number, number> = {}
for (const n of STOPS) { impureH[n] = 0; impureC[n] = 0; worstH[n] = 0; worstC[n] = 0 }

for (const hex of seeds) {
  const l = resolveRamp(hex, 'light', MODE_SPECS.light, base)
  const d = resolveRamp(hex, 'dark', MODE_SPECS.dark, { ...base, deltaLightStops: l.stops, deltaLightCta: l.roles.cta, deltaCarry: true })
  for (const n of STOPS) {
    const ls = l.stops.find(s => s.stop === n)!, ds = d.stops.find(s => s.stop === n)!
    const pureC = clampChromaToGamut(ds.L, ls.C, ls.H)          // carry: light C, reduced only by gamut at dark L
    const dHue = Math.abs(hueDelta(ds.H, ls.H))                  // H should be carried exactly
    const dC = cE(ds) - pureC                                    // emitted dark C vs pure-carry C
    if (dHue > 0.5) { impureH[n]++; worstH[n] = Math.max(worstH[n], dHue) }
    if (Math.abs(dC) > 0.001) { impureC[n]++; worstC[n] = Math.max(worstC[n], Math.abs(dC)) }
  }
}

console.log(`\ndelta-dark PURITY (carry mode), ${seeds.length} agnostic seeds. Pure ⇒ ΔH=0 & C=gamut-carry.`)
console.log('stop   ΔH≠0 seeds (worst°)   C-off-carry seeds (worst)   verdict')
for (const n of STOPS) {
  const hb = impureH[n], cb = impureC[n]
  const v = hb === 0 && cb === 0 ? 'PURE' : `IMPURE — recomputed (bolt-on tell)`
  console.log(`  ${String(n).padStart(2)}    ${String(hb).padStart(3)}  (${worstH[n].toFixed(1)})           ${String(cb).padStart(3)}  (${worstC[n].toFixed(4)})        ${v}`)
}
const anyImpure = STOPS.some(n => impureH[n] || impureC[n])
console.log(`\n${anyImpure ? 'NOT fully pure — impure stops route through darkScaleChromaAt/torsionedHue (the require-floor path, resolve.ts:188).' : 'FULLY PURE across the sweep.'}`)
