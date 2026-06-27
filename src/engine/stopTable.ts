export interface StopSpec {
  rootL: number
  chromaMultiplier: number
}

export const LIGHT_L = [0.993, 0.982, 0.960, 0.936, 0.903, 0.860, 0.806, 0.738, 0.669, 0.599, 0.530, 0.300]
export const DARK_L  = [0.178, 0.213, 0.252, 0.285, 0.313, 0.348, 0.420, 0.550, 0.633, 0.717, 0.800, 0.940]

export const LIGHT_SAT = [0.50, 0.85, 0.95, 0.95, 0.92, 0.85, 0.78, 0.78]
export const LIGHT_STOPS: { rootL: number; satFraction: number }[] =
  LIGHT_L.slice(0, 8).map((rootL, i) => ({ rootL, satFraction: LIGHT_SAT[i] }))

export const LIGHT_BASE_C = [0.004, 0.010, 0.022, 0.039, 0.053, 0.068, 0.086, 0.112]

export const YELLOW_L_LIFT = { max: 0.03, centerH: 92, sigmaDeg: 20 }

export const HIGHLIGHT_LIGHT = { rootL: LIGHT_L[8], rootL10: LIGHT_L[9], baseC: 0.142, satFraction: 0.75 }
export const HIGHLIGHT_DARK = { rootL: DARK_L[8], rootL10: DARK_L[9] }

export const DARK_SUBTLE_CHROMA_MULT: number[] = [
  0.40, 0.52, 0.62, 0.68, 0.72, 0.76, 0.80, 0.84,
]

const DARK_CHROMA_ANCHORS_MID = [0.66, 0.72]
export const DARK_NEUTRAL_L = [...DARK_L.slice(0, 8), ...DARK_CHROMA_ANCHORS_MID, DARK_L[10], DARK_L[11]]

export const STOP_11 = { rootL: LIGHT_L[10], chromaMultiplier: 0.95 }
export const STOP_11_CONTRAST = 4.5

export const STOP_12 = { rootL: LIGHT_L[11], chromaMultiplier: 0.50 }
export const STOP_12_CONTRAST_FLOOR = 7.0

export const DARK_STOP_9_MIN_L = 0.63

export const DARK_BRAND_FILL_MIN_L = 0.70
export const DARK_STOP_11 = { rootL: 0.75, chromaMultiplier: 0.95 }
export const DARK_STOP_12 = { rootL: 0.94, chromaMultiplier: 0.62 }

export const DARK_COLLIDER_MUTED_L = 0.80
export const DARK_COLLIDER_MUTED_CHROMA_SCALE = 0.55

export const GOLD_SPINE: Array<[number, number]> = [
  [0.30, 47], [0.57, 50], [0.74, 71], [0.80, 88], [0.87, 103], [0.97, 110],
]
export const WARM_TORSION = {
  bandLo: 40,

  bandHi: 122,
  taperDeg: 10,
  travel: 0.55,
  capDeg: 24,
}

export const ILLUS_STOPS: StopSpec[] = [
  { rootL: 0.97, chromaMultiplier: 0.12 },
  { rootL: 0.88, chromaMultiplier: 0.70 },
  { rootL: 0.63, chromaMultiplier: 1.05 },
  { rootL: 0.47, chromaMultiplier: 0.80 },
]

export const REFERENCE_H = 245
