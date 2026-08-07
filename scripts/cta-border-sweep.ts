// cta-border-sweep.ts — STAGE A of the cta-border hierarchy round (owner 2026-07-31).
// MEASUREMENT ONLY. Nothing here is wired; the engine is untouched.
//
// Owner's edge-case review of C39 surfaced TWO separate problems, neither caused by the stroke:
//   1. hierarchy is not accounted for in edge cases — a custom secondary can come out reading as
//      heavy as, or heavier than, the primary. That is the FILL, not the border.
//   2. more ctas need the stroke than are getting it — today's gate catches too little.
// Plus one addition: a rank-ordered ladder of offsets, so the stroke can carry hierarchy instead
// of sitting flat at one value (her hand edit: neutral 08 · secondary 12 · primary 24).
//
// HER RULINGS THAT SET THE INSTRUMENT:
//   · "This is NOT an accessibility measure, it is a taste measure. The buttons don't have a
//     requirement to pass 3:1." APCA is authorized HERE, as a taste instrument, because its
//     perceptual rules are better. Bars quoted from her: Lc 15 (below which APCA says treat as
//     invisible for non-text) and Lc 30.
//   · Reference plane = THE PAGE: neutral paper-97 in light, neutral paper-99 in dark.
//   · Scope = all cta families INCLUDING signals; nothing beyond the existing cta/border token.
//   · Custom secondary "should always be lighter, but we don't have to move it a lot."
//
// THE 1.5px CAVEAT, flagged rather than assumed: the Lc 15 / 30 levels she quoted apply to
// non-text elements "no less than 5px in its smallest dimension". The stroke is 1.5px. APCA wants
// MORE contrast for thin lines, so 15 measured on this stroke is likely too lenient — hence the
// third bar. 45 is NOT an APCA level; it is headroom on the ladder for her to read against.
//
// Lane: wcag, matching build.ts SHIPPED_PROFILE, so the counts are comparable to shipped dist/.
import { writeFileSync, mkdirSync } from 'fs'
import { resolveTheme, resolveBrand, signalScalesFor, DEFAULT_SECONDARY } from '../src/engine/resolve'
import { generateNeutralScale, type GeneratedScale, type ColorStop } from '../src/engine/colorEngine'
import { maxChromaAt, makeStop } from '../src/engine/colorMath'
import { clampChromaToGamut, oklchToLinearRgb, apcaY, apcaLc } from '../src/engine/constraints'
import { apparentL, solveLForApparent, grayApparentL } from '../src/engine/perceptualL'
import { ctaNeedsBorder } from '../src/engine/cssRender'
import { SIGNALS } from '../src/engine/signals'

const PROFILE = 'wcag' as const
const OUT = `${__dirname}/../render/cta-border-sweep.html`

// ── measurement ───────────────────────────────────────────────────────────────────────────────
// ColorStop.r/g/b are the master basis's own GAMMA-ENCODED components — exactly what apcaY
// wants, and exactly the space a CSS border alpha composites in. Nothing to convert.
const gm = (v: number) => { const x = Math.min(1, Math.max(0, v)); return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055 }
const enc = (c: { L: number; C: number; H: number }): [number, number, number] => {
  const [rl, gl, bl] = oklchToLinearRgb(c.L, clampChromaToGamut(c.L, c.C, c.H), c.H)
  return [gm(rl), gm(gl), gm(bl)]
}
const hx = (c: { L: number; C: number; H: number }) => {
  const [r, g, b] = enc(c)
  const ch = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0')
  return `#${ch(r)}${ch(g)}${ch(b)}`
}
const Yof = (c: { L: number; C: number; H: number }) => { const [r, g, b] = enc(c); return apcaY(r, g, b) }
// |Lc| — apcaLc is signed and order-SENSITIVE (it branches on which side is lighter with
// different exponents). Every caller in the engine wraps it in abs; discernibility is a
// magnitude question, so this does too.
const lc = (a: { L: number; C: number; H: number }, b: { L: number; C: number; H: number }) => Math.abs(apcaLc(Yof(a), Yof(b)))

// the stroke: `border: 1.5px solid rgba(0,0,0,α)` over the fill. background-clip is border-box by
// default, so the fill sits UNDER the border and the alpha composites over it — this is the real
// render, not a model of it. Light strokes toward black, dark toward white (offset-12's own flip).
const strokeOver = (fill: { L: number; C: number; H: number }, mode: 'light' | 'dark', alpha: number): [number, number, number] => {
  const [r, g, b] = enc(fill)
  const pole = mode === 'light' ? 0 : 1
  return [r + (pole - r) * alpha, g + (pole - g) * alpha, b + (pole - b) * alpha]
}
const strokeLc = (fill: ColorStop, plane: ColorStop, mode: 'light' | 'dark', alpha: number) => {
  const [r, g, b] = strokeOver(fill, mode, alpha)
  return Math.abs(apcaLc(apcaY(r, g, b), Yof(plane)))
}
// smallest α whose stroke clears the bar against the plane. Monotone in α (the stroke walks
// away from the plane as α rises, in both modes), so a plain bisect is exact enough.
const solveAlpha = (fill: ColorStop, plane: ColorStop, mode: 'light' | 'dark', bar: number) => {
  if (strokeLc(fill, plane, mode, 1) < bar) return null   // unreachable even at the pure pole
  let lo = 0, hi = 1
  for (let i = 0; i < 24; i++) { const mid = (lo + hi) / 2; strokeLc(fill, plane, mode, mid) >= bar ? (hi = mid) : (lo = mid) }
  return hi
}

