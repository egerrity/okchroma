import React, { useMemo, useState } from 'react'
import { resolveBrand, type ResolvedBrand } from '../../src/engine/resolve'
import { brandCss, neutralCss, stopHex } from '../../src/engine/cssRender'
import { hexToOklch } from '../../src/engine/colorMath'
import { apparentL } from '../../src/engine/perceptualL'
import { TokenCards } from '../TokenCards'
import { FONT_STACK } from '../shared'
import {
  UNIFY_THEMES, UNIFY_RAMPS, UNIFY_SIGNALS, UNIFY_SEMANTIC_CENSUS, UNIFY_GRAY, type UnifyTheme,
} from './unifyData'

// ─── Unify × OKChroma comparison — an ORPHANED page ─────────────────────────
// Reached only by direct URL (#/unify-compare); linked from NOWHERE in the app.
// A persuasion exhibit for design-org stakeholders: what Unify's hand-picked
// variables do across its 7 brand themes, next to what the engine emits from
// the same 7 seed colors. The Unify side renders the owner's variable export
// verbatim (demo/unify-compare/unifyData.ts); the OKChroma side resolves live
// through the real pipeline (resolveBrand → brandCss), never a bypass.

// Perceived luminance via the engine's own instrument (Nayatani/H-K-aware
// apparent L*), so both systems are measured with the same ruler.
const appL = (hex: string): number => {
  const { L, C, H } = hexToOklch(hex)
  return apparentL(L, C, H)
}
// The indicator chip — one recipe, colored by whatever each system can supply.
// No icon, one word (owner 2026-07-27): the row must FIT ONE LINE so the seven
// rows scan as columns.
function Chip({ bg, border, fg }: { bg: string; border: string; fg: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', background: bg,
      border: `1px solid ${border}`, borderRadius: 8, padding: '5px 14px',
      fontSize: 12, fontWeight: 600, color: fg, whiteSpace: 'nowrap',
    }}>chip</span>
  )
}

const slugOf = (t: UnifyTheme) => 'ucmp-' + t.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const shortName = (t: UnifyTheme) => t.name.replace(' (white-label)', '').replace(' (archived)', '')

// ─── fixed chart panel chrome ───────────────────────────────────────────────
// Chart panels depict a SPECIFIC mode, so their surfaces are fixed (dark data
// sits on a dark background regardless of the page toggle). Ink/grid values are
// panel-local, not theme vars.
const PANEL = {
  light: { bg: '#FFFFFF', ink: '#52525B', inkStrong: '#26262B', grid: '#ECECF1' },
  dark: { bg: '#161618', ink: '#9B9BA3', inkStrong: '#E4E4E9', grid: '#28282D' },
} as const
type PanelMode = keyof typeof PANEL

interface Dot { y: number; fill: string; hex: string; note?: string }
interface DotSeries { label: string; dots: Array<Dot | null> }

