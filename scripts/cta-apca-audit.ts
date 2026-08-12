// cta-apca-audit.ts — MEASURE the wcag lane's CTA legibility under APCA across every cta
// surface (owner initiative 2026-08-02: the extended plugin's apca option is retired, so the
// wcag lane is the only lane anyone ships — where does it pass the ratio but fail the eye?).
//
// This instrument MEASURED the pre-C42 state and now verifies the wired law (C42, owner
// 2026-08-02): every cta clears Lc 65 except critical at 50 (the identity carve-out), light
// AND dark. THE SIGNALS ARE ONE GROUP, shown at the TOP — a column per signal (critical |
// warning | success | info), canonical on top, collision alternates stacked underneath.
// Exact mode is OUT (owner ruling: hands-off by design, not part of the law) — and that
// includes EXACT-style secondaries. CUSTOM secondaries (secondaryStyle 'default') are IN:
// their cta is the engine's tint, "the same as the recommended" (owner 2026-08-02).
//
// Surfaces below the grid: brand cta light+dark, custom secondary — all via resolveTheme
// (the real pipeline). Exhibit → dist/cta-apca-audit.html. Sweeps are agnostic hue×L×C
// grids, no named brands. RUNGS keeps the historical 63/65/70 ladder for the non-signal
// sections' cells.
import { writeFileSync, mkdirSync } from 'fs'
import { resolveTheme, SIGNAL_SCALES, SOFT_ON_CTA_ALPHA } from '../src/engine/resolve'
import {
  whiteTextLcAt, blackTextLcAt, findLForWhiteTextLc, findLForBlackTextLc,
} from '../src/engine/requirements/producers'
import { legalRatio, clampChromaToGamut, oklchToLinearRgb, contrastRatio, apcaY, apcaLc } from '../src/engine/constraints'

const BAR = 60                 // the shipped on-cta APCA bar (non-signal surfaces)
const RUNGS = [63, 65, 70]     // owner's candidate buffers over the minimum
const LIGHTEN_CAP = 0.92       // the enforce convention's lighten cap

const CRITICAL_BAR = 50        // the identity carve-out: critical's minimum (C42)
const REST_BARS = [65]         // the blessed bar (C42) — one grid

const gm = (v: number) => { const x = Math.min(1, Math.max(0, v)); return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055 }
const hx = (c: { L: number; C: number; H: number }) => {
  const cc = clampChromaToGamut(c.L, c.C, c.H)
  const [rl, gl, bl] = oklchToLinearRgb(c.L, cc, c.H)
  const ch = (v: number) => Math.round(gm(v) * 255).toString(16).padStart(2, '0')
  return `#${ch(rl)}${ch(gl)}${ch(bl)}`
}

type Fill = { L: number; C: number; H: number }
type Pole = 'white' | 'black'
const lcOf = (f: Fill, pole: Pole) => pole === 'white' ? whiteTextLcAt(f.L, f.C, f.H) : blackTextLcAt(f.L, f.C, f.H)
const ratioOf = (f: Fill, pole: Pole) => legalRatio(f.L, f.C, f.H, pole === 'white' ? 1.0 : 0)

// the pole-preserving move to a bar: null = no landing within the convention's travel
const moveTo = (f: Fill, pole: Pole, bar: number): Fill | null => {
  const L = pole === 'black'
    ? findLForBlackTextLc(f.L, f.C, f.H, bar, LIGHTEN_CAP)
    : findLForWhiteTextLc(f.L, f.C, f.H, bar)
  const m = { ...f, L }
  return lcOf(m, pole) >= bar ? m : null
}

// ── the signal group ─────────────────────────────────────────────────────────────────
// column order + labels are the owner's: critical | warning | success | info
const SIGNAL_COLS = [
  { name: 'red', role: 'critical' },
  { name: 'yellow', role: 'warning' },
  { name: 'green', role: 'success' },
  { name: 'blue', role: 'info' },
] as const

