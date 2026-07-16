import { resolveTheme, resolveBrand, signalScalesFor, escapeCtaFamily, resolveLinkTrio, DEFAULT_LINK_HEX, type SecondaryStyle, type ResolvedTheme } from '../src/engine/resolve'
import { redGateDist, RED_GATE } from '../src/engine/collision'
import { ARCHETYPES, type Archetype } from '../src/engine/archetypes'
import { generateNeutralScale, type GeneratedScale, type ColorStop, type NeutralLevel, type ContrastProfile } from '../src/engine/colorEngine'
import { themeToFigma } from '../src/engine/figmaRender'
import { SIGNALS } from '../src/engine/signals'
import { toHex } from '../src/engine/cssRender'

// ─── State ───────────────────────────────────────────────────────────────────

let primaryHex = '#E93D82'
let secondaryHex: string | null = null
let neutralLevel: NeutralLevel = 'default'
// per-family modes (parity with the demo): the primary's select = Recommended / Exact /
// the six archetype anchors; the secondary's select = its style chip (custom only —
// derived rides the default seed-transform, the engine's call).
let primaryMode: 'recommended' | 'exact' | Archetype = 'recommended'
let secondaryStyle: SecondaryStyle = 'default'
let contrastProfile: ContrastProfile = 'apca' // APCA = the shipped default; WCAG = the opt-in legal mode
// the NEUTRAL CTA ESCAPE (Phase 3, owner 2026-07-16): red-range brands can swap the cta
// fill trio to the brand-neutral's ink register (near-black light / near-white dark).
// The toggle is VISIBLE only in red range, and the EFFECTIVE flag is ctaEscape &&
// inRedRange — outside the range the checkbox is inert, never force-cleared (clearing
// on every keystroke wiped the toggle through 3-digit intermediate parses like "#EA3",
// review-caught 2026-07-16), and it can't ride an apply silently either.
let ctaEscape = false
let inRedRange = false        // EFFECTIVE gate: the CURRENT posture's red range
let inRedRangeOffer = false   // OFFER gate: union of both clamp postures (row visibility)
// the SYSTEM LINK (Phase 4, owner 2026-07-16): ONE link trio per theme — hyperlinks, not
// per-family. Default aliases the primary's cta-ink (= ink-10, states built in; follows
// the escape). Custom = the seed below through the ink register (#0B57D0 default when
// toggled on — the red de-conflict for links).
let linkCustom = false
// the escape BUNDLE (owner 2026-07-16): ticking "Use neutral primary cta" auto-enables
// the custom link (#0B57D0) — overridable; unticking reverts ONLY an untouched bundle
let linkBundled = false
// the VIVIDNESS LEVER (phase 5): default OFF = the shipped dampened registers
let fullChroma = false
let pendingName: string | null = null // brand armed for overwrite confirmation
// The secondary is the demo's THREE-STATE field: none (default — just "+ Add secondary") →
// derived (the input tracks the primary live; the engine derives the default secondary) →
// custom (user hex + style chip). The chevron menu moves between all three.
type SecondaryMode = 'derived' | 'custom' | 'off'
let secondaryMode: SecondaryMode = 'off'

// ─── DOM ─────────────────────────────────────────────────────────────────────

