import { type Archetype, classifyArchetype, stateFillL } from './archetypes'
import {
  wcagY,
  legalRatio,
  findLForContrast,
  findLForContrastUp,
  apcaY,
} from './constraints'
import {
  NEUTRAL_CTA_DARK_POP_CLEARANCE, type DarkCtaKind } from './stopTable'
import { neutralChromaCurve, subtleSecondaryChromaCurve, type NeutralLevel } from './neutralCurve'

export type { NeutralLevel } from './neutralCurve'
export { SUBTLE_SECONDARY_MULT, SUBTLE_SECONDARY_MULT_CANDIDATES } from './neutralCurve'

// Shared color math + producer constants live in colorMath.ts (hoisted verbatim; leaf module so the
// requirement-token resolver can share them without an import cycle). Re-exported here for API compat.
import {
  HUE_NOISE_C, redRepelShiftDeg,
  hexToOklch, oklchToSrgbUnclamped, maxChromaAt,
  makeStop, onTextIsWhite, type ColorStop,
} from './colorMath'
export {
  goldSpineHue, torsionedHue, hexToOklch, RED_COOL_DEG, redCoolWeight, inRedBand,
  RED_PIVOT_H, redRepelShiftDeg, inRedRepelBand,
} from './colorMath'
export type { ColorStop } from './colorMath'

import { resolveRamp, type ResolvedStop } from './requirements/resolve'
import { MODE_SPECS, type ModeSpec } from './requirements/spec'
import { withProfile, DEFAULT_APCA_LC_MAP, CTA_ONFILL_ENFORCE_LC, type ContrastProfile } from './requirements/profiles'
import { whiteTextLcAt, findLForWhiteTextLc, APCA_SOLVE_MARGIN_LC } from './requirements/producers'
export type { ContrastProfile } from './requirements/profiles'

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
  ctaPressed: ColorStop
  ctaDark: ColorStop
  ctaHoverDark: ColorStop
  ctaPressedDark: ColorStop

  // the cta-ink trio (owner respec 2026-07-16): the family's 4.5 text-register cta — the
  // link-color escape. The ink band as states — 9/10/11 since C49; floored
  // at the stop-10 contrast require.
  ctaInk: ColorStop
  ctaInkHover: ColorStop
  ctaInkPressed: ColorStop
  ctaInkDark: ColorStop
  ctaInkHoverDark: ColorStop
  ctaInkPressedDark: ColorStop

  // C12 value repel: per-mode fired flags (the cta exited red's register) — annotation/audit data
  ctaRepelled?: { light: boolean; dark: boolean }


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
  // C28: this scale re-derives the warm-spine drift at its own DARK L (signals only —
  // brands keep a mode-stable identity hue). Set by the signal builders.
  signalWarmDrift?: boolean

  style?: 'default' | 'deeper' | 'full-chroma'

  chromaCurve?: (L: number, mode: 'light' | 'dark') => number

  darkChromaCurve?: (L: number, H: number, brandC: number, ctaC?: number) => number

  // the DARK CTA chroma register key (DARK_CTA_C, C16): 'brand' (default) = trimmed,
  // 'signal' = identity (dark cta keeps the seed's full chroma — canonical yellow/red
  // stay byte-identical light<->dark). Replaces the retired loudCta boolean.
  darkCtaC?: DarkCtaKind

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

  // FLAT dark cta (the derived-secondary model, owner 2026-07-12 "flat g23 in dark"): the dark
  // cta sits at this declared apparent distance above the dark ground instead of the prominence
  // pin (max(scaleL, floor)) — even across hues by construction. The pin reproduces a light
  // seed's pastel on the dark page; the pure carry near-vanishes a near-white seed's twin; this
  // is the designed register between them. Set ONLY by the derived-secondary path; absent =
  // byte-identical (brands, signals, custom secondaries keep the pin).
  darkCtaFlatApp?: number

  // contrast PROFILE (opt-in): 'apca' re-solves every declared wcag contrast require under APCA Lc
  // targets via withProfile() — the same declaration vs a different constraint. Default 'wcag' is the
  // shipped behavior, byte-identical when unset.
  contrastProfile?: ContrastProfile

  // APCA legibility clearance: in the wcag lane, push the cta fill until its chosen on-text pole also
  // clears the clearance bar (spec coEnforceLc, C42: Lc 65), keeping 4.5 as the hard floor. Default-ON
  // for brand-kind resolution (C18); the signal set passes it explicitly (C42).
  apcaClearance?: boolean

  // C42: per-call clearance bar override — critical rides CRITICAL_CLEARANCE_LC (50, the identity
  // carve-out); unset = the spec's coEnforceLc. Read only where apcaClearance is on.
  apcaClearanceLc?: number

  // DELTA-KEYED dark (THE dark model, owner 2026-07-09): the resolved LIGHT stops, injected into the DARK
  // resolve — dark is a live function of light (hue carried for surfaces 1-9; lightness re-referenced to
  // the dark ground in apparent space at the band's DARK_BAND_LIFT factor, chroma resampled at the lifted
  // depth — C24; inks dark-native; cta prominence-floored). generateScale always sets
  // these; direct resolveRamp callers opt in per call.
  deltaLightStops?: { stop: number; L: number; C: number; H: number }[]
  deltaCarry?: boolean
  // per-bolt-on instruments (not shipped): layer exactly ONE old dark mechanism onto the pure carry, so the
  // eye can see what that piece does. Each is a REAL engine fn (no reimplementation); default off = identical.
  deltaHKPlace?: boolean     // place carried C/H by the old apparent-L rung (perceptualRungL @ scaffold), not luminance
  deltaChromaEq?: boolean    // replace carried C with the old H-K chroma equalizer (perceptualDarkC)
  deltaLiftFloor?: boolean   // floor carried L at the scaffold rootL (the old "lift, never sink" recede floor)
}

