// The vocabulary: the scale's stop names, the stamp family, the neutral's poles, and the
// one grammar every emitter spells a row through. Zero imports: both plugin sandboxes
// bundle this module.

// The scale, identical for every family. The instrument word is the job; the number is
// 100 minus the light rootL, bigger is stronger. Generation is index-keyed: a relabel
// edits this table and nothing else (the chalk collision machinery spans stops 3 to 7 by
// index, the requirement declaration groups stops by band; neither reads a name).
const SHARED_NAMES: Record<number, string> = {
  1: 'paper-1',
  2: 'paper-3',
  3: 'paper-5',
  4: 'chalk-8',
  5: 'chalk-11',
  6: 'chalk-15',
  7: 'chalk-20',
  8: 'highlighter-26',
  // the pen band: the first text stop doubles as the emphasis fill, the between stop and
  // the strong stop follow; the three read as states are the text-style CTA (C49)
  9: 'pencil-47',
  10: 'pen-58',
  11: 'pen-70',
}

// how many stops a ramp array carries, derived from the table so a band change updates
// every consumer for free
export const SCALE_STOP_COUNT = Object.keys(SHARED_NAMES).length

export function stopTokenName(stop: number): string {
  const name = SHARED_NAMES[stop]
  if (!name) throw new Error(`stopTokenName: unexpected stop ${stop}`)
  return name
}

// The neutral's poles, off the index-keyed scale: paper-0 resolves (white in light, the
// deep tinted plane one seam below paper-1 in dark); pen-100 is the literal pole (black
// in light, white in dark). One spelling here; the emitters reference these.
export const PAPER_0 = 'paper-0'
export const PEN_100 = 'pen-100'

// The stamp family: five rows per family, each one word, flat beside the bands in every
// output. The three fills are positions on one progression (stateFillL in archetypes.ts,
// one apparent step per state for every family): stamp-0 is the fill at rest, stamp-1 the
// fill one step from rest, stamp-2 two steps. No row carries a state word; a consumer's
// semantic layer names the states and aliases the steps. The identifiers keep the engine's
// internal vocabulary (cta, hover, pressed), the way the internals still say cta; the
// emitted word is the position. Consumers that recognize a row by its name import these,
// so a rename breaks their build instead of silently disarming a check.
export const STAMP_FILL = 'stamp-0'
export const STAMP_FILL_HOVER = 'stamp-1'
export const STAMP_FILL_PRESSED = 'stamp-2'
export const STAMP_EDGE = 'stamp-edge'
export const STAMP_ON = 'stamp-on'

// ── THE ONE GRAMMAR ──────────────────────────────────────────────────────────
// Every emitted row has one path: a group and one word, and the word is a position (a
// band at a lightness, the stamp at a step, a link posture at a step). Joined with
// hyphens it is the CSS custom property (`--brand-stamp-0`, `--neutral-paper-0`,
// `--link-default-0`); joined with slashes it is the Figma path and the DTCG token path
// (`brand/stamp-0`, `neutral/paper-0`, `link/default-0`). The path decides the spelling;
// no emitter spells a name by hand. Family rows are [family, leaf]; the neutral's poles
// sit in the neutral group; the link rows and the two seed absolutes are their own groups
// (C68).
export type TokenPath = readonly string[]
export const cssVarName = (path: TokenPath): string => `--${path.join('-')}`
export const figmaPathOf = (path: TokenPath): string => path.join('/')
/** a family row: a scale stop, a pole, or a stamp row, flat in the family group */
export const familyPath = (family: string, leaf: string): string[] => [family, leaf]

// the system link: one trio for text on the papers, one re-solved for text on the pen
// ground. The engine's three states are the steps of one progression (hoverL and
// pressedL in archetypes.ts: pressed continues hover's direction, doubled), so a link row
// is its posture at a step, one word: default-0 is the link at rest, default-1 one step
// from rest, default-2 two steps; the same for inverse.
export const LINK_GROUP = 'link'
export const LINK_POSTURES = ['default', 'inverse'] as const
export type LinkPosture = (typeof LINK_POSTURES)[number]
export const LINK_STATES = ['enabled', 'hover', 'pressed'] as const
export type LinkState = (typeof LINK_STATES)[number]
/** the step each state is emitted as: rest 0, one step 1, two steps 2 */
export const LINK_STEP: Record<LinkState, number> = { enabled: 0, hover: 1, pressed: 2 }
/** the one word a link row has: its posture at its step (`default-1`) */
export const linkLeaf = (posture: LinkPosture, state: LinkState): string => `${posture}-${LINK_STEP[state]}`
export const linkPath = (posture: LinkPosture, state: LinkState): string[] => [LINK_GROUP, linkLeaf(posture, state)]

// the seed absolutes: the brand inputs as given, reference values, never UI colors
export const ABSOLUTE_GROUP = 'absolute'
export const absolutePath = (family: string): string[] => [ABSOLUTE_GROUP, family]

// (the paper overlays are parked: nothing emits them; the solve lives in alphaPapers.ts
// under audit:alpha, and a file that holds their rows keeps them in place)

// The color group: the category word a color path starts with where the consumer's
// grammar puts the category first. The extended plugin writes every engine row under it
// (color/brand/pencil-47), and a caller of tokensToDtcg passes the same word to nest the
// documents under it. The CSS names do not carry it. Hand-authored color roles share the
// group in Figma; the plugin knows its own rows by their stamp, never by the name. The
// canonicalizing strip in tokenDescriptions.ts spells the word itself, because that module
// takes no imports.
export const COLOR_GROUP = 'color'

// Brand-varying rows outside the families are the only non-family paths an extension may
// override: the link rows and the seed absolutes.
export const EXT_OVERRIDABLE_SYSTEM = (p: string): boolean =>
  p.startsWith(`${COLOR_GROUP}/${LINK_GROUP}/`) || p.startsWith(`${COLOR_GROUP}/${ABSOLUTE_GROUP}/`)

// Canonical emit order, uniform across every ramp: the papers, the chalks, the
// highlighter, the text stops, then the stamp family. A ramp skips tokens it does not
// have. Emitters sort by this, not by stop number. The ladder half derives from
// SHARED_NAMES (integer keys enumerate ascending, and ascending stop index is descending
// lightness), so a stop relabel edits one table.
const TOKEN_ORDER = [
  ...Object.values(SHARED_NAMES),
  STAMP_FILL, STAMP_FILL_HOVER, STAMP_FILL_PRESSED,
  STAMP_ON,
]
export function tokenOrder(name: string): number {
  const i = TOKEN_ORDER.indexOf(name)
  return i === -1 ? TOKEN_ORDER.length : i
}
