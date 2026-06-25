// Dark-mode chroma-reduction options for review — rendered DIRECTLY from the
// ramps, on a DARK canvas (dark-mode output is unjudgeable on white). Two views,
// both GROUPED BY OPTION (all of A together, all of B together, …) so each
// option's whole-fleet character is scannable:
//   1. Ramps   — every subject's dark ramp under that option.
//   2. Buttons — a real-use row of solid fill buttons (one per colour).
// Plus a light-mode reference group and an aggressive D+ comparison.
import * as fs from 'fs'
import * as path from 'path'
import { generateScale, type GenerateOptions, type GeneratedScale, type ColorStop } from '../src/engine/colorEngine'
import { DARK_CURVES, AGGRESSIVE, type CurveDef } from './darkCurves'

const hx = (s: ColorStop) => {
  const c = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')
  return `#${c(s.r)}${c(s.g)}${c(s.b)}`
}

interface Subject { name: string; short: string; hex: string; opts?: GenerateOptions }
const SUBJECTS: Subject[] = [
  { name: 'red signal (H33)', short: 'red', hex: '#E54D2E', opts: { subtleChromaScale: 1.2 } },
  { name: 'yellow signal (H84)', short: 'yellow', hex: '#FFC53D', opts: { subtleChromaScale: 1.45 } },
  { name: 'green signal (H147)', short: 'green', hex: '#46A758', opts: { subtleChromaScale: 1.3, darkFillMinL: 0.75 } },
  { name: 'info-color signal (H288)', short: 'info', hex: '#6E56CF', opts: { subtleChromaScale: 1.0, darkFillMinL: 0.70 } },
  { name: 'brand cyan (H215)', short: 'cyan', hex: '#00A2C7' },
  { name: 'brand indigo (H266)', short: 'indigo', hex: '#3E63DD' },
  { name: 'brand purple (H310)', short: 'purple', hex: '#8E4EC6' },
  { name: 'brand pink (H358)', short: 'pink', hex: '#E93D82' },
]

const gen = (s: Subject, curve: CurveDef): GeneratedScale =>
  generateScale(s.hex, 'x', undefined, { ...(s.opts ?? {}), darkChromaReduce: curve.fn ?? undefined })
const fillC = (sc: GeneratedScale, mode: 'light' | 'dark') => (mode === 'light' ? sc.light : sc.dark)[8].C

const OPTIONS = ['before', 'A', 'B', 'C', 'D'].map(k => ({ key: k, ...DARK_CURVES[k] }))

// Precompute every subject under every option.
const data = SUBJECTS.map(s => ({
  s,
  light: gen(s, DARK_CURVES.before),
  byOpt: Object.fromEntries(OPTIONS.map(o => [o.key, gen(s, o)])) as Record<string, GeneratedScale>,
}))
const lFillOf = (d: typeof data[number]) => fillC(d.light, 'light')

const swatch = (st: ColorStop) => `<span class="sw" title="C ${st.C.toFixed(3)}" style="background:${hx(st)}"></span>`
const rampRow = (label: string, stops: ColorStop[], meta = '') =>
  `<div class="ramp"><span class="lab">${label}</span><span class="strip">${stops.slice(0, 12).map(swatch).join('')}</span><span class="meta">${meta}</span></div>`
const button = (label: string, fill: ColorStop, white: boolean) =>
  `<span class="btn" style="background:${hx(fill)};color:${white ? '#fff' : '#000'}">${label}</span>`

// ── View 1: ramps grouped by option (+ light reference first) ────────────────
const lightGroup = `<div class="grp"><h3>Light mode <span>the quiet target — reference</span></h3>${
  data.map(d => rampRow(d.s.short, d.light.light, `fill C ${lFillOf(d).toFixed(3)}`)).join('')}</div>`
const rampsByOption = OPTIONS.map(o => `<div class="grp"><h3>${o.label} <span>${o.desc}</span></h3>${
  data.map(d => {
    const sc = d.byOpt[o.key]; const f = fillC(sc, 'dark')
    const meta = o.key === 'before' ? `fill C ${f.toFixed(3)} · ${(f / lFillOf(d)).toFixed(2)}× light`
      : `fill C ${f.toFixed(3)} · ${Math.round((f / fillC(d.byOpt.before, 'dark')) * 100)}% of before`
    return rampRow(d.s.short, sc.dark, meta)
  }).join('')}</div>`).join('')

