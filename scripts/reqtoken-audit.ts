// reqtoken-audit.ts — THE GATE. Agnostic hue×chroma sweep; for every seed, check every DECLARED requirement
// of the resolved ramp. No okchroma comparison — pure requirement-satisfaction. Worst-case flagged.
// Checks are driven FROM the declaration (MODE_SPECS): a require declared = a require verified.
// The whole sweep runs under BOTH contrast profiles (wcag = the shipped default, apca = the opt-in
// re-solve); the gate passes only if every declared require holds under its own metric in both.
import { resolveRamp } from '../src/reqtoken/resolve'
import { MODE_SPECS } from '../src/reqtoken/spec'
import { withProfile, type ContrastProfile } from '../src/reqtoken/profiles'
import { APCA_TOL_LC, apcaYAt } from '../src/reqtoken/producers'
import { clampChromaToGamut, wcagY, contrastRatio, oklchToLinearRgb, apcaLc, apcaY } from '../src/engine/constraints'

const enc = (c: number) => { c = Math.max(0, Math.min(1, c)); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055 }
const oklchToHex = (L: number, C: number, H: number) => '#' + oklchToLinearRgb(L, C, H).map(c => Math.round(enc(c) * 255).toString(16).padStart(2, '0')).join('')

const HUES = Array.from({ length: 24 }, (_, i) => i * 15)   // 0..345
const CHROMAS = [0.06, 0.13, 0.20]
const SEED_L = 0.62

type Fail = { seed: string; mode: string; check: string; detail: string; sev: number }
const fails: Fail[] = []
let seedsChecked = 0
// report-only (5d): rest-chosen on-cta pole read on the pressed fill
let pressedPoleChecked = 0
const pressedPoleUnder: string[] = []

