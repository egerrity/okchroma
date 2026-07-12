// producers.ts — the NAMED PRODUCER implementations of the okchroma resolver (resolver id okchroma-reqtoken@2).
// The aesthetic state (chromaBoost, mutedness, cream gate, warm drift, red cool) is the house style OF this
// resolver, not portable spec data. These expressions were ported verbatim from the pre-resolver generateScale
// and proven byte-identical at cutover (commit c7542b7); the blessed snapshots are the standing gate — do not
// "simplify" an expression here without eye-check + re-bless.
import { classifyArchetype, medianLForArchetype, type Archetype } from '../engine/archetypes'
import { clampChromaToGamut, wcagY, contrastRatio, legalRatio, findMaxLForContrast, findLForContrast, findLForContrastUp, apcaY, apcaLc, encodedChannels } from '../engine/constraints'
import { perceptualRungL, apparentL, grayApparentL, solveLForApparent } from '../engine/perceptualL'
import {
  hexToOklch, maxChromaAt, goldSpineHue, torsionedHue, gauss, sigmoid, hueDelta, oklabDist, redGateDist, RED_GATE,
  RED_SOLVE, redSolveDist, inBrickBand,
  SPINE_OFFPATH_SIGMA, RED_TORSION_CENTER_H, RED_TORSION_SOFTNESS, VIVID_C, HUE_NOISE_C, MUTED_BLEND_DENOM,
  LIGHT_DRIFT_COOL_HI, LIGHT_DRIFT_COOL_RANGE, VIVID_LIFT_BLEND, VIVID_LIFT_L_LO, VIVID_LIFT_L_RANGE,
  CREAM_UPPER_H, CREAM_UPPER_SOFTNESS,
  DEEPER_BAND_H_LO, DEEPER_BAND_H_HI, DEEPER_BAND_H_SOFT, DEEPER_BAND_U_LO, DEEPER_BAND_U_HI, DEEPER_BAND_U_SOFT,
  DEEPER_STRENGTH, redRepelShiftDeg, RED_BAND_LO_H, applyChromaFloor,
  DARK_FLOOR_FULL_C, DARK_FLOOR_MUTED_MAX_C, onTextIsWhite,
} from '../engine/colorMath'
import { p2Diff, P2_D, P2_D_UP } from '../engine/p2'
import { DARK_STOP_9_MIN_L } from '../engine/stopTable'
import { darkCtaTrim } from '../engine/darkChromaCurve'
import type { GenerateOptions } from '../engine/colorEngine'   // type-only: erased at runtime, no cycle

export type ResolveOpts = GenerateOptions & { forcedArchetype?: Archetype }

