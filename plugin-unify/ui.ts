// The Mapper's UI thread — Stage 1 (inspect). Receives the sandbox's grouped
// inventory, badges what looks like Unify (collection-name match for bound
// variables, exact hex match for detached fills — the distilled export is the
// reference), renders Organizer-style rows, and builds the copyable report
// that seeds the Stage-2 mapping table.
import {
  UNIFY_THEMES, UNIFY_RAMPS, UNIFY_SIGNALS, UNIFY_SIGNAL_RAMPS, UNIFY_GRAY,
  UNIFY_SEMANTIC_CENSUS,
} from '../demo/unify-compare/unifyData'

type UsageKind = 'text' | 'fill' | 'stroke'
interface Usage { nodeId: string; nodeName: string; kind: UsageKind; pageId: string; pageName: string }
interface BoundGroup {
  varId: string; name: string; collection: string; remote: boolean; key: string
  values?: Record<string, { hex: string; a?: number }>
  usages: Usage[]
}
interface DetachedGroup { hex: string; alpha: number; usages: Usage[] }
interface ScanResults {
  type: 'scan-results'; scope: string; nodesScanned: number; currentPageId: string
  bound: BoundGroup[]; detached: DetachedGroup[]
}

// ── the Unify reference sets (from the distilled export) ────────────────────────
// Collections: the semantic palettes (census keys) + the structural collections the
// export mirrors. A bound variable whose collection matches is badged Unify.
const UNIFY_COLLECTIONS = new Set([
  ...Object.keys(UNIFY_SEMANTIC_CENSUS),
  'Color modes', 'Color themes', 'Color palettes',
])
// Values: every known Unify hex, both modes. A detached fill matching is badged.
const UNIFY_HEXES = new Set<string>()
const addHex = (h?: string) => { if (h) UNIFY_HEXES.add(h.toUpperCase()) }
for (const ramps of [UNIFY_RAMPS, UNIFY_SIGNAL_RAMPS]) {
  for (const stops of Object.values(ramps)) for (const s of stops) { addHex(s.light); addHex(s.dark) }
}
for (const s of UNIFY_GRAY) { addHex(s.light); addHex(s.dark) }
for (const s of UNIFY_SIGNALS) { addHex(s.light); addHex(s.dark) }
for (const t of UNIFY_THEMES) for (const a of [t.primary, t.highlight, t.accent]) { addHex(a.hex); addHex(a.darkHex) }

// ── DOM ─────────────────────────────────────────────────────────────────────────
const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T
const scopeSeg = $('scope-seg')
const scanBtn = $<HTMLButtonElement>('scan-btn')
const copyBtn = $<HTMLButtonElement>('copy-btn')
const statusEl = $('status')
const resultsEl = $('results')
const summaryEl = $('summary')
const boundRowsEl = $('bound-rows')
const detachedRowsEl = $('detached-rows')
const reportBuf = $<HTMLTextAreaElement>('report-buf')

let scope: 'selection' | 'page' | 'file' = 'page'
let lastResults: ScanResults | null = null

scopeSeg.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest('button')
  if (!b) return
  scope = b.dataset.scope as typeof scope
  scopeSeg.querySelectorAll('button').forEach(btn => btn.classList.toggle('on', btn === b))
})

scanBtn.addEventListener('click', () => {
  scanBtn.disabled = true
  statusEl.textContent = 'Scanning…'
  statusEl.classList.remove('err')
  parent.postMessage({ pluginMessage: { type: 'scan', scope } }, '*')
})

const USAGE_SHOWN = 12
const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const kindCounts = (usages: Usage[]): Record<UsageKind, number> => {
  const k: Record<UsageKind, number> = { text: 0, fill: 0, stroke: 0 }
  for (const u of usages) k[u.kind]++
  return k
}

function usageBody(usages: Usage[]): string {
  const shown = usages.slice(0, USAGE_SHOWN)
  const lines = shown.map(u => `
    <div class="usage-line"><span class="k">${u.kind}</span><span class="n">${esc(u.nodeName)}</span><span class="k">${esc(u.pageName)}</span></div>`).join('')
  const more = usages.length > USAGE_SHOWN ? `<div class="more">+ ${usages.length - USAGE_SHOWN} more</div>` : ''
  return `${lines}${more}<div class="usage-line"><button class="sel" data-select>Select on current page</button></div>`
}

function wireRow(row: HTMLElement, usages: Usage[]): void {
  row.querySelector('.row-head')!.addEventListener('click', () => row.classList.toggle('open'))
  row.querySelector('[data-select]')?.addEventListener('click', (e) => {
    e.stopPropagation()
    parent.postMessage({ pluginMessage: {
      type: 'select-nodes',
      ids: usages.map(u => u.nodeId),
      pageIds: usages.map(u => u.pageId),
    } }, '*')
  })
}

