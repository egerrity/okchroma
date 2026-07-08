// calibration-lab.ts — render generators for the post-P3 calibration round (CATALOG C7 /
// docs/engine-spec/P3-KICKOFF.md), ported from the 2026-07-07 session scratchpad so the
// round doesn't rebuild them. Emits dist/calibration-lab.html: real-pipeline eye-check
// material, dark rows on the dark ground.
//
//   §1 fired-mute corridor solve — muted wash chroma at position t between the derived
//      secondary's C (t=0) and the signal's C (t=1), per stop, per mode; paper included,
//      highlights half-reduction, cta untouched. MOCKS, not pipeline output. t sweep
//      configurable below (shipped-direction default t ∈ {0.5, 0.42, 0.35}; red pins ~0.4
//      in sRGB — re-measure the corridor in P3).
//   §2 yellow vividness boundary strip — gold→brown seeds, which fire the gate today
//      (HUE_COLLISION_MIN_V); the owner letter is still owed.
//   §3 paper-1/2 diagnostics — stops 1–3 across hues with L/C values (the split the
//      owner flagged; paper-2 wants more chroma).
// npm run lab:calibration

import { resolveTheme, signalScalesFor } from '../src/engine/resolve'
import { toHex } from '../src/engine/cssRender'
import { makeStop } from '../src/engine/colorMath'
import { stopDeltaE } from '../src/engine/collision'
import { clampChromaToGamut, oklchToLinearRgb } from '../src/engine/constraints'
import type { GeneratedScale } from '../src/engine/colorEngine'
import * as fs from 'fs'

const T_SWEEP = [0.5, 0.42, 0.35]
const MUTE_CASES = [
  { name: 'green brand', hex: '#2faa4c', signal: 'green' },
  { name: 'gold brand', hex: '#9f6105', signal: 'yellow' },
  { name: 'red-adjacent brand', hex: '#ce725e', signal: 'red' },
] as const
const STRIP_CS = [0.03, 0.04, 0.05, 0.06, 0.07, 0.08]
const WASH = [3, 4, 5, 6, 7]

const seedHex = (L: number, C: number, H: number) => {
  const c = clampChromaToGamut(L, C, H)
  const [rl, gl, bl] = oklchToLinearRgb(L, c, H)
  const gm = (v: number) => { const x = Math.min(1, Math.max(0, v)); return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055 }
  return '#' + [rl, gl, bl].map(v => Math.round(gm(v) * 255).toString(16).padStart(2, '0')).join('')
}
type RS = ReturnType<typeof roleSet>
const roleSet = (s: GeneratedScale) => ({
  light: s.light.filter(x => x.stop <= 12).map(x => ({ stop: x.stop, hex: toHex(x.r, x.g, x.b), L: x.L, C: x.C })),
  dark: s.dark.filter(x => x.stop <= 12).map(x => ({ stop: x.stop, hex: toHex(x.r, x.g, x.b), L: x.L, C: x.C })),
  cta: toHex(s.cta.r, s.cta.g, s.cta.b), ctaDark: toHex(s.ctaDark.r, s.ctaDark.g, s.ctaDark.b),
  onWhite: s.onFillTextIsWhite, onWhiteDark: s.onFillTextIsWhiteDark,
})
const wmin = (b: any, g: any, mode: 'light' | 'dark') => {
  let m = Infinity
  for (const k of WASH) { const bs = b[mode].find((x: any) => x.stop === k), gs = g[mode].find((x: any) => x.stop === k); if (bs && gs) m = Math.min(m, stopDeltaE(bs, gs)) }
  return +m.toFixed(4)
}
// the corridor solve (mock: rebuilt stops, same L/H)
const solved = (b: GeneratedScale, sig: GeneratedScale, sec: GeneratedScale, t: number) => {
  const remap = (mode: 'light' | 'dark') => {
    const at = (s: GeneratedScale, k: number) => (mode === 'light' ? s.light : s.dark).find(x => x.stop === k)!
    const cur5 = at(b, 5), mid5 = Math.min(cur5.C, at(sec, 5).C + t * (at(sig, 5).C - at(sec, 5).C))
    const hlFactor = 1 - 0.5 * (1 - mid5 / Math.max(cur5.C, 1e-6))
    return (mode === 'light' ? b.light : b.dark).map(x => {
      const cNew = x.stop <= 7
        ? Math.min(x.C, at(sec, x.stop).C + t * (at(sig, x.stop).C - at(sec, x.stop).C))
        : x.C * hlFactor
      const m = makeStop(x.stop, x.L, cNew, x.H)
      return { ...x, r: m.r, g: m.g, b: m.b, C: m.C }
    })
  }
  return { ...b, light: remap('light'), dark: remap('dark') }
}

