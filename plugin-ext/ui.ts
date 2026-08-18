import { resolveTheme, resolveBrand, signalScalesFor, escapeCtaFamily, resolveLinkTrio, DEFAULT_LINK_HEX, normalizeSecondaryStyle, type SecondaryStyle, type ResolvedTheme } from '../src/engine/resolve'
import { redGateDist, RED_GATE } from '../src/engine/collision'
import { ARCHETYPES, type Archetype } from '../src/engine/archetypes'
import { generateNeutralScale, neutralTintHue, type GeneratedScale, type ColorStop, type NeutralLevel, type ContrastProfile } from '../src/engine/colorEngine'
import { SIGNALS } from '../src/engine/signals'
import { toHex } from '../src/engine/cssRender'
import { stopTokenName } from '../src/engine/tokenNames'
import { buildBrandColumns, buildBaseColumns, buildRetiredNeutralRows, BASE_SEED_HEX, type ThemeSpec } from './payload'

// ─── State ───────────────────────────────────────────────────────────────────

let primaryHex = '#E93D82'
let secondaryHex: string | null = null
// the neutral offering is ONE 6-entry choice (owner 2026-08-04; Medium joined 2026-08-11):
// four strengths of the PRIMARY's hue, or an alternate hue SOURCE at the Default strength
// — Match secondary (follows the current secondary live; the recipe stores the SOURCE,
// never a frozen hue) or Custom (the hex's hue tints the grey). Level + source derive
// from the one choice.
type NeutralChoice = NeutralLevel | 'secondary' | 'custom'
let neutralChoice: NeutralChoice = 'default'
const neutralSourceOf = () => (neutralChoice === 'secondary' || neutralChoice === 'custom' ? neutralChoice : undefined)
const neutralLevelOf = (): NeutralLevel => (neutralChoice === 'secondary' || neutralChoice === 'custom' ? 'default' : neutralChoice)
// per-family modes (parity with the demo): the primary's select = Recommended / Exact /
// the six archetype anchors; the secondary's select = its style chip (custom only —
// derived rides the default seed-transform, the engine's call).
let primaryMode: 'recommended' | 'exact' | Archetype = 'recommended'
let secondaryStyle: SecondaryStyle = 'default'
// the six anchors, now offered for the secondary too (owner 2026-07-29). Own state beside
// secondaryStyle: one list in the chip, but an anchor COMPOSES with the posture — it pins the
// ramp's lightness and leaves custom's tinted cta alone. A posture pick clears it.
let secondaryArchetype: Archetype | null = null
const isArchetype = (v: string): v is Archetype => ARCHETYPES.some(a => a.name === v)
// WCAG ONLY (owner 2026-07-29). The preview lens and the "Include APCA columns" opt-in
// are both gone: this plugin was APCA's last exposure, and the owner is not authorised to
// use it for design decisions. Preview and Apply now read the same single lane, so the
// class of bug where the preview showed a different band than Apply wrote goes with them.
// The profile machinery itself stays dormant in src/engine/requirements/profiles.ts (the wcag path
// is a passthrough), so re-enabling is a column list, not a rebuild.
// the NEUTRAL CTA ESCAPE (Phase 3, owner 2026-07-16): red-range brands can swap the cta
// fill trio to the brand-neutral's ink register (near-black light / near-white dark).
// The toggle is VISIBLE only in red range, and the EFFECTIVE flag is ctaEscape &&
// inRedRange — outside the range the checkbox is inert, never force-cleared (clearing
// on every keystroke wiped the toggle through 3-digit intermediate parses like "#EA3",
// review-caught 2026-07-16), and it can't ride an apply or recipe silently either.
let ctaEscape = false
let inRedRange = false        // EFFECTIVE gate: the CURRENT posture's red range
let inRedRangeOffer = false   // OFFER gate: union of both clamp postures (row visibility)
// the SYSTEM LINK (Phase 4, owner 2026-07-16): ONE link trio per theme — hyperlinks, not
// per-family. Default = the primary's ink-stop values (extensions carry their own).
// Custom = the seed through the ink register (#0B57D0 default when toggled).
let linkCustom = false
// the escape BUNDLE (owner 2026-07-16): ticking "Use neutral primary cta" auto-enables
// the custom link (#0B57D0) — overridable; unticking reverts ONLY an untouched bundle
let linkBundled = false
// the VIVIDNESS LEVER (phase 5): default OFF = the shipped dampened registers
let fullChroma = false
// THE CTA-BORDER OPT-OUT (owner 2026-07-31: "on by default but optional"). Default ON, and the
// spec stores it as `false | undefined` rather than `true | false` so that ABSENT means ON —
// every recipe written before this flag existed replays with its strokes intact.
let ctaBorder = true
// THE DESCOPE POSTURE (owner 2026-08-07; role-based since the 2026-08-11 flatten): FILE
// state, not per-brand — unlike every flag above this never rides themeInput/the recipe.
// Default ON (ramp stops + alpha/abs plumbing hidden from every Figma picker; the cta
// bands, link trio and surface planes always stay bindable). Initialized from the file-state
// handshake on load, then carried on every apply message so a re-apply/rebuild/batch
// batch always re-stamps the SAME posture the checkbox currently shows.
let descopePrimitives = true
// brand + the exact confirm TOKEN it was armed with (reason-scoped — the plugin only
// honors a confirm whose reasons haven't changed since it was shown; changing the
// toggle or fields between the two Applies re-confirms)
let pendingConfirm: { name: string; token: string } | null = null
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
const secArchetypeGroup  = $<HTMLElement>('secondary-archetype-group')
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
const neutralHexIn    = $<HTMLInputElement>('neutral-hex')
const neutralPicker   = $<HTMLInputElement>('neutral-picker')
const linkPicker      = $<HTMLInputElement>('link-picker')
const neutralOptSecondary = $<HTMLOptionElement>('neutral-opt-secondary')
const ctaEscapeRow    = $<HTMLElement>('cta-escape-row')
const ctaEscapeBox    = $<HTMLInputElement>('cta-escape')
const linkHexInput    = $<HTMLInputElement>('link-hex')
const linkField       = $<HTMLElement>('link-field')
const linkResetBtn    = $<HTMLButtonElement>('link-reset')
const linkHint        = $<HTMLElement>('link-hint')
const fullChromaBox   = $<HTMLInputElement>('full-chroma')
const ctaBorderBox    = $<HTMLInputElement>('cta-border')
const descopeBox      = $<HTMLInputElement>('descope-primitives')
const linkSwatch      = $<HTMLElement>('link-swatch')
const matrixEl        = $<HTMLElement>('matrix')
const applyBtn        = $<HTMLButtonElement>('apply-btn')
const statusEl        = $<HTMLElement>('status')
const reapplyBtn      = $<HTMLButtonElement>('reapply-btn')
const rebuildBtn      = $<HTMLButtonElement>('rebuild-btn')
const rebuildHexInput = $<HTMLInputElement>('rebuild-hex')
const editSelect      = $<HTMLSelectElement>('edit-select')
const editHint        = $<HTMLElement>('edit-hint')
const editHintText    = $<HTMLElement>('edit-hint-text')

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