// ---- the per-seed producer context: generateScale phases 1–2, verbatim (colorEngine.ts:255–315) ----
export function buildContext(hex: string, opts?: ResolveOpts) {
  const forcedArchetype = opts?.forcedArchetype
  const { L: brandL, C: rawC, H: rawH } = hexToOklch(hex)
  const brandH = (rawH + (opts?.hueShiftDeg ?? 0) + 360) % 360
  const brandC = rawC * (opts?.chromaScale ?? 1)

  const subtleC = brandC * (opts?.subtleChromaScale ?? 1)

  const cAt = (mode: 'light' | 'dark', L: number, nativeC: number): number =>
    (opts?.chromaCurve ? opts.chromaCurve(L, mode) : nativeC) * (opts?.heat ?? 1)
  const archetype = forcedArchetype ?? classifyArchetype(brandL)
  const scaleL = forcedArchetype ? medianLForArchetype(forcedArchetype) : brandL

  const darkFloorStrength =
    brandC >= DARK_FLOOR_MUTED_MAX_C
      ? 0
      : Math.min(1, Math.max(0, (brandC - HUE_NOISE_C) / (DARK_FLOOR_FULL_C - HUE_NOISE_C)))

  const hueIsNoise = brandC < HUE_NOISE_C
  const v = Math.min(1, brandC / VIVID_C)
  const vSubtle = Math.min(1, subtleC / VIVID_C)
  const S = hueIsNoise ? 0 : sigmoid(hueDelta(brandH, RED_TORSION_CENTER_H) / RED_TORSION_SOFTNESS)
  const redShift = hueIsNoise || opts?.suppressRedCool ? 0 : redRepelShiftDeg(brandH)
  const mutednessRaw = Math.min(1, (1 - v) / MUTED_BLEND_DENOM)

  const creamGate = 1 - sigmoid((brandH - CREAM_UPPER_H) / CREAM_UPPER_SOFTNESS)
  const uRaw = S * creamGate * mutednessRaw

  const bandGate = hueIsNoise
    ? 0
    : sigmoid((brandH - DEEPER_BAND_H_LO) / DEEPER_BAND_H_SOFT) *
      (1 - sigmoid((brandH - DEEPER_BAND_H_HI) / DEEPER_BAND_H_SOFT)) *
      sigmoid((uRaw - DEEPER_BAND_U_LO) / DEEPER_BAND_U_SOFT) *
      (1 - sigmoid((uRaw - DEEPER_BAND_U_HI) / DEEPER_BAND_U_SOFT))
  const deeperEffect = opts?.style === 'deeper' ? DEEPER_STRENGTH * bandGate : 0

  const mutedness = mutednessRaw + deeperEffect * (1 - mutednessRaw)
  const u = S * creamGate * mutedness
  const gWarm = gauss(hueDelta(brandH, 83), 28)
  // the cool edge (LIGHT_DRIFT_COOL_*): drift weight fades H88→H104, zero past it —
  // light's warm-spine drift is hue-banded like dark's torsion curve (CATALOG C8)
  const wDrift = S * (gWarm + (1 - gWarm) * mutedness * creamGate) * (1 - Math.min(1, Math.max(0, (brandH - LIGHT_DRIFT_COOL_HI) / LIGHT_DRIFT_COOL_RANGE)))
  const driftCapDeg = 24 + 8 * u

  // The gold-band chroma lift (day-one eyeballed H-K correction) is SIGNAL-only
  // (owner 2026-07-07, CATALOG C7): brands ride their own identity chroma — the fine-tune
  // (ID-relative ramp, amplitude) is parked behind the P3 gamut work, where the sRGB
  // ceiling stops truncating the amplitude. Signals keep the lift — it IS their shine.
  const chromaBoost = hueIsNoise || !opts?.goldBoost
    ? 1
    : 1 + 1.7 * gauss(hueDelta(brandH, 90), 35) * S * (1 - (1 - creamGate) * (1 - v))

  const brandSat = subtleC / Math.max(1e-6, maxChromaAt(brandL, brandH))

  // the LIGHT envelope blend weight (C8 V3 + the owner's brightness correction,
  // 2026-07-09): the muted path (u) OR the vivid-ID lift, whichever is stronger.
  // Identity expresses through the room-relative envelope — the ROOM does the hue
  // weighting (no gaussian, no hue table); the lift is one rule, ID-scaled by
  // vividness × brightness. Signals are exempt (goldBoost carries their own lift —
  // one lift per scale, never both). Dark blends keep u: the dark ID-relative
  // counterpart is the parked dark round's design.
  const envW = opts?.goldBoost
    ? u
    : Math.max(u, VIVID_LIFT_BLEND * Math.min(1, brandC / VIVID_C) * Math.min(1, Math.max(0, (brandL - VIVID_LIFT_L_LO) / VIVID_LIFT_L_RANGE)))

  const lightSpineRef = goldSpineHue(scaleL)
  const gOffPath = gauss(hueDelta(brandH, lightSpineRef), SPINE_OFFPATH_SIGMA)
  // the REAL light hue producer ('warm-drift'): inline spine drift with a dynamic cap (24+8u) PLUS the
  // signed red repel — NOT torsionedHue (that is the dark producer). Was colorEngine.ts:307–310 with a
  // fixed-direction cool; the repel is direction-aware (CATALOG C6).
  const lightHueAt = (L: number): number => {
    const drift = 0.55 * (goldSpineHue(L) - lightSpineRef) * wDrift * gOffPath
    return brandH + Math.max(-driftCapDeg, Math.min(driftCapDeg, drift)) + redShift
  }

  // dark keeps its shipped lower fence (light applies the weight's own taper below H12;
  // dark never shifted there) — the upper fence is gone by design: the warm exit tapers.
  const darkH =
    opts?.coolRedDark && !hueIsNoise && brandH > RED_BAND_LO_H
      ? brandH + redRepelShiftDeg(brandH)
      : brandH
  // C12 v8 (owner ruling 2026-07-10 + research): the dark CTA does NOT ride the coolRedDark
  // shift — cta red de-collision is C12's alone, and the identity-hue dark cta never fires
  // the gate (0/1206 measured, the .70 prominence floor is structural). Ramp/ink/paper
  // riders keep darkH — the wash protection lives in the light redShift via the delta model.
  const darkCtaH = brandH

  return {
    hex, opts, brandL, brandC, brandH, subtleC, cAt, archetype, scaleL,
    darkFloorStrength, hueIsNoise, v, vSubtle, u, envW, chromaBoost, brandSat,
    lightHueAt, darkH, darkCtaH, gOffPath, redShift,
  }
}
export type Ctx = ReturnType<typeof buildContext>

// ---- light scale chroma (stops 1–8: paper/wash/highlight-8): ladder/envelope blend, cAt-wrapped (colorEngine.ts:322–326).
// NOTE: unclamped by design — the perceptual solve sees the raw blend; makeStop clamps at emit.
export const lightScaleChromaAt = (ctx: Ctx, baseC: number, satFraction: number) => (L: number): number => {
  const cLadder = ctx.vSubtle * ctx.chromaBoost * baseC
  const cEnv = ctx.brandSat * satFraction * maxChromaAt(L, ctx.lightHueAt(L))
  return ctx.cAt('light', L, cLadder + ctx.envW * (cEnv - cLadder))
}

// ---- light highlight chroma (stop 9): same blend but gamut-CLAMPED before the solve (colorEngine.ts:441–442)
export const lightHighlightChromaAt = (ctx: Ctx, baseC: number, satFraction: number) => (L: number, hh: number): number => {
  const hlLadderC = ctx.vSubtle * ctx.chromaBoost * baseC
  return clampChromaToGamut(L, ctx.cAt('light', L, hlLadderC + ctx.envW * (ctx.brandSat * satFraction * maxChromaAt(L, hh) - hlLadderC)), hh)
}

