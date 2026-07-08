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
// derived is always pastel, the engine's call).
let primaryMode: 'recommended' | 'exact' | Archetype = 'recommended'
let secondaryStyle: SecondaryStyle = 'tint'
// PREVIEW lens only — the apply always writes all four solve columns (wcag · wcag-dark ·
// apca · apca-dark). WCAG is this plugin’s default lane, so it leads the preview too.
let contrastProfile: ContrastProfile = 'wcag'
let pendingName: string | null = null // brand armed for overwrite confirmation
// The secondary is the demo's THREE-STATE field: none (default — just "+ Add secondary") →
// derived (the input tracks the primary live; the engine derives the pastel secondary) →
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
const secondarySlot      = $<HTMLElement>('secondary-slot')
const secondaryAddBtn    = $<HTMLButtonElement>('secondary-add')
const secondaryField     = $<HTMLElement>('secondary-field')
const secondaryHexInput  = $<HTMLInputElement>('secondary-hex')
const secondaryPicker    = $<HTMLInputElement>('secondary-picker')
const secondarySwatch    = $<HTMLElement>('secondary-swatch')
const secondaryMarker    = $<HTMLElement>('secondary-marker')
const secondaryStyleSelect = $<HTMLSelectElement>('secondary-style')
const secondaryChip      = $<HTMLElement>('secondary-chip')
const secondaryChipLabel = $<HTMLElement>('secondary-chip-label')
const secondaryInfo      = $<HTMLElement>('secondary-info')
const secondaryInfoLine  = $<HTMLElement>('secondary-info-line')
const neutralLabel       = $<HTMLElement>('neutral-label')
const neutralInfo        = $<HTMLElement>('neutral-info')
const secondaryMenuBtn   = $<HTMLButtonElement>('secondary-menu-btn')
const secondaryMenu      = $<HTMLElement>('secondary-menu')
const menuDerived        = $<HTMLButtonElement>('menu-derived')
const menuDerivedSwatch  = $<HTMLElement>('menu-derived-swatch')
const menuCustom         = $<HTMLButtonElement>('menu-custom')
const menuRemove         = $<HTMLButtonElement>('menu-remove')
const neutralSwatch   = $<HTMLElement>('neutral-swatch')
const neutralSelect   = $<HTMLSelectElement>('neutral-select')
const profileBtns     = document.querySelectorAll<HTMLButtonElement>('.seg-btn[data-profile]')
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
const STYLE_LABEL: Record<SecondaryStyle, string> = { tint: 'Tint', pastel: 'Pastel', outline: 'Outline', exact: 'Exact' }
const STYLE_INFO: Record<SecondaryStyle, string> = {
  tint: 'Differentiates from primary with a lighter tint of hue',
  pastel: 'Differentiates from primary with lower chroma and lighter tint',
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
  secondaryChipLabel.textContent = STYLE_LABEL[secondaryStyle]
  secondaryInfoLine.style.display = secondaryMode === 'off' ? 'none' : ''
  secondaryInfo.textContent = secondaryMode === 'derived' ? 'A pastel derived from your primary' : STYLE_INFO[secondaryStyle]
  neutralLabel.textContent = NEUTRAL_LABEL[neutralLevel]
  neutralInfo.textContent = NEUTRAL_INFO[neutralLevel]
}

function setSecondaryMode(mode: SecondaryMode) {
  secondaryMode = mode
  secondaryAddBtn.style.display = mode === 'off' ? '' : 'none'
  secondaryField.style.display = mode === 'off' ? 'none' : ''
  secondaryMarker.style.display = mode === 'derived' ? '' : 'none'
  secondaryChip.style.display = mode === 'custom' ? '' : 'none'
  secondaryHexInput.classList.toggle('dim', mode === 'derived')
  if (mode !== 'custom') secondaryHexInput.classList.remove('invalid')
  menuDerived.classList.toggle('on', mode === 'derived')
  menuCustom.classList.toggle('on', mode === 'custom')
  updatePreview()
}

// ─── Preview ─────────────────────────────────────────────────────────────────

// the THEME input: primary + secondary posture, each under its OWN mode (per-family chips —
// the demo's model exactly). Derived is always pastel; the style select applies to custom only.
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

