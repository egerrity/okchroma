// Emphasis-band + off-scale-cta audit. Validates the tokens around the focus ring and
// the first pen stop, plus the off-scale cta family.
//
// THE BAND COLLAPSED (owner 2026-07-29): highlight-9 and on-highlight are deleted and
// pencil-47 (ink-9 pre-Stage-B, the old ink-10) carries the emphasis fill as well as
// the first text register. The two checks that named them are REPLACED, not dropped —
// a deleted solve leaves a property that now has to be asserted instead of computed:
//
// What it gates (all code-grounded, verified against the real pipeline):
//   1. BAND ORDER + the on-emphasis guarantee, agnostic hue×chroma×L:
//      (a) pencil-47 clears crayon-26 by BAND_ORDER_MARGIN against the shared
//          paper-5 anchor, both modes. This invariant NEVER EXISTED — the ordering was
//          held by incidental spacing, which is exactly how highlight-9 drifted onto
//          ink-10 unnoticed (drift handoff 2026-07-29). Baseline at the collapse: worst
//          1.41 light / 3.18 dark.
//      (b) --paper-0 clears 4.5 against pencil-47, both modes — the property the
//          deleted on-highlight solve used to guarantee, now that semantic.css declares
//          the on-emphasis text as a paper token. Baseline: worst 4.96 light / 8.04 dark.
//   2. structure on the real fleet — identity === input hex.
//   2b. non-text contrast — stop 8 (crayon-26) clears WCAG 1.4.11 3:1 against PAPER-95
//      IN BOTH MODES (spec.ts S8 — one declaration since 2026-07-29), swept agnostically
//      (worst-case hue×chroma×L is the bar).
//   3. neutral cta is LOW-HIERARCHY — its REST tracks the scale's own stop 4, so it
//      FLIPS per mode (near-white highlighter in light, dark highlighter in dark) and on-cta stays
//      legible. DARK additionally lifts the rest to clear NEUTRAL_CTA_DARK_POP_CLEARANCE
//      vs the resolved dark paper-5 (the POP plane — owner 2026-07-27: clearance reads
//      against pop, never black). Hover/pressed ride the shared fill-state law
//      (owner 2026-07-28): ΔL = k/(nearness-to-ground+0.1) mode-mirrored, pressed 2×,
//      light darkens / dark lightens with the archetype override at the terminal bands.
//   4. signal cta legible + clean 12-stop scale.
//   5. blessed-snapshot regression on pencil-47 + off-scale cta (L,C,H).

import { FIXTURES, FIXTURE_SECONDARIES } from './fixture'
import { SIGNALS } from '../src/engine/signals'
import { resolveBrand, signalScalesFor, SOFT_ON_CTA_ALPHA } from '../src/engine/resolve'
import { wcagY, contrastRatio, apcaY, apcaLc, clampChromaToGamut, oklchToLinearRgb } from '../src/engine/constraints'
import { YELLOW_BAND, DARK_BRAND_FILL_MIN_L, NEUTRAL_CTA_DARK_POP_CLEARANCE } from '../src/engine/stopTable'
import { SCALE_STOP_COUNT } from '../src/engine/tokenNames'
import { generateNeutralScale, generateScale, type GeneratedScale, type ColorStop } from '../src/engine/colorEngine'
import { darkChromaCurve } from '../src/engine/darkChromaCurve'
import { CTA_ONFILL_ENFORCE_LC } from '../src/engine/requirements/profiles'
import { oklabDist, srgbEmitChannels } from '../src/engine/colorMath'
import { stateStepL } from '../src/engine/archetypes'
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
// engine's onTextIsWhite. HL_BODY = APCA body-text floor: the bar the emphasis fill (pencil-47) clears.
const onApcaLc = (s: ColorStop, white: boolean | undefined) => Math.abs(apcaLc(white ? 1.0 : 0.0, apcaY(s.r, s.g, s.b)))
const HL_BODY = 60
// THE TRUE SPLIT (owner 2026-07-04): each profile is gated by ITS OWN law — apca lane = the
// Lc-60 body-text bar (the shipped default look); wcag lane = the chosen pole passes 4.5
// (the ratioFloor flip guarantees it; this lane asserts the guarantee holds).
const SHIPPED_PROFILE = 'apca' as const
const SIGNAL_SCALES = signalScalesFor(SHIPPED_PROFILE)
// (onWcag DELETED 2026-08-04: its only caller was the neutral's solid-pole on-cta check, and
// the neutral now ships the SOFT pole — see softOnFill in §3, which measures the composite.
// The signals still read whiteWcag/blackWcag directly; their on-cta stays solid.)
const hueDelta = (h: number, c: number) => { let d = (h - c) % 360; if (d > 180) d -= 360; if (d < -180) d += 360; return d }
const isYellow = (scale: GeneratedScale) =>
  scale.brandC >= 0.008 && Math.abs(hueDelta(scale.brandH, YELLOW_BAND.centerH)) <= YELLOW_BAND.sigmaDeg

