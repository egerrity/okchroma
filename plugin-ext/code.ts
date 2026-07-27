/// <reference path="./figma-env.d.ts" />

// Plugin v2 — extended collections (Enterprise-only). ONE base collection (`theme`)
// carries the whole semantic set; its MODE COLUMNS are the solve conditions
// (wcag · wcag-dark · apca · apca-dark — wcag is this plugin’s default, defaults are
// silent, departures are named). Each brand is ONE ExtendedVariableCollection of it,
// overriding only what differs from the base, across every column ("always both,
// no picker"). Brand axis = which extension is applied; solve axis = the mode.
// No alias maps, no dedup keys, no profile forks, no sister extensions.

import type { FlatTok, TokenColumns, Column } from './payload'
import { runSmoke } from './smoke'

figma.showUI(__html__, { width: 720, height: 640, title: 'OKChroma Extended' })

// Base name is the lookup contract; tags make it rename-proof (v1's idiom).
const BASE_NAME = 'theme'
const OWNER_KEY = 'okchroma-ext'          // 'base' | 'brand'
const BRAND_KEY = 'okchroma-ext-brand'
// Each apply stamps its input recipe here (JSON) — what powers the automatic
// collection-wide secondary check and the manual "Re-apply all brands" action.
const SPEC_KEY = 'okchroma-ext-spec'
// Mirrors payload.COLUMNS (type-only import keeps the engine out of the sandbox bundle).
// Column order IS the mode-dropdown order: the default lane leads, pairs group by prefix.
const COLUMNS: Column[] = ['wcag', 'wcag-dark', 'apca', 'apca-dark']
const DARK_COLUMNS = new Set<Column>(['wcag-dark', 'apca-dark'])
// Every variable carries the file's solve posture, visible without the plugin —
// the apca clause only when the file actually carries those columns (Include APCA).
const stampFor = (apcaOn: boolean) =>
  `OKChroma · modes: wcag 3:1/4.5/7:1 (default)${apcaOn ? ' · apca Lc 30/75/90' : ''}`

