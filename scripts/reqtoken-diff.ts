// reqtoken-diff.ts — okchroma DIVERGENCE DIAGNOSTIC (report-only, NOT a gate). Runs the REAL pipeline
// (resolveBrand, production opts) next to the reqtoken resolver per seed and diffs per stop. Each divergence
// is classified: a documented okchroma bolt-on / deferred aesthetic, a deliberate reqtoken declaration, or a
// rule-gap candidate to inspect. Writes scripts/reqtoken-diff-report.md.
import { writeFileSync } from 'fs'
import { resolveRamp } from '../src/reqtoken/resolve'
import { resolveBrand } from '../src/engine/resolve'
import type { ColorStop } from '../src/engine/colorEngine'
import { oklchToLinearRgb } from '../src/engine/constraints'

const enc = (c: number) => { c = Math.max(0, Math.min(1, c)); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055 }
const oklchToHex = (L: number, C: number, H: number) => '#' + oklchToLinearRgb(L, C, H).map(c => Math.round(enc(c) * 255).toString(16).padStart(2, '0')).join('')

// agnostic grid (lean) + documented edge seeds
const GRID = Array.from({ length: 12 }, (_, i) => i * 30).flatMap(H => [0.08, 0.16].map(C => oklchToHex(0.62, C, H)))
const EDGES: [string, string][] = [['#c8a018', 'saturated yellow (H-K/gamut edge)'], ['#2255cc', 'blue (dark-contrast edge)'], ['#8a8a8a', 'near-gray (min-chroma edge)'], ['#d94f1e', 'red-orange (torsion-band edge)']]
const SEEDS: [string, string][] = [...GRID.map(h => [h, ''] as [string, string]), ...EDGES]

const dH = (a: number, b: number) => { let d = (a - b) % 360; if (d > 180) d -= 360; if (d < -180) d += 360; return d }
const dE = (a: { L: number; C: number; H: number }, b: { L: number; C: number; H: number }) => {
  const ab = (s: typeof a) => [s.C * Math.cos(s.H * Math.PI / 180), s.C * Math.sin(s.H * Math.PI / 180)]
  const [a1, b1] = ab(a), [a2, b2] = ab(b)
  return Math.sqrt((a.L - b.L) ** 2 + (a1 - a2) ** 2 + (b1 - b2) ** 2)
}

function classify(stop: number, mode: string, dl: number, dc: number, dh: number, seedH: number): string {
  const dom = Math.abs(dl) >= Math.abs(dc) && Math.abs(dl) >= Math.abs(dh) / 100 ? 'L' : Math.abs(dc) >= Math.abs(dh) / 100 ? 'C' : 'H'
  if (stop === 0 && mode === 'light' && Math.abs(dl) > 0.12 && (seedH < 60 || seedH > 330))
    return 'collision re-solve (bolt-on): okchroma darkens red-family ctas that collide with the red signal; reqtoken has no collision machinery (deferred)'
  if (stop === 0) return 'cta role rules differ: okchroma = on-fill white-text enforcement + dark min-L 0.70 + dark chroma trim; reqtoken = plain anchor + 0.63 floor (machinery lands in Stage 3)'
  if (stop === 8 && mode === 'dark') return 'dark stop-8 hand-placed in okchroma (bolt-on); reqtoken DECLARES 3:1 both modes'
  if (mode === 'light' && dom === 'H' && (seedH < 45 || seedH > 330)) return 'applyRedCoolRender (bolt-on, light-only red cool)'
  if (mode === 'dark' && dom === 'C') return 'dark chroma floor / darkChromaCurve (okchroma aesthetic, deferred)'
  if ((stop === 11 || stop === 12) && dom === 'L') return 'rung-1 deepen (collision machinery, deferred) or text chroma-floor interplay'
  if (dom === 'C') return 'chroma model gap: okchroma LIGHT_BASE_C absolute curve + boosts vs reqtoken saturation ladder — INSPECT'
  return 'rule-gap candidate — INSPECT'
}