const $  = <T extends HTMLElement>(id: string) => document.getElementById(id) as T
const collectionInput = $<HTMLInputElement>('collection-name')
const primaryHexInput = $<HTMLInputElement>('primary-hex')
const primaryPicker   = $<HTMLInputElement>('primary-picker')
const primarySwatch   = $<HTMLElement>('primary-swatch')
const primaryModeSelect  = $<HTMLSelectElement>('primary-mode')
const primaryChip        = $<HTMLElement>('primary-chip')
const primaryChipLabel   = $<HTMLElement>('primary-chip-label')
const primaryInfo        = $<HTMLElement>('primary-info')
const archetypeGroup     = $<HTMLElement>('archetype-group')
const secondaryAddBtn    = $<HTMLButtonElement>('secondary-add')
const secondaryField     = $<HTMLElement>('secondary-field')
const secondaryHexInput  = $<HTMLInputElement>('secondary-hex')
const secondaryPicker    = $<HTMLInputElement>('secondary-picker')
const secondarySwatch    = $<HTMLElement>('secondary-swatch')
const secondaryStyleSelect = $<HTMLSelectElement>('secondary-style')
const secondaryChip      = $<HTMLElement>('secondary-chip')
const secondaryChipLabel = $<HTMLElement>('secondary-chip-label')
const secondaryInfo      = $<HTMLElement>('secondary-info')
const secondaryInfoLine  = $<HTMLElement>('secondary-info-line')
const neutralLabel       = $<HTMLElement>('neutral-label')
const neutralInfo        = $<HTMLElement>('neutral-info')
const neutralSwatch   = $<HTMLElement>('neutral-swatch')
const neutralSelect   = $<HTMLSelectElement>('neutral-select')
const profileBtns     = document.querySelectorAll<HTMLButtonElement>('.seg-btn[data-profile]')
const ctaEscapeRow    = $<HTMLElement>('cta-escape-row')
const ctaEscapeBox    = $<HTMLInputElement>('cta-escape')
const fullChromaBox   = $<HTMLInputElement>('full-chroma')
const linkHexInput    = $<HTMLInputElement>('link-hex')
const linkSwatch      = $<HTMLElement>('link-swatch')
const linkField       = $<HTMLElement>('link-field')
const linkResetBtn    = $<HTMLButtonElement>('link-reset')
const linkHint        = $<HTMLElement>('link-hint')
const matrixEl        = $<HTMLElement>('matrix')
const applyBtn        = $<HTMLButtonElement>('apply-btn')
const statusEl        = $<HTMLElement>('status')

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeHex(s: string): string | null {
  const h = s.trim().replace(/^#/, '')
  if (/^[0-9a-fA-F]{6}$/.test(h)) return `#${h.toUpperCase()}`
  if (/^[0-9a-fA-F]{3}$/.test(h)) {
    const [a, b, c] = h
    return `#${a}${a}${b}${b}${c}${c}`.toUpperCase()
  }
  return null
}

// Force the brand name to spinal (kebab) case so it's a clean variable-name
// segment: lowercase, any run of non-alphanumerics → one hyphen, no edge hyphens.
function toSpinal(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function setStatus(text: string, tone: '' | 'ok' | 'err' = '') {
  statusEl.textContent = text
  statusEl.className = `status${tone ? ` ${tone}` : ''}`
}

// ─── The secondary field's three states ──────────────────────────────────────

// the ⓘ copy per selection (Figma spec) — the always-visible tooltip replacement
const STYLE_LABEL: Record<SecondaryStyle, string> = { default: 'Custom', outline: 'Outline', exact: 'Exact' }
const STYLE_INFO: Record<SecondaryStyle, string> = {
  default: 'Your color through the derived model — lifted, engine-normal',
  outline: 'Outline only',
  exact: 'Your hex ships untouched',
}
const NEUTRAL_LABEL: Record<NeutralLevel, string> = { default: 'Default', branded: 'Intense', pure: 'True grey' }
const NEUTRAL_INFO: Record<NeutralLevel, string> = {
  default: 'Adds a touch of primary hue',
  branded: 'Adds a noticeable tint to neutral',
  pure: 'Neutrals are pure grey',
}

function syncInfoLines() {
  primaryChipLabel.textContent = primaryMode === 'recommended' ? 'Recommended' : primaryMode === 'exact' ? 'Exact' : primaryMode
  primaryInfo.textContent = primaryMode === 'recommended' ? 'Engine adjusts for optimal legibility'
    : primaryMode === 'exact' ? 'Your hex ships untouched'
    : `Anchored to the ${primaryMode} archetype`
  secondaryChipLabel.textContent = secondaryMode === 'derived' ? 'From primary' : STYLE_LABEL[secondaryStyle]
  secondaryStyleSelect.value = secondaryMode === 'derived' ? 'from-primary' : secondaryStyle
  secondaryInfoLine.style.display = secondaryMode === 'off' ? 'none' : ''
  secondaryInfo.textContent = secondaryMode === 'derived' ? 'A lighter take on your primary — derived by default' : STYLE_INFO[secondaryStyle]
  neutralLabel.textContent = NEUTRAL_LABEL[neutralLevel]
  neutralInfo.textContent = NEUTRAL_INFO[neutralLevel]
}

function setSecondaryMode(mode: SecondaryMode) {
  secondaryMode = mode
  secondaryAddBtn.style.display = mode === 'off' ? '' : 'none'
  secondaryField.style.display = mode === 'off' ? 'none' : ''
  secondaryChip.style.display = ''
  secondaryHexInput.classList.toggle('dim', mode === 'derived')
  if (mode !== 'custom') secondaryHexInput.classList.remove('invalid')
  updatePreview()
}

// ─── Preview ─────────────────────────────────────────────────────────────────

// the THEME input: primary + secondary posture, each under its OWN mode (per-family chips —
// the demo's model exactly). Derived rides the default model; the style select applies to custom only.
function themeInput(name: string) {
  const cp = contrastProfile === 'apca' ? ('apca' as const) : undefined
  return {
    primaryHex, name,
    primaryMode: primaryMode === 'exact' ? ('exact' as const) : ('recommended' as const),
    primaryArchetype: primaryMode !== 'recommended' && primaryMode !== 'exact' ? primaryMode : undefined,
    secondaryHex: secondaryMode === 'custom' && secondaryHex ? secondaryHex : null,
    deriveSecondary: secondaryMode === 'derived' || undefined,
    secondaryStyle: secondaryMode === 'custom' ? secondaryStyle : undefined,
    contrastProfile: cp,
    // the VIVIDNESS LEVER (phase 5, owner copy: "Brand ramps are dampened by default to
    // separate from signals. Turn off for full vividness.") — primary only; the derived
    // secondary and the signals keep their own registers
    style: fullChroma ? ('full-chroma' as const) : undefined,
  }
}

// the demo's top-card matrix: every family × ID + the 11 stops + the cta pair (light mode).
// Stop 8 renders AS a stroke (it's the boundary stop); cta cells carry the family's cta-border.
// Cells iterate the scale's ACTUAL stops (stop 10 deleted 2026-07-09) — a future stop change
// reshapes the grid instead of throwing into updatePreview's catch.
function renderMatrix(t: ResolvedTheme, nScale: GeneratedScale) {
  const cp = contrastProfile === 'apca' ? ('apca' as const) : undefined
  const sigScales = signalScalesFor(cp)
  // the escape resets red to canonical (owner 2026-07-16) — the preview mirrors the apply
  const effective = (n: typeof SIGNALS[number]['name']) =>
    (ctaEscape && inRedRange && n === 'red')
      ? sigScales.get('red')!.scale
      : t.themed.signalOverrides.find(o => o.name === n)?.scale ?? sigScales.get(n)!.scale

  type Row = { label: string; scale: GeneratedScale; idHex?: string; outline?: boolean; escape?: boolean }
  const rows: Row[] = [
    { label: 'primary', scale: t.themed.scale, idHex: t.themed.scale.identityHex, escape: ctaEscape && inRedRange },
    ...(t.secondary ? [{ label: 'secondary', scale: t.secondary.scale, idHex: t.secondary.scale.identityHex, outline: t.secondary.style === 'outline' }] : []),
    { label: 'neutral', scale: nScale },
    ...SIGNALS.map(s => ({ label: s.name, scale: effective(s.name) })),
  ]

  const hx = (s: ColorStop) => toHex(s.r, s.g, s.b)
  const pole = (white: boolean) => (white ? '#fff' : '#000')
  const idText = (hex: string) => {
    const h = hex.replace('#', '')
    const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16))
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? '#000' : '#fff'
  }

  const rowHtml = (row: Row) => {
    const st = (n: number) => row.scale.light.find(s => s.stop === n)!
    const cells: string[] = [`<div class="mx-label" title="${row.label}">${row.label}</div>`]
    cells.push(row.idHex
      ? `<div class="mx-aa" style="background:${row.idHex};color:${idText(row.idHex)};font-weight:700;font-size:10px" title="identity">ID</div>`
      : `<div class="mx-cell"></div>`)
    for (const s of row.scale.light) {
      const n = s.stop
      const h = hx(s)
      if (n === 8) cells.push(`<div class="mx-cell" style="border:2px solid ${h}" title="highlight-8"></div>`)
      else if (n === 9) cells.push(`<div class="mx-aa" style="background:${h};color:${pole(row.scale.onHighlightIsWhite)}" title="highlight-9">Aa</div>`)
      else if (n >= 10) cells.push(`<div class="mx-aa" style="color:${h};font-size:15px;font-weight:800" title="ink-${n}">Aa</div>`)
      else cells.push(`<div class="mx-cell" style="background:${h};box-shadow:inset 0 0 0 1px rgba(0,0,0,.06)" title="${n <= 2 ? 'paper' : 'wash'}-${n}"></div>`)
    }
    const s8 = hx(st(8))
    if (row.outline) {
      // outline's re-expressed fill trio: transparent + ring + ink-10 label; hover/pressed =
      // the STABLE highlight-8 at 9%/18% (the same stop the ring uses; pressed doubles hover)
      const ink10 = hx(st(10))
      const c8 = st(8)
      const rgb = `${Math.round(c8.r * 255)},${Math.round(c8.g * 255)},${Math.round(c8.b * 255)}`
      cells.push(`<div class="mx-aa" style="border:1.5px solid ${s8};color:${ink10}" title="cta (outline)">Aa</div>`)
      cells.push(`<div class="mx-aa" style="border:1.5px solid ${s8};color:${ink10};background:rgba(${rgb},0.09)" title="cta-hover (outline)">Aa</div>`)
      cells.push(`<div class="mx-aa" style="border:1.5px solid ${s8};color:${ink10};background:rgba(${rgb},0.18)" title="cta-pressed (outline)">Aa</div>`)
    } else if (row.escape) {
      // the neutral cta escape: the fill trio previews the brand-neutral's ink register
      const cp = contrastProfile === 'apca' ? ('apca' as const) : undefined
      const esc = escapeCtaFamily(nScale, 'light', cp)
      const on = pole(esc.onFillIsWhite)
      cells.push(`<div class="mx-aa" style="background:${hx(esc.cta)};color:${on}" title="cta (neutral escape)">Aa</div>`)
      cells.push(`<div class="mx-aa" style="background:${hx(esc.ctaHover)};color:${on}" title="cta-hover (neutral escape)">Aa</div>`)
      cells.push(`<div class="mx-aa" style="background:${hx(esc.ctaPressed)};color:${on}" title="cta-pressed (neutral escape)">Aa</div>`)
    } else {
      // filled cta cells carry NO stroke (filled is filled); only outline shows its ring
      const on = pole(row.scale.onFillTextIsWhite)
      cells.push(`<div class="mx-aa" style="background:${hx(row.scale.cta)};color:${on}" title="cta">Aa</div>`)
      cells.push(`<div class="mx-aa" style="background:${hx(row.scale.ctaHover)};color:${on}" title="cta-hover">Aa</div>`)
      cells.push(`<div class="mx-aa" style="background:${hx(row.scale.ctaPressed)};color:${on}" title="cta-pressed">Aa</div>`)
    }
    // cta-ink trio: the TEXT-STYLE cta (the action color's 4.5 text rendition — owner:
    // a text button, never a hyperlink, so no underline). Under the escape it swaps to
    // the neutral's register with the fills.
    const inkTrio = row.escape
      ? (() => { const e = escapeCtaFamily(nScale, 'light', contrastProfile === 'apca' ? 'apca' : undefined); return [['cta-ink', e.ctaInk], ['cta-ink-hover', e.ctaInkHover], ['cta-ink-pressed', e.ctaInkPressed]] as const })()
      : ([['cta-ink', row.scale.ctaInk], ['cta-ink-hover', row.scale.ctaInkHover], ['cta-ink-pressed', row.scale.ctaInkPressed]] as const)
    for (const [name, c] of inkTrio)
      cells.push(`<div class="mx-aa" style="color:${hx(c)};font-size:15px;font-weight:800" title="${name}">Aa</div>`)
    return cells.join('')
  }

  matrixEl.innerHTML = rows.map(rowHtml).join('')
}

