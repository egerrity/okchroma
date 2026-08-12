/// <reference path="./figma-env.d.ts" />

// THE CTA-INK HEAL (owner 2026-08-12, shipped with the cta-ink deletion). One-time,
// idempotent converter, run from the footer link (it replaced the Enterprise smoke
// test): finds every node application of a cta-ink / cta-ink-strong variable and
// re-binds it to the corresponding regular ramp ink — the ink stops ARE the text
// register now. Explicitly NOT a variable merge (owner's words): the variables are
// left in place (they are aliases onto the ink stops and keep resolving); only the
// loose applications move. A second run finds zero.
//
// Identity: this plugin's own rows carry the private PATH_KEY stamp and the shared
// 'okchroma' twin; community-plugin rows carry a stamp this plugin CANNOT read
// (pluginData is namespaced per plugin), so those match by NAME — a custom-renamed
// community cta-ink row is the one class the heal can't see, and it reports what it
// converted so the owner can eyeball the rest.

const PATH_KEY = 'okchroma-ext-path'
const SHARED_NS = 'okchroma'

// state → the ink leaf that carries it (the deleted trios' construction, C49/C46):
// cta-ink ascends 53→42→30; the neutral-only strong mirror descends 30→42→53.
const INK_FOR_STATE: Record<string, Record<string, string>> = {
  'cta-ink': { enabled: 'ink-53-aa', hover: 'ink-42-aa', pressed: 'ink-30-aaa' },
  'cta-ink-strong': { enabled: 'ink-30-aaa', hover: 'ink-42-aa', pressed: 'ink-53-aa' },
}
// legacy FLAT spellings (pre-banding files whose rows never migrated)
const FLAT_LEGACY: Record<string, [string, string]> = {
  'cta-ink': ['cta-ink', 'enabled'], 'cta-ink-hover': ['cta-ink', 'hover'], 'cta-ink-pressed': ['cta-ink', 'pressed'],
  'cta-ink-strong': ['cta-ink-strong', 'enabled'], 'cta-ink-strong-hover': ['cta-ink-strong', 'hover'], 'cta-ink-strong-pressed': ['cta-ink-strong', 'pressed'],
}

// canonical identity for a variable: our stamp, the shared twin, else the display name
function identityOf(v: figma.Variable): string {
  const own = v.getPluginData(PATH_KEY)
  if (own) return own
  try {
    const shared = v.getSharedPluginData(SHARED_NS, PATH_KEY)
    if (shared) return shared
  } catch { /* older builds */ }
  return v.name
}

// 'primitive/warning/cta-ink/enabled' → { prefix: 'primitive/warning/', ink: 'ink-53-aa' }
function inkTargetPathOf(identity: string): { prefix: string; ink: string } | undefined {
  const banded = /^(.*\/)?(cta-ink|cta-ink-strong)\/(enabled|hover|pressed)$/.exec(identity)
  if (banded) return { prefix: banded[1] ?? '', ink: INK_FOR_STATE[banded[2]][banded[3]] }
  const m = /^(.*\/)?(cta-ink(?:-strong)?(?:-hover|-pressed)?)$/.exec(identity)
  if (m && FLAT_LEGACY[m[2]]) {
    const [group, state] = FLAT_LEGACY[m[2]]
    return { prefix: m[1] ?? '', ink: INK_FOR_STATE[group][state] }
  }
  return undefined
}

