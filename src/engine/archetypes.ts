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

// hoverL/pressedL — the ORIGINAL own-L state rule, now serving the cta-INK and link
// trios only (text-register states, owner-shaped 2026-07-16). Cta FILL trios ride
// stateFillL below (owner 2026-07-28: one rule, one apparent step, every family).
export function hoverL(L: number): number {
  const delta = 0.03 / (L + 0.1)
  return L < 0.40 ? L + delta : L - delta
}

// pressed = hover's direction, doubled (owner rule 2026-07-16): the same shape as hoverL
// with 2× the delta — the pressed state continues past hover, never crosses back.
export function pressedL(L: number): number {
  const delta = 0.06 / (L + 0.1)
  return L < 0.40 ? L + delta : L - delta
}

// ─── cta-fill states: one register, mode-aware (owner spec 2026-07-28: "they should
// all do the same thing and move the same amount of delta away from each other";
// magnitude corrected same day: equal APPARENT-L steps read unequal — visibility of
// a state change depends on the fill's distance from the page ground (crispening-
// compressed far from it), so the near-black light cta's equal step was
// imperceptible). MAGNITUDE = the original owner-tuned hoverL law, mode-mirrored:
// ΔL = k/(nearness-to-ground + 0.1), nearness = L in light (white ground) and 1−L
// in dark (black ground) — small steps near the page where crispening amplifies,
// growing toward the far pole where discrimination compresses. k = 0.03 hover;
// pressed 2× (doubled, never crosses back). No new constants: the light lane
// reproduces the shipped register hoverL always gave it. ───
const STATE_HOVER_K = 0.03
const STATE_L_MIN = 0.05, STATE_L_MAX = 0.98 // state rails, shy of the poles

export function stateStepL(restL: number, mode: 'light' | 'dark', k: 1 | 2): number {
  const nearness = mode === 'light' ? restL : 1 - restL
  return k * STATE_HOVER_K / (nearness + 0.1)
}

// The ARCHETYPE OVERRIDE (owner 2026-07-28, restoring the original hoverL switch):
// a fill already sitting in its travel direction's TERMINAL band flips the other
// way for visibility. Light mode travels toward black — fills in the near-black/
// dark archetypes (L below the 'rich' floor, the original 0.40 switch) lighten
// instead. Dark mode travels toward white — fills in the 'light' archetype
// (L at/above its floor, 0.85) darken instead. Both bounds read from ARCHETYPES.
const OVERRIDE_LIGHT_BELOW = ARCHETYPES.find(a => a.name === 'rich')!.min  // 0.40
const OVERRIDE_DARK_AT = ARCHETYPES.find(a => a.name === 'light')!.min     // 0.85

export function stateFillL(restL: number, mode: 'light' | 'dark', k: 1 | 2): number {
  const natural: 1 | -1 = mode === 'dark' ? 1 : -1 // away from the mode's ground
  const overridden = mode === 'light' ? restL < OVERRIDE_LIGHT_BELOW : restL >= OVERRIDE_DARK_AT
  const preferred: 1 | -1 = overridden ? (-natural as 1 | -1) : natural
  // direction commits on the PRESSED (2×) budget so hover and pressed can never
  // split directions when only the smaller step fits before the rail. The mirrored
  // deltas run large near the far pole, so dark fills just UNDER the override line
  // (~.79–.85) flip to darken here — the backstop, not the archetype rule.
  const fits = (d: 1 | -1) => {
    const p = restL + d * stateStepL(restL, mode, 2)
    return p >= STATE_L_MIN && p <= STATE_L_MAX
  }
  const dir: 1 | -1 = fits(preferred) ? preferred : fits(-preferred as 1 | -1) ? (-preferred as 1 | -1) : preferred
  let L = restL + dir * stateStepL(restL, mode, k)
  // NEAR-BLACK ENDPOINT CAP (owner round, pure-black cta): near black the Weber
  // steps diverge BY DESIGN — OKLCH L is cube-root-compressed there, and anything
  // less reads as no step at all (a .133 hover renders #080808). What broke button
  // identity was only the ENDPOINT: pressed at .60 left dark-button territory. So
  // for rests in the NEAR-BLACK archetype the steps stay divergent and the trio
  // clamps at the override boundary (.40) — pressed caps there; a hover that would
  // reach the capped pressed compresses to the midpoint so the pair stays ordered.
  // Rests above the near-black band never travel that far (the 'dark'-archetype
  // register, e.g. FIS .365 → .429/.494, ships uncapped exactly as hoverL always
  // did). Dark side needs no cap: its overridden fills darken off near-white,
  // where the compression works the other way.
  if (mode === 'light' && dir > 0 && restL < ARCHETYPES.find(a => a.name === 'near-black')!.max) {
    const pressed = Math.min(restL + stateStepL(restL, mode, 2), OVERRIDE_LIGHT_BELOW)
    L = k === 2 ? pressed : L >= pressed ? (restL + pressed) / 2 : L
  }
  return Math.min(STATE_L_MAX, Math.max(STATE_L_MIN, L))
}
