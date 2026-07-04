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
//   2. structure on the real fleet — hl9 > hl10 (fill above its hover), dark hl9/hl10
//      distinct, identity === input hex. (stop 8 and hl9 may converge in L for luminous
//      hues — they are not a border/fill pair — so their ordering is NOT asserted.)
//   2b. non-text contrast — stop 8 (highlight-8) clears WCAG 1.4.11 3:1 vs paper-2 in
//      BOTH modes, swept agnostically (worst-case hue×chroma×L is the bar).
//   3. neutral cta is LOW-HIERARCHY — it tracks the scale's own stop 4 (cta) / stop 5
//      (hover), so it FLIPS per mode (near-white wash in light, dark wash in dark) and
//      on-cta stays legible.
//   4. signal cta legible + clean 12-stop scale.
//   5. blessed-snapshot regression on the highlight rung + off-scale cta (L,C,H).

import { BRANDS } from '../src/brands'
import { SECONDARIES } from '../src/secondaries'
import { SIGNALS } from '../src/engine/signals'
import { resolveBrand, signalScalesFor } from '../src/engine/resolve'
import { wcagY, contrastRatio, apcaY, apcaLc, clampChromaToGamut, oklchToLinearRgb } from '../src/engine/constraints'
import { YELLOW_BAND, DARK_BRAND_FILL_MIN_L } from '../src/engine/stopTable'
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
// THE TRUE SPLIT (owner 2026-07-04): each profile is gated by ITS OWN law — apca lane = the
// Lc-60 body-text bar (the shipped default look); wcag lane = the chosen pole passes 4.5
// (the ratioFloor flip guarantees it; this lane asserts the guarantee holds).
const SHIPPED_PROFILE = 'apca' as const
const SIGNAL_SCALES = signalScalesFor(SHIPPED_PROFILE)
const onWcag = (s: ColorStop, white: boolean | undefined) => (white ? whiteWcag(s) : blackWcag(s))
const hueDelta = (h: number, c: number) => { let d = (h - c) % 360; if (d > 180) d -= 360; if (d < -180) d += 360; return d }
const isYellow = (scale: GeneratedScale) =>
  scale.brandC >= 0.008 && Math.abs(hueDelta(scale.brandH, YELLOW_BAND.centerH)) <= YELLOW_BAND.sigmaDeg

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
// APCA lane: the shipped default — on-highlight clears the Lc-60 body-text bar
const worst = { l9: 999, l10: 999, d9: 999, d10: 999 }
// WCAG lane: the legal mode — the CHOSEN pole passes the 4.5 ratio on hl9/hl10
const worstW = { l9: 999, l10: 999, d9: 999, d10: 999 }
let fixN = 0
for (let H = 0; H < 360; H += 15) for (const C of [0.04, 0.08, 0.12, 0.16, 0.20]) {
  const s = generateScale(synthHex(0.55, C, H), `fix-h${H}c${C}`, undefined, { ...FIX_FLOOR, contrastProfile: 'apca' })
  const lc = { l9: onApcaLc(s.light[8], s.onHighlightIsWhite), l10: onApcaLc(s.light[9], s.onHighlightIsWhite),
               d9: onApcaLc(s.dark[8], s.onHighlightIsWhiteDark), d10: onApcaLc(s.dark[9], s.onHighlightIsWhiteDark) }
  worst.l9 = Math.min(worst.l9, lc.l9); worst.l10 = Math.min(worst.l10, lc.l10)
  worst.d9 = Math.min(worst.d9, lc.d9); worst.d10 = Math.min(worst.d10, lc.d10)
  ok(lc.l9 >= HL_BODY, `agnostic H${H} C${C} apca light hl9 on-text below body-text (Lc ${lc.l9.toFixed(1)})`)
  ok(lc.l10 >= HL_BODY, `agnostic H${H} C${C} apca light hl10 on-text below body-text (Lc ${lc.l10.toFixed(1)})`)
  ok(lc.d9 >= HL_BODY, `agnostic H${H} C${C} apca dark hl9 on-text below body-text (Lc ${lc.d9.toFixed(1)})`)
  ok(lc.d10 >= HL_BODY, `agnostic H${H} C${C} apca dark hl10 on-text below body-text (Lc ${lc.d10.toFixed(1)})`)

  const w = generateScale(synthHex(0.55, C, H), `fixw-h${H}c${C}`, undefined, FIX_FLOOR)
  const wr = { l9: onWcag(w.light[8], w.onHighlightIsWhite), l10: onWcag(w.light[9], w.onHighlightIsWhite),
               d9: onWcag(w.dark[8], w.onHighlightIsWhiteDark), d10: onWcag(w.dark[9], w.onHighlightIsWhiteDark) }
  worstW.l9 = Math.min(worstW.l9, wr.l9); worstW.l10 = Math.min(worstW.l10, wr.l10)
  worstW.d9 = Math.min(worstW.d9, wr.d9); worstW.d10 = Math.min(worstW.d10, wr.d10)
  ok(wr.l9 >= 4.5, `agnostic H${H} C${C} wcag light hl9 chosen pole fails 4.5 (${wr.l9.toFixed(2)})`)
  ok(wr.l10 >= 4.5, `agnostic H${H} C${C} wcag light hl10 chosen pole fails 4.5 (${wr.l10.toFixed(2)})`)
  ok(wr.d9 >= 4.5, `agnostic H${H} C${C} wcag dark hl9 chosen pole fails 4.5 (${wr.d9.toFixed(2)})`)
  ok(wr.d10 >= 4.5, `agnostic H${H} C${C} wcag dark hl10 chosen pole fails 4.5 (${wr.d10.toFixed(2)})`)
  fixN++
}
console.log(`=== agnostic legibility fixture: ${fixN} hue×chroma points × BOTH profiles ===`)
console.log(`  apca lane (Lc ${HL_BODY} bar) worst — light hl9 ${worst.l9.toFixed(1)} hl10 ${worst.l10.toFixed(1)} | dark hl9 ${worst.d9.toFixed(1)} hl10 ${worst.d10.toFixed(1)}`)
console.log(`  wcag lane (4.5 floor) worst  — light hl9 ${worstW.l9.toFixed(2)} hl10 ${worstW.l10.toFixed(2)} | dark hl9 ${worstW.d9.toFixed(2)} hl10 ${worstW.d10.toFixed(2)}`)

