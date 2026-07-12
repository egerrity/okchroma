// c12-dark-solve.ts — the DERIVED dark-cta answer (owner 2026-07-11 "you should already have
// the math"). Computed, not fitted — and the loudnessFloor(H) hypothesis is DEAD on the numbers
// (a hue-keyed floor re-piles same-hue pairs at red's own level; her case p2 got WORSE,
// 0.087→0.078). What clears: DARK FALLS OUT LIKE EVERY CTA — the same v8 travel solve, run on
// dark geometry, with membership + release on P2 (the metric that sees dark vibration; the P1
// gate passes these pairs, the known blindness):
//   member: p2(brandDark, redDark) < 0.11  →  travel the nearest direction until
//           p2 >= 0.12 && dark pole passes (lane Lc).  Red dark stays canonical/static.
// Result on the near-red population (70 pairs, both lanes): 0 below bar (current: 12 below,
// worst 0.086). All movers = apca lane, all resolve UP 0.69→0.77 (brighter = MORE prominent —
// no dead buttons). wcag lane already separates (red dark 0.585 vs floor 0.70) — untouched.
// Full-wheel over-fire check: 3/576 fire, all within dh −4…+6 of red. NOTHING WIRED — this
// page shows the result.
import { writeFileSync, mkdirSync } from 'fs'
import { resolveBrand, signalScalesFor } from '/Users/emilygerrity/okchroma/src/engine/resolve'
import { whiteTextLcAt, blackTextLcAt, apcaYAt } from '/Users/emilygerrity/okchroma/src/reqtoken/producers'
import { hexToOklch, maxChromaAt, hueDelta, onTextIsWhite } from '/Users/emilygerrity/okchroma/src/engine/colorMath'
import { clampChromaToGamut, oklchToLinearRgb } from '/Users/emilygerrity/okchroma/src/engine/constraints'
import { p2Diff } from '/Users/emilygerrity/okchroma/src/engine/p2'

const hx = (L: number, C: number, H: number) => {
  const c = clampChromaToGamut(L, C, H)
  const [rl, gl, bl] = oklchToLinearRgb(L, c, H)
  const gm = (v: number) => { const x = Math.min(1, Math.max(0, v)); return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055 }
  const ch = (v: number) => Math.round(gm(v) * 255).toString(16).padStart(2, '0')
  return `#${ch(rl)}${ch(gl)}${ch(bl)}`
}
const BAR = 0.11, MARGIN = 0.01

const seeds: string[] = ['#FF2600', '#C61D1B', '#EE3123', '#A50034', '#D8261C']
for (const H of [16, 22, 28, 34, 40]) for (const L of [0.48, 0.58, 0.68]) for (const vf of [0.72, 0.9])
  seeds.push(hx(L, vf * maxChromaAt(L, H), H).toUpperCase())

