// cta-deadzone-probe.ts — MEASURE the cross-metric cta dead zone (owner 2026-07-13, plugin
// test: green #22a559's cta ships BLACK under wcag but WHITE under apca — "even if black
// passes on wcag here, there is a reason apca picks white, bc black doesn't pass").
//
// A dead zone = the wcag-chosen pole passes its 4.5 ratio but FAILS the shipped APCA Lc bar —
// legally passing, perceptually weak. The default wcag lane cannot move the fill in that case
// (the pole judge flips to the ratio-passing pole before any solve runs; the darken solve is
// white-gated). This probe reports, per cta: both poles' wcag ratio + APCA Lc in both lanes,
// flags dead zones, and SIZES the two candidate fill moves the owner named:
//   (1) LIGHTEN the fill until black clears the Lc bar (pole stays black), or
//   (2) DARKEN the fill until white clears BOTH 4.5 and the Lc bar (pole flips to white).
// MEASUREMENT ONLY — nothing wired. Exhibit → render/cta-deadzone.html.
import { writeFileSync, mkdirSync } from 'fs'
import { resolveBrand, resolveTheme } from '../src/engine/resolve'
import {
  whiteTextLcAt, blackTextLcAt, findLForWhiteTextLc, findLForBlackTextLc,
} from '../src/reqtoken/producers'
import { legalRatio, findLForContrast, clampChromaToGamut, oklchToLinearRgb } from '../src/engine/constraints'
import { hexToOklch } from '../src/engine/colorMath'
import type { ContrastProfile } from '../src/engine/colorEngine'

const LC_BAR = 60           // the shipped apca on-cta bar
const FIRE = LC_BAR + 2     // the C15 fire margin convention

const gm = (v: number) => { const x = Math.min(1, Math.max(0, v)); return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055 }
const hx = (c: { L: number; C: number; H: number }) => {
  const cc = clampChromaToGamut(c.L, c.C, c.H)
  const [rl, gl, bl] = oklchToLinearRgb(c.L, cc, c.H)
  const ch = (v: number) => Math.round(gm(v) * 255).toString(16).padStart(2, '0')
  return `#${ch(rl)}${ch(gl)}${ch(bl)}`
}

interface CtaRead {
  name: string
  lane: 'wcag' | 'apca'
  fill: { L: number; C: number; H: number }
  paper1: { L: number; C: number; H: number }
  pole: 'white' | 'black'
  wRatio: number; kRatio: number; wLc: number; kLc: number
  dead: boolean            // the lane's chosen pole fails the Lc bar
  lightenL: number | null  // candidate 1: fill L where BLACK clears FIRE (null = can't within cap)
  darkenL: number | null   // candidate 2: fill L where WHITE clears FIRE and 4.5
}

const readCta = (name: string, lane: 'wcag' | 'apca', scale: { cta: any; onFillTextIsWhite: boolean; light: any[] }): CtaRead => {
  const c = scale.cta
  const wRatio = legalRatio(c.L, c.C, c.H, 1.0)
  const kRatio = legalRatio(c.L, c.C, c.H, 0)
  const wLc = whiteTextLcAt(c.L, c.C, c.H)
  const kLc = blackTextLcAt(c.L, c.C, c.H)
  const pole = scale.onFillTextIsWhite ? 'white' as const : 'black' as const
  const dead = (pole === 'white' ? wLc : kLc) < LC_BAR
  // candidate 1: lighten until black clears (cap 0.92, the enforce convention)
  const ll = findLForBlackTextLc(c.L, c.C, c.H, FIRE, 0.92)
  const lightenL = blackTextLcAt(ll, c.C, c.H) >= FIRE ? ll : null
  // candidate 2: darken until white clears the Lc bar AND 4.5 (darker satisfies both)
  const dLc = findLForWhiteTextLc(c.L, c.C, c.H, FIRE)
  const d45 = legalRatio(dLc, c.C, c.H, 1.0) >= 4.5 ? dLc : findLForContrast(dLc, c.C, c.H, 1.0, 4.6)
  const darkenL = whiteTextLcAt(d45, c.C, c.H) >= FIRE && legalRatio(d45, c.C, c.H, 1.0) >= 4.5 ? d45 : null
  return { name, lane, fill: c, paper1: scale.light[0], pole, wRatio, kRatio, wLc, kLc, dead, lightenL, darkenL }
}

// ── subjects: the owner's green (brand cta) + its shifted green signal (lime) ──
const OWNER_GREEN = '#22a559'
const subjects: CtaRead[] = []
for (const lane of ['wcag', 'apca'] as const) {
  const cp: ContrastProfile | undefined = lane === 'apca' ? 'apca' : undefined
  const t = resolveTheme({ primaryHex: OWNER_GREEN, contrastProfile: cp })
  subjects.push(readCta(`brand ${OWNER_GREEN}`, lane, t.primary.scale))
  const greenOv = t.signalOverrides.find(o => o.name === 'green')
  if (greenOv) subjects.push(readCta(`green signal (shifted: ${greenOv.note})`, lane, greenOv.scale))
}

