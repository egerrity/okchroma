

import { toHex } from './cssRender'
import { srgbEmitChannels } from './colorMath'
import { stopTokenName, onFillTokenName, tokenOrder, type RampKind } from './tokenNames'
import { generateNeutralScale, type GeneratedScale, type ColorStop, type NeutralLevel, type ContrastProfile } from './colorEngine'
import { OUTLINE_HOVER_ALPHA, type ResolvedBrand, type SecondaryStyle } from './resolve'

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

export interface FigmaColorToken {
  $type: 'color'
  $value: { colorSpace: 'srgb'; components: [number, number, number]; alpha: number; hex: string }
}
export type FigmaGroup = { [key: string]: FigmaColorToken | FigmaGroup }

// the cta-border's transparent default (alpha 0 — the plugin aliases it onto system/transparent)
const TRANSPARENT_TOKEN: FigmaColorToken = {
  $type: 'color',
  $value: { colorSpace: 'srgb', components: [0, 0, 0], alpha: 0, hex: '#000000' },
}

// D6: Figma always receives the sRGB clamp-down — gamut-mapped (chroma-reduce at
// constant L/H), never per-channel clamping of master-basis channels.
function colorFromStop(s: ColorStop): FigmaColorToken {
  const { r, g, b } = srgbEmitChannels(s)
  return {
    $type: 'color',
    $value: { colorSpace: 'srgb', components: [clamp01(r), clamp01(g), clamp01(b)], alpha: 1, hex: toHex(r, g, b) },
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
  extra?: { onHighlightWhite?: boolean; identityHex?: string; cta?: ColorStop; ctaHover?: ColorStop },
): FigmaGroup {
  const g: FigmaGroup = {}
  for (const s of [...stops].sort((a, b) => tokenOrder(stopTokenName(a.stop)) - tokenOrder(stopTokenName(b.stop))))
    g[stopTokenName(s.stop)] = colorFromStop(s)

  if (extra?.cta) g['cta-1'] = colorFromStop(extra.cta)
  if (extra?.ctaHover) g['cta-2'] = colorFromStop(extra.ctaHover)
  // cta-border pairs with the cta pair, TRANSPARENT everywhere (the conditional gate is gone —
  // owner 2026-07-04): the token stays for components + a future high-contrast re-solve; the
  // outline secondary override is the only resolver (→ its own highlight-8).
  // Renamed from cta-stroke (owner 2026-07-09) — both plugins migrate an existing
  // cta-stroke variable IN PLACE (Figma keeps the id on rename, bindings survive).
  if (extra?.cta) g['cta-border'] = TRANSPARENT_TOKEN
  g[onFillTokenName(kind)] = colorFromHex(onFillWhite)
  if (extra?.onHighlightWhite !== undefined) g[onFillTokenName('neutral')] = colorFromHex(extra.onHighlightWhite)
  if (extra?.identityHex) g['identity'] = colorFromHexString(extra.identityHex)
  return g
}

export interface ThemeInput {

  secondary?: GeneratedScale | null

  // the secondary's mode chip — 'outline' re-expresses the cta pair (mirrors cssRender's
  // outline override): cta-1 transparent, cta-2 the cta color at OUTLINE_HOVER_ALPHA,
  // cta-border ALWAYS the secondary's own highlight-8, on-cta the secondary's ink-11.
  secondaryStyle?: SecondaryStyle

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
  })

  const nScale = generateNeutralScale(scale.brandH, input.neutralLevel ?? 'default', input.contrastProfile)
  const neutralExtra = (mode: 'light' | 'dark') => ({
    onHighlightWhite: mode === 'light' ? nScale.onHighlightIsWhite : nScale.onHighlightIsWhiteDark,
    cta: mode === 'light' ? nScale.cta : nScale.ctaDark,
    ctaHover: mode === 'light' ? nScale.ctaHover : nScale.ctaHoverDark,
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
    const secondaryGroup = rampGroup(secondary[mode], mode === 'light' ? secondaryOnFillLight : secondaryOnFillDark, 'brand', brandExtra(secondary, mode))
    // outline re-expression (only a real secondary can be outline) — same values cssRender
    // emits. The hover = highlight-8 at OUTLINE_HOVER_ALPHA (the STABLE gated stop the ring
    // uses — 9% of the generated subtle cta was imperceptible).
    if (input.secondaryStyle === 'outline' && input.secondary) {
      const s8 = secondary[mode].find(s => s.stop === 8)
      const s11 = secondary[mode].find(s => s.stop === 11)
      secondaryGroup['cta-1'] = TRANSPARENT_TOKEN
      if (s8) {
        const e = srgbEmitChannels(s8)
        secondaryGroup['cta-2'] = {
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [clamp01(e.r), clamp01(e.g), clamp01(e.b)], alpha: OUTLINE_HOVER_ALPHA, hex: toHex(e.r, e.g, e.b) },
        }
      }
      if (s8) secondaryGroup['cta-border'] = colorFromStop(s8)
      // on-cta = the family's ink-11, NOT a pole — the plugin aliases non-pole on-cta to the sibling ink-11
      if (s11) secondaryGroup[onFillTokenName('brand')] = colorFromStop(s11)
    }
    const g: FigmaGroup = {
      brand: rampGroup(scale[mode], mode === 'light' ? scale.onFillTextIsWhite : scale.onFillTextIsWhiteDark, 'brand', brandExtra(scale, mode)),
      secondary: secondaryGroup,
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
        },
      )
    }
    return g
  }

  return { light: build('light'), dark: build('dark') }
}
