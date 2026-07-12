// secondary-default-model.ts — the DEFAULT secondary as a SEED TRANSFORM (owner direction
// 2026-07-12, superseding the quiet-cta register for the default: "a model that slightly
// rotates the hue, moves the L relative to how much room there is on L + the seed L, and the
// chroma slightly relative to the seed and how much room there is" — then it falls out of the
// engine normally; no pinned cta, no bespoke curve, primary-independent by construction).
//
//   H' = H + rot                         (slight rotation — sign ladder below)
//   L' = L + kL · (L_ROOM − L)           (proportional to remaining room toward the light pole
//                                          → the delta shrinks as the seed nears the background)
//   C' = min(kC · C, kR · maxC(L', H'))  (gently relative to the seed, bounded by the room)
//
// NOTHING WIRED — a knob ladder for her eye. Each cell = the transformed seed resolved as a
// normal brand ramp (resolveBrand, secondary convention: collisions skipped).
import { writeFileSync, mkdirSync } from 'fs'
import { resolveBrand } from '/Users/emilygerrity/okchroma/src/engine/resolve'
import { hexToOklch, maxChromaAt } from '/Users/emilygerrity/okchroma/src/engine/colorMath'
import { clampChromaToGamut, oklchToLinearRgb } from '/Users/emilygerrity/okchroma/src/engine/constraints'

const gm = (v: number) => { const x = Math.min(1, Math.max(0, v)); return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055 }
const hxLCH = (L: number, C: number, H: number) => {
  const cc = clampChromaToGamut(L, C, H)
  const [rl, gl, bl] = oklchToLinearRgb(L, cc, H)
  const ch = (v: number) => Math.round(gm(v) * 255).toString(16).padStart(2, '0')
  return `#${ch(rl)}${ch(gl)}${ch(bl)}`
}
const hx = (c: { L: number; C: number; H: number }) => hxLCH(c.L, c.C, c.H)

const L_ROOM = 0.97   // the light pole the room is measured against (paper-adjacent)
const SETTINGS = [
  { key: 'A · gentle', rot: 6, kL: 0.35, kC: 0.75, kR: 0.5 },
  { key: 'B · medium', rot: 8, kL: 0.5, kC: 0.6, kR: 0.45 },
  { key: 'C · strong', rot: 12, kL: 0.65, kC: 0.5, kR: 0.4 },
]
const HUES = [
  ['#004E75', 'navy'], ['#3B82F6', 'blue'], ['#0E7490', 'teal'], ['#3BA55C', 'green'],
  ['#C8FF00', 'chartreuse'], ['#E7EA3E', 'yellow'], ['#B45309', 'gold'], ['#DC2626', 'red'],
  ['#DB2777', 'pink'], ['#9000FF', 'violet'],
]

const liftedSeed = (hex: string, s: typeof SETTINGS[number]) => {
  const seed = hexToOklch(hex)
  const L2 = seed.L + s.kL * Math.max(0, L_ROOM - seed.L)
  const H2 = (seed.H + s.rot + 360) % 360
  const C2 = Math.min(s.kC * seed.C, s.kR * maxChromaAt(L2, H2))
  return hxLCH(L2, C2, H2).toUpperCase()
}

const card = (scale: any, title: string, sub: string, primaryBtn?: { bg: string; fg: string }) => {
  const at = (n: number) => scale.light[n - 1]
  const ink11 = hx(at(11)), ink10 = hx(at(10)), hl9 = hx(at(9)), wash3 = hx(at(3)), p1 = hx(at(1))
  const cta = hx(scale.cta)
  const onCta = scale.onFillTextIsWhite ? '#fff' : ink11
  const strip = scale.light.map((st: any) => `<div class="chip" style="background:${hx(st)}"></div>`).join('')
  // the PRIMARY cta rendered INSIDE the card beside the candidate's (owner ask: the eyeball
  // needs them adjacent on the same ground)
  const primBtn = primaryBtn ? `<div class="btn" style="background:${primaryBtn.bg};color:${primaryBtn.fg}">Primary cta</div>` : ''
  return `<div class="card" style="background:${p1}"><div class="ctitle">${title} <span class="cnote">${sub}</span></div>
<div class="h" style="color:${ink11}">Aa Heading</div>
<div class="b" style="color:${ink10}">Body copy in the ink register.</div>
<div class="btnrow">${primBtn}<div class="btn" style="background:${cta};color:${onCta}">${primaryBtn ? 'Secondary cta' : 'cta-1 button'}</div></div>
<div class="insets"><div class="inset" style="background:${wash3};color:${ink10}">wash inset</div>
<div class="inset" style="background:${hl9};color:${p1}">highlight inset</div></div>
<div class="strip">${strip}</div></div>`
}

