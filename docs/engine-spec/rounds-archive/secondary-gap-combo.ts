// secondary-gap-combo.ts — the owner-specified COMBO (2026-07-12): "a min of g10 in light
// but a flat g23 in dark". LIGHT = the DEFAULT seed transform with a MINIMUM apparent gap of
// 10 from the light ground (only near-white brands move — chartreuse/yellow; the approved
// light look otherwise holds). DARK = FLAT: every derived dark cta placed at exactly
// groundApp + 23 (navy's own register, "where navy sits") — even by construction, not a
// carry. WIRED 2026-07-12 (owner "this looks good!"): registers live in DEFAULT_SECONDARY
// (minGapApp 10 → defaultSecondarySeed; darkFlatGapApp 23 → opts.darkCtaFlatApp, consumed by
// the resolver's dark cta placement). The wired columns below draw from the REAL pipeline
// (resolveTheme derived); "carry ref" stays as the uneven comparison.
// Primary cta inside every strip on its real ground.
import { writeFileSync, mkdirSync } from 'fs'
import { resolveBrand, resolveTheme, DEFAULT_SECONDARY } from '/Users/emilygerrity/okchroma/src/engine/resolve'
import { deltaDarkTargetL } from '/Users/emilygerrity/okchroma/src/reqtoken/producers'
import { apparentL, solveLForApparent, grayApparentL } from '/Users/emilygerrity/okchroma/src/engine/perceptualL'
import { generateNeutralScale } from '/Users/emilygerrity/okchroma/src/engine/colorEngine'
import { hexToOklch, maxChromaAt, makeStop, onTextIsWhite } from '/Users/emilygerrity/okchroma/src/engine/colorMath'
import { clampChromaToGamut, oklchToLinearRgb, apcaY } from '/Users/emilygerrity/okchroma/src/engine/constraints'

const WHITE_APP = grayApparentL(1.0)
const GROUND_APP = grayApparentL(0.178)
const LIGHT_MIN_GAP = 10
const DARK_FLAT_GAP = 23

const gm = (v: number) => { const x = Math.min(1, Math.max(0, v)); return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055 }
const hxLCH = (L: number, C: number, H: number) => {
  const cc = clampChromaToGamut(L, C, H)
  const [rl, gl, bl] = oklchToLinearRgb(L, cc, H)
  const ch = (v: number) => Math.round(gm(v) * 255).toString(16).padStart(2, '0')
  return `#${ch(rl)}${ch(gl)}${ch(bl)}`
}
const hx = (c: { L: number; C: number; H: number }) => hxLCH(c.L, c.C, c.H)

// the DEFAULT transform with the light minimum gap (two passes settle L↔C)
const gapSeed = (hex: string, G: number) => {
  const seed = hexToOklch(hex)
  const d = DEFAULT_SECONDARY
  let L2 = seed.L + d.kL * Math.max(0, d.lRoom - seed.L)
  const H2 = (seed.H + d.rot + 360) % 360
  let C2 = Math.min(d.kC * seed.C, d.kR * maxChromaAt(L2, H2))
  for (let i = 0; i < 2; i++) {
    if (WHITE_APP - apparentL(L2, clampChromaToGamut(L2, C2, H2), H2) < G) {
      L2 = solveLForApparent(WHITE_APP - G, C2, H2)
      C2 = Math.min(d.kC * seed.C, d.kR * maxChromaAt(L2, H2))
    }
  }
  return hxLCH(L2, C2, H2)
}

const HUES = [
  ['#004E75', 'navy'], ['#3B82F6', 'blue'], ['#0E7490', 'teal'], ['#3BA55C', 'green'],
  ['#C8FF00', 'chartreuse'], ['#E7EA3E', 'yellow'], ['#B45309', 'gold'], ['#DC2626', 'red'],
  ['#DB2777', 'pink'], ['#9000FF', 'violet'],
]

const cell = (label: string, bg: string, white: boolean, sub: string) =>
  `<div class="cell"><div class="lab">${label}</div><div class="btn" style="background:${bg};color:${white ? '#fff' : '#000'}">Secondary</div><div class="lab">${sub}</div></div>`

