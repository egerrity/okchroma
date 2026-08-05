

import { generateIllustrationScale, generateNeutralScale, type GeneratedScale, type ColorStop, type NeutralLevel, type ContrastProfile } from './colorEngine'
import { srgbEmitChannels, masterEmitChannels } from './colorMath'
import { clampChromaToGamut, apcaY, apcaLc } from './constraints'
import { stopTokenName, tokenOrder } from './tokenNames'
import { signalScalesFor, OUTLINE_HOVER_ALPHA, OUTLINE_PRESSED_ALPHA, SOFT_ON_CTA_ALPHA, escapeCtaFamily, resolveLinkTrio, type ResolvedBrand, type SecondaryStyle } from './resolve'
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
// THE CTA-BORDER SAFETY (owner 2026-07-29, re-declared 2026-07-31). This supersedes the
// 2026-07-04 "filled is filled" removal of the conditional gate — not as a conformance
// requirement (her words: *"it's a safety … maybe I overstated it"*, and it makes no WCAG claim),
// but as a DECORATIVE stroke for buttons that would otherwise vibrate against the background
// instead of sitting on it.
//
// Layout never shifts — components already carry `border: 1.5px solid var(...-cta-border)`
// unconditionally against the transparent value, which is why that token stayed in the
// vocabulary through the 2026-07-04 removal.
//
// ── THE GATE, RE-DECLARED IN APCA (owner 2026-07-31) ─────────────────────────────────────────
// C39's trigger was `cta.L >= wash-5.L`, a family-relative lightness test, and it caught almost
// nothing: in shipped dist it fired 62 times and every one was the neutral — 0 primaries,
// 0 secondaries, 0 signals. The owner's ask was that more ctas earn the stroke, measured as a
// distance from the page rather than from the family's own ramp.
//
// APCA IS USED HERE AS A TASTE INSTRUMENT, NOT AN ACCESSIBILITY ONE — her ruling, verbatim:
// "This is NOT an accessibility measure, it is a taste measure. The buttons don't have a
// requirement to pass 3:1." She supplied the numbers as a BAND, not as rival thresholds:
// Lc 15 is APCA's floor for a non-text element to be discernible at all, Lc 30 its text minimum,
// which she set as the ceiling — "we aren't making something readable, we are adding a stylistic
// pop." So: a fill under Lc 15 against the page earns a stroke, and the stroke lands inside 15-30.
// This does not reopen the wcag lane; see the C39 entry and the wcag-only standing rule.
//
// THE REFERENCE IS THE PAGE, not the family's own paper: neutral paper-2 in light, paper-1 in
// dark (the demo's --surface-base, which swaps between modes). One ruler for every family.
// The light/dark branch C39 hand-wrote is GONE — |Lc| is absolute, so mirroring falls out.
export const CTA_BORDER_LC_FLOOR = 15
const CTA_BORDER_PAGE_STOP = { light: 2, dark: 1 } as const

// the page a family's cta is judged against. Exported because the audit gate and the round's
// instruments must measure the same plane the emitter does, not a re-derived one.
export function pageStopFor(neutral: GeneratedScale, mode: 'light' | 'dark'): ColorStop | undefined {
  const stops = mode === 'light' ? neutral.light : neutral.dark
  return stops.find(x => x.stop === CTA_BORDER_PAGE_STOP[mode])
}

