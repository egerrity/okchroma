// coolreddark-sweep.ts — RESEARCH instrument (2026-07-10, coolRedDark question):
// what does the dark-context hue shift (producers.ts darkH, coolRedDark) actually protect,
// and what happens to the dark cta if it runs at identity hue instead?
//
// Zero engine edits. Real pipeline: shipped values via resolveBrand; the identity-hue
// counterfactual via a MIRROR of the resolver's dark-cta block (resolve.ts:322-343) built
// from the real producer functions, VALIDATED byte-identical against resolveBrand's ctaDark
// before the darkH swap is trusted. Wash/ink/paper-0 counterfactuals via generateScale with
// the exact resolveBrand floor opts (dark side proven identical to resolveBrand first).
//
// Output: scripts/c12-session/coolreddark-sweep.json + console summary.
// Run: esbuild scripts/c12-session/coolreddark-sweep.ts --bundle --platform=node
//        --outfile=dist/coolreddark-sweep.js && node dist/coolreddark-sweep.js

import { writeFileSync } from 'fs'
import { resolveBrand, signalScalesFor } from '../../src/engine/resolve'
import { generateScale, type GeneratedScale, type ContrastProfile } from '../../src/engine/colorEngine'
import { darkChromaCurve } from '../../src/engine/darkChromaCurve'
import { DARK_BRAND_FILL_MIN_L } from '../../src/engine/stopTable'
import {
  hexToOklch, oklabDist, redGateDist, RED_GATE, redRepelShiftDeg, srgbEmitChannels,
} from '../../src/engine/colorMath'
import { clampChromaToGamut, oklchToLinearRgb, legalRatio, apcaLc } from '../../src/engine/constraints'
import { hoverL } from '../../src/engine/archetypes'
import { CTA_ONFILL_ENFORCE_LC } from '../../src/reqtoken/profiles'
import {
  buildContext, buildDarkContext, onFillIsWhiteDarkAt, ctaDarkEnforcedL, ctaDarkEnforcedLApca,
  exitCtaL, apcaYAt, type Ctx,
} from '../../src/reqtoken/producers'
import { p2Diff, P2_D_UP } from '../../src/engine/p2'
import { stopDeltaE } from '../../src/engine/collision'

// ---------- helpers ----------
const hexOfSeed = (L: number, C: number, H: number): string => {
  const c = clampChromaToGamut(L, C, H, 'srgb')
  const [rl, gl, bl] = oklchToLinearRgb(L, c, H)
  const gm = (v: number) => { const x = Math.min(1, Math.max(0, v)); return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055 }
  const ch = (v: number) => Math.round(gm(v) * 255).toString(16).padStart(2, '0')
  return `#${ch(rl)}${ch(gl)}${ch(bl)}`
}
const hexOfStop = (s: { L: number; C: number; H: number }): string => {
  const { r, g, b } = srgbEmitChannels(s)
  const ch = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')
  return `#${ch(r)}${ch(g)}${ch(b)}`
}
const hueDist = (a: number, b: number) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d }
const r4 = (x: number) => Math.round(x * 1e4) / 1e4
const r2 = (x: number) => Math.round(x * 1e2) / 1e2

