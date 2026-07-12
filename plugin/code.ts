/// <reference path="./figma-env.d.ts" />

figma.showUI(__html__, { width: 720, height: 640, title: 'OKChroma' })

type TokenLeaf = { $type: 'color'; $value: { components: [number, number, number]; alpha?: number } }
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
// The contrast profile a pair was solved under, tagged per collection (absent =
// wcag: every pre-profile file is wcag by construction). A file never MIXES
// profiles inside a pair — a mismatched apply forks a second, SUFFIXED pair.
// ASYMMETRIC NAMING (owner call): the original pair is NEVER renamed — one-lane
// files keep plain "theme"/"mode" forever and downstream pipelines pointed at
// them never break; only the forked addition carries the suffix. Hyphen +
// lowercase full word ("theme-apca") is slug-safe and a one-line Style
// Dictionary strip (`replace(/-(apca|wcag)$/,'')`) if a consumer wants it gone.
const PROFILE_KEY = 'okchroma-profile'
type Profile = 'wcag' | 'apca'
const profileOf = (c: figma.VariableCollection): Profile => (c.getPluginData(PROFILE_KEY) === 'apca' ? 'apca' : 'wcag')
const pairName = (role: string, profile: Profile) => `${role}-${profile}`
// human-visible stamp, written into every variable's description (owner ask:
// the file's contrast posture must be visible + checkable without the plugin)
const profileStamp = (profile: Profile) =>
  profile === 'apca' ? 'OKChroma · contrast: APCA (Lc 30/75/90)' : 'OKChroma · contrast: WCAG (3:1/4.5/7:1)'

// Token renames (old leaf → new leaf), migrated IN PLACE on the existing variable —
// Figma keeps the variable id on rename, so user bindings survive (owner 2026-07-09:
// cheap by design; a future rename is one more entry). Mirrored in plugin-ext/code.ts.
// The ink renumber entries (owner 2026-07-10) shift every name DOWN by one; they are
// safe only because tokens are processed in ladder (ascending) order and each migration
// self-deletes its consumed key — new ink-10 eats old ink-11 BEFORE new ink-11 is looked
// up, so the direct map.get never wrongly hits a stale same-name variable. Any future
// renumber must keep that ascending order.
const RENAMED_LEAVES: Array<[string, string]> = [
  ['cta-stroke', 'cta-border'],
  ['ink-11', 'ink-10'],
  ['ink-12', 'ink-11'],
  ['ink-13', 'ink-12'],
]
// Look up `path` in `map`, first as-is, then under a renamed leaf's OLD name —
// renaming the found variable to `path` in place (same idiom as the anchor's system→neutral move).
function getOrMigrate(map: Map<string, figma.Variable>, path: string): figma.Variable | undefined {
  const v = map.get(path)
  if (v) return v
  for (const [oldLeaf, newLeaf] of RENAMED_LEAVES) {
    if (!path.endsWith(`/${newLeaf}`)) continue
    const legacy = map.get(path.slice(0, -newLeaf.length) + oldLeaf)
    if (legacy) {
      legacy.name = path
      map.delete(path.slice(0, -newLeaf.length) + oldLeaf)
      map.set(path, legacy)
      return legacy
    }
  }
  return undefined
}

function flatten(node: TokenNode, prefix = ''): Array<{ path: string; r: number; g: number; b: number; a?: number }> {
  if ('$type' in node) {
    const leaf = node as TokenLeaf
    const [r, g, b] = leaf.$value.components
    return [{ path: prefix, r, g, b, a: leaf.$value.alpha }]
  }
  return Object.entries(node).flatMap(([k, v]) =>
    flatten(v as TokenNode, prefix ? `${prefix}/${k}` : k)
  )
}

// All collections we own for `role`: plugin-data tag first (survives renames);
// an untagged name match only counts when NO tagged one exists (first run / a
// pre-existing collection) — legacy untagged = wcag.
function ownedFor(collections: figma.VariableCollection[], role: string): figma.VariableCollection[] {
  const tagged = collections.filter(c => c.getPluginData(OWNER_KEY) === role)
  if (tagged.length) return tagged
  const byName = collections.find(c => c.name === role)
  return byName ? [byName] : []
}

