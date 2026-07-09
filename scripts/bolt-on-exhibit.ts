// bolt-on-exhibit.ts — the per-bolt-on decision view (owner 2026-07-09). Take the NEW dark ramp (A = pure
// fall-out: carry light C+H, re-reference lightness to the dark ground by luminance, ALL adds off), then for
// each old dark bolt-on show A beside the SAME ramp with exactly that ONE bolt-on re-enabled (real engine fn).
// Columns ABUT — no borders, no gaps, no boxes (swatch adjacency is how seams read); labels sit above on the
// page bg; data in labels only (L, hex, Δ). Dark page. Seeds by hex + hue (names aren't real). This pass shows
// only the three under review: 9→10 hover, H-K place, ink register.
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

// carry opts: the light twin injected; PURE = deltaCarry + hover stripped + no bolt-on. `extra` layers ONE.
const carry = (light: ResolvedRamp, extra: Partial<ResolveOpts> = {}): ResolveOpts =>
  ({ ...base, deltaLightStops: light.stops, deltaLightCta: light.roles.cta, deltaCarry: true, ...extra })
// the three bolt-ons under review — each re-enables one real engine mechanism on top of the pure carry.
// (hover / H-K place / ink register were ruled out 2026-07-09.)
const BOLTONS: [string, (light: ResolvedRamp) => ResolveOpts][] = [
  ['+ chroma-eq (perceptualDarkC)', l => carry(l, { deltaChromaEq: true })],
  ['+ lift floor (recede)', l => carry(l, { deltaLiftFloor: true })],
  ['+ darkCtaTrim cta', l => ({ ...base, deltaLightStops: l.stops, deltaCarry: true })],
]

// ---- console: what each bolt-on moves vs the pure fall-out, agnostic hue×chroma sweep (NOT named brands) ----
const seeds: string[] = []
for (let H = 0; H < 360; H += 20) for (const C of [0.06, 0.13, 0.19]) for (const L of [0.5, 0.68]) seeds.push(hx({ L, C, H }))
console.log(`\nper-bolt-on move vs PURE fall-out — agnostic sweep (${seeds.length} seeds):`)
for (const [name, mk] of BOLTONS) {
  let sumDE = 0, nDE = 0, ctaDL = 0
  for (const hex of seeds) {
    const l = resolveRamp(hex, 'light', MODE_SPECS.light, base)
    const pure = resolveRamp(hex, 'dark', MODE_SPECS.dark, carry(l))
    const col = resolveRamp(hex, 'dark', MODE_SPECS.dark, mk(l))
    for (const a of pure.stops.filter(s => s.stop >= 1)) { const b = col.stops.find(s => s.stop === a.stop)!; sumDE += dE(a, b); nDE++ }
    ctaDL += Math.abs(pure.roles.cta.L - col.roles.cta.L)
  }
  console.log(`  ${name.padEnd(34)} mean stop ΔE ${(sumDE / nDE).toFixed(4)}   mean cta ΔL ${(ctaDL / seeds.length).toFixed(4)}`)
}

