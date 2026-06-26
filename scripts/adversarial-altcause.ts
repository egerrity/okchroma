// Test the ALTERNATIVE root causes named in the prompt:
//  - darkChromaCurve / dark9L / DARK_NEUTRAL_L as the collision driver
//  - whether the loop is NECESSARY (does disabling enforce keep rung at 0.62?)
import { BRANDS } from '../src/brands'
import { resolveBrand, SIGNAL_SCALES } from '../src/engine/resolve'
import { generateScale } from '../src/engine/colorEngine'
import { wcagY, contrastRatio } from '../src/engine/constraints'
import { DARK_NEUTRAL_L } from '../src/engine/stopTable'
import { apparentL } from '../src/engine/perceptualL'
import type { ColorStop } from '../src/engine/colorEngine'

const f3 = (n: number) => n.toFixed(3)
const f2 = (n: number) => n.toFixed(2)

const items: { name: string; hex: string; opts: any }[] = []
for (const b of BRANDS) items.push({ name: b.name, hex: b.hex, opts: { exact: b.exact, archetypeOverride: b.archetypeOverride, style: b.style } })

// ── Counterfactual: regenerate the SAME brand WITHOUT enforceOnFillContrast on the
//    highlight path. Everything else identical. If the rung then sits at ~0.62 and
//    ΔL to acc8 ~0.07, the LOOP is what causes the collapse (not the curve/scaffold).
console.log('═══ Counterfactual: highlight rung WITH vs WITHOUT the enforce loop ═══')
console.log('  (regenerated via generateScale with highlight:true, dark curve on, ±enforce)')
console.log('  Reusing resolveBrand opts as closely as possible. Reporting dark[12] L + ΔL to acc8.')
console.log('  ramp            withLoop_L ΔL | noLoop_L ΔL | acc8L')

import { darkChromaCurve } from '../src/engine/darkChromaCurve'
import { darkCtaTrim } from '../src/engine/darkChromaCurve'
import { ACCENT_DARK_STOPS, DARK_BRAND_FILL_MIN_L } from '../src/engine/stopTable'

const withL: number[] = [], noL: number[] = []
for (const b of BRANDS) {
  // Replicate resolveBrand's brand-path opts for a non-exact brand (best effort).
  const common = {
    highlight: true,
    darkStops: ACCENT_DARK_STOPS,
    darkFillMinL: DARK_BRAND_FILL_MIN_L,
    darkChromaCurve,
    coolRedDark: true,
  }
  const sWith = generateScale(b.hex, b.slug, b.archetypeOverride, { ...common, enforceOnFillContrast: true })
  const sNo   = generateScale(b.hex, b.slug, b.archetypeOverride, { ...common, enforceOnFillContrast: false })
  const hlW = sWith.dark[12] as ColorStop, hlN = sNo.dark[12] as ColorStop
  const a8 = sWith.dark[7] as ColorStop
  withL.push(hlW.L - a8.L); noL.push(hlN.L - a8.L)
  console.log(`  ${b.name.padEnd(15)} ${f3(hlW.L)}  ${(hlW.L-a8.L>=0?'+':'')+f3(hlW.L-a8.L)} | ${f3(hlN.L)}  ${(hlN.L-a8.L>=0?'+':'')+f3(hlN.L-a8.L)} | ${f3(a8.L)}`)
}
const mean = (xs: number[]) => xs.reduce((a,b)=>a+b,0)/xs.length
console.log(`\n  mean ΔL withLoop = ${f3(mean(withL))}   mean ΔL noLoop = ${f3(mean(noL))}`)

// ── Is the FLOAT actually tight? (claim: apparent L sd ~2.7) cross-check vs LIGHT ──
console.log('\n═══ Apparent-L float of the shipped dark highlight (recompute) ═══')
const fleet: { name: string; scale: any }[] = []
for (const b of BRANDS) fleet.push({ name: b.name, scale: resolveBrand(b.hex, b.slug, { exact: b.exact, archetypeOverride: b.archetypeOverride, style: b.style }).scale })
for (const { def, scale } of SIGNAL_SCALES.values()) fleet.push({ name: `sig:${def.name}`, scale })
const dApp = fleet.map(i => { const s = i.scale.dark[12] as ColorStop; return apparentL(s.L, s.C, s.H) })
const lApp = fleet.map(i => { const s = i.scale.light[12] as ColorStop; return apparentL(s.L, s.C, s.H) })
const sd = (xs: number[]) => { const m = mean(xs); return Math.sqrt(xs.reduce((a,b)=>a+(b-m)**2,0)/xs.length) }
console.log(`  dark apparent-L: mean ${f2(mean(dApp))} sd ${f2(sd(dApp))}  | light apparent-L: mean ${f2(mean(lApp))} sd ${f2(sd(lApp))}`)

// ── OKLCH-L ΔL to acc8: dark vs light (claim: dark 0.00-0.03, light 0.13-0.22) ──
console.log('\n═══ OKLCH ΔL(highlight − acc8): dark vs light ═══')
const dΔ = fleet.map(i => { const h=i.scale.dark[12] as ColorStop, a=i.scale.dark[7] as ColorStop; return h.L-a.L })
const lΔ = fleet.map(i => { const h=i.scale.light[12] as ColorStop, a=i.scale.light[7] as ColorStop; return h.L-a.L })
console.log(`  dark ΔL:  min ${f3(Math.min(...dΔ))}  max ${f3(Math.max(...dΔ))}  mean ${f3(mean(dΔ))}`)
console.log(`  light ΔL: min ${f3(Math.min(...lΔ))}  max ${f3(Math.max(...lΔ))}  mean ${f3(mean(lΔ))}`)
