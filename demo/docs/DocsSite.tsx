import React, { useState } from 'react'
import { generateScale, generateNeutralScale } from '../../src/engine/colorEngine'
import { stopHex, ctaNeedsBorder, pageStopFor, ctaBorderRung, OFFSET_ALPHAS } from '../../src/engine/cssRender'
import { defaultSecondarySeed, SOFT_ON_CTA_ALPHA } from '../../src/engine/resolve'
import { emitDtcgRamp } from '../../src/reqtoken/dtcg'

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
// source; it has carried stale claims). Structure: four flat pages; the
// generation flow is ONE numbered article in execution order (owner's edit).
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

// Everything a family ships, grouped the way the extended plugin's picker groups it
// (architecture.md §2d): primitive rows are single resolved colors; semantic rows are
// state-carrying roles or usage decisions. Computed once from TOKEN_REF_HEX, so a value
// here is exactly what `emitDtcgRamp`/`stopHex` would produce for this seed today.
function buildTokenGroups(): TokGroup[] {
  const scale = generateScale(TOKEN_REF_HEX, 'docs', undefined, {})
  const neutral = generateNeutralScale(scale.brandH, 'default')
  const L = scale.light, D = scale.dark
  const NL = neutral.light, ND = neutral.dark
  const hex = (s: { L: number; C: number; H: number; stop: number; r: number; g: number; b: number }) => stopHex(s as Parameters<typeof stopHex>[0])
  const page = { light: pageStopFor(neutral, 'light'), dark: pageStopFor(neutral, 'dark') }
  const border = {
    light: ctaNeedsBorder(scale, 'light', page.light),
    dark: ctaNeedsBorder(scale, 'dark', page.dark),
  }
  const rung = ctaBorderRung('brand-primary') // neutral → 8, secondary → 6, everything else (incl. signals) → 16
  const borderCell = (mode: 'light' | 'dark') => {
    if (!border[mode]) return <SwatchCell color="transparent" label="→ system/alpha/transparent" />
    const { color } = alphaSwatch(mode === 'light' ? '#000000' : '#ffffff', OFFSET_ALPHAS[rung])
    return <SwatchCell color={color} label={`→ system/alpha/offset-${String(rung).padStart(2, '0')}`} />
  }
  const swatch = (h: string) => <SwatchCell color={h} label={h} />
  const alias = (h: string, arrow: string) => <SwatchCell color={h} label={arrow} />

  const onCtaColor = (white: boolean) => (white ? '#ffffff' : '#000000')

  return [
    {
      register: 'primitive/', caption: 'One resolved color, no state. Hidden from the picker by default (the descope posture, §2d): the worded semantic/ names are what a designer binds to.',
      rows: [
        { token: 'paper-100', role: "the ladder's universal floor (always the neutral's own stop 0, every family)", guarantee: '–', light: swatch(hex(neutral.paper0!)), dark: swatch(hex(neutral.paper0Dark!)) },
        { token: 'paper-99', role: 'app background, inverted text', guarantee: '–', light: swatch(hex(stopAt(L, 1))), dark: swatch(hex(stopAt(D, 1))) },
        { token: 'paper-97', role: 'raised background, inverted text', guarantee: '–', light: swatch(hex(stopAt(L, 2))), dark: swatch(hex(stopAt(D, 2))) },
        { token: 'paper-95', role: 'surface plane (light sink / dark pop)', guarantee: '–', light: swatch(hex(stopAt(L, 3))), dark: swatch(hex(stopAt(D, 3))) },
        { token: 'wash-92', role: 'low-hierarchy fill, interaction, decorative', guarantee: '–', light: swatch(hex(stopAt(L, 4))), dark: swatch(hex(stopAt(D, 4))) },
        { token: 'wash-89', role: 'low-hierarchy fill, interaction, decorative', guarantee: '–', light: swatch(hex(stopAt(L, 5))), dark: swatch(hex(stopAt(D, 5))) },
        { token: 'wash-85', role: 'decorative', guarantee: '–', light: swatch(hex(stopAt(L, 6))), dark: swatch(hex(stopAt(D, 6))) },
        { token: 'wash-80', role: 'decorative', guarantee: '–', light: swatch(hex(stopAt(L, 7))), dark: swatch(hex(stopAt(D, 7))) },
        { token: 'mark-74-aa', role: 'non-text emphasis: borders, UI elements', guarantee: '3:1, on every paper', light: swatch(hex(stopAt(L, 8))), dark: swatch(hex(stopAt(D, 8))) },
        { token: 'ink-53-aa', role: 'emphasis fill and first text stop', guarantee: '4.5:1, on every paper', light: swatch(hex(stopAt(L, 9))), dark: swatch(hex(stopAt(D, 9))) },
        { token: 'ink-42-aa', role: 'mid text', guarantee: '6.5:1, on every paper', light: swatch(hex(stopAt(L, 10))), dark: swatch(hex(stopAt(D, 10))) },
        { token: 'ink-30-aaa', role: 'strong text, inverted fill', guarantee: '7:1, on every paper', light: swatch(hex(stopAt(L, 11))), dark: swatch(hex(stopAt(D, 11))) },
        { token: 'ink-0', role: 'universal anchor, mode-flipping constant, never resolved', guarantee: '–', light: swatch('#000000'), dark: swatch('#ffffff') },
        { token: 'abs-black', role: 'literal black pole, an alias target', guarantee: '–', light: swatch('#000000'), dark: swatch('#000000') },
        { token: 'abs-white', role: 'literal white pole, an alias target', guarantee: '–', light: swatch('#ffffff'), dark: swatch('#ffffff') },
        { token: 'abs-primary', role: "the primary's identity hex (re-homed from `identity`, Figma only)", guarantee: 'never adjusted', light: swatch(scale.identityHex!), dark: swatch(scale.identityHex!) },
        { token: 'abs-secondary', role: "the secondary's identity hex (the derived pastel shown here; a real secondary re-homes its own hex)", guarantee: 'never adjusted', light: swatch(defaultSecondarySeed(TOKEN_REF_HEX)), dark: swatch(defaultSecondarySeed(TOKEN_REF_HEX)) },
        { token: 'alpha/transparent', role: 'fully transparent', guarantee: '–', light: <SwatchCell {...alphaSwatch('#ffffff', 0)} />, dark: <SwatchCell {...alphaSwatch('#ffffff', 0)} /> },
        { token: 'alpha/scrim', role: 'modal / overlay scrim', guarantee: '–', light: <SwatchCell {...alphaSwatch('#000000', 0.6)} />, dark: <SwatchCell {...alphaSwatch('#000000', 0.6)} /> },
        { token: 'alpha/ink', role: 'the soft on-cta pole, at alpha (the neutral and default-style secondary)', guarantee: '–', light: <SwatchCell {...alphaSwatch('#000000', SOFT_ON_CTA_ALPHA.light)} />, dark: <SwatchCell {...alphaSwatch('#ffffff', SOFT_ON_CTA_ALPHA.dark)} /> },
        { token: 'alpha/offset-06', role: 'cta-border rung: the secondary', guarantee: '–', light: <SwatchCell {...alphaSwatch('#000000', OFFSET_ALPHAS[6])} />, dark: <SwatchCell {...alphaSwatch('#ffffff', OFFSET_ALPHAS[6])} /> },
        { token: 'alpha/offset-08', role: 'cta-border rung: the neutral', guarantee: '–', light: <SwatchCell {...alphaSwatch('#000000', OFFSET_ALPHAS[8])} />, dark: <SwatchCell {...alphaSwatch('#ffffff', OFFSET_ALPHAS[8])} /> },
        { token: 'alpha/offset-16', role: 'cta-border rung: the primary and the signals', guarantee: '–', light: <SwatchCell {...alphaSwatch('#000000', OFFSET_ALPHAS[16])} />, dark: <SwatchCell {...alphaSwatch('#ffffff', OFFSET_ALPHAS[16])} /> },
        { token: 'alpha/shadow-04', role: 'drop shadow, lightest', guarantee: '–', light: <SwatchCell {...alphaSwatch('#000000', 0.04)} />, dark: <SwatchCell {...alphaSwatch('#000000', 0.32)} /> },
        { token: 'alpha/shadow-08', role: 'drop shadow, mid', guarantee: '–', light: <SwatchCell {...alphaSwatch('#000000', 0.08)} />, dark: <SwatchCell {...alphaSwatch('#000000', 0.48)} /> },
        { token: 'alpha/shadow-12', role: 'drop shadow, strongest', guarantee: '–', light: <SwatchCell {...alphaSwatch('#000000', 0.12)} />, dark: <SwatchCell {...alphaSwatch('#000000', 0.64)} /> },
      ],
    },
    {
      register: 'semantic/', caption: 'A state-carrying role or a usage decision, never a raw value a designer should need to re-derive. Always visible in the picker.',
      rows: [
        { token: 'cta/enabled', role: "the pulled-out button fill, at the seed's own lightness", guarantee: "on-text passes WCAG 4.5; the fill clears APCA Lc 65 (critical 50)", light: swatch(hex(scale.cta)), dark: swatch(hex(scale.ctaDark)) },
        { token: 'cta/hover', role: 'hover state', guarantee: 'same law as cta/enabled', light: swatch(hex(scale.ctaHover)), dark: swatch(hex(scale.ctaHoverDark)) },
        { token: 'cta/pressed', role: 'pressed state', guarantee: 'same law as cta/enabled', light: swatch(hex(scale.ctaPressed)), dark: swatch(hex(scale.ctaPressedDark)) },
        { token: 'cta-ink/enabled', role: 'the text-style cta; pure alias → ink-53-aa', guarantee: '4.5:1, on every paper', light: swatch(hex(scale.ctaInk)), dark: swatch(hex(scale.ctaInkDark)) },
        { token: 'cta-ink/hover', role: 'alias → ink-42-aa', guarantee: '6.5:1, on every paper', light: swatch(hex(scale.ctaInkHover)), dark: swatch(hex(scale.ctaInkHoverDark)) },
        { token: 'cta-ink/pressed', role: 'alias → ink-30-aaa', guarantee: '7:1, on every paper', light: swatch(hex(scale.ctaInkPressed)), dark: swatch(hex(scale.ctaInkPressedDark)) },
        { token: 'cta-ink-strong/enabled', role: 'neutral only; the descending mirror, alias → ink-30-aaa', guarantee: '7:1, on every paper', light: alias(hex(stopAt(NL, 11)), '→ neutral ink-30-aaa'), dark: alias(hex(stopAt(ND, 11)), '→ neutral ink-30-aaa') },
        { token: 'cta-ink-strong/hover', role: 'neutral only; shares the between stop, alias → ink-42-aa', guarantee: '6.5:1, on every paper', light: alias(hex(stopAt(NL, 10)), '→ neutral ink-42-aa'), dark: alias(hex(stopAt(ND, 10)), '→ neutral ink-42-aa') },
        { token: 'cta-ink-strong/pressed', role: 'neutral only; alias → ink-53-aa', guarantee: '4.5:1, on every paper', light: alias(hex(stopAt(NL, 9)), '→ neutral ink-53-aa'), dark: alias(hex(stopAt(ND, 9)), '→ neutral ink-53-aa') },
        { token: 'cta/on', role: 'computed button text: solid pole on loud fills, pole-at-alpha .75/.80 on quiet fills (derived secondary, neutral)', guarantee: 'chosen by passing', light: swatch(onCtaColor(scale.onFillTextIsWhite)), dark: swatch(onCtaColor(scale.onFillTextIsWhiteDark)) },
        { token: 'cta/border', role: 'low-visibility stroke; transparent above the gate', guarantee: 'appears below APCA |Lc| 15 vs the page (taste, not accessibility)', light: borderCell('light'), dark: borderCell('dark') },
        { token: 'identity', role: 'the exact input hex, for logos', guarantee: 'never adjusted', light: swatch(scale.identityHex!), dark: swatch(scale.identityHex!) },
        { token: 'link/enabled', role: "hyperlinks; default (no custom seed) aliases the primary's cta-ink", guarantee: '4.5:1, on every paper', light: alias(hex(scale.ctaInk), '→ cta-ink'), dark: alias(hex(scale.ctaInkDark), '→ cta-ink') },
        { token: 'link/hover', role: 'default alias → cta-ink-hover', guarantee: '6.5:1, on every paper', light: alias(hex(scale.ctaInkHover), '→ cta-ink-hover'), dark: alias(hex(scale.ctaInkHoverDark), '→ cta-ink-hover') },
        { token: 'link/pressed', role: 'default alias → cta-ink-pressed', guarantee: '7:1, on every paper', light: alias(hex(scale.ctaInkPressed), '→ cta-ink-pressed'), dark: alias(hex(scale.ctaInkPressedDark), '→ cta-ink-pressed') },
        { token: 'surface/sink', role: 'the lowest elevation; always the NEUTRAL, never the themed family', guarantee: '–', light: alias(hex(stopAt(NL, 3)), '→ neutral paper-95'), dark: alias(hex(neutral.paper0Dark!), '→ neutral paper-100') },
        { token: 'surface/base', role: 'the page plane; always the NEUTRAL', guarantee: '–', light: alias(hex(stopAt(NL, 2)), '→ neutral paper-97'), dark: alias(hex(stopAt(ND, 1)), '→ neutral paper-99') },
        { token: 'surface/lift', role: 'raised (cards); always the NEUTRAL', guarantee: '–', light: alias(hex(stopAt(NL, 1)), '→ neutral paper-99'), dark: alias(hex(stopAt(ND, 2)), '→ neutral paper-97') },
        { token: 'surface/pop', role: 'the highest elevation; always the NEUTRAL', guarantee: '–', light: alias(hex(neutral.paper0!), '→ neutral paper-100'), dark: alias(hex(stopAt(ND, 3)), '→ neutral paper-95') },
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

// ── Naming anatomy: primitive/neutral/ink/53-aa, segment by segment ──────────
function NamingAnatomy() {
  const cols = [
    { seg: 'primitive', title: 'REGISTER', lines: ['panel grouping:', 'raw coded row', 'or worded row'] },
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
      <svg viewBox={`0 0 ${width} 190`} className="d2-anatomy" role="img" aria-label="Token path anatomy: primitive/neutral/ink/53-aa">
        {cols.map((c, i) => (
          <g key={c.seg}>
            <rect x={x(i)} y={boxY} width={colW} height={boxH} rx={8} className="d2-anatomy-box" />
            <text x={x(i) + colW / 2} y={boxY + boxH / 2 + 5} textAnchor="middle" className="d2-anatomy-seg">{c.seg}</text>
            {i < cols.length - 1 && (
              <text x={x(i) + colW + gap / 2} y={boxY + boxH / 2 + 5} textAnchor="middle" className="d2-anatomy-sep">
                {i === cols.length - 2 ? '-' : '/'}
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
        first two segments: <Code>ink-53-aa</Code>.
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
      <H2>The extended plugin's two groups</H2>
      <P>
        The extended plugin (Enterprise Figma) splits every variable into one of two
        groups in the picker:
      </P>
      <UL>
        <LI><b>primitive/</b>: one resolved color, no state, e.g. <Code>primitive/neutral/paper/99</Code>. Hidden from the color picker by default.</LI>
        <LI><b>semantic/</b>: a usage decision, e.g. <Code>semantic/brand-primary/cta/hover</Code> or <Code>semantic/surface/sink</Code>. Always visible.</LI>
      </UL>
      <P>
        A checkbox in the plugin ("Hide primitive variables") controls whether primitive/
        rows are hidden from every color picker in the file; semantic/ rows are always
        visible, since those are the names a designer should actually bind to. The setting
        is stored on the file and re-applied on every apply, so a hand-edited scope always
        reverts on the next run. See <Code>architecture.md</Code> §2d for the full
        mechanism, including how an older file's paths heal onto the new register.
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
        <LI><b>Requirements.</b> Declared floors bind after placement, in both modes: mark-74-aa
        at WCAG 3:1, ink-53-aa/42-aa/30-aaa at 4.5 / 6.5 / 7:1, each guaranteed on every paper
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
            <LI><Code>cta-ink</Code>, the text-style cta, aliases ink-53-aa/42-aa/30-aaa as its states.</LI>
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
        chroma curve, at three strengths.</LI>
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
        This is a real token, emitted by the engine right now: light <Code>mark-74-aa</Code>,
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
  border-right: 1px solid var(--border-subtle); background: var(--surface-sink);
  padding: 28px 16px; position: sticky; top: 0; align-self: start; height: 100%;
}
.d2-side-group { margin-bottom: 20px; }
.d2-side-link {
  display: block; width: 100%; text-align: left; border: none; background: none; cursor: pointer;
  font-family: inherit; font-size: 13.5px; color: var(--fg-subtle); padding: 6px 10px; border-radius: 7px;
}
.d2-side-link:hover { background: var(--surface-lift); color: var(--fg-default); }
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
.d2-code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.88em; background: var(--surface-sink); border: 1px solid var(--border-subtle); border-radius: 5px; padding: 1px 5px; }
.d2-pre {
  background: var(--surface-sink); border: 1px solid var(--border-subtle); border-radius: 10px;
  padding: 16px 18px; overflow-x: auto; margin: 0 0 18px;
}
.d2-pre code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; line-height: 1.6; color: var(--fg-default); white-space: pre; }
.d2-note { font-size: 13.5px; line-height: 1.6; color: var(--fg-subtle); background: var(--surface-sink); border: 1px solid var(--border-subtle); border-left: 3px solid var(--brand-ink-53-aa); border-radius: 8px; padding: 12px 14px; margin: 18px 0; }
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
.d2-table-subhead td { background: var(--surface-sink); font-weight: 600; color: var(--fg-default); padding: 8px 10px; font-size: 13px; }
.d2-table-subhead code { margin-right: 6px; }
.d2-swatch-cell { display: inline-flex; align-items: center; gap: 7px; white-space: nowrap; }
.d2-swatch { width: 15px; height: 15px; border-radius: 4px; border: 1px solid var(--border-subtle); flex-shrink: 0; display: inline-block; background-image: linear-gradient(45deg, var(--border-subtle) 25%, transparent 25%, transparent 75%, var(--border-subtle) 75%), linear-gradient(45deg, var(--border-subtle) 25%, transparent 25%, transparent 75%, var(--border-subtle) 75%); background-size: 6px 6px; background-position: 0 0, 3px 3px; }
.d2-anatomy { width: 100%; height: auto; max-width: 720px; display: block; margin: 8px 0 4px; }
.d2-anatomy-box { fill: var(--surface-lift); stroke: var(--border-default); stroke-width: 1; }
.d2-anatomy-seg { font: 600 15px ui-monospace, SFMono-Regular, Menlo, monospace; fill: var(--fg-default); }
.d2-anatomy-sep { font: 400 14px ui-monospace, SFMono-Regular, Menlo, monospace; fill: var(--fg-subtle); }
.d2-anatomy-leader { stroke: var(--border-subtle); stroke-width: 1; }
.d2-anatomy-title { font: 700 9.5px ui-sans-serif, system-ui, sans-serif; letter-spacing: 0.05em; fill: var(--fg-subtle); }
.d2-anatomy-cap { font: 400 10.5px ui-sans-serif, system-ui, sans-serif; fill: var(--fg-subtle); }
@media (max-width: 860px) {
  .d2 { grid-template-columns: 1fr; }
  .d2-side { position: static; height: auto; border-right: none; border-bottom: 1px solid var(--border-subtle); display: flex; gap: 16px; overflow-x: auto; padding: 16px; }
  .d2-side-group { margin-bottom: 0; }
  .d2-main { padding: 24px 0; }
}
`
