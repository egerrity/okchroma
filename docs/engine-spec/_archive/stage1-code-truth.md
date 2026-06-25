# Stage 1 — Code-truth + bolt-on scan

_Blind code-only audit: 7 area agents + synthesis (workflow wamf4b0fa). No docs read._

## Architecture map

## (A) ENGINE ORDERING — the exact sequence of checks/decisions

There are two nested orderings: the per-scale order inside `generateScale`, and the brand-resolution order inside `resolveBrand` which wraps it.

### A.1 `resolveBrand(hex, name, opts)` — top-level decision order (src/engine/resolve.ts:115–214)
1. **Build the `floor` opts object once** (resolve.ts:119–130). Every `generateScale` call in the function rides these: `darkFillMinL=DARK_BRAND_FILL_MIN_L`, `darkStops=ACCENT_DARK_STOPS`, `enforceOnFillContrast=!exact`, `coolRedDark=!exact`, `style`, `highlight=true`. (Verified.)
2. **Generate the base scale from the RAW hex**: `scale = generateScale(hex, name, undefined, floor)` (resolve.ts:134).
3. **Archetype-override branch** (resolve.ts:140–141): if `opts.archetypeOverride`, REGENERATE forcing that archetype and SKIP all collision logic (steps 4–7).
4. **Light-mode collision scan** (resolve.ts:142–156): `collisionStatus(scale)` over all SIGNAL_SCALES (resolve.ts:88–98) separates error (→`trigger`) from other signals (→`pending`). If error triggers, gate on `inRedBand(scale.brandH)` (resolve.ts:148): in-band → set `rung1` and REGENERATE with `RUNG1_ARCHETYPE='dark'` + `rung1Opts` (stop11/12 deepen) (resolve.ts:149–150); out-of-band (pink/orange) → set `errorComponentRule=true` (resolve.ts:152). `pending` carried forward (resolve.ts:155).
5. **Dark-mode error collision check, separate** (resolve.ts:162–178): if error collides in dark, gate on `inRedBand` again: in-band → `darkCollider='muted'` and REGENERATE with `darkColliderFill` + carried archetype/rung1 opts (resolve.ts:167–173); out-of-band → `errorComponentRule=true` (resolve.ts:175).
6. **Warning variant label** (resolve.ts:189): `warningVariant(scale,…)` → `'lemon'|'macaroni'|null` via light collision + `YELLOW_SPLIT_H=96`; if set, drop `'warning'` from pending (resolve.ts:190).
7. **Signal-shift override loop** (resolve.ts:194–201) over `['warning','success','info']` (never error): `pickSignalShift` runs the SAME light `checkCollision` then a per-signal `splitH` to choose a swap/shift/none override scale; appends to `signalOverrides`, drops from pending. OUTPUT-ONLY — never re-enters the engine.
8. **FINAL render step** (resolve.ts:210–212): if `!exact && !archetypeOverride && !rung1 && inRedBand(scale.brandH)`, mutate light stops 9/10 in place via `applyRedCoolRender` (cool rotation + re-enforce fill WCAG on the cooled color). This is the only post-return-shape in-place mutation and is unconditionally last.
9. Return `ResolvedBrand` with `shearDeg` hardcoded 0 (preventive shear deleted 2026-06-11) (resolve.ts:214).

**Governing invariant** (documented resolve.ts:15–20, colorEngine.ts:394–400): every GATE/decision (collision, `inRedBand` watershed, archetype/rung-1 selection, on-fill polarity) reads the RAW brand hue. Cool rotation and light-ramp spine drift are render-time presentation and never feed a decision — which is precisely why step 8 (cool render) is last.

### A.2 `generateScale` — per-scale internal order (src/engine/colorEngine.ts:351–662)
1. Parse hex → OKLCH (colorEngine.ts:198–214, 357); `brandH=rawH+hueShiftDeg` (358), `brandC=rawC*chromaScale` (359), `subtleC=brandC*subtleChromaScale` for stops 1–8 (361).
2. `archetype = forcedArchetype ?? classifyArchetype(brandL)`; `scaleL = archetype median if forced else brandL` (colorEngine.ts:362–363).
3. Compute `darkFloorStrength`, `lFlip`, `lFillMax`.
4. Compute `fillAnchorL` (enforceWhiteFill pre-darken, colorEngine.ts:385–388) and on-fill polarity by APCA on the (possibly pre-darkened) fill (391–392) — all read from RAW hue.
5. Compute all light-model weights from RAW brand OKLCH (colorEngine.ts:412–454): hueIsNoise gate, vividness, red watershed S, wRed, mutedness, creamGate, cream blend u, gWarm, wDrift, driftCapDeg, yellowLift, yellow chromaBoost.
6. Build `lightHueAt` and `darkH` (cooled hue when coolRedDark + red-band, 478–481).
7. Light stops 1–8 (colorEngine.ts:489–498): drift + red cool baked into `lightHueAt`.
8. Measure `stop2Y` (500).
9. Light fill 9 with optional polarity flip / WCAG darken (511–525), then stop 10 = `hoverL`.
10. Light text stops 11/12, contrast-bounded vs stop2Y, iterated 2–3× (533–545).
11. Dark stops 1–8 by luminance equalization (findLForY vs darkRefY) (561–568).
12. Dark fill 9/10, dark 11/12 (554–577).
13. Dark on-fill polarity, black-first (581–582); dark fill WCAG enforce (587–594).
14. Append highlight rungs 13/14 if `highlight` (606–654).

