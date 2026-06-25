// Renders the dark-mode chroma-reduction OPTIONS for review (directly from the
// ramps). For each loud subject — the 4 signals (with their subtle boost) plus a
// blue/violet-heavy brand hue spread — shows the LIGHT ramp (the quiet target),
// the DARK ramp BEFORE, then DARK under each candidate curve (A/B/C/D). Plus a
// per-subject fill-chroma metric (light vs dark, and the reduction each option
// applies) and an aggregate "how much louder is dark" headline.
//   npm-style:  esbuild scripts/dark-swatches.ts --bundle --platform=node ... && node ...
import * as fs from 'fs'
import * as path from 'path'
import { generateScale, type GenerateOptions, type GeneratedScale, type ColorStop } from '../src/engine/colorEngine'
import { DARK_CURVES, AGGRESSIVE, type CurveDef } from './darkCurves'

const hx = (s: ColorStop) => {
  const c = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')
  return `#${c(s.r)}${c(s.g)}${c(s.b)}`
}

// Loud subjects. Signals carry their subtle boost (yellow 1.45 is THE loud case)
// and dark fill-min lift; brand hues fill the wheel, weighted to blue/violet.
interface Subject { name: string; hex: string; opts?: GenerateOptions }
const SUBJECTS: Subject[] = [
  { name: 'red signal (H33)', hex: '#E54D2E', opts: { subtleChromaScale: 1.2 } },
  { name: 'yellow signal (H84)', hex: '#FFC53D', opts: { subtleChromaScale: 1.45 } },
  { name: 'green signal (H147)', hex: '#46A758', opts: { subtleChromaScale: 1.3, darkFillMinL: 0.75 } },
  { name: 'info-color signal (H288)', hex: '#6E56CF', opts: { subtleChromaScale: 1.0, darkFillMinL: 0.70 } },
  { name: 'brand cyan (H215)', hex: '#00A2C7' },
  { name: 'brand indigo (H266)', hex: '#3E63DD' },
  { name: 'brand purple (H310)', hex: '#8E4EC6' },
  { name: 'brand pink (H358)', hex: '#E93D82' },
]

const gen = (s: Subject, curve: CurveDef): GeneratedScale =>
  generateScale(s.hex, 'x', undefined, { ...(s.opts ?? {}), darkChromaReduce: curve.fn ?? undefined })

const fillC = (sc: GeneratedScale, mode: 'light' | 'dark') => (mode === 'light' ? sc.light : sc.dark)[8].C

const OPTIONS = ['before', 'A', 'B', 'C', 'D'].map(k => ({ key: k, ...DARK_CURVES[k] }))

const cell = (s: ColorStop) =>
  `<div class="sw" title="C ${s.C.toFixed(3)}"><div class="box" style="background:${hx(s)}"></div></div>`
const ramp = (label: string, stops: ColorStop[], sub = '') =>
  `<div class="ramp"><div class="lab">${label}<span>${sub}</span></div><div class="row">${stops.slice(0, 12).map(cell).join('')}</div></div>`

let body = ''
const agg: Record<string, number[]> = { before: [], A: [], B: [], C: [], D: [] }

for (const s of SUBJECTS) {
  const light = gen(s, DARK_CURVES.before)
  const lFill = fillC(light, 'light')
  let rows = ramp('light', light.light, 'the quiet target')
  let darkRows = ''
  const metrics: string[] = []
  for (const o of OPTIONS) {
    const sc = gen(s, o)
    const dFill = fillC(sc, 'dark')
    agg[o.key].push(dFill / lFill)
    const tag = o.key === 'before' ? `${(dFill / lFill).toFixed(2)}× light` : `${(dFill / fillC(gen(s, DARK_CURVES.before), 'dark') * 100).toFixed(0)}% of before`
    metrics.push(`<b>${o.label.split(' · ')[0]}</b> ${dFill.toFixed(3)} <i>${tag}</i>`)
    darkRows += ramp(o.label, sc.dark, o.desc)
  }
  body += `<div class="subj"><h3>${s.name} <span class="hex">${s.hex}</span></h3>
    ${rows}
    <div class="dark">${darkRows}</div>
    <div class="metric">fill chroma — light <b>${lFill.toFixed(3)}</b> · dark: ${metrics.join(' &nbsp;·&nbsp; ')}</div>
  </div>`
}