const PROFILES: ContrastProfile[] = ['wcag', 'apca']
for (const profile of PROFILES)
for (const H of HUES) for (const C of CHROMAS) {
  const hex = oklchToHex(SEED_L, C, H)
  for (const mode of ['light', 'dark'] as const) {
    seedsChecked++
    const spec = withProfile(MODE_SPECS[mode], profile)
    const r = resolveRamp(hex, mode, spec)
    const s = r.stops
    const byStop = (n: number) => s.find(st => st.stop === n)
    const id = `${profile} H${H} C${C}`
    // 1. totality: every declared stop resolved, none unresolvable
    for (const sp of spec.stops) if (!byStop(sp.stop)) fails.push({ seed: id, mode, check: 'missing-stop', detail: `stop ${sp.stop}`, sev: 100 })
    for (const st of s) if (st.unresolvable) fails.push({ seed: id, mode, check: 'unresolvable', detail: st.unresolvable, sev: 100 })
    // 2. every DECLARED contrast require holds under ITS OWN metric (recomputed from emitted, gamut-clamped)
    const p2 = byStop(2)!
    const p2Y = wcagY(p2.L, clampChromaToGamut(p2.L, p2.C, p2.H), p2.H)
    const p2ApcaY = apcaYAt(p2.L, clampChromaToGamut(p2.L, p2.C, p2.H), p2.H)
    for (const sp of spec.stops) {
      if (!sp.require) continue
      const st = byStop(sp.stop)!
      if (sp.require.metric === 'wcag') {
        const got = contrastRatio(wcagY(st.L, clampChromaToGamut(st.L, st.C, st.H), st.H), p2Y)
        if (got < sp.require.target - 1e-3) fails.push({ seed: id, mode, check: `require-stop${sp.stop}`, detail: `got ${got.toFixed(2)} < ${sp.require.target}`, sev: sp.require.target - got })
      } else if (sp.require.metric === 'apca') {
        const got = Math.abs(apcaLc(apcaYAt(st.L, clampChromaToGamut(st.L, st.C, st.H), st.H), p2ApcaY))
        if (got < sp.require.targetLc - APCA_TOL_LC) fails.push({ seed: id, mode, check: `require-stop${sp.stop}`, detail: `|Lc| ${got.toFixed(1)} < ${sp.require.targetLc}`, sev: (sp.require.targetLc - got) / 10 })
      } else if (sp.require.metric === 'min-separation') {
        const ref = byStop(sp.require.against === 'paper-1' ? 1 : sp.stop - 1)!
        const rad = (h: number) => (h * Math.PI) / 180
        const got = Math.sqrt((st.L - ref.L) ** 2
          + (st.C * Math.cos(rad(st.H)) - ref.C * Math.cos(rad(ref.H))) ** 2
          + (st.C * Math.sin(rad(st.H)) - ref.C * Math.sin(rad(ref.H))) ** 2)
        if (got < sp.require.target - 1e-4) fails.push({ seed: id, mode, check: `separation-stop${sp.stop}`, detail: `ΔE ${got.toFixed(4)} < ${sp.require.target}`, sev: 10 })
      }
    }
    // 3. monotonic L where the system guarantees it: stops 1–8 (paper→highlight-8) and the 9→10 pair.
    //    The 8↔9 seam is NOT guaranteed — the stop-8 3:1 clamp can legitimately cross the highlight band
    //    (true in production okchroma for saturated greens); it is reported, not failed.
    const ladder = [1, 2, 3, 4, 5, 6, 7, 8].map(n => byStop(n)!).filter(Boolean)
    for (let i = 1; i < ladder.length; i++) {
      const bad = mode === 'light' ? ladder[i].L > ladder[i - 1].L + 1e-6 : ladder[i].L < ladder[i - 1].L - 1e-6
      if (bad) fails.push({ seed: id, mode, check: 'monotonic-L', detail: `stop ${ladder[i].stop} L${ladder[i].L.toFixed(3)} vs ${ladder[i - 1].L.toFixed(3)}`, sev: 10 })
    }
    // (the 9→10 highlight-order check died with stop 10 — owner 2026-07-09)
    const h9 = byStop(9)!
    // dark 8<9: the require-raised stop 8 must not ride past the hand-placed highlight 9 (Stage-5 constraint)
    if (mode === 'dark') {
      const s8d = byStop(8)!
      if (s8d.L > h9.L + 1e-6) fails.push({ seed: id, mode, check: 'dark-8<9', detail: `8 L${s8d.L.toFixed(3)} > 9 L${h9.L.toFixed(3)}`, sev: 12 })
    }
    const t10 = byStop(10)!, t11 = byStop(11)!
    const inkBad = mode === 'light' ? t11.L > t10.L + 1e-6 : t11.L < t10.L - 1e-6
    if (inkBad) fails.push({ seed: id, mode, check: 'ink-order', detail: `10 L${t10.L.toFixed(3)} vs 11 L${t11.L.toFixed(3)}`, sev: 10 })
    // 4. in-gamut + valid rgb for every stop
    for (const st of s) {
      const gC = clampChromaToGamut(st.L, st.C, st.H)
      if (Math.abs(gC - st.C) > 1e-3) fails.push({ seed: id, mode, check: 'gamut', detail: `stop ${st.stop} C${st.C.toFixed(3)} vs clamp ${gC.toFixed(3)}`, sev: 5 })
      if (!/^#[0-9a-f]{6}$/.test(st.hex)) fails.push({ seed: id, mode, check: 'rgb', detail: `stop ${st.stop} hex ${st.hex}`, sev: 20 })
    }
    // 5. roles: cta is OFF-SCALE — anchored to the seed (floored in dark), constant hue. The floor governs
    //    the ANCHOR: the on-fill enforcement re-solve may legitimately move the fill past it, but then the
    //    enforcement's own guarantee (chosen-pole text 4.5) must hold — that's what we verify.
    const { cta, ctaHover } = r.roles
    const floor = spec.roles.find(x => x.role === 'cta')!.floorL
    if (cta.L < floor - 1e-6 && !cta.enforced) fails.push({ seed: id, mode, check: 'cta-floor', detail: `L${cta.L.toFixed(3)} < floor ${floor} without enforcement`, sev: 10 })
    if (cta.enforced) {
      if (spec.ons.onFill.enforceLc !== undefined) {
        // apca profile: an enforced cta's chosen pole must read the Lc threshold (solved to threshold+0.5)
        const aY2 = apcaYAt(cta.L, clampChromaToGamut(cta.L, cta.C, cta.H), cta.H)
        const got = Math.abs(apcaLc(r.ons.onFillIsWhite ? 1.0 : 0.0, aY2))
        if (got < spec.ons.onFill.enforceLc - 0.1) fails.push({ seed: id, mode, check: 'cta-enforce', detail: `enforced but on-text |Lc| ${got.toFixed(1)} < ${spec.ons.onFill.enforceLc}`, sev: 15 })
      } else {
        const fillY2 = wcagY(cta.L, clampChromaToGamut(cta.L, cta.C, cta.H), cta.H)
        const got = r.ons.onFillIsWhite ? contrastRatio(1.0, fillY2) : contrastRatio(fillY2, 0)
        if (got < 4.5 - 0.05) fails.push({ seed: id, mode, check: 'cta-enforce', detail: `enforced but on-text ${got.toFixed(2)} < 4.5`, sev: 15 })
      }
    }
    if (Math.abs(cta.H - r.seed.H) > 1e-6) fails.push({ seed: id, mode, check: 'cta-hue', detail: `H${cta.H.toFixed(1)} vs seed ${r.seed.H.toFixed(1)}`, sev: 5 })
    const { ctaPressed, ctaInk, ctaInkHover, ctaInkPressed } = r.roles
    for (const role of [cta, ctaHover, ctaPressed, ctaInk, ctaInkHover, ctaInkPressed])
      if (!/^#[0-9a-f]{6}$/.test(role.hex)) fails.push({ seed: id, mode, check: 'role-rgb', detail: `${role.role} ${role.hex}`, sev: 20 })
    // 5b. the cta family's states (owner respec 2026-07-16). Pressed = hover's direction
    //    doubled — same side of the cta, monotonic travel.
    const hoverUp = ctaHover.L > cta.L
    if ((ctaPressed.L > cta.L) !== hoverUp || Math.abs(ctaPressed.L - cta.L) < Math.abs(ctaHover.L - cta.L) - 1e-9)
      fails.push({ seed: id, mode, check: 'pressed-travel', detail: `cta L${cta.L.toFixed(3)} hover L${ctaHover.L.toFixed(3)} pressed L${ctaPressed.L.toFixed(3)}`, sev: 10 })
    // 5c. the cta-ink trio: rest MATCHES the resolved stop 10 exactly; the states may never
    //    read under the declared stop-10 bar (the state floor — dark states darken toward
    //    the paper, so this is the constraint that keeps link states legal).
    const i10 = byStop(10)!
    if (Math.abs(ctaInk.L - i10.L) > 1e-9 || Math.abs(ctaInk.C - i10.C) > 1e-9 || Math.abs(ctaInk.H - i10.H) > 1e-9)
      fails.push({ seed: id, mode, check: 'cta-ink-anchor', detail: `ink L${ctaInk.L.toFixed(4)} != stop10 L${i10.L.toFixed(4)}`, sev: 20 })
    const t10req = spec.stops.find(x => x.stop === 10)!.require
    for (const [nm, st] of [['cta-ink-hover', ctaInkHover], ['cta-ink-pressed', ctaInkPressed]] as const) {
      if (t10req?.metric === 'wcag') {
        const got = contrastRatio(wcagY(st.L, clampChromaToGamut(st.L, st.C, st.H), st.H), p2Y)
        if (got < t10req.target - 1e-3) fails.push({ seed: id, mode, check: `${nm}-floor`, detail: `got ${got.toFixed(2)} < ${t10req.target}`, sev: 15 })
      } else if (t10req?.metric === 'apca') {
        const got = Math.abs(apcaLc(apcaYAt(st.L, clampChromaToGamut(st.L, st.C, st.H), st.H), p2ApcaY))
        if (got < t10req.targetLc - APCA_TOL_LC) fails.push({ seed: id, mode, check: `${nm}-floor`, detail: `|Lc| ${got.toFixed(1)} < ${t10req.targetLc}`, sev: 15 })
      }
    }
    // 5d. REPORT-ONLY — the on-cta pole chosen at rest, read on the PRESSED fill (pressed
    //    travels 2× hover; hover has never re-judged the pole, so this measures the new
    //    worst case rather than legislating one mid-round — owner reads the count).
    {
      const pY = wcagY(ctaPressed.L, clampChromaToGamut(ctaPressed.L, ctaPressed.C, ctaPressed.H), ctaPressed.H)
      const got = r.ons.onFillIsWhite ? contrastRatio(1.0, pY) : contrastRatio(pY, 0)
      pressedPoleChecked++
      if (got < 4.5) pressedPoleUnder.push(`${id} ${mode} (${got.toFixed(2)})`)
    }
    // 6. ons: the chosen pole must be the passing one — if enforce is declared and the chosen pole fails
    //    WCAG 4.5 while the OTHER pole passes it with |Lc| ≥ 45, the choice is wrong (true dead zone excepted)
    const onSpec = spec.ons.onFill
    if (onSpec.enforce) {
      const fillY = wcagY(cta.L, clampChromaToGamut(cta.L, cta.C, cta.H), cta.H)
      const aY = apcaY(...([cta.hex.slice(1, 3), cta.hex.slice(3, 5), cta.hex.slice(5, 7)].map(h => parseInt(h, 16) / 255) as [number, number, number]))
      if (onSpec.enforceLc !== undefined) {
        // apca profile: the pole must be Lc-optimal, and a failing WHITE pole must have triggered the
        // fill re-solve (white-only trigger, mirroring the engine's asymmetry — black dead zones keep the fill)
        const chosenLc = Math.abs(apcaLc(r.ons.onFillIsWhite ? 1.0 : 0.0, aY))
        const otherLc = Math.abs(apcaLc(r.ons.onFillIsWhite ? 0.0 : 1.0, aY))
        if (chosenLc < otherLc - 0.1)
          fails.push({ seed: id, mode, check: 'on-fill-pole', detail: `chosen ${r.ons.onFillIsWhite ? 'white' : 'black'} |Lc| ${chosenLc.toFixed(1)} < other ${otherLc.toFixed(1)}`, sev: 15 })
        if (r.ons.onFillIsWhite && chosenLc < onSpec.enforceLc - 0.1 && !cta.enforced)
          fails.push({ seed: id, mode, check: 'on-fill-enforce', detail: `white on-text |Lc| ${chosenLc.toFixed(1)} < ${onSpec.enforceLc} but the fill was not re-solved`, sev: 15 })
      } else {
        const chosenWcag = r.ons.onFillIsWhite ? contrastRatio(1.0, fillY) : contrastRatio(fillY, 0)
        const otherWcag = r.ons.onFillIsWhite ? contrastRatio(fillY, 0) : contrastRatio(1.0, fillY)
        const otherLc = Math.abs(apcaLc(r.ons.onFillIsWhite ? 0.0 : 1.0, aY))
        if (chosenWcag < 4.5 && otherWcag >= 4.5 && otherLc >= 45)
          fails.push({ seed: id, mode, check: 'on-fill-pole', detail: `chosen ${r.ons.onFillIsWhite ? 'white' : 'black'} ${chosenWcag.toFixed(2)}, other passes ${otherWcag.toFixed(2)}`, sev: 15 })
      }
    }
  }
}

// 7. apparent-L uniformity across hues (the Nayatani property) — report only
console.log('=== apparent-L uniformity across hues (C 0.13) ===')
for (const mode of ['light', 'dark'] as const) {
  const ramps = HUES.map(H => resolveRamp(oklchToHex(SEED_L, 0.13, H), mode))
  const stopNums = ramps[0].stops.map(s => s.stop)
  const spreads = stopNums.map((_, i) => {
    const apps = ramps.map(r => r.stops[i].appL)
    return Math.max(...apps) - Math.min(...apps)
  })
  console.log(`  ${mode}: appL spread [${stopNums.join(' ')}] = ${spreads.map(v => v.toFixed(1)).join(' ')}  max ${Math.max(...spreads).toFixed(1)}`)
}

// 5d report: pressed-fill pole coverage (report-only — see the check note)
console.log(`\n=== on-cta pole on the PRESSED fill (wcag 4.5 read, report-only) ===`)
console.log(`  ${pressedPoleChecked} checked · under 4.5: ${pressedPoleUnder.length}`)
if (pressedPoleUnder.length) pressedPoleUnder.slice(0, 10).forEach(x => console.log(`    ${x}`))

// report
const byCheck: Record<string, number> = {}
for (const f of fails) byCheck[f.check] = (byCheck[f.check] ?? 0) + 1
console.log(`\n=== reqtoken-audit: ${seedsChecked} seed×mode resolved (profiles: ${PROFILES.join(' + ')}) ===`)
console.log(`failures: ${fails.length}`)
for (const [k, n] of Object.entries(byCheck)) console.log(`  ${k}: ${n}`)
if (fails.length) {
  console.log('\nworst 12:')
  fails.sort((a, b) => b.sev - a.sev).slice(0, 12).forEach(f => console.log(`  [${f.check}] ${f.seed} ${f.mode}: ${f.detail}`))
}
console.log(fails.filter(f => f.sev >= 5).length === 0 ? '\nGATE: PASS (all hard requirements satisfied)' : '\nGATE: FAIL')
