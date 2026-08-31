export interface StopSpec {
  rootL: number
  chromaMultiplier: number
}

// ── THE STOP-L SCAFFOLDS, KEYED BY STOP NUMBER ────────────────────────────────
// Stops 1–8 (paper→wax-74) are a GEOMETRIC ladder — gaps grow ~1.25× per step — so every adjacent
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

// Stop 8 (wax-74) carries the WCAG 1.4.11 non-text 3:1 guarantee — against
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

// ── THE DARK BAND ANCHOR (owner round 2026-08-13, the smoothing) ──────────────
// The six per-stop solved lifts (C24 marks → C28 half-strength → C37 wash
// redistribution) are RETIRED. C37 declared washes 4–7 in contrast space at one S so
// their seam ratios match light's by algebra, but with the papers pinned (C27) the
// whole raise landed on the single paper-95→wash-92 seam (contrast 1.107 → 1.295,
// recorded then as the accepted cost). This round extends the same law across the
// WHOLE band, papers included, every family including the neutral (owner: "one rule
// for everything"): the interior is placed by light's log-contrast distribution
// (shipped-Y, achromatic scaffold — the C28 one-dialect basis) between two held
// anchors, the dark ground (paper-100's scaffold) and the band top. The constant
// below IS the top anchor: wash-80's shipped C37 stop-7 lift, verbatim — wash-80
// does not move. The interior lifts are COMPUTED (producers.smoothedBandLift), so
// there is nothing left to hand-maintain: this one number sets the band's loudness,
// and the shape comes out analogous to light's by construction. The C27 paper pin
// is retired with it; the planes ride the papers.
// (DARK_SHINE_PARITY_T deleted with its last consumer — C28's one dialect had
// already retired it from the band; CATALOG C24 keeps the record.)
export const DARK_BAND_TOP_LIFT = 1.190

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

// ink-10, the BETWEEN text stop — THE WASH-80 LAW (guarantee-groups round, owner
// 2026-08-27): 4.5 anchored at wash-80 (stop 7), the darkest wash, so "ink-42 is usable
// on every wash" is a guarantee rather than a near-miss (the pre-law worst was 4.25 on
// wash-80, positive lane, light). Replaces the old 6.5-vs-paper-97 declaration, a floor
// that never fired on the geometry; the paper-97 fact still holds after this law (the
// solve only darkens) and guarantee-audit pins the full group matrix. Light-only in
// effect: the dark scaffold clears everywhere, so dark stays byte-identical.
export const INK_10_CONTRAST = 4.5

export const INK_11_CONTRAST_FLOOR = 7.0

// THE INK-30 GROUND (owner round 2026-08-19): the inverse link family is text on an
// INVERTED surface — an ink-30 fill, not a paper — so its ink requires anchor here
// instead of at a paper of their own ramp. Same doctrine as NEUTRAL_P3_WORST_SHIP_Y
// (requirements/resolve.ts): a cross-family bound frozen at the worst surface any theme
// can put on screen, so "the inverse link is usable on every ink-30" is a law rather
// than a per-theme hope. Stored as the COLOR, not a Y — each lane derives its own
// measure (shippedY for wcag, apcaY for apca) and the shipped-pair floor needs the
// anchor's own 8-bit rendition.
//   light = the LIGHTEST light-mode ink-30 — light text on it is the binding case, and
//           clearing the lightest ground clears every darker one.
//   dark  = the DARKEST dark-mode ink-30 — the mirror.
// PER LANE (like signalScalesFor — a lane's themes only ever ship that lane's surfaces,
// so each lane is judged against its own worst; one shared bound was tried and the wcag
// lane's darker dark-worst put the apca pressed bar, Lc for the strong text rung, past
// the black pole's ceiling on a ground the apca lane never ships). The light worsts
// coincide today (the same olive-band seed binds both lanes); stated per lane anyway so
// a divergence is a value edit, not a shape change.
// Measured 2026-08-19 over hue 0..355 x C 0.02..0.24 x L 0.40..0.90, every NeutralLevel x
// hue, and the signal set, per lane, via resolveBrand/generateNeutralScale -> stopHex.
// RE-DERIVE if the ink ladder, the ink chroma floors, or the neutral curve moves —
// reqtoken-audit's ground-bound tripwire catches an escape on its own sweep.
// Shipped renditions: light #3c3800 (Y 0.037890) both lanes · dark wcag #e1dbfc
// (Y 0.736989) · dark apca #ceedd6 (Y 0.785452).
export const INK_30_GROUND = {
  wcag: {
    light: { L: 0.3334966864733433, C: 0.07399966383476321, H: 104.26776675496032 },
    dark: { L: 0.907688606079988, C: 0.045, H: 293.66431934911327 },
  },
  apca: {
    light: { L: 0.3334966864733433, C: 0.07399966383476321, H: 104.26776675496032 },
    dark: { L: 0.9183200227624329, C: 0.045, H: 153.30922413895024 },
  },
} as const

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

// The neutral QUIET cta's dark clearance reads against the HIGH plane (dark
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
