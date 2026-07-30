

import { generateIllustrationScale, generateNeutralScale, type GeneratedScale, type ColorStop, type NeutralLevel, type ContrastProfile } from './colorEngine'
import { srgbEmitChannels, masterEmitChannels } from './colorMath'
import { clampChromaToGamut } from './constraints'
import { stopTokenName, tokenOrder } from './tokenNames'
import { signalScalesFor, OUTLINE_HOVER_ALPHA, OUTLINE_PRESSED_ALPHA, escapeCtaFamily, resolveLinkTrio, type ResolvedBrand, type SecondaryStyle } from './resolve'
import { SIGNALS, SIGNAL_EMIT_NAME } from './signals'

export function toHex(r: number, g: number, b: number): string {
  const ch = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')
  return `#${ch(r)}${ch(g)}${ch(b)}`
}

// The emit split (§4B): hex = the sRGB clamp-down (gamut-mapped chroma-reduce); the P3
// rendition ships as a color(display-p3 …) override behind @supports, emitted ONLY for
// stops whose master chroma exceeds the sRGB ceiling — in-gamut stops need no override.
export const stopHex = (s: ColorStop): string => {
  const { r, g, b } = srgbEmitChannels(s)
  return toHex(r, g, b)
}
const p3Value = (s: ColorStop): string => {
  const e = (v: number) => Math.min(1, Math.max(0, v)).toFixed(4)
  const [r, g, b] = masterEmitChannels(s)
  return `color(display-p3 ${e(r)} ${e(g)} ${e(b)})`
}
const p3Differs = (s: ColorStop): boolean => s.C > clampChromaToGamut(s.L, s.C, s.H, 'srgb') + 1e-4
// Two gates, both required: @media (color-gamut: p3) = the DISPLAY can show P3 (an sRGB
// display keeps the engine's own chroma-reduced fallback — never the browser's cruder
// clamp of the P3 value); @supports = the browser parses color() (custom properties
// accept any token stream, so without this an old browser would carry the unparsed
// value to the var() site and break the property there).
export const P3_SUPPORTS = '@supports (color: color(display-p3 1 1 1))'
export const P3_MEDIA = '@media (color-gamut: p3)'

export function stopsToVars(stops: ColorStop[], prefix: string): string {
  return [...stops]
    .sort((a, b) => tokenOrder(stopTokenName(a.stop)) - tokenOrder(stopTokenName(b.stop)))
    .map(s => `  --${prefix}-${stopTokenName(s.stop)}: ${stopHex(s)};`)
    .join('\n')
}

const onColor = (white: boolean) => (white ? '#ffffff' : '#000000')

// A ramp body for one mode: the scale + ring + text stops (from the scale array,
// sorted by token order), the off-scale cta family (cta/cta-hover/cta-pressed + the cta-ink trio),
// and the on-cta text token. identity is mode-invariant — the caller emits
// it once (the neutral has none). Used for the brand, the (real) secondary, AND
// the generated neutral — every family is emitted the same way.
// (on-highlight dropped 2026-07-29 with the highlight band — one on-color per family now.)
// THE CTA-BORDER SAFETY (owner 2026-07-29). This supersedes the 2026-07-04 "filled is filled"
// removal of the conditional gate — not as a conformance requirement (the owner's words: *"it's a
// safety … maybe I overstated it"*, and it makes no WCAG claim), but as a DECORATIVE stroke for
// the buttons that would otherwise vibrate against the background instead of sitting on it.
//
// THE TRIGGER IS A LIGHTNESS TEST, NOT A CONTRAST RATIO (owner-corrected twice: it is neither
// 3:1 nor 1:1 against paper-3). A cta at wash-5's lightness or beyond has drifted into the
// surface band and cannot read as a filled button unaided.
//
//   light: cta.L >= wash-5.L     — vibrates by being too LIGHT, like another sheet of paper
//   dark:  cta.L <= wash-5.L     — MIRRORED (owner mark): dark surfaces are dark, so a dark-mode
//                                  fill vibrates by being too DARK. Same rule, reflected.
//
// WHY WASH-5 and not paper-3, which was the first proposal: the owner's own data point is that
// the NEUTRAL button already falls in this category, and the neutral's cta rests exactly on
// stop 4 (L 0.9216). paper-3 sits at 0.9479 and would miss it. wash-5 also satisfies the second
// constraint — that this "mostly affects secondaries" — because a custom secondary's tinted cta
// lands at L ≈ 0.89, just UNDER wash-4: measured over pale agnostic seeds, wash-4 catches 0/96
// custom secondaries where wash-5 catches 81/96.
//
// Layout never shifts — components already carry `border: 1.5px solid var(...-cta-border)`
// unconditionally against the transparent value, which is why that token stayed in the
// vocabulary through the 2026-07-04 removal.
const CTA_BORDER_ANCHOR_STOP = 5

