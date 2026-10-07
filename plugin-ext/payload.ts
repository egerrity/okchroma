// Pure payload builder for plugin v2 (extended collections) — no figma.* here.
// Shared by ui.ts (builds the apply message) and scripts/ext-override-audit.ts (snapshots
// the per-brand override set), so what the audit measures IS what the plugin sends.
//
// v2 axes (owner 2026-07-07, revised after the Enterprise mock):
//   brand   = which extension is applied (ONE per brand — the flat picker stays clean)
//   scheme  = the base's MODE COLUMNS: light · dark.
//
// WCAG ONLY (owner 2026-07-29). The columns used to be wcag · wcag-dark · apca · apca-dark:
// a contrast profile is a re-solve of the same tokens, so it rode the mode axis alongside
// the schemes. The APCA pair is REMOVED — the owner is not authorised to use APCA for
// design decisions, and this plugin was its last exposure. What remains is the plain
// light/dark pair, solved in the WCAG lane. The profile machinery itself stays dormant in
// src/engine/requirements/profiles.ts (the wcag path is a passthrough), so re-enabling is a column
// list, not a rebuild.
//
// Token shape: the operative `brand-` CATEGORY stays in the token name (brand/*,
// brand-alt/*), the brand's NAME lives on the extension, so a designer reads
// kirby → color/brand/paper-1. The signals carry their role names. Every path is the
// engine's own grammar (tokenNames.ts: the slash-joined path the Figma tree already
// spells) under the color group (tokenNames.COLOR_GROUP), the category word a consuming
// system's paths start with. Hand-authored color roles may share the group: the name
// carries no ownership, and code.ts knows the engine's rows by their stamp. On those rows
// a hand edit is not rebuilt (the apply path is create-once + conservative refresh). The
// engine emits primitives only (CATALOG C68).

import { resolveTheme, signalScalesFor, type ResolvedTheme } from '../src/engine/resolve'
import { themeToFigma, groupEntries, type FigmaGroup, type FigmaColorToken, type FigmaLeaf } from '../src/engine/figmaRender'
import { SIGNALS } from '../src/engine/signals'
import { neutralTintHue, type ContrastProfile, type NeutralLevel } from '../src/engine/colorEngine'
import { COLOR_GROUP } from '../src/engine/tokenNames'

// a row is a color: r/g/b, and an alpha when under one
export interface FlatTok { path: string; r: number; g: number; b: number; a?: number }

// THE GROUP: every emitted path takes the color group as the final pass in toFlat().
// ROLE_BANDS is the descope posture's visible set: the leaf prefix of the five stamp rows,
// flat in their family (a role a designer binds; everything else hides when descope is on).
export const ROLE_BANDS = ['stamp-']
const ROOT = `${COLOR_GROUP}/`
export function registerPath(p: string): string {
  return p.startsWith(ROOT) ? p : ROOT + p
}

// The overridable-row rule (EXT_OVERRIDABLE_SYSTEM) lives in src/engine/tokenNames.ts,
// the zero-import module the sandbox bundle can also consume.
export { EXT_OVERRIDABLE_SYSTEM } from '../src/engine/tokenNames'

export type Column = 'light' | 'dark'
export const COLUMNS: Column[] = ['light', 'dark']
// What a column was called BEFORE 2026-07-29, for adopting an existing file's modes in
// place instead of adding duplicates beside them. code.ts resolves a column by stored
// modeId → canonical name → LEGACY name, then renames the adopted mode. Bindings survive
// because Figma keeps the modeId across a rename.
export const LEGACY_COLUMN_NAME: Record<Column, string> = { light: 'wcag', dark: 'wcag-dark' }
// The retired APCA pair. Never written or created again; named only so an existing file
// can be REPORTED as still carrying them (they are the user's to delete — the plugin does
// not remove modes it no longer owns).
export const RETIRED_COLUMN_NAMES = ['apca', 'apca-dark']
export type TokenColumns = Record<Column, FlatTok[]>