// ---- APCA metric primitives (the 'apca' contrast profile). apcaYAt mirrors wcagY's treatment of
// out-of-gamut chroma (apcaY channel-clamps, wcagY zero-floors); findMaxLForApcaLc is the exact
// findMaxLForContrast bisection shape with |Lc| as the predicate. Monotone for the same reason the WCAG
// bisection is: against a near-white (light) or near-black (dark) paper-2, the reverse-polarity side of
// the curve can never reach a passing |Lc|, so the passing set is a single downward (light) interval.
export function apcaYAt(L: number, C: number, H: number): number {
  // D2: channels AND coefficients in the master (P3) basis — encodedChannels pairs them;
  // a mixed basis (sRGB channels under P3 weights) is neither gamut's Lc.
  const [r, g, b] = encodedChannels(L, C, H)
  return apcaY(r, g, b)
}
// The solve measures in EMIT space — chroma gamut-clamped per candidate L — because Lc is polarity- and
// luminance-exact: near yellow the raw ladder chroma is far out of gamut and the emit trim costs > 1 Lc,
// blowing past any reasonable margin (the wcag solver tolerates this because wcagY zero-floors channels
// and the ratio is less sensitive there; measured, not assumed).
export function findMaxLForApcaLc(C: number, H: number, bgApcaY: number, targetLc: number): number {
  let lo = 0.005, hi = 0.999
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2
    Math.abs(apcaLc(apcaYAt(mid, clampChromaToGamut(mid, C, H), H), bgApcaY)) >= targetLc ? (lo = mid) : (hi = mid)
  }
  return lo
}
// solve margins/tolerances in Lc, scaled from the WCAG idiom (+0.05 ratio ≈ +0.5 Lc at the 3:1↔45 slope):
// the margin lets the gamut-trimmed emit still clear; the tolerance keys the verify + the dark floor.
export const APCA_SOLVE_MARGIN_LC = 0.5
export const APCA_TOL_LC = 0.05

// ---- light scale placement (stops 1–8): perceptual rung; a declared contrast require clamps it down to a
// fixed point vs the resolved paper-2 (colorEngine.ts:328–349 — stop 8's 3:1, spec-driven here). The solve
// is metric-blind: `maxLFor` is the resolver-built closure (findMaxLForContrast for wcag — margin included,
// so the wcag floats are unchanged — or findMaxLForApcaLc for the apca profile). Returns L,C,H at emit
// (caller gamut-clamps).
export function placeLightScale(
  ctx: Ctx, rootL: number, chromaAt: (L: number) => number, maxLFor: ((C: number, H: number) => number) | undefined,
): { L: number; C: number; H: number } {
  let L = perceptualRungL(rootL, chromaAt(rootL), ctx.lightHueAt(rootL))
  if (maxLFor !== undefined) {
    for (let pass = 0; pass < 6; pass++) {
      const next = Math.min(L, maxLFor(chromaAt(L), ctx.lightHueAt(L)))
      if (Math.abs(next - L) < 1e-4) { L = next; break }
      L = next
    }
  }
  return { L, C: chromaAt(L), H: ctx.lightHueAt(L) }
}

// ---- min-separation clamp (light): earn the stop's OKLab ΔE (the house stopDeltaE metric) off the resolved
// reference stop CHROMA-FIRST — spend the budget on chroma up to the brand's own saturation envelope
// (brandSat·maxChroma, identity-safe: a neutral brand's ceiling ≈ 0 so it falls back to pure-L), darkening L
// only for the residual the near-white gamut can't supply. A floor: an already-separated placement doesn't
// move. Hue/chroma track L; downstream contrast requires re-solve automatically because they reference the
// RESOLVED stop (never a cached Y).
export function separationClampLight(
  ctx: Ctx, placed: { L: number; C: number; H: number }, chromaAt: (L: number) => number,
  ref: { L: number; C: number; H: number }, target: number,
): { L: number; C: number; H: number } {
  const rad = (h: number) => (h * Math.PI) / 180
  const refA = ref.C * Math.cos(rad(ref.H)), refB = ref.C * Math.sin(rad(ref.H))
  // ΔE at an arbitrary (L, chroma) — chroma gamut-clamped, matching the emit metric (resolve.ts verify)
  const dEat = (L: number, C: number): number => {
    const H = ctx.lightHueAt(L)
    const gC = clampChromaToGamut(L, C, H)
    const a = gC * Math.cos(rad(H)), b = gC * Math.sin(rad(H))
    return Math.sqrt((L - ref.L) ** 2 + (a - refA) ** 2 + (b - refB) ** 2)
  }
  if (dEat(placed.L, chromaAt(placed.L)) >= target) return placed
  const margin = target + 5e-4          // solve a hair past so the gamut-trimmed emit still clears

  // the chroma ceiling: the brand's own saturation envelope, never below the curve chroma (chroma can only
  // EARN distinctness, never lose it). A neutral brand's brandSat ≈ 0 → ceiling ≈ the curve chroma → the
  // residual falls to L, exactly as a pure-L clamp would. Dropping L raises the ceiling too.
  const ceilingAt = (L: number): number => {
    const H = ctx.lightHueAt(L)
    return clampChromaToGamut(L, Math.max(chromaAt(L), ctx.brandSat * maxChromaAt(L, H)), H)
  }
  // (1) natural L, chroma raised to the ceiling — enough? spend only the chroma the target needs.
  if (dEat(placed.L, ceilingAt(placed.L)) >= margin) {
    let loC = chromaAt(placed.L), hiC = ceilingAt(placed.L)
    for (let i = 0; i < 30; i++) { const m = (loC + hiC) / 2; dEat(placed.L, m) >= margin ? (hiC = m) : (loC = m) }
    return { L: placed.L, C: hiC, H: ctx.lightHueAt(placed.L) }
  }
  // (2) even the ceiling at natural L falls short → darken L (raises the ceiling too), chroma pinned at it.
  let fail = placed.L, pass = placed.L - 0.12
  const clearsCeil = (L: number) => dEat(L, ceilingAt(L)) >= margin
  for (let guard = 0; guard < 4 && !clearsCeil(pass); guard++) pass -= 0.12
  for (let i = 0; i < 30; i++) { const m = (fail + pass) / 2; clearsCeil(m) ? (pass = m) : (fail = m) }
  return { L: pass, C: ceilingAt(pass), H: ctx.lightHueAt(pass) }
}

