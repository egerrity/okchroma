// Suspect probes — step 2 of the 2026-06-11 math interrogation (handoff
// §3 A–F). The smoothness harness gives the headline worst cases; these
// probes attribute them to mechanisms and hunt the failure modes the grid
// is too coarse to see (input-space cliffs, C1 kinks, fine-chroma wobble,
// contract violations). Read-only: no engine edits.
//
//   A  absolute gold-spine attractor — drift-cap saturation incidence +
//      inter-brand hue-identity retention (do two brands 10° apart stay
//      10° apart in their derived stops?)
//   B  pinned-stop seams — input-space cliff scan on brandL (the dead-zone
//      fill darkening vs polarity flip in enforceOnFillContrast)
//   C  cream envelope inherits sRGB gamut shape — fine gold grid chroma
//      wobble (H 55–115 × C 0.02–0.22), default + deeper
//   D  fleet-gap-calibrated edges — end-to-end output continuity d(out)/dH
//      at 0.5° steps across the warm region vs a quiet control window,
//      plus the WARM_TORSION linear-taper C1 jump from the constants
//   F  lightTextStop convergence — stop 11/12 contrast contracts over the
//      gamut grid, on engine-continuous AND hex-rounded values
//
// (E's gaussians act inside the C and D windows — attributed in analysis.)

import { resolveBrand } from '../src/engine/resolve'
import { generateIllustrationScale, type GeneratedScale, type ColorStop } from '../src/engine/colorEngine'
import { clampChromaToGamut, oklchToLinearRgb, wcagY, contrastRatio } from '../src/engine/constraints'
import { stopDeltaE } from '../src/engine/collision'
import { GOLD_SPINE, WARM_TORSION } from '../src/engine/stopTable'

// The former DARK_STOPS rootL column (deleted in the H-K table collapse, 2026-06-26)
// — kept locally as the sample lightnesses this torsion slope-jump probe scans, so
// the probe's output is unchanged. These were never the emitted dark L (that's the
// DARK_NEUTRAL_L scaffold); they're just probe sample points.
const DARK_PROBE_ROOTS = [0.18, 0.21, 0.245, 0.28, 0.315, 0.355, 0.41, 0.48]

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

function hueDelta(h: number, center: number): number {
  let d = (h - center) % 360
  if (d > 180) d -= 360
  if (d < -180) d += 360
  return d
}

const res = (H: number, L: number, C: number, style?: 'deeper') =>
  resolveBrand(oklchToHex(L, C, H), 'probe', style ? { style } : undefined).scale

// ── A1: drift-cap saturation incidence ───────────────────────────────────────
console.log('── A1: spine-drift cap saturation (|ΔH vs brand| ≥ 23° on any stop) ──')
{
  const counts: Record<string, { n: number; sat: number }> = {
    light: { n: 0, sat: 0 },
    dark: { n: 0, sat: 0 },
    illus: { n: 0, sat: 0 },
  }
  for (let H = 36; H <= 122; H += 2)
    for (const L of [0.25, 0.4, 0.55, 0.7, 0.85])
      for (const C of [0.06, 0.13, 0.2]) {
        const s = res(H, L, C)
        const ramps: Array<[string, ColorStop[]]> = [
          ['light', s.light],
          ['dark', s.dark],
          ['illus', generateIllustrationScale(s).stops],
        ]
        for (const [name, stops] of ramps) {
          counts[name].n++
          if (stops.some(st => Math.abs(hueDelta(st.H, s.brandH)) >= 23)) counts[name].sat++
        }
      }
  for (const [name, c] of Object.entries(counts))
    console.log(`   ${name.padEnd(5)} ${c.sat}/${c.n} warm-band inputs have ≥1 stop at the drift cap (${((100 * c.sat) / c.n).toFixed(0)}%)`)
}

// ── A2: inter-brand hue-identity retention ───────────────────────────────────
// Two brands 10° apart: what fraction of their hue separation survives in
// the derived stops? 1.0 = identity preserved, 0.45 ≈ the absolute
// attractor's (1 − travel), < 0.2 = the pair has visually merged.
console.log('\n── A2: hue-separation retention for brand pairs 10° apart ──')
{
  type Worst = { ret: number; at: string }
  const stats: Record<string, { min: Worst; sum: number; n: number; merged: number }> = {}
  const note = (ramp: string, ret: number, at: string) => {
    const s = (stats[ramp] ??= { min: { ret: Infinity, at: '' }, sum: 0, n: 0, merged: 0 })
    if (ret < s.min.ret) s.min = { ret, at }
    s.sum += ret
    s.n++
    if (ret < 0.2) s.merged++
  }
  for (let H = 45; H <= 112; H += 5)
    for (const L of [0.4, 0.7])
      for (const C of [0.08, 0.13]) {
        const a = res(H, L, C)
        const b = res(H + 10, L, C)
        const dBrand = hueDelta(b.brandH, a.brandH)
        if (Math.abs(dBrand) < 4) continue // hex rounding collapsed the pair
        const ramps: Array<[string, ColorStop[], ColorStop[]]> = [
          ['light 1–8', a.light.slice(0, 8), b.light.slice(0, 8)],
          ['light 11–12', a.light.slice(10, 12), b.light.slice(10, 12)],
          ['dark 1–8', a.dark.slice(0, 8), b.dark.slice(0, 8)],
          ['illus', generateIllustrationScale(a).stops, generateIllustrationScale(b).stops],
        ]
        for (const [name, sa, sb] of ramps)
          for (let i = 0; i < sa.length; i++) {
            if (Math.min(sa[i].C, sb[i].C) < 0.02) continue // hue imperceptible
            note(name, hueDelta(sb[i].H, sa[i].H) / dBrand, `H ${H}/${H + 10} L${L} C${C} stop ${sa[i].stop}`)
          }
      }
  for (const [ramp, s] of Object.entries(stats))
    console.log(
      `   ${ramp.padEnd(12)} mean ${(s.sum / s.n).toFixed(2)}  min ${s.min.ret.toFixed(2)} (${s.min.at})  merged(<0.2): ${s.merged}/${s.n}`
    )
}

