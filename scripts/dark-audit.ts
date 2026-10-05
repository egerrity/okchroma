// Dark-mode parity audit. Light mode is calibrated and validated — so dark
// mode quality is defined as parity: every perceptual relationship that
// holds in light mode must hold in dark mode within tolerance. Encodes the
// eyeball checks as metrics so nobody has to scan brands and hope:
//
//   A. subtle ladder     ΔE between adjacent stops 1–8 (steps must not
//                        collapse — "1/3/4 look the same" = failure)
//   B. subtle visibility ΔE(stop1, stop3): badge/alert bg vs app bg
//   C. chroma retention  mean C(dark 1–8) / C(light 1–8) — "dark went gray"
//   D. text separation   ΔE(stop 9, stop 10): pencil-47 against pen-58
//   E. collisions        the dark cta against the red signal's, by P2
//   F. on-cta legibility the stamp booster's bar on the chosen pole, both modes
//
// A to E are reports and F fails the run. Findings print worst-first with the
// brand hex so fixes are testable.

import { FIXTURES, FIXTURE_SECONDARIES } from './fixture'
import { SIGNALS } from '../src/engine/signals'
import { resolveBrand, signalScalesFor } from '../src/engine/resolve'
import { RED_GATE, redGateDist, checkCollision, stopDeltaE } from '../src/engine/collision'
import { p2Diff, P2_D_UP } from '../src/engine/p2'
import { wcagY, contrastRatio, apcaY, apcaLc } from '../src/engine/constraints'
import type { GeneratedScale } from '../src/engine/colorEngine'
import { MODE_SPECS } from '../src/engine/requirements/spec'
import { CRITICAL_CLEARANCE_LC } from '../src/engine/requirements/profiles'

// This audit and its blessed snapshot track the SHIPPED profile: wcag (build.ts
// SHIPPED_PROFILE).
const SHIPPED_PROFILE = 'wcag' as const
const SIGNAL_SCALES = signalScalesFor(SHIPPED_PROFILE)
// the stamp legibility booster's bar (spec ons.onFill.coEnforceLc; the critical signal rides its own)
const BOOSTER_LC = MODE_SPECS.light.ons.onFill.coEnforceLc!

// Parity tolerances: the dark metric must reach this fraction of light's.
const ADJ_RATIO = 0.48
// A step is a collapse only if it is BOTH proportionally small (< ADJ_RATIO × light's)
// AND absolutely small (< this floor, about 3 JND). The dark band is placed on its own
// ladder (the photometric dialect under the band lift, producers.deltaDarkPlace), so a
// dark step is not a fixed share of its light twin: one can fall under the ratio and
// still be a plainly visible ΔE. The floor keeps those out of the findings and still
// catches a true merge.
const STEP_ABS_FLOOR = 0.06
const SUBTLE_RATIO = 0.6
const TEXTSEP_RATIO = 0.58
const CHROMA_RETENTION_MIN = 0.45

interface Finding { name: string; hex: string; detail: string; severity: number }

const findings: Record<string, Finding[]> = {
  'A adjacent-step collapse': [],
  'B subtle-bg invisibility': [],
  'C chroma washout': [],
  'D pen 9/10 convergence': [],
  'E dark error collision': [],
  'F on-cta legibility (the stamp booster: Lc 65, critical 50 — HARD)': [],
}

