import React, { useEffect, useMemo, useState } from 'react'
import { parseDocsHash, docsHref } from './prose'
import * as overview from './pages/overview'
import * as install from './pages/install'
import * as output from './pages/output'
import * as guarantees from './pages/guarantees'
import * as generation from './pages/generation'
import * as signals from './pages/signals'
import * as reference from './pages/reference'
// pages/motivation.tsx holds the origin essay (owner prose, unpublished 2026-08-14);
// it is deliberately absent from ARTICLES. Re-add it here to publish it.

// ─────────────────────────────────────────────────────────────────────────────
// In-app documentation: a sidebar docs site. Each page is a module under pages/
// exporting { slug, title, Body }; prose primitives live in prose.tsx and the live
// engine figures in figures.tsx, so a code example renders a real generated value
// instead of a screenshot.
//
// EDITORIAL RULES (owner, 2026-08-06): utilitarian language, no em dashes in
// prose, mechanism over outcome, no internal pet names as explanations, and
// every factual claim verified against the CODE (architecture.md is not a
// source). Numbers the engine owns are rendered through <K>, never typed.
// `npm run docs:lint` enforces the vocabulary rules.
// ─────────────────────────────────────────────────────────────────────────────

type Article = { slug: string; title: string; Body: () => React.ReactNode }
const ARTICLES: Article[] = [overview, install, output, guarantees, generation, signals, reference]