// THE STROKE IS AN ALPHA, NOT A RAMP STOP (owner mark 2026-07-29, confirmed on her Figma
// screenshot of both frames): 12% black in light, FLIPPED TO WHITE in dark. Two consequences
// worth naming, both good:
//   · it is BRAND-INDEPENDENT, so it lives in the base collection as a system row and costs
//     ZERO per-brand overrides. Sourcing it from the family's ramp instead cost 88 — the
//     neutral is brand-hue-tinted, so its border differed per brand (measured).
//   · it cannot fight the fill's hue, which a same-family wash stop can.
// The alpha DOES NOT scale up in dark the way the shadow set does (4/8/12% black → 32/48/64%),
// because a stroke sits ON the fill rather than bleeding into the ground — her screenshot
// confirms 12% reads in both directions. If dark ever needs more, it is this one constant.
export const OFFSET_12_ALPHA = 0.12

// The system alpha VARIABLES, never raw values (owner 2026-07-29: *"the rest of them should get
// aliased to the transparent variable instead of being raw"*). Both mirror rows the Figma side
// carries under system/alpha/*; emitted per scheme by alphaRootVars() because offset-12's value
// is scheme-DIVERGENT (black in light, white in dark) while transparent is invariant.
//
// NAMED offset-12, NOT cta-border (owner 2026-07-30). It sits in the alpha ladder beside
// shadow-04/08/12 and reads as what it is — a 12% offset from whatever it edges — rather than
// as the property of one token. Nothing about it is cta-specific, so any border that wants the
// same quiet edge can point at it. Renamed in place via RENAMED_LEAVES so a file that already
// carries system/alpha/cta-border adopts the row instead of gaining a duplicate.
export const TRANSPARENT_VAR = '--alpha-transparent'
export const OFFSET_12_VAR = '--alpha-offset-12'
export const offset12Rgba = (mode: 'light' | 'dark'): string =>
  mode === 'light' ? `rgba(0, 0, 0, ${OFFSET_12_ALPHA})` : `rgba(255, 255, 255, ${OFFSET_12_ALPHA})`
export const alphaRootVars = (mode: 'light' | 'dark'): string[] => [
  `  ${TRANSPARENT_VAR}: transparent;`,
  `  ${OFFSET_12_VAR}: ${offset12Rgba(mode)};`,
]

// Compared in OKLCH L directly — the trigger is a lightness question, so it reads the same
// number the ramp is built from rather than routing through a luminance model.
export function ctaNeedsBorder(s: GeneratedScale, mode: 'light' | 'dark'): boolean {
  const stops = mode === 'light' ? s.light : s.dark
  const anchor = stops.find(x => x.stop === CTA_BORDER_ANCHOR_STOP)
  if (!anchor) return false
  const cta = mode === 'light' ? s.cta : s.ctaDark
  return mode === 'light' ? cta.L >= anchor.L : cta.L <= anchor.L
}

