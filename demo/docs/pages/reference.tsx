import React from 'react'
import { H2, H3, P, Code, Lead, Table, DocLink, K } from '../prose'
import { ROOT_L_LIGHT, ROOT_L_DARK, STOP_8_NONTEXT_CONTRAST, PENCIL_9_CONTRAST, PEN_10_CONTRAST, PEN_11_CONTRAST_FLOOR, DARK_CTA_MIN_L, DARK_BRAND_FILL_MIN_L, DARK_BAND_TOP_LIFT, DARK_SIGNAL_WARM_DRIFT, NEUTRAL_CTA_DARK_POP_CLEARANCE, GOLD_SPINE, WARM_TORSION, DARK_CTA_C, YELLOW_BAND } from '../../../src/engine/stopTable'
import { PAPER0_DARK_ROOT_L, MODE_SPECS } from '../../../src/engine/requirements/spec'
import { NEUTRAL_P3_WORST_SHIP_Y, NEUTRAL_W80_WORST_SHIP_Y, CHROMATIC_P3_WORST_SHIP_Y, CHROMATIC_W80_WORST_SHIP_Y, CTA_CLEARANCE_CAPS } from '../../../src/engine/requirements/resolve'
import { APCA_ENFORCE_MARGIN_LC, APCA_SOLVE_MARGIN_LC } from '../../../src/engine/requirements/producers'
import { CRITICAL_CLEARANCE_LC } from '../../../src/engine/requirements/profiles'
import { VIVID_C, HUE_NOISE_C, MUTED_BLEND_DENOM, SPINE_OFFPATH_SIGMA, LIGHT_DRIFT_COOL_HI, LIGHT_DRIFT_COOL_RANGE, BRAND_BELL_H, BRAND_BELL_SIGMA, BRAND_BELL_AMOUNT, BRAND_BELL_L_HI, BRAND_BELL_L_LO, BRAND_BELL_RED_H, BRAND_BELL_RED_SIGMA, CREAM_UPPER_H, CREAM_UPPER_SOFTNESS, DEEPER_BAND_H_LO, DEEPER_BAND_H_HI, DEEPER_BAND_U_LO, DEEPER_BAND_U_HI, DEEPER_STRENGTH, RED_PIVOT_H, RED_COOL_DEG, RED_PIVOT_EXIT_DEG, RED_TORSION_CENTER_H, RED_TORSION_SOFTNESS, RED_BAND_LO_H, RED_WARM_EXIT_H, RED_GATE, RED_SOLVE, RED_KEEP_BOX, DARK_FLOOR_FULL_C, DARK_FLOOR_MUTED_MAX_C } from '../../../src/engine/colorMath'
import { MASTER_GAMUT } from '../../../src/engine/constraints'
import { ARCHETYPES, stateStepL } from '../../../src/engine/archetypes'
import { HUE_COLLISION_HIGHLIGHTER_DEG, HUE_COLLISION_MIN_V, YELLOW_SPLIT_H, HUE_GATE_DEG, DELTA_E_THRESHOLD, DARK_DELTA_E_THRESHOLD } from '../../../src/engine/collision'
import { SHIFT_RULES } from '../../../src/engine/signalShift'
import { P2_D, P2_D_UP } from '../../../src/engine/p2'
import { DEFAULT_SECONDARY, SOFT_ON_CTA_ALPHA, OUTLINE_HOVER_ALPHA, OUTLINE_PRESSED_ALPHA, DEFAULT_LINK_HEX, SECONDARY_DISTINCT_DELTA_E } from '../../../src/engine/resolve'
import { CTA_BORDER_LC_FLOOR, OFFSET_ALPHAS, SHADOW_ALPHAS, SCRIM_ALPHA, DISABLED_OPACITY } from '../../../src/engine/cssRender'
import { SIGNALS } from '../../../src/engine/signals'
import { stopTokenName, SCALE_STOP_COUNT, PAPER_0 } from '../../../src/engine/tokenNames'

export const slug = 'reference'
export const title = 'Reference'

type Row = [React.ReactNode, React.ReactNode, string]
const k = (v: number, d = 3) => <K v={v} d={d} />
const list = (xs: readonly number[]) => xs.join(', ')

