import React from 'react'
import { generateScale, generateNeutralScale } from '../../../src/engine/colorEngine'
import { stopHex } from '../../../src/engine/cssRender'
import { resolveLinkInverseTrio } from '../../../src/engine/resolve'
// Real Unify export data, borrowed for the Motivation page's evidence figures.
// Labels on anything rendered from it use FAMILY hue words only, never theme
// names (owner 2026-08-08: the export's theme names carry brand identities).
import { UNIFY_SIGNALS, UNIFY_THEMES, UNIFY_GRAY } from '../../unify-compare/unifyData'
import { H2, P, OL, UL, LI, Lead, A } from '../prose'
import { RampSet, NamingAnatomy, REF_SEED } from '../figures'

// ── Motivation: the project's origin essay, prose final (owner hand-edited).
// Do not rewrite. Image assets still to land are marked as slots below.
// UNPUBLISHED 2026-08-14 (owner): this page is deliberately absent from the site's
// article list; the essay is not finished. Moved here verbatim from DocsSite.tsx.
export const slug = 'motivation'
export const title = 'Motivation'

// ── Motivation-page figures: evidence borrowed from the real Unify export ────
// HSL lightness, the convention the figures indict, computed honestly in HSL
// (max+min over 2), never through the engine.
const hslL = (hex: string): number => {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  return Math.round(((Math.max(r, g, b) + Math.min(r, g, b)) / 2 / 255) * 100)
}
const unifySig = (name: string) => UNIFY_SIGNALS.find(s => s.name === name)!

// The required chip comparison: the success and warning 200s from the real
// export, light values. The point is what the ordinal convention produced, so
// the two colors are the shipped ones, not engine output.
function ChipCompare() {
  const success = unifySig('Signal Success Highlight')
  const warning = unifySig('Signal Warning Highlight')
  const chips = [
    { label: 'Success', tok: success },
    { label: 'Warning', tok: warning },
  ]
  return (
    <figure className="d2-fig" role="img" aria-label={`A success chip and a warning chip side by side. Both are the 200 stop of their family, and their HSL lightness is nearly identical (${hslL(success.light)} and ${hslL(warning.light)}). Only the hue differs, and the success chip reads far darker.`}>
      <div className="d2-chips">
        {chips.map(c => (
          <div key={c.label} className="d2-chip-col">
            <div className="d2-chip" style={{ background: c.tok.light }}>{c.label}</div>
            <code className="d2-code">stop {c.tok.stop} · {c.tok.light} · HSL L {hslL(c.tok.light)}</code>
          </div>
        ))}
      </div>
      <figcaption className="d2-ramp-cap">
        Two chips from a real system's signal palette (light values). Both alias the 200 of
        their family and sit within one point of the same HSL lightness. The success chip
        reads far darker.
      </figcaption>
    </figure>
  )
}