function render(r: ScanResults): void {
  const boundSorted = [...r.bound].sort((a, b) => b.usages.length - a.usages.length)
  const detachedUnify = r.detached.filter(d => UNIFY_HEXES.has(d.hex))
  const detachedOther = r.detached.filter(d => !UNIFY_HEXES.has(d.hex))
  const unifyBoundCount = boundSorted.filter(g => UNIFY_COLLECTIONS.has(g.collection)).length

  summaryEl.innerHTML = `
    <span><b>${r.nodesScanned}</b> nodes</span>
    <span><b>${boundSorted.length}</b> bound variables (<b>${unifyBoundCount}</b> Unify)</span>
    <span><b>${detachedUnify.length}</b> detached Unify values</span>
    <span><b>${detachedOther.length}</b> other detached</span>`

  boundRowsEl.innerHTML = ''
  for (const g of boundSorted) {
    const unify = UNIFY_COLLECTIONS.has(g.collection)
    const row = document.createElement('div')
    row.className = 'row'
    // per-mode value swatches (v1.1) — the owning collection's mode order, capped at 2
    const swatches = Object.values(g.values ?? {}).slice(0, 2)
      .map(v => `<span class="sw" style="background:${v.hex}"></span>`).join('')
    row.innerHTML = `
      <div class="row-head">
        ${swatches}
        <span class="row-name">${esc(g.name)}</span>
        ${g.collection ? `<span class="tag coll">${esc(g.collection)}</span>` : ''}
        ${g.remote ? '<span class="tag lib">library</span>' : ''}
        ${unify ? '<span class="tag unify">Unify</span>' : ''}
        <span class="count">${g.usages.length}</span>
      </div>
      <div class="row-body">${usageBody(g.usages)}</div>`
    wireRow(row, g.usages)
    boundRowsEl.appendChild(row)
  }
  if (!boundSorted.length) boundRowsEl.innerHTML = '<div class="row"><div class="row-head"><span class="row-name" style="color:#999;font-weight:400">none found</span></div></div>'

  detachedRowsEl.innerHTML = ''
  for (const d of [...detachedUnify, ...detachedOther].sort((a, b) => b.usages.length - a.usages.length)) {
    const unify = UNIFY_HEXES.has(d.hex)
    const row = document.createElement('div')
    row.className = 'row'
    const alpha = d.alpha < 1 ? ` · ${Math.round(d.alpha * 100)}%` : ''
    row.innerHTML = `
      <div class="row-head">
        <span class="sw" style="background:${d.hex}"></span>
        <span class="row-name">${d.hex}${alpha}</span>
        ${unify ? '<span class="tag unify">Unify</span>' : ''}
        <span class="count">${d.usages.length}</span>
      </div>
      <div class="row-body">${usageBody(d.usages)}</div>`
    wireRow(row, d.usages)
    detachedRowsEl.appendChild(row)
  }
  if (!r.detached.length) detachedRowsEl.innerHTML = '<div class="row"><div class="row-head"><span class="row-name" style="color:#999;font-weight:400">none found</span></div></div>'

  resultsEl.style.display = ''
}

// The copyable report — the Stage-2 mapping table's input. Identities and counts,
// not node lists: what tokens exist, where from, how used.
function buildReport(r: ScanResults): string {
  const pagesOf = (usages: Usage[]) => [...new Set(usages.map(u => u.pageName))]
  return JSON.stringify({
    mapper: 'stage-1 inventory',
    scope: r.scope,
    nodesScanned: r.nodesScanned,
    bound: [...r.bound].sort((a, b) => b.usages.length - a.usages.length).map(g => ({
      name: g.name, collection: g.collection, remote: g.remote, key: g.key,
      unify: UNIFY_COLLECTIONS.has(g.collection),
      values: g.values ?? {},
      count: g.usages.length, kinds: kindCounts(g.usages), pages: pagesOf(g.usages),
    })),
    detached: r.detached.map(d => ({
      hex: d.hex, alpha: d.alpha, unify: UNIFY_HEXES.has(d.hex),
      count: d.usages.length, kinds: kindCounts(d.usages), pages: pagesOf(d.usages),
    })),
  }, null, 2)
}

copyBtn.addEventListener('click', () => {
  if (!lastResults) return
  reportBuf.value = buildReport(lastResults)
  reportBuf.select()
  document.execCommand('copy')
  statusEl.textContent = 'Report copied to clipboard.'
})

window.onmessage = (event: MessageEvent) => {
  const msg = event.data?.pluginMessage
  if (!msg) return
  if (msg.type === 'scan-results') {
    lastResults = msg as ScanResults
    scanBtn.disabled = false
    copyBtn.disabled = false
    statusEl.textContent = `Scanned ${msg.nodesScanned} nodes (${msg.scope}).`
    render(lastResults)
  } else if (msg.type === 'error') {
    scanBtn.disabled = false
    statusEl.textContent = String(msg.message)
    statusEl.classList.add('err')
  }
}
