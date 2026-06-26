import { type Archetype, classifyArchetype, medianLForArchetype, hoverL } from './archetypes'
import {
  wcagY,
  contrastRatio,
  findLForY,
  findLForContrast,
  findMaxLForContrast,
  computeLFlip,
  computeLFillMax,
  clampChromaToGamut,
  oklchToLinearRgb,
  apcaY,
  apcaLc,
} from './constraints'
import {
  LIGHT_STOPS,
  LIGHT_BASE_C,
  DARK_STOPS,
  DARK_NEUTRAL_L,
  type StopSpec,
  STOP_11,
  STOP_12,
  STOP_11_CONTRAST,
  STOP_12_CONTRAST_FLOOR,
  DARK_STOP_9_MIN_L,
  DARK_COLLIDER_MUTED_L,
  DARK_COLLIDER_MUTED_CHROMA_SCALE,
  DARK_STOP_11,
  DARK_STOP_12,
  GOLD_SPINE,
  WARM_TORSION,
  HIGHLIGHT_LIGHT,
  HIGHLIGHT_DARK,
  ILLUS_STOPS,
  REFERENCE_H,
} from './stopTable'
import { neutralChromaCurve, type NeutralLevel } from './neutralCurve'
import { darkCtaTrim } from './darkChromaCurve'
import { perceptualRungL } from './perceptualL'

// Re-export so callers can pull the neutral level alongside generateNeutralScale.
export type { NeutralLevel } from './neutralCurve'

// Gold-spine path hue at a given lightness — piecewise-linear
// interpolation over GOLD_SPINE (clamped at the ends).
function goldSpineHueTable(L: number): number {
  const pts = GOLD_SPINE
  if (L <= pts[0][0]) return pts[0][1]
  for (let i = 1; i < pts.length; i++) {
    if (L <= pts[i][0]) {
      const [l0, h0] = pts[i - 1]
      const [l1, h1] = pts[i]
      return h0 + ((h1 - h0) * (L - l0)) / (l1 - l0)
    }
  }
  return pts[pts.length - 1][1]
}

// Spine source indirection — ANALYSIS ONLY. Default is the fitted table
// above (delegation, bit-identical). The A/B review harness swaps in the
// derived room-centroid path to render both candidates through the real
// pipeline in one process. Never set outside analysis scripts; build
// paths never call this.
let spineSource: (L: number) => number = goldSpineHueTable
export function __setSpineSourceForAnalysis(fn: ((L: number) => number) | null): void {
  spineSource = fn ?? goldSpineHueTable
}
function goldSpineHue(L: number): number {
  return spineSource(L)
}

// Warm-band rotation along the gold spine (see WARM_TORSION) — DARK-ramp
// (and illustration-ramp) machinery; the light ramp uses the sigmoid-
// weighted spine drift inside generateScale instead.
//
// RELATIVE SPINE (2026-06-11 prototype): the spine contributes its SHAPE —
// the hue delta between the stop's L and the ramp's pinned anchor L —
// never an absolute hue target. For on-path brands (brandH ≈
// spine(anchorL)) this is bit-identical to the old absolute form; off-path
// brands keep their identity offset at every stop instead of being pulled
// a constant travel·w·(brandH − spine(anchorL)) toward the path, and the
// curve passes through the pinned stop by construction (drift → 0 as
// stopL → anchorL). anchorL is the L where the ramp pins the exact brand
// hue: the dark fill L for the dark ramp, brandL for the illustration ramp.
//
// offPathG attenuates the inherited swing by the brand's distance from the
// path, gauss(brandH − spine(brandL), σ20): on-path brands (the vivid
// oranges/golds/yellows the spine was solved on) take the full Radix-shape
// swing; off-path brands (nano H 94 @ L 0.74 — +23° above the path;
// ireland H 78 @ L 0.86 — 23° below) take a toned-down version, so their
// papers and text stops stay in the brand's own hue family instead of
// inheriting the full 63° cream→brown sweep. A RELATIVE quantity
// (distance from path, not an absolute hue center) — moving along the
// path never changes it, so it cannot re-introduce the attractor class.
function torsionedHue(brandH: number, stopL: number, anchorL: number, offPathG: number): number {
  const { bandLo, bandHi, taperDeg, travel, capDeg } = WARM_TORSION
  const w = Math.min(
    1,
    Math.max(0, (brandH - bandLo) / taperDeg),
    Math.max(0, (bandHi - brandH) / taperDeg)
  )
  if (w <= 0) return brandH
  const drift = travel * (goldSpineHue(stopL) - goldSpineHue(anchorL)) * w * offPathG
  return brandH + Math.max(-capDeg, Math.min(capDeg, drift))
}

// Off-path swing attenuation width (degrees of brandH − spine(brandL)).
// 20° puts nano (+22.9°) and ireland (−23.4°) at g ≈ 0.5 — half swing —
// while the vivid fleet yellows (|δ| ≤ 10°) keep g ≥ 0.88.
const SPINE_OFFPATH_SIGMA = 20

// ─── Light-ramp model helpers (2026-06 minimal OKLCH ramp) ──────────────────
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x))
const gauss = (x: number, sigma: number) => Math.exp(-0.5 * (x / sigma) ** 2)
// Signed shortest hue delta from h to center, in [-180, 180]
function hueDelta(h: number, center: number): number {
  let d = (h - center) % 360
  if (d > 180) d -= 360
  if (d < -180) d += 360
  return d
}

