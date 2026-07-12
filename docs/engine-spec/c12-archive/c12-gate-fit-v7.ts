// FIT v6 (2026-07-10 restart): her original 67 raw-pair marks + the 35 L0.55 marks from the
// direction-sort session (22 clear incl golds/pinks/dusties she crossed; 13 conflict = 5 checked
// + 8 net-flipped per her "really conflicts => goes light" precedence). Same axis-weighted
// metric + grid search as v5; G freed to 0.16. Question on the table: does the fitted range
// actually move from v5 (wDark .65 wLight 1.6 wDust 1.4 wGold 1.6 G .090)?
import { SIGNALS } from '/Users/emilygerrity/okchroma/src/engine/signals'
import { hexToOklch } from '/Users/emilygerrity/okchroma/src/engine/colorMath'
import { clampChromaToGamut, oklchToLinearRgb } from '/Users/emilygerrity/okchroma/src/engine/constraints'
const hx = (L: number, C: number, H: number) => {
  const c = clampChromaToGamut(L, C, H)
  const [rl, gl, bl] = oklchToLinearRgb(L, c, H)
  const gm = (v: number) => { const x = Math.min(1, Math.max(0, v)); return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055 }
  const ch = (v: number) => Math.round(gm(v) * 255).toString(16).padStart(2, '0')
  return `#${ch(rl)}${ch(gl)}${ch(bl)}`
}
const red = hexToOklch(SIGNALS.find(s => s.name === 'red')!.hex)
const axes = (L: number, C: number, H: number) => {
  const o = hexToOklch(hx(L, C, H))
  const dLd = Math.max(0, red.L - o.L)
  const dLl = Math.max(0, o.L - red.L)
  const dCd = Math.max(0, red.C - o.C)
  const dCv = Math.max(0, o.C - red.C)
  const dh = ((o.H - red.H + 540) % 360) - 180
  const arcMag = 2 * Math.sqrt(o.C * red.C) * Math.sin(Math.abs(Math.min(0, dh)) * Math.PI / 360)
  const arcGold = 2 * Math.sqrt(o.C * red.C) * Math.sin(Math.max(0, dh) * Math.PI / 360)
  return { dLd, dLl, dCd, dCv, arcMag, arcGold }
}
// ORIGINAL 67 (c12-gate-fit.ts, verbatim)
const MARKS: Array<[number, number, number, boolean]> = [
  [0.55, 0.2, 32, true], [0.55, 0.17, 32, true], [0.55, 0.2, 36, true], [0.55, 0.2, 40, true], [0.55, 0.2, 44, true],
  [0.65, 0.14, 28, true], [0.6, 0.14, 28, true], [0.65, 0.14, 40, true], [0.6, 0.14, 40, true],
  [0.55, 0.2, 28, true], [0.55, 0.17, 28, true], [0.55, 0.17, 36, true], [0.55, 0.17, 40, true],
  [0.73, 0.2, 28, false], [0.73, 0.2, 32, false],
  [0.65, 0.12, 24, false], [0.6, 0.12, 28, false], [0.6, 0.12, 40, false], [0.6, 0.14, 52, false], [0.6, 0.17, 60, false],
  [0.73, 0.2, 16, false], [0.73, 0.17, 24, false], [0.73, 0.17, 28, false], [0.73, 0.17, 32, false], [0.73, 0.17, 36, false], [0.73, 0.2, 48, false],
  [0.65, 0.14, 4, false], [0.65, 0.2, 4, false], [0.6, 0.2, 4, false], [0.6, 0.14, 4, false], [0.65, 0.12, 8, false], [0.6, 0.12, 8, false],
  [0.55, 0.17, 12, false], [0.55, 0.14, 20, false], [0.55, 0.12, 36, false], [0.55, 0.14, 48, false], [0.55, 0.17, 56, false], [0.55, 0.2, 56, false],
  [0.60, 0.12, 8, false], [0.60, 0.12, 16, false], [0.60, 0.12, 24, false], [0.60, 0.12, 32, false], [0.60, 0.12, 40, false],
  [0.60, 0.14, 0, false], [0.60, 0.14, 44, false], [0.60, 0.14, 48, false],
  [0.65, 0.12, 12, false], [0.65, 0.12, 20, false], [0.65, 0.12, 28, false], [0.65, 0.12, 36, false],
  [0.65, 0.14, 4, false], [0.65, 0.14, 8, false], [0.65, 0.17, 4, false], [0.65, 0.14, 12, false],
  [0.65, 0.14, 44, false], [0.65, 0.14, 48, false], [0.65, 0.17, 48, false],
  [0.5, 0.2, 36, true],
  [0.73, 0.17, 12, false], [0.73, 0.14, 16, false], [0.73, 0.14, 20, false], [0.73, 0.14, 48, false], [0.73, 0.17, 52, false],
  [0.55, 0.17, 4, false], [0.65, 0.08, 16, false], [0.6, 0.08, 20, false], [0.6, 0.08, 48, false],
]
// L0.55 SESSION (l055-range-marks.json, 2026-07-10)
const MARKS_L055: Array<[number, number, number, boolean]> = [
  [0.55, 0.17, 356, false], [0.55, 0.14, 0, false], [0.55, 0.17, 0, false], [0.55, 0.14, 4, false], [0.55, 0.17, 4, false],
  [0.55, 0.12, 8, false], [0.55, 0.14, 8, false], [0.55, 0.17, 8, false], [0.55, 0.12, 12, false], [0.55, 0.14, 12, false],
  [0.55, 0.12, 16, false], [0.55, 0.14, 16, false], [0.55, 0.12, 20, false], [0.55, 0.12, 24, false],
  [0.55, 0.12, 28, false], [0.55, 0.12, 32, false],
  [0.55, 0.12, 36, false], [0.55, 0.12, 40, false], [0.55, 0.12, 44, false], [0.55, 0.14, 44, false], [0.55, 0.2, 56, false], [0.55, 0.2, 60, false],
  // SCENARIO B (her eye 2026-07-10): ALL 8 net-flips revert to CLEAR ("look distinct from an
  // error"); only her 5 explicit conflict checks (C0.17 H16-32) stay conflict.
  [0.55, 0.17, 12, false], [0.55, 0.14, 20, false], [0.55, 0.14, 24, false], [0.55, 0.14, 28, false], [0.55, 0.14, 32, false],
  [0.55, 0.17, 16, true], [0.55, 0.17, 20, true], [0.55, 0.17, 24, true], [0.55, 0.17, 28, true], [0.55, 0.17, 32, true],
  [0.55, 0.14, 36, false], [0.55, 0.14, 40, false], [0.55, 0.2, 52, false],
]
const FENCE: Array<[number, number, number, boolean]> = [
  [0.6, 0.17, 52, true],
  [0.50, 0.20, 16, true], [0.50, 0.17, 16, true], [0.55, 0.20, 8, true], [0.55, 0.20, 12, true],
  [0.60, 0.20, 4, true], [0.60, 0.17, 8, true], [0.60, 0.20, 8, true],
  [0.60, 0.12, 44, false], [0.60, 0.14, 48, false], [0.60, 0.12, 40, false],
  [0.65, 0.12, 16, false], [0.65, 0.12, 24, false], [0.65, 0.12, 32, false], [0.65, 0.14, 44, false],
]
// note: 2 original marks are superseded by her net flips ([0.55,0.17,12,false] and [0.55,0.14,20,false]
// now conflict per the net) — latest-wins (her declared rule from the outlier episode): drop the stale pair.
const ALL = [
  ...MARKS.filter(([L, C, H]) => !(L === 0.55 && ((C === 0.17 && H === 12) || (C === 0.14 && H === 20)))),
  ...MARKS_L055,
]
console.log(`marks: original kept ${ALL.length - MARKS_L055.length} (2 superseded by net) + session ${MARKS_L055.length} = ${ALL.length}`)
let best: any = null
const dist = (wD: number, wL: number, wC: number, wGo: number, a: any) =>
  Math.hypot(wD * a.dLd, wL * a.dLl, wC * a.dCd, a.dCv, a.arcMag, wGo * a.arcGold)
