export interface StopSpec {
  rootL: number
  chromaMultiplier: number
}

// Root L targets for light mode stops 1–8, recalibrated 2026-06-10 to
// Radix's cross-family ladder (median OKLCH L of their 11 chromatic
// scales — remarkably uniform across hues). The old roots (0.98–0.71)
// sat one notch darker: our stop 1 landed where Radix's stop 2 does,
// which is why brand-1/2 read as "tinted paper" instead of near-white.
// rootL is now the DIRECT lightness of each stop (plus the yellow-band
// lift) — the old blue-referenced Y-equalization is gone from the light
// ramp (the dark ramp keeps its machinery).
// satFraction: chroma as a fraction of the sRGB gamut max at the stop's
// lightness, scaled by the brand's own saturation. It survives only as
// the "cream" endpoint of the muted-warm chroma blend (the u term in
// colorEngine) — vivid brands ride the LIGHT_BASE_C ladder instead.
export const LIGHT_STOPS: { rootL: number; satFraction: number }[] = [
  { rootL: 0.993, satFraction: 0.50 }, // 1 — app background
  { rootL: 0.982, satFraction: 0.85 }, // 2 — subtle background
  { rootL: 0.960, satFraction: 0.95 }, // 3 — UI component background
  { rootL: 0.936, satFraction: 0.95 }, // 4 — hovered UI background
  { rootL: 0.903, satFraction: 0.92 }, // 5 — active UI background
  { rootL: 0.860, satFraction: 0.85 }, // 6 — subtle border / divider
  { rootL: 0.806, satFraction: 0.78 }, // 7 — UI border
  { rootL: 0.738, satFraction: 0.78 }, // 8 — focus ring / hover border
]

// Per-stop base chroma for light stops 1–8 (vivid-brand ladder). Scaled by
// the brand's vividness v = min(1, C_b/0.13) and the yellow-band boost in
// colorEngine; muted warm brands blend from this toward the satFraction
// "cream" envelope above. Fit during the 2026-06 light-ramp retune.
export const LIGHT_BASE_C = [0.004, 0.010, 0.022, 0.039, 0.053, 0.068, 0.086, 0.112]

// Yellow-band lightness lift for light stops (max +0.03 by stop 8 at the
// yellow core H 92, gaussian σ 20): yellows keep more of their natural
// brightness instead of being forced down the shared L ladder.
export const YELLOW_L_LIFT = { max: 0.03, centerH: 92, sigmaDeg: 20 }

// Root L targets for dark mode stops 1–8.
// Raised + chroma-boosted (2026-06-09 dark audit): the original roots
// (0.13–0.42) read as undifferentiated murk — OKLab ΔE under-weights
// perceived steps at low L, so dark mode needs higher roots and MORE
// chroma than light-mode symmetry suggests (cf. Radix dark-3 ≈ L 0.24).
export const DARK_STOPS: StopSpec[] = [
  { rootL: 0.18,  chromaMultiplier: 0.30 }, // 1 — app background
  { rootL: 0.21,  chromaMultiplier: 0.38 }, // 2 — subtle background
  { rootL: 0.245, chromaMultiplier: 0.46 }, // 3 — UI component background
  { rootL: 0.28,  chromaMultiplier: 0.54 }, // 4 — hovered UI background
  { rootL: 0.315, chromaMultiplier: 0.60 }, // 5 — active UI background
  { rootL: 0.355, chromaMultiplier: 0.66 }, // 6 — subtle border / divider
  { rootL: 0.41,  chromaMultiplier: 0.72 }, // 7 — UI border
  { rootL: 0.48,  chromaMultiplier: 0.78 }, // 8 — focus ring / hover border
]

// Accent dark subtle ladder — chromatic accents (brand AND signal subtle
// surfaces: subtle buttons, badges, alerts) must stand off the dark app
// background harder than large neutral surfaces do. Anchored at the designer's
// ladder pick (rung C, 2026-06-09): stop 3 = L 0.31 × 0.62 chroma mult.
// Signals additionally run their subtleChromaBoost on top, which keeps
// them hotter than brand surfaces. Neutral keeps the base DARK_STOPS —
// it paints whole cards/panels where this lightness would go milky.
export const ACCENT_DARK_STOPS: StopSpec[] = [
  { rootL: 0.18,  chromaMultiplier: 0.40 }, // 1
  { rootL: 0.245, chromaMultiplier: 0.52 }, // 2
  { rootL: 0.31,  chromaMultiplier: 0.62 }, // 3 — alert/badge bg (rung C)
  { rootL: 0.35,  chromaMultiplier: 0.68 }, // 4 — border subtle
  { rootL: 0.39,  chromaMultiplier: 0.72 }, // 5
  { rootL: 0.43,  chromaMultiplier: 0.76 }, // 6
  { rootL: 0.48,  chromaMultiplier: 0.80 }, // 7
  { rootL: 0.54,  chromaMultiplier: 0.84 }, // 8
]

// Stop 11 — accent text / links: luminance-anchored at the dark root,
// with AA against stop 2 as a BOUND (take the darker of the two).
// Until 2026-06-10 it anchored at exactly 4.5:1 — the lightest legal
// color every time, which is why 11 "ended up looking really light"
// (our crimson-11 hit 4.50 vs Radix's hand-tuned 5.11). Radix 11s sit
// at L ≈ 0.51–0.59; the 0.53 root reproduces that depth via the same
// luminance equalization as stops 1–8.
export const STOP_11 = { rootL: 0.53, chromaMultiplier: 0.95 }
export const STOP_11_CONTRAST = 4.5

