// READ-ONLY — under "let it fall out": what text color is LEGIBLE on the NATURAL
// (un-darkened) dark highlight fill? The natural fill is the rung at its curve
// position (HIGHLIGHT_DARK.rootL, before placeLegibleRung's value-move), chroma
// from darkChromaCurve. Reports whiteWCAG/blackWCAG so we can see which color
// falls out, and the natural separation from accent-8 (0.55).
//   esbuild scripts/highlight-fallout-check.ts --bundle --platform=node --outfile=dist/highlight-fallout-check.js && node dist/highlight-fallout-check.js
import { BRANDS } from '../src/brands'
import { SECONDARIES } from '../src/secondaries'
import { resolveBrand, SIGNAL_SCALES } from '../src/engine/resolve'
import { darkChromaCurve } from '../src/engine/darkChromaCurve'
import { wcagY, contrastRatio, clampChromaToGamut, apcaY, apcaLc, oklchToLinearRgb } from '../src/engine/constraints'
import { HIGHLIGHT_DARK, DARK_NEUTRAL_L } from '../src/engine/stopTable'
import type { GeneratedScale, ColorStop } from '../src/engine/colorEngine'

const f2 = (n: number) => n.toFixed(2)
const gm = (c: number) => c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055
const apcaYof = (L: number, C: number, H: number) => { const [r, g, b] = oklchToLinearRgb(L, C, H); return apcaY(gm(r), gm(g), gm(b)) }

interface Item { name: string; scale: GeneratedScale }
const items: Item[] = []
for (const b of BRANDS) items.push({ name: b.name, scale: resolveBrand(b.hex, b.slug, { exact: b.exact, archetypeOverride: b.archetypeOverride, style: b.style }).scale })
for (const slug of Object.keys(SECONDARIES)) { const br = BRANDS.find(x => x.slug === slug)!; items.push({ name: `${slug}-2nd`, scale: resolveBrand(SECONDARIES[slug], `${slug} accent`, { exact: br.exact, style: br.style }).scale }) }
for (const { def, scale } of SIGNAL_SCALES.values()) items.push({ name: `sig:${def.name}`, scale })

const L0 = HIGHLIGHT_DARK.rootL
const acc8L = DARK_NEUTRAL_L[7]
let whiteLegible = 0, blackLegible = 0, both = 0, neither = 0
let minBlack = 99, maxWhite = 0
console.log(`Natural dark highlight fill = rung at L=${L0} (no value-move), chroma=darkChromaCurve. accent-8 L=${acc8L} (ΔL=${(L0 - acc8L).toFixed(3)} fixed).\n`)
console.log('  ramp                 H      C      whiteWCAG blackWCAG  legible      | whiteAPCA blackAPCA')
for (const { name, scale } of items) {
  const H = (scale.dark[12] as ColorStop).H
  const C = clampChromaToGamut(L0, darkChromaCurve(L0, H, scale.brandC), H)
  const wW = contrastRatio(1.0, wcagY(L0, C, H)), bW = contrastRatio(wcagY(L0, C, H), 0)
  const Y = apcaYof(L0, C, H)
  const wA = Math.abs(apcaLc(1.0, Y)), bA = Math.abs(apcaLc(0.0, Y))
  const wOk = wW >= 4.5, bOk = bW >= 4.5
  const tag = wOk && bOk ? 'both' : wOk ? 'WHITE' : bOk ? 'black' : 'NEITHER'
  if (wOk && bOk) both++; else if (wOk) whiteLegible++; else if (bOk) blackLegible++; else neither++
  minBlack = Math.min(minBlack, bW); maxWhite = Math.max(maxWhite, wW)
}
// summary only (per-ramp loop above tallies); print compact tally
console.log(`(suppressed per-row; tally below)\n`)
console.log(`Across ${items.length} ramps at the natural L=${L0}:`)
console.log(`  black WCAG-legible: ${blackLegible + both}/${items.length}   (min blackWCAG ${f2(minBlack)})`)
console.log(`  white WCAG-legible: ${whiteLegible + both}/${items.length}   (max whiteWCAG ${f2(maxWhite)})`)
console.log(`  → black-only ${blackLegible}, white-only ${whiteLegible}, both ${both}, neither ${neither}`)
console.log(`\nInterpretation: if black is the only WCAG-legible side at the natural fill, BLACK falls out`)
console.log(`with the fill left exactly where the curve put it (ΔL ${(L0 - acc8L).toFixed(3)} above accent-8) — no lift, no darken.`)
