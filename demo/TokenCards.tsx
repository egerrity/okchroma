import React from 'react'
import { AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react'

// Stage 3 — the per-ramp token display, as a realistic SHOWCASE card. It renders
// with the LIVE primitives, so it themes (light/dark) and picks the right on-fill
// polarity for free. The card it sits in is `.ct-colorblock` (already an elevated
// --surface-raised surface), so it lifts off the page consistently in both modes.
//
// Roles demonstrated in context, not as abstract chips:
//   ink     → the heading + body copy ("ink family" called out in ink-10)
//   wash    → the inset surface(s)
//   cta     → the full-round pill button (brand/secondary/neutral) OR, on signals,
//             the ALERT callout (alerts use cta in signals; the pill is hidden)
//   scale   → the numbered 1–12 ladder with paper/wash/highlight/ink labels
//
// The universal paper-0/ink-12 anchors are NOT shown here — they're one shared
// white/black pair at the system level, not a per-ramp token.
export type RampKind = 'brand' | 'neutral' | 'signal'

// Alert icon per signal, chosen by what the signal MEANS (its color identity).
const SIGNAL_ICON: Record<string, typeof AlertCircle> = {
  red: AlertCircle,
  yellow: AlertTriangle,
  green: CheckCircle,
  'blue': Info,
}

// ─── CTA deconfliction row ────────────────────────────────────────────────────
// Every cta side by side — the one spot where a colliding pair is visible in a
// single glance: the brand cta pair, the secondary cta pair (when one exists),
// the quiet neutral cta, and all four signal ctas (red / yellow / green /
// blue). Each family renders its cta | cta-hover | cta-pressed trio as one seamed
// pill in on-cta text. Reads the live vars, so the per-brand signal overrides the
// resolved theme carries show up here automatically; names the theme shifted
// off-canonical get a "shifted" tag. The cta-border border is unconditional —
// it's transparent everywhere except the outline secondary, where the ring IS
// the component.
export function CtaRow({ hasSecondary, shifted = [] }: { hasSecondary: boolean; shifted?: string[] }) {
  const families: Array<{ prefix: string; label: string }> = [
    { prefix: 'brand', label: 'brand' },
    ...(hasSecondary ? [{ prefix: 'secondary', label: 'secondary' }] : []),
    { prefix: 'neutral', label: 'neutral' },
    { prefix: 'red', label: 'red' },
    { prefix: 'yellow', label: 'yellow' },
    { prefix: 'green', label: 'green' },
    { prefix: 'blue', label: 'blue' },
  ]
  const cell = (prefix: string, tok: 'cta' | 'cta-hover' | 'cta-pressed') => (
    <div title={`--${prefix}-${tok}`} style={{
      flex: tok === 'cta' ? 1.6 : 1, height: 44, boxSizing: 'border-box',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: `var(--${prefix}-${tok})`, color: `var(--${prefix}-on-cta)`,
      fontSize: 13, fontWeight: 600,
      border: `1.5px solid var(--${prefix}-cta-border)`,
    }}>Aa</div>
  )
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      {families.map(f => (
        <div key={f.prefix} style={{ flex: '1 1 104px', maxWidth: 220 }}>
          <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden' }}>
            {cell(f.prefix, 'cta')}
            {cell(f.prefix, 'cta-hover')}
            {cell(f.prefix, 'cta-pressed')}
          </div>
          <div style={{ marginTop: 5, fontSize: 11, textAlign: 'center', color: 'var(--fg-default)', fontWeight: 600 }}>
            {f.label}
            {shifted.includes(f.prefix) && <span style={{ fontWeight: 400, color: 'var(--info-fg)' }}> · shifted</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

export function TokenCards({ prefix, kind, outlineCta }: { prefix: string; kind: RampKind; outlineCta?: boolean }) {
  const v = (t: string) => `var(--${prefix}-${t})`
  const isSignal = kind === 'signal'
  const [ctaHover, setCtaHover] = React.useState(false)     // cta → cta-hover on hover
  const [ctaPressed, setCtaPressed] = React.useState(false)  // → cta-pressed while held
  const [linkState, setLinkState] = React.useState<'rest' | 'hover' | 'pressed'>('rest')
  // Only brand & secondary preserve an exact input hex (identity); neutral and
  // signals are generated and carry none.
  const hasIdentity = prefix === 'brand' || prefix === 'secondary'

  // The 1–12 scale. Number text stays legible in BOTH modes by leaning on tokens
  // that invert with the mode: ink-11 (high-contrast text) on the surface rungs,
  // on-highlight (computed legible) on the highlight rungs, paper-1 (inverse of ink)
  // on the ink rungs.
  const scale: Array<{ n: number; tok: string; fg: string }> = [
    { n: 1, tok: 'paper-1', fg: v('ink-11') },
    { n: 2, tok: 'paper-2', fg: v('ink-11') },
    { n: 3, tok: 'wash-3', fg: v('ink-11') },
    { n: 4, tok: 'wash-4', fg: v('ink-11') },
    { n: 5, tok: 'wash-5', fg: v('ink-11') },
    { n: 6, tok: 'wash-6', fg: v('ink-11') },
    { n: 7, tok: 'wash-7', fg: v('ink-11') },
    { n: 8, tok: 'highlight-8', fg: v('ink-11') },
    { n: 9, tok: 'highlight-9', fg: v('on-highlight') },
    { n: 10, tok: 'ink-10', fg: v('paper-1') },
    { n: 11, tok: 'ink-11', fg: v('paper-1') },
  ]
  const groups = [
    { label: 'paper', span: 2 }, { label: 'wash', span: 5 },
    { label: 'highlight', span: 2 }, { label: 'ink', span: 2 },
  ]

  const Icon = SIGNAL_ICON[prefix] ?? AlertCircle

  const boxLabel: React.CSSProperties = { fontSize: 12, fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.03em' }
  const boxBody: React.CSSProperties = { fontSize: 14, lineHeight: 1.4 }
  const box: React.CSSProperties = { flex: 1, minWidth: 200, borderRadius: 10, padding: '13px 15px' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* identity — the exact input hex, preserved (brand & secondary only) */}
      {hasIdentity && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
          <span style={{ width: 24, height: 24, borderRadius: 6, flexShrink: 0, background: v('identity'), border: '1px solid var(--border-subtle)' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: v('ink-10') }}>identity</span>
        </div>
      )}

      {/* ink in context — heading + body, "ink family" called out in ink-10 */}
      <div style={{ fontSize: 24, fontWeight: 700, color: v('ink-11'), lineHeight: 1.15, marginBottom: 8 }}>Aa Heading</div>
      <p style={{ fontSize: 15, lineHeight: 1.5, color: v('ink-11'), margin: '0 0 16px' }}>
        The <span style={{ color: v('ink-10') }}>ink family</span> is designed to contrast with the paper and wash stops and is perfect for text. It can also be used as an inverted fill.
      </p>

      {/* cta in context — the pill (hidden on signals, where cta lives in the alert).
          Hover swaps cta → cta-hover; holding the button shows cta-pressed. Beside it,
          the TEXT-STYLE cta (cta-ink — the action color's 4.5 text rendition, a text
          button; never underlined, never a hyperlink — links are the SYSTEM --link). */}
      {!isSignal && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
          <button
            onMouseEnter={() => setCtaHover(true)}
            onMouseLeave={() => { setCtaHover(false); setCtaPressed(false) }}
            onMouseDown={() => setCtaPressed(true)}
            onMouseUp={() => setCtaPressed(false)}
            style={{
              width: 184, boxSizing: 'border-box', textAlign: 'center',
              background: ctaPressed ? v('cta-pressed') : ctaHover ? v('cta-hover') : v('cta'), color: v('on-cta'),
              // filled buttons carry NO stroke (the label identifies the button — WCAG 1.4.11
              // doesn't require a boundary); only the OUTLINE style keeps its ring, where the
              // boundary IS the component. Transparent border keeps layout identical.
              border: `1.5px solid ${outlineCta ? v('cta-border') : 'transparent'}`,
              borderRadius: 999, padding: '12px 28px', fontSize: 15, fontWeight: 600, fontFamily: 'inherit',
              cursor: 'pointer',
            }}>{ctaPressed ? 'cta-pressed held' : ctaHover ? 'cta-hover' : 'cta button'}</button>
          <button
            onMouseEnter={() => setLinkState('hover')}
            onMouseLeave={() => setLinkState('rest')}
            onMouseDown={() => setLinkState('pressed')}
            onMouseUp={() => setLinkState('hover')}
            title={`--${prefix}-cta-ink${linkState === 'rest' ? '' : `-${linkState}`}`}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 15, fontWeight: 600, padding: '12px 10px',
              color: linkState === 'pressed' ? v('cta-ink-pressed') : linkState === 'hover' ? v('cta-ink-hover') : v('cta-ink'),
            }}>Text action</button>
        </div>
      )}

      {/* in context — the wash inset, plus the highlight inset OR the signal alert */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
        <div style={{ ...box, background: v('wash-4') }}>
          <div style={{ ...boxLabel, color: v('ink-10') }}>inset &middot; wash</div>
          <div style={{ ...boxBody, color: v('ink-11') }}>Body copy in ink on a wash fill.</div>
        </div>
        {isSignal ? (
          <div style={{ ...box, background: v('cta'), display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ flexShrink: 0, marginTop: 1, lineHeight: 0, color: v('on-cta') }}><Icon size={18} color={v('on-cta')} /></span>
            <div>
              <div style={{ ...boxLabel, color: v('on-cta') }}>alert &middot; cta</div>
              <div style={{ ...boxBody, color: v('on-cta') }}>Loud message in on-cta text.</div>
            </div>
          </div>
        ) : (
          <div style={{ ...box, background: v('highlight-9') }}>
            <div style={{ ...boxLabel, color: v('on-highlight') }}>inset &middot; highlight</div>
            {/* the emphasis inset is the INVERTED fill (owner 2026-07-09): ink-11 with paper-1 text —
                highlight-10 deleted */}
            <div style={{ background: v('ink-11'), borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ ...boxBody, color: v('paper-1') }}>Emphasis copy in paper-1 text.</div>
            </div>
          </div>
        )}
      </div>

      {/* the scale — numbered 1–12 ladder with group labels */}
      <div style={{ display: 'flex', gap: 5 }}>
        {scale.map(s => (
          <div key={s.n} title={s.tok} style={{
            flex: 1, height: 34, borderRadius: 6, background: v(s.tok), color: s.fg,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600,
            boxShadow: 'inset 0 0 0 1px rgba(128,128,128,0.15)',
          }}>{s.n}</div>
        ))}
      </div>
      {/* Bracketed group labels — each bracket spans its stops so the
          paper/wash/highlight/ink grouping reads unambiguously. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(11, 1fr)', gap: 5, marginTop: 6 }}>
        {groups.map(g => (
          <div key={g.label} style={{ gridColumn: `span ${g.span}`, display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 0 }}>
            <div style={{ width: '100%', height: 6, borderLeft: '1px solid var(--border-default)', borderRight: '1px solid var(--border-default)', borderBottom: '1px solid var(--border-default)', borderRadius: '0 0 5px 5px' }} />
            <span style={{ marginTop: 5, fontSize: 12, color: 'var(--fg-subtle)' }}>{g.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