interface SignalEntry { name: string; variant: string; fill: Fill; pole: Pole; paperHex: string }
const signalEntries: SignalEntry[] = []
const seenSignals = new Set<string>()

const pushSignal = (name: string, variant: string, scale: { cta: Fill; onFillTextIsWhite: boolean; light: Fill[] }) => {
  const key = `${name}|${variant}|${hx(scale.cta)}`
  if (seenSignals.has(key)) return
  seenSignals.add(key)
  signalEntries.push({
    name, variant, fill: { L: scale.cta.L, C: scale.cta.C, H: scale.cta.H },
    pole: scale.onFillTextIsWhite ? 'white' : 'black', paperHex: hx(scale.light[0]),
  })
}

// ── the other surfaces ───────────────────────────────────────────────────────────────
type Surface = 'vivid-band' | 'secondary' | 'brand-dark' | 'brand-light'

interface Row {
  surface: Surface
  label: string
  fill: Fill
  paperHex: string
  pole: Pole
  ratio: number
  lc: number
  margin: number      // lc - BAR (negative = under)
  dead: boolean       // wcag passes (>=4.5) but the chosen pole reads under the bar
}

const readCta = (surface: Surface, label: string, cta: Fill, isWhite: boolean, paperHex: string): Row => {
  const fill = { L: cta.L, C: cta.C, H: cta.H }
  const pole: Pole = isWhite ? 'white' : 'black'
  const ratio = ratioOf(fill, pole)
  const lc = lcOf(fill, pole)
  return { surface, label, fill, paperHex, pole, ratio, lc, margin: lc - BAR, dead: ratio >= 4.5 && lc < BAR }
}

// the SOFT on-cta read (default-model secondaries, owner 2026-08-03): the text is the pole
// AT ALPHA, so the audit measures the COMPOSITE exactly as the renderer produces it —
// alpha-blend in encoded sRGB channel space, then wcag Y / apca Y from the blended channels.
const linCh = (c: number) => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
const wcagYCh = (r: number, g: number, b: number) => 0.2126 * linCh(r) + 0.7152 * linCh(g) + 0.0722 * linCh(b)
type FillCh = Fill & { r: number; g: number; b: number }
const readCtaSoft = (surface: Surface, label: string, cta: FillCh, isWhite: boolean, alpha: number, paperHex: string): Row => {
  const fill = { L: cta.L, C: cta.C, H: cta.H }
  const pole: Pole = isWhite ? 'white' : 'black'
  const p = isWhite ? 1 : 0
  const [r, g, b] = [alpha * p + (1 - alpha) * cta.r, alpha * p + (1 - alpha) * cta.g, alpha * p + (1 - alpha) * cta.b]
  const ratio = contrastRatio(wcagYCh(r, g, b), wcagYCh(cta.r, cta.g, cta.b))
  const lc = Math.abs(apcaLc(apcaY(r, g, b), apcaY(cta.r, cta.g, cta.b)))
  return { surface, label: `${label} @${alpha}`, fill, paperHex, pole, ratio, lc, margin: lc - BAR, dead: ratio >= 4.5 && lc < BAR }
}

const rows: Row[] = []

const harvestOverrides = (t: ReturnType<typeof resolveTheme>) => {
  for (const ov of t.signalOverrides) pushSignal(ov.name, ov.note, ov.scale)
}

// 1) agnostic brand sweep, light + dark
for (let H = 0; H < 360; H += 15) for (const L of [0.50, 0.60, 0.70]) for (const C of [0.16, 0.22]) {
  const seed = hx({ L, C, H })
  const t = resolveTheme({ primaryHex: seed })
  const s = t.primary.scale
  rows.push(readCta('brand-light', `brand H${H} L${L} C${C}`, s.cta, s.onFillTextIsWhite, hx(s.light[0])))
  rows.push(readCta('brand-dark', `brand H${H} L${L} C${C} (dark)`, s.ctaDark, s.onFillTextIsWhiteDark, hx(s.dark[0])))
  harvestOverrides(t)
}

