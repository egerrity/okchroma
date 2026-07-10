// KEEP-PATTERN PAGE (owner ask 2026-07-10): per candidate delta, the fired up-side population
// split LEFT (kept — lands in white-land, stays its own color) vs RIGHT (moved — forced past
// the zone to the shelf). Chips = the brand's IDENTITY color (what the owner judges: "should
// this brand get to stay orange?"). The divide is a pure hue x chroma boundary (seed L only
// picks exit direction; down-exits never shelf). apca lane, light cta axis; dark parallels.
import { writeFileSync, mkdirSync } from 'fs'
import { signalScalesFor } from '/Users/emilygerrity/okchroma/src/engine/resolve'
import { whiteTextLcAt } from '/Users/emilygerrity/okchroma/src/reqtoken/producers'
import { stopDeltaE } from '/Users/emilygerrity/okchroma/src/engine/collision'
import { clampChromaToGamut, oklchToLinearRgb } from '/Users/emilygerrity/okchroma/src/engine/constraints'

const hx = (L: number, C: number, H: number) => {
  const c = clampChromaToGamut(L, C, H)
  const [rl, gl, bl] = oklchToLinearRgb(L, c, H)
  const gm = (v: number) => { const x = Math.min(1, Math.max(0, v)); return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055 }
  const ch = (v: number) => Math.round(gm(v) * 255).toString(16).padStart(2, '0')
  return `#${ch(rl)}${ch(gl)}${ch(bl)}`
}
const red = signalScalesFor('apca').get('red')!.scale
const HS: number[] = []; for (let H = 0; H <= 72; H += 4) HS.push(H)
const CS = [0.04, 0.06, 0.08, 0.10, 0.12, 0.14, 0.17, 0.20]
// ceiling per (H, C): dE available at the white-text boundary
const ceiling = new Map<string, number>()
for (const H of HS) for (const C of CS) {
  let lo = 0.3, hi = 0.95
  for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; whiteTextLcAt(m, C, H) >= 60 ? (lo = m) : (hi = m) }
  ceiling.set(`${H}|${C}`, stopDeltaE({ L: lo, C: clampChromaToGamut(lo, C, H), H } as any, red.cta))
}
// fired qualifier: identity register near red at all (dE at L0.65 identity < 0.18) — the rest never fire
const fires = (H: number, C: number) => stopDeltaE({ L: 0.65, C: clampChromaToGamut(0.65, C, 0 + H), H } as any, red.cta) < 0.18

const chip = (H: number, C: number, show: boolean) =>
  show ? `<span class="chip" title="H${H} C${C}" style="background:${hx(0.65, C, H)}"></span>` : `<span class="chip gap"></span>`
// severity view: the fired population banded by UNTREATED distance to red — how much of
// the net is true conflict vs fringe topped up by the wide 0.18 target
const sevBands: Array<[string, number, number]> = [['true conflict — under the old 0.16 gate and close (dE < 0.10)', 0, 0.10], ['register-near (0.10–0.14)', 0.10, 0.14], ['fringe — nearly far enough already (0.14–0.18)', 0.14, 0.18]]
const sevPanels = sevBands.map(([label, lo, hi]) => {
  const chips: string[] = []
  let n = 0
  for (const H of HS) for (const C of CS) {
    const d = stopDeltaE({ L: 0.65, C: clampChromaToGamut(0.65, C, H), H } as any, red.cta)
    const inBand = d >= lo && d < hi
    chips.push(inBand ? `<span class="chip" title="H${H} C${C} dE ${d.toFixed(3)}" style="background:${hx(0.65, C, H)}"></span>` : `<span class="chip gap"></span>`)
    if (inBand) n++
  }
  return `<div class="panel"><div class="phead">${label} (${n})</div><div class="chips">${chips.join('')}</div></div>`
})
const sevSection = `<div class="trow"><div class="tlab">severity</div>${sevPanels.join('')}</div>`
const sections: string[] = []
for (const T of [0.17, 0.165, 0.16, 0.15, 0.14, 0.13, 0.12, 0.11]) {
  const kept: string[] = [], moved: string[] = []
  let nK = 0, nM = 0
  for (const H of HS) for (const C of CS) {
    if (!fires(H, C)) { kept.push(chip(H, C, false)); moved.push(chip(H, C, false)); continue }
    const isKept = ceiling.get(`${H}|${C}`)! >= T
    kept.push(chip(H, C, isKept)); moved.push(chip(H, C, !isKept))
    isKept ? nK++ : nM++
  }
  sections.push(`<div class="trow"><div class="tlab">Δ ${T.toFixed(3)}</div>
  <div class="panel"><div class="phead">kept — stays its own color (${nK})</div><div class="chips">${kept.join('')}</div></div>
  <div class="panel"><div class="phead">moved — forced past the zone (${nM})</div><div class="chips">${moved.join('')}</div></div></div>`)
}
const html = `<!doctype html><meta charset="utf-8"><title>C12 — keep pattern by delta</title>
<style>
  body { font: 14px/1.5 -apple-system, sans-serif; margin:0; background:#faf9f7; color:#1a1a1a; }
  .note { padding:.9rem 1.4rem; background:#f2f0ec; font-size:.88rem; }
  .trow { display:flex; gap:1rem; align-items:flex-start; padding:.7rem 1.4rem; border-bottom:1px solid #e5e2dd; }
  .tlab { width:70px; font-weight:700; padding-top:1.2rem; }
  .panel { flex:1; }
  .phead { font-size:.7rem; text-transform:uppercase; letter-spacing:.05em; opacity:.6; margin-bottom:.3rem; }
  .chips { display:grid; grid-template-columns: repeat(${CS.length}, 22px); grid-auto-flow: row; gap:3px; }
  .panel:last-child .chips { }
  .chip { width:20px; height:20px; border-radius:5px; display:inline-block; }
  .chip.gap { background:transparent; }
</style>
<div class="note"><b>C12 — who is kept at each delta.</b> Chips = the brand's IDENTITY color (fill register, L.65; hue 0→72 top→bottom, chroma dusty→vivid left→right — SAME grid positions both panels (gaps = the other side's chips)).
LEFT = lands inside white-land at that delta — keeps its own color. RIGHT = forced past the dead zone to the shelf.
The divide is pure hue×chroma; seed lightness only picks exit direction (below-register brands always exit gently down — never shelf).
apca lane, light axis.</div>
${sevSection}\n${sections.join('\n')}`
mkdirSync('/Users/emilygerrity/okchroma/render', { recursive: true })
writeFileSync('/Users/emilygerrity/okchroma/render/c12-keep-pattern.html', html)
console.log('written -> render/c12-keep-pattern.html')
