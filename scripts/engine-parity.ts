// engine-parity.ts — TRANSITIONAL byte-parity gate for the reqtoken engine replacement (plan Stage 0; deleted
// Stage 7). Runs the FROZEN legacy engine (src/engine/legacy/*, verbatim copies) next to the live engine over
// the full production surface and asserts identical output. During Stages 2–4 every mismatch = a port bug by
// definition. Gate = hex-equal on every stop/cta + boolean/decision equality; max float delta reported as info.
import { resolveBrand } from '../src/engine/resolve'
import { resolveBrand as resolveBrandLegacy } from '../src/engine/legacy/resolveLegacy'
import { generateScale, generateNeutralScale, type GeneratedScale, type ColorStop } from '../src/engine/colorEngine'
import {
  generateScale as generateScaleLegacy,
  generateNeutralScale as generateNeutralScaleLegacy,
} from '../src/engine/legacy/colorEngineLegacy'
import { BRANDS } from '../src/brands'
import { SECONDARIES } from '../src/secondaries'
import { SIGNALS } from '../src/engine/signals'
import { oklchToLinearRgb } from '../src/engine/constraints'
import { DARK_BRAND_FILL_MIN_L } from '../src/engine/stopTable'
import type { Archetype } from '../src/engine/archetypes'

const enc = (c: number) => { c = Math.max(0, Math.min(1, c)); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055 }
const oklchToHex = (L: number, C: number, H: number) => '#' + oklchToLinearRgb(L, C, H).map(c => Math.round(enc(c) * 255).toString(16).padStart(2, '0')).join('')
const stopHex = (s: ColorStop) => '#' + [s.r, s.g, s.b].map(c => Math.round(Math.max(0, Math.min(1, c)) * 255).toString(16).padStart(2, '0')).join('')

let checks = 0
let maxFloatDelta = 0
const fails: string[] = []
const eq = (label: string, a: unknown, b: unknown) => {
  checks++
  if (a !== b) fails.push(`${label}: ${a} vs ${b}`)
}
const stopEq = (label: string, a: ColorStop | undefined, b: ColorStop | undefined) => {
  if (!a || !b) { checks++; if (a !== b) fails.push(`${label}: missing stop (${!!a} vs ${!!b})`); return }
  eq(`${label} hex`, stopHex(a), stopHex(b))
  for (const k of ['L', 'C', 'H'] as const) maxFloatDelta = Math.max(maxFloatDelta, Math.abs(a[k] - b[k]))
}

function scaleEq(label: string, a: GeneratedScale, b: GeneratedScale) {
  eq(`${label} light.length`, a.light.length, b.light.length)
  eq(`${label} dark.length`, a.dark.length, b.dark.length)
  a.light.forEach((s, i) => stopEq(`${label} light[${s.stop}]`, s, b.light[i]))
  a.dark.forEach((s, i) => stopEq(`${label} dark[${s.stop}]`, s, b.dark[i]))
  stopEq(`${label} cta`, a.cta, b.cta)
  stopEq(`${label} ctaHover`, a.ctaHover, b.ctaHover)
  stopEq(`${label} ctaDark`, a.ctaDark, b.ctaDark)
  stopEq(`${label} ctaHoverDark`, a.ctaHoverDark, b.ctaHoverDark)
  eq(`${label} onFillTextIsWhite`, a.onFillTextIsWhite, b.onFillTextIsWhite)
  eq(`${label} onFillTextIsWhiteDark`, a.onFillTextIsWhiteDark, b.onFillTextIsWhiteDark)
  eq(`${label} onHighlightIsWhite`, a.onHighlightIsWhite, b.onHighlightIsWhite)
  eq(`${label} onHighlightIsWhiteDark`, a.onHighlightIsWhiteDark, b.onHighlightIsWhiteDark)
  eq(`${label} archetype`, a.archetype, b.archetype)
  eq(`${label} identityHex`, a.identityHex, b.identityHex)
}

