import React from 'react'
import { OL, UL, LI, Code, Table } from '../prose'

// The owner's own numbered edit (interim: the engineering expansion of each step
// lands in a later batch; the stop index in step 3 and the em dash in step 5 are
// already corrected).
export const slug = 'generation'
export const title = 'How the theme is generated'
export function Body() {
  return (
    <>
      <OL>
        <LI>The theme is seeded with a primary and optional secondary hex value.</LI>
        <LI>The given values are converted to OKLCH; all reasoning happens there (converted back to
        RGB at emit).</LI>
        <LI>The light ramp is generated through the following solves:
          <UL>
            <LI>Lightness is solved so <b>apparent</b> lightness hits the stop's shared target
            (Helmholtz&ndash;Kohlrausch corrected). Every brand's pencil-47 reads equally bright,
            etc.</LI>
            <LI>Hue is the seed hue plus two shifts.
              <UL>
                <LI>Warm seeds (full weight ≈ H50&ndash;88, zero by 104) rotate toward the hue that
                stays clean at that stop's lightness (47° dark end, 110° light end), taking 55% of
                the difference, capped near ±24°, weighted by distance from that path.</LI>
                <LI>Seeds near the red signal hue (33.3°) shift away from it by the nearest side,
                up to 14°.</LI>
              </UL>
            </LI>
            <LI>Chroma is a declared per-stop ladder scaled by the seed's vividness, then clamped
            to gamut at the final L and H. Clamping reduces chroma only; hue never bends from
            clipping.</LI>
          </UL>
        </LI>
        <LI>The dark ramp is generated: computed together with light, stored on one result. Dark L
        is a flat calibrated ladder (apparent-lightness solving in dark makes blue recede; the flat
        ladder is deliberate). Chroma is trimmed so light-mode loudness carries over. A fill that
        lands too dark is floored upward: it lifts, never sinks.</LI>
        <LI><b>Requirements.</b> Declared floors bind after placement, in both modes: crayon-26
        at WCAG 3:1 on every paper, pencil-47 at 4.5:1 on every paper, pen-58 and pen-70 at 4.5:1 on
        every paper and highlighter of their own family or of the neutral, both directions, a
        guaranteed minimum in every case, cleared against every paper the family (and its
        neutral) can produce. A placement that already clears does not
        move. An unmeetable floor marks the stop <Code>unresolvable</Code> instead of fudging.</LI>
        <LI>The cta-related values are generated.
          <UL>
            <LI>Because this value can be anywhere on the spectrum, it is not a stop: it anchors at
            the seed's own lightness (dark floor 0.63).</LI>
            <LI>Its text is black or white, whichever passes WCAG 4.5; if neither does, the fill
            moves until one passes. Brand and signal ctas also clear APCA Lc 65 both modes
            (critical: 50).</LI>
            <LI>A fill within |Lc| 15 of the page gains a translucent border (primary 16%,
            secondary 6%, neutral 8%).</LI>
            <LI>A quiet fill (derived secondary, neutral) carries its text at 75/80% alpha, only
            where the composite clears 4.5 on rest, hover, and pressed.</LI>
            <LI>The text-style cta is the pen stops read as states: pencil-47 rest,
            pen-58 hover, pen-70 pressed.</LI>
          </UL>
        </LI>
        <LI><b>Collision checks.</b> The result is compared to the four signals: red, yellow,
        green, blue, emitted as critical, warning, positive, info. Two tests: highlighter hues within 15°
        with real vividness (family), and fill ΔE ≤ 0.16 light / 0.10 dark at hues within 30°
        (value). Resolution is per signal:
          <Table
            head={['Signal', 'Who yields', 'Resolution']}
            rows={[
              [<Code>red (critical)</Code>, 'the brand',
                'The step-3 hue shift keeps the tints off red. A cta inside the true-red region exits by its nearest edge. If red still sits too close, the signal re-seats on the far side of the brand, or ships canonical with outline advice for destructive controls.'],
              [<Code>yellow (warning)</Code>, 'the signal',
                'Brand below 96°: yellow shifts to lemon. At or above: no change.'],
              [<Code>green (positive)</Code>, 'the signal',
                'Brand below 147°: teal-side variant. At or above: yellow-side variant.'],
              [<Code>blue (info)</Code>, 'the signal',
                'Brand below 273°: magenta-side variant. At or above: cyan-side variant.'],
            ]}
          />
          A supplied secondary is checked the same way: green/blue variants are adopted only if
          they clear both brand colors, the primary wins ties, and the rest ships as advice. Signal
          swaps are output-only and never re-enter generation.</LI>
        <LI><b>Companions.</b> A secondary, if present: the primary's seed lifted toward the light
        pole by 65% of the remaining headroom, chroma halved and bounded, hue unchanged, then
        resolved as a normal ramp (at least 10 apparent-L off the light page; dark cta flat 40
        above the dark page). A supplied hex takes the same transform, or ships exact as a full
        standard ramp, or outline. The neutral: a near-gray at a tint hue (primary by default;
        secondary or a custom hex, stored as a source) through the same generator with its own
        chroma curve, at four strengths.</LI>
        <LI><b>Your levers.</b> <Code>exact</Code> (fill and identity ship untouched; the ramps
        and signals still compute), archetype override, style (<Code>deeper</Code>), secondary
        style, neutral tint source and strength.</LI>
      </OL>
    </>
  )
}
