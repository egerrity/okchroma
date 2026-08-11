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
      // primitive/system/* is contract-invariant — EXCEPT the identity absolutes (owner
      // 2026-07-27, abs-primary / abs-secondary) and the system link trio, BRAND-VARYING
      // too (Phase 4, owner: "link is a system level color. It can still be extended"),
      // back under primitive/system/link/ since the 2026-08-11 flatten. Mirrors
      // plugin-ext/code.ts OVERRIDABLE_SYSTEM.
      if (t.path.startsWith('primitive/system/') && !t.path.startsWith('primitive/system/link/')
        && t.path !== 'primitive/system/abs-primary' && t.path !== 'primitive/system/abs-secondary') {
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

// LADDER-ORDER ASSERTION (adversarial-audit-caught 2026-08-07): paper's bare-digit
// leaves (95/97/99/100) and wash's (80/85/89/92) are JS integer-index keys, so a plain
// Object.entries over the FigmaGroup silently re-sorts them ascending regardless of
// insertion order — reversing the TOKEN_ORDER panel contract (descending LL, lightest
// first) with no color changing, so nothing else in this file would ever catch it. Guards
// figmaRender.ts's groupEntries + its two consumers (payload.ts flatten(), plugin/code.ts's
// orderedEntries). The shape is structural, not per-brand-value-dependent — every brand
// shares the same band layout — so checking the base seed's two columns is enough.
const LADDER_FAMILIES = ['neutral', 'brand-primary', 'brand-secondary', 'critical', 'warning', 'positive', 'info']
function assertLadderOrder(tokens: FlatTok[], label: string): void {
  for (const fam of LADDER_FAMILIES) {
    const nums: number[] = []
    for (const t of tokens) {
      const m = new RegExp(`/${fam}/(?:paper|wash|mark|ink)/(\\d+)`).exec(t.path)
      if (m) nums.push(parseInt(m[1], 10))
    }
    for (let i = 1; i < nums.length; i++) {
      if (nums[i] >= nums[i - 1]) {
        fails.push(`${label} ${fam}: ladder order broken at index ${i} (${nums[i - 1]} → ${nums[i]}, expected strictly descending)`)
        break
      }
    }
  }
}
for (const col of COLUMNS) assertLadderOrder(base[col], `base ${col}`)

for (const b of BRANDS) {
  const secondaryHex = SECONDARIES[b.slug] ?? null
  const tokens = buildBrandColumns({
    primaryHex: b.hex, name: b.name, exact: b.exact, archetypeOverride: b.archetypeOverride,
    style: b.style, secondaryHex,
  }, 'default')
  // every payload carries a brand-secondary now (real or derived from the primary);
  // code.ts decides whether it's WRITTEN based on the file's posture. The group spans
  // both registers since A1 (primitive scale rows, semantic cta rows) — the scale rows
  // are always present whenever a secondary exists, so the primitive check alone suffices.
  if (!tokens[COLUMNS[0]].some(x => x.path.startsWith('primitive/brand-secondary/')))
    fails.push(`${b.slug}: payload missing brand-secondary (the derive fallback is broken)`)
  snap.brands[b.slug] = overridesFor(tokens, base, b.slug)
}

// The bulk roster (plugin-ext/roster.ts) goes through the same gate — exactly what the
// roster button sends, so the plugin's batch totals reconcile against this snapshot.
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
console.log('ext-override-audit: override sets match the snapshot; path-set + primitive/system/* invariants hold.')
