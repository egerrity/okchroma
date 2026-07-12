// c12-proposal-sim2.ts — DEEP SESSION sim v2 (post-panel, 2026-07-10 night).
// Fixes every panel blocker: REAL pipeline geometry (resolveBrand's exact floor opts, apca
// enforce Lc75 map, brand dark floor 0.70 + darkChromaCurve + coolRedDark), mirror VALIDATED
// byte-vs-resolveBrand on unfired seeds, hover-inclusive release, per-lane text law (apca
// dual-bar 60/75 fork; wcag chosen-pole 4.5), consent-fixed regions (box lLo 0.50 honors her
// L0.45 all-dark; variant floor 0.45 = her recorded floor; box on NOMINAL seed C), declared
// variant side rule (no nearest-wins flip), one D = 0.12, honest per-slice reproduction.
import { writeFileSync } from 'fs'
import { Helmlab } from 'helmlab'
import { resolveBrand, signalScalesFor } from '/Users/emilygerrity/okchroma/src/engine/resolve'
import { darkChromaCurve } from '/Users/emilygerrity/okchroma/src/engine/darkChromaCurve'
import { DARK_BRAND_FILL_MIN_L } from '/Users/emilygerrity/okchroma/src/engine/stopTable'
import { hoverL } from '/Users/emilygerrity/okchroma/src/engine/archetypes'
import { redGateDist, RED_GATE } from '/Users/emilygerrity/okchroma/src/engine/colorMath'
import {
  buildContext, buildDarkContext, onFillIsWhiteLight, onFillIsWhiteDarkAt,
  ctaLightL, ctaLightLApca, ctaDarkEnforcedL, ctaDarkEnforcedLApca, whiteTextLcAt, apcaYAt,
} from '/Users/emilygerrity/okchroma/src/reqtoken/producers'
import { clampChromaToGamut, oklchToLinearRgb, apcaLc } from '/Users/emilygerrity/okchroma/src/engine/constraints'
import type { ContrastProfile } from '/Users/emilygerrity/okchroma/src/engine/colorEngine'