for (let wD = 0.45; wD <= 0.95; wD += 0.05) for (let wL = 1.0; wL <= 1.7; wL += 0.1) for (let wC = 1.0; wC <= 2.0; wC += 0.1) for (let wGo = 1.0; wGo <= 1.8; wGo += 0.1) for (let G = 0.06; G <= 0.16; G += 0.0025) {
  let wrong = 0, soft = 0, margin = 0
  for (const [L, C, H, conf] of ALL) {
    const d = dist(wD, wL, wC, wGo, axes(L, C, H))
    if ((d <= G) !== conf) wrong++
    margin += Math.abs(d - G)
  }
  for (const [L, C, H, wantIn] of FENCE) {
    if ((dist(wD, wL, wC, wGo, axes(L, C, H)) <= G) !== wantIn) soft++
  }
  if (!best || wrong < best.wrong || (wrong === best.wrong && (soft < best.soft || (soft === best.soft && margin > best.margin)))) best = { wD, wL, wC, wGo, G, wrong, soft, margin }
}
console.log(`fit v6: wDark ${best.wD.toFixed(2)} wLight ${best.wL.toFixed(2)} wDust ${best.wC.toFixed(2)} wGold ${best.wGo.toFixed(2)} G ${best.G.toFixed(4)} — hard misses ${best.wrong}/${ALL.length} · fence misses ${best.soft}/${FENCE.length}`)
console.log(`   (v5 was: wDark 0.65 wLight 1.60 wDust 1.40 wGold 1.60 G 0.0900 — 0/67)`)
for (const [L, C, H, conf] of ALL) {
  const d = dist(best.wD, best.wL, best.wC, best.wGo, axes(L, C, H))
  if ((d <= best.G) !== conf) console.log(`  MISS ${hx(L, C, H)} H${H} C${C} L${L} d ${d.toFixed(3)} her=${conf ? 'conflict' : 'clear'}`)
}
const edge = (dir: 'dark' | 'light' | 'dust' | 'vivid' | 'mag' | 'gold') => {
  for (let t = 0.005; t < 0.4; t += 0.002) {
    const p = dir === 'dark' ? axes(red.L - t, red.C, red.H)
      : dir === 'light' ? axes(red.L + t, red.C, red.H)
      : dir === 'dust' ? axes(red.L, red.C - t, red.H)
      : dir === 'vivid' ? axes(red.L, red.C + t, red.H)
      : dir === 'mag' ? axes(red.L, red.C, red.H - t * 200)
      : axes(red.L, red.C, red.H + t * 200)
    if (dist(best.wD, best.wL, best.wC, best.wGo, p) > best.G) return t
  }
  return NaN
}
console.log(`predicted edges: dark ΔL ${edge('dark').toFixed(3)} · light ΔL ${edge('light').toFixed(3)} · dust ΔC ${edge('dust').toFixed(3)} · vivid ΔC ${edge('vivid').toFixed(3)} · magenta ${(edge('mag') * 200).toFixed(0)}° · gold ${(edge('gold') * 200).toFixed(0)}°`)
