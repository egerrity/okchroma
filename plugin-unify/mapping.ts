// The BAKED mapping table (owner-reviewed 2026-08-11) — Unify semantic tokens to
// okchroma primitive paths. Owner rules: suffix bands per color family — Primary (or
// the bare token) -> marks + pens of the family (text under the flat hierarchy; focus
// rings, brand only; icons can take crayon-26) · Highlight -> any highlighter (borders) ·
// Accent -> any paper · Spotlight -> crayon-26 or pencil-47. NEVER identity, never
// the cta family. Matching is suffix + value based so old and new Unify name vintages
// both route. Link is parked (the known tricky case) — those land unmatched.

import { FAMILY } from '../src/engine/tokenDescriptions'
import { stopTokenName, STAMP_LEAF, PAPER_0 as POLE_PAPER } from '../src/engine/tokenNames'

// the ladder leaves by stop index (tokenNames SHARED_NAMES — ascending index =
// descending lightness), so a stop relabel flows from that one table into every
// rule below; these identifiers spell today's names and are internal-only
const [P99, P97, P95, W92, W89, W85, W80, M74, I53, I42, I30] =
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(stopTokenName)

export interface Rule {
  /** okchroma primitive paths, preferred first; empty = suggest-at-runtime */
  candidates: string[]
  /** exactly one candidate AND no judgment needed */
  auto?: boolean
  /** owner 2026-08-11: on cta buttons these tokens are ALWAYS the on-cta — clusters
      with a button-ish ancestor pre-pick cta/on instead of the pen */
  onCtaException?: boolean
}

/** the elevation planes (scheme-divergent aliases in the ext register; renamed
    dim|low|mid|high, owner 2026-08-18 — mid = the raised plane components sit on) */
export const SURFACE = (plane: 'dim' | 'low' | 'mid' | 'high') => `utility/surface/${plane}`

/** the on-color register per family (an ALIAS row in the ext register — resolves live) */
export const CTA_ON = (family: string) => `base/${family}/${STAMP_LEAF.ON}`
export const BRAND_CTA_ON = CTA_ON(FAMILY.brandPrimary)
export const isCtaContext = (anc: string): boolean => /button|btn|cta/i.test(anc)

// leaves are FLAT since the band flattening (owner 2026-08-12): the engine token
// name (the stopTokenName spelling) IS the leaf, no dash→slash transform any more
const fam = (family: string) => (toks: string[]) => toks.map(t => `base/${family}/${t}`)

const PRIMARY_BAND = [M74, I53, I42, I30]
const SPOTLIGHT_BAND = [M74, I53]
const HIGHLIGHTERS = [W92, W89, W85, W80]
const PAPERS = [P99, P97, P95]
const OFFSET_08 = 'base/alpha/away-from-bg/08'
const OFFSET_16 = 'base/alpha/away-from-bg/16'
const PAPER_0 = 'base/neutral/' + POLE_PAPER

const n = fam(FAMILY.neutral)
// signal identities live under their ROLE prefixes in the ext register
const FAMILY_PREFIX: Record<string, string> = {
  brand: FAMILY.brandPrimary, error: FAMILY.critical, success: FAMILY.positive, warning: FAMILY.warning,
}

/** Collections whose variables the Mapper treats as Unify semantics. */
export const UNIFY_COLLECTIONS = new Set(['Color palettes', 'Color modes', 'Color themes'])
/** Documentation scaffolding and neighbour systems — never touched. */
export const IGNORE_COLLECTIONS = new Set([
  '1. Color modes', '1. Palette colors', 'property documentation', 'Doc Variables',
  'color-semantic', 'color-theme', 'Elevation', 'Unify Mobile Tokens',
  '1 Layout type', '2 Usage type', '2 components',
])

/** Match a bound Unify variable by NAME (suffix rules; vintage-proof). */
export function matchBound(name: string): Rule | 'ignore' | null {
  const s = name.toLowerCase()
  if (s.includes('(int)') || s.includes('spectrum') || s.includes('elevation')) return 'ignore'

  // colored families first (brand + signals) — suffix decides the band
  const family = s.includes('brand') ? 'brand'
    : s.includes('error') ? 'error'
    : s.includes('success') ? 'success'
    : s.includes('warning') ? 'warning'
    : null
  if (family) {
    const f = fam(FAMILY_PREFIX[family])
    if (s.includes('spotlight')) return { candidates: f(SPOTLIGHT_BAND) }
    if (s.includes('highlight')) return { candidates: f(HIGHLIGHTERS) }
    if (s.includes('accent')) return { candidates: f(PAPERS) }
    return { candidates: f(PRIMARY_BAND) } // Primary or the bare token
  }

  // the neutral palettes (Content / Background / Stroke / Merge / Skeleton)
  if (s.includes('scrim')) return { candidates: [] } // suggest-at-runtime
  if (s.includes('content')) {
    if (s.includes('inverse')) return { candidates: [PAPER_0], auto: true }
    if (s.includes('tertiary')) return { candidates: n([I53]) }
    // owner 2026-08-11: Content Primary/Secondary are ALWAYS 30/53 — auto, with the
    // one exception: on cta buttons they are always the on-cta (handled per cluster)
    if (s.includes('secondary')) return { candidates: n([I53]), auto: true, onCtaException: true }
    return { candidates: n([I30]), auto: true, onCtaException: true }
  }
  // owner 2026-08-11: backgrounds are the SURFACE PLANES, never raw papers —
  // primary is always high, secondary always base, tertiary is sunken or low
  // (same planes as when the rule was made; the planes were renamed 2026-08-12)
  if (s.includes('background')) {
    if (s.includes('inverse')) return { candidates: n([I30, I42]) }
    if (s.includes('tertiary')) return { candidates: [SURFACE('dim'), SURFACE('low')] }
    if (s.includes('secondary')) return { candidates: [SURFACE('mid')], auto: true }
    return { candidates: [SURFACE('high')], auto: true }
  }
  if (s.includes('stroke')) {
    if (s.includes('inverse')) return { candidates: [PAPER_0], auto: true }
    if (s.includes('quaternary') || s.includes('quarternary')) return { candidates: n([W92, W85, W80, M74]) } // highlighter-8 first: nearest value (owner 2026-08-11)
    if (s.includes('tertiary')) return { candidates: n([M74, W80]) }
    if (s.includes('secondary')) return { candidates: n([I53, M74]) }
    return { candidates: n([I30, I42, I53, M74]) }
  }
  if (s.includes('merge')) {
    const m = s.match(/intensity\s*(\d)/)
    const rung = m && Number(m[1]) >= 3 ? OFFSET_16 : OFFSET_08
    return { candidates: [rung], auto: false } // the ladder collapse stays a pick
  }
  if (s.includes('skeleton')) return { candidates: n([W85, P95]) }
  return null // unmatched -> nearest-suggest at runtime
}