// ── the ladder ────────────────────────────────────────────────────────────────────────────────
// extends the shadow-04/08/12 convention offset-12 was deliberately named into, and contains
// her hand-edited 08 / 12 / 24. Each rung is ONE brand-independent base row — zero per-brand
// overrides, which is the whole reason C39 chose an alpha over a family-relative stop.
const LADDER = [4, 8, 12, 16, 24, 32]
const OVER = 'over' as const          // fires, but needs MORE than the ladder's top rung
type Rung = number | typeof OVER
const snapUp = (alpha: number | null): Rung => {
  if (alpha === null) return OVER                 // unreachable even at the pure pole
  return LADDER.find(r => r >= alpha * 100) ?? OVER
}
// rung label. A family that is NOT firing has no entry at all and renders "—"; a family that
// fires but outruns the ladder renders "> 32" — these mean OPPOSITE things and must never
// collapse into the same glyph.
const rungLabel = (r: Rung | undefined) =>
  r === undefined ? '—' : r === OVER ? '&gt; 32' : `offset-${String(r).padStart(2, '0')}`
const rungAlpha = (r: Rung | undefined) => r === undefined ? null : r === OVER ? 40 : r
const RANK = { neutral: 0, secondary: 1, primary: 2 } as const

// ── the seed field: AGNOSTIC, not named brands ────────────────────────────────────────────────
// the gate keys on where the cta sits, so L is swept as the primary axis; hue and chroma share
// ride along. 12 hues × 5 lightnesses × 2 chroma shares = 120 themes.
const HUES = Array.from({ length: 12 }, (_, i) => i * 30)
const LS = [0.55, 0.70, 0.80, 0.88, 0.94]
const CSHARE = [0.5, 1.0]
const seedHex = (L: number, H: number, share: number) => hx({ L, C: share * maxChromaAt(L, H), H })

type FamRow = { fam: string; rank: number | null; cta: ColorStop; plane: ColorStop; today: boolean }
// every cta family of one theme, both modes, with the page it sits on.
// secondaryHex null → the DERIVED posture ("From primary"); a hex → CUSTOM (style 'default',
// the hex through the lift model). Both are swept: her ask #1 is about custom, but derived
// shares the same transform and has no separation check at all today.
function familiesOf(primaryHex: string, secondaryHex: string | null) {
  const t = resolveTheme({
    primaryHex, contrastProfile: PROFILE,
    ...(secondaryHex ? { secondaryHex, secondaryStyle: 'default' as const } : { deriveSecondary: true }),
  })
  const nScale = generateNeutralScale(t.primary.scale.brandH, 'default', PROFILE)
  const sigs = signalScalesFor(PROFILE)
  const page = (mode: 'light' | 'dark') => mode === 'light'
    ? nScale.light.find(s => s.stop === 2)!     // the demo's --surface-base in light
    : nScale.dark.find(s => s.stop === 1)!      // ...and in dark. They swap; the page is the ruler.
  const out: Record<'light' | 'dark', FamRow[]> = { light: [], dark: [] }
  for (const mode of ['light', 'dark'] as const) {
    const pl = page(mode)
    const push = (fam: string, rank: number | null, s: GeneratedScale) =>
      out[mode].push({ fam, rank, cta: mode === 'light' ? s.cta : s.ctaDark, plane: pl, today: ctaNeedsBorder(s, mode, pl) })
    push('primary', RANK.primary, t.primary.scale)
    if (t.secondary) push('secondary', RANK.secondary, t.secondary.scale)
    push('neutral', RANK.neutral, nScale)
    for (const sig of SIGNALS) push(sig.emitName, null, sigs.get(sig.name)!.scale)
  }
  return { theme: t, nScale, out }
}