type Row = { seed: string; note: string; mode: string; stop: number; dl: number; dc: number; dh: number; de: number; cls: string }
const rows: Row[] = []

for (const [hex, note] of SEEDS) {
  const brand = resolveBrand(hex, 'diff-probe')
  for (const mode of ['light', 'dark'] as const) {
    const rt = resolveRamp(hex, mode)
    const engStops: ColorStop[] = mode === 'light' ? brand.scale.light : brand.scale.dark
    const engCta: ColorStop = mode === 'light' ? brand.scale.cta : brand.scale.ctaDark
    for (const s of rt.stops) {
      const eng = engStops.find(e => e.stop === s.stop)
      if (!eng) continue
      const dl = s.L - eng.L, dc = s.C - eng.C, dhh = dH(s.H, eng.H)
      rows.push({ seed: hex, note, mode, stop: s.stop, dl, dc, dh: dhh, de: dE(s, eng), cls: classify(s.stop, mode, dl, dc, dhh, rt.seed.H) })
    }
    // off-scale role vs the engine's off-scale cta (stop 0 = role marker in this report)
    const cta = rt.roles.cta
    const dl = cta.L - engCta.L, dc = cta.C - engCta.C, dhh = dH(cta.H, engCta.H)
    rows.push({ seed: hex, note, mode, stop: 0, dl, dc, dh: dhh, de: dE(cta, engCta), cls: classify(0, mode, dl, dc, dhh, rt.seed.H) })
  }
}

// aggregate per stop×mode
const agg = new Map<string, { n: number; sum: number; max: number; worstSeed: string }>()
for (const r of rows) {
  const k = `${r.mode} stop ${String(r.stop).padStart(2)}`
  const a = agg.get(k) ?? { n: 0, sum: 0, max: 0, worstSeed: '' }
  a.n++; a.sum += r.de
  if (r.de > a.max) { a.max = r.de; a.worstSeed = r.seed + (r.note ? ` (${r.note})` : '') }
  agg.set(k, a)
}

const lines: string[] = []
lines.push('# reqtoken ↔ okchroma divergence report (diagnostic, not a gate)')
lines.push(`\n${SEEDS.length} seeds × 2 modes, per-stop OKLab ΔE vs the REAL pipeline (resolveBrand, production opts).`)
lines.push('\n## per-stop aggregate (ΔE_OK: mean / max, worst seed)\n')
lines.push('| stop | mean ΔE | max ΔE | worst seed |')
lines.push('|---|---|---|---|')
for (const [k, a] of [...agg.entries()].sort()) lines.push(`| ${k} | ${(a.sum / a.n).toFixed(3)} | ${a.max.toFixed(3)} | ${a.worstSeed} |`)

lines.push('\n## worst 20 divergences, classified\n')
lines.push('| seed | mode | stop | ΔL | ΔC | ΔH° | ΔE | classification |')
lines.push('|---|---|---|---|---|---|---|---|')
for (const r of [...rows].sort((a, b) => b.de - a.de).slice(0, 20))
  lines.push(`| ${r.seed}${r.note ? ` (${r.note})` : ''} | ${r.mode} | ${r.stop} | ${r.dl.toFixed(3)} | ${r.dc.toFixed(3)} | ${r.dh.toFixed(1)} | ${r.de.toFixed(3)} | ${r.cls} |`)

// classification tallies
const tally = new Map<string, number>()
for (const r of rows.filter(r => r.de > 0.02)) tally.set(r.cls, (tally.get(r.cls) ?? 0) + 1)
lines.push('\n## classification tally (divergences with ΔE > 0.02)\n')
for (const [cls, n] of [...tally.entries()].sort((a, b) => b[1] - a[1])) lines.push(`- **${n}** × ${cls}`)
lines.push(`\n(${rows.filter(r => r.de <= 0.02).length}/${rows.length} stop comparisons agree within ΔE 0.02.)`)

const report = lines.join('\n') + '\n'
writeFileSync('scripts/reqtoken-diff-report.md', report)
console.log(report)
console.log('written → scripts/reqtoken-diff-report.md')
