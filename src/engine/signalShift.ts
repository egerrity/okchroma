

import { generateScale, type GeneratedScale } from './colorEngine'
import { darkChromaCurve } from './darkChromaCurve'
import { checkCollision, YELLOW_SPLIT_H } from './collision'
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

function swapScale(baseHex: string, def: SignalDef): GeneratedScale {
  return generateScale(baseHex, def.name, undefined, {
    highlight: true,
    darkChromaCurve,
    loudCta: true,
    darkFillMinL: def.darkFillMinL,
    enforceOnFillContrast: true,
  })
}

function lemonScale(def: SignalDef): GeneratedScale {
  return generateScale(def.hex, def.name, 'light', {
    hueShiftDeg: def.hueShift.cool,
    chromaScale: def.yieldChromaScale,
    highlight: true,
    darkChromaCurve,
    loudCta: true,
    enforceOnFillContrast: true,
  })
}

export function pickSignalShift(
  brand: GeneratedScale,
  canonicalSignalScale: GeneratedScale,
  def: SignalDef
): ShiftResult | null {
  const rule = SHIFT_RULES[def.name]
  if (!rule) return null
  if (!checkCollision(brand, canonicalSignalScale, def, 'light').collides) return null

  const side = brand.brandH < rule.splitH ? rule.below : rule.atOrAbove
  if (side.kind === 'none') return null
  if (side.kind === 'swap') return { scale: swapScale(side.baseHex, def), note: side.note }
  return { scale: lemonScale(def), note: side.note }
}
