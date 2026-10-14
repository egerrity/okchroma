import React from 'react'
import { H2, H3, P, UL, LI, Code, Pre, Lead, Table, DocLink, K } from '../prose'
import { NamingAnatomy, RampSet, FamilyRoster, SystemRoster, CssSample, FigmaTree, REF_SEED } from '../figures'
import { ROOT_L_LIGHT, ROOT_L_DARK, STOP_8_NONTEXT_CONTRAST, PENCIL_9_CONTRAST, PEN_10_CONTRAST } from '../../../src/engine/stopTable'
import { PAPER0_DARK_ROOT_L, MODE_SPECS } from '../../../src/engine/requirements/spec'
import { stopTokenName, PAPER_0, PEN_100, SCALE_STOP_COUNT, STAMP_FILL, STAMP_FILL_HOVER, STAMP_FILL_PRESSED, STAMP_EDGE, STAMP_ON } from '../../../src/engine/tokenNames'
import { FAMILY, CSS_FAMILY } from '../../../src/engine/tokenDescriptions'
import { SIGNALS } from '../../../src/engine/signals'
import { CTA_BORDER_LC_FLOOR, OFFSET_ALPHAS, ctaBorderRung, P3_SUPPORTS, P3_MEDIA } from '../../../src/engine/cssRender'
import { SOFT_ON_CTA_ALPHA } from '../../../src/engine/resolve'
import { describeParts } from '../figures'

export const slug = 'output'
export const title = 'Output contract'

const stops = Array.from({ length: SCALE_STOP_COUNT }, (_, i) => i + 1)
const CO_LC = MODE_SPECS.light.ons.onFill.coEnforceLc!

