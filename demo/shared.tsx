import React from 'react'
import { resolveBrand, type ResolvedBrand } from '../src/engine/resolve'
import { annotationNote, stopHex } from '../src/engine/cssRender'
import { HERO_ILLO } from './heroIllo'

export type RungMode = 'recommended' | 'exact'
export type AccentMode = 'default' | 'accented' | 'inverse' | 'accented-inverse'

export const FONT_STACK = "'Inter', -apple-system, system-ui, sans-serif"

// Secondary display modes are a 2×2: which family fills the PRIMARY
// register (emphasis fills, accent text, links) × which fills the SUBTLE
// register (tinted surfaces). Overrides reference PRIMITIVES (--brand-alt-ink),
// never the other role's var — role-to-role references would cycle.
//   default          primary: brand   subtle: brand   (no override)
//   accented         primary: brand   subtle: accent
//   inverse          primary: accent  subtle: accent
//   accented-inverse primary: accent  subtle: brand
// The "accent" Family is emitted as the `secondary` primitive prefix (the role
// was renamed in the token rename); prim() maps Family → primitive prefix.
// Stops are the emitted token names: scale paper/wash, the mark-74 ring, the
// cta/cta-hover/cta-pressed fill trio, ink-53/42-aa/30-aaa text (doubling as the
// text-style cta — the cta-ink aliases died 2026-08-12),
// on-cta on-fill text. (on-highlight died with highlight-9, owner 2026-07-29 — the
// on-emphasis text is --paper-100 in the semantic layer now.)
type Family = 'brand' | 'accent'
function accentModeCss(mode: AccentMode, primary: Family, subtle: Family): string {
  const other = (f: Family): Family => (f === 'brand' ? 'accent' : 'brand')
  const prim = (f: Family): string => (f === 'brand' ? 'brand' : 'secondary')
  const PRIMARY_ROLES: Array<[string, string]> = [
    ['fg', 'ink-30'], ['fg-hover', 'ink-53'], ['fg-alt', 'ink-53'], ['fg-alt-hover', 'ink-30'], ['fg-on-emphasis', 'solid-on'],
    ['bg-emphasis', 'solid-fill'], ['bg-emphasis-hover', 'solid-fill-hover'], ['bg-emphasis-pressed', 'solid-fill-pressed'],
    ['border-default', 'wash-85'], ['border-default-hover', 'mark-74'],
    ['border-emphasis', 'solid-fill'], ['border-emphasis-hover', 'solid-fill-hover'],
  ]
  const SUBTLE_ROLES: Array<[string, string]> = [
    ['bg-faint', 'paper-97'], ['bg-subtle', 'wash-89'], ['bg-subtle-hover', 'wash-85'],
    ['border-subtle', 'wash-92'], ['border-subtle-hover', 'wash-89'],
  ]
  const lines: string[] = [`[data-accent-mode="${mode}"][data-brand] {`]
  for (const [suffix, tok] of PRIMARY_ROLES) {
    lines.push(`  --brand-${suffix}: var(--${prim(primary)}-${tok});`)
    lines.push(`  --accent-${suffix}: var(--${prim(other(primary))}-${tok});`)
  }
  for (const [suffix, tok] of SUBTLE_ROLES) {
    lines.push(`  --brand-${suffix}: var(--${prim(subtle)}-${tok});`)
    lines.push(`  --accent-${suffix}: var(--${prim(other(subtle))}-${tok});`)
  }
  // links are SYSTEM-level (owner 2026-07-16: one link per theme — the accent flip must
  // not re-point them): --fg-link rides --link from semantic.css, no per-mode override
  lines.push(`}`)
  if (subtle !== primary) {
    lines.push(`[data-accent-mode="${mode}"] .u-btn-subtle { color: var(--${prim(subtle)}-ink-30); }`)
    lines.push(`[data-accent-mode="${mode}"] .u-btn-ghost:hover { color: var(--${prim(subtle)}-ink-30); }`)
  }
  return lines.join('\n')
}

const ACCENT_MODE_CSS = [
  accentModeCss('accented', 'brand', 'accent'),
  accentModeCss('inverse', 'accent', 'accent'),
  accentModeCss('accented-inverse', 'accent', 'brand'),
].join('\n')

