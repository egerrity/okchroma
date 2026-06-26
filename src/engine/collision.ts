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

export type Mode = 'light' | 'dark'

export interface CollisionCheck {
  signal: SignalDef['name']
  mode: Mode
  dHue: number // angular hue distance, degrees
  hueGate: boolean
  deltaE: number // OKLab distance between the rendered cta fills
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
  // Compare the CTA fills — the loud action / signal colors. The cta is off-scale
  // now (formerly the stop-9 array slot); collision runs on the raw cta, before
  // applyRedCoolRender's render-time cool.
  const brandCta = mode === 'light' ? brand.cta : brand.ctaDark
  const signalCta = mode === 'light' ? signalScale.cta : signalScale.ctaDark

  const dHue = hueDistance(brand.brandH, signalDef.H)
  const hueGate = dHue <= HUE_GATE_DEG
  const deltaE = stopDeltaE(brandCta, signalCta)
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
