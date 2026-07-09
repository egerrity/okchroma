// ink11-fail-diag.ts — WHY do a few seeds land ink-11 just under WCAG 4.5 in the pure carry (wcag mode)?
// For each seed: carried light ink-11, dark placed ink-11 (L/C/H), did the require-FLOOR fire (clamped?), the
// WCAG ratio vs dark paper-2 measured with the EMITTED (gamut-clamped) chroma AND with the raw carried chroma.
// Two candidate causes: (a) floor never fired because the carry already sat in [4.499, 4.5) — a tolerance-band
// artifact; (b) floor fired to 4.55 on raw chroma but gamut-clamp at emit reduced C → luminance/ratio shifted.
import { resolveRamp, type ResolveOpts } from '../src/reqtoken/resolve'
import { MODE_SPECS } from '../src/reqtoken/spec'
import { legalRatio, wcagY, clampChromaToGamut } from '../src/engine/constraints'
import { srgbEmitChannels } from '../src/engine/colorMath'
import { darkChromaCurve } from '../src/engine/darkChromaCurve'
import { DARK_BRAND_FILL_MIN_L } from '../src/engine/stopTable'

const base: ResolveOpts = { highlight: true, enforceOnFillContrast: true, coolRedDark: true, darkChromaCurve, darkFillMinL: DARK_BRAND_FILL_MIN_L }
const hx = (s: { L: number; C: number; H: number }) => '#' + (Object.values(srgbEmitChannels(s)) as number[]).map(c => Math.round(Math.max(0, Math.min(1, c)) * 255).toString(16).padStart(2, '0')).join('')
const seeds: string[] = []
for (let H = 0; H < 360; H += 20) for (const C of [0.06, 0.13, 0.19]) for (const L of [0.5, 0.68]) seeds.push(hx({ L, C, H }))

console.log('seed        hue°  | light-ink11 ratio | dark-ink11 L     C(emit)  floor? | ratio(emit)  ratio(rawC) | verdict')
let fails = 0
for (const hex of seeds) {
  const l = resolveRamp(hex, 'light', MODE_SPECS.light, base)
  const d = resolveRamp(hex, 'dark', MODE_SPECS.dark, { ...base, deltaLightStops: l.stops, deltaLightCta: l.roles.cta, deltaCarry: true })
  const lp2 = l.stops.find(s => s.stop === 2)!, li = l.stops.find(s => s.stop === 11)!
  const dp2 = d.stops.find(s => s.stop === 2)!, di = d.stops.find(s => s.stop === 11)!
  const emitC = clampChromaToGamut(di.L, di.C, di.H)                 // what actually renders
  const ratioEmit = legalRatio(di.L, emitC, di.H, wcagY(dp2.L, dp2.C, dp2.H))
  const ratioRaw = legalRatio(di.L, li.C, di.H, wcagY(dp2.L, dp2.C, dp2.H))   // if the CARRIED light chroma had held
  if (ratioEmit >= 4.5) continue
  fails++
  const lRatio = legalRatio(li.L, li.C, li.H, wcagY(lp2.L, lp2.C, lp2.H))
  const clampedC = Math.abs(emitC - li.C) > 1e-4
  const verdict = di.clamped ? (clampedC ? 'floor FIRED, gamut cut C→ratio dropped' : 'floor FIRED but still short') : 'floor did NOT fire (carry already in [4.499,4.5))'
  console.log(`${hex}  ${l.seed.H.toFixed(0).padStart(4)}  | ${lRatio.toFixed(3).padStart(6)}            | ${di.L.toFixed(4)}  ${emitC.toFixed(4)}  ${di.clamped ? 'yes' : 'no '}   | ${ratioEmit.toFixed(4)}     ${ratioRaw.toFixed(4)}   | ${verdict}`)
}
console.log(`\n${fails} seed(s) land ink-11 < 4.5 (of ${seeds.length}).`)
