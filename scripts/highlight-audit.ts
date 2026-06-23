// Stage 2 highlight audit — mirrors dark-audit, but for the additive tokens.
// Validates brand/secondary highlight-1/2 (the sim covered LIGHT only; this is
// where the DARK extension gets checked) across the real fleet:
//   - monotonic surface: light accent-8 > hl9 > hl10; dark accent-8 < hl9
//   - hover guard: hl9.L > hl10.L in BOTH modes (pair never inverts)
//   - white-text holds WCAG >= 4.5 for every non-yellow hue, both modes
//   - yellow-band hues correctly keep black text (white may fail there)
//   - identity === input hex
//   - on-highlight polarity actually passes WCAG >= 4.5 on its fill, both modes
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
console.log(`(yellow band = within ${YELLOW_L_LIFT.sigmaDeg}° of H${YELLOW_L_LIFT.centerH}; those keep black text)\n`)
console.log('  ramp                    H     yel | LIGHT hl9            hl10           | DARK  hl9            hl10')
for (const { name, hex, scale } of items) {
  const el = scale.light.slice(12), ed = scale.dark.slice(12)
  if (el.length < 2 || ed.length < 2) { fails.push(`${name}: missing highlight stops`); continue }
  const [l9, l10] = el, [d9, d10] = ed
  const a8L = scale.light[7].L, a8Ld = scale.dark[7].L
  const yel = isYellow(scale)

  // monotonic + hover guard
  ok(a8L > l9.L && l9.L > l10.L, `${name}: light surface not monotonic (a8 ${f(a8L)} > hl9 ${f(l9.L)} > hl10 ${f(l10.L)})`)
  ok(a8Ld < d9.L, `${name}: dark hl9 (${f(d9.L)}) not above accent-8 (${f(a8Ld)})`)
  ok(d9.L > d10.L, `${name}: dark hover inverted (hl9 ${f(d9.L)} <= hl10 ${f(d10.L)})`)

  // white-text holds for non-yellow (both modes); yellow keeps black
  const polL = scale.onHighlightIsWhite, polD = scale.onHighlightIsWhiteDark
  ok(polL === !yel && polD === !yel, `${name}: on-highlight polarity != !isYellow`)
  for (const [mode, s, pol] of [['light', l9, polL], ['dark', d9, polD]] as const) {
    const passes = pol ? whiteWcag(s) >= 4.5 : blackWcag(s) >= 4.5
    ok(passes, `${name} ${mode}: on-highlight ${pol ? 'white' : 'black'} fails WCAG on hl9 (${pol ? whiteWcag(s).toFixed(2) : blackWcag(s).toFixed(2)}:1)`)
  }

  // identity === the exact input hex (uppercased), mode-invariant
  ok(scale.identityHex === hex.toUpperCase(), `${name}: identity ${scale.identityHex} != input ${hex.toUpperCase()}`)

  const yflag = yel ? 'Y' : '·'
  console.log(`  ${name.padEnd(22)} ${scale.brandH.toFixed(0).padStart(3)}   ${yflag}  | ${hx(l9)} L${f(l9.L)} w${whiteWcag(l9).toFixed(1)}  ${hx(l10)} L${f(l10.L)} | ${hx(d9)} L${f(d9.L)} w${whiteWcag(d9).toFixed(1)}  ${hx(d10)} L${f(d10.L)}`)
}

// ── neutral cta + universal on-text (neutral + signals) ──────────────────────
const neutral = generateNeutralScale()
const nctaL = neutral.light.slice(12)[0], nctaD = neutral.dark.slice(12)[0]
console.log(`\n=== neutral cta ===`)
console.log(`  light ${hx(nctaL)} L${f(nctaL.L)} white ${whiteWcag(nctaL).toFixed(1)}:1 | dark ${hx(nctaD)} L${f(nctaD.L)} black ${blackWcag(nctaD).toFixed(1)}:1`)
ok(nctaL.L < 0.2, `neutral cta light not near-black (L ${f(nctaL.L)})`)
ok(nctaD.L > 0.85, `neutral cta dark not near-white (L ${f(nctaD.L)})`)
ok(whiteWcag(nctaL) >= 4.5, `neutral cta light: white text fails (${whiteWcag(nctaL).toFixed(2)})`)
ok(blackWcag(nctaD) >= 4.5, `neutral cta dark: black text fails (${blackWcag(nctaD).toFixed(2)})`)
ok(nctaL.L < neutral.light[8].L, `neutral cta (${f(nctaL.L)}) not darker than highlight-1 (${f(neutral.light[8].L)})`)
// neutral on-highlight passes on the gray highlight fill (stop 9), both modes
ok((neutral.onHighlightIsWhite ? whiteWcag(neutral.light[8]) : blackWcag(neutral.light[8])) >= 4.5, `neutral on-highlight light fails on gray fill`)
ok((neutral.onHighlightIsWhiteDark ? whiteWcag(neutral.dark[8]) : blackWcag(neutral.dark[8])) >= 4.5, `neutral on-highlight dark fails on gray fill`)

// signals: on-highlight (= on-fill polarity) must pass on stop 9 both modes;
// and a signal must carry NO cta/highlight ext (the "no error button" rule).
for (const sig of SIGNALS) {
  const s = SIGNAL_SCALES.get(sig.name)!.scale
  for (const [mode, st, pol] of [['light', s.light[8], s.onFillTextIsWhite], ['dark', s.dark[8], s.onFillTextIsWhiteDark]] as const) {
    ok((pol ? whiteWcag(st) : blackWcag(st)) >= 4.5, `signal ${sig.name} ${mode}: on-highlight ${pol ? 'white' : 'black'} fails (${(pol ? whiteWcag(st) : blackWcag(st)).toFixed(2)})`)
  }
  ok(s.light.length === 12 && s.dark.length === 12, `signal ${sig.name} should carry no cta/highlight ext (light ${s.light.length}, dark ${s.dark.length})`)
}

// ── blessed-snapshot regression for the NEW tokens ───────────────────────────
// Mirrors dark-audit: --bless records highlight/cta L,C,H per ramp after visual
// approval; default diffs against it so future engine changes can't silently
// move the additive tokens. (Stops 1–12 are guarded by dark-audit separately.)
const SNAP_PATH = path.join(process.cwd(), 'scripts', 'highlight-snapshot.json')
const TOL = 0.015
const snapshot = (): Record<string, number[]> => {
  const o: Record<string, number[]> = {}
  for (const { name, scale } of items) o[name] = [...scale.light.slice(12), ...scale.dark.slice(12)].flatMap(s => [s.L, s.C, s.H])
  o['neutral'] = [...neutral.light.slice(12), ...neutral.dark.slice(12)].flatMap(s => [s.L, s.C, s.H])
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
