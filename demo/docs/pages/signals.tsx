import React, { useMemo } from 'react'
import { H2, H3, P, UL, LI, Code, Lead, Table, DocLink, K, SwatchCell } from '../prose'
import { SIGNALS } from '../../../src/engine/signals'
import { SIGNAL_SCALES, DEFAULT_SECONDARY, defaultSecondarySeed, OUTLINE_HOVER_ALPHA, OUTLINE_PRESSED_ALPHA, DEFAULT_LINK_HEX, SECONDARY_DISTINCT_DELTA_E, SOFT_ON_CTA_ALPHA } from '../../../src/engine/resolve'
import { SHIFT_RULES } from '../../../src/engine/signalShift'
import { HUE_COLLISION_HIGHLIGHTER_DEG, HUE_COLLISION_MIN_V, YELLOW_SPLIT_H, DELTA_E_THRESHOLD, DARK_DELTA_E_THRESHOLD, HUE_GATE_DEG } from '../../../src/engine/collision'
import { RED_GATE, RED_SOLVE, VIVID_C } from '../../../src/engine/colorMath'
import { P2_D, P2_D_UP } from '../../../src/engine/p2'
import { CRITICAL_CLEARANCE_LC } from '../../../src/engine/requirements/profiles'
import { generateNeutralScale } from '../../../src/engine/colorEngine'
import { neutralChromaCurve, type NeutralLevel } from '../../../src/engine/neutralCurve'
import { NEUTRAL_CTA_DARK_POP_CLEARANCE, ROOT_L_LIGHT, PEN_70_GROUND } from '../../../src/engine/stopTable'
import { stopHex } from '../../../src/engine/cssRender'
import { stopTokenName, STAMP_FILL, STAMP_FILL_HOVER, STAMP_FILL_PRESSED, STAMP_EDGE, STAMP_ON } from '../../../src/engine/tokenNames'
import { REF_SEED } from '../figures'

export const slug = 'signals'
export const title = 'Signals and companions'

const LEVELS: NeutralLevel[] = ['pure', 'default', 'medium', 'branded']

