import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Check, TriangleAlert, Sparkles, ArrowRight, ChevronDown, ChevronUp,
  LayoutDashboard, FolderKanban, ListTodo, BarChart3, Users, Settings, Search, Download, Plus, Info, X,
} from 'lucide-react'
import { resolveBrand, SIGNAL_SCALES } from '../src/engine/resolve'
import { checkAllCollisions } from '../src/engine/collision'
import { SIGNALS } from '../src/engine/signals'
import { brandCss, toHex } from '../src/engine/cssRender'
import { themeToFigma } from '../src/engine/figmaRender'
import { makeZip } from './zip'
import { inRedBand, type NeutralLevel } from '../src/engine/colorEngine'
import { wcagY, contrastRatio } from '../src/engine/constraints'
import { HERO_ILLO } from './heroIllo'
import {
  BanIcon, Segmented,
  normalizeHex, rybRotate,
  type RungMode, type AccentMode,
} from './shared'
import { TokenCards, type RampKind } from './TokenCards'
import { classifyArchetype } from '../src/engine/archetypes'
import type { ResolvedBrand } from '../src/engine/resolve'

// The neutral is GENERATED from the brand hue (no more Radix families) — the
// menu picks the tint LEVEL: pure (flat gray), default (the Radix-measured
// tint), or branded (an amplified, intentionally-tinted neutral).
function NeutralSelect({ value, onChange }: {
  value: NeutralLevel
  onChange: (v: NeutralLevel) => void
}) {
  const levels: Array<[NeutralLevel, string]> = [
    ['pure', 'Pure (gray)'],
    ['default', 'Default (brand-tinted)'],
    ['branded', 'Branded (intense tint)'],
  ]
  return (
    <select value={value} onChange={e => onChange(e.target.value as NeutralLevel)}>
      {levels.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
    </select>
  )
}

// "Custom theme" page — two views (Palette workshop / Preview) sharing ONE
// persistent horizontal controls bar pinned at the top, so editing is live
// on both views and there is a single source of truth for every color.

type View = 'palette' | 'preview'

export default function CustomTheme({ dark, onToggleDark }: { dark: boolean; onToggleDark: () => void }) {
  const [primaryInput, setPrimaryInput] = useState('#E93D82')
  const [accentOpen, setAccentOpen] = useState(false)
  const [secondaryInput, setSecondaryInput] = useState('')
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [rung, setRung] = useState<RungMode>('recommended')
  // Accent preview: two options shown only when an accent is set —
  // Default = 'accented', Inverse = 'accented-inverse'. Init 'accented' so
  // adding an accent shows it immediately.
  const [accentMode, setAccentMode] = useState<AccentMode>('accented')
  // Neutral tint level (the neutral is always generated from the brand hue now).
  const [neutralLevel, setNeutralLevel] = useState<NeutralLevel>('default')
  const [view, setView] = useState<View>('palette')

  // Suggestions and the theme always derive from the last VALID hex, so a
  // half-edited input never blanks the chips or flashes a fallback theme.
  const lastValidPrimary = useRef('#E93D82')
  const parsedPrimary = normalizeHex(primaryInput)
  if (parsedPrimary) lastValidPrimary.current = parsedPrimary
  const primary = parsedPrimary ?? lastValidPrimary.current
  // Real error treatment in the sign-in flow: anything that isn't a hex
  // (an hsl() string, a color name) earns the actual error field state.
  const primaryInvalid = primaryInput.trim() !== '' && !parsedPrimary

  const lastValidSecondary = useRef<string | null>(null)
  const parsedSecondary = normalizeHex(secondaryInput)
  if (parsedSecondary) lastValidSecondary.current = parsedSecondary
  const secondary = accentOpen ? (parsedSecondary ?? (secondaryInput ? lastValidSecondary.current : null)) : null

  // Close the suggestion popover on outside click
  const popoverRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!suggestOpen) return
    const onDown = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) setSuggestOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [suggestOpen])

  const computed = useMemo(() => {
    const opts = rung === 'exact' ? { exact: true } : undefined
    const r = resolveBrand(primary, 'Custom brand', opts)
    const accent = secondary ? resolveBrand(secondary, 'Custom accent', opts).scale : null
    // brandCss now emits the per-brand neutral too, at the chosen level.
    return { r, accent, css: brandCss('custom', 'Custom brand', r, accent, '', neutralLevel) }
  }, [primary, secondary, rung, neutralLevel])

  // The RECOMMENDED resolution, always — exact mode skips the rules, so the
  // checklist and toasts need to know what WOULD have fired to flag it red.
  const rRec = useMemo(() => resolveBrand(primary, 'Custom brand'), [primary])
  // Same for the accent — its engine decisions reuse the brand↔signal
  // checklist (collisions with error/warning/etc.), shown only when a
  // secondary is set.
  const rRecAccent = useMemo(() => (secondary ? resolveBrand(secondary, 'Custom accent') : null), [secondary])

  // Signals the accent reads too close to (hue gate + ΔE, light AND dark).
  // We don't reshape the accent — it's the user's pick — so a collision is
  // surfaced as advice to choose a more distinct hex.
  const accentCollisions = useMemo<Array<'red' | 'yellow' | 'green' | 'info-color'>>(() => {
    if (!rRecAccent) return []
    const sigScales = new Map([...SIGNAL_SCALES].map(([n, v]) => [n, v.scale]))
    return checkAllCollisions(rRecAccent.scale, sigScales).collidesWith
  }, [rRecAccent])

  // Collision/caveat notices as dismissible toasts. Keys include the
  // primary so a new color re-surfaces them.
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  // Critical collisions render INLINE: exact-mode collision = bright-yellow
  // warning under the hex input; recommended-mode re-anchor = text-style
  // alert under the mode toggle. Toasts keep only the milder notices.
  const toasts = useMemo(() => {
    const list: Array<{ key: string; kind: 'warn' | 'info'; text: string }> = []
    if (rung === 'recommended' && rRec.errorComponentRule) list.push({
      key: `cr:${primary}`, kind: 'warn',
      text: 'Collision notice: this primary neighbors the error signal. Your color is kept exactly — destructive buttons render as outlines next to brand buttons.',
    })
    if (rung === 'exact' && !rRec.rung1) list.push({
      key: `ex:${primary}`, kind: 'info',
      text: 'Exact mode: your hex ships untouched. Accessibility outcomes are reviewed with you rather than guaranteed by the engine.',
    })
    if (accentCollisions.length) {
      const names = accentCollisions.join(' and ')
      const plural = accentCollisions.length > 1
      list.push({
        key: `ac:${secondary}:${accentCollisions.join(',')}`, kind: 'warn',
        text: `Accent notice: your accent reads close to the ${names} signal color${plural ? 's' : ''}. They may be hard to tell apart in the UI — consider a more distinct accent.`,
      })
    }
    return list
  }, [primary, rung, rRec, secondary, accentCollisions])

  // brandCss already includes the per-brand neutral, so the injected CSS is the
  // whole theme — no separate neutral block.
  const overrideCss = computed.css

  const handleExportFigma = () => {
    // Merge base signals with this brand's per-signal overrides, so the export
    // carries the final error/warning/success/info each brand actually ships.
    const signals = SIGNALS.map(s => {
      const override = computed.r.signalOverrides.find(o => o.name === s.name)
      return { name: s.name, scale: override?.scale ?? SIGNAL_SCALES.get(s.name)!.scale }
    })
    // The neutral is generated per brand at the chosen level (matches the preview).
    const figma = themeToFigma(computed.r, { accent: computed.accent, neutralLevel, signals })
    // One ZIP, not two downloads — browsers block multiple programmatic
    // downloads from a single click. The filenames inside become the Figma
    // mode names on import (Light / Dark).
    const zip = makeZip([
      { name: 'Light.json', content: JSON.stringify(figma.light, null, 2) },
      { name: 'Dark.json', content: JSON.stringify(figma.dark, null, 2) },
    ])
    const url = URL.createObjectURL(zip)
    const a = document.createElement('a')
    a.href = url; a.download = 'figma-variables.zip'
    document.body.appendChild(a); a.click(); a.remove()
    URL.revokeObjectURL(url)
  }

  const shipsHex = toHex(computed.r.scale.light[8].r, computed.r.scale.light[8].g, computed.r.scale.light[8].b).toUpperCase()

  // ── Persistent horizontal controls bar — the single source of truth for
  // every color, pinned under the navbar on BOTH views, so editing is live
  // everywhere (change the primary on Preview, the demo themes under you).
  const controlsBar = (
    <div className="ct-bar">
      <div className="ct-bar-field">
        <div className="ct-label">Primary color</div>
        <div className={`ct-field ct-field-color${primaryInvalid ? ' err' : ''}`}>
          <label className="ct-swatch-btn" title="Open color picker">
            <span className="ct-swatch" style={{ background: primary }} />
            <input type="color" value={primary} onChange={e => setPrimaryInput(e.target.value.toUpperCase())} />
          </label>
          <input value={primaryInput} onChange={e => setPrimaryInput(e.target.value)} spellCheck={false} placeholder="#E93D82" />
        </div>
      </div>

      <div className="ct-bar-field" style={{ position: 'relative' }} ref={popoverRef}>
        <div className="ct-label">Accent color</div>
        <div className="ct-field ct-field-color">
          <label className="ct-swatch-btn" title="Open color picker">
            <span className="ct-swatch" style={{ background: secondary ?? 'var(--neutral-wash-5)' }} />
            <input type="color" value={secondary ?? primary} onChange={e => { setSecondaryInput(e.target.value.toUpperCase()); setAccentOpen(true) }} />
          </label>
          <input value={secondaryInput} placeholder="enter a hex" onChange={e => { setSecondaryInput(e.target.value); setAccentOpen(true) }} spellCheck={false} />
          {/* one trailing button: suggestions when empty, clear once filled */}
          {secondary ? (
            <button className="ct-iconbtn" title="Remove accent"
              onClick={() => { setAccentOpen(false); setSecondaryInput(''); setSuggestOpen(false); setAccentMode('accented') }}>
              <X size={14} />
            </button>
          ) : (
            <button className="ct-iconbtn" title="Suggested pairings" onClick={() => setSuggestOpen(o => !o)}>
              <Sparkles size={14} />
            </button>
          )}
        </div>
        {suggestOpen && (
          <div className="ct-popover">
            <div style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>Suggested from your primary</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {([['Complementary', 180], ['60°', 60], ['30°', 30]] as Array<[string, number]>).map(([label, deg]) => (
                <button key={label} className="ct-suggest" onClick={() => { setSecondaryInput(rybRotate(primary, deg)); setAccentOpen(true); setSuggestOpen(false) }}>
                  <span className="ct-swatch sm" style={{ background: rybRotate(primary, deg) }} />
                  {label}
                </button>
              ))}
            </div>
            {secondary && (
              <button className="ct-remove" onClick={() => { setAccentOpen(false); setSecondaryInput(''); setSuggestOpen(false); setAccentMode('accented') }}>
                <BanIcon size={13} /> Remove accent
              </button>
            )}
          </div>
        )}
      </div>

      <div className="ct-bar-field">
        <div className="ct-label">Neutral color</div>
        <div className="ct-field">
          <span className="ct-swatch" style={{ background: 'var(--neutral-highlight-9)' }} />
          <NeutralSelect value={neutralLevel} onChange={setNeutralLevel} />
        </div>
      </div>

      {/* keep preview + engine-mode together; wrap as one group, left-aligned */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px 18px', flexWrap: 'wrap' }}>
        {secondary && (
          <div className="ct-bar-field">
            <div className="ct-label">Accent preview</div>
            <Segmented value={accentMode} onChange={setAccentMode} options={[['accented', 'Default'], ['accented-inverse', 'Inverse']]} />
          </div>
        )}
        <div className="ct-bar-field">
          <div className="ct-label">Color engine mode</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Segmented value={rung} onChange={setRung} options={[['recommended', 'Recommended'], ['exact', 'Exact']]} />
            <span className="ct-info">
              ⓘ
              <span className="ct-tip">
                Recommended applies the engine's adjustments — collisions, contrast, dark mode — and is
                WCAG-AA by construction. Exact ships your hex untouched; accessibility outcomes are
                reviewed with you rather than guaranteed.
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )

  // A color's scale + its collapsed engine decisions. Signals surface as
  // rows INSIDE each checklist (error/warning collisions), never as cards.
  const colorBlock = (label: string, prefix: string, kind: RampKind, r: ResolvedBrand | null, hex: string, extras?: React.ReactNode) => (
    <div className="ct-colorblock">
      <div className="ct-label" style={{ marginBottom: 8 }}>{label}</div>
      <TokenCards prefix={prefix} kind={kind} />
      {extras}
      {r && <EngineChecklist rRec={r} rung={rung} primaryHex={hex} />}
    </div>
  )

  // Signal ramps, so the per-brand signal shifts (yellow/green/info-color) are
  // visually checkable in-app. Override note shown when this brand shifted a
  // signal away for extra distance. red is never shifted (engine owns red).
  const SIGNAL_NAMES = ['red', 'yellow', 'green', 'info-color'] as const
  // Each signal gets its OWN card block (like brand/neutral) — titled by its real
  // token name. "shifted · …" shows when this brand pushed the signal off-canonical.
  const signalBlocks = () => SIGNAL_NAMES.map(name => {
    const override = computed.r.signalOverrides.find(o => o.name === name)
    return (
      <div className="ct-colorblock" key={name}>
        <div className="ct-label" style={{ marginBottom: 8, display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span>{name}</span>
          {override && <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--info-fg)' }}>shifted · {override.note}</span>}
        </div>
        <TokenCards prefix={name} kind="signal" />
      </div>
    )
  })

  // TEMP — flat compare grid of every generated color (all ramps × all stops), for
  // eyeballing the scale. cta-1/2 sit at the END so the 1–12 ladder reads unbroken.
  // Each cell shows the token representatively: surfaces as plain swatches,
  // highlight/cta as "Aa" on their on-color, ink as "Aa" text, identity as an "ID"
  // chip (blank-but-spaced when a ramp has none, so columns stay justified). Themes
  // with the page toggle.
  const SWATCH_STOPS = ['paper-1', 'paper-2', 'wash-3', 'wash-4', 'wash-5', 'accent-6', 'accent-7', 'accent-8', 'highlight-9', 'highlight-10', 'ink-11', 'ink-12', 'cta-1', 'cta-2']
  const swatchRamps: Array<[string, string, boolean]> = [
    ['brand', 'brand', true],
    ...(secondary ? [['secondary', 'secondary', true] as [string, string, boolean]] : []),
    ['neutral', 'neutral', false],
    ['red', 'red', false], ['yellow', 'yellow', false], ['green', 'green', false], ['info-color', 'info-color', false],
  ]
  const swatchCell = (prefix: string, stop: string) => {
    const cv = (t: string) => `var(--${prefix}-${t})`
    const aa: React.CSSProperties = { height: 36, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }
    if (stop.startsWith('highlight')) return <div style={{ ...aa, background: cv(stop), color: cv('on-highlight') }}>Aa</div>
    if (stop.startsWith('cta')) return <div style={{ ...aa, background: cv(stop), color: cv('on-cta') }}>Aa</div>
    if (stop.startsWith('ink')) return <div style={{ ...aa, color: cv(stop) }}>Aa</div>
    return <div style={{ height: 36, borderRadius: 6, background: cv(stop), border: '1px solid var(--border-subtle)' }} />
  }
  const swatchMatrix = () => (
    <div className="ct-colorblock">
      <div style={{ display: 'grid', gridTemplateColumns: `64px repeat(${SWATCH_STOPS.length + 1}, 1fr)`, gap: 5, alignItems: 'center' }}>
        {swatchRamps.flatMap(([prefix, label, hasId]) => [
          <div key={`${prefix}-l`} style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-default)', whiteSpace: 'nowrap' }}>{label}</div>,
          <div key={`${prefix}-id`} title={hasId ? `--${prefix}-identity` : undefined}>
            {hasId
              ? <div style={{ height: 36, borderRadius: 6, background: `var(--${prefix}-identity)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>ID</div>
              : <div style={{ height: 36 }} />}
          </div>,
          ...SWATCH_STOPS.map(s => (
            <div key={`${prefix}-${s}`} title={`--${prefix}-${s}`}>{swatchCell(prefix, s)}</div>
          )),
        ])}
      </div>
    </div>
  )

  const primaryExtras = (
    <>
      {primaryInvalid && (
        <div className="ct-err-note">⚠ That doesn't look like a hex — try something like #E93D82</div>
      )}
      {rung === 'recommended' && shipsHex !== primary.toUpperCase() && (
        <span className="ct-ships-as">
          <span className="ct-swatch sm" style={{ background: primary }} />{primary.toUpperCase()}
          <ArrowRight size={12} />
          <span className="ct-swatch sm" style={{ background: shipsHex }} />{shipsHex}
        </span>
      )}
      {rung === 'exact' && rRec.rung1 && (
        <div className="ct-alert-warn">
          <TriangleAlert size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            Color conflicts with error red — darker primary color recommended.{' '}
            <a href="#" onClick={e => e.preventDefault()} title="Documentation link — coming">Learn more</a>
          </span>
        </div>
      )}
      {rung === 'recommended' && rRec.rung1 && (
        <div className="ct-alert-text">
          <TriangleAlert size={13} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            Collision notice: this primary sits in the error signal's register. Recommended mode
            re-anchored it darker so destructive actions stay unmistakable.
          </span>
        </div>
      )}
    </>
  )

  return (
    <div data-brand="custom" data-theme={dark ? 'dark' : 'light'} data-accent-mode={secondary ? accentMode : 'default'} style={{ background: 'var(--surface-base)', color: 'var(--fg-default)', minHeight: '100%', position: 'relative' }}>
      <style>{overrideCss}</style>
      <style>{PAGE_CSS}</style>

      {/* ── App nav: product navbar, themed by the palette. Palette/Preview
          tabs + the Download (Figma export) primary action. ── */}
      <div className="ct-appnav">
        <span className="ct-logo-mark">◈</span>
        <span className="ct-brandname">yourBrand</span>
        <span style={{ flex: 1 }} />
        {([['palette', 'Palette'], ['preview', 'Preview']] as Array<[View, string]>).map(([v, label]) => (
          <button key={v} className={`ct-apptab${view === v ? ' active' : ''}`} onClick={() => setView(v)}>{label}</button>
        ))}
        <button className="u-btn u-btn-primary ct-download"
          title="Download figma-variables.zip (Light.json + Dark.json) — unzip, then import both into a new Figma collection"
          onClick={handleExportFigma}>
          <Download size={14} /> Download
        </button>
      </div>

      {/* ── Persistent controls bar — present on both views ── */}
      {controlsBar}

      {/* ── Palette: workshop. Left = scales + collapsed decisions; right =
          live illustration (hidden under 980px). ── */}
      {view === 'palette' && (
        <div className="ct-pane">
          <div className="ct-pane-main">
            {swatchMatrix()}
            {colorBlock('Primary scale', 'brand', 'brand', rRec, primary, primaryExtras)}
            {secondary && colorBlock('Secondary scale', 'secondary', 'brand', rRecAccent, secondary)}
            {colorBlock(`Neutral scale — ${neutralLevel} tint`, 'neutral', 'neutral', null, primary)}
            {signalBlocks()}
          </div>
          <div className="ct-illus">
            <div style={{ width: 'min(440px, 92%)' }} dangerouslySetInnerHTML={{ __html: HERO_ILLO }} />
          </div>
        </div>
      )}

      {/* ── Preview: the applied demo UI + export. No editable controls here —
          the persistent bar above stays live. ── */}
      {view === 'preview' && <Dashboard hasSecondary={!!secondary} />}

      {/* toast stack — engine findings as dismissible notices */}
      <div className="ct-toasts">
        {toasts.filter(t => !dismissed.has(t.key)).map(t => (
          <div key={t.key} className="ct-toast" style={t.kind === 'warn'
            ? { background: 'var(--alert-med-bg-subtle)', borderColor: 'var(--alert-med-border-subtle)', color: 'var(--alert-med-fg)' }
            : { background: 'var(--info-bg-subtle)', borderColor: 'var(--info-border-subtle)', color: 'var(--info-fg)' }}>
            <span style={{ flex: 1 }}>{t.kind === 'warn' ? '⚠ ' : 'ⓘ '}{t.text}</span>
            <button onClick={() => setDismissed(s => new Set(s).add(t.key))} title="Dismiss">✕</button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Engine checklist — password-requirements style ─────────────────────────
// Four row states: ✓ passes checks unchanged, ✨ altered to pass checks,
// → standard logic applied, ⚠ unresolved.

type CheckTone = 'pass' | 'adjusted' | 'standard' | 'fail'
interface CheckRow { key: string; tone: CheckTone; label: string; detail: string }

function checklistRows(rRec: ResolvedBrand, rung: RungMode, primaryHex: string): CheckRow[] {
  const origArch = classifyArchetype(rRec.scale.brandL)
  const rec = rung === 'recommended'
  const rows: CheckRow[] = []
  const shipsHex = toHex(rRec.scale.light[8].r, rRec.scale.light[8].g, rRec.scale.light[8].b).toUpperCase()

  if (rRec.rung1) {
    rows.push(rec
      ? { key: 'hue', tone: 'adjusted', label: `conflict with error red resolved — ${primaryHex.toUpperCase()} → ${shipsHex}`, detail: 'This primary sits in the error signal\'s register. The primary color is darkened per UX best practices so destructive actions stay unmistakable; your hue is kept.' }
      : { key: 'hue', tone: 'fail', label: 'color conflicts with error red — darker primary recommended', detail: 'Exact mode ships the hex untouched, so the error-signal conflict is not resolved at the color level. Destructive buttons render as outlines everywhere as a backstop.' })
  } else if (rRec.errorComponentRule) {
    rows.push(rec
      ? { key: 'hue', tone: 'adjusted', label: `${origArch} + error-adjacent hue → component rule`, detail: 'A warm-side neighbor of the error signal. Your color is kept exactly; destructive buttons render as outlines in button groups, with a required icon.' }
      : { key: 'hue', tone: 'fail', label: `${origArch} + error-adjacent hue — components only`, detail: 'Exact mode: the hue ships as-is. Destructive buttons render as outlines everywhere.' })
  } else {
    rows.push({ key: 'hue', tone: 'pass', label: `${origArch} archetype, no signal conflicts`, detail: 'The hue clears every signal gate; the fill anchors at your exact color.' })
  }

  if (inRedBand(rRec.scale.brandH)) {
    rows.push({ key: 'redcool', tone: 'standard', label: 'standard red hue shift applied', detail: 'Warm reds rotate the fill a few degrees cool at render time, away from error red. Every decision is made on your raw hue first — this is presentation only.' })
  }

  if (rRec.warningVariant === 'lemon') {
    rows.push({ key: 'warn', tone: rec ? 'adjusted' : 'fail', label: 'warning signal shifted to a cooler yellow', detail: 'This brand owns the warm gold range, so the warning signal moves to a cooler yellow to stay clearly distinct from brand surfaces.' })
  } else if (rRec.warningVariant === 'macaroni') {
    rows.push({ key: 'warn', tone: 'standard', label: 'warning signal kept standard amber', detail: 'A cool-yellow brand: the standard amber warning is already clearly distinct.' })
  }

  rows.push(rRec.darkCollider
    ? { key: 'dark', tone: rec ? 'adjusted' : 'fail', label: 'dark mode: fill floats to the pastel register', detail: 'In dark mode the brand fill and error red would meet; the brand floats to a pastel register and picks up black text — two extra separation channels.' }
    : rec
      ? { key: 'dark', tone: 'pass', label: 'dark mode: calculated from brand color', detail: 'The dark palette derives from your brand color on the same rules — fills only lift when they would vanish on a dark background.' }
      : { key: 'dark', tone: 'pass', label: 'dark mode preserves identity', detail: 'Dark mode only lifts fills that would vanish — never pulls a vivid fill down, never cuts its chroma.' })

  if (rec) {
    rows.push({ key: 'a11y', tone: 'pass', label: 'contrast optimized with APCA, fills clear WCAG AA', detail: 'APCA picks the on-fill text polarity; WCAG 4.5:1 bounds every fill in both modes, by construction, verified on every build.' })
  } else {
    // Exact mode: text color is still optimized (APCA picks the better of
    // black/white) — but the engine may not darken the fill, so the WCAG
    // pass depends on where the hex sits. Computed live:
    const ex = resolveBrand(primaryHex, 'x', { exact: true })
    const fillOk = (s: { L: number; C: number; H: number }, white: boolean) => {
      const y = wcagY(s.L, s.C, s.H)
      return (white ? contrastRatio(1.0, y) : contrastRatio(y, 0)) >= 4.5
    }
    const lightOk = fillOk(ex.scale.light[8], ex.scale.onFillTextIsWhite)
    const darkOk = fillOk(ex.scale.dark[8], ex.scale.onFillTextIsWhiteDark)
    rows.push(lightOk && darkOk
      ? { key: 'a11y', tone: 'pass', label: 'contrast passes — WCAG AA + APCA on the unmodified hex', detail: 'Text color is APCA-optimized and this fill clears WCAG 4.5:1 in both modes as-is. The engine just isn\'t allowed to fix it if a future edit breaks it.' }
      : { key: 'a11y', tone: 'fail', label: `fill fails WCAG AA in ${!lightOk && !darkOk ? 'both modes' : !lightOk ? 'light mode' : 'dark mode'} — recommended mode would fix it`, detail: 'Text color is still APCA-optimized (best possible choice), but exact mode forbids darkening the fill to the compliant edge, so the pair falls short of WCAG 4.5:1.' })
  }

  if (rRec.pending.length) {
    rows.push({ key: 'pending', tone: 'standard', label: `pending: ${rRec.pending.join(', ')} overlap`, detail: 'Detected but intentionally unresolved — the softened treatment for non-critical signals is still in design.' })
  }

  rows.push(rec
    ? { key: 'verdict', tone: 'adjusted', label: 'recommendations accepted — optimal UX color logic applied', detail: 'Every engine adjustment is active: collisions, contrast, dark mode.' }
    : { key: 'verdict', tone: 'fail', label: 'recommendations rejected — UX not recommended', detail: 'Exact mode ships the hex untouched; the adjustments above are off.' })
  return rows
}

const TONE_META: Record<CheckTone, { Icon: typeof Check; color: string }> = {
  pass: { Icon: Check, color: 'var(--positive-fg)' },
  adjusted: { Icon: Sparkles, color: 'var(--fg-link)' },
  standard: { Icon: ArrowRight, color: 'var(--fg-subtle)' },
  fail: { Icon: TriangleAlert, color: 'var(--alert-med-fg)' },
}

// Collapsible (default COLLAPSED — there will be one per color and the
// card must not scroll on input). Header shows the aggregate state; rows
// are compact, divider-free, with the why in a hover tooltip.
function EngineChecklist({ rRec, rung, primaryHex }: { rRec: ResolvedBrand; rung: RungMode; primaryHex: string }) {
  const [open, setOpen] = useState(false)
  const rows = checklistRows(rRec, rung, primaryHex)
  const aggregate: CheckTone = rows.some(r => r.tone === 'fail') ? 'fail'
    : rows.some(r => r.tone === 'adjusted') ? 'adjusted' : 'pass'
  const Agg = TONE_META[aggregate].Icon
  const Caret = open ? ChevronUp : ChevronDown
  return (
    <div style={{ marginTop: 10 }}>
      <button className="ct-check-header" onClick={() => setOpen(o => !o)}>
        <span style={{ color: TONE_META[aggregate].color, display: 'inline-flex' }}><Agg size={13} /></span>
        <span style={{ fontWeight: 600 }}>Color engine decisions</span>
        <span style={{ marginLeft: 'auto', color: 'var(--fg-subtle)', display: 'inline-flex' }}><Caret size={13} /></span>
      </button>
      {open && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {rows.map(row => {
            const { Icon, color } = TONE_META[row.tone]
            return (
              <div key={row.key} className="ct-check">
                <span style={{ color, width: 16, flexShrink: 0, display: 'inline-flex', alignItems: 'center' }}><Icon size={12} /></span>
                <span style={{ color: row.tone === 'fail' ? TONE_META.fail.color : 'var(--fg-default)' }}>{row.label}</span>
                <span className="ct-tip">{row.detail}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Preview: a realistic SaaS dashboard, themed live by the palette. Uses
// every family — brand (nav, primary), accent (secondary highlight when set),
// neutral (surfaces, text), the signals (status), and the live illustration. ─

const dashCard: React.CSSProperties = {
  background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)',
  borderRadius: 14, padding: 18,
}

function Dashboard({ hasSecondary }: { hasSecondary: boolean }) {
  const nav: Array<[typeof LayoutDashboard, string, boolean?]> = [
    [LayoutDashboard, 'Dashboard', true], [FolderKanban, 'Projects'], [ListTodo, 'Tasks'],
    [BarChart3, 'Analytics'], [Users, 'Team'], [Settings, 'Settings'],
  ]
  return (
    <div className="dash">
      <aside className="dash-side">
        <div className="dash-logo"><span className="dash-logo-mark">◈</span> yourBrand</div>
        <nav className="dash-nav">
          {nav.map(([Icon, label, active]) => (
            <a key={label} href="#" className={`dash-navitem${active ? ' active' : ''}`} onClick={e => e.preventDefault()} title="For demo purposes only">
              <Icon size={16} aria-hidden /> {label}
            </a>
          ))}
        </nav>
        <div className="dash-user">
          <span className="dash-avatar">SR</span>
          <div style={{ lineHeight: 1.25, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>Sam Rivera</div>
            <div style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>Admin</div>
          </div>
        </div>
      </aside>

      <main className="dash-main">
        <div className="dash-topbar">
          <div style={{ fontSize: 18, fontWeight: 700 }}>Dashboard</div>
          <div className="dash-search"><Search size={14} aria-hidden /> Search…</div>
          <span style={{ flex: 1 }} />
          <button className="u-btn u-btn-subtle" style={{ padding: '6px 12px', fontSize: 13 }} title="Placeholder — export coming"><Download size={14} /> Export</button>
          <button className="u-btn u-btn-primary" style={{ padding: '6px 14px', fontSize: 13 }}><Plus size={14} /> New project</button>
        </div>

        <div className="dash-info">
          <Info size={14} style={{ flexShrink: 0 }} aria-hidden />
          <span>Your trial ends in 5 days.</span>
          <a href="#" onClick={e => e.preventDefault()}>Upgrade plan</a>
        </div>

        <div className="dash-metrics">
          <Metric label="Active projects" value="24" delta="+3 this week" tone="brand" />
          <Metric label="Tasks completed" value="182" delta="+18%" tone="positive" />
          <Metric label="In review" value="9" delta="2 new" tone="info" />
          <Metric label="Open issues" value="7" delta="−4" tone="alert-high" />
        </div>

        <div className="dash-grid">
          <section style={{ ...dashCard, gridColumn: 'span 2', padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '18px 18px 4px' }}><Head title="Customers" sub="Latest sign-ups and account health" /></div>
            <CustomersTable hasSecondary={hasSecondary} />
          </section>

          <section style={dashCard}>
            <Head title="Get started" />
            <div style={{ background: 'var(--surface-sunken)', borderRadius: 12, padding: '16px 0', marginBottom: 12 }}>
              <div data-illustration={hasSecondary ? 'two-color' : undefined}
                style={{ width: '78%', margin: '0 auto' }}
                dangerouslySetInnerHTML={{ __html: HERO_ILLO }} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--fg-subtle)', textAlign: 'center', marginBottom: 12 }}>
              Invite your team and spin up your first project.
            </div>
            <button className="u-btn u-btn-subtle" style={{ width: '100%', justifyContent: 'center' }}>Create project</button>
          </section>

          <section style={{ ...dashCard, gridColumn: 'span 2' }}>
            <Head title="Recent tasks" sub="Across all projects" />
            <Task name="Design system audit" who="Priya N." status="done" />
            <Task name="Onboarding flow copy" who="Marco L." status="active" />
            <Task name="Checkout edge cases" who="Sam R." status="review" />
            <Task name="Migrate auth provider" who="Dana K." status="blocked" />
          </section>

          <section style={dashCard}>
            <Head title="Activity" />
            <Feed who="Priya" what="closed 3 tasks" when="2m" tone="positive" />
            <Feed who="Marco" what="commented on Onboarding" when="1h" tone="info" />
            <Feed who="Dana" what="opened an issue" when="3h" tone="alert-high" />
            <Feed who="Sam" what="shipped v2.1" when="1d" tone="brand" />
          </section>
        </div>
      </main>
    </div>
  )
}

function Metric({ label, value, delta, tone }: { label: string; value: string; delta: string; tone: string }) {
  return (
    <div style={{ ...dashCard, padding: 16, background: `var(--${tone}-bg-faint)`, borderColor: `var(--${tone}-border-subtle)` }}>
      <div style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, margin: '4px 0 4px' }}>{value}</div>
      <span style={{ fontSize: 11, fontWeight: 600, color: `var(--${tone}-fg)` }}>{delta}</span>
    </div>
  )
}

function Head({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 14, fontWeight: 700 }}>{title}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{sub}</div>}
    </div>
  )
}

const CUSTOMERS: Array<{ name: string; email: string; plan: string; status: string; mrr: string; seen: string }> = [
  { name: 'Acme Inc.', email: 'ops@acme.com', plan: 'Pro', status: 'active', mrr: '$1,200', seen: '2h ago' },
  { name: 'Globex', email: 'hi@globex.io', plan: 'Starter', status: 'trial', mrr: '$0', seen: '1d ago' },
  { name: 'Initech', email: 'admin@initech.com', plan: 'Pro', status: 'pastdue', mrr: '$1,200', seen: '5d ago' },
  { name: 'Umbrella Co.', email: 'team@umbrella.co', plan: 'Business', status: 'active', mrr: '$4,800', seen: '3h ago' },
  { name: 'Hooli', email: 'dev@hooli.xyz', plan: 'Starter', status: 'churned', mrr: '—', seen: '21d ago' },
]
const CUST_STATUS: Record<string, [string, string]> = {
  active: ['Active', 'positive'], trial: ['Trialing', 'info'],
  pastdue: ['Past due', 'alert-high'], churned: ['Churned', 'alert-med'],
}
function CustomersTable({ hasSecondary }: { hasSecondary: boolean }) {
  return (
    <table className="dash-table">
      <thead>
        <tr><th>Customer</th><th>Plan</th><th>Status</th><th>MRR</th><th>Last active</th></tr>
      </thead>
      <tbody>
        {CUSTOMERS.map(c => {
          const [label, tone] = CUST_STATUS[c.status]
          const premium = c.plan !== 'Starter'
          // Premium plans carry the accent when a secondary exists, else the brand.
          const planBg = premium ? (hasSecondary ? 'var(--secondary-wash-3)' : 'var(--brand-bg-subtle)') : 'var(--surface-sunken)'
          const planFg = premium ? (hasSecondary ? 'var(--secondary-ink-11)' : 'var(--brand-fg)') : 'var(--fg-subtle)'
          return (
            <tr key={c.name}>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="dash-avatar" style={{ width: 28, height: 28, fontSize: 11, background: 'var(--surface-sunken)', color: 'var(--fg-default)', border: '1px solid var(--border-subtle)' }}>{c.name[0]}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{c.email}</div>
                  </div>
                </div>
              </td>
              <td><span className="dash-pill" style={{ background: planBg, color: planFg }}>{c.plan}</span></td>
              <td><span className="dash-pill" style={{ background: `var(--${tone}-bg-subtle)`, color: `var(--${tone}-fg)` }}>{label}</span></td>
              <td style={{ fontWeight: 500 }}>{c.mrr}</td>
              <td style={{ color: 'var(--fg-subtle)' }}>{c.seen}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

const TASK_STATUS: Record<string, [string, string]> = {
  done: ['Done', 'positive'], active: ['In progress', 'info'],
  review: ['In review', 'alert-med'], blocked: ['Blocked', 'alert-high'],
}
function Task({ name, who, status }: { name: string; who: string; status: string }) {
  const [label, tone] = TASK_STATUS[status]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderTop: '1px solid var(--border-subtle)' }}>
      <span style={{ width: 26, height: 26, borderRadius: 999, background: 'var(--brand-bg-subtle)', color: 'var(--brand-fg)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>{who[0]}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{name}</div>
        <div style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{who}</div>
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999, background: `var(--${tone}-bg-subtle)`, color: `var(--${tone}-fg)` }}>{label}</span>
    </div>
  )
}

function Feed({ who, what, when, tone }: { who: string; what: string; when: string; tone: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px solid var(--border-subtle)' }}>
      <span style={{ width: 8, height: 8, borderRadius: 999, flexShrink: 0, background: `var(--${tone}-bg-emphasis)` }} />
      <div style={{ flex: 1, fontSize: 12 }}><span style={{ fontWeight: 600 }}>{who}</span> {what}</div>
      <span style={{ fontSize: 11, color: 'var(--fg-subtle)', flexShrink: 0 }}>{when}</span>
    </div>
  )
}


const PAGE_CSS = `
.dash { display: grid; grid-template-columns: 220px minmax(0, 1fr); min-height: calc(100vh - 165px); background: var(--surface-base); }
.dash-side {
  background: var(--surface-sunken); border-right: 1px solid var(--border-subtle);
  padding: 18px 14px; display: flex; flex-direction: column; gap: 18px;
}
.dash-logo { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 15px; color: var(--brand-fg-alt); }
.dash-logo-mark {
  width: 26px; height: 26px; border-radius: 7px; display: inline-flex; align-items: center; justify-content: center;
  background: var(--brand-bg-emphasis); color: var(--brand-fg-on-emphasis); font-size: 14px; flex-shrink: 0;
}
.dash-nav { display: flex; flex-direction: column; gap: 2px; flex: 1; }
.dash-navitem {
  display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 8px;
  font-size: 13px; color: var(--fg-default); text-decoration: none;
}
.dash-navitem:hover { background: var(--surface-sunken); }
.dash-navitem.active { background: var(--brand-bg-subtle); color: var(--brand-fg); font-weight: 600; }
.dash-user { display: flex; align-items: center; gap: 10px; padding-top: 14px; border-top: 1px solid var(--border-subtle); }
.dash-avatar {
  width: 30px; height: 30px; border-radius: 999px; flex-shrink: 0;
  background: var(--brand-bg-emphasis); color: var(--brand-fg-on-emphasis);
  display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600;
}
.dash-main { padding: 20px 24px 40px; min-width: 0; }
.dash-topbar { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
.dash-search {
  display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--fg-subtle);
  background: var(--surface-sunken); border: 1px solid var(--border-subtle); border-radius: 999px; padding: 7px 14px; min-width: 200px;
}
.dash-info {
  display: flex; gap: 8px; align-items: center; margin-bottom: 16px;
  background: var(--info-bg-subtle); color: var(--info-fg); border: 1px solid var(--info-border-subtle);
  border-radius: 10px; padding: 9px 14px; font-size: 12px;
}
.dash-info a { color: inherit; font-weight: 600; margin-left: auto; }
.dash-metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-bottom: 16px; }
.dash-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
.dash-pill { font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 999px; white-space: nowrap; }
.dash-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.dash-table thead tr { background: var(--surface-sunken); }
.dash-table th {
  text-align: left; font-size: 11px; font-weight: 600; color: var(--fg-subtle);
  padding: 8px 18px; border-top: 1px solid var(--border-subtle); border-bottom: 1px solid var(--border-subtle); white-space: nowrap;
}
.dash-table td { padding: 10px 18px; border-bottom: 1px solid var(--border-subtle); }
.dash-table tbody tr:last-child td { border-bottom: none; }
.dash-table tbody tr:hover { background: var(--surface-sunken); }
.dash-table th:nth-child(n+4), .dash-table td:nth-child(n+4) { text-align: right; }
@media (max-width: 1100px) {
  .dash-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .dash-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 760px) {
  .dash { grid-template-columns: 1fr; }
  .dash-side { flex-direction: row; align-items: center; flex-wrap: wrap; gap: 12px; }
  .dash-nav { flex-direction: row; flex-wrap: wrap; flex: 1 1 100%; }
  .dash-metrics, .dash-grid { grid-template-columns: 1fr; }
}
.ct-appnav {
  position: sticky; top: 0; z-index: 40;
  display: flex; align-items: center; gap: 20px; padding: 0 24px; height: 52px;
  background: var(--brand-paper-2); color: var(--brand-fg-alt);
  border-bottom: 1px solid var(--border-subtle);
  /* The product nav always shows the PRIMARY brand — ignore the accent-preview
     flip. accentModeCss remaps the --brand-* semantic tokens at the root; re-pin
     the ones the chips use to the primary brand primitives (the named scale +
     fill roles, post token-rename). */
  --brand-bg-emphasis: var(--brand-cta-1);
  --brand-bg-emphasis-hover: var(--brand-cta-2);
  --brand-fg-on-emphasis: var(--brand-on-cta);
  --brand-fg: var(--brand-ink-12);
  --brand-fg-alt: var(--brand-ink-11);
  --brand-bg-subtle: var(--brand-wash-3);
  --brand-bg-subtle-hover: var(--brand-wash-4);
}
.ct-download { margin-left: 4px; }
.ct-logo-mark {
  width: 26px; height: 26px; border-radius: 7px; display: inline-flex; align-items: center;
  justify-content: center; background: var(--brand-bg-emphasis); color: var(--brand-fg-on-emphasis);
  font-size: 14px; flex-shrink: 0;
}
.ct-brandname { font-weight: 700; font-size: 14px; margin-left: -10px; color: var(--brand-fg-alt); }
.ct-apptab {
  border: none; cursor: pointer; font-family: inherit; font-size: 13px;
  padding: 6px 12px; border-radius: 999px; background: transparent;
  color: var(--brand-fg-alt); opacity: 0.75;
}
.ct-apptab:hover { opacity: 1; background: var(--brand-bg-subtle); }
.ct-apptab.active { background: var(--brand-bg-subtle); color: var(--brand-fg); opacity: 1; }
.ct-iconbtn {
  display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
  width: 26px; height: 26px; border-radius: 6px; border: none; cursor: pointer;
  background: var(--surface-sunken); color: var(--fg-subtle); font-size: 13px;
  position: relative; overflow: hidden; font-family: inherit;
}
.ct-iconbtn:hover { background: var(--brand-bg-faint); color: var(--fg-default); }
.ct-iconbtn input[type="color"] { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
.ct-swatch-btn { position: relative; display: inline-flex; flex-shrink: 0; cursor: pointer; }
.ct-swatch-btn input[type="color"] { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; }
.ct-alert-warn {
  display: flex; gap: 8px; align-items: flex-start; margin-top: 8px;
  padding: 8px 10px; border-radius: 8px; font-size: 12px; line-height: 1.45;
  background: var(--yellow-wash-4); border: 1px solid var(--yellow-accent-8); color: var(--yellow-ink-12);
}
.ct-alert-warn a { color: inherit; font-weight: 600; }
.ct-alert-text {
  display: flex; gap: 7px; align-items: flex-start; margin-top: 8px;
  font-size: 12px; line-height: 1.45; color: var(--alert-med-fg);
}
.ct-ships-as {
  display: flex; gap: 6px; align-items: center; margin-top: 8px;
  font-size: 12px; font-family: ui-monospace, monospace; color: var(--fg-default);
}
.ct-bar {
  position: sticky; top: 52px; z-index: 35;
  display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px 18px;
  padding: 12px 24px; background: var(--surface-raised);
  border-bottom: 1px solid var(--border-subtle);
}
.ct-bar-field { display: flex; flex-direction: column; gap: 5px; }
/* Size fields to content so the bar fits one row — a hex needs far less than
   the old fixed 240px. The neutral select keeps a comfortable min-width. */
/* Fixed height so a taller child (the ✦ button) can't push one field bigger
   than the rest — all bar fields line up at 38px. */
.ct-bar .ct-field { width: auto; height: 38px; padding: 0 12px; }
.ct-bar .ct-field-color { width: 152px; }
.ct-bar .ct-field-color > input { flex: 1; min-width: 0; }
.ct-bar .ct-field > select { width: 132px; }
.ct-pane {
  display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 0.5fr);
  gap: 24px; padding: 24px; align-items: start;
}
.ct-pane-main { display: flex; flex-direction: column; gap: 20px; min-width: 0; }
.ct-colorblock {
  background: var(--surface-raised); border: 1px solid var(--border-subtle);
  border-radius: 14px; padding: 18px 20px;
}
.ct-illus {
  position: sticky; top: 140px; background: var(--brand-paper-2); border-radius: 16px;
  min-height: 380px; display: flex; align-items: center; justify-content: center; padding: 32px;
}
@media (max-width: 980px) {
  .ct-pane { grid-template-columns: 1fr; }
  .ct-illus { display: none; }
}
.ct-info {
  position: relative; display: inline-flex; align-items: center; justify-content: center;
  width: 20px; height: 20px; border-radius: 999px; cursor: default;
  color: var(--fg-subtle); font-size: 13px;
}
.ct-info:hover { color: var(--fg-default); background: var(--surface-sunken); }
.ct-info .ct-tip { width: 300px; }
.ct-info:hover .ct-tip { display: block; }
.ct-check-header {
  display: flex; align-items: center; gap: 8px; width: 100%; text-align: left;
  border: none; background: none; cursor: pointer; font-family: inherit;
  font-size: 12px; padding: 5px 2px; color: var(--fg-default);
}
.ct-check-header:hover { background: var(--surface-sunken); border-radius: 6px; }
.ct-check {
  position: relative; display: flex; align-items: center; gap: 8px;
  font-size: 12px; padding: 3px 2px 3px 8px; cursor: default;
}
.ct-check:hover { background: var(--surface-sunken); border-radius: 6px; }
.ct-tip {
  display: none; position: absolute; left: 0; bottom: calc(100% + 6px); z-index: 70;
  width: 290px; background: var(--neutral-ink-12); color: var(--neutral-paper-1);
  border-radius: 8px; padding: 9px 11px; font-size: 11px; line-height: 1.5;
  box-shadow: 0 8px 24px rgba(0,0,0,0.25); pointer-events: none;
}
.ct-check:hover .ct-tip { display: block; }
.ct-toasts {
  position: fixed; right: 20px; bottom: 20px; z-index: 60;
  display: flex; flex-direction: column; gap: 10px; width: 360px;
}
.ct-toast {
  display: flex; gap: 10px; align-items: flex-start;
  border: 1px solid; border-radius: 10px; padding: 12px 14px;
  font-size: 12px; line-height: 1.5; box-shadow: 0 8px 24px rgba(0,0,0,0.16);
}
.ct-toast button {
  border: none; background: none; cursor: pointer; color: inherit;
  font-size: 12px; padding: 0; opacity: 0.7; font-family: inherit;
}
.ct-toast button:hover { opacity: 1; }
.ct-label { font-size: 12px; font-weight: 600; color: var(--fg-default); margin-bottom: 5px; }
.ct-field {
  display: flex; align-items: center; gap: 8px; box-sizing: border-box; width: 100%;
  background: var(--surface-raised); border: 1px solid var(--border-default); border-radius: 8px;
  padding: 9px 12px;
}
.ct-field:focus-within { border-color: var(--brand-accent-8); box-shadow: 0 0 0 3px var(--brand-bg-subtle); }
.ct-field input, .ct-field select {
  border: none; outline: none; background: transparent; color: var(--fg-default);
  font-family: inherit; font-size: 13px; flex: 1; min-width: 0;
}
.ct-field input:focus-visible, .ct-field select:focus-visible { outline: none; }
.ct-field.err { border-color: var(--alert-high-border-emphasis); background: var(--alert-high-bg-faint); }
.ct-field.err:focus-within { border-color: var(--alert-high-border-emphasis); box-shadow: 0 0 0 3px var(--alert-high-bg-subtle); }
.ct-err-note { font-size: 11px; color: var(--alert-high-fg-alt); margin-top: 5px; }
.ct-swatch { width: 18px; height: 18px; border-radius: 4px; flex-shrink: 0; border: 1px solid var(--border-subtle); }
.ct-swatch.sm { width: 13px; height: 13px; }
.ct-popover {
  position: absolute; z-index: 40; top: calc(100% + 6px); left: 0; width: 230px;
  background: var(--surface-raised); border: 1.5px solid var(--brand-border-emphasis); border-radius: 12px;
  padding: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  display: flex; flex-direction: column; gap: 8px; align-items: flex-start;
}
.ct-suggest {
  display: inline-flex; align-items: center; gap: 6px; cursor: pointer; font-family: inherit;
  background: var(--surface-sunken); border: 1px solid var(--border-subtle); border-radius: 8px;
  padding: 4px 10px; font-size: 12px; color: var(--fg-default);
}
.ct-suggest:hover { background: var(--brand-bg-faint); }
.ct-remove {
  display: inline-flex; align-items: center; gap: 6px; cursor: pointer; font-family: inherit;
  background: var(--surface-raised); border: 1px solid var(--alert-high-border-default); border-radius: 8px;
  padding: 4px 10px; font-size: 12px; font-weight: 600; color: var(--alert-high-fg-alt);
}
.ct-remove:hover { background: var(--alert-high-bg-subtle); color: var(--alert-high-fg); border-color: var(--alert-high-border-default-hover); }
`
