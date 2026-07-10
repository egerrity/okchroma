// Divergence audit. Light mode is the calibrated reference; this instrument
// asserts the DARK path applies the same transforms light does, and snapshots
// the full family × mode × stop L/C/H matrix as the regression gate (the
// byte-identical guard for the cross-family consolidation).
//
//   A. chroma-curve parity   every emitted stop of a chromaCurve-bearing scale
//      (HARD)                (the neutral) must equal the curve at its L in BOTH
//                            modes. Catches the dark highlight 9/10 bypass — the
//                            sidecar `highlight` block skips cAt in dark.
//   B. signal hue fidelity   the red signal keeps its source hue (33.3°) in BOTH
//      (HARD)                modes. The red-cool is a BRAND-only differentiator;
//                            light wrongly cools the signal, dark is correct.
//   C. dark-L apparent wave  REPORT-ONLY: per-hue apparent-lightness spread,
//      (REPORT)              light (≈flat) vs dark (waves). The fix is a separate
//                            effort; this ships its gate.
//   D. dark text contrast    REPORT: dark stop 8/11/12 vs paper-2, both modes,
//      (REPORT)              swept agnostically. Drives the W2 decision.
//
// Failures print worst-first with the input. `--bless` records the matrix after
// visual approval; default diffs against it so a rule change can't silently move
// a token. The bar is the AGNOSTIC hue×chroma sweep, not the brand list.

import { BRANDS } from '../src/brands'
import { SECONDARIES } from '../src/secondaries'
import { SIGNALS } from '../src/engine/signals'
import { resolveBrand, SIGNAL_SCALES } from '../src/engine/resolve'
import { generateScale, generateNeutralScale, inRedBand, type GeneratedScale, type ColorStop, type NeutralLevel } from '../src/engine/colorEngine'
import { neutralChromaCurve } from '../src/engine/neutralCurve'
import { apparentL, grayApparentL } from '../src/engine/perceptualL'
import { darkChromaCurve } from '../src/engine/darkChromaCurve'
import { wcagY, contrastRatio, clampChromaToGamut, oklchToLinearRgb } from '../src/engine/constraints'
import { DARK_BRAND_FILL_MIN_L } from '../src/engine/stopTable'
import * as fs from 'fs'
import * as path from 'path'

const f = (n: number) => n.toFixed(3)
const f1 = (n: number) => n.toFixed(1)
const encSrgb = (c: number) => { c = Math.min(1, Math.max(0, c)); return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055 }
const synthHex = (L: number, C: number, H: number) => {
  const [r, g, b] = oklchToLinearRgb(L, clampChromaToGamut(L, C, H), H)
  const h2 = (v: number) => Math.round(Math.max(0, Math.min(1, encSrgb(v))) * 255).toString(16).padStart(2, '0')
  return `#${h2(r)}${h2(g)}${h2(b)}`
}
const BRAND_FLOOR = { highlight: true, darkChromaCurve, loudCta: true, enforceOnFillContrast: true, darkFillMinL: DARK_BRAND_FILL_MIN_L } as const

const fails: string[] = []
const ok = (cond: boolean, msg: string) => { if (!cond) fails.push(msg) }

// ── A. chroma-curve parity (HARD) — catches curve bypass under the delta model ────
// A chromaCurve-bearing scale (the neutral) must emit the DECLARED chroma at every stop:
//   LIGHT: the curve's chroma at the stop's own L (as always).
//   DARK (the delta model, owner 2026-07-09): surfaces 1–9 CARRY the light stop's emitted chroma
//     (re-clamped at the dark L); inks 11/12 are dark-native and stay on the curve.
const PARITY_TOL = 0.004
const NEUTRAL_HUES = [30, 90, 143, 210, 270, 320]
const LEVELS: NeutralLevel[] = ['pure', 'default', 'branded']
const worstParity = { gap: 0, at: '' }
for (const level of LEVELS) {
  if (level === 'pure') continue // pure = 0 tint everywhere; nothing to track
  for (const h of NEUTRAL_HUES) {
    const s = generateNeutralScale(h, level)
    const curve = neutralChromaCurve(h, level)
    for (const mode of ['light', 'dark'] as const) {
      const arr = mode === 'light' ? s.light : s.dark
      for (const st of arr) {
        const lightTwin = mode === 'dark' && st.stop <= 9 ? s.light.find(x => x.stop === st.stop) : undefined
        const want = lightTwin
          ? clampChromaToGamut(st.L, lightTwin.C, st.H)                      // carried surface
          : clampChromaToGamut(st.L, curve(st.L, mode), st.H)                // on-curve (light; dark inks)
        const gap = Math.abs(st.C - want)
        if (gap > worstParity.gap) { worstParity.gap = gap; worstParity.at = `${level} h${h} ${mode} stop ${st.stop}` }
        ok(gap <= PARITY_TOL, `chroma bypass: ${level} h${h} ${mode} stop ${st.stop} — emits C ${f(st.C)} vs declared ${f(want)} (gap ${f(gap)})`)
      }
    }
  }
}
console.log(`=== A. chroma-curve parity (neutral, ${LEVELS.length - 1} levels × ${NEUTRAL_HUES.length} hues) — worst gap ${f(worstParity.gap)} @ ${worstParity.at || 'none'} ===`)

