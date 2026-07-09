// wcag-pole-sweep.ts — the PRE-SPLIT decision record (2026-07-04). The owner adopted the true
// wcag/apca split from this page: the wcag profile now carries the ratioFloor pole flip + the
// hover pair re-solve (gated by highlight-audit's per-profile lanes), and APCA became the
// shipped default. Re-running this script today compares the CURRENT wcag profile (already
// floor-flipped) against the raw max-ratio pole — the residual "flips" it reports are the
// 4.5–4.58 sliver where both poles pass, not conformance gaps. Kept for the ledger (section ②).
// ONE question: under the WCAG profile, should on-text polarity be chosen by the RATIO
// metric (strict wcag-pole) instead of the current APCA pole (max-|Lc|, the standing design)?
// The page renders every affected slot through the REAL pipeline (resolveBrand/resolveTheme),
// current vs strict side by side, and counts the flips. WCAG 4.5:1 has NO dead zone (white
// passes at Y ≤ .183, black at Y ≥ .175 — they overlap), so strict-wcag NEVER moves a fill:
// this page is 100% text-polarity flips. Writes render/wcag-pole.html. Light on light, dark on dark.
import { writeFileSync, mkdirSync } from 'fs'
import { resolveBrand, resolveTheme } from '../src/engine/resolve'
import { generateNeutralScale, type GeneratedScale, type ColorStop } from '../src/engine/colorEngine'
import { oklchToLinearRgb, wcagY, contrastRatio, apcaY, apcaLc, findLForContrast, clampChromaToGamut } from '../src/engine/constraints'
import { toHex } from '../src/engine/cssRender'

const enc = (c: number) => { c = Math.max(0, Math.min(1, c)); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055 }
const seedHex = (L: number, C: number, H: number) => '#' + oklchToLinearRgb(L, C, H).map(c => Math.round(enc(c) * 255).toString(16).padStart(2, '0')).join('')
const hex = (s: ColorStop) => toHex(s.r, s.g, s.b)

// the STRICT wcag pole: whichever pole carries the larger contrast RATIO against the fill.
// (The current pole = the engine's shipped boolean: max-|Lc| + the wcag mixing-flip guard.)
const strictWhite = (s: ColorStop) => {
  const Y = wcagY(s.L, s.C, s.H)
  return contrastRatio(1.0, Y) >= contrastRatio(Y, 0)
}
const ratios = (s: ColorStop) => {
  const Y = wcagY(s.L, s.C, s.H)
  const aY = apcaY(s.r, s.g, s.b)
  return {
    rw: contrastRatio(1.0, Y), rb: contrastRatio(Y, 0),
    lw: Math.abs(apcaLc(1.0, aY)), lb: Math.abs(apcaLc(0.0, aY)),
  }
}

type Slot = { slot: string; fill: ColorStop; current: boolean }
type Case = { seed: string; C: number; H: number; mode: 'light' | 'dark'; slots: Slot[] }

const HUES = Array.from({ length: 24 }, (_, i) => i * 15)
const CHROMAS = [0.08, 0.17]

const cases: Case[] = []
for (const C of CHROMAS) for (const H of HUES) {
  const seed = seedHex(0.62, C, H)
  const r = resolveBrand(seed, 'brand')
  const n = generateNeutralScale(r.scale.brandH, 'default')
  const d = resolveTheme({ primaryHex: seed, deriveSecondary: true }).secondary!.scale
  const pick = (s: GeneratedScale, mode: 'light' | 'dark') => ({
    stops: mode === 'light' ? s.light : s.dark,
    cta: mode === 'light' ? s.cta : s.ctaDark,
    onHl: mode === 'light' ? s.onHighlightIsWhite : s.onHighlightIsWhiteDark,
    onCta: mode === 'light' ? s.onFillTextIsWhite : s.onFillTextIsWhiteDark,
  })
  for (const mode of ['light', 'dark'] as const) {
    const b = pick(r.scale, mode), nn = pick(n, mode), dd = pick(d, mode)
    cases.push({
      seed, C, H, mode,
      slots: [
        { slot: 'highlight-9', fill: b.stops.find(s => s.stop === 9)!, current: b.onHl! },
        { slot: 'cta', fill: b.cta, current: b.onCta! },
        { slot: 'neutral cta (quiet)', fill: nn.cta, current: nn.onCta! },
        { slot: 'derived-secondary cta', fill: dd.cta, current: dd.onCta! },
      ],
    })
  }
}

// ── counts ──
const SLOTS = ['highlight-9', 'cta', 'neutral cta (quiet)', 'derived-secondary cta']
const counts: Record<string, { light: [number, number]; dark: [number, number] }> = {}
for (const s of SLOTS) counts[s] = { light: [0, 0], dark: [0, 0] }
for (const c of cases) for (const s of c.slots) {
  const flip = strictWhite(s.fill) !== s.current
  counts[s.slot][c.mode][1]++
  if (flip) counts[s.slot][c.mode][0]++
}

