import React, { useMemo, useState } from 'react'
import { generateScale } from '../../src/engine/colorEngine'
import { stopHex, brandCss, signalsCss } from '../../src/engine/cssRender'
import { resolveTheme, SIGNAL_SCALES } from '../../src/engine/resolve'
import { neutralTintHue } from '../../src/engine/colorEngine'
import { themeToFigma, groupEntries, type FigmaGroup, type FigmaColorToken } from '../../src/engine/figmaRender'
import { emitDtcgRamp } from '../../src/engine/requirements/dtcg'
import { stopTokenName, PAPER_0, PEN_100, SURFACE_PLANE_LAW, SCALE_STOP_COUNT } from '../../src/engine/tokenNames'
import { describeToken, canonicalize, FAMILY, CSS_FAMILY, type Family } from '../../src/engine/tokenDescriptions'
import { SIGNALS } from '../../src/engine/signals'
import { ROOT_L_LIGHT } from '../../src/engine/stopTable'
import { buildBaseColumns, BASE_SEED_HEX, type FlatTok } from '../../plugin-ext/payload'
import { Pre, SwatchCell, rgbaCss, Code } from './prose'

// ── the reference seed ───────────────────────────────────────────────────────
// Every live figure resolves the same seed: the extended plugin's base-collection
// default (payload.ts BASE_SEED_HEX). One seed, so values agree across pages.
export const REF_SEED = BASE_SEED_HEX

// ── Live example: real generated ramps, computed by the engine ───────────────
// The shipped bands: paper 1-3, highlighter 4-7, crayon 8, pencil 9, pen 10-11. Band labels and
// stop numbers render ONCE, on top; the hue rows stack under them. Column count
// derives from the scale (--cols) and the spans are asserted against it, so a
// band change breaks loudly here instead of drifting.
const RAMP_GROUPS: Array<{ label: string; span: number }> = [
  { label: 'paper', span: 3 }, { label: 'highlighter', span: 4 },
  { label: 'crayon', span: 1 }, { label: 'pencil', span: 1 }, { label: 'pen', span: 2 },
]
export const RAMP_SET_HEXES = [REF_SEED, '#C61D1B', '#E08A1E', '#E3B505', '#2E9E3F', '#0BA5C0', '#2C5FC9']
// the digit a stop actually ships under (paper-1 → 1), off the one name table.
export const stopDigit = (stop: number): string => {
  const digit = stopTokenName(stop).match(/-(\d+)$/)?.[1]
  if (!digit) throw new Error(`docs: no shipped digit for stop ${stop}`)
  return digit
}
export function RampSet() {
  const scales = RAMP_SET_HEXES.map(hex => ({ hex, scale: generateScale(hex, 'docs', undefined, {}) }))
  const cols = scales[0].scale.light.length
  if (RAMP_GROUPS.reduce((a, g) => a + g.span, 0) !== cols || cols !== SCALE_STOP_COUNT)
    throw new Error(`docs: RAMP_GROUPS spans != scale length (${cols})`)
  return (
    <figure className="d2-ramp" style={{ ['--cols' as string]: cols }}>
      <div className="d2-rampset-head">
        {RAMP_GROUPS.map(g => (
          <div key={g.label} className="d2-ramp-grp-top" style={{ gridColumn: `span ${g.span}` }}>
            <span>{g.label}</span>
            <div className="d2-ramp-brk-top" />
          </div>
        ))}
      </div>
      <div className="d2-rampset-row d2-ramp-nums">
        {scales[0].scale.light.map(s => <span key={s.stop}>{stopDigit(s.stop)}</span>)}
      </div>
      <div className="d2-rampset-rows">
        {scales.map(({ hex, scale }) => (
          <div key={hex} className="d2-rampset-row">
            {scale.light.map(s => (
              <div key={s.stop} className="d2-rampset-cell" title={`${hex} · ${stopTokenName(s.stop)} · ${stopHex(s)}`}
                style={{ background: stopHex(s) }} />
            ))}
          </div>
        ))}
      </div>
      <figcaption className="d2-ramp-cap">
        Live ramps from seven seeds, light mode. Read down any column: every stop lands at the same apparent lightness.
      </figcaption>
    </figure>
  )
}

