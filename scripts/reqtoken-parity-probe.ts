// reqtoken-parity-probe.ts — TRANSITIONAL Stage-2/3 gate: proves the reqtoken resolver reproduces
// generateScale EXACTLY (float-equal L/C/H) in BOTH modes, including roles, enforcement, and the on-color
// booleans, across the opts levers. Deleted with the other transitional harnesses in Stage 7.
import { generateScale, type GeneratedScale } from '../src/engine/colorEngine'
import { darkChromaCurve } from '../src/engine/darkChromaCurve'
import { resolveRamp, type ResolveOpts } from '../src/reqtoken/resolve'
import { oklchToLinearRgb } from '../src/engine/constraints'

const enc = (c: number) => { c = Math.max(0, Math.min(1, c)); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055 }
const oklchToHex = (L: number, C: number, H: number) => '#' + oklchToLinearRgb(L, C, H).map(c => Math.round(enc(c) * 255).toString(16).padStart(2, '0')).join('')

let checks = 0, maxDelta = 0
const fails: string[] = []
const eq = (label: string, a: number | boolean | undefined, b: number | boolean | undefined) => {
  checks++
  if (typeof a === 'number' && typeof b === 'number') {
    if (a !== b) { maxDelta = Math.max(maxDelta, Math.abs(a - b)); fails.push(`${label}: ${a} vs ${b} (Δ ${(a - b).toExponential(2)})`) }
  } else if (a !== b) fails.push(`${label}: ${a} vs ${b}`)
}

function compareMode(label: string, hex: string, opts: ResolveOpts, eng: GeneratedScale, mode: 'light' | 'dark') {
  const rt = resolveRamp(hex, mode, undefined, opts)
  const engStops = mode === 'light' ? eng.light : eng.dark
  for (const es of engStops) {
    const rs = rt.stops.find(s => s.stop === es.stop)
    if (!rs) { fails.push(`${label}:${mode} stop ${es.stop}: missing in reqtoken`); checks++; continue }
    eq(`${label}:${mode} s${es.stop}.L`, rs.L, es.L)
    eq(`${label}:${mode} s${es.stop}.C`, rs.C, es.C)
    eq(`${label}:${mode} s${es.stop}.H`, rs.H, es.H)
  }
  const engCta = mode === 'light' ? eng.cta : eng.ctaDark
  const engHover = mode === 'light' ? eng.ctaHover : eng.ctaHoverDark
  eq(`${label}:${mode} cta.L`, rt.roles.cta.L, engCta.L)
  eq(`${label}:${mode} cta.C`, rt.roles.cta.C, engCta.C)
  eq(`${label}:${mode} cta.H`, rt.roles.cta.H, engCta.H)
  eq(`${label}:${mode} ctaHover.L`, rt.roles.ctaHover.L, engHover.L)
  eq(`${label}:${mode} ctaHover.C`, rt.roles.ctaHover.C, engHover.C)
  eq(`${label}:${mode} onFill`, rt.ons.onFillIsWhite, mode === 'light' ? eng.onFillTextIsWhite : eng.onFillTextIsWhiteDark)
  if (opts.highlight) eq(`${label}:${mode} onHighlight`, rt.ons.onHighlightIsWhite, mode === 'light' ? eng.onHighlightIsWhite : eng.onHighlightIsWhiteDark)
}

function compare(label: string, hex: string, opts: ResolveOpts) {
  const eng = generateScale(hex, label, opts.forcedArchetype, opts)
  compareMode(label, hex, opts, eng, 'light')
  compareMode(label, hex, opts, eng, 'dark')
}

const HUES = Array.from({ length: 24 }, (_, i) => i * 15)
const SEEDS: string[] = []
for (const H of HUES) for (const C of [0.06, 0.13, 0.2]) SEEDS.push(oklchToHex(0.62, C, H))
SEEDS.push('#c8a018', '#2255cc', '#d94f1e', '#8a8a8a', '#111111', '#f5f0e8')

// enforceOnFillContrast passed EXPLICITLY everywhere: generateScale's opts semantics default it off, while
// the reqtoken declaration defaults it on (production behavior) — the probe pins the engine's semantics.
const OPTS: [string, ResolveOpts][] = [
  ['base', { highlight: true, enforceOnFillContrast: false }],
  ['enforce', { highlight: true, enforceOnFillContrast: true }],
  ['production', { highlight: true, enforceOnFillContrast: true, coolRedDark: true, darkChromaCurve, darkFillMinL: 0.70 }],
  ['deeper', { highlight: true, style: 'deeper', enforceOnFillContrast: false }],
  ['suppressRedCool', { highlight: true, suppressRedCool: true, enforceOnFillContrast: false }],
  ['hueShift', { highlight: true, hueShiftDeg: 15, enforceOnFillContrast: false }],
  ['chromaScales', { highlight: true, chromaScale: 0.9, subtleChromaScale: 0.8, enforceOnFillContrast: false }],
  ['deepens', { highlight: true, stop11DeepenL: 0.07, stop12DeepenL: 0.05, enforceOnFillContrast: false }],
  ['heat', { highlight: true, heat: 0.9, enforceOnFillContrast: false }],
  ['arch-dark', { highlight: true, forcedArchetype: 'dark', enforceOnFillContrast: false }],
  ['arch-light', { highlight: true, forcedArchetype: 'light', enforceOnFillContrast: false }],
  ['darkCurve', { highlight: true, darkChromaCurve, enforceOnFillContrast: false }],
  ['darkCurve-loud', { highlight: true, darkChromaCurve, loudCta: true, enforceOnFillContrast: false }],
  ['muted-collider', { highlight: true, darkColliderFill: 'muted', enforceOnFillContrast: false }],
  ['darkFillMinL', { highlight: true, darkFillMinL: 0.70, enforceOnFillContrast: false }],
  ['coolRedDark', { highlight: true, coolRedDark: true, enforceOnFillContrast: false }],
  ['no-highlight', { enforceOnFillContrast: false }],
]

for (const hex of SEEDS) for (const [name, opts] of OPTS) compare(`${hex}:${name}`, hex, opts)

console.log(`reqtoken-parity-probe (both modes): ${checks} comparisons, max Δ = ${maxDelta.toExponential(2)}`)
if (fails.length) {
  console.log(`MISMATCHES: ${fails.length} (first 20)`)
  fails.slice(0, 20).forEach(f => console.log('  ' + f))
  console.log('\nPROBE: FAIL')
  process.exit(1)
}
console.log('PROBE: PASS (light + dark float-identical)')