// ══ BLOCK 1 — THE GATE ════════════════════════════════════════════════════════════════════════
const BARS = [15, 30, 45]
type Tally = { fire: Record<number, number>; today: number; n: number; vals: number[] }
const gateTally: Record<string, Tally> = {}
const mk = (): Tally => ({ fire: Object.fromEntries(BARS.map(b => [b, 0])) as Record<number, number>, today: 0, n: 0, vals: [] })
const record = (key: string, r: FamRow) => {
  const t = (gateTally[key] ??= mk())
  const v = lc(r.cta, r.plane)
  t.n++; t.vals.push(v)
  if (r.today) t.today++
  for (const b of BARS) if (v < b) t.fire[b]++
}
for (const H of HUES) for (const L of LS) for (const share of CSHARE) {
  const pHex = seedHex(L, H, share)
  // derived secondary run — carries every other family too
  const der = familiesOf(pHex, null)
  // custom secondary run: the UI prefills the primary's own hex, which is also the worst case
  // for separation, so it is the honest probe for her ask #1.
  const cus = familiesOf(pHex, pHex)
  for (const mode of ['light', 'dark'] as const) {
    for (const r of der.out[mode]) record(r.fam === 'secondary' ? 'secondary (derived)' : r.fam, r)
    const c = cus.out[mode].find(r => r.fam === 'secondary'); if (c) record('secondary (custom)', c)
  }
}
const ORDER = ['primary', 'secondary (derived)', 'secondary (custom)', 'neutral', 'critical', 'warning', 'positive', 'info']
const gateRows = ORDER.filter(f => gateTally[f]).map(fam => {
  const t = gateTally[fam]
  const lo = Math.min(...t.vals), hi = Math.max(...t.vals)
  return `<tr><td class="fam">${fam}</td><td class="n">${t.n}</td>
    <td class="n ${t.today ? 'hit' : ''}">${t.today}</td>
    ${BARS.map(b => `<td class="n ${t.fire[b] ? 'hit' : ''}">${t.fire[b]}</td>`).join('')}
    <td class="n dim">${lo.toFixed(1)} – ${hi.toFixed(1)}</td></tr>`
}).join('')
// the shipped-shape total excludes the custom row (dist ships one secondary per brand, not two)
const SHIPPED = ORDER.filter(f => f !== 'secondary (custom)')
const totToday = SHIPPED.reduce((a, f) => a + (gateTally[f]?.today ?? 0), 0)
const totN = SHIPPED.reduce((a, f) => a + (gateTally[f]?.n ?? 0), 0)
const totBar = (b: number) => SHIPPED.reduce((a, f) => a + (gateTally[f]?.fire[b] ?? 0), 0)

// ══ BLOCK 2 — SOLVED α ════════════════════════════════════════════════════════════════════════
// what alpha does each FIRING fill actually need for its stroke to clear the bar? This is the
// direct answer to "universal, or does it need to be checked against what the color is".
const alphaRows: string[] = []
for (const bar of BARS) {
  const per: Record<string, number[]> = {}
  const unreach: Record<string, number> = {}
  for (const H of HUES) for (const L of LS) for (const share of CSHARE) {
    const { out } = familiesOf(seedHex(L, H, share), null)
    for (const mode of ['light', 'dark'] as const) for (const r of out[mode]) {
      if (lc(r.cta, r.plane) >= bar) continue           // not firing at this bar
      const a = solveAlpha(r.cta, r.plane, mode, bar)
      // never silently drop the unreachable ones — a stroke that cannot reach the bar even at
      // the pure pole is a finding about the bar, not a row to hide.
      if (a === null) unreach[r.fam] = (unreach[r.fam] ?? 0) + 1
      else (per[r.fam] ??= []).push(a * 100)
    }
  }
  for (const [fam, arr] of Object.entries(per)) {
    arr.sort((x, y) => x - y)
    const med = arr[Math.floor(arr.length / 2)]
    const rungs = arr.map(a => snapUp(a / 100))
    const spread = [...new Set(rungs)].sort((a, b) => (a === OVER ? 99 : a) - (b === OVER ? 99 : b))
    alphaRows.push(`<tr><td class="n">Lc ${bar}</td><td class="fam">${fam}</td><td class="n">${arr.length}</td>
      <td class="n">${arr[0].toFixed(1)}%</td><td class="n hit">${med.toFixed(1)}%</td><td class="n">${arr[arr.length - 1].toFixed(1)}%</td>
      <td class="n dim">${spread.map(r => rungLabel(r)).join(' · ')}</td></tr>`)
  }
  for (const [fam, n] of Object.entries(unreach))
    alphaRows.push(`<tr><td class="n">Lc ${bar}</td><td class="fam">${fam}</td><td class="n">${n}</td><td class="n" colspan="3">unreachable — the stroke cannot clear this bar even at the pure pole</td><td class="n dim">—</td></tr>`)
}

