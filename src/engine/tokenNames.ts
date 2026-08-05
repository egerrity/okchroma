

// (RampKind + onFillTokenName DELETED with the highlight band, owner 2026-07-29: the
// split existed so a ramp's on-fill could land at `on-cta` or `on-highlight`. With
// on-highlight gone every family emits exactly one on-fill token, `on-cta`, and every
// call site already passed 'brand'.)

const SHARED_NAMES: Record<number, string> = {
  1: 'paper-1',
  2: 'paper-2',
  // stop 3 renamed wash-3 → paper-3 (owner 2026-07-24, elevation round): it is a
  // PLANE in both themes (light sink / dark pop), so it belongs to the surface band.
  // NAME ONLY — generation is index-keyed and unchanged; the internal wash machinery
  // (reqtoken groupOf, collision WASH_STOPS) deliberately still spans stops 3–7.
  3: 'paper-3',
  4: 'wash-4',
  5: 'wash-5',
  6: 'wash-6',
  7: 'wash-7',
  8: 'highlight-8',
  // THE INK BAND (C49, owner 2026-08-05): ink-9 the first text stop + emphasis fill
  // (the 2026-07-29 highlight collapse — highlight-9 and on-highlight are deleted;
  // ink-9 carries both jobs, its on-color a paper token), ink-10 the between text
  // stop (the value cta-ink-hover used to generate bespokely, promoted to a normal
  // stop the trio aliases), ink-11 the strong text stop. C49 restored the top two
  // pre-collapse numbers (11, and the off-scale anchor's 12 — emitted as a literal
  // in cssRender, not through this table) with the between stop taking the vacated 10.
  9: 'ink-9',
  10: 'ink-10',
  11: 'ink-11',
}

// How many stops a ramp array carries — DERIVED from the name table, so a band collapse or a
// renumber updates it for free. Added 2026-07-29 because gamut-sweep hardcoded `!== 11` and had
// been failing "MALFORMED … light=10 dark=10" on every seed since C33 took the scale to 10.
export const SCALE_STOP_COUNT = Object.keys(SHARED_NAMES).length

export function stopTokenName(stop: number): string {
  const name = SHARED_NAMES[stop]
  if (!name) throw new Error(`stopTokenName: unexpected stop ${stop}`)
  return name
}

// Canonical emit order, uniform across every ramp (the white-label remap shape,
// an explicit requirement of the original concept). Paper (1–3) / wash (4–7) then
// the focus ring (highlight-8 — clamped to WCAG 1.4.11 3:1 non-text contrast vs
// paper-3) read as one contiguous ladder, then the text stops (ink-9/10/11 —
// ink-9 doubles as the emphasis fill), then the pulled-out off-scale cta family +
// on-cta, then identity. A ramp skips tokens it doesn't have. Emitters sort by
// this, not by stop number.
// The cta family is SEMANTIC-named (owner ruling 2026-07-16: states, never options —
// cta-1/cta-2 renamed in place to cta/cta-hover via both plugins' RENAMED_LEAVES;
// pressed + the cta-ink trio, the 4.5 text-register link escape, added with it).
const TOKEN_ORDER = [
  'paper-1', 'paper-2', 'paper-3', 'wash-4', 'wash-5', 'wash-6', 'wash-7',
  'highlight-8',
  'ink-9', 'ink-10', 'ink-11',
  'cta', 'cta-hover', 'cta-pressed',
  'cta-ink', 'cta-ink-hover', 'cta-ink-pressed',
  'cta-ink-strong', 'cta-ink-strong-hover', 'cta-ink-strong-pressed',
  'on-cta',
  'identity',
]
export function tokenOrder(name: string): number {
  const i = TOKEN_ORDER.indexOf(name)
  return i === -1 ? TOKEN_ORDER.length : i
}
