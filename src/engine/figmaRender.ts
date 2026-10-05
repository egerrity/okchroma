// The Figma tree: one group tree per mode, every leaf a color token in the DTCG shape,
// every path spelled through the one grammar in tokenNames.ts (`brand/stamp/fill`,
// `neutral/paper-0`, `link/default/enabled`, `absolute/brand`). The extended plugin
// flattens this tree into variable paths under the color group; the leaf order is the
// panel order.
import { toHex, ctaNeedsBorder, pageStopFor, ctaBorderRung, OFFSET_ALPHAS, type OffsetRung } from './cssRender'
import { srgbEmitChannels } from './colorMath'
import { stopTokenName, tokenOrder, STAMP_FILL, STAMP_FILL_HOVER, STAMP_FILL_PRESSED, STAMP_EDGE, STAMP_ON, STAMP_STATE_LEAVES, PAPER_0, PEN_100, LINK_GROUP, LINK_STATES, ABSOLUTE_GROUP, type LinkPosture, type LinkState } from './tokenNames'
import { CSS_FAMILY } from './tokenDescriptions'
import { generateNeutralScale, type GeneratedScale, type ColorStop, type NeutralLevel, type ContrastProfile } from './colorEngine'
import { OUTLINE_HOVER_ALPHA, OUTLINE_PRESSED_ALPHA, SOFT_ON_CTA_ALPHA, softOnCtaPasses, escapeCtaFamily, resolveLinkTrio, resolveLinkInverseTrio, type ResolvedBrand, type SecondaryStyle } from './resolve'
import { SIGNAL_EMIT_NAME, type SignalDef } from './signals'

export interface FigmaColorToken {
  $type: 'color'
  $value: { colorSpace: 'srgb'; components: [number, number, number]; alpha: number; hex: string }
}
export type FigmaLeaf = FigmaColorToken
export type FigmaGroup = { [key: string]: FigmaLeaf | FigmaGroup }

// components are the 8-bit channels over 255, rounded to four decimals: they name the same
// color as `hex`, the pair every audit measures, and adjacent 8-bit values stay distinct
const channel = (v: number) => Math.round((Math.round(Math.min(1, Math.max(0, v)) * 255) / 255) * 1e4) / 1e4
function color(r: number, g: number, b: number, alpha = 1): FigmaColorToken {
  return { $type: 'color', $value: { colorSpace: 'srgb', components: [channel(r), channel(g), channel(b)], alpha, hex: toHex(r, g, b) } }
}

// the edge when the gate does not fire: transparent black, a raw value
const TRANSPARENT_TOKEN: FigmaColorToken = color(0, 0, 0, 0)

// the edge when the gate fires: the page-polarity pole at this family's rung, black in
// light and white in dark. A raw value in every output; no alpha row exists to alias.
const OFFSET_TOKEN = (rung: OffsetRung, mode: 'light' | 'dark'): FigmaColorToken => {
  const c = mode === 'light' ? 0 : 1
  return color(c, c, c, OFFSET_ALPHAS[rung])
}

// Figma always receives the sRGB clamp-down: gamut-mapped (chroma reduced at constant
// lightness and hue), never per-channel clipping of master-basis channels
function colorFromStop(s: ColorStop): FigmaColorToken {
  const { r, g, b } = srgbEmitChannels(s)
  return color(r, g, b)
}

const pole = (white: boolean, alpha = 1): FigmaColorToken => (white ? color(1, 1, 1, alpha) : color(0, 0, 0, alpha))

function colorFromHexString(hex: string): FigmaColorToken {
  const h = hex.replace('#', '')
  return color(parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255)
}

// Leaf shape: ramp tokens sit flat in the family group (paper-1, chalk-8, highlighter-26,
// pencil-47, the poles); only the stamp/ state group nests. Its table lives in
// tokenNames.ts, the one flat-to-nested source every consumer rides.
function bandedLeaf(flat: string): string {
  return STAMP_STATE_LEAVES[flat] ?? flat
}
// Order-aware entries for a FigmaGroup: JS enumerates integer-index string keys ascending,
// before any string keys, regardless of insertion order. No leaf is a bare-digit key
// today, but a consumer that walks a group for panel-order-sensitive output uses this
// rule so the shape does not depend on that incidental fact.
export function groupEntries(g: FigmaGroup): Array<[string, FigmaLeaf | FigmaGroup]> {
  const entries = Object.entries(g)
  const digitLeading = (k: string) => /^\d/.test(k)
  if (entries.length > 1 && entries.every(([k]) => digitLeading(k)))
    return entries.sort((a, b) => parseInt(b[0], 10) - parseInt(a[0], 10))
  return entries
}

