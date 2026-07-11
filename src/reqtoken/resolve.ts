// resolve.ts — the requirement-token RESOLVER. Executes the pure declaration (spec.ts) by dispatching each
// stop/role to a NAMED producer implementation (producers.ts — verbatim engine math). Per scale stop:
// PRODUCER (hue → chroma → L) → REQUIRE (contrast clamp, iterated) → REFINE (chroma yields to gamut at emit).
// Off-scale ROLES (cta / cta-hover) and the on-color booleans follow the engine's exact evaluation order:
// dark cta anchor BEFORE the dark stops (the torsion anchors at it), on-fill judged PRE-enforcement, the
// enforce re-solve last. Total: an unmet require yields an explicit `unresolvable`, never a silent fudge.
//
// The producers are verbatim ports of the pre-resolver engine, proven byte-identical at cutover (c7542b7);
// the blessed snapshot audits are the standing regression gate.
import { apparentL, perceptualRungL, perceptualDarkC, solveLForApparent } from '../engine/perceptualL'
import { clampChromaToGamut, wcagY, contrastRatio, legalRatio, findMaxLForContrast, apcaLc } from '../engine/constraints'
import { hexToOklch, srgbEmitChannels, redSolveDist, RED_GATE, RED_SOLVE } from '../engine/colorMath'
import { hoverL } from '../engine/archetypes'
import { MODE_SPECS, type ModeSpec, type StopReq, type RoleReq, type Require } from './spec'
import {
  buildContext, buildDarkContext, type Ctx, type DarkCtx, type ResolveOpts,
  lightScaleChromaAt, lightHighlightChromaAt, placeLightScale, placeLightText, placeLightHighlight,
  separationClampLight,
  darkScaleChromaAt, darkInkChromaAt, darkHighlightChromaAt, placeDark, placeDarkDelta, deltaDarkTargetL,
  onFillIsWhiteLight, onFillIsWhiteDarkAt, onHighlightIsWhiteAt, ctaLightL, ctaDarkEnforcedL,
  ctaLightLApca, ctaDarkEnforcedLApca, solveBrandExit,
  apcaYAt, findMaxLForApcaLc, APCA_SOLVE_MARGIN_LC, APCA_TOL_LC,
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
  roles: { cta: ResolvedRole; ctaHover: ResolvedRole }
  ons: { onFillIsWhite: boolean; onHighlightIsWhite: boolean }
}
export type { ResolveOpts }

