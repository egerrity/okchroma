// colorMath.ts — leaf module: the engine's shared color math and producer constants, hoisted VERBATIM from
// colorEngine.ts so the requirement-token resolver and the engine can share one implementation without an
// import cycle (colorEngine → reqtoken/resolve → colorMath). No formula here may change without a parity
// dump (scripts/p3-parity-dump.ts, before/after byte-compare) proving the output is byte-identical.
import { clampChromaToGamut, oklchToLinearRgb, apcaLc, contrastRatio, legalRatio, encodedChannels, MASTER_GAMUT, type Gamut } from './constraints'
import { GOLD_SPINE, WARM_TORSION } from './stopTable'

function goldSpineHueTable(L: number): number {
  const pts = GOLD_SPINE
  if (L <= pts[0][0]) return pts[0][1]
  for (let i = 1; i < pts.length; i++) {
    if (L <= pts[i][0]) {
      const [l0, h0] = pts[i - 1]
      const [l1, h1] = pts[i]
      return h0 + ((h1 - h0) * (L - l0)) / (l1 - l0)
    }
  }
  return pts[pts.length - 1][1]
}

export function goldSpineHue(L: number): number {
  return goldSpineHueTable(L)
}

// the declared hue→weight curve (WARM_TORSION.weight), piecewise-linear like the spine
function torsionWeight(brandH: number): number {
  const pts = WARM_TORSION.weight
  if (brandH <= pts[0][0]) return pts[0][1]
  for (let i = 1; i < pts.length; i++) {
    if (brandH <= pts[i][0]) {
      const [h0, w0] = pts[i - 1]
      const [h1, w1] = pts[i]
      return w0 + ((w1 - w0) * (brandH - h0)) / (h1 - h0)
    }
  }
  return pts[pts.length - 1][1]
}

export function torsionedHue(brandH: number, stopL: number, anchorL: number, offPathG: number): number {
  const { travel, capDeg } = WARM_TORSION
  const w = torsionWeight(brandH)
  if (w <= 0) return brandH
  const drift = travel * (goldSpineHue(stopL) - goldSpineHue(anchorL)) * w * offPathG
  return brandH + Math.max(-capDeg, Math.min(capDeg, drift))
}

export const SPINE_OFFPATH_SIGMA = 20

export const sigmoid = (x: number) => 1 / (1 + Math.exp(-x))
export const gauss = (x: number, sigma: number) => Math.exp(-0.5 * (x / sigma) ** 2)

export function hueDelta(h: number, center: number): number {
  let d = (h - center) % 360
  if (d > 180) d -= 360
  if (d < -180) d += 360
  return d
}

// OKLab euclidean distance between two OKLCH points — the type-2 register metric.
// Lives here (pure math) so the collision gate (stopDeltaE) and the cta repel producer
// share ONE implementation.
export function oklabDist(a: { L: number; C: number; H: number }, b: { L: number; C: number; H: number }): number {
  const rad = (h: number) => (h * Math.PI) / 180
  const a1 = a.C * Math.cos(rad(a.H)), b1 = a.C * Math.sin(rad(a.H))
  const a2 = b.C * Math.cos(rad(b.H)), b2 = b.C * Math.sin(rad(b.H))
  return Math.sqrt((a.L - b.L) ** 2 + (a1 - a2) ** 2 + (b1 - b2) ** 2)
}