function updatePreview() {
  try {
    const cp = contrastProfile === 'apca' ? ('apca' as const) : undefined
    const t = resolveTheme(themeInput('x'))
    const nScale = generateNeutralScale(t.themed.scale.brandH, neutralLevel, cp)

    // red-range detection: the repel FIRING means the given hex was in the red region
    // (recommended mode exits the register, so the resolved cta alone would miss exactly
    // the brands the escape is for); the direct gate check catches exact-mode reds.
    // The toggle stays checked-but-inert outside the range (effective = && inRedRange).
    const redCta = signalScalesFor(cp).get('red')!.scale.cta
    // TWO GATES (owner-caught + review-hardened 2026-07-16): the OFFER (row visibility)
    // is the union of BOTH clamp postures — membership is NOT monotone in the lever
    // (probe the OPPOSITE posture; a one-way probe collapsed when the clamp was on), so
    // the row never appears/disappears with the clamp. The EFFECTIVE flag stays the
    // CURRENT posture only — the file/css can never carry an escape for a brand whose
    // shipped posture isn't red-range (the original phase-3 contract).
    const rangeOf = (rb: { redRepel: unknown; scale: { cta: { L: number; C: number; H: number } } }) =>
      !!rb.redRepel || redGateDist(rb.scale.cta, redCta) <= RED_GATE.G
    inRedRange = rangeOf(t.themed)
    inRedRangeOffer = inRedRange || rangeOf(resolveBrand(primaryHex, 'range-probe', {
      style: fullChroma ? undefined : 'full-chroma', contrastProfile: cp,
      exact: primaryMode === 'exact' || undefined,
      archetypeOverride: primaryMode !== 'recommended' && primaryMode !== 'exact' ? primaryMode : undefined,
    }))
    ctaEscapeRow.style.display = inRedRangeOffer ? '' : 'none'
    // BUNDLE HYGIENE (review-caught): an untouched bundle auto-reverts the moment the
    // escape stops being effective (range exit / posture flip) — the frozen default blue
    // must not outlive the escape it was bundled with, nor ride an apply for a brand
    // whose links were never meant to be custom.
    if (linkBundled && !(ctaEscape && inRedRange)
      && normalizeHex(linkHexInput.value)?.toLowerCase() === DEFAULT_LINK_HEX.toLowerCase()) {
      linkCustom = false
      linkBundled = false
    }

    // the link FIELD previews the RESOLVED system link: custom seed through the ink
    // register, else the primary's cta-ink (escaped when the escape is active). The
    // from-primary posture shows the resolved hex GREYED + read-only; clicking the hex
    // takes it over (owner Advanced-menu spec 2026-07-16).
    const fromPrimaryStop = ctaEscape && inRedRange ? escapeCtaFamily(nScale, 'light', cp).ctaInk : t.themed.scale.ctaInk
    const linkStop = linkCustom && normalizeHex(linkHexInput.value)
      ? resolveLinkTrio(normalizeHex(linkHexInput.value)!, cp).link
      : fromPrimaryStop
    linkSwatch.style.background = toHex(linkStop.r, linkStop.g, linkStop.b)
    linkHexInput.readOnly = !linkCustom
    linkField.style.opacity = linkCustom ? '1' : '.6'
    linkField.style.cursor = linkCustom ? '' : 'pointer'
    linkResetBtn.style.display = linkCustom ? '' : 'none'
    linkHint.textContent = linkCustom
      ? 'Custom — ↩ returns to the from-primary link'
      : 'From primary — click the hex to customize'
    if (!linkCustom) linkHexInput.value = toHex(fromPrimaryStop.r, fromPrimaryStop.g, fromPrimaryStop.b).toUpperCase()

    renderMatrix(t, nScale)

    // the bar's live swatches: neutral shows its highlight-9; a derived secondary shows the
    // RESOLVED default secondary (the input tracks the primary hex — that's the source, not the result)
    const n9 = nScale.light.find(s => s.stop === 9)
    if (n9) neutralSwatch.style.background = toHex(n9.r, n9.g, n9.b)
    if (t.secondary) {
      const c = t.secondary.scale.cta
      const h = toHex(c.r, c.g, c.b)
      if (secondaryMode === 'derived') {
        secondarySwatch.style.background = h
        secondaryHexInput.value = primaryHex
        secondaryPicker.value = primaryHex
      }
    }

    // chip TONES (Figma spec): the family's own wash/ink; outline = the outline treatment;
    // exact = neutral-grey "hands off". Stops looked up by IDENTITY, never array position
    // (positions shift when the stop set changes — the stop-10 deletion lesson).
    const hxs = (s: { r: number; g: number; b: number }) => toHex(s.r, s.g, s.b)
    const at = (arr: ColorStop[], n: number) => arr.find(s => s.stop === n)!
    if (primaryMode === 'exact') {
      primaryChip.style.background = '#ededf0'; primaryChip.style.color = '#646464'; primaryChip.style.borderColor = 'transparent'
    } else {
      primaryChip.style.background = hxs(at(t.themed.scale.light, 4))
      primaryChip.style.color = hxs(at(t.themed.scale.light, 11))
      primaryChip.style.borderColor = 'transparent'
    }
    if (t.secondary) {
      const sl = t.secondary.scale.light
      if (secondaryStyle === 'exact') {
        secondaryChip.style.background = '#ededf0'; secondaryChip.style.color = '#646464'; secondaryChip.style.borderColor = 'transparent'
      } else if (secondaryStyle === 'outline') {
        secondaryChip.style.background = 'transparent'; secondaryChip.style.color = hxs(at(sl, 10)); secondaryChip.style.borderColor = hxs(at(sl, 8))
      } else {
        secondaryChip.style.background = hxs(at(sl, 6)); secondaryChip.style.color = hxs(at(sl, 11)); secondaryChip.style.borderColor = 'transparent'
      }
    }
    syncInfoLines()
  } catch (e) {
    // partial hex mid-typing lands here by design; anything else is a REAL break —
    // log it so the preview can't go blank silently again (the stop-10 lesson)
    console.warn('okchroma preview render failed:', e)
  }
}