export function brandKindBody(prefix: string, s: GeneratedScale, mode: 'light' | 'dark'): string[] {
  const stops = mode === 'light' ? s.light : s.dark
  const f = ctaFamilyOf(s, mode)
  const onCta = mode === 'light' ? s.onFillTextIsWhite : s.onFillTextIsWhiteDark
  // cta-border: the safety stroke above, else the transparent variable. The OUTLINE secondary
  // keeps its own unconditional highlight-8 override at the emitter — there the border is the
  // button's identity, not a safety. Renamed from cta-stroke (owner 2026-07-09); the Figma side
  // renamed with it — plugins migrate existing variables in place.
  // cta family SEMANTIC-named (owner ruling 2026-07-16): cta/cta-hover/cta-pressed +
  // the cta-ink trio (the 4.5 text-register link escape; rest matches ink-9).
  const border = ctaNeedsBorder(s, mode)
  return [
    stopsToVars(stops, prefix),
    `  --${prefix}-cta: ${stopHex(f.cta)};`,
    `  --${prefix}-cta-hover: ${stopHex(f.ctaHover)};`,
    `  --${prefix}-cta-pressed: ${stopHex(f.ctaPressed)};`,
    `  --${prefix}-cta-ink: ${stopHex(f.ctaInk)};`,
    `  --${prefix}-cta-ink-hover: ${stopHex(f.ctaInkHover)};`,
    `  --${prefix}-cta-ink-pressed: ${stopHex(f.ctaInkPressed)};`,
    `  --${prefix}-cta-border: var(${border ? OFFSET_12_VAR : TRANSPARENT_VAR});`,
    `  --${prefix}-on-cta: ${onColor(onCta)};`,
  ]
}

// the full cta family for one mode — shared by the base body and the P3 override body
function ctaFamilyOf(s: GeneratedScale, mode: 'light' | 'dark') {
  return mode === 'light'
    ? { cta: s.cta, ctaHover: s.ctaHover, ctaPressed: s.ctaPressed, ctaInk: s.ctaInk, ctaInkHover: s.ctaInkHover, ctaInkPressed: s.ctaInkPressed }
    : { cta: s.ctaDark, ctaHover: s.ctaHoverDark, ctaPressed: s.ctaPressedDark, ctaInk: s.ctaInkDark, ctaInkHover: s.ctaInkHoverDark, ctaInkPressed: s.ctaInkPressedDark }
}

// the P3 override body for one family+mode: only vars whose master rendition exceeds
// sRGB (on-colors are poles, cta-border transparent — never overridden)
export function brandKindP3Body(prefix: string, s: GeneratedScale, mode: 'light' | 'dark'): string[] {
  const stops = mode === 'light' ? s.light : s.dark
  const f = ctaFamilyOf(s, mode)
  const out: string[] = []
  for (const st of stops) if (p3Differs(st)) out.push(`  --${prefix}-${stopTokenName(st.stop)}: ${p3Value(st)};`)
  for (const [name, st] of [['cta', f.cta], ['cta-hover', f.ctaHover], ['cta-pressed', f.ctaPressed], ['cta-ink', f.ctaInk], ['cta-ink-hover', f.ctaInkHover], ['cta-ink-pressed', f.ctaInkPressed]] as const)
    if (p3Differs(st)) out.push(`  --${prefix}-${name}: ${p3Value(st)};`)
  return out
}

// The neutral as its own light+dark block under `selector` — the demo's
// brandless contexts (the app chrome :root, where there is no [data-brand]
// theme to carry a per-brand neutral) reuse this. The product emits the
// neutral inline per brand (see brandCss); this is the same brand-kind body,
// just scoped to an arbitrary selector.
export function neutralCss(selector: string, brandH: number, level: NeutralLevel = 'default', contrastProfile?: ContrastProfile): string {
  const s = generateNeutralScale(brandH, level, contrastProfile)
  // The universal paper-0/ink-11 anchors ride along: any scope that carries the
  // ladder must also carry its mode-flipping extremes (semantic aliases like
  // --surface-pop resolve through them). paper-0 = the neutral's resolved
  // stop 0 (white in light; one seam below paper-1 in dark, never absolute black).
  const p0 = (st: ColorStop | undefined, fallback: string) => (st ? stopHex(st) : fallback)
  const p3Light = brandKindP3Body('neutral', s, 'light')
  const p3Dark = brandKindP3Body('neutral', s, 'dark')
  return [
    `${selector} {`,
    `  --paper-0: ${p0(s.paper0, '#ffffff')};`,
    `  --ink-11: #000000;`,
    ...brandKindBody('neutral', s, 'light'),
    `}`,
    `${selector}[data-theme="dark"] {`,
    `  --paper-0: ${p0(s.paper0Dark, '#000000')};`,
    `  --ink-11: #ffffff;`,
    ...brandKindBody('neutral', s, 'dark'),
    `}`,
    ...(p3Light.length || p3Dark.length ? [
      `${P3_SUPPORTS} {`,
      `${P3_MEDIA} {`,
      ...(p3Light.length ? [`${selector} {`, ...p3Light, `}`] : []),
      ...(p3Dark.length ? [`${selector}[data-theme="dark"] {`, ...p3Dark, `}`] : []),
      `}`,
      `}`,
    ] : []),
  ].join('\n')
}

