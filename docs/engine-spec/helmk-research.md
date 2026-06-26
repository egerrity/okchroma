# HelmLab / Helmholtz–Kohlrausch research + the perceptual-ladder effort

> Durable record of the deep-research pass on HelmLab and the H-K (Helmholtz–Kohlrausch)
> effect, the adversarial fact-check, and what we built from it. Companion to
> [`ENGINE-SPEC.md`](./ENGINE-SPEC.md) and [`CATALOG.md`](./CATALOG.md). Analysis tooling lives in
> `scripts/helmk-*.ts` (+ shared `scripts/helmk-lib.ts`); the engine implementation in
> `src/engine/perceptualL.ts`. Branch: `scope/helmk-curve`.

## Question

How can the HelmLab color space (Gorkem Yildiz) help write consistent L/C/H curve math for
light/dark modes and keep generated brand colors stable? Easy-win vs. scrap-and-rebuild, for an
OKLCH-based token engine that derives L and C as functions of H.

## The core insight

OKLCH treats L and C as independent and does **not** model the Helmholtz–Kohlrausch effect — the
perceptual fact that saturated colors appear lighter than their measured luminance (blue/violet/red
"bloom"; yellow/green sit low). So holding OKLCH L fixed across hue does **not** hold *apparent*
lightness. Every hand-tuned constant in the old engine (`YELLOW_L_LIFT`, the dark `loudnessCap` dips
at 265°/345°, the gold-spine torsion) was an **eyeballed H-K correction**. The catalog's deferred
blockers (C24 "chroma not adjusted per hue", C25 "SHAPE_DARK cliff", C26 "red reads orange in dark")
are all H-K-shaped. The fix: make the value fall out of an H-K-aware predictor instead of patching.

## Deep-research findings (16 sources fetched, 70 claims, 25 adversarially verified, 20 confirmed)

**Confirmed (high confidence):**
1. HelmLab embeds H-K directly in a learned, closed-form, additive lightness term
   `L⁺ = w_HK·C^p_HK·[1+f_HK(h)]` (w_HK≈0.268, p_HK≈0.894, 2-harmonic hue mod; H-K factor peaks
   near 210°/blue). OKLab/OKLCH lack this by construction.
2. Hue is a **learned** correction: a 4-harmonic Fourier hue rotation (preserves chroma) + a
   hue-dependent chroma power `C^(1+ε(h))`.
3. **Two-space family** — `MetricSpace` (helmlch) CONTAINS the H-K term (distance/contrast);
   `GenSpace` (helmgen) has **no** explicit H-K term (palette/gradient generation). So copying
   `semanticScale()`/`gradient()` would NOT give H-K-stable lightness; the H-K lives in the metric.
4. Concrete, mostly-invertible formulas with named coefficients — reproducible without retraining.
   The H-K term is a pure additive function of (C,h), so it can layer onto OKLCH L as a hue-keyed
   offset without adopting the whole space.