// ---- light text stops 10/11: the EXACT 3-call Math.min sequence incl. the deepen re-solve
// (colorEngine.ts:363–374). The anchor solve uses raw gamut-clamped chroma; the emit chroma is cAt-wrapped.
// `maxLFor` = the resolver-built metric closure (wcag: findMaxLForContrast at the raw ratio, no margin —
// float-identical to the old inline calls; apca: findMaxLForApcaLc at the raw targetLc).
export function placeLightText(
  ctx: Ctx, rootL: number, cMult: number, maxLFor: (C: number, H: number) => number, deepen: number,
  maxC = Infinity,
): { L: number; C: number; H: number } {
  // ink chroma NORMALIZED to the text register (C9/C11): the ID-relative multiplier is
  // ceiled at the declared band register, and the H-K anchor solve consumes the
  // normalized value — the solve target stops moving with the seed's chroma.
  const inkC = Math.min(cMult * ctx.brandC, maxC)
  const anchorL = perceptualRungL(rootL, clampChromaToGamut(rootL, inkC, ctx.lightHueAt(rootL)), ctx.lightHueAt(rootL))
  let H = ctx.lightHueAt(anchorL)
  let C = clampChromaToGamut(anchorL, inkC, H)
  let L = Math.min(anchorL, maxLFor(C, H))
  H = ctx.lightHueAt(L)
  C = clampChromaToGamut(L, inkC, H)
  L = Math.min(anchorL, maxLFor(C, H))
  L = Math.min(L - deepen, maxLFor(C, ctx.lightHueAt(L - deepen)))
  return { L, C: ctx.cAt('light', L, inkC), H: ctx.lightHueAt(L) }
}

// ---- light highlight placement (stop 9): perceptual on the clamped highlight chroma (colorEngine.ts:462–465)
export function placeLightHighlight(ctx: Ctx, rootL: number, chromaAt: (L: number, hh: number) => number): { L: number; C: number; H: number } {
  const L = perceptualRungL(rootL, chromaAt(rootL, ctx.lightHueAt(rootL)), ctx.lightHueAt(rootL))
  return { L, C: chromaAt(L, ctx.lightHueAt(L)), H: ctx.lightHueAt(L) }
}

// ---- on-fill (light), PRE-enforcement: judged at fill9 = the brand fill at scaleL (colorEngine.ts:271–273).
// `enforce` resolves at the call site: caller opts override the spec's declared default.
export function onFillIsWhiteLight(ctx: Ctx, enforce: boolean): boolean {
  const fill9ApcaY = apcaYAt(ctx.scaleL, clampChromaToGamut(ctx.scaleL, ctx.cAt('light', ctx.scaleL, ctx.brandC), ctx.brandH), ctx.brandH)
  return onTextIsWhite(fill9ApcaY, ctx.scaleL, ctx.brandC, ctx.brandH, enforce)
}

// ---- on-highlight: judged at the emitted highlight-9 stop — perceptual preference, with the
// declared conformance floor (spec.ons.onHighlight.ratioFloor: 4.5 under wcag, stripped under apca)
export function onHighlightIsWhiteAt(L: number, C: number, H: number, ratioFloor?: number): boolean {
  return onTextIsWhite(apcaYAt(L, C, H), L, C, H, false, ratioFloor)
}

// ================= DARK producers (colorEngine.ts:378–434, 469–481, verbatim) =================

// the dark role/hue context: the cta anchor resolves FIRST because the dark torsion anchors at it
// (colorEngine.ts:380–386, 395). NOTE: gOffPath is the LIGHT spine-ref gaussian, reused verbatim.
// `specFloorL` = the declared role floor (spec data); caller opts (darkFillMinL) override it.
export function buildDarkContext(ctx: Ctx, specFloorL: number = DARK_STOP_9_MIN_L) {
  const opts = ctx.opts
  const dark9L = Math.max(ctx.scaleL, opts?.darkFillMinL ?? specFloorL)
  const darkC9 = opts?.darkChromaCurve && !opts?.loudCta ? ctx.brandC * darkCtaTrim(ctx.darkH) : ctx.brandC
  const darkHueAtL = (L: number) => torsionedHue(ctx.darkH, L, dark9L, ctx.gOffPath)
  return { dark9L, darkC9, darkHueAtL }
}
export type DarkCtx = ReturnType<typeof buildDarkContext>

// dark scale chroma (stops 1–8): darkChromaCurve callback or the chroma floor over subtleC (colorEngine.ts:404–406)
export const darkScaleChromaAt = (ctx: Ctx, dctx: DarkCtx, stopIndex: number, multiplier: number) => (L: number): number =>
  ctx.cAt('dark', L, ctx.opts?.darkChromaCurve
    ? ctx.opts.darkChromaCurve(L, dctx.darkHueAtL(L), ctx.brandC, dctx.darkC9)
    : applyChromaFloor(ctx.subtleC, multiplier, stopIndex, ctx.darkFloorStrength))

