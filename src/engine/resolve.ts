// The complete brand resolution pipeline — hex in, resolved theme out.
// This is the "any color" API: build scripts, plugins, and tests all call
// this; nothing else re-implements the rules.
//
//   1. Rung 1               RED-BAND error colliders re-anchor to the dark
//                           archetype (with deepened 11/12 text); orange-side
//                           keep identity and resolve via the uniform
//                           destructive component rule
//   2. Warning variant      warm-yellow brands get lemon, cool keep macaroni
//   3. Yielding signals     success/info shift away from the brand (pending
//                           validation — list empty until then)
//   4. Red cool render      warm-red NON-colliders rotate stops 9/10 cool,
//                           away from error (render-time only, LAST step)
//
// ORDERING INVARIANT: every decision above — collision gates, the inRedBand
// watershed, archetype/rung-1, on-fill text polarity — runs on the RAW
// brand hue. The cool rotation (and the light ramp's spine drift inside
// generateScale) are render-time presentation and never feed a decision;
// that is why step 4 is unconditionally last. (The old preventive hue
// shear violated this — deleted 2026-06-11.)
//
// Escape hatches: exact (ship the hex untouched, component rules only) and
// archetypeOverride (brand-owner-chosen rung-1 direction).

import { generateScale, applyRedCoolRender, inRedBand, type GeneratedScale } from './colorEngine'
import type { Archetype } from './archetypes'
import { SIGNALS, type SignalDef } from './signals'
import { DARK_BRAND_FILL_MIN_L, ACCENT_DARK_STOPS } from './stopTable'
import {
  checkCollision,
  warningVariant,
  RUNG1_ARCHETYPE,
} from './collision'
import { pickSignalShift } from './signalShift'

// Signal scales (subtle tier boosted — signals are alerts).
export const SIGNAL_SCALES = new Map<SignalDef['name'], { def: SignalDef; scale: GeneratedScale }>(
  SIGNALS.map(def => [
    def.name,
    // Stage 2.5: green darkens its light fill to hold WHITE, like the other
    // non-yellow signal fills (red/info-color). Light-only value move; dark stays
    // black-first. No other signal sets it ⇒ they're byte-identical.
    { def, scale: generateScale(def.hex, def.name, undefined, { subtleChromaScale: def.subtleChromaBoost, darkStops: ACCENT_DARK_STOPS, darkFillMinL: def.darkFillMinL, enforceOnFillContrast: true, enforceWhiteFill: def.name === 'green' }) },
  ])
)

export interface SignalOverride {
  name: SignalDef['name']
  scale: GeneratedScale
  note: string
}

export interface ResolvedBrand {
  scale: GeneratedScale
  // Always 0 since the preventive shear was cut (2026-06-11) — kept so
  // build notes / demo chips need no churn. Warm-red differentiation is
  // now the render-time stop 9/10 cool rotation (not reported here: it
  // never changes a decision, only presentation).
  shearDeg: number
  rung1: SignalDef['name'] | null
  // dark collider register: red-side colliders float to 'muted' pastel rose
  darkCollider: 'muted' | null
  warningVariant: 'lemon' | 'macaroni' | null
  // collisions detected but not yet resolved by any rule (light mode)
  pending: SignalDef['name'][]
  signalOverrides: SignalOverride[]
  // Orange-side error collision: the brand keeps its identity (no archetype
  // shift, no dark float — dark-anchored orange is brown and no orange brand
  // accepts a brown button). Separation comes from the uniform component
  // rule instead: destructive buttons in a group render as OUTLINE (surface
  // fill, error-11 text, error-6 border; hover → bg 3, text 12, border 8),
  // fill only when alone/primary, never beside a brand button — plus the
  // required destructive icon.
  errorComponentRule: boolean
}

// Red band (12, 35.5] on the RAW brand hue (inRedBand, colorEngine):
// ONLY red gets hue-shifted and archetype-shifted — rung-1's dark anchor
// only reads as a color (maroon) for red hues. Pink (below H 12) and
// orange (above H 35.5) are left alone per designer direction; their
// error colliders keep identity and separate via the uniform destructive
// component rule. The only universal rules are the dead-zone on-fill
// contrast bound and that component rule.

