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
// Token shape: the operative `brand-` CATEGORY stays in the token name (brand-primary/*,
// brand-secondary/*), the brand's NAME lives on the extension, so a designer reads
// kirby → base/brand-primary/paper-99. Neutral + signals keep their identity names.
// Every path carries an OWNERSHIP-ZONE prefix (owner ruling 2026-08-18, replacing the
// primitive/ register): base/ = engine-owned rows — hand edits there are NOT rebuilt
// (the apply path is create-once + conservative refresh), so the zone name is the
// warning; utility/ = team-touchable rows the engine never depends on (changing them
// cannot break a solve), written LAST so they shelve together. A future semantic tier
// is its OWN single-mode collection (owner preference) or a third zone beside these.

import { resolveTheme, signalScalesFor, SOFT_ON_CTA_ALPHA, type ResolvedTheme } from '../src/engine/resolve'
import { themeToFigma, groupEntries, type FigmaGroup, type FigmaColorToken } from '../src/engine/figmaRender'
import { SIGNALS } from '../src/engine/signals'
import { OFFSET_ALPHAS, offsetTokenPath, type OffsetRung } from '../src/engine/cssRender'
import { neutralTintHue, type ContrastProfile, type NeutralLevel } from '../src/engine/colorEngine'
import { FAMILIES } from '../src/engine/tokenDescriptions'
import { stopTokenName, INK_0 } from '../src/engine/tokenNames'

export interface FlatTok { path: string; r: number; g: number; b: number; a?: number }

// THE ZONE MAP (owner ruling 2026-08-18, replacing the primitive/ register): family
// rows take the base/ zone as the FINAL pass in toFlat(), after IDENTITY_HOME and
// LINK_STATE have already re-homed their rows — this function only prefixes the
// settled path, it never renames. System-descended rows are built with their zone
// spellings directly (see toFlat). ROLE_BANDS stays the descope posture's VISIBLE
// set (a state-carrying role a designer binds; everything else hides when descope
// is on).
const FAMILY_PREFIXES = FAMILIES.map(f => f + '/')
export const ROLE_BANDS = ['solid/']
export function registerPath(p: string): string {
  if (p.startsWith('base/') || p.startsWith('utility/')) return p // already zoned (system-descended rows)
  const fam = FAMILY_PREFIXES.find(f => p.startsWith(f))
  if (!fam) return p                                              // defensive: unknown untouched
  return 'base/' + p
}

// The ownership rosters (CONTRACT_INVARIANT_ROWS, EXT_NON_OVERRIDABLE,
// EXT_OVERRIDABLE_SYSTEM) live in src/engine/tokenNames.ts — the zero-import module
// the sandbox bundle can also consume; this file re-exports them for the audit.
export { CONTRACT_INVARIANT_ROWS, EXT_NON_OVERRIDABLE, EXT_OVERRIDABLE_SYSTEM } from '../src/engine/tokenNames'

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
  // carry the primary's ink-stop values (extensions override them per brand)
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

const isLeaf = (n: FigmaColorToken | FigmaGroup): n is FigmaColorToken => '$type' in n

function flatten(node: FigmaGroup, prefix: string, out: FlatTok[]): void {
  // groupEntries (figmaRender.ts), not Object.entries: a group of bare-digit leaves is
  // JS integer keys and gets silently re-sorted ascending otherwise, reversing the
  // TOKEN_ORDER panel contract (adversarial-audit-caught 2026-08-07, when paper/wash
  // leaves WERE bare digits; flat band leaves aren't, but the rule stays cheap).
  for (const [k, v] of groupEntries(node)) {
    const path = prefix ? `${prefix}/${k}` : k
    if (isLeaf(v)) {
      const [r, g, b] = v.$value.components
      out.push(v.$value.alpha < 1 ? { path, r, g, b, a: v.$value.alpha } : { path, r, g, b })
    } else flatten(v, path, out)
  }
}

