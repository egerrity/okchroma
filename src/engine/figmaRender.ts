

import { toHex, ctaNeedsBorder, pageStopFor, ctaBorderRung, OFFSET_ALPHAS, SHADOW_ALPHAS, SCRIM_ALPHA, type OffsetRung } from './cssRender'
import { srgbEmitChannels } from './colorMath'
import { stopTokenName, tokenOrder, STAMP_FILL, STAMP_FILL_HOVER, STAMP_FILL_PRESSED, STAMP_EDGE, STAMP_ON, STAMP_STATE_LEAVES, PAPER_100, INK_0, SYSTEM_LEAF, SURFACE_PLANE_LAW } from './tokenNames'
import { CSS_FAMILY } from './tokenDescriptions'
import { generateNeutralScale, type GeneratedScale, type ColorStop, type NeutralLevel, type ContrastProfile } from './colorEngine'
import { OUTLINE_HOVER_ALPHA, OUTLINE_PRESSED_ALPHA, SOFT_ON_CTA_ALPHA, softOnCtaPasses, escapeCtaFamily, resolveLinkTrio, resolveLinkInverseTrio, type ResolvedBrand, type SecondaryStyle } from './resolve'

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

// LEAF SHAPE (owner 2026-08-12, band flattening; solid rename 2026-08-18): ramp
// tokens sit FLAT in the family group — paper-99, paper-99-overlay, wash-92,
// wax-74, lead-53 … ONLY the stamp/ state group nests
// (fill/fill-hover/fill-pressed/edge/on, matching system/link's state shape); its
// table lives in tokenNames.ts — the one flat↔nested source every consumer rides. `identity` stays
// a flat leaf; the plugins re-home the BIND surfaces to their absolute rows. Both
// plugins migrate every old spelling in place via RENAMED_LEAVES.
function bandedLeaf(flat: string): string {
  return STAMP_STATE_LEAVES[flat] ?? flat
}
// Order-aware entries for a FigmaGroup (adversarial-audit-caught 2026-08-07): JS
// enumerates integer-index string keys ascending, before any string keys, REGARDLESS of
// insertion order (ECMA-262 OrdinaryOwnPropertyKeys). paper's leaves (95/97/99/100) and
// wash's (80/85/89/92) are bare-digit keys, so a plain Object.entries silently reverses
// them to ascending — defeating the TOKEN_ORDER-derived insertion order rampGroup builds
// (descending LL, lightest first) without any COLOR changing. wax/ink leaves carry a
// a conformance suffix (e.g. '74-aa') so they are not canonical integer keys and are unaffected;
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
    // the already-resolved border token — the decorative alpha stroke when this cta vibrates,
    // else transparent. Resolved by the caller because the choice is mode-dependent and
    // rampGroup has no mode. Both outcomes are ALIAS targets on the plugin side
    // (system/alpha/offset-06|08|16 | system/alpha/transparent), so neither is ever a raw write.
    ctaBorder?: FigmaColorToken
  },
  // (the paper-overlay leaves are PARKED — owner 2026-08-18, "remove them for now and
  // come back": emission is off, the solve lives on in alphaPapers.ts under
  // audit:alpha, and existing rows in files ORPHAN rather than being deleted.
  // Resurrection = re-passing alphaPapersFor's rows here; see git for the wiring.)
): FigmaGroup {
  const g: FigmaGroup = {}
  const leaves = stops.map(s => ({ name: stopTokenName(s.stop), tok: colorFromStop(s) }))
    .sort((a, b) => tokenOrder(a.name) - tokenOrder(b.name))
  for (const l of leaves) putLeaf(g, l.name, l.tok)

  // the stamp family (states, never options — owner ruling 2026-07-16; renamed from
  // the cta words 2026-08-18) — renames ride both plugins' RENAMED_LEAVES in-place
  // migration. Internal GeneratedScale properties keep their cta spelling: they are
  // compiler-checked and never surface in any emitted name.
  if (extra?.cta) putLeaf(g, STAMP_FILL, colorFromStop(extra.cta))
  if (extra?.ctaHover) putLeaf(g, STAMP_FILL_HOVER, colorFromStop(extra.ctaHover))
  if (extra?.ctaPressed) putLeaf(g, STAMP_FILL_PRESSED, colorFromStop(extra.ctaPressed))
  // stamp/edge pairs with the fill trio: the SAFETY STROKE when the fill would vibrate against
  // the background rather than sit on it (owner 2026-07-29, superseding the 2026-07-04 "filled is
  // filled" removal), else transparent. The rule lives in cssRender.ctaNeedsBorder — |Lc| of the
  // fill against the page under 15 — so both emitters decide identically, and the rung comes from
  // cssRender.ctaBorderRung. The outline secondary still overrides this with its own wax-74
  // unconditionally — there the edge is the button's identity, not a safety.
  if (extra?.cta) putLeaf(g, STAMP_EDGE, extra.ctaBorder ?? TRANSPARENT_TOKEN)
  putLeaf(g, STAMP_ON, colorFromHex(onFillWhite))
  if (extra?.identityHex) g['identity'] = colorFromHexString(extra.identityHex)
  return g
}

