import React from 'react'
import { AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react'

// Stage 3 — the per-ramp token display, as a realistic SHOWCASE card. It renders
// with the LIVE primitives, so it themes (light/dark) and picks the right on-fill
// polarity for free. The card it sits in is `.ct-colorblock` (already on the elevated
// --surface-mid plane), so it lifts off the page consistently in both modes.
//
// Roles demonstrated in context, not as abstract chips:
//   ink     → the heading + body copy ("ink family" called out in ink-53)
//   wash    → the inset surface(s)
//   cta     → the full-round pill button (brand/alt/neutral) OR, on signals,
//             the ALERT callout (alerts use cta in signals; the pill is hidden)
//   scale   → the ladder, stop labels above the chips, with paper/wash/mark/ink brackets
//
// The universal paper-100/ink-0 anchors are NOT shown here — they're one shared
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
// pill in on-cta text, with the text-style cta (the ink stops read as rest/hover/pressed
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
  const cell = (prefix: string, tok: 'solid-fill' | 'solid-fill-hover' | 'solid-fill-pressed') => (
    <div title={`--${prefix}-${tok}`} style={{
      flex: tok === 'solid-fill' ? 1.6 : 1, height: 44, boxSizing: 'border-box',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: `var(--${prefix}-${tok})`, color: `var(--${prefix}-solid-on)`,
      fontSize: 13, fontWeight: 600,
      border: `1.5px solid var(--${prefix}-solid-edge)`,
    }}>Aa</div>
  )
  // the TEXT-style cta (the ink stops — the action color's 4.5 text rendition) rendered
  // on the card, so its rest / hover / pressed sit right under the fill cta trio
  const inkCell = (prefix: string, tok: 'ink-53' | 'ink-42' | 'ink-30') => (
    <div title={`--${prefix}-${tok}`} style={{
      flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 800, color: `var(--${prefix}-${tok})`,
    }}>Aa</div>
  )
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      {families.map(f => (
        <div key={f.prefix} style={{ flex: '1 1 104px', maxWidth: 220 }}>
          <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden' }}>
            {cell(f.prefix, 'solid-fill')}
            {cell(f.prefix, 'solid-fill-hover')}
            {cell(f.prefix, 'solid-fill-pressed')}
          </div>
          <div style={{ display: 'flex', marginTop: 7 }}>
            {inkCell(f.prefix, 'ink-53')}
            {inkCell(f.prefix, 'ink-42')}
            {inkCell(f.prefix, 'ink-30')}
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
    'paper-99', 'paper-97', 'paper-95', 'wash-92', 'wash-89', 'wash-85', 'wash-80',
    'mark-74', 'ink-53', 'ink-42', 'ink-30',
  ]
  const stopLabel = (tok: string): string => tok.split('-').slice(1).join('')
  const groups = [
    { label: 'paper', span: 3 }, { label: 'wash', span: 4 },
    { label: 'mark', span: 1 }, { label: 'ink', span: 3 },
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
          <span style={{ fontSize: 13, fontWeight: 600, color: v('ink-53') }}>identity</span>
        </div>
      )}

      {/* ink in context — heading + body, "ink family" called out in ink-53 */}
      <div style={{ fontSize: 24, fontWeight: 700, color: v('ink-30'), lineHeight: 1.15, marginBottom: 8 }}>Aa Heading</div>
      <p style={{ fontSize: 15, lineHeight: 1.5, color: v('ink-30'), margin: '0 0 16px' }}>
        The <span style={{ color: v('ink-53') }}>ink family</span> is designed to contrast with the paper and wash stops and is perfect for text. It can also be used as an inverted fill.
      </p>

      {/* cta in context — the pill (hidden on signals, where cta lives in the alert).
          Hover swaps solid-fill → solid-fill-hover; holding the button shows solid-fill-pressed. Beside it,
          the TEXT-STYLE cta (the ink stops as states — the action color's 4.5 text
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
              background: ctaPressed ? v('solid-fill-pressed') : ctaHover ? v('solid-fill-hover') : v('solid-fill'), color: v('solid-on'),
              // filled buttons carry NO stroke (the label identifies the button — WCAG 1.4.11
              // doesn't require a boundary); only the OUTLINE style keeps its ring, where the
              // boundary IS the component. Transparent border keeps layout identical.
              border: `1.5px solid ${outlineCta ? v('solid-edge') : 'transparent'}`,
              borderRadius: 999, padding: '12px 28px', fontSize: 15, fontWeight: 600, fontFamily: 'inherit',
              cursor: 'pointer',
            }}>{ctaPressed ? 'solid-fill-pressed held' : ctaHover ? 'solid-fill-hover' : 'solid button'}</button>
          <button
            onMouseEnter={() => setLinkState('hover')}
            onMouseLeave={() => setLinkState('rest')}
            onMouseDown={() => setLinkState('pressed')}
            onMouseUp={() => setLinkState('hover')}
            title={`--${prefix}-${linkState === 'pressed' ? 'ink-30' : linkState === 'hover' ? 'ink-42' : 'ink-53'}`}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 15, fontWeight: 600, padding: '12px 10px',
              color: linkState === 'pressed' ? v('ink-30') : linkState === 'hover' ? v('ink-42') : v('ink-53'),
            }}>Text action</button>
        </div>
      )}

      {/* in context — the wash inset, plus the signal alert (signals), the chip +
          focus-ring controls box (insetControls), or the highlight inset (default) */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
        <div style={{ ...box, background: v('wash-92') }}>
          <div style={{ ...boxLabel, color: v('ink-53') }}>inset &middot; wash</div>
          <div style={{ ...boxBody, color: v('ink-30') }}>Body copy in ink on a wash fill.</div>
        </div>
        {isSignal ? (
          <div style={{ ...box, background: v('solid-fill'), display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ flexShrink: 0, marginTop: 1, lineHeight: 0, color: v('solid-on') }}><Icon size={18} color={v('solid-on')} /></span>
            <div>
              <div style={{ ...boxLabel, color: v('solid-on') }}>alert &middot; cta</div>
              <div style={{ ...boxBody, color: v('solid-on') }}>Loud message in solid-on text.</div>
            </div>
          </div>
        ) : insetControls ? (
          /* the controls box (owner 2026-07-28, unify-compare section 3): chip +
             focused input, so the stops' JOBS read directly — chip = paper-95 fill ·
             wash-85 border · ink-53 text; the ring is mark-74 with a wash-89 halo
             (the collision demo's held-focus idiom) */
          <div style={{ ...box, background: v('paper-97') }}>
            <div style={{ ...boxLabel, color: v('ink-53') }}>chip &middot; focus ring</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 6,
                fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap',
                background: v('paper-95'), color: v('ink-53'), border: `1px solid ${v('wash-85')}`,
              }}>chip</span>
              <input readOnly value="Focused input" style={{
                flex: 1, minWidth: 0, boxSizing: 'border-box', padding: '7px 11px', borderRadius: 8,
                fontSize: 13, fontFamily: 'inherit', background: v('paper-99'), color: v('ink-30'),
                border: `1.5px solid ${v('mark-74')}`, boxShadow: `0 0 0 3px ${v('wash-89')}`, outline: 'none',
              }} />
            </div>
          </div>
        ) : (
          <div style={{ ...box, background: v('ink-53') }}>
            <div style={{ ...boxLabel, color: 'var(--paper-100)' }}>inset &middot; emphasis</div>
            {/* the emphasis inset is the INVERTED fill: ink-53 (the emphasis fill since the
                2026-07-29 collapse) carrying --paper-100, over an ink-30 panel with paper-99 text.
                The link on it is the INVERSE trio (owner round 2026-08-19) — the link seed
                re-solved for exactly this ground; the system --link is illegible here. */}
            <div style={{ background: v('ink-30'), borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ ...boxBody, color: v('paper-99') }}>
                Emphasis copy in paper-99 text with an{' '}
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
          paper/wash/mark/ink grouping reads unambiguously.
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
