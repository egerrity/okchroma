// Stage 2 highlight audit — mirrors dark-audit, but for the additive tokens.
// Validates brand/secondary highlight-9/10 across the real fleet:
//   - light surface monotonic: accent-8 > hl9 > hl10; dark hover pair distinct
//   - on-highlight: COMPUTED polarity (shared ons rule), legible — the rung VALUE
//     moves until the picked side clears WCAG 4.5 (placeLegibleRung). Uniform
//     white-text in both modes now (the old dark black-flip is retired).
//   - identity === input hex
// Reports numbers first (so dark is inspectable), then PASS/FAIL.

import { BRANDS } from '../src/brands'
import { SECONDARIES } from '../src/secondaries'
import { SIGNALS } from '../src/engine/signals'
import { resolveBrand, SIGNAL_SCALES } from '../src/engine/resolve'
import { wcagY, contrastRatio } from '../src/engine/constraints'
import { YELLOW_L_LIFT } from '../src/engine/stopTable'
import { generateNeutralScale, type GeneratedScale, type ColorStop } from '../src/engine/colorEngine'
import * as fs from 'fs'
import * as path from 'path'

const f = (n: number) => n.toFixed(3)
const hx = (s: ColorStop) => {
  const c = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')
  return `#${c(s.r)}${c(s.g)}${c(s.b)}`.toUpperCase()
}
const whiteWcag = (s: ColorStop) => contrastRatio(1.0, wcagY(s.L, s.C, s.H))
const blackWcag = (s: ColorStop) => contrastRatio(wcagY(s.L, s.C, s.H), 0)
const hueDelta = (h: number, c: number) => { let d = (h - c) % 360; if (d > 180) d -= 360; if (d < -180) d += 360; return d }
const isYellow = (scale: GeneratedScale) =>
  scale.brandC >= 0.008 && Math.abs(hueDelta(scale.brandH, YELLOW_L_LIFT.centerH)) <= YELLOW_L_LIFT.sigmaDeg

const fails: string[] = []
const ok = (cond: boolean, msg: string) => { if (!cond) fails.push(msg) }

interface Item { name: string; hex: string; scale: GeneratedScale }
const items: Item[] = []
for (const b of BRANDS) items.push({ name: b.name, hex: b.hex, scale: resolveBrand(b.hex, b.slug, { exact: b.exact, archetypeOverride: b.archetypeOverride, style: b.style }).scale })
for (const slug of Object.keys(SECONDARIES)) {
  const b = BRANDS.find(x => x.slug === slug)!
  items.push({ name: `${slug}-secondary`, hex: SECONDARIES[slug], scale: resolveBrand(SECONDARIES[slug], `${slug} accent`, { exact: b.exact, style: b.style }).scale })
}

console.log(`=== highlight-1/2 across ${items.length} brand+secondary ramps ===`)
console.log(`(yellow band = within ${YELLOW_L_LIFT.sigmaDeg}° of H${YELLOW_L_LIFT.centerH}; flagged for reference — highlight holds white in light, flips to black in dark)\n`)
console.log('  ramp                    H     yel | LIGHT hl9            hl10           | DARK  hl9            hl10')
for (const { name, hex, scale } of items) {
  const el = scale.light.slice(8, 10), ed = scale.dark.slice(8, 10)  // slot 9/10 = highlight-9/10
  if (el.length < 2 || ed.length < 2) { fails.push(`${name}: missing highlight stops`); continue }
  const [l9, l10] = el, [d9, d10] = ed
  const a8L = scale.light[7].L
  const yel = isYellow(scale)

  // Light surface monotonic (the highlight is a colored chip below accent-8); the
  // (hl9,hl10) hover pair is two distinct states in BOTH modes — the old dark
  // "black-flip" (hover lightens) is retired now the highlight is uniform.
  ok(a8L > l9.L && l9.L > l10.L, `${name}: light surface not monotonic (a8 ${f(a8L)} > hl9 ${f(l9.L)} > hl10 ${f(l10.L)})`)
  ok(Math.abs(d9.L - d10.L) > 0.005, `${name}: dark highlight pair not distinct (hl9 ${f(d9.L)} hl10 ${f(d10.L)})`)

  // on-highlight polarity is COMPUTED (shared ons rule), NOT forced. The rung's
  // VALUE moves until the picked side clears WCAG (placeLegibleRung), so we assert
  // LEGIBILITY of the computed pick — uniform white-text in both modes now.
  const polL = scale.onHighlightIsWhite, polD = scale.onHighlightIsWhiteDark
  for (const [mode, s, pol] of [['light', l9, polL], ['dark', d9, polD]] as const) {
    const cr = pol ? whiteWcag(s) : blackWcag(s)
    ok(cr >= 4.5, `${name} ${mode}: on-highlight ${pol ? 'white' : 'black'} fails WCAG on hl9 (${cr.toFixed(2)}:1)`)
  }

  // identity === the exact input hex (uppercased), mode-invariant
  ok(scale.identityHex === hex.toUpperCase(), `${name}: identity ${scale.identityHex} != input ${hex.toUpperCase()}`)

  const yflag = yel ? 'Y' : '·'
  console.log(`  ${name.padEnd(22)} ${scale.brandH.toFixed(0).padStart(3)}   ${yflag}  | ${hx(l9)} L${f(l9.L)} w${whiteWcag(l9).toFixed(1)}  ${hx(l10)} L${f(l10.L)} | ${hx(d9)} L${f(d9.L)} w${whiteWcag(d9).toFixed(1)}  ${hx(d10)} L${f(d10.L)}`)
}

