// p3-pole-examples.ts — D5 decision exhibit (P3-DESIGN.md §5). Finds real-pipeline cta
// stops where the wcag lane's legal text pole DIFFERS between measuring the sRGB
// fallback only vs measuring both renditions ("strictly safe": the chosen pole must
// clear 4.5 on the sRGB fallback AND on the P3 pixels). Emits render/p3-d5-poles.html
// with both renditions of each cta (hex fallback + color(display-p3 …)) and the
// measured ratios. Chroma shown = FULL P3 headroom — the maximum Phase B could assign
// these stops; real Phase-B values land at or below this.
// Run: esbuild scripts/p3-pole-examples.ts --bundle --platform=node --outfile=dist/p3-pole-examples.js && node dist/p3-pole-examples.js
import { writeFileSync, mkdirSync } from 'fs'
import { resolveTheme, signalScalesFor } from '../../../src/engine/resolve'
import { type GeneratedScale } from '../../../src/engine/colorEngine'
import { clampChromaToGamut, wcagY, contrastRatio, apcaLc } from '../../../src/engine/constraints'
import { oklchToSrgbUnclamped, type ColorStop } from '../../../src/engine/colorMath'
import { trueY, clampChromaToGamutP3, oklchToLinearP3, gmEnc, apcaYP3 } from './p3-math'

const BAR = 4.5

function seedHex(L: number, C: number, H: number): string {
  const c = clampChromaToGamut(L, C, H, 'srgb') * 0.999   // seeds are sRGB hexes by contract (D4)
  const { r, g, b } = oklchToSrgbUnclamped(L, c, H)
  const q = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')
  return `#${q(r)}${q(g)}${q(b)}`
}
const hexOf = (L: number, C: number, H: number): string => seedHex(L, C + 1, H) // clamp inside seedHex
const p3Css = (L: number, C: number, H: number): string => {
  const [r, g, b] = oklchToLinearP3(L, C, H)
  const e = (v: number) => Math.min(1, Math.max(0, gmEnc(v))).toFixed(4)
  return `color(display-p3 ${e(r)} ${e(g)} ${e(b)})`
}
// the wcag lane's floor logic: APCA preference (P3 basis per D2), flip if the chosen
// pole misses the bar and the other clears it
const poleAfterFloor = (prefWhite: boolean, rW: number, rB: number): boolean => {
  if (prefWhite && rW < BAR && rB >= BAR) return false
  if (!prefWhite && rB < BAR && rW >= BAR) return true
  return prefWhite
}

type Example = {
  role: string; mode: 'light' | 'dark'; stop: string; seed: string
  L: number; H: number; Cs: number; Cp: number
  hexS: string; p3: string
  rW_s: number; rW_p: number; rB_s: number; rB_p: number
  poleA: boolean; poleB: boolean   // white? under sRGB-only vs strictly-safe
}
const found: Example[] = []
const seen = new Set<string>()

function scanCtas(s: GeneratedScale, role: string, seed: string) {
  const entries: Array<{ mode: 'light' | 'dark'; stop: string; cs: ColorStop }> = [
    { mode: 'light', stop: 'cta-1', cs: s.cta }, { mode: 'light', stop: 'cta-2', cs: s.ctaHover },
    { mode: 'dark', stop: 'cta-1', cs: s.ctaDark }, { mode: 'dark', stop: 'cta-2', cs: s.ctaHoverDark },
  ]
  for (const { mode, stop, cs } of entries) {
    const mS = clampChromaToGamut(cs.L, 0.52, cs.H)
    if (cs.C < mS - 5e-4 || cs.C <= 0.02) continue          // not pinned at the sRGB ceiling
    const Cp = clampChromaToGamutP3(cs.L, 0.52, cs.H) * 0.999
    if (Cp - cs.C <= 1e-4) continue                          // no P3 headroom
    const Ys = wcagY(cs.L, clampChromaToGamut(cs.L, Cp, cs.H), cs.H)  // sRGB fallback of the P3 stop
    const Yp = trueY(cs.L, Cp, cs.H)                                   // the P3 pixels
    const rW_s = contrastRatio(1, Ys), rW_p = contrastRatio(1, Yp)
    const rB_s = contrastRatio(Ys, 0), rB_p = contrastRatio(Yp, 0)
    const Yap3 = apcaYP3(cs.L, Cp, cs.H)
    const prefWhite = Math.abs(apcaLc(1, Yap3)) >= Math.abs(apcaLc(0, Yap3))
    const poleA = poleAfterFloor(prefWhite, rW_s, rB_s)
    const poleB = poleAfterFloor(prefWhite, Math.min(rW_s, rW_p), Math.min(rB_s, rB_p))
    if (poleA === poleB) continue
    const key = `${role}:${mode}:${Math.round(cs.H / 12)}:${poleA}`
    if (seen.has(key)) continue
    seen.add(key)
    found.push({
      role, mode, stop, seed, L: cs.L, H: cs.H, Cs: cs.C, Cp,
      hexS: hexOf(cs.L, Cp, cs.H), p3: p3Css(cs.L, Cp, cs.H),
      rW_s, rW_p, rB_s, rB_p, poleA, poleB,
    })
  }
}

for (let H = 0; H < 360; H += 10) for (const L of [0.40, 0.55, 0.70]) for (const C of [0.08, 0.13, 0.18]) {
  const hex = seedHex(L, C, H)
  const t = resolveTheme({ primaryHex: hex, name: 'sweep' })   // wcag profile — the legal lane
  scanCtas(t.themed.scale, 'brand', hex)
  for (const o of t.signalOverrides) scanCtas(o.scale, `signal ${o.name}`, hex)
}
// canonical signals + a gray canary once
const t0 = resolveTheme({ primaryHex: '#888888', name: 'sig' })
scanCtas(t0.themed.scale, 'brand-gray-canary', '#888888')
for (const [name, { scale }] of signalScalesFor(undefined)) scanCtas(scale, `signal ${name} (canonical)`, '—')

