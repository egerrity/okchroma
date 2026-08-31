// Audit fixture — a small, intentional color set for the engine's own instruments
// (dark-audit, band-audit, divergence-audit, smoothness-audit, ext-override-audit,
// figma-verify). Replaces the old 32-drink representative set (src/brands.ts,
// src/secondaries.ts — deleted): those fed a hidden demo gallery as well as the audits,
// so they carried demo-facing concerns (display names, a `demo` flag, a nav picker).
// This fixture has exactly one job — exercise the engine — so entries are named for
// WHAT THEY EXERCISE, not what they'd look like in a product picker.
//
// Coverage: every archetype band (near-black/dark/rich/vivid/bright/light, via L), the
// red-band and orange-side colliders, a warning-adjacent gold, an achromatic/near-neutral
// input, and both style-lever registers (`deeper`, plus the archetypeOverride escape
// hatch). Hexes are copied EXACTLY from the retired drink set (same slugs' hex values)
// so a re-bless stays value-comparable against snapshots blessed under that set.

export interface Fixture {
  name: string
  slug: string
  hex: string
  // Ship the exact hex, skip recommended-mode adjustments (preventive
  // shear, rung-1 archetype moves). Collisions resolve at the component
  // level only (rung 3).
  exact?: boolean
  // Replaces the computed rung-1 direction with a specific archetype,
  // keeping shear and the rest of recommended mode.
  archetypeOverride?: 'near-black' | 'dark' | 'rich' | 'vivid' | 'bright' | 'light'
  // Style lever, set by a human at intake (decision doc 2026-06-11).
  // Modulates style registers ONLY where the color sits in the ambiguous
  // semi-muted warm band (flag × band, never flag alone); truth decisions
  // and universal rules run after and regardless. Unset = default.
  //   deeper      band colors resolve DOWN: deeper, browner, never brighter
  //   full-chroma band colors stay loud: never mute, never cream
  style?: 'default' | 'deeper' | 'full-chroma'
}

function f(name: string, hex: string, opts?: Partial<Pick<Fixture, 'exact' | 'archetypeOverride' | 'style'>>): Fixture {
  return { name, slug: name, hex, ...opts }
}

export const FIXTURES: Fixture[] = [
  // ── near-black (L 0.00–0.25) ──
  f('near-black-indigo',              '#07074F', { style: 'deeper' }),
  f('near-black-purple',              '#2D1B69'),

  // ── dark (L 0.25–0.40) ──
  f('dark-blue',                      '#003865'),
  f('dark-red-collider',              '#800000', { archetypeOverride: 'rich' }),   // RED-BAND

  // ── rich (L 0.40–0.55) ──
  f('rich-green',                     '#00704A'),
  f('rich-red-collider',              '#C61D1B'),                                  // RED-BAND
  f('low-chroma-brown',               '#67483C'),                                  // ORANGE-SIDE, low C

  // ── vivid (L 0.55–0.65) ──
  f('vivid-red-collider',             '#EE3123'),                                  // RED-BAND
  f('vivid-orange-collider',          '#E35205'),                                  // ORANGE-SIDE
  f('vivid-pink',                     '#E84393'),

  // ── bright (L 0.65–0.85) ──
  f('bright-gold-warning-adjacent',   '#ECAD2F'),
  f('bright-teal',                    '#4CCFB3'),
  f('achromatic',                     '#B8B8B8'),                                  // near-neutral

  // ── light (L 0.85–1.00) ──
  f('light-yellow-collider',          '#FAD037'),                                  // WARNING collider
  f('pastel-pink',                    '#F8A5C2'),
]

// Secondary (accent) colors — same input contract as primaries: any hex,
// resolved by the engine. Only the entries that need accent coverage carry one.
export const FIXTURE_SECONDARIES: Record<string, string> = {
  'near-black-indigo':            '#C8A35D',
  'dark-red-collider':            '#F6A800',
  'rich-green':                   '#B18D0B',
  'rich-red-collider':            '#005DA3',
  'vivid-red-collider':           '#044BAF',
  'vivid-orange-collider':        '#031B41',
  'vivid-pink':                   '#6C5CE7',
  'bright-gold-warning-adjacent': '#464A4E',
  'light-yellow-collider':        '#221F1F',
  'pastel-pink':                  '#C2185B',
}
