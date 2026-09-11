// The structured emit: the values the CSS emitters write, as one object per mode.
//
// The CSS emission is the source of truth and its output is frozen. This module reads
// the engine's own emission back instead of re-deriving a single value, so the object
// and the CSS cannot disagree. The reader knows the emitters' block grammar: top-level
// rule blocks, a dark block named by [data-theme="dark"], and the display-p3
// re-emission under @supports, which is skipped because object consumers read the
// sRGB rendition. A name declared once (the identity rows, the opacity ladder) is
// mode-invariant and is carried into both maps, which is what a per-mode consumer
// with no cascade needs.
import { brandCss, signalsCss, SHADOW_ALPHAS, SCRIM_ALPHA, DISABLED_OPACITY, type ShadowRung } from './cssRender'
import { SURFACE_PLANE_LAW, PAPER_0 } from './tokenNames'
import { CSS_FAMILY } from './tokenDescriptions'
import type { GeneratedScale, NeutralLevel, ContrastProfile } from './colorEngine'
import type { ResolvedBrand, SecondaryStyle } from './resolve'

export type TokenMode = 'light' | 'dark'

export interface ThemeTokens {
  slug: string
  /** every emitted name, in emission order */
  names: string[]
  /** resolved literal values per mode; mode-invariant names appear in both */
  light: Record<string, string>
  dark: Record<string, string>
  /** names whose value does not depend on the mode */
  invariant: string[]
  /** the declarations as emitted, var() references intact, per block */
  raw: { light: Record<string, string>; dark: Record<string, string> }
}

export interface ThemeTokensInput {
  slug: string
  displayName?: string
  /** the resolved brand; for a resolved theme pass `theme.themed` */
  brand: ResolvedBrand
  secondary?: GeneratedScale | null
  neutralLevel?: NeutralLevel
  contrastProfile?: ContrastProfile
  secondaryStyle?: SecondaryStyle
  ctaEscape?: boolean
  linkHex?: string | null
  ctaBorder?: boolean
  neutralH?: number
}

const DARK_MARK = '[data-theme="dark"]'

/**
 * Reads the engine's CSS emission into one declaration map per mode. Only the
 * emitters' own grammar is understood: a line ending in `{` opens a block, a line
 * that is `}` closes one, `--name: value;` lines declare. At-rule groups (the
 * display-p3 re-emission) are skipped whole.
 */
export function readEmission(css: string): { light: Map<string, string>; dark: Map<string, string>; order: string[] } {
  const light = new Map<string, string>()
  const dark = new Map<string, string>()
  const order: string[] = []
  let depth = 0
  let skipUntilDepth = -1
  let inDark = false
  let inBlock = false
  for (const line of css.split('\n')) {
    const t = line.trim()
    if (t.endsWith('{')) {
      if (t.startsWith('@')) {
        if (skipUntilDepth < 0) skipUntilDepth = depth
        depth++
        continue
      }
      depth++
      if (skipUntilDepth < 0) {
        inBlock = true
        inDark = t.includes(DARK_MARK)
      }
      continue
    }
    if (t === '}') {
      depth--
      if (skipUntilDepth >= 0 && depth === skipUntilDepth) skipUntilDepth = -1
      inBlock = false
      continue
    }
    if (skipUntilDepth >= 0 || !inBlock || !t.startsWith('--')) continue
    const colon = t.indexOf(':')
    if (colon === -1) continue
    const name = t.slice(2, colon).trim()
    const value = t.slice(colon + 1).replace(/;$/, '').trim()
    const target = inDark ? dark : light
    if (!light.has(name) && !dark.has(name)) order.push(name)
    target.set(name, value)
  }
  return { light, dark, order }
}

const VAR_REF = /var\(--([a-z0-9-]+)(?:\s*,\s*([^)]*))?\)/g

/** Resolves var() references against `own`, falling back to `shared` for names declared once. */
export function resolveReferences(own: Map<string, string>, shared: Map<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  const lookup = (name: string): string | undefined => own.get(name) ?? shared.get(name)
  const resolve = (value: string, depth: number): string =>
    depth > 12
      ? value
      : value.replace(VAR_REF, (_, ref: string, fallback?: string) => {
          const target = lookup(ref)
          if (target !== undefined) return resolve(target, depth + 1)
          return fallback !== undefined ? resolve(fallback.trim(), depth + 1) : `var(--${ref})`
        })
  for (const name of new Set([...own.keys(), ...shared.keys()])) out[name] = resolve(lookup(name)!, 0)
  return out
}

/** The system rows tokens/semantic.css states as static aliases, as engine-table projections. */
export function systemCss(): string {
  const planeRef = (stop: string) => (stop === PAPER_0 ? `var(--${PAPER_0})` : `var(--${CSS_FAMILY.neutral}-${stop})`)
  const pad = (r: string | number) => String(r).padStart(2, '0')
  const lines = (mode: TokenMode): string[] => [
    ...Object.entries(SURFACE_PLANE_LAW).map(([leaf, stops]) => `  --surface-${leaf.split('/').pop()}: ${planeRef(stops[mode])};`),
    ...(Object.keys(SHADOW_ALPHAS).map(Number) as ShadowRung[]).map(r => `  --shadow-${pad(r)}: rgba(0, 0, 0, ${SHADOW_ALPHAS[r][mode]});`),
    `  --scrim: rgba(0, 0, 0, ${SCRIM_ALPHA});`,
    `  --disabled-opacity: ${DISABLED_OPACITY};`,
  ]
  return [':root {', ...lines('light'), '}', `:root${DARK_MARK}, ${DARK_MARK} {`, ...lines('dark'), '}'].join('\n')
}

/** Builds a ThemeTokens object from an emission's declaration maps. */
export function tokensFromEmission(slug: string, css: string): ThemeTokens {
  const { light, dark, order } = readEmission(css)
  const resolvedLight = resolveReferences(light, new Map())
  const resolvedDark = resolveReferences(dark, light)
  const invariant = order.filter(n => !dark.has(n) || (light.has(n) && light.get(n) === dark.get(n)))
  const raw = { light: Object.fromEntries(light), dark: Object.fromEntries(dark) }
  return { slug, names: order, light: resolvedLight, dark: resolvedDark, invariant, raw }
}

/** The whole page's token set for one brand: signals, system rows, and the brand block. */
export function themeTokens(input: ThemeTokensInput): ThemeTokens {
  const css = [
    signalsCss(input.contrastProfile),
    systemCss(),
    brandCss(
      input.slug,
      input.displayName ?? input.slug,
      input.brand,
      input.secondary ?? null,
      '',
      input.neutralLevel ?? 'default',
      input.contrastProfile,
      input.secondaryStyle,
      input.ctaEscape,
      input.linkHex ?? null,
      input.ctaBorder ?? true,
      input.neutralH,
    ),
  ].join('\n')
  return tokensFromEmission(input.slug, css)
}