export const COMPONENT_CSS = `
.u-btn {
  padding: 8px 20px; border-radius: 999px; border: 1.5px solid transparent;
  cursor: pointer; font-size: 14px; font-weight: 500; font-family: inherit;
  display: inline-flex; align-items: center; gap: 6px;
}
/* solid-edge rides EVERY cta button, not just the secondary (owner 2026-07-31). Until this
   round only .u-btn-secondary wired the token, so a firing brand or neutral emitted a stroke
   that nothing drew — the engine and the demo disagreed about what shipped. The value is an
   alias to system/alpha/* (transparent when the gate does not fire), so the border stays
   unconditional and layout never shifts. */
.u-btn-primary { background: var(--brand-bg-emphasis); color: var(--brand-fg-on-emphasis); border-color: var(--brand-solid-edge); }
.u-btn-primary:hover { background: var(--brand-bg-emphasis-hover); }
.u-btn-primary:active { background: var(--brand-bg-emphasis-pressed); }
.u-btn-subtle { background: var(--brand-bg-subtle); color: var(--brand-fg); }
.u-btn-subtle:hover { background: var(--brand-bg-subtle-hover); }
/* the LOW-HIERARCHY button: the neutral's quiet scale-fed cta (stop 4/5). The
   secondary-showcase slots fall back to this when no secondary exists — a
   subtle slot reads neutral until a secondary claims it, never brand-again. */
.u-btn-neutral { background: var(--neutral-solid-fill); color: var(--neutral-solid-on); border-color: var(--neutral-solid-edge); }
.u-btn-neutral:hover { background: var(--neutral-solid-fill-hover); }
.u-btn-neutral:active { background: var(--neutral-solid-fill-pressed); }
/* the SECONDARY fill trio (--brand-alt-solid-fill/-hover/-pressed + solid-on), shown beside the
   brand cta wherever that is showcased. cta-border carries the gated stroke at this
   family's rung, transparent when the gate does not fire, and the outline style's own
   unconditional ring (where the ring IS the component). Always set, so layout never shifts. */
.u-btn-secondary { background: var(--brand-alt-solid-fill); color: var(--brand-alt-solid-on); border-color: var(--brand-alt-solid-edge); }
.u-btn-secondary:hover { background: var(--brand-alt-solid-fill-hover); }
.u-btn-secondary:active { background: var(--brand-alt-solid-fill-pressed); }
.u-btn-ghost { background: transparent; color: var(--brand-fg); }
.u-btn-ghost:hover { background: var(--brand-bg-subtle); }
/* Universal destructive rule (designer decision): destructive BUTTONS never
   encode intent via solid error fill alone — outline treatment + required
   icon, for every brand, every mode. Solid error fill (--critical-bg-emphasis)
   stays reserved for system-voiced non-button surfaces: error states, badges,
   toasts, alerts. .u-btn-destructive is kept as an alias so any legacy markup
   degrades to the same treatment instead of a solid fill. */
.u-btn-destructive,
.u-btn-destructive-outline {
  background: var(--surface-mid);
  color: var(--critical-fg-alt);
  border-color: var(--critical-border-default);
}
.u-btn-destructive:hover,
.u-btn-destructive-outline:hover {
  background: var(--critical-bg-subtle);
  color: var(--critical-fg);
  border-color: var(--critical-border-default-hover);
}
.u-link { color: var(--fg-link); text-decoration: underline; }
.u-link:hover { color: var(--fg-link-hover); }
.u-link:active { color: var(--fg-link-pressed); }
/* Stop 8 IS the ramp's focus-ring role — never the OS default accent */
[data-brand] :is(input, select, textarea, button, a):focus-visible {
  outline: 2px solid var(--brand-mark-74);
  outline-offset: 1px;
}
/* The app-chrome scope is brandless — it carries only the generated neutral
   (App.tsx neutralCss), so --brand-mark-74 doesn't exist there and the
   rule above would go invalid at computed-value time (no ring at all on the
   footer controls). Alias the ring source to the chrome's own neutral
   mark-74 — stop 8 of whichever ramp owns the scope. */
[data-brand="chrome"] {
  --brand-mark-74: var(--neutral-mark-74);
}
/* Elevation — demo-layer shadow recipes composing the --shadow-* transparencies
   (tokens/semantic.css; mirrors the plugin's system/alpha/shadow rows). The
   engine owns color, the demo owns depth. Ladder = the owner's 2026-07-27 Figma
   card-hierarchy set: −1 sink (stroke, no shadow — see the metric tiles) ·
   +1 lift (--elev-card) · +2 pop (--elev-pop, the hero) · +3 float
   (--elev-float — geometry pending its own styling round, still literal).
   Dark falls out of the tokens: --shadow-* carries the heavier dark alphas, so
   there is no dark override for card/pop. */
[data-brand] {
  --elev-card: 0 4px 8px var(--shadow-04), 0 0 1px var(--shadow-04);
  --elev-pop: 0 4px 10px -2px var(--shadow-08), 0 20px 25px -2px var(--shadow-04);
  --elev-float: 0 6px 16px -5px rgba(17,18,22,0.10), 0 16px 44px -8px rgba(17,18,22,0.16);
}
[data-brand][data-theme="dark"] {
  --elev-float: 0 6px 16px -5px rgba(0,0,0,0.48), 0 16px 44px -8px rgba(0,0,0,0.58);
}
${ACCENT_MODE_CSS}
`

