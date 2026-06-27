// READ-ONLY — confirms the CAUSAL mechanism of the dark-highlight misfit.
// Re-derives the dark highlight WITHOUT the legibility loop (raw rung at
// HIGHLIGHT_DARK.rootL) vs WITH it (the shipped value), to prove what actually
// places the dark highlight, and measures OKLCH-L separation from highlight-8.
//   esbuild scripts/highlight-mechanism.ts --bundle --platform=node --outfile=dist/highlight-mechanism.js && node dist/highlight-mechanism.js

import { BRANDS } from '../src/brands'
import { resolveBrand } from '../src/engine/resolve'
import { darkChromaCurve } from '../src/engine/darkChromaCurve'
import { wcagY, contrastRatio, clampChromaToGamut } from '../src/engine/constraints'
import { apparentL } from '../src/engine/perceptualL'
import { HIGHLIGHT_DARK, DARK_NEUTRAL_L } from '../src/engine/stopTable'
import type { ColorStop } from '../src/engine/colorEngine'

const f3 = (n: number) => n.toFixed(3)
const f2 = (n: number) => n.toFixed(2)
const whiteWcag = (s: { L: number; C: number; H: number }) => contrastRatio(1.0, wcagY(s.L, s.C, s.H))
const blackWcag = (s: { L: number; C: number; H: number }) => contrastRatio(wcagY(s.L, s.C, s.H), 0)

const sample = ['Dark Roast', 'Cold Brew', 'Blueberry', 'Sencha', 'Honey Lemon', 'Cranberry', 'Hibiscus', 'Chili Mocha', 'Ube Latte', 'Matcha']

console.log('═══ Dark highlight: raw rung @ rootL 0.62 (pre-legibility) vs shipped (post-loop) ═══')
console.log('   rootL =', HIGHLIGHT_DARK.rootL, ' highlight-8 dark OKLCH L =', DARK_NEUTRAL_L[7], '\n')
console.log('  ramp           | rawL  whiteWCAG@raw blackWCAG@raw | shipL shipWCAG(side) | acc8L  ΔL(hl−acc8)')
for (const name of sample) {
  const b = BRANDS.find(x => x.name === name)!
  const scale = resolveBrand(b.hex, b.slug, { exact: b.exact, archetypeOverride: b.archetypeOverride, style: b.style }).scale
  const ship = scale.dark[8] as ColorStop           // shipped highlight-9 (stop 9, index 8)
  const acc8 = scale.dark[7] as ColorStop
  const H = ship.H
  // Raw rung exactly as colorEngine builds it at rootL 0.62, same dark chroma curve:
  const rawC = clampChromaToGamut(HIGHLIGHT_DARK.rootL, darkChromaCurve(HIGHLIGHT_DARK.rootL, H, scale.brandC), H)
  const raw = { L: HIGHLIGHT_DARK.rootL, C: rawC, H }
  const shipWhite = scale.onHighlightIsWhiteDark
  const shipSideWcag = shipWhite ? whiteWcag(ship) : blackWcag(ship)
  console.log(
    `  ${name.padEnd(14)} | ${f3(raw.L)}  ${f2(whiteWcag(raw)).padStart(4)}        ${f2(blackWcag(raw)).padStart(4)}       ` +
    `| ${f3(ship.L)} ${f2(shipSideWcag)}(${shipWhite ? 'W' : 'B'}) | ${f3(acc8.L)}  ${(ship.L - acc8.L >= 0 ? '+' : '') + f3(ship.L - acc8.L)}`
  )
}

console.log('\n═══ Separation highlight-8 → highlight, both modes (OKLCH L AND apparent L*) ═══')
console.log('   Light: highlight is a dark chip well below the light highlight-8 (0.738). Dark: highlight-8 is 0.55,')
console.log('   so a legibility-darkened highlight has almost nowhere to sit — they converge.\n')
console.log('  ramp           | LIGHT a8L  hlL   ΔOKL  ΔappL | DARK a8L  hlL   ΔOKL  ΔappL')
for (const name of sample) {
  const b = BRANDS.find(x => x.name === name)!
  const scale = resolveBrand(b.hex, b.slug, { exact: b.exact, archetypeOverride: b.archetypeOverride, style: b.style }).scale
  const la8 = scale.light[7] as ColorStop, lhl = scale.light[8] as ColorStop
  const da8 = scale.dark[7] as ColorStop, dhl = scale.dark[8] as ColorStop
  const lApp = Math.abs(apparentL(la8.L, la8.C, la8.H) - apparentL(lhl.L, lhl.C, lhl.H))
  const dApp = Math.abs(apparentL(da8.L, da8.C, da8.H) - apparentL(dhl.L, dhl.C, dhl.H))
  console.log(
    `  ${name.padEnd(14)} | ${f3(la8.L)} ${f3(lhl.L)} ${f3(Math.abs(la8.L - lhl.L))} ${f2(lApp).padStart(5)} ` +
    `| ${f3(da8.L)} ${f3(dhl.L)} ${f3(Math.abs(da8.L - dhl.L))} ${f2(dApp).padStart(5)}`
  )
}
