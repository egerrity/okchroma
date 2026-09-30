// Per-row description text, in two renderings from one table of bodies:
//   describeToken     the Figma variable description both plugins write: terse, shaped by
//                     the picker's search (below)
//   describeDocument  the $description of every token in the DTCG documents, for agents
//                     and engineers: the same body lines plus the ground each claim holds
//                     against (GUARANTEE_SCOPE) and a usage line where a token is misused
//                     in the wild. No picker searches a JSON file, so the search rules do
//                     not bind it.
//
// WHY THE FIGMA RENDERING IS TERSE: Figma's picker fuzzy search matches variable
// descriptions as well as names. A description carrying ratio digits makes any query with
// one of those digits match every row, and the flood buries the real name hit. Every
// extra word is another string a query can land on.
//
// FORMAT:
//   title        the row's own spaced name, the one place its own digit may appear; the
//                literal spaced string is what makes a "chalk 8" query land
//   Req for:     the requirement the stop is designed to satisfy, documented roles only,
//                never what the variable could be for
//   (conformance) an unlabeled line, only where a floor exists: one of the two conformance
//                phrases verbatim, never a ratio. Unlabeled because a label's own letters
//                flood searches ("contrast" carries "on")
//   Theming:     strictly how the theme moves the value; the line is dropped when the
//                theme never moves it. Tint rows say "tints carry <family> hue".
//   (collision)  an unlabeled trailing line, only on rows that can shift to de-conflict
//                with the brand
// Never mention light or dark modes anywhere. No foreign token label word in a body: a
// label word is allowed only when it is in the row's own path (desc-audit enforces it).
//
// IMPORT-SAFE BY CONSTRUCTION: zero imports, pure text and string assembly, so both plugin
// sandboxes (plugin/code.ts, plugin-ext/code.ts) can import it without dragging the engine
// into their bundles. Enforced by scripts/desc-audit.ts, alongside the digit rule above.

// The conformance phrases, the only way contrast is ever stated. Text stops promise the
// AA body-text level and nothing above it: no AAA claim, no house ratio.
export const AA_LARGE = 'AA large text and UI elements'
export const AA_BODY = 'AA standard body text'

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

// The per-family half of a scale row's Theming line. The parenthetical color words are
// there because the picker search matches descriptions and a designer types the color,
// not the role: "red" should land on the critical family. Legal under the foreign-label
// rule: no path carries an identity word, so none of these is a token label. White and
// black are deliberately absent: a row saying them would lie across modes (the poles) or
// advertise an on-text choice the on rows must never make.
const TINT: Record<Family, string> = {
  [FAMILY.neutral]: 'tints carry neutral hue (gray)',
  [FAMILY.brandPrimary]: 'tints carry brand hue',
  [FAMILY.brandSecondary]: 'tints carry brand-alt hue',
  [FAMILY.critical]: 'tints carry critical hue (red)',
  [FAMILY.warning]: 'tints carry warning hue (yellow)',
  [FAMILY.positive]: 'tints carry positive hue (green)',
  [FAMILY.info]: 'tints carry info hue (blue)',
}

// the same color words for the stamp rows, whose bodies are shared across families so
// the TINT line never reaches them; appended to their theming lines as a family marker.
// Empty for the brands.
const COLOR_WORD: Record<Family, string> = {
  [FAMILY.neutral]: ' (gray)', [FAMILY.brandPrimary]: '', [FAMILY.brandSecondary]: '',
  [FAMILY.critical]: ' (red)', [FAMILY.warning]: ' (yellow)', [FAMILY.positive]: ' (green)', [FAMILY.info]: ' (blue)',
}

const COLLIDES = 'shifts to avoid similar colors'