// Red/warm watershed sigmoid: S → 1 for warm hues (oranges/golds/yellows),
// S → 0 for reds below the H 35.5 center. Drives both the spine-drift
// weight (1−S kills drift for reds: red papers stay on hue) and the red
// cool weight w_red = 1−S (reds rotate cool, away from error).
const RED_TORSION_CENTER_H = 35.5
const RED_TORSION_SOFTNESS = 3.5
// Lower edge of the red band: below H 12 the hue reads as pink/magenta,
// not red — pinks keep their identity (designer direction: only red gets
// hue-shifted and archetype-shifted).
const RED_BAND_LO_H = 12
// Softness 2 (not the upper edge's 3.5): the fade must be fully saturated
// by the red core (factor 0.9992 at H 26) so true reds keep their exact
// blessed render, while pinks at H 8–10 still taper off smoothly.
const RED_BAND_LO_SOFTNESS = 2
// Vividness normalization: brands at C ≥ 0.13 are fully vivid (v = 1).
const VIVID_C = 0.13
// Below this chroma the measured hue is sensor noise — render a neutral
// ladder at the brand's nominal hue and never derive anything from hue.
const HUE_NOISE_C = 0.008
// Muted-warm blend: u → 1 as vividness falls (denominator 0.55), gating
// the satFraction "cream" chroma envelope and full spine travel that keep
// muted browns warm instead of pink.
const MUTED_BLEND_DENOM = 0.55
// Upper hue edge of the muted-warm cream blend: past yellow-green the
// cream envelope stops applying. Centered at H 105 with softness 5: high
// enough (and sharp enough) that muted golds/browns like western-commerce
// H 61 keep their blessed cream render bit-for-bit, low enough that muted
// greens/teals at H > 120 get u < 0.01 and keep ladder chroma. The fleet
// has no muted brand between H 62 and H 141, so the edge sits in a gap.
const CREAM_UPPER_H = 105
const CREAM_UPPER_SOFTNESS = 5
// ─── Style lever: 'deeper' band gate (decision 2026-06-11) ────────────────
// The lever modulates style registers ONLY inside the ambiguous semi-muted
// warm band (flag × band, never flag alone). Gate = hue window 55–100 ×
// bump on the RAW cream blend u over [0.10, 0.70] — a pure function of the
// brand's OKLCH position, never of brand identity. Edge softness 0.015 keeps
// fully-muted golds (mint u 0.82, vidalia 0.89) and vivid golds (u ≈ 0)
// sub-bit even if flagged; locked sets are additionally unflagged → exact 0.
const DEEPER_BAND_H_LO = 55
const DEEPER_BAND_H_HI = 100
const DEEPER_BAND_H_SOFT = 4
const DEEPER_BAND_U_LO = 0.10
const DEEPER_BAND_U_HI = 0.70
const DEEPER_BAND_U_SOFT = 0.015
// How far 'deeper' lifts effective mutedness toward 1 (full cream/brown
// register — the treatment mint already gets). Tuned on lutheran #C8A35D:
// derived stops track the site's own hover direction → #B8944F (browner,
// never brighter).
const DEEPER_STRENGTH = 0.85

// Render-time cool rotation for warm reds (replaces the deleted preventive
// hue shear): stops 9/10 rotate −RED_COOL_DEG·w_red away from error's
// vermillion as the FINAL render step — after every decision (collision,
// rung 1, on-fill polarity) has been made from the RAW brand hue.
export const RED_COOL_DEG = 10.8
// w_red uses the RAW (unwrapped) hue difference, NOT the shortest delta:
// the band only exists between pink (below H 12) and orange (above
// H 35.5). With the wrapped delta every cool hue (blues at H ~255) would
// read as w_red ≈ 1 and get rotated off its exact brand hex. The lower
// sigmoid fades the rotation out toward pink, the upper toward orange.
export function redCoolWeight(brandH: number): number {
  return (
    sigmoid((brandH - RED_BAND_LO_H) / RED_BAND_LO_SOFTNESS) *
    (1 - sigmoid((brandH - RED_TORSION_CENTER_H) / RED_TORSION_SOFTNESS))
  )
}

// Hard red-band predicate for resolve-time gates (rung-1 eligibility, the
// dark-collider register, the final cool-render gate): (12, 35.5] on the
// RAW hue. Pinks and oranges fall outside and keep identity.
export function inRedBand(h: number): boolean {
  return h > RED_BAND_LO_H && h <= RED_TORSION_CENTER_H
}

// Max sRGB chroma at (L, H) — the gamut envelope. 0.52 exceeds any
// chroma sRGB can hold, so the clamp returns the boundary itself.
function maxChromaAt(L: number, H: number): number {
  return clampChromaToGamut(L, 0.52, H)
}

function hexToOklch(hex: string): { L: number; C: number; H: number } {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  const r = parseInt(full.slice(0, 2), 16) / 255
  const g = parseInt(full.slice(2, 4), 16) / 255
  const b = parseInt(full.slice(4, 6), 16) / 255
  const lin = (c: number) => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  const rl = lin(r), gl = lin(g), bl = lin(b)
  const lms_l = 0.4121656120 * rl + 0.5362752080 * gl + 0.0514575653 * bl
  const lms_m = 0.2118591070 * rl + 0.6807189584 * gl + 0.1074065790 * bl
  const lms_s = 0.0883097947 * rl + 0.2818474174 * gl + 0.6302613616 * bl
  const l_ = Math.cbrt(lms_l), m_ = Math.cbrt(lms_m), s_ = Math.cbrt(lms_s)
  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_
  const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_
  const bv = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_
  return { L, C: Math.sqrt(a * a + bv * bv), H: (Math.atan2(bv, a) * 180 / Math.PI + 360) % 360 }
}

function oklchToSrgbUnclamped(L: number, C: number, H: number): { r: number; g: number; b: number } {
  const [rl, gl, bl] = oklchToLinearRgb(L, C, H)
  const gm = (c: number) => c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055
  return { r: gm(rl), g: gm(gl), b: gm(bl) }
}

export interface ColorStop {
  stop: number
  L: number
  C: number
  H: number
  r: number
  g: number
  b: number
}

export interface GeneratedScale {
  name: string
  archetype: Archetype
  brandL: number
  brandC: number
  brandH: number
  lFlip: number
  lFillMax: number
  onFillTextIsWhite: boolean
  // computed separately per mode — the dark fill can sit at a different L
  // (lift floor / collider registers) than the light fill
  onFillTextIsWhiteDark: boolean
  light: ColorStop[]
  dark: ColorStop[]
  // ── Stage 2 additive role tokens ──
  // highlight-9/10 (brand/secondary) and cta/cta-hover (neutral) are appended
  // to light/dark with engine numbers 13+ — one uniform generated list per
  // ramp, labeled by tokenNames. Consumers guarding only the original 1–12
  // scale slice(0, 12).
  // on-highlight text polarity (universal token, all ramps). White normally;
  // black within the yellow band, where darkening would kill the hue.
  onHighlightIsWhite?: boolean
  onHighlightIsWhiteDark?: boolean
  // Literal input hex, mode-invariant — emitted as `identity` for brand/
  // secondary only. Undefined for neutral (no single input color).
  identityHex?: string
}