// Aggregate headline: mean dark-fill-C / light-fill-C across subjects.
const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length
const headline = OPTIONS.map(o => `${o.label.split(' · ')[0]}: <b>${mean(agg[o.key]).toFixed(2)}×</b>`).join(' &nbsp; ')

// Aggressive variant on the worst offenders (blue/violet) for "how far can it go".
let aggrBody = ''
for (const s of [SUBJECTS[3], SUBJECTS[5], SUBJECTS[6]]) {
  const before = gen(s, DARK_CURVES.before)
  const d = gen(s, DARK_CURVES.D)
  const dplus = gen(s, AGGRESSIVE)
  aggrBody += `<div class="subj"><h4>${s.name}</h4><div class="dark">
    ${ramp('before', before.dark)}${ramp('D (default)', d.dark, DARK_CURVES.D.desc)}${ramp('D+ aggressive', dplus.dark, AGGRESSIVE.desc)}
  </div></div>`
}

const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Dark-mode chroma reduction — options</title>
<style>
  body { font-family:-apple-system,system-ui,sans-serif; margin:24px; color:#1a1a1a; background:#fafafa; }
  h1 { font-size:20px; } h2 { font-size:15px; margin:26px 0 6px; border-bottom:1px solid #ddd; padding-bottom:6px; }
  h3 { font-size:13px; margin:18px 0 6px; } h3 .hex,h4 .hex { color:#999; font-family:ui-monospace,monospace; font-weight:400; }
  h4 { font-size:12px; margin:12px 0 4px; }
  .note { font-size:12px; color:#555; max-width:820px; line-height:1.55; }
  .head { font-size:12px; background:#fff; border:1px solid #e3e3e3; border-radius:8px; padding:10px 12px; margin:8px 0 4px; }
  .subj { margin-bottom:14px; }
  .ramp { display:flex; align-items:center; gap:8px; margin:2px 0; }
  .lab { width:120px; font-size:10px; color:#666; flex-shrink:0; } .lab span { display:block; color:#aaa; font-size:9px; }
  .row { display:flex; gap:2px; } .sw .box { width:30px; height:26px; border-radius:3px; border:1px solid rgba(0,0,0,.1); }
  .dark { background:#141619; border-radius:6px; padding:4px 8px; margin:3px 0; }
  .dark .lab { color:#bbb; } .dark .lab span { color:#777; }
  .metric { font-size:11px; color:#444; margin-top:4px; font-family:ui-monospace,monospace; } .metric i { color:#888; font-style:normal; }
</style></head><body>
<h1>Dark-mode chroma reduction — options to review</h1>
<p class="note">Dark currently reads <b>louder</b> than light. Each option is a hue+chroma+L-aware
multiply on dark stop chroma (lightness untouched, highlight rung &amp; neutral exempt, byte-identical
when off). Numbers 1–12 are the scale; hover a swatch for its chroma. Goal: dark fill chroma should
sit near (or below) its light sibling — the headline below is the mean dark/light fill-chroma ratio
across all subjects (Before &gt; 1 = louder; lower = quieter).</p>
<div class="head"><b>Mean dark fill chroma ÷ light fill chroma</b> &nbsp; ${headline}</div>
<h2>Per subject — light target, then dark: before / A / B / C / D</h2>
${body}
<h2>How far it can go — hybrid D vs an aggressive D+ (blue/violet offenders)</h2>
${aggrBody}
</body></html>`

const out = path.join(process.cwd(), 'dist', 'dark-swatches.html')
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, html)
console.log(`wrote ${out}`)
console.log(`mean dark/light fill chroma: ` + OPTIONS.map(o => `${o.key} ${mean(agg[o.key]).toFixed(2)}`).join('  '))