// ── THE GUARANTEE SCOPE: what the guarantee audit measures per band, rendered into the
// document description as each claim's ground. scripts/guarantee-audit.ts asserts that the
// pairs it measures are exactly these, so a sentence on a token can never say more than
// the gate holds. A text band reads against its own family's grounds and the neutral's;
// the neutral's bands read against every family's (the pen band is symmetric).
export const GUARANTEE_SCOPE = {
  highlighter: { level: AA_LARGE, grounds: ['paper'] },
  pencil: { level: AA_BODY, grounds: ['paper'] },
  pen: { level: AA_BODY, grounds: ['paper', 'chalk'] },
} as const
export type GuaranteeBand = keyof typeof GUARANTEE_SCOPE
export type GuaranteeGround = (typeof GUARANTEE_SCOPE)[GuaranteeBand]['grounds'][number]
// the stop words the document rendering names (spelled here because this module imports
// nothing; desc-audit checks them against the name table)
export const BAND_STOPS: Record<GuaranteeBand, readonly string[]> = {
  highlighter: ['highlighter-26'],
  pencil: ['pencil-47'],
  pen: ['pen-58', 'pen-70'],
}
const list = (words: readonly string[]) => words.length > 1 ? `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}` : words[0]
// the family clause of a claim: a chromatic family's stops read against its own grounds
// and the neutral's; the neutral's read against every family's
const ofFamilies = (fam: Family) => fam === FAMILY.neutral ? 'of every family' : 'of this family and of the neutral'
const fromFamilies = (fam: Family) => fam === FAMILY.neutral ? 'from every family' : 'from this family and from the neutral'
// a text band's claim with its ground: "AA standard body text on every paper and chalk of …"
const claimOf = (band: GuaranteeBand) => (fam: Family) =>
  `${GUARANTEE_SCOPE[band].level} on every ${GUARANTEE_SCOPE[band].grounds.join(' and ')} ${ofFamilies(fam)}`
// a ground's line: which bands clear it, at which level; the neutral's grounds add pen-100
const groundLine = (ground: GuaranteeGround) => (fam: Family) => {
  const bands = (Object.keys(GUARANTEE_SCOPE) as GuaranteeBand[]).filter(b => (GUARANTEE_SCOPE[b].grounds as readonly string[]).includes(ground))
  const byLevel = new Map<string, string[]>()
  for (const b of bands) {
    const stops = [...BAND_STOPS[b], ...(b === 'pen' && fam === FAMILY.neutral ? ['pen-100'] : [])]
    byLevel.set(GUARANTEE_SCOPE[b].level, [...(byLevel.get(GUARANTEE_SCOPE[b].level) ?? []), ...stops])
  }
  const clears = [...byLevel.entries()].map(([level, stops]) => `${list(stops)} clear${stops.length === 1 ? 's' : ''} it as ${level}`).join('; ')
  const notHeld = (Object.keys(GUARANTEE_SCOPE) as GuaranteeBand[]).filter(b => !bands.includes(b))
  return `${clears}, ${fromFamilies(fam)}${notHeld.length ? `; ${list(notHeld.map(b => `the ${b}`))} ${notHeld.length === 1 ? 'is' : 'are'} not held against it` : ''}`
}

interface Body {
  req: string
  contrast?: string
  theming?: string | ((fam: Family) => string)
  collides?: boolean // signal families add the Collisions line
  // document rendering only: the claim with its ground (replaces `contrast` there), a
  // ground's line, and usage guidance
  claim?: (fam: Family) => string
  ground?: (fam: Family) => string
  use?: string
}

