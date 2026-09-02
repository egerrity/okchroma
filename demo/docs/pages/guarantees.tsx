import React from 'react'
import { H2, P, UL, LI, Code, Lead, Note, Table, DocLink, K } from '../prose'
import { STOP_8_NONTEXT_CONTRAST, PENCIL_9_CONTRAST, PEN_10_CONTRAST, PEN_11_CONTRAST_FLOOR, PEN_70_GROUND } from '../../../src/engine/stopTable'
import { MODE_SPECS } from '../../../src/engine/requirements/spec'
import { NEUTRAL_P3_WORST_SHIP_Y, NEUTRAL_W80_WORST_SHIP_Y, CHROMATIC_P3_WORST_SHIP_Y, CHROMATIC_W80_WORST_SHIP_Y } from '../../../src/engine/requirements/resolve'
import { CRITICAL_CLEARANCE_LC } from '../../../src/engine/requirements/profiles'
import { APCA_ENFORCE_MARGIN_LC, APCA_SOLVE_MARGIN_LC } from '../../../src/engine/requirements/producers'
import { SOFT_ON_CTA_ALPHA } from '../../../src/engine/resolve'
import { CTA_BORDER_LC_FLOOR } from '../../../src/engine/cssRender'
import { stopTokenName, PAPER_0, PEN_100 } from '../../../src/engine/tokenNames'

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