// Token renames (old leaf → new leaf), migrated IN PLACE on the existing variable —
// Figma keeps the variable id on rename, so user bindings survive (owner 2026-07-09:
// cheap by design; a future rename is one more entry). Mirrored in plugin/code.ts.
// The ink renumber entries (owner 2026-07-10) shift every name DOWN by one; safe only
// because tokens are processed in ladder (ascending) order and each migration self-deletes
// its consumed key — new ink-10 eats old ink-11 BEFORE new ink-11 is looked up. Any future
// renumber must keep that ascending order.
const RENAMED_LEAVES: Array<[string, string]> = [
  // ── BAND GROUPING (owner 2026-07-27): families nest into paper/ wash/
  // highlight/ ink/ (bare-number leaves) + cta/ cta-ink/ (state leaves, the
  // system/link idiom); on-colors ride their carrier (cta/on, highlight/on).
  // CURRENT-name entries MUST precede the historical retargets: candidates are
  // tried in table order, and a current base holds BOTH ink-11 (scale) and
  // ink-12 (anchor) — resolving ink/11 must consume ink-11 before the
  // pre-renumber ['ink-12','ink/11'] entry can capture the anchor. Ascending
  // processing + self-deleting consumed keys keep the chains sound.
  ['paper-0', 'paper/0'],
  ['paper-1', 'paper/1'],
  ['paper-2', 'paper/2'],
  ['paper-3', 'paper/3'],
  ['wash-4', 'wash/4'],
  ['wash-5', 'wash/5'],
  ['wash-6', 'wash/6'],
  ['wash-7', 'wash/7'],
  ['highlight-8', 'highlight/8'],
  ['highlight-9', 'highlight/9'],
  ['ink-10', 'ink/10'],
  ['ink-11', 'ink/11'],
  ['ink-12', 'ink/12'],
  ['cta', 'cta/enabled'],
  ['cta-hover', 'cta/hover'],
  ['cta-pressed', 'cta/pressed'],
  ['cta-border', 'cta/border'],
  ['on-cta', 'cta/on'],
  ['on-highlight', 'highlight/on'],
  ['cta-ink', 'cta-ink/enabled'],
  ['cta-ink-hover', 'cta-ink/hover'],
  ['cta-ink-pressed', 'cta-ink/pressed'],
  // ── historical retargets, pointed STRAIGHT at the final banded homes (the
  // one-hop rule). Renumber entries shift names DOWN; safe in ascending order
  // with self-deleting consumed keys — new ink/10 eats old ink-11 first.
  ['cta-stroke', 'cta/border'],
  ['ink-11', 'ink/10'],
  ['ink-12', 'ink/11'],
  ['ink-13', 'ink/12'],
  // blue-signal variant relabels (2026-07-13, info-color → blue): variant leaf =
  // label + resolved light-cta hex (variantKey), so the relabel needs per-lane entries.
  ['magenta-de8df6', 'magenta-side-de8df6'],
  ['magenta-e290f9', 'magenta-side-e290f9'],
  ['blue-7cb3f9', 'cyan-side-7cb3f9'],
  ['blue-7eb5fb', 'cyan-side-7eb5fb'],
  // cta semantic rename (owner 2026-07-16: states, never options), retargeted to
  // the banded state homes; cta/pressed + the cta-ink trio are newer tokens.
  ['cta-1', 'cta/enabled'],
  ['cta-2', 'cta/hover'],
  // stop-3 rename (owner 2026-07-24) retargeted to paper/3. Pure relabel, same color.
  ['wash-3', 'paper/3'],
  // elevation planes go 2 → 4 (owner spec + sink/base/lift/pop naming, 2026-07-24):
  // the old pair migrates to its closest role IN PLACE (bindings survive; their light
  // stop shifts one rung per the new ladder — raised p0→p1, sunken p2→p3). These
  // entries point STRAIGHT at the final surface/ homes (owner regroup 2026-07-27):
  // legacyCandidates expands one hop only, so a chained old→mid→new table would
  // strand pre-elevation files on the middle name.
  ['paper-raised', 'surface/lift'],
  ['paper-sunken', 'surface/sink'],
  // system regroup (owner 2026-07-27): planes → system/surface/*, alpha-carrying
  // utilities → system/alpha/*, link trio → system/link/* with state leaves.
  // abs-black/abs-white stay at the system root. Same-value moves, no ladder shift.
  ['sink', 'surface/sink'],
  ['base', 'surface/base'],
  ['lift', 'surface/lift'],
  ['pop', 'surface/pop'],
  ['transparent', 'alpha/transparent'],
  ['scrim', 'alpha/scrim'],
  ['link', 'link/enabled'],
  ['link-hover', 'link/hover'],
  ['link-pressed', 'link/pressed'],
]
// Group renames (old prefix → new), same in-place idiom. History: info-color →
// blue by identity (2026-07-13); then the signal ROLE round (owner 2026-07-27)
// moved the bind-surface rows to role names (critical/warning/positive/info) —
// the re-pointable in-between tier. Theme-side entries point STRAIGHT at the
// final role homes (legacyCandidates expands one group hop only — a chained
// info-color→blue→info table would strand pre-C17 files on the middle name).
// system/info-color stays → system/blue: v1 primitive-lane spelling, kept for
// cross-plugin path parity in legacyCandidates.
const RENAMED_GROUPS: Array<[string, string]> = [
  ['system/info-color/', 'system/blue/'],
  ['info-color/', 'info/'],
  ['red/', 'critical/'],
  ['yellow/', 'warning/'],
  ['green/', 'positive/'],
  ['blue/', 'info/'],
]
// Every legacy spelling of `path`: old leaf, old group, and old group + old leaf composed
// (a file untouched since before BOTH renames needs e.g. system/info-color/ink-11 → system/blue/ink-10).
function legacyCandidates(path: string): string[] {
  const out: string[] = []
  const leafVariants = [path]
  for (const [oldLeaf, newLeaf] of RENAMED_LEAVES) {
    if (path.endsWith(`/${newLeaf}`)) leafVariants.push(path.slice(0, -newLeaf.length) + oldLeaf)
  }
  for (const cand of leafVariants) {
    if (cand !== path) out.push(cand)
    for (const [oldPre, newPre] of RENAMED_GROUPS) {
      if (cand.startsWith(newPre)) out.push(oldPre + cand.slice(newPre.length))
    }
  }
  return out
}

const ENTERPRISE_MSG =
  'Extended collections need a Figma Enterprise org — this file’s plan doesn’t expose collection.extend(). '
  + 'The published OKChroma plugin (v1) covers every plan.'

const isExtension = (c: figma.VariableCollection): c is figma.ExtendedVariableCollection => c.isExtension === true

