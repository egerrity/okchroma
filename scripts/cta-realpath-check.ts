// READ-ONLY — does my hand-built generateScale call match the REAL resolveBrand
// pipeline? Compares cta-1 from (a) direct generateScale with a hand floor vs
// (b) resolveBrand (collision + rung-1 + dark-collider + applyRedCoolRender).
// If they differ, the cta-enforce-blast numbers were off the wrong path.
//   esbuild scripts/cta-realpath-check.ts --bundle --platform=node --outfile=dist/cta-realpath-check.js && node dist/cta-realpath-check.js
import { BRANDS } from '../src/brands'
import { resolveBrand } from '../src/engine/resolve'
import { generateScale, type ColorStop } from '../src/engine/colorEngine'
import { darkChromaCurve } from '../src/engine/darkChromaCurve'
import { DARK_BRAND_FILL_MIN_L, ACCENT_DARK_STOPS } from '../src/engine/stopTable'
const hx = (s: ColorStop) => { const c = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0'); return `#${c(s.r)}${c(s.g)}${c(s.b)}`.toUpperCase() }
const directFloor = { darkFillMinL: DARK_BRAND_FILL_MIN_L, darkStops: ACCENT_DARK_STOPS, enforceOnFillContrast: true, coolRedDark: true, darkChromaCurve, highlight: true as const }
const sample = ['Dark Roast', 'Chili Mocha', 'Dragonfruit', 'Turmeric Latte', 'Matcha', 'Cranberry', 'Hibiscus']
console.log('  brand            | DIRECT generateScale   | REAL resolveBrand      | match  (light cta-1 / dark cta-1)  flags')
for (const name of sample) {
  const b = BRANDS.find(x => x.name === name)!
  const d = generateScale(b.hex, b.slug, undefined, directFloor)
  const meta = resolveBrand(b.hex, b.slug, { exact: b.exact, archetypeOverride: b.archetypeOverride, style: b.style })
  const r = meta.scale
  const dL = hx(d.cta), dD = hx(d.ctaDark), rL = hx(r.cta), rD = hx(r.ctaDark)
  const same = dL === rL && dD === rD
  const tags = [meta.rung1 ? 'rung1' : '', meta.darkCollider ? 'darkMuted' : '', meta.errorComponentRule ? 'errComp' : ''].filter(Boolean).join(',')
  console.log(`  ${name.padEnd(15)} | ${dL} / ${dD}  | ${rL} / ${rD}  | ${same ? ' same ' : 'DIFFER'}  ${tags}`)
}
