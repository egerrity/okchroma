// Shape gate for plugin v2 (extended collections): snapshots WHICH token paths each
// brand OVERRIDES vs the default-seed base, per MODE COLUMN (light · dark — the apca
// pair was retired 2026-07-29) — the v2 emission contract. The engine and themeToFigma are untouched by v2
// (figma:verify guards them); this audit only moves when the payload builder, a brand,
// or the base seed does.
//
//   npm run audit:ext          — verify against scripts/ext-overrides-snapshot.json
//   npm run audit:ext:bless    — rewrite the snapshot after an intentional change
//
// Also asserts the invariants the plugin's write path relies on:
//   · every column shares the same token path set (code.ts iterates one column's paths)
//   · primitive/system/* never diffs from the base (code.ts skips it outright)
//   · a brand carries a brand-alt group exactly when it HAS a secondary

import * as fs from 'fs'
import * as path from 'path'
import { FIXTURES, FIXTURE_SECONDARIES } from './fixture'
import { buildBaseColumns, buildBrandColumns, COLUMNS, type FlatTok, type TokenColumns } from '../plugin-ext/payload'
import { EXT_NON_OVERRIDABLE } from '../src/engine/tokenNames'
import { FAMILIES } from '../src/engine/tokenDescriptions'
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
      // contract-invariant rows never diverge from base — the roster import from
      // tokenNames.ts (2026-08-18: the prefix test died with the ownership zones; the
      // sweep showed prefix-keyed behavior disarms silently on renames). Brand-VARYING
      // exceptions (link trio, identity absolutes) are EXT_OVERRIDABLE_SYSTEM — the
      // same source plugin-ext/code.ts consumes.
      if (EXT_NON_OVERRIDABLE(t.path)) {
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

// LADDER-ORDER ASSERTION (adversarial-audit-caught 2026-08-07; regex follows the FLAT
// leaves since the band flattening, owner 2026-08-12 — a shape change that dodges this
// regex would silently disarm the gate, which is exactly how the banded-era version
// went dead for one commit during the flatten): the panel contract is descending LL,
// lightest first (paper-0 leads, pen-100 trails), and nothing else in this file would
// catch a reversal because no color changes. Guards figmaRender's emit/insertion order
// + its two consumers (payload.ts flatten(), plugin/code.ts's orderedEntries). The
// shape is structural, not per-brand-value-dependent — every brand shares the same
// layout — so checking the base seed's two columns is enough.
function assertLadderOrder(tokens: FlatTok[], label: string): void {
  for (const fam of FAMILIES) {
    const nums: number[] = []
    for (const t of tokens) {
      // end-anchored (2026-08-18): the flat overlay twins (paper-99-overlay) carry a
      // ladder digit mid-name and must not double-count their paper's rung
      // 'lead' joined the band words in the guarantee round (ink-53 → pencil-47,
      // owner 2026-08-27) — this regex IS the disarm-detection gate, so it moves
      // with the leaf shape by design (the cta-ink round's lesson)
      const m = new RegExp(`/${fam}/(?:paper|highlighter|crayon|pencil|pen)-(\\d+)(?:-aaa?)?$`).exec(t.path)
      if (m) nums.push(parseInt(m[1], 10))
    }
    // the gate must never silently disarm again: every family carries a full ladder
    // (neutral: 100…0 = 13 rows; the rest: 99…30 = 11)
    if (nums.length < 11) {
      fails.push(`${label} ${fam}: ladder regex matched only ${nums.length} rows — the leaf shape moved and disarmed this gate`)
      continue
    }
    for (let i = 1; i < nums.length; i++) {
      // instruments rename (2026-08-31): the digit is inverted (100 − rootL), so along the
      // panel's lightest-first ladder the DIGITS now strictly ASCEND (paper-0 … pen-100)
      if (nums[i] <= nums[i - 1]) {
        fails.push(`${label} ${fam}: ladder order broken at index ${i} (${nums[i - 1]} → ${nums[i]}, expected strictly ascending)`)
        break
      }
    }
  }
}
for (const col of COLUMNS) assertLadderOrder(base[col], `base ${col}`)

for (const b of FIXTURES) {
  const secondaryHex = FIXTURE_SECONDARIES[b.slug] ?? null
  const tokens = buildBrandColumns({
    primaryHex: b.hex, name: b.name, exact: b.exact, archetypeOverride: b.archetypeOverride,
    style: b.style, secondaryHex,
  }, 'default')
  // every payload carries a brand-alt now (real or derived from the primary);
  // code.ts decides whether it's WRITTEN based on the file's posture. The group spans
  // both registers since A1 (primitive scale rows, semantic cta rows) — the scale rows
  // are always present whenever a secondary exists, so the primitive check alone suffices.
  if (!tokens[COLUMNS[0]].some(x => x.path.startsWith('base/brand-alt/')))
    fails.push(`${b.slug}: payload missing brand-alt (the derive fallback is broken)`)
  snap.brands[b.slug] = overridesFor(tokens, base, b.slug)
}

// The brand set in plugin-ext/roster.ts goes through the same gate. The plugin's bulk-apply
// button is gone, so this audit is now that set's only consumer — it exists for coverage.
for (const e of ROSTER) {
  const tokens = buildBrandColumns(rosterSpec(e), e.neutralLevel ?? 'default')
  snap.roster[e.name] = overridesFor(tokens, base, `roster/${e.name}`)
}
// The seed-canary property, asserted computationally (the in-file canary extension was
// retired — owner call): the base seed applied as a brand must inherit everything.
{
  const seed = buildBrandColumns({ primaryHex: '#E93D82', name: 'seed', secondaryHex: null }, 'default')
  const canary = overridesFor(seed, base, 'seed-canary')
  if (COLUMNS.some(c => canary[c].length > 0))
    fails.push(`seed-canary: the base seed diffs against itself (${COLUMNS.map(c => canary[c].length).join('·')}) — the diff is misfiring`)
}

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
console.log('ext-override-audit: override sets match the snapshot; path-set + contract-invariant-row invariants hold.')
