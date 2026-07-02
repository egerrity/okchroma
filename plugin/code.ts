/// <reference path="./figma-env.d.ts" />

figma.showUI(__html__, { width: 360, height: 520, title: 'OKChroma' })

type TokenLeaf = { $type: 'color'; $value: { components: [number, number, number] } }
type TokenNode = TokenLeaf | { [k: string]: TokenNode }

// A per-brand raw ramp, written into the `primitive` collection under
// brand/<brand>/<role>/* (role = primary | secondary).
interface BrandRamp { role: string; light: TokenNode; dark: TokenNode }

// A shared ramp (neutral / signal). Written ONCE into `primitive` at `prim`
// (e.g. system/neutral/default-h330 or system/neutral/pure, system/yellow/lemon) and aliased from the
// `theme` collection's `theme` group (neutral, yellow, …). light/dark are
// only consulted the first time a variant is created (grow-on-demand).
interface SharedRamp { theme: string; prim: string; light: TokenNode; dark: TokenNode }

// Two reserved collections. Names are the lookup contract; the plugin-data
// marker records that the plugin owns them.
// The raw/primitive layer. Named "mode" because this is the collection that
// carries the Light/Dark mode switch designers toggle.
const MODE_NAME = 'mode'
const THEME_NAME = 'theme'
// Each owned collection is tagged with its role ('mode' | 'theme') under this
// key, so we can find it again even after the user renames it. The name is only
// a fallback for the very first run.
const OWNER_KEY = 'okchroma'

function flatten(node: TokenNode, prefix = ''): Array<{ path: string; r: number; g: number; b: number }> {
  if ('$type' in node) {
    const [r, g, b] = (node as TokenLeaf).$value.components
    return [{ path: prefix, r, g, b }]
  }
  return Object.entries(node).flatMap(([k, v]) =>
    flatten(v as TokenNode, prefix ? `${prefix}/${k}` : k)
  )
}

// Resolve the collection we own for `role`: prefer our plugin-data tag (survives
// renames), fall back to the name (first run or a pre-existing collection), else
// create it. Always (re)stamps the tag so future lookups are rename-proof.
function resolveOwned(collections: figma.VariableCollection[], role: string) {
  let coll = collections.find(c => c.getPluginData(OWNER_KEY) === role)
  if (!coll) coll = collections.find(c => c.name === role)
  const created = !coll
  if (!coll) coll = figma.variables.createVariableCollection(role)
  coll.setPluginData(OWNER_KEY, role)
  return { coll, created }
}

