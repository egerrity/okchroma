// hover proximity check for the identity-hue counterfactual (report claim verify)
import { signalScalesFor } from '../../src/engine/resolve'
import type { ContrastProfile } from '../../src/engine/colorEngine'
import { darkChromaCurve } from '../../src/engine/darkChromaCurve'
import { DARK_BRAND_FILL_MIN_L } from '../../src/engine/stopTable'
import { redGateDist } from '../../src/engine/colorMath'
import { clampChromaToGamut } from '../../src/engine/constraints'
import { hoverL } from '../../src/engine/archetypes'
import { CTA_ONFILL_ENFORCE_LC } from '../../src/reqtoken/profiles'
import { buildContext, buildDarkContext, onFillIsWhiteDarkAt, ctaDarkEnforcedL, ctaDarkEnforcedLApca, type Ctx } from '../../src/reqtoken/producers'

const seeds = ['#ed3912', '#e94100', '#ee3533', '#ed3726', '#fb4100', '#ff3900']
for (const profile of [undefined, 'apca'] as Array<ContrastProfile | undefined>) {
  const red = signalScalesFor(profile).get('red')!.scale
  console.log(`${profile ?? 'wcag'} red ctaDark L${red.ctaDark.L.toFixed(3)} C${red.ctaDark.C.toFixed(3)} H${red.ctaDark.H.toFixed(1)} · hoverDark L${red.ctaHoverDark.L.toFixed(3)}`)
  for (const identity of [true, false]) for (const hex of seeds) {
    const ctx0 = buildContext(hex, { darkFillMinL: DARK_BRAND_FILL_MIN_L, enforceOnFillContrast: true, coolRedDark: true, darkChromaCurve, highlight: true, contrastProfile: profile })
    const ctx: Ctx = identity ? { ...ctx0, darkH: ctx0.brandH } : ctx0
    const d = buildDarkContext(ctx)
    const emit = (L: number) => ({ L, C: clampChromaToGamut(L, ctx.cAt('dark', L, d.darkC9), ctx.darkH), H: ctx.darkH })
    let cta = emit(d.dark9L)
    const enforceLc = profile === 'apca' ? CTA_ONFILL_ENFORCE_LC : undefined
    const w = onFillIsWhiteDarkAt(cta.L, cta.C, cta.H, enforceLc !== undefined ? false : true)
    const eL = enforceLc !== undefined ? ctaDarkEnforcedLApca(ctx, cta, w, true, enforceLc) : ctaDarkEnforcedL(ctx, cta, w, true)
    if (eL !== null) cta = emit(eL)
    const hov = emit(hoverL(cta.L))
    const g = (a: { L: number; C: number; H: number }, b: { L: number; C: number; H: number }) => redGateDist(a, b).toFixed(4)
    console.log(`  ${identity ? 'IDENT' : 'SHIPD'} ${hex} ctaL${cta.L.toFixed(3)} hovL${hov.L.toFixed(3)} · cta/redCta ${g(cta, red.ctaDark)} · hov/redCta ${g(hov, red.ctaDark)} · hov/redHov ${g(hov, red.ctaHoverDark)} · cta/redHov ${g(cta, red.ctaHoverDark)}`)
  }
}