// ── C12 RED-FAMILY GATE (owner-calibrated 2026-07-10 on raw button pairs; fit v5,
// 0/67 of her marks misclassified) ─────────────────────────────────────────────────
// The perceptual "confusable with the red signal" distance around red's cta. Plain OKLab
// distance does NOT line up with confusability (owner-measured): each axis carries its own
// weight — DARKER persists as danger (×0.65, the zone reaches ΔL .139), LIGHTER pinkifies
// fast (×1.6, ends at ΔL .057), DUST kills similarity fast (×1.4, ends at ΔC .065), the
// GOLD-side hue exit is faster than the magenta side (arc ×1.6 vs ×1 — orange leaves the
// family at ~22°, pink stays to ~27°), and MORE-saturated-than-red never exits (super-red
// is still red). One radius G gates firing AND release; releaseMargin is the solve headroom.
export const RED_GATE = {
  wDark: 0.65, wLight: 1.60, wDust: 1.40, wGoldArc: 1.60,
  G: 0.090, releaseMargin: 0.005,
} as const
export function redGateDist(c: { L: number; C: number; H: number }, red: { L: number; C: number; H: number }): number {
  const dh = ((c.H - red.H + 540) % 360) - 180   // signed: + gold-ward, − magenta-ward
  const meanC = 2 * Math.sqrt(Math.max(0, c.C) * Math.max(0, red.C))
  const arcMag = meanC * Math.sin(Math.abs(Math.min(0, dh)) * Math.PI / 360)
  const arcGold = meanC * Math.sin(Math.max(0, dh) * Math.PI / 360)
  return Math.hypot(
    RED_GATE.wDark * Math.max(0, red.L - c.L),
    RED_GATE.wLight * Math.max(0, c.L - red.L),
    RED_GATE.wDust * Math.max(0, red.C - c.C),
    Math.max(0, c.C - red.C),
    arcMag,
    RED_GATE.wGoldArc * arcGold,
  )
}

// ── C12 TREATMENT REGIONS (owner data 2026-07-10, proposal approved same day) ────────────
// Identity-keep box: brands whose IDENTITY is itself a credible error color (her Instrument-D
// error-core checks; lHi extended .58→.62 for the unruled vivid-L0.60 slice — veto-flagged and
// accepted at proposal). Membership is judged on the NOMINAL seed values so gamut clamping
// cannot eject vivid deep cells. Fired box members keep their cta — the RED moves instead.
export const RED_KEEP_BOX = { hLo: 20, hHi: 44, cMin: 0.18, lLo: 0.50, lHi: 0.62 } as const
export function inRedKeepBox(L: number, C: number, H: number): boolean {
  const h = ((H % 360) + 360) % 360
  return h >= RED_KEEP_BOX.hLo && h <= RED_KEEP_BOX.hHi && C >= RED_KEEP_BOX.cMin - 1e-9 &&
    L >= RED_KEEP_BOX.lLo && L <= RED_KEEP_BOX.lHi
}
// Vivid arc (owner 2026-07-10, anchors #FF7300…#FF0000…#FF006F — "move brand AND red"):
// the near-gamut-max warm arc around red. Independent of FIRING: even a non-confusable
// max-vivid neighbor vibrates beside canonical red (the P2 adjacency problem), so red takes
// a per-brand variant here regardless — and the brand ALSO self-exits when it fires.
// Her anchors measure vividness .88–.90; bounds derived from them, flagged for her veto.
export const RED_VIVID_ARC = { hLo: 5, hHi: 50, vividMin: 0.85, lLo: 0.55, lHi: 0.75 } as const
export function inRedVividArc(L: number, C: number, H: number): boolean {
  const h = ((H % 360) + 360) % 360
  if (h < RED_VIVID_ARC.hLo || h > RED_VIVID_ARC.hHi) return false
  if (L <= RED_VIVID_ARC.lLo || L > RED_VIVID_ARC.lHi) return false
  return C / maxChromaAt(L, h) >= RED_VIVID_ARC.vividMin
}