// Light-mode collision check. Dark mode is excluded for now: rung 1 can't
// help there (dark stop 9 pins L for everyone) and the dark-mode lever
// (chroma reduction) isn't built yet.
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
  // The escalation ladder is two human-gated outcomes: recommended (all
  // automatic rules) and exact (ship the hex; destructive never fills —
  // outline everywhere — plus the icon requirement). Rung 2 (error yields
  // warm) was built and cut — not viable for the output register.
  opts?: {
    exact?: boolean
    archetypeOverride?: Archetype
    // Style lever — rides the floor object into every generateScale call
    // (whole-palette blast radius: build passes it for primary AND accent).
    style?: 'default' | 'deeper' | 'full-chroma'
  }
): ResolvedBrand {
  // Every brand-scale generation carries the brand dark-fill floor, the
  // accent dark ladder, and on-fill compliance enforcement (recommended
  // mode is WCAG-compliant by construction; exact mode skips and the brand
  // accepts the documented caveat).
  const floor = {
    darkFillMinL: DARK_BRAND_FILL_MIN_L,
    darkStops: ACCENT_DARK_STOPS,
    enforceOnFillContrast: !opts?.exact,
    // dark mode keeps the red cool character (exact mode ships raw)
    coolRedDark: !opts?.exact,
    style: opts?.style,
    // Stage 2: brand/secondary carry the highlight-1/2 fill (signals don't —
    // a signal's stop-9 IS its highlight). Emphasis-fill role token, emitted for
    // every brand incl. exact (it's derived, not the shipped hex).
    highlight: true,
  }
  // Rung-1 colliders deepen their 11/12 text stops ("opt3") so accent and
  // body text stand off error's own text register.
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
      // Rung 1 only re-anchors RED-BAND colliders (dark red = maroon,
      // fine). Pink and orange colliders keep their identity — the
      // uniform destructive component rule handles separation instead.
      if (inRedBand(scale.brandH)) {
        rung1 = status.trigger
        scale = generateScale(hex, name, RUNG1_ARCHETYPE, { ...floor, ...rung1Opts })
      } else {
        errorComponentRule = true
      }
    }
    pending = status.pending
  }

  // Dark mode is checked separately: rung 1 can't separate fills there.
  // Red-side colliders FLOAT to the muted pastel-rose register; orange-side
  // colliders keep their identity in dark too (uniform component rule —
  // the earlier apricot float was another flavor of identity loss).
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
  // Kept for ResolvedBrand back-compat: the demo chips and cssRender note
  // copy read .warningVariant. Derived from the SAME light-mode collision +
  // split that drives the override; the override itself is materialized by
  // pickSignalShift (yellow's 'shift' side = the former generateLemonWarning).
  let warnVariant: 'lemon' | 'macaroni' | null = null

  if (!opts?.exact) {
    const warn = SIGNAL_SCALES.get('yellow')!
    warnVariant = warningVariant(scale, warn.scale, warn.def)
    if (warnVariant) pending = pending.filter(n => n !== 'yellow')

    // Uniform signal-shift layer (yellow lemon, green, info-color — never red).
    // Output-only: only appends to signalOverrides. See signalShift.ts.
    for (const sigName of ['yellow', 'green', 'info-color'] as const) {
      const { def, scale: canonical } = SIGNAL_SCALES.get(sigName)!
      const shift = pickSignalShift(scale, canonical, def)
      if (shift) {
        signalOverrides.push({ name: sigName, scale: shift.scale, note: shift.note })
        pending = pending.filter(n => n !== sigName)
      }
    }
  }

  // FINAL render step — red cool rotation of light stops 9/10 (see the
  // ordering invariant above: nothing below this line may run a gate).
  // Rung-1 and archetype-override scales are exempt (already re-anchored);
  // exact mode ships the hex untouched. inRedBand is evaluated on the RAW
  // brand hue; outside the red band the fill never rotates and the brand
  // fill stays the exact input hex.
  if (!opts?.exact && !opts?.archetypeOverride && !rung1 && inRedBand(scale.brandH)) {
    applyRedCoolRender(scale, true)
  }

  return { scale, shearDeg: 0, rung1, darkCollider, warningVariant: warnVariant, pending, signalOverrides, errorComponentRule }
}