// 2) red-complement focus: the neighborhood that fires the variant, both travel directions
for (let H = 15; H <= 45; H += 5) for (const L of [0.35, 0.45, 0.55, 0.65, 0.75]) {
  harvestOverrides(resolveTheme({ primaryHex: hx({ L, C: 0.18, H }) }))
}

// 3) vibrant cyan/green band (exact mode is OUT of this audit — owner ruling 2026-08-02:
// exact is hands-off by design and is not part of the clearance law)
for (let H = 140; H <= 230; H += 15) for (const L of [0.55, 0.65, 0.75]) {
  const seed = hx({ L, C: 0.16, H })
  const rec = resolveTheme({ primaryHex: seed })
  rows.push(readCta('vivid-band', `H${H} L${L} → ${hx(rec.primary.scale.cta)}`, rec.primary.scale.cta,
    rec.primary.scale.onFillTextIsWhite, hx(rec.primary.scale.light[0])))
}

// 4) the canonical signal ctas (the shipping statics)
for (const [name, v] of SIGNAL_SCALES) pushSignal(name, 'canonical', v.scale)

// 5) CUSTOM secondaries (secondaryStyle 'default': the ramp keeps the hex, the cta is the
// engine's tint — "the same as the recommended", owner 2026-08-02, so it is IN the law).
// A bare secondaryHex resolves EXACT — the hands-off posture — which is out of this audit
// like exact mode; an earlier cut measured that by mistake and called it custom.
// Their on-cta is the SOFT pole (C43, owner 2026-08-03): the pole at SOFT_ON_CTA_ALPHA,
// measured as the composite the renderer ships.
for (const sec of [{ L: 0.62, C: 0.16, H: 200 }, { L: 0.62, C: 0.18, H: 150 }, { L: 0.55, C: 0.20, H: 30 }]) {
  const secHex = hx(sec)
  const t = resolveTheme({ primaryHex: hx({ L: 0.45, C: 0.12, H: 260 }), secondaryHex: secHex, secondaryStyle: 'default' })
  if (t.secondary) {
    const s = t.secondary.scale
    rows.push(readCtaSoft('secondary', `secondary ${secHex}`, s.cta, s.onFillTextIsWhite, SOFT_ON_CTA_ALPHA.light, hx(s.light[0])))
    rows.push(readCtaSoft('secondary', `secondary ${secHex} (dark)`, s.ctaDark, s.onFillTextIsWhiteDark, SOFT_ON_CTA_ALPHA.dark, hx(s.dark[0])))
  }
}
// 5b) the DERIVED secondary (no hex supplied) — the same tint register, same soft on-cta
{
  const t = resolveTheme({ primaryHex: hx({ L: 0.45, C: 0.12, H: 260 }), deriveSecondary: true })
  if (t.secondary) {
    const s = t.secondary.scale
    rows.push(readCtaSoft('secondary', `derived secondary`, s.cta, s.onFillTextIsWhite, SOFT_ON_CTA_ALPHA.light, hx(s.light[0])))
    rows.push(readCtaSoft('secondary', `derived secondary (dark)`, s.ctaDark, s.onFillTextIsWhiteDark, SOFT_ON_CTA_ALPHA.dark, hx(s.dark[0])))
  }
}

// ── console: the signal group under each candidate law, then per-surface counts ──────
for (const rest of REST_BARS) {
  const dead = signalEntries.filter(e => {
    const bar = e.name === 'red' ? CRITICAL_BAR : rest
    return ratioOf(e.fill, e.pole) >= 4.5 && lcOf(e.fill, e.pole) < bar
  })
  console.log(`signal group @ ${CRITICAL_BAR}/${rest}: n=${signalEntries.length}  DEAD=${dead.length}  (${dead.map(d => `${d.name}:${d.variant}`).join(', ') || 'none'})`)
}
const surfaces: Surface[] = ['vivid-band', 'secondary', 'brand-dark', 'brand-light']
for (const sf of surfaces) {
  const g = rows.filter(r => r.surface === sf)
  const dead = g.filter(r => r.dead).length
  const m3 = g.filter(r => !r.dead && r.margin < 3).length
  const m5 = g.filter(r => !r.dead && r.margin >= 3 && r.margin < 5).length
  const m10 = g.filter(r => !r.dead && r.margin >= 5 && r.margin < 10).length
  console.log(`${sf.padEnd(12)} n=${String(g.length).padStart(3)}  DEAD=${dead}  margin<3: ${m3}  3–5: ${m5}  5–10: ${m10}`)
}

