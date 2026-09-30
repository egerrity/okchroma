// desc-audit: the description text rules, enforced.
//
// Figma's picker fuzzy search matches variable DESCRIPTIONS as well as names; ratio
// digits in a description make digit queries match every row and bury the real name
// hit. These rules keep descriptions search-inert:
//   1. Every emitted path has a real body (no title-only fallbacks in the shipped set).
//   2. No digit in a body line: a row's own TITLE line is the only digit carrier.
//   3. No ratio strings, no light/dark/mode talk, no "n/a" filler (the line is dropped).
//   4. Conformance is stated only through the two phrases verbatim; the lines are
//      unlabeled because a label's own letters flood searches.
//   5. No FOREIGN token label word in a body: "decorative borders" on every chalk row
//      would flood a search for a border row exactly the way digits flood number
//      searches. A label word is allowed only when it is in the row's OWN path.
//   6. tokenDescriptions.ts stays import-free: the module both plugin sandboxes bundle.
// The document rendering (describeDocument, the $description of every token in the DTCG
// documents) is the same bodies plus each claim's ground and a usage line. No picker
// searches a JSON file, so rules 2 and 5 do not bind it; rules 1, 3 and 4 do, and every
// line of the Figma rendering must appear in it, so the two cannot drift apart.

import * as fs from 'fs'
import { buildBaseColumns } from '../plugin-ext/payload'
import { describeToken, describeDocument, canonicalize, AA_LARGE, AA_BODY, BAND_STOPS } from '../src/engine/tokenDescriptions'
import { stopTokenName } from '../src/engine/tokenNames'

// the two live phrases, imported so a rewrite cannot leave this gate matching nothing
const PHRASES = [AA_LARGE, AA_BODY]

// the extended plugin's paths carry the base/ zone; the canonical form strips it
const paths = buildBaseColumns().light.map(t => t.path)
// the community plugin spells the brand families and the link and seed rows its own way;
// same rows, so the same rules must hold on those spellings too, derived from the
// canonical form
for (const p of [...paths]) {
  const c = canonicalize(p)
  if (c !== p) paths.push(c)
  if (c.startsWith('brand/')) paths.push('brand/primary/' + c.slice('brand/'.length))
  if (c.startsWith('brand-alt/')) paths.push('brand/alt/' + c.slice('brand-alt/'.length))
  if (c.startsWith('link/')) paths.push('system/' + c)
  if (c === 'absolute/brand') paths.push('system/abs-primary')
  if (c === 'absolute/brand-alt') paths.push('system/abs-alt')
}

let bad = 0
const fail = (p: string, why: string) => { console.error(`FAIL ${p}: ${why}`); bad++ }
// tripwire: if the conformance phrases ever rewrite, the gate below would silently
// match nothing — a zero count fails the run instead
let contrastLines = 0

for (const p of paths) {
  const d = describeToken(p)
  const [title, ...body] = d.split('\n')
  // title = the CANONICAL spaced name: the register prefix (primitive/semantic) is a
  // panel-organizing axis and must never enter a description (search-flood rule)
  if (title !== canonicalize(p).replace(/[/-]/g, ' ')) fail(p, 'title is not the canonical spaced name')
  if (body.length === 0) fail(p, 'title-only — no body authored for a shipped row')
  const text = body.join('\n')
  if (/[0-9]/.test(text)) fail(p, `digit in body: ${text.match(/.{0,15}[0-9].{0,15}/)![0]}`)
  if (/:1\b/.test(text)) fail(p, 'ratio string in body')
  if (/\b(light|dark|mode|modes|n\/a)\b/i.test(text)) fail(p, 'mode talk or n/a filler')
  // conformance lines are unlabeled (2026-08-28): a line IS one exactly when it
  // carries a phrase, so the gate counts phrase carriers directly
  for (const line of body) if (PHRASES.some(ph => line.includes(ph))) contrastLines++
}
if (contrastLines === 0) fail('(gate)', 'conformance-phrase gate matched zero lines — phrases rewritten without updating this audit')

// ── rule 5: no foreign label word ────────────────────────────────────────────
// The vocabulary is derived from the real paths, so a future token name joins the ban
// automatically. No path carries "cta", so the bodies' deliberate "CTA" prose (kept so a
// designer's cta query lands on the action rows) needs no exception. "aaa" stays allowed
// because the conformance phrases carry the WCAG level words.
const ALLOWED_FOREIGN = new Set(['aaa'])
const vocab = new Set<string>()
for (const p of paths) for (const w of p.toLowerCase().split(/[/-]/)) if (/^[a-z]{3,}$/.test(w)) vocab.add(w)
for (const p of paths) {
  const own = new Set(p.toLowerCase().split(/[/-]/))
  const text = describeToken(p).split('\n').slice(1).join(' ')
  for (const w of vocab) {
    if (own.has(w) || ALLOWED_FOREIGN.has(w)) continue
    if (new RegExp(`\\b${w}s?\\b`, 'i').test(text)) fail(p, `foreign label word "${w}" in body — floods that word's search`)
  }
}

// ── the document rendering ───────────────────────────────────────────────────
for (const p of paths) {
  const figma = describeToken(p).split('\n').slice(1)
  const doc = describeDocument(p)
  if (!doc.trim()) { fail(p, 'document rendering is empty'); continue }
  const lines = doc.split('\n')
  if (/:1\b/.test(doc)) fail(p, 'ratio string in the document rendering')
  if (/\b(light|dark|mode|modes|n\/a)\b/i.test(doc)) fail(p, 'mode talk or n/a filler in the document rendering')
  // every Figma line is in the document rendering; a conformance line may have grown its
  // ground, so a Figma line matches as a prefix
  for (const l of figma) if (!lines.some(d => d === l || d.startsWith(l))) fail(p, `document rendering lost the Figma line "${l}"`)
  for (const line of lines) if (PHRASES.some(ph => line.includes(ph))) contrastLines++
}
// the stop words the document rendering names are the name table's
for (const [band, stops] of Object.entries(BAND_STOPS)) {
  const real = new Set([8, 9, 10, 11].map(stopTokenName))
  for (const st of stops) if (!real.has(st)) fail(`(scope)`, `BAND_STOPS.${band} names ${st}, which is not a scale stop`)
}

// the sandbox-bundle guarantee: the text module must never grow an import
const src = fs.readFileSync('src/engine/tokenDescriptions.ts', 'utf8')
if (/^\s*import\b/m.test(src)) { console.error('FAIL tokenDescriptions.ts: grew an import — sandbox bundles depend on it staying a leaf'); bad++ }

if (bad) { console.error(`desc-audit: ${bad} violation(s)`); process.exit(1) }
console.log(`desc-audit: clean — ${paths.length} rows, all bodies present, digit-free; the document rendering carries every Figma line`)