// generateScale is now an ADAPTER over the requirement-token resolver (src/engine/requirements): it compiles
// the caller opts into a resolver invocation per mode and assembles the same GeneratedScale contract as
// before. The producer/require/refine math lives in src/engine/requirements/producers.ts (verbatim ports of
// the old body; the cutover was proven byte-identical before the legacy body and its parity gates were
// deleted in 8b79504 — the one-off before/after byte-compare that proved it has since been retired).
export function generateScale(
  hex: string,
  scaleName: string,
  forcedArchetype?: Archetype,
  opts?: GenerateOptions
): GeneratedScale {
  // compile: opts + the built-in declaration → per-mode resolver runs. enforceOnFillContrast is passed
  // explicitly (generateScale's contract defaults it OFF; the spec's declared default only applies to
  // direct resolver users). The contrast profile rewrites the wcag requires (withProfile is the
  // identity for 'wcag' — byte-identical default).
  // (The `highlight` opt DELETED 2026-07-29: it filtered stop 9 out of the compiled spec, and every
  // caller in the repo passed true. With highlight-9 gone it had nothing left to gate.)
  const rOpts = { ...opts, forcedArchetype, enforceOnFillContrast: !!opts?.enforceOnFillContrast }
  const compile = (spec: ModeSpec): ModeSpec => withProfile(spec, opts?.contrastProfile ?? 'wcag')
  const lightRamp = resolveRamp(hex, 'light', compile(MODE_SPECS.light), rOpts)
  // DELTA-KEYED dark IS the dark model (un-gated, owner 2026-07-09): dark is a live function of the resolved
  // light — hue carried per stop, lightness re-referenced to the dark ground (0.178) in APPARENT space at
  // the band's C24 lift, chroma carried/resampled with it; the declared requires floor L. Replaces the
  // seed-keyed DARK_L scaffold as the default.
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

  const roleStop = (r: { L: number; C: number; H: number }, stop: number) => makeStop(stop, r.L, r.C, r.H)
  return {
    name: scaleName, archetype, brandL, brandC, brandH,
    onFillTextIsWhite: lightRamp.ons.onFillIsWhite,
    onFillTextIsWhiteDark: darkRamp.ons.onFillIsWhite,
    light, dark,
    cta,
    ctaHover: roleStop(lightRamp.roles.ctaHover, 10),
    ctaPressed: roleStop(lightRamp.roles.ctaPressed, 11),
    ctaDark,
    ctaHoverDark: roleStop(darkRamp.roles.ctaHover, 10),
    ctaPressedDark: roleStop(darkRamp.roles.ctaPressed, 11),
    // the ink trio IS stops 9/10/11 (C49 — pure references in the resolver), so the
    // stop numbers here are the real ones, not off-scale pseudo-slots
    ctaInk: roleStop(lightRamp.roles.ctaInk, 9),
    ctaInkHover: roleStop(lightRamp.roles.ctaInkHover, 10),
    ctaInkPressed: roleStop(lightRamp.roles.ctaInkPressed, 11),
    ctaInkDark: roleStop(darkRamp.roles.ctaInk, 9),
    ctaInkHoverDark: roleStop(darkRamp.roles.ctaInkHover, 10),
    ctaInkPressedDark: roleStop(darkRamp.roles.ctaInkPressed, 11),
    ctaRepelled: { light: !!lightRamp.roles.cta.repelled, dark: !!darkRamp.roles.cta.repelled },
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

// ── THE NEUTRAL'S TINT-HUE SOURCE (owner 2026-08-04: "use secondary and a custom") ─────
// The neutral tint machinery is hue-parametric; the OFFERING picks which hue feeds it:
// absent = the primary's (every pre-source recipe replays byte-identical) · 'secondary' =
// the secondary's seed hue, FOLLOWED LIVE (the source is stored, never a frozen hue — a
// re-apply tracks the current secondary) · 'custom' = the hue of a user hex (the hex's HUE
// tints the generated near-grey; strength stays the declared curve — not a custom ramp
// seed). ONE resolution rule for every surface, fallbacks INSIDE: no secondary in scope or
// no/invalid custom hex → the primary's hue. New sources tint at the DEFAULT level (the
// 6-entry dropdown collapses source × strength; Intense variants are a later ask).
export type NeutralSource = 'secondary' | 'custom'
export function neutralTintHue(
  primaryH: number,
  source?: NeutralSource,
  secondaryH?: number,
  customHex?: string | null,
): number {
  if (source === 'secondary' && secondaryH !== undefined) return secondaryH
  if (source === 'custom' && customHex && /^#?[0-9a-fA-F]{6}$/.test(customHex))
    return hexToOklch(customHex.startsWith('#') ? customHex : `#${customHex}`).H
  return primaryH
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
  const curve = neutralChromaCurve(brandH, level)
  const scale = generateScale(grayHex, 'neutral', 'light', {
    chromaCurve: curve,
    enforceOnFillContrast: true,
    contrastProfile,
  })

  // The neutral cta is LOW-HIERARCHY: unlike a brand/signal cta (a bold off-scale
  // fill), it reads at the quiet wash level, so its REST fill stays fed from the
  // scale's own stop 4 — which flips via ROOT_L_LIGHT/ROOT_L_DARK (light ~0.936, dark ~0.285).
  // on-cta is recomputed so the text stays legible in each mode.
  const asCta = (stop: number, src: ColorStop) => makeStop(stop, src.L, src.C, src.H)
  scale.cta = asCta(9, scale.light[3])
  scale.ctaDark = asCta(9, scale.dark[3])
  // DARK POP CLEARANCE (owner 2026-07-27): the fed dark washes pack near black, so
  // the quiet fill sat ~1.07 vs the POP plane (dark paper-3 — post-C27 the one-level
  // highest background; a generated pop candidate was tried and RETIRED, owner
  // 2026-07-28: once the papers share a photometric level, pop = paper-3 is the
  // design) — invisible on the very cards its buttons ride, while "clearing" ~1.3
  // against absolute black, a surface nothing renders on. The clearance reads
  // against pop: lift the rest fill until it clears the bar vs the resolved dark
  // paper-3 — the dark mirror of light's fed cta, which already reads ~1.25 against
  // its own white pop. Solved on the wcag ratio (a perceptual separation bar,
  // profile-agnostic; the dual-rendition legality solver is reused); chroma
  // re-clamps at the lifted L via makeStop; on-text is re-judged below.
  const popDark = scale.dark[2] // paper-3 — the POP plane in dark
  const popDarkY = wcagY(popDark.L, popDark.C, popDark.H)
  const clearedL = findLForContrastUp(scale.ctaDark.L, scale.ctaDark.C, scale.ctaDark.H, popDarkY, NEUTRAL_CTA_DARK_POP_CLEARANCE)
  const popLift = clearedL - scale.ctaDark.L
  if (popLift > 1e-6) {
    scale.ctaDark = makeStop(9, scale.dark[3].L + popLift, scale.dark[3].C, scale.dark[3].H)
  }
  // Hover/pressed ride the shared fill-state rule from the (lifted) rest — the same
  // apparent step every family takes (owner 2026-07-28; the old stop-5/6 aliases gave
  // the neutral ramp-sized steps no other family got).
  const nState = (stop: number, mode: 'light' | 'dark', rest: ColorStop, k: 1 | 2) => {
    // states carry the REST's own hue — the fed stop's torsioned H, not the raw brandH
    const L = stateFillL(rest.L, mode, k)
    return makeStop(stop, L, curve(L, mode), rest.H)
  }
  scale.ctaHover = nState(10, 'light', scale.cta, 1)
  scale.ctaPressed = nState(11, 'light', scale.cta, 2)
  scale.ctaHoverDark = nState(10, 'dark', scale.ctaDark, 1)
  scale.ctaPressedDark = nState(11, 'dark', scale.ctaDark, 2)
  // cta-ink trio stays resolver-minted (the neutral's own ink stops as states, C49) —
  // the quiet-fill override above touches only the fill trio.
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
    enforceOnFillContrast: true,
    contrastProfile: opts?.contrastProfile,
  })
  const asCta = (stop: number, src: ColorStop) => makeStop(stop, src.L, src.C, src.H)
  const mk = (stop: number, L: number, mode: 'light' | 'dark') => makeStop(stop, L, curve(L, mode), scale.brandH)
  // states = the shared fill-state rule from the rest fill (owner 2026-07-28),
  // whether the rest was pinned (opts.ctaL) or fed from the scale's stop 4 —
  // and they carry the REST's own hue (a fed stop's H is torsioned off brandH)
  const st = (stop: number, mode: 'light' | 'dark', rest: ColorStop, k: 1 | 2) => {
    const L = stateFillL(rest.L, mode, k)
    return makeStop(stop, L, curve(L, mode), rest.H)
  }
  if (opts?.ctaL) {
    scale.cta = mk(9, opts.ctaL.light, 'light')
    scale.ctaDark = mk(9, opts.ctaL.dark, 'dark')
  } else {
    scale.cta = asCta(9, scale.light[3])
    scale.ctaDark = asCta(9, scale.dark[3])
  }
  scale.ctaHover = st(10, 'light', scale.cta, 1)
  scale.ctaPressed = st(11, 'light', scale.cta, 2)
  scale.ctaHoverDark = st(10, 'dark', scale.ctaDark, 1)
  scale.ctaPressedDark = st(11, 'dark', scale.ctaDark, 2)
  // quiet cta, judgment only (same law as the neutral's): wcag = mixing flip + the 4.5
  // conformance floor (pole flips when the preferred one fails); apca = pure apca-pole.
  const onEnforce = opts?.contrastProfile !== 'apca'
  const onFloor = opts?.contrastProfile === 'apca' ? undefined : 4.5
  scale.onFillTextIsWhite = onTextIsWhite(apcaY(scale.cta.r, scale.cta.g, scale.cta.b), scale.cta.L, scale.cta.C, scale.cta.H, onEnforce, onFloor)
  scale.onFillTextIsWhiteDark = onTextIsWhite(apcaY(scale.ctaDark.r, scale.ctaDark.g, scale.ctaDark.b), scale.ctaDark.L, scale.ctaDark.C, scale.ctaDark.H, onEnforce, onFloor)
  return scale
}
