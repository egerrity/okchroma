import React, { useState } from 'react'
import { generateScale, generateNeutralScale } from '../../src/engine/colorEngine'
import { stopHex, ctaNeedsBorder, pageStopFor, ctaBorderRung, OFFSET_ALPHAS } from '../../src/engine/cssRender'
import { defaultSecondarySeed, SOFT_ON_CTA_ALPHA, resolveLinkInverseTrio } from '../../src/engine/resolve'
import { emitDtcgRamp } from '../../src/engine/requirements/dtcg'
// Real Unify export data, borrowed for the Motivation page's evidence figures.
// Labels on anything rendered from it use FAMILY hue words only, never theme
// names (owner 2026-08-08: the export's theme names carry brand identities).
import { UNIFY_SIGNALS, UNIFY_THEMES, UNIFY_GRAY } from '../unify-compare/unifyData'

// ─────────────────────────────────────────────────────────────────────────────
// In-app documentation: a sidebar docs site. Each article is a React component,
// so prose and LIVE engine output sit side by side: a code example can render
// a real generated ramp instead of a screenshot.
//
// TO ADD AN ARTICLE: write a `() => <>…</>` body using the prose primitives
// below (H2/H3/P/OL/UL/Code/Pre/Note/Ramp), then add `{ slug, title, body }`
// to SECTIONS. The sidebar and routing pick it up automatically.
//
// EDITORIAL RULES (owner, 2026-08-06): utilitarian language, no em dashes in
// prose, mechanism over outcome, no internal pet names as explanations, and
// every factual claim verified against the CODE (architecture.md is not a
// source; it has carried stale claims). Structure: four flat pages (the
// Motivation essay is written but UNPUBLISHED, owner 2026-08-14 — see ARTICLES);
// the generation flow is ONE numbered article in execution order (owner's edit).
// ─────────────────────────────────────────────────────────────────────────────

// ── Prose primitives ─────────────────────────────────────────────────────────
const H2 = ({ children }: { children: React.ReactNode }) => <h2 className="d2-h2">{children}</h2>
const H3 = ({ children }: { children: React.ReactNode }) => <h3 className="d2-h3">{children}</h3>
const P = ({ children }: { children: React.ReactNode }) => <p className="d2-p">{children}</p>
const OL = ({ children }: { children: React.ReactNode }) => <ol className="d2-ol">{children}</ol>
const UL = ({ children }: { children: React.ReactNode }) => <ul className="d2-ul">{children}</ul>
const LI = ({ children }: { children: React.ReactNode }) => <li>{children}</li>
const Code = ({ children }: { children: React.ReactNode }) => <code className="d2-code">{children}</code>
const Pre = ({ children }: { children: React.ReactNode }) => <pre className="d2-pre"><code>{children}</code></pre>
const Lead = ({ children }: { children: React.ReactNode }) => <p className="d2-lead">{children}</p>
const Note = ({ children }: { children: React.ReactNode }) => <div className="d2-note">{children}</div>
const Table = ({ head, rows }: { head: React.ReactNode[]; rows: React.ReactNode[][] }) => (
  <table className="d2-table">
    <thead><tr>{head.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
    <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
  </table>
)

// ── Live example: real generated ramps, computed by the engine ───────────────
// The shipped bands: paper 1-3, wash 4-7, mark 8, ink 9-11. Band labels and
// stop numbers render ONCE, on top; the hue rows stack under them. Column count
// derives from the scale (--cols) and the spans are asserted against it, so a
// band change breaks loudly here instead of drifting.
const RAMP_GROUPS: Array<{ label: string; span: number }> = [
  { label: 'paper', span: 3 }, { label: 'wash', span: 4 },
  { label: 'mark', span: 1 }, { label: 'ink', span: 3 },
]
const RAMP_SET_HEXES = ['#E93D82', '#C61D1B', '#E08A1E', '#E3B505', '#2E9E3F', '#0BA5C0', '#2C5FC9']
function RampSet() {
  const scales = RAMP_SET_HEXES.map(hex => ({ hex, scale: generateScale(hex, 'docs', undefined, {}) }))
  const cols = scales[0].scale.light.length
  if (RAMP_GROUPS.reduce((a, g) => a + g.span, 0) !== cols)
    throw new Error(`DocsSite: RAMP_GROUPS spans != scale length (${cols})`)
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
        {scales[0].scale.light.map(s => <span key={s.stop}>{s.stop}</span>)}
      </div>
      <div className="d2-rampset-rows">
        {scales.map(({ hex, scale }) => (
          <div key={hex} className="d2-rampset-row">
            {scale.light.map(s => (
              <div key={s.stop} className="d2-rampset-cell" title={`${hex} · stop ${s.stop} · ${stopHex(s)}`}
                style={{ background: stopHex(s) }} />
            ))}
          </div>
        ))}
      </div>
      <figcaption className="d2-ramp-cap">
        Live ramps from seven seeds. Read down any column: every stop lands at the same lightness.
      </figcaption>
    </figure>
  )
}

// ── The complete token roster, computed LIVE from one reference seed ─────────
// TOKEN_REF_HEX is RAMP_SET_HEXES[0], the same seed the engine ships as the extended
// plugin's base-collection default (payload.ts BASE_SEED_HEX). Every swatch below is a
// real value from generateScale/generateNeutralScale, not a hand-copied hex, so the table
// can't drift from the code the way a written-out table would.
const TOKEN_REF_HEX = RAMP_SET_HEXES[0]

function stopAt<T extends { stop: number }>(stops: T[], n: number): T {
  const s = stops.find(x => x.stop === n)
  if (!s) throw new Error(`DocsSite: token table missing stop ${n}`)
  return s
}

// hex + alpha → the rgba() a browser actually paints, and a short "#hex · n%" label.
// Alpha rows (system/alpha/*) are brand-independent constants (payload.ts's toFlat), so
// they're written here rather than round-tripped through the engine for one boolean.
function toRgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}
function alphaSwatch(hexBase: string, a: number) {
  return { color: toRgba(hexBase, a), label: `${hexBase} · ${Math.round(a * 100)}%` }
}

function SwatchCell({ color, label }: { color: string; label: string }) {
  return (
    <span className="d2-swatch-cell">
      <span className="d2-swatch" style={{ background: color }} />
      <code className="d2-code">{label}</code>
    </span>
  )
}

type TokRow = { token: string; role: string; guarantee: string; light: React.ReactNode; dark: React.ReactNode }
type TokGroup = { register: string; caption: string; rows: TokRow[] }

