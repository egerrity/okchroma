// secondary-cta-flip.ts — the DERIVED secondary cta's flip question (owner 2026-07-12,
// pre-compact: "we have to fix the secondary cta. Like that secondary cta should pretty
// easily flip.").
//
// Measured state (probe, all 10 hues × both lanes): the on-text POLE already flips — black
// is chosen on every derived cta in light AND dark, and black genuinely wins the Lc read on
// every one. What does NOT flip is the CTA ITSELF in dark mode: the cta is prominence-floored
// (producers.ts buildDarkContext: dark9L = max(scaleL, floor)) — designed so a vivid brand's
// dark cta never goes brand-dead — but a lifted derived seed at L ~.8+ pins its dark cta at
// that same L. The scale delta-carries into dark; the cta alone stays a light pastel on the
// dark page.
//
// This page: per hue, LIGHT (shipped) beside DARK on its real dark ground — shipped dark cta
// (the pastel that doesn't flip) and one CANDIDATE, the engine's OWN delta model applied to
// the cta (deltaDarkTargetL — the same math that places every dark scale stop; no new curve).
// NOTHING WIRED. Primary cta rendered inside every card (the eyeball requirement).
import { writeFileSync, mkdirSync } from 'fs'
import { resolveTheme } from '/Users/emilygerrity/okchroma/src/engine/resolve'
import { deltaDarkTargetL } from '/Users/emilygerrity/okchroma/src/reqtoken/producers'
import { generateNeutralScale } from '/Users/emilygerrity/okchroma/src/engine/colorEngine'
import { hexToOklch, makeStop, onTextIsWhite } from '/Users/emilygerrity/okchroma/src/engine/colorMath'
import { clampChromaToGamut, oklchToLinearRgb, apcaY, apcaLc } from '/Users/emilygerrity/okchroma/src/engine/constraints'

const gm = (v: number) => { const x = Math.min(1, Math.max(0, v)); return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055 }
const hx = (c: { L: number; C: number; H: number }) => {
  const cc = clampChromaToGamut(c.L, c.C, c.H)
  const [rl, gl, bl] = oklchToLinearRgb(c.L, cc, c.H)
  const ch = (v: number) => Math.round(gm(v) * 255).toString(16).padStart(2, '0')
  return `#${ch(rl)}${ch(gl)}${ch(bl)}`
}
const lc = (st: { r: number; g: number; b: number }) => {
  const Y = apcaY(st.r, st.g, st.b)
  return { w: Math.abs(apcaLc(1.0, Y)), k: Math.abs(apcaLc(0.0, Y)) }
}

const HUES = [
  ['#004E75', 'navy'], ['#3B82F6', 'blue'], ['#0E7490', 'teal'], ['#3BA55C', 'green'],
  ['#C8FF00', 'chartreuse'], ['#E7EA3E', 'yellow'], ['#B45309', 'gold'], ['#DC2626', 'red'],
  ['#DB2777', 'pink'], ['#9000FF', 'violet'],
]

const btn = (bg: string, white: boolean, label: string) =>
  `<div class="btn" style="background:${bg};color:${white ? '#fff' : '#000'}">${label}</div>`
const lab = (s: string) => `<div class="lab">${s}</div>`

