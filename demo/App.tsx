import React, { useMemo, useState } from 'react'
import { ChevronDown, Lock } from 'lucide-react'
import { DEMO_BRANDS } from '../src/brands'
import { SECONDARIES } from '../src/secondaries'
import { resolveBrand } from '../src/engine/resolve'
import { brandCss, neutralCss } from '../src/engine/cssRender'
import {
  ALL_BRANDS, COMPONENT_CSS, FONT_STACK, Showcase, Segmented, rungDescription,
  type RungMode, type AccentMode,
} from './shared'
import CustomTheme from './CustomTheme'
import DocsSite from './docs/DocsSite'
import { OkchromaLogo } from './okchroma-logo'

type View = 'custom' | 'gallery' | 'docs'
// The gallery view stays HIDDEN for now (PaletteGallery lives below; one-line
// revert). Docs is the new sidebar docs site (demo/docs/DocsSite.tsx) — the old
// stale Docs component was removed.
const VIEWS: Array<[View, string]> = [
  ['custom', 'Custom theme'],
  // ['gallery', 'Example palettes'],
  ['docs', 'Documentation'],
]

// Shell: ONE header row — the tab bar collapsed into a view dropdown next
// to the wordmark, and the calibration rigs were removed from the demo
// nav (engine work is done; the components live in git history).
export default function App() {
  const [view, setView] = useState<View>('custom')
  const [dark, setDark] = useState(false)

  return (
    <div data-brand="chrome" data-theme={dark ? 'dark' : 'light'} style={{ fontFamily: FONT_STACK, minHeight: '100vh', background: 'var(--surface-base)', display: 'flex', flexDirection: 'column' }}>
      {/* The neutral is no longer a global :root block — it's per-brand now. The
          demo's own chrome (footer, nav) isn't a brand, so give it a plain
          generated neutral (pure gray) as its base. */}
      <style>{neutralCss('[data-brand="chrome"]', 0, 'pure')}</style>
      <style>{COMPONENT_CSS}</style>
      <style>{NAV_CSS}</style>

      <div style={{ flex: 1, minHeight: 0 }}>
        {view === 'custom' && <CustomTheme dark={dark} onToggleDark={() => setDark(d => !d)} />}
        {view === 'gallery' && <PaletteGallery dark={dark} onToggleDark={() => setDark(d => !d)} />}
        {view === 'docs' && <DocsSite dark={dark} />}
      </div>

      {/* Global tool chrome — moved out of the top header into a pinned footer so
          the views start with product chrome only. */}
      <footer className="app-footer">
        <span className="app-footer-logo"><OkchromaLogo height={17} /></span>
        <nav className="app-footer-views">
          {VIEWS.map(([v, label]) => (
            <button key={v} className={`app-footer-link${view === v ? ' active' : ''}`} onClick={() => setView(v)}>
              {label}
            </button>
          ))}
          {/* third option: the manual-install page (a standalone page beside the demo,
              rebuilt with the plugin zip on every deploy) */}
          <a className="app-footer-link" href="https://egerrity.github.io/okchroma/install.html" target="_blank" rel="noreferrer">
            <FigmaMark /> Figma plugin
          </a>
        </nav>
        <a className="nav-pill" href="https://github.com/egerrity/okchroma" target="_blank" rel="noreferrer" aria-label="View OKChroma on GitHub">
          <GithubMark /> GitHub
        </a>
        <button className="nav-pill" onClick={() => setDark(d => !d)}>{dark ? '☀ Light' : '☾ Dark'}</button>
      </footer>
    </div>
  )
}

// ─── Example palettes: curated set exercising every archetype & edge case ───

// Gallery controls-bar primitives — mirror the custom-theme field look so the
// two views read the same. Inline-styled (self-contained, no shared-CSS churn).
const GX_LABEL: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: 'var(--fg-default)', marginBottom: 5 }
const GX_FIELD: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8, height: 38, boxSizing: 'border-box',
  background: 'var(--surface-raised)', border: '1px solid var(--neutral-6)', borderRadius: 8,
  padding: '0 12px', fontSize: 13, color: 'var(--fg-default)',
}
// The palette picker is the one editable control here — same field metrics as
// the others, native arrow stripped (appearance:none) in favor of a chevron
// that matches the rest of the UI.
const GX_SELECT: React.CSSProperties = {
  height: 38, boxSizing: 'border-box', padding: '0 32px 0 12px', width: '100%',
  background: 'var(--surface-raised)', border: '1px solid var(--border-default)', borderRadius: 8,
  fontSize: 13, color: 'var(--fg-default)', fontFamily: 'inherit', cursor: 'pointer',
  appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
}

