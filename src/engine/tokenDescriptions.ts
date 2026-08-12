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
//   Req for:     the requirement the stop was DESIGNED to satisfy — documented roles only,
//                never editorial ("not what the variable COULD be for")
//   Contrast:    only where a floor exists — WCAG conformance language, never ratios
//   Theming:     strictly how the theme moves the value; the LINE IS DROPPED when the
//                theme never moves it. Tint rows say "tints carry <family> hue".
//   Collisions:  its own line, only on rows that can shift to de-conflict with the brand
// Never mention light/dark modes anywhere.
//
// IMPORT-SAFE BY CONSTRUCTION: zero imports, pure text + string assembly, so both plugin
// sandboxes (plugin/code.ts, plugin-ext/code.ts) can import it without dragging the engine
// into their bundles. Enforced by scripts/desc-audit.ts, alongside the digit rule above.

// The owner's conformance phrases — the only way contrast is ever stated.
const AA_LARGE = 'AA large text and UI elements'
const AA_BODY = 'AA standard body text & Level AAA large text'
const AAA_BODY = 'Level AAA enhanced contrast for standard body text'

type Family = 'neutral' | 'brand-primary' | 'brand-secondary' | 'critical' | 'warning' | 'positive' | 'info'
const FAMILIES: Family[] = ['neutral', 'brand-primary', 'brand-secondary', 'critical', 'warning', 'positive', 'info']
const SIGNALS: Family[] = ['critical', 'warning', 'positive', 'info']

// The per-family half of a scale row's Theming line (owner's language).
const TINT: Record<Family, string> = {
  'neutral': 'tints carry neutral hue',
  'brand-primary': 'tints carry primary hue',
  'brand-secondary': 'tints carry secondary hue (family derived or custom per brand)',
  'critical': 'tints carry critical hue',
  'warning': 'tints carry warning hue',
  'positive': 'tints carry positive hue',
  'info': 'tints carry info hue',
}

const COLLIDES = 'may shift within band to de-conflict'

interface Body {
  req: string
  contrast?: string
  theming?: string | ((fam: Family) => string)
  collides?: boolean // signal families add the Collisions line
}

// ── the shared family scale — per-STOP text, the title line carries the family,
// TINT carries the per-family theming half
const PAPER: Body = { req: 'backgrounds, inverted text', theming: f => TINT[f], collides: true }
// "decorative edges", not "borders": a token label word in a foreign row's body floods that
// word's search results (the whole reason the shared stamp broke search). A row may carry a
// label word only when it is in its OWN path — cta border's own title is the exception.
const WASH: Body = { req: 'subtle interaction states, decorative edges, illustrations, signal hierarchy', theming: f => TINT[f], collides: true }
const solved = (f: Family) => `${TINT[f]}; re-solved to clear its floor`
// (the cta-ink + cta-ink-strong rows DELETED with their tokens, owner 2026-08-12: the
// text-style CTA is the ink stops themselves. Leaf keys are FLAT — band flattening,
// same round: paper-99, never paper/99.)
const SCALE: Record<string, Body> = {
  'paper-99': PAPER,
  'paper-97': PAPER,
  'paper-95': { req: 'backgrounds, inverted text', theming: f => `${TINT[f]}. Worst background text stops must clear.`, collides: true },
  'wash-92': WASH,
  'wash-89': WASH,
  'wash-85': WASH,
  'wash-80': WASH,
  'mark-74-aa': { req: 'focus rings, icons, large text', contrast: AA_LARGE, theming: solved, collides: true },
  'ink-53-aa': { req: 'regular text, inverted backgrounds', contrast: AA_BODY, theming: solved, collides: true },
  'ink-42-aa': { req: 'regular text, inverted backgrounds', contrast: AA_BODY, theming: solved, collides: true },
  // ("high-emphasis" reworded 2026-08-12: the surface planes took low/high as label
  // words, and a body carrying either floods that token's picker search — the C50 law)
  'ink-30-aaa': { req: 'strong-emphasis text, inverted backgrounds', contrast: AAA_BODY, theming: solved, collides: true },
  'cta/enabled': { req: 'CTAs', theming: 'fully re-solved per theme and family' },
  'cta/hover': { req: 'CTA pointer-over state', theming: 'follows its rest fill' },
  'cta/pressed': { req: 'CTA pressed state', theming: 'follows its rest fill' },
  'cta/border': { req: 'min APCA visibility', theming: 'draws for CTAs that sit close to the page; strength per family tier' },
  'cta/on': { req: 'text over the fill', contrast: `${AA_BODY} over its fill`, theming: 'whichever pole passes; quiet fills take the soft pole' },
}

