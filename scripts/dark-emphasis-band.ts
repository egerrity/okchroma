// READ-ONLY — shows WHERE in the dark ladder an emphasis fill can live, and that
// the cta already occupies the black-text band above the surfaces. Supports the
// claim: a white-text dark highlight is trapped in the surface band (≤0.58); the
// only separated home for an emphasis fill is the 0.62–0.72 black-text band.
//   esbuild scripts/dark-emphasis-band.ts --bundle --platform=node --outfile=dist/dark-emphasis-band.js && node dist/dark-emphasis-band.js
import { BRANDS } from '../src/brands'
import { resolveBrand } from '../src/engine/resolve'
import { DARK_NEUTRAL_L } from '../src/engine/stopTable'
import type { ColorStop } from '../src/engine/colorEngine'
const f3 = (n: number) => n.toFixed(3)
const sample = ['Dark Roast', 'Cold Brew', 'Blueberry', 'Sencha', 'Honey Lemon', 'Cranberry', 'Chili Mocha']
console.log('Dark surface ladder L (DARK_NEUTRAL_L 1–8):', DARK_NEUTRAL_L.slice(0, 8).join(', '))
console.log('Dark ink L (11/12):', DARK_NEUTRAL_L[10], DARK_NEUTRAL_L[11], '\n')
console.log('  ramp           | ctaL  ctaOnText | hl9L  hlOnText | acc8L  ink11L')
for (const name of sample) {
  const b = BRANDS.find(x => x.name === name)!
  const scale = resolveBrand(b.hex, b.slug, { exact: b.exact, archetypeOverride: b.archetypeOverride, style: b.style }).scale
  const cta = scale.ctaDark as ColorStop, hl = scale.dark[8] as ColorStop
  const a8 = scale.dark[7] as ColorStop, ink11 = scale.dark[10] as ColorStop
  console.log(
    `  ${name.padEnd(14)} | ${f3(cta.L)}  ${scale.onFillTextIsWhiteDark ? 'WHITE' : 'black'}     ` +
    `| ${f3(hl.L)} ${scale.onHighlightIsWhiteDark ? 'WHITE' : 'black'}    | ${f3(a8.L)}  ${f3(ink11.L)}`
  )
}
