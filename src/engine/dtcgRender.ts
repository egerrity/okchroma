// The DTCG emitter: the structured emit as two documents in the Design Tokens Format
// Module 2025.10 shape, one per mode, on identical paths. Every primitive the engine
// emits appears once, at its path from the one grammar (tokenNames.ts), with $type,
// $value and $description. Values come from the structured emit, which is the CSS
// emission read back, so the documents cannot disagree with the CSS. Where the CSS writes
// a reference (the mirror posture, the outline posture, the default link onto the pens)
// the document writes the DTCG alias; where it writes a literal, a literal. Every color
// is sRGB: components and hex are the same 8-bit value, the pair the guarantee audits
// measure. Nothing sits at the document root but the groups: the grammar's own, or the one
// root group a caller names to nest them under.
import type { ThemeTokens, TokenMode } from './tokensRender'
import {
  stopTokenName, SCALE_STOP_COUNT, PAPER_0, PEN_100,
  STAMP_FILL, STAMP_FILL_HOVER, STAMP_FILL_PRESSED, STAMP_EDGE, STAMP_ON,
  cssVarName, figmaPathOf, familyPath, linkPath, absolutePath, LINK_POSTURES, LINK_STATES,
  type TokenPath,
} from './tokenNames'
import { CSS_FAMILY, describeDocument } from './tokenDescriptions'
import { SIGNALS } from './signals'

export type DtcgColorValue = { colorSpace: 'srgb'; components: [number, number, number]; alpha: number; hex: string }
/** a color token, literal or an alias in the curly-brace form (`{brand.pencil-47}`) */
export type DtcgToken = { $type: 'color'; $value: DtcgColorValue | string; $description?: string }
export type DtcgGroup = { [key: string]: DtcgToken | DtcgGroup }
export type DtcgDocument = DtcgGroup

const STAMP = [STAMP_FILL, STAMP_FILL_HOVER, STAMP_FILL_PRESSED, STAMP_EDGE, STAMP_ON]
const STOPS = Array.from({ length: SCALE_STOP_COUNT }, (_, i) => stopTokenName(i + 1))

/**
 * Every primitive's path, in document order: the neutral with its poles, the brand, the
 * alt, the four signals by role, the link rows, the seed absolutes. This roster is the
 * definition of what the engine emits; the emitters and the audit ride it.
 */
export function tokenPaths(): TokenPath[] {
  const family = (word: string, poles: boolean): TokenPath[] => [
    ...(poles ? [familyPath(word, PAPER_0)] : []),
    ...STOPS.map(leaf => familyPath(word, leaf)),
    ...(poles ? [familyPath(word, PEN_100)] : []),
    ...STAMP.map(leaf => familyPath(word, leaf)),
  ]
  return [
    ...family(CSS_FAMILY.neutral, true),
    ...family(CSS_FAMILY.brandPrimary, false),
    ...family(CSS_FAMILY.brandSecondary, false),
    ...SIGNALS.flatMap(s => family(s.emitName, false)),
    ...LINK_POSTURES.flatMap(posture => LINK_STATES.map(state => linkPath(posture, state))),
    absolutePath(CSS_FAMILY.brandPrimary),
    absolutePath(CSS_FAMILY.brandSecondary),
  ]
}

const byName = (): Map<string, TokenPath> => new Map(tokenPaths().map(p => [cssVarName(p).slice(2), p]))

/** the path of a structured-emit name (`brand-stamp-0`), or undefined when it is not a primitive */
export function tokenPathOf(name: string): TokenPath | undefined {
  return byName().get(name)
}

/** the description key of a structured-emit name: its slash-joined path */
export function descriptionPathOf(name: string): string | undefined {
  const p = tokenPathOf(name)
  return p && figmaPathOf(p)
}