// the demo's top-card matrix: every family × ID + the 12 stops + the cta pair (light mode).
// Stop 8 renders AS a stroke (it's the boundary stop); cta cells carry the family's cta-border.
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
    for (let n = 1; n <= 12; n++) {
      const h = hx(st(n))
      if (n === 8) cells.push(`<div class="mx-cell" style="border:2px solid ${h}" title="highlight-8"></div>`)
      else if (n === 9 || n === 10) cells.push(`<div class="mx-aa" style="background:${h};color:${pole(row.scale.onHighlightIsWhite ?? false)}" title="highlight-${n}">Aa</div>`)
      else if (n >= 11) cells.push(`<div class="mx-aa" style="color:${h};font-size:15px;font-weight:800" title="ink-${n}">Aa</div>`)
      else cells.push(`<div class="mx-cell" style="background:${h};box-shadow:inset 0 0 0 1px rgba(0,0,0,.06)" title="${n <= 2 ? 'paper' : 'wash'}-${n}"></div>`)
    }
    const s8 = hx(st(8))
    if (row.outline) {
      // outline's re-expressed pair: transparent fill + ring + ink-11 label; hover = the
      // STABLE highlight-8 at 9% (the same stop the ring uses)
      const ink11 = hx(st(11))
      const c8 = st(8)
      const rgb = `${Math.round(c8.r * 255)},${Math.round(c8.g * 255)},${Math.round(c8.b * 255)}`
      cells.push(`<div class="mx-aa" style="border:1.5px solid ${s8};color:${ink11}" title="cta-1 (outline)">Aa</div>`)
      cells.push(`<div class="mx-aa" style="border:1.5px solid ${s8};color:${ink11};background:rgba(${rgb},0.09)" title="cta-2 (outline hover)">Aa</div>`)
    } else {
      // filled cta cells carry NO stroke (filled is filled); only outline shows its ring
      const on = pole(row.scale.onFillTextIsWhite)
      cells.push(`<div class="mx-aa" style="background:${hx(row.scale.cta)};color:${on}" title="cta-1">Aa</div>`)
      cells.push(`<div class="mx-aa" style="background:${hx(row.scale.ctaHover)};color:${on}" title="cta-2">Aa</div>`)
    }
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
    // RESOLVED pastel (the input tracks the primary hex — that's the source, not the result)
    const n9 = nScale.light.find(s => s.stop === 9)
    if (n9) neutralSwatch.style.background = toHex(n9.r, n9.g, n9.b)
    if (t.secondary) {
      const c = t.secondary.scale.cta
      const h = toHex(c.r, c.g, c.b)
      menuDerivedSwatch.style.background = h
      if (secondaryMode === 'derived') {
        secondarySwatch.style.background = h
        secondaryHexInput.value = primaryHex
        secondaryPicker.value = primaryHex
      }
    }

    // chip TONES (Figma spec): the family's own wash/ink; outline = the outline treatment;
    // exact = neutral-grey "hands off"
    const hxs = (s: { r: number; g: number; b: number }) => toHex(s.r, s.g, s.b)
    if (primaryMode === 'exact') {
      primaryChip.style.background = '#ededf0'; primaryChip.style.color = '#646464'; primaryChip.style.borderColor = 'transparent'
    } else {
      primaryChip.style.background = hxs(t.themed.scale.light[3])
      primaryChip.style.color = hxs(t.themed.scale.light[11])
      primaryChip.style.borderColor = 'transparent'
    }
    if (t.secondary) {
      const sl = t.secondary.scale.light
      if (secondaryStyle === 'exact') {
        secondaryChip.style.background = '#ededf0'; secondaryChip.style.color = '#646464'; secondaryChip.style.borderColor = 'transparent'
      } else if (secondaryStyle === 'outline') {
        secondaryChip.style.background = 'transparent'; secondaryChip.style.color = hxs(sl[10]); secondaryChip.style.borderColor = hxs(sl[7])
      } else {
        secondaryChip.style.background = hxs(sl[5]); secondaryChip.style.color = hxs(sl[11]); secondaryChip.style.borderColor = 'transparent'
      }
    }
    syncInfoLines()
  } catch { /* ignore partial hex during typing */ }
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

    // confirmed only when this exact name was just flagged as an overwrite.
    const confirmed = pendingName === name
    parent.postMessage({ pluginMessage: { type: 'apply', brand: name, brandTokens, baseTokens, hasSecondary: recipe.hasSecondary, confirmed, spec: recipe } }, '*')
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

secondaryStyleSelect.addEventListener('change', () => {
  secondaryStyle = secondaryStyleSelect.value as SecondaryStyle
  updatePreview()
})

