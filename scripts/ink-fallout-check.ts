// ink-fallout-check.ts — how do ink-11 / ink-12 contrast FALL OUT in the PURE carry (delta, no bolt-ons)?
// Text-tier ink is light text on the dark paper-2. Bars: WCAG ink-11 ≥ 4.5 / ink-12 ≥ 7.0; APCA ink-11 ≥ Lc75
// / ink-12 ≥ Lc90 (DEFAULT_APCA_LC_MAP). The dark require is a FLOOR — it solves the DECLARED metric only, so
// the OTHER metric is a free fall-out. Run the pure carry under BOTH profiles; per profile report, for 11/12:
// the WCAG ratio and the APCA Lc that land (min/median/max), pass-count vs each bar, and any unresolvable.
import { resolveRamp, type ResolvedRamp, type ResolveOpts } from '../src/reqtoken/resolve'
import { MODE_SPECS } from '../src/reqtoken/spec'
import { withProfile, type ContrastProfile } from '../src/reqtoken/profiles'
import { legalRatio, apcaLc, wcagY } from '../src/engine/constraints'
import { apcaYAt } from '../src/reqtoken/producers'
import { srgbEmitChannels } from '../src/engine/colorMath'
import { darkChromaCurve } from '../src/engine/darkChromaCurve'
import { DARK_BRAND_FILL_MIN_L } from '../src/engine/stopTable'

const base: ResolveOpts = { highlight: true, enforceOnFillContrast: true, coolRedDark: true, darkChromaCurve, darkFillMinL: DARK_BRAND_FILL_MIN_L }
const hx = (s: { L: number; C: number; H: number }) => '#' + (Object.values(srgbEmitChannels(s)) as number[]).map(c => Math.round(Math.max(0, Math.min(1, c)) * 255).toString(16).padStart(2, '0')).join('')
const seeds: string[] = []
for (let H = 0; H < 360; H += 20) for (const C of [0.06, 0.13, 0.19]) for (const L of [0.5, 0.68]) seeds.push(hx({ L, C, H }))
const med = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)] }
const stat = (a: number[]) => `min ${Math.min(...a).toFixed(2)}  med ${med(a).toFixed(2)}  max ${Math.max(...a).toFixed(2)}`

// pure carry under a given profile: resolve light + dark with the SAME profiled spec; carry light stops into dark
function pure(hex: string, profile: ContrastProfile): ResolvedRamp {
  const lspec = withProfile(MODE_SPECS.light, profile), dspec = withProfile(MODE_SPECS.dark, profile)
  const l = resolveRamp(hex, 'light', lspec, base)
  return resolveRamp(hex, 'dark', dspec, { ...base, deltaLightStops: l.stops, deltaLightCta: l.roles.cta, deltaCarry: true })
}
const WBAR: Record<number, number> = { 8: 3.0, 11: 4.5, 12: 7.0 }, ABAR: Record<number, number> = { 8: 30, 11: 75, 12: 90 }

for (const profile of ['wcag', 'apca'] as ContrastProfile[]) {
  console.log(`\n===== PURE carry — ${profile.toUpperCase()} profile (solves ${profile === 'wcag' ? 'the WCAG ratio' : 'the APCA Lc'}; the other metric is free fall-out) =====`)
  const solved = profile === 'wcag' ? 'WCAG' : 'APCA'
  for (const n of [8, 11, 12]) {
    const wc: number[] = [], lc: number[] = []
    let unres = 0
    for (const hex of seeds) {
      const r = pure(hex, profile)
      const p2 = r.stops.find(s => s.stop === 2)!, s = r.stops.find(s => s.stop === n)!
      if ((s as any).unresolvable) unres++
      wc.push(legalRatio(s.L, s.C, s.H, wcagY(p2.L, p2.C, p2.H)))
      lc.push(Math.abs(apcaLc(apcaYAt(s.L, s.C, s.H), apcaYAt(p2.L, p2.C, p2.H))))
    }
    const wPass = wc.filter(x => x >= WBAR[n]).length, aPass = lc.filter(x => x >= ABAR[n]).length
    console.log(`  ink-${n} (bars: WCAG ≥ ${WBAR[n]}, APCA ≥ Lc ${ABAR[n]})   [${solved} is the solved metric]`)
    console.log(`     WCAG ratio : ${stat(wc)}   clears ${WBAR[n]}: ${wPass}/${seeds.length}`)
    console.log(`     APCA Lc    : ${stat(lc)}   clears Lc ${ABAR[n]}: ${aPass}/${seeds.length}`)
    if (unres) console.log(`     UNRESOLVABLE: ${unres}/${seeds.length}  (declared require not met even after the floor solve)`)
  }
}

// REGRESSION check: under the WCAG profile, does the SHIPPED scaffold (today, no delta) already clear the
// APCA bar — i.e. is the dual-metric gap NEW to the delta carry (which pulls L down to the single WCAG floor)?
console.log(`\n===== WCAG profile — APCA Lc fall-out: TODAY (seed-keyed scaffold) vs PURE carry =====`)
for (const n of [8, 11, 12]) {
  const t: number[] = [], p: number[] = []
  for (const hex of seeds) {
    const today = resolveRamp(hex, 'dark', MODE_SPECS.dark, base)
    const pr = pure(hex, 'wcag')
    const tp2 = today.stops.find(s => s.stop === 2)!, ts = today.stops.find(s => s.stop === n)!
    const pp2 = pr.stops.find(s => s.stop === 2)!, ps = pr.stops.find(s => s.stop === n)!
    t.push(Math.abs(apcaLc(apcaYAt(ts.L, ts.C, ts.H), apcaYAt(tp2.L, tp2.C, tp2.H))))
    p.push(Math.abs(apcaLc(apcaYAt(ps.L, ps.C, ps.H), apcaYAt(pp2.L, pp2.C, pp2.H))))
  }
  console.log(`  stop ${n} (APCA bar ${ABAR[n]}):  today  ${stat(t)}  clears ${t.filter(x => x >= ABAR[n]).length}/${seeds.length}   |   pure  ${stat(p)}  clears ${p.filter(x => x >= ABAR[n]).length}/${seeds.length}`)
}