// Panel order = creation order (v1's rule; owner layout 2026-08-18: utility leads,
// then the families, then the low-usage machinery tail — link, alpha, absolutes).
// The utility/surface/dim|low|mid|high planes are NOT here — they are scheme-divergent
// aliases the plugin creates FIRST (top of the panel) and wires once the neutral
// exists. neutral/ink-0 (the OFF-SCALE anchor — pure black in
// light, pure white in dark) is injected right after the last real ink stop, in ladder
// order. ⚠️ Its trigger is the LAST SCALE INK, so a stop renumber (or a relabel of
// that stop's leaf) moves it: it fired on ink/11 → emitted ink/12 pre-collapse, ink/10 →
// ink/11 through the C33 era, C49 restored the original pairing (ink/11 → ink/12), Stage
// B relabeled the pair to ink/30-aaa → ink/0, and the band flattening (owner 2026-08-12)
// flattened it to ink-30-aaa → ink-0 — same stop index, same trigger position, new
// strings. The alpha/shadow ladder (owner
// 2026-07-27) is pure black at 4/8/12% light; dark is heavier by necessity — near black
// a light-mode alpha vanishes — at 32/48/64%.
function toFlat(g: FigmaGroup, scheme: 'light' | 'dark', includeSecondary: boolean): FlatTok[] {
  const W = { r: 1, g: 1, b: 1 }
  const K = { r: 0, g: 0, b: 0 }
  const dark = scheme === 'dark'
  // EMIT ORDER = PANEL ORDER (owner 2026-08-18): the utility shelf leads (the
  // surfaces, plugin-created, come before even these), the families follow, and the
  // low-usage machinery — link, alpha, absolutes — trails the collection. Alias
  // targets living in the tail is safe: code.ts seeds a missing-target row raw and
  // its conversion walk re-points the raw onto the alias in the same apply.
  const out: FlatTok[] = [
    // shadows + the scrim: utility zone (classic hand-tuned rows — the engine never
    // reads them back; the scrim spelled by its composition, black at 60%, honest in
    // BOTH modes — owner export 2026-08-18)
    { path: 'utility/shadow-04', ...K, a: dark ? 0.32 : 0.04 },
    { path: 'utility/shadow-08', ...K, a: dark ? 0.48 : 0.08 },
    { path: 'utility/shadow-12', ...K, a: dark ? 0.64 : 0.12 },
    { path: 'utility/abs-black-060', ...K, a: 0.6 },
  ]
  const neutral: FlatTok[] = []
  flatten(g.neutral as FigmaGroup, 'neutral', neutral)
  for (const t of neutral) {
    out.push(t)
    // The trigger is the LAST SCALE INK (stop 11) by its table spelling, so a stop
    // RELABEL rides for free; a renumber still moves the index here.
    if (t.path === 'neutral/' + stopTokenName(11)) out.push({ path: 'neutral/' + INK_0, ...(scheme === 'light' ? K : W) })
  }
  // identity rows re-home to the ABSOLUTES (owner 2026-07-27: the unprocessed inputs
  // sit with the poles; zone spellings 2026-08-18). Brand-overridable like base/link.
  const IDENTITY_HOME: Record<string, string> = {
    'brand-primary/identity': 'base/absolute/primary',
    'brand-secondary/identity': 'base/absolute/secondary',
  }
  const brandRows: FlatTok[] = []
  flatten(g.brand as FigmaGroup, 'brand-primary', brandRows)
  if (includeSecondary) flatten(g.secondary as FigmaGroup, 'brand-secondary', brandRows)
  // identity rows are set aside for the absolutes tail below (panel order)
  const identityRows: FlatTok[] = []
  for (const t of brandRows) {
    if (IDENTITY_HOME[t.path]) identityRows.push({ ...t, path: IDENTITY_HOME[t.path] })
    else out.push(t)
  }
  // signal rows carry the ROLE prefix (critical/warning/positive/info — owner
  // 2026-07-27: the re-pointable in-between tier); g stays keyed by identity
  for (const s of SIGNALS) flatten(g[s.name] as FigmaGroup, s.emitName, out)
  // the LINK trio (Phase 4): BRAND-OVERRIDABLE (unlike the contract-invariant rows —
  // code.ts carves it out of the override skip via OVERRIDABLE_SYSTEM_ROWS); rows
  // carry the resolved values (primary's ink stops, or the custom seed's register).
  // The engine group's link/link-hover/link-pressed leaves are remapped to the
  // base/link/* STATE names (owner regroup 2026-07-27; zone spelling 2026-08-18 —
  // base zone: engine-GENERATED per brand, the leak that killed the old
  // generated-vs-static reading of system/).
  const linkRows: FlatTok[] = []
  flatten(g.link as FigmaGroup, '', linkRows)
  const LINK_STATE: Record<string, string> = {
    'link': 'base/link/default',
    'link-hover': 'base/link/hover',
    'link-pressed': 'base/link/pressed',
  }
  for (const t of linkRows) out.push({ ...t, path: LINK_STATE[t.path] ?? t.path })
  // the INVERSE link trio (owner round 2026-08-19): the link seed re-solved for text on
  // ink-30 surfaces (engine resolveLinkInverseTrio). Same overridable-system posture and
  // the same engine leaf spelling, remapped to state leaves INSIDE the link group (owner
  // regroup 2026-08-20). Values are always resolved raw — there is no alias posture (no
  // family row carries these values).
  const linkInvRows: FlatTok[] = []
  flatten(g['link-inverse'] as FigmaGroup, '', linkInvRows)
  const LINK_INVERSE_STATE: Record<string, string> = {
    'link': 'base/link/inverse',
    'link-hover': 'base/link/inverse-hover',
    'link-pressed': 'base/link/inverse-pressed',
  }
  for (const t of linkInvRows) out.push({ ...t, path: LINK_INVERSE_STATE[t.path] ?? t.path })
  // ── the low-usage tail (owner 2026-08-18: built last, panel bottom) ─────────────
  out.push({ path: 'base/alpha/transparent', ...W, a: 0 })
  // the SOFT ON-COLOR primitive (C43 follow-up, owner-named 2026-08-03): the on-text
  // pole at the engine's SOFT_ON_CTA_ALPHA — black in light, white in dark, alpha per
  // mode. The default-model secondary's solid/on aliases this row, never a raw write.
  // base zone: an engine-required input (the alias graph targets it).
  out.push({ path: 'base/alpha/ink', ...(dark ? W : K), a: dark ? SOFT_ON_CTA_ALPHA.dark : SOFT_ON_CTA_ALPHA.light })
  // the decorative stroke's rung ladder (owner 2026-07-29/31): black in light, flipped
  // to WHITE in dark, one row per rung — neutral takes 08, secondary 06, primary and
  // the signals 16. Unlike the shadows these do NOT scale up in dark: a stroke sits on
  // the fill rather than bleeding into the ground. Brand-independent, so each stays a
  // base row and costs no per-brand overrides. (offset-12 died 2026-07-31 — renamed to
  // 08 with its value corrected; see RENAMED_LEAVES + the value-correction pass.)
  for (const r of (Object.keys(OFFSET_ALPHAS) as unknown as OffsetRung[]).map(Number).sort((x, y) => x - y))
    out.push({ path: offsetTokenPath(r as OffsetRung), ...(dark ? W : K), a: OFFSET_ALPHAS[r as OffsetRung] })
  out.push({ path: 'base/absolute/black', ...K })
  out.push({ path: 'base/absolute/white', ...W })
  out.push(...identityRows)
  // THE ZONE PASS (final step): every still-unzoned family path takes base/.
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
    // the escape resets red to canonical (owner 2026-07-16): with the brand's ctas on
    // the neutral register nothing collides — the per-brand red variant is dropped
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
  return { light: toFlat(light, 'light', inc), dark: toFlat(dark, 'dark', inc), theme: t }
}

