

import { toHex } from './cssRender'
import { srgbEmitChannels } from './colorMath'
import { stopTokenName, onFillTokenName, tokenOrder, type RampKind } from './tokenNames'
import { generateNeutralScale, type GeneratedScale, type ColorStop, type NeutralLevel, type ContrastProfile } from './colorEngine'
import { OUTLINE_HOVER_ALPHA, OUTLINE_PRESSED_ALPHA, escapeCtaFamily, resolveLinkTrio, type ResolvedBrand, type SecondaryStyle } from './resolve'

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
  extra?: {
    onHighlightWhite?: boolean; identityHex?: string
    cta?: ColorStop; ctaHover?: ColorStop; ctaPressed?: ColorStop
    ctaInk?: ColorStop; ctaInkHover?: ColorStop; ctaInkPressed?: ColorStop
  },
): FigmaGroup {
  const g: FigmaGroup = {}
  for (const s of [...stops].sort((a, b) => tokenOrder(stopTokenName(a.stop)) - tokenOrder(stopTokenName(b.stop))))
    g[stopTokenName(s.stop)] = colorFromStop(s)

  // the cta family, SEMANTIC-named (owner ruling 2026-07-16: states, never options).
  // cta-1/cta-2 → cta/cta-hover ride both plugins' RENAMED_LEAVES in-place migration.
  if (extra?.cta) g['cta'] = colorFromStop(extra.cta)
  if (extra?.ctaHover) g['cta-hover'] = colorFromStop(extra.ctaHover)
  if (extra?.ctaPressed) g['cta-pressed'] = colorFromStop(extra.ctaPressed)
  // cta-ink trio: the family's 4.5 text-register cta (link escape) — rest matches ink-10
  if (extra?.ctaInk) g['cta-ink'] = colorFromStop(extra.ctaInk)
  if (extra?.ctaInkHover) g['cta-ink-hover'] = colorFromStop(extra.ctaInkHover)
  if (extra?.ctaInkPressed) g['cta-ink-pressed'] = colorFromStop(extra.ctaInkPressed)
  // cta-border pairs with the cta family, TRANSPARENT everywhere (the conditional gate is gone —
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
  // outline override): cta transparent, cta-hover/-pressed the cta color at OUTLINE alphas,
  // cta-border ALWAYS the secondary's own highlight-8, on-cta the secondary's ink-11.
  secondaryStyle?: SecondaryStyle

  neutralLevel?: NeutralLevel

  signals: Array<{ name: string; scale: GeneratedScale }>

  // profile the theme was resolved under: the neutral generated HERE must match the caller's
  // brand/secondary/signal scales (which already carry it). Default wcag.
  contrastProfile?: ContrastProfile

  // the NEUTRAL CTA ESCAPE (Phase 3, owner 2026-07-16): the brand's cta FILL trio +
  // on-cta re-resolve from the brand-neutral's ink register (near-black light /
  // near-white dark) — the red-collision de-conflict. Same tokens, different values
  // (the outline idiom); default off = byte-identical. cta-ink untouched.
  ctaEscape?: boolean

  // the SYSTEM LINK (Phase 4, owner 2026-07-16): a custom link seed — when set, the
  // emitted link group carries ITS ink-register resolution (the red de-conflict);
  // absent = the link group carries the primary's cta-ink trio (the plugins alias it).
  linkHex?: string | null
}

