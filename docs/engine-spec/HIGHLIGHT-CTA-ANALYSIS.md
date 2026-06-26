# Highlight + cta analysis — code-grounded diagnosis & proposed fix

> Written 2026-06-26 on `fix/highlight` (off published `main` = `d87c8bf`). Companion to
> [`HIGHLIGHT-CTA-HANDOFF.md`](./HIGHLIGHT-CTA-HANDOFF.md), [`ENGINE-SPEC.md`](./ENGINE-SPEC.md),
> [`helmk-research.md`](./helmk-research.md).
>
> **Status: ANALYSIS ONLY — no engine code changed.** Per the standing rule (§7), the fix
> in part (c) is presented for owner sign-off. The §(b) diagnosis **refines** the handoff's
> hypothesis from measurement — the handoff asked me to "confirm or correct from the code,"
> and the correction is material (see §B.0).
>
> Measurements come from four read-only scripts that run the **real** `resolveBrand`
> pipeline over the full fleet (brands + secondaries + 4 signals):
> `scripts/highlight-misfit.ts`, `scripts/highlight-mechanism.ts`, `scripts/deadzone-probe.ts`,
> `scripts/dark-emphasis-band.ts` (bundle with esbuild + node, same pattern as the audits).
>
> **Verification:** the code-trace, the causal mechanism (§B.2), the fix (§C), and the WIP
> reconciliation (§D) were each re-derived and *adversarially attacked* by independent agents on the
> live code. The mechanism came back **confirmed**; the trace and fix came back **partial** and their
> corrections are folded in here — notably the fixed-constant `rootL` floor is **≈0.68 (not 0.66)**,
> a flat constant over-lifts quiet hues so **per-hue perceptual placement is preferred** (§C.3), and
> the lifted highlight ends up only **0.02 L** from the cta so a cta↔highlight guard is needed (§C.4–5).

---

## A. How the engine produces each token's L and C (both modes)

Everything is one function: `src/engine/colorEngine.ts :: generateScale` (`:401`). Input hex →
`hexToOklch` → `{brandL, brandC, brandH}` (`:407`). `archetype = classifyArchetype(brandL)`;
`scaleL = brandL` (or the archetype median when forced) (`:417-418`). Chroma flows through a
single seam `cAt(mode, L, nativeC)` (`:415`) — identity unless a `chromaCurve` (neutral) or
`heat` overrides it.

### Token-by-token — LIGHTNESS (L)

| token | LIGHT L | DARK L |
|---|---|---|
| **stops 1–8** (`paper/wash/accent`) | **perceptual** — `perceptualRungL(rootL, chromaAt(rootL), lightHueAt(rootL))` (`:549`). Solves the OKLCH L whose *apparent* (Nayatani H-K) lightness hits `grayApparentL(rootL) + KEEP_LIGHT·meanBoost(rootL,C)` (`perceptualL.ts:120`). | **fixed scaffold** — `L = DARK_NEUTRAL_L[i]`, emitted directly (`:621`). Hue torsion rotates H at the fixed L; it never moves L. |
| **cta 9/10** | **pinned off-curve** — `light9L = fillAnchorL = scaleL` (the archetype/identity L) (`:569-575`); hover = `hoverL(L)`. Only `enforceOnFillContrast` may darken it to the WCAG-white edge. | `dark9L = max(scaleL, darkFillMinL)` — the dark lift floor `DARK_BRAND_FILL_MIN_L = 0.70` for brands (`:606`, `stopTable.ts:132`). |
| **ink 11/12** | **perceptual anchor, WCAG-bounded** — `perceptualRungL(rootL,…)` then `min(anchor, findMaxLForContrast(…, stop2Y, ratio))` (`:583-597`). | **fixed scaffold** — `DARK_NEUTRAL_L[10]=0.80`, `[11]=0.93` (`:632/:639`). |
| **highlight 13/14** | **perceptual + legibility** — `placeLegibleRung(13, perceptualRungL(HIGHLIGHT_LIGHT.rootL=0.62,…))` (`:718`). | **fixed start + legibility** — `placeLegibleRung(13, HIGHLIGHT_DARK.rootL=0.62,…)` (`:731`). ⚠️ this is the crux — see §B. |