5. Real, **MIT-licensed**, zero-dependency `helmlab` packages on npm + PyPI (+ a `postcss-helmlab`
   plugin), v0.14.0. API: `semanticScale()`, `gradient()`, `contrastRatio()`/`ensureContrast()`,
   `difference()`/`deltaE()`, `fromHex`/`toHex`, dark/light adaptation, token export. Merged into
   Color.js (PR #722, the `helmgenlch` space) — the only meaningful independent corroboration.
6. Has dark-region machinery (Stage-6 `λd(h)` per-hue compression, Stage-9 residual) but its
   light/dark **mode adaptation is an admitted heuristic** (untrained surround param S) — it does
   NOT hand you a stable cross-mode L/C curve.

**Refuted / do NOT rely on (adversarial pass killed these):**
- "**64,000 human observations**" — actually **3,813 color pairs** from the COMBVD set. 64k is a
  judgement count, not independent datapoints. Marketing framing.
- "**Beats OKLab / 23% better than CIEDE2000**" STRESS benchmarks — self-reported, single-source,
  not independently replicated; underperforms CIEDE2000 on **3 of 6** COMBVD sub-datasets.
- "H-K is the single most important component" (ablation) — refuted.
- Critiques: 72 fitted params vs OKLab's ~15 (overfit risk), RMS hue error ~18°, ~95% of training
  pairs use the 10° observer, single-author non-peer-reviewed preprint (arXiv:2602.23010).

**Provenance:** essentially everything traces to one person (Gorkem Yildiz). Adopt for the H-K
MECHANISM + engineering ergonomics, NOT as a "more accurate space than OKLCH."

## The decisive cross-check finding (verified in `scripts/helmk-probe.ts`)

We installed `helmlab` (dev-dep) and tested its MetricSpace L as an apparent-lightness predictor
against Nayatani 1997 + Fairchild–Pirrotta 1991. **HelmLab's `.info().L` is the WRONG tool for the
lightness job:** at fixed OKLCH L, H-K theory + both classical models say saturated blue/violet read
*lighter* than gray; HelmLab says they read *darker* (opposite sign — blue −0.15, violet −0.04 vs
Nayatani +12). HelmLab's L is distance-optimized (COMBVD), ~luminance-tracking — not a
heterochromatic-brightness predictor. **Build the curve on Nayatani/Fairchild** (they agree with each
other, r≈0.81, and with theory); keep HelmLab for what it's actually for — perceptual DISTANCE
(→ `collision.ts`) and contrast/gamut. (Sharp question for the author if we reach out.)

## Recommendation taken: EASY-WIN, not scrap-and-rebuild

- Built a peer-reviewed H-K predictor (Nayatani 1997, coeffs from github.com/ilia3101/HKE, validated
  vs Fairchild–Pirrotta) into `src/engine/perceptualL.ts`. The per-hue correction falls out of it;
  no eyeballed constants. Tunable `KEEP_LIGHT`/`KEEP_DARK` knobs (1.0 = keep-vibrancy ↔ 0 = match
  neutral). Auto-fades for low chroma (neutrals untouched, no special case).
- Did NOT migrate onto HelmLab MetricSpace (accuracy claims refuted; overfit/single-author risk).
- Did NOT apply H-K to the neutral path (C≈0.006 — boost≈0 there + HelmLab's documented low-chroma
  weakness).

## What landed (branch `scope/helmk-curve`)

- **LIGHT:** `perceptualRungL` solves each rung's L to a target perceived lightness (stops 1–8, text,
  highlight); `YELLOW_L_LIFT` use deleted.
- **DARK:** `perceptualDarkC` redistributes chroma per hue (band-limited to mid surfaces) — the
  principled replacement for `loudnessCap` on surfaces; `darkCtaTrim`/cta untouched.
- **Highlight legibility (C25):** `placeLegibleRung` moves the rung VALUE until its computed on-text
  clears WCAG (never forces text). Uniform white-text both modes (old black-flip retired,
  owner-approved). `highlight-audit` C10 assertions rewritten to computed-legibility.
- **Token rename:** highlight-1/2 → highlight-9/10, ink-alt/ink → ink-11/12 (cta kept).
- **cta math untouched** — #07074f/#869cda canary GREEN (the proof). Snapshots re-blessed.
- Pre-existing/deferred: dark-audit D (11/12 dark text separation) = 3 (improved from 7).

## Sources

- arXiv:2602.23010 · https://www.npmjs.com/package/helmlab · https://github.com/Grkmyldz148/helmlab
- Color.js PR #722 (independent corroboration) · github.com/ilia3101/HKE (Nayatani 1997 ref impl)
- Wiley *Color Research & Application* col.70057 (peer-reviewed CIECAM16/CIELAB H-K modifications)
- Fairchild & Pirrotta 1991; Nayatani 1997; Ware–Cowan / CIE 1988 (peer-reviewed H-K predictors)