// ── C12 v8 — THE JOINT SOLVE (owner-settled 2026-07-10, "as close as we will ever get";
// full model = scripts/c12-session/joint-solve-model.md; every constant below is her
// verdict-calibrated candidate from the accepted 50-row exhibit) ──────────────────────────
// A (error-look): a brand whose cta sits inside the true-red region exits via the NEAREST
// release edge — severity = depth into the region. B (vibration): the RED signal complements
// from her calibrated zones, opposite side of the brand. Two movers, one geometry.
export const RED_SOLVE = {
  // the region: her v7 metric widened dark-ward + the dead-zone lip (nothing lands on it,
  // nothing de-collides from it)
  wDark: 0.60, ring: 0.020,
  // direction rules: noticeably-magenta lightens (unless deep) · gold-side vivid flips to
  // bright orange · on-hue vivid takes the big dark throw · else nearest edge
  magentaDh: -14, magentaMinL: 0.53, magentaUpRatio: 2.5,
  vividMin: 0.85, goldDh: 1.5, vividMinL: 0.53,
  // the BRICK band: rusty-to-brick mid-dark vivid warms still read conflict-y (browns and
  // magentas at this depth are fine); warm members are IN-REGION, dark landings must not
  // park there → the DIAGONAL (soft cool + slight desat + extra depth, never the hard cool)
  brickHLo: 20, brickHHi: 50, brickLLo: 0.36, brickLHi: 0.52, brickVividMin: 0.55,
  brickCool: -4, brickCoolGold: -3, brickDesat: 0.85, brickExtraDeep: 0.02,
  // red's usable zones (her density map, error-range-checks.json): deep core or the light
  // edge tier — the .50-.58 middle is ring territory, canonical itself lives there, so a
  // lightened brand ALWAYS gets a deep-core red. Cool-first beside warm brands.
  coreL: [0.49, 0.47, 0.45], edgeL: [0.65, 0.68, 0.71, 0.75],
  redHuesWarmBrand: [28, 24, 33.3, 38], redHuesMagentaBrand: [33.3, 38, 28],
  redHueMagentaDh: -15,
} as const
// the v8 SOLVE metric: her v7 confusability shape with the widened dark reach
export function redSolveDist(c: { L: number; C: number; H: number }, red: { L: number; C: number; H: number }): number {
  const dh = ((c.H - red.H + 540) % 360) - 180
  const meanC = 2 * Math.sqrt(Math.max(0, c.C) * Math.max(0, red.C))
  const arcMag = meanC * Math.sin(Math.abs(Math.min(0, dh)) * Math.PI / 360)
  const arcGold = meanC * Math.sin(Math.max(0, dh) * Math.PI / 360)
  return Math.hypot(
    RED_SOLVE.wDark * Math.max(0, red.L - c.L),
    RED_GATE.wLight * Math.max(0, c.L - red.L),
    RED_GATE.wDust * Math.max(0, red.C - c.C),
    Math.max(0, c.C - red.C),
    arcMag,
    RED_GATE.wGoldArc * arcGold,
  )
}
export function inBrickBand(L: number, C: number, H: number): boolean {
  const h = ((H % 360) + 360) % 360
  return h >= RED_SOLVE.brickHLo && h <= RED_SOLVE.brickHHi && L >= RED_SOLVE.brickLLo &&
    L <= RED_SOLVE.brickLHi && C / Math.max(1e-6, maxChromaAt(L, h)) >= RED_SOLVE.brickVividMin
}

// ── (SUPERSEDED by the v8 joint solve, 2026-07-10 — kept as the CALIBRATION RECORD: the
// split constants encode her anchor picks and remain consumed by the session instruments;
// no engine path reads them) C12 vivid-arc OPPOSED SPLIT (owner-calibrated 28/28) ─────────
// The arc's de-conflict is a split, never one-sided (her words: "the brand gets lighter, the
// red error gets darker" — red NEVER lightens): each side's move is keyed to dh, the brand
// seed's signed hue distance from red's cta (+ = gold-ward). Her three anchor picks fix the
// curves: PINK #FF006F +0.04/−0.08 · RED #FF0000 +0.08/−0.12 · ORANGE #FF7300 ±0/−0.08/−5°
// (red-darken window then shifted .10–.14 across the board at her word). The gold side never
// lightens the brand but COOLS the red variant instead (her catch: a darker H33 red still
// "leans orange" beside an orange brand; −15° was "too cool" — the knee keeps it ≤5°).
export const RED_SPLIT = {
  redDLBase: -0.10, redDLBump: -0.04, redDLSigma: 7,
  brandDLMax: 0.08, brandSigmaMagenta: 21.5, brandSigmaGold: 6,
  coolDeg: -5, coolKneeDh: 9, coolSoftness: 2.5,
} as const
export function vividSplit(dh: number): { redDL: number; brandDL: number; redDH: number } {
  return {
    redDL: RED_SPLIT.redDLBase + RED_SPLIT.redDLBump * gauss(dh, RED_SPLIT.redDLSigma),
    brandDL: RED_SPLIT.brandDLMax * gauss(dh, dh < 0 ? RED_SPLIT.brandSigmaMagenta : RED_SPLIT.brandSigmaGold),
    redDH: RED_SPLIT.coolDeg * sigmoid((dh - RED_SPLIT.coolKneeDh) / RED_SPLIT.coolSoftness),
  }
}