// ---------- the dark-cta mirror (resolve.ts:322-343 with the real producer fns) ----------
// identityHue=false must reproduce resolveBrand's ctaDark EXACTLY (validated below);
// identityHue=true swaps ctx.darkH -> ctx.brandH before buildDarkContext, so the trim
// (darkCtaTrim), the emit hue, and the enforce re-solve all key on the identity hue —
// "the dark cta as if coolRedDark never shifted it", everything else untouched.
function floorOptsFor(profile: ContrastProfile | undefined) {
  return {
    darkFillMinL: DARK_BRAND_FILL_MIN_L,
    enforceOnFillContrast: true,
    coolRedDark: true,
    darkChromaCurve,
    highlight: true,
    contrastProfile: profile,
  }
}
function mirrorDarkCta(hex: string, profile: ContrastProfile | undefined, identityHue: boolean) {
  const ctx0 = buildContext(hex, floorOptsFor(profile))
  const ctx: Ctx = identityHue ? { ...ctx0, darkH: ctx0.brandH } : ctx0
  const d = buildDarkContext(ctx)                       // darkFillMinL overrides specFloorL
  const enforceLc = profile === 'apca' ? CTA_ONFILL_ENFORCE_LC : undefined
  const emit = (L: number) => {
    const rawC = ctx.cAt('dark', L, d.darkC9)
    const gC = clampChromaToGamut(L, rawC, ctx.darkH)
    return { L, C: gC, H: ctx.darkH }
  }
  let cta = emit(d.dark9L)
  const onFillIsWhite = onFillIsWhiteDarkAt(cta.L, cta.C, cta.H, enforceLc !== undefined ? false : true)
  const enforcedL = enforceLc !== undefined
    ? ctaDarkEnforcedLApca(ctx, cta, onFillIsWhite, true, enforceLc)
    : ctaDarkEnforcedL(ctx, cta, onFillIsWhite, true)
  let enforced = false
  if (enforcedL !== null) { cta = emit(enforcedL); enforced = true }
  const hover = emit(hoverL(cta.L))
  return { cta, hover, enforced, ctx, dctx: d }
}

// on-cta legibility at a fill (both poles, both laws) — Q4 feasibility data
function poleRead(s: { L: number; C: number; H: number }) {
  const y = apcaYAt(s.L, s.C, s.H)
  return {
    lcWhite: r2(Math.abs(apcaLc(1.0, y))),
    lcBlack: r2(Math.abs(apcaLc(apcaYAt(0, 0, 0), y))),
    wcagWhite: r2(legalRatio(s.L, s.C, s.H, 1.0)),
    wcagBlack: r2(legalRatio(s.L, s.C, s.H, 0)),
  }
}

// dark wash proximity vs red (C7's washProximity, dark side, stops 3-7 + s8 separately)
const WASH = [3, 4, 5, 6, 7]
function washMinDark(b: GeneratedScale, s: GeneratedScale) {
  let dE = Infinity, dH = Infinity
  for (const k of WASH) {
    const bs = b.dark.find(x => x.stop === k), ss = s.dark.find(x => x.stop === k)
    if (bs && ss) { dE = Math.min(dE, stopDeltaE(bs, ss)); dH = Math.min(dH, hueDist(bs.H, ss.H)) }
  }
  return { dE, dH }
}
function washMinLight(b: GeneratedScale, s: GeneratedScale) {
  let dE = Infinity
  for (const k of WASH) {
    const bs = b.light.find(x => x.stop === k), ss = s.light.find(x => x.stop === k)
    if (bs && ss) dE = Math.min(dE, stopDeltaE(bs, ss))
  }
  return dE
}
const maxStopDelta = (a: GeneratedScale, b: GeneratedScale, stops: number[], side: 'dark') => {
  let m = 0
  for (const k of stops) {
    const as = a[side].find(x => x.stop === k), bs = b[side].find(x => x.stop === k)
    if (as && bs) m = Math.max(m, stopDeltaE(as, bs))
  }
  return m
}

// ---------- the agnostic in-band grid ----------
const HS = [12.5, 15, 18, 21, 24, 27, 30, 33, 36, 39, 41.5]
const CS = [0.08, 0.11, 0.14, 0.18, 0.22]
const LS = [0.30, 0.40, 0.50, 0.62, 0.75]
const PROFILES: Array<{ lane: string; profile: ContrastProfile | undefined }> = [
  { lane: 'wcag', profile: undefined },
  { lane: 'apca', profile: 'apca' },
]
const TYPE2_BAR = 0.10   // DARK_DELTA_E_THRESHOLD, the dark type-2 register bar
const G = RED_GATE.G     // 0.090
const HARD_BAR = 0.006   // collision-sweep's wash bar

