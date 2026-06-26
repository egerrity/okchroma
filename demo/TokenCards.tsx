import React from 'react'

// Stage 3 — the per-ramp token display, redesigned as a compact SCALE VIGNETTE
// (replaces the dense 6×6 card grid). Every ramp now carries the SAME token
// inventory (cssRender emits the brand-kind body for brand/secondary/neutral AND
// signals), so one strip fits them all. It renders with the LIVE primitives, so it
// themes (light/dark) and picks the right on-fill polarity for free.
//
// The card it sits in is `.ct-colorblock` — already an elevated --surface-raised
// surface (white in light, paper-2 in dark) — so the strip lifts off the page
// consistently in both modes, and the text inks read as "Aa" right on that surface.
//
// Layout, top → bottom:
//   1. the scale ladder — one contiguous light→dark ramp of filled chips, framed by
//      the universal anchors paper-0 (#fff) and ink-13 (#000). The cta/highlight
//      rungs (9/10) are pulled OUT of the ladder (they're pinned roles, not scale
//      steps), so the numbers read …8, 11, 12, 13.
//   2. the roles in use — the emphasis fills that carry an on-color (highlight-9,
//      cta-1) each shown with "Aa" in their on-* text, and the text inks (ink-11/12)
//      shown as "Aa" on the card surface. Signals omit cta (no "error button").
export type RampKind = 'brand' | 'neutral' | 'signal'

export function TokenCards({ prefix, kind }: { prefix: string; kind: RampKind }) {
  const v = (t: string) => `var(--${prefix}-${t})`
  // paper-0 / ink-13 are UNIVERSAL anchors (emitted once per brand scope, not
  // ramp-prefixed). Fallbacks keep the strip correct even out of brand context.
  const PAPER0 = 'var(--paper-0, #ffffff)'
  const INK13 = 'var(--ink-13, #000000)'

  // signals have no cta (their emphasis IS the highlight) — the "no error button" rule.
  const showCta = kind !== 'signal'

  // The continuous lightness ladder: anchors bookend the surface scale + text inks.
  // 9/10 (cta/highlight) are deliberately absent — they surface below as roles.
  const ladder: Array<{ n: string; c: string; anchor?: boolean }> = [
    { n: '0', c: PAPER0, anchor: true },
    { n: '1', c: v('paper-1') },
    { n: '2', c: v('paper-2') },
    { n: '3', c: v('wash-3') },
    { n: '4', c: v('wash-4') },
    { n: '5', c: v('wash-5') },
    { n: '6', c: v('accent-6') },
    { n: '7', c: v('accent-7') },
    { n: '8', c: v('accent-8') },
    { n: '11', c: v('ink-11') },
    { n: '12', c: v('ink-12') },
    { n: '13', c: INK13, anchor: true },
  ]
  const leftAnchor = ladder[0]
  const rightAnchor = ladder[ladder.length - 1]
  const body = ladder.slice(1, -1) // paper-1 … ink-12 — the contiguous ramp

  const emphasis: Array<{ label: string; fill: string; on: string }> = [
    { label: 'highlight-9', fill: v('highlight-9'), on: v('on-highlight') },
    ...(showCta ? [{ label: 'cta-1', fill: v('cta-1'), on: v('on-cta') }] : []),
  ]

  const cap: React.CSSProperties = { fontSize: 10, fontWeight: 600, color: 'var(--fg-subtle)', lineHeight: 1.3 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* 1 — the scale ladder. The two universal anchors (paper-0 #fff ceiling,
          ink-13 #000 floor) are pulled out as bookend caps with a small gap, so
          they read as the absolute white/black reference — not as part of the
          gradient. This keeps the strip a clean ramp in BOTH modes: in dark the
          surface scale inverts (paper-1 dark → ink-12 light), and the bookends
          frame it instead of colliding with it. */}
      <div>
        <div style={{ display: 'flex', alignItems: 'stretch' }}>
          {/* left cap — paper-0 */}
          <div style={{ flex: 0.8, height: 38, marginRight: 6, background: leftAnchor.c, borderRadius: 7, border: '1px solid var(--border-subtle)' }} />
          {/* body — the contiguous surface→ink ramp */}
          <div style={{ flex: body.length, display: 'flex', borderRadius: 7, overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
            {body.map(s => (
              <div key={s.n} title={s.n} style={{ flex: 1, height: 38, background: s.c, boxShadow: 'inset -1px 0 0 rgba(128,128,128,0.12)' }} />
            ))}
          </div>
          {/* right cap — ink-13 */}
          <div style={{ flex: 0.8, height: 38, marginLeft: 6, background: rightAnchor.c, borderRadius: 7, border: '1px solid var(--border-subtle)' }} />
        </div>
        {/* labels — mirror the same flex+margin structure so they line up */}
        <div style={{ display: 'flex', marginTop: 4 }}>
          <div style={{ flex: 0.8, marginRight: 6, textAlign: 'center', ...cap, color: 'var(--fg-default)' }}>{leftAnchor.n}</div>
          <div style={{ flex: body.length, display: 'flex' }}>
            {body.map(s => (
              <div key={s.n} style={{ flex: 1, textAlign: 'center', ...cap }}>{s.n}</div>
            ))}
          </div>
          <div style={{ flex: 0.8, marginLeft: 6, textAlign: 'center', ...cap, color: 'var(--fg-default)' }}>{rightAnchor.n}</div>
        </div>
      </div>

      {/* 2 — the roles in use: on-color fills + text inks */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
        {emphasis.map(e => (
          <div key={e.label} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{
              minWidth: 68, height: 40, borderRadius: 8, background: e.fill,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: e.on, fontSize: 16, fontWeight: 700, padding: '0 14px',
            }}>Aa</div>
            <div style={cap}>{e.label}</div>
          </div>
        ))}

        {/* text inks — shown as "Aa" directly on the card surface (their actual job) */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, marginLeft: 'auto' }}>
          {[['ink-11', v('ink-11')], ['ink-12', v('ink-12')]].map(([label, color]) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1, color }}>Aa</div>
              <div style={cap}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
