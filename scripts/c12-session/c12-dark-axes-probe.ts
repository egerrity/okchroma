// dark de-confliction axes probe: brand dark anchor (L0.63 vivid warm) vs red dark (0.593)
// — which moves reach helmlab >= 0.12 without dead-zone/floor violations?
import { Helmlab } from 'helmlab'
import { signalScalesFor } from '/Users/emilygerrity/okchroma/src/engine/resolve'
import { redGateDist } from '/Users/emilygerrity/okchroma/src/engine/colorMath'
import { whiteTextLcAt, apcaYAt } from '/Users/emilygerrity/okchroma/src/reqtoken/producers'
import { clampChromaToGamut, oklchToLinearRgb, apcaLc } from '/Users/emilygerrity/okchroma/src/engine/constraints'
const hl = new Helmlab()
const hx = (L: number, C: number, H: number) => {
  const c = clampChromaToGamut(L, C, H)
  const [rl, gl, bl] = oklchToLinearRgb(L, c, H)
  const gm = (v: number) => { const x = Math.min(1, Math.max(0, v)); return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055 }
  const ch = (v: number) => Math.round(gm(v) * 255).toString(16).padStart(2, '0')
  return `#${ch(rl)}${ch(gl)}${ch(bl)}`
}
const bLc = (L: number, C: number, H: number) => Math.abs(apcaLc(apcaYAt(0, 0, 0), apcaYAt(L, C, H)))
const red = signalScalesFor('apca').get('red')!.scale.ctaDark
const RED = hx(red.L, red.C, red.H)
// representative fired dark anchors (from sim: brands pulled to ~0.63, various hue/chroma)
const BRANDS = [
  { H: 24, C: 0.19, L: 0.63 }, { H: 32, C: 0.19, L: 0.63 }, { H: 40, C: 0.17, L: 0.63 }, { H: 16, C: 0.17, L: 0.63 },
]
console.log('axis candidates: helmlab diff vs red dark · gate dist · best text Lc  (bar: diff>=0.12, gate>=0.095, Lc>=60)')
for (const b of BRANDS) {
  console.log(`brand H${b.H} C${b.C} L${b.L}:`)
  const cand: Array<[string, number, number, number]> = []
  const add = (name: string, L: number, C: number, H: number) => {
    const d = hl.difference(hx(L, C, H), RED)
    const g = redGateDist({ L, C: clampChromaToGamut(L, C, H), H }, red)
    const lc = Math.max(whiteTextLcAt(L, clampChromaToGamut(L, C, H), H), bLc(L, clampChromaToGamut(L, C, H), H))
    cand.push([name, d, g, lc])
  }
  add('up to zone edge L0.695', 0.695, b.C, b.H)
  add('past zone L0.78', 0.78, b.C, b.H)
  add('shelf L0.82', 0.82, b.C, b.H)
  add('down deep L0.48', 0.48, b.C, b.H)
  add('down deep L0.44', 0.44, b.C, b.H)
  add('hue +14 same L', b.L, b.C, b.H + 14)
  add('hue +20 same L', b.L, b.C, b.H + 20)
  add('hue -16 same L', b.L, b.C, b.H - 16)
  add('dust C0.10 same L', b.L, 0.10, b.H)
  add('dust C0.08 same L', b.L, 0.08, b.H)
  add('L0.68 + hue+12', 0.68, b.C, b.H + 12)
  add('L0.68 + dust C0.12', 0.68, 0.12, b.H)
  add('L0.50 + hue+10', 0.50, b.C, b.H + 10)
  for (const [n, d, g, lc] of cand) {
    const ok = d >= 0.12 && g >= 0.095 && lc >= 60
    console.log(`  ${ok ? 'PASS' : '    '} ${n}: diff ${d.toFixed(3)} · gate ${g.toFixed(3)} · Lc ${lc.toFixed(0)}`)
  }
}