// ── B. red-band signal hue fidelity (HARD) — the red-cool must not touch it ───
// The red-cool is a BRAND-only differentiator and only acts on red-band hues
// (≈12–35.5°). A red-band SIGNAL must therefore keep its source hue in BOTH modes;
// light currently cools it (~7°), dark is correct. Warm signals like yellow carry
// the gold-spine torsion by design — a different, mode-symmetric mechanism — so
// they are out of this check's scope (it gates only red-band signals).
const HUE_TOL = 2.0
for (const sig of SIGNALS) {
  if (!inRedBand(sig.H)) continue
  const s = SIGNAL_SCALES.get(sig.name)!.scale
  for (const mode of ['light', 'dark'] as const) {
    const arr = mode === 'light' ? s.light : s.dark
    let maxDev = 0, atStop = 0
    for (const st of arr.slice(0, 12)) {
      const dev = Math.abs(((st.H - sig.H + 540) % 360) - 180)
      if (dev > maxDev) { maxDev = dev; atStop = st.stop }
    }
    ok(maxDev <= HUE_TOL, `red-band signal ${sig.name} ${mode}: hue drifts ${f1(maxDev)}° from source ${sig.H}° (worst stop ${atStop})`)
    console.log(`=== B. ${sig.name} signal hue fidelity ${mode}: max drift ${f1(maxDev)}° from ${sig.H}° (bar ${HUE_TOL}°) ===`)
  }
}

// ── C. dark-L apparent-lightness wave (REPORT-ONLY) ───────────────────────────
// Light solves each stop's L so apparent (H-K) lightness is hue-flat; dark uses a
// fixed scaffold, so apparent L waves with hue. Measured on a pure all-vivid sweep
// (generateScale, no collision swaps). Reported; the fix is a separate effort.
const WAVE_HUES = Array.from({ length: 24 }, (_, i) => i * 15)
const lAp = (s: ColorStop) => apparentL(s.L, s.C, s.H)
const perStop: { stop: number; light: number; dark: number }[] = []
const ctaSpread = { light: { lo: 999, hi: -999 }, dark: { lo: 999, hi: -999 } }
for (const stopN of [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12]) {   // stop 10 deleted (owner 2026-07-09)
  const lv: number[] = [], dv: number[] = []
  for (const H of WAVE_HUES) {
    const s = generateScale(synthHex(0.62, 0.18, H), `wave-h${H}`, undefined, BRAND_FLOOR)
    lv.push(lAp(s.light.find(x => x.stop === stopN)!)); dv.push(lAp(s.dark.find(x => x.stop === stopN)!))
    if (stopN === 1) {
      const cl = lAp(s.cta), cd = lAp(s.ctaDark)
      ctaSpread.light.lo = Math.min(ctaSpread.light.lo, cl); ctaSpread.light.hi = Math.max(ctaSpread.light.hi, cl)
      ctaSpread.dark.lo = Math.min(ctaSpread.dark.lo, cd); ctaSpread.dark.hi = Math.max(ctaSpread.dark.hi, cd)
    }
  }
  perStop.push({ stop: stopN, light: Math.max(...lv) - Math.min(...lv), dark: Math.max(...dv) - Math.min(...dv) })
}
const worstDark = perStop.reduce((m, p) => Math.max(m, p.dark), 0)
console.log(`\n=== C. dark-L apparent-lightness wave (24-hue vivid sweep, CIE L*) — REPORT ONLY ===`)
console.log(`  stop |  light spread | dark spread`)
for (const p of perStop) console.log(`   ${String(p.stop).padStart(2)}  |    ${f1(p.light).padStart(5)}     |   ${f1(p.dark).padStart(5)}`)
console.log(`  CTA  |    ${f1(ctaSpread.light.hi - ctaSpread.light.lo).padStart(5)}     |   ${f1(ctaSpread.dark.hi - ctaSpread.dark.lo).padStart(5)}`)
console.log(`  worst dark vivid-stop wave ${f1(worstDark)} L*  ·  dark CTA wave ${f1(ctaSpread.dark.hi - ctaSpread.dark.lo)} L*`)