// ── the shared family scale — per-STOP text, the title line carries the family,
// TINT carries the per-family theming half
const PAPER: Body = { req: 'backgrounds, inverted text', theming: f => TINT[f], collides: true, ground: groundLine('paper') }
// "decorative borders", not "edges": edge is a label word (stamp/edge) and a label word in
// a foreign row's body floods that word's search results. A row may carry a label word
// only when it is in its own path.
const CHALK: Body = { req: 'decorative borders, inverted text, illos, signal hierarchy', theming: f => TINT[f], collides: true, ground: groundLine('chalk') }
const solved = (f: Family) => `${TINT[f]}; re-solved to clear its floor`
// (Leaf keys are flat, paper-1 never paper/99, except the stamp/ state group, keyed by
// its nested spelling.) The overlay rows are parked: nothing emits them, so these bodies
// are dormant and kept for the comeback. Translucent twins of the papers, solved so the
// reading holds on the neutral papers; anywhere else the backdrop decides, stated because
// it is the token's conformance boundary.
const OVERLAY: Body = {
  req: 'translucent backgrounds that hold their reading on any paper',
  theming: f => `${TINT[f]}; opacity solved against the papers, other backdrops show through unguaranteed`,
  collides: true,
}
const SCALE: Record<string, Body> = {
  'paper-1': PAPER,
  'paper-99-overlay': OVERLAY,
  'paper-3': PAPER,
  'paper-97-overlay': OVERLAY,
  'paper-5': { req: 'backgrounds, inverted text', theming: f => `${TINT[f]}. Worst background text stops must clear.`, collides: true, ground: f => `${groundLine('paper')(f)}; the ground the text stops are solved against` },
  'paper-95-overlay': OVERLAY,
  'chalk-8': CHALK,
  'chalk-11': CHALK,
  'chalk-15': CHALK,
  'chalk-20': CHALK,
  // ("icons" stays although it carries "on": an "icon" query landing on the highlighter
  // rows is worth that noise)
  'highlighter-26': { req: 'focus rings, icons, large text, translucent state layers over any ground', contrast: AA_LARGE, claim: claimOf('highlighter'), theming: solved, collides: true },
  'pencil-47': { req: 'regular text, inverted backgrounds', contrast: AA_BODY, claim: claimOf('pencil'), theming: solved, collides: true },
  'pen-58': { req: 'regular text, inverted backgrounds', contrast: AA_BODY, claim: claimOf('pen'), theming: solved, collides: true },
  // ("heavy-emphasis": "high" and "low" are plane words in the community plugin and
  // "strong" carries "on")
  'pen-70': { req: 'heavy-emphasis text, inverted backgrounds', contrast: AA_BODY, claim: claimOf('pen'), theming: solved, collides: true },
  // the stamp family. "CTA" stays in these bodies on purpose: it is not a token label, so
  // it floods nothing, and a designer's "cta" query lands on these rows.
  // the usage lines are the owner's guidance, for the document rendering: the fill is
  // misused as a standalone color in the wild
  'stamp/fill': { req: 'CTAs', theming: f => `fully re-solved per theme and family${COLOR_WORD[f]}`,
    use: 'primary button fills; optional for avatars, badges and other elements that carry text. Not a standalone color: it has no contrast guarantee of its own, only its on-text has one. Use it alone or with its hover and pressed states. Always bordered with its edge' },
  'stamp/fill-hover': { req: 'CTA pointer-over state', theming: f => `follows its rest fill${COLOR_WORD[f]}`, use: 'the pointer-over state of the fill, with the fill; for nothing else. Always bordered with the edge' },
  'stamp/fill-pressed': { req: 'CTA pressed state', theming: f => `follows its rest fill${COLOR_WORD[f]}`, use: 'the pressed state of the fill, with the fill; for nothing else. Always bordered with the edge' },
  'stamp/edge': { req: 'min APCA visibility', theming: f => `draws for CTAs that sit close to the page; strength per family tier${COLOR_WORD[f]}`, use: 'the border of the fill and its states, always rendered with them and never without them (it resolves to transparent unless the fill sits close to the page); for nothing else' },
  // ("fill" is a label word and foreign here)
  'stamp/on': { req: 'text over the CTA color', contrast: `${AA_BODY} over its CTA`, theming: f => `whichever pole passes; quiet CTAs take the soft pole${COLOR_WORD[f]}`, use: 'the only text color over the fill; never elsewhere' },
}

// ── rows only the neutral carries ────────────────────────────────────────────
const NEUTRAL_ONLY: Record<string, Body> = {
  // the pole is measured against the neutral's own stops only; as text, it is the on-color
  // of every family's emphasis fill (the band audit holds that)
  'paper-0': { req: 'backgrounds, inverted text', theming: f => TINT[f], ground: () => `the neutral's highlighter-26 clears it as ${AA_LARGE}; its pencil-47, pen-58, pen-70 and pen-100 clear it as ${AA_BODY}; as text, ${AA_BODY} on every family's pencil-47` },
  // the literal pole carries no tint, so no theming line
  'pen-100': { req: 'max-emphasis text', contrast: AA_BODY, claim: () => `${AA_BODY} on every paper and chalk of every family` },
}

