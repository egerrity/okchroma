// ADVERSARIAL probe — tests each link of the white-text-loop claim AND the
// alternative root causes (darkChromaCurve / dark9L / DARK_NEUTRAL_L).
import { BRANDS } from '../src/brands'
import { resolveBrand, SIGNAL_SCALES } from '../src/engine/resolve'
import { darkChromaCurve } from '../src/engine/darkChromaCurve'
import { wcagY, contrastRatio, clampChromaToGamut, apcaY, apcaLc, oklchToLinearRgb } from '../src/engine/constraints'
import { HIGHLIGHT_DARK, DARK_NEUTRAL_L } from '../src/engine/stopTable'
import type { ColorStop } from '../src/engine/colorEngine'

const f3 = (n: number) => n.toFixed(3)
const f2 = (n: number) => n.toFixed(2)
const gm = (c: number) => c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055
function fillApcaY(L: number, C: number, H: number) {
  const [rl, gl, bl] = oklchToLinearRgb(L, C, H)
  return apcaY(gm(rl), gm(gl), gm(bl))
}

const items: { name: string; scale: any }[] = []
for (const b of BRANDS) items.push({ name: b.name, scale: resolveBrand(b.hex, b.slug, { exact: b.exact, archetypeOverride: b.archetypeOverride, style: b.style }).scale })
for (const { def, scale } of SIGNAL_SCALES.values()) items.push({ name: `sig:${def.name}`, scale })

// ── LINK A: is the shipped highlight ALWAYS white? what side does it pick? ──
console.log('═══ LINK A: shipped on-highlight-dark polarity across full fleet ═══')
let whiteCount = 0, blackCount = 0
for (const { scale } of items) { scale.onHighlightIsWhiteDark ? whiteCount++ : blackCount++ }
console.log(`  white=${whiteCount}  black=${blackCount}  (of ${items.length})`)

// ── LINK B: at the shipped L, does white actually FAIL WCAG 4.5 and would a
//    flip-to-black be BLOCKED by the black-APCA<45 floor (vs black failing WCAG)? ──
console.log('\n═══ LINK B: at the SHIPPED highlight L, dissect the enforce-flip gate ═══')
console.log('  ramp            shipL  C      H      | whiteWCAG blackWCAG blackAPCA | flipBlockedBy')
for (const { name, scale } of items) {
  const hl = scale.dark[8] as ColorStop // highlight-9 (post-heal: clean 1–12 ladder, index 8 = stop 9)
  const { L, C, H } = hl
  const Y = fillApcaY(L, C, H)
  const wW = contrastRatio(1.0, wcagY(L, C, H))
  const bW = contrastRatio(wcagY(L, C, H), 0)
  const bA = Math.abs(apcaLc(0.0, Y))
  let why = ''
  if (wW >= 4.5) why = 'white-PASSES-WCAG(no flip needed)'
  else if (bW >= 4.5 && bA >= 45) why = '*** SHOULD HAVE FLIPPED ***'
  else if (bW < 4.5) why = 'black-fails-WCAG'
  else if (bA < 45) why = 'black-APCA<45 (DEAD ZONE)'
  console.log(`  ${name.padEnd(15)} ${f3(L)}  ${f3(C)}  ${f2(H).padStart(6)} | ${f2(wW).padStart(5)}     ${f2(bW).padStart(5)}     ${f2(bA).padStart(5)}    | ${why}`)
}

// ── LINK C: counterfactual — the RAW rung at rootL 0.62 (no loop). Where would
//    it sit, and what would its ΔL vs highlight-8 be? Does the loop CAUSE collapse? ──
console.log('\n═══ LINK C: raw rung @0.62 (NO loop) vs shipped (post-loop) ΔL to acc8 ═══')
console.log('  acc8 dark L =', DARK_NEUTRAL_L[7], ' rootL =', HIGHLIGHT_DARK.rootL)
console.log('  ramp            rawL  rawΔacc8 | shipL shipΔacc8 | loop moved L by')
const rawDeltas: number[] = [], shipDeltas: number[] = []
for (const { name, scale } of items) {
  const hl = scale.dark[8] as ColorStop // highlight-9 (post-heal: clean 1–12 ladder, index 8 = stop 9)
  const acc8 = scale.dark[7] as ColorStop
  const H = hl.H
  const rawC = clampChromaToGamut(HIGHLIGHT_DARK.rootL, darkChromaCurve(HIGHLIGHT_DARK.rootL, scale.brandC, scale.brandC), H) // note: ctaC path differs; approx
  const rawL = HIGHLIGHT_DARK.rootL
  const rawDelta = rawL - acc8.L
  const shipDelta = hl.L - acc8.L
  rawDeltas.push(rawDelta); shipDeltas.push(shipDelta)
  console.log(`  ${name.padEnd(15)} ${f3(rawL)} ${(rawDelta>=0?'+':'')+f3(rawDelta)} | ${f3(hl.L)} ${(shipDelta>=0?'+':'')+f3(shipDelta)} | ${f3(hl.L - rawL)}`)
}
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
console.log(`  mean rawΔacc8 = ${f3(mean(rawDeltas))}   mean shipΔacc8 = ${f3(mean(shipDeltas))}`)

// ── LINK D: ALTERNATIVE root cause test — is the collapse driven by DARK_NEUTRAL_L
//    geometry alone (acc8=0.55 sits right under rootL=0.62, gap only 0.07)? ──
console.log('\n═══ LINK D: geometry — how much headroom does rootL 0.62 have above acc8 0.55? ═══')
console.log('  Even WITHOUT any loop, raw rootL 0.62 is only +0.07 OKLCH-L above acc8 0.55.')
console.log('  The loop then darkens ~0.05 more → collapse. Decompose the two contributions:')
console.log(`  raw geometric ΔL (rootL - acc8)         = ${f3(HIGHLIGHT_DARK.rootL - DARK_NEUTRAL_L[7])}`)
console.log(`  mean additional collapse from the loop  = ${f3(mean(shipDeltas) - mean(rawDeltas))}`)

// ── LINK E: counterfactual — if black-APCA floor were 0 (flip always allowed when
//    black passes WCAG), would the highlight flip & escape the collapse? ──
console.log('\n═══ LINK E: would dropping the APCA-45 floor let it flip to black at ship L? ═══')
console.log('  (tests whether the 45 floor is the SPECIFIC blocker vs black also failing WCAG)')
let wouldFlip = 0, blackAlsoFailsWcag = 0, whitePasses = 0
for (const { scale } of items) {
  const hl = scale.dark[8] as ColorStop // highlight-9 (post-heal: clean 1–12 ladder, index 8 = stop 9)
  const { L, C, H } = hl
  const Y = fillApcaY(L, C, H)
  const wW = contrastRatio(1.0, wcagY(L, C, H))
  const bW = contrastRatio(wcagY(L, C, H), 0)
  const bA = Math.abs(apcaLc(0.0, Y))
  if (wW >= 4.5) { whitePasses++; continue }
  if (bW >= 4.5 && bA < 45) wouldFlip++         // ONLY the floor blocks it
  else if (bW < 4.5) blackAlsoFailsWcag++
}
console.log(`  whitePassesWCAG(no flip): ${whitePasses}   blockedONLYbyAPCAfloor: ${wouldFlip}   blackAlsoFailsWCAG: ${blackAlsoFailsWcag}`)
