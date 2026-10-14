import React from 'react'
import { H2, P, UL, LI, Code, Lead, Note, Table, A, DocLink, K } from '../prose'
import { STOP_8_NONTEXT_CONTRAST, PENCIL_9_CONTRAST, PEN_10_CONTRAST, PEN_11_CONTRAST_FLOOR, PEN_70_GROUND } from '../../../src/engine/stopTable'
import { MODE_SPECS } from '../../../src/engine/requirements/spec'
import { NEUTRAL_P3_WORST_SHIP_Y, NEUTRAL_W80_WORST_SHIP_Y, CHROMATIC_P3_WORST_SHIP_Y, CHROMATIC_W80_WORST_SHIP_Y } from '../../../src/engine/requirements/resolve'
import { CRITICAL_CLEARANCE_LC } from '../../../src/engine/requirements/profiles'
import { APCA_ENFORCE_MARGIN_LC, APCA_SOLVE_MARGIN_LC } from '../../../src/engine/requirements/producers'
import { SOFT_ON_CTA_ALPHA } from '../../../src/engine/resolve'
import { CTA_BORDER_LC_FLOOR } from '../../../src/engine/cssRender'
import { stopTokenName, PAPER_0, PEN_100, STAMP_ON } from '../../../src/engine/tokenNames'

export const slug = 'guarantees'
export const title = 'Guarantees'

const req = (stop: number) => {
  const r = MODE_SPECS.light.stops.find(s => s.stop === stop)?.require
  if (!r || r.metric !== 'wcag') throw new Error(`docs: stop ${stop} declares no wcag require`)
  return r
}
const R8 = req(8), R9 = req(9), R10 = req(10), R11 = req(11)
const ONS = MODE_SPECS.light.ons.onFill
const CO_LC = ONS.coEnforceLc!
const RATIO_FLOOR = ONS.ratioFloor!
const PAPER5 = stopTokenName(3), CHALK20 = stopTokenName(7), PEN58 = stopTokenName(10), PEN70 = stopTokenName(11)