export interface ThemeInput {

  secondary?: GeneratedScale | null

  // the secondary's mode chip — 'outline' re-expresses the cta pair (mirrors cssRender's
  // outline override): cta transparent, cta-hover/-pressed the cta color at OUTLINE alphas,
  // cta-border ALWAYS the secondary's own wax-74, on-cta the secondary's lead-53.
  secondaryStyle?: SecondaryStyle

  neutralLevel?: NeutralLevel

  // the neutral's RESOLVED tint hue (owner 2026-08-04, the source round): callers resolve
  // the source via colorEngine.neutralTintHue and pass the hue; absent = the primary's —
  // every pre-source caller is byte-identical. The emitter stays dumb on purpose: the
  // secondary-follows-live and custom-hex fallback rules live in ONE place, not here.
  neutralH?: number

  signals: Array<{ name: string; scale: GeneratedScale }>

  // profile the theme was resolved under: the neutral generated HERE must match the caller's
  // brand/alt/signal scales (which already carry it). Default wcag.
  contrastProfile?: ContrastProfile

  // the NEUTRAL CTA ESCAPE (Phase 3, owner 2026-07-16): the brand's cta FILL trio +
  // on-cta re-resolve from the brand-neutral's ink register (near-black light /
  // near-white dark) — the red-collision de-conflict. Same tokens, different values
  // (the outline idiom); default off = byte-identical. The brand's INK STOPS are NOT
  // touched (owner 2026-08-13, reverting the 2026-08-12 ink de-chroma).
  ctaEscape?: boolean

  // the SYSTEM LINK (Phase 4, owner 2026-07-16): a custom link seed — when set, the
  // emitted link group carries ITS ink-register resolution (the red de-conflict);
  // absent = the link group carries the primary's ink stops (the plugins alias them).
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
  // `prefix` is the CSS_FAMILY word (tokenDescriptions.ts), the same table the css
  // emitter reads, so the two emitters cannot disagree on the rung.
  // nScale is declared below but only READ when build() runs, which is after — no TDZ.
  const borderPage = (mode: 'light' | 'dark') => (input.ctaBorder ?? true) ? pageStopFor(nScale, mode) : undefined
  const ctaFamily = (s: GeneratedScale, mode: 'light' | 'dark', prefix: string) => ({
    ctaBorder: ctaNeedsBorder(s, mode, borderPage(mode)) ? OFFSET_TOKEN(ctaBorderRung(prefix), mode) : TRANSPARENT_TOKEN,
    ...(mode === 'light'
      ? { cta: s.cta, ctaHover: s.ctaHover, ctaPressed: s.ctaPressed }
      : { cta: s.ctaDark, ctaHover: s.ctaHoverDark, ctaPressed: s.ctaPressedDark }),
  })

  const brandExtra = (s: GeneratedScale, mode: 'light' | 'dark', prefix: string) => ({
    identityHex: s.identityHex,
    ...ctaFamily(s, mode, prefix),
  })

