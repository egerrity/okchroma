import React from 'react'
import { H2, H3, P, UL, LI, Code, Pre, Lead, Note, Table, DocLink, K, fmtK } from '../prose'
import { ROOT_L_LIGHT, ROOT_L_DARK, SCALE_C_LIGHT, SCALE_C_DARK, GOLD_SPINE, WARM_TORSION, DARK_CTA_C, DARK_BAND_TOP_LIFT, DARK_SIGNAL_WARM_DRIFT, DARK_CTA_MIN_L, DARK_BRAND_FILL_MIN_L, STOP_8_NONTEXT_CONTRAST, PENCIL_9_CONTRAST, PEN_10_CONTRAST } from '../../../src/engine/stopTable'
import { MODE_SPECS, PAPER0_DARK_ROOT_L, type Require } from '../../../src/engine/requirements/spec'
import { CTA_CLEARANCE_CAPS } from '../../../src/engine/requirements/resolve'
import { smoothedBandLift, APCA_ENFORCE_MARGIN_LC, APCA_SOLVE_MARGIN_LC } from '../../../src/engine/requirements/producers'
import { CRITICAL_CLEARANCE_LC } from '../../../src/engine/requirements/profiles'
import { VIVID_C, HUE_NOISE_C, SPINE_OFFPATH_SIGMA, LIGHT_DRIFT_COOL_HI, LIGHT_DRIFT_COOL_RANGE, BRAND_BELL_H, BRAND_BELL_SIGMA, BRAND_BELL_AMOUNT, BRAND_BELL_L_HI, BRAND_BELL_L_LO, BRAND_BELL_RED_H, BRAND_BELL_RED_SIGMA, RED_PIVOT_H, RED_COOL_DEG, RED_PIVOT_EXIT_DEG, RED_GATE, RED_SOLVE, DEEPER_BAND_H_LO, DEEPER_BAND_H_HI, DEEPER_STRENGTH, hexToOklch } from '../../../src/engine/colorMath'
import { MASTER_GAMUT, clampChromaToGamut } from '../../../src/engine/constraints'
import { perceptualRungL, grayApparentL, meanBoost } from '../../../src/engine/perceptualL'
import { ARCHETYPES, stateStepL } from '../../../src/engine/archetypes'
import { SIGNALS } from '../../../src/engine/signals'
import { SOFT_ON_CTA_ALPHA, DEFAULT_SECONDARY } from '../../../src/engine/resolve'
import { CTA_BORDER_LC_FLOOR, OFFSET_ALPHAS } from '../../../src/engine/cssRender'
import { P2_D } from '../../../src/engine/p2'
import { stopTokenName, PAPER_0, PEN_100, STAMP_FILL, STAMP_FILL_HOVER, STAMP_FILL_PRESSED, STAMP_EDGE, STAMP_ON } from '../../../src/engine/tokenNames'

export const slug = 'generation'
export const title = 'How the theme is generated'

const ONS = MODE_SPECS.light.ons.onFill
const CO_LC = ONS.coEnforceLc!
const ladder = Array.from({ length: 11 }, (_, i) => i + 1)
const reqText = (r: Require | undefined) =>
  !r ? 'none' : r.metric === 'wcag' ? `${fmtK(r.target, 1)}:1 (${r.level}) against ${r.against}` : r.metric === 'apca' ? `Lc ${r.targetLc} against ${r.against}` : `ΔE ${r.target} from ${r.against}`
// the live H-K example: pencil-47's target, solved for a high-boost hue and a low-boost one
const HK_STOP = 9
const HK_C = 0.12
const hkL = (H: number) => perceptualRungL(ROOT_L_LIGHT[HK_STOP], clampChromaToGamut(ROOT_L_LIGHT[HK_STOP], HK_C, H), H)
const hkTarget = grayApparentL(ROOT_L_LIGHT[HK_STOP]) + meanBoost(ROOT_L_LIGHT[HK_STOP], HK_C)
const seedL = (hex: string) => hexToOklch(hex).L

