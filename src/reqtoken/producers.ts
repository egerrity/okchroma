// producers.ts — the NAMED PRODUCER implementations of the okchroma resolver (resolver id okchroma-reqtoken@2).
// The aesthetic state (chromaBoost, mutedness, cream gate, warm drift, red cool) is the house style OF this
// resolver, not portable spec data. These expressions were ported verbatim from the pre-resolver generateScale
// and proven byte-identical at cutover (commit c7542b7); the blessed snapshots are the standing gate — do not
// "simplify" an expression here without eye-check + re-bless.
import { classifyArchetype, medianLForArchetype, type Archetype } from '../engine/archetypes'
import { clampChromaToGamut, wcagY, contrastRatio, findMaxLForContrast, findLForContrast, apcaY, apcaLc } from '../engine/constraints'
import { perceptualRungL } from '../engine/perceptualL'
import {
  hexToOklch, oklchToSrgbUnclamped, maxChromaAt, goldSpineHue, torsionedHue, gauss, sigmoid, hueDelta,
  SPINE_OFFPATH_SIGMA, RED_TORSION_CENTER_H, RED_TORSION_SOFTNESS, VIVID_C, HUE_NOISE_C, MUTED_BLEND_DENOM,
  CREAM_UPPER_H, CREAM_UPPER_SOFTNESS,
  DEEPER_BAND_H_LO, DEEPER_BAND_H_HI, DEEPER_BAND_H_SOFT, DEEPER_BAND_U_LO, DEEPER_BAND_U_HI, DEEPER_BAND_U_SOFT,
  DEEPER_STRENGTH, RED_COOL_DEG, redCoolWeight, inRedBand, applyChromaFloor,
  DARK_FLOOR_FULL_C, DARK_FLOOR_MUTED_MAX_C, onTextIsWhite,
} from '../engine/colorMath'
import { DARK_STOP_9_MIN_L, DARK_COLLIDER_MUTED_L, DARK_COLLIDER_MUTED_CHROMA_SCALE } from '../engine/stopTable'
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
  const wRed = hueIsNoise || opts?.suppressRedCool ? 0 : redCoolWeight(brandH)
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
  const wDrift = S * (gWarm + (1 - gWarm) * mutedness * creamGate)
  const driftCapDeg = 24 + 8 * u

  const chromaBoost = hueIsNoise
    ? 1
    : 1 + 1.7 * gauss(hueDelta(brandH, 90), 35) * S * (1 - (1 - creamGate) * (1 - v))

  const brandSat = subtleC / Math.max(1e-6, maxChromaAt(brandL, brandH))

  const lightSpineRef = goldSpineHue(scaleL)
  const gOffPath = gauss(hueDelta(brandH, lightSpineRef), SPINE_OFFPATH_SIGMA)
  // the REAL light hue producer ('warm-drift'): inline spine drift with a dynamic cap (24+8u) MINUS the red
  // cool — NOT torsionedHue (that is the dark producer). colorEngine.ts:307–310 verbatim.
  const lightHueAt = (L: number): number => {
    const drift = 0.55 * (goldSpineHue(L) - lightSpineRef) * wDrift * gOffPath
    return brandH + Math.max(-driftCapDeg, Math.min(driftCapDeg, drift)) - RED_COOL_DEG * wRed
  }

  const darkH =
    opts?.coolRedDark && !hueIsNoise && inRedBand(brandH)
      ? brandH - RED_COOL_DEG * redCoolWeight(brandH)
      : brandH

  return {
    hex, opts, brandL, brandC, brandH, subtleC, cAt, archetype, scaleL,
    darkFloorStrength, hueIsNoise, v, vSubtle, u, chromaBoost, brandSat,
    lightHueAt, darkH, gOffPath, wRed,
  }
}
export type Ctx = ReturnType<typeof buildContext>

// ---- light scale chroma (stops 1–8: paper/wash/highlight-8): ladder/envelope blend, cAt-wrapped (colorEngine.ts:322–326).
// NOTE: unclamped by design — the perceptual solve sees the raw blend; makeStop clamps at emit.
export const lightScaleChromaAt = (ctx: Ctx, baseC: number, satFraction: number) => (L: number): number => {
  const cLadder = ctx.vSubtle * ctx.chromaBoost * baseC
  const cEnv = ctx.brandSat * satFraction * maxChromaAt(L, ctx.lightHueAt(L))
  return ctx.cAt('light', L, cLadder + ctx.u * (cEnv - cLadder))
}

