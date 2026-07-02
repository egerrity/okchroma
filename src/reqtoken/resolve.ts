// resolve.ts — the requirement-token RESOLVER. Executes the pure declaration (spec.ts) by dispatching each
// stop/role to a NAMED producer implementation (producers.ts — verbatim engine math). Per scale stop:
// PRODUCER (hue → chroma → L) → REQUIRE (contrast clamp, iterated) → REFINE (chroma yields to gamut at emit).
// Off-scale ROLES (cta / cta-hover) and the on-color booleans follow the engine's exact evaluation order:
// dark cta anchor BEFORE the dark stops (the torsion anchors at it), on-fill judged PRE-enforcement, the
// enforce re-solve last. Total: an unmet require yields an explicit `unresolvable`, never a silent fudge.
//
// The producers are verbatim ports of the pre-resolver engine, proven byte-identical at cutover (c7542b7);
// the blessed snapshot audits are the standing regression gate.
import { apparentL } from '../engine/perceptualL'
import { clampChromaToGamut, wcagY, contrastRatio } from '../engine/constraints'
import { hexToOklch, oklchToSrgbUnclamped } from '../engine/colorMath'
import { hoverL } from '../engine/archetypes'
import { MODE_SPECS, type ModeSpec, type StopReq, type RoleReq } from './spec'
import {
  buildContext, buildDarkContext, type Ctx, type DarkCtx, type ResolveOpts,
  lightScaleChromaAt, lightHighlightChromaAt, placeLightScale, placeLightText, placeLightHighlight,
  separationClampLight,
  darkScaleChromaAt, darkInkChromaAt, darkHighlightChromaAt, placeDark,
  onFillIsWhiteLight, onFillIsWhiteDarkAt, onHighlightIsWhiteAt, ctaLightL, ctaDarkEnforcedL,
} from './producers'