// ─── Small shared controls ───────────────────────────────────────────────────

export function Segmented<T extends string>({ value, onChange, options }: {
  value: T; onChange: (v: T) => void; options: Array<[T, string]>
}) {
  return (
    <span style={{ display: 'inline-flex', border: '1px solid var(--border-subtle)', borderRadius: 6, overflow: 'hidden' }}>
      {options.map(([v, label]) => (
        <button key={v} onClick={() => onChange(v)} style={{
          padding: '5px 10px', fontSize: 12, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
          background: value === v ? 'var(--brand-bg-subtle)' : 'var(--surface-mid)',
          color: 'var(--fg-default)', fontWeight: value === v ? 600 : 400,
        }}>{label}</button>
      ))}
    </span>
  )
}

export function rungDescription(rung: RungMode, r: ResolvedBrand): string {
  if (rung === 'exact') {
    return `Exact — the brand hex ships untouched, no engine adjustments. Destructive buttons are always outline + icon regardless of mode.`
  }
  const note = annotationNote(r)
  return note ? `Recommended —${note}` : `Recommended — no adjustments needed; this is the exact brand color.`
}

export function normalizeHex(v: string): string | null {
  const m = v.trim().replace(/^#/, '')
  return /^[0-9a-fA-F]{6}$/.test(m) ? `#${m.toUpperCase()}` : null
}

// ─── RYB (artist's wheel) rotation for suggested secondaries ────────────────
// Designers expect purple↔yellow, blue↔orange, red↔green. Piecewise-linear
// map between RGB-HSL hue and RYB wheel position; rotation happens in RYB,
// saturation and lightness carry over.
const RYB_ANCHORS: Array<[number, number]> = [
  [0, 0], [30, 60], [60, 120], [120, 180], [180, 210], [240, 240], [285, 300], [330, 330], [360, 360],
]
function wheelMap(h: number, from: 0 | 1): number {
  const to = from === 0 ? 1 : 0
  for (let i = 0; i < RYB_ANCHORS.length - 1; i++) {
    const x1 = RYB_ANCHORS[i][from], x2 = RYB_ANCHORS[i + 1][from]
    if (h >= x1 && h <= x2) {
      const t = (h - x1) / (x2 - x1 || 1)
      return RYB_ANCHORS[i][to] + t * (RYB_ANCHORS[i + 1][to] - RYB_ANCHORS[i][to])
    }
  }
  return h
}
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const m = hex.replace('#', '')
  const r = parseInt(m.slice(0, 2), 16) / 255, g = parseInt(m.slice(2, 4), 16) / 255, b = parseInt(m.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return { h: h * 60, s, l }
}
function hslToHex(h: number, s: number, l: number): string {
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const a = s * Math.min(l, 1 - l)
    const v = l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)))
    return Math.round(v * 255).toString(16).padStart(2, '0').toUpperCase()
  }
  return `#${f(0)}${f(8)}${f(4)}`
}
export function rybRotate(hex: string, deg: number): string {
  const { h, s, l } = hexToHsl(hex)
  const ryb = (wheelMap(h, 0) + deg + 360) % 360
  return hslToHex(wheelMap(ryb, 1), s, l)
}