// ---- HTML exhibit: per seed, abutting columns in order A · B · A · B · A · B (each B's baseline A touches it) ----
const neu = generateNeutralScale(250, 'default')
const W = 156
const SEEDS: [string, string][] = [
  ['#005EB8', 'blue'], ['#67483C', 'warm brown'], ['#EE3123', 'red'], ['#00704A', 'green'],
  ['#FAD037', 'yellow'], ['#8CADD7', 'muted blue'], ['#B8B8B8', 'near-neutral'], ['#623E7C', 'violet'],
]
function ctaCell(r: ResolvedRamp): string {
  const c = r.roles.cta; const lc = ctaLc(c, r.ons.onFillIsWhite)
  return `<div style="height:26px;background:${hx(c)};color:${r.ons.onFillIsWhite ? '#fff' : '#000'};display:flex;justify-content:space-between;align-items:center;padding:0 7px;font-size:9px;font-weight:650;font-family:ui-monospace,monospace"><span>cta</span><span style="opacity:.75">Lc ${lc.toFixed(0)}</span></div>`
}
function stopCell(s: ResolvedStop, moved: number, hover: boolean): string {
  const grp = s.stop <= 2 ? 'pa' : s.stop <= 7 ? 'wa' : s.stop <= 10 ? 'hi' : 'ik'
  const chg = moved >= 0.008 ? `<span style="font-weight:700">Δ${moved.toFixed(2)} </span>` : ''
  return `<div style="height:23px;background:${hx(s)};color:${ink(s.L)};display:flex;justify-content:space-between;align-items:center;gap:6px;padding:0 7px;font-size:8.5px;font-family:ui-monospace,monospace;white-space:nowrap;overflow:hidden">
    <span style="font-weight:700">${s.stop}<span style="opacity:.5;font-weight:400"> ${grp}${hover ? '·hov' : ''}</span></span><span style="opacity:.85">${chg}${f(s.L, 2)}·${hx(s)}</span></div>`
}
// a column: label above (on the page bg), then a gapless strip cta+stops. No border, no box, no radius.
function column(r: ResolvedRamp, tag: 'A' | 'B', title: string, ref?: ResolvedStop[]): string {
  const scale = r.stops.filter(s => s.stop >= 1).sort((a, b) => a.stop - b.stop)
  const rows = scale.map(s => stopCell(s, ref ? dE(s, ref.find(x => x.stop === s.stop)!) : 0, false)).join('')
  const badge = tag === 'A' ? '#6a6a70' : '#3aa0ff'
  const label = `<div style="height:30px;display:flex;align-items:center;gap:5px;font-size:9px;padding:0 2px">
      <span style="background:${badge};color:#000;font-weight:800;border-radius:2px;padding:1px 4px">${tag}</span>
      <span style="opacity:.72;text-transform:uppercase;letter-spacing:.02em;line-height:1.05">${title}</span></div>`
  return `<div style="width:${W}px">${label}<div style="display:flex;flex-direction:column">${ctaCell(r)}${rows}</div></div>`
}
function card([hex, hue]: [string, string]): string {
  const light = resolveRamp(hex, 'light', MODE_SPECS.light, base)
  const pure = resolveRamp(hex, 'dark', MODE_SPECS.dark, carry(light))
  // abutting order: A · B(hover) · A · B(hk) · A · B(ink) — each B touches its own baseline A
  const cols = BOLTONS.map(([name, mk]) =>
    column(pure, 'A', 'pure') + column(resolveRamp(hex, 'dark', MODE_SPECS.dark, mk(light)), 'B', name.replace(/^\+ /, ''), pure.stops)
  ).join('')
  return `<div style="margin:20px 0"><div style="font-size:13px;font-weight:650;margin-bottom:8px">${hue}
    <span style="font-family:ui-monospace,monospace;font-size:11px;background:#ffffff14;padding:2px 7px;border-radius:5px;margin-left:6px">${hex}</span></div>
    <div style="display:flex">${cols}</div></div>`
}
const html = `<!doctype html><meta charset="utf-8"><title>dark — pure fall-out vs hover / H-K / ink</title>
<style>body{margin:0;padding:24px;background:#161618;color:#e8e8ea;font:14px/1.4 -apple-system,system-ui,sans-serif}h1{font-size:16px;font-weight:680;margin:0 0 6px}.k{opacity:.62;font-size:12px;max-width:1000px}</style>
<h1>dark: pure fall-out (A) vs each old bolt-on (B) — chroma-eq · lift floor · cta</h1>
<div class="k" style="margin-bottom:16px">Per seed (hex + hue — names aren't real), read in <b>A·B</b> pairs, columns abutting. <b>A</b> = the new dark ramp straight out of the engine (carry the resolved light's chroma+hue, re-reference lightness to the dark ground by luminance; nothing added) — the SAME ramp before each B, your baseline. <b>B</b> = that ramp with exactly ONE old dark mechanism layered on (real engine fn): <b>chroma-eq</b> replaces the carried chroma with the H-K equalizer (perceptualDarkC — pumps chroma into low-H-K hues); <b>lift floor</b> floors each stop's lightness at the hand-placed scaffold rootL (the "lift, never sink" recede floor — scaffold-anchored); <b>cta</b> replaces the carried cta with the seed-keyed darkCtaTrim value (scale unchanged — only the cta cell differs). Stops B moved off A are labelled Δ (its ΔE from A). Does the bolt-on visibly help — or does A already sit right?</div>
${SEEDS.map(card).join('')}`
import { mkdirSync, writeFileSync } from 'fs'
mkdirSync('render', { recursive: true }); writeFileSync('render/bolt-on-dark.html', html)
console.log('\nwritten → render/bolt-on-dark.html')