// dark ink chroma (stops 10/11): the TEXT-TIER EXEMPTION (C9). The H-K fill policy
// (perceptualDarkC via opts.darkChromaCurve) is a FILL equalizer — at ink lightness it
// pumps maximum chroma into the lowest-H-K hues (the yellow-green neon). The text tier
// keeps its native ID-relative chroma (the DARK_STOP_11/12 multipliers live again),
// normalized to the declared text register — perceptualDarkC's documented band limit,
// realized at the consumer.
export const darkInkChromaAt = (ctx: Ctx, dctx: DarkCtx, stopIndex: number, multiplier: number, maxC = Infinity) => (L: number): number =>
  ctx.cAt('dark', L, Math.min(applyChromaFloor(ctx.brandC, multiplier, stopIndex, ctx.darkFloorStrength), maxC))

// dark highlight chroma (stop 9): curve override or the light blend through cAt('dark'), clamped (colorEngine.ts:469–472)
export const darkHighlightChromaAt = (ctx: Ctx, dctx: DarkCtx, baseC: number, satFraction: number) => (L: number, h: number): number => {
  if (ctx.opts?.darkChromaCurve) return clampChromaToGamut(L, ctx.opts.darkChromaCurve(L, h, ctx.brandC), h)
  const hlLadderC = ctx.vSubtle * ctx.chromaBoost * baseC
  return clampChromaToGamut(L, ctx.cAt('dark', L, hlLadderC + ctx.u * (ctx.brandSat * satFraction * maxChromaAt(L, h) - hlLadderC)), h)
}

// dark perceptual placement (stops 1–7, 10/11): placeDarkStop verbatim (colorEngine.ts:396–399).
// `lift` = the 'perceptual-lift' producer: the H-K solve may raise a hue above its scaffold (low-boost
// hues like yellow) but never place it BELOW (high-boost hues — blue/violet — otherwise sink under the
// near-black neutral surfaces they render on: the blue-recede failure). "Dark fills lift, never sink,"
// extended from the cta floor to the scale.
export function placeDark(dctx: DarkCtx, rootL: number, chromaAt: (L: number) => number, lift = false): { L: number; C: number; H: number } {
  let L = perceptualRungL(rootL, chromaAt(rootL), dctx.darkHueAtL(rootL))
  if (lift) L = Math.max(L, rootL)
  return { L, C: chromaAt(L), H: dctx.darkHueAtL(L) }
}

// ===== DELTA-KEYED dark placement (the dark model, owner 2026-07-09) =====
// Dark is a LIVE FUNCTION OF LIGHT: a light color sitting an APPARENT-lightness distance below the light
// ground (white) becomes a dark color sitting the SAME apparent distance above the dark ground (~0.178, the
// neutral dark page — NOT pure black). C/H carry from light; only lightness re-references. APPARENT (H-K)
// space, not raw luminance (v2): light's stops are themselves placed in apparent-lightness (perceptualRungL),
// so re-referencing raw luminance warped light's cadence into dark — the measured wobble (4.10 → 3.58
// |Δ²appL|) — and stripped yellow's H-K shine. Solved by the engine's apparent solver (gamut-aware),
// clamped to the ground so nothing sinks below the page.
const DELTA_DARK_GROUND_APP = grayApparentL(0.178)        // the dark page's apparent lightness
const DELTA_LIGHT_GROUND_APP = grayApparentL(1.0)         // white's (≈ 100)
export function deltaDarkTargetL(
  lightColor: { L: number; C: number; H: number }, C: number, H: number,
): number {
  const lightApp = apparentL(lightColor.L, clampChromaToGamut(lightColor.L, lightColor.C, lightColor.H), lightColor.H)
  const target = Math.min(DELTA_LIGHT_GROUND_APP - 0.5,
    Math.max(DELTA_DARK_GROUND_APP + 0.5, DELTA_DARK_GROUND_APP + (DELTA_LIGHT_GROUND_APP - lightApp)))
  return solveLForApparent(target, C, H)
}
export function placeDarkDelta(
  dctx: DarkCtx, rootL: number, chromaAt: (L: number) => number,
  lightStop: { L: number; C: number; H: number },
): { L: number; C: number; H: number } {
  const H0 = dctx.darkHueAtL(rootL)
  const C0 = chromaAt(rootL)
  const L = deltaDarkTargetL(lightStop, C0, H0)
  return { L, C: chromaAt(L), H: dctx.darkHueAtL(L) }
}

// ================= CTA roles (light :354–361, dark :413–433) =================

// light cta anchor incl. the enforce re-solve (feeds from the PRE-enforcement on-fill boolean; 4.6-for-4.5 margin)
export function ctaLightL(ctx: Ctx, onFillTextIsWhite: boolean, enforce: boolean): number {
  let light9L = ctx.scaleL
  if (enforce && onFillTextIsWhite
      && legalRatio(ctx.scaleL, ctx.brandC, ctx.brandH, 1.0) < 4.5) {
    light9L = findLForContrast(ctx.scaleL, ctx.brandC, ctx.brandH, 1.0, 4.6)
  }
  return light9L
}

// dark cta enforce re-solve: judged at the emitted base ctaDark; only a WHITE on-fill triggers it (:427–433)
export function ctaDarkEnforcedL(ctx: Ctx, base: { L: number; C: number; H: number }, onFillIsWhiteDark: boolean, enforce: boolean): number | null {
  if (!(enforce && onFillIsWhiteDark)) return null
  if (legalRatio(base.L, base.C, base.H, 1.0) >= 4.5) return null
  return findLForContrast(base.L, base.C, ctx.darkCtaH, 1.0, 4.6)
}

