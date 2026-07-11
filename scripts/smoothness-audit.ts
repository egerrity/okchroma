// Smoothness / brand-fidelity harness — §3.G of the 2026-06-11 math
// interrogation handoff. gamut-sweep asserts totality + collision
// resolution; dark-audit asserts light↔dark parity vs the blessed build.
// NOTHING mechanical asserted per-ramp hue/chroma smoothness or brand-hue
// fidelity — every defect in the absolute-attractor class (near-neutral /
// low-chroma) was caught by eye, which does not scale to the input domain
// (ALL colors; the example fleet is a sample, not the domain). Three metrics, run on
// light + dark + illustration ramps over the full gamut grid:
//
//   hueStep  chroma-weighted adjacent-stop hue step: the OKLab chord of the
//            hue change alone, 2·min(C_i,C_j)·sin(|ΔH|/2). Catches
//            near-neutral-style zigzags including the derived-curve-vs-pin seam
//            (the walk runs 1→12, so 8→9→10 is included).
//   drift    brand-hue fidelity: max over stops of the hue-only chord from
//            the brand hue, 2·C_i·sin(|H_i − brandH|/2). Catches
//            low-chroma identity loss. Some drift is DESIGNED (gold-
//            spine browning, red cool rotation) — this is a budget tracked
//            against baseline, not a zero target.
//   wobble   per-stop chroma shape vs the spec ladders (subtle tier):
//            interior local minima are never spec'd anywhere; light and
//            illustration allow one interior maximum (cream peak / illus
//            rung-4 peak), dark allows none (chromaMultiplier strictly
//            rises). Catches gamut-ridge chroma wobble (suspect C) and
//            pin spikes (suspect B).
//
// Grid runs twice: style unset and style 'deeper' — the lever is engine
// surface (flag × band, any future input may carry it), so its worst case
// is part of the engine's worst case. Fleet runs with each brand's real
// flag on primary AND accent, mirroring build.ts.
//
// Default run compares against scripts/smoothness-baseline.json and
// reports regressions/improvements; --baseline (re)writes the file. The
// baseline is MECHANICAL state, not an eye-bless — it exists so candidate
// fixes are measured against the current engine, not vibed.

import {
  generateIllustrationScale,
  type GeneratedScale,
  type ColorStop,
} from '../src/engine/colorEngine'
import { clampChromaToGamut, oklchToLinearRgb } from '../src/engine/constraints'
import { resolveBrand } from '../src/engine/resolve'
import { BRANDS } from '../src/brands'
import { SECONDARIES } from '../src/secondaries'
import * as fs from 'fs'
import * as path from 'path'

function oklchToHex(L: number, C: number, H: number): string {
  const c = clampChromaToGamut(L, C, H)
  const [rl, gl, bl] = oklchToLinearRgb(L, c, H)
  const gm = (v: number) => {
    const x = Math.min(1, Math.max(0, v))
    return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055
  }
  const ch = (v: number) => Math.round(gm(v) * 255).toString(16).padStart(2, '0')
  return `#${ch(rl)}${ch(gl)}${ch(bl)}`
}

function hueDelta(h: number, center: number): number {
  let d = (h - center) % 360
  if (d > 180) d -= 360
  if (d < -180) d += 360
  return d
}

// OKLab chord length of a pure hue rotation at chroma c — the perceptual
// size of a hue change with L and C held, comparable to stopDeltaE values
// (dark-audit's drift tolerance is 0.015 per stop).
const hueChord = (c: number, dHdeg: number) =>
  2 * c * Math.sin(Math.min(180, Math.abs(dHdeg)) * (Math.PI / 360))

interface RampMetrics {
  hueStep: number
  hueStepPair: string
  hueStepDH: number
  drift: number
  driftStop: number
  driftDH: number
  wobble: number
  wobbleStop: number
}

const WOBBLE_EPS = 1e-4