// ── agnostic sweep: which ctas are cross-metric dead zones per lane ──
const sweep: CtaRead[] = []
for (const lane of ['wcag', 'apca'] as const) {
  const cp: ContrastProfile | undefined = lane === 'apca' ? 'apca' : undefined
  for (let H = 0; H < 360; H += 15) for (const L of [0.45, 0.55, 0.65, 0.75]) {
    const seed = hx({ L, C: 0.18, H })
    const r = resolveBrand(seed, 'probe', { contrastProfile: cp })
    sweep.push(readCta(`H${H} L${L}`, lane, r.scale))
  }
}
const deadW = sweep.filter(s => s.lane === 'wcag' && s.dead)
const deadA = sweep.filter(s => s.lane === 'apca' && s.dead)
console.log(`sweep (96 seeds/lane): wcag dead zones ${deadW.length} · apca dead zones ${deadA.length}`)
for (const d of deadW) console.log(`  wcag DEAD ${d.name}: pole ${d.pole} ratio ${(d.pole === 'white' ? d.wRatio : d.kRatio).toFixed(2)} Lc ${(d.pole === 'white' ? d.wLc : d.kLc).toFixed(1)} | lighten→L${d.lightenL?.toFixed(2) ?? '—'} darken→L${d.darkenL?.toFixed(2) ?? '—'}`)

// ── exhibit ──
const lab = (s: string) => `<div class="lab">${s}</div>`
const btn = (bg: string, fg: string, label: string) => `<div class="btn" style="background:${bg};color:${fg}">${label}</div>`
const cell = (title: string, r: CtaRead, fillL: number | null, pole: 'white' | 'black', note: string) => {
  if (fillL === null) return `<div class="cell">${lab(title)}${lab('no landing')}</div>`
  const f = { L: fillL, C: r.fill.C, H: r.fill.H }
  const ratio = legalRatio(fillL, f.C, f.H, pole === 'white' ? 1.0 : 0)
  const lc = pole === 'white' ? whiteTextLcAt(fillL, f.C, f.H) : blackTextLcAt(fillL, f.C, f.H)
  return `<div class="cell">${lab(title)}${btn(hx(f), pole === 'white' ? '#fff' : '#000', 'Button')}${lab(`${hx(f)} · L ${fillL.toFixed(2)} · ${pole} ${ratio.toFixed(2)}:1 · Lc ${lc.toFixed(1)}`)}${lab(note)}</div>`
}

const subjRows = ['wcag', 'apca'].map(lane => {
  const rows = subjects.filter(s => s.lane === lane)
  return rows.map(r => {
    const chosenRatio = r.pole === 'white' ? r.wRatio : r.kRatio
    const chosenLc = r.pole === 'white' ? r.wLc : r.kLc
    return `<div class="row"><div class="rlab"><b>${r.name}</b> · ${lane.toUpperCase()} ${r.dead ? '· <span class="dead">DEAD ZONE</span>' : ''}</div>
<div class="strip" style="background:${hx(r.paper1)}">
${cell('shipped', r, r.fill.L, r.pole, `other pole: ${r.pole === 'white' ? 'black' : 'white'} ${(r.pole === 'white' ? r.kRatio : r.wRatio).toFixed(2)}:1 · Lc ${(r.pole === 'white' ? r.kLc : r.wLc).toFixed(1)}`)}
${cell('candidate 1 · lighten, keep black', r, r.lightenL, 'black', r.lightenL !== null ? `ΔL ${(r.lightenL - r.fill.L >= 0 ? '+' : '')}${(r.lightenL - r.fill.L).toFixed(2)}` : '')}
${cell('candidate 2 · darken, flip white', r, r.darkenL, 'white', r.darkenL !== null ? `ΔL ${(r.darkenL - r.fill.L).toFixed(2)}` : '')}
</div></div>`
  }).join('')
}).join('')

const sweepFoot = `<div class="note"><b>Agnostic sweep (24 hues × 4 L, C .18, real pipeline):</b>
wcag lane dead zones: <b>${deadW.length}/96</b> — ${deadW.map(d => d.name).join(', ') || 'none'}.
apca lane dead zones: <b>${deadA.length}/96</b>${deadA.length ? ' — ' + deadA.map(d => d.name).join(', ') : ''}.
A dead zone = the lane's chosen on-cta pole reads under APCA Lc ${LC_BAR} at the shipped fill.</div>`

const html = `<!doctype html><meta charset="utf-8"><title>CTA cross-metric dead zones</title>
<style>
  body { font: 14px/1.5 -apple-system, sans-serif; margin:0; background:#faf9f7; color:#1a1a1a; }
  .note { padding:.9rem 1rem; background:#f2f0ec; font-size:.86rem; }
  .row { padding:.6rem 1rem .1rem; }
  .rlab { font-size:.8rem; margin-bottom:.3rem; }
  .dead { color:#b3261e; font-weight:800; }
  .strip { display:flex; gap:1.4rem; padding:.7rem .9rem; border-radius:10px; border:1px solid #e7e4de; }
  .cell { display:flex; flex-direction:column; gap:.15rem; align-items:flex-start; }
  .lab { font-size:.6rem; letter-spacing:.02em; opacity:.62; }
  .btn { min-width:120px; height:40px; border-radius:20px; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:.78rem; padding:0 1rem; }
</style>
<div class="note"><b>CTA cross-metric dead zones — measurement only, nothing wired.</b><br>
Owner case: on this green, wcag ships BLACK (passes 4.5) while apca ships WHITE (black fails the Lc bar) —
the wcag pick is legally passing but perceptually weak. Per cta: the shipped fill with both poles' numbers,
then the two candidate moves sized: (1) lighten until black genuinely clears Lc ${LC_BAR}, (2) darken until
white clears both 4.5 and Lc ${LC_BAR}. Candidates shown for BOTH lanes for comparison; the fix would fire
only where the chosen pole reads under the bar.</div>
${subjRows}
${sweepFoot}
<div style="height:1rem"></div>`

mkdirSync('render', { recursive: true })
writeFileSync('render/cta-deadzone.html', html)
console.log('written -> render/cta-deadzone.html')
