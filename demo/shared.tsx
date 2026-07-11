import React from 'react'
import { BRANDS } from '../src/brands'
import { resolveBrand, type ResolvedBrand } from '../src/engine/resolve'
import { annotationNote, stopHex } from '../src/engine/cssRender'
import { generateScale, generateIllustrationScale } from '../src/engine/colorEngine'
import { remapSvg, SAMPLE_ILLUSTRATION } from '../src/illustration'

export const ALL_BRANDS = BRANDS.slice().sort((a, b) => a.name.localeCompare(b.name))

export type RungMode = 'recommended' | 'exact'
export type AccentMode = 'default' | 'accented' | 'inverse' | 'accented-inverse'

export const FONT_STACK = "'Inter', -apple-system, system-ui, sans-serif"

// Secondary display modes are a 2×2: which family fills the PRIMARY
// register (emphasis fills, accent text, links) × which fills the SUBTLE
// register (tinted surfaces). Overrides reference PRIMITIVES (--secondary-ink),
// never the other role's var — role-to-role references would cycle.
//   default          primary: brand   subtle: brand   (no override)
//   accented         primary: brand   subtle: accent
//   inverse          primary: accent  subtle: accent
//   accented-inverse primary: accent  subtle: brand
// The "accent" Family is emitted as the `secondary` primitive prefix (the role
// was renamed in the token rename); prim() maps Family → primitive prefix.
// Stops are the post-rename token names: scale paper/wash, the highlight-9
// rung, the cta-1/cta-2 fill pair, ink-10/ink-11 text, on-cta/on-highlight on-fill text.
type Family = 'brand' | 'accent'
function accentModeCss(mode: AccentMode, primary: Family, subtle: Family): string {
  const other = (f: Family): Family => (f === 'brand' ? 'accent' : 'brand')
  const prim = (f: Family): string => (f === 'brand' ? 'brand' : 'secondary')
  const PRIMARY_ROLES: Array<[string, string]> = [
    ['fg', 'ink-11'], ['fg-hover', 'ink-10'], ['fg-alt', 'ink-10'], ['fg-alt-hover', 'ink-11'], ['fg-on-emphasis', 'on-cta'],
    ['bg-emphasis', 'cta-1'], ['bg-emphasis-hover', 'cta-2'],
    ['border-default', 'wash-6'], ['border-default-hover', 'highlight-8'],
    ['border-emphasis', 'cta-1'], ['border-emphasis-hover', 'cta-2'],
  ]
  const SUBTLE_ROLES: Array<[string, string]> = [
    ['bg-faint', 'paper-2'], ['bg-subtle', 'wash-5'], ['bg-subtle-hover', 'wash-6'],
    ['border-subtle', 'wash-4'], ['border-subtle-hover', 'wash-5'],
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
  lines.push(`  --fg-link: var(--${prim(primary)}-ink-10);`)
  lines.push(`  --fg-link-hover: var(--${prim(primary)}-ink-11);`)
  lines.push(`}`)
  if (subtle !== primary) {
    lines.push(`[data-accent-mode="${mode}"] .u-btn-subtle { color: var(--${prim(subtle)}-ink-11); }`)
    lines.push(`[data-accent-mode="${mode}"] .u-btn-ghost:hover { color: var(--${prim(subtle)}-ink-11); }`)
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
.u-btn-primary { background: var(--brand-bg-emphasis); color: var(--brand-fg-on-emphasis); }
.u-btn-primary:hover { background: var(--brand-bg-emphasis-hover); }
.u-btn-subtle { background: var(--brand-bg-subtle); color: var(--brand-fg); }
.u-btn-subtle:hover { background: var(--brand-bg-subtle-hover); }
/* the LOW-HIERARCHY button: the neutral's quiet scale-fed cta (stop 4/5). The
   secondary-showcase slots fall back to this when no secondary exists — a
   subtle slot reads neutral until a secondary claims it, never brand-again. */
.u-btn-neutral { background: var(--neutral-cta-1); color: var(--neutral-on-cta); }
.u-btn-neutral:hover { background: var(--neutral-cta-2); }
/* the SECONDARY cta pair (--secondary-cta-1/2 + on-cta), shown beside the brand
   cta wherever that is showcased. cta-border is transparent for every style
   except outline (where the ring IS the component), so the border is
   unconditional and layout never shifts. */
.u-btn-secondary { background: var(--secondary-cta-1); color: var(--secondary-on-cta); border-color: var(--secondary-cta-border); }
.u-btn-secondary:hover { background: var(--secondary-cta-2); }
.u-btn-ghost { background: transparent; color: var(--brand-fg); }
.u-btn-ghost:hover { background: var(--brand-bg-subtle); }
/* Universal destructive rule (designer decision): destructive BUTTONS never
   encode intent via solid error fill alone — outline treatment + required
   icon, for every brand, every mode. Solid error fill (--alert-high-bg-emphasis)
   stays reserved for system-voiced non-button surfaces: error states, badges,
   toasts, alerts. .u-btn-destructive is kept as an alias so any legacy markup
   degrades to the same treatment instead of a solid fill. */
.u-btn-destructive,
.u-btn-destructive-outline {
  background: var(--surface-raised);
  color: var(--alert-high-fg-alt);
  border-color: var(--alert-high-border-default);
}
.u-btn-destructive:hover,
.u-btn-destructive-outline:hover {
  background: var(--alert-high-bg-subtle);
  color: var(--alert-high-fg);
  border-color: var(--alert-high-border-default-hover);
}
.u-link { color: var(--fg-link); text-decoration: underline; }
.u-link:hover { color: var(--fg-link-hover); }
/* Stop 8 IS the ramp's focus-ring role — never the OS default accent */
[data-brand] :is(input, select, textarea, button, a):focus-visible {
  outline: 2px solid var(--brand-highlight-8);
  outline-offset: 1px;
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
          background: value === v ? 'var(--brand-bg-subtle)' : 'var(--surface-raised)',
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
      style={{ minHeight: props.bare ? undefined : '100vh', background: 'var(--surface-base)', color: 'var(--fg-default)', fontFamily: FONT_STACK }}
    >
      {props.overrideCss && <style>{props.overrideCss}</style>}

      {!props.bare && <>
        {/* single toolbar row: palette picker + locked fields + controls */}
        <header style={{ position: 'sticky', top: 0, zIndex: 35, background: 'var(--surface-raised)', borderBottom: '1px solid var(--border-subtle)', padding: '12px 24px', display: 'flex', alignItems: 'flex-end', gap: '12px 18px', flexWrap: 'wrap' }}>
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
            {props.secondaryHex && <ScaleStrip label={`Accent (${props.secondaryHex})`} prefix="accent" />}
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
            <Badge role="alert-high">Alert</Badge>
            <Badge role="alert-med">Warning</Badge>
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
            <Alert role="alert-high" label="Error">We were unable to process your request. Please try again.</Alert>
            <Alert role="alert-med" label="Warning">Your usage is approaching the plan limit.</Alert>
            <Alert role="info" label="Info">New features are available. See what's changed.</Alert>
          </div>
          <div style={{ height: 20 }} />
          <SectionLabel>Alerts — high priority (stop 9)</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Alert solid role="positive" label="Success">Your changes have been saved successfully.</Alert>
            <Alert solid role="alert-high" label="Error">We were unable to process your request. Please try again.</Alert>
            <Alert solid role="alert-med" label="Warning">Your usage is approaching the plan limit.</Alert>
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
          <IllustrationRamp hex={hex} accentHex={props.secondaryHex ?? undefined} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, marginTop: 14 }}>
            <div style={ctxCard}>
              <div style={ctxCardTitle}>Mono (default)</div>
              <div style={{ ...ctxCardBody, marginBottom: 8 }}>Everything draws from the brand's illustration ramp.</div>
              <div dangerouslySetInnerHTML={{ __html: remapSvg(SAMPLE_ILLUSTRATION) }} />
            </div>
            <div style={ctxCard}>
              <div style={ctxCardTitle}>Two-color{props.secondaryHex ? '' : ' (no secondary — falls back to mono)'}</div>
              <div style={{ ...ctxCardBody, marginBottom: 8 }}>
                Alt areas switch to the secondary's ramp. Primary areas never change.
              </div>
              <div data-illustration="two-color" dangerouslySetInnerHTML={{ __html: remapSvg(SAMPLE_ILLUSTRATION) }} />
            </div>
          </div>
          <IllustrationLegend />
        </section>

        <section>
          <SectionLabel>Cards</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            <Card title="Active Projects" value="24" sub="3 due this week" accent="brand" />
            <Card title="Completed" value="148" sub="Last 30 days" accent="positive" />
            <Card title="Needs Review" value="7" sub="Action required" accent="alert-med" />
          </div>
        </section>

        <section>
          <SectionLabel>Typography</SectionLabel>
          <p style={{ margin: 0, lineHeight: 1.6, color: 'var(--fg-default)' }}>
            Default body text uses <strong>neutral-12</strong> for maximum readability.{' '}
            <a href="#" className="u-link">Link text uses brand-11</a>,
            which meets 4.5:1 AA contrast.{' '}
            <span style={{ color: 'var(--fg-subtle)' }}>Subtle text uses neutral-11 for secondary information.</span>
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

// Labeled single-row scale strip — used where multiple scales stack tight
export function ScaleStrip({ label, prefix }: { label: string; prefix: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 150, fontSize: 12, color: 'var(--fg-subtle)', flexShrink: 0 }}>{label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 4, flex: 1 }}>
        {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
          <div key={n} title={`${prefix}-${n}`} style={{ height: 34, borderRadius: 4, background: `var(--${prefix}-${n})`, border: '1px solid var(--border-subtle)' }} />
        ))}
      </div>
    </div>
  )
}