// ── 1b. Agnostic non-text contrast — stop 8 (highlight-8) clears WCAG 1.4.11 3:1
// vs paper-2 (the scale's own stop 2) in BOTH modes. The bar is the worst-case
// hue×chroma×L, so clearing it clears every brand. Guards the light-ramp clamp
// from silently re-drifting (the failure this audit step was added for). ──
const NONTEXT = 3.0
const s8c = { light: 999, lAt: '', dark: 999, dAt: '' }
const vsPaper2 = (s: GeneratedScale, mode: 'light' | 'dark') => {
  const arr = mode === 'light' ? s.light : s.dark
  return contrastRatio(wcagY(arr[7].L, arr[7].C, arr[7].H), wcagY(arr[1].L, arr[1].C, arr[1].H))
}
let s8n = 0
for (let H = 0; H < 360; H += 15) for (const C of [0.04, 0.08, 0.12, 0.16, 0.20, 0.26]) for (const L of [0.45, 0.6, 0.7, 0.82]) {
  const s = generateScale(synthHex(L, C, H), `nt-h${H}c${C}l${L}`, undefined, FIX_FLOOR)
  const cl = vsPaper2(s, 'light'), cd = vsPaper2(s, 'dark')
  if (cl < s8c.light) { s8c.light = cl; s8c.lAt = `H${H} C${C} L${L}` }
  if (cd < s8c.dark) { s8c.dark = cd; s8c.dAt = `H${H} C${C} L${L}` }
  ok(cl >= NONTEXT, `agnostic H${H} C${C} L${L} light stop-8 below 3:1 vs paper-2 (${cl.toFixed(2)})`)
  ok(cd >= NONTEXT, `agnostic H${H} C${C} L${L} dark stop-8 below 3:1 vs paper-2 (${cd.toFixed(2)})`)
  s8n++
}
console.log(`=== agnostic non-text 3:1 (stop 8 vs paper-2): ${s8n} points · worst light ${s8c.light.toFixed(2)}:1 (${s8c.lAt}) · dark ${s8c.dark.toFixed(2)}:1 (${s8c.dAt}) ===`)