type Row = {
  lane: string; hex: string; nom: { H: number; C: number; L: number }
  seed: { L: number; C: number; H: number }
  shiftDeg: number                       // shipped darkH − brandH (0 when out of band)
  before: { L: number; C: number; H: number; hex: string; enforced: boolean; dOk: number; dGate: number }
  after: { L: number; C: number; H: number; hex: string; enforced: boolean; dOk: number; dGate: number; pole: ReturnType<typeof poleRead> }
  hoverAfterHex: string
  // counterfactual scales (dark side only)
  ctaOffDark19MaxDE: number              // coolRedDark:false vs shipped — stops 1-9 (expect 0)
  ink11: { dH: number; dE: number }; ink12: { dH: number; dE: number }; p0: { dH: number; dE: number }
  wash: { on: { dE: number; dH: number }; ctaOff: { dE: number; dH: number }; supOff: { dE: number; dH: number }; light: { on: number; supOff: number } }
  exit?: { exitL: number; dL: number; gate: number; p2: number; pole: ReturnType<typeof poleRead>; hex: string }
}
const rows: Row[] = []
let mirrorFail = 0, gsDarkFail = 0

for (const { lane, profile } of PROFILES) {
  const red = signalScalesFor(profile).get('red')!.scale
  const redD = { L: red.ctaDark.L, C: red.ctaDark.C, H: red.ctaDark.H }
  for (const H of HS) for (const C of CS) for (const L of LS) {
    const hex = hexOfSeed(L, C, H)
    const seed = hexToOklch(hex)
    const rb = resolveBrand(hex, 'sweep', { contrastProfile: profile })
    const sc = rb.scale

    // -- mirror validation (shipped darkH) --
    const m0 = mirrorDarkCta(hex, profile, false)
    const eq = (a: number, b: number) => Math.abs(a - b) < 1e-12
    if (!(eq(m0.cta.L, sc.ctaDark.L) && eq(m0.cta.C, sc.ctaDark.C) && eq(m0.cta.H, sc.ctaDark.H))) mirrorFail++

    // -- identity-hue counterfactual --
    const m1 = mirrorDarkCta(hex, profile, true)

    // -- counterfactual scales (real generateScale at the resolveBrand floor) --
    const fo = floorOptsFor(profile)
    const gsOn = generateScale(hex, 'x', undefined, fo)
    if (maxStopDelta(gsOn, sc, [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12], 'dark') > 1e-12) gsDarkFail++
    const gsCtaOff = generateScale(hex, 'x', undefined, { ...fo, coolRedDark: false })
    const gsSupOff = generateScale(hex, 'x', undefined, { ...fo, coolRedDark: false, suppressRedCool: true })

    const ink = (n: number, a: GeneratedScale, b: GeneratedScale) => {
      const as = a.dark.find(x => x.stop === n)!, bs = b.dark.find(x => x.stop === n)!
      return { dH: r2(hueDist(as.H, bs.H)), dE: r4(stopDeltaE(as, bs)) }
    }
    const p0 = gsOn.paper0Dark && gsCtaOff.paper0Dark
      ? { dH: r2(hueDist(gsOn.paper0Dark.H, gsCtaOff.paper0Dark.H)), dE: r4(stopDeltaE(gsOn.paper0Dark, gsCtaOff.paper0Dark)) }
      : { dH: 0, dE: 0 }

    const wOn = washMinDark(gsOn, red), wCtaOff = washMinDark(gsCtaOff, red), wSup = washMinDark(gsSupOff, red)

    const mk = (m: typeof m0) => ({
      L: r4(m.cta.L), C: r4(m.cta.C), H: r2(m.cta.H), hex: hexOfStop(m.cta), enforced: m.enforced,
      dOk: r4(oklabDist(m.cta, redD)), dGate: r4(redGateDist(m.cta, redD)),
    })
    const row: Row = {
      lane, hex, nom: { H, C, L },
      seed: { L: r4(seed.L), C: r4(seed.C), H: r2(seed.H) },
      shiftDeg: r2(m0.ctx.darkH - m0.ctx.brandH),
      before: mk(m0),
      after: { ...mk(m1), pole: poleRead(m1.cta) },
      hoverAfterHex: hexOfStop(m1.hover),
      ctaOffDark19MaxDE: r4(maxStopDelta(gsOn, gsCtaOff, [1, 2, 3, 4, 5, 6, 7, 8, 9], 'dark')),
      ink11: ink(11, gsOn, gsCtaOff), ink12: ink(12, gsOn, gsCtaOff), p0,
      wash: {
        on: { dE: r4(wOn.dE), dH: r2(wOn.dH) },
        ctaOff: { dE: r4(wCtaOff.dE), dH: r2(wCtaOff.dH) },
        supOff: { dE: r4(wSup.dE), dH: r2(wSup.dH) },
        light: { on: r4(washMinLight(gsOn, red)), supOff: r4(washMinLight(gsSupOff, red)) },
      },
    }

    // -- Q4: identity-hue dark cta inside the gate -> what would a dark up-exit cost? --
    if (row.after.dGate <= G) {
      const cFor = (LL: number) => m1.ctx.cAt('dark', LL, m1.dctx.darkC9)
      const exL = exitCtaL(m1.cta.L, cFor, m1.ctx.brandH, redD, true)
      if (exL !== null) {
        const p = { L: exL, C: clampChromaToGamut(exL, cFor(exL), m1.ctx.brandH), H: m1.ctx.brandH }
        row.exit = {
          exitL: r4(exL), dL: r4(exL - m1.cta.L), gate: r4(redGateDist(p, redD)),
          p2: r4(p2Diff(p, redD)), pole: poleRead(p), hex: hexOfStop(p),
        }
      }
    }
    rows.push(row)
  }
}