// THE STROKE IS AN ALPHA, NOT A RAMP STOP (owner mark 2026-07-29, confirmed on her Figma
// screenshot of both frames): black in light, FLIPPED TO WHITE in dark. Two consequences worth
// naming, both good, and both still true of the ladder below:
//   · it is BRAND-INDEPENDENT, so each rung lives in the base collection as one system row and
//     costs ZERO per-brand overrides. Sourcing it from the family's ramp instead cost 88 — the
//     neutral is brand-hue-tinted, so its border differed per brand (measured).
//   · it cannot fight the fill's hue, which a same-family wash stop can.
//
// C39 asserted the alpha "does not scale up in dark the way the shadow set does … if dark ever
// needs more, it is this one constant." THAT CLAIM IS MEASURABLY WRONG and the 2026-07-31 round
// retired it: at the Lc 15 gate the neutral's dark stroke needs upwards of 32% to reach the band
// where light needs 8%. The ladder does not encode a dark scale-up anyway — the owner declined
// to fix the dark neutral, calling the rung that would (offset-24) too loud — but do not repeat
// the claim as if it were established.
//
// ── THE RUNG LADDER (owner 2026-07-31) ───────────────────────────────────────────────────────
// One rung per family, fixed by role. Picked off a four-way render of 06|08 secondary × 16|20
// primary: 06/16 held hierarchy in 36 of 36 cases with the secondary in band everywhere, while
// 04 bottomed out at Lc 15-16 ("too low") and 20 pushed the primary past the Lc 30 ceiling in
// half of them. Because 06/16 holds unconditionally there is NO conditional escalation — the
// pairing is the answer to "when do we bump the primary because the secondary is darker".
//
// WHY THE RUNGS ARE NOT EVENLY SPACED, and why a rung is not a loudness: the same alpha over
// different fills lands at a different Lc. offset-12 reads 26.0 over a pale blue secondary but
// only 19.2 over a pale green primary, so a ladder that looks ordered as numbers can still
// invert as pixels. These three were chosen on the RESULTING Lc, not on their spacing.
//
// THE NEUTRAL IS FIXED AT 08 AND IS NOT SOLVED (her ruling). Its cta sits under APCA's own
// black-level clamp against the page — |Lc| reads exactly 0.0 in both modes, meaning "below the
// reporting floor of Lc 7.3", i.e. genuinely indistinguishable. At 08 its stroke lands Lc 17.1
// in light (in band) and 8.7 in dark (under). She accepted the dark shortfall rather than raise
// it: the rung that would fix it, offset-24, she called too loud.
export const OFFSET_ALPHAS = { 6: 0.06, 8: 0.08, 16: 0.16 } as const
export type OffsetRung = keyof typeof OFFSET_ALPHAS
export const ctaBorderRung = (prefix: string): OffsetRung =>
  prefix === 'neutral' ? 8 : prefix === 'secondary' ? 6 : 16
export const offsetVarName = (rung: OffsetRung) => `--alpha-offset-${String(rung).padStart(2, '0')}`
export const offsetTokenPath = (rung: OffsetRung) => `system/alpha/offset-${String(rung).padStart(2, '0')}`

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
export const offsetRgba = (rung: OffsetRung, mode: 'light' | 'dark'): string =>
  mode === 'light' ? `rgba(0, 0, 0, ${OFFSET_ALPHAS[rung]})` : `rgba(255, 255, 255, ${OFFSET_ALPHAS[rung]})`
export const alphaRootVars = (mode: 'light' | 'dark'): string[] => [
  `  ${TRANSPARENT_VAR}: transparent;`,
  ...(Object.keys(OFFSET_ALPHAS) as unknown as OffsetRung[])
    .map(Number).sort((a, b) => a - b)
    .map(r => `  ${offsetVarName(r as OffsetRung)}: ${offsetRgba(r as OffsetRung, mode)};`),
]

// |Lc| of the cta against the page. apcaLc is SIGNED and order-sensitive — it branches on which
// side is lighter with different exponents — so every caller in this engine takes the magnitude,
// and discernibility is a magnitude question. ColorStop.r/g/b are already the master basis's own
// gamma-encoded components, which is exactly what apcaY consumes; nothing to convert.
export function ctaPageLc(s: GeneratedScale, mode: 'light' | 'dark', page: ColorStop): number {
  const cta = mode === 'light' ? s.cta : s.ctaDark
  return Math.abs(apcaLc(apcaY(cta.r, cta.g, cta.b), apcaY(page.r, page.g, page.b)))
}

// A cta earns the stroke when it cannot separate itself from the page. Absent a page (no neutral
// in scope) nothing fires — the same conservative default the missing-anchor case had.
export function ctaNeedsBorder(s: GeneratedScale, mode: 'light' | 'dark', page: ColorStop | undefined): boolean {
  if (!page) return false
  return ctaPageLc(s, mode, page) < CTA_BORDER_LC_FLOOR
}

