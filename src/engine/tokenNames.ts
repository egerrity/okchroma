// Single source of truth for the stop→name mapping shared by every emitter
// (cssRender, figmaRender, and — via the demo's Figma export — the plugin).
// The scale is ONE continuous 1–12 ladder, placed on the perceptual-lightness
// curve (perceptualL.ts) so every rung reads at a consistent perceived lightness
// across hue. Token names follow scale POSITION:
//
//   1–8     paper / wash / accent   (surface scale)
//   9–10    highlight-9 / highlight-10   (emphasis chip)
//   11–12   ink-11 / ink-12   (text)
//
// This reverses the earlier "highlight/ink are roles numbered -1/-2" scheme —
// the curve makes them scale steps again, so they re-join the 1–12 ladder.
//
// The cta is the exception: NOT a scale step but the brand-identity fill, pinned
// at the archetype lightness, so it keeps role-numbered names (cta-1 / cta-2) and
// its math is never touched by the curve. The only per-ramp asymmetry: brand &
// secondary expose stop 9/10 as the cta; neutral & signals expose theirs as the
// highlight fill (it IS their emphasis chip).

// 'brand' covers brand + secondary (CTA-bearing); 'neutral' covers neutral +
// every signal (highlight-bearing). The split is purely about what stop 9/10
// and the on-fill text are called.
export type RampKind = 'brand' | 'neutral'

// Surface-scale + text-role names that are identical for every ramp kind.
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

// Additive Stage-2 role stops carry engine stop numbers ABOVE the 1–12 scale
// (kept off scale.light/dark so the blessed 12-stop snapshot is untouched).
// Every brand-kind ramp (brand/secondary/neutral/signals) carries 13/14 — the
// highlight rung below the cta.
const EXT_NAMES: Record<number, string> = {
  13: 'highlight-9',
  14: 'highlight-10',
}

// Map an engine stop number to its emitted token name for the ramp kind.
// Stops 1–8 are the surface scale; stops 9/10 are the emphasis fill roles
// (cta-1/cta-2 on brands, highlight-1/highlight-2 on neutral+signals); 11/12 are
// the pulled-out text roles; 13+ are the Stage-2 additive role stops (EXT_NAMES).
export function stopTokenName(stop: number, kind: RampKind): string {
  if (stop === 9) return kind === 'brand' ? 'cta-1' : 'highlight-9'
  if (stop === 10) return kind === 'brand' ? 'cta-2' : 'highlight-10'
  if (EXT_NAMES[stop]) return EXT_NAMES[stop]
  const name = SHARED_NAMES[stop]
  if (!name) throw new Error(`stopTokenName: unexpected stop ${stop}`)
  return name
}

// The on-fill text token name for each ramp kind — the byte-identical split of
// the old single `on-fill`. brand/secondary fills carry text on `cta`, so it's
// `on-cta`; neutral/signal fills carry text on `highlight`, so `on-highlight`.
export function onFillTokenName(kind: RampKind): string {
  return kind === 'brand' ? 'on-cta' : 'on-highlight'
}

// Canonical emit order, uniform across every ramp (the white-label remap shape,
// an explicit requirement of the original concept). The surface scale 1–8
// (paper/wash/accent) reads as one contiguous linear ramp, THEN the pulled-out
// roles — the emphasis fills (cta/highlight) are NOT scale steps, so they emit
// below the scale alongside their on-fill text. A ramp simply skips the tokens
// it doesn't have. Emitters sort by this, not by stop number.
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
