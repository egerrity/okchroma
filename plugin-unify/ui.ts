// The Mapper's UI — v1.2, the review-and-apply surface. Groups every matched Unify
// token into CLUSTERS of similar elements (usage kind x nearest component/element
// ancestor); each cluster gets its own candidate pick and its own apply (owner
// 2026-08-11: per-element groups, never per file — too many subjective decisions).
// Candidate chips show the FILE's real okchroma values (sandbox-resolved); a missing
// target means the okchroma theme needs one re-apply with the extended plugin.
import { matchBound, matchDetached, UNIFY_COLLECTIONS, IGNORE_COLLECTIONS, BRAND_CTA_ON, isCtaContext, type Rule } from './mapping'

type UsageKind = 'text' | 'fill' | 'stroke'
interface Usage {
  nodeId: string; nodeName: string; kind: UsageKind; pageId: string; pageName: string
  anc: string; slot: 'fills' | 'strokes' | 'seg'; index: number; start?: number; end?: number
}
interface BoundGroup {
  varId: string; name: string; collection: string; remote: boolean; key: string
  values: Record<string, { hex: string; a?: number }>
  usages: Usage[]
}
interface DetachedGroup { hex: string; alpha: number; usages: Usage[] }
interface OkTarget { path: string; light?: string; dark?: string }
interface ScanResults {
  type: 'scan-results'; scope: string; nodesScanned: number; currentPageId: string
  bound: BoundGroup[]; detached: DetachedGroup[]; okTargets: OkTarget[]
}

interface Cluster { id: string; kind: UsageKind; anc: string; usages: Usage[] }
interface TokenBucket {
  key: string; label: string; full: string; sub: string; previewHex: string; previewAlpha?: number
  rule: Rule; suggested: boolean
  clusters: Cluster[]
  total: number
}

// ── DOM ─────────────────────────────────────────────────────────────────────────
const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T
const scopeSeg = $('scope-seg')
const scanBtn = $<HTMLButtonElement>('scan-btn')
const applyAllBtn = $<HTMLButtonElement>('apply-all-btn')
const copyBtn = $<HTMLButtonElement>('copy-btn')
const statusEl = $('status')
const resultsEl = $('results')
const summaryEl = $('summary')
const matchedEl = $('matched-rows')
const restEl = $('rest-rows')
const reportBuf = $<HTMLTextAreaElement>('report-buf')

// Selection is the DEFAULT scope (owner 2026-08-11: no accidental hangs on a big scan)
let scope: 'selection' | 'page' | 'file' = 'selection'
let lastResults: ScanResults | null = null
let okValues = new Map<string, OkTarget>()
let buckets: TokenBucket[] = []
const picks = new Map<string, string>() // clusterId -> chosen path

scopeSeg.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest('button')
  if (!btn) return
  scope = btn.dataset.scope as typeof scope
  scopeSeg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === btn))
})

scanBtn.addEventListener('click', () => {
  scanBtn.disabled = true
  statusEl.textContent = 'Scanning…'
  statusEl.classList.remove('err')
  parent.postMessage({ pluginMessage: { type: 'scan', scope } }, '*')
})

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// ── model ───────────────────────────────────────────────────────────────────────
const clustersOf = (usages: Usage[], bucketKey: string): Cluster[] => {
  const m = new Map<string, Cluster>()
  for (const u of usages) {
    const id = `${bucketKey}|${u.kind}|${u.anc}`
    const c = m.get(id) ?? { id, kind: u.kind, anc: u.anc, usages: [] }
    c.usages.push(u); m.set(id, c)
  }
  return [...m.values()].sort((a, b) => b.usages.length - a.usages.length)
}

const dist = (a: string, b: string): number => {
  const ch = (h: string, i: number) => parseInt(h.slice(i, i + 2), 16)
  return Math.abs(ch(a, 1) - ch(b, 1)) + Math.abs(ch(a, 3) - ch(b, 3)) + Math.abs(ch(a, 5) - ch(b, 5))
}
const nearestPaths = (hex: string, count: number): string[] =>
  [...okValues.values()].filter(t => t.light)
    .sort((a, b) => dist(hex, a.light!) - dist(hex, b.light!))
    .slice(0, count).map(t => t.path)