export function Body() {
  return (
    <>
      <Lead>
        The pipeline in execution order. Each step names the mechanism, the constants it reads (rendered
        from the engine, never typed), and the function that runs it.
      </Lead>
      <Pre>{`resolveTheme(input)                                   src/engine/resolve.ts
├─ resolveBrand(primaryHex)                            the primary, with the signal policy
│  ├─ generateScale(hex)                               src/engine/colorEngine.ts, the adapter
│  │  ├─ resolveRamp(hex, 'light', spec)               src/engine/requirements/resolve.ts
│  │  └─ resolveRamp(hex, 'dark', spec, { deltaLightStops, deltaCarry })
│  ├─ checkHueCollision · pickSignalShift              collision.ts, signalShift.ts
│  └─ redComplementVariant                             resolve.ts
├─ the secondary: derived, custom, or exact            resolve.ts, resolveTheme
├─ mergeSecondarySignals                               the secondary as a collider
└─ emit: brandCss / themeToFigma                       generateNeutralScale, resolveLinkInverseTrio run here`}</Pre>

      <H2 id="step-1">1. The theme is seeded</H2>
      <P>
        A primary hex, and optionally a secondary. With no secondary and <Code>deriveSecondary</Code> on, the
        secondary is derived from the primary (step 8). The neutral seeds from a tint hue rather than a hex: the
        primary's by default, the secondary's, or a custom hex's hue. The four signals seed from fixed hexes and are
        generated once when the module loads (<Code>SIGNAL_SCALES</Code>), then re-generated per brand only as a
        collision variant:
      </P>
      <Table
        head={['signal', 'emitted as', 'seed', 'L', 'C', 'H']}
        rows={SIGNALS.map(s => [s.name, s.emitName, <Code>{s.hex}</Code>, <K v={s.L} />, <K v={s.C} />, <K v={s.H} d={1} deg />])}
      />

      <H2 id="step-2">2. Everything moves to OKLCH</H2>
      <P>
        <Code>hexToOklch</Code> (colorMath.ts) decodes the seed. Every judgement from here on, chroma clamping, WCAG
        luminance, APCA luminance, the apparent-lightness solve, runs in the master gamut, Display P3
        (<Code>MASTER_GAMUT = '{MASTER_GAMUT}'</Code>). Only the emit converts back: a hex is the sRGB clamp-down of the
        resolved color, chroma reduced at constant lightness and hue, and a stop whose chroma exceeds sRGB also ships a{' '}
        <Code>color(display-p3)</Code> override in CSS.
      </P>
      <P>
        <Code>buildContext</Code> (producers.ts) then derives the per-seed state every producer reads:
      </P>
      <UL>
        <LI><b>Vividness</b> v = min(1, C / reference), reference = min(<K v={VIVID_C} />, the gamut's median chroma capacity at the seed's lightness). The cap is what keeps every vivid seed on the same ladder chroma; the lightness-aware reference is what keeps a pastel at its own ceiling from reading as a gray. A seed under C <K v={HUE_NOISE_C} /> is hue noise: no drift, no repel, no bell.</LI>
        <LI><b>Mutedness</b> (1 − v) / 0.55, and the warm envelope weight u that only the semi-muted warm seeds carry (a sigmoid toward the red-torsion center, a cream gate above H 105).</LI>
        <LI><b>The archetype</b>, by the seed's lightness, one of six anchors. It labels the seed; only an override pins the stamp to the band's median.</LI>
      </UL>
      <Table
        head={['archetype', 'L from', 'L to', 'median']}
        rows={ARCHETYPES.map(a => [a.name, <K v={a.min} d={2} />, <K v={a.max} d={2} />, <K v={a.medianL} />])}
      />

      <H2 id="step-3">3. The light ramp is generated</H2>
      <H3>Lightness: the apparent-lightness solve</H3>
      <P>
        Each stop declares a lightness target (<Code>ROOT_L_LIGHT</Code>, stopTable.ts). A stop is not placed at its
        target; it is placed at the measured lightness where its <i>apparent</i> lightness equals a shared target:
        the gray at rootL plus the mean Helmholtz-Kohlrausch boost at the stop's chroma, averaged over 18 hues
        (<Code>perceptualRungL</Code>, perceptualL.ts; the Nayatani 1997 model in <Code>apparentL</Code>). A saturated
        color looks brighter than a gray of the same luminance by a hue-dependent amount, large for blue, red and violet,
        small for yellow-green, so a high-boost hue is placed lower and a low-boost hue higher, and the stop reads the
        same on every brand.
      </P>
      <P>
        Live, for <Code>{stopTokenName(HK_STOP)}</Code> (target <K v={ROOT_L_LIGHT[HK_STOP]} />) at chroma <K v={HK_C} />: the
        shared apparent target is <K v={hkTarget} d={1} />; a blue at H 264° solves to L <K v={hkL(264)} />, a yellow-green
        at H 110° to L <K v={hkL(110)} />. They differ in measured lightness and match in apparent lightness.
      </P>
      <Table
        head={['stop', 'light rootL', 'ladder chroma (baseC)', 'envelope share (sat)']}
        rows={[
          [<Code>{PAPER_0}</Code>, <K v={1} />, <K v={SCALE_C_LIGHT[0].base!} />, <K v={SCALE_C_LIGHT[0].sat!} />],
          ...ladder.map(i => [<Code>{stopTokenName(i)}</Code>, <K v={ROOT_L_LIGHT[i]} />,
            SCALE_C_LIGHT[i].base !== undefined ? <K v={SCALE_C_LIGHT[i].base!} /> : <>text: min(<K v={SCALE_C_LIGHT[i].textMult!} /> × seed C, <K v={SCALE_C_LIGHT[i].textMaxC!} />)</>,
            SCALE_C_LIGHT[i].sat !== undefined ? <K v={SCALE_C_LIGHT[i].sat!} /> : '']),
        ]}
      />
      <P>
        Stop 0 is fixed at its extreme (white). The paper and highlighter targets grow apart geometrically, about
        1.25× per step, which is what keeps every seam open without a separation floor: the resolver still supports a
        declared minimum-separation requirement, but the shipped declaration carries none.
      </P>
      <H3>Hue: the seed hue plus two shifts</H3>
      <P>
        <Code>lightHueAt(L)</Code> (producers.ts) = seed hue + a warm drift + the red repel.
      </P>
      <UL>
        <LI>
          <b>The warm drift.</b> Warm seeds rotate toward the hue that stays clean at each lightness, a table from{' '}
          <K v={GOLD_SPINE[0][1]} d={0} deg /> at L <K v={GOLD_SPINE[0][0]} d={2} /> to <K v={GOLD_SPINE[GOLD_SPINE.length - 1][1]} d={0} deg /> at
          L <K v={GOLD_SPINE[GOLD_SPINE.length - 1][0]} d={2} /> (<Code>GOLD_SPINE</Code>). The drift is{' '}
          <K v={WARM_TORSION.travel} d={2} /> of the difference between the spine hue at the stop's lightness and at the
          seed's, weighted by a gaussian at 83° (σ 28°) plus the muted-warm term, fading to zero between H{' '}
          <K v={LIGHT_DRIFT_COOL_HI} d={0} /> and <K v={LIGHT_DRIFT_COOL_HI + LIGHT_DRIFT_COOL_RANGE} d={0} /> so a lemon keeps
          its hue, and by the seed's distance from the spine (gaussian, σ <K v={SPINE_OFFPATH_SIGMA} d={0} deg />). Capped at
          ±(<K v={WARM_TORSION.capDeg} d={0} /> + 8u) degrees. Dark gold and orange stay gold instead of going olive.
        </LI>
        <LI>
          <b>The red repel.</b> <Code>redRepelShiftDeg</Code> (colorMath.ts): a seed near the red signal's hue
          (<K v={RED_PIVOT_H} d={1} deg />) rotates its stops away from it by the nearest side, cooler below the pivot and
          warmer above, <K v={RED_COOL_DEG} d={1} deg /> scaled by a weight that fades with distance, with a{' '}
          <K v={RED_PIVOT_EXIT_DEG} d={0} deg /> floor right at the pivot. The stamp fill is exempt (it carries the identity
          hue); the signals themselves are exempt (they keep their identity hue).
        </LI>
      </UL>
      <H3>Chroma: a ladder, an envelope, a bell</H3>
      <P>
        For the paper, highlighter and crayon stops (<Code>lightScaleChromaAt</Code>): the ladder chroma is
        v × baseC × bell(L); the envelope chroma is the seed's saturation (its chroma over its gamut ceiling) × sat ×
        the gamut ceiling at the stop's lightness and hue; the emitted chroma blends from the ladder toward the envelope
        by u, so vivid seeds ride the hue-blind ladder and semi-muted warm seeds follow their own envelope. The bell is a
        declared lift for warm brands: centered at H <K v={BRAND_BELL_H} d={0} /> (σ <K v={BRAND_BELL_SIGMA} d={0} deg />), up
        to +<K v={BRAND_BELL_AMOUNT} pct d={0} />, ramping from nothing at L <K v={BRAND_BELL_L_LO} d={2} /> to full at L{' '}
        <K v={BRAND_BELL_L_HI} d={2} />, tapered out near the red signal (σ <K v={BRAND_BELL_RED_SIGMA} d={0} deg /> around{' '}
        <K v={BRAND_BELL_RED_H} d={1} deg />) so it never spends red's separation. Signals take the gold boost instead of
        the bell.
      </P>
      <P>
        For the pencil and pen stops (<Code>placeLightText</Code>): chroma = min(textMult × seed chroma, textMaxC), the
        text register ceiling in the table above; the solve consumes the normalized value. At emit every stop's chroma is
        clamped to the gamut at its final lightness and hue (<Code>clampChromaToGamut</Code>). Clamping reduces chroma
        only; hue never bends from clipping.
      </P>

      <H2 id="step-4">4. The dark ramp is generated</H2>
      <P>
        Dark resolves after light, from light: <Code>generateScale</Code> passes the resolved light stops into the dark
        resolve (<Code>deltaLightStops</Code>, <Code>deltaCarry</Code>), and each band takes its own path
        (requirements/resolve.ts, the dark branch):
      </P>
      <Table
        head={['stops', 'lightness', 'chroma', 'hue']}
        rows={[
          [<Code>{PAPER_0}</Code>, <>the apparent-lightness solve to rootL <K v={PAPER0_DARK_ROOT_L} d={2} />, floored at it: one seam below {stopTokenName(1)}, never black</>, 'the dark ladder at that depth', 'the dark torsion path'],
          [<>{stopTokenName(1)} to {stopTokenName(7)}</>, <>luminance parity on the achromatic scaffold: the shipped L* sits above the dark ground (gray at L <K v={ROOT_L_DARK[1]} />) by the band lift × the depth of the gray at the stop's light rootL below white, then the lightness is solved so the stop's own chroma and hue hit that L*. Every family lands at the same luminance per rung</>, "the light ramp's own chroma-at-depth, resampled at the lifted depth", 'carried from the light twin verbatim'],
          [<Code>{stopTokenName(8)}</Code>, <>placed by its requirement: from a sentinel at L 0.05, raised by bisection until it clears <K v={STOP_8_NONTEXT_CONTRAST} d={1} />:1 against the resolved dark {stopTokenName(3)}</>, "the light twin's chroma", "the light twin's hue"],
          [<>{stopTokenName(9)} to {stopTokenName(11)}</>, <>dark-native: the apparent-lightness solve to the dark scaffold (<K v={ROOT_L_DARK[9]} />, <K v={ROOT_L_DARK[10]} />, <K v={ROOT_L_DARK[11]} />), then the declared floors raise it if it fails</>, 'the text register: max(textMult × seed chroma, a declared floor) capped at textMaxC; curve-bearing ramps (the neutral, the derived secondary) take the light twin’s chroma', 'the dark torsion path'],
        ]}
      />
      <P>
        The band lift is computed, not declared: <Code>smoothedBandLift</Code> (producers.ts) places the interior so
        the band's log-contrast shares between the dark ground and the held top ({stopTokenName(7)} at{' '}
        <K v={DARK_BAND_TOP_LIFT} />) equal light's shares between white and {stopTokenName(7)}. The lifts today:
      </P>
      <Table
        head={ladder.slice(0, 7).map(i => stopTokenName(i))}
        rows={[ladder.slice(0, 7).map(i => <K v={smoothedBandLift(i)} d={3} />)]}
      />
      <P>
        The dark torsion path (<Code>torsionedHue</Code>, colorMath.ts) is the warm drift's dark twin: weight{' '}
        {WARM_TORSION.weight.map(([h, w]) => `${h}°→${w}`).join(', ')}, travel <K v={WARM_TORSION.travel} d={2} />, cap{' '}
        <K v={WARM_TORSION.capDeg} d={0} deg />, anchored at the dark stamp's lightness. Signal ramps re-derive{' '}
        <K v={DARK_SIGNAL_WARM_DRIFT} d={2} /> of the light drift at each dark stop's own lightness, so warning stays warm
        instead of reading olive; brands keep a mode-stable hue.
      </P>
      <Table
        head={['dark stop', 'dark rootL', 'chroma share (sat)', 'text register']}
        rows={ladder.map(i => [<Code>{stopTokenName(i)}</Code>, <K v={ROOT_L_DARK[i]} />,
          SCALE_C_DARK[i].sat !== undefined ? <K v={SCALE_C_DARK[i].sat!} /> : '',
          SCALE_C_DARK[i].textMult !== undefined ? <>min(<K v={SCALE_C_DARK[i].textMult!} /> × seed C, <K v={SCALE_C_DARK[i].textMaxC!} />), floor <K v={SCALE_C_DARK[i].chromaFloor!} /></> : ''])}
      />
      <P>
        The dark stamp fill does not carry: it anchors at max(seed L, floor), so a too-dark fill lifts and a vivid one is
        never pulled down. Floors: brands <K v={DARK_BRAND_FILL_MIN_L} d={2} />, the default <K v={DARK_CTA_MIN_L} d={2} /> (the
        red and yellow signals), green <K v={SIGNALS.find(s => s.name === 'green')!.darkFillMinL!} d={2} />, blue{' '}
        <K v={SIGNALS.find(s => s.name === 'blue')!.darkFillMinL!} d={2} />. Its chroma is the seed's × a trim for brands
        (<Code>darkCtaTrim</Code>: global <K v={DARK_CTA_C.brand.globalTrim} d={2} />, lobes at{' '}
        {DARK_CTA_C.brand.lobes.map(l => `${l.center}° (width ${l.width}, depth ${l.depth})`).join(' and ')}); signals keep
        their identity chroma so canonical red and yellow read the same in both modes.
      </P>

      <H2 id="step-5">5. Requirements</H2>
      <P>
        Each stop resolves in three phases: <b>produce</b> (hue, chroma, lightness as above), <b>require</b> (a declared
        floor binds), <b>refine</b> (chroma yields to the gamut at emit). The declaration is pure data
        (requirements/spec.ts); the resolver executes it (requirements/resolve.ts). Stops resolve in order, so a floor
        references the resolved ground it names, never a cached value.
      </P>
      <Table
        head={['stop', 'light', 'dark']}
        rows={[0, ...ladder].map(i => [<Code>{i === 0 ? PAPER_0 : stopTokenName(i)}</Code>,
          reqText(MODE_SPECS.light.stops.find(s => s.stop === i)?.require),
          reqText(MODE_SPECS.dark.stops.find(s => s.stop === i)?.require)])}
      />
      <UL>
        <LI><b>Grounds.</b> The crayon and the pencil solve against {stopTokenName(3)}, the nearest paper, so clearing it clears every paper; {stopTokenName(10)} against {stopTokenName(7)}, the darkest highlighter; {stopTokenName(11)} against {stopTokenName(3)}. The inverse link family replaces every pen ground with the worst shipped {stopTokenName(11)}.</LI>
        <LI><b>Light.</b> The floor clamps lightness down: L = min(L, the highest L that clears the ratio against the ground's luminance), iterated to a fixed point (up to six passes, since chroma and hue move with L). The scale solve carries a +0.05 ratio margin so the gamut-trimmed emit still clears; the pen solve does not.</LI>
        <LI><b>Dark.</b> The floor raises lightness: if the placement misses the target, bisection walks L up until it clears (+0.05). The crayon solves from the ground up every time; the pens usually clear from the scaffold.</LI>
        <LI><b>Legality on both renditions.</b> The ratio a floor judges is the minimum over the P3 rendition and the sRGB clamp-down (<Code>legalRatio</Code>), so a pass holds on any display.</LI>
        <LI><b>The shipped pair.</b> After the analytic solve, the 8-bit sRGB pair (stop and ground, both quantized) is checked, together with the cross-family bounds on the <DocLink page="guarantees" section="what-every-paper-means">Guarantees</DocLink> page; a stop that misses walks away from its ground in steps of 0.001 L until it clears.</LI>
        <LI><b>Fail loud.</b> A floor that still cannot be met marks the stop <Code>unresolvable</Code>; the requirement gate then fails.</LI>
      </UL>

      <H2 id="step-6">6. The stamp is generated</H2>
      <P>
        The stamp is not a stop. It anchors at the seed's own lightness, so it can sit anywhere on the ladder, and it is
        the one value that differs per family. In evaluation order (requirements/resolve.ts, the roles block):
      </P>
      <UL>
        <LI><b>The pole, judged first.</b> <Code>onTextIsWhite</Code> (colorMath.ts) at the seed: the pole that reads better on the fill (judged with APCA). The chosen pole must pass <K v={ONS.ratioFloor!} d={1} />:1; if white is preferred and misses, it flips to black when black passes and reads clearly.</LI>
        <LI><b>The enforce re-solve.</b> If white is still preferred and misses 4.5:1, the fill darkens until white clears 4.6:1 (<Code>ctaLightL</Code>). A brand within two rings of the red region is not darkened toward red; it flips to black instead when black already passes.</LI>
        <LI><b>The booster.</b> The one place APCA is used: once the law is met, the fill moves in the chosen pole's direction until that pole reads APCA Lc <K v={CO_LC} d={0} /> (critical <K v={CRITICAL_CLEARANCE_LC} d={0} />), firing at the bar + <K v={APCA_ENFORCE_MARGIN_LC} d={1} /> and solving +<K v={APCA_SOLVE_MARGIN_LC} d={1} /> past it, capped at L <K v={CTA_CLEARANCE_CAPS[0]} d={2} /> and <K v={CTA_CLEARANCE_CAPS[1]} d={2} />; 4.5:1 is never capped (<Code>ctaDualGateL</Code>). A legibility nudge on the stamp, not a requirement.</LI>
        <LI><b>The red exit.</b> A fill inside the red signal's region leaves it by the nearest edge that has a passing pole (<Code>solveBrandExit</Code>; step 7).</LI>
        <LI><b>States.</b> Hover and pressed step <K v={stateStepL(0.5, 'light', 1)} d={2} /> and <K v={stateStepL(0.5, 'light', 2)} d={2} /> L away from the mode's ground (<Code>stateFillL</Code>, archetypes.ts), toward black in light and white in dark, reversed for fills below L <K v={ARCHETYPES.find(a => a.name === 'rich')!.min} d={2} /> in light or above L <K v={ARCHETYPES.find(a => a.name === 'light')!.min} d={2} /> in dark, which have no room to travel.</LI>
        <LI><b>Dark.</b> The anchor is max(seed L, floor) (step 4); the derived secondary uses a flat register instead, an apparent distance of <K v={DEFAULT_SECONDARY.darkFlatGapApp} d={0} /> above the dark ground. Then the same enforce, booster and exit run on the dark geometry; the dark exit is keyed on a side-by-side metric (P2, bar <K v={P2_D} d={2} />).</LI>
        <LI><b>The pole, judged last.</b> At the fill that ships: if the chosen pole misses 4.5:1 and the other clears, it flips.</LI>
        <LI><b>The edge.</b> <Code>{STAMP_EDGE}</Code> resolves to the family's alpha rung (primary and signals <K v={OFFSET_ALPHAS[16]} pct d={0} />, secondary <K v={OFFSET_ALPHAS[6]} pct d={0} />, neutral <K v={OFFSET_ALPHAS[8]} pct d={0} />) when the fill reads under APCA |Lc| <K v={CTA_BORDER_LC_FLOOR} d={0} /> against the page (the neutral's {stopTokenName(2)} in light, {stopTokenName(1)} in dark), else transparent. Taste, not accessibility.</LI>
        <LI><b>Quiet fills.</b> The neutral's stamp and a secondary's carry <Code>{STAMP_ON}</Code> as the pole at alpha, <K v={SOFT_ON_CTA_ALPHA.light} pct d={0} /> light / <K v={SOFT_ON_CTA_ALPHA.dark} pct d={0} /> dark, where the composite clears 4.5:1 on rest, hover and pressed (<Code>softOnCtaPasses</Code>); the neutral always does, a failing secondary keeps the solid pole.</LI>
        <LI><b>The text-style action</b> has no separate tokens: it is {stopTokenName(9)} at rest, {stopTokenName(10)} on hover, {stopTokenName(11)} pressed.</LI>
      </UL>
      <P>
        The five tokens: <Code>{STAMP_FILL}</Code>, <Code>{STAMP_FILL_HOVER}</Code>, <Code>{STAMP_FILL_PRESSED}</Code>,{' '}
        <Code>{STAMP_EDGE}</Code>, <Code>{STAMP_ON}</Code>.
      </P>

      <H2 id="step-7">7. Collision checks</H2>
      <P>
        The resolved brand is compared with the four signals. One test decides the whole-ramp remedies for yellow,
        green and blue (<Code>checkHueCollision</Code>, collision.ts): the smallest hue distance between the brand's and
        the signal's highlighter stops, in either mode, is within the gate, and the brand is vivid enough to collide. Red
        has its own machinery, the joint solve: the brand's stamp exits red's region by its nearest edge, and the red
        signal re-seats on the far side of the brand when canonical red would still sit too close. A residual overlap
        ships as advice, never a silent move. The thresholds, the per-signal resolutions and the red solve's rules are on
        the <DocLink page="signals">Signals and companions</DocLink> page.
      </P>
      <P>
        The membership metric for red (<Code>redSolveDist</Code>) is a weighted distance from red's stamp: darker persists
        as danger (weight <K v={RED_SOLVE.wDark} d={2} />), lighter pinkifies fast (<K v={RED_GATE.wLight} d={2} />), dust kills
        it fast (<K v={RED_GATE.wDust} d={2} />), the gold side exits faster than the magenta side (<K v={RED_GATE.wGoldArc} d={2} />).
        Inside radius <K v={RED_GATE.G} d={3} /> the brand is a member; release is <K v={RED_GATE.G + RED_SOLVE.ring} d={3} />.
        Signal variants are output-only: they replace the signal's ramp in the emitted theme and never re-enter the brand's
        generation.
      </P>

      <H2 id="step-8">8. Companions</H2>
      <UL>
        <LI><b>The derived secondary</b> is the primary's seed lifted toward the light pole by <K v={DEFAULT_SECONDARY.kL} pct d={0} /> of the room up to L <K v={DEFAULT_SECONDARY.lRoom} d={2} />, chroma <K v={DEFAULT_SECONDARY.kC} pct d={0} /> of the seed's and at most <K v={DEFAULT_SECONDARY.kR} pct d={0} /> of the gamut ceiling at the landing, hue unchanged, kept at least <K v={DEFAULT_SECONDARY.minGapApp} d={0} /> apparent-L off white, then resolved as a normal ramp with the flat dark stamp register. A supplied hex with the default style keeps its own ramp and takes only the stamp trio from this transform; exact ships everything as given; outline is exact with the fill re-expressed at emit.</LI>
        <LI><b>The neutral</b> is a near-gray at the tint hue run through the same generator with its own chroma curve, at one of four strengths. Its stamp is quiet: the rest fill is the scale's own {stopTokenName(4)}, lifted in dark until it clears the high plane, with the states stepped from it.</LI>
        <LI><b>The link</b> aliases the primary's three text stops; a custom seed resolves its own; the inverse trio re-solves the same seed for text on {stopTokenName(11)} fills.</LI>
      </UL>
      <P>Constants and offerings are on the <DocLink page="signals" section="companions">Signals and companions</DocLink> page.</P>

      <H2 id="step-9">9. Your levers</H2>
      <UL>
        <LI><Code>primaryMode: 'exact'</Code>: the stamp fill and identity ship as typed; on-fill enforcement, the dark red repel and the dark chroma trim are off; the ramp still resolves under every floor and the signals still move.</LI>
        <LI><Code>primaryArchetype</Code>: pins the stamp's anchor to the band's median lightness and leaves the ramp alone; the red joint solve is off (it is pair-calibrated).</LI>
        <LI><Code>style: 'deeper'</Code>: for semi-muted warm seeds (H <K v={DEEPER_BAND_H_LO} d={0} /> to <K v={DEEPER_BAND_H_HI} d={0} />, mid mutedness) raises the envelope weight by <K v={DEEPER_STRENGTH} pct d={0} /> of the remaining room, toward the cream and brown envelope; a no-op outside the band. <Code>'full-chroma'</Code> releases the vividness cap; API only, outside the guarantees.</LI>
        <LI><Code>secondaryStyle</Code>, <Code>secondaryArchetype</Code>, <Code>deriveSecondary</Code>: step 8.</LI>
        <LI>The neutral's tint source and strength (<Code>neutralTintHue</Code>, <Code>NeutralLevel</Code>), a custom link seed, the stamp escape (the brand's stamp trio re-expressed from the neutral's {stopTokenName(11)} at emit, for red collisions) and the edge opt-out: emitter inputs, on the <DocLink page="install">Install and API</DocLink> page.</LI>
      </UL>
      <Note>
        The seed's own lightness for the reference seed is L <K v={seedL('#E93D82')} />; every value on this page is
        read from the engine's declarations and would change with them.
      </Note>
    </>
  )
}