// DARK-ramp machinery only: keeps muted-but-chromatic brands from
// vanishing into gray murk on dark backgrounds. floorStrength fades the
// floor to ZERO as brand chroma approaches sensor noise (2026-06-11 dark
// pass: the full-strength floor pumped invented hue onto near-neutral
// accents — pure-black #000000 has undefined hue that defaults to 0 and
// rendered a PINK dark ladder). Gray brands now render gray dark ladders,
// matching the light ramp's HUE_NOISE_C doctrine; the fade is smooth so
// no two near-identical accents land on opposite sides of a cliff.
// KEEP (cf. catalog C7): the dark curve now has its OWN identity-proportional surface
// floor (darkChromaCurve's ctaC arg), so this path serves EXACT / ships-raw brands
// only (they don't pass darkChromaCurve). Not redundant — do not delete.
function applyChromaFloor(C: number, multiplier: number, stopIndex: number, floorStrength: number): number {
  const raw = C * multiplier
  if (floorStrength <= 0) return raw
  const floor = (0.02 + (0.04 - 0.02) * (stopIndex / 7)) * floorStrength
  return Math.max(raw, floor)
}

// Brand chroma at which the dark floor reaches full strength. Below
// HUE_NOISE_C the measured hue is noise (floor 0, gray ladder); the fleet
// gap between whisper-tints (≤0.012) and the quiet-but-real tints the
// floor was built for (≥0.024) puts the full-strength point at 0.022 —
// every blessed render at C ≥ 0.022 is bit-identical.
const DARK_FLOOR_FULL_C = 0.022
// Original muted-brand bound of the floor (the old `lowChroma` gate):
// at/above this the floor never applied. Kept exact for blessed-compat.
const DARK_FLOOR_MUTED_MAX_C = 0.04

function makeStop(stop: number, L: number, C: number, H: number): ColorStop {
  const gamutC = clampChromaToGamut(L, C, H)
  const { r, g, b } = oklchToSrgbUnclamped(L, gamutC, H)
  return { stop, L, C: gamutC, H, r, g, b }
}

export interface GenerateOptions {
  // Signed degrees added to the brand hue before generation — used by the
  // signal-yield system (e.g. lemon-shifted warning). The whole ramp
  // generates from the shifted hue; stop 9 is no longer the exact input
  // hex when set.
  hueShiftDeg?: number
  // Multiplies the base chroma before generation (all stops). Used when a
  // yielding signal shifts cool and washes out — e.g. lemon-shifted warning.
  chromaScale?: number
  // Multiplies chroma for stops 1–8 only (the subtle/UI tier), leaving the
  // anchor and text stops untouched. Signals use this to read as alerts at
  // the subtle tier. Gamut clamping still applies after scaling.
  subtleChromaScale?: number
  // Dark-mode collider register: 'muted' floats the fill to pastel rose
  // (reds — dusty, desaturated vs error's vivid register).
  darkColliderFill?: 'muted'
  // Light stops 11/12 extra deepening (subtracted from the found L, then
  // re-bounded against stop 2). Rung-1 error colliders pass 0.07/0.05
  // ("opt3") so their accent/body text stands off error-11.
  stop11DeepenL?: number
  stop12DeepenL?: number
  // Dark fill lift floor override. Brands pass DARK_BRAND_FILL_MIN_L
  // (0.70); signals keep the default vivid 0.63 identity.
  darkFillMinL?: number
  // Dark stops 1–8 table override — chromatic accents (brands + signals)
  // pass ACCENT_DARK_STOPS so their subtle tier stands off the dark app
  // background; neutral keeps the quieter base ladder.
  darkStops?: StopSpec[]
  // "APCA picks the polarity, WCAG bounds the fill": when the chosen
  // on-fill polarity is white but the fill fails WCAG 4.5:1, darken the
  // fill (stops 9/10) to the compliant edge (~L 0.555). Resolves the
  // L 0.56–0.65 dead zone where WCAG and APCA disagree — a brand's
  // compliance review runs WCAG. Signals enforce this; brands TBD.
  enforceOnFillContrast?: boolean
  // Stage 2.5: darken THIS ramp's light fill to the WCAG-4.5 white-compliant
  // edge so the normal on-fill polarity generates WHITE on its own. A value
  // move on the fill's lightness — NOT a polarity override: APCA already picks
  // white on these mid-green fills, and once the darkened fill clears 4.5 the
  // black-text fallback branch is simply never reached. The success signal sets
  // this for consistency with the other non-yellow signal fills (error/info).
  // LIGHT only (dark fills are black-first by design). Ramps that don't set it
  // keep fillAnchorL === scaleL ⇒ byte-identical.
  enforceWhiteFill?: boolean
  // Dark mode keeps the red cool character: generate the ENTIRE dark
  // pipeline from the cooled hue (brandH − RED_COOL_DEG·w_red) for
  // red-band brands. Render-time only — the light path and every decision
  // input stay on the raw hue. resolveBrand passes this for all non-exact
  // brands.
  coolRedDark?: boolean
  // Style lever (decision 2026-06-11): modulates style registers ONLY
  // inside the semi-muted warm band (flag × band, never flag alone).
  // Plumbed but not yet wired to math — no-op until the deeper pass lands.
  style?: 'default' | 'deeper' | 'full-chroma'
  // Stage 2: append the brand/secondary highlight-9/10 fill pair to light/dark
  // (+ on-highlight polarity). resolveBrand passes this; signals don't (a
  // signal's stop-9 highlight already IS its fill). Append-only: never touches
  // stops 1–12.
  highlight?: boolean
  // Neutral seam: when set, REPLACES the per-stop native chroma with
  // chromaCurve(L, mode) at every generation site (stops 1–12, the fill, text
  // stops, the rung) and the fill-polarity precompute. makeStop still
  // gamut-clamps after, so the curve states intent and the gamut is the
  // backstop. Evaluated by LIGHTNESS (not stop index) so it also covers the
  // off-grid roles — the archetype cta and the rung-shifted highlight. Unset ⇒
  // every chroma argument falls through to its native value ⇒ byte-identical
  // for brand/secondary/signals.
  chromaCurve?: (L: number, mode: 'light' | 'dark') => number
  // Phase-3 dark chroma curve (greenfield). When set, REPLACES the proportional
  // dark chroma (subtleC × chromaMultiplier) at the dark SURFACE (1–8) and TEXT
  // (11/12) stops with an absolute peak×shape×cap value (see darkChromaCurve.ts).
  // Dark-only — light is untouched; the fill (9/10) keeps brandC identity. makeStop
  // gamut-clamps after. Unset ⇒ every dark chroma falls through unchanged ⇒
  // byte-identical.
  // ctaC (4th arg) is the resolved dark cta chroma — when passed, the curve floors
  // surface chroma at an identity-proportional fraction of it (see darkChromaCurve.ts).
  darkChromaCurve?: (L: number, H: number, brandC: number, ctaC?: number) => number
  // Signal "loud cta": keep the dark cta at full brand chroma (skip the per-hue
  // darkCtaTrim that brands get). §3.1 — signals are vivid/louder. Default off ⇒ unchanged.
  loudCta?: boolean
  // Optional "alerts run hotter" multiplier on the chroma wrapper (cAt). Default
  // 1 ⇒ byte-identical. Owner reviews signals with-vs-without; no family sets it yet.
  heat?: number
}

