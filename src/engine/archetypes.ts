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

// ─── cta-fill states: one register, mode-aware. THE FLAT DELTA (owner spec 2026-07-28,
// restored 2026-07-28 after the marks round: "they should all do the same thing and move
// the same amount of delta away from each other" — a state change is a GLIMMER, the same
// size on every button).
//
// The interim Weber magnitude — ΔL = k/(nearness-to-ground + 0.1) — is RETIRED. It was
// added the same day against a real observation (equal APPARENT-L steps read unequal near
// black) but applied the remedy in the wrong currency: OKLCH L is already near-uniform
// perceptually, so a flat ΔL in L needs no distance correction. Scaling the step up as a
// fill approached the far pole made the biggest leaps exactly where the gamut is narrowest
// — dark pressed states ran ΔL* 8.7–28.3 and washed saturated fills to near-white
// (hibiscus #FFEFED at 14% of its chroma, info #E9E8FF at 26%). A flat delta holds every
// family at ΔL* ≈ 5.9 hover / 11.7 pressed and keeps the chroma.
//
// k = 0.05 hover (owner mark, chosen over .03 and .04); pressed 2× — doubled, never
// crosses back. ───
const STATE_HOVER_K = 0.05
const STATE_L_MIN = 0.05, STATE_L_MAX = 0.98 // state rails, shy of the poles

export function stateStepL(restL: number, _mode: 'light' | 'dark', k: 1 | 2): number {
  return k * STATE_HOVER_K
}

// The LIGHT ARCHETYPE OVERRIDE (owner 2026-07-28, restoring the original hoverL
// switch): light mode travels toward black, so a fill already in the near-black /
// dark archetypes (L below the 'rich' floor, the original 0.40 switch) LIGHTENS
// instead — it has no dark left to travel into. Bound reads from ARCHETYPES.
//
// Dark mode carries NO archetype override any more (owner 2026-07-28). Its old
// bound — the 'light' archetype floor, 0.85 — declared "no room to lighten" for
// fills that plainly had room, and yellow was the casualty: warning's dark cta
// rests at .854 purely because yellow is the most luminous hue, so it flipped and
// darkened to olive. Under the flat delta the honest test is the RAIL alone: a
// fill flips only when its full pressed step would overshoot, i.e. above
// STATE_L_MAX − 2k = 0.88. Nothing in the shipped fleet sits there (0 of 66 ctas,
// both lanes), so dark fills all lighten — which is the design.
const OVERRIDE_LIGHT_BELOW = ARCHETYPES.find(a => a.name === 'rich')!.min  // 0.40

export function stateFillL(restL: number, mode: 'light' | 'dark', k: 1 | 2): number {
  const natural: 1 | -1 = mode === 'dark' ? 1 : -1 // away from the mode's ground
  const preferred: 1 | -1 = mode === 'light' && restL < OVERRIDE_LIGHT_BELOW
    ? (-natural as 1 | -1)
    : natural
  // direction commits on the PRESSED (2×) budget so hover and pressed can never
  // split directions when only the smaller step fits before the rail.
  const fits = (d: 1 | -1) => {
    const p = restL + d * stateStepL(restL, mode, 2)
    return p >= STATE_L_MIN && p <= STATE_L_MAX
  }
  const dir: 1 | -1 = fits(preferred) ? preferred : fits(-preferred as 1 | -1) ? (-preferred as 1 | -1) : preferred
  const L = restL + dir * stateStepL(restL, mode, k)
  // (The near-black ENDPOINT CAP that lived here is gone with the Weber magnitude
  // that made it necessary: it existed because the diverging steps could send a
  // near-black light cta's pressed state past .40, out of dark-button territory.
  // A flat 2k = 0.10 cannot — the near-black band tops out at .25, so pressed
  // lands at most .35. Provably inert, so it is not carried as dead code.)
  return Math.min(STATE_L_MAX, Math.max(STATE_L_MIN, L))
}