// Everything a family ships, grouped by the descope posture's visibility line
// (architecture.md §2d): ramp/plumbing rows are single resolved colors, hidden by
// default; role rows are state-carrying usage decisions, always bindable. Computed once
// from TOKEN_REF_HEX, so a value here is exactly what `emitDtcgRamp`/`stopHex` would
// produce for this seed today.
function buildTokenGroups(): TokGroup[] {
  const scale = generateScale(TOKEN_REF_HEX, 'docs', undefined, {})
  const neutral = generateNeutralScale(scale.brandH, 'default')
  // the inverse link trio — same seed as the default link (the brand hex), re-solved
  // for ink-30 surfaces; always raw values, never an alias
  const inv = resolveLinkInverseTrio(TOKEN_REF_HEX)
  const L = scale.light, D = scale.dark
  const NL = neutral.light, ND = neutral.dark
  const hex = (s: { L: number; C: number; H: number; stop: number; r: number; g: number; b: number }) => stopHex(s as Parameters<typeof stopHex>[0])
  const page = { light: pageStopFor(neutral, 'light'), dark: pageStopFor(neutral, 'dark') }
  const border = {
    light: ctaNeedsBorder(scale, 'light', page.light),
    dark: ctaNeedsBorder(scale, 'dark', page.dark),
  }
  const rung = ctaBorderRung('brand') // neutral → 8, secondary → 6, everything else (incl. signals) → 16
  const borderCell = (mode: 'light' | 'dark') => {
    if (!border[mode]) return <SwatchCell color="transparent" label="→ base/alpha/transparent" />
    const { color } = alphaSwatch(mode === 'light' ? '#000000' : '#ffffff', OFFSET_ALPHAS[rung])
    return <SwatchCell color={color} label={`→ base/alpha/${String(rung).padStart(3, '0')}`} />
  }
  const swatch = (h: string) => <SwatchCell color={h} label={h} />
  const alias = (h: string, arrow: string) => <SwatchCell color={h} label={arrow} />

  const onCtaColor = (white: boolean) => (white ? '#ffffff' : '#000000')

  return [
    {
      register: 'base/', caption: 'One resolved color, no state: the ramp stops and the system plumbing. Hidden from the picker by default (the descope posture, §2d): the role rows below are what a designer binds to.',
      rows: [
        { token: 'paper-100', role: "the ladder's universal floor (always the neutral's own stop 0, every family)", guarantee: '–', light: swatch(hex(neutral.paper0!)), dark: swatch(hex(neutral.paper0Dark!)) },
        { token: 'paper-99', role: 'app background, inverted text', guarantee: '–', light: swatch(hex(stopAt(L, 1))), dark: swatch(hex(stopAt(D, 1))) },
        { token: 'paper-97', role: 'raised background, inverted text', guarantee: '–', light: swatch(hex(stopAt(L, 2))), dark: swatch(hex(stopAt(D, 2))) },
        { token: 'paper-95', role: 'surface plane (light dim / dark high)', guarantee: '–', light: swatch(hex(stopAt(L, 3))), dark: swatch(hex(stopAt(D, 3))) },
        { token: 'wash-92', role: 'low-hierarchy fill, interaction, decorative', guarantee: '–', light: swatch(hex(stopAt(L, 4))), dark: swatch(hex(stopAt(D, 4))) },
        { token: 'wash-89', role: 'low-hierarchy fill, interaction, decorative', guarantee: '–', light: swatch(hex(stopAt(L, 5))), dark: swatch(hex(stopAt(D, 5))) },
        { token: 'wash-85', role: 'decorative', guarantee: '–', light: swatch(hex(stopAt(L, 6))), dark: swatch(hex(stopAt(D, 6))) },
        { token: 'wash-80', role: 'decorative', guarantee: '–', light: swatch(hex(stopAt(L, 7))), dark: swatch(hex(stopAt(D, 7))) },
        { token: 'mark-74', role: 'non-text emphasis: borders, UI elements', guarantee: '3:1, on every paper', light: swatch(hex(stopAt(L, 8))), dark: swatch(hex(stopAt(D, 8))) },
        { token: 'lead-53', role: 'emphasis fill and first text stop', guarantee: '4.5:1, on every paper', light: swatch(hex(stopAt(L, 9))), dark: swatch(hex(stopAt(D, 9))) },
        { token: 'ink-42', role: 'mid text', guarantee: '6.5:1, on every paper', light: swatch(hex(stopAt(L, 10))), dark: swatch(hex(stopAt(D, 10))) },
        { token: 'ink-30', role: 'strong text, inverted fill', guarantee: '7:1, on every paper', light: swatch(hex(stopAt(L, 11))), dark: swatch(hex(stopAt(D, 11))) },
        { token: 'ink-0', role: 'universal anchor, mode-flipping constant, never resolved', guarantee: '–', light: swatch('#000000'), dark: swatch('#ffffff') },
        { token: 'abs-black', role: 'literal black pole, an alias target', guarantee: '–', light: swatch('#000000'), dark: swatch('#000000') },
        { token: 'abs-white', role: 'literal white pole, an alias target', guarantee: '–', light: swatch('#ffffff'), dark: swatch('#ffffff') },
        { token: 'abs-primary', role: "the primary's identity hex (re-homed from `identity`, Figma only)", guarantee: 'never adjusted', light: swatch(scale.identityHex!), dark: swatch(scale.identityHex!) },
        { token: 'abs-alt', role: "the secondary's identity hex (the derived pastel shown here; a real secondary re-homes its own hex)", guarantee: 'never adjusted', light: swatch(defaultSecondarySeed(TOKEN_REF_HEX)), dark: swatch(defaultSecondarySeed(TOKEN_REF_HEX)) },
        { token: 'alpha/transparent', role: 'fully transparent', guarantee: '–', light: <SwatchCell {...alphaSwatch('#ffffff', 0)} />, dark: <SwatchCell {...alphaSwatch('#ffffff', 0)} /> },
        { token: 'abs-black-060', role: 'modal scrim, spelled by its composition', guarantee: '–', light: <SwatchCell {...alphaSwatch('#000000', 0.6)} />, dark: <SwatchCell {...alphaSwatch('#000000', 0.6)} /> },
        { token: 'alpha/ink', role: 'the soft on-color pole, at alpha (the neutral and default-style secondary)', guarantee: '–', light: <SwatchCell {...alphaSwatch('#000000', SOFT_ON_CTA_ALPHA.light)} />, dark: <SwatchCell {...alphaSwatch('#ffffff', SOFT_ON_CTA_ALPHA.dark)} /> },
        { token: 'alpha/006', role: 'stamp-edge rung: the secondary', guarantee: '–', light: <SwatchCell {...alphaSwatch('#000000', OFFSET_ALPHAS[6])} />, dark: <SwatchCell {...alphaSwatch('#ffffff', OFFSET_ALPHAS[6])} /> },
        { token: 'alpha/008', role: 'stamp-edge rung: the neutral', guarantee: '–', light: <SwatchCell {...alphaSwatch('#000000', OFFSET_ALPHAS[8])} />, dark: <SwatchCell {...alphaSwatch('#ffffff', OFFSET_ALPHAS[8])} /> },
        { token: 'alpha/016', role: 'stamp-edge rung: the primary and the signals', guarantee: '–', light: <SwatchCell {...alphaSwatch('#000000', OFFSET_ALPHAS[16])} />, dark: <SwatchCell {...alphaSwatch('#ffffff', OFFSET_ALPHAS[16])} /> },
        { token: 'alpha/shadow-04', role: 'drop shadow, lightest', guarantee: '–', light: <SwatchCell {...alphaSwatch('#000000', 0.04)} />, dark: <SwatchCell {...alphaSwatch('#000000', 0.32)} /> },
        { token: 'alpha/shadow-08', role: 'drop shadow, mid', guarantee: '–', light: <SwatchCell {...alphaSwatch('#000000', 0.08)} />, dark: <SwatchCell {...alphaSwatch('#000000', 0.48)} /> },
        { token: 'alpha/shadow-12', role: 'drop shadow, strongest', guarantee: '–', light: <SwatchCell {...alphaSwatch('#000000', 0.12)} />, dark: <SwatchCell {...alphaSwatch('#000000', 0.64)} /> },
      ],
    },
    {
      register: 'solid · link · surface', caption: 'A state-carrying role or a usage decision, never a raw value a designer should need to re-derive. The solid bands sit inside their own family group; link stays in base and the surfaces in utility. Always visible in the picker.',
      rows: [
        { token: 'stamp/fill', role: "the pulled-out button fill, at the seed's own lightness", guarantee: "on-text passes WCAG 4.5; the fill clears APCA Lc 65 (critical 50)", light: swatch(hex(scale.cta)), dark: swatch(hex(scale.ctaDark)) },
        { token: 'stamp/fill-hover', role: 'hover state', guarantee: 'same law as stamp/fill', light: swatch(hex(scale.ctaHover)), dark: swatch(hex(scale.ctaHoverDark)) },
        { token: 'stamp/fill-pressed', role: 'pressed state', guarantee: 'same law as stamp/fill', light: swatch(hex(scale.ctaPressed)), dark: swatch(hex(scale.ctaPressedDark)) },
        { token: 'stamp/on', role: 'computed button text: solid pole on loud fills, pole-at-alpha .75/.80 on quiet fills (derived secondary, neutral)', guarantee: 'chosen by passing', light: swatch(onCtaColor(scale.onFillTextIsWhite)), dark: swatch(onCtaColor(scale.onFillTextIsWhiteDark)) },
        { token: 'stamp/edge', role: 'low-visibility stroke; transparent above the gate', guarantee: 'appears below APCA |Lc| 15 vs the page (taste, not accessibility)', light: borderCell('light'), dark: borderCell('dark') },
        { token: 'identity', role: 'the exact input hex, for logos', guarantee: 'never adjusted', light: swatch(scale.identityHex!), dark: swatch(scale.identityHex!) },
        { token: 'link/default', role: "hyperlinks; with no custom seed, aliases the primary's lead-53", guarantee: '4.5:1, on every paper', light: alias(hex(stopAt(L, 9)), '→ lead-53'), dark: alias(hex(stopAt(D, 9)), '→ lead-53') },
        { token: 'link/hover', role: 'default alias → ink-42', guarantee: '6.5:1, on every paper', light: alias(hex(stopAt(L, 10)), '→ ink-42'), dark: alias(hex(stopAt(D, 10)), '→ ink-42') },
        { token: 'link/pressed', role: 'default alias → ink-30', guarantee: '7:1, on every paper', light: alias(hex(stopAt(L, 11)), '→ ink-30'), dark: alias(hex(stopAt(D, 11)), '→ ink-30') },
        { token: 'link/inverse', role: 'hyperlinks on inverted (ink-30) fills; same seed as the link, re-solved against the worst shipped ink-30', guarantee: '4.5:1, on every ink-30', light: swatch(hex(inv.link as never)), dark: swatch(hex(inv.linkDark as never)) },
        { token: 'link/inverse-hover', role: 'hover state', guarantee: '6.5:1, on every ink-30', light: swatch(hex(inv.linkHover as never)), dark: swatch(hex(inv.linkHoverDark as never)) },
        { token: 'link/inverse-pressed', role: 'pressed state', guarantee: '7:1, on every ink-30', light: swatch(hex(inv.linkPressed as never)), dark: swatch(hex(inv.linkPressedDark as never)) },
        { token: 'surface/dim', role: 'the lowest elevation; always the NEUTRAL, never the themed family', guarantee: '–', light: alias(hex(stopAt(NL, 3)), '→ neutral paper-95'), dark: alias(hex(neutral.paper0Dark!), '→ neutral paper-100') },
        { token: 'surface/low', role: 'the page plane; always the NEUTRAL', guarantee: '–', light: alias(hex(stopAt(NL, 2)), '→ neutral paper-97'), dark: alias(hex(stopAt(ND, 1)), '→ neutral paper-99') },
        { token: 'surface/mid', role: 'raised (cards); always the NEUTRAL', guarantee: '–', light: alias(hex(stopAt(NL, 1)), '→ neutral paper-99'), dark: alias(hex(stopAt(ND, 2)), '→ neutral paper-97') },
        { token: 'surface/high', role: 'the highest elevation; always the NEUTRAL', guarantee: '–', light: alias(hex(neutral.paper0!), '→ neutral paper-100'), dark: alias(hex(stopAt(ND, 3)), '→ neutral paper-95') },
      ],
    },
  ]
}

