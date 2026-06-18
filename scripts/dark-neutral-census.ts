// Dark-pass probe #1 — near-neutral census. The dark chroma floor
// (applyChromaFloor) pumps C 0.02–0.049 onto any brand with C < 0.04,
// including brands whose chroma is sensor noise — it INVENTS hue (a
// near-neutral accent screenshot: near-black #221F1F renders a pink dark
// ladder). The light ramp's HUE_NOISE_C gate deliberately renders grays
// gray; dark has no equivalent (the applyChromaFloor comment admits it).
// This census measures who is affected and how hard, so the fade
// constants are chosen from data, not vibes. Read-only.

import { resolveBrand } from '../src/engine/resolve'
import { BRANDS } from '../src/brands'
import { SECONDARIES } from '../src/secondaries'

function hexToOklch(hex: string): { L: number; C: number; H: number } {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  const r = parseInt(full.slice(0, 2), 16) / 255
  const g = parseInt(full.slice(2, 4), 16) / 255
  const b = parseInt(full.slice(4, 6), 16) / 255
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

interface Row {
  key: string
  hex: string
  L: number
  C: number
  H: number
  d3C: number
  d11C: number
  d11H: number
  pump3: number
  pump11: number
}
const rows: Row[] = []

for (const b of BRANDS) {
  const entries: Array<[string, string, any]> = [
    [b.slug, b.hex, { exact: b.exact, archetypeOverride: b.archetypeOverride, style: b.style }],
  ]
  const sec = SECONDARIES[b.slug]
  if (sec) entries.push([`${b.slug}-accent`, sec, { exact: b.exact, style: b.style }])
  for (const [key, hex, opts] of entries) {
    const { L, C, H } = hexToOklch(hex)
    if (C >= 0.05) continue
    const s = resolveBrand(hex, key, opts).scale
    const d3 = s.dark[2]
    const d11 = s.dark[10]
    rows.push({
      key,
      hex,
      L,
      C,
      H,
      d3C: d3.C,
      d11C: d11.C,
      d11H: d11.H,
      pump3: C > 1e-6 ? d3.C / (C * 0.62) : Infinity,
      pump11: C > 1e-6 ? d11.C / (C * 0.95) : Infinity,
    })
  }
}

rows.sort((a, b) => a.C - b.C)
console.log(`fleet colors with brand C < 0.05: ${rows.length}`)
console.log('key                                      hex      brandC  brandH  dark3 C  dark11 C  dark11 H  pump3×  pump11×')
for (const r of rows)
  console.log(
    `${r.key.padEnd(40)} ${r.hex}  ${r.C.toFixed(4)}  ${r.H.toFixed(0).padStart(5)}  ${r.d3C.toFixed(4).padStart(7)}  ${r.d11C.toFixed(4).padStart(8)}  ${r.d11H.toFixed(0).padStart(8)}  ${(r.pump3 === Infinity ? '∞' : r.pump3.toFixed(1)).padStart(6)}  ${(r.pump11 === Infinity ? '∞' : r.pump11.toFixed(1)).padStart(7)}`
  )
