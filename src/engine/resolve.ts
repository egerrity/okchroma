

import { generateScale, generateSubtleSecondary, applyRedRepelRender, inRedRepelBand, RED_PIVOT_H, type GeneratedScale, type ContrastProfile } from './colorEngine'
import { darkChromaCurve } from './darkChromaCurve'
import type { Archetype } from './archetypes'
import { SIGNALS, type SignalDef } from './signals'
import { DARK_BRAND_FILL_MIN_L } from './stopTable'
import {
  checkCollision,
  checkHueCollision,
  SECONDARY_NOTE_MIN_V,
  stopDeltaE,
  warningVariant,
  RUNG1_ARCHETYPE,
} from './collision'
import { pickSignalShift, signalSwapVariants } from './signalShift'

type SignalScales = Map<SignalDef['name'], { def: SignalDef; scale: GeneratedScale }>
const buildSignalScales = (contrastProfile?: ContrastProfile): SignalScales =>
  new Map(
    SIGNALS.map(def => [
      def.name,

      { def, scale: generateScale(def.hex, def.name, undefined, { highlight: true, darkChromaCurve, loudCta: true, darkFillMinL: def.darkFillMinL, enforceOnFillContrast: true, suppressRedCool: true, goldBoost: true, contrastProfile }) },
    ])
  )

export const SIGNAL_SCALES = buildSignalScales()

// the canonical signal scales PER PROFILE: the collision machinery must compare the brand against
// signals solved under the SAME profile. The apca set is built lazily on first use and cached.
let apcaSignalScales: SignalScales | null = null
export function signalScalesFor(contrastProfile?: ContrastProfile): SignalScales {
  if (contrastProfile !== 'apca') return SIGNAL_SCALES
  return (apcaSignalScales ??= buildSignalScales('apca'))
}

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

