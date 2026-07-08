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
import { withProfile, DEFAULT_APCA_LC_MAP, type ContrastProfile } from '../reqtoken/profiles'
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

  darkColliderFill?: 'muted'

  stop11DeepenL?: number
  stop12DeepenL?: number

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

  heat?: number

  // contrast PROFILE (opt-in): 'apca' re-solves every declared wcag contrast require under APCA Lc
  // targets via withProfile() — the same declaration vs a different constraint. Default 'wcag' is the
  // shipped behavior, byte-identical when unset.
  contrastProfile?: ContrastProfile
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
  // direct resolver users). The highlight flag gates stops 9/10 out of the compiled spec; the contrast
  // profile rewrites the wcag requires (withProfile is the identity for 'wcag' — byte-identical default).
  const rOpts = { ...opts, forcedArchetype, enforceOnFillContrast: !!opts?.enforceOnFillContrast }
  const compile = (spec: ModeSpec): ModeSpec =>
    withProfile(
      opts?.highlight ? spec : { ...spec, stops: spec.stops.filter(s => s.stop !== 9 && s.stop !== 10) },
      opts?.contrastProfile ?? 'wcag',
    )
  const lightRamp = resolveRamp(hex, 'light', compile(MODE_SPECS.light), rOpts)
  const darkRamp = resolveRamp(hex, 'dark', compile(MODE_SPECS.dark), rOpts)

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
    onHighlightIsWhite: opts?.highlight ? lightRamp.ons.onHighlightIsWhite : undefined,
    onHighlightIsWhiteDark: opts?.highlight ? darkRamp.ons.onHighlightIsWhite : undefined,
    identityHex: hex.toUpperCase(),
    paper0: p0Light ? makeStop(0, p0Light.L, p0Light.C, p0Light.H) : undefined,
    paper0Dark: p0Dark ? makeStop(0, p0Dark.L, p0Dark.C, p0Dark.H) : undefined,
  }
}

export function applyRedRepelRender(scale: GeneratedScale, enforceOnFillContrast: boolean, contrastProfile?: ContrastProfile): void {
  if (scale.brandC < HUE_NOISE_C) return
  const shift = redRepelShiftDeg(scale.brandH)
  if (Math.abs(shift) <= 1e-9) return
  const H = scale.brandH + shift

  scale.cta = makeStop(scale.cta.stop, scale.cta.L, scale.cta.C, H)
  scale.ctaHover = makeStop(scale.ctaHover.stop, scale.ctaHover.L, scale.ctaHover.C, H)
  if (enforceOnFillContrast && scale.onFillTextIsWhite) {
    const s9 = scale.cta
    if (legalRatio(s9.L, s9.C, s9.H, 1.0) < 4.5) {

      const L = findLForContrast(s9.L, scale.brandC, H, 1.0, 4.6)
      scale.cta = makeStop(9, L, scale.brandC, H)
      scale.ctaHover = makeStop(10, hoverL(L), scale.brandC, H)
    }
  }
}

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
    // DELTA-anchored ctas (owner direction 2026-07-04): instead of the fixed wash-4/5 register,
    // anchor the quiet cta at an explicit L per mode — resolveTheme computes it RELATIVE to the
    // primary's cta ("the same amount of subtle next to the primary", bright-calibrated ≈ ±0.16;
    // near the light pole the delta flips darker). Chroma comes from the subtle clamp curve at
    // that L; hue is the seed's own (cta carries identity, no torsion — brand-cta convention).
    ctaL?: { light: number; dark: number }
  }
): GeneratedScale {
  const { H } = hexToOklch(hex)
  const curve = opts?.pastelK !== undefined
    ? (L: number, _mode: 'light' | 'dark') => opts.pastelK! * maxChromaAt(L, H)
    : subtleSecondaryChromaCurve(H, opts?.mult)
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
