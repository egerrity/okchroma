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
// src/reqtoken/profiles.ts (the wcag path is a passthrough), so re-enabling is a column
// list, not a rebuild.
//
// Token shape: the operative `brand-` CATEGORY stays in the token name (brand-primary/*,
// brand-secondary/*), the brand's NAME lives on the extension, so a designer reads
// kirby → brand-primary/paper-1. Neutral + signals keep their identity names.

import { resolveTheme, signalScalesFor, SOFT_ON_CTA_ALPHA, type ResolvedTheme } from '../src/engine/resolve'
import { themeToFigma, type FigmaGroup, type FigmaColorToken } from '../src/engine/figmaRender'
import { SIGNALS } from '../src/engine/signals'
import { OFFSET_ALPHAS, offsetTokenPath, type OffsetRung } from '../src/engine/cssRender'
import { neutralTintHue, type ContrastProfile, type NeutralLevel } from '../src/engine/colorEngine'

export interface FlatTok { path: string; r: number; g: number; b: number; a?: number }

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
  // carry the primary's cta-ink values (extensions override them per brand)
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
  for (const [k, v] of Object.entries(node)) {
    const path = prefix ? `${prefix}/${k}` : k
    if (isLeaf(v)) {
      const [r, g, b] = v.$value.components
      out.push(v.$value.alpha < 1 ? { path, r, g, b, a: v.$value.alpha } : { path, r, g, b })
    } else flatten(v, path, out)
  }
}

// Panel order = creation order (v1's rule; owner layout 2026-07-27: abs poles at the
// system root, then surface/, then alpha/): system → neutral → brand-primary →
// brand-secondary → signals. The system/surface/sink|base|lift|pop planes are NOT here —
// they are scheme-divergent aliases the plugin creates after the abs rows (ordering) and
// wires once the neutral exists. neutral/ink/12 (the OFF-SCALE anchor — pure black in
// light, pure white in dark) is injected right after the last real ink stop, in ladder
// order. ⚠️ Its trigger is the LAST SCALE INK, so a stop renumber moves it: it fired on
// ink/11 → emitted ink/12 pre-collapse, ink/10 → ink/11 through the C33 era, and C49
// restored the original pairing. The alpha/shadow ladder (owner
// 2026-07-27) is pure black at 4/8/12% light; dark is heavier by necessity — near black
// a light-mode alpha vanishes — at 32/48/64%.
function toFlat(g: FigmaGroup, scheme: 'light' | 'dark', includeSecondary: boolean): FlatTok[] {
  const W = { r: 1, g: 1, b: 1 }
  const K = { r: 0, g: 0, b: 0 }
  const dark = scheme === 'dark'
  const out: FlatTok[] = [
    { path: 'system/abs-black', ...K },
    { path: 'system/abs-white', ...W },
    { path: 'system/alpha/transparent', ...W, a: 0 },
    { path: 'system/alpha/scrim', ...K, a: 0.6 },
    // the SOFT ON-CTA primitive (C43 follow-up, owner-named 2026-08-03): the on-text pole
    // at the engine's SOFT_ON_CTA_ALPHA — black in light, white in dark, alpha per
    // mode. The default-model secondary's cta/on aliases this row, never a raw write.
    { path: 'system/alpha/ink', ...(dark ? W : K), a: dark ? SOFT_ON_CTA_ALPHA.dark : SOFT_ON_CTA_ALPHA.light },
    // the decorative cta stroke (owner 2026-07-29, ladder 2026-07-31): black in light, flipped
    // to WHITE in dark, one row per rung — neutral takes 08, secondary 06, primary and the
    // signals 16. Unlike the shadow set below these do NOT scale up in dark: a stroke sits on the
    // fill rather than bleeding into the ground. Brand-independent, so each stays a base row and
    // costs no per-brand overrides — the whole reason C39 chose an alpha over a family stop.
    //
    // offset-12 is GONE, renamed to offset-08 with its value adjusted (owner 2026-07-31). The
    // neutral was its only consumer, so the rename carries every existing binding across; see
    // RENAMED_LEAVES in code.ts, plus the value-correction pass that rewrites the old 0.12 in
    // files that already carry the row — ensure() renames in place WITHOUT re-seeding.
    ...(Object.keys(OFFSET_ALPHAS) as unknown as OffsetRung[]).map(Number).sort((a, b) => a - b)
      .map(r => ({ path: offsetTokenPath(r as OffsetRung), ...(dark ? W : K), a: OFFSET_ALPHAS[r as OffsetRung] })),
    { path: 'system/alpha/shadow-04', ...K, a: dark ? 0.32 : 0.04 },
    { path: 'system/alpha/shadow-08', ...K, a: dark ? 0.48 : 0.08 },
    { path: 'system/alpha/shadow-12', ...K, a: dark ? 0.64 : 0.12 },
  ]
  const neutral: FlatTok[] = []
  flatten(g.neutral as FigmaGroup, 'neutral', neutral)
  for (const t of neutral) {
    out.push(t)
    if (t.path === 'neutral/ink/11') out.push({ path: 'neutral/ink/12', ...(scheme === 'light' ? K : W) })
  }
  // identity rows re-home to the system ABSOLUTES (owner 2026-07-27: the
  // unprocessed inputs sit with the poles — abs-primary/abs-secondary; the
  // family groups stay pure solve output). Brand-overridable like system/link.
  const IDENTITY_HOME: Record<string, string> = {
    'brand-primary/identity': 'system/abs-primary',
    'brand-secondary/identity': 'system/abs-secondary',
  }
  const brandRows: FlatTok[] = []
  flatten(g.brand as FigmaGroup, 'brand-primary', brandRows)
  if (includeSecondary) flatten(g.secondary as FigmaGroup, 'brand-secondary', brandRows)
  for (const t of brandRows) out.push(IDENTITY_HOME[t.path] ? { ...t, path: IDENTITY_HOME[t.path] } : t)
  // signal rows carry the ROLE prefix (critical/warning/positive/info — owner
  // 2026-07-27: the re-pointable in-between tier); g stays keyed by identity
  for (const s of SIGNALS) flatten(g[s.name] as FigmaGroup, s.emitName, out)
  // the SYSTEM LINK trio (Phase 4): system-pathed but BRAND-OVERRIDABLE (unlike the
  // contract-invariant system/* poles — code.ts carves it out of the override skip);
  // rows carry the resolved values (primary's cta-ink, or the custom seed's register).
  // The engine group's link/link-hover/link-pressed leaves are remapped to the
  // system/link/* STATE names (owner regroup 2026-07-27).
  const linkRows: FlatTok[] = []
  flatten(g.link as FigmaGroup, 'system', linkRows)
  const LINK_STATE: Record<string, string> = {
    'system/link': 'system/link/enabled',
    'system/link-hover': 'system/link/hover',
    'system/link-pressed': 'system/link/pressed',
  }
  for (const t of linkRows) out.push({ ...t, path: LINK_STATE[t.path] ?? t.path })
  return out
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
