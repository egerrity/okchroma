import { type Archetype, classifyArchetype, hoverL } from './archetypes'
import {
  wcagY,
  legalRatio,
  findLForY,
  findLForContrast,
  apcaY,
} from './constraints'
import {
  ILLUS_STOPS,
  REFERENCE_H,
} from './stopTable'
import { neutralChromaCurve, subtleSecondaryChromaCurve, type NeutralLevel } from './neutralCurve'

export type { NeutralLevel } from './neutralCurve'
export { SUBTLE_SECONDARY_MULT, SUBTLE_SECONDARY_MULT_CANDIDATES } from './neutralCurve'

// Shared color math + producer constants live in colorMath.ts (hoisted verbatim; leaf module so the
// requirement-token resolver can share them without an import cycle). Re-exported here for API compat.
import {
  goldSpineHue, torsionedHue, SPINE_OFFPATH_SIGMA, gauss, hueDelta,
  HUE_NOISE_C, redRepelShiftDeg,
  hexToOklch, oklchToSrgbUnclamped, maxChromaAt,
  makeStop, onTextIsWhite, type ColorStop,
} from './colorMath'
export {
  goldSpineHue, torsionedHue, hexToOklch, RED_COOL_DEG, redCoolWeight, inRedBand,
  RED_PIVOT_H, redRepelShiftDeg, inRedRepelBand,
} from './colorMath'
export type { ColorStop } from './colorMath'

import { resolveRamp, type ResolvedStop } from '../reqtoken/resolve'
import { MODE_SPECS, type ModeSpec } from '../reqtoken/spec'
import { withProfile, DEFAULT_APCA_LC_MAP, CTA_ONFILL_ENFORCE_LC, type ContrastProfile } from '../reqtoken/profiles'
import { whiteTextLcAt, findLForWhiteTextLc, APCA_SOLVE_MARGIN_LC } from '../reqtoken/producers'
export type { ContrastProfile } from '../reqtoken/profiles'

export interface GeneratedScale {
  name: string
  archetype: Archetype
  brandL: number
  brandC: number
  brandH: number
  onFillTextIsWhite: boolean

  onFillTextIsWhiteDark: boolean

  light: ColorStop[]
  dark: ColorStop[]

  cta: ColorStop
  ctaHover: ColorStop
  ctaDark: ColorStop
  ctaHoverDark: ColorStop

  // C12 value repel: per-mode fired flags (the cta exited red's register) — annotation/audit data
  ctaRepelled?: { light: boolean; dark: boolean }

  onHighlightIsWhite?: boolean
  onHighlightIsWhiteDark?: boolean

  identityHex?: string

  // paper-0: the resolved ladder extreme beyond paper-1 (white-ish in light; one seam below paper-1 in
  // dark — never absolute black). OFF the light[]/dark[] arrays: consumers index [0] as stop 1.
  paper0?: ColorStop
  paper0Dark?: ColorStop
}

export interface GenerateOptions {

  hueShiftDeg?: number

  chromaScale?: number

  subtleChromaScale?: number

  stop10DeepenL?: number
  stop11DeepenL?: number

  darkFillMinL?: number

  enforceOnFillContrast?: boolean

  coolRedDark?: boolean

  // The red repel is a BRAND-only differentiator (it shifts a red-adjacent brand away
  // from the red signal, out the NEAREST side — cooler below the signal hue, warmer
  // above). Signals set this to keep their own identity hue in BOTH modes — light
  // otherwise shifts them like a brand. Dark is already brand-only via coolRedDark.
  suppressRedCool?: boolean

  // The gold-band chroma lift (H90 gaussian) is SIGNAL-only — it IS the yellow signal's
  // shine. Brands ride their own identity chroma; the brand-side fine-tune (ID-relative
  // ramp + amplitude) is parked behind the P3 gamut work (CATALOG C7, owner 2026-07-07).
  goldBoost?: boolean