export function Body() {
  const sig = useMemo(() => SIGNALS.map(s => ({ def: s, scale: SIGNAL_SCALES.get(s.name)!.scale })), [])
  const derivedHex = defaultSecondarySeed(REF_SEED)
  const neutral = useMemo(() => generateNeutralScale(0, 'default'), [])
  // the tint curve's effective chroma per stop, per level, at hue 0 (the ratio to 'medium' is the level's multiplier)
  const curveAt = (level: NeutralLevel, L: number) => neutralChromaCurve(0, level)(L, 'light')
  const mult = (level: NeutralLevel) => curveAt(level, ROOT_L_LIGHT[4]) / curveAt('medium', ROOT_L_LIGHT[4])
  return (
    <>
      <Lead>
        The four signals, how a brand collides with them and what moves; then the companions: the secondary's three
        postures, the neutral, and the link.
      </Lead>

      <H2>The four signals</H2>
      <P>
        Each signal is a family like any other, generated once from a fixed seed with the signal options (identity
        chroma in dark, the gold boost, the warm drift re-derived in dark, no red repel, the clearance at Lc 65 or, for
        red, <K v={CRITICAL_CLEARANCE_LC} d={0} />). The engine names them by identity and emits them under their role names.
      </P>
      <Table
        head={['identity', 'role', 'seed', 'light stamp', 'dark stamp', 'dark floor']}
        rows={sig.map(({ def, scale }) => [def.name, def.emitName, <SwatchCell color={def.hex} label={def.hex} />,
          <SwatchCell color={stopHex(scale.cta)} label={stopHex(scale.cta)} />, <SwatchCell color={stopHex(scale.ctaDark)} label={stopHex(scale.ctaDark)} />,
          def.darkFillMinL !== undefined ? <K v={def.darkFillMinL} d={2} /> : 'default'])}
      />

      <H2>The collision test</H2>
      <P>
        Whole-ramp remedies (a swap variant, the lemon shift) gate on one test, <Code>checkHueCollision</Code>
        (collision.ts): the smallest hue distance between the brand's and the signal's highlighter stops
        ({stopTokenName(3)} to {stopTokenName(7)}, either mode) is at most <K v={HUE_COLLISION_HIGHLIGHTER_DEG} d={0} deg />, and
        the brand's vividness (its chroma over <K v={VIVID_C} />, capped at 1) is at least <K v={HUE_COLLISION_MIN_V} d={1} />.
        Highlighters are where a near-hue pair collides at every rung: the ladder normalizes lightness and chroma, so hue is
        the only thing left telling them apart.
      </P>
      <P>
        A second test exists in the code, <Code>checkCollision</Code> (hue within <K v={HUE_GATE_DEG} d={0} deg /> and stamp
        ΔE at most <K v={DELTA_E_THRESHOLD} d={2} /> light / <K v={DARK_DELTA_E_THRESHOLD} d={2} /> dark). It is an audit
        instrument, used by the dark-parity audit; it does not take part in resolution.
      </P>

      <H2>Per signal</H2>
      <Table
        head={['signal', 'who yields', 'resolution']}
        rows={[
          [<Code>red (critical)</Code>, 'the brand, then the signal', 'the joint solve below: the brand’s stamp exits red’s region by its nearest edge; the red signal complements from the far side of the brand when canonical red would still vibrate beside it; otherwise canonical red ships, and an exact-mode brand gets outline advice for destructive controls'],
          [<Code>yellow (warning)</Code>, 'the signal', <>brand hue below <K v={YELLOW_SPLIT_H} d={0} deg />: yellow shifts to lemon (hue +<K v={SIGNALS.find(s => s.name === 'yellow')!.hueShift.cool} d={0} deg />, chroma ×<K v={SIGNALS.find(s => s.name === 'yellow')!.yieldChromaScale} d={2} />); at or above: no change</>],
          [<Code>green (positive)</Code>, 'the signal', <>brand hue below <K v={SHIFT_RULES.green!.splitH} d={0} deg />: the teal-side variant (seed <Code>{(SHIFT_RULES.green!.below as { baseHex: string }).baseHex}</Code>); at or above: the yellow-side variant (<Code>{(SHIFT_RULES.green!.atOrAbove as { baseHex: string }).baseHex}</Code>)</>],
          [<Code>blue (info)</Code>, 'the signal', <>brand hue below <K v={SHIFT_RULES.blue!.splitH} d={0} deg />: the magenta-side variant (<Code>{(SHIFT_RULES.blue!.below as { baseHex: string }).baseHex}</Code>), unreachable with the shipped seeds since the hue test never fires on that side; at or above: the cyan-side variant (<Code>{(SHIFT_RULES.blue!.atOrAbove as { baseHex: string }).baseHex}</Code>)</>],
        ]}
      />
      <P>
        A variant is a full re-generation of the signal from the variant seed under the signal options; it replaces the
        signal's ramp in the emitted theme (a <Code>signalOverride</Code>, emitted inside the brand's CSS block and as
        the brand extension's override rows in Figma). It never re-enters the brand's generation.
      </P>

      <H2>The red solve</H2>
      <P>
        Red is different: it is the error color, its identity is sacred, and a brand that reads as red is a product
        problem. Two movers, one geometry (<Code>solveBrandExit</Code>, producers.ts; <Code>redComplementVariant</Code>,
        resolve.ts).
      </P>
      <UL>
        <LI><b>Membership.</b> The brand's stamp at the seed's own lightness sits inside red's region when the weighted distance from red's stamp (<Code>redSolveDist</Code>) is at most <K v={RED_GATE.G} d={3} />, or when it sits in the brick band (H <K v={RED_SOLVE.brickHLo} d={0} /> to <K v={RED_SOLVE.brickHHi} d={0} />, L <K v={RED_SOLVE.brickLLo} d={2} /> to <K v={RED_SOLVE.brickLHi} d={2} />, vivid). Release is the radius plus a ring of <K v={RED_SOLVE.ring} d={3} />.</LI>
        <LI><b>The exit.</b> The stamp travels along lightness, in steps of 0.002 L, to the nearest release point that has a passing text pole; the direction rules: a noticeably magenta seed lightens unless deep; a gold-side vivid seed flips up to bright orange; an on-hue vivid seed takes the dark throw; an on-hue red that would drift up keeps the light landing only above L <K v={RED_SOLVE.trueRedBrightCut} d={2} />. A dark landing inside the brick band takes a diagonal (a few degrees cooler, <K v={1 - RED_SOLVE.brickDesat} pct d={0} /> less chroma, <K v={RED_SOLVE.brickExtraDeep} d={2} /> deeper). The decision is judged on the APCA pole; the WCAG 4.5:1 and the clearance ride as a law extension along the decided direction.</LI>
        <LI><b>The complement.</b> The red signal then re-seats on the opposite side of the brand's final stamp, from a deep core (L {RED_SOLVE.coreL.join(', ')}) or a light edge tier (L {RED_SOLVE.edgeL.join(', ')}), at hues {RED_SOLVE.redHuesWarmBrand.join('°, ')}° beside a warm brand, first clean candidate wins. Clean means: past the side-by-side bar (P2 <K v={P2_D} d={2} /> below the brand, <K v={P2_D_UP} d={2} /> above), outside red's release radius from the brand, and with a pole that passes 4.5:1 and clears Lc <K v={CRITICAL_CLEARANCE_LC} d={0} />. Only the fill trio moves; the red ramp and the dark side stay canonical.</LI>
        <LI><b>Dark.</b> The dark stamp runs the same exit on the dark geometry, keyed on the side-by-side metric alone (bar <K v={P2_D} d={2} />), because the at-a-glance metric is blind to vibrating dark pairs.</LI>
      </UL>
      <P>
        The side-by-side metric is helmlab's perceptual difference, the engine's one runtime dependency, calibrated on
        adjacent-pair judgements; the at-a-glance metric is the weighted OKLab distance above, calibrated on
        confusability judgements. Neither can do the other's job.
      </P>

      <H2>The secondary as a collider</H2>
      <P>
        A real secondary de-conflicts the signals too, at lower priority than the primary
        (<Code>mergeSecondarySignals</Code>, resolve.ts): a green or blue variant is adopted only if it clears both brand
        colors; yellow's lemon is adopted if it clears the primary; red's complement is calibrated to the secondary when
        the primary did not claim red, and verified beside the primary. The primary wins ties: an existing primary
        override is replaced only by a variant that also clears the primary. What the machinery cannot clear ships as a
        note. A secondary whose stamp sits within ΔE <K v={SECONDARY_DISTINCT_DELTA_E} d={2} /> of the primary's gets a
        distinctness note.
      </P>

      <H2 id="companions">Companions</H2>
      <H3>The secondary</H3>
      <Table
        head={['posture', 'the ramp', 'the stamp', 'signals']}
        rows={[
          ['derived (no hex)', 'a normal ramp from the transformed seed', 'from the same ramp, flat dark register', 'checked as a collider'],
          ["custom ('default' style + a hex)", 'your hex, resolved exact', 'the trio from the transformed seed: a tint of your hex', 'checked as a collider'],
          ["exact ('exact' style)", 'your hex, resolved exact', 'your hex, no enforcement', 'advice only'],
          ["outline ('outline' style)", 'the exact ramp', <>re-expressed at emit: fill transparent, hover {stopTokenName(8)} at <K v={OUTLINE_HOVER_ALPHA} pct d={0} />, pressed at <K v={OUTLINE_PRESSED_ALPHA} pct d={0} />, edge {stopTokenName(8)}, on {stopTokenName(9)}</>, 'advice only'],
        ]}
      />
      <P>
        The transform (<Code>defaultSecondarySeed</Code>): lightness lifted by <K v={DEFAULT_SECONDARY.kL} pct d={0} /> of the
        room up to L <K v={DEFAULT_SECONDARY.lRoom} d={2} />; chroma <K v={DEFAULT_SECONDARY.kC} pct d={0} /> of the seed's, at most{' '}
        <K v={DEFAULT_SECONDARY.kR} pct d={0} /> of the gamut ceiling at the landing; hue unchanged; at least{' '}
        <K v={DEFAULT_SECONDARY.minGapApp} d={0} /> apparent-L off white. For the reference seed {REF_SEED} the derived seed is{' '}
        <SwatchCell color={derivedHex} label={derivedHex} />. Its dark stamp sits a flat <K v={DEFAULT_SECONDARY.darkFlatGapApp} d={0} />{' '}
        apparent-L above the dark ground instead of the prominence floor, even across hues. Quiet fills carry{' '}
        <Code>{STAMP_ON}</Code> at alpha (<K v={SOFT_ON_CTA_ALPHA.light} pct d={0} /> / <K v={SOFT_ON_CTA_ALPHA.dark} pct d={0} />) where the
        composite passes on every state.
      </P>
      <H3>The neutral</H3>
      <P>
        <Code>generateNeutralScale(tintHue, level)</Code>: a near-gray seed (chroma 0.006 at the tint hue) through the same
        generator with a declared chroma curve (<Code>neutralChromaCurve</Code>, neutralCurve.ts) in place of the ladder.
        The curve lifts the tint across the papers so the planes separate, peaks at {stopTokenName(4)} and {stopTokenName(5)},
        and tapers through the crayon and the pens so text lands near-neutral; warm hues are damped, since a warm tint reads
        dirtier on gray than a cool one at the same chroma. The tint hue is stored as a source (the primary, the secondary,
        or a custom hex) and re-resolved on every apply. Four strengths, as multiples of the curve:
      </P>
      <Table
        head={['level', 'multiplier', `chroma at ${stopTokenName(1)}`, `at ${stopTokenName(4)}`, `at ${stopTokenName(11)}`]}
        rows={LEVELS.map(l => [l, <K v={mult(l)} d={2} />, <K v={curveAt(l, ROOT_L_LIGHT[1])} d={4} />, <K v={curveAt(l, ROOT_L_LIGHT[4])} d={4} />, <K v={curveAt(l, ROOT_L_LIGHT[11])} d={4} />])}
      />
      <P>
        Its stamp is quiet by design: the rest fill is the scale's own {stopTokenName(4)} (light{' '}
        <SwatchCell color={stopHex(neutral.cta)} label={stopHex(neutral.cta)} />, dark{' '}
        <SwatchCell color={stopHex(neutral.ctaDark)} label={stopHex(neutral.ctaDark)} /> at hue 0), lifted in dark until it
        clears <K v={NEUTRAL_CTA_DARK_POP_CLEARANCE} d={1} />:1 against the dark {stopTokenName(2)}, the highest plane its buttons sit on;
        hover and pressed step from the rest like every other fill; <Code>{STAMP_ON}</Code> is always the pole at alpha.
        The neutral's pens and its {stopTokenName(8)} and {stopTokenName(9)} are additionally cleared against every chromatic
        family's grounds (the symmetric claim on the <DocLink page="guarantees">Guarantees</DocLink> page).
      </P>
      <H3>The link</H3>
      <UL>
        <LI><b>Default:</b> <Code>--link</Code>, <Code>--link-hover</Code>, <Code>--link-pressed</Code> alias the primary's {stopTokenName(9)}, {stopTokenName(10)}, {stopTokenName(11)}.</LI>
        <LI><b>Custom seed:</b> the hex seeds a throwaway resolve and the shipped trio is that resolve's three text stops (the default seed when the option turns on is <Code>{DEFAULT_LINK_HEX}</Code>).</LI>
        <LI><b>Inverse:</b> the same seed re-solved for text on {stopTokenName(11)} fills, each pen ground replaced by the worst shipped {stopTokenName(11)} (light L <K v={PEN_70_GROUND.wcag.light.L} />, dark L <K v={PEN_70_GROUND.wcag.dark.L} />), with the modes crossed: the light-mode inverse trio is light text on a dark fill, which is the dark ramp's construction, so it is read off the dark ramp, and vice versa. No alias posture exists for it; the values always ship raw.</LI>
      </UL>
      <P>
        The stamp tokens on every companion are the same five: <Code>{STAMP_FILL}</Code>, <Code>{STAMP_FILL_HOVER}</Code>,{' '}
        <Code>{STAMP_FILL_PRESSED}</Code>, <Code>{STAMP_EDGE}</Code>, <Code>{STAMP_ON}</Code>.
      </P>
    </>
  )
}