So the handoff's headline is **correct**: *light L is solved on the perceptual curve; dark L is
the hand-blessed `DARK_NEUTRAL_L` scaffold.* The H-K migration moved **dark CHROMA only**
(`perceptualDarkC`), never dark L (`perceptualL.ts:13-16`, confirmed by the dark loop at `:619-627`).

> **cta-L is "pinned" only on the default path** — three branches refine it (they don't bear on the
> highlight fix, but the trace should be exact): (1) **light** `fillAnchorL = findLForContrast(…4.6)`
> when `enforceWhiteFill` is set (the success signal) (`:440-443`), plus a second `enforceOnFillContrast`
> darken at `:570-573`; (2) **dark** cta is re-darkened to the WCAG-4.6 edge at `:654-661` when white
> on-fill fails 4.5 (can dip *below* the lift floor), and `darkColliderFill:'muted'` hard-sets
> `dark9L = DARK_COLLIDER_MUTED_L = 0.80` (`:609-612`); (3) **light** cta 9/10 hue/C are cool-rotated
> *after* `generateScale` by `applyRedCoolRender` (`:756`, called from `resolveBrand`) for red-band
> brands. Likewise dark **chroma** falls back to `applyChromaFloor` when no `darkChromaCurve` is passed
> (exact/ships-raw brands, `:625/:636/:643`), and dark hue is `torsionedHue(darkH,…)` with `darkH`
> cooled for `coolRedDark`+red-band (`:529-532`).

### Token-by-token — CHROMA (C)

- **Light, stops 1–8** (`:542-546`): `chromaAt(L) = cLadder + u·(cEnv − cLadder)`, where `cLadder =
  vSubtle·chromaBoost·LIGHT_BASE_C[i]` (vivid-brand ladder, yellow-boosted) and `cEnv =
  brandSat·satFraction·maxChromaAt(L,H)` (the muted-warm "cream" envelope). `u` is the muted-warm
  blend weight. `makeStop` gamut-clamps after.
- **Light, cta / ink / highlight**: cta keeps `brandC`; ink uses `cMult·brandC` clamped; highlight
  uses its own `hlLadderC = vSubtle·chromaBoost·HIGHLIGHT_LIGHT.baseC(0.142)` blended to the
  envelope (`:675-679`).
- **Dark, all surface + text + highlight chroma**: `darkChromaCurve(L,H,brandC,ctaC)`
  (`darkChromaCurve.ts:82`) = `perceptualDarkC(L,H, max(brandC·shapeAt(L), floorFracAt(L)·ctaC))`.
  `shapeAt` is the per-stop dark chroma shape (deep stops bumped for dark legibility; peaks at the fill); `floorFracAt` is an
  identity-proportional deep-surface floor; `perceptualDarkC` redistributes per hue so every hue
  reads at equal prominence on dark (band-limited to L 0.22–0.66, `perceptualL.ts:130-152`).
- **Dark, cta**: `darkC9 = brandC·darkCtaTrim(H)` (`:608`) — `darkCtaTrim` halves the per-hue
  `loudnessCap` trim (`darkChromaCurve.ts:93`). This is the **only** surviving piece of the old
  `loudnessCap`, and it is what the `#869cda` canary protects.

### `ons` (on-cta / on-highlight) — one shared rule

`onTextIsWhite(Y, L, C, H, enforce)` (`:389`): **APCA picks** the polarity (the side with the
larger `|Lc|`); when `enforce`, a WCAG bound *flips* the pick to the other side **only if** the
picked side fails WCAG 4.5 **and** the other side clears WCAG 4.5 **and** its APCA `|Lc| ≥ 45`.
That last clause is the hinge of the whole defect (§B).

---

## B. Diagnosis — the dark highlight (confirmed from execution)

### B.0 The handoff's hypothesis is directionally right but mis-aimed

The handoff says the dark highlight "doesn't fit" because its L is a *fixed* `HIGHLIGHT_DARK.rootL
= 0.62` that "floats" off the dark ladder. **Measurement refutes the "floats" framing:**