  style?: 'default' | 'deeper' | 'full-chroma'

  highlight?: boolean

  chromaCurve?: (L: number, mode: 'light' | 'dark') => number

  darkChromaCurve?: (L: number, H: number, brandC: number, ctaC?: number) => number

  loudCta?: boolean

  // C12 v8 — THE JOINT SOLVE, brand side (owner-settled 2026-07-10): the brand's nominal
  // seed + the lane's resolved red cta, injected by resolveBrand — the resolver has no
  // cross-scale view. The light cta exits the true-red region via solveBrandExit
  // (producers.ts: nearest edge, her direction rules, brick-band diagonal). The DARK cta
  // rides the same solve on dark geometry keyed on P2 (owner 2026-07-11, "dark falls out
  // like every cta"): redDark = the lane's red dark cta, solveDarkCtaExit — the P1 gate is
  // blind to dark vibration. Absent (signals, neutral, secondary, exact, archetypeOverride)
  // = byte-identical.
  ctaSolve?: {
    seed: { L: number; C: number; H: number }
    red: { L: number; C: number; H: number }
    redDark: { L: number; C: number; H: number }
  }

  heat?: number

  // contrast PROFILE (opt-in): 'apca' re-solves every declared wcag contrast require under APCA Lc
  // targets via withProfile() — the same declaration vs a different constraint. Default 'wcag' is the
  // shipped behavior, byte-identical when unset.
  contrastProfile?: ContrastProfile

  // APCA legibility clearance (opt-in bolt-on, default off → byte-identical): in the wcag lane, push the
  // cta fill until its chosen on-text pole also clears APCA Lc 60, keeping 4.5 as the hard floor. Gated so
  // the shipped default is unchanged; flipped on for the A/B exhibit and, once blessed, by default.
  apcaClearance?: boolean

  // DELTA-KEYED dark (THE dark model, owner 2026-07-09): the resolved LIGHT stops, injected into the DARK
  // resolve — dark is a live function of light (carry chroma+hue for surfaces 1-9, re-reference lightness to
  // the dark ground in apparent space; inks dark-native; cta prominence-floored). generateScale always sets
  // these; direct resolveRamp callers opt in per call.
  deltaLightStops?: { stop: number; L: number; C: number; H: number }[]
  deltaCarry?: boolean
  // per-bolt-on instruments (not shipped): layer exactly ONE old dark mechanism onto the pure carry, so the
  // eye can see what that piece does. Each is a REAL engine fn (no reimplementation); default off = identical.
  deltaHKPlace?: boolean     // place carried C/H by the old apparent-L rung (perceptualRungL @ scaffold), not luminance
  deltaChromaEq?: boolean    // replace carried C with the old H-K chroma equalizer (perceptualDarkC)
  deltaLiftFloor?: boolean   // floor carried L at the scaffold rootL (the old "lift, never sink" recede floor)
}