// ── neutral (now GENERATED per brand): the off-scale cta is the subtle near-white
// button in BOTH modes — it does not flip (the owner-accepted non-flipping cta).
// The highlight rung (scale slot 9/10) holds white like every other rung. Checked
// across representative hues. ──
const NEUTRAL_HUES = [30, 90, 143, 210, 270, 320]
const neutralByHue = NEUTRAL_HUES.map(h => ({ h, s: generateNeutralScale(h, 'default') }))
console.log(`\n=== neutral cta (off-scale) + highlight (slot 9) — default level, ${NEUTRAL_HUES.length} hues ===`)
for (const { h, s } of neutralByHue) {
  const ctaL = s.cta, ctaD = s.ctaDark         // off-scale cta-1
  const hlL = s.light[8], hlD = s.dark[8]      // slot 9 = highlight-9
  // cta = subtle near-white button, both modes (does NOT flip)
  ok(ctaL.L > 0.85, `neutral h${h} cta light not near-white (L ${f(ctaL.L)})`)
  ok(ctaD.L > 0.85, `neutral h${h} cta dark not near-white (L ${f(ctaD.L)})`)
  // on-cta passes WCAG on the near-white cta, both modes
  ok((s.onFillTextIsWhite ? whiteWcag(ctaL) : blackWcag(ctaL)) >= 4.5, `neutral h${h} on-cta light fails`)
  ok((s.onFillTextIsWhiteDark ? whiteWcag(ctaD) : blackWcag(ctaD)) >= 4.5, `neutral h${h} on-cta dark fails`)
  // highlight on-text is COMPUTED + legible, both modes (not forced white)
  ok((s.onHighlightIsWhite ? whiteWcag(hlL) : blackWcag(hlL)) >= 4.5, `neutral h${h} light: highlight on-text fails WCAG`)
  ok((s.onHighlightIsWhiteDark ? whiteWcag(hlD) : blackWcag(hlD)) >= 4.5, `neutral h${h} dark: highlight on-text fails WCAG`)
  console.log(`  h${String(h).padStart(3)}  cta ${hx(ctaL)} L${f(ctaL.L)}/${hx(ctaD)} L${f(ctaD.L)}  |  hl ${hx(hlL)} w${whiteWcag(hlL).toFixed(1)}/${hx(hlD)} w${whiteWcag(hlD).toFixed(1)}`)
}

// signals: on-cta polarity must pass on the (off-scale) cta in both modes; and a
// signal carries a clean 12-stop scale (highlight native at 9/10, cta off-scale).
for (const sig of SIGNALS) {
  const s = SIGNAL_SCALES.get(sig.name)!.scale
  for (const [mode, st, pol] of [['light', s.cta, s.onFillTextIsWhite], ['dark', s.ctaDark, s.onFillTextIsWhiteDark]] as const) {
    ok((pol ? whiteWcag(st) : blackWcag(st)) >= 4.5, `signal ${sig.name} ${mode}: on-cta ${pol ? 'white' : 'black'} fails (${(pol ? whiteWcag(st) : blackWcag(st)).toFixed(2)})`)
  }
  ok(s.light.length === 12 && s.dark.length === 12, `signal ${sig.name} should be a clean 12-stop scale (light ${s.light.length}, dark ${s.dark.length})`)
}

// ── blessed-snapshot regression for the off-scale / highlight tokens ──────────
// --bless records the highlight rung AND the off-scale cta (L,C,H per ramp, both
// modes) after visual approval; default diffs against it so future engine changes
// can't silently move these tokens. The cta lives here because it left the
// dark-audit slice(0,12) window when it moved off-scale — this is its guard now.
// (Stops 1–12 are guarded by dark-audit separately.)
const SNAP_PATH = path.join(process.cwd(), 'scripts', 'highlight-snapshot.json')
const TOL = 0.015
// rung pair (slot 9/10) + the off-scale cta pair (cta-1/cta-2), both modes.
const rungAndCta = (s: GeneratedScale) =>
  [...s.light.slice(8, 10), ...s.dark.slice(8, 10), s.cta, s.ctaHover, s.ctaDark, s.ctaHoverDark]
    .flatMap(c => [c.L, c.C, c.H])
const snapshot = (): Record<string, number[]> => {
  const o: Record<string, number[]> = {}
  for (const { name, scale } of items) o[name] = rungAndCta(scale)
  // Neutral is now per-brand-hue — snapshot each representative hue's rung+cta.
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
      if (Math.abs(v[i] - r[i]) > TOL) { drift.push(`${k} ext-stop ${i / 3}: ΔL ${Math.abs(v[i] - r[i]).toFixed(3)} vs blessed`); break }
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
console.log('PASS — highlight + identity + neutral cta + on-text polarity (brand/secondary/neutral/signals), both modes, all assertions.')