// ─── Showcase (the component-gallery page body) ──────────────────────────────

export function Showcase(props: {
  slug: string
  name: string
  hex: string
  secondaryHex?: string
  dark: boolean
  onToggleDark: () => void
  overrideCss: string
  accentMode: AccentMode
  header: React.ReactNode
  controls: React.ReactNode
  annotation: string
  readout?: ResolvedBrand
  // bare: render only the gallery sections — no toolbar/controls/annotation
  // rows (used inside the Custom theme page's "Semantic preview" subtab)
  bare?: boolean
}) {
  const { slug, name, hex, dark } = props
  return (
    <div
      data-brand={slug}
      data-theme={dark ? 'dark' : 'light'}
      data-accent-mode={props.accentMode}
      style={{ minHeight: props.bare ? undefined : '100vh', background: 'var(--surface-low)', color: 'var(--fg-default)', fontFamily: FONT_STACK }}
    >
      {props.overrideCss && <style>{props.overrideCss}</style>}

      {!props.bare && <>
        {/* single toolbar row: palette picker + locked fields + controls */}
        <header style={{ position: 'sticky', top: 0, zIndex: 35, background: 'var(--surface-mid)', borderBottom: '1px solid var(--border-subtle)', padding: '12px 24px', display: 'flex', alignItems: 'flex-end', gap: '12px 18px', flexWrap: 'wrap' }}>
          {props.header}
          {props.controls}
        </header>
        <div style={{ padding: '8px 24px', fontSize: 12, color: 'var(--fg-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
          {props.annotation}
        </div>
        {props.readout && <Readout r={props.readout} />}
      </>}

      <main style={{ maxWidth: 900, margin: '0 auto', padding: props.bare ? '8px 0 32px' : '32px 24px', display: 'flex', flexDirection: 'column', gap: 40 }}>

        <section>
          <h1 style={{ margin: 0, fontSize: 40, fontWeight: 700, color: 'var(--brand-fg-alt)' }}>
            Your brand, systematized
          </h1>
          <h2 style={{ margin: '8px 0 0', fontSize: 24, fontWeight: 600, color: 'var(--brand-fg)' }}>
            Primitives, semantics, and dark mode — from a single hex
          </h2>
        </section>

        {/* All scales together — brand, accent, neutral stacked tight */}
        <section>
          <SectionLabel>Scales</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <ScaleStrip label={`Brand (${hex})`} prefix="brand" />
            {/* the accent Family emits under the `secondary` primitive prefix
                (see prim() above) — there is no --accent-* primitive */}
            {props.secondaryHex && <ScaleStrip label={`Accent (${props.secondaryHex})`} prefix="secondary" />}
            <ScaleStrip label="Neutral" prefix="neutral" />
          </div>
        </section>

        <section>
          <SectionLabel>Buttons</SectionLabel>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="u-btn u-btn-primary">Primary</button>
            {props.secondaryHex && <button className="u-btn u-btn-secondary">Secondary</button>}
            <button className="u-btn u-btn-subtle">Subtle</button>
            <button className="u-btn u-btn-ghost">Ghost</button>
          </div>
        </section>

        <section>
          <SectionLabel>Destructive in context</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            <div style={ctxCard}>
              <div style={ctxCardTitle}>Delete account</div>
              <div style={ctxCardBody}>
                Destructive never fills — outline + icon even as the primary action, for every brand.
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 12 }}>
                <button className="u-btn u-btn-ghost">Back</button>
                <button className="u-btn u-btn-destructive-outline">
                  <BanIcon /> Delete
                </button>
              </div>
            </div>
            <div style={ctxCard}>
              <div style={ctxCardTitle}>Edit payment</div>
              <div style={ctxCardBody}>In a button group, destructive renders as an outline — never a fill beside a brand button.</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 12 }}>
                <button className="u-btn u-btn-destructive-outline"><BanIcon /> Cancel</button>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="u-btn u-btn-subtle">Save</button>
                  <button className="u-btn u-btn-primary">Submit</button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <SectionLabel>Badges</SectionLabel>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <Badge role="positive">Positive</Badge>
            <Badge role="critical">Alert</Badge>
            <Badge role="warning">Warning</Badge>
            <Badge role="info">Info</Badge>
            <div style={{ width: 1, height: 22, background: 'var(--border-default)', margin: '0 8px' }} />
            <Badge role="brand">Brand</Badge>
            <span style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>
              ← hue comparison only; the system does not use brand color in badges
            </span>
          </div>
        </section>

        <section>
          <SectionLabel>Alerts — subtle</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Alert role="positive" label="Success">Your changes have been saved successfully.</Alert>
            <Alert role="critical" label="Error">We were unable to process your request. Please try again.</Alert>
            <Alert role="warning" label="Warning">Your usage is approaching the plan limit.</Alert>
            <Alert role="info" label="Info">New features are available. See what's changed.</Alert>
          </div>
          <div style={{ height: 20 }} />
          <SectionLabel>Alerts — high priority (stop 9)</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Alert solid role="positive" label="Success">Your changes have been saved successfully.</Alert>
            <Alert solid role="critical" label="Error">We were unable to process your request. Please try again.</Alert>
            <Alert solid role="warning" label="Warning">Your usage is approaching the plan limit.</Alert>
            <Alert solid role="info" label="Info">New features are available. See what's changed.</Alert>
          </div>
          <div style={{ borderTop: '1px solid var(--border-default)', margin: '20px 0 8px' }} />
          <div style={{ fontSize: 12, color: 'var(--fg-subtle)', marginBottom: 8 }}>
            Hue comparison only — the system does not use brand color in alerts. Shown to surface brand ↔ signal collisions.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Alert role="brand" label="Brand notice">Your session expires in 10 minutes.</Alert>
            <Alert solid role="brand" label="Brand notice">Your session expires in 10 minutes.</Alert>
          </div>
        </section>

        <section>
          <SectionLabel>Illustrations</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            <div style={ctxCard}>
              <div style={ctxCardTitle}>Hero</div>
              <div style={{ ...ctxCardBody, marginBottom: 8 }}>
                Painted straight from six fixed brand stops — no ramp lookup, no secondary.
              </div>
              <div dangerouslySetInnerHTML={{ __html: HERO_ILLO }} />
            </div>
          </div>
        </section>

        <section>
          <SectionLabel>Cards</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            <Card title="Active Projects" value="24" sub="3 due this week" accent="brand" />
            <Card title="Completed" value="148" sub="Last 30 days" accent="positive" />
            <Card title="Needs Review" value="7" sub="Action required" accent="warning" />
          </div>
        </section>

        <section>
          <SectionLabel>Typography</SectionLabel>
          <p style={{ margin: 0, lineHeight: 1.6, color: 'var(--fg-default)' }}>
            Default body text uses <strong>neutral-ink-30</strong> for maximum readability.{' '}
            <a href="#" className="u-link">Link text uses brand-ink-53</a>,
            which meets 4.5:1 AA contrast.{' '}
            <span style={{ color: 'var(--fg-subtle)' }}>Subtle text uses neutral-ink-53 for secondary information.</span>
          </p>
        </section>

      </main>
    </div>
  )
}