export default function DocsSite({ dark: _dark }: { dark: boolean }) {
  // the hash is the one source of truth for which page and section are showing
  const [hash, setHash] = useState(() => window.location.hash)
  useEffect(() => {
    const onHash = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  const { slug, section } = useMemo(() => parseDocsHash(hash), [hash])
  const active = ARTICLES.find(a => a.slug === slug) ?? ARTICLES[0]
  // after the page renders: jump to the named section, else to the top
  useEffect(() => {
    const el = section ? document.getElementById(section) : null
    if (el) el.scrollIntoView()
    else window.scrollTo(0, 0)
  }, [active.slug, section])
  const Body = active.Body
  return (
    <div className="d2">
      <style>{DOCS2_CSS}</style>
      <aside className="d2-side">
        <nav>
          <div className="d2-side-group">
            {ARTICLES.map(a => (
              <a key={a.slug} className={`d2-side-link${a.slug === active.slug ? ' active' : ''}`} href={docsHref(a.slug)}>
                {a.title}
              </a>
            ))}
          </div>
        </nav>
      </aside>
      <main className="d2-main">
        <article className="d2-article">
          <h1 className="d2-h1">{active.title}</h1>
          <Body />
        </article>
      </main>
    </div>
  )
}

const DOCS2_CSS = `
.d2 { display: grid; grid-template-columns: 248px minmax(0, 1fr); min-height: calc(100vh - 165px); color: var(--fg-default); }
.d2-side {
  border-right: 1px solid var(--border-subtle); background: var(--surface-dim);
  padding: 28px 16px; position: sticky; top: 0; align-self: start; height: 100%;
}
.d2-side-group { margin-bottom: 20px; }
.d2-side-link {
  display: block; width: 100%; text-align: left; border: none; background: none; cursor: pointer;
  font-family: inherit; font-size: 13.5px; color: var(--fg-subtle); padding: 6px 10px; border-radius: 7px;
  text-decoration: none; box-sizing: border-box;
}
.d2-side-link:hover { background: var(--surface-mid); color: var(--fg-default); }
.d2-side-link.active { background: var(--brand-bg-subtle); color: var(--fg-default); font-weight: 600; }
.d2-anchor { margin-left: 8px; font-weight: 400; color: var(--fg-subtle); text-decoration: none; opacity: 0; }
.d2-h2:hover .d2-anchor, .d2-anchor:focus { opacity: 1; }
.d2-main { padding: 40px 0; min-width: 0; }
.d2-article { max-width: 760px; margin: 0 auto; padding: 0 32px; }
.d2-h1 { font-size: 32px; font-weight: 700; margin: 0 0 8px; letter-spacing: -0.01em; }
.d2-lead { font-size: 17px; line-height: 1.6; color: var(--fg-subtle); margin: 0 0 28px; }
.d2-h2 { font-size: 21px; font-weight: 700; margin: 36px 0 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border-subtle); }
.d2-h3 { font-size: 16px; font-weight: 700; margin: 26px 0 8px; }
.d2-p { font-size: 15px; line-height: 1.7; margin: 0 0 14px; }
.d2-ol { font-size: 15px; line-height: 1.7; margin: 14px 0; padding-left: 24px; }
.d2-ol > li { margin-bottom: 14px; }
.d2-ol ul { margin: 8px 0 0; padding-left: 20px; }
.d2-ol ul li { margin-bottom: 6px; }
.d2-ul { font-size: 15px; line-height: 1.7; margin: 0 0 14px; padding-left: 22px; }
.d2-ul li { margin-bottom: 8px; }
.d2-code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.88em; background: var(--surface-dim); border: 1px solid var(--border-subtle); border-radius: 5px; padding: 1px 5px; }
.d2-k { font-variant-numeric: tabular-nums; border-bottom: 1px dotted var(--border-default); }
.d2-muted { color: var(--fg-subtle); font-size: 0.92em; }
.d2-pre {
  background: var(--surface-dim); border: 1px solid var(--border-subtle); border-radius: 10px;
  padding: 16px 18px; overflow-x: auto; margin: 0 0 18px;
}
.d2-pre code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; line-height: 1.6; color: var(--fg-default); white-space: pre; }
.d2-note { font-size: 13.5px; line-height: 1.6; color: var(--fg-subtle); background: var(--surface-dim); border: 1px solid var(--border-subtle); border-left: 3px solid var(--brand-pencil-47); border-radius: 8px; padding: 12px 14px; margin: 18px 0; }
.d2-details { margin: -8px 0 18px; font-size: 13.5px; }
.d2-details summary { cursor: pointer; color: var(--fg-subtle); padding: 4px 0; }
.d2-details[open] summary { margin-bottom: 8px; }
.d2-leaf-list { display: flex; flex-direction: column; gap: 4px; max-height: 420px; overflow: auto; padding: 8px 10px; background: var(--surface-dim); border: 1px solid var(--border-subtle); border-radius: 10px; }
.d2-leaf-row { display: flex; gap: 10px; align-items: center; font-size: 12.5px; }
.d2-select-line { display: inline-flex; align-items: center; gap: 8px; font-size: 13.5px; color: var(--fg-subtle); margin-bottom: 8px; }
.d2-select { font-family: inherit; font-size: 13px; padding: 4px 8px; border-radius: 7px; border: 1px solid var(--border-default); background: var(--surface-mid); color: var(--fg-default); }
.d2-ramp { margin: 22px 0 26px; }
.d2-ramp-nums { font-size: 10px; color: var(--fg-subtle); margin: 4px 0; }
.d2-ramp-nums span { text-align: center; }
.d2-rampset-head { display: grid; grid-template-columns: repeat(var(--cols, 11), 1fr); gap: 4px; }
.d2-ramp-grp-top { display: flex; flex-direction: column; align-items: center; min-width: 0; }
.d2-ramp-grp-top span { margin-bottom: 4px; font-size: 11px; font-weight: 600; color: var(--fg-subtle); }
.d2-ramp-brk-top { width: 100%; height: 6px; border: 1px solid var(--border-default); border-bottom: none; border-radius: 5px 5px 0 0; }
.d2-rampset-rows { display: flex; flex-direction: column; gap: 4px; }
.d2-rampset-row { display: grid; grid-template-columns: repeat(var(--cols, 11), 1fr); gap: 4px; }
.d2-rampset-cell { height: 28px; border-radius: 5px; border: 1px solid var(--border-subtle); }
.d2-ramp-cap { font-size: 12.5px; color: var(--fg-subtle); margin: 10px 0 0; }
.d2-table { width: 100%; border-collapse: collapse; font-size: 14px; margin: 12px 0 12px; }
.d2-table th { text-align: left; font-weight: 600; color: var(--fg-subtle); border-bottom: 1px solid var(--border-subtle); padding: 8px 10px; }
.d2-table td { border-bottom: 1px solid var(--border-subtle); padding: 8px 10px; vertical-align: top; }
.d2-token-table-wrap { overflow-x: auto; margin: 12px 0 18px; }
.d2-token-table { font-size: 13px; min-width: 760px; }
.d2-table-subhead td { background: var(--surface-dim); font-weight: 600; color: var(--fg-default); padding: 8px 10px; font-size: 13px; }
.d2-table-subhead code { margin-right: 6px; }
.d2-swatch-cell { display: inline-flex; align-items: center; gap: 7px; white-space: nowrap; }
.d2-swatch { width: 15px; height: 15px; border-radius: 4px; border: 1px solid var(--border-subtle); flex-shrink: 0; display: inline-block; background-image: linear-gradient(45deg, var(--border-subtle) 25%, transparent 25%, transparent 75%, var(--border-subtle) 75%), linear-gradient(45deg, var(--border-subtle) 25%, transparent 25%, transparent 75%, var(--border-subtle) 75%); background-size: 6px 6px; background-position: 0 0, 3px 3px; }
.d2-anatomy { width: 100%; height: auto; max-width: 760px; display: block; margin: 8px 0 4px; }
.d2-anatomy-box { fill: var(--surface-mid); stroke: var(--border-default); stroke-width: 1; }
.d2-anatomy-seg { font: 600 15px ui-monospace, SFMono-Regular, Menlo, monospace; fill: var(--fg-default); }
.d2-anatomy-sep { font: 400 14px ui-monospace, SFMono-Regular, Menlo, monospace; fill: var(--fg-subtle); }
.d2-anatomy-leader { stroke: var(--border-subtle); stroke-width: 1; }
.d2-anatomy-title { font: 700 9.5px ui-sans-serif, system-ui, sans-serif; letter-spacing: 0.05em; fill: var(--fg-subtle); }
.d2-anatomy-cap { font: 400 10.5px ui-sans-serif, system-ui, sans-serif; fill: var(--fg-subtle); }
.d2-a { color: inherit; text-decoration: underline; text-underline-offset: 2px; }
.d2-a:hover { color: var(--fg-default); }
.d2-fig { margin: 20px 0 28px; }
.d2-chips { display: flex; gap: 14px; flex-wrap: wrap; align-items: flex-start; }
.d2-chip-col { display: flex; flex-direction: column; gap: 6px; align-items: center; }
.d2-chip { min-width: 108px; padding: 18px 20px; border-radius: 10px; border: 1px solid var(--border-subtle); font-weight: 600; font-size: 14px; color: #202020; text-align: center; }
.d2-chipgrid { background: #fdfcfc; border: 1px solid var(--border-subtle); border-radius: 10px; padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; }
.d2-chipgrid-row { display: flex; align-items: center; gap: 6px; }
.d2-chipgrid-label { margin-right: auto; padding-right: 8px; font-size: 11px; font-weight: 600; color: #4a4749; }
.d2-chipx { display: inline-flex; align-items: center; border: 1px solid; border-radius: 8px; padding: 5px 14px; font-size: 12px; font-weight: 600; white-space: nowrap; }
@media (max-width: 860px) {
  .d2 { grid-template-columns: 1fr; }
  .d2-side { position: static; height: auto; border-right: none; border-bottom: 1px solid var(--border-subtle); display: flex; gap: 16px; overflow-x: auto; padding: 16px; }
  .d2-side-group { margin-bottom: 0; }
  .d2-main { padding: 24px 0; }
}
`
