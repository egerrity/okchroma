// secondary-light-gap.ts — the LIGHT-FIRST answer to the derived cta's dark flip (owner
// 2026-07-12: "maybe the answer here is to do that to light so they can't get too close to
// the background first and see how it falls out").
//
// The constraint: the lifted seed keeps a MINIMUM APPARENT DISTANCE from the light ground —
// gap G = whiteApp − apparentL(lifted). Under the delta model the dark twin lands exactly
// groundApp + G, so the light minimum IS the dark floor: one register, both modes, evenness
// falls out. Navy's own (unconstrained) gap is 23 — her "about where navy sits" anchor.
//
// Ladder: G ≥ 10 (touches only chartreuse/yellow — light look otherwise unchanged) ·
// G ≥ 15 (green/blue/pink also come down a touch) · G ≥ 23 (navy's register — every hue at
// one distance, maximum dark evenness, light column flattens). Dark cta = the delta carry of
// each light variant (the accepted flip direction). NOTHING WIRED. Primary cta inside every
// strip on its real ground.
import { writeFileSync, mkdirSync } from 'fs'
import { resolveBrand, resolveTheme, DEFAULT_SECONDARY } from '/Users/emilygerrity/okchroma/src/engine/resolve'
import { deltaDarkTargetL } from '/Users/emilygerrity/okchroma/src/reqtoken/producers'
import { apparentL, solveLForApparent, grayApparentL } from '/Users/emilygerrity/okchroma/src/engine/perceptualL'
import { generateNeutralScale } from '/Users/emilygerrity/okchroma/src/engine/colorEngine'
import { hexToOklch, maxChromaAt, makeStop, onTextIsWhite } from '/Users/emilygerrity/okchroma/src/engine/colorMath'
import { clampChromaToGamut, oklchToLinearRgb, apcaY } from '/Users/emilygerrity/okchroma/src/engine/constraints'

const WHITE_APP = grayApparentL(1.0)
const gm = (v: number) => { const x = Math.min(1, Math.max(0, v)); return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055 }
const hxLCH = (L: number, C: number, H: number) => {
  const cc = clampChromaToGamut(L, C, H)
  const [rl, gl, bl] = oklchToLinearRgb(L, cc, H)
  const ch = (v: number) => Math.round(gm(v) * 255).toString(16).padStart(2, '0')
  return `#${ch(rl)}${ch(gl)}${ch(bl)}`
}
const hx = (c: { L: number; C: number; H: number }) => hxLCH(c.L, c.C, c.H)

// the lifted seed with the gap floor: the DEFAULT model's own transform, then the apparent
// ceiling — L re-solved so gap ≥ G, chroma re-bounded by the model's own kR rule at the
// landing (two passes settle the L↔C interaction).
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

const GAPS = [10, 15, 23]
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

  const variants = GAPS.map(G => {
    const s = resolveBrand(gapSeed(hex, G), 'secondary', { skipCollisionRules: true, contrastProfile: 'apca' } as any).scale
    const dL = deltaDarkTargetL({ L: s.cta.L, C: s.cta.C, H: s.cta.H }, s.ctaDark.C, s.ctaDark.H)
    const dStop = makeStop(9, dL, s.ctaDark.C, s.ctaDark.H)
    const dWhite = onTextIsWhite(apcaY(dStop.r, dStop.g, dStop.b), dStop.L, dStop.C, dStop.H, false)
    return { G, s, dStop, dWhite }
  })
  const curDL = deltaDarkTargetL({ L: cur.cta.L, C: cur.cta.C, H: cur.cta.H }, cur.ctaDark.C, cur.ctaDark.H)
  const curD = makeStop(9, curDL, cur.ctaDark.C, cur.ctaDark.H)
  const curDW = onTextIsWhite(apcaY(curD.r, curD.g, curD.b), curD.L, curD.C, curD.H, false)

  const lightStrip = `<div class="strip" style="background:${lightGround}">
<div class="cell"><div class="lab">PRIMARY</div><div class="btn" style="background:${hx(p.cta)};color:${p.onFillTextIsWhite ? '#fff' : '#000'}">Primary</div><div class="lab">&nbsp;</div></div>
${cell('current', hx(cur.cta), cur.onFillTextIsWhite, `L ${cur.cta.L.toFixed(2)}`)}
${variants.map(v => cell(`G≥${v.G}`, hx(v.s.cta), v.s.onFillTextIsWhite, `L ${v.s.cta.L.toFixed(2)}`)).join('')}</div>`

  const darkStrip = `<div class="strip dark" style="background:${darkGround}">
<div class="cell"><div class="lab">PRIMARY</div><div class="btn" style="background:${hx(p.ctaDark)};color:${p.onFillTextIsWhiteDark ? '#fff' : '#000'}">Primary</div><div class="lab">&nbsp;</div></div>
${cell('current · carried', hx(curD), curDW, `L ${curD.L.toFixed(2)}`)}
${variants.map(v => cell(`G≥${v.G} · carried`, hx(v.dStop), v.dWhite, `L ${v.dStop.L.toFixed(2)}`)).join('')}</div>`

  rows.push(`<div class="row"><div class="rlab"><div class="idsw" style="background:${hex}"></div><b>${hex}</b>&nbsp;${name}</div>${lightStrip}${darkStrip}</div>`)
}

const html = `<!doctype html><meta charset="utf-8"><title>Derived secondary — light gap floor ladder</title>
<style>
  body { font: 14px/1.5 -apple-system, sans-serif; margin:0; background:#faf9f7; color:#1a1a1a; }
  .note { padding:.9rem .9rem; background:#f2f0ec; font-size:.86rem; }
  .row { padding:.7rem .9rem .2rem; }
  .rlab { display:flex; gap:.5rem; align-items:center; font-weight:700; font-size:.82rem; margin-bottom:.35rem; }
  .idsw { width:20px; height:20px; border-radius:5px; }
  .strip { display:flex; gap:1rem; padding:.55rem .8rem; border-radius:10px; border:1px solid #e7e4de; margin-bottom:.4rem; }
  .strip.dark { border-color:#2a2a2e; }
  .cell { display:flex; flex-direction:column; align-items:center; gap:.15rem; }
  .lab { font-size:.56rem; text-transform:uppercase; letter-spacing:.03em; opacity:.6; }
  .strip.dark .lab { color:#cfcfcf; }
  .btn { min-width:96px; height:36px; border-radius:18px; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:.72rem; padding:0 .7rem; }
</style>
<div class="note"><b>Light-first: the lifted seed keeps a minimum apparent distance from the background — dark falls out through the carry.</b><br>
Gap G = apparent distance from white. Under the delta model the dark cta lands exactly that same distance above the dark ground, so the light minimum IS the dark floor — one register, both modes.
Unconstrained gaps today: navy 23 (deepest) · most hues 13–20 · chartreuse 4, yellow 5 (the near-invisible dark pair).<br>
<b>G≥10</b> touches only chartreuse/yellow — the approved light look otherwise unchanged · <b>G≥15</b> green/blue/pink come down a touch · <b>G≥23</b> = navy's own register ("where navy sits") — every hue at one distance, maximum dark evenness, most light-mode movement. Dark strips = the delta carry of each light variant. Nothing wired.</div>
${rows.join('')}
<div style="height:1.2rem"></div>`

mkdirSync('/Users/emilygerrity/okchroma/render', { recursive: true })
writeFileSync('/Users/emilygerrity/okchroma/render/secondary-light-gap.html', html)
console.log('written -> render/secondary-light-gap.html')