// set a token at its banded home inside a family group (used by rampGroup and by the
// outline and escape re-expressions, so every write lands in the same shape)
export function putLeaf(g: FigmaGroup, flat: string, tok: FigmaLeaf): void {
  const path = bandedLeaf(flat).split('/')
  let cur = g
  for (const seg of path.slice(0, -1)) {
    if (!(seg in cur) || '$type' in (cur[seg] as FigmaColorToken | FigmaGroup)) cur[seg] = {}
    cur = cur[seg] as FigmaGroup
  }
  cur[path[path.length - 1]] = tok
}

function rampGroup(
  stops: ColorStop[],
  onFillWhite: boolean,
  extra?: {
    cta?: ColorStop; ctaHover?: ColorStop; ctaPressed?: ColorStop
    // the already-resolved edge: the stroke when this fill vibrates against the page, else
    // transparent. Resolved by the caller because the choice is mode-dependent and
    // rampGroup has no mode.
    ctaBorder?: FigmaColorToken
  },
): FigmaGroup {
  const g: FigmaGroup = {}
  const leaves = stops.map(s => ({ name: stopTokenName(s.stop), tok: colorFromStop(s) }))
    .sort((a, b) => tokenOrder(a.name) - tokenOrder(b.name))
  for (const l of leaves) putLeaf(g, l.name, l.tok)
  // the stamp family: states, never options. Engine internals keep the cta spelling; the
  // emitted word is stamp.
  if (extra?.cta) putLeaf(g, STAMP_FILL, colorFromStop(extra.cta))
  if (extra?.ctaHover) putLeaf(g, STAMP_FILL_HOVER, colorFromStop(extra.ctaHover))
  if (extra?.ctaPressed) putLeaf(g, STAMP_FILL_PRESSED, colorFromStop(extra.ctaPressed))
  // the edge pairs with the fill trio: the safety stroke when the fill would vibrate
  // against the page, else transparent. The rule lives in cssRender.ctaNeedsBorder and the
  // rung in cssRender.ctaBorderRung, so both emitters decide identically. The outline
  // secondary overrides this with its own highlighter-26 unconditionally.
  if (extra?.cta) putLeaf(g, STAMP_EDGE, extra.ctaBorder ?? TRANSPARENT_TOKEN)
  putLeaf(g, STAMP_ON, pole(onFillWhite))
  return g
}

export interface ThemeInput {
  secondary?: GeneratedScale | null
  // the secondary's mode chip: 'outline' re-expresses the fill trio (fill transparent, hover
  // and pressed the highlighter at the outline alphas), the edge as the secondary's own
  // highlighter-26 and the on-text as its pencil-47, mirroring cssRender
  secondaryStyle?: SecondaryStyle
  neutralLevel?: NeutralLevel
  // the neutral's resolved tint hue: callers resolve the source through
  // colorEngine.neutralTintHue and pass the hue; absent, the primary's. The emitter stays
  // dumb on purpose: the source rules live in one place.
  neutralH?: number
  // the signal scales, keyed by identity name (red, yellow, green, blue) or by role; the
  // tree always writes them under the role
  signals: Array<{ name: string; scale: GeneratedScale }>
  // the profile the theme was resolved under: the neutral generated here must match the
  // caller's brand, alt and signal scales. Default wcag.
  contrastProfile?: ContrastProfile
  // the neutral cta escape: the brand's fill trio and on-text re-resolve from the brand
  // neutral's pen register, the red-collision de-conflict. The brand's pen stops are not
  // touched. Default off.
  ctaEscape?: boolean
  // the system link: a custom seed makes the default trio carry its own pen-register
  // resolution; absent, the default trio carries the primary's pen stops (the plugins
  // alias them)
  linkHex?: string | null
  // the edge opt-out, default on. Off withholds the page rather than branching the gate;
  // see cssRender.brandCss.
  ctaBorder?: boolean
}

