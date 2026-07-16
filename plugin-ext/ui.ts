import { resolveTheme, signalScalesFor, type SecondaryStyle, type ResolvedTheme } from '../src/engine/resolve'
import { ARCHETYPES, type Archetype } from '../src/engine/archetypes'
import { generateNeutralScale, type GeneratedScale, type ColorStop, type NeutralLevel, type ContrastProfile } from '../src/engine/colorEngine'
import { SIGNALS } from '../src/engine/signals'
import { toHex } from '../src/engine/cssRender'
import { buildBrandColumns, buildBaseColumns, type ThemeSpec } from './payload'
import { ROSTER, rosterSpec } from './roster'

// ─── State ───────────────────────────────────────────────────────────────────

let primaryHex = '#E93D82'
let secondaryHex: string | null = null
let neutralLevel: NeutralLevel = 'default'
// per-family modes (parity with the demo): the primary's select = Recommended / Exact /
// the six archetype anchors; the secondary's select = its style chip (custom only —
// derived rides the default seed-transform, the engine's call).
let primaryMode: 'recommended' | 'exact' | Archetype = 'recommended'
let secondaryStyle: SecondaryStyle = 'default'
// PREVIEW lens only — the apply writes the file's ACTIVE solve columns. WCAG is this
// plugin’s default lane, so it leads the preview too.
let contrastProfile: ContrastProfile = 'wcag'
// APCA columns are OPT-IN (owner 2026-07-16, default OFF): governs whether apply
// creates the apca/apca-dark columns. A file already carrying them keeps being written
// regardless (delete the columns to drop the lane; with this off they stay deleted —
// no regeneration). Turning it on over an existing base = a confirm + full backfill.
let includeApca = false
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
const includeApcaBox  = $<HTMLInputElement>('include-apca')
const matrixEl        = $<HTMLElement>('matrix')
const applyBtn        = $<HTMLButtonElement>('apply-btn')
const statusEl        = $<HTMLElement>('status')
const smokeBtn        = $<HTMLButtonElement>('smoke-btn')
const smokeLog        = $<HTMLElement>('smoke-log')
const rosterBtn       = $<HTMLButtonElement>('roster-btn')
const reapplyBtn      = $<HTMLButtonElement>('reapply-btn')

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
// verbatim. The roster's own names (L1-near-black, "vs-red (cooler)") set the precedent —
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
  }
}

// the demo's top-card matrix: every family × ID + the 11 stops + the cta pair (light mode).
// Stop 8 renders AS a stroke (it's the boundary stop); cta cells carry the family's cta-border.
// Cells iterate the scale's ACTUAL stops (stop 10 deleted 2026-07-09) — a future stop change
// reshapes the grid instead of throwing into updatePreview's catch.
function renderMatrix(t: ResolvedTheme, nScale: GeneratedScale) {
  const cp = contrastProfile === 'apca' ? ('apca' as const) : undefined
  const sigScales = signalScalesFor(cp)
  const effective = (n: typeof SIGNALS[number]['name']) =>
    t.themed.signalOverrides.find(o => o.name === n)?.scale ?? sigScales.get(n)!.scale

  type Row = { label: string; scale: GeneratedScale; idHex?: string; outline?: boolean }
  const rows: Row[] = [
    { label: 'primary', scale: t.themed.scale, idHex: t.themed.scale.identityHex },
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
      else if (n === 9) cells.push(`<div class="mx-aa" style="background:${h};color:${pole(row.scale.onHighlightIsWhite ?? false)}" title="highlight-9">Aa</div>`)
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
    } else {
      // filled cta cells carry NO stroke (filled is filled); only outline shows its ring
      const on = pole(row.scale.onFillTextIsWhite)
      cells.push(`<div class="mx-aa" style="background:${hx(row.scale.cta)};color:${on}" title="cta">Aa</div>`)
      cells.push(`<div class="mx-aa" style="background:${hx(row.scale.ctaHover)};color:${on}" title="cta-hover">Aa</div>`)
      cells.push(`<div class="mx-aa" style="background:${hx(row.scale.ctaPressed)};color:${on}" title="cta-pressed">Aa</div>`)
    }
    // cta-ink trio: the family's 4.5 text-register link escape — rendered as text like the inks
    for (const [name, c] of [['cta-ink', row.scale.ctaInk], ['cta-ink-hover', row.scale.ctaInkHover], ['cta-ink-pressed', row.scale.ctaInkPressed]] as const)
      cells.push(`<div class="mx-aa" style="color:${hx(c)};font-size:15px;font-weight:800;text-decoration:underline" title="${name}">Aa</div>`)
    return cells.join('')
  }

  matrixEl.innerHTML = rows.map(rowHtml).join('')
}