// ── 2. Real fleet — structure (monotonic / distinct / identity) + printout ──
interface Item { name: string; hex: string; scale: GeneratedScale }
const items: Item[] = []
for (const b of BRANDS) items.push({ name: b.name, hex: b.hex, scale: resolveBrand(b.hex, b.slug, { exact: b.exact, archetypeOverride: b.archetypeOverride, style: b.style, contrastProfile: SHIPPED_PROFILE }).scale })
for (const slug of Object.keys(SECONDARIES)) {
  const b = BRANDS.find(x => x.slug === slug)!
  items.push({ name: `${slug}-secondary`, hex: SECONDARIES[slug], scale: resolveBrand(SECONDARIES[slug], `${slug} accent`, { exact: b.exact, style: b.style, contrastProfile: SHIPPED_PROFILE }).scale })
}

console.log(`\n=== highlight structure across ${items.length} brand+secondary ramps ===`)
console.log('  ramp                    H     yel | LIGHT hl9            hl10           | DARK  hl9            hl10')
for (const { name, hex, scale } of items) {
  const [l9, l10] = scale.light.slice(8, 10), [d9, d10] = scale.dark.slice(8, 10)
  if (!l9 || !l10 || !d9 || !d10) { fails.push(`${name}: missing highlight stops`); continue }
  // hl9 (fill) sits above its hover hl10. stop 8 is the 3:1-clamped accessibility rung;
  // it may converge with hl9 in L for luminous hues (owner: they are not a border/fill
  // pair), so only the fill→hover order is asserted here.
  ok(l9.L > l10.L, `${name}: highlight not monotonic (hl9 ${f(l9.L)} > hl10 ${f(l10.L)})`)
  // Dark: hl9 (base) and hl10 (hover) are a distinct, ordered pair (hover lighter).
  ok(Math.abs(d9.L - d10.L) > 0.005, `${name}: dark hl9/hl10 not distinct (${f(d9.L)} / ${f(d10.L)})`)
  ok(scale.identityHex === hex.toUpperCase(), `${name}: identity ${scale.identityHex} != input ${hex.toUpperCase()}`)
  console.log(`  ${name.padEnd(22)} ${scale.brandH.toFixed(0).padStart(3)}   ${isYellow(scale) ? 'Y' : '·'}  | ${hx(l9)} L${f(l9.L)} w${whiteWcag(l9).toFixed(1)}  ${hx(l10)} L${f(l10.L)} | ${hx(d9)} L${f(d9.L)} w${whiteWcag(d9).toFixed(1)}  ${hx(d10)} L${f(d10.L)}`)
}

