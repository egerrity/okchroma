import { resolveBrand, SIGNAL_SCALES } from '../src/engine/resolve'
import { type NeutralLevel } from '../src/engine/colorEngine'
import { themeToFigma } from '../src/engine/figmaRender'
import { SIGNALS } from '../src/engine/signals'
import { toHex } from '../src/engine/cssRender'

// ─── State ───────────────────────────────────────────────────────────────────

let primaryHex = '#E93D82'
let accentHex: string | null = null
let accentEnabled = false
let neutralLevel: NeutralLevel = 'default'
let engineMode: 'recommended' | 'exact' = 'recommended'
let pendingName: string | null = null // brand armed for overwrite confirmation
let accentInclude = true // global accent switch (kill-switch)

// ─── DOM ─────────────────────────────────────────────────────────────────────

const $  = <T extends HTMLElement>(id: string) => document.getElementById(id) as T
const collectionInput = $<HTMLInputElement>('collection-name')
const primaryHexInput = $<HTMLInputElement>('primary-hex')
const primaryPicker   = $<HTMLInputElement>('primary-picker')
const primarySwatch   = $<HTMLElement>('primary-swatch')
const accentToggleBtn = $<HTMLButtonElement>('accent-btn')
const accentRow       = $<HTMLElement>('accent-row')
const accentHexInput  = $<HTMLInputElement>('accent-hex')
const accentPicker    = $<HTMLInputElement>('accent-picker')
const accentSwatch    = $<HTMLElement>('accent-swatch')
const neutralSelect   = $<HTMLSelectElement>('neutral-select')
const segBtns         = document.querySelectorAll<HTMLButtonElement>('.seg-btn[data-mode]')
const accentIncludeBtns = document.querySelectorAll<HTMLButtonElement>('.seg-btn[data-acc]')
const accentCustom    = $<HTMLElement>('accent-custom')
const rampLight       = $<HTMLElement>('ramp-light')
const rampDark        = $<HTMLElement>('ramp-dark')
const rampAccentLight = $<HTMLElement>('ramp-accent-light')
const rampAccentDark  = $<HTMLElement>('ramp-accent-dark')
const accentRamps     = $<HTMLElement>('accent-ramps')
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

function renderRamp(el: HTMLElement, stops: Array<{ r: number; g: number; b: number }>) {
  el.innerHTML = stops
    .map(s => `<div class="stop" style="background:${toHex(s.r, s.g, s.b)}"></div>`)
    .join('')
}

function setStatus(text: string, tone: '' | 'ok' | 'err' = '') {
  statusEl.textContent = text
  statusEl.className = `status${tone ? ` ${tone}` : ''}`
}

// ─── Preview ─────────────────────────────────────────────────────────────────

function updatePreview() {
  try {
    const opts = engineMode === 'exact' ? { exact: true } : undefined
    const { scale } = resolveBrand(primaryHex, 'x', opts)
    renderRamp(rampLight, scale.light)
    renderRamp(rampDark, scale.dark)

    // Accent ramp only when accent is globally on AND a color was entered.
    if (accentInclude && accentEnabled && accentHex) {
      const a = resolveBrand(accentHex, 'x', opts).scale
      renderRamp(rampAccentLight, a.light)
      renderRamp(rampAccentDark, a.dark)
      accentRamps.style.display = ''
    } else {
      accentRamps.style.display = 'none'
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
    const opts = engineMode === 'exact' ? { exact: true } : undefined
    const r = resolveBrand(primaryHex, name, opts)
    const accent = accentEnabled && accentHex
      ? resolveBrand(accentHex, 'Accent', opts).scale
      : null

    // The neutral's shared-primitive key. 'pure' is a true grey (C=0), identical
    // for every brand — so it's keyed hue-INDEPENDENTLY as one shared
    // system/neutral/pure that the plugin reuses across brands (the backend
    // writes shared prims refresh=false ⇒ an existing path is reused, never
    // recreated) instead of duplicating an identical grey ramp per brand (heavy
    // in Figma). The tinted levels genuinely vary by hue, so they key by level +
    // hue (same-hue brands still dedup onto one primitive).
    const neutralKey = neutralLevel === 'pure'
      ? 'pure'
      : `${neutralLevel}-h${Math.round(r.scale.brandH)}`
    // Per-signal variant key for Foundations dedup. An override note reads
    // "warning → lemon" / "success → teal-side"; we key on the right-hand side
    // (lemon, teal-side, …). No override → the canonical ramp, keyed 'base'.
    const signals = SIGNALS.map(s => {
      const ov = r.signalOverrides.find(o => o.name === s.name)
      const variant = ov ? ov.note.split('→').pop()!.trim().toLowerCase().replace(/\s+/g, '-') : 'base'
      return { name: s.name, scale: ov?.scale ?? SIGNAL_SCALES.get(s.name)!.scale, variant }
    })

    const { light, dark } = themeToFigma(r, { accent, neutralLevel, signals })

    // The engine now names signals by identity (red / yellow / green /
    // info-color), so both the primitive path (system/<identity>/<variant>) and
    // the theme-collection group name are just s.name — no role→identity remap.

    // brand + accent: unique per brand → raw values under brand/<brand>/<role>.
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
    parent.postMessage({ pluginMessage: { type: 'apply', brand: name, brandRaw, shared, confirmed, accent: accentInclude } }, '*')
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

accentToggleBtn.addEventListener('click', () => {
  accentEnabled = !accentEnabled
  accentToggleBtn.classList.toggle('on', accentEnabled)
  accentToggleBtn.textContent = accentEnabled ? 'Remove' : 'Add accent'
  accentRow.style.display = accentEnabled ? 'block' : 'none'
  updatePreview()
})

accentHexInput.addEventListener('input', () => {
  const norm = normalizeHex(accentHexInput.value)
  if (norm) {
    accentHex = norm
    accentSwatch.style.background = norm
    accentPicker.value = norm
    accentHexInput.classList.remove('invalid')
  } else {
    accentHex = null
    accentHexInput.classList.toggle('invalid', accentHexInput.value !== '')
  }
  updatePreview()
})

accentPicker.addEventListener('input', () => {
  const v = accentPicker.value.toUpperCase()
  accentHex = v
  accentHexInput.value = v
  accentSwatch.style.background = v
  accentHexInput.classList.remove('invalid')
  updatePreview()
})

neutralSelect.addEventListener('change', () => {
  neutralLevel = neutralSelect.value as NeutralLevel
})

segBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    segBtns.forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    engineMode = btn.dataset.mode as typeof engineMode
    updatePreview()
  })
})

accentIncludeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    accentIncludeBtns.forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    accentInclude = btn.dataset.acc === 'on'
    accentCustom.style.display = accentInclude ? 'block' : 'none'
    updatePreview()
  })
})

applyBtn.addEventListener('click', buildAndSend)

window.addEventListener('message', e => {
  const msg = (e.data as {
    pluginMessage?: { type: string; message?: string; brand?: string; aliases?: number; createdShared?: number; accent?: string }
  }).pluginMessage
  if (!msg) return
  applyBtn.disabled = false
  if (msg.type === 'done') {
    pendingName = null
    const acc = msg.accent && msg.accent !== 'real' ? `, accent ${msg.accent}` : ''
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

updatePreview()