const oklchToSrgb = (L: number, C: number, H: number) => (Object.values(oklchToSrgbUnclamped(L, C, H)) as number[]).map(c => Math.max(0, Math.min(1, c))) as [number, number, number]
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
  const refYOf = (stopNum: number, forWhom: number): number => {
    const ref = stops.find(s => s.stop === stopNum)
    if (!ref) throw new Error(`stop ${forWhom}: require against stop ${stopNum} but it is not resolved yet`)
    return wcagY(ref.L, ref.C, ref.H)
  }
  const deepenFor = (stop: number) => (stop === 11 ? ctx.opts?.stop11DeepenL ?? 0 : stop === 12 ? ctx.opts?.stop12DeepenL ?? 0 : 0)

  for (const sp of spec.stops) {
    let placed: { L: number; C: number; H: number }
    let clamped = false, unresolvable: string | undefined

    if (mode === 'light') {
      // LIGHT: verbatim engine producers, dispatched by group
      if (sp.group === 'ink') {
        if (!sp.require) throw new Error(`light ink stop ${sp.stop} must declare a contrast require`)
        placed = placeLightText(ctx, sp.rootL, sp.chromaMult ?? 1, sp.require.target, deepenFor(sp.stop), refYOf(2, sp.stop))
        clamped = true
      } else if (sp.stop === 9 || sp.stop === 10) {
        placed = placeLightHighlight(ctx, sp.rootL, lightHighlightChromaAt(ctx, sp.baseC ?? 0, sp.satFraction ?? 1))
      } else if (sp.produce.L === 'fixed') {
        // fixed light stop (paper-0): sits exactly at its declared extreme
        const chromaAt = lightScaleChromaAt(ctx, sp.baseC ?? 0, sp.satFraction ?? 1)
        placed = { L: sp.rootL, C: chromaAt(sp.rootL), H: ctx.lightHueAt(sp.rootL) }
      } else {
        const chromaAt = lightScaleChromaAt(ctx, sp.baseC ?? 0, sp.satFraction ?? 1)
        const wcagReq = sp.require?.metric === 'wcag' ? sp.require : undefined
        placed = placeLightScale(ctx, sp.rootL, chromaAt, wcagReq?.target, wcagReq ? refYOf(2, sp.stop) : undefined)
        clamped = !!wcagReq
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
        sp.group === 'ink' ? darkInkChromaAt(ctx, d, sp.stop - 1, sp.chromaMult ?? 1)
        : (sp.stop === 9 || sp.stop === 10) ? undefined
        // chroma-floor index clamps at 0: stop 0 shares paper-1's tint treatment
        : darkScaleChromaAt(ctx, d, Math.max(0, sp.stop - 1), sp.satFraction ?? 1)
      if (sp.stop === 9 || sp.stop === 10) {
        const hlC = darkHighlightChromaAt(ctx, d, sp.baseC ?? 0, sp.satFraction ?? 1)
        const H = d.darkHueAtL(sp.rootL)
        placed = { L: sp.rootL, C: hlC(sp.rootL, H), H }
      } else if (sp.produce.L === 'fixed') {
        placed = { L: sp.rootL, C: chromaAt!(sp.rootL), H: d.darkHueAtL(sp.rootL) }
      } else {
        placed = placeDark(d, sp.rootL, chromaAt!, sp.produce.L === 'perceptual-lift')
      }
      // a declared dark require is a FLOOR: a hue whose placement already clears the target does not move;
      // a failing hue is raised (bisection) until it clears. This is the Stage-5 flip — blue's stop-8 rises
      // off the dark paper by rule; every other hue stays at its scaffold byte-identically.
      if (sp.require) {
        const refY = refYOf(2, sp.stop)
        const cAtL = (L: number) => (sp.stop === 9 || sp.stop === 10)
          ? darkHighlightChromaAt(ctx, d, sp.baseC ?? 0, sp.satFraction ?? 1)(L, d.darkHueAtL(L))
          : chromaAt!(L)
        const got0 = contrastRatio(wcagY(placed.L, clampChromaToGamut(placed.L, placed.C, placed.H), placed.H), refY)
        if (got0 < sp.require.target - 1e-3) {
          const target = sp.require.target + 0.05
          let lo = placed.L, hi = 1
          for (let pass = 0; pass < 24; pass++) {
            const m = (lo + hi) / 2
            contrastRatio(wcagY(m, cAtL(m), d.darkHueAtL(m)), refY) < target ? (lo = m) : (hi = m)
          }
          placed = { L: hi, C: cAtL(hi), H: d.darkHueAtL(hi) }
          clamped = true
        }
      }
    }

    // verify any declared require against the emitted (gamut-clamped) values — total, fail loud
    if (sp.require?.metric === 'wcag') {
      const refY = refYOf(2, sp.stop)
      const got = contrastRatio(wcagY(placed.L, clampChromaToGamut(placed.L, placed.C, placed.H), placed.H), refY)
      if (got < sp.require.target - 1e-3) unresolvable = `stop ${sp.stop}: contrast ${got.toFixed(2)} < required ${sp.require.target}`
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
  let cta: ResolvedRole, ctaHover: ResolvedRole, onFillIsWhite: boolean
  if (mode === 'light') {
    // on-fill judged PRE-enforcement at fill9 (:271–273); the enforce re-solve feeds FROM it (:354–358)
    onFillIsWhite = onFillIsWhiteLight(ctx, onFillEnforce)
    const light9L = ctaLightL(ctx, onFillIsWhite, onFillEnforce)
    cta = emitRole('cta', light9L, ctx.cAt('light', light9L, (ctaReq.chromaMult ?? 1) * ctx.brandC), ctx.brandH)
    ctaHover = emitRole('cta-hover', hoverL(light9L), ctx.cAt('light', hoverL(light9L), (hoverReq?.chromaMult ?? 1) * ctx.brandC), ctx.brandH)
    if (light9L !== ctx.scaleL) { cta.enforced = true; ctaHover.enforced = true }
  } else {
    // dark: base cta from the pre-resolved anchor; judge on-fill at the emitted base; then the enforce re-solve
    const d = dctx!
    cta = emitRole('cta', d.dark9L, ctx.cAt('dark', d.dark9L, d.darkC9), ctx.darkH)
    ctaHover = emitRole('cta-hover', hoverL(d.dark9L), ctx.cAt('dark', hoverL(d.dark9L), d.darkC9), ctx.darkH)
    onFillIsWhite = onFillIsWhiteDarkAt(cta.L, cta.C, cta.H, onFillEnforce)
    const enforcedL = ctaDarkEnforcedL(ctx, cta, onFillIsWhite, onFillEnforce)
    if (enforcedL !== null) {
      cta = emitRole('cta', enforcedL, ctx.cAt('dark', enforcedL, d.darkC9), ctx.darkH)
      ctaHover = emitRole('cta-hover', hoverL(enforcedL), ctx.cAt('dark', hoverL(enforcedL), d.darkC9), ctx.darkH)
      cta.enforced = true; ctaHover.enforced = true
    }
  }

  // on-highlight: judged at the emitted highlight-9, APCA only — never feeds back
  const hl9 = stops.find(s => s.stop === 9)
  const ons = {
    onFillIsWhite,
    onHighlightIsWhite: hl9 ? onHighlightIsWhiteAt(hl9.L, hl9.C, hl9.H) : true,
  }

  return { mode, seed, stops, roles: { cta, ctaHover }, ons }
}
