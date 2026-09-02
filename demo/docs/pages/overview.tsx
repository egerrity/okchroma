import React from 'react'
import { H2, P, UL, LI, Code, Lead, DocLink, K } from '../prose'
import { RampSet, FamilyRoster, REF_SEED } from '../figures'
import { STOP_8_NONTEXT_CONTRAST, PENCIL_9_CONTRAST, PEN_10_CONTRAST } from '../../../src/engine/stopTable'
import { MODE_SPECS } from '../../../src/engine/requirements/spec'
import { CRITICAL_CLEARANCE_LC } from '../../../src/engine/requirements/profiles'
import { SCALE_STOP_COUNT, PAPER_0, PEN_100 } from '../../../src/engine/tokenNames'

const CO_LC = MODE_SPECS.light.ons.onFill.coEnforceLc!

export const slug = 'overview'
export const title = 'Overview'
export function Body() {
  return (
    <>
      <Lead>
        okchroma is a color-system engine. Give it one brand hex, or two, and it resolves a complete
        light and dark token system whose contrast requirements are solved during generation, then
        emits it as CSS custom properties or Figma variables.
      </Lead>

      <H2>What goes in, what comes out</H2>
      <P>
        Input: a primary hex. Optionally a secondary hex (or one derived from the primary), a neutral
        tint source and strength, a custom link seed, and a few levers: exact mode, an archetype
        override, the deeper style. The full input type is on the{' '}
        <DocLink page="install">Install and API</DocLink> page.
      </P>
      <P>
        Output: one resolved theme. Seven families (neutral, brand, brand-alt, critical, warning,
        positive, info), each carrying the same <K v={SCALE_STOP_COUNT} d={0} />-stop scale plus its
        stamp roles; the neutral adds the two poles, <Code>{PAPER_0}</Code> and <Code>{PEN_100}</Code>;
        system rows carry the link trios, the alpha ladders, shadows, the scrim, and the four surface
        planes. Light and dark resolve together and ship on the same names. The two emitters carry
        the same values:
      </P>
      <UL>
        <LI><b>CSS custom properties</b>: <Code>brandCss</Code> emits a light block and a dark block per brand; <Code>signalsCss</Code> emits the brand-independent root block once.</LI>
        <LI><b>Figma variables</b>: <Code>themeToFigma</Code> emits a light and a dark group tree; the extended plugin writes it into a file.</LI>
      </UL>
      <RampSet />

      <H2>What the engine guarantees</H2>
      <P>
        Every family's scale is the same law, so a band means the same thing on every brand. Each band
        carries one flat claim, checked on the pair that ships (8-bit sRGB), against the family's own
        grounds and the neutral's, in both modes:
      </P>
      <UL>
        <LI><b>paper</b>: grounds. No contrast claim of their own; every contrast band is cleared against them.</LI>
        <LI><b>highlighter</b>: grounds for subtle states and decoration, never text. The pen band is cleared against them.</LI>
        <LI><b>crayon</b>: <K v={STOP_8_NONTEXT_CONTRAST} d={1} />:1 on every paper. The bar for anything that must be visible to operate the interface: focus rings, icons, borders, large text.</LI>
        <LI><b>pencil</b>: <K v={PENCIL_9_CONTRAST} d={1} />:1 on every paper. Regular text and the emphasis fill.</LI>
        <LI><b>pen</b>: <K v={PEN_10_CONTRAST} d={1} />:1 on every paper and every highlighter, both directions. Text that must hold on tinted grounds.</LI>
      </UL>
      <P>
        The stamp's text passes 4.5:1 on its fill. On top of that law, the engine uses APCA in one
        place, as a legibility booster on the stamp: the fill is nudged until its text reads at Lc{' '}
        <K v={CO_LC} d={0} /> (critical <K v={CRITICAL_CLEARANCE_LC} d={0} />). The exact statements,
        the frozen worst-case bounds behind "every paper", what is not promised, and the audit scripts
        that prove it are on the <DocLink page="guarantees">Guarantees</DocLink> page.
      </P>

      <H2>Three things it does differently</H2>
      <UL>
        <LI>
          <b>A stop reads the same on every brand.</b> In light mode each stop's lightness is solved per hue so its
          apparent lightness, with the Helmholtz-Kohlrausch effect corrected, hits one shared target. In dark mode the
          paper and highlighter stops land on one shared luminance ladder, and the pen stops are solved the same way as light.
        </LI>
        <LI>
          <b>Primitives are broad, not agnostic.</b> Each stop is made for a purpose and the purpose is in its name and
          its description: the instrument word is the law it serves, the number is where it sits, the conformance line
          states the WCAG level it clears.
        </LI>
        <LI>
          <b>Contrast is solved during generation.</b> The requirements are declared per band and enforced while the
          ramp resolves, against the resolved grounds, not checked afterwards when a semantic layer aliases the stops.
        </LI>
      </UL>

      <H2>What a family ships</H2>
      <P>
        Every swatch below is computed live for seed {REF_SEED}, the engine's own default. Paths are the extended
        plugin's; the CSS column is the custom property the same row ships as. The full roster with the system rows
        is on the <DocLink page="output">Output contract</DocLink> page.
      </P>
      <FamilyRoster />

      <H2>Where to next</H2>
      <UL>
        <LI><DocLink page="install">Install and API</DocLink>: the npm package, the entry points, an end-to-end example.</LI>
        <LI><DocLink page="output">Output contract</DocLink>: the naming grammar, families and prefixes, modes and selectors, a live CSS block and Figma tree.</LI>
        <LI><DocLink page="guarantees">Guarantees</DocLink>: every claim stated exactly, and how it is verified.</LI>
        <LI><DocLink page="generation">How the theme is generated</DocLink>: the pipeline in execution order, with the constants and the code that runs each step.</LI>
        <LI><DocLink page="signals">Signals and companions</DocLink> and the <DocLink page="reference">Reference</DocLink>: glossary, constants, option types.</LI>
      </UL>
    </>
  )
}
