// The bulk test roster (owner-settled 2026-07-07, second revision): the edge-case brand
// set applied in one batch from the plugin's roster button. Names ARE the extension
// names, and they are DESIGNED FOR THE SIDEBAR'S ALPHABETICAL SORT — f < L < m < t < v
// yields the owner's group order with no visible ordering numbers:
//
//   fis-eggplant                 the one standalone real theme (planned secondary recorded)
//   L1…L6-*                      one pure exemplar per archetype band (L IS the band axis;
//                                the digit is the band order; all verified shift-free)
//   monochrome                   achromatic primary + true-grey neutral
//   teal                         standalone real-theme tester (H229 — collides with nothing)
//   vs-*                         the colliders, named for the signal they stress (identity
//                                names). vs-red pair = the BRAND moves (red-band design);
//                                vs-yellow/green/info-color = the SIGNAL moves. Pairs cover
//                                both escape directions; vs-green (shifts teal) is the
//                                wcag-lane-only exemplar; vs-red (warmer) #EA603E is the
//                                standing regression hex for the red-orange cool fix.
//
// Every hex verified through the real pipeline; the roster is snapshot-gated alongside
// the demo set in scripts/ext-override-audit.ts (which also asserts the seed-canary
// property computationally — the in-file canary extension was retired, owner call).

import type { NeutralLevel } from '../src/engine/colorEngine'
import type { SecondaryStyle } from '../src/engine/resolve'
import type { ThemeSpec } from './payload'

export interface RosterEntry {
  name: string
  hex: string
  neutralLevel?: NeutralLevel
  style?: 'default' | 'deeper' | 'full-chroma'
  // A real secondary the bulk action APPLIES (activated 2026-07-07 — fis is the
  // group-add exerciser: the batch's first apply flips the base's secondary posture on).
  secondaryHex?: string
  // The secondary's render mode (the 2026-07-13 offering): 'default' = FROM BRAND — the hex
  // runs through the derived model (lift transform, lands lighter than the primary); 'exact'
  // ships the hex as-is. Omitted falls to the engine's supplied-hex default ('exact'), so
  // roster entries carry the style explicitly.
  secondaryStyle?: SecondaryStyle
  note: string
}

export const ROSTER: RosterEntry[] = [
  { name: 'fis-eggplant', hex: '#532371', secondaryHex: '#4BCD3E', secondaryStyle: 'default', note: 'real theme + real secondary, from-brand (adds the group)' },
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
  { name: 'vs-info-color (shifts blue)', hex: '#4F46E5', note: 'info-color → blue' },
  { name: 'vs-info-color (shifts magenta)', hex: '#044BAF', note: 'info-color → magenta (the legacy unify blue)' },
  { name: 'vs-red (cooler)', hex: '#EE3123', note: 'cool of the red signal — separates healthily (cta #680000)' },
  { name: 'vs-red (warmer)', hex: '#EA603E', note: 'warm of the red signal — the dead-zone regression hex for the cool fix' },
  { name: 'vs-yellow', hex: '#F5B301', note: 'yellow → lemon' },
]

// The ThemeSpec the bulk action resolves. Brands without a secondaryHex fall back to
// the DERIVED default-model secondary inside buildBrandColumns (written only when the file's
// posture is on — which fis's first apply turns on).
export const rosterSpec = (e: RosterEntry): ThemeSpec => ({
  primaryHex: e.hex,
  name: e.name,
  style: e.style,
  secondaryHex: e.secondaryHex ?? null,
  secondaryStyle: e.secondaryStyle,
})