// ── Shared `ons` polarity — ONE rule for on-cta AND on-highlight, both modes ──
// APCA picks the polarity (whichever of white/black scores the higher |Lc| on the
// fill); when `enforce`, a WCAG bound flips it to the other side when the APCA pick
// fails 4.5 and the other side complies (WCAG 4.5 + APCA |Lc| ≥ 45). Polarity ONLY —
// the cta's value-darken fallback for the "neither complies" case stays on the cta
// (the highlight relies on its background being resolved by the curve instead).
function onTextIsWhite(Y: number, L: number, C: number, H: number, enforce: boolean): boolean {
  let white = Math.abs(apcaLc(1.0, Y)) >= Math.abs(apcaLc(0.0, Y))
  if (enforce) {
    if (white && contrastRatio(1.0, wcagY(L, C, H)) < 4.5) {
      if (contrastRatio(wcagY(L, C, H), 0) >= 4.5 && Math.abs(apcaLc(0.0, Y)) >= 45) white = false
    } else if (!white && contrastRatio(wcagY(L, C, H), 0) < 4.5) {
      if (contrastRatio(1.0, wcagY(L, C, H)) >= 4.5 && Math.abs(apcaLc(1.0, Y)) >= 45) white = true
    }
  }
  return white
}

export function generateScale(
  hex: string,
  scaleName: string,
  forcedArchetype?: Archetype,
  opts?: GenerateOptions
): GeneratedScale {
  const { L: brandL, C: rawC, H: rawH } = hexToOklch(hex)
  const brandH = (rawH + (opts?.hueShiftDeg ?? 0) + 360) % 360
  const brandC = rawC * (opts?.chromaScale ?? 1)
  // Subtle-tier chroma (stops 1–8); anchor and text stops use brandC.
  const subtleC = brandC * (opts?.subtleChromaScale ?? 1)
  // Neutral chroma seam: native chroma unless an explicit curve overrides it
  // (by lightness + mode). Wrap EVERY chroma argument with this — unset ⇒
  // identity ⇒ byte-identical; set ⇒ the curve drives chroma, gamut-clamped.
  const cAt = (mode: 'light' | 'dark', L: number, nativeC: number): number =>
    (opts?.chromaCurve ? opts.chromaCurve(L, mode) : nativeC) * (opts?.heat ?? 1)
  const archetype = forcedArchetype ?? classifyArchetype(brandL)
  const scaleL = forcedArchetype ? medianLForArchetype(forcedArchetype) : brandL
  // Dark-floor strength: 0 at/below hue-noise chroma (gray ladder), full
  // by DARK_FLOOR_FULL_C — smooth ramp between. The hard upper cutoff at
  // DARK_FLOOR_MUTED_MAX_C reproduces the original "lowChroma" gate
  // exactly so every blessed render with C ≥ 0.022 stays bit-identical.
  // KNOWN CLASS-D CLIFF (2026-06-11 dark pass): brands at C 0.0399 vs
  // 0.0401 get dark-12 floors 0.051 vs none — queued for its own
  // presented fix; do not silently smooth it here.
  const darkFloorStrength =
    brandC >= DARK_FLOOR_MUTED_MAX_C
      ? 0
      : Math.min(1, Math.max(0, (brandC - HUE_NOISE_C) / (DARK_FLOOR_FULL_C - HUE_NOISE_C)))
  const lFlip = computeLFlip(brandC, brandH)
  const lFillMax = computeLFillMax(brandC, brandH)
  // On-fill text polarity by APCA: whichever of white/black scores higher
  // |Lc| on the stop-9 fill. The WCAG 2.x equal-contrast flip point picks
  // black on saturated mid-tone fills (error red, success green) where
  // convention and APCA both side with white.
  // Stage 2.5: enforceWhiteFill darkens the fill anchor to the white edge up
  // front (success), so polarity below is read off the DARKENED green and picks
  // white naturally — the flip-to-black branch never triggers. Default ramps:
  // fillAnchorL === scaleL (no-op, byte-identical).
  const fillAnchorL =
    opts?.enforceWhiteFill && contrastRatio(1.0, wcagY(scaleL, brandC, brandH)) < 4.5
      ? findLForContrast(scaleL, brandC, brandH, 1.0, 4.6)
      : scaleL
  const fill9 = oklchToSrgbUnclamped(fillAnchorL, clampChromaToGamut(fillAnchorL, cAt('light', fillAnchorL, brandC), brandH), brandH)
  const fill9ApcaY = apcaY(fill9.r, fill9.g, fill9.b)
  let onFillTextIsWhite = onTextIsWhite(fill9ApcaY, fillAnchorL, brandC, brandH, !!opts?.enforceOnFillContrast)

  // ─── Light ramp: minimal OKLCH model (2026-06, designer-approved) ─────────
  // ORDERING INVARIANT (architectural): every DECISION — collision gates,
  // the inRedBand watershed, archetype/rung-1 anchoring, on-fill text
  // polarity — is taken from the RAW brand hue. The cool rotation and the
  // spine drift below are render-time presentation only and must never
  // feed back into a decision (see resolveBrand, which applies the stop
  // 9/10 cooling as its final step, after all decisions are locked).
  //
  // Model weights — all pure functions of the brand's OKLCH position:
  //   v       vividness, min(1, C_b/0.13)
  //   S       red/warm watershed sigmoid at H 35.5 (wrapped delta)
  //   w_red   1 − sigmoid of the RAW delta — cool rotation weight for reds
  //   w_warm  S · gaussian(ΔH vs 83, σ28) — spine-drift weight, warm core
  //   u       S · creamGate · min(1, (1−v)/0.55) — muted-warm "cream" blend
  //   creamGate  1 − sigmoid at CREAM_UPPER — kills BOTH the cream blend and
  //           the mutedness share of the spine drift past yellow-green, so
  //           muted greens/teals/cyans neither cream nor drift toward gold
  //           (2026-06-11 eye review: ungated drift read as yellowing)
  const hueIsNoise = brandC < HUE_NOISE_C
  const v = Math.min(1, brandC / VIVID_C)
  const vSubtle = Math.min(1, subtleC / VIVID_C)
  const S = hueIsNoise ? 0 : sigmoid(hueDelta(brandH, RED_TORSION_CENTER_H) / RED_TORSION_SOFTNESS)
  const wRed = hueIsNoise ? 0 : redCoolWeight(brandH)
  const mutednessRaw = Math.min(1, (1 - v) / MUTED_BLEND_DENOM)
  // The muted-warm treatment fades out above CREAM_UPPER_H: cream and
  // spine drift are WARM treatments — muted greens/teals/cyans keep the
  // ladder chroma AND their own hue instead of being dragged toward gold.
  const creamGate = 1 - sigmoid((brandH - CREAM_UPPER_H) / CREAM_UPPER_SOFTNESS)
  const uRaw = S * creamGate * mutednessRaw
  // Style lever — band gate evaluated on the RAW position (pre-lift), so
  // the lever can never widen its own gate. style unset/'default' →
  // effect 0 and every expression below is bit-identical to the base math.
  const bandGate = hueIsNoise
    ? 0
    : sigmoid((brandH - DEEPER_BAND_H_LO) / DEEPER_BAND_H_SOFT) *
      (1 - sigmoid((brandH - DEEPER_BAND_H_HI) / DEEPER_BAND_H_SOFT)) *
      sigmoid((uRaw - DEEPER_BAND_U_LO) / DEEPER_BAND_U_SOFT) *
      (1 - sigmoid((uRaw - DEEPER_BAND_U_HI) / DEEPER_BAND_U_SOFT))
  const deeperEffect = opts?.style === 'deeper' ? DEEPER_STRENGTH * bandGate : 0
  // 'deeper': lift effective mutedness toward 1 inside the band — engages
  // the cream/brown register early (papers shed hot yellow, deep stops get
  // fuller gold-spine travel → browner). Render-time style only.
  const mutedness = mutednessRaw + deeperEffect * (1 - mutednessRaw)
  const u = S * creamGate * mutedness
  const gWarm = gauss(hueDelta(brandH, 83), 28)
  const wDrift = S * (gWarm + (1 - gWarm) * mutedness * creamGate)
  const driftCapDeg = 24 + 8 * u
  // Yellow-band chroma boost on the base ladder (gaussian at H 90, σ35) —
  // yellow's gamut is wide where other hues' is narrow. ABOVE the cream
  // edge the boost excess fades with vividness, so a muted yellow-green's
  // papers don't run hotter relative to its own chroma than a vivid
  // brand's (2026-06-11 eye review: "too hot" on low-C yellows). Below
  // the edge muted warms are cream-dominated (u ≈ 1, the ladder barely
  // shows), so the scaling is gated by (1 − creamGate) — this keeps the
  // blessed muted browns and deep reds bit-identical.
  const chromaBoost = hueIsNoise
    ? 1
    : 1 + 1.7 * gauss(hueDelta(brandH, 90), 35) * S * (1 - (1 - creamGate) * (1 - v))

  // Brand saturation: chroma as a fraction of the gamut envelope at the
  // brand's own position — the "cream" endpoint of the muted-warm blend.
  // Deliberately unclamped so signal subtleChromaScale boosts (> 1) still
  // heat the subtle tier; makeStop gamut-clamps the final chroma.
  const brandSat = subtleC / Math.max(1e-6, maxChromaAt(brandL, brandH))

  // Light-stop hue: partial travel along the gold spine's SHAPE (weighted
  // by wDrift, capped, off-path-attenuated) plus the red cool rotation.
  // Render-time only. RELATIVE SPINE (2026-06-11 prototype): drift is the
  // spine delta between the stop's L and the stop-9 pin L (scaleL), so the
  // curve passes through the pin by construction and off-path brands keep
  // their hue identity — see torsionedHue for the full rationale.
  const lightSpineRef = goldSpineHue(scaleL)
  const gOffPath = gauss(hueDelta(brandH, lightSpineRef), SPINE_OFFPATH_SIGMA)
  const lightHueAt = (L: number): number => {
    const drift = 0.55 * (goldSpineHue(L) - lightSpineRef) * wDrift * gOffPath
    return brandH + Math.max(-driftCapDeg, Math.min(driftCapDeg, drift)) - RED_COOL_DEG * wRed
  }

  // Dark-pipeline hue: red-band brands keep the cool character in dark
  // mode — the whole dark ramp generates from the cooled hue. Pure
  // render-time substitution; no decision reads darkH.
  const darkH =
    opts?.coolRedDark && !hueIsNoise && inRedBand(brandH)
      ? brandH - RED_COOL_DEG * redCoolWeight(brandH)
      : brandH

  const darkStops = opts?.darkStops ?? DARK_STOPS
  const light: ColorStop[] = []

  for (let i = 0; i < LIGHT_STOPS.length; i++) {
    const { rootL, satFraction } = LIGHT_STOPS[i]
    // Chroma at a candidate L: vivid brands ride the base ladder (yellow-boosted);
    // muted warm brands blend toward the saturation-preserving cream envelope. Hue
    // follows L along the gold spine.
    const chromaAt = (L: number): number => {
      const cLadder = vSubtle * chromaBoost * LIGHT_BASE_C[i]
      const cEnv = brandSat * satFraction * maxChromaAt(L, lightHueAt(L))
      return cAt('light', L, cLadder + u * (cEnv - cLadder))
    }
    // Perceptual placement (replaces the yellowLift hack): solve the L whose rung
    // reads at its target perceived lightness; re-derive hue + chroma at that L.
    const L = perceptualRungL(rootL, chromaAt(rootL), lightHueAt(rootL))
    light.push(makeStop(i + 1, L, chromaAt(L), lightHueAt(L)))
  }

  const stop2Y = wcagY(light[1].L, light[1].C, light[1].H)

  // Compliance ladder for the light fill (APCA picks the polarity, WCAG
  // bounds the pair): if the APCA pick fails WCAG 4.5, flip polarity when
  // the other side passes BOTH standards (dead-zone brands keep their
  // fill, text goes black); only when neither side passes — error's case —
  // darken the fill to the white-compliant edge.
  // Fill anchored on fillAnchorL: scaleL for every ramp, except an
  // enforceWhiteFill ramp (success) whose green is already darkened to the
  // white edge — so the WCAG check below passes and this block is a no-op for
  // it (white stays, no flip). Byte-identical where fillAnchorL === scaleL.
  // Polarity is resolved at init (onTextIsWhite already flips white→black when
  // white fails WCAG and black complies). Here only the cta's value-darken
  // fallback remains: white survived but still fails WCAG (the "neither" case) ⇒
  // darken the fill to the white-compliant edge (search 4.6 so hex rounding never
  // dips below 4.5). Byte-identical where fillAnchorL === scaleL and white holds.
  let light9L = fillAnchorL
  if (opts?.enforceOnFillContrast && onFillTextIsWhite
      && contrastRatio(1.0, wcagY(fillAnchorL, brandC, brandH)) < 4.5) {
    light9L = findLForContrast(fillAnchorL, brandC, brandH, 1.0, 4.6)
  }
  light.push(makeStop(9, light9L, cAt('light', light9L, brandC), brandH))
  light.push(makeStop(10, hoverL(light9L), cAt('light', hoverL(light9L), brandC), brandH))

  // Stops 11/12 — text stops anchored at their dark roots (0.53 / 0.30,
  // plus the yellow lift), with the AA/AAA ratio against stop 2 as a
  // max-L BOUND (take the darker). The contrast bound, hue (incl. cool
  // drift) and gamut-clamped chroma are interdependent, so the search
  // re-runs after each refinement; `deepen` (rung-1 "opt3") subtracts
  // extra depth and is itself re-bounded.
  const lightTextStop = (stop: number, rootL: number, cMult: number, ratio: number, deepen: number): ColorStop => {
    // Perceptual anchor (replaces yellowLift); the WCAG contrast bound below still
    // takes the darker, so legibility is unchanged.
    const anchorL = perceptualRungL(rootL, clampChromaToGamut(rootL, cMult * brandC, lightHueAt(rootL)), lightHueAt(rootL))
    let H = lightHueAt(anchorL)
    let C = clampChromaToGamut(anchorL, cMult * brandC, H)
    let L = Math.min(anchorL, findMaxLForContrast(C, H, stop2Y, ratio))
    H = lightHueAt(L)
    C = clampChromaToGamut(L, cMult * brandC, H)
    L = Math.min(anchorL, findMaxLForContrast(C, H, stop2Y, ratio))
    L = Math.min(L - deepen, findMaxLForContrast(C, lightHueAt(L - deepen), stop2Y, ratio))
    return makeStop(stop, L, cAt('light', L, cMult * brandC), lightHueAt(L))
  }
  light.push(lightTextStop(11, STOP_11.rootL, STOP_11.chromaMultiplier, STOP_11_CONTRAST, opts?.stop11DeepenL ?? 0))
  light.push(lightTextStop(12, STOP_12.rootL, STOP_12.chromaMultiplier, STOP_12_CONTRAST_FLOOR, opts?.stop12DeepenL ?? 0))

  const dark: ColorStop[] = []

  // Fills keep their identity across modes: dark mode only lifts fills
  // that would vanish on a dark background, never pulls light/vivid ones
  // down, and never reduces fill chroma (collider registers excepted).
  // Computed before stops 1–8: the dark fill L is the relative spine's
  // anchor for the whole dark ramp (the L where the pin holds darkH exact).
  let dark9L = Math.max(scaleL, opts?.darkFillMinL ?? DARK_STOP_9_MIN_L)
  // cta keeps brand identity but trims gently on bloom-prone hues under the curve.
  let darkC9 = opts?.darkChromaCurve && !opts?.loudCta ? brandC * darkCtaTrim(darkH) : brandC
  if (opts?.darkColliderFill === 'muted') {
    dark9L = DARK_COLLIDER_MUTED_L
    darkC9 = brandC * DARK_COLLIDER_MUTED_CHROMA_SCALE
  }

  // Lightness is the blessed DARK_NEUTRAL_L scaffold, emitted DIRECTLY (the old
  // darkRefY blue-referenced luminance solve is retired). Hue torsion still runs
  // — it rotates hue at the fixed L, it never moves L. Chroma rides
  // darkStops[i].chromaMultiplier for now (Phase 3 rebuilds the chroma model; the
  // darkStops rootL column is now vestigial).
  for (let i = 0; i < darkStops.length; i++) {
    const { chromaMultiplier } = darkStops[i]
    const L = DARK_NEUTRAL_L[i]
    const H = torsionedHue(darkH, L, dark9L, gOffPath)
    const C = opts?.darkChromaCurve
      ? opts.darkChromaCurve(L, H, brandC, darkC9) // ctaC = resolved dark cta chroma → surface floor
      : applyChromaFloor(subtleC, chromaMultiplier, i, darkFloorStrength)
    dark.push(makeStop(i + 1, L, cAt('dark', L, C), H))
  }

  dark.push(makeStop(9, dark9L, cAt('dark', dark9L, darkC9), darkH))
  dark.push(makeStop(10, hoverL(dark9L), cAt('dark', hoverL(dark9L), darkC9), darkH))

  const dark11L = DARK_NEUTRAL_L[10]
  const darkH11 = torsionedHue(darkH, dark11L, dark9L, gOffPath)
  const darkC11 = opts?.darkChromaCurve
    ? opts.darkChromaCurve(dark11L, darkH11, brandC)
    : applyChromaFloor(brandC, DARK_STOP_11.chromaMultiplier, 10, darkFloorStrength)
  dark.push(makeStop(11, dark11L, cAt('dark', dark11L, darkC11), darkH11))

  const dark12L = DARK_NEUTRAL_L[11]
  const darkH12 = torsionedHue(darkH, dark12L, dark9L, gOffPath)
  const darkC12 = opts?.darkChromaCurve
    ? opts.darkChromaCurve(dark12L, darkH12, brandC)
    : applyChromaFloor(brandC, DARK_STOP_12.chromaMultiplier, 11, darkFloorStrength)
  dark.push(makeStop(12, dark12L, cAt('dark', dark12L, darkC12), darkH12))

  // Dark on-fill is black-first — white only when black is genuinely
  // too weak on the fill.
  const dark9ApcaY0 = apcaY(dark[8].r, dark[8].g, dark[8].b)
  const onFillTextIsWhiteDark = onTextIsWhite(dark9ApcaY0, dark[8].L, dark[8].C, dark[8].H, !!opts?.enforceOnFillContrast)

  // WCAG bound on the dark fill: same rule as light. Deliberately allowed
  // to undercut the dark lift floor — a 0.55 vivid fill doesn't vanish on
  // a dark background the way a 0.2 one does.
  if (opts?.enforceOnFillContrast && onFillTextIsWhiteDark) {
    if (contrastRatio(1.0, wcagY(dark[8].L, dark[8].C, dark[8].H)) < 4.5) {
      // search to 4.6 — hex rounding must never land below 4.5.
      const compliantL = findLForContrast(dark[8].L, dark[8].C, darkH, 1.0, 4.6)
      dark[8] = makeStop(9, compliantL, cAt('dark', compliantL, darkC9), darkH)
      dark[9] = makeStop(10, hoverL(compliantL), cAt('dark', hoverL(compliantL), darkC9), darkH)
    }
  }

  // ── Stage 2: brand/secondary highlight-13/14 (append-only ladder rung) ──────
  // The surface scale's emphasis fill, pulled out of cta. Generated by the SAME
  // loop math as stops 1–8 (lightHueAt + the cream/envelope chroma blend),
  // extended two rungs below accent-8 — NOT a bespoke path. The highlight is a
  // predictable DERIVED value (the vivid color lives in the cta); its value
  // falls out of the curve with NO white/black forcing, and on-highlight is
  // COMPUTED from that value's luminance below — exactly like on-cta. If a
  // family's polarity lands wrong, move the rung via the curve, never force the
  // text. hover twin = hoverL. Dark mirrors the same construction in the dark hue.
  let onHighlightIsWhite: boolean | undefined
  let onHighlightIsWhiteDark: boolean | undefined
  if (opts?.highlight) {
    const hlLadderC = vSubtle * chromaBoost * HIGHLIGHT_LIGHT.baseC
    // Gamut-clamped at source so the rung reasons about the ACTUAL rendered
    // chroma (vivid warms like Chai blow past the gamut here).
    const lightHlC = (l: number, hh: number) =>
      clampChromaToGamut(l, cAt('light', l, hlLadderC + u * (brandSat * HIGHLIGHT_LIGHT.satFraction * maxChromaAt(l, hh) - hlLadderC)), hh)
    // A highlight rung: hue + chroma from the ladder math at L.
    const rung = (
      stop: number, Lt: number,
      hueAt: (l: number) => number, chromaAt: (l: number, h: number) => number,
    ): ColorStop => makeStop(stop, Lt, chromaAt(Lt, hueAt(Lt)), hueAt(Lt))

    // Legibility bound — a VALUE move, never a forced text. Place the rung, read
    // its COMPUTED on-text polarity (shared `ons` rule), and if that side fails
    // WCAG 4.5 move L toward it (darken for white / lighten for black) until it
    // clears. Mirrors the cta's enforceOnFillContrast: on-highlight then falls out
    // of a legible value (resolves the C25 dead-zone where the rung sat at an L
    // that left white text sub-4.5).
    const placeLegibleRung = (
      stop: number, L0: number,
      hueAt: (l: number) => number, chromaAt: (l: number, h: number) => number,
    ): { s: ColorStop; white: boolean } => {
      const at = (L: number) => rung(stop, L, hueAt, chromaAt)
      let s = at(L0)
      let white = onTextIsWhite(apcaY(s.r, s.g, s.b), s.L, s.C, s.H, !!opts?.enforceOnFillContrast)
      const passes = (st: ColorStop, w: boolean) =>
        w ? contrastRatio(1.0, wcagY(st.L, st.C, st.H)) >= 4.6
          : contrastRatio(wcagY(st.L, st.C, st.H), 0) >= 4.6
      if (!opts?.enforceOnFillContrast || passes(s, white)) return { s, white }
      // white clears as the fill darkens; black clears as it lightens.
      let lo = white ? 0.2 : s.L
      let hi = white ? s.L : 0.95
      for (let i = 0; i < 24; i++) {
        const mid = (lo + hi) / 2
        const ok = passes(at(mid), white)
        white ? (ok ? (lo = mid) : (hi = mid)) : (ok ? (hi = mid) : (lo = mid))
      }
      s = at(white ? lo : hi)
      white = onTextIsWhite(apcaY(s.r, s.g, s.b), s.L, s.C, s.H, true)
      return { s, white }
    }

    // Light: ladder-rung placed perceptually (same curve as stops 1–8), then
    // bound to a legible value.
    const hl = placeLegibleRung(13, perceptualRungL(HIGHLIGHT_LIGHT.rootL, lightHlC(HIGHLIGHT_LIGHT.rootL, lightHueAt(HIGHLIGHT_LIGHT.rootL)), lightHueAt(HIGHLIGHT_LIGHT.rootL)), lightHueAt, lightHlC)
    const hl9 = hl.s
    const hl10 = rung(14, hoverL(hl9.L), lightHueAt, lightHlC)
    light.push(hl9, hl10)
    onHighlightIsWhite = hl.white

    // Dark: the SAME construction in the dark hue (chroma from the shared dark
    // curve), also bound to a legible value.
    const darkHueAt = (l: number) => torsionedHue(darkH, l, dark9L, gOffPath)
    const darkHlC = (l: number, h: number) =>
      opts?.darkChromaCurve
        ? clampChromaToGamut(l, opts.darkChromaCurve(l, h, brandC), h)
        : clampChromaToGamut(l, hlLadderC + u * (brandSat * HIGHLIGHT_LIGHT.satFraction * maxChromaAt(l, h) - hlLadderC), h)
    const dhl = placeLegibleRung(13, HIGHLIGHT_DARK.rootL, darkHueAt, darkHlC)
    const dhl9 = dhl.s
    const dhl10 = rung(14, hoverL(dhl9.L), darkHueAt, darkHlC)
    dark.push(dhl9, dhl10)
    onHighlightIsWhiteDark = dhl.white
  }

  return {
    name: scaleName, archetype, brandL, brandC, brandH, lFlip, lFillMax,
    onFillTextIsWhite, onFillTextIsWhiteDark, light, dark,
    onHighlightIsWhite, onHighlightIsWhiteDark,
    identityHex: hex.toUpperCase(),
  }
}