const fails: string[] = []
const ok = (cond: boolean, msg: string) => { if (!cond) fails.push(msg) }

// ── 1. Agnostic band order + the on-emphasis guarantee ──
// The bar is the worst-case hue, not a brand. Both checks replace solves that the
// 2026-07-29 collapse removed; see the header.
const encSrgb = (c: number) => { c = Math.min(1, Math.max(0, c)); return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055 }
const synthHex = (L: number, C: number, H: number) => {
  const [r, g, b] = oklchToLinearRgb(L, clampChromaToGamut(L, C, H), H)
  const h2 = (v: number) => Math.round(Math.max(0, Math.min(1, encSrgb(v))) * 255).toString(16).padStart(2, '0')
  return `#${h2(r)}${h2(g)}${h2(b)}`
}
const FIX_FLOOR = { darkFillMinL: DARK_BRAND_FILL_MIN_L, enforceOnFillContrast: true, darkChromaCurve } as const
// declared 2026-07-29 from the measured worst case (1.41 light / 3.18 dark), rounded
// DOWN to a round number. It is a floor on the SEPARATION, not a target for it.
const BAND_ORDER_MARGIN = 1.0
const ON_EMPHASIS_BAR = 4.5
const ratioOf = (x: ColorStop, y: ColorStop) => contrastRatio(wcagY(x.L, x.C, x.H), wcagY(y.L, y.C, y.H))
const bandWorst = { light: 999, lAt: '', dark: 999, dAt: '' }
const emphWorst = { light: 999, lAt: '', dark: 999, dAt: '' }
let bandN = 0
for (let H = 0; H < 360; H += 15) for (const C of [0.04, 0.08, 0.12, 0.16, 0.20]) for (const L of [0.45, 0.62, 0.78]) {
  for (const lane of ['wcag', 'apca'] as const) {
    const sc = generateScale(synthHex(L, C, H), `band-h${H}c${C}l${L}`, undefined,
      { ...FIX_FLOOR, contrastProfile: lane === 'apca' ? 'apca' : undefined })
    const at = `H${H} C${C} L${L} ${lane}`
    for (const mode of ['light', 'dark'] as const) {
      const arr = mode === 'light' ? sc.light : sc.dark
      const hl8 = arr[7], pencil9 = arr[8], p3 = arr[2]
      // (a) band order — both stops read against the plane they sit on
      const margin = ratioOf(pencil9, p3) - ratioOf(hl8, p3)
      if (margin < bandWorst[mode]) { bandWorst[mode] = margin; bandWorst[mode === 'light' ? 'lAt' : 'dAt'] = at }
      ok(margin >= BAND_ORDER_MARGIN,
        `agnostic ${at} ${mode}: pencil-47 clears crayon-26 by only ${margin.toFixed(2)} (< ${BAND_ORDER_MARGIN})`)
      // (b) the on-emphasis text token must read on the emphasis fill
      const p0 = mode === 'light' ? sc.paper0 : sc.paper0Dark
      if (p0) {
        const r = ratioOf(pencil9, p0)
        if (r < emphWorst[mode]) { emphWorst[mode] = r; emphWorst[mode === 'light' ? 'lAt' : 'dAt'] = at }
        ok(r >= ON_EMPHASIS_BAR,
          `agnostic ${at} ${mode}: paper-0 on pencil-47 reads ${r.toFixed(2)} (< ${ON_EMPHASIS_BAR}) — -fg-on-emphasis is unusable`)
      }
    }
    bandN++
  }
}
console.log(`=== agnostic band order + on-emphasis: ${bandN} scales (hue×chroma×L × both lanes) ===`)
console.log(`  pencil-47 over crayon-26 (vs paper-5, floor ${BAND_ORDER_MARGIN}) worst — light ${bandWorst.light.toFixed(2)} (${bandWorst.lAt}) | dark ${bandWorst.dark.toFixed(2)} (${bandWorst.dAt})`)
console.log(`  paper-0 on pencil-47 (floor ${ON_EMPHASIS_BAR}) worst        — light ${emphWorst.light.toFixed(2)} (${emphWorst.lAt}) | dark ${emphWorst.dark.toFixed(2)} (${emphWorst.dAt})`)

