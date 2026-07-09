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
  LIGHT_L, DARK_NEUTRAL_L, SCALE_C_LIGHT, SCALE_C_DARK,
  STOP_8_NONTEXT_CONTRAST,
  STOP_11_CONTRAST, STOP_12_CONTRAST_FLOOR,
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
  // APCA lightness-contrast requirement (the contrast-PROFILE alternative to wcag): the stop must read
  // |Lc| ≥ targetLc against the resolved paper-2. Same floor semantics — a placement that already clears
  // does not move. Produced by withProfile() (profiles.ts), never hand-declared in the built-in specs.
  | { metric: 'apca'; against: 'paper-2'; targetLc: number }
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
  inkMaxC?: number                    // text-register ceiling: chroma = min(chromaMult × brandC, inkMaxC)
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
// with the larger |APCA Lc|; enforce adds the legibility fallback. Under the shipped wcag profile that
// fallback is WCAG-4.5 (flip pole only if the other pole clears 4.5 AND |Lc| ≥ 45 — okchroma's
// onTextIsWhite enforce branch; the cta fill re-solves to 4.5 when neither works). Under the apca profile
// `enforceLc` is set (by withProfile, from the map's 4.5 slot): the pole flip is a no-op (max-|Lc| already
// wins its own metric) and the cta fill re-solves until the white pole reads ≥ enforceLc. On-text itself
// never feeds back into a scale stop.
// `ratioFloor` (the TRUE wcag/apca split, owner 2026-07-04): under the wcag profile the CHOSEN pole must
// PASS the 4.5 ratio — preference stays perceptual, the floor is the law. onFill's floor is the
// ENFORCEMENT itself (the fill re-solves to 4.5-white); onHighlight fills are placed by design and never
// move, so its floor is the pole FLIP (4.5 has no dead zone — the other pole always passes).
// withProfile('apca') strips the ratio floor; the apca law is the Lc bar.
export type OnReq = { metric: 'apca-pole'; enforce: boolean; enforceLc?: number; ratioFloor?: number }

export type ModeSpec = {
  stops: StopReq[]
  roles: RoleReq[]
  ons: { onFill: OnReq; onHighlight: OnReq }
}

const groupOf = (stop: number): Group => (stop <= 2 ? 'paper' : stop <= 7 ? 'wash' : stop <= 10 ? 'highlight' : 'ink')

// paper-0 — the ladder extreme BEYOND paper-1, now a resolved stop instead of a hard-coded absolute
// (it was the last literal value in the system: #ffffff/#000000 pasted into the emitters). Light really
// is white (rootL 1.0, zero chroma). Dark sits one seam BELOW paper-1 — deep, brand-tinted, never the
// void; rootL owner-picked from scripts/paper0-sweep.ts. The lift producer applies like the rest of the
// dark scale.
export const PAPER0_DARK_ROOT_L = 0.16    // owner-picked (revised 2026-07-02 from 0.145 — the tighter gap below paper-1)
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

const ONS = { onFill: { metric: 'apca-pole', enforce: true } as OnReq, onHighlight: { metric: 'apca-pole', enforce: false, ratioFloor: 4.5 } as OnReq }

// paper/wash separation is a PROPERTY OF THE LIGHT_L SHAPE, not a runtime delta (owner 2026-07-09,
// render/paper2-distributions.html, distribution "B"). The near-white ladder's gaps grow geometrically
// (~1.25×/step), so paper-2 stands ~0.017 ΔE off paper-1 and every wash seam holds BY CONSTRUCTION —
// paper-2 falls onto its ID curve with nothing clamped. This REPLACES the old min-separation deltas: the
// former 0.028 target was unreachable near white (the gamut can't earn it via chroma), so it was enforced by
// darkening / chroma-spend — which pushed paper-2's chroma off-curve and past wash-3 on wide-gamut hues (the
// shipped e87f760 bug). stop-8's 3:1 stays: it is a real contrast requirement, not a separation delta.
// (The resolver still SUPPORTS a min-separation require for portable specs; our spec just no longer declares
// one. Light-only; dark already reads right.)