function buildModel(r: ScanResults): { ignored: number; other: number } {
  okValues = new Map(r.okTargets.map(t => [t.path, t]))
  const byKey = new Map<string, { label: string; full: string; sub: string; hex: string; alpha?: number; rule: Rule; suggested: boolean; usages: Usage[] }>()
  let ignored = 0, other = 0

  for (const g of r.bound) {
    if (IGNORE_COLLECTIONS.has(g.collection)) { ignored += g.usages.length; continue }
    if (!UNIFY_COLLECTIONS.has(g.collection)) { other += g.usages.length; continue }
    const m = matchBound(g.name)
    if (m === 'ignore') { ignored += g.usages.length; continue }
    const firstVal = Object.values(g.values)[0]
    const rule: Rule = m ?? { candidates: firstVal ? nearestPaths(firstVal.hex, 2) : [] }
    // merge VINTAGES: same display name = one bucket, keys differ underneath
    const key = `tok:${g.name}`
    // display = the final name segment (owner 2026-08-11); the full path stays as the tooltip
    const b = byKey.get(key) ?? { label: g.name.split('/').pop() ?? g.name, full: g.name, sub: g.collection, hex: firstVal?.hex ?? '#888888', alpha: firstVal?.a, rule, suggested: m === null, usages: [] }
    b.usages.push(...g.usages); byKey.set(key, b)
  }
  for (const d of r.detached) {
    const m = matchDetached(d.hex, d.alpha)
    if (m === 'ignore') { ignored += d.usages.length; continue }
    if (m === null) { other += d.usages.length; continue }
    const key = `hex:${d.hex}@${d.alpha.toFixed(2)}`
    const alphaLabel = d.alpha < 1 ? ` @ ${Math.round(d.alpha * 100)}%` : ''
    const b = byKey.get(key) ?? { label: `${d.hex}${alphaLabel} (detached)`, full: `${d.hex}${alphaLabel} (detached)`, sub: 'raw value', hex: d.hex, alpha: d.alpha, rule: m, suggested: false, usages: [] }
    b.usages.push(...d.usages); byKey.set(key, b)
  }

  buckets = [...byKey.entries()].map(([key, b]) => ({
    key, label: b.label, full: b.full, sub: b.sub, previewHex: b.hex, previewAlpha: b.alpha,
    rule: b.rule, suggested: b.suggested,
    clusters: clustersOf(b.usages, key), total: b.usages.length,
  })).sort((a, b) => b.total - a.total)

  // auto rules pre-pick their single candidate on every cluster; the on-cta
  // exception routes button-ish clusters to cta/on instead (owner 2026-08-11:
  // Content Primary/Secondary are ALWAYS 30/53, EXCEPT on cta buttons -> cta/on)
  picks.clear()
  for (const b of buckets) if (b.rule.auto && b.rule.candidates.length === 1) {
    for (const c of b.clusters) {
      picks.set(c.id, b.rule.onCtaException && isCtaContext(c.anc) && okValues.has(BRAND_CTA_ON)
        ? BRAND_CTA_ON : b.rule.candidates[0])
    }
  }
  return { ignored, other }
}

// ── render ──────────────────────────────────────────────────────────────────────
const chipHtml = (clusterId: string, path: string, picked: boolean): string => {
  const t = okValues.get(path)
  const short = path.replace('primitive/', '')
  if (!t || !t.light) return `<span class="okchip miss" title="target missing — re-apply the okchroma theme once">${esc(short)}</span>`
  return `<button class="okchip${picked ? ' sel' : ''}" data-cluster="${esc(clusterId)}" data-path="${esc(path)}">
    <span class="pair"><span style="background:${t.light}"></span><span style="background:${t.dark ?? '#111'}"></span></span>${esc(short)}</button>`
}

