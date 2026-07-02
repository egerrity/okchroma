// spec.ts — the REQUIREMENT DECLARATION as pure, serializable data. No math lives here.
// This is the portable artifact: every field is data a DTCG $extensions bundle can carry. The resolver
// (resolve.ts) executes it by calling the real engine functions; producer names ('perceptual', 'warm-torsion')
// are references to named resolver capabilities, not formulas.
//
// NUMBERING TRUTH (owner-flagged; matches the engine): the SCALE is stops 1–12 — paper 1–2, wash 3–7,
// highlight 8–10, ink 11–12. The cta is NOT a scale stop: it is an OFF-SCALE ROLE (cta / cta-hover), exactly
// like GeneratedScale.cta/ctaHover. The old prototype's "stop 9 = cta" pairing is dead.
//
// STAGE NOTE: this declaration is currently PARITY-SHAPED (mirrors okchroma today): light declares the
// stop-8 3:1 + text 4.5/7 requires; dark declares NO contrast requires (stop 8 + highlight are hand-placed).
// Stage 5 of the migration flips the dark requires ON (the behavior change the owner approved).
import {
  LIGHT_L, DARK_NEUTRAL_L, LIGHT_STOPS, LIGHT_BASE_C, DARK_SUBTLE_CHROMA_MULT,
  STOP_8_NONTEXT_CONTRAST,
  STOP_11, STOP_12, STOP_11_CONTRAST, STOP_12_CONTRAST_FLOOR, DARK_STOP_11, DARK_STOP_12,
  HIGHLIGHT_LIGHT, HIGHLIGHT_DARK, DARK_STOP_9_MIN_L,
} from '../engine/stopTable'

export type Group = 'paper' | 'wash' | 'highlight' | 'ink'
export type Producer = {
  // named hue producers: warm-drift = the light path (spine drift, dynamic cap, red-cool);
  // warm-torsion = the dark path (torsionedHue); constant = the seed's own hue (roles)
  hue: 'warm-drift' | 'warm-torsion' | 'constant'
  // perceptual = Nayatani apparent-L placement; perceptual-lift = the same solve FLOORED at rootL
  // ("dark fills lift, never sink" — high-H-K hues like blue otherwise sink under the near-black
  // neutral surfaces they render on); fixed = rootL as placed
  L: 'perceptual' | 'perceptual-lift' | 'fixed'
  chroma: 'ladder' | 'brand'          // ladder = baseC/envelope blend (light) or mult ladder (dark); brand = chromaMult × brand C
}
export type Require =
  | { metric: 'wcag'; against: 'paper-2'; target: number; level: 'AA' | 'AAA' }
  // minimum perceptual separation (OKLab ΔE, the house stopDeltaE metric) from another RESOLVED stop —
  // 'paper-1' anchors the paper-2 push; 'prev' = the stop's resolved predecessor (the wash seam floors:
  // every ladder seam guarantees distinctness, so no seed — low-chroma grays and muted warms included —
  // can ever collapse a seam again, whatever the producers do).
  | { metric: 'min-separation'; against: 'paper-1' | 'prev'; target: number }
export type StopReq = {
  stop: number                        // 1..12 — scale stops ONLY (cta is a role, never a stop)
  rootL: number
  group: Group
  produce: Producer
  satFraction?: number                // ladder param: envelope saturation fraction
  baseC?: number                      // ladder param (light): absolute base chroma for the ladder/envelope blend
  chromaMult?: number                 // param for produce.chroma === 'brand'
  require?: Require
}

// off-scale roles — the brand fill. Anchor = the seed's OWN lightness floored at floorL (product intent:
// dark fills must not sink; light has no floor). Hue constant (the cta carries brand identity, no torsion).
export type RoleName = 'cta' | 'cta-hover'
export type RoleReq = {
  role: RoleName
  produce: { hue: 'constant'; L: 'anchor' | 'hover'; chroma: 'brand' }  // hover = hoverL() of the resolved cta
  floorL: number
  chromaMult: number
}

// on-color requirements: the on-text pole is chosen on ONE criterion — it passes. apca-pole picks the pole
// with the larger |APCA Lc|; enforce adds the WCAG-4.5 fallback (flip pole only if the other pole clears 4.5
// AND |Lc| ≥ 45 — okchroma's onTextIsWhite enforce branch). Never feeds back into the fill.
export type OnReq = { metric: 'apca-pole'; enforce: boolean }

