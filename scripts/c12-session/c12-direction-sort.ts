// c12-direction-sort.ts — INSTRUMENT B of the restart (2026-07-10): per-brand DIRECTION sort.
// Owner correction: direction is a per-brand judgment — some fired brands go LIGHT, some DARK;
// never one rule, never nearest. Per fired cell (P.130 provisional range — the middle-wide
// candidate from instrument A): identity chip · red cta · LIGHT exit · DARK exit, real-use
// buttons. RAW colors throughout (clamped identity chroma, no resolve, no enforcement; text
// pole = display-only best APCA pole). Exit distances are PROVISIONAL (instrument C calibrates):
//   LIGHT = the brightest L that still holds white text Lc>=60 at that hue/chroma
//   DARK  = raw dL 0.18 below red's cta (her old "truly different" read on value pairs)
//
// v2 (owner marks 2026-07-10): L0.45 RULED all DARK · L0.65 RULED all LIGHT (ruled slices kept
// below as the record). L0.55 = the judged slice, per her ask: each row MARKED with which exit
// is closer to the seed in L and which in C (margins printed) — rows where both axes agree =
// quick answer, pre-sorted; the rest she judges by eye. Marks persisted: direction-marks.json.
import { writeFileSync, mkdirSync } from 'fs'
import { signalScalesFor } from '/Users/emilygerrity/okchroma/src/engine/resolve'
import { hexToOklch, redGateDist } from '/Users/emilygerrity/okchroma/src/engine/colorMath'
import { whiteTextLcAt, apcaYAt } from '/Users/emilygerrity/okchroma/src/reqtoken/producers'
import { clampChromaToGamut, oklchToLinearRgb, apcaLc } from '/Users/emilygerrity/okchroma/src/engine/constraints'

const hx = (L: number, C: number, H: number) => {
  const c = clampChromaToGamut(L, C, H)
  const [rl, gl, bl] = oklchToLinearRgb(L, c, H)
  const gm = (v: number) => { const x = Math.min(1, Math.max(0, v)); return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055 }
  const ch = (v: number) => Math.round(gm(v) * 255).toString(16).padStart(2, '0')
  return `#${ch(rl)}${ch(gl)}${ch(bl)}`
}
const bLc = (L: number, C: number, H: number) => Math.abs(apcaLc(apcaYAt(0, 0, 0), apcaYAt(L, C, H)))
const btn = (L: number, C: number, H: number, label: string) => {
  const w = whiteTextLcAt(L, clampChromaToGamut(L, C, H), H), b = bLc(L, clampChromaToGamut(L, C, H), H)
  return `<div class="btn" style="background:${hx(L, C, H)};color:${w >= b ? '#fff' : '#000'}">${label}</div>`
}
const red = signalScalesFor('apca').get('red')!.scale.cta
const redDark = signalScalesFor('apca').get('red')!.scale.ctaDark
const G_PROVISIONAL = 0.130
const whiteTop = (C: number, H: number) => {
  let lo = 0.3, hi = 0.95
  for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; whiteTextLcAt(m, clampChromaToGamut(m, C, H), H) >= 60 ? (lo = m) : (hi = m) }
  return lo
}

const HS: number[] = []; for (let H = 352; H < 352 + 88; H += 4) HS.push(H % 360)
const CS = [0.04, 0.06, 0.08, 0.10, 0.12, 0.14, 0.17, 0.20]
const LS = [0.45, 0.55, 0.65, 0.73]   // representative slices; intermediate L follows the fitted rule
const RULED: Record<string, string> = { '0.45': 'all DARK', '0.65': 'all LIGHT' }   // owner 2026-07-10

