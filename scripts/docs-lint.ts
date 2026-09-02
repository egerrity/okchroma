// docs-lint — the engineer-facing documentation rules, enforced.
//
//   npm run docs:lint
//
// The docs site (demo/docs/DocsSite.tsx) and the repo docs it links to are checked for
// the classes of drift that have recurred: em dashes in prose, retired token vocabulary,
// internal round IDs and owner-date jargon that an outside engineer cannot decode.
// A hit prints file:line, the rule, and the offending text; any hit fails the run.
//
// Not linted: docs/engine-spec/CATALOG.md (history), CHANGELOG.md (a release log whose
// rename tables must name the old words), research/, scratch/, and the plugins' own docs.
import * as fs from 'fs'

type Surface = { path: string; kind: 'md' | 'tsx' }
const SURFACES: Surface[] = [
  { path: 'demo/docs/DocsSite.tsx', kind: 'tsx' },
  { path: 'demo/docs/prose.tsx', kind: 'tsx' },
  { path: 'demo/docs/figures.tsx', kind: 'tsx' },
  { path: 'demo/docs/pages/overview.tsx', kind: 'tsx' },
  { path: 'demo/docs/pages/install.tsx', kind: 'tsx' },
  { path: 'demo/docs/pages/output.tsx', kind: 'tsx' },
  { path: 'demo/docs/pages/generation.tsx', kind: 'tsx' },
  { path: 'demo/docs/pages/tokens.tsx', kind: 'tsx' },
  { path: 'demo/docs/pages/motivation.tsx', kind: 'tsx' },
  { path: 'README.md', kind: 'md' },
  { path: 'docs/architecture.md', kind: 'md' },
  { path: 'docs/scale.md', kind: 'md' },
  { path: 'docs/schema.md', kind: 'md' },
  { path: 'docs/agents.md', kind: 'md' },
  { path: 'plugin-ext/README.md', kind: 'md' },
]

type Rule = { name: string; re: RegExp; why: string }
const RULES: Rule[] = [
  { name: 'em-dash', re: /—/g, why: 'no em dashes in doc prose' },
  { name: 'retired-band', re: /\b(?:wash|wax|lead|mark|ink)-\d+\b/g, why: 'retired band word; the instruments are paper/highlighter/crayon/pencil/pen' },
  { name: 'retired-suffix', re: /\b(?:paper|highlighter|crayon|pencil|pen)-\d+-aaa?\b/g, why: 'the -aa/-aaa conformance suffix is retired; conformance is stated in the description' },
  { name: 'retired-register', re: /\b(?:solid|primitive)\//g, why: 'retired register word; the zones are base/ and utility/, the family is stamp/' },
  { name: 'retired-token', re: /\b(?:cta-border|on-cta|cta-ink|highlight-9|on-highlight|cta-stroke)\b/g, why: 'retired token name' },
  { name: 'retired-plane', re: /\bsunken\b/g, why: 'retired plane word; the planes are dim/low/mid/high' },
  { name: 'round-id', re: /\b[CT]\d{1,3}\b/g, why: 'internal round ID; state the mechanism, link CATALOG if history is needed' },
  { name: 'owner-jargon', re: /\(owner\b|\bowner(?:'s)? (?:ruling|rule|call|decision|directive|spec|mark|pick|correction)\b|\bowner[ -]20\d\d\b/gi, why: 'internal decision jargon; state the rule, not who ruled it' },
]

// tsx: only the rendered prose is a doc surface. Strip block comments, full-line
// comments, and trailing " // " comments (a URL's :// has no space before it).
function proseOf(src: string, kind: Surface['kind']): string {
  if (kind === 'md') return src
  return src
    .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '))
    .replace(/^(\s*)\/\/.*$/gm, (m, ws) => ws + ' '.repeat(m.length - ws.length))
    .replace(/(\s)\/\/ .*$/gm, (m, ws) => ws + ' '.repeat(m.length - ws.length))
}

// hex literals are never a round ID (#C61D1B); blank them before the round-id rule
const withoutHex = (line: string) => line.replace(/#[0-9a-fA-F]{6}\b/g, m => ' '.repeat(m.length))

let hits = 0
for (const s of SURFACES) {
  if (!fs.existsSync(s.path)) { console.log(`docs-lint: missing surface ${s.path}`); hits++; continue }
  const lines = proseOf(fs.readFileSync(s.path, 'utf8'), s.kind).split('\n')
  lines.forEach((line, i) => {
    for (const rule of RULES) {
      const subject = rule.name === 'round-id' ? withoutHex(line) : line
      const found = subject.match(rule.re)
      if (!found) continue
      hits++
      console.log(`${s.path}:${i + 1}: ${rule.name} (${found.join(', ')}): ${rule.why}\n    ${line.trim().slice(0, 140)}`)
    }
  })
}

if (hits) {
  console.log(`\ndocs-lint: ${hits} hit${hits === 1 ? '' : 's'}`)
  process.exit(1)
}
console.log('docs-lint: clean')
