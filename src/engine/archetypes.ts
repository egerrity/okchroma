export type Archetype = 'near-black' | 'dark' | 'rich' | 'vivid' | 'bright' | 'light'

export const ARCHETYPES: Array<{ name: Archetype; min: number; max: number; medianL: number }> = [
  { name: 'near-black', min: 0,    max: 0.25, medianL: 0.125 },
  { name: 'dark',       min: 0.25, max: 0.40, medianL: 0.325 },
  { name: 'rich',       min: 0.40, max: 0.55, medianL: 0.475 },
  { name: 'vivid',      min: 0.55, max: 0.65, medianL: 0.60  },
  { name: 'bright',     min: 0.65, max: 0.85, medianL: 0.75  },
  { name: 'light',      min: 0.85, max: 1.00, medianL: 0.925 },
]

export function classifyArchetype(L: number): Archetype {
  return (ARCHETYPES.find(a => L >= a.min && L < a.max) ?? ARCHETYPES[ARCHETYPES.length - 1]).name
}

export function medianLForArchetype(archetype: Archetype): number {
  return ARCHETYPES.find(a => a.name === archetype)!.medianL
}

// Hover formula: ΔL = 0.03 / (L + 0.1), direction flips at L=0.40
export function hoverL(L: number): number {
  const delta = 0.03 / (L + 0.1)
  return L < 0.40 ? L + delta : L - delta
}