// v2 brand names are free-form (they are ONLY a collection name + a tag — never a
// variable path segment, unlike v1): trim and collapse whitespace, keep everything else
// verbatim. The audit fixture's own names (L1-near-black, "vs-red (shifts light)") set the precedent —
// spinal-casing here made manual re-writes of them impossible (owner-caught 2026-07-07).
function cleanName(s: string): string {
  return s.trim().replace(/\s+/g, ' ')
}

function setStatus(text: string, tone: '' | 'ok' | 'err' = '') {
  statusEl.textContent = text
  statusEl.className = `status${tone ? ` ${tone}` : ''}`
}

// ─── The secondary field's three states ──────────────────────────────────────

// the ⓘ copy per selection (Figma spec) — the always-visible tooltip replacement
const STYLE_LABEL: Record<SecondaryStyle, string> = { default: 'Custom', outline: 'Outline', exact: 'Exact' }
const STYLE_INFO: Record<SecondaryStyle, string> = {
  default: 'Your color keeps the ramp; the button is a tint of it',
  outline: 'Outline only',
  exact: 'Your hex ships untouched',
}
const NEUTRAL_LABEL: Record<NeutralChoice, string> = {
  default: 'Default', medium: 'Medium', branded: 'Intense', pure: 'True grey',
  secondary: 'Match secondary', custom: 'Custom…',
}
const NEUTRAL_INFO: Record<NeutralChoice, string> = {
  default: 'Adds a touch of primary hue',
  medium: 'Slightly more tint than Default',
  branded: 'Adds a noticeable tint to neutral',
  pure: 'Neutrals are pure grey',
  secondary: 'Adds a touch of the secondary hue',
  custom: 'Adds a touch of your custom hue',
}

function syncInfoLines() {
  primaryChipLabel.textContent = primaryMode === 'recommended' ? 'Recommended' : primaryMode === 'exact' ? 'Exact' : primaryMode
  primaryInfo.textContent = primaryMode === 'recommended' ? 'Engine adjusts for optimal legibility'
    : primaryMode === 'exact' ? 'Your hex ships untouched'
    : `Anchored to the ${primaryMode} archetype`
  secondaryChipLabel.textContent = secondaryMode === 'derived' ? 'From primary'
    : (secondaryArchetype ?? STYLE_LABEL[secondaryStyle])
  secondaryStyleSelect.value = secondaryMode === 'derived' ? 'from-primary'
    : (secondaryArchetype ?? secondaryStyle)
  secondaryInfoLine.style.display = secondaryMode === 'off' ? 'none' : ''
  // the six names place the BUTTON, not the surfaces (measured 2026-07-29: an anchor moves the
  // cta across the full lightness range and leaves the ramp alone). The copy says which.
  secondaryInfo.textContent = secondaryMode === 'derived' ? 'A lighter take on your primary — derived by default'
    : secondaryArchetype ? `Your color, with the button at ${secondaryArchetype} lightness`
    : STYLE_INFO[secondaryStyle]
  // NEUTRAL-SOURCE HYGIENE (the linkBundled idiom): "Match secondary" must not outlive
  // the secondary it matches — with the secondary off, the choice reverts to Default
  // (the engine helper already falls back; this keeps the CONTROL honest) and the
  // option hides so it can't be re-picked.
  if (neutralChoice === 'secondary' && secondaryMode === 'off') {
    neutralChoice = 'default'
    neutralSelect.value = 'default'
  }
  neutralOptSecondary.hidden = secondaryMode === 'off'
  neutralLabel.textContent = NEUTRAL_LABEL[neutralChoice]
  neutralInfo.textContent = NEUTRAL_INFO[neutralChoice]
  // FIELD TAKEOVER under Custom: the hex input replaces the label, and the overlay
  // select shrinks to the chevron strip so the input stays typeable.
  const nCustom = neutralChoice === 'custom'
  neutralLabel.style.display = nCustom ? 'none' : ''
  neutralHexIn.style.display = nCustom ? '' : 'none'
  neutralSelect.style.left = nCustom ? 'auto' : '0'
  neutralSelect.style.width = nCustom ? '34px' : '100%'
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
  return {
    primaryHex, name,
    primaryMode: primaryMode === 'exact' ? ('exact' as const) : ('recommended' as const),
    primaryArchetype: primaryMode !== 'recommended' && primaryMode !== 'exact' ? primaryMode : undefined,
    secondaryHex: secondaryMode === 'custom' && secondaryHex ? secondaryHex : null,
    deriveSecondary: secondaryMode === 'derived' || undefined,
    secondaryStyle: secondaryMode === 'custom' ? secondaryStyle : undefined,
    secondaryArchetype: secondaryMode === 'custom' ? (secondaryArchetype ?? undefined) : undefined,
    contrastProfile: undefined,
    // emit-layer flags — resolveTheme ignores them; the payload builder hands them to
    // themeToFigma and the recipe stores the EFFECTIVE values, so a stale checkbox
    // can't ride a recipe replay
    ctaEscape: (ctaEscape && inRedRange) || undefined,
    linkHex: (linkCustom && normalizeHex(linkHexInput.value)) || undefined,
    // the neutral's hue SOURCE (owner 2026-08-04) — 'secondary' stores the source so
    // re-applies/backfills follow the brand's CURRENT secondary; custom stores its hex.
    // Absent = the primary's hue; payload.lane() resolves via colorEngine.neutralTintHue.
    neutralSource: neutralSourceOf(),
    neutralHex: neutralChoice === 'custom' ? (normalizeHex(neutralHexIn.value) || undefined) : undefined,
    // the VIVIDNESS LEVER (phase 5, owner copy: "Brand ramps are dampened by default to
    // separate from signals. Turn off for full vividness.") — primary only; rides the
    // recipe so "Re-apply all brands" preserves each brand's posture
    style: fullChroma ? ('full-chroma' as const) : undefined,
    // absent = on (the default). Only the OFF posture is written, so the recipe stays
    // forward-compatible and an older stored spec keeps its strokes.
    ctaBorder: ctaBorder ? undefined : false,
  }
}