// resolveTheme's input, minus the profile — the payload always solves BOTH lanes
// (owner: "always both, no picker"). ctaEscape rides ALONGSIDE (an emit-layer flag, not a
// solve input — the neutral cta escape, Phase 3): stored in the recipe, so backfills and
// re-applies preserve a brand's escape posture.
export type ThemeSpec = Omit<Parameters<typeof resolveTheme>[0], 'contrastProfile'> & {
  ctaEscape?: boolean
  // THE CTA-BORDER OPT-OUT (owner 2026-07-31: "on by default but optional"). ABSENT = ON, so
  // every recipe stored before this flag existed keeps its strokes on re-apply/backfill.
  ctaBorder?: boolean
  // the SYSTEM LINK's custom seed (Phase 4) — one link per theme; absent = the link rows
  // carry the primary's pen-stop values (extensions override them per brand)
  linkHex?: string | null
  // the NEUTRAL's tint-hue source (owner 2026-08-04): absent = the primary's hue (every
  // stored recipe replays byte-identical). 'secondary' stores the SOURCE, never a frozen
  // hue — re-applies/backfills follow the brand's CURRENT secondary; 'custom' reads
  // neutralHex's hue. Resolution + fallbacks live in colorEngine.neutralTintHue — lane()
  // is the one place this payload resolves it.
  neutralSource?: 'secondary' | 'custom'
  neutralHex?: string | null
}

// The base collection's documented default seed (owner decision: fixed engine default —
// symmetric, every real brand is an extension). Secondary seed = the derived pastel;
// neutral seed = the default level tinted to this hue; signals seed = the CANONICAL ramps
// (unshifted — a brand's collision-shifted signal becomes that brand's override).
export const BASE_SEED_HEX = '#E93D82'

const isLeaf = (n: FigmaLeaf | FigmaGroup): n is FigmaColorToken => '$type' in n && n.$type === 'color'

function flatten(node: FigmaGroup, prefix: string, out: FlatTok[]): void {
  // groupEntries (figmaRender.ts), not Object.entries: a group of bare-digit leaves is
  // JS integer keys and gets silently re-sorted ascending otherwise, reversing the
  // TOKEN_ORDER panel contract (adversarial-audit-caught 2026-08-07, when paper/chalk
  // leaves WERE bare digits; flat band leaves aren't, but the rule stays cheap).
  for (const [k, v] of groupEntries(node)) {
    const path = prefix ? `${prefix}/${k}` : k
    if (isLeaf(v)) {
      const [r, g, b] = v.$value.components
      out.push(v.$value.alpha < 1 ? { path, r, g, b, a: v.$value.alpha } : { path, r, g, b })
    } else if (!('$type' in v)) flatten(v, path, out)
  }
}

// Panel order = creation order: the tree's own order, the neutral with its poles, the
// brand, the alt, the four signals by role, the link trios, the seed absolutes. Every
// leaf ships as the tree spells it; the color group is the one addition.
function toFlat(g: FigmaGroup, includeSecondary: boolean): FlatTok[] {
  const out: FlatTok[] = []
  for (const [k, v] of groupEntries(g)) {
    if (!includeSecondary && k === 'brand-alt') continue
    if ('$type' in v) continue
    if (k === 'absolute' && !includeSecondary) {
      const abs: FlatTok[] = []
      flatten(v as FigmaGroup, k, abs)
      out.push(...abs.filter(t => t.path !== 'absolute/brand-alt'))
      continue
    }
    flatten(v as FigmaGroup, k, out)
  }
  return out.map(t => ({ ...t, path: registerPath(t.path) }))
}

