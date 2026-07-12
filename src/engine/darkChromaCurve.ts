import { perceptualDarkC } from './perceptualL'
import { DARK_CTA_C } from './stopTable'

const rad = (d: number) => (d * Math.PI) / 180
const norm = (h: number) => ((h % 360) + 360) % 360
const angDist = (h: number, c: number) => Math.abs((((h - c + 540) % 360)) - 180)
const lobe = (h: number, c: number, w: number) => Math.pow(Math.max(0, Math.cos(rad((90 * angDist(h, c)) / w))), 1.5)

// the brand trim computes from the DECLARED register (DARK_CTA_C, C16) — no local constants
const loudnessCap = (H: number): number => {
  const h = norm(H)
  const b = DARK_CTA_C.brand
  return b.globalTrim * (1 - Math.max(...b.lobes.map(l => l.depth * lobe(h, l.center, l.width))))
}

export const darkChromaCurve = (L: number, H: number, brandC: number, _ctaC?: number): number =>
  perceptualDarkC(L, H, brandC)

export const darkCtaTrim = (H: number): number => 1 - 0.5 * (1 - loudnessCap(H))