// the demo's top-card matrix: every family × ID + the scale stops + the cta pair (light).
// Stop 8 renders AS a stroke (it's the boundary stop); cta cells carry the family's cta-border.
// Cells iterate the scale's ACTUAL stops — a stop change reshapes the grid instead of
// throwing into updatePreview's catch (the 2026-07-29 highlight collapse rode this).
function renderMatrix(t: ResolvedTheme, nScale: GeneratedScale) {
  const sigScales = signalScalesFor(undefined)
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
    ...SIGNALS.map(s => ({ label: s.emitName, scale: effective(s.name) })),
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
    // the ink stops keep the brand's own chroma under the escape (owner 2026-08-13,
    // reverting the 2026-08-12 ink de-chroma) — the scale cells render raw
    for (const s of row.scale.light) {
      const n = s.stop
      const h = hx(s)
      // stop 9 (ink-53-aa) is BOTH the emphasis fill and a text stop (owner
      // 2026-07-29), so it renders as a filled chip carrying its on-emphasis paper — the
      // role highlight-9 used to show. Titles read the live name off stopTokenName (the
      // engine's SSOT) so a future rename never drifts this preview — Stage B (owner
      // 2026-08-07, names only) relabeled every stop; nothing here is hardcoded any more.
      if (n === 8) cells.push(`<div class="mx-cell" style="border:2px solid ${h}" title="${stopTokenName(8)}"></div>`)
      else if (n === 9) cells.push(`<div class="mx-aa" style="background:${h};color:${hx(nScale.light[0])}" title="${stopTokenName(9)} (emphasis fill)">Aa</div>`)
      else if (n >= 10) cells.push(`<div class="mx-aa" style="color:${h};font-size:15px;font-weight:800" title="${stopTokenName(n)}">Aa</div>`)
      else cells.push(`<div class="mx-cell" style="background:${h};box-shadow:inset 0 0 0 1px rgba(0,0,0,.06)" title="${stopTokenName(n)}"></div>`)
    }
    const s8 = hx(st(8))
    if (row.outline) {
      // outline's re-expressed fill trio: transparent + ring + the stop-9 label (the stop
      // the emitted on-cta rides — the variable name was stale post-C33); hover/pressed =
      // the STABLE stop-8 at 9%/18% (the same stop the ring uses; pressed doubles hover)
      const ink9 = hx(st(9))
      const c8 = st(8)
      const rgb = `${Math.round(c8.r * 255)},${Math.round(c8.g * 255)},${Math.round(c8.b * 255)}`
      cells.push(`<div class="mx-aa" style="border:1.5px solid ${s8};color:${ink9}" title="cta (outline)">Aa</div>`)
      cells.push(`<div class="mx-aa" style="border:1.5px solid ${s8};color:${ink9};background:rgba(${rgb},0.09)" title="cta-hover (outline)">Aa</div>`)
      cells.push(`<div class="mx-aa" style="border:1.5px solid ${s8};color:${ink9};background:rgba(${rgb},0.18)" title="cta-pressed (outline)">Aa</div>`)
    } else if (row.escape) {
      // the neutral cta escape: the fill trio previews the brand-neutral's ink register
      const esc = escapeCtaFamily(nScale, 'light', undefined)
      const on = pole(esc.onFillIsWhite)
      cells.push(`<div class="mx-aa" style="background:${hx(esc.cta)};color:${on}" title="cta/enabled (neutral escape)">Aa</div>`)
      cells.push(`<div class="mx-aa" style="background:${hx(esc.ctaHover)};color:${on}" title="cta/hover (neutral escape)">Aa</div>`)
      cells.push(`<div class="mx-aa" style="background:${hx(esc.ctaPressed)};color:${on}" title="cta/pressed (neutral escape)">Aa</div>`)
    } else {
      // filled cta cells carry NO stroke (filled is filled); only outline shows its ring
      const on = pole(row.scale.onFillTextIsWhite)
      cells.push(`<div class="mx-aa" style="background:${hx(row.scale.cta)};color:${on}" title="cta/enabled">Aa</div>`)
      cells.push(`<div class="mx-aa" style="background:${hx(row.scale.ctaHover)};color:${on}" title="cta/hover">Aa</div>`)
      cells.push(`<div class="mx-aa" style="background:${hx(row.scale.ctaPressed)};color:${on}" title="cta/pressed">Aa</div>`)
    }
    // (the cta-ink + cta-ink-strong preview columns DELETED with their tokens, owner
    // 2026-08-12: the text-style cta is the ink stops, already rendered as scale cells
    // above — escaped values included via effStop.)
    return cells.join('')
  }

  // the grid's column count FOLLOWS THE SCALE (see .matrix in ui-template.html): one ID
  // cell, one per stop, then the cta fill trio. Derived, never
  // written down — a stop change must not be able to knock the rows out of alignment again.
  matrixEl.style.setProperty('--mx-cols', String(1 + nScale.light.length + 3))
  matrixEl.innerHTML = rows.map(rowHtml).join('')
}