function collisionStatus(scale: GeneratedScale, sigScales: SignalScales): { trigger: SignalDef['name'] | null; pending: SignalDef['name'][] } {
  let trigger: SignalDef['name'] | null = null
  const pending: SignalDef['name'][] = []
  for (const { def, scale: sigScale } of sigScales.values()) {
    if (def.name === 'red') {
      // rung-1 eligibility stays TYPE-2 (cta ΔE): the dark-archetype regen is a value
      // move; red's whole-ramp remedy is the always-on repel, not a gated rule (C7 split)
      if (checkCollision(scale, sigScale, def, 'light').collides) trigger = def.name
    } else if (checkHueCollision(scale, sigScale, def).collides) {
      pending.push(def.name)
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

    // opt-in contrast profile: threads into every generateScale call AND selects the matching
    // canonical signal set (collision decisions must compare like with like). Default 'wcag'.
    contrastProfile?: ContrastProfile

    // internal (resolveTheme): skip the collision machinery (rung-1 / dark collider / signal
    // shifts) — the SECONDARY's signal interactions are the THEME's decisions, and its red
    // yield goes LIGHTER (subtle), the MIRROR of rung-1's darken (owner rule; supersedes
    // "a secondary red earns rung 1 like a primary would").
    skipCollisionRules?: boolean
  }
): ResolvedBrand {
  const sigScales = signalScalesFor(opts?.contrastProfile)

  const floor = {
    darkFillMinL: DARK_BRAND_FILL_MIN_L,
    enforceOnFillContrast: !opts?.exact,

    coolRedDark: !opts?.exact,

    darkChromaCurve: opts?.exact ? undefined : darkChromaCurve,
    style: opts?.style,

    highlight: true,
    contrastProfile: opts?.contrastProfile,
  }

  const rung1Opts = { stop11DeepenL: 0.07, stop12DeepenL: 0.05 }
  let scale = generateScale(hex, name, undefined, floor)

  let rung1: SignalDef['name'] | null = null
  let pending: SignalDef['name'][] = []
  let errorComponentRule = false

  if (opts?.archetypeOverride) {
    scale = generateScale(hex, name, opts.archetypeOverride, floor)
  } else if (!opts?.exact && !opts?.skipCollisionRules) {
    const status = collisionStatus(scale, sigScales)
    if (status.trigger) {

      if (inRedRepelBand(scale.brandH)) {
        rung1 = status.trigger
        scale = generateScale(hex, name, RUNG1_ARCHETYPE, { ...floor, ...rung1Opts })
      } else {
        errorComponentRule = true
      }
    }
    pending = status.pending
  }

  let darkCollider: 'muted' | null = null
  if (!opts?.exact && !opts?.skipCollisionRules) {
    const err = sigScales.get('red')!
    // COOL SIDE ONLY: the muted float is the value-separation for brands whose dark hue
    // can't exit (the cool side owns the pink exit already). Warm of the pivot the repel
    // separates by hue and the directive's dark-cta treatment applies instead — muted's
    // pastel anchor would also re-collide the ramp (it re-anchors the dark torsion at the
    // pastel L, dragging every low stop back onto the signal hue).
    if (checkCollision(scale, err.scale, err.def, 'dark').collides) {
      if (inRedRepelBand(scale.brandH) && scale.brandH <= RED_PIVOT_H) {
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

  if (!opts?.exact && !opts?.skipCollisionRules) {
    const warn = sigScales.get('yellow')!
    warnVariant = warningVariant(scale, warn.scale, warn.def)
    if (warnVariant) pending = pending.filter(n => n !== 'yellow')

    for (const sigName of ['yellow', 'green', 'info-color'] as const) {
      const { def, scale: canonical } = sigScales.get(sigName)!
      const shift = pickSignalShift(scale, canonical, def, opts?.contrastProfile)
      if (shift) {
        signalOverrides.push({ name: sigName, scale: shift.scale, note: shift.note })
        pending = pending.filter(n => n !== sigName)
      }
    }
  }

  // cta hue follows the repel. Cool side: rung-1's dark value separates on its own, the cta
  // keeps identity hue (!rung1 preserves the shipped values). Warm side: the dark treatment
  // AND the warm hue compose — "dark tomato, not dark red" (owner directive, CATALOG C6).
  if (!opts?.exact && !opts?.archetypeOverride && (!rung1 || scale.brandH > RED_PIVOT_H) && inRedRepelBand(scale.brandH)) {
    applyRedRepelRender(scale, true, opts?.contrastProfile)
  }

  return { scale, shearDeg: 0, rung1, darkCollider, warningVariant: warnVariant, pending, signalOverrides, errorComponentRule }
}

// ════════════════════════════════════════════════════════════════════════════════════════
// resolveTheme — THEME-level resolution (SECONDARY-PLAN, owner-set rules 2026-07-02).
// resolveBrand resolves one color against the signals; nothing used to see primary AND
// secondary together. resolveTheme adds that: the primary + signals resolve EXACTLY as today
// (byte-identical — same resolveBrand call), then the secondary resolves against the
// POST-SHIFT signal set under the per-signal-ROOM precedence:
//   red        → no room (identity sacred): the secondary yields SUBTLE — the mirror of
//                rung-1 (primary darkens; the subtle register is lighter + lower chroma).
//   yellow     → no band room: the secondary yields subtle. (Gold-vs-yellow threshold is
//                calibrated by sweep — the numbers over-fire vs context; annotated.)
//   green      → one move, primary priority: a swap variant is adopted only if the primary
//                didn't spend green's move AND the variant clears BOTH brand colors.
//   info-color → wide band, not sacred: variants are tried even if the primary already
//                shifted it — any adopted variant must still clear the primary.
// Yields are REGISTER (L/chroma) only, never hue. Auto-demotion = the SUBTLE treatment
// (one mechanism — also the user-facing secondaryLevel option), always annotated.
// Primary↔secondary similarity is ADVICE-only (measured ΔE annotation, never a gate).
// ════════════════════════════════════════════════════════════════════════════════════════

export type SecondaryLevel = 'standard' | 'subtle'

// The secondary's per-field MODE (owner design 2026-07-04: modes decoupled per family — the
// mockup's chip dropdown). tint/pastel = the two subtle chroma models (both ride the locked
// delta curve); outline = the tint ramp with the cta re-resolved (cta-1 transparent, cta-2 the
// cta color at OUTLINE_HOVER_ALPHA, on-cta ink-11, cta-stroke always highlight-8); exact = the
// standard full ramp, advice-only.
export type SecondaryStyle = 'tint' | 'pastel' | 'outline' | 'exact'
export const SUBTLE_TINT_MULT = 8          // owner pick (light) from the finalists sweep
export const SUBTLE_PASTEL_K = 0.35
export const OUTLINE_HOVER_ALPHA = 0.09    // owner: "8–10% of the resolved cta color"

export interface ResolvedSecondary {
  scale: GeneratedScale
  style: SecondaryStyle          // the per-field mode this secondary resolved under
  level: SecondaryLevel          // legacy shape: tint/pastel/outline → 'subtle', exact → 'standard'
  demoted: boolean               // auto-subtle fired (vs user-picked)
  derived: boolean               // generated from the brand hue (§2b posture, no hex supplied)
  notes: string[]
  distinctness: { light: number; dark: number; close: boolean }  // vs the primary cta (advice-only)
}

export interface ResolvedTheme {
  primary: ResolvedBrand
  // the primary with the THEME-final signal overrides merged in — a drop-in ResolvedBrand for
  // brandCss/themeToFigma, so emitters need no new signature to render the theme's signal set
  themed: ResolvedBrand
  secondary: ResolvedSecondary | null
  signalOverrides: SignalOverride[]
  notes: string[]
}

// provisional advice threshold for primary↔secondary similarity (sweep calibrates)
export const SECONDARY_DISTINCT_DELTA_E = 0.12

// ── the SUBTLE DELTA CURVE (owner-locked 2026-07-04, option B "distance-from-paper") ──────────
// The subtle secondary's cta sits a Δ away from the primary's cta, and Δ is a function of the
// primary's DISTANCE from the mode's paper — one mode-agnostic rule. It reproduces the owner's
// light-mode picks exactly (the points below ARE those picks, measured against the real resolved
// geometry: near-black .40 · dark .30 · rich .16 · vivid .24 · bright .14 · light .03) and it
// REVERSES in dark automatically (a light-archetype primary in dark is a near-white fill on
// near-black paper — max distance ⇒ the big Δ, exactly like near-black in light). The dark fill
// floor flattens most dark primaries to equal distance ⇒ equal Δ ⇒ uniform dark pairs.
// Direction: light +Δ toward pale (pole-capped, NO flip — owner rule); dark −Δ toward the paper.
const SUBTLE_DELTA_POINTS: Array<[number, number]> = [
  [0.0858, 0.03], [0.2412, 0.14], [0.4276, 0.24], [0.5176, 0.16], [0.6661, 0.30], [0.8506, 0.40],
]
export function subtleDeltaFor(distance: number): number {
  const pts = SUBTLE_DELTA_POINTS
  if (distance <= pts[0][0]) return pts[0][1]
  for (let i = 0; i < pts.length - 1; i++)
    if (distance >= pts[i][0] && distance <= pts[i + 1][0])
      return pts[i][1] + (pts[i + 1][1] - pts[i][1]) * ((distance - pts[i][0]) / (pts[i + 1][0] - pts[i][0]))
  return pts[pts.length - 1][1]
}
const SUBTLE_LIGHT_POLE_CAP = 0.985
const SUBTLE_DARK_FLOOR = 0.22
export const subtleCtaLFor = (p: GeneratedScale): { light: number; dark: number } => {
  const p1L = p.light.find(s => s.stop === 1)!.L
  const dp1L = p.dark.find(s => s.stop === 1)!.L
  return {
    light: Math.min(p.cta.L + subtleDeltaFor(Math.abs(p.cta.L - p1L)), SUBTLE_LIGHT_POLE_CAP),
    dark: Math.max(p.ctaDark.L - subtleDeltaFor(Math.abs(p.ctaDark.L - dp1L)), SUBTLE_DARK_FLOOR),
  }
}

const ctaDistinctness = (p: GeneratedScale, s: GeneratedScale) => {
  const light = stopDeltaE(p.cta, s.cta)
  const dark = stopDeltaE(p.ctaDark, s.ctaDark)
  return { light, dark, close: Math.min(light, dark) < SECONDARY_DISTINCT_DELTA_E }
}

export function resolveTheme(input: {
  primaryHex: string
  name?: string
  // per-family modes (owner design: exact is DECOUPLED per family — the chip dropdowns).
  // primaryMode 'exact' skips the primary's engine rules; primaryArchetype = one of the six
  // anchors exposed under the same dropdown (implies recommended machinery, pinned anchor).
  primaryMode?: 'recommended' | 'exact'
  primaryArchetype?: Archetype
  secondaryHex?: string | null
  // the secondary's own mode chip; default 'tint'. Supersedes secondaryLevel (kept for
  // programmatic compat: 'standard' ≈ 'exact', 'subtle' ≈ 'tint').
  secondaryStyle?: SecondaryStyle
  secondaryLevel?: SecondaryLevel
  // §2b posture: no secondaryHex + deriveSecondary → a subtle secondary from the brand hue
  deriveSecondary?: boolean
  // legacy GLOBAL exact (pre-decoupling callers): applies to both families when the per-family
  // modes are absent
  exact?: boolean
  style?: 'default' | 'deeper' | 'full-chroma'
  archetypeOverride?: Archetype
  contrastProfile?: ContrastProfile
}): ResolvedTheme {
  const pExact = input.primaryMode ? input.primaryMode === 'exact' : input.exact
  const pArchetype = input.primaryArchetype ?? input.archetypeOverride
  const secStyle: SecondaryStyle = input.secondaryStyle
    ?? (input.secondaryLevel === 'standard' ? 'exact' : input.secondaryLevel === 'subtle' ? 'tint'
      : input.exact ? 'exact' : 'tint')
  const opts = { exact: pExact, style: input.style, contrastProfile: input.contrastProfile }
  const primary = resolveBrand(input.primaryHex, input.name ?? 'brand', { ...opts, archetypeOverride: pArchetype })
  const cp = input.contrastProfile
  const sigScales = signalScalesFor(cp)
  const notes: string[] = []

  // the subtle chroma model per style (tint = the owner's light pick ×8; pastel = k .35);
  // outline rides the tint ramp — its cta re-resolution happens at the EMITTERS
  const subtleModel = secStyle === 'pastel' ? { pastelK: SUBTLE_PASTEL_K } : { mult: SUBTLE_TINT_MULT }

  const effectiveOf = (name: SignalDef['name']) =>
    primary.signalOverrides.find(o => o.name === name)?.scale ?? sigScales.get(name)!.scale

  // corrected detection for secondaries (C7): the TYPE-1 hue gate at the annotation
  // qualifier, against the THEME's effective (post-shift) signal set. Advice only — the
  // secondary remedy layer is its own owner round; no reshape happens here.
  const signalNotesFor = (scale: GeneratedScale, wording: (name: SignalDef['name'], washDE: number) => string): string[] => {
    const out: string[] = []
    for (const def of SIGNALS) {
      const h = checkHueCollision(scale, effectiveOf(def.name), def, { minV: SECONDARY_NOTE_MIN_V })
      if (h.collides) out.push(wording(def.name, Math.min(h.washDeltaE.light, h.washDeltaE.dark)))
    }
    return out
  }

  // ---- no secondary supplied: nothing, or the DERIVED subtle secondary (§2b) ----
  if (!input.secondaryHex) {
    if (!input.deriveSecondary) return { primary, themed: primary, secondary: null, signalOverrides: primary.signalOverrides, notes }
    const scale = generateSubtleSecondary(input.primaryHex, { contrastProfile: cp, ctaL: subtleCtaLFor(primary.scale), pastelK: SUBTLE_PASTEL_K })
    return {
      primary, themed: primary,
      secondary: {
        scale,
        style: 'pastel',   // derived is ALWAYS pastel (owner: differentiates it from the
                           // same-hue brand + neutral rows — a tint ramp read as redundant)
        level: 'subtle', demoted: false, derived: true,
        notes: [
          'secondary derived from the brand color (subtle register)',
          ...signalNotesFor(scale, (name, dE) =>
            `derived secondary sits on the ${name} signal's hue (wash ΔE ${dE.toFixed(3)}) — it tracks the brand color; expected, annotated for the remedy round`),
        ],
        distinctness: ctaDistinctness(primary.scale, scale),
      },
      signalOverrides: primary.signalOverrides, notes,
    }
  }

  // ---- supplied secondary, resolved under ITS OWN mode chip ----
  let secNotes: string[] = []
  let scale: GeneratedScale
  let level: SecondaryLevel

  if (secStyle === 'exact') {
    // EXACT: the user's color as a full standard ramp, hands off — signal proximity is ADVICE,
    // never a reshape (the pre-P1 behavior, now carried as annotations)
    const rSec = resolveBrand(input.secondaryHex, 'secondary', { ...opts, exact: true, skipCollisionRules: true })
    scale = rSec.scale
    level = 'standard'
    secNotes = signalNotesFor(scale, (name, dE) =>
      `secondary reads close to the ${name} signal (wash ΔE ${dE.toFixed(3)}) — exact keeps your color; consider more distance`)
  } else {
    // TINT / PASTEL / OUTLINE: the subtle register, PRIMARY-relative (the locked distance
    // curve) — every pair reads "the same amount of subtle next to its primary", both modes.
    // Residuals are ANNOTATED, never silent (gold-vs-yellow can stay numerically close —
    // owner-flagged as context-distinct; threshold calibration pending).
    scale = generateSubtleSecondary(input.secondaryHex, { contrastProfile: cp, ctaL: subtleCtaLFor(primary.scale), ...subtleModel })
    level = 'subtle'
    secNotes = signalNotesFor(scale, (name, dE) =>
      `subtle secondary still reads near ${name} by the numbers (wash ΔE ${dE.toFixed(3)}) — expected to separate in context; threshold calibration pending`)
  }

  const distinctness = ctaDistinctness(primary.scale, scale)
  if (distinctness.close)
    notes.push(`secondary reads close to the primary (ΔE ${Math.min(distinctness.light, distinctness.dark).toFixed(2)}) — consider a more distinct color`)

  return {
    primary, themed: primary,
    secondary: { scale, style: secStyle, level, demoted: false, derived: false, notes: secNotes, distinctness },
    signalOverrides: primary.signalOverrides, notes,
  }
}