// ── the link trios and the seed absolutes, keyed by full path ──────────────
// ("link" is legal in these bodies: it is the rows' own path word. "pen" stays out: it is
// a label word elsewhere and would flood that search; "inverted backgrounds" is the
// established phrasing for that ground.)
const LINK = (state: string, contrast: string): Body => ({
  req: 'links' + state,
  contrast,
  claim: () => `${contrast} on every paper of the neutral`,
  theming: 'rides the theme’s link color; custom seed re-solves; overridable per theme',
  use: 'hyperlinks; not a text-style CTA, which is the text stops read as states',
})
const LINK_INVERSE = (state: string, contrast: string): Body => ({
  req: 'links over inverted backgrounds' + state,
  contrast,
  claim: () => `${contrast} on any family's pen-70`,
  theming: 'same seed as the link, re-solved for inverted backgrounds; overridable per theme',
  use: 'hyperlinks on a pen-70 ground; not a text-style CTA',
})

const SYSTEM: Record<string, Body> = {
  'absolute/brand': { req: 'identity seed reference', theming: 'the theme’s own input, as given', use: 'a reference value (logos, swatches of the input); never a UI color, it carries no contrast guarantee' },
  'absolute/brand-alt': { req: 'identity seed reference', theming: 'the theme’s paired input, as given', use: 'a reference value (logos, swatches of the input); never a UI color, it carries no contrast guarantee' },
  'link/default/enabled': LINK('', AA_BODY),
  'link/default/hover': LINK(' pointer-over', AA_BODY),
  'link/default/pressed': LINK(' pressed', AA_BODY),
  'link/inverse/enabled': LINK_INVERSE('', AA_BODY),
  'link/inverse/hover': LINK_INVERSE(' pointer-over', AA_BODY),
  'link/inverse/pressed': LINK_INVERSE(' pressed', AA_BODY),
}

// Both plugins' user-facing path shapes: the extended plugin's base zone uses the
// grammar (brand/…, link/…, absolute/…); the community theme collection spells the
// brands brand/primary/… and brand/alt/… and the link and seed rows under system/. Same
// rows, same text.
const PREFIXES: Array<[string, Family]> = [
  // community spellings first: the family word is a prefix of the community shapes
  // ('brand/' would shadow 'brand/primary/' and 'brand/alt/'), so most-specific wins
  ['brand/primary/', FAMILY.brandPrimary],
  ['brand/alt/', FAMILY.brandSecondary],
  ...FAMILIES.map((f): [string, Family] => [f + '/', f]),
]

// CANONICALIZE: the extended plugin's paths carry its ownership zone (base/, the
// engine-owned rows) that this module must never see: a zone is a Figma-panel organizing
// axis, not part of a row's identity, and letting a zone word into a description would
// flood the picker search. The community plugin's system/ spellings of the link and seed
// rows map onto the grammar the same way. The retired primitive/ strip stays for rows
// described mid-migration.
const ZONE_MAP: Array<[string, string]> = [
  // brand-alt before brand: canonicalize is first-match startsWith, and brand is a prefix
  // of brand-alt
  ['system/abs-alt', 'absolute/brand-alt'],
  ['system/abs-primary', 'absolute/brand'],
  ['system/link/', 'link/'],
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

// The full description for a variable path. The title comes from the canonical path (a
// zone word must never enter it, the search-flood rule above); unknown paths get the
// canonical title alone.
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

// The document rendering, for a token whose key already carries the name (the DTCG
// documents): the same body lines, the conformance line carrying its ground, a ground's
// own line naming what clears it, and the usage line. No title. Empty when no body is
// authored for the path.
export function describeDocument(path: string): string {
  const hit = bodyFor(canonicalize(path))
  if (!hit) return ''
  const { body, fam } = hit
  const lines = [`Req for: ${body.req}`]
  if (body.claim) lines.push(body.claim(fam))
  else if (body.contrast) lines.push(body.contrast)
  if (body.ground) lines.push(`Ground: ${body.ground(fam)}`)
  if (body.use) lines.push(`Use: ${body.use}`)
  if (body.theming) lines.push(`Theming: ${typeof body.theming === 'function' ? body.theming(fam) : body.theming}`)
  if (body.collides && SIGNALS.includes(fam)) lines.push(COLLIDES)
  return lines.join('\n')
}
