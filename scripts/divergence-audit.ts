// Divergence audit. Light mode is the calibrated reference; this instrument
// holds the DARK path to light on two properties (A, B), reports two more
// (C, D), and snapshots the full family × mode × stop L/C/H matrix as the
// regression gate.
//
//   A. chroma-curve parity   every emitted stop of a chromaCurve-bearing scale
//      (HARD)                (the neutral): light sits on the curve at its own
//                            L, dark carries its light twin's chroma.
//   B. signal hue fidelity   a red-band signal keeps its source hue in BOTH
//      (HARD)                modes. The red cool is a BRAND-only differentiator.
//   C. apparent-L wave       REPORT-ONLY: per-hue apparent-lightness spread by
//      (REPORT)              stop, light beside dark.
//   D. dark text contrast    REPORT: dark stops 8, 9 and 10 against paper-3,
//      (REPORT)              swept agnostically. Not the compliance read.
//
// Failures print with their input. `--bless` records the matrix after
// visual approval; default diffs against it so a rule change can't silently move
// a token. The bar is the AGNOSTIC hue×chroma sweep, not the brand list.

import { FIXTURES, FIXTURE_SECONDARIES } from './fixture'
import { SIGNALS } from '../src/engine/signals'
import { resolveBrand, SIGNAL_SCALES } from '../src/engine/resolve'
import { generateScale, generateNeutralScale, inRedBand, type GeneratedScale, type ColorStop, type NeutralLevel } from '../src/engine/colorEngine'
import { neutralChromaCurve } from '../src/engine/neutralCurve'
import { apparentL, grayApparentL } from '../src/engine/perceptualL'
import { darkChromaCurve } from '../src/engine/darkChromaCurve'
import { wcagY, contrastRatio, clampChromaToGamut, oklchToLinearRgb } from '../src/engine/constraints'
import { oklabDist } from '../src/engine/colorMath'
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
// The synthetic sweeps (C, D) resolve through generateScale with these options:
// resolveBrand's dark chroma curve, on-fill enforcement and dark fill floor, without its
// dark red cool, its APCA clearance or its red-band solve (CATALOG C79).
const BRAND_FLOOR = { darkChromaCurve, enforceOnFillContrast: true, darkFillMinL: DARK_BRAND_FILL_MIN_L } as const

const fails: string[] = []
const ok = (cond: boolean, msg: string) => { if (!cond) fails.push(msg) }

// ── A. chroma-curve parity (HARD): catches a curve bypass ───────────────────────
// A chromaCurve-bearing scale (the neutral) must emit the DECLARED chroma at every stop:
//   LIGHT: the curve's chroma at the stop's own L.
//   DARK: the light twin's emitted chroma, re-clamped at the dark L. The dark stops do not
//     sample the curve's dark branch: the resolver carries chroma across from light
//     (requirements/resolve.ts, the carry and the pen twin).
//
// THE DARK PREMISE IS APPROXIMATE FOR LIFTED STOPS, and this tolerance absorbs the error.
// A band stop under a lift (producers.smoothedBandLift) does not sample its same-stop
// light twin: its VIRTUAL twin sits at the SCALED depth and its chroma comes from the
// light ladder's chroma-at-depth relationship there (producers.deltaLiftChroma). So the
// gap this check measures GROWS WITH LIFT SIZE by design, and the tolerance doubles as a
// bound on how much lift is allowed. Stating the law exactly means evaluating `want`
// against the virtual twin at the scaled depth, which means reproducing deltaLiftChroma
// here; CATALOG C37 records that as not done.
const PARITY_TOL = 0.005
const NEUTRAL_HUES = [30, 90, 143, 210, 270, 320]
const LEVELS: NeutralLevel[] = ['pure', 'default', 'medium', 'branded']
const worstParity = { gap: 0, at: '' }
for (const level of LEVELS) {
  if (level === 'pure') continue // pure = 0 tint everywhere; nothing to track
  for (const h of NEUTRAL_HUES) {
    const s = generateNeutralScale(h, level)
    const curve = neutralChromaCurve(h, level)
    for (const mode of ['light', 'dark'] as const) {
      const arr = mode === 'light' ? s.light : s.dark
      for (const st of arr) {
        const lightTwin = mode === 'dark' ? s.light.find(x => x.stop === st.stop) : undefined
        const want = lightTwin
          ? clampChromaToGamut(st.L, lightTwin.C, st.H)                      // dark: carried from light
          : clampChromaToGamut(st.L, curve(st.L, mode), st.H)                // light: on-curve
        const gap = Math.abs(st.C - want)
        if (gap > worstParity.gap) { worstParity.gap = gap; worstParity.at = `${level} h${h} ${mode} stop ${st.stop}` }
        ok(gap <= PARITY_TOL, `chroma bypass: ${level} h${h} ${mode} stop ${st.stop} — emits C ${f(st.C)} vs declared ${f(want)} (gap ${f(gap)})`)
      }
    }
  }
}
console.log(`=== A. chroma-curve parity (neutral, ${LEVELS.length - 1} levels × ${NEUTRAL_HUES.length} hues) — worst gap ${f(worstParity.gap)} @ ${worstParity.at || 'none'} ===`)