  const nScale = generateNeutralScale(input.neutralH ?? scale.brandH, input.neutralLevel ?? 'default', input.contrastProfile)
  // custom link seed resolved ONCE (both modes read it)
  const lt = input.linkHex ? resolveLinkTrio(input.linkHex, input.contrastProfile) : null
  // the INVERSE link trio (owner round 2026-08-19): the same link seed re-solved for
  // text on ink-30 surfaces (resolve.resolveLinkInverseTrio — the ink register anchored
  // at INK_30_GROUND, modes crossed). Unlike the link there is NO alias posture: no
  // existing stop is anchored at the ink-30 ground, so the default seeds from the
  // brand's own hex and the values always ship raw. (identityHex is typed optional but
  // generateScale always sets it; the ink-stop fallback keeps a hand-built scale on its
  // own hue rather than throwing.)
  const invSeed = input.linkHex ?? scale.identityHex
    ?? (() => { const s9 = scale.light.find(x => x.stop === 9)!; const e = srgbEmitChannels(s9); return toHex(e.r, e.g, e.b) })()
  const invLt = resolveLinkInverseTrio(invSeed, input.contrastProfile)
  // (the neutral's STRONG text-cta mirror DELETED with the cta-ink register, owner
  // 2026-08-12 — it was the same three ink stops descending; consumers read them directly)
  const neutralExtra = (mode: 'light' | 'dark') => ctaFamily(nScale, mode, CSS_FAMILY.neutral)
  const build = (mode: 'light' | 'dark'): FigmaGroup => {
    // paper-100 (paper-0 pre-Stage-B) rides WITH the neutral ramp at paper-100 (its dark value is
    // neutral-tinted, so it dedups and aliases through the same per-tint
    // machinery as the rest of the neutral — never a global absolute). It leads the
    // group — the ladder is descending LL, lightest first — by INSERTION now: flat
    // leaves are not integer keys, so enumeration follows insertion order (the banded
    // era leaned on integer-key enumeration putting 100 ahead of 99 inside paper/).
    const p0 = mode === 'light' ? nScale.paper0 : nScale.paper0Dark
    const ramp = rampGroup(nScale[mode], mode === 'light' ? nScale.onFillTextIsWhite : nScale.onFillTextIsWhiteDark, neutralExtra(mode))
    // ink-0 rides WITH the neutral ramp too (the LITERAL pole again — owner 2026-08-31
    // walked back the 2026-08-28 seam resolver; the engine now mints the #000/#fff the
    // plugins once hand-wrote, keeping the emission architecture): spliced directly
    // after ink-30 so the flat group keeps ladder order by insertion (flat leaves are
    // never integer keys — see groupEntries). Missing field = the leaf is omitted and
    // the plugins keep whatever the file holds.
    const i0 = mode === 'light' ? nScale.ink0 : nScale.ink0Dark
    const spliceInk0 = (g: FigmaGroup): FigmaGroup => {
      if (!i0) return g
      const out: FigmaGroup = {}
      for (const [k, v] of Object.entries(g)) {
        out[k] = v
        if (k === stopTokenName(11)) out[INK_0] = colorFromStop(i0)
      }
      return out
    }
    const neutralGroup: FigmaGroup = spliceInk0(p0 ? { [PAPER_100]: colorFromStop(p0), ...ramp } : ramp)
    const secondaryGroup = rampGroup(secondary[mode], mode === 'light' ? secondaryOnFillLight : secondaryOnFillDark, brandExtra(secondary, mode, CSS_FAMILY.brandSecondary))
    // outline re-expression (only a real secondary can be outline) — same values cssRender
    // emits. The hover = wax-74 at OUTLINE_HOVER_ALPHA (the STABLE gated stop the ring
    // uses — 9% of the generated subtle cta was imperceptible).
    if (input.secondaryStyle === 'outline' && input.secondary) {
      const s8 = secondary[mode].find(s => s.stop === 8)
      const s9 = secondary[mode].find(s => s.stop === 9)
      putLeaf(secondaryGroup, STAMP_FILL, TRANSPARENT_TOKEN)
      if (s8) {
        const e = srgbEmitChannels(s8)
        const alphaTint = (alpha: number): FigmaColorToken => ({
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [clamp01(e.r), clamp01(e.g), clamp01(e.b)], alpha, hex: toHex(e.r, e.g, e.b) },
        })
        putLeaf(secondaryGroup, STAMP_FILL_HOVER, alphaTint(OUTLINE_HOVER_ALPHA))
        // pressed = the hover tint at doubled alpha (pressed-doubles-hover, alpha register)
        putLeaf(secondaryGroup, STAMP_FILL_PRESSED, alphaTint(OUTLINE_PRESSED_ALPHA))
      }
      if (s8) putLeaf(secondaryGroup, STAMP_EDGE, colorFromStop(s8))
      // outline re-expresses the FILL trio only — the ramp's ink stops (the text register)
      // are already emitted by rampGroup and stay untouched
      // stamp/on = the family's lead-53, NOT a pole — the plugin aliases non-pole on-colors to the sibling lead-53
      if (s9) putLeaf(secondaryGroup, STAMP_ON, colorFromStop(s9))
    }
    // the SOFT on-cta — THE QUIET-FILL RULE: a low-hierarchy cta's button text is the
    // on-text pole at SOFT_ON_CTA_ALPHA, composited by the consumer over the fill's current
    // state so hover/pressed carry their own legibility. Same values cssRender emits. The
    // VALUE ships here; both plugins alias this leaf onto their system/alpha/ink primitive
    // (owner-named 2026-08-03) — the cta-border idiom, never a raw write.
    // THE CARRIERS (mirrors cssRender.softOnCta — the two must agree):
    //  · the NEUTRAL (owner 2026-08-04) — unconditional; re-measured 2026-08-29, it passes
    //    softOnCtaPasses across the sweep in both modes.
    //  · EVERY non-outline secondary, default model included (owner ruling 2026-08-29) —
    //    per mode, wherever softOnCtaPasses keeps the composite over WCAG 4.5 on every fill
    //    state; a failing fill keeps the solid pole, the regular button posture. The default
    //    model's old unconditional pass was a C47 calibration gap — its dark states were
    //    never measured and never passed (see the CARRIERS note in resolve.ts).
    // Outline took its ink/53-aa above; the no-secondary mirror keeps the brand's. Loud fills —
    // brand, the signals, and the cta ESCAPE below — keep the solid pole.
    const softOnCta = (g: FigmaGroup, white: boolean) => {
      const p = white ? 1 : 0
      putLeaf(g, STAMP_ON, {
        $type: 'color',
        $value: { colorSpace: 'srgb', components: [p, p, p], alpha: SOFT_ON_CTA_ALPHA[mode], hex: white ? '#ffffff' : '#000000' },
      })
    }
    softOnCta(neutralGroup, mode === 'light' ? nScale.onFillTextIsWhite : nScale.onFillTextIsWhiteDark)
    if (input.secondary && input.secondaryStyle !== 'outline' && softOnCtaPasses(input.secondary, mode))
      softOnCta(secondaryGroup, mode === 'light' ? secondaryOnFillLight : secondaryOnFillDark)
    const brandGroup = rampGroup(scale[mode], mode === 'light' ? scale.onFillTextIsWhite : scale.onFillTextIsWhiteDark, brandExtra(scale, mode, CSS_FAMILY.brandPrimary))
    // neutral cta escape re-expression (mirrors the outline block above): the brand's
    // FILL trio + on-cta swap to the brand-neutral's ink register — the ink stops keep
    // the brand's own chroma (owner 2026-08-13, reverting the 2026-08-12 ink de-chroma).
    // With NO real secondary the secondary group MIRRORS the brand (secondary = scale
    // above), so the escape applies there too — the un-escaped raw trio must not
    // survive in the mirror (review-caught latent divergence).
    const esc = input.ctaEscape ? escapeCtaFamily(nScale, mode, input.contrastProfile) : null
    if (esc) {
      for (const g of input.secondary ? [brandGroup] : [brandGroup, secondaryGroup]) {
        putLeaf(g, STAMP_FILL, colorFromStop(esc.cta))
        putLeaf(g, STAMP_FILL_HOVER, colorFromStop(esc.ctaHover))
        putLeaf(g, STAMP_FILL_PRESSED, colorFromStop(esc.ctaPressed))
        putLeaf(g, STAMP_ON, colorFromHex(esc.onFillIsWhite))
      }
    }
    // the SYSTEM LINK trio (Phase 4): ONE per theme. Custom seed → its ink-register
    // resolution; default → the primary's ink stops verbatim (value-equal to what the
    // plugins alias, so the emitted structure never lies about the shipped color).
    const scaleInkAt = (n: number) => {
      const s = scale[mode].find(x => x.stop === n)
      if (!s) throw new Error(`themeToFigma link: the brand scale has no ink stop ${n}`)
      return s
    }
    const linkGroup: FigmaGroup = lt
      ? (mode === 'light'
        ? { 'link': colorFromStop(lt.link), 'link-hover': colorFromStop(lt.linkHover), 'link-pressed': colorFromStop(lt.linkPressed) }
        : { 'link': colorFromStop(lt.linkDark), 'link-hover': colorFromStop(lt.linkHoverDark), 'link-pressed': colorFromStop(lt.linkPressedDark) })
      : { 'link': colorFromStop(scaleInkAt(9)), 'link-hover': colorFromStop(scaleInkAt(10)), 'link-pressed': colorFromStop(scaleInkAt(11)) }
    // the INVERSE trio's group mirrors the link group's leaf spelling so both plugins'
    // state-name remaps stay one shared shape
    const linkInverseGroup: FigmaGroup = mode === 'light'
      ? { 'link': colorFromStop(invLt.link), 'link-hover': colorFromStop(invLt.linkHover), 'link-pressed': colorFromStop(invLt.linkPressed) }
      : { 'link': colorFromStop(invLt.linkDark), 'link-hover': colorFromStop(invLt.linkHoverDark), 'link-pressed': colorFromStop(invLt.linkPressedDark) }
    const g: FigmaGroup = {
      brand: brandGroup,
      secondary: secondaryGroup,
      neutral: neutralGroup,
      link: linkGroup,
      'link-inverse': linkInverseGroup,
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
    // ── the SYSTEM group (engine worklist B2–B7, 2026-08-29): the requirement-table
    // rows that had values only in the plugins' STATIC_UTILS and the token layer now
    // ship through the JS emit — object consumers (MUI, RN) need values, not var()
    // aliases. Additive tail: every existing consumer picks named groups, so nothing
    // walks into this unasked. Paths ride SYSTEM_LEAF; values mirror
    // tokens/semantic.css and both plugins 1:1.
    const pole = (white: boolean, alpha: number): FigmaColorToken => {
      const c = white ? 1 : 0
      return {
        $type: 'color',
        $value: { colorSpace: 'srgb', components: [c, c, c], alpha, hex: white ? '#ffffff' : '#000000' },
      }
    }
    putLeaf(g, SYSTEM_LEAF.ABS_BLACK, colorFromHex(false))
    putLeaf(g, SYSTEM_LEAF.ABS_WHITE, colorFromHex(true))
    // the surface planes SPLICE the neutral group's own leaves per SURFACE_PLANE_LAW
    // (tokenNames.ts — the law's one machine-readable home): value-equal to the ramp
    // by construction, the alias posture expressed as object reuse. paper-100 follows
    // the neutral posture — an absent pole omits the plane rather than inventing one.
    for (const [path, law] of Object.entries(SURFACE_PLANE_LAW)) {
      const tok = neutralGroup[law[mode]]
      if (tok && '$type' in tok) putLeaf(g, path, tok as FigmaColorToken)
    }
    // white@0 like the plugins' row (any fully-transparent value aliases here; the
    // stamp/edge TRANSPARENT_TOKEN stays black@0 — same pixel, its own posture)
    putLeaf(g, SYSTEM_LEAF.ALPHA.TRANSPARENT, pole(true, 0))
    putLeaf(g, SYSTEM_LEAF.ALPHA.SCRIM, pole(false, SCRIM_ALPHA))
    // the soft on-text pole (C43/C9 register): black in light, white in dark, alpha
    // per mode — the ONE row every quiet cta's stamp/on aliases
    putLeaf(g, SYSTEM_LEAF.ALPHA.INK, pole(mode === 'dark', SOFT_ON_CTA_ALPHA[mode]))
    putLeaf(g, SYSTEM_LEAF.ALPHA.AWAY_FROM_BG_06, OFFSET_TOKEN(6, mode))
    putLeaf(g, SYSTEM_LEAF.ALPHA.AWAY_FROM_BG_08, OFFSET_TOKEN(8, mode))
    putLeaf(g, SYSTEM_LEAF.ALPHA.AWAY_FROM_BG_16, OFFSET_TOKEN(16, mode))
    // the INVERSE ladder: the same rungs with the pole flipped per mode —
    // state layers for INVERTED grounds (owner 2026-08-29). The reversal
    // lives here, like system/surface/*.
    const inv = mode === 'light' ? 'dark' : 'light'
    putLeaf(g, SYSTEM_LEAF.ALPHA.TOWARD_BG_06, OFFSET_TOKEN(6, inv))
    putLeaf(g, SYSTEM_LEAF.ALPHA.TOWARD_BG_08, OFFSET_TOKEN(8, inv))
    putLeaf(g, SYSTEM_LEAF.ALPHA.TOWARD_BG_16, OFFSET_TOKEN(16, inv))
    putLeaf(g, SYSTEM_LEAF.ALPHA.SHADOW_04, pole(false, SHADOW_ALPHAS[4][mode]))
    putLeaf(g, SYSTEM_LEAF.ALPHA.SHADOW_08, pole(false, SHADOW_ALPHAS[8][mode]))
    putLeaf(g, SYSTEM_LEAF.ALPHA.SHADOW_12, pole(false, SHADOW_ALPHAS[12][mode]))
    return g
  }

  return { light: build('light'), dark: build('dark') }
}
