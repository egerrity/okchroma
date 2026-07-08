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
// Every variable carries the file's solve posture, visible without the plugin.
const STAMP = 'OKChroma · modes: wcag 3:1/4.5/7:1 (default) · apca Lc 30/75/90'

// Token renames (old leaf → new leaf), migrated IN PLACE on the existing variable —
// Figma keeps the variable id on rename, so user bindings survive (owner 2026-07-09:
// cheap by design; a future rename is one more entry). Mirrored in plugin/code.ts.
const RENAMED_LEAVES: Array<[string, string]> = [['cta-stroke', 'cta-border']]

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
    const { brand, brandTokens, baseTokens, hasSecondary, confirmed, spec } = msg as unknown as {
      type: 'apply'; brand: string; brandTokens: TokenColumns; baseTokens: TokenColumns
      hasSecondary: boolean; confirmed?: boolean; spec?: unknown
    }
    try {
      const collections = await figma.variables.getLocalVariableCollectionsAsync()
      const locals = collections.filter(c => !isExtension(c))
      const extensions = collections.filter(isExtension)

      // The owned base: tag first (survives renames); an untagged name match only counts
      // when NO tagged base exists — and it must carry the v2 column contract. A "theme"
      // collection with other modes (plugin v1's brand-mode collection, a hand-made one)
      // is never adopted.
      const tagged = locals.find(c => c.getPluginData(OWNER_KEY) === 'base')
      let baseMatch = tagged
      if (!baseMatch) {
        const byName = locals.find(c => c.name === BASE_NAME)
        if (byName) {
          if (byName.modes.map(m => m.name).join(',') === COLUMNS.join(',')) baseMatch = byName
          else {
            figma.ui.postMessage({ type: 'error', message:
              `A collection named "${BASE_NAME}" already exists in this file and isn’t an OKChroma Extended base `
              + '(likely plugin v1’s, or hand-made). Use a fresh file, or rename that collection first.' })
            return
          }
        }
      }

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
      // overwriting a brand, or ADDING the file's secondary (the deliberate posture flip;
      // once on, the collection checks itself — secondary-less applies just derive).
      const overwrite = !!existingExt
      const addingSecondary = hasSecondary && !!baseMatch && !baseHasSecondary
      if (!confirmed && (overwrite || addingSecondary)) {
        const reasons: string[] = []
        if (overwrite) reasons.push(`overwrite "${brand}"`)
        if (addingSecondary) reasons.push(
          'add a brand-secondary group to the base and update every existing brand with its derived secondary')
        figma.ui.postMessage({ type: 'confirm', brand, message: `Will ${reasons.join(' + ')} — click Apply again.` })
        return
      }

      // ── base: find or create, one mode per solve column ──────────────────────
      const created = !baseMatch
      const base = baseMatch ?? figma.variables.createVariableCollection(BASE_NAME)
      base.setPluginData(OWNER_KEY, 'base')
      const colIds: string[] = [base.modes[0].modeId]
      for (let i = 1; i < COLUMNS.length; i++)
        colIds.push(base.modes.length > i ? base.modes[i].modeId : base.addMode(COLUMNS[i]))
      COLUMNS.forEach((name, i) => base.renameMode(colIds[i], name))

      // ── feature-detect (plan §2.2): extended collections are Enterprise-only ──
      if (typeof base.extend !== 'function') {
        if (created) base.remove() // leave no husk behind on a non-Enterprise file
        figma.ui.postMessage({ type: 'error', message: ENTERPRISE_MSG })
        return
      }

      // ── populate the base: CREATE-ONCE from the default seed ─────────────────
      // Existing base values are never rewritten (extensions diff against them); every
      // apply restamps description + scopes. Base variables are what users bind in v2
      // (there is no second collection to hide behind) → ALL_SCOPES.
      const withSecondary = baseHasSecondary || hasSecondary
      const seedByCol = new Map<Column, Map<string, FlatTok>>(
        COLUMNS.map(c => [c, new Map(baseTokens[c].map(t => [t.path, t]))]))
      let createdVars = 0
      const ensure = (path: string): figma.Variable => {
        let v = baseVars.get(path)
        if (!v) for (const [oldLeaf, newLeaf] of RENAMED_LEAVES) {
          if (!path.endsWith(`/${newLeaf}`)) continue
          const legacyPath = path.slice(0, -newLeaf.length) + oldLeaf
          const legacy = baseVars.get(legacyPath)
          if (legacy) { legacy.name = path; baseVars.delete(legacyPath); baseVars.set(path, legacy); v = legacy }
        }
        if (!v) { v = figma.variables.createVariable(path, base, 'COLOR'); baseVars.set(path, v); createdVars++ }
        v.description = STAMP
        v.scopes = ['ALL_SCOPES']
        return v
      }
      // The elevation pair leads the panel (v1's order); values are aliased below once
      // the neutral exists.
      ensure('system/paper-raised')
      ensure('system/paper-sunken')
      for (const t of baseTokens[COLUMNS[0]]) { // all columns share the path set
        if (!withSecondary && t.path.startsWith('brand-secondary/')) continue
        const before = createdVars
        const v = ensure(t.path)
        if (createdVars > before) { // fresh variable → seed every column
          for (let i = 0; i < COLUMNS.length; i++) {
            const seed = seedByCol.get(COLUMNS[i])!.get(t.path)
            if (seed) v.setValueForMode(colIds[i], toRGBA(seed))
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
        COLUMNS.forEach((c, i) => {
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
        COLUMNS.map(c => [c, new Map(brandTokens[c].map(t => [t.path, t]))]))
      const work: string[] = []
      for (const t of brandTokens[COLUMNS[0]]) {
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
        for (let i = 0; i < COLUMNS.length; i++) {
          const tok = brandByCol.get(COLUMNS[i])!.get(path)
          if (!tok) continue
          if (valEq(v.valuesByMode[colIds[i]], tok)) {
            if (cur && cur[extColIds[i]] !== undefined) { v.removeOverrideForMode(extColIds[i]); removed++ }
            else inherited++
          } else { v.setValueForMode(extColIds[i], toRGBA(tok)); set++ }
        }
      }

      // The posture flip's collection-wide check: this apply just ADDED the secondary
      // group to an existing base — hand every OTHER extension's stored recipe back to
      // the UI, which re-applies each one (deriving its secondary). Recipes are stamped
      // per apply; extensions without one are reported for a one-time manual re-apply.
      const secondaryAdded = hasSecondary && !baseHasSecondary && !created
      const backfill: unknown[] = []
      const unstamped: string[] = []
      if (secondaryAdded) {
        for (const e of extsOfBase) {
          if (e.id === ext.id) continue
          const raw = e.getPluginData(SPEC_KEY)
          if (!raw) { unstamped.push(e.name); continue }
          try { backfill.push(JSON.parse(raw)) } catch { unstamped.push(e.name) }
        }
      }

      figma.ui.postMessage({ type: 'done', brand, set, removed, inherited, createdVars, baseCreated: created, secondary: secondaryMode, secondaryAdded, backfill, unstamped })
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
