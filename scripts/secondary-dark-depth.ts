// @ts-nocheck — HISTORICAL RECORD (2026-07-12 strike: the offering collapsed to derived-default
// vs custom; imports the struck muted/vibrant curves + subtleCtaLFor, deleted from the engine). Not runnable against current src.
// secondary-dark-depth.ts — the DARK secondary-cta depth ladder (owner 2026-07-12: "they can
// definitely sink more into the background than they do"). Measured: the SUBTLE_DARK_FLOOR
// (0.22) never binds — the light-calibrated subtleDeltaFor curve (~0.17-0.21 drop) is what
// holds the dark landing at L .44-.55. This page: DARK only, per lane × hue, the secondary cta
// at the CURRENT delta vs three deeper candidates, muted + vibrant, primary + neutral flanking,
// real paper-0 ground. She picks the column; that depth becomes the dark delta calibration.
import { writeFileSync, mkdirSync } from 'fs'
import { resolveTheme, mutedSecondaryCurve, vibrantSecondaryCurve, subtleCtaLFor } from '/Users/emilygerrity/okchroma/src/engine/resolve'
import { generateNeutralScale } from '/Users/emilygerrity/okchroma/src/engine/colorEngine'
import { hexToOklch, makeStop, onTextIsWhite } from '/Users/emilygerrity/okchroma/src/engine/colorMath'
import { clampChromaToGamut, oklchToLinearRgb, apcaY } from '/Users/emilygerrity/okchroma/src/engine/constraints'

const hx = (c: { L: number; C: number; H: number }) => {
  const cc = clampChromaToGamut(c.L, c.C, c.H)
  const [rl, gl, bl] = oklchToLinearRgb(c.L, cc, c.H)
  const gm = (v: number) => { const x = Math.min(1, Math.max(0, v)); return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055 }
  const ch = (v: number) => Math.round(gm(v) * 255).toString(16).padStart(2, '0')
  return `#${ch(rl)}${ch(gl)}${ch(bl)}`
}

const HUES = [['#3BA55C', 'green'], ['#0E7490', 'teal'], ['#B45309', 'gold'], ['#7C3AED', 'violet'], ['#DB2777', 'pink'], ['#DC2626', 'red']]
const EXTRA = [0]   // LOCKED 2026-07-12: -0.08 shipped as SUBTLE_DARK_EXTRA_SINK (resolve.ts) — column shows the shipped landing

const sections: string[] = []
for (const profile of ['wcag', 'apca'] as const) {
  const cp = profile === 'apca' ? 'apca' as const : undefined
  const rows: string[] = []
  for (const [hex, name] of HUES) {
    const H = hexToOklch(hex).H
    const nScale = generateNeutralScale(H, 'default', cp)
    const paper0 = nScale.paper0Dark ? hx(nScale.paper0Dark) : '#141416'
    const paperL = nScale.paper0Dark?.L ?? 0.17
    const tm = resolveTheme({ primaryHex: hex, secondaryHex: hex, secondaryStyle: 'tint', contrastProfile: cp })
    const baseDarkL = subtleCtaLFor(tm.primary.scale).dark
    const prim = { c: tm.primary.scale.ctaDark, w: tm.primary.scale.onFillTextIsWhiteDark }
    const neu = { c: nScale.ctaDark, w: nScale.onFillTextIsWhiteDark }
    const curves = { muted: mutedSecondaryCurve(hex), vibrant: vibrantSecondaryCurve(hex) }
    for (const style of ['muted', 'vibrant'] as const) {
      const cells = EXTRA.map(x => {
        const L = Math.max(0.22, baseDarkL - x)
        const stop = makeStop(9, L, curves[style](L, 'dark'), H)
        const w = onTextIsWhite(apcaY(stop.r, stop.g, stop.b), stop.L, stop.C, stop.H, profile !== 'apca', profile === 'apca' ? undefined : 4.5)
        return `<div class="cell"><div class="lab">SHIPPED (−0.08 locked) · L${L.toFixed(2)} · ΔLbg ${Math.abs(L - paperL).toFixed(2)}</div>
<div class="btn" style="background:${hx(stop)};color:${w ? '#fff' : '#000'}">Secondary</div></div>`
      }).join('')
      rows.push(`<div class="row" style="background:${paper0}"><div class="rid"><div class="idsw" style="background:${hex}"></div><b>${hex}</b>&nbsp;${name} · <span class="st">${style}</span></div>
<div class="cells"><div class="cell"><div class="lab">PRIMARY · L${prim.c.L.toFixed(2)}</div><div class="btn" style="background:${hx(prim.c)};color:${prim.w ? '#fff' : '#000'}">Primary</div></div>${cells}<div class="cell"><div class="lab">NEUTRAL · L${neu.c.L.toFixed(2)}</div><div class="btn" style="background:${hx(neu.c)};color:${neu.w ? '#fff' : '#000'}">Neutral</div></div></div></div>`)
    }
  }
  sections.push(`<div class="stitle">DARK · ${profile.toUpperCase()}</div>${rows.join('')}`)
}

const html = `<!doctype html><meta charset="utf-8"><title>Secondary dark depth ladder</title>
<style>
  body { font: 14px/1.5 -apple-system, sans-serif; margin:0; background:#141416; color:#d5d5d5; }
  .note { padding:.9rem 1.4rem; background:#1e1e22; font-size:.86rem; }
  .stitle { padding:.6rem 1.4rem .2rem; font-weight:800; font-size:.85rem; letter-spacing:.05em; }
  .row { display:flex; gap:1rem; align-items:center; padding:.45rem 1.4rem; }
  .rid { display:flex; gap:.5rem; align-items:center; width:210px; flex:0 0 210px; font-size:.78rem; color:#d5d5d5; }
  .st { opacity:.7; font-size:.7rem; text-transform:uppercase; letter-spacing:.04em; }
  .idsw { width:18px; height:18px; border-radius:4px; }
  .cells { display:flex; gap:.9rem; }
  .cell { display:flex; flex-direction:column; align-items:center; gap:.2rem; }
  .lab { font-size:.56rem; text-transform:uppercase; letter-spacing:.03em; opacity:.6; color:#cfcfcf; }
  .btn { min-width:104px; height:40px; border-radius:20px; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:.74rem; padding:0 .7rem; }
</style>
<div class="note"><b>Dark secondary-cta depth ladder.</b> The 0.22 floor never binds — the light-calibrated delta curve (~0.17 drop) is what holds the landing.
LOCKED: the −0.08 extra sink is wired (SUBTLE_DARK_EXTRA_SINK); the column shows the shipped dark landing beside primary + neutral, each row on its theme's real paper-0.</div>
${sections.join('')}`

mkdirSync('/Users/emilygerrity/okchroma/render', { recursive: true })
writeFileSync('/Users/emilygerrity/okchroma/render/secondary-dark-depth.html', html)
console.log('written -> render/secondary-dark-depth.html')
