import React, { useState } from 'react'
import { generateScale } from '../../src/engine/colorEngine'
import { stopHex } from '../../src/engine/cssRender'
import { emitDtcgRamp } from '../../src/reqtoken/dtcg'

// ─────────────────────────────────────────────────────────────────────────────
// In-app documentation: a sidebar docs site. Each article is a React component,
// so prose and LIVE engine output sit side by side — a code example can render
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
      <P>Each family ships this token set, in both modes:</P>
      <Table
        head={['Tokens', 'Role', 'Guarantee']}
        rows={[
          [<Code>paper-99 … paper-95</Code>, 'the page and card planes', ''],
          [<Code>wash-92 … wash-80</Code>, 'quiet fills and borders', ''],
          [<Code>mark-74-aa</Code>, 'non-text emphasis: borders, UI elements', 'WCAG 3:1 vs paper-95'],
          [<Code>ink-53-aa</Code>, 'emphasis fill and first text stop', 'WCAG 4.5:1 vs paper-97'],
          [<Code>ink-42-aa</Code>, 'mid text', 'WCAG 6.5:1 vs paper-97'],
          [<Code>ink-30-aaa</Code>, 'strong text', 'WCAG 7:1 vs paper-97'],
          [<Code>cta · cta-hover · cta-pressed</Code>, "the solid button fill and its states, at the seed's own lightness", 'on-text passes WCAG 4.5; the fill clears APCA Lc 65 (critical 50)'],
          [<Code>cta-ink (+hover / pressed)</Code>, 'the text-style cta', 'aliases ink-53-aa/42-aa/30-aaa'],
          [<Code>cta-border</Code>, 'low-visibility stroke; transparent above the gate', 'appears below APCA |Lc| 15 vs the page'],
          [<Code>on-cta</Code>, 'computed black or white button text', 'chosen by passing; at alpha on quiet fills'],
          [<Code>identity</Code>, 'the exact input hex, for logos', 'never adjusted'],
          [<Code>paper-100 · ink-0</Code>, 'scheme anchors past the scale ends', 'mode-flipped extremes'],
        ]}
      />
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
        at WCAG 3:1 vs paper-95, ink-53-aa/42-aa/30-aaa at 4.5 / 6.5 / 7:1 vs paper-97. A placement that
        already clears does not move. An unmeetable floor marks the stop{' '}
        <Code>unresolvable</Code> instead of fudging.</LI>
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
@media (max-width: 860px) {
  .d2 { grid-template-columns: 1fr; }
  .d2-side { position: static; height: auto; border-right: none; border-bottom: 1px solid var(--border-subtle); display: flex; gap: 16px; overflow-x: auto; padding: 16px; }
  .d2-side-group { margin-bottom: 0; }
  .d2-main { padding: 24px 0; }
}
`
