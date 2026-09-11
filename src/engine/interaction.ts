// The interaction register: the state layer as named rows, per family.
//
// Three tiers of ground plus the text that sits on them. `solid` is the stamp
// (fill, hover, pressed, edge, on). `subtle` and `hint` are the family's
// highlighter-26 at an opacity rung, the one sanctioned translucency; `hint` rests
// transparent and `subtle` rests at the lowest rung. Each tier climbs the ladder
// one rung per state. Two pole families join the seven color families: `neutral-strong`
// is the neutral's pen pole used as a stamp, `neutral-inverse` its paper pole; every
// row in them is a neutral pole, so they flip with the mode as one.
//
// The rung rows ship as literal rgba per mode rather than a CSS color function: native
// renderers have no color-mix, and the number still comes from OPACITY_RUNGS, the one
// ladder. The alias rows stay var() references so they follow the base emission.
import { OPACITY_RUNGS, INTERACTION_RUNGS, TRANSPARENT_VAR, type OpacityRung } from './cssRender'
import { stopTokenName, PAPER_0, PEN_100, STAMP_FILL, STAMP_FILL_HOVER, STAMP_FILL_PRESSED, STAMP_EDGE, STAMP_ON } from './tokenNames'
import { CSS_FAMILY } from './tokenDescriptions'
import { SIGNALS } from './signals'
import { resolveReferences, type ThemeTokens, type TokenMode } from './tokensRender'

export const INTERACTION_POLE_FAMILY = { strong: 'neutral-strong', inverse: 'neutral-inverse' } as const
export type InteractionPoleFamily = (typeof INTERACTION_POLE_FAMILY)[keyof typeof INTERACTION_POLE_FAMILY]

/** every family the register emits, color families first, the two pole families last */
export const INTERACTION_FAMILIES: readonly string[] = [
  CSS_FAMILY.neutral,
  CSS_FAMILY.brandPrimary,
  CSS_FAMILY.brandSecondary,
  ...SIGNALS.map(s => s.emitName),
  INTERACTION_POLE_FAMILY.strong,
  INTERACTION_POLE_FAMILY.inverse,
]

export type InteractionState = 'enabled' | 'hover' | 'pressed' | 'selected'
export const INTERACTION_STATES: readonly InteractionState[] = ['enabled', 'hover', 'pressed', 'selected']

/** the rung each translucent tier takes per state; null is the transparent rest */
export const INTERACTION_LADDER: Record<'subtle' | 'hint', Record<InteractionState, OpacityRung | null>> = {
  subtle: { enabled: 8, hover: 12, pressed: 16, selected: 24 },
  hint: { enabled: null, hover: 8, pressed: 12, selected: 16 },
}

export const INTERACTION_ROWS = [
  'fg', 'fg-strong', 'fg-on-hint',
  'solid-bg-enabled', 'solid-bg-hover', 'solid-bg-pressed', 'solid-border', 'solid-fg',
  'subtle-bg-enabled', 'subtle-bg-hover', 'subtle-bg-pressed', 'subtle-bg-selected',
  'hint-bg-enabled', 'hint-bg-hover', 'hint-bg-pressed', 'hint-bg-selected',
] as const
export type InteractionRow = (typeof INTERACTION_ROWS)[number]

/** the CSS custom property a family's row lives under */
export const interactionVarName = (family: string, row: InteractionRow): string => `--${family}-${row}`

const isPole = (family: string): family is InteractionPoleFamily =>
  family === INTERACTION_POLE_FAMILY.strong || family === INTERACTION_POLE_FAMILY.inverse

const hexChannels = (hex: string): [number, number, number] | null => {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim())
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null
}

/**
 * The name whose channels a family's translucent rows ride: the family's
 * highlighter-26, or the pole for the pole families.
 */
export function interactionTintName(family: string): string {
  if (family === INTERACTION_POLE_FAMILY.strong) return PEN_100
  if (family === INTERACTION_POLE_FAMILY.inverse) return PAPER_0
  return `${family}-${stopTokenName(8)}`
}

