export interface StopSpec {
  rootL: number
  chromaMultiplier: number
}

// Stops 1–8 (paper→highlight-8) are a GEOMETRIC ladder — gaps grow ~1.25× per step — so every adjacent
// stop is distinct by construction and paper-2 falls onto its ID curve with no clamp (owner 2026-07-09,
// distribution "B"; separation is a shape property, not a delta — see spec.ts). Indices 8–11 = highlight-9
// + ink scaffolds (index 9 = the retired stop-10 rootL, kept so the ink indices don't shift).
// Dark ink scaffolds (indices 10/11) dimmed 0.800/0.940 → 0.767/0.919 (owner midpoint pick, 2026-07-20):
// the shipped dark inks ran ~1.9× their light twins' WCAG contrast (ink-10 #bfbdbd 9.9:1 vs light 5.1:1)
// and the 10/11 hierarchy flattened. Neutral midpoint = #b3b3b3 / #e4e4e4; every family re-solves off the
// scaffold through the perceptual placement, with the declared T10/T11 requires (spec.ts) as the floor.
export const LIGHT_L = [0.987, 0.970, 0.950, 0.924, 0.892, 0.852, 0.801, 0.738, 0.600, 0.560, 0.530, 0.300]
export const DARK_L  = [0.178, 0.213, 0.252, 0.285, 0.313, 0.348, 0.420, 0.550, 0.600, 0.640, 0.767, 0.919]

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
// Stops 8–9 share one base register — the highlight family (C10, owner-approved
// 2026-07-09); s8 keeps its historical sat 0.78 (the approved rows are the target).
// inkMaxC = the TEXT REGISTER ceiling (C9/C11 ink round): ink chroma is the ID-relative
// multiplier NORMALIZED to the band register — min(inkMult × brandC, inkMaxC) — and the
// H-K placement solve consumes the normalized value, so lightness placement and apparent
// register follow from the pipeline (no emit-side cap). Muted brands sit below the
// ceiling untouched; the ceiling only trims the big-room hues (yellow-green worst).
export interface ScaleChroma { base?: number; sat?: number; inkMult?: number; inkMaxC?: number }
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
  10: { inkMult: 0.95, inkMaxC: 0.150 },
  11: { inkMult: 0.50, inkMaxC: 0.080 },
}
// Dark: sat = the dark subtle-chroma ladder (values verbatim — the fold is
// structure-only, byte-identical by contract); 9 declares the highlight params
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
  10: { inkMult: 0.95, inkMaxC: 0.120 },
  11: { inkMult: 0.62, inkMaxC: 0.045 },
}
// ── the DARK CTA chroma register (CATALOG C16, owner ruling 2026-07-12: "declare,
// don't change"). The cta is off-scale, so the SCALE_C tables never covered it; its
// dark chroma policy was a hidden per-caller boolean (loudCta) branching into curve
// constants. Same values, now DECLARED per family kind: brand = the trimmed register
// (identity chroma damped by the loudness lobes — darkCtaTrim in darkChromaCurve.ts
// computes from THESE numbers), signal = identity (canonical yellow/red dark ctas
// stay byte-identical to light — the retired flag's original purpose, unification
// ac81b36). register-audit binds the trim fn to this table and holds the signal
// identity invariant through the real pipeline.
export const DARK_CTA_C = {
  brand: {
    policy: 'trimmed' as const,
    globalTrim: 0.76,
    lobes: [
      { center: 265, width: 115, depth: 0.30 },   // blue
      { center: 345, width: 110, depth: 0.26 },   // red-magenta
    ],
  },
  signal: { policy: 'identity' as const },
}
export type DarkCtaKind = keyof typeof DARK_CTA_C
// ──────────────────────────────────────────────────────────────────────────────

// Stop 8 (highlight-8) carries the WCAG 1.4.11 non-text 3:1 guarantee against
// paper-2 (the scale's own stop 2). The light ramp clamps its perceptual rung L
// down to this ceiling — the same kind of contrast bound stops 10/11 already use
// (findMaxLForContrast). Dark stop 8 solves the SAME law as a declared require
// against the resolved dark paper-2 (reqtoken spec S8) — this clamp is the light half.
export const STOP_8_NONTEXT_CONTRAST = 3.0