export function Body() {
  return (
    <>
      <Lead>
        The output is a fixed set of base-token names whose values move per brand and per mode: seven color
        families, the link rows and the two seeds. This page says what each name means, where each output
        writes it, and what it looks like.
      </Lead>

      <H2>Reading a name</H2>
      <NamingAnatomy />
      <P>
        The instrument word is the job; the number is 100 minus the light-mode lightness target, so a bigger
        number is a stronger color. A name carries no conformance word: the WCAG level a stop clears is a line
        in its description and a claim on the <DocLink page="guarantees">Guarantees</DocLink> page.
      </P>

      <H2>The bands</H2>
      <P>
        The scale has five bands, and the brand identity two instruments beside it. A band is a job; a stop is a
        lightness within it, the same job at a different strength.
      </P>
      <RampSet />
      <Table
        head={['band', 'role', 'paired with', 'contrast minimum guaranteed']}
        rows={[
          ['paper', 'background; the ground the contrast bands are measured against', 'highlighter, pencil, pen', <>none of its own; it is the ground the others clear: the highlighter at <K v={STOP_8_NONTEXT_CONTRAST} d={1} />:1, the pencil and the pens at <K v={PENCIL_9_CONTRAST} d={1} />:1</>],
          ['chalk', 'decorative border, illustration, ground for inverted text; never text', 'pen', <>none of its own; the pens clear it at <K v={PEN_10_CONTRAST} d={1} />:1</>],
          ['highlighter', 'focus ring, icon, border, large text; at a translucency, the state layer', 'paper', <><K v={STOP_8_NONTEXT_CONTRAST} d={1} />:1, AA large text and UI elements</>],
          ['pencil', 'regular text; the emphasis fill', <>paper; as a fill, <Code>{PAPER_0}</Code></>, <><K v={PENCIL_9_CONTRAST} d={1} />:1</>],
          ['pen', 'text; inverted background', 'paper, chalk', <><K v={PEN_10_CONTRAST} d={1} />:1, both directions</>],
          ['stamp', 'maximum brand expression: the fill closest to the brand color, at rest and at one and two steps; its edge; its text', <>itself (<Code>{STAMP_ON}</Code>); the edge, against the page</>, <>within the family: <Code>{STAMP_ON}</Code> at <K v={PENCIL_9_CONTRAST} d={1} />:1 on each fill, and the fill moves until the text clears Lc <K v={CO_LC} d={0} />. None against a ground; the edge adds legibility there and the fill keeps its color</>],
          ['link', 'link text at rest, one step and two steps from rest', 'default: paper; inverse: pen', <><K v={PENCIL_9_CONTRAST} d={1} />:1 on its ground</>],
        ]}
      />

      <H2>The scale, per family</H2>
      <P>
        Every family carries these <K v={SCALE_STOP_COUNT} d={0} /> stops. The lightness targets are the ladders
        the solver starts from; the emitted lightness differs per hue, so the number names the target and the
        value is solved. The conformance column is the line the plugin writes in the description.
      </P>
      <Table
        head={['token', 'index', 'light target', 'dark target', 'conformance']}
        rows={[
          [<Code>{PAPER_0}</Code>, '0', <K v={1} />, <K v={PAPER0_DARK_ROOT_L} />, ''],
          ...stops.map(i => {
            const name = stopTokenName(i)
            const d = describeParts(`${FAMILY.brandPrimary}/${name}`)
            return [<Code>{name}</Code>, String(i), <K v={ROOT_L_LIGHT[i]} />, <K v={ROOT_L_DARK[i]} />, d.conformance ?? '']
          }),
          [<Code>{PEN_100}</Code>, '12', <K v={0} />, <K v={1} />, describeParts(`${FAMILY.neutral}/${PEN_100}`).conformance ?? ''],
        ]}
      />
      <P>
        Two facts for an integrator: <Code>{PAPER_0}</Code> and <Code>{PEN_100}</Code> flip with the mode and exist under the
        neutral only, and <Code>{stopTokenName(9)}</Code> is both the first text stop and the emphasis fill (its on-text is{' '}
        <Code>{PAPER_0}</Code>, which clears <K v={PENCIL_9_CONTRAST} d={1} />:1 against it by construction).
      </P>

      <H2>The stamp rows</H2>
      <P>
        Every family carries a stamp off the scale: the solid fill and what sits on it. The five rows sit flat in
        the family in every output, and each name is a position: the fill at rest, one step from rest, two steps
        from rest, the edge, the text. A semantic layer names the states and aliases the steps.
      </P>
      <Table
        head={['token', 'what it is', 'rule']}
        rows={[
          [<Code>{STAMP_FILL}</Code>, 'the solid button fill at rest', "the seed's own lightness and hue, moved only by the on-fill law, the legibility booster, and the red collision solve; floored in dark so it lifts"],
          [<Code>{STAMP_FILL_HOVER}</Code>, 'the fill one step from rest', "a flat lightness step away from the mode's ground (toward black in light, white in dark), reversed for a fill with no room in that direction"],
          [<Code>{STAMP_FILL_PRESSED}</Code>, 'the fill two steps from rest', 'the same direction, twice the step'],
          [<Code>{STAMP_EDGE}</Code>, 'a low-visibility stroke', <>the page-polarity pole (black in light, white in dark) at the family's rung (primary and signals <K v={OFFSET_ALPHAS[ctaBorderRung('brand')]} pct d={0} />, secondary <K v={OFFSET_ALPHAS[ctaBorderRung(CSS_FAMILY.brandSecondary)]} pct d={0} />, neutral <K v={OFFSET_ALPHAS[ctaBorderRung(CSS_FAMILY.neutral)]} pct d={0} />) when the fill reads under APCA |Lc| <K v={CTA_BORDER_LC_FLOOR} d={0} /> against the page; otherwise transparent. A literal in every output. Always render it, so layout never shifts</>],
          [<Code>{STAMP_ON}</Code>, 'the text over the fill', <>white or black, whichever passes; quiet fills (the neutral, and a secondary whose composite stays legal on every state) carry the pole at alpha, <K v={SOFT_ON_CTA_ALPHA.light} pct d={0} /> light / <K v={SOFT_ON_CTA_ALPHA.dark} pct d={0} /> dark</>],
        ]}
      />
      <P>
        The text-style action has no separate tokens: it is the three text stops read as steps (rest{' '}
        <Code>{stopTokenName(9)}</Code>, one step <Code>{stopTokenName(10)}</Code>, two steps <Code>{stopTokenName(11)}</Code>).
        The seeds ship as given under <Code>absolute/brand</Code> and <Code>absolute/brand-alt</Code>: reference values, not UI colors.
      </P>

      <H2>Families and prefixes</H2>
      <Table
        head={['family', 'Figma path word', 'CSS prefix', 'what seeds it']}
        rows={[
          [FAMILY.neutral, <Code>{FAMILY.neutral}/</Code>, <Code>--{CSS_FAMILY.neutral}-</Code>, 'a near-gray at the tint hue (the primary’s, the secondary’s, or a custom hex’s), at one of four strengths'],
          ['brand (primary)', <Code>{FAMILY.brandPrimary}/</Code>, <Code>--{CSS_FAMILY.brandPrimary}-</Code>, 'the primary hex'],
          ['brand-alt (secondary)', <Code>{FAMILY.brandSecondary}/</Code>, <Code>--{CSS_FAMILY.brandSecondary}-</Code>, 'the secondary hex, or the derived companion; mirrors the brand when there is none'],
          ...SIGNALS.map(s => [`${s.emitName} (${s.name})`, <Code>{s.emitName}/</Code>, <Code>--{s.emitName}-</Code>, <>the canonical seed <Code>{s.hex}</Code>, shifted per brand only to stay distinct from it</>]),
        ]}
      />
      <P>
        The engine names the signals by identity (red, yellow, green, blue); both emitters write them under their role
        names, so a future re-pointing of a role keeps the emitted name.
      </P>

      <H2>The grammar</H2>
      <P>A name is a group and a leaf:</P>
      <Pre>{`group/leaf`}</Pre>
      <P>
        The group is a family, <Code>link</Code>, or <Code>absolute</Code>. The leaf names a position, never a state;
        a consumer's semantic layer names the states and aliases the positions.
      </P>
      <Table
        head={['leaf', 'pattern', 'example']}
        rows={[
          ['a scale stop', <Code>{'{instrument}-{number}'}</Code>, <Code>pen-58</Code>],
          ['a stamp fill', <Code>{'stamp-{step}'}</Code>, <Code>{STAMP_FILL}</Code>],
          ["the stamp's edge and text", <><Code>{STAMP_EDGE}</Code>, <Code>{STAMP_ON}</Code></>, <Code>{STAMP_ON}</Code>],
          ['a link', <><Code>{'{posture}-{step}'}</Code>, the postures <Code>default</Code> and <Code>inverse</Code></>, <Code>default-1</Code>],
          ['a seed', 'the family word', <Code>brand-alt</Code>],
        ]}
      />
      <P>
        On the scale (paper, chalk, highlighter, pencil, pen) the number is 100 minus the light-mode lightness
        target, so a bigger number is a stronger color. In the brand identity (stamp, link) the number is the
        step from rest: 0 at rest, 1 one step away, 2 two steps. Each output spells the same name its own way:
      </P>
      <Table
        head={['output', 'spelling', <><Code>brand/stamp-0</Code> becomes</>]}
        rows={[
          ['CSS custom property', <Code>--group-leaf</Code>, <Code>--brand-stamp-0</Code>],
          ['Figma variable', <><Code>group/leaf</Code>; the extended plugin writes it under <Code>color/</Code></>, <Code>color/brand/stamp-0</Code>],
          ['DTCG token', <>nested as <Code>group.leaf</Code>, referenced as <Code>{'{group.leaf}'}</Code>; <Code>rootGroup: 'color'</Code> nests it under <Code>color</Code></>, <Code>{'{brand.stamp-0}'}</Code>],
        ]}
      />
      <P>
        Nothing else is emitted. The semantic layer is the consumer's to write on these base tokens; the demo's
        own is <Code>demo/semantic.css</Code>.
      </P>

      <H2 id="modes-and-selectors">Modes and selectors</H2>
      <H3>CSS</H3>
      <Pre>{`[data-brand="acme"] { … }                        /* light: the neutral's poles, then every family's rows, the link trios, the seeds */
[data-brand="acme"][data-theme="dark"] { … }     /* dark: the same names, dark values */
:root { … }                                      /* signalsCss: the four canonical signal families */
:root[data-theme="dark"], [data-theme="dark"] { … }
${P3_SUPPORTS} {
${P3_MEDIA} {
  [data-brand="acme"] { --brand-chalk-20: color(display-p3 …); … }   /* only stops whose chroma exceeds sRGB */
}
}`}</Pre>
      <P>
        Every hex is the resolved color brought into sRGB by reducing chroma at constant lightness and hue. Where
        the resolved chroma exceeds sRGB, a <Code>color(display-p3 …)</Code> override for that one property ships
        behind the two gates above, so a P3 display shows the wider color and an sRGB display keeps the engine's
        own fallback. A per-brand signal override (a collision shift) is emitted inside the brand's block under
        the signal's role prefix, so it wins the cascade over <Code>:root</Code>.
      </P>
      <H3>Figma</H3>
      <P>
        <Code>themeToFigma</Code> returns a light tree and a dark tree of the same shape, on the grammar's paths. The
        extended plugin writes one collection, <Code>theme</Code>, with the modes <Code>light</Code> and{' '}
        <Code>dark</Code>, populated once from the default seed, and one extension collection per brand that
        overrides only the rows that differ. The extension carries the brand's name; the paths inside stay generic
        (<Code>color/brand/…</Code>), so a designer binds once and re-themes by switching the extension.
      </P>
      <H3>DTCG</H3>
      <P>
        <Code>tokensToDtcg</Code> returns one document per mode (Design Tokens Format Module 2025.10) on the same
        paths, every token with its description. The two join through a resolver document with a theme modifier;
        the format is in <Code>docs/schema.md</Code>. With <Code>{"{ rootGroup: 'color' }"}</Code> every path nests
        under that group (<Code>color.brand.stamp-0</Code>), the spelling the extended plugin writes with slashes.
      </P>

      <H2>A live CSS block</H2>
      <CssSample />

      <H2>The Figma tree</H2>
      <FigmaTree />

      <H2>The full roster</H2>
      <P>
        Every row the extended plugin writes for seed {REF_SEED}, in the plugin's own spelling, with the CSS custom
        property the same row ships as. The two spellings are the same path.
      </P>
      <H3>Per family</H3>
      <FamilyRoster />
      <H3>The link rows and the seeds</H3>
      <SystemRoster />

      <H2>What is identical, what differs</H2>
      <UL>
        <LI>The scale is identical across every family: same targets, same producers, same requirements. Two families differ in their stops only by hue and chroma.</LI>
        <LI>The stamp fill is the one per-family differentiator: it anchors at the seed's own lightness, so a dark brand has a dark button and a pastel brand a pale one. The neutral's stamp is quiet by design: its rest fill is the scale's own chalk-8, lifted in dark until it clears the high plane.</LI>
        <LI>In dark mode the brand's stamp chroma is trimmed; the signals keep their identity chroma, so canonical red and yellow read the same in both modes.</LI>
        <LI>A signal family's values move only to stay distinct from the brand (a hue shift or a swap variant), never for the brand's taste.</LI>
      </UL>

      <H2>The extended plugin's color group and the picker</H2>
      <P>
        Every path the extended plugin writes starts with <Code>color/</Code>, the category: a design system whose
        variable paths start with their category (<Code>space/400</Code>, <Code>radius/200</Code>) reads color the same
        way. The group marks no ownership. Hand-authored color roles can sit in it beside the engine's rows, and the
        plugin knows its own rows by an identity it stamps on each, never by the name. A hand edit to an engine row
        is left alone by a re-apply. The group is stripped from the Web code syntax, so the name a developer sees
        matches the CSS custom property.
      </P>
      <P>
        The scale stops and the seeds are single resolved colors; the stamp rows and the link rows are the positions a
        designer binds to. The plugin's "Hide primitive scale from pickers" checkbox, on by default, hides the scale
        stops and the seeds from Figma's color pickers and keeps the stamp and link rows visible. The setting is
        stored on the file and re-applied on every apply, so a scope hand-edited in Figma reverts on the next run.
      </P>
    </>
  )
}
