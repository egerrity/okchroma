// collision-sweep.ts — the C7 validation instrument, made permanent (ported from the
// 2026-07-07 session scratchpad; CATALOG C7 records the grids and the shipped results).
// Sweeps ±35° per signal × C{.04–.17} × L{.55–.80}, both lanes, through the REAL pipeline
// (resolveTheme with a derived secondary), and asserts the C7 invariant:
//
//   ZERO unfired qualified holes — no seed with vividness ≥ HUE_COLLISION_MIN_V may sit
//   under the 0.006 bar (the C6-accepted wash separation) vs its EFFECTIVE signal with no
//   machinery fired, in either lane or mode.
//
// Also reports (informational): fired-under counts (the yellow dark degeneracy lives
// here), over-fire, lane divergence of fired machinery, muted-under. Exit 1 on holes.
// npm run sweep:collision

import { resolveTheme, signalScalesFor } from '../src/engine/resolve'
import { SIGNALS, type SignalDef } from '../src/engine/signals'
import { checkCollision, checkHueCollision, stopDeltaE, HUE_COLLISION_MIN_V } from '../src/engine/collision'
import { clampChromaToGamut, oklchToLinearRgb } from '../src/engine/constraints'
import type { GeneratedScale, ContrastProfile } from '../src/engine/colorEngine'

function oklchToHex(L: number, C: number, H: number): string {
  const c = clampChromaToGamut(L, C, H)
  const [rl, gl, bl] = oklchToLinearRgb(L, c, H)
  const gm = (v: number) => {
    const x = Math.min(1, Math.max(0, v))
    return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055
  }
  const ch = (v: number) => Math.round(gm(v) * 255).toString(16).padStart(2, '0')
  return `#${ch(rl)}${ch(gl)}${ch(bl)}`
}

const WASH = [3, 4, 5, 6, 7]
const HARD_BAR = 0.006
// OWNER-ACCEPTED EXCEPTION (2026-07-09, "A is acceptable as is", extending her C7 ruling
// that red differentiation is at its hue-space limit): brands sitting EXACTLY on the red
// signal's hue have no hue exit left — the repel is at its identity-preserving max and
// the ID lift spends part of the residual chroma gap (measured 0.00604 → 0.00586). The
// accepted floor is scoped to red dH0 ONLY; anything below it — or any OTHER seed class
// under HARD_BAR — still fails. A future change eroding this further needs a new ruling.
const RED_ONHUE_ACCEPTED_FLOOR = 0.0058
const barFor = (signal: string, dH: number) => (signal === 'red' && dH === 0 ? RED_ONHUE_ACCEPTED_FLOOR : HARD_BAR)

type Mode = 'light' | 'dark'
const washMin = (b: GeneratedScale, s: GeneratedScale, mode: Mode): number => {
  const ba = mode === 'light' ? b.light : b.dark
  const sa = mode === 'light' ? s.light : s.dark
  let m = Infinity
  for (const k of WASH) {
    const bs = ba.find(x => x.stop === k), ss = sa.find(x => x.stop === k)
    if (bs && ss) m = Math.min(m, stopDeltaE(bs, ss))
  }
  return m
}

const DH = [-35, -28, -22, -17, -13, -9, -6, -3, 0, 3, 6, 9, 13, 17, 22, 28, 35]
const CS = [0.04, 0.06, 0.08, 0.12, 0.17]
const LS = [0.55, 0.65, 0.73, 0.80]
const PROFILES: Array<{ lane: string; profile: ContrastProfile | undefined }> = [
  { lane: 'wcag', profile: undefined },
  { lane: 'apca', profile: 'apca' },
]

interface Row { signal: string; lane: string; hex: string; dH: number; fired: string[]; wmin: number; wminLight: number; v: number; secWmin: number; secNoted: boolean }
const rows: Row[] = []

