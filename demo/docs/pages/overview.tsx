import React from 'react'
import { H2, P, UL, LI, Code, Lead, DocLink, K, Table } from '../prose'
import { RampSet, FamilyRoster, REF_SEED } from '../figures'
import { STOP_8_NONTEXT_CONTRAST, PENCIL_9_CONTRAST, PEN_10_CONTRAST } from '../../../src/engine/stopTable'
import { MODE_SPECS } from '../../../src/engine/requirements/spec'
import { CRITICAL_CLEARANCE_LC } from '../../../src/engine/requirements/profiles'
import { PAPER_0, PEN_100 } from '../../../src/engine/tokenNames'

const CO_LC = MODE_SPECS.light.ons.onFill.coEnforceLc!

export const slug = 'overview'
export const title = 'Overview'
export function Body() {
  return (
    <>
      <Lead>
        okchroma is a color engine. A fixed set of formulas generates a color system's base tokens
        from a seed color and a set of options. Each token gets a light and a dark value, and the
        contrast requirements are solved while the values are generated. The set is emitted as CSS
        custom properties, as DTCG documents, and as Figma variables.
      </Lead>

      <H2>The input</H2>
      <P>
        The engine needs one brand hex. The options add a second seed or derive a companion from the
        first, set the neutral's tint and its strength, give the link its own seed, pin a family's
        fill to a lightness anchor, and pick the contrast profile. The full input is on the{' '}
        <DocLink page="install">Install and API</DocLink> page.
      </P>

      <H2>The token roster</H2>
      <P>
        Every family emits the same set of names, so a name says the token's job whichever family
        carries it. The families are neutral, brand, brand-alt, critical, warning, positive and info;
        the neutral adds the two poles, <Code>{PAPER_0}</Code> and <Code>{PEN_100}</Code>. The link
        rows and the two seeds sit outside the families. Each name carries a light and a dark value.
      </P>
      <RampSet />
      <P>
        One family's rows, computed live for seed {REF_SEED}, the engine's own default. Paths are the
        extended plugin's; the CSS column is the same row's custom property. The link rows and the
        seeds are on the <DocLink page="output">Output contract</DocLink> page.
      </P>
      <FamilyRoster />

      <H2>The outputs</H2>
      <UL>
        <LI>CSS custom properties: <Code>brandCss</Code> writes a light block and a dark block per brand; <Code>signalsCss</Code> writes the brand-independent signal block once.</LI>
        <LI>DTCG documents: <Code>tokensToDtcg</Code> writes one document per mode, each token with its description.</LI>
        <LI>Figma variables: <Code>themeToFigma</Code> returns a light and a dark group tree; the extended plugin writes them into a file.</LI>
      </UL>

      <H2>What the engine guarantees</H2>
      <P>
        Every family has the same scale, so a band means the same thing on every brand. Each band
        carries one claim, checked in both modes on the 8-bit sRGB values that ship, against the
        papers and chalks of its own family and of the neutral; each row says which.
      </P>
      <Table
        head={['Band', 'Job', 'Guarantee']}
        rows={[
          ['paper', 'background', 'none; the contrast bands are measured against the papers'],
          ['chalk', 'decorative border, illustration, ground for inverted text; never text', 'none; the pens are measured against the chalks'],
          ['highlighter', 'focus ring, icon, border, large text', <><K v={STOP_8_NONTEXT_CONTRAST} d={1} />:1 on the papers, the non-text bar</>],
          ['pencil', 'regular text; the emphasis fill', <><K v={PENCIL_9_CONTRAST} d={1} />:1 on the papers</>],
          ['pen', 'text on tinted grounds; inverted background', <><K v={PEN_10_CONTRAST} d={1} />:1 on the papers and the chalks, both directions</>],
        ]}
      />
      <P>
        The stamp's text reads on its fill at 4.5:1. APCA is used once: the stamp fill also moves
        until its text clears Lc <K v={CO_LC} d={0} /> (Lc <K v={CRITICAL_CLEARANCE_LC} d={0} /> on
        critical). The full claims and their audits: <DocLink page="guarantees">Guarantees</DocLink>.
      </P>

      <H2>How the values are solved</H2>
      <UL>
        <LI>
          A stop reads the same on every brand. In light mode each stop's lightness is solved per hue so
          its apparent lightness, with the Helmholtz-Kohlrausch effect corrected, hits one shared target.
          In dark mode the paper and chalk stops land on one shared luminance ladder, and the pen stops
          are solved the same way as light.
        </LI>
        <LI>
          Each base token is made for a purpose, and the purpose is in its name and its description: the
          instrument word is the job, the number places it on the ladder, and the description states the
          WCAG level it clears.
        </LI>
        <LI>
          The contrast requirements are declared per band and enforced while the ramp resolves, against
          the resolved grounds.
        </LI>
      </UL>

      <H2>Where to next</H2>
      <UL>
        <LI><DocLink page="install">Install and API</DocLink>: the npm package, the entry points, an end-to-end example.</LI>
        <LI><DocLink page="output">Output contract</DocLink>: the naming grammar, families and prefixes, modes and selectors, a live CSS block and Figma tree.</LI>
        <LI><DocLink page="guarantees">Guarantees</DocLink>: each claim as stated, and how it is verified.</LI>
        <LI><DocLink page="generation">How the theme is generated</DocLink>: the pipeline in execution order, with the constants and the code that runs each step.</LI>
        <LI><DocLink page="signals">Signals and companions</DocLink> and the <DocLink page="reference">Reference</DocLink>: glossary, constants, option types.</LI>
      </UL>
    </>
  )
}