export function Body() {
  return (
    <>
      <Lead>
        Every claim the engine makes, stated exactly: which band, against which grounds, at which bar,
        checked how. Anything not on this page is not promised.
      </Lead>

      <H2>The five claims</H2>
      <P>
        Each band carries one flat claim. A claim is judged on the pair that ships (both colors in 8-bit
        sRGB, the values a browser and an audit tool measure), in light and in dark, and it holds for
        every family the theme emits: neutral, brand, brand-alt, and the four signals.
      </P>
      <Table
        head={['band', 'claim', 'bar', 'stops']}
        rows={[
          ['paper', 'grounds. Every contrast band is cleared against them; they carry no claim of their own', '', <>{stopTokenName(1)}, {stopTokenName(2)}, {stopTokenName(3)}, and the neutral's {PAPER_0}</>],
          ['highlighter', 'grounds for subtle states and decoration. The pen band is cleared against them. Never text', '', <>{stopTokenName(4)} to {stopTokenName(7)}</>],
          ['crayon', 'reads on every paper: focus rings, icons, borders, large text (the non-text contrast bar)', <><K v={STOP_8_NONTEXT_CONTRAST} d={1} />:1</>, stopTokenName(8)],
          ['pencil', 'reads on every paper: regular text, and the emphasis fill', <><K v={PENCIL_9_CONTRAST} d={1} />:1</>, stopTokenName(9)],
          ['pen', 'reads on every paper and every highlighter, both directions', <><K v={PEN_10_CONTRAST} d={1} />:1</>, <>{stopTokenName(10)}, {stopTokenName(11)}, and the neutral's {PEN_100}</>],
        ]}
      />
      <P>
        In WCAG terms: <K v={STOP_8_NONTEXT_CONTRAST} d={1} />:1 is the non-text contrast requirement for user
        interface components and graphical objects, and the bar for large text at level AA;{' '}
        <K v={PENCIL_9_CONTRAST} d={1} />:1 is the requirement for regular text at level AA. The promise on every
        text band is a guaranteed minimum of AA. No AAA claim is made anywhere, even where a stop is placed above it.
      </P>

      <H2>What "every paper" means</H2>
      <P>
        A band reads against the grounds of its own family and of the theme's neutral. The pen band is
        symmetric: a pen and a ground are in scope when they share a family or either side is the neutral,
        in both directions, so the neutral's pens also read against every chromatic family's highlighters.
        The neutral's crayon and pencil read against every chromatic family's papers as well. A pen of one
        chromatic family on another chromatic family's highlighter is not in scope.
      </P>
      <P>
        The ramp resolves per family, so the neutral it will be paired with is not in view during the solve.
        The cross-family half of the claim is therefore enforced against frozen bounds: the worst value of the
        relevant ground that any theme can put on screen, measured over every hue and tint level and stored
        in the resolver. A stop is walked away from its anchor, in steps of 0.001 L, until the shipped pair
        clears both its own ground and the bound.
      </P>
      <Table
        head={['bound', 'light (darkest Y)', 'dark (lightest Y)', 'binds']}
        rows={[
          [<Code>NEUTRAL_P3_WORST_SHIP_Y</Code>, <K v={NEUTRAL_P3_WORST_SHIP_Y.light} d={6} />, <K v={NEUTRAL_P3_WORST_SHIP_Y.dark} d={6} />, `the worst neutral ${stopTokenName(3)}; every chromatic family's crayon, pencil and ${stopTokenName(11)}`],
          [<Code>NEUTRAL_W80_WORST_SHIP_Y</Code>, <K v={NEUTRAL_W80_WORST_SHIP_Y.light} d={6} />, <K v={NEUTRAL_W80_WORST_SHIP_Y.dark} d={6} />, `the worst neutral ${stopTokenName(7)}; every chromatic family's ${stopTokenName(10)} (the one stop anchored at a highlighter)`],
          [<Code>CHROMATIC_P3_WORST_SHIP_Y</Code>, <K v={CHROMATIC_P3_WORST_SHIP_Y.light} d={6} />, <K v={CHROMATIC_P3_WORST_SHIP_Y.dark} d={6} />, `the worst chromatic ${stopTokenName(3)}; the neutral's crayon, pencil and pens, each at its band's bar`],
          [<Code>CHROMATIC_W80_WORST_SHIP_Y</Code>, <K v={CHROMATIC_W80_WORST_SHIP_Y.light} d={6} />, <K v={CHROMATIC_W80_WORST_SHIP_Y.dark} d={6} />, `the worst chromatic ${stopTokenName(7)}; the neutral's pens`],
        ]}
      />
      <P>
        Y is relative luminance. The bounds are re-derived whenever the ladders, the neutral curve, or a signal seed
        moves; the requirement gate's ground-bound check catches an escape.
      </P>

      <H2>Declared target versus promise</H2>
      <P>
        The declaration (<Code>spec.ts</Code>) names a target and an anchor per stop. Two things sit between the
        declaration and the promise: the resolver re-anchors a text stop declared against a paper onto{' '}
        {stopTokenName(3)}, the nearest paper, so clearing it clears every paper; and a declared target can be
        stricter than the claim, in which case the surplus is placement, not a promise.
      </P>
      <Table
        head={['stop', 'declared target', 'declared anchor', 'resolved against', 'the promise']}
        rows={[
          [stopTokenName(8), <><K v={R8.target} d={1} />:1 ({R8.level})</>, R8.against, `${R8.against}, plus the neutral bound`, <><K v={STOP_8_NONTEXT_CONTRAST} d={1} />:1 on every paper</>],
          [stopTokenName(9), <><K v={R9.target} d={1} />:1 ({R9.level})</>, R9.against, `${stopTokenName(3)} (re-anchored), plus the neutral bound`, <><K v={PENCIL_9_CONTRAST} d={1} />:1 on every paper</>],
          [stopTokenName(10), <><K v={R10.target} d={1} />:1 ({R10.level})</>, R10.against, `${R10.against} (honored: a highlighter is darker than every paper), plus the neutral highlighter bound`, <><K v={PEN_10_CONTRAST} d={1} />:1 on every paper and highlighter</>],
          [stopTokenName(11), <><K v={R11.target} d={1} />:1 ({R11.level})</>, R11.against, `${stopTokenName(3)} (re-anchored), plus the neutral bound`, <><K v={PEN_10_CONTRAST} d={1} />:1 on every paper and highlighter; it clears highlighters by sitting past {stopTokenName(10)}</>],
          [PEN_100, 'none (the literal pole)', '', '', <><K v={PEN_10_CONTRAST} d={1} />:1 on every paper and highlighter (neutral only)</>],
        ]}
      />
      <P>
        Declared in both modes: in light a floor clamps lightness down to the lightest value that clears; in dark
        it raises lightness off the near-black ground. A placement that already clears does not move. A floor the
        resolver cannot meet marks the stop <Code>unresolvable</Code> and the gate fails, instead of shipping a
        near miss. The mechanism step by step is on the{' '}
        <DocLink page="generation">How the theme is generated</DocLink> page.
      </P>
      <P>
        The inverse link family (text on {stopTokenName(11)} fills) is solved against a different ground: the
        lightest light-mode {stopTokenName(11)} and the darkest dark-mode {stopTokenName(11)} any theme ships
        (<Code>PEN_70_GROUND</Code>; light L <K v={PEN_70_GROUND.wcag.light.L} />, dark L{' '}
        <K v={PEN_70_GROUND.wcag.dark.L} />), with its middle state at 6.5:1 and its strong state at{' '}
        <K v={PEN_11_CONTRAST_FLOOR} d={1} />:1 declared; the promise is AA.
      </P>

      <H2>The stamp fill and its text</H2>
      <UL>
        <LI>
          <b>The pole.</b> <Code>stamp/on</Code> is white or black. The preference is which pole reads better on the
          fill (judged with APCA). The law is WCAG: the chosen pole must pass <K v={RATIO_FLOOR} d={1} />:1. If white
          is preferred and misses, the pole flips to black when black passes and reads clearly; otherwise the fill
          darkens until white clears 4.6:1 (the solve margin). A last check at the fill that ships flips the pole
          if the chosen one misses and the other clears.
        </LI>
        <LI>
          <b>The booster.</b> APCA is used in one place: to nudge the stamp toward legibility once the law is met.
          Brand and signal fills move, in the chosen pole's own direction, until that pole reads APCA Lc{' '}
          <K v={CO_LC} d={0} /> (the critical signal <K v={CRITICAL_CLEARANCE_LC} d={0} />). The move fires at the
          bar plus <K v={APCA_ENFORCE_MARGIN_LC} d={1} /> Lc and solves <K v={APCA_SOLVE_MARGIN_LC} d={1} /> Lc past it,
          so a value never ships on the razor, and 4.5:1 stays the hard floor in every case. The booster is not a
          claim; nothing is promised about a token's APCA reading.
        </LI>
        <LI>
          <b>Quiet fills.</b> The neutral's stamp, and a secondary's where the composite stays legal, carry the pole at
          alpha (<K v={SOFT_ON_CTA_ALPHA.light} pct d={0} /> light, <K v={SOFT_ON_CTA_ALPHA.dark} pct d={0} /> dark).
          The gate is 4.5:1 on all three fill states, rest, hover and pressed, composited over the 8-bit fill; a
          secondary that fails it keeps the solid pole.
        </LI>
        <LI>
          <b>The edge.</b> <Code>stamp/edge</Code> resolves to a stroke when the fill reads under APCA |Lc|{' '}
          <K v={CTA_BORDER_LC_FLOOR} d={0} /> against the page. This is a taste gate, not an accessibility claim:
          buttons carry no non-text contrast requirement against the page.
        </LI>
      </UL>

      <H2>What is not promised</H2>
      <UL>
        <LI>Highlighters are never text grounds for the crayon or the pencil. Only the pen band is cleared against them.</LI>
        <LI>No AAA. {stopTokenName(11)} declares <K v={R11.target} d={1} />:1 against its paper, but the promise is the same AA minimum as every text band.</LI>
        <LI>APCA is a booster, not a claim. It nudges the stamp fill, picks its pole, and gates its edge; no token is promised any APCA value.</LI>
        <LI>Exact mode ships the typed hex as the stamp fill and identity with on-fill enforcement off. The label is whichever pole passes, and a note is emitted when no pole reads well; the ramp's own stops keep their claims.</LI>
        <LI>A custom or exact secondary's ramp is the user's hex, untouched; its stops still resolve under the claims, but its stamp is not moved by the booster.</LI>
        <LI>The <Code>full-chroma</Code> style releases the vividness cap and sits outside the guarantee; it is API only.</LI>
        <LI>Nothing is claimed for a color a consumer computes from the tokens (opacity tweaks, mixes). The claims are on the shipped values.</LI>
      </UL>

      <H2>How it is verified</H2>
      <P>
        The gates run locally with <Code>npm run &lt;script&gt;</Code>; the Pages workflow builds the site and the
        plugins on every push but does not run them. Each script sweeps agnostic seeds, never a named brand list,
        and the bar is the worst case.
      </P>
      <Table
        head={['script', 'sweep', 'what it proves']}
        rows={[
          [<Code>audit:guarantee</Code>, '72 hues × 3 chromas at L 0.62, plus the 15 audit fixtures; 7 families; 4 neutral tint levels; both modes', 'the five claims above on the shipped 8-bit pair, both directions; the quiet stamp/on composite at 4.5:1 on every state; the full-chroma residual, reported'],
          [<Code>req:audit</Code>, '24 hues × 3 chromas at L 0.62; both modes', 'every declared requirement holds; the ladder is monotonic through the crayon; the pencil sits past the crayon; the pens order; every stop is in gamut and a valid hex; the stamp anchor respects its floor and hue; hover and pressed travel one way; the on-fill pole is valid'],
          [<Code>audit:cta-apca</Code>, 'agnostic hue × lightness × chroma grids, every stamp surface', `the booster holds: every stamp fill reads Lc ${CO_LC} (critical ${CRITICAL_CLEARANCE_LC}), light and dark`],
          [<Code>band-audit</Code>, 'agnostic hue × chroma × L, plus the fixtures', `band order (${stopTokenName(9)} past ${stopTokenName(8)}); ${PAPER_0} on ${stopTokenName(9)} at 4.5:1; ${stopTokenName(8)} at 3:1 on its declared paper in both modes; the neutral stamp's state law and soft composite; a blessed value snapshot`],
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
