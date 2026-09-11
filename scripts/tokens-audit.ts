// The structured-emit and interaction-register gate.
//
//   A. the reader is complete: every `--name:` line the emitters write outside the
//      display-p3 groups lands in the object with the same raw value
//   B. every value resolves: no var() left, no undefined, both modes carry every name
//   C. mode-invariant names are the ones declared once (identity, the opacity ladder)
//   D. the register has every family and every row, on legal rungs, rung rows as rgba
//      at the ladder's alpha, and its CSS reads back to the same rows
//   E. the contract's claim holds on the register: `fg` and `fg-strong` clear the
//      4.5:1 body-text bar over every subtle and hint rung composited over every paper
//      of the family and of the neutral, both modes, across the fixture roster
//
// Failures print worst-first with the fixture hex. Nothing here is blessed: a value
// that fails the bar is a finding against the ladder or the stop, not a snapshot to update.

import { FIXTURES } from './fixture'
import { resolveTheme } from '../src/engine/resolve'
import { signalsCss, brandCss } from '../src/engine/cssRender'
import { themeTokens, readEmission, systemCss, type ThemeTokens } from '../src/engine/tokensRender'
import {
  interactionCss, interactionTokens, interactionRows, interactionVarName, interactionLadderIsLegal,
  INTERACTION_FAMILIES, INTERACTION_ROWS, INTERACTION_LADDER, INTERACTION_POLE_FAMILY,
} from '../src/engine/interaction'
import { OPACITY_RUNGS } from '../src/engine/cssRender'
import { contrastRatio } from '../src/engine/constraints'
import { stopTokenName, PAPER_0, PEN_100 } from '../src/engine/tokenNames'
import { CSS_FAMILY } from '../src/engine/tokenDescriptions'

const PROFILE = 'wcag' as const
const BODY_BAR = 4.5

const failures: string[] = []
const fail = (msg: string) => failures.push(msg)

// ── color helpers (sRGB, the rendition object consumers read) ────────────────
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
// browsers composite CSS rgba over the ground in gamma-encoded sRGB
const over = (fg: [number, number, number, number], bg: [number, number, number]): [number, number, number] =>
  [0, 1, 2].map(i => Math.round(fg[3] * fg[i] + (1 - fg[3]) * bg[i])) as [number, number, number]

// ── the roster ───────────────────────────────────────────────────────────────
let checked = 0
let minContrast = Infinity
let minWhere = ''