// The WCAG lane: resolve → themeToFigma → the two scheme columns.
// `canonicalSignals` = the base seed's posture (unshifted ramps); a brand passes false
// and carries its collision overrides, which the diff turns into extension overrides.
function lane(
  input: ThemeSpec, profile: ContrastProfile | undefined, neutralLevel: NeutralLevel,
  canonicalSignals: boolean, includeSecondary: 'auto' | true,
): { light: FlatTok[]; dark: FlatTok[]; theme: ResolvedTheme } {
  const t = resolveTheme({ ...input, contrastProfile: profile })
  const sigScales = signalScalesFor(profile)
  const signals = SIGNALS.map(s => {
    // the escape resets red to canonical: with the brand's fills on the neutral register
    // nothing collides, so the per-brand red variant is dropped (brandCss does the same)
    const ov = canonicalSignals || (input.ctaEscape && s.name === 'red')
      ? undefined : t.themed.signalOverrides.find(o => o.name === s.name)
    return { name: s.name, scale: ov?.scale ?? sigScales.get(s.name)!.scale }
  })
  const { light, dark } = themeToFigma(t.themed, {
    secondary: t.secondary?.scale ?? null,
    secondaryStyle: t.secondary?.style,
    neutralLevel,
    // the neutral's tint hue, resolved HERE (the one payload-side site) so a stored
    // "Match secondary" recipe follows the brand's current secondary on every re-apply
    neutralH: neutralTintHue(t.themed.scale.brandH, input.neutralSource, t.secondary?.scale.brandH, input.neutralHex),
    signals,
    contrastProfile: profile,
    ctaEscape: input.ctaEscape,
    linkHex: input.linkHex,
    ctaBorder: input.ctaBorder,
  })
  const inc = includeSecondary === true || !!t.secondary
  return { light: toFlat(light, inc), dark: toFlat(dark, inc), theme: t }
}

function columns(input: ThemeSpec, neutralLevel: NeutralLevel, canonicalSignals: boolean, includeSecondary: 'auto' | true): TokenColumns {
  const w = lane(input, undefined, neutralLevel, canonicalSignals, includeSecondary) // undefined profile = the wcag lane
  return { 'light': w.light, 'dark': w.dark }
}

// The apply payload for a brand — both schemes, collision overrides merged.
// The payload ALWAYS carries a brand-alt: the brand's own (hex or derived-by-choice)
// when it brings one, otherwise the DERIVED pastel from its primary (owner 2026-07-07 —
// no brand ever has a blank or wrong-hue secondary; supersedes v1's mirror). Whether those
// paths are WRITTEN is the file's posture, decided in code.ts.
export function buildBrandColumns(input: ThemeSpec, neutralLevel: NeutralLevel): TokenColumns {
  const spec: ThemeSpec = (!input.secondaryHex && !input.deriveSecondary)
    ? { ...input, deriveSecondary: true }
    : input
  return columns(spec, neutralLevel, false, true)
}

// The base collection's seed set. brand-alt is ALWAYS included (the derived pastel):
// at base creation it's written only when the file's posture says so, and it's the seed for
// a later "add a secondary to the base" apply.
// seedHex: the base "theme" collection's seed color — the fixed okchroma baseline by
// default, or the file's OWN stored seed (the rebuild feature, owner 2026-08-03: "a way
// to redo the main theme … or change it to a different color"). The secondary stays
// DERIVED from the seed (owner ruling: the baseline is self-contained — one input).
export function buildBaseColumns(seedHex: string = BASE_SEED_HEX): TokenColumns {
  return columns(
    { primaryHex: seedHex, name: 'okchroma', primaryMode: 'recommended', secondaryHex: null, deriveSecondary: true },
    'default', true, true,
  )
}

// The RETIRED-DEFAULT neutral rows (the 2026-08-11 default-tint retune, owner: adopt the
// new default on re-apply): the base's create-once neutral rows were seeded at the old
// default strength, which lives on as the 'medium' rung — so "what the old engine wrote"
// is computable live from the same seed, no frozen value table. code.ts heals a base
// neutral row to the current payload only while its value still EXACTLY matches this
// column set (OUR value); a designer's re-valued row never matches and is left alone.
export function buildRetiredNeutralRows(seedHex: string = BASE_SEED_HEX): TokenColumns {
  const cols = columns(
    { primaryHex: seedHex, name: 'okchroma', primaryMode: 'recommended', secondaryHex: null, deriveSecondary: true },
    'medium', true, true,
  )
  const neutral = registerPath('neutral/')
  return {
    light: cols.light.filter(t => t.path.startsWith(neutral)),
    dark: cols.dark.filter(t => t.path.startsWith(neutral)),
  }
}