// ══ BLOCKS 3+4 — RANK, THREE WAYS (+ signals at three ranks) ══════════════════════════════════
// (a) FIXED: her hand edit — neutral 08 · secondary 12 · primary 24, regardless of need.
// (b) SOLVED: each firer gets only what it needs. No rank constraint at all.
// (c) ORDERED: each firer gets at least what it needs, and rank order is forced upward from the
//     worst offender — "check for the worst and scale up from the worst offender", read as the
//     ordering constraint propagating up rather than every family inheriting the worst rung.
const FIXED: Record<string, number> = { neutral: 8, secondary: 12, primary: 24 }
function assignRungs(rows: FamRow[], mode: 'light' | 'dark', bar: number, signalRank: number | null) {
  const firing = rows.filter(r => lc(r.cta, r.plane) < bar)
  const need = new Map<string, Rung>()
  for (const r of firing) need.set(r.fam, snapUp(solveAlpha(r.cta, r.plane, mode, bar)))
  const rankOf = (r: FamRow) => r.rank ?? signalRank
  const fixed = new Map<string, Rung>(), solved = new Map(need), ordered = new Map<string, Rung>()
  for (const r of firing) fixed.set(r.fam, FIXED[r.fam] ?? 12)
  // ordered: walk rank ascending; each tier gets at least its own need and at least one rung
  // above the tier below it. `collided` records where the ladder RAN OUT — two tiers forced onto
  // the same top rung is the ladder failing to express the order, not a decision.
  const ranked = firing.filter(r => rankOf(r) !== null).sort((a, b) => rankOf(a)! - rankOf(b)!)
  const collided: string[] = []
  let floorIdx = -1
  for (const r of ranked) {
    const n = need.get(r.fam)!
    let idx = n === OVER ? LADDER.length - 1 : LADDER.indexOf(n)
    if (idx <= floorIdx) {
      if (floorIdx >= LADDER.length - 1) collided.push(r.fam)
      idx = Math.min(floorIdx + 1, LADDER.length - 1)
    }
    ordered.set(r.fam, n === OVER || (idx === LADDER.length - 1 && collided.includes(r.fam)) ? OVER : LADDER[idx])
    floorIdx = idx
  }
  for (const r of firing) if (!ordered.has(r.fam)) ordered.set(r.fam, need.get(r.fam)!)
  return { firing, fixed, solved, ordered, collided }
}

// the toolbar trio, rendered the way her screenshot frames it, on the real page plane.
const SHOWCASE = [
  { L: 0.94, H: 145, share: 1.0, label: 'pale green — her screenshot class' },
  { L: 0.88, H: 250, share: 0.6, label: 'pale blue' },
  { L: 0.80, H: 85, share: 1.0, label: 'gold' },
  { L: 0.62, H: 265, share: 0.8, label: 'mid navy — the non-firing control' },
]
const rankSections: string[] = []
for (const bar of [15, 30]) {
  const blocks: string[] = []
  for (const sc of SHOWCASE) {
    const pHex = seedHex(sc.L, sc.H, sc.share)
    const { out, nScale, theme } = familiesOf(pHex, null)
    for (const mode of ['light', 'dark'] as const) {
      const rows = out[mode]
      const { fixed, solved, ordered } = assignRungs(rows, mode, bar, null)
      const plane = rows[0].plane
      const pick = (fam: string) => rows.find(r => r.fam === fam)!
      const strip = (title: string, m: Map<string, Rung>) => {
        const btn = (fam: string, text: string, circle: boolean) => {
          const r = pick(fam)
          const rung = m.get(fam)
          const a = rungAlpha(rung)
          const pole = mode === 'light' ? '0,0,0' : '255,255,255'
          const bd = a === null ? 'transparent' : `rgba(${pole},${(a / 100).toFixed(2)})`
          const s = fam === 'primary' ? theme.primary.scale : fam === 'secondary' ? theme.secondary!.scale : nScale
          const white = mode === 'light' ? s.onFillTextIsWhite : s.onFillTextIsWhiteDark
          return `<div class="cell"><div class="btn${circle ? ' circ' : ''}" style="background:${hx(r.cta)};color:${white ? '#fff' : '#000'};border-color:${bd}">${text}</div>
            <div class="lab">${rungLabel(rung)}</div></div>`
        }
        return `<div class="tool" style="background:${hx(plane)}">${btn('neutral', '+', true)}${btn('secondary', 'Secondary', false)}${btn('primary', 'Transfer tokens', false)}
          <div class="tlab ${mode}">${title}</div></div>`
      }
      blocks.push(`<div class="showrow ${mode}">
        <div class="rid"><div class="idsw" style="background:${pHex}"></div><b>${pHex}</b><br><span class="dim">${sc.label} · ${mode}</span></div>
        <div class="strips">${strip('(a) fixed 08/12/24', fixed)}${strip('(b) solved α', solved)}${strip('(c) rank-ordered', ordered)}</div></div>`)
    }
  }
  rankSections.push(`<div class="stitle">3 · RANK, THREE WAYS — bar Lc ${bar}</div>
<div class="note" style="margin:0"><b>—</b> = not firing at this bar, no stroke. <b>&gt; 32</b> = firing, but needs more than the ladder's top rung — the opposite meaning, so they never share a glyph.<br>
<b>(a) fixed</b> your hand edit, applied by role regardless of need · <b>(b) solved α</b> each firer gets only what it needs, no rank constraint · <b>(c) rank-ordered</b> each firer gets at least what it needs AND at least one rung above the tier below it.</div>${blocks.join('')}`)
}

