import { perceptualDarkC } from './perceptualL'

const rad = (d: number) => (d * Math.PI) / 180
const norm = (h: number) => ((h % 360) + 360) % 360
const angDist = (h: number, c: number) => Math.abs((((h - c + 540) % 360)) - 180)
const lobe = (h: number, c: number, w: number) => Math.pow(Math.max(0, Math.cos(rad((90 * angDist(h, c)) / w))), 1.5)

const GLOBAL_TRIM = 0.76
const BLUE_DEPTH = 0.30
const REDMAG_DEPTH = 0.26

const loudnessCap = (H: number): number => {
  const h = norm(H)
  return GLOBAL_TRIM * (1 - Math.max(BLUE_DEPTH * lobe(h, 265, 115), REDMAG_DEPTH * lobe(h, 345, 110)))
}

export const darkChromaCurve = (L: number, H: number, brandC: number, _ctaC?: number): number =>
  perceptualDarkC(L, H, brandC)

export const darkCtaTrim = (H: number): number => 1 - 0.5 * (1 - loudnessCap(H))
