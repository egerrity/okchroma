// spec.ts — the REQUIREMENT DECLARATION as pure, serializable data. No math lives here.
// This is the portable artifact: every field is data a DTCG $extensions bundle can carry. The resolver
// (resolve.ts) executes it by calling the real engine functions; producer names ('perceptual', 'warm-torsion')
// are references to named resolver capabilities, not formulas.
//
// NUMBERING TRUTH (owner-flagged; matches the engine): the SCALE is stops 1–10 — paper 1–2, wash 3–7,
// highlight (mark) 8, ink 9–10 (contiguous). THE HIGHLIGHT BAND COLLAPSED 2026-07-29: highlight-9 is
// deleted and the inks renumbered down onto it (old 10/11 → 9/10). highlight-9 and old ink-10 both
// solved 4.5 against paper-95 (paper-3) — the same bar against the same anchor — so they landed on
// top of each other (145 of 360 agnostic seeds within 0.01). ink-53-aa (ink-9) now carries both
// jobs: the emphasis fill AND the first text stop. The cta is NOT a scale stop: it is an OFF-SCALE
// ROLE (cta / cta-hover), exactly like GeneratedScale.cta/ctaHover. The old prototype's "stop 9 = cta"
// pairing is dead.
//
// STAGE NOTE: the Stage-5 flip is DONE — dark declares the same requires as light (stop-8 3:1 + the
// ink requires vs paper-97 (paper-2); owner-approved). Nothing is hand-placed any more: the last
// P_FIXED stop without a require was highlight-9, and it is gone.
import {
  ROOT_L_LIGHT, ROOT_L_DARK, SCALE_C_LIGHT, SCALE_C_DARK,
  STOP_8_NONTEXT_CONTRAST, INK_9_CONTRAST, INK_10_CONTRAST, INK_11_CONTRAST_FLOOR, DARK_CTA_MIN_L,
} from '../stopTable'

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
// `against` names the ANCHOR STOP and is authoritative — the resolver reads it
// (resolve.ts declaredAnchor). paper-95 (paper-3) joined the union when stop 8 became the focus
// ring (owner 2026-07-28); the ink stops keep a lane-specific override in the resolver.
export type Require =
  | { metric: 'wcag'; against: 'paper-99' | 'paper-97' | 'paper-95'; target: number; level: 'AA' | 'AAA' }
  // APCA lightness-contrast requirement (the contrast-PROFILE alternative to wcag): the stop must read
  // |Lc| ≥ targetLc against its declared anchor. Same floor semantics — a placement that already clears
  // does not move. Produced by withProfile() (profiles.ts), never hand-declared in the built-in specs.
  | { metric: 'apca'; against: 'paper-99' | 'paper-97' | 'paper-95'; targetLc: number }
  // minimum perceptual separation (OKLab ΔE, the house stopDeltaE metric) from another RESOLVED stop —
  // 'paper-99' anchors the paper-97 push; 'prev' = the stop's resolved predecessor (the wash seam floors:
  // every ladder seam guarantees distinctness, so no seed — low-chroma grays and muted warms included —
  // can ever collapse a seam again, whatever the producers do).
  | { metric: 'min-separation'; against: 'paper-99' | 'prev'; target: number }
export type StopReq = {
  stop: number                        // 0..11 — scale stops ONLY (cta is a role, never a stop)
  rootL: number
  group: Group
  produce: Producer
  satFraction?: number                // ladder param: envelope saturation fraction
  baseC?: number                      // ladder param (light): absolute base chroma for the ladder/envelope blend
  chromaMult?: number                 // param for produce.chroma === 'brand'
  inkMaxC?: number                    // text-register ceiling: chroma = min(chromaMult × brandC, inkMaxC)
  // dark ink chroma-floor VALUE (unscaled; ×floorStrength at runtime), carried from the
  // stop's SCALE_C_* row. Ink stops only; absent = the ladder law at the stop's own depth.
  chromaFloor?: number
  require?: Require
}

