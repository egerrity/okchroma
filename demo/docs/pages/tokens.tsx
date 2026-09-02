import React, { useMemo } from 'react'
import { H2, H3, P, UL, LI, Code, Pre, Lead, Note, Table, DocLink, K } from '../prose'
import { LiveToken } from '../figures'
import { emitDtcgRamp, RESOLVER_ID, EXT_KEY } from '../../../src/engine/requirements/dtcg'
import { MODE_SPECS } from '../../../src/engine/requirements/spec'
import { DEFAULT_APCA_LC_MAP, CTA_ONFILL_ENFORCE_LC, CRITICAL_CLEARANCE_LC } from '../../../src/engine/requirements/profiles'
import { STAMP_FILL, STAMP_FILL_HOVER, STAMP_FILL_PRESSED, stopTokenName, PAPER_0 } from '../../../src/engine/tokenNames'

export const slug = 'token-schema'
export const title = 'Requirement tokens'

const EX_SEED = '#3060C0'
const ONS = MODE_SPECS.light.ons.onFill

export function Body() {
  const shape = useMemo(() => Object.keys(emitDtcgRamp(EX_SEED, 'light', 'brand.light')), [])
  return (
    <>
      <Lead>
        A requirement token carries two things at once: a frozen color any DTCG tool can read, and the live
        requirement the engine solved to produce it. This page is the format, field by field.
      </Lead>

      <H2>Where it comes from</H2>
      <P>
        <Code>emitDtcgRamp(hex, mode, groupName)</Code> serializes one ramp: the declaration in{' '}
        <Code>requirements/spec.ts</Code> resolved for that seed, one token per stop and per stamp role, each with its
        resolved color as <Code>$value</Code> and its declaration under{' '}
        <Code>$extensions["{EXT_KEY}"]</Code>. <Code>resolveDtcgRamp(group)</Code> parses a group back and re-resolves
        it from the requirements, ignoring every <Code>$value</Code>. Both are exported from the package. No shipped
        pipeline writes this file: the CSS and Figma emitters carry values only, and the demo and plugins never call the
        emitter. It is the portability layer, and the format the engine would speak to a requirement-aware resolver.
      </P>
      <P>Per the DTCG Format Module, a tool must preserve <Code>$extensions</Code> entries it does not understand, so the requirement survives any conformant pipeline.</P>

      <H2>The group shape</H2>
      <P>A ramp group per mode, keyed as the engine emits it right now for seed {EX_SEED}:</P>
      <Pre>{`brand.light
├─ seed                    a plain color token: the input
├─ $extensions             group level: the resolver id and the on-color rule (ons)
${shape.filter(k => /^\d+$/.test(k)).map(k => `├─ "${k}"`).join('\n')}   scale stops, keyed by stop number (0 = ${PAPER_0})
${shape.filter(k => k.startsWith('stamp')).map((k, i, a) => `${i === a.length - 1 ? '└' : '├'}─ "${k}"`).join('\n')}   the stamp roles, keyed by role name (never numbered: the fill is not a stop)`}</Pre>

      <H2>Two live tokens</H2>
      <P>
        A scale stop, light <Code>{stopTokenName(8)}</Code>, carrying its declared non-text floor against{' '}
        {stopTokenName(3)}:
      </P>
      <LiveToken hex={EX_SEED} tokenKey="8" mode="light"
        caption={<>Live output of <Code>emitDtcgRamp('{EX_SEED}', 'light', 'brand.light')['8']</Code>. <Code>produce</Code> names the producers; <Code>require</Code> is the declared floor; the rest are the producers' parameters.</>} />
      <P>
        An off-scale role, the dark <Code>{STAMP_FILL}</Code>: hue constant (the seed's own), lightness anchored at
        the seed's with a floor, chroma the seed's times a multiplier:
      </P>
      <LiveToken hex={EX_SEED} tokenKey={STAMP_FILL} mode="dark"
        caption={<>Live output of <Code>emitDtcgRamp('{EX_SEED}', 'dark', 'brand.dark')['{STAMP_FILL}']</Code>. <Code>floorL</Code> is the lift-never-sink rule; the on-fill enforcement may legitimately move the fill past it.</>} />

      <H2>Field reference</H2>
      <H3>Every token</H3>
      <Table
        head={['field', 'type', 'meaning']}
        rows={[
          [<Code>$type</Code>, <Code>"color"</Code>, ''],
          [<Code>$value</Code>, <Code>{'{ colorSpace: "srgb", components: [r, g, b], alpha: 1, hex }'}</Code>, 'the frozen fallback: the resolved color at emit time, sRGB clamp-down, components to four decimals. Stale after a hand edit until re-emitted; the requirement, not the fallback, is the source of truth'],
          [<Code>resolver</Code>, 'string', <>the named resolver capability, <Code>{RESOLVER_ID}</Code>. A resolver must reject a bundle whose id it does not implement, never guess</>],
          [<Code>seed</Code>, 'DTCG alias', <>a reference to the group's <Code>seed</Code> token; the producers run from it</>],
          [<Code>mode</Code>, <Code>"light" | "dark"</Code>, 'which mode this declaration is'],
        ]}
      />
      <H3>Scale stops</H3>
      <Table
        head={['field', 'type', 'meaning']}
        rows={[
          [<Code>stop</Code>, 'number', <>the scale position, 0 to 11. 0 is {PAPER_0}, the anchor beyond {stopTokenName(1)}: white in light, one seam below {stopTokenName(1)} in dark. Roles are never stops</>],
          [<Code>rootL</Code>, 'number', "the producer's lightness target (the scaffold the solve starts from)"],
          [<Code>group</Code>, <Code>paper | highlighter | crayon | pencil | pen</Code>, 'the band, derived from the token name. The resolver reads only text-lane membership (pencil and pen) and accepts the pre-rename words lead and ink there, so an older bundle re-resolves identically'],
          [<Code>produce</Code>, 'object', 'the named producers, below'],
          [<Code>satFraction</Code>, 'number', "the ladder producer's envelope share (the per-stop sat)"],
          [<Code>baseC</Code>, 'number', "the ladder producer's absolute ladder chroma (light)"],
          [<Code>chromaMult</Code>, 'number', "the brand producer's multiplier on the seed's chroma (the pen stops)"],
          [<Code>textMaxC</Code>, 'number', 'the text register ceiling: chroma = min(chromaMult × seed chroma, textMaxC)'],
          [<Code>chromaFloor</Code>, 'number', 'the dark pen chroma floor, scaled by the floor strength at runtime'],
          [<Code>require</Code>, 'object', 'a declared requirement, below; absent on most stops'],
        ]}
      />
      <H3>Roles</H3>
      <Table
        head={['field', 'type', 'meaning']}
        rows={[
          [<Code>role</Code>, <Code>{STAMP_FILL} | {STAMP_FILL_HOVER} | {STAMP_FILL_PRESSED}</Code>, 'the role name; the group key is the same. Bundles emitted before the stamp rename used cta, cta-hover, cta-pressed, which the parser still accepts'],
          [<Code>produce</Code>, <Code>{'{ hue: "constant", L: "anchor" | "hover" | "pressed", chroma: "brand" }'}</Code>, "the fill carries the seed's own hue and lightness; hover and pressed derive from the resolved fill"],
          [<Code>floorL</Code>, 'number', <>the anchor floor (<K v={MODE_SPECS.light.roles[0].floorL} d={2} /> light, <K v={MODE_SPECS.dark.roles[0].floorL} d={2} /> dark): a dark fill lifts and never sinks. The floor governs the anchor, not the enforced result</>],
          [<Code>chromaMult</Code>, 'number', "the multiplier on the seed's chroma"],
        ]}
      />
      <H3>Producers: names, not formulas</H3>
      <Table
        head={['axis', 'value', 'meaning']}
        rows={[
          [<Code>hue</Code>, <Code>warm-drift</Code>, 'the light hue path: the warm spine drift with its dynamic cap, plus the signed red repel'],
          ['', <Code>warm-torsion</Code>, 'the dark hue path: the spine torsion anchored at the dark fill'],
          ['', <Code>constant</Code>, "the seed's own hue (roles)"],
          [<Code>L</Code>, <Code>perceptual</Code>, 'the apparent-lightness solve toward rootL'],
          ['', <Code>perceptual-lift</Code>, 'the same solve floored at rootL: lift, never sink'],
          ['', <Code>fixed</Code>, 'exactly rootL'],
          ['', <Code>anchor | hover | pressed</Code>, "roles only: the seed's own lightness (floored), and the state steps from the resolved fill"],
          [<Code>chroma</Code>, <Code>ladder</Code>, 'the ladder and envelope blend (light), the share ladder with the chroma floor (dark)'],
          ['', <Code>brand</Code>, "chromaMult × the seed's chroma"],
        ]}
      />
      <P>
        Producer names are references to versioned resolver capabilities. The implementations (the Nayatani model,
        the spine, the aesthetic state) live behind the <Code>resolver</Code> id; putting twenty aesthetic constants in a
        token file would be fake portability. A change in producer behavior is a resolver version bump.
      </P>
      <Note>
        One thing the labels do not say: in the shipped pipeline dark is resolved from the resolved light ramp (the
        delta carry), which places the paper and highlighter stops by luminance parity and the crayon by its
        requirement. The dark <Code>perceptual-lift</Code> and <Code>fixed</Code> labels on stops 1 to 8 describe what
        a direct resolver call does without the light ramp in hand. A requirement-aware resolver that wants the shipped
        dark values must run the carry; the declaration alone reproduces the direct path. The mechanism is on the{' '}
        <DocLink page="generation" section="step-4">How the theme is generated</DocLink> page.
      </Note>
      <H3>Requirements: declared floors</H3>
      <Table
        head={['variant', 'fields', 'meaning']}
        rows={[
          ['WCAG contrast', <Code>{'{ metric: "wcag", against, target, level }'}</Code>, <>the stop must hold <Code>target</Code>:1 against the resolved stop named by <Code>against</Code> (<Code>{stopTokenName(1)} | {stopTokenName(2)} | {stopTokenName(3)} | {stopTokenName(7)}</Code>). Light clamps lightness down; dark raises it off the ground. Declared today: {stopTokenName(8)} at <K v={MODE_SPECS.light.stops.find(s => s.stop === 8)!.require!.metric === 'wcag' ? (MODE_SPECS.light.stops.find(s => s.stop === 8)!.require as { target: number }).target : 0} d={1} /> against {(MODE_SPECS.light.stops.find(s => s.stop === 8)!.require as { against: string }).against}, {stopTokenName(9)} at <K v={(MODE_SPECS.light.stops.find(s => s.stop === 9)!.require as { target: number }).target} d={1} /> against {(MODE_SPECS.light.stops.find(s => s.stop === 9)!.require as { against: string }).against}, {stopTokenName(10)} at <K v={(MODE_SPECS.light.stops.find(s => s.stop === 10)!.require as { target: number }).target} d={1} /> against {(MODE_SPECS.light.stops.find(s => s.stop === 10)!.require as { against: string }).against}, {stopTokenName(11)} at <K v={(MODE_SPECS.light.stops.find(s => s.stop === 11)!.require as { target: number }).target} d={1} /> against {(MODE_SPECS.light.stops.find(s => s.stop === 11)!.require as { against: string }).against}</>],
          ['APCA contrast', <Code>{'{ metric: "apca", against, targetLc }'}</Code>, 'the stop must read |Lc| at least targetLc against the resolved reference. Same floor semantics. Never hand-declared; produced by the profile compiler below'],
          ['minimum separation', <Code>{'{ metric: "min-separation", against: "paper-1" | "prev", target }'}</Code>, 'an OKLab ΔE floor from a resolved stop. Supported for portable specs; the shipped declaration carries none, since the ladder shape holds every seam open by construction'],
        ]}
      />
      <P>
        <b>The anchor caveat.</b> The resolver reads <Code>against</Code>, with an override in the shipped WCAG lane: a
        text stop (9 and up) declared against a paper is solved against {stopTokenName(3)}, the nearest paper, and every
        stop from the crayon up is additionally held against frozen cross-family bounds (the{' '}
        <DocLink page="guarantees" section="what-every-paper-means">Guarantees</DocLink> page). So editing{' '}
        <Code>against</Code> in a bundle changes the shipped result for {stopTokenName(8)}, and for every stop under the
        APCA profile, but not for the pen stops in the shipped lane. Editing <Code>target</Code> is honored everywhere.
      </P>
      <H3>Contrast profiles</H3>
      <P>
        <Code>withProfile(spec, 'apca')</Code> (requirements/profiles.ts) rewrites every declared WCAG requirement onto
        its APCA equivalent, the same declaration re-solved against a different constraint, using the map 3:1 → Lc{' '}
        <K v={DEFAULT_APCA_LC_MAP[3]} d={0} />, 4.5 → <K v={DEFAULT_APCA_LC_MAP[4.5]} d={0} />, 6.5 →{' '}
        <K v={DEFAULT_APCA_LC_MAP[6.5]} d={0} />, 7 → <K v={DEFAULT_APCA_LC_MAP[7]} d={0} /> (the highlighter-anchored
        pen requirement is frozen at Lc 85 against {stopTokenName(2)} in that lane), and sets the on-fill bar to Lc{' '}
        <K v={CTA_ONFILL_ENFORCE_LC} d={0} />. The default profile, <Code>wcag</Code>, is the identity. WCAG is the shipped
        lane; the APCA lane exists in code and nothing ships through it.
      </P>
      <H3>The on-color rule (group level)</H3>
      <Table
        head={['field', 'meaning']}
        rows={[
          [<Code>metric: "apca-pole"</Code>, 'the on-text pole is whichever of white and black has the larger |APCA Lc| on the fill'],
          [<Code>enforce</Code>, <>{String(ONS.enforce)}: the legibility law binds. The chosen pole must pass the floor or the pole flips; the fill moves only when white is preferred and cannot be flipped. On-text never moves a fill otherwise</>],
          [<Code>ratioFloor</Code>, <><K v={ONS.ratioFloor!} d={1} />: the WCAG ratio the chosen pole must clear. Read in the WCAG lane only</>],
          [<Code>coEnforceLc</Code>, <><K v={ONS.coEnforceLc!} d={0} />: the legibility clearance. Alongside the ratio floor, the fill re-solves until the pole reads at least this Lc (the critical signal rides <K v={CRITICAL_CLEARANCE_LC} d={0} /> per call). WCAG lane only</>],
          [<Code>enforceLc</Code>, <>set by the APCA profile compiler to <K v={CTA_ONFILL_ENFORCE_LC} d={0} />: that lane's sole on-fill bar, replacing the ratio re-solve. Absent under the shipped profile; never active together with <Code>ratioFloor</Code></>],
        ]}
      />

      <H2>Resolution semantics</H2>
      <UL>
        <LI><b>Order is total.</b> Stops resolve in declared order; a requirement references an already-resolved stop, never a cached value.</LI>
        <LI><b>A requirement is a floor, not a re-placement.</b> A placement that already clears does not move, byte for byte.</LI>
        <LI><b>Fail loud.</b> A requirement the resolver cannot meet yields an explicit <Code>unresolvable</Code> marker on the resolved stop. A malformed bundle or a foreign resolver id throws at parse.</LI>
        <LI><b><Code>$value</Code> is a snapshot.</b> It equals the resolved color at emit time and is the fallback for tools that do not resolve.</LI>
      </UL>

      <H2>Verification</H2>
      <UL>
        <LI><Code>npm run req:audit</Code>: an agnostic hue and chroma sweep in both modes and both profiles; every declared requirement plus the structural invariants.</LI>
        <LI><Code>research/reqtoken/reqtoken-portability.ts</Code>: emit, serialize, parse, re-resolve is bit-identical; an edited target is honored; a corrupted bundle throws. Parked research, run by hand, not in the audit set.</LI>
        <LI><Code>research/reqtoken/reqtoken-emit.ts</Code> writes a full two-mode document; the last emitted one is checked in beside it.</LI>
      </UL>
    </>
  )
}