async function varsByName(collectionId: string): Promise<Map<string, figma.Variable>> {
  const all = await figma.variables.getLocalVariablesAsync()
  return new Map(all.filter(v => v.variableCollectionId === collectionId).map(v => [v.name, v]))
}

// Diff tolerance: values round-trip through Figma's color storage; 1/1024 is far below
// any perceptible step but absorbs float noise.
const EPS = 1 / 1024
const isAlias = (v: figma.RGBA | figma.VariableAlias | undefined): v is figma.VariableAlias =>
  !!v && typeof v === 'object' && 'type' in v
const valEq = (cur: figma.RGBA | figma.VariableAlias | undefined, t: FlatTok): boolean => {
  if (!cur || isAlias(cur)) return false
  return Math.abs(cur.r - t.r) < EPS && Math.abs(cur.g - t.g) < EPS && Math.abs(cur.b - t.b) < EPS
    && Math.abs((cur.a ?? 1) - (t.a ?? 1)) < EPS
}
const toRGBA = (t: FlatTok): figma.RGBA =>
  t.a !== undefined && t.a < 1 ? { r: t.r, g: t.g, b: t.b, a: t.a } : { r: t.r, g: t.g, b: t.b }

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'apply') {
    const { brand, brandTokens, baseTokens, hasSecondary, confirmed, confirmedToken, spec, includeApca } = msg as unknown as {
      type: 'apply'; brand: string; brandTokens: TokenColumns; baseTokens: TokenColumns
      hasSecondary: boolean; confirmed?: boolean; confirmedToken?: string; spec?: unknown; includeApca?: boolean
    }
    try {
      const collections = await figma.variables.getLocalVariableCollectionsAsync()
      const locals = collections.filter(c => !isExtension(c))
      const extensions = collections.filter(isExtension)

      // The owned base: tag first (survives renames); an untagged name match only counts
      // when NO tagged base exists — and it must carry the v2 column contract (either the
      // full four columns or the wcag-only pair — APCA is opt-in since the include toggle).
      // A "theme" collection with other modes (plugin v1's brand-mode collection, a
      // hand-made one) is never adopted.
      const tagged = locals.find(c => c.getPluginData(OWNER_KEY) === 'base')
      let baseMatch = tagged
      if (!baseMatch) {
        const byName = locals.find(c => c.name === BASE_NAME)
        if (byName) {
          const names = byName.modes.map(m => m.name).join(',')
          if (names === COLUMNS.join(',') || names === COLUMNS.slice(0, 2).join(',')) baseMatch = byName
          else {
            figma.ui.postMessage({ type: 'error', message:
              `A collection named "${BASE_NAME}" already exists in this file and isn’t an OKChroma Extended base `
              + '(likely plugin v1’s, or hand-made). Use a fresh file, or rename that collection first.' })
            return
          }
        }
      }

      // The file's APCA posture (owner ask 2026-07-16: "turn off APCA so it doesn't
      // regenerate if I delete it"). Detection is LIVE from the base's mode names, so a
      // hand-deleted apca PAIR self-heals to OFF. The toggle governs whether the apca
      // columns should EXIST: any apca column present → the lane keeps being written
      // regardless of the toggle (no data holes; delete BOTH columns to drop the lane,
      // and with the toggle off no future apply recreates them). Toggle ON over a base
      // without them = the posture flip; a missing HALF of a surviving pair is restored —
      // both behind the confirm gate below, both seeded + backfilled.
      // exact-name detection (matches the colIds/missingCols resolution — a stray user
      // mode named "apca…" must not resurrect a deliberately deleted pair)
      const baseHasApca = !!baseMatch && baseMatch.modes.some(m => m.name === 'apca' || m.name === 'apca-dark')
      const apcaOn = !!includeApca || baseHasApca
      const activeCols: Column[] = apcaOn ? COLUMNS : COLUMNS.slice(0, 2)
      // Columns this apply would have to CREATE on an existing base — resolved BY NAME
      // (adversarial review 2026-07-16: positional slot-reuse hijacked hand-deleted halves
      // and user-added modes). The first column adopts the default mode by design (every
      // prior apply named it wcag); the rest must match by name or be created.
      const missingCols: Column[] = baseMatch
        ? activeCols.filter(c => !baseMatch!.modes.some(m => m.name === c))
        : []

      // Live-detect the file's posture BEFORE any mutation (the confirm gate fires first).
      const baseVars = baseMatch ? await varsByName(baseMatch.id) : new Map<string, figma.Variable>()
      // posture probe reads through the rename history (a pre-banding base still
      // spells it brand-secondary/paper-1; read-only, no renames here)
      const baseHasSecondary = baseVars.has('brand-secondary/paper/1')
        || legacyCandidates('brand-secondary/paper/1').some(p => baseVars.has(p))
      const extsOfBase = baseMatch ? extensions.filter(e => e.rootVariableCollectionId === baseMatch!.id) : []
      // case-insensitive identity: "l1-near-black" typed by hand must overwrite
      // L1-near-black, never create a sibling that differs only by case
      const norm = (s: string) => s.trim().toLowerCase()
      const existingExt = extsOfBase.find(e => norm(e.getPluginData(BRAND_KEY)) === norm(brand))
        ?? extsOfBase.find(e => norm(e.name) === norm(brand))

      // New base ROWS this apply would create on an EXISTING base — the token-set-growth
      // posture (review-caught 2026-07-16: the C20 system/link rows appeared silently,
      // seeded from the DEFAULT SEED, and every other extension inherited those values
      // until manually re-applied; the C19 cta-ink rows were the same latent class).
      // Same discipline as missingCols: confirm first, then the recipe backfill
      // regenerates every extension so each brand overrides the new rows with its own.
      // brand-secondary/* is excluded (the secondary posture has its own reason +
      // trigger); a legacy name counts as EXISTING (ensure() migrates it in place).
      // Brand-VARYING system rows — the link trio and the identity absolutes
      // (owner 2026-07-27) — are the only system/ paths extensions may override.
      const OVERRIDABLE_SYSTEM = (p: string) =>
        p.startsWith('system/link') || p === 'system/abs-primary' || p === 'system/abs-secondary'
      // Contract-invariant system rows (everything under system/ except the
      // brand-overridable rows above) are excluded: extensions can never override
      // them (the work loop skips them), so their appearance seeds silently —
      // a confirm promising "each brand carries its own values" would be false
      // and the backfill regeneration pointless (review-caught 2026-07-27, the
      // alpha/shadow rows).
      const newRows: string[] = baseMatch
        ? baseTokens[activeCols[0]]
            .map((t: FlatTok) => t.path)
            .filter((p: string) => !p.startsWith('brand-secondary/'))
            .filter((p: string) => !p.startsWith('system/') || OVERRIDABLE_SYSTEM(p))
            // the identity absolutes migrate via the BESPOKE pre-pass, invisible to
            // legacyCandidates — a base still holding the old identity rows must not
            // count them as new; and abs-secondary follows the SECONDARY POSTURE
            // (the ensure loop skips it when off — counting it would fire a confirm
            // + extension backfill on every apply, forever). Review-caught 2026-07-27.
            .filter((p: string) => !(p === 'system/abs-primary' && baseVars.has('brand-primary/identity')))
            .filter((p: string) => !(p === 'system/abs-secondary'
              && (baseVars.has('brand-secondary/identity') || !(baseHasSecondary || hasSecondary))))
            .filter((p: string) => !baseVars.has(p) && !legacyCandidates(p).some(lp => baseVars.has(lp)))
        : []

      // Nudge before surprising changes (v1's idiom — each needs a second Apply):
      // overwriting a brand, ADDING the file's secondary, or CREATING solve columns on an
      // existing base (the apca posture flip / restoring a hand-deleted half). The confirm
      // is REASON-SCOPED (adversarial review 2026-07-16): the UI echoes back the exact
      // token it confirmed, so an overwrite confirm armed earlier can never authorize a
      // posture flip ticked afterwards. Batch paths pass confirmed:true (their arm step is
      // the confirm — the arm copy names the flip when the toggle is on).
      const overwrite = !!existingExt
      const addingSecondary = hasSecondary && !!baseMatch && !baseHasSecondary
      const reasons: string[] = []
      if (overwrite) reasons.push(`overwrite "${brand}"`)
      if (addingSecondary) reasons.push(
        'add a brand-secondary group to the base and update every existing brand with its derived secondary')
      if (missingCols.length) reasons.push(
        `add the ${missingCols.join(' + ')} column(s) to the base and regenerate ${extsOfBase.length ? `all ${extsOfBase.length} existing brand extension(s)` : 'the file'} to fill them (existing column values stay untouched)`)
      if (newRows.length) reasons.push(
        `add ${newRows.length} new base token(s) (${newRows.slice(0, 3).join(', ')}${newRows.length > 3 ? ', …' : ''}) and regenerate ${extsOfBase.length ? `all ${extsOfBase.length} existing brand extension(s)` : 'the file'} so each brand carries its own values there`)
      const confirmToken = reasons.join(' | ')
      const authorized = confirmed === true || (typeof confirmedToken === 'string' && confirmedToken === confirmToken)
      if (!authorized && reasons.length) {
        figma.ui.postMessage({ type: 'confirm', brand, token: confirmToken, message: `Will ${reasons.join(' + ')} — click Apply again.` })
        return
      }

      // ── base: find or create ──────────────────────────────────────────────────
      const created = !baseMatch
      const base = baseMatch ?? figma.variables.createVariableCollection(BASE_NAME)
      base.setPluginData(OWNER_KEY, 'base')

      // ── feature-detect (plan §2.2): extended collections are Enterprise-only.
      // BEFORE any mode mutation (adversarial review 2026-07-16): a failed upgrade must
      // not leave half-flipped, unseeded apca columns that the live detection would then
      // read as "already on" forever.
      if (typeof base.extend !== 'function') {
        if (created) base.remove() // leave no husk behind on a non-Enterprise file
        figma.ui.postMessage({ type: 'error', message: ENTERPRISE_MSG })
        return
      }

      // ── one mode per ACTIVE solve column, resolved BY NAME (adversarial review
      // 2026-07-16: the old positional slot-reuse relabeled hand-deleted halves into the
      // wrong lane and hijacked user-added modes — a mode is adopted ONLY on exact name
      // match; anything else is left untouched and the missing column is CREATED, behind
      // the missingCols confirm above). Exactly one exception: a FRESH collection's
      // unnamed default mode is adopted for the first column (it carries the values).
      const colIds: string[] = []
      for (let i = 0; i < activeCols.length; i++) {
        const name = activeCols[i]
        const m = base.modes.find(x => x.name === name)
        if (m) { colIds.push(m.modeId); continue }
        if (i === 0 && created) {
          base.renameMode(base.modes[0].modeId, name)
          colIds.push(base.modes[0].modeId)
          continue
        }
        colIds.push(base.addMode(name))
      }

      // ── populate the base: CREATE-ONCE from the default seed ─────────────────
      // Existing base values are never rewritten (extensions diff against them); every
      // apply restamps description + scopes. Base variables are what users bind in v2
      // (there is no second collection to hide behind) → ALL_SCOPES.
      const withSecondary = baseHasSecondary || hasSecondary
      const seedByCol = new Map<Column, Map<string, FlatTok>>(
        activeCols.map(c => [c, new Map(baseTokens[c].map(t => [t.path, t]))]))
      let createdVars = 0
      const ensure = (path: string): figma.Variable => {
        let v = baseVars.get(path)
        if (!v) for (const legacyPath of legacyCandidates(path)) {
          const legacy = baseVars.get(legacyPath)
          if (legacy) { legacy.name = path; baseVars.delete(legacyPath); baseVars.set(path, legacy); v = legacy; break }
        }
        if (!v) { v = figma.variables.createVariable(path, base, 'COLOR'); baseVars.set(path, v); createdVars++ }
        v.description = stampFor(apcaOn)
        v.scopes = ['ALL_SCOPES']
        return v
      }
      // Pole-aliasing (owner 2026-07-27): the on-fill leaves and the neutral anchor
      // are exact poles by construction — alias them to the system/abs-* rows so the
      // chip READS as the pole and the poles stay single-source. Emit-layer
      // representation only: a non-pole value (an outline secondary's on-cta rides
      // its ink-10) falls back to a raw write, so the alias never constrains the
      // solve — the engine still picks the pole per family × column.
      const POLE_LEAVES = (path: string) =>
        path.endsWith('/cta/on') || path.endsWith('/highlight/on') || path === 'neutral/ink/12'
      // EXACT poles only (per-channel EPS): the engine emits true 0/1 poles, so a
      // loose band buys nothing — and the conversion pass below must never snap a
      // hand-edited near-pole value (#FFFFF8) onto the abs row (review-caught
      // 2026-07-27; a sum-tolerance gate did exactly that).
      const isPole = (t: { r: number; g: number; b: number; a?: number }) => {
        if (t.a !== undefined && t.a !== 1) return false
        const w = Math.abs(t.r - 1) < EPS && Math.abs(t.g - 1) < EPS && Math.abs(t.b - 1) < EPS
        const k = t.r < EPS && t.g < EPS && t.b < EPS
        return w || k
      }
      const absFor = (t: { r: number; g: number; b: number }) =>
        baseVars.get(t.r + t.g + t.b > 1.5 ? 'system/abs-white' : 'system/abs-black')
      const seedValue = (v: figma.Variable, colId: string, t: FlatTok) => {
        const target = POLE_LEAVES(t.path) && isPole(t) ? absFor(t) : undefined
        v.setValueForMode(colId, target ? figma.variables.createVariableAlias(target) : toRGBA(t))
      }
      const seedFresh = (v: figma.Variable, path: string) => {
        for (let i = 0; i < activeCols.length; i++) {
          const seed = seedByCol.get(activeCols[i])!.get(path)
          if (seed) seedValue(v, colIds[i], seed)
        }
      }
      // The abs poles are created FIRST (they are alias targets and the owner's panel
      // layout leads with them), then the elevation planes (aliased below once the
      // neutral exists — ensure() migrates legacy sink/base/lift/pop names in place
      // via RENAMED_LEAVES), then everything else in payload order.
      for (const path of ['system/abs-black', 'system/abs-white']) {
        const before = createdVars
        const v = ensure(path)
        if (createdVars > before) seedFresh(v, path)
      }
      ensure('system/surface/sink')
      ensure('system/surface/base')
      ensure('system/surface/lift')
      ensure('system/surface/pop')
      // identity re-homes to the system absolutes — bespoke in-place migration
      // (a leaf entry can't express two divergent homes for the same 'identity'
      // leaf); the renamed var keeps its id, bindings and overrides survive.
      for (const [oldPath, newPath] of [
        ['brand-primary/identity', 'system/abs-primary'],
        ['brand-secondary/identity', 'system/abs-secondary'],
      ] as const) {
        const v = baseVars.get(oldPath)
        if (v && !baseVars.has(newPath)) { v.name = newPath; baseVars.set(newPath, v); baseVars.delete(oldPath) }
      }
      for (const t of baseTokens[activeCols[0]]) { // all columns share the path set
        if (!withSecondary && (t.path.startsWith('brand-secondary/') || t.path === 'system/abs-secondary')) continue
        const before = createdVars
        const v = ensure(t.path)
        if (createdVars > before) seedFresh(v, t.path) // fresh variable → seed every active column
      }
      // Existing bases predate the pole-aliasing: convert a RAW value that is exactly
      // a pole to the alias (resolution-identical, so the create-once contract is
      // preserved); user-edited (non-pole) values are never touched.
      for (const [path, v] of baseVars) {
        if (!POLE_LEAVES(path)) continue
        for (let i = 0; i < activeCols.length; i++) {
          const cur = v.valuesByMode[colIds[i]]
          if (!cur || isAlias(cur) || !isPole(cur)) continue
          const target = absFor(cur)
          if (target && target.id !== v.id) v.setValueForMode(colIds[i], figma.variables.createVariableAlias(target))
        }
      }
      // Columns CREATED on an existing base (the apca posture flip, or a hand-deleted
      // half being restored — confirmed above): seed them for EVERY base variable,
      // additively. Figma's addMode copies the DEFAULT mode's values into a new mode, so
      // an unseeded new column would silently read wcag-light everywhere (adversarial
      // review 2026-07-16). Runs AFTER the ensure loop so legacy names have migrated
      // (cta-1→cta) and new rows exist; pre-existing columns are never touched (fresh
      // vars were seeded above — re-setting the same seed here is idempotent). Variables
      // whose paths are NOT in the current token set (stale/orphaned) can't be seeded —
      // counted and reported so the default-copy values don't pass silently.
      // NOTE the boundary (re-verify 2026-07-16): only columns THIS apply creates are
      // seeded. A hand-recreated mode carrying the exact canonical name is ADOPTED as-is
      // (values untouched) — the create-once contract cuts that way deliberately:
      // rewriting an adopted column could destroy real user data, and the remedy for a
      // wrong hand-made column is to delete it (the next apply restores it, confirmed +
      // seeded). No withSecondary skip here: this loop only writes vars that already
      // EXIST (it never creates), so a partial secondary group still gets true values
      // instead of addMode's silent wcag-light copies.
      const addedCols = missingCols
      let orphaned = 0
      if (addedCols.length) {
        const known = new Set(baseTokens[activeCols[0]].map(t => t.path))
        known.add('system/surface/sink'); known.add('system/surface/base')
        known.add('system/surface/lift'); known.add('system/surface/pop')
        for (const p of baseVars.keys()) if (!known.has(p)) orphaned++
        for (const c of addedCols) {
          const idx = activeCols.indexOf(c)
          for (const t of baseTokens[c]) {
            const v = baseVars.get(t.path)
            if (v) seedValue(v, colIds[idx], t)
          }
        }
      }
      // Elevation planes — scheme-DIVERGENT aliases, base-only and never overridden:
      // each alias points at the semantic neutral VARIABLE, so under any brand
      // extension it resolves through that brand's paper overrides automatically.
      // Owner spec 2026-07-24 — same four stops both schemes, order reversed:
      //   sink → neutral/paper-3 light · neutral/paper-0 dark
      //   base → neutral/paper-2 light · neutral/paper-1 dark
      //   lift → neutral/paper-1 light · neutral/paper-2 dark
      //   pop  → neutral/paper-0 light · neutral/paper-3 dark
      const p0 = baseVars.get('neutral/paper/0')
      const p1 = baseVars.get('neutral/paper/1')
      const p2 = baseVars.get('neutral/paper/2')
      const p3 = baseVars.get('neutral/paper/3')
      if (p0 && p1 && p2 && p3) {
        const planes: Array<[string, figma.Variable, figma.Variable]> = [
          ['system/surface/sink', p3, p0], ['system/surface/base', p2, p1],
          ['system/surface/lift', p1, p2], ['system/surface/pop', p0, p3],
        ]
        for (const [path, light, darkVar] of planes) {
          const v = baseVars.get(path)!
          activeCols.forEach((c, i) => {
            const dark = DARK_COLUMNS.has(c)
            v.setValueForMode(colIds[i], figma.variables.createVariableAlias(dark ? darkVar : light))
          })
        }
      }

      // ── the brand's extension (ONE per brand — the picker stays flat and clean) ──
      let ext = existingExt
      if (!ext) {
        try {
          ext = base.extend!(brand)
        } catch (e) {
          if (created) base.remove()
          figma.ui.postMessage({ type: 'error', message: `${ENTERPRISE_MSG} (extend() threw: ${String(e)})` })
          return
        }
      }
      ext.setPluginData(OWNER_KEY, 'brand')
      ext.setPluginData(BRAND_KEY, brand)
      if (spec !== undefined) ext.setPluginData(SPEC_KEY, JSON.stringify(spec)) // the stored recipe
      const extColIds: string[] = []
      for (const baseId of colIds) {
        const m = ext.modes.find(x => x.parentModeId === baseId)
        if (!m) {
          figma.ui.postMessage({ type: 'error', message:
            'The extension’s modes did not map onto the base’s columns (parentModeId) — run the smoke test.' })
          return
        }
        extColIds.push(m.modeId)
      }

      // ── overrides: diff every brand token against the LIVE base value, per column ──
      // Equal → ensure NO override (inherit; the blue-highlight story stays honest).
      // Different → setValueForMode routed by the extension's modeId for that column.
      // system/* is contract-invariant and skipped outright (the sink/base/lift/pop
      // planes are aliases; the rest are poles every brand shares). The payload always CARRIES a
      // brand-secondary (real or derived from the primary); it is WRITTEN only when the
      // file's posture is on — secondary stays opt-in, and once on, every brand derives.
      const secondaryMode: 'real' | 'derived' | 'none' = hasSecondary ? 'real' : (withSecondary ? 'derived' : 'none')
      const brandByCol = new Map<Column, Map<string, FlatTok>>(
        activeCols.map(c => [c, new Map(brandTokens[c].map(t => [t.path, t]))]))
      const work: string[] = []
      for (const t of brandTokens[activeCols[0]]) {
        // system/* is contract-invariant and skipped — EXCEPT the system link trio
        // (Phase 4, owner: "link is a system level color. It can still be extended"):
        // each brand's extension overrides system/link* with its own resolved values
        // (its primary's cta-ink, or its custom link seed's register)
        if (t.path.startsWith('system/') && !OVERRIDABLE_SYSTEM(t.path)) continue
        if (secondaryMode === 'none' && (t.path.startsWith('brand-secondary/') || t.path === 'system/abs-secondary')) continue
        work.push(t.path)
      }
      // The pole aliases resolve through ONE hop (they point at the raw abs rows) —
      // the diff must compare the brand token against the RESOLVED base color, or
      // every aliased on-fill would read "different" and grow a pointless override.
      const varById = new Map<string, figma.Variable>()
      for (const v of baseVars.values()) varById.set(v.id, v)
      const resolvedBase = (v: figma.Variable, colId: string): figma.RGBA | figma.VariableAlias | undefined => {
        const cur = v.valuesByMode[colId]
        if (isAlias(cur)) {
          const inner = varById.get(cur.id)?.valuesByMode[colId]
          if (inner && !isAlias(inner)) return inner
        }
        return cur
      }
      const overrides = ext.variableOverrides
      let set = 0, removed = 0, inherited = 0
      for (const path of work) {
        const v = baseVars.get(path)
        if (!v) continue
        const cur = overrides[v.id]
        for (let i = 0; i < activeCols.length; i++) {
          const tok = brandByCol.get(activeCols[i])!.get(path)
          if (!tok) continue
          if (valEq(resolvedBase(v, colIds[i]), tok)) {
            if (cur && cur[extColIds[i]] !== undefined) { v.removeOverrideForMode(extColIds[i]); removed++ }
            else inherited++
          } else {
            // a differing pole override rides the same alias idiom (a flipped on-cta
            // reads "abs-white" in the extension, not an anonymous hex)
            const target = POLE_LEAVES(path) && isPole(tok) ? absFor(tok) : undefined
            v.setValueForMode(extColIds[i], target ? figma.variables.createVariableAlias(target) : toRGBA(tok))
            set++
          }
        }
      }

      // The posture flips' collection-wide check: this apply just ADDED the secondary
      // group and/or the apca columns to an existing base — hand every OTHER extension's
      // stored recipe back to the UI, which re-applies each one (deriving its secondary /
      // filling its apca overrides). Recipes are stamped per apply; extensions without
      // one are reported for a one-time manual re-apply.
      const secondaryAdded = hasSecondary && !baseHasSecondary && !created
      const rowsAdded = newRows.length > 0 && !created
      const backfill: unknown[] = []
      const unstamped: string[] = []
      if (secondaryAdded || addedCols.length || rowsAdded) {
        for (const e of extsOfBase) {
          if (e.id === ext.id) continue
          const raw = e.getPluginData(SPEC_KEY)
          if (!raw) { unstamped.push(e.name); continue }
          try { backfill.push(JSON.parse(raw)) } catch { unstamped.push(e.name) }
        }
      }

      figma.ui.postMessage({ type: 'done', brand, set, removed, inherited, createdVars, baseCreated: created, secondary: secondaryMode, secondaryAdded, addedCols, rowsAdded, orphaned, backfill, unstamped })
    } catch (err) {
      figma.ui.postMessage({ type: 'error', message: String(err) })
    }
  } else if (msg.type === 'collect-specs') {
    // Manual "Re-apply all brands": return every extension's stored recipe; the UI
    // rebuilds payloads (the engine lives there) and runs them through the apply path.
    try {
      const collections = await figma.variables.getLocalVariableCollectionsAsync()
      const base = collections.filter(c => !isExtension(c)).find(c => c.getPluginData(OWNER_KEY) === 'base')
      const exts = base ? collections.filter(isExtension).filter(e => e.rootVariableCollectionId === base.id) : []
      const specs: unknown[] = []
      const unstamped: string[] = []
      for (const e of exts) {
        const raw = e.getPluginData(SPEC_KEY)
        if (!raw) { unstamped.push(e.name); continue }
        try { specs.push(JSON.parse(raw)) } catch { unstamped.push(e.name) }
      }
      figma.ui.postMessage({ type: 'specs', specs, unstamped })
    } catch (err) {
      figma.ui.postMessage({ type: 'error', message: String(err) })
    }
  } else if (msg.type === 'smoke') {
    try {
      const lines = await runSmoke()
      figma.ui.postMessage({ type: 'smoke-result', lines })
    } catch (err) {
      figma.ui.postMessage({ type: 'smoke-result', lines: [`✗ FATAL — ${String(err)}`] })
    }
  } else if (msg.type === 'close') {
    figma.closePlugin()
  }
}
