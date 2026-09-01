// alphaPapers.ts — the paper-overlay leaves (owner round 2026-08-13).
//
// One rgba per paper rung (99/97/95), per family, per mode: the translucent twin that
// holds the paper's ABSOLUTE reading on any of the four neutral papers while the
// surface tints through the see-through fraction. Every constant is derived from the
// system except the two declared here (TOL, LIFT_FRACTION).
//
// THE LAW, per rung:
// - target apparent (Nayatani L*): light = the solid paper's own; dark = the neutral
//   ground's apparent + K × (the paper's light delta over white) + a half-step lift.
//   K = mean dark plane seam / mean light plane seam (apparent, the neutral papers) —
//   the system's own dark loudness, derived per theme.
// - pen = the paper's hue at a chroma that is the larger of the 1/alpha dilution
//   compensation and the VISIBILITY floor (the composite must clear `sep` OKLab ΔE —
//   the house stopDeltaE — against every neutral paper field; sRGB gamut caps it).
//   As C rises, L re-solves DOWN through the Nayatani instrument so the target
//   apparent holds: C carries visibility, L carries the rhythm.
// - alpha = the minimum keeping the composite within TOL apparent of the target on
//   all four fields; pen and alpha iterate to convergence.
// - the dark half-step lift is GATED by the paper/pen law: bisected down wherever
//   pencil-47/42/30 would lose 4.5/6.5/7.0 (shipped 8-bit basis, the QUANTIZED rgba)
//   against the lightest lifted overlay composited on the lightest field. The same
//   gate runs in LIGHT against the darkest composite (the thin neutral pencil-47 margin).
// - the NEUTRAL family is exempt from the visibility floor (a grey distinguishes by
//   lightness only; the floor at its tint hue turns it pastel) but carries everything
//   else.
//
// Conformance scope: the guarantees hold on the four neutral papers. On any other
// backdrop the composite is whatever the backdrop makes it — consumer responsibility,
// stated in the token descriptions.
import type { GeneratedScale } from './colorEngine'
import type { ColorStop } from './colorMath'
import { hexToOklch, srgbEmitChannels } from './colorMath'
import { apparentL, solveLForApparent } from './perceptualL'
import { clampChromaToGamut, contrastRatio, shippedY } from './constraints'
import { stopDeltaE } from './collision'

export type AlphaMode = 'light' | 'dark'
export interface AlphaPaper {
  stop: number          // 1/2/3 — the paper rung this overlays
  name: string          // paper-99-overlay / -97 / -95
  overlayHex: string    // the pen
  alpha: number         // 0..1, quantized to 1%
  // set when the visibility floor could not be reached: 'gamut' = the sRGB ceiling
  // (the near-white physics), 'text-bars' = the paper/pen law bound the chroma boost
  // (the law outranks the look — owner: the contrast rules are not overwritable)
  capped?: 'gamut' | 'text-bars'
}

const OVERLAY_NAMES: Record<number, string> = { 1: 'paper-99-overlay', 2: 'paper-97-overlay', 3: 'paper-95-overlay' }
const PAPER_STOPS = [1, 2, 3]

// the two declared constants: the apparent-L tolerance the alpha solve holds on every
// field, and the owner's "move them all up, but not a full step" dark lift fraction
export const ALPHA_TOL_APP = 1.0
export const ALPHA_LIFT_FRACTION = 0.5

// local sRGB hex (cssRender.stopHex's exact math) — a direct import would cycle
// (cssRender consumes this module)
const stopHex = (s: { L: number; C: number; H: number }): string => {
  const { r, g, b } = srgbEmitChannels(s as ColorStop)
  const ch = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')
  return `#${ch(r)}${ch(g)}${ch(b)}`
}
const appOf = (s: { L: number; C: number; H: number }) =>
  apparentL(s.L, clampChromaToGamut(s.L, s.C, s.H), s.H)
