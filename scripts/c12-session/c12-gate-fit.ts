// FIT the owner's 3D gate (marks 2026-07-10) — axis-weighted distance around red:
// d = sqrt((wDark·ΔL⁻)² + (wLight·ΔL⁺)² + (wDust·ΔC⁻)² + (ΔC⁺)² + arc²) ≤ G
// Grid-search weights + G against her marked conflict/clear cards; report agreement + edges.
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
// axis decomposition vs red
const axes = (L: number, C: number, H: number) => {
  const o = hexToOklch(hx(L, C, H))
  const dLd = Math.max(0, red.L - o.L)   // darker
  const dLl = Math.max(0, o.L - red.L)   // lighter
  const dCd = Math.max(0, red.C - o.C)   // dustier
  const dCv = Math.max(0, o.C - red.C)   // vivider
  const dh = ((o.H - red.H + 540) % 360) - 180   // signed: + gold-ward, − magenta-ward
  const arcMag = 2 * Math.sqrt(o.C * red.C) * Math.sin(Math.abs(Math.min(0, dh)) * Math.PI / 360)
  const arcGold = 2 * Math.sqrt(o.C * red.C) * Math.sin(Math.max(0, dh) * Math.PI / 360)
  return { dLd, dLl, dCd, dCv, arcMag, arcGold }
}
// HER MARKS: [L, C, H, conflict]
const MARKS: Array<[number, number, number, boolean]> = [
  // 0.06-0.08 value (dark) — "all"
  [0.55, 0.2, 32, true], [0.55, 0.17, 32, true], [0.55, 0.2, 36, true], [0.55, 0.2, 40, true], [0.55, 0.2, 44, true],
  // 0.06-0.08 hue-carried — bracketed
  [0.65, 0.14, 28, true], [0.6, 0.14, 28, true], [0.65, 0.14, 40, true], [0.6, 0.14, 40, true],
  // 0.08-0.10 value dark — conflict
  [0.55, 0.2, 28, true], [0.55, 0.17, 28, true], [0.55, 0.17, 36, true], [0.55, 0.17, 40, true],
  // 0.08-0.10 value LIGHT — X (clear)
  [0.73, 0.2, 28, false], [0.73, 0.2, 32, false],
  // 0.08-0.10 hue-carried — "none"
  [0.65, 0.12, 24, false], [0.6, 0.12, 28, false], [0.6, 0.12, 40, false], [0.6, 0.14, 52, false], [0.6, 0.17, 60, false],
  // 0.10-0.12 all X
  [0.73, 0.2, 16, false], [0.73, 0.17, 24, false], [0.73, 0.17, 28, false], [0.73, 0.17, 32, false], [0.73, 0.17, 36, false], [0.73, 0.2, 48, false],
  [0.65, 0.14, 4, false], [0.65, 0.2, 4, false], [0.6, 0.2, 4, false], [0.6, 0.14, 4, false], [0.65, 0.12, 8, false], [0.6, 0.12, 8, false],
  [0.55, 0.17, 12, false], [0.55, 0.14, 20, false], [0.55, 0.12, 36, false], [0.55, 0.14, 48, false], [0.55, 0.17, 56, false], [0.55, 0.2, 56, false],
  // v3 (2026-07-10, "crossed out more that verge into orange and pink") — mid-L OUT marks
  [0.60, 0.12, 8, false], [0.60, 0.12, 16, false], [0.60, 0.12, 24, false], [0.60, 0.12, 32, false], [0.60, 0.12, 40, false],
  [0.60, 0.14, 0, false], [0.60, 0.14, 44, false], [0.60, 0.14, 48, false],
  [0.65, 0.12, 12, false], [0.65, 0.12, 20, false], [0.65, 0.12, 28, false], [0.65, 0.12, 36, false],
  [0.65, 0.14, 4, false], [0.65, 0.14, 8, false], [0.65, 0.17, 4, false], [0.65, 0.14, 12, false],
  [0.65, 0.14, 44, false], [0.65, 0.14, 48, false], [0.65, 0.17, 48, false],
  // 0.12-0.14: circled conflict + neighbors clear
  [0.5, 0.2, 36, true],
  [0.73, 0.17, 12, false], [0.73, 0.14, 16, false], [0.73, 0.14, 20, false], [0.73, 0.14, 48, false], [0.73, 0.17, 52, false],
  [0.55, 0.17, 4, false], [0.65, 0.08, 16, false], [0.6, 0.08, 20, false], [0.6, 0.08, 48, false],
]
// FENCE cells (owner 2026-07-10, "on the fence"): soft preferences — vivid magenta boundary
// leans IN (conflict), dusty-warm tail leans OUT (clear). [L, C, H, wantIn]
const FENCE: Array<[number, number, number, boolean]> = [
  [0.6, 0.17, 52, true],   // early bracket, downgraded (owner: latest marks win mathematically — 1-vs-5 outlier)
  // vivid magenta-ward, dark slices (lean IN)
  [0.50, 0.20, 16, true], [0.50, 0.17, 16, true], [0.55, 0.20, 8, true], [0.55, 0.20, 12, true],
  [0.60, 0.20, 4, true], [0.60, 0.17, 8, true], [0.60, 0.20, 8, true],
  // dusty / warm tail (lean OUT)
  [0.60, 0.12, 44, false], [0.60, 0.14, 48, false], [0.60, 0.12, 40, false],
  [0.65, 0.12, 16, false], [0.65, 0.12, 24, false], [0.65, 0.12, 32, false], [0.65, 0.14, 44, false],
]
let best: any = null
const dist = (wD: number, wL: number, wC: number, m: number, wGo: number, a: any) => {
  const ps = Math.max(0.4, 1 - m * a.dLd)   // hue/chroma plane shrinks as the cell darkens (the cone)
  return Math.hypot(wD * a.dLd, wL * a.dLl, ps * wC * a.dCd, a.dCv, ps * a.arcMag, ps * wGo * a.arcGold)
}
for (let wD = 0.45; wD <= 0.95; wD += 0.05) for (let wL = 1.0; wL <= 1.7; wL += 0.1) for (let wC = 1.0; wC <= 1.8; wC += 0.1) for (let m = 0; m <= 5; m += 0.5) for (let wGo = 1.0; wGo <= 1.8; wGo += 0.1) for (let G = 0.06; G <= 0.105; G += 0.0025) {
  let wrong = 0, soft = 0, margin = 0
  for (const [L, C, H, conf] of MARKS) {
    const d = dist(wD, wL, wC, m, wGo, axes(L, C, H))
    if ((d <= G) !== conf) wrong++
    margin += Math.abs(d - G)
  }
  for (const [L, C, H, wantIn] of FENCE) {
    if ((dist(wD, wL, wC, m, wGo, axes(L, C, H)) <= G) !== wantIn) soft++
  }
  if (!best || wrong < best.wrong || (wrong === best.wrong && (soft < best.soft || (soft === best.soft && margin > best.margin)))) best = { wD, wL, wC, m, wGo, G, wrong, soft, margin }
}
console.log(`fit v5: wDark ${best.wD.toFixed(2)} wLight ${best.wL.toFixed(2)} wDust ${best.wC.toFixed(2)} coneM ${best.m.toFixed(1)} wGold ${best.wGo.toFixed(2)} G ${best.G.toFixed(4)} — hard misses ${best.wrong}/${MARKS.length} · fence misses ${best.soft}/${FENCE.length}`)
// list any misclassified
for (const [L, C, H, conf] of MARKS) {
  const d = dist(best.wD, best.wL, best.wC, best.m, best.wGo, axes(L, C, H))
  if ((d <= best.G) !== conf) console.log(`  MISS ${hx(L, C, H)} H${H} C${C} L${L} d ${d.toFixed(3)} her=${conf ? 'conflict' : 'clear'}`)
}
// predicted six axis edges (raw ΔE where gate closes along each semi-axis)
const edge = (dir: 'dark' | 'light' | 'dust' | 'vivid' | 'mag' | 'gold') => {
  for (let t = 0.005; t < 0.4; t += 0.002) {
    const p = dir === 'dark' ? axes(red.L - t, red.C, red.H)
      : dir === 'light' ? axes(red.L + t, red.C, red.H)
      : dir === 'dust' ? axes(red.L, red.C - t, red.H)
      : dir === 'vivid' ? axes(red.L, red.C + t, red.H)
      : dir === 'mag' ? axes(red.L, red.C, red.H - t * 200)
      : axes(red.L, red.C, red.H + t * 200)
    if (dist(best.wD, best.wL, best.wC, best.m, best.wGo, p) > best.G) return t
  }
  return NaN
}
console.log(`predicted edges: dark ΔL ${edge('dark').toFixed(3)} · light ΔL ${edge('light').toFixed(3)} · dust ΔC ${edge('dust').toFixed(3)} · vivid ΔC ${edge('vivid').toFixed(3)} · magenta ${(edge('mag') * 200).toFixed(0)}° · gold ${(edge('gold') * 200).toFixed(0)}°`)
