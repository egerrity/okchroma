// full-dump.ts — dump every stop of light / today-dark / delta-carry per seed as diffable lines. Run on the
// working tree and on HEAD (git stash), diff: expect ONLY delta-carry ink-11 lines for the 3 yellows to differ;
// light + today-dark identical (proves shipped output untouched by the floor-trigger change).
import { resolveRamp, type ResolveOpts } from '../src/reqtoken/resolve'
import { MODE_SPECS } from '../src/reqtoken/spec'
import { srgbEmitChannels } from '../src/engine/colorMath'
import { darkChromaCurve } from '../src/engine/darkChromaCurve'
import { DARK_BRAND_FILL_MIN_L } from '../src/engine/stopTable'

const base: ResolveOpts = { highlight: true, enforceOnFillContrast: true, coolRedDark: true, darkChromaCurve, darkFillMinL: DARK_BRAND_FILL_MIN_L }
const hx = (s: { L: number; C: number; H: number }) => '#' + (Object.values(srgbEmitChannels(s)) as number[]).map(c => Math.round(Math.max(0, Math.min(1, c)) * 255).toString(16).padStart(2, '0')).join('')
const seeds: string[] = []
for (let H = 0; H < 360; H += 20) for (const C of [0.06, 0.13, 0.19]) for (const L of [0.5, 0.68]) seeds.push(hx({ L, C, H }))
const line = (tag: string, hex: string, r: ReturnType<typeof resolveRamp>) => r.stops.map(s => `${tag} ${hex} s${s.stop} L${s.L.toFixed(6)} C${s.C.toFixed(6)} H${s.H.toFixed(4)}`).join('\n')

const out: string[] = []
for (const hex of seeds) {
  const l = resolveRamp(hex, 'light', MODE_SPECS.light, base)
  out.push(line('LIGHT', hex, l))
  out.push(line('TODAY', hex, resolveRamp(hex, 'dark', MODE_SPECS.dark, base)))
  out.push(line('DELTA', hex, resolveRamp(hex, 'dark', MODE_SPECS.dark, { ...base, deltaLightStops: l.stops, deltaLightCta: l.roles.cta, deltaCarry: true, noDeltaHover: true })))
}
console.log(out.join('\n'))