// Render-time cool rotation of the light fill (stops 9/10) for warm reds —
// the brand yields away from error's vermillion without losing depth or
// chroma. MUST run as the LAST light-mode step (resolveBrand calls it after
// every decision is locked): the rotation never feeds collision gates, the
// inRedBand watershed, or on-fill polarity. L and the already-clamped C are
// kept; C only re-clamps at the cooled hue. Stop 10 stays the hover twin of
// the cooled 9. Rung-1 scales are exempt (their dark anchor already
// separates them) — the caller gates on that. When the cooled fill would
// fail WCAG 4.5 for the (raw-decided) white on-fill text, the fill deepens
// to the compliant edge — legality is judged on the FINAL cooled color.
export function applyRedCoolRender(scale: GeneratedScale, enforceOnFillContrast: boolean): void {
  if (scale.brandC < HUE_NOISE_C) return // hue is noise — never rotate it
  const wRed = redCoolWeight(scale.brandH)
  if (wRed <= 1e-9) return
  const H = scale.brandH - RED_COOL_DEG * wRed
  for (const i of [8, 9]) {
    const s = scale.light[i]
    scale.light[i] = makeStop(s.stop, s.L, s.C, H)
  }
  if (enforceOnFillContrast && scale.onFillTextIsWhite) {
    const s9 = scale.light[8]
    if (contrastRatio(1.0, wcagY(s9.L, s9.C, s9.H)) < 4.5) {
      // search to 4.6 — hex rounding must never land below 4.5
      const L = findLForContrast(s9.L, scale.brandC, H, 1.0, 4.6)
      scale.light[8] = makeStop(9, L, scale.brandC, H)
      scale.light[9] = makeStop(10, hoverL(L), scale.brandC, H)
    }
  }
}

