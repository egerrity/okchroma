// The structured-emit gate.
//
//   A. the reader is complete: every `--name:` line the emitters write outside the
//      display-p3 groups lands in the object with the same raw value
//   B. every value resolves: no var() left, no undefined, both modes carry every name
//   C. the seed absolutes, declared once, are mode-invariant
//
// Failures print worst-first with the fixture hex. Nothing here is blessed. The value
// agreement of the object with the Figma tree and the DTCG documents is audit:dtcg's job.
import { FIXTURES } from './fixture'
import { resolveTheme } from '../src/engine/resolve'
import { signalsCss, brandCss } from '../src/engine/cssRender'
import { themeTokens, type ThemeTokens } from '../src/engine/tokensRender'
import { absolutePath, cssVarName } from '../src/engine/tokenNames'
import { CSS_FAMILY } from '../src/engine/tokenDescriptions'

const PROFILE = 'wcag' as const

const failures: string[] = []
const fail = (msg: string) => failures.push(msg)

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
  const css = [signalsCss(PROFILE), brandCss(fx.slug, fx.slug, theme.themed, input.secondary, '', 'default', PROFILE, input.secondaryStyle, undefined, null, true, undefined)].join('\n')
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

  // C. invariants: the seed absolutes are declared once (a name whose two mode values
  // happen to be equal, a canonical signal stamp for one, is invariant too)
  for (const must of [cssVarName(absolutePath(CSS_FAMILY.brandPrimary)).slice(2), cssVarName(absolutePath(CSS_FAMILY.brandSecondary)).slice(2)])
    if (!base.invariant.includes(must)) fail(`${fx.slug} ${fx.hex}: --${must} should be mode-invariant`)
}

if (failures.length) {
  console.error(`audit:tokens FAILED (${failures.length})`)
  for (const f of failures.slice(0, 60)) console.error('  ' + f)
  if (failures.length > 60) console.error(`  ... ${failures.length - 60} more`)
  process.exit(1)
}
console.log(`audit:tokens ok: ${FIXTURES.length} fixtures; the reader is complete, every value resolves, the seed absolutes are mode-invariant`)
