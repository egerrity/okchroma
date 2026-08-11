/// <reference path="./figma-env.d.ts" />

// The Mapper's sandbox — Stage 1 is INSPECT-ONLY: no writes, ever. Walks the chosen
// scope, collects every solid paint's binding (bound variable or detached value) across
// fills, strokes, and per-segment text fills, resolves variable identities, and hands
// the UI a grouped inventory. The UI does the Unify matching (it bundles unifyData);
// the sandbox stays data-shaped and dumb.

figma.showUI(__html__, { width: 480, height: 640, themeColors: true })

type UsageKind = 'text' | 'fill' | 'stroke'
interface Usage { nodeId: string; nodeName: string; kind: UsageKind; pageId: string; pageName: string }
interface BoundGroup {
  varId: string; name: string; collection: string; remote: boolean; key: string; usages: Usage[]
}
interface DetachedGroup { hex: string; alpha: number; usages: Usage[] }

const toHex = (c: figma.RGB): string => {
  const ch = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')
  return `#${ch(c.r)}${ch(c.g)}${ch(c.b)}`.toUpperCase()
}

const isSolid = (p: figma.Paint): p is figma.SolidPaint => p.type === 'SOLID' && p.visible !== false

function collectPaints(
  node: figma.SceneNode, page: figma.PageNode,
  bound: Map<string, Usage[]>, detached: Map<string, { hex: string; alpha: number; usages: Usage[] }>,
): void {
  const usage = (kind: UsageKind): Usage =>
    ({ nodeId: node.id, nodeName: node.name, kind, pageId: page.id, pageName: page.name })
  const record = (paint: figma.Paint, alias: figma.VariableAlias | null | undefined, kind: UsageKind) => {
    if (!isSolid(paint)) return
    const a = alias ?? paint.boundVariables?.color
    if (a) {
      const list = bound.get(a.id) ?? []
      list.push(usage(kind)); bound.set(a.id, list)
    } else {
      const hex = toHex(paint.color)
      const alpha = paint.opacity ?? 1
      const k = `${hex}@${alpha.toFixed(3)}`
      const g = detached.get(k) ?? { hex, alpha, usages: [] }
      g.usages.push(usage(kind)); detached.set(k, g)
    }
  }

  const fillKind: UsageKind = node.type === 'TEXT' ? 'text' : 'fill'
  const fills = node.fills
  if (fills === figma.mixed) {
    // mixed text fills: the segments carry their own paints (+ per-paint aliases)
    const segs = node.getStyledTextSegments?.(['fills']) ?? []
    for (const seg of segs) for (const p of seg.fills) record(p, undefined, 'text')
  } else if (fills) {
    fills.forEach((p, i) => record(p, node.boundVariables?.fills?.[i], fillKind))
  }
  node.strokes?.forEach((p, i) => record(p, node.boundVariables?.strokes?.[i], 'stroke'))
}

async function scan(scope: 'selection' | 'page' | 'file'): Promise<void> {
  const bound = new Map<string, Usage[]>()
  const detached = new Map<string, { hex: string; alpha: number; usages: Usage[] }>()
  let nodesScanned = 0

  const walk = (root: figma.SceneNode, page: figma.PageNode) => {
    const stack: figma.SceneNode[] = [root]
    while (stack.length) {
      const n = stack.pop()!
      if (n.removed) continue
      nodesScanned++
      collectPaints(n, page, bound, detached)
      if (n.children) for (const c of n.children) stack.push(c)
    }
  }

  if (scope === 'file') {
    await figma.loadAllPagesAsync()
    for (const page of figma.root.children) for (const c of page.children ?? []) walk(c, page)
  } else if (scope === 'page') {
    for (const c of figma.currentPage.children ?? []) walk(c, figma.currentPage)
  } else {
    for (const n of figma.currentPage.selection) walk(n, figma.currentPage)
  }

  // resolve variable identities — remote (library) variables resolve fine from a bound
  // alias id; a failed lookup still ships as a group so nothing silently vanishes
  const groups: BoundGroup[] = []
  for (const [varId, usages] of bound) {
    let name = '(unresolvable)', collection = '', remote = false, key = ''
    try {
      const v = await figma.variables.getVariableByIdAsync(varId)
      if (v) {
        name = v.name; remote = v.remote; key = v.key
        try {
          const c = await figma.variables.getVariableCollectionByIdAsync(v.variableCollectionId)
          if (c) collection = c.name
        } catch { /* remote collection not resolvable on this plan — name stands alone */ }
      }
    } catch { /* keep the unresolvable group */ }
    groups.push({ varId, name, collection, remote, key, usages })
  }

  figma.ui.postMessage({
    type: 'scan-results',
    scope,
    nodesScanned,
    currentPageId: figma.currentPage.id,
    bound: groups,
    detached: [...detached.values()],
  })
}

figma.ui.onmessage = async (msg) => {
  try {
    if (msg.type === 'scan') {
      await scan(msg.scope as 'selection' | 'page' | 'file')
    } else if (msg.type === 'select-nodes') {
      // selection is a current-page concept: select what lives here, count the rest
      const ids = msg.ids as string[]
      const pageIds = msg.pageIds as string[]
      const here: figma.SceneNode[] = []
      let elsewhere = 0
      for (let i = 0; i < ids.length; i++) {
        if (pageIds[i] !== figma.currentPage.id) { elsewhere++; continue }
        const n = await figma.getNodeByIdAsync(ids[i])
        if (n && !n.removed) here.push(n)
      }
      if (here.length) {
        figma.currentPage.selection = here
        figma.viewport.scrollAndZoomIntoView(here)
      }
      if (elsewhere) figma.notify(`${here.length} selected — ${elsewhere} on other pages`, { timeout: 3000 })
      else if (!here.length) figma.notify('Nothing from this group on the current page', { timeout: 3000 })
    } else if (msg.type === 'close') {
      figma.closePlugin()
    }
  } catch (e) {
    figma.ui.postMessage({ type: 'error', message: String(e) })
  }
}
