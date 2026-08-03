// derived-secondary-sweep — the rot-retirement eye exhibit (owner ruling 2026-08-03:
// the derived secondary is a quiet companion on the primary's own hue).
//
// BEFORE = the retired +12° seed math, replicated locally byte-for-byte from the old
// defaultSecondarySeed; AFTER = the live transform. Both seeds resolve through the SAME
// live resolveBrand call with the derived model's opt-set, so every difference on the
// page is the seed change and nothing else. Agnostic hue × chroma × lightness sweep,
// WCAG lane. Output: render/derived-secondary-sweep.html
import * as fs from 'fs'
import * as path from 'path'
import { resolveBrand, defaultSecondarySeed, DEFAULT_SECONDARY } from '../src/engine/resolve'
import { hexToOklch, maxChromaAt, type ColorStop } from '../src/engine/colorMath'
import { clampChromaToGamut, oklchToLinearRgb } from '../src/engine/constraints'
import { apparentL, grayApparentL, solveLForApparent } from '../src/engine/perceptualL'
import { toHex } from '../src/engine/cssRender'

const RETIRED_ROT = 12

const oklchHex = (L: number, C: number, H: number): string => {
  const cc = clampChromaToGamut(L, C, H)
  const [rl, gl, bl] = oklchToLinearRgb(L, cc, H)
  const gm = (v: number) => { const x = Math.min(1, Math.max(0, v)); return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055 }
  return toHex(gm(rl), gm(gl), gm(bl))
}

// the OLD transform, verbatim except H2 carries the retired rotation
function retiredRotatedSeed(hex: string): string {
  const seed = hexToOklch(hex)
  const d = DEFAULT_SECONDARY
  let L2 = seed.L + d.kL * Math.max(0, d.lRoom - seed.L)
  const H2 = (seed.H + RETIRED_ROT + 360) % 360
  let C2 = Math.min(d.kC * seed.C, d.kR * maxChromaAt(L2, H2))
  const ground = grayApparentL(1.0)
  for (let i = 0; i < 2; i++) {
    if (ground - apparentL(L2, clampChromaToGamut(L2, C2, H2), H2) < d.minGapApp) {
      L2 = solveLForApparent(ground - d.minGapApp, C2, H2)
      C2 = Math.min(d.kC * seed.C, d.kR * maxChromaAt(L2, H2))
    }
  }
  return oklchHex(L2, C2, H2)
}

// ── the sweep: agnostic classes × 12 hues (worst-case edges included, no named brands) ──
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
const card = (p: ReturnType<typeof resolveBrand>['scale'], s: ReturnType<typeof resolveBrand>['scale'], mode: Mode): string => {
  const ss = mode === 'light' ? s.light : s.dark
  const pCta = mode === 'light' ? p.cta : p.ctaDark
  const sCta = mode === 'light' ? s.cta : s.ctaDark
  const pOn = (mode === 'light' ? p.onFillTextIsWhite : p.onFillTextIsWhiteDark) ? '#fff' : '#000'
  const sOn = (mode === 'light' ? s.onFillTextIsWhite : s.onFillTextIsWhiteDark) ? '#fff' : '#000'
  const sInk = mode === 'light' ? s.ctaInk : s.ctaInkDark
  // arrays hold stops 1..10 at index stop-1: paper-1 [0] · wash-5 [4] · highlight-8 [7] · ink-9 [8] · ink-10 [9]
  return `<div class="card" style="background:${hx(ss[0])}">
    <div class="ttl" style="color:${hx(ss[9])}">Account overview</div>
    <div class="chip" style="background:${hx(ss[4])};color:${hx(ss[8])};border:1px solid ${hx(ss[7])}">Savings · 4.2%</div>
    <div class="row">
      <span class="btn" style="background:${hx(pCta)};color:${pOn}">Primary</span>
      <span class="btn" style="background:${hx(sCta)};color:${sOn}">Secondary</span>
    </div>
    <span class="lnk" style="color:${hx(sInk)}">Manage Aa</span>
  </div>`
}

const sections: string[] = []
for (const mode of ['light', 'dark'] as Mode[]) {
  const rows: string[] = []
  for (const cl of CLASSES) {
    const cells: string[] = []
    for (const H of HUES) {
      const pHex = oklchHex(cl.L, cl.C, H)
      const primary = resolveBrand(pHex, 'brand', { contrastProfile: 'wcag' }).scale
      const before = resolveBrand(retiredRotatedSeed(pHex), 'secondary', secOpts).scale
      const after = resolveBrand(defaultSecondarySeed(pHex), 'secondary', secOpts).scale
      cells.push(`<div class="cell">
        <div class="pair">${card(primary, before, mode)}${card(primary, after, mode)}</div>
        <div class="lbl">H${H} · ${pHex}</div>
      </div>`)
    }
    rows.push(`<div class="clsrow"><div class="clslbl">${cl.key}</div><div class="cells">${cells.join('')}</div></div>`)
  }
  sections.push(`<section class="${mode}">
    <h2>${mode}</h2>
    <div class="legend">each pair: left = retired +12° · right = shipped (no rotation)</div>
    ${rows.join('')}
  </section>`)
}

const html = `<!doctype html><meta charset="utf-8"><title>derived secondary — rotation retirement sweep</title>
<style>
  body { margin: 0; font: 13px/1.4 -apple-system, sans-serif; }
  section { padding: 24px 28px 40px; }
  section.light { background: #fff; color: #333; }
  section.dark { background: #0e0f12; color: #cfd2d8; }
  h2 { margin: 0 0 2px; font-size: 15px; text-transform: uppercase; letter-spacing: .08em; }
  .legend { opacity: .65; margin-bottom: 18px; }
  .clsrow { margin-bottom: 26px; }
  .clslbl { font-family: ui-monospace, monospace; font-size: 11px; opacity: .6; margin-bottom: 8px; }
  .cells { display: flex; flex-wrap: wrap; gap: 14px; }
  .cell .lbl { font-family: ui-monospace, monospace; font-size: 10px; opacity: .5; margin-top: 4px; }
  .pair { display: flex; gap: 6px; }
  .card { width: 148px; border-radius: 10px; padding: 10px; box-sizing: border-box; }
  .ttl { font-weight: 600; font-size: 12px; margin-bottom: 7px; }
  .chip { display: inline-block; font-size: 11px; border-radius: 6px; padding: 3px 8px; margin-bottom: 8px; }
  .row { display: flex; gap: 5px; margin-bottom: 7px; }
  .btn { font-size: 11px; font-weight: 600; border-radius: 7px; padding: 5px 9px; }
  .lnk { font-size: 11px; font-weight: 600; }
</style>
${sections.join('')}`

const out = path.join(__dirname, '..', 'render', 'derived-secondary-sweep.html')
fs.writeFileSync(out, html)
console.log(`written -> ${path.relative(process.cwd(), out)} (${CLASSES.length * HUES.length} probes × 2 modes)`)
