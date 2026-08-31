

// (RampKind + onFillTokenName DELETED with the highlight band, owner 2026-07-29: the
// split existed so a ramp's on-fill could land at `on-cta` or `on-highlight`. With
// on-highlight gone every family emits exactly one on-fill token, `on-cta`, and every
// call site already passed 'brand'.)

const SHARED_NAMES: Record<number, string> = {
  1: 'paper-99',
  2: 'paper-97',
  // stop 3 renamed wash-3 → paper-3 (owner 2026-07-24, elevation round): it is a
  // PLANE in both themes (light sink / dark pop), so it belongs to the surface band.
  // NAME ONLY — generation is index-keyed and unchanged; the internal wash machinery
  // (reqtoken groupOf, collision WASH_STOPS) deliberately still spans stops 3–7.
  // Stage B (owner 2026-08-07, names only): relabeled to the ROOT_L-derived digit,
  // paper-95 — same band, same index.
  3: 'paper-95',
  4: 'wash-92',
  5: 'wash-89',
  6: 'wash-85',
  7: 'wash-80',
  8: 'wax-74',
  // THE INK BAND (C49, owner 2026-08-05): the first text stop + emphasis fill (the
  // 2026-07-29 highlight collapse — the old highlight-9 and on-highlight are
  // deleted; this stop carries both jobs, its on-color a paper token), the between
  // text stop (a value the retired text-cta hover state used to generate bespokely,
  // promoted to a normal stop), and the strong text stop. The three read as states
  // ARE the text-style cta (owner 2026-08-12). C49 restored the top
  // two pre-collapse stop INDICES (11, and the off-scale anchor's 12 — emitted as a
  // literal in cssRender, not through this table) with the between stop taking the
  // vacated index 10; the indices (9/10/11) are unchanged since.
  9: 'lead-53',
  10: 'ink-42',
  11: 'ink-30',
}

// How many stops a ramp array carries — DERIVED from the name table, so a band collapse or a
// renumber updates it for free. Added 2026-07-29 because gamut-sweep hardcoded `!== 11` and had
// been failing "MALFORMED … light=10 dark=10" on every seed since C33 took the scale to 10.
export const SCALE_STOP_COUNT = Object.keys(SHARED_NAMES).length

export function stopTokenName(stop: number): string {
  const name = SHARED_NAMES[stop]
  if (!name) throw new Error(`stopTokenName: unexpected stop ${stop}`)
  return name
}

// The off-scale ladder EXTREMES — not stops of SHARED_NAMES (index-keyed generation
// never produces them; they flip with the mode). Both RESOLVE now: paper-100 since
// the 2026-07-02 paper-0 fall, ink-0 since 2026-08-28 (the ink lane extended past
// ink-30 — never the literal pole; anything needing a true pole aliases the absolute
// rows instead). One spelling here; the emitters (cssRender anchors, figmaRender's
// neutral group) reference these instead of re-spelling them.
export const PAPER_100 = 'paper-100'
export const INK_0 = 'ink-0'

// THE SOLID FAMILY (owner rename round 2026-08-18, replacing the cta words —
// stakeholder ruling: cta read as a semantic token). Flat engine identity =
// hyphenated Figma path = CSS var body, one spelling everywhere: stamp-fill /
// stamp-fill-hover / stamp-fill-pressed / stamp-edge / stamp-on. In Figma the
// family still nests as the stamp/ state group (fill, fill-hover, fill-pressed,
// edge, on) — STAMP_STATE_LEAVES below is the one flat↔nested table every
// consumer must ride (figmaRender, both plugins, figma-verify).
export const STAMP_FILL = 'stamp-fill'
export const STAMP_FILL_HOVER = 'stamp-fill-hover'
export const STAMP_FILL_PRESSED = 'stamp-fill-pressed'
export const STAMP_EDGE = 'stamp-edge'
export const STAMP_ON = 'stamp-on'
// flat engine name → nested Figma leaf (the ONLY divergence between the two
// spellings is this slash; code syntax re-hyphenates it back to the flat name)
export const STAMP_STATE_LEAVES: Record<string, string> = {
  [STAMP_FILL]: 'stamp/fill',
  [STAMP_FILL_HOVER]: 'stamp/fill-hover',
  [STAMP_FILL_PRESSED]: 'stamp/fill-pressed',
  [STAMP_EDGE]: 'stamp/edge',
  [STAMP_ON]: 'stamp/on',
}
// the nested Figma spellings, for consumers that recognize rows by their written
// path (both plugins' alias wiring, figma-verify) — importing these instead of
// spelling the strings means a future rename breaks the build instead of silently
// disarming a check (the highlight/on lesson, sweep 2026-08-18)
export const STAMP_LEAF = {
  FILL: STAMP_STATE_LEAVES[STAMP_FILL],
  FILL_HOVER: STAMP_STATE_LEAVES[STAMP_FILL_HOVER],
  FILL_PRESSED: STAMP_STATE_LEAVES[STAMP_FILL_PRESSED],
  EDGE: STAMP_STATE_LEAVES[STAMP_EDGE],
  ON: STAMP_STATE_LEAVES[STAMP_ON],
} as const

