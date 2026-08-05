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

const COLLIDES = 'may shift within band when the brand collides'

interface Body {
  req: string
  contrast?: string
  theming?: string | ((fam: Family) => string)
  collides?: boolean // signal families add the Collisions line
}

// ── the shared family scale — per-STOP text, the title line carries the family,
// TINT carries the per-family theming half
const PAPER: Body = { req: 'surfaces, inverted text', theming: f => TINT[f], collides: true }
const WASH: Body = { req: 'subtle interaction states, decorative borders, illustrations, signal hierarchy', theming: f => TINT[f], collides: true }
const solved = (f: Family) => `${TINT[f]}; re-solved to clear its floor`
const TEXT_CTA = 'aliases the family’s reading stops'

const SCALE: Record<string, Body> = {
  'paper/1': PAPER,
  'paper/2': PAPER,
  'paper/3': { req: 'surfaces, inverted text', theming: f => `${TINT[f]}. Worst background text stops must clear.`, collides: true },
  'wash/4': WASH,
  'wash/5': WASH,
  'wash/6': WASH,
  'wash/7': WASH,
  'highlight/8': { req: 'focus rings, icons, large text', contrast: AA_LARGE, theming: solved, collides: true },
  'ink/9': { req: 'regular text, inverted surfaces', contrast: AA_BODY, theming: solved, collides: true },
  'ink/10': { req: 'regular text, inverted surfaces', contrast: AA_BODY, theming: solved, collides: true },
  'ink/11': { req: 'strong text, inverted surfaces', contrast: AAA_BODY, theming: solved, collides: true },
  'cta/enabled': { req: 'CTAs', theming: 'fully re-solved per brand and family' },
  'cta/hover': { req: 'CTA pointer-over state', theming: 'follows its rest fill' },
  'cta/pressed': { req: 'CTA pressed state', theming: 'follows its rest fill' },
  'cta/border': { req: 'min APCA visibility', theming: 'draws for low contrast CTAs; strength per family tier' },
  'cta/on': { req: 'text over the fill', contrast: `${AA_BODY} over its fill`, theming: 'whichever pole passes; quiet fills take the soft pole' },
  'cta-ink/enabled': { req: 'text-style CTA', contrast: AA_BODY, theming: TEXT_CTA },
  'cta-ink/hover': { req: 'text-style CTA pointer-over', contrast: AA_BODY, theming: TEXT_CTA },
  'cta-ink/pressed': { req: 'text-style CTA pressed', contrast: AAA_BODY, theming: TEXT_CTA },
}

// ── rows only the neutral carries ────────────────────────────────────────────
const STRONG = 'descending mirror of the text CTA'
const NEUTRAL_ONLY: Record<string, Body> = {
  'paper/0': { req: 'surfaces, inverted text', theming: f => TINT[f] },
  'ink/12': { req: 'max-emphasis text', contrast: AAA_BODY },
  'cta-ink-strong/enabled': { req: 'heavier text CTA', contrast: AAA_BODY, theming: STRONG },
  'cta-ink-strong/hover': { req: 'heavier text CTA pointer-over', contrast: AA_BODY, theming: STRONG },
  'cta-ink-strong/pressed': { req: 'heavier text CTA pressed', contrast: AA_BODY, theming: STRONG },
}

// ── system rows, keyed by full path ──────────────────────────────────────────
const ABS: Body = { req: 'max contrast on CTAs, aliased global endpoints' }
const OFFSET: Body = { req: 'min APCA visibility', theming: 'aliased to cta-border in themes with low contrast CTAs' }
const SHADOW: Body = { req: 'drop shadows' }
const PLANE = (req: string): Body => ({ req, theming: 'aliased to the neutral ramp' })
const LINK = (state: string, contrast: string): Body => ({
  req: 'links' + state,
  contrast,
  theming: 'rides the theme’s text CTA; custom seed re-solves; brand-overridable',
})

const SYSTEM: Record<string, Body> = {
  'system/abs-black': ABS,
  'system/abs-white': ABS,
  'system/abs-primary': { req: 'brand seed reference', theming: 'each brand’s input, as given' },
  'system/abs-secondary': { req: 'brand seed reference', theming: 'each brand’s companion input, as given' },
  'system/alpha/transparent': { req: 'aliased off-states' },
  'system/alpha/scrim': { req: 'dimming behind elements' },
  'system/alpha/ink': { req: 'soft on-color for quiet fills' },
  'system/alpha/offset-06': OFFSET,
  'system/alpha/offset-08': OFFSET,
  'system/alpha/offset-16': OFFSET,
  'system/alpha/shadow-04': SHADOW,
  'system/alpha/shadow-08': SHADOW,
  'system/alpha/shadow-12': SHADOW,
  'system/surface/sink': PLANE('recessed elevation plane'),
  'system/surface/base': PLANE('resting page plane'),
  'system/surface/lift': PLANE('raised plane — cards, menus'),
  'system/surface/pop': PLANE('topmost plane — overlays'),
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

function bodyFor(path: string): { body: Body; fam: Family } | undefined {
  if (SYSTEM[path]) return { body: SYSTEM[path], fam: 'neutral' }
  const hit = PREFIXES.find(([p]) => path.startsWith(p))
  if (!hit) return undefined
  const [prefix, fam] = hit
  const leaf = path.slice(prefix.length)
  const body = (fam === 'neutral' && NEUTRAL_ONLY[leaf]) || SCALE[leaf]
  return body ? { body, fam } : undefined
}

// The full description for a variable path. Title = the spaced own name; unknown paths
// get the title alone.
export function describeToken(path: string): string {
  const title = path.replace(/[/-]/g, ' ')
  const hit = bodyFor(path)
  if (!hit) return title
  const { body, fam } = hit
  const lines = [title, `Req for: ${body.req}`]
  if (body.contrast) lines.push(`Contrast: ${body.contrast}`)
  if (body.theming) lines.push(`Theming: ${typeof body.theming === 'function' ? body.theming(fam) : body.theming}`)
  if (body.collides && SIGNALS.includes(fam)) lines.push(`Collisions: ${COLLIDES}`)
  return lines.join('\n')
}
