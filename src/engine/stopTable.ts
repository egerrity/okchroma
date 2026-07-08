export interface StopSpec {
  rootL: number
  chromaMultiplier: number
}

export const LIGHT_L = [0.993, 0.982, 0.960, 0.936, 0.903, 0.860, 0.806, 0.738, 0.600, 0.560, 0.530, 0.300]
export const DARK_L  = [0.178, 0.213, 0.252, 0.285, 0.313, 0.348, 0.420, 0.550, 0.600, 0.640, 0.800, 0.940]

// ─── THE SCALE CHROMA TABLE ───────────────────────────────────────────────────
// The single declared source of per-stop chroma parameters, one table per mode
// (owner round 2026-07-09: the scale is ONE ramp — no stitched-together band
// mechanisms; CATALOG C10). Replaces and DELETES the former stitched constants
// (the LIGHT_BASE_C ladder · HIGHLIGHT_LIGHT.baseC/satFraction · STOP_11/12
// chromaMultiplier · DARK_SUBTLE_CHROMA_MULT · DARK_STOP_11/12): a second chroma
// mechanism now has to be added here, visibly, and audit:register fails until a
// deviation is attributable to a declared requirement.
// Fields: base = the register curve the H-K placement solve consumes (its C(L)
// input); sat = the per-stop share of the room envelope (brandSat × maxChromaAt —
// ALL hue awareness is generative: the room envelope, the gamut ceiling, and the
// contrast requires; the base is deliberately hue-agnostic); inkMult = the ink
// stops' ID-relative multiplier semantics, declared here pending the C9/C11 ink
// round (which may normalize ink to a text register).
// Stops 8–10 share one base register — the highlight family (C10, owner-approved
// 2026-07-09); s8 keeps its historical sat 0.78 (the approved rows are the target).
export interface ScaleChroma { base?: number; sat?: number; inkMult?: number }
export const SCALE_C_LIGHT: Record<number, ScaleChroma> = {
  0: { base: 0.000, sat: 0.00 },
  1: { base: 0.004, sat: 0.50 },
  2: { base: 0.010, sat: 0.85 },
  3: { base: 0.022, sat: 0.95 },
  4: { base: 0.039, sat: 0.95 },
  5: { base: 0.053, sat: 0.92 },
  6: { base: 0.068, sat: 0.85 },
  7: { base: 0.086, sat: 0.78 },
  8: { base: 0.142, sat: 0.78 },
  9: { base: 0.142, sat: 0.75 },
  10: { base: 0.142, sat: 0.75 },
  11: { inkMult: 0.95 },
  12: { inkMult: 0.50 },
}
// Dark: sat = the dark subtle-chroma ladder (values verbatim — the fold is
// structure-only, byte-identical by contract); 9/10 declare the highlight params
// the engine already reused from light (was HIGHLIGHT_LIGHT via spec).
export const SCALE_C_DARK: Record<number, ScaleChroma> = {
  0: { sat: 0.40 },
  1: { sat: 0.40 },
  2: { sat: 0.52 },
  3: { sat: 0.62 },
  4: { sat: 0.68 },
  5: { sat: 0.72 },
  6: { sat: 0.76 },
  7: { sat: 0.80 },
  8: { sat: 0.84 },
  9: { base: 0.142, sat: 0.75 },
  10: { base: 0.142, sat: 0.75 },
  11: { inkMult: 0.95 },
  12: { inkMult: 0.62 },
}
// ──────────────────────────────────────────────────────────────────────────────

// Stop 8 (highlight-8) carries the WCAG 1.4.11 non-text 3:1 guarantee against
// paper-2 (the scale's own stop 2). The light ramp clamps its perceptual rung L
// down to this ceiling — the same kind of contrast bound stops 11/12 already use
// (findMaxLForContrast). Dark stop 8 clears 3:1 from DARK_L[7] directly, so the
// clamp is light-only.
export const STOP_8_NONTEXT_CONTRAST = 3.0

// The yellow hue band (used by audits to scope yellow-specific checks). The old YELLOW_L_LIFT.max
// lift value was never consumed anywhere and is deleted; only the band definition was live.
export const YELLOW_BAND = { centerH: 92, sigmaDeg: 20 }

// L-axis scaffolds only — chroma params live in the SCALE_C tables above.
export const HIGHLIGHT_LIGHT = { rootL: LIGHT_L[8], rootL10: LIGHT_L[9] }
export const HIGHLIGHT_DARK = { rootL: DARK_L[8], rootL10: DARK_L[9] }

const DARK_CHROMA_ANCHORS_MID = [0.66, 0.72]
export const DARK_NEUTRAL_L = [...DARK_L.slice(0, 8), ...DARK_CHROMA_ANCHORS_MID, DARK_L[10], DARK_L[11]]

export const STOP_11_CONTRAST = 4.5

export const STOP_12_CONTRAST_FLOOR = 7.0

// Dark fill min-L family — one concept (how light a fed dark fill may sit),
// parameterized by consumer via the `darkFillMinL` opt: DARK_STOP_9_MIN_L is the
// default floor; brands raise it for prominence (DARK_BRAND_FILL_MIN_L); signals
// override per-def in signals.ts (green 0.75, info 0.70). Kept as named constants
// (not one object) because the signal half is signal-identity data and belongs
// with the signal defs.
export const DARK_STOP_9_MIN_L = 0.63

export const DARK_BRAND_FILL_MIN_L = 0.70

export const DARK_COLLIDER_MUTED_L = 0.80
export const DARK_COLLIDER_MUTED_CHROMA_SCALE = 0.55

export const GOLD_SPINE: Array<[number, number]> = [
  [0.30, 47], [0.57, 50], [0.74, 71], [0.80, 88], [0.87, 103], [0.97, 110],
]
// The dark torsion's hue weight is a DECLARED CURVE (owner design 2026-07-08, CATALOG
// C8 verdict 1): warm drift is identity-consistent for oranges, tolerable through the
// macaroni yellows, and wrong for the cool yellows — so the weight is full from the
// orange edge through H88 and ZERO by H104 (lemon holds its identity hue in dark; only
// the low-L pigment physics remains). Replaces the old flat band 40–122 with edge
// tapers — same mechanism class as GOLD_SPINE (piecewise-linear, hue-keyed).
export const WARM_TORSION = {
  weight: [[40, 0], [50, 1], [88, 1], [104, 0]] as Array<[number, number]>,
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
