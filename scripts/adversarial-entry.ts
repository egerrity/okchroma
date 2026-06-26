// Trace the EXACT entry L into placeLegibleRung (dark) and re-run the onTextIsWhite
// gate at that entry — this is where white-vs-black is LOCKED, before the loop.
import { BRANDS } from '../src/brands'
import { resolveBrand, SIGNAL_SCALES } from '../src/engine/resolve'
import { darkChromaCurve } from '../src/engine/darkChromaCurve'
import { wcagY, contrastRatio, clampChromaToGamut, apcaY, apcaLc, oklchToLinearRgb } from '../src/engine/constraints'
import { HIGHLIGHT_DARK } from '../src/engine/stopTable'
import type { ColorStop } from '../src/engine/colorEngine'

const f3 = (n: number) => n.toFixed(3)
const f2 = (n: number) => n.toFixed(2)
const gm = (c: number) => c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055
function aY(L: number, C: number, H: number) {
  const [rl, gl, bl] = oklchToLinearRgb(L, C, H)
  return apcaY(gm(rl), gm(gl), gm(bl))
}

const items: { name: string; scale: any }[] = []
for (const b of BRANDS) items.push({ name: b.name, scale: resolveBrand(b.hex, b.slug, { exact: b.exact, archetypeOverride: b.archetypeOverride, style: b.style }).scale })
for (const { def, scale } of SIGNAL_SCALES.values()) items.push({ name: `sig:${def.name}`, scale })

// In colorEngine, dark placeLegibleRung is ENTERED at L0 = HIGHLIGHT_DARK.rootL = 0.62
// (no perceptual placement on the dark entry — it's the raw rootL). The chroma there
// is darkHlC(0.62, hue). The dark highlight hue = torsionedHue(darkH, 0.62, dark9L, gOff).
// We approximate the entry hue with the SHIPPED hue (torsion at 0.56 vs 0.62 differs
// slightly but the gate verdict is robust). To be exact, also test at shipped hue.
console.log('═══ Entry gate @ L0=0.62 (where white-vs-black is decided, pre-loop) ═══')
console.log('  Using the dark highlight chroma curve at 0.62 + shipped hue.')
console.log('  ramp            H      C@.62  | whiteWCAG blackWCAG whiteAPCA blackAPCA | APCApick whiteFailsWCAG blackBlockedBy45')
let pickWhite = 0, whiteFailWcag = 0, flipBlockedByFloor = 0, flipBlockedByBlackWcag = 0
for (const { name, scale } of items) {
  const hl = scale.dark[12] as ColorStop
  const H = hl.H
  const C = clampChromaToGamut(0.62, darkChromaCurve(0.62, H, scale.brandC, undefined), H)
  const Y = aY(0.62, C, H)
  const wA = Math.abs(apcaLc(1.0, Y)), bA = Math.abs(apcaLc(0.0, Y))
  const wW = contrastRatio(1.0, wcagY(0.62, C, H)), bW = contrastRatio(wcagY(0.62, C, H), 0)
  const apcaWhite = wA >= bA
  if (apcaWhite) pickWhite++
  const wFail = wW < 4.5
  if (apcaWhite && wFail) whiteFailWcag++
  // enforce flip: white→black requires blackWCAG>=4.5 AND blackAPCA>=45
  const blackCanFlip = bW >= 4.5 && bA >= 45
  let blockNote = ''
  if (apcaWhite && wFail) {
    if (blackCanFlip) blockNote = 'FLIPS'
    else if (bW < 4.5) { blockNote = 'black-fails-WCAG'; flipBlockedByBlackWcag++ }
    else if (bA < 45) { blockNote = 'black-APCA<45'; flipBlockedByFloor++ }
  }
  console.log(`  ${name.padEnd(15)} ${f2(H).padStart(6)} ${f3(C)} | ${f2(wW).padStart(4)}     ${f2(bW).padStart(4)}     ${f2(wA).padStart(5)}    ${f2(bA).padStart(5)}    | ${apcaWhite?'W':'B'}       ${wFail?'YES':'no '}          ${blockNote}`)
}
console.log(`\n  APCA-picks-white: ${pickWhite}/${items.length}   white-fails-WCAG@0.62: ${whiteFailWcag}`)
console.log(`  of those: flipBlockedByAPCAfloor(<45): ${flipBlockedByFloor}   flipBlockedByBlackAlsoFailingWCAG: ${flipBlockedByBlackWcag}`)
