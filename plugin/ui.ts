import { resolveTheme, signalScalesFor, type SecondaryStyle, type ResolvedTheme } from '../src/engine/resolve'
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
// derived is always pastel, the engine's call).
let primaryMode: 'recommended' | 'exact' | Archetype = 'recommended'
let secondaryStyle: SecondaryStyle = 'tint'
let contrastProfile: ContrastProfile = 'apca' // APCA = the shipped default; WCAG = the opt-in legal mode
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
const archetypeGroup     = $<HTMLElement>('archetype-group')
const secondarySlot      = $<HTMLElement>('secondary-slot')
const secondaryAddBtn    = $<HTMLButtonElement>('secondary-add')
const secondaryField     = $<HTMLElement>('secondary-field')
const secondaryHexInput  = $<HTMLInputElement>('secondary-hex')
const secondaryPicker    = $<HTMLInputElement>('secondary-picker')
const secondarySwatch    = $<HTMLElement>('secondary-swatch')
const secondaryMarker    = $<HTMLElement>('secondary-marker')
const secondaryStyleSelect = $<HTMLSelectElement>('secondary-style')
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

function setSecondaryMode(mode: SecondaryMode) {
  secondaryMode = mode
  secondaryAddBtn.style.display = mode === 'off' ? '' : 'none'
  secondaryField.style.display = mode === 'off' ? 'none' : ''
  secondaryMarker.style.display = mode === 'derived' ? '' : 'none'
  secondaryStyleSelect.style.display = mode === 'custom' ? '' : 'none'
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
// Stop 8 renders AS a stroke (it's the boundary stop); cta cells carry the family's cta-stroke.
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
      else if (n === 9 || n === 10) cells.push(`<div class="mx-aa" style="background:${h};color:${pole(row.scale.onHighlightIsWhite)}" title="highlight-${n}">Aa</div>`)
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
  } catch { /* ignore partial hex during typing */ }
}

// ─── Apply ───────────────────────────────────────────────────────────────────

function buildAndSend() {
  const name = toSpinal(collectionInput.value)
  if (!name) { setStatus('Enter a brand name first.', 'err'); return }
  collectionInput.value = name // reflect the normalized name back to the field
  const norm = normalizeHex(primaryHexInput.value)
  if (!norm) { setStatus('Enter a valid hex color.', 'err'); return }

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
    // Per-signal variant key for Foundations dedup. An override note reads
    // "warning → lemon" / "success → teal-side"; we key on the right-hand side
    // (lemon, teal-side, …). No override → the canonical ramp, keyed 'base'.
    const cp = contrastProfile === 'apca' ? ('apca' as const) : undefined
    const sigScales = signalScalesFor(cp)
    const signals = SIGNALS.map(s => {
      const ov = r.signalOverrides.find(o => o.name === s.name)
      const variant = ov ? ov.note.split('→').pop()!.trim().toLowerCase().replace(/\s+/g, '-') : 'base'
      return { name: s.name, scale: ov?.scale ?? sigScales.get(s.name)!.scale, variant }
    })

    const { light, dark } = themeToFigma(r, { secondary, secondaryStyle: t.secondary?.style, neutralLevel, signals, contrastProfile: cp })

    // The engine now names signals by identity (red / yellow / green /
    // info-color), so both the primitive path (system/<identity>/<variant>) and
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
    ]

    // confirmed only when this exact name was just flagged as an overwrite.
    const confirmed = pendingName === name
    parent.postMessage({ pluginMessage: { type: 'apply', brand: name, brandRaw, shared, confirmed, secondary: secondaryMode !== 'off', contrastProfile } }, '*')
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
