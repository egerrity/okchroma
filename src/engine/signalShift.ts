

import { generateScale, type GeneratedScale, type ContrastProfile } from './colorEngine'
import { darkChromaCurve } from './darkChromaCurve'
import { checkHueCollision, YELLOW_SPLIT_H } from './collision'
import type { SignalDef } from './signals'

type Side =
  | { kind: 'swap'; note: string; baseHex: string }
  | { kind: 'shift'; note: string }
  | { kind: 'none' }

interface SignalShiftRule {
  splitH: number
  below: Side
  atOrAbove: Side
}

const SHIFT_RULES: Partial<Record<SignalDef['name'], SignalShiftRule>> = {

  yellow: {
    splitH: YELLOW_SPLIT_H,
    below: { kind: 'shift', note: 'yellow → lemon' },
    atOrAbove: { kind: 'none' },
  },

  green: {
    splitH: 147,
    below: { kind: 'swap', note: 'green → teal-side', baseHex: '#18AA6C' },
    atOrAbove: { kind: 'swap', note: 'green → yellow-side', baseHex: '#5DA447' },
  },

  'info-color': {
    splitH: 273,
    below: { kind: 'swap', note: 'info-color → magenta', baseHex: '#AB4ABA' },
    atOrAbove: { kind: 'swap', note: 'info-color → blue', baseHex: '#0090FF' },
  },
}

export interface ShiftResult {
  scale: GeneratedScale
  note: string
}

function swapScale(baseHex: string, def: SignalDef, contrastProfile?: ContrastProfile): GeneratedScale {
  return generateScale(baseHex, def.name, undefined, {
    highlight: true,
    darkChromaCurve,
    loudCta: true,
    darkFillMinL: def.darkFillMinL,
    enforceOnFillContrast: true,
    suppressRedCool: true,
    goldBoost: true,
    contrastProfile,
  })
}

function lemonScale(def: SignalDef, contrastProfile?: ContrastProfile): GeneratedScale {
  return generateScale(def.hex, def.name, 'light', {
    hueShiftDeg: def.hueShift.cool,
    chromaScale: def.yieldChromaScale,
    highlight: true,
    darkChromaCurve,
    loudCta: true,
    enforceOnFillContrast: true,
    suppressRedCool: true,
    goldBoost: true,
    contrastProfile,
  })
}

// The swap variants a signal can OFFER (green: teal-side / yellow-side; info-color: magenta /
// blue). Used by resolveTheme when a SECONDARY collides: a variant is adopted only if it clears
// BOTH brand colors. red offers none (identity sacred) and yellow's lemon stays primary-only
// (warningVariant machinery) — for those the secondary yields instead (SECONDARY-PLAN §2).
export function signalSwapVariants(def: SignalDef, contrastProfile?: ContrastProfile): ShiftResult[] {
  const rule = SHIFT_RULES[def.name]
  if (!rule || def.name === 'yellow') return []
  return [rule.below, rule.atOrAbove]
    .filter((s): s is Extract<Side, { kind: 'swap' }> => s.kind === 'swap')
    .map(s => ({ scale: swapScale(s.baseHex, def, contrastProfile), note: s.note }))
}

export function pickSignalShift(
  brand: GeneratedScale,
  canonicalSignalScale: GeneratedScale,
  def: SignalDef,
  // shifted replacement signals are generated under the caller's profile (like the canonicals)
  contrastProfile?: ContrastProfile
): ShiftResult | null {
  const rule = SHIFT_RULES[def.name]
  if (!rule) return null
  // a swap is a whole-ramp remedy — it gates on the TYPE-1 hue collision (CATALOG C7),
  // covering both modes at once; the decision is also lane-global by construction
  if (!checkHueCollision(brand, canonicalSignalScale, def).collides) return null

  const side = brand.brandH < rule.splitH ? rule.below : rule.atOrAbove
  if (side.kind === 'none') return null
  if (side.kind === 'swap') return { scale: swapScale(side.baseHex, def, contrastProfile), note: side.note }
  return { scale: lemonScale(def, contrastProfile), note: side.note }
}