// Self-move direction pivot (her rulings: L0.45 fired → all dark · L0.55 → zero dark).
export const RED_DEEP_PIVOT = 0.50
// Red-variant domain floor: the recorded bottom of her error-eligible range (L0.35 slice empty).
export const RED_VARIANT_L_MIN = 0.45

export const RED_TORSION_CENTER_H = 35.5
export const RED_TORSION_SOFTNESS = 3.5

export const RED_BAND_LO_H = 12

export const RED_BAND_LO_SOFTNESS = 2

export const VIVID_C = 0.13

// The light warm drift's COOL EDGE (owner-approved 2026-07-09, CATALOG C8): the drift
// weight fades from full at H88 to ZERO at H104 — the same cool-edge knots as the dark
// WARM_TORSION.weight curve. Below H88 nothing changes; past it the cool yellows hold
// their identity hue as stops darken (lemon darkens to olive, not golden tan), and the
// warm-spine machinery is hue-banded in light exactly as it already is in dark. The
// lemon swap variant (H≈107) rides the same rule, matching its dark behavior.
export const LIGHT_DRIFT_COOL_HI = 88
export const LIGHT_DRIFT_COOL_RANGE = 16

// The ID-scaled paper/wash lift (owner design + approval 2026-07-09, CATALOG C8 V3):
// vivid BRIGHT identities ride the room-relative envelope — the need scales with the
// ID's vividness (C/VIVID_C, capped) AND its brightness (L ramp LO→LO+RANGE; an ID at
// L 0.70 takes nothing, 0.90+ full). One rule, no per-color cases: where an ID lands
// on these ramps IS its dose. Mid-L vivid colliders take zero lift by construction
// (the red/green/info signals live at L .54–.65) — that is what protects the fired-case
// margins the solo envelope broke. Signals are exempt (goldBoost carries their lift).
export const VIVID_LIFT_BLEND = 0.50
export const VIVID_LIFT_L_LO = 0.70
export const VIVID_LIFT_L_RANGE = 0.20

export const HUE_NOISE_C = 0.008

export const MUTED_BLEND_DENOM = 0.55

export const CREAM_UPPER_H = 105
export const CREAM_UPPER_SOFTNESS = 5

export const DEEPER_BAND_H_LO = 55
export const DEEPER_BAND_H_HI = 100
export const DEEPER_BAND_H_SOFT = 4
export const DEEPER_BAND_U_LO = 0.10
export const DEEPER_BAND_U_HI = 0.70
export const DEEPER_BAND_U_SOFT = 0.015

export const DEEPER_STRENGTH = 0.85

export const RED_COOL_DEG = 10.8

export function redCoolWeight(brandH: number): number {
  return (
    sigmoid((brandH - RED_BAND_LO_H) / RED_BAND_LO_SOFTNESS) *
    (1 - sigmoid((brandH - RED_TORSION_CENTER_H) / RED_TORSION_SOFTNESS))
  )
}

export function inRedBand(h: number): boolean {
  return h > RED_BAND_LO_H && h <= RED_TORSION_CENTER_H
}

// The repel watershed = the red SIGNAL hue (signals.ts red, H 33.3) — not the torsion center
// 35.5. A brand at exactly the pivot exits cool (status quo tie-break).
export const RED_PIVOT_H = 33.3

// Warm-side falloff: full push at the watershed (nearest-exit), gone by ~H50. Mirrors the
// cool side's falloff shape (RED_TORSION_SOFTNESS register).
export const RED_WARM_EXIT_H = 44
export const RED_WARM_EXIT_SOFTNESS = 3.5