// ── render ──
const aa = (fill: ColorStop, white: boolean, w = 74) =>
  `<div style="width:${w}px;height:40px;border-radius:8px;background:${hex(fill)};color:${white ? '#fff' : '#000'};display:flex;align-items:center;justify-content:center;font-weight:600;font-size:14px">Aa</div>`

const cell = (s: Slot) => {
  const strict = strictWhite(s.fill)
  const flip = strict !== s.current
  const r = ratios(s.fill)
  const note = flip
    ? `<div style="font-size:9.5px;opacity:.75;line-height:1.35;margin-top:3px">w ${r.rw.toFixed(2)}:1 · Lc ${r.lw.toFixed(0)}<br>b ${r.rb.toFixed(2)}:1 · Lc ${r.lb.toFixed(0)}</div>`
    : ''
  return `<div style="display:flex;flex-direction:column;align-items:center;padding:5px 6px;border-radius:10px;${flip ? 'outline:2px solid #e5484d;outline-offset:-2px;' : 'opacity:.5;'}">
    <div style="display:flex;gap:3px">${aa(s.fill, s.current)}${aa(s.fill, strict)}</div>${note}</div>`
}

const section = (mode: 'light' | 'dark') => {
  const fg = mode === 'light' ? '#1a1a1a' : '#eee'
  const bg = mode === 'light' ? '#fff' : '#111'
  const sub = mode === 'light' ? '#666' : '#999'
  const rows = cases.filter(c => c.mode === mode).map(c => `
    <div style="display:flex;align-items:center;gap:8px;margin:3px 0">
      <div style="width:110px;font-size:11px;color:${sub};font-family:ui-monospace,monospace">H${c.H} C${c.C}</div>
      ${c.slots.map(cell).join('')}
    </div>`).join('')
  const head = `<div style="display:flex;gap:8px;margin:14px 0 6px 118px;font-size:11px;color:${sub}">
    ${SLOTS.map(s => `<div style="width:168px;text-align:center">${s}<br><b style="color:${fg}">${counts[s][mode][0]}/${counts[s][mode][1]} flip</b></div>`).join('')}</div>`
  return `<div style="background:${bg};color:${fg};padding:26px 30px;border-radius:16px;margin:20px 0">
    <h2 style="margin:0 0 4px;font-size:17px">${mode.toUpperCase()} — current pole (left) vs strict wcag-pole (right)</h2>
    <div style="font-size:12px;color:${sub}">Red outline = a FLIP (the two metrics disagree; both chips show the same fill). Dimmed = agreement. Flipped cells annotate both poles' ratio + Lc.</div>
    ${head}${rows}</div>`
}

const total = SLOTS.reduce((a, s) => a + counts[s].light[0] + counts[s].dark[0], 0)
const grand = SLOTS.reduce((a, s) => a + counts[s].light[1] + counts[s].dark[1], 0)

// ── ② THE SHIFT LEDGER — the owner's alternative: keep white text, MOVE the highlights.
// For every hue: solve how far hl-9/10 must DROP for white to hit 4.5:1, then show what that
// does to the ladder around them (hl-8 · hl-9 · hl-10 · ink-11). A "break" = the shifted stop
// crosses its neighbor: light mode descends in L (break when shifted-9 lands at/below ink-11);
// dark mode ascends (break when shifted-9 lands at/below hl-8 — the band inverts).
type Shift = {
  H: number; C: number; mode: 'light' | 'dark'
  s8: ColorStop; s9: ColorStop; ink11: ColorStop
  req9: number; d9: number; breaks: boolean
}
const shifts: Shift[] = []
for (const c of cases) {
  // one scale per case is enough — the brand scale (highlights live there)
  const r = resolveBrand(c.seed, 'brand')
  const stops = c.mode === 'light' ? r.scale.light : r.scale.dark
  const s8 = stops.find(s => s.stop === 8)!, s9 = stops.find(s => s.stop === 9)!
  const ink11 = stops.find(s => s.stop === 11)!
  const req9 = findLForContrast(s9.L, s9.C, s9.H, 1.0, 4.5)
  const breaks = c.mode === 'light' ? req9 <= ink11.L + 0.02 : req9 <= s8.L + 0.02
  shifts.push({ H: c.H, C: c.C, mode: c.mode, s8, s9, ink11, req9, d9: req9 - s9.L, breaks })
}
const shiftHex = (L: number, C: number, H: number) => seedHex(L, clampChromaToGamut(L, C, H), H)
const stat = (mode: 'light' | 'dark') => {
  const list = shifts.filter(s => s.mode === mode)
  const ds = list.map(s => -s.d9).sort((a, b) => a - b)
  return {
    median: ds[Math.floor(ds.length / 2)],
    max: ds[ds.length - 1],
    breaks: list.filter(s => s.breaks).length,
    n: list.length,
  }
}
const chipL = (bg: string, white: boolean, label: string, w = 60) =>
  `<div style="width:${w}px;height:34px;border-radius:7px;background:${bg};color:${white ? '#fff' : '#000'};display:flex;align-items:center;justify-content:center;font-size:10.5px;font-weight:600">${label}</div>`
