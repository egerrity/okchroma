// READ-ONLY — pins the dead-zone: at L~0.62 black text passes WCAG but its APCA
// |Lc| is below the 45 floor the enforce-flip requires, so white is kept and the
// loop darkens. At ~0.66 black clears BOTH ⇒ polarity would fall out black with no
// value-move. Uses Cold Brew's dark highlight hue/chroma as a representative fill.
//   esbuild scripts/deadzone-probe.ts --bundle --platform=node --outfile=dist/deadzone-probe.js && node dist/deadzone-probe.js
import { resolveBrand } from '../src/engine/resolve'
import { BRANDS } from '../src/brands'
import { darkChromaCurve } from '../src/engine/darkChromaCurve'
import { wcagY, contrastRatio, clampChromaToGamut, apcaY, apcaLc, oklchToLinearRgb } from '../src/engine/constraints'
import type { ColorStop } from '../src/engine/colorEngine'
const f2 = (n: number) => n.toFixed(2)
const gm = (c: number) => c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055
function fillApcaY(L: number, C: number, H: number) {
  const [rl, gl, bl] = oklchToLinearRgb(L, C, H)
  return apcaY(gm(rl), gm(gl), gm(bl))
}
for (const name of ['Cold Brew', 'Cranberry', 'Sencha']) {
  const b = BRANDS.find(x => x.name === name)!
  const sc = resolveBrand(b.hex, b.slug, { exact: b.exact, style: b.style }).scale
  const H = (sc.dark[12] as ColorStop).H
  console.log(`\n${name} (dark highlight hue H${H.toFixed(1)}):`)
  console.log('   L     C      whiteWCAG blackWCAG  whiteAPCA|Lc| blackAPCA|Lc|  → flip-to-black needs blackWCAG≥4.5 AND blackAPCA≥45')
  for (const L of [0.55, 0.58, 0.60, 0.62, 0.64, 0.66, 0.68, 0.70]) {
    const C = clampChromaToGamut(L, darkChromaCurve(L, H, sc.brandC), H)
    const Y = fillApcaY(L, C, H)
    const wW = contrastRatio(1.0, wcagY(L, C, H)), bW = contrastRatio(wcagY(L, C, H), 0)
    const wA = Math.abs(apcaLc(1.0, Y)), bA = Math.abs(apcaLc(0.0, Y))
    const blackFallsOut = bW >= 4.5 && bA >= 45
    console.log(`   ${L.toFixed(2)}  ${C.toFixed(3)}   ${f2(wW).padStart(5)}    ${f2(bW).padStart(5)}     ${f2(wA).padStart(6)}        ${f2(bA).padStart(6)}      ${blackFallsOut ? 'BLACK falls out ✓' : ''}`)
  }
}
