export interface StopSpec {
  rootL: number
  chromaMultiplier: number
}

// ── THE STOP-L SCAFFOLDS, KEYED BY STOP NUMBER ────────────────────────────────
// Stops 1–8 (paper→highlight-8) are a GEOMETRIC ladder — gaps grow ~1.25× per step — so every adjacent
// stop is distinct by construction and paper-2 falls onto its ID curve with no clamp (owner 2026-07-09,
// distribution "B"; separation is a shape property, not a delta — see spec.ts).
// (Normalized 2026-08-05: these were positional arrays carrying two RETIRED slots between stop 8 and
// the inks, kept alive as control points for the neutral tint interpolation. The tint curves now own
// their control points — neutralCurve.ts NEUTRAL_TINT_POINTS / SHAPE_POINTS, values verbatim — so the
// scaffolds are plain per-stop declarations and a renumber moves keys, never meanings.)
// Dark ink scaffolds dimmed 0.800/0.940 → 0.767/0.919 (owner midpoint pick, 2026-07-20): the shipped
// dark inks ran ~1.9× their light twins' WCAG contrast and the ink hierarchy flattened. Neutral
// midpoint = #b3b3b3 / #e4e4e4; every family re-solves off the scaffold through the perceptual
// placement, with the declared ink requires (spec.ts) as the floor.
// ink-10 (owner 2026-08-05, C49): the between text stop — the value cta-ink-hover used to
// generate bespokely, promoted to a normal stop the family aliases. Its rootLs are the
// midpoints of its neighbors' ((0.530+0.300)/2, (0.767+0.919)/2): the retired state-step
// law landed at 40–49% of the 9→11 gap (sweep-measured median 0.422 light / 0.834 dark),
// so the literal midpoint reproduces it within ~0.01 L while being a declaration, not a
// derivation off another stop.
export const ROOT_L_LIGHT: Record<number, number> = {
  1: 0.987, 2: 0.970, 3: 0.950, 4: 0.924, 5: 0.892, 6: 0.852, 7: 0.801, 8: 0.738,
  9: 0.530, 10: 0.415, 11: 0.300,
}
export const ROOT_L_DARK: Record<number, number> = {
  1: 0.178, 2: 0.213, 3: 0.252, 4: 0.285, 5: 0.313, 6: 0.348, 7: 0.420, 8: 0.550,
  9: 0.767, 10: 0.843, 11: 0.919,
}

