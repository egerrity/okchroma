// Generates dist/neutral-swatches.html — a static before/after view of the
// neutral, rendered DIRECTLY from the ramps (not the demo, which confounds via
// signal-shift). BEFORE = the old global neutral (one brand-independent ramp,
// cta flips near-black↔near-white). AFTER = the 2b generated neutral, per brand
// hue, brand-kind (cta = stop 9 near-white in BOTH modes; highlight = the rung).
// The AFTER values reproduce docs/engine-spec/approved-neutrals-reference.md.
import * as fs from 'fs'
import * as path from 'path'
import { generateNeutralScale, type NeutralLevel, type GeneratedScale, type ColorStop } from '../src/engine/colorEngine'

const hx = (s: ColorStop) => {
  const c = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')
  return `#${c(s.r)}${c(s.g)}${c(s.b)}`.toUpperCase()
}

// OLD global neutral (captured from the pre-2b commit 6cf7939, brand-independent).
const BEFORE = {
  light: { scale: ['#FDFDFD', '#F9F9F9', '#F2F2F2', '#EAEAEA', '#DFDFDF', '#D1D1D1', '#BFBFBF', '#AAAAAA', '#777777', '#6A6A6A', '#737373', '#2E2E2E'], cta: '#060606', highlight: '#777777' },
  dark: { scale: ['#121212', '#181818', '#202020', '#292929', '#313131', '#3C3C3C', '#4A4A4A', '#5D5D5D', '#898989', '#7D7D7D', '#AEAEAE', '#EBEBEB'], cta: '#E6E6E6', highlight: '#898989' },
}

const HUES: Array<[number, string]> = [
  [30, 'red→mauve'], [90, 'amber→sand'], [143, 'lime→olive'],
  [210, 'teal→slate'], [270, 'blue→slate'], [320, 'pink→mauve'],
]
const LEVELS: NeutralLevel[] = ['pure', 'default', 'branded']

const chip = (hex: string, label: string, big = false) =>
  `<div class="sw"><div class="box${big ? ' big' : ''}" style="background:${hex}"></div><div class="cap">${label}</div><div class="hex">${hex}</div></div>`

const ramp = (modeLabel: string, scale: string[], cta: string, highlight: string) => `
  <div class="ramp">
    <div class="mode">${modeLabel}</div>
    <div class="row">
      ${scale.map((h, i) => chip(h, String(i + 1))).join('')}
      <div class="gap"></div>
      ${chip(cta, 'cta', true)}
      ${chip(highlight, 'highlight', true)}
    </div>
  </div>`

const block = (title: string, sub: string, light: { scale: string[]; cta: string; highlight: string }, dark: typeof light) => `
  <div class="block">
    <h3>${title} <span class="sub">${sub}</span></h3>
    ${ramp('light', light.scale, light.cta, light.highlight)}
    <div class="darkwrap">${ramp('dark', dark.scale, dark.cta, dark.highlight)}</div>
  </div>`

const side = (s: GeneratedScale, mode: 'light' | 'dark') => {
  const stops = mode === 'light' ? s.light : s.dark
  return { scale: stops.slice(0, 12).map(hx), cta: hx(stops[8]), highlight: hx(stops[12]) }
}

let body = ''
body += `<h2>Before — old global neutral</h2><p class="note">One ramp, shared by every brand (untinted). The cta <b>flips</b>: near-black ${BEFORE.light.cta} in light, near-white ${BEFORE.dark.cta} in dark. Highlight = stop 9 (mid gray).</p>`
body += block('global neutral', 'brand-independent', BEFORE.light, BEFORE.dark)

body += `<h2>After — generated neutral (per brand hue, brand-kind)</h2><p class="note">Routed through generateScale + neutralChromaCurve. cta = stop 9, a subtle near-white button that does <b>not</b> flip (near-white in both modes — owner-accepted). highlight = the rung (holds white). Reproduces the owner-approved reference exactly.</p>`
for (const level of LEVELS) {
  body += `<h3 class="lvl">${level}</h3>`
  for (const [hue, name] of HUES) {
    const s = generateNeutralScale(hue, level)
    body += block(`h${hue}`, name, side(s, 'light'), side(s, 'dark'))
  }
}

const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Neutral — before/after</title>
<style>
  body { font-family: -apple-system, system-ui, sans-serif; margin: 24px; color: #1a1a1a; background: #fff; }
  h1 { font-size: 20px; } h2 { font-size: 16px; margin: 28px 0 4px; border-bottom: 1px solid #ddd; padding-bottom: 6px; }
  h3 { font-size: 13px; margin: 14px 0 6px; font-weight: 600; } h3 .sub { color: #888; font-weight: 400; font-size: 11px; }
  h3.lvl { font-size: 14px; text-transform: uppercase; letter-spacing: .04em; color: #555; margin-top: 20px; }
  .note { font-size: 12px; color: #555; max-width: 760px; line-height: 1.5; margin: 4px 0 8px; }
  .block { margin-bottom: 10px; }
  .ramp { display: flex; align-items: center; gap: 10px; margin: 3px 0; }
  .mode { width: 40px; font-size: 11px; color: #888; flex-shrink: 0; }
  .row { display: flex; align-items: flex-end; gap: 3px; flex-wrap: nowrap; }
  .sw { display: flex; flex-direction: column; align-items: center; width: 40px; }
  .box { width: 34px; height: 34px; border-radius: 4px; border: 1px solid rgba(0,0,0,.12); }
  .box.big { width: 40px; height: 40px; border-width: 2px; }
  .cap { font-size: 9px; color: #666; margin-top: 2px; } .hex { font-size: 8px; color: #aaa; font-family: ui-monospace, monospace; }
  .gap { width: 12px; }
  .darkwrap { background: #15171a; border-radius: 6px; padding: 4px 8px; display: inline-block; }
  .darkwrap .mode, .darkwrap .cap { color: #aaa; } .darkwrap .hex { color: #777; }
</style></head><body>
<h1>OKChroma neutral — before / after (2b)</h1>
<p class="note">Generated directly from the ramps via <code>scripts/neutral-swatches.ts</code>. Numbers 1–12 are the scale; cta + highlight are the pulled-out role fills.</p>
${body}
</body></html>`

const out = path.join(process.cwd(), 'dist', 'neutral-swatches.html')
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, html)
console.log(`wrote ${out} (${HUES.length} hues × ${LEVELS.length} levels + before)`)
