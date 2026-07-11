// c12-split-wired-check.ts — MIRROR VALIDATION (the recurring trap: sim-vs-pipeline drift;
// mirror-validate ALWAYS). The wired engine vs the owner-blessed instrument (vivid-rule-probe
// .json, 28/28 holds): for every blessed brand, resolveBrand must produce (1) the red variant
// at the rule's exact position (hex byte-match), (2) the brand cta at min(seed+brandDL, cap)
// — the instrument rendered RAW, the wire caps at the white-window top (owner pick (a)), so
// brand hex must byte-match wherever target ≤ cap and sit AT the cap otherwise.
import { resolveBrand, signalScalesFor } from '/Users/emilygerrity/okchroma/src/engine/resolve'
import { hexToOklch, vividSplit, hueDelta } from '/Users/emilygerrity/okchroma/src/engine/colorMath'
import { clampChromaToGamut, oklchToLinearRgb } from '/Users/emilygerrity/okchroma/src/engine/constraints'
import { readFileSync } from 'fs'
const probe = JSON.parse(readFileSync('/Users/emilygerrity/okchroma/scripts/c12-session/vivid-rule-probe.json', 'utf8'))

const hx = (L: number, C: number, H: number) => {
  const c = clampChromaToGamut(L, C, H)
  const [rl, gl, bl] = oklchToLinearRgb(L, c, H)
  const gm = (v: number) => { const x = Math.min(1, Math.max(0, v)); return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055 }
  const ch = (v: number) => Math.round(gm(v) * 255).toString(16).padStart(2, '0')
  return `#${ch(rl)}${ch(gl)}${ch(bl)}`
}
const redCta = signalScalesFor('apca').get('red')!.scale.cta

let pass = 0, fail = 0
for (const b of (probe as any).brands) {
  const rb = resolveBrand(b.hex, 'check', { contrastProfile: 'apca' })
  const seed = hexToOklch(b.hex)
  const split = vividSplit(hueDelta(seed.H, redCta.H))
  const ov = rb.signalOverrides.find(o => o.name === 'red')
  const errs: string[] = []

  // red side: exact rule position, byte hex vs the blessed page
  if (!ov) errs.push('NO red variant')
  else {
    const got = hx(ov.scale.cta.L, ov.scale.cta.C, ov.scale.cta.H)
    if (got.toLowerCase() !== b.red.hex.toLowerCase()) errs.push(`variant ${got} != blessed ${b.red.hex}`)
    if (Math.abs(ov.scale.cta.L - (redCta.L + split.redDL)) > 1e-9) errs.push(`variant L ${ov.scale.cta.L.toFixed(4)} != rule ${(redCta.L + split.redDL).toFixed(4)}`)
  }

  // brand side: min(target, cap); raw target byte-match when uncapped
  const target = seed.L + split.brandDL
  const gotBrand = hx(rb.scale.cta.L, rb.scale.cta.C, rb.scale.cta.H)
  if (split.brandDL >= 0.005) {
    if (rb.scale.cta.L > target + 1e-6) errs.push(`brand L ${rb.scale.cta.L.toFixed(4)} ABOVE target ${target.toFixed(4)}`)
    const capped = rb.scale.cta.L < target - 1e-6
    if (!capped && gotBrand.toLowerCase() !== b.brand.hex.toLowerCase()) errs.push(`brand ${gotBrand} != blessed ${b.brand.hex} (uncapped)`)
    if (capped) console.log(`  (cap) ${b.hex}: target L${target.toFixed(3)} -> wired L${rb.scale.cta.L.toFixed(3)} (${gotBrand})`)
    if (!rb.redRepel?.light) errs.push('brand moved but redRepel flag unset')
  } else {
    // brandDL trivial → no arc opt: the brand cta is the untouched pipeline value (the
    // instrument rendered RAW seed-L swatches, the pipeline ships the enforced cta — a
    // rendition difference that predates this round, not drift). Assert only no-flag.
    if (rb.redRepel?.light) errs.push('no-move brand unexpectedly flagged repelled')
  }

  if (errs.length) { fail++; console.log(`FAIL ${b.hex} (${b.tag}): ${errs.join(' · ')}`) }
  else pass++
}
console.log(`\n${pass}/${(probe as any).brands.length} pass, ${fail} fail`)
if (fail) process.exit(1)