for (const fx of FIXTURES) {
  const theme = resolveTheme({
    primaryHex: fx.hex,
    name: fx.slug,
    deriveSecondary: true,
    exact: fx.exact,
    archetypeOverride: fx.archetypeOverride,
    style: fx.style,
    contrastProfile: PROFILE,
  })
  const input = {
    slug: fx.slug,
    brand: theme.themed,
    secondary: theme.secondary?.scale ?? null,
    secondaryStyle: theme.secondary?.style,
    contrastProfile: PROFILE,
  }
  const base: ThemeTokens = themeTokens(input)

  // A. completeness against the raw emission, P3 groups excluded
  const css = [signalsCss(PROFILE), systemCss(), brandCss(fx.slug, fx.slug, theme.themed, input.secondary, '', 'default', PROFILE, input.secondaryStyle, undefined, null, true, undefined)].join('\n')
  const expected = new Set<string>()
  {
    let depth = 0, skip = -1
    for (const line of css.split('\n')) {
      const t = line.trim()
      if (t.endsWith('{')) { if (t.startsWith('@') && skip < 0) skip = depth; depth++; continue }
      if (t === '}') { depth--; if (skip >= 0 && depth === skip) skip = -1; continue }
      if (skip >= 0 || !t.startsWith('--')) continue
      const name = t.slice(2, t.indexOf(':')).trim()
      expected.add(name)
    }
  }
  for (const name of expected) {
    if (!(name in base.raw.light) && !(name in base.raw.dark)) fail(`${fx.slug} ${fx.hex}: reader missed --${name}`)
  }
  if (base.names.length !== expected.size) fail(`${fx.slug} ${fx.hex}: reader saw ${base.names.length} names, emission has ${expected.size}`)

  // B. resolution
  for (const mode of ['light', 'dark'] as const) {
    for (const name of base.names) {
      const v = base[mode][name]
      if (v === undefined) fail(`${fx.slug} ${fx.hex}: ${mode} lacks --${name}`)
      else if (v.includes('var(')) fail(`${fx.slug} ${fx.hex}: ${mode} --${name} left unresolved: ${v}`)
      else if (v.includes('undefined')) fail(`${fx.slug} ${fx.hex}: ${mode} --${name} is undefined`)
    }
  }

  // C. invariants: identity and the opacity ladder are declared once or equal in both
  for (const must of [`${CSS_FAMILY.brandPrimary}-identity`, 'opacity-008', 'alpha-transparent', 'disabled-opacity'])
    if (!base.invariant.includes(must)) fail(`${fx.slug} ${fx.hex}: --${must} should be mode-invariant`)

  // D. the register
  if (!interactionLadderIsLegal()) fail('interaction ladder uses a rung outside INTERACTION_RUNGS')
  const full = interactionTokens(base)
  for (const family of INTERACTION_FAMILIES) {
    for (const mode of ['light', 'dark'] as const) {
      const rows = interactionRows(family, mode, base)
      if (rows.length !== INTERACTION_ROWS.length) fail(`${fx.slug}: ${family} ${mode} has ${rows.length} rows`)
      for (const [row, value] of rows) {
        const key = interactionVarName(family, row).slice(2)
        if (!(key in full[mode])) fail(`${fx.slug}: ${mode} tokens lack --${key}`)
        else if (full[mode][key].includes('var(') || full[mode][key].includes('undefined')) fail(`${fx.slug}: ${mode} --${key} unresolved: ${full[mode][key]}`)
        const tier = row.startsWith('subtle-') ? 'subtle' : row.startsWith('hint-') ? 'hint' : null
        if (tier) {
          const state = row.split('-').pop() as keyof (typeof INTERACTION_LADDER)['subtle']
          const rung = INTERACTION_LADDER[tier][state]
          if (rung === null) {
            if (!value.startsWith('var(--alpha-transparent')) fail(`${fx.slug}: ${family} ${row} should rest transparent, got ${value}`)
          } else {
            const p = rgbaOf(value)
            if (!p) fail(`${fx.slug}: ${family} ${mode} ${row} is not rgba: ${value}`)
            else if (p[3] !== OPACITY_RUNGS[rung]) fail(`${fx.slug}: ${family} ${mode} ${row} alpha ${p[3]} is not rung ${rung}`)
          }
        }
      }
    }
  }
  // the CSS reads back to the same rows
  {
    const back = readEmission(interactionCss(fx.slug, base))
    for (const family of INTERACTION_FAMILIES) {
      for (const [row, value] of interactionRows(family, 'light', base)) {
        const got = back.light.get(interactionVarName(family, row).slice(2))
        if (got !== value) fail(`${fx.slug}: interactionCss light --${interactionVarName(family, row).slice(2)} reads back ${got}, emitted ${value}`)
      }
      for (const [row, value] of interactionRows(family, 'dark', base)) {
        const key = interactionVarName(family, row).slice(2)
        const got = back.dark.get(key) ?? back.light.get(key)
        if (got !== value) fail(`${fx.slug}: interactionCss dark --${key} reads back ${got}, emitted ${value}`)
      }
    }
  }

  // E. the contract's claim on the register: body text over every rung over every paper
  for (const family of INTERACTION_FAMILIES) {
    const isPole = family === INTERACTION_POLE_FAMILY.strong || family === INTERACTION_POLE_FAMILY.inverse
    const paperFamilies = isPole ? [CSS_FAMILY.neutral] : [family, CSS_FAMILY.neutral]
    for (const mode of ['light', 'dark'] as const) {
      const rows = new Map(interactionRows(family, mode, base))
      const texts: Array<['fg' | 'fg-strong', string]> = [['fg', full[mode][`${family}-fg`]], ['fg-strong', full[mode][`${family}-fg-strong`]]]
      // the inverse family is the paper pole used on INVERTED grounds (a pen fill), so it
      // is judged there; every other family is judged over the papers
      const grounds: Array<[string, string]> = family === INTERACTION_POLE_FAMILY.inverse
        ? [
            [PEN_100, base[mode][PEN_100]],
            ...[10, 11].map(i => [`${CSS_FAMILY.neutral}-${stopTokenName(i)}`, base[mode][`${CSS_FAMILY.neutral}-${stopTokenName(i)}`]] as [string, string]),
          ]
        : [
            [PAPER_0, base[mode][PAPER_0]],
            ...paperFamilies.flatMap(pf => [1, 2, 3].map(i => [`${pf}-${stopTokenName(i)}`, base[mode][`${pf}-${stopTokenName(i)}`]] as [string, string])),
          ]
      for (const [row, value] of rows) {
        const layer = rgbaOf(value)
        if (!layer) continue
        for (const [groundName, groundHex] of grounds) {
          const composite = over(layer, hexToRgb(groundHex))
          for (const [textRow, textHex] of texts) {
            const ratio = contrastRatio(luminance(hexToRgb(textHex)), luminance(composite))
            checked++
            if (ratio < minContrast) { minContrast = ratio; minWhere = `${fx.slug} ${family} ${mode} ${textRow} on ${row} over ${groundName}` }
            if (ratio < BODY_BAR) fail(`${fx.slug} ${fx.hex}: ${family} ${mode} ${textRow} on ${row} over ${groundName} = ${ratio.toFixed(2)}:1 (bar ${BODY_BAR})`)
          }
        }
      }
    }
  }
}

if (failures.length) {
  console.error(`audit:tokens FAILED (${failures.length})`)
  for (const f of failures.slice(0, 60)) console.error('  ' + f)
  if (failures.length > 60) console.error(`  ... ${failures.length - 60} more`)
  process.exit(1)
}
console.log(`audit:tokens ok: ${FIXTURES.length} fixtures, ${INTERACTION_FAMILIES.length} families, ${INTERACTION_ROWS.length} rows; ${checked} text-over-rung-over-paper pairings all clear ${BODY_BAR}:1; tightest ${minContrast.toFixed(2)}:1 at ${minWhere}`)