// generateScale is now an ADAPTER over the requirement-token resolver (src/reqtoken): it compiles the caller
// opts into a resolver invocation per mode and assembles the same GeneratedScale contract as before. The
// producer/require/refine math lives in src/reqtoken/producers.ts (verbatim ports of the old body; the
// cutover was proven byte-identical before the legacy body and its parity gates were deleted in 8b79504 —
// today's equivalent instrument is scripts/p3-parity-dump.ts, a before/after byte-compare).
export function generateScale(
  hex: string,
  scaleName: string,
  forcedArchetype?: Archetype,
  opts?: GenerateOptions
): GeneratedScale {
  // compile: opts + the built-in declaration → per-mode resolver runs. enforceOnFillContrast is passed
  // explicitly (generateScale's contract defaults it OFF; the spec's declared default only applies to
  // direct resolver users). The highlight flag gates stop 9 out of the compiled spec; the contrast
  // profile rewrites the wcag requires (withProfile is the identity for 'wcag' — byte-identical default).
  const rOpts = { ...opts, forcedArchetype, enforceOnFillContrast: !!opts?.enforceOnFillContrast }
  const compile = (spec: ModeSpec): ModeSpec =>
    withProfile(
      opts?.highlight ? spec : { ...spec, stops: spec.stops.filter(s => s.stop !== 9) },
      opts?.contrastProfile ?? 'wcag',
    )
  const lightRamp = resolveRamp(hex, 'light', compile(MODE_SPECS.light), rOpts)
  // DELTA-KEYED dark IS the dark model (un-gated, owner 2026-07-09): dark is a live function of the resolved
  // light — carry each stop's chroma+hue verbatim, re-reference only lightness to the dark ground (0.178, by
  // luminance); the declared requires floor L. Replaces the seed-keyed DARK_L scaffold as the default.
  const darkRamp = resolveRamp(hex, 'dark', compile(MODE_SPECS.dark),
    { ...rOpts, deltaLightStops: lightRamp.stops, deltaCarry: true })

  // metadata (brand identity fields on the scale)
  const { L: brandL, C: rawC, H: rawH } = hexToOklch(hex)
  const brandH = (rawH + (opts?.hueShiftDeg ?? 0) + 360) % 360
  const brandC = rawC * (opts?.chromaScale ?? 1)
  const archetype = forcedArchetype ?? classifyArchetype(brandL)

  const toStop = (s: ResolvedStop): ColorStop => makeStop(s.stop, s.L, s.C, s.H)
  // stop 0 stays OFF the arrays (consumers index [0] as stop 1) — exposed as paper0/paper0Dark
  const light = lightRamp.stops.filter(s => s.stop >= 1).map(toStop).sort((a, b) => a.stop - b.stop)
  const dark = darkRamp.stops.filter(s => s.stop >= 1).map(toStop).sort((a, b) => a.stop - b.stop)
  const p0Light = lightRamp.stops.find(s => s.stop === 0)
  const p0Dark = darkRamp.stops.find(s => s.stop === 0)

  const cta = makeStop(9, lightRamp.roles.cta.L, lightRamp.roles.cta.C, lightRamp.roles.cta.H)
  const ctaDark = makeStop(9, darkRamp.roles.cta.L, darkRamp.roles.cta.C, darkRamp.roles.cta.H)

  return {
    name: scaleName, archetype, brandL, brandC, brandH,
    onFillTextIsWhite: lightRamp.ons.onFillIsWhite,
    onFillTextIsWhiteDark: darkRamp.ons.onFillIsWhite,
    light, dark,
    cta,
    ctaHover: makeStop(10, lightRamp.roles.ctaHover.L, lightRamp.roles.ctaHover.C, lightRamp.roles.ctaHover.H),
    ctaDark,
    ctaHoverDark: makeStop(10, darkRamp.roles.ctaHover.L, darkRamp.roles.ctaHover.C, darkRamp.roles.ctaHover.H),
    ctaRepelled: { light: !!lightRamp.roles.cta.repelled, dark: !!darkRamp.roles.cta.repelled },
    onHighlightIsWhite: opts?.highlight ? lightRamp.ons.onHighlightIsWhite : undefined,
    onHighlightIsWhiteDark: opts?.highlight ? darkRamp.ons.onHighlightIsWhite : undefined,
    identityHex: hex.toUpperCase(),
    paper0: p0Light ? makeStop(0, p0Light.L, p0Light.C, p0Light.H) : undefined,
    paper0Dark: p0Dark ? makeStop(0, p0Dark.L, p0Dark.C, p0Dark.H) : undefined,
  }
}

// applyRedRepelRender DELETED (owner ruling 2026-07-10): C6's cta render hue-shift was the
// last non-C12 machinery de-colliding red — it cooled unfired deep maroons into fuchsia.
// Red cta de-collision is C12's alone (gate → split / exit / variant). The C6 register
// (redRepelShiftDeg) survives only where the owner has not yet ruled: the dark-side
// coolRedDark context hue (producers.ts) — flagged, awaiting her word.