/** Match a DETACHED solid paint by value (the hex-matched conversion targets). */
export function matchDetached(hex: string, alpha: number): Rule | 'ignore' | null {
  const h = hex.toUpperCase()
  if (['#9747FF', '#FF1DE8', '#FF00B2', '#8A30FF'].includes(h)) return 'ignore' // Figma purple + debug
  if (alpha < 1) {
    // the merge/overlay idiom at alpha — poles only
    if (h === '#0E0F10' || h === '#000000' || h === '#FFFFFF') {
      if (alpha <= 0.125) return { candidates: [OFFSET_08] }
      if (alpha <= 0.3) return { candidates: [OFFSET_16] }
    }
    return null
  }
  const T: Record<string, Rule> = {
    '#0E0F10': { candidates: n([I30, I42, I53, M74]) },
    '#000000': { candidates: n([I30, I42, I53]) },
    '#17191C': { candidates: n([I30, I42]) },
    '#515767': { candidates: n([I53, I42]) },
    '#868FA2': { candidates: n([I53]) },
    '#95979D': { candidates: n([I53]) },
    '#FFFFFF': { candidates: [PAPER_0], auto: true },
    '#F9FAFB': { candidates: [SURFACE('mid')], auto: true },
    '#EEEFF2': { candidates: [SURFACE('dim'), SURFACE('low')] },
    '#CBCFD7': { candidates: n([M74, W80]) },
    '#E2E4E9': { candidates: n([W85, W80, M74]) },
    '#044BAF': { candidates: fam(FAMILY.brandPrimary)(PRIMARY_BAND) },
    '#4F46E5': { candidates: fam(FAMILY.brandPrimary)(PRIMARY_BAND) }, // archived Violet vintage
    '#8EB9F5': { candidates: fam(FAMILY.brandPrimary)(HIGHLIGHTERS) },
    '#E6EFFB': { candidates: fam(FAMILY.brandPrimary)(PAPERS) },
    '#B42318': { candidates: fam(FAMILY.critical)(PRIMARY_BAND) },
    '#FECDCA': { candidates: fam(FAMILY.critical)(HIGHLIGHTERS) },
    '#FEF3F2': { candidates: fam(FAMILY.critical)(PAPERS) },
    '#2A5F26': { candidates: fam(FAMILY.positive)(PRIMARY_BAND) },
    '#277A1F': { candidates: fam(FAMILY.positive)(PRIMARY_BAND) }, // vintage
    '#A3DB9E': { candidates: fam(FAMILY.positive)(HIGHLIGHTERS) },
    '#AFE9AA': { candidates: fam(FAMILY.positive)(HIGHLIGHTERS) },
    '#EBF5EA': { candidates: fam(FAMILY.positive)(PAPERS) },
    '#804F00': { candidates: fam(FAMILY.warning)(PRIMARY_BAND) },
    '#B54708': { candidates: fam(FAMILY.warning)(PRIMARY_BAND) }, // vintage
    '#FFE680': { candidates: fam(FAMILY.warning)(HIGHLIGHTERS) },
    '#FEDF89': { candidates: fam(FAMILY.warning)(HIGHLIGHTERS) },
    '#FFF9E5': { candidates: fam(FAMILY.warning)(PAPERS) },
    '#FFFAEB': { candidates: fam(FAMILY.warning)(PAPERS) },
  }
  return T[h] ?? null
}

/** Every path any rule can emit — the sandbox inventories these targets per scan. */
export function allCandidatePaths(): string[] {
  const out = new Set<string>([PAPER_0, OFFSET_08, OFFSET_16,
    SURFACE('dim'), SURFACE('low'), SURFACE('mid'), SURFACE('high')])
  for (const family of [FAMILY.neutral, FAMILY.brandPrimary, FAMILY.critical, FAMILY.positive, FAMILY.warning]) {
    const f = fam(family)
    for (const t of [...PRIMARY_BAND, ...HIGHLIGHTERS, ...PAPERS]) for (const p of f([t])) out.add(p)
    out.add(CTA_ON(family))
  }
  return [...out]
}