// signals at the three candidate ranks (her: "show all three in the sweep")
const SIGRANKS: [string, number | null][] = [['no rank — floor only', null], ['as primary', RANK.primary], ['own tier, above secondary', 1.5]]
const sigBlocks: string[] = []
for (const sc of SHOWCASE.slice(0, 2)) {
  const pHex = seedHex(sc.L, sc.H, sc.share)
  const { out } = familiesOf(pHex, null)
  for (const mode of ['light', 'dark'] as const) {
    const rows = out[mode]
    const plane = rows[0].plane
    const variants = SIGRANKS.map(([name, sr]) => {
      const { ordered } = assignRungs(rows, mode, 30, sr)
      const cells = ['primary', 'secondary', 'critical', 'warning', 'positive', 'info'].map(fam => {
        const r = rows.find(x => x.fam === fam); if (!r) return ''
        const rung = ordered.get(fam)
        const a = rungAlpha(rung)
        const pole = mode === 'light' ? '0,0,0' : '255,255,255'
        return `<div class="cell"><div class="btn sm" style="background:${hx(r.cta)};color:#000;border-color:${a === null ? 'transparent' : `rgba(${pole},${(a / 100).toFixed(2)})`}">${fam}</div>
          <div class="lab">${rungLabel(rung)}</div></div>`
      }).join('')
      return `<div class="tool" style="background:${hx(plane)}">${cells}<div class="tlab ${mode}">${name}</div></div>`
    }).join('')
    sigBlocks.push(`<div class="showrow ${mode}"><div class="rid"><div class="idsw" style="background:${pHex}"></div><span class="dim">${sc.label} · ${mode}</span></div><div class="strips">${variants}</div></div>`)
  }
}

// ══ BLOCK 5 — THE SECONDARY GAP (her ask #1) ══════════════════════════════════════════════════
// Custom secondaries at candidate apparent-L gaps above the primary's cta. LIGHT ONLY is
// steerable via the seed: in dark, every custom AND derived secondary's cta is flat-placed at
// darkFlatGapApp above ground regardless of seed, so the dark column is here to SHOW that.
const GAPS = [0, 4, 6, 8, 10]
const WHITE_APP = grayApparentL(1.0)
// the shipped transform with a second floor added — the primary's cta, not just the ground.
// Same 2-pass L↔C settle as defaultSecondarySeed's own loop; direction is always UP.
const gapSeed = (hex: string, primaryCta: ColorStop, gap: number) => {
  const d = DEFAULT_SECONDARY
  const seed = { L: 0, C: 0, H: 0 } as any
  const parsed = resolveBrand(hex, 'probe', { exact: true, skipCollisionRules: true, contrastProfile: PROFILE }).scale
  seed.L = parsed.brandL; seed.C = parsed.brandC; seed.H = parsed.brandH
  let L2 = seed.L + d.kL * Math.max(0, d.lRoom - seed.L)
  const H2 = seed.H                                  // custom does NOT rotate (C34)
  let C2 = Math.min(d.kC * seed.C, d.kR * maxChromaAt(L2, H2))
  const pApp = apparentL(primaryCta.L, primaryCta.C, primaryCta.H)
  for (let i = 0; i < 2; i++) {
    // the shipped ground floor
    if (WHITE_APP - apparentL(L2, clampChromaToGamut(L2, C2, H2), H2) < d.minGapApp) {
      L2 = solveLForApparent(WHITE_APP - d.minGapApp, C2, H2)
      C2 = Math.min(d.kC * seed.C, d.kR * maxChromaAt(L2, H2))
    }
    // the CANDIDATE primary floor — always lighter, minimum move
    if (gap > 0 && apparentL(L2, clampChromaToGamut(L2, C2, H2), H2) - pApp < gap) {
      const want = Math.min(pApp + gap, WHITE_APP - d.minGapApp)   // ground floor wins the conflict
      L2 = solveLForApparent(want, C2, H2)
      C2 = Math.min(d.kC * seed.C, d.kR * maxChromaAt(L2, H2))
    }
  }
  return hx({ L: L2, C: C2, H: H2 })
}

// ── how often does hierarchy actually break, and how often can a lift even fix it? ────────────
// THE CEILING: the shipped ground floor (minGapApp) forbids any secondary from going above
// WHITE_APP − 10. When the PRIMARY's cta already sits above that line, "always lighter" is not
// merely hard, it is unreachable — the secondary is pinned at its ceiling and still heavier.
const CEIL = WHITE_APP - DEFAULT_SECONDARY.minGapApp
const sizing = { n: 0, broken: 0, fixable: 0, stuck: 0 }
const byPL: Record<number, { n: number; broken: number; stuck: number }> = {}
for (const pL of LS) for (const pH of HUES) for (const pS of CSHARE) {
  const pHex = seedHex(pL, pH, pS)
  for (const sL of [0.35, 0.60, 0.88]) {
    const t = resolveTheme({ primaryHex: pHex, secondaryHex: seedHex(sL, (pH + 120) % 360, 0.8), secondaryStyle: 'default', contrastProfile: PROFILE })
    const pc = t.primary.scale.cta, sc = t.secondary!.scale.cta
    const pApp = apparentL(pc.L, pc.C, pc.H), sApp = apparentL(sc.L, sc.C, sc.H)
    byPL[pL] ??= { n: 0, broken: 0, stuck: 0 }
    byPL[pL].n++; sizing.n++
    if (sApp < pApp) {
      sizing.broken++; byPL[pL].broken++
      if (CEIL - pApp > 0) sizing.fixable++
      else { sizing.stuck++; byPL[pL].stuck++ }
    }
  }
}
const sizingRows = Object.entries(byPL).map(([pL, v]) =>
  `<tr><td class="fam">primary seed L ${pL}</td><td class="n">${v.n}</td><td class="n ${v.broken ? 'hit' : ''}">${v.broken}</td><td class="n ${v.stuck ? 'hit' : ''}">${v.stuck}</td></tr>`).join('')