export interface IllustrationScale {
  stops: ColorStop[]
}

export function generateIllustrationScale(scale: GeneratedScale): IllustrationScale {
  const { brandL, brandC, brandH } = scale
  const stops = ILLUS_STOPS.map((spec, i) => {
    const C = brandC * spec.chromaMultiplier
    const refY = wcagY(spec.rootL, C, REFERENCE_H)
    let L = findLForY(refY, C, brandH)

    const gOffPath = gauss(hueDelta(brandH, goldSpineHue(brandL)), SPINE_OFFPATH_SIGMA)
    const H = torsionedHue(brandH, L, brandL, gOffPath)
    if (H !== brandH) L = findLForY(refY, C, H)
    return makeStop(i + 1, L, C, H)
  })
  return { stops }
}

export function generateNeutralScale(
  brandH: number,
  level: NeutralLevel = 'default',
  contrastProfile?: ContrastProfile,
): GeneratedScale {
  const h = ((brandH % 360) + 360) % 360
  const { r, g, b } = oklchToSrgbUnclamped(0.5, 0.006, h)
  const ch = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')
  const grayHex = `#${ch(r)}${ch(g)}${ch(b)}`
  const scale = generateScale(grayHex, 'neutral', 'light', {
    chromaCurve: neutralChromaCurve(brandH, level),
    highlight: true,
    enforceOnFillContrast: true,
    contrastProfile,
  })

  // The neutral cta is LOW-HIERARCHY: unlike a brand/signal cta (a bold off-scale
  // fill), it reads at the quiet wash level. A fed fill can't flip — it's mode-stable
  // and floored in dark — so we set its L target to the scale's own stop 4 (cta) and
  // stop 5 (hover), which DO flip via LIGHT_L/DARK_L (light ~0.936/0.903, dark
  // ~0.285/0.313). on-cta is recomputed so the text stays legible in each mode.
  const asCta = (stop: number, src: ColorStop) => makeStop(stop, src.L, src.C, src.H)
  scale.cta = asCta(9, scale.light[3])
  scale.ctaHover = asCta(10, scale.light[4])
  scale.ctaDark = asCta(9, scale.dark[3])
  scale.ctaHoverDark = asCta(10, scale.dark[4])
  // the scale-fed neutral cta can't move, so on-text is judgment only: apca profile = pure
  // apca-pole (its law is the Lc bar); wcag profile = the mixing flip PLUS the conformance
  // floor — the chosen pole must pass 4.5 (the fill can't re-solve, so the pole flips).
  const onEnforce = contrastProfile !== 'apca'
  const onFloor = contrastProfile === 'apca' ? undefined : 4.5
  scale.onFillTextIsWhite = onTextIsWhite(apcaY(scale.cta.r, scale.cta.g, scale.cta.b), scale.cta.L, scale.cta.C, scale.cta.H, onEnforce, onFloor)
  scale.onFillTextIsWhiteDark = onTextIsWhite(apcaY(scale.ctaDark.r, scale.ctaDark.g, scale.ctaDark.b), scale.ctaDark.L, scale.ctaDark.C, scale.ctaDark.H, onEnforce, onFloor)
  return scale
}