// components are the 8-bit channels over 255 to four decimals: adjacent 8-bit values stay
// distinct, the file stays readable, and the channel rounds back to the hex exactly
const component = (c8: number): number => Math.round((c8 / 255) * 1e4) / 1e4
const colorValue = (r: number, g: number, b: number, alpha: number): DtcgColorValue => ({
  colorSpace: 'srgb',
  components: [component(r), component(g), component(b)],
  alpha,
  hex: '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join(''),
})

/** a resolved CSS value (hex, rgba(), transparent) as a DTCG color value */
export function dtcgColor(value: string): DtcgColorValue {
  let m: RegExpExecArray | null
  if ((m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(value))) return colorValue(parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16), 1)
  if ((m = /^rgba\((\d+), (\d+), (\d+), ([0-9.]+)\)$/.exec(value))) return colorValue(+m[1], +m[2], +m[3], +m[4])
  if (value === 'transparent') return colorValue(0, 0, 0, 0)
  throw new Error(`dtcgColor: not a color the emitters write: ${value}`)
}

const ALIAS = /^var\(--([a-z0-9-]+)\)$/

export type DtcgOptions = {
  /**
   * A group to nest every path under, for a consumer whose grammar starts a path with its
   * category (`color`, the word `COLOR_GROUP` holds). Aliases are written with it
   * (`{color.brand.pencil-47}`). Omitted, the grammar's groups sit at the document root.
   */
  rootGroup?: string
}

// a root group is a segment like any other: lower-case words and digits joined by
// hyphens, so the dot, slash and hyphen joins of a path stay unambiguous
const SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * The two DTCG documents for a structured emit. Every primitive in the roster must be
 * present in the emit and nothing else may be; a missing or foreign name throws, so the
 * emit and the roster cannot drift apart silently.
 */
export function tokensToDtcg(tokens: ThemeTokens, options: DtcgOptions = {}): { light: DtcgDocument; dark: DtcgDocument } {
  const { rootGroup } = options
  if (rootGroup !== undefined && !SEGMENT.test(rootGroup)) throw new Error(`tokensToDtcg: rootGroup must be lower-case words and digits joined by hyphens: ${JSON.stringify(rootGroup)}`)
  const rooted = (path: TokenPath): TokenPath => (rootGroup === undefined ? path : [rootGroup, ...path])
  const paths = byName()
  const roster = new Set(paths.keys())
  for (const name of tokens.names) if (!roster.has(name)) throw new Error(`tokensToDtcg: the emit carries a name the roster does not know: ${name}`)
  for (const name of roster) if (!(name in tokens.light)) throw new Error(`tokensToDtcg: the emit lacks ${name}`)

  const build = (mode: TokenMode): DtcgDocument => {
    const doc: DtcgDocument = {}
    for (const [name, path] of paths) {
      const raw = tokens.raw[mode][name] ?? tokens.raw.light[name]
      const alias = ALIAS.exec(raw)
      let token: DtcgToken
      if (alias) {
        const target = paths.get(alias[1])
        if (!target) throw new Error(`tokensToDtcg: ${name} references a name outside the roster: ${alias[1]}`)
        token = { $type: 'color', $value: `{${rooted(target).join('.')}}` }
      } else {
        token = { $type: 'color', $value: dtcgColor(tokens[mode][name]) }
      }
      const body = describeDocument(figmaPathOf(path))
      if (body) token.$description = body
      let cur: DtcgGroup = doc
      for (const seg of rooted(path).slice(0, -1)) {
        const next = cur[seg]
        if (next && '$type' in next) throw new Error(`tokensToDtcg: ${seg} is both a token and a group on the way to ${path.join('/')}`)
        cur = (cur[seg] as DtcgGroup | undefined) ?? (cur[seg] = {})
      }
      const leaf = path[path.length - 1]
      if (leaf in cur) throw new Error(`tokensToDtcg: duplicate path ${path.join('/')}`)
      cur[leaf] = token
    }
    return doc
  }
  return { light: build('light'), dark: build('dark') }
}