/** One family's rows for one mode as [name, value] pairs, aliases as var() and rungs as rgba. */
export function interactionRows(family: string, mode: TokenMode, tokens: ThemeTokens): Array<[InteractionRow, string]> {
  const neutral = CSS_FAMILY.neutral
  const v = (name: string) => `var(--${name})`
  const pen = (stop: number) => `${family}-${stopTokenName(stop)}`
  const tintHex = tokens[mode][interactionTintName(family)]
  const ch = tintHex ? hexChannels(tintHex) : null
  if (!ch) throw new Error(`interactionRows: no sRGB hex for ${interactionTintName(family)} in ${mode}`)
  const at = (rung: OpacityRung | null): string =>
    rung === null ? v(TRANSPARENT_VAR.slice(2)) : `rgba(${ch[0]}, ${ch[1]}, ${ch[2]}, ${OPACITY_RUNGS[rung]})`

  const text: Array<[InteractionRow, string]> = isPole(family)
    ? [['fg', v(interactionTintName(family))], ['fg-strong', v(interactionTintName(family))], ['fg-on-hint', v(interactionTintName(family))]]
    : [['fg', v(pen(10))], ['fg-strong', v(pen(11))], ['fg-on-hint', v(pen(9))]]

  const solid: Array<[InteractionRow, string]> =
    family === INTERACTION_POLE_FAMILY.strong
      ? [
          ['solid-bg-enabled', v(PEN_100)],
          ['solid-bg-hover', v(`${neutral}-${stopTokenName(11)}`)],
          ['solid-bg-pressed', v(`${neutral}-${stopTokenName(10)}`)],
          ['solid-border', v(TRANSPARENT_VAR.slice(2))],
          ['solid-fg', v(PAPER_0)],
        ]
      : family === INTERACTION_POLE_FAMILY.inverse
        ? [
            ['solid-bg-enabled', v(PAPER_0)],
            ['solid-bg-hover', v(`${neutral}-${stopTokenName(2)}`)],
            ['solid-bg-pressed', v(`${neutral}-${stopTokenName(3)}`)],
            ['solid-border', v(TRANSPARENT_VAR.slice(2))],
            ['solid-fg', v(PEN_100)],
          ]
        : [
            ['solid-bg-enabled', v(`${family}-${STAMP_FILL}`)],
            ['solid-bg-hover', v(`${family}-${STAMP_FILL_HOVER}`)],
            ['solid-bg-pressed', v(`${family}-${STAMP_FILL_PRESSED}`)],
            ['solid-border', v(`${family}-${STAMP_EDGE}`)],
            ['solid-fg', v(`${family}-${STAMP_ON}`)],
          ]

  const ladder = (tier: 'subtle' | 'hint'): Array<[InteractionRow, string]> =>
    INTERACTION_STATES.map(state => [`${tier}-bg-${state}` as InteractionRow, at(INTERACTION_LADDER[tier][state])])

  return [...text, ...solid, ...ladder('subtle'), ...ladder('hint')]
}

/** Whether a row's value depends on the mode: only the rung rows carry literals. */
const rowVariesByMode = (row: InteractionRow): boolean => /^(subtle|hint)-bg-/.test(row) && row !== 'hint-bg-enabled'

/**
 * The register as CSS for one brand: every family's rows under the brand scope, the
 * rung rows per mode, then one scope block per family that maps the family-agnostic
 * names (`--solid-bg-enabled`, `--fg`) onto that family, so a component reads one set
 * of names and `data-family` picks the family, the way a mode does on a Figma instance.
 */
export function interactionCss(slug: string, tokens: ThemeTokens): string {
  const scope = `[data-brand="${slug}"]`
  const light: string[] = []
  const dark: string[] = []
  for (const family of INTERACTION_FAMILIES) {
    for (const [row, value] of interactionRows(family, 'light', tokens)) light.push(`  ${interactionVarName(family, row)}: ${value};`)
    for (const [row, value] of interactionRows(family, 'dark', tokens)) if (rowVariesByMode(row)) dark.push(`  ${interactionVarName(family, row)}: ${value};`)
  }
  const scoped = INTERACTION_FAMILIES.flatMap(family => [
    `${scope} [data-family="${family}"], ${scope}[data-family="${family}"] {`,
    ...INTERACTION_ROWS.map(row => `  --${row}: var(${interactionVarName(family, row)});`),
    `}`,
  ])
  return [
    `/* Interaction register: solid, subtle and hint tiers per family, the translucent rows at the engine's opacity rungs */`,
    `${scope} {`,
    ...light,
    `}`,
    `${scope}[data-theme="dark"] {`,
    ...dark,
    `}`,
    ...scoped,
  ].join('\n')
}

/** The base tokens plus the register's rows, resolved to literals per mode. */
export function interactionTokens(tokens: ThemeTokens): ThemeTokens {
  const add = (mode: TokenMode): Map<string, string> => {
    const m = new Map<string, string>()
    for (const family of INTERACTION_FAMILIES)
      for (const [row, value] of interactionRows(family, mode, tokens)) m.set(interactionVarName(family, row).slice(2), value)
    return m
  }
  const rawLight = add('light')
  const rawDark = add('dark')
  const baseLight = new Map(Object.entries(tokens.light))
  const baseDark = new Map(Object.entries(tokens.dark))
  const light = resolveReferences(rawLight, baseLight)
  const dark = resolveReferences(rawDark, baseDark)
  const names = [...tokens.names, ...rawLight.keys()]
  const invariant = [...tokens.invariant, ...[...rawLight.keys()].filter(n => rawLight.get(n) === rawDark.get(n))]
  return {
    slug: tokens.slug,
    names,
    light: { ...tokens.light, ...Object.fromEntries([...rawLight.keys()].map(n => [n, light[n]])) },
    dark: { ...tokens.dark, ...Object.fromEntries([...rawDark.keys()].map(n => [n, dark[n]])) },
    invariant,
    raw: {
      light: { ...tokens.raw.light, ...Object.fromEntries(rawLight) },
      dark: { ...tokens.raw.dark, ...Object.fromEntries(rawDark) },
    },
  }
}

/** every rung the register uses is one of the engine's interaction rungs */
export const interactionLadderIsLegal = (): boolean =>
  (['subtle', 'hint'] as const).every(tier =>
    INTERACTION_STATES.every(s => {
      const r = INTERACTION_LADDER[tier][s]
      return r === null || INTERACTION_RUNGS.includes(r)
    }),
  )
