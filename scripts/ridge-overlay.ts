// Gamut-ridge vs GOLD_SPINE overlay — is the hand-fitted spine secretly
// the sRGB chroma ridge? For each lightness: which warm hue holds the
// most chroma (the ridge), how much room it has, how much room the spine
// hue has, and the delta between them. Read-only evidence for the
// geometry-vs-taste separation plan.
import { clampChromaToGamut } from '../src/engine/constraints'
import { GOLD_SPINE } from '../src/engine/stopTable'

const maxChromaAt = (L: number, H: number) => clampChromaToGamut(L, 0.52, H)

function spineAt(L: number): number {
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

// hard argmax + a soft (chroma-weighted mean) version: the ridge has a
// corner at the yellow primary, the soft form shows what a smoothed
// ridge looks like
console.log('L      ridgeH  softH  spineH  Δ(spine−ridge)  C@ridge  C@spine  C@H93(yellow)')
for (let L = 0.25; L <= 0.985; L += 0.04) {
  let bestH = 20
  let bestC = 0
  let wSum = 0
  let whSum = 0
  for (let H = 20; H <= 140; H += 0.5) {
    const c = maxChromaAt(L, H)
    if (c > bestC) {
      bestC = c
      bestH = H
    }
    const w = c ** 4 // sharpen toward the peak
    wSum += w
    whSum += w * H
  }
  const soft = whSum / wSum
  const sp = spineAt(L)
  console.log(
    `${L.toFixed(2)}   ${bestH.toFixed(0).padStart(5)}  ${soft.toFixed(0).padStart(5)}  ${sp.toFixed(0).padStart(6)}  ${(sp - bestH).toFixed(0).padStart(14)}  ${bestC.toFixed(3).padStart(7)}  ${maxChromaAt(L, sp).toFixed(3).padStart(7)}  ${maxChromaAt(L, 93).toFixed(3).padStart(13)}`
  )
}

// cusp L per landmark hue: how much room each hue has, and where
console.log('\nhue   cuspL   maxC   (C at L0.4 / L0.7 / L0.9)')
for (const H of [29, 55, 70, 83, 93, 110]) {
  let cuspL = 0
  let cuspC = 0
  for (let L = 0.05; L <= 0.99; L += 0.005) {
    const c = maxChromaAt(L, H)
    if (c > cuspC) {
      cuspC = c
      cuspL = L
    }
  }
  console.log(
    `${String(H).padStart(3)}   ${cuspL.toFixed(2)}   ${cuspC.toFixed(3)}   ${maxChromaAt(0.4, H).toFixed(3)} / ${maxChromaAt(0.7, H).toFixed(3)} / ${maxChromaAt(0.9, H).toFixed(3)}`
  )
}