const row = (H: number, C: number, L: number, anchor: { L: number; C: number; H: number }, upL: number, downL: number, mark = '') => `
<div class="row"><div class="rlab">H${H} C${C} L${L}${mark}</div>
  <span class="chip" style="background:${hx(L, C, H)}"></span>
  ${btn(anchor.L, anchor.C, anchor.H, 'Delete')}
  ${btn(upL, C, H, 'Primary action')}<span class="xlab">light · L ${upL.toFixed(2)}</span>
  ${btn(downL, C, H, 'Primary action')}<span class="xlab">dark · L ${downL.toFixed(2)}</span>
</div>`

// owner ask 2026-07-10 (image): the differences are tight — judge on a FLUSH strip, no gaps,
// the exact color in the middle: [LIGHT exit][seed][DARK exit]. Bare blocks, seams visible.
const strip = (H: number, C: number, L: number, upL: number, downL: number, mark = '', sm = false) => `
<div class="srow"><div class="rlab">H${H} C${C} L${L}${mark}</div>
  <div class="strip${sm ? ' sm' : ''}">
    <div class="sw" style="background:${hx(upL, C, H)}"></div>
    <div class="sw" style="background:${hx(L, C, H)}"></div>
    <div class="sw" style="background:${hx(downL, C, H)}"></div>
  </div>
</div>`