const rows: string[] = []
for (const [hex, name] of HUES) {
  const prim = resolveBrand(hex, 'p', { contrastProfile: 'apca' }).scale
  const primBtn = { bg: hx(prim.cta), fg: prim.onFillTextIsWhite ? '#fff' : hx(prim.light[10]) }
  const cells = [card(prim, 'PRIMARY', hex)]
  for (const s of SETTINGS) {
    const lifted = liftedSeed(hex, s)
    const sec = resolveBrand(lifted, 'secondary', { skipCollisionRules: true, contrastProfile: 'apca' } as any).scale
    cells.push(card(sec, s.key, lifted, primBtn))
  }
  rows.push(`<div class="row"><div class="rlab"><div class="idsw" style="background:${hex}"></div><b>${hex}</b>&nbsp;${name}</div>
<div class="cards">${cells.join('')}</div></div>`)
}

const html = `<!doctype html><meta charset="utf-8"><title>Default secondary — seed-transform ladder</title>
<style>
  body { font: 14px/1.5 -apple-system, sans-serif; margin:0; background:#faf9f7; color:#1a1a1a; }
  .note { padding:.9rem 1.4rem; background:#f2f0ec; font-size:.86rem; }
  .row { padding:.8rem 1.4rem; border-bottom:1px solid #e7e4de; }
  .rlab { display:flex; gap:.5rem; align-items:center; font-weight:700; font-size:.82rem; margin-bottom:.5rem; }
  .idsw { width:20px; height:20px; border-radius:5px; }
  .cards { display:flex; gap:.9rem; flex-wrap:wrap; }
  .card { width:250px; border:1px solid #e7e4de; border-radius:12px; padding:.7rem; }
  .ctitle { font-size:.6rem; text-transform:uppercase; letter-spacing:.04em; opacity:.6; margin-bottom:.35rem; }
  .cnote { text-transform:none; letter-spacing:0; }
  .h { font-weight:800; font-size:1.02rem; }
  .b { font-size:.72rem; margin:.1rem 0 .45rem; }
  .btn { display:inline-flex; padding:.4rem .85rem; border-radius:17px; font-weight:700; font-size:.74rem; }
  .btnrow { display:flex; gap:.4rem; margin-bottom:.45rem; flex-wrap:wrap; }
  .insets { display:flex; gap:.35rem; margin-bottom:.45rem; }
  .inset { flex:1; border-radius:7px; padding:.4rem .45rem; font-size:.62rem; }
  .strip { display:flex; gap:2px; }
  .chip { flex:1; height:22px; border-radius:3px; }
</style>
<div class="note"><b>DEFAULT secondary — the seed-transform model (nothing wired).</b> Light mode, APCA.
H' = seed + rot · L' = seed L + kL·(room to ${L_ROOM}) — the delta shrinks as the seed nears the background · C' = kC·seed C, bounded by kR·chroma-room at the landing. The lifted seed then resolves as a NORMAL ramp (cta and all falls out of the engine).<br>
Ladder: <b>A gentle</b> (rot 6° · kL .35 · kC .75) · <b>B medium</b> (rot 8° · kL .5 · kC .6) · <b>C strong</b> (rot 12° · kL .65 · kC .5). Pick a column (or call out per-knob moves — rotation direction included: all three rotate +, say the word if it should go −).</div>
${rows.join('')}`

mkdirSync('/Users/emilygerrity/okchroma/render', { recursive: true })
writeFileSync('/Users/emilygerrity/okchroma/render/secondary-default-model.html', html)
console.log('written -> render/secondary-default-model.html')