export function Body() {
  return (
    <>
      <Lead>
        Each claim the engine makes: which band, against which grounds, at which bar, and how it is
        checked. A claim not on this page is not made.
      </Lead>

      <H2>The claims</H2>
      <P>
        Each band carries one claim. A claim is judged on the pair that ships (both colors in 8-bit
        sRGB, the values a browser and an audit tool measure), in light and in dark, and it holds for
        every family the theme emits: neutral, brand, brand-alt, and the four signals.
      </P>
      <table className="d2-table">
        <thead><tr><th>band</th><th>paired with</th><th>contrast minimum</th><th>WCAG level</th></tr></thead>
        <tbody>
          <tr><td rowSpan={2}>paper</td><td>pencil, pen</td><td><K v={PENCIL_9_CONTRAST} d={1} />:1</td><td>AA standard text</td></tr>
          <tr><td>highlighter</td><td><K v={STOP_8_NONTEXT_CONTRAST} d={1} />:1</td><td>AA large text and UI elements</td></tr>
          <tr><td>chalk</td><td>pen</td><td><K v={PEN_10_CONTRAST} d={1} />:1</td><td>AA standard text</td></tr>
          <tr><td>highlighter</td><td>paper</td><td><K v={STOP_8_NONTEXT_CONTRAST} d={1} />:1</td><td>AA large text and UI elements</td></tr>
          <tr><td>pencil</td><td>paper</td><td><K v={PENCIL_9_CONTRAST} d={1} />:1</td><td>AA standard text</td></tr>
          <tr><td>pen</td><td>paper, chalk</td><td><K v={PEN_10_CONTRAST} d={1} />:1</td><td>AA standard text</td></tr>
          <tr><td rowSpan={2}>stamp</td><td>itself (<Code>{STAMP_ON}</Code>)</td><td><K v={RATIO_FLOOR} d={1} />:1</td><td>AA standard text</td></tr>
          <tr><td>edge: paper</td><td>APCA minimum legibility</td><td>n/a</td></tr>
          <tr><td>link</td><td>default: paper; inverse: pen</td><td><K v={PENCIL_9_CONTRAST} d={1} />:1</td><td>AA standard text</td></tr>
        </tbody>
      </table>
      <P>
        In WCAG terms: <K v={STOP_8_NONTEXT_CONTRAST} d={1} />:1 is the{' '}
        <A href="https://www.w3.org/TR/WCAG21/#non-text-contrast">non-text contrast requirement</A> for user
        interface components and graphical objects, and the bar for large text at level AA;{' '}
        <K v={PENCIL_9_CONTRAST} d={1} />:1 is the{' '}
        <A href="https://www.w3.org/TR/WCAG21/#contrast-minimum">requirement for standard text</A> at level AA.
        The promise on every text band is a minimum of AA. No AAA claim is made, even where a stop is placed
        above it. The pen band holds in both directions: pen text on a paper or chalk, and paper or chalk
        text on a pen fill. The highlighter also holds as a translucent state layer over a paper: the pen
        band still clears <K v={PEN_10_CONTRAST} d={1} />:1 on the composite, up to the weight the guarantee
        audit measures.
      </P>

      <H2>Which papers and chalks</H2>
      <P>
        A stop is checked against the papers and chalks of its own family and of the neutral. The neutral's
        own stops are checked against the neutral's grounds and every colored family's. A pen of one colored
        family on another colored family's chalk is not claimed.
      </P>
      <P>
        The ramp resolves one family at a time, so the neutral it will sit beside is not known during the
        solve. The engine therefore checks each stop against the darkest paper or chalk the neutral can
        produce at any tint hue and strength, measured once over every hue and stored, and the neutral's own
        stops against the darkest any colored family can produce. A stop that misses is walked away from its
        ground in steps of 0.001 L until the shipped pair clears both its own ground and that worst case.
      </P>
      <Table
        head={['the worst case', 'light (darkest Y)', 'dark (lightest Y)', 'which stops it holds']}
        rows={[
          [<>the neutral's {PAPER5} (<Code>NEUTRAL_P3_WORST_SHIP_Y</Code>)</>, <K v={NEUTRAL_P3_WORST_SHIP_Y.light} d={6} />, <K v={NEUTRAL_P3_WORST_SHIP_Y.dark} d={6} />, 'every colored family\'s highlighter, pencil and pens'],
          [<>the neutral's {CHALK20} (<Code>NEUTRAL_W80_WORST_SHIP_Y</Code>)</>, <K v={NEUTRAL_W80_WORST_SHIP_Y.light} d={6} />, <K v={NEUTRAL_W80_WORST_SHIP_Y.dark} d={6} />, 'every colored family\'s pens'],
          [<>a colored family's {PAPER5} (<Code>CHROMATIC_P3_WORST_SHIP_Y</Code>)</>, <K v={CHROMATIC_P3_WORST_SHIP_Y.light} d={6} />, <K v={CHROMATIC_P3_WORST_SHIP_Y.dark} d={6} />, 'the neutral\'s highlighter, pencil and pens, each at its own bar'],
          [<>a colored family's {CHALK20} (<Code>CHROMATIC_W80_WORST_SHIP_Y</Code>)</>, <K v={CHROMATIC_W80_WORST_SHIP_Y.light} d={6} />, <K v={CHROMATIC_W80_WORST_SHIP_Y.dark} d={6} />, 'the neutral\'s pens'],
        ]}
      />
      <P>
        Y is relative luminance. The four values are re-measured whenever the ladders, the neutral curve, or a
        signal seed moves; the requirement gate fails if a theme produces a ground past one of them.
      </P>

      <H2>Declared target and promise</H2>
      <P>
        Each contrast stop is solved against one ground of its own family, and checked against the worst
        case above. The highlighter and the pencil are solved against {PAPER5}, the darkest paper, so
        clearing it clears every paper. {PEN58} is solved against {CHALK20}, the darkest chalk. {PEN70} is
        solved against {PAPER5} and clears the chalks by sitting past {PEN58}. A declared target can be
        stricter than the claim; the surplus is placement, and the promise stays at the claim.
      </P>
      <Table
        head={['stop', 'declared target', 'solved against', 'the promise']}
        rows={[
          [stopTokenName(8), <><K v={R8.target} d={1} />:1 ({R8.level})</>, `its own ${PAPER5}, and the neutral's`, <><K v={STOP_8_NONTEXT_CONTRAST} d={1} />:1 on every paper</>],
          [stopTokenName(9), <><K v={R9.target} d={1} />:1 ({R9.level})</>, `its own ${PAPER5}, and the neutral's`, <><K v={PENCIL_9_CONTRAST} d={1} />:1 on every paper</>],
          [PEN58, <><K v={R10.target} d={1} />:1 ({R10.level})</>, `its own ${CHALK20}, and the neutral's`, <><K v={PEN_10_CONTRAST} d={1} />:1 on every paper and chalk</>],
          [PEN70, <><K v={R11.target} d={1} />:1 ({R11.level})</>, `its own ${PAPER5}, and the neutral's`, <><K v={PEN_10_CONTRAST} d={1} />:1 on every paper and chalk; it clears the chalks by sitting past {PEN58}</>],
          [PEN_100, 'none (the literal pole)', '', <><K v={PEN_10_CONTRAST} d={1} />:1 on every paper and chalk (neutral only)</>],
        ]}
      />
      <P>
        Declared in both modes: in light a floor clamps lightness down to the lightest value that clears; in dark
        it raises lightness off the near-black ground. A placement that already clears does not move. A floor the
        resolver cannot meet marks the stop <Code>unresolvable</Code> and the gate fails, so no near miss ships.
        The mechanism step by step is on the <DocLink page="generation">How the theme is generated</DocLink> page.
      </P>
      <P>
        The inverse link rows (text on {PEN70} fills) are solved against a different ground: the lightest
        light-mode {PEN70} and the darkest dark-mode {PEN70} any theme ships (light L{' '}
        <K v={PEN_70_GROUND.wcag.light.L} />, dark L <K v={PEN_70_GROUND.wcag.dark.L} />), with one step from
        rest at 6.5:1 and two steps at <K v={PEN_11_CONTRAST_FLOOR} d={1} />:1 declared; the promise is AA.
      </P>

      <H2>The stamp fill and its text</H2>
      <UL>
        <LI>
          The pole. <Code>{STAMP_ON}</Code> is white or black. The preference is which pole reads better on the
          fill (judged with APCA). The law is WCAG: the chosen pole must pass <K v={RATIO_FLOOR} d={1} />:1. If white
          is preferred and misses, the pole flips to black when black passes and reads clearly; otherwise the fill
          darkens until white clears 4.6:1 (the solve margin). A last check at the fill that ships flips the pole
          if the chosen one misses and the other clears.
        </LI>
        <LI>
          The booster. APCA is used in one place: to nudge the stamp toward legibility once the law is met.
          Brand and signal fills move, in the chosen pole's own direction, until that pole reads APCA Lc{' '}
          <K v={CO_LC} d={0} /> (the critical signal <K v={CRITICAL_CLEARANCE_LC} d={0} />). The move fires at the
          bar plus <K v={APCA_ENFORCE_MARGIN_LC} d={1} /> Lc and solves <K v={APCA_SOLVE_MARGIN_LC} d={1} /> Lc past it,
          so a value never ships at the edge of the bar, and 4.5:1 stays the hard floor in every case. The booster
          carries no claim; nothing is promised about a token's APCA reading.
        </LI>
        <LI>
          Quiet fills. The neutral's stamp, and a secondary's where the composite stays legal, carry the pole at
          alpha (<K v={SOFT_ON_CTA_ALPHA.light} pct d={0} /> light, <K v={SOFT_ON_CTA_ALPHA.dark} pct d={0} /> dark).
          The gate is 4.5:1 on all three fill steps, rest, one step and two steps, composited over the 8-bit fill; a
          secondary that fails it keeps the solid pole.
        </LI>
        <LI>
          The edge. <Code>stamp-edge</Code> resolves to a stroke when the fill reads under APCA |Lc|{' '}
          <K v={CTA_BORDER_LC_FLOOR} d={0} /> against the page. This gate is taste; buttons carry no non-text
          contrast requirement against the page, so it is no accessibility claim.
        </LI>
      </UL>

      <H2>What is not promised</H2>
      <UL>
        <LI>Chalks are never text grounds for the highlighter or the pencil. Only the pen band is cleared against them.</LI>
        <LI>No AAA. {PEN70} declares <K v={R11.target} d={1} />:1 against its paper, but the promise is the same AA minimum as every text band.</LI>
        <LI>APCA is a booster. It nudges the stamp fill, picks its pole, and gates its edge; no token is promised any APCA value.</LI>
        <LI>Exact mode ships the typed hex as the stamp fill and identity with on-fill enforcement off. The label is whichever pole passes, and a note is emitted when no pole reads well; the ramp's own stops keep their claims.</LI>
        <LI>A custom or exact secondary's ramp is the user's hex, untouched; its stops still resolve under the claims, but its stamp is not moved by the booster.</LI>
        <LI>The <Code>full-chroma</Code> style releases the vividness cap and sits outside the guarantee; it is API only.</LI>
        <LI>Nothing is claimed for a color a consumer computes from the tokens (ad-hoc opacities, mixes), except highlighter-26 as a translucent state layer over a paper, which is claimed above up to the weight the audit measures. The engine emits no opacity ladder; a semantic layer picks its own weights on that stop. The claims are on the shipped values.</LI>
      </UL>

      <H2>How it is verified</H2>
      <P>
        The gates run locally with <Code>npm run &lt;script&gt;</Code>; the Pages workflow builds the site and the
        plugins on every push but does not run them. The sweep column says what each script runs over: a value
        sweep runs over agnostic seeds, and the bar is the worst case.
      </P>
      <Table
        head={['script', 'sweep', 'what it proves']}
        rows={[
          [<Code>audit:guarantee</Code>, '72 hues × 3 chromas at L 0.62, plus the 15 audit fixtures; 7 families; 4 neutral tint levels; both modes', 'the claims above on the shipped 8-bit pair, both directions; highlighter-26 as a translucent state layer over every paper at the weights the audit holds; the quiet stamp-on composite at 4.5:1 on every step; the full-chroma residual, reported'],
          [<Code>req:audit</Code>, '24 hues × 3 chromas at L 0.62; both modes', 'every declared requirement holds; the ladder is monotonic through the highlighter; the pencil sits past the highlighter; the pens order; every stop is in gamut and a valid hex; the stamp anchor respects its floor and hue; the steps travel one way; the on-fill pole is valid'],
          [<Code>audit:cta-apca</Code>, 'agnostic hue × lightness × chroma grids, every stamp surface', `the booster holds: every stamp fill reads Lc ${CO_LC} (critical ${CRITICAL_CLEARANCE_LC}), light and dark`],
          [<Code>band-audit</Code>, 'agnostic hue × chroma × L, plus the fixtures', `band order (${stopTokenName(9)} past ${stopTokenName(8)}); ${PAPER_0} on ${stopTokenName(9)} at 4.5:1; ${stopTokenName(8)} at 3:1 on its declared paper in both modes; the neutral stamp's step law and soft composite; a blessed value snapshot`],
          [<Code>audit:divergence</Code>, 'the fixtures, every family × mode × stop', 'the neutral follows its declared tint curve in both modes; the red signal keeps its hue in both modes; a blessed value snapshot; the dark apparent-lightness residual, reported'],
          [<Code>audit</Code>, 'the fixtures', 'dark-mode parity: ladder steps do not collapse, chroma is retained, the pens separate, no red collision; a blessed value snapshot'],
          [<Code>audit:secondary</Code>, '5 primaries × 24 hues × 2 chromas of secondary', 'a resolved secondary clears every effective signal or is annotated; the primary is untouched by theme resolution'],
          [<Code>audit:register</Code>, 'the declared tables', 'the chroma tables and the declaration agree; the dark stamp trim binds to its declared register; no retired mechanism reappears'],
          [<Code>smooth</Code>, 'the full gamut grid', 'per-ramp hue steps, brand-hue drift and chroma wobble against a recorded baseline'],
          [<Code>figma:verify</Code>, 'one fixture with a secondary', 'the Figma tree has the expected shape and spot values; keys align across modes'],
          [<Code>audit:ext</Code>, 'the fixtures', 'the extended plugin overrides exactly the rows that differ from the base; the invariant rows never diff'],
          [<Code>audit:desc</Code>, 'every emitted path', 'every row has a description; no digits, ratios, or foreign label words in a body'],
          [<Code>docs:lint</Code>, 'the docs', 'no em dashes, retired vocabulary, round IDs, or decision jargon in the docs'],
        ]}
      />
      <Note>
        A blessed snapshot is a value regression pin: a gate that carries one fails when any emitted value moves,
        and is re-blessed only after a visual review of the change. The claims are the contract; the snapshots
        keep values from drifting under it.
      </Note>
    </>
  )
}