const ladder = (s: Shift, shifted: boolean) => {
  const nine = shifted ? s.req9 : s.s9.L
  return `<div style="display:flex;gap:2px">
    ${chipL(shiftHex(s.s8.L, s.s8.C, s.s8.H), false, '8')}
    ${chipL(shiftHex(nine, s.s9.C, s.s9.H), true, shifted ? 'Aa 9*' : 'Aa 9')}
    ${chipL(shiftHex(s.ink11.L, s.ink11.C, s.ink11.H), true, '11')}
  </div>`
}
const shiftSection = (mode: 'light' | 'dark') => {
  const fg = mode === 'light' ? '#1a1a1a' : '#eee'
  const bg = mode === 'light' ? '#fff' : '#111'
  const sub = mode === 'light' ? '#666' : '#999'
  const st = stat(mode)
  const rows = shifts.filter(s => s.mode === mode && s.C === 0.17).map(s => `
    <div style="display:flex;align-items:center;gap:14px;margin:4px 0;${s.breaks ? 'outline:2px solid #e5484d;outline-offset:3px;border-radius:8px;' : ''}">
      <div style="width:64px;font-size:11px;color:${sub};font-family:ui-monospace,monospace">H${s.H}</div>
      ${ladder(s, false)}
      <div style="font-size:11px;color:${sub};width:110px;text-align:center">→ ΔL ${s.d9.toFixed(3)}${s.breaks ? ' · <b style="color:#e5484d">BAND BREAK</b>' : ''}</div>
      ${ladder(s, true)}
    </div>`).join('')
  return `<div style="background:${bg};color:${fg};padding:26px 30px;border-radius:16px;margin:20px 0">
    <h2 style="margin:0 0 4px;font-size:17px">${mode.toUpperCase()} — the shift ledger (C .17): keep white, move the fill</h2>
    <div style="font-size:12px;color:${sub};max-width:78ch;line-height:1.5">Left ladder = shipped 8·9·10·11. Right = 9/10 re-solved so WHITE passes 4.5:1 (starred).
    <b>median drop ${st.median.toFixed(3)} L · worst ${st.max.toFixed(3)} L · ${st.breaks}/${st.n} band breaks</b> (shifted 9 crosses ${mode === 'light' ? 'ink-11' : 'highlight-8'} — the ladder inverts).</div>
    <div style="margin-top:10px">${rows}</div></div>`
}

const html = `<!doctype html><meta charset="utf-8"><title>strict wcag-pole — the flip sweep</title>
<body style="font-family:Inter,system-ui,sans-serif;background:#f4f4f5;margin:0;padding:28px;max-width:1080px">
<h1 style="font-size:20px;margin:0 0 6px">Strict WCAG polarity — what actually flips</h1>
<p style="font-size:13px;color:#555;line-height:1.5;max-width:70ch">ONE question: under the <b>WCAG profile</b>, should on-text polarity follow the RATIO metric
(strict) instead of the current APCA pole? Every case below went through the real pipeline
(resolveBrand / resolveTheme; agnostic 24-hue × C .08/.17 sweep). WCAG 4.5:1 has no dead zone,
so nothing ever needs to move a fill — adopting strict wcag-pole is <b>purely these text flips</b>.
<b>${total} flips / ${grand} judgments.</b> Left chip = shipped today · right chip = strict.</p>
${section('light')}
${section('dark')}
<h1 style="font-size:20px;margin:30px 0 6px">② Or: keep white text and SHIFT the highlights?</h1>
<p style="font-size:13px;color:#555;line-height:1.5;max-width:70ch">The alternative to flipping text: re-solve hl-9/10 darker until white passes 4.5:1.
The ledger shows the required drop per hue and flags where the band inverts against its neighbors.</p>
${shiftSection('light')}
${shiftSection('dark')}
</body>`

mkdirSync('render', { recursive: true })
writeFileSync('render/wcag-pole.html', html)
console.log(`wrote render/wcag-pole.html — ${total}/${grand} flips`)
for (const s of SLOTS) console.log(`  ${s.padEnd(24)} light ${counts[s].light[0]}/${counts[s].light[1]} · dark ${counts[s].dark[0]}/${counts[s].dark[1]}`)
for (const m of ['light', 'dark'] as const) {
  const st = stat(m)
  console.log(`shift ${m}: median ΔL -${st.median.toFixed(3)} · worst -${st.max.toFixed(3)} · band breaks ${st.breaks}/${st.n}`)
}
