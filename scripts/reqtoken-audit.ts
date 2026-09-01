// reqtoken-audit.ts — THE GATE. Agnostic hue×chroma sweep; for every seed, check every DECLARED requirement
// of the resolved ramp. No okchroma comparison — pure requirement-satisfaction. Worst-case flagged.
// Checks are driven FROM the declaration (MODE_SPECS): a require declared = a require verified.
// The whole sweep runs under BOTH contrast profiles (wcag = the shipped default, apca = the opt-in
// re-solve); the gate passes only if every declared require holds under its own metric in both.
import { resolveRamp } from '../src/engine/requirements/resolve'
import { MODE_SPECS } from '../src/engine/requirements/spec'
import { withProfile, type ContrastProfile } from '../src/engine/requirements/profiles'
import { APCA_TOL_LC, apcaYAt } from '../src/engine/requirements/producers'
import { clampChromaToGamut, wcagY, contrastRatio, oklchToLinearRgb, apcaLc, apcaY, shippedY } from '../src/engine/constraints'
import { resolveBrand, resolveLinkInverseTrio } from '../src/engine/resolve'
import { PEN_70_GROUND } from '../src/engine/stopTable'

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
    // 2. every DECLARED contrast require holds under ITS OWN metric (recomputed from emitted,
    // gamut-clamped) — the wcag reference follows the DECLARED anchor (T10 anchors highlighter-20
    // since the highlighter-20 law; the papers verify vs paper-3 as before)
    const AGAINST: Record<string, number> = { 'paper-1': 1, 'paper-3': 2, 'paper-5': 3, 'highlighter-20': 7 }
    const p2 = byStop(2)!
    const p2ApcaY = apcaYAt(p2.L, clampChromaToGamut(p2.L, p2.C, p2.H), p2.H)
    for (const sp of spec.stops) {
      if (!sp.require) continue
      const st = byStop(sp.stop)!
      if (sp.require.metric === 'wcag') {
        const ref = byStop(AGAINST[sp.require.against] ?? 2)!
        const refY = wcagY(ref.L, clampChromaToGamut(ref.L, ref.C, ref.H), ref.H)
        const got = contrastRatio(wcagY(st.L, clampChromaToGamut(st.L, st.C, st.H), st.H), refY)
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
    // 3. monotonic L where the system guarantees it: stops 1–8 (paper→crayon-26).
    const ladder = [1, 2, 3, 4, 5, 6, 7, 8].map(n => byStop(n)!).filter(Boolean)
    for (let i = 1; i < ladder.length; i++) {
      const bad = mode === 'light' ? ladder[i].L > ladder[i - 1].L + 1e-6 : ladder[i].L < ladder[i - 1].L - 1e-6
      if (bad) fails.push({ seed: id, mode, check: 'monotonic-L', detail: `stop ${ladder[i].stop} L${ladder[i].L.toFixed(3)} vs ${ladder[i - 1].L.toFixed(3)}`, sev: 10 })
    }
    // 3b. BAND ORDER — the invariant that did not exist, and whose absence let
    //    highlight-9 drift onto ink-10 unnoticed (drift handoff 2026-07-29). The old
    //    check here was `dark-8<9`, an L-comparison against a stop that no longer
    //    exists. Its successor is stated as CONTRAST against the shared plane both
    //    stops sit on (paper-5 (paper-3 pre-Stage-B)), because contrast is what the two requires are about:
    //    the emphasis fill must read further off the page than the focus ring does.
    //    Both modes now, not just dark. Margin declared in band-audit
    //    (BAND_ORDER_MARGIN 1.0); this gate asserts the ORDER, the sweep gate asserts
    //    the margin — a strict-order failure here is the louder signal.
    const s8b = byStop(8)!, i9 = byStop(9)!, p3b = byStop(3)!
    const p3Y = wcagY(p3b.L, clampChromaToGamut(p3b.L, p3b.C, p3b.H), p3b.H)
    const vsP3 = (st: typeof s8b) => contrastRatio(wcagY(st.L, clampChromaToGamut(st.L, st.C, st.H), st.H), p3Y)
    if (vsP3(i9) <= vsP3(s8b) + 1e-6)
      fails.push({ seed: id, mode, check: 'band-order', detail: `pencil-47 ${vsP3(i9).toFixed(2)} !> crayon-26 ${vsP3(s8b).toFixed(2)} vs paper-5`, sev: 12 })
    // the pen band is strictly monotonic — darker per stop in light, lighter in dark
    // (three stops since C49: 9 the first text, 10 the between, 11 the strong)
    for (const [lo, hi] of [[9, 10], [10, 11]] as const) {
      const a = byStop(lo)!, b = byStop(hi)!
      const textBad = mode === 'light' ? b.L > a.L + 1e-6 : b.L < a.L - 1e-6
      if (textBad) fails.push({ seed: id, mode, check: 'text-order', detail: `stop${lo} L${a.L.toFixed(3)} vs stop${hi} L${b.L.toFixed(3)}`, sev: 10 })
    }
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
    const { ctaPressed } = r.roles
    for (const role of [cta, ctaHover, ctaPressed])
      if (!/^#[0-9a-f]{6}$/.test(role.hex)) fails.push({ seed: id, mode, check: 'role-rgb', detail: `${role.role} ${role.hex}`, sev: 20 })
    // 5b. the cta family's states (owner respec 2026-07-16). Pressed = hover's direction
    //    doubled — same side of the cta, monotonic travel.
    const hoverUp = ctaHover.L > cta.L
    if ((ctaPressed.L > cta.L) !== hoverUp || Math.abs(ctaPressed.L - cta.L) < Math.abs(ctaHover.L - cta.L) - 1e-9)
      fails.push({ seed: id, mode, check: 'pressed-travel', detail: `cta L${cta.L.toFixed(3)} hover L${ctaHover.L.toFixed(3)} pressed L${ctaPressed.L.toFixed(3)}`, sev: 10 })
    // (5c DELETED with the cta-ink roles, owner 2026-08-12: it asserted the roles matched
    //    stops 9/10/11 and re-checked those stops' requires — check #2 above already
    //    verifies every declared stop require, and the roles no longer exist.)
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

// 6b. the INVERSE LINK trio (owner round 2026-08-19) — HARD. The trio is a role-level
//     construct (resolveLinkInverseTrio: the link seed's pen register re-anchored at
//     PEN_70_GROUND, modes crossed), so the declaration-driven loop above never sees it.
//     Two laws, each lane under its own metric:
//       a) the trio clears its bars against the frozen ground — wcag on the SHIPPED pair
//          (the 8-bit basis the constant is stated in), apca as |Lc| vs the ground's apcaY
//          at the DEFAULT_APCA_LC_MAP translations of the same bars;
//       b) the GROUND BOUND tripwire: no pen-70 this sweep resolves may escape the frozen
//          worst (lighter than light's, darker than dark's) — the constant's re-derive
//          note (stopTable.ts) names the full derivation sweep; this catches drift.
{
  const TEXT_BARS: Array<[number, number]> = [[4.5, 75], [6.5, 85], [7.0, 90]] // [wcag, Lc] per state
  for (const profile of PROFILES) for (const H of HUES) for (const C of CHROMAS) {
    const ground = PEN_70_GROUND[profile]
    const groundShipY = {
      light: shippedY(ground.light.L, ground.light.C, ground.light.H),
      dark: shippedY(ground.dark.L, ground.dark.C, ground.dark.H),
    }
    const groundApcaY = {
      light: apcaYAt(ground.light.L, ground.light.C, ground.light.H),
      dark: apcaYAt(ground.dark.L, ground.dark.C, ground.dark.H),
    }
    const hex = oklchToHex(SEED_L, C, H)
    const id = `${profile} H${H} C${C}`
    const t = resolveLinkInverseTrio(hex, profile)
    const trios = {
      light: [t.link, t.linkHover, t.linkPressed],
      dark: [t.linkDark, t.linkHoverDark, t.linkPressedDark],
    } as const
    for (const mode of ['light', 'dark'] as const) {
      trios[mode].forEach((st, i) => {
        const [bar, barLc] = TEXT_BARS[i]
        // any miss is HARD (sev over the gate threshold) — these bars are the family's law
        if (profile === 'wcag') {
          const got = contrastRatio(shippedY(st.L, st.C, st.H), groundShipY[mode])
          if (got < bar - 1e-3) fails.push({ seed: id, mode, check: 'link-inverse', detail: `state ${i} shipped ${got.toFixed(2)} < ${bar} vs ground`, sev: 15 })
        } else {
          const got = Math.abs(apcaLc(apcaYAt(st.L, clampChromaToGamut(st.L, st.C, st.H), st.H), groundApcaY[mode]))
          if (got < barLc - APCA_TOL_LC) fails.push({ seed: id, mode, check: 'link-inverse', detail: `state ${i} |Lc| ${got.toFixed(1)} < ${barLc} vs ground`, sev: 15 })
        }
      })
    }
    // b) ground bound: this seed's own pen-70 must stay inside the frozen worst
    const rb = resolveBrand(hex, 'ground-bound', { contrastProfile: profile === 'apca' ? 'apca' : undefined })
    const li = rb.scale.light.find(s => s.stop === 11)!, di = rb.scale.dark.find(s => s.stop === 11)!
    const liY = shippedY(li.L, li.C, li.H), diY = shippedY(di.L, di.C, di.H)
    if (liY > groundShipY.light + 1e-9) fails.push({ seed: id, mode: 'light', check: 'pen70-ground-bound', detail: `pen-70 Y ${liY.toFixed(4)} > frozen worst ${groundShipY.light.toFixed(4)} — re-derive PEN_70_GROUND`, sev: 50 })
    if (diY < groundShipY.dark - 1e-9) fails.push({ seed: id, mode: 'dark', check: 'pen70-ground-bound', detail: `pen-70 Y ${diY.toFixed(4)} < frozen worst ${groundShipY.dark.toFixed(4)} — re-derive PEN_70_GROUND`, sev: 50 })
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
