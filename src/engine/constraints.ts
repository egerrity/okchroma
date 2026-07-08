
// ── master gamut (P3-DESIGN.md §4) ────────────────────────────────────────────────
// Every generation-side judgment (Y, clamp, H-K) takes a Gamut defaulting to
// MASTER_GAMUT; emit-side conversions (oklchToSrgbUnclamped, hex) stay sRGB by
// construction. Flipping this constant to 'p3' is the Phase-B switch (one-shot
// re-bless). The sRGB code paths below are the shipped expressions VERBATIM — the
// P3 paths are separate branches, never substitutes: even mathematically equivalent
// matrix chains differ ~1e-4 in XYZ (measured, P3-DESIGN.md §1d).
export type Gamut = 'srgb' | 'p3'
export const MASTER_GAMUT: Gamut = 'srgb'

export function oklchToLinearRgb(L: number, C: number, H: number): [number, number, number] {
  const h = (H * Math.PI) / 180
  const a = C * Math.cos(h)
  const b = C * Math.sin(h)
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b
  const l3 = l_ ** 3, m3 = m_ ** 3, s3 = s_ ** 3
  return [
     4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3,
  ]
}

// OKLab M1⁻¹ (Ottosson): exact XYZ(D65), basis-free — valid outside sRGB (no channel
// crush), so it serves any wide-gamut branch.
export function oklchToXyz(L: number, C: number, H: number): [number, number, number] {
  const h = (H * Math.PI) / 180
  const a = C * Math.cos(h)
  const b = C * Math.sin(h)
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b
  const l3 = l_ ** 3, m3 = m_ ** 3, s3 = s_ ** 3
  return [
    1.2270138511 * l3 - 0.5577999807 * m3 + 0.2812561490 * s3,
    -0.0405801784 * l3 + 1.1122568696 * m3 - 0.0716766787 * s3,
    -0.0763812845 * l3 - 0.4214819784 * m3 + 1.5861632204 * s3,
  ]
}

// XYZ(D65) → linear Display-P3
export function oklchToLinearP3(L: number, C: number, H: number): [number, number, number] {
  const [x, y, z] = oklchToXyz(L, C, H)
  return [
    2.4934969119 * x - 0.9313836179 * y - 0.4027107845 * z,
    -0.8294889696 * x + 1.7626640603 * y + 0.0236246858 * z,
    0.0358458302 * x - 0.0761723893 * y + 0.9568845240 * z,
  ]
}

export const linearChannels = (L: number, C: number, H: number, gamut: Gamut): [number, number, number] =>
  gamut === 'p3' ? oklchToLinearP3(L, C, H) : oklchToLinearRgb(L, C, H)

// gamma-encoded channels in the gamut's OWN basis (display-p3 shares the sRGB transfer
// curve) — the channel source for apcaY under any gamut. The Phase-B flip must route
// apcaYAt and the on-text channel sites through this (P3-DESIGN.md §4B): feeding
// sRGB-encoded channels to the P3 coefficient set is a mixed basis, neither gamut's Lc.
export function encodedChannels(L: number, C: number, H: number, gamut: Gamut = MASTER_GAMUT): [number, number, number] {
  const [r, g, b] = linearChannels(L, C, H, gamut)
  const gm = (c: number) => c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055
  return [gm(r), gm(g), gm(b)]
}

export function wcagY(L: number, C: number, H: number, gamut: Gamut = MASTER_GAMUT): number {
  if (gamut === 'p3') {
    // Y row of linear-P3 → XYZ; same negative-channel crush pattern as the sRGB path
    const [r, g, b] = oklchToLinearP3(L, C, H)
    return 0.2289745641 * Math.max(0, r) + 0.6917385218 * Math.max(0, g) + 0.0792869141 * Math.max(0, b)
  }
  const [r, g, b] = oklchToLinearRgb(L, C, H)
  return 0.2126 * Math.max(0, r) + 0.7152 * Math.max(0, g) + 0.0722 * Math.max(0, b)
}

export function contrastRatio(Y1: number, Y2: number): number {
  const lighter = Math.max(Y1, Y2)
  const darker = Math.min(Y1, Y2)
  return (lighter + 0.05) / (darker + 0.05)
}

export function findLForY(targetY: number, C: number, H: number, gamut: Gamut = MASTER_GAMUT): number {
  let lo = 0.005, hi = 0.999
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2
    wcagY(mid, C, H, gamut) < targetY ? (lo = mid) : (hi = mid)
  }
  return (lo + hi) / 2
}

export function findLForContrast(
  startL: number,
  C: number,
  H: number,
  bgY: number,
  targetContrast: number,
  gamut: Gamut = MASTER_GAMUT
): number {
  if (contrastRatio(wcagY(startL, C, H, gamut), bgY) >= targetContrast) return startL
  let lo = 0.05, hi = startL
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2
    contrastRatio(wcagY(mid, C, H, gamut), bgY) >= targetContrast ? (lo = mid) : (hi = mid)
  }
  return lo
}

// channels must be the GAMUT's own gamma-encoded components (display-p3 shares the
// sRGB transfer curve); the coefficient set is basis-dependent — same color reads up
// to 0.0105 apart between bases (P3-DESIGN.md §1d, owner D2: pole judgments go P3)
export function apcaY(r: number, g: number, b: number, gamut: Gamut = MASTER_GAMUT): number {
  const ch = (c: number) => Math.min(1, Math.max(0, c)) ** 2.4
  if (gamut === 'p3') return 0.2289829595 * ch(r) + 0.6917492626 * ch(g) + 0.0792677779 * ch(b)
  return 0.2126729 * ch(r) + 0.7151522 * ch(g) + 0.0721750 * ch(b)
}

export function apcaLc(txtY: number, bgY: number): number {
  const fclamp = (Y: number) => (Y > 0.022 ? Y : Y + (0.022 - Y) ** 1.414)
  const tY = fclamp(txtY)
  const bY = fclamp(bgY)
  if (Math.abs(bY - tY) < 0.0005) return 0
  if (bY > tY) {
    const sapc = (bY ** 0.56 - tY ** 0.57) * 1.14
    return sapc < 0.1 ? 0 : (sapc - 0.027) * 100
  }
  const sapc = (bY ** 0.65 - tY ** 0.62) * 1.14
  return sapc > -0.1 ? 0 : (sapc + 0.027) * 100
}

export function findMaxLForContrast(C: number, H: number, bgY: number, targetContrast: number, gamut: Gamut = MASTER_GAMUT): number {
  let lo = 0.005, hi = 0.999
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2
    contrastRatio(wcagY(mid, C, H, gamut), bgY) >= targetContrast ? (lo = mid) : (hi = mid)
  }
  return lo
}

export function clampChromaToGamut(L: number, C: number, H: number, gamut: Gamut = MASTER_GAMUT): number {
  const inGamut = (c: number) => {
    const [r, g, b] = linearChannels(L, c, H, gamut)
    return r >= -1e-4 && r <= 1.0001 && g >= -1e-4 && g <= 1.0001 && b >= -1e-4 && b <= 1.0001
  }
  if (inGamut(C)) return C
  let lo = 0, hi = C
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2
    inGamut(mid) ? (lo = mid) : (hi = mid)
  }
  return lo
}