function measureRamp(
  stops: ColorStop[],
  brandH: number,
  subtleN: number,
  allowedMaxima: number
): RampMetrics {
  let hueStep = 0
  let hueStepPair = ''
  let hueStepDH = 0
  for (let i = 0; i + 1 < stops.length; i++) {
    const dH = hueDelta(stops[i + 1].H, stops[i].H)
    const d = hueChord(Math.min(stops[i].C, stops[i + 1].C), dH)
    if (d > hueStep) {
      hueStep = d
      hueStepPair = `${stops[i].stop}→${stops[i + 1].stop}`
      hueStepDH = dH
    }
  }

  let drift = 0
  let driftStop = 0
  let driftDH = 0
  for (const s of stops) {
    const dH = hueDelta(s.H, brandH)
    const d = hueChord(s.C, dH)
    if (d > drift) {
      drift = d
      driftStop = s.stop
      driftDH = dH
    }
  }

  const C = stops.slice(0, subtleN).map(s => s.C)
  let wobble = 0
  let wobbleStop = 0
  const maxima: Array<{ i: number; depth: number }> = []
  for (let i = 1; i + 1 < C.length; i++) {
    if (C[i] < C[i - 1] - WOBBLE_EPS && C[i] < C[i + 1] - WOBBLE_EPS) {
      const depth = Math.min(C[i - 1] - C[i], C[i + 1] - C[i])
      if (depth > wobble) {
        wobble = depth
        wobbleStop = i + 1
      }
    }
    if (C[i] > C[i - 1] + WOBBLE_EPS && C[i] > C[i + 1] + WOBBLE_EPS)
      maxima.push({ i, depth: Math.min(C[i] - C[i - 1], C[i] - C[i + 1]) })
  }
  maxima.sort((a, b) => b.depth - a.depth)
  for (const m of maxima.slice(allowedMaxima)) {
    if (m.depth > wobble) {
      wobble = m.depth
      wobbleStop = m.i + 1
    }
  }

  return { hueStep, hueStepPair, hueStepDH, drift, driftStop, driftDH, wobble, wobbleStop }
}

type RampName = 'light' | 'dark' | 'illus'
const RAMPS: RampName[] = ['light', 'dark', 'illus']
const METRICS = ['hueStep', 'drift', 'wobble'] as const

function measureScale(scale: GeneratedScale): Record<RampName, RampMetrics> {
  return {
    light: measureRamp(scale.light.slice(0, 12), scale.brandH, 8, 1),
    dark: measureRamp(scale.dark.slice(0, 12), scale.brandH, 8, 0),
    illus: measureRamp(generateIllustrationScale(scale).stops, scale.brandH, 5, 1),
  }
}

// Reporting segments on the RAW brand hue: red band (C12 solve / ramp cool-rotation
// territory — drift there includes the DESIGNED 10.8° cool), the warm band
// the gold spine serves, everything else.
const segment = (h: number) => (h > 12 && h <= 35.5 ? 'red' : h > 35.5 && h <= 122 ? 'warm' : 'other')

interface Rec {
  key: string
  hex: string
  seg: string
  m: Record<RampName, RampMetrics>
}

const HUES = Array.from({ length: 120 }, (_, i) => i * 3)
const LIGHTNESSES = [0.25, 0.4, 0.55, 0.7, 0.85]
const CHROMAS = [0.06, 0.13, 0.2]

function sweepGrid(style: 'deeper' | undefined): Rec[] {
  const recs: Rec[] = []
  for (const H of HUES)
    for (const L of LIGHTNESSES)
      for (const C of CHROMAS) {
        const hex = oklchToHex(L, C, H)
        const r = resolveBrand(hex, 'sweep', style ? { style } : undefined)
        recs.push({ key: `${H}|${L}|${C}`, hex, seg: segment(r.scale.brandH), m: measureScale(r.scale) })
      }
  return recs
}

function sweepFleet(): Rec[] {
  const recs: Rec[] = []
  for (const b of BRANDS) {
    const opts = { exact: b.exact, archetypeOverride: b.archetypeOverride, style: b.style }
    const r = resolveBrand(b.hex, b.slug, opts)
    recs.push({ key: b.slug, hex: b.hex, seg: segment(r.scale.brandH), m: measureScale(r.scale) })
    const sec = SECONDARIES[b.slug]
    if (sec) {
      const ra = resolveBrand(sec, `${b.slug} accent`, { exact: b.exact, style: b.style })
      recs.push({ key: `${b.slug}-accent`, hex: sec, seg: segment(ra.scale.brandH), m: measureScale(ra.scale) })
    }
  }
  return recs
}

// ── Summaries ────────────────────────────────────────────────────────────────

const pct = (sorted: number[], q: number) =>
  sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1))]

function summarize(label: string, recs: Rec[]) {
  console.log(`\n── ${label} (${recs.length} colors) ${'─'.repeat(Math.max(0, 40 - label.length))}`)
  for (const ramp of RAMPS) {
    for (const metric of METRICS) {
      const vals = recs.map(r => r.m[ramp][metric] as number).sort((a, b) => a - b)
      const top = [...recs].sort((a, b) => (b.m[ramp][metric] as number) - (a.m[ramp][metric] as number)).slice(0, 5)
      const segMax: Record<string, number> = {}
      for (const r of recs) {
        const v = r.m[ramp][metric] as number
        if (!(r.seg in segMax) || v > segMax[r.seg]) segMax[r.seg] = v
      }
      const segStr = Object.entries(segMax)
        .map(([s, v]) => `${s} ${v.toFixed(4)}`)
        .join(' | ')
      console.log(
        `${ramp.padEnd(5)} ${metric.padEnd(7)} max ${pct(vals, 1).toFixed(4)}  p99 ${pct(vals, 0.99).toFixed(4)}  p50 ${pct(vals, 0.5).toFixed(4)}   seg max: ${segStr}`
      )
      for (const r of top) {
        const m = r.m[ramp]
        const where =
          metric === 'hueStep'
            ? `${m.hueStepPair} ΔH ${m.hueStepDH.toFixed(1)}°`
            : metric === 'drift'
              ? `stop ${m.driftStop} ΔH ${m.driftDH.toFixed(1)}°`
              : `stop ${m.wobbleStop}`
        console.log(`        ${r.hex} ${r.key.padEnd(14)} ${(r.m[ramp][metric] as number).toFixed(4)}  ${where}`)
      }
    }
  }
}