// case strips: one that the lift CAN fix, one that it cannot (her screenshot class), one control.
const SEC_CASES = [
  { p: seedHex(0.70, 265, 1.0), s: seedHex(0.35, 25, 0.8), label: 'mid navy primary · dark red secondary — LIFT CAN FIX' },
  { p: seedHex(0.94, 145, 1.0), s: seedHex(0.88, 250, 0.7), label: 'pale green primary · blue secondary — HER SHOT, lift exhausted' },
  { p: seedHex(0.80, 85, 1.0), s: seedHex(0.72, 20, 0.9), label: 'gold primary · red secondary — already clear (control)' },
]
const secBlocks: string[] = []
for (const cs of SEC_CASES) {
  const base = resolveTheme({ primaryHex: cs.p, secondaryHex: cs.s, secondaryStyle: 'default', contrastProfile: PROFILE })
  const nScale = generateNeutralScale(base.primary.scale.brandH, 'default', PROFILE)
  for (const mode of ['light', 'dark'] as const) {
    const plane = mode === 'light' ? nScale.light.find(s => s.stop === 2)! : nScale.dark.find(s => s.stop === 1)!
    const pCta = mode === 'light' ? base.primary.scale.cta : base.primary.scale.ctaDark
    const cells = GAPS.map(g => {
      const sc = g === 0
        ? base.secondary!.scale
        : resolveBrand(gapSeed(cs.s, base.primary.scale.cta, g), 'secondary', { skipCollisionRules: true, contrastProfile: PROFILE, darkCtaFlatApp: DEFAULT_SECONDARY.darkFlatGapApp } as any).scale
      const sCta = mode === 'light' ? sc.cta : sc.ctaDark
      const dApp = apparentL(sCta.L, sCta.C, sCta.H) - apparentL(pCta.L, pCta.C, pCta.H)
      // WHICH SIGN RECEDES FLIPS BY MODE. Prominence is distance from the page: on a light page
      // the darker fill shouts, so the secondary recedes by going LIGHTER (Δapp > 0). On a dark
      // page the lighter fill shouts, so it recedes by going DARKER (Δapp < 0). Same rule, mirrored.
      const recedes = mode === 'light' ? dApp > 0 : dApp < 0
      const white = mode === 'light' ? sc.onFillTextIsWhite : sc.onFillTextIsWhiteDark
      return `<div class="cell"><div class="lab">${g === 0 ? 'shipped' : `gap ≥ ${g}`}</div>
        <div class="btn" style="background:${hx(sCta)};color:${white ? '#fff' : '#000'}">Secondary</div>
        <div class="lab ${recedes ? '' : 'bad'}">Δapp ${dApp > 0 ? '+' : ''}${dApp.toFixed(1)}</div></div>`
    }).join('')
    const pWhite = mode === 'light' ? base.primary.scale.onFillTextIsWhite : base.primary.scale.onFillTextIsWhiteDark
    const pApp = apparentL(pCta.L, pCta.C, pCta.H)
    const head = CEIL - pApp
    secBlocks.push(`<div class="showrow ${mode}"><div class="rid"><span class="dim">${cs.label}<br>${mode} · primary app <b>${pApp.toFixed(1)}</b><br>headroom to the secondary ceiling <b>${head > 0 ? '+' : ''}${head.toFixed(1)}</b></span></div>
      <div class="tool" style="background:${hx(plane)}">
        <div class="cell"><div class="lab">PRIMARY</div><div class="btn" style="background:${hx(pCta)};color:${pWhite ? '#fff' : '#000'}">Primary</div><div class="lab">&nbsp;</div></div>
        ${cells}</div></div>`)
  }
}

