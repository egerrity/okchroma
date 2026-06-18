// Color-math diagnostic (2026-06-10 session): compare our generated ramps
// against Radix's hand-tuned chromatic scales in OKLCH. Feeds the designer's list:
//  - item 6: chroma curve on 1–8 ("looks backwards — bright at 1–2, muted at 7–8")
//  - item 7: 11/12 depth ("11 ends up looking really light")
//  - item 4: yellow warm shifting on 1–8 and 12 vs Radix's hand-done hues
// Usage: npx tsx scripts/color-math-diag.ts [family ...]
import { readFileSync } from 'fs'
import { resolveBrand } from '../src/engine/resolve'

// ---- hex → OKLCH (same matrices as the engine) ----
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
  return { L, C: Math.sqrt(a * a + bv * bv), H: (Math.atan2(bv, a) * 180 / Math.PI + 360) % 360 }
}

function relLum(hex: string): number {
  const h = hex.replace('#', '')
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return (
    0.2126 * lin(parseInt(h.slice(0, 2), 16) / 255) +
    0.7152 * lin(parseInt(h.slice(2, 4), 16) / 255) +
    0.0722 * lin(parseInt(h.slice(4, 6), 16) / 255)
  )
}
function wcag(hexA: string, hexB: string): number {
  const a = relLum(hexA), b = relLum(hexB)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

function stopToHex(s: { r: number; g: number; b: number }): string {
  const q = (c: number) => Math.round(Math.min(1, Math.max(0, c)) * 255).toString(16).padStart(2, '0')
  return `#${q(s.r)}${q(s.g)}${q(s.b)}`
}

// ---- parse Radix sources (double-quoted hex entries) ----
function parseRadix(path: string): Record<string, string[]> {
  const src = readFileSync(path, 'utf8')
  const out: Record<string, string[]> = {}
  const re = /export const (\w+) = \{([\s\S]*?)\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(src))) {
    const name = m[1]
    if (/A$|P3/.test(name)) continue // skip alpha + P3 variants
    const hexes = [...m[2].matchAll(/"(#[0-9a-fA-F]{6})"/g)].map(x => x[1])
    if (hexes.length === 12) out[name] = hexes
  }
  return out
}

const radixLight = parseRadix('/tmp/radix-light.ts')
const radixDark = parseRadix('/tmp/radix-dark.ts')

const FAMILIES = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['blue', 'crimson', 'red', 'orange', 'amber', 'yellow', 'green', 'violet']

const fmt = (n: number, d = 3) => n.toFixed(d)
const pct = (n: number) => `${Math.round(n * 100)}%`.padStart(4)

for (const fam of FAMILIES) {
  const rl = radixLight[fam]
  const rd = radixDark[fam]
  if (!rl) { console.log(`(no radix family "${fam}")`); continue }
  const brandHex = rl[8]
  const brand = hexToOklch(brandHex)
  const r = resolveBrand(brandHex, fam)
  const ours = r.scale

  console.log(`\n════ ${fam.toUpperCase()}  brand=${brandHex}  L${fmt(brand.L)} C${fmt(brand.C)} H${fmt(brand.H, 1)}  (our archetype: ${r.scale.archetype}${r.shearDeg ? `, shear ${r.shearDeg}°` : ''}${r.rung1 ? ', rung1' : ''}) ════`)
  console.log(`LIGHT   ${'radix'.padEnd(34)}  ours`)
  console.log(`stop    hex      L      C     C/C9  H      hex      L      C     C/C9  H      ΔH`)
  for (let i = 0; i < 12; i++) {
    const rx = hexToOklch(rl[i])
    const us = ours.light[i]
    const usHex = stopToHex(us)
    const dH = ((us.H - rx.H + 540) % 360) - 180
    console.log(
      `${String(i + 1).padStart(2)}      ${rl[i].toLowerCase()}  ${fmt(rx.L)}  ${fmt(rx.C)}  ${pct(rx.C / brand.C)}  ${fmt(rx.H, 0).padStart(3)}    ${usHex}  ${fmt(us.L)}  ${fmt(us.C)}  ${pct(us.C / brand.C)}  ${fmt(us.H, 0).padStart(3)}  ${dH >= 0 ? '+' : ''}${fmt(dH, 0)}`
    )
  }
  // text-stop contrast (vs stop 2, both systems' own stop 2)
  const ours11 = stopToHex(ours.light[10]), ours12 = stopToHex(ours.light[11]), ours2 = stopToHex(ours.light[1])
  console.log(`11 vs 2:  radix ${fmt(wcag(rl[10], rl[1]), 2)}:1   ours ${fmt(wcag(ours11, ours2), 2)}:1     12 vs 2:  radix ${fmt(wcag(rl[11], rl[1]), 2)}:1   ours ${fmt(wcag(ours12, ours2), 2)}:1`)
  console.log(`11 vs white: radix ${fmt(wcag(rl[10], '#ffffff'), 2)}:1  ours ${fmt(wcag(ours11, '#ffffff'), 2)}:1`)

  if (rd) {
    console.log(`DARK    ${'radix'.padEnd(34)}  ours`)
    for (let i = 0; i < 12; i++) {
      const rx = hexToOklch(rd[i])
      const us = ours.dark[i]
      const usHex = stopToHex(us)
      const dH = ((us.H - rx.H + 540) % 360) - 180
      console.log(
        `${String(i + 1).padStart(2)}      ${rd[i].toLowerCase()}  ${fmt(rx.L)}  ${fmt(rx.C)}  ${pct(rx.C / brand.C)}  ${fmt(rx.H, 0).padStart(3)}    ${usHex}  ${fmt(us.L)}  ${fmt(us.C)}  ${pct(us.C / brand.C)}  ${fmt(us.H, 0).padStart(3)}  ${dH >= 0 ? '+' : ''}${fmt(dH, 0)}`
      )
    }
  }
}
