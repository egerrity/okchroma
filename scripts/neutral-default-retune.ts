// Exhibit for the 2026-08-11 neutral default-tint retune: Current (the old default,
// now the 'medium' rung) beside New default (0.75x) — the full neutral role set in a
// realistic frame, light + dark, four hues. Values via generateNeutralScale -> stopHex,
// the real pipeline. Output: render/neutral-default-retune.html
import * as fs from 'fs'
import * as path from 'path'
import { generateNeutralScale, type GeneratedScale, type NeutralLevel, type ColorStop } from '../src/engine/colorEngine'
import { stopHex } from '../src/engine/cssRender'
import { SOFT_ON_CTA_ALPHA } from '../src/engine/resolve'

const HUES = [60, 143, 260, 300]
const at = (arr: ColorStop[], stop: number) => stopHex(arr.find(s => s.stop === stop)!)

function panel(s: GeneratedScale, mode: 'light' | 'dark'): string {
  const L = mode === 'light'
  const ramp = L ? s.light : s.dark
  const page = L ? at(ramp, 2) : at(ramp, 1)          // surface/base
  const lift = L ? at(ramp, 1) : at(ramp, 2)          // card
  const sink = L ? at(ramp, 3) : stopHex(s.paper0Dark!) // inset well
  const pop = L ? stopHex(s.paper0!) : at(ramp, 3)    // popped card
  const mark = at(ramp, 8)
  const ink9 = at(ramp, 9), ink10 = at(ramp, 10), ink11 = at(ramp, 11)
  const cta = stopHex(L ? s.cta : s.ctaDark)
  const ctaHov = stopHex(L ? s.ctaHover : s.ctaHoverDark)
  const ctaPrs = stopHex(L ? s.ctaPressed : s.ctaPressedDark)
  const onCta = L ? `rgba(0,0,0,${SOFT_ON_CTA_ALPHA.light})` : `rgba(255,255,255,${SOFT_ON_CTA_ALPHA.dark})`
  const ctaInk = stopHex(L ? s.ctaInk : s.ctaInkDark)
  const washes = [4, 5, 6, 7].map(n => at(ramp, n))
  return `
  <div style="background:${page};border-radius:10px;padding:14px;width:330px">
    <div style="background:${pop};border-radius:8px;padding:12px 14px;margin-bottom:10px">
      <div style="color:${ink11};font-size:14px;font-weight:600;margin-bottom:4px">Quarterly summary</div>
      <div style="color:${ink9};font-size:12px;line-height:1.5">Revenue held steady across all regions while costs fell for the third straight quarter.</div>
      <div style="color:${ink10};font-size:11px;margin-top:4px">Updated 3 hours ago</div>
    </div>
    <div style="background:${lift};border-radius:8px;padding:12px 14px">
      <div style="color:${ink11};font-size:12px;font-weight:600;margin-bottom:8px">Report settings</div>
      <div style="background:${page};border:1px solid ${mark};border-radius:6px;padding:6px 10px;color:${ink10};font-size:12px;margin-bottom:8px">Search reports…</div>
      <div style="background:${sink};border-radius:6px;padding:8px 10px;margin-bottom:10px">
        <div style="color:${ink9};font-size:11px">Archived items live in the sink well.</div>
      </div>
      <div style="display:flex;gap:6px;align-items:center">
        <span style="background:${cta};color:${onCta};border-radius:6px;padding:6px 12px;font-size:12px;font-weight:600">Export</span>
        <span style="background:${ctaHov};border-radius:6px;width:26px;height:26px;display:inline-block"></span>
        <span style="background:${ctaPrs};border-radius:6px;width:26px;height:26px;display:inline-block"></span>
        <span style="color:${ctaInk};font-size:12px;font-weight:600;margin-left:auto">Cancel</span>
      </div>
    </div>
    <div style="display:flex;gap:4px;margin-top:10px">
      ${washes.map(w => `<span style="background:${w};border-radius:4px;height:22px;flex:1"></span>`).join('')}
    </div>
  </div>`
}

function pair(H: number, mode: 'light' | 'dark'): string {
  const cur = generateNeutralScale(H, 'medium')
  const neu = generateNeutralScale(H, 'default')
  const label = mode === 'light' ? '#5b5b60' : '#9a9aa2'
  return `
  <div style="display:flex;gap:18px;align-items:flex-start">
    <div>
      <div style="color:${label};font:11px/1.6 -apple-system,sans-serif;margin:0 0 6px 2px">H${H} · Current</div>
      ${panel(cur, mode)}
    </div>
    <div>
      <div style="color:${label};font:11px/1.6 -apple-system,sans-serif;margin:0 0 6px 2px">H${H} · New default</div>
      ${panel(neu, mode)}
    </div>
  </div>`
}

const html = `<!doctype html><meta charset="utf-8"><title>neutral default retune — current vs 0.75x</title>
<body style="margin:0;font-family:-apple-system,sans-serif">
<div style="background:#f4f4f5;padding:26px;display:flex;flex-wrap:wrap;gap:26px">
  ${HUES.map(h => pair(h, 'light')).join('')}
</div>
<div style="background:#121214;padding:26px;display:flex;flex-wrap:wrap;gap:26px">
  ${HUES.map(h => pair(h, 'dark')).join('')}
</div>
</body>`

const out = path.join(process.cwd(), 'render', 'neutral-default-retune.html')
fs.writeFileSync(out, html)
console.log(`wrote ${out}`)