`scripts/highlight-misfit.ts` §1 — apparent (Nayatani) lightness of the highlight across the fleet:

| | mean L\* | sd | range |
|---|---|---|---|
| LIGHT highlight | 57.20 | **4.12** | 15.08 |
| DARK highlight | 53.62 | **2.70** | 10.59 |

The **dark** highlight's apparent L is *tighter* than light's, not wider. "Fixed L floats in
apparent terms" is **not** the dominant defect. The real defect is **ladder position**, not float.

### B.1 The actual defect: the white-text value-move crams the highlight onto accent-8

`scripts/highlight-misfit.ts` §2 — where the highlight sits between its neighbors,
`pos = (hl − acc8)/(ink11 − acc8)` in apparent-L:

| | mean pos | range |
|---|---|---|
| LIGHT | **0.71** | 0.45 … 0.96 |
| DARK | **0.08** | −0.00 … 0.16 |

In light the highlight is a prominent chip ~71% of the way across the accent-8↔ink-11 span. In
dark it sits at **8%** — jammed against accent-8. `scripts/highlight-mechanism.ts` shows the raw
OKLCH-L collision directly:

```
ramp        | DARK acc8L  hlL    ΔOKL   Δapparent
Sencha      | 0.550      0.549   0.001   0.13 L*   ← literally coincident
Matcha      | 0.550      0.550   0.000   0.05 L*
Cold Brew   | 0.550      0.562   0.012   1.59 L*
Chili Mocha | 0.550      0.579   0.029   4.68 L*
(light, for contrast)            ΔOKL 0.135–0.221  /  Δapparent 13.3–24.0 L*
```

Dark accent-8 (`DARK_NEUTRAL_L[7] = 0.55`) and the highlight separate by **ΔL +0.00–+0.03 (mean
+0.017) / 0.05–4.68 L\***, versus **0.13–0.22 / 13–24 L\*** in light. The highlight lands a hair
*above* accent-8 (Sencha −0.001 and Matcha +0.000 are coincident; the rest sit just above), so the
"emphasis" chip has effectively the same lightness as the subtle-border rung. **That** is "the ladder
reads broken at the highlight."

### B.2 The causal chain (every link verified from code + scripts)

`HIGHLIGHT_DARK.rootL = 0.62`, yet the shipped dark highlight lands at **0.549–0.579** — something
drags it down. It is the `placeLegibleRung` white-text loop (`:692-714`). `deadzone-probe.ts`:

```
Cold Brew dark highlight (H≈250):
  L     whiteWCAG  blackWCAG  whiteAPCA|Lc|  blackAPCA|Lc|
  0.62    3.62       5.80        69.2          40.3      ← black passes WCAG, but APCA<45
  0.66    3.09       6.79        63.2          46.3      ← BLACK falls out (WCAG≥4.5 AND APCA≥45)
  0.70    2.66       7.91        56.8          52.4      ← BLACK falls out
```

1. At the start L 0.62, **APCA picks white** (`onTextIsWhite`, `:390`: white `|Lc|` 69 > black 40).
   The polarity is decided **once, here at entry** (`:698`) and is *not* re-evaluated as the loop
   moves L — the loop only slides L for the already-chosen white side (`:706-712`).
2. White **fails WCAG 4.5** (3.4–3.9 across the fleet).
3. The enforce-flip-to-black (`:392-393`) is **blocked**: it requires black's APCA `|Lc| ≥ 45`, but
   at 0.62 black is **38–43** (black *passes* WCAG at 5.3–6.1 — the block is the **APCA-45 floor**,
   not WCAG). This is the documented L 0.56–0.65 dead zone, and it is strictly an **entry-point**
   phenomenon.
4. So `placeLegibleRung` falls to its "darken-for-white" branch (`:706-711`) and moves L down until
   white clears WCAG 4.6 — landing at **0.549–0.579 (mean 0.566)**, just above accent-8 (0.55).

