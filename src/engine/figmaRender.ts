

import { toHex } from './cssRender'
import { stopTokenName, onFillTokenName, tokenOrder, type RampKind } from './tokenNames'
import { generateNeutralScale, type GeneratedScale, type ColorStop, type NeutralLevel, type ContrastProfile } from './colorEngine'
import type { ResolvedBrand } from './resolve'

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

export interface FigmaColorToken {
  $type: 'color'
  $value: { colorSpace: 'srgb'; components: [number, number, number]; alpha: number; hex: string }
}
export type FigmaGroup = { [key: string]: FigmaColorToken | FigmaGroup }

// the cta-stroke's transparent default (alpha 0 — the plugin aliases it onto system/transparent)
const TRANSPARENT_TOKEN: FigmaColorToken = {
  $type: 'color',
  $value: { colorSpace: 'srgb', components: [0, 0, 0], alpha: 0, hex: '#000000' },
}

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

function colorFromHexString(hex: string): FigmaColorToken {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16) / 255
  const g = parseInt(h.slice(2, 4), 16) / 255
  const b = parseInt(h.slice(4, 6), 16) / 255
  return { $type: 'color', $value: { colorSpace: 'srgb', components: [r, g, b], alpha: 1, hex: hex.toLowerCase() } }
}

function rampGroup(
  stops: ColorStop[],
  onFillWhite: boolean,
  kind: RampKind,
  extra?: { onHighlightWhite?: boolean; identityHex?: string; cta?: ColorStop; ctaHover?: ColorStop; ctaStrokeNeeded?: boolean },
): FigmaGroup {
  const g: FigmaGroup = {}
  for (const s of [...stops].sort((a, b) => tokenOrder(stopTokenName(a.stop)) - tokenOrder(stopTokenName(b.stop))))
    g[stopTokenName(s.stop)] = colorFromStop(s)

  if (extra?.cta) g['cta-1'] = colorFromStop(extra.cta)
  if (extra?.ctaHover) g['cta-2'] = colorFromStop(extra.ctaHover)
  // cta-stroke pairs with the cta pair: transparent unless the fill fails the boundary gate,
  // then the family's OWN contrast-gated highlight-8 (the plugin re-expresses both as aliases)
  if (extra?.ctaStrokeNeeded !== undefined) {
    const s8 = stops.find(s => s.stop === 8)
    g['cta-stroke'] = extra.ctaStrokeNeeded && s8 ? colorFromStop(s8) : TRANSPARENT_TOKEN
  }
  g[onFillTokenName(kind)] = colorFromHex(onFillWhite)
  if (extra?.onHighlightWhite !== undefined) g[onFillTokenName('neutral')] = colorFromHex(extra.onHighlightWhite)
  if (extra?.identityHex) g['identity'] = colorFromHexString(extra.identityHex)
  return g
}

export interface ThemeInput {

  secondary?: GeneratedScale | null

  neutralLevel?: NeutralLevel

  signals: Array<{ name: string; scale: GeneratedScale }>

  // profile the theme was resolved under: the neutral generated HERE must match the caller's
  // brand/secondary/signal scales (which already carry it). Default wcag.
  contrastProfile?: ContrastProfile
}

export function themeToFigma(r: ResolvedBrand, input: ThemeInput): { light: FigmaGroup; dark: FigmaGroup } {
  const { scale } = r
  const secondary = input.secondary ?? scale
  const secondaryOnFillLight = input.secondary ? input.secondary.onFillTextIsWhite : scale.onFillTextIsWhite
  const secondaryOnFillDark = input.secondary ? input.secondary.onFillTextIsWhiteDark : scale.onFillTextIsWhiteDark

  const brandExtra = (s: GeneratedScale, mode: 'light' | 'dark') => ({
    onHighlightWhite: mode === 'light' ? s.onHighlightIsWhite : s.onHighlightIsWhiteDark,
    identityHex: s.identityHex,
    cta: mode === 'light' ? s.cta : s.ctaDark,
    ctaHover: mode === 'light' ? s.ctaHover : s.ctaHoverDark,
    ctaStrokeNeeded: !!(mode === 'light' ? s.ctaStrokeNeeded : s.ctaStrokeNeededDark),
  })

  const nScale = generateNeutralScale(scale.brandH, input.neutralLevel ?? 'default', input.contrastProfile)
  const neutralExtra = (mode: 'light' | 'dark') => ({
    onHighlightWhite: mode === 'light' ? nScale.onHighlightIsWhite : nScale.onHighlightIsWhiteDark,
    cta: mode === 'light' ? nScale.cta : nScale.ctaDark,
    ctaHover: mode === 'light' ? nScale.ctaHover : nScale.ctaHoverDark,
    ctaStrokeNeeded: !!(mode === 'light' ? nScale.ctaStrokeNeeded : nScale.ctaStrokeNeededDark),
  })
  const build = (mode: 'light' | 'dark'): FigmaGroup => {
    // paper-0 rides WITH the neutral ramp (its dark value is neutral-tinted, so it dedups and
    // aliases through the same per-tint machinery as the rest of the neutral — never a global
    // absolute). Placed first so it sits beside paper-1 in creation order.
    const p0 = mode === 'light' ? nScale.paper0 : nScale.paper0Dark
    const neutralGroup: FigmaGroup = {
      ...(p0 ? { 'paper-0': colorFromStop(p0) } : {}),
      ...rampGroup(nScale[mode], mode === 'light' ? nScale.onFillTextIsWhite : nScale.onFillTextIsWhiteDark, 'brand', neutralExtra(mode)),
    }
    const g: FigmaGroup = {
      brand: rampGroup(scale[mode], mode === 'light' ? scale.onFillTextIsWhite : scale.onFillTextIsWhiteDark, 'brand', brandExtra(scale, mode)),
      secondary: rampGroup(secondary[mode], mode === 'light' ? secondaryOnFillLight : secondaryOnFillDark, 'brand', brandExtra(secondary, mode)),
      neutral: neutralGroup,
    }
    for (const sig of input.signals) {

      g[sig.name] = rampGroup(
        sig.scale[mode],
        mode === 'light' ? sig.scale.onFillTextIsWhite : sig.scale.onFillTextIsWhiteDark,
        'brand',
        {
          onHighlightWhite: mode === 'light' ? sig.scale.onHighlightIsWhite : sig.scale.onHighlightIsWhiteDark,
          cta: mode === 'light' ? sig.scale.cta : sig.scale.ctaDark,
          ctaHover: mode === 'light' ? sig.scale.ctaHover : sig.scale.ctaHoverDark,
          ctaStrokeNeeded: !!(mode === 'light' ? sig.scale.ctaStrokeNeeded : sig.scale.ctaStrokeNeededDark),
        },
      )
    }
    return g
  }

  return { light: build('light'), dark: build('dark') }
}