// Dot-per-theme chart: x = theme, y = apparent L* (0–100). One thin connector
// per role so the jumping (or the flatness) reads as a line shape.
function DotChart({ mode, xLabels, series, height = 236 }: {
  mode: PanelMode; xLabels: string[]; series: DotSeries[]; height?: number
}) {
  const p = PANEL[mode]
  const [hover, setHover] = useState<{ si: number; di: number } | null>(null)
  const m = { l: 40, r: 86, t: 16, b: 30 }
  const width = 460
  const iw = width - m.l - m.r, ih = height - m.t - m.b
  const x = (i: number) => m.l + (xLabels.length === 1 ? iw / 2 : (i / (xLabels.length - 1)) * iw)
  const y = (v: number) => m.t + (1 - v / 100) * ih
  // right-edge series labels, nudged apart when two series end near each other
  const labelY: number[] = series.map(s => {
    const last = [...s.dots].reverse().find(Boolean)
    return last ? y(last.y) : m.t
  })
  const order = labelY.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0])
  for (let k = 1; k < order.length; k++) {
    if (order[k][0] - order[k - 1][0] < 13) order[k] = [order[k - 1][0] + 13, order[k][1]]
  }
  const labelYAdj: number[] = []
  for (const [v, i] of order) labelYAdj[i] = v
  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Apparent lightness per theme, ${mode} mode`}
      style={{ width: '100%', height: 'auto', display: 'block', background: p.bg, borderRadius: 10 }}>
      {[0, 25, 50, 75, 100].map(v => (
        <g key={v}>
          <line x1={m.l} x2={width - m.r} y1={y(v)} y2={y(v)} stroke={p.grid} strokeWidth={1} />
          <text x={m.l - 7} y={y(v) + 3.5} textAnchor="end" fontSize={9.5} fill={p.ink}>{v}</text>
        </g>
      ))}
      {xLabels.map((l, i) => (
        <text key={l} x={x(i)} y={height - m.b + 16} textAnchor="middle" fontSize={9.5} fill={p.ink}>{l}</text>
      ))}
      {series.map((s, si) => {
        const pts = s.dots.map((d, i) => d ? { d, i } : null).filter(Boolean) as Array<{ d: Dot; i: number }>
        return (
          <g key={s.label}>
            <polyline fill="none" stroke={p.ink} strokeOpacity={0.35} strokeWidth={1.25}
              points={pts.map(({ d, i }) => `${x(i)},${y(d.y)}`).join(' ')} />
            {pts.map(({ d, i }) => (
              <circle key={i} cx={x(i)} cy={y(d.y)} r={hover?.si === si && hover?.di === i ? 6.5 : 5}
                fill={d.fill} stroke={p.bg} strokeWidth={2}
                onMouseEnter={() => setHover({ si, di: i })} onMouseLeave={() => setHover(null)} />
            ))}
            {pts.length > 0 && (
              <text x={width - m.r + 8} y={labelYAdj[si] + 3.5} fontSize={10}
                fontWeight={600} fill={p.inkStrong}>{s.label}</text>
            )}
          </g>
        )
      })}
      {hover && series[hover.si].dots[hover.di] && (() => {
        const d = series[hover.si].dots[hover.di]!
        const tx = Math.min(x(hover.di) + 10, width - m.r - 92)
        const ty = Math.max(y(d.y) - 30, 4)
        return (
          <g pointerEvents="none">
            <rect x={tx} y={ty} width={104} height={24} rx={5} fill={p.inkStrong} opacity={0.94} />
            <text x={tx + 8} y={ty + 15.5} fontSize={9.5} fill={p.bg} fontWeight={600}>
              {d.hex.toUpperCase()} · L* {d.y.toFixed(0)}{d.note ? ` · ${d.note}` : ''}
            </text>
          </g>
        )
      })()}
    </svg>
  )
}

interface RampLine { label: string; stroke: string; points: Array<{ x: number; y: number }> }

// Ramp-shape chart: x = position along the ramp (normalized), y = apparent L*.
// One line per family — Unify's hand-picked curves cross and gap; the engine's
// repeat one shape.
function RampChart({ mode, lines, xTicks, height = 210 }: {
  mode: PanelMode; lines: RampLine[]; xTicks: Array<{ x: number; label: string }>; height?: number
}) {
  const p = PANEL[mode]
  const m = { l: 40, r: 14, t: 14, b: 28 }
  const width = 460
  const iw = width - m.l - m.r, ih = height - m.t - m.b
  const x = (v: number) => m.l + v * iw
  const y = (v: number) => m.t + (1 - v / 100) * ih
  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Ramp lightness curves, ${mode} mode`}
      style={{ width: '100%', height: 'auto', display: 'block', background: p.bg, borderRadius: 10 }}>
      {[0, 25, 50, 75, 100].map(v => (
        <g key={v}>
          <line x1={m.l} x2={width - m.r} y1={y(v)} y2={y(v)} stroke={p.grid} strokeWidth={1} />
          <text x={m.l - 7} y={y(v) + 3.5} textAnchor="end" fontSize={9.5} fill={p.ink}>{v}</text>
        </g>
      ))}
      {xTicks.map(t => (
        <text key={t.label} x={x(t.x)} y={height - m.b + 15} textAnchor="middle" fontSize={9} fill={p.ink}>{t.label}</text>
      ))}
      {lines.map(l => (
        <polyline key={l.label} fill="none" stroke={l.stroke} strokeWidth={2} strokeLinejoin="round"
          points={l.points.map(pt => `${x(pt.x)},${y(pt.y)}`).join(' ')}>
          <title>{l.label}</title>
        </polyline>
      ))}
    </svg>
  )
}