const clusterHtml = (b: TokenBucket, c: Cluster): string => {
  // button-ish clusters of on-cta-exception tokens lead with cta/on
  const base = b.rule.onCtaException && isCtaContext(c.anc)
    ? [BRAND_CTA_ON, ...b.rule.candidates] : b.rule.candidates
  // a pick made through "Other…" may sit outside the shortlist — always render it
  const picked = picks.get(c.id)
  const chips = picked && !base.includes(picked) ? [...base, picked] : base
  return `
  <div class="cluster" data-cluster="${esc(c.id)}">
    <span class="ck">${c.kind}</span>
    <span class="ca" title="${esc(c.anc)}">${esc(c.anc)}</span>
    <span class="cn">${c.usages.length}</span>
    <button class="sel" data-select="${esc(c.id)}">Select</button>
    <span class="chips">${chips.map(p => chipHtml(c.id, p, picked === p)).join('')}
      <button class="okchip more" data-more="${esc(c.id)}">Other…</button></span>
    <button class="apply" data-apply="${esc(c.id)}" ${picks.has(c.id) ? '' : 'disabled'}>Apply</button>
    <div class="morepanel" data-panel="${esc(c.id)}" style="display:none"></div>
  </div>`
}

// the full target list, grouped by family — the escape hatch when the shortlist
// doesn't carry the right answer (owner 2026-08-11: "stroke quaternary is closest
// to wash 92 but i can't select that")
function morePanelHtml(clusterId: string): string {
  const fams = new Map<string, OkTarget[]>()
  for (const t of okValues.values()) {
    const famName = t.path.replace('primitive/', '').split('/')[0]
    const list = fams.get(famName) ?? []
    list.push(t); fams.set(famName, list)
  }
  return [...fams.entries()].map(([famName, list]) => `
    <div class="mf"><span class="mfn">${esc(famName)}</span>${
      list.map(t => chipHtml(clusterId, t.path, picks.get(clusterId) === t.path)).join('')
    }</div>`).join('')
}

// header chips: selected when EVERY cluster currently picks that path; a header
// pick cascades to all clusters (owner 2026-08-11: "all the background primary
// applications here are X")
const headerChipHtml = (b: TokenBucket, path: string): string => {
  const t = okValues.get(path)
  const short = path.replace('primitive/', '')
  const allPicked = b.clusters.length > 0 && b.clusters.every(c => picks.get(c.id) === path)
  if (!t || !t.light) return `<span class="okchip miss" title="target missing — re-apply the okchroma theme once">${esc(short)}</span>`
  return `<button class="okchip${allPicked ? ' sel' : ''}" data-bucket="${esc(b.key)}" data-path="${esc(path)}">
    <span class="pair"><span style="background:${t.light}"></span><span style="background:${t.dark ?? '#111'}"></span></span>${esc(short)}</button>`
}

const bucketRow = (b: TokenBucket): string => {
  const preview = b.previewAlpha !== undefined && b.previewAlpha < 1
    ? `rgba(${parseInt(b.previewHex.slice(1, 3), 16)},${parseInt(b.previewHex.slice(3, 5), 16)},${parseInt(b.previewHex.slice(5, 7), 16)},${b.previewAlpha})`
    : b.previewHex
  const pickedCount = b.clusters.filter(c => picks.has(c.id)).length
  // a cascaded off-shortlist header pick renders like any cluster chip
  const uniform = b.clusters.length && b.clusters.every(c => picks.get(c.id) === picks.get(b.clusters[0].id)) ? picks.get(b.clusters[0].id) : undefined
  const headBase = uniform && !b.rule.candidates.includes(uniform) ? [...b.rule.candidates, uniform] : b.rule.candidates
  return `
    <div class="thead">
      <span class="usw" style="background:${preview}"></span>
      <span class="tname" title="${esc(b.full)}">${esc(b.label)}</span>
      ${b.suggested ? '<span class="tag sug">suggested</span>' : ''}
      ${b.rule.candidates.length === 0 ? '<span class="tag miss">no candidates — punch list</span>' : ''}
      <span class="count">${b.total}</span>
      <span class="chips">${headBase.map(p => headerChipHtml(b, p)).join('')}
        <button class="okchip more" data-more-bucket="${esc(b.key)}">Other…</button></span>
      <button class="apply" data-apply-bucket="${esc(b.key)}" ${pickedCount ? '' : 'disabled'}>Apply all ${b.total}</button>
      <div class="morepanel" data-panel-bucket="${esc(b.key)}" style="display:none"></div>
    </div>
    <div class="tbody">${b.clusters.map(c => clusterHtml(b, c)).join('')}</div>`
}

