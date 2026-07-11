import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle, Check, CheckCircle, TriangleAlert, Sparkles, ArrowRight, ChevronDown, ChevronUp,
  LayoutDashboard, FolderKanban, ListTodo, BarChart3, Users, Settings, Search, Download, Plus, Info,
} from 'lucide-react'
import { resolveBrand, resolveTheme, type SecondaryStyle } from '../src/engine/resolve'
import { ARCHETYPES, type Archetype } from '../src/engine/archetypes'
import { brandCss, signalsCss, stopHex } from '../src/engine/cssRender'
import { type NeutralLevel, type ContrastProfile } from '../src/engine/colorEngine'
import { wcagY, contrastRatio } from '../src/engine/constraints'
import { HERO_ILLO } from './heroIllo'
import {
  BanIcon, Segmented,
  normalizeHex,
  type RungMode,
} from './shared'
import { CtaRow, TokenCards, type RampKind } from './TokenCards'
import { classifyArchetype } from '../src/engine/archetypes'
import type { ResolvedBrand } from '../src/engine/resolve'

// The Figma-spec CHIP SELECT (post-hk 60:1384): a VISUAL chip — label + its own 12px
// chevron laid out inline (never the native select arrow, which let copy run under it) —
// with a transparent native <select> overlaid for the actual menu. The chip TINTS with
// the selection (the family's own wash/ink; outline gets the outline treatment; exact
// reads neutral-grey "hands off").
function ChipSelect({ value, label, onChange, tone, children, title }: {
  value: string
  label: string
  onChange: (v: string) => void
  tone: React.CSSProperties
  children: React.ReactNode
  title?: string
}) {
  return (
    <span title={title} style={{
      position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0,
      marginLeft: 'auto', padding: '3px 7px', borderRadius: 4, fontSize: 11.5, fontWeight: 650,
      cursor: 'pointer', whiteSpace: 'nowrap', border: '1px solid transparent', ...tone,
    }}>
      {label}
      <ChevronDown size={12} strokeWidth={2.5} />
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}>
        {children}
      </select>
    </span>
  )
}

// the ⓘ explanation line under each field — the always-visible replacement for the old
// tooltips (owner: "we need an explanation now that we removed the tool tip")
function InfoLine({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6, fontSize: 11.5, color: 'var(--fg-subtle)', whiteSpace: 'nowrap' }}>
      <Info size={14} style={{ flexShrink: 0 }} />
      {text}
    </div>
  )
}

const NEUTRAL_LABELS: Array<[NeutralLevel, string]> = [
  ['default', 'Default'],
  ['branded', 'Intense'],
  ['pure', 'True grey'],
]

// The neutral is GENERATED from the brand hue (no more Radix families) — the menu picks
// the tint LEVEL. Figma-spec field: swatch + the level as the field TEXT + a 26px chevron
// button; the transparent select overlays the WHOLE field so anywhere opens the menu.
function NeutralSelect({ value, onChange }: {
  value: NeutralLevel
  onChange: (v: NeutralLevel) => void
}) {
  return (
    <>
      <span style={{ flex: 1, fontSize: 14, minWidth: 0 }}>{NEUTRAL_LABELS.find(([v]) => v === value)![1]}</span>
      <span className="ct-iconbtn" style={{ pointerEvents: 'none' }}><ChevronDown size={12} strokeWidth={2.5} /></span>
      <select value={value} onChange={e => onChange(e.target.value as NeutralLevel)}
        style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}>
        {NEUTRAL_LABELS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
      </select>
    </>
  )
}

// "Custom theme" page — two views (Palette workshop / Preview) sharing ONE
// persistent horizontal controls bar pinned at the top, so editing is live
// on both views and there is a single source of truth for every color.

type View = 'palette' | 'preview'

