import React from 'react'
import { Sparkles } from 'lucide-react'

// Stage 3 — the per-ramp token display (replaces the flat RampRow). Each card
// DEMONSTRATES its register in context using the LIVE primitives, so it themes
// (light/dark) and picks the right on-fill polarity for free. Reads
// var(--<prefix>-<token>); prefix is the ramp's primitive family
// ('brand' | 'secondary' | 'neutral' | 'error' | 'warning' | ...). Layout +
// copy mirror the owner's Figma (node 15:624): a dense 6×6 grid, every card
// filled with the ramp's paper-1 / bordered wash-4, accent + highlight as the
// emphasis heroes.
//
// Per-ramp inventory → which cards appear and how they tile:
//   brand / secondary → all (incl. cta + identity)
//   neutral           → no identity (wash + cta grow to fill its column)
//   signal            → no cta, no identity (a signal's highlight IS its alert)
export type RampKind = 'brand' | 'neutral' | 'signal'

type Place = { c: string; r: string }
type CardKey = 'paper' | 'wash' | 'accent' | 'cta' | 'highlight' | 'ink' | 'inkAlt' | 'identity'

// brand & neutral render the full card grid; each layout tiles to a flat 6-row
// bottom edge (every column sums to 6). Signals use the compact strip (below).
const LAYOUTS: Record<'brand' | 'neutral', Array<{ k: CardKey; c: string; r: string }>> = {
  brand: [
    { k: 'paper', c: '1 / span 2', r: '1 / span 2' },
    { k: 'ink', c: '1 / span 2', r: '3 / span 2' },
    { k: 'inkAlt', c: '1 / span 2', r: '5 / span 2' },
    { k: 'wash', c: '3 / span 2', r: '1 / span 2' },
    { k: 'cta', c: '3 / span 2', r: '3 / span 3' },
    { k: 'identity', c: '3 / span 2', r: '6 / span 1' },
    { k: 'accent', c: '5 / span 2', r: '1 / span 3' },
    { k: 'highlight', c: '5 / span 2', r: '4 / span 3' },
  ],
  neutral: [
    { k: 'paper', c: '1 / span 2', r: '1 / span 2' },
    { k: 'ink', c: '1 / span 2', r: '3 / span 2' },
    { k: 'inkAlt', c: '1 / span 2', r: '5 / span 2' },
    { k: 'wash', c: '3 / span 2', r: '1 / span 3' },
    { k: 'cta', c: '3 / span 2', r: '4 / span 3' },
    { k: 'accent', c: '5 / span 2', r: '1 / span 3' },
    { k: 'highlight', c: '5 / span 2', r: '4 / span 3' },
  ],
}

// The surface scale (1–8), uniform across every ramp.
const SURFACE = ['paper-1', 'paper-2', 'wash-3', 'wash-4', 'wash-5', 'accent-6', 'accent-7', 'accent-8']