// ── 1b. Agnostic non-text contrast — stop 8 (crayon-26) clears WCAG 1.4.11 3:1
// against PAPER-95 IN BOTH MODES (spec.ts S8, one declaration since 2026-07-29). Owner:
// *"dark stop 8 has the same requirements as light, it is a 3:1 contrast require on
// paper 3 so inputs can be placed on any paper."* This check read paper-2 for dark until
// then, mirroring the old S8_DARK — and paper-2 is the EASIER anchor in dark (the ring
// is lighter than every paper, so the lightest paper is the hardest). It therefore could
// not have caught the thing that was actually wrong: with the 7→8 carry floor removed,
// the paper-2 rule lands the ring at 2.86 against paper-3 on all 366 ramps. The bar is
// the worst-case hue×chroma×L, so clearing it clears every brand. ──
const NONTEXT = 3.0
const s8c = { light: 999, lAt: '', dark: 999, dAt: '' }
const vsDeclaredPaper = (s: GeneratedScale, mode: 'light' | 'dark') => {
  const arr = mode === 'light' ? s.light : s.dark
  return contrastRatio(wcagY(arr[7].L, arr[7].C, arr[7].H), wcagY(arr[2].L, arr[2].C, arr[2].H))
}
let s8n = 0
for (let H = 0; H < 360; H += 15) for (const C of [0.04, 0.08, 0.12, 0.16, 0.20, 0.26]) for (const L of [0.45, 0.6, 0.7, 0.82]) {
  const s = generateScale(synthHex(L, C, H), `nt-h${H}c${C}l${L}`, undefined, FIX_FLOOR)
  const cl = vsDeclaredPaper(s, 'light'), cd = vsDeclaredPaper(s, 'dark')
  if (cl < s8c.light) { s8c.light = cl; s8c.lAt = `H${H} C${C} L${L}` }
  if (cd < s8c.dark) { s8c.dark = cd; s8c.dAt = `H${H} C${C} L${L}` }
  ok(cl >= NONTEXT, `agnostic H${H} C${C} L${L} light stop-8 below 3:1 vs paper-5 (${cl.toFixed(2)})`)
  ok(cd >= NONTEXT, `agnostic H${H} C${C} L${L} dark stop-8 below 3:1 vs paper-5 (${cd.toFixed(2)})`)
  s8n++
}
console.log(`=== agnostic non-text 3:1 (stop 8 vs paper-5, both modes): ${s8n} points · worst light ${s8c.light.toFixed(2)}:1 (${s8c.lAt}) · dark ${s8c.dark.toFixed(2)}:1 (${s8c.dAt}) ===`)

// ── 2. Real fleet — structure (identity) + printout of the emphasis fill (pencil-47) ──
interface Item { name: string; hex: string; scale: GeneratedScale }
const items: Item[] = []
for (const b of FIXTURES) items.push({ name: b.name, hex: b.hex, scale: resolveBrand(b.hex, b.slug, { exact: b.exact, archetypeOverride: b.archetypeOverride, style: b.style, contrastProfile: SHIPPED_PROFILE }).scale })
for (const slug of Object.keys(FIXTURE_SECONDARIES)) {
  const b = FIXTURES.find(x => x.slug === slug)!
  items.push({ name: `${slug}-secondary`, hex: FIXTURE_SECONDARIES[slug], scale: resolveBrand(FIXTURE_SECONDARIES[slug], `${slug} accent`, { exact: b.exact, style: b.style, contrastProfile: SHIPPED_PROFILE }).scale })
}

