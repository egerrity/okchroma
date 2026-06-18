export interface Brand {
  name: string
  slug: string
  hex: string
  demo: boolean
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

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function b(name: string, hex: string, demo = false, style?: Brand['style']): Brand {
  return { name, slug: slug(name), hex, demo, style }
}

// Representative color set — exercises every archetype, collision case,
// style lever, and hue zone. Named after drinks for easy reference.
export const BRANDS: Brand[] = [
  // ── near-black (L 0.00–0.25) ──
  b('Dark Roast',       '#07074F', false, 'deeper'),   // deep indigo
  b('Turkish Coffee',   '#0C0A4E', false, 'deeper'),   // near-black blue-purple
  b('Black Currant',    '#2D1B69'),                     // near-black purple (synthetic — fills purple gap)

  // ── dark (L 0.25–0.40) ──
  b('Espresso',         '#003359', false, 'deeper'),    // dark navy, deeper style
  b('Cold Brew',        '#003865', true),               // dark blue
  b('Butterfly Pea',    '#2A1770', true),               // dark violet
  b('Rooibos',          '#800000'),                     // dark red — RED-BAND collider
  b('Pu-erh',           '#650E0D', false, 'deeper'),    // dark red-brown — RED-BAND + deeper

  // ── rich (L 0.40–0.55) ──
  b('Peppermint',       '#00704A', true),               // rich green
  b('Blueberry',        '#005EB8'),                     // rich blue
  b('Hibiscus',         '#C61D1B'),                     // rich red — RED-BAND collider
  b('Cranberry',        '#A50034'),                     // rich red-pink — RED-BAND collider
  b('Rose Hip',         '#860249'),                     // rich magenta-pink
  b('Taro Latte',       '#623E7C'),                     // rich purple
  b('Lavender Latte',   '#5E4877', false, 'deeper'),    // rich purple, deeper
  b('Hojicha',          '#67483C', true),               // rich warm brown — ORANGE-SIDE (low C)
  b('Ube Latte',        '#6C5CE7'),                     // saturated purple (synthetic)

  // ── vivid (L 0.55–0.65) ──
  b('Chili Mocha',      '#EE3123', true),               // vivid red — RED-BAND collider
  b('Turmeric Latte',   '#E35205'),                     // vivid orange — ORANGE-SIDE collider
  b('Matcha',           '#039547', true, 'deeper'),     // vivid green, deeper
  b('Dragonfruit',      '#E84393', true),               // vivid pink (synthetic — fills pink gap)

  // ── bright (L 0.65–0.85) ──
  b('Chai',             '#E8742C', true),               // bright orange — ORANGE-SIDE
  b('Sencha',           '#52B246', true),                // bright green
  b('Mint Julep',       '#4CCFB3', true),               // bright teal
  b('Blue Lagoon',      '#05C3DE', true),               // bright cyan
  b('Earl Grey',        '#8CADD7', false, 'deeper'),    // bright periwinkle, deeper
  b('Golden Milk',      '#ECAD2F'),                     // bright gold — WARNING-adjacent
  b('Strawberry Milk',  '#F8A5C2', true),               // bright pastel pink (synthetic)
  b('Oat Milk',         '#B8B8B8'),                     // near-neutral achromatic (synthetic)

  // ── light (L 0.85–1.00) ──
  b('Chamomile',        '#FAD037', true),               // light yellow — WARNING collider
  b('Honey Lemon',      '#FDCB6E'),                     // light warm pastel (synthetic)
]

// Exercise the exact flag and archetypeOverride on specific brands
BRANDS.find(b => b.slug === 'turmeric-latte')!.exact = true
BRANDS.find(b => b.slug === 'rooibos')!.archetypeOverride = 'rich'

export const DEMO_BRANDS = BRANDS.filter(b => b.demo)