export function Body() {
  return (
    <>
      <Lead>
        The vocabulary the other pages use, every constant the engine declares (rendered live, grouped by the file
        that owns it), and the option types.
      </Lead>

      <H2>Glossary</H2>
      <Table
        head={['term', 'meaning']}
        rows={[
          ['stop', <>one of the {SCALE_STOP_COUNT} positions of the scale, plus the two poles. Indexed 1 to 11 inside the engine; named by instrument and number outside it</>],
          ['instrument (band)', 'paper, highlighter, crayon, pencil, pen: the law a stop serves. The name says what the stop is for, not where it sits'],
          ['rootL', 'the declared lightness target a stop is solved from (the scaffold). Not the emitted lightness'],
          ['apparent lightness', 'lightness as seen: OKLCH L corrected for the Helmholtz-Kohlrausch effect (a saturated color reads brighter than a gray of equal luminance). The light ramp solves every stop in this space'],
          ['luminance (Y)', 'relative luminance, the photometric quantity WCAG ratios are computed from. The dark paper and highlighter stops are placed by luminance parity'],
          ['the shipped pair', 'a stop and its ground as they ship: both quantized to 8-bit sRGB. The value a browser and an audit tool measure; every claim is judged on it'],
          ['produce, require, refine', 'the three phases a stop resolves through: the producers place it (hue, chroma, lightness), a declared floor binds, chroma yields to the gamut at emit'],
          ['producer', 'a named placement rule (warm-drift, perceptual, ladder). A reference to a versioned resolver capability, never a formula in the token file'],
          ['requirement (floor)', 'a declared contrast the stop must clear against a resolved ground. A floor: a placement that already clears does not move'],
          ['anchor, ground', 'the resolved stop a requirement is judged against. The declaration names the anchor; the resolver may re-anchor a text stop at the nearest paper'],
          ['bound', 'a frozen worst-case ground (the darkest neutral paper any theme ships, and so on) the resolver holds a stop against, because the paired family is not in view during a solve'],
          ['seam', 'the lightness gap between adjacent stops. Held open by the ladder shape, not by a floor'],
          ['pole', 'pure white or pure black. The on-text candidates; also the two ladder extremes'],
          ['stamp', 'the pulled-out solid fill and its states, edge and text. Off the scale; the one per-family differentiator. The engine\'s internal fields still call it cta'],
          ['quiet fill', "a stamp that sits near the page: the neutral's, and the derived secondary's. Its text is the pole at alpha"],
          ['booster', 'the one use of APCA: a legibility nudge on the stamp fill, applied after the WCAG law is met; never a claim'],
          ['archetype', "one of six lightness bands a seed falls in. An override pins the stamp to the band's median"],
          ['identity', 'the exact input hex, emitted untouched for logos'],
          ['carry (delta)', 'the dark model: the dark ramp derived from the resolved light ramp'],
          ['torsion, drift', 'the hue rotation warm seeds take toward the clean warm hue at each lightness: drift in light, torsion in dark'],
          ['repel', 'the hue rotation a near-red seed takes away from the red signal'],
          ['collision', 'a brand close enough to a signal that the two read as one family; decided on the highlighter stops'],
          ['variant', "a signal re-generated from an alternate seed to stay distinct from the brand; replaces the signal's ramp in the emitted theme"],
          ['zone', "the extended plugin's path prefix: base/ (engine-owned) or utility/ (team-touchable)"],
          ['descope', 'the plugin posture that hides non-role rows from Figma pickers'],
        ]}
      />

      <H2>Constants</H2>
      <P>
        Grouped by the file that declares them. Every value below is imported from the engine; the tables on the{' '}
        <DocLink page="generation">generation</DocLink> page render the per-stop ladders and chroma tables in full.
      </P>
      <H3>stopTable.ts</H3>
      <Table head={['name', 'value', 'what it is']} rows={[
        [<Code>ROOT_L_LIGHT</Code>, list(Object.values(ROOT_L_LIGHT)), 'the light lightness targets, stops 1 to 11'],
        [<Code>ROOT_L_DARK</Code>, list(Object.values(ROOT_L_DARK)), 'the dark lightness targets, stops 1 to 11'],
        [<Code>STOP_8_NONTEXT_CONTRAST</Code>, k(STOP_8_NONTEXT_CONTRAST, 1), `${stopTokenName(8)}'s ratio`],
        [<Code>PENCIL_9_CONTRAST</Code>, k(PENCIL_9_CONTRAST, 1), `${stopTokenName(9)}'s ratio`],
        [<Code>PEN_10_CONTRAST</Code>, k(PEN_10_CONTRAST, 1), `${stopTokenName(10)}'s ratio, against ${stopTokenName(7)}`],
        [<Code>PEN_11_CONTRAST_FLOOR</Code>, k(PEN_11_CONTRAST_FLOOR, 1), `${stopTokenName(11)}'s declared target`],
        [<Code>DARK_CTA_MIN_L</Code>, k(DARK_CTA_MIN_L, 2), 'the default dark stamp floor'],
        [<Code>DARK_BRAND_FILL_MIN_L</Code>, k(DARK_BRAND_FILL_MIN_L, 2), "a brand's dark stamp floor"],
        [<Code>DARK_BAND_TOP_LIFT</Code>, k(DARK_BAND_TOP_LIFT), `the held lift of dark ${stopTokenName(7)}; the interior lifts are computed from it`],
        [<Code>DARK_SIGNAL_WARM_DRIFT</Code>, k(DARK_SIGNAL_WARM_DRIFT, 3), 'the fraction of the light drift a dark signal stop re-derives'],
        [<Code>NEUTRAL_CTA_DARK_POP_CLEARANCE</Code>, k(NEUTRAL_CTA_DARK_POP_CLEARANCE, 1), `the ratio the neutral's dark stamp clears against dark ${stopTokenName(2)}`],
        [<Code>GOLD_SPINE</Code>, GOLD_SPINE.map(([l, h]) => `L ${l} → ${h}°`).join(', '), 'the clean warm hue per lightness'],
        [<Code>WARM_TORSION</Code>, <>weight {WARM_TORSION.weight.map(([h, w]) => `${h}°→${w}`).join(', ')}; travel {k(WARM_TORSION.travel, 2)}; cap {k(WARM_TORSION.capDeg, 0)}°</>, 'the dark torsion curve'],
        [<Code>DARK_CTA_C</Code>, <>brand: trim {k(DARK_CTA_C.brand.globalTrim, 2)}, lobes {DARK_CTA_C.brand.lobes.map(l => `${l.center}°/${l.width}/${l.depth}`).join(', ')}; signal: identity</>, 'the dark stamp chroma register'],
        [<Code>YELLOW_BAND</Code>, <>center {k(YELLOW_BAND.centerH, 0)}°, σ {k(YELLOW_BAND.sigmaDeg, 0)}°</>, 'the yellow hue band the audits scope checks to'],
      ] as Row[]} />
      <H3>requirements/spec.ts, resolve.ts, producers.ts</H3>
      <Table head={['name', 'value', 'what it is']} rows={[
        [<Code>PAPER0_DARK_ROOT_L</Code>, k(PAPER0_DARK_ROOT_L, 2), `dark ${PAPER_0}'s target`],
        [<Code>ons.onFill</Code>, <>enforce {String(MODE_SPECS.light.ons.onFill.enforce)}, ratioFloor {k(MODE_SPECS.light.ons.onFill.ratioFloor!, 1)}, coEnforceLc {k(MODE_SPECS.light.ons.onFill.coEnforceLc!, 0)}</>, 'the on-fill law'],
        [<Code>NEUTRAL_P3_WORST_SHIP_Y</Code>, <>light {k(NEUTRAL_P3_WORST_SHIP_Y.light, 6)}, dark {k(NEUTRAL_P3_WORST_SHIP_Y.dark, 6)}</>, `the worst neutral ${stopTokenName(3)} any theme ships`],
        [<Code>NEUTRAL_W80_WORST_SHIP_Y</Code>, <>light {k(NEUTRAL_W80_WORST_SHIP_Y.light, 6)}, dark {k(NEUTRAL_W80_WORST_SHIP_Y.dark, 6)}</>, `the worst neutral ${stopTokenName(7)}`],
        [<Code>CHROMATIC_P3_WORST_SHIP_Y</Code>, <>light {k(CHROMATIC_P3_WORST_SHIP_Y.light, 6)}, dark {k(CHROMATIC_P3_WORST_SHIP_Y.dark, 6)}</>, `the worst chromatic ${stopTokenName(3)}`],
        [<Code>CHROMATIC_W80_WORST_SHIP_Y</Code>, <>light {k(CHROMATIC_W80_WORST_SHIP_Y.light, 6)}, dark {k(CHROMATIC_W80_WORST_SHIP_Y.dark, 6)}</>, `the worst chromatic ${stopTokenName(7)}`],
        [<Code>CTA_CLEARANCE_CAPS</Code>, `L ${CTA_CLEARANCE_CAPS[0]} to ${CTA_CLEARANCE_CAPS[1]}`, 'the lightness range the clearance may move a fill within'],
        [<Code>APCA_ENFORCE_MARGIN_LC</Code>, k(APCA_ENFORCE_MARGIN_LC, 1), "the booster's fire margin above its bar"],
        [<Code>APCA_SOLVE_MARGIN_LC</Code>, k(APCA_SOLVE_MARGIN_LC, 1), "the booster's solve margin past its bar"],
        [<Code>CRITICAL_CLEARANCE_LC</Code>, k(CRITICAL_CLEARANCE_LC, 0), "the booster's bar for the critical signal"],
      ] as Row[]} />
      <H3>colorMath.ts, constraints.ts</H3>
      <Table head={['name', 'value', 'what it is']} rows={[
        [<Code>MASTER_GAMUT</Code>, MASTER_GAMUT, 'the gamut every judgement runs in; emit clamps to sRGB'],
        [<Code>VIVID_C</Code>, k(VIVID_C, 2), 'the vividness reference chroma'],
        [<Code>HUE_NOISE_C</Code>, k(HUE_NOISE_C, 3), 'below this chroma a seed is hue noise'],
        [<Code>MUTED_BLEND_DENOM</Code>, k(MUTED_BLEND_DENOM, 2), 'mutedness = (1 − v) / this'],
        [<Code>SPINE_OFFPATH_SIGMA</Code>, k(SPINE_OFFPATH_SIGMA, 0), 'σ of the off-spine gaussian, degrees'],
        [<Code>LIGHT_DRIFT_COOL_HI</Code>, <>{k(LIGHT_DRIFT_COOL_HI, 0)}° to {k(LIGHT_DRIFT_COOL_HI + LIGHT_DRIFT_COOL_RANGE, 0)}°</>, 'where the light drift fades to zero'],
        [<Code>BRAND_BELL_*</Code>, <>H {k(BRAND_BELL_H, 0)}°, σ {k(BRAND_BELL_SIGMA, 0)}°, amount {k(BRAND_BELL_AMOUNT, 2)}, L {k(BRAND_BELL_L_LO, 2)} to {k(BRAND_BELL_L_HI, 2)}, red exclusion σ {k(BRAND_BELL_RED_SIGMA, 0)}° at {k(BRAND_BELL_RED_H, 1)}°</>, 'the warm chroma bell for brands'],
        [<Code>CREAM_UPPER_H</Code>, <>{k(CREAM_UPPER_H, 0)}° (softness {k(CREAM_UPPER_SOFTNESS, 0)})</>, 'the cream gate on the envelope weight'],
        [<Code>DEEPER_*</Code>, <>H {k(DEEPER_BAND_H_LO, 0)} to {k(DEEPER_BAND_H_HI, 0)}, u {k(DEEPER_BAND_U_LO, 2)} to {k(DEEPER_BAND_U_HI, 2)}, strength {k(DEEPER_STRENGTH, 2)}</>, "the 'deeper' style's band and strength"],
        [<Code>RED_PIVOT_H</Code>, <>{k(RED_PIVOT_H, 1)}°</>, 'the red repel watershed (the red signal hue)'],
        [<Code>RED_COOL_DEG</Code>, <>{k(RED_COOL_DEG, 1)}°</>, 'the repel magnitude'],
        [<Code>RED_PIVOT_EXIT_DEG</Code>, <>{k(RED_PIVOT_EXIT_DEG, 0)}°</>, 'the repel floor at the pivot'],
        [<Code>RED_TORSION_CENTER_H</Code>, <>{k(RED_TORSION_CENTER_H, 1)}° (softness {k(RED_TORSION_SOFTNESS, 1)})</>, 'the red side of the warm weight'],
        [<Code>RED_BAND_LO_H</Code>, <>{k(RED_BAND_LO_H, 0)}°</>, 'the red band’s lower edge'],
        [<Code>RED_WARM_EXIT_H</Code>, <>{k(RED_WARM_EXIT_H, 0)}°</>, 'where the warm-side repel fades'],
        [<Code>RED_GATE</Code>, <>wDark {k(RED_GATE.wDark, 2)}, wLight {k(RED_GATE.wLight, 2)}, wDust {k(RED_GATE.wDust, 2)}, wGoldArc {k(RED_GATE.wGoldArc, 2)}, G {k(RED_GATE.G, 3)}</>, 'the at-a-glance red-family metric and its radius'],
        [<Code>RED_SOLVE</Code>, <>wDark {k(RED_SOLVE.wDark, 2)}, ring {k(RED_SOLVE.ring, 3)}, core L {list(RED_SOLVE.coreL)}, edge L {list(RED_SOLVE.edgeL)}, bright cut {k(RED_SOLVE.trueRedBrightCut, 2)}, brick H {RED_SOLVE.brickHLo} to {RED_SOLVE.brickHHi}, L {RED_SOLVE.brickLLo} to {RED_SOLVE.brickLHi}</>, 'the joint solve’s geometry'],
        [<Code>RED_KEEP_BOX</Code>, <>H {RED_KEEP_BOX.hLo} to {RED_KEEP_BOX.hHi}, C ≥ {RED_KEEP_BOX.cMin}, L {RED_KEEP_BOX.lLo} to {RED_KEEP_BOX.lHi}</>, 'brands whose identity is a credible error color'],
        [<Code>DARK_FLOOR_FULL_C</Code>, <>{k(DARK_FLOOR_FULL_C, 3)} (muted max {k(DARK_FLOOR_MUTED_MAX_C, 2)})</>, 'the dark chroma-floor strength ramp'],
      ] as Row[]} />
      <H3>archetypes.ts, collision.ts, signalShift.ts, p2.ts</H3>
      <Table head={['name', 'value', 'what it is']} rows={[
        [<Code>ARCHETYPES</Code>, ARCHETYPES.map(a => `${a.name} ${a.min} to ${a.max}`).join(', '), 'the six lightness bands'],
        [<Code>stateStepL</Code>, <>{k(stateStepL(0.5, 'light', 1), 2)} hover, {k(stateStepL(0.5, 'light', 2), 2)} pressed</>, 'the flat state step in L'],
        [<Code>HUE_COLLISION_HIGHLIGHTER_DEG</Code>, <>{k(HUE_COLLISION_HIGHLIGHTER_DEG, 0)}°</>, 'the hue collision gate'],
        [<Code>HUE_COLLISION_MIN_V</Code>, k(HUE_COLLISION_MIN_V, 1), 'the vividness qualifier'],
        [<Code>YELLOW_SPLIT_H</Code>, <>{k(YELLOW_SPLIT_H, 0)}°</>, 'below: lemon'],
        [<Code>SHIFT_RULES</Code>, <>green split {SHIFT_RULES.green!.splitH}°, blue split {SHIFT_RULES.blue!.splitH}°</>, 'the swap splits'],
        [<Code>checkCollision</Code>, <>hue ≤ {k(HUE_GATE_DEG, 0)}°, ΔE ≤ {k(DELTA_E_THRESHOLD, 2)} light / {k(DARK_DELTA_E_THRESHOLD, 2)} dark</>, 'the audit-only value test'],
        [<Code>P2_D</Code>, <>{k(P2_D, 2)} (up: {k(P2_D_UP, 2)})</>, 'the side-by-side distinctness bar'],
        [<Code>SIGNALS</Code>, SIGNALS.map(s => `${s.name} ${s.hex}`).join(', '), 'the canonical seeds'],
      ] as Row[]} />
      <H3>resolve.ts, cssRender.ts</H3>
      <Table head={['name', 'value', 'what it is']} rows={[
        [<Code>DEFAULT_SECONDARY</Code>, Object.entries(DEFAULT_SECONDARY).map(([n, v]) => `${n} ${v}`).join(', '), 'the derived secondary transform'],
        [<Code>SECONDARY_DISTINCT_DELTA_E</Code>, k(SECONDARY_DISTINCT_DELTA_E, 2), 'the primary-versus-secondary advice threshold'],
        [<Code>SOFT_ON_CTA_ALPHA</Code>, <>light {k(SOFT_ON_CTA_ALPHA.light, 2)}, dark {k(SOFT_ON_CTA_ALPHA.dark, 2)}</>, 'the quiet fill’s text alpha'],
        [<Code>OUTLINE_HOVER_ALPHA</Code>, <>{k(OUTLINE_HOVER_ALPHA, 2)} (pressed {k(OUTLINE_PRESSED_ALPHA, 2)})</>, 'the outline secondary’s state tints'],
        [<Code>DEFAULT_LINK_HEX</Code>, DEFAULT_LINK_HEX, 'the custom link’s default seed'],
        [<Code>CTA_BORDER_LC_FLOOR</Code>, k(CTA_BORDER_LC_FLOOR, 0), 'the stamp edge gate'],
        [<Code>OFFSET_ALPHAS</Code>, Object.entries(OFFSET_ALPHAS).map(([r, a]) => `${r}: ${a}`).join(', '), 'the alpha ladder rungs'],
        [<Code>SHADOW_ALPHAS</Code>, Object.entries(SHADOW_ALPHAS).map(([r, a]) => `${r}: ${a.light} / ${a.dark}`).join(', '), 'the shadow rungs, light / dark'],
        [<Code>SCRIM_ALPHA</Code>, k(SCRIM_ALPHA, 2), 'the scrim'],
        [<Code>DISABLED_OPACITY</Code>, k(DISABLED_OPACITY, 2), 'the disabled opacity'],
      ] as Row[]} />

      <H2>Option types</H2>
      <P>
        <Code>resolveTheme</Code>'s input is on the <DocLink page="install" section="the-entry-points">Install and API</DocLink> page.
        The two lower-level option objects:
      </P>
      <H3>GenerateOptions (generateScale, resolveRamp)</H3>
      <Table head={['field', 'meaning']} rows={[
        [<Code>style</Code>, "'default' | 'deeper' | 'full-chroma'"],
        [<Code>enforceOnFillContrast</Code>, 'the on-fill law; generateScale defaults it off, resolveBrand turns it on except in exact mode'],
        [<Code>apcaClearance</Code>, 'the stamp legibility booster (default on for brand-kind resolution); apcaClearanceLc overrides its bar per call'],
        [<Code>darkFillMinL</Code>, 'the dark stamp floor'],
        [<Code>darkCtaC</Code>, "'brand' (trimmed) | 'signal' (identity): the dark stamp chroma register"],
        [<Code>coolRedDark</Code>, 'the red repel on the dark hue path (brands)'],
        [<Code>suppressRedCool</Code>, 'no red repel at all (signals)'],
        [<Code>goldBoost</Code>, 'the gold chroma boost (signals)'],
        [<Code>signalWarmDrift</Code>, 'dark stops re-derive part of the light drift (signals)'],
        [<Code>chromaCurve</Code>, 'a declared chroma curve replaces the ladder (the neutral)'],
        [<Code>darkChromaCurve</Code>, 'the dark chroma equalizer, and the gate for the dark stamp trim'],
        [<Code>ctaSolve</Code>, 'the red joint solve inputs, injected by resolveBrand'],
        [<Code>darkCtaFlatApp</Code>, 'the flat dark stamp register (the derived secondary)'],
        [<Code>textGround</Code>, 'an external ground for the pen stops (the inverse link)'],
        [<><Code>crossHighlighterBoundY</Code>, <Code>crossPaperBoundY</Code></>, 'the neutral’s symmetric bounds, passed by generateNeutralScale'],
        [<><Code>hueShiftDeg</Code>, <Code>chromaScale</Code></>, 'the lemon variant’s inputs'],
        [<><Code>deltaLightStops</Code>, <Code>deltaCarry</Code></>, 'the dark carry inputs, always set by generateScale'],
        [<><Code>deltaHKPlace</Code>, <Code>deltaLiftFloor</Code>, <Code>deltaChromaEq</Code></>, 'instruments only: layer one retired dark mechanism onto the carry for comparison; never shipped'],
        [<><Code>heat</Code>, <Code>subtleChromaScale</Code></>, 'chroma multipliers on the whole ramp and on the ladder; unset in every shipped path'],
      ]} />
      <H3>ThemeInput (themeToFigma)</H3>
      <Table head={['field', 'meaning']} rows={[
        [<Code>secondary</Code>, 'the secondary scale, or null to mirror the brand'],
        [<Code>secondaryStyle</Code>, "'default' | 'outline' | 'exact'"],
        [<Code>neutralLevel</Code>, "'pure' | 'default' | 'medium' | 'branded'"],
        [<Code>neutralH</Code>, 'the resolved tint hue (neutralTintHue); absent = the primary’s'],
        [<Code>signals</Code>, 'the four signal scales, overrides applied'],
        [<Code>ctaEscape</Code>, 'the brand stamp re-expressed from the neutral’s strong pen'],
        [<Code>linkHex</Code>, 'a custom link seed'],
        [<Code>ctaBorder</Code>, 'the edge gate, default on'],
      ]} />
    </>
  )
}