// ── rows only the neutral carries ────────────────────────────────────────────
const NEUTRAL_ONLY: Record<string, Body> = {
  'paper-100': { req: 'backgrounds, inverted text', theming: f => TINT[f] },
  'ink-0': { req: 'max-emphasis text', contrast: AAA_BODY },
}

// ── system rows, keyed by full path ──────────────────────────────────────────
const ABS: Body = { req: 'max contrast on CTAs, aliased global endpoints' }
const OFFSET: Body = { req: 'min APCA visibility', theming: 'offsets buttons in themes whose CTAs sit close to the page' }
const SHADOW: Body = { req: 'drop shadows' }
const PLANE = (req: string): Body => ({ req, theming: 'aliased to the gray ramp' })
const LINK = (state: string, contrast: string): Body => ({
  req: 'links' + state,
  contrast,
  theming: 'rides the theme’s text action; custom seed re-solves; overridable per theme',
})

const SYSTEM: Record<string, Body> = {
  'system/abs-black': ABS,
  'system/abs-white': ABS,
  // the community plugin's system-root anchor home (plugin/code.ts STATIC_UTILS) — the
  // ext plugin's equivalent rides the neutral at neutral/ink-0 (NEUTRAL_ONLY above);
  // same stop, same body text.
  'system/ink-0': { req: 'max-emphasis text anchor', contrast: AAA_BODY },

  'system/abs-primary': { req: 'identity seed reference', theming: 'the theme’s own input, as given' },
  'system/abs-secondary': { req: 'identity seed reference', theming: 'the theme’s companion input, as given' },
  'system/alpha/transparent': { req: 'aliased off-states' },
  'system/alpha/scrim': { req: 'dimming behind elements' },
  'system/alpha/ink': { req: 'soft on-color for quiet fills' },
  'system/alpha/offset-06': OFFSET,
  'system/alpha/offset-08': OFFSET,
  'system/alpha/offset-16': OFFSET,
  'system/alpha/shadow-04': SHADOW,
  'system/alpha/shadow-08': SHADOW,
  'system/alpha/shadow-12': SHADOW,
  'system/surface/sunken': PLANE('recessed elevation plane'),
  'system/surface/low': PLANE('resting page plane'),
  'system/surface/base': PLANE('raised plane — cards, menus'),
  'system/surface/high': PLANE('topmost plane — overlays'),
  'system/link/enabled': LINK('', AA_BODY),
  'system/link/hover': LINK(' pointer-over', AA_BODY),
  'system/link/pressed': LINK(' pressed', AAA_BODY),
}

// Both plugins' user-facing path shapes: the ext base uses brand-primary/…, the community
// theme collection uses brand/primary/… — same rows, same text.
const PREFIXES: Array<[string, Family]> = [
  ...FAMILIES.map((f): [string, Family] => [f + '/', f]),
  ['brand/primary/', 'brand-primary'],
  ['brand/secondary/', 'brand-secondary'],
]

// CANONICALIZE (A1 regroup 2026-08-07, flattened to one register 2026-08-11): the ext
// plugin's paths carry the primitive/ REGISTER prefix (plugin-ext/payload.ts
// registerPath) that this module must never see — the register is a Figma-panel
// organizing axis, not part of a row's identity, and letting register words into a
// description would flood Figma's picker search exactly like the old ratio-digit stamp
// did (see the file header). Strip it; everything underneath (system/link/*,
// system/surface/*, the families) already spells the identity this module keys on. The
// community plugin's paths (plugin/code.ts) never carried a register to begin with, so
// this is a no-op for them.
export function canonicalize(path: string): string {
  return path.startsWith('primitive/') ? path.slice('primitive/'.length) : path
}

function bodyFor(path: string): { body: Body; fam: Family } | undefined {
  const canonical = canonicalize(path)
  if (SYSTEM[canonical]) return { body: SYSTEM[canonical], fam: 'neutral' }
  const hit = PREFIXES.find(([p]) => canonical.startsWith(p))
  if (!hit) return undefined
  const [prefix, fam] = hit
  const leaf = canonical.slice(prefix.length)
  const body = (fam === 'neutral' && NEUTRAL_ONLY[leaf]) || SCALE[leaf]
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
  if (body.contrast) lines.push(`Contrast: ${body.contrast}`)
  if (body.theming) lines.push(`Theming: ${typeof body.theming === 'function' ? body.theming(fam) : body.theming}`)
  if (body.collides && SIGNALS.includes(fam)) lines.push(`Collisions: ${COLLIDES}`)
  return lines.join('\n')
}
