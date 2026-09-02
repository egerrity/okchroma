import React from 'react'

// ── URL routing helpers ─────────────────────────────────────────────────────
// #/docs/<slug>[/<section>]. The sidebar writes the slug, an H2's anchor link writes
// the section, and a pasted link reads both back, so any page or section can be shared.
export const DOCS_HASH = '#/docs'
export function parseDocsHash(hash: string): { slug: string; section?: string } {
  const parts = hash.startsWith(DOCS_HASH) ? hash.slice(DOCS_HASH.length).split('/').filter(Boolean) : []
  return { slug: parts[0] ?? '', section: parts[1] }
}
export const docsHref = (slug: string, section?: string) => `${DOCS_HASH}/${slug}${section ? `/${section}` : ''}`
// a section id from its heading text: lowercase, words joined by hyphens
export const sectionId = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// ── Prose primitives ─────────────────────────────────────────────────────────
// H2 carries an id (derived from its text, or given) and an anchor link to itself,
// so every section of every page has a URL.
export const H2 = ({ id, children }: { id?: string; children: React.ReactNode }) => {
  const sid = id ?? (typeof children === 'string' ? sectionId(children) : undefined)
  return (
    <h2 className="d2-h2" id={sid}>
      {children}
      {sid && <a className="d2-anchor" href={docsHref(parseDocsHash(window.location.hash).slug, sid)} aria-label={`Link to section: ${typeof children === 'string' ? children : sid}`}>#</a>}
    </h2>
  )
}
export const H3 = ({ children }: { children: React.ReactNode }) => <h3 className="d2-h3">{children}</h3>
export const P = ({ children }: { children: React.ReactNode }) => <p className="d2-p">{children}</p>
export const OL = ({ children }: { children: React.ReactNode }) => <ol className="d2-ol">{children}</ol>
export const UL = ({ children }: { children: React.ReactNode }) => <ul className="d2-ul">{children}</ul>
export const LI = ({ children }: { children: React.ReactNode }) => <li>{children}</li>
export const Code = ({ children }: { children: React.ReactNode }) => <code className="d2-code">{children}</code>
export const Pre = ({ children }: { children: React.ReactNode }) => <pre className="d2-pre"><code>{children}</code></pre>
export const Lead = ({ children }: { children: React.ReactNode }) => <p className="d2-lead">{children}</p>
export const Note = ({ children }: { children: React.ReactNode }) => <div className="d2-note">{children}</div>
export const Table = ({ head, rows, wide }: { head: React.ReactNode[]; rows: React.ReactNode[][]; wide?: boolean }) => {
  const table = (
    <table className={`d2-table${wide ? ' d2-token-table' : ''}`}>
      <thead><tr>{head.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
    </table>
  )
  return wide ? <div className="d2-token-table-wrap">{table}</div> : table
}
// external link (new tab) and internal docs link (same tab, hash routed)
export const A = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a className="d2-a" href={href} target="_blank" rel="noreferrer">{children}</a>
)
export const DocLink = ({ page, section, children }: { page: string; section?: string; children: React.ReactNode }) => (
  <a className="d2-a" href={docsHref(page, section)}>{children}</a>
)

// ── K: a live engine value in prose ──────────────────────────────────────────
// Numbers the engine owns are never typed into the docs; they are imported and rendered
// here, so a constant that moves in the code moves on the page. `d` = decimals (trailing
// zeros trimmed), `pct` renders 0.75 as 75%, `deg` appends the degree sign.
const trim = (s: string) => (s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s)
export function fmtK(v: number, d = 3, pct = false, deg = false): string {
  const n = pct ? v * 100 : v
  const s = Number.isInteger(n) ? String(n) : trim(n.toFixed(d))
  return pct ? `${s}%` : deg ? `${s}°` : s
}
export const K = ({ v, d = 3, pct, deg }: { v: number; d?: number; pct?: boolean; deg?: boolean }) => (
  <span className="d2-k" title="a live engine value">{fmtK(v, d, pct, deg)}</span>
)

// ── swatches ─────────────────────────────────────────────────────────────────
export function SwatchCell({ color, label }: { color: string; label: string }) {
  return (
    <span className="d2-swatch-cell">
      <span className="d2-swatch" style={{ background: color }} />
      <code className="d2-code">{label}</code>
    </span>
  )
}
// 0..1 channels (+ alpha) to the CSS color a browser paints, and a short label
export const rgbaCss = (r: number, g: number, b: number, a?: number): string => {
  const c = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255)
  return a === undefined || a >= 1 ? `#${[r, g, b].map(v => c(v).toString(16).padStart(2, '0')).join('')}` : `rgba(${c(r)}, ${c(g)}, ${c(b)}, ${a})`
}
