import React, { useState } from 'react'
import { generateScale } from '../../src/engine/colorEngine'
import { toHex } from '../../src/engine/cssRender'

// ─────────────────────────────────────────────────────────────────────────────
// In-app documentation: a sidebar docs site (Radix-style). Each article is a
// React component, so prose and LIVE engine output sit side by side — a code
// example can render a real generated ramp instead of a screenshot.
//
// TO ADD AN ARTICLE: write a `() => <>…</>` body using the prose primitives
// below (H2/H3/P/UL/Code/Pre/Note/Ramp), then add `{ slug, title, body }` to a
// section in SECTIONS. The sidebar and routing pick it up automatically.
// ─────────────────────────────────────────────────────────────────────────────

// ── Prose primitives ─────────────────────────────────────────────────────────
const H2 = ({ children }: { children: React.ReactNode }) => <h2 className="d2-h2">{children}</h2>
const H3 = ({ children }: { children: React.ReactNode }) => <h3 className="d2-h3">{children}</h3>
const P = ({ children }: { children: React.ReactNode }) => <p className="d2-p">{children}</p>
const UL = ({ children }: { children: React.ReactNode }) => <ul className="d2-ul">{children}</ul>
const LI = ({ children }: { children: React.ReactNode }) => <li>{children}</li>
const Code = ({ children }: { children: React.ReactNode }) => <code className="d2-code">{children}</code>
const Pre = ({ children }: { children: React.ReactNode }) => <pre className="d2-pre"><code>{children}</code></pre>
const Lead = ({ children }: { children: React.ReactNode }) => <p className="d2-lead">{children}</p>
const Note = ({ children }: { children: React.ReactNode }) => <div className="d2-note">{children}</div>

