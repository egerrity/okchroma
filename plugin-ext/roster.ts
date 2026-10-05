// The edge-case brand set: the override audit's brand coverage
// (scripts/ext-override-audit.ts is its one consumer; the plugin does not import it).
//
//   eggplant                     a standalone theme with a supplied secondary
//   L1…L6-*                      one exemplar per archetype band (L IS the band axis;
//                                the digit is the band order)
//   monochrome                   achromatic primary + true-grey neutral
//   teal                         a standalone theme that collides with nothing (H229)
//   vs-*                         the colliders, named for the signal they stress (identity
//                                names). The vs-red pair is where the BRAND moves: the
//                                red-band escape is a LIGHTNESS move, so the pair is named
//                                by exit direction (one cta exits lighter, one darker).
//                                vs-yellow/green/blue are where the SIGNAL moves. Pairs
//                                cover both escape directions. Red-band coverage also
//                                sits in the audit fixture (scripts/fixture.ts).
//
// The roster is snapshot-gated alongside the fixture set in scripts/ext-override-audit.ts.
// The `note` fields are free-form and nothing reads them; the values some of them quote
// are not kept current (CATALOG C80).

import type { NeutralLevel } from '../src/engine/colorEngine'
import type { SecondaryStyle } from '../src/engine/resolve'
import type { ThemeSpec } from './payload'

export interface RosterEntry {
  name: string
  hex: string
  neutralLevel?: NeutralLevel
  style?: 'default' | 'deeper' | 'full-chroma'
  // A supplied secondary. An entry without one gets the derived secondary inside
  // buildBrandColumns.
  secondaryHex?: string
  // The secondary's render mode. NOTE THE OVERLOADED ID: `'default'` means the DERIVED posture
  // when no secondary is supplied at all, and the UI's "Custom" chip when one is; stored
  // recipes carry the id. With a hex present, as on every entry below that sets it, it
  // selects CUSTOM: the supplied colour keeps the whole ramp (byte-identical to exact) and
  // only the cta is a tint of it (C36). `'exact'` ships the hex as its own cta too.
  // Omitting the field falls to 'exact', so the entries below carry the style explicitly.
  secondaryStyle?: SecondaryStyle
  note: string
}

export const ROSTER: RosterEntry[] = [
  { name: 'eggplant', hex: '#532371', secondaryHex: '#4BCD3E', secondaryStyle: 'default', note: 'real theme + real secondary, from-brand (adds the group)' },
  { name: 'L1-near-black', hex: '#07074F', style: 'deeper', secondaryHex: '#C8A35D', secondaryStyle: 'default', note: 'near-black band + deeper (dark-roast accent)' },
  { name: 'L2-dark', hex: '#003359', style: 'deeper', secondaryHex: '#B3863D', secondaryStyle: 'default', note: 'dark band + deeper (espresso accent)' },
  { name: 'L3-rich', hex: '#A50034', secondaryHex: '#6DCDB8', secondaryStyle: 'default', note: 'rich band (cranberry)' },
  { name: 'L4-vivid', hex: '#E35205', secondaryHex: '#031B41', secondaryStyle: 'default', note: 'vivid band (turmeric latte — orange-side)' },
  { name: 'L5-bright', hex: '#05C3DE', secondaryHex: '#233D7D', secondaryStyle: 'default', note: 'bright band (L .75) (blue-lagoon accent)' },
  { name: 'L6-light', hex: '#FDCB6E', secondaryHex: '#4A8B2C', secondaryStyle: 'default', note: 'light band (lemon shift — light is inherently yellow-adjacent) (honey-lemon accent)' },
  { name: 'monochrome', hex: '#6E6E6E', neutralLevel: 'pure', secondaryHex: '#808080', secondaryStyle: 'default', note: 'achromatic + true-grey neutral (mid-grey secondary, from-brand)' },
  { name: 'teal', hex: '#005C7A', note: 'real theme, no collisions (H229)' },
  { name: 'vs-green (shifts lime)', hex: '#22A559', note: 'green → yellow-side, both lanes' },
  { name: 'vs-green (shifts teal)', hex: '#65C466', note: 'green → teal-side, wcag lane only' },
  { name: 'vs-blue (shifts cyan)', hex: '#4F46E5', note: 'blue → cyan-side, both lanes' },
  { name: 'vs-blue (no shift)', hex: '#044BAF', note: 'no collision since the seed lift — the magenta side is unreachable (accepted, C17)' },
  { name: 'vs-red (shifts light)', hex: '#EA3E3E', note: 'red collider — cta exits LIGHT (L .62→.78, #ff9084 both lanes); the C18 owner-verified seed' },
  { name: 'vs-red (shifts dark)', hex: '#E60000', note: 'red collider — cta exits DARK (L .58→.43, #900012 both lanes)' },
  { name: 'vs-yellow', hex: '#F5B301', note: 'yellow → lemon' },
]

// The ThemeSpec each entry resolves to. An entry without a secondaryHex gets the DERIVED
// default-model secondary inside buildBrandColumns, whose payload always carries a
// brand-alt.
export const rosterSpec = (e: RosterEntry): ThemeSpec => ({
  primaryHex: e.hex,
  name: e.name,
  style: e.style,
  secondaryHex: e.secondaryHex ?? null,
  secondaryStyle: e.secondaryStyle,
})