export type ModeSpec = {
  stops: StopReq[]
  roles: RoleReq[]
  ons: { onFill: OnReq; onHighlight: OnReq }
}

const groupOf = (stop: number): Group => (stop <= 2 ? 'paper' : stop <= 7 ? 'wash' : stop <= 10 ? 'highlight' : 'ink')
const PL_LADDER: Producer = { hue: 'warm-drift', L: 'perceptual', chroma: 'ladder' }
const PL_TEXT: Producer = { hue: 'warm-drift', L: 'perceptual', chroma: 'brand' }
// dark scale uses the LIFT variant (owner-adopted 2026-07-02, the blue-recede fix): the H-K solve may
// raise a hue above the scaffold but never place it below — high-H-K hues (blue/violet) otherwise sink
// under the near-black neutral surfaces they render on. "Dark fills lift, never sink."
const P_LIFT: Producer = { hue: 'warm-torsion', L: 'perceptual-lift', chroma: 'ladder' }
const P_FIXED: Producer = { hue: 'warm-torsion', L: 'fixed', chroma: 'ladder' }
const P_TEXT: Producer = { hue: 'warm-torsion', L: 'perceptual', chroma: 'brand' }

// light stop-8 carries the WCAG 1.4.11 non-text 3:1 vs paper-2 (the scale's own resolved stop 2)
const S8: Require = { metric: 'wcag', against: 'paper-2', target: STOP_8_NONTEXT_CONTRAST, level: 'AA' }
const T11: Require = { metric: 'wcag', against: 'paper-2', target: STOP_11_CONTRAST, level: 'AA' }
const T12: Require = { metric: 'wcag', against: 'paper-2', target: STOP_12_CONTRAST_FLOOR, level: 'AAA' }

const ONS = { onFill: { metric: 'apca-pole', enforce: true } as OnReq, onHighlight: { metric: 'apca-pole', enforce: false } as OnReq }

// paper-2 separation (Stage 6): pre-fix light stop1↔2 ΔE_OK measured 0.009–0.017 (median 0.013); dark ~0.035.
// OWNER PICKED 0.028 from the render sweep (scripts/paper2-sweep.ts → render/paper2.html, 2026-07-02):
// light stop 2 must stand at least this far off paper-1. Light-only — dark already reads right.
export const PAPER2_MIN_SEPARATION = 0.028
export const PAPER2_SEPARATION_CANDIDATES = [0.020, 0.028, 0.035]
const P2SEP: Require = { metric: 'min-separation', against: 'paper-1', target: PAPER2_MIN_SEPARATION }

// wash re-space (owner-picked S=0.015 from scripts/wash-respace-sweep.ts → render/wash-respace.html):
// the 3–7 scaffold shifts down to absorb the paper-2 push HOLISTICALLY (not a per-seam patch), tapering
// into the 7↔8 room: rootL_i = LIGHT_L[i−1] − 0.015·(1 − 0.4·(i−3)/4). Literal values declared:
export const LIGHT_WASH_ROOT_L: Record<number, number> = {
  3: 0.945,     // 0.960 − 0.0150
  4: 0.9225,    // 0.936 − 0.0135
  5: 0.891,     // 0.903 − 0.0120
  6: 0.8495,    // 0.860 − 0.0105
  7: 0.797,     // 0.806 − 0.0090
}
// the standing seam guarantee: every wash stop stays distinct from its resolved predecessor. After the
// re-space these floors bind almost nowhere — they are the gate against future collapse, not the shape.
export const WASH_SEAM_MIN_SEPARATION = 0.012
const WASHSEP: Require = { metric: 'min-separation', against: 'prev', target: WASH_SEAM_MIN_SEPARATION }