console.log(`\n=== emphasis-fill structure across ${items.length} brand+secondary ramps ===`)
console.log('  ramp                    H     yel | LIGHT pencil-47    | DARK  pencil-47')
for (const { name, hex, scale } of items) {
  const l9 = scale.light[8], d9 = scale.dark[8]
  if (!l9 || !d9) { fails.push(`${name}: missing pencil-47 stop`); continue }
  ok(scale.identityHex === hex.toUpperCase(), `${name}: identity ${scale.identityHex} != input ${hex.toUpperCase()}`)
  console.log(`  ${name.padEnd(22)} ${scale.brandH.toFixed(0).padStart(3)}   ${isYellow(scale) ? 'Y' : '·'}  | ${hx(l9)} L${f(l9.L)} w${whiteWcag(l9).toFixed(1)} | ${hx(d9)} L${f(d9.L)} w${whiteWcag(d9).toFixed(1)}`)
}

// ── 3. Neutral — low-hierarchy cta REST tracks the scale's own stop 4, flips per
// mode. DARK POP CLEARANCE (owner 2026-07-27): the dark rest is stop-FED then
// lifted until the cta clears NEUTRAL_CTA_DARK_POP_CLEARANCE vs the resolved
// dark paper-5 (the POP plane its buttons sit on — never black). Light stays
// exactly stop-fed (already ~1.25 vs its white pop). STATES (owner 2026-07-28,
// "same delta, every family" + the magnitude correction): hover/pressed ride the
// shared stateFillL law — ΔL = k/(nearness-to-ground+0.1) mode-mirrored, pressed
// 2×, from the (lifted) rest; light darkens, dark lightens. The gate asserts:
// rest feeding + pop clearance (minimal, never below the fed stop) + the state
// steps and directions against stateStepL itself. ──
const NEUTRAL_HUES = [30, 90, 143, 210, 270, 320]
// apca lane = the shipped default (structure + the Lc bar); wcag lane = the legal ratios
const neutralByHue = NEUTRAL_HUES.map(h => ({ h, s: generateNeutralScale(h, 'default', SHIPPED_PROFILE) }))
const neutralWcag = NEUTRAL_HUES.map(h => ({ h, s: generateNeutralScale(h, 'default') }))
console.log(`\n=== neutral cta (rest = stop 4; states ride the mirrored k/(nearness+.1) law; dark lifts to clear ${NEUTRAL_CTA_DARK_POP_CLEARANCE} vs pop) — ${NEUTRAL_HUES.length} hues × both profiles ===`)
for (const { h, s } of neutralByHue) {
  const ctaL = s.cta, ctaD = s.ctaDark, hovL = s.ctaHover, hovD = s.ctaHoverDark
  // LIGHT: rest == stop 4 (fed); states = the shared mirrored law (darken, k/(L+.1)).
  ok(Math.abs(ctaL.L - s.light[3].L) < 0.01, `neutral h${h} cta light != stop4 (${f(ctaL.L)} vs ${f(s.light[3].L)})`)
  ok(Math.abs((ctaL.L - hovL.L) - stateStepL(ctaL.L, 'light', 1)) < 1e-6, `neutral h${h} light hover step off the law (${f(ctaL.L - hovL.L)})`)
  ok(Math.abs((ctaL.L - s.ctaPressed.L) - stateStepL(ctaL.L, 'light', 2)) < 1e-6, `neutral h${h} light pressed step off the law (${f(ctaL.L - s.ctaPressed.L)})`)
  // DARK: fed + uniform pop-clearance lift — clears the bar, never sinks below
  // its fed stop, minimal (no over-lift), and the state STEPS stay the stops'.
  const p3D = s.dark[2] // paper-5 — the POP plane (generated-pop candidate retired, owner 2026-07-28)
  const popRatio = contrastRatio(wcagY(ctaD.L, ctaD.C, ctaD.H), wcagY(p3D.L, p3D.C, p3D.H))
  ok(popRatio >= NEUTRAL_CTA_DARK_POP_CLEARANCE - 0.005, `neutral h${h} cta dark below pop clearance (${popRatio.toFixed(3)} vs ${NEUTRAL_CTA_DARK_POP_CLEARANCE})`)
  ok(ctaD.L >= s.dark[3].L - 1e-6, `neutral h${h} cta dark sank below its fed stop4`)
  ok(popRatio <= NEUTRAL_CTA_DARK_POP_CLEARANCE + 0.05 || Math.abs(ctaD.L - s.dark[3].L) < 1e-6,
    `neutral h${h} cta dark over-lifted (${popRatio.toFixed(3)} — the solve must be minimal)`)
  ok(Math.abs((hovD.L - ctaD.L) - stateStepL(ctaD.L, 'dark', 1)) < 1e-6, `neutral h${h} dark hover step off the law (${f(hovD.L - ctaD.L)})`)
  ok(Math.abs((s.ctaPressedDark.L - ctaD.L) - stateStepL(ctaD.L, 'dark', 2)) < 1e-6, `neutral h${h} dark pressed step off the law (${f(s.ctaPressedDark.L - ctaD.L)})`)
  console.log(`  h${String(h).padStart(3)}  cta ${hx(ctaL)} L${f(ctaL.L)} / ${hx(ctaD)} L${f(ctaD.L)}  (stop4 ${f(s.light[3].L)}/${f(s.dark[3].L)})  | on-cta ${s.onFillTextIsWhite ? 'wht' : 'blk'}→${s.onFillTextIsWhiteDark ? 'wht' : 'blk'}`)
}
// THE SHIPPED COMPOSITE (owner 2026-08-04): the neutral's on-cta is the pole AT
// SOFT_ON_CTA_ALPHA, not the solid pole this section used to measure — the quiet-fill rule
// (see resolve.SOFT_ON_CTA_ALPHA). So the bar is judged on what the renderer actually paints:
// the pole composited over the fill, source-over in gamma-encoded sRGB, on the SHIPPED 8-bit
// pair (C44's basis — the analytic Y is not what a browser measures). And it rides EVERY
// STATE, not just rest: the alpha exists precisely so hover/pressed carry their own
// legibility, so a state that fails is the whole point of the check.
// Measured floor when this landed: worst 6.09:1 (dark pressed) / Lc 65.2 (light pressed);
// the minimum alpha holding 4.5 anywhere in the sweep is 0.633, so .75/.80 sit clear.
const srgb8 = (s: ColorStop) => {
  const { r, g, b } = srgbEmitChannels(s)
  return [r, g, b].map(v => Math.round(Math.max(0, Math.min(1, v)) * 255) / 255)
}
const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const relY = (c: number[]) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2])
const softOnFill = (fill: ColorStop, white: boolean, mode: 'light' | 'dark') => {
  const fc = srgb8(fill)
  const p = white ? 1 : 0
  const txt = fc.map(c => Math.round((SOFT_ON_CTA_ALPHA[mode] * p + (1 - SOFT_ON_CTA_ALPHA[mode]) * c) * 255) / 255)
  return contrastRatio(relY(txt), relY(fc))
}
for (const { h, s } of neutralWcag) {
  // wcag lane: the SHIPPED soft on-cta clears 4.5 on rest AND both states, both modes.
  // (The on-highlight pole checks died with the token — successor asserted agnostically in §1.)
  for (const [mode, fills] of [
    ['light', [['rest', s.cta], ['hover', s.ctaHover], ['pressed', s.ctaPressed]]],
    ['dark', [['rest', s.ctaDark], ['hover', s.ctaHoverDark], ['pressed', s.ctaPressedDark]]],
  ] as const) {
    const white = mode === 'light' ? s.onFillTextIsWhite : s.onFillTextIsWhiteDark
    for (const [state, fill] of fills) {
      const r = softOnFill(fill as ColorStop, !!white, mode)
      ok(r >= 4.5, `neutral h${h} wcag soft on-cta ${mode} ${state} fails 4.5 (${r.toFixed(2)})`)
    }
  }
}

