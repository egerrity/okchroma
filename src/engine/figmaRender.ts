

import { toHex, ctaNeedsBorder, pageStopFor, ctaBorderRung, OFFSET_ALPHAS, type OffsetRung } from './cssRender'
import { srgbEmitChannels } from './colorMath'
import { stopTokenName, tokenOrder } from './tokenNames'
import { generateNeutralScale, type GeneratedScale, type ColorStop, type NeutralLevel, type ContrastProfile } from './colorEngine'
import { OUTLINE_HOVER_ALPHA, OUTLINE_PRESSED_ALPHA, SOFT_ON_CTA_ALPHA, softOnCtaPasses, escapeCtaFamily, resolveLinkTrio, type ResolvedBrand, type SecondaryStyle } from './resolve'

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

// the decorative cta stroke (owner 2026-07-29, ladder 2026-07-31): black in light, flipped to
// white in dark, at this family's rung. Scheme-divergent, brand-independent — the plugin aliases
// every rung and TRANSPARENT_TOKEN onto their system/alpha/* rows, so a cta-border is never a raw
// write in any state.
const OFFSET_TOKEN = (rung: OffsetRung, mode: 'light' | 'dark'): FigmaColorToken => {
  const c = mode === 'light' ? 0 : 1
  return {
    $type: 'color',
    $value: { colorSpace: 'srgb', components: [c, c, c], alpha: OFFSET_ALPHAS[rung], hex: mode === 'light' ? '#000000' : '#ffffff' },
  }
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

// BAND GROUPING (owner 2026-07-27): the emitted shape nests each family into its
// bands — paper/ wash/ mark/ ink/ with LL(-rNNN) leaves, cta/ + cta-ink/
// with STATE leaves (enabled/hover/pressed, matching system/link), and the
// on-colors riding their carrier group (cta/on — highlight/on died with the
// highlight band, 2026-07-29). `identity` stays
// a flat leaf here (the primitive lanes keep it); the plugins re-home the BIND
// surfaces to system/abs-primary|abs-secondary. Both plugins migrate every old
// flat name in place via RENAMED_LEAVES.
// Stage B (owner 2026-08-07, names only): the flat names carry a banded leaf shape
// of their own now (paper-99, mark-74-r300, ink-53-r450 …) — the split moved from
// "band word + one digit group" to "band word + everything after the FIRST hyphen",
// so a floor suffix like -r450 rides inside the leaf rather than breaking the match.
// `highlight` LEFT the band-word set with the C53 collapse (nothing names a stop
// highlight-N any more); `mark` joined in its place, same regex slot.
function bandedLeaf(flat: string): string {
  const STATE: Record<string, string> = {
    'cta': 'cta/enabled', 'cta-hover': 'cta/hover', 'cta-pressed': 'cta/pressed',
    'cta-border': 'cta/border', 'on-cta': 'cta/on',
    'cta-ink': 'cta-ink/enabled', 'cta-ink-hover': 'cta-ink/hover', 'cta-ink-pressed': 'cta-ink/pressed',
    'cta-ink-strong': 'cta-ink-strong/enabled', 'cta-ink-strong-hover': 'cta-ink-strong/hover', 'cta-ink-strong-pressed': 'cta-ink-strong/pressed',
  }
  const mapped = STATE[flat]
  if (mapped) return mapped
  const m = /^(paper|wash|mark|ink)-(.+)$/.exec(flat)
  return m ? `${m[1]}/${m[2]}` : flat
}
// Order-aware entries for a FigmaGroup (adversarial-audit-caught 2026-08-07): JS
// enumerates integer-index string keys ascending, before any string keys, REGARDLESS of
// insertion order (ECMA-262 OrdinaryOwnPropertyKeys). paper's leaves (95/97/99/100) and
// wash's (80/85/89/92) are bare-digit keys, so a plain Object.entries silently reverses
// them to ascending — defeating the TOKEN_ORDER-derived insertion order rampGroup builds
// (descending LL, lightest first) without any COLOR changing. mark/ink leaves carry a
// -rNNN suffix (e.g. '74-r300') so they are not canonical integer keys and are unaffected;
// this walker treats them the same way anyway so the rule doesn't depend on that
// incidental shape. Non-digit-leading siblings (band names, cta states, …) keep
// Object.entries' order, which is already correct for them. Exported so every consumer
// that walks a FigmaGroup for panel-order-sensitive output uses the same rule instead of
// re-deriving it (or missing it) per call site.
export function groupEntries(g: FigmaGroup): Array<[string, FigmaColorToken | FigmaGroup]> {
  const entries = Object.entries(g)
  const digitLeading = (k: string) => /^\d/.test(k)
  if (entries.length > 1 && entries.every(([k]) => digitLeading(k)))
    return entries.sort((a, b) => parseInt(b[0], 10) - parseInt(a[0], 10))
  return entries
}

// set a token at its banded home inside a family group (used by rampGroup AND
// the outline/escape re-expressions, so every write lands in the same shape)
export function putLeaf(g: FigmaGroup, flat: string, tok: FigmaColorToken): void {
  const path = bandedLeaf(flat).split('/')
  let cur = g
  for (const seg of path.slice(0, -1)) {
    if (!(seg in cur) || '$type' in (cur[seg] as FigmaColorToken | FigmaGroup)) cur[seg] = {}
    cur = cur[seg] as FigmaGroup
  }
  cur[path[path.length - 1]] = tok
}

// (the `kind` param DELETED 2026-07-29: it selected between the two on-fill token
// names, and every call site already passed 'brand'. One on-color per family now.)
function rampGroup(
  stops: ColorStop[],
  onFillWhite: boolean,
  extra?: {
    identityHex?: string
    cta?: ColorStop; ctaHover?: ColorStop; ctaPressed?: ColorStop
    ctaInk?: ColorStop; ctaInkHover?: ColorStop; ctaInkPressed?: ColorStop
    // the STRONG text-cta (neutral only, owner 2026-08-04): the mirror trio over the same
    // three stops cta-ink ascends — enabled ≡ ink-30-r700, hover ≡ ink-42-r650 (shared
    // through cta-ink/hover), pressed ≡ ink-53-r450 (C49 numbering). Emitted as raw values here; both
    // plugins re-express all three as aliases (the cta-border idiom).
    ctaInkStrong?: ColorStop; ctaInkStrongHover?: ColorStop; ctaInkStrongPressed?: ColorStop
    // the already-resolved border token — the decorative alpha stroke when this cta vibrates,
    // else transparent. Resolved by the caller because the choice is mode-dependent and
    // rampGroup has no mode. Both outcomes are ALIAS targets on the plugin side
    // (system/alpha/offset-06|08|16 | system/alpha/transparent), so neither is ever a raw write.
    ctaBorder?: FigmaColorToken
  },
): FigmaGroup {
  const g: FigmaGroup = {}
  for (const s of [...stops].sort((a, b) => tokenOrder(stopTokenName(a.stop)) - tokenOrder(stopTokenName(b.stop))))
    putLeaf(g, stopTokenName(s.stop), colorFromStop(s))

  // the cta family, SEMANTIC-named (owner ruling 2026-07-16: states, never options;
  // banded to cta/enabled|hover|pressed 2026-07-27) — renames ride both plugins'
  // RENAMED_LEAVES in-place migration.
  if (extra?.cta) putLeaf(g, 'cta', colorFromStop(extra.cta))
  if (extra?.ctaHover) putLeaf(g, 'cta-hover', colorFromStop(extra.ctaHover))
  if (extra?.ctaPressed) putLeaf(g, 'cta-pressed', colorFromStop(extra.ctaPressed))
  // cta-ink trio: the family's 4.5 text-register cta (link escape) — the ink band read
  // as states (enabled ≡ ink/53-r450, hover ≡ ink/42-r650, pressed ≡ ink/30-r700; C49)
  if (extra?.ctaInk) putLeaf(g, 'cta-ink', colorFromStop(extra.ctaInk))
  if (extra?.ctaInkHover) putLeaf(g, 'cta-ink-hover', colorFromStop(extra.ctaInkHover))
  if (extra?.ctaInkPressed) putLeaf(g, 'cta-ink-pressed', colorFromStop(extra.ctaInkPressed))
  if (extra?.ctaInkStrong) putLeaf(g, 'cta-ink-strong', colorFromStop(extra.ctaInkStrong))
  if (extra?.ctaInkStrongHover) putLeaf(g, 'cta-ink-strong-hover', colorFromStop(extra.ctaInkStrongHover))
  if (extra?.ctaInkStrongPressed) putLeaf(g, 'cta-ink-strong-pressed', colorFromStop(extra.ctaInkStrongPressed))
  // cta/border pairs with the cta family: the SAFETY STROKE when the fill would vibrate against
  // the background rather than sit on it (owner 2026-07-29, superseding the 2026-07-04 "filled is
  // filled" removal), else transparent. The rule lives in cssRender.ctaNeedsBorder — |Lc| of the
  // cta against the page under 15 — so both emitters decide identically, and the rung comes from
  // cssRender.ctaBorderRung. The outline secondary still overrides this with its own mark/74-r300
  // unconditionally — there the border is the button's identity, not a safety.
  if (extra?.cta) putLeaf(g, 'cta-border', extra.ctaBorder ?? TRANSPARENT_TOKEN)
  putLeaf(g, 'on-cta', colorFromHex(onFillWhite))
  if (extra?.identityHex) g['identity'] = colorFromHexString(extra.identityHex)
  return g
}

export interface ThemeInput {

  secondary?: GeneratedScale | null

  // the secondary's mode chip — 'outline' re-expresses the cta pair (mirrors cssRender's
  // outline override): cta transparent, cta-hover/-pressed the cta color at OUTLINE alphas,
  // cta-border ALWAYS the secondary's own mark-74-r300, on-cta the secondary's ink-53-r450.
  secondaryStyle?: SecondaryStyle

  neutralLevel?: NeutralLevel

  // the neutral's RESOLVED tint hue (owner 2026-08-04, the source round): callers resolve
  // the source via colorEngine.neutralTintHue and pass the hue; absent = the primary's —
  // every pre-source caller is byte-identical. The emitter stays dumb on purpose: the
  // secondary-follows-live and custom-hex fallback rules live in ONE place, not here.
  neutralH?: number

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

  // THE CTA-BORDER OPT-OUT (owner 2026-07-31: "on by default but optional"). DEFAULT ON —
  // absent means the stroke ships, so every stored recipe predating the flag is unchanged.
  // Off withholds the PAGE rather than branching the gate; see cssRender.brandCss.
  ctaBorder?: boolean
}

export function themeToFigma(r: ResolvedBrand, input: ThemeInput): { light: FigmaGroup; dark: FigmaGroup } {
  const { scale } = r
  const secondary = input.secondary ?? scale
  const secondaryOnFillLight = input.secondary ? input.secondary.onFillTextIsWhite : scale.onFillTextIsWhite
  const secondaryOnFillDark = input.secondary ? input.secondary.onFillTextIsWhiteDark : scale.onFillTextIsWhiteDark

  // the full cta family per mode — one helper, every family call-site rides it.
  // ctaBorder rides here too (owner 2026-07-29) so brand, secondary, neutral AND the signals all
  // get the stroke from one decision — see cssRender.ctaNeedsBorder, which owns the rule (|Lc| of
  // the cta against the PAGE under 15), and ctaBorderRung, which owns the per-family rung.
  // `prefix` must match the css side's var prefix or the two emitters would disagree on the rung.
  // nScale is declared below but only READ when build() runs, which is after — no TDZ.
  const borderPage = (mode: 'light' | 'dark') => (input.ctaBorder ?? true) ? pageStopFor(nScale, mode) : undefined
  const ctaFamily = (s: GeneratedScale, mode: 'light' | 'dark', prefix: string) => ({
    ctaBorder: ctaNeedsBorder(s, mode, borderPage(mode)) ? OFFSET_TOKEN(ctaBorderRung(prefix), mode) : TRANSPARENT_TOKEN,
    ...(mode === 'light'
      ? { cta: s.cta, ctaHover: s.ctaHover, ctaPressed: s.ctaPressed, ctaInk: s.ctaInk, ctaInkHover: s.ctaInkHover, ctaInkPressed: s.ctaInkPressed }
      : { cta: s.ctaDark, ctaHover: s.ctaHoverDark, ctaPressed: s.ctaPressedDark, ctaInk: s.ctaInkDark, ctaInkHover: s.ctaInkHoverDark, ctaInkPressed: s.ctaInkPressedDark }),
  })

  const brandExtra = (s: GeneratedScale, mode: 'light' | 'dark', prefix: string) => ({
    identityHex: s.identityHex,
    ...ctaFamily(s, mode, prefix),
  })

  const nScale = generateNeutralScale(input.neutralH ?? scale.brandH, input.neutralLevel ?? 'default', input.contrastProfile)
  // custom link seed resolved ONCE (both modes read it)
  const lt = input.linkHex ? resolveLinkTrio(input.linkHex, input.contrastProfile) : null
  // the neutral carries the STRONG text-cta mirror on top of the shared family shape:
  // no new solved values — the mirror descends the same three stops cta-ink ascends
  // (enabled ≡ ink-30-r700, hover ≡ ink-42-r650 through the family's hover field, pressed ≡ ink-53-r450;
  // the hover stopped being a raw between value with C49)
  const neutralExtra = (mode: 'light' | 'dark') => {
    const at = (n: number) => nScale[mode].find(s => s.stop === n)
    return {
      ...ctaFamily(nScale, mode, 'neutral'),
      ctaInkStrong: at(11),
      ctaInkStrongHover: mode === 'light' ? nScale.ctaInkHover : nScale.ctaInkHoverDark,
      ctaInkStrongPressed: at(9),
    }
  }
  const build = (mode: 'light' | 'dark'): FigmaGroup => {
    // paper-100 (paper-0 pre-Stage-B) rides WITH the neutral ramp at paper/100 (its dark value is
    // neutral-tinted, so it dedups and aliases through the same per-tint
    // machinery as the rest of the neutral — never a global absolute); JS
    // integer-key enumeration keeps 0 ahead of 1 regardless of insertion order.
    const p0 = mode === 'light' ? nScale.paper0 : nScale.paper0Dark
    const neutralGroup: FigmaGroup = rampGroup(nScale[mode], mode === 'light' ? nScale.onFillTextIsWhite : nScale.onFillTextIsWhiteDark, neutralExtra(mode))
    if (p0) putLeaf(neutralGroup, 'paper-100', colorFromStop(p0))
    const secondaryGroup = rampGroup(secondary[mode], mode === 'light' ? secondaryOnFillLight : secondaryOnFillDark, brandExtra(secondary, mode, 'secondary'))
    // outline re-expression (only a real secondary can be outline) — same values cssRender
    // emits. The hover = mark-74-r300 at OUTLINE_HOVER_ALPHA (the STABLE gated stop the ring
    // uses — 9% of the generated subtle cta was imperceptible).
    if (input.secondaryStyle === 'outline' && input.secondary) {
      const s8 = secondary[mode].find(s => s.stop === 8)
      const s9 = secondary[mode].find(s => s.stop === 9)
      putLeaf(secondaryGroup, 'cta', TRANSPARENT_TOKEN)
      if (s8) {
        const e = srgbEmitChannels(s8)
        const alphaTint = (alpha: number): FigmaColorToken => ({
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [clamp01(e.r), clamp01(e.g), clamp01(e.b)], alpha, hex: toHex(e.r, e.g, e.b) },
        })
        putLeaf(secondaryGroup, 'cta-hover', alphaTint(OUTLINE_HOVER_ALPHA))
        // pressed = the hover tint at doubled alpha (pressed-doubles-hover, alpha register)
        putLeaf(secondaryGroup, 'cta-pressed', alphaTint(OUTLINE_PRESSED_ALPHA))
      }
      if (s8) putLeaf(secondaryGroup, 'cta-border', colorFromStop(s8))
      // cta-ink trio untouched: outline re-expresses the FILL trio only — links keep the
      // exact ramp's text-register values already emitted by rampGroup
      // cta/on = the family's ink/53-r450, NOT a pole — the plugin aliases non-pole on-fills to the sibling ink/53-r450
      if (s9) putLeaf(secondaryGroup, 'on-cta', colorFromStop(s9))
    }
    // the SOFT on-cta — THE QUIET-FILL RULE: a low-hierarchy cta's button text is the
    // on-text pole at SOFT_ON_CTA_ALPHA, composited by the consumer over the fill's current
    // state so hover/pressed carry their own legibility. Same values cssRender emits. The
    // VALUE ships here; both plugins alias this leaf onto their system/alpha/ink primitive
    // (owner-named 2026-08-03) — the cta-border idiom, never a raw write.
    // THE CARRIERS (mirrors cssRender.softOnCta — the two must agree):
    //  · the DEFAULT-model secondary (owner 2026-08-03) and the NEUTRAL (owner 2026-08-04) —
    //    unconditional, their fills are known-legal by construction.
    //  · the EXACT-style secondary, including the absent-style case resolve normalizes to
    //    exact (owner 2026-08-06) — per mode, wherever softOnCtaPasses keeps the composite
    //    over WCAG 4.5 on every fill state; a failing fill keeps the solid pole.
    // Outline took its ink/53-r450 above; the no-secondary mirror keeps the brand's. Loud fills —
    // brand, the signals, and the cta ESCAPE below — keep the solid pole.
    const softOnCta = (g: FigmaGroup, white: boolean) => {
      const p = white ? 1 : 0
      putLeaf(g, 'on-cta', {
        $type: 'color',
        $value: { colorSpace: 'srgb', components: [p, p, p], alpha: SOFT_ON_CTA_ALPHA[mode], hex: white ? '#ffffff' : '#000000' },
      })
    }
    softOnCta(neutralGroup, mode === 'light' ? nScale.onFillTextIsWhite : nScale.onFillTextIsWhiteDark)
    if (input.secondary && input.secondaryStyle !== 'outline'
      && (input.secondaryStyle === 'default' || softOnCtaPasses(input.secondary, mode)))
      softOnCta(secondaryGroup, mode === 'light' ? secondaryOnFillLight : secondaryOnFillDark)
    const brandGroup = rampGroup(scale[mode], mode === 'light' ? scale.onFillTextIsWhite : scale.onFillTextIsWhiteDark, brandExtra(scale, mode, 'brand'))
    // neutral cta escape re-expression (mirrors the outline block above): the brand's
    // FILL trio + on-cta swap to the brand-neutral's ink register; cta-ink + the ramp
    // stay the brand's own. With NO real secondary the secondary group MIRRORS the brand
    // (secondary = scale above), so the escape applies there too — the un-escaped raw
    // trio must not survive in the mirror (review-caught latent divergence).
    const esc = input.ctaEscape ? escapeCtaFamily(nScale, mode, input.contrastProfile) : null
    if (esc) {
      for (const g of input.secondary ? [brandGroup] : [brandGroup, secondaryGroup]) {
        putLeaf(g, 'cta', colorFromStop(esc.cta))
        putLeaf(g, 'cta-hover', colorFromStop(esc.ctaHover))
        putLeaf(g, 'cta-pressed', colorFromStop(esc.ctaPressed))
        // ALL the ctas (owner amendment): the text-style cta trio de-reds too
        putLeaf(g, 'cta-ink', colorFromStop(esc.ctaInk))
        putLeaf(g, 'cta-ink-hover', colorFromStop(esc.ctaInkHover))
        putLeaf(g, 'cta-ink-pressed', colorFromStop(esc.ctaInkPressed))
        putLeaf(g, 'on-cta', colorFromHex(esc.onFillIsWhite))
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
        // signals rank with the primary (ctaBorderRung: anything not neutral/secondary takes 16).
        // Unreachable at the Lc 15 gate — no signal gets within 4 Lc of it — but defined, not accidental.
        ctaFamily(sig.scale, mode, sig.name),
      )
    }
    return g
  }

  return { light: build('light'), dark: build('dark') }
}
