/// <reference path="./figma-env.d.ts" />

// The Mapper's sandbox — v1.2. Scan stays read-only and now records, per usage, the
// nearest named ancestor (main component / instance name, else the nearest named
// frame) and the exact paint slot, so the UI can cluster "similar elements with
// similar fills" and the apply can rebind precisely. Apply is the ONLY writer and
// touches exactly the usages the UI sends — per cluster, never per file (owner
// 2026-08-11: too many subjective decisions for anything coarser).

import { allCandidatePaths } from './mapping'

figma.showUI(__html__, { width: 720, height: 720, themeColors: true })

type UsageKind = 'text' | 'fill' | 'stroke'
interface Usage {
  nodeId: string; nodeName: string; kind: UsageKind; pageId: string; pageName: string
  /** nearest named ancestor: instance/component name, else nearest named frame, else page */
  anc: string
  /** exact paint location for the rebind */
  slot: 'fills' | 'strokes' | 'seg'
  index: number
  start?: number; end?: number
}
interface BoundGroup {
  varId: string; name: string; collection: string; remote: boolean; key: string
  values: Record<string, { hex: string; a?: number }>
  usages: Usage[]
}

const toHex = (c: figma.RGB): string => {
  const ch = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')
  return `#${ch(c.r)}${ch(c.g)}${ch(c.b)}`.toUpperCase()
}

const isSolid = (p: figma.Paint): p is figma.SolidPaint => p.type === 'SOLID' && p.visible !== false

// ── variable/collection caches ─────────────────────────────────────────────────
const varCache = new Map<string, figma.Variable | null>()
const collCache = new Map<string, figma.VariableCollection | null>()
const varById = async (id: string): Promise<figma.Variable | null> => {
  if (!varCache.has(id)) {
    try { varCache.set(id, await figma.variables.getVariableByIdAsync(id)) } catch { varCache.set(id, null) }
  }
  return varCache.get(id)!
}
const collById = async (id: string): Promise<figma.VariableCollection | null> => {
  if (!collCache.has(id)) {
    try { collCache.set(id, await figma.variables.getVariableCollectionByIdAsync(id)) } catch { collCache.set(id, null) }
  }
  return collCache.get(id)!
}

const pickMode = (coll: figma.VariableCollection, wantName: string): string | undefined => {
  const m = coll.modes.find(x => x.name.toLowerCase() === wantName.toLowerCase()) ?? coll.modes[0]
  return m?.modeId
}

async function resolveColor(v: figma.Variable, modeName: string, depth = 0): Promise<figma.RGBA | undefined> {
  if (depth > 8) return undefined
  let vv = v
  if (!vv.valuesByMode || !Object.keys(vv.valuesByMode).length) {
    try { vv = await figma.variables.importVariableByKeyAsync(v.key) } catch { return undefined }
  }
  const coll = await collById(vv.variableCollectionId)
  if (!coll) return undefined
  const modeId = pickMode(coll, modeName)
  if (!modeId) return undefined
  const val = vv.valuesByMode[modeId]
  if (!val) return undefined
  if ((val as figma.VariableAlias).type === 'VARIABLE_ALIAS') {
    const inner = await varById((val as figma.VariableAlias).id)
    return inner ? resolveColor(inner, modeName, depth + 1) : undefined
  }
  return val as figma.RGBA
}

async function resolveValues(v: figma.Variable): Promise<Record<string, { hex: string; a?: number }>> {
  const out: Record<string, { hex: string; a?: number }> = {}
  let vv = v
  if (!vv.valuesByMode || !Object.keys(vv.valuesByMode).length) {
    try { vv = await figma.variables.importVariableByKeyAsync(v.key) } catch { return out }
  }
  const coll = await collById(vv.variableCollectionId)
  if (!coll) return out
  for (const mode of coll.modes) {
    const c = await resolveColor(vv, mode.name)
    if (c) out[mode.name] = c.a !== undefined && c.a < 1 ? { hex: toHex(c), a: c.a } : { hex: toHex(c) }
  }
  return out
}

// ── okchroma target lookup (shared stamp first, default-spelled name fallback) ──
const SHARED_NS = 'okchroma'
const SHARED_KEY = 'okchroma-ext-path'
async function buildTargetMap(): Promise<Map<string, figma.Variable>> {
  const map = new Map<string, figma.Variable>()
  const all = await figma.variables.getLocalVariablesAsync()
  for (const v of all) {
    let stamped = ''
    try { stamped = v.getSharedPluginData(SHARED_NS, SHARED_KEY) } catch { /* older builds */ }
    if (stamped) { map.set(stamped, v); continue }
    if (v.name.startsWith('primitive/') && !map.has(v.name)) map.set(v.name, v)
  }
  return map
}