function GxControl({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ display: 'flex', flexDirection: 'column' }}><div style={GX_LABEL}>{label}</div>{children}</div>
}

// Read-only "locked" field — shows an example palette's color in the same field
// style as custom-theme, but not editable (you change the palette via the picker).
function LockedField({ label, swatch, text, width = 152 }: { label: string; swatch?: string; text: string; width?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ ...GX_LABEL, color: 'var(--neutral-11)' }}>{label}</div>
      <div style={{ ...GX_FIELD, width }}>
        {swatch && <span style={{ width: 20, height: 20, borderRadius: 5, flexShrink: 0, border: '1px solid var(--neutral-6)', background: swatch }} />}
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{text}</span>
        <Lock size={13} style={{ flexShrink: 0, color: 'var(--neutral-8)' }} aria-label="locked" />
      </div>
    </div>
  )
}

function PaletteGallery({ dark, onToggleDark }: { dark: boolean; onToggleDark: () => void }) {
  const [brandSlug, setBrandSlug] = useState(DEMO_BRANDS[0].slug)
  const [rung, setRung] = useState<RungMode>('recommended')
  const [accentMode, setAccentMode] = useState<AccentMode>('accented')

  const current = ALL_BRANDS.find(b => b.slug === brandSlug) ?? ALL_BRANDS[0]
  const secondary = SECONDARIES[current.slug]

  // Recommended mode ships from the pre-built CSS; exact recomputes in
  // the browser via the same engine + renderer the build uses.
  const { overrideCss, resolved } = useMemo(() => {
    const opts = rung === 'exact' ? { exact: true } : undefined
    const r = resolveBrand(current.hex, current.name, opts)
    if (rung === 'recommended') return { overrideCss: '', resolved: r }
    const accent = secondary ? resolveBrand(secondary, 'accent', { exact: true }).scale : null
    return { overrideCss: brandCss(current.slug, current.name, r, accent), resolved: r }
  }, [current, rung, secondary])

  return (
    <Showcase
      slug={current.slug}
      name={current.name}
      hex={current.hex}
      secondaryHex={secondary}
      dark={dark}
      onToggleDark={onToggleDark}
      overrideCss={overrideCss}
      accentMode={secondary ? accentMode : 'default'}
      header={
        <GxControl label="Example palette">
          <div style={{ position: 'relative', width: 176 }}>
            <select
              value={brandSlug}
              onChange={e => setBrandSlug(e.target.value)}
              style={GX_SELECT}
            >
              <optgroup label="Featured">
                {DEMO_BRANDS.map(b => <option key={b.slug} value={b.slug}>{b.name}</option>)}
              </optgroup>
              <optgroup label="All examples">
                {ALL_BRANDS.filter(b => !b.demo).map(b => <option key={b.slug} value={b.slug}>{b.name}</option>)}
              </optgroup>
            </select>
            <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--fg-subtle)' }} />
          </div>
        </GxControl>
      }
      controls={
        <>
          <LockedField label="Primary color" swatch={current.hex} text={current.hex.toUpperCase()} />
          {secondary && <LockedField label="Accent color" swatch={secondary} text={secondary.toUpperCase()} />}
          <LockedField label="Neutral color" text="Default (brand-tinted)" width={132} />
          {/* keep preview + engine-mode together; wrap as one group, left-aligned */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px 18px', flexWrap: 'wrap' }}>
            {secondary && (
              <GxControl label="Accent preview">
                <Segmented value={accentMode} onChange={setAccentMode} options={[['accented', 'Default'], ['accented-inverse', 'Inverse']]} />
              </GxControl>
            )}
            <GxControl label="Color engine mode">
              <Segmented value={rung} onChange={setRung} options={[['recommended', 'Recommended'], ['exact', 'Exact']]} />
            </GxControl>
          </div>
        </>
      }
      annotation={rungDescription(rung, resolved)}
    />
  )
}


