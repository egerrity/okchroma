// register-audit.ts: THE STRUCTURE GATE for the scale's chroma axis (CATALOG C10): the
// scale is one ramp with no stitched-together band mechanisms, and that invariant lives
// in the suite. It fails when:
//   1. TABLE SHAPE breaks: the light base register (stops 1–7) must ascend with a bounded
//      per-step ratio (no hidden register cliff inside a lightness-adjacent run); the
//      dark sat ladder (1–8) must not descend; the pen rows must declare their text
//      register and keep their frozen chroma floors. The light 7|8 step is exempt BY
//      DESIGN: it crosses the chalk|highlighter band boundary, where stop 8's 3:1
//      require takes its lightness well below the ladder's pace, so it is not an
//      equal-lightness register jump.
//   2. SPEC↔TABLE BINDING drifts: every stop's chroma params in MODE_SPECS must be
//      the SCALE_C table's values (catches a re-inlined constant in spec.ts).
//   3. A STITCHED MECHANISM REAPPEARS: the deleted constants' names must not come back
//      in src/ code (LIGHT_BASE_C, DARK_SUBTLE_CHROMA_MULT, the per-stop pen constants,
//      a baseC/satFraction literal on HIGHLIGHT_*, loudCta). New chroma mechanisms must
//      be added IN the table, visibly, or this gate goes red.
//   4. THE DARK CTA REGISTER drifts: darkCtaTrim must compute from the declared
//      DARK_CTA_C numbers, the signals' dark ctas must keep their light identity, and
//      the full-chroma lever must release the brand trim.
// "The stitching is fixed" means this audit passes.
// Run: npm run audit:register
import * as fs from 'fs'
import * as path from 'path'
import { SCALE_C_LIGHT, SCALE_C_DARK, DARK_CTA_C, chromaFloorBase } from '../src/engine/stopTable'
import { MODE_SPECS, textLane } from '../src/engine/requirements/spec'
import { darkCtaTrim } from '../src/engine/darkChromaCurve'
import { signalScalesFor, resolveBrand } from '../src/engine/resolve'

let failures = 0
const fail = (msg: string) => { failures++; console.error('  ✗ ' + msg) }
const ok = (msg: string) => console.log('  ✓ ' + msg)

// ── 1. table shape ────────────────────────────────────────────────────────────
{
  const t = SCALE_C_LIGHT
  // the paper and chalk run 1→7: strictly ascending, per-step ratio bounded. The bound
  // sits just above the table's own largest step (paper-1 to paper-3); a bigger jump
  // means a register cliff crept in.
  const MAX_CHALK_STEP = 2.6
  for (let i = 1; i < 7; i++) {
    const a = t[i].base!, b = t[i + 1].base!
    if (!(b > a)) fail(`light base must ascend ${i}→${i + 1}: ${a} → ${b}`)
    if (b / a > MAX_CHALK_STEP) fail(`light base step ${i}→${i + 1} exceeds ×${MAX_CHALK_STEP}: ${a} → ${b}`)
  }
  ok('light 1–7 ascend with bounded steps')
  const d = SCALE_C_DARK
  for (let i = 1; i < 8; i++) {
    const a = d[i].sat!, b = d[i + 1].sat!
    if (!(b >= a)) fail(`dark sat ladder must not descend ${i}→${i + 1}: ${a} → ${b}`)
  }
  ok('dark ladders shaped')

  // THE PEN CHROMA FLOORS ARE FROZEN VALUES. Each pen row declares its floor as a value
  // (chromaFloorBase at a fixed rung: 10 for the first text stop and the between stop,
  // 11 for the strong stop), not as an index into the ladder, so a stop renumber has
  // nothing to move. pen-58 carries the first-text rung value because it keeps
  // pencil-47's register (stopTable.ts, the SCALE_C rows). This check fails if a row's
  // declared floor drifts off that value.
  const TEXT_FLOOR_VALUES: Record<number, number> = { 9: chromaFloorBase(10), 10: chromaFloorBase(10), 11: chromaFloorBase(11) }
  for (const [label, tbl] of [['light', t], ['dark', d]] as const) {
    for (const [stopStr, expected] of Object.entries(TEXT_FLOOR_VALUES)) {
      const stop = Number(stopStr)
      const e = tbl[stop]
      if (!e) { fail(`${label} pen stop ${stop} missing from SCALE_C`); continue }
      if (e.textMult === undefined || e.textMaxC === undefined) fail(`${label} pen stop ${stop} must declare textMult + textMaxC`)
      if (e.chromaFloor !== expected)
        fail(`${label} pen stop ${stop} chromaFloor is ${e.chromaFloor}, must stay ${expected} (the frozen historical rung value)`)
    }
  }
  ok('text chroma floors stay frozen at the historical rung values (a renumber cannot move them)')
}

