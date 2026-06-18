// OKLCH → linear RGB (Björn Ottosson's matrices)
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

export function wcagY(L: number, C: number, H: number): number {
  const [r, g, b] = oklchToLinearRgb(L, C, H)
  return 0.2126 * Math.max(0, r) + 0.7152 * Math.max(0, g) + 0.0722 * Math.max(0, b)
}

export function contrastRatio(Y1: number, Y2: number): number {
  const lighter = Math.max(Y1, Y2)
  const darker = Math.min(Y1, Y2)
  return (lighter + 0.05) / (darker + 0.05)
}

export function findLForY(targetY: number, C: number, H: number): number {
  let lo = 0.005, hi = 0.999
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2
    wcagY(mid, C, H) < targetY ? (lo = mid) : (hi = mid)
  }
  return (lo + hi) / 2
}

export function findLForContrast(
  startL: number,
  C: number,
  H: number,
  bgY: number,
  targetContrast: number
): number {
  if (contrastRatio(wcagY(startL, C, H), bgY) >= targetContrast) return startL
  let lo = 0.05, hi = startL
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2
    contrastRatio(wcagY(mid, C, H), bgY) >= targetContrast ? (lo = mid) : (hi = mid)
  }
  return lo
}

// APCA-W3 (0.1.9 constants) lightness contrast. Returns Lc: positive for
// dark text on light bg, negative for light text on dark bg. Used for
// on-fill polarity, where WCAG 2.x overweights black on saturated mid-tone
// fills. apcaY uses APCA's simple 2.4 gamma, not the WCAG piecewise curve.
export function apcaY(r: number, g: number, b: number): number {
  const ch = (c: number) => Math.min(1, Math.max(0, c)) ** 2.4
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

export function computeLFlip(C: number, H: number): number {
  const whiteY = 1.0
  const blackY = 0.0
  let lo = 0.005, hi = 0.999
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2
    const Y = wcagY(mid, C, H)
    contrastRatio(whiteY, Y) > contrastRatio(blackY, Y) ? (lo = mid) : (hi = mid)
  }
  return (lo + hi) / 2
}

// Lightest L that meets targetContrast against bgY — searches the full range,
// so the result sits exactly at the ratio rather than overshooting darker.
// Used to anchor stops 11/12: their luminance uniformity across brands comes
// from each brand's stop 2 being luminance-equalized already.
export function findMaxLForContrast(C: number, H: number, bgY: number, targetContrast: number): number {
  let lo = 0.005, hi = 0.999
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2
    contrastRatio(wcagY(mid, C, H), bgY) >= targetContrast ? (lo = mid) : (hi = mid)
  }
  return lo
}

// Largest chroma at (L, H) that stays inside sRGB. Per-channel clipping of
// out-of-gamut colors distorts hue (saturated yellows turn khaki); reducing
// C along constant L/H keeps the hue true.
export function clampChromaToGamut(L: number, C: number, H: number): number {
  const inGamut = (c: number) => {
    const [r, g, b] = oklchToLinearRgb(L, c, H)
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

export function computeLFillMax(C: number, H: number): number {
  const whiteY = 1.0
  let lo = 0.005, hi = 0.999
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2
    contrastRatio(whiteY, wcagY(mid, C, H)) >= 3.0 ? (lo = mid) : (hi = mid)
  }
  return lo
}
