// c12-proposal-sim.ts — DEEP SESSION Phase C (2026-07-10): simulate the two-problem proposal
// (proposal-draft.md) with ZERO engine edits. Base ctas via the resolver's own producer calls
// (pre-repel mirror of reqtoken/resolve.ts light/dark cta blocks); treatments computed
// script-side; helmlab = the P2 metric (owner-cleared for collisions).
// Outputs: console summary + proposal-sim.json (exhibit input).
import { writeFileSync } from 'fs'
import { Helmlab } from 'helmlab'
import { signalScalesFor } from '/Users/emilygerrity/okchroma/src/engine/resolve'
import { SIGNALS } from '/Users/emilygerrity/okchroma/src/engine/signals'
import { redGateDist, RED_GATE } from '/Users/emilygerrity/okchroma/src/engine/colorMath'
import {
  buildContext, buildDarkContext, onFillIsWhiteLight, onFillIsWhiteDarkAt,
  ctaLightL, ctaLightLApca, ctaDarkEnforcedL, ctaDarkEnforcedLApca, whiteTextLcAt, apcaYAt,
} from '/Users/emilygerrity/okchroma/src/reqtoken/producers'
import { clampChromaToGamut, oklchToLinearRgb, apcaLc } from '/Users/emilygerrity/okchroma/src/engine/constraints'
import type { ContrastProfile } from '/Users/emilygerrity/okchroma/src/engine/colorEngine'

const hl = new Helmlab()
const hx = (L: number, C: number, H: number) => {
  const c = clampChromaToGamut(L, C, H)
  const [rl, gl, bl] = oklchToLinearRgb(L, c, H)
  const gm = (v: number) => { const x = Math.min(1, Math.max(0, v)); return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055 }
  const ch = (v: number) => Math.round(gm(v) * 255).toString(16).padStart(2, '0')
  return `#${ch(rl)}${ch(gl)}${ch(bl)}`
}
const bLcAt = (L: number, C: number, H: number) => Math.abs(apcaLc(apcaYAt(0, 0, 0), apcaYAt(L, C, H)))
type P = { L: number; C: number; H: number }
const pHex = (p: P) => hx(p.L, p.C, p.H)
const diff = (a: P, b: P) => hl.difference(pHex(a), pHex(b))

// ── declared knobs (proposal-draft.md) ─────────────────────────────────────────────
const G = RED_GATE.G                    // fire radius (her fit, v7-confirmed)
const REL = G + 0.005                   // P1 release floor
const D_UP = 0.11, D_DOWN = 0.13, D_VARIANT = 0.12   // P2 (helmlab, her ladder marks)
const DEEP_PIVOT = 0.50
// identity-keep region (v1.2): her error-core checks + lHi extended 0.58->0.62 so the vivid
// L0.60 reds (unruled slice; self-up would strand them in the dead zone) keep identity and
// the RED moves. 0.62 stays below her L0.65 "all light" ruling. Flagged for her veto.
const CORE = { hLo: 20, hHi: 44, cMin: 0.18, lLo: 0.42, lHi: 0.62 }
const VAR_L_LO = 0.60, VAR_L_PREF = 0.70, VAR_L_MAX = 0.76            // red-move latitude

const inCore = (p: P) => {
  const h = ((p.H + 360) % 360)
  const hOk = h >= CORE.hLo && h <= CORE.hHi
  return hOk && p.C >= CORE.cMin - 1e-9 && p.L >= CORE.lLo && p.L <= CORE.lHi
}