// Stop 12 — body-capable text with a brand tint: luminance-anchored at a
// dark root (neutral-12 #202020 sits near L 0.24; 0.30 keeps a hint more
// hue). The 7:1 AAA ratio is a safety floor, not the target — the dark
// root clears it with large headroom.
export const STOP_12 = { rootL: 0.30, chromaMultiplier: 0.50 }
export const STOP_12_CONTRAST_FLOOR = 7.0

// Dark mode fixed values for stops 9–12.
// 11 lowered 0.78 → 0.75: more gamut headroom for chroma, so 11 reads
// colorful against the near-white 12 (blues were converging). 12's chroma
// multiplier raised — gamut clamping caps it anyway at L 0.94.
//
// Fills keep their identity across modes (2026-06-09): dark mode
// only LIFTS fills that would vanish on a dark background — it never pulls
// a light/vivid fill down (that manufactured mustard golds and brown
// oranges) and never reduces fill chroma.
export const DARK_STOP_9_MIN_L = 0.63 // lift floor, not a remap target
// Brands lift higher than signals in dark mode (the designer's grayscale check:
// fills at 0.63 read perceptually ambiguous; 0.70 puts black on-fill text
// in the comfortable APCA band). Signals keep the vivid 0.63 identity.
export const DARK_BRAND_FILL_MIN_L = 0.70
export const DARK_STOP_11 = { rootL: 0.75, chromaMultiplier: 0.95 }
export const DARK_STOP_12 = { rootL: 0.94, chromaMultiplier: 0.62 }

// Dark-mode collider register: rung 1 can't separate fills in dark, so
// colliding red-side fills FLOAT well above error's vivid 0.63 register
// (the designer's 35%-opacity stand-off reference, 2026-06-09 — the earlier
// sink-to-0.53 muted register still conflicted). Reds go pastel rose
// (reduced chroma) and pick up black on-fill text vs error's white as a
// second differentiation channel. (The 'bright' orange register was cut —
// orange-side colliders keep identity via the component rule.)
export const DARK_COLLIDER_MUTED_L = 0.80
export const DARK_COLLIDER_MUTED_CHROMA_SCALE = 0.55

// Warm hue torsion v2 — the GOLD SPINE (2026-06-10, replaces the
// yellow-only torsion after flagged the brown shift at stops 7–8
// on oranges/golds). In sRGB, "staying on hue" while lightness drops
// turns warm colors brown/olive: dark orange at H 53 IS brown, dark
// yellow at H 100 IS olive. Hand-tuned systems escape by rotating every
// non-anchor stop toward the hue that stays clean at that lightness —
// solving Radix's orange/amber/yellow scales for their common attractor
// gives a monotone path from cream near white to orange-brown in the
// depths. Stops drift toward the spine with partial travel (capped), so
// orange papers go peachy-cream (Radix orange-3: +34°), orange 7–8 go
// golden instead of tan (+10°), and yellow 11 lands on gold (−24°),
// while stops 9/10 keep the brand hue exactly. Red side (H < 40) and
// greens (H > 122) are outside the band — Radix barely moves them.
// The light ramp now weights the spine attractor with the red-watershed
// sigmoid + warm gaussian in colorEngine; WARM_TORSION's hard band only
// drives the DARK ramp (and the illustration ramp).
export const GOLD_SPINE: Array<[number, number]> = [
  [0.30, 47], [0.57, 50], [0.74, 71], [0.80, 88], [0.87, 103], [0.97, 110],
]
export const WARM_TORSION = {
  bandLo: 40,   // NB: deliberately NOT the H 45 red/orange collision watershed,
                // nor the H 35.5 light-ramp torsion sigmoid center — three
                // different constants by design
  bandHi: 122,
  taperDeg: 10,
  travel: 0.55,
  capDeg: 24,
}

// Illustration ramp — bespoke, NOT the UI ramp. Recalibrated 2026-06-11
// (PoC): FOUR fixed-L slots, L targets + chroma weights measured from the
// designer's 4-tier signal sets (accent/highlight/spotlight/base — her
// only extant 4-value sets; her illustration values extrapolate from
// them). Shapes in illustration files are labeled by slot; every slot
// derives at its fixed L (brand-pin-at-nearest-rung was cut for the PoC —
// 2026-06-11 "keep to the L targets"). Illustrations IGNORE UX
// rules: derived from the RAW brand (no collision yields, no red cool,
// no contrast darkening) — hue shifting along the warm path is the only
// transformation kept.
export const ILLUS_STOPS: StopSpec[] = [
  { rootL: 0.97, chromaMultiplier: 0.12 }, // 1 wash — bg shapes, halos
  { rootL: 0.88, chromaMultiplier: 0.70 }, // 2 tint — light bodies
  { rootL: 0.63, chromaMultiplier: 1.05 }, // 3 mid — primary bodies
  { rootL: 0.47, chromaMultiplier: 0.80 }, // 4 deep — emphasis / ink
]

// Neutral tint chroma curve, per stop 1–12. Derived from Radix slate
// (their tinted grays): tint is nearly absent on the paper stops (1–2 sit
// at ~8–15% of peak), climbs with depth, peaks at stops 8–9, and tapers
// into 12 so body text stays ink-like. The `C` passed to
// generateNeutralScale is the PEAK; each stop applies its multiplier.
// (Radix slate peaks at C ≈ 0.0165; sage ≈ 0.010.)
export const NEUTRAL_TINT_CURVE = [
  0.08, 0.15, 0.25, 0.33, 0.42, 0.55, 0.68, 0.95, 1.0, 0.95, 0.83, 0.60,
]

// H=245 (blue) is the reference hue for luminance calibration — offset is 0
export const REFERENCE_H = 245