// ================= the APCA on-text enforcement (the 'apca' profile's Lc-metric analog) =================
// The pole choice is UNCHANGED (already apca-pole in both profiles); the wcag pole-FLIP fallback is a
// no-op under a single metric (the max-|Lc| pole can't lose to the other on |Lc|), so what the profile
// swaps is the FILL MOVE: a white on-fill reading under the Lc threshold darkens the fill until it clears.
// Mirrors ctaLightL/ctaDarkEnforcedL exactly (white-only trigger, darken-only solve) with the Lc metric,
// measured in EMIT space (gamut-clamped chroma per candidate L — the same lesson as findMaxLForApcaLc).

// |Lc| of WHITE text on the fill at (L, C, H), chroma emit-clamped. White's apcaY is exactly 1.0.
export const whiteTextLcAt = (L: number, C: number, H: number): number =>
  Math.abs(apcaLc(1.0, apcaYAt(L, clampChromaToGamut(L, C, H), H)))

// darken the fill from startL until white text reads ≥ targetLc (findLForContrast's shape: early-out
// when already passing, bisect down, return the passing side).
export function findLForWhiteTextLc(startL: number, C: number, H: number, targetLc: number): number {
  if (whiteTextLcAt(startL, C, H) >= targetLc) return startL
  let lo = 0.05, hi = startL
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2
    whiteTextLcAt(mid, C, H) >= targetLc ? (lo = mid) : (hi = mid)
  }
  return lo
}

// The apca cta enforce FIRE margin (owner 2026-07-11, the #E93D82 razor: a cta shipping at
// Lc 60.0-60.2 reads sub-60 on external checkers — screenshot color management, 8-bit
// rounding, APCA-version skew all eat the zero headroom; the enforced class itself landed at
// 60.5 by the solve margin, inside the same razor band). Fire when the chosen pole reads
// under threshold + THIS margin; solve to clear it (+ the solve margin on top).
export const APCA_ENFORCE_MARGIN_LC = 2.0

// light cta anchor under the apca profile (ctaLightL's shape; +0.5 Lc solve margin ≈ the
// 4.6-for-4.5 idiom). POLE-SYMMETRIC (owner 2026-07-11, the dead-zone gap: the judge rightly
// picks the better pole, but better-of-two-failing isn't passing and only a white-darken
// solver existed — the same one-sidedness the light clearance fixed for the wcag lane):
// white under-reads → DARKEN, black under-reads → LIGHTEN (each pole's own direction).
export function ctaLightLApca(ctx: Ctx, onFillTextIsWhite: boolean, enforce: boolean, thresholdLc: number): number {
  if (!enforce) return ctx.scaleL
  const fireLc = thresholdLc + APCA_ENFORCE_MARGIN_LC
  if (onFillTextIsWhite) {
    if (whiteTextLcAt(ctx.scaleL, ctx.brandC, ctx.brandH) >= fireLc) return ctx.scaleL
    return findLForWhiteTextLc(ctx.scaleL, ctx.brandC, ctx.brandH, fireLc + APCA_SOLVE_MARGIN_LC)
  }
  if (blackTextLcAt(ctx.scaleL, ctx.brandC, ctx.brandH) >= fireLc) return ctx.scaleL
  return findLForBlackTextLc(ctx.scaleL, ctx.brandC, ctx.brandH, fireLc + APCA_SOLVE_MARGIN_LC, 0.92)
}

// dark cta enforce re-solve under the apca profile (ctaDarkEnforcedL's shape); pole-symmetric
// like the light anchor above — the dark black-pole gap shipped Lc 54.7 greens (the judge's
// pick was right; no lighten solver existed behind it).
export function ctaDarkEnforcedLApca(ctx: Ctx, base: { L: number; C: number; H: number }, onFillIsWhiteDark: boolean, enforce: boolean, thresholdLc: number): number | null {
  if (!enforce) return null
  const fireLc = thresholdLc + APCA_ENFORCE_MARGIN_LC
  if (onFillIsWhiteDark) {
    if (whiteTextLcAt(base.L, base.C, base.H) >= fireLc) return null
    return findLForWhiteTextLc(base.L, base.C, ctx.darkCtaH, fireLc + APCA_SOLVE_MARGIN_LC)
  }
  if (blackTextLcAt(base.L, base.C, base.H) >= fireLc) return null
  return findLForBlackTextLc(base.L, base.C, ctx.darkCtaH, fireLc + APCA_SOLVE_MARGIN_LC, 0.92)
}

// ================= the APCA legibility CLEARANCE (the wcag lane's opt-in dual gate) =================
// The wcag cta fill enforces only 4.5 today (ctaLightL) — a chosen pole can clear 4.5 yet read dim in
// APCA. The clearance adds the Lc bar ALONGSIDE 4.5, in the SAME fill direction the chosen pole already
// wants: black under-reads → LIGHTEN, white under-reads → DARKEN. Both directions also raise the 4.5
// ratio, so the two never conflict — 4.5 is the hard floor (never capped), Lc is the capped ambition.
// Pole-symmetric; reuses the existing white-darken solvers and mirrors them upward for the black pole.