const strip = (stops: any[]) => `<div class="strip">${stops.map(s => `<div class="sw" style="background:${s.hex}" title="stop ${s.stop} ${s.hex}"></div>`).join('')}</div>`
const btn = (bg: string, onWhite: boolean) => `<span class="btn" style="background:${bg};color:${onWhite ? '#fff' : '#000'}">Aa</span>`
const row = (label: string, note: string, rs: RS, m: 'light' | 'dark') =>
  `<div class="staterow"><div class="statelabel">${label}<div class="fired">${note}</div></div><div class="ramps"><div class="rampline">${strip(rs[m])}${btn(m === 'dark' ? rs.ctaDark : rs.cta, m === 'dark' ? rs.onWhiteDark : rs.onWhite)}</div></div></div>`

const cards: string[] = []

// §1 mute corridor
for (const c of MUTE_CASES) {
  const t = resolveTheme({ primaryHex: c.hex, name: 'x', deriveSecondary: true })
  const canon = signalScalesFor(undefined).get(c.signal)!.scale
  const b = t.primary.scale, sec = t.secondary!.scale
  const rsCanon = roleSet(canon), rsSec = roleSet(sec)
  const panes = (['light', 'dark'] as const).map(m => `
    <div class="pane ${m}"><div class="panetitle">${m}</div>
      ${row('current', `sig ${wmin(roleSet(b), rsCanon, m)} · sec ${wmin(roleSet(b), rsSec, m)}`, roleSet(b), m)}
      ${T_SWEEP.map(tt => { const rs = roleSet(solved(b, canon, sec, tt) as GeneratedScale); return row(`solve t=${tt}`, `sig ${wmin(rs, rsCanon, m)} · sec ${wmin(rs, rsSec, m)}`, rs, m) }).join('')}
      ${row('derived secondary', '', rsSec, m)}
      ${row(`${c.signal} (canonical)`, '', rsCanon, m)}
    </div>`).join('')
  cards.push(`<section class="card"><h2>§1 <code>${c.hex}</code> ${c.name} — mute corridor solve</h2><div class="panes">${panes}</div></section>`)
}

// §2 yellow vividness strip
{
  const y = roleSet(signalScalesFor(undefined).get('yellow')!.scale)
  const rows = STRIP_CS.map((C, i) => {
    const hex = seedHex(0.60, C, 70)
    const t = resolveTheme({ primaryHex: hex, name: 'x' })
    const fired = t.themed.signalOverrides.some(o => o.name === 'yellow') || !!t.primary.warningVariant
    const rs = roleSet(t.primary.scale)
    return `<div class="staterow"><div class="statelabel">${String.fromCharCode(65 + i)} · C ${C}<div class="fired">${fired ? 'FIRES today' : 'keeps yellow'}</div></div><div class="ramps"><div class="rampline">${strip(rs.light)}${btn(rs.cta, rs.onWhite)}</div></div></div>`
  }).join('')
  cards.push(`<section class="card"><h2>§2 yellow vividness boundary (owner letter owed)</h2>
    ${row('yellow signal', '', y, 'light')}${rows}</section>`)
}