// The real system's chip exhibit, borrowed from the unify comparison page
// (section 2's Unify card): one indicator-chip recipe (Accent fill, Highlight
// border, Primary text), re-aliased per theme. Light values. Row labels derive
// from each theme's primary family and stop, never theme names.
const lstar = (hex: string): number => {
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
  const n = parseInt(hex.slice(1), 16)
  const Y = 0.2126 * lin(((n >> 16) & 255) / 255) + 0.7152 * lin(((n >> 8) & 255) / 255) + 0.0722 * lin((n & 255) / 255)
  return 116 * (Y > 0.008856 ? Math.cbrt(Y) : (903.3 * Y + 16) / 116) - 16
}
function UnifyChipGrid() {
  const sigPart = (fam: string, part: '' | ' Highlight' | ' Accent') =>
    UNIFY_SIGNALS.find(s => s.name === `Signal ${fam}${part}`)!.light
  const gray = (stop: number) => UNIFY_GRAY.find(x => x.stop === stop)!.light
  const chipRow = (t: (typeof UNIFY_THEMES)[number]) => [
    ...(['Error', 'Warning', 'Success'] as const).map(fam => ({ bg: sigPart(fam, ' Accent'), border: sigPart(fam, ' Highlight'), fg: sigPart(fam, '') })),
    { bg: gray(25), border: gray(100), fg: gray(600) },
    { bg: t.accent.hex, border: t.highlight.hex, fg: t.primary.hex },
  ]
  const primL = UNIFY_THEMES.map(t => lstar(t.primary.hex))
  const span = Math.round(Math.max(...primL) - Math.min(...primL))
  return (
    <figure className="d2-fig" role="img" aria-label={`One indicator chip recipe across ${UNIFY_THEMES.length} real themes. Each row shows the three signal chips and a neutral chip, which never change, beside the brand chip, whose fill, border, and lightness jump from theme to theme.`}>
      <div className="d2-chipgrid">
        {UNIFY_THEMES.map(t => (
          <div key={t.name} className="d2-chipgrid-row">
            <span className="d2-chipgrid-label">{t.primary.family} {t.primary.stop}</span>
            {chipRow(t).map((c, i) => (
              <span key={i} className="d2-chipx" style={{ background: c.bg, borderColor: c.border, color: c.fg }}>chip</span>
            ))}
          </div>
        ))}
      </div>
      <figcaption className="d2-ramp-cap">
        A real system's indicator chip: Accent fill, Highlight border, Primary text, all
        three re-aliased per theme (light values). The signal and neutral chips never
        move; the brand chip's text alone spans {span} L* across these themes, and in the
        Green 500 row the brand chip reads as the success chip.
      </figcaption>
    </figure>
  )
}

// The five band names, painted with live neutral stops from their own bands.
function BandTiles() {
  const scale = generateScale(REF_SEED, 'docs', undefined, {})
  const neutral = generateNeutralScale(scale.brandH, 'default')
  // the inverse link trio — same seed as the default link (the brand hex), re-solved
  // for pen-70 surfaces; always raw values, never an alias
  const inv = resolveLinkInverseTrio(REF_SEED)
  void inv
  const at = (stop: number) => stopHex(neutral.light.find(s => s.stop === stop)!)
  const tiles = [
    { band: 'paper', bg: at(1), fg: '#202020' },
    { band: 'highlighter', bg: at(5), fg: '#202020' },
    { band: 'crayon', bg: at(8), fg: '#202020' },
    { band: 'pencil', bg: at(9), fg: '#ffffff' },
    { band: 'pen', bg: at(11), fg: '#ffffff' },
  ]
  return (
    <figure className="d2-fig" role="img" aria-label="The five band names, each painted with a live neutral stop from its own band: paper, highlighter, crayon, pencil, pen.">
      <div className="d2-chips">
        {tiles.map(t => (
          <div key={t.band} className="d2-chip" style={{ background: t.bg, color: t.fg }}>{t.band}</div>
        ))}
      </div>
    </figure>
  )
}