// ── View 2: buttons grouped by option ────────────────────────────────────────
const lightBtns = `<div class="grp"><h3>Light mode <span>reference</span></h3><div class="btnrow">${
  data.map(d => button(d.s.short, d.light.light[8], d.light.onFillTextIsWhite)).join('')}</div></div>`
const btnsByOption = OPTIONS.map(o => `<div class="grp"><h3>${o.label}</h3><div class="btnrow">${
  data.map(d => button(d.s.short, d.byOpt[o.key].dark[8], d.byOpt[o.key].onFillTextIsWhiteDark)).join('')}</div></div>`).join('')

// ── Aggressive D+ on the blue/violet offenders ───────────────────────────────
const aggr = [data[3], data[5], data[6]].map(d => {
  const dplus = gen(d.s, AGGRESSIVE)
  return `<div class="grp2"><h4>${d.s.name}</h4>
    ${rampRow('before', d.byOpt.before.dark)}${rampRow('D', d.byOpt.D.dark)}${rampRow('D+', dplus.dark)}
    <div class="btnrow">${button('before', d.byOpt.before.dark[8], d.byOpt.before.onFillTextIsWhiteDark)}${button('D', d.byOpt.D.dark[8], d.byOpt.D.onFillTextIsWhiteDark)}${button('D+', dplus.dark[8], dplus.onFillTextIsWhiteDark)}</div>
  </div>`
}).join('')

const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length
const headline = OPTIONS.map(o => `${o.label.split(' · ')[0]}: <b>${mean(data.map(d => fillC(d.byOpt[o.key], 'dark') / lFillOf(d))).toFixed(2)}×</b>`).join(' &nbsp; ')

const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Dark-mode chroma reduction — options</title>
<style>
  :root { color-scheme: dark; }
  body { font-family:-apple-system,system-ui,sans-serif; margin:0; padding:24px; background:#15171a; color:#e6e6e6; }
  h1 { font-size:20px; margin:0 0 8px; } h2 { font-size:15px; margin:30px 0 8px; color:#fff; border-bottom:1px solid #2c2f34; padding-bottom:6px; }
  h3 { font-size:13px; margin:14px 0 6px; color:#fff; } h3 span { color:#888; font-weight:400; font-size:11px; }
  h4 { font-size:12px; margin:10px 0 4px; color:#ddd; }
  .note { font-size:12px; color:#aaa; max-width:840px; line-height:1.55; }
  .head { font-size:12px; background:#1d2024; border:1px solid #2c2f34; border-radius:8px; padding:10px 12px; margin:10px 0; }
  .views { display:grid; grid-template-columns:1fr 1fr; gap:24px; align-items:start; }
  @media (max-width:1100px){ .views { grid-template-columns:1fr; } }
  .grp { margin-bottom:10px; } .grp2 { margin-bottom:12px; }
  .ramp { display:flex; align-items:center; gap:10px; margin:2px 0; }
  .lab { width:52px; font-size:11px; color:#bbb; flex-shrink:0; text-align:right; }
  .strip { display:flex; gap:2px; }
  .sw { width:26px; height:24px; border-radius:3px; border:1px solid rgba(255,255,255,.14); display:inline-block; }
  .meta { font-size:10px; color:#888; font-family:ui-monospace,monospace; white-space:nowrap; }
  .btnrow { display:flex; flex-wrap:wrap; gap:8px; margin:4px 0 2px; }
  .btn { padding:9px 16px; border-radius:8px; font-size:13px; font-weight:600; display:inline-flex; align-items:center; box-shadow:0 1px 2px rgba(0,0,0,.4); }
</style></head><body>
<h1>Dark-mode chroma reduction — options to review</h1>
<p class="note">Grouped by OPTION so each option's whole-fleet character is scannable. Dark canvas
(dark-mode output is unjudgeable on white). Goal: dark fill chroma sits near/below its light sibling.
Loudness is PERCEPTUAL — mean dark/light fill chroma is already ~1.0×, so this compensates for
saturated colour glowing more on dark (worst blue/violet). Hover a swatch for its chroma.</p>
<div class="head"><b>Mean dark fill chroma ÷ light fill chroma</b> &nbsp; ${headline}</div>

<div class="views">
  <div><h2>Ramps — by option</h2>${lightGroup}${rampsByOption}</div>
  <div><h2>Buttons — by option</h2>${lightBtns}${btnsByOption}</div>
</div>

<h2>How far it can go — before / D / D+ (blue-violet offenders)</h2>
${aggr}
</body></html>`

const out = path.join(process.cwd(), 'dist', 'dark-swatches.html')
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, html)
console.log(`wrote ${out}`)
