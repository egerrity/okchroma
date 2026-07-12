// c12-groundtruth.ts — STEP 0 of the restart (2026-07-10): ground-truth the v5 working tree.
// Part 1: bright-red repro — true-red seed grid through resolveBrand (REAL pipeline), both
//         profiles: does it fire, where does the cta land, how far did it move, what text Lc.
// Part 2: apca dead-zone map per hue×chroma (white-Lc60 upper L, black-Lc60 lower L) — the
//         overlay data for the delivery-ladder instrument. Saved to c12-session/deadzone.json.
import { writeFileSync } from 'fs'
import { resolveBrand, signalScalesFor } from '/Users/emilygerrity/okchroma/src/engine/resolve'
import { type ContrastProfile } from '/Users/emilygerrity/okchroma/src/engine/colorEngine'
import { whiteTextLcAt, apcaYAt } from '/Users/emilygerrity/okchroma/src/reqtoken/producers'
import { redGateDist, RED_GATE } from '/Users/emilygerrity/okchroma/src/engine/colorMath'
import { clampChromaToGamut, oklchToLinearRgb, apcaLc } from '/Users/emilygerrity/okchroma/src/engine/constraints'

const hx = (L: number, C: number, H: number) => {
  const c = clampChromaToGamut(L, C, H)
  const [rl, gl, bl] = oklchToLinearRgb(L, c, H)
  const gm = (v: number) => { const x = Math.min(1, Math.max(0, v)); return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055 }
  const ch = (v: number) => Math.round(gm(v) * 255).toString(16).padStart(2, '0')
  return `#${ch(rl)}${ch(gl)}${ch(bl)}`
}
const blackLcAt = (L: number, C: number, H: number) => Math.abs(apcaLc(apcaYAt(0, 0, 0), apcaYAt(L, C, H)))

// ── Part 1: bright-red repro ───────────────────────────────────────────────────────
console.log('=== PART 1 — true-red seed grid through resolveBrand (fired? where? how far? text?) ===')
const seeds: string[] = ['#EE3123']
for (const H of [24, 28, 32, 36, 40]) for (const C of [0.16, 0.2, 0.24]) for (const L of [0.45, 0.55, 0.62, 0.7])
  seeds.push(hx(L, C, H))
for (const profile of ['wcag', 'apca'] as ContrastProfile[]) {
  const red = signalScalesFor(profile).get('red')!.scale
  console.log(`-- ${profile} · red cta light ${hx(red.cta.L, red.cta.C, red.cta.H)} L${red.cta.L.toFixed(3)} / dark ${hx(red.ctaDark.L, red.ctaDark.C, red.ctaDark.H)} L${red.ctaDark.L.toFixed(3)}`)
  const rows: string[] = []
  let fired = 0, tiny = 0, subBar = 0
  for (const hex of seeds) {
    const r = resolveBrand(hex, 'probe', { contrastProfile: profile })
    const cta = r.scale.cta
    const gd = redGateDist(cta, red.cta)
    const dL = cta.L - red.cta.L
    const wLc = whiteTextLcAt(cta.L, cta.C, cta.H)
    const bLc = blackLcAt(cta.L, cta.C, cta.H)
    const best = Math.max(wLc, bLc)
    const f = !!r.redRepel?.light
    if (f) fired++
    if (f && Math.abs(dL) < 0.075) tiny++
    if (f && best < 60) subBar++
    rows.push(`  ${hex} -> cta ${hx(cta.L, cta.C, cta.H)} L${cta.L.toFixed(3)} ${f ? 'FIRED' : 'no-fire'} gd ${gd.toFixed(3)} dL-vs-red ${dL >= 0 ? '+' : ''}${dL.toFixed(3)} Lc w${wLc.toFixed(0)}/b${bLc.toFixed(0)}${best < 60 ? ' SUB-BAR' : ''}`)
  }
  console.log(rows.join('\n'))
  console.log(`  == ${profile}: fired ${fired}/${seeds.length} · fired-with-tiny-move(|dL|<.075) ${tiny} · fired-sub-bar-text ${subBar}`)
}

// ── Part 2: apca dead-zone map ─────────────────────────────────────────────────────
console.log('\n=== PART 2 — apca dead zone per hue×chroma (white upper L .. black lower L; width) ===')
const zone: Record<string, { whiteTopL: number; blackBotL: number; width: number }> = {}
const HS: number[] = []; for (let H = 0; H <= 72; H += 4) HS.push(H)
for (const H of HS) {
  const line: string[] = []
  for (const C of [0.04, 0.08, 0.12, 0.16, 0.2]) {
    // white passes below whiteTopL; black passes above blackBotL — the gap between = dead zone
    let lo = 0.2, hi = 0.98
    for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; whiteTextLcAt(m, clampChromaToGamut(m, C, H), H) >= 60 ? (lo = m) : (hi = m) }
    const whiteTopL = lo
    lo = 0.2; hi = 0.98
    for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; blackLcAt(m, clampChromaToGamut(m, C, H), H) >= 60 ? (hi = m) : (lo = m) }
    const blackBotL = hi
    const width = Math.max(0, blackBotL - whiteTopL)
    zone[`${H}|${C}`] = { whiteTopL, blackBotL, width }
    line.push(`C${C}: ${whiteTopL.toFixed(3)}..${blackBotL.toFixed(3)} (${width.toFixed(3)})`)
  }
  console.log(`  H${String(H).padStart(2)}  ${line.join('  ')}`)
}
writeFileSync('/Users/emilygerrity/okchroma/scripts/c12-session/deadzone.json', JSON.stringify(zone, null, 1))
console.log('zone map -> scripts/c12-session/deadzone.json')
