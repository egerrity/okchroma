import React from 'react'
import { H2, P, UL, LI, Code, Lead, Note } from '../prose'
import { LiveToken } from '../figures'
import { STAMP_FILL, STAMP_FILL_HOVER, STAMP_FILL_PRESSED } from '../../../src/engine/tokenNames'

// Interim: the pre-rewrite page, moved verbatim (the field reference and the anchor
// caveat land in a later batch).
export const slug = 'token-schema'
export const title = 'Requirement tokens'
export function Body() {
  return (
    <>
      <Lead>A token is a requirement the engine solves, not a frozen value.</Lead>
      <P>
        A DTCG requirement token carries a frozen color any DTCG tool can read (<Code>$value</Code>) and
        the live requirement that produced it
        (<Code>$extensions["org.okchroma.requirement"]</Code>). A requirement-aware resolver
        ignores the frozen value and re-solves from the requirement. Only <Code>emitDtcgRamp</Code> produces
        these; the CSS and Figma emitters carry values.
      </P>
      <P>
        This is a real token, emitted by the engine right now: light <Code>crayon-26</Code>,
        carrying its declared WCAG 3:1 require against paper-5:
      </P>
      <LiveToken hex="#3060C0" tokenKey="8" mode="light"
        caption={<>Live output of <Code>emitDtcgRamp('#3060C0', 'light')</Code>. The <Code>produce</Code> block names the producers; <Code>require</Code> is the declared floor.</>} />
      <H2>Stops and roles</H2>
      <P>
        Scale stops are keyed by number (0 is the resolved paper anchor). The stamp fill is a role, keyed
        by name: <Code>{STAMP_FILL}</Code>, <Code>{STAMP_FILL_HOVER}</Code>, <Code>{STAMP_FILL_PRESSED}</Code>. Roles anchor
        to the brand's own hue and lightness, floored in dark so a fill lifts but never sinks:
      </P>
      <LiveToken hex="#3060C0" tokenKey={STAMP_FILL} mode="dark"
        caption={<>The dark <Code>{STAMP_FILL}</Code> role: <Code>hue: constant</Code> (the brand's own hue), <Code>L: anchor</Code> with <Code>floorL</Code>, the lift-never-sink rule.</>} />
      <H2>The rules in one breath</H2>
      <UL>
        <LI><b>A requirement is a floor.</b> A placement that already clears it doesn't move, byte for byte.</LI>
        <LI><b>Requirements reference resolved stops.</b> A floor is solved against the resolved ground it names, so a moved ground re-solves what depends on it.</LI>
        <LI><b>Fail loud.</b> An unmeetable requirement marks the stop <Code>unresolvable</Code>; a foreign resolver id is rejected, never guessed at.</LI>
        <LI><b>Producers are names, not formulas.</b> The math lives behind the versioned <Code>resolver</Code> id; the token file stays pure intent.</LI>
      </UL>
      <Note>
        The field-by-field reference is <Code>docs/schema.md</Code> in the repo.
      </Note>
    </>
  )
}