found.sort((a, b) => Math.min(a.rW_p, a.rB_p) - Math.min(b.rW_p, b.rB_p))
const pick = found.slice(0, 8)
console.log(`disagreement rows found: ${found.length}, showing ${pick.length}`)
for (const e of pick)
  console.log(`${e.role} ${e.mode} ${e.stop} H${e.H.toFixed(0)} L${e.L.toFixed(2)} C ${e.Cs.toFixed(3)}→${e.Cp.toFixed(3)}  W ${e.rW_s.toFixed(2)}/${e.rW_p.toFixed(2)}  B ${e.rB_s.toFixed(2)}/${e.rB_p.toFixed(2)}  sRGB-only:${e.poleA ? 'white' : 'black'} safe:${e.poleB ? 'white' : 'black'}`)

const f2 = (n: number) => n.toFixed(2)
const mark = (r: number) => (r >= BAR ? `${f2(r)} ✓` : `<b style="color:#b3261e">${f2(r)} ✗</b>`)
const chip = (bg: string, bgP3: string | null, label: string, textColor: string) => `
  <div class="chip" style="background:${bg};${bgP3 ? `background:${bgP3};` : ''}">
    <span class="aa" style="color:#fff">Aa</span><span class="aa" style="color:#000">Aa</span>
    <button style="color:${textColor}">Get started</button>
    <div class="cap">${label}</div>
  </div>`

const cards = pick.map(e => {
  const aTxt = e.poleA ? '#fff' : '#000', bTxt = e.poleB ? '#fff' : '#000'
  const aName = e.poleA ? 'WHITE' : 'BLACK', bName = e.poleB ? 'WHITE' : 'BLACK'
  const aR = e.poleA ? [e.rW_s, e.rW_p] : [e.rB_s, e.rB_p]
  const bR = e.poleB ? [e.rW_s, e.rW_p] : [e.rB_s, e.rB_p]
  return `
  <div class="card">
    <h3>${e.role} · ${e.mode} ${e.stop} · hue ${e.H.toFixed(0)} · seed ${e.seed}</h3>
    <div class="pair">
      ${chip(e.hexS, null, `sRGB fallback (what audit tools measure)`, aTxt)}
      ${chip(e.hexS, e.p3, `P3 pixels (what phones show)`, aTxt)}
    </div>
    <table>
      <tr><th></th><th>on sRGB fallback</th><th>on P3 pixels</th></tr>
      <tr><td>sRGB-only regime ships <b>${aName}</b></td><td>${mark(aR[0])}</td><td>${mark(aR[1])}</td></tr>
      <tr><td>strictly-safe ships <b>${bName}</b></td><td>${mark(bR[0])}</td><td>${mark(bR[1])}</td></tr>
    </table>
  </div>`
}).join('\n')

const html = `<!doctype html><meta charset="utf-8"><title>D5 — legal pole: sRGB-only vs strictly-safe</title>
<style>
  body { font: 14px/1.5 -apple-system, sans-serif; background:#faf9f7; color:#1a1a1a; max-width: 880px; margin: 2rem auto; padding: 0 1rem; }
  .note { background:#fff; border:1px solid #ddd; border-radius:8px; padding:.8rem 1rem; margin-bottom:1.5rem; }
  .card { background:#fff; border:1px solid #ddd; border-radius:10px; padding:1rem 1.2rem; margin-bottom:1.4rem; }
  .card h3 { margin:.1rem 0 .8rem; font-size:.95rem; font-weight:600; }
  .pair { display:flex; gap:1rem; margin-bottom:.8rem; }
  .chip { flex:1; border-radius:8px; padding:1rem; text-align:center; }
  .aa { font-size:1.3rem; font-weight:700; margin:0 .4rem; }
  .chip button { display:block; margin:.6rem auto .3rem; padding:.45rem 1.2rem; border:none; border-radius:6px; background:transparent; font-weight:600; font-size:1rem; }
  .cap { font-size:.75rem; color:rgba(0,0,0,.65); background:rgba(255,255,255,.75); border-radius:4px; display:inline-block; padding:0 .4rem; margin-top:.5rem; }
  table { border-collapse:collapse; width:100%; font-size:.85rem; }
  td, th { border:1px solid #e5e5e5; padding:.35rem .6rem; text-align:left; }
</style>
<h1>D5 — where the two measurement regimes disagree on the legal text color</h1>
<div class="note">
  <b>How to read this:</b> each cta is shown twice — the sRGB fallback and the P3 pixels
  (on a P3 display the right chip is slightly more vivid; on an sRGB display they look
  identical — the METER difference is the point, not the visual one). Chroma is at FULL
  P3 headroom: the most Phase B could assign these stops; real values land at or below
  this, so these are the worst cases. "sRGB-only" = the legal 4.5 floor measured on the
  fallback only. "Strictly-safe" = the chosen text color must clear 4.5 on BOTH.
  Both Aa marks sit on every chip for eye reference; the button text uses the regime's pick.
</div>
${cards}
<p>${pick.length} of ${found.length} disagreement rows shown (deduped by hue band). All are light-mode ctas — dark ctas showed zero 4.5-crossings in the sweep.</p>
`
mkdirSync('render', { recursive: true })
writeFileSync('render/p3-d5-poles.html', html)
console.log('written → render/p3-d5-poles.html')