export function brandKindBody(prefix: string, s: GeneratedScale, mode: 'light' | 'dark', page: ColorStop | undefined): string[] {
  const stops = mode === 'light' ? s.light : s.dark
  const f = ctaFamilyOf(s, mode)
  const onCta = mode === 'light' ? s.onFillTextIsWhite : s.onFillTextIsWhiteDark
  // cta-border: the gated stroke at THIS family's rung, else the transparent variable. The
  // OUTLINE secondary keeps its own unconditional highlight-8 override at the emitter — there the
  // border is the button's identity, not a safety. Renamed from cta-stroke (owner 2026-07-09);
  // the Figma side renamed with it — plugins migrate existing variables in place.
  // cta family SEMANTIC-named (owner ruling 2026-07-16): cta/cta-hover/cta-pressed +
  // the cta-ink trio (the 4.5 text-register link escape; stops 9/10/11 as states — C49).
  const border = ctaNeedsBorder(s, mode, page)
  return [
    stopsToVars(stops, prefix),
    `  --${prefix}-cta: ${stopHex(f.cta)};`,
    `  --${prefix}-cta-hover: ${stopHex(f.ctaHover)};`,
    `  --${prefix}-cta-pressed: ${stopHex(f.ctaPressed)};`,
    // the CTA-INK trio: pure references onto the ink band (C49 — the trio IS stops
    // 9/10/11 read as states; hover was the last raw between value). The cta-border
    // var() idiom, so P3 overrides of the referenced stops ride along for free; the
    // ESCAPE and custom-link postures still override these raw, after this body.
    `  --${prefix}-cta-ink: var(--${prefix}-ink-9);`,
    `  --${prefix}-cta-ink-hover: var(--${prefix}-ink-10);`,
    `  --${prefix}-cta-ink-pressed: var(--${prefix}-ink-11);`,
    // the STRONG text-cta (neutral only, owner 2026-08-04): the mirror trio over the
    // same three stops cta-ink ascends (11 → 10 → 9); hover shares the between stop
    // through the cta-ink chain
    ...(prefix === 'neutral' ? [
      `  --neutral-cta-ink-strong: var(--neutral-ink-11);`,
      `  --neutral-cta-ink-strong-hover: var(--neutral-cta-ink-hover);`,
      `  --neutral-cta-ink-strong-pressed: var(--neutral-ink-9);`,
    ] : []),
    `  --${prefix}-cta-border: var(${border ? offsetVarName(ctaBorderRung(prefix)) : TRANSPARENT_VAR});`,
    // the SOFT on-cta (owner 2026-08-04: "neutral cta on's should also be the alpha"): the
    // neutral's cta is the scale-fed WASH-level fill, the system's other quiet cta, so its
    // button text takes the pole AT ALPHA like the default-model secondary's — composited
    // over whatever state the fill is in, so hover/pressed carry their own legibility. Same
    // register both families (SOFT_ON_CTA_ALPHA), so both alias the ONE system/alpha/ink
    // primitive. Emitted HERE rather than as a post-body override because the neutral's is
    // unconditional — the secondary's rides the cascade only because it gates on the style
    // chip. Loud fills (brand, signals, the cta escape) keep the solid pole.
    prefix === 'neutral'
      ? `  --neutral-on-cta: rgba(${onCta ? '255, 255, 255' : '0, 0, 0'}, ${SOFT_ON_CTA_ALPHA[mode]});`
      : `  --${prefix}-on-cta: ${onColor(onCta)};`,
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
  // fill trio only: the cta-ink trio is var() references onto the ink stops (C49), so the
  // stops' own P3 overrides above carry it — a raw override here would just shadow the chain
  for (const [name, st] of [['cta', f.cta], ['cta-hover', f.ctaHover], ['cta-pressed', f.ctaPressed]] as const)
    if (p3Differs(st)) out.push(`  --${prefix}-${name}: ${p3Value(st)};`)
  return out
}

// The neutral as its own light+dark block under `selector` — the demo's
// brandless contexts (the app chrome :root, where there is no [data-brand]
// theme to carry a per-brand neutral) reuse this. The product emits the
// neutral inline per brand (see brandCss); this is the same brand-kind body,
// just scoped to an arbitrary selector.
export function neutralCss(selector: string, brandH: number, level: NeutralLevel = 'default', contrastProfile?: ContrastProfile, ctaBorder = true): string {
  const s = generateNeutralScale(brandH, level, contrastProfile)
  const nPage = (mode: 'light' | 'dark') => ctaBorder ? pageStopFor(s, mode) : undefined
  // The universal paper-0/ink-12 anchors ride along: any scope that carries the
  // ladder must also carry its mode-flipping extremes (semantic aliases like
  // --surface-pop resolve through them). paper-0 = the neutral's resolved
  // stop 0 (white in light; one seam below paper-1 in dark, never absolute black).
  const p0 = (st: ColorStop | undefined, fallback: string) => (st ? stopHex(st) : fallback)
  const p3Light = brandKindP3Body('neutral', s, 'light')
  const p3Dark = brandKindP3Body('neutral', s, 'dark')
  return [
    `${selector} {`,
    `  --paper-0: ${p0(s.paper0, '#ffffff')};`,
    `  --ink-12: #000000;`,
    // the neutral IS the page, so it is judged against its own paper stop
    ...brandKindBody('neutral', s, 'light', nPage('light')),
    `}`,
    `${selector}[data-theme="dark"] {`,
    `  --paper-0: ${p0(s.paper0Dark, '#000000')};`,
    `  --ink-12: #ffffff;`,
    ...brandKindBody('neutral', s, 'dark', nPage('dark')),
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
  // THE ONE PLACE WITH NO BRAND IN SCOPE. signals.css is a single shared file across every brand,
  // so a per-brand neutral is unreachable here — but the neutral's L scaffold is brand-independent
  // and only its chroma tints, so a canonical plane is faithful. Measured over 12 brand hues the
  // spread of each signal's |Lc| against its own brand's page is 0.76 in light and 0.08 in dark,
  // far under the gate's resolution, so this cannot diverge from the Figma side (where
  // themeToFigma does have the brand's neutral). Moot in practice — no signal reaches Lc 15 in
  // either mode, the nearest being warning-light at 19.4 — but the branch needs a defined plane.
  const canonicalNeutral = generateNeutralScale(0, 'default', contrastProfile)
  const sigPage = { light: pageStopFor(canonicalNeutral, 'light'), dark: pageStopFor(canonicalNeutral, 'dark') }
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
    lightBlocks.push(...brandKindBody(sig.emitName, scale, 'light', sigPage.light))
    darkBlocks.push(...brandKindBody(sig.emitName, scale, 'dark', sigPage.dark))
    p3LightBlocks.push(...brandKindP3Body(sig.emitName, scale, 'light'))
    p3DarkBlocks.push(...brandKindP3Body(sig.emitName, scale, 'dark'))
  }

  return [
    `/* Signal scales — engine-generated from canonical hexes, shared across brands */`,
    `:root {`,
    // the system alpha variables every family's cta-border aliases (owner 2026-07-29) — this is
    // the engine's one global :root, the CSS counterpart of the Figma side's system/alpha/* rows.
    // Emitted in BOTH blocks because the offset rungs are scheme-DIVERGENT (black in light,
    // white in dark); --alpha-transparent repeats harmlessly and keeps the set together.
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
  linkHex?: string | null,
  // THE CTA-BORDER OPT-OUT (owner 2026-07-31: "this should be on by default but optional").
  // DEFAULT ON, so an absent flag — every stored recipe predating it — keeps the stroke.
  // Off is expressed by withholding the PAGE rather than by a second branch in the gate:
  // ctaNeedsBorder already returns false without a page, so there is exactly one place that
  // decides, and "no ruler" and "don't measure" are the same code path.
  ctaBorder = true,
  // the neutral's RESOLVED tint hue (owner 2026-08-04, the source round): callers resolve
  // Match-secondary/Custom via colorEngine.neutralTintHue and pass the hue; absent = the
  // primary's — every pre-source caller is byte-identical (the emitter stays dumb, like
  // figmaRender's ThemeInput.neutralH).
  neutralH?: number
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
  const nScale = generateNeutralScale(neutralH ?? scale.brandH, neutralLevel, contrastProfile)
  // the page every family in this brand is judged against for the cta-border gate — this brand's
  // own neutral, since the neutral is generated per brand hue. Withheld entirely when the opt-out
  // is off, which is what turns the whole feature off (see the ctaBorder param).
  const page = ctaBorder
    ? { light: pageStopFor(nScale, 'light'), dark: pageStopFor(nScale, 'dark') }
    : { light: undefined, dark: undefined }

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

  const secondaryLight = secondary ? brandKindBody('secondary', secondary, 'light', page.light) : mirrorBody('secondary', 'light')
  const secondaryDark = secondary ? brandKindBody('secondary', secondary, 'dark', page.dark) : mirrorBody('secondary', 'dark')
  // identity — literal input hex, mode-invariant (light block only). Secondary
  // mirrors the brand's when no secondary ramp exists.
  const brandIdentity = `  --brand-identity: ${scale.identityHex};`
  const secondaryIdentity = secondary
    ? `  --secondary-identity: ${secondary.identityHex};`
    : `  --secondary-identity: var(--brand-identity);`

  // Universal scale anchors — the two off-scale ends that extend the paper→ink
  // ladder past its generated stops, flipping with the mode. paper-0 is now a
  // RESOLVED stop of the neutral ramp (white in light; one seam below paper-1
  // in dark — never absolute black). ink-12 (the anchor) stays the literal ink
  // extreme — its pre-collapse number, restored by C49 (it spent 2026-07-29 →
  // 2026-08-05 as ink-11). Emitted per mode block so each resolves to the right pole.
  const p0hex = (s: ColorStop | undefined, fallback: string) => (s ? stopHex(s) : fallback)
  const lightAnchors = [`  --paper-0: ${p0hex(nScale.paper0, '#ffffff')};`, `  --ink-12: #000000;`]
  const darkAnchors = [`  --paper-0: ${p0hex(nScale.paper0Dark, '#000000')};`, `  --ink-12: #ffffff;`]

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

  // the SOFT on-cta (default-model secondaries only — derived and custom share the tint
  // register): the on-text pole at SOFT_ON_CTA_ALPHA, composited by the renderer over
  // the fill's current state so hover/pressed carry their own legibility. Emitted AFTER the
  // secondary body so the cascade takes it (the outline idiom). Exact keeps the solid pole.
  const softOnCta = (mode: 'light' | 'dark'): string[] => {
    if (!secondary || secondaryStyle !== 'default') return []
    const white = mode === 'light' ? secondary.onFillTextIsWhite : secondary.onFillTextIsWhiteDark
    return [`  --secondary-on-cta: rgba(${white ? '255, 255, 255' : '0, 0, 0'}, ${SOFT_ON_CTA_ALPHA[mode]});`]
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
    ...brandKindBody('brand', scale, 'light', page.light),
    ...escape('light'),
    ...link('light'),
    brandIdentity,
    ...illusVars,
    ...secondaryLight,
    ...softOnCta('light'),
    ...outline('light'),
    secondaryIdentity,
    ...brandKindBody('neutral', nScale, 'light', page.light),
    ...effOverrides.flatMap(o => brandKindBody(SIGNAL_EMIT_NAME[o.name], o.scale, 'light', page.light)),
    `}`,
    `[data-brand="${slug}"][data-theme="dark"] {`,
    ...darkAnchors,
    ...brandKindBody('brand', scale, 'dark', page.dark),
    ...escape('dark'),
    ...link('dark'),
    ...secondaryDark,
    ...softOnCta('dark'),
    ...outline('dark'),
    ...brandKindBody('neutral', nScale, 'dark', page.dark),
    ...effOverrides.flatMap(o => brandKindBody(SIGNAL_EMIT_NAME[o.name], o.scale, 'dark', page.dark)),
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