function TokenTable() {
  const groups = buildTokenGroups()
  return (
    <div className="d2-token-table-wrap">
      <table className="d2-table d2-token-table">
        <thead><tr><th>Token</th><th>Role</th><th>Guarantee</th><th>Light</th><th>Dark</th></tr></thead>
        {groups.map(g => (
          <tbody key={g.register}>
            <tr className="d2-table-subhead"><td colSpan={5}><code className="d2-code">{g.register}</code> {g.caption}</td></tr>
            {g.rows.map(r => (
              <tr key={r.token}>
                <td><code className="d2-code">{r.token}</code></td>
                <td>{r.role}</td>
                <td>{r.guarantee}</td>
                <td>{r.light}</td>
                <td>{r.dark}</td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>
      <figcaption className="d2-ramp-cap">
        Every value above is computed live for seed {TOKEN_REF_HEX} (RAMP_SET_HEXES[0]), the
        engine's own default. "Guarantee" states what the value is checked against, not which
        paper is named in the token file; see architecture.md §2b for the anchor mechanism.
      </figcaption>
    </div>
  )
}

// ── Naming anatomy: primitive/neutral/lead-53, segment by segment ──────────
function NamingAnatomy() {
  const cols = [
    { seg: 'primitive', title: 'REGISTER', lines: ['the extended', "plugin's wrapper,", 'every row'] },
    { seg: 'neutral', title: 'FAMILY', lines: ['which color', 'family this is'] },
    { seg: 'ink', title: 'BAND', lines: ['which law the', 'stop serves'] },
    { seg: '53', title: 'VISIBILITY', lines: ['light rootL', '× 100, rounded'] },
    { seg: 'aa', title: 'CONFORMANCE', lines: ['WCAG level', 'this stop clears'] },
  ]
  const colW = 132, gap = 8, boxY = 34, boxH = 44
  const x = (i: number) => i * (colW + gap)
  const width = cols.length * colW + (cols.length - 1) * gap
  return (
    <figure className="d2-ramp">
      <svg viewBox={`0 0 ${width} 190`} className="d2-anatomy" role="img" aria-label="Token path anatomy: base/neutral/lead-53">
        {cols.map((c, i) => (
          <g key={c.seg}>
            <rect x={x(i)} y={boxY} width={colW} height={boxH} rx={8} className="d2-anatomy-box" />
            <text x={x(i) + colW / 2} y={boxY + boxH / 2 + 5} textAnchor="middle" className="d2-anatomy-seg">{c.seg}</text>
            {i < cols.length - 1 && (
              <text x={x(i) + colW + gap / 2} y={boxY + boxH / 2 + 5} textAnchor="middle" className="d2-anatomy-sep">
                {/* band flattening (owner 2026-08-12): the band joins its leaf with
                    hyphens — slashes stop at the family group */}
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
        The extended plugin's full path for one stop. The plain engine/CSS name drops the
        first two segments: <Code>lead-53</Code>.
      </figcaption>
    </figure>
  )
}

// ── Live example: a real requirement token, emitted by the engine right now ──
function LiveToken({ hex, tokenKey, mode, caption }: { hex: string; tokenKey: string; mode: 'light' | 'dark'; caption: React.ReactNode }) {
  const group = emitDtcgRamp(hex, mode, `brand.${mode}`)
  return (
    <figure className="d2-ramp">
      <Pre>{JSON.stringify(group[tokenKey], null, 2)}</Pre>
      <figcaption className="d2-ramp-cap">{caption}</figcaption>
    </figure>
  )
}

// ── Articles ─────────────────────────────────────────────────────────────────
type Article = { slug: string; title: string; body: () => React.ReactNode }

const overview: Article = {
  slug: 'overview',
  title: 'Overview',
  body: () => (
    <>
      <Lead>
        OKChroma is a themeable color-system engine and plugin that generates a
        complete, accessible, theme-ready color system.
      </Lead>
      <P>The engine generates:</P>
      <UL>
        <LI>Light and dark mode</LI>
        <LI>Brand-tinted neutral ramp tinted from the brand hue</LI>
        <LI>Primary and (optional) secondary color ramps</LI>
        <LI>Four signal ramps: critical, warning, positive, info.</LI>
        <LI>Required system colors (see token output table).</LI>
      </UL>
      <P>Okchroma does three things differently:</P>
      <OL>
        <LI>Stops are designed to adjust based on hue and chroma so they appear to be the same lightness for predictable theming.</LI>
        <LI>Okchroma acknowledges that primitives are broad not agnostic: accessibility requirements are built into both the names and the stops (see pre-reserved roles)</LI>
        <LI>Contrast is solved upfront during generation, not solved for when it comes time to alias to semantic or component tokens</LI>
      </OL>
      <RampSet />
      <H2>Output formats</H2>
      <P>The same values ship in two interchangeable forms:</P>
      <UL>
        <LI><b>CSS custom properties</b>: a light and dark block per brand, consumed through a thin semantic alias layer.</LI>
        <LI><b>Figma variables</b>: written straight into a Figma file by the plugin.</LI>
      </UL>
      <H2>Reading a token name</H2>
      <P>
        A name states its own placement: the band it belongs to, its visibility, and,
        where relevant, the WCAG level it certifies. In the extended Figma plugin a full
        path adds two more segments in front:
      </P>
      <NamingAnatomy />
      <H2>Which rows a designer sees</H2>
      <P>
        Every variable the extended plugin (Enterprise Figma) writes lives under
        the ownership zones <Code>base/</Code> (engine-owned) and <Code>utility/</Code> (team-touchable), grouped by family. Two kinds of rows share base/:
      </P>
      <UL>
        <LI><b>ramp stops and plumbing</b>: one resolved color, no state, e.g. <Code>base/neutral/paper-99</Code>. Hidden from the color picker by default.</LI>
        <LI><b>roles</b>: a state-carrying usage decision, kept where it belongs: the solid bands inside their family, e.g. <Code>base/brand/stamp/fill-hover</Code>, link under base, and the surfaces under utility, e.g. <Code>utility/surface/dim</Code>. Always visible.</LI>
      </UL>
      <P>
        A checkbox in the plugin ("Hide primitive scale from pickers") controls whether
        the ramp and plumbing rows are hidden from every color picker in the file; the
        role rows are always visible, since those are the names a designer should
        actually bind to. The setting is stored on the file and re-applied on every
        apply, so a hand-edited scope always reverts on the next run. See
        <Code>architecture.md</Code> §2d for the full mechanism, including how an older
        file's paths heal onto the current spelling.
      </P>
      <P>Each family ships this token set, in both modes. Every swatch below is computed live:</P>
      <TokenTable />
    </>
  ),
}

const install: Article = {
  slug: 'installation',
  title: 'Installation',
  body: () => (
    <>
      <Lead>Run the engine and demo locally.</Lead>
      <Pre>{`npm install
npm run demo:build      # generate token CSS + bundle the demo
npx serve .             # open http://localhost:3000/demo/index.html`}</Pre>
      <P>
        <Code>npm run dev</Code> is watch mode. <Code>npm run build</Code> bundles the demo only;
        the plugins build separately with <Code>npm run plugin:build</Code> and{' '}
        <Code>npm run plugin-ext:build</Code>, then import the plugin's{' '}
        <Code>manifest.json</Code> in Figma.
      </P>
      <H3>Using the engine directly</H3>
      <P>
        The engine's one runtime dependency is <Code>helmlab</Code>, a perceptual distance metric
        used in collision resolution; <Code>lucide-react</Code> is demo-only.
      </P>
      <Pre>{`import { resolveBrand, brandCss } from './src'

const resolved = resolveBrand('#E93D82', 'Acme')
const css = brandCss('acme', 'Acme', resolved)`}</Pre>
      <Note>Architecture and dependency notes live in <Code>docs/architecture.md</Code>.</Note>
    </>
  ),
}

const generation: Article = {
  slug: 'generation',
  title: 'How the theme is generated',
  body: () => (
    <>
      <OL>
        <LI>The theme is seeded with a primary and optional secondary hex value.</LI>
        <LI>The given values are converted to OKLCH; all reasoning happens there (converted back to
        RGB at emit).</LI>
        <LI>The light ramp is generated through the following solves:
          <UL>
            <LI>Lightness is solved so <b>apparent</b> lightness hits the stop's shared target
            (Helmholtz&ndash;Kohlrausch corrected). Every brand's stop 9 reads equally bright,
            etc.</LI>
            <LI>Hue is the seed hue plus two shifts.
              <UL>
                <LI>Warm seeds (full weight ≈ H50&ndash;88, zero by 104) rotate toward the hue that
                stays clean at that stop's lightness (47° dark end, 110° light end), taking 55% of
                the difference, capped near ±24°, weighted by distance from that path.</LI>
                <LI>Seeds near the red signal hue (33.3°) shift away from it by the nearest side,
                up to 14°.</LI>
              </UL>
            </LI>
            <LI>Chroma is a declared per-stop ladder scaled by the seed's vividness, then clamped
            to gamut at the final L and H. Clamping reduces chroma only; hue never bends from
            clipping.</LI>
          </UL>
        </LI>
        <LI>The dark ramp is generated: computed together with light, stored on one result. Dark L
        is a flat calibrated ladder (apparent-lightness solving in dark makes blue recede; the flat
        ladder is deliberate). Chroma is trimmed so light-mode loudness carries over. A fill that
        lands too dark is floored upward: it lifts, never sinks.</LI>
        <LI><b>Requirements.</b> Declared floors bind after placement, in both modes: mark-74
        at WCAG 3:1, lead-53/42-aa/30-aaa at 4.5 / 6.5 / 7:1, each guaranteed on every paper
        the family (and its neutral) can produce. A placement that already clears does not
        move. An unmeetable floor marks the stop <Code>unresolvable</Code> instead of fudging.</LI>
        <LI>The cta-related values are generated.
          <UL>
            <LI>Because this value can be anywhere on the spectrum, it is not a stop: it anchors at
            the seed's own lightness (dark floor 0.63).</LI>
            <LI>Its text is black or white, whichever passes WCAG 4.5; if neither does, the fill
            moves until one passes. Brand and signal ctas also clear APCA Lc 65 both modes
            (critical: 50).</LI>
            <LI>A fill within |Lc| 15 of the page gains a translucent border (primary 16%,
            secondary 6%, neutral 8%).</LI>
            <LI>A quiet fill (derived secondary, neutral) carries its text at 75/80% alpha, only
            where the composite clears 4.5 on rest, hover, and pressed.</LI>
            <LI>The text-style cta is the ink stops read as states: lead-53 rest,
            ink-42 hover, ink-30 pressed.</LI>
          </UL>
        </LI>
        <LI><b>Collision checks.</b> The result is compared to the four signals: red, yellow,
        green, blue, emitted as critical, warning, positive, info. Two tests: wash hues within 15°
        with real vividness (family), and fill ΔE ≤ 0.16 light / 0.10 dark at hues within 30°
        (value). Resolution is per signal:
          <Table
            head={['Signal', 'Who yields', 'Resolution']}
            rows={[
              [<Code>red (critical)</Code>, 'the brand',
                'The step-3 hue shift keeps the tints off red. A cta inside the true-red region exits by its nearest edge. If red still sits too close, the signal re-seats on the far side of the brand, or ships canonical with outline advice for destructive controls.'],
              [<Code>yellow (warning)</Code>, 'the signal',
                'Brand below 96°: yellow shifts to lemon. At or above: no change.'],
              [<Code>green (positive)</Code>, 'the signal',
                'Brand below 147°: teal-side variant. At or above: yellow-side variant.'],
              [<Code>blue (info)</Code>, 'the signal',
                'Brand below 273°: magenta-side variant. At or above: cyan-side variant.'],
            ]}
          />
          A supplied secondary is checked the same way: green/blue variants are adopted only if
          they clear both brand colors, the primary wins ties, and the rest ships as advice. Signal
          swaps are output-only and never re-enter generation.</LI>
        <LI><b>Companions.</b> A secondary, if present: the primary's seed lifted toward the light
        pole by 65% of the remaining headroom, chroma halved and bounded, hue unchanged, then
        resolved as a normal ramp (at least 10 apparent-L off the light page; dark cta flat 40
        above the dark page). A supplied hex takes the same transform, or ships exact as a full
        standard ramp, or outline. The neutral: a near-gray at a tint hue (primary by default;
        secondary or a custom hex, stored as a source) through the same generator with its own
        chroma curve, at four strengths.</LI>
        <LI><b>Your levers.</b> <Code>exact</Code> (fill and identity ship untouched; the ramps
        and signals still compute), archetype override, style (<Code>deeper</Code> /{' '}
        <Code>full-chroma</Code>), secondary style, neutral tint source and strength.</LI>
      </OL>
    </>
  ),
}

const tokenSchema: Article = {
  slug: 'token-schema',
  title: 'The token schema',
  body: () => (
    <>
      <Lead>A token is a requirement the engine solves, not a frozen value.</Lead>
      <P>
        Every emitted token carries a frozen color any DTCG tool can read (<Code>$value</Code>) and
        the live requirement that produced it
        (<Code>$extensions["org.okchroma.requirement"]</Code>). A requirement-aware resolver
        ignores the frozen value and re-solves from the requirement. Edit the requirement in the
        file (raise a contrast target) and the resolver honors the edit.
      </P>
      <P>
        This is a real token, emitted by the engine right now: light <Code>mark-74</Code>,
        carrying its declared WCAG 3:1 require against paper-95:
      </P>
      <LiveToken hex="#3060C0" tokenKey="8" mode="light"
        caption={<>Live output of <Code>emitDtcgRamp('#3060C0', 'light')</Code>. The <Code>produce</Code> block names the producers; <Code>require</Code> is the declared floor.</>} />
      <H2>Stops and roles</H2>
      <P>
        Scale stops are keyed by number (0 is the resolved paper anchor). The cta is a role, keyed
        by name: <Code>cta</Code>, <Code>cta-hover</Code>, <Code>cta-pressed</Code>. Roles anchor
        to the brand's own hue and lightness, floored in dark so a fill lifts but never sinks:
      </P>
      <LiveToken hex="#3060C0" tokenKey="cta" mode="dark"
        caption={<>The dark <Code>cta</Code> role: <Code>hue: constant</Code> (the brand's own hue), <Code>L: anchor</Code> with <Code>floorL</Code>, the lift-never-sink rule.</>} />
      <H2>The rules in one breath</H2>
      <UL>
        <LI><b>A requirement is a floor.</b> A placement that already clears it doesn't move, byte for byte.</LI>
        <LI><b>Requirements reference resolved stops.</b> Push paper-97 darker and the floors declared against it re-solve automatically.</LI>
        <LI><b>Fail loud.</b> An unmeetable requirement marks the stop <Code>unresolvable</Code>; a foreign resolver id is rejected, never guessed at.</LI>
        <LI><b>Producers are names, not formulas.</b> The math lives behind the versioned <Code>resolver</Code> id; the token file stays pure intent.</LI>
      </UL>
      <Note>
        The field-by-field reference is <Code>docs/schema.md</Code> in the repo.
      </Note>
    </>
  ),
}

// ── Motivation-page figures: evidence borrowed from the real Unify export ────
// HSL lightness, the convention the figures indict, computed honestly in HSL
// (max+min over 2), never through the engine.
const hslL = (hex: string): number => {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  return Math.round(((Math.max(r, g, b) + Math.min(r, g, b)) / 2 / 255) * 100)
}
const unifySig = (name: string) => UNIFY_SIGNALS.find(s => s.name === name)!

const A = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a className="d2-a" href={href} target="_blank" rel="noreferrer">{children}</a>
)

// The required chip comparison: the success and warning 200s from the real
// export, light values. The point is what the ordinal convention produced, so
// the two colors are the shipped ones, not engine output.
function ChipCompare() {
  const success = unifySig('Signal Success Highlight')
  const warning = unifySig('Signal Warning Highlight')
  const chips = [
    { label: 'Success', tok: success },
    { label: 'Warning', tok: warning },
  ]
  return (
    <figure className="d2-fig" role="img" aria-label={`A success chip and a warning chip side by side. Both are the 200 stop of their family, and their HSL lightness is nearly identical (${hslL(success.light)} and ${hslL(warning.light)}). Only the hue differs, and the success chip reads far darker.`}>
      <div className="d2-chips">
        {chips.map(c => (
          <div key={c.label} className="d2-chip-col">
            <div className="d2-chip" style={{ background: c.tok.light }}>{c.label}</div>
            <code className="d2-code">stop {c.tok.stop} · {c.tok.light} · HSL L {hslL(c.tok.light)}</code>
          </div>
        ))}
      </div>
      <figcaption className="d2-ramp-cap">
        Two chips from a real system's signal palette (light values). Both alias the 200 of
        their family and sit within one point of the same HSL lightness. The success chip
        reads far darker.
      </figcaption>
    </figure>
  )
}

// The real system's chip exhibit, borrowed from the unify comparison page
// (section 2's Unify card): one indicator-chip recipe (Accent fill, Highlight
// border, Primary text), re-aliased per theme. Light values. Row labels derive
// from each theme's primary family and stop, never theme names.
const lstar = (hex: string): number => {
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
  const n = parseInt(hex.slice(1), 16)
  const Y = 0.2126 * lin(((n >> 16) & 255) / 255) + 0.7152 * lin(((n >> 8) & 255) / 255) + 0.0722 * lin((n & 255) / 255)
  return 116 * (Y > 0.008856 ? Math.cbrt(Y) : (903.3 * Y + 16) / 116) - 16
}
function UnifyChipGrid() {
  const sigPart = (fam: string, part: '' | ' Highlight' | ' Accent') =>
    UNIFY_SIGNALS.find(s => s.name === `Signal ${fam}${part}`)!.light
  const gray = (stop: number) => UNIFY_GRAY.find(x => x.stop === stop)!.light
  const chipRow = (t: (typeof UNIFY_THEMES)[number]) => [
    ...(['Error', 'Warning', 'Success'] as const).map(fam => ({ bg: sigPart(fam, ' Accent'), border: sigPart(fam, ' Highlight'), fg: sigPart(fam, '') })),
    { bg: gray(25), border: gray(100), fg: gray(600) },
    { bg: t.accent.hex, border: t.highlight.hex, fg: t.primary.hex },
  ]
  const primL = UNIFY_THEMES.map(t => lstar(t.primary.hex))
  const span = Math.round(Math.max(...primL) - Math.min(...primL))
  return (
    <figure className="d2-fig" role="img" aria-label={`One indicator chip recipe across ${UNIFY_THEMES.length} real themes. Each row shows the three signal chips and a neutral chip, which never change, beside the brand chip, whose fill, border, and lightness jump from theme to theme.`}>
      <div className="d2-chipgrid">
        {UNIFY_THEMES.map(t => (
          <div key={t.name} className="d2-chipgrid-row">
            <span className="d2-chipgrid-label">{t.primary.family} {t.primary.stop}</span>
            {chipRow(t).map((c, i) => (
              <span key={i} className="d2-chipx" style={{ background: c.bg, borderColor: c.border, color: c.fg }}>chip</span>
            ))}
          </div>
        ))}
      </div>
      <figcaption className="d2-ramp-cap">
        A real system's indicator chip: Accent fill, Highlight border, Primary text, all
        three re-aliased per theme (light values). The signal and neutral chips never
        move; the brand chip's text alone spans {span} L* across these themes, and in the
        Green 500 row the brand chip reads as the success chip.
      </figcaption>
    </figure>
  )
}

// The four band names, painted with live neutral stops from their own bands.
function BandTiles() {
  const scale = generateScale(TOKEN_REF_HEX, 'docs', undefined, {})
  const neutral = generateNeutralScale(scale.brandH, 'default')
  // the inverse link trio — same seed as the default link (the brand hex), re-solved
  // for ink-30 surfaces; always raw values, never an alias
  const inv = resolveLinkInverseTrio(TOKEN_REF_HEX)
  const at = (stop: number) => stopHex(neutral.light.find(s => s.stop === stop)!)
  const tiles = [
    { band: 'paper', bg: at(1), fg: '#202020' },
    { band: 'wash', bg: at(5), fg: '#202020' },
    { band: 'mark', bg: at(8), fg: '#202020' },
    { band: 'ink', bg: at(11), fg: '#ffffff' },
  ]
  return (
    <figure className="d2-fig" role="img" aria-label="The four band names, each painted with a live neutral stop from its own band: paper, wash, mark, ink.">
      <div className="d2-chips">
        {tiles.map(t => (
          <div key={t.band} className="d2-chip" style={{ background: t.bg, color: t.fg }}>{t.band}</div>
        ))}
      </div>
    </figure>
  )
}

// ── Motivation: the project's origin essay, prose final (owner hand-edited).
// Do not rewrite. Image assets still to land are marked as slots below.
const motivation: Article = {
  slug: 'motivation',
  title: 'Motivation',
  body: () => (
    <>
      <Lead>
        <b>Primitives have never been agnostic: A shared delusion that's hurting your
        design system.</b> Despite knowing what a primitive is destined to do before a
        single semantic token exists, we have been creating them as static options for
        over a decade. What would it look like for a design system to admit its
        primitives have purpose?
      </Lead>
      <P>
        I work on a design system for financial products. It has an elegant color
        philosophy that prioritizes function over decoration, and is built to be
        re-themed for any brand: flexibility and accessibility are key. Supporting a
        white label design system means being ready to satisfy a wide range of brands,
        which in turn means we encounter edge cases a standard design may never need to
        consider. While some things are very different system-to-system, when it comes
        to color, some things never change. Accessibility requirements, common value
        pairings, how annoying yellow is: our output has more constants than we openly
        acknowledge.
      </P>
      <P>
        Our primitive system is set up in the standard way, adjusted to support white
        label theming. We built it that way because it is what everyone does, and I
        believed in it the way everyone does. But I had a nagging feeling that
        "primitives-as-options" could never adequately meet our needs.
      </P>
      <H2>The friction theming exposes</H2>
      <P>
        Set primitives up as agnostic options and every decision they feed becomes a
        guess. The palette offers plenty to choose from and no basis for choosing: which
        stop becomes the primary CTA, which one darkens for hover, which one sits behind
        a chip. We answer by eye, per brand, and the answers have nothing holding them
        together.
      </P>
      <P>
        And because no stop was made to fit criteria, nothing keeps the results
        consistent across themes. Once you see it, it's everywhere: we use stop 200 for
        the highlight color and stop 50 for the accent color on every brand and signal
        color, assuming a stop number would look the same way everywhere. The success
        chip looks much darker than a warning chip despite both aliasing the "200" of
        their respective color families and using the same HSL lightness value.
      </P>
      <ChipCompare />
      <P>This highlights two problems:</P>
      <OL>
        <LI>200s were created <b><i>for the purpose</i></b> of being a "light background" and they draw the eye in different amounts.</LI>
        <LI>The primitive's ordinal suffix (200) <b><i>promises</i></b> equal lightness and doesn't deliver</LI>
      </OL>
      <P>
        Part of this problem is tooling limitations. OKLCH is not available in Figma and
        lightness doesn't read equally across hues in HSL.
      </P>
      <P>
        In a single brand you tune by eye and move on. Across themes, the same role lands
        on a different number in every palette and reads differently in each one. We
        create neat gradients of numbered colors knowing they are ultimately destined for
        a role 95% of the time, because we've accepted that primitives have to be
        open-ended just in case.
      </P>
      <UnifyChipGrid />
      <H2>The number records where, not why</H2>
      <P>
        The standard structure treats primitives as options: a field of values you draw
        from when you make decisions in the semantic layer. You generate a wide palette
        to cover every choice you might make, give each value an ordinal name, and defer
        the meaning to a later step, hoping you have covered all your bases.
      </P>
      {/* image1 slot: samiam token-level framework diagram (asset pending, owner to
          supply the file). Caption when it lands: "The widely-accepted token level
          framework, from samiam's research on the topic" linking to
          https://samiamdesigns.substack.com/p/a-new-approach-to-naming-design-tokens */}
      <P>
        But primitives have never really been options. We follow this format because it
        is what everyone else does. Whether we want to admit it or not, all primitives
        are born to satisfy some requirement. As designers, we already know what a
        primitive is destined for before we make it. When I set up a system I know I
        need a brand color that carries white type at 4.5:1. I know I need a near-white
        tint that holds a bit of hue, but still passes legible body copy on top. I know
        which colors will be paired together often, and which will need to be legible
        against each other. Those requirements always existed, but the "options" framing
        asks me to ignore what I know in favor of keeping my options open for the sake
        of this structure alone.
      </P>
      <P>
        And the token itself can't hold what I know, because a token only records the
        answer. Your decision is encoded, but it's frozen, with no memory of the
        parameters that produced it. blue-600 is #2563EB. It does not carry the fact
        that it exists to hold white type, that it has to clear a certain contrast ratio
        to work everywhere we need it, or that it should read at a particular lightness.
        All of that lives on in memory, or even documentation: but none of it is
        declared by the token. It's up to us to carry the rules and encode them later,
        every time we decide where the token gets used. Should we continue to create
        primitives, name them, and use them as if they are naive and devoid of upfront
        purpose?
      </P>
      <H2>Primitives froze for a reason, and the reason is gone</H2>
      <P>
        In hindsight, it would be easy to read this as myopic, but the frozen primitive
        was a reasonable answer to a real problem. Design tokens began as a portability
        play. <A href="https://www.jina.me/">Jina Anne</A> kept the Sass site's design
        values in a single YAML file and generated everything from it, and at
        Salesforce, in her words, "where the concept of design tokens spawned," the idea
        grew into tooling that generated each platform's code from that one file. A file
        that has to feed web, Swift, and Kotlin has no shared way to run a computation,
        so it stores the resolved value, and the math happens before the file or not at
        all. The move that let tokens cross platforms is the same move that left the
        math behind. This has not changed: the formats tools are standardizing on today
        still define a token's value as a literal or a reference, with no syntax for a
        calculation.
      </P>
      <P>
        The ordinal naming arrived on a separate track, from Material Design and then
        Tailwind, and became popular especially because it was easy to adopt. The
        numbers are sometimes assigned post-hoc rationalizations, but I can't find proof
        they ever carried intentional meaning. Put the two threads together and you get
        the shape most of us inherited: values written down in advance, under names that
        mark position instead of purpose. Neither thread was designed as doctrine. One
        was a workaround for platforms that couldn't share math; the other was a
        labeling convention that spread because it was easy.
      </P>
      <P>
        The workaround's reason has expired. The browser can now hold a color as a
        relationship: with relative color syntax you write oklch(from var(--brand) 0.5 c
        h), which takes the brand color, keeps its chroma and hue, and sets its
        lightness to a target, resolved live. The browser can even pick black or white
        for you now with contrast-color(), but computing which lightness target clears a
        given ratio for anything richer than black or white is still your job. The
        derivation itself, though, now lives in the stylesheet.{' '}
        <A href="https://m3.material.io/styles/color/system/how-the-system-works">Material 3's dynamic color</A> already
        works this way: a single seed color, a full set of tones derived in a perceptual
        space, assigned to roles by purpose, checked for contrast.
      </P>
      <P>
        Yet none of this feels like a problem day-to-day, because a frozen value is all
        any of us designers really, actually, touch. It's just not how we do things in
        Figma. Its variables store fixed values; they can point at each other and swap
        by mode, but they can't compute new things. Like me in high school, Figma
        refuses to do math, and this is where a tooling limitation hardens into a design
        constraint.
      </P>
      <H2>Writing the contract</H2>
      <P>
        I was already on a mission to clean up our color ramps to be more perceptually
        uniform, so it felt like a natural time to explore. I tried mapping out the
        ramps' future relationships to see if I could create a generic lightness shape
        based on the contrast needs to come. This began as an exercise to help me align
        on the right stops, but ended up being the beginnings of a primitive contract: a
        set of requirements that outline every relationship the eventual palette has to
        honor, written before any color exists.
      </P>
      {/* image2 slot: the contrast requirement mapping (asset pending, owner supplied
          the keep call 2026-08-08; drop the file in and render it here). */}
      <P>
        Once you accept that a stop has a reserved role, the ordinal number starts to
        feel like an affront. 100 tells you where a color sits on a ramp, and nothing
        else. I decided it was time to break from convention and name these things. I
        have a fascination with digital things being material, and given that, decided
        to borrow from my original entry to design: pigment on paper. I assigned role
        bands and gave them names that evoke different mediums for imparting color onto
        paper, understandable terms that nod to paper and pen.
      </P>
      <BandTiles />
      <UL>
        <LI><i>Paper</i> carries inks and marks</LI>
        <LI><i>Wash</i> adds a touch of color</LI>
        <LI><i>Mark</i> calls attention</LI>
        <LI><i>Ink</i> writes</LI>
      </UL>
      <P>
        There is more to the full convention than I'll cover here (it's documented{' '}
        <A href="https://egerrity.github.io/okchroma/">on the site</A>), but the number
        earns its place too. It is no longer ordinal: it records the stop's real
        lightness target as generated by the engine, its light root L times 100, so
        lead-53 tells you both what the stop does and where it actually sits. This
        relationship to the real removes the abstraction and, more importantly, tells
        you the token's contractual obligation in plain terms. The rules stop living in
        our heads: the name itself declares what the stop owes.
      </P>
      <NamingAnatomy />
      <P>
        To prove the requirement-first version was buildable, I built okchroma, an
        engine that takes a brand hex (or two) and returns a full set of accessible,
        role-reserved primitives, with contrast solved during generation instead of
        patched afterward. The math is not mine: established color appearance research,
        found with <A href="https://gorkemyildiz.com/">invaluable help from Görkem
        Yıldız</A>, replaced the rules I had intuited by eye with equations that did
        cleanly what mine did roughly. The late nights of tuning are their own article.
        What matters here is the proof, for color, that a primitive can be a live
        formula: a hue and chroma resolved against a lightness target that satisfies a
        contrast requirement.
      </P>
      <H2>So why do we store values at all?</H2>
      <P>
        If a primitive can be expressed as a live formula, then the frozen list of hex
        values isn't a necessity. It's an artifact of our tools and our narrow fields of
        expertise. Imagine how much easier, and more <i>scalable</i>, it would be if we
        could instead set the requirements and derive exactly what we need. Options are
        a necessary evil for now, but the arbitrariness is not.
      </P>
      <RampSet />
      <P>
        I even built a sister plugin to mimic this in Figma, but that's all it can do:
        mimic. I can't yet make Figma natively understand a primitive as a requirement
        rather than a value.
      </P>
      {/* image5 slot: the Figma plugin (asset pending, owner to supply a screenshot). */}
      <P>
        That being said, you do not need okchroma to use the idea, and it breaks no
        standard and adopts no tool. Open your system and write down what each primitive
        actually does before you touch a value. Consider what sits on what, the ratio
        each pair has to clear, and what the pair is for. Once the roles are defined,
        the values tend to suggest themselves. The math existing means this can
        eventually run at scale. By-hand still works in the meantime.
      </P>
      <H2>What comes next?</H2>
      <P>
        There's a historical rhyme worth sitting with: in 1994, CSS was proposed to
        separate the content of a page from its presentation. This feels like a similar
        moment: separating the declaration of a value from its derivation. We've been
        declaring "options" when we could be deriving intentional values from the
        constraints we already know.
      </P>
      <P>
        The larger point is for the field, not for one system. The primitive did its
        job. It gave us portability and a shared language when we needed both, and
        treating its values as frozen and its names as arbitrary was the toll for
        getting across. The tools that charged that toll are changing.
      </P>
      <P>
        The next step is to stop shipping values and start shipping the contract. Nearly
        every system I've looked at treats a token as a place to store an answer. The
        few that keep any intelligence in the loop (Material 3, Adobe Leonardo, Apple's
        semantic colors) each hold only one thread of it: they solve for contrast, or
        they carry the role but author every light, dark, and high-contrast variant by
        hand. None lets the token carry its own requirement. That gap is what okchroma
        is building into.
      </P>
      <P>
        At time of writing, I'm attempting to write what this could look like as an
        actual token schema: if a token declares its requirement instead of its value,
        dark mode stops being a second palette to maintain and becomes the same token
        re-resolved against a darker background, and high-contrast becomes the same
        token re-resolved against a stricter floor. This is the bigger question the
        project left me with, and I hope this article helps me entice experts to make
        this proof of concept something bigger.
      </P>
      <P>
        Primitives bridged a real gap. The question worth sitting with now is what they
        become on the other side of it.
      </P>
      <P>
        okchroma is open source.{' '}
        <A href="https://egerrity.github.io/okchroma/">See it run</A>, and{' '}
        <A href="https://github.com/egerrity/okchroma">read the code</A>.
      </P>
    </>
  ),
}

// UNPUBLISHED 2026-08-14 (owner): `motivation` is deliberately absent from this list —
// the essay is not finished. Its article + figures stay in the file, unreferenced by the
// site; re-add it here (after overview) to publish it again.
const ARTICLES: Article[] = [overview, install, generation, tokenSchema]

// ── Layout ───────────────────────────────────────────────────────────────────
export default function DocsSite({ dark: _dark }: { dark: boolean }) {
  const [slug, setSlug] = useState(ARTICLES[0].slug)
  const active = ARTICLES.find(a => a.slug === slug) ?? ARTICLES[0]
  return (
    <div className="d2">
      <style>{DOCS2_CSS}</style>
      <aside className="d2-side">
        <nav>
          <div className="d2-side-group">
            {ARTICLES.map(a => (
              <button key={a.slug} className={`d2-side-link${a.slug === slug ? ' active' : ''}`} onClick={() => setSlug(a.slug)}>
                {a.title}
              </button>
            ))}
          </div>
        </nav>
      </aside>
      <main className="d2-main">
        <article className="d2-article">
          <h1 className="d2-h1">{active.title}</h1>
          {active.body()}
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
}
.d2-side-link:hover { background: var(--surface-mid); color: var(--fg-default); }
.d2-side-link.active { background: var(--brand-bg-subtle); color: var(--fg-default); font-weight: 600; }
.d2-main { padding: 40px 0; min-width: 0; }
.d2-article { max-width: 720px; margin: 0 auto; padding: 0 32px; }
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
.d2-pre {
  background: var(--surface-dim); border: 1px solid var(--border-subtle); border-radius: 10px;
  padding: 16px 18px; overflow-x: auto; margin: 0 0 18px;
}
.d2-pre code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; line-height: 1.6; color: var(--fg-default); white-space: pre; }
.d2-note { font-size: 13.5px; line-height: 1.6; color: var(--fg-subtle); background: var(--surface-dim); border: 1px solid var(--border-subtle); border-left: 3px solid var(--brand-lead-53); border-radius: 8px; padding: 12px 14px; margin: 18px 0; }
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
.d2-token-table-wrap { overflow-x: auto; margin: 18px 0 26px; }
.d2-token-table { font-size: 13px; min-width: 760px; }
.d2-table-subhead td { background: var(--surface-dim); font-weight: 600; color: var(--fg-default); padding: 8px 10px; font-size: 13px; }
.d2-table-subhead code { margin-right: 6px; }
.d2-swatch-cell { display: inline-flex; align-items: center; gap: 7px; white-space: nowrap; }
.d2-swatch { width: 15px; height: 15px; border-radius: 4px; border: 1px solid var(--border-subtle); flex-shrink: 0; display: inline-block; background-image: linear-gradient(45deg, var(--border-subtle) 25%, transparent 25%, transparent 75%, var(--border-subtle) 75%), linear-gradient(45deg, var(--border-subtle) 25%, transparent 25%, transparent 75%, var(--border-subtle) 75%); background-size: 6px 6px; background-position: 0 0, 3px 3px; }
.d2-anatomy { width: 100%; height: auto; max-width: 720px; display: block; margin: 8px 0 4px; }
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