// ── 4. Signals — on-cta legible under each profile's own law, clean 12-stop scale ──
const SIGNALS_WCAG = signalScalesFor(undefined)
for (const sig of SIGNALS) {
  // apca lane (shipped): the enforcement guarantees the WHITE pole. Bar = the DECLARED
  // CTA_ONFILL_ENFORCE_LC (owner ruling 2026-07-10: base ctas enforce to Lc 60, large-text —
  // the hardcoded 74 was the Lc-75 era's shadow), minus the same 1-Lc solve slack.
  const s = SIGNAL_SCALES.get(sig.name)!.scale
  for (const [mode, st, pol] of [['light', s.cta, s.onFillTextIsWhite], ['dark', s.ctaDark, s.onFillTextIsWhiteDark]] as const) {
    if (pol) ok(onApcaLc(st, true) >= CTA_ONFILL_ENFORCE_LC - 1, `signal ${sig.name} ${mode} apca: enforced white on-cta below Lc ${CTA_ONFILL_ENFORCE_LC - 1} (${onApcaLc(st, true).toFixed(1)})`)
    else ok(onApcaLc(st, false) >= onApcaLc(st, true), `signal ${sig.name} ${mode} apca: black pole chosen but white reads better`)
  }
  // stop count DERIVED (the gamut-sweep lesson, 2026-07-29): hardcoding it fails on
  // every seed the moment a stop lands or dies
  ok(s.light.length === SCALE_STOP_COUNT && s.dark.length === SCALE_STOP_COUNT,
    `signal ${sig.name} not a clean ${SCALE_STOP_COUNT}-stop scale (light ${s.light.length}, dark ${s.dark.length})`)
  // wcag lane: the ratio law
  const w = SIGNALS_WCAG.get(sig.name)!.scale
  for (const [mode, st, pol] of [['light', w.cta, w.onFillTextIsWhite], ['dark', w.ctaDark, w.onFillTextIsWhiteDark]] as const) {
    ok((pol ? whiteWcag(st) : blackWcag(st)) >= 4.5, `signal ${sig.name} ${mode} wcag: on-cta ${pol ? 'white' : 'black'} fails (${(pol ? whiteWcag(st) : blackWcag(st)).toFixed(2)})`)
  }
}

