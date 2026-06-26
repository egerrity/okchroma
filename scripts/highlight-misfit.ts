// READ-ONLY measurement — quantifies the dark-highlight (and cta) misfit.
// No engine changes; runs the real resolveBrand/generateScale pipeline and
// measures APPARENT lightness (Nayatani H-K, the same predictor the light
// ladder is solved on) of the ladder rungs in both modes.
//
// Hypothesis under test (from HIGHLIGHT-CTA-HANDOFF.md):
//   light L is solved on the perceptual curve, so the light highlight's
//   apparent L is ~constant across the fleet; dark L is the fixed
//   DARK_NEUTRAL_L scaffold and the dark highlight is a fixed OKLCH 0.62, so
//   its APPARENT L floats with hue/chroma and breaks the dark ladder.
//
//   bundle: esbuild scripts/highlight-misfit.ts --bundle --platform=node --outfile=dist/highlight-misfit.js && node dist/highlight-misfit.js

import { BRANDS } from '../src/brands'
import { SECONDARIES } from '../src/secondaries'
import { resolveBrand, SIGNAL_SCALES } from '../src/engine/resolve'
import { apparentL, grayApparentL, perceptualRungL, solveLForApparent, KEEP_LIGHT, KEEP_DARK } from '../src/engine/perceptualL'
import { HIGHLIGHT_LIGHT, HIGHLIGHT_DARK, DARK_NEUTRAL_L } from '../src/engine/stopTable'
import type { GeneratedScale, ColorStop } from '../src/engine/colorEngine'

const f3 = (n: number) => n.toFixed(3)
const f2 = (n: number) => n.toFixed(2)
const stats = (xs: number[]) => {
  const m = xs.reduce((a, b) => a + b, 0) / xs.length
  const sd = Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length)
  return { m, sd, min: Math.min(...xs), max: Math.max(...xs), range: Math.max(...xs) - Math.min(...xs) }
}

interface Item { name: string; scale: GeneratedScale }
const items: Item[] = []
for (const b of BRANDS) items.push({ name: b.name, scale: resolveBrand(b.hex, b.slug, { exact: b.exact, archetypeOverride: b.archetypeOverride, style: b.style }).scale })
for (const slug of Object.keys(SECONDARIES)) {
  const br = BRANDS.find(x => x.slug === slug)!
  items.push({ name: `${slug}-2nd`, scale: resolveBrand(SECONDARIES[slug], `${slug} accent`, { exact: br.exact, style: br.style }).scale })
}
for (const { def, scale } of SIGNAL_SCALES.values()) items.push({ name: `sig:${def.name}`, scale })

// ── helpers to pull rungs ─────────────────────────────────────────────────
const appL = (s: ColorStop) => apparentL(s.L, s.C, s.H)
// stops array layout: [0..7]=1..8, 8/9=cta(9/10), 10/11=ink(11/12), 12/13=highlight(13/14)
const acc8 = (sc: GeneratedScale, mode: 'light' | 'dark') => sc[mode][7]
const ink11 = (sc: GeneratedScale, mode: 'light' | 'dark') => sc[mode][10]
const hl9 = (sc: GeneratedScale, mode: 'light' | 'dark') => sc[mode][12]
const cta9 = (sc: GeneratedScale, mode: 'light' | 'dark') => sc[mode][8]