## (B) BASE 12-STOP RAMP STRUCTURE (src/engine/colorEngine.ts + stopTable.ts)

Two distinct chroma/lightness models coexist between light and dark:

- **Light stops 1–8**: lightness = direct `rootL` ladder from LIGHT_STOPS (0.993→0.738, stopTable.ts:18–27) plus `yellowLift*(i/7)`; NO Y-equalization (colorEngine.ts:490). Chroma = blend of a vivid ladder (`vSubtle*chromaBoost*LIGHT_BASE_C`) and a cream gamut-envelope (`brandSat*satFraction*maxChromaAt`), blended by muted-warm weight `u` (colorEngine.ts:495–497, stopTable.ts:33).
- **Dark stops 1–8**: lightness = WCAG-Y luminance equalization against blue `REFERENCE_H` via `findLForY` on per-stop `darkRefY` (colorEngine.ts:484–486, 564); raised roots + boosted chroma multipliers vs light symmetry because OKLab under-weights low-L steps (stopTable.ts:52–66). Per stop, chroma passes through `applyChromaFloor` (the dark chroma floor); hue passes through `torsionedHue` (hard warm-band rotation).
- **Hue path**: a gold-spine piecewise-linear table (cream@high-L → orange-brown@low-L; colorEngine.ts:41–52, stopTable.ts:146–148) drives warm-hue rotation as L drops. Light ramp uses RELATIVE drift — capped (0.55) partial travel along the spine SHAPE relative to the `scaleL` pin, weighted by `wDrift` and an off-path gaussian (colorEngine.ts:468–473). Dark + illustration ramps use `torsionedHue` with a hard `WARM_TORSION` band [40,122] (colorEngine.ts:90–100).
- **Fill (stop 9/10)**: light fill at `fillAnchorL` (= `scaleL`); stop 10 = `hoverL(light9L)`. Dark fill `dark9L = max(scaleL, darkFillMinL)` — a lift floor that only raises fills that would vanish, never pulls down (colorEngine.ts:554, stopTable.ts:112–116).
- **Text (stop 11/12)**: anchored at dark roots (0.53/0.30) + yellowLift, then bounded by `findMaxLForContrast` vs `stop2Y` (4.5 / 7.0 ratios), iterated 2–3× because hue/chroma/contrast are interdependent (colorEngine.ts:533–545).
- **Cross-cutting gates**: `hueIsNoise` (brand C<0.008) forces a gray ladder with all hue-derived weights neutralized (colorEngine.ts:412). `makeStop` gamut-clamps every stop's chroma to the sRGB envelope (colorEngine.ts:285–289). `hoverL` twin: ΔL=0.03/(L+0.1), direction flips at L=0.40 (archetypes.ts:21–24).

## (C) PER-PALETTE DEVIATIONS FROM BASE