// Figma mark — owner-supplied outline glyph (lucide dropped brand icons), drawn in
// currentColor so it inherits the nav link's text color in both light and dark.
function FigmaMark() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M15.5 9C15.9596 9 16.4148 8.90947 16.8394 8.73358C17.264 8.55769 17.6499 8.29988 17.9749 7.97487C18.2999 7.64987 18.5577 7.26403 18.7336 6.83939C18.9095 6.41475 19 5.95963 19 5.5C19 5.04037 18.9095 4.58525 18.7336 4.16061C18.5577 3.73597 18.2999 3.35013 17.9749 3.02513C17.6499 2.70012 17.264 2.44231 16.8394 2.26642C16.4148 2.09053 15.9596 2 15.5 2L12 2H8.5C7.57174 2 6.6815 2.36875 6.02513 3.02513C5.36875 3.6815 5 4.57174 5 5.5C5 6.42826 5.36875 7.3185 6.02513 7.97487C6.6815 8.63125 7.57174 9 8.5 9M12 2V9M12 9H8.5M12 9H15.5M12 9V16M8.5 9C7.57174 9 6.6815 9.36875 6.02513 10.0251C5.36875 10.6815 5 11.5717 5 12.5C5 13.4283 5.36875 14.3185 6.02513 14.9749C6.6815 15.6313 7.57174 16 8.5 16M15.5 9C15.0404 9 14.5852 9.09053 14.1606 9.26642C13.736 9.44231 13.3501 9.70012 13.0251 10.0251C12.7001 10.3501 12.4423 10.736 12.2664 11.1606C12.0905 11.5852 12 12.0404 12 12.5C12 12.9596 12.0905 13.4148 12.2664 13.8394C12.4423 14.264 12.7001 14.6499 13.0251 14.9749C13.3501 15.2999 13.736 15.5577 14.1606 15.7336C14.5852 15.9095 15.0404 16 15.5 16C15.9596 16 16.4148 15.9095 16.8394 15.7336C17.264 15.5577 17.6499 15.2999 17.9749 14.9749C18.2999 14.6499 18.5577 14.264 18.7336 13.8394C18.9095 13.4148 19 12.9596 19 12.5C19 12.0404 18.9095 11.5852 18.7336 11.1606C18.5577 10.736 18.2999 10.3501 17.9749 10.0251C17.6499 9.70012 17.264 9.44231 16.8394 9.26642C16.4148 9.09053 15.9596 9 15.5 9ZM8.5 16C7.57174 16 6.6815 16.3687 6.02513 17.0251C5.36875 17.6815 5 18.5717 5 19.5C5 20.4283 5.36875 21.3185 6.02513 21.9749C6.6815 22.6313 7.57174 23 8.5 23C9.42826 23 10.3185 22.6313 10.9749 21.9749C11.6313 21.3185 12 20.4283 12 19.5V16M8.5 16H12" />
    </svg>
  )
}

// GitHub mark — inlined (lucide dropped brand icons) and drawn in currentColor
// so it inherits the nav pill's text color in both light and dark.
function GithubMark() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  )
}

const NAV_CSS = `
.nav-pill {
  display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 16px;
  border-radius: 999px; border: 1px solid transparent; cursor: pointer; font-family: inherit;
  font-size: 12px; font-weight: 600; letter-spacing: 0.005em; text-decoration: none;
  background: var(--surface-sunken); color: var(--fg-default);
}
.nav-pill:hover { background: var(--neutral-wash-4); }
.app-footer {
  position: sticky; bottom: 0; z-index: 40;
  display: flex; align-items: center; gap: 16px;
  padding: 10px 24px; background: var(--surface-raised);
  border-top: 1px solid var(--border-subtle);
}
.app-footer-logo { color: var(--fg-default); display: inline-flex; }
.app-footer-views {
  margin: 0 auto; display: flex; gap: 4px;
}
.app-footer-link {
  border: none; background: none; cursor: pointer; font-family: inherit;
  font-size: 13px; font-weight: 500; color: var(--fg-subtle);
  padding: 6px 12px; border-radius: 8px;
  display: inline-flex; align-items: center; gap: 6px; text-decoration: none;
}
.app-footer-link:hover { background: var(--surface-sunken); color: var(--fg-default); }
.app-footer-link.active { color: var(--fg-default); }
`
