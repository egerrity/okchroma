// The DTCG gate: the two documents carry every primitive the engine emits, once, at its
// path from the one grammar, with the value the CSS and the Figma tree carry, and a
// description; the documents are well-formed against the Design Tokens Format Module
// 2025.10 shape this emitter targets. Every case runs in both forms: the grammar's groups
// at the document root, and the same documents nested under the color group.
//
//   A. the emit and the roster agree: tokensToDtcg builds (it throws on a name outside
//      the roster or a roster name the emit lacks), and every document holds exactly the
//      roster's count; a root group that is not a legal segment throws
//   B. every token: $type color; $value a Color Module object (srgb, three components in
//      [0, 1] that round back to the hex, alpha in [0, 1], a six-digit lower-case hex) or
//      an alias in the curly-brace form that resolves inside the same document with no
//      cycle; a non-empty $description; a legal name (no leading $, no braces, no period)
//   C. light and dark hold the same paths
//   D. every path joined with hyphens is a CSS custom property the raw emission declares,
//      and the resolved values agree, both modes, aliases followed. The CSS names do not
//      carry the root group, so the nested form compares with the group taken off
//   E. every path joined with slashes is a leaf of the Figma tree with the same hex and
//      alpha, and the tree holds nothing the documents do not. The nested form compares
//      against the path the extended plugin writes (its registerPath over the tree's leaf)
//   F. the documents survive a JSON round trip
//   G. the nested form is the plain form and nothing else: one root key, and with the
//      group taken off every path and every alias the two serialize identically
//
// Cases: the fixture roster in every posture (no secondary, derived, custom at default,
// outline and exact, the escape with a custom link and a custom neutral hue) plus an
// agnostic hue by chroma sweep. Failures print worst-first with the case. Nothing here is
// blessed.
import { FIXTURES, FIXTURE_SECONDARIES } from './fixture'
import { resolveTheme, signalScalesFor } from '../src/engine/resolve'
import { signalsCss, brandCss, toHex } from '../src/engine/cssRender'
import { themeTokens, readEmission, resolveReferences } from '../src/engine/tokensRender'
import { themeToFigma, type FigmaGroup, type FigmaLeaf, type FigmaColorToken } from '../src/engine/figmaRender'
import { tokensToDtcg, tokenPaths, type DtcgDocument, type DtcgGroup, type DtcgToken } from '../src/engine/dtcgRender'
import { COLOR_GROUP } from '../src/engine/tokenNames'
import { registerPath } from '../plugin-ext/payload'
import { oklchToSrgbUnclamped } from '../src/engine/colorMath'
import { SIGNALS } from '../src/engine/signals'

const PROFILE = 'wcag' as const
const failures: string[] = []
const fail = (msg: string) => failures.push(msg)

type Case = { label: string; theme: ReturnType<typeof resolveTheme>; extra: { ctaEscape?: boolean; linkHex?: string | null; neutralH?: number } }
const cases: Case[] = []
const mk = (label: string, tIn: Parameters<typeof resolveTheme>[0], extra: Case['extra'] = {}) =>
  cases.push({ label, theme: resolveTheme({ contrastProfile: PROFILE, name: 't', ...tIn }), extra })
for (const fx of FIXTURES) {
  const common = { primaryHex: fx.hex, exact: fx.exact, archetypeOverride: fx.archetypeOverride, style: fx.style }
  mk(`${fx.slug} derived`, { ...common, deriveSecondary: true })
  mk(`${fx.slug} no secondary`, { ...common })
  const s = FIXTURE_SECONDARIES[fx.slug]
  if (s) for (const st of ['default', 'outline', 'exact'] as const) mk(`${fx.slug} custom ${st}`, { ...common, secondaryHex: s, secondaryStyle: st })
  mk(`${fx.slug} escape, custom link, custom neutral hue`, { ...common, deriveSecondary: true }, { ctaEscape: true, linkHex: '#0B57D0', neutralH: 140 })
}
for (const L of [0.35, 0.55, 0.78]) for (const C of [0.03, 0.10, 0.18]) for (let H = 0; H < 360; H += 30) {
  const { r, g, b } = oklchToSrgbUnclamped(L, C, H)
  mk(`sweep ${toHex(r, g, b)}`, { primaryHex: toHex(r, g, b), deriveSecondary: true })
}

