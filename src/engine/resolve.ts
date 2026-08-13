

import { generateScale, generateSubtleSecondary, type GeneratedScale, type ContrastProfile, type ColorStop } from './colorEngine'
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
import { apcaY, apcaLc, encodedChannels, clampChromaToGamut, oklchToLinearRgb, legalRatio, contrastRatio } from './constraints'
import { pickSignalShift, signalSwapVariants } from './signalShift'
import { hexToOklch, hueDelta, makeStop, maxChromaAt, onTextIsWhite, RED_SOLVE, redSolveDist, srgbEmitChannels } from './colorMath'
import { apparentL, grayApparentL, solveCForApparent, solveLForApparent } from './perceptualL'
import { subtleSecondaryChromaCurve } from './neutralCurve'
import { stateFillL } from './archetypes'
import { p2Diff, P2_D, P2_D_UP } from './p2'
import {
  buildContext, whiteTextLcAt, apcaYAt, onFillIsWhiteDarkAt,
  findLForWhiteTextLc, findLForBlackTextLc, APCA_ENFORCE_MARGIN_LC, APCA_SOLVE_MARGIN_LC,
} from './requirements/producers'
import { CTA_ONFILL_ENFORCE_LC, CRITICAL_CLEARANCE_LC } from './requirements/profiles'