// ── 5. Blessed-snapshot regression — the emphasis fill (pencil-47) + off-scale cta ──
// --bless records L,C,H per ramp (both modes) after visual approval; the default run
// diffs against it so future engine changes can't silently move these tokens. The
// slot is `light[8]`/`dark[8]` — an ARRAY POSITION, which held highlight-9 before the
// collapse and holds pencil-47 after it: same index, successor token. (The rest of
// the scale is guarded separately by dark-audit.)
const SNAP_PATH = path.join(process.cwd(), 'scripts', 'band-snapshot.json')
const TOL = 0.015
const rungAndCta = (s: GeneratedScale) =>
  // the last six triples were the cta-ink fields (deleted 2026-08-12); they were pure
  // references onto pen stops 9/10/11 so the SAME VALUES are read from the arrays —
  // blessed snapshots stay byte-comparable, no re-bless
  [s.light[8], s.dark[8],
    s.cta, s.ctaHover, s.ctaPressed, s.ctaDark, s.ctaHoverDark, s.ctaPressedDark,
    s.light[8], s.light[9], s.light[10], s.dark[8], s.dark[9], s.dark[10],
  ].flatMap(c => [c.L, c.C, c.H])
// …and what each triple IS, so a drift line names the token instead of an index (2026-07-29:
// diagnosing an unblessed snapshot meant hand-decoding "token 5" back to ctaDark). Order must
// track rungAndCta above.
const RUNG_CTA_NAMES = [
  'light stop-9', 'dark stop-9',
  'cta', 'cta-hover', 'cta-pressed', 'cta-dark', 'cta-hover-dark', 'cta-pressed-dark',
  'pencil-47', 'pen-58', 'pen-70', 'pencil-47-dark', 'pen-58-dark', 'pen-70-dark',
]
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
      // full OKLab ΔE per (L,C,H) triple — the L-only compare let C/H drift ship invisibly
      // on the emphasis fill and all four cta roles (2026-07-11 hunt)
      const d = oklabDist({ L: v[i], C: v[i + 1], H: v[i + 2] }, { L: r[i], C: r[i + 1], H: r[i + 2] })
      if (d > TOL) { drift.push(`${k} ${RUNG_CTA_NAMES[i / 3] ?? `token ${i / 3}`}: ΔE ${d.toFixed(3)} vs blessed`); break }
    }
  }
  console.log(`\nhighlight snapshot regression: ${drift.length === 0 ? 'clean — matches blessed' : `${drift.length} drifted`}`)
  drift.slice(0, 8).forEach(s => console.log(`   ${s}`))
  if (drift.length) fails.push('highlight snapshot drift (see above)')
} else {
  console.log(`\nno blessed band snapshot yet — run band-audit:bless after visual approval`)
}

console.log()
if (fails.length) { console.error(`FAIL: ${fails.length}\n` + fails.map(s => '  - ' + s).join('\n')); process.exit(1) }
console.log('PASS — agnostic band order (pencil-47 over crayon-26) + on-emphasis (paper-0 on pencil-47) · stop-8 3:1 vs its declared paper · structure · neutral cta rest=stop4 + state law + the SOFT on-cta composite at 4.5 on every state · signals (both lanes) · snapshot (shipped=apca).')
