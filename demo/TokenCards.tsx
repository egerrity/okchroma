import React from 'react'
import { AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react'

// Stage 3 — the per-ramp token display, as a realistic SHOWCASE card. It renders
// with the LIVE primitives, so it themes (light/dark) and picks the right on-fill
// polarity for free. The card it sits in is `.ct-colorblock` (already on the elevated
// --surface-mid plane), so it lifts off the page consistently in both modes.
//
// Roles demonstrated in context, not as abstract chips:
//   pen     → the heading + body copy ("pen family" called out in pencil-47)
//   highlighter    → the inset surface(s)
//   cta     → the full-round pill button (brand/alt/neutral) OR, on signals,
//             the ALERT callout (alerts use cta in signals; the pill is hidden)
//   scale   → the ladder, stop labels above the chips, with paper/highlighter/crayon/pen brackets
//
// The universal paper-0/pen-100 anchors are NOT shown here — they're one shared
// white/black pair at the system level, not a per-ramp token.
export type RampKind = 'brand' | 'neutral' | 'signal'

// Alert icon per signal, chosen by what the signal MEANS (its color identity).
const SIGNAL_ICON: Record<string, typeof AlertCircle> = {
  critical: AlertCircle,
  warning: AlertTriangle,
  positive: CheckCircle,
  info: Info,
}

// ─── CTA deconfliction row ────────────────────────────────────────────────────
// Every cta side by side — the one spot where a colliding pair is visible in a
// single glance: the brand cta pair, the secondary cta pair (when one exists),
// the quiet neutral cta, and all four signal ctas (critical / warning /
// positive / info). Each family renders its cta | cta-hover | cta-pressed trio as one seamed
// pill in on-cta text, with the text-style cta (the pen stops read as rest/hover/pressed
// — cta-ink until its 2026-08-12 deletion) right
// beneath it. Reads the live vars, so the per-brand signal overrides the
// resolved theme carries show up here automatically; names the theme shifted
// off-canonical get a "shifted" tag. The cta-border border is always SET (so layout never
// shifts) but not always visible: it carries this family's rung of the alpha ladder when the
// gate fires — |Lc| of the cta against the page under 15 — and the transparent variable
// otherwise. The outline secondary overrides it unconditionally, where the ring IS the component.
export function CtaRow({ hasSecondary, shifted = [] }: { hasSecondary: boolean; shifted?: string[] }) {
  const families: Array<{ prefix: string; label: string }> = [
    { prefix: 'brand', label: 'brand' },
    ...(hasSecondary ? [{ prefix: 'secondary', label: 'secondary' }] : []),
    { prefix: 'neutral', label: 'neutral' },
    { prefix: 'critical', label: 'critical' },
    { prefix: 'warning', label: 'warning' },
    { prefix: 'positive', label: 'positive' },
    { prefix: 'info', label: 'info' },
  ]
  const cell = (prefix: string, tok: 'stamp-fill' | 'stamp-fill-hover' | 'stamp-fill-pressed') => (
    <div title={`--${prefix}-${tok}`} style={{
      flex: tok === 'stamp-fill' ? 1.6 : 1, height: 44, boxSizing: 'border-box',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: `var(--${prefix}-${tok})`, color: `var(--${prefix}-stamp-on)`,
      fontSize: 13, fontWeight: 600,
      border: `1.5px solid var(--${prefix}-stamp-edge)`,
    }}>Aa</div>
  )
  // the TEXT-style cta (the pen stops — the action color's 4.5 text rendition) rendered
  // on the card, so its rest / hover / pressed sit right under the fill cta trio
  const textCell = (prefix: string, tok: 'pencil-47' | 'pen-58' | 'pen-70') => (
    <div title={`--${prefix}-${tok}`} style={{
      flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 800, color: `var(--${prefix}-${tok})`,
    }}>Aa</div>
  )
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      {families.map(f => (
        <div key={f.prefix} style={{ flex: '1 1 104px', maxWidth: 220 }}>
          <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden' }}>
            {cell(f.prefix, 'stamp-fill')}
            {cell(f.prefix, 'stamp-fill-hover')}
            {cell(f.prefix, 'stamp-fill-pressed')}
          </div>
          <div style={{ display: 'flex', marginTop: 7 }}>
            {textCell(f.prefix, 'pencil-47')}
            {textCell(f.prefix, 'pen-58')}
            {textCell(f.prefix, 'pen-70')}
          </div>
          <div style={{ marginTop: 6, fontSize: 11, textAlign: 'center', color: 'var(--fg-default)', fontWeight: 600 }}>
            {f.label}
            {shifted.includes(f.prefix) && <span style={{ fontWeight: 400, color: 'var(--info-fg)' }}> · shifted</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

export function TokenCards({ prefix, kind, outlineCta, insetControls }: { prefix: string; kind: RampKind; outlineCta?: boolean; insetControls?: boolean }) {
  const v = (t: string) => `var(--${prefix}-${t})`
  const isSignal = kind === 'signal'
  const [ctaHover, setCtaHover] = React.useState(false)     // cta → cta-hover on hover
  const [ctaPressed, setCtaPressed] = React.useState(false)  // → cta-pressed while held
  const [linkState, setLinkState] = React.useState<'rest' | 'hover' | 'pressed'>('rest')
  const [invLinkState, setInvLinkState] = React.useState<'rest' | 'hover' | 'pressed'>('rest')
  // Only brand & secondary preserve an exact input hex (identity); neutral and
  // signals are generated and carry none.
  const hasIdentity = prefix === 'brand' || prefix === 'secondary'

  // The scale ladder. Each chip's label is the token name minus the band word —
  // visibility number plus conformance letters ("89", "53aa") — derived from `tok`
  // so a rename can't desynchronise label and chip. Labels sit ABOVE the chips
  // (owner 2026-08-11): the suffixed names outgrew the chip, and the swatches
  // themselves stay clean.
  const scale = [
    'paper-1', 'paper-3', 'paper-5', 'highlighter-8', 'highlighter-11', 'highlighter-15', 'highlighter-20',
    'crayon-26', 'pencil-47', 'pen-58', 'pen-70',
  ]
  const stopLabel = (tok: string): string => tok.split('-').slice(1).join('')
  const groups = [
    { label: 'paper', span: 3 }, { label: 'highlighter', span: 4 },
    { label: 'crayon', span: 1 }, { label: 'pencil', span: 1 }, { label: 'pen', span: 2 },
  ]
  // the brackets below share the scale's grid, so their spans have to add up to it
  if (groups.reduce((a, g) => a + g.span, 0) !== scale.length)
    throw new Error(`TokenCards: group spans (${groups.reduce((a, g) => a + g.span, 0)}) != scale length (${scale.length})`)

  const Icon = SIGNAL_ICON[prefix] ?? AlertCircle

  const boxLabel: React.CSSProperties = { fontSize: 12, fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.03em' }
  const boxBody: React.CSSProperties = { fontSize: 14, lineHeight: 1.4 }
  const box: React.CSSProperties = { flex: 1, minWidth: 200, borderRadius: 10, padding: '13px 15px' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* identity — the exact input hex, preserved (brand & secondary only) */}
      {hasIdentity && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
          <span style={{ width: 24, height: 24, borderRadius: 6, flexShrink: 0, background: v('identity') }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: v('pencil-47') }}>identity</span>
        </div>
      )}

      {/* pen in context — heading + body, "pen family" called out in pencil-47 */}
      <div style={{ fontSize: 24, fontWeight: 700, color: v('pen-70'), lineHeight: 1.15, marginBottom: 8 }}>Aa Heading</div>
      <p style={{ fontSize: 15, lineHeight: 1.5, color: v('pen-70'), margin: '0 0 16px' }}>
        The <span style={{ color: v('pencil-47') }}>pen family</span> is designed to contrast with the paper and highlighter stops and is perfect for text. It can also be used as an inverted fill.
      </p>

      {/* cta in context — the pill (hidden on signals, where cta lives in the alert).
          Hover swaps stamp-fill → stamp-fill-hover; holding the button shows stamp-fill-pressed. Beside it,
          the TEXT-STYLE cta (the pen stops as states — the action color's 4.5 text
          rendition, a text button; never underlined, never a hyperlink — links are the
          SYSTEM --link). */}
      {!isSignal && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
          <button
            onMouseEnter={() => setCtaHover(true)}
            onMouseLeave={() => { setCtaHover(false); setCtaPressed(false) }}
            onMouseDown={() => setCtaPressed(true)}
            onMouseUp={() => setCtaPressed(false)}
            style={{
              width: 184, boxSizing: 'border-box', textAlign: 'center',
              background: ctaPressed ? v('stamp-fill-pressed') : ctaHover ? v('stamp-fill-hover') : v('stamp-fill'), color: v('stamp-on'),
              // filled buttons carry NO stroke (the label identifies the button — WCAG 1.4.11
              // doesn't require a boundary); only the OUTLINE style keeps its ring, where the
              // boundary IS the component. Transparent border keeps layout identical.
              border: `1.5px solid ${outlineCta ? v('stamp-edge') : 'transparent'}`,
              borderRadius: 999, padding: '12px 28px', fontSize: 15, fontWeight: 600, fontFamily: 'inherit',
              cursor: 'pointer',
            }}>{ctaPressed ? 'stamp-fill-pressed held' : ctaHover ? 'stamp-fill-hover' : 'stamp button'}</button>
          <button
            onMouseEnter={() => setLinkState('hover')}
            onMouseLeave={() => setLinkState('rest')}
            onMouseDown={() => setLinkState('pressed')}
            onMouseUp={() => setLinkState('hover')}
            title={`--${prefix}-${linkState === 'pressed' ? 'pen-70' : linkState === 'hover' ? 'pen-58' : 'pencil-47'}`}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 15, fontWeight: 600, padding: '12px 10px',
              color: linkState === 'pressed' ? v('pen-70') : linkState === 'hover' ? v('pen-58') : v('pencil-47'),
            }}>Text action</button>
        </div>
      )}

      {/* in context — the highlighter inset, plus the signal alert (signals), the chip +
          focus-ring controls box (insetControls), or the emphasis inset (default) */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
        <div style={{ ...box, background: v('highlighter-8') }}>
          <div style={{ ...boxLabel, color: v('pencil-47') }}>inset &middot; highlighter</div>
          <div style={{ ...boxBody, color: v('pen-70') }}>Body copy in pen on a highlighter fill.</div>
        </div>
        {isSignal ? (
          <div style={{ ...box, background: v('stamp-fill'), display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ flexShrink: 0, marginTop: 1, lineHeight: 0, color: v('stamp-on') }}><Icon size={18} color={v('stamp-on')} /></span>
            <div>
              <div style={{ ...boxLabel, color: v('stamp-on') }}>alert &middot; cta</div>
              <div style={{ ...boxBody, color: v('stamp-on') }}>Loud message in stamp-on text.</div>
            </div>
          </div>
        ) : insetControls ? (
          /* the controls box (owner 2026-07-28, unify-compare section 3): chip +
             focused input, so the stops' JOBS read directly — chip = paper-5 fill ·
             highlighter-15 border · pencil-47 text; the ring is crayon-26 with a highlighter-11 halo
             (the collision demo's held-focus idiom) */
          <div style={{ ...box, background: v('paper-3') }}>
            <div style={{ ...boxLabel, color: v('pencil-47') }}>chip &middot; focus ring</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 6,
                fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap',
                background: v('paper-5'), color: v('pencil-47'), border: `1px solid ${v('highlighter-15')}`,
              }}>chip</span>
              <input readOnly value="Focused input" style={{
                flex: 1, minWidth: 0, boxSizing: 'border-box', padding: '7px 11px', borderRadius: 8,
                fontSize: 13, fontFamily: 'inherit', background: v('paper-1'), color: v('pen-70'),
                border: `1.5px solid ${v('crayon-26')}`, boxShadow: `0 0 0 3px ${v('highlighter-11')}`, outline: 'none',
              }} />
            </div>
          </div>
        ) : (
          <div style={{ ...box, background: v('pencil-47') }}>
            <div style={{ ...boxLabel, color: 'var(--paper-0)' }}>inset &middot; emphasis</div>
            {/* the emphasis inset is the INVERTED fill: pencil-47 (the emphasis fill since the
                2026-07-29 collapse) carrying --paper-0, over a pen-70 panel with paper-1 text.
                The link on it is the INVERSE trio (owner round 2026-08-19) — the link seed
                re-solved for exactly this ground; the system --link is illegible here. */}
            <div style={{ background: v('pen-70'), borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ ...boxBody, color: v('paper-1') }}>
                Emphasis copy in paper-1 text with an{' '}
                <a
                  href="#"
                  onClick={e => e.preventDefault()}
                  onMouseEnter={() => setInvLinkState('hover')}
                  onMouseLeave={() => setInvLinkState('rest')}
                  onMouseDown={() => setInvLinkState('pressed')}
                  onMouseUp={() => setInvLinkState('hover')}
                  title={`--link-inverse${invLinkState === 'pressed' ? '-pressed' : invLinkState === 'hover' ? '-hover' : ''}`}
                  style={{
                    color: invLinkState === 'pressed' ? 'var(--fg-link-inverse-pressed)' : invLinkState === 'hover' ? 'var(--fg-link-inverse-hover)' : 'var(--fg-link-inverse)',
                    textDecoration: 'underline', textUnderlineOffset: 2,
                  }}>inverse link</a>.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* the scale — stop labels above the ladder, clean chips below */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${scale.length}, minmax(0, 1fr))`, gap: 5, marginBottom: 4 }}>
        {scale.map(tok => (
          <div key={tok} style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--fg-default)' }}>{stopLabel(tok)}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${scale.length}, minmax(0, 1fr))`, gap: 5 }}>
        {scale.map(tok => (
          <div key={tok} title={tok} style={{ height: 34, borderRadius: 6, background: v(tok) }} />
        ))}
      </div>
      {/* Bracketed group labels — each bracket spans its stops so the
          paper/highlighter/crayon/pen grouping reads unambiguously.
          The column count is DERIVED from the scale, never written down: it was a
          hardcoded 11 and the 2026-07-29 collapse took the scale to 10, which left every
          bracket a column short and drifting left of the stops it labelled. A stop change
          must not be able to desynchronise these two rows again. */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${scale.length}, 1fr)`, gap: 5, marginTop: 6 }}>
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
