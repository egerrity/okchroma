// Single source of truth for the stop→name mapping shared by every emitter
// (cssRender, figmaRender, and — via the demo's Figma export — the plugin).
// The scale is ONE continuous 1–12 ladder, placed on the perceptual-lightness
// curve (perceptualL.ts) so every rung reads at a consistent perceived lightness
// across hue. Token names follow scale POSITION, identically for every family:
//
//   1–8     paper / wash / accent   (the scale steps)
//   9–10    highlight-9 / highlight-10   (the emphasis rung)
//   11–12   ink-11 / ink-12   (text)
//
// The cta is NOT a scale step — it is the off-scale, archetype-dependent brand
// fill (cta-1 / cta-2), held in dedicated GeneratedScale fields and emitted by
// name by each emitter, never from this positional table. on-fill text polarity
// splits into on-cta (the cta) and on-highlight (the rung) — see onFillTokenName.
// (See ENGINE-SPEC §0.)

// RampKind selects the on-fill token NAME only (on-cta vs on-highlight); stop
// naming is purely positional and no longer branches on kind. Both emitters render
// every family (brand/secondary/neutral/signals) the same way, calling
// onFillTokenName('brand') for on-cta and onFillTokenName('neutral') for on-highlight.
export type RampKind = 'brand' | 'neutral'

// Scale + text-role names — positional, identical for every family.
const SHARED_NAMES: Record<number, string> = {
  1: 'paper-1',
  2: 'paper-2',
  3: 'wash-3',
  4: 'wash-4',
  5: 'wash-5',
  6: 'accent-6',
  7: 'accent-7',
  8: 'accent-8',
  11: 'ink-11',
  12: 'ink-12',
}

// Map an engine stop number to its emitted token name. Naming is PURELY
// POSITIONAL: 1–8 are the scale (paper/wash/accent), 9/10 are the highlight rung,
// 11/12 are the text stops — the same for every family. The cta is off-scale and
// is emitted by name directly by each emitter, never through this table.
export function stopTokenName(stop: number): string {
  if (stop === 9) return 'highlight-9'
  if (stop === 10) return 'highlight-10'
  const name = SHARED_NAMES[stop]
  if (!name) throw new Error(`stopTokenName: unexpected stop ${stop}`)
  return name
}

// The on-fill text token name for a ramp role — the byte-identical split of the
// old single `on-fill`. 'brand' → `on-cta` (text on the cta fill); 'neutral' →
// `on-highlight` (text on the highlight rung). Every emitted family carries BOTH
// (it has both a cta and a highlight), so the emitters call this twice per family.
export function onFillTokenName(kind: RampKind): string {
  return kind === 'brand' ? 'on-cta' : 'on-highlight'
}

// Canonical emit order, uniform across every ramp (the white-label remap shape,
// an explicit requirement of the original concept). The scale 1–8 (paper/wash/
// accent) then the highlight rung (highlight-9/10 + on-highlight) read as one
// contiguous ladder, then the text stops (ink-11/12), then the pulled-out
// off-scale cta (cta-1/2 + on-cta), then identity. A ramp skips tokens it doesn't
// have. Emitters sort by this, not by stop number.
const TOKEN_ORDER = [
  'paper-1', 'paper-2', 'wash-3', 'wash-4', 'wash-5', 'accent-6', 'accent-7', 'accent-8',
  'highlight-9', 'highlight-10', 'on-highlight',
  'ink-11', 'ink-12',
  'cta-1', 'cta-2', 'on-cta',
  'identity',
]
export function tokenOrder(name: string): number {
  const i = TOKEN_ORDER.indexOf(name)
  return i === -1 ? TOKEN_ORDER.length : i
}