// |Lc| of BLACK text on the fill at (L, C, H), chroma emit-clamped. Mirror of whiteTextLcAt; black's apcaY
// is apcaYAt(0,0,0) (the same basis solveBrandExit's poleOk uses).
export const blackTextLcAt = (L: number, C: number, H: number): number =>
  Math.abs(apcaLc(apcaYAt(0, 0, 0), apcaYAt(L, clampChromaToGamut(L, C, H), H)))

// LIGHTEN the fill from startL until BLACK text reads ≥ targetLc (mirror of findLForWhiteTextLc, upward);
// cap-aware — returns capHiL (best-effort) if the cap is reached before the bar, or if it cannot move up.
export function findLForBlackTextLc(startL: number, C: number, H: number, targetLc: number, capHiL: number): number {
  if (blackTextLcAt(startL, C, H) >= targetLc) return startL
  if (capHiL <= startL || blackTextLcAt(capHiL, C, H) < targetLc) return capHiL
  let lo = startL, hi = capHiL
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2
    blackTextLcAt(mid, C, H) >= targetLc ? (hi = mid) : (lo = mid)
  }
  return hi
}

// the pole-symmetric dual-gate cta anchor: satisfy BOTH 4.5 (hard, uncapped) and coLc (capped) by moving
// the fill in the chosen pole's own direction. Same brandC/brandH basis as ctaLightL.
export function ctaDualGateL(
  ctx: Ctx, onFillTextIsWhite: boolean, enforce: boolean,
  coLc: number, capLoL: number, capHiL: number,
): number {
  if (!enforce) return ctx.scaleL
  const startL = ctx.scaleL, C = ctx.brandC, H = ctx.brandH
  if (onFillTextIsWhite) {
    // DARKEN: 4.5 is hard (uncapped); the Lc ambition is capped at capLoL
    const l45 = legalRatio(startL, C, H, 1.0) >= 4.5 ? startL : findLForContrast(startL, C, H, 1.0, 4.6)
    const lLc = findLForWhiteTextLc(startL, C, H, coLc + APCA_SOLVE_MARGIN_LC)
    return Math.min(l45, Math.max(lLc, capLoL))
  }
  // LIGHTEN: 4.5 is hard (uncapped); the Lc ambition is capped at capHiL
  const l45 = legalRatio(startL, C, H, 0) >= 4.5 ? startL : findLForContrastUp(startL, C, H, 0, 4.6)
  const lLc = findLForBlackTextLc(startL, C, H, coLc + APCA_SOLVE_MARGIN_LC, capHiL)
  return Math.max(l45, Math.min(lLc, capHiL))
}

// on-fill (dark): judged at the emitted (gamut-clamped) base ctaDark, PRE-enforcement (:424–425).
// ratioFloor: the wcag conformance floor for POST-MOVE re-judges (a moved cta sits where the
// enforce-darken can no longer guarantee white — the chosen pole must still pass 4.5; the
// enforce branch's |Lc|≥45 taste guard must not block a legally-required flip).
export function onFillIsWhiteDarkAt(L: number, C: number, H: number, enforce: boolean, ratioFloor?: number): boolean {
  return onTextIsWhite(apcaYAt(L, C, H), L, C, H, enforce, ratioFloor)
}

