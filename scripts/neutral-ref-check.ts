// Verifies the wired generateNeutralScale reproduces the OWNER-APPROVED output
// in docs/engine-spec/approved-neutrals-reference.md (the 2b verification
// target). Parses the reference JSON, regenerates each hue×level×mode through
// the engine, and diffs every hex + polarity. Exits non-zero on any drift.
import * as fs from 'fs'
import * as path from 'path'
import { generateNeutralScale, type NeutralLevel, type GeneratedScale, type ColorStop } from '../src/engine/colorEngine'

const toHex = (s: ColorStop) => {
  const c = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')
  return `#${c(s.r)}${c(s.g)}${c(s.b)}`.toUpperCase()
}

interface Side { scale: string[]; cta: string; onCtaWhite: boolean; highlight: string; onHighlightWhite: boolean }
const side = (s: GeneratedScale, mode: 'light' | 'dark'): Side => {
  const stops = mode === 'light' ? s.light : s.dark
  return {
    scale: stops.slice(0, 12).map(toHex),
    cta: toHex(mode === 'light' ? s.cta : s.ctaDark), // cta is off-scale (dedicated field)
    onCtaWhite: mode === 'light' ? s.onFillTextIsWhite : s.onFillTextIsWhiteDark,
    highlight: toHex(stops[8]), // index 8 = stop 9 = highlight-9
    onHighlightWhite: (mode === 'light' ? s.onHighlightIsWhite : s.onHighlightIsWhiteDark) ?? false,
  }
}

const refPath = path.join(process.cwd(), 'docs', 'engine-spec', 'approved-neutrals-reference.md')
const md = fs.readFileSync(refPath, 'utf8')
const json = md.slice(md.indexOf('```json') + 7, md.lastIndexOf('```')).trim()
const ref: Array<{ hue: number; name: string; levels: Array<{ level: NeutralLevel; light: Side; dark: Side }> }> = JSON.parse(json)

const fails: string[] = []
for (const { hue, name, levels } of ref) {
  for (const { level, light, dark } of levels) {
    const s = generateNeutralScale(hue, level)
    for (const [mode, want] of [['light', light], ['dark', dark]] as const) {
      const got = side(s, mode)
      const tag = `h${hue}(${name}) ${level} ${mode}`
      got.scale.forEach((g, i) => { if (g !== want.scale[i].toUpperCase()) fails.push(`${tag} stop${i + 1}: ${g} != ${want.scale[i]}`) })
      if (got.cta !== want.cta.toUpperCase()) fails.push(`${tag} cta: ${got.cta} != ${want.cta}`)
      if (got.highlight !== want.highlight.toUpperCase()) fails.push(`${tag} highlight: ${got.highlight} != ${want.highlight}`)
      if (got.onCtaWhite !== want.onCtaWhite) fails.push(`${tag} onCtaWhite: ${got.onCtaWhite} != ${want.onCtaWhite}`)
      if (got.onHighlightWhite !== want.onHighlightWhite) fails.push(`${tag} onHighlightWhite: ${got.onHighlightWhite} != ${want.onHighlightWhite}`)
    }
  }
}

console.log(`neutral-ref-check: ${ref.length} hues × ${ref[0].levels.length} levels × 2 modes`)
if (fails.length) {
  console.error(`FAIL: ${fails.length} mismatches\n` + fails.slice(0, 40).map(s => '  - ' + s).join('\n'))
  process.exit(1)
}
console.log('PASS — generated neutral reproduces the owner-approved reference exactly.')