// off-scale roles — the SIX-token cta family (owner respec 2026-07-16). The FILL trio
// (cta / cta-hover / cta-pressed): anchor = the seed's OWN lightness floored at floorL
// (product intent: dark fills must not sink; light has no floor); hue constant (the cta
// carries brand identity, no torsion); hover = hoverL() of the resolved cta, pressed =
// pressedL() (hover's direction, doubled).
// The INK trio (cta-ink / -hover / -pressed) is NOT produced any more (C49, owner
// 2026-08-05): it is the ink band read as states — enabled ≡ ink-53-aa (ink-9), hover ≡
// ink-42-aa (ink-10) (the between stop, formerly a bespoke state-step value generated at
// the role), pressed ≡ ink-30-aaa (ink-11) — so it carries no declaration here; the resolver references the resolved stops
// and every guarantee rides the stops' own requires (T9/T10/T11).
export type RoleName = 'cta' | 'cta-hover' | 'cta-pressed' | 'cta-ink' | 'cta-ink-hover' | 'cta-ink-pressed'
export type RoleReq = {
  role: RoleName
  produce: {
    hue: 'constant'
    L: 'anchor' | 'hover' | 'pressed'
    chroma: 'brand'
  }
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
// ENFORCEMENT itself (the fill re-solves to 4.5-white).
// withProfile('apca') strips the ratio floor; the apca law is the Lc bar.
// (The second on-color, `onHighlight`, is GONE — owner 2026-07-29. It solved the text pole for the
// highlight-9 fill; that fill is now ink-53-aa (ink-9), whose on-color is a declared paper token, not a solve.)
// `coEnforceLc` (the APCA legibility CLEARANCE, default-ON since C18): a SECOND on-fill contrast requirement
// that rides ALONGSIDE the wcag lane's 4.5 floor — read only in the wcag lane (enforceLc undefined);
// opts.apcaClearance=false opts out (instruments). Where wcag and APCA disagree on whether the chosen pole reads, the fill
// is pushed (lighten for black / darken for white) until it also clears this Lc bar, 4.5 staying the hard
// floor. Distinct from `enforceLc` (the apca lane's SOLE bar); never both active at once.
export type OnReq = { metric: 'apca-pole'; enforce: boolean; enforceLc?: number; ratioFloor?: number; coEnforceLc?: number }

export type ModeSpec = {
  stops: StopReq[]
  roles: RoleReq[]
  ons: { onFill: OnReq }
}

// DO NOT align to the paper-3 rename (owner 2026-07-24): stop 3 is PUBLICLY named
// paper-95 (paper-3 pre-Stage-B) but stays in the internal 'wash' group — this
// boundary feeds the requirement solver, and moving it to `stop <= 3 ? 'paper'`
// would CHANGE generation. Name only.
// The 'highlight' group is now a single stop (8, the focus ring); 9+ is ink. (The
// Group enum value itself is an internal grouping label, not an emitted token name —
// Stage B's highlight→mark word change is scoped to emitted names, not this type.)
const groupOf = (stop: number): Group => (stop <= 2 ? 'paper' : stop <= 7 ? 'wash' : stop === 8 ? 'highlight' : 'ink')

// paper-100 (paper-0 pre-Stage-B) — the ladder extreme BEYOND paper-99 (paper-1), now a resolved
// stop instead of a hard-coded absolute (it was the last literal value in the system:
// #ffffff/#000000 pasted into the emitters). Light really is white (rootL 1.0, zero chroma).
// Dark sits one seam BELOW paper-99 (paper-1) — deep, brand-tinted, never the
// void; rootL owner-picked from paper0-sweep.ts (rounds archive — git history only). The lift producer applies like the rest of the
// dark scale.
export const PAPER0_DARK_ROOT_L = 0.16    // owner-picked (revised 2026-07-02 from 0.145 — the tighter gap below paper-99 (paper-1))
const PL_LADDER: Producer = { hue: 'warm-drift', L: 'perceptual', chroma: 'ladder' }
const PL_TEXT: Producer = { hue: 'warm-drift', L: 'perceptual', chroma: 'brand' }
// dark scale uses the LIFT variant (owner-adopted 2026-07-02, the blue-recede fix): the H-K solve may
// raise a hue above the scaffold but never place it below — high-H-K hues (blue/violet) otherwise sink
// under the near-black neutral surfaces they render on. "Dark fills lift, never sink."
const P_LIFT: Producer = { hue: 'warm-torsion', L: 'perceptual-lift', chroma: 'ladder' }
const P_FIXED: Producer = { hue: 'warm-torsion', L: 'fixed', chroma: 'ladder' }
const P_TEXT: Producer = { hue: 'warm-torsion', L: 'perceptual', chroma: 'brand' }

// STOP-8 IS THE FOCUS RING (owner 2026-07-28): it carries the WCAG 1.4.11 non-text 3:1
// against PAPER-95 (paper-3 pre-Stage-B) — the highest background a ring is actually
// drawn on, so clearing it there clears every paper. Was paper-97 (paper-2), which left
// the ring at 2.84–2.89 against paper-95 in five of six light families: conformant
// against the stop it was solved for, short against the one it sits on. `against` is
// authoritative now (resolve.ts declaredAnchor), so the apca lane picks this up through
// DEFAULT_APCA_LC_MAP — 3:1 translates to Lc 30, the same RULE in its own currency,
// never the wcag number.
//
// ONE DECLARATION, BOTH MODES (owner 2026-07-29): *"dark stop 8 has the same requirements
// as light, it is a 3:1 contrast require on paper 3 so inputs can be placed on any paper."*
// Dark used to declare its own S8_DARK anchored at PAPER-97 (PAPER-2), justified on two
// grounds that have both since expired: that the dark ring "already clears paper-3 from
// its own scaffold", and that re-anchoring drove it past the hand-placed hl-9. hl-9 was
// deleted in C33, and the paper-95 clearance was never the scaffold's doing — it was the
// 7→8 carry floor, which fired on 366/366 ramps and has been deleted with this change.
// Measured with the floor gone and the paper-97 anchor kept, dark stop 8 lands at 2.86
// against paper-95 on ALL 366 ramps: an input border on the pop plane would fail 1.4.11.
// The floor was masking a mis-anchored requirement. Anchored at paper-95 it lands on the
// law — worst 3.04 over 360 agnostic seeds + 6 neutrals, clearing 3:1 on every paper in
// both modes from one rule.
const S8: Require = { metric: 'wcag', against: 'paper-95', target: STOP_8_NONTEXT_CONTRAST, level: 'AA' }
// INK ANCHOR NOTE (owner 2026-07-28): in the WCAG lane the resolver anchors ink
// requires (the ink stops 9–11) at paper-95 (paper-3) — the nearest paper —
// so "ink-53-aa is usable on every paper" is a law, not a hope (resolve.ts
// wcagAnchorStop). That override is LANE-SPECIFIC, so it stays in the resolver; the
// apca lane keeps paper-97 (paper-2) (clears paper-95 with margin, byte-identical) and
// reads it from the declaration below.
// T9 IS ALSO THE EMPHASIS-FILL BAR (owner 2026-07-29): the deleted highlight-9 declared
// exactly this — 4.5 against paper-3 (paper-95) — which is why the two stops collided
// and why one of them can carry both jobs. Nothing about the number changed; only the
// count of stops asking for it.
const T9: Require = { metric: 'wcag', against: 'paper-97', target: INK_9_CONTRAST, level: 'AA' }
// T10 (C49): the between text stop's guarantee — a floor that never fires on the current
// geometry (the midpoint placement reads 6.84+ vs paper-95 sweep-wide); see stopTable.ts.
const T10: Require = { metric: 'wcag', against: 'paper-97', target: INK_10_CONTRAST, level: 'AA' }
const T11: Require = { metric: 'wcag', against: 'paper-97', target: INK_11_CONTRAST_FLOOR, level: 'AAA' }

// ONE on-color left (owner 2026-07-29). `onHighlight` is deleted with the band it named:
// C31 had already reduced it to a constant (white in light, black in dark, every family)
// by forcing hl-9 to clear 4.5 against paper-95 (paper-3), so it was an emitted token that no
// longer carried a solved value. Its successor is a declaration in the semantic layer —
// `-fg-on-emphasis` → --paper-100 (--paper-0 pre-Stage-B) — measured at worst 4.96 (light) /
// 8.04 (dark) against ink-53-aa (ink-9) over the 360-seed agnostic sweep. Only the cta still
// solves its own text pole.
// onFill CARRIES THE POLE FLOOR (owner 2026-07-29). It was the one requirement without a
// `ratioFloor`, on the reasoning recorded above — "onFill's floor is the ENFORCEMENT itself
// (the fill re-solves to 4.5-white)". That reasoning fails wherever the fill is not allowed to
// move: `exact` turns enforcement off to ship the typed hex, and with no pole floor the label
// simply missed 4.5 (22 of 31 shipped brand secondaries did, dark 2.54-2.97:1). Declaring the
// floor makes the POLE carry legality — measured sufficient, a flip alone reaches 4.5 on 240/240
// agnostic seeds and 62/62 brand-secondary lanes with the fill left on the hex.
// C42 (owner 2026-08-02): the clearance bar is Lc 65 — every cta clears it except critical,
// whose identity carve-out (CRITICAL_CLEARANCE_LC 50, profiles.ts) rides in per-call via
// opts.apcaClearanceLc. Exact and custom-secondary ctas stay inert (enforce off).
const ONS = { onFill: { metric: 'apca-pole', enforce: true, ratioFloor: 4.5, coEnforceLc: 65 } as OnReq }

// paper/wash separation is a PROPERTY OF THE ROOT_L_LIGHT SHAPE, not a runtime delta (owner 2026-07-09,
// render/paper2-distributions.html, distribution "B"). The near-white ladder's gaps grow geometrically
// (~1.25×/step), so paper-97 (paper-2) stands ~0.017 ΔE off paper-99 (paper-1) and every wash seam holds BY CONSTRUCTION —
// paper-97 (paper-2) falls onto its ID curve with nothing clamped. This REPLACES the old min-separation deltas: the
// former 0.028 target was unreachable near white (the gamut can't earn it via chroma), so it was enforced by
// darkening / chroma-spend — which pushed paper-97's (paper-2's) chroma off-curve and past paper-95 (paper-3) on wide-gamut hues (the
// shipped e87f760 bug). stop-8's 3:1 stays: it is a real contrast requirement, not a separation delta.
// (The resolver still SUPPORTS a min-separation require for portable specs; our spec just no longer declares
// one. Light-only; dark already reads right.)

export const LIGHT: ModeSpec = {
  stops: [
    // paper-100 (paper-0 pre-Stage-B): the resolved ladder extreme — in light it genuinely is white (rootL 1.0, zero chroma)
    { stop: 0, rootL: 1.0, group: 'paper', produce: { hue: 'warm-drift', L: 'fixed', chroma: 'ladder' }, satFraction: SCALE_C_LIGHT[0].sat, baseC: SCALE_C_LIGHT[0].base },
    // paper/wash/mark-74-aa: perceptual ladder/envelope blend on the geometric ROOT_L_LIGHT scaffold. Separation
    // falls out of the shape (see above) — no min-separation require. Only stop 8 carries a require: the WCAG
    // 3:1 vs the resolved paper-97 (paper-2) (re-solves automatically since it references paper-97 (paper-2)).
    ...[1, 2, 3, 4, 5, 6, 7, 8].map((stop): StopReq => ({
      stop, rootL: ROOT_L_LIGHT[stop], group: groupOf(stop), produce: PL_LADDER,
      satFraction: SCALE_C_LIGHT[stop].sat, baseC: SCALE_C_LIGHT[stop].base,
      require: stop === 8 ? S8 : undefined,
    })),
    // ink text: perceptual + contrast-required. ink-53-aa (ink-9) is ALSO the emphasis fill (the
    // highlight-9 collapse, owner 2026-07-29). ink-42-aa (ink-10) is the between text stop (C49) —
    // a normal stop like its neighbors; the cta-ink trio references all three as states.
    { stop: 9, rootL: ROOT_L_LIGHT[9], group: 'ink', produce: PL_TEXT, chromaMult: SCALE_C_LIGHT[9].inkMult, inkMaxC: SCALE_C_LIGHT[9].inkMaxC, chromaFloor: SCALE_C_LIGHT[9].chromaFloor, require: T9 },
    { stop: 10, rootL: ROOT_L_LIGHT[10], group: 'ink', produce: PL_TEXT, chromaMult: SCALE_C_LIGHT[10].inkMult, inkMaxC: SCALE_C_LIGHT[10].inkMaxC, chromaFloor: SCALE_C_LIGHT[10].chromaFloor, require: T10 },
    { stop: 11, rootL: ROOT_L_LIGHT[11], group: 'ink', produce: PL_TEXT, chromaMult: SCALE_C_LIGHT[11].inkMult, inkMaxC: SCALE_C_LIGHT[11].inkMaxC, chromaFloor: SCALE_C_LIGHT[11].chromaFloor, require: T11 },
  ],
  roles: [
    // (the cta-ink trio carries no role declarations — it references the resolved ink
    // stops 9/10/11 as states; see the RoleReq banner above)
    { role: 'cta', produce: { hue: 'constant', L: 'anchor', chroma: 'brand' }, floorL: 0, chromaMult: 1 },
    { role: 'cta-hover', produce: { hue: 'constant', L: 'hover', chroma: 'brand' }, floorL: 0, chromaMult: 1 },
    { role: 'cta-pressed', produce: { hue: 'constant', L: 'pressed', chroma: 'brand' }, floorL: 0, chromaMult: 1 },
  ],
  ons: ONS,
}

export const DARK: ModeSpec = {
  stops: [
    // paper-100 (paper-0 pre-Stage-B): the resolved ladder extreme — one seam BELOW paper-99 (paper-1), deep and brand-tinted, never the
    // absolute void (the old hard-coded #000000 was "too much"). Lift applies like the rest of the scale.
    { stop: 0, rootL: PAPER0_DARK_ROOT_L, group: 'paper', produce: P_LIFT, satFraction: SCALE_C_DARK[0].sat },
    // paper/wash 1–7: perceptual on the dark scaffold. stop 8: FIXED at the hand-placed scaffold BUT with the
    // 3:1 non-text require DECLARED (the Stage-5 flip, owner-approved) — the blue-recede failure is prevented
    // BY RULE, not by patch. The require now genuinely PLACES the stop rather than catching a few low-luminance
    // hues: on the delta-carry path it solves from the sentinel every time, and the old claim that "most hues
    // already clear it from the scaffold and don't move" was only ever true because the 7→8 carry floor had
    // already lifted them past it (owner 2026-07-29 — see the S8 note above).
    ...[1, 2, 3, 4, 5, 6, 7, 8].map((stop): StopReq => ({
      stop, rootL: ROOT_L_DARK[stop], group: groupOf(stop), produce: stop === 8 ? P_FIXED : P_LIFT,
      satFraction: SCALE_C_DARK[stop].sat, require: stop === 8 ? S8 : undefined,
    })),
    // ink text: perceptual + the contrast requires DECLARED in dark too (Stage-5 flip): the scaffold already
    // clears them for every hue (the gate proves it), so values don't move — but the guarantee is now a rule.
    { stop: 9, rootL: ROOT_L_DARK[9], group: 'ink', produce: P_TEXT, chromaMult: SCALE_C_DARK[9].inkMult, inkMaxC: SCALE_C_DARK[9].inkMaxC, chromaFloor: SCALE_C_DARK[9].chromaFloor, require: T9 },
    { stop: 10, rootL: ROOT_L_DARK[10], group: 'ink', produce: P_TEXT, chromaMult: SCALE_C_DARK[10].inkMult, inkMaxC: SCALE_C_DARK[10].inkMaxC, chromaFloor: SCALE_C_DARK[10].chromaFloor, require: T10 },
    { stop: 11, rootL: ROOT_L_DARK[11], group: 'ink', produce: P_TEXT, chromaMult: SCALE_C_DARK[11].inkMult, inkMaxC: SCALE_C_DARK[11].inkMaxC, chromaFloor: SCALE_C_DARK[11].chromaFloor, require: T11 },
  ],
  roles: [
    // (the cta-ink trio: stop references 9/10/11, no declarations — see the light spec)
    { role: 'cta', produce: { hue: 'constant', L: 'anchor', chroma: 'brand' }, floorL: DARK_CTA_MIN_L, chromaMult: 1 },
    { role: 'cta-hover', produce: { hue: 'constant', L: 'hover', chroma: 'brand' }, floorL: DARK_CTA_MIN_L, chromaMult: 1 },
    { role: 'cta-pressed', produce: { hue: 'constant', L: 'pressed', chroma: 'brand' }, floorL: DARK_CTA_MIN_L, chromaMult: 1 },
  ],
  ons: ONS,
}

export const MODE_SPECS = { light: LIGHT, dark: DARK }