// ── B: input-space cliff scan on brandL (dead-zone cta rule) ─────────────────
console.log('\n── B: light cta L cliff vs brandL (dead-zone darkening / polarity flip) ──')
{
  for (const [H, C] of [
    [25, 0.14],
    [83, 0.1],
    [145, 0.12],
    [250, 0.12],
  ] as Array<[number, number]>) {
    let prevL: number | null = null
    let prevWhite: boolean | null = null
    let maxJump = 0
    let at = ''
    for (let L = 0.45; L <= 0.76; L += 0.0025) {
      const s = res(H, L, C)
      if (prevL !== null) {
        const jump = Math.abs(s.cta.L - prevL)
        if (jump > maxJump) {
          maxJump = jump
          at = `brandL ${L.toFixed(3)} (cta ${prevL.toFixed(3)}→${s.cta.L.toFixed(3)}, on-cta ${prevWhite ? 'white' : 'black'}→${s.onFillTextIsWhite ? 'white' : 'black'})`
        }
      }
      prevL = s.cta.L
      prevWhite = s.onFillTextIsWhite
    }
    console.log(`   H ${String(H).padStart(3)} C ${C}: max cta-L jump per 0.0025 brandL step = ${maxJump.toFixed(3)} at ${at}`)
  }
}

// ── C: fine gold grid — chroma wobble on the cream envelope ──────────────────
console.log('\n── C: chroma wobble, fine gold grid (H 55–115 × C 0.02–0.22) ──')
{
  for (const style of [undefined, 'deeper'] as const) {
    let worst = 0
    let at = ''
    let count = 0
    let n = 0
    for (let H = 55; H <= 115; H += 2.5)
      for (const L of [0.4, 0.55, 0.7, 0.85])
        for (let C = 0.02; C <= 0.221; C += 0.01) {
          const s = res(H, L, C, style)
          const cs = s.light.slice(0, 8).map(x => x.C)
          n++
          let dip = 0
          let stop = 0
          for (let i = 1; i + 1 < cs.length; i++) {
            if (cs[i] < cs[i - 1] - 1e-4 && cs[i] < cs[i + 1] - 1e-4) {
              const d = Math.min(cs[i - 1] - cs[i], cs[i + 1] - cs[i])
              if (d > dip) {
                dip = d
                stop = i + 1
              }
            }
          }
          if (dip > 1e-3) count++
          if (dip > worst) {
            worst = dip
            at = `H ${H} L ${L} C ${C.toFixed(2)} stop ${stop}`
          }
        }
    console.log(`   style=${style ?? 'default'}: worst interior C dip ${worst.toFixed(4)} at ${at}; dips >0.001 on ${count}/${n} inputs`)
  }
}