// ══ BLOCK 6 — DOES THE SIGNAL PLANE EVEN VARY BY BRAND? ═══════════════════════════════════════
// signals.css is ONE shared file with no brand context (signalsCss takes only a profile), so a
// per-brand neutral is not reachable there. The neutral IS generated per brand hue, but only its
// chroma moves — the L scaffold is shared. If the Lc spread across brand hues is negligible, a
// canonical plane is safe for signals and the CSS side won't diverge from the Figma side.
const planeSpread: string[] = []
for (const mode of ['light', 'dark'] as const) {
  const sigs = signalScalesFor(PROFILE)
  for (const sig of SIGNALS) {
    const vals = HUES.map(H => {
      const n = generateNeutralScale(H, 'default', PROFILE)
      const plane = mode === 'light' ? n.light.find(s => s.stop === 2)! : n.dark.find(s => s.stop === 1)!
      const s = sigs.get(sig.name)!.scale
      return lc(mode === 'light' ? s.cta : s.ctaDark, plane)
    })
    const lo = Math.min(...vals), hi = Math.max(...vals)
    planeSpread.push(`<tr><td class="fam">${sig.emitName}</td><td class="n">${mode}</td><td class="n">${lo.toFixed(2)}</td><td class="n">${hi.toFixed(2)}</td><td class="n ${hi - lo > 1 ? 'hit' : 'dim'}">${(hi - lo).toFixed(3)}</td></tr>`)
  }
}

