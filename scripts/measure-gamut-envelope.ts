// MEASURE TASK — gamut envelope at the blessed dark Ls.
// For each blessed dark L (stops 1–12), compute the max in-gamut OKLCH chroma
// at that L for hues every 15° (0..345). Identify where the gamut SELF-CLAMPS
// (high-L yellow/green near the cusp) vs where it allows high chroma
// (mid-L blue/red/violet).
import { clampChromaToGamut } from '../src/engine/constraints'

const DARK_NEUTRAL_L = [0.178, 0.213, 0.252, 0.285, 0.313, 0.348, 0.42, 0.55, 0.66, 0.72, 0.80, 0.93]
const HUGE_C = 0.6 // larger than any sRGB OKLCH chroma; binary-searched down to the cusp
const HUES: number[] = []
for (let h = 0; h < 360; h += 15) HUES.push(h)

type PerStop = {
  stop: number
  L: number
  maxChromaByHue: { hue: number; maxC: number }[]
}

const perStop: PerStop[] = DARK_NEUTRAL_L.map((L, i) => ({
  stop: i + 1,
  L,
  maxChromaByHue: HUES.map((hue) => ({
    hue,
    maxC: Math.round(clampChromaToGamut(L, HUGE_C, hue) * 10000) / 10000,
  })),
}))

// --- Human-readable table ---
const pad = (s: string, n: number) => s.padStart(n)
const header = ['stop', 'L', ...HUES.map((h) => `${h}`)]
console.log(header.map((h, i) => pad(h, i < 2 ? 5 : 7)).join(''))
for (const row of perStop) {
  const cells = [
    pad(String(row.stop), 5),
    pad(row.L.toFixed(3), 5),
    ...row.maxChromaByHue.map((c) => pad(c.maxC.toFixed(3), 7)),
  ]
  console.log(cells.join(''))
}

// --- Self-clamp analysis ---
// For each hue, find which stops are the bottleneck (lowest gamut-max chroma).
console.log('\n--- per-hue gamut-max envelope across stops (min..max) ---')
console.log(pad('hue', 5) + pad('minC', 8) + pad('@stop', 7) + pad('maxC', 8) + pad('@stop', 7))
for (let hi = 0; hi < HUES.length; hi++) {
  const hue = HUES[hi]
  let minC = Infinity, minStop = 0, maxC = -Infinity, maxStop = 0
  for (const row of perStop) {
    const c = row.maxChromaByHue[hi].maxC
    if (c < minC) { minC = c; minStop = row.stop }
    if (c > maxC) { maxC = c; maxStop = row.stop }
  }
  console.log(
    pad(String(hue), 5) +
    pad(minC.toFixed(3), 8) + pad(String(minStop), 7) +
    pad(maxC.toFixed(3), 8) + pad(String(maxStop), 7)
  )
}

// Emit JSON for programmatic consumption / the structured return.
console.log('\n---JSON---')
console.log(JSON.stringify(perStop))
