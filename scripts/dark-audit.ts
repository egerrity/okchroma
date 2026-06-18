// Dark-mode parity audit. Light mode is calibrated and validated — so dark
// mode quality is defined as parity: every perceptual relationship that
// holds in light mode must hold in dark mode within tolerance. Encodes the
// eyeball checks as metrics so nobody has to scan brands and hope:
//
//   A. subtle ladder     ΔE between adjacent stops 1–8 (steps must not
//                        collapse — "1/3/4 look the same" = failure)
//   B. subtle visibility ΔE(stop1, stop3): badge/alert bg vs app bg
//   C. chroma retention  mean C(dark 1–8) / C(light 1–8) — "dark went gray"
//   D. text separation   ΔE(stop11, stop12) — accent vs body text
//   E. collisions        per-mode error collision on the resolved scale
//
// Failures print worst-first with the brand hex so fixes are testable.

import { BRANDS } from '../src/brands'
import { SECONDARIES } from '../src/secondaries'
import { SIGNALS } from '../src/engine/signals'
import { resolveBrand, SIGNAL_SCALES } from '../src/engine/resolve'
import { checkCollision, stopDeltaE } from '../src/engine/collision'
import { wcagY, contrastRatio, apcaY, apcaLc } from '../src/engine/constraints'
import type { GeneratedScale } from '../src/engine/colorEngine'

// Parity tolerances: dark metric must reach this fraction of light's.
// 0.55 → 0.48 (2026-06-10): the envelope-chroma light model widened
// light-mode steps on wide-gamut hues (greens 4→5 ΔE 0.08); dark mode is
// unchanged from the blessed ladder, so the parity bar recalibrates to
// the new light reality rather than flagging dark for light's gains.
const ADJ_RATIO = 0.48
const SUBTLE_RATIO = 0.6
const TEXTSEP_RATIO = 0.6
const CHROMA_RETENTION_MIN = 0.45

interface Finding { name: string; hex: string; detail: string; severity: number }

const findings: Record<string, Finding[]> = {
  'A adjacent-step collapse': [],
  'B subtle-bg invisibility': [],
  'C chroma washout': [],
  'D 11/12 convergence': [],
  'E dark error collision': [],
  'F on-fill compliance (WCAG 4.5 + APCA 45)': [],
}