// ── 1) Highlight apparent-L spread: light (perceptual) vs dark (fixed) ─────
console.log('═══ 1. HIGHLIGHT apparent-L (Nayatani) across the fleet ═══')
console.log('   If light L is perceptual and dark L is a fixed scaffold, light apparent-L is tight, dark is wide.\n')
const lightHlApp = items.map(i => appL(hl9(i.scale, 'light')))
const darkHlApp = items.map(i => appL(hl9(i.scale, 'dark')))
const ls = stats(lightHlApp), ds = stats(darkHlApp)
console.log(`  LIGHT highlight apparent-L*:  mean ${f2(ls.m)}  sd ${f2(ls.sd)}  range ${f2(ls.range)}  [${f2(ls.min)}..${f2(ls.max)}]`)
console.log(`  DARK  highlight apparent-L*:  mean ${f2(ds.m)}  sd ${f2(ds.sd)}  range ${f2(ds.range)}  [${f2(ds.min)}..${f2(ds.max)}]`)
console.log(`  → dark spread is ${(ds.sd / ls.sd).toFixed(1)}× the light spread (sd), ${(ds.range / ls.range).toFixed(1)}× by range.\n`)

// ── 2) Dark ladder continuity: accent-8 → highlight → ink-11 in apparent L ─
// The neighbors are low-chroma (≈ on their OKLCH L); the highlight is high-chroma
// at fixed OKLCH 0.62. Measure whether it wedges monotonically between them and
// at a CONSISTENT fractional position. (Light shown alongside as the reference.)
console.log('═══ 2. DARK ladder continuity at the highlight (apparent-L*) ═══')
console.log('   pos = (hl−acc8)/(ink11−acc8): where the highlight sits between its neighbors. Flat = good.\n')
console.log('  ramp                  | acc8App ink11App  hlApp(OK L)   pos | LIGHT pos')
const darkPos: number[] = [], lightPos: number[] = []
const rows: { name: string; dpos: number; dHlApp: number; dHlOkL: number; H: number; C: number }[] = []
for (const { name, scale } of items) {
  const a = appL(acc8(scale, 'dark')), k = appL(ink11(scale, 'dark')), h = appL(hl9(scale, 'dark'))
  const dpos = (h - a) / (k - a)
  const la = appL(acc8(scale, 'light')), lk = appL(ink11(scale, 'light')), lh = appL(hl9(scale, 'light'))
  const lpos = (lh - la) / (lk - la)
  darkPos.push(dpos); lightPos.push(lpos)
  const s = hl9(scale, 'dark')
  rows.push({ name, dpos, dHlApp: h, dHlOkL: s.L, H: s.H, C: s.C })
}
rows.sort((a, b) => a.dpos - b.dpos)
for (const r of rows) {
  const sc = items.find(i => i.name === r.name)!.scale
  const a = appL(acc8(sc, 'dark')), k = appL(ink11(sc, 'dark'))
  const lp = lightPos[items.findIndex(i => i.name === r.name)]
  console.log(`  ${r.name.padEnd(20)} | ${f2(a).padStart(6)} ${f2(k).padStart(6)}   ${f2(r.dHlApp)}(${f3(r.dHlOkL)})  ${f2(r.dpos).padStart(5)} | ${f2(lp).padStart(5)}`)
}
const dp = stats(darkPos), lp = stats(lightPos)
console.log(`\n  DARK  highlight ladder-position: mean ${f2(dp.m)}  sd ${f2(dp.sd)}  range ${f2(dp.range)}  [${f2(dp.min)}..${f2(dp.max)}]`)
console.log(`  LIGHT highlight ladder-position: mean ${f2(lp.m)}  sd ${f2(lp.sd)}  range ${f2(lp.range)}  [${f2(lp.min)}..${f2(lp.max)}]`)
console.log(`  → dark position varies ${(dp.range / lp.range).toFixed(1)}× more than light; <0 or >1 means it pokes OUT of the acc8↔ink11 band.\n`)