for (const sig of SIGNALS)
  for (const { lane, profile } of PROFILES)
    for (const dH of DH) for (const L of LS) for (const C of CS) {
      const H = ((sig.H + dH) % 360 + 360) % 360
      const hex = oklchToHex(L, C, H)
      const t = resolveTheme({ primaryHex: hex, name: 'sweep', deriveSecondary: true, contrastProfile: profile })
      const canonical = signalScalesFor(profile).get(sig.name)!.scale
      const effective = t.themed.signalOverrides.find(o => o.name === sig.name)?.scale ?? canonical
      const p = t.primary.scale
      const fired = [
        ...(t.primary.rung1 ? [`rung1`] : []),
        ...(t.primary.darkCollider ? ['darkCollider'] : []),
        ...(t.primary.warningVariant ? [`variant:${t.primary.warningVariant}`] : []),
        ...t.themed.signalOverrides.map(o => `shift:${o.note}`),
        ...(t.primary.errorComponentRule ? ['componentRule'] : []),
      ]
      const h = checkHueCollision(p, canonical, sig)
      const sec = t.secondary!.scale
      rows.push({
        signal: sig.name, lane, hex, dH, fired,
        wmin: Math.min(washMin(p, effective, 'light'), washMin(p, effective, 'dark')),
        wminLight: washMin(p, effective, 'light'),
        v: h.vividness,
        secWmin: Math.min(washMin(sec, effective, 'light'), washMin(sec, effective, 'dark')),
        secNoted: t.secondary!.notes.some(n => n.includes(sig.name)),
      })
    }

let fail = 0
console.log(`collision-sweep: ${rows.length} seed-lane runs (17 dH × 5 C × 4 L × 4 signals × 2 lanes)`)
for (const sig of SIGNALS) {
  for (const lane of ['wcag', 'apca']) {
    const rs = rows.filter(r => r.signal === sig.name && r.lane === lane)
    const qualified = rs.filter(r => r.v >= HUE_COLLISION_MIN_V)
    const holes = qualified.filter(r => r.wmin < barFor(r.signal, r.dH) && r.fired.length === 0)
    const firedUnder = qualified.filter(r => r.fired.length > 0 && r.wmin < HARD_BAR)
    // C8 V3 gate hole (owner-caught): fired remedies must DELIVER separation — the
    // post-remedy LIGHT wash margin is ASSERTED at the bar. Dark stays informational
    // for now: the C7-logged residual (yellow's dark gold-spine hue degeneracy vs the
    // lemon variant) is a known value-side item for the dark round, not a regression.
    const firedUnderLight = qualified.filter(r => r.fired.length > 0 && r.wminLight < HARD_BAR)
    const secUnnoted = rs.filter(r => r.secWmin < HARD_BAR && !r.secNoted)
    fail += holes.length + secUnnoted.length + firedUnderLight.length
    const flag = holes.length || secUnnoted.length || firedUnderLight.length ? ' ✗' : ''
    console.log(`  ${sig.name} · ${lane}: HOLES ${holes.length}/${qualified.length} · fired-under-LIGHT ${firedUnderLight.length} (asserted) · fired-under any-mode ${firedUnder.length} · derived-sec unnoted-under ${secUnnoted.length}${flag}`)
    holes.slice(0, 3).forEach(r => console.log(`    HOLE ${r.hex} dH${r.dH} v${r.v.toFixed(2)} wash ${r.wmin.toFixed(4)}`))
    firedUnderLight.slice(0, 3).forEach(r => console.log(`    FIRED-UNDER-LIGHT ${r.hex} dH${r.dH} fired[${r.fired.join('|')}] wash ${r.wminLight.toFixed(4)}`))
  }
}
// fired-machinery lane divergence (informational: red type-2 value moves legitimately diverge)
const byKey = new Map<string, Row[]>()
for (const r of rows) { const k = `${r.signal}|${r.hex}`; (byKey.get(k) ?? byKey.set(k, []).get(k)!).push(r) }
let div = 0, swapDiv = 0
for (const [, pair] of byKey) if (pair.length === 2 && JSON.stringify(pair[0].fired) !== JSON.stringify(pair[1].fired)) {
  div++
  if (pair.some(p => p.fired.some(f => f.startsWith('shift:') || f.startsWith('variant:')))) swapDiv++
}
console.log(`lane divergence: ${div} total, ${swapDiv} involving swaps/variants (must be 0 — type-1 is lane-global)`)
if (swapDiv) fail += swapDiv

console.log(fail === 0 ? '\nGATE: PASS — zero unfired qualified holes; secondary annotation coverage complete; swap decisions lane-invariant' : `\nGATE: FAIL (${fail})`)
if (fail) process.exit(1)
