// desc-audit — the description text rules, enforced (owner 2026-08-05).
//
// Figma's picker fuzzy search matches variable DESCRIPTIONS as well as names; the old
// one-size stamp's ratio digits ("3:1/4.5/7:1") made digit queries match every row and
// bury the real name hit. These rules keep descriptions search-inert:
//   1. Every emitted path has a real body (no title-only fallbacks in the shipped set).
//   2. No digit in a body line — a row's own TITLE line is the only digit carrier.
//   3. No ratio strings, no light/dark/mode talk, no "n/a" filler (the line is dropped).
//   4. Conformance is stated only through the owner's phrases verbatim (the lines are
//      UNLABELED since 2026-08-28 — the old "Contrast:" label flooded "on" searches).
//   5. No FOREIGN token label word in a body (owner 2026-08-05: "use a different word to
//      optimize the search") — "decorative borders" on every wash row floods a search for
//      the cta border rows exactly the way the stamp's digits flooded number searches. A
//      label word is allowed only when it is in the row's OWN path; the cta border title
//      line is the standing exception (it IS the token's name).
//   6. tokenDescriptions.ts stays import-free — the module both plugin sandboxes bundle.

import * as fs from 'fs'
import { buildBaseColumns } from '../plugin-ext/payload'
import { describeToken, canonicalize } from '../src/engine/tokenDescriptions'

const PHRASES = [
  'AA large text and UI elements',
  'AA standard body text & Level AAA large text',
  'AAA standard body text',
]

// ext emits register-prefixed paths (primitive/* — one register since the 2026-08-11
// flatten); the elevation planes are code.ts's own rows at primitive/system/surface/*
const paths = buildBaseColumns().light.map(t => t.path)
paths.push('utility/surface/dim', 'utility/surface/low', 'utility/surface/mid', 'utility/surface/high')
// the community plugin's spellings carry no register prefix and spell the brand families
// differently — same rows, so the same rules must hold on those spellings too. Derived
// from the CANONICAL form (adversarial-audit-caught 2026-08-07: matching the raw
// register-prefixed path left this branch dead and the community shapes untested).
for (const p of [...paths]) {
  const c = canonicalize(p)
  if (c !== p) paths.push(c)
  if (c.startsWith('brand/')) paths.push('brand/primary/' + c.slice('brand/'.length))
  if (c.startsWith('brand-alt/')) paths.push('brand/alt/' + c.slice('brand-alt/'.length))
}
// (the community-only system/ink-0 push RETIRED 2026-08-28: the anchor is
// engine-resolved and rides the neutral group in both plugins — covered above via
// NEUTRAL_ONLY like paper-100. The 2026-08-07 title-only hole it patched cannot
// reopen: no plugin creates the flat system/ path anymore.)

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
// automatically — the 2026-08-18 solid rename put stamp/fill/edge/overlay/dim/mid on
// the list for free, and retired "cta" from it (no path carries the word now, so the
// bodies' deliberate "CTA" prose — kept so a designer's cta query still lands on the
// action rows — needs no exception any more). "aaa" stays: ink-30's own leaf
// collides with "AAA", the WCAG conformance-level word AA_BODY/AAA_BODY
// (tokenDescriptions.ts) use verbatim in the Contrast line of every other AA/AAA
// text-register row (PHRASES enforces those exact strings, rule 4) — a real word every
// text-contrast row legitimately carries, not a pointer at ink-30 specifically.
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

// the sandbox-bundle guarantee: the text module must never grow an import
const src = fs.readFileSync('src/engine/tokenDescriptions.ts', 'utf8')
if (/^\s*import\b/m.test(src)) { console.error('FAIL tokenDescriptions.ts: grew an import — sandbox bundles depend on it staying a leaf'); bad++ }

if (bad) { console.error(`desc-audit: ${bad} violation(s)`); process.exit(1) }
console.log(`desc-audit: clean — ${paths.length} rows, all bodies present, digit-free`)