// ── scan ────────────────────────────────────────────────────────────────────────
function collectPaints(
  node: figma.SceneNode, page: figma.PageNode, anc: string,
  bound: Map<string, Usage[]>, detached: Map<string, { hex: string; alpha: number; usages: Usage[] }>,
): void {
  const usage = (kind: UsageKind, slot: Usage['slot'], index: number, start?: number, end?: number): Usage =>
    ({ nodeId: node.id, nodeName: node.name, kind, pageId: page.id, pageName: page.name, anc, slot, index, start, end })
  const record = (paint: figma.Paint, alias: figma.VariableAlias | null | undefined, u: Usage) => {
    if (!isSolid(paint)) return
    const a = alias ?? paint.boundVariables?.color
    if (a) {
      const list = bound.get(a.id) ?? []
      list.push(u); bound.set(a.id, list)
    } else {
      const hex = toHex(paint.color)
      const alpha = paint.opacity ?? 1
      const k = `${hex}@${alpha.toFixed(3)}`
      const g = detached.get(k) ?? { hex, alpha, usages: [] }
      g.usages.push(u); detached.set(k, g)
    }
  }

  const fillKind: UsageKind = node.type === 'TEXT' ? 'text' : 'fill'
  const fills = node.fills
  if (fills === figma.mixed) {
    const segs = node.getStyledTextSegments?.(['fills']) ?? []
    for (const seg of segs) seg.fills.forEach((p, i) => record(p, undefined, usage('text', 'seg', i, seg.start, seg.end)))
  } else if (fills) {
    fills.forEach((p, i) => record(p, node.boundVariables?.fills?.[i], usage(fillKind, 'fills', i)))
  }
  node.strokes?.forEach((p, i) => record(p, node.boundVariables?.strokes?.[i], usage('stroke', 'strokes', i)))
}

async function scan(scope: 'selection' | 'page' | 'file'): Promise<void> {
  const bound = new Map<string, Usage[]>()
  const detached = new Map<string, { hex: string; alpha: number; usages: Usage[] }>()
  let nodesScanned = 0

  const walk = (root: figma.SceneNode, page: figma.PageNode) => {
    // ancestor label rides the stack: instance/component name wins, else nearest
    // named frame, else the page
    const stack: Array<{ n: figma.SceneNode; anc: string }> = [{ n: root, anc: page.name }]
    while (stack.length) {
      const { n, anc } = stack.pop()!
      if (n.removed) continue
      nodesScanned++
      collectPaints(n, page, anc, bound, detached)
      const nextAnc = (n.type === 'INSTANCE' || n.type === 'COMPONENT' || n.type === 'COMPONENT_SET') ? n.name
        : (n.type === 'FRAME' && anc === page.name && n.name ? n.name : anc)
      if (n.children) for (const c of n.children) stack.push({ n: c, anc: nextAnc })
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

  const groups: BoundGroup[] = []
  for (const [varId, usages] of bound) {
    let name = '(unresolvable)', collection = '', remote = false, key = ''
    let values: Record<string, { hex: string; a?: number }> = {}
    const v = await varById(varId)
    if (v) {
      name = v.name; remote = v.remote; key = v.key
      const c = await collById(v.variableCollectionId)
      if (c) collection = c.name
      values = await resolveValues(v)
    }
    groups.push({ varId, name, collection, remote, key, values, usages })
  }

  // the file's okchroma targets — the candidate chips show the FILE's real values
  const targetMap = await buildTargetMap()
  const okTargets: Array<{ path: string; light?: string; dark?: string }> = []
  for (const path of allCandidatePaths()) {
    const v = targetMap.get(path)
    if (!v) continue
    const vals = await resolveValues(v)
    const light = vals['light'] ?? vals['Light']
    const dark = vals['dark'] ?? vals['Dark']
    okTargets.push({ path, light: light?.hex, dark: dark?.hex })
  }

  figma.ui.postMessage({
    type: 'scan-results',
    scope,
    nodesScanned,
    currentPageId: figma.currentPage.id,
    bound: groups,
    detached: [...detached.values()],
    okTargets,
  })
}

// ── apply (the only writer; exactly the usages the UI sent) ─────────────────────
async function applyPicks(picks: Array<{ path: string; usages: Usage[] }>): Promise<void> {
  const targetMap = await buildTargetMap()
  let applied = 0, skipped = 0
  const missing: string[] = []
  for (const pick of picks) {
    const target = targetMap.get(pick.path)
    if (!target) { missing.push(pick.path); skipped += pick.usages.length; continue }
    for (const u of pick.usages) {
      try {
        const node = await figma.getNodeByIdAsync(u.nodeId)
        if (!node || node.removed) { skipped++; continue }
        if (u.slot === 'seg') {
          // re-read the segment: text may have shifted since the scan — a mismatch skips
          const segs = node.getStyledTextSegments?.(['fills']) ?? []
          const seg = segs.find(s => s.start === u.start && s.end === u.end)
          const paint = seg?.fills[u.index]
          if (!seg || !paint || !isSolid(paint)) { skipped++; continue }
          const fills = [...seg.fills]
          fills[u.index] = figma.variables.setBoundVariableForPaint(paint, 'color', target)
          node.setRangeFills!(seg.start, seg.end, fills)
        } else {
          const arr = node[u.slot]
          if (!arr || arr === figma.mixed) { skipped++; continue }
          const paint = arr[u.index]
          if (!paint || !isSolid(paint)) { skipped++; continue }
          const next = [...arr]
          next[u.index] = figma.variables.setBoundVariableForPaint(paint, 'color', target)
          ;(node as { fills?: unknown; strokes?: unknown })[u.slot] = next
        }
        applied++
      } catch { skipped++ }
    }
  }
  figma.ui.postMessage({ type: 'apply-result', applied, skipped, missing })
  if (missing.length) figma.notify(`${missing.length} okchroma targets missing — re-apply the theme with the extended plugin once`, { timeout: 5000 })
}

figma.ui.onmessage = async (msg) => {
  try {
    if (msg.type === 'scan') {
      await scan(msg.scope as 'selection' | 'page' | 'file')
    } else if (msg.type === 'apply-picks') {
      await applyPicks(msg.picks as Array<{ path: string; usages: Usage[] }>)
    } else if (msg.type === 'select-nodes') {
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
