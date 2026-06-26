// Signal-shift override layer (warning / success / info — never error).
//
// This is NOT the engine's brand↔signal collision check. That check resolves
// UX collisions by moving the BRAND (rung-1 / component rule, owned by the
// engine). This layer runs strictly AFTER all of that, output-only: it nudges
// the SIGNAL away from the brand to buy extra perceptual distance, keeping
// chroma high. Its only product is a GeneratedScale pushed into
// ResolvedBrand.signalOverrides, which is read only by CSS emission and the
// Figma export — it never re-enters any engine decision. See ENGINE-SPEC §3.3
// (collision-avoiders: green/info-color swaps; yellow → lemon).
//
// Trigger = the SAME light-mode checkCollision the warning split already uses
// (lightness-aware: a signal already far from the brand in L doesn't collide,
// so it doesn't shift). Direction = brand hue vs a per-signal split; targets
// are fixed design decisions. This generalizes warning's lemon/macaroni into
// one shape covering success and info too.

import { generateScale, type GeneratedScale } from './colorEngine'
import { darkChromaCurve } from './darkChromaCurve'
import { checkCollision, YELLOW_SPLIT_H } from './collision'
import type { SignalDef } from './signals'

// One side of a split. Three forms:
//   swap  — generate from a new base hex (success/info flips)
//   shift — canonical hex, hue-shifted + chroma-boosted (warning → lemon)
//   none  — keep the canonical signal (warning ≥ split → macaroni)
type Side =
  | { kind: 'swap'; note: string; baseHex: string }
  | { kind: 'shift'; note: string }
  | { kind: 'none' }

interface SignalShiftRule {
  splitH: number
  below: Side // brand.brandH < splitH
  atOrAbove: Side // brand.brandH >= splitH
}

// Per-signal direction + targets. Red is deliberately absent — red stays
// with the engine's rung-1 / component handling.
const SHIFT_RULES: Partial<Record<SignalDef['name'], SignalShiftRule>> = {
  // F5: the SINGLE split constant (imported, was a duplicated `96`). Warm-yellow
  // brand → lemon; cool-yellow brand keeps canonical macaroni.
  yellow: {
    splitH: YELLOW_SPLIT_H,
    below: { kind: 'shift', note: 'yellow → lemon' },
    atOrAbove: { kind: 'none' },
  },
  // yellow-green brand → flip toward teal (H158); teal brand → toward
  // yellow-green (H139). Iso-L/iso-C with canonical #46A758.
  green: {
    splitH: 147,
    below: { kind: 'swap', note: 'green → teal-side', baseHex: '#18AA6C' },
    atOrAbove: { kind: 'swap', note: 'green → yellow-side', baseHex: '#5DA447' },
  },
  // blue-side brand → flee warm toward magenta (H322, short of full pink — a
  // muted pink read too musty); indigo/violet brand → flee cool to blue.
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

// A swapped base hex runs through the same signal-init opts as the canonical
// signal scales (resolve.ts SIGNAL_SCALES) so chroma stays boosted and the
// dark character is preserved.
function swapScale(baseHex: string, def: SignalDef): GeneratedScale {
  return generateScale(baseHex, def.name, undefined, {
    highlight: true,
    darkChromaCurve,
    loudCta: true,
    darkFillMinL: def.darkFillMinL,
    enforceOnFillContrast: true,
  })
}

// Warning → lemon: canonical hex, hue-shifted to the cool cap, chroma
// boosted. Byte-identical to the former resolve.generateLemonWarning (note
// the 'light' forcedArchetype — load-bearing).
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

// Given the resolved brand scale and the canonical signal scale, return the
// override to push, or null to keep the canonical signal. Output-only.
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
