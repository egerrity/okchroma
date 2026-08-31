// Per-variable Figma description text — the STAMP's replacement (owner 2026-08-05).
//
// WHY TERSE: Figma's picker fuzzy search matches variable DESCRIPTIONS as well as names.
// The old one-size stamp carried the ratio digits ("3:1/4.5/7:1"), so any query containing
// one of those digits "matched" every row and the flood buried the real name hit. Every
// extra word is another string a query can land on (owner: "mega utilitarian").
//
// FORMAT (owner 2026-08-05):
//   title        the row's own spaced name — the one place its own digit may appear; the
//                literal spaced string is what makes a "wash 4" query land
//   Req for:      the requirement the stop was DESIGNED to satisfy — documented roles only,
//                 never editorial ("not what the variable COULD be for")
//   (conformance) an UNLABELED line, only where a floor exists — one of the owner's
//                 phrases verbatim, never ratios. The old "Contrast:" label was dropped
//                 (owner 2026-08-28): its own letters flooded "on" searches (cONtrast)
//   Theming:      strictly how the theme moves the value; the LINE IS DROPPED when the
//                 theme never moves it. Tint rows say "tints carry <family> hue".
//   (collision)   an unlabeled trailing line, only on rows that can shift to de-conflict
//                 with the brand ("Collisions:" dropped with the other label, same flood)
// Never mention light/dark modes anywhere.
//
// IMPORT-SAFE BY CONSTRUCTION: zero imports, pure text + string assembly, so both plugin
// sandboxes (plugin/code.ts, plugin-ext/code.ts) can import it without dragging the engine
// into their bundles. Enforced by scripts/desc-audit.ts, alongside the digit rule above.

// The owner's conformance phrases — the only way contrast is ever stated.
const AA_LARGE = 'AA large text and UI elements'
const AA_BODY = 'AA standard body text & Level AAA large text'
const AAA_BODY = 'AAA standard body text'

// ── THE FAMILY ROSTER — the one definition of the family path words. Every other
// roster site imports it (plugin-ext/payload.ts prefixes, scripts/ext-override-audit.ts
// ladder list, plugin-unify/mapping.ts targets), so a family rename edits this table's
// VALUES only; the camelCase keys are internal identities and are never rendered. The
// roster lives here and not in tokenNames.ts because this file must stay import-free
// (both plugin sandboxes bundle it; desc-audit enforces the leaf).
export const FAMILY = {
  neutral: 'neutral',
  brandPrimary: 'brand',
  brandSecondary: 'brand-alt',
  critical: 'critical',
  warning: 'warning',
  positive: 'positive',
  info: 'info',
} as const
export type Family = (typeof FAMILY)[keyof typeof FAMILY]
export const FAMILIES: readonly Family[] = Object.values(FAMILY)
const SIGNALS: readonly Family[] = [FAMILY.critical, FAMILY.warning, FAMILY.positive, FAMILY.info]

// ── the CSS grammar's words for the same identities: the shipped --<word>-…
// variable-name prefixes. cssRender's emit sites AND its border-rung rule ride this
// table, as do figmaRender's rung keys — so the two emitters cannot disagree on a
// prefix. The signal families' CSS prefixes are their role names, single-sourced as
// emit names in the signals module, not here. Differs from the Figma path words
// only on the brands.
export const CSS_FAMILY = {
  neutral: FAMILY.neutral,
  brandPrimary: 'brand',
  brandSecondary: 'brand-alt',
} as const

// The per-family half of a scale row's Theming line (owner's language).
// the parenthetical color words (owner 2026-08-18): the picker search matches
// descriptions, and a designer types the COLOR, not the role — "red" should land on
// the critical family. Legal under the foreign-label rule: the role round removed
// every identity word from the paths, so none of these is a token label. white/black
// are deliberately absent — the absolutes answer those searches by NAME, and any
// other row saying them would lie across modes (ink-0, the poles) or advertise an
// on-text choice the on rows must never make.
const TINT: Record<Family, string> = {
  [FAMILY.neutral]: 'tints carry neutral hue (gray)',
  [FAMILY.brandPrimary]: 'tints carry brand hue',
  [FAMILY.brandSecondary]: 'tints carry brand-alt hue',
  [FAMILY.critical]: 'tints carry critical hue (red)',
  [FAMILY.warning]: 'tints carry warning hue (yellow)',
  [FAMILY.positive]: 'tints carry positive hue (green)',
  [FAMILY.info]: 'tints carry info hue (blue)',
}

