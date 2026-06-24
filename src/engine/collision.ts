// Brand ↔ signal collision detection.
//
// Two gates, both must trip:
//   1. Hue gate — brand H within HUE_GATE_DEG of the signal's H. Cheap
//      pre-filter and intent: a maroon and error red share a hue family.
//   2. Distance gate — OKLab ΔE between the rendered stop-9 fills below
//      DELTA_E_THRESHOLD. This is what lets maroon pass: same hue family,
//      but far enough in lightness that nobody confuses the fills.
//
// Runs per mode: dark mode pins brand stop 9 at L 0.63, so a brand can be
// clear in light mode and collide in dark.
//
// Resolution (the escalation ladder) is deliberately not automatic past
// rung 1 — rungs 2/3 are choices presented to the brand owner, not gate-driven:
//   rung 1  reds re-anchor to the dark archetype, oranges to bright
//           (recommended output; applied automatically)
//   rung 2  brand shifts cool / signal shifts warm within tolerances
//           (offered when the brand owner pushes back on rung 1)
//   rung 3  exact brand hex; component-level treatment swaps only
//           (exact mode; also the entry point for exact-hex brands)

import type { GeneratedScale, ColorStop } from './colorEngine'
import { generateScale } from './colorEngine'
import type { SignalDef } from './signals'
import { SIGNALS } from './signals'

// Calibrated visually via the collision rig.
export const HUE_GATE_DEG = 30
export const DELTA_E_THRESHOLD = 0.16
// Dark mode runs a lower bar: stop-9 L is pinned for everyone, so ΔE can't
// reach light-mode levels, and the dark collider treatment adds a salience
// split (muted brand vs vivid error) that raw ΔE doesn't credit.
export const DARK_DELTA_E_THRESHOLD = 0.10

// Rung-1 direction: every collider re-anchors dark. Bright was considered
// for oranges but doesn't clear the gate (ΔE 0.13 vs error) — brands
// that insist on staying orange use exact mode instead.
export const RUNG1_ARCHETYPE = 'dark' as const

// DEPRECATED — preventive differentiation shear, CUT from the resolution
// pipeline 2026-06-11. The light ramp now differentiates warm reds from
// error with the render-time cool rotation of stops 9/10 instead
// (colorEngine.applyRedCoolRender): same yield-away-from-error intent, but
// stop 9 keeps the exact brand hex for everyone outside the red watershed
// and NO decision ever runs on a shifted hue. Kept only because the demo
// collision rig still exposes the shear slider; nothing in src/ calls it.
export const PREVENT_SHIFT_MAX_DEG = 10 // error's max; rig slider baseline
export const PREVENT_SHIFT_FALLOFF_DEG = 35

// Signed shortest angular distance from h2 to h1, in [-180, 180]
function signedHueDelta(h1: number, h2: number): number {
  return ((h1 - h2 + 540) % 360) - 180
}

// Degrees to add to brandH (signed). 0 outside every falloff zone.
// DEPRECATED — demo rig only; see note above.
export function preventiveHueShift(brandH: number, intensity = 1): number {
  let best = 0
  for (const sig of SIGNALS) {
    if (sig.brandShearMaxDeg === 0) continue
    const d = signedHueDelta(brandH, sig.H)
    const t = Math.max(0, 1 - Math.abs(d) / PREVENT_SHIFT_FALLOFF_DEG)
    if (t === 0) continue
    const dir = d <= 0 ? -1 : 1 // away from the signal; an exact match goes cool
    const shift = dir * sig.brandShearMaxDeg * intensity * t
    if (Math.abs(shift) > Math.abs(best)) best = shift
  }
  return best
}

export type Mode = 'light' | 'dark'

export interface CollisionCheck {
  signal: SignalDef['name']
  mode: Mode
  dHue: number // angular hue distance, degrees
  hueGate: boolean
  deltaE: number // OKLab distance between rendered stop-9 fills
  collides: boolean
}

function hueDistance(h1: number, h2: number): number {
  const d = Math.abs(h1 - h2) % 360
  return d > 180 ? 360 - d : d
}

// OKLab ΔE between two stops, from their stored (gamut-clamped) OKLCH.
export function stopDeltaE(s1: ColorStop, s2: ColorStop): number {
  const rad = (h: number) => (h * Math.PI) / 180
  const a1 = s1.C * Math.cos(rad(s1.H)), b1 = s1.C * Math.sin(rad(s1.H))
  const a2 = s2.C * Math.cos(rad(s2.H)), b2 = s2.C * Math.sin(rad(s2.H))
  return Math.sqrt((s1.L - s2.L) ** 2 + (a1 - a2) ** 2 + (b1 - b2) ** 2)
}

export function checkCollision(
  brand: GeneratedScale,
  signalScale: GeneratedScale,
  signalDef: SignalDef,
  mode: Mode
): CollisionCheck {
  const brandStop9 = (mode === 'light' ? brand.light : brand.dark)[8]
  const signalStop9 = (mode === 'light' ? signalScale.light : signalScale.dark)[8]

  const dHue = hueDistance(brand.brandH, signalDef.H)
  const hueGate = dHue <= HUE_GATE_DEG
  const deltaE = stopDeltaE(brandStop9, signalStop9)
  const threshold = mode === 'dark' ? DARK_DELTA_E_THRESHOLD : DELTA_E_THRESHOLD

  return {
    signal: signalDef.name,
    mode,
    dHue,
    hueGate,
    deltaE,
    collides: hueGate && deltaE <= threshold,
  }
}