// `spec` defaults to the built-in mode table; a parsed DTCG requirement bundle can be passed instead —
// the resolver executes whatever declaration it's handed (portability: the token file is the source of truth).
export function resolveRamp(hex: string, mode: 'light' | 'dark', spec?: ModeSpec, opts?: ResolveOpts): ResolvedRamp {
  const o = hexToOklch(hex); const seed: Seed = { hex, ...o }
  const ctx = buildContext(hex, opts)
  spec ??= MODE_SPECS[mode]
  const ctaReq = spec.roles.find(r => r.role === 'cta')
  const hoverReq = spec.roles.find(r => r.role === 'cta-hover')
  if (!ctaReq) throw new Error('spec has no cta role')
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
  const refYOf = (stopNum: number, forWhom: number): number => {
    const ref = refOf(stopNum, forWhom)
    return wcagY(ref.L, ref.C, ref.H)
  }
  // the apca reference Y: paper-2's emitted (gamut-clamped) color through the APCA screen-luminance model
  const refApcaYOf = (stopNum: number, forWhom: number): number => {
    const ref = refOf(stopNum, forWhom)
    return apcaYAt(ref.L, ref.C, ref.H)
  }
  // the light contrast solves are metric-blind: the resolver hands the producer a maxLFor closure built
  // from the declared require. wcag closures call findMaxLForContrast with the exact old arguments
  // (float-identical — the wcag profile stays byte-for-byte); apca closures swap in the Lc bisection.
  // `withMargin` mirrors the wcag idiom: the scale solve carries the emit margin, the ink solve doesn't.
  const maxLForOf = (req: Require, forWhom: number, withMargin: boolean): ((C: number, H: number) => number) => {
    if (req.metric === 'wcag') {
      const refY = refYOf(2, forWhom)
      const t = withMargin ? req.target + 0.05 : req.target
      return (C, H) => findMaxLForContrast(C, H, refY, t)
    }
    if (req.metric === 'apca') {
      const refA = refApcaYOf(2, forWhom)
      const t = withMargin ? req.targetLc + APCA_SOLVE_MARGIN_LC : req.targetLc
      return (C, H) => findMaxLForApcaLc(C, H, refA, t)
    }
    throw new Error(`stop ${forWhom}: ${req.metric} is not a contrast require`)
  }
  const deepenFor = (stop: number) => (stop === 11 ? ctx.opts?.stop11DeepenL ?? 0 : stop === 12 ? ctx.opts?.stop12DeepenL ?? 0 : 0)

  for (const sp of spec.stops) {
    let placed: { L: number; C: number; H: number }
    let clamped = false, unresolvable: string | undefined

    if (mode === 'light') {
      // LIGHT: verbatim engine producers, dispatched by group
      if (sp.group === 'ink') {
        if (!sp.require) throw new Error(`light ink stop ${sp.stop} must declare a contrast require`)
        placed = placeLightText(ctx, sp.rootL, sp.chromaMult ?? 1, maxLForOf(sp.require, sp.stop, false), deepenFor(sp.stop), sp.inkMaxC)
        clamped = true
      } else if (sp.stop === 9) {
        placed = placeLightHighlight(ctx, sp.rootL, lightHighlightChromaAt(ctx, sp.baseC ?? 0, sp.satFraction ?? 1))
      } else if (sp.produce.L === 'fixed') {
        // fixed light stop (paper-0): sits exactly at its declared extreme
        const chromaAt = lightScaleChromaAt(ctx, sp.baseC ?? 0, sp.satFraction ?? 1)
        placed = { L: sp.rootL, C: chromaAt(sp.rootL), H: ctx.lightHueAt(sp.rootL) }
      } else {
        const chromaAt = lightScaleChromaAt(ctx, sp.baseC ?? 0, sp.satFraction ?? 1)
        const contrastReq = sp.require && sp.require.metric !== 'min-separation' ? sp.require : undefined
        placed = placeLightScale(ctx, sp.rootL, chromaAt, contrastReq ? maxLForOf(contrastReq, sp.stop, true) : undefined)
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
      const inkTwin = sp.group === 'ink' && ctx.opts?.deltaCarry && ctx.opts?.chromaCurve
        ? ctx.opts.deltaLightStops?.find(s => s.stop === sp.stop) : undefined
      const chromaAt =
        sp.group === 'ink'
          // curve-bearing ramps (neutral, derived secondary): ink chroma = the light twin's (the curve's dark
          // branch is keyed to the OLD dark L geography — sampling it at delta ink L's made the 11-jump).
          // Low-chroma inks carry no hue-family risk; L and hue stay dark-native.
          ? (inkTwin ? ((_L: number) => inkTwin.C) : darkInkChromaAt(ctx, d, sp.stop - 1, sp.chromaMult ?? 1, sp.inkMaxC))
        : sp.stop === 9 ? undefined
        // chroma-floor index clamps at 0: stop 0 shares paper-1's tint treatment
        : darkScaleChromaAt(ctx, d, Math.max(0, sp.stop - 1), sp.satFraction ?? 1)
      // DELTA-KEYED: derive dark from the resolved light twin for the SURFACE stops 1–9 (papers, washes,
      // fill, highlight). INKS 11/12 are dark-native (owner 2026-07-09): text INVERTS across modes — there is
      // no "same color, re-referenced" for a stop that crosses the paper; carrying a dark-gold ink's hue up
      // ~0.3 L lands in a different hue family (gold→orange). The C9/C11 dark text register + the T11/T12
      // requires own the inks, on the seed-keyed path below.
      const dl = ctx.opts?.deltaLightStops
      const ls = dl && sp.stop >= 1 && sp.stop <= 9 ? dl.find(s => s.stop === sp.stop) : undefined
      if (ls && ctx.opts?.deltaCarry) {
        // THE CARRY: chroma + hue carried verbatim from the light twin — for EVERY ramp kind (OKLab C is
        // near-uniform in perceived chroma; a saturation/gamut-ratio floor was tried and REJECTED — sRGB
        // geometry made blue→red washes hyper-chromatic; evaluating a declared chromaCurve at the DARK L was
        // tried and REJECTED — the curves are keyed to the OLD dark's L geography, so the delta's paper L's
        // landed in their wash-tint region and tinted the papers 8×, owner-caught). Lightness re-referenced
        // to the dark ground in APPARENT space (deltaDarkTargetL).
        // REQUIREMENT stops (s8) carry their RECIPE, not a parity: light places s8 BY the 3:1-vs-paper-2
        // clamp, so dark re-solves that same law against the dark paper-2 exactly (the require block below
        // does the solve from the ground up). appL parity would land off-law and the floor's hue-dependent
        // correction was the residual sRGB-shaped wobble (fired 84/108; whole-band 6.90 vs 0.72 for 1–7).
        let L = sp.require && sp.require.metric !== 'min-separation' ? 0.05 : deltaDarkTargetL(ls, ls.C, ls.H)
        let C = ls.C
        // BAND ORDER (owner 2026-07-09): the highlight fill (9) sits ABOVE its 3:1 rung (8). Light gets this
        // free from near-white geometry; in dark the rung's luminance law reads hue-dependently in apparent
        // terms and lands above parity-9 (inverted 108/108 under apca). Floor 9 at the rung's apparent plus
        // light's own 8→9 apparent gap — the band's carried structure. Parity stands wherever it clears.
        if (sp.stop === 9) {
          const d8 = stops.find(s => s.stop === 8)
          const l8 = dl!.find(s => s.stop === 8)
          if (d8 && l8) {
            const appOf = (s: { L: number; C: number; H: number }) => apparentL(s.L, clampChromaToGamut(s.L, s.C, s.H), s.H)
            const floorApp = appOf(d8) + Math.max(0, appOf(l8) - appOf(ls))
            if (appOf({ L, C, H: ls.H }) < floorApp) L = solveLForApparent(floorApp, C, ls.H)
          }
          // on-highlight legibility (apca profile): hl9 must keep a pole at the declared body bar
          // (ons.onHighlight.enforceLc) — the band floor can land low-chroma fills in APCA's mid dead
          // zone (both poles < 60; caught on the neutral h320). Raise L until the BLACK pole clears
          // (lighter exits the zone upward, preserving the band order). wcag needs nothing: the 4.5
          // ratioFloor pole-flip has no dead zone.
          const hlLc = spec.ons.onHighlight.enforceLc
          if (hlLc !== undefined) {
            const blackY = apcaYAt(0, 0, 0)
            const bestPole = (LL: number) => {
              const y = apcaYAt(LL, clampChromaToGamut(LL, C, ls.H), ls.H)
              return Math.max(Math.abs(apcaLc(1.0, y)), Math.abs(apcaLc(blackY, y)))
            }
            if (bestPole(L) < hlLc - APCA_TOL_LC) {
              let lo = L, hi = 0.98
              for (let i = 0; i < 24; i++) {
                const m = (lo + hi) / 2
                Math.abs(apcaLc(blackY, apcaYAt(m, clampChromaToGamut(m, C, ls.H), ls.H))) < hlLc + APCA_SOLVE_MARGIN_LC ? (lo = m) : (hi = m)
              }
              L = hi
            }
          }
        }
        // PER-BOLT-ON INSTRUMENTS (gated, default off → byte-identical): layer exactly ONE old dark mechanism
        // onto the pure carry, real engine fns only. Only one is set per resolve (one column of the exhibit).
        if (ctx.opts.deltaHKPlace) L = perceptualRungL(sp.rootL, ls.C, ls.H)                                       // old apparent-L placement
        if (ctx.opts.deltaLiftFloor) L = Math.max(L, sp.rootL)                                                     // old lift/recede floor
        if (ctx.opts.deltaChromaEq && sp.group !== 'ink') C = ctx.cAt('dark', L, perceptualDarkC(L, ls.H, ctx.brandC))  // old H-K chroma equalizer
        placed = { L, C, H: ls.H }
      } else if (sp.stop === 9) {
        const hlC = darkHighlightChromaAt(ctx, d, sp.baseC ?? 0, sp.satFraction ?? 1)
        if (ls) {
          placed = placeDarkDelta(d, sp.rootL, (L: number) => hlC(L, d.darkHueAtL(L)), ls)
        } else {
          const H = d.darkHueAtL(sp.rootL)
          placed = { L: sp.rootL, C: hlC(sp.rootL, H), H }
        }
      } else if (sp.produce.L === 'fixed') {
        placed = ls
          ? placeDarkDelta(d, sp.rootL, chromaAt!, ls)
          : { L: sp.rootL, C: chromaAt!(sp.rootL), H: d.darkHueAtL(sp.rootL) }
      } else {
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
        const hAtL = (L: number) => (carryReq ? ls!.H : d.darkHueAtL(L))
        const cAtL = (L: number) => carryReq
          ? ls!.C
          : sp.stop === 9
            ? darkHighlightChromaAt(ctx, d, sp.baseC ?? 0, sp.satFraction ?? 1)(L, hAtL(L))
            : chromaAt!(L)
        const isApca = req.metric === 'apca'
        const refMeasY = isApca ? refApcaYOf(2, sp.stop) : refYOf(2, sp.stop)
        // wcag floors are D1 legality: both renditions of the fill must clear the target
        const measure = (L: number, C: number, H: number): number =>
          isApca ? Math.abs(apcaLc(apcaYAt(L, C, H), refMeasY)) : legalRatio(L, C, H, refMeasY)
        const reqTarget = isApca ? req.targetLc : req.target
        // wcag trigger tightened 1e-3 → 1e-5 (2026-07-09): the dark contrast requirement is enforced to the
        // bar, not within a 0.001 slack. Catches delta-carry inks that inherit light's exactly-on-bar solve and
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
    }

    // verify any declared require against the emitted (gamut-clamped) values — total, fail loud
    if (sp.require?.metric === 'wcag') {
      const refY = refYOf(2, sp.stop)
      const got = legalRatio(placed.L, clampChromaToGamut(placed.L, placed.C, placed.H), placed.H, refY)
      if (got < sp.require.target - 1e-3) unresolvable = `stop ${sp.stop}: contrast ${got.toFixed(2)} < required ${sp.require.target}`
    } else if (sp.require?.metric === 'apca') {
      const refA = refApcaYOf(2, sp.stop)
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
  let cta: ResolvedRole, ctaHover: ResolvedRole, onFillIsWhite: boolean
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
    // Signals and everything hue-distant keep the shipped darken.
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
    if (ctx.opts?.ctaSolve) {
      const landing = solveBrandExit(ctx.opts.ctaSolve.seed, ctaCFor, ctx.brandH, ctx.opts.ctaSolve.red, enforceLc)
      if (landing !== null) {
        light9L = landing.L
        ctaH = landing.H
        ctaCMul = landing.cMul
        repelled = true
      }
    }
    cta = emitRole('cta', light9L, ctaCFor(light9L) * ctaCMul, ctaH)
    ctaHover = emitRole('cta-hover', hoverL(light9L), ctx.cAt('light', hoverL(light9L), (hoverReq?.chromaMult ?? 1) * ctx.brandC) * ctaCMul, ctaH)
    if (light9L !== ctx.scaleL) { cta.enforced = true; ctaHover.enforced = true }
    if (repelled) {
      cta.repelled = true; ctaHover.repelled = true
      // the shipped pole re-judged AT the exited fill (the pre-enforce judge ran at scaleL).
      // Under wcag the conformance floor rides the re-judge (owner 2026-07-10, "not darkening
      // the text at a wide enough range"): the moved fill sits where the enforce-darken can
      // no longer guarantee white, so the chosen pole MUST pass 4.5 — the flip cannot be
      // vetoed by the enforce branch's |Lc|≥45 taste guard. apca needs no floor here: the
      // move itself delivers a passing pole (solveBrandExit's poleOk), preference picks it.
      onFillIsWhite = onFillIsWhiteDarkAt(cta.L, cta.C, cta.H,
        enforceLc !== undefined ? false : onFillEnforce,
        enforceLc !== undefined ? undefined : 4.5)
    }
  } else {
    // dark: base cta from the pre-resolved anchor; judge on-fill at the emitted base; then the enforce re-solve
    const d = dctx!
    // The cta is PROMINENCE-FLOORED, never carried (owner 2026-07-09): parity reproduces a bright brand's
    // whisper (neon yellow's light cta sits near white → contrast ≈ nothing → a near-black dark cta, legible
    // but brand-dead). Loudness is the cta's own requirement — the declared floor (dark9L) + trimmed brand
    // chroma anchor it; the enforce re-solve below stays the legibility floor.
    const cta9L = d.dark9L
    // C12 v8: the dark cta rides IDENTITY hue (darkCtaH) — coolRedDark's shift is retired
    // from the cta (owner ruling; research: identity-hue dark ctas never fire the gate).
    cta = emitRole('cta', cta9L, ctx.cAt('dark', cta9L, d.darkC9), ctx.darkCtaH)
    ctaHover = emitRole('cta-hover', hoverL(cta9L), ctx.cAt('dark', hoverL(cta9L), d.darkC9), ctx.darkCtaH)
    onFillIsWhite = onFillIsWhiteDarkAt(cta.L, cta.C, cta.H, enforceLc !== undefined ? false : onFillEnforce)
    const enforcedL = enforceLc !== undefined
      ? ctaDarkEnforcedLApca(ctx, cta, onFillIsWhite, onFillEnforce, enforceLc)
      : ctaDarkEnforcedL(ctx, cta, onFillIsWhite, onFillEnforce)
    if (enforcedL !== null) {
      cta = emitRole('cta', enforcedL, ctx.cAt('dark', enforcedL, d.darkC9), ctx.darkCtaH)
      ctaHover = emitRole('cta-hover', hoverL(enforcedL), ctx.cAt('dark', hoverL(enforcedL), d.darkC9), ctx.darkCtaH)
      cta.enforced = true; ctaHover.enforced = true
    }
    // C12 v6: NO dark exit. Under the Lc-60 on-cta bar the enforced dark ctas sit deep
    // enough that nothing lands inside red's gate in dark geometry (measured: zero fired
    // across the agnostic grid, both profiles) — collision-sweep asserts it stays zero.
  }

  // on-highlight: judged at the emitted highlight-9 — never feeds back into the fill. The
  // declared ratioFloor (wcag profile) flips the pole when the preferred one fails 4.5.
  const hl9 = stops.find(s => s.stop === 9)
  const ons = {
    onFillIsWhite,
    onHighlightIsWhite: hl9 ? onHighlightIsWhiteAt(hl9.L, hl9.C, hl9.H, spec.ons.onHighlight.ratioFloor) : true,
  }

  // (The former PAIR law — the shared on-highlight pole passing on both hl-9 and its hover hl-10 — died with
  // stop 10 (owner 2026-07-09): with one highlight fill, on-highlight is judged at hl-9 alone, above.)

  return { mode, seed, stops, roles: { cta, ctaHover }, ons }
}