export const LIGHT: ModeSpec = {
  stops: [
    // paper-0: the resolved ladder extreme — in light it genuinely is white (rootL 1.0, zero chroma)
    { stop: 0, rootL: 1.0, group: 'paper', produce: { hue: 'warm-drift', L: 'fixed', chroma: 'ladder' }, satFraction: SCALE_C_LIGHT[0].sat, baseC: SCALE_C_LIGHT[0].base },
    // paper/wash/highlight-8: perceptual ladder/envelope blend on the geometric LIGHT_L scaffold. Separation
    // falls out of the shape (see above) — no min-separation require. Only stop 8 carries a require: the WCAG
    // 3:1 vs the resolved paper-2 (re-solves automatically since it references paper-2).
    ...LIGHT_L.slice(0, 8).map((rootL, i): StopReq => ({
      stop: i + 1, rootL, group: groupOf(i + 1), produce: PL_LADDER,
      satFraction: SCALE_C_LIGHT[i + 1].sat, baseC: SCALE_C_LIGHT[i + 1].base,
      require: i === 7 ? S8 : undefined,
    })),
    // highlight 9/10: perceptual ladder at the highlight scaffold
    { stop: 9, rootL: HIGHLIGHT_LIGHT.rootL, group: 'highlight', produce: PL_LADDER, satFraction: SCALE_C_LIGHT[9].sat, baseC: SCALE_C_LIGHT[9].base },
    { stop: 10, rootL: HIGHLIGHT_LIGHT.rootL10, group: 'highlight', produce: PL_LADDER, satFraction: SCALE_C_LIGHT[10].sat, baseC: SCALE_C_LIGHT[10].base },
    // ink text: perceptual + contrast-required
    { stop: 11, rootL: LIGHT_L[10], group: 'ink', produce: PL_TEXT, chromaMult: SCALE_C_LIGHT[11].inkMult, inkMaxC: SCALE_C_LIGHT[11].inkMaxC, require: T11 },
    { stop: 12, rootL: LIGHT_L[11], group: 'ink', produce: PL_TEXT, chromaMult: SCALE_C_LIGHT[12].inkMult, inkMaxC: SCALE_C_LIGHT[12].inkMaxC, require: T12 },
  ],
  roles: [
    { role: 'cta', produce: { hue: 'constant', L: 'anchor', chroma: 'brand' }, floorL: 0, chromaMult: 1 },
    { role: 'cta-hover', produce: { hue: 'constant', L: 'hover', chroma: 'brand' }, floorL: 0, chromaMult: 1 },
  ],
  ons: ONS,
}

export const DARK: ModeSpec = {
  stops: [
    // paper-0: the resolved ladder extreme — one seam BELOW paper-1, deep and brand-tinted, never the
    // absolute void (the old hard-coded #000000 was "too much"). Lift applies like the rest of the scale.
    { stop: 0, rootL: PAPER0_DARK_ROOT_L, group: 'paper', produce: P_LIFT, satFraction: SCALE_C_DARK[0].sat },
    // paper/wash 1–7: perceptual on the dark scaffold. stop 8: FIXED at the hand-placed scaffold BUT with the
    // 3:1 non-text require DECLARED (the Stage-5 flip, owner-approved): most hues already clear it from the
    // scaffold and don't move; low-luminance hues (blue) get raised until they read off the dark paper —
    // the blue-recede failure is prevented BY RULE, not by patch.
    ...DARK_NEUTRAL_L.slice(0, 8).map((rootL, i): StopReq => ({
      stop: i + 1, rootL, group: groupOf(i + 1), produce: i === 7 ? P_FIXED : P_LIFT,
      satFraction: SCALE_C_DARK[i + 1].sat, require: i === 7 ? S8 : undefined,
    })),
    // highlight 9/10: FIXED at the hand-placed dark scaffold (solving = APCA body-text dead zone).
    // Chroma params declared in SCALE_C_DARK (the values the engine had reused from light, :472).
    { stop: 9, rootL: HIGHLIGHT_DARK.rootL, group: 'highlight', produce: P_FIXED, satFraction: SCALE_C_DARK[9].sat, baseC: SCALE_C_DARK[9].base },
    { stop: 10, rootL: HIGHLIGHT_DARK.rootL10, group: 'highlight', produce: P_FIXED, satFraction: SCALE_C_DARK[10].sat, baseC: SCALE_C_DARK[10].base },
    // ink text: perceptual + the contrast requires DECLARED in dark too (Stage-5 flip): the scaffold already
    // clears them for every hue (the gate proves it), so values don't move — but the guarantee is now a rule.
    { stop: 11, rootL: DARK_NEUTRAL_L[10], group: 'ink', produce: P_TEXT, chromaMult: SCALE_C_DARK[11].inkMult, inkMaxC: SCALE_C_DARK[11].inkMaxC, require: T11 },
    { stop: 12, rootL: DARK_NEUTRAL_L[11], group: 'ink', produce: P_TEXT, chromaMult: SCALE_C_DARK[12].inkMult, inkMaxC: SCALE_C_DARK[12].inkMaxC, require: T12 },
  ],
  roles: [
    { role: 'cta', produce: { hue: 'constant', L: 'anchor', chroma: 'brand' }, floorL: DARK_STOP_9_MIN_L, chromaMult: 1 },
    { role: 'cta-hover', produce: { hue: 'constant', L: 'hover', chroma: 'brand' }, floorL: DARK_STOP_9_MIN_L, chromaMult: 1 },
  ],
  ons: ONS,
}

export const MODE_SPECS = { light: LIGHT, dark: DARK }