// Resolve the collection we own for `role` UNDER `profile`. Each profile gets its
// own pair — a wcag file and its apca fork are separate collections, never mixed.
// `suffixed` = a sibling pair with the other profile exists, so a newly created
// collection takes the suffixed name ("mode-apca") instead of the plain role
// (existing pairs are found by tag and NEVER renamed).
// Always (re)stamps both tags so future lookups are rename-proof.
function resolveOwned(collections: figma.VariableCollection[], role: string, profile: Profile, suffixed: boolean) {
  let coll = ownedFor(collections, role).find(c => profileOf(c) === profile)
  const created = !coll
  if (!coll) coll = figma.variables.createVariableCollection(suffixed ? pairName(role, profile) : role)
  coll.setPluginData(OWNER_KEY, role)
  coll.setPluginData(PROFILE_KEY, profile)
  return { coll, created }
}

async function varsByName(collectionId: string): Promise<Map<string, figma.Variable>> {
  const all = await figma.variables.getLocalVariablesAsync()
  return new Map(all.filter(v => v.variableCollectionId === collectionId).map(v => [v.name, v]))
}

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'apply') {
    const { brand, brandRaw, shared, confirmed, secondary, contrastProfile } = msg as {
      type: 'apply'; brand: string; brandRaw: BrandRamp[]; shared: SharedRamp[]
      confirmed?: boolean; secondary?: boolean; contrastProfile?: Profile
    }
    const secondaryOn = secondary !== false // global secondary switch (default on)
    const profile: Profile = contrastProfile === 'apca' ? 'apca' : 'wcag'
    try {
      const collections = await figma.variables.getLocalVariableCollectionsAsync()

      // The file's contrast posture, per PAIR: this apply targets the pair solved
      // under ITS profile. A pair for another profile with none for this one =
      // the FORK moment (same idiom as the secondary-posture check): confirm,
      // then create a SUFFIXED pair ("theme-apca"/"mode-apca") for this profile.
      // The existing pair is left completely alone — name, values, bindings —
      // so one-lane files and their downstream pipelines never notice a fork.
      const themePairs = ownedFor(collections, THEME_NAME)
      const themeMatch = themePairs.find(c => profileOf(c) === profile)
      const themeOther = themePairs.find(c => profileOf(c) !== profile)
      const profileFork = !themeMatch && !!themeOther
      // suffixed names whenever the file holds (or is about to hold) both profiles
      const suffixed = profileFork || (!!themeMatch && !!themeOther)

      // Live-detect the pair's secondary posture from ITS theme collection, so
      // manual edits self-heal — there's no stored flag to go stale.
      const existingTheme = themeMatch
      const existingThemeVars = existingTheme ? await varsByName(existingTheme.id) : new Map<string, figma.Variable>()
      const fileHasSecondary = existingThemeVars.has('brand/secondary/paper-1')
      const brandsExist = existingThemeVars.has('brand/primary/paper-1')

      // Nudge before surprising changes: overwriting an existing brand, flipping
      // the pair's secondary posture, or forking the file's contrast profile.
      // Each needs a second Apply.
      const overwrite = existingTheme?.modes.some(m => m.name === brand) ?? false
      const secondaryMismatch = brandsExist && fileHasSecondary !== secondaryOn
      if (!confirmed && (overwrite || secondaryMismatch || profileFork)) {
        const reasons: string[] = []
        if (overwrite) reasons.push(`overwrite "${brand}"`)
        if (secondaryMismatch && secondaryOn) reasons.push('add a secondary to every brand')
        if (secondaryMismatch && !secondaryOn) reasons.push('mirror brand into secondary (file already uses a secondary)')
        if (profileFork) reasons.push(
          `create a separate ${profile.toUpperCase()} set ("${pairName(THEME_NAME, profile)}" / "${pairName(MODE_NAME, profile)}") — `
          + `this file's existing OKChroma collections are ${profileOf(themeOther!).toUpperCase()}-solved and stay untouched`)
        figma.ui.postMessage({ type: 'confirm', brand, message: `Will ${reasons.join(' + ')} — click Apply again.` })
        return
      }

      // confirmed fork: make the untouched original rename-proof for the future
      // (tag it; legacy pairs found by name may not carry tags yet) — its NAME
      // and values are deliberately left alone.
      if (profileFork) {
        const otherProf = profileOf(themeOther!)
        themeOther!.setPluginData(OWNER_KEY, THEME_NAME)
        themeOther!.setPluginData(PROFILE_KEY, otherProf)
        const modeOther = ownedFor(collections, MODE_NAME).find(c => profileOf(c) === otherProf)
        if (modeOther) {
          modeOther.setPluginData(OWNER_KEY, MODE_NAME)
          modeOther.setPluginData(PROFILE_KEY, otherProf)
        }
      }

      // secondary treatment: real = write this brand's secondary; mirror = alias
      // secondary→primary (no blanks, no extra ramp); none = skip secondary entirely.
      const secondaryMode: 'real' | 'mirror' | 'none' = secondaryOn ? 'real' : (fileHasSecondary ? 'mirror' : 'none')
      // When secondary first appears on a file that already has brands, those brands
      // would be blank in the new group — backfill them with a mirrored secondary.
      const backfillSecondary = secondaryOn && !fileHasSecondary && brandsExist

      // ── theme collection FIRST (owner: theme appears above mode in the panel —
      // the collections list follows creation order) ──────────────────────────
      const th = resolveOwned(collections, THEME_NAME, profile, suffixed)
      let brandMode: string
      if (th.created) {
        brandMode = th.coll.modes[0].modeId
        th.coll.renameMode(brandMode, brand)
      } else {
        const m = th.coll.modes.find(x => x.name === brand)
        brandMode = m ? m.modeId : th.coll.addMode(brand)
      }

      // ── primitive collection: raw values, modes Light / Dark ───────────────
      const p = resolveOwned(collections, MODE_NAME, profile, suffixed)
      const stamp = profileStamp(profile)
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
      //   - ink-12 — the literal ink extreme beyond ink-11 (black→white).
      //   - paper-0 is NOT static anymore: the engine resolves it (white in
      //     light; one seam below paper-1 in dark, neutral-tinted) and it rides
      //     the neutral ramp at system/neutral/<tint>/paper-0.
      const W = { r: 1, g: 1, b: 1 }
      const K = { r: 0, g: 0, b: 0 }
      // The list order IS the display order in Figma (variables list in creation
      // order). paper-raised / paper-sunken are mode-divergent aliases set later —
      // once the theme's neutral/paper-0 and neutral/paper-2 exist. `elevation` =
      // "create now for ordering, alias below". (Role names, not ladder numbers —
      // they alias different ladder positions per mode, so a number would lie.)
      const STATIC_UTILS: Array<{ path: string; light?: figma.RGBA; dark?: figma.RGBA; elevation?: boolean }> = [
        { path: 'system/paper-raised', elevation: true },
        { path: 'system/paper-sunken', elevation: true },
        { path: 'system/ink-12', light: K, dark: W },
        { path: 'system/abs-black', light: K, dark: K },
        { path: 'system/abs-white', light: W, dark: W },
        { path: 'system/transparent', light: { r: 1, g: 1, b: 1, a: 0 }, dark: { r: 1, g: 1, b: 1, a: 0 } },
        { path: 'system/scrim', light: { r: 0, g: 0, b: 0, a: 0.6 }, dark: { r: 0, g: 0, b: 0, a: 0.6 } },
      ]
      for (const u of STATIC_UTILS) {
        // getOrMigrate (not .get): the anchor was renamed ink-13→ink-12 — existing
        // files' system/ink-13 primitive is renamed in place instead of orphaned
        const existing = getOrMigrate(primByName, u.path)
        if (existing) { existing.scopes = [] ; continue } // already seeded — just enforce the scope rule
        const v = figma.variables.createVariable(u.path, p.coll, 'COLOR')
        v.description = stamp
        // primitives are NEVER bound directly — hidden from every property picker
        // (the theme aliases carry the scopes); the mode collection is the value store
        v.scopes = []
        primByName.set(u.path, v)
        if (u.light && u.dark) { // elevation entries are aliased below, not value-set
          v.setValueForMode(pLight, u.light)
          v.setValueForMode(pDark, u.dark)
        }
        createdShared++
      }

      // An on-fill is always a pure pole; alias it PER MODE to abs-white/abs-black
      // (mode-divergent alias, like the elevation pair) instead of duplicating a
      // value. Decoupled from the paper-0/ink-12 anchors on purpose: paper-0 is a
      // RESOLVED color now (near-black, tinted, in dark) — text must stay a pole.
      const isWhite = (c: { r: number; g: number; b: number }) => c.r + c.g + c.b > 1.5
      const absPole = (white: boolean) => primByName.get(white ? 'system/abs-white' : 'system/abs-black')

      // Write a primitive. on-fill leaves ALIAS a shared invariant (always, so
      // pre-existing raw on-fills get converted on re-apply); cta-border leaves ALIAS
      // per mode — system/transparent when the fill passes the boundary gate, the
      // family's own highlight-8 when it doesn't (alpha 0 in the payload = transparent);
      // every other leaf is a raw color, written on create or when `refresh` is set
      // (per-brand ramps).
      const writeRaw = (
        path: string,
        t: { path: string; r: number; g: number; b: number; a?: number },
        darkMap: Map<string, { r: number; g: number; b: number; a?: number }>,
        refresh: boolean
      ): { v: figma.Variable; created: boolean } => {
        let v = getOrMigrate(primByName, path)
        const created = !v
        if (!v) { v = figma.variables.createVariable(path, p.coll, 'COLOR'); primByName.set(path, v) }
        v.description = stamp // restamped every apply — the visible contrast posture
        v.scopes = [] // primitives hidden from every picker (re-applies fix older files too)
        const dk = darkMap.get(t.path)
        // a TRUE pole (the engine's on-fills are exactly white or black); an outline
        // secondary's on-cta is the family's ink-10 instead — alias the sibling, not a pole
        const isPole = (c: { r: number; g: number; b: number }) => {
          const sum = c.r + c.g + c.b
          return sum > 2.97 || sum < 0.03
        }
        if (t.path === 'on-cta' || t.path === 'on-highlight') {
          const sibling10 = primByName.get(path.replace(/on-(?:cta|highlight)$/, 'ink-10'))
          const target = (leaf: { r: number; g: number; b: number }) =>
            isPole(leaf) ? absPole(isWhite(leaf)) : (sibling10 ?? absPole(isWhite(leaf)))
          const lightTarget = target(t)
          const darkTarget = target(dk ?? t)
          if (lightTarget && darkTarget) {
            v.setValueForMode(pLight, figma.variables.createVariableAlias(lightTarget))
            v.setValueForMode(pDark, figma.variables.createVariableAlias(darkTarget))
          }
        } else if (t.a === 0 && (dk === undefined || dk.a === 0)) {
          // fully-transparent leaf (an outline secondary's cta-1) → alias system/transparent
          const transparent = primByName.get('system/transparent')
          if (transparent) {
            v.setValueForMode(pLight, figma.variables.createVariableAlias(transparent))
            v.setValueForMode(pDark, figma.variables.createVariableAlias(transparent))
          }
        } else if (t.path === 'cta-border') {
          const sibling8 = primByName.get(path.replace(/cta-border$/, 'highlight-8'))
          const transparent = primByName.get('system/transparent')
          const target = (leaf?: { a?: number }) =>
            leaf?.a === 0 ? transparent : (sibling8 ?? transparent)
          const lightTarget = target(t)
          const darkTarget = target(dk ?? t)
          if (lightTarget && darkTarget) {
            v.setValueForMode(pLight, figma.variables.createVariableAlias(lightTarget))
            v.setValueForMode(pDark, figma.variables.createVariableAlias(darkTarget))
          }
        } else if (created || refresh) {
          // carry a real partial alpha through (the outline secondary's cta-2 tinted hover)
          v.setValueForMode(pLight, t.a !== undefined && t.a < 1 ? { r: t.r, g: t.g, b: t.b, a: t.a } : { r: t.r, g: t.g, b: t.b })
          if (dk) v.setValueForMode(pDark, dk.a !== undefined && dk.a < 1 ? { r: dk.r, g: dk.g, b: dk.b, a: dk.a } : { r: dk.r, g: dk.g, b: dk.b })
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

      // ── theme collection: aliases, modes = brands (resolved above, before mode) ──
      const themeByName = await varsByName(th.coll.id)
      let aliasCount = 0
      const aliasInto = (themePath: string, primPath: string, modeId: string = brandMode) => {
        const target = primVar.get(primPath) ?? primByName.get(primPath)
        if (!target) return
        let v = getOrMigrate(themeByName, themePath)
        if (!v) { v = figma.variables.createVariable(themePath, th.coll, 'COLOR'); themeByName.set(themePath, v) }
        v.description = stamp
        // the THEME aliases are what users bind — visible in every supported property
        // (the mode primitives underneath carry scope NOTHING)
        v.scopes = ['ALL_SCOPES']
        v.setValueForMode(modeId, figma.variables.createVariableAlias(target))
        aliasCount++
      }

      // THEME WRITE ORDER = PANEL ORDER (the groups sidebar follows each group's first
      // variable; fresh files get the owner's layout): system → neutral → brand → signals.
      // Existing collections keep their historical order — no reorder API; drag or re-apply
      // on a fresh file.

      // migration: the anchor used to live under theme system/ink-13 — RENAME moves it
      // into the neutral group with every user binding intact. It parks on the OLD name
      // neutral/ink-13, NOT the final ink-12: on a pre-renumber file that final name is
      // still occupied by the not-yet-migrated old SCALE ink-12, and jumping the anchor
      // there clobbers that map entry — the neutral ladder then hijacks the anchor into
      // scale ink-11 (mode-flipping #000/#fff bindings turn brand-tinted) and orphans
      // the real scale variable. Parking on ink-13 keeps the ascending RENAMED_LEAVES
      // discipline: the ladder frees ink-12 first, then its ['ink-13','ink-12'] entry
      // finishes the anchor's move — the same path files already on neutral/ink-13 take
      // via aliasInto's getOrMigrate. (Guard: never clobber an existing neutral/ink-13.)
      const staleInk = themeByName.get('system/ink-13')
      if (staleInk && !themeByName.has('neutral/ink-13')) {
        staleInk.name = 'neutral/ink-13'
        themeByName.set('neutral/ink-13', staleInk)
        themeByName.delete('system/ink-13')
      }

      // ① system globals (brand-independent: every theme mode aliases the same seed;
      // idempotent — backfills pre-existing brand modes the moment the globals appear)
      const SYSTEM_GLOBALS = ['system/paper-raised', 'system/paper-sunken',
        'system/abs-black', 'system/abs-white', 'system/transparent', 'system/scrim']
      for (const path of SYSTEM_GLOBALS) {
        for (const m of th.coll.modes) aliasInto(path, path, m.modeId)
      }

      // ② neutral (+ ink-12 the anchor, folded into the neutral group like paper-0 — its
      // seed stays the system/ink-12 pole in the mode collection)
      const neutralGrp = shared.find(g => g.theme === 'neutral')
      if (neutralGrp) {
        for (const t of flatten(neutralGrp.light)) {
          aliasInto(`neutral/${t.path}`, `${neutralGrp.prim}/${t.path}`)
          if (t.path === 'ink-11') {
            // the anchor slots DIRECTLY after ink-11 — ladder order, before the cta/on tokens
            for (const m of th.coll.modes) aliasInto('neutral/ink-12', 'system/ink-12', m.modeId)
          }
        }
      }

      // ③ brand/primary always; brand/secondary depends on the secondary mode.
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
      // ④ signals → their shared primitive paths (engine order: red, yellow, green, info-color)
      for (const grp of shared) {
        if (grp === neutralGrp) continue
        for (const t of flatten(grp.light)) {
          aliasInto(`${grp.theme}/${t.path}`, `${grp.prim}/${t.path}`)
        }
      }

      // Elevation anchors — mode-DIVERGENT aliases: each mode points at a different
      // target, so card elevation holds its meaning as the ladder inverts. Both ends
      // are the brand-aware THEME neutral now (paper-0 is the engine's RESOLVED
      // anchor — white in light, one seam below paper-1 in dark, never absolute black):
      //   paper-raised → neutral/paper-0 (white) in light · neutral/paper-2 in dark
      //   paper-sunken → neutral/paper-2 in light · neutral/paper-0 (deep) in dark
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
        aliasElev('system/paper-raised', themeNeutralP0, themeNeutralP2)
        aliasElev('system/paper-sunken', themeNeutralP2, themeNeutralP0)
      }

      figma.ui.postMessage({ type: 'done', brand, aliases: aliasCount, createdShared, secondary: secondaryMode })
    } catch (err) {
      figma.ui.postMessage({ type: 'error', message: String(err) })
    }
  } else if (msg.type === 'close') {
    figma.closePlugin()
  }
}
