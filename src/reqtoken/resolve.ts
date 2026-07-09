// resolve.ts — the requirement-token RESOLVER. Executes the pure declaration (spec.ts) by dispatching each
// stop/role to a NAMED producer implementation (producers.ts — verbatim engine math). Per scale stop:
// PRODUCER (hue → chroma → L) → REQUIRE (contrast clamp, iterated) → REFINE (chroma yields to gamut at emit).
// Off-scale ROLES (cta / cta-hover) and the on-color booleans follow the engine's exact evaluation order:
// dark cta anchor BEFORE the dark stops (the torsion anchors at it), on-fill judged PRE-enforcement, the
// enforce re-solve last. Total: an unmet require yields an explicit `unresolvable`, never a silent fudge.
//
// The producers are verbatim ports of the pre-resolver engine, proven byte-identical at cutover (c7542b7);
// the blessed snapshot audits are the standing regression gate.
import { apparentL, perceptualRungL, perceptualDarkC } from '../engine/perceptualL'
import { clampChromaToGamut, wcagY, contrastRatio, legalRatio, findMaxLForContrast, apcaLc } from '../engine/constraints'
import { hexToOklch, srgbEmitChannels } from '../engine/colorMath'
import { hoverL } from '../engine/archetypes'
import { MODE_SPECS, type ModeSpec, type StopReq, type RoleReq, type Require } from './spec'
import {
  buildContext, buildDarkContext, type Ctx, type DarkCtx, type ResolveOpts,
  lightScaleChromaAt, lightHighlightChromaAt, placeLightScale, placeLightText, placeLightHighlight,
  separationClampLight,
  darkScaleChromaAt, darkInkChromaAt, darkHighlightChromaAt, placeDark, placeDarkDelta, deltaDarkTargetL,
  onFillIsWhiteLight, onFillIsWhiteDarkAt, onHighlightIsWhiteAt, ctaLightL, ctaDarkEnforcedL,
  ctaLightLApca, ctaDarkEnforcedLApca,
  apcaYAt, findMaxLForApcaLc, APCA_SOLVE_MARGIN_LC, APCA_TOL_LC,
} from './producers'

// hex = the sRGB clamp-down of the resolved stop (gamut-map by chroma-reduction, §4B)
const oklchToSrgb = (L: number, C: number, H: number) => (Object.values(srgbEmitChannels({ L, C, H })) as number[]).map(c => Math.max(0, Math.min(1, c))) as [number, number, number]
const toHex = (rgb: [number, number, number]) => '#' + rgb.map(c => Math.round(c * 255).toString(16).padStart(2, '0')).join('')