// the same color words for the STAMP rows (owner 2026-08-18 follow-up: the solid
// bodies are shared across families, so the TINT line never reaches them) — appended
// to their theming lines as a family marker. Empty for the brands.
const COLOR_WORD: Record<Family, string> = {
  [FAMILY.neutral]: ' (gray)', [FAMILY.brandPrimary]: '', [FAMILY.brandSecondary]: '',
  [FAMILY.critical]: ' (red)', [FAMILY.warning]: ' (yellow)', [FAMILY.positive]: ' (green)', [FAMILY.info]: ' (blue)',
}

const COLLIDES = 'shifts to avoid similar colors'

interface Body {
  req: string
  contrast?: string
  theming?: string | ((fam: Family) => string)
  collides?: boolean // signal families add the Collisions line
}

// ── the shared family scale — per-STOP text, the title line carries the family,
// TINT carries the per-family theming half
const PAPER: Body = { req: 'backgrounds, inverted text', theming: f => TINT[f], collides: true }
// "decorative borders", not "edges": a token label word in a foreign row's body floods that
// word's search results (the whole reason the shared stamp broke search). A row may carry a
// label word only when it is in its OWN path. The 2026-08-18 solid rename flipped this
// word: edge became the label (stamp/edge) and border stopped being one.
// ("interaction" → interactive 2026-08-28: interacti-ON fed the "on" flood)
const WASH: Body = { req: 'subtle interactive states, decorative borders, illos, signal hierarchy', theming: f => TINT[f], collides: true }
const solved = (f: Family) => `${TINT[f]}; re-solved to clear its floor`
// (Leaf keys are FLAT — band flattening 2026-08-12: paper-99, never paper/99 — except
// the stamp/ state group, keyed by its nested spelling.)
// the overlay rows (owner round 2026-08-13) are PARKED (owner 2026-08-18) — not
// emitted, so these bodies are dormant; kept for the comeback. Translucent twins of
// the papers, solved so the reading holds on the neutral papers; anywhere else the
// backdrop decides — stated because it is the token's conformance boundary
const OVERLAY: Body = {
  req: 'translucent backgrounds that hold their reading on any paper',
  theming: f => `${TINT[f]}; opacity solved against the papers, other backdrops show through unguaranteed`,
  collides: true,
}
const SCALE: Record<string, Body> = {
  'paper-99': PAPER,
  'paper-99-overlay': OVERLAY,
  'paper-97': PAPER,
  'paper-97-overlay': OVERLAY,
  'paper-95': { req: 'backgrounds, inverted text', theming: f => `${TINT[f]}. Worst background text stops must clear.`, collides: true },
  'paper-95-overlay': OVERLAY,
  'wash-92': WASH,
  'wash-89': WASH,
  'wash-85': WASH,
  'wash-80': WASH,
  // ("icons" KEPT through the 2026-08-28 on-flood strip (owner): an "icon" query
  // landing on the wax rows is worth its ic-ON-s noise — the one surviving body carrier)
  'wax-74': { req: 'focus rings, icons, large text', contrast: AA_LARGE, theming: solved, collides: true },
  'lead-53': { req: 'regular text, inverted backgrounds', contrast: AA_BODY, theming: solved, collides: true },
  'ink-42': { req: 'regular text, inverted backgrounds', contrast: AA_BODY, theming: solved, collides: true },
  // ("high-emphasis" reworded 2026-08-12: the surface planes took low/high as label
  // words, and a body carrying either floods that token's picker search — the C50 law;
  // "strong-emphasis" reworded 2026-08-28: str-ON-g fed the "on" flood)
  'ink-30': { req: 'heavy-emphasis text, inverted backgrounds', contrast: AAA_BODY, theming: solved, collides: true },
  // the stamp family (cta words → solid 2026-08-18, solid → stamp 2026-08-27). "CTA" stays in
  // these bodies on purpose: it stopped being a token label, so it floods nothing,
  // and a designer's "cta" query still lands on these rows.
  'stamp/fill': { req: 'CTAs', theming: f => `fully re-solved per theme and family${COLOR_WORD[f]}` },
  'stamp/fill-hover': { req: 'CTA pointer-over state', theming: f => `follows its rest fill${COLOR_WORD[f]}` },
  'stamp/fill-pressed': { req: 'CTA pressed state', theming: f => `follows its rest fill${COLOR_WORD[f]}` },
  'stamp/edge': { req: 'min APCA visibility', theming: f => `draws for CTAs that sit close to the page; strength per family tier${COLOR_WORD[f]}` },
  // ("fill" reworded out 2026-08-18: fill became a label word and is foreign here)
  'stamp/on': { req: 'text over the CTA color', contrast: `${AA_BODY} over its CTA`, theming: f => `whichever pole passes; quiet CTAs take the soft pole${COLOR_WORD[f]}` },
}