// The SUBTLE SECONDARY (SECONDARY-PLAN §3): the secondary hue through the neutral's tint
// machinery at a stronger clamp — the next point on the pure→default→branded axis — with the
// QUIET cta (owner call): scale-fed at stops 4/5 exactly like the neutral's low-hierarchy cta,
// not the loud off-scale fill. This is both the user-facing `secondaryLevel: 'subtle'` AND the
// automatic yield move when a secondary collides with a signal (resolveTheme). Note the red
// case: the primary's rung-1 goes DARK; this goes LIGHTER + lower chroma — the mirror falls out
// of the wash-register cta, no extra machinery.
export function generateSubtleSecondary(
  hex: string,
  opts?: {
    contrastProfile?: ContrastProfile
    mult?: number
    // ALTERNATIVE chroma model (owner feedback 2026-07-04 "muddy → light and airy"): PASTEL —
    // C = k × maxChromaAt(L, H), a fraction of the hue's own gamut ceiling, instead of the
    // neutral tint curve (whose tiny absolute peaks read grey-brown at mid L). Sweep-only until
    // the owner picks; when set, `mult` is ignored.
    pastelK?: number
    // FULL curve override (the v2 muted/vibrant models, owner 2026-07-11): resolveTheme builds
    // the style's curve (muted = identity ramp × scale; vibrant = uniform apparent boost) and
    // hands it in — the resolver has the cross-scale view (resolveBrand) this module must not
    // import. Takes precedence over pastelK/mult (both kept for the legacy sweep scripts).
    curve?: (L: number, mode: 'light' | 'dark') => number
    // DELTA-anchored ctas (owner direction 2026-07-04): instead of the fixed wash-4/5 register,
    // anchor the quiet cta at an explicit L per mode — resolveTheme computes it RELATIVE to the
    // primary's cta ("the same amount of subtle next to the primary", bright-calibrated ≈ ±0.16;
    // near the light pole the delta flips darker). Chroma comes from the subtle clamp curve at
    // that L; hue is the seed's own (cta carries identity, no torsion — brand-cta convention).
    ctaL?: { light: number; dark: number }
  }
): GeneratedScale {
  const { H } = hexToOklch(hex)
  const curve = opts?.curve ?? (opts?.pastelK !== undefined
    ? (L: number, _mode: 'light' | 'dark') => opts.pastelK! * maxChromaAt(L, H)
    : subtleSecondaryChromaCurve(H, opts?.mult))
  const scale = generateScale(hex, 'secondary', 'light', {
    chromaCurve: curve,
    highlight: true,
    enforceOnFillContrast: true,
    contrastProfile: opts?.contrastProfile,
  })
  const asCta = (stop: number, src: ColorStop) => makeStop(stop, src.L, src.C, src.H)
  if (opts?.ctaL) {
    const mk = (stop: number, L: number, mode: 'light' | 'dark') => makeStop(stop, L, curve(L, mode), scale.brandH)
    scale.cta = mk(9, opts.ctaL.light, 'light')
    scale.ctaHover = mk(10, hoverL(opts.ctaL.light), 'light')
    scale.ctaDark = mk(9, opts.ctaL.dark, 'dark')
    scale.ctaHoverDark = mk(10, hoverL(opts.ctaL.dark), 'dark')
  } else {
    scale.cta = asCta(9, scale.light[3])
    scale.ctaHover = asCta(10, scale.light[4])
    scale.ctaDark = asCta(9, scale.dark[3])
    scale.ctaHoverDark = asCta(10, scale.dark[4])
  }
  // quiet cta, judgment only (same law as the neutral's): wcag = mixing flip + the 4.5
  // conformance floor (pole flips when the preferred one fails); apca = pure apca-pole.
  const onEnforce = opts?.contrastProfile !== 'apca'
  const onFloor = opts?.contrastProfile === 'apca' ? undefined : 4.5
  scale.onFillTextIsWhite = onTextIsWhite(apcaY(scale.cta.r, scale.cta.g, scale.cta.b), scale.cta.L, scale.cta.C, scale.cta.H, onEnforce, onFloor)
  scale.onFillTextIsWhiteDark = onTextIsWhite(apcaY(scale.ctaDark.r, scale.ctaDark.g, scale.ctaDark.b), scale.ctaDark.L, scale.ctaDark.C, scale.ctaDark.H, onEnforce, onFloor)
  return scale
}