// The band where red-adjacency machinery (rung-1 / dark collider / cta render shift) is
// eligible. Upper edge = the measured re-conflict window (H29–41; 42+ recovers). Distinct
// from inRedBand, which keeps the signal-fidelity meaning (audits gate on it).
export const RED_REPEL_HI_H = 41.5
export function inRedRepelBand(h: number): boolean {
  return h > RED_BAND_LO_H && h <= RED_REPEL_HI_H
}

// Direction-aware red repel (owner directive 2026-07-07, CATALOG C6): the hue shift that
// separates a brand from the red signal exits by the NEAREST side. Cool of the pivot keeps
// the shipped cool curve byte-identical; warm of it the same magnitude pushes warmer
// ("tomato goes orange-er"), so a warm-of-red brand is never dragged THROUGH the signal.
//
// Near-pivot exit floor (owner directive 2026-07-07, CATALOG C7): the cool branch reuses
// the torsion fade, which sags to ~0.65 exactly at the pivot — the brands ON the signal
// hue got the weakest push (measured: dH0 light wash ΔE 0.003–0.005, under the 0.006 bar).
// The floor restores full exit strength approaching the pivot; below ~H30.5 the shipped
// curve wins the max and stays byte-identical. Ties at the pivot exit cool (owner rule).
export const RED_EXIT_FLOOR_H = 30.8
export const RED_EXIT_FLOOR_SOFTNESS = 0.9
export const RED_WARM_EXIT_FLOOR_H = 35.3
export const RED_WARM_EXIT_FLOOR_SOFTNESS = 0.8
// 14, not RED_COOL_DEG: the spine drift eats ~3° of the exit at the wash stops (sweep:
// a full 10.8 push lands dHueWash ≈ 9.4 — under the yardstick; 14 lands ≈ 12+, clearing
// the 0.006 bar at the pivot). Both floors fade into the shipped curves away from the
// pivot (cool of ~H31 / warm of ~H34.5 the shipped curve wins the max — unchanged).
export const RED_PIVOT_EXIT_DEG = 14

export function redRepelShiftDeg(brandH: number): number {
  if (brandH <= RED_PIVOT_H) {
    const shipped = RED_COOL_DEG * redCoolWeight(brandH)
    const floor = RED_PIVOT_EXIT_DEG * sigmoid((brandH - RED_EXIT_FLOOR_H) / RED_EXIT_FLOOR_SOFTNESS)
    return -Math.max(shipped, floor)
  }
  const shipped = RED_COOL_DEG * (1 - sigmoid((brandH - RED_WARM_EXIT_H) / RED_WARM_EXIT_SOFTNESS))
  const floor = RED_PIVOT_EXIT_DEG * (1 - sigmoid((brandH - RED_WARM_EXIT_FLOOR_H) / RED_WARM_EXIT_FLOOR_SOFTNESS))
  return Math.max(shipped, floor)
}

export function maxChromaAt(L: number, H: number, gamut: Gamut = MASTER_GAMUT): number {
  return clampChromaToGamut(L, 0.52, H, gamut)
}

export function hexToOklch(hex: string): { L: number; C: number; H: number } {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  const r = parseInt(full.slice(0, 2), 16) / 255
  const g = parseInt(full.slice(2, 4), 16) / 255
  const b = parseInt(full.slice(4, 6), 16) / 255
  const lin = (c: number) => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  const rl = lin(r), gl = lin(g), bl = lin(b)
  const lms_l = 0.4121656120 * rl + 0.5362752080 * gl + 0.0514575653 * bl
  const lms_m = 0.2118591070 * rl + 0.6807189584 * gl + 0.1074065790 * bl
  const lms_s = 0.0883097947 * rl + 0.2818474174 * gl + 0.6302613616 * bl
  const l_ = Math.cbrt(lms_l), m_ = Math.cbrt(lms_m), s_ = Math.cbrt(lms_s)
  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_
  const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_
  const bv = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_
  return { L, C: Math.sqrt(a * a + bv * bv), H: (Math.atan2(bv, a) * 180 / Math.PI + 360) % 360 }
}

