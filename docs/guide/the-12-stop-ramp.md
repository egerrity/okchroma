# The 12-step OKLCH ramp

## Concept

Give the engine one brand color and it generates a 12-step scale. Steps run from
near-white tints (step 1) to the brand-anchored emphasis fill (step 9) to dark
text shades (step 12), and each step has a fixed role (backgrounds, borders, fill,
hover, text), so the same step number does the same job for every brand.

The 12 steps are how the scale is *generated*; the *emitted* tokens split into a
surface scale (1–8) plus roles pulled out of the scale (emphasis fill, text). The
"step 9 = solid fill" shorthand below is the generation view — its emitted name is
a role (`cta`/`highlight`), covered under [Engineering](#engineering).

The engine works in OKLCH, not hex/RGB. OKLCH names a color by Lightness, Chroma
(saturation), and Hue, in a perceptually uniform space: equal number-steps look
like equal visual steps, and you can change one of L/C/H without dragging the
other two. Hex and RGB can't do that, so even spacing and hue-holding become
guesswork. Working in OKLCH is what lets the steps stay evenly spaced and hold a
single hue from top to bottom. (Fuller treatment: [why OKLCH](./oklch.md).)

## Why

White-labeling across many brands is labor-intensive, especially when the work is
spread across many decision-makers. There are too many accessibility concerns to
leave each brand's palette to be created in a vacuum.

## How

The 12-step ramp follows a reserved-step model: each step corresponds to the
contrast required for a reserved role, so the same step number does the same job
on every scale. OKChroma generates that 12-step, role-mapped structure for any
brand hex. Two things hold it together:

- **Step 9 anchors on the brand color.** The brand's lightness pins the solid
  fill, so the scale is built around the real brand rather than snapped to the
  nearest preset. (Recommended mode can still move step 9: gamut limits, a
  collision rule, or the standard warm-red cool-shift. Exact mode ships the hex
  untouched. See [collisions](./collisions.md), [escape hatches](./escape-hatches.md).)
- **Steps align across hues.** Step 6 of a blue brand and step 6 of a green brand
  sit at the same lightness, so layouts built on step numbers stay consistent when
  the brand changes. (See [the stop ladder](./stop-ladder.md).)

## Engineering

**Mechanic.** Three moves:

1. **Lightness** per step comes from a fixed, hue-independent ladder (the stop
   table). Step 9 is the exception: its lightness is the brand's own, so the solid
   fill lands on the brand color, then subject to the gamut/collision/render
   adjustments above (Exact mode skips them).
2. **Chroma** for the light steps (1–8) is *saturation-preserving*: a fraction of
   the chroma the gamut allows at that lightness, scaled by how saturated the
   brand is. Steps 9–12 carry the brand's chroma into the dark end.
3. Every step is **gamut-clamped** into sRGB before it ships.

**Core formula** (light steps 1–8):

```
brandSat = brandC / maxChromaAt(brandL, brandH)      // 0..1, how vivid the brand is
C(step)  = brandSat · satFraction(step) · maxChromaAt(L_step, H)
```

`maxChromaAt(L, H)` is the gamut envelope: the most chroma sRGB allows at that
lightness and hue. That envelope is narrow near white and wide in the mid-tones,
so the same formula produces the quiet→vivid curve in the swatches. (Detail in
[chroma & the gamut envelope](./chroma-envelope.md).)

**Source.**
- [`src/engine/colorEngine.ts`](../../src/engine/colorEngine.ts) → `generateScale()`
  (orchestrates the scale), `maxChromaAt()` (gamut envelope), `makeStop()`
  (builds + gamut-clamps one step).
- [`src/engine/stopTable.ts`](../../src/engine/stopTable.ts) → the fixed lightness
  ladder and `satFraction(step)` (`LIGHT_STOPS`).
- [`src/engine/constraints.ts`](../../src/engine/constraints.ts) → `clampChromaToGamut()`.

**Worked example.** Brand hex `#003865` (a navy) → `generateScale()` reports brand
hue 249.9°, brand chroma 0.095:

| Step | L | C | H | Hex | Role |
|----:|------|------|------|---------|------|
| 1 | 0.993 | 0.003 | 249.9 | `#FBFDFF` | app background |
| 2 | 0.982 | 0.007 | 249.9 | `#F5FAFE` | subtle background |
| 3 | 0.960 | 0.016 | 249.9 | `#EAF3FD` | UI element bg |
| 4 | 0.936 | 0.028 | 249.9 | `#DCECFD` | hovered UI bg |
| 5 | 0.903 | 0.039 | 249.9 | `#CCE2F8` | active UI bg |
| 6 | 0.860 | 0.050 | 249.9 | `#B9D4F1` | subtle border |
| 7 | 0.806 | 0.063 | 249.9 | `#A1C3E7` | border |
| 8 | 0.738 | 0.082 | 249.9 | `#83AFDC` | strong border / hover |
| **9** | **0.335** | **0.095** | **249.9** | **`#003865`** | **emphasis fill** → `cta-1` |
| 10 | 0.404 | 0.095 | 249.9 | `#184B7A` | fill hover → `cta-2` |
| 11 | 0.530 | 0.090 | 249.9 | `#416F9E` | low-contrast text → `ink-alt` |
| 12 | 0.300 | 0.047 | 249.9 | `#1A2F45` | high-contrast text → `ink` |

(`Role` shows the generation job and the emitted token name. Steps 1–8 emit as the
surface scale `paper-1/2`, `wash-3/4/5`, `accent-6/7/8`.)

Things to notice:

- **Hue is constant (249.9°)** across every step; only L and C move. That is the
  OKLCH payoff: one hue, top to bottom.
- **Chroma climbs 0.003 → 0.082** through steps 1–8 (the saturation-preserving
  curve), then the brand's 0.095 carries the solid and dark end.
- **Step 9 is `#003865` here** because this input is in-gamut and trips no
  collision rule, so the fill stays the exact hex. That is **not guaranteed**:
  gamut clamping, a red-band rung-1 re-anchor, or the warm-red cool-shift can move
  step 9 in Recommended mode. The cool-shift (`applyRedCoolRender`) is the
  unconditional **last** step, mutating stops 9/10 in place for warm-red brands —
  skipped only for exact mode, archetype override, and rung-1 re-anchors. Exact
  mode is what ships a hex untouched.
- This brand is **dark**, so step 9's lightness (0.335) sits below step 8's
  (0.738): steps 1–8 are the light ramp; 9–12 the brand-anchored solid and text
  shades. A light brand places step 9 high and derives 10–12 downward.
  (Reproduce: run `#003865` through `generateScale()`.)

**Emitted names: scale vs roles.** The 12 generated stops do not emit as
`--brand-1..12`. Stops 1–8 are a surface scale (`paper`/`wash`/`accent`); 11/12
are the text roles `ink-alt`/`ink`; and stops **9/10 are emphasis-fill ROLES
pulled out of the scale**, not numbered steps. What they're called depends on the
ramp kind ([`tokenNames.ts`](../../src/engine/tokenNames.ts)):

- **brand / secondary** → `cta-1` (stop 9) / `cta-2` (stop 10), text on `on-cta`.
- **neutral / signals** → `highlight-1` / `highlight-2`, text on `on-highlight`.

**Additive role stops (above the 1–12 scale).** Some ramps also carry the *other*
emphasis fill, as engine stops 13–16 kept off the blessed 1–12 snapshot:

- brand / secondary additionally get a **highlight** fill → engine stops 13/14
  (`highlight-1`/`highlight-2`).
- neutral additionally gets a **cta** button → engine stops 15/16
  (`cta-1`/`cta-2`, near-black / near-white).

So brand and neutral ramps each expose both a cta and a highlight; signals expose
a highlight. The cta/highlight role split (and its asymmetry) is the spec's, not
the scale math's.

---

**Provenance:** `docs/handoff-2026-06-10-color-math.md`,
`docs/documentation-source-notes-2026-06-10-color-model.md` (archive).
**See also:** [why OKLCH](./oklch.md), [the stop ladder](./stop-ladder.md), [chroma
& the gamut envelope](./chroma-envelope.md), [lineage](./lineage.md).
