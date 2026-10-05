// Audit fixture: a small, intentional color set for the engine's own instruments (the
// audits under scripts/). The fixture has exactly one job, to exercise the engine, so
// entries are named for WHAT THEY EXERCISE, not what they'd look like in a product picker.
//
// Coverage: every archetype band (near-black/dark/rich/vivid/bright/light, via L), the
// red-band and orange-side colliders, a warning-adjacent gold, an achromatic/near-neutral
// input, the `deeper` style lever and one archetypeOverride. The hexes are frozen: the
// blessed snapshots are keyed to these slugs and hold these values, so changing a hex
// moves every snapshot that reads it. Two entries sit outside the band their section
// header names: near-black-purple classifies dark and pastel-pink classifies bright.

export interface Fixture {
  name: string
  slug: string
  hex: string
  // Ship the hex as given: the brand's ramp and stamp take none of the recommended-mode
  // moves (no on-fill enforcement, no red-band solve, no dark chroma curve or dark red
  // cool). The signals still move around it.
  exact?: boolean
  // Anchors the stamp at the named band's median lightness in place of the seed's own.
  // The red-band solve is off for it; enforcement and the clearance stay on.
  archetypeOverride?: 'near-black' | 'dark' | 'rich' | 'vivid' | 'bright' | 'light'
  // Style lever. Unset = default.
  //   deeper      acts only where the seed sits in the semi-muted warm band (flag × band,
  //               never the flag alone): there it raises the ramp's envelope blend weight
  //   full-chroma releases the ramp's vividness cap and the brand's dark stamp trim, on
  //               any hue
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