`highlight-mechanism.ts` confirms every shipped dark highlight is `WHITE` at exactly `4.60` WCAG
(the loop's exit target), darkened from 0.62. Note the scaffold itself is a contributing
pre-condition — `DARK_NEUTRAL_L[7]=0.55` sits only **0.070** below the 0.62 start, a thin starting
band — but a counterfactual (regenerate with `enforceOnFillContrast` **off**, everything else held)
keeps the rung at **0.620 (ΔL +0.070 for every brand)**; turning it **on** collapses that to mean
+0.017. **The white-text value-move is the operative cause** — not `darkChromaCurve`, not `dark9L`,
not the scaffold values (all held identical in the counterfactual). The sanctioned pipeline (APCA
picks → WCAG value-move) is doing its job — but the value-move closes the only gap the emphasis chip
had.

### B.3 Why white text *cannot* coexist with ladder separation in dark

A white-text fill must be **≤ ~0.58** to clear WCAG 4.5. The dark **surface** ladder already fills
`0.178 → 0.55` (`DARK_NEUTRAL_L[0..7]`). So any white-text emphasis fill is trapped *inside or atop
the surface band* — it has no separated home. The only separated band is **0.62–0.72** (above
accent-8 0.55, below ink-11 0.80), and that band is **black-text** territory: `scripts/dark-emphasis-band.ts`
shows the dark **cta already lives there at L 0.70 with black on-fill text**. The light mode never
hits this because light accent-8 sits at **0.738** — far above the white-legibility ceiling — so a
white-text highlight at ~0.57 separates cleanly.

**Root cause, one sentence:** *the owner-approved "uniform white text both modes" decision forces
the dark highlight below ~0.58, where the dark surface ladder already lives, so the emphasis chip
collapses onto accent-8 — the pipeline has no term keeping an emphasis rung out of the surface band.*

### B.4 Why the gates are green anyway

`npm run figma:verify` PASS (cta canary `#07074f`/`#869cda` intact) and `npm run highlight-audit`
PASS (matches blessed snapshot). The highlight-audit asserts light monotonicity (`a8 > hl9 > hl10`)
and that the **dark hover pair is distinct** (`|d9.L − d10.L| > 0.005`) and that the computed
polarity is legible — but **nothing asserts dark accent-8 ↔ highlight separation**. The defect is
invisible to the gate, which is why it ships green.

---

## C. Proposed fix (for approval — no code changed yet)

### C.1 What changes, where, and why it falls OUT of the pipeline

**Move the dark highlight rung into the black-text emphasis band and let on-highlight fall out.**

- **Where:** the dark highlight start L (`placeLegibleRung(13, HIGHLIGHT_DARK.rootL, …)`, `:731`).
  **Recommended (principled) form — perceptual placement**, mirroring the light path: solve the dark
  highlight L per hue so the emphasis rung reads at a target *apparent* lightness sitting at a chosen
  ladder position between accent-8 (0.55) and the cta (0.70) — i.e. bring **this one dark rung onto
  the curve**, using the `solveLForApparent` primitive already in `perceptualL.ts:73`. Each hue then
  lifts by the *minimum* it needs for black to fall out, reading at uniform prominence.
- **Blunt (fixed-constant) form — and its measured floor:** simply raising `HIGHLIGHT_DARK.rootL`
  (`stopTable.ts:49`) works **only at ≈0.68, not "0.66–0.68."** Simulating the real `placeLegibleRung`
  loop over the 62-ramp fleet: at `rootL = 0.66`, **26/62** ramps still pick white and the loop
  value-moves them back to ~0.55–0.58 (no fix); at `0.67`, **9/62** still fail (all high-chroma
  reds/pinks/purples); only at **≈0.675–0.68** do **62/62** early-return with **no value-move**. A
  flat 0.68 then *over-lifts* the quiet hues (green needs only 0.635), so it is a blunt instrument —
  hence the perceptual form is preferred.
- **Why it falls out, not patches:** once the start L is in the black-legible band, the **computed**
  polarity is **black** with **no value-move** — `placeLegibleRung` finds the natural pick already
  legible and returns at its first evaluation (`:702`). on-highlight is genuinely computed from the
  fill's luminance (mirrors on-cta), exactly as ENGINE-SPEC §4.1 demands. We add **no forced layer**;
  we *remove* the conditions that triggered the darken loop. The chip then separates from accent-8 by
  ~0.08–0.13 and sits just below the cta, in the band emphasis fills belong to in dark mode.
- **Symmetry, corrected:** the ladder inverts between modes (surfaces near-white→near-black; text
  dark→light), so the emphasis fill must invert too — a **dark chip with white text below light
  accent-8** in light; a **light chip with black text above dark accent-8** in dark. "Uniform white
  text both modes" was fighting that inversion.

### C.2 The gating owner decision

This fix **flips on-highlight from white → black in dark mode** (currently white for **62/62**
ramps), which contradicts the "uniform white-text both modes (owner-approved)" decision
(`helmk-research.md:88`, memory `green-signal-white-text-followup`). **That decision is the actual
blocker, and it is yours to make.** The measurements say plainly: *in dark mode you can have a
separated emphasis highlight, or uniform white text, but not both* (B.3).

**But the decision is narrower than it sounds:** black-first dark fills are **already this engine's
posture** — the success/info/warning signals all carry black on-fill text in dark
(`signals.ts:29` "dark fills are black-first by design"; the dark cta is black-text too, §A). So
flipping the dark *highlight* to black is *consistent* with the established dark-mode philosophy; the
conflict is with **one narrow highlight-specific decision**, not with the engine's overall direction.
My recommendation is to let polarity fall out (black in dark) — it's the only option that restores
the ladder without moving the blessed `DARK_NEUTRAL_L` scaffold or forcing anything.

Rejected alternatives (measured, for the record):
- **Keep white, deepen the highlight below the surfaces** (white-text chip at L~0.42): collides with
  accent-7 (`DARK_NEUTRAL_L[6]=0.42`); the surfaces densely fill everything ≤0.55, so there is no
  clear sub-band — and a *darker-than-everything* emphasis chip in dark mode is the wrong affordance.
- **Keep white, move the whole dark surface ladder down** to make room: re-blesses `DARK_NEUTRAL_L`
  for every brand to rescue one rung — large blast radius, fights the greenfield ladder that was just
  blessed.

### C.3 Fixed-constant vs perceptual placement (a sub-decision) — measured detail

The black-clear threshold is **hue-dependent**, because the same H-K bloom this engine exists to model
raises the apparent lightness of saturated reds/blues/purples. Measured min `rootL` for black to fall
out (WCAG ≥ 4.5 **and** APCA |Lc| ≥ 45) across the 62-ramp fleet: **0.635** (Sencha, green H141) →
**0.675** (Strawberry Milk H6 / Cranberry H6 / Dragonfruit H355, high-chroma red-pink). So:
- A single fixed `rootL` must satisfy the *worst* hue (≈0.675–0.68); that **over-lifts** the quiet
  hues by up to ~0.04 — they could have separated with less lift and would now sit higher than
  necessary, nearer the cta. Blunt but workable as a first cut.
- **Perceptual placement is the right fit**: solve L per hue to a constant apparent target in the band
  → black falls out for every hue at the *minimum* lift it needs, and the highlight reads at uniform
  prominence. This is "dark L on the curve," scoped to the rung that actually needs it (not the whole
  `DARK_NEUTRAL_L` ladder, which B.0 shows is already ~perceptual at its low chroma).

### C.4 The cta (Problem 2) — measured, and where it actually surfaces

The dark **cta is structurally fine today**: it sits at L 0.70 with black on-fill text, well above
accent-8 — already in the emphasis band (`dark-emphasis-band.ts`). Its apparent-L spread (sd 5.0,
`highlight-misfit.ts` §5) is archetype-driven and expected; the light cta's large spread (sd 20.7)
is the archetype design, not a defect. **The cta's real question only surfaces *after* the highlight
fix:** once the highlight joins the ~0.68–0.70 black-text band, cta (loud archetype value) and
highlight (quiet scale value) become neighbors and must stay distinguishable — exactly the ENGINE-SPEC
§3.1 split (cta = the loud per-family differentiator; highlight = the universal quiet scale value).
The proximity is **tight and measured**: a fixed-0.68 highlight sits only **0.020 L** below the brand
cta floor (`DARK_BRAND_FILL_MIN_L = 0.70`) — essentially adjacent — so **L gives almost no
separation; the whole burden falls on chroma/archetype** (cta keeps `darkCtaTrim`-loud chroma;
highlight rides the calmer `darkChromaCurve` redistribution; cta also floats by archetype, e.g. Honey
Lemon → 0.868). This is a further argument for **perceptual placement that can sit a touch lower** at
each hue's minimum lift, opening L-room below the cta. I recommend scoping the cta as a **follow-up
after the highlight lands**, adding an explicit cta↔highlight L-proximity check (see C.5), confirming
separation in the dark band visually, and **leaving cta math (and its canary) untouched** for this
change.

### C.5 Re-bless / verification plan

1. **Keep the cta canary green** — the proposed change touches only the dark **highlight** start L;
   it must not move `cta-1`. `npm run figma:verify` must stay PASS (`#07074f` / `#869cda`).
2. **Strengthen the audit first (or alongside):** `scripts/highlight-audit.ts` currently asserts
   neither **dark accent-8 ↔ highlight** separation **nor cta ↔ highlight** L-proximity. Add **both**
   (e.g. `darkHl.L − darkAcc8.L ≥ <floor>` and `darkCta.L − darkHl.L ≥ <gap>`, owner-set) so neither
   the current collapse nor the new cta-adjacency can silently ship. (This is the un-done C10 rewrite
   ENGINE-SPEC §Resume flags.)
3. **Visual review on a DARK background**, `demo/TokenCards.tsx`, full role set — the compare grid
   (`demo/CustomTheme.tsx::swatchMatrix`, cta moved to the end) is the fastest read. Confirm per
   family that on-highlight **falls out** (black in dark, after the decision) and the highlight now
   reads as a distinct emphasis chip above accent-8 and below the cta. Include a signal-shifting
   brand (warm-yellow→lemon) and a red-band brand (Cranberry/Hibiscus — the worst current colliders).
4. **Expect a full-fleet dark re-bless** — moving the dark highlight rung changes every brand's dark
   highlight stops. Re-bless `highlight-audit:bless` and re-baseline `smooth:baseline` **only after
   visual approval** (the smoothness shift is expected, not a regression). `npm run audit` (dark
   on-fill) should be unaffected (the highlight isn't in its scope) — confirm it stays PASS.
5. **Gates to end green:** `typecheck`, `figma:verify`, `audit`, `highlight-audit` (re-blessed),
   `smooth` (re-baselined).

---

## D. Reconciliation of prior WIP (`wip/highlight-sim`, commit 125d048, base 4a1c7e0)

- **Engine edits (`colorEngine.ts`, `resolve.ts`) — do NOT port.** They add a sim-only `extLadder`
  hook: light-mode ladder-extension rungs with `enforceWhite` darkening (yellow-band exempt). That
  approach is **superseded** by the current `placeLegibleRung` / `enforceOnFillContrast` path —
  and notably the prior exploration used the *same* `rootL 0.620, enforceWhite` white-text scaffold
  that B.2 shows is the trap. No intent to salvage there.
- **Sim scripts — optional.** `highlight-sim.ts`, `highlight-render.ts`, `neutral-cta-sim.ts` are
  pure read-only additions (candidate-comparison + neutral-cta render harnesses). They can be
  cherry-picked if a side-by-side render is wanted, but the three scripts written for this analysis
  (`highlight-misfit.ts`, `highlight-mechanism.ts`, `deadzone-probe.ts`) already measure the misfit
  numerically and more pointedly. Do not branch from `wip/highlight-sim`.

## E. Note on the stale catalog

`CATALOG.md` C13/C24/C25/C26 describe the retired `SHAPE_DARK`/`loudnessCap` machinery and were
**not** used to ground this analysis (handoff caution honored). The live `perceptualDarkC` path is
what runs. If we touch the catalog while fixing, reconcile those entries.