secondaryMenuBtn.addEventListener('click', () => {
  secondaryMenu.style.display = secondaryMenu.style.display === 'none' ? '' : 'none'
})
menuDerived.addEventListener('click', () => {
  secondaryMenu.style.display = 'none'
  setSecondaryMode('derived')
})
menuCustom.addEventListener('click', () => {
  secondaryMenu.style.display = 'none'
  // custom starts from what derived showed — prefill the primary hex (demo parity)
  if (!secondaryHex) {
    secondaryHex = primaryHex
    secondaryHexInput.value = primaryHex
    secondaryPicker.value = primaryHex
    secondarySwatch.style.background = primaryHex
  }
  setSecondaryMode('custom')
})
menuRemove.addEventListener('click', () => {
  secondaryMenu.style.display = 'none'
  secondaryHex = null
  secondaryHexInput.value = ''
  setSecondaryMode('off')
})
document.addEventListener('mousedown', e => {
  if (secondaryMenu.style.display !== 'none' && !secondarySlot.contains(e.target as Node))
    secondaryMenu.style.display = 'none'
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

applyBtn.addEventListener('click', buildAndSend)

window.addEventListener('message', e => {
  const msg = (e.data as {
    pluginMessage?: {
      type: string; message?: string; brand?: string; secondary?: string
      set?: number; removed?: number; inherited?: number; createdVars?: number; baseCreated?: boolean
      secondaryAdded?: boolean; backfill?: unknown[]; unstamped?: string[]; specs?: unknown[]
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
      // the posture flip mid-batch: append the other extensions' recipes to this queue
      if (msg.secondaryAdded) enqueueBackfill(msg.backfill ?? [], msg.unstamped)
      if (qi + 1 < queue.length) { qi++; sendQueueItem(); return }
      const label = qLabel, n = queue.length, un = qUnstamped
      queue = null
      applyBtn.disabled = false
      rosterBtn.disabled = false
      setStatus(`✓ ${label}: ${n} brands · ${qTotals.set} overridden · ${qTotals.inherited} inherited`
        + `${qTotals.removed ? ` · ${qTotals.removed} reverted` : ''}${qTotals.baseCreated ? ' · base created' : ''}`
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
    pendingName = null
    const parts = [`${msg.set ?? 0} overridden`, `${msg.inherited ?? 0} inherited`]
    if (msg.removed) parts.push(`${msg.removed} reverted to base`)
    const grew = msg.baseCreated ? ' · base created' : (msg.createdVars ? ` · ${msg.createdVars} base tokens added` : '')
    const acc = msg.secondary === 'derived' ? ' · secondary derived' : ''
    setStatus(`✓ ${msg.brand}: ${parts.join(' · ')}${grew}${acc}`, 'ok')
    // the posture flip from a single apply: run the collection-wide secondary check now
    if (msg.secondaryAdded) enqueueBackfill(msg.backfill ?? [], msg.unstamped)
  } else if (msg.type === 'confirm') {
    pendingName = msg.brand ?? null
    setStatus(msg.message ?? `"${msg.brand}" already exists — click Apply again`, 'err')
  } else if (msg.type === 'error') {
    setStatus(msg.message ?? 'Unknown error', 'err')
  } else if (msg.type === 'specs') {
    const items = ((msg.specs ?? []) as Recipe[]).filter(s => s && typeof s.brand === 'string' && !!s.theme)
    if (!items.length) {
      setStatus(`No stored recipes to re-apply${msg.unstamped?.length ? ` — ${msg.unstamped.length} extension(s) predate recipes: ${msg.unstamped.join(', ')}` : ''}.`, 'err')
      return
    }
    startQueue(items, 're-apply')
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
let qTotals = { set: 0, removed: 0, inherited: 0, baseCreated: false }
let qUnstamped: string[] = []
let rosterArmed = false
let reapplyArmed = false

function sendQueueItem() {
  const it = queue![qi]
  setStatus(`${qLabel} ${qi + 1}/${queue!.length} — ${it.brand}…`)
  const brandTokens = buildBrandColumns(it.theme, it.neutralLevel)
  const baseTokens = buildBaseColumns()
  parent.postMessage({ pluginMessage: { type: 'apply', brand: it.brand, brandTokens, baseTokens, hasSecondary: it.hasSecondary, confirmed: true, spec: it } }, '*')
}

function startQueue(items: Recipe[], label: string) {
  queue = items
  qi = 0
  qLabel = label
  qTotals = { set: 0, removed: 0, inherited: 0, baseCreated: false }
  qUnstamped = []
  applyBtn.disabled = true
  rosterBtn.disabled = true
  sendQueueItem()
}

// The collection-wide check after a secondary is ADDED: every other extension's stored
// recipe re-applies (deriving its secondary). Mid-batch, recipes append to the running
// queue (skipping brands already ahead of the cursor); from a single apply, they start
// their own queue. Extensions without a recipe are reported for one manual re-apply.
function enqueueBackfill(specs: unknown[], unstamped?: string[]) {
  const items = (specs as Recipe[]).filter(s => s && typeof s.brand === 'string' && !!s.theme)
  if (!queue) {
    if (items.length) {
      startQueue(items, 'secondary check')
      if (unstamped?.length) qUnstamped.push(...unstamped)
    } else if (unstamped?.length) {
      setStatus(`Secondary added — no stored recipes to update; re-apply manually: ${unstamped.join(', ')}`, 'err')
    }
    return
  }
  const ahead = new Set(queue.slice(qi).map(x => x.brand))
  // brands already queued ahead get re-applied (and stamped) by this very batch —
  // only truly orphaned extensions are worth reporting
  if (unstamped?.length) qUnstamped.push(...unstamped.filter(n => !ahead.has(n)))
  for (const it of items) if (!ahead.has(it.brand)) queue.push(it)
}

rosterBtn.addEventListener('click', () => {
  if (queue) return // a batch is already running
  if (!rosterArmed) {
    rosterArmed = true
    setStatus(`Applies the fixed ${ROSTER.length}-brand test set (ignores the fields above; overwrites existing roster extensions). `
      + 'Keep the plugin open until it finishes. Click the same button again to start.', 'err')
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
    setStatus('Rebuilds every brand from its stored recipe (posture + engine refresh). Keep the plugin open. Click again to run.', 'err')
    return
  }
  reapplyArmed = false
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