// ---------- summary ----------
const sum = (lane: string) => {
  const rs = rows.filter(r => r.lane === lane)
  const cnt = (f: (r: Row) => boolean) => rs.filter(f).length
  const fired = rs.filter(r => r.after.dGate <= G)
  const worst = [...rs].sort((a, b) => a.after.dGate - b.after.dGate).slice(0, 6)
  return {
    lane, cells: rs.length,
    mirror: { fail: mirrorFail, gsDarkFail },
    ctaVsRedDark: {
      before: { under010: cnt(r => r.before.dOk < TYPE2_BAR), inGate: cnt(r => r.before.dGate <= G), minGate: r4(Math.min(...rs.map(r => r.before.dGate))) },
      after: { under010: cnt(r => r.after.dOk < TYPE2_BAR), inGate: cnt(r => r.after.dGate <= G), minGate: r4(Math.min(...rs.map(r => r.after.dGate))) },
      worstAfter: worst.map(r => ({ hex: r.hex, nom: r.nom, dGate: r.after.dGate, dOk: r.after.dOk, ctaHex: r.after.hex })),
    },
    identityGain: {
      // deep-maroon class H12-30 x L.3-.5: the hue the shift costs today
      maroon: rs.filter(r => r.nom.H <= 30 && r.nom.L <= 0.5).map(r => ({
        hex: r.hex, nom: r.nom, shiftDeg: r.shiftDeg, shipped: r.before.hex, identity: r.after.hex,
        dE: r4(oklabDist({ L: r.before.L, C: r.before.C, H: r.before.H }, { L: r.after.L, C: r.after.C, H: r.after.H })),
      })),
      shiftHisto: Object.fromEntries(HS.map(h => [h, r2(Math.max(...rs.filter(r => r.nom.H === h).map(r => r.shiftDeg)))])),
    },
    otherRiders: {
      wash19Invariant: { maxDE: r4(Math.max(...rs.map(r => r.ctaOffDark19MaxDE))) },
      ink11: { maxDH: r2(Math.max(...rs.map(r => r.ink11.dH))), maxDE: r4(Math.max(...rs.map(r => r.ink11.dE))) },
      ink12: { maxDH: r2(Math.max(...rs.map(r => r.ink12.dH))), maxDE: r4(Math.max(...rs.map(r => r.ink12.dE))) },
      paper0: { maxDH: r2(Math.max(...rs.map(r => r.p0.dH))), maxDE: r4(Math.max(...rs.map(r => r.p0.dE))) },
    },
    washFate: {
      underBarOn: cnt(r => r.wash.on.dE < HARD_BAR),
      underBarCtaOff: cnt(r => r.wash.ctaOff.dE < HARD_BAR),
      underBarAllOff: cnt(r => r.wash.supOff.dE < HARD_BAR),
      minOn: r4(Math.min(...rs.map(r => r.wash.on.dE))),
      minCtaOff: r4(Math.min(...rs.map(r => r.wash.ctaOff.dE))),
      minAllOff: r4(Math.min(...rs.map(r => r.wash.supOff.dE))),
      lightUnderOn: cnt(r => r.wash.light.on < HARD_BAR),
      lightUnderSupOff: cnt(r => r.wash.light.supOff < HARD_BAR),
    },
    q4: {
      firedIdentity: fired.length,
      firedRegion: fired.map(r => ({ hex: r.hex, nom: r.nom, dGate: r.after.dGate, exit: r.exit })),
      exitDL: fired.filter(r => r.exit).map(r => r.exit!.dL),
    },
  }
}
const summary = { grid: { HS, CS, LS }, bars: { TYPE2_BAR, G, HARD_BAR, P2_D_UP }, wcag: sum('wcag'), apca: sum('apca') }
writeFileSync('scripts/c12-session/coolreddark-sweep.json', JSON.stringify({ summary, rows }, null, 1))

