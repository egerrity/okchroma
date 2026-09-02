// resolve.ts — the requirement-token RESOLVER. Executes the pure declaration (spec.ts) by dispatching each
// stop/role to a NAMED producer implementation (producers.ts — verbatim engine math). Per scale stop:
// PRODUCER (hue → chroma → L) → REQUIRE (contrast clamp, iterated) → REFINE (chroma yields to gamut at emit).
// Off-scale ROLES (stamp-fill / stamp-fill-hover / stamp-fill-pressed) and the on-color booleans follow the engine's exact evaluation order:
// dark cta anchor BEFORE the dark stops (the torsion anchors at it), on-fill judged PRE-enforcement, the
// enforce re-solve last. Total: an unmet require yields an explicit `unresolvable`, never a silent fudge.
//
// The producers are verbatim ports of the pre-resolver engine, proven byte-identical at cutover (c7542b7);
// the blessed snapshot audits are the standing regression gate.
import { apparentL, perceptualRungL, perceptualDarkC } from '../perceptualL'
import { clampChromaToGamut, wcagY, legalRatio, findMaxLForContrast, apcaLc, contrastRatio, shippedY } from '../constraints'
import { hexToOklch, srgbEmitChannels, redSolveDist, RED_GATE, RED_SOLVE } from '../colorMath'
import { stateFillL } from '../archetypes'
import { ROOT_L_LIGHT, DARK_SIGNAL_WARM_DRIFT, chromaFloorBase, STOP_8_NONTEXT_CONTRAST, PENCIL_9_CONTRAST, PEN_10_CONTRAST } from '../stopTable'
import { STAMP_FILL, STAMP_FILL_HOVER, STAMP_FILL_PRESSED } from '../tokenNames'
import { MODE_SPECS, textLane, type ModeSpec, type StopReq, type RoleReq, type Require } from './spec'
import {
  buildContext, buildDarkContext, type Ctx, type DarkCtx, type ResolveOpts,
  lightScaleChromaAt, placeLightScale, placeLightText,
  separationClampLight,
  darkScaleChromaAt, darkTextChromaAt, placeDark, placeDarkDelta, deltaDarkTargetL, deltaLiftChroma, deltaDarkPlace, flatDarkCtaL, smoothedBandLift,
  onFillIsWhiteLight, onFillIsWhiteDarkAt, ctaLightL, ctaDarkEnforcedL,
  ctaLightLApca, ctaDarkEnforcedLApca, solveBrandExit, solveDarkCtaExit, ctaDualGateL, ctaDarkDualGateL,
  apcaYAt, findMaxLForApcaLc, APCA_SOLVE_MARGIN_LC, APCA_TOL_LC, APCA_ENFORCE_MARGIN_LC,
} from './producers'

// hex = the sRGB clamp-down of the resolved stop (gamut-map by chroma-reduction, §4B)
const oklchToSrgb = (L: number, C: number, H: number) => (Object.values(srgbEmitChannels({ L, C, H })) as number[]).map(c => Math.max(0, Math.min(1, c))) as [number, number, number]
const toHex = (rgb: [number, number, number]) => '#' + rgb.map(c => Math.round(c * 255).toString(16).padStart(2, '0')).join('')

export type ResolvedStop = {
  stop: number; group: string; L: number; C: number; H: number; hex: string; Y: number; appL: number
  clamped: boolean; unresolvable?: string
}
export type ResolvedRole = { role: RoleReq['role']; L: number; C: number; H: number; hex: string; Y: number; appL: number; enforced?: boolean; repelled?: boolean }
export type Seed = { hex: string; L: number; C: number; H: number }
export type ResolvedRamp = {
  mode: 'light' | 'dark'
  seed: Seed
  stops: ResolvedStop[]
  // the cta FILL trio. (The pen trio DELETED, owner 2026-08-12 — the text-register
  // cta is the pen stops 9/10/11 read directly from `stops`.)
  roles: {
    cta: ResolvedRole; ctaHover: ResolvedRole; ctaPressed: ResolvedRole
  }
  // one on-color left: the cta's own text pole. onHighlightIsWhite died with the
  // highlight band (owner 2026-07-29) — pencil-47's on-color is a paper token now.
  ons: { onFillIsWhite: boolean }
}
export type { ResolveOpts }

// the loudness cap on the APCA-clearance move (v1 raw-L symmetric budget around the brand fill; owner-tuned
// from the exhibit marks — plan open item 4). 4.5 is NEVER capped; only the Lc ambition is. No emphasis-band
// clamp: the emphasis fill (pencil-47) sits at a mid L (often BELOW the cta), so a black-lighten moves AWAY from it —
// there is no highlighter risk to guard, and clamping to it wrongly killed the move.
// The clearance caps are the POLE caps (owner 2026-07-13 dead-zone ruling: the bar is the
// goal, not an ambition — the old ±0.16 taste budget capped worst-case dead zones short of
// legibility and is retired; 4.5 was never capped either way).
// (exported 2026-09-02 so the docs site renders the caps live; value and use unchanged)
export const CTA_CLEARANCE_CAPS: [number, number] = [0.05, 0.92]