export const LIGHT: ModeSpec = {
  stops: [
    // paper/wash/highlight-8: perceptual ladder/envelope blend on the RE-SPACED scaffold. Requires:
    // paper-2 stands ΔE ≥ 0.028 off paper-1; every wash seam stands ΔE ≥ 0.012 off its predecessor;
    // stop 8 keeps the 3:1 clamp — all against RESOLVED stops, so a pushed stop automatically
    // re-solves everything that references it (the seam chain, then 8/11/12).
    ...LIGHT_L.slice(0, 8).map((rootL, i): StopReq => ({
      stop: i + 1, rootL: LIGHT_WASH_ROOT_L[i + 1] ?? rootL, group: groupOf(i + 1), produce: PL_LADDER,
      satFraction: LIGHT_STOPS[i].satFraction, baseC: LIGHT_BASE_C[i],
      require: i === 1 ? P2SEP : i >= 2 && i <= 6 ? WASHSEP : i === 7 ? S8 : undefined,
    })),
    // highlight 9/10: perceptual ladder at the highlight scaffold
    { stop: 9, rootL: HIGHLIGHT_LIGHT.rootL, group: 'highlight', produce: PL_LADDER, satFraction: HIGHLIGHT_LIGHT.satFraction, baseC: HIGHLIGHT_LIGHT.baseC },
    { stop: 10, rootL: HIGHLIGHT_LIGHT.rootL10, group: 'highlight', produce: PL_LADDER, satFraction: HIGHLIGHT_LIGHT.satFraction, baseC: HIGHLIGHT_LIGHT.baseC },
    // ink text: perceptual + contrast-required
    { stop: 11, rootL: STOP_11.rootL, group: 'ink', produce: PL_TEXT, chromaMult: STOP_11.chromaMultiplier, require: T11 },
    { stop: 12, rootL: STOP_12.rootL, group: 'ink', produce: PL_TEXT, chromaMult: STOP_12.chromaMultiplier, require: T12 },
  ],
  roles: [
    { role: 'cta', produce: { hue: 'constant', L: 'anchor', chroma: 'brand' }, floorL: 0, chromaMult: 1 },
    { role: 'cta-hover', produce: { hue: 'constant', L: 'hover', chroma: 'brand' }, floorL: 0, chromaMult: 1 },
  ],
  ons: ONS,
}

export const DARK: ModeSpec = {
  stops: [
    // paper/wash 1–7: perceptual on the dark scaffold. stop 8: FIXED at the hand-placed scaffold BUT with the
    // 3:1 non-text require DECLARED (the Stage-5 flip, owner-approved): most hues already clear it from the
    // scaffold and don't move; low-luminance hues (blue) get raised until they read off the dark paper —
    // the blue-recede failure is prevented BY RULE, not by patch.
    ...DARK_NEUTRAL_L.slice(0, 8).map((rootL, i): StopReq => ({
      stop: i + 1, rootL, group: groupOf(i + 1), produce: i === 7 ? P_FIXED : P_LIFT,
      satFraction: DARK_SUBTLE_CHROMA_MULT[i], require: i === 7 ? S8 : undefined,
    })),
    // highlight 9/10: FIXED at the hand-placed dark scaffold (solving = APCA body-text dead zone).
    // Chroma params are the LIGHT highlight's baseC/satFraction — the engine reuses them in dark (:472).
    { stop: 9, rootL: HIGHLIGHT_DARK.rootL, group: 'highlight', produce: P_FIXED, satFraction: HIGHLIGHT_LIGHT.satFraction, baseC: HIGHLIGHT_LIGHT.baseC },
    { stop: 10, rootL: HIGHLIGHT_DARK.rootL10, group: 'highlight', produce: P_FIXED, satFraction: HIGHLIGHT_LIGHT.satFraction, baseC: HIGHLIGHT_LIGHT.baseC },
    // ink text: perceptual + the contrast requires DECLARED in dark too (Stage-5 flip): the scaffold already
    // clears them for every hue (the gate proves it), so values don't move — but the guarantee is now a rule.
    { stop: 11, rootL: DARK_NEUTRAL_L[10], group: 'ink', produce: P_TEXT, chromaMult: DARK_STOP_11.chromaMultiplier, require: T11 },
    { stop: 12, rootL: DARK_NEUTRAL_L[11], group: 'ink', produce: P_TEXT, chromaMult: DARK_STOP_12.chromaMultiplier, require: T12 },
  ],
  roles: [
    { role: 'cta', produce: { hue: 'constant', L: 'anchor', chroma: 'brand' }, floorL: DARK_STOP_9_MIN_L, chromaMult: 1 },
    { role: 'cta-hover', produce: { hue: 'constant', L: 'hover', chroma: 'brand' }, floorL: DARK_STOP_9_MIN_L, chromaMult: 1 },
  ],
  ons: ONS,
}

export const MODE_SPECS = { light: LIGHT, dark: DARK }