// ── exhibit ──────────────────────────────────────────────────────────────────────────
const lab = (s: string) => `<div class="lab">${s}</div>`
const btn = (bg: string, fg: string) => `<div class="btn" style="background:${bg};color:${fg}">Button</div>`
const fgOf = (pole: Pole) => pole === 'white' ? '#fff' : '#000'

// a signal cell: ONLY the resulting button — the fill as it WOULD BE at the group bar
const signalCell = (e: SignalEntry, bar: number) => {
  const m = moveTo(e.fill, e.pole, bar) ?? e.fill
  return `<div class="scell">${btn(hx(m), fgOf(e.pole))}</div>`
}

// one grid per candidate law: a column per signal, canonical on top, alternates stacked.
// Variants dedupe by note — the two near-identical corals are one alternate, not two.
const signalGrid = (rest: number) => {
  const cols = SIGNAL_COLS.map(col => {
    const bar = col.name === 'red' ? CRITICAL_BAR : rest
    const seen = new Set<string>()
    const entries = signalEntries.filter(e => e.name === col.name)
      .sort((a, b) => a.variant === 'canonical' ? -1 : b.variant === 'canonical' ? 1 : a.variant.localeCompare(b.variant))
      .filter(e => { if (seen.has(e.variant)) return false; seen.add(e.variant); return true })
    return `<div class="scol"><div class="shead">${col.role} <span class="sbar">Lc ${bar}</span></div>${entries.map(e => signalCell(e, bar)).join('')}</div>`
  }).join('')
  return `<section><h2>critical ${CRITICAL_BAR} / rest ${rest}</h2><div class="sgrid">${cols}</div></section>`
}

const SECTION: Record<Surface, { title: string; sub: string; dark?: boolean; cap: number }> = {
  'vivid-band': { title: 'Vibrant cyan/green brands (light)', sub: 'the band where the pole flips to black — recommended lane', cap: 8 },
  'secondary': { title: 'Custom secondaries', sub: 'secondaryStyle default — the ramp keeps the hex, the cta is the engine’s tint and carries the law (exact-style secondaries are out, like exact mode)', cap: 6 },
  'brand-dark': { title: 'Brand ctas — dark', sub: 'the clearance never existed on the dark side (measurement; any fix is its own ruling)', dark: true, cap: 8 },
  'brand-light': { title: 'Brand ctas — light (agnostic sweep)', sub: 'the C18-covered surface, for reference', cap: 4 },
}

const cellShipped = (r: Row) =>
  `<div class="cell">${lab('shipped')}${btn(hx(r.fill), fgOf(r.pole))}${lab(`${hx(r.fill)} · ${r.ratio.toFixed(2)}:1 · Lc ${r.lc.toFixed(1)}`)}</div>`
const cellRung = (r: Row, rung: number) => {
  const m = moveTo(r.fill, r.pole, rung)
  if (!m) return `<div class="cell">${lab(`→ Lc ${rung}`)}${lab('no landing')}</div>`
  const dL = m.L - r.fill.L
  return `<div class="cell">${lab(`→ Lc ${rung}`)}${btn(hx(m), fgOf(r.pole))}${lab(`${hx(m)} · ${ratioOf(m, r.pole).toFixed(2)}:1 · Lc ${lcOf(m, r.pole).toFixed(1)}`)}${lab(dL === 0 ? 'already clears' : `ΔL ${dL >= 0 ? '+' : ''}${dL.toFixed(3)}`)}</div>`
}

