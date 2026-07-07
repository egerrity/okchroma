// The bulk test roster (owner 2026-07-07): the edge-case brand set applied in one batch
// from the plugin's footer action. Names ARE the extension names; every hex was verified
// through the real pipeline (signal shifts, archetype bands, override counts) and the
// roster is snapshot-gated alongside the demo set in scripts/ext-override-audit.ts.
//
// Groups:
//   canary     okchroma = the base seed itself — its extension must show ZERO overrides
//   real       the themes unify carries today (+ monochrome with a true-grey neutral)
//   colliders  bare color names (owner call): red moves the BRAND cta (red-band design,
//              #EE3123 → cta #680000); yellow/green/indigo move the SIGNAL (→ lemon /
//              yellow-side / info-color→blue). blue doubles as info-color→magenta.
//   archetypes one per band; arch-bright also shows the wcag-only (lane-dependent)
//              green shift; near-black + dark carry the 'deeper' style lever.

import type { NeutralLevel } from '../src/engine/colorEngine'
import type { ThemeSpec } from './payload'

export interface RosterEntry {
  name: string
  hex: string
  neutralLevel?: NeutralLevel
  style?: 'default' | 'deeper' | 'full-chroma'
  // Recorded for the smarter-secondary iteration — the bulk action does NOT apply it.
  plannedSecondaryHex?: string
  note: string
}

export const ROSTER: RosterEntry[] = [
  // Named to self-describe in the collection picker: it LOOKS like a duplicate of the
  // base on purpose — the diff-correctness check, an extension that inherits everything.
  { name: 'seed-canary', hex: '#E93D82', note: 'the base seed as a brand — zero overrides expected' },
  { name: 'fis-eggplant', hex: '#532371', plannedSecondaryHex: '#4BCD3E', note: 'real theme' },
  { name: 'blue', hex: '#044BAF', note: 'legacy default · info-color → magenta' },
  { name: 'orange', hex: '#BC3F01', note: 'real theme, warm' },
  { name: 'teal', hex: '#005C7A', note: 'real theme, cool' },
  { name: 'monochrome', hex: '#6E6E6E', neutralLevel: 'pure', note: 'achromatic + true-grey neutral' },
  { name: 'red', hex: '#EE3123', note: 'red band — brand cta resolves deep' },
  { name: 'yellow', hex: '#F5B301', note: 'yellow → lemon' },
  { name: 'green', hex: '#22A559', note: 'green → yellow-side' },
  { name: 'indigo', hex: '#4F46E5', note: 'info-color → blue' },
  { name: 'arch-near-black', hex: '#07074F', style: 'deeper', note: 'near-black + deeper' },
  { name: 'arch-dark', hex: '#003359', style: 'deeper', note: 'dark + deeper' },
  { name: 'arch-rich', hex: '#860249', note: 'rich band' },
  { name: 'arch-vivid', hex: '#2081E2', note: 'vivid band (L .60), shift-free' },
  { name: 'arch-bright', hex: '#4CCFB3', note: 'bright band — wcag-only green shift' },
  { name: 'arch-light', hex: '#FDCB6E', note: 'light band — lemon shift' },
]

// The ThemeSpec the bulk action resolves — secondary-off across the board (iteration-1
// posture; plannedSecondaryHex activates in the smarter-secondary iteration).
export const rosterSpec = (e: RosterEntry): ThemeSpec => ({
  primaryHex: e.hex,
  name: e.name,
  style: e.style,
  secondaryHex: null,
})
