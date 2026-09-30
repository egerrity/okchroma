// The register's text-bar audit, as it ran in audit:tokens while the register shipped
// (the D and E checks). Reproduced here so the record can be re-run against the current
// engine: the register rows are built from today's structured emit through the moved
// interaction.ts. Not part of any npm script.
import { FIXTURES } from '../../scripts/fixture'
import { resolveTheme } from '../../src/engine/resolve'
import { themeTokens, type ThemeTokens } from '../../src/engine/tokensRender'
import { contrastRatio } from '../../src/engine/constraints'
import { stopTokenName } from '../../src/engine/tokenNames'
import { CSS_FAMILY } from '../../src/engine/tokenDescriptions'
import {
  interactionTokens, interactionRows, interactionLadderIsLegal, OPACITY_RUNGS,
  INTERACTION_FAMILIES, INTERACTION_ROWS, INTERACTION_LADDER, INTERACTION_POLE_FAMILY,
} from './interaction'

const PROFILE = 'wcag' as const
const BODY_BAR = 4.5
const failures: string[] = []
const fail = (msg: string) => failures.push(msg)

const hexToRgb = (hex: string): [number, number, number] => {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
  if (!m) throw new Error(`not a hex: ${hex}`)
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)]
}
const rgbaOf = (v: string): [number, number, number, number] | null => {
  const m = /^rgba\((\d+), (\d+), (\d+), ([0-9.]+)\)$/.exec(v)
  return m ? [+m[1], +m[2], +m[3], +m[4]] : null
}
const lin = (c: number) => { const s = c / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 }
const luminance = (rgb: [number, number, number]) => 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2])
const over = (fg: [number, number, number, number], bg: [number, number, number]): [number, number, number] =>
  [0, 1, 2].map(i => Math.round(fg[3] * fg[i] + (1 - fg[3]) * bg[i])) as [number, number, number]

// the register was written against the pre-C68 pole names; the structured emit spells
// them inside the neutral now, so the poles are re-keyed for it
const withOldPoleNames = (t: ThemeTokens): ThemeTokens => {
  const alias = (m: Record<string, string>) => ({ ...m, 'paper-0': m['neutral-paper-0'], 'pen-100': m['neutral-pen-100'], 'alpha-transparent': 'transparent' })
  return { ...t, light: alias(t.light), dark: alias(t.dark), raw: { light: alias(t.raw.light), dark: alias(t.raw.dark) } }
}

let checked = 0, minContrast = Infinity, minWhere = ''
for (const fx of FIXTURES) {
  const theme = resolveTheme({ primaryHex: fx.hex, name: fx.slug, deriveSecondary: true, exact: fx.exact, archetypeOverride: fx.archetypeOverride, style: fx.style, contrastProfile: PROFILE })
  const base = withOldPoleNames(themeTokens({ slug: fx.slug, brand: theme.themed, secondary: theme.secondary?.scale ?? null, secondaryStyle: theme.secondary?.style, contrastProfile: PROFILE }))
  if (!interactionLadderIsLegal()) fail('interaction ladder uses a rung outside INTERACTION_RUNGS')
  const full = interactionTokens(base)
  for (const family of INTERACTION_FAMILIES) {
    const isPole = family === INTERACTION_POLE_FAMILY.strong || family === INTERACTION_POLE_FAMILY.inverse
    const paperFamilies = isPole ? [CSS_FAMILY.neutral] : [family, CSS_FAMILY.neutral]
    for (const mode of ['light', 'dark'] as const) {
      const rows = interactionRows(family, mode, base)
      if (rows.length !== INTERACTION_ROWS.length) fail(`${fx.slug}: ${family} ${mode} has ${rows.length} rows`)
      for (const [row, value] of rows) {
        const tier = row.startsWith('subtle-') ? 'subtle' : row.startsWith('hint-') ? 'hint' : null
        if (!tier) continue
        const state = row.split('-').pop() as keyof (typeof INTERACTION_LADDER)['subtle']
        const rung = INTERACTION_LADDER[tier][state]
        if (rung !== null) { const p = rgbaOf(value); if (!p || p[3] !== OPACITY_RUNGS[rung]) fail(`${fx.slug}: ${family} ${mode} ${row} is not rung ${rung}: ${value}`) }
      }
      const texts: Array<[string, string]> = [['fg', full[mode][`${family}-fg`]], ['fg-strong', full[mode][`${family}-fg-strong`]]]
      const grounds: Array<[string, string]> = isPole
        ? [family === INTERACTION_POLE_FAMILY.inverse ? ['pen-100', base[mode]['pen-100']] : ['paper-0', base[mode]['paper-0']]]
        : [['paper-0', base[mode]['paper-0']], ...paperFamilies.flatMap(pf => [1, 2, 3].map(i => [`${pf}-${stopTokenName(i)}`, base[mode][`${pf}-${stopTokenName(i)}`]] as [string, string]))]
      for (const [row, value] of rows) {
        const layer = rgbaOf(value)
        if (!layer) continue
        for (const [groundName, groundHex] of grounds) {
          const composite = over(layer, hexToRgb(groundHex))
          for (const [textRow, textHex] of texts) {
            const ratio = contrastRatio(luminance(hexToRgb(textHex)), luminance(composite))
            checked++
            if (ratio < minContrast) { minContrast = ratio; minWhere = `${fx.slug} ${family} ${mode} ${textRow} on ${row} over ${groundName}` }
            if (ratio < BODY_BAR) fail(`${fx.slug} ${fx.hex}: ${family} ${mode} ${textRow} on ${row} over ${groundName} = ${ratio.toFixed(2)}:1`)
          }
        }
      }
    }
  }
}
if (failures.length) { console.error(`register record: ${failures.length} failure(s)`); for (const f of failures.slice(0, 40)) console.error('  ' + f); process.exit(1) }
console.log(`register record: ${FIXTURES.length} fixtures, ${INTERACTION_FAMILIES.length} families; ${checked} pairings clear ${BODY_BAR}:1; tightest ${minContrast.toFixed(2)}:1 at ${minWhere}`)