async function varsByName(collectionId: string): Promise<Map<string, figma.Variable>> {
  const all = await figma.variables.getLocalVariablesAsync()
  return new Map(all.filter(v => v.variableCollectionId === collectionId).map(v => [v.name, v]))
}

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'apply') {
    const { brand, brandRaw, shared, confirmed, secondary } = msg as {
      type: 'apply'; brand: string; brandRaw: BrandRamp[]; shared: SharedRamp[]
      confirmed?: boolean; secondary?: boolean
    }
    const secondaryOn = secondary !== false // global secondary switch (default on)
    try {
      const collections = await figma.variables.getLocalVariableCollectionsAsync()

      // Live-detect the file's secondary posture from the theme collection, so
      // manual edits self-heal — there's no stored flag to go stale.
      const existingTheme = collections.find(c => c.getPluginData(OWNER_KEY) === THEME_NAME)
        ?? collections.find(c => c.name === THEME_NAME)
      const existingThemeVars = existingTheme ? await varsByName(existingTheme.id) : new Map<string, figma.Variable>()
      const fileHasSecondary = existingThemeVars.has('brand/secondary/paper-1')
      const brandsExist = existingThemeVars.has('brand/primary/paper-1')

      // Nudge before two surprising changes: overwriting an existing brand, or
      // flipping the file's secondary posture. Either needs a second Apply.
      const overwrite = existingTheme?.modes.some(m => m.name === brand) ?? false
      const secondaryMismatch = brandsExist && fileHasSecondary !== secondaryOn
      if (!confirmed && (overwrite || secondaryMismatch)) {
        const reasons: string[] = []
        if (overwrite) reasons.push(`overwrite "${brand}"`)
        if (secondaryMismatch && secondaryOn) reasons.push('add a secondary to every brand')
        if (secondaryMismatch && !secondaryOn) reasons.push('mirror brand into secondary (file already uses a secondary)')
        figma.ui.postMessage({ type: 'confirm', brand, message: `Will ${reasons.join(' + ')} — click Apply again.` })
        return
      }

      // secondary treatment: real = write this brand's secondary; mirror = alias
      // secondary→primary (no blanks, no extra ramp); none = skip secondary entirely.
      const secondaryMode: 'real' | 'mirror' | 'none' = secondaryOn ? 'real' : (fileHasSecondary ? 'mirror' : 'none')
      // When secondary first appears on a file that already has brands, those brands
      // would be blank in the new group — backfill them with a mirrored secondary.
      const backfillSecondary = secondaryOn && !fileHasSecondary && brandsExist

      // ── primitive collection: raw values, modes Light / Dark ───────────────
      const p = resolveOwned(collections, MODE_NAME)
      const pLight = p.coll.modes[0].modeId
      p.coll.renameMode(pLight, 'Light')
      const pDark = p.coll.modes.length < 2 ? p.coll.addMode('Dark') : p.coll.modes[1].modeId
      p.coll.renameMode(pDark, 'Dark')

      const primByName = await varsByName(p.coll.id)
      const primVar = new Map<string, figma.Variable>() // full path → Variable (alias targets)
      let createdShared = 0

      // Static designer-convenience invariants — identical for every brand, so
      // seeded once into raw/system/* (created if absent, otherwise left as-is).
      // Seeded BEFORE the ramps so on-fill tokens can alias them.
      //   - abs-white / abs-black — mode-INVARIANT poles; on-fill tokens alias
      //     one PER MODE (a flipping on-fill = abs-white in light, abs-black in
      //     dark), so text stays a true pole regardless of the ladder.
      //   - ink-13 — the literal ink extreme beyond ink-12 (black→white).
      //   - paper-0 is NOT static anymore: the engine resolves it (white in
      //     light; one seam below paper-1 in dark, neutral-tinted) and it rides
      //     the neutral ramp at system/neutral/<tint>/paper-0.
      const W = { r: 1, g: 1, b: 1 }
      const K = { r: 0, g: 0, b: 0 }
      // The list order IS the display order in Figma (variables list in creation
      // order). paper-0e / paper-2e are mode-divergent aliases set later — once
      // the theme's neutral/paper-0 and neutral/paper-2 exist. `elevation` =
      // "create now for ordering, alias below".
      const STATIC_UTILS: Array<{ path: string; light?: figma.RGBA; dark?: figma.RGBA; elevation?: boolean }> = [
        { path: 'system/paper-0e', elevation: true },
        { path: 'system/paper-2e', elevation: true },
        { path: 'system/ink-13', light: K, dark: W },
        { path: 'system/abs-black', light: K, dark: K },
        { path: 'system/abs-white', light: W, dark: W },
        { path: 'system/transparent', light: { r: 1, g: 1, b: 1, a: 0 }, dark: { r: 1, g: 1, b: 1, a: 0 } },
        { path: 'system/scrim', light: { r: 0, g: 0, b: 0, a: 0.6 }, dark: { r: 0, g: 0, b: 0, a: 0.6 } },
      ]
      for (const u of STATIC_UTILS) {
        if (primByName.get(u.path)) continue // already seeded — leave as-is
        const v = figma.variables.createVariable(u.path, p.coll, 'COLOR')
        primByName.set(u.path, v)
        if (u.light && u.dark) { // elevation entries are aliased below, not value-set
          v.setValueForMode(pLight, u.light)
          v.setValueForMode(pDark, u.dark)
        }
        createdShared++
      }

      // An on-fill is always a pure pole; alias it PER MODE to abs-white/abs-black
      // (mode-divergent alias, like the elevation pair) instead of duplicating a
      // value. Decoupled from the paper-0/ink-13 anchors on purpose: paper-0 is a
      // RESOLVED color now (near-black, tinted, in dark) — text must stay a pole.
      const isWhite = (c: { r: number; g: number; b: number }) => c.r + c.g + c.b > 1.5
      const absPole = (white: boolean) => primByName.get(white ? 'system/abs-white' : 'system/abs-black')

      // Write a primitive. on-fill leaves ALIAS a shared invariant (always, so
      // pre-existing raw on-fills get converted on re-apply); every other leaf is
      // a raw color, written on create or when `refresh` is set (per-brand ramps).
      const writeRaw = (
        path: string,
        t: { path: string; r: number; g: number; b: number },
        darkMap: Map<string, { r: number; g: number; b: number }>,
        refresh: boolean
      ): { v: figma.Variable; created: boolean } => {
        let v = primByName.get(path)
        const created = !v
        if (!v) { v = figma.variables.createVariable(path, p.coll, 'COLOR'); primByName.set(path, v) }
        const dk = darkMap.get(t.path)
        if (t.path === 'on-cta' || t.path === 'on-highlight') {
          const lightPole = absPole(isWhite(t))
          const darkPole = absPole(isWhite(dk ?? t))
          if (lightPole && darkPole) {
            v.setValueForMode(pLight, figma.variables.createVariableAlias(lightPole))
            v.setValueForMode(pDark, figma.variables.createVariableAlias(darkPole))
          }
        } else if (created || refresh) {
          v.setValueForMode(pLight, { r: t.r, g: t.g, b: t.b })
          if (dk) v.setValueForMode(pDark, { r: dk.r, g: dk.g, b: dk.b })
        }
        return { v, created }
      }

      // per-brand ramps → brand/<brand>/<role>/* (refreshed). primary always;
      // secondary's raw ramp only when we're writing a real secondary for this brand.
      const primaryRamp = brandRaw.find(r => r.role === 'primary')
      const secondaryRamp = brandRaw.find(r => r.role === 'secondary')
      const writeRamp = (role: string, ramp: BrandRamp) => {
        const darkMap = new Map(flatten(ramp.dark).map(t => [t.path, t]))
        for (const t of flatten(ramp.light)) {
          writeRaw(`brand/${brand}/${role}/${t.path}`, t, darkMap, true)
        }
      }
      if (primaryRamp) writeRamp('primary', primaryRamp)
      if (secondaryMode === 'real' && secondaryRamp) writeRamp('secondary', secondaryRamp)
      // shared neutral + signals → grown on demand, recorded as alias targets
      for (const grp of shared) {
        const darkMap = new Map(flatten(grp.dark).map(t => [t.path, t]))
        for (const t of flatten(grp.light)) {
          const path = `${grp.prim}/${t.path}`
          const { v, created } = writeRaw(path, t, darkMap, false)
          if (created) createdShared++
          primVar.set(path, v)
        }
      }

      // ── theme collection: aliases, modes = brands ──────────────────────────
      const th = resolveOwned(collections, THEME_NAME)
      let brandMode: string
      if (th.created) {
        brandMode = th.coll.modes[0].modeId
        th.coll.renameMode(brandMode, brand)
      } else {
        const m = th.coll.modes.find(x => x.name === brand)
        brandMode = m ? m.modeId : th.coll.addMode(brand)
      }

      const themeByName = await varsByName(th.coll.id)
      let aliasCount = 0
      const aliasInto = (themePath: string, primPath: string, modeId: string = brandMode) => {
        const target = primVar.get(primPath) ?? primByName.get(primPath)
        if (!target) return
        let v = themeByName.get(themePath)
        if (!v) { v = figma.variables.createVariable(themePath, th.coll, 'COLOR'); themeByName.set(themePath, v) }
        v.setValueForMode(modeId, figma.variables.createVariableAlias(target))
        aliasCount++
      }

      // brand/primary always; brand/secondary depends on the secondary mode.
      const stops = primaryRamp ? flatten(primaryRamp.light) : []
      for (const t of stops) {
        aliasInto(`brand/primary/${t.path}`, `brand/${brand}/primary/${t.path}`)
        if (secondaryMode === 'real') {
          aliasInto(`brand/secondary/${t.path}`, `brand/${brand}/secondary/${t.path}`)
        } else if (secondaryMode === 'mirror') {
          aliasInto(`brand/secondary/${t.path}`, `brand/${brand}/primary/${t.path}`) // mirror brand
        }
      }
      // When secondary first appears, give every pre-existing brand a mirrored
      // secondary so none are left blank in the new group.
      if (backfillSecondary) {
        for (const m of th.coll.modes) {
          if (m.name === brand) continue
          for (const t of stops) {
            aliasInto(`brand/secondary/${t.path}`, `brand/${m.name}/primary/${t.path}`, m.modeId)
          }
        }
      }
      // neutral + signals → their shared primitive paths
      for (const grp of shared) {
        for (const t of flatten(grp.light)) {
          aliasInto(`${grp.theme}/${t.path}`, `${grp.prim}/${t.path}`)
        }
      }

      // Elevation anchors — mode-DIVERGENT aliases: each mode points at a different
      // target, so card elevation holds its meaning as the ladder inverts. Both ends
      // are the brand-aware THEME neutral now (paper-0 is the engine's RESOLVED
      // anchor — white in light, one seam below paper-1 in dark, never absolute black):
      //   paper-0e (raised)  → neutral/paper-0 (white) in light · neutral/paper-2 in dark
      //   paper-2e (sunken)  → neutral/paper-2 in light · neutral/paper-0 (deep) in dark
      // (paper-1 needs no variant — it's the base, same role both modes.) The vars
      // were CREATED in order above; aliases are set HERE because the theme's
      // neutral vars only exist after the alias loop ("the wait"). This mirrors the
      // CSS semantic layer's surface-raised/surface-sunken exactly.
      const themeNeutralP0 = themeByName.get('neutral/paper-0')
      const themeNeutralP2 = themeByName.get('neutral/paper-2')
      if (themeNeutralP0 && themeNeutralP2) {
        const aliasElev = (path: string, light: figma.Variable, dark: figma.Variable) => {
          const v = primByName.get(path) // pre-created in STATIC_UTILS for ordering
          if (!v) return
          v.setValueForMode(pLight, figma.variables.createVariableAlias(light))
          v.setValueForMode(pDark, figma.variables.createVariableAlias(dark))
        }
        aliasElev('system/paper-0e', themeNeutralP0, themeNeutralP2) // raised
        aliasElev('system/paper-2e', themeNeutralP2, themeNeutralP0) // sunken
      }

      figma.ui.postMessage({ type: 'done', brand, aliases: aliasCount, createdShared, secondary: secondaryMode })
    } catch (err) {
      figma.ui.postMessage({ type: 'error', message: String(err) })
    }
  } else if (msg.type === 'close') {
    figma.closePlugin()
  }
}
