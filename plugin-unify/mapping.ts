// The BAKED mapping table (owner-reviewed 2026-08-11) — Unify semantic tokens to
// okchroma primitive paths. Owner rules: suffix bands per color family — Primary (or
// the bare token) -> marks + inks of the family (text under the flat hierarchy; focus
// rings, brand only; icons can take mark-74-aa) · Highlight -> any wash (borders) ·
// Accent -> any paper · Spotlight -> mark-74-aa or ink-53-aa. NEVER identity, never
// the cta family. Matching is suffix + value based so old and new Unify name vintages
// both route. Link is parked (the known tricky case) — those land unmatched.

export interface Rule {
  /** okchroma primitive paths, preferred first; empty = suggest-at-runtime */
  candidates: string[]
  /** exactly one candidate AND no judgment needed */
  auto?: boolean
  /** owner 2026-08-11: on cta buttons these tokens are ALWAYS the on-cta — clusters
      with a button-ish ancestor pre-pick cta/on instead of the ink */
  onCtaException?: boolean
}

/** the elevation planes (scheme-divergent aliases in the ext register) */
export const SURFACE = (plane: 'sink' | 'base' | 'lift' | 'pop') => `primitive/system/surface/${plane}`

/** the on-cta register per family (an ALIAS row in the ext register — resolves live) */
export const CTA_ON = (family: string) => `primitive/${family}/cta/on`
export const BRAND_CTA_ON = CTA_ON('brand-primary')
export const isCtaContext = (anc: string): boolean => /button|btn|cta/i.test(anc)

const leaf = (tok: string) => tok.replace('-', '/') // 'ink-53-aa' -> 'ink/53-aa', 'paper-99' -> 'paper/99'
const fam = (family: string) => (toks: string[]) => toks.map(t => `primitive/${family}/${leaf(t)}`)

const PRIMARY_BAND = ['mark-74-aa', 'ink-53-aa', 'ink-42-aa', 'ink-30-aaa']
const SPOTLIGHT_BAND = ['mark-74-aa', 'ink-53-aa']
const WASHES = ['wash-92', 'wash-89', 'wash-85', 'wash-80']
const PAPERS = ['paper-99', 'paper-97', 'paper-95']
const OFFSET_08 = 'primitive/system/alpha/offset-08'
const OFFSET_16 = 'primitive/system/alpha/offset-16'
const PAPER_100 = 'primitive/neutral/paper/100'

