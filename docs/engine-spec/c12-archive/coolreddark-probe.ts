// coolreddark-probe.ts — fine-grid margin probe for the identity-hue dark cta (mirror only).
// Confirms the coarse sweep's "0 fired" isn't a grid artifact: H step 1.5 across the band,
// C to the vivid edge, L to .85. Also dumps red's dark cta per lane + closest cells.
import { signalScalesFor } from '../../src/engine/resolve'
import { type ContrastProfile } from '../../src/engine/colorEngine'
import { darkChromaCurve } from '../../src/engine/darkChromaCurve'
import { DARK_BRAND_FILL_MIN_L } from '../../src/engine/stopTable'
import { redGateDist, oklabDist, RED_GATE } from '../../src/engine/colorMath'
import { clampChromaToGamut, oklchToLinearRgb } from '../../src/engine/constraints'
import { CTA_ONFILL_ENFORCE_LC } from '../../src/reqtoken/profiles'
import {
  buildContext, buildDarkContext, onFillIsWhiteDarkAt, ctaDarkEnforcedL, ctaDarkEnforcedLApca, type Ctx,
} from '../../src/reqtoken/producers'

const hexOfSeed = (L: number, C: number, H: number): string => {
  const c = clampChromaToGamut(L, C, H, 'srgb')
  const [rl, gl, bl] = oklchToLinearRgb(L, c, H)
  const gm = (v: number) => { const x = Math.min(1, Math.max(0, v)); return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055 }
  const ch = (v: number) => Math.round(gm(v) * 255).toString(16).padStart(2, '0')
  return `#${ch(rl)}${ch(gl)}${ch(bl)}`
}
function identityDarkCta(hex: string, profile: ContrastProfile | undefined) {
  const ctx0 = buildContext(hex, { darkFillMinL: DARK_BRAND_FILL_MIN_L, enforceOnFillContrast: true, coolRedDark: true, darkChromaCurve, highlight: true, contrastProfile: profile })
  const ctx: Ctx = { ...ctx0, darkH: ctx0.brandH }
  const d = buildDarkContext(ctx)
  const emit = (L: number) => ({ L, C: clampChromaToGamut(L, ctx.cAt('dark', L, d.darkC9), ctx.darkH), H: ctx.darkH })
  let cta = emit(d.dark9L)
  const enforceLc = profile === 'apca' ? CTA_ONFILL_ENFORCE_LC : undefined
  const w = onFillIsWhiteDarkAt(cta.L, cta.C, cta.H, enforceLc !== undefined ? false : true)
  const eL = enforceLc !== undefined ? ctaDarkEnforcedLApca(ctx, cta, w, true, enforceLc) : ctaDarkEnforcedL(ctx, cta, w, true)
  if (eL !== null) cta = emit(eL)
  return cta
}

const HS: number[] = []; for (let h = 12.5; h <= 41.5; h += 1.5) HS.push(Math.round(h * 10) / 10)
const CS = [0.14, 0.16, 0.18, 0.20, 0.24, 0.28]
const LS = [0.30, 0.40, 0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80, 0.85]
for (const profile of [undefined, 'apca'] as Array<ContrastProfile | undefined>) {
  const red = signalScalesFor(profile).get('red')!.scale.ctaDark
  let minGate = Infinity, minOk = Infinity, fired = 0
  let argm = ''
  const seen = new Set<string>()
  for (const H of HS) for (const C of CS) for (const L of LS) {
    const hex = hexOfSeed(L, C, H)
    if (seen.has(hex)) continue
    seen.add(hex)
    const cta = identityDarkCta(hex, profile)
    const g = redGateDist(cta, red), o = oklabDist(cta, red)
    if (g <= RED_GATE.G) fired++
    if (g < minGate) { minGate = g; argm = `${hex} nomH${H} C${C} L${L} ctaL${cta.L.toFixed(3)} C${cta.C.toFixed(3)}` }
    minOk = Math.min(minOk, o)
  }
  console.log(`${profile ?? 'wcag'}: ${seen.size} unique seeds · fired ${fired} · minGate ${minGate.toFixed(4)} (${argm}) · minOklab ${minOk.toFixed(4)}`)
  console.log(`  red ctaDark L${red.L.toFixed(4)} C${red.C.toFixed(4)} H${red.H.toFixed(2)}`)
}
