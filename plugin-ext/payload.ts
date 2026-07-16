// Pure payload builder for plugin v2 (extended collections) — no figma.* here.
// Shared by ui.ts (builds the apply message) and scripts/ext-override-audit.ts (snapshots
// the per-brand override set), so what the audit measures IS what the plugin sends.
//
// v2 axes (owner 2026-07-07, revised after the Enterprise mock):
//   brand   = which extension is applied (ONE per brand — the flat picker stays clean)
//   solve   = the base's MODE COLUMNS: wcag · wcag-dark · apca · apca-dark.
// A contrast profile is a re-solve of the same tokens — mode-shaped, like light/dark —
// so it lives on the mode axis, not on forked collections or sister extensions. WCAG is
// this plugin’s default (leads, unmarked); apca is the marked extra. The scheme-only names
// extend to future solve conditions (wcag-dark-high-contrast, …).
//
// Token shape: the operative `brand-` CATEGORY stays in the token name (brand-primary/*,
// brand-secondary/*), the brand's NAME lives on the extension, so a designer reads
// kirby → brand-primary/paper-1. Neutral + signals keep their identity names.

import { resolveTheme, signalScalesFor, type ResolvedTheme } from '../src/engine/resolve'
import { themeToFigma, type FigmaGroup, type FigmaColorToken } from '../src/engine/figmaRender'
import { SIGNALS } from '../src/engine/signals'
import type { ContrastProfile, NeutralLevel } from '../src/engine/colorEngine'

export interface FlatTok { path: string; r: number; g: number; b: number; a?: number }

export type Column = 'wcag' | 'wcag-dark' | 'apca' | 'apca-dark'
export const COLUMNS: Column[] = ['wcag', 'wcag-dark', 'apca', 'apca-dark']
export type TokenColumns = Record<Column, FlatTok[]>

// resolveTheme's input, minus the profile — the payload always solves BOTH lanes
// (owner: "always both, no picker"). ctaEscape rides ALONGSIDE (an emit-layer flag, not a
// solve input — the neutral cta escape, Phase 3): stored in the recipe, so backfills and
// re-applies preserve a brand's escape posture.
export type ThemeSpec = Omit<Parameters<typeof resolveTheme>[0], 'contrastProfile'> & { ctaEscape?: boolean }

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

// Panel order = creation order (v1's rule): system → neutral → brand-primary →
// brand-secondary → signals. system/paper-raised + paper-sunken are NOT here — they are
// mode-divergent aliases the plugin creates first and wires after the neutral exists.
// neutral/ink-12 (the anchor) is injected right after ink-11 (ladder order), a scheme-flipping pole.
function toFlat(g: FigmaGroup, scheme: 'light' | 'dark', includeSecondary: boolean): FlatTok[] {
  const W = { r: 1, g: 1, b: 1 }
  const K = { r: 0, g: 0, b: 0 }
  const out: FlatTok[] = [
    { path: 'system/abs-black', ...K },
    { path: 'system/abs-white', ...W },
    { path: 'system/transparent', ...W, a: 0 },
    { path: 'system/scrim', ...K, a: 0.6 },
  ]
  const neutral: FlatTok[] = []
  flatten(g.neutral as FigmaGroup, 'neutral', neutral)
  for (const t of neutral) {
    out.push(t)
    if (t.path === 'neutral/ink-11') out.push({ path: 'neutral/ink-12', ...(scheme === 'light' ? K : W) })
  }
  flatten(g.brand as FigmaGroup, 'brand-primary', out)
  if (includeSecondary) flatten(g.secondary as FigmaGroup, 'brand-secondary', out)
  for (const s of SIGNALS) flatten(g[s.name] as FigmaGroup, s.name, out)
  return out
}

// One profile lane: resolve → themeToFigma → the two scheme columns.
// `canonicalSignals` = the base seed's posture (unshifted ramps); a brand passes false
// and carries its collision overrides, which the diff turns into extension overrides.
function lane(
  input: ThemeSpec, profile: ContrastProfile | undefined, neutralLevel: NeutralLevel,
  canonicalSignals: boolean, includeSecondary: 'auto' | true,
): { light: FlatTok[]; dark: FlatTok[]; theme: ResolvedTheme } {
  const t = resolveTheme({ ...input, contrastProfile: profile })
  const sigScales = signalScalesFor(profile)
  const signals = SIGNALS.map(s => {
    const ov = canonicalSignals ? undefined : t.themed.signalOverrides.find(o => o.name === s.name)
    return { name: s.name, scale: ov?.scale ?? sigScales.get(s.name)!.scale }
  })
  const { light, dark } = themeToFigma(t.themed, {
    secondary: t.secondary?.scale ?? null,
    secondaryStyle: t.secondary?.style,
    neutralLevel,
    signals,
    contrastProfile: profile,
    ctaEscape: input.ctaEscape,
  })
  const inc = includeSecondary === true || !!t.secondary
  return { light: toFlat(light, 'light', inc), dark: toFlat(dark, 'dark', inc), theme: t }
}

function columns(input: ThemeSpec, neutralLevel: NeutralLevel, canonicalSignals: boolean, includeSecondary: 'auto' | true): TokenColumns {
  const w = lane(input, undefined, neutralLevel, canonicalSignals, includeSecondary) // wcag = this plugin’s default lane
  const a = lane(input, 'apca', neutralLevel, canonicalSignals, includeSecondary)
  return { 'wcag': w.light, 'wcag-dark': w.dark, 'apca': a.light, 'apca-dark': a.dark }
}

// The apply payload for a brand — both lanes, both schemes, collision overrides merged.
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
export function buildBaseColumns(): TokenColumns {
  return columns(
    { primaryHex: BASE_SEED_HEX, name: 'okchroma', primaryMode: 'recommended', secondaryHex: null, deriveSecondary: true },
    'default', true, true,
  )
}
