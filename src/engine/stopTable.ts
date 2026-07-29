export interface StopSpec {
  rootL: number
  chromaMultiplier: number
}

// Stops 1–8 (paper→highlight-8) are a GEOMETRIC ladder — gaps grow ~1.25× per step — so every adjacent
// stop is distinct by construction and paper-2 falls onto its ID curve with no clamp (owner 2026-07-09,
// distribution "B"; separation is a shape property, not a delta — see spec.ts). Indices 8–11 are the ink
// scaffolds and two RETIRED slots (8 = the deleted highlight-9 rootL, 9 = the older retired stop-10).
// ⚠️ THESE ARRAYS MUST KEEP THEIR SHAPE. Two independent things read them by POSITION, not by stop
// number: the ink rootLs below index them at 10/11, and neutralCurve.ts interpolates NEUTRAL_SHAPE
// against the whole array to place the neutral's tint at an arbitrary L. Dropping a retired slot would
// silently re-shape every neutral in the system. Retire slots in place; never splice.
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
// KEYED BY STOP NUMBER, so the 2026-07-29 collapse re-keyed the ink rows down with
// the stops (old 10/11 → 9/10) and deleted the old highlight-9 row. The VALUES did
// not move. `chromaFloorIndex` on the ink rows is the one thing that must NOT follow
// the renumber — see the field note below.
// inkMaxC = the TEXT REGISTER ceiling (C9/C11 ink round): ink chroma is the ID-relative
// multiplier NORMALIZED to the band register — min(inkMult × brandC, inkMaxC) — and the
// H-K placement solve consumes the normalized value, so lightness placement and apparent
// register follow from the pipeline (no emit-side cap). Muted brands sit below the
// ceiling untouched; the ceiling only trims the big-room hues (yellow-green worst).
// chromaFloorIndex = the dark ink chroma-FLOOR ladder position (applyChromaFloor:
// floor = (0.02 + 0.02·idx/7)·strength). It is a PHYSICAL ladder rung, not a name:
// it used to be `sp.stop` reused as an index, which is exactly the trap the 2026-07-10
// renumber documented (darkInkChromaAt's indices deliberately did not move with the
// stop numbers). Declared here so a future renumber cannot move it by accident.
export interface ScaleChroma { base?: number; sat?: number; inkMult?: number; inkMaxC?: number; chromaFloorIndex?: number }
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
  9: { inkMult: 0.95, inkMaxC: 0.150, chromaFloorIndex: 10 },
  10: { inkMult: 0.50, inkMaxC: 0.080, chromaFloorIndex: 11 },
}
// Dark: sat = the dark subtle-chroma ladder (values verbatim — the fold is
// structure-only, byte-identical by contract).
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
  9: { inkMult: 0.95, inkMaxC: 0.120, chromaFloorIndex: 10 },
  10: { inkMult: 0.62, inkMaxC: 0.045, chromaFloorIndex: 11 },
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

// Stop 8 (highlight-8) carries the WCAG 1.4.11 non-text 3:1 guarantee — against
// paper-3 in light (the highest plane a ring is drawn on), paper-2 in dark. The
// light ramp clamps its perceptual rung L down to this ceiling — the same kind of
// contrast bound the ink stops use (findMaxLForContrast). Dark stop 8 solves the
// SAME law as a declared require against the resolved dark paper-2 (reqtoken spec
// S8_DARK) — this clamp is the light half.
// ⚠️ UNBOUNDED UPWARD IN DARK since the collapse (owner 2026-07-29, KNOWN AND
// DEFERRED to the phase-2 dark round): the deleted highlight-9 was what dark stop 8
// was not allowed to ride past. It already sits at ~151% of this target, and
// bounding it in isolation would pre-empt the wash/highlight spacing decision.
export const STOP_8_NONTEXT_CONTRAST = 3.0