// ================= C12 v8 — THE JOINT SOLVE, brand side (owner-settled 2026-07-10; model =
// scripts/c12-session/joint-solve-model.md; supersedes the v6/v7 exitCtaL + arc-target) ====
// MEMBERSHIP: the cta formula at the SEED's own L sits inside the widened region
// (redSolveDist ≤ G) or in the warm brick band. EXIT: the nearest release edge in the solve
// metric — clearing the region by the RING with a passing pole (pole-agnostic; apca's dead
// zone is cleared, never parked in) — with her direction rules on top: noticeably-magenta
// (not deep) lightens · gold-side vivid flips up to bright orange · on-hue vivid takes the
// big dark throw. A dark landing inside the brick band takes the DIAGONAL (soft cool, slight
// desat, extra depth — burgundy at near-identity hue). No P2 condition on the brand — the
// vibration problem is the red complement's job (engine/resolve). Returns null = not a
// member — byte-identical path. Dark never fires (collision-sweep asserts zero).
export interface BrandExitLanding { L: number; H: number; cMul: number; up: boolean }
export function solveBrandExit(
  seed: { L: number; C: number; H: number },
  cFor: (L: number) => number, brandH: number,
  red: { L: number; C: number; H: number },
  enforceLc?: number,
): BrandExitLanding | null {
  const at = (L: number) => ({ L, C: clampChromaToGamut(L, cFor(L), brandH), H: brandH })
  const poleOk = (L: number, C: number, H: number): boolean => {
    if (enforceLc === undefined) return true
    // landings honor the same fire margin as the enforcers — a release point chosen at
    // exactly Lc 60.0 is the same external-checker razor the margin exists to kill
    const bar = enforceLc + APCA_ENFORCE_MARGIN_LC
    if (whiteTextLcAt(L, C, H) >= bar) return true
    return Math.abs(apcaLc(apcaYAt(0, 0, 0), apcaYAt(L, clampChromaToGamut(L, C, H), H))) >= bar
  }
  const anchor = at(seed.L)
  const dh = hueDelta(seed.H, red.H)
  const member = redSolveDist(anchor, red) <= RED_GATE.G ||
    (inBrickBand(seed.L, anchor.C, brandH) && dh > RED_SOLVE.magentaDh)
  if (!member) return null
  const release = RED_GATE.G + RED_SOLVE.ring
  const travel = (dir: 1 | -1): number | null => {
    for (let L = seed.L; L >= 0.28 && L <= 0.92; L += dir * 0.002) {
      const c = at(L)
      if (redSolveDist(c, red) >= release && poleOk(L, c.C, c.H)) return Math.abs(L - seed.L)
    }
    return null
  }
  const dn = travel(-1), up = travel(1)
  // both-directions-trapped is unreachable on the current geometry (membership bounds seed L
  // well inside the scan range; fleet-swept 0 hits both lanes) — the near-black park exists
  // only as a defensive sentinel and nothing asserts on it today
  if (dn === null && up === null) return { L: 0.03, H: brandH, cMul: 1, up: false }
  const vivid = seed.C / Math.max(1e-6, maxChromaAt(seed.L, seed.H))
  const onHue = dh > RED_SOLVE.magentaDh && dh < RED_SOLVE.goldDh
  const magentaUp = dh <= RED_SOLVE.magentaDh && seed.L > RED_SOLVE.magentaMinL &&
    up !== null && dn !== null && up <= RED_SOLVE.magentaUpRatio * dn
  const goldBright = !magentaUp && vivid >= RED_SOLVE.vividMin && dh >= RED_SOLVE.goldDh &&
    seed.L > RED_SOLVE.vividMinL && up !== null
  const vividDown = !magentaUp && !goldBright && vivid >= RED_SOLVE.vividMin &&
    dh > RED_SOLVE.magentaDh && dn !== null
  const nearDark = dn !== null && (up === null || dn <= up)
  // TRUE-RED DIRECTION (owner 2026-07-11, 27 marks): an on-hue red that would drift UP (the
  // nearest edge is up, and it is not already vivid-dark) keeps the bright landing ONLY when
  // the up-exit reads intentionally light — else it takes the dark throw. Below the cut the
  // shipped "brand bright salmon + red deep" reads like the exact-mode safety pattern, not a
  // brand that chose to go light. Per-lane by construction (wcag up-exits dim, apca bright).
  const trueRedDim = onHue && !magentaUp && !goldBright && !vividDown && !nearDark &&
    up !== null && dn !== null && seed.L + up < RED_SOLVE.trueRedBrightCut
  const dir = magentaUp || goldBright ? 1 : vividDown || trueRedDim ? -1 : nearDark ? -1 : 1
  const t = dir === -1 ? dn! : up!
  let landing: BrandExitLanding = { L: seed.L + dir * t, H: brandH, cMul: 1, up: dir === 1 }
  if (dir === -1) {
    const l = at(landing.L)
    if (inBrickBand(l.L, l.C, l.H)) {
      landing = {
        L: landing.L - RED_SOLVE.brickExtraDeep,
        H: brandH + (dh >= RED_SOLVE.goldDh ? RED_SOLVE.brickCoolGold : RED_SOLVE.brickCool),
        cMul: RED_SOLVE.brickDesat, up: false,
      }
    }
  }
  return landing
}

// ================= C12 dark — THE SAME SOLVE ON DARK GEOMETRY (owner 2026-07-11, "dark falls
// out like every cta"; direction accepted on render/c12-dark-solve.html) =====================
// The dark cta rides the shipped prominence floor UNLESS it P2-vibrates beside the red dark
// cta — the P1 gate passes every vibrating dark pair (redGateDist 0.11-0.20; the known dark
// blindness), so membership + release key on P2: member = p2 < P2_D_UP, travel the nearest
// direction to p2 ≥ P2_D with a passing pole. Red dark stays canonical/static. Measured on
// the near-red population (70 pairs, both lanes): 0 below bar (shipped: 12, worst 0.086);
// every mover = the apca lane lifting UP ~0.70→0.77 (brighter = MORE prominent — no dead
// buttons); wcag already separates (red dark 0.585 vs floor 0.70) and never fires. Full-wheel
// over-fire: 3/576, all within dh −4…+6 of red. Returns null = not a member — byte-identical.
export function solveDarkCtaExit(
  cur: { L: number; C: number; H: number },
  cFor: (L: number) => number, darkH: number,
  redDark: { L: number; C: number; H: number },
  enforceLc?: number,
): number | null {
  const at = (L: number) => ({ L, C: clampChromaToGamut(L, cFor(L), darkH), H: darkH })
  if (p2Diff(cur, redDark) >= P2_D_UP) return null
  // landings honor the enforce fire margin (see solveBrandExit's poleOk) — no Lc-60.0 razors
  const poleOk = (L: number, C: number, H: number): boolean => enforceLc !== undefined
    ? (whiteTextLcAt(L, C, H) >= enforceLc + APCA_ENFORCE_MARGIN_LC ||
       blackTextLcAt(L, C, H) >= enforceLc + APCA_ENFORCE_MARGIN_LC)
    : (legalRatio(L, C, H, 1.0) >= 4.5 || legalRatio(L, C, H, 0) >= 4.5)
  const travel = (dir: 1 | -1): number | null => {
    for (let L = cur.L; L >= 0.28 && L <= 0.92; L += dir * 0.002) {
      const c = at(L)
      if (p2Diff(c, redDark) >= P2_D && poleOk(L, c.C, c.H)) return Math.abs(L - cur.L)
    }
    return null
  }
  const dn = travel(-1), up = travel(1)
  if (dn === null && up === null) return null // trapped: keep the shipped floor (unreachable on measured geometry)
  const dir = dn !== null && (up === null || dn <= up) ? -1 : 1
  return cur.L + dir * (dir === -1 ? dn! : up!)
}