export const ctxCard: React.CSSProperties = {
  padding: 20, borderRadius: 10,
  background: 'var(--surface-raised)',
  border: '1px solid var(--border-subtle)',
}
export const ctxCardTitle: React.CSSProperties = { fontSize: 15, fontWeight: 600 }
export const ctxCardBody: React.CSSProperties = { fontSize: 13, color: 'var(--fg-subtle)', marginTop: 4 }

// Illustration palette (PoC 2026-06-11): primary 1–4 from the brand,
// alt 1–4 from the secondary (falls back to primary's slots when absent).
// Fixed L targets per slot; hexes shown selectable for designer hand-off.
const ILLUS_SLOT_NAMES = ['wash', 'tint', 'mid', 'deep']

function IllusRow({ label, hex }: { label: string; hex: string }) {
  const stops = generateIllustrationScale(generateScale(hex, 'x')).stops
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <div style={{ fontSize: 11, color: 'var(--fg-subtle)', width: 84 }}>{label}</div>
      {stops.map((s, i) => (
        <div key={i} style={{ textAlign: 'center' }}>
          <div style={{
            width: 64, height: 40, borderRadius: 6, background: stopHex(s),
            border: '1px solid var(--border-subtle)',
          }} />
          <div style={{ fontSize: 10, color: 'var(--fg-subtle)', marginTop: 4, userSelect: 'all', fontFamily: 'ui-monospace, monospace' }}>
            {stopHex(s).toUpperCase()}
          </div>
          <div style={{ fontSize: 10, color: 'var(--fg-subtle)' }}>{ILLUS_SLOT_NAMES[i]} {i + 1}</div>
        </div>
      ))}
    </div>
  )
}

