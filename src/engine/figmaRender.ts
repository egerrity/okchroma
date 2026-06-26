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
import { stopTokenName, onFillTokenName, tokenOrder, type RampKind } from './tokenNames'
import { generateNeutralScale, type GeneratedScale, type ColorStop, type NeutralLevel } from './colorEngine'
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

// Parse "#rrggbb" → a color token (used only for the user-input identity hex).
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
  for (const s of [...stops].sort((a, b) => tokenOrder(stopTokenName(a.stop, kind)) - tokenOrder(stopTokenName(b.stop, kind))))
    g[stopTokenName(s.stop, kind)] = colorFromStop(s)
  g[onFillTokenName(kind)] = colorFromHex(onFillWhite)
  if (extra?.onHighlightWhite !== undefined) g[onFillTokenName('neutral')] = colorFromHex(extra.onHighlightWhite)
  if (extra?.identityHex) g['identity'] = colorFromHexString(extra.identityHex)
  return g
}

export interface ThemeInput {
  // Secondary ramp when present; when null, accent mirrors brand (matching cssRender).
  accent?: GeneratedScale | null
  // The neutral is GENERATED per brand (tinted toward the brand hue) at this
  // level — pure / default / branded. Defaults to 'default'. No longer passed
  // as hex strings; themeToFigma derives it from the brand hue, just like the
  // CSS path.
  neutralLevel?: NeutralLevel
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
  // Neutral is generated per brand (tinted toward the brand hue) and emitted
  // BRAND-KIND — same rampGroup path as brand/secondary (cta = stop 9, highlight
  // = rung 13/14), minus identity (no user-input hex to echo).
  const nScale = generateNeutralScale(scale.brandH, input.neutralLevel ?? 'default')
  const neutralExtra = (mode: 'light' | 'dark') => ({
    onHighlightWhite: mode === 'light' ? nScale.onHighlightIsWhite : nScale.onHighlightIsWhiteDark,
  })
  const build = (mode: 'light' | 'dark'): FigmaGroup => {
    const g: FigmaGroup = {
      brand: rampGroup(scale[mode], mode === 'light' ? scale.onFillTextIsWhite : scale.onFillTextIsWhiteDark, 'brand', brandExtra(scale, mode)),
      secondary: rampGroup(accent[mode], mode === 'light' ? accentOnFillLight : accentOnFillDark, 'brand', brandExtra(accent, mode)),
      neutral: rampGroup(nScale[mode], mode === 'light' ? nScale.onFillTextIsWhite : nScale.onFillTextIsWhiteDark, 'brand', neutralExtra(mode)),
    }
    for (const sig of input.signals) {
      // F1: signals are brand-kind — a loud cta (stop 9) AND a distinct highlight
      // rung (13/14), with computed on-cta + on-highlight and no identity. No alias.
      g[sig.name] = rampGroup(
        sig.scale[mode],
        mode === 'light' ? sig.scale.onFillTextIsWhite : sig.scale.onFillTextIsWhiteDark,
        'brand',
        { onHighlightWhite: mode === 'light' ? sig.scale.onHighlightIsWhite : sig.scale.onHighlightIsWhiteDark },
      )
    }
    return g
  }

  return { light: build('light'), dark: build('dark') }
}