// ── Live example: a real generated ramp, computed by the engine ──────────────
const RAMP_GROUPS: Array<{ label: string; span: number }> = [
  { label: 'paper', span: 2 }, { label: 'wash', span: 5 },
  { label: 'highlight', span: 3 }, { label: 'ink', span: 2 },
]
function Ramp({ hex, caption }: { hex: string; caption?: React.ReactNode }) {
  const scale = generateScale(hex, 'docs', undefined, { highlight: true })
  return (
    <figure className="d2-ramp">
      <div className="d2-ramp-row">
        {scale.light.map(s => (
          <div key={s.stop} className="d2-ramp-cell" title={`stop ${s.stop} — ${toHex(s.r, s.g, s.b)}`}
            style={{ background: toHex(s.r, s.g, s.b) }} />
        ))}
      </div>
      <div className="d2-ramp-row d2-ramp-nums">
        {scale.light.map(s => <span key={s.stop}>{s.stop}</span>)}
      </div>
      <div className="d2-ramp-row d2-ramp-groups">
        {RAMP_GROUPS.map(g => <span key={g.label} style={{ flex: g.span }}>{g.label}</span>)}
      </div>
      <figcaption className="d2-ramp-cap">
        {caption ?? <>Live ramp generated from <Code>{hex.toUpperCase()}</Code> — these are the engine's actual outputs.</>}
      </figcaption>
    </figure>
  )
}

// ── Articles ─────────────────────────────────────────────────────────────────
type Article = { slug: string; title: string; body: () => React.ReactNode }
type Section = { label: string; articles: Article[] }

const overview: Article = {
  slug: 'overview',
  title: 'Overview',
  body: () => (
    <>
      <Lead>
        OKChroma is a color-system engine. Give it one (or two) brand colors and it generates a
        complete, accessible, theme-ready color system around them.
      </Lead>
      <P>
        The output is a 12-step light ramp and dark ramp with pre-reserved roles, a solid CTA
        resting/hover pair, a brand-tinted neutral ramp, and four status ramps (error, warning,
        success, info) — each kept legible and visually distinct. Your exact input hex is preserved
        in an identity swatch for logos and brand moments.
      </P>
      <P>
        The point is <b>white-label predictability</b>: every ramp's stops land at the same perceived
        lightness and play the same role, so you map your design tokens to step <i>numbers</i> once
        and they hold for any color. Contrast (WCAG, plus APCA for emphasis fills) is built into the
        math, not bolted on after.
      </P>
      <Ramp hex="#E93D82" />
      <H2>Getting the colors out</H2>
      <P>The same values ship in two interchangeable forms:</P>
      <UL>
        <LI><b>CSS custom properties</b> — a light and dark block per brand, consumed through a thin semantic alias layer.</LI>
        <LI><b>Figma variables</b> — written straight into a Figma file by the bundled plugin.</LI>
      </UL>
    </>
  ),
}

const install: Article = {
  slug: 'installation',
  title: 'Installation',
  body: () => (
    <>
      <Lead>Run the engine and demo locally.</Lead>
      <P>Requires Node 18+ and npm.</P>
      <Pre>{`npm install
npm run demo:build      # generate token CSS + bundle the demo
npx serve .             # open http://localhost:3000/demo/index.html`}</Pre>
      <P>Live editing: <Code>npm run dev</Code> (watch mode). Build the Figma plugin with <Code>npm run plugin:build</Code>, then import <Code>plugin/manifest.json</Code> in Figma.</P>
      <H3>Using the engine directly</H3>
      <P>The engine has zero runtime dependencies. Import the public surface and go from a hex to a token set:</P>
      <Pre>{`import { resolveBrand, brandCss } from './src'

const resolved = resolveBrand('#E93D82', 'Acme')
const css = brandCss('acme', 'Acme', resolved)`}</Pre>
      <Note>Full architecture and dependency notes live in <Code>docs/architecture.md</Code>.</Note>
    </>
  ),
}

const howItWorks: Article = {
  slug: 'how-it-works',
  title: 'How the engine works',
  body: () => (
    <>
      <Lead>
        One hex in, a full token set out — through one pure function, a policy layer, and an emitter.
      </Lead>

      <H2>The pipeline</H2>
      <P>
        <Code>resolveBrand(hex)</Code> is the entry point. It calls the pure <Code>generateScale</Code>{' '}
        to do the color math, then applies <b>policy</b> — checking the result against the four status
        colors and, on a collision, re-running generation with different settings. The resolved result
        goes to an <b>emitter</b> (CSS or Figma) that maps the computed stops onto named tokens and
        chooses light vs dark.
      </P>
      <Pre>{`hex
  → hexToOklch            decode to OKLCH (L, C, H)
  → classifyArchetype     bucket by lightness
  → build light ramp      stops 1–8, lightness solved for apparent brightness
  → fills + text          off-scale cta, contrast-floored ink-11/12
  → build dark ramp       stops 1–12, placed directly, chroma reduced
  → highlight stops 9/10
  → resolveBrand policy   collisions → maybe regenerate; signal shifts
  → emit                  cssRender / figmaRender → named tokens`}</Pre>
      <P>
        Light and dark are computed <i>together</i> and stored on one result; the mode is chosen at
        render time. The generator runs about six times per brand (brand, secondary, neutral, and the
        four cached signal scales).
      </P>

      <H2>The scale</H2>
      <P>
        Twelve stops, each with a reserved role and accessibility category, named in four groups:{' '}
        <Code>paper</Code> (surfaces), <Code>wash</Code> (low-hierarchy fills and borders),{' '}
        <Code>highlight</Code> (emphasis fills, with stop 8 carrying the 3:1 non-text guarantee), and{' '}
        <Code>ink</Code> (text). The brand's solid button fill, <Code>cta</Code>, sits off-scale,
        anchored to the brand's own lightness.
      </P>
      <Ramp hex="#005EB8" caption={<>The same 12 roles on a different brand — note how each stop still lands at the same perceived lightness.</>} />

      <H2>The design touches</H2>
      <P>These are the deliberate adjustments that make the output differentiated, accessible, and on-brand:</P>
      <UL>
        <LI><b>Warm hues stay warm.</b> Gold, orange, and yellow brands rotate their hue toward a fixed "gold spine" as they darken, so dark shades read gold instead of olive or brown.</LI>
        <LI><b>Red brands cool slightly.</b> A warm red rotates a few degrees cooler so a brand red can't be mistaken for the error red.</LI>
        <LI><b>Perceived lightness is solved, not assumed.</b> Saturated colors look brighter than gray at the same luminance (the Helmholtz–Kohlrausch effect), so the light ramp solves each stop's lightness to a common <i>apparent</i> target — every brand's stop&nbsp;9 reads the same.</LI>
        <LI><b>Dark mode is quieter.</b> Dark-mode chroma is pulled down so colors don't shout on a dark background, and too-dark fills lift just enough to stay visible — never the reverse.</LI>
        <LI><b>Contrast is structural.</b> Stop&nbsp;8 is clamped to WCAG 3:1, the text stops to 4.5:1 and 7:1, and each fill ships black-or-white text chosen by whichever passes.</LI>
        <LI><b>Signals stay distinct.</b> If a brand lands near a status color, the engine keeps them apart — darkening a red-family brand, or shifting the warning/success/info signal to a distinct variant.</LI>
      </UL>
      <Note>
        This article is a starting draft seeded from <Code>docs/architecture.md</Code>. Expand it freely —
        each section can grow, and you can drop in more live <Code>&lt;Ramp&gt;</Code> examples.
      </Note>
    </>
  ),
}

const SECTIONS: Section[] = [
  { label: 'Getting started', articles: [overview, install] },
  { label: 'Concepts', articles: [howItWorks] },
]

// ── Layout ───────────────────────────────────────────────────────────────────
export default function DocsSite({ dark: _dark }: { dark: boolean }) {
  const all = SECTIONS.flatMap(s => s.articles)
  const [slug, setSlug] = useState(all[0].slug)
  const active = all.find(a => a.slug === slug) ?? all[0]
  return (
    <div className="d2">
      <style>{DOCS2_CSS}</style>
      <aside className="d2-side">
        <nav>
          {SECTIONS.map(section => (
            <div key={section.label} className="d2-side-group">
              <div className="d2-side-label">{section.label}</div>
              {section.articles.map(a => (
                <button key={a.slug} className={`d2-side-link${a.slug === slug ? ' active' : ''}`} onClick={() => setSlug(a.slug)}>
                  {a.title}
                </button>
              ))}
            </div>
          ))}
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
  border-right: 1px solid var(--border-subtle); background: var(--surface-sunken);
  padding: 28px 16px; position: sticky; top: 0; align-self: start; height: 100%;
}
.d2-side-group { margin-bottom: 20px; }
.d2-side-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-subtle); margin: 0 10px 6px; }
.d2-side-link {
  display: block; width: 100%; text-align: left; border: none; background: none; cursor: pointer;
  font-family: inherit; font-size: 13.5px; color: var(--fg-subtle); padding: 6px 10px; border-radius: 7px;
}
.d2-side-link:hover { background: var(--surface-raised); color: var(--fg-default); }
.d2-side-link.active { background: var(--brand-bg-subtle); color: var(--fg-default); font-weight: 600; }
.d2-main { padding: 40px 0; min-width: 0; }
.d2-article { max-width: 720px; margin: 0 auto; padding: 0 32px; }
.d2-h1 { font-size: 32px; font-weight: 700; margin: 0 0 8px; letter-spacing: -0.01em; }
.d2-lead { font-size: 17px; line-height: 1.6; color: var(--fg-subtle); margin: 0 0 28px; }
.d2-h2 { font-size: 21px; font-weight: 700; margin: 36px 0 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border-subtle); }
.d2-h3 { font-size: 16px; font-weight: 700; margin: 26px 0 8px; }
.d2-p { font-size: 15px; line-height: 1.7; margin: 0 0 14px; }
.d2-ul { font-size: 15px; line-height: 1.7; margin: 0 0 14px; padding-left: 22px; }
.d2-ul li { margin-bottom: 8px; }
.d2-code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.88em; background: var(--surface-sunken); border: 1px solid var(--border-subtle); border-radius: 5px; padding: 1px 5px; }
.d2-pre {
  background: var(--surface-sunken); border: 1px solid var(--border-subtle); border-radius: 10px;
  padding: 16px 18px; overflow-x: auto; margin: 0 0 18px;
}
.d2-pre code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; line-height: 1.6; color: var(--fg-default); white-space: pre; }
.d2-note { font-size: 13.5px; line-height: 1.6; color: var(--fg-subtle); background: var(--surface-sunken); border: 1px solid var(--border-subtle); border-left: 3px solid var(--brand-highlight-9); border-radius: 8px; padding: 12px 14px; margin: 18px 0; }
.d2-ramp { margin: 22px 0 26px; }
.d2-ramp-row { display: flex; gap: 4px; }
.d2-ramp-cell { flex: 1; height: 46px; border-radius: 6px; border: 1px solid var(--border-subtle); }
.d2-ramp-nums { margin-top: 5px; font-size: 10px; color: var(--fg-subtle); }
.d2-ramp-nums span { flex: 1; text-align: center; }
.d2-ramp-groups { margin-top: 4px; font-size: 11px; font-weight: 600; color: var(--fg-subtle); }
.d2-ramp-groups span { text-align: center; }
.d2-ramp-cap { font-size: 12.5px; color: var(--fg-subtle); margin: 10px 0 0; }
@media (max-width: 860px) {
  .d2 { grid-template-columns: 1fr; }
  .d2-side { position: static; height: auto; border-right: none; border-bottom: 1px solid var(--border-subtle); display: flex; gap: 16px; overflow-x: auto; padding: 16px; }
  .d2-side-group { margin-bottom: 0; }
  .d2-main { padding: 24px 0; }
}
`