// ─── shared section chrome ──────────────────────────────────────────────────
const CARD: React.CSSProperties = {
  background: 'var(--surface-lift)', borderRadius: 16, padding: '20px 22px',
  boxShadow: 'var(--elev-card)', display: 'flex', flexDirection: 'column', gap: 12,
}
const CARD_TITLE: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: 'var(--fg-default)' }
const CARD_SUB: React.CSSProperties = { fontSize: 12.5, lineHeight: 1.5, color: 'var(--fg-subtle)', margin: 0 }
const STAT: React.CSSProperties = { fontSize: 12.5, color: 'var(--fg-default)', lineHeight: 1.5 }
const MODE_TAG: React.CSSProperties = { fontSize: 10.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--fg-subtle)' }

function Section({ n, title, lede, children }: { n: number; title: string; lede: string; children: React.ReactNode }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.08em', color: 'var(--brand-ink-9, var(--fg-subtle))' }}>0{n}</div>
        <h2 style={{ margin: '2px 0 6px', fontSize: 22, fontWeight: 700, color: 'var(--fg-default)' }}>{title}</h2>
        <p style={{ margin: 0, maxWidth: 720, fontSize: 14, lineHeight: 1.55, color: 'var(--fg-subtle)' }}>{lede}</p>
      </div>
      {children}
    </section>
  )
}

