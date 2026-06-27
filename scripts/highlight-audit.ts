// Highlight + off-scale-cta audit. Validates the additive tokens the dark-audit's
// stop-1..12 window doesn't cover: the highlight rung (slot 9/10) and the off-scale
// cta pair.
//
// What it gates (all code-grounded, verified against the real pipeline):
//   1. on-highlight legibility — judged by APCA at the BODY-TEXT bar (Lc 60). The
//      gate runs over an AGNOSTIC hue×chroma fixture (synthetic inputs spanning the
//      space), not the brand list: the bar is the worst-case hue, so clearing it
//      clears every real brand for free. Covers hl9 AND hl10 (the hover); on-highlight
//      is ONE token, so hl10 is judged with hl9's chosen pole.
//   2. structure on the real fleet — light surface monotonic (highlight-8 > hl9 > hl10),
//      dark hl9/hl10 distinct, identity === input hex.
//   3. neutral cta is LOW-HIERARCHY — it tracks the scale's own stop 4 (cta) / stop 5
//      (hover), so it FLIPS per mode (near-white wash in light, dark wash in dark) and
//      on-cta stays legible.
//   4. signal cta legible + clean 12-stop scale.
//   5. blessed-snapshot regression on the highlight rung + off-scale cta (L,C,H).

import { BRANDS } from '../src/brands'
import { SECONDARIES } from '../src/secondaries'
import { SIGNALS } from '../src/engine/signals'
import { resolveBrand, SIGNAL_SCALES } from '../src/engine/resolve'
import { wcagY, contrastRatio, apcaY, apcaLc, clampChromaToGamut, oklchToLinearRgb } from '../src/engine/constraints'
import { YELLOW_L_LIFT, DARK_BRAND_FILL_MIN_L } from '../src/engine/stopTable'
import { generateNeutralScale, generateScale, type GeneratedScale, type ColorStop } from '../src/engine/colorEngine'
import { darkChromaCurve } from '../src/engine/darkChromaCurve'
import * as fs from 'fs'
import * as path from 'path'

const f = (n: number) => n.toFixed(3)
const hx = (s: ColorStop) => {
  const c = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')
  return `#${c(s.r)}${c(s.g)}${c(s.b)}`.toUpperCase()
}
const whiteWcag = (s: ColorStop) => contrastRatio(1.0, wcagY(s.L, s.C, s.H))
const blackWcag = (s: ColorStop) => contrastRatio(wcagY(s.L, s.C, s.H), 0)
// APCA Lc of a text pole on a fill (white → txtY 1.0, black → 0.0), mirroring the
// engine's onTextIsWhite. HL_BODY = APCA body-text floor: the bar the highlight clears.
const onApcaLc = (s: ColorStop, white: boolean | undefined) => Math.abs(apcaLc(white ? 1.0 : 0.0, apcaY(s.r, s.g, s.b)))
const HL_BODY = 60
const hueDelta = (h: number, c: number) => { let d = (h - c) % 360; if (d > 180) d -= 360; if (d < -180) d += 360; return d }
const isYellow = (scale: GeneratedScale) =>
  scale.brandC >= 0.008 && Math.abs(hueDelta(scale.brandH, YELLOW_L_LIFT.centerH)) <= YELLOW_L_LIFT.sigmaDeg

const fails: string[] = []
const ok = (cond: boolean, msg: string) => { if (!cond) fails.push(msg) }

// ── 1. Agnostic legibility fixture — the bar is the worst-case hue, not a brand ──
// Sweep hue × chroma over synthetic inputs and gate the on-highlight pick at the
// body-text APCA floor (Lc 60) on hl9 and its hover hl10, both modes.
const encSrgb = (c: number) => { c = Math.min(1, Math.max(0, c)); return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055 }
const synthHex = (L: number, C: number, H: number) => {
  const [r, g, b] = oklchToLinearRgb(L, clampChromaToGamut(L, C, H), H)
  const h2 = (v: number) => Math.round(Math.max(0, Math.min(1, encSrgb(v))) * 255).toString(16).padStart(2, '0')
  return `#${h2(r)}${h2(g)}${h2(b)}`
}
const FIX_FLOOR = { darkFillMinL: DARK_BRAND_FILL_MIN_L, enforceOnFillContrast: true, darkChromaCurve, highlight: true } as const
const worst = { l9: 999, l10: 999, d9: 999, d10: 999 }
let fixN = 0
for (let H = 0; H < 360; H += 15) for (const C of [0.04, 0.08, 0.12, 0.16, 0.20]) {
  const s = generateScale(synthHex(0.55, C, H), `fix-h${H}c${C}`, undefined, FIX_FLOOR)
  const lc = { l9: onApcaLc(s.light[8], s.onHighlightIsWhite), l10: onApcaLc(s.light[9], s.onHighlightIsWhite),
               d9: onApcaLc(s.dark[8], s.onHighlightIsWhiteDark), d10: onApcaLc(s.dark[9], s.onHighlightIsWhiteDark) }
  worst.l9 = Math.min(worst.l9, lc.l9); worst.l10 = Math.min(worst.l10, lc.l10)
  worst.d9 = Math.min(worst.d9, lc.d9); worst.d10 = Math.min(worst.d10, lc.d10)
  ok(lc.l9 >= HL_BODY, `agnostic H${H} C${C} light hl9 on-text below body-text (Lc ${lc.l9.toFixed(1)})`)
  ok(lc.l10 >= HL_BODY, `agnostic H${H} C${C} light hl10 on-text below body-text (Lc ${lc.l10.toFixed(1)})`)
  ok(lc.d9 >= HL_BODY, `agnostic H${H} C${C} dark hl9 on-text below body-text (Lc ${lc.d9.toFixed(1)})`)
  ok(lc.d10 >= HL_BODY, `agnostic H${H} C${C} dark hl10 on-text below body-text (Lc ${lc.d10.toFixed(1)})`)
  fixN++
}
console.log(`=== agnostic legibility fixture: ${fixN} hue×chroma points · body-text bar Lc ${HL_BODY} ===`)
console.log(`  worst on-highlight Lc — light hl9 ${worst.l9.toFixed(1)} hl10 ${worst.l10.toFixed(1)} | dark hl9 ${worst.d9.toFixed(1)} hl10 ${worst.d10.toFixed(1)}`)