const hl = new Helmlab()
type P = { L: number; C: number; H: number }
const lin = (p: P) => oklchToLinearRgb(p.L, clampChromaToGamut(p.L, p.C, p.H), p.H)
const hx = (p: P) => {
  const [rl, gl, bl] = lin(p)
  const gm = (v: number) => { const x = Math.min(1, Math.max(0, v)); return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055 }
  const ch = (v: number) => Math.round(gm(v) * 255).toString(16).padStart(2, '0')
  return `#${ch(rl)}${ch(gl)}${ch(bl)}`
}
const diff = (a: P, b: P) => hl.difference(hx(a), hx(b))
const bLcAt = (p: P) => Math.abs(apcaLc(apcaYAt(0, 0, 0), apcaYAt(p.L, clampChromaToGamut(p.L, p.C, p.H), p.H)))
const wLcAt = (p: P) => whiteTextLcAt(p.L, clampChromaToGamut(p.L, p.C, p.H), p.H)
const bestLc = (p: P) => Math.max(wLcAt(p), bLcAt(p))
// wcag: relative-luminance ratio for the better pole
const relLum = (p: P) => { const [r, g, b] = lin(p).map(v => Math.min(1, Math.max(0, v))); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
const wcagBest = (p: P) => { const y = relLum(p); return Math.max((1.05) / (y + 0.05), (y + 0.05) / 0.05) }

// ── knobs (v2) ───────────────────────────────────────────────────────────────────────
const G = RED_GATE.G, REL = G + 0.005
// P2: 0.12 down/variant (her down-marks 0.126-0.133); 0.11 UP — not the scarier-asymmetry
// (categorical, lives in the gate) but DEAD-ZONE GEOMETRY: 0.12-up lands L0.72+ (no text
// pole); 0.11 = her up-mark mean (0.112) and lands before the zone.
const D = 0.12, D_UP = 0.11
const BOX = { hLo: 20, hHi: 44, cMin: 0.18, lLo: 0.50, lHi: 0.62 }   // lLo 0.50 honors L0.45 all-dark
const VAR_LO = 0.45                          // her recorded error floor
const DEEP_PIVOT = 0.50

// ── real-pipeline base ctas (resolveBrand's exact floor opts; validated below) ────────
const FLOOR = (profile: ContrastProfile) => ({
  darkFillMinL: DARK_BRAND_FILL_MIN_L, enforceOnFillContrast: true, coolRedDark: true,
  darkChromaCurve, highlight: true, contrastProfile: profile,
})
const baseCtas = (hex: string, profile: ContrastProfile) => {
  const apca = profile === 'apca'
  const ctx = buildContext(hex, FLOOR(profile) as any)
  const white = onFillIsWhiteLight(ctx, apca ? false : true)
  const lightL = apca ? ctaLightLApca(ctx, white, true, 60) : ctaLightL(ctx, white, true)   // Lc 60 = her on-cta spec (typo-corrected)
  const cFor = (L: number) => ctx.cAt('light', L, ctx.brandC)
  const light: P = { L: lightL, C: cFor(lightL), H: ctx.brandH }
  const d = buildDarkContext(ctx)
  const dFor = (L: number) => ctx.cAt('dark', L, d.darkC9)
  const dBase: P = { L: d.dark9L, C: dFor(d.dark9L), H: ctx.darkH }
  const dWhite = onFillIsWhiteDarkAt(dBase.L, dBase.C, dBase.H, apca ? false : true)
  const enf = apca ? ctaDarkEnforcedLApca(ctx, dBase, dWhite, true, 60) : ctaDarkEnforcedL(ctx, dBase, dWhite, true)
  const dark: P = enf !== null ? { L: enf, C: dFor(enf), H: ctx.darkH } : dBase
  return { ctx, light, dark, cFor, dFor }
}

// ── mirror validation: unfired seeds must byte-match resolveBrand ─────────────────────
console.log('=== mirror validation (unfired seeds, cta + ctaDark hex vs resolveBrand) ===')
let mm = 0, mv = 0
for (const profile of ['apca', 'wcag'] as ContrastProfile[]) {
  for (const [H, C, L] of [[140, 0.12, 0.55], [220, 0.1, 0.6], [260, 0.15, 0.5], [90, 0.1, 0.7], [300, 0.12, 0.45], [180, 0.08, 0.65]] as const) {
    const seed = hx({ L, C, H })
    const r = resolveBrand(seed, 'v', { contrastProfile: profile })
    if (r.redRepel) continue
    const m = baseCtas(seed, profile)
    mv++
    const okL = hx(r.scale.cta as P) === hx(m.light), okD = hx(r.scale.ctaDark as P) === hx(m.dark)
    if (!okL || !okD) { mm++; console.log(`  MISMATCH ${profile} ${seed}: pipeline ${hx(r.scale.cta as P)}/${hx(r.scale.ctaDark as P)} vs mirror ${hx(m.light)}/${hx(m.dark)}`) }
  }
}
console.log(`  ${mv - mm}/${mv} match${mm ? ' — MIRROR INVALID, numbers below unsafe' : ' — mirror faithful'}`)

// ── conditions — HOVER POLICY is an owner fork, so the whole sim runs per policy ──────
// strict: hover holds full release+P2 · fire: hover only stays out of the FIRE gate ·
// rest: rest-state only (v5-shipped behavior — hover proximity reported, unasserted)
type Policy = 'strict' | 'fire' | 'rest'
let POLICY: Policy = 'rest'
const hovP = (p: P, cFor: (L: number) => number): P => ({ L: hoverL(p.L), C: cFor(hoverL(p.L)), H: p.H })
const clears = (p: P, anchor: P, cFor: (L: number) => number, bar = D) => {
  if (redGateDist(p, anchor) < REL || diff(p, anchor) < bar) return false
  if (POLICY === 'rest') return true
  const h = hovP(p, cFor)
  if (POLICY === 'fire') return redGateDist(h, anchor) >= G
  return redGateDist(h, anchor) >= REL && diff(h, anchor) >= bar
}
// pair check for variant-vs-brand: policy-consistent on BOTH hovers
let varBar = D
const pairOk = (v: P, brand: P, vFor: (L: number) => number, bFor: (L: number) => number) => {
  if (redGateDist(brand, v) < REL || diff(brand, v) < varBar) return false
  if (POLICY === 'rest') return true
  const hb = hovP(brand, bFor), hv = hovP(v, vFor)
  if (POLICY === 'fire') return redGateDist(hb, v) >= G && redGateDist(hv, brand) >= G
  return redGateDist(hb, v) >= REL && diff(hb, v) >= varBar && redGateDist(hv, brand) >= REL && diff(hv, brand) >= varBar
}
const textOk = (p: P, profile: ContrastProfile, bar: number) =>
  profile === 'apca' ? bestLc(p) >= bar : wcagBest(p) >= 4.5

// self-move: direction fixed by class; accept first position clearing gate+P2 at rest AND hover
const selfMove = (base: P, cFor: (L: number) => number, red: P, up: boolean) => {
  const bar = up ? D_UP : D
  for (let L = base.L; up ? L <= 0.96 : L >= 0.04; L += up ? 0.005 : -0.005) {
    const p: P = { L, C: cFor(L), H: base.H }
    if (clears(p, red, cFor, bar)) return p
  }
  return null
}
// dark dust: same L, chroma down; hover rides same L family
const darkDust = (base: P, dFor: (L: number) => number, red: P) => {
  for (let C = base.C; C >= 0.02; C -= 0.004) {
    const p: P = { L: base.L, C: clampChromaToGamut(base.L, C, base.H), H: base.H }
    const cConst = (_: number) => p.C
    if (clears(p, red, cConst)) return p
  }
  return null
}
// variant: declared side rule (brand at/above red -> DEEP; below -> LIGHT), domain floor 0.45,
// per-lane light cap; conditions vs brand incl BOTH hovers
let redCtxCache: Record<string, any> = {}
const variantFor = (brand: P, profile: ContrastProfile, red: P, brandCFor: (L: number) => number) => {
  const key = profile
  if (!redCtxCache[key]) redCtxCache[key] = buildContext(signalScalesFor(profile).get('red')!.def.hex, FLOOR(profile) as any)
  const rctx = redCtxCache[key]
  const vFor = (L: number) => rctx.cAt('light', L, rctx.brandC)
  const deepFirst = brand.L >= red.L
  const mk = (L: number): P => ({ L, C: vFor(L), H: rctx.brandH })
  // per-lane light cap: apca = Lc60 white boundary; wcag = white 4.5 boundary
  let cap = 0.70
  for (let L = 0.55; L <= 0.72; L += 0.002) {
    const p = mk(L)
    const pass = profile === 'apca' ? wLcAt(p) >= 60 : (1.05 / (relLum(p) + 0.05)) >= 4.5
    if (pass) cap = L; else break
  }
  const scan = (los: number, his: number, step: number): P | null => {
    for (let L = los; step > 0 ? L <= his : L >= his; L += step) {
      const v = mk(L)
      if (pairOk(v, brand, vFor, brandCFor)) return v
    }
    return null
  }
  const deep = () => scan(red.L, VAR_LO, -0.005)
  const lightv = () => scan(red.L, cap, 0.005)
  let first = deepFirst ? deep() : lightv()
  let second = deepFirst ? lightv() : deep()
  let fell = false
  if (!first && !second) {
    // fallback bar 0.115 = her mean mark (recorded precedent) for domain-trapped brands
    varBar = 0.115; fell = true
    first = deepFirst ? deep() : lightv()
    second = deepFirst ? lightv() : deep()
    varBar = D
  }
  return { v: first ?? second, side: first ? (deepFirst ? 'deep' : 'light') : (second ? (deepFirst ? 'light' : 'deep') : null), cap, fell }
}

// ── grid ──────────────────────────────────────────────────────────────────────────────
const HS = [344, 352, 0, 8, 16, 24, 32, 40, 48, 56, 64, 72]
const CS = [0.04, 0.08, 0.12, 0.16, 0.20, 0.22]
const LS = [0.30, 0.35, 0.40, 0.45, 0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80]
const inBox = (H: number, C: number, L: number, lHi: number) => {
  const h = (H + 360) % 360
  return h >= BOX.hLo && h <= BOX.hHi && C >= BOX.cMin - 1e-9 && L >= BOX.lLo && L <= lHi
}

type Row = any
const runPolicy = (policy: Policy) => {
POLICY = policy
const rows: Row[] = []
const summary: Record<string, number> = {}
let insideAfter = 0, underP2 = 0, unreach = 0
const bars = { light60: 0, light75: 0, dark60: 0, dark75: 0, wcagIllegal: 0, nLight: 0, nDark: 0 }
const variantSides: Record<string, number> = {}
for (const profile of ['apca', 'wcag'] as ContrastProfile[]) {
  const red = signalScalesFor(profile).get('red')!.scale
  const redL = red.cta as P, redD = red.ctaDark as P
  for (const H of HS) for (const C of CS) for (const L of LS) {
    const seedHex = hx({ L, C: clampChromaToGamut(L, C, H), H })
    const { light, dark, cFor, dFor } = baseCtas(seedHex, profile)
    const firedL = redGateDist(light, redL) <= G
    const firedD = redGateDist(dark, redD) <= G
    if (!firedL && !firedD) continue
    const core = inBox(H, C, L, BOX.lHi)         // NOMINAL seed C (gamut-hole fix)
    const cls = core ? 'red-move' : (L < DEEP_PIVOT ? 'self-down' : 'self-up')
    const row: Row = { seed: seedHex, H, C, L, profile, fired: { light: firedL, dark: firedD }, cls, core58: inBox(H, C, L, 0.58) }
    if (firedL) {
      if (cls === 'red-move') {
        const { v, side, cap, fell } = variantFor(light, profile, redL, cFor)
        if (!v) { row.unreachable = 'variant'; unreach++ } else {
          variantSides[side!] = (variantSides[side!] ?? 0) + 1
          if (fell) variantSides['fallback115'] = (variantSides['fallback115'] ?? 0) + 1
          row.light = { base: light, variant: v, side, cap, fell, gate: redGateDist(light, v), p2: diff(light, v), vLc: bestLc(v), vLc75: bestLc(v) >= 75, vWcag: wcagBest(v) }
        }
      } else {
        const t = selfMove(light, cFor, redL, cls === 'self-up')
        if (!t) { row.unreachable = 'light'; unreach++ } else {
          bars.nLight++
          const lc = bestLc(t)
          if (lc >= 60) bars.light60++
          if (lc >= 75) bars.light75++
          if (profile === 'wcag' && wcagBest(t) < 4.5) bars.wcagIllegal++
          row.light = { base: light, treated: t, dL: t.L - light.L, gate: redGateDist(t, redL), p2: diff(t, redL), lc, wcagRatio: wcagBest(t) }
        }
      }
    }
    if (firedD) {
      const r2 = darkDust(dark, dFor, redD)
      if (!r2) { row.unreachable = (row.unreachable ? row.unreachable + '+' : '') + 'dark'; unreach++ } else {
        bars.nDark++
        const lc = bestLc(r2)
        if (lc >= 60) bars.dark60++
        if (lc >= 75) bars.dark75++
        row.dark = { base: dark, treated: r2, dC: r2.C - dark.C, gate: redGateDist(r2, redD), p2: diff(r2, redD), lc, wcagRatio: wcagBest(r2) }
      }
    }
    // per-bar assert: up rows solved to D_UP; variant fallback rows to 0.115; rest to D
    const rowBar = (r: any, isLight: boolean) =>
      isLight && cls === 'self-up' ? D_UP : (isLight && r.light?.fell ? 0.115 : D)
    for (const [side, isLight] of [[row.light, true], [row.dark, false]] as const) {
      if (!side) continue
      if (side.gate !== undefined && side.gate < REL - 1e-6) insideAfter++
      if (side.p2 !== undefined && side.p2 < rowBar(row, isLight) - 1e-6) underP2++
    }
    summary[`${profile}|${cls}`] = (summary[`${profile}|${cls}`] ?? 0) + 1
    rows.push(row)
  }
}
return { rows, summary, bars, variantSides, insideAfter, underP2, unreach }
}

// ── honest ruling reproduction (rendered-cta space, per slice) ───────────────────────
console.log('\n=== ruling reproduction (RENDERED ctas, apca, per slice — no escapes counted) ===')
const redA = signalScalesFor('apca').get('red')!.scale.cta as P
for (const [slice, want] of [[0.45, 'self-down'], [0.55, 'self-up'], [0.65, 'self-up']] as const) {
  let fired = 0, match = 0, redmove = 0
  for (const H of HS) for (const C of CS) {
    const seedHex = hx({ L: slice, C: clampChromaToGamut(slice, C, H), H })
    const { light } = baseCtas(seedHex, 'apca')
    if (redGateDist(light, redA) > G) continue
    fired++
    const core = inBox(H, C, slice, BOX.lHi)
    const cls = core ? 'red-move' : (slice < DEEP_PIVOT ? 'self-down' : 'self-up')
    if (cls === want) match++
    if (cls === 'red-move') redmove++
  }
  console.log(`  L${slice}: fired ${fired} · matches her ruling ${match} · red-move (her instinct, labeled) ${redmove} · other ${fired - match - redmove}`)
}

// ── THE POLICY MATRIX (the owner's two forks, with numbers) ─────────────────────────
console.log('\n=== POLICY MATRIX (hover policy × text bar) ===')
const out: Record<string, any> = {}
for (const policy of ['rest', 'fire', 'strict'] as Policy[]) {
  const r = runPolicy(policy)
  out[policy] = r
  const vs = r.rows.filter((x: Row) => x.light?.variant)
  const vls = vs.map((x: Row) => x.light.variant.L).sort((a: number, b: number) => a - b)
  const dust = r.rows.filter((x: Row) => x.dark?.treated)
  const dcs = dust.map((x: Row) => x.dark.dC).sort((a: number, b: number) => a - b)
  const alt = r.rows.filter((x: Row) => x.cls === 'red-move' && !x.core58).length
  console.log(`-- hover=${policy}: populations ${JSON.stringify(r.summary)}`)
  console.log(`   inside-gate ${r.insideAfter} · underP2 ${r.underP2} · unreachable ${r.unreach}`)
  console.log(`   light text >=60: ${r.bars.light60}/${r.bars.nLight} · >=75: ${r.bars.light75}/${r.bars.nLight} · wcag<4.5: ${r.bars.wcagIllegal}`)
  console.log(`   dark text >=60: ${r.bars.dark60}/${r.bars.nDark} · >=75: ${r.bars.dark75}/${r.bars.nDark} · dust median ${dcs.length ? dcs[Math.floor(dcs.length / 2)].toFixed(3) : '-'} (n ${dust.length})`)
  console.log(`   variants: served ${vs.length} · sides ${JSON.stringify(r.variantSides)} · L ${vls.length ? `${vls[0].toFixed(2)}..${vls[vls.length - 1].toFixed(2)}` : '-'} · lHi-only red-moves ${alt}`)
}
writeFileSync('/Users/emilygerrity/okchroma/scripts/c12-session/proposal-sim2.json', JSON.stringify({
  knobs: { G, REL, D, BOX, VAR_LO, DEEP_PIVOT, enforceLcApca: 75, textBarFork: [60, 75], hoverPolicies: ['rest', 'fire', 'strict'] },
  matrix: Object.fromEntries(Object.entries(out).map(([k, v]: [string, any]) => [k, { summary: v.summary, bars: v.bars, variantSides: v.variantSides, unreach: v.unreach }])),
  rows: out['rest'].rows,   // rest = v5-shipped hover behavior, the recommended default's rows
}, null, 1))
console.log('rows (hover=rest) -> scripts/c12-session/proposal-sim2.json')