const rows: string[] = []
const probe: any[] = []
for (const profile of ['wcag', 'apca'] as const) {
  const p = profile === 'apca' ? 'apca' as const : undefined
  const redDark = signalScalesFor(p).get('red')!.scale.ctaDark
  const enforceLc = p === 'apca' ? 60 : undefined
  for (const hex of [...new Set(seeds)]) {
    const seed = hexToOklch(hex)
    if (Math.abs(hueDelta(seed.H, 33.3)) > 30) continue
    const rb = resolveBrand(hex, 'b', { contrastProfile: p })
    const cur = rb.scale.ctaDark
    const poleOk = (L: number, C: number, H: number) => enforceLc === undefined ? true :
      (whiteTextLcAt(L, clampChromaToGamut(L, C, H), H) >= enforceLc || blackTextLcAt(L, C, H) >= enforceLc)
    const at = (L: number) => ({ L, C: clampChromaToGamut(L, cur.C, cur.H), H: cur.H })
    let solved: { L: number; C: number; H: number } = cur
    if (p2Diff(cur, redDark) < BAR) {
      const travel = (dir: 1 | -1): number | null => {
        for (let L = cur.L; L >= 0.28 && L <= 0.92; L += dir * 0.002) {
          const c = at(L)
          if (p2Diff(c, redDark) >= BAR + MARGIN && poleOk(L, c.C, c.H)) return Math.abs(L - cur.L)
        }
        return null
      }
      const dn = travel(-1), up = travel(1)
      if (dn !== null || up !== null) {
        const dir = dn !== null && (up === null || dn <= up) ? -1 : 1
        solved = at(cur.L + dir * (dir === -1 ? dn! : up!))
      }
    }
    const movedFlag = solved.L !== cur.L
    const p2Cur = +p2Diff(cur, redDark).toFixed(3), p2New = +p2Diff(solved, redDark).toFixed(3)
    probe.push({ profile, hex, curL: +cur.L.toFixed(3), solvedL: +solved.L.toFixed(3), moved: movedFlag, p2Cur, p2New })
    const cell = (c: { L: number; C: number; H: number }, title: string) => {
      const white = onTextIsWhite(apcaYAt(c.L, c.C, c.H), c.L, c.C, c.H, false)
      return `<div class="cell"><div class="clab">${title} · L${c.L.toFixed(2)}</div>
<div class="pair"><div class="btn" style="background:${hx(c.L, c.C, c.H)};color:${white ? '#fff' : '#000'}">Primary</div><div class="btn" style="background:${hx(redDark.L, redDark.C, redDark.H)};color:#fff">Red</div></div></div>`
    }
    rows.push(`<div class="row ${movedFlag ? '' : 'same'}"><div class="rid"><div class="idsw" style="background:${hex}"></div>
<div class="rmeta"><b>${hex}</b> ${profile.toUpperCase()} · H${seed.H.toFixed(0)}<br>p2 vs red-dark: ${p2Cur} → <b>${p2New}</b>${movedFlag ? ` · lifts L${cur.L.toFixed(2)}→L${solved.L.toFixed(2)}` : ' · already clear'}</div></div>
<div class="cells">${cell(cur, 'CURRENT')}${cell(solved, 'SOLVED')}</div></div>`)
  }
}

const html = `<!doctype html><meta charset="utf-8"><title>C12 — dark cta, the same solve</title>
<style>
  body { font: 14px/1.5 -apple-system, sans-serif; margin:0; background:#141416; color:#e8e8e8; }
  .note { padding:.9rem 1.4rem; background:#1e1e22; font-size:.86rem; color:#d5d5d5; }
  .row { display:flex; gap:1.4rem; align-items:center; padding:.6rem 1.4rem; border-bottom:1px solid #26262b; }
  .row.same { opacity:.38; }
  .rid { display:flex; gap:.6rem; align-items:center; width:300px; flex:0 0 300px; }
  .idsw { width:40px; height:40px; flex:0 0 40px; border-radius:6px; }
  .rmeta { font-size:.72rem; opacity:.85; }
  .cells { display:flex; gap:1.8rem; }
  .cell { display:flex; flex-direction:column; align-items:center; gap:.25rem; }
  .clab { font-size:.6rem; text-transform:uppercase; letter-spacing:.03em; opacity:.55; }
  .pair { display:flex; gap:.5rem; }
  .btn { width:100px; height:46px; border-radius:23px; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:.78rem; }
</style>
<div class="note"><b>C12 — the dark cta falls out like every cta: the same v8 travel solve, on dark geometry, keyed on p2
(the metric that sees dark vibration — the P1 gate passes all these pairs).</b><br>
No fitted curve, no marks: member = p2 &lt; 0.11 beside the red dark cta → travel the nearest direction to p2 ≥ 0.12 with a passing pole. Red dark stays canonical.
Result: 0/70 near-red pairs below the bar (current: 12, worst 0.086). Every mover = APCA lane, lifts UP 0.69→0.77 (brighter = more prominent). WCAG already separates — untouched. Greyed rows = already clear.
The loudnessFloor(H) idea is dead on the numbers: a hue-keyed floor re-piles same-hue pairs at red's own level (her case worsened 0.087→0.078).</div>
${rows.join('')}`

mkdirSync('/Users/emilygerrity/okchroma/render', { recursive: true })
writeFileSync('/Users/emilygerrity/okchroma/render/c12-dark-solve.html', html)
writeFileSync('/Users/emilygerrity/okchroma/scripts/c12-session/dark-solve-probe.json', JSON.stringify({ date: '2026-07-11', bar: BAR, margin: MARGIN, rows: probe }, null, 1))
const moved = probe.filter(r => r.moved)
console.log(`written -> render/c12-dark-solve.html (${probe.length} rows, ${moved.length} moved, 0 below bar: ${probe.every(r => r.p2New >= BAR)})`)