// ── B. red-band signal hue fidelity (HARD): the red cool must not touch it ───
// The red cool is a BRAND-only differentiator and only acts on red-band hues
// (colorMath.inRedBand). A red-band SIGNAL must therefore keep its source hue in BOTH
// modes. Warm signals like yellow carry the gold-spine drift by design, a different
// mechanism, so they are out of this check's scope (it gates only red-band signals).
const HUE_TOL = 2.0
for (const sig of SIGNALS) {
  if (!inRedBand(sig.H)) continue
  const s = SIGNAL_SCALES.get(sig.name)!.scale
  for (const mode of ['light', 'dark'] as const) {
    const arr = mode === 'light' ? s.light : s.dark
    let maxDev = 0, atStop = 0
    for (const st of arr.slice(0, 11)) {
      const dev = Math.abs(((st.H - sig.H + 540) % 360) - 180)
      if (dev > maxDev) { maxDev = dev; atStop = st.stop }
    }
    ok(maxDev <= HUE_TOL, `red-band signal ${sig.name} ${mode}: hue drifts ${f1(maxDev)}° from source ${sig.H}° (worst stop ${atStop})`)
    console.log(`=== B. ${sig.name} signal hue fidelity ${mode}: max drift ${f1(maxDev)}° from ${sig.H}° (bar ${HUE_TOL}°) ===`)
  }
}