const sectionHtml = (sf: Surface) => {
  const meta = SECTION[sf]
  const g = rows.filter(r => r.surface === sf).sort((a, b) => a.margin - b.margin)
  const shown = g.slice(0, meta.cap)
  const rowsHtml = shown.map(r => `
<div class="row"><div class="rlab"><b>${r.label}</b> · ${r.pole} text · margin ${r.margin >= 0 ? '+' : ''}${r.margin.toFixed(1)} ${r.dead ? `· <span class="dead">DEAD (wcag passes, reads under ${BAR})</span>` : ''}</div>
<div class="strip" style="background:${r.paperHex}">${cellShipped(r)}${RUNGS.map(x => cellRung(r, x)).join('')}</div></div>`).join('')
  const capNote = g.length > shown.length
    ? `<div class="capnote">showing the ${shown.length} worst margins of ${g.length} measured — the console run prints full counts</div>` : ''
  return `<section class="${meta.dark ? 'darksec' : ''}"><h2>${meta.title}</h2><div class="sub">${meta.sub}</div>${rowsHtml}${capNote}</section>`
}

const html = `<!doctype html><meta charset="utf-8"><title>CTA APCA legibility audit — wcag lane</title>
<style>
  body { font: 14px/1.5 -apple-system, sans-serif; margin:0; background:#faf9f7; color:#1a1a1a; }
  .note { padding:.9rem 1rem; background:#f2f0ec; font-size:.86rem; }
  section { padding:.4rem 1rem 1rem; }
  h2 { font-size:1rem; margin:.9rem 0 .1rem; }
  .sub { font-size:.78rem; opacity:.65; margin-bottom:.4rem; }
  .row { padding:.45rem 0 .1rem; }
  .rlab { font-size:.8rem; margin-bottom:.3rem; }
  .dead { color:#b3261e; font-weight:800; }
  .strip { display:flex; gap:1.4rem; padding:.7rem .9rem; border-radius:10px; border:1px solid #e7e4de; overflow-x:auto; }
  .cell { display:flex; flex-direction:column; gap:.15rem; align-items:flex-start; }
  .lab { font-size:.6rem; letter-spacing:.02em; opacity:.62; }
  .btn { min-width:120px; height:40px; border-radius:20px; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:.78rem; padding:0 1rem; }
  .capnote { font-size:.7rem; opacity:.6; margin-top:.35rem; }
  .darksec { background:#131316; color:#e8e6e3; border-radius:0; }
  .darksec .strip { border-color:#2a2a30; }
  .darksec .dead { color:#ff7a70; }
  .sgrid { display:flex; gap:.6rem; align-items:flex-start; }
  .scol { display:flex; flex-direction:column; gap:.6rem; flex:1 1 0; min-width:0; }
  .sgrid .btn { min-width:0; width:100%; padding:0 .4rem; }
  .scell .lab { word-break:break-word; }
  .shead { font-size:.8rem; font-weight:800; }
  .sbar { font-weight:400; opacity:.6; font-size:.7rem; }
  .scell { display:flex; flex-direction:column; gap:.18rem; padding:.6rem .7rem; border-radius:10px; border:1px solid #e7e4de; }
</style>
<div class="note"><b>CTA APCA legibility audit — wcag lane only, measurement only, nothing wired.</b><br>
THE SIGNALS ARE ONE GROUP (owner): judged together first — critical is the identity carve-out
at a minimum of Lc ${CRITICAL_BAR}; the other signals hold the candidate bar, shown at
${REST_BARS.join(' then ')}. Below the grids, the other surfaces at the shipped bar Lc ${BAR}
with the ${RUNGS.join(' / ')} buffer ladder. DEAD = the chosen pole passes wcag 4.5 but reads
under its bar. Rows sorted worst-first within each section.</div>
${REST_BARS.map(signalGrid).join('')}
${surfaces.map(sectionHtml).join('')}
<div style="height:1rem"></div>`

mkdirSync('dist', { recursive: true })
writeFileSync('dist/cta-apca-audit.html', html)
console.log('written -> dist/cta-apca-audit.html')