export function TokenCards({ prefix, kind }: { prefix: string; kind: RampKind }) {
  const v = (t: string) => `var(--${prefix}-${t})`

  // Signals are reference (and repeat ×4), so they collapse to a single strip:
  // the highlight fill pair (with its on-highlight polarity shown by "Aa"), the
  // 1–8 surface scale, and the ink / ink-alt text — each swatch named.
  if (kind === 'signal') {
    // border = light surface swatch needs a hairline; onText = show "Aa" in the
    // on-highlight color to demonstrate the fill's text polarity.
    const swatch = (bg: string, label: string, opts?: { border?: boolean; onText?: string }) => (
      <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <div style={{ width: 30, height: 30, borderRadius: 6, background: bg, border: opts?.border ? '1px solid var(--neutral-wash-4)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: opts?.onText }}>{opts?.onText ? 'Aa' : ''}</div>
        <div style={{ fontSize: 9, color: 'var(--fg-subtle)', whiteSpace: 'nowrap' }}>{label}</div>
      </div>
    )
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
        {swatch(v('highlight-1'), 'highlight-1', { onText: v('on-highlight') })}
        {swatch(v('highlight-2'), 'highlight-2')}
        {SURFACE.map(t => swatch(v(t), t, { border: true }))}
        <div style={{ display: 'flex', gap: 10, marginLeft: 8, fontSize: 14, fontWeight: 600 }}>
          <span style={{ color: v('ink') }}>ink</span>
          <span style={{ color: v('ink-alt') }}>ink-alt</span>
        </div>
      </div>
    )
  }

  const owner = prefix === 'brand' ? 'brand-primary' : prefix

  // shared chrome
  // Cards sit on a NEUTRAL surface so the ramp's own colors (shown inside) read
  // against a constant background — except `paper` (filled with the ramp's
  // paper-1, since that IS what it demonstrates) and `highlight` (filled).
  const base = (p: Place, extra?: React.CSSProperties): React.CSSProperties => ({
    gridColumn: p.c, gridRow: p.r, minHeight: 0, overflow: 'hidden',
    display: 'flex', flexDirection: 'column', gap: 8, padding: 14, borderRadius: 8,
    background: 'var(--neutral-paper-1)', border: '1px solid var(--neutral-wash-4)',
    ...extra,
  })
  const titleS: React.CSSProperties = { fontSize: 14, fontWeight: 700, margin: 0, lineHeight: 1.4 }
  const bodyS: React.CSSProperties = { fontSize: 12, lineHeight: 1.45, margin: 0 }
  // inner "white field" used by accent rows + the cta tray (themes via neutral semantics)
  const field: React.CSSProperties = {
    flex: '1 1 0', minHeight: 0, display: 'flex', alignItems: 'center', borderRadius: 8,
    padding: '0 12px', background: 'var(--surface-raised)',
  }

  const cards: Record<CardKey, (p: Place) => React.ReactNode> = {
    paper: (p) => (
      <div key="paper" style={base(p, { background: v('paper-1'), border: `1px solid ${v('wash-4')}` })}>
        <div style={{ ...titleS, color: v('ink') }}>paper</div>
        <div style={{ ...bodyS, color: v('ink') }}>This is a card filled with {owner}'s <b>paper-1</b></div>
        <div style={{ ...field, flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', background: v('paper-2'), border: `1px solid ${v('wash-4')}` }}>
          <div style={{ ...bodyS, fontSize: 11, color: v('ink') }}>This is a card filled with {owner}'s <b>paper-2</b></div>
        </div>
      </div>
    ),
    wash: (p) => (
      <div key="wash" style={base(p)}>
        <div style={{ ...titleS, color: v('ink-alt') }}>wash</div>
        <div style={{ ...field, flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', background: v('wash-5') }}>
          <div style={{ ...bodyS, fontSize: 11, color: v('ink') }}>This inset is <b>wash-5</b></div>
        </div>
        <div style={{ display: 'flex', gap: 22, justifyContent: 'center' }}>
          {['wash-3', 'wash-4', 'wash-5'].map(tok => (
            <div key={tok} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: v(tok), display: 'flex', alignItems: 'center', justifyContent: 'center', color: v('ink-alt') }}>
                <Sparkles size={13} />
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--fg-default)' }}>{tok}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    accent: (p) => (
      <div key="accent" style={base(p, { border: `2px solid ${v('accent-6')}` })}>
        <div style={{ ...titleS, color: v('ink') }}>accent</div>
        <div style={{ ...bodyS, color: v('ink') }}>The stroke on this card is {owner}'s accent-6</div>
        {['accent-6', 'accent-7', 'accent-8'].map(tok => (
          <div key={tok} style={{ ...field, border: `2px solid ${v(tok)}`, fontSize: 12, color: 'var(--fg-default)' }}>{tok}</div>
        ))}
      </div>
    ),
    cta: (p) => (
      <div key="cta" style={base(p, { alignItems: 'stretch' })}>
        <div style={{ ...titleS, color: v('ink-alt') }}>cta</div>
        <div style={{ ...field, border: '2px solid var(--border-subtle)', justifyContent: 'center' }}>
          {[['cta-1', 'cta-1', true], ['cta-2', 'cta-2', false]].map(([tok, label, overlap]) => (
            <div key={label as string} style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: overlap ? -20 : 0, zIndex: overlap ? 2 : 1 }}>
              <div style={{ width: '100%', height: 32, borderRadius: 100, background: v(tok as string), color: v('on-cta'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, overflow: 'hidden', whiteSpace: 'nowrap' }}>on-cta text</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: v('ink'), marginTop: 3 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    highlight: (p) => (
      <div key="highlight" style={base(p, { background: v('highlight-1'), border: 'none' })}>
        <div style={{ ...titleS, color: v('on-highlight') }}>highlight</div>
        <div style={{ ...bodyS, color: v('on-highlight') }}>This card is <b>highlight-1</b> with <b>on-highlight</b> text</div>
        <div style={{ ...field, background: v('highlight-2') }}>
          <div style={{ ...bodyS, fontSize: 11, color: v('on-highlight') }}>This inset is filled with {owner}'s <b>highlight-2</b></div>
        </div>
      </div>
    ),
    ink: (p) => (
      <div key="ink" style={base(p, { justifyContent: 'center' })}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 18, height: 18, borderRadius: 3, background: v('ink') }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: v('ink') }}>ink</span>
        </div>
        <div style={{ ...bodyS, color: v('ink') }}>This is high-contrast text in <b>ink.</b> Ink is an accessible, dark shade that is high-contrast on surfaces.</div>
      </div>
    ),
    inkAlt: (p) => (
      <div key="inkAlt" style={base(p, { justifyContent: 'center' })}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 18, height: 18, borderRadius: 3, background: v('ink-alt') }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: v('ink-alt') }}>ink-alt</span>
        </div>
        <div style={{ ...bodyS, color: v('ink-alt') }}>This is text in <b>ink-alt.</b> An accessible, vivid color that always clears 4.5:1 on surfaces.</div>
      </div>
    ),
    identity: (p) => (
      <div key="identity" style={base(p, { flexDirection: 'row', alignItems: 'center', gap: 10 })}>
        <div style={{ width: 32, height: 32, borderRadius: 4, flexShrink: 0, background: v('identity'), border: '1px solid var(--border-subtle)' }} />
        <div style={{ ...bodyS, fontSize: 11, color: v('ink') }}><b>identity:</b> the brand's hex color preserved</div>
      </div>
    ),
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gridTemplateRows: 'repeat(6, 64px)', gap: 10 }}>
      {LAYOUTS[kind].map(({ k, c, r }) => cards[k]({ c, r }))}
    </div>
  )
}