function printWalk(label: string, scale: GeneratedScale) {
  console.log(`\n   ${label} — brand H ${scale.brandH.toFixed(1)} C ${scale.brandC.toFixed(3)} L ${scale.brandL.toFixed(2)} (light ramp walk)`)
  for (const s of scale.light.slice(0, 12))
    console.log(
      `     ${String(s.stop).padStart(2)}: L ${s.L.toFixed(3)}  C ${s.C.toFixed(4)}  H ${s.H.toFixed(1)}  (ΔH vs brand ${hueDelta(s.H, scale.brandH).toFixed(1)}°)`
    )
}

// ── Run ──────────────────────────────────────────────────────────────────────

const gridDefault = sweepGrid(undefined)
const gridDeeper = sweepGrid('deeper')
const fleet = sweepFleet()

summarize('GRID style=default', gridDefault)
summarize('GRID style=deeper (forced flag — engine worst case)', gridDeeper)
summarize('FLEET (primaries + accents, real flags)', fleet)

// Lever brands (style='deeper') — accent fidelity.
console.log(`\n── Lever brands (style='deeper') — accents ──────────────────`)
for (const b of BRANDS.filter(x => x.style === 'deeper')) {
  const rec = fleet.find(r => r.key === `${b.slug}-accent`)
  if (!rec) continue
  const m = rec.m.light
  console.log(
    `   ${b.slug.padEnd(36)} ${rec.hex}  hueStep ${m.hueStep.toFixed(4)} @${m.hueStepPair}  drift ${m.drift.toFixed(4)} @${m.driftStop} (ΔH ${m.driftDH.toFixed(1)}°)  wobble ${m.wobble.toFixed(4)}`
  )
}

// ── Baseline write / compare ─────────────────────────────────────────────────

const BASE_PATH = path.join(process.cwd(), 'scripts', 'smoothness-baseline.json')
const COMPARE_TOL = 2e-4

type Flat = Record<string, number[]> // key → [hs,dr,wb] × light,dark,illus
const flatten = (recs: Rec[]): Flat => {
  const out: Flat = {}
  for (const r of recs)
    out[r.key] = RAMPS.flatMap(ramp =>
      METRICS.map(metric => Number((r.m[ramp][metric] as number).toFixed(4)))
    )
  return out
}

const current = {
  meta: {
    grid: `${HUES.length} hues × ${LIGHTNESSES.length} L × ${CHROMAS.length} C`,
    metrics: 'per ramp [hueStep, drift, wobble] × [light, dark, illus]',
    written: new Date().toISOString(),
  },
  grid: flatten(gridDefault),
  gridDeeper: flatten(gridDeeper),
  fleet: flatten(fleet),
}

if (process.argv.includes('--baseline')) {
  fs.writeFileSync(BASE_PATH, JSON.stringify(current))
  console.log(`\nbaseline written to ${BASE_PATH}`)
} else if (fs.existsSync(BASE_PATH)) {
  const base = JSON.parse(fs.readFileSync(BASE_PATH, 'utf8'))
  const labels = RAMPS.flatMap(r => METRICS.map(m => `${r}.${m}`))
  for (const pass of ['grid', 'gridDeeper', 'fleet'] as const) {
    let regress = 0
    let improve = 0
    const movers: Array<{ key: string; label: string; from: number; to: number }> = []
    for (const [key, vals] of Object.entries(current[pass] as Flat)) {
      const ref = (base[pass] as Flat | undefined)?.[key]
      if (!ref) continue
      vals.forEach((v, i) => {
        const d = v - ref[i]
        if (d > COMPARE_TOL) {
          regress++
          movers.push({ key, label: labels[i], from: ref[i], to: v })
        } else if (d < -COMPARE_TOL) improve++
      })
    }
    movers.sort((a, b) => b.to - b.from - (a.to - a.from))
    console.log(`\nvs baseline [${pass}]: ${regress} regressions, ${improve} improvements (tol ${COMPARE_TOL})`)
    for (const mv of movers.slice(0, 10))
      console.log(`   ${mv.key} ${mv.label}: ${mv.from.toFixed(4)} → ${mv.to.toFixed(4)}`)
  }
} else {
  console.log(`\nno baseline yet — run with --baseline to record the current engine`)
}
