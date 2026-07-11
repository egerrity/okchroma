// Full-gamut sweep: the dataset is a sample of clients, not the input
// domain. This walks brand space (hue x lightness x chroma) through the
// complete resolution pipeline and asserts the rules are total:
//
//   1. Never crashes; always yields 11+11 finite stops and an on-fill
//      (contiguous stops 1-11 per side; old stop 10 deleted 778d4b4, ink renumbered down 2026-07-10).
//   2. The error guarantee: every error collision is RESOLVED — by the C12 v8
//      joint solve (brand nearest-edge exit and/or per-brand red complement;
//      rung-1 and the component rule are deleted).
//      A residual collision is a failure.
//   3. The shear never pushes a brand INTO a collision it didn't have.
//   4. Every warning collision resolves to a variant (lemon or macaroni).
//
// Residual non-error collisions (success/info pending design, yellow
// partial mitigation) are reported as counts, not failures.

import { generateScale } from '../src/engine/colorEngine'
import { clampChromaToGamut, oklchToLinearRgb } from '../src/engine/constraints'
import { resolveBrand, SIGNAL_SCALES } from '../src/engine/resolve'
import { RED_GATE, redGateDist, checkCollision, checkHueCollision } from '../src/engine/collision'

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

const HUES = Array.from({ length: 120 }, (_, i) => i * 3) // every 3 degrees
const LIGHTNESSES = [0.25, 0.4, 0.55, 0.7, 0.85]
const CHROMAS = [0.06, 0.13, 0.2]

let total = 0
let crashed = 0
const errorResidual: string[] = []
const shearInduced: string[] = []
const warningUnhandled: string[] = []
let repelCount = 0
let shearCount = 0
let lemonCount = 0
let macaroniCount = 0
const pendingCounts: Record<string, number> = {}

for (const H of HUES) {
  for (const L of LIGHTNESSES) {
    for (const C of CHROMAS) {
      const hex = oklchToHex(L, C, H)
      total++
      try {
        const r = resolveBrand(hex, 'sweep')

        // 1. structural sanity
        const all = [...r.scale.light, ...r.scale.dark]
        if (r.scale.light.length !== 11 || r.scale.dark.length !== 11 || all.some(s => !isFinite(s.L) || !isFinite(s.r))) {
          crashed++
          console.error(`MALFORMED at ${hex}: light=${r.scale.light.length} dark=${r.scale.dark.length}`)
          continue
        }

        if (r.shearDeg !== 0) shearCount++
        if (r.redRepel) repelCount++
        if (r.warningVariant === 'lemon') lemonCount++
        if (r.warningVariant === 'macaroni') macaroniCount++
        for (const p of r.pending) pendingCounts[p] = (pendingCounts[p] ?? 0) + 1

        // 2. error guarantee (C12 gate): NO brand cta may sit inside the owner-calibrated
        // red-family gate — the joint solve releases past the boundary by construction
        const err = SIGNAL_SCALES.get('red')!
        if (redGateDist(r.scale.cta, err.scale.cta) <= RED_GATE.G - 1e-3) {
          errorResidual.push(`${hex} (L${L} C${C} H${H})`)
        }

        // 3. shear must not create a collision the base didn't have
        if (r.shearDeg !== 0) {
          const base = generateScale(hex, 'base')
          for (const { def, scale: sig } of SIGNAL_SCALES.values()) {
            const before = checkCollision(base, sig, def, 'light').collides
            const sheared = generateScale(hex, 'sheared', undefined, { hueShiftDeg: r.shearDeg })
            const after = checkCollision(sheared, sig, def, 'light').collides
            if (!before && after) shearInduced.push(`${hex} -> ${def.name} (shear ${r.shearDeg.toFixed(1)})`)
          }
        }

        // 4. warning collisions always resolve to a variant — "collision" = the TYPE-1
        //    hue gate (CATALOG C7 split), the same test warningVariant itself runs
        const warn = SIGNAL_SCALES.get('yellow')!
        if (checkHueCollision(r.scale, warn.scale, warn.def).collides && r.warningVariant === null) {
          warningUnhandled.push(hex)
        }
      } catch (e) {
        crashed++
        console.error(`CRASH at ${hex}: ${e}`)
      }
    }
  }
}

console.log(`swept ${total} brand colors (${HUES.length} hues x ${LIGHTNESSES.length} L x ${CHROMAS.length} C)`)
console.log(`crashes/malformed: ${crashed}`)
console.log(`sheared: ${shearCount} | red repel: ${repelCount} | lemon: ${lemonCount} | macaroni: ${macaroniCount}`)
console.log(`pending (unresolved non-error): ${JSON.stringify(pendingCounts)}`)
console.log(`ERROR residual without a resolution: ${errorResidual.length}`)
errorResidual.slice(0, 10).forEach(s => console.log(`  ${s}`))
console.log(`shear-induced new collisions: ${shearInduced.length}`)
shearInduced.slice(0, 10).forEach(s => console.log(`  ${s}`))
console.log(`warning collisions without a variant: ${warningUnhandled.length}`)
warningUnhandled.slice(0, 10).forEach(s => console.log(`  ${s}`))

const failed = crashed > 0 || errorResidual.length > 0 || shearInduced.length > 0 || warningUnhandled.length > 0
if (failed) {
  console.error('SWEEP FAILED')
  process.exit(1)
}