// ── the SYSTEM rows (engine worklist B2–B7, 2026-08-29): the requirement-table
// rows that used to have values only in the plugins' STATIC_UTILS and the token
// layer (tokens/semantic.css). themeToFigma emits them under these paths now, so
// object consumers ride this roster instead of spelling the strings — the same
// break-don't-drift contract as STAMP_LEAF. Spellings are the CANONICAL paths
// tokenDescriptions keys on (its zero-import rule bars it from importing these;
// desc-audit's coverage walk keeps the two tables honest).
export const SYSTEM_LEAF = {
  ABS_BLACK: 'system/abs-black',
  ABS_WHITE: 'system/abs-white',
  SURFACE: {
    DIM: 'system/surface/dim',
    LOW: 'system/surface/low',
    MID: 'system/surface/mid',
    HIGH: 'system/surface/high',
  },
  ALPHA: {
    TRANSPARENT: 'system/alpha/transparent',
    SCRIM: 'system/alpha/abs-black-060',
    INK: 'system/alpha/ink',
    OFFSET_006: 'system/alpha/006',
    OFFSET_008: 'system/alpha/008',
    OFFSET_016: 'system/alpha/016',
    // the INVERSE offset ladder (owner 2026-08-29, the interaction round): the
    // same rungs with the pole flipped per mode — white in light, black in dark
    // — STATE LAYERS for INVERTED grounds, whose polarity is opposite the
    // page's. (Never call these a "wash": that word belongs to the tinted band
    // stops.) The reversal lives in the engine (the system/surface posture): a
    // consumer on an inverted ground names one token and never picks a pole.
    // Colored fills never ride these; their states stay engine-solved stops.
    INVERSE_006: 'system/alpha/inverse-006',
    INVERSE_008: 'system/alpha/inverse-008',
    INVERSE_016: 'system/alpha/inverse-016',
    SHADOW_04: 'system/alpha/shadow-04',
    SHADOW_08: 'system/alpha/shadow-08',
    SHADOW_12: 'system/alpha/shadow-12',
  },
} as const

// THE SURFACE-PLANE LAW (the one per-mode reversal, owner spec 2026-07-24 —
// prose in tokens/semantic.css): both themes use the SAME four ladder stops in
// reversed order, elevation always moving toward paper-100's side of the ramp.
// paper-100 flips white→black with the mode, so it is always the extreme pole —
// the high in light, the dim in dark. This table is the law's ONE machine-readable
// home: semantic.css states it as static aliases, the community plugin's
// aliasElev wires it, and themeToFigma's system group resolves it — consumers
// must never respell the reversal themselves. Leaf names derive from
// SHARED_NAMES/PAPER_100 so a stop relabel updates the law for free.
export const SURFACE_PLANE_LAW: Record<string, { light: string; dark: string }> = {
  [SYSTEM_LEAF.SURFACE.DIM]: { light: SHARED_NAMES[3], dark: PAPER_100 },
  [SYSTEM_LEAF.SURFACE.LOW]: { light: SHARED_NAMES[2], dark: SHARED_NAMES[1] },
  [SYSTEM_LEAF.SURFACE.MID]: { light: SHARED_NAMES[1], dark: SHARED_NAMES[2] },
  [SYSTEM_LEAF.SURFACE.HIGH]: { light: PAPER_100, dark: SHARED_NAMES[3] },
}

// (the paper overlays — paper-99-overlay etc, owner round 2026-08-13 — are PARKED:
// owner 2026-08-18, "remove them for now and come back". Emission is off everywhere;
// the solve lives on in alphaPapers.ts under audit:alpha; existing rows in files
// orphan in place. Resurrection re-adds their TOKEN_ORDER interleave + the emit
// wiring — see git.)

// ── the ext plugin's OWNERSHIP-ZONE rosters (owner ruling 2026-08-18). They live in
// THIS zero-import module so plugin-ext/code.ts (sandbox bundle, must not drag the
// engine in via payload.ts) and payload.ts/ext-override-audit share ONE source —
// prefix-keyed behavior died with the sweep (a rename disarms it silently; a roster
// import breaks the build instead).
// Contract-invariant rows: never brand-overridable, skipped by the override diff,
// asserted never-diffing by ext-override-audit. utility/ rows are team-owned and
// equally never overridable — the combined test is EXT_NON_OVERRIDABLE.
export const CONTRACT_INVARIANT_ROWS: ReadonlySet<string> = new Set([
  'base/absolute/black', 'base/absolute/white',
  'base/alpha/transparent', 'base/alpha/ink',
  'base/alpha/006', 'base/alpha/008', 'base/alpha/016',
])
export const EXT_NON_OVERRIDABLE = (p: string): boolean =>
  CONTRACT_INVARIANT_ROWS.has(p) || p.startsWith('utility/')
// Brand-VARYING system-descended rows — the only non-family base/ paths extensions
// may override: the link trio with its inverse leaves (owner regroup 2026-08-20:
// the ink-30 inverse lives INSIDE the link group as inverse/inverse-hover/
// inverse-pressed, so one prefix covers both trios) and the identity absolutes.
export const EXT_OVERRIDABLE_SYSTEM = (p: string): boolean =>
  p.startsWith('base/link/')
  || p === 'base/absolute/primary' || p === 'base/absolute/alt'

// Canonical emit order, uniform across every ramp (the white-label remap shape,
// an explicit requirement of the original concept). Paper (1–3), wash (4–7),
// then the focus ring (wax-74 — clamped to WCAG
// 1.4.11 3:1 non-text contrast vs paper-95) read as one contiguous ladder, then
// the text stops (lead-53 / ink-42 / ink-30 — the first doubles as the
// emphasis fill), then the pulled-out off-scale stamp family + stamp-on, then
// identity. A ramp skips tokens it doesn't have. Emitters sort by this, not by
// stop number.
// The ladder half DERIVES from SHARED_NAMES (integer keys enumerate ascending, and
// ascending stop index IS descending LL), so a stop relabel edits one table, not two.
const TOKEN_ORDER = [
  ...Object.values(SHARED_NAMES),
  STAMP_FILL, STAMP_FILL_HOVER, STAMP_FILL_PRESSED,
  STAMP_ON,
  'identity',
]
export function tokenOrder(name: string): number {
  const i = TOKEN_ORDER.indexOf(name)
  return i === -1 ? TOKEN_ORDER.length : i
}
