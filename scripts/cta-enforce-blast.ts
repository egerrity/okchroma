// READ-ONLY — blast radius of dropping the cta's enforceOnFillContrast fill-darken.
// Regenerates every brand with enforce ON vs OFF and diffs ONLY cta-1/cta-2 (the
// archetype fill + hover), both modes. cta-1/cta-2 depend only on the cta code
// path, so this isolates the cta impact (highlight/polarity changes don't touch
// these stops). Confirms whether the #07074F/#869CDA canary (Dark Roast) moves.
//   esbuild scripts/cta-enforce-blast.ts --bundle --platform=node --outfile=dist/cta-enforce-blast.js && node dist/cta-enforce-blast.js
import { BRANDS } from '../src/brands'
import { generateScale, type ColorStop } from '../src/engine/colorEngine'
import { darkChromaCurve } from '../src/engine/darkChromaCurve'
import { DARK_BRAND_FILL_MIN_L } from '../src/engine/stopTable'

const hx = (s: ColorStop) => {
  const c = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')
  return `#${c(s.r)}${c(s.g)}${c(s.b)}`.toUpperCase()
}
const baseFloor = (enforce: boolean) => ({
  darkFillMinL: DARK_BRAND_FILL_MIN_L,
  enforceOnFillContrast: enforce,
  coolRedDark: true,
  darkChromaCurve,
  highlight: true as const,
})

let changed = 0
const rows: string[] = []
for (const b of BRANDS) {
  if (b.exact) continue // exact ships raw, no enforce anyway
  const on = generateScale(b.hex, b.slug, undefined, baseFloor(true))
  const off = generateScale(b.hex, b.slug, undefined, baseFloor(false))
  const lc1on = hx(on.cta), lc1off = hx(off.cta)
  const lc2on = hx(on.ctaHover), lc2off = hx(off.ctaHover)
  const dc1on = hx(on.ctaDark), dc1off = hx(off.ctaDark)
  const dc2on = hx(on.ctaHoverDark), dc2off = hx(off.ctaHoverDark)
  const moved = lc1on !== lc1off || lc2on !== lc2off || dc1on !== dc1off || dc2on !== dc2off
  if (moved) {
    changed++
    rows.push(`  ${b.name.padEnd(16)} light cta-1 ${lc1on}→${lc1off}${lc1on !== lc1off ? ' *' : ''}  dark cta-1 ${dc1on}→${dc1off}${dc1on !== dc1off ? ' *' : ''}`)
  }
}
console.log(`cta-1/cta-2 hex change when enforceOnFillContrast is dropped (non-exact brands):\n`)
console.log(rows.length ? rows.join('\n') : '  (none)')
console.log(`\n${changed}/${BRANDS.filter(b => !b.exact).length} non-exact brands' cta moves.`)
// Explicit canary check
const dr = BRANDS.find(b => b.name === 'Dark Roast')!
const on = generateScale(dr.hex, dr.slug, undefined, baseFloor(true))
const off = generateScale(dr.hex, dr.slug, undefined, baseFloor(false))
console.log(`\nCANARY (Dark Roast): light cta-1 ${hx(on.cta)}→${hx(off.cta)}  |  dark cta-1 ${hx(on.ctaDark)}→${hx(off.ctaDark)}`)
console.log(`  → canary ${hx(on.cta) === hx(off.cta) && hx(on.ctaDark) === hx(off.ctaDark) ? 'UNCHANGED (stays green)' : 'WOULD MOVE (needs deliberate canary update)'}`)