// Resolution readout: what the engine decided and why.
export function Readout({ r }: { r: ResolvedBrand }) {
  const chip = (label: string, on: boolean) => (
    <span key={label} style={{
      fontSize: 11, padding: '2px 8px', borderRadius: 99, marginRight: 6,
      border: '1px solid var(--border-subtle)',
      background: on ? 'var(--brand-bg-subtle)' : 'transparent',
      color: on ? 'var(--fg-default)' : 'var(--fg-subtle)',
      fontWeight: on ? 600 : 400,
      display: 'inline-block', marginBottom: 4,
    }}>{label}</span>
  )
  return (
    <div style={{ fontSize: 12 }}>
      {chip(`archetype: ${r.scale.archetype}`, true)}
      {chip(`shear ${r.shearDeg > 0 ? '+' : ''}${r.shearDeg.toFixed(1)}°`, r.shearDeg !== 0)}
      {chip(`red repel${r.redRepel ? `: ${[r.redRepel.light ? 'light' : '', r.redRepel.dark ? 'dark' : ''].filter(Boolean).join('+')}` : ''}`, !!r.redRepel)}
      {chip(`warning: ${r.warningVariant ?? 'canonical'}`, !!r.warningVariant)}
      {chip(`pending: ${r.pending.join(', ') || 'none'}`, r.pending.length > 0)}
    </div>
  )
}