const n = fam('neutral')
// signal identities live under their ROLE prefixes in the ext register
const FAMILY_PREFIX: Record<string, string> = {
  brand: 'brand-primary', error: 'critical', success: 'positive', warning: 'warning',
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
    if (s.includes('highlight')) return { candidates: f(WASHES) }
    if (s.includes('accent')) return { candidates: f(PAPERS) }
    return { candidates: f(PRIMARY_BAND) } // Primary or the bare token
  }

  // the neutral palettes (Content / Background / Stroke / Merge / Skeleton)
  if (s.includes('scrim')) return { candidates: [] } // suggest-at-runtime
  if (s.includes('content')) {
    if (s.includes('inverse')) return { candidates: [PAPER_100], auto: true }
    if (s.includes('tertiary')) return { candidates: n(['ink-53-aa']) }
    // owner 2026-08-11: Content Primary/Secondary are ALWAYS 30/53 — auto, with the
    // one exception: on cta buttons they are always the on-cta (handled per cluster)
    if (s.includes('secondary')) return { candidates: n(['ink-53-aa']), auto: true, onCtaException: true }
    return { candidates: n(['ink-30-aaa']), auto: true, onCtaException: true }
  }
  // owner 2026-08-11: backgrounds are the SURFACE PLANES, never raw papers —
  // primary is always pop, secondary always lift, tertiary is sink or base
  if (s.includes('background')) {
    if (s.includes('inverse')) return { candidates: n(['ink-30-aaa', 'ink-42-aa']) }
    if (s.includes('tertiary')) return { candidates: [SURFACE('sink'), SURFACE('base')] }
    if (s.includes('secondary')) return { candidates: [SURFACE('lift')], auto: true }
    return { candidates: [SURFACE('pop')], auto: true }
  }
  if (s.includes('stroke')) {
    if (s.includes('inverse')) return { candidates: [PAPER_100], auto: true }
    if (s.includes('quaternary') || s.includes('quarternary')) return { candidates: n(['wash-92', 'wash-85', 'wash-80', 'mark-74-aa']) } // wash-92 first: nearest value (owner 2026-08-11)
    if (s.includes('tertiary')) return { candidates: n(['mark-74-aa', 'wash-80']) }
    if (s.includes('secondary')) return { candidates: n(['ink-53-aa', 'mark-74-aa']) }
    return { candidates: n(['ink-30-aaa', 'ink-42-aa', 'ink-53-aa', 'mark-74-aa']) }
  }
  if (s.includes('merge')) {
    const m = s.match(/intensity\s*(\d)/)
    const rung = m && Number(m[1]) >= 3 ? OFFSET_16 : OFFSET_08
    return { candidates: [rung], auto: false } // the ladder collapse stays a pick
  }
  if (s.includes('skeleton')) return { candidates: n(['wash-85', 'paper-95']) }
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
    '#0E0F10': { candidates: n(['ink-30-aaa', 'ink-42-aa', 'ink-53-aa', 'mark-74-aa']) },
    '#000000': { candidates: n(['ink-30-aaa', 'ink-42-aa', 'ink-53-aa']) },
    '#17191C': { candidates: n(['ink-30-aaa', 'ink-42-aa']) },
    '#515767': { candidates: n(['ink-53-aa', 'ink-42-aa']) },
    '#868FA2': { candidates: n(['ink-53-aa']) },
    '#95979D': { candidates: n(['ink-53-aa']) },
    '#FFFFFF': { candidates: [PAPER_100], auto: true },
    '#F9FAFB': { candidates: [SURFACE('lift')], auto: true },
    '#EEEFF2': { candidates: [SURFACE('sink'), SURFACE('base')] },
    '#CBCFD7': { candidates: n(['mark-74-aa', 'wash-80']) },
    '#E2E4E9': { candidates: n(['wash-85', 'wash-80', 'mark-74-aa']) },
    '#044BAF': { candidates: fam('brand-primary')(PRIMARY_BAND) },
    '#4F46E5': { candidates: fam('brand-primary')(PRIMARY_BAND) }, // archived Violet vintage
    '#8EB9F5': { candidates: fam('brand-primary')(WASHES) },
    '#E6EFFB': { candidates: fam('brand-primary')(PAPERS) },
    '#B42318': { candidates: fam('critical')(PRIMARY_BAND) },
    '#FECDCA': { candidates: fam('critical')(WASHES) },
    '#FEF3F2': { candidates: fam('critical')(PAPERS) },
    '#2A5F26': { candidates: fam('positive')(PRIMARY_BAND) },
    '#277A1F': { candidates: fam('positive')(PRIMARY_BAND) }, // vintage
    '#A3DB9E': { candidates: fam('positive')(WASHES) },
    '#AFE9AA': { candidates: fam('positive')(WASHES) },
    '#EBF5EA': { candidates: fam('positive')(PAPERS) },
    '#804F00': { candidates: fam('warning')(PRIMARY_BAND) },
    '#B54708': { candidates: fam('warning')(PRIMARY_BAND) }, // vintage
    '#FFE680': { candidates: fam('warning')(WASHES) },
    '#FEDF89': { candidates: fam('warning')(WASHES) },
    '#FFF9E5': { candidates: fam('warning')(PAPERS) },
    '#FFFAEB': { candidates: fam('warning')(PAPERS) },
  }
  return T[h] ?? null
}

/** Every path any rule can emit — the sandbox inventories these targets per scan. */
export function allCandidatePaths(): string[] {
  const out = new Set<string>([PAPER_100, OFFSET_08, OFFSET_16,
    SURFACE('sink'), SURFACE('base'), SURFACE('lift'), SURFACE('pop')])
  for (const family of ['neutral', 'brand-primary', 'critical', 'positive', 'warning']) {
    const f = fam(family)
    for (const t of [...PRIMARY_BAND, ...WASHES, ...PAPERS]) for (const p of f([t])) out.add(p)
    out.add(CTA_ON(family))
  }
  return [...out]
}
