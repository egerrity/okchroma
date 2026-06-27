

export type RampKind = 'brand' | 'neutral'

const SHARED_NAMES: Record<number, string> = {
  1: 'paper-1',
  2: 'paper-2',
  3: 'wash-3',
  4: 'wash-4',
  5: 'wash-5',
  6: 'wash-6',
  7: 'wash-7',
  8: 'highlight-8',
  11: 'ink-11',
  12: 'ink-12',
}

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
// an explicit requirement of the original concept). Paper (1–2) / wash (3–7) then
// the highlight group (highlight-8/9/10 — stop 8 is clamped to WCAG 1.4.11 3:1
// non-text contrast vs paper-2 — + on-highlight) read as one contiguous ladder,
// then the text stops (ink-11/12), then the pulled-out off-scale cta (cta-1/2 +
// on-cta), then identity. A ramp skips tokens it doesn't have. Emitters sort by
// this, not by stop number.
const TOKEN_ORDER = [
  'paper-1', 'paper-2', 'wash-3', 'wash-4', 'wash-5', 'wash-6', 'wash-7',
  'highlight-8', 'highlight-9', 'highlight-10', 'on-highlight',
  'ink-11', 'ink-12',
  'cta-1', 'cta-2', 'on-cta',
  'identity',
]
export function tokenOrder(name: string): number {
  const i = TOKEN_ORDER.indexOf(name)
  return i === -1 ? TOKEN_ORDER.length : i
}
