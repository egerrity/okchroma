

import type { GeneratedScale, ColorStop } from './colorEngine'
import type { SignalDef } from './signals'
import { SIGNALS } from './signals'

export const HUE_GATE_DEG = 30
export const DELTA_E_THRESHOLD = 0.16

export const DARK_DELTA_E_THRESHOLD = 0.10

export const RUNG1_ARCHETYPE = 'dark' as const

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