// ─── Apply ───────────────────────────────────────────────────────────────────

// The shared-primitive leaf for an overridden signal: readable label + the
// RESOLVED light-cta hex. The hex is the dedup identity — never the note text:
// C12 mints hue-less notes ("red → rich L0.49"), so two brands can share a note
// while carrying DIFFERENT solved hues, and a note-derived key made the second
// brand's theme alias the FIRST brand's red primitive (shared prims write
// refresh=false — only consulted the first time). Identical resolved variants
// across brands still dedup onto one primitive; the hex suffix also keeps '.'
// out of Figma variable names. The label part is display-only.
const variantKey = (ov: { note: string; scale: GeneratedScale }) => {
  const label = ov.note.split('→').pop()!.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  const c = ov.scale.cta
  return `${label}-${toHex(c.r, c.g, c.b).slice(1)}`
}

function buildAndSend() {
  const name = toSpinal(collectionInput.value)
  if (!name) { setStatus('Enter a brand name first.', 'err'); return }
  collectionInput.value = name // reflect the normalized name back to the field
  const norm = normalizeHex(primaryHexInput.value)
  if (!norm) { setStatus('Enter a valid hex color.', 'err'); return }
  // a ticked custom link with an invalid hex must BLOCK, not silently ship the default
  // posture while the checkbox reads custom (review-caught 2026-07-16 — the primary hex
  // already blocks this way)
  if (linkCustom && !normalizeHex(linkHexInput.value)) {
    setStatus('Enter a valid custom link hex (or untick Custom link color).', 'err'); return
  }

  applyBtn.disabled = true
  setStatus('Applying…')

  try {
    // theme-level resolution: the secondary (derived or custom) resolves against the post-shift
    // signal set; t.themed carries the merged signal overrides for the payload
    const t = resolveTheme(themeInput(name))
    const r = t.themed
    const secondary = t.secondary?.scale ?? null

    // The neutral's shared-primitive key. 'pure' is a true grey (C=0), identical
    // for every brand — so it's keyed hue-INDEPENDENTLY as one shared
    // system/neutral/pure that the plugin reuses across brands (the backend
    // writes shared prims refresh=false ⇒ an existing path is reused, never
    // recreated) instead of duplicating an identical grey ramp per brand (heavy
    // in Figma). The tinted levels genuinely vary by hue, so they key by level +
    // hue (same-hue brands still dedup onto one primitive).
    // NOTE: apca-solved values are DIFFERENT from wcag ones, but paths carry no
    // profile suffix — the file keeps ONE profile per collection pair (code.ts
    // detects a mismatched apply and forks a separate, labeled pair instead of
    // ever mixing values inside one).
    const neutralKey = neutralLevel === 'pure'
      ? 'pure'
      : `${neutralLevel}-h${Math.round(r.scale.brandH)}`
    // Per-signal variant key for Foundations dedup — keyed on the resolved
    // variant's identity via variantKey (label + cta hex), never the note text.
    // No override → the canonical ramp, keyed 'base'.
    const cp = contrastProfile === 'apca' ? ('apca' as const) : undefined
    const sigScales = signalScalesFor(cp)
    // the escape RESETS the red collision to default (owner 2026-07-16): the brand's
    // ctas ride the neutral register, nothing collides — canonical red ships, no
    // per-brand variant primitive is minted
    const escapeOn = ctaEscape && inRedRange
    const signals = SIGNALS.map(s => {
      const ov = escapeOn && s.name === 'red' ? undefined : r.signalOverrides.find(o => o.name === s.name)
      const variant = ov ? variantKey(ov) : 'base'
      return { name: s.name, scale: ov?.scale ?? sigScales.get(s.name)!.scale, variant }
    })

    const customLink = linkCustom ? normalizeHex(linkHexInput.value) : null
    const { light, dark } = themeToFigma(r, { secondary, secondaryStyle: t.secondary?.style, neutralLevel, signals, contrastProfile: cp, ctaEscape: ctaEscape && inRedRange, linkHex: customLink })

    // The engine now names signals by identity (red / yellow / green /
    // blue), so both the primitive path (system/<identity>/<variant>) and
    // the theme-collection group name are just s.name — no role→identity remap.

    // brand + secondary: unique per brand → raw values under brand/<brand>/<role>.
    const brandRaw = [
      { role: 'primary', light: light.brand, dark: dark.brand },
      { role: 'secondary', light: light.secondary, dark: dark.secondary },
    ]
    // neutral + signals: shared → one copy in primitive at a variant-keyed
    // path, aliased from the theme collection's semantic group.
    const shared = [
      { theme: 'neutral', prim: `system/neutral/${neutralKey}`, light: light.neutral, dark: dark.neutral },
      ...signals.map(s => ({
        theme: s.name,
        prim: `system/${s.name}/${s.variant}`,
        light: light[s.name],
        dark: dark[s.name],
      })),
      // CUSTOM system link: one shared prim trio, keyed by the SEED hex (review-caught
      // 2026-07-16: the old resolved-LIGHT-hex key collided distinct seeds whose light
      // solves matched but darks differed — the second brand silently rode the first's
      // dark trio — and a states/dark-only engine retune reused the stale prim wholesale).
      // Seed-keyed, the path is stable per input and the write path refreshes its values
      // every apply (idempotent: same seed ⇒ same engine output). Old light-hex prims
      // orphan harmlessly (scopes=[], unbindable — the red-variant class). Default
      // posture sends nothing: the plugin aliases the brand's own cta-ink family.
      ...(customLink ? [{
        theme: 'link',
        prim: `system/link/${customLink.slice(1)}`,
        light: light.link, dark: dark.link,
      }] : []),
    ]

    // confirmed only when this exact name was just flagged as an overwrite.
    const confirmed = pendingName === name
    parent.postMessage({ pluginMessage: { type: 'apply', brand: name, brandRaw, shared, confirmed, secondary: secondaryMode !== 'off', contrastProfile, ctaEscape: ctaEscape && inRedRange } }, '*')
  } catch (err) {
    applyBtn.disabled = false
    setStatus(String(err), 'err')
  }
}

