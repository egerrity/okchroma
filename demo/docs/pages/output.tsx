import React from 'react'
import { H2, H3, P, UL, LI, Code, Pre, Lead, Table, DocLink, K } from '../prose'
import { NamingAnatomy, FamilyRoster, SystemRoster, CssSample, FigmaTree, REF_SEED } from '../figures'
import { ROOT_L_LIGHT, ROOT_L_DARK, PENCIL_9_CONTRAST } from '../../../src/engine/stopTable'
import { PAPER0_DARK_ROOT_L } from '../../../src/engine/requirements/spec'
import { stopTokenName, PAPER_0, PEN_100, SCALE_STOP_COUNT, STAMP_FILL, STAMP_FILL_HOVER, STAMP_FILL_PRESSED, STAMP_EDGE, STAMP_ON } from '../../../src/engine/tokenNames'
import { FAMILY, CSS_FAMILY } from '../../../src/engine/tokenDescriptions'
import { SIGNALS } from '../../../src/engine/signals'
import { CTA_BORDER_LC_FLOOR, OFFSET_ALPHAS, ctaBorderRung, P3_SUPPORTS, P3_MEDIA } from '../../../src/engine/cssRender'
import { SOFT_ON_CTA_ALPHA } from '../../../src/engine/resolve'
import { describeParts } from '../figures'

export const slug = 'output'
export const title = 'Output contract'

const stops = Array.from({ length: SCALE_STOP_COUNT }, (_, i) => i + 1)

