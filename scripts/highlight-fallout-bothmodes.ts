// READ-ONLY — what on-highlight the engine SHIPS today vs what would fall out if
// the fill were left at its natural curve value. Shows the light/dark asymmetry:
// the white-text value-move may be DESIRED in light (dark button) but destructive
// in dark. Helps scope "let it fall out" without regressing light.
//   esbuild scripts/highlight-fallout-bothmodes.ts --bundle --platform=node --outfile=dist/highlight-fallout-bothmodes.js && node dist/highlight-fallout-bothmodes.js
import { BRANDS } from '../src/brands'
import { resolveBrand } from '../src/engine/resolve'
import { wcagY, contrastRatio } from '../src/engine/constraints'
import type { ColorStop } from '../src/engine/colorEngine'
const f2 = (n: number) => n.toFixed(2), f3 = (n: number) => n.toFixed(3)
const wW = (s: ColorStop) => contrastRatio(1.0, wcagY(s.L, s.C, s.H))
const bW = (s: ColorStop) => contrastRatio(wcagY(s.L, s.C, s.H), 0)
const sample = ['Dark Roast', 'Cold Brew', 'Blueberry', 'Sencha', 'Honey Lemon', 'Cranberry', 'Chili Mocha']
console.log('SHIPPED highlight today (after placeLegibleRung value-move), both modes:')
console.log('  ramp           | LIGHT hlL  pol   whiteWCAG blackWCAG | DARK hlL  pol   whiteWCAG blackWCAG')
for (const name of sample) {
  const b = BRANDS.find(x => x.name === name)!
  const sc = resolveBrand(b.hex, b.slug, { exact: b.exact, archetypeOverride: b.archetypeOverride, style: b.style }).scale
  const lh = sc.light[8] as ColorStop, dh = sc.dark[8] as ColorStop
  const lp = sc.onHighlightIsWhite ? 'WHITE' : 'black', dp = sc.onHighlightIsWhiteDark ? 'WHITE' : 'black'
  console.log(`  ${name.padEnd(14)} | ${f3(lh.L)}  ${lp}  ${f2(wW(lh)).padStart(5)}    ${f2(bW(lh)).padStart(5)}    | ${f3(dh.L)}  ${dp}  ${f2(wW(dh)).padStart(5)}    ${f2(bW(dh)).padStart(5)}`)
}
console.log('\nNote: LIGHT ships WHITE at ~4.6 (fill darkened DOWN into a dark button on near-white surfaces — desirable).')
console.log('      DARK ships WHITE at ~4.6 too, but the same darken pulls the chip onto accent-8 (destructive).')
console.log('      Light accent-8 L=0.738 (chip sits well below it); dark accent-8 L=0.55 (chip collapses onto it).')