// The canonical signal block (`:root` light + the dark selector below), per profile — the build
// writes the wcag one to signals.css; the demo re-emits the apca one as an override when toggled.
//
// Dark selector: the compound `:root[data-theme="dark"]` (0,2,0) is the cascade guarantee — the
// P3 light block re-declares out-of-sRGB stops under bare `:root` (0,1,0) LATER in the file, and
// at equal specificity source order wins, so a flat `[data-theme="dark"]` (0,1,0) dark base lost
// every var the P3 dark block omits to its LIGHT display-p3 rendition on a root-themed page
// (near-white red washes inside dark UI). Same bug class as the owner-caught outline P3 pop
// (2026-07-11, see brandCss) — brandCss/neutralCss were always immune because their dark
// selectors compound the base selector. The bare `[data-theme="dark"]` stays in the list for
// scoped carriers (the demo rides the attribute on divs, which `:root` P3 light never matches).
const SIGNALS_DARK_SELECTOR = ':root[data-theme="dark"], [data-theme="dark"]'
export function signalsCss(contrastProfile?: ContrastProfile): string {
  const sigScales = signalScalesFor(contrastProfile)
  const lightBlocks: string[] = []
  const darkBlocks: string[] = []
  const p3LightBlocks: string[] = []
  const p3DarkBlocks: string[] = []

  for (const sig of SIGNALS) {
    const { scale } = sigScales.get(sig.name)!
    // F1: signals are brand-kind now — a real loud cta AND their own ramp, plus a
    // computed on-cta. No more alias.
    // Emitted prefix = the ROLE name (critical/warning/positive/info, owner
    // 2026-07-27) — the signals are the re-pointable in-between tier; the
    // identity name stays engine-internal.
    lightBlocks.push(...brandKindBody(sig.emitName, scale, 'light'))
    darkBlocks.push(...brandKindBody(sig.emitName, scale, 'dark'))
    p3LightBlocks.push(...brandKindP3Body(sig.emitName, scale, 'light'))
    p3DarkBlocks.push(...brandKindP3Body(sig.emitName, scale, 'dark'))
  }

  return [
    `/* Signal scales — engine-generated from canonical hexes, shared across brands */`,
    `:root {`,
    // the system alpha variables every family's cta-border aliases (owner 2026-07-29) — this is
    // the engine's one global :root, the CSS counterpart of the Figma side's system/alpha/* rows.
    // Emitted in BOTH blocks because --alpha-cta-border is scheme-divergent (12% black in light,
    // 12% white in dark); --alpha-transparent repeats harmlessly and keeps the pair together.
    ...alphaRootVars('light'),
    ...lightBlocks,
    `}`,
    `${SIGNALS_DARK_SELECTOR} {`,
    ...alphaRootVars('dark'),
    ...darkBlocks,
    `}`,
    ...(p3LightBlocks.length || p3DarkBlocks.length ? [
      `${P3_SUPPORTS} {`,
      `${P3_MEDIA} {`,
      ...(p3LightBlocks.length ? [`:root {`, ...p3LightBlocks, `}`] : []),
      ...(p3DarkBlocks.length ? [`${SIGNALS_DARK_SELECTOR} {`, ...p3DarkBlocks, `}`] : []),
      `}`,
      `}`,
    ] : []),
  ].join('\n')
}