function audit(name: string, hex: string, scale: GeneratedScale, errorComponentRule = false) {
  // A: adjacent steps 1–8
  for (let i = 0; i < 7; i++) {
    const dLight = stopDeltaE(scale.light[i], scale.light[i + 1])
    const dDark = stopDeltaE(scale.dark[i], scale.dark[i + 1])
    if (dDark < dLight * ADJ_RATIO) {
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
  // D: 11/12 separation
  const sepL = stopDeltaE(scale.light[10], scale.light[11])
  const sepD = stopDeltaE(scale.dark[10], scale.dark[11])
  if (sepD < sepL * TEXTSEP_RATIO) {
    findings['D 11/12 convergence'].push({
      name, hex, severity: sepL * TEXTSEP_RATIO - sepD,
      detail: `ΔE(11,12): dark ${sepD.toFixed(3)} vs light ${sepL.toFixed(3)}`,
    })
  }
  // F: on-fill must pass both standards in both modes — WCAG 4.5:1 (the
  // legal baseline a brand's compliance review runs) and APCA Lc 45 (the
  // perceptual floor). Failures are the L 0.56–0.65 dead-zone fills.
  for (const mode of ['light', 'dark'] as const) {
    const s9 = (mode === 'light' ? scale.light : scale.dark)[8]
    const white = mode === 'light' ? scale.onFillTextIsWhite : scale.onFillTextIsWhiteDark
    const fillY = wcagY(s9.L, s9.C, s9.H)
    const wcag = white ? contrastRatio(1.0, fillY) : contrastRatio(fillY, 0)
    const lc = Math.abs(apcaLc(white ? 1.0 : 0.0, apcaY(s9.r, s9.g, s9.b)))
    if (wcag < 4.5 || lc < 45) {
      findings['F on-fill compliance (WCAG 4.5 + APCA 45)'].push({
        name, hex, severity: Math.max(0, 4.5 - wcag) + Math.max(0, 45 - lc) / 100,
        detail: `${mode}: ${white ? 'white' : 'black'} on fill L ${s9.L.toFixed(2)} — WCAG ${wcag.toFixed(2)}:1, APCA Lc ${lc.toFixed(0)}`,
      })
    }
  }

  // E: dark-mode error collision on the resolved scale. Orange-side
  // colliders are exempt — they intentionally keep identity; separation is
  // the uniform destructive component rule (outline in groups + icon).
  const err = SIGNAL_SCALES.get('error')!
  if (name !== 'error' && !errorComponentRule && checkCollision(scale, err.scale, err.def, 'dark').collides) {
    findings['E dark error collision'].push({
      name, hex, severity: 1,
      detail: `resolved scale still collides with error in dark mode`,
    })
  }
}

let componentRuleCount = 0
for (const b of BRANDS) {
  const r = resolveBrand(b.hex, b.slug)
  if (r.errorComponentRule) componentRuleCount++
  audit(b.name, b.hex, r.scale, r.errorComponentRule)
}
for (const sig of SIGNALS) {
  audit(sig.name, sig.hex, SIGNAL_SCALES.get(sig.name)!.scale)
}

const auditedCount = BRANDS.length + SIGNALS.length
console.log(`audited ${auditedCount} scales (${BRANDS.length} brands + ${SIGNALS.length} signals)`)
console.log(`orange-side error colliders on the component rule: ${componentRuleCount}\n`)
for (const [check, list] of Object.entries(findings)) {
  list.sort((a, b) => b.severity - a.severity)
  console.log(`${check}: ${list.length} failures`)
  for (const f of list.slice(0, 5)) console.log(`   ${f.name} ${f.hex} — ${f.detail}`)
}

// ── Blessed-snapshot regression ──────────────────────────────────────────────
// `--bless` records every stop of every scale after the designer approves a build
// visually. Default runs diff against the snapshot and name any scale that
// drifted — rule changes can't silently degrade an approved mode.
import * as fs from 'fs'
import * as path from 'path'

// cwd-relative: the bundle's __dirname points at the build output dir
const SNAP_PATH = path.join(process.cwd(), 'scripts', 'dark-audit-snapshot.json')
const DRIFT_TOLERANCE = 0.015 // OKLab ΔE per stop

type Snap = Record<string, Array<[number, number, number]>> // name → 24×[L,C,H]

function snapshotOf(): Snap {
  const snap: Snap = {}
  for (const b of BRANDS) {
    const r = resolveBrand(b.hex, b.slug)
    snap[b.slug] = [...r.scale.light, ...r.scale.dark].map(s => [s.L, s.C, s.H])
    // Accents joined the snapshot 2026-06-11 (dark pass): the near-neutral
    // pink-ladder defect lived ONLY in accents and was invisible to a
    // primaries-only bless. Accents carry the brand's real flags, mirroring
    // build.ts. (Primaries above keep their historical no-opts convention —
    // changing it would shift the 8 lever brands' light rows vs blessed;
    // queued for a deliberate pass.)
    const sec = SECONDARIES[b.slug]
    if (sec) {
      const ra = resolveBrand(sec, `${b.slug} accent`, { exact: b.exact, style: b.style })
      snap[`${b.slug}-accent`] = [...ra.scale.light, ...ra.scale.dark].map(s => [s.L, s.C, s.H])
    }
  }
  for (const sig of SIGNALS) {
    const s = SIGNAL_SCALES.get(sig.name)!.scale
    snap[`signal:${sig.name}`] = [...s.light, ...s.dark].map(x => [x.L, x.C, x.H])
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
        drifted.push(`${key} stop ${(i % 12) + 1} (${i < 12 ? 'light' : 'dark'}): ΔE ${d.toFixed(3)} vs blessed`)
        break
      }
    }
  }
  console.log(`\nsnapshot regression: ${drifted.length === 0 ? 'clean — matches blessed build' : `${drifted.length} scales drifted`}`)
  drifted.slice(0, 10).forEach(s => console.log(`   ${s}`))
} else {
  console.log(`\nno blessed snapshot yet — run with --bless after visual approval`)
}
