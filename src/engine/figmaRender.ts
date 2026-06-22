// Emits a resolved theme as Figma-native variable-import JSON — one object
// per mode (light / dark). This is a sibling emitter to cssRender.ts off the
// SAME engine data (ResolvedBrand / GeneratedScale); nothing here touches the
// engine core.
//
// Format is the confirmed `figma-variables-generator` shape:
//   - color $value is an OBJECT { colorSpace, components:[r,g,b 0–1], alpha, hex }
//   - nested keys join with '/', so { brand: { '9': … } } => variable "brand/9"
//   - identical token names across the two mode files (the caller writes one
//     file per mode; the filename becomes the Figma mode name)

import { toHex } from './cssRender'
import { stopTokenName, onFillTokenName, type RampKind } from './tokenNames'
import { type GeneratedScale, type ColorStop } from './colorEngine'
import type { ResolvedBrand } from './resolve'

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

export interface FigmaColorToken {
  $type: 'color'
  $value: { colorSpace: 'srgb'; components: [number, number, number]; alpha: 1; hex: string }
}
export type FigmaGroup = { [key: string]: FigmaColorToken | FigmaGroup }

function colorFromStop(s: ColorStop): FigmaColorToken {
  return {
    $type: 'color',
    $value: { colorSpace: 'srgb', components: [clamp01(s.r), clamp01(s.g), clamp01(s.b)], alpha: 1, hex: toHex(s.r, s.g, s.b) },
  }
}

function colorFromHex(white: boolean): FigmaColorToken {
  const v = white ? 1 : 0
  return { $type: 'color', $value: { colorSpace: 'srgb', components: [v, v, v], alpha: 1, hex: white ? '#ffffff' : '#000000' } }
}

// Parse "#rrggbb" → a color token (for neutral families shipped as hex strings).
function colorFromHexString(hex: string): FigmaColorToken {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16) / 255
  const g = parseInt(h.slice(2, 4), 16) / 255
  const b = parseInt(h.slice(4, 6), 16) / 255
  return { $type: 'color', $value: { colorSpace: 'srgb', components: [r, g, b], alpha: 1, hex: hex.toLowerCase() } }
}

// One ramp (stops 1–12 + on-fill) for a single mode. `kind` selects the stop
// 9/10 + on-fill names via the shared tokenNames source of truth.
function rampGroup(stops: ColorStop[], onFillWhite: boolean, kind: RampKind): FigmaGroup {
  const g: FigmaGroup = {}
  for (const s of stops) g[stopTokenName(s.stop, kind)] = colorFromStop(s)
  g[onFillTokenName(kind)] = colorFromHex(onFillWhite)
  return g
}

// Neutral ramp from a 12-hex array (Radix family or branded scale, normalized
// to hex by the caller). on-fill is always white, matching the CSS path.
function neutralGroup(hexes: string[]): FigmaGroup {
  const g: FigmaGroup = {}
  hexes.forEach((hex, i) => { g[stopTokenName(i + 1, 'neutral')] = colorFromHexString(hex) })
  g[onFillTokenName('neutral')] = colorFromHex(true)
  return g
}

export interface ThemeInput {
  // Secondary ramp when present; when null, accent mirrors brand (matching cssRender).
  accent?: GeneratedScale | null
  // The CHOSEN neutral, as 12 hex strings per mode (Radix family or the
  // engine's branded scale, normalized to hex by the caller) — so the export
  // matches what the demo shows.
  neutral: { light: string[]; dark: string[] }
  // Final per-signal scales (base signals already merged with the brand's
  // signalOverrides by the caller), e.g. error / warning / success / info.
  signals: Array<{ name: string; scale: GeneratedScale }>
}

// Returns one nested token object per mode. The caller serializes each to its
// own file (Light.json / Dark.json) and downloads both for import as modes.
export function themeToFigma(r: ResolvedBrand, input: ThemeInput): { light: FigmaGroup; dark: FigmaGroup } {
  const { scale } = r
  const accent = input.accent ?? scale // mirror brand when no secondary
  const accentOnFillLight = input.accent ? input.accent.onFillTextIsWhite : scale.onFillTextIsWhite
  const accentOnFillDark = input.accent ? input.accent.onFillTextIsWhiteDark : scale.onFillTextIsWhiteDark

  const build = (mode: 'light' | 'dark'): FigmaGroup => {
    const g: FigmaGroup = {
      brand: rampGroup(scale[mode], mode === 'light' ? scale.onFillTextIsWhite : scale.onFillTextIsWhiteDark, 'brand'),
      secondary: rampGroup(accent[mode], mode === 'light' ? accentOnFillLight : accentOnFillDark, 'brand'),
      neutral: neutralGroup(input.neutral[mode]),
    }
    for (const sig of input.signals) {
      g[sig.name] = rampGroup(sig.scale[mode], mode === 'light' ? sig.scale.onFillTextIsWhite : sig.scale.onFillTextIsWhiteDark, 'neutral')
    }
    return g
  }

  return { light: build('light'), dark: build('dark') }
}
