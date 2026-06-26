// Quick probe: does HelmLab's MetricSpace L behave as an apparent-lightness
// predictor (saturated > gray, per H-K), or as something else? Compare at a
// fixed OKLCH L against the gray and the two classical H-K models.
import { Helmlab } from 'helmlab'
import { nayataniApparentL, fairchildApparentL, oklchToHex, grayApparentL, baseLstar } from './helmk-lib'

const hl = new Helmlab()
const L = 0.738
const grayHelm = hl.info(oklchToHex(L, 0, 0)).L
console.log(`\nAt OKLCH L=${L}, C=0.16.  GRAY: HelmL=${grayHelm.toFixed(3)}  Nayatani=${grayApparentL(L).toFixed(2)}\n`)
console.log('  hue   nominalL*   HelmL  (Δ vs gray)   Nayatani (Δ)   Fairchild')
for (const H of [0, 55, 92, 150, 210, 255, 290]) {
  const helm = hl.info(oklchToHex(L, 0.16, H)).L
  const nay = nayataniApparentL(L, 0.16, H)
  const fair = fairchildApparentL(L, 0.16, H)
  const base = baseLstar(L, 0.16, H)
  const dHelm = helm - grayHelm
  const dNay = nay - grayApparentL(L)
  console.log(
    `  ${String(H).padStart(3)}°   ${base.toFixed(1).padStart(6)}   ${helm.toFixed(3)} (${dHelm >= 0 ? '+' : ''}${dHelm.toFixed(3)})    ${nay.toFixed(1).padStart(5)} (${dNay >= 0 ? '+' : ''}${dNay.toFixed(1)})     ${fair.toFixed(1)}`
  )
}
console.log('\n  H-K theory: saturated colors should read LIGHTER than gray (Δ > 0),')
console.log('  strongest at blue/violet. Check which predictor actually does that.\n')
