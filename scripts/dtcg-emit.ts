// Writes the two DTCG documents for a seed.
//
//   npm run tokens:emit -- <hex> [slug]
//
// The theme resolves with a derived secondary under the shipped profile. The documents land
// in dist/tokens/<slug>.light.tokens.json and dist/tokens/<slug>.dark.tokens.json, one per
// mode on identical paths; a resolver document joins them (docs/schema.md).
import * as fs from 'fs'
import * as path from 'path'
import { resolveTheme } from '../src/engine/resolve'
import { themeTokens } from '../src/engine/tokensRender'
import { tokensToDtcg, tokenPaths } from '../src/engine/dtcgRender'

const hex = process.argv[2]
const slug = process.argv[3] ?? 'okchroma'
if (!hex || !/^#?[0-9a-fA-F]{6}$/.test(hex)) { console.error('usage: npm run tokens:emit -- <hex> [slug]'); process.exit(1) }
const seed = hex.startsWith('#') ? hex : `#${hex}`

const theme = resolveTheme({ primaryHex: seed, name: slug, deriveSecondary: true, contrastProfile: 'wcag' })
const tokens = themeTokens({ slug, brand: theme.themed, secondary: theme.secondary?.scale ?? null, secondaryStyle: theme.secondary?.style, contrastProfile: 'wcag' })
const docs = tokensToDtcg(tokens)

const dir = path.join(__dirname, '..', 'dist', 'tokens')
fs.mkdirSync(dir, { recursive: true })
for (const mode of ['light', 'dark'] as const) {
  const file = path.join(dir, `${slug}.${mode}.tokens.json`)
  fs.writeFileSync(file, JSON.stringify(docs[mode], null, 2) + '\n')
  console.log(`  ${path.relative(process.cwd(), file)}`)
}
console.log(`${tokenPaths().length} tokens per document for ${seed}`)
