/// <reference path="./figma-env.d.ts" />

// The plan-§2 VERIFY-FIRST list as an executable smoke test, run from the plugin UI's
// "Run Enterprise smoke test" link on an Enterprise seat. Everything works on scratch
// collections (okc-smoke-*) that are removed afterwards — no OKChroma collections touched.
//
// Probes:
//   §2.1  can an override value be a VariableAlias?          (the top unknown)
//   §2.2  does .extend() exist / throw on this plan?          (the feature gate)
//   §2.3  extension-of-extension (nesting)                    (note-only)
//   §2.5  scopes live base-level on the Variable              (assumed shared)
//   plus: parentModeId mapping, variableOverrides shape, removeOverrideForMode,
//         valuesByModeForCollectionAsync, discovery via getLocalVariableCollectionsAsync.
//   §2.4  (how a designer APPLIES an extension to a frame) is a manual check — see the
//         closing line the test prints.

export async function runSmoke(): Promise<string[]> {
  const L: string[] = []
  const ok = (name: string, pass: boolean, note = '') =>
    L.push(`${pass ? '✓' : '✗'} ${name}${note ? ` — ${note}` : ''}`)

  const base = figma.variables.createVariableCollection('okc-smoke-base')
  let ext: figma.ExtendedVariableCollection | null = null
  try {
    const light = base.modes[0].modeId
    base.renameMode(light, 'Light')
    const dark = base.addMode('Dark')
    const v = figma.variables.createVariable('probe/color', base, 'COLOR')
    v.setValueForMode(light, { r: 1, g: 0, b: 0 })
    v.setValueForMode(dark, { r: 0, g: 0, b: 1 })
    const target = figma.variables.createVariable('probe/target', base, 'COLOR')
    target.setValueForMode(light, { r: 0, g: 1, b: 0 })
    target.setValueForMode(dark, { r: 0, g: 1, b: 0 })

    // §2.2 — the gate
    ok('collection.extend exists (Enterprise gate)', typeof base.extend === 'function')
    if (typeof base.extend !== 'function') return L
    try {
      ext = base.extend('okc-smoke-ext')
    } catch (e) {
      ok('extend() call', false, `throws on this plan: ${String(e)}`)
      return L
    }
    ok('extend() call', true)
    ok('isExtension flag', ext.isExtension === true)
    ok('parent/root ids point at the base',
      ext.parentVariableCollectionId === base.id && ext.rootVariableCollectionId === base.id,
      `parent=${ext.parentVariableCollectionId} root=${ext.rootVariableCollectionId}`)
    const em = ext.modes.find(m => m.parentModeId === light)
    ok('parentModeId maps the extension mode onto base Light', !!em,
      `ext modes: ${ext.modes.map(m => `${m.name}→${m.parentModeId}`).join(', ')}`)
    if (!em) return L

    // raw override: set → read back (both APIs) → remove
    v.setValueForMode(em.modeId, { r: 0, g: 0, b: 0 })
    const recorded = ext.variableOverrides[v.id]?.[em.modeId]
    ok('variableOverrides records a raw override', recorded !== undefined)
    const seen = (await v.valuesByModeForCollectionAsync(ext))[em.modeId]
    ok('valuesByModeForCollectionAsync returns the override',
      !!seen && !('type' in (seen as object)) && (seen as figma.RGBA).r < 1 / 1024)
    v.removeOverrideForMode(em.modeId)
    ok('removeOverrideForMode clears it', ext.variableOverrides[v.id]?.[em.modeId] === undefined)

    // §2.1 — THE top verify-first probe: alias as an override value.
    // v2 doesn't depend on the answer (alias-carrying tokens are base-only by design),
    // but a pass unlocks per-brand alias overrides for any future need.
    try {
      v.setValueForMode(em.modeId, figma.variables.createVariableAlias(target))
      const av = (await v.valuesByModeForCollectionAsync(ext))[em.modeId]
      ok('ALIAS as an override value (§2.1)', !!av && typeof av === 'object' && 'type' in (av as object),
        'per-mode alias overrides WORK')
      v.removeOverrideForMode(em.modeId)
    } catch (e) {
      ok('ALIAS as an override value (§2.1)', false,
        `throws: ${String(e)} — fine: v2 keeps alias tokens base-only`)
    }

    // §2.5 — scopes are a base-level Variable property; extensions expose no scope
    // API of their own, so they share them (exactly what v2 assumes).
    ok('scopes live on the base variable (§2.5)', Array.isArray(v.scopes),
      `scopes=${JSON.stringify(v.scopes)}; no scope API on the extension`)

    // §2.3 — nesting (note-only; v2 never chains)
    try {
      const nested = typeof ext.extend === 'function' ? ext.extend('okc-smoke-nested') : null
      ok('extension-of-extension (§2.3)', !!nested,
        nested ? `chains; root stays ${nested.rootVariableCollectionId === base.id ? 'the base' : nested.rootVariableCollectionId}` : 'extend absent on extensions')
      if (nested) nested.remove()
    } catch (e) {
      ok('extension-of-extension (§2.3)', false, `throws: ${String(e)}`)
    }

    // discovery — v2's lookup path depends on this
    const all = await figma.variables.getLocalVariableCollectionsAsync()
    ok('extension appears in getLocalVariableCollectionsAsync', all.some(c => c.id === ext!.id))
    ext.setPluginData('okc-smoke', 'v')
    ok('pluginData on the extension', ext.getPluginData('okc-smoke') === 'v')

    L.push('◦ §2.4 is manual: apply okc-smoke-ext to a frame via the layer panel’s mode/collection switcher and note the picker UX (drives the install-page copy). Re-run after removing the scratch collections if you want a clean file.')
  } finally {
    try { if (ext) ext.remove() } catch { /* removed with the base */ }
    try { base.remove() } catch { /* already gone */ }
  }
  return L
}