function render(r: ScanResults): void {
  const { ignored, other } = buildModel(r)
  const matched = buckets.reduce((s, b) => s + b.total, 0)
  summaryEl.innerHTML = `
    <span><b>${r.nodesScanned}</b> nodes</span>
    <span><b>${matched}</b> matched usages in <b>${buckets.length}</b> tokens</span>
    <span><b>${ignored}</b> ignored</span>
    <span><b>${other}</b> out of scope</span>`

  matchedEl.innerHTML = ''
  for (const b of buckets) {
    const row = document.createElement('div')
    row.className = 'trow'
    row.dataset.bucketKey = b.key
    row.innerHTML = bucketRow(b)
    matchedEl.appendChild(row)
  }
  if (!buckets.length) matchedEl.innerHTML = '<div class="empty">nothing matched</div>'
  restEl.textContent = `${ignored} usages ignored (doc scaffolding, Figma purple, debug) · ${other} out of scope`
  resultsEl.style.display = ''
  syncApplyAll()
}

const rerenderBucket = (b: TokenBucket): void => {
  const holder = matchedEl.querySelector(`[data-bucket-key="${CSS.escape(b.key)}"]`) as HTMLElement | null
  if (holder) holder.innerHTML = bucketRow(b)
}

function syncApplyAll(): void {
  applyAllBtn.disabled = picks.size === 0
  applyAllBtn.textContent = picks.size ? `Apply all picked (${picks.size})` : 'Apply all picked'
}

const clusterById = (id: string): Cluster | undefined => {
  for (const b of buckets) for (const c of b.clusters) if (c.id === id) return c
  return undefined
}

const bucketOf = (clusterId: string): TokenBucket | undefined =>
  buckets.find(b => b.clusters.some(c => c.id === clusterId))