// §3 paper diagnostics
{
  const prows = [0, 30, 60, 90, 150, 210, 250, 290, 330].map(H => {
    const t = resolveTheme({ primaryHex: seedHex(0.6, 0.15, H), name: 'x' })
    const st = (n: number) => { const x = t.primary.scale.light.find(y => y.stop === n)!; return `<div class="pchip"><div class="psw" style="background:${toHex(x.r, x.g, x.b)}"></div><div class="pm">s${n} L${x.L.toFixed(3)} C${x.C.toFixed(3)}</div></div>` }
    return `<div class="prow"><span class="ph">H${H}</span>${st(1)}${st(2)}${st(3)}</div>`
  }).join('')
  cards.push(`<section class="card"><h2>§3 paper-1/2 split (owner: p2 wants more chroma)</h2><div class="ppanel">${prows}</div></section>`)
}

const html = `<title>calibration lab</title>
<style>
  body{background:#f4f4f3;color:#1c1c1b;font:14px/1.5 system-ui,sans-serif;margin:0;padding:28px 20px 60px}
  main{max-width:1060px;margin:0 auto;display:flex;flex-direction:column;gap:20px}
  h1{font-size:20px;margin:0}.sub{color:#6d6d69;max-width:72ch}
  .card{background:#fff;border:1px solid #dededa;border-radius:6px;padding:18px 20px}
  .card h2{font-size:15px;margin:0 0 10px}code{font-family:ui-monospace,Menlo,monospace}
  .panes{display:grid;grid-template-columns:1fr 1fr;gap:12px}@media(max-width:860px){.panes{grid-template-columns:1fr}}
  .pane{border-radius:5px;padding:12px 14px}.pane.light{background:#fff;border:1px solid #e4e4e0}.pane.dark{background:#101010;color:#bbb}
  .panetitle{font-size:11px;text-transform:uppercase;letter-spacing:.06em;opacity:.6;margin-bottom:8px}
  .staterow{display:flex;gap:12px;padding:7px 0;align-items:flex-start}.staterow+.staterow{border-top:1px dashed rgba(128,128,128,.3)}
  .statelabel{width:126px;flex:none;font-size:11px;opacity:.8}.fired{font-size:10px;font-family:ui-monospace,Menlo,monospace;opacity:.8;margin-top:2px}
  .ramps{flex:1;min-width:0}.rampline{display:flex;align-items:center;gap:8px}
  .strip{display:flex;flex:1;min-width:0;height:26px;border-radius:3px;overflow:hidden}.sw{flex:1}
  .btn{flex:none;width:38px;height:26px;border-radius:4px;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:600}
  .ppanel{display:flex;flex-direction:column;gap:6px}.prow{display:flex;gap:12px;align-items:center}
  .ph{width:48px;font-size:11px;color:#888}.pchip{display:flex;gap:6px;align-items:center}
  .psw{width:40px;height:40px;border-radius:4px;box-shadow:inset 0 0 0 1px rgba(128,128,128,.25)}.pm{font-size:9px;font-family:ui-monospace,Menlo,monospace;color:#777}
</style>
<main>
  <h1>Calibration lab — post-P3 round material</h1>
  <p class="sub">Real-pipeline output + labeled MOCKS (rebuilt stops at same L/H). ΔE labels: brand↔signal and brand↔derived-secondary wash minimums; the bar is 0.006 on each side. Re-run after the P3 switch — every corridor and ceiling here is gamut-dependent.</p>
  ${cards.join('')}
</main>`
fs.mkdirSync('dist', { recursive: true })
fs.writeFileSync('dist/calibration-lab.html', html)
console.log(`calibration-lab: wrote dist/calibration-lab.html (${html.length} bytes) — §1 mute t=${T_SWEEP.join('/')}, §2 strip ${STRIP_CS.length} seeds, §3 paper 9 hues`)
