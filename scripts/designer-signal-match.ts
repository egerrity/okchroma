// Designer 4-tier signal sets (from a designer screenshot: base /
// Spotlight / Highlight / Accent per signal) measured against the
// engine: OKLCH of each hex, nearest stop on our resolved signal ramp,
// nearest rung on the bespoke illustration scale. Read-only — figuring
// out what tonal recipe the designer's tiers encode before calibrating
// illustration primary/alt 1–4 to the same recipe.

import { SIGNAL_SCALES } from '../src/engine/resolve'
import { generateIllustrationScale, type ColorStop } from '../src/engine/colorEngine'
import { stopDeltaE } from '../src/engine/collision'

function hexToOklch(hex: string): { L: number; C: number; H: number } {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16) / 255
  const g = parseInt(h.slice(2, 4), 16) / 255
  const b = parseInt(h.slice(4, 6), 16) / 255
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const rl = lin(r), gl = lin(g), bl = lin(b)
  const l_ = Math.cbrt(0.412165612 * rl + 0.536275208 * gl + 0.0514575653 * bl)
  const m_ = Math.cbrt(0.211859107 * rl + 0.6807189584 * gl + 0.107406579 * bl)
  const s_ = Math.cbrt(0.0883097947 * rl + 0.2818474174 * gl + 0.6302613616 * bl)
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_
  const bv = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_
  return { L, C: Math.sqrt(a * a + bv * bv), H: ((Math.atan2(bv, a) * 180) / Math.PI + 360) % 360 }
}

const SETS: Record<string, Array<[string, string]>> = {
  success: [
    ['base', '#2A5F26'],
    ['spotlight', '#449938'],
    ['highlight', '#A3DB9E'],
    ['accent', '#EBF5EA'],
  ],
  warning: [
    ['base', '#804F00'],
    ['spotlight', '#CE6F03'],
    ['highlight', '#FFE680'],
    ['accent', '#FFF9E5'],
  ],
  error: [
    ['base', '#B42318'],
    ['spotlight', '#F04438'],
    ['highlight', '#FECDCA'],
    ['accent', '#FEF3F2'],
  ],
}

const nearest = (target: { L: number; C: number; H: number }, stops: ColorStop[]) => {
  let best = { d: Infinity, label: '' }
  for (const s of stops) {
    const d = stopDeltaE(s as any, target as any)
    if (d < best.d) best = { d, label: `${s.stop}` }
  }
  return best
}

for (const [name, tiers] of Object.entries(SETS)) {
  const sig = SIGNAL_SCALES.get(name as any)!
  const illus = generateIllustrationScale(sig.scale)
  console.log(`\n── ${name} (engine base ${sig.def.hex}, L ${sig.def.L} C ${sig.def.C} H ${sig.def.H}) ──`)
  for (const [tier, hex] of tiers) {
    const o = hexToOklch(hex)
    const nStop = nearest(o, sig.scale.light)
    const nIll = nearest(o, illus.stops)
    console.log(
      `   ${tier.padEnd(9)} ${hex}  L ${o.L.toFixed(3)} C ${o.C.toFixed(3)} H ${o.H.toFixed(1).padStart(5)}  | nearest UI stop ${nStop.label.padStart(2)} (ΔE ${nStop.d.toFixed(3)})  nearest illus rung ${nIll.label} (ΔE ${nIll.d.toFixed(3)})`
    )
  }
}
console.log(`\nillus rung roots for reference: wash 0.95 / tint 0.85 / mid 0.70 / deep 0.52 / ink 0.34`)