// ── The token roster, from the extended plugin's own payload ─────────────────
// buildBaseColumns() is the exact row set the extended plugin writes for the default
// seed, light and dark, every path spelled as the plugin spells it. Descriptions come
// from tokenDescriptions.ts (the text Figma shows in the variable panel). Nothing here
// is hand-typed, so the table cannot drift from what ships.
type RosterRow = { path: string; light: FlatTok; dark: FlatTok | undefined }
let rosterCache: RosterRow[] | null = null
export function roster(): RosterRow[] {
  if (rosterCache) return rosterCache
  const cols = buildBaseColumns(REF_SEED)
  const dark = new Map(cols.dark.map(t => [t.path, t]))
  rosterCache = cols.light.map(t => ({ path: t.path, light: t, dark: dark.get(t.path) }))
  return rosterCache
}
const tokColor = (t: FlatTok | undefined) => (t ? rgbaCss(t.r, t.g, t.b, t.a) : '')
const tokLabel = (t: FlatTok | undefined) => (t ? (t.a !== undefined && t.a < 1 ? `${rgbaCss(t.r, t.g, t.b)} · ${Math.round(t.a * 100)}%` : rgbaCss(t.r, t.g, t.b)) : '')

// the description's parts: title, the role line, the conformance line (unlabeled), theming
export function describeParts(path: string): { role: string; conformance?: string; theming?: string } {
  const lines = describeToken(path).split('\n').slice(1)
  let role = '', conformance: string | undefined, theming: string | undefined
  for (const l of lines) {
    if (l.startsWith('Req for: ')) role = l.slice('Req for: '.length)
    else if (l.startsWith('Theming: ')) theming = l.slice('Theming: '.length)
    else if (l.startsWith('AA ')) conformance = l
  }
  return { role, conformance, theming }
}

// The CSS custom property a row ships as, if any. Family rows follow the CSS grammar
// (cssRender.brandKindBody); the system rows are spelled where they are emitted.
const CSS_WORD: Record<string, string> = {
  [FAMILY.neutral]: CSS_FAMILY.neutral, [FAMILY.brandPrimary]: CSS_FAMILY.brandPrimary, [FAMILY.brandSecondary]: CSS_FAMILY.brandSecondary,
  [FAMILY.critical]: FAMILY.critical, [FAMILY.warning]: FAMILY.warning, [FAMILY.positive]: FAMILY.positive, [FAMILY.info]: FAMILY.info,
}
export type CssHome = { name: string; from: 'engine' | 'semantic' } | { name: null; note: string }
export function cssHomeOf(path: string): CssHome {
  const canonical = canonicalize(path)
  const fam = Object.keys(CSS_WORD).find(f => canonical.startsWith(f + '/'))
  if (fam) {
    const leaf = canonical.slice(fam.length + 1)
    if (leaf === PAPER_0 || leaf === PEN_100) return { name: `--${leaf}`, from: 'engine' }
    return { name: `--${CSS_WORD[fam]}-${leaf.replace('/', '-')}`, from: 'engine' }
  }
  const link: Record<string, string> = {
    'system/link/default/enabled': '--link', 'system/link/default/hover': '--link-hover', 'system/link/default/pressed': '--link-pressed',
    'system/link/inverse/enabled': '--link-inverse', 'system/link/inverse/hover': '--link-inverse-hover', 'system/link/inverse/pressed': '--link-inverse-pressed',
  }
  if (link[canonical]) return { name: link[canonical], from: 'engine' }
  if (canonical === 'system/abs-primary') return { name: `--${CSS_FAMILY.brandPrimary}-identity`, from: 'engine' }
  if (canonical === 'system/abs-alt') return { name: `--${CSS_FAMILY.brandSecondary}-identity`, from: 'engine' }
  if (canonical === 'system/alpha/transparent') return { name: '--alpha-transparent', from: 'engine' }
  const m = canonical.match(/^system\/alpha\/away-from-bg\/(\d\d)$/)
  if (m) return { name: `--alpha-away-from-bg-${m[1]}`, from: 'engine' }
  const sh = canonical.match(/^system\/alpha\/shadow-(\d\d)$/)
  if (sh) return { name: `--shadow-${sh[1]}`, from: 'semantic' }
  const sf = canonical.match(/^system\/surface\/(\w+)$/)
  if (sf) return { name: `--surface-${sf[1]}`, from: 'semantic' }
  if (canonical === 'system/alpha/ink') return { name: null, note: 'inlined into the quiet stamp/on values' }
  return { name: null, note: 'Figma only' }
}