// The dark chroma-floor LADDER LAW: the floor a dark stop may not drop under, as a
// function of ladder depth (×floorStrength at runtime — applyChromaFloor, colorMath.ts).
// The surface band derives its floor from this law at its own depth (stop − 1, aligned by
// construction); the ink rows DECLARE their floors as values below, frozen at the rungs
// they have always occupied.
export const chromaFloorBase = (idx: number): number => 0.02 + (0.04 - 0.02) * (idx / 7)

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
// not move.
// inkMaxC = the TEXT REGISTER ceiling (C9/C11 ink round): ink chroma is the ID-relative
// multiplier NORMALIZED to the band register — min(inkMult × brandC, inkMaxC) — and the
// H-K placement solve consumes the normalized value, so lightness placement and apparent
// register follow from the pipeline (no emit-side cap). Muted brands sit below the
// ceiling untouched; the ceiling only trims the big-room hues (yellow-green worst).
// chromaFloor = the dark ink chroma floor, DECLARED AS THE VALUE ITSELF (normalized
// 2026-08-05; applyChromaFloor takes it verbatim, ×strength at runtime). It used to be
// an index into the band ladder formula — pinned at the physical rungs 10/11 across two
// renumbers, a deliberate stop-number mismatch (the 2026-07-10 trap). Declaring the
// value kills the index: there is nothing left for a renumber to move. The expressions
// preserve the exact historical floats (= chromaFloorBase(10) / chromaFloorBase(11)).
export interface ScaleChroma { base?: number; sat?: number; inkMult?: number; inkMaxC?: number; chromaFloor?: number }
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
  9: { inkMult: 0.95, inkMaxC: 0.150, chromaFloor: chromaFloorBase(10) },
  // ink-10 keeps the FIRST-text register (ink-9's row, C49): the retired hover law
  // evaluated ink-9's chroma register at the between L, so the same params reproduce it;
  // the damped strong register below belongs to the top text stop alone.
  10: { inkMult: 0.95, inkMaxC: 0.150, chromaFloor: chromaFloorBase(10) },
  11: { inkMult: 0.50, inkMaxC: 0.080, chromaFloor: chromaFloorBase(11) },
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
  9: { inkMult: 0.95, inkMaxC: 0.120, chromaFloor: chromaFloorBase(10) },
  10: { inkMult: 0.95, inkMaxC: 0.120, chromaFloor: chromaFloorBase(10) },
  11: { inkMult: 0.62, inkMaxC: 0.045, chromaFloor: chromaFloorBase(11) },
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
// PAPER-3 IN BOTH MODES (owner 2026-07-29: "it is a 3:1 contrast require on paper 3
// so inputs can be placed on any paper"). Paper-3 is the hardest plane in each mode:
// light's darkest paper, dark's lightest. The light ramp clamps its perceptual rung L
// down to this ceiling — the same kind of contrast bound the ink stops use
// (findMaxLForContrast); dark solves the same law as a declared require. ONE rule,
// one anchor, one number, both modes (reqtoken spec S8; the old dark-only S8_DARK at
// paper-2 is deleted).
// The "unbounded upward in dark" item C33 deferred to this round is CLOSED by that
// change: dark stop 8 was never riding free, it was being PLACED by the C24 7→8 carry
// floor (fired 366/366, worth 0.056–0.157 L). With the floor gone the require places
// it — 3.05 vs paper-3, worst 3.04 over 366 ramps — so it is bounded by its own law
// in both directions rather than by whatever the stop below it happens to do.
export const STOP_8_NONTEXT_CONTRAST = 3.0