// ── 3) H-K bloom at the fixed dark highlight: apparent − OKLCH-implied ─────
// How far the fixed OKLCH 0.62 strays from a gray of equal OKLCH L, per hue.
console.log('═══ 3. H-K bloom of the fixed dark highlight (apparent-L* − gray-at-same-OKLCH-L) ═══')
console.log('   Fixed OKLCH L can\'t hold apparent L: blue/violet/red bloom UP, yellow/green sit ~flat.\n')
const bloom = items.map(i => {
  const s = hl9(i.scale, 'dark')
  return { name: i.name, H: s.H, C: s.C, okL: s.L, bloom: apparentL(s.L, s.C, s.H) - grayApparentL(s.L) }
}).sort((a, b) => b.bloom - a.bloom)
console.log('  ramp                   H     C     OK-L   bloom(L*)')
for (const b of bloom) console.log(`  ${b.name.padEnd(20)} ${f2(b.H).padStart(6)} ${f3(b.C)} ${f3(b.okL)}  ${(b.bloom >= 0 ? '+' : '') + f2(b.bloom)}`)
const bs = stats(bloom.map(b => b.bloom))
console.log(`\n  bloom spread: ${f2(bs.min)} … ${f2(bs.max)} L* (range ${f2(bs.range)}). The fixed L absorbs none of this — it lands in apparent L.\n`)

// ── 4) What a PERCEPTUAL dark highlight would do (mirror of the light solve) ─
// Target = grayApparentL(rootL) + KEEP_DARK·meanBoost — but we want a rung that
// fits BETWEEN dark accent-8 (OKLCH 0.55) and ink-11 (OKLCH 0.80). Show the
// per-brand OKLCH L that lands the highlight at a CONSTANT apparent-L target,
// vs the fixed 0.62 it ships today.
console.log('═══ 4. Perceptual dark-highlight placement (illustrative target) ═══')
console.log('   Pick the fleet-MEAN dark highlight apparent-L* as a flat target; solve each brand\'s OKLCH L for it.')
console.log('   This is what "dark L on the curve" would emit — varies by hue so APPARENT L is constant.\n')
const target = ds.m // flat apparent-L target = current fleet mean (keeps overall level, removes the float)
console.log(`  flat apparent-L* target = ${f2(target)} (current dark fleet mean)\n`)
console.log('  ramp                   fixedOKL  solvedOKL  ΔL     | fixedApp solvedApp')
for (const { name, scale } of items) {
  const s = hl9(scale, 'dark')
  const solved = solveLForApparent(target, s.C, s.H)
  const solvedApp = apparentL(solved, s.C, s.H)
  console.log(`  ${name.padEnd(20)} ${f3(s.L).padStart(7)} ${f3(solved).padStart(9)}  ${(solved - s.L >= 0 ? '+' : '') + f3(solved - s.L)} | ${f2(appL(s)).padStart(6)} ${f2(solvedApp).padStart(6)}`)
}

// ── 5) cta apparent-L float (the related second front) ────────────────────
console.log('\n═══ 5. cta apparent-L (related second front — pinned off-curve by design) ═══')
const lightCtaApp = items.map(i => appL(cta9(i.scale, 'light')))
const darkCtaApp = items.map(i => appL(cta9(i.scale, 'dark')))
const lc = stats(lightCtaApp), dc = stats(darkCtaApp)
console.log(`  LIGHT cta apparent-L*: mean ${f2(lc.m)} sd ${f2(lc.sd)} range ${f2(lc.range)} (archetype-driven — float is BY DESIGN)`)
console.log(`  DARK  cta apparent-L*: mean ${f2(dc.m)} sd ${f2(dc.sd)} range ${f2(dc.range)}`)
console.log('  (cta is the archetype fill, not a ladder rung — large spread is expected; recorded for the owner to scope.)')

console.log(`\nConstants in play: HIGHLIGHT_LIGHT.rootL=${HIGHLIGHT_LIGHT.rootL}, HIGHLIGHT_DARK.rootL=${HIGHLIGHT_DARK.rootL}, KEEP_LIGHT=${KEEP_LIGHT}, KEEP_DARK=${KEEP_DARK}`)
console.log(`DARK_NEUTRAL_L acc8/ink11 = ${DARK_NEUTRAL_L[7]}/${DARK_NEUTRAL_L[10]}`)