// The emitted scale — the NAMED stops (paper/wash/mark/ink, contiguous 1–10
// since the 2026-07-29 highlight collapse; the engine emits no numeric
// --{prefix}-N vars). Kept in emit order; cta stays off-scale and out of the strip.
export const SCALE_STOP_NAMES = [
  'paper-99', 'paper-97', 'paper-95', 'wash-92', 'wash-89', 'wash-85', 'wash-80',
  'mark-74', 'ink-53', 'ink-42', 'ink-30',
] as const

// Labeled single-row scale strip — used where multiple scales stack tight
export function ScaleStrip({ label, prefix }: { label: string; prefix: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 150, fontSize: 12, color: 'var(--fg-subtle)', flexShrink: 0 }}>{label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${SCALE_STOP_NAMES.length}, 1fr)`, gap: 4, flex: 1 }}>
        {SCALE_STOP_NAMES.map(tok => (
          <div key={tok} title={`${prefix}-${tok}`} style={{ height: 34, borderRadius: 4, background: `var(--${prefix}-${tok})`, border: '1px solid var(--border-subtle)' }} />
        ))}
      </div>
    </div>
  )
}

export const ctxCard: React.CSSProperties = {
  padding: 20, borderRadius: 10,
  background: 'var(--surface-mid)',
  border: '1px solid var(--border-subtle)',
}
export const ctxCardTitle: React.CSSProperties = { fontSize: 15, fontWeight: 600 }
export const ctxCardBody: React.CSSProperties = { fontSize: 13, color: 'var(--fg-subtle)', marginTop: 4 }

// Lucide "ban" — stroke uses currentColor so it follows on-fill text polarity
export function BanIcon({ size = 15 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0 }} aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M4.929 4.929 19.07 19.071" />
    </svg>
  )
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{children}</h2>
}

// Non-interactive (badges): rounded square. Subtle-tier text uses fg (12)
// like the alerts — 11 isn't for text on tinted surfaces.
export function Badge({ role, children }: { role: string; children: React.ReactNode }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 6,
      fontSize: 12, fontWeight: 500,
      background: `var(--${role}-bg-subtle)`,
      color: `var(--${role}-fg)`,
      border: `1px solid var(--${role}-border-subtle)`,
    }}>{children}</span>
  )
}

export function Alert({ role, label, children, solid }: { role: string; label: string; children: React.ReactNode; solid?: boolean }) {
  return (
    <div style={{
      padding: '12px 16px', borderRadius: 8,
      background: solid ? `var(--${role}-bg-emphasis)` : `var(--${role}-bg-subtle)`,
      border: `1px solid var(--${role}-border-${solid ? 'emphasis' : 'subtle'})`,
      color: solid ? `var(--${role}-fg-on-emphasis)` : `var(--${role}-fg)`,
      fontSize: 14, display: 'flex', gap: 8,
    }}>
      <strong>{label}:</strong> {children}
    </div>
  )
}

export function Card({ title, value, sub, accent }: { title: string; value: string; sub: string; accent: string }) {
  return (
    <div style={{
      padding: 20, borderRadius: 10,
      background: 'var(--surface-mid)',
      border: '1px solid var(--border-subtle)',
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{ fontSize: 12, color: 'var(--fg-subtle)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: `var(--${accent}-fg-alt)` }}>{value}</div>
      <div style={{ fontSize: 13, color: 'var(--fg-subtle)' }}>{sub}</div>
    </div>
  )
}