// ── DARK BAND LIFT (owner-calibrated 2026-07-27; marks rounds 1–3, wcag-lane exhibits) ──
// The dark-surround eye compresses contrast (Bartleson–Breneman): the delta model's
// mirror-of-light separations read quieter in dark than the same separations read in
// light. Her picks: the surface band's apparent depth scales by a RAMP — ×1.25 at stop 2
// rising to ×1.75 at stop 7 (the "washes" candidate; flat ×2 was vetoed at the card/field
// seams, and a ×2 top inverted the 7→8 seam). Stops 1 and 8–10 carry NO lift: stop 8's
// 3:1 law re-solves against the lifted paper-2 on its own, and the inks are dark-native.
// (The band-order floor that stop 9 rode died with the highlight band, 2026-07-29.)
// The lifted stop's VIRTUAL light twin moves with it — its
// chroma samples the light ladder's own chroma-at-depth relationship at the scaled depth
// (deltaLiftChroma; per seed, per hue — the cross-hue perceptualDarkC equalizer was tried
// for this and vetoed: it dusted strong-H-K hues ~30%).
// C28 RE-MARK (owner 2026-07-28, "half the lift looks right"): the values below are her
// original 2026-07-27 ramp at HALF strength — 1 + (old−1)/2. The ramp SHAPE is hers,
// unchanged; only the amount moved, because C28 changed what the number multiplies. The
// old ×1.25→1.75 was calibrated against APPARENT depth; the photometric ladder now
// supplies most of that loudness itself, so the same numbers over-applied and pushed
// wash-7 into the highlight band (7→8 seam collapse + a chroma peak at stop 7 — caught
// by dark-audit §A and smoothness `wobble`). Her exhibit compared full/half/quarter.
export const DARK_BAND_LIFT: Record<number, number> = {
  2: 1.125, 3: 1.175, 4: 1.225, 5: 1.275, 6: 1.325, 7: 1.375,
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

// (HIGHLIGHT_LIGHT/HIGHLIGHT_DARK deleted with highlight-9, owner 2026-07-29. They were
// the stop's L-axis scaffold — LIGHT_L[8] / DARK_L[8]. Those array slots stay: they are
// still control points for the neutral tint curve. See the array banner above.)

const DARK_CHROMA_ANCHORS_MID = [0.66, 0.72]
export const DARK_NEUTRAL_L = [...DARK_L.slice(0, 8), ...DARK_CHROMA_ANCHORS_MID, DARK_L[10], DARK_L[11]]

// INK-9 (owner 2026-07-29) is BOTH the first text stop and the emphasis FILL — the role
// highlight-9 used to hold. One stop, one bar: 4.5 against the nearest paper. Its
// on-color is no longer solved; it is a paper token (semantic.css `-fg-on-emphasis` →
// --paper-0, measured worst 4.96 light / 8.04 dark over the 360-seed agnostic sweep).
// Named by ROLE, not by stop number, so the next renumber cannot make the name lie.
export const INK_9_CONTRAST = 4.5

export const INK_10_CONTRAST_FLOOR = 7.0

// Dark fill min-L family — one concept (how light a fed dark fill may sit),
// parameterized by consumer via the `darkFillMinL` opt: DARK_CTA_MIN_L is the
// default floor; brands raise it for prominence (DARK_BRAND_FILL_MIN_L); signals
// override per-def in signals.ts (green 0.75, info 0.70). Kept as named constants
// (not one object) because the signal half is signal-identity data and belongs
// with the signal defs.
// (Was DARK_STOP_9_MIN_L — renamed 2026-07-29. It is the off-scale CTA role's floor
// and always was; the old name came from the dead prototype pairing "stop 9 = cta"
// and would have read as a reference to the stop this round deletes.)
export const DARK_CTA_MIN_L = 0.63

export const DARK_BRAND_FILL_MIN_L = 0.70

// The neutral QUIET cta's dark clearance reads against the POP plane (dark
// paper-3 — the lightest dark surface its buttons sit on), never against black
// (owner 2026-07-27: the fed trio "cleared" ~1.3 on absolute black, a surface
// nothing renders on, while sitting an invisible ~1.07 off pop). The scale-fed
// trio lifts uniformly until the cta clears this WCAG ratio vs the resolved
// dark paper-3; light needs no lift — its fed cta already reads ~1.25 against
// its own white pop.
// C28 SIGNAL WARM DRIFT (owner 2026-07-28, "warning is supposed to be rotating warm"):
// the warm/gold spine drift is an L-DEPENDENT correction, but the delta model carries
// hue verbatim from the light twin — so a dark stop sat at yellow-for-a-LIGHT-stop and
// warning read olive (and chroma-starved: it was at 100% of the ceiling AT THE WRONG
// HUE). Dark SIGNAL stops re-derive the same light drift law at their own dark L, at
// this fraction — owner picked the conservative ⅓ from the four-way exhibit.
// SIGNALS ONLY (owner ruling: "the brands shouldn't rotate") — a brand's identity hue
// is mode-stable by design; a signal's job is to read correctly at its own lightness.
// The lemon variant self-excludes: C8's cool-edge taper (WARM_TORSION / LIGHT_DRIFT_
// COOL_HI) zeroes the drift past H104, so lemon holds its identity hue — verified
// byte-identical. Reuse ctx.lightHueAt (the law WITH its tapers), never the raw spine.
export const DARK_SIGNAL_WARM_DRIFT = 1 / 3

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
