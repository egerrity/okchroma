

import { generateScale, generateSubtleSecondary, type GeneratedScale, type ContrastProfile } from './colorEngine'
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
  RED_GATE,
  redGateDist,
} from './collision'
import { apcaY, apcaLc, encodedChannels, clampChromaToGamut, oklchToLinearRgb } from './constraints'
import { pickSignalShift, signalSwapVariants } from './signalShift'
import { hexToOklch, hueDelta, makeStop, maxChromaAt, RED_SOLVE, redSolveDist } from './colorMath'
import { apparentL, grayApparentL, solveCForApparent, solveLForApparent } from './perceptualL'
import { subtleSecondaryChromaCurve } from './neutralCurve'
import { hoverL } from './archetypes'
import { p2Diff, P2_D, P2_D_UP } from './p2'
import { buildContext, whiteTextLcAt, apcaYAt, onFillIsWhiteDarkAt } from '../reqtoken/producers'
import { CTA_ONFILL_ENFORCE_LC } from '../reqtoken/profiles'

type SignalScales = Map<SignalDef['name'], { def: SignalDef; scale: GeneratedScale }>
const buildSignalScales = (contrastProfile?: ContrastProfile): SignalScales =>
  new Map(
    SIGNALS.map(def => [
      def.name,

      { def, scale: generateScale(def.hex, def.name, undefined, { highlight: true, darkChromaCurve, darkCtaC: 'signal', darkFillMinL: def.darkFillMinL, enforceOnFillContrast: true, suppressRedCool: true, goldBoost: true, contrastProfile }) },
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

  // C12 VALUE REPEL: per-mode fired flags — the cta exited red's register (the one rule that
  // replaced rung-1's forced-dark, the warm-forced bright anchor, and the muted dark collider).
  // null = the require was satisfied without moving.
  redRepel: { light: boolean; dark: boolean } | null

  warningVariant: 'lemon' | 'macaroni' | null

  pending: SignalDef['name'][]
  signalOverrides: SignalOverride[]
}

// TYPE-1 (hue/family) detection for the non-red signals — red's TYPE-2 register proximity is
// owned by the cta repel require inside the resolver (C12); no gate needed here (the ΔE metric
// self-limits to red-adjacent registers).
function hueCollisionPending(scale: GeneratedScale, sigScales: SignalScales): SignalDef['name'][] {
  const pending: SignalDef['name'][] = []
  for (const { def, scale: sigScale } of sigScales.values()) {
    if (def.name !== 'red' && checkHueCollision(scale, sigScale, def).collides) pending.push(def.name)
  }
  return pending
}

// C12 v8 — the RED COMPLEMENT (owner-settled 2026-07-10; model = docs/engine-spec/c12-archive/
// joint-solve-model.md): red moves for B, the vibration problem — positioned inside her
// calibrated zones (deep core L.45–.49 or the light edge tier L.65–.75; the .50–.58 middle
// is ring territory and NEVER used — canonical itself lives there, which is why a lightened
// brand ALWAYS takes a deep-core red), on the OPPOSITE side of the brand's final cta,
// cool-first beside warm brands, first-clean-wins in preference order. Clean = the P2 bar
// (.12 deep / .11 light) + solve-metric release + a passing pole. The variant cta is PINNED
// (makeStop, never re-enforced — enforcement would collapse it back onto canonical red;
// generateSubtleSecondary's ctaL pin is the precedent); ramp, washes, inks and the ENTIRE
// dark side stay canonical red verbatim (dark never fires under the Lc-60 bar).
// Returns null = canonical red already stands clean beside this brand.
const blackLcAt = (L: number, C: number, H: number): number =>
  Math.abs(apcaLc(apcaYAt(0, 0, 0), apcaYAt(L, clampChromaToGamut(L, C, H), H)))
function redComplementVariant(
  brandCta: { L: number; C: number; H: number },
  seed: { L: number; C: number; H: number },
  brandWentUp: boolean,
  red: { def: SignalDef; scale: GeneratedScale },
  contrastProfile?: ContrastProfile,
): { scale: GeneratedScale; note: string } | null {
  const rctx = buildContext(red.def.hex, {
    highlight: true, darkChromaCurve, darkCtaC: 'signal', darkFillMinL: red.def.darkFillMinL,
    enforceOnFillContrast: true, suppressRedCool: true, goldBoost: true, contrastProfile,
  } as any)
  const redCta = red.scale.cta
  const release = RED_GATE.G + RED_SOLVE.ring
  const at = (L: number, H: number) => ({ L, C: clampChromaToGamut(L, rctx.cAt('light', L, rctx.brandC), H), H })
  const poleOk = (c: { L: number; C: number; H: number }): boolean =>
    contrastProfile !== 'apca' || whiteTextLcAt(c.L, c.C, c.H) >= CTA_ONFILL_ENFORCE_LC ||
    blackLcAt(c.L, c.C, c.H) >= CTA_ONFILL_ENFORCE_LC
  const clean = (c: { L: number; C: number; H: number }): boolean =>
    p2Diff(brandCta, c) >= (c.L < brandCta.L ? P2_D : P2_D_UP) &&
    redSolveDist(brandCta, c) >= release && poleOk(c)
  if (!brandWentUp && clean(redCta)) return null
  const hues = hueDelta(seed.H, redCta.H) <= RED_SOLVE.redHueMagentaDh
    ? RED_SOLVE.redHuesMagentaBrand : RED_SOLVE.redHuesWarmBrand
  const wantLighter = brandCta.L <= redCta.L
  const tiers = wantLighter
    ? [[...RED_SOLVE.edgeL], RED_SOLVE.coreL.filter(l => l > brandCta.L)]
    : [[...RED_SOLVE.coreL], [...RED_SOLVE.edgeL]]
  let pick: { L: number; C: number; H: number } | null = null
  outer: for (const tier of tiers) {
    const ls = [...tier].sort((a, b) => wantLighter ? a - b : b - a)
    for (const L of ls) for (const H of hues) {
      const c = at(L, H)
      const onSide = wantLighter ? c.L > brandCta.L : c.L < brandCta.L
      if (!onSide || !clean(c)) continue
      pick = c
      break outer
    }
  }
  if (!pick) return null // no clean complement in her zones — canonical stands, sweeps flag the pair
  const cta = makeStop(redCta.stop, pick.L, rctx.cAt('light', pick.L, rctx.brandC), pick.H)
  const hL = hoverL(pick.L)
  const ctaHover = makeStop(red.scale.ctaHover.stop, hL, rctx.cAt('light', hL, rctx.brandC), pick.H)
  // pinned mints skip the producer's enforce-darken, so the wcag conformance floor rides
  // the pole judge (a light coral variant must flip to black text, not ship white sub-4.5)
  const onFillTextIsWhite = onFillIsWhiteDarkAt(cta.L, cta.C, cta.H, true, contrastProfile === 'apca' ? undefined : 4.5)
  return {
    scale: { ...red.scale, cta, ctaHover, onFillTextIsWhite },
    // naming candidates only — the identity name is the owner's call at bless. No hue suffix:
    // the plugin's note parser mints Figma variable paths from this string.
    note: `red → ${pick.L < redCta.L ? 'rich' : 'coral'} L${pick.L.toFixed(2)}`,
  }
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

    // opt-in APCA legibility clearance — threads into every generateScale call (wcag lane only, default off).
    apcaClearance?: boolean

    // internal (resolveTheme, derived secondary): the FLAT dark-cta register — see
    // DEFAULT_SECONDARY.darkFlatGapApp. Absent for every other caller (the prominence pin holds).
    darkCtaFlatApp?: number
  }
): ResolvedBrand {
  const sigScales = signalScalesFor(opts?.contrastProfile)

  // C12 v8 (owner-settled 2026-07-10; model = docs/engine-spec/c12-archive/joint-solve-model.md):
  // ONE classification — the joint solve. The brand side rides opts.ctaSolve through
  // generation (solveBrandExit, producers.ts: membership on the nominal seed, nearest-edge
  // exit, her direction rules, brick-band diagonal); the red complement resolves after,
  // against the brand's FINAL cta. Off for exact (hands-off — its true-red unification is
  // the follow-up), the secondary (theme's subtle treatment), and archetypeOverride (the
  // solve is pair-calibrated; neither half ships alone).
  const red = sigScales.get('red')!.scale
  const seedO = hexToOklch(hex)
  const collisions = !opts?.exact && !opts?.skipCollisionRules
  const solving = collisions && !opts?.archetypeOverride
  const solveOpt = solving ? {
    ctaSolve: {
      seed: seedO,
      red: { L: red.cta.L, C: red.cta.C, H: red.cta.H },
      redDark: { L: red.ctaDark.L, C: red.ctaDark.C, H: red.ctaDark.H },
    },
  } : {}

  const floor = {
    ...solveOpt,
    darkFillMinL: DARK_BRAND_FILL_MIN_L,
    enforceOnFillContrast: !opts?.exact,

    coolRedDark: !opts?.exact,

    darkChromaCurve: opts?.exact ? undefined : darkChromaCurve,
    style: opts?.style,

    highlight: true,
    contrastProfile: opts?.contrastProfile,
    apcaClearance: opts?.apcaClearance,
    darkCtaFlatApp: opts?.darkCtaFlatApp,
  }

  let scale = generateScale(hex, name, undefined, floor)

  let pending: SignalDef['name'][] = []

  if (opts?.archetypeOverride) {
    scale = generateScale(hex, name, opts.archetypeOverride, floor)
  } else if (!opts?.exact && !opts?.skipCollisionRules) {
    pending = hueCollisionPending(scale, sigScales)
  }

  // per-mode fired flags, honestly: dark fires via solveDarkCtaExit (858053e) — the old
  // light-only read predated it, hardcoded dark:false, and returned null for dark-only movers
  const redRepel = scale.ctaRepelled?.light || scale.ctaRepelled?.dark
    ? { light: !!scale.ctaRepelled?.light, dark: !!scale.ctaRepelled?.dark }
    : null

  const signalOverrides: SignalOverride[] = []

  // C12 v8 red complement: resolves for EVERY solving brand against its FINAL cta —
  // independent of firing (a near-red neighbor vibrates beside canonical red even when not
  // confusable). A lightened brand always gets a deep-core red; canonical stands only when
  // it is already clean beside this brand.
  if (solving) {
    const brandWentUp = !!scale.ctaRepelled?.light && scale.cta.L > seedO.L + 1e-6
    const v = redComplementVariant(scale.cta, seedO, brandWentUp, sigScales.get('red')!, opts?.contrastProfile)
    if (v) signalOverrides.push({ name: 'red', scale: v.scale, note: v.note })
  }

  let warnVariant: 'lemon' | 'macaroni' | null = null

  if (!opts?.exact && !opts?.skipCollisionRules) {
    const warn = sigScales.get('yellow')!
    warnVariant = warningVariant(scale, warn.scale, warn.def)
    if (warnVariant) pending = pending.filter(n => n !== 'yellow')

    for (const sigName of ['yellow', 'green', 'blue'] as const) {
      const { def, scale: canonical } = sigScales.get(sigName)!
      const shift = pickSignalShift(scale, canonical, def, opts?.contrastProfile)
      if (shift) {
        signalOverrides.push({ name: sigName, scale: shift.scale, note: shift.note })
        pending = pending.filter(n => n !== sigName)
      }
    }

  }

  // C6's light cta render hue-shift is RETIRED from this path (owner ruling 2026-07-10:
  // "we are not supposed to be using that cooling … WE ARE DECOLLIDING THE RED"): cta red
  // de-collision belongs to C12 alone (gate → split/exit/variant); no other machinery may
  // move a cta to de-collide. The shift was cooling unfired deep maroons into fuchsia.

  return { scale, shearDeg: 0, redRepel, warningVariant: warnVariant, pending, signalOverrides }
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
//   blue (was info-color) → wide band, not sacred: variants are tried even if the primary already
//                shifted it — any adopted variant must still clear the primary.
// Yields are REGISTER (L/chroma) only, never hue. Auto-demotion = the SUBTLE treatment
// (one mechanism — also the user-facing secondaryLevel option), always annotated.
// Primary↔secondary similarity is ADVICE-only (measured ΔE annotation, never a gate).
// ════════════════════════════════════════════════════════════════════════════════════════

export type SecondaryLevel = 'standard' | 'subtle'

// The secondary's per-field MODE (owner design 2026-07-04: modes decoupled per family — the
// mockup's chip dropdown). muted/vibrant = the two subtle chroma models (both ride the locked
// delta curve); outline = the muted ramp with the cta re-resolved (cta-1 transparent, cta-2 the
// cta color at OUTLINE_HOVER_ALPHA, on-cta ink-11, cta-border always highlight-8); exact = the
// standard full ramp, advice-only.
// the offering (owner 2026-07-12, striking the bespoke subtle models: "you either use the
// derived or you use custom"): 'default' = the derived seed-transform (no hex supplied);
// 'exact' = the CUSTOM path — your hex ships as a full standard ramp; 'outline' = the exact
// ramp with the cta re-resolved at the emitters (cta-1 transparent, border = highlight-8).
export type SecondaryStyle = 'default' | 'outline' | 'exact'
// legacy ids: the retired subtle models (tint/pastel and their muted/vibrant renames) map to
// 'exact' — a supplied hex is honored as custom, never silently re-modeled.
export type LegacySecondaryStyle = SecondaryStyle | 'tint' | 'pastel' | 'muted' | 'vibrant'
export const normalizeSecondaryStyle = (s: LegacySecondaryStyle): SecondaryStyle =>
  s === 'tint' || s === 'pastel' || s === 'muted' || s === 'vibrant' ? 'exact' : s
// ── the DEFAULT (derived) secondary — a SEED TRANSFORM (owner-picked "strong" on
// render/secondary-default-model.html, 2026-07-12): slight hue rotation; L lifted
// proportionally to the remaining room toward the light pole (the delta shrinks as the seed
// nears the background); chroma gently relative to the seed, bounded by the room at the
// landing. The lifted seed then resolves as a NORMAL ramp — no pinned cta, no bespoke curve,
// primary-independent by construction ("we just didn't try to set this for people").
// The two GAP registers (owner 2026-07-12, picked on render/secondary-gap-combo.html: "a min
// of g10 in light but a flat g23 in dark"), both in APPARENT (H-K) distance:
//   minGapApp — the lifted seed keeps at least this distance from the light ground (white), so
//     a near-white brand's derived secondary can't hug the paper (only chartreuse/yellow-class
//     seeds move; the approved light look otherwise holds).
//   darkFlatGapApp — the derived DARK cta sits at exactly this distance above the dark ground
//     (navy's own unconstrained register), flat across hues; consumed by the resolver as
//     opts.darkCtaFlatApp (the prominence pin is a brand-identity rule — a derived pastel has
//     none, so it flips instead of shipping the light pastel on the dark page).
export const DEFAULT_SECONDARY = { rot: 12, kL: 0.65, kC: 0.5, kR: 0.4, lRoom: 0.97, minGapApp: 10, darkFlatGapApp: 23 } as const
const LIGHT_GROUND_APP = grayApparentL(1.0)
export function defaultSecondarySeed(hex: string): string {
  const seed = hexToOklch(hex)
  const d = DEFAULT_SECONDARY
  let L2 = seed.L + d.kL * Math.max(0, d.lRoom - seed.L)
  const H2 = (seed.H + d.rot + 360) % 360
  let C2 = Math.min(d.kC * seed.C, d.kR * maxChromaAt(L2, H2))
  // the light minimum gap (two passes settle the L↔C interaction)
  for (let i = 0; i < 2; i++) {
    if (LIGHT_GROUND_APP - apparentL(L2, clampChromaToGamut(L2, C2, H2), H2) < d.minGapApp) {
      L2 = solveLForApparent(LIGHT_GROUND_APP - d.minGapApp, C2, H2)
      C2 = Math.min(d.kC * seed.C, d.kR * maxChromaAt(L2, H2))
    }
  }
  const cc = clampChromaToGamut(L2, C2, H2)
  const [rl, gl, bl] = oklchToLinearRgb(L2, cc, H2)
  const gm = (v: number) => { const x = Math.min(1, Math.max(0, v)); return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055 }
  const ch = (v: number) => Math.round(gm(v) * 255).toString(16).padStart(2, '0')
  return `#${ch(rl)}${ch(gl)}${ch(bl)}`
}

// RETIRED MODELS' registers (2026-07-12 strike) — kept only for the archived sweep scripts
export const SUBTLE_TINT_MULT = 8
export const SUBTLE_PASTEL_K = 0.35

// ── the v2 SUBTLE MODELS (owner 2026-07-11, accepted on render/secondary-models.html:
// "what we are trying to offer is one that is muted and one that is more vibrant") ──────────
export const OUTLINE_HOVER_ALPHA = 0.09    // owner: "8–10% of the resolved cta color"

export interface ResolvedSecondary {
  scale: GeneratedScale
  style: SecondaryStyle          // the per-field mode this secondary resolved under
  level: SecondaryLevel          // legacy shape: muted/vibrant/outline → 'subtle', exact → 'standard'
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
  // the secondary's own mode chip; default 'muted'. Supersedes secondaryLevel (kept for
  // programmatic compat: 'standard' ≈ 'exact', 'subtle' ≈ 'muted'). Legacy 'tint'/'pastel'
  // ids are normalized (the 2026-07-12 rename).
  secondaryStyle?: LegacySecondaryStyle
  secondaryLevel?: SecondaryLevel
  // §2b posture: no secondaryHex + deriveSecondary → a subtle secondary from the brand hue
  deriveSecondary?: boolean
  // legacy GLOBAL exact (pre-decoupling callers): applies to both families when the per-family
  // modes are absent
  exact?: boolean
  style?: 'default' | 'deeper' | 'full-chroma'
  archetypeOverride?: Archetype
  contrastProfile?: ContrastProfile
  apcaClearance?: boolean
}): ResolvedTheme {
  const pExact = input.primaryMode ? input.primaryMode === 'exact' : input.exact
  const pArchetype = input.primaryArchetype ?? input.archetypeOverride
  const secStyle: SecondaryStyle = (input.secondaryStyle && normalizeSecondaryStyle(input.secondaryStyle))
    ?? (input.secondaryLevel === 'standard' ? 'exact' : input.secondaryLevel === 'subtle' ? 'exact'
      : 'exact')
  const opts = { exact: pExact, style: input.style, contrastProfile: input.contrastProfile, apcaClearance: input.apcaClearance }
  const primary = resolveBrand(input.primaryHex, input.name ?? 'brand', { ...opts, archetypeOverride: pArchetype })
  const cp = input.contrastProfile
  const sigScales = signalScalesFor(cp)
  const notes: string[] = []

  // C12 exact-mode ADVICE (owner ruling 2026-07-09: outline is "something we recommend
  // for exact mode, not something we do"). Exact skips every collision rule, so the file
  // carries recommendations instead: the outline shape for red-register clashes, and a
  // legibility warning for the true dead zones (measured: 34/288 exact seed-lanes have
  // no on-cta pole reaching Lc 60; the pick itself is already the best pole).
  if (pExact) {
    const red = sigScales.get('red')!
    if (redGateDist(primary.scale.cta, red.scale.cta) <= RED_GATE.G)
      notes.push("exact mode: this color sits in the red signal's family — outline style is recommended for destructive actions beside the primary cta")
    const c = primary.scale.cta
    const Ybg = apcaY(...encodedChannels(c.L, c.C, c.H))
    const best = Math.max(
      Math.abs(apcaLc(apcaY(...encodedChannels(1, 0, 0)), Ybg)),
      Math.abs(apcaLc(apcaY(...encodedChannels(0, 0, 0)), Ybg))
    )
    if (best < 60)
      notes.push(`exact mode: no on-cta text reaches APCA Lc 60 on this cta (best ${best.toFixed(0)}) — the better pole ships; recommended mode guarantees text contrast`)
  }


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

  // ONE default model, two seeds (owner 2026-07-12: '"from brand" custom … would just let
  // them pick the color but do the same thing as derived from brand'): the derived posture
  // transforms the PRIMARY; the 'default' style on a supplied hex transforms the USER'S color
  // the same way — lift transform, engine-normal ramp, flat dark cta. One machinery.
  const resolveDefaultModel = (seedHex: string) => {
    const liftedHex = defaultSecondarySeed(seedHex)
    return {
      liftedHex,
      scale: resolveBrand(liftedHex, 'secondary', {
        skipCollisionRules: true, contrastProfile: cp,
        darkCtaFlatApp: DEFAULT_SECONDARY.darkFlatGapApp,
      }).scale,
    }
  }

  // ---- no secondary supplied: nothing, or the DERIVED subtle secondary (§2b) ----
  if (!input.secondaryHex) {
    if (!input.deriveSecondary) return { primary, themed: primary, secondary: null, signalOverrides: primary.signalOverrides, notes }
    // the DEFAULT model: transform the brand seed, resolve like a normal brand (secondary
    // convention: collisions are the theme's decisions). Everything — cta included — falls
    // out of the engine; the old quiet-register derived path is retired for the default.
    const { liftedHex, scale } = resolveDefaultModel(input.primaryHex)
    return {
      primary, themed: primary,
      secondary: {
        scale,
        style: 'default',
        level: 'subtle', demoted: false, derived: true,
        notes: [
          `secondary derived from the brand color (default model, seed ${liftedHex})`,
          ...signalNotesFor(scale, (name, dE) =>
            `derived secondary sits on the ${name} signal's hue (wash ΔE ${dE.toFixed(3)}) — it tracks the brand color; expected, annotated for the remedy round`),
        ],
        distinctness: ctaDistinctness(primary.scale, scale),
      },
      signalOverrides: primary.signalOverrides, notes,
    }
  }

  // ---- supplied hex + the 'default' style = FROM BRAND: the user's color through the SAME
  // model as the derived posture. Their pick is the seed, not the shipped ramp — exact is the
  // hands-off path.
  if (secStyle === 'default') {
    const { liftedHex, scale } = resolveDefaultModel(input.secondaryHex)
    const distinctness = ctaDistinctness(primary.scale, scale)
    if (distinctness.close)
      notes.push(`secondary reads close to the primary (ΔE ${Math.min(distinctness.light, distinctness.dark).toFixed(2)}) — consider a more distinct color`)
    return {
      primary, themed: primary,
      secondary: {
        scale, style: 'default', level: 'subtle', demoted: false, derived: false,
        notes: [
          `secondary derived from your color (default model, seed ${liftedHex})`,
          ...signalNotesFor(scale, (name, dE) =>
            `derived secondary sits on the ${name} signal's hue (wash ΔE ${dE.toFixed(3)}) — it tracks your color; expected, annotated for the remedy round`),
        ],
        distinctness,
      },
      signalOverrides: primary.signalOverrides, notes,
    }
  }

  // ---- supplied secondary = CUSTOM (owner 2026-07-12: "you either use the derived or you
  // use custom" — the bespoke subtle models are struck). The user's color ships as a full
  // standard ramp, hands off; signal proximity is ADVICE, never a reshape. 'outline' rides
  // this same ramp — its cta re-resolution happens at the EMITTERS.
  const rSec = resolveBrand(input.secondaryHex, 'secondary', { ...opts, exact: true, skipCollisionRules: true })
  const scale: GeneratedScale = rSec.scale
  const level: SecondaryLevel = 'standard'
  const secNotes = signalNotesFor(scale, (name, dE) =>
    `secondary reads close to the ${name} signal (wash ΔE ${dE.toFixed(3)}) — custom keeps your color; consider more distance`)

  const distinctness = ctaDistinctness(primary.scale, scale)
  if (distinctness.close)
    notes.push(`secondary reads close to the primary (ΔE ${Math.min(distinctness.light, distinctness.dark).toFixed(2)}) — consider a more distinct color`)

  return {
    primary, themed: primary,
    secondary: { scale, style: secStyle, level, demoted: false, derived: false, notes: secNotes, distinctness },
    signalOverrides: primary.signalOverrides, notes,
  }
}