const rows: string[] = []
for (const [hex, name] of HUES) {
  const t = resolveTheme({ primaryHex: hex, deriveSecondary: true, contrastProfile: 'apca' })
  const p = t.primary.scale, cur = t.secondary!.scale
  const nScale = generateNeutralScale(hexToOklch(hex).H, 'default', 'apca')
  const darkGround = nScale.paper0Dark ? hx(nScale.paper0Dark) : '#141416'
  const lightGround = hx(cur.light[0])

  // reference: what the pure carry of the wired light cta gives
  const carryL = deltaDarkTargetL({ L: cur.cta.L, C: cur.cta.C, H: cur.cta.H }, cur.ctaDark.C, cur.ctaDark.H)
  const carry = makeStop(9, carryL, cur.ctaDark.C, cur.ctaDark.H)
  const carryWhite = onTextIsWhite(apcaY(carry.r, carry.g, carry.b), carry.L, carry.C, carry.H, false)

  const lightStrip = `<div class="strip" style="background:${lightGround}">
<div class="cell"><div class="lab">PRIMARY</div><div class="btn" style="background:${hx(p.cta)};color:${p.onFillTextIsWhite ? '#fff' : '#000'}">Primary</div><div class="lab">&nbsp;</div></div>
${cell(`min G≥${LIGHT_MIN_GAP} · wired`, hx(cur.cta), cur.onFillTextIsWhite, `L ${cur.cta.L.toFixed(2)}`)}</div>`

  const darkStrip = `<div class="strip dark" style="background:${darkGround}">
<div class="cell"><div class="lab">PRIMARY</div><div class="btn" style="background:${hx(p.ctaDark)};color:${p.onFillTextIsWhiteDark ? '#fff' : '#000'}">Primary</div><div class="lab">&nbsp;</div></div>
${cell('carry ref', hx(carry), carryWhite, `L ${carry.L.toFixed(2)}`)}
${cell(`flat G${DARK_FLAT_GAP} · wired`, hx(cur.ctaDark), cur.onFillTextIsWhiteDark, `L ${cur.ctaDark.L.toFixed(2)}`)}</div>`

  rows.push(`<div class="row"><div class="rlab"><div class="idsw" style="background:${hex}"></div><b>${hex}</b>&nbsp;${name}</div>
<div class="pair">${lightStrip}${darkStrip}</div></div>`)
}

const html = `<!doctype html><meta charset="utf-8"><title>Derived secondary — light min G10 · dark flat G23</title>
<style>
  body { font: 14px/1.5 -apple-system, sans-serif; margin:0; background:#faf9f7; color:#1a1a1a; }
  .note { padding:.9rem .9rem; background:#f2f0ec; font-size:.86rem; }
  .row { padding:.7rem .9rem .2rem; }
  .rlab { display:flex; gap:.5rem; align-items:center; font-weight:700; font-size:.82rem; margin-bottom:.35rem; }
  .idsw { width:20px; height:20px; border-radius:5px; }
  .pair { display:flex; gap:.4rem; }
  .strip { display:flex; gap:.7rem; padding:.5rem .6rem; border-radius:10px; border:1px solid #e7e4de; margin-bottom:.4rem; flex:1; }
  .strip.dark { border-color:#2a2a2e; }
  .cell { display:flex; flex-direction:column; align-items:center; gap:.15rem; }
  .lab { font-size:.56rem; text-transform:uppercase; letter-spacing:.03em; opacity:.6; }
  .strip.dark .lab { color:#cfcfcf; }
  .btn { min-width:82px; height:36px; border-radius:18px; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:.72rem; padding:0 .7rem; }
</style>
<div class="note"><b>The combo: light minimum G≥10 · dark FLAT G23 — WIRED (owner "this looks good!").</b><br>
LIGHT keeps the approved seed transform, floored so no derived seed sits closer than 10 apparent units to the background — only chartreuse/yellow move.
DARK is flat: every derived cta placed at exactly 23 apparent units above the dark ground (navy's register) — even by construction, independent of the light landing.
"Carry ref" = what a pure light→dark carry would give (the uneven version, for comparison). Wired columns draw from the real pipeline.</div>
${rows.join('')}
<div style="height:1.2rem"></div>`

mkdirSync('/Users/emilygerrity/okchroma/render', { recursive: true })
writeFileSync('/Users/emilygerrity/okchroma/render/secondary-gap-combo.html', html)
console.log('written -> render/secondary-gap-combo.html')