const rows: string[] = []
for (const [hex, name] of HUES) {
  const t = resolveTheme({ primaryHex: hex, deriveSecondary: true, contrastProfile: 'apca' })
  const p = t.primary.scale, s = t.secondary!.scale
  const nScale = generateNeutralScale(hexToOklch(hex).H, 'default', 'apca')
  const darkGround = nScale.paper0Dark ? hx(nScale.paper0Dark) : '#141416'

  // the candidate: the dark model's own delta solve, pointed at the cta (NOT WIRED)
  const candL = deltaDarkTargetL({ L: s.cta.L, C: s.cta.C, H: s.cta.H }, s.ctaDark.C, s.ctaDark.H)
  const cand = makeStop(9, candL, s.ctaDark.C, s.ctaDark.H)
  const candWhite = onTextIsWhite(apcaY(cand.r, cand.g, cand.b), cand.L, cand.C, cand.H, false)

  const sl = lc(s.cta), sd = lc(s.ctaDark), sc = lc(cand)
  const lightCard = `<div class="card" style="background:${hx(s.light[0])}">
<div class="ctitle">LIGHT · shipped</div>
<div class="h" style="color:${hx(s.light[10])}">Aa Heading</div>
<div class="btnrow">${btn(hx(p.cta), p.onFillTextIsWhite, 'Primary cta')}${btn(hx(s.cta), s.onFillTextIsWhite, 'Secondary cta')}</div>
${lab(`sec cta ${hx(s.cta)} · L ${s.cta.L.toFixed(2)} · pole ${s.onFillTextIsWhite ? 'white' : 'black'} · Lc w${sl.w.toFixed(0)}/k${sl.k.toFixed(0)}`)}</div>`

  const darkCard = (title: string, cta: { L: number; C: number; H: number }, white: boolean, m: { w: number; k: number }) =>
    `<div class="card" style="background:${hx(s.dark[0])}">
<div class="ctitle" style="color:#bdbdbd">${title}</div>
<div class="h" style="color:${hx(s.dark[10])}">Aa Heading</div>
<div class="btnrow">${btn(hx(p.ctaDark), p.onFillTextIsWhiteDark, 'Primary cta')}${btn(hx(cta), white, 'Secondary cta')}</div>
${lab(`sec cta ${hx(cta)} · L ${cta.L.toFixed(2)} · pole ${white ? 'white' : 'black'} · Lc w${m.w.toFixed(0)}/k${m.k.toFixed(0)}`)}</div>`

  rows.push(`<div class="row">
<div class="rlab"><div class="idsw" style="background:${hex}"></div><b>${hex}</b>&nbsp;${name}</div>
<div class="halves">
<div class="half light">${lightCard}</div>
<div class="half dark" style="background:${darkGround}">${darkCard('DARK · shipped (does not flip)', s.ctaDark, s.onFillTextIsWhiteDark, sd)}${darkCard('DARK · candidate (not wired)', cand, candWhite, sc)}</div>
</div></div>`)
}

const html = `<!doctype html><meta charset="utf-8"><title>Derived secondary cta — the flip</title>
<style>
  body { font: 14px/1.5 -apple-system, sans-serif; margin:0; background:#faf9f7; color:#1a1a1a; }
  .note { padding:.9rem .8rem; background:#f2f0ec; font-size:.86rem; }
  .row { padding:.8rem .8rem 0; }
  .rlab { display:flex; gap:.5rem; align-items:center; font-weight:700; font-size:.82rem; margin-bottom:.4rem; }
  .idsw { width:20px; height:20px; border-radius:5px; }
  .halves { display:flex; gap:0; border-radius:12px; overflow:hidden; border:1px solid #e7e4de; }
  .half { display:flex; gap:.6rem; padding:.7rem; }
  .half.light { background:#faf9f7; flex:0 0 auto; }
  .half.dark { flex:1; }
  .card { width:228px; border-radius:10px; padding:.6rem; }
  .ctitle { font-size:.6rem; text-transform:uppercase; letter-spacing:.04em; opacity:.75; margin-bottom:.3rem; }
  .h { font-weight:800; font-size:1rem; margin-bottom:.4rem; }
  .btn { display:inline-flex; padding:.35rem .7rem; border-radius:16px; font-weight:700; font-size:.7rem; }
  .btnrow { display:flex; gap:.4rem; margin-bottom:.4rem; flex-wrap:wrap; }
  .lab { font-size:.58rem; letter-spacing:.02em; opacity:.55; color:inherit; }
  .half.dark .lab { color:#cfcfcf; }
</style>
<div class="note"><b>The derived secondary cta's flip (APCA lane, shipped derived model — nothing new wired).</b><br>
Measured: the on-text pole ALREADY flips — black is chosen on every derived cta, light and dark, and black wins the Lc read on all of them.
What does not flip is the cta itself in dark mode: the cta is prominence-floored (dark L = max(seed's scale L, floor)), so a lifted seed at L ~.8+ keeps its light pastel on the dark page — the scale delta-carries into dark, the cta alone stays put.<br>
Right column = one candidate: the engine's own delta model (the same solve that places every dark scale stop) applied to the cta — its text flips to white as the cta flips dark. Not wired; shown for direction.</div>
${rows.join('')}
<div style="height:1.4rem"></div>`

mkdirSync('/Users/emilygerrity/okchroma/render', { recursive: true })
writeFileSync('/Users/emilygerrity/okchroma/render/secondary-cta-flip.html', html)
console.log('written -> render/secondary-cta-flip.html')
