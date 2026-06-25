<!-- Experimental branch scope/dark-chroma. Seam committed byte-identical; these are OPTIONS to pick from, nothing is wired into brands yet. Regenerate swatches: esbuild scripts/dark-swatches.ts --bundle --platform=node --outfile=dist/g.js && node dist/g.js  →  dist/dark-swatches.html -->

# Dark-mode chroma reduction — options to review

**Status: ~70%.** The `darkChromaReduce` seam is in (byte-identical when unset). Four candidate
curves are implemented + rendered. **Nothing is wired into any brand** — pick a direction and I'll
wire it (brands opt in) + re-render + re-bless.

## The finding that reframes this

I expected dark to carry *more* chroma than light. It doesn't: **mean dark fill chroma ÷ light fill
chroma = 0.99×** across the subjects. So the loudness is **perceptual, not numerical** — the *same*
chroma reads louder on a dark background (saturated colour glows/vibrates on dark, worst for
blue/violet, mild for warm). That's why a **hue + chroma-aware** cut is right and a flat one is wrong:
we're compensating for a perceptual asymmetry, concentrated on the hues that actually glow.

(The old "yellow fill 1.55 → 11.23 contrast" jump is a **lightness** effect — the dark fill is lifted
to stay visible — which chroma can't and shouldn't fix. Lightness stays locked-untouched.)

## The seam (committed, byte-identical)

`GenerateOptions.darkChromaReduce(L, C, H) => factor` — a terminal multiply on each **dark** stop's
**rendered** chroma (so it self-targets the stops that are actually saturated). Applied at the dark
subtle (1–8), fill (9/10 incl. the enforce-contrast rebuild), and text (11/12) sites. **Lightness
never touched. Highlight rung exempt. Generated neutral exempt** (per your call). Unset ⇒ identity ⇒
every gate green unchanged.

## The four options

All gentle-leaning, clamped to ≥0.50 (no stop ever loses more than half its chroma). See
`dist/dark-swatches.html` for the full per-subject comparison (light target → dark before → A/B/C/D).

| | philosophy | uses | blue/violet fill | red fill | yellow fill | character |
|---|---|---|---|---|---|---|
| **A** | hue-led L-taper | L, H | ~60% | ~78% | spared | spec-v1 baseline; **no chroma term** — included to show why chroma-awareness helps |
| **B** | chroma-led | C, H | ~59% | ~65% | spared | cut scales with saturation — loud fills trimmed, muted stops untouched; L-independent |
| **C** | chroma ceiling | L, C, H | ~50% | ~63% | spared | hard cap per L+hue; only over-bright stops pulled down — strongest on the offenders, risk of a visible kink at the cap |
| **D** | hybrid | L, C, H | ~55% | ~66% | spared | gentle product of all three; concentrates on the hot mid-band |

Headline (mean dark/light fill chroma): Before **0.99×** · A 0.73 · B 0.65 · C 0.61 · D 0.63.
Across every option **yellow/green stay put** (the gamut already self-clamps them) and **blue/violet
get the deepest cut** — the intended targeting.

## Recommendation

**Start with D (hybrid).** It's the only option that is both hue- *and* chroma-aware (your steer) *and*
spares the already-quiet deep stops via the L-taper, so the cut lands where the glow is. **B** is the
close alternative if you'd rather the cut track pure saturation with no L-shaping. **C** is the most
principled (a hard loudness ceiling) but the most aggressive and can kink. **A** is really the
baseline — it ignores chroma, which is exactly the thing you said wouldn't be enough.

`dist/dark-swatches.html` also shows **D vs an aggressive D+** on the blue/violet offenders, so you can
see how far it goes if D reads too timid.

## Open calls for you

1. **Which curve** (D / B / C / A) — or "go gentler/deeper than D."
2. **Composition with the collider** muted-rose fill (`DARK_COLLIDER_MUTED_CHROMA_SCALE 0.55`): let the
   reduction compose on top (dustier rose) or exempt it? (Default in code: composes.)
3. Once picked: I wire it into `resolveBrand` (brands pass it), re-render the demo/fleet, and re-bless
   dark-audit + highlight snapshots for your visual sign-off. **Not done autonomously.**

## What's NOT done (the remaining ~30%, yours)

Wiring the chosen curve into the real brand path; demo preview of it in context; the collider decision;
re-bless. The seam + curves + this comparison are the scaffold to decide from.
