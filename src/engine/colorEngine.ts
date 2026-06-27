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
  STOP_8_NONTEXT_CONTRAST,
  DARK_SUBTLE_CHROMA_MULT,
  DARK_NEUTRAL_L,
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

export type { NeutralLevel } from './neutralCurve'

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

function goldSpineHue(L: number): number {
  return goldSpineHueTable(L)
}

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

const SPINE_OFFPATH_SIGMA = 20

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x))
const gauss = (x: number, sigma: number) => Math.exp(-0.5 * (x / sigma) ** 2)

function hueDelta(h: number, center: number): number {
  let d = (h - center) % 360
  if (d > 180) d -= 360
  if (d < -180) d += 360
  return d
}

const RED_TORSION_CENTER_H = 35.5
const RED_TORSION_SOFTNESS = 3.5

const RED_BAND_LO_H = 12

const RED_BAND_LO_SOFTNESS = 2

const VIVID_C = 0.13

const HUE_NOISE_C = 0.008

const MUTED_BLEND_DENOM = 0.55

const CREAM_UPPER_H = 105
const CREAM_UPPER_SOFTNESS = 5

const DEEPER_BAND_H_LO = 55
const DEEPER_BAND_H_HI = 100
const DEEPER_BAND_H_SOFT = 4
const DEEPER_BAND_U_LO = 0.10
const DEEPER_BAND_U_HI = 0.70
const DEEPER_BAND_U_SOFT = 0.015

const DEEPER_STRENGTH = 0.85

export const RED_COOL_DEG = 10.8

export function redCoolWeight(brandH: number): number {
  return (
    sigmoid((brandH - RED_BAND_LO_H) / RED_BAND_LO_SOFTNESS) *
    (1 - sigmoid((brandH - RED_TORSION_CENTER_H) / RED_TORSION_SOFTNESS))
  )
}

export function inRedBand(h: number): boolean {
  return h > RED_BAND_LO_H && h <= RED_TORSION_CENTER_H
}

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
}

function applyChromaFloor(C: number, multiplier: number, stopIndex: number, floorStrength: number): number {
  const raw = C * multiplier
  if (floorStrength <= 0) return raw
  const floor = (0.02 + (0.04 - 0.02) * (stopIndex / 7)) * floorStrength
  return Math.max(raw, floor)
}

const DARK_FLOOR_FULL_C = 0.022

const DARK_FLOOR_MUTED_MAX_C = 0.04