// ── page ──────────────────────────────────────────────────────────────────────────────────────
const html = `<!doctype html><meta charset="utf-8"><title>CTA border — gate, ladder, hierarchy</title>
<style>
  body { font: 14px/1.5 -apple-system, sans-serif; margin:0; background:#faf9f7; color:#1a1a1a; }
  .note { padding:1rem 1.4rem; background:#f2f0ec; font-size:.86rem; }
  .note b { font-weight:800; }
  .stitle { padding:.6rem 1.4rem; margin-top:1.2rem; font-weight:800; font-size:.8rem; letter-spacing:.04em; background:#eceae4; }
  table { border-collapse:collapse; margin:.7rem 1.4rem; font-size:.78rem; }
  th, td { padding:.28rem .7rem; border-bottom:1px solid #e7e4de; text-align:left; }
  th { font-size:.62rem; text-transform:uppercase; letter-spacing:.04em; opacity:.6; }
  td.n { text-align:right; font-variant-numeric:tabular-nums; }
  td.fam { font-weight:700; }
  td.hit { font-weight:800; }
  td.dim, .dim { opacity:.55; }
  .lab.bad { font-weight:800; }
  .showrow { display:flex; gap:1rem; align-items:center; padding:.5rem 1.4rem; }
  .showrow.dark { background:#17171a; color:#d5d5d5; }
  .rid { width:200px; flex:0 0 200px; font-size:.72rem; }
  .idsw { width:18px; height:18px; border-radius:5px; display:inline-block; vertical-align:-3px; margin-right:.3rem; }
  .strips { display:flex; gap:1rem; flex-wrap:wrap; }
  .tool { display:flex; gap:.7rem; align-items:center; padding:.7rem .9rem; border-radius:12px; position:relative; padding-bottom:1.5rem; }
  .cell { display:flex; flex-direction:column; align-items:center; gap:.2rem; }
  .btn { min-width:110px; height:40px; border-radius:999px; border:1.5px solid transparent; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:.74rem; padding:0 .9rem; }
  .btn.circ { min-width:40px; width:40px; padding:0; font-size:1rem; }
  .btn.sm { min-width:78px; height:32px; font-size:.62rem; padding:0 .5rem; }
  .lab { font-size:.56rem; text-transform:uppercase; letter-spacing:.03em; opacity:.65; }
  .tlab { position:absolute; left:.9rem; bottom:.35rem; font-size:.56rem; text-transform:uppercase; letter-spacing:.04em; opacity:.65; }
  .tlab.dark { color:#cfcfcf; }
</style>
<div class="note"><b>CTA border — Stage A. Measurement only; the engine is untouched.</b><br>
Lane <b>wcag</b> (build.ts SHIPPED_PROFILE), so counts compare to shipped <code>dist/</code>. Plane = <b>the page</b>: neutral paper-97 in light, neutral paper-99 in dark. Seeds are agnostic hue × lightness × chroma-share sweeps, not named brands — ${HUES.length}×${LS.length}×${CSHARE.length} = ${HUES.length * LS.length * CSHARE.length} themes.<br><br>
<b>APCA is used here as a taste instrument, on your ruling</b> — these buttons carry no contrast requirement. <b>The 1.5px caveat:</b> the Lc 15 / 30 levels you quoted are specified for non-text elements <i>no less than 5px in the smallest dimension</i>; this stroke is 1.5px, and APCA wants more contrast for thin lines. <b>Lc 45 is not an APCA level</b> — it is headroom on the ladder to read against, since 15 is likely too lenient for a hairline.<br><br>
Strokes are rendered as the real component renders them: <code>border: 1.5px solid rgba(…)</code> over the fill, which composites in exactly the space measured. Ladder = <code>${LADDER.map(r => `offset-${String(r).padStart(2, '0')}`).join(' · ')}</code> — an extension of the shadow-04/08/12 convention offset-12 was named into. Each rung is one brand-independent base row: <b>zero per-brand overrides</b>, which is why C39 chose an alpha over a family-relative stop, and why a 6-rung ladder is still cheap.</div>

<div class="stitle">1 · THE GATE — how many fire, today vs each bar</div>
<div class="note" style="margin:0"><b>A <code>0.0</code> in the range column is APCA's own black-level clamp, not a bug.</b> The formula floors any <code>sapc &lt; 0.1</code> to exactly zero, so everything below <b>Lc 7.3</b> reports as 0 — it means "under the reporting floor", i.e. indistinguishable. The neutral's cta sits there against the page at every seed, which is the same thing C39 found by hand (<i>"the neutral button as is falls in this category"</i>) and why 62 of 62 shipped neutrals fire today.<br>
Signal counts land on exact multiples of 120 (= one mode × 120 seeds) because the signal ramps are canonical and brand-independent — which pre-confirms block 6 before you read it.</div>
<table><tr><th>family</th><th>samples</th><th>today (wash-89)</th>${BARS.map(b => `<th>Lc &lt; ${b}</th>`).join('')}<th>|Lc| range vs page</th></tr>
${gateRows}
<tr style="border-top:2px solid #999"><td class="fam">ALL</td><td class="n">${totN}</td><td class="n hit">${totToday}</td>${BARS.map(b => `<td class="n hit">${totBar(b)}</td>`).join('')}<td class="n dim">shipped dist = 62 of 220</td></tr></table>

<div class="stitle">2 · SOLVED α — what each firing fill actually needs (the "universal or per-color" answer)</div>
<table><tr><th>bar</th><th>family</th><th>firing</th><th>min α</th><th>median α</th><th>max α</th><th>rungs used</th></tr>${alphaRows.join('')}</table>

${rankSections.join('')}

<div class="stitle">4 · SIGNALS AT THREE CANDIDATE RANKS — bar Lc 30</div>
${sigBlocks.join('')}

<div class="stitle">5 · THE SECONDARY GAP — and the ceiling that stops it</div>
<div class="note" style="margin:0"><b>The lift cannot fix your screenshot, and here is why.</b> The shipped ground floor (<code>minGapApp ${DEFAULT_SECONDARY.minGapApp}</code>) forbids any secondary from rising above apparent <b>${CEIL.toFixed(0)}</b>. When the PRIMARY's cta already sits above that line — a very pale primary — the secondary is pinned at its own ceiling and is <i>still</i> heavier. "Always lighter" is then not hard, it is unreachable.<br><br>
Across ${sizing.n} agnostic primary × custom-secondary pairs: <b>${sizing.broken} (${(100 * sizing.broken / sizing.n).toFixed(0)}%)</b> have the secondary heavier than the primary. Of those, a lift fixes <b>${sizing.fixable}</b> and cannot fix <b>${sizing.stuck}</b>. The split is driven entirely by the primary's own lightness:</div>
<table><tr><th>primary seed</th><th>pairs</th><th>secondary heavier</th><th>unfixable by lift</th></tr>${sizingRows}</table>
<div class="note" style="margin:0"><b>Δapp</b> = secondary cta apparent minus primary cta apparent. <b>Which sign is correct flips by mode</b>, because prominence is distance from the page: on a light page the darker fill shouts, so the secondary recedes by going <i>lighter</i> (Δapp &gt; 0); on a dark page the lighter fill shouts, so it recedes by going <i>darker</i> (Δapp &lt; 0). Bold = the wrong side for that mode. <b>Gap ≥ N</b> adds a second floor to the shipped <code>defaultSecondarySeed</code> transform — always upward, minimum move, ground floor wins any conflict. Where the columns don't move, the ceiling is binding.<br>
<b>The dark rows are already on the correct side</b> and the gap columns cannot move them: every custom and derived secondary's dark cta is flat-placed at <code>darkFlatGapApp ${DEFAULT_SECONDARY.darkFlatGapApp}</code> above ground regardless of seed. Dark hierarchy is structural, it is not broken, and the lift is not the lever there.</div>
${secBlocks.join('')}

<div class="stitle">6 · CAN SIGNALS USE A CANONICAL PLANE? — |Lc| spread of each signal cta across all 12 brand hues</div>
<div class="note" style="margin:0"><code>signalsCss()</code> takes only a contrast profile — signals.css is one shared file with no brand context, so a per-brand neutral is not reachable there. The neutral is generated per brand hue, but only its chroma moves; the L scaffold is shared. If the spread below is negligible, signals can use a canonical plane without the CSS side diverging from the Figma side (where <code>themeToFigma</code> does have the brand's neutral).</div>
<table><tr><th>signal</th><th>mode</th><th>min |Lc|</th><th>max |Lc|</th><th>spread</th></tr>${planeSpread.join('')}</table>
<div style="height:2rem"></div>`

mkdirSync(`${__dirname}/../render`, { recursive: true })
writeFileSync(OUT, html)
console.log(`written -> render/cta-border-sweep.html`)
console.log(`gate: today ${totToday}/${totN}` + BARS.map(b => ` · Lc<${b} ${totBar(b)}/${totN}`).join(''))