function updatePreview() {
  try {
    const cp = contrastProfile === 'apca' ? ('apca' as const) : undefined
    const t = resolveTheme(themeInput('x'))
    const nScale = generateNeutralScale(t.themed.scale.brandH, neutralLevel, cp)
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

function buildAndSend() {
  const name = cleanName(collectionInput.value)
  if (!name) { setStatus('Enter a brand name first.', 'err'); return }
  collectionInput.value = name // reflect the trimmed name back to the field
  const norm = normalizeHex(primaryHexInput.value)
  if (!norm) { setStatus('Enter a valid hex color.', 'err'); return }

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
    const recipe: Recipe = { brand: name, theme, neutralLevel, hasSecondary: secondaryMode !== 'off' }
    const brandTokens = buildBrandColumns(theme, neutralLevel)
    const baseTokens = buildBaseColumns()

    // reason-scoped confirm: echo back the exact token the confirm was armed with —
    // the plugin re-derives the reasons and only proceeds if they still match
    const confirmedToken = pendingConfirm?.name === name ? pendingConfirm.token : undefined
    parent.postMessage({ pluginMessage: { type: 'apply', brand: name, brandTokens, baseTokens, hasSecondary: recipe.hasSecondary, confirmedToken, spec: recipe, includeApca } }, '*')
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

// Include APCA (default off): the ⓘ copy tracks the state so the flip's consequence —
// the confirm + collection-wide backfill — is announced before Apply is ever pressed.
// Changing the toggle DISARMS any armed batch (the arm copy described the old posture)
// and clears a pending single-apply confirm (its token no longer matches anyway).
includeApcaBox.addEventListener('change', () => {
  includeApca = includeApcaBox.checked
  rosterArmed = false
  reapplyArmed = false
  pendingConfirm = null
  const copy = document.getElementById('include-apca-copy')
  if (copy) copy.textContent = includeApca
    ? 'On: Apply adds apca columns if missing (asks first, then updates every brand)'
    : 'Off: new files get wcag only; delete both apca columns and they stay deleted'
})

applyBtn.addEventListener('click', buildAndSend)

window.addEventListener('message', e => {
  const msg = (e.data as {
    pluginMessage?: {
      type: string; message?: string; brand?: string; token?: string; secondary?: string
      set?: number; removed?: number; inherited?: number; createdVars?: number; baseCreated?: boolean
      secondaryAdded?: boolean; addedCols?: string[]; orphaned?: number
      backfill?: unknown[]; unstamped?: string[]; specs?: unknown[]
      lines?: string[]
    }
  }).pluginMessage
  if (!msg) return
  // an active batch (roster / secondary check / re-apply) consumes done/error/confirm
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
      if (msg.secondaryAdded || msg.addedCols?.length) enqueueBackfill(msg.backfill ?? [], msg.unstamped)
      if (qi + 1 < queue.length) { qi++; sendQueueItem(); return }
      const label = qLabel, n = queue.length, un = qUnstamped
      queue = null
      applyBtn.disabled = false
      rosterBtn.disabled = false
      setStatus(`✓ ${label}: ${n} brands · ${qTotals.set} overridden · ${qTotals.inherited} inherited`
        + `${qTotals.removed ? ` · ${qTotals.removed} reverted` : ''}${qTotals.baseCreated ? ' · base created' : ''}`
        + `${qTotals.addedCols.length ? ` · ${qTotals.addedCols.join('+')} column(s) added${qTotals.orphaned ? ` (${qTotals.orphaned} stale variable(s) kept default values there)` : ''}` : ''}`
        + `${un.length ? ` · no stored recipe (re-apply manually): ${un.join(', ')}` : ''}`, 'ok')
      return
    }
    const stoppedAt = item?.brand ?? '?'
    queue = null
    applyBtn.disabled = false
    rosterBtn.disabled = false
    setStatus(`Batch stopped at ${stoppedAt} — ${msg.message ?? msg.type}`, 'err')
    return
  }
  applyBtn.disabled = false
  if (msg.type === 'done') {
    pendingConfirm = null
    const parts = [`${msg.set ?? 0} overridden`, `${msg.inherited ?? 0} inherited`]
    if (msg.removed) parts.push(`${msg.removed} reverted to base`)
    const grew = msg.baseCreated ? ' · base created' : (msg.createdVars ? ` · ${msg.createdVars} base tokens added` : '')
    const acc = msg.secondary === 'derived' ? ' · secondary derived' : ''
    const colsNote = msg.addedCols?.length
      ? `${msg.addedCols.join('+')} column(s) added${msg.orphaned ? ` (${msg.orphaned} stale variable(s) kept default values there — not in the current token set)` : ''}`
      : ''
    setStatus(`✓ ${msg.brand}: ${parts.join(' · ')}${grew}${acc}${colsNote ? ` · ${colsNote}` : ''}`, 'ok')
    // a posture flip from a single apply (secondary group or solve columns): run the
    // collection-wide backfill now. The backfill queue's final summary must re-report the
    // added columns + orphan count (this status line is overwritten by 'backfill 1/n'
    // moments later), so they're carried into the fresh queue's totals.
    if (msg.secondaryAdded || msg.addedCols?.length) {
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
    if (!items.length) {
      setStatus(`No stored recipes to re-apply${msg.unstamped?.length ? ` — ${msg.unstamped.length} extension(s) predate recipes: ${msg.unstamped.join(', ')}` : ''}.`, 'err')
      return
    }
    startQueue(items, 're-apply', reapplyApcaSnapshot)
    if (msg.unstamped?.length) qUnstamped.push(...msg.unstamped)
  } else if (msg.type === 'smoke-result') {
    smokeLog.style.display = ''
    smokeLog.textContent = (msg.lines ?? []).join('\n')
  }
})

// ─── Enterprise smoke test (the plan-§2 verify-first probes, on scratch collections) ──

smokeBtn.addEventListener('click', () => {
  smokeLog.style.display = ''
  smokeLog.textContent = 'running…'
  parent.postMessage({ pluginMessage: { type: 'smoke' } }, '*')
})

// ─── The batch queue — serves the roster, the automatic secondary check, and
// "Re-apply all brands". Every item is a RECIPE (brand + ThemeSpec + options), runs
// through the UNCHANGED single-apply path with confirmed: true, and gets stamped onto
// its extension; the handler above accumulates totals and advances the queue.

type Recipe = { brand: string; theme: ThemeSpec; neutralLevel: NeutralLevel; hasSecondary: boolean }
let queue: Recipe[] | null = null // active batch; null = idle
let qi = 0
let qLabel = 'roster'
let qTotals = { set: 0, removed: 0, inherited: 0, baseCreated: false, addedCols: [] as string[], orphaned: 0 }
let qUnstamped: string[] = []
// the APCA posture a batch runs under is SNAPSHOTTED at queue start (re-verify
// 2026-07-16: reading the live checkbox per item let a mid-batch tick flip the file's
// posture with confirmed:true and no arm mention). The arm copy names what the snapshot
// will do; ticking the box after arming resets the arms (see the change handler).
let qIncludeApca = false
let rosterArmed = false
let reapplyArmed = false
let reapplyApcaSnapshot = false // click-time posture, carried across the collect-specs round-trip

function sendQueueItem() {
  const it = queue![qi]
  setStatus(`${qLabel} ${qi + 1}/${queue!.length} — ${it.brand}…`)
  const brandTokens = buildBrandColumns(it.theme, it.neutralLevel)
  const baseTokens = buildBaseColumns()
  parent.postMessage({ pluginMessage: { type: 'apply', brand: it.brand, brandTokens, baseTokens, hasSecondary: it.hasSecondary, confirmed: true, spec: it, includeApca: qIncludeApca } }, '*')
}

// apcaPosture: the snapshot the batch runs under — defaults to the toggle NOW, but
// re-apply passes its CLICK-time snapshot through the async collect-specs round-trip
// (ticking the toggle in that gap must not upgrade a batch armed under the old copy)
function startQueue(items: Recipe[], label: string, apcaPosture: boolean = includeApca) {
  queue = items
  qi = 0
  qLabel = label
  qTotals = { set: 0, removed: 0, inherited: 0, baseCreated: false, addedCols: [], orphaned: 0 }
  qUnstamped = []
  qIncludeApca = apcaPosture
  applyBtn.disabled = true
  rosterBtn.disabled = true
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

// batch runs pass confirmed:true (the arm step IS their confirm) — so when the Include
// APCA toggle is on, the arm copy must name the posture flip the batch may perform
const apcaArmNote = () => (includeApca ? ' Include APCA is ON — adds apca columns if the file lacks them.' : '')

rosterBtn.addEventListener('click', () => {
  if (queue) return // a batch is already running
  if (!rosterArmed) {
    rosterArmed = true
    setStatus(`Applies the fixed ${ROSTER.length}-brand test set (ignores the fields above; overwrites existing roster extensions). `
      + `Keep the plugin open until it finishes.${apcaArmNote()} Click the same button again to start.`, 'err')
    return
  }
  rosterArmed = false
  startQueue(ROSTER.map(e => ({
    brand: e.name,
    theme: rosterSpec(e),
    neutralLevel: e.neutralLevel ?? 'default',
    hasSecondary: !!e.secondaryHex,
  })), 'roster')
})

reapplyBtn.addEventListener('click', () => {
  if (queue) return
  if (!reapplyArmed) {
    reapplyArmed = true
    setStatus(`Rebuilds every brand from its stored recipe (posture + engine refresh). Keep the plugin open.${apcaArmNote()} Click again to run.`, 'err')
    return
  }
  reapplyArmed = false
  // snapshot NOW: collect-specs round-trips through the sandbox before the queue starts,
  // and a toggle tick in that gap must not change the posture the arm copy promised
  reapplyApcaSnapshot = includeApca
  parent.postMessage({ pluginMessage: { type: 'collect-specs' } }, '*')
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