// ---- light highlight chroma (stops 9/10): same blend but gamut-CLAMPED before the solve (colorEngine.ts:441–442)
export const lightHighlightChromaAt = (ctx: Ctx, baseC: number, satFraction: number) => (L: number, hh: number): number => {
  const hlLadderC = ctx.vSubtle * ctx.chromaBoost * baseC
  return clampChromaToGamut(L, ctx.cAt('light', L, hlLadderC + ctx.u * (ctx.brandSat * satFraction * maxChromaAt(L, hh) - hlLadderC)), hh)
}

// ---- APCA metric primitives (the 'apca' contrast profile). apcaYAt mirrors wcagY's treatment of
// out-of-gamut chroma (apcaY channel-clamps, wcagY zero-floors); findMaxLForApcaLc is the exact
// findMaxLForContrast bisection shape with |Lc| as the predicate. Monotone for the same reason the WCAG
// bisection is: against a near-white (light) or near-black (dark) paper-2, the reverse-polarity side of
// the curve can never reach a passing |Lc|, so the passing set is a single downward (light) interval.
export function apcaYAt(L: number, C: number, H: number): number {
  const { r, g, b } = oklchToSrgbUnclamped(L, C, H)
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

// ---- min-separation clamp (light): push the stop's L DOWN until its OKLab ΔE (the house stopDeltaE metric)
// from the resolved reference stop clears the target. A floor: an already-separated placement doesn't move.
// Hue/chroma track L; downstream contrast requires re-solve automatically because they reference the
// RESOLVED stop (never a cached Y).
export function separationClampLight(
  ctx: Ctx, placed: { L: number; C: number; H: number }, chromaAt: (L: number) => number,
  ref: { L: number; C: number; H: number }, target: number,
): { L: number; C: number; H: number } {
  const rad = (h: number) => (h * Math.PI) / 180
  const refA = ref.C * Math.cos(rad(ref.H)), refB = ref.C * Math.sin(rad(ref.H))
  const dE = (L: number): number => {
    const H = ctx.lightHueAt(L)
    const C = clampChromaToGamut(L, chromaAt(L), H)
    const a = C * Math.cos(rad(H)), b = C * Math.sin(rad(H))
    return Math.sqrt((L - ref.L) ** 2 + (a - refA) ** 2 + (b - refB) ** 2)
  }
  if (dE(placed.L) >= target) return placed
  const margin = target + 5e-4          // solve a hair past so the gamut-trimmed emit still clears
  let fail = placed.L                    // too light (under-separated)
  let pass = placed.L - 0.12             // darker end; extend if even this is under-separated
  for (let guard = 0; guard < 4 && dE(pass) < margin; guard++) pass -= 0.12
  for (let i = 0; i < 30; i++) {
    const m = (fail + pass) / 2
    dE(m) >= margin ? (pass = m) : (fail = m)
  }
  const H = ctx.lightHueAt(pass)
  return { L: pass, C: chromaAt(pass), H }
}

// ---- light text stops 11/12: the EXACT 3-call Math.min sequence incl. the deepen re-solve
// (colorEngine.ts:363–374). The anchor solve uses raw gamut-clamped chroma; the emit chroma is cAt-wrapped.
// `maxLFor` = the resolver-built metric closure (wcag: findMaxLForContrast at the raw ratio, no margin —
// float-identical to the old inline calls; apca: findMaxLForApcaLc at the raw targetLc).
export function placeLightText(
  ctx: Ctx, rootL: number, cMult: number, maxLFor: (C: number, H: number) => number, deepen: number,
): { L: number; C: number; H: number } {
  const brandC = ctx.brandC
  const anchorL = perceptualRungL(rootL, clampChromaToGamut(rootL, cMult * brandC, ctx.lightHueAt(rootL)), ctx.lightHueAt(rootL))
  let H = ctx.lightHueAt(anchorL)
  let C = clampChromaToGamut(anchorL, cMult * brandC, H)
  let L = Math.min(anchorL, maxLFor(C, H))
  H = ctx.lightHueAt(L)
  C = clampChromaToGamut(L, cMult * brandC, H)
  L = Math.min(anchorL, maxLFor(C, H))
  L = Math.min(L - deepen, maxLFor(C, ctx.lightHueAt(L - deepen)))
  return { L, C: ctx.cAt('light', L, cMult * brandC), H: ctx.lightHueAt(L) }
}

// ---- light highlight placement (stops 9/10): perceptual on the clamped highlight chroma (colorEngine.ts:462–465)
export function placeLightHighlight(ctx: Ctx, rootL: number, chromaAt: (L: number, hh: number) => number): { L: number; C: number; H: number } {
  const L = perceptualRungL(rootL, chromaAt(rootL, ctx.lightHueAt(rootL)), ctx.lightHueAt(rootL))
  return { L, C: chromaAt(L, ctx.lightHueAt(L)), H: ctx.lightHueAt(L) }
}

// ---- on-fill (light), PRE-enforcement: judged at fill9 = the brand fill at scaleL (colorEngine.ts:271–273).
// `enforce` resolves at the call site: caller opts override the spec's declared default.
export function onFillIsWhiteLight(ctx: Ctx, enforce: boolean): boolean {
  const fill9 = oklchToSrgbUnclamped(ctx.scaleL, clampChromaToGamut(ctx.scaleL, ctx.cAt('light', ctx.scaleL, ctx.brandC), ctx.brandH), ctx.brandH)
  const fill9ApcaY = apcaY(fill9.r, fill9.g, fill9.b)
  return onTextIsWhite(fill9ApcaY, ctx.scaleL, ctx.brandC, ctx.brandH, enforce)
}

// ---- on-highlight: judged at the emitted highlight-9 stop — perceptual preference, with the
// declared conformance floor (spec.ons.onHighlight.ratioFloor: 4.5 under wcag, stripped under apca)
export function onHighlightIsWhiteAt(L: number, C: number, H: number, ratioFloor?: number): boolean {
  const { r, g, b } = oklchToSrgbUnclamped(L, C, H)
  return onTextIsWhite(apcaY(r, g, b), L, C, H, false, ratioFloor)
}

// ================= DARK producers (colorEngine.ts:378–434, 469–481, verbatim) =================

// the dark role/hue context: the cta anchor resolves FIRST because the dark torsion anchors at it
// (colorEngine.ts:380–386, 395). NOTE: gOffPath is the LIGHT spine-ref gaussian, reused verbatim.
// `specFloorL` = the declared role floor (spec data); caller opts (darkFillMinL) override it.
export function buildDarkContext(ctx: Ctx, specFloorL: number = DARK_STOP_9_MIN_L) {
  const opts = ctx.opts
  let dark9L = Math.max(ctx.scaleL, opts?.darkFillMinL ?? specFloorL)
  let darkC9 = opts?.darkChromaCurve && !opts?.loudCta ? ctx.brandC * darkCtaTrim(ctx.darkH) : ctx.brandC
  if (opts?.darkColliderFill === 'muted') {
    dark9L = DARK_COLLIDER_MUTED_L
    darkC9 = ctx.brandC * DARK_COLLIDER_MUTED_CHROMA_SCALE
  }
  const darkHueAtL = (L: number) => torsionedHue(ctx.darkH, L, dark9L, ctx.gOffPath)
  return { dark9L, darkC9, darkHueAtL }
}
export type DarkCtx = ReturnType<typeof buildDarkContext>

// dark scale chroma (stops 1–8): darkChromaCurve callback or the chroma floor over subtleC (colorEngine.ts:404–406)
export const darkScaleChromaAt = (ctx: Ctx, dctx: DarkCtx, stopIndex: number, multiplier: number) => (L: number): number =>
  ctx.cAt('dark', L, ctx.opts?.darkChromaCurve
    ? ctx.opts.darkChromaCurve(L, dctx.darkHueAtL(L), ctx.brandC, dctx.darkC9)
    : applyChromaFloor(ctx.subtleC, multiplier, stopIndex, ctx.darkFloorStrength))

// dark ink chroma (stops 11/12): floor over brandC; the curve call has NO ctaC arg (colorEngine.ts:416–422)
export const darkInkChromaAt = (ctx: Ctx, dctx: DarkCtx, stopIndex: number, multiplier: number) => (L: number): number =>
  ctx.cAt('dark', L, ctx.opts?.darkChromaCurve
    ? ctx.opts.darkChromaCurve(L, dctx.darkHueAtL(L), ctx.brandC)
    : applyChromaFloor(ctx.brandC, multiplier, stopIndex, ctx.darkFloorStrength))

// dark highlight chroma (stops 9/10): curve override or the light blend through cAt('dark'), clamped (colorEngine.ts:469–472)
export const darkHighlightChromaAt = (ctx: Ctx, dctx: DarkCtx, baseC: number, satFraction: number) => (L: number, h: number): number => {
  if (ctx.opts?.darkChromaCurve) return clampChromaToGamut(L, ctx.opts.darkChromaCurve(L, h, ctx.brandC), h)
  const hlLadderC = ctx.vSubtle * ctx.chromaBoost * baseC
  return clampChromaToGamut(L, ctx.cAt('dark', L, hlLadderC + ctx.u * (ctx.brandSat * satFraction * maxChromaAt(L, h) - hlLadderC)), h)
}

// dark perceptual placement (stops 1–7, 11/12): placeDarkStop verbatim (colorEngine.ts:396–399).
// `lift` = the 'perceptual-lift' producer: the H-K solve may raise a hue above its scaffold (low-boost
// hues like yellow) but never place it BELOW (high-boost hues — blue/violet — otherwise sink under the
// near-black neutral surfaces they render on: the blue-recede failure). "Dark fills lift, never sink,"
// extended from the cta floor to the scale.
export function placeDark(dctx: DarkCtx, rootL: number, chromaAt: (L: number) => number, lift = false): { L: number; C: number; H: number } {
  let L = perceptualRungL(rootL, chromaAt(rootL), dctx.darkHueAtL(rootL))
  if (lift) L = Math.max(L, rootL)
  return { L, C: chromaAt(L), H: dctx.darkHueAtL(L) }
}

// ================= CTA roles (light :354–361, dark :413–433) =================

// light cta anchor incl. the enforce re-solve (feeds from the PRE-enforcement on-fill boolean; 4.6-for-4.5 margin)
export function ctaLightL(ctx: Ctx, onFillTextIsWhite: boolean, enforce: boolean): number {
  let light9L = ctx.scaleL
  if (enforce && onFillTextIsWhite
      && contrastRatio(1.0, wcagY(ctx.scaleL, ctx.brandC, ctx.brandH)) < 4.5) {
    light9L = findLForContrast(ctx.scaleL, ctx.brandC, ctx.brandH, 1.0, 4.6)
  }
  return light9L
}

// dark cta enforce re-solve: judged at the emitted base ctaDark; only a WHITE on-fill triggers it (:427–433)
export function ctaDarkEnforcedL(ctx: Ctx, base: { L: number; C: number; H: number }, onFillIsWhiteDark: boolean, enforce: boolean): number | null {
  if (!(enforce && onFillIsWhiteDark)) return null
  if (contrastRatio(1.0, wcagY(base.L, base.C, base.H)) >= 4.5) return null
  return findLForContrast(base.L, base.C, ctx.darkH, 1.0, 4.6)
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

// light cta anchor under the apca profile (ctaLightL's shape; +0.5 Lc solve margin ≈ the 4.6-for-4.5 idiom)
export function ctaLightLApca(ctx: Ctx, onFillTextIsWhite: boolean, enforce: boolean, thresholdLc: number): number {
  let light9L = ctx.scaleL
  if (enforce && onFillTextIsWhite && whiteTextLcAt(ctx.scaleL, ctx.brandC, ctx.brandH) < thresholdLc) {
    light9L = findLForWhiteTextLc(ctx.scaleL, ctx.brandC, ctx.brandH, thresholdLc + APCA_SOLVE_MARGIN_LC)
  }
  return light9L
}

// dark cta enforce re-solve under the apca profile (ctaDarkEnforcedL's shape)
export function ctaDarkEnforcedLApca(ctx: Ctx, base: { L: number; C: number; H: number }, onFillIsWhiteDark: boolean, enforce: boolean, thresholdLc: number): number | null {
  if (!(enforce && onFillIsWhiteDark)) return null
  if (whiteTextLcAt(base.L, base.C, base.H) >= thresholdLc) return null
  return findLForWhiteTextLc(base.L, base.C, ctx.darkH, thresholdLc + APCA_SOLVE_MARGIN_LC)
}

// on-fill (dark): judged at the emitted (gamut-clamped) base ctaDark, PRE-enforcement (:424–425)
export function onFillIsWhiteDarkAt(L: number, C: number, H: number, enforce: boolean): boolean {
  const { r, g, b } = oklchToSrgbUnclamped(L, C, H)
  return onTextIsWhite(apcaY(r, g, b), L, C, H, enforce)
}