// ── DARK BAND LIFT (owner-calibrated 2026-07-27; marks rounds 1–3, wcag-lane exhibits) ──
// The dark-surround eye compresses contrast (Bartleson–Breneman): the delta model's
// mirror-of-light separations read quieter in dark than the same separations read in
// light. Her picks: the surface band's apparent depth scales by a RAMP — ×1.25 at stop 2
// rising to ×1.75 at stop 7 (the "washes" candidate; flat ×2 was vetoed at the card/field
// seams, and a ×2 top inverted the 7→8 seam). Stops 1 and 8–10 carry NO lift: stop 8's
// 3:1 law re-solves against the lifted paper-3 on its own, and the inks are dark-native.
// (Both band-order floors are gone: stop 9's died with the highlight band and the 7→8 half
// was deleted 2026-07-29. The lift therefore no longer reaches stop 8 AT ALL — it used to,
// through that floor, which meant an illustration-facing wash decision silently moved the
// accessibility border. Changing these numbers is now purely a wash decision.)
// The lifted stop's VIRTUAL light twin moves with it — its
// chroma samples the light ladder's own chroma-at-depth relationship at the scaled depth
// (deltaLiftChroma; per seed, per hue — the cross-hue perceptualDarkC equalizer was tried
// for this and vetoed: it dusted strong-H-K hues ~30%).
// C28 RE-MARK (owner 2026-07-28, "half the lift looks right"): stops 2–3 below are her
// original 2026-07-27 ramp at HALF strength — 1 + (old−1)/2. The old ×1.25→1.75 was
// calibrated against APPARENT depth; the photometric ladder now supplies most of that
// loudness itself, so the same numbers over-applied and pushed wash-7 into the highlight
// band (7→8 seam collapse + a chroma peak at stop 7 — caught by dark-audit §A and
// smoothness `wobble`). Her exhibit compared full/half/quarter.
//
// ── WASHES 4–7 ARE NO LONGER A HAND RAMP (owner 2026-07-29) ──────────────────
// Owner's framing: dark has different surfaces, so its needs differ — the washes carry no
// contrast requirement but they still have to READ on paper, and flipped to dark they recede.
// *"4–7 probably do need to be higher than they are in light mode, but their distribution
// should be more analogous."*
//
// THE RAMP WAS SLOPING THE WRONG WAY. The lift is PROPORTIONAL on apparent depth from the
// ground, and depth is near zero at the top of the band. So a rising ramp delivered almost
// nothing where the recession actually was: measured as S = dark's contrast-vs-paper-1 over
// its light twin's, the old 1.225/1.275/1.325/1.375 produced S = 1.03 / 1.09 / 1.20 / 1.41.
// wash-4 got 3% and wash-7 got 41% — and `-bg-subtle` is wash-5. Turning the number up
// cannot fix it: even a flat ×5 lift only reaches S 3.3 at wash-4 against 9.7 at wash-7.
//
// SO THE BAND IS DECLARED IN CONTRAST SPACE, AT ONE S. Seam contrast between adjacent
// washes equals c_n/c_{n−1} in BOTH modes, where c is contrast against that mode's own
// paper — so a constant S cancels in the ratio and every seam ratio matches light's
// identically while the whole band sits S× further off the paper. One number, and the
// distribution comes out analogous by algebra rather than by luck.
//
// S = 1.20 IS WASH-6'S OWN CURRENT VALUE (her pick: "a lighter touch"). Choosing the pivot
// that way makes this a pure REDISTRIBUTION rather than a boost — wash-6 does not move at
// all (its solved lift comes back at 1.325, identical to shipped), washes 4 and 5 come up,
// wash-7 comes down. Contrast vs paper-1, median: wash-4 1.24→1.45, wash-5 1.45→1.60,
// wash-6 1.82→1.82, wash-7 2.53→2.16. Resulting seams 1.105/1.137/1.186 against light's
// 1.105/1.139/1.188. A full 1.40 was built and looked right on chips but read as too much
// in full-ramp context — her call.
//
// THE VALUES BELOW ARE SOLVED, NOT PICKED. Each is the per-stop lift that delivers S=1.20
// through the real pipeline, bisected on the agnostic median. Re-deriving them means
// re-running that solve, not nudging the digits — and the SHAPE is the finding: it must
// DECREASE down the band, because the operator it feeds is proportional.
// Accepted cost: the papers stay pinned by C27, so the whole raise lands on the single
// 3→4 seam where the band meets paper-3 — 1.107 → 1.295 (= light's 1.082 × S).
export const DARK_BAND_LIFT: Record<number, number> = {
  2: 1.125, 3: 1.175, 4: 1.818, 5: 1.521, 6: 1.325, 7: 1.190,
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
// the stop's L-axis scaffold; the L values live on only as tint-curve control points —
// neutralCurve.ts NEUTRAL_TINT_POINTS. DARK_NEUTRAL_L and its 0.66/0.72 mid anchors
// deleted with the 2026-08-05 normalization: the anchors sat in the two retired
// positions the dark spec never read — the dark neutral's ink rootLs come from
// ROOT_L_DARK like everything else.)

// INK-9 (owner 2026-07-29) is BOTH the first text stop and the emphasis FILL — the role
// highlight-9 used to hold. One stop, one bar: 4.5 against the nearest paper. Its
// on-color is no longer solved; it is a paper token (semantic.css `-fg-on-emphasis` →
// --paper-0, measured worst 4.96 light / 8.04 dark over the 360-seed agnostic sweep).
// Named by ROLE, not by stop number, so the next renumber cannot make the name lie.
export const INK_9_CONTRAST = 4.5

// ink-10, the BETWEEN text stop (C49): a floor that never fires on the current geometry —
// the perceptual placement at the midpoint rootL already reads 6.84:1+ vs paper-3 across
// the 360-seed sweep (dark 8.80+) — so the stop stays purely placed while the register is
// guaranteed. Sits between the 4.5 first-text bar and the 7.0 strong floor by design.
export const INK_10_CONTRAST = 6.5

export const INK_11_CONTRAST_FLOOR = 7.0

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
