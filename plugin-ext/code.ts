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
  ['cta-stroke', 'cta-border'],
  ['ink-11', 'ink-10'],
  ['ink-12', 'ink-11'],
  ['ink-13', 'ink-12'],
  // blue-signal variant relabels (2026-07-13, info-color → blue): variant leaf =
  // label + resolved light-cta hex (variantKey), so the relabel needs per-lane entries.
  ['magenta-de8df6', 'magenta-side-de8df6'],
  ['magenta-e290f9', 'magenta-side-e290f9'],
  ['blue-7cb3f9', 'cyan-side-7cb3f9'],
  ['blue-7eb5fb', 'cyan-side-7eb5fb'],
  // cta semantic rename (owner 2026-07-16: states, never options) — cta-1/cta-2 →
  // cta/cta-hover in place; cta-pressed + the cta-ink trio are NEW tokens (no migration).
  ['cta-1', 'cta'],
  ['cta-2', 'cta-hover'],
]
// Group renames (old prefix → new), same in-place idiom — info-color → blue (2026-07-13);
// covers the primitive (system/<signal>/…) and theme (<signal>/…) collections.
const RENAMED_GROUPS: Array<[string, string]> = [
  ['system/info-color/', 'system/blue/'],
  ['info-color/', 'blue/'],
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
      const baseHasSecondary = baseVars.has('brand-secondary/paper-1')
      const extsOfBase = baseMatch ? extensions.filter(e => e.rootVariableCollectionId === baseMatch!.id) : []
      // case-insensitive identity: "l1-near-black" typed by hand must overwrite
      // L1-near-black, never create a sibling that differs only by case
      const norm = (s: string) => s.trim().toLowerCase()
      const existingExt = extsOfBase.find(e => norm(e.getPluginData(BRAND_KEY)) === norm(brand))
        ?? extsOfBase.find(e => norm(e.name) === norm(brand))

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
      // The elevation pair leads the panel (v1's order); values are aliased below once
      // the neutral exists.
      ensure('system/paper-raised')
      ensure('system/paper-sunken')
      for (const t of baseTokens[activeCols[0]]) { // all columns share the path set
        if (!withSecondary && t.path.startsWith('brand-secondary/')) continue
        const before = createdVars
        const v = ensure(t.path)
        if (createdVars > before) { // fresh variable → seed every active column
          for (let i = 0; i < activeCols.length; i++) {
            const seed = seedByCol.get(activeCols[i])!.get(t.path)
            if (seed) v.setValueForMode(colIds[i], toRGBA(seed))
          }
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
        known.add('system/paper-raised'); known.add('system/paper-sunken')
        for (const p of baseVars.keys()) if (!known.has(p)) orphaned++
        for (const c of addedCols) {
          const idx = activeCols.indexOf(c)
          for (const t of baseTokens[c]) {
            const v = baseVars.get(t.path)
            if (v) v.setValueForMode(colIds[idx], toRGBA(t))
          }
        }
      }
      // Elevation anchors — scheme-DIVERGENT aliases, base-only and never overridden: the
      // alias points at the semantic neutral VARIABLE, so under any brand extension it
      // resolves through that brand's paper-0/paper-2 overrides automatically.
      //   paper-raised → neutral/paper-0 in the light columns · neutral/paper-2 in the dark
      //   paper-sunken → the inverse
      const p0 = baseVars.get('neutral/paper-0')
      const p2 = baseVars.get('neutral/paper-2')
      if (p0 && p2) {
        const raised = baseVars.get('system/paper-raised')!
        const sunken = baseVars.get('system/paper-sunken')!
        activeCols.forEach((c, i) => {
          const dark = DARK_COLUMNS.has(c)
          raised.setValueForMode(colIds[i], figma.variables.createVariableAlias(dark ? p2 : p0))
          sunken.setValueForMode(colIds[i], figma.variables.createVariableAlias(dark ? p0 : p2))
        })
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
      // system/* is contract-invariant and skipped outright (paper-raised/-sunken are
      // aliases; the rest are poles every brand shares). The payload always CARRIES a
      // brand-secondary (real or derived from the primary); it is WRITTEN only when the
      // file's posture is on — secondary stays opt-in, and once on, every brand derives.
      const secondaryMode: 'real' | 'derived' | 'none' = hasSecondary ? 'real' : (withSecondary ? 'derived' : 'none')
      const brandByCol = new Map<Column, Map<string, FlatTok>>(
        activeCols.map(c => [c, new Map(brandTokens[c].map(t => [t.path, t]))]))
      const work: string[] = []
      for (const t of brandTokens[activeCols[0]]) {
        if (t.path.startsWith('system/')) continue
        if (secondaryMode === 'none' && t.path.startsWith('brand-secondary/')) continue
        work.push(t.path)
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
          if (valEq(v.valuesByMode[colIds[i]], tok)) {
            if (cur && cur[extColIds[i]] !== undefined) { v.removeOverrideForMode(extColIds[i]); removed++ }
            else inherited++
          } else { v.setValueForMode(extColIds[i], toRGBA(tok)); set++ }
        }
      }

      // The posture flips' collection-wide check: this apply just ADDED the secondary
      // group and/or the apca columns to an existing base — hand every OTHER extension's
      // stored recipe back to the UI, which re-applies each one (deriving its secondary /
      // filling its apca overrides). Recipes are stamped per apply; extensions without
      // one are reported for a one-time manual re-apply.
      const secondaryAdded = hasSecondary && !baseHasSecondary && !created
      const backfill: unknown[] = []
      const unstamped: string[] = []
      if (secondaryAdded || addedCols.length) {
        for (const e of extsOfBase) {
          if (e.id === ext.id) continue
          const raw = e.getPluginData(SPEC_KEY)
          if (!raw) { unstamped.push(e.name); continue }
          try { backfill.push(JSON.parse(raw)) } catch { unstamped.push(e.name) }
        }
      }

      figma.ui.postMessage({ type: 'done', brand, set, removed, inherited, createdVars, baseCreated: created, secondary: secondaryMode, secondaryAdded, addedCols, orphaned, backfill, unstamped })
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
