

import { FAMILY } from './tokenDescriptions'

// the signal role words ride the FAMILY roster (keyed by the stable camelCase
// identities), so a role rename is a table edit there, never a second one here
type SignalFamily = (typeof FAMILY)['critical' | 'warning' | 'positive' | 'info']

export interface SignalDef {
  name: 'red' | 'yellow' | 'green' | 'blue'
  // The EMIT-tier role name (owner 2026-07-27: the signals are an in-between
  // semantic/primitive tier — role names survive re-pointing, e.g. a future
  // info-from-secondary option; identity names would lie there). The engine
  // keeps `name` internally — collision machinery is genuinely about hue.
  // Emitted surfaces (CSS var prefixes, Figma theme groups) use `emitName`.
  emitName: SignalFamily
  hex: string

  L: number
  C: number
  H: number

  hueShift: { cool: number; warm: number }

  yieldChromaScale: number

  darkFillMinL?: number
}

export const SIGNALS: SignalDef[] = [

  { name: 'red',    emitName: FAMILY.critical, hex: '#E54D2E', L: 0.627, C: 0.194, H: 33.3, hueShift: { cool: 0,  warm: 15 }, yieldChromaScale: 1 },

  { name: 'yellow', emitName: FAMILY.warning,  hex: '#FFC53D', L: 0.854, C: 0.157, H: 84.1, hueShift: { cool: 23, warm: 0 }, yieldChromaScale: 1.15 },

  { name: 'green',  emitName: FAMILY.positive, hex: '#63C373', L: 0.739, C: 0.146, H: 147.6, hueShift: { cool: 15, warm: 10 }, yieldChromaScale: 1, darkFillMinL: 0.75 },

  { name: 'blue',   emitName: FAMILY.info,     hex: '#AFA3FF', L: 0.761, C: 0.130, H: 288.9, hueShift: { cool: 15, warm: 15 }, yieldChromaScale: 1, darkFillMinL: 0.70 },
]

// identity → emit-role lookup for emitters that only carry the identity name
export const SIGNAL_EMIT_NAME: Record<SignalDef['name'], SignalDef['emitName']> =
  Object.fromEntries(SIGNALS.map(s => [s.name, s.emitName])) as Record<SignalDef['name'], SignalDef['emitName']>
