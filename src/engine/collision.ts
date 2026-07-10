

import type { GeneratedScale, ColorStop } from './colorEngine'
import type { SignalDef } from './signals'
import { SIGNALS } from './signals'
import { VIVID_C, HUE_NOISE_C, oklabDist } from './colorMath'

export const HUE_GATE_DEG = 30
export const DELTA_E_THRESHOLD = 0.16

export const DARK_DELTA_E_THRESHOLD = 0.10

// ── C12 VALUE REPEL (owner design 2026-07-09→10; replaces the whole red TYPE-2 remedy
// family: rung-1's forced-dark archetype, the warm-forced bright anchor, and the cool-side
// muted dark collider). ONE RULE, ONE METRIC: a brand cta must sit outside the
// owner-calibrated RED-FAMILY GATE around red's cta in its own mode (redGateDist/RED_GATE,
// colorMath.ts — fitted 0/67 to her raw-pair confusability marks). Inside → the cta exits
// along L to the nearest release (dark mode: up only — the prominence floor owns the down
// side). Chroma and hue ride the existing cta formula (no new color rule; hue stays
// identity). Under the gate's weights the light exit is cheap (lighter pinkifies out of the
// family fast) so releases land below the APCA dead zone with white text intact.
export { RED_GATE, redGateDist } from './colorMath'

export type Mode = 'light' | 'dark'

export interface CollisionCheck {
  signal: SignalDef['name']
  mode: Mode
  dHue: number
  hueGate: boolean
  deltaE: number
  collides: boolean
}

function hueDistance(h1: number, h2: number): number {
  const d = Math.abs(h1 - h2) % 360
  return d > 180 ? 360 - d : d
}

export function stopDeltaE(s1: ColorStop, s2: ColorStop): number {
  return oklabDist(s1, s2)
}

export function checkCollision(
  brand: GeneratedScale,
  signalScale: GeneratedScale,
  signalDef: SignalDef,
  mode: Mode
): CollisionCheck {

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

// ── TYPE-1: HUE (family) collision — CATALOG C7, owner decision 2026-07-07 ──────
// Two phenomena, two gates. A near-hue chromatic pair collides at EVERY scaffolded
// register (the L scaffold + normalized chroma leave hue as the wash register's only
// differentiator), so whole-ramp remedies (signal swap, brand repel) gate HERE — on hue
// proximity measured where it collides (the wash, after spine drift) plus a chroma
// qualifier (muted brands at the signal hue don't family-collide). checkCollision above
// stays the TYPE-2 gate: specific stops coinciding at distinguishable hues — value moves
// only (rung-1, the muted dark collider). Lane-global by construction: wash L/C/H are
// lane-invariant (measured identical across wcag/apca).

// The C6 yardstick is ΔH 11–13; the gate sits at 15 because the ΔE-per-ΔH slope varies by
// band (violet washes reach ΔE 0.005 at ΔH 13 — sweep-measured) — firing at 15 lets the
// remedy provide the separation instead of the boundary seed keeping a sub-bar wash.
export const HUE_COLLISION_WASH_DEG = 15
export const HUE_COLLISION_MIN_V = 0.5            // vividness qualifier (provisional — owner eye-check)
export const SECONDARY_NOTE_MIN_V = HUE_NOISE_C / VIVID_C   // annotations: any real hue qualifies

const WASH_STOPS = [3, 4, 5, 6, 7]

export interface HueCollisionCheck {
  signal: SignalDef['name']
  dHueWash: { light: number; dark: number }
  washDeltaE: { light: number; dark: number }
  vividness: number
  collides: boolean
}

function washProximity(brand: GeneratedScale, sig: GeneratedScale, mode: Mode): { dH: number; dE: number } {
  const b = mode === 'light' ? brand.light : brand.dark
  const s = mode === 'light' ? sig.light : sig.dark
  let dH = Infinity, dE = Infinity
  for (const k of WASH_STOPS) {
    const bs = b.find(x => x.stop === k), ss = s.find(x => x.stop === k)
    if (!bs || !ss) continue
    dH = Math.min(dH, hueDistance(bs.H, ss.H))
    dE = Math.min(dE, stopDeltaE(bs, ss))
  }
  return { dH, dE }
}

export function checkHueCollision(
  brand: GeneratedScale,
  signalScale: GeneratedScale,
  signalDef: SignalDef,
  opts?: { minV?: number }
): HueCollisionCheck {
  const l = washProximity(brand, signalScale, 'light')
  const d = washProximity(brand, signalScale, 'dark')
  const vividness = Math.min(1, brand.brandC / VIVID_C)
  return {
    signal: signalDef.name,
    dHueWash: { light: l.dH, dark: d.dH },
    washDeltaE: { light: l.dE, dark: d.dE },
    vividness,
    collides: vividness >= (opts?.minV ?? HUE_COLLISION_MIN_V)
      && Math.min(l.dH, d.dH) <= HUE_COLLISION_WASH_DEG,
  }
}

export const YELLOW_SPLIT_H = 96

export function warningVariant(
  brand: GeneratedScale,
  warningScale: GeneratedScale,
  warningDef: SignalDef
): 'lemon' | 'macaroni' | null {
  if (!checkHueCollision(brand, warningScale, warningDef).collides) return null
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