function audit(name: string, hex: string, scale: GeneratedScale, redRepelled = false) {
  // A: adjacent steps 1–8
  for (let i = 0; i < 7; i++) {
    const dLight = stopDeltaE(scale.light[i], scale.light[i + 1])
    const dDark = stopDeltaE(scale.dark[i], scale.dark[i + 1])
    if (dDark < dLight * ADJ_RATIO && dDark < STEP_ABS_FLOOR) {
      findings['A adjacent-step collapse'].push({
        name, hex, severity: dLight * ADJ_RATIO - dDark,
        detail: `stops ${i + 1}→${i + 2}: dark ΔE ${dDark.toFixed(3)} vs light ${dLight.toFixed(3)}`,
      })
    }
  }
  // B: stop 3 vs stop 1
  const visL = stopDeltaE(scale.light[0], scale.light[2])
  const visD = stopDeltaE(scale.dark[0], scale.dark[2])
  if (visD < visL * SUBTLE_RATIO) {
    findings['B subtle-bg invisibility'].push({
      name, hex, severity: visL * SUBTLE_RATIO - visD,
      detail: `ΔE(1,3): dark ${visD.toFixed(3)} vs light ${visL.toFixed(3)}`,
    })
  }
  // C: chroma retention, stops 1–8 mean
  const cl = scale.light.slice(0, 8).reduce((s, x) => s + x.C, 0)
  const cd = scale.dark.slice(0, 8).reduce((s, x) => s + x.C, 0)
  const retention = cl > 0.01 ? cd / cl : 1
  if (retention < CHROMA_RETENTION_MIN) {
    findings['C chroma washout'].push({
      name, hex, severity: CHROMA_RETENTION_MIN - retention,
      detail: `dark keeps ${(retention * 100).toFixed(0)}% of light chroma (stops 1–8)`,
    })
  }
  // D: pencil-47 against pen-58, found by STOP number (the pair this reads and the
  // findings that stand on it: CATALOG C78)
  const li10 = scale.light.find(s => s.stop === 9)!, li11 = scale.light.find(s => s.stop === 10)!
  const da10 = scale.dark.find(s => s.stop === 9)!, da11 = scale.dark.find(s => s.stop === 10)!
  const sepL = stopDeltaE(li10, li11)
  const sepD = stopDeltaE(da10, da11)
  if (sepD < sepL * TEXTSEP_RATIO) {
    findings['D pen 9/10 convergence'].push({
      name, hex, severity: sepL * TEXTSEP_RATIO - sepD,
      detail: `ΔE(11,12): dark ${sepD.toFixed(3)} vs light ${sepL.toFixed(3)}`,
    })
  }
  // F: on-cta legibility, HARD. The shipped lane's law on the stamp text is the 4.5 ratio;
  // on top of it the stamp legibility BOOSTER nudges the fill until the chosen pole reads
  // the clearance bar (spec ons.onFill.coEnforceLc; the critical signal rides
  // CRITICAL_CLEARANCE_LC). This gate asserts the booster delivered, both modes; the wcag
  // ratio is printed beside it for the read.
  for (const mode of ['light', 'dark'] as const) {
    const cta = mode === 'light' ? scale.cta : scale.ctaDark  // on-fill sits on the off-scale cta
    const white = mode === 'light' ? scale.onFillTextIsWhite : scale.onFillTextIsWhiteDark
    const fillY = wcagY(cta.L, cta.C, cta.H)
    const wcag = white ? contrastRatio(1.0, fillY) : contrastRatio(fillY, 0)
    const lc = Math.abs(apcaLc(white ? 1.0 : 0.0, apcaY(cta.r, cta.g, cta.b)))
    const bar = name === 'red' ? CRITICAL_CLEARANCE_LC : BOOSTER_LC
    if (lc < bar) {
      findings['F on-cta legibility (the stamp booster: Lc 65, critical 50 — HARD)'].push({
        name, hex, severity: (bar - lc) / 100,
        detail: `${mode}: ${white ? 'white' : 'black'} on fill L ${cta.L.toFixed(2)} — APCA Lc ${lc.toFixed(1)} (wcag ratio ${wcag.toFixed(2)}:1)`,
      })
    }
  }

  // E: dark-mode red collision on the resolved scale, every brand alike (a repelled brand
  // is not exempt). The metric is P2: redGateDist is the at-a-glance category and passes
  // dark pairs that vibrate side by side. The bar is P2_D_UP against the red dark cta
  // this lane ships. The engine's own dark exit (producers.solveDarkCtaExit) releases at
  // P2_D against the APCA lane's red, so the two are not one bar (CATALOG C79).
  const err = SIGNAL_SCALES.get('red')!
  if (name !== 'red' && p2Diff(scale.ctaDark, err.scale.ctaDark) < P2_D_UP - 1e-3) {
    findings['E dark error collision'].push({
      name, hex, severity: 1,
      detail: `dark cta vibrates beside red's (p2 ${p2Diff(scale.ctaDark, err.scale.ctaDark).toFixed(3)} < ${P2_D_UP})`,
    })
  }
}

let repelCount = 0
for (const b of FIXTURES) {
  const r = resolveBrand(b.hex, b.slug, { contrastProfile: SHIPPED_PROFILE })
  if (r.redRepel) repelCount++
  audit(b.name, b.hex, r.scale, !!r.redRepel)
}
for (const sig of SIGNALS) {
  audit(sig.name, sig.hex, SIGNAL_SCALES.get(sig.name)!.scale)
}