// ── 2. Real fleet — structure (monotonic / distinct / identity) + printout ──
interface Item { name: string; hex: string; scale: GeneratedScale }
const items: Item[] = []
for (const b of BRANDS) items.push({ name: b.name, hex: b.hex, scale: resolveBrand(b.hex, b.slug, { exact: b.exact, archetypeOverride: b.archetypeOverride, style: b.style }).scale })
for (const slug of Object.keys(SECONDARIES)) {
  const b = BRANDS.find(x => x.slug === slug)!
  items.push({ name: `${slug}-secondary`, hex: SECONDARIES[slug], scale: resolveBrand(SECONDARIES[slug], `${slug} accent`, { exact: b.exact, style: b.style }).scale })
}

console.log(`\n=== highlight structure across ${items.length} brand+secondary ramps ===`)
console.log('  ramp                    H     yel | LIGHT hl9            hl10           | DARK  hl9            hl10')
for (const { name, hex, scale } of items) {
  const [l9, l10] = scale.light.slice(8, 10), [d9, d10] = scale.dark.slice(8, 10)
  if (!l9 || !l10 || !d9 || !d10) { fails.push(`${name}: missing highlight stops`); continue }
  const a8L = scale.light[7].L
  // Light scale descends, so the highlight sits below highlight-8 and its hover below it.
  ok(a8L > l9.L && l9.L > l10.L, `${name}: light not monotonic (highlight-8 ${f(a8L)} > hl9 ${f(l9.L)} > hl10 ${f(l10.L)})`)
  // Dark: hl9 (base) and hl10 (hover) are a distinct, ordered pair (hover lighter).
  ok(Math.abs(d9.L - d10.L) > 0.005, `${name}: dark hl9/hl10 not distinct (${f(d9.L)} / ${f(d10.L)})`)
  ok(scale.identityHex === hex.toUpperCase(), `${name}: identity ${scale.identityHex} != input ${hex.toUpperCase()}`)
  console.log(`  ${name.padEnd(22)} ${scale.brandH.toFixed(0).padStart(3)}   ${isYellow(scale) ? 'Y' : '·'}  | ${hx(l9)} L${f(l9.L)} w${whiteWcag(l9).toFixed(1)}  ${hx(l10)} L${f(l10.L)} | ${hx(d9)} L${f(d9.L)} w${whiteWcag(d9).toFixed(1)}  ${hx(d10)} L${f(d10.L)}`)
}