// ─── Unify mirror of TokenCards ─────────────────────────────────────────────
// The SAME layout as the OKChroma TokenCards opposite it, colored with everything
// Unify actually has: the three brand aliases tint the cta, one wash and one
// highlight — every other stop must ride the shared Gray ramp. The grayness IS
// the exhibit.
function UnifyMirrorCard({ t, dark }: { t: UnifyTheme; dark: boolean }) {
  const g = (stop: number) => { const s = UNIFY_GRAY.find(x => x.stop === stop)!; return dark ? s.dark : s.light }
  const brand = (r: 'primary' | 'highlight' | 'accent') => (dark ? t[r].darkHex : t[r].hex)
  const inkHi = g(900), inkMid = g(600)
  // the button's HARDCODED ink: white in light, black in dark — brand-blind by design
  const buttonInk = dark ? '#0E0F10' : '#FFFFFF'
  const boxLabel: React.CSSProperties = { fontSize: 12, fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.03em' }
  const boxBody: React.CSSProperties = { fontSize: 14, lineHeight: 1.4 }
  const box: React.CSSProperties = { flex: 1, minWidth: 200, borderRadius: 10, padding: '13px 15px' }
  // the 1–11 ladder in Unify vocabulary: 3 brandable cells, gray everywhere else.
  // Accent sits at position 3 (owner 2026-07-27: its analog is paper-3, not a wash).
  const ladder: Array<{ n: number; fill: string; branded: boolean }> = [
    { n: 1, fill: g(0), branded: false },
    { n: 2, fill: g(25), branded: false },
    { n: 3, fill: brand('accent'), branded: true },
    { n: 4, fill: g(50), branded: false },
    { n: 5, fill: g(100), branded: false },
    { n: 6, fill: brand('highlight'), branded: true },
    { n: 7, fill: g(200), branded: false },
    { n: 8, fill: g(300), branded: false },
    { n: 9, fill: g(500), branded: false },
    { n: 10, fill: brand('primary'), branded: true },
    { n: 11, fill: g(900), branded: false },
  ]
  // Unify's OWN eleven-stop shape — this side of the comparison is the frozen export
  // and the 2026-07-29 collapse does not touch it. Spans asserted against the ladder
  // so the brackets can never drift off the stops they label.
  const groups = [
    { label: 'paper', span: 3 }, { label: 'wash', span: 4 },
    { label: 'highlight', span: 2 }, { label: 'ink', span: 2 },
  ]
  if (groups.reduce((a, g) => a + g.span, 0) !== ladder.length)
    throw new Error(`UnifyCompare: group spans != ladder length (${ladder.length})`)
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
        <span style={{ width: 24, height: 24, borderRadius: 6, flexShrink: 0, background: brand('primary') }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: brand('primary') }}>Brand Primary</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: inkHi, lineHeight: 1.15, marginBottom: 8 }}>Aa Heading</div>
      <p style={{ fontSize: 15, lineHeight: 1.5, color: inkHi, margin: '0 0 16px' }}>
        Text can only ride the <span style={{ color: inkMid }}>shared gray ramp</span> — no brand stop is vetted for
        text, so every theme&rsquo;s copy is the same gray.
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
        <button style={{
          width: 184, boxSizing: 'border-box', textAlign: 'center',
          background: brand('primary'), color: buttonInk,
          border: '1.5px solid transparent', borderRadius: 999, padding: '12px 28px',
          fontSize: 15, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
        }}>cta button</button>
        <span style={{ fontSize: 15, fontWeight: 600, padding: '12px 10px', color: brand('primary') }}>Text action</span>
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
        <div style={{ ...box, background: brand('accent') }}>
          <div style={{ ...boxLabel, color: inkMid }}>inset &middot; accent</div>
          <div style={{ ...boxBody, color: inkHi }}>Body copy in gray on the one brand tint.</div>
        </div>
        {/* controls box (owner 2026-07-28): mirror of the ok card's chip + focused
            input. Unify's chip = its section-2 recipe (Accent fill · Highlight border ·
            Primary text); the ring can only be Primary — no stop is vetted for the
            ring job, so ring weight re-rolls per theme — with an Accent halo. Input
            chrome is forced gray like everything else. */}
        <div style={{ ...box, background: g(25) }}>
          <div style={{ ...boxLabel, color: inkMid }}>chip &middot; focus ring</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 6,
              fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap',
              background: brand('accent'), color: brand('primary'), border: `1px solid ${brand('highlight')}`,
            }}>chip</span>
            <input readOnly value="Focused input" style={{
              flex: 1, minWidth: 0, boxSizing: 'border-box', padding: '7px 11px', borderRadius: 8,
              fontSize: 13, fontFamily: 'inherit', background: g(0), color: inkHi,
              border: `1.5px solid ${brand('primary')}`, boxShadow: `0 0 0 3px ${brand('accent')}`, outline: 'none',
            }} />
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 5 }}>
        {ladder.map(s => (
          <div key={s.n} title={s.branded ? 'brand alias' : 'Gray (forced)'} style={{
            flex: 1, height: 34, borderRadius: 6, background: s.fill,
            color: appL(s.fill) > 55 ? '#0E0F10' : '#FFFFFF',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600,
          }}>{s.n}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${ladder.length}, 1fr)`, gap: 5, marginTop: 6 }}>
        {groups.map(gr => (
          <div key={gr.label} style={{ gridColumn: `span ${gr.span}`, display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 0 }}>
            <div style={{ width: '100%', height: 6, borderLeft: '1px solid var(--border-default)', borderRight: '1px solid var(--border-default)', borderBottom: '1px solid var(--border-default)', borderRadius: '0 0 5px 5px' }} />
            <span style={{ marginTop: 5, fontSize: 12, color: 'var(--fg-subtle)' }}>{gr.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── the page ───────────────────────────────────────────────────────────────
export default function UnifyCompare() {
  const [dark, setDark] = useState(false)
  const themes = UNIFY_THEMES
  const labels = themes.map(shortName)

  // Every Unify seed through the real pipeline, once. apca = the shipped lane.
  const resolved = useMemo(() => themes.map(t => ({
    t, slug: slugOf(t), r: resolveBrand(t.primary.hex, shortName(t), { contrastProfile: 'apca' }),
  })), [themes])
  const allCss = useMemo(
    () => resolved.map(({ slug, r, t }) => brandCss(slug, shortName(t), r, null, '', 'default', 'apca')).join('\n'),
    [resolved])

  // ── section 1 data: role landings per theme, both modes ──
  const unifyRole = (role: 'primary' | 'highlight' | 'accent', mode: PanelMode) =>
    themes.map(t => {
      const hex = mode === 'light' ? t[role].hex : t[role].darkHex
      return { y: appL(hex), fill: hex, hex, note: `${t[role].family} ${t[role].stop}` }
    })
  const okRole = (pick: (r: ResolvedBrand, mode: PanelMode) => { hex: string; note: string }, mode: PanelMode) =>
    resolved.map(({ r }) => {
      const { hex, note } = pick(r, mode)
      return { y: appL(hex), fill: hex, hex, note }
    })
  const okCta = (r: ResolvedBrand, mode: PanelMode) =>
    ({ hex: stopHex(mode === 'light' ? r.scale.cta : r.scale.ctaDark), note: 'cta' })
  const okStop = (stop: number) => (r: ResolvedBrand, mode: PanelMode) => {
    const s = (mode === 'light' ? r.scale.light : r.scale.dark).find(x => x.stop === stop)!
    return { hex: stopHex(s), note: `stop ${stop}` }
  }
  const spread = (dots: Array<{ y: number }>) => {
    const ys = dots.map(d => d.y)
    return Math.max(...ys) - Math.min(...ys)
  }
  const uPrimL = unifyRole('primary', 'light'), uPrimD = unifyRole('primary', 'dark')
  const oCtaL = okRole(okCta, 'light'), oCtaD = okRole(okCta, 'dark')

  // ── section 1b data: ramp shapes ──
  const UNIFY_STOP_AXIS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]
  const unifyRampLines = (mode: PanelMode): RampLine[] =>
    Object.entries(UNIFY_RAMPS).map(([fam, stops]) => ({
      label: fam,
      stroke: stops.find(s => s.stop === 500)?.[mode] ?? stops[Math.floor(stops.length / 2)][mode],
      points: stops.map(s => ({ x: UNIFY_STOP_AXIS.indexOf(s.stop) / (UNIFY_STOP_AXIS.length - 1), y: appL(s[mode]) })),
    }))
  const okRampLines = (mode: PanelMode): RampLine[] =>
    resolved.map(({ t, r }) => ({
      label: shortName(t),
      stroke: stopHex(mode === 'light' ? r.scale.cta : r.scale.ctaDark),
      points: (mode === 'light' ? r.scale.light : r.scale.dark).map(s => ({ x: (s.stop - 1) / 10, y: appL(stopHex(s)) })),
    }))
  const unifyTicks = UNIFY_STOP_AXIS.map((s, i) => ({ x: i / (UNIFY_STOP_AXIS.length - 1), label: String(s) }))
  const okTicks = Array.from({ length: 11 }, (_, i) => ({ x: i / 10, label: String(i + 1) }))

  // ── section 2 data: the indicator-chip recipe, re-rolled per theme ──
  // Unify's chip = Accent(50) fill · Highlight(200) border · Primary text — all three
  // re-alias per theme, so the brand chip changes register per brand while the signal
  // chips beside it hold still (owner exhibit direction 2026-07-27: rows of chips per
  // theme — real components, never adjacent same-component ctas).
  const sigByName = (n: string) => UNIFY_SIGNALS.find(s => s.name === n)!
  const UNIFY_CHIP_SIGNALS = [['Success', 'positive'], ['Warning', 'warning'], ['Error', 'critical']] as const
  const grayStop = (stop: number) => {
    const s = UNIFY_GRAY.find(x => x.stop === stop)!
    return dark ? s.dark : s.light
  }
  // MIRRORED orders (owner 2026-07-27): the brand chip sits on the INSIDE edge of each
  // card, so the two brand columns meet at the gutter for direct comparison.
  const unifyChipRow = (t: UnifyTheme): Array<{ bg: string; border: string; fg: string }> => {
    const a = (r: 'primary' | 'highlight' | 'accent') => (dark ? t[r].darkHex : t[r].hex)
    const sig = (fam: string, part: '' | ' Highlight' | ' Accent') => {
      const s = sigByName(`Signal ${fam}${part}`)
      return dark ? s.dark : s.light
    }
    return [
      ...[...UNIFY_CHIP_SIGNALS].reverse().map(([fam]) => ({ bg: sig(fam, ' Accent'), border: sig(fam, ' Highlight'), fg: sig(fam, '') })),
      { bg: grayStop(25), border: grayStop(100), fg: grayStop(600) },
      { bg: a('accent'), border: a('highlight'), fg: a('primary') },
    ]
  }
  const OK_CHIP_PREFIXES = ['brand', 'neutral', 'positive', 'warning', 'critical'] as const

  // ── section 3 data ──
  const [focusSlug, setFocusSlug] = useState(slugOf(themes.find(t => t.name === 'FIS')!))
  const focus = resolved.find(x => x.slug === focusSlug)!
  // every custom property the engine mints for this one seed (ramp × 2 modes,
  // ctas, inks, on-*, neutral, illustration, shifted signals)
  const focusVarCount = useMemo(() => {
    const css = brandCss(focus.slug, shortName(focus.t), focus.r, null, '', 'default', 'apca')
    return new Set(css.match(/--[a-z0-9-]+(?=:)/g)).size
  }, [focus])
  const semanticTotal = Object.values(UNIFY_SEMANTIC_CENSUS).reduce((a, b) => a + b, 0)

  return (
    <div data-brand="chrome" data-theme={dark ? 'dark' : 'light'}
      style={{ fontFamily: FONT_STACK, minHeight: '100vh', background: 'var(--surface-base)' }}>
      <style>{neutralCss('[data-brand="chrome"]', 0, 'pure')}</style>
      <style>{allCss}</style>

      <header style={{
        position: 'sticky', top: 0, zIndex: 40, display: 'flex', alignItems: 'center', gap: 16,
        height: 52, padding: '0 28px', background: 'var(--surface-lift)', boxShadow: '0 1px 2px rgba(17,18,22,0.06)',
      }}>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--fg-default)' }}>Unify × OKChroma</span>
        <span style={{ fontSize: 12.5, color: 'var(--fg-subtle)' }}>the seven live themes, hand-picked vs generated</span>
        <span style={{ flex: 1 }} />
        <button onClick={() => setDark(d => !d)} style={{
          display: 'inline-flex', alignItems: 'center', height: 32, padding: '0 15px', borderRadius: 999,
          border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
          background: 'var(--surface-sink)', color: 'var(--fg-default)',
        }}>{dark ? '☀ Light' : '☾ Dark'}</button>
      </header>

      <main style={{ maxWidth: 1060, margin: '0 auto', padding: '40px 28px 90px', display: 'flex', flexDirection: 'column', gap: 56 }}>
        <div>
          <h1 style={{ margin: '0 0 10px', fontSize: 30, fontWeight: 800, color: 'var(--fg-default)', letterSpacing: '-0.01em' }}>
            Same seven brands, two ways of making primitives
          </h1>
          <p style={{ margin: 0, maxWidth: 760, fontSize: 15, lineHeight: 1.6, color: 'var(--fg-subtle)' }}>
            Left side of every comparison: Unify's variables exactly as exported from the Figma file — the seven brand
            themes, each aliasing three stops of a hand-maintained ramp. Right side: the same seven brand colors fed as
            single seeds into the OKChroma engine, resolved live on this page. Both sides are measured with the same
            instrument: apparent L* — the engine's Nayatani-based lightness, which corrects for the
            Helmholtz&ndash;Kohlrausch effect (a saturated color reads brighter than its luminance says).
            Raw lightness would understate how loud the chromatic stops actually look.
          </p>
        </div>

        {/* ── 01 · DRIFT ── */}
        <Section n={1} title="The same role lands somewhere different in every theme"
          lede={'Unify’s "Brand Primary" aliases stop 500 in one theme, 600 in the next, 800 in another — one role carrying both the brand’s identity AND every structural job, so its weight changes per brand and everything built on it moves too. The engine separates the two: identity lives in exactly one role (the cta, gated to stay usable), and every structural role is placed by law — flat across brands, in both modes.'}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 18 }}>
            <div style={CARD}>
              <div style={CARD_TITLE}>Unify — Brand Primary · Highlight · Accent, as aliased</div>
              <span style={MODE_TAG}>Light mode</span>
              <DotChart mode="light" xLabels={labels} series={[
                { label: 'Primary', dots: unifyRole('primary', 'light') },
                { label: 'Highlight', dots: unifyRole('highlight', 'light') },
                { label: 'Accent', dots: unifyRole('accent', 'light') },
              ]} />
              <span style={MODE_TAG}>Dark mode</span>
              <DotChart mode="dark" xLabels={labels} series={[
                { label: 'Primary', dots: unifyRole('primary', 'dark') },
                { label: 'Highlight', dots: unifyRole('highlight', 'dark') },
                { label: 'Accent', dots: unifyRole('accent', 'dark') },
              ]} />
              <div style={STAT}>
                Primary spans <b>{spread(uPrimL).toFixed(0)} L*</b> across themes in light mode
                and <b>{spread(uPrimD).toFixed(0)} L*</b> in dark; even the tint roles wander —
                Highlight spans <b>{spread(unifyRole('highlight', 'light')).toFixed(0)} L*</b> light
                and <b>{spread(unifyRole('highlight', 'dark')).toFixed(0)} L*</b> dark. The same semantic
                token is a different weight in every brand.
              </div>
            </div>
            <div style={CARD}>
              <div style={CARD_TITLE}>OKChroma — the roles Brand Primary forks into, from the same seeds</div>
              <span style={MODE_TAG}>Light mode</span>
              <DotChart mode="light" xLabels={labels} series={[
                { label: 'cta', dots: okRole(okCta, 'light') },
                { label: 'ink-9', dots: okRole(okStop(10), 'light') },
                { label: 'ink-9', dots: okRole(okStop(9), 'light') },
                { label: 'wash-6', dots: okRole(okStop(6), 'light') },
                { label: 'paper-3', dots: okRole(okStop(3), 'light') },
              ]} />
              <span style={MODE_TAG}>Dark mode</span>
              <DotChart mode="dark" xLabels={labels} series={[
                { label: 'cta', dots: okRole(okCta, 'dark') },
                { label: 'ink-9', dots: okRole(okStop(10), 'dark') },
                { label: 'ink-9', dots: okRole(okStop(9), 'dark') },
                { label: 'wash-6', dots: okRole(okStop(6), 'dark') },
                { label: 'paper-3', dots: okRole(okStop(3), 'dark') },
              ]} />
              <div style={STAT}>
                Unify's one Primary is doing the button job, the text job, and the emphasis job at once — here it
                forks: <b>cta</b> (the fill), <b>ink-9</b> (the text register,
                spans {spread(okRole(okStop(10), 'light')).toFixed(0)} L* light), <b>ink-9</b> (the emphasis
                fill, {spread(okRole(okStop(9), 'light')).toFixed(0)} L*), with the tint registers wash-6 / paper-3
                (Unify's Highlight and Accent analogs) flat within ~<b>1 L*</b>. The cta is the one role that varies — it carries the brand's identity on
                purpose, inside a gated register (the lifted Orange dot is the engine moving that cta out of the
                red signal's register, not a hand-pick). The small wobble that remains in ink-9 is principled:
                the text register solves a contrast requirement, and contrast is pure luminance — equal contrast
                across hues can't also be equal apparent lightness once chroma differs.
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 18 }}>
            <div style={CARD}>
              <div style={CARD_TITLE}>Unify — the hand-maintained ramps themselves</div>
              <p style={CARD_SUB}>
                Each line is one client family across its picked stops. The curves cross, bow differently, and most
                families simply never had 100 / 300 / 400 picked — the gaps are real holes in the file.
              </p>
              <span style={MODE_TAG}>Light mode</span>
              <RampChart mode="light" lines={unifyRampLines('light')} xTicks={unifyTicks} />
              <span style={MODE_TAG}>Dark mode</span>
              <RampChart mode="dark" lines={unifyRampLines('dark')} xTicks={unifyTicks} />
            </div>
            <div style={CARD}>
              <div style={CARD_TITLE}>OKChroma — generated scales, stops 1–11</div>
              <p style={CARD_SUB}>
                Same seeds, full scales. One curve shape repeated per brand, in both modes, with no stop left unpicked —
                the shape is the system, not a per-family judgment call.
              </p>
              <span style={MODE_TAG}>Light mode</span>
              <RampChart mode="light" lines={okRampLines('light')} xTicks={okTicks} />
              <span style={MODE_TAG}>Dark mode</span>
              <RampChart mode="dark" lines={okRampLines('dark')} xTicks={okTicks} />
            </div>
          </div>
        </Section>

        {/* ── 02 · CHIP ROWS ── */}
        <Section n={2} title="One chip recipe, seven themes"
          lede={'Unify builds an indicator chip from the three brand aliases — Accent fill, Highlight border, Primary text — and each theme re-rolls all three. So the brand chip lands at a different weight in every theme while the signal chips beside it never move; where a brand is green or orange, its chip and a signal chip read as neighbors. OKChroma builds the same chip from structural stops — paper-3 fill, wash-6 border, ink-9 text — so the chip is the same component in every theme, and only its hue belongs to the brand.'}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 18 }}>
            <div style={CARD}>
              <div style={CARD_TITLE}>Unify — Accent · Highlight · Primary, re-aliased per theme</div>
              <div style={{
                background: dark ? PANEL.dark.bg : PANEL.light.bg, borderRadius: 10, padding: '14px 16px',
                display: 'flex', flexDirection: 'column', gap: 10,
              }}>
                {themes.map(t => (
                  <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ marginRight: 'auto', paddingRight: 8, fontSize: 11, fontWeight: 600, color: dark ? PANEL.dark.ink : PANEL.light.ink }}>{shortName(t)}</span>
                    {unifyChipRow(t).map((c, i) => <Chip key={i} {...c} />)}
                  </div>
                ))}
              </div>
              <div style={STAT}>
                The chip's text is Brand Primary — it spans <b>{spread(uPrimL).toFixed(0)} L*</b> light
                / <b>{spread(uPrimD).toFixed(0)} L*</b> dark across themes, and the fill and border jump with it.
                And in the Green 500 row, the brand chip is — to a reader — the success chip.
              </div>
            </div>
            <div style={CARD}>
              <div style={CARD_TITLE}>OKChroma — paper-3 · wash-6 · ink-9, from the same seeds</div>
              <div style={{
                background: dark ? PANEL.dark.bg : PANEL.light.bg, borderRadius: 10, padding: '14px 16px',
                display: 'flex', flexDirection: 'column', gap: 10,
              }}>
                {resolved.map(({ t, slug }) => (
                  <div key={slug} data-brand={slug} data-theme={dark ? 'dark' : 'light'}
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {OK_CHIP_PREFIXES.map(p => (
                      <Chip key={p} bg={`var(--${p}-paper-3)`} border={`var(--${p}-wash-6)`} fg={`var(--${p}-ink-9)`} />
                    ))}
                    <span style={{ marginLeft: 'auto', paddingLeft: 8, fontSize: 11, fontWeight: 600, color: dark ? PANEL.dark.ink : PANEL.light.ink }}>{shortName(t)}</span>
                  </div>
                ))}
              </div>
              <div style={STAT}>
                Same recipe from structural stops: the text register spans <b>{spread(okRole(okStop(10), 'light')).toFixed(0)} L*</b> light
                / <b>{spread(okRole(okStop(10), 'dark')).toFixed(0)} L*</b> dark and the tint fill under <b>1 L*</b> —
                the chip reads as one component everywhere, and the hue alone says which brand you're in.
              </div>
            </div>
          </div>
        </Section>

        {/* ── 03 · COVERAGE ── */}
        <Section n={3} title="Three tokens per brand, next to a full system per brand"
          lede={'A Unify brand theme is three aliases: Primary, Primary Highlight, Primary Accent. The full ramps exist and are maintained by hand in two modes — but the semantic layer only ever surfaces three stops of them, so there is nothing left to build brand-tinted surfaces, states, or text tiers from. One seed into the engine emits the whole role set.'}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fg-default)' }}>Theme</span>
            <select value={focusSlug} onChange={e => setFocusSlug(e.target.value)} style={{
              height: 34, padding: '0 12px', borderRadius: 8, border: '1px solid var(--border-default)',
              background: 'var(--surface-lift)', color: 'var(--fg-default)', fontFamily: 'inherit', fontSize: 12.5,
            }}>
              {resolved.map(({ t, slug }) => <option key={slug} value={slug}>{shortName(t)}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 18 }}>
            <div style={CARD}>
              <div style={CARD_TITLE}>Unify — the same layout, colored with everything {shortName(focus.t)} has</div>
              <div style={{ background: dark ? UNIFY_GRAY[0].dark : UNIFY_GRAY[0].light, borderRadius: 10, padding: '18px 18px' }}>
                <UnifyMirrorCard t={focus.t} dark={dark} />
              </div>
              <div style={STAT}>
                Three cells of the ladder are brandable — Accent, Highlight, Primary. Every other stop is forced onto
                the shared Gray ramp: all text, all papers, the input chrome. Nothing is vetted for the focus-ring
                job, so the ring falls to Primary and re-rolls its weight per theme. The palette collection carries{' '}
                <b>{semanticTotal} semantic color tokens</b>; <b>3</b> are brand, and behind them{' '}
                {Object.keys(UNIFY_RAMPS).length} client families are hand-picked in two modes to feed those three.
                The button's ink is hardcoded (white in light, black in dark), which is why every new brand color must
                be manually vetted to survive it.
              </div>
            </div>
            <div data-brand={focus.slug} data-theme={dark ? 'dark' : 'light'} style={CARD}>
              <div style={CARD_TITLE}>OKChroma — everything one seed emits for {shortName(focus.t)}</div>
              <div style={{ background: 'var(--paper-1)', borderRadius: 10, padding: '18px 18px' }}>
                <TokenCards prefix="brand" kind="brand" insetControls />
              </div>
              <div style={STAT}>
                <b>{focusVarCount} variables</b> generated from the single seed {focus.t.primary.hex.toUpperCase()} —
                the full scale in both modes, cta and cta-ink trios with states, on-text picked per fill, a
                brand-tinted neutral, illustration slots, and per-brand signal resolutions. No stop hand-picked, none missing.
              </div>
            </div>
          </div>
        </Section>
      </main>
    </div>
  )
}