const auditedCount = FIXTURES.length + SIGNALS.length
console.log(`audited ${auditedCount} scales (${FIXTURES.length} fixtures + ${SIGNALS.length} signals)`)
console.log(`red-repelled brand ctas: ${repelCount}\n`)
for (const [check, list] of Object.entries(findings)) {
  list.sort((a, b) => b.severity - a.severity)
  console.log(`${check}: ${list.length} failures`)
  for (const f of list.slice(0, 5)) console.log(`   ${f.name} ${f.hex} — ${f.detail}`)
  // F fails the run: a stamp whose chosen pole reads under the booster's bar exits
  // non-zero. A to E are parity reports and never do.
  if (check.includes('HARD') && list.length > 0) {
    console.log(`   GATE: FAIL — ${check}`)
    process.exitCode = 1
  }
}

// ── Blessed-snapshot regression ──────────────────────────────────────────────
// `--bless` records every stop of every scale after a build is approved by eye.
// Default runs diff against the snapshot and name any scale that drifted. The
// drift is printed, not gated: it does not move the exit code (CATALOG C79).
import * as fs from 'fs'
import * as path from 'path'

// cwd-relative: the bundle's __dirname points at the build output dir
const SNAP_PATH = path.join(process.cwd(), 'scripts', 'dark-audit-snapshot.json')
const DRIFT_TOLERANCE = 0.015 // OKLab ΔE per stop

type Snap = Record<string, Array<[number, number, number]>> // name → [L,C,H] per stop, light then dark

function snapshotOf(): Snap {
  const snap: Snap = {}
  for (const b of FIXTURES) {
    const r = resolveBrand(b.hex, b.slug, { contrastProfile: SHIPPED_PROFILE })
    snap[b.slug] = [...r.scale.light.slice(0, 12), ...r.scale.dark.slice(0, 12)].map(s => [s.L, s.C, s.H])
    // The secondaries are in the snapshot because a defect can live in a secondary
    // alone, where a primaries-only bless would not see it. A secondary carries its
    // fixture's exact and style flags. The primaries are resolved with no flags, here
    // and in the checks above: that is what the blessed rows hold, and passing the
    // flags would move the rows of the fixture that carries an archetype override
    // (CATALOG C79).
    const sec = FIXTURE_SECONDARIES[b.slug]
    if (sec) {
      const ra = resolveBrand(sec, `${b.slug} accent`, { exact: b.exact, style: b.style, contrastProfile: SHIPPED_PROFILE })
      snap[`${b.slug}-accent`] = [...ra.scale.light.slice(0, 12), ...ra.scale.dark.slice(0, 12)].map(s => [s.L, s.C, s.H])
    }
  }
  for (const sig of SIGNALS) {
    const s = SIGNAL_SCALES.get(sig.name)!.scale
    snap[`signal:${sig.name}`] = [...s.light.slice(0, 12), ...s.dark.slice(0, 12)].map(x => [x.L, x.C, x.H])
  }
  return snap
}

if (process.argv.includes('--bless')) {
  fs.writeFileSync(SNAP_PATH, JSON.stringify(snapshotOf()))
  console.log(`\nblessed: snapshot written to ${SNAP_PATH}`)
} else if (fs.existsSync(SNAP_PATH)) {
  const blessed: Snap = JSON.parse(fs.readFileSync(SNAP_PATH, 'utf8'))
  const current = snapshotOf()
  const drifted: string[] = []
  for (const [key, stops] of Object.entries(current)) {
    const ref = blessed[key]
    if (!ref) { drifted.push(`${key} (new, not in snapshot)`); continue }
    for (let i = 0; i < stops.length; i++) {
      const [L1, C1, H1] = stops[i]
      const [L2, C2, H2] = ref[i]
      const d = stopDeltaE({ L: L1, C: C1, H: H1 } as any, { L: L2, C: C2, H: H2 } as any)
      if (d > DRIFT_TOLERANCE) {
        // The label is DERIVED: each row is [...light.slice(0,12), ...dark.slice(0,12)],
        // and the 12-cap sits above the scale's stop count, so the row is split in half
        // rather than at 12. Half is correct for any stop count.
        const perMode = stops.length / 2
        drifted.push(`${key} stop ${(i % perMode) + 1} (${i < perMode ? 'light' : 'dark'}): ΔE ${d.toFixed(3)} vs blessed`)
        break
      }
    }
  }
  console.log(`\nsnapshot regression: ${drifted.length === 0 ? 'clean — matches blessed build' : `${drifted.length} scales drifted`}`)
  drifted.slice(0, 10).forEach(s => console.log(`   ${s}`))
} else {
  console.log(`\nno blessed snapshot yet — run with --bless after visual approval`)
}