function updatePreview() {
  try {
    const t = resolveTheme(themeInput('x'))
    // the neutral rides the RESOLVED tint hue (the one engine rule) — every consumer
    // below (matrix, swatch, escape preview, link field) reads THIS nScale, so a source
    // pick can never leave the escape anchored off a neutral the theme no longer ships
    const nH = neutralTintHue(t.themed.scale.brandH, neutralSourceOf(), t.secondary?.scale.brandH, normalizeHex(neutralHexIn.value) || null)
    const nScale = generateNeutralScale(nH, neutralLevelOf(), undefined)

    // red-range detection: the repel FIRING means the given hex was in the red region
    // (recommended mode exits the register, so the resolved cta alone would miss exactly
    // the brands the escape is for); the direct gate check catches exact-mode reds.
    // The toggle stays checked-but-inert outside the range (effective = && inRedRange).
    const redCta = signalScalesFor(undefined).get('red')!.scale.cta
    // TWO GATES (owner-caught + review-hardened 2026-07-16): the OFFER (row visibility)
    // is the union of BOTH clamp postures — membership is NOT monotone in the lever
    // (probe the OPPOSITE posture; a one-way probe collapsed when the clamp was on), so
    // the row never appears/disappears with the clamp. The EFFECTIVE flag stays the
    // CURRENT posture only — the file/recipe can never carry an escape for a brand whose
    // shipped posture isn't red-range (the original phase-3 contract).
    const rangeOf = (rb: { redRepel: unknown; scale: { cta: { L: number; C: number; H: number } } }) =>
      !!rb.redRepel || redGateDist(rb.scale.cta, redCta) <= RED_GATE.G
    inRedRange = rangeOf(t.themed)
    inRedRangeOffer = inRedRange || rangeOf(resolveBrand(primaryHex, 'range-probe', {
      style: fullChroma ? undefined : 'full-chroma',
      exact: primaryMode === 'exact' || undefined,
      archetypeOverride: primaryMode !== 'recommended' && primaryMode !== 'exact' ? primaryMode : undefined,
    }))
    ctaEscapeRow.style.display = inRedRangeOffer ? '' : 'none'
    // BUNDLE HYGIENE (review-caught): an untouched bundle auto-reverts the moment the
    // escape stops being effective — the frozen default blue must not outlive the escape
    // it was bundled with, nor BAKE INTO THE RECIPE for a non-red brand (batch re-applies
    // would replay it forever).
    if (linkBundled && !(ctaEscape && inRedRange)
      && normalizeHex(linkHexInput.value)?.toLowerCase() === DEFAULT_LINK_HEX.toLowerCase()) {
      linkCustom = false
      linkBundled = false
    }

    // the link FIELD previews the RESOLVED system link: custom seed through the ink
    // register, else the primary's ink-53-aa. The from-primary posture shows
    // the resolved hex GREYED + read-only; clicking the hex takes it over (owner
    // Advanced-menu spec 2026-07-16).
    const fromPrimaryStop = t.themed.scale.light.find(s => s.stop === 9)!
    const linkStop = linkCustom && normalizeHex(linkHexInput.value)
      ? resolveLinkTrio(normalizeHex(linkHexInput.value)!, undefined).link
      : fromPrimaryStop
    linkSwatch.style.background = toHex(linkStop.r, linkStop.g, linkStop.b)
    // the picker opens on what the field SHOWS (custom seed, or the from-primary
    // resolution) rather than a stale default
    linkPicker.value = normalizeHex(linkHexInput.value) ?? toHex(linkStop.r, linkStop.g, linkStop.b)
    linkHexInput.readOnly = !linkCustom
    linkField.style.opacity = linkCustom ? '1' : '.6'
    linkField.style.cursor = linkCustom ? '' : 'pointer'
    linkResetBtn.style.display = linkCustom ? '' : 'none'
    linkHint.textContent = linkCustom
      ? 'Custom — ↩ returns to the from-primary link'
      : 'From primary — click the hex to customize'
    if (!linkCustom) linkHexInput.value = toHex(fromPrimaryStop.r, fromPrimaryStop.g, fromPrimaryStop.b).toUpperCase()

    renderMatrix(t, nScale)

    // the bar's live swatches: neutral shows its emphasis fill (stop 9, ink-53-aa
    // since the 2026-07-29 collapse); a derived secondary shows the RESOLVED default
    // secondary (the input tracks the primary hex — that's the source, not the result)
    const n9 = nScale.light.find(s => s.stop === 9)
    if (n9) neutralSwatch.style.background = toHex(n9.r, n9.g, n9.b)
    // the neutral picker seeds from the custom hue when set, else the primary — the
    // hue currently feeding the tint, not the resolved grey the swatch paints
    neutralPicker.value = normalizeHex(neutralHexIn.value) ?? (normalizeHex(primaryHex) ?? '#E93D82')
    if (t.secondary) {
      const c = t.secondary.scale.cta
      const h = toHex(c.r, c.g, c.b)
      if (secondaryMode === 'derived') {
        secondarySwatch.style.background = h
        secondaryHexInput.value = primaryHex
        secondaryPicker.value = primaryHex
      } else if (secondaryHex) {
        // LEAVING DERIVED USED TO STRAND THE SWATCH (owner-caught 2026-07-29): the swatch was
        // only ever repainted inside the derived branch, so switching to Custom or Exact with a
        // hex already set left the old derived TINT sitting next to a field reading the real
        // hex — it looked like the engine had paled the user's colour when it had not. Custom
        // and Exact show the supplied hex, matching the demo's swatch rule.
        secondarySwatch.style.background = secondaryHex
      }
    }

    // chip TONES (Figma spec): the family's own wash/ink; outline = the outline treatment;
    // exact = neutral-grey "hands off". Stops looked up by IDENTITY, never array position
    // (positions shift when the stop set changes — the stop-10 deletion lesson).
    const hxs = (s: { r: number; g: number; b: number }) => toHex(s.r, s.g, s.b)
    // NAME the miss (2026-07-29): `at` used a bare non-null assertion, so a stop that no longer
    // exists returned undefined and surfaced as "Cannot read properties of undefined (reading
    // 'r')" from inside hxs — unattributable. Both chips asked for stop 11, which C33's ink
    // renumber removed from the array (it emits as an off-scale literal), so BOTH chip colours
    // threw on every render and the throw skipped syncInfoLines below it. Fail loudly instead.
    const at = (arr: ColorStop[], n: number) => {
      const s = arr.find(x => x.stop === n)
      if (!s) throw new Error(`chip preview asked for stop ${n}, which is not in the ramp (${arr.map(x => x.stop).join(',')})`)
      return s
    }
    if (primaryMode === 'exact') {
      primaryChip.style.background = '#ededf0'; primaryChip.style.color = '#646464'; primaryChip.style.borderColor = 'transparent'
    } else {
      primaryChip.style.background = hxs(at(t.themed.scale.light, 4))
      primaryChip.style.color = hxs(at(t.themed.scale.light, 11))
      primaryChip.style.borderColor = 'transparent'
    }
    if (t.secondary) {
      const sl = t.secondary.scale.light
      // GREY IS FOR HANDS-OFF ONLY. The chip reads the EFFECTIVE posture, not secondaryStyle
      // alone: an anchor now sends style 'exact' (it rides the hands-off ramp), and derived
      // leaves whatever style was last picked in place — both used to inherit the grey Exact
      // chip and stop looking like a colour at all. Matches the demo's `tone` logic.
      const greyChip = secondaryMode === 'custom' && !secondaryArchetype && secondaryStyle === 'exact'
      if (greyChip) {
        secondaryChip.style.background = '#ededf0'; secondaryChip.style.color = '#646464'; secondaryChip.style.borderColor = 'transparent'
      } else if (secondaryMode === 'custom' && secondaryStyle === 'outline') {
        secondaryChip.style.background = 'transparent'; secondaryChip.style.color = hxs(at(sl, 11)); secondaryChip.style.borderColor = hxs(at(sl, 8))
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

function buildAndSend() {
  const name = cleanName(collectionInput.value)
  if (!name) { setStatus('Enter a brand name first.', 'err'); return }
  collectionInput.value = name // reflect the trimmed name back to the field
  const norm = normalizeHex(primaryHexInput.value)
  if (!norm) { setStatus('Enter a valid hex color.', 'err'); return }
  // a ticked custom link with an invalid hex must BLOCK, not silently apply (and bake)
  // the default posture into the recipe (review-caught 2026-07-16)
  if (linkCustom && !normalizeHex(linkHexInput.value)) {
    setStatus('Enter a valid custom link hex (or untick Custom link color).', 'err'); return
  }

  applyBtn.disabled = true
  setStatus('Applying…')

  try {
    // v2 sends flat token COLUMNS (wcag · wcag-dark · apca · apca-dark — both lanes,
    // always): this brand's semantic set, plus the DEFAULT-SEED base set (used only when
    // the base collection — or its brand-secondary group — is created). No dedup keys,
    // no shared-primitive paths, no profile picker: the diff against the base IS the
    // dedup, and the solve columns carry the profile axis. The RECIPE rides along and
    // gets stamped on the extension — it powers the automatic secondary check and
    // "Re-apply all brands".
    const { contrastProfile: _previewOnly, ...theme } = themeInput(name)
    const recipe: Recipe = { brand: name, theme, neutralLevel: neutralLevelOf(), hasSecondary: secondaryMode !== 'off' }
    const brandTokens = buildBrandColumns(theme, neutralLevelOf())
    const baseTokens = buildBaseColumns(fileBaseSeed)
    const retiredNeutral = buildRetiredNeutralRows(fileBaseSeed) // heals pre-retune base rows (2026-08-11)

    // reason-scoped confirm: echo back the exact token the confirm was armed with —
    // the plugin re-derives the reasons and only proceeds if they still match
    const confirmedToken = pendingConfirm?.name === name ? pendingConfirm.token : undefined
    // a LOADED theme whose name changed renames its extension in place (case-insensitive,
    // matching the sandbox's identity rule) — same-name edits ride the normal update path
    const renameFrom = loadedBrand && loadedBrand.trim().toLowerCase() !== name.trim().toLowerCase()
      ? loadedBrand : undefined
    parent.postMessage({ pluginMessage: { type: 'apply', brand: name, brandTokens, baseTokens, retiredNeutral, hasSecondary: recipe.hasSecondary, confirmedToken, spec: recipe, renameFrom, descopePrimitives } }, '*')
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

// ONE select carries the whole offering (owner 2026-07-12, extended 2026-07-29): From primary /
// Custom (their hex keeps the ramp, the button is a tint) / Exact / Remove / the six anchors.
secondaryStyleSelect.addEventListener('change', () => {
  const v = secondaryStyleSelect.value
  if (v === 'from-primary') { setSecondaryMode('derived'); return }
  if (v === 'remove') {
    secondaryHex = null
    secondaryHexInput.value = ''
    secondaryArchetype = null
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
  // an anchor REPLACES Custom rather than stacking on it (owner 2026-07-29): the six names
  // place the BUTTON, and Custom's tint owns the button, so both cannot apply. An anchor
  // selects the hands-off ramp and pins the cta into its band. A posture pick clears it.
  if (isArchetype(v)) {
    secondaryArchetype = v
    secondaryStyle = 'exact'
  } else {
    secondaryArchetype = null
    secondaryStyle = v as SecondaryStyle
  }
  setSecondaryMode('custom')
})

neutralSelect.addEventListener('change', () => {
  neutralChoice = neutralSelect.value as NeutralChoice
  updatePreview()
  if (neutralChoice === 'custom') { neutralHexIn.focus(); neutralHexIn.select() }
})
neutralHexIn.addEventListener('input', () => {
  // empty/invalid falls back to the primary's hue (the helper's law) — flag, never block
  neutralHexIn.classList.toggle('invalid', neutralHexIn.value !== '' && !normalizeHex(neutralHexIn.value))
  updatePreview()
})
// the swatch PICKERS (owner 2026-08-05: "there is no color picker for the link or for
// custom"). Both mirror the secondary's picker, which flips the field to custom on use:
// picking a neutral hue IS the custom source; picking a link color IS the takeover.
neutralPicker.addEventListener('input', () => {
  neutralChoice = 'custom'
  neutralSelect.value = 'custom'
  neutralHexIn.value = neutralPicker.value.toUpperCase()
  neutralHexIn.classList.remove('invalid')
  updatePreview()
})
linkPicker.addEventListener('input', () => {
  linkCustom = true
  linkBundled = false // a hand-picked color no longer auto-reverts with the escape
  linkHexInput.value = linkPicker.value.toUpperCase()
  linkHexInput.classList.remove('invalid')
  updatePreview()
})

// Include APCA (default off): the ⓘ copy tracks the state so the flip's consequence —
// the confirm + collection-wide backfill — is announced before Apply is ever pressed.
// Changing the toggle DISARMS any armed batch (the arm copy described the old posture)
// and clears a pending single-apply confirm (its token no longer matches anyway).
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

ctaBorderBox.addEventListener('change', () => {
  ctaBorder = ctaBorderBox.checked
  updatePreview()
})

// FILE-level, not per-brand: no updatePreview (the matrix doesn't reflect scopes) and no
// recipe field — just the state var that rides the next apply message as-is.
descopeBox.addEventListener('change', () => {
  descopePrimitives = descopeBox.checked
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
// the swatch opens the PICKER; the field's own click-to-customize takeover must not
// race it (it would flash the default blue before the picked color lands)
linkSwatch.addEventListener('click', e => e.stopPropagation())
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
  // an EMPTY field is invalid too while custom — apply blocks on it
  linkHexInput.classList.toggle('invalid', !normalizeHex(linkHexInput.value))
  updatePreview()
})

applyBtn.addEventListener('click', buildAndSend)

window.addEventListener('message', e => {
  const msg = (e.data as {
    pluginMessage?: {
      type: string; message?: string; brand?: string; token?: string; secondary?: string
      set?: number; removed?: number; inherited?: number; createdVars?: number; baseCreated?: boolean
      secondaryAdded?: boolean; addedCols?: string[]; rowsAdded?: boolean; orphaned?: number
      backfill?: unknown[]; unstamped?: string[]; specs?: unknown[]; reason?: string
      lines?: string[]; baseSeedHex?: string | null; descopePrimitives?: boolean
    }
  }).pluginMessage
  if (!msg) return
  // an active batch (secondary check / re-apply / rebuild) consumes done/error/confirm
  if (queue && (msg.type === 'done' || msg.type === 'error' || msg.type === 'confirm')) {
    const item = queue[qi]
    if (msg.type === 'done') {
      qTotals.set += msg.set ?? 0
      qTotals.removed += msg.removed ?? 0
      qTotals.inherited += msg.inherited ?? 0
      qTotals.baseCreated = qTotals.baseCreated || !!msg.baseCreated
      // column additions + the orphan count must SURVIVE the batch (re-verify 2026-07-16:
      // the flip's primary flow IS a batch — swallowing them hid the stale-value warning)
      for (const c of msg.addedCols ?? []) if (!qTotals.addedCols.includes(c)) qTotals.addedCols.push(c)
      qTotals.orphaned = Math.max(qTotals.orphaned, msg.orphaned ?? 0)
      // a posture flip mid-batch (secondary group or solve columns added): append the
      // other extensions' recipes to this queue
      if (msg.secondaryAdded || msg.addedCols?.length || msg.rowsAdded) enqueueBackfill(msg.backfill ?? [], msg.unstamped)
      if (qi + 1 < queue.length) { qi++; sendQueueItem(); return }
      const label = qLabel, n = queue.length, un = qUnstamped
      queue = null
      queueRebuildSeed = null
      applyBtn.disabled = false
      requestThemeList() // batches add/restamp extensions — the edit picker re-syncs
      setStatus(`✓ ${label}: ${n} brands · ${qTotals.set} overridden · ${qTotals.inherited} inherited`
        + `${qTotals.removed ? ` · ${qTotals.removed} reverted` : ''}${qTotals.baseCreated ? ' · base created' : ''}`
        + `${qTotals.addedCols.length ? ` · ${qTotals.addedCols.join('+')} column(s) added${qTotals.orphaned ? ` (${qTotals.orphaned} stale variable(s) kept default values there)` : ''}` : ''}`
        + `${un.length ? ` · no stored recipe (re-apply manually): ${un.join(', ')}` : ''}`, 'ok')
      return
    }
    const stoppedAt = item?.brand ?? '?'
    queue = null
    queueRebuildSeed = null
    applyBtn.disabled = false
    setStatus(`Batch stopped at ${stoppedAt} — ${msg.message ?? msg.type}`, 'err')
    return
  }
  applyBtn.disabled = false
  if (msg.type === 'done') {
    pendingConfirm = null
    // a single apply while a theme was loaded: the applied brand IS the loaded theme now
    // (same-name update, or the rename's new name); the picker list re-syncs either way
    if (loadedBrand && msg.brand) syncEditState(msg.brand)
    requestThemeList()
    const parts = [`${msg.set ?? 0} overridden`, `${msg.inherited ?? 0} inherited`]
    if (msg.removed) parts.push(`${msg.removed} reverted to base`)
    const grew = msg.baseCreated ? ' · base created' : (msg.createdVars ? ` · ${msg.createdVars} base tokens added` : '')
    const acc = msg.secondary === 'derived' ? ' · secondary derived' : ''
    const colsNote = [
      msg.addedCols?.length
        ? `${msg.addedCols.join('+')} column(s) added${msg.orphaned ? ` (${msg.orphaned} stale variable(s) kept default values there — not in the current token set)` : ''}`
        : '',
      msg.rowsAdded ? 'new base tokens added (other brands backfilled)' : '',
    ].filter(Boolean).join(' · ')
    setStatus(`✓ ${msg.brand}: ${parts.join(' · ')}${grew}${acc}${colsNote ? ` · ${colsNote}` : ''}`, 'ok')
    // a posture flip from a single apply (secondary group or solve columns): run the
    // collection-wide backfill now. The backfill queue's final summary must re-report the
    // added columns + orphan count (this status line is overwritten by 'backfill 1/n'
    // moments later), so they're carried into the fresh queue's totals.
    if (msg.secondaryAdded || msg.addedCols?.length || msg.rowsAdded) {
      enqueueBackfill(msg.backfill ?? [], msg.unstamped, colsNote || undefined)
      if (queue) {
        for (const c of msg.addedCols ?? []) if (!qTotals.addedCols.includes(c)) qTotals.addedCols.push(c)
        qTotals.orphaned = Math.max(qTotals.orphaned, msg.orphaned ?? 0)
      }
    }
  } else if (msg.type === 'confirm') {
    pendingConfirm = msg.brand && msg.token !== undefined ? { name: msg.brand, token: msg.token } : null
    setStatus(msg.message ?? `"${msg.brand}" already exists — click Apply again`, 'err')
  } else if (msg.type === 'error') {
    setStatus(msg.message ?? 'Unknown error', 'err')
  } else if (msg.type === 'specs') {
    const items = ((msg.specs ?? []) as Recipe[]).filter(s => s && typeof s.brand === 'string' && !!s.theme)
    // the EDIT PICKER's refresh (reason-tagged so it can never be mistaken for the
    // re-apply/rebuild round-trips below and start a batch)
    if (msg.reason === 'list') {
      renderEditOptions(items, msg.unstamped ?? [])
      return
    }
    if (rebuildPending) {
      // the rebuild rides the re-apply queue: item 0 re-seeds the base, the rest re-diff
      const seed = rebuildPending
      rebuildPending = null
      if (!items.length) {
        setStatus('Rebuild needs at least one applied brand (it rides the re-apply queue) — apply a brand, then rebuild.', 'err')
        return
      }
      fileBaseSeed = seed
      queueRebuildSeed = seed
      startQueue(items, 'rebuild base')
      if (msg.unstamped?.length) qUnstamped.push(...msg.unstamped)
      return
    }
    if (!items.length) {
      setStatus(`No stored recipes to re-apply${msg.unstamped?.length ? ` — ${msg.unstamped.length} extension(s) predate recipes: ${msg.unstamped.join(', ')}` : ''}.`, 'err')
      return
    }
    startQueue(items, 're-apply')
    if (msg.unstamped?.length) qUnstamped.push(...msg.unstamped)
  } else if (msg.type === 'file-state') {
    // the sandbox's load-time handshake: adopt the file's stored base seed + descope posture
    fileBaseSeed = msg.baseSeedHex || BASE_SEED_HEX
    rebuildHexInput.placeholder = fileBaseSeed
    descopePrimitives = msg.descopePrimitives !== false
    descopeBox.checked = descopePrimitives
  }
})

// ─── The batch queue — serves the automatic secondary check and
// "Re-apply all brands". Every item is a RECIPE (brand + ThemeSpec + options), runs
// through the UNCHANGED single-apply path with confirmed: true, and gets stamped onto
// its extension; the handler above accumulates totals and advances the queue.

type Recipe = { brand: string; theme: ThemeSpec; neutralLevel: NeutralLevel; hasSecondary: boolean }
let queue: Recipe[] | null = null // active batch; null = idle
let qi = 0
let qLabel = 'batch'
let qTotals = { set: 0, removed: 0, inherited: 0, baseCreated: false, addedCols: [] as string[], orphaned: 0 }
let qUnstamped: string[] = []
// the APCA posture a batch runs under is SNAPSHOTTED at queue start (re-verify
// 2026-07-16: reading the live checkbox per item let a mid-batch tick flip the file's
// posture with confirmed:true and no arm mention). The arm copy names what the snapshot
// will do; ticking the box after arming resets the arms (see the change handler).
let reapplyArmed = false
// ─── the REBUILD feature (owner 2026-08-03: "a way to redo the main theme … or change it
// to a different color") ──────────────────────────────────────────────────────────────
// fileBaseSeed: the base collection's seed color — the file-state handshake delivers the
// stored value on load; every payload's base column builds from it so diffs stay against
// THIS file's base, not the fixed default.
let fileBaseSeed: string = BASE_SEED_HEX
let rebuildArmed = false
let rebuildPending: string | null = null   // seed awaiting the collect-specs round-trip
let queueRebuildSeed: string | null = null // active rebuild batch: item 0 carries the flag
let reapplyApcaSnapshot = false // click-time posture, carried across the collect-specs round-trip

function sendQueueItem() {
  const it = queue![qi]
  setStatus(`${qLabel} ${qi + 1}/${queue!.length} — ${it.brand}…`)
  const brandTokens = buildBrandColumns(it.theme, it.neutralLevel)
  const baseTokens = buildBaseColumns(fileBaseSeed)
  const retiredNeutral = buildRetiredNeutralRows(fileBaseSeed) // heals pre-retune base rows (2026-08-11)
  // a rebuild batch: the FIRST item carries the force-reseed flag (the base rebuilds once,
  // then every following item's diff runs against the fresh base)
  const rebuild = qi === 0 && queueRebuildSeed
    ? { rebuildBase: true, baseSeedHex: queueRebuildSeed } : {}
  parent.postMessage({ pluginMessage: { type: 'apply', brand: it.brand, brandTokens, baseTokens, retiredNeutral, hasSecondary: it.hasSecondary, confirmed: true, spec: it, descopePrimitives, ...rebuild } }, '*')
}

// (the apcaPosture parameter died with the Include-APCA toggle, 2026-07-29: there is one
// column set now, so a batch can no longer be armed under a different posture.)
function startQueue(items: Recipe[], label: string) {
  queue = items
  qi = 0
  qLabel = label
  qTotals = { set: 0, removed: 0, inherited: 0, baseCreated: false, addedCols: [], orphaned: 0 }
  qUnstamped = []
  applyBtn.disabled = true
  sendQueueItem()
}

// The collection-wide check after a secondary is ADDED: every other extension's stored
// recipe re-applies (deriving its secondary). Mid-batch, recipes append to the running
// queue (skipping brands already ahead of the cursor); from a single apply, they start
// their own queue. Extensions without a recipe are reported for one manual re-apply.
function enqueueBackfill(specs: unknown[], unstamped?: string[], note?: string) {
  const items = (specs as Recipe[]).filter(s => s && typeof s.brand === 'string' && !!s.theme)
  if (!queue) {
    if (items.length) {
      startQueue(items, 'backfill')
      if (unstamped?.length) qUnstamped.push(...unstamped)
    } else if (unstamped?.length) {
      // no queue will re-report the flip's details — carry them here so the added-columns
      // + stale-variable note isn't lost when only recipe-less extensions exist
      setStatus(`Posture changed${note ? ` (${note})` : ''} — no stored recipes to update; re-apply manually: ${unstamped.join(', ')}`, 'err')
    }
    return
  }
  const ahead = new Set(queue.slice(qi).map(x => x.brand))
  // brands already queued ahead get re-applied (and stamped) by this very batch —
  // only truly orphaned extensions are worth reporting
  if (unstamped?.length) qUnstamped.push(...unstamped.filter(n => !ahead.has(n)))
  for (const it of items) if (!ahead.has(it.brand)) queue.push(it)
}

reapplyBtn.addEventListener('click', () => {
  if (queue) return
  if (!reapplyArmed) {
    reapplyArmed = true
    setStatus(`Rebuilds every brand from its stored recipe (posture + engine refresh). Keep the plugin open. Click again to run.`, 'err')
    return
  }
  reapplyArmed = false
  parent.postMessage({ pluginMessage: { type: 'collect-specs' } }, '*')
})

// ─── Rebuild base theme (owner 2026-08-03: "a way to redo the main theme … or change it
// to a different color"). Armed two-click like re-apply; the hex field empty =
// refresh the CURRENT seed onto today's engine. Overwrites base-row edits by design —
// that is what "redo" means; per-brand extension overrides recompute right after.
rebuildBtn.addEventListener('click', () => {
  if (queue) return
  const raw = rebuildHexInput.value.trim()
  const seed = raw ? normalizeHex(raw) : fileBaseSeed
  if (!seed) { setStatus('Rebuild: enter a valid hex (or leave the field empty to refresh the current base color).', 'err'); return }
  if (!rebuildArmed) {
    rebuildArmed = true
    setStatus(`Overwrites every base "theme" row with the current engine at ${seed}, then re-applies every brand against it. Base-row edits are lost. Click again to run.`, 'err')
    return
  }
  rebuildArmed = false
  rebuildPending = seed
  parent.postMessage({ pluginMessage: { type: 'collect-specs' } }, '*')
})

// ─── Edit an applied theme (owner 2026-08-06: "pull up the themes that are in the
// file to edit") — the picker loads a stored recipe back into the form; Apply then
// updates the extension through the unchanged single-apply path. A name change while
// a theme is loaded RENAMES the extension in place (renameFrom rides the apply).

let loadedBrand: string | null = null
const specCache = new Map<string, Recipe>()

function requestThemeList() {
  parent.postMessage({ pluginMessage: { type: 'collect-specs', reason: 'list' } }, '*')
}

function renderEditOptions(items: Recipe[], unstamped: string[]) {
  specCache.clear()
  for (const it of items) specCache.set(it.brand, it)
  const keep = editSelect.value
  editSelect.innerHTML = ''
  const add = (value: string, label: string, disabled = false) => {
    const opt = document.createElement('option')
    opt.value = value
    opt.textContent = label
    opt.disabled = disabled
    editSelect.appendChild(opt)
  }
  add('', 'New theme…')
  for (const it of items) add(it.brand, it.brand)
  // recipe-less vintages stay visible with the heal path in the label (owner ruling)
  for (const n of unstamped) add(` ${n}`, `${n} — predates stored settings (apply once by name to enable)`, true)
  // the loaded theme wins the selection (a rename just moved it to a new name the old
  // select value can't know); else keep the previous pick; a vanished brand falls to New
  editSelect.value = loadedBrand && specCache.has(loadedBrand) ? loadedBrand
    : keep && specCache.has(keep) ? keep : ''
  if (loadedBrand && !specCache.has(loadedBrand)) syncEditState(null)
}

function syncEditState(brand: string | null) {
  loadedBrand = brand
  editHint.style.display = brand ? '' : 'none'
  if (brand) editHintText.textContent = `Editing “${brand}” — changing the name renames it on Apply`
}

// the exact INVERSE of themeInput(): a stored recipe back onto the state vars and
// controls. One updatePreview() at the end re-derives everything downstream (escape row,
// link field, swatches, chips, matrix) exactly as typing would.
function populateForm(r: Recipe) {
  const t = r.theme
  pendingConfirm = null
  collectionInput.value = r.brand
  const p = normalizeHex(t.primaryHex) ?? '#E93D82'
  primaryHex = p
  primaryHexInput.value = p
  primaryPicker.value = p
  primarySwatch.style.background = p
  primaryHexInput.classList.remove('invalid')
  primaryMode = t.primaryArchetype ?? t.primaryMode ?? 'recommended'
  primaryModeSelect.value = primaryMode
  fullChroma = t.style === 'full-chroma'
  fullChromaBox.checked = fullChroma
  ctaBorder = t.ctaBorder !== false // absent = on (the recipe's forward-compat law)
  ctaBorderBox.checked = ctaBorder
  ctaEscape = !!t.ctaEscape // the stored flag is the EFFECTIVE one — red range re-derives in updatePreview
  ctaEscapeBox.checked = ctaEscape
  linkBundled = false // a loaded link posture is the recipe's own, never an auto-bundle
  linkCustom = !!t.linkHex
  if (t.linkHex) { linkHexInput.value = t.linkHex; linkHexInput.classList.remove('invalid') }
  // secondary BEFORE neutral: the Match-secondary hygiene in syncInfoLines reads its mode
  secondaryArchetype = t.secondaryArchetype ?? null
  secondaryStyle = t.secondaryStyle ? normalizeSecondaryStyle(t.secondaryStyle) : 'default' // old recipes may carry retired style ids
  if (t.secondaryHex) {
    secondaryHex = t.secondaryHex
    secondaryHexInput.value = t.secondaryHex
    secondaryPicker.value = t.secondaryHex
    secondarySwatch.style.background = t.secondaryHex
    secondaryHexInput.classList.remove('invalid')
    setSecondaryMode('custom')
  } else if (t.deriveSecondary) {
    secondaryHex = null
    setSecondaryMode('derived') // the input tracks the primary; updatePreview fills it
  } else {
    secondaryHex = null
    secondaryHexInput.value = ''
    setSecondaryMode('off')
  }
  neutralChoice = t.neutralSource ?? r.neutralLevel ?? 'default'
  neutralSelect.value = neutralChoice
  neutralHexIn.value = t.neutralHex ?? ''
  neutralHexIn.classList.remove('invalid')
  updatePreview()
}

function resetForm() {
  pendingConfirm = null
  collectionInput.value = ''
  primaryHex = '#E93D82'
  primaryHexInput.value = primaryHex
  primaryPicker.value = primaryHex
  primarySwatch.style.background = primaryHex
  primaryHexInput.classList.remove('invalid')
  primaryMode = 'recommended'
  primaryModeSelect.value = 'recommended'
  fullChroma = false; fullChromaBox.checked = false
  ctaBorder = true; ctaBorderBox.checked = true
  ctaEscape = false; ctaEscapeBox.checked = false
  linkCustom = false; linkBundled = false
  linkHexInput.classList.remove('invalid')
  secondaryArchetype = null
  secondaryStyle = 'default'
  secondaryHex = null
  secondaryHexInput.value = ''
  secondaryHexInput.classList.remove('invalid')
  neutralChoice = 'default'
  neutralSelect.value = 'default'
  neutralHexIn.value = ''
  neutralHexIn.classList.remove('invalid')
  setSecondaryMode('off') // runs updatePreview
}

editSelect.addEventListener('change', () => {
  if (queue) { editSelect.value = loadedBrand ?? ''; return } // a running batch owns the form
  const brand = editSelect.value
  if (!brand) { syncEditState(null); resetForm(); return }
  const spec = specCache.get(brand)
  if (!spec) { editSelect.value = loadedBrand ?? ''; return }
  syncEditState(brand)
  populateForm(spec)
  setStatus(`Loaded “${brand}” — edit and Apply to update it.`)
})

// ─── Init ─────────────────────────────────────────────────────────────────────

// the edit picker's first fill — the reason tag keeps the reply out of the batch flows
requestThemeList()

// the six archetype anchors under BOTH mode selects (source of truth: the engine — the count
// is never hardcoded in the template, which carries an empty optgroup for each)
for (const a of ARCHETYPES) {
  for (const group of [archetypeGroup, secArchetypeGroup]) {
    const opt = document.createElement('option')
    opt.value = a.name
    opt.textContent = a.name
    group.appendChild(opt)
  }
}

updatePreview()