// ── 3. Neutral — low-hierarchy cta tracks stop 4 (cta) / stop 5 (hover), flips ──
const NEUTRAL_HUES = [30, 90, 143, 210, 270, 320]
const neutralByHue = NEUTRAL_HUES.map(h => ({ h, s: generateNeutralScale(h, 'default') }))
console.log(`\n=== neutral cta (tracks stop 4/5, flips) + highlight on-text — ${NEUTRAL_HUES.length} hues ===`)
for (const { h, s } of neutralByHue) {
  const ctaL = s.cta, ctaD = s.ctaDark, hovL = s.ctaHover, hovD = s.ctaHoverDark
  const hlL = s.light[8], hlD = s.dark[8]
  // cta == stop 4 and hover == stop 5, in EACH mode → it flips with the scale.
  ok(Math.abs(ctaL.L - s.light[3].L) < 0.01, `neutral h${h} cta light != stop4 (${f(ctaL.L)} vs ${f(s.light[3].L)})`)
  ok(Math.abs(ctaD.L - s.dark[3].L) < 0.01, `neutral h${h} cta dark != stop4 (${f(ctaD.L)} vs ${f(s.dark[3].L)})`)
  ok(Math.abs(hovL.L - s.light[4].L) < 0.01, `neutral h${h} ctaHover light != stop5 (${f(hovL.L)} vs ${f(s.light[4].L)})`)
  ok(Math.abs(hovD.L - s.dark[4].L) < 0.01, `neutral h${h} ctaHover dark != stop5 (${f(hovD.L)} vs ${f(s.dark[4].L)})`)
  // on-cta legible on the wash-level cta, both modes (flips black↔white with the cta)
  ok((s.onFillTextIsWhite ? whiteWcag(ctaL) : blackWcag(ctaL)) >= 4.5, `neutral h${h} on-cta light fails WCAG`)
  ok((s.onFillTextIsWhiteDark ? whiteWcag(ctaD) : blackWcag(ctaD)) >= 4.5, `neutral h${h} on-cta dark fails WCAG`)
  // highlight on-text legible at the body-text APCA bar, both modes
  ok(onApcaLc(hlL, s.onHighlightIsWhite) >= HL_BODY, `neutral h${h} light: highlight on-text below body-text (Lc ${onApcaLc(hlL, s.onHighlightIsWhite).toFixed(1)})`)
  ok(onApcaLc(hlD, s.onHighlightIsWhiteDark) >= HL_BODY, `neutral h${h} dark: highlight on-text below body-text (Lc ${onApcaLc(hlD, s.onHighlightIsWhiteDark).toFixed(1)})`)
  console.log(`  h${String(h).padStart(3)}  cta ${hx(ctaL)} L${f(ctaL.L)} / ${hx(ctaD)} L${f(ctaD.L)}  (stop4 ${f(s.light[3].L)}/${f(s.dark[3].L)})  | on-cta ${s.onFillTextIsWhite ? 'blk' : 'wht'}→${s.onFillTextIsWhiteDark ? 'blk' : 'wht'}`)
}

// ── 4. Signals — on-cta legible both modes, clean 12-stop scale ──
for (const sig of SIGNALS) {
  const s = SIGNAL_SCALES.get(sig.name)!.scale
  for (const [mode, st, pol] of [['light', s.cta, s.onFillTextIsWhite], ['dark', s.ctaDark, s.onFillTextIsWhiteDark]] as const) {
    ok((pol ? whiteWcag(st) : blackWcag(st)) >= 4.5, `signal ${sig.name} ${mode}: on-cta ${pol ? 'white' : 'black'} fails (${(pol ? whiteWcag(st) : blackWcag(st)).toFixed(2)})`)
  }
  ok(s.light.length === 12 && s.dark.length === 12, `signal ${sig.name} not a clean 12-stop scale (light ${s.light.length}, dark ${s.dark.length})`)
}

// ── 5. Blessed-snapshot regression — highlight rung (slot 9/10) + off-scale cta ──
// --bless records L,C,H per ramp (both modes) after visual approval; the default run
// diffs against it so future engine changes can't silently move these tokens. (Stops
// 1–12 are guarded separately by dark-audit.)
const SNAP_PATH = path.join(process.cwd(), 'scripts', 'highlight-snapshot.json')
const TOL = 0.015
const rungAndCta = (s: GeneratedScale) =>
  [...s.light.slice(8, 10), ...s.dark.slice(8, 10), s.cta, s.ctaHover, s.ctaDark, s.ctaHoverDark].flatMap(c => [c.L, c.C, c.H])
const snapshot = (): Record<string, number[]> => {
  const o: Record<string, number[]> = {}
  for (const { name, scale } of items) o[name] = rungAndCta(scale)
  for (const { h, s } of neutralByHue) o[`neutral-h${h}`] = rungAndCta(s)
  return o
}
if (process.argv.includes('--bless')) {
  fs.writeFileSync(SNAP_PATH, JSON.stringify(snapshot()))
  console.log(`\nblessed: highlight snapshot written to ${SNAP_PATH}`)
} else if (fs.existsSync(SNAP_PATH)) {
  const blessed: Record<string, number[]> = JSON.parse(fs.readFileSync(SNAP_PATH, 'utf8'))
  const cur = snapshot()
  const drift: string[] = []
  for (const [k, v] of Object.entries(cur)) {
    const r = blessed[k]
    if (!r) { drift.push(`${k} (new, not in snapshot)`); continue }
    for (let i = 0; i < v.length; i += 3) {
      if (Math.abs(v[i] - r[i]) > TOL) { drift.push(`${k} token ${i / 3}: ΔL ${Math.abs(v[i] - r[i]).toFixed(3)} vs blessed`); break }
    }
  }
  console.log(`\nhighlight snapshot regression: ${drift.length === 0 ? 'clean — matches blessed' : `${drift.length} drifted`}`)
  drift.slice(0, 8).forEach(s => console.log(`   ${s}`))
  if (drift.length) fails.push('highlight snapshot drift (see above)')
} else {
  console.log(`\nno blessed highlight snapshot yet — run highlight-audit:bless after visual approval`)
}

console.log()
if (fails.length) { console.error(`FAIL: ${fails.length}\n` + fails.map(s => '  - ' + s).join('\n')); process.exit(1) }
console.log('PASS — agnostic on-highlight legibility (Lc 60, hl9+hl10) · structure · neutral cta tracks stop 4/5 · signals · snapshot.')