// ─── Event wiring ─────────────────────────────────────────────────────────────

primaryHexInput.addEventListener('input', () => {
  const norm = normalizeHex(primaryHexInput.value)
  if (norm) {
    primaryHex = norm
    primarySwatch.style.background = norm
    primaryPicker.value = norm
    primaryHexInput.classList.remove('invalid')
  } else {
    primaryHexInput.classList.toggle('invalid', primaryHexInput.value !== '')
  }
  updatePreview()
})

primaryPicker.addEventListener('input', () => {
  const v = primaryPicker.value.toUpperCase()
  primaryHex = v
  primaryHexInput.value = v
  primarySwatch.style.background = v
  primaryHexInput.classList.remove('invalid')
  updatePreview()
})

primaryModeSelect.addEventListener('change', () => {
  primaryMode = primaryModeSelect.value as typeof primaryMode
  updatePreview()
})

secondaryAddBtn.addEventListener('click', () => setSecondaryMode('derived'))

// typing (or picking) while derived DETACHES to custom with the entered value
secondaryHexInput.addEventListener('input', () => {
  if (secondaryMode === 'derived') setSecondaryMode('custom')
  const norm = normalizeHex(secondaryHexInput.value)
  if (norm) {
    secondaryHex = norm
    secondarySwatch.style.background = norm
    secondaryPicker.value = norm
    secondaryHexInput.classList.remove('invalid')
  } else {
    secondaryHex = null
    secondaryHexInput.classList.toggle('invalid', secondaryHexInput.value !== '')
  }
  updatePreview()
})