export function annotationNote(r: ResolvedBrand, opts?: { archetypeOverride?: string }): string {
  let note = ''
  if (r.shearDeg !== 0) note += ` · shear ${r.shearDeg > 0 ? '+' : ''}${r.shearDeg.toFixed(1)}°`
  if (opts?.archetypeOverride) note += ` · archetype override → ${opts.archetypeOverride}`
  if (r.redRepel) note += ` · conflict with red resolved — the action color exits the error register by its nearest edge`
  else if (r.signalOverrides.some(o => o.name === 'red')) note += ` · conflict with red resolved — the brand keeps its exact color and the error signal ships a per-brand variant`
  if (r.warningVariant === 'lemon') note += ` · yellow signal shifted to a cooler lemon`
  if (r.warningVariant === 'macaroni') note += ` · yellow signal kept standard amber (cool-yellow brand)`
  for (const o of r.signalOverrides.filter(o => o.name !== 'yellow')) note += ` · ${o.note}`
  if (r.pending.length) note += ` · overlaps ${r.pending.join(', ')} — softened treatment still in design`
  return note
}

// One brand's CSS: light + dark blocks with brand vars, on-fill, secondary
// vars (secondary ramp when given, else stubbed to brand), and per-brand
// signal overrides (always from the PRIMARY's resolution — signals react
// to the dominant brand color; a secondary's own signal conflicts are
// annotated upstream, not resolved, in v1).
export function brandCss(
  slug: string,
  displayName: string,
  r: ResolvedBrand,
  secondary?: GeneratedScale | null,
  noteSuffix = '',
  neutralLevel: NeutralLevel = 'default',
  // the per-brand neutral is generated here, so it needs the caller's profile (the brand/secondary
  // scales inside `r` were already resolved under it by resolveBrand)
  contrastProfile?: ContrastProfile,
  // the secondary's mode chip: 'outline' re-resolves the fill trio — cta transparent, cta-hover the
  // cta color at OUTLINE_HOVER_ALPHA (the tinted hover), on-cta ink-9, cta-border ALWAYS the
  // gated highlight-8. Same tokens, different resolution — no component changes needed.
  secondaryStyle?: SecondaryStyle,
  // the NEUTRAL CTA ESCAPE (Phase 3, owner 2026-07-16): the brand's cta FILL trio + on-cta
  // re-resolve from the brand-neutral's ink register (near-black light / near-white dark) —
  // the red-collision de-conflict. Same outline idiom; default off = byte-identical.
  ctaEscape?: boolean,
  // the SYSTEM LINK (Phase 4, owner 2026-07-16): one link trio per theme. Absent =
  // --link aliases the primary's cta-ink trio; a custom seed = its ink-register
  // resolution ships raw (the red de-conflict for links).
  linkHex?: string | null
): string {
  const { scale } = r
  // the escape RESETS the red collision to default (owner 2026-07-16): with the brand's
  // ctas swapped to the neutral register nothing collides with red, so the per-brand red
  // complement variant is dropped and canonical red ships. The annotation reflects the
  // escape instead of narrating a resolution that no longer applies.
  const effOverrides = ctaEscape ? r.signalOverrides.filter(o => o.name !== 'red') : r.signalOverrides
  const rEff: ResolvedBrand = ctaEscape ? { ...r, redRepel: null, signalOverrides: effOverrides } : r
  const note = annotationNote(rEff)
    + (ctaEscape ? ' · neutral cta escape active — the action colors ride the brand neutral; the red signal ships canonical' : '')
    + noteSuffix

  // Illustration palette (PoC 2026-06-11): FOUR fixed-L slots per color —
  // primary 1–4 from the brand, alt 1–4 from the secondary (falls back to
  // the brand's own slots when no secondary exists). Shapes in
  // illustration files are labeled by slot. Legacy semantic vars remap
  // onto fixed slots (primary = mid 3, soft = tint 2; alt-mono = deep 4 /
  // wash 1 so mono two-area files never collapse). Same values both
  // modes — emitted once in the light block, vars cascade.
  const illus = generateIllustrationScale(scale)
  const secondaryIllus = secondary ? generateIllustrationScale(secondary) : null
  const altStops = secondaryIllus ? secondaryIllus.stops : illus.stops
  const illusVars = [
    ...illus.stops.map(s => `  --illus-primary-${s.stop}: ${stopHex(s)};`),
    ...altStops.map(s => `  --illus-alt-${s.stop}: ${stopHex(s)};`),
    `  --illus-primary: var(--illus-primary-3);`,
    `  --illus-primary-soft: var(--illus-primary-2);`,
    // mono and two-color use the SAME slots (alt = deep 4, alt-soft =
    // tint 2) — the toggle switches color family only, never depth
    // (2026-06-11; soft moved wash→tint so it shows on the bg)
    `  --illus-alt-mono: var(--illus-primary-4);`,
    `  --illus-alt-soft-mono: var(--illus-primary-2);`,
    `  --illus-alt-2c: var(--illus-alt-4);`,
    `  --illus-alt-soft-2c: var(--illus-alt-2);`,
  ]

  // The neutral is now GENERATED per brand (tinted toward the brand hue), so it
  // rides inside this brand's block as a brand-kind ramp — no longer a shared
  // global :root block.
  const nScale = generateNeutralScale(scale.brandH, neutralLevel, contrastProfile)

  // When no secondary ramp is given, secondary mirrors brand var-for-var
  // (scale stops, off-scale cta, and the on-text token).
  const mirrorBody = (prefix: string, mode: 'light' | 'dark'): string[] => {
    const stops = mode === 'light' ? scale.light : scale.dark
    const alias = (name: string) => `  --${prefix}-${name}: var(--brand-${name});`
    return [
      ...stops.map(x => alias(stopTokenName(x.stop))),
      alias('cta'),
      alias('cta-hover'),
      alias('cta-pressed'),
      alias('cta-ink'),
      alias('cta-ink-hover'),
      alias('cta-ink-pressed'),
      alias('cta-border'),
      alias('on-cta'),
    ]
  }

  const secondaryLight = secondary ? brandKindBody('secondary', secondary, 'light') : mirrorBody('secondary', 'light')
  const secondaryDark = secondary ? brandKindBody('secondary', secondary, 'dark') : mirrorBody('secondary', 'dark')
  // identity — literal input hex, mode-invariant (light block only). Secondary
  // mirrors the brand's when no secondary ramp exists.
  const brandIdentity = `  --brand-identity: ${scale.identityHex};`
  const secondaryIdentity = secondary
    ? `  --secondary-identity: ${secondary.identityHex};`
    : `  --secondary-identity: var(--brand-identity);`

  // Universal scale anchors — the two off-scale ends that extend the paper→ink
  // ladder past its generated stops, flipping with the mode. paper-0 is now a
  // RESOLVED stop of the neutral ramp (white in light; one seam below paper-1
  // in dark — never absolute black). ink-11 (the anchor) stays the literal ink
  // extreme. Renumbered ink-12 → ink-11 with the 2026-07-29 collapse.
  // Emitted per mode block so each resolves to the right pole.
  const p0hex = (s: ColorStop | undefined, fallback: string) => (s ? stopHex(s) : fallback)
  const lightAnchors = [`  --paper-0: ${p0hex(nScale.paper0, '#ffffff')};`, `  --ink-11: #000000;`]
  const darkAnchors = [`  --paper-0: ${p0hex(nScale.paper0Dark, '#000000')};`, `  --ink-11: #ffffff;`]

  // outline re-resolution: emitted AFTER the secondary body so the cascade takes these values.
  // cta-hover = highlight-8 at OUTLINE_HOVER_ALPHA (pressed doubles it) — the STABLE contrast-gated stop, the same one
  // the ring aliases (owner: 9% of the generated subtle cta was imperceptible — it's a very
  // light/dark color; the hover must reference a stable value).
  // the SYSTEM LINK trio: default aliases the primary's cta-ink (mode-blind — the var
  // chain resolves per block); a custom seed ships its ink-register resolution raw
  const linkTrio = linkHex ? resolveLinkTrio(linkHex, contrastProfile) : null
  const link = (mode: 'light' | 'dark'): string[] => linkTrio
    ? (mode === 'light'
      ? [`  --link: ${stopHex(linkTrio.link)};`, `  --link-hover: ${stopHex(linkTrio.linkHover)};`, `  --link-pressed: ${stopHex(linkTrio.linkPressed)};`]
      : [`  --link: ${stopHex(linkTrio.linkDark)};`, `  --link-hover: ${stopHex(linkTrio.linkHoverDark)};`, `  --link-pressed: ${stopHex(linkTrio.linkPressedDark)};`])
    : [
      `  --link: var(--brand-cta-ink);`,
      `  --link-hover: var(--brand-cta-ink-hover);`,
      `  --link-pressed: var(--brand-cta-ink-pressed);`,
    ]
  // the custom trio's P3 renditions (review-caught 2026-07-16): the DEFAULT posture rides
  // the cta-ink vars' own P3 overrides through the alias chain, but a custom trio ships
  // raw hexes — without these lines an out-of-sRGB custom link renders visibly duller
  // than the same-register cta-ink text button beside it. --link is its own property, so
  // there is no cascade-pop hazard (the escape/outline drop classes don't apply).
  const linkP3 = (mode: 'light' | 'dark'): string[] => {
    if (!linkTrio) return []
    const trio = mode === 'light'
      ? [['link', linkTrio.link], ['link-hover', linkTrio.linkHover], ['link-pressed', linkTrio.linkPressed]] as const
      : [['link', linkTrio.linkDark], ['link-hover', linkTrio.linkHoverDark], ['link-pressed', linkTrio.linkPressedDark]] as const
    return trio.filter(([, s]) => p3Differs(s)).map(([n, s]) => `  --${n}: ${p3Value(s)};`)
  }

  // neutral cta escape re-resolution: emitted AFTER the brand body so the cascade takes
  // these values (the outline idiom). Fill trio + on-cta only — cta-ink and the ramp stay
  // the brand's own.
  const escape = (mode: 'light' | 'dark'): string[] => {
    if (!ctaEscape) return []
    const esc = escapeCtaFamily(nScale, mode, contrastProfile)
    // ALL the ctas (owner amendment 2026-07-16): the text-style cta trio de-reds with
    // the fills; --link's default alias follows through the cascade automatically
    return [
      `  --brand-cta: ${stopHex(esc.cta)};`,
      `  --brand-cta-hover: ${stopHex(esc.ctaHover)};`,
      `  --brand-cta-pressed: ${stopHex(esc.ctaPressed)};`,
      `  --brand-cta-ink: ${stopHex(esc.ctaInk)};`,
      `  --brand-cta-ink-hover: ${stopHex(esc.ctaInkHover)};`,
      `  --brand-cta-ink-pressed: ${stopHex(esc.ctaInkPressed)};`,
      `  --brand-on-cta: ${onColor(esc.onFillIsWhite)};`,
    ]
  }

  const outline = (mode: 'light' | 'dark'): string[] => {
    if (secondaryStyle !== 'outline' || !secondary) return []
    const s8 = (mode === 'light' ? secondary.light : secondary.dark).find(s => s.stop === 8)
    const c = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255)
    const s8e = s8 ? srgbEmitChannels(s8) : null
    // fill trio re-resolved; pressed = the hover tint at doubled alpha (pressed-doubles-hover).
    // cta-ink trio untouched — links keep the exact ramp's text-register values.
    return [
      `  --secondary-cta: transparent;`,
      ...(s8e ? [
        `  --secondary-cta-hover: rgba(${c(s8e.r)}, ${c(s8e.g)}, ${c(s8e.b)}, ${OUTLINE_HOVER_ALPHA});`,
        `  --secondary-cta-pressed: rgba(${c(s8e.r)}, ${c(s8e.g)}, ${c(s8e.b)}, ${OUTLINE_PRESSED_ALPHA});`,
      ] : []),
      `  --secondary-cta-border: var(--secondary-highlight-8);`,
      `  --secondary-on-cta: var(--secondary-ink-9);`,
    ]
  }

  // the P3 renditions, behind @supports — same cascade shape as the base blocks.
  // Under the OUTLINE chip the secondary cta fill trio is re-resolved (cta transparent, cta-hover the
  // rgba hover tint) and the P3 block sits LAST in the cascade — an out-of-sRGB secondary cta
  // (the vivid cyan corner) would pop its fill back in over `transparent` (owner-caught,
  // 2026-07-11). The cta-pair P3 overrides are dropped for outline; scale stops keep theirs.
  const dropOutlineCta = (lines: string[]): string[] =>
    secondaryStyle === 'outline'
      ? lines.filter(l => !l.startsWith('  --secondary-cta:') && !l.startsWith('  --secondary-cta-hover:') && !l.startsWith('  --secondary-cta-pressed:'))
      : lines
  // same P3-pop class for the ESCAPE (the owner-caught outline lesson, 2026-07-11): the
  // escaped fill trio ships the neutral's whisper chroma — an out-of-sRGB BRAND cta's P3
  // override sitting last in the cascade would pop the brand fill back in over it.
  const dropEscapeCta = (lines: string[]): string[] =>
    ctaEscape
      ? lines.filter(l => !/^  --brand-cta(-hover|-pressed|-ink|-ink-hover|-ink-pressed)?:/.test(l))
      : lines
  const p3Light = [
    ...dropEscapeCta(brandKindP3Body('brand', scale, 'light')),
    ...(secondary ? dropOutlineCta(brandKindP3Body('secondary', secondary, 'light')) : []),
    ...brandKindP3Body('neutral', nScale, 'light'),
    ...effOverrides.flatMap(o => brandKindP3Body(SIGNAL_EMIT_NAME[o.name], o.scale, 'light')),
    ...linkP3('light'),
  ]
  const p3Dark = [
    ...dropEscapeCta(brandKindP3Body('brand', scale, 'dark')),
    ...(secondary ? dropOutlineCta(brandKindP3Body('secondary', secondary, 'dark')) : []),
    ...brandKindP3Body('neutral', nScale, 'dark'),
    ...effOverrides.flatMap(o => brandKindP3Body(SIGNAL_EMIT_NAME[o.name], o.scale, 'dark')),
    ...linkP3('dark'),
  ]

  return [
    ``,
    `[data-brand="${slug}"] {`,
    ...lightAnchors,
    ...brandKindBody('brand', scale, 'light'),
    ...escape('light'),
    ...link('light'),
    brandIdentity,
    ...illusVars,
    ...secondaryLight,
    ...outline('light'),
    secondaryIdentity,
    ...brandKindBody('neutral', nScale, 'light'),
    ...effOverrides.flatMap(o => brandKindBody(SIGNAL_EMIT_NAME[o.name], o.scale, 'light')),
    `}`,
    `[data-brand="${slug}"][data-theme="dark"] {`,
    ...darkAnchors,
    ...brandKindBody('brand', scale, 'dark'),
    ...escape('dark'),
    ...link('dark'),
    ...secondaryDark,
    ...outline('dark'),
    ...brandKindBody('neutral', nScale, 'dark'),
    ...effOverrides.flatMap(o => brandKindBody(SIGNAL_EMIT_NAME[o.name], o.scale, 'dark')),
    `}`,
    ...(p3Light.length || p3Dark.length ? [
      `${P3_SUPPORTS} {`,
      `${P3_MEDIA} {`,
      ...(p3Light.length ? [`[data-brand="${slug}"] {`, ...p3Light, `}`] : []),
      ...(p3Dark.length ? [`[data-brand="${slug}"][data-theme="dark"] {`, ...p3Dark, `}`] : []),
      `}`,
      `}`,
    ] : []),
  ].join('\n')
}