export function Body() {
  return (
    <>
      <Lead>
        The output is a fixed vocabulary of names whose values move per brand and per mode. This page is the
        vocabulary: what every name means, where each one is emitted, and what it looks like.
      </Lead>

      <H2>Reading a name</H2>
      <NamingAnatomy />
      <P>
        The instrument word is the law the stop serves; the number is its light-mode lightness target,
        inverted so that bigger means stronger. Names carry no conformance suffix: the WCAG level a stop
        clears is a line in its Figma description and a claim on the{' '}
        <DocLink page="guarantees">Guarantees</DocLink> page.
      </P>

      <H2>The scale, per family</H2>
      <P>
        Every family carries these <K v={SCALE_STOP_COUNT} d={0} /> stops. The lightness targets are the
        declared ladders the solver starts from; the emitted lightness differs per hue (the solve), so the
        target is a name, not a promise. Roles are the descriptions the plugin writes.
      </P>
      <Table
        head={['token', 'index', 'light target', 'dark target', 'role', 'conformance']}
        rows={[
          [<Code>{PAPER_0}</Code>, '0', <K v={1} />, <K v={PAPER0_DARK_ROOT_L} />, 'the ladder floor: white in light; in dark, one seam below paper-1 (neutral only)', ''],
          ...stops.map(i => {
            const name = stopTokenName(i)
            const d = describeParts(`${FAMILY.brandPrimary}/${name}`)
            return [<Code>{name}</Code>, String(i), <K v={ROOT_L_LIGHT[i]} />, <K v={ROOT_L_DARK[i]} />, d.role, d.conformance ?? '']
          }),
          [<Code>{PEN_100}</Code>, '12', <K v={0} />, <K v={1} />, 'the literal pole: black in light, white in dark (neutral only)', describeParts(`${FAMILY.neutral}/${PEN_100}`).conformance ?? ''],
        ]}
      />
      <P>
        Two facts an integrator needs: <Code>{PAPER_0}</Code> and <Code>{PEN_100}</Code> flip with the mode and exist under the
        neutral only, and <Code>{stopTokenName(9)}</Code> is both the first text stop and the emphasis fill (its on-text is{' '}
        <Code>{PAPER_0}</Code>, which clears <K v={PENCIL_9_CONTRAST} d={1} />:1 against it by construction).
      </P>

      <H2>The stamp roles</H2>
      <P>
        Off the scale, every family carries a stamp: the pulled-out solid fill and what sits on it. In Figma the five
        nest under <Code>stamp/</Code>; in CSS they are hyphenated.
      </P>
      <Table
        head={['token', 'what it is', 'rule']}
        rows={[
          [<Code>{STAMP_FILL}</Code>, 'the solid button fill', "the seed's own lightness and hue, moved only by the on-fill law, the legibility booster, and the red collision solve; floored in dark so it lifts, never sinks"],
          [<Code>{STAMP_FILL_HOVER}</Code>, 'hover state', 'a flat step of 0.05 L away from the mode’s ground (toward black in light, white in dark), reversed for fills that sit near the far pole'],
          [<Code>{STAMP_FILL_PRESSED}</Code>, 'pressed state', 'the same direction, twice the step'],
          [<Code>{STAMP_EDGE}</Code>, 'a low-visibility stroke', <>the alpha ladder rung for the family (primary and signals <K v={OFFSET_ALPHAS[ctaBorderRung('brand')]} pct d={0} />, secondary <K v={OFFSET_ALPHAS[ctaBorderRung(CSS_FAMILY.brandSecondary)]} pct d={0} />, neutral <K v={OFFSET_ALPHAS[ctaBorderRung(CSS_FAMILY.neutral)]} pct d={0} />) when the fill reads under APCA |Lc| <K v={CTA_BORDER_LC_FLOOR} d={0} /> against the page; otherwise the transparent variable. Always render it, so layout never shifts</>],
          [<Code>{STAMP_ON}</Code>, 'the text over the fill', <>white or black, whichever passes; quiet fills (the neutral, and a secondary whose composite stays legal on every state) carry the pole at alpha, <K v={SOFT_ON_CTA_ALPHA.light} pct d={0} /> light / <K v={SOFT_ON_CTA_ALPHA.dark} pct d={0} /> dark</>],
        ]}
      />
      <P>
        The text-style action has no separate tokens: it is the three text stops read as states (rest{' '}
        <Code>{stopTokenName(9)}</Code>, hover <Code>{stopTokenName(10)}</Code>, pressed <Code>{stopTokenName(11)}</Code>).
        <Code>identity</Code> is the exact input hex (brand and brand-alt only), never adjusted.
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

      <H2 id="modes-and-selectors">Modes and selectors</H2>
      <H3>CSS</H3>
      <Pre>{`[data-brand="acme"] { … }                        /* light: the anchors, then every family's rows */
[data-brand="acme"][data-theme="dark"] { … }     /* dark: the same names, dark values */
:root { … }                                      /* signalsCss: the alpha ladders + the canonical signals */
:root[data-theme="dark"], [data-theme="dark"] { … }
${P3_SUPPORTS} {
${P3_MEDIA} {
  [data-brand="acme"] { --brand-highlighter-20: color(display-p3 …); … }   /* only stops whose chroma exceeds sRGB */
}
}`}</Pre>
      <P>
        Every hex is the sRGB clamp-down of the resolved color (chroma reduced at constant lightness and hue, never
        per-channel clipping). Where the resolved chroma exceeds sRGB, a <Code>color(display-p3 …)</Code> override for
        that one property ships behind the two gates above, so a P3 display shows the wider color and an sRGB display
        keeps the engine's own fallback. A per-brand signal override (a collision shift) is emitted inside the brand's
        block under the signal's role prefix, so it wins the cascade over <Code>:root</Code>.
      </P>
      <H3>Figma</H3>
      <P>
        <Code>themeToFigma</Code> returns a light tree and a dark tree of the same shape. The extended plugin writes one
        base collection (<Code>theme</Code>, modes <Code>light</Code> and <Code>dark</Code>, populated once from the default
        seed) and one extension collection per brand that overrides only the rows that differ. The extension carries the
        brand's name; the paths inside stay generic (<Code>base/brand/…</Code>), so a designer binds once and re-themes by
        switching the extension.
      </P>

      <H2>A live CSS block</H2>
      <CssSample />

      <H2>The Figma tree</H2>
      <FigmaTree />

      <H2>The full roster</H2>
      <P>
        Every row the extended plugin writes for seed {REF_SEED}, in the plugin's own spelling, with the CSS custom
        property the same row ships as. Rows marked "tokens/semantic.css" come from the optional semantic layer in the
        package rather than from <Code>brandCss</Code>; rows marked "Figma only" have no CSS custom property.
      </P>
      <H3>Per family</H3>
      <FamilyRoster />
      <H3>System rows</H3>
      <SystemRoster />
      <P>
        Two rows exist in the JS emit and in CSS but are not written by the extended plugin yet: the{' '}
        <Code>toward-bg</Code> alpha ladder (<Code>--alpha-toward-bg-06|08|16</Code>, the same rungs with the pole flipped,
        for state layers on inverted grounds) ships in <Code>signalsCss</Code> and under <Code>system/alpha/toward-bg/</Code>{' '}
        in <Code>themeToFigma</Code>. The disabled state is an opacity (<Code>--disabled-opacity</Code> in the semantic layer),
        never a color token.
      </P>

      <H2>What is identical, what differs</H2>
      <UL>
        <LI>The scale law is identical across every family: same targets, same producers, same requirements. Two families differ in their stops only by hue and chroma.</LI>
        <LI>The stamp fill is the one per-family differentiator: it anchors at the seed's own lightness, so a dark brand has a dark button and a pastel brand a pale one. The neutral's stamp is deliberately quiet: its rest fill is the scale's own highlighter-8, lifted in dark until it clears the high plane.</LI>
        <LI>In dark mode the brand's stamp chroma is trimmed; the signals keep their identity chroma so canonical red and yellow read the same in both modes.</LI>
        <LI>A signal family's values move only to stay distinct from the brand (a hue shift or a swap variant), never for the brand's taste.</LI>
      </UL>

      <H2>The extended plugin's zones and the picker</H2>
      <P>
        Every path the extended plugin writes starts with an ownership zone. <Code>base/</Code> marks engine-owned rows: a
        hand edit there is deliberately not rebuilt by a re-apply. <Code>utility/</Code> marks team-touchable rows the engine
        never reads back (the surface planes, the shadows, the scrim). The zone is stripped from the Web code syntax, so the
        name a developer sees matches the CSS custom property.
      </P>
      <P>
        Inside <Code>base/</Code>, the ramp stops and the alpha and absolute plumbing are single resolved colors with no
        state; the roles (<Code>stamp/</Code> inside each family, <Code>base/link/</Code>, and <Code>utility/surface/</Code>)
        are state-carrying decisions a designer binds to. The plugin's "Hide primitive scale from pickers" checkbox, on by
        default, hides every non-role row from Figma's color pickers and keeps the role rows visible. The posture is stored on
        the file and re-applied on every apply, so a scope hand-edited in Figma reverts on the next run.
      </P>
    </>
  )
}
