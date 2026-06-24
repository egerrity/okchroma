# For designers

What the engine means for your work. This follows the [engineering
guide](./README.md) topic by topic, in plain terms: what each part does for you,
what you'll see, and what you decide. Follow the links for the math.

## About the color engine

**Built on Radix, generated per brand.** OKChroma uses Radix's reserved-step model, where each of the 12 steps has a perceptual target tied to a role. Where Radix hand-tunes a fixed set of palettes, OKChroma generates that structure from any brand color, so contrast pairings are predictable before you build a single token. ([eng](./lineage.md))

**Perceptual color (OKLCH).** The engine works in a perceptual color space, so the steps appear evenly spaced regardless of hue and a scale holds one hue from light to dark. ([eng](./oklch.md))

**Consistent across brands.** Each step is calculated to land at about the same lightness for every brand, so you set your structure once and extend to any brand. No surprises from low chroma, pesky yellows, or very dark navies. ([eng](./stop-ladder.md))

**12 steps, reserved roles.** Each color has 12 steps pre-reserved for roles (backgrounds, components, borders, solid fill, text). This keeps accessibility simple, avoids bloating the system with unnecessary colors, and removes bespoke per-brand aliasing. The role-by-step breakdown is in [Recommendations](#recommendations-for-using-your-primitives). ([eng](./the-12-stop-ramp.md))

**Brand identity, preserved where safe.** Your brand color anchors the system at step 9, the solid fill. The engine keeps your exact hex wherever it safely can, and only adjusts when the literal color would break a UX expectation: a near-red brand that could be mistaken for the error/destructive color, or a fill that can't carry legible text (see How color shifting works). Recommended mode applies those adjustments; Exact mode turns them off and hands the tradeoffs to you. ([eng](./escape-hatches.md))

**Accessibility is guaranteed.** Every fill ships with readable text (black or white, whichever passes) in both light and dark mode, by construction. The one exception is Exact mode, which ships your hex untouched and hands accessibility back to you. ([eng](./compliance.md))

### About OKLCH

OKLCH describes a color with three numbers you can reason about directly: Lightness (how light or dark), Chroma (how saturated), and Hue (the color itself). Unlike hex or RGB, these track how the eye actually reads color, so a step in lightness looks like the same step on any hue, and you can move one value without disturbing the other two. That is what lets the engine put every step at a predictable lightness and hold a single hue down a ramp. You don't author in OKLCH, but it is why the scales behave: contrast is predictable, hues stay true, and one recipe works for any brand. ([eng](./oklch.md))

## Recommendations for using your primitives

OKChroma gives you primitives: the 12-step ramps for each brand, plus the status
and neutral ramps. It does not ship semantic or component tokens; you build those
on top. The point of this section is that the primitives were *designed* for it.
Each step has a reserved role, so your tokens map cleanly and the mapping holds
across every brand.

**The step roles.** Following Radix's scale model, each step is meant for a
specific job. Steps 1–8 are a linear *surface scale*; the solid fill, its hover,
and the two text shades are *roles* pulled out of the scale and given their own
names (so they don't read as "just another step"):

| Step | Role | Token name |
|----:|------|------|
| 1-2 | surfaces and backgrounds | `paper-1`, `paper-2` |
| 3–5 | low-hierarchy/surface component backgrounds (rest / hover / active) | `wash-3`, `wash-4`, `wash-5` |
| 6–8 | borders and dividers (subtle / border / strong + hover) | `accent-6`, `accent-7`, `accent-8` |
| 9 | emphasis fill — **main vehicle for brand identity** | `cta-1` (brand) / `highlight-1` (neutral, signals) |
| 10 | hover for the emphasis fill | `cta-2` / `highlight-2` |
| 11 | lower-contrast text | `ink-alt` |
| 12 | higher-contrast text | `ink` |

So the emphasis fill is `cta` on brand/secondary ramps and `highlight` on
neutral/signal ramps — same step 9/10, different name by ramp. (Some ramps carry
*both*; see **Two emphasis fills** below.)

Further reading: Radix's [Understanding the
scale](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale).

**White-label considerations.** Because every brand's step N lands at the same
lightness and the same role, you define your tokens against those roles once
(emphasis fill, default border = `accent-6`, body text = `ink`) and they hold for
every brand, with no per-brand re-aliasing. A recommended three-tier setup:

- **Primitive** (what we give you): the surface scale (`paper`/`wash`/`accent`),
  the emphasis fill (`cta-1`/`cta-2` on brand, `highlight-1`/`highlight-2` on
  neutral + signals), text (`ink-alt`/`ink`), and the status + neutral ramps.
- **Semantic** (roles you define): names pinned to those primitives, e.g.
  `solid-fill` → `cta-1`, stable across brands.
- **Component** (what your components consume): points at semantic roles, and is
  the only place you'd swap brand for accent in an "accented" display mode.

**Build the on-emphasis text per brand.** We generate an on-fill text color for
each palette (black or white, whichever stays legible on that ramp's emphasis
fill). A pale-gold brand gets dark on-fill text; a deep navy gets light. This
token is split by fill kind: `on-cta` (text on the brand/secondary cta fill) and
`on-highlight` (text on the neutral/signal highlight fill). When you define your
"text on emphasis fill" tokens, point them at those per-brand values, not one
global color.

**Two emphasis fills.** Brand and neutral ramps each carry *both* emphasis fills,
not one. Brand/secondary lead with a `cta` and also expose a `highlight`
fill; neutral leads with a `highlight` and also exposes a near-black/near-white
`cta` button. Signals carry a `highlight`. Reach for `cta` for the primary action
and `highlight` for emphasis/selection — both come accessibility-paired with their
own on-fill text.

**Status and neutrals are their own ramps.** The four status colors (error,
warning, success, info) and the neutrals come as separate, complete ramps in the
same 12-step shape. Treat them as fixed: they don't move with the brand, and they
give you an accessible status set without extra work.

**Destructive styling.** Style destructive interactions differently from ordinary
ones (an outline with a required icon rather than a solid red fill), especially
when the brand color collides with error. See [UX considerations for red
hues](#ux-considerations-for-red-hues).

## How color shifting works
### Collisions & signals

**When your brand sits near a status color.** Your brand can land near a signal
color (error red, warning yellow, and so on). When it does, the engine keeps them
apart on purpose, so a brand element never gets mistaken for a status. For example,
the warning yellow may shift toward lemon so it reads distinct from a gold brand.
The red case is the big one (see [UX considerations for red
hues](#ux-considerations-for-red-hues)). ([eng](./collisions.md))

**Accent warnings.** If you pick a secondary/accent that reads too close to a
status color, the demo warns you and suggests a more distinct one. The accent is
your choice, so the engine flags it rather than changing it.
([eng](./accent-warning.md))

### UX considerations for red hues

Red is the one color the brand yields to, not the other way around, because red
carries the error and destructive meaning and that has to stay unmistakable. When
a brand sits in the red register, three things happen:

- **We move the brand's lightness.** A red-family brand is darkened so its solid
  fill can't be confused with the error red on a destructive control. The hue is
  kept; the lightness moves.
- **We shift the brand cooler.** Warm reds rotate a few degrees cooler so they read
  as the brand rather than fire-engine error red.
- **We recommend diverging destructive styling.** Style destructive interactions
  differently from ordinary ones (an outline with a required icon, not a solid red
  fill), especially when the brand collides with error. Don't let "destructive"
  ride on color alone.

The first two are automatic in Recommended mode; the third is a recommendation for
your components. ([eng](./collisions.md))

### Warm hues

**Gold stays gold.** Dark shades of yellow, gold, and orange stay gold instead of
turning olive or brown. The engine rotates the hue as it darkens so warm brands
keep their character down the scale, even for muted or off-brand warm colors.
Nothing to set; you just get clean warm darks.
([eng](./warm-hues.md), [relative spine](./relative-spine.md))

**The style lever.** Some semi-muted warm brands (a muted gold) can go two ways:
stay vivid, or lean browner and deeper. When your color is eligible you'll get a
Default / Deeper toggle to choose. Outside that narrow range the toggle doesn't
appear, because it would do nothing. ([eng](./style-lever.md))

## Secondary color (beta)

You can add a secondary (accent) color next to the primary. Treat it as beta,
because of an important limit:

The engine does not decide what the secondary should be in relation to the
primary, and it doesn't harmonize the pair for you. What it does do:

- generate a full, accessible ramp for the secondary, the same way it does for the
  primary,
- warn you if the secondary collides with a status color (see [accent
  warnings](#collisions--signals)).

So the pairing is your responsibility. Pick a secondary that already works with
your primary. The engine guarantees each color is accessible on its own and flags
signal collisions, but it will not fix a clashing or muddy primary/secondary
combination. Use at your discretion.

Where it shows up: accent surfaces, two-color illustrations, and the accent
display modes.

## Modes & extras

**Dark mode keeps your identity.** Fills don't invert or change hue; a too-dark
fill just lifts enough to read on a dark background. The one special case: a red
brand that would clash with the error red floats to a softer pastel so the two
stay distinct. ([eng](./dark-mode.md))

**Illustrations.** Illustrations get their own 4-color palette (wash, tint, mid,
deep). You paint artwork using labeled legend colors per slot, and the engine
recolors it to any brand. Illustrations deliberately skip the UI accessibility
rules so they stay painterly. ([eng](./illustrations.md))

**Neutrals.** The engine suggests a recommended neutral palette for your brand by default, but you also have the option to select a neutral that matches your brand, with extra brand tint, or pick from a small set other hue options. ([eng](./neutrals.md))

**Exact mode and overrides.** Exact mode ships your exact hex and turns off the
engine's adjustments and guarantees; use it when brand guidelines demand the
literal color, and review accessibility yourself. (Archetype override is a
power-user knob for the collision-resolution direction.)
([eng](./escape-hatches.md))

## Getting your colors out

The system is meant to leave the demo and go into your tools. Two paths:

- **CSS custom properties:** the full set of primitives as CSS variables
  (`--brand-cta-1`, `--brand-highlight-1`, `--neutral-ink`, and so on), for light
  and dark. (Semantic names like `solid-fill` are yours to define on top.)
- **Figma variables:** export the system as Figma variables to drop into a Figma
  library.

Both carry the same values the demo renders, so what you preview is what you ship.
