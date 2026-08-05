// desc-audit — the description text rules, enforced (owner 2026-08-05).
//
// Figma's picker fuzzy search matches variable DESCRIPTIONS as well as names; the old
// one-size stamp's ratio digits ("3:1/4.5/7:1") made digit queries match every row and
// bury the real name hit. These rules keep descriptions search-inert:
//   1. Every emitted path has a real body (no title-only fallbacks in the shipped set).
//   2. No digit in a body line — a row's own TITLE line is the only digit carrier.
//   3. No ratio strings, no light/dark/mode talk, no "n/a" filler (the line is dropped).
//   4. A Contrast line uses one of the owner's conformance phrases verbatim.
//   5. tokenDescriptions.ts stays import-free — the module both plugin sandboxes bundle.

import * as fs from 'fs'
import { buildBaseColumns } from '../plugin-ext/payload'
import { describeToken } from '../src/engine/tokenDescriptions'

const PHRASES = [
  'AA large text and UI elements',
  'AA standard body text & Level AAA large text',
  'Level AAA enhanced contrast for standard body text',
]

const paths = buildBaseColumns().light.map(t => t.path)
paths.push('system/surface/sink', 'system/surface/base', 'system/surface/lift', 'system/surface/pop')
// the community plugin's THEME collection spells the brand families differently — same
// rows, so the same rules must hold on those spellings too
for (const p of [...paths]) {
  if (p.startsWith('brand-primary/')) paths.push('brand/primary/' + p.slice('brand-primary/'.length))
  if (p.startsWith('brand-secondary/')) paths.push('brand/secondary/' + p.slice('brand-secondary/'.length))
}

let bad = 0
const fail = (p: string, why: string) => { console.error(`FAIL ${p}: ${why}`); bad++ }

for (const p of paths) {
  const d = describeToken(p)
  const [title, ...body] = d.split('\n')
  if (title !== p.replace(/[/-]/g, ' ')) fail(p, 'title is not the spaced name')
  if (body.length === 0) fail(p, 'title-only — no body authored for a shipped row')
  const text = body.join('\n')
  if (/[0-9]/.test(text)) fail(p, `digit in body: ${text.match(/.{0,15}[0-9].{0,15}/)![0]}`)
  if (/:1\b/.test(text)) fail(p, 'ratio string in body')
  if (/\b(light|dark|mode|modes|n\/a)\b/i.test(text)) fail(p, 'mode talk or n/a filler')
  for (const line of body) {
    if (line.startsWith('Contrast: ') && !PHRASES.some(ph => line.includes(ph)))
      fail(p, `Contrast line off-phrase: ${line}`)
  }
}

// the sandbox-bundle guarantee: the text module must never grow an import
const src = fs.readFileSync('src/engine/tokenDescriptions.ts', 'utf8')
if (/^\s*import\b/m.test(src)) { console.error('FAIL tokenDescriptions.ts: grew an import — sandbox bundles depend on it staying a leaf'); bad++ }

if (bad) { console.error(`desc-audit: ${bad} violation(s)`); process.exit(1) }
console.log(`desc-audit: clean — ${paths.length} rows, all bodies present, digit-free`)