// ── base (untreated) ctas — mirror of the resolver's pre-repel cta blocks ──────────
const baseCtas = (hex: string, profile: ContrastProfile) => {
  const apca = profile === 'apca'
  const ctx = buildContext(hex, { contrastProfile: profile, enforceOnFillContrast: true } as any)
  const white = onFillIsWhiteLight(ctx, apca ? false : true)
  const lightL = apca ? ctaLightLApca(ctx, white, true, 60) : ctaLightL(ctx, white, true)
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

// ── treatments ─────────────────────────────────────────────────────────────────────
// self-move: exit along L until P1 released AND P2 distinct (max of the two solves)
const selfMove = (base: P, cFor: (L: number) => number, red: P, up: boolean) => {
  const dp2 = up ? D_UP : D_DOWN
  for (let L = base.L; up ? L <= 0.96 : L >= 0.04; L += up ? 0.005 : -0.005) {
    const p: P = { L, C: cFor(L), H: base.H }
    if (redGateDist(p, red) >= REL && diff(p, red) >= dp2) return p
  }
  return null   // unreachable — reported loud
}
// dark de-confliction v1.5 (owner eye 2026-07-10: P1-release-only dark "doesn't de-conflict
// anymore"): DUST — chroma down at SAME L until gate release AND P2. Probe: passes all bars
// with margin across the anchor population while preserving prominence (L unchanged — the
// floor-yield fork dissolves) and hue. Echoes the deleted muted-dark-collider instinct.
// Fallback for dust-unreachable: L-move (up) with both bars.
let darkDustFallbacks = 0
const darkTreat = (base: P, dFor: (L: number) => number, red: P) => {
  for (let C = base.C; C >= 0.03; C -= 0.004) {
    const p: P = { L: base.L, C: clampChromaToGamut(base.L, C, base.H), H: base.H }
    if (redGateDist(p, red) >= REL && diff(p, red) >= D_VARIANT) return { p, via: 'dust' as const }
  }
  for (let L = base.L; L <= 0.96; L += 0.005) {
    const p: P = { L, C: dFor(L), H: base.H }
    if (redGateDist(p, red) >= REL && diff(p, red) >= D_VARIANT) { darkDustFallbacks++; return { p, via: 'lift' as const } }
  }
  return null
}
// red-move v1.3: variant domain = the whole ERROR-ELIGIBLE range along red's hue —
// her core (L 0.42-0.58, go-to error picks) + lighter edge tier, hard-capped at the
// white-text boundary (~0.70). Pick the candidate NEAREST to canonical red satisfying
// brand-vs-variant P1 release + P2 distinctness. Brands at the core's top get a DEEP
// variant (L~0.44-0.50) instead of a dead-zone one.
const redHex = SIGNALS.find(s => s.name === 'red')!.hex
const VAR_DOM_LO = 0.42, VAR_DOM_HI = 0.70   // = her core lLo … white-text boundary
let variantFallbacks = 0
const redMove = (brand: P, profile: ContrastProfile, redCtaL: number) => {
  const rctx = buildContext(redHex, { contrastProfile: profile, enforceOnFillContrast: true } as any)
  const vFor = (L: number) => rctx.cAt('light', L, rctx.brandC)
  const cands: number[] = []
  for (let L = VAR_DOM_LO; L <= VAR_DOM_HI + 1e-9; L += 0.005) cands.push(L)
  cands.sort((a, b) => Math.abs(a - redCtaL) - Math.abs(b - redCtaL))
  // primary P2 bar 0.12; fallback = 0.115 (her measured mean) for domain-trapped brands
  for (const bar of [D_VARIANT, 0.115]) {
    for (const L of cands) {
      const v: P = { L, C: vFor(L), H: rctx.brandH }
      if (whiteTextLcAt(v.L, v.C, v.H) < 60) continue
      if (redGateDist(brand, v) >= REL && diff(brand, v) >= bar) {
        if (bar !== D_VARIANT) variantFallbacks++
        return v
      }
    }
  }
  return null
}

// ── grid ───────────────────────────────────────────────────────────────────────────
const HS = [344, 352, 0, 8, 16, 24, 32, 40, 48, 56, 64, 72]
const CS = [0.04, 0.08, 0.12, 0.16, 0.20, 0.22]
const LS = [0.30, 0.35, 0.40, 0.45, 0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80]

type Row = {
  seed: string; H: number; C: number; L: number; profile: string
  fired: { light: boolean; dark: boolean }; cls: 'none' | 'self-up' | 'self-down' | 'red-move'
  light?: { base: P; treated?: P; variant?: P; dL?: number; gate?: number; p2?: number; wLc?: number; bLc?: number }
  dark?: { base: P; treated?: P; dL?: number; dC?: number; via?: string; gate?: number; p2?: number; belowFloor?: boolean; wLc?: number; bLc?: number }
  unreachable?: string
}
const rows: Row[] = []
const summary: Record<string, number> = {}
let insideAfter = 0, underP2 = 0, subBarText = 0, unreachable = 0
const variantNeeds: number[] = []

for (const profile of ['apca', 'wcag'] as ContrastProfile[]) {
  const red = signalScalesFor(profile).get('red')!.scale
  const redL: P = red.cta, redD: P = red.ctaDark
  for (const H of HS) for (const C of CS) for (const L of LS) {
    const seedHex = hx(L, C, H)
    const { light, dark, cFor, dFor } = baseCtas(seedHex, profile)
    const firedL = redGateDist(light, redL) <= G
    const firedD = redGateDist(dark, redD) <= G
    if (!firedL && !firedD) continue
    // class is brand-level: error-core membership judged on the brand's IDENTITY (seed) —
    // "could this brand's color BE the error" — plus its light cta (either qualifies)
    const seedP: P = { L, C: clampChromaToGamut(L, C, H), H }
    const core = inCore(seedP) || inCore(light)
    const cls: Row['cls'] = core ? 'red-move' : (L < DEEP_PIVOT ? 'self-down' : 'self-up')
    const row: Row = { seed: seedHex, H, C, L, profile, fired: { light: firedL, dark: firedD }, cls }
    // HYBRID DARK (v1.1): the variant is LIGHT-mode machinery only. In dark, EVERY fired
    // brand gets the standard self-move in dark geometry (dark derives — her rule): delivery
    // = P1 release only (dark P2 uncalibrated by design — measured + reported, not enforced).
    // Dark direction: up for everyone at/above the anchor (prominence-louder); the deep
    // self-down class keeps down (the floor-yield fork, counted).
    if (cls === 'red-move') {
      const v = redMove(light, profile, redL.L)
      if (!v) { row.unreachable = 'variant'; unreachable++ } else {
        variantNeeds.push(v.L)
        row.light = { base: light, variant: v, gate: redGateDist(light, v), p2: diff(light, v), wLc: whiteTextLcAt(v.L, v.C, v.H), bLc: bLcAt(v.L, v.C, v.H) }
      }
    } else {
      const up = cls === 'self-up'
      if (firedL) {
        const t = selfMove(light, cFor, redL, up)
        if (!t) { row.unreachable = 'light'; unreachable++ } else {
          row.light = { base: light, treated: t, dL: t.L - light.L, gate: redGateDist(t, redL), p2: diff(t, redL), wLc: whiteTextLcAt(t.L, t.C, t.H), bLc: bLcAt(t.L, t.C, t.H) }
          if (Math.max(row.light.wLc!, row.light.bLc!) < 60) subBarText++
        }
      }
    }
    if (firedD) {
      const r = darkTreat(dark, dFor, redD)
      if (!r) { row.unreachable = (row.unreachable ? row.unreachable + '+' : '') + 'dark'; unreachable++ } else {
        const t = r.p
        row.dark = { base: dark, treated: t, dL: t.L - dark.L, dC: t.C - dark.C, via: r.via, gate: redGateDist(t, redD), p2: diff(t, redD), wLc: whiteTextLcAt(t.L, t.C, t.H), bLc: bLcAt(t.L, t.C, t.H) }
      }
    }
    // post-treatment asserts: gate release + P2 enforced BOTH modes (v1.5)
    for (const side of [row.light, row.dark]) {
      if (!side) continue
      if (side.gate !== undefined && side.gate < REL - 1e-6) insideAfter++
      if (side.p2 !== undefined && side.p2 < Math.min(D_UP, D_DOWN, D_VARIANT) - 1e-6) underP2++
    }
    summary[`${profile}|${cls}`] = (summary[`${profile}|${cls}`] ?? 0) + 1
    rows.push(row)
  }
}

// ── ruling reproduction ─────────────────────────────────────────────────────────────
console.log('=== ruling reproduction (her marked cells, apca) ===')
const redA = signalScalesFor('apca').get('red')!.scale.cta
const cellCls = (H: number, C: number, L: number) => {
  const p: P = { L, C: clampChromaToGamut(L, C, H), H }
  if (redGateDist(p, redA) > G) return 'no-fire'
  return inCore(p) ? 'red-move' : (L < DEEP_PIVOT ? 'self-down' : 'self-up')
}
// L0.45 all-dark (non-core must be self-down); L0.55/0.65 fired => self-up or red-move
let dirOk = 0, dirMap: string[] = []
for (const [L, want] of [[0.45, 'self-down'], [0.55, 'self-up'], [0.65, 'self-up']] as const) {
  for (const H of HS) for (const C of CS) {
    const c = cellCls(H, C, L)
    if (c === 'no-fire') continue
    const ok = c === want || c === 'red-move'
    if (ok) dirOk++
    dirMap.push(`${ok ? 'ok' : 'MISMATCH'} H${H} C${C} L${L}: ${c}${c === 'red-move' ? ' (superseded by her red-move instinct)' : ''}`)
  }
}
const mismatches = dirMap.filter(s => s.startsWith('MISMATCH'))
console.log(`direction consistency: ${dirOk}/${dirMap.length} cells consistent; mismatches: ${mismatches.length}`)
mismatches.forEach(m => console.log('  ' + m))

console.log('\n=== populations ===')
for (const [k, v] of Object.entries(summary)) console.log(`  ${k}: ${v}`)
console.log(`\n=== asserts ===`)
console.log(`  post-treatment inside gate: ${insideAfter} (must be 0)`)
console.log(`  post-treatment under P2: ${underP2} (must be 0)`)
console.log(`  sub-bar text on self-moved light ctas: ${subBarText} (dead-zone check)`)
console.log(`  unreachable solves: ${unreachable}`)
if (variantNeeds.length) {
  variantNeeds.sort((a, b) => a - b)
  const q = (f: number) => variantNeeds[Math.floor(f * (variantNeeds.length - 1))]
  console.log(`  variant L needed: min ${q(0).toFixed(3)} · median ${q(0.5).toFixed(3)} · p90 ${q(0.9).toFixed(3)} · max ${q(1).toFixed(3)} (white-text boundary ~0.70; her hard edge 0.75)`)
  console.log(`  variants past 0.70 (black-text question): ${variantNeeds.filter(v => v > 0.7005).length}/${variantNeeds.length}`)
  const vLcs = rows.filter(r => r.light?.variant).map(r => Math.max(r.light!.wLc!, r.light!.bLc!))
  console.log(`  variant best text pole Lc: min ${Math.min(...vLcs).toFixed(1)} (>=60 means the black-text question dissolves)`)
  console.log(`  variant P2 fallbacks to 0.115 (her mean): ${variantFallbacks}`)
}
const darkP2s = rows.map(r => r.dark?.p2).filter((x): x is number => x !== undefined).sort((a, b) => a - b)
if (darkP2s.length) console.log(`  dark P2 (ENFORCED v1.5): min ${darkP2s[0].toFixed(3)} · median ${darkP2s[Math.floor(darkP2s.length / 2)].toFixed(3)}`)
const dCs = rows.map(r => r.dark?.dC).filter((x): x is number => x !== undefined && x < 0).sort((a, b) => a - b)
if (dCs.length) console.log(`  dark dust dC: deepest ${dCs[0].toFixed(3)} · median ${dCs[Math.floor(dCs.length / 2)].toFixed(3)} · dust rows ${dCs.length} · lift fallbacks ${darkDustFallbacks}`)
const darkSub = rows.filter(r => r.dark?.treated && Math.max(r.dark.wLc ?? 99, r.dark.bLc ?? 99) < 60).length
console.log(`  dark treated sub-bar text: ${darkSub}`)
// core-box lHi sensitivity: would lHi 0.62 reclassify the light sub-bar cells to red-move?
const subRows = rows.filter(r => r.light?.treated && Math.max(r.light.wLc ?? 99, r.light.bLc ?? 99) < 60)
console.log(`  lHi 0.62 would reclassify to red-move: ${subRows.filter(r => r.C >= CORE.cMin && ((r.H + 360) % 360) >= CORE.hLo && ((r.H + 360) % 360) <= CORE.hHi && r.L <= 0.62).length}/${subRows.length} of the sub-bar cells`)

writeFileSync('/Users/emilygerrity/okchroma/scripts/c12-session/proposal-sim.json', JSON.stringify({ knobs: { G, REL, D_UP, D_DOWN, D_VARIANT, DEEP_PIVOT, CORE, VAR_L_LO, VAR_L_PREF, VAR_L_MAX }, summary, rows }, null, 1))
console.log('\nrows -> scripts/c12-session/proposal-sim.json (' + rows.length + ')')