export function IllustrationRamp({ hex, accentHex }: { hex: string; accentHex?: string }) {
  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <IllusRow label="primary" hex={hex} />
        <IllusRow label={accentHex ? 'alt' : 'alt (= primary)'} hex={accentHex ?? hex} />
      </div>
      <div style={{ fontSize: 12, color: 'var(--fg-subtle)', maxWidth: 320 }}>
        Illustration palette — fixed L targets per slot, not the UI ramp. Shapes in illustration
        files are labeled by slot; hue follows the warm path, no UX-rule darkening. Hexes are
        selectable for hand-off.
      </div>
    </div>
  )
}

// Live slot table: legend hex the designer paints → rung rule → the color
// it resolves to right now (current brand + mode + two-color state).
export function IllustrationLegend() {
  const rows: Array<[string, string, string, string]> = [
    ['#0057FF', 'Primary', 'brand mid (slot 3) — fixed L target', 'var(--illus-primary)'],
    ['#9DC4FF', 'Primary soft', 'brand tint (slot 2)', 'var(--illus-primary-soft)'],
    ['#FF7A00', 'Alt', 'brand deep (slot 4) mono → secondary mid two-color', 'var(--illus-alt)'],
    ['#FFD6A8', 'Alt soft', 'brand tint (slot 2) mono → secondary tint two-color', 'var(--illus-alt-soft)'],
    ['#1A1A1A', 'Ink', 'neutral-12 ink', 'var(--illus-ink)'],
    ['#9E9E9E', 'Muted', 'neutral-8 — never branded', 'var(--illus-muted)'],
    ['#FFFFFF', 'Paper', 'neutral-1 — flips correctly in dark mode', 'var(--illus-paper)'],
  ]
  const chip = (bg: string) => (
    <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: 3, background: bg, border: '1px solid var(--border-subtle)', verticalAlign: -2 }} />
  )
  return (
    <div style={{ marginTop: 12, fontSize: 12, color: 'var(--fg-subtle)' }}>
      <div style={{ marginBottom: 6 }}>
        Slot legend — paint with the placeholder, the engine does the rest (mono resolution shown):
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto auto auto 1fr', gap: '4px 12px', alignItems: 'center' }}>
        {rows.map(([hex, name, rule, cssVar]) => (
          <React.Fragment key={hex}>
            <span>{chip(hex)} <code style={{ fontSize: 11 }}>{hex}</code></span>
            <span style={{ color: 'var(--fg-default)' }}>{name}</span>
            <span>→ {chip(cssVar)}</span>
            <span>{rule}</span>
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

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
      background: 'var(--surface-raised)',
      border: '1px solid var(--border-subtle)',
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{ fontSize: 12, color: 'var(--fg-subtle)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: `var(--${accent}-fg-alt)` }}>{value}</div>
      <div style={{ fontSize: 13, color: 'var(--fg-subtle)' }}>{sub}</div>
    </div>
  )
}