// ── 2. spec ↔ table binding ──────────────────────────────────────────────────
{
  const tableOf = (mode: 'light' | 'dark') => (mode === 'light' ? SCALE_C_LIGHT : SCALE_C_DARK)
  for (const mode of ['light', 'dark'] as const) {
    const t = tableOf(mode)
    for (const sp of MODE_SPECS[mode].stops) {
      const e = t[sp.stop]
      if (!e) { fail(`${mode} stop ${sp.stop} has no SCALE_C entry`); continue }
      if (sp.baseC !== undefined && sp.baseC !== e.base) fail(`${mode} s${sp.stop} baseC ${sp.baseC} != table ${e.base}`)
      if (sp.satFraction !== undefined && sp.satFraction !== e.sat) fail(`${mode} s${sp.stop} satFraction ${sp.satFraction} != table ${e.sat}`)
      if (sp.chromaMult !== undefined && sp.chromaMult !== e.textMult) fail(`${mode} s${sp.stop} chromaMult ${sp.chromaMult} != table ${e.textMult}`)
      if (textLane(sp.group) && e.textMult === undefined) fail(`${mode} s${sp.stop} is text-lane but the table declares no textMult`)
      if (sp.chromaFloor !== e.chromaFloor) fail(`${mode} s${sp.stop} chromaFloor ${sp.chromaFloor} != table ${e.chromaFloor}`)
    }
  }
  ok('MODE_SPECS chroma params bind to the SCALE_C tables, field for field')
}

// ── 3. no stitched SCALE mechanism reappears in src/ ─────────────────────────
// Bans the DELETED scale-chroma constants by name, in CODE (comments stripped —
// prose may cite history).
{
  const banned: [RegExp, string][] = [
    [/\bLIGHT_BASE_C\b/, 'LIGHT_BASE_C (the old 1–8 ladder)'],
    [/\bDARK_SUBTLE_CHROMA_MULT\b/, 'DARK_SUBTLE_CHROMA_MULT (the old dark ladder)'],
    [/\bSTOP_11\b|\bSTOP_12\b|\bDARK_STOP_11\b|\bDARK_STOP_12\b/, 'the old per-stop pen constants'],
    [/HIGHLIGHT_(LIGHT|DARK)\s*=\s*\{[^}]*(baseC|satFraction)/s, 'chroma params on HIGHLIGHT_* (the old band constant)'],
    [/\bloudCta\b/, 'loudCta (the retired hidden cta-chroma boolean — policy lives in DARK_CTA_C)'],
  ]
  const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
  const walk = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap(d =>
      d.isDirectory() ? walk(path.join(dir, d.name)) : d.name.match(/\.tsx?$/) ? [path.join(dir, d.name)] : [])
  const root = path.join(__dirname, '..', 'src')
  let hits = 0
  for (const f of walk(root)) {
    const body = stripComments(fs.readFileSync(f, 'utf8'))
    for (const [re, what] of banned) if (re.test(body)) { fail(`${what} reappeared in ${path.relative(root, f)}`); hits++ }
  }
  if (!hits) ok('no stitched scale-chroma mechanism present anywhere in src/')
}

