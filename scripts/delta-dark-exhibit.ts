// delta-dark-exhibit.ts — the dark round decision view. Per seed: dark TODAY (seed-keyed scaffold) vs dark
// DELTA (live function of the resolved light — carry chroma+hue, re-reference lightness to the dark ground;
// 9→10 hover enforced). On a dark page (dark UIs sit on dark). Seeds labelled by HEX + plain hue word (the
// brand names aren't real). Console: seam collapse / 9→10 hover / cta legibility across an agnostic sweep.
import { writeFileSync, mkdirSync } from 'fs'
import { resolveRamp, type ResolvedRamp, type ResolvedStop, type ResolveOpts } from '../src/reqtoken/resolve'
import { MODE_SPECS } from '../src/reqtoken/spec'
import { generateNeutralScale } from '../src/engine/colorEngine'
import { clampChromaToGamut, apcaY, apcaLc, encodedChannels } from '../src/engine/constraints'
import { srgbEmitChannels } from '../src/engine/colorMath'
import { darkChromaCurve } from '../src/engine/darkChromaCurve'
import { DARK_BRAND_FILL_MIN_L } from '../src/engine/stopTable'

const f = (n: number, d = 3) => n.toFixed(d)
const rad = (h: number) => (h * Math.PI) / 180
const base: ResolveOpts = { highlight: true, enforceOnFillContrast: true, coolRedDark: true, darkChromaCurve, darkFillMinL: DARK_BRAND_FILL_MIN_L }
const hx = (s: { L: number; C: number; H: number }) => '#' + (Object.values(srgbEmitChannels(s)) as number[]).map(c => Math.round(Math.max(0, Math.min(1, c)) * 255).toString(16).padStart(2, '0')).join('')
const cE = (s: any) => clampChromaToGamut(s.L, s.C, s.H)
const dE = (a: ResolvedStop, b: ResolvedStop) => { const ca = cE(a), cb = cE(b); return Math.sqrt((a.L - b.L) ** 2 + (ca * Math.cos(rad(a.H)) - cb * Math.cos(rad(b.H))) ** 2 + (ca * Math.sin(rad(a.H)) - cb * Math.sin(rad(b.H))) ** 2) }
const ink = (L: number) => (L < 0.5 ? '#e8e8e8' : '#111')
const blackApcaY = apcaY(...encodedChannels(0, 0, 0))
const ctaLc = (c: any, white: boolean) => Math.abs(apcaLc(white ? 1.0 : blackApcaY, apcaY(...encodedChannels(c.L, cE(c), c.H))))

const today = (hex: string) => resolveRamp(hex, 'dark', MODE_SPECS.dark, base)
const delta = (hex: string) => { const l = resolveRamp(hex, 'light', MODE_SPECS.light, base); return resolveRamp(hex, 'dark', MODE_SPECS.dark, { ...base, deltaLightStops: l.stops, deltaLightCta: l.roles.cta, deltaCarry: true }) }

// ---- console summary across an agnostic hue×chroma sweep (NOT named brands) ----
const seeds: string[] = []
for (let H = 0; H < 360; H += 20) for (const C of [0.06, 0.13, 0.19]) for (const L of [0.5, 0.68]) seeds.push(hx({ L, C, H }))
let seamCollapse = 0, hoverTight = 0, ctaDead = 0, unresolvable = 0, worstHover = 9, worstCtaLc = 99
for (const hex of seeds) {
  const r = delta(hex); const st = (n: number) => r.stops.find(s => s.stop === n)!
  const scale = r.stops.filter(s => s.stop >= 1).sort((a, b) => a.stop - b.stop)
  for (let i = 1; i < scale.length; i++) if (scale[i].stop <= 8 && dE(scale[i], scale[i - 1]) < 0.012) seamCollapse++
  for (const s of scale) if ((s as any).unresolvable) unresolvable++
  const hov = st(10).L - st(9).L; worstHover = Math.min(worstHover, hov); if (hov < 0.035) hoverTight++
  const lc = ctaLc(r.roles.cta, r.ons.onFillIsWhite); worstCtaLc = Math.min(worstCtaLc, lc); if (lc < 60) ctaDead++
}
console.log(`\nDELTA dark — agnostic sweep (${seeds.length} seeds):`)
console.log(`  unresolvable requires : ${unresolvable}`)
console.log(`  seam collapse (1–8)   : ${seamCollapse}   (adjacent ΔE < 0.012)`)
console.log(`  9→10 hover tight      : ${hoverTight}   worst ΔL ${f(worstHover)}   (want ≥ 0.04 after the hover rule)`)
console.log(`  cta dead zones (Lc<60): ${ctaDead}   worst Lc ${worstCtaLc.toFixed(1)}`)

