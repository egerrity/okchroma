// register-audit.ts — THE STRUCTURE GATE for the scale's chroma axis (owner round
// 2026-07-09, CATALOG C10: "it shouldn't be stitched together mechanisms… how can we
// make that stick?"). This audit is the answer: the invariant lives in the suite, not
// in conversation. It fails when:
//   1. TABLE SHAPE breaks the owner's register invariant — the highlight band (8–10)
//      must share ONE declared base register (the 8|9 "starts and stops" break was a
//      second constant); the wash run (1–7) must ascend monotonically with a bounded
//      per-step ratio (no hidden register cliff inside a lightness-adjacent run). The
//      7|8 step is exempt BY DESIGN: it rides the wash|highlight family boundary and
//      its ~0.15 L drop (the re-bucket seam), not an equal-lightness register jump.
//   2. SPEC↔TABLE BINDING drifts — every stop's chroma params in MODE_SPECS must be
//      the SCALE_C table's values (catches a re-inlined constant in spec.ts).
//   3. A STITCHED MECHANISM REAPPEARS — the deleted constants' names must not come
//      back anywhere in src/ (LIGHT_BASE_C, DARK_SUBTLE_CHROMA_MULT, chromaMultiplier,
//      a baseC/satFraction literal on HIGHLIGHT_*). New chroma mechanisms must be
//      added IN the table, visibly, or this gate goes red.
// A future session claiming "the stitching is fixed" must be able to point at this
// audit passing — that is the definition of fixed (owner, 2026-07-09).
// Run: npm run audit:register
import * as fs from 'fs'
import * as path from 'path'
import { SCALE_C_LIGHT, SCALE_C_DARK } from '../src/engine/stopTable'
import { MODE_SPECS } from '../src/reqtoken/spec'

let failures = 0
const fail = (msg: string) => { failures++; console.error('  ✗ ' + msg) }
const ok = (msg: string) => console.log('  ✓ ' + msg)

// ── 1. table shape ────────────────────────────────────────────────────────────
{
  const t = SCALE_C_LIGHT
  // stop 10 deleted (owner 2026-07-09) — the highlight band is 8–9
  if (!(t[8].base === t[9].base)) {
    fail(`light highlight band 8–9 must share one base register: ${t[8].base}/${t[9].base}`)
  } else ok(`light 8–9 share one base register (${t[8].base})`)
  // wash run 1→7: strictly ascending, per-step ratio bounded (the historical ladder's
  // own max step is the bound — a bigger jump means a register cliff crept in)
  const MAX_WASH_STEP = 2.6 // paper 1→2 is ×2.5 by design (0.004→0.010); wash steps run ≤ ×1.8
  for (let i = 1; i < 7; i++) {
    const a = t[i].base!, b = t[i + 1].base!
    if (!(b > a)) fail(`light base must ascend ${i}→${i + 1}: ${a} → ${b}`)
    if (b / a > MAX_WASH_STEP) fail(`light base step ${i}→${i + 1} exceeds ×${MAX_WASH_STEP}: ${a} → ${b}`)
  }
  ok('light 1–7 ascend with bounded steps')
  const d = SCALE_C_DARK
  if (!(d[9].base === t[9].base)) fail(`dark highlight 9 must share the light base register: ${d[9].base}/${t[9].base}`)
  for (let i = 1; i < 8; i++) {
    const a = d[i].sat!, b = d[i + 1].sat!
    if (!(b >= a)) fail(`dark sat ladder must not descend ${i}→${i + 1}: ${a} → ${b}`)
  }
  ok('dark ladders shaped')
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
      if (sp.chromaMult !== undefined && sp.chromaMult !== e.inkMult) fail(`${mode} s${sp.stop} chromaMult ${sp.chromaMult} != table ${e.inkMult}`)
      if (sp.group === 'ink' && e.inkMult === undefined) fail(`${mode} s${sp.stop} is ink but the table declares no inkMult`)
    }
  }
  ok('MODE_SPECS chroma params bind to the SCALE_C tables, field for field')
}

// ── 3. no stitched SCALE mechanism reappears in src/ ─────────────────────────
// Bans the DELETED scale-chroma constants by name, in CODE (comments stripped —
// prose may cite history). The illustration palette's ILLUS_STOPS keeps its own
// declared table (a different artifact's single table — the doctrine, not a stitch).
{
  const banned: [RegExp, string][] = [
    [/\bLIGHT_BASE_C\b/, 'LIGHT_BASE_C (the old 1–8 ladder)'],
    [/\bDARK_SUBTLE_CHROMA_MULT\b/, 'DARK_SUBTLE_CHROMA_MULT (the old dark ladder)'],
    [/\bSTOP_11\b|\bSTOP_12\b|\bDARK_STOP_11\b|\bDARK_STOP_12\b/, 'the old per-stop ink constants'],
    [/HIGHLIGHT_(LIGHT|DARK)\s*=\s*\{[^}]*(baseC|satFraction)/s, 'chroma params on HIGHLIGHT_* (the old band constant)'],
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

if (failures) { console.error(`register-audit: ${failures} failure(s)`); process.exit(1) }
console.log('register-audit: PASS — one table, bound, no stitches')