// ── D: end-to-end continuity in brand hue ────────────────────────────────────
// d(output)/dH at 0.5° input steps. Control window H 195–225 carries no
// warm machinery — its p99 is the hex-quantization noise floor. Spikes in
// the warm window above ~2× floor are treatment hand-offs.
console.log('\n── D: output continuity d(stops)/dH, 0.5° steps ──')
{
  const deriv = (h0: number, h1: number, L: number, C: number) => {
    const a = res(h0, L, C)
    const b = res(h1, L, C)
    let m = 0
    let ramp = ''
    const pairs: Array<[string, ColorStop[], ColorStop[]]> = [
      ['light', a.light, b.light],
      ['dark', a.dark, b.dark],
      ['illus', generateIllustrationScale(a).stops, generateIllustrationScale(b).stops],
    ]
    for (const [name, sa, sb] of pairs)
      for (let i = 0; i < sa.length; i++) {
        const d = stopDeltaE(sa[i], sb[i]) / (h1 - h0)
        if (d > m) {
          m = d
          ramp = `${name} stop ${sa[i].stop}`
        }
      }
    return { m, ramp }
  }
  const scan = (lo: number, hi: number) => {
    const out: Array<{ h: number; m: number; ramp: string; L: number; C: number }> = []
    for (const L of [0.35, 0.55, 0.75])
      for (const C of [0.06, 0.13, 0.2])
        for (let h = lo; h < hi; h += 0.5) {
          const { m, ramp } = deriv(h, h + 0.5, L, C)
          out.push({ h, m, ramp, L, C })
        }
    return out
  }
  const control = scan(195, 225).map(x => x.m).sort((a, b) => a - b)
  const floor = control[Math.floor(0.99 * control.length)]
  console.log(`   control (H 195–225) p99 derivative: ${floor.toFixed(4)} ΔE/° (hex-quantization noise floor)`)
  const warm = scan(8, 130)
  warm.sort((a, b) => b.m - a.m)
  console.log(`   warm (H 8–130) top spikes above 2× floor:`)
  const seen = new Set<string>()
  let shown = 0
  for (const w of warm) {
    if (w.m < 2 * floor || shown >= 12) break
    const key = `${Math.round(w.h / 2) * 2}|${w.ramp.split(' ')[0]}`
    if (seen.has(key)) continue
    seen.add(key)
    shown++
    console.log(`     H ${w.h.toFixed(1)} L${w.L} C${w.C}: ${w.m.toFixed(4)} ΔE/° (${w.ramp})`)
  }

  // WARM_TORSION linear taper — C1 jump straight from the constants:
  // dw/dH steps from 0 to 1/taperDeg at bandLo/bandHi±taper, so the hue-
  // drift derivative jumps by travel·|spine(L)−H|/taperDeg degrees per
  // degree at the band edges.
  const spineAt = (L: number) => {
    const pts = GOLD_SPINE
    if (L <= pts[0][0]) return pts[0][1]
    for (let i = 1; i < pts.length; i++)
      if (L <= pts[i][0]) {
        const [l0, h0] = pts[i - 1]
        const [l1, h1] = pts[i]
        return h0 + ((h1 - h0) * (L - l0)) / (l1 - l0)
      }
    return pts[pts.length - 1][1]
  }
  const { bandLo, bandHi, taperDeg, travel } = WARM_TORSION
  console.log(`   WARM_TORSION C1 jump in d(hue-drift)/d(brandH) at band edges (dark ramp):`)
  for (const edge of [bandLo, bandLo + taperDeg, bandHi - taperDeg, bandHi]) {
    const jumps = DARK_PROBE_ROOTS.map(rootL => (travel * Math.abs(spineAt(rootL) - edge)) / taperDeg)
    console.log(
      `     H ${edge}: slope jump ${Math.min(...jumps).toFixed(2)}–${Math.max(...jumps).toFixed(2)} °/° across dark roots`
    )
  }
}

// ── F: lightTextStop contracts over the gamut grid ───────────────────────────
console.log('\n── F: stop 11/12 contrast contracts (vs stop 2), continuous + hex-rounded ──')
{
  const srgbY = (s: ColorStop) => {
    const lin = (v: number) => {
      const q = Math.round(Math.min(1, Math.max(0, v)) * 255) / 255
      return q <= 0.04045 ? q / 12.92 : ((q + 0.055) / 1.055) ** 2.4
    }
    return 0.2126 * lin(s.r) + 0.7152 * lin(s.g) + 0.0722 * lin(s.b)
  }
  let v11 = 0
  let v12 = 0
  let h11 = 0
  let h12 = 0
  let worst11 = 4.5
  let worst11At = ''
  let n = 0
  for (let H = 0; H < 360; H += 3)
    for (const L of [0.25, 0.4, 0.55, 0.7, 0.85])
      for (const C of [0.06, 0.13, 0.2]) {
        const s = res(H, L, C)
        n++
        const y2 = wcagY(s.light[1].L, s.light[1].C, s.light[1].H)
        const c11 = contrastRatio(wcagY(s.light[10].L, s.light[10].C, s.light[10].H), y2)
        const c12 = contrastRatio(wcagY(s.light[11].L, s.light[11].C, s.light[11].H), y2)
        if (c11 < 4.5 - 1e-9) v11++
        if (c12 < 7.0 - 1e-9) v12++
        const r11 = contrastRatio(srgbY(s.light[10]), srgbY(s.light[1]))
        const r12 = contrastRatio(srgbY(s.light[11]), srgbY(s.light[1]))
        if (r11 < 4.5) {
          h11++
          if (r11 < worst11) {
            worst11 = r11
            worst11At = `H ${H} L${L} C${C}`
          }
        }
        if (r12 < 7.0) h12++
      }
  console.log(`   continuous: stop11 <4.5 on ${v11}/${n}, stop12 <7.0 on ${v12}/${n}`)
  console.log(`   hex-rounded: stop11 <4.5 on ${h11}/${n} (worst ${worst11.toFixed(3)} at ${worst11At}), stop12 <7.0 on ${h12}/${n}`)
}
