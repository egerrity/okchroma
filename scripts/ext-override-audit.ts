// Shape gate for plugin v2 (extended collections): snapshots WHICH token paths each
// brand OVERRIDES vs the default-seed base, per solve COLUMN (wcag · wcag-dark · apca ·
// apca-dark) — the v2 emission contract. The engine and themeToFigma are untouched by v2
// (figma:verify guards them); this audit only moves when the payload builder, a brand,
// or the base seed does.
//
//   npm run audit:ext          — verify against scripts/ext-overrides-snapshot.json
//   npm run audit:ext:bless    — rewrite the snapshot after an intentional change
//
// Also asserts the invariants the plugin's write path relies on:
//   · every column shares the same token path set (code.ts iterates one column's paths)
//   · system/* never diffs from the base (code.ts skips it outright)
//   · a brand carries a brand-secondary group exactly when it HAS a secondary

import * as fs from 'fs'
import * as path from 'path'
import { BRANDS } from '../src/brands'
import { SECONDARIES } from '../src/secondaries'
import { buildBaseColumns, buildBrandColumns, COLUMNS, type FlatTok, type TokenColumns } from '../plugin-ext/payload'
import { ROSTER, rosterSpec } from '../plugin-ext/roster'

const EPS = 1 / 1024
const eq = (a: FlatTok, b: FlatTok) =>
  Math.abs(a.r - b.r) < EPS && Math.abs(a.g - b.g) < EPS && Math.abs(a.b - b.b) < EPS
  && Math.abs((a.a ?? 1) - (b.a ?? 1)) < EPS

const bless = process.argv.includes('--bless')
const SNAP_PATH = path.join(process.cwd(), 'scripts', 'ext-overrides-snapshot.json')
const fails: string[] = []

function overridesFor(brand: TokenColumns, base: TokenColumns, label: string): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  const pathSet = brand[COLUMNS[0]].map(t => t.path).join('\n')
  for (const col of COLUMNS) {
    if (brand[col].map(t => t.path).join('\n') !== pathSet)
      fails.push(`${label}: column ${col} has a different token path set`)
    const baseMap = new Map(base[col].map(t => [t.path, t]))
    const ov: string[] = []
    for (const t of brand[col]) {
      const b = baseMap.get(t.path)
      if (t.path.startsWith('system/')) {
        if (!b || !eq(t, b)) fails.push(`${label} ${col}: system token diverges from base — ${t.path}`)
        continue
      }
      if (!b || !eq(t, b)) ov.push(t.path)
    }
    out[col] = ov.sort()
  }
  return out
}

const base = buildBaseColumns()
type Snap = { base: Record<string, number>; brands: Record<string, Record<string, string[]>>; roster: Record<string, Record<string, string[]>> }
const snap: Snap = { base: {}, brands: {}, roster: {} }
for (const col of COLUMNS) snap.base[col] = base[col].length

for (const b of BRANDS) {
  const secondaryHex = SECONDARIES[b.slug] ?? null
  const tokens = buildBrandColumns({
    primaryHex: b.hex, name: b.name, exact: b.exact, archetypeOverride: b.archetypeOverride,
    style: b.style, secondaryHex,
  }, 'default')
  const hasSecondaryGroup = tokens[COLUMNS[0]].some(x => x.path.startsWith('brand-secondary/'))
  if (hasSecondaryGroup !== !!secondaryHex)
    fails.push(`${b.slug}: brand-secondary group ${hasSecondaryGroup ? 'present without' : 'missing despite'} a secondary`)
  snap.brands[b.slug] = overridesFor(tokens, base, b.slug)
}

// The bulk roster (plugin-ext/roster.ts) goes through the same gate — exactly what the
// footer action sends, so the plugin's batch totals reconcile against this snapshot.
for (const e of ROSTER) {
  const tokens = buildBrandColumns(rosterSpec(e), e.neutralLevel ?? 'default')
  snap.roster[e.name] = overridesFor(tokens, base, `roster/${e.name}`)
}
// the seed canary IS the diff-correctness assertion: the base seed applied as a brand
// must inherit everything
if (COLUMNS.some(c => snap.roster['okchroma'][c].length > 0))
  fails.push(`roster/okchroma: the seed canary has overrides (${COLUMNS.map(c => snap.roster['okchroma'][c].length).join('·')}) — the diff is misfiring`)

if (bless) {
  fs.writeFileSync(SNAP_PATH, JSON.stringify(snap, null, 1))
  console.log(`blessed: override-set snapshot written to ${SNAP_PATH} (${Object.keys(snap.brands).length} brands × ${COLUMNS.length} columns)`)
} else if (!fs.existsSync(SNAP_PATH)) {
  fails.push(`no snapshot at ${SNAP_PATH} — run audit:ext:bless once to establish it`)
} else {
  const prev = JSON.parse(fs.readFileSync(SNAP_PATH, 'utf8')) as Snap
  if (!prev.base || !prev.brands || !prev.roster) {
    fails.push('snapshot predates the current shape — run audit:ext:bless')
  } else {
    for (const col of COLUMNS) {
      if (prev.base[col] !== snap.base[col])
        fails.push(`base ${col}: token count moved ${prev.base[col]} → ${snap.base[col]}`)
    }
    const compare = (label: string, old: Record<string, Record<string, string[]>>, cur: Record<string, Record<string, string[]>>) => {
      const slugs = new Set([...Object.keys(old), ...Object.keys(cur)])
      for (const slug of slugs) {
        const o = old[slug]
        const c = cur[slug]
        if (!o || !c) { fails.push(`${label}${slug}: ${!o ? 'new entry (re-bless)' : 'entry vanished'}`); continue }
        for (const col of COLUMNS) {
          const ov = o[col] ?? [], cv = c[col] ?? []
          if (ov.join('\n') !== cv.join('\n')) {
            const added = cv.filter(p => !ov.includes(p))
            const gone = ov.filter(p => !cv.includes(p))
            fails.push(`${label}${slug} ${col}: override set moved (${ov.length}→${cv.length}`
              + `${added.length ? `; +${added.slice(0, 3).join(', ')}${added.length > 3 ? '…' : ''}` : ''}`
              + `${gone.length ? `; -${gone.slice(0, 3).join(', ')}${gone.length > 3 ? '…' : ''}` : ''})`)
          }
        }
      }
    }
    compare('', prev.brands, snap.brands)
    compare('roster/', prev.roster, snap.roster)
  }
}

if (fails.length) {
  console.error(`ext-override-audit: ${fails.length} failure(s)`)
  for (const f of fails) console.error(`  ✗ ${f}`)
  process.exit(1)
}
console.log('ext-override-audit: override sets match the snapshot; path-set + system/* invariants hold.')