// ── DARK BAND LIFT (owner-calibrated 2026-07-27; marks rounds 1–3, wcag-lane exhibits) ──
// The dark-surround eye compresses contrast (Bartleson–Breneman): the delta model's
// mirror-of-light separations read quieter in dark than the same separations read in
// light. Her picks: the surface band's apparent depth scales by a RAMP — ×1.25 at stop 2
// rising to ×1.75 at stop 7 (the "washes" candidate; flat ×2 was vetoed at the card/field
// seams, and a ×2 top inverted the 7→8 seam). Stops 1 and 8–11 carry NO lift: stop 8's
// 3:1 law re-solves against the lifted paper-2 on its own, stop 9 rides the band-order
// floor, inks are dark-native. The lifted stop's VIRTUAL light twin moves with it — its
// chroma samples the light ladder's own chroma-at-depth relationship at the scaled depth
// (deltaLiftChroma; per seed, per hue — the cross-hue perceptualDarkC equalizer was tried
// for this and vetoed: it dusted strong-H-K hues ~30%).
export const DARK_BAND_LIFT: Record<number, number> = {
  2: 1.25, 3: 1.35, 4: 1.45, 5: 1.55, 6: 1.65, 7: 1.75,
}

// ── DARK SHINE PARITY (owner-calibrated 2026-07-27, per-element marks + cusp confirm) ──
// The apparent instrument CREDITS high-H-K hues with shine, so equal-apparent placement
// leaves blues/purples physically darkest ("blues and purples need to brighten the most,
// greens yellows oranges the least"). Per stop, the depth measure blends toward plain-
// luminance parity: depth = (1−τ)·apparentDepth + τ·L*depth, τ = T[stop] · w(hue).
// T = her per-element marks (wash-7 none · wash-6 .33 · wash-4 ~.75 · papers full — a
// linear crossfade: the H-K credit is only as real as the chroma carrying it; near-page
// stops are near-neutral seams judged photometrically, top-of-band washes genuinely
// shine). w(hue) = the hue's INTRINSIC-register darkness from the gamut CUSP-LIGHTNESS
// curve (owner: "red is in the middle of the curve at the baseline, blue range is low,
// yellow range is high" — measured: blue .99 · purple .87 · red .63 · orange .46 ·
// green .22 · yellow .15; cuspDarknessW, pure geometry, no hand table).
export const DARK_SHINE_PARITY_T: Record<number, number> = {
  2: 1, 3: 1, 4: 0.75, 5: 0.5, 6: 0.25, 7: 0,
}

// The yellow hue band (used by audits to scope yellow-specific checks). The old YELLOW_L_LIFT.max
// lift value was never consumed anywhere and is deleted; only the band definition was live.
export const YELLOW_BAND = { centerH: 92, sigmaDeg: 20 }

// L-axis scaffolds only — chroma params live in the SCALE_C tables above.
// (rootL10 deleted with stop 10, owner 2026-07-09; the LIGHT_L/DARK_L arrays keep their shape — ink rootLs index them.)
export const HIGHLIGHT_LIGHT = { rootL: LIGHT_L[8] }
export const HIGHLIGHT_DARK = { rootL: DARK_L[8] }

const DARK_CHROMA_ANCHORS_MID = [0.66, 0.72]
export const DARK_NEUTRAL_L = [...DARK_L.slice(0, 8), ...DARK_CHROMA_ANCHORS_MID, DARK_L[10], DARK_L[11]]

export const STOP_10_CONTRAST = 4.5

export const STOP_11_CONTRAST_FLOOR = 7.0

// Dark fill min-L family — one concept (how light a fed dark fill may sit),
// parameterized by consumer via the `darkFillMinL` opt: DARK_STOP_9_MIN_L is the
// default floor; brands raise it for prominence (DARK_BRAND_FILL_MIN_L); signals
// override per-def in signals.ts (green 0.75, info 0.70). Kept as named constants
// (not one object) because the signal half is signal-identity data and belongs
// with the signal defs.
export const DARK_STOP_9_MIN_L = 0.63

export const DARK_BRAND_FILL_MIN_L = 0.70

// The neutral QUIET cta's dark clearance reads against the POP plane (dark
// paper-3 — the lightest dark surface its buttons sit on), never against black
// (owner 2026-07-27: the fed trio "cleared" ~1.3 on absolute black, a surface
// nothing renders on, while sitting an invisible ~1.07 off pop). The scale-fed
// trio lifts uniformly until the cta clears this WCAG ratio vs the resolved
// dark paper-3; light needs no lift — its fed cta already reads ~1.25 against
// its own white pop.
export const NEUTRAL_CTA_DARK_POP_CLEARANCE = 1.2


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