function makeStop(stop: number, L: number, C: number, H: number): ColorStop {
  const gamutC = clampChromaToGamut(L, C, H)
  const { r, g, b } = oklchToSrgbUnclamped(L, gamutC, H)
  return { stop, L, C: gamutC, H, r, g, b }
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

  enforceWhiteFill?: boolean

  coolRedDark?: boolean

  style?: 'default' | 'deeper' | 'full-chroma'

  highlight?: boolean

  chromaCurve?: (L: number, mode: 'light' | 'dark') => number

  darkChromaCurve?: (L: number, H: number, brandC: number, ctaC?: number) => number

  loudCta?: boolean

  heat?: number
}

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

  const subtleC = brandC * (opts?.subtleChromaScale ?? 1)

  const cAt = (mode: 'light' | 'dark', L: number, nativeC: number): number =>
    (opts?.chromaCurve ? opts.chromaCurve(L, mode) : nativeC) * (opts?.heat ?? 1)
  const archetype = forcedArchetype ?? classifyArchetype(brandL)
  const scaleL = forcedArchetype ? medianLForArchetype(forcedArchetype) : brandL

  const darkFloorStrength =
    brandC >= DARK_FLOOR_MUTED_MAX_C
      ? 0
      : Math.min(1, Math.max(0, (brandC - HUE_NOISE_C) / (DARK_FLOOR_FULL_C - HUE_NOISE_C)))
  const lFlip = computeLFlip(brandC, brandH)
  const lFillMax = computeLFillMax(brandC, brandH)

  const fillAnchorL =
    opts?.enforceWhiteFill && contrastRatio(1.0, wcagY(scaleL, brandC, brandH)) < 4.5
      ? findLForContrast(scaleL, brandC, brandH, 1.0, 4.6)
      : scaleL
  const fill9 = oklchToSrgbUnclamped(fillAnchorL, clampChromaToGamut(fillAnchorL, cAt('light', fillAnchorL, brandC), brandH), brandH)
  const fill9ApcaY = apcaY(fill9.r, fill9.g, fill9.b)
  let onFillTextIsWhite = onTextIsWhite(fill9ApcaY, fillAnchorL, brandC, brandH, !!opts?.enforceOnFillContrast)

  const hueIsNoise = brandC < HUE_NOISE_C
  const v = Math.min(1, brandC / VIVID_C)
  const vSubtle = Math.min(1, subtleC / VIVID_C)
  const S = hueIsNoise ? 0 : sigmoid(hueDelta(brandH, RED_TORSION_CENTER_H) / RED_TORSION_SOFTNESS)
  const wRed = hueIsNoise ? 0 : redCoolWeight(brandH)
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
  const lightHueAt = (L: number): number => {
    const drift = 0.55 * (goldSpineHue(L) - lightSpineRef) * wDrift * gOffPath
    return brandH + Math.max(-driftCapDeg, Math.min(driftCapDeg, drift)) - RED_COOL_DEG * wRed
  }

  const darkH =
    opts?.coolRedDark && !hueIsNoise && inRedBand(brandH)
      ? brandH - RED_COOL_DEG * redCoolWeight(brandH)
      : brandH

  const light: ColorStop[] = []

  for (let i = 0; i < LIGHT_STOPS.length; i++) {
    const { rootL, satFraction } = LIGHT_STOPS[i]

    const chromaAt = (L: number): number => {
      const cLadder = vSubtle * chromaBoost * LIGHT_BASE_C[i]
      const cEnv = brandSat * satFraction * maxChromaAt(L, lightHueAt(L))
      return cAt('light', L, cLadder + u * (cEnv - cLadder))
    }

    let L = perceptualRungL(rootL, chromaAt(rootL), lightHueAt(rootL))

    // Stop 8 carries the WCAG 1.4.11 non-text 3:1 guarantee: clamp its perceptual
    // rung down to the lightest L that still clears 3:1 against this scale's own
    // paper-2 (light[1], already pushed). Chroma/hue track L (the warm spine drifts
    // hue with lightness), so iterate the clamp to a fixed point — at convergence
    // the solver's C/H input equals the emitted C/H, so the 3:1 floor is exact. For
    // darker hues the rung is already below the ceiling and passes untouched.
    if (i === 7) {
      const p2Y = wcagY(light[1].L, light[1].C, light[1].H)
      // Solve to a hair above 3.0 so the emitted stop still clears 3:1 after
      // makeStop's gamut clamp trims chroma (same margin idiom as the 4.6-for-4.5
      // fill floor). chromaAt/lightHueAt track L, so iterate to a fixed point.
      const solveTarget = STOP_8_NONTEXT_CONTRAST + 0.05
      for (let pass = 0; pass < 6; pass++) {
        const next = Math.min(L, findMaxLForContrast(chromaAt(L), lightHueAt(L), p2Y, solveTarget))
        if (Math.abs(next - L) < 1e-4) { L = next; break }
        L = next
      }
    }

    light.push(makeStop(i + 1, L, chromaAt(L), lightHueAt(L)))
  }

  const stop2Y = wcagY(light[1].L, light[1].C, light[1].H)

  let light9L = fillAnchorL
  if (opts?.enforceOnFillContrast && onFillTextIsWhite
      && contrastRatio(1.0, wcagY(fillAnchorL, brandC, brandH)) < 4.5) {
    light9L = findLForContrast(fillAnchorL, brandC, brandH, 1.0, 4.6)
  }

  const cta = makeStop(9, light9L, cAt('light', light9L, brandC), brandH)
  const ctaHover = makeStop(10, hoverL(light9L), cAt('light', hoverL(light9L), brandC), brandH)

  const lightTextStop = (stop: number, rootL: number, cMult: number, ratio: number, deepen: number): ColorStop => {

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

  let dark9L = Math.max(scaleL, opts?.darkFillMinL ?? DARK_STOP_9_MIN_L)

  let darkC9 = opts?.darkChromaCurve && !opts?.loudCta ? brandC * darkCtaTrim(darkH) : brandC
  if (opts?.darkColliderFill === 'muted') {
    dark9L = DARK_COLLIDER_MUTED_L
    darkC9 = brandC * DARK_COLLIDER_MUTED_CHROMA_SCALE
  }

  for (let i = 0; i < DARK_SUBTLE_CHROMA_MULT.length; i++) {
    const chromaMultiplier = DARK_SUBTLE_CHROMA_MULT[i]
    const L = DARK_NEUTRAL_L[i]
    const H = torsionedHue(darkH, L, dark9L, gOffPath)
    const C = opts?.darkChromaCurve
      ? opts.darkChromaCurve(L, H, brandC, darkC9)
      : applyChromaFloor(subtleC, chromaMultiplier, i, darkFloorStrength)
    dark.push(makeStop(i + 1, L, cAt('dark', L, C), H))
  }

  let ctaDark = makeStop(9, dark9L, cAt('dark', dark9L, darkC9), darkH)
  let ctaHoverDark = makeStop(10, hoverL(dark9L), cAt('dark', hoverL(dark9L), darkC9), darkH)

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

  const dark9ApcaY0 = apcaY(ctaDark.r, ctaDark.g, ctaDark.b)
  const onFillTextIsWhiteDark = onTextIsWhite(dark9ApcaY0, ctaDark.L, ctaDark.C, ctaDark.H, !!opts?.enforceOnFillContrast)

  if (opts?.enforceOnFillContrast && onFillTextIsWhiteDark) {
    if (contrastRatio(1.0, wcagY(ctaDark.L, ctaDark.C, ctaDark.H)) < 4.5) {

      const compliantL = findLForContrast(ctaDark.L, ctaDark.C, darkH, 1.0, 4.6)
      ctaDark = makeStop(9, compliantL, cAt('dark', compliantL, darkC9), darkH)
      ctaHoverDark = makeStop(10, hoverL(compliantL), cAt('dark', hoverL(compliantL), darkC9), darkH)
    }
  }

  let onHighlightIsWhite: boolean | undefined
  let onHighlightIsWhiteDark: boolean | undefined
  if (opts?.highlight) {
    const hlLadderC = vSubtle * chromaBoost * HIGHLIGHT_LIGHT.baseC

    const lightHlC = (l: number, hh: number) =>
      clampChromaToGamut(l, cAt('light', l, hlLadderC + u * (brandSat * HIGHLIGHT_LIGHT.satFraction * maxChromaAt(l, hh) - hlLadderC)), hh)

    const rung = (
      stop: number, Lt: number,
      hueAt: (l: number) => number, chromaAt: (l: number, h: number) => number,
    ): ColorStop => makeStop(stop, Lt, chromaAt(Lt, hueAt(Lt)), hueAt(Lt))

    const placeRung = (
      stop: number, L0: number,
      hueAt: (l: number) => number, chromaAt: (l: number, h: number) => number,
    ): { s: ColorStop; white: boolean } => {
      const s = rung(stop, L0, hueAt, chromaAt)
      // Highlight on-text is judged by APCA, NOT WCAG (enforce=false): keep whichever
      // pole APCA finds legible, let it fall out. The WCAG-4.5 floor instead FORCES the
      // pole that clears 4.5 — which on a mid-L fill can be the body-illegible one. The
      // highlight L is set outside the body-text dead zone so the picked pole clears Lc 60.
      const white = onTextIsWhite(apcaY(s.r, s.g, s.b), s.L, s.C, s.H, false)
      return { s, white }
    }

    const lightHlL = (rl: number) => perceptualRungL(rl, lightHlC(rl, lightHueAt(rl)), lightHueAt(rl))
    const hl = placeRung(9, lightHlL(HIGHLIGHT_LIGHT.rootL), lightHueAt, lightHlC)
    const hl9 = hl.s
    const hl10 = rung(10, lightHlL(HIGHLIGHT_LIGHT.rootL10), lightHueAt, lightHlC)
    light.push(hl9, hl10)
    onHighlightIsWhite = hl.white

    const darkHueAt = (l: number) => torsionedHue(darkH, l, dark9L, gOffPath)
    const darkHlC = (l: number, h: number) =>
      opts?.darkChromaCurve
        ? clampChromaToGamut(l, opts.darkChromaCurve(l, h, brandC), h)
        : clampChromaToGamut(l, hlLadderC + u * (brandSat * HIGHLIGHT_LIGHT.satFraction * maxChromaAt(l, h) - hlLadderC), h)
    const dhl = placeRung(9, HIGHLIGHT_DARK.rootL, darkHueAt, darkHlC)
    const dhl9 = dhl.s
    const dhl10 = rung(10, HIGHLIGHT_DARK.rootL10, darkHueAt, darkHlC)
    dark.push(dhl9, dhl10)
    onHighlightIsWhiteDark = dhl.white
  }

  light.sort((a, b) => a.stop - b.stop)
  dark.sort((a, b) => a.stop - b.stop)

  return {
    name: scaleName, archetype, brandL, brandC, brandH, lFlip, lFillMax,
    onFillTextIsWhite, onFillTextIsWhiteDark, light, dark,
    cta, ctaHover, ctaDark, ctaHoverDark,
    onHighlightIsWhite, onHighlightIsWhiteDark,
    identityHex: hex.toUpperCase(),
  }
}