// ── C. apparent-lightness wave by stop (REPORT-ONLY) ──────────────────────────
// On the band (stops 1 to 7) light solves each stop's L for a hue-flat apparent (H-K)
// lightness and dark sits on the photometric ladder (placed by luminance), so dark's
// apparent lightness waves with hue. From stop 8 up the contrast requires place the
// light stops, so light waves there too; dark's stop 8 is placed by its require, and the
// dark pens are placed perceptually and stay flat. Measured on an all-vivid sweep
// (generateScale, no collision machinery). Nothing is gated. Stops 1 to 10 are read;
// stop 11 is not (CATALOG C78).
const WAVE_HUES = Array.from({ length: 24 }, (_, i) => i * 15)
const lAp = (s: ColorStop) => apparentL(s.L, s.C, s.H)
const perStop: { stop: number; light: number; dark: number }[] = []
const ctaSpread = { light: { lo: 999, hi: -999 }, dark: { lo: 999, hi: -999 } }
for (const stopN of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {   // stops 1 to 10, not 11 (see above)
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

// ── D. dark text-stop contrast (REPORT) ───────────────────────────────────────
// The worst dark ratio of stops 8, 9 and 10 against PAPER-3, swept agnostically. It is
// not the compliance read, because paper-3 is not these stops' declared anchor: stop 8
// and pencil-47 declare paper-5 and pen-58 declares chalk-20 (spec.ts S8, T9, T10);
// band-audit §1b, req:audit and audit:guarantee read those. Paper-3 is the EASIER paper
// in dark, so the rows read high. The printed labels name earlier anchors and floors,
// and pen-70 is not read (CATALOG C78).
// find by STOP number
const vsPaper3 = (arr: ColorStop[], stop: number) => {
  const st = arr.find(s => s.stop === stop)!
  const p2 = arr.find(s => s.stop === 2)!
  return contrastRatio(wcagY(st.L, st.C, st.H), wcagY(p2.L, p2.C, p2.H))
}
const dark = { s8: 999, s8at: '', s10: 999, s10at: '', s11: 999, s11at: '' }
for (let H = 0; H < 360; H += 15) for (const C of [0.04, 0.10, 0.16, 0.22]) for (const L of [0.45, 0.6, 0.7, 0.82]) {
  const s = generateScale(synthHex(L, C, H), `dc-h${H}c${C}l${L}`, undefined, BRAND_FLOOR)
  const c8 = vsPaper3(s.dark, 8), c10 = vsPaper3(s.dark, 9), c11 = vsPaper3(s.dark, 10)
  if (c8 < dark.s8) { dark.s8 = c8; dark.s8at = `H${H} C${C} L${L}` }
  if (c10 < dark.s10) { dark.s10 = c10; dark.s10at = `H${H} C${C} L${L}` }
  if (c11 < dark.s11) { dark.s11 = c11; dark.s11at = `H${H} C${C} L${L}` }
}
console.log(`\n=== D. dark text contrast vs paper-3 (agnostic worst) — REPORT ===`)
console.log(`  stop 8  worst ${dark.s8.toFixed(2)}:1 (${dark.s8at})  [floor 3.0 — but vs PAPER-95, not this plane]`)
console.log(`  pencil-47   worst ${dark.s10.toFixed(2)}:1 (${dark.s10at})  [light floor 4.5]`)
console.log(`  pen-58  worst ${dark.s11.toFixed(2)}:1 (${dark.s11at})  [light floor 7.0]`)

// ── Snapshot — full family × mode × stop L/C/H (the regression + provenance gate)
const SNAP_PATH = path.join(process.cwd(), 'scripts', 'divergence-snapshot.json')
const TOL = 0.015
const matrix = (s: GeneratedScale): number[] =>
  // thirty-four triples, the row layout the blessed snapshot holds. The last six repeat
  // pen-band stops 9, 10 and 11, which the two slices already carry; dropping the repeat
  // would change the layout and force a re-bless with no value moved.
  [...s.light.slice(0, 11), ...s.dark.slice(0, 11),
    s.cta, s.ctaHover, s.ctaPressed, s.ctaDark, s.ctaHoverDark, s.ctaPressedDark,
    s.light[8], s.light[9], s.light[10], s.dark[8], s.dark[9], s.dark[10],
  ].flatMap(c => [c.L, c.C, c.H])
function snapshotOf(): Record<string, number[]> {
  const o: Record<string, number[]> = {}
  for (const b of FIXTURES) {
    o[b.slug] = matrix(resolveBrand(b.hex, b.slug, { exact: b.exact, archetypeOverride: b.archetypeOverride, style: b.style }).scale)
    const sec = FIXTURE_SECONDARIES[b.slug]
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
      // full OKLab ΔE per (L,C,H) triple: an L/C-only compare passes a hue drift
      const d = oklabDist({ L: v[i], C: v[i + 1], H: v[i + 2] }, { L: r[i], C: r[i + 1], H: r[i + 2] })
      if (d > TOL) { drift.push(`${k} token ${i / 3}: ΔE ${d.toFixed(3)} vs blessed`); break }
    }
  }
  console.log(`\nsnapshot regression: ${drift.length === 0 ? 'clean — matches blessed' : `${drift.length} scales drifted`}`)
  drift.slice(0, 10).forEach(s => console.log(`   ${s}`))
  // drift fails the run
  if (drift.length) fails.push('divergence snapshot drift (see above)')
} else {
  console.log(`\nno blessed divergence snapshot yet — run audit:divergence:bless after visual approval`)
}

console.log()
if (fails.length) { console.error(`HARD-CHECK FAILURES: ${fails.length}\n` + fails.slice(0, 12).map(s => '  - ' + s).join('\n')); process.exit(1) }
console.log('PASS — chroma-curve parity (neutral, both modes) · red-signal hue fidelity. (C/D are report-only.)')