// ---- HTML exhibit: representative agnostic seeds, dark today vs dark delta, on a dark page ----
const neu = generateNeutralScale(250, 'default')
const cardD = hx(neu.dark[0]), textD = hx(neu.dark[11])
const SEEDS: [string, string][] = [
  ['#005EB8', 'blue'], ['#67483C', 'warm brown'], ['#EE3123', 'red'], ['#00704A', 'green'],
  ['#FAD037', 'yellow'], ['#8CADD7', 'muted blue'], ['#B8B8B8', 'near-neutral'], ['#623E7C', 'violet'],
]
function stopRow(s: ResolvedStop, collapsed: boolean, hover: boolean): string {
  const grp = s.stop <= 2 ? 'paper' : s.stop <= 7 ? 'wash' : s.stop <= 10 ? 'highlight' : 'ink'
  const flag = hover ? ' · hover' : collapsed ? ' · ≈' : ''
  return `<div style="height:24px;background:${hx(s)};color:${ink(s.L)};display:flex;justify-content:space-between;align-items:center;padding:0 7px;font-size:9.5px;font-family:ui-monospace,monospace">
    <span style="font-weight:700">${s.stop}<span style="opacity:.6;font-weight:400"> ${grp}${flag}</span></span><span style="opacity:.85">${f(s.L, 2)} · ${hx(s)}</span></div>`
}
function column(r: ResolvedRamp, title: string): string {
  const scale = r.stops.filter(s => s.stop >= 1).sort((a, b) => a.stop - b.stop)
  const c = r.roles.cta; const lc = ctaLc(c, r.ons.onFillIsWhite)
  const cta = `<div style="background:${hx(c)};color:${r.ons.onFillIsWhite ? '#fff' : '#000'};border-radius:7px;padding:7px 11px;font-weight:650;font-size:11.5px;display:flex;justify-content:space-between;margin-bottom:7px"><span>Get started</span><span style="opacity:.75;font-size:9.5px">cta · Lc ${lc.toFixed(0)}</span></div>`
  const rows = scale.map((s, i) => stopRow(s, i > 0 && dE(s, scale[i - 1]) < 0.012, s.stop === 10)).join('')
  return `<div style="flex:1;min-width:210px"><div style="font-size:9.5px;text-transform:uppercase;letter-spacing:.05em;opacity:.55;margin-bottom:5px">${title}</div>
    <div style="background:${cardD};border-radius:9px;padding:10px">${cta}<div style="display:flex;flex-direction:column;gap:2px">${rows}</div></div></div>`
}
function card([hex, hue]: [string, string]): string {
  return `<div style="margin:18px 0"><div style="font-size:12.5px;font-weight:650;margin-bottom:8px">${hue}
    <span style="font-family:ui-monospace,monospace;font-size:11px;background:#ffffff14;padding:2px 7px;border-radius:5px;margin-left:6px">${hex}</span></div>
    <div style="display:flex;gap:12px;flex-wrap:wrap">${column(today(hex), 'dark — today (seed-keyed)')}${column(delta(hex), 'dark — delta (live from light)')}</div></div>`
}
const html = `<!doctype html><meta charset="utf-8"><title>delta dark — today vs live-from-light</title>
<style>body{margin:0;padding:26px;background:#161618;color:#e8e8ea;font:14px/1.4 -apple-system,system-ui,sans-serif}h1{font-size:16px;font-weight:680;margin:0 0 6px}.k{opacity:.6;font-size:12px;max-width:900px}</style>
<h1>dark: today (seed-keyed) vs delta (a live function of the fixed light)</h1>
<div class="k" style="margin-bottom:14px">Each seed (labelled by hex + hue — the names aren't real): left = today's independently-built dark; right = dark derived from the resolved light (carry chroma+hue, re-reference lightness to the dark ground). Read straight down: blues should stop receding, washes read quieter, 9→10 keeps a hover gap. cta shown with its on-text Lc.</div>
${SEEDS.map(card).join('')}`
mkdirSync('render', { recursive: true }); writeFileSync('render/delta-dark.html', html)
console.log('\nwritten → render/delta-dark.html')
