// off-hash.ts — byte-identical proof for the per-bolt-on instruments. Hash the resolved output with the new
// opts OFF, two ways: (1) DEFAULT dark+light (no delta at all), (2) PURE CARRY (delta on, new opts off). Run
// on the working tree, then on HEAD (git stash) — hashes must match, proving the instruments are inert off.
import { createHash } from 'crypto'
import { resolveRamp, type ResolveOpts } from '../src/reqtoken/resolve'
import { MODE_SPECS } from '../src/reqtoken/spec'
import { srgbEmitChannels } from '../src/engine/colorMath'
import { darkChromaCurve } from '../src/engine/darkChromaCurve'
import { DARK_BRAND_FILL_MIN_L } from '../src/engine/stopTable'

const base: ResolveOpts = { highlight: true, enforceOnFillContrast: true, coolRedDark: true, darkChromaCurve, darkFillMinL: DARK_BRAND_FILL_MIN_L }
const hx = (s: { L: number; C: number; H: number }) => '#' + (Object.values(srgbEmitChannels(s)) as number[]).map(c => Math.round(Math.max(0, Math.min(1, c)) * 255).toString(16).padStart(2, '0')).join('')
const seeds: string[] = []
for (let H = 0; H < 360; H += 20) for (const C of [0.06, 0.13, 0.19]) for (const L of [0.5, 0.68]) seeds.push(hx({ L, C, H }))
const dump = (r: ReturnType<typeof resolveRamp>) => r.stops.map(s => `${s.stop}:${s.L.toFixed(6)},${s.C.toFixed(6)},${s.H.toFixed(4)}`).join('|') + `#cta:${r.roles.cta.L.toFixed(6)},${r.roles.cta.C.toFixed(6)},${r.roles.cta.H.toFixed(4)}`

let out = ''
for (const hex of seeds) {
  const l = resolveRamp(hex, 'light', MODE_SPECS.light, base)
  out += dump(l) + '\n'
  out += dump(resolveRamp(hex, 'dark', MODE_SPECS.dark, base)) + '\n'                                                    // default dark
  out += dump(resolveRamp(hex, 'dark', MODE_SPECS.dark, { ...base, deltaLightStops: l.stops, deltaLightCta: l.roles.cta, deltaCarry: true, noDeltaHover: true })) + '\n'  // pure carry
}
console.log('off-state hash:', createHash('sha256').update(out).digest('hex').slice(0, 16))
