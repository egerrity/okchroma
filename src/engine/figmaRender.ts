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
import { generateNeutralScale, type GeneratedScale, type ColorStop } from './colorEngine'
import { contrastRatio, wcagY } from './constraints'
import type { ResolvedBrand } from './resolve'

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const fillWantsWhite = (s: ColorStop) =>
  contrastRatio(1.0, wcagY(s.L, s.C, s.H)) >= contrastRatio(wcagY(s.L, s.C, s.H), 0)

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

// One ramp for a single mode. `kind` selects the stop 9/10 + on-fill names via
// the shared tokenNames source of truth. `extra` carries the Stage-2 additive
// tokens a ramp may have: highlight/cta ext stops (numbered 13+), the
// on-highlight text token, and the mode-invariant identity hex.
function rampGroup(
  stops: ColorStop[],
  onFillWhite: boolean,
  kind: RampKind,
  extra?: { onHighlightWhite?: boolean; identityHex?: string },
): FigmaGroup {
  const g: FigmaGroup = {}
  for (const s of stops) g[stopTokenName(s.stop, kind)] = colorFromStop(s)
  g[onFillTokenName(kind)] = colorFromHex(onFillWhite)
  if (extra?.onHighlightWhite !== undefined) g[onFillTokenName('neutral')] = colorFromHex(extra.onHighlightWhite)
  if (extra?.identityHex) g['identity'] = colorFromHexString(extra.identityHex)
  return g
}

// Neutral ramp from a 12-hex array (Radix family or branded scale, normalized
// to hex by the caller), plus the Stage-2 additive cta pair + on-text tokens.
// cta is a family-independent gray button (sourced from the engine neutral
// scale); on-highlight follows the gray highlight fill (black, not the old
// hardcoded white).
function neutralGroup(
  hexes: string[],
  extra: { cta: ColorStop[]; onHighlightWhite: boolean; onCtaWhite: boolean },
): FigmaGroup {
  const g: FigmaGroup = {}
  hexes.forEach((hex, i) => { g[stopTokenName(i + 1, 'neutral')] = colorFromHexString(hex) })
  g[onFillTokenName('neutral')] = colorFromHex(extra.onHighlightWhite)
  for (const s of extra.cta) g[stopTokenName(s.stop, 'neutral')] = colorFromStop(s)
  g[onFillTokenName('brand')] = colorFromHex(extra.onCtaWhite) // on-cta
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

  const brandExtra = (s: GeneratedScale, mode: 'light' | 'dark') => ({
    onHighlightWhite: mode === 'light' ? s.onHighlightIsWhite : s.onHighlightIsWhiteDark,
    identityHex: s.identityHex,
  })
  // Neutral cta + on-text come from the engine neutral scale (the cta button is
  // a fixed gray, independent of which family input.neutral carries). It lives
  // at the tail of the one generated list (stops 13+ ⇒ slice(12)).
  const nScale = generateNeutralScale()
  const neutralExtra = (mode: 'light' | 'dark') => {
    const cta = (mode === 'light' ? nScale.light : nScale.dark).slice(12)
    return {
      cta,
      onHighlightWhite: (mode === 'light' ? nScale.onHighlightIsWhite : nScale.onHighlightIsWhiteDark) ?? false,
      onCtaWhite: cta.length ? fillWantsWhite(cta[0]) : true,
    }
  }
  const build = (mode: 'light' | 'dark'): FigmaGroup => {
    const g: FigmaGroup = {
      brand: rampGroup(scale[mode], mode === 'light' ? scale.onFillTextIsWhite : scale.onFillTextIsWhiteDark, 'brand', brandExtra(scale, mode)),
      secondary: rampGroup(accent[mode], mode === 'light' ? accentOnFillLight : accentOnFillDark, 'brand', brandExtra(accent, mode)),
      neutral: neutralGroup(input.neutral[mode], neutralExtra(mode)),
    }
    for (const sig of input.signals) {
      g[sig.name] = rampGroup(sig.scale[mode], mode === 'light' ? sig.scale.onFillTextIsWhite : sig.scale.onFillTextIsWhiteDark, 'neutral')
    }
    return g
  }

  return { light: build('light'), dark: build('dark') }
}