export function oklchToSrgbUnclamped(L: number, C: number, H: number): { r: number; g: number; b: number } {
  const [rl, gl, bl] = oklchToLinearRgb(L, C, H)
  const gm = (c: number) => c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055
  return { r: gm(rl), g: gm(gl), b: gm(bl) }
}

// THE sRGB clamp-down at emit (D6, P3-DESIGN §4B): gamut-map by chroma-reduction at
// constant L/H, then encode — never per-channel clamping (which hue-shifts). For a
// stop already inside sRGB this is exactly the shipped encoding. Every hex / Figma
// component / rgba emit routes through this.
export function srgbEmitChannels(s: { L: number; C: number; H: number }): { r: number; g: number; b: number } {
  const c = clampChromaToGamut(s.L, s.C, s.H, 'srgb')
  return oklchToSrgbUnclamped(s.L, c, s.H)
}

// the master rendition for CSS color(display-p3 …) emission — the stop's own channels
// when the master is P3 (makeStop minted them in the master basis)
export const masterEmitChannels = (s: { L: number; C: number; H: number }): [number, number, number] =>
  encodedChannels(s.L, s.C, s.H, MASTER_GAMUT)

export interface ColorStop {
  stop: number
  L: number
  C: number
  H: number
  r: number
  g: number
  b: number
}

export function applyChromaFloor(C: number, multiplier: number, stopIndex: number, floorStrength: number): number {
  const raw = C * multiplier
  if (floorStrength <= 0) return raw
  const floor = (0.02 + (0.04 - 0.02) * (stopIndex / 7)) * floorStrength
  return Math.max(raw, floor)
}

export const DARK_FLOOR_FULL_C = 0.022

export const DARK_FLOOR_MUTED_MAX_C = 0.04

// The master-gamut fork: chroma clamps in the MASTER gamut and the r/g/b channels are
// the master basis's own gamma-encoded components (P3 under the flip) — the perceptual
// truth apcaY judges. Serialization to hex/Figma goes through srgbEmitChannels instead
// (the render/emit split, P3-DESIGN.md §4B).
export function makeStop(stop: number, L: number, C: number, H: number, gamut: Gamut = MASTER_GAMUT): ColorStop {
  const gamutC = clampChromaToGamut(L, C, H, gamut)
  const [r, g, b] = encodedChannels(L, gamutC, H, gamut)
  return { stop, L, C: gamutC, H, r, g, b }
}

// The on-text pole. The PREFERENCE is perceptual (max-|APCA Lc| — which pole reads better) in
// both profiles; the FLOOR is the profile's law (owner 2026-07-04, the true wcag/apca split):
// under the wcag profile every CHOSEN pole must pass the 4.5 ratio — `ratioFloor` flips to the
// other pole when the preferred one fails (WCAG 4.5:1 has no dead zone, so the other pole
// always passes; fills never move). The apca profile carries no ratio floor — its law is the
// Lc bar (enforceLc re-solves enforced ctas; the highlight band clears Lc 60 by placement).
// Every 4.5 check is D1 legality: legalRatio (both renditions). The Y arg (APCA
// preference) is the caller's master-basis apcaY — D2. Ratio vs a pole passes
// contrastRatio's other side as the pole's Y (white 1.0 / black 0).
export function onTextIsWhite(Y: number, L: number, C: number, H: number, enforce: boolean, ratioFloor?: number): boolean {
  let white = Math.abs(apcaLc(1.0, Y)) >= Math.abs(apcaLc(0.0, Y))
  if (enforce) {
    if (white && legalRatio(L, C, H, 1.0) < 4.5) {
      if (legalRatio(L, C, H, 0) >= 4.5 && Math.abs(apcaLc(0.0, Y)) >= 45) white = false
    } else if (!white && legalRatio(L, C, H, 0) < 4.5) {
      if (legalRatio(L, C, H, 1.0) >= 4.5 && Math.abs(apcaLc(1.0, Y)) >= 45) white = true
    }
  }
  // the conformance floor: the chosen pole must PASS — legality overrides preference
  if (ratioFloor !== undefined) {
    const chosen = white ? legalRatio(L, C, H, 1.0) : legalRatio(L, C, H, 0)
    if (chosen < ratioFloor) white = !white
  }
  return white
}