export function themeToFigma(r: ResolvedBrand, input: ThemeInput): { light: FigmaGroup; dark: FigmaGroup } {
  const { scale } = r
  const secondary = input.secondary ?? scale
  const secondaryOnFillLight = input.secondary ? input.secondary.onFillTextIsWhite : scale.onFillTextIsWhite
  const secondaryOnFillDark = input.secondary ? input.secondary.onFillTextIsWhiteDark : scale.onFillTextIsWhiteDark

  // the full cta family per mode — one helper, every family call-site rides it
  const ctaFamily = (s: GeneratedScale, mode: 'light' | 'dark') => (mode === 'light'
    ? { cta: s.cta, ctaHover: s.ctaHover, ctaPressed: s.ctaPressed, ctaInk: s.ctaInk, ctaInkHover: s.ctaInkHover, ctaInkPressed: s.ctaInkPressed }
    : { cta: s.ctaDark, ctaHover: s.ctaHoverDark, ctaPressed: s.ctaPressedDark, ctaInk: s.ctaInkDark, ctaInkHover: s.ctaInkHoverDark, ctaInkPressed: s.ctaInkPressedDark })

  const brandExtra = (s: GeneratedScale, mode: 'light' | 'dark') => ({
    onHighlightWhite: mode === 'light' ? s.onHighlightIsWhite : s.onHighlightIsWhiteDark,
    identityHex: s.identityHex,
    ...ctaFamily(s, mode),
  })

  const nScale = generateNeutralScale(scale.brandH, input.neutralLevel ?? 'default', input.contrastProfile)
  // custom link seed resolved ONCE (both modes read it)
  const lt = input.linkHex ? resolveLinkTrio(input.linkHex, input.contrastProfile) : null
  const neutralExtra = (mode: 'light' | 'dark') => ({
    onHighlightWhite: mode === 'light' ? nScale.onHighlightIsWhite : nScale.onHighlightIsWhiteDark,
    ...ctaFamily(nScale, mode),
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
      const s10 = secondary[mode].find(s => s.stop === 10)
      secondaryGroup['cta'] = TRANSPARENT_TOKEN
      if (s8) {
        const e = srgbEmitChannels(s8)
        const alphaTint = (alpha: number): FigmaColorToken => ({
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [clamp01(e.r), clamp01(e.g), clamp01(e.b)], alpha, hex: toHex(e.r, e.g, e.b) },
        })
        secondaryGroup['cta-hover'] = alphaTint(OUTLINE_HOVER_ALPHA)
        // pressed = the hover tint at doubled alpha (pressed-doubles-hover, alpha register)
        secondaryGroup['cta-pressed'] = alphaTint(OUTLINE_PRESSED_ALPHA)
      }
      if (s8) secondaryGroup['cta-border'] = colorFromStop(s8)
      // cta-ink trio untouched: outline re-expresses the FILL trio only — links keep the
      // exact ramp's text-register values already emitted by rampGroup
      // on-cta = the family's ink-10, NOT a pole — the plugin aliases non-pole on-cta to the sibling ink-10
      if (s10) secondaryGroup[onFillTokenName('brand')] = colorFromStop(s10)
    }
    const brandGroup = rampGroup(scale[mode], mode === 'light' ? scale.onFillTextIsWhite : scale.onFillTextIsWhiteDark, 'brand', brandExtra(scale, mode))
    // neutral cta escape re-expression (mirrors the outline block above): the brand's
    // FILL trio + on-cta swap to the brand-neutral's ink register; cta-ink + the ramp
    // stay the brand's own. With NO real secondary the secondary group MIRRORS the brand
    // (secondary = scale above), so the escape applies there too — the un-escaped raw
    // trio must not survive in the mirror (review-caught latent divergence).
    const esc = input.ctaEscape ? escapeCtaFamily(nScale, mode, input.contrastProfile) : null
    if (esc) {
      for (const g of input.secondary ? [brandGroup] : [brandGroup, secondaryGroup]) {
        g['cta'] = colorFromStop(esc.cta)
        g['cta-hover'] = colorFromStop(esc.ctaHover)
        g['cta-pressed'] = colorFromStop(esc.ctaPressed)
        // ALL the ctas (owner amendment): the text-style cta trio de-reds too
        g['cta-ink'] = colorFromStop(esc.ctaInk)
        g['cta-ink-hover'] = colorFromStop(esc.ctaInkHover)
        g['cta-ink-pressed'] = colorFromStop(esc.ctaInkPressed)
        g[onFillTokenName('brand')] = colorFromHex(esc.onFillIsWhite)
      }
    }
    // the SYSTEM LINK trio (Phase 4): ONE per theme. Custom seed → its ink-register
    // resolution; default → the primary's cta-ink trio verbatim (value-equal to what the
    // plugins alias, so the emitted structure never lies about the shipped color) — and
    // under the ESCAPE the default follows the escaped cta-ink (the alias chain would)
    const linkGroup: FigmaGroup = lt
      ? (mode === 'light'
        ? { 'link': colorFromStop(lt.link), 'link-hover': colorFromStop(lt.linkHover), 'link-pressed': colorFromStop(lt.linkPressed) }
        : { 'link': colorFromStop(lt.linkDark), 'link-hover': colorFromStop(lt.linkHoverDark), 'link-pressed': colorFromStop(lt.linkPressedDark) })
      : esc
      ? { 'link': colorFromStop(esc.ctaInk), 'link-hover': colorFromStop(esc.ctaInkHover), 'link-pressed': colorFromStop(esc.ctaInkPressed) }
      : (mode === 'light'
        ? { 'link': colorFromStop(scale.ctaInk), 'link-hover': colorFromStop(scale.ctaInkHover), 'link-pressed': colorFromStop(scale.ctaInkPressed) }
        : { 'link': colorFromStop(scale.ctaInkDark), 'link-hover': colorFromStop(scale.ctaInkHoverDark), 'link-pressed': colorFromStop(scale.ctaInkPressedDark) })
    const g: FigmaGroup = {
      brand: brandGroup,
      secondary: secondaryGroup,
      neutral: neutralGroup,
      link: linkGroup,
    }
    for (const sig of input.signals) {

      g[sig.name] = rampGroup(
        sig.scale[mode],
        mode === 'light' ? sig.scale.onFillTextIsWhite : sig.scale.onFillTextIsWhiteDark,
        'brand',
        {
          onHighlightWhite: mode === 'light' ? sig.scale.onHighlightIsWhite : sig.scale.onHighlightIsWhiteDark,
          ...ctaFamily(sig.scale, mode),
        },
      )
    }
    return g
  }

  return { light: build('light'), dark: build('dark') }
}
