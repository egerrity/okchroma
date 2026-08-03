// derived-secondary-ink10 — her ask 2026-08-03: "can we see ink 10 on the buttons in the
// derived secondary light?" Same agnostic sweep as derived-secondary-sweep; LIGHT mode only.
// Each pair: left = today's on-color pole on the secondary cta · right = the family's own
// ink-10 as the button text. WCAG lane. Output: render/derived-secondary-ink10.html
import * as fs from 'fs'
import * as path from 'path'
import { resolveBrand, defaultSecondarySeed, DEFAULT_SECONDARY, SECONDARY_ON_CTA_ALPHA } from '../src/engine/resolve'
import { type ColorStop } from '../src/engine/colorMath'
import { clampChromaToGamut, oklchToLinearRgb } from '../src/engine/constraints'
import { toHex } from '../src/engine/cssRender'

const oklchHex = (L: number, C: number, H: number): string => {
  const cc = clampChromaToGamut(L, C, H)
  const [rl, gl, bl] = oklchToLinearRgb(L, cc, H)
  const gm = (v: number) => { const x = Math.min(1, Math.max(0, v)); return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055 }
  return toHex(gm(rl), gm(gl), gm(bl))
}

const CLASSES = [
  { key: 'vivid L.55 C.20', L: 0.55, C: 0.20 },
  { key: 'mid L.55 C.10', L: 0.55, C: 0.10 },
  { key: 'deep L.32 C.12', L: 0.32, C: 0.12 },
  { key: 'pale L.85 C.08', L: 0.85, C: 0.08 },
  { key: 'soft L.70 C.06', L: 0.70, C: 0.06 },
  { key: 'near-neutral L.55 C.03', L: 0.55, C: 0.03 },
]
const HUES = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330]

const secOpts = {
  skipCollisionRules: true as const,
  contrastProfile: 'wcag' as const,
  darkCtaFlatApp: DEFAULT_SECONDARY.darkFlatGapApp,
}

const hx = (s: ColorStop) => toHex(s.r, s.g, s.b)

type Mode = 'light' | 'dark'
// stops 1..10 at index stop-1: paper-1 [0] · wash-5 [4] · highlight-8 [7] · ink-9 [8] · ink-10 [9]
const card = (p: ReturnType<typeof resolveBrand>['scale'], s: ReturnType<typeof resolveBrand>['scale'], mode: Mode, secText: string): string => {
  const ss = mode === 'light' ? s.light : s.dark
  const pCta = mode === 'light' ? p.cta : p.ctaDark
  const sCta = mode === 'light' ? s.cta : s.ctaDark
  const pOn = (mode === 'light' ? p.onFillTextIsWhite : p.onFillTextIsWhiteDark) ? '#fff' : '#000'
  const sInk = mode === 'light' ? s.ctaInk : s.ctaInkDark
  return `<div class="card" style="background:${hx(ss[0])}">
    <div class="ttl" style="color:${hx(ss[9])}">Account overview</div>
    <div class="chip" style="background:${hx(ss[4])};color:${hx(ss[8])};border:1px solid ${hx(ss[7])}">Savings · 4.2%</div>
    <div class="row">
      <span class="btn" style="background:${hx(pCta)};color:${pOn}">Primary</span>
      <span class="btn" style="background:${hx(sCta)};color:${secText}">Secondary</span>
    </div>
    <span class="lnk" style="color:${hx(sInk)}">Manage Aa</span>
  </div>`
}

const pole = (s: ReturnType<typeof resolveBrand>['scale'], mode: Mode) =>
  (mode === 'light' ? s.onFillTextIsWhite : s.onFillTextIsWhiteDark) ? '#fff' : '#000'