// ── L0.55: resolved from her marks (2026-07-10) — crossed = OUT OF RANGE ("reads pink or
// gold"), checked/verbal = conflict exits LIGHT; 9 rows her strokes never reached stay open ──
// HER NET (2026-07-10): "if something seems like it really conflicts and I am missing it, it
// goes light" — crossed cells INSIDE her own fitted gate (G .090, the 0/67 metric) flip to
// LIGHT instead of dropping from range. 5 flips; H8 C0.17 = exact boundary (.0904), stays her cross.
// GOLDS ruled 2026-07-10 ("none of the golds conflict — saturated colors going dark get
// SCARIER, lighter reads salmon/pink/orange"). NET RETIRED 2026-07-10: her eye-check on the 8
// net-flipped cells ("look distinct from an error") tested as SCENARIO B (all 8 clear) →
// fit v7 = 0/100 PERFECT (wDark .70 wLight 1.6 wDust 1.4 wGold 1.6 G .090 ≈ v5 confirmed).
// Formula survives → all 8 OUT. L0.55 CLOSED: 30 out · 30 light · 0 dark.
const EPS = 0.005
const X_OUT = new Set(['356|0.17', '0|0.14', '0|0.17', '4|0.14', '4|0.17', '8|0.12', '8|0.14', '8|0.17', '12|0.12', '12|0.14', '16|0.12', '16|0.14', '20|0.12', '24|0.12', '28|0.12', '32|0.12', '36|0.12', '40|0.12', '44|0.12', '44|0.14', '56|0.2', '60|0.2', '12|0.17', '20|0.14', '24|0.14', '28|0.14', '32|0.14', '36|0.14', '40|0.14', '52|0.2'])
const MATH_LIGHT = new Set<string>([])
const CHECK_LIGHT = new Set(['16|0.17', '20|0.17', '24|0.17', '28|0.17', '32|0.17'])
const VERBAL_LIGHT = new Set(['356|0.2', '0|0.2', '4|0.2', '8|0.2', '12|0.2', '16|0.2', '20|0.2', '24|0.2', '28|0.2', '32|0.2', '36|0.17', '36|0.2', '40|0.17', '40|0.2', '44|0.17', '44|0.2', '48|0.12', '48|0.14', '48|0.17', '48|0.2', '52|0.14', '52|0.17', '56|0.14', '56|0.17', '60|0.17'])
type JRow = { key: string; html: string; htmlSm: string }
const judge: JRow[] = []
for (const H of HS) for (const C of CS) {
  const L = 0.55
  const o = hexToOklch(hx(L, C, H))
  if (redGateDist(o, red) > G_PROVISIONAL) continue
  const upL = whiteTop(C, H), dnL = red.L - 0.18
  const seedC = clampChromaToGamut(L, C, H)
  const dLup = Math.abs(upL - L), dLdn = Math.abs(dnL - L)
  const dCup = Math.abs(clampChromaToGamut(upL, C, H) - seedC), dCdn = Math.abs(clampChromaToGamut(dnL, C, H) - seedC)
  const closerL = Math.abs(dLup - dLdn) < EPS ? 'tie' : (dLup < dLdn ? 'light' : 'dark')
  const closerC = Math.abs(dCup - dCdn) < EPS ? 'tie' : (dCup < dCdn ? 'light' : 'dark')
  const gd = redGateDist(o, red)
  const mk = (ax: string, v: string, m: number) => `${ax}→${v}${v !== 'tie' ? ` by ${m.toFixed(3)}` : ''}`
  const mark = `<br><span class="mk">${mk('L', closerL, Math.abs(dLup - dLdn))} · ${mk('C', closerC, Math.abs(dCup - dCdn))}<br>fitted gate ${gd.toFixed(3)} — ${gd <= 0.090 ? 'INSIDE (really conflicts)' : 'outside'}</span>`
  judge.push({ key: `${H}|${C}`, html: strip(H, C, L, upL, dnL, mark), htmlSm: strip(H, C, L, upL, dnL, '', true) })
}
const openRows = judge.filter(r => !X_OUT.has(r.key) && !MATH_LIGHT.has(r.key) && !CHECK_LIGHT.has(r.key) && !VERBAL_LIGHT.has(r.key))
const outRows = judge.filter(r => X_OUT.has(r.key))
const mathRows = judge.filter(r => MATH_LIGHT.has(r.key))
const lightRuled = judge.filter(r => CHECK_LIGHT.has(r.key) || VERBAL_LIGHT.has(r.key))
const judgedSec = `<h1>L 0.55 slice (${judge.length} fired) — ✅ RESOLVED (owner marks + net, 2026-07-10)</h1>
<div class="note">Strip = <b>LIGHT exit · the exact color · DARK exit</b>, flush. Crossed = NO CONFLICT (reads pink or gold) → leaves the fire range, feeds the refit as CLEAR. Checked + verbal = conflict → LIGHT. <b>Zero dark exits at this slice.</b>
<b>Net resolved by your eye (2026-07-10):</b> the 8 net-flipped cells "look distinct from an error" — tested as clear against all 100 marks: fit v7 = 0/100 PERFECT (wDark .70 · wLight 1.6 · wDust 1.4 · wGold 1.6 · G .090 ≈ v5 confirmed). Formula survives → all 8 OUT, no light fallback needed.
<b>Golds ruling recorded:</b> none conflict — saturated colors going dark get SCARIER; lighter reads salmon/pink/orange.</div>
${openRows.length ? `<h2>❓ OPEN (${openRows.length})</h2>${openRows.map(r => r.html).join('')}` : ''}
${mathRows.length ? `<h2>⚖️ NET → LIGHT (${mathRows.length})</h2>${mathRows.map(r => r.html).join('')}` : ''}
<h2>❌ RULED NO CONFLICT — out of the fire range (${outRows.length})</h2>
${outRows.map(r => r.htmlSm).join('')}
<h2>✅ RULED CONFLICT → LIGHT (${lightRuled.length} = 5 checked + ${VERBAL_LIGHT.size} verbal)</h2>
${lightRuled.map(r => r.htmlSm).join('')}`
console.log(`L0.55 resolved: out-of-range ${outRows.length} · net→light ${mathRows.length} · light ${lightRuled.length} · open ${openRows.length} (total ${judge.length})`)

// ── ruled slices kept as the record ──
const ruledSecs: string[] = []
for (const L of LS) {
  if (L === 0.55) continue
  const rs: string[] = []
  for (const H of HS) for (const C of CS) {
    const o = hexToOklch(hx(L, C, H))
    if (redGateDist(o, red) > G_PROVISIONAL) continue
    rs.push(row(H, C, L, red, whiteTop(C, H), red.L - 0.18))
  }
  const ruling = RULED[L.toFixed(2)]
  ruledSecs.push(`<h1>L ${L.toFixed(2)} slice (${rs.length} fired)${ruling ? ` — ✅ RULED ${ruling} (owner 2026-07-10)` : rs.length ? '' : ' — none fire'}</h1>${ruling ? rs.join('') : ''}`)
}