export async function runHeal(): Promise<string[]> {
  const L: string[] = []
  const all = await figma.variables.getLocalVariablesAsync()

  // identity → variable, per collection (the replacement must live in the SAME
  // collection as the row it replaces, or a theme binding would jump lanes)
  const byCollection = new Map<string, Map<string, figma.Variable>>()
  for (const v of all) {
    const m = byCollection.get(v.variableCollectionId) ?? new Map<string, figma.Variable>()
    m.set(identityOf(v), v)
    byCollection.set(v.variableCollectionId, m)
  }

  // every cta-ink row → its ink replacement (same collection, same family prefix;
  // banded spelling tried second for files that never took the flatten migration)
  const replacementFor = new Map<string, figma.Variable>() // cta-ink variable id → ink variable
  const unresolved: string[] = []
  for (const v of all) {
    const target = inkTargetPathOf(identityOf(v))
    if (!target) continue
    const coll = byCollection.get(v.variableCollectionId)!
    const banded = target.ink.replace(/^ink-/, 'ink/')
    const ink = coll.get(target.prefix + target.ink) ?? coll.get(target.prefix + banded)
    if (ink) replacementFor.set(v.id, ink)
    else unresolved.push(v.name)
  }
  if (!replacementFor.size && !unresolved.length) return ['Nothing to heal — no cta-ink variables in this file.']

  // walk every page; re-bind fills/strokes (text color is a fill) that point at a
  // cta-ink row. Mirrors the Mapper's apply path (plugin-unify/code.ts).
  await figma.loadAllPagesAsync()
  let converted = 0, nodes = 0, failed = 0
  const nameById = new Map(all.map(v => [v.id, v.name]))
  const perToken = new Map<string, number>()
  const isSolid = (p: figma.Paint): p is figma.SolidPaint => p.type === 'SOLID'

  const healPaints = (node: figma.SceneNode) => {
    let touched = false
    // a paint's binding can live on the paint itself (paint.boundVariables.color) or on
    // the node (node.boundVariables.fills/strokes[i]) depending on API era — read both,
    // the Mapper's rule (plugin-unify/code.ts collectPaints)
    const swap = (paints: readonly figma.Paint[], nodeAliases?: readonly (figma.VariableAlias | null)[]): figma.Paint[] | undefined => {
      let changed = false
      const next = paints.map((p, i) => {
        if (!isSolid(p)) return p
        const alias = p.boundVariables?.color ?? nodeAliases?.[i]
        if (!alias) return p
        const target = replacementFor.get(alias.id)
        if (!target) return p
        const from = nameById.get(alias.id)
        if (from) perToken.set(from, (perToken.get(from) ?? 0) + 1)
        changed = true; converted++
        return figma.variables.setBoundVariableForPaint(p, 'color', target)
      })
      return changed ? next : undefined
    }
    try {
      const fills = node.fills
      if (fills === figma.mixed) {
        // mixed text: per-segment fills carry their own bindings
        const segs = node.getStyledTextSegments?.(['fills']) ?? []
        for (const seg of segs) {
          const next = swap(seg.fills)
          if (next) { node.setRangeFills!(seg.start, seg.end, next); touched = true }
        }
      } else if (fills) {
        const next = swap(fills, node.boundVariables?.fills)
        if (next) { (node as { fills?: unknown }).fills = next; touched = true }
      }
      const strokes = node.strokes
      if (strokes) {
        const next = swap(strokes, node.boundVariables?.strokes)
        if (next) { (node as { strokes?: unknown }).strokes = next; touched = true }
      }
    } catch { failed++ }
    if (touched) nodes++
  }

  for (const page of figma.root.children) {
    const stack: figma.SceneNode[] = [...(page.children ?? [])]
    while (stack.length) {
      const n = stack.pop()!
      if (n.removed) continue
      healPaints(n)
      if (n.children) for (const c of n.children) stack.push(c)
    }
  }

  L.push(converted
    ? `✓ converted ${converted} application${converted === 1 ? '' : 's'} on ${nodes} node${nodes === 1 ? '' : 's'} to the regular ramp inks`
    : '✓ no cta-ink applications found — nothing to convert')
  for (const [name, count] of [...perToken.entries()].sort())
    L.push(`   ${name} → ${count}`)
  if (unresolved.length)
    L.push(`✗ ${unresolved.length} cta-ink row${unresolved.length === 1 ? '' : 's'} with no matching ink in its collection (left alone): ${unresolved.join(', ')}`)
  if (failed) L.push(`✗ ${failed} node${failed === 1 ? '' : 's'} could not be read (skipped)`)
  L.push('The cta-ink variables themselves are left in place (aliases — they keep resolving). Delete them by hand when nothing you care about still binds them.')
  return L
}