type SignalScales = Map<SignalDef['name'], { def: SignalDef; scale: GeneratedScale }>
// C42 (owner 2026-08-02): the signals are one group under the clearance law — every signal
// cta clears the spec bar (Lc 65) except critical, whose identity carve-out rides the lower
// CRITICAL_CLEARANCE_LC (50). Reverses C18's "signals excluded (static-seeded)".
const buildSignalScales = (contrastProfile?: ContrastProfile): SignalScales =>
  new Map(
    SIGNALS.map(def => [
      def.name,

      { def, scale: generateScale(def.hex, def.name, undefined, { darkChromaCurve, darkCtaC: 'signal', darkFillMinL: def.darkFillMinL, enforceOnFillContrast: true, suppressRedCool: true, goldBoost: true, signalWarmDrift: true, contrastProfile, apcaClearance: true, apcaClearanceLc: def.name === 'red' ? CRITICAL_CLEARANCE_LC : undefined }) },
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

// C12 v8 — the RED COMPLEMENT (owner-settled 2026-07-10; model = joint-solve-model.md,
// c12 archive — git history only): red moves for B, the vibration problem — positioned inside her
// calibrated zones (deep core L.45–.49 or the light edge tier L.65–.75; the .50–.58 middle
// is ring territory and NEVER used — canonical itself lives there, which is why a lightened
// brand ALWAYS takes a deep-core red), on the OPPOSITE side of the brand's final cta,
// cool-first beside warm brands, first-clean-wins in preference order. Clean = the P2 bar
// (.12 deep / .11 light) + solve-metric release + a passing pole. The variant cta is PINNED
// (makeStop, never re-enforced — enforcement would collapse it back onto canonical red;
// generateSubtleSecondary's ctaL pin is the precedent); ramp, washes, inks and the ENTIRE
// dark side stay canonical red verbatim (the dark canonical carries its own C42 clearance).
// Returns null = canonical red already stands clean beside this brand.
const blackLcAt = (L: number, C: number, H: number): number =>
  Math.abs(apcaLc(apcaYAt(0, 0, 0), apcaYAt(L, clampChromaToGamut(L, C, H), H)))
// the red pair-cleanliness DISTANCES alone (poleOk is the candidate's own legality, judged
// where the variant is built) — split out so the secondary-collider merge can verify a red
// variant beside the OTHER brand's cta (owner 2026-08-03, primary-wins).
const redCleanBeside = (brandCta: { L: number; C: number; H: number }, c: { L: number; C: number; H: number }): boolean =>
  p2Diff(brandCta, c) >= (c.L < brandCta.L ? P2_D : P2_D_UP)
  && redSolveDist(brandCta, c) >= RED_GATE.G + RED_SOLVE.ring
function redComplementVariant(
  brandCta: { L: number; C: number; H: number },
  seed: { L: number; C: number; H: number },
  brandWentUp: boolean,
  red: { def: SignalDef; scale: GeneratedScale },
  contrastProfile?: ContrastProfile,
): { scale: GeneratedScale; note: string } | null {
  const rctx = buildContext(red.def.hex, {
    darkChromaCurve, darkCtaC: 'signal', darkFillMinL: red.def.darkFillMinL,
    enforceOnFillContrast: true, suppressRedCool: true, goldBoost: true, signalWarmDrift: true, contrastProfile,
  } as any)
  const redCta = red.scale.cta
  const at = (L: number, H: number) => ({ L, C: clampChromaToGamut(L, rctx.cAt('light', L, rctx.brandC), H), H })
  // C42 (owner 2026-08-02, supersedes the C23 either-pole gate): candidates are judged at
  // the SHIPPABLE pole under critical's clearance bar (CRITICAL_CLEARANCE_LC 50 — the
  // identity carve-out). The old gate accepted a zone when EITHER pole reached the bar,
  // but the wcag 4.5 floor then flipped the shipped pole to one it never checked — the
  // coral shipped black at Lc 42. Now: the pole that would ship must pass 4.5 (wcag lane)
  // AND clear the bar; a candidate short of the bar SLIDES pole-preserving up to it before
  // the distance gates judge it (the value falls out of the pipeline, no post-pick patch).
  const fireLc = CRITICAL_CLEARANCE_LC + APCA_ENFORCE_MARGIN_LC
  const shipsWhite = (c: { L: number; C: number; H: number }): boolean =>
    onFillIsWhiteDarkAt(c.L, c.C, c.H, true, contrastProfile === 'apca' ? undefined : 4.5)
  const poleOk = (c: { L: number; C: number; H: number }): boolean => {
    const white = shipsWhite(c)
    const lc = white ? whiteTextLcAt(c.L, c.C, c.H) : blackLcAt(c.L, c.C, c.H)
    const legal = contrastProfile === 'apca' || legalRatio(c.L, c.C, c.H, white ? 1.0 : 0) >= 4.5
    return legal && lc >= fireLc
  }
  const slideToBar = (c: { L: number; C: number; H: number }): { L: number; C: number; H: number } | null => {
    if (poleOk(c)) return c
    const L2 = shipsWhite(c)
      ? findLForWhiteTextLc(c.L, c.C, c.H, fireLc + APCA_SOLVE_MARGIN_LC)
      : findLForBlackTextLc(c.L, c.C, c.H, fireLc + APCA_SOLVE_MARGIN_LC, 0.92)
    const c2 = at(L2, c.H)
    return poleOk(c2) ? c2 : null
  }
  const clean = (c: { L: number; C: number; H: number }): boolean =>
    redCleanBeside(brandCta, c) && poleOk(c)
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
      // C42: the candidate slides to critical's bar first; side + distances judge the fill
      // that would actually ship (a slide can carry a core candidate past its tier stop —
      // the bar outranks the grid)
      const c = slideToBar(at(L, H))
      if (!c) continue
      const onSide = wantLighter ? c.L > brandCta.L : c.L < brandCta.L
      if (!onSide || !clean(c)) continue
      pick = c
      break outer
    }
  }
  if (!pick) return null // no clean complement in her zones — canonical stands, sweeps flag the pair
  const cta = makeStop(redCta.stop, pick.L, rctx.cAt('light', pick.L, rctx.brandC), pick.H)
  const vCFor = (L: number) => rctx.cAt('light', L, rctx.brandC)
  const hL = stateFillL(pick.L, 'light', 1)
  const ctaHover = makeStop(red.scale.ctaHover.stop, hL, vCFor(hL), pick.H)
  const pL = stateFillL(pick.L, 'light', 2)
  const ctaPressed = makeStop(red.scale.ctaPressed.stop, pL, vCFor(pL), pick.H)
  // pinned mints skip the producer's enforce-darken, so the wcag conformance floor rides
  // the pole judge (a light coral variant must flip to black text, not ship white sub-4.5)
  const onFillTextIsWhite = onFillIsWhiteDarkAt(cta.L, cta.C, cta.H, true, contrastProfile === 'apca' ? undefined : 4.5)
  // the text register rides the canonical red ramp's ink stops — the variant moves only the fill trio
  return {
    scale: { ...red.scale, cta, ctaHover, ctaPressed, onFillTextIsWhite },
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

    // internal (resolveTheme): skip the collision machinery ENTIRELY (rung-1 / dark collider /
    // signal shifts) — the SECONDARY's signal interactions are the THEME's decisions, and its
    // red yield goes LIGHTER (subtle), the MIRROR of rung-1's darken (owner rule; supersedes
    // "a secondary red earns rung 1 like a primary would"). This is the FULL skip; `exact`
    // is narrower — it exempts only the brand, and the signals still move.
    skipCollisionRules?: boolean

    // APCA legibility clearance (wcag lane only): the chosen cta pole must also clear the
    // Lc bar, fill moving pole-preserving. DEFAULT ON since the 2026-07-13 dead-zone ruling;
    // pass false to opt out (instrumentation/comparisons).
    apcaClearance?: boolean

    // internal (resolveTheme, derived secondary): the FLAT dark-cta register — see
    // DEFAULT_SECONDARY.darkFlatGapApp. Absent for every other caller (the prominence pin holds).
    darkCtaFlatApp?: number
  }
): ResolvedBrand {
  const sigScales = signalScalesFor(opts?.contrastProfile)

  // C12 v8 (owner-settled 2026-07-10; model = joint-solve-model.md, c12 archive — git history only):
  // ONE classification — the joint solve. The brand side rides opts.ctaSolve through
  // generation (solveBrandExit, producers.ts: membership on the nominal seed, nearest-edge
  // exit, her direction rules, brick-band diagonal); the red complement resolves after,
  // against the brand's FINAL cta. The brand side is off for exact (hands-off) and off for
  // archetypeOverride (the solve is pair-calibrated; neither half ships alone); both are off
  // for the secondary (theme's subtle treatment).
  //
  // Owner correction 2026-07-31: exact keeps the BRAND untouched but the SIGNALS still move
  // — the signal-side machinery (red complement, warning variant, yellow/green/blue shifts,
  // hue-collision detection) is gated on skipCollisionRules alone.
  const red = sigScales.get('red')!.scale
  const seedO = hexToOklch(hex)
  const signalMoves = !opts?.skipCollisionRules
  const solving = !opts?.exact && signalMoves && !opts?.archetypeOverride
  // "APCA DECIDES, WCAG FLOORS" (owner ruling 2026-07-16, C23): the collision GEOMETRY
  // references the APCA lane's canonical red in BOTH lanes. Each lane judging against
  // its own red made membership flip for borderline seeds (#FF4747 fired in apca, never
  // in wcag — the lane reds sit at different L for legal reasons). The wcag lane still
  // SHIPS its own red beside the landing; only the decision geometry unifies.
  const apcaRed = opts?.contrastProfile === 'apca' ? red : signalScalesFor('apca').get('red')!.scale
  const solveOpt = solving ? {
    ctaSolve: {
      seed: seedO,
      red: { L: apcaRed.cta.L, C: apcaRed.cta.C, H: apcaRed.cta.H },
      redDark: { L: apcaRed.ctaDark.L, C: apcaRed.ctaDark.C, H: apcaRed.ctaDark.H },
    },
  } : {}

  const floor = {
    ...solveOpt,
    darkFillMinL: DARK_BRAND_FILL_MIN_L,
    enforceOnFillContrast: !opts?.exact,

    coolRedDark: !opts?.exact,

    darkChromaCurve: opts?.exact ? undefined : darkChromaCurve,
    style: opts?.style,

    contrastProfile: opts?.contrastProfile,
    // DEFAULT ON (owner 2026-07-13, the cta dead-zone ruling: "pick closest to id that
    // passes apca"): the wcag lane's chosen cta pole must also clear the APCA bar,
    // moving the fill in that pole's own direction (pole-preserving = her candidate 1;
    // the apca lane already guarantees its bar, so it ships unmoved). Since C42 the
    // clearance covers light AND dark and the signal set passes it in its own generation
    // (buildSignalScales/signalShift) — neutral alone stays outside; exact has enforce off.
    apcaClearance: opts?.apcaClearance ?? true,
    darkCtaFlatApp: opts?.darkCtaFlatApp,
  }

  let scale = generateScale(hex, name, undefined, floor)

  let pending: SignalDef['name'][] = []

  if (opts?.archetypeOverride) {
    scale = generateScale(hex, name, opts.archetypeOverride, floor)
  } else if (signalMoves) {
    pending = hueCollisionPending(scale, sigScales)
  }

  // per-mode fired flags, honestly: dark fires via solveDarkCtaExit (858053e) — the old
  // light-only read predated it, hardcoded dark:false, and returned null for dark-only movers
  const redRepel = scale.ctaRepelled?.light || scale.ctaRepelled?.dark
    ? { light: !!scale.ctaRepelled?.light, dark: !!scale.ctaRepelled?.dark }
    : null

  const signalOverrides: SignalOverride[] = []

  // C12 v8 red complement: resolves for every solving OR exact brand against its FINAL cta —
  // independent of firing (a near-red neighbor vibrates beside canonical red even when not
  // confusable). A lightened brand always gets a deep-core red; canonical stands only when
  // it is already clean beside this brand. In exact the brand cta is the untouched seed and
  // brandWentUp is naturally false (no repel fires); archetypeOverride stays excluded (the
  // solve is pair-calibrated).
  if (solving || (opts?.exact && signalMoves && !opts?.archetypeOverride)) {
    const brandWentUp = !!scale.ctaRepelled?.light && scale.cta.L > seedO.L + 1e-6
    const v = redComplementVariant(scale.cta, seedO, brandWentUp, sigScales.get('red')!, opts?.contrastProfile)
    if (v) signalOverrides.push({ name: 'red', scale: v.scale, note: v.note })
  }

  let warnVariant: 'lemon' | 'macaroni' | null = null

  if (signalMoves) {
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
// delta curve); outline = the muted ramp with the cta re-resolved (cta transparent, cta-hover the
// cta color at OUTLINE_HOVER_ALPHA, on-cta the family's ink-9, cta-border always highlight-8); exact = the
// standard full ramp, advice-only.
// the offering (owner 2026-07-12, striking the bespoke subtle models: "you either use the
// derived or you use custom"): 'default' = the derived seed-transform (no hex supplied);
// 'exact' = the CUSTOM path — your hex ships as a full standard ramp; 'outline' = the exact
// ramp with the cta re-resolved at the emitters (cta transparent, border = highlight-8).
export type SecondaryStyle = 'default' | 'outline' | 'exact'
// legacy ids: the retired subtle models (tint/pastel and their muted/vibrant renames) map to
// 'exact' — a supplied hex is honored as custom, never silently re-modeled.
export type LegacySecondaryStyle = SecondaryStyle | 'tint' | 'pastel' | 'muted' | 'vibrant'
export const normalizeSecondaryStyle = (s: LegacySecondaryStyle): SecondaryStyle =>
  s === 'tint' || s === 'pastel' || s === 'muted' || s === 'vibrant' ? 'exact' : s
// ── the DEFAULT (derived) secondary — a SEED TRANSFORM (owner-picked "strong" on
// render/secondary-default-model.html, 2026-07-12; hue rotation retired 2026-08-03 — the
// derived secondary is a QUIET COMPANION on the primary's own hue, "without selecting
// another color"): L lifted proportionally to the remaining room toward the light pole (the
// delta shrinks as the seed nears the background); chroma gently relative to the seed,
// bounded by the room at the landing. The lifted seed then resolves as a NORMAL ramp — no
// pinned cta, no bespoke curve, primary-independent by construction ("we just didn't try to
// set this for people").
// The two GAP registers (owner 2026-07-12, picked on render/secondary-gap-combo.html: "a min
// of g10 in light but a flat g23 in dark"), both in APPARENT (H-K) distance:
//   minGapApp — the lifted seed keeps at least this distance from the light ground (white), so
//     a near-white brand's derived secondary can't hug the paper (only chartreuse/yellow-class
//     seeds move; the approved light look otherwise holds).
//   darkFlatGapApp — the derived DARK cta sits at exactly this distance above the dark ground
//     (navy's own unconstrained register), flat across hues; consumed by the resolver as
//     opts.darkCtaFlatApp (the prominence pin is a brand-identity rule — a derived pastel has
//     none, so it flips instead of shipping the light pastel on the dark page).
// darkFlatGapApp 23 → 40 (C24 dark band lift, owner "scale it with the ramp" 2026-07-27):
// the owner's literal rule = 23 × the band-top lift 1.75 = 40.25, and the measured posture
// agrees — the old flat cta sat ≈ level with the neutral's dark wash-7 delta (23 vs 23.1)
// and the lifted neutral wash-7 delta is ≈ 40.3 (review-corrected: a first cut used a blue
// probe brand's wash-7 as the anchor and landed 44, ~4 apparent-L* louder than the blessed
// quiet register).
export const DEFAULT_SECONDARY = { kL: 0.65, kC: 0.5, kR: 0.4, lRoom: 0.97, minGapApp: 10, darkFlatGapApp: 40 } as const
const LIGHT_GROUND_APP = grayApparentL(1.0)
// NO ROTATION (owner 2026-08-03, retiring `rot 12` and the derived/supplied split): the
// derived secondary is a quiet companion — its distinctness comes from the lift, not the
// hue, so a tonal value-step off the parent is the intent, not the failure the rotation
// existed to prevent. A derived seed and a user-supplied one take the identical transform;
// Exact is the hands-off path.
export function defaultSecondarySeed(hex: string): string {
  const seed = hexToOklch(hex)
  const d = DEFAULT_SECONDARY
  let L2 = seed.L + d.kL * Math.max(0, d.lRoom - seed.L)
  const H2 = seed.H
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
// outline pressed = the hover treatment at doubled strength (the pressed-doubles-hover
// convention carried to the alpha register) — C19, owner-approved 2026-07-16
export const OUTLINE_PRESSED_ALPHA = 0.18

// ── the SOFT ON-CTA: THE QUIET-FILL RULE (owner 2026-08-03 for the secondary, extended to
// the neutral 2026-08-04 — *"neutral cta on's should also be the alpha"*). A quiet,
// low-hierarchy cta carries its button text as the on-text POLE AT ALPHA instead of the
// solid pole — the renderer composites it over whatever the fill's current state is, so
// hover/pressed carry their own legibility (a solid tinted ink died there: dark hover
// 3.69 / pressed 3.00 against the state fills). Bars: WCAG 4.5 on every state fill plus
// the Lc-60 on-cta bar at rest.
//
// THE CARRIERS, in two tiers:
//  · KNOWN-LEGAL BY CONSTRUCTION — the DEFAULT-model secondary (derived + custom share the
//    tint register; sweep floor 0.726) and the NEUTRAL, whose cta is the scale-fed wash-level
//    fill (colorEngine, stop 4; sweep floor 0.633, worst state 6.09:1 / Lc 65.2). These two
//    always ship soft — the register was calibrated on their fills.
//  · CHECKED PER BRAND (owner 2026-08-06: soft is the DEFAULT on-text for secondaries, "as
//    long as it doesn't cause it to fail wcag") — the EXACT-style secondary, whose fill is an
//    arbitrary user hex. softOnCtaPasses below decides per mode; a failing fill keeps the
//    solid pole, which is always legal (the C38 ratioFloor picked it at 4.5 already).
// The owner picked light .75 / dark .80 by eye on the alpha ladder; every carrier shares the
// ONE register, so all alias the single system/alpha/ink primitive in the plugins.
// LOUD fills keep the solid pole — brand, the signals, and the cta ESCAPE (whose fill is the
// neutral's ink register, not this quiet one; owner-confirmed 2026-08-04). Outline keeps its
// ink-9 (colored text on a transparent fill — there is no fill to compose over).
export const SOFT_ON_CTA_ALPHA = { light: 0.75, dark: 0.80 } as const

// Can this scale's cta family carry the soft ink and stay WCAG-legal? Judged per mode against
// ALL THREE fill states — the C43 lesson: a text that clears rest can die on pressed, because
// the states move the fill under a text that (composited) only partly tracks it.
//
// Measured in the SHIPPED basis: the browser composites the rgba text over the 8-bit hex fill,
// so the fill goes through srgbEmitChannels (ColorStop.r/g/b are P3-encoded — the C44 trap) and
// is quantized exactly as stopHex ships it. The bar is WCAG 4.5:1 in BOTH lanes — this is a
// legality floor riding a taste feature, not a lane decision.
export function softOnCtaPasses(s: GeneratedScale, mode: 'light' | 'dark'): boolean {
  const white = mode === 'light' ? s.onFillTextIsWhite : s.onFillTextIsWhiteDark
  const pole = white ? 1 : 0
  const a = SOFT_ON_CTA_ALPHA[mode]
  const states = mode === 'light' ? [s.cta, s.ctaHover, s.ctaPressed] : [s.ctaDark, s.ctaHoverDark, s.ctaPressedDark]
  const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  const relY = (r: number, g: number, b: number) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
  const q = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255) / 255
  for (const st of states) {
    const e = srgbEmitChannels(st)
    const fr = q(e.r), fg = q(e.g), fb = q(e.b)
    const fillY = relY(fr, fg, fb)
    const textY = relY(pole * a + fr * (1 - a), pole * a + fg * (1 - a), pole * a + fb * (1 - a))
    if (contrastRatio(textY, fillY) < 4.5) return false
  }
  return true
}

// ── the NEUTRAL CTA ESCAPE (Phase 3, owner spec 2026-07-16: stakeholders want a
// neutral cta escape for red collisions): the brand's cta FILL trio swaps to the brand's
// OWN generated neutral's ink register — near-BLACK in light, near-WHITE in dark. An
// emitter-level re-resolution exactly like the outline style (same tokens, different
// values; the solve pipeline is untouched and the flag default-off is byte-identical).
// Construction (owner-decided at planning): cta ANCHORS at the neutral's resolved STRONG
// ink — ink-11 since C49 (light root L≈0.30 / dark ≈0.94); cta-hover/cta-pressed
// derive via the same stateFillL machinery every cta fill uses, chroma carried from the
// anchor (the neutral's ink chroma is a whisper — re-evaluating the curve across a
// 0.03–0.09 L move is imperceptible and the curve closure is gone post-generation), hue
// constant. on-cta re-judges at the escaped fill under the same law as the neutral's own
// quiet cta (judgment-only — the anchor is pinned): wcag = mixing flip + the 4.5
// conformance floor; apca = pure apca-pole. The brand's INK STOPS are NOT touched
// (owner 2026-08-13, reverting the 2026-08-12 ink de-chroma — it shipped unapproved):
// the escape moves only this fill trio; the ink register keeps the brand's own
// chroma everywhere it appears. UI gates the toggle to brands
// whose cta sits in red's register (redGateDist ≤ RED_GATE.G — the exact-mode advice
// check above), but the emitters honor the flag for any brand: the gate is guidance,
// not law, and a stakeholder override must not silently no-op.
// ── the SYSTEM LINK token (Phase 4, owner spec 2026-07-16: "link is a system level
// color… a primitive that internally aliases the primary ink 10 unless it's being
// deconflicted from red"). ONE link trio per theme — link / link-hover / link-pressed:
//   DEFAULT (no custom color): aliases the primary's ink stops 9/10/11 (states ride
//   the alias — same values the deleted cta-ink trio carried, C49 construction).
//   CUSTOM (the de-conflict): the user's hex runs through the SAME ink register — it is
//   the SEED of a throwaway resolve and the shipped trio is that resolve's ink stops
//   (hue kept, L floor-solved per lane and mode by the ink stops' own laws, dark solved
//   dark-native, states + floors free — owner-picked treatment). Default seed when the
//   toggle turns on: #0B57D0, the conventional link blue (owner-picked; ships light
//   ≈#375bae / dark ≈#90b2f9 through the wcag register).
export const DEFAULT_LINK_HEX = '#0B57D0'
export function resolveLinkTrio(
  linkHex: string,
  contrastProfile?: ContrastProfile,
): { link: ColorStop; linkHover: ColorStop; linkPressed: ColorStop; linkDark: ColorStop; linkHoverDark: ColorStop; linkPressedDark: ColorStop } {
  // skipCollisionRules: the link seed is not a brand — no signal machinery, no repel;
  // just the ramp solve that produces its ink register
  const s = resolveBrand(linkHex, 'link', { skipCollisionRules: true, contrastProfile }).scale
  const at = (arr: ColorStop[], n: number) => {
    const st = arr.find(x => x.stop === n)
    if (!st) throw new Error(`resolveLinkTrio: the link resolve has no ink stop ${n}`)
    return st
  }
  return {
    link: at(s.light, 9), linkHover: at(s.light, 10), linkPressed: at(s.light, 11),
    linkDark: at(s.dark, 9), linkHoverDark: at(s.dark, 10), linkPressedDark: at(s.dark, 11),
  }
}

export function escapeCtaFamily(
  nScale: GeneratedScale,
  mode: 'light' | 'dark',
  contrastProfile?: ContrastProfile,
): {
  cta: ColorStop; ctaHover: ColorStop; ctaPressed: ColorStop; onFillIsWhite: boolean
} {
  // the escape fill anchors on the neutral's STRONG ink — ink-11 since C49 restored
  // its number (the C33-era spelling was ink-10; the stop lookup must follow the VALUE)
  const strongInk = (mode === 'light' ? nScale.light : nScale.dark).find(s => s.stop === 11)
  if (!strongInk) throw new Error('escapeCtaFamily: the neutral scale has no ink-11 stop')
  const mk = (stop: number, L: number) => makeStop(stop, L, strongInk.C, strongInk.H)
  const cta = mk(9, strongInk.L)
  // states via the shared fill rule; the near-white dark register is the archetype
  // override case — its dark states DARKEN (the mirror of everyone else's lighten)
  const ctaHover = mk(10, stateFillL(strongInk.L, mode, 1))
  const ctaPressed = mk(11, stateFillL(strongInk.L, mode, 2))
  const onEnforce = contrastProfile !== 'apca'
  const onFloor = contrastProfile === 'apca' ? undefined : 4.5
  const onFillIsWhite = onTextIsWhite(apcaY(cta.r, cta.g, cta.b), cta.L, cta.C, cta.H, onEnforce, onFloor)
  // scope (owner 2026-08-13, reverting the 2026-08-12 ink de-chroma): the escape moves
  // ONLY this fill trio + on-cta. The brand's ink stops 9/10/11 — the text register,
  // and the default link that aliases them — keep the brand's own chroma.
  return { cta, ctaHover, ctaPressed, onFillIsWhite }
}

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
  // the secondary's own mode chip. Supersedes secondaryLevel (kept for programmatic compat:
  // both 'standard' and 'subtle' resolve to 'exact', as does the absent case). Legacy
  // 'tint'/'pastel' ids are normalized (the 2026-07-12 rename).
  secondaryStyle?: LegacySecondaryStyle
  secondaryLevel?: SecondaryLevel
  // one of the six anchors, exposed for the secondary the way primaryArchetype is for the
  // primary (owner 2026-07-29). WHAT IT ACTUALLY DOES, measured rather than assumed: it places
  // the CTA — across the full lightness range — and leaves the ramp alone (0 of 20 stops move
  // on green/navy/pink; the near-cusp #FFA200 is the exception at 18-19/20, where moving the
  // seed's L changes maxChromaAt and so the saturation envelope). That is the engine's core
  // rule showing through: the ladder is shared, the cta is the per-family differentiator.
  //
  // Because it places the cta, an anchor REPLACES the custom posture rather than composing with
  // it — custom's tint owns the cta, so both cannot apply. The UI sends secondaryStyle 'exact'
  // alongside an anchor. Passing an anchor WITH 'default' is not a supported combination: the
  // tint still wins the cta and the anchor reaches only the ramp.
  secondaryArchetype?: Archetype
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
  const sArchetype = input.secondaryArchetype
  const opts = { exact: pExact, style: input.style, contrastProfile: input.contrastProfile, apcaClearance: input.apcaClearance }
  const primary = resolveBrand(input.primaryHex, input.name ?? 'brand', { ...opts, archetypeOverride: pArchetype })
  const cp = input.contrastProfile
  const sigScales = signalScalesFor(cp)
  const notes: string[] = []

  // C12 exact-mode ADVICE (owner ruling 2026-07-09: outline is "something we recommend
  // for exact mode, not something we do"). Exact keeps the BRAND untouched (owner correction
  // 2026-07-31: the signals still move), so the brand side carries recommendations instead:
  // the outline shape for red-register clashes — only when the red complement did NOT
  // resolve, since a moved red already handles the clash — and a legibility warning for the
  // true dead zones (measured: 34/288 exact seed-lanes have no on-cta pole reaching Lc 60;
  // the pick itself is already the best pole).
  if (pExact) {
    const red = sigScales.get('red')!
    const redMoved = primary.signalOverrides.some(o => o.name === 'red')
    if (!redMoved && redGateDist(primary.scale.cta, red.scale.cta) <= RED_GATE.G)
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


  // THE SECONDARY IS A COLLIDER (owner rulings 2026-08-03, restoring SECONDARY-PLAN §2 —
  // signalSwapVariants was built for exactly this and had lost its caller): every REAL
  // secondary's shipped ramp de-conflicts the signals, at LOWER PRIORITY than the primary.
  //   · green/blue: a swap variant is adopted only if it clears BOTH brand colors
  //   · yellow: the lemon path (pickSignalShift), the same both-brands verification
  //   · red: within the band only (identity sacred stands) — the primaries' own
  //     pair-calibrated deep-core complement, calibrated to the secondary when the
  //     primary didn't claim red
  //   · PRIMARY WINS TIES: an existing primary override is replaced only by a variant
  //     that ALSO clears the primary; an unresolvable collision ships as ADVICE (the
  //     residual note), never a forced move. "As much as possible."
  // Moves gate at the standard collision bar; the residual NOTES keep the more
  // sensitive SECONDARY_NOTE_MIN_V qualifier, judged against the POST-MERGE signal set.
  const mergedOverrides: SignalOverride[] = [...primary.signalOverrides]
  // signals the merge moved FOR the secondary — their move is reported by the override's
  // own note, so the residual-advice pass below skips them (a within-band remedy like the
  // lemon never passes a hue-distance test; a note would call the adopted fix a failure)
  const adoptedForSecondary = new Set<SignalDef['name']>()
  const effectiveOf = (name: SignalDef['name']) =>
    mergedOverrides.find(o => o.name === name)?.scale ?? sigScales.get(name)!.scale

  const mergeSecondarySignals = (secScale: GeneratedScale, secSeedHex: string): void => {
    const cp = opts?.contrastProfile
    const adopt = (name: SignalDef['name'], scale: GeneratedScale, note: string) => {
      const i = mergedOverrides.findIndex(o => o.name === name)
      if (i >= 0) mergedOverrides.splice(i, 1)
      mergedOverrides.push({ name, scale, note })
      adoptedForSecondary.add(name)
    }
    // red: the ΔE machinery self-limits to red-adjacent registers (hueCollisionPending
    // excludes red for the same reason), so the complement solve IS the gate.
    const red = sigScales.get('red')!
    const primaryRed = mergedOverrides.find(o => o.name === 'red')
    if (!primaryRed) {
      const v = redComplementVariant(secScale.cta, hexToOklch(secSeedHex), false, red, cp)
      // primary-wins verification: the secondary-calibrated variant must also sit clean
      // beside the primary's cta (its own poleOk was judged where it was built)
      if (v && redCleanBeside(primary.scale.cta, v.scale.cta)) adopt('red', v.scale, `${v.note} (for the secondary)`)
    }
    for (const sigName of ['yellow', 'green', 'blue'] as const) {
      const { def, scale: canonical } = sigScales.get(sigName)!
      const existing = mergedOverrides.find(o => o.name === sigName)
      const effective = existing?.scale ?? canonical
      if (!checkHueCollision(secScale, effective, def).collides) continue
      const clearsBoth = (cand: GeneratedScale) =>
        !checkHueCollision(primary.scale, cand, def).collides && !checkHueCollision(secScale, cand, def).collides
      if (!existing) {
        // calibrate to the colliding secondary; verify against the primary before adopting.
        // yellow's lemon is a WITHIN-BAND remedy — the side rule is its design bar (a
        // hue-distance test can never pass inside the band), so like the primary's own
        // adoption it skips the clears-the-collider check and verifies the primary only.
        const shift = pickSignalShift(secScale, canonical, def, cp)
        const ok = !!shift && (sigName === 'yellow'
          ? !checkHueCollision(primary.scale, shift.scale, def).collides
          : clearsBoth(shift.scale))
        if (shift && ok) { adopt(sigName, shift.scale, `${shift.note} (for the secondary)`); continue }
      }
      // the other side's variant (or the first that clears both when the primary's own
      // override is what the secondary collides with) — primary stays clear by the gate
      const alt = signalSwapVariants(def, cp).find(s => clearsBoth(s.scale))
      if (alt) adopt(sigName, alt.scale, `${alt.note} (for the secondary)`)
      // else: residual — the note below reports it against the post-merge set
    }
  }

  // corrected detection for secondaries (C7): the TYPE-1 hue gate at the annotation
  // qualifier, against the THEME's effective (POST-MERGE) signal set — after the collider
  // pass above, a note fires only for the RESIDUALS the machinery could not clear.
  const signalNotesFor = (scale: GeneratedScale, wording: (name: SignalDef['name'], washDE: number) => string): string[] => {
    const out: string[] = []
    for (const def of SIGNALS) {
      if (adoptedForSecondary.has(def.name)) continue
      const h = checkHueCollision(scale, effectiveOf(def.name), def, { minV: SECONDARY_NOTE_MIN_V })
      if (h.collides) out.push(wording(def.name, Math.min(h.washDeltaE.light, h.washDeltaE.dark)))
    }
    return out
  }

  // TWO MODELS, ONE TRANSFORM (owner 2026-07-29 — this SUPERSEDES the "one default model, two
  // seeds" unification of 2026-07-12). The lift-and-damp transform is shared, but what it is
  // applied TO now differs by posture, because the two postures are doing different jobs:
  //
  //   DERIVED (no secondary supplied) — MANUFACTURING a secondary that does not exist. Lift
  //     and damp on the parent's own hue (a quiet companion, owner 2026-08-03), then a normal
  //     ramp. The whole ramp descends from the transformed seed, because there is no user
  //     pick to preserve.
  //   CUSTOM ('default' style + a supplied hex) — QUIETENING a secondary the user chose. Their
  //     hex is the seed for the RAMP; only the cta trio comes from the transformed seed. Owner:
  //     "the id is preserved as is, but the cta is generated as if it was a tint of the given
  //     hex". Applying the transform to the whole ramp is what made a saturated orange come
  //     back as a pale tan — and it took the INK with it (the strong ink's C 0.080 → 0.017, so the text
  //     colour went gray-brown). See resolveCustomModel.
  //
  // The hue never rotates on either posture (owner 2026-08-03; C34 had exempted supplied
  // seeds only) — both take the one quiet-companion transform.
  const secOpts = {
    skipCollisionRules: true as const,
    contrastProfile: cp,
    darkCtaFlatApp: DEFAULT_SECONDARY.darkFlatGapApp,
  }

  const resolveDefaultModel = (seedHex: string) => {
    const liftedHex = defaultSecondarySeed(seedHex)
    return {
      liftedHex,
      scale: resolveBrand(liftedHex, 'secondary', { ...secOpts, archetypeOverride: sArchetype }).scale,
    }
  }

  // CUSTOM, the owner's reading: the ramp is the user's colour (measured identical to the exact
  // posture, ΔE 0.000 at every stop), and the cta trio is the tint. The tint earns its place by
  // measurement, not taste — when someone supplies a secondary on the primary's own hue, the
  // untinted cta is the SAME BUTTON (cta ΔE vs primary 0.000); the tint lifts that to 0.39
  // light / 0.24 dark, clear of SECONDARY_DISTINCT_DELTA_E.
  //
  // the ink stops (the text-register cta, 9/10/11) are deliberately NOT tinted (owner
  // ruling 2026-07-29, phrased for cta-ink before its 2026-08-12 deletion): under this
  // model they are the user's colour — a tinted text register would be a pale link on a
  // pale surface, and would stop matching the ink it is specified to match.
  //
  // onFillTextIsWhite comes across WITH the cta because it is computed FROM it
  // (colorEngine.ts: onTextIsWhite(…scale.cta…)) and is consumed only as the on-cta token —
  // leaving the own ramp's flag behind would pick the on-text pole for a fill that no longer
  // ships. Measured after the splice: label contrast 9.93–15.88:1 light, 5.36–6.21:1 dark.
  const resolveCustomModel = (seedHex: string) => {
    const tintedHex = defaultSecondarySeed(seedHex)
    // the RAMP is the EXACT posture's, byte for byte — the same call with the same opts, so
    // "preserved" is literal and the gate can assert equality. (A first cut resolved it through
    // the derived model's opt-set instead; the light stops matched but 210/960 dark ramps did
    // not, because that set carries darkCtaFlatApp and leaves on-fill enforcement on.)
    const own = resolveBrand(seedHex, 'secondary', { ...opts, exact: true, skipCollisionRules: true, archetypeOverride: sArchetype }).scale
    // the CTA is the tint, resolved through the derived model's register — flat dark cta and all
    const tinted = resolveBrand(tintedHex, 'secondary', secOpts).scale
    return {
      tintedHex,
      scale: {
        ...own,
        cta: tinted.cta, ctaHover: tinted.ctaHover, ctaPressed: tinted.ctaPressed,
        ctaDark: tinted.ctaDark, ctaHoverDark: tinted.ctaHoverDark, ctaPressedDark: tinted.ctaPressedDark,
        onFillTextIsWhite: tinted.onFillTextIsWhite,
        onFillTextIsWhiteDark: tinted.onFillTextIsWhiteDark,
      } satisfies GeneratedScale,
    }
  }

  // ---- no secondary supplied: nothing, or the DERIVED subtle secondary (§2b) ----
  if (!input.secondaryHex) {
    if (!input.deriveSecondary) return { primary, themed: primary, secondary: null, signalOverrides: primary.signalOverrides, notes }
    // the DEFAULT model: transform the brand seed, resolve like a normal brand (secondary
    // convention: collisions are the theme's decisions). Everything — cta included — falls
    // out of the engine; the old quiet-register derived path is retired for the default.
    const { liftedHex, scale } = resolveDefaultModel(input.primaryHex)
    mergeSecondarySignals(scale, liftedHex)
    return {
      primary, themed: { ...primary, signalOverrides: mergedOverrides },
      secondary: {
        scale,
        style: 'default',
        level: 'subtle', demoted: false, derived: true,
        notes: [
          `secondary derived from the brand color (default model, seed ${liftedHex})`,
          ...signalNotesFor(scale, (name, dE) =>
            `derived secondary sits on the ${name} signal's hue (wash ΔE ${dE.toFixed(3)}) — it tracks the brand color`),
        ],
        distinctness: ctaDistinctness(primary.scale, scale),
      },
      signalOverrides: mergedOverrides, notes,
    }
  }

  // ---- supplied hex + the 'default' style = CUSTOM: the user's colour keeps the ramp, and
  // only the cta is generated as a tint of it. Exact is the fully hands-off path (its cta is
  // the pick itself); custom differs from exact in exactly one token family.
  if (secStyle === 'default') {
    const { tintedHex, scale } = resolveCustomModel(input.secondaryHex)
    mergeSecondarySignals(scale, input.secondaryHex)
    const distinctness = ctaDistinctness(primary.scale, scale)
    if (distinctness.close)
      notes.push(`secondary reads close to the primary (ΔE ${Math.min(distinctness.light, distinctness.dark).toFixed(2)}) — consider a more distinct color`)
    return {
      primary, themed: { ...primary, signalOverrides: mergedOverrides },
      secondary: {
        scale, style: 'default', level: 'subtle', demoted: false, derived: false,
        notes: [
          `secondary keeps your color through the ramp; the cta is a tint of it (tint seed ${tintedHex})`,
          ...signalNotesFor(scale, (name, dE) =>
            `secondary sits on the ${name} signal's hue (wash ΔE ${dE.toFixed(3)}) — it tracks your color`),
        ],
        distinctness,
      },
      signalOverrides: mergedOverrides, notes,
    }
  }

  // ---- supplied secondary = CUSTOM (owner 2026-07-12: "you either use the derived or you
  // use custom" — the bespoke subtle models are struck). The user's color ships as a full
  // standard ramp, hands off; signal proximity is ADVICE, never a reshape. 'outline' rides
  // this same ramp — its cta re-resolution happens at the EMITTERS.
  const rSec = resolveBrand(input.secondaryHex, 'secondary', { ...opts, exact: true, skipCollisionRules: true, archetypeOverride: sArchetype })
  const scale: GeneratedScale = rSec.scale
  const level: SecondaryLevel = 'standard'
  mergeSecondarySignals(scale, input.secondaryHex)
  const secNotes = signalNotesFor(scale, (name, dE) =>
    `secondary reads close to the ${name} signal (wash ΔE ${dE.toFixed(3)}) — your color ships untouched`)

  const distinctness = ctaDistinctness(primary.scale, scale)
  if (distinctness.close)
    notes.push(`secondary reads close to the primary (ΔE ${Math.min(distinctness.light, distinctness.dark).toFixed(2)}) — consider a more distinct color`)

  return {
    primary, themed: { ...primary, signalOverrides: mergedOverrides },
    secondary: { scale, style: secStyle, level, demoted: false, derived: false, notes: secNotes, distinctness },
    signalOverrides: mergedOverrides, notes,
  }
}