// the SHIPPED soft on-cta (owner-picked on the alpha ladder 2026-08-03: light .75 / dark
// .80): the pole at SECONDARY_ON_CTA_ALPHA, composited by the renderer over the fill's
// current state — read from the engine register so this exhibit can't drift from it.
const poleAlpha = (s: ReturnType<typeof resolveBrand>['scale'], mode: Mode) =>
  (mode === 'light' ? s.onFillTextIsWhite : s.onFillTextIsWhiteDark)
    ? `rgba(255,255,255,${SECONDARY_ON_CTA_ALPHA[mode]})` : `rgba(0,0,0,${SECONDARY_ON_CTA_ALPHA[mode]})`

// TWO COLUMNS, one probe per grid row — before on the left, after on the right, under
// standing column headers. (A wrapped pair-per-cell layout put two probes side by side and
// read as four options rather than two treatments.)
const section = (mode: Mode): string => {
  const blocks: string[] = []
  for (const cl of CLASSES) {
    const gridRows: string[] = []
    for (const H of HUES) {
      const pHex = oklchHex(cl.L, cl.C, H)
      const seedHex = defaultSecondarySeed(pHex)
      const primary = resolveBrand(pHex, 'brand', { contrastProfile: 'wcag' }).scale
      const sec = resolveBrand(seedHex, 'secondary', secOpts).scale
      gridRows.push(
        `<div class="lbl">H${H} · ${pHex}</div>`,
        card(primary, sec, mode, pole(sec, mode)),
        card(primary, sec, mode, poleAlpha(sec, mode)),
      )
    }
    blocks.push(`<div class="clsrow">
      <div class="clslbl">${cl.key}</div>
      <div class="grid">
        <div class="colhd"></div><div class="colhd">before — solid pole</div><div class="colhd">after — soft on-cta</div>
        ${gridRows.join('')}
      </div>
    </div>`)
  }
  const legend = `two columns: the solid on-text pole shipping today, and the soft on-cta at ${Math.round(SECONDARY_ON_CTA_ALPHA[mode] * 100)}% alpha`
  return `<section class="${mode}"><h2>${mode}</h2><div class="legend">${legend}</div>${blocks.join('')}</section>`
}

const html = `<!doctype html><meta charset="utf-8"><title>derived secondary — ink-10 on the cta</title>
<style>
  body { margin: 0; font: 13px/1.4 -apple-system, sans-serif; }
  section { padding: 24px 28px 40px; }
  section.light { background: #fff; color: #333; }
  section.dark { background: #0e0f12; color: #cfd2d8; }
  h2 { margin: 0 0 2px; font-size: 15px; text-transform: uppercase; letter-spacing: .08em; }
  .legend { opacity: .65; margin-bottom: 18px; }
  .clsrow { margin-bottom: 34px; }
  .clslbl { font-family: ui-monospace, monospace; font-size: 11px; opacity: .6; margin-bottom: 8px; }
  .grid { display: grid; grid-template-columns: 150px 148px 148px; gap: 10px; align-items: center; }
  .colhd { font-size: 11px; font-weight: 600; opacity: .7; padding-bottom: 2px; }
  .lbl { font-family: ui-monospace, monospace; font-size: 10px; opacity: .5; }
  .card { width: 148px; border-radius: 10px; padding: 10px; box-sizing: border-box; }
  .ttl { font-weight: 600; font-size: 12px; margin-bottom: 7px; }
  .chip { display: inline-block; font-size: 11px; border-radius: 6px; padding: 3px 8px; margin-bottom: 8px; }
  .row { display: flex; gap: 5px; margin-bottom: 7px; }
  .btn { font-size: 11px; font-weight: 600; border-radius: 7px; padding: 5px 9px; }
  .lnk { font-size: 11px; font-weight: 600; }
</style>
${section('light')}${section('dark')}`

const out = path.join(__dirname, '..', 'render', 'derived-secondary-ink10.html')
fs.writeFileSync(out, html)
console.log(`written -> ${path.relative(process.cwd(), out)} (${CLASSES.length * HUES.length} probes × light + dark)`)