resultsEl.addEventListener('click', (e) => {
  const el = e.target as HTMLElement
  const moreBucket = el.closest('[data-more-bucket]') as HTMLElement | null
  if (moreBucket) {
    const key = moreBucket.dataset.moreBucket!
    const panel = resultsEl.querySelector(`[data-panel-bucket="${CSS.escape(key)}"]`) as HTMLElement
    if (panel.style.display === 'none') { panel.innerHTML = morePanelHtml(`bucket:${key}`), panel.style.display = '' }
    else panel.style.display = 'none'
    return
  }
  const more = el.closest('[data-more]') as HTMLElement | null
  if (more) {
    const id = more.dataset.more!
    const panel = resultsEl.querySelector(`[data-panel="${CSS.escape(id)}"]`) as HTMLElement
    if (panel.style.display === 'none') { panel.innerHTML = morePanelHtml(id); panel.style.display = '' }
    else panel.style.display = 'none'
    return
  }
  const chip = el.closest('.okchip') as HTMLElement | null
  // header chip (or a header Other… panel chip carrying the bucket: pseudo-id):
  // cascade the pick onto every cluster of the token
  const bucketRef = chip?.dataset.bucket ?? (chip?.dataset.cluster?.startsWith('bucket:') ? chip.dataset.cluster.slice(7) : undefined)
  if (chip && chip.dataset.path && bucketRef) {
    const b = buckets.find(x => x.key === bucketRef)
    if (b) {
      for (const c of b.clusters) picks.set(c.id, chip.dataset.path)
      rerenderBucket(b)
      syncApplyAll()
    }
    return
  }
  if (chip && chip.dataset.path && chip.dataset.cluster) {
    const id = chip.dataset.cluster
    picks.set(id, chip.dataset.path)
    // re-render the whole bucket so header-chip uniformity state stays honest
    const b = bucketOf(id)
    if (b) rerenderBucket(b)
    syncApplyAll()
    return
  }
  const applyBucket = el.closest('[data-apply-bucket]') as HTMLButtonElement | null
  if (applyBucket && !applyBucket.disabled) {
    const b = buckets.find(x => x.key === applyBucket.dataset.applyBucket)
    if (b) {
      const batch: Array<{ path: string; usages: Usage[] }> = []
      for (const c of b.clusters) {
        const path = picks.get(c.id)
        if (path) batch.push({ path, usages: c.usages })
      }
      if (batch.length) {
        statusEl.textContent = `Applying ${batch.reduce((s, p) => s + p.usages.length, 0)} usages across ${b.label}…`
        parent.postMessage({ pluginMessage: { type: 'apply-picks', picks: batch } }, '*')
      }
    }
    return
  }
  const sel = el.closest('[data-select]') as HTMLElement | null
  if (sel) {
    const c = clusterById(sel.dataset.select!)
    if (c) parent.postMessage({ pluginMessage: { type: 'select-nodes', ids: c.usages.map(u => u.nodeId), pageIds: c.usages.map(u => u.pageId) } }, '*')
    return
  }
  const ap = el.closest('[data-apply]') as HTMLButtonElement | null
  if (ap && !ap.disabled) {
    const c = clusterById(ap.dataset.apply!)
    const path = c && picks.get(c.id)
    if (c && path) {
      statusEl.textContent = `Applying ${c.usages.length}…`
      parent.postMessage({ pluginMessage: { type: 'apply-picks', picks: [{ path, usages: c.usages }] } }, '*')
    }
  }
})

applyAllBtn.addEventListener('click', () => {
  const batch: Array<{ path: string; usages: Usage[] }> = []
  for (const [id, path] of picks) {
    const c = clusterById(id)
    if (c) batch.push({ path, usages: c.usages })
  }
  if (!batch.length) return
  statusEl.textContent = `Applying ${batch.reduce((s, p) => s + p.usages.length, 0)} usages in ${batch.length} groups…`
  parent.postMessage({ pluginMessage: { type: 'apply-picks', picks: batch } }, '*')
})

// ── report (unchanged shape + anc clusters) ─────────────────────────────────────
copyBtn.addEventListener('click', () => {
  if (!lastResults) return
  reportBuf.value = JSON.stringify({
    mapper: 'v1.2 inventory', scope: lastResults.scope, nodesScanned: lastResults.nodesScanned,
    tokens: buckets.map(b => ({
      label: b.label, total: b.total, suggested: b.suggested, candidates: b.rule.candidates,
      clusters: b.clusters.map(c => ({ kind: c.kind, anc: c.anc, count: c.usages.length })),
    })),
  }, null, 2)
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
    render(lastResults)
    statusEl.textContent = `Scanned ${msg.nodesScanned} nodes (${msg.scope}).`
      + (picks.size ? ` ${picks.size} groups pre-picked — "Apply all picked" handles them in one click.` : '')
  } else if (msg.type === 'apply-result') {
    statusEl.textContent = `Applied ${msg.applied}, skipped ${msg.skipped}${msg.missing?.length ? ` — ${msg.missing.length} targets missing (re-apply the okchroma theme once)` : ''}. Re-scanning…`
    parent.postMessage({ pluginMessage: { type: 'scan', scope } }, '*')
  } else if (msg.type === 'error') {
    scanBtn.disabled = false
    statusEl.textContent = String(msg.message)
    statusEl.classList.add('err')
  }
}
