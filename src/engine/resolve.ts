

import { generateScale, applyRedCoolRender, inRedBand, type GeneratedScale } from './colorEngine'
import { darkChromaCurve } from './darkChromaCurve'
import type { Archetype } from './archetypes'
import { SIGNALS, type SignalDef } from './signals'
import { DARK_BRAND_FILL_MIN_L } from './stopTable'
import {
  checkCollision,
  warningVariant,
  RUNG1_ARCHETYPE,
} from './collision'
import { pickSignalShift } from './signalShift'

export const SIGNAL_SCALES = new Map<SignalDef['name'], { def: SignalDef; scale: GeneratedScale }>(
  SIGNALS.map(def => [
    def.name,

    { def, scale: generateScale(def.hex, def.name, undefined, { highlight: true, darkChromaCurve, loudCta: true, darkFillMinL: def.darkFillMinL, enforceOnFillContrast: true, suppressRedCool: true }) },
  ])
)

export interface SignalOverride {
  name: SignalDef['name']
  scale: GeneratedScale
  note: string
}

export interface ResolvedBrand {
  scale: GeneratedScale

  shearDeg: number
  rung1: SignalDef['name'] | null

  darkCollider: 'muted' | null
  warningVariant: 'lemon' | 'macaroni' | null

  pending: SignalDef['name'][]
  signalOverrides: SignalOverride[]

  errorComponentRule: boolean
}

function collisionStatus(scale: GeneratedScale): { trigger: SignalDef['name'] | null; pending: SignalDef['name'][] } {
  let trigger: SignalDef['name'] | null = null
  const pending: SignalDef['name'][] = []
  for (const { def, scale: sigScale } of SIGNAL_SCALES.values()) {
    if (checkCollision(scale, sigScale, def, 'light').collides) {
      if (def.name === 'red') trigger = def.name
      else pending.push(def.name)
    }
  }
  return { trigger, pending }
}

export function resolveBrand(
  hex: string,
  name: string,

  opts?: {
    exact?: boolean
    archetypeOverride?: Archetype

    style?: 'default' | 'deeper' | 'full-chroma'
  }
): ResolvedBrand {

  const floor = {
    darkFillMinL: DARK_BRAND_FILL_MIN_L,
    enforceOnFillContrast: !opts?.exact,

    coolRedDark: !opts?.exact,

    darkChromaCurve: opts?.exact ? undefined : darkChromaCurve,
    style: opts?.style,

    highlight: true,
  }

  const rung1Opts = { stop11DeepenL: 0.07, stop12DeepenL: 0.05 }
  let scale = generateScale(hex, name, undefined, floor)

  let rung1: SignalDef['name'] | null = null
  let pending: SignalDef['name'][] = []
  let errorComponentRule = false

  if (opts?.archetypeOverride) {
    scale = generateScale(hex, name, opts.archetypeOverride, floor)
  } else if (!opts?.exact) {
    const status = collisionStatus(scale)
    if (status.trigger) {

      if (inRedBand(scale.brandH)) {
        rung1 = status.trigger
        scale = generateScale(hex, name, RUNG1_ARCHETYPE, { ...floor, ...rung1Opts })
      } else {
        errorComponentRule = true
      }
    }
    pending = status.pending
  }

  let darkCollider: 'muted' | null = null
  if (!opts?.exact) {
    const err = SIGNAL_SCALES.get('red')!
    if (checkCollision(scale, err.scale, err.def, 'dark').collides) {
      if (inRedBand(scale.brandH)) {
        darkCollider = 'muted'
        scale = generateScale(
          hex,
          name,
          opts?.archetypeOverride ?? (rung1 ? RUNG1_ARCHETYPE : undefined),
          { darkColliderFill: darkCollider, ...floor, ...(rung1 ? rung1Opts : {}) }
        )
      } else {
        errorComponentRule = true
      }
    }
  }

  const signalOverrides: SignalOverride[] = []

  let warnVariant: 'lemon' | 'macaroni' | null = null

  if (!opts?.exact) {
    const warn = SIGNAL_SCALES.get('yellow')!
    warnVariant = warningVariant(scale, warn.scale, warn.def)
    if (warnVariant) pending = pending.filter(n => n !== 'yellow')

    for (const sigName of ['yellow', 'green', 'info-color'] as const) {
      const { def, scale: canonical } = SIGNAL_SCALES.get(sigName)!
      const shift = pickSignalShift(scale, canonical, def)
      if (shift) {
        signalOverrides.push({ name: sigName, scale: shift.scale, note: shift.note })
        pending = pending.filter(n => n !== sigName)
      }
    }
  }

  if (!opts?.exact && !opts?.archetypeOverride && !rung1 && inRedBand(scale.brandH)) {
    applyRedCoolRender(scale, true)
  }

  return { scale, shearDeg: 0, rung1, darkCollider, warningVariant: warnVariant, pending, signalOverrides, errorComponentRule }
}