export default function CustomTheme({ dark, onToggleDark }: { dark: boolean; onToggleDark: () => void }) {
  const [primaryInput, setPrimaryInput] = useState('#E93D82')
  // The secondary is a three-state field (owner UX): none — just an "Add secondary"
  // button; derived — the field tracks the primary live (the engine derives the subtle
  // tint; no style chip); custom — the user's own hex, style chip shown. Typing in
  // derived mode detaches to custom; the trailing menu moves between all three.
  const [secState, setSecState] = useState<'none' | 'derived' | 'custom'>('none')
  const [secondaryInput, setSecondaryInput] = useState('')
  const [secMenuOpen, setSecMenuOpen] = useState(false)
  // per-family modes (owner design: exact decoupled per family, chips in the fields). The
  // primary's chip = Recommended / Exact / the six archetype anchors; the secondary's chip =
  // Tint / Pastel / Outline / Exact.
  const [primaryMode, setPrimaryMode] = useState<'recommended' | 'exact' | Archetype>('recommended')
  const [secondaryStyle, setSecondaryStyle] = useState<SecondaryStyle>('tint')
  // legacy shape for the checklist/toast logic: anchors count as recommended machinery
  const rung: RungMode = primaryMode === 'exact' ? 'exact' : 'recommended'
  // APCA is the DEFAULT (owner 2026-07-04, the true split): the perceptually-solved look ships;
  // WCAG is the opt-in legal mode — every on-text pole ratio-passing, highlights flip to black
  // where white fails 4.5.
  const [profile, setProfile] = useState<ContrastProfile>('apca')
  // Neutral tint level (the neutral is always generated from the brand hue now).
  const [neutralLevel, setNeutralLevel] = useState<NeutralLevel>('default')
  const [view, setView] = useState<View>('palette')
  const derived = secState === 'derived'

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
  const secondary = secState === 'custom' ? (parsedSecondary ?? (secondaryInput ? lastValidSecondary.current : null)) : null

  // Close the secondary menu on outside click
  const popoverRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!secMenuOpen) return
    const onDown = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) setSecMenuOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [secMenuOpen])

  const computed = useMemo(() => {
    const cp = profile === 'apca' ? ('apca' as const) : undefined
    // THEME-level resolution: primary + signals exactly as before; the secondary resolves against
    // the post-shift signal set. The LEVEL follows the engine mode (owner model: subtle IS the
    // recommendation; a full-register secondary is the exact-mode choice) — no separate control.
    const t = resolveTheme({
      primaryHex: primary, name: 'Custom brand',
      primaryMode: primaryMode === 'exact' ? 'exact' : 'recommended',
      primaryArchetype: primaryMode !== 'recommended' && primaryMode !== 'exact' ? primaryMode : undefined,
      secondaryHex: derived ? null : secondary,
      deriveSecondary: derived || undefined,
      secondaryStyle: derived ? undefined : secondaryStyle,   // derived is always pastel — no chip
      contrastProfile: cp,
    })
    // signals ALWAYS re-emit under the selected profile: the static signals.css now carries the
    // SHIPPED default (apca), so the wcag toggle needs its own override block just like apca did
    const css = brandCss('custom', 'Custom brand', t.themed, t.secondary?.scale ?? null, '', neutralLevel, cp, t.secondary?.style)
      + '\n' + signalsCss(cp)
    return { t, r: t.themed, accent: t.secondary?.scale ?? null, css }
  }, [primary, secondary, derived, primaryMode, secondaryStyle, neutralLevel, profile])

  // The RECOMMENDED resolution, always — exact mode skips the rules, so the
  // checklist and toasts need to know what WOULD have fired to flag it red.
  // PROFILE-AWARE (C12 v6): the red treatment legitimately diverges per lane (a red-move
  // in apca can be a self-exit in wcag), so banners/checklist resolve under the toggle —
  // the old profile-less resolve here silently pinned them to wcag.
  const rRec = useMemo(() => resolveBrand(primary, 'Custom brand', { contrastProfile: profile === 'apca' ? 'apca' : undefined }), [primary, profile])

  // Collision/caveat notices as dismissible toasts. Keys include the
  // primary so a new color re-surfaces them.
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  // Critical collisions render INLINE: exact-mode collision = bright-yellow
  // warning under the hex input; recommended-mode re-anchor = text-style
  // alert under the mode toggle. Toasts keep only the milder notices.
  const toasts = useMemo(() => {
    const list: Array<{ key: string; kind: 'warn' | 'info'; text: string }> = []
    if (rung === 'exact' && !rRec.redRepel && !rRec.signalOverrides.some(o => o.name === 'red')) list.push({
      key: `ex:${primary}`, kind: 'info',
      text: 'Exact mode: your hex ships untouched. Accessibility outcomes are reviewed with you rather than guaranteed by the engine.',
    })
    // theme decisions on the secondary (demotion / residual / close-to-primary), straight from
    // resolveTheme's annotations — the engine now DECIDES instead of just warning
    const secNotes = computed.t.secondary ? [...computed.t.secondary.notes, ...computed.t.notes] : []
    for (const n of secNotes) list.push({
      key: `sn:${secondary}:${n}`,
      kind: n.includes('close to the primary') ? 'warn' : 'info',
      text: `Secondary: ${n}`,
    })
    return list
  }, [primary, rung, rRec, secondary, computed])

  // brandCss already includes the per-brand neutral, so the injected CSS is the
  // whole theme — no separate neutral block.
  const overrideCss = computed.css

  const shipsHex = stopHex(computed.r.scale.cta).toUpperCase()

  // ── Persistent horizontal controls bar — the single source of truth for
  // every color, pinned under the navbar on BOTH views, so editing is live
  // everywhere (change the primary on Preview, the demo themes under you).
  // the in-field MODE CHIP (the mockup's pill dropdown): a styled select riding inside ct-field
  // the chip TINTS with the selection (Figma spec): the family's own wash/ink; outline gets
  // the outline treatment; exact reads neutral-grey "hands off"
  const chipTone: Record<string, React.CSSProperties> = {
    brand: { background: 'var(--brand-wash-4)', color: 'var(--brand-ink-12)' },
    secondary: { background: 'var(--secondary-wash-6)', color: 'var(--secondary-ink-12)' },
    outline: { background: 'transparent', color: 'var(--secondary-ink-11)', border: '1px solid var(--secondary-highlight-8)' },
    grey: { background: 'var(--surface-sunken)', color: 'var(--fg-subtle)' },
  }
  const styleLabel: Record<SecondaryStyle, string> = { tint: 'Tint', pastel: 'Pastel', outline: 'Outline', exact: 'Exact' }
  // the ⓘ copy per selection (Figma spec) — the always-visible tooltip replacement
  const primaryInfo = primaryMode === 'recommended' ? 'Engine adjusts for optimal legibility'
    : primaryMode === 'exact' ? 'Your hex ships untouched'
    : `Anchored to the ${primaryMode} archetype`
  const secondaryInfo = secState === 'derived' ? 'A pastel derived from your primary'
    : secondaryStyle === 'tint' ? 'Differentiates from primary with a lighter tint of hue'
    : secondaryStyle === 'pastel' ? 'Differentiates from primary with lower chroma and lighter tint'
    : secondaryStyle === 'outline' ? 'Outline only'
    : 'Your hex ships untouched'
  const neutralInfo = neutralLevel === 'default' ? 'Adds a touch of primary hue'
    : neutralLevel === 'branded' ? 'Adds a noticeable tint to neutral'
    : 'Neutrals are pure grey'

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
          <ChipSelect value={primaryMode} title="Primary engine mode"
            label={primaryMode === 'recommended' ? 'Recommended' : primaryMode === 'exact' ? 'Exact' : primaryMode}
            tone={primaryMode === 'exact' ? chipTone.grey : chipTone.brand}
            onChange={v => setPrimaryMode(v as typeof primaryMode)}>
            <option value="recommended">Recommended</option>
            <option value="exact">Exact</option>
            <optgroup label="Anchor archetype">
              {ARCHETYPES.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
            </optgroup>
          </ChipSelect>
        </div>
        <InfoLine text={primaryInfo} />
      </div>

      <div className="ct-bar-field" style={{ position: 'relative' }} ref={popoverRef}>
        <div className="ct-label">Secondary color</div>
        {secState === 'none' ? (
          // no secondary is the demo's default — the field only exists once added
          <button className="ct-add" onClick={() => setSecState('derived')}>
            <Plus size={14} /> Add secondary
          </button>
        ) : (
          <div className="ct-field ct-field-color">
            <label className="ct-swatch-btn" title="Open color picker">
              {/* the swatch always shows the RESOLVED secondary — in derived mode that's
                  the subtle tint the engine produced, not the primary hex in the input */}
              <span className="ct-swatch" style={{ background: derived ? 'var(--secondary-cta-1)' : (secondary ?? 'var(--neutral-wash-5)') }} />
              <input type="color" value={secondary ?? primary} onChange={e => { setSecState('custom'); setSecondaryInput(e.target.value.toUpperCase()) }} />
            </label>
            {/* derived: the input TRACKS the primary live (that's what derived means) and is
                dimmed; the first keystroke detaches to custom with the typed value */}
            <input value={derived ? primary.toUpperCase() : secondaryInput} placeholder="enter a hex"
              style={derived ? { color: 'var(--fg-subtle)' } : undefined}
              onChange={e => { setSecState('custom'); setSecondaryInput(e.target.value) }} spellCheck={false} />
            {derived ? (
              // passive marker, not the style chip — derived is always pastel, engine's call
              <span style={{ fontSize: 11, color: 'var(--fg-subtle)', marginLeft: 'auto', flexShrink: 0 }}>from primary</span>
            ) : (
              <ChipSelect value={secondaryStyle} title="Secondary style" label={styleLabel[secondaryStyle]}
                tone={secondaryStyle === 'exact' ? chipTone.grey : secondaryStyle === 'outline' ? chipTone.outline : chipTone.secondary}
                onChange={v => setSecondaryStyle(v as SecondaryStyle)}>
                <option value="tint">Tint</option>
                <option value="pastel">Pastel</option>
                <option value="outline">Outline</option>
                <option value="exact">Exact</option>
              </ChipSelect>
            )}
            <button className="ct-iconbtn" title="Secondary options" onClick={() => setSecMenuOpen(o => !o)}>
              <ChevronDown size={12} strokeWidth={2.5} />
            </button>
          </div>
        )}
        {secState !== 'none' && <InfoLine text={secondaryInfo} />}
        {secMenuOpen && secState !== 'none' && (
          <div className="ct-popover">
            <button className="ct-suggest" style={derived ? { borderColor: 'var(--brand-highlight-8)' } : undefined}
              onClick={() => { setSecMenuOpen(false); setSecState('derived') }}>
              <span className="ct-swatch sm" style={{ background: 'var(--secondary-cta-1)' }} />
              From primary
            </button>
            <button className="ct-suggest" style={secState === 'custom' ? { borderColor: 'var(--brand-highlight-8)' } : undefined}
              onClick={() => {
                // keep the pre-filled primary hex so "custom" starts from what derived showed
                if (!secondaryInput) setSecondaryInput(primary.toUpperCase())
                setSecMenuOpen(false); setSecState('custom')
              }}>
              Custom
            </button>
            <button className="ct-remove" onClick={() => { setSecMenuOpen(false); setSecState('none'); setSecondaryInput('') }}>
              <BanIcon size={13} /> Remove
            </button>
          </div>
        )}
      </div>

      <div className="ct-bar-field">
        <div className="ct-label">Neutral color</div>
        <div className="ct-field" style={{ position: 'relative', width: 176 }}>
          <span className="ct-swatch" style={{ background: 'var(--neutral-highlight-9)' }} />
          <NeutralSelect value={neutralLevel} onChange={setNeutralLevel} />
        </div>
        <InfoLine text={neutralInfo} />
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px 18px', flexWrap: 'wrap' }}>
        <div className="ct-bar-field">
          <div className="ct-label">Contrast standard</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Segmented value={profile} onChange={setProfile} options={[['wcag', 'WCAG'], ['apca', 'APCA']]} />
            <span className="ct-info">
              ⓘ
              <span className="ct-tip">
                The same requirements solved under two contrast metrics. APCA (the default) is the
                perceptual model — Lc 30 / 75 / 90, the better read of what's actually legible.
                WCAG is the strict legal mode — the 2.x ratios (3:1 / 4.5 / 7), every text color
                guaranteed to pass its ratio; highlight text flips to black where white reads
                under 4.5:1.
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
    // the card serves the ramp's OWN paper-1 (owner 2026-07-09): tokens sit on their own paper in both modes,
    // so light↔dark compare on equal ground (the neutral surface-raised bg gave dark a different contrast)
    <div className="ct-colorblock" style={{ background: `var(--${prefix}-paper-1)` }}>
      <div className="ct-label" style={{ marginBottom: 8 }}>{label}</div>
      <TokenCards prefix={prefix} kind={kind} outlineCta={prefix === 'secondary' && computed.t.secondary?.style === 'outline'} />
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
      <div className="ct-colorblock" key={name} style={{ background: `var(--${name}-paper-1)` }}>
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
  const SWATCH_STOPS = ['paper-1', 'paper-2', 'wash-3', 'wash-4', 'wash-5', 'wash-6', 'wash-7', 'highlight-8', 'highlight-9', 'ink-11', 'ink-12', 'cta-1', 'cta-2']
  const swatchRamps: Array<[string, string, boolean]> = [
    ['brand', 'primary', true],
    ...((secondary || derived) ? [['secondary', 'secondary', true] as [string, string, boolean]] : []),
    ['neutral', 'neutral', false],
    ['red', 'red', false], ['yellow', 'yellow', false], ['green', 'green', false], ['info-color', 'info-color', false],
  ]
  const swatchCell = (prefix: string, stop: string) => {
    const cv = (t: string) => `var(--${prefix}-${t})`
    // chip "Aa" (highlight/cta) carries its on-color at a slightly lighter weight;
    // ink "Aa" is a big, heavy glyph so it reads as a text swatch, not a chip label.
    const aa: React.CSSProperties = { height: 36, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600 }
    // highlight-8 is the 3:1 NON-TEXT stop (boundaries/strokes) — it carries no on-text, so it
    // renders AS a stroke: a ring of the color, not a fill.
    if (stop === 'highlight-8') return <div style={{ height: 36, borderRadius: 6, boxSizing: 'border-box', border: `2px solid ${cv(stop)}` }} />
    if (stop.startsWith('highlight')) return <div style={{ ...aa, background: cv(stop), color: cv('on-highlight') }}>Aa</div>
    // filled cta cells carry NO stroke (filled is filled — same call as the buttons);
    // only the OUTLINE secondary shows its ring, where the boundary IS the component
    if (stop.startsWith('cta')) {
      const ring = prefix === 'secondary' && computed.t.secondary?.style === 'outline'
      return <div style={{ ...aa, boxSizing: 'border-box', background: cv(stop), color: cv('on-cta'), border: ring ? `1.5px solid ${cv('cta-border')}` : undefined }}>Aa</div>
    }
    if (stop.startsWith('ink')) return <div style={{ ...aa, fontSize: 18, fontWeight: 900, color: cv(stop) }}>Aa</div>
    return <div style={{ height: 36, borderRadius: 6, background: cv(stop), border: '1px solid var(--border-subtle)' }} />
  }
  // "ID" label legible on the identity swatch (which can be light, e.g. a yellow
  // brand): pick black/white by the identity's perceived luminance, not fixed white.
  const idTextOn = (hex?: string) => {
    if (!hex) return '#fff'
    const h = hex.replace('#', '')
    const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16))
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? '#000' : '#fff'
  }
  const swatchMatrix = () => (
    <div className="ct-colorblock">
      <div style={{ display: 'grid', gridTemplateColumns: `64px repeat(${SWATCH_STOPS.length + 1}, 1fr)`, gap: 5, alignItems: 'center' }}>
        {swatchRamps.flatMap(([prefix, label, hasId]) => [
          <div key={`${prefix}-l`} style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-default)', whiteSpace: 'nowrap' }}>{label}</div>,
          <div key={`${prefix}-id`} title={hasId ? `--${prefix}-identity` : undefined}>
            {hasId
              ? <div style={{ height: 36, borderRadius: 6, background: `var(--${prefix}-identity)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: idTextOn(prefix === 'brand' ? computed.r.scale.identityHex : computed.accent?.identityHex) }}>ID</div>
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
      {rung === 'exact' && (rRec.redRepel || rRec.signalOverrides.some(o => o.name === 'red')) && (
        <div className="ct-alert-warn">
          <TriangleAlert size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            Color sits in the error signal's register — recommended mode separates the action color automatically.{' '}
            <a href="#" onClick={e => e.preventDefault()} title="Documentation link — coming">Learn more</a>
          </span>
        </div>
      )}
      {rung === 'recommended' && rRec.redRepel && (
        <div className="ct-alert-text">
          <TriangleAlert size={13} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            Collision notice: this primary sits in the error signal's register. Recommended mode
            stepped the action color clear of red along its nearest exit.
          </span>
        </div>
      )}
      {rung === 'recommended' && !rRec.redRepel && rRec.signalOverrides.some(o => o.name === 'red') && (
        <div className="ct-alert-text">
          <TriangleAlert size={13} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            Collision notice: your color lives in the error signal's neighborhood, so it stays
            exactly yours — the error signal takes a per-brand variant to stay clearly distinct
            beside it.
          </span>
        </div>
      )}
    </>
  )

  return (
    <div data-brand="custom" data-theme={dark ? 'dark' : 'light'} data-accent-mode={(secondary || derived) ? 'accented' : 'default'} style={{ background: 'var(--surface-base)', color: 'var(--fg-default)', minHeight: '100%', position: 'relative' }}>
      <style>{overrideCss}</style>
      <style>{PAGE_CSS}</style>

      {/* ── App nav: product navbar, themed by the palette. Palette/Preview
          tabs only — the Figma export now lives in the plugin, not here. ── */}
      <div className="ct-appnav">
        <span className="ct-logo-mark">◈</span>
        <span className="ct-brandname">yourBrand</span>
        <span style={{ flex: 1 }} />
        {([['palette', 'Palette'], ['preview', 'Preview']] as Array<[View, string]>).map(([v, label]) => (
          <button key={v} className={`ct-apptab${view === v ? ' active' : ''}`} onClick={() => setView(v)}>{label}</button>
        ))}
      </div>

      {/* ── Persistent controls bar — present on both views ── */}
      {controlsBar}

      {/* ── Palette: workshop. Left = scales + collapsed decisions; right =
          live illustration (hidden under 980px). ── */}
      {view === 'palette' && (
        <div className="ct-pane">
          <div className="ct-pane-main">
            {swatchMatrix()}
            {/* every cta together — brand pair, secondary pair, neutral, and the four
                signals (red/yellow/green/info-color, with this brand's overrides) so a
                colliding pair is visible in one glance */}
            <div className="ct-colorblock">
              <div className="ct-label" style={{ marginBottom: 8 }}>All ctas — deconfliction row</div>
              <CtaRow hasSecondary={!!secondary || derived} shifted={computed.r.signalOverrides.map(o => o.name)} />
            </div>
            {colorBlock('Primary scale', 'brand', 'brand', rRec, primary, primaryExtras)}
            {(secondary || derived) && colorBlock(derived ? 'Secondary scale — derived from primary' : 'Secondary scale', 'secondary', 'brand', null, secondary ?? primary, (
              computed.t.secondary && (
                <div style={{ fontSize: 11.5, color: 'var(--fg-subtle)', marginTop: 8, lineHeight: 1.45 }}>
                  Resolved <b>{computed.t.secondary.level}</b>{computed.t.secondary.demoted ? ' (auto)' : ''}
                  {computed.t.secondary.notes.map(n => <div key={n}>· {n}</div>)}
                </div>
              )
            ))}
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
      {view === 'preview' && <Dashboard hasSecondary={!!secondary || derived} />}

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
  const shipsHex = stopHex(rRec.scale.cta).toUpperCase()

  const redMove = rRec.signalOverrides.find(o => o.name === 'red')
  if (rRec.redRepel) {
    rows.push(rec
      ? { key: 'hue', tone: 'adjusted', label: `conflict with error red resolved — ${primaryHex.toUpperCase()} → ${shipsHex}`, detail: 'This primary sits in the error signal\'s register. The action color exits by its nearest edge — deep and vivid reds go deeper (into burgundy when needed), pinks lighten, vivid oranges brighten — until it reads clearly apart from red.' }
      : { key: 'hue', tone: 'fail', label: 'color conflicts with error red — separation not applied', detail: 'Exact mode ships the hex untouched, so the error-signal conflict is not resolved at the color level. Destructive buttons render as outlines everywhere as a backstop.' })
    if (rec && redMove) {
      rows.push({ key: 'vivid', tone: 'adjusted', label: `the error signal also moves (${redMove.note})`, detail: 'Beside your treated action color the canonical error red would still sit too close — so the error signal takes a per-brand variant from the error-credible range, on the opposite side of your action color.' })
    }
  } else if (redMove) {
    rows.push(rec
      ? { key: 'hue', tone: 'adjusted', label: `your color keeps its exact register — the error signal moves instead (${redMove.note})`, detail: 'This brand lives in the error signal\'s neighborhood, and moving it would cost its identity. The action color stays exactly yours; the error signal takes a per-brand variant from the error-credible range, clearly distinct beside your buttons.' }
      : { key: 'hue', tone: 'fail', label: 'color conflicts with error red — separation not applied', detail: 'Exact mode ships the hex untouched, so the error-signal conflict is not resolved at the color level. Destructive buttons render as outlines everywhere as a backstop.' })
  } else {
    rows.push({ key: 'hue', tone: 'pass', label: `${origArch} archetype, no signal conflicts`, detail: 'The hue clears every signal gate; the fill anchors at your exact color.' })
  }


  if (rRec.warningVariant === 'lemon') {
    rows.push({ key: 'warn', tone: rec ? 'adjusted' : 'fail', label: 'warning signal shifted to a cooler yellow', detail: 'This brand owns the warm gold range, so the warning signal moves to a cooler yellow to stay clearly distinct from brand surfaces.' })
  } else if (rRec.warningVariant === 'macaroni') {
    rows.push({ key: 'warn', tone: 'standard', label: 'warning signal kept standard amber', detail: 'A cool-yellow brand: the standard amber warning is already clearly distinct.' })
  }

  rows.push(rec
    ? { key: 'dark', tone: 'pass', label: 'dark mode: calculated from brand color', detail: 'The dark palette derives from your brand color on the same rules — fills only lift when they would vanish on a dark background. Dark action colors sit deep enough that the red conflict never arises there.' }
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
    const lightOk = fillOk(ex.scale.cta, ex.scale.onFillTextIsWhite)
    const darkOk = fillOk(ex.scale.ctaDark, ex.scale.onFillTextIsWhiteDark)
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
  // Two LIVE items in the side nav: Dashboard (the overview) and Settings (the
  // collision-stress page). The rest stay demo-only placeholders.
  const [page, setPage] = useState<'overview' | 'settings'>('overview')
  const nav: Array<{ Icon: typeof LayoutDashboard; label: string; goto?: 'overview' | 'settings' }> = [
    { Icon: LayoutDashboard, label: 'Dashboard', goto: 'overview' }, { Icon: FolderKanban, label: 'Projects' },
    { Icon: ListTodo, label: 'Tasks' }, { Icon: BarChart3, label: 'Analytics' }, { Icon: Users, label: 'Team' },
    { Icon: Settings, label: 'Collision check', goto: 'settings' },
  ]
  return (
    <div className="dash">
      <aside className="dash-side">
        <div className="dash-logo"><span className="dash-logo-mark">◈</span> yourBrand</div>
        <nav className="dash-nav">
          {nav.map(({ Icon, label, goto }) => (
            <a key={label} href="#" className={`dash-navitem${goto === page ? ' active' : ''}`}
              onClick={e => { e.preventDefault(); if (goto) setPage(goto) }}
              title={goto ? undefined : 'For demo purposes only'}>
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

      {page === 'settings' ? <SettingsStress hasSecondary={hasSecondary} /> : <main className="dash-main">
        <div className="dash-topbar">
          <div style={{ fontSize: 18, fontWeight: 700 }}>Dashboard</div>
          <div className="dash-search"><Search size={14} aria-hidden /> Search…</div>
          <span style={{ flex: 1 }} />
          <button className="u-btn u-btn-subtle" style={{ padding: '6px 12px', fontSize: 13 }} title="Placeholder — export coming"><Download size={14} /> Export</button>
          {/* the secondary CTA (--secondary-cta-1/2) beside the brand cta — only when a
              secondary exists (the vars mirror brand otherwise, a duplicate button) */}
          {hasSecondary && <button className="u-btn u-btn-secondary" style={{ padding: '6px 14px', fontSize: 13 }}>Share</button>}
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
            {/* the secondary-showcase slot: NEUTRAL (quiet cta) until a secondary exists,
                then the secondary's subtle register (owner: never brand-again) */}
            <button className={`u-btn ${hasSecondary ? 'u-btn-subtle' : 'u-btn-neutral'}`} style={{ width: '100%', justifyContent: 'center' }}>Create project</button>
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
      </main>}
    </div>
  )
}

// ─── Collision check — 2×2 grid, one form card per signal ───────────────────
// Owner spec (2026-07-09): four form cards on paper-0, one per signal
// (red / yellow / green / info-color — by identity), each combining:
//   ink-11 title + brand chip + the card signal's chip
//   ink-12 short body
//   focused input + resting input
//   input with the signal's helper + an error (red) input
//   the signal's alert message (its cta register)
//   button row: primary wash-5 · primary cta · red cta
//   button row: secondary wash-5 · secondary cta · neutral cta
// All live vars — re-solves with the pickers, profile, and mode.
const SIGNAL_CARDS: Array<{ sig: string; Icon: typeof Info; alert: string }> = [
  { sig: 'red', Icon: AlertCircle, alert: 'We couldn\'t process the request. Try again.' },
  { sig: 'yellow', Icon: TriangleAlert, alert: 'Usage is approaching the plan limit.' },
  { sig: 'green', Icon: CheckCircle, alert: 'Changes saved. Everything is up to date.' },
  { sig: 'info-color', Icon: Info, alert: 'A new version is available.' },
]

function SignalCard({ sig, Icon, alert, hasSecondary }: { sig: string; Icon: typeof Info; alert: string; hasSecondary: boolean }) {
  const v = (t: string) => `var(--${sig}-${t})`
  const chip = (prefix: string, label: string) => (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 6,
      fontSize: 12, fontWeight: 500,
      background: `var(--${prefix}-wash-4)`, color: `var(--${prefix}-ink-12)`,
      border: `1px solid var(--${prefix}-wash-6)`,
    }}>{label}</span>
  )
  const fieldLabel: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: 'var(--fg-subtle)', marginBottom: 4 }
  // the focused state, held statically (mirror of .ct-field:focus-within) so all
  // four cards can show it at once
  const focusRing: React.CSSProperties = { borderColor: 'var(--brand-highlight-8)', boxShadow: '0 0 0 3px var(--brand-bg-subtle)' }
  const btn: React.CSSProperties = { padding: '8px 16px', borderRadius: 999, border: '1.5px solid transparent', cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: 'inherit' }
  return (
    <section style={{ background: 'var(--paper-0)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: 18 }}>
      {/* title row shows the ink-11 RANGE: signal ink vs neutral ink vs brand ink;
          the subtitle (only when a secondary exists) adds secondary ink-11 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginRight: 'auto' }}>
          <span style={{ color: v('ink-11') }}>{sig}</span>
          <span style={{ color: 'var(--neutral-ink-11)', fontWeight: 500 }}> vs </span>
          <span style={{ color: 'var(--brand-ink-11)' }}>Brand-primary</span>
        </div>
        {chip('brand', 'brand')}
        {chip(sig, sig)}
      </div>
      {hasSecondary && (
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--secondary-ink-11)', marginBottom: 6 }}>
          This is a subtitle in Brand-secondary
        </div>
      )}
      {/* body shows the ink-12 range, one sentence per family */}
      <p style={{ fontSize: 12.5, lineHeight: 1.45, margin: '0 0 12px' }}>
        <span style={{ color: v('ink-12') }}>This body copy is in {sig}'s ink-12. </span>
        <span style={{ color: 'var(--brand-ink-12)' }}>This body copy is in brand-primary's ink-12. </span>
        {hasSecondary && <span style={{ color: 'var(--secondary-ink-12)' }}>This body copy is in brand-secondary's ink-12. </span>}
        <span style={{ color: 'var(--neutral-ink-12)' }}>This body copy is in neutral's ink-12.</span>
      </p>

      {/* inputs: focused + resting / signal helper + error */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px 12px', marginBottom: 12 }}>
        <div>
          <div style={fieldLabel}>Focused</div>
          <div className="ct-field" style={focusRing}><input defaultValue="Editing…" spellCheck={false} /></div>
        </div>
        <div>
          <div style={fieldLabel}>Resting</div>
          <div className="ct-field"><input placeholder="Placeholder" spellCheck={false} /></div>
        </div>
        <div>
          <div style={fieldLabel}>With helper</div>
          <div className="ct-field"><input defaultValue="Value" spellCheck={false} /></div>
          <div style={{ fontSize: 11, color: v('ink-11'), marginTop: 5 }}>Helper text in the {sig} register.</div>
        </div>
        <div>
          <div style={fieldLabel}>Error</div>
          <div className="ct-field err"><input defaultValue="Bad value" spellCheck={false} /></div>
          <div className="ct-err-note">This field needs attention.</div>
        </div>
      </div>

      {/* the signal's alert message — its cta register, same call as TokenCards */}
      <div style={{
        display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 12,
        borderRadius: 8, padding: '9px 12px', fontSize: 12.5,
        background: v('cta-1'), color: v('on-cta'),
      }}>
        <Icon size={15} style={{ flexShrink: 0, marginTop: 1 }} aria-hidden />
        <span>{alert}</span>
      </div>

      {/* button rows: primary wash-5 · primary cta · red cta, then
          secondary wash-5 · secondary cta · neutral cta */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        <button style={{ ...btn, background: 'var(--brand-wash-5)', color: 'var(--brand-ink-12)' }}>Wash 5</button>
        <button style={{ ...btn, background: 'var(--brand-cta-1)', color: 'var(--brand-on-cta)' }}>Primary cta</button>
        <button style={{ ...btn, background: 'var(--red-cta-1)', color: 'var(--red-on-cta)' }}>Red cta</button>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {hasSecondary && <>
          <button style={{ ...btn, background: 'var(--secondary-wash-5)', color: 'var(--secondary-ink-12)' }}>Wash 5</button>
          <button style={{ ...btn, background: 'var(--secondary-cta-1)', color: 'var(--secondary-on-cta)', borderColor: 'var(--secondary-cta-border)' }}>Secondary cta</button>
        </>}
        <button style={{ ...btn, background: 'var(--neutral-cta-1)', color: 'var(--neutral-on-cta)' }}>Neutral cta</button>
      </div>
    </section>
  )
}

function SettingsStress({ hasSecondary }: { hasSecondary: boolean }) {
  return (
    <main className="dash-main">
      <div className="dash-topbar">
        <div style={{ fontSize: 18, fontWeight: 700 }}>Collision check</div>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11.5, color: 'var(--fg-subtle)' }}>
          one card per signal on paper-0 — try a red, gold, green, or blue seed above
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
        {SIGNAL_CARDS.map(c => <SignalCard key={c.sig} {...c} hasSecondary={hasSecondary} />)}
      </div>
    </main>
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
  --brand-bg-subtle: var(--brand-wash-5);
  --brand-bg-subtle-hover: var(--brand-wash-6);
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
  background: var(--yellow-wash-4); border: 1px solid var(--yellow-highlight-8); color: var(--yellow-ink-12);
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
  display: flex; flex-wrap: wrap; align-items: flex-start; gap: 12px 18px;
  padding: 12px 24px; background: var(--surface-raised);
  border-bottom: 1px solid var(--border-subtle);
}
.ct-bar-field { display: flex; flex-direction: column; gap: 5px; }
/* Size fields to content so the bar fits one row — a hex needs far less than
   the old fixed 240px. The neutral select keeps a comfortable min-width. */
/* Fixed height so a taller child (the ✦ button) can't push one field bigger
   than the rest — all bar fields line up at 38px. */
.ct-bar .ct-field { width: auto; height: 40px; padding: 0 12px; }
/* Room for the mode chips — "Recommended"/"Outline" must never truncate. */
.ct-bar .ct-field-color { width: 272px; }
.ct-bar .ct-field-color > input { flex: 1; min-width: 56px; }
.ct-bar .ct-field > select, .ct-bar .ct-field > span > select { width: 96px; }
.ct-add {
  display: inline-flex; align-items: center; gap: 6px; box-sizing: border-box; height: 40px;
  padding: 0 14px; cursor: pointer; font-family: inherit; font-size: 13px; font-weight: 600;
  color: var(--fg-subtle); background: transparent;
  border: 1.5px dashed var(--border-default); border-radius: 10px;
}
.ct-add:hover { color: var(--fg-default); border-color: var(--brand-highlight-8); background: var(--brand-bg-faint); }
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
  background: var(--surface-raised); border: 1px solid var(--border-default); border-radius: 10px;
  padding: 9px 12px;
}
.ct-field:focus-within { border-color: var(--brand-highlight-8); box-shadow: 0 0 0 3px var(--brand-bg-subtle); }
.ct-field input, .ct-field select {
  border: none; outline: none; background: transparent; color: var(--fg-default);
  font-family: inherit; font-size: 14px; flex: 1; min-width: 0;
}
.ct-field input:focus-visible, .ct-field select:focus-visible { outline: none; }
.ct-field.err { border-color: var(--alert-high-border-emphasis); background: var(--alert-high-bg-faint); }
.ct-field.err:focus-within { border-color: var(--alert-high-border-emphasis); box-shadow: 0 0 0 3px var(--alert-high-bg-subtle); }
.ct-err-note { font-size: 11px; color: var(--alert-high-fg-alt); margin-top: 5px; }
.ct-swatch { width: 20px; height: 20px; border-radius: 5px; flex-shrink: 0; border: 1px solid var(--border-subtle); }
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