// THE CROSS-FAMILY HIGHLIGHTER BOUND ON THE NEUTRAL PENS (T13, owner-caught 2026-09-01).
// The pen guarantee is symmetric: a pen and a ground are in scope when they share a family
// or either side is the neutral, both directions. NEUTRAL_W80_WORST_SHIP_Y (inside
// resolveRamp) bounds every chromatic pen against the neutral's highlighter-20; nothing
// bounded the NEUTRAL's pens against the chromatics', and neutral pen-58 light read 4.16
// on info highlighter-20 while guarantee-audit (one direction only) read PASS. Same
// doctrine as its two siblings: frozen at the worst SHIPPED highlighter-20 Y any theme can
// put on screen — light min (darkest) / dark max (lightest) over brand seeds L 0.2–0.8 ×
// C 0.08–0.4 × hue 0–359 in the recommended, exact, deeper and archetypeOverride
// registers, the derived brand-alt, the four base signals, every per-brand signal
// override and the audit fixtures (118,972 seeds, resolveTheme → shippedY, 2026-09-01):
//   light 0.459357  brand stop 7 at seed #2e0f8a (L 0.777 C 0.086 H 281, violet)
//   dark  0.074936  brand stop 7 at seed #411000, style 'deeper' (L 0.427 C 0.112 H 63)
// The `full-chroma` register is NOT in the bound: its released cap sinks the violet-band
// highlighter-20 to 0.392975 light / 0.078646 dark, which would cost the neutral pen-58
// ≈0.05 L in every theme, so the owner removed its checkbox from both plugins and the demo
// (2026-09-01); the GenerateOptions lever stays for instruments, outside the guarantee, and
// guarantee-audit prints its residual as a report cell. generateNeutralScale passes this through opts.crossHighlighterBoundY (the
// resolver has no neutral flag — scaleName is metadata) and the shipped-pair clamp on
// stops 10–11 takes it as a third floor; stop 9 (pencil-47) never does, pencil is
// paper-only by design. Dark clears by construction (neutral dark pen-58 ≥ 5.17 against
// it) and pen-70 clears in both modes, so only the light neutral pen-58 moves
// (L ≈0.413 → ≈0.398). RE-DERIVE if the highlighter ladder, the ramp chroma cap or a
// signal seed moves.
export const CHROMATIC_W80_WORST_SHIP_Y = { light: 0.459357, dark: 0.074936 } as const
// THE CROSS-FAMILY PAPER BOUND ON THE NEUTRAL'S CONTRAST STOPS (T13, owner 2026-09-01: "the rule
// is true for every band"). The paper claims are symmetric the same way: NEUTRAL_P3_WORST_SHIP_Y
// bounds every chromatic crayon/pencil/pen against the neutral's paper-5; this bounds the
// NEUTRAL's crayon-26, pencil-47 and pens against the worst CHROMATIC paper-5 — neutral
// crayon-26 read 2.987 and pencil-47 4.484 on a violet brand's paper-5 (both need ≤0.003 L).
// Frozen at the worst SHIPPED chromatic paper-5 Y over the same registers and seed sweep as
// the highlighter bound (72,584 seeds, resolveTheme → shippedY, 2026-09-01):
//   light 0.836007  brand stop 3 at seed #5233ff (L 0.944 C 0.022 H 278, violet)
//   dark  0.016041  brand stop 3 at seed #794d00, archetypeOverride near-black (L 0.251 C 0.038 H 87)
// Each stop is judged at ITS band's claim bar (crayon 3, pencil 4.5, pens 4.5), never the
// stop's own target. Light only in effect (dark clears: worst 3.015 / 7.5); the pens clear
// by ladder monotonicity and are declared, not moved. RE-DERIVE with the highlighter bound.
export const CHROMATIC_P3_WORST_SHIP_Y = { light: 0.836007, dark: 0.016041 } as const
// the CROSS-FAMILY paper bound (owner defect 2026-08-03 — her measured pair was the
// brand pencil-47 (ink-9) on the NEUTRAL paper-5 (paper-3), 4.479:1; her follow-up
// caught crayon-26 (highlight-8) the same way, 26/72 under 3:1): "usable on every
// paper" includes the per-brand NEUTRAL's papers, and the own-family paper-5 (paper-3)
// is NOT the nearest paper for green-band brands — their tinted paper carries more Y
// than the near-gray neutral at the same L. Covers every contrast-required stop from 8
// up: the pens are text on any paper, and crayon-26 (highlight-8) is the focus-
// ring/border register that sits on neutral surfaces (WCAG 1.4.11).
// The bound is the worst SHIPPED neutral paper-5 (paper-3) Y over hue 0..350 × every NeutralLevel:
// light min 0.845015 (H260 branded #e8edf8) · dark max 0.014247 (H300 medium #211f23),
// measured 2026-08-03 via generateNeutralScale → stopHex; re-derived 2026-08-11 for the
// default-tint retune (default 0.75x + the medium rung) — both worsts UNCHANGED, the dark
// worst simply renamed with its level (medium = the old default). A per-theme neutral is not in
// scope here (the ramp resolves per family), so the floor clears the worst neutral any
// theme can generate. RE-DERIVE if the neutral curve or the paper ladder moves.
// (Module-scope and exported since 2026-09-02 so the docs site renders the bound live;
// the value and its use are unchanged.)
export const NEUTRAL_P3_WORST_SHIP_Y = { light: 0.845015, dark: 0.014247 } as const
// The same doctrine for the highlighter-20 anchor (T10's highlighter-20 law, owner 2026-08-27): the
// pen group's claim spans its own family AND the neutral, so the bound is the worst
// SHIPPED neutral highlighter-20 Y over hue 0..350 × every NeutralLevel — light min (darkest)
// H290 branded, dark max (lightest) H30 branded, measured 2026-08-27 via
// generateNeutralScale → shippedY (scratchpad derive-w80-bound). RE-DERIVE if the
// neutral curve or the highlighter ladder moves. A highlighter-20-anchored stop needs no paper bound:
// clearing the darkest highlighter clears every paper of both ramps by ladder monotonicity.
export const NEUTRAL_W80_WORST_SHIP_Y = { light: 0.506433, dark: 0.074262 } as const