// ── rows only the neutral carries ────────────────────────────────────────────
const NEUTRAL_ONLY: Record<string, Body> = {
  'paper-100': { req: 'backgrounds, inverted text', theming: f => TINT[f] },
  // the literal pole again (owner 2026-08-31, walking back the 2026-08-28 resolver):
  // a pole carries no tint, so no theming line (see the TINT comment's ink-0 clause)
  'ink-0': { req: 'max-emphasis text', contrast: AAA_BODY },
}

// ── system rows, keyed by full path ──────────────────────────────────────────
// (ABS + OFFSET reworded 2026-08-28 for the "on" flood: "max contrast on" carried
// both cONtrast and a bare on; "buttons" carried butt-ON-s)
const ABS: Body = { req: 'extreme poles for CTAs, aliased global endpoints' }
const OFFSET: Body = { req: 'min APCA visibility', theming: 'offsets CTAs in themes where they sit close to the page' }
// (wording bound by desc-audit: no label words — wash/edge/hover/pressed are path
// vocabulary — and no scheme talk; "over inverted backgrounds" is the established
// phrasing, "state layers" carries the intent without a banned word)
const OFFSET_INVERSE: Body = { req: 'state layers over inverted backgrounds', theming: 'the offset ladder with its pole flipped, so inverted grounds keep the same rungs' }
const SHADOW: Body = { req: 'drop shadows' }
const PLANE = (req: string): Body => ({ req, theming: 'aliased to the gray ramp' })
// ("text action" reworded 2026-08-28: acti-ON fed the "on" flood; "link" is legal
// here — it is these rows' OWN path word)
const LINK = (state: string, contrast: string): Body => ({
  req: 'links' + state,
  contrast,
  theming: 'rides the theme’s link color; custom seed re-solves; overridable per theme',
})
// ("ink" stays out of these bodies — it is a label word elsewhere and would flood
// that search; "inverted backgrounds" is the established phrasing for the surface)
const LINK_INVERSE = (state: string, contrast: string): Body => ({
  req: 'links over inverted backgrounds' + state,
  contrast,
  theming: 'same seed as the link, re-solved for inverted backgrounds; overridable per theme',
})

const SYSTEM: Record<string, Body> = {
  'system/abs-black': ABS,
  'system/abs-white': ABS,
  // (the community system/ink-0 row RETIRED 2026-08-28 with its STATIC_UTILS entry:
  // the anchor is engine-resolved and rides the neutral in BOTH plugins now —
  // NEUTRAL_ONLY above. Old files' static rows orphan unwritten.)

  'system/abs-primary': { req: 'identity seed reference', theming: 'the theme’s own input, as given' },
  // ("companion" reworded 2026-08-28: compani-ON fed the "on" flood)
  'system/abs-alt': { req: 'identity seed reference', theming: 'the theme’s paired input, as given' },
  'system/alpha/transparent': { req: 'aliased off-states' },
  // ("dimming" reworded 2026-08-18: the surface planes took dim as a label word)
  'system/alpha/abs-black-060': { req: 'veils the page behind modals' },
  // ("fills" reworded 2026-08-18: fill became a label word and is foreign here;
  // "on-color" reworded 2026-08-28: the bare on fed the "on" flood)
  'system/alpha/ink': { req: 'soft text pole for quiet CTAs' },
  'system/alpha/away-from-bg/06': OFFSET,
  'system/alpha/away-from-bg/08': OFFSET,
  'system/alpha/away-from-bg/16': OFFSET,
  // the inverse ladder: the offset rungs with the pole flipped per mode, for
  // washes and edges over inverted backgrounds ("interaction" avoided in the
  // bodies: acti-ON would feed the "on" flood)
  'system/alpha/toward-bg/06': OFFSET_INVERSE,
  'system/alpha/toward-bg/08': OFFSET_INVERSE,
  'system/alpha/toward-bg/16': OFFSET_INVERSE,
  'system/alpha/shadow-04': SHADOW,
  'system/alpha/shadow-08': SHADOW,
  'system/alpha/shadow-12': SHADOW,
  // ("elevation" dropped 2026-08-28: elevati-ON fed the "on" flood; the sibling
  // planes never carried the word)
  'system/surface/dim': PLANE('recessed plane'),
  'system/surface/low': PLANE('resting page plane'),
  'system/surface/mid': PLANE('raised plane — cards, menus'),
  // ("overlays" reworded 2026-08-13: paper-overlay took the word as a label — the C50 law)
  'system/surface/high': PLANE('topmost plane — modals, dialogs'),
  'system/link/default/enabled': LINK('', AA_BODY),
  'system/link/default/hover': LINK(' pointer-over', AA_BODY),
  'system/link/default/pressed': LINK(' pressed', AAA_BODY),
  'system/link/inverse/enabled': LINK_INVERSE('', AA_BODY),
  'system/link/inverse/hover': LINK_INVERSE(' pointer-over', AA_BODY),
  'system/link/inverse/pressed': LINK_INVERSE(' pressed', AAA_BODY),
}