export function applyRedCoolRender(scale: GeneratedScale, enforceOnFillContrast: boolean): void {
  if (scale.brandC < HUE_NOISE_C) return
  const wRed = redCoolWeight(scale.brandH)
  if (wRed <= 1e-9) return
  const H = scale.brandH - RED_COOL_DEG * wRed

  scale.cta = makeStop(scale.cta.stop, scale.cta.L, scale.cta.C, H)
  scale.ctaHover = makeStop(scale.ctaHover.stop, scale.ctaHover.L, scale.ctaHover.C, H)
  if (enforceOnFillContrast && scale.onFillTextIsWhite) {
    const s9 = scale.cta
    if (contrastRatio(1.0, wcagY(s9.L, s9.C, s9.H)) < 4.5) {

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
): GeneratedScale {
  const h = ((brandH % 360) + 360) % 360
  const { r, g, b } = oklchToSrgbUnclamped(0.5, 0.006, h)
  const ch = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')
  const grayHex = `#${ch(r)}${ch(g)}${ch(b)}`
  const scale = generateScale(grayHex, 'neutral', 'light', {
    chromaCurve: neutralChromaCurve(brandH, level),
    highlight: true,
    enforceOnFillContrast: true,
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
  scale.onFillTextIsWhite = onTextIsWhite(apcaY(scale.cta.r, scale.cta.g, scale.cta.b), scale.cta.L, scale.cta.C, scale.cta.H, true)
  scale.onFillTextIsWhiteDark = onTextIsWhite(apcaY(scale.ctaDark.r, scale.ctaDark.g, scale.ctaDark.b), scale.ctaDark.L, scale.ctaDark.C, scale.ctaDark.H, true)
  return scale
}
