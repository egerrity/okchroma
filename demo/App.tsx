import React, { useMemo, useState } from 'react'
import { ChevronDown, Lock } from 'lucide-react'
import { DEMO_BRANDS } from '../src/brands'
import { SECONDARIES } from '../src/secondaries'
import { resolveBrand } from '../src/engine/resolve'
import { brandCss } from '../src/engine/cssRender'
import { generateScale } from '../src/engine/colorEngine'
import { closestNeutralFamily } from '../src/radixNeutrals'
import {
  ALL_BRANDS, COMPONENT_CSS, FONT_STACK, Showcase, Segmented, rungDescription,
  type RungMode, type AccentMode,
} from './shared'
import CustomTheme from './CustomTheme'
import { OkchromaLogo } from './okchroma-logo'

type View = 'custom' | 'gallery' | 'docs'
// Stage 3: gallery + docs are HIDDEN (not deleted) — the demo presents the
// custom-theme view only. The PaletteGallery and Docs components stay in place
// below (and in the render switch) so this is a one-line revert. Docs in
// particular still carries pre-rename 1–12 refs; it's hidden, not yet re-skinned.
const VIEWS: Array<[View, string]> = [
  ['custom', 'Custom theme'],
  // ['gallery', 'Example palettes'],
  // ['docs', 'Documentation'],
]