const isToken = (v: unknown): v is DtcgToken => !!v && typeof v === 'object' && '$type' in (v as object)
const flat = (g: DtcgGroup, pre: string[] = [], out = new Map<string, DtcgToken>()): Map<string, DtcgToken> => {
  for (const [k, v] of Object.entries(g)) { if (isToken(v)) out.set([...pre, k].join('.'), v); else flat(v, [...pre, k], out) }
  return out
}
const isLeaf = (v: FigmaLeaf | FigmaGroup): v is FigmaColorToken => '$type' in v && typeof v.$type === 'string'
const flatFigma = (g: FigmaGroup, pre = '', out: Record<string, string> = {}): Record<string, string> => {
  for (const [k, v] of Object.entries(g)) { const p = pre ? `${pre}/${k}` : k; if (isLeaf(v)) out[p] = `${v.$value.hex}@${v.$value.alpha}`; else flatFigma(v, p, out) }
  return out
}
// a CSS value (hex, rgba(), transparent) as hex@alpha, the comparable form
const norm = (v: string): string => {
  let m: RegExpExecArray | null
  if (/^#[0-9a-f]{6}$/i.test(v)) return `${v.toLowerCase()}@1`
  if ((m = /^rgba\((\d+), (\d+), (\d+), ([0-9.]+)\)$/.exec(v))) return `#${[m[1], m[2], m[3]].map(x => (+x).toString(16).padStart(2, '0')).join('')}@${+m[4]}`
  if (v === 'transparent') return '#000000@0'
  return `unreadable:${v}`
}
const resolveToken = (t: DtcgToken, all: Map<string, DtcgToken>, label: string, depth = 0): string => {
  if (typeof t.$value === 'string') {
    const m = /^\{([^{}]+)\}$/.exec(t.$value)
    if (!m) { fail(`${label}: alias not in the curly-brace form: ${t.$value}`); return 'bad' }
    const target = all.get(m[1])
    if (!target) { fail(`${label}: alias to a token outside the document: ${t.$value}`); return 'bad' }
    if (depth > 16) { fail(`${label}: alias cycle at ${t.$value}`); return 'bad' }
    return resolveToken(target, all, label, depth + 1)
  }
  return `${t.$value.hex}@${t.$value.alpha}`
}
const legalName = (k: string) => !k.startsWith('$') && !/[{}.]/.test(k)
// the nested document with the group taken off its paths and its aliases, serialized
const unrooted = (doc: DtcgDocument, group: string): string =>
  JSON.stringify(doc[group], (_k, v) => (typeof v === 'string' && v.startsWith(`{${group}.`) ? `{${v.slice(group.length + 2)}` : v))

// the two forms: the grammar's groups at the root, and nested under the color group
const FORMS: Array<string | undefined> = [undefined, COLOR_GROUP]

const ROSTER = tokenPaths()
let tokensChecked = 0, aliases = 0
for (const c of cases) {
  const sec = c.theme.secondary?.scale ?? null
  const style = c.theme.secondary?.style
  const tokens = themeTokens({ slug: 't', brand: c.theme.themed, secondary: sec, secondaryStyle: style, contrastProfile: PROFILE, ...c.extra })

  const css = [signalsCss(PROFILE), brandCss('t', 't', c.theme.themed, sec, '', 'default', PROFILE, style, c.extra.ctaEscape, c.extra.linkHex ?? null, true, c.extra.neutralH)].join('\n')
  const em = readEmission(css)
  const resolved = { light: resolveReferences(em.light, new Map()), dark: resolveReferences(em.dark, em.light) }
  const sigScales = signalScalesFor(PROFILE)
  const tree = themeToFigma(c.theme.themed, {
    secondary: sec, secondaryStyle: style, neutralLevel: 'default', contrastProfile: PROFILE,
    ctaEscape: c.extra.ctaEscape, linkHex: c.extra.linkHex ?? null, neutralH: c.extra.neutralH,
    // the callers' contract under the escape: red resets to canonical (plugin-ext/payload.ts,
    // plugin/ui.ts, brandCss), so the tree is fed the same set the CSS emits
    signals: SIGNALS.map(s => {
      const o = c.extra.ctaEscape && s.name === 'red' ? undefined : c.theme.themed.signalOverrides.find(x => x.name === s.name)
      return { name: s.name, scale: o?.scale ?? sigScales.get(s.name)!.scale }
    }),
  })

  let plain: { light: DtcgDocument; dark: DtcgDocument } | undefined
  for (const group of FORMS) {
    const form = group === undefined ? c.label : `${c.label} under ${group}`
    let docs: { light: DtcgDocument; dark: DtcgDocument }
    try { docs = tokensToDtcg(tokens, { rootGroup: group }) } catch (e) { fail(`${form}: ${(e as Error).message}`); continue }
    if (group === undefined) plain = docs

    // F. JSON round trip
    if (JSON.stringify(JSON.parse(JSON.stringify(docs))) !== JSON.stringify(docs)) fail(`${form}: the documents do not survive a JSON round trip`)

    const paths = { light: flat(docs.light), dark: flat(docs.dark) }
    // A. the count
    for (const mode of ['light', 'dark'] as const) if (paths[mode].size !== ROSTER.length) fail(`${form} ${mode}: ${paths[mode].size} tokens, the roster has ${ROSTER.length}`)
    // C. the same paths in both modes
    if ([...paths.light.keys()].join('|') !== [...paths.dark.keys()].join('|')) fail(`${form}: light and dark hold different paths`)

    for (const mode of ['light', 'dark'] as const) {
      // G. the nested form is the plain form and nothing else
      if (group !== undefined && plain) {
        if (Object.keys(docs[mode]).join('|') !== group) fail(`${form} ${mode}: the document root holds ${Object.keys(docs[mode]).join(', ')}, expected ${group} alone`)
        else if (unrooted(docs[mode], group) !== JSON.stringify(plain[mode])) fail(`${form} ${mode}: with the group taken off, the document differs from the plain form`)
      }

      // the nested form's Figma twin is the path the extended plugin writes
      const figma = Object.fromEntries(Object.entries(flatFigma(tree[mode])).map(([p, v]) => [group === undefined ? p : registerPath(p), v]))
      const seen = new Set<string>()
      for (const [dotted, t] of paths[mode]) {
        tokensChecked++
        const path = dotted.split('.')
        const label = `${form} ${mode} ${dotted}`
        // B. the token itself
        if (!path.every(legalName)) fail(`${label}: illegal name`)
        if (t.$type !== 'color') fail(`${label}: $type is ${String(t.$type)}`)
        if (typeof t.$description !== 'string' || !t.$description.trim()) fail(`${label}: no description`)
        if (typeof t.$value === 'string') aliases++
        else {
          const v = t.$value
          if (v.colorSpace !== 'srgb') fail(`${label}: colorSpace ${v.colorSpace}`)
          if (!(v.components.length === 3 && v.components.every(x => x >= 0 && x <= 1))) fail(`${label}: components out of range`)
          if (!(v.alpha >= 0 && v.alpha <= 1)) fail(`${label}: alpha out of range`)
          if (!/^#[0-9a-f]{6}$/.test(v.hex)) fail(`${label}: hex ${v.hex}`)
          const back = '#' + v.components.map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('')
          if (back !== v.hex) fail(`${label}: components round to ${back}, hex is ${v.hex}`)
        }
        const value = resolveToken(t, paths[mode], label)
        // D. the CSS twin, which never carries the root group
        if (group !== undefined && path[0] !== group) fail(`${label}: not under ${group}`)
        const cssName = (group === undefined ? path : path.slice(1)).join('-')
        if (!em.light.has(cssName) && !em.dark.has(cssName)) fail(`${label}: no CSS custom property --${cssName} in the emission`)
        else if (norm(resolved[mode][cssName]) !== value) fail(`${label}: CSS --${cssName} is ${resolved[mode][cssName]}, the document resolves to ${value}`)
        // E. the Figma twin
        const figmaPath = path.join('/')
        seen.add(figmaPath)
        if (!(figmaPath in figma)) fail(`${label}: no Figma leaf ${figmaPath}`)
        else if (figma[figmaPath] !== value) fail(`${label}: Figma ${figmaPath} is ${figma[figmaPath]}, the document resolves to ${value}`)
      }
      for (const p of Object.keys(figma)) if (!seen.has(p)) fail(`${form} ${mode}: the Figma tree holds ${p}, which is not in the documents`)
      // D. the emission holds nothing beyond the roster (tokensToDtcg enforces it; stated here for the record)
      const declared = new Set([...em.light.keys(), ...em.dark.keys()])
      const rooted = (p: readonly string[]) => (group === undefined ? p : [group, ...p]).join('.')
      for (const name of declared) {
        const p = ROSTER.find(r => r.join('-') === name)
        if (!p || !paths[mode].has(rooted(p))) fail(`${form}: the emission declares --${name}, which is not in the roster`)
      }
    }
  }
}

// A. a root group that is not a legal segment throws before anything is built
{
  const t = cases[0].theme
  const tokens = themeTokens({ slug: 't', brand: t.themed, secondary: t.secondary?.scale ?? null, secondaryStyle: t.secondary?.style, contrastProfile: PROFILE })
  for (const bad of ['', 'a.b', '$a', '{a}', 'a/b', 'A', 'a b', '-a']) {
    let threw = false
    try { tokensToDtcg(tokens, { rootGroup: bad }) } catch { threw = true }
    if (!threw) fail(`rootGroup ${JSON.stringify(bad)} was accepted`)
  }
}

if (failures.length) {
  console.error(`audit:dtcg FAILED (${failures.length})`)
  for (const f of failures.slice(0, 60)) console.error('  ' + f)
  if (failures.length > 60) console.error(`  ... ${failures.length - 60} more`)
  process.exit(1)
}
console.log(`audit:dtcg ok: ${cases.length} cases in both forms (at the root, and nested under ${COLOR_GROUP}), ${ROSTER.length} tokens per document, ${tokensChecked} tokens checked against the CSS emission and the Figma tree (${aliases} aliases resolved), light and dark on identical paths, JSON round trip clean`)