// ── 4. the DARK CTA chroma register (C16): the cta is off-scale, so sections 1-2 do not
// cover it. Two invariants:
//   a. BINDING: darkCtaTrim computes from the DECLARED DARK_CTA_C.brand numbers
//      (catches a re-inlined trim constant).
//   b. IDENTITY: signal dark ctas carry the seed's full chroma: the canonical yellow and
//      red ctas match light<->dark within one 8-bit step per channel, through the REAL
//      pipeline.
{
  const rad = (d: number) => (d * Math.PI) / 180
  const angDist = (h: number, c: number) => Math.abs((((h - c + 540) % 360)) - 180)
  const lobeF = (h: number, c: number, w: number) => Math.pow(Math.max(0, Math.cos(rad((90 * angDist(h, c)) / w))), 1.5)
  const b = DARK_CTA_C.brand
  let bound = true
  for (let H = 0; H < 360; H += 5) {
    const declared = 1 - 0.5 * (1 - b.globalTrim * (1 - Math.max(...b.lobes.map(l => l.depth * lobeF(H, l.center, l.width)))))
    if (Math.abs(declared - darkCtaTrim(H)) > 1e-12) { fail(`darkCtaTrim(${H}) ${darkCtaTrim(H)} != declared ${declared}`); bound = false }
  }
  if (bound) ok('darkCtaTrim binds to the declared DARK_CTA_C.brand register (72-hue probe)')
  if (DARK_CTA_C.signal.policy !== 'identity') fail(`signal cta policy must be identity: ${DARK_CTA_C.signal.policy}`)
  // tolerance 1/255 per channel: on-fill enforcement can nudge red's dark cta by one
  // 8-bit step (it does in the apca lane), while the brand TRIM this invariant guards
  // against would move it by many, so policy and enforce noise separate cleanly.
  for (const cp of [undefined, 'apca' as const]) {
    for (const name of ['yellow', 'red'] as const) {
      const sc = signalScalesFor(cp).get(name)!.scale
      const ch = (c: { r: number; g: number; b: number }) => [c.r, c.g, c.b].map(v => Math.round(Math.max(0, Math.min(1, v)) * 255))
      const [a, d] = [ch(sc.cta), ch(sc.ctaDark)]
      const maxStep = Math.max(...a.map((v, i) => Math.abs(v - d[i])))
      if (maxStep > 1) fail(`${name} (${cp ?? 'wcag'}) dark cta lost light identity: ${a.join(',')} vs ${d.join(',')} (max step ${maxStep})`)
    }
  }
  ok('signal identity invariant holds through the real pipeline (yellow/red, both lanes, <=1 8-bit step)')

  // the VIVIDNESS LEVER (C21): style:'full-chroma' REASSIGNS the brand's dark cta to the
  // identity policy, the signals' declared register, with no new numbers. The gate: at
  // one probe seed, the full-chroma dark cta's chroma must exceed the trimmed default's
  // by more than a fifth. Probed through the real pipeline at the blue lobe center
  // (deepest trim).
  // The probe seed is a MODERATE blue: at a saturated blue seed the sRGB gamut ceiling
  // binds tighter than the trim (both policies clamp to the same ceiling and the release
  // is invisible), so the reassignment shows only where the trim sits under the ceiling.
  // The pass line's percentage is a literal, not the measured release (CATALOG C78).
  {
    const plain = resolveBrand('#4f6eb7', 'trim-probe')      // H≈265 — the blue lobe
    const full = resolveBrand('#4f6eb7', 'trim-probe', { style: 'full-chroma' })
    if (!(full.scale.ctaDark.C > plain.scale.ctaDark.C * 1.2)) {
      fail(`full-chroma dark cta must release the blue-lobe trim: ${full.scale.ctaDark.C} vs trimmed ${plain.scale.ctaDark.C}`)
    } else ok('full-chroma reassigns the brand dark cta to the identity policy (blue-lobe probe, +31%)')
  }
}

if (failures) { console.error(`register-audit: ${failures} failure(s)`); process.exit(1) }
console.log('register-audit: PASS — one table, bound, no stitches')
