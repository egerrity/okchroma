import React from 'react'
import { H2, H3, P, UL, LI, Code, Pre, Lead, Note, Table, A, DocLink } from '../prose'

export const slug = 'install'
export const title = 'Install and API'
export function Body() {
  return (
    <>
      <Lead>
        The engine is an npm package with no runtime dependencies. The demo and the Figma plugins call the
        same functions this page documents.
      </Lead>

      <H2>Install</H2>
      <Pre>{`npm install okchroma`}</Pre>
      <P>
        The package ships an ESM build, a CommonJS build and TypeScript declarations under one export, with{' '}
        <Code>import</Code> and <Code>require</Code> conditions. It writes base tokens only: the color families,
        the link rows and the two seeds. It writes no semantic tokens; the semantic tokens in the repo,{' '}
        <Code>demo/semantic.css</Code>, style the demo site. Its one library, helmlab, a perceptual distance
        metric the red collision solve uses, is bundled at build time, so the published package declares no
        dependency. Node 18 or later; no DOM.
      </P>

      <H2>The entry points</H2>
      <H3>Resolve a theme</H3>
      <Pre>{`import { resolveTheme } from 'okchroma'

const theme = resolveTheme({
  primaryHex: '#E93D82',
  name: 'acme',
  deriveSecondary: true,      // a quiet companion derived from the primary
})
// theme.themed         ResolvedBrand: the primary with the theme's final signal overrides merged in
// theme.secondary      ResolvedSecondary | null
// theme.signalOverrides, theme.notes`}</Pre>
      <P><Code>resolveTheme</Code> is the recommended entry. Its input:</P>
      <Table
        head={['field', 'type', 'meaning']}
        rows={[
          [<Code>primaryHex</Code>, 'string', 'the brand hex; the only required field'],
          [<Code>name</Code>, 'string', "a label carried on the scale; default 'brand'"],
          [<Code>primaryMode</Code>, <Code>'recommended' | 'exact'</Code>, 'exact ships the hex as the stamp fill and identity untouched, with on-fill enforcement off; the ramp and the signals still resolve'],
          [<Code>primaryArchetype</Code>, <Code>Archetype</Code>, 'pin the fill to one of the six lightness anchors (near-black, dark, rich, vivid, bright, light); turns the red collision solve off'],
          [<Code>secondaryHex</Code>, 'string | null', 'a secondary seed'],
          [<Code>secondaryStyle</Code>, <Code>'default' | 'outline' | 'exact'</Code>, "default: the ramp is your hex, the stamp trio is a tint of it; exact: everything is your hex; outline: exact with the fill re-expressed at emit (transparent fill, alpha hover, highlighter-26 edge)"],
          [<Code>secondaryArchetype</Code>, <Code>Archetype</Code>, 'the anchor, for the secondary'],
          [<Code>deriveSecondary</Code>, 'boolean', 'with no secondaryHex: derive one from the primary'],
          [<Code>style</Code>, <Code>'default' | 'deeper' | 'full-chroma'</Code>, 'deeper pushes semi-muted warm seeds toward the cream/brown envelope; full-chroma releases the vividness cap (API only, outside the guarantees)'],
          [<Code>apcaClearance</Code>, 'boolean', 'the stamp legibility booster (the fill is nudged until its text reads at APCA Lc 65); default on, off is for instruments'],
          [<Code>exact</Code>, 'boolean', 'legacy: applies exact to both families when the per-family modes are absent'],
        ]}
      />
      <H3>Emit CSS</H3>
      <Pre>{`import { brandCss, signalsCss, neutralTintHue } from 'okchroma'

const neutralH = neutralTintHue(theme.themed.scale.brandH)   // the neutral's tint hue: the primary's by default
const css = brandCss(
  'acme',                        // slug: the [data-brand] value
  'Acme',                        // display name (comment only)
  theme.themed,                  // ResolvedBrand
  theme.secondary?.scale ?? null,// GeneratedScale | null
  '',                            // note suffix (comment only)
  'default',                     // NeutralLevel: 'pure' | 'default' | 'medium' | 'branded'
  undefined,                     // reserved; leave undefined
  theme.secondary?.style,        // SecondaryStyle
  false,                         // ctaEscape: the neutral stamp escape for red collisions
  null,                          // linkHex: a custom link seed, else the link aliases the primary's pen stops
  true,                          // ctaBorder: the stamp edge gate, default on
  neutralH,
) + '\\n' + signalsCss()          // the brand-independent :root block, once per page`}</Pre>
      <P>
        In the page: put the CSS in a stylesheet, set <Code>data-brand="acme"</Code> on the element the theme applies to,
        and toggle <Code>data-theme="dark"</Code> on it for dark mode.
      </P>
      <UL>
        <LI><Code>signalsCss()</Code> is the same for every brand, so it is emitted once. In the repo, <Code>npm run generate</Code> writes it to <Code>dist/signals.css</Code>.</LI>
        <LI><Code>themeTokens</Code> returns the same values as one object per mode, every <Code>var()</Code> resolved.</LI>
        <LI><Code>neutralCss(selector, brandH, level)</Code> emits a neutral alone, for chrome that carries no brand.</LI>
        <LI><Code>neutralTintHue(primaryH, source?, secondaryH?, customHex?)</Code> resolves the neutral's tint hue: with no source, the primary's; <Code>'secondary'</Code> follows the secondary's hue; <Code>'custom'</Code> takes the hue of a hex.</LI>
      </UL>
      <P>
        Selectors, blocks and the P3 override are on the <DocLink page="output" section="modes-and-selectors">Output contract</DocLink> page.
      </P>
      <H3>Emit DTCG documents</H3>
      <Pre>{`import { themeTokens, tokensToDtcg } from 'okchroma'

const tokens = themeTokens({ slug: 'acme', brand: theme.themed, secondary: theme.secondary?.scale ?? null, secondaryStyle: theme.secondary?.style, neutralH })
const { light, dark } = tokensToDtcg(tokens)
// two Design Tokens Format Module 2025.10 documents on identical paths:
// { neutral: { 'paper-0': {...}, ..., 'stamp-0', 'stamp-1', 'stamp-2', 'stamp-edge', 'stamp-on' }, brand, 'brand-alt',
//   critical, warning, positive, info, link: { 'default-0', 'default-1', 'default-2', 'inverse-0', ... }, absolute: { brand, 'brand-alt' } }
// every token: { $type: 'color', $value: { colorSpace: 'srgb', components, alpha, hex } | '{brand.pencil-47}', $description }`}</Pre>
      <P>
        One document per mode, every base token once, with the same description the Figma variable carries. A path
        joined with hyphens is the CSS custom property; joined with slashes it is the Figma path. Values are the sRGB
        colors the CSS carries; where the CSS writes a reference the document writes the alias. The repo's{' '}
        <Code>npm run tokens:emit -- '#E93D82' acme</Code> writes both files, and <Code>docs/schema.md</Code> is the
        format's reference, including how the two modes join through a resolver document. A consumer whose paths
        start with the category passes <Code>{"tokensToDtcg(tokens, { rootGroup: 'color' })"}</Code>, or{' '}
        <Code>--root color</Code> to the script, and every path and alias gains that group in front.
      </P>
      <H3>Emit Figma variables</H3>
      <Pre>{`import { themeToFigma, SIGNALS, SIGNAL_SCALES } from 'okchroma'

const signals = SIGNALS.map(s => ({
  name: s.name,
  scale: theme.themed.signalOverrides.find(o => o.name === s.name)?.scale ?? SIGNAL_SCALES.get(s.name)!.scale,
}))
const { light, dark } = themeToFigma(theme.themed, {
  secondary: theme.secondary?.scale ?? null,
  secondaryStyle: theme.secondary?.style,
  neutralH,
  signals,
})
// light and dark are FigmaGroup trees on the same paths as the DTCG documents:
// { neutral, brand, 'brand-alt', critical, warning, positive, info, link: { default, inverse }, absolute }`}</Pre>
      <P>
        Each leaf is a color in the DTCG shape (<Code>{'{ $type: "color", $value: { colorSpace: "srgb", components, alpha, hex } }'}</Code>),
        its components the same 8-bit value as its hex. The extended Figma plugin flattens this tree into variable paths
        under the color group (<Code>color/brand/paper-1</Code>); the leaf order is the panel order.
      </P>
      <H3>The engine beneath the theme</H3>
      <UL>
        <LI><Code>resolveBrand(hex, name, opts)</Code>: one family with the signal policy (collisions, shifts, the red complement) but no secondary.</LI>
        <LI><Code>generateScale(hex, name, forcedArchetype, opts)</Code>: the pure scale, no signal policy. Returns a <Code>GeneratedScale</Code>: <Code>light[]</Code>, <Code>dark[]</Code>, the stamp trio per mode, the on-fill booleans, the poles, <Code>identityHex</Code>.</LI>
        <LI><Code>generateNeutralScale(brandH, level)</Code>: the neutral for a tint hue.</LI>
        <LI><Code>resolveLinkTrio(hex)</Code>, <Code>resolveLinkInverseTrio(hex)</Code>: the link steps from a seed, on papers and on pen-70 fills.</LI>
        <LI><Code>stopHex(stop)</Code>: the sRGB hex a stop ships as. The vocabulary (<Code>stopTokenName</Code>, <Code>STAMP_FILL</Code>, <Code>PAPER_0</Code>, <Code>linkPath</Code>, <Code>absolutePath</Code>) and the grammar (<Code>familyPath</Code>, <Code>cssVarName</Code>, <Code>figmaPathOf</Code>, <Code>tokenPathOf</Code>) are exported, so a consumer imports a name and a rename breaks its build at compile time.</LI>
        <LI><Code>describeToken(path)</Code> and <Code>describeDocument(path)</Code>: the description text of any row, as the Figma variable carries it and as the DTCG documents carry it (the same lines plus each claim's ground and a usage line).</LI>
      </UL>

      <H2>Run from source</H2>
      <Pre>{`git clone https://github.com/egerrity/okchroma && cd okchroma
npm install
npm run demo:build      # writes dist/signals.css and bundles the demo
npx serve .             # open http://localhost:3000/demo/index.html
npm run dev             # watch mode`}</Pre>
      <P>
        <Code>npm run typecheck</Code> runs the compiler. The audit scripts (<Code>npm run req:audit</Code>,{' '}
        <Code>npm run audit:guarantee</Code>, and the rest) are listed with what each proves on the{' '}
        <DocLink page="guarantees" section="how-it-is-verified">Guarantees</DocLink> page.
      </P>

      <H2>The Figma plugins</H2>
      <UL>
        <LI>
          OKChroma Extended is the shipped Figma plugin. It needs the Figma desktop app and a Figma Enterprise plan,
          because it writes extended variable collections: one collection with light and dark modes, and an extension
          per brand that overrides only what differs. Download and install steps:{' '}
          <A href="https://egerrity.github.io/okchroma/install.html">install page</A>. It builds from source with{' '}
          <Code>npm run plugin-ext:build</Code>.
        </LI>
        <LI>
          OKChroma (the community plugin, <Code>plugin/</Code>) is not offered for download. It has no rename table
          for the last scale change, so updating an installed copy would leave the old names in the file. It builds
          from source with <Code>npm run plugin:build</Code>; a fresh file gets the current shape.
        </LI>
      </UL>
      <Note>
        The demo is a preview of the engine's output. The product is the engine and what it writes.
      </Note>
    </>
  )
}