function columns(input: ThemeSpec, neutralLevel: NeutralLevel, canonicalSignals: boolean, includeSecondary: 'auto' | true): TokenColumns {
  const w = lane(input, undefined, neutralLevel, canonicalSignals, includeSecondary) // undefined profile = the wcag lane
  return { 'light': w.light, 'dark': w.dark }
}

// The apply payload for a brand — both schemes, collision overrides merged.
// The payload ALWAYS carries a brand-secondary: the brand's own (hex or derived-by-choice)
// when it brings one, otherwise the DERIVED pastel from its primary (owner 2026-07-07 —
// no brand ever has a blank or wrong-hue secondary; supersedes v1's mirror). Whether those
// paths are WRITTEN is the file's posture, decided in code.ts.
export function buildBrandColumns(input: ThemeSpec, neutralLevel: NeutralLevel): TokenColumns {
  const spec: ThemeSpec = (!input.secondaryHex && !input.deriveSecondary)
    ? { ...input, deriveSecondary: true }
    : input
  return columns(spec, neutralLevel, false, true)
}

// The base collection's seed set. brand-secondary is ALWAYS included (the derived pastel):
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
  return {
    light: cols.light.filter(t => t.path.startsWith('base/neutral/')),
    dark: cols.dark.filter(t => t.path.startsWith('base/neutral/')),
  }
}