export type ResolvedStop = {
  stop: number; group: string; L: number; C: number; H: number; hex: string; Y: number; appL: number
  clamped: boolean; unresolvable?: string
}
export type ResolvedRole = { role: RoleReq['role']; L: number; C: number; H: number; hex: string; Y: number; appL: number; enforced?: boolean }
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
      const chromaAt =
        sp.group === 'ink' ? darkInkChromaAt(ctx, d, sp.stop - 1, sp.chromaMult ?? 1, sp.inkMaxC)
        : sp.stop === 9 ? undefined
        // chroma-floor index clamps at 0: stop 0 shares paper-1's tint treatment
        : darkScaleChromaAt(ctx, d, Math.max(0, sp.stop - 1), sp.satFraction ?? 1)
      // DELTA-KEYED (gated): derive dark from the resolved light twin for EVERY scale stop 1–12 — surfaces
      // (1–7), fill (8), highlight (9/10), AND ink (11/12: carry light's ink chroma+hue, only lightness
      // re-referenced; the T11/T12 contrast requires still floor L below). Default (no light stops) = today.
      const dl = ctx.opts?.deltaLightStops
      const ls = dl && sp.stop >= 1 && sp.stop <= 12 ? dl.find(s => s.stop === sp.stop) : undefined
      if (ls && ctx.opts?.deltaCarry) {
        // FULL CARRY (pure fall-out): the dark stop IS the light color — chroma + hue carried, ONLY lightness
        // re-referenced to the dark ground. emit gamut-clamps C; the declared dark requires below still floor it.
        let L = deltaDarkTargetL(ls, ls.C, ls.H)
        let C = ls.C
        // PER-BOLT-ON INSTRUMENTS (gated, default off → byte-identical): layer exactly ONE old dark mechanism
        // onto the pure carry, real engine fns only. Only one is set per resolve (one column of the exhibit).
        if (ctx.opts.deltaHKPlace) L = perceptualRungL(sp.rootL, ls.C, ls.H)                                       // old apparent-L placement
        if (ctx.opts.deltaLiftFloor) L = Math.max(L, sp.rootL)                                                     // old lift/recede floor
        if (ctx.opts.deltaChromaEq && sp.group !== 'ink') C = ctx.cAt('dark', L, perceptualDarkC(L, ls.H, ctx.brandC))  // old H-K chroma equalizer
        if (ctx.opts.deltaInkRegister && sp.group === 'ink') C = chromaAt!(L)                                      // old dark ink register (darkInkChromaAt)
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
        const cAtL = (L: number) => sp.stop === 9
          ? darkHighlightChromaAt(ctx, d, sp.baseC ?? 0, sp.satFraction ?? 1)(L, d.darkHueAtL(L))
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
            const mH = d.darkHueAtL(m)
            // apca measures in emit space (gamut-clamped) — see findMaxLForApcaLc; wcag keeps the raw floats
            const mC = isApca ? clampChromaToGamut(m, cAtL(m), mH) : cAtL(m)
            measure(m, mC, mH) < target ? (lo = m) : (hi = m)
          }
          placed = { L: hi, C: cAtL(hi), H: d.darkHueAtL(hi) }
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
    const light9L = enforceLc !== undefined
      ? ctaLightLApca(ctx, onFillIsWhite, onFillEnforce, enforceLc)
      : ctaLightL(ctx, onFillIsWhite, onFillEnforce)
    cta = emitRole('cta', light9L, ctx.cAt('light', light9L, (ctaReq.chromaMult ?? 1) * ctx.brandC), ctx.brandH)
    ctaHover = emitRole('cta-hover', hoverL(light9L), ctx.cAt('light', hoverL(light9L), (hoverReq?.chromaMult ?? 1) * ctx.brandC), ctx.brandH)
    if (light9L !== ctx.scaleL) { cta.enforced = true; ctaHover.enforced = true }
  } else {
    // dark: base cta from the pre-resolved anchor; judge on-fill at the emitted base; then the enforce re-solve
    const d = dctx!
    // DELTA-KEYED cta (gated): the dark cta derives from the LIGHT cta's contrast — a distinct dark cta
    // instead of the seed-blind value. Full-carry: the dark cta IS the light cta color, lightness re-referenced.
    // The enforce re-solve below stays the legibility floor. Default (no light cta) = the seed-keyed value.
    const dlCta = ctx.opts?.deltaLightCta, dlStops = ctx.opts?.deltaLightStops
    const carry = !!ctx.opts?.deltaCarry && !!dlCta
    const ctaC = carry ? dlCta!.C : d.darkC9
    const ctaH = carry ? dlCta!.H : ctx.darkH
    const cta9L = dlCta && dlStops ? deltaDarkTargetL(dlCta, ctaC, ctaH) : d.dark9L
    cta = emitRole('cta', cta9L, ctx.cAt('dark', cta9L, ctaC), ctaH)
    ctaHover = emitRole('cta-hover', hoverL(cta9L), ctx.cAt('dark', hoverL(cta9L), ctaC), ctaH)
    onFillIsWhite = onFillIsWhiteDarkAt(cta.L, cta.C, cta.H, enforceLc !== undefined ? false : onFillEnforce)
    const enforcedL = enforceLc !== undefined
      ? ctaDarkEnforcedLApca(ctx, cta, onFillIsWhite, onFillEnforce, enforceLc)
      : ctaDarkEnforcedL(ctx, cta, onFillIsWhite, onFillEnforce)
    if (enforcedL !== null) {
      cta = emitRole('cta', enforcedL, ctx.cAt('dark', enforcedL, d.darkC9), ctx.darkH)
      ctaHover = emitRole('cta-hover', hoverL(enforcedL), ctx.cAt('dark', hoverL(enforcedL), d.darkC9), ctx.darkH)
      cta.enforced = true; ctaHover.enforced = true
    }
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