export function Body() {
  return (
    <>
      <Lead>
        <b>Primitives have never been agnostic: A shared delusion that's hurting your
        design system.</b> Despite knowing what a primitive is destined to do before a
        single semantic token exists, we have been creating them as static options for
        over a decade. What would it look like for a design system to admit its
        primitives have purpose?
      </Lead>
      <P>
        I work on a design system for financial products. It has an elegant color
        philosophy that prioritizes function over decoration, and is built to be
        re-themed for any brand: flexibility and accessibility are key. Supporting a
        white label design system means being ready to satisfy a wide range of brands,
        which in turn means we encounter edge cases a standard design may never need to
        consider. While some things are very different system-to-system, when it comes
        to color, some things never change. Accessibility requirements, common value
        pairings, how annoying yellow is: our output has more constants than we openly
        acknowledge.
      </P>
      <P>
        Our primitive system is set up in the standard way, adjusted to support white
        label theming. We built it that way because it is what everyone does, and I
        believed in it the way everyone does. But I had a nagging feeling that
        "primitives-as-options" could never adequately meet our needs.
      </P>
      <H2>The friction theming exposes</H2>
      <P>
        Set primitives up as agnostic options and every decision they feed becomes a
        guess. The palette offers plenty to choose from and no basis for choosing: which
        stop becomes the primary CTA, which one darkens for hover, which one sits behind
        a chip. We answer by eye, per brand, and the answers have nothing holding them
        together.
      </P>
      <P>
        And because no stop was made to fit criteria, nothing keeps the results
        consistent across themes. Once you see it, it's everywhere: we use stop 200 for
        the highlight color and stop 50 for the accent color on every brand and signal
        color, assuming a stop number would look the same way everywhere. The success
        chip looks much darker than a warning chip despite both aliasing the "200" of
        their respective color families and using the same HSL lightness value.
      </P>
      <ChipCompare />
      <P>This highlights two problems:</P>
      <OL>
        <LI>200s were created <b><i>for the purpose</i></b> of being a "light background" and they draw the eye in different amounts.</LI>
        <LI>The primitive's ordinal suffix (200) <b><i>promises</i></b> equal lightness and doesn't deliver</LI>
      </OL>
      <P>
        Part of this problem is tooling limitations. OKLCH is not available in Figma and
        lightness doesn't read equally across hues in HSL.
      </P>
      <P>
        In a single brand you tune by eye and move on. Across themes, the same role lands
        on a different number in every palette and reads differently in each one. We
        create neat gradients of numbered colors knowing they are ultimately destined for
        a role 95% of the time, because we've accepted that primitives have to be
        open-ended just in case.
      </P>
      <UnifyChipGrid />
      <H2>The number records where, not why</H2>
      <P>
        The standard structure treats primitives as options: a field of values you draw
        from when you make decisions in the semantic layer. You generate a wide palette
        to cover every choice you might make, give each value an ordinal name, and defer
        the meaning to a later step, hoping you have covered all your bases.
      </P>
      {/* image1 slot: samiam token-level framework diagram (asset pending, owner to
          supply the file). Caption when it lands: "The widely-accepted token level
          framework, from samiam's research on the topic" linking to
          https://samiamdesigns.substack.com/p/a-new-approach-to-naming-design-tokens */}
      <P>
        But primitives have never really been options. We follow this format because it
        is what everyone else does. Whether we want to admit it or not, all primitives
        are born to satisfy some requirement. As designers, we already know what a
        primitive is destined for before we make it. When I set up a system I know I
        need a brand color that carries white type at 4.5:1. I know I need a near-white
        tint that holds a bit of hue, but still passes legible body copy on top. I know
        which colors will be paired together often, and which will need to be legible
        against each other. Those requirements always existed, but the "options" framing
        asks me to ignore what I know in favor of keeping my options open for the sake
        of this structure alone.
      </P>
      <P>
        And the token itself can't hold what I know, because a token only records the
        answer. Your decision is encoded, but it's frozen, with no memory of the
        parameters that produced it. blue-600 is #2563EB. It does not carry the fact
        that it exists to hold white type, that it has to clear a certain contrast ratio
        to work everywhere we need it, or that it should read at a particular lightness.
        All of that lives on in memory, or even documentation: but none of it is
        declared by the token. It's up to us to carry the rules and encode them later,
        every time we decide where the token gets used. Should we continue to create
        primitives, name them, and use them as if they are naive and devoid of upfront
        purpose?
      </P>
      <H2>Primitives froze for a reason, and the reason is gone</H2>
      <P>
        In hindsight, it would be easy to read this as myopic, but the frozen primitive
        was a reasonable answer to a real problem. Design tokens began as a portability
        play. <A href="https://www.jina.me/">Jina Anne</A> kept the Sass site's design
        values in a single YAML file and generated everything from it, and at
        Salesforce, in her words, "where the concept of design tokens spawned," the idea
        grew into tooling that generated each platform's code from that one file. A file
        that has to feed web, Swift, and Kotlin has no shared way to run a computation,
        so it stores the resolved value, and the math happens before the file or not at
        all. The move that let tokens cross platforms is the same move that left the
        math behind. This has not changed: the formats tools are standardizing on today
        still define a token's value as a literal or a reference, with no syntax for a
        calculation.
      </P>
      <P>
        The ordinal naming arrived on a separate track, from Material Design and then
        Tailwind, and became popular especially because it was easy to adopt. The
        numbers are sometimes assigned post-hoc rationalizations, but I can't find proof
        they ever carried intentional meaning. Put the two threads together and you get
        the shape most of us inherited: values written down in advance, under names that
        mark position instead of purpose. Neither thread was designed as doctrine. One
        was a workaround for platforms that couldn't share math; the other was a
        labeling convention that spread because it was easy.
      </P>
      <P>
        The workaround's reason has expired. The browser can now hold a color as a
        relationship: with relative color syntax you write oklch(from var(--brand) 0.5 c
        h), which takes the brand color, keeps its chroma and hue, and sets its
        lightness to a target, resolved live. The browser can even pick black or white
        for you now with contrast-color(), but computing which lightness target clears a
        given ratio for anything richer than black or white is still your job. The
        derivation itself, though, now lives in the stylesheet.{' '}
        <A href="https://m3.material.io/styles/color/system/how-the-system-works">Material 3's dynamic color</A> already
        works this way: a single seed color, a full set of tones derived in a perceptual
        space, assigned to roles by purpose, checked for contrast.
      </P>
      <P>
        Yet none of this feels like a problem day-to-day, because a frozen value is all
        any of us designers really, actually, touch. It's just not how we do things in
        Figma. Its variables store fixed values; they can point at each other and swap
        by mode, but they can't compute new things. Like me in high school, Figma
        refuses to do math, and this is where a tooling limitation hardens into a design
        constraint.
      </P>
      <H2>Writing the contract</H2>
      <P>
        I was already on a mission to clean up our color ramps to be more perceptually
        uniform, so it felt like a natural time to explore. I tried mapping out the
        ramps' future relationships to see if I could create a generic lightness shape
        based on the contrast needs to come. This began as an exercise to help me align
        on the right stops, but ended up being the beginnings of a primitive contract: a
        set of requirements that outline every relationship the eventual palette has to
        honor, written before any color exists.
      </P>
      {/* image2 slot: the contrast requirement mapping (asset pending, owner supplied
          the keep call 2026-08-08; drop the file in and render it here). */}
      <P>
        Once you accept that a stop has a reserved role, the ordinal number starts to
        feel like an affront. 100 tells you where a color sits on a ramp, and nothing
        else. I decided it was time to break from convention and name these things. I
        have a fascination with digital things being material, and given that, decided
        to borrow from my original entry to design: pigment on paper. I assigned role
        bands and gave them names that evoke different mediums for imparting color onto
        paper, understandable terms that nod to paper and pen.
      </P>
      <BandTiles />
      <UL>
        <LI><i>Paper</i> is the versatile surface group. Paper can accept crayon, pencil, and pen.</LI>
        <LI><i>Highlighter</i> is a limited surface group, for highlighting things by stepping up tint
        from paper. Pen holds on it; pencil and crayon do not.</LI>
        <LI><i>Crayon</i> is for large text, icons, borders, and drawing attention: 3:1 on every paper.</LI>
        <LI><i>Pencil</i> is regular text: 4.5:1 on every paper, but not on highlighter.</LI>
        <LI><i>Pen</i> is the most flexible foreground group: 4.5:1 on every paper and highlighter of its own family or of the neutral, both directions.</LI>
      </UL>
      <P>
        There is more to the full convention than I'll cover here (it's documented{' '}
        <A href="https://egerrity.github.io/okchroma/">on the site</A>), but the number
        earns its place too. It is no longer ordinal: it records the stop's real
        lightness target as generated by the engine, its light root L times 100, so
        pencil-47 tells you both what the stop does and where it actually sits. This
        relationship to the real removes the abstraction and, more importantly, tells
        you the token's contractual obligation in plain terms. The rules stop living in
        our heads: the name itself declares what the stop owes.
      </P>
      <NamingAnatomy />
      <P>
        To prove the requirement-first version was buildable, I built okchroma, an
        engine that takes a brand hex (or two) and returns a full set of accessible,
        role-reserved primitives, with contrast solved during generation instead of
        patched afterward. The math is not mine: established color appearance research,
        found with <A href="https://gorkemyildiz.com/">invaluable help from Görkem
        Yıldız</A>, replaced the rules I had intuited by eye with equations that did
        cleanly what mine did roughly. The late nights of tuning are their own article.
        What matters here is the proof, for color, that a primitive can be a live
        formula: a hue and chroma resolved against a lightness target that satisfies a
        contrast requirement.
      </P>
      <H2>So why do we store values at all?</H2>
      <P>
        If a primitive can be expressed as a live formula, then the frozen list of hex
        values isn't a necessity. It's an artifact of our tools and our narrow fields of
        expertise. Imagine how much easier, and more <i>scalable</i>, it would be if we
        could instead set the requirements and derive exactly what we need. Options are
        a necessary evil for now, but the arbitrariness is not.
      </P>
      <RampSet />
      <P>
        I even built a sister plugin to mimic this in Figma, but that's all it can do:
        mimic. I can't yet make Figma natively understand a primitive as a requirement
        rather than a value.
      </P>
      {/* image5 slot: the Figma plugin (asset pending, owner to supply a screenshot). */}
      <P>
        That being said, you do not need okchroma to use the idea, and it breaks no
        standard and adopts no tool. Open your system and write down what each primitive
        actually does before you touch a value. Consider what sits on what, the ratio
        each pair has to clear, and what the pair is for. Once the roles are defined,
        the values tend to suggest themselves. The math existing means this can
        eventually run at scale. By-hand still works in the meantime.
      </P>
      <H2>What comes next?</H2>
      <P>
        There's a historical rhyme worth sitting with: in 1994, CSS was proposed to
        separate the content of a page from its presentation. This feels like a similar
        moment: separating the declaration of a value from its derivation. We've been
        declaring "options" when we could be deriving intentional values from the
        constraints we already know.
      </P>
      <P>
        The larger point is for the field, not for one system. The primitive did its
        job. It gave us portability and a shared language when we needed both, and
        treating its values as frozen and its names as arbitrary was the toll for
        getting across. The tools that charged that toll are changing.
      </P>
      <P>
        The next step is to stop shipping values and start shipping the contract. Nearly
        every system I've looked at treats a token as a place to store an answer. The
        few that keep any intelligence in the loop (Material 3, Adobe Leonardo, Apple's
        semantic colors) each hold only one thread of it: they solve for contrast, or
        they carry the role but author every light, dark, and high-contrast variant by
        hand. None lets the token carry its own requirement. That gap is what okchroma
        is building into.
      </P>
      <P>
        At time of writing, I'm attempting to write what this could look like as an
        actual token schema: if a token declares its requirement instead of its value,
        dark mode stops being a second palette to maintain and becomes the same token
        re-resolved against a darker background, and high-contrast becomes the same
        token re-resolved against a stricter floor. This is the bigger question the
        project left me with, and I hope this article helps me entice experts to make
        this proof of concept something bigger.
      </P>
      <P>
        Primitives bridged a real gap. The question worth sitting with now is what they
        become on the other side of it.
      </P>
      <P>
        okchroma is open source.{' '}
        <A href="https://egerrity.github.io/okchroma/">See it run</A>, and{' '}
        <A href="https://github.com/egerrity/okchroma">read the code</A>.
      </P>
    </>
  )
}