secondaryPicker.addEventListener('input', () => {
  if (secondaryMode === 'derived') setSecondaryMode('custom')
  const v = secondaryPicker.value.toUpperCase()
  secondaryHex = v
  secondaryHexInput.value = v
  secondarySwatch.style.background = v
  secondaryHexInput.classList.remove('invalid')
  updatePreview()
})

// ONE select carries the whole offering (owner 2026-07-12): From primary / Custom (their
// hex through the model) / Exact / Remove.
secondaryStyleSelect.addEventListener('change', () => {
  const v = secondaryStyleSelect.value
  if (v === 'from-primary') { setSecondaryMode('derived'); return }
  if (v === 'remove') {
    secondaryHex = null
    secondaryHexInput.value = ''
    setSecondaryMode('off')
    return
  }
  // custom starts from what derived showed — prefill the primary hex (demo parity)
  if (!secondaryHex) {
    secondaryHex = primaryHex
    secondaryHexInput.value = primaryHex
    secondaryPicker.value = primaryHex
    secondarySwatch.style.background = primaryHex
  }
  secondaryStyle = v as SecondaryStyle
  setSecondaryMode('custom')
})

neutralSelect.addEventListener('change', () => {
  neutralLevel = neutralSelect.value as NeutralLevel
  updatePreview()
})

profileBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    profileBtns.forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    contrastProfile = btn.dataset.profile as ContrastProfile
    updatePreview()
  })
})

ctaEscapeBox.addEventListener('change', () => {
  ctaEscape = ctaEscapeBox.checked
  // the BUNDLE (owner 2026-07-16): a neutralized cta family shouldn't leave links riding
  // grey neutral ink — ticking the escape auto-enables the custom de-conflict blue.
  // Overridable: edit the hex or ↩ back; unticking reverts ONLY an untouched bundle.
  if (ctaEscape && !linkCustom) {
    linkCustom = true
    linkBundled = true
    linkHexInput.value = DEFAULT_LINK_HEX
  } else if (!ctaEscape && linkBundled
    && normalizeHex(linkHexInput.value)?.toLowerCase() === DEFAULT_LINK_HEX.toLowerCase()) {
    linkCustom = false
    linkBundled = false
  }
  updatePreview()
})

fullChromaBox.addEventListener('change', () => {
  fullChroma = fullChromaBox.checked
  updatePreview()
})

// FIELD TAKEOVER (owner Advanced-menu spec): clicking the from-primary hex makes the
// link custom (prefilled with the default de-conflict blue); ↩ returns to from-primary
linkField.addEventListener('click', () => {
  if (linkCustom) return
  linkCustom = true
  linkBundled = false
  linkHexInput.value = DEFAULT_LINK_HEX
  updatePreview()
  linkHexInput.focus()
  linkHexInput.select()
})
linkResetBtn.addEventListener('click', e => {
  e.stopPropagation()
  linkCustom = false
  linkBundled = false
  linkHexInput.classList.remove('invalid')
  updatePreview()
})
linkHexInput.addEventListener('input', () => {
  if (!linkCustom) return
  linkBundled = false // a hand-edited bundle no longer auto-reverts with the escape
  // an EMPTY field is invalid too while custom — apply blocks on it below
  linkHexInput.classList.toggle('invalid', !normalizeHex(linkHexInput.value))
  updatePreview()
})

