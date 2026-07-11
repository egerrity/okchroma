

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
  10: 'ink-10',
  11: 'ink-11',
}

export function stopTokenName(stop: number): string {
  // highlight-10 DELETED (owner 2026-07-09); the ink stops were later renumbered
  // down to close the gap (owner 2026-07-10): ink-11→ink-10, ink-12→ink-11, and
  // the off-scale anchor ink-13→ink-12. Scale is contiguous 1–11 again.
  if (stop === 9) return 'highlight-9'
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
// the highlight group (highlight-8/9 — stop 8 is clamped to WCAG 1.4.11 3:1
// non-text contrast vs paper-2 — + on-highlight) read as one contiguous ladder,
// then the text stops (ink-10/11), then the pulled-out off-scale cta (cta-1/2 +
// on-cta), then identity. A ramp skips tokens it doesn't have. Emitters sort by
// this, not by stop number.
const TOKEN_ORDER = [
  'paper-1', 'paper-2', 'wash-3', 'wash-4', 'wash-5', 'wash-6', 'wash-7',
  'highlight-8', 'highlight-9', 'on-highlight',
  'ink-10', 'ink-11',
  'cta-1', 'cta-2', 'on-cta',
  'identity',
]
export function tokenOrder(name: string): number {
  const i = TOKEN_ORDER.indexOf(name)
  return i === -1 ? TOKEN_ORDER.length : i
}
