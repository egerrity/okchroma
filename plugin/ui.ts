import { resolveTheme, signalScalesFor } from '../src/engine/resolve'
import { type NeutralLevel, type ContrastProfile } from '../src/engine/colorEngine'
import { themeToFigma } from '../src/engine/figmaRender'
import { SIGNALS } from '../src/engine/signals'
import { toHex } from '../src/engine/cssRender'

// ─── State ───────────────────────────────────────────────────────────────────

let primaryHex = '#E93D82'
let secondaryHex: string | null = null
let secondaryEnabled = false
let neutralLevel: NeutralLevel = 'default'
let engineMode: 'recommended' | 'exact' = 'recommended'
let contrastProfile: ContrastProfile = 'wcag' // opt-in APCA re-solve; WCAG = shipped default
let pendingName: string | null = null // brand armed for overwrite confirmation
// secondary posture: DERIVED is the default (owner call 2026-07-04) — the engine derives a
// subtle secondary from the primary; Custom = user hex; Off = mirror posture (as before).
type SecondaryMode = 'derived' | 'custom' | 'off'
let secondaryMode: SecondaryMode = 'derived'

// ─── DOM ─────────────────────────────────────────────────────────────────────

const $  = <T extends HTMLElement>(id: string) => document.getElementById(id) as T
const collectionInput = $<HTMLInputElement>('collection-name')
const primaryHexInput = $<HTMLInputElement>('primary-hex')
const primaryPicker   = $<HTMLInputElement>('primary-picker')
const primarySwatch   = $<HTMLElement>('primary-swatch')
const secondaryToggleBtn = $<HTMLButtonElement>('secondary-btn')
const secondaryRow       = $<HTMLElement>('secondary-row')
const secondaryHexInput  = $<HTMLInputElement>('secondary-hex')
const secondaryPicker    = $<HTMLInputElement>('secondary-picker')
const secondarySwatch    = $<HTMLElement>('secondary-swatch')
const neutralSelect   = $<HTMLSelectElement>('neutral-select')
const segBtns         = document.querySelectorAll<HTMLButtonElement>('.seg-btn[data-mode]')
const profileBtns     = document.querySelectorAll<HTMLButtonElement>('.seg-btn[data-profile]')
const secondaryIncludeBtns = document.querySelectorAll<HTMLButtonElement>('.seg-btn[data-sec]')
const secondaryCustom    = $<HTMLElement>('secondary-custom')
const rampLight       = $<HTMLElement>('ramp-light')
const rampDark        = $<HTMLElement>('ramp-dark')
const rampSecondaryLight = $<HTMLElement>('ramp-secondary-light')
const rampSecondaryDark  = $<HTMLElement>('ramp-secondary-dark')
const secondaryRamps     = $<HTMLElement>('secondary-ramps')
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

// the THEME input: primary + secondary posture + engine mode + contrast profile. The secondary's
// LEVEL follows the engine mode inside resolveTheme (subtle = recommended, standard = exact).
function themeInput(name: string) {
  const cp = contrastProfile === 'apca' ? ('apca' as const) : undefined
  return {
    primaryHex, name,
    secondaryHex: secondaryMode === 'custom' && secondaryEnabled && secondaryHex ? secondaryHex : null,
    deriveSecondary: secondaryMode === 'derived' || undefined,
    exact: engineMode === 'exact' || undefined,
    contrastProfile: cp,
  }
}

function updatePreview() {
  try {
    const t = resolveTheme(themeInput('x'))
    renderRamp(rampLight, t.primary.scale.light)
    renderRamp(rampDark, t.primary.scale.dark)

    if (t.secondary) {
      renderRamp(rampSecondaryLight, t.secondary.scale.light)
      renderRamp(rampSecondaryDark, t.secondary.scale.dark)
      secondaryRamps.style.display = ''
    } else {
      secondaryRamps.style.display = 'none'
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

    const { light, dark } = themeToFigma(r, { secondary, neutralLevel, signals, contrastProfile: cp })

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

secondaryToggleBtn.addEventListener('click', () => {
  secondaryEnabled = !secondaryEnabled
  secondaryToggleBtn.classList.toggle('on', secondaryEnabled)
  secondaryToggleBtn.textContent = secondaryEnabled ? 'Remove' : 'Add secondary'
  secondaryRow.style.display = secondaryEnabled ? 'block' : 'none'
  updatePreview()
})

secondaryHexInput.addEventListener('input', () => {
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
  const v = secondaryPicker.value.toUpperCase()
  secondaryHex = v
  secondaryHexInput.value = v
  secondarySwatch.style.background = v
  secondaryHexInput.classList.remove('invalid')
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

profileBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    profileBtns.forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    contrastProfile = btn.dataset.profile as ContrastProfile
    updatePreview()
  })
})

secondaryIncludeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    secondaryIncludeBtns.forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    secondaryMode = btn.dataset.sec as SecondaryMode
    secondaryCustom.style.display = secondaryMode === 'custom' ? 'block' : 'none'
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

updatePreview()
