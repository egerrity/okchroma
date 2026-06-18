// Locked-set + fleet ΔE vs the blessed dark-audit snapshot — the cost
// report for an engine-math candidate (what moves, by how much, and
// whether the locked bit-identity sets held). Read-only.
import { BRANDS } from '../src/brands'
import { SIGNALS } from '../src/engine/signals'
import { resolveBrand, SIGNAL_SCALES } from '../src/engine/resolve'
import { stopDeltaE } from '../src/engine/collision'
import * as fs from 'fs'
import * as path from 'path'

const SNAP_PATH = path.join(process.cwd(), 'scripts', 'dark-audit-snapshot.json')
const blessed: Record<string, Array<[number, number, number]>> = JSON.parse(
  fs.readFileSync(SNAP_PATH, 'utf8')
)

// Locked bit-identity hexes (handoff §5). Reds and pinks are additionally
// expected locked as a class (wDrift = 0 below the red watershed).
const LOCKED_HEX = new Set(
  ['#FAD037', '#E8742C', '#67483C', '#57391E', '#E91E63', '#E93D82', '#E29DB8'].map(h =>
    h.toUpperCase()
  )
)

interface Row {
  key: string
  hex: string
  H: number
  maxDE: number
  at: string
}
const rows: Row[] = []

for (const b of BRANDS) {
  const r = resolveBrand(b.hex, b.slug, {
    exact: b.exact,
    archetypeOverride: b.archetypeOverride,
    style: b.style,
  })
  const ref = blessed[b.slug]
  if (!ref) continue
  const stops = [...r.scale.light, ...r.scale.dark]
  let maxDE = 0
  let at = ''
  for (let i = 0; i < stops.length; i++) {
    const [L, C, H] = ref[i]
    const d = stopDeltaE(stops[i], { L, C, H } as any)
    if (d > maxDE) {
      maxDE = d
      at = `${i < 12 ? 'light' : 'dark'} ${(i % 12) + 1}`
    }
  }
  rows.push({ key: b.slug, hex: b.hex.toUpperCase(), H: r.scale.brandH, maxDE, at })
}

const band = (h: number) => (h <= 12 || h >= 320 ? 'pink/red-lo' : h <= 35.5 ? 'red' : h <= 122 ? 'warm' : 'cool')

console.log('── locked named hexes ──')
for (const row of rows.filter(r => LOCKED_HEX.has(r.hex)))
  console.log(`   ${row.hex} ${row.key.padEnd(30)} max ΔE ${row.maxDE.toFixed(4)}${row.maxDE > 1e-4 ? ` (${row.at})` : ' — bit-identical'}`)

console.log('\n── class summary (primaries, max ΔE vs blessed) ──')
const byBand: Record<string, Row[]> = {}
for (const r of rows) (byBand[band(r.H)] ??= []).push(r)
for (const [b, list] of Object.entries(byBand)) {
  list.sort((a, b2) => b2.maxDE - a.maxDE)
  const moved = list.filter(r => r.maxDE > 0.0001).length
  console.log(`   ${b.padEnd(11)} ${moved}/${list.length} moved; worst:`)
  for (const r of list.slice(0, 4))
    console.log(`      ${r.hex} ${r.key.padEnd(30)} ${r.maxDE.toFixed(4)} (${r.at})`)
}

// signals must be untouched (no brand floor, but same engine)
console.log('\n── signals ──')
for (const sig of SIGNALS) {
  const ref = blessed[`signal:${sig.name}`]
  if (!ref) continue
  const s = SIGNAL_SCALES.get(sig.name)!.scale
  const stops = [...s.light, ...s.dark]
  let maxDE = 0
  for (let i = 0; i < stops.length; i++) {
    const [L, C, H] = ref[i]
    maxDE = Math.max(maxDE, stopDeltaE(stops[i], { L, C, H } as any))
  }
  console.log(`   ${sig.name.padEnd(8)} max ΔE ${maxDE.toFixed(4)}${maxDE <= 1e-4 ? ' — bit-identical' : ''}`)
}