applyBtn.addEventListener('click', buildAndSend)

window.addEventListener('message', e => {
  const msg = (e.data as {
    pluginMessage?: { type: string; message?: string; brand?: string; aliases?: number; createdShared?: number; secondary?: string }
  }).pluginMessage
  if (!msg) return
  applyBtn.disabled = false
  if (msg.type === 'done') {
    pendingName = null
    const acc = msg.secondary && msg.secondary !== 'real' ? `, secondary ${msg.secondary}` : ''
    const grew = msg.createdShared ? `, ${msg.createdShared} new primitives` : ''
    setStatus(`✓ ${msg.brand}: ${msg.aliases} aliased${grew}${acc}`, 'ok')
  } else if (msg.type === 'confirm') {
    pendingName = msg.brand ?? null
    setStatus(msg.message ?? `"${msg.brand}" already exists — click Apply again`, 'err')
  } else if (msg.type === 'error') {
    setStatus(msg.message ?? 'Unknown error', 'err')
  }
})

// ─── Init ─────────────────────────────────────────────────────────────────────

// the six archetype anchors under the primary's mode select (source of truth: the engine)
for (const a of ARCHETYPES) {
  const opt = document.createElement('option')
  opt.value = a.name
  opt.textContent = a.name
  archetypeGroup.appendChild(opt)
}

updatePreview()