// ─── Signal yield (warning / success / info) ────────────────────────────────
// For the non-critical signals the resolution inverts: the SIGNAL shifts
// away from the brand, not the brand away from the signal. Error never
// yields. The shift is the smallest whole degree that clears the distance
// gate, capped by the signal's hueShift tolerance — beyond the cap the
// signal stops reading as itself, so a capped partial shift is shipped and
// the residual is left to component-level rules (icons are mandatory on
// signal components anyway).
//
// Sign convention: positive = +H. The cool/warm tolerance maps to ±H
// differently per hue family (for amber, cool is +H toward green-yellow;
// for violet, cool is −H toward blue).
const SIGNAL_SHIFT_CAPS: Record<SignalDef['name'], { plus: number; minus: number }> = {
  red: { plus: 0, minus: 0 }, // red never yields
  yellow: {
    plus: SIGNALS.find(s => s.name === 'yellow')!.hueShift.cool,
    minus: SIGNALS.find(s => s.name === 'yellow')!.hueShift.warm,
  },
  green: {
    plus: SIGNALS.find(s => s.name === 'green')!.hueShift.cool,
    minus: SIGNALS.find(s => s.name === 'green')!.hueShift.warm,
  },
  'info-color': {
    plus: SIGNALS.find(s => s.name === 'info-color')!.hueShift.warm, // +H → magenta
    minus: SIGNALS.find(s => s.name === 'info-color')!.hueShift.cool, // −H → blue
  },
}

// Yield direction policy. 'away' = whichever side of the signal the brand
// is NOT on. 'cool' = always +H, even crossing past the brand hue —
// yellow's rule: gold brands own the warm yellow register, yellow goes
// lemon, and the L/C character difference does the rest.
const YIELD_DIRECTION: Record<SignalDef['name'], 'away' | 'cool'> = {
  red: 'away', // unused — red never yields
  yellow: 'cool',
  green: 'away',
  'info-color': 'away',
}

// Smallest signal hue shift (signed degrees) that clears the distance gate
// against this brand, or the capped maximum if nothing within tolerance
// clears. Returns 0 when there is no collision to resolve.
export function signalYieldShift(
  brand: GeneratedScale,
  signalDef: SignalDef,
  mode: Mode = 'light'
): number {
  const baseSignal = generateScale(signalDef.hex, signalDef.name)
  if (!checkCollision(brand, baseSignal, signalDef, mode).collides) return 0

  const caps = SIGNAL_SHIFT_CAPS[signalDef.name]
  let dir: 1 | -1
  if (YIELD_DIRECTION[signalDef.name] === 'cool') {
    dir = 1 // always +H, regardless of which side the brand sits
  } else {
    // Shift away from the brand: brand on the −H side pushes the signal +H.
    const d = signedHueDelta(brand.brandH, signalDef.H)
    dir = d <= 0 ? 1 : -1
  }
  const cap = dir > 0 ? caps.plus : caps.minus
  if (cap === 0) return 0

  let lastShift = 0
  for (let deg = 1; deg <= cap; deg++) {
    const shift = dir * deg
    const shifted = generateScale(signalDef.hex, signalDef.name, undefined, { hueShiftDeg: shift })
    // Re-check distance only — the hue gate stays defined by the original
    // signal hue (the shifted signal is still "warning" semantically).
    const stop9 = (mode === 'light' ? shifted.light : shifted.dark)[8]
    const brandStop9 = (mode === 'light' ? brand.light : brand.dark)[8]
    lastShift = shift
    if (stopDeltaE(brandStop9, stop9) > DELTA_E_THRESHOLD) return shift
  }
  return lastShift // capped partial mitigation
}

// ─── Warning's two costumes ──────────────────────────────────────────────────
// Yellow resolves binary: a WARM yellow brand (gold/amber side) pushes
// warning to LEMON — hue capped at the cool limit, re-anchored at the light
// archetype, chroma boosted. A COOL yellow brand keeps warning at MACARONI
// (the canonical amber), which is already maximally separated from a lemon
// brand. Split at the perceptual warm/cool yellow boundary: midpoint
// between macaroni (H 84) and the lemon limit (H 107).
// Back-pocket: the light-anchored mint green from the signal lab is a
// candidate for future success/info differentiation.
export const YELLOW_SPLIT_H = 96

export function warningVariant(
  brand: GeneratedScale,
  warningScale: GeneratedScale,
  warningDef: SignalDef
): 'lemon' | 'macaroni' | null {
  if (!checkCollision(brand, warningScale, warningDef, 'light').collides) return null
  return brand.brandH < YELLOW_SPLIT_H ? 'lemon' : 'macaroni'
}

export interface BrandCollisionReport {
  checks: CollisionCheck[]
  collidesWith: SignalDef['name'][]
}

export function checkAllCollisions(
  brand: GeneratedScale,
  signalScales: Map<SignalDef['name'], GeneratedScale>
): BrandCollisionReport {
  const checks: CollisionCheck[] = []
  for (const def of SIGNALS) {
    const scale = signalScales.get(def.name)!
    checks.push(checkCollision(brand, scale, def, 'light'))
    checks.push(checkCollision(brand, scale, def, 'dark'))
  }
  const collidesWith = [...new Set(checks.filter(c => c.collides).map(c => c.signal))]
  return { checks, collidesWith }
}