function resolvedEq(label: string, hex: string, opts?: Parameters<typeof resolveBrand>[2]) {
  const a = resolveBrand(hex, label, opts)
  const b = resolveBrandLegacy(hex, label, opts)
  scaleEq(label, a.scale, b.scale)
  // DECISION parity — collision machinery must flip identically (risk #2)
  eq(`${label} rung1`, a.rung1, b.rung1)
  eq(`${label} darkCollider`, a.darkCollider, b.darkCollider)
  eq(`${label} warningVariant`, a.warningVariant, b.warningVariant)
  eq(`${label} errorComponentRule`, a.errorComponentRule, b.errorComponentRule)
  eq(`${label} pending`, a.pending.join(','), b.pending.join(','))
  eq(`${label} overrides`, a.signalOverrides.map(o => `${o.name}:${o.note}`).join('|'), b.signalOverrides.map(o => `${o.name}:${o.note}`).join('|'))
  a.signalOverrides.forEach((o, i) => { if (b.signalOverrides[i]) scaleEq(`${label} override.${o.name}`, o.scale, b.signalOverrides[i].scale) })
}

// ---- 1. production path: every brand, secondary, signal through resolveBrand (default + exact) ----
for (const brand of BRANDS) {
  resolvedEq(`brand:${brand.slug}`, brand.hex, brand.style ? { style: brand.style } : undefined)
  resolvedEq(`brand:${brand.slug}:exact`, brand.hex, { exact: true })
}
for (const [slug, hex] of Object.entries(SECONDARIES)) resolvedEq(`secondary:${slug}`, hex)
for (const sig of SIGNALS) resolvedEq(`signalseed:${sig.name}`, sig.hex)

// ---- 2. agnostic sweep + edge seeds through resolveBrand ----
const HUES = Array.from({ length: 24 }, (_, i) => i * 15)
for (const H of HUES) for (const C of [0.06, 0.13, 0.2]) resolvedEq(`sweep:H${H}C${C}`, oklchToHex(0.62, C, H))
for (const hex of ['#c8a018', '#2255cc', '#d94f1e', '#8a8a8a', '#111111', '#f5f0e8']) resolvedEq(`edge:${hex}`, hex)

// ---- 3. generateScale opts matrix (levers resolveBrand doesn't exercise per seed) ----
const OPT_SEEDS = ['#3060c0', '#c8a018', '#d55948', '#8a8a8a']
const ARCHETYPES: Archetype[] = ['near-black', 'dark', 'rich', 'vivid', 'bright', 'light']
const OPT_CASES: [string, NonNullable<Parameters<typeof generateScale>[3]>][] = [
  ['plain', {}],
  ['highlight', { highlight: true }],
  ['enforce', { enforceOnFillContrast: true, highlight: true }],
  ['deeper', { style: 'deeper', highlight: true }],
  ['full-chroma', { style: 'full-chroma' }],
  ['suppressRedCool', { suppressRedCool: true }],
  ['coolRedDark', { coolRedDark: true }],
  ['loudCta', { loudCta: true }],
  ['darkFillMinL', { darkFillMinL: DARK_BRAND_FILL_MIN_L }],
  ['muted-collider', { darkColliderFill: 'muted' }],
  ['deepens', { stop11DeepenL: 0.07, stop12DeepenL: 0.05 }],
  ['hueShift', { hueShiftDeg: 15 }],
  ['chromaScale', { chromaScale: 0.9, subtleChromaScale: 0.8 }],
]
for (const hex of OPT_SEEDS) {
  for (const [name, opts] of OPT_CASES)
    scaleEq(`gs:${hex}:${name}`, generateScale(hex, name, undefined, opts), generateScaleLegacy(hex, name, undefined, opts))
  for (const arch of ARCHETYPES)
    scaleEq(`gs:${hex}:arch=${arch}`, generateScale(hex, arch, arch, {}), generateScaleLegacy(hex, arch, arch, {}))
}

// ---- 4. neutral path ----
for (const h of [0, 92, 245, 330]) for (const level of ['pure', 'default', 'branded'] as const)
  scaleEq(`neutral:h${h}:${level}`, generateNeutralScale(h, level), generateNeutralScaleLegacy(h, level))

// ---- report ----
console.log(`engine-parity: ${checks} comparisons, max |ΔL/C/H| = ${maxFloatDelta.toExponential(2)}`)
if (fails.length) {
  console.log(`MISMATCHES: ${fails.length} (first 20)`)
  fails.slice(0, 20).forEach(f => console.log('  ' + f))
  console.log('\nPARITY: FAIL')
  process.exit(1)
}
console.log('PARITY: PASS (byte-identical)')