export function themeToFigma(r: ResolvedBrand, input: ThemeInput): { light: FigmaGroup; dark: FigmaGroup } {
  const { scale } = r
  const secondary = input.secondary ?? scale
  const secondaryOnFillLight = input.secondary ? input.secondary.onFillTextIsWhite : scale.onFillTextIsWhite
  const secondaryOnFillDark = input.secondary ? input.secondary.onFillTextIsWhiteDark : scale.onFillTextIsWhiteDark

  // the full stamp family per mode, one helper for every family. The edge rides here so
  // the brand, the secondary, the neutral and the signals all get the stroke from one
  // decision (cssRender.ctaNeedsBorder) at one rung (cssRender.ctaBorderRung). `prefix` is
  // the CSS_FAMILY word, the table the CSS emitter reads, so the two cannot disagree.
  const borderPage = (mode: 'light' | 'dark') => (input.ctaBorder ?? true) ? pageStopFor(nScale, mode) : undefined
  const ctaFamily = (s: GeneratedScale, mode: 'light' | 'dark', prefix: string) => ({
    ctaBorder: ctaNeedsBorder(s, mode, borderPage(mode)) ? OFFSET_TOKEN(ctaBorderRung(prefix), mode) : TRANSPARENT_TOKEN,
    ...(mode === 'light'
      ? { cta: s.cta, ctaHover: s.ctaHover, ctaPressed: s.ctaPressed }
      : { cta: s.ctaDark, ctaHover: s.ctaHoverDark, ctaPressed: s.ctaPressedDark }),
  })

  const nScale = generateNeutralScale(input.neutralH ?? scale.brandH, input.neutralLevel ?? 'default', input.contrastProfile)
  // the custom link seed resolved once (both modes read it)
  const lt = input.linkHex ? resolveLinkTrio(input.linkHex, input.contrastProfile) : null
  // the inverse link trio: the same seed re-solved for text on the pen-70 ground (modes
  // crossed). No alias posture exists, so the default seeds from the brand's own hex and
  // the values always ship raw. (identityHex is typed optional but generateScale always
  // sets it; the pen-stop fallback keeps a hand-built scale on its own hue.)
  const invSeed = input.linkHex ?? scale.identityHex
    ?? (() => { const s9 = scale.light.find(x => x.stop === 9)!; const e = srgbEmitChannels(s9); return toHex(e.r, e.g, e.b) })()
  const invLt = resolveLinkInverseTrio(invSeed, input.contrastProfile)
  const build = (mode: 'light' | 'dark'): FigmaGroup => {
    // paper-0 leads the neutral group and pen-100 follows pen-70, by insertion: the ladder
    // is descending lightness, lightest first, and flat leaves are never integer keys. A
    // missing pole is omitted and the plugins keep whatever the file holds.
    const p0 = mode === 'light' ? nScale.paper0 : nScale.paper0Dark
    const ramp = rampGroup(nScale[mode], mode === 'light' ? nScale.onFillTextIsWhite : nScale.onFillTextIsWhiteDark, ctaFamily(nScale, mode, CSS_FAMILY.neutral))
    const i0 = mode === 'light' ? nScale.pen100 : nScale.pen100Dark
    const splicePen100 = (g: FigmaGroup): FigmaGroup => {
      if (!i0) return g
      const out: FigmaGroup = {}
      for (const [k, v] of Object.entries(g)) {
        out[k] = v
        if (k === stopTokenName(11)) out[PEN_100] = colorFromStop(i0)
      }
      return out
    }
    const neutralGroup: FigmaGroup = splicePen100(p0 ? { [PAPER_0]: colorFromStop(p0), ...ramp } : ramp)
    const secondaryGroup = rampGroup(secondary[mode], mode === 'light' ? secondaryOnFillLight : secondaryOnFillDark, ctaFamily(secondary, mode, CSS_FAMILY.brandSecondary))
    // the outline re-expression (only a real secondary can be outline), the same values
    // cssRender emits: the hover is highlighter-26 at OUTLINE_HOVER_ALPHA, the stable gated
    // stop the ring uses; pressed doubles it
    if (input.secondaryStyle === 'outline' && input.secondary) {
      const s8 = secondary[mode].find(s => s.stop === 8)
      const s9 = secondary[mode].find(s => s.stop === 9)
      putLeaf(secondaryGroup, STAMP_FILL, TRANSPARENT_TOKEN)
      if (s8) {
        const e = srgbEmitChannels(s8)
        putLeaf(secondaryGroup, STAMP_FILL_HOVER, color(e.r, e.g, e.b, OUTLINE_HOVER_ALPHA))
        putLeaf(secondaryGroup, STAMP_FILL_PRESSED, color(e.r, e.g, e.b, OUTLINE_PRESSED_ALPHA))
        putLeaf(secondaryGroup, STAMP_EDGE, colorFromStop(s8))
      }
      // the on-text is the family's pencil-47, not a pole; the pen stops stay untouched
      if (s9) putLeaf(secondaryGroup, STAMP_ON, colorFromStop(s9))
    }
    // the soft on-text, the quiet-fill rule (C47): a low-hierarchy fill's button text is
    // the pole at SOFT_ON_CTA_ALPHA, composited by the consumer over the fill's current
    // state. The carriers mirror cssRender: the neutral unconditionally, and every
    // non-outline secondary wherever softOnCtaPasses keeps the composite over the text bar
    // on every fill state. Loud fills keep the solid pole.
    const softOnCta = (g: FigmaGroup, white: boolean) => putLeaf(g, STAMP_ON, pole(white, SOFT_ON_CTA_ALPHA[mode]))
    softOnCta(neutralGroup, mode === 'light' ? nScale.onFillTextIsWhite : nScale.onFillTextIsWhiteDark)
    if (input.secondary && input.secondaryStyle !== 'outline' && softOnCtaPasses(input.secondary, mode))
      softOnCta(secondaryGroup, mode === 'light' ? secondaryOnFillLight : secondaryOnFillDark)
    const brandGroup = rampGroup(scale[mode], mode === 'light' ? scale.onFillTextIsWhite : scale.onFillTextIsWhiteDark, ctaFamily(scale, mode, CSS_FAMILY.brandPrimary))
    // the neutral cta escape (mirrors the outline block): the brand's fill trio and on-text
    // swap to the brand neutral's pen register. With no real secondary the secondary group
    // mirrors the brand, so the escape applies there too.
    const esc = input.ctaEscape ? escapeCtaFamily(nScale, mode, input.contrastProfile) : null
    if (esc) {
      for (const g of input.secondary ? [brandGroup] : [brandGroup, secondaryGroup]) {
        putLeaf(g, STAMP_FILL, colorFromStop(esc.cta))
        putLeaf(g, STAMP_FILL_HOVER, colorFromStop(esc.ctaHover))
        putLeaf(g, STAMP_FILL_PRESSED, colorFromStop(esc.ctaPressed))
        putLeaf(g, STAMP_ON, pole(esc.onFillIsWhite))
      }
    }
    // the system link: one trio per theme for text on the papers (a custom seed's own
    // resolution, else the primary's pen stops verbatim, value-equal to what the plugins
    // alias) and one for text on the pen ground
    const scaleTextAt = (n: number) => {
      const s = scale[mode].find(x => x.stop === n)
      if (!s) throw new Error(`themeToFigma link: the brand scale has no pen stop ${n}`)
      return s
    }
    const trio = (posture: LinkPosture): FigmaGroup => {
      const t = posture === 'default'
        ? (lt
          ? (mode === 'light' ? [lt.link, lt.linkHover, lt.linkPressed] : [lt.linkDark, lt.linkHoverDark, lt.linkPressedDark])
          : [scaleTextAt(9), scaleTextAt(10), scaleTextAt(11)])
        : (mode === 'light' ? [invLt.link, invLt.linkHover, invLt.linkPressed] : [invLt.linkDark, invLt.linkHoverDark, invLt.linkPressedDark])
      return Object.fromEntries(LINK_STATES.map((state: LinkState, i) => [state, colorFromStop(t[i])]))
    }
    const g: FigmaGroup = {
      [CSS_FAMILY.neutral]: neutralGroup,
      [CSS_FAMILY.brandPrimary]: brandGroup,
      [CSS_FAMILY.brandSecondary]: secondaryGroup,
    }
    for (const sig of input.signals) {
      const role = SIGNAL_EMIT_NAME[sig.name as SignalDef['name']] ?? sig.name
      // signals rank with the primary for the edge rung (anything not neutral or secondary
      // takes the primary's rung), unreachable at the gate's floor but defined
      g[role] = rampGroup(
        sig.scale[mode],
        mode === 'light' ? sig.scale.onFillTextIsWhite : sig.scale.onFillTextIsWhiteDark,
        ctaFamily(sig.scale, mode, role),
      )
    }
    g[LINK_GROUP] = { default: trio('default'), inverse: trio('inverse') }
    // the seed absolutes: the inputs as given, reference values never used as UI colors.
    // The alt mirrors the brand's seed when no secondary ramp exists.
    g[ABSOLUTE_GROUP] = {
      [CSS_FAMILY.brandPrimary]: colorFromHexString(scale.identityHex ?? invSeed),
      [CSS_FAMILY.brandSecondary]: colorFromHexString((input.secondary ?? scale).identityHex ?? invSeed),
    }
    return g
  }

  return { light: build('light'), dark: build('dark') }
}
