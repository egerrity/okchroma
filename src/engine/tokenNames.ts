

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
  8: 'mark-74-aa',
  // THE INK BAND (C49, owner 2026-08-05): the first text stop + emphasis fill (the
  // 2026-07-29 highlight collapse — the old highlight-9 and on-highlight are
  // deleted; this stop carries both jobs, its on-color a paper token), the between
  // text stop (a value the retired text-cta hover state used to generate bespokely,
  // promoted to a normal stop), and the strong text stop. The three read as states
  // ARE the text-style cta (owner 2026-08-12). C49 restored the top
  // two pre-collapse stop INDICES (11, and the off-scale anchor's 12 — emitted as a
  // literal in cssRender, not through this table) with the between stop taking the
  // vacated index 10; the indices (9/10/11) are unchanged since.
  9: 'ink-53-aa',
  10: 'ink-42-aa',
  11: 'ink-30-aaa',
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

// THE SOLID FAMILY (owner rename round 2026-08-18, replacing the cta words —
// stakeholder ruling: cta read as a semantic token). Flat engine identity =
// hyphenated Figma path = CSS var body, one spelling everywhere: solid-fill /
// solid-fill-hover / solid-fill-pressed / solid-edge / solid-on. In Figma the
// family still nests as the solid/ state group (fill, fill-hover, fill-pressed,
// edge, on) — SOLID_STATE_LEAVES below is the one flat↔nested table every
// consumer must ride (figmaRender, both plugins, figma-verify).
export const SOLID_FILL = 'solid-fill'
export const SOLID_FILL_HOVER = 'solid-fill-hover'
export const SOLID_FILL_PRESSED = 'solid-fill-pressed'
export const SOLID_EDGE = 'solid-edge'
export const SOLID_ON = 'solid-on'
// flat engine name → nested Figma leaf (the ONLY divergence between the two
// spellings is this slash; code syntax re-hyphenates it back to the flat name)
export const SOLID_STATE_LEAVES: Record<string, string> = {
  [SOLID_FILL]: 'solid/fill',
  [SOLID_FILL_HOVER]: 'solid/fill-hover',
  [SOLID_FILL_PRESSED]: 'solid/fill-pressed',
  [SOLID_EDGE]: 'solid/edge',
  [SOLID_ON]: 'solid/on',
}
// the nested Figma spellings, for consumers that recognize rows by their written
// path (both plugins' alias wiring, figma-verify) — importing these instead of
// spelling the strings means a future rename breaks the build instead of silently
// disarming a check (the highlight/on lesson, sweep 2026-08-18)
export const SOLID_LEAF = {
  FILL: SOLID_STATE_LEAVES[SOLID_FILL],
  FILL_HOVER: SOLID_STATE_LEAVES[SOLID_FILL_HOVER],
  FILL_PRESSED: SOLID_STATE_LEAVES[SOLID_FILL_PRESSED],
  EDGE: SOLID_STATE_LEAVES[SOLID_EDGE],
  ON: SOLID_STATE_LEAVES[SOLID_ON],
} as const

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
// may override: the link trio and the identity absolutes.
export const EXT_OVERRIDABLE_SYSTEM = (p: string): boolean =>
  p.startsWith('base/link/') || p === 'base/absolute/primary' || p === 'base/absolute/secondary'

// Canonical emit order, uniform across every ramp (the white-label remap shape,
// an explicit requirement of the original concept). Paper (1–3), wash (4–7),
// then the focus ring (mark-74-aa — clamped to WCAG
// 1.4.11 3:1 non-text contrast vs paper-95) read as one contiguous ladder, then
// the text stops (ink-53-aa / ink-42-aa / ink-30-aaa — the first doubles as the
// emphasis fill), then the pulled-out off-scale solid family + solid-on, then
// identity. A ramp skips tokens it doesn't have. Emitters sort by this, not by
// stop number.
const TOKEN_ORDER = [
  'paper-99', 'paper-97', 'paper-95',
  'wash-92', 'wash-89', 'wash-85', 'wash-80',
  'mark-74-aa',
  'ink-53-aa', 'ink-42-aa', 'ink-30-aaa',
  SOLID_FILL, SOLID_FILL_HOVER, SOLID_FILL_PRESSED,
  SOLID_ON,
  'identity',
]
export function tokenOrder(name: string): number {
  const i = TOKEN_ORDER.indexOf(name)
  return i === -1 ? TOKEN_ORDER.length : i
}