// ── D. dark text-stop contrast (REPORT) — drives the W2 decision ──────────────
// Light clamps stop 8 to 3:1, stops 11/12 to 4.5/7 (vs paper-2 = stop 2). Dark
// places them directly with no clamp. Sweep agnostically; report the worst dark
// ratio so W2 decides whether a dark clamp is needed or the scaffold already clears.
// find by STOP number — the arrays are stops 1..9,11,12 since stop 10's deletion (owner 2026-07-09)
const vsPaper2 = (arr: ColorStop[], stop: number) => {
  const st = arr.find(s => s.stop === stop)!
  const p2 = arr.find(s => s.stop === 2)!
  return contrastRatio(wcagY(st.L, st.C, st.H), wcagY(p2.L, p2.C, p2.H))
}
const dark = { s8: 999, s8at: '', s11: 999, s11at: '', s12: 999, s12at: '' }
for (let H = 0; H < 360; H += 15) for (const C of [0.04, 0.10, 0.16, 0.22]) for (const L of [0.45, 0.6, 0.7, 0.82]) {
  const s = generateScale(synthHex(L, C, H), `dc-h${H}c${C}l${L}`, undefined, BRAND_FLOOR)
  const c8 = vsPaper2(s.dark, 8), c11 = vsPaper2(s.dark, 11), c12 = vsPaper2(s.dark, 12)
  if (c8 < dark.s8) { dark.s8 = c8; dark.s8at = `H${H} C${C} L${L}` }
  if (c11 < dark.s11) { dark.s11 = c11; dark.s11at = `H${H} C${C} L${L}` }
  if (c12 < dark.s12) { dark.s12 = c12; dark.s12at = `H${H} C${C} L${L}` }
}
console.log(`\n=== D. dark text contrast vs paper-2 (agnostic worst) — REPORT ===`)
console.log(`  stop 8  worst ${dark.s8.toFixed(2)}:1 (${dark.s8at})  [light floor 3.0]`)
console.log(`  stop 11 worst ${dark.s11.toFixed(2)}:1 (${dark.s11at})  [light floor 4.5]`)
console.log(`  stop 12 worst ${dark.s12.toFixed(2)}:1 (${dark.s12at})  [light floor 7.0]`)

// ── Snapshot — full family × mode × stop L/C/H (the regression + provenance gate)
const SNAP_PATH = path.join(process.cwd(), 'scripts', 'divergence-snapshot.json')
const TOL = 0.015
const matrix = (s: GeneratedScale): number[] =>
  [...s.light.slice(0, 12), ...s.dark.slice(0, 12), s.cta, s.ctaHover, s.ctaDark, s.ctaHoverDark].flatMap(c => [c.L, c.C, c.H])
function snapshotOf(): Record<string, number[]> {
  const o: Record<string, number[]> = {}
  for (const b of BRANDS) {
    o[b.slug] = matrix(resolveBrand(b.hex, b.slug, { exact: b.exact, archetypeOverride: b.archetypeOverride, style: b.style }).scale)
    const sec = SECONDARIES[b.slug]
    if (sec) o[`${b.slug}-secondary`] = matrix(resolveBrand(sec, `${b.slug} accent`, { exact: b.exact, style: b.style }).scale)
  }
  for (const sig of SIGNALS) o[`signal:${sig.name}`] = matrix(SIGNAL_SCALES.get(sig.name)!.scale)
  for (const level of LEVELS) for (const h of NEUTRAL_HUES) o[`neutral:${level}:h${h}`] = matrix(generateNeutralScale(h, level))
  return o
}
if (process.argv.includes('--bless')) {
  fs.writeFileSync(SNAP_PATH, JSON.stringify(snapshotOf()))
  console.log(`\nblessed: divergence snapshot written to ${SNAP_PATH} (${Object.keys(snapshotOf()).length} scales)`)
} else if (fs.existsSync(SNAP_PATH)) {
  const blessed: Record<string, number[]> = JSON.parse(fs.readFileSync(SNAP_PATH, 'utf8'))
  const cur = snapshotOf()
  const drift: string[] = []
  for (const [k, v] of Object.entries(cur)) {
    const r = blessed[k]
    if (!r) { drift.push(`${k} (new, not in snapshot)`); continue }
    for (let i = 0; i < v.length; i += 3) {
      if (Math.abs(v[i] - r[i]) > TOL || Math.abs(v[i + 1] - r[i + 1]) > TOL) { drift.push(`${k} token ${i / 3}: drift vs blessed`); break }
    }
  }
  console.log(`\nsnapshot regression: ${drift.length === 0 ? 'clean — matches blessed' : `${drift.length} scales drifted`}`)
  drift.slice(0, 10).forEach(s => console.log(`   ${s}`))
} else {
  console.log(`\nno blessed divergence snapshot yet — run audit:divergence:bless after visual approval`)
}

console.log()
if (fails.length) { console.error(`HARD-CHECK FAILURES: ${fails.length}\n` + fails.slice(0, 12).map(s => '  - ' + s).join('\n')); process.exit(1) }
console.log('PASS — chroma-curve parity (neutral, both modes) · red-signal hue fidelity. (C/D are report-only.)')