let darkRows = 0
const darkSecs: string[] = []
for (const L of LS) {
  const rs: string[] = []
  for (const H of HS) for (const C of CS) {
    const o = hexToOklch(hx(L, C, H))
    if (redGateDist(o, redDark) > G_PROVISIONAL) continue
    rs.push(strip(H, C, L, redDark.L + 0.18, redDark.L - 0.18))
    darkRows++
  }
  if (rs.length) darkSecs.push(`<h1>L ${L.toFixed(2)} slice (${rs.length} fired)</h1>${rs.join('')}`)
}
const html = `<!doctype html><meta charset="utf-8"><title>C12 — direction sort</title>
<style>
  body { font: 14px/1.5 -apple-system, sans-serif; margin:0; background:#faf9f7; color:#1a1a1a; }
  .note { padding:.9rem 1.4rem; background:#f2f0ec; font-size:.88rem; }
  h1 { margin:1.4rem 1.4rem .3rem; font-size:.9rem; }
  h2 { margin:1rem 1.4rem .2rem; font-size:.78rem; text-transform:uppercase; letter-spacing:.04em; opacity:.75; }
  .row { display:flex; align-items:center; gap:.7rem; padding:.35rem 1.4rem; border-bottom:1px solid #e5e2dd; }
  .rlab { width:150px; font-size:.72rem; opacity:.6; }
  .mk { font-size:.66rem; opacity:.9; font-weight:600; }
  .chip { flex:0 0 26px; width:26px; height:26px; border-radius:6px; display:inline-block; }
  .srow { display:flex; align-items:center; gap:1rem; padding:.5rem 1.4rem; border-bottom:1px solid #e5e2dd; }
  .dark .srow { border-bottom-color:#2a2a2e; }
  .strip { display:flex; }
  .sw { width:180px; height:90px; }
  .strip.sm .sw { width:110px; height:44px; }
  .btn { padding:.45rem 1.1rem; border-radius:8px; font-size:.82rem; font-weight:600; }
  .xlab { font-size:.68rem; opacity:.55; width:90px; }
  .dark { background:#141416; color:#e8e8e8; }
  .dark .row { border-bottom-color:#2a2a2e; }
  .dark h1 { color:#e8e8e8; }
  .dark .note { background:#1e1e22; color:#d5d5d5; }
</style>
<div class="note"><b>C12 — which way does each fired brand exit?</b> Per row: identity chip · red signal · LIGHT exit · DARK exit (raw colors, provisional distances — instrument C calibrates how far).
✅ Ruled so far (owner 2026-07-10): L0.45 all dark · L0.65 all light · L0.73 none fire. L0.55 below is the open sort — each row marked with which exit sits closer to the seed's own L and own C (margins printed; ties under ${EPS}).
Rows where both axes agree are pre-answered per your quick-answer rule — veto any; the rest are yours to judge.</div>
${judgedSec}
${ruledSecs.join('\n')}
<div class="dark">
<div class="note"><b>Dark mode — same sort on dark ground (still open; light rulings don't auto-carry).</b> Strip = LIGHT exit (louder, up) · the exact color · DARK exit (quieter, down — the prominence-floor question is yours to rule). Anchor = red's dark cta.</div>
${darkSecs.join('\n')}
</div>`
mkdirSync('/Users/emilygerrity/okchroma/render', { recursive: true })
writeFileSync('/Users/emilygerrity/okchroma/render/c12-direction-sort.html', html)
console.log(`written -> render/c12-direction-sort.html (dark rows ${darkRows})`)
