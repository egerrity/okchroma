// ─────────────────────────────────────────────────────────────────────────────
// HELMHOLTZ–KOHLRAUSCH LADDER  ·  the 1–12 scale, re-unified (read-only)
// ─────────────────────────────────────────────────────────────────────────────
//
// The owner's insight: 1–8 + highlight-1/2 + text-alt + text are really ONE
// continuous 1–12 ladder. They got SPLIT because, without a perceptual-lightness
// curve, the rungs couldn't be kept consistent and were hand-placed separately.
// The H-K curve places every rung at a derived perceived-lightness target — so
// they rejoin as one scale. The cta (brand identity fill) is simply PINNED where
// the brand's own lightness lands; it's not a rung of the scale.
//
// This prototype generates the full 12-rung ladder under the curve for 3
// representative brands, pins the cta at the end, and proves the rungs align
// across brands (cross-brand perceived-L spread per rung → ~0). No engine change.
//
// Curve target = "keep vibrancy" (each rung = today's mean perceived-L across hue).
//
// Run: esbuild scripts/helmk-ladder.ts --bundle --platform=node --outfile=dist/helmk-ladder.js && node dist/helmk-ladder.js

import { clampChromaToGamut } from '../src/engine/constraints'
import { generateScale } from '../src/engine/colorEngine'
import { hoverL } from '../src/engine/archetypes'
import { LIGHT_STOPS, LIGHT_BASE_C, HIGHLIGHT_LIGHT, STOP_11, STOP_12 } from '../src/engine/stopTable'
import { BRANDS } from '../src/brands'
import { nayataniApparentL as nay, solveLForApparent, oklchToHex, mean, spread, padN, pad } from './helmk-lib'

const HUES24 = Array.from({ length: 24 }, (_, i) => i * 15)
const REF_C = 0.16 // representative vivid brand chroma for text-rung target calc

// The 12 rungs of the scale, in descending lightness. idx = position in
// generateScale(...,{highlight:true}).light, which is now a clean 1–12 ladder:
// 1–8 → 0–7, highlight-9/10 → 8/9, text-alt/text → 10/11. The cta (brand-identity
// fill) is NOT a rung — it's off-scale (scale.cta/.ctaHover) and pinned at the end.
const RUNGS = [
  ...LIGHT_STOPS.map((s, i) => ({ name: `${i + 1}`, rootL: s.rootL, repC: LIGHT_BASE_C[i], idx: i })),
  { name: 'hl-1', rootL: HIGHLIGHT_LIGHT.rootL, repC: HIGHLIGHT_LIGHT.baseC, idx: 8 },
  { name: 'hl-2', rootL: hoverL(HIGHLIGHT_LIGHT.rootL), repC: HIGHLIGHT_LIGHT.baseC, idx: 9 },
  { name: 'txt-alt', rootL: STOP_11.rootL, repC: STOP_11.chromaMultiplier * REF_C, idx: 10 },
  { name: 'text', rootL: STOP_12.rootL, repC: STOP_12.chromaMultiplier * REF_C, idx: 11 },
]

// Per-rung "keep vibrancy" target = mean perceived-L across hue at that rung.
const target = RUNGS.map(r => mean(HUES24.map(H => nay(r.rootL, clampChromaToGamut(r.rootL, r.repC, H), H))))

const PICKS = ['Blueberry', 'Matcha', 'Chili Mocha'] // blue / green / red — span hue + the H-K range
const brands = PICKS.map(n => BRANDS.find(b => b.name === n)!)

type Rung = { hex: string; appr: number }
const ladders = brands.map(b => {
  const scale = generateScale(b.hex, b.slug, undefined, { highlight: true })
  const rungs: Rung[] = RUNGS.map((r, k) => {
    const s = scale.light[r.idx]
    const L = solveLForApparent(target[k], s.C, s.H, nay)
    return { hex: oklchToHex(L, s.C, s.H), appr: nay(L, clampChromaToGamut(L, s.C, s.H), s.H) }
  })
  return {
    name: b.name, hex: b.hex,
    rungs,
    cta1: oklchToHex(scale.cta.L, scale.cta.C, scale.cta.H),
    cta2: oklchToHex(scale.ctaHover.L, scale.ctaHover.C, scale.ctaHover.H),
  }
})

console.log('\n══════════════════════════════════════════════════════════════════════════')
console.log(' H-K LADDER — 1–12 as one continuous perceptual scale, cta pinned at the end')
console.log('══════════════════════════════════════════════════════════════════════════')
console.log(' 3 brands · "keep vibrancy" target · perceived L should match across brands per rung\n')

// ── Proof: rungs align across brands (the unification) ───────────────────────
console.log('  rung      target    ' + brands.map(b => pad(b.name, 14)).join('') + ' cross-brand spread')
for (let k = 0; k < RUNGS.length; k++) {
  const apprs = ladders.map(l => l.rungs[k].appr)
  const cells = ladders.map(l => pad(`${l.rungs[k].hex} ${l.rungs[k].appr.toFixed(1)}`, 14)).join('')
  console.log(`  ${pad(RUNGS[k].name, 8)} ${padN(target[k], 6)}    ${cells} ${spread(apprs).toFixed(2)} L*`)
}
console.log('\n  cta (pinned — brand identity, NOT a rung):')
for (const l of ladders) console.log(`   ${pad(l.name, 14)} ${l.cta1} / ${l.cta2}   (from brand ${l.hex})`)

// ── JSON for the swatch widget ───────────────────────────────────────────────
console.log('\n── LADDER_JSON ───────────────────────────────────────────────────────────────')
console.log(JSON.stringify(ladders.map(l => ({
  name: l.name, hex: l.hex, cta1: l.cta1, cta2: l.cta2,
  rungs: l.rungs.map(r => r.hex), labels: RUNGS.map(r => r.name),
}))))
console.log('')