// `spec` defaults to the built-in mode table; a parsed DTCG requirement bundle can be passed instead —
// the resolver executes whatever declaration it's handed (portability: the token file is the source of truth).
export function resolveRamp(hex: string, mode: 'light' | 'dark', spec?: ModeSpec, opts?: ResolveOpts): ResolvedRamp {
  const o = hexToOklch(hex); const seed: Seed = { hex, ...o }
  const ctx = buildContext(hex, opts)
  spec ??= MODE_SPECS[mode]
  // THE INVERSE LANE KEEPS ITS OWN LADDER (guarantee-groups round, owner 2026-08-27):
  // T10's highlighter-20 law is a claim about highlighters, which the inverse lane never ships — its
  // pen register is text on a pen-70 fill, judged against PEN_70_GROUND at the
  // 4.5 / 6.5 / 7.0 ladder the inverse round froze. On the textGround path stop 10's
  // target therefore stays 6.5 (the anchor is moot there: groundOf overrides every
  // pen stop's ground to textGround).
  if (ctx.opts?.textGround) {
    spec = {
      ...spec,
      stops: spec.stops.map(s => (s.stop === 10 && s.require?.metric === 'wcag'
        ? { ...s, require: { ...s.require, target: 6.5 } } : s)),
    }
  }
  const ctaReq = spec.roles.find(r => r.role === STAMP_FILL)
  const hoverReq = spec.roles.find(r => r.role === STAMP_FILL_HOVER)
  const pressedReq = spec.roles.find(r => r.role === STAMP_FILL_PRESSED)
  if (!ctaReq) throw new Error(`spec has no ${STAMP_FILL} role`)
  // enforce: caller opts override the spec's declared default (the declaration is the source of truth; the
  // cutover adapter always passes the flag explicitly, preserving generateScale's opts semantics).
  const onFillEnforce = ctx.opts?.enforceOnFillContrast ?? spec.ons.onFill.enforce
  // dark context (cta anchor + torsion) resolves BEFORE the stops — the dark hue path anchors at dark9L
  const dctx: DarkCtx | null = mode === 'dark' ? buildDarkContext(ctx, ctaReq.floorL) : null

  const stops: ResolvedStop[] = []
  const emit = (stop: number, group: string, L: number, C: number, H: number, clamped = false, unresolvable?: string): ResolvedStop => {
    const gC = clampChromaToGamut(L, C, H)   // REFINE: chroma yields to gamut at emit (makeStop parity)
    return { stop, group, L, C: gC, H, hex: toHex(oklchToSrgb(L, gC, H)), Y: wcagY(L, gC, H), appL: apparentL(L, gC, H), clamped, unresolvable }
  }
  const refOf = (stopNum: number, forWhom: number): ResolvedStop => {
    const ref = stops.find(s => s.stop === stopNum)
    if (!ref) throw new Error(`stop ${forWhom}: require against stop ${stopNum} but it is not resolved yet`)
    return ref
  }
  // Reference measures are taken off the resolved GROUND (groundOf / apcaGroundOf below) —
  // wcagY for the wcag lane, apcaYAt (the APCA screen-luminance model) for the apca lane.
  // THE DECLARED ANCHOR (owner 2026-07-28): `require.against` is now AUTHORITATIVE —
  // it used to be documentation while the resolver hardcoded paper-3 (paper-2) here and in the
  // apca path, so moving a require's anchor meant editing the engine rather than the
  // declaration. spec.ts is the portable artifact; the anchor belongs in it.
  // highlighter-20 joined the union with the T10 highlighter-20 law (guarantee-groups round, owner
  // 2026-08-27): the pen group's highlighter claim anchors at the darkest highlighter.
  const AGAINST_STOP: Record<string, number> = { 'paper-1': 1, 'paper-3': 2, 'paper-5': 3, 'highlighter-20': 7 }
  const declaredAnchor = (req: Require): number =>
    req.metric === 'min-separation' ? 1 : AGAINST_STOP[req.against] ?? 2
  // THE PEN ANCHOR (owner rule 2026-07-28: "ink-10 can only be used on papers" — and it
  // must PASS on all of them): in the WCAG lane the pen requires (the pen stops
  // 9–11) anchor at paper-5 (paper-3), the NEAREST paper (light's darkest, dark's
  // lightest), so clearing the bar there clears every paper. The apca lane keeps its
  // paper-3 (paper-2) anchor — its Lc solve already clears paper-5 with margin everywhere
  // (agnostic sweep worst 5.28 wcag-ratio, 0/216 under 4.5) and stays byte-identical.
  // Lane-specific, so it stays an override on top of the declaration rather than in it.
  // Threshold moved 10 → 9 with the 2026-07-29 renumber: the pen band starts at 9 now.
  // This IS why the collapse is visually cheap — it is the rule that made pencil-47 (then
  // ink-10) land on top of highlight-9, both solving 4.5 against paper-5 (paper-3).
  // The override applies only when the declaration names a PAPER: a declared highlighter anchor
  // (T10's highlighter-20 law) is already darker than every paper and must be honored as-is.
  const wcagAnchorStop = (req: Require, stop: number) =>
    (stop >= 9 && declaredAnchor(req) <= 3 ? 3 : declaredAnchor(req))
  // THE INVERSE PEN GROUND (owner round 2026-08-19, opts.textGround): the pen stops solve
  // against an EXTERNAL color rather than a stop of their own ramp — the inverse link family
  // is text on a pen-70 fill. Everything downstream reads its ground through these two, so
  // the override lands once and the wcag/apca/shipped-pair paths cannot drift apart. Absent
  // (every other caller) = the declared/lane anchor, byte-identical.
  const textGround = ctx.opts?.textGround?.[mode]
  const groundOf = (req: Require, stop: number): { L: number; C: number; H: number } =>
    textGround && stop >= 9 ? textGround : refOf(wcagAnchorStop(req, stop), stop)
  const apcaGroundOf = (req: Require, stop: number): { L: number; C: number; H: number } =>
    textGround && stop >= 9 ? textGround : refOf(declaredAnchor(req), stop)
  // the light contrast solves are metric-blind: the resolver hands the producer a maxLFor closure built
  // from the declared require. wcag closures call findMaxLForContrast with the exact old arguments
  // (float-identical — the wcag profile stays byte-for-byte); apca closures swap in the Lc bisection.
  // `withMargin` mirrors the wcag idiom: the scale solve carries the emit margin, the pen solve doesn't.
  const maxLForOf = (req: Require, forWhom: number, withMargin: boolean): ((C: number, H: number) => number) => {
    if (req.metric === 'wcag') {
      const g = groundOf(req, forWhom)
      const refY = wcagY(g.L, g.C, g.H)
      const t = withMargin ? req.target + 0.05 : req.target
      return (C, H) => findMaxLForContrast(C, H, refY, t)
    }
    if (req.metric === 'apca') {
      const ga = apcaGroundOf(req, forWhom)
      const refA = apcaYAt(ga.L, ga.C, ga.H)
      const t = withMargin ? req.targetLc + APCA_SOLVE_MARGIN_LC : req.targetLc
      return (C, H) => findMaxLForApcaLc(C, H, refA, t)
    }
    throw new Error(`stop ${forWhom}: ${req.metric} is not a contrast require`)
  }
  // (the stop10DeepenL/stop11DeepenL opts were DELETED 2026-07-29: no caller in the repo
  // ever set either, so the pen solve always ran at deepen 0. Removing them rather than
  // renumbering them keeps a dead knob from naming a stop that no longer means what it said.)
  const TEXT_DEEPEN = 0

  for (const sp of spec.stops) {
    let placed: { L: number; C: number; H: number }
    let clamped = false, unresolvable: string | undefined

    if (mode === 'light') {
      // LIGHT: verbatim engine producers, dispatched by group
      if (textLane(sp.group)) {
        if (!sp.require) throw new Error(`light pen stop ${sp.stop} must declare a contrast require`)
        placed = placeLightText(ctx, sp.rootL, sp.chromaMult ?? 1, maxLForOf(sp.require, sp.stop, false), TEXT_DEEPEN, sp.textMaxC)
        clamped = true
      } else if (sp.produce.L === 'fixed') {
        // fixed light stop (paper-0): sits exactly at its declared extreme
        const chromaAt = lightScaleChromaAt(ctx, sp.baseC ?? 0, sp.satFraction ?? 1)
        placed = { L: sp.rootL, C: chromaAt(sp.rootL), H: ctx.lightHueAt(sp.rootL) }
      } else {
        const chromaAt = lightScaleChromaAt(ctx, sp.baseC ?? 0, sp.satFraction ?? 1)
        const contrastReq = sp.require && sp.require.metric !== 'min-separation' ? sp.require : undefined
        // goldBoost scales (signals) price the rung's apparent target at pre-boost chroma —
        // the shine stays in the emitted chroma but no longer floats the rung's lightness
        const targetChromaAt = ctx.chromaBoost !== 1 ? lightScaleChromaAt(ctx, sp.baseC ?? 0, sp.satFraction ?? 1, 1) : undefined
        placed = placeLightScale(ctx, sp.rootL, chromaAt, contrastReq ? maxLForOf(contrastReq, sp.stop, true) : undefined, targetChromaAt)
        clamped = !!contrastReq
        if (sp.require?.metric === 'min-separation') {
          const refStop = sp.require.against === 'paper-1' ? 1 : sp.stop - 1
          const ref = stops.find(s => s.stop === refStop)
          if (!ref) throw new Error(`stop ${sp.stop}: min-separation against stop ${refStop} but it is not resolved yet`)
          const before = placed.L
          placed = separationClampLight(ctx, placed, chromaAt, ref, sp.require.target)
          clamped = placed.L !== before
        }
      }
    } else {
      // DARK: verbatim engine producers; 'fixed' stays at the hand-placed scaffold, 'perceptual' solves
      const d = dctx!
      const textTwin = textLane(sp.group) && ctx.opts?.deltaCarry && ctx.opts?.chromaCurve
        ? ctx.opts.deltaLightStops?.find(s => s.stop === sp.stop) : undefined
      const chromaAt =
        textLane(sp.group)
          // curve-bearing ramps (neutral, derived secondary): pen chroma = the light twin's (the curve's dark
          // branch is keyed to the OLD dark L geography — sampling it at delta pen L's made the 11-jump).
          // Low-chroma pens carry no hue-family risk; L and hue stay dark-native.
          // THE CHROMA FLOOR IS A DECLARED VALUE (sp.chromaFloor, from the stop's SCALE_C_* row) —
          // normalized 2026-08-05 from a ladder index that had to be pinned across renumbers (the
          // 2026-07-10 trap). A portable spec without the field falls back to the ladder law at the
          // stop's own depth, which is what an index-less spec means.
          ? (textTwin ? ((_L: number) => textTwin.C) : darkTextChromaAt(ctx, d, sp.chromaFloor ?? chromaFloorBase(sp.stop), sp.chromaMult ?? 1, sp.textMaxC))
        // chroma-floor index clamps at 0: stop 0 shares paper-1's (paper-1's) tint treatment
        : darkScaleChromaAt(ctx, d, Math.max(0, sp.stop - 1), sp.satFraction ?? 1)
      // DELTA-KEYED: derive dark from the resolved light twin for the SURFACE stops 1–8 (papers, highlighters,
      // focus ring). PENS 9–11 are dark-native (owner 2026-07-09): text INVERTS across modes — there is
      // no "same color, re-referenced" for a stop that crosses the paper; carrying a dark-gold pen's hue up
      // ~0.3 L lands in a different hue family (gold→orange). The C9/C11 dark text register + the
      // T9/T10/T11 requires own the pens, on the seed-keyed path below.
      // C28 SIGNAL WARM DRIFT: the re-derived hue for this stop (signals only), else null
      let spineH: number | null = null
      const dl = ctx.opts?.deltaLightStops
      // carry range ends at 8 — it used to run to 9 for the highlight fill, which is gone
      const ls = dl && sp.stop >= 1 && sp.stop <= 8 ? dl.find(s => s.stop === sp.stop) : undefined
      if (ls && ctx.opts?.deltaCarry) {
        // THE CARRY: hue carried verbatim from the light twin; chroma verbatim at ×1 and resampled from
        // the light ladder's chroma-at-depth under a C24 band lift — for EVERY ramp kind (OKLab C is
        // near-uniform in perceived chroma; a saturation/gamut-ratio floor was tried and REJECTED — sRGB
        // geometry made blue→red highlighters hyper-chromatic; evaluating a declared chromaCurve at the DARK L was
        // tried and REJECTED — the curves are keyed to the OLD dark's L geography, so the delta's paper L's
        // landed in their highlighter-tint region and tinted the papers 8×, owner-caught). Lightness re-referenced
        // to the dark ground in APPARENT space (deltaDarkTargetL).
        // REQUIREMENT stops (s8) carry their RECIPE, not a parity: light places s8 BY the 3:1-vs-paper-3
        // (paper-2) clamp, so dark re-solves that same law against the dark paper-3 (paper-2) exactly (the require block below
        // does the solve from the ground up). appL parity would land off-law and the floor's hue-dependent
        // correction was the residual sRGB-shaped wobble (fired 84/108; whole-band 6.90 vs 0.72 for 1–7).
        // THE SMOOTHED BAND (owner round 2026-08-13): the whole surface band 1–7 —
        // papers included, the C27 pin retired — lands on the C28 photometric dialect
        // at the COMPUTED band lift: light's log-contrast distribution between the
        // held ground and the held highlighter-20 (producers.smoothedBandLift). Require
        // stops (8) still solve from the sentinel by their own law.
        const lift = smoothedBandLift(sp.stop)
        let C = ls.C
        let L: number
        if (sp.require && sp.require.metric !== 'min-separation') L = 0.05
        else if (sp.stop >= 1 && sp.stop <= 7) {
          const p = deltaDarkPlace(dl!, ls, lift, 0, ROOT_L_LIGHT[sp.stop])
          L = p.L; C = p.C
        } else L = deltaDarkTargetL(ls, C, ls.H)
        // C28: the warm-spine drift is L-DEPENDENT, but the carry copies the light twin's
        // hue — leaving a dark stop at yellow-for-a-light-stop (warning read olive). Signals
        // re-derive the SAME light drift law (ctx.lightHueAt — WITH its C8 cool-edge taper,
        // so lemon holds its identity hue) at this stop's own dark L, at the owner's
        // conservative fraction. Brands keep a mode-stable identity hue by design.
        // The drift rotates HUE ONLY. C28 also re-clamped chroma to the gamut at the
        // rotated hue here; that guard is DELETED (owner 2026-07-28) — emit owns the
        // gamut boundary (makeStop + emit() both clampChromaToGamut on the final
        // L/C/H), so the guard re-did a job already done one layer down. It ran BEFORE
        // this stop's lightness was final, which made it wrong exactly where L still
        // moves: stop 9 clamped at its pre-floor L (.499, ceiling .127) and the
        // band-order floor then lifted L to .758 where the ceiling is .193 — 21% of
        // warning's chroma discarded against a limit that wasn't there, and nothing
        // downstream to rebuild it (stop 8 hits the same trap at the L=0.05 sentinel
        // but its require solve restores C from ls.C). Measured: removing it moves
        // 2 of 176 stops — warning's dark hl-9 in each lane, #E79F51 → #F59920 —
        // and leaves 174 byte-identical.
        if (ctx.opts?.signalWarmDrift) {
          const h = ls.H + DARK_SIGNAL_WARM_DRIFT * (ctx.lightHueAt(L) - ls.H)
          if (Math.abs(h - ls.H) > 1e-9) spineH = h
        }
        // (The dark BAND-ORDER FLOOR that held the highlight fill above its 3:1 rung, and the
        // apca dead-zone lift that rode with it, are DELETED with stop 9 — owner 2026-07-29.
        // Their mirror for the 7→8 seam survives below; it is a different constraint.)
        // PER-BOLT-ON INSTRUMENTS (gated, default off → byte-identical): layer exactly ONE old dark mechanism
        // onto the pure carry, real engine fns only. Only one is set per resolve (one column of the exhibit).
        if (ctx.opts.deltaHKPlace) L = perceptualRungL(sp.rootL, ls.C, ls.H)                                       // old apparent-L placement
        if (ctx.opts.deltaLiftFloor) L = Math.max(L, sp.rootL)                                                     // old lift/recede floor
        if (ctx.opts.deltaChromaEq && !textLane(sp.group)) C = ctx.cAt('dark', L, perceptualDarkC(L, ls.H, ctx.brandC))  // old H-K chroma equalizer
        placed = { L, C, H: spineH ?? ls.H }
      } else if (sp.produce.L === 'fixed') {
        placed = ls
          ? placeDarkDelta(d, sp.rootL, chromaAt!, ls)
          : { L: sp.rootL, C: chromaAt!(sp.rootL), H: d.darkHueAtL(sp.rootL) }
      } else {
        // Dark pens are SCAFFOLD-PLACED (owner revert 2026-08-13): the 53-peak pen
        // mirror shipped and was reverted same day — light's L-geometry transplanted
        // near white compressed 42→30 in apparent terms. Do not resurrect without a
        // new owner direction. The T10/T11 floors below still guarantee the bars.
        placed = ls
          ? placeDarkDelta(d, sp.rootL, chromaAt!, ls)
          : placeDark(d, sp.rootL, chromaAt!, sp.produce.L === 'perceptual-lift')
      }
      // a declared dark require is a FLOOR: a hue whose placement already clears the target does not move;
      // a failing hue is raised (bisection) until it clears. This is the Stage-5 flip — blue's stop-8 rises
      // off the dark paper by rule; every other hue stays at its scaffold byte-identically. The measure is
      // metric-blind (wcag ratio or |APCA Lc|); the wcag path computes the exact old floats.
      if (sp.require && sp.require.metric !== 'min-separation') {
        const req = sp.require
        // DELTA carry: the floor moves ONLY lightness — chroma+hue stay the carried light values (the model
        // defines dark C/H as light's; recomputing them here was the last impurity, delta-purity.ts). The
        // seed-keyed path keeps the old recompute byte-identically.
        const carryReq = !!(ls && ctx.opts?.deltaCarry)
        const hAtL = (L: number) => (carryReq ? (spineH ?? ls!.H) : d.darkHueAtL(L))
        const cAtL = (L: number) => (carryReq ? ls!.C : chromaAt!(L))
        const isApca = req.metric === 'apca'
        const gMeas = isApca ? apcaGroundOf(req, sp.stop) : groundOf(req, sp.stop)
        const refMeasY = isApca ? apcaYAt(gMeas.L, gMeas.C, gMeas.H) : wcagY(gMeas.L, gMeas.C, gMeas.H)
        // wcag floors are D1 legality: both renditions of the fill must clear the target
        const measure = (L: number, C: number, H: number): number =>
          isApca ? Math.abs(apcaLc(apcaYAt(L, C, H), refMeasY)) : legalRatio(L, C, H, refMeasY)
        const reqTarget = isApca ? req.targetLc : req.target
        // wcag trigger tightened 1e-3 → 1e-5 (2026-07-09): the dark contrast requirement is enforced to the
        // bar, not within a 0.001 slack. Catches delta-carry pens that inherit light's exactly-on-bar solve and
        // land ~0.0001 under. Keeps a float-noise guard (not 0). apca path (APCA_TOL_LC) unchanged.
        const tol = isApca ? APCA_TOL_LC : 1e-5
        const got0 = measure(placed.L, clampChromaToGamut(placed.L, placed.C, placed.H), placed.H)
        if (got0 < reqTarget - tol) {
          const target = reqTarget + (isApca ? APCA_SOLVE_MARGIN_LC : 0.05)
          let lo = placed.L, hi = 1
          for (let pass = 0; pass < 24; pass++) {
            const m = (lo + hi) / 2
            const mH = hAtL(m)
            // apca measures in emit space (gamut-clamped) — see findMaxLForApcaLc; wcag keeps the raw floats
            const mC = isApca ? clampChromaToGamut(m, cAtL(m), mH) : cAtL(m)
            measure(m, mC, mH) < target ? (lo = m) : (hi = m)
          }
          placed = { L: hi, C: cAtL(hi), H: hAtL(hi) }
          clamped = true
        }
      }
      // (The C24 8-vs-7 BAND-ORDER FLOOR is DELETED — owner 2026-07-29. It floored stop 8 at
      // highlighter-20's (wash-7's) apparent plus light's own 7→8 apparent gap, written when the C24 lift was
      // ×1.75 and a lifted highlighter-20 (wash-7) could overshoot an achromatic ramp's low-riding 3:1 solve.
      // C28 then halved the lift and the guard was never re-checked. Measured at the shipped
      // lift: it fired on 366/366 ramps — not a guard but THE placement rule for dark stop 8,
      // supplying 0.056–0.157 of its L and every bit of the gap between its law (3.05 vs
      // paper-3/paper-2) and where it shipped (4.65). The inversion it was written for cannot occur:
      // without it stop 8 still sits 5.35–6.85 apparent-L above highlighter-20 (wash-7) on every ramp, 0 of 366
      // inverting. It also chained an ACCESSIBILITY BORDER to an ILLUSTRATION STOP — moving
      // highlighter-20 (wash-7) for an illustration silently repositioned the stop carrying WCAG 1.4.11. Stop 8
      // is now placed by its own require, anchored at paper-5 (paper-3) in both modes; see spec.ts S8.)
    }

    // verify any declared require against the emitted (gamut-clamped) values — total, fail loud
    if (sp.require?.metric === 'wcag') {
      // THE SHIPPED-PAIR FLOOR (owner defect 2026-08-03 — #43B02A pencil-47 (ink-9) read
      // 4.44:1 on paper-5 (paper-3)): the analytic solve lands exactly on the bar, and the
      // sRGB encode plus 8-bit hex quantization of BOTH sides then eats up to ~0.08 of ratio.
      // legalRatio covers the fill's renditions, but its reference side is the ANALYTIC
      // anchor Y — whose "near-neutral, sub-tolerance" assumption broke when the pen anchor
      // moved to the chromatic paper-5 (paper-3), on a solve that carries no margin. The law is the pair
      // that ships: if the 8-bit sRGB rendition of stop-vs-anchor reads under target,
      // walk L away from the anchor (chroma re-clamps inside shippedY; C/H otherwise
      // held — the dark floor's delta-purity idiom, and the moves are ≤ ~0.01 L) until
      // it clears. A stop whose shipped pair already clears does not move — byte-
      // identical outside the failing set (19/72 of the agnostic sweep, green–cyan).
      const anchor = groundOf(sp.require, sp.stop)
      const anchorShipY = shippedY(anchor.L, anchor.C, anchor.H)
      // stops 8+ also clear the worst neutral paper (the cross-family bound above) —
      // the min-ratio anchor, since the binding paper is whichever sits nearest in Y.
      // EXCEPT on the inverse pen ground: that text sits on a pen-70 fill, never on a
      // paper, so the paper bound is not its law — its own frozen worst IS the bound.
      const paperBound = sp.stop >= 8 && !(textGround && sp.stop >= 9)
      // the cross-family bound follows the anchor's band: a highlighter-anchored stop (T10's
      // highlighter-20 law) reads against the worst neutral HIGHLIGHTER-20, which dominates the paper
      // bound on both ramps (ladder monotonicity, see the constant above)
      const crossBoundY = wcagAnchorStop(sp.require, sp.stop) === 7
        ? NEUTRAL_W80_WORST_SHIP_Y[mode] : NEUTRAL_P3_WORST_SHIP_Y[mode]
      const shipRatio = (L: number) => {
        const y = shippedY(L, placed.C, placed.H)
        const own = contrastRatio(y, anchorShipY)
        return paperBound ? Math.min(own, contrastRatio(y, crossBoundY)) : own
      }
      // T13: the NEUTRAL's pens (stops 10–11, never pencil-47) also clear the worst CHROMATIC
      // highlighter-20 (CHROMATIC_W80_WORST_SHIP_Y, set only by generateNeutralScale), judged
      // at the PEN BAND'S bar — the 4.5 the guarantee states — not at the stop's own target:
      // pen-70 declares a stricter target against its paper, and judging the highlighter
      // term there walked a stop that already cleared the claim by 6.6. The inverse pen
      // ground excludes it the way it excludes the paper bound.
      const highlighterBoundY = ctx.opts?.crossHighlighterBoundY && sp.stop >= 10 && !textGround
        ? ctx.opts.crossHighlighterBoundY[mode] : undefined
      const highlighterRatio = (L: number) => highlighterBoundY === undefined
        ? Infinity : contrastRatio(shippedY(L, placed.C, placed.H), highlighterBoundY)
      // and the NEUTRAL's stops 8–11 clear the worst CHROMATIC paper-5 (CHROMATIC_P3_WORST_SHIP_Y,
      // also set only by generateNeutralScale), each at its own band's claim bar
      const paperBoundY = ctx.opts?.crossPaperBoundY && sp.stop >= 8 && !textGround
        ? ctx.opts.crossPaperBoundY[mode] : undefined
      const paperBar = sp.stop === 8 ? STOP_8_NONTEXT_CONTRAST : sp.stop === 9 ? PENCIL_9_CONTRAST : PEN_10_CONTRAST
      const paperRatio = (L: number) => paperBoundY === undefined
        ? Infinity : contrastRatio(shippedY(L, placed.C, placed.H), paperBoundY)
      const target = sp.require.target
      const clears = (L: number) => shipRatio(L) >= target && highlighterRatio(L) >= PEN_10_CONTRAST && paperRatio(L) >= paperBar
      if (!clears(placed.L)) {
        const away = shippedY(placed.L, placed.C, placed.H) < anchorShipY ? -1 : +1
        let L2 = placed.L
        for (let i = 0; i < 100 && !clears(L2); i++) L2 += away * 0.001
        if (clears(L2)) { placed = { ...placed, L: L2 }; clamped = true }
      }
      const refY = wcagY(anchor.L, anchor.C, anchor.H)
      const got = Math.min(
        legalRatio(placed.L, clampChromaToGamut(placed.L, placed.C, placed.H), placed.H, refY),
        shipRatio(placed.L),
      )
      if (got < sp.require.target - 1e-3) unresolvable = `stop ${sp.stop}: contrast ${got.toFixed(2)} < required ${sp.require.target}`
      else if (highlighterRatio(placed.L) < PEN_10_CONTRAST - 1e-3) unresolvable = `stop ${sp.stop}: contrast ${highlighterRatio(placed.L).toFixed(2)} < required ${PEN_10_CONTRAST} on the worst chromatic highlighter-20`
      else if (paperRatio(placed.L) < paperBar - 1e-3) unresolvable = `stop ${sp.stop}: contrast ${paperRatio(placed.L).toFixed(2)} < required ${paperBar} on the worst chromatic paper-5`
    } else if (sp.require?.metric === 'apca') {
      const ga = apcaGroundOf(sp.require, sp.stop)
      const refA = apcaYAt(ga.L, ga.C, ga.H)
      const got = Math.abs(apcaLc(apcaYAt(placed.L, clampChromaToGamut(placed.L, placed.C, placed.H), placed.H), refA))
      if (got < sp.require.targetLc - APCA_TOL_LC) unresolvable = `stop ${sp.stop}: |Lc| ${got.toFixed(1)} < required ${sp.require.targetLc}`
    } else if (sp.require?.metric === 'min-separation') {
      const ref = stops.find(s => s.stop === (sp.require!.against === 'paper-1' ? 1 : sp.stop - 1))!
      const rad = (h: number) => (h * Math.PI) / 180
      const gC = clampChromaToGamut(placed.L, placed.C, placed.H)
      const got = Math.sqrt((placed.L - ref.L) ** 2
        + (gC * Math.cos(rad(placed.H)) - ref.C * Math.cos(rad(ref.H))) ** 2
        + (gC * Math.sin(rad(placed.H)) - ref.C * Math.sin(rad(ref.H))) ** 2)
      if (got < sp.require.target - 1e-4) unresolvable = `stop ${sp.stop}: separation ${got.toFixed(4)} < required ${sp.require.target}`
    }
    stops.push(emit(sp.stop, sp.group, placed.L, placed.C, placed.H, clamped, unresolvable))
  }

  // ---- ROLES + ON-FILL, in the engine's exact evaluation order ----
  const emitRole = (role: RoleReq['role'], L: number, C: number, H: number): ResolvedRole => {
    const gC = clampChromaToGamut(L, C, H)
    return { role, L, C: gC, H, hex: toHex(oklchToSrgb(L, gC, H)), Y: wcagY(L, gC, H), appL: apparentL(L, gC, H) }
  }
  // the apca profile's on-text threshold (set by withProfile): pole judged pure apca-pole (the wcag flip
  // is metric-mixing and a no-op under Lc anyway); the cta enforce re-solve runs on Lc instead of 4.5.
  const enforceLc = spec.ons.onFill.enforceLc
  // APCA legibility clearance (opt-in, default off → byte-identical): wcag lane only (enforceLc undefined),
  // under opts.apcaClearance — the second Lc bar the cta fill must also clear, alongside the 4.5 floor.
  const coLc = ctx.opts?.apcaClearance && enforceLc === undefined
    ? (ctx.opts.apcaClearanceLc ?? spec.ons.onFill.coEnforceLc)
    : undefined
  // the declared pole floor — wcag lane only (withProfile strips it for apca, whose law is the
  // Lc bar). One source for every on-fill pole judgement in this function, replacing the lone
  // hardcoded 4.5 at the light post-move re-judge.
  const onFloor = enforceLc !== undefined ? undefined : spec.ons.onFill.ratioFloor
  let cta: ResolvedRole, ctaHover: ResolvedRole, ctaPressed: ResolvedRole, onFillIsWhite: boolean
  if (mode === 'light') {
    // on-fill judged PRE-enforcement at fill9 (:271–273); the enforce re-solve feeds FROM it (:354–358)
    onFillIsWhite = onFillIsWhiteLight(ctx, enforceLc !== undefined ? false : onFillEnforce)
    let light9L = enforceLc !== undefined
      ? ctaLightLApca(ctx, onFillIsWhite, onFillEnforce, enforceLc)
      : ctaLightL(ctx, onFillIsWhite, onFillEnforce)
    // C12 v8: the wcag white-darken may not move a RED-NEIGHBORHOOD brand's cta toward red
    // (it was dragging unfired near-red vivids back into the space the solve exists to keep
    // clean — the |Lc|≥45 guard's third symptom). Scope is the NEIGHBORHOOD (within two rings
    // of the region) — the solve metric's L terms are hue-blind, so "darkening = toward red"
    // would otherwise fire wheel-wide (fleet-verified leak: teals and olives flipped). When
    // black already passes 4.5 at the undarkened fill, the pole flips and the fill stays.
    // Signals and everything hue-distant keep the shipped darken. NOTE (C23): the guard's
    // geometry reference (ctaSolve.red) is the APCA lane's canonical red in both lanes —
    // "toward red" means toward the shared perceptual reference, not this lane's shipped red.
    if (enforceLc === undefined && ctx.opts?.ctaSolve && light9L < ctx.scaleL - 1e-6) {
      const at = (L: number) => ({ L, C: clampChromaToGamut(L, ctx.cAt('light', L, ctx.brandC), ctx.brandH), H: ctx.brandH })
      const orig = at(ctx.scaleL)
      const nearRed = redSolveDist(orig, ctx.opts.ctaSolve.red) <= RED_GATE.G + 2 * RED_SOLVE.ring
      const towardRed = redSolveDist(at(light9L), ctx.opts.ctaSolve.red) < redSolveDist(orig, ctx.opts.ctaSolve.red)
      if (nearRed && towardRed && legalRatio(orig.L, orig.C, orig.H, 0) >= 4.5) {
        light9L = ctx.scaleL
        onFillIsWhite = false
      }
    }
    // APCA legibility clearance (bolt-on): AFTER the near-red guard has chosen the shipped on-text pole
    // (BLACK for a near-red), move the fill from scaleL to clear coLc in THAT pole's direction, capped — a
    // red LIGHTENS (black → away from the deep-red error); greens/whites keep their pole (a passing white
    // stays put). The brand red-exit (solveBrandExit, below) is OFF under the flag: the red-complement
    // variant de-collides the SIGNAL against this final cta — the brand belongs to the clearance, not the
    // brand-side collider. Default off → byte-identical.
    if (coLc !== undefined) {
      const [capLoL, capHiL] = CTA_CLEARANCE_CAPS
      // ship above the razor (C15): fire/solve at bar + margin, not at 60.0
      light9L = ctaDualGateL(ctx, onFillIsWhite, onFillEnforce, coLc + APCA_ENFORCE_MARGIN_LC, capLoL, capHiL)
    }
    // C12 v8 — THE JOINT SOLVE, brand side (owner-settled 2026-07-10): a cta whose seed
    // sits inside the true-red region (opts.ctaSolve — nominal seed + the lane's red cta,
    // injected by resolveBrand) exits via solveBrandExit: nearest release edge with her
    // direction rules; a brick-band dark landing takes the diagonal (landing carries its
    // own hue + chroma multiplier). No P2 condition here — the red complement (engine/
    // resolve) owns the vibration problem. No-op (null) when not a member.
    const ctaCFor = (L: number) => ctx.cAt('light', L, (ctaReq.chromaMult ?? 1) * ctx.brandC)
    let repelled = false
    let ctaH = ctx.brandH
    let ctaCMul = 1
    // C18 regression fix (owner 2026-07-13, "both of these reds should be going dark"): the
    // exit runs UNDER the clearance too. The flag-era design assumed the clearance would move
    // near-red brands, but a pure red's white pole passes both bars — nothing moved it, the
    // brand squatted in red's register and forced the complement to the coral edge (lane
    // mismatch vs apca, which kept its exit). Members exit as before; the landing's poleOk
    // now also honors the clearance bar so the re-judged pole passes both metrics.
    if (ctx.opts?.ctaSolve) {
      const landing = solveBrandExit(ctx.opts.ctaSolve.seed, ctaCFor, ctx.brandH, ctx.opts.ctaSolve.red, enforceLc, coLc)
      if (landing !== null) {
        light9L = landing.L
        ctaH = landing.H
        ctaCMul = landing.cMul
        repelled = true
      }
    }
    cta = emitRole(STAMP_FILL,light9L, ctaCFor(light9L) * ctaCMul, ctaH)
    const hCFor = (L: number) => ctx.cAt('light', L, (hoverReq?.chromaMult ?? 1) * ctx.brandC) * ctaCMul
    const pCFor = (L: number) => ctx.cAt('light', L, (pressedReq?.chromaMult ?? 1) * ctx.brandC) * ctaCMul
    const hL = stateFillL(light9L, 'light', 1)
    const pL = stateFillL(light9L, 'light', 2)
    ctaHover = emitRole(STAMP_FILL_HOVER,hL, hCFor(hL), ctaH)
    ctaPressed = emitRole(STAMP_FILL_PRESSED,pL, pCFor(pL), ctaH)
    if (light9L !== ctx.scaleL) { cta.enforced = true; ctaHover.enforced = true; ctaPressed.enforced = true }
    if (repelled) {
      cta.repelled = true; ctaHover.repelled = true; ctaPressed.repelled = true
      // the shipped pole re-judged AT the exited fill (the pre-enforce judge ran at scaleL).
      // Under wcag the conformance floor rides the re-judge (owner 2026-07-10, "not darkening
      // the text at a wide enough range"): the moved fill sits where the enforce-darken can
      // no longer guarantee white, so the chosen pole MUST pass 4.5 — the flip cannot be
      // vetoed by the enforce branch's |Lc|≥45 taste guard. apca needs no floor here: the
      // move itself delivers a passing pole (solveBrandExit's poleOk), preference picks it.
      onFillIsWhite = onFillIsWhiteDarkAt(cta.L, cta.C, cta.H,
        enforceLc !== undefined ? false : onFillEnforce,
        onFloor)
    }
  } else {
    // dark: base cta from the pre-resolved anchor; judge on-fill at the emitted base; then the enforce re-solve
    const d = dctx!
    // The cta is PROMINENCE-FLOORED, never carried (owner 2026-07-09): parity reproduces a bright brand's
    // whisper (neon yellow's light cta sits near white → contrast ≈ nothing → a near-black dark cta, legible
    // but brand-dead). Loudness is the cta's own requirement — the declared floor (dark9L) + trimmed brand
    // chroma anchor it; the enforce re-solve below stays the legibility floor.
    // EXCEPTION — the FLAT register (opts.darkCtaFlatApp, the derived-secondary model, owner
    // 2026-07-12): a derived pastel has no brand identity forcing it light — the pin would keep
    // the light pastel on the dark page. The cta lands at the declared apparent distance above
    // the dark ground instead; the enforce re-solve + p2 exit below still run over it.
    const cta9L = ctx.opts?.darkCtaFlatApp !== undefined
      ? flatDarkCtaL(d, (L: number) => ctx.cAt('dark', L, d.darkC9), ctx.darkCtaH, ctx.opts.darkCtaFlatApp)
      : d.dark9L
    // C12 v8: the dark cta rides IDENTITY hue (darkCtaH) — coolRedDark's shift is retired
    // from the cta (owner ruling; research: identity-hue dark ctas never fire the gate).
    const dCFor = (L: number) => ctx.cAt('dark', L, d.darkC9)
    const dTrio = (baseL: number): [number, number] =>
      [stateFillL(baseL, 'dark', 1), stateFillL(baseL, 'dark', 2)]
    cta = emitRole(STAMP_FILL,cta9L, dCFor(cta9L), ctx.darkCtaH)
    {
      const [hL, pL] = dTrio(cta9L)
      ctaHover = emitRole(STAMP_FILL_HOVER,hL, dCFor(hL), ctx.darkCtaH)
      ctaPressed = emitRole(STAMP_FILL_PRESSED,pL, dCFor(pL), ctx.darkCtaH)
    }
    onFillIsWhite = onFillIsWhiteDarkAt(cta.L, cta.C, cta.H, enforceLc !== undefined ? false : onFillEnforce)
    const enforcedL = enforceLc !== undefined
      ? ctaDarkEnforcedLApca(ctx, cta, onFillIsWhite, onFillEnforce, enforceLc)
      : ctaDarkEnforcedL(ctx, cta, onFillIsWhite, onFillEnforce)
    if (enforcedL !== null) {
      cta = emitRole(STAMP_FILL,enforcedL, dCFor(enforcedL), ctx.darkCtaH)
      const [hL, pL] = dTrio(enforcedL)
      ctaHover = emitRole(STAMP_FILL_HOVER,hL, dCFor(hL), ctx.darkCtaH)
      ctaPressed = emitRole(STAMP_FILL_PRESSED,pL, dCFor(pL), ctx.darkCtaH)
      cta.enforced = true; ctaHover.enforced = true; ctaPressed.enforced = true
    }
    // C42 — the DARK clearance (owner 2026-08-02): dark ctas carry the same Lc law as light
    // (dark's flat register had never been held to any Lc bar). Runs BEFORE the exit, the
    // light-branch order — the exit's lawOk then keeps the bar along its travel. The move is
    // pole-preserving (the dual-gate shape), so 4.5 and the pole survive by construction.
    if (coLc !== undefined) {
      const [capLoL, capHiL] = CTA_CLEARANCE_CAPS
      const clearedL = ctaDarkDualGateL(cta, ctx.darkCtaH, onFillIsWhite, onFillEnforce, coLc + APCA_ENFORCE_MARGIN_LC, capLoL, capHiL)
      if (Math.abs(clearedL - cta.L) > 1e-9) {
        cta = emitRole(STAMP_FILL,clearedL, dCFor(clearedL), ctx.darkCtaH)
        const [hL, pL] = dTrio(clearedL)
        ctaHover = emitRole(STAMP_FILL_HOVER,hL, dCFor(hL), ctx.darkCtaH)
        ctaPressed = emitRole(STAMP_FILL_PRESSED,pL, dCFor(pL), ctx.darkCtaH)
        cta.enforced = true; ctaHover.enforced = true; ctaPressed.enforced = true
      }
    }
    // C12 dark (owner 2026-07-11, "dark falls out like every cta"; supersedes the v6 "no dark
    // exit" note): the FINAL enforced dark cta runs the same solve on dark geometry, keyed on
    // P2 — the P1 gate passes vibrating dark pairs (the known blindness). Member = p2 < the
    // ONE clean bar (C22) beside the APCA lane's red dark cta in BOTH lanes (C23:
    // opts.ctaSolve.redDark = the apca canonical); decisions ride the apca Lc pole, the wcag
    // 4.5 rides as a law extension. Both lanes fire now (post-C22/C23 measurement lives at
    // solveDarkCtaExit's banner). Null = byte-identical.
    if (ctx.opts?.ctaSolve) {
      const exitL = solveDarkCtaExit(cta, dCFor, ctx.darkCtaH, ctx.opts.ctaSolve.redDark, enforceLc, coLc)
      if (exitL !== null) {
        cta = emitRole(STAMP_FILL,exitL, dCFor(exitL), ctx.darkCtaH)
        const [hL, pL] = dTrio(exitL)
        ctaHover = emitRole(STAMP_FILL_HOVER,hL, dCFor(hL), ctx.darkCtaH)
        ctaPressed = emitRole(STAMP_FILL_PRESSED,pL, dCFor(pL), ctx.darkCtaH)
        cta.enforced = true; ctaHover.enforced = true; ctaPressed.enforced = true
        cta.repelled = true; ctaHover.repelled = true; ctaPressed.repelled = true
        // the pole re-judged AT the exited fill (mirrors the light repelled re-judge: wcag
        // rides the 4.5 conformance floor; apca's move delivered a passing pole in-travel)
        onFillIsWhite = onFillIsWhiteDarkAt(cta.L, cta.C, cta.H,
          enforceLc !== undefined ? false : onFillEnforce,
          enforceLc !== undefined ? undefined : 4.5)
      }
    }
  }

  // ---- THE FINAL POLE FLOOR (owner 2026-07-29: "exact isn't supposed to be turning off on
  // fill enforcement, it is just supposed to not do any collision avoidance" + "you should be
  // making the cta literally the hex color"). Judged at THE FILL THAT SHIPS, after every move
  // above has settled, and it is a REPAIR not a preference: it flips only when the chosen pole
  // misses the floor AND the other pole clears it. So it is inert for every fill whose label
  // already passes — the whole shipped fleet — and it is the only thing standing between a
  // hands-off `exact` cta and an illegible label, because exact takes no move at all.
  //
  // It must live HERE, not on the pre-enforcement judgement: that boolean is an INPUT to the
  // fill solve (ctaLightL darkens for white; apcaClearance lightens for black), so flooring it
  // early re-routed the whole chain and rewrote passing brands — matcha's cta went #00873f
  // (white, 4.60:1) → #53c877 (black), dragonfruit #d52f83 → #ff91bd. Both were already legal.
  //
  // Deliberately narrower than onTextIsWhite's own ratioFloor branch, which flips whenever the
  // chosen pole misses — including into a pole that also misses. This one checks the landing.
  if (onFloor !== undefined) {
    const chosen = legalRatio(cta.L, cta.C, cta.H, onFillIsWhite ? 1.0 : 0)
    const other = legalRatio(cta.L, cta.C, cta.H, onFillIsWhite ? 0 : 1.0)
    if (chosen < onFloor && other >= onFloor) onFillIsWhite = !onFillIsWhite
  }

  // (the cta-ink trio DELETED, owner 2026-08-12. C49 had already reduced it to pure
  // references onto stops 9/10/11 — every legibility guarantee rides the stops' own
  // requires (T9/T10/T11); the text-register cta is the pen stops read directly.)

  // (on-highlight DELETED, owner 2026-07-29. It was solved here, judged at the emitted
  // highlight-9 and never fed back into the fill. C31 had already reduced it to a
  // per-mode constant; the collapse removes the fill it named. The successor is a
  // declaration in the semantic layer, `-fg-on-emphasis` → --paper-0 (--paper-0 pre-Stage-B).)

  return { mode, seed, stops, roles: { cta, ctaHover, ctaPressed }, ons: { onFillIsWhite } }
}