const FAMILY_ORDER: Family[] = [FAMILY.brandPrimary, FAMILY.brandSecondary, FAMILY.neutral, FAMILY.critical, FAMILY.warning, FAMILY.positive, FAMILY.info]
const FAMILY_LABEL: Record<string, string> = {
  [FAMILY.brandPrimary]: 'brand (the primary)', [FAMILY.brandSecondary]: 'brand-alt (the secondary)', [FAMILY.neutral]: 'neutral',
  [FAMILY.critical]: 'critical (red)', [FAMILY.warning]: 'warning (yellow)', [FAMILY.positive]: 'positive (green)', [FAMILY.info]: 'info (blue)',
}

function RosterTable({ rows, cssColumn }: { rows: RosterRow[]; cssColumn: boolean }) {
  return (
    <div className="d2-token-table-wrap">
      <table className="d2-table d2-token-table">
        <thead><tr><th>Figma path (extended plugin)</th>{cssColumn && <th>CSS custom property</th>}<th>Role</th><th>Conformance</th><th>Light</th><th>Dark</th></tr></thead>
        <tbody>
          {rows.map(r => {
            const d = describeParts(r.path)
            const home = cssHomeOf(r.path)
            return (
              <tr key={r.path}>
                <td><code className="d2-code">{r.path}</code></td>
                {cssColumn && <td>{'note' in home ? <span className="d2-muted">{home.note}</span> : <><code className="d2-code">{home.name}</code>{home.from === 'semantic' && <span className="d2-muted"> (tokens/semantic.css)</span>}</>}</td>}
                <td>{d.role}</td>
                <td>{d.conformance ?? ''}</td>
                <td><SwatchCell color={tokColor(r.light)} label={tokLabel(r.light)} /></td>
                <td><SwatchCell color={tokColor(r.dark)} label={tokLabel(r.dark)} /></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// One family's rows, with a picker. The identity row is re-homed by the plugin to
// base/absolute/brand, so it shows under the system rows instead.
export function FamilyRoster({ cssColumn = true }: { cssColumn?: boolean }) {
  const [fam, setFam] = useState<string>(FAMILY.brandPrimary)
  const rows = useMemo(() => roster().filter(r => r.path.startsWith(`base/${fam}/`)), [fam])
  return (
    <figure className="d2-fig">
      <label className="d2-select-line">Family{' '}
        <select className="d2-select" value={fam} onChange={e => setFam(e.target.value)}>
          {FAMILY_ORDER.map(f => <option key={f} value={f}>{FAMILY_LABEL[f]}</option>)}
        </select>
      </label>
      <RosterTable rows={rows} cssColumn={cssColumn} />
      <figcaption className="d2-ramp-cap">
        The rows the extended plugin writes for the <code className="d2-code">{fam}</code> family, seed {REF_SEED}, both modes, exactly as
        the plugin spells and describes them. Every family ships the same set; the neutral adds the two poles.
      </figcaption>
    </figure>
  )
}

// The system rows: link, alpha, absolutes, the utility shelf, plus the four surface
// planes (created by the plugin itself and aliased onto the neutral's papers per
// SURFACE_PLANE_LAW, so they are spliced in here from that law).
export function SystemRoster() {
  const rows = useMemo(() => {
    const all = roster()
    const sys = all.filter(r => !/^base\/(neutral|brand|brand-alt|critical|warning|positive|info)\//.test(r.path))
    const neutral = (leaf: string) => all.find(r => r.path === `base/neutral/${leaf}`)
    const planes: RosterRow[] = Object.entries(SURFACE_PLANE_LAW).map(([path, law]) => {
      const l = neutral(law.light), d = neutral(law.dark)
      return { path: path.replace(/^system\//, 'utility/'), light: l!.light, dark: d?.dark }
    })
    return [...planes, ...sys]
  }, [])
  return (
    <figure className="d2-fig">
      <RosterTable rows={rows} cssColumn />
      <figcaption className="d2-ramp-cap">
        The system rows for seed {REF_SEED}. The surface planes alias the neutral's own papers in reversed order per mode;
        the alpha and utility rows are brand-independent constants.
      </figcaption>
    </figure>
  )
}

// ── Naming anatomy: base/neutral/pencil-47, segment by segment ───────────────
// Every segment is read off the name tables, never typed: a rename or renumber
// redraws the figure.
export function NamingAnatomy() {
  const PENCIL = 9
  const [instrument, digit] = stopTokenName(PENCIL).split('-')
  const cols = [
    { seg: 'base', title: 'ZONE', lines: ['extended plugin only:', 'base/ engine-owned,', 'utility/ team-touchable'] },
    { seg: FAMILY.neutral, title: 'FAMILY', lines: ['neutral, brand, brand-alt,', 'critical, warning,', 'positive, info'] },
    { seg: instrument, title: 'INSTRUMENT', lines: ['paper, highlighter,', 'crayon, pencil, pen:', 'the law the stop serves'] },
    { seg: digit, title: 'NUMBER', lines: ['100 − round(light rootL × 100)', `= 100 − round(${ROOT_L_LIGHT[PENCIL]} × 100)`, 'bigger = stronger'] },
  ]
  const colW = 160, gap = 8, boxY = 34, boxH = 44
  const x = (i: number) => i * (colW + gap)
  const width = cols.length * colW + (cols.length - 1) * gap
  return (
    <figure className="d2-ramp">
      <svg viewBox={`0 0 ${width} 190`} className="d2-anatomy" role="img" aria-label={`Token path anatomy: base/neutral/${stopTokenName(PENCIL)}`}>
        {cols.map((c, i) => (
          <g key={c.seg}>
            <rect x={x(i)} y={boxY} width={colW} height={boxH} rx={8} className="d2-anatomy-box" />
            <text x={x(i) + colW / 2} y={boxY + boxH / 2 + 5} textAnchor="middle" className="d2-anatomy-seg">{c.seg}</text>
            {i < cols.length - 1 && (
              <text x={x(i) + colW + gap / 2} y={boxY + boxH / 2 + 5} textAnchor="middle" className="d2-anatomy-sep">
                {i <= 1 ? '/' : '-'}
              </text>
            )}
            <line x1={x(i) + colW / 2} y1={boxY + boxH} x2={x(i) + colW / 2} y2={boxY + boxH + 18} className="d2-anatomy-leader" />
            <text x={x(i) + colW / 2} y={boxY + boxH + 34} textAnchor="middle" className="d2-anatomy-title">{c.title}</text>
            {c.lines.map((line, li) => (
              <text key={li} x={x(i) + colW / 2} y={boxY + boxH + 50 + li * 14} textAnchor="middle" className="d2-anatomy-cap">{line}</text>
            ))}
          </g>
        ))}
      </svg>
      <figcaption className="d2-ramp-cap">
        The extended plugin's full path for one stop. The zone and the family are groups (slashes); the instrument and
        its number are one flat leaf (a hyphen). The engine and CSS name drops the first two segments:{' '}
        <Code>{stopTokenName(PENCIL)}</Code>, the custom property <Code>--{CSS_FAMILY.neutral}-{stopTokenName(PENCIL)}</Code>.
      </figcaption>
    </figure>
  )
}

// ── Live example: a real requirement token, emitted by the engine right now ──
export function LiveToken({ hex, tokenKey, mode, caption }: { hex: string; tokenKey: string; mode: 'light' | 'dark'; caption: React.ReactNode }) {
  const group = emitDtcgRamp(hex, mode, `brand.${mode}`)
  return (
    <figure className="d2-ramp">
      <Pre>{JSON.stringify(group[tokenKey], null, 2)}</Pre>
      <figcaption className="d2-ramp-cap">{caption}</figcaption>
    </figure>
  )
}

// ── The resolved reference theme, shared by the output samples ───────────────
let themeCache: ReturnType<typeof resolveTheme> | null = null
export function refTheme() {
  return (themeCache ??= resolveTheme({ primaryHex: REF_SEED, name: 'acme', deriveSecondary: true }))
}
export const refSignals = () => {
  const t = refTheme()
  return SIGNALS.map(s => ({ name: s.name, scale: t.themed.signalOverrides.find(o => o.name === s.name)?.scale ?? SIGNAL_SCALES.get(s.name)!.scale }))
}

// ── A live CSS block: what brandCss + signalsCss emit for the reference theme ─
// The excerpt shows the light block's brand family; the full text sits behind a toggle.
export function CssSample() {
  const { css, excerpt, total } = useMemo(() => {
    const t = refTheme()
    const neutralH = neutralTintHue(t.themed.scale.brandH)
    const brand = brandCss('acme', 'Acme', t.themed, t.secondary?.scale ?? null, '', 'default', undefined, t.secondary?.style, false, null, true, neutralH)
    const css = brand + '\n' + signalsCss()
    const lines = brand.split('\n').filter(Boolean)
    const brandPrefix = `  --${CSS_FAMILY.brandPrimary}-`
    const head = lines.slice(0, 3)                                            // selector + the two anchors
    const fam = lines.filter(l => l.startsWith(brandPrefix))
    const firstBrand = lines.indexOf(fam[0])
    const lastBrand = lines.indexOf(fam[fam.length - 1])
    const excerpt = [...head, ...lines.slice(firstBrand, lastBrand + 1), `  /* … ${lines.length - (lastBrand + 1)} more lines: brand-alt, the neutral, link, signal overrides, the dark block, the P3 block */`, '}'].join('\n')
    return { css, excerpt, total: css.split('\n').length }
  }, [])
  return (
    <figure className="d2-ramp">
      <Pre>{excerpt}</Pre>
      <details className="d2-details">
        <summary>The full output, {total} lines (brandCss + signalsCss)</summary>
        <Pre>{css}</Pre>
      </details>
      <figcaption className="d2-ramp-cap">
        Live: <Code>brandCss('acme', 'Acme', theme.themed, theme.secondary.scale)</Code> for seed {REF_SEED} with a derived secondary,
        followed by <Code>signalsCss()</Code>.
      </figcaption>
    </figure>
  )
}

// ── The Figma tree: what themeToFigma emits for the reference theme ──────────
function walk(g: FigmaGroup, prefix: string, out: Array<[string, FigmaColorToken]>) {
  for (const [k, v] of groupEntries(g)) {
    const path = prefix ? `${prefix}/${k}` : k
    if ('$type' in v) out.push([path, v as FigmaColorToken])
    else walk(v as FigmaGroup, path, out)
  }
}
export function FigmaTree() {
  const { groups, leaves } = useMemo(() => {
    const t = refTheme()
    const { light } = themeToFigma(t.themed, { secondary: t.secondary?.scale ?? null, secondaryStyle: t.secondary?.style, neutralH: neutralTintHue(t.themed.scale.brandH), signals: refSignals() })
    const leaves: Array<[string, FigmaColorToken]> = []
    walk(light, '', leaves)
    const groups = Object.keys(light).map(k => {
      const n = leaves.filter(([p]) => p.startsWith(k + '/')).length
      return { name: k, count: n }
    })
    return { groups, leaves }
  }, [])
  return (
    <figure className="d2-ramp">
      <Pre>{groups.map(g => `${g.name}/  (${g.count} leaves)`).join('\n')}</Pre>
      <details className="d2-details">
        <summary>Every leaf of the light tree, {leaves.length} rows</summary>
        <div className="d2-leaf-list">
          {leaves.map(([p, tok]) => (
            <div key={p} className="d2-leaf-row">
              <SwatchCell color={rgbaCss(...tok.$value.components, tok.$value.alpha)} label={tok.$value.alpha < 1 ? `${tok.$value.hex} · ${Math.round(tok.$value.alpha * 100)}%` : tok.$value.hex} />
              <code className="d2-code">{p}</code>
            </div>
          ))}
        </div>
      </details>
      <figcaption className="d2-ramp-cap">
        Live: <Code>themeToFigma(theme.themed, {'{'} secondary, neutralH, signals {'}'}).light</Code> for seed {REF_SEED}.
        The dark tree has the same shape with the dark values. Signal groups are keyed by identity here (red, yellow, green, blue);
        the plugins write them under their role names.
      </figcaption>
    </figure>
  )
}