// ── 3. Neutral — low-hierarchy cta tracks stop 4 (cta) / stop 5 (hover), flips ──
const NEUTRAL_HUES = [30, 90, 143, 210, 270, 320]
// apca lane = the shipped default (structure + the Lc bar); wcag lane = the legal ratios
const neutralByHue = NEUTRAL_HUES.map(h => ({ h, s: generateNeutralScale(h, 'default', SHIPPED_PROFILE) }))
const neutralWcag = NEUTRAL_HUES.map(h => ({ h, s: generateNeutralScale(h, 'default') }))
console.log(`\n=== neutral cta (tracks stop 4/5, flips) + highlight on-text — ${NEUTRAL_HUES.length} hues × both profiles ===`)
for (const { h, s } of neutralByHue) {
  const ctaL = s.cta, ctaD = s.ctaDark, hovL = s.ctaHover, hovD = s.ctaHoverDark
  const hlL = s.light[8], hlD = s.dark[8]
  // cta == stop 4 and hover == stop 5, in EACH mode → it flips with the scale.
  ok(Math.abs(ctaL.L - s.light[3].L) < 0.01, `neutral h${h} cta light != stop4 (${f(ctaL.L)} vs ${f(s.light[3].L)})`)
  ok(Math.abs(ctaD.L - s.dark[3].L) < 0.01, `neutral h${h} cta dark != stop4 (${f(ctaD.L)} vs ${f(s.dark[3].L)})`)
  ok(Math.abs(hovL.L - s.light[4].L) < 0.01, `neutral h${h} ctaHover light != stop5 (${f(hovL.L)} vs ${f(s.light[4].L)})`)
  ok(Math.abs(hovD.L - s.dark[4].L) < 0.01, `neutral h${h} ctaHover dark != stop5 (${f(hovD.L)} vs ${f(s.dark[4].L)})`)
  // apca lane: highlight on-text at the body-text Lc bar, both modes
  ok(onApcaLc(hlL, s.onHighlightIsWhite) >= HL_BODY, `neutral h${h} apca light: highlight on-text below body-text (Lc ${onApcaLc(hlL, s.onHighlightIsWhite).toFixed(1)})`)
  ok(onApcaLc(hlD, s.onHighlightIsWhiteDark) >= HL_BODY, `neutral h${h} apca dark: highlight on-text below body-text (Lc ${onApcaLc(hlD, s.onHighlightIsWhiteDark).toFixed(1)})`)
  console.log(`  h${String(h).padStart(3)}  cta ${hx(ctaL)} L${f(ctaL.L)} / ${hx(ctaD)} L${f(ctaD.L)}  (stop4 ${f(s.light[3].L)}/${f(s.dark[3].L)})  | on-cta ${s.onFillTextIsWhite ? 'wht' : 'blk'}→${s.onFillTextIsWhiteDark ? 'wht' : 'blk'}`)
}
for (const { h, s } of neutralWcag) {
  // wcag lane: every chosen pole passes its ratio — on-cta AND on-highlight (both modes)
  ok(onWcag(s.cta, s.onFillTextIsWhite) >= 4.5, `neutral h${h} wcag on-cta light fails 4.5`)
  ok(onWcag(s.ctaDark, s.onFillTextIsWhiteDark) >= 4.5, `neutral h${h} wcag on-cta dark fails 4.5`)
  ok(onWcag(s.light[8], s.onHighlightIsWhite) >= 4.5, `neutral h${h} wcag light highlight pole fails 4.5 (${onWcag(s.light[8], s.onHighlightIsWhite).toFixed(2)})`)
  ok(onWcag(s.dark[8], s.onHighlightIsWhiteDark) >= 4.5, `neutral h${h} wcag dark highlight pole fails 4.5 (${onWcag(s.dark[8], s.onHighlightIsWhiteDark).toFixed(2)})`)
}

// ── 4. Signals — on-cta legible under each profile's own law, clean 12-stop scale ──
const SIGNALS_WCAG = signalScalesFor(undefined)
for (const sig of SIGNALS) {
  // apca lane (shipped): the enforcement guarantees the WHITE pole (Lc-75 re-solve); a black
  // pole is pole-choice-only — assert it is genuinely the better pole (green dark reads black
  // at Lc ~63, the known green-white-text follow-up — not a gate failure)
  const s = SIGNAL_SCALES.get(sig.name)!.scale
  for (const [mode, st, pol] of [['light', s.cta, s.onFillTextIsWhite], ['dark', s.ctaDark, s.onFillTextIsWhiteDark]] as const) {
    if (pol) ok(onApcaLc(st, true) >= 74, `signal ${sig.name} ${mode} apca: enforced white on-cta below Lc 74 (${onApcaLc(st, true).toFixed(1)})`)
    else ok(onApcaLc(st, false) >= onApcaLc(st, true), `signal ${sig.name} ${mode} apca: black pole chosen but white reads better`)
  }
  ok(s.light.length === 12 && s.dark.length === 12, `signal ${sig.name} not a clean 12-stop scale (light ${s.light.length}, dark ${s.dark.length})`)
  // wcag lane: the ratio law
  const w = SIGNALS_WCAG.get(sig.name)!.scale
  for (const [mode, st, pol] of [['light', w.cta, w.onFillTextIsWhite], ['dark', w.ctaDark, w.onFillTextIsWhiteDark]] as const) {
    ok((pol ? whiteWcag(st) : blackWcag(st)) >= 4.5, `signal ${sig.name} ${mode} wcag: on-cta ${pol ? 'white' : 'black'} fails (${(pol ? whiteWcag(st) : blackWcag(st)).toFixed(2)})`)
  }
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
console.log('PASS — agnostic on-highlight legibility (apca lane Lc 60 · wcag lane 4.5 floor, hl9+hl10) · structure · neutral cta tracks stop 4/5 · signals (both lanes) · snapshot (shipped=apca).')