// Illustration ramp: FOUR fixed-L slots — every slot derives at its
// target L; the brand-pin-at-
// nearest-rung behavior was cut with the pin's brandRung field. Slots are
// luminance-equalized like UI stops; the relative warm-path hue shift
// applies, anchored at brandL so the curve stays brand-true; NO darkening
// of any kind. Illustrations IGNORE UX rules: brandL/C/H read here are the
// RAW hex values (collision machinery never rewrites them), so a colliding
// bright red stands as-is. Same values both modes.
export interface IllustrationScale {
  stops: ColorStop[]
}

export function generateIllustrationScale(scale: GeneratedScale): IllustrationScale {
  const { brandL, brandC, brandH } = scale
  const stops = ILLUS_STOPS.map((spec, i) => {
    const C = brandC * spec.chromaMultiplier
    const refY = wcagY(spec.rootL, C, REFERENCE_H)
    let L = findLForY(refY, C, brandH)
    // off-path attenuation is a brand property, same definition as the UI
    // ramps; anchor at brandL keeps the hue curve brand-true
    const gOffPath = gauss(hueDelta(brandH, goldSpineHue(brandL)), SPINE_OFFPATH_SIGMA)
    const H = torsionedHue(brandH, L, brandL, gOffPath)
    if (H !== brandH) L = findLForY(refY, C, H)
    return makeStop(i + 1, L, C, H)
  })
  return { stops }
}

