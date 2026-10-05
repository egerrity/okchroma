// Writes the two DTCG documents for a seed.
//
//   npm run tokens:emit -- <hex> [slug] [--root <group>]
//
// The theme resolves with a derived secondary under the shipped profile. The documents land
// in dist/tokens/<slug>.light.tokens.json and dist/tokens/<slug>.dark.tokens.json, one per
// mode on identical paths; a resolver document joins them (docs/schema.md). --root nests
// every path under the named group (`--root color` for a consumer whose paths start with
// the category); without it the grammar's groups sit at the document root.
import * as fs from 'fs'
import * as path from 'path'
import { resolveTheme } from '../src/engine/resolve'
import { themeTokens } from '../src/engine/tokensRender'
import { tokensToDtcg, tokenPaths } from '../src/engine/dtcgRender'

const USAGE = 'usage: npm run tokens:emit -- <hex> [slug] [--root <group>]'
const args = process.argv.slice(2)
const at = args.indexOf('--root')
const rootGroup = at === -1 ? undefined : args[at + 1]
if (at !== -1 && rootGroup === undefined) { console.error(USAGE); process.exit(1) }
const [hex, slug = 'okchroma'] = at === -1 ? args : [...args.slice(0, at), ...args.slice(at + 2)]
if (!hex || !/^#?[0-9a-fA-F]{6}$/.test(hex)) { console.error(USAGE); process.exit(1) }
const seed = hex.startsWith('#') ? hex : `#${hex}`

const theme = resolveTheme({ primaryHex: seed, name: slug, deriveSecondary: true, contrastProfile: 'wcag' })
const tokens = themeTokens({ slug, brand: theme.themed, secondary: theme.secondary?.scale ?? null, secondaryStyle: theme.secondary?.style, contrastProfile: 'wcag' })
const docs = tokensToDtcg(tokens, { rootGroup })

const dir = path.join(__dirname, '..', 'dist', 'tokens')
fs.mkdirSync(dir, { recursive: true })
for (const mode of ['light', 'dark'] as const) {
  const file = path.join(dir, `${slug}.${mode}.tokens.json`)
  fs.writeFileSync(file, JSON.stringify(docs[mode], null, 2) + '\n')
  console.log(`  ${path.relative(process.cwd(), file)}`)
}
console.log(`${tokenPaths().length} tokens per document for ${seed}${rootGroup === undefined ? '' : `, nested under ${rootGroup}`}`)