// memoized — the solve evaluates the same composites thousands of times per theme,
// and the plugin sandbox runs this on the UI thread (an apply froze the panel,
// owner-hit 2026-08-13). Keyed by hex: a pure function of its input.
const appMemo = new Map<string, number>()
const appHex = (h: string) => {
  const hit = appMemo.get(h)
  if (hit !== undefined) return hit
  const o = hexToOklch(h)
  const v = apparentL(o.L, o.C, o.H, 'srgb')
  appMemo.set(h, v)
  return v
}
const hexRgb = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))
const rgbHex = (c: number[]) => '#' + c.map(v => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')
// Figma-style gamma-sRGB compositing — the basis every consumer's renderer uses
export const compositeHex = (fg: string, bg: string, a: number) =>
  rgbHex(hexRgb(bg).map((b, i) => a * hexRgb(fg)[i] + (1 - a) * b))

const stopAt = (scale: GeneratedScale, mode: AlphaMode, stop: number): ColorStop => {
  if (stop === 0) {
    const p = mode === 'light' ? scale.paper0 : scale.paper0Dark
    if (!p) throw new Error(`alphaPapers: missing paper-0 extreme on ${scale.name} ${mode}`)
    return p
  }
  const s = (mode === 'light' ? scale.light : scale.dark)[stop - 1]
  if (!s || s.stop !== stop) throw new Error(`alphaPapers: stop mismatch ${scale.name} ${mode} ${stop}`)
  return s
}

// the visibility bar: what a light paper seam itself measures — the mean adjacent
// light-paper ΔE (house stopDeltaE) over the theme's family set
export function alphaSep(familyScales: GeneratedScale[]): number {
  let s = 0, n = 0
  for (const scale of familyScales)
    for (const [x, y] of [[1, 2], [2, 3]] as const) {
      s += stopDeltaE(stopAt(scale, 'light', x), stopAt(scale, 'light', y))
      n++
    }
  return s / n
}

export function alphaPapersFor(
  scale: GeneratedScale, neutral: GeneratedScale, mode: AlphaMode, sep: number,
): AlphaPaper[] {
  // fields = the four neutral papers (100/99/97/95), the surfaces the guarantee covers
  const fieldHexes = [0, 1, 2, 3].map(fs => stopHex(stopAt(neutral, mode, fs)))
  // K: the system's own dark loudness — dark plane seams over light plane seams
  const seamMean = (m: AlphaMode) => {
    const apps = [0, 1, 2, 3].map(fs => appOf(stopAt(neutral, m, fs)))
    return (Math.abs(apps[1] - apps[0]) + Math.abs(apps[2] - apps[1]) + Math.abs(apps[3] - apps[2])) / 3
  }
  const K = seamMean('dark') / seamMean('light')
  const darkGroundApp = appOf(stopAt(neutral, 'dark', 0))
  const lightWhiteApp = appOf(stopAt(scale, 'light', 0))
  const dls = PAPER_STOPS.map(sN => lightWhiteApp - appOf(stopAt(scale, 'light', sN)))
  const stepApp = K * (dls[2] - dls[0]) / 2
  const isNeutral = scale.name === 'neutral'

  const buildTwins = (lift: number): AlphaPaper[] => PAPER_STOPS.map((sN, i) => {
    const base = mode === 'light' ? stopAt(scale, 'light', sN) : stopAt(scale, 'dark', sN)
    const targetApp = mode === 'light' ? appOf(base) : darkGroundApp + K * dls[i] + lift
    // memoized per rung (targetApp and hue are fixed here): the bisections evaluate
    // the same candidate chromas repeatedly, and each miss costs a 34-step Nayatani
    // L-solve — the plugin-sandbox freeze lived in this line
    const textMemo = new Map<number, ColorStop>()
    const mkText = (c: number): ColorStop => {
      const hit = textMemo.get(c)
      if (hit) return hit
      const L = solveLForApparent(targetApp, c, base.H)
      const v = { ...base, L, C: clampChromaToGamut(L, c, base.H, 'srgb') }
      textMemo.set(c, v)
      return v
    }
    // the chroma boost trades photometric Y for H-K shine (L re-solves down at equal
    // apparent), and WCAG lives on Y — so the floor's search is CEILINGED by the pen
    // bars measured on this rung's own composite over the extreme paper. The law
    // outranks the look: a rung that cannot reach the bar under that ceiling ships
    // bar-capped, exactly like the near-white gamut cap.
    const extremeField = fieldHexes[3]
    const barsClearAtC = (c: number, a2: number): boolean => {
      const o = hexToOklch(compositeHex(stopHex(mkText(c)), extremeField, Math.ceil(a2 * 100) / 100))
      const bgY = shippedY(o.L, o.C, o.H)
      return TEXT_BARS.every(([st, bar]) => {
        const pen = stopAt(scale, mode, st)
        return contrastRatio(shippedY(pen.L, pen.C, pen.H), bgY) >= bar
      })
    }
    let a = 1, textC = base.C
    let capped: AlphaPaper['capped']
    for (let iter = 0; iter < 3; iter++) {
      const ih = stopHex(mkText(textC))
      a = 0
      for (const fHex of fieldHexes) {
        let lo = 0, hi = 1
        for (let j = 0; j < 22; j++) {
          const m = (lo + hi) / 2
          Math.abs(appHex(compositeHex(ih, fHex, m)) - targetApp) > ALPHA_TOL_APP ? (lo = m) : (hi = m)
        }
        a = Math.max(a, hi)
      }
      const minDE = (c: number) => Math.min(...fieldHexes.map(fHex =>
        stopDeltaE(hexToOklch(compositeHex(stopHex(mkText(c)), fHex, a)) as ColorStop, hexToOklch(fHex) as ColorStop)))
      const c0 = Math.min(base.C / Math.max(a, 0.05), 0.4)
      // the bar ceiling: the largest chroma in [c0, 0.4] the pen law allows
      let cBar = 0.4
      if (!barsClearAtC(0.4, a)) {
        if (!barsClearAtC(c0, a)) cBar = c0
        else {
          let lo = c0, hi = 0.4
          for (let j = 0; j < 18; j++) { const m = (lo + hi) / 2; barsClearAtC(m, a) ? (lo = m) : (hi = m) }
          cBar = lo
        }
      }
      let c = Math.min(c0, cBar)
      capped = undefined
      if (!isNeutral && minDE(c) < sep) {
        if (minDE(cBar) < sep) {
          c = cBar
          capped = cBar < 0.4 - 1e-6 ? 'text-bars' : 'gamut'
        } else {
          let lo = c, hi = cBar
          for (let j = 0; j < 18; j++) { const m = (lo + hi) / 2; minDE(m) < sep ? (lo = m) : (hi = m) }
          c = hi
        }
      }
      // converged: an unchanged chroma reproduces the identical bisections next pass
      const prev = textC
      textC = c
      if (Math.abs(c - prev) < 1e-9) break
    }
    return { stop: sN, name: OVERLAY_NAMES[sN], overlayHex: stopHex(mkText(textC)), alpha: Math.ceil(a * 100) / 100, ...(capped ? { capped } : {}) }
  })

  if (mode === 'light') return gateText(buildTwins(0), scale, neutral, 'light')
  // the pen-gated half-step lift, dark (one build reused — the gate never clamped a
  // real theme, so the fast path is the whole cost)
  const half = ALPHA_LIFT_FRACTION * stepApp
  const atHalf = buildTwins(half)
  if (textBarsClear(atHalf, scale, neutral, 'dark')) return gateText(atHalf, scale, neutral, 'dark')
  let lo = 0, hi = half
  for (let i = 0; i < 10; i++) {
    const m = (lo + hi) / 2
    textBarsClear(buildTwins(m), scale, neutral, 'dark') ? (lo = m) : (hi = m)
  }
  return gateText(buildTwins(lo), scale, neutral, 'dark')
}

// the paper/pen law as a gate: pencil-47/42/30 must keep 4.5/6.5/7.0 (shipped basis,
// the quantized rgba) against the WORST composite — the lightest overlay on the
// lightest field in dark, the darkest overlay on the darkest field in light
const TEXT_BARS: Array<[number, number]> = [[9, 4.5], [10, 6.5], [11, 7.0]]
function worstBgY(twins: AlphaPaper[], neutral: GeneratedScale, mode: AlphaMode): number {
  const fieldStop = mode === 'dark' ? 3 : 3 // dark: high (lightest); light: sunken (darkest) — both are neutral paper-5
  const fHex = stopHex(stopAt(neutral, mode, fieldStop))
  const ys = twins.map(tw => {
    const o = hexToOklch(compositeHex(tw.overlayHex, fHex, tw.alpha))
    return shippedY(o.L, o.C, o.H)
  })
  return mode === 'dark' ? Math.max(...ys) : Math.min(...ys)
}
function textBarsClear(twins: AlphaPaper[], scale: GeneratedScale, neutral: GeneratedScale, mode: AlphaMode): boolean {
  const bgY = worstBgY(twins, neutral, mode)
  return TEXT_BARS.every(([st, bar]) => {
    const pen = stopAt(scale, mode, st)
    return contrastRatio(shippedY(pen.L, pen.C, pen.H), bgY) >= bar
  })
}
// light has no lift to bisect; a bar failure clamps the overlay's downward deviation
// by raising its alpha until the pair holds (the composite converges on the solid,
// which passes by the pen's own require)
function gateText(twins: AlphaPaper[], scale: GeneratedScale, neutral: GeneratedScale, mode: AlphaMode): AlphaPaper[] {
  if (textBarsClear(twins, scale, neutral, mode)) return twins
  const out = twins.map(t => ({ ...t }))
  // walk to convergence — alpha 1.0 is the guaranteed ceiling (the composite IS the
  // solid there, and the solid pair passes by the pen's own require + shipped floor).
  // The step cap must reach 1.0 from any base; a short walk returned a still-failing
  // set silently (alpha-audit caught it on the achromatic seed).
  while (!textBarsClear(out, scale, neutral, mode) && out.some(t => t.alpha < 1))
    for (const t of out) t.alpha = Math.min(1, Math.round((t.alpha + 0.01) * 100) / 100)
  return out
}