// Neutral scale: a REUSE of generateScale, not a bespoke ramp. A faint gray at
// the brand hue feeds the 'light' archetype, and neutralChromaCurve overrides
// every rendered chroma by lightness — so the only thing differing from a brand
// ramp is the chroma profile (a quiet Radix-derived tint, not the brand's vivid
// ladder). Emits BRAND-KIND: stop 9 is the near-white cta button, the rung
// (13/14) is the highlight. Levels: pure (C=0) / default (Radix-measured) /
// branded (amplified). The grayHex carries only the hue — its C0.006 sits below
// HUE_NOISE_C so every lightness-domain decision stays achromatic; the curve
// drives all chroma. Owner-approved output:
// docs/engine-spec/approved-neutrals-reference.md (the verification target).
export function generateNeutralScale(
  brandH: number,
  level: NeutralLevel = 'default',
): GeneratedScale {
  const h = ((brandH % 360) + 360) % 360
  const { r, g, b } = oklchToSrgbUnclamped(0.5, 0.006, h)
  const ch = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')
  const grayHex = `#${ch(r)}${ch(g)}${ch(b)}`
  return generateScale(grayHex, 'neutral', 'light', {
    chromaCurve: neutralChromaCurve(brandH, level),
    highlight: true,
    enforceOnFillContrast: true,
  })
}
