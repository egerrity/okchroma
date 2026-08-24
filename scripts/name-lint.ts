// name-lint — candidate-name substring probe (rename prep 2026-08-21).
//
//   npm run name-lint -- <substring>
//
// Figma's picker search is case-insensitive substring over variable NAMES and
// DESCRIPTIONS, so a name candidate that hides inside foreign words floods that
// word's search results. This lint reports every token name and every rendered
// description carrying the substring, with the ext descope posture (default ON:
// only the role rows — the solid bands, the link trio, the surface planes — are
// pickable; every other row is hidden from pickers).
//
// Name universes: the ext register's real variable names (the payload + the
// plugin's own surface rows), then the community plugin's spellings of the same
// rows, then the CSS grammar — the var names the library emits (base seed +
// signals) and the semantic alias layer in tokens/semantic.css. A row's rendered
// description is identical across spellings (the title is the canonical spaced
// name), so descriptions are counted once, over the ext set.
// Informational only — always exits 0 when given an argument.

import * as fs from 'fs'
import { buildBaseColumns, BASE_SEED_HEX } from '../plugin-ext/payload'
import { describeToken, canonicalize } from '../src/engine/tokenDescriptions'
import { resolveTheme } from '../src/engine/resolve'
import { brandCss, signalsCss } from '../src/engine/cssRender'

const sub = process.argv[2]?.toLowerCase()
if (!sub) { console.error('usage: npm run name-lint -- <substring>'); process.exit(1) }

// the ext descope posture (mirrors plugin-ext/code.ts isRoleRow); the system/
// spellings are the community/canonical homes of the same role rows
const isRoleRow = (p: string): boolean =>
  /\/solid\//.test(p)
  || p.startsWith('base/link/') || p.startsWith('system/link/')
  || p.startsWith('utility/surface/') || p.startsWith('system/surface/')
const flag = (p: string): string => (isRoleRow(p) ? 'pickable' : 'hidden  ')

// ── the ext register's real names: the payload + code.ts's own surface rows ──
const extNames = buildBaseColumns().light.map(t => t.path)
extNames.push('utility/surface/dim', 'utility/surface/low', 'utility/surface/mid', 'utility/surface/high')

// ── the community plugin's spellings (the desc-audit assembly) ───────────────
const communityNames: string[] = []
for (const p of extNames) {
  const c = canonicalize(p)
  if (c !== p) communityNames.push(c)
  if (c.startsWith('brand/')) communityNames.push('brand/primary/' + c.slice('brand/'.length))
  if (c.startsWith('brand-alt/')) communityNames.push('brand/alt/' + c.slice('brand-alt/'.length))
}
communityNames.push('system/ink-0')

// ── the CSS grammar: every var name the emitters declare, base seed posture ──
const cssVarNames = (css: string): string[] =>
  [...new Set([...css.matchAll(/^\s*(--[a-z0-9-]+):/gm)].map(m => m[1]))]
const t = resolveTheme({ primaryHex: BASE_SEED_HEX, name: 'okchroma', primaryMode: 'recommended', secondaryHex: null, deriveSecondary: true })
const emittedCss = brandCss('okchroma', 'okchroma', t.themed, t.secondary?.scale ?? null, '', 'default', undefined, t.secondary?.style) + '\n' + signalsCss(undefined)
const cssPrimitives = cssVarNames(emittedCss).sort()
const semanticAliases = cssVarNames(fs.readFileSync('tokens/semantic.css', 'utf8')).filter(n => !cssPrimitives.includes(n)).sort()

const hit = (s: string): boolean => s.toLowerCase().includes(sub)
const nameHitsExt = extNames.filter(hit)
const nameHitsCommunity = communityNames.filter(hit)
const cssHitsPrimitive = cssPrimitives.filter(hit)
const cssHitsSemantic = semanticAliases.filter(hit)

// descriptions once per row (ext set); the carrier-word tally shows WHICH words
// smuggle the substring in (the whole point of probing a candidate)
const descHits: Array<{ p: string; lines: string[] }> = []
const words = new Map<string, number>()
for (const p of extNames) {
  const lines = describeToken(p).split('\n').filter(hit)
  if (!lines.length) continue
  descHits.push({ p, lines })
  for (const line of lines)
    for (const w of line.toLowerCase().match(/[a-z]+/g) ?? [])
      if (w.includes(sub)) words.set(w, (words.get(w) ?? 0) + 1)
}

console.log(`name-lint "${sub}": names ${nameHitsExt.length}/${extNames.length} ext + ${nameHitsCommunity.length}/${communityNames.length} community-shape · descriptions ${descHits.length}/${extNames.length} rows · css vars ${cssHitsPrimitive.length}/${cssPrimitives.length} emitted + ${cssHitsSemantic.length}/${semanticAliases.length} semantic`)

if (nameHitsExt.length) {
  console.log(`\n── names · ext register (${nameHitsExt.length}) ──`)
  for (const p of nameHitsExt) console.log(`${flag(p)}  ${p}`)
}
if (nameHitsCommunity.length) {
  console.log(`\n── names · community shapes (${nameHitsCommunity.length}) ──`)
  for (const p of nameHitsCommunity) console.log(`${flag(p)}  ${p}`)
}
if (cssHitsPrimitive.length) {
  console.log(`\n── css vars · emitted primitives (${cssHitsPrimitive.length}) ──`)
  for (const n of cssHitsPrimitive) console.log(`          ${n}`)
}
if (cssHitsSemantic.length) {
  console.log(`\n── css vars · semantic aliases (${cssHitsSemantic.length}) ──`)
  for (const n of cssHitsSemantic) console.log(`          ${n}`)
}
if (descHits.length) {
  const tally = [...words.entries()].sort((a, b) => b[1] - a[1]).map(([w, n]) => `${w}×${n}`).join(' · ')
  console.log(`\n── descriptions (${descHits.length} rows) — carrier words: ${tally} ──`)
  for (const { p, lines } of descHits) console.log(`${flag(p)}  ${p}  ·  ${lines.join('  |  ')}`)
}