for (const lane of ['wcag', 'apca'] as const) {
  const s = summary[lane]
  console.log(`\n== ${lane} (${s.cells} cells) mirrorFail ${s.mirror.fail} gsDarkFail ${s.mirror.gsDarkFail}`)
  console.log(`  ctaDark vs redDark  before: <0.10 ${s.ctaVsRedDark.before.under010} · inGate ${s.ctaVsRedDark.before.inGate} · minGate ${s.ctaVsRedDark.before.minGate}`)
  console.log(`                      after : <0.10 ${s.ctaVsRedDark.after.under010} · inGate ${s.ctaVsRedDark.after.inGate} · minGate ${s.ctaVsRedDark.after.minGate}`)
  s.ctaVsRedDark.worstAfter.slice(0, 4).forEach(w => console.log(`    worst ${w.hex} nomH${w.nom.H} C${w.nom.C} L${w.nom.L} gate ${w.dGate} ok ${w.dOk} cta ${w.ctaHex}`))
  console.log(`  riders: wash1-9 maxΔE ${s.otherRiders.wash19Invariant.maxDE} · ink11 dH≤${s.otherRiders.ink11.maxDH} ΔE≤${s.otherRiders.ink11.maxDE} · ink12 dH≤${s.otherRiders.ink12.maxDH} ΔE≤${s.otherRiders.ink12.maxDE} · p0 dH≤${s.otherRiders.paper0.maxDH} ΔE≤${s.otherRiders.paper0.maxDE}`)
  console.log(`  dark wash vs red: under.006 on ${s.washFate.underBarOn} / ctaOff ${s.washFate.underBarCtaOff} / allOff ${s.washFate.underBarAllOff} · min ${s.washFate.minOn} / ${s.washFate.minCtaOff} / ${s.washFate.minAllOff}`)
  console.log(`  light wash vs red under.006: shipped ${s.washFate.lightUnderOn} / redShiftOff ${s.washFate.lightUnderSupOff}`)
  console.log(`  Q4 identity-fired: ${s.q4.firedIdentity} cells; exit ΔL ${s.q4.exitDL.length ? Math.min(...s.q4.exitDL) + '…' + Math.max(...s.q4.exitDL) : '—'}`)
}
console.log(`\nJSON → scripts/c12-session/coolreddark-sweep.json (${rows.length} rows)`)