// Both plugins' user-facing path shapes: the ext base uses brand/…, the community
// theme collection uses brand/primary/… — same rows, same text.
const PREFIXES: Array<[string, Family]> = [
  // community spellings FIRST: the 2026-08-21 family rename made the ext word a
  // PREFIX of the community shapes ('brand/' would shadow 'brand/primary/' and
  // 'brand/alt/'), so most-specific must be tried before the family words
  ['brand/primary/', FAMILY.brandPrimary],
  ['brand/alt/', FAMILY.brandSecondary],
  ...FAMILIES.map((f): [string, Family] => [f + '/', f]),
]

// CANONICALIZE: the ext plugin's paths carry OWNERSHIP-ZONE prefixes (owner ruling
// 2026-08-18: base/ = engine-owned, utility/ = team-touchable — plugin-ext/payload.ts
// registerPath) that this module must never see — a zone is a Figma-panel organizing
// axis, not part of a row's identity, and letting zone words into a description would
// flood Figma's picker search exactly like the old ratio-digit stamp did (see the file
// header). Zone paths map onto the community spellings this module keys on (the same
// one-body-two-shapes idea PREFIXES already implements for the families). The retired
// primitive/ register strip stays for rows described mid-migration. The community
// plugin's paths (plugin/code.ts) carry no zone, so this is a no-op for them.
const ZONE_MAP: Array<[string, string]> = [
  ['base/absolute/black', 'system/abs-black'],
  ['base/absolute/white', 'system/abs-white'],
  // brand-alt BEFORE brand: canonicalize is first-match startsWith, and brand is a
  // prefix of brand-alt (the primary/alt pair never collided this way)
  ['base/absolute/brand-alt', 'system/abs-alt'],
  ['base/absolute/brand', 'system/abs-primary'],
  ['base/link/', 'system/link/'],
  ['base/alpha/', 'system/alpha/'],
  ['utility/surface/', 'system/surface/'],
  ['utility/shadow-', 'system/alpha/shadow-'],
  ['utility/abs-black-060', 'system/alpha/abs-black-060'],
  ['base/', ''],
  ['primitive/', ''],
]
export function canonicalize(path: string): string {
  for (const [prefix, home] of ZONE_MAP)
    if (path.startsWith(prefix)) return home + path.slice(prefix.length)
  return path
}

function bodyFor(path: string): { body: Body; fam: Family } | undefined {
  const canonical = canonicalize(path)
  if (SYSTEM[canonical]) return { body: SYSTEM[canonical], fam: FAMILY.neutral }
  const hit = PREFIXES.find(([p]) => canonical.startsWith(p))
  if (!hit) return undefined
  const [prefix, fam] = hit
  const leaf = canonical.slice(prefix.length)
  const body = (fam === FAMILY.neutral && NEUTRAL_ONLY[leaf]) || SCALE[leaf]
  return body ? { body, fam } : undefined
}

// The full description for a variable path. Title comes from the CANONICAL path — a
// register word must never enter it (the search-flood rule above); unknown paths get
// the canonical title alone.
export function describeToken(path: string): string {
  const canonical = canonicalize(path)
  const title = canonical.replace(/[/-]/g, ' ')
  const hit = bodyFor(canonical)
  if (!hit) return title
  const { body, fam } = hit
  const lines = [title, `Req for: ${body.req}`]
  if (body.contrast) lines.push(body.contrast)
  if (body.theming) lines.push(`Theming: ${typeof body.theming === 'function' ? body.theming(fam) : body.theming}`)
  if (body.collides && SIGNALS.includes(fam)) lines.push(COLLIDES)
  return lines.join('\n')
}
