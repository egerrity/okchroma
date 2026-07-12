// p3-math.ts — P3-basis math for the P3 master-gamut instruments (P3-DESIGN.md).
// Since Phase A the ENGINE owns the P3 branches (constraints.ts / perceptualL.ts take a
// Gamut parameter); this module is a thin instrument-facing wrapper so the sweeps
// exercise the engine's own P3 code — one copy, no drift. Original standalone
// implementations lived here pre-Phase-A (git history) and were verified to reproduce
// the recorded P3-DESIGN.md §1 numbers through these delegations.
import {
  oklchToXyz, oklchToLinearP3, clampChromaToGamut, apcaY,
} from '../../../src/engine/constraints'
import {
  apparentL, solveLForApparent, solveCForApparent, perceptualRungL, perceptualDarkC,
  meanBoost, KEEP_LIGHT, KEEP_DARK,
} from '../../../src/engine/perceptualL'

export { oklchToXyz, oklchToLinearP3 }
export const trueY = (L: number, C: number, H: number) => oklchToXyz(L, C, H)[1]

export const clampChromaToGamutP3 = (L: number, C: number, H: number) => clampChromaToGamut(L, C, H, 'p3')
export const maxChromaAtP3 = (L: number, H: number) => clampChromaToGamutP3(L, 0.52, H)

// display-p3 uses the sRGB transfer curve
export const gmEnc = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.max(0, c) ** (1 / 2.4) - 0.055)

// APCA screen luminance, P3 basis. NOTE (P3-DESIGN.md §1d): apcaY is basis-DEPENDENT —
// the same in-gamut color reads up to 0.0105 different through P3 vs sRGB primaries
// (≈1–1.5 Lc). Owner ruling D2: pole judgments track the P3 basis at Phase B.
export function apcaYP3(L: number, C: number, H: number): number {
  const [r, g, b] = oklchToLinearP3(L, C, H)
  return apcaY(gmEnc(r), gmEnc(g), gmEnc(b), 'p3')
}

export const apparentLP3 = (L: number, C: number, H: number) => apparentL(L, C, H, 'p3')
export const solveLForApparentP3 = (target: number, C: number, H: number) => solveLForApparent(target, C, H, 'p3')
export const solveCForApparentP3 = (L: number, H: number, target: number) => solveCForApparent(L, H, target, 'p3')
export const perceptualRungLP3 = (rootL: number, C: number, H: number) => perceptualRungL(rootL, C, H, KEEP_LIGHT, 'p3')
export const perceptualDarkCP3 = (L: number, H: number, nativeC: number) => perceptualDarkC(L, H, nativeC, KEEP_DARK, 'p3')

export const meanBoostP3 = (rootL: number, C: number) => meanBoost(rootL, C, 'p3')