// Shell: ONE header row — the tab bar collapsed into a view dropdown next
// to the wordmark, and the calibration rigs were removed from the demo
// nav (engine work is done; the components live in git history).
export default function App() {
  const [view, setView] = useState<View>('custom')
  const [dark, setDark] = useState(false)

  return (
    <div data-brand="chrome" data-theme={dark ? 'dark' : 'light'} style={{ fontFamily: FONT_STACK, minHeight: '100vh', background: 'var(--surface-base)', display: 'flex', flexDirection: 'column' }}>
      <style>{COMPONENT_CSS}</style>
      <style>{NAV_CSS}</style>

      <div style={{ flex: 1, minHeight: 0 }}>
        {view === 'custom' && <CustomTheme dark={dark} onToggleDark={() => setDark(d => !d)} />}
        {view === 'gallery' && <PaletteGallery dark={dark} onToggleDark={() => setDark(d => !d)} />}
        {view === 'docs' && <Docs dark={dark} />}
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
  // Brand-matched neutral family, shown locked (the gallery doesn't expose the
  // neutral choice) — same 🪄 "match" affordance as custom-theme.
  const matchedNeutral = useMemo(() => {
    const s = generateScale(current.hex, 'x')
    return closestNeutralFamily(s.brandH, s.brandC)
  }, [current])

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
          <LockedField label="Neutral color" text={`${matchedNeutral[0].toUpperCase()}${matchedNeutral.slice(1)} 🪄`} width={132} />
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

const ROLE_ROWS: Array<{ steps: string; role: string; swatch: number }> = [
  { steps: '1–2', role: 'surfaces and backgrounds', swatch: 2 },
  { steps: '3–5', role: 'low-hierarchy component backgrounds (rest / hover / active)', swatch: 4 },
  { steps: '6–8', role: 'borders and dividers (subtle / border / strong)', swatch: 7 },
  { steps: '9', role: 'solid fill, the main vehicle for brand identity', swatch: 9 },
  { steps: '10', role: 'hover for solid fill', swatch: 10 },
  { steps: '11', role: 'lower-contrast text', swatch: 11 },
  { steps: '12', role: 'higher-contrast text', swatch: 12 },
]

function Docs({ dark }: { dark: boolean }) {
  return (
    <div className="docs">
      <style>{DOCS_CSS}</style>
      <div className="docs-inner">
        <header className="docs-head">
          <h1>Documentation</h1>
          <p className="docs-lede">What the color engine means for your work: what each part does, what you'll see, and what you decide.</p>
        </header>

        <section>
          <h2>About the color engine</h2>
          <p><b>Built on Radix, generated per brand.</b> OKChroma uses Radix's reserved-step model, where each of the 12 steps has a perceptual target tied to a role. Where Radix hand-tunes a fixed set of palettes, OKChroma generates that structure from any brand color, so contrast pairings are predictable before you build a single token.</p>
          <p><b>Perceptual color (OKLCH).</b> The engine works in a perceptual color space, so the steps appear evenly spaced regardless of hue and a scale holds one hue from light to dark.</p>
          <p><b>Consistent across brands.</b> Each step is calculated to land at about the same lightness for every brand, so you set your structure once and extend to any brand. No surprises from low chroma, pesky yellows, or very dark navies.</p>
          <p><b>Brand identity, preserved where safe.</b> Your brand color anchors the system at step 9, the solid fill. The engine keeps your exact hex wherever it safely can, and only adjusts when the literal color would break a UX expectation: a near-red brand that could be mistaken for the error color, or a fill that can't carry legible text. Recommended mode applies those adjustments; Exact mode turns them off and hands the tradeoffs to you.</p>
          <p><b>Accessibility is guaranteed.</b> Every fill ships with readable text (black or white, whichever passes) in both light and dark mode, by construction. The one exception is Exact mode, which ships your hex untouched and hands accessibility back to you.</p>

          <h3>About OKLCH</h3>
          <p>OKLCH describes a color with three numbers you can reason about directly: Lightness (how light or dark), Chroma (how saturated), and Hue (the color itself). Unlike hex or RGB, these track how the eye actually reads color, so a step in lightness looks like the same step on any hue, and you can move one value without disturbing the other two. That is what lets the engine put every step at a predictable lightness and hold a single hue down a ramp.</p>
        </section>

        <section>
          <h2>Recommendations for using your primitives</h2>
          <p>OKChroma gives you primitives: the 12-step ramps for each brand, plus the status and neutral ramps. It does not ship semantic or component tokens; you build those on top. The point is that the primitives were designed for it. Each step has a reserved role, so your tokens map cleanly and the mapping holds across every brand.</p>

          <div data-brand="cold-brew" data-theme={dark ? 'dark' : 'light'}>
            <p className="docs-caption">A generated brand ramp (example):</p>
            <div className="docs-ramp">
              {Array.from({ length: 12 }, (_, i) => (
                <div key={i} className="docs-ramp-cell" style={{ background: `var(--brand-${i + 1})` }} />
              ))}
            </div>
            <div className="docs-ramp-nums">
              {Array.from({ length: 12 }, (_, i) => <span key={i}>{i + 1}</span>)}
            </div>

            <table className="docs-roles">
              <thead><tr><th style={{ width: 64 }}>Step</th><th>Role</th></tr></thead>
              <tbody>
                {ROLE_ROWS.map(r => (
                  <tr key={r.steps}>
                    <td><span className="docs-chip" style={{ background: `var(--brand-${r.swatch})` }} />{r.steps}</td>
                    <td>{r.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="docs-note">The model follows Radix's <a href="https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale" target="_blank" rel="noreferrer">Understanding the scale</a>.</p>

          <p><b>White-label considerations.</b> Because every brand's step N lands at the same lightness and role, you define your tokens against step numbers once (solid fill = 9, default border = 6, body text = 12) and they hold for every brand, with no per-brand re-aliasing.</p>
          <p><b>Build the on-emphasis text per brand.</b> The engine generates an on-fill text color for each palette (black or white, whichever stays legible on that brand's step-9 fill). When you define your "text on solid fill" token, point it at that per-brand value, not one global color.</p>
          <p><b>Status and neutrals are their own ramps.</b> The four status colors (error, warning, success, info) and the neutrals come as separate, complete ramps in the same 12-step shape. Treat them as fixed.</p>
          <p><b>Destructive styling.</b> Style destructive interactions differently from ordinary ones (an outline with a required icon rather than a solid red fill), especially when the brand color collides with error. See UX considerations for red hues below.</p>
        </section>

        <section>
          <h2>How color shifting works</h2>

          <h3>Collisions &amp; signals</h3>
          <p>Your brand can land near a signal color (error red, warning yellow, and so on). When it does, the engine keeps them apart on purpose, so a brand element never gets mistaken for a status. For example, the warning yellow may shift toward lemon so it reads distinct from a gold brand. The red case is the big one (see below).</p>
          <p><b>Accent warnings.</b> If you pick a secondary/accent that reads too close to a status color, the demo warns you and suggests a more distinct one. The accent is your choice, so the engine flags it rather than changing it.</p>

          <h3>UX considerations for red hues</h3>
          <p>Red is the one color the brand yields to, not the other way around, because red carries the error and destructive meaning and that has to stay unmistakable. When a brand sits in the red register, three things happen:</p>
          <ul>
            <li><b>We move the brand's lightness.</b> A red-family brand is darkened so its solid fill can't be confused with the error red on a destructive control. The hue is kept; the lightness moves.</li>
            <li><b>We shift the brand cooler.</b> Warm reds rotate a few degrees cooler so they read as the brand rather than fire-engine error red.</li>
            <li><b>We recommend diverging destructive styling.</b> Style destructive interactions differently from ordinary ones (an outline with a required icon, not a solid red fill), especially when the brand collides with error.</li>
          </ul>
          <p>The first two are automatic in Recommended mode; the third is a recommendation for your components.</p>

          <h3>Warm hues</h3>
          <p><b>Gold stays gold.</b> Dark shades of yellow, gold, and orange stay gold instead of turning olive or brown. The engine rotates the hue as it darkens so warm brands keep their character down the scale, even for muted or off-brand warm colors.</p>
          <p><b>The style lever.</b> Some semi-muted warm brands (a muted gold) can go two ways: stay vivid, or lean browner and deeper. When your color is eligible you'll get a Default / Deeper toggle to choose. Outside that narrow range the toggle doesn't appear, because it would do nothing.</p>
        </section>

        <section>
          <h2>Secondary color <span className="docs-badge">beta</span></h2>
          <p>You can add a secondary (accent) color next to the primary. Treat it as beta, because of an important limit: the engine does not decide what the secondary should be in relation to the primary, and it doesn't harmonize the pair for you. What it does do:</p>
          <ul>
            <li>generate a full, accessible ramp for the secondary, the same way it does for the primary,</li>
            <li>warn you if the secondary collides with a status color.</li>
          </ul>
          <p>So the pairing is your responsibility. Pick a secondary that already works with your primary. The engine guarantees each color is accessible on its own and flags signal collisions, but it will not fix a clashing or muddy combination. Use at your discretion. It shows up in accent surfaces, two-color illustrations, and the accent display modes.</p>
        </section>

        <section>
          <h2>Modes &amp; extras</h2>
          <p><b>Dark mode keeps your identity.</b> Fills don't invert or change hue; a too-dark fill just lifts enough to read on a dark background. The one special case: a red brand that would clash with the error red floats to a softer pastel so the two stay distinct.</p>
          <p><b>Illustrations.</b> Illustrations get their own 4-color palette (wash, tint, mid, deep). You paint artwork using labeled legend colors per slot, and the engine recolors it to any brand. Illustrations deliberately skip the UI accessibility rules so they stay painterly.</p>
          <p><b>Neutrals.</b> The engine suggests a recommended neutral palette for your brand by default, but you can also select a neutral with extra brand tint, or pick from a small set of other hue options.</p>
          <p><b>Exact mode and overrides.</b> Exact mode ships your exact hex and turns off the engine's adjustments and guarantees; use it when brand guidelines demand the literal color, and review accessibility yourself.</p>
        </section>

        <section>
          <h2>Getting your colors out</h2>
          <p>The system is meant to leave the demo and go into your tools. Two paths:</p>
          <ul>
            <li><b>CSS custom properties:</b> the full set of primitives and semantic roles as CSS variables, for light and dark.</li>
            <li><b>Figma variables:</b> export the system as Figma variables to drop into a Figma library.</li>
          </ul>
          <p>Both carry the same values the demo renders, so what you preview is what you ship.</p>
        </section>
      </div>
    </div>
  )
}

const DOCS_CSS = `
.docs { color: var(--fg-default); }
.docs-inner { max-width: 760px; margin: 0 auto; padding: 40px 24px 72px; }
.docs-head h1 { font-size: 28px; font-weight: 700; margin: 0 0 6px; }
.docs-lede { font-size: 15px; line-height: 1.6; color: var(--fg-subtle); margin: 0; }
.docs section { margin-top: 44px; }
.docs h2 { font-size: 20px; font-weight: 700; margin: 0 0 14px; padding-bottom: 8px; border-bottom: 1px solid var(--border-subtle); }
.docs h3 { font-size: 15px; font-weight: 700; margin: 24px 0 8px; }
.docs p { font-size: 14px; line-height: 1.7; margin: 0 0 12px; }
.docs ul { font-size: 14px; line-height: 1.7; margin: 0 0 12px; padding-left: 20px; }
.docs li { margin-bottom: 6px; }
.docs a { color: var(--fg-link); }
.docs-caption { font-size: 12px; color: var(--fg-subtle); margin: 18px 0 8px; }
.docs-ramp { display: grid; grid-template-columns: repeat(12, 1fr); gap: 4px; margin: 0 0 4px; }
.docs-ramp-cell { aspect-ratio: 1 / 1; border-radius: 5px; border: 1px solid var(--border-subtle); }
.docs-ramp-nums { display: grid; grid-template-columns: repeat(12, 1fr); gap: 4px; margin: 0 0 24px; font-size: 10px; color: var(--fg-subtle); text-align: center; }
.docs-roles { width: 100%; border-collapse: collapse; font-size: 13px; margin: 8px 0 6px; }
.docs-roles th { text-align: left; font-weight: 600; color: var(--fg-subtle); border-bottom: 1px solid var(--border-subtle); padding: 8px; }
.docs-roles td { border-bottom: 1px solid var(--border-subtle); padding: 8px; vertical-align: middle; }
.docs-chip { display: inline-block; width: 14px; height: 14px; border-radius: 3px; border: 1px solid var(--border-subtle); margin-right: 8px; vertical-align: -2px; }
.docs-note { font-size: 12px; color: var(--fg-subtle); margin-top: 0; }
.docs-badge { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; background: var(--alert-med-bg-subtle); color: var(--alert-med-fg); padding: 2px 8px; border-radius: 999px; vertical-align: middle; margin-left: 6px; }
`

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
}
.app-footer-link:hover { background: var(--surface-sunken); color: var(--fg-default); }
.app-footer-link.active { color: var(--fg-default); }
`
