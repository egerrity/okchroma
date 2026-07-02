import React, { useState } from 'react'
import { generateScale } from '../../src/engine/colorEngine'
import { toHex } from '../../src/engine/cssRender'
import { emitDtcgRamp } from '../../src/reqtoken/dtcg'

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
const Table = ({ head, rows }: { head: React.ReactNode[]; rows: React.ReactNode[][] }) => (
  <table className="d2-table">
    <thead><tr>{head.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
    <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
  </table>
)

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
      <div className="d2-ramp-brackets">
        {RAMP_GROUPS.map(g => (
          <div key={g.label} className="d2-ramp-grp" style={{ gridColumn: `span ${g.span}` }}>
            <div className="d2-ramp-brk" />
            <span>{g.label}</span>
          </div>
        ))}
      </div>
      <figcaption className="d2-ramp-cap">
        {caption ?? <>Live ramp generated from <Code>{hex.toUpperCase()}</Code> — these are the engine's actual outputs.</>}
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

// Several brand colors through the engine, stacked — read down any column and
// every hue sits at the same lightness. The OKLCH consistency argument, shown.
const OKLCH_DEMO_HUES = ['#C61D1B', '#E08A1E', '#2E9E3F', '#0BA5C0', '#2C5FC9', '#9B3DBC']
function HueGrid() {
  return (
    <figure className="d2-huegrid">
      <div className="d2-huegrid-rows">
        {OKLCH_DEMO_HUES.map(hex => {
          const scale = generateScale(hex, 'docs', undefined, { highlight: true })
          return (
            <div className="d2-huegrid-row" key={hex}>
              {scale.light.map(s => (
                <div key={s.stop} className="d2-huegrid-cell" title={`${hex} — stop ${s.stop} — ${toHex(s.r, s.g, s.b)}`}
                  style={{ background: toHex(s.r, s.g, s.b) }} />
              ))}
            </div>
          )
        })}
      </div>
      <figcaption className="d2-ramp-cap">
        Six different brand colors through the same engine. Read <i>down</i> any column — every hue
        lands at the same lightness. That cross-hue consistency is what OKLCH makes possible.
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
        Every token is a <b>requirement the engine solves</b>, not a frozen value. A pure-data
        declaration (<Code>spec.ts</Code>) states each stop's producer and its requirements; a
        resolver executes it per seed. <Code>resolveBrand(hex)</Code> is the entry point: it runs the
        engine, then applies <b>policy</b> — checking the result against the four status colors and,
        on a collision, re-running generation with different settings. The resolved result goes to
        an <b>emitter</b> (CSS or Figma) that maps the resolved stops onto named tokens and chooses
        light vs dark.
      </P>
      <Pre>{`hex + declaration (spec.ts)
  → produce   hue (warm drift) → chroma (ladder) → lightness (apparent-brightness solve)
  → require   declared floors bind: contrast (3:1 / 4.5 / 7 both modes),
              seam separation (paper-2 ≥ 0.028, wash seams ≥ 0.012), on-text rules
  → refine    chroma yields to gamut
  → roles     off-scale cta / cta-hover (anchored to the brand's own lightness)
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
        <Code>paper</Code> (backgrounds), <Code>wash</Code> (low-hierarchy fills and borders),{' '}
        <Code>highlight</Code> (emphasis fills, with stop 8 carrying the 3:1 non-text guarantee), and{' '}
        <Code>ink</Code> (text). The brand's solid button fill, <Code>cta</Code>, is an off-scale
        role — never a numbered stop — anchored to the brand's own lightness.
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

const whyOklch: Article = {
  slug: 'why-oklch',
  title: 'Why OKLCH',
  body: () => (
    <>
      <Lead>The engine reasons about color in OKLCH and converts to sRGB only at the very end.</Lead>
      <P>
        OKLCH describes a color with three numbers you can reason about directly: <b>L</b>ightness
        (0 black → 1 white), <b>C</b>hroma (0 is gray), and <b>H</b>ue (degrees). It is perceptually
        uniform — equal number-steps look like equal visual steps. Hex and RGB are not: equal RGB
        increments look uneven, and nudging "lightness" in RGB drags the hue along with it.
      </P>
      <P>
        Because lightness is its own axis, the engine can place every step at the same lightness on{' '}
        <i>every</i> hue — so a given step plays the same role no matter the brand color, and each
        ramp still holds one hue from light to dark.
      </P>
      <HueGrid />
      <P>
        It also makes the accessibility math possible. Gamut clamping reduces chroma at a fixed L and H
        to stay inside sRGB (<Code>clampChromaToGamut</Code>); per-channel RGB clipping would instead
        skew the hue, turning a saturated yellow into khaki. Code: <Code>src/engine/constraints.ts</Code>.
      </P>
    </>
  ),
}

const warmHues: Article = {
  slug: 'warm-hues',
  title: 'Warm hues & the gold spine',
  body: () => (
    <>
      <Lead>Gold, orange, and yellow brands rotate their hue toward a fixed "gold spine" as they darken — so dark shades stay gold instead of going olive or brown.</Lead>
      <P>
        In sRGB, holding a warm hue exactly while lightness drops is what makes it muddy: dark orange
        at its own hue is brown; dark yellow is olive. Keeping a gold brand looking gold at the dark end
        means <i>not</i> keeping its literal hue there.
      </P>
      <P>
        So the engine defines a <b>gold spine</b> — the clean warm hue at each lightness, running from a
        light yellow-green (~110°) down to a dark gold (~47°). Warm stops drift toward it with partial,
        capped travel: only inside the warm band (hue ≈ 40–122°), at 55% of the spine's swing, capped at
        ±24°. Outside the band — reds, greens, blues — it does nothing.
      </P>
      <H3>Relative, not absolute</H3>
      <P>
        A brand isn't snapped onto the spine; it borrows the spine's <i>shape</i> relative to its own
        hue. How much it takes is weighted by a gaussian of how far the brand sits from the spine
        (σ ≈ 20°): an on-path gold takes the full swing, while a near-neutral or off-path warm color
        takes a softened version and keeps its own identity.
      </P>
      <P>
        The result: the solid CTA fill keeps the brand's exact hue, the light tints lean a touch
        yellow-green, and the dark stops rotate toward gold. The same machinery runs the light ramp, the
        dark ramp, and illustrations.
      </P>
      <Ramp hex="#B18D0B" caption={<>A gold brand: light tints lean yellow-green, the depths rotate toward gold — no olive.</>} />
      <P>Code: <Code>goldSpineHue</Code> / <Code>torsionedHue</Code> / <Code>lightHueAt</Code> in <Code>colorEngine.ts</Code>; <Code>GOLD_SPINE</Code> and <Code>WARM_TORSION</Code> in <Code>stopTable.ts</Code>.</P>
    </>
  ),
}

const collisions: Article = {
  slug: 'collisions',
  title: 'Collisions & signals',
  body: () => (
    <>
      <Lead>The engine reserves four signal colors — red, yellow, green, info — named by identity. A brand that lands too close to one is kept distinct, so a brand element is never mistaken for a status.</Lead>
      <H2>Detecting a collision</H2>
      <P>Two gates must both trip:</P>
      <UL>
        <LI><b>Hue gate</b> — the brand hue is within 30° of the signal's hue (same family).</LI>
        <LI><b>Distance gate</b> — the OKLab ΔE between the two rendered fills is below threshold. This lets a dark maroon pass red: same family, but far enough apart in lightness that no one confuses the fills.</LI>
      </UL>
      <P>
        It runs per mode. Dark mode pins each fill's lightness, so a color can be clear in light and
        collide in dark — the dark threshold is therefore stricter (0.10 vs 0.16). Code:{' '}
        <Code>checkCollision</Code> in <Code>collision.ts</Code>.
      </P>
      <H2>Resolving a collision</H2>
      <P>There's no choice ladder — resolution is automatic, and split by which signal is involved.</P>
      <H3>Red → the brand yields</H3>
      <P>
        Red carries destructive meaning, so the brand gives way, never the reverse. A brand in the red
        band (hue 12–35.5°) re-anchors to the <b>dark</b> archetype and cools a few degrees, so its solid
        fill can't be confused with the error red — the hue is kept, the lightness moves. A red-adjacent
        brand <i>outside</i> the band ships as-is, but destructive controls are flagged to use
        outline-plus-icon styling instead of a solid red fill. In dark mode a colliding fill floats to a
        softer pastel.
      </P>
      <H3>Yellow / green / info → the signal yields</H3>
      <P>
        Here the brand is untouched; the <i>signal</i> swaps to a distinct variant, chosen by which side
        of a per-signal hue split the brand sits on:
      </P>
      <Table
        head={['Signal', 'Split', 'Brand below split', 'Brand at/above']}
        rows={[
          [<Code>yellow</Code>, '96°', 'shift to lemon', 'keep amber'],
          [<Code>green</Code>, '147°', 'teal-side', 'yellow-side'],
          [<Code>info</Code>, '273°', 'magenta', 'blue'],
        ]}
      />
      <P>
        Red never shifts — it is the reference everything else is kept distinct from. And the signal
        swaps are <b>output-only</b>: they change the emitted signal scale but never re-enter an engine
        decision, so a shift can't cascade into a new collision. Code: <Code>resolve.ts</Code>,{' '}
        <Code>signalShift.ts</Code>, <Code>collision.ts</Code>.
      </P>
    </>
  ),
}

const exactMode: Article = {
  slug: 'exact-mode',
  title: 'Exact mode & overrides',
  body: () => (
    <>
      <Lead>Two per-brand escape hatches for when the engine's defaults aren't what the brand owner wants.</Lead>
      <H3>Exact mode</H3>
      <P>
        Ships the literal hex and skips <i>every</i> recommended-mode adjustment — no collision
        resolution, no warm-red cooling, no contrast darkening. Use it when brand guidelines demand the
        exact color; accessibility then becomes your review, not the engine's guarantee.
      </P>
      <H3>Archetype override</H3>
      <P>
        Lets the brand owner pick the collision-resolution direction (the rung-1 archetype) instead of
        the one the engine would choose automatically.
      </P>
      <P>Both are flags read by <Code>{`resolveBrand(hex, name, { exact, archetypeOverride, style })`}</Code> — see <Code>resolve.ts</Code> and <Code>brands.ts</Code>.</P>
    </>
  ),
}

const styleLever: Article = {
  slug: 'style-lever',
  title: 'The style lever',
  body: () => (
    <>
      <Lead>A per-brand dial — default, deeper, or full-chroma — set by a person at intake.</Lead>
      <P>
        Some semi-muted warm brands (a muted gold) can resolve two legitimate ways: stay vivid, or lean
        into a browner, deeper register. Geometry alone can't choose — it's a taste call — so a human
        sets the direction instead of the engine guessing.
      </P>
      <P>
        <Code>deeper</Code> pushes the brand toward the cream/brown envelope, but <i>only</i> inside the
        ambiguous semi-muted warm band (hue ≈ 55–100°, mid mutedness); it's a no-op everywhere else, so a
        blue or a vivid red ignores it entirely. <Code>full-chroma</Code> is plumbed but not yet wired to
        the math.
      </P>
      <P>Code: the <Code>style</Code> flag in <Code>brands.ts</Code>, the deeper band gate in <Code>producers.ts</Code>.</P>
    </>
  ),
}

const tokenSchema: Article = {
  slug: 'token-schema',
  title: 'The token schema',
  body: () => (
    <>
      <Lead>A token is a requirement the engine solves — not a frozen value.</Lead>
      <P>
        Every emitted token carries two things at once: a frozen color any DTCG tool can read
        (<Code>$value</Code>), and the live <b>requirement</b> that produced it
        (<Code>$extensions["org.okchroma.requirement"]</Code>). A requirement-aware resolver ignores
        the frozen value and re-solves from the requirement; everything else uses the fallback. Edit
        the requirement in the file — raise a contrast target, tighten a seam — and the resolver
        honors the edit.
      </P>
      <P>
        This is a real token, emitted by the engine <i>right now</i> — light <Code>paper-2</Code>,
        carrying its minimum-separation requirement against paper-1:
      </P>
      <LiveToken hex="#3060C0" tokenKey="2" mode="light"
        caption={<>Live output of <Code>emitDtcgRamp('#3060C0', 'light')</Code>. The <Code>produce</Code> block names the producers (perceptual placement, warm drift, chroma ladder); the <Code>require</Code> block is the declared floor.</>} />
      <H2>Stops and roles</H2>
      <P>
        Scale stops are keyed by <b>number</b> (0–12, where 0 is the resolved paper anchor beyond
        paper-1). The cta is not a stop: it's an off-scale <b>role</b>, keyed by <b>name</b> —
        <Code>cta</Code> / <Code>cta-hover</Code> — so it can never be confused with a scale
        position again. Roles anchor to the brand's own hue and lightness (floored in dark, so a
        fill lifts but never sinks):
      </P>
      <LiveToken hex="#3060C0" tokenKey="cta" mode="dark"
        caption={<>The dark <Code>cta</Code> role: <Code>hue: constant</Code> (the brand's own hue, no drift), <Code>L: anchor</Code> with <Code>floorL</Code> — the "lift, never sink" rule.</>} />
      <H2>The rules in one breath</H2>
      <UL>
        <LI><b>A requirement is a floor.</b> A placement that already clears it doesn't move, byte for byte.</LI>
        <LI><b>Requirements reference resolved stops.</b> Push paper-2 darker and everything declared against it (stop-8's 3:1, the text floors, the wash seams) re-solves automatically.</LI>
        <LI><b>Fail loud.</b> An unmeetable requirement marks the stop <Code>unresolvable</Code>; a foreign resolver id is rejected — never guessed at.</LI>
        <LI><b>Producers are names, not formulas.</b> The perceptual math lives behind the versioned <Code>resolver</Code> id; the token file stays pure intent.</LI>
      </UL>
      <Note>
        The full field-by-field reference — every producer name, both require variants, the on-color
        rules, resolution semantics — is in <Code>docs/schema.md</Code> in the repo.
      </Note>
    </>
  ),
}

const SECTIONS: Section[] = [
  { label: 'Getting started', articles: [overview, install] },
  { label: 'Concepts', articles: [howItWorks, tokenSchema, whyOklch, warmHues, collisions] },
  { label: 'Overrides', articles: [exactMode, styleLever] },
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
.d2-ramp-brackets { display: grid; grid-template-columns: repeat(12, 1fr); gap: 4px; margin-top: 6px; }
.d2-ramp-grp { display: flex; flex-direction: column; align-items: center; min-width: 0; }
.d2-ramp-brk { width: 100%; height: 6px; border: 1px solid var(--border-default); border-top: none; border-radius: 0 0 5px 5px; }
.d2-ramp-grp span { margin-top: 5px; font-size: 11px; font-weight: 600; color: var(--fg-subtle); }
.d2-ramp-cap { font-size: 12.5px; color: var(--fg-subtle); margin: 10px 0 0; }
.d2-table { width: 100%; border-collapse: collapse; font-size: 14px; margin: 0 0 16px; }
.d2-table th { text-align: left; font-weight: 600; color: var(--fg-subtle); border-bottom: 1px solid var(--border-subtle); padding: 8px 10px; }
.d2-table td { border-bottom: 1px solid var(--border-subtle); padding: 8px 10px; vertical-align: top; }
.d2-huegrid { margin: 22px 0 26px; }
.d2-huegrid-rows { display: flex; flex-direction: column; gap: 4px; }
.d2-huegrid-row { display: grid; grid-template-columns: repeat(12, 1fr); gap: 4px; }
.d2-huegrid-cell { height: 32px; border-radius: 5px; border: 1px solid var(--border-subtle); }
@media (max-width: 860px) {
  .d2 { grid-template-columns: 1fr; }
  .d2-side { position: static; height: auto; border-right: none; border-bottom: 1px solid var(--border-subtle); display: flex; gap: 16px; overflow-x: auto; padding: 16px; }
  .d2-side-group { margin-bottom: 0; }
  .d2-main { padding: 24px 0; }
}
`