### C.1 Brand PRIMARY
- **Archetype anchoring**: normally `scaleL = brandL`; when an archetype is forced (rung-1 / override) the brand's own L is DISCARDED for the archetype's median (colorEngine.ts:362–363, archetypes.ts:3–18).
- **Red-band machinery** (`inRedBand` = (12, 35.5] on RAW hue): drives rung-1 eligibility, dark collider, and cool-render gate. `redCoolWeight` = product of two sigmoids at the band edges (colorEngine.ts:178–183).
- **Rung-1 (light)**: a red-band error collider regenerates the whole scale forced to the `'dark'` archetype with deepened 11/12 text (opt3: −0.07/−0.05) so accent/body text stands off error-11 (resolve.ts:148–150, colorEngine.ts:541). Out-of-band (pink/orange) colliders keep identity and set `errorComponentRule` instead of moving the value (resolve.ts:151–153).
- **Dark collider 'muted'**: a red-band error collider in dark mode floats the dark fill to a fixed pastel-rose register (L 0.80, chroma×0.55, black on-fill) because dark-mode pins stop-9 L for everyone so rung-1 can't separate fills there (resolve.ts:162–178, colorEngine.ts:556–559).
- **coolRedDark**: red-band brands regenerate the ENTIRE dark ramp from a cooled `darkH` so dark mode keeps the same cool-red character as the light 9/10 rotation (colorEngine.ts:478–481).
- **applyRedCoolRender (final)**: light stops 9/10 rotate −RED_COOL_DEG(10.8)×wRed cool for warm reds, as the unconditional last step, exempting exact/override/rung1 (resolve.ts:210–212, colorEngine.ts:674–692).
- **Highlight fill (stops 13/14)**: brand & secondary append a highlight-9/10 fill, white-enforced via a 4-pass iterative L-darkening loop except in the yellow band (colorEngine.ts:606–654).
- **Brand dark-fill floor is 0.70** (vs signals' 0.63), DARK_BRAND_FILL_MIN_L (resolve.ts:120, stopTable.ts:112–116).
- **Style 'deeper' lever**: lifts effective mutedness toward 1 inside a hue×u band gate; no-op when unset (colorEngine.ts:423–437).

### C.2 Brand SECONDARY
Generated through the identical `generateScale` path with the same `floor` opts (CTA-bearing kind, carries highlight 13/14). In the emission layer, when no secondary is supplied, `mirrorBody` aliases secondary to brand var-for-var (cssRender.ts:92–101). No distinct color math from primary — the only differentiation is the supplied hex.

### C.3 NEUTRAL — two SEPARATE paths that do not share stop values
- **ASSIGNED (Radix) path**: `RADIX_NEUTRALS` ships 6 hand-tuned families (gray/mauve/slate/sage/olive/sand) as literal 12-hex light+dark arrays copied verbatim from Radix (radixNeutrals.ts:9–34); header comment says neutrals are "too sensitive to tune ourselves" (radixNeutrals.ts:1–5). `closestNeutralFamily(brandH,brandC)` assigns by hue-band lookup following Radix's published brand→neutral pairing guide; C<0.03 hard-snaps to `'gray'` (radixNeutrals.ts:44–52). Used by plugin/ui.ts (auto mode generates the brand scale twice for H and C, then picks the family) and demo only.
- **GENERATED (engine) path**: `generateNeutralScale` (colorEngine.ts:726) builds a pure-gray ladder unless a tint {H,C} is passed (no caller passes tint — the `NEUTRAL_TINT_CURVE` machinery is wired but unexercised). Light stop 9 fill L is HARDCODED 0.57 (colorEngine.ts:740) rather than contrast-solved. Stop 11 contrast-bound vs stop2; 12 = fixed root. cta/cta-hover (stops 15/16) are a SEPARATE near-black/near-white gray (light L = near-black median 0.125, dark L = light median 0.925) bypassing the tint curve, because "gray-9 highlight isn't dark enough for a primary action" (colorEngine.ts:754–766). on-highlight polarity is COMPUTED by WCAG on the mid-gray stop-9 fill, not hardcoded white, because hardcoded white fails WCAG on mid-gray (colorEngine.ts:770–771).
- **NET sourcing**: in the core engine build (build.ts:42) neutral is fully generated pure gray. In the plugin/figma path, stops 1–12 come from the Radix family while cta + on-* roles come from `generateNeutralScale` independent of which family the neutral carries (figmaRender.ts:109–125).

### C.4 SIGNALS — error / warning / success / info
All four are canonical hex + OKLCH + per-signal knobs (signals.ts:42–60) run through the SAME `generateScale` as brands, built once at module load (resolve.ts:37–45). Shared per-signal deviations from a brand:
- `subtleChromaBoost` runs the subtle tier (stops 1–8) hotter than brands: error 1.2, warning 1.45, success 1.3, info 1.0 (signals.ts:44–59).
- `darkFillMinL` ladder, deliberately spread so dark fills don't land within 0.02 L of each other: success 0.75, info 0.70, error/warning default 0.63 (signals.ts:36–39).
- `enforceOnFillContrast=true` for ALL signals (light + dark fill compliance ladder, colorEngine.ts:511–523, 587–594).

Per-signal specifics:
- **ERROR**: the collision REFERENCE for brands. Deliberately ABSENT from SHIFT_RULES and forced cap 0 — error never yields; it stays with rung-1 / component handling (signalShift.ts:38–39, collision.ts:132). default darkFillMinL 0.63.
- **WARNING**: split at `YELLOW_SPLIT_H=96`. Below split → yields cool to `lemon` (canonical hex hue-shifted by `hueShift.cool=23`, `yieldChromaScale=1.15`, forced `'light'` archetype, signalShift.ts:84–92). At/above → keep canonical `macaroni`. `yieldChromaScale 1.15` boosts the whole ramp because the cool shift to lemon washes out (signals.ts:31–33). highest subtleChromaBoost (1.45). default darkFillMinL 0.63.
- **SUCCESS**: `enforceWhiteFill` set ONLY here (resolve.ts:43) — pre-darkens the light fill anchor to the WCAG-4.5 white edge so on-fill polarity reads white "for consistency with the other non-yellow signal fills" (colorEngine.ts:385–388). Highest darkFillMinL (0.75). Shift swaps to a fixed base hex per side of split 147: below → `#18AA6C` teal-side; above → `#5DA447` yellow-side (signalShift.ts:50–54).
- **INFO**: darkFillMinL 0.70, subtleChromaBoost 1.0. Shift swaps per side of split 273: below → `#AB4ABA` magenta; above → `#0090FF` blue (signalShift.ts:57–61).

**Signal-shift overrides are OUTPUT-ONLY** (signalShift.ts:1–16, resolve.ts:192–201): pushed to `signalOverrides`, consumed by CSS/Figma emit, never re-entering any engine decision. Swap regeneration (`swapScale`, signalShift.ts:72–79) reuses the signal-init opts but does NOT thread `enforceWhiteFill`, so a swapped success loses success's white-fill darkening.

## Bolt-on list (33)

- **[clear-bolt-on]** _(signals / emission)_ swapScale (success/info shift) regenerates via the signal opts but omits enforceWhiteFill, so a swapped success loses success's white-fill darkening and may pick black on-fill where canonical success forces white
  - `@ src/engine/signalShift.ts:72-79`
  - why: The canonical-scale builder special-cases enforceWhiteFill for success (resolve.ts:43, name==='success') but the swap path hardcodes a fixed opts set that does not mirror that condition. Reads as an oversight from the white-fill flag being bolted onto only the canonical builder and not threaded into the swap path — a single shared signal-opts source would have prevented the inconsistency.
- **[clear-bolt-on]** _(emission-token-model)_ radixNeutralCss emits raw --neutral-1..12 numeric names by bare index, bypassing the shared stopTokenName/tokenOrder model every other emitter uses; the identical Radix hexes are renamed paper-1/wash-3/.../ink in the Figma export (figmaRender.ts:78), so CSS and Figma disagree on the names of the same neutral values
  - `@ src/radixNeutrals.ts:55-62`
  - why: radixNeutralCss predates the token rename and was never migrated; the Stage-2 rename touched stopsToVars/figmaRender but this one bespoke CSS path for Radix families (only reachable from the demo's CustomTheme tab) was missed. The branded neutral in the same component DOES use the model (CustomTheme.tsx:163-164), confirming this path is an inconsistency, not a deliberate choice.
- **[clear-bolt-on]** _(neutral)_ onFillTextIsWhite hardcoded true on the colorless neutral return stub (alongside placeholder brandL 0.5 / brandC 0 / archetype 'rich')
  - `@ src/engine/colorEngine.ts:773-784`
  - why: The neutral scale has no real chromatic fill, so the field is meaningless but the GeneratedScale type requires it; set to a constant to satisfy the shape. The actually-used neutral polarity comes from on-highlight/on-cta computed elsewhere, so this value is a vestigial type-conformance placeholder, not a holistic decision.
- **[clear-bolt-on]** _(pipeline-ordering / brand-specifics)_ enforceWhiteFill pre-darkens the fill anchor for success ONLY so on-fill polarity 'naturally' reads white; error/info reach white via the runtime ladder while success is darkened up front — two different mechanisms for the same goal
  - `@ src/engine/colorEngine.ts:385-388, src/engine/resolve.ts:43`
  - why: Gated to exactly one ramp by name==='success'. Comment frames it as 'consistency with the other non-yellow signal fills', but using a per-signal up-front pre-darken (making the runtime ladder a no-op) rather than a hue/L rule that would place all non-yellow fills on the white-text side reads as a single-ramp value override. Plausibly a deliberate brand decision; needs the design spec to confirm vs bug.
- **[clear-bolt-on]** _(base-scale)_ Dark chroma floor hard upper cutoff at DARK_FLOOR_MUTED_MAX_C (0.04) with documented C0.0399-vs-0.0401 'KNOWN CLASS-D CLIFF' (0.0399 vs 0.0401 chroma yields floor-vs-none), kept only for blessed-render byte-compat
  - `@ src/engine/colorEngine.ts:268-273,280-283,371-374, src/engine/stopTable.ts:281-283`
  - why: The code itself flags the discontinuity as a cliff preserved for byte-compat ('do not silently smooth it here'). A holistic floor would be continuous; this is an acknowledged patch kept for back-compat around a brittle boundary, not a clean rule.
- **[unresolved-pending-spec]** _(pipeline-ordering / compliance)_ enforceWhiteFill / enforceOnFillContrast darken stops 9/10 (or flip polarity to black) of an individual scale to clear the L 0.56-0.65 APCA/WCAG dead zone; comment 'Signals enforce this; brands TBD'
  - `@ src/engine/colorEngine.ts:511-525,587-594,683-691`
  - why: Per-value compliance correction ('APCA picks polarity, WCAG bounds the fill'). Applied unevenly (signals + non-exact brands, exact brands skip), suggesting a patch awaiting a holistic compliance spec rather than a settled rule. Cannot tell from code alone whether the dead-zone should have been solved by the fill-L model itself.
- **[unresolved-pending-spec]** _(base-scale / brand-specifics)_ Dark fill brand-vs-signal lift split: dark9L = max(scaleL, DARK_STOP_9_MIN_L) with a higher floor for brands (0.70) vs signals (0.63), chosen off a 'designer grayscale check'
  - `@ src/engine/colorEngine.ts:554, src/engine/stopTable.ts:112-116`
  - why: Two hand-tuned magic Ls pushing black on-fill text into the APCA comfort band for brands while signals keep vivid identity. Could be a deliberate brand/signal register policy or a patch to dodge an ambiguous-fill complaint — cannot tell which without the design spec. Comments frame it as deliberate identity policy.
- **[unresolved-pending-spec]** _(signals)_ darkFillMinL ladder hand-tuned per signal (success 0.75, info 0.70, error/warning 0.63) so the four dark fills stay >0.02 L apart (grayscale collision check)
  - `@ src/engine/signals.ts:36-39`
  - why: Per-value tuning to dodge a mutual-collision problem a holistic dark-signal spacing rule would solve, but the chosen levels also encode genuine per-signal text-polarity intent (black-text success/info vs white-text error), so it may be intended design. Spec needed.
- **[unresolved-pending-spec]** _(brand-specifics)_ Dark collider 'muted' pastel-rose register (L0.80, chroma*0.55, black on-fill) for red-band brands colliding with error in dark mode
  - `@ src/engine/colorEngine.ts:556-559, src/engine/stopTable.ts:120-128`
  - why: Comments record multiple superseded values (sink-to-0.53, 35%-opacity reference) — clearly iterated by eye to make colliding reds separable from error in dark mode where rung-1 can't help (DARK_DELTA_E_THRESHOLD lowered to 0.10 to accommodate). Whether the final 0.80/0.55 is a principled register or just the value that looked right needs the spec.
- **[unresolved-pending-spec]** _(brand-specifics)_ Stop 11/12 rung-1 deepen (0.07/0.05, 'opt3') — two literal L subtractions applied only to rung-1 colliders so their accent/body text stands off error-11
  - `@ src/engine/resolve.ts:133, src/engine/colorEngine.ts:541`
  - why: The 'opt3' label and exact pair of magic numbers suggest a chosen option from a candidate set rather than a derived bound; could be intended policy but reads as a per-case nudge.
- **[unresolved-pending-spec]** _(brand-specifics)_ Yellow chroma-boost vividness fade factor (1-(1-creamGate)*(1-v)) layered onto the yellow boost
  - `@ src/engine/colorEngine.ts:452-454`
  - why: Comment attributes it to a 2026-06-11 eye review ('too hot on low-C yellows'). An extra multiplicative term layered onto the boost to fix one observed artifact while preserving blessed muted browns/reds bit-identical — reads like a targeted correction but may be the intended envelope; needs the spec.
- **[unresolved-pending-spec]** _(brand-specifics)_ creamGate edge (CREAM_UPPER_H 105, σ5) explicitly tuned to sit in the current fleet's H62-141 gap (kill cream blend + mutedness drift above the edge)
  - `@ src/engine/colorEngine.ts:147-148,421-439`
  - why: Comment admits the edge value is chosen because 'the fleet has no muted brand between H62 and H141' — calibrated to the present brand set so existing renders stay bit-identical, not to a hue-perception principle. A new brand landing in that gap would expose it.
- **[unresolved-pending-spec]** _(signals)_ forcedArchetype 'light' hardcoded in lemonScale, flagged load-bearing / byte-identical-to-old generateLemonWarning
  - `@ src/engine/signalShift.ts:84-86`
  - why: Comment explicitly preserves byte-identity with the former generateLemonWarning and calls the 'light' archetype load-bearing. Pinning one yield to a forced archetype rather than letting classification run is a per-case override; intended lemon design vs frozen legacy quirk can't be determined without the signal-shift spec.
- **[unresolved-pending-spec]** _(neutral)_ cta/cta-hover is a bespoke extra near-black/near-white gray rung (stops 15/16) appended outside the 12-stop tint curve because 'the gray-9 highlight isn't dark enough for a primary action'
  - `@ src/engine/colorEngine.ts:754-766`
  - why: The principled neutral ladder's emphasis fill (stop 9 @ L0.57) doesn't reach the contrast a primary button needs, so the engine bolts on a separate fixed value via archetype medians rather than reshaping the ladder. Whether a dedicated cta token is the intended system design (a real role) or a patch around a too-light ladder can't be told without the token/role spec.
- **[unresolved-pending-spec]** _(neutral)_ Light stop-9 neutral fill L hardcoded to 0.57 rather than contrast/luminance-solved like the chromatic brand fill anchoring
  - `@ src/engine/colorEngine.ts:740`
  - why: A fixed neutral mid-gray fill may be intentional (neutrals have no hue to luminance-calibrate) or a magic constant that should track the same contrast/lFill machinery the chromatic ramps use. Cannot tell which without the neutral-fill spec.
- **[unresolved-pending-spec]** _(emission-token-model)_ CSS on-highlight falls back to white via `onHl ?? true` when a brand/secondary ramp carries no computed on-highlight polarity
  - `@ src/engine/cssRender.ts:87`
  - why: brand/secondary ramps emitted via brandKindBody may not set onHighlightIsWhite; rather than omit the token or compute polarity, the emitter defaults to white. Likely a stopgap so the var always exists; the principled value would be computed from the highlight fill the way build.ts/figmaRender do.
- **[clear-rule]** _(base-scale / compliance)_ Light/dark fill darkening fallback: when APCA picks white but white fails WCAG 4.5 and black can't pass both, darken the individual stop-9/10 fill L to the 4.6 edge via findLForContrast
  - `@ src/engine/colorEngine.ts:511-525,587-594`
  - why: The L 0.56-0.65 dead zone where WCAG and APCA disagree. Comments (502-510, opt doc 319-324) frame it as stated doctrine ('APCA picks the polarity, WCAG bounds the fill') applied uniformly to all signals/non-exact brands — clear rule, but it IS a post-hoc per-value darkening rather than a holistic fill-L solve.
- **[clear-rule]** _(pipeline-ordering / brand-specifics)_ applyRedCoolRender mutates only stops 9/10 of an already-computed brand scale to rotate warm reds away from error's vermillion, gated by an ad-hoc exemption set (!exact && !archetypeOverride && !rung1 && inRedBand) and re-running WCAG enforcement on the mutated color
  - `@ src/engine/resolve.ts:210-212, src/engine/colorEngine.ts:674-692`
  - why: Replacement for the deleted preventive hue shear (2026-06-11). It bends two stops of one scale to manufacture brand↔error separation post-hoc rather than the collision system resolving it holistically. The author walls it off as 'last step, never a gate', but it is still a per-value correction layered on the principled pipeline, and the exemption list is the tell.
- **[clear-rule]** _(pipeline-ordering / brand-specifics)_ Rung-1 regenerates the whole brand scale forced to the 'dark' archetype with deepened 11/12 text purely because the brand's stop-9 fill collided with error in light mode (red-band only)
  - `@ src/engine/resolve.ts:148-150`
  - why: Moves the brand value to dodge a single collision threshold rather than resolving the brand/signal pair holistically (e.g. shifting the signal). The deepen11/12 'opt3' is a second corrective stacked on top. Looks like an intended designer-sanctioned escalation-ladder rung, but it is value-bending to clear a gate; red-only scope is a designer-directed special case baked into a gate.
- **[clear-rule]** _(pipeline-ordering / brand-specifics)_ darkH cooled-hue substitution regenerates the entire dark ramp from a rotated hue for red-band brands (coolRedDark)
  - `@ src/engine/colorEngine.ts:478-481,334-339`
  - why: Parallel render-time patch to applyRedCoolRender so dark mode keeps the same cool-red character the light 9/10 rotation produces. Bends the dark presentation of individual red brands; framed as render-time only but it is a corrective consistency hack rather than a holistic hue policy.
- **[clear-rule]** _(base-scale / brand-specifics)_ Dark fill lift floor dark9L = max(scaleL, DARK_STOP_9_MIN_L) — only LIFTS fills that would vanish on dark bg, never pulls down
  - `@ src/engine/colorEngine.ts:554, src/engine/stopTable.ts:112-116`
  - why: Comments frame it as deliberate systemic identity rule ('Fills keep their identity across modes'). Reads as intended policy, but it IS a per-value clamp (max) layered on the computed fill L.
- **[clear-rule]** _(base-scale / brand-specifics)_ yellowLift / yellow chromaBoost — gaussian bumps to L and C centered on the yellow hue band (yellow's wide gamut / natural brightness compensation)
  - `@ src/engine/colorEngine.ts:441-443,452-454, src/engine/stopTable.ts:38`
  - why: Compensates systemically via smooth gaussians keyed purely on hue position (not brand identity), woven into the generation loop rather than applied post-hoc. Looks like an intended perceptual rule, not a bolt-on — flagged only because it is a hue-targeted special-case adjustment a fully holistic gamut-aware model might subsume.
- **[clear-rule]** _(base-scale)_ Light stops 11/12 anchored at fixed dark roots then iteratively contrast-bounded vs stop2 (min of root-anchor and findMaxLForContrast, re-run 2-3x, plus optional deepen subtraction re-bounded)
  - `@ src/engine/colorEngine.ts:533-545`
  - why: stopTable.ts:86-92 documents the history: 11 used to anchor at exactly 4.5:1 (always the lightest legal color, 'looked really light'), then changed to a fixed dark root with contrast only as a BOUND. The iterate-to-convergence loop exists because hue/chroma/contrast are interdependent — a principled fixed-point solve, not a value patch. Reads as intended, but the manual unrolled 2-3x iteration (rather than a converged solver) is a code smell worth noting.
- **[clear-rule]** _(brand-specifics / compliance)_ Highlight-9/10 white-compliance via bounded 4-pass iterative L-darkening loop (target 4.6) with yellow-band exemption
  - `@ src/engine/colorEngine.ts:622-654,629-635`
  - why: Same white-text-floor intent as the fill enforcement, applied as a convergence loop because chroma depends on L. Systemic across all brand highlights and mirrored light/dark, so likely intended; but it bends each rung's L post-hoc to a contrast target rather than deriving the highlight L from a contrast-aware model, and the yellow-band carve-out and 4-pass cap are heuristic.
- **[clear-rule]** _(compliance)_ Magic 4.6 contrast target everywhere a fill is darkened (search to 4.6, accept >=4.5) — a hex-rounding guard band repeated in 4+ places
  - `@ src/engine/colorEngine.ts:387,520,590,631,687`
  - why: Repeated comment 'search to 4.6 — hex rounding must never land below 4.5' shows this is a deliberate, consistently-applied rounding guard band, not a stray constant. Systemic, but a buffer-hack worth noting.
- **[clear-rule]** _(compliance)_ applyRedCoolRender re-runs the fill-darkening correction a SECOND time after hue cooling (legality judged on the final cooled color)
  - `@ src/engine/colorEngine.ts:683-691`
  - why: Because cooling the hue can re-break the WCAG bound, the same individual-fill darkener runs again as a documented final step. Intended ordering, but it means the compliance correction is applied twice to the same fill across two stages rather than solved once — duplicated post-hoc bend.
- **[clear-rule]** _(base-scale / brand-specifics)_ Dark chroma floor: Math.max(raw, perStopFloor) lifts an individual stop's computed chroma to a per-stop minimum (0.02->0.04 across stops 0-7), with a fade-to-zero ramp below DARK_FLOOR_FULL_C
  - `@ src/engine/colorEngine.ts:268-273,371-374,563`
  - why: Muted-but-chromatic brands desaturate into gray on dark backgrounds because dark Y-equalization + chroma multipliers don't preserve enough chroma at low L. The smooth strength fade is principled; flagged together with its hard upper cutoff (separate clear-bolt-on entry) which is the acknowledged byte-compat patch.
- **[clear-rule]** _(signals)_ warning yieldChromaScale 1.15 — whole-ramp chroma boost applied only to the lemon-yielded warning to restore saturation lost in the cool hue-shift
  - `@ src/engine/signals.ts:31-33,54, src/engine/signalShift.ts:88`
  - why: Compensates a side-effect of warning's own yield rather than another signal's requirement, parameterized per-signal as part of the documented yield pipeline — reads as an intended rule, not a stray patch.
- **[clear-rule]** _(neutral)_ on-highlight polarity switched from hardcoded white on-fill to a computed WCAG winner because white actually fails WCAG on the colorless mid-gray fill
  - `@ src/engine/colorEngine.ts:770-771,782-783`
  - why: On a colorless mid-gray neutral, hardcoded white breaks contrast, so polarity is derived from the fill. A systemic, self-correcting rule applied uniformly light+dark and mirrored in build.ts/figmaRender, not a one-off bend.
- **[clear-rule]** _(neutral)_ Near-neutral brands (C<0.03) hard-snapped to 'gray' family in closestNeutralFamily
  - `@ src/radixNeutrals.ts:44-45`
  - why: Threshold guard so a near-gray brand with noisy/undefined hue doesn't get an arbitrary tinted family. Mirrors the engine's HUE_NOISE_C doctrine; an intended systemic guard, not a per-value patch.
- **[clear-rule]** _(emission-token-model)_ on-cta/on-highlight leaves rewritten in the plugin to alias system black/white invariants rather than carrying their emitted value
  - `@ plugin/code.ts:131-162`
  - why: Intentional, systemic: comment states the goal is exactly one black and one white source of truth in the Figma file, applied uniformly to all on-fill leaves — a rule, not a per-value patch.
- **[clear-rule]** _(emission-token-model)_ The same emitted strings cta-1/cta-2/highlight-1/highlight-2 denote different source stops depending on kind (brand stop 9/10 vs neutral ext stop 15/16, and vice versa)
  - `@ src/engine/tokenNames.ts:42-56`
  - why: Designed name overloading so brand and neutral ramps present a uniform white-label token surface; documented as the intended white-label remap shape (tokenNames.ts:1-20, verified). Not a per-value patch, but a subtle correctness hazard if any consumer assumes name<->stop is 1:1.
- **[clear-rule]** _(brand-specifics)_ Rung-1 red-only scope: red-band error colliders re-anchor to 'dark' archetype; orange/pink colliders keep identity and fall to the uniform destructive component rule
  - `@ src/engine/resolve.ts:142-156, src/engine/collision.ts:38`
  - why: Principled resolution rung, but the red-only scope is a designer-directed special case baked into a gate (inRedBand watershed). Documented intent, listed separately from the rung-1 value-bend because the in/out-of-band split is itself the rule.

## Open questions (spec must resolve)

Cross-area inconsistencies and decisions the trusted spec MUST resolve:

1. enforceWhiteFill NOT propagated to the signal-shift path. The canonical builder sets enforceWhiteFill only for success (resolve.ts:43), but swapScale (signalShift.ts:72-79) hardcodes a fixed opts set that omits it. A swapped teal-side or yellow-side success can therefore pick BLACK on-fill where canonical success forces white. Spec must decide whether white-on-success is a guaranteed invariant (then thread the flag / share one signal-opts source) or accept side-dependent polarity. This is the single clearest likely-bug.

2. Two different mechanisms for the same white-on-fill goal. Success is pre-darkened UP FRONT (colorEngine.ts:385-388) so the runtime ladder is a no-op, while error/info reach white via the runtime compliance ladder (colorEngine.ts:512-523). Spec must decide on ONE mechanism (a hue/L rule placing all non-yellow fills on the white-text side) or formally bless the per-signal flag.

3. Highlight anchor-math vs text-stop bound-math vs fill ladder-math are three different white-compliance strategies for adjacent stops on the SAME ramp: highlight 13/14 uses a 4-pass iterative darkening loop (colorEngine.ts:629-635); text 11/12 uses an iterated max-L contrast BOUND (colorEngine.ts:533-545); fills 9/10 use a flip-then-darken ladder (colorEngine.ts:511-523). Spec should state whether these should converge on one contrast-aware derivation.

4. Named-neutral CSS/Figma divergence. radixNeutralCss emits --neutral-1..12 numeric (radixNeutrals.ts:55-62) while the Figma export renames the identical Radix hexes to paper-1/wash-3/.../ink (figmaRender.ts:78). CSS and Figma disagree on names for the same neutral values. Spec must pick one naming and migrate the Radix CSS path through stopTokenName/tokenOrder.

5. Light ramp vs dark ramp use two different lightness/chroma models (light: direct rootL + cream blend, no Y-equalization; dark: WCAG-Y luminance equalization against blue REFERENCE_H). Spec should state whether this asymmetry is intended permanently or a migration artifact, since it forces every per-stop correction (chroma floor, fill floor) to be duplicated per mode.

6. Brand vs signal dark-fill floors (0.70 vs 0.63) and the per-signal darkFillMinL ladder (0.75/0.70/0.63) are hand-tuned magic Ls chosen off grayscale checks. Spec must decide whether dark-mode salience separation is a holistic spacing rule or stays as per-token constants — and reconcile that these floors also encode per-signal text-polarity intent (black-text success/info vs white-text error).

7. inRedBand watershed (12, 35.5] gates four separate corrections (rung-1 eligibility, dark collider, light cool-render, dark coolRedDark). Spec must confirm the band edges are a single shared constant and decide whether out-of-band (pink/orange) error colliders relying on the 'uniform destructive component rule' is sufficient, since that rule is asserted in comments but its enforcement is outside the color engine.

8. The tint-curve / generated-neutral machinery (NEUTRAL_TINT_CURVE, tint param, generateNeutralScale tinting) is fully wired but NO caller exercises it — all callers pass no tint (pure gray). Spec must decide whether tinted neutrals are a real future feature or dead code to remove. Related: the core engine build (build.ts) generates pure-gray neutral while the plugin path assigns Radix families — two different neutral sources for the same system.

9. Neutral fill L is a hardcoded 0.57 (colorEngine.ts:740) while chromatic fills are contrast/luminance-solved. Spec must say whether neutral fills should track the same fill-L machinery.

10. The dark chroma floor's documented C0.0399-vs-0.0401 'KNOWN CLASS-D CLIFF' and the creamGate edge (CREAM_UPPER_H 105) tuned to the current fleet's H62-141 gap are both calibrated for blessed-render byte-compatibility, not perception. Spec must decide whether byte-compat with existing renders is a hard constraint (these stay frozen) or whether the engine may be allowed to smooth them — a new brand landing in either boundary would expose them.

11. Dead code: signalYieldShift / SIGNAL_SHIFT_CAPS / YIELD_DIRECTION (collision.ts:131-193) computes gate-clearing hue shifts but is called nowhere in src — superseded by the swap/shift override path. warningVariant (collision.ts:206-213) now returns only a back-compat label. Spec should confirm removal.

12. Manual unrolled iteration vs converged solver: text stops 11/12 (2-3x) and highlight rungs (4-pass) both manually unroll a fixed number of refinement passes rather than iterating to convergence. Spec should state acceptable tolerance / whether a real fixed-point solve is wanted.

13. CSS on-highlight `?? true` fallback (cssRender.ts:87) defaults to white when a brand/secondary ramp carries no computed on-highlight polarity, whereas build.ts/figmaRender compute it from the highlight fill. Spec must decide the single source of on-highlight polarity so all three emitters agree.

