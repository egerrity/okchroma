# Stage 3 — Doc triage

_Blind doc-read (17 agents) + triage vs code-truth. Verdicts: keep/edit/rewrite/delete._

## Summary

Doc-set health: structurally strong, terminologically stale. All 16 guide files share a clean Concept/Why/How/Engineering skeleton and the deep color-math docs (oklch, chroma-envelope, stop-ladder, warm-hues, relative-spine, neutrals, illustrations, lineage) reconcile cleanly against the code-truth — those are high-value keeps with only light verification edits. The single systemic staleness is the post-Stage-2 token model: emphasis fills (cta, highlight) were pulled OUT of the 1-12 linear scale and are now ROLES, not stops. The code-truth + tokenNames.ts confirm the current shape: stops 1-8 = surface scale (paper/wash/accent), 11/12 = ink-alt/ink text roles, and stops 9/10 emit as cta-1/cta-2 on brand+secondary or highlight-1/highlight-2 on neutral+signals, PLUS additive role stops (brand/secondary highlight-13/14; neutral cta-15/16). Any doc still calling 9/10 in-scale "solid fill / hover" steps or emitting --brand-9 is stale (for-designers, the-12-stop-ramp, README). Second real defect cluster is in collisions.md: signal-side resolution is documented via signalYieldShift()/SIGNAL_SHIFT_CAPS and a "rungs 2-3 offered, not automatic" ladder, but the code-truth shows that path is DEAD CODE — the live mechanism is pickSignalShift -> swap-to-fixed-hex per side of a split hue (signalShift.ts), output-only. README also still describes a preventive "shear cool" that was DELETED (shearDeg hardcoded 0); the real mechanism is render-time applyRedCoolRender on stops 9/10. Highest-value salvage: collisions.md and the-12-stop-ramp.md (good bones, real wrong claims). Cleanest keeps: oklch, chroma-envelope, stop-ladder, warm-hues, relative-spine, lineage, illustrations, neutrals, escape-hatches, style-lever, dark-mode, compliance, accent-warning. Biggest rewrite candidate: README inline lineage section (typo-laden + factually wrong pipeline). Note: "Med-alert" in accent-warning.md is NOT stale — it is the demo's intentional user-facing label for the warning signal (demo/CustomTheme.tsx), so the toast text is correct. No file warrants deletion; nothing describes a fully removed concept beyond the dead signalYieldShift path. Neutral tinting (neutrals.md / README #14) describes wired-but-unexercised machinery (code-truth #8) — keep but flag as not-currently-exercised.

## Verdicts

### [EDIT] the-12-stop-ramp.md (high)
Core ramp math (OKLCH, fixed lightness ladder, step-9 brand anchor, brandSat*satFraction*maxChromaAt chroma, gamut clamp) is accurate and verified against code-truth section B. Needs the cta/highlight role correction and a note on the additive role stops.

Stale/wrong:
- Describes step 9 'solid brand fill' and steps 9/10 as in-scale steps — per the Stage-2 token model (tokenNames.ts) stops 9/10 are emphasis fill ROLES pulled out of the scale, emitted as cta-1/cta-2 (brand) / highlight-1/highlight-2 (neutral/signal), not numbered scale steps.

### [EDIT] the-12-stop-ramp.md (high)
Core ramp math (OKLCH, fixed lightness ladder, step-9 brand anchor, brandSat*satFraction*maxChromaAt chroma, gamut clamp) is accurate and verified against code-truth section B. Needs the cta/highlight role correction and a note on the additive role stops.

Stale/wrong:
- Omits the additive role stops entirely: brand/secondary carry a highlight fill (engine stops 13/14) and neutral carries a cta button (stops 15/16) above the 1-12 scale.

### [EDIT] the-12-stop-ramp.md (high)
Core ramp math (OKLCH, fixed lightness ladder, step-9 brand anchor, brandSat*satFraction*maxChromaAt chroma, gamut clamp) is accurate and verified against code-truth section B. Needs the cta/highlight role correction and a note on the additive role stops.

Stale/wrong:
- 'Recommended mode can move step 9 via gamut limits, collision rule, or warm-red cool-shift' — accurate in spirit but the warm-red cool-shift is applyRedCoolRender mutating stops 9/10 in place as the unconditional LAST step, exempting exact/override/rung1; worth stating precisely.

### [EDIT] the-12-stop-ramp.md (high)
Core ramp math (OKLCH, fixed lightness ladder, step-9 brand anchor, brandSat*satFraction*maxChromaAt chroma, gamut clamp) is accurate and verified against code-truth section B. Needs the cta/highlight role correction and a note on the additive role stops.

Stale/wrong:
- satFraction(step) is referenced in the formula but not attributed; it lives in stopTable.ts LIGHT_STOPS — minor.

### [EDIT] for-designers.md (high)
Excellent designer-facing skeleton, mostly accurate, but the step-role table and token-export guidance predate the Stage-2 role rename and are now the most consumer-visible staleness in the set.

Stale/wrong:
- Step-role table lists step 9 as 'solid fill / main vehicle for brand identity' and step 10 as 'hover for solid fill' as in-scale steps — they are now the cta/highlight emphasis-fill ROLES pulled out of the 1-8 surface scale (tokenNames.ts).

### [EDIT] for-designers.md (high)
Excellent designer-facing skeleton, mostly accurate, but the step-role table and token-export guidance predate the Stage-2 role rename and are now the most consumer-visible staleness in the set.

Stale/wrong:
- Primitive export example uses --brand-9 / --accent-9 — emitted names are now cta-1/cta-2 (brand+secondary) and highlight-1/highlight-2 (neutral+signals); --brand-9 no longer matches the emitter.

### [EDIT] for-designers.md (high)
Excellent designer-facing skeleton, mostly accurate, but the step-role table and token-export guidance predate the Stage-2 role rename and are now the most consumer-visible staleness in the set.

Stale/wrong:
- 'Build the on-emphasis text per brand … on-fill text color' — the on-fill token is now split per kind: on-cta (brand/secondary) vs on-highlight (neutral/signal).

### [EDIT] for-designers.md (high)
Excellent designer-facing skeleton, mostly accurate, but the step-role table and token-export guidance predate the Stage-2 role rename and are now the most consumer-visible staleness in the set.

Stale/wrong:
- Does not mention that brand/secondary also carry a separate highlight fill and neutral carries a separate cta button (the additive 13/14 and 15/16 role stops).

### [EDIT] for-designers.md (high)
Excellent designer-facing skeleton, mostly accurate, but the step-role table and token-export guidance predate the Stage-2 role rename and are now the most consumer-visible staleness in the set.

Stale/wrong:
- Mixes --brand-9 with an undefined --brand-bg-emphasis semantic name in the export section (minor internal naming drift, flagged by blind reader).

### [EDIT] collisions.md (high)
Detection half is accurate and verified (HUE_GATE_DEG=30, DELTA_E_THRESHOLD=0.16, DARK_DELTA_E_THRESHOLD=0.10, RUNG1_ARCHETYPE='dark', YELLOW_SPLIT_H=96, stopDeltaE, signal hexes). Resolution half describes a dead code path and a ladder framing the code no longer implements.

Stale/wrong:
- Signal-side resolution attributed to signalYieldShift() ('smallest whole-degree shift clearing gate, capped') and SIGNAL_SHIFT_CAPS — code-truth #11: signalYieldShift/SIGNAL_SHIFT_CAPS/YIELD_DIRECTION are computed nowhere in src; superseded. Live path is pickSignalShift -> swapScale, swapping to a fixed base hex per side of a split hue (success split 147 -> #18AA6C/#5DA447; info split 273 -> #AB4ABA/#0090FF). It is OUTPUT-ONLY (signalOverrides), never re-entering the engine.

### [EDIT] collisions.md (high)
Detection half is accurate and verified (HUE_GATE_DEG=30, DELTA_E_THRESHOLD=0.16, DARK_DELTA_E_THRESHOLD=0.10, RUNG1_ARCHETYPE='dark', YELLOW_SPLIT_H=96, stopDeltaE, signal hexes). Resolution half describes a dead code path and a ladder framing the code no longer implements.

Stale/wrong:
- 'Rungs 2-3 (offered, not automatic): brand-shifts-cool / signal-shifts-warm, then Exact mode' — code-truth shows resolution is the automatic rung-1 re-anchor (red-band only) + automatic signal-shift overrides; there is no offered brand-shifts-cool/signal-shifts-warm choice ladder in the code.

### [EDIT] collisions.md (high)
Detection half is accurate and verified (HUE_GATE_DEG=30, DELTA_E_THRESHOLD=0.16, DARK_DELTA_E_THRESHOLD=0.10, RUNG1_ARCHETYPE='dark', YELLOW_SPLIT_H=96, stopDeltaE, signal hexes). Resolution half describes a dead code path and a ladder framing the code no longer implements.

Stale/wrong:
- warningVariant is described as the live binary chooser; in code it now returns only a back-compat label (collision.ts ~206-213) — warning yield is actually driven through pickSignalShift's 'shift' side.

### [EDIT] collisions.md (high)
Detection half is accurate and verified (HUE_GATE_DEG=30, DELTA_E_THRESHOLD=0.16, DARK_DELTA_E_THRESHOLD=0.10, RUNG1_ARCHETYPE='dark', YELLOW_SPLIT_H=96, stopDeltaE, signal hexes). Resolution half describes a dead code path and a ladder framing the code no longer implements.

Stale/wrong:
- Rung-1 'darkened, hue kept' is right but should add it regenerates the WHOLE scale forced to the dark archetype with deepened 11/12 ('opt3' -0.07/-0.05), and is gated by inRedBand (12,35.5]; out-of-band pink/orange colliders instead set errorComponentRule (no value move).

### [EDIT] collisions.md (high)
Detection half is accurate and verified (HUE_GATE_DEG=30, DELTA_E_THRESHOLD=0.16, DARK_DELTA_E_THRESHOLD=0.10, RUNG1_ARCHETYPE='dark', YELLOW_SPLIT_H=96, stopDeltaE, signal hexes). Resolution half describes a dead code path and a ladder framing the code no longer implements.

Stale/wrong:
- Component rule for warm-red is asserted but its enforcement lives outside the color engine (code-truth open-q #7).

### [EDIT] neutrals.md (medium)
generateNeutralScale({H,C}), NEUTRAL_TINT_CURVE 12-value array, closestNeutralFamily, and the 6 Radix families all match code-truth. Needs a staleness caveat: the brand-tinted path it documents as a live option is wired but unexercised, and it omits the bespoke cta/on-highlight neutral roles.

Stale/wrong:
- Presents brand-tinted neutral (tint via {H,C}/NEUTRAL_TINT_CURVE) as a live alternative, but code-truth #8: NO caller passes a tint — every caller builds pure gray; the tint-curve machinery is wired but unexercised (possible dead code pending spec).

### [EDIT] neutrals.md (medium)
generateNeutralScale({H,C}), NEUTRAL_TINT_CURVE 12-value array, closestNeutralFamily, and the 6 Radix families all match code-truth. Needs a staleness caveat: the brand-tinted path it documents as a live option is wired but unexercised, and it omits the bespoke cta/on-highlight neutral roles.

Stale/wrong:
- Omits that generated neutral fill L is HARDCODED 0.57 (not contrast-solved), and that neutral carries a bespoke cta-15/16 near-black/near-white button plus a WCAG-COMPUTED on-highlight polarity (white fails on mid-gray) — relevant to anyone consuming the neutral ramp.

### [EDIT] neutrals.md (medium)
generateNeutralScale({H,C}), NEUTRAL_TINT_CURVE 12-value array, closestNeutralFamily, and the 6 Radix families all match code-truth. Needs a staleness caveat: the brand-tinted path it documents as a live option is wired but unexercised, and it omits the bespoke cta/on-highlight neutral roles.

Stale/wrong:
- Core build (build.ts) generates pure-gray neutral while the plugin/Figma path assigns a Radix family — two different neutral sources worth noting.

### [EDIT] neutrals.md (medium)
generateNeutralScale({H,C}), NEUTRAL_TINT_CURVE 12-value array, closestNeutralFamily, and the 6 Radix families all match code-truth. Needs a staleness caveat: the brand-tinted path it documents as a live option is wired but unexercised, and it omits the bespoke cta/on-highlight neutral roles.

Stale/wrong:
- radixNeutralCss emits --neutral-1..12 numeric while Figma renames the same hexes to paper/wash/.../ink (code-truth open-q #4) — CSS/Figma name divergence.

### [KEEP] accent-warning.md (high)
Accurate: accent (secondary) is not reshaped on collision, warn-only via checkAllCollisions in both modes, checked against all signals. The 'Med-alert' wording flagged by the blind reader is NOT stale — it is the demo's intentional user-facing label for the warning signal (demo/CustomTheme.tsx LABEL map), so the toast text matches the product.

Stale/wrong:
- Verify the symbol checkAllCollisions and rRecAccent.scale naming still exist in current demo/CustomTheme.tsx (collision.ts confirms checkCollision/stopDeltaE; checkAllCollisions not spot-checked) — low-risk naming verification only.

### [KEEP] chroma-envelope.md (high)
Reconciles cleanly with code-truth section B (light chroma = blend of vivid ladder vSubtle*chromaBoost*LIGHT_BASE_C and cream gamut-envelope brandSat*satFraction*maxChromaAt, blended by muted-warm u; binary-search gamut clamp; envelope narrow near white). Concrete, checkable, no contradictions.

Stale/wrong:
- References both the-12-stop-ramp.md and stop-ladder.md as if distinct (they are distinct files, so fine) — only confirm the cross-links resolve.

### [KEEP] chroma-envelope.md (high)
Reconciles cleanly with code-truth section B (light chroma = blend of vivid ladder vSubtle*chromaBoost*LIGHT_BASE_C and cream gamut-envelope brandSat*satFraction*maxChromaAt, blended by muted-warm u; binary-search gamut clamp; envelope narrow near white). Concrete, checkable, no contradictions.

Stale/wrong:
- Spot-verify magic numbers 0.52 (maxChromaAt reference L) and 0.13 (vividness divisor) against current stopTable/constraints — not contradicted, just unverified.

### [KEEP] collisions-detection-constants (low)
Placeholder note (not a real file): the collision constants cited across docs all verified against collision.ts/colorEngine.ts. No action — included only to record that the constant set is accurate.

### [KEEP] compliance.md (high)
Matches code-truth: per-fill on-fill text clears WCAG AA + APCA by construction (enforceOnFillContrast), APCA picks polarity / WCAG bounds the fill, text 11/12 anchored at dark roots then contrast-bounded vs stop2Y (4.5/7.0), exact mode opts out. wcagY/contrastRatio/apcaLc/computeLFlip/findMaxLForContrast all consistent.

Stale/wrong:
- Minor: 'guaranteed by construction' is true for signals + non-exact brands, but code-truth flags brands' dead-zone enforcement as 'TBD' in comments (colorEngine ~503) and notes two different white-on-fill mechanisms (success pre-darken vs runtime ladder). Doc could note the brand path is enforced-but-marked-provisional. Does not contradict the doc's core claim.

### [KEEP] compliance.md (high)
Matches code-truth: per-fill on-fill text clears WCAG AA + APCA by construction (enforceOnFillContrast), APCA picks polarity / WCAG bounds the fill, text 11/12 anchored at dark roots then contrast-bounded vs stop2Y (4.5/7.0), exact mode opts out. wcagY/contrastRatio/apcaLc/computeLFlip/findMaxLForContrast all consistent.

Stale/wrong:
- Token term 'on-fill' is now split into on-cta / on-highlight (tokenNames.ts) — update terminology.

### [KEEP] dark-mode.md (high)
Accurate against code-truth: dark fills LIFT to a floor never pull down (DARK_STOP_9_MIN_L), dark backgrounds ride their own raised/chroma-boosted ladder via Y-equalization, red colliders float to a pastel-rose register with reduced chroma + black on-fill. Constants and worked example consistent.

Stale/wrong:
- DARK_STOP_9_MIN_L=0.63 is the SIGNAL/default floor; brands use DARK_BRAND_FILL_MIN_L=0.70 (resolve.ts:120). The navy worked example lifting to 0.630 should be re-checked — a brand should lift to 0.70, not 0.63 (the example may predate the brand-specific floor). Verify the 0.630 figure.

### [KEEP] dark-mode.md (high)
Accurate against code-truth: dark fills LIFT to a floor never pull down (DARK_STOP_9_MIN_L), dark backgrounds ride their own raised/chroma-boosted ladder via Y-equalization, red colliders float to a pastel-rose register with reduced chroma + black on-fill. Constants and worked example consistent.

Stale/wrong:
- Uses 'error red / collider' framing rather than current signal-identity naming — cosmetic, internally coherent.

### [KEEP] dark-mode.md (high)
Accurate against code-truth: dark fills LIFT to a floor never pull down (DARK_STOP_9_MIN_L), dark backgrounds ride their own raised/chroma-boosted ladder via Y-equalization, red colliders float to a pastel-rose register with reduced chroma + black on-fill. Constants and worked example consistent.

Stale/wrong:
- Should note dark red-band brands also regenerate the whole dark ramp from a cooled darkH (coolRedDark), not only the muted-collider float.

### [KEEP] escape-hatches.md (high)
Matches code-truth: exact mode ships hex untouched and gates the whole resolution block (enforceOnFillContrast=!exact, coolRedDark=!exact, collision/rung-1/cool-render all skipped); archetypeOverride forces the archetype and SKIPS collision logic. resolveBrand(hex,name,{exact?,archetypeOverride?,style?}) signature consistent. rung1 'error'->null in exact is accurate (rung1 only set in-red-band on collision).

Stale/wrong:
- Worked example labels rung1 = 'error' — in code rung1 is set to RUNG1_ARCHETYPE='dark' (the value is the forced archetype, not the string 'error'); 'error' is the collision trigger name, not the rung1 value. Tighten wording.

### [KEEP] escape-hatches.md (high)
Matches code-truth: exact mode ships hex untouched and gates the whole resolution block (enforceOnFillContrast=!exact, coolRedDark=!exact, collision/rung-1/cool-render all skipped); archetypeOverride forces the archetype and SKIPS collision logic. resolveBrand(hex,name,{exact?,archetypeOverride?,style?}) signature consistent. rung1 'error'->null in exact is accurate (rung1 only set in-red-band on collision).

Stale/wrong:
- style-lever cross-link fine; note full-chroma is plumbed-but-unimplemented (see style-lever.md).

### [KEEP] illustrations.md (medium)
Consistent with code-truth: separate 4-slot palette (generateIllustrationScale) bypassing UI rules (no WCAG/collision/cool-shift/contrast darkening) but retaining the warm gold-spine torsion; remapSvg for legend-hex substitution. Slot lightness targets and ILLUS_STOPS/remapSvg symbols not spot-checked against source but nothing contradicts code-truth.

Stale/wrong:
- Verify slot L targets (wash 0.97 / tint 0.88 / mid 0.63 / deep 0.47) against current ILLUS_STOPS — unverified, not contradicted.

### [KEEP] illustrations.md (medium)
Consistent with code-truth: separate 4-slot palette (generateIllustrationScale) bypassing UI rules (no WCAG/collision/cool-shift/contrast darkening) but retaining the warm gold-spine torsion; remapSvg for legend-hex substitution. Slot lightness targets and ILLUS_STOPS/remapSvg symbols not spot-checked against source but nothing contradicts code-truth.

Stale/wrong:
- Confirm generateIllustrationScale/remapSvg/SAMPLE_ILLUSTRATION symbol names still current post-rename.

### [KEEP] lineage.md (high)
Accurate orientation doc: keeps Radix 12-step reserved-role model, generates from one hex, brand anchors step 9, collision-awareness vs fixed signals. LIGHT_STOPS = median OKLCH lightness of Radix's 11 chromatic scales and REFERENCE_H=245 match code-truth (stopTable.ts); radixNeutrals 6 families (gray/mauve/slate/sage/olive/sand) verified.

Stale/wrong:
- 'Brand color anchors step 9' is correct but step 9 is now the cta/highlight emphasis-fill role, not an in-scale step — add a one-line pointer to the role model so it stays consistent with the rename.

### [KEEP] lineage.md (high)
Accurate orientation doc: keeps Radix 12-step reserved-role model, generates from one hex, brand anchors step 9, collision-awareness vs fixed signals. LIGHT_STOPS = median OKLCH lightness of Radix's 11 chromatic scales and REFERENCE_H=245 match code-truth (stopTable.ts); radixNeutrals 6 families (gray/mauve/slate/sage/olive/sand) verified.

Stale/wrong:
- 'stop' terminology is fine; no contradiction with code (stopTable.ts still uses stop/LIGHT_STOPS).

### [KEEP] oklch.md (high)
Pure color-math explainer, fully consistent with code-truth: reasons in OKLCH, converts at render, Ottosson matrices in oklchToLinearRgb (constraints.ts), oklchToSrgbUnclamped (colorEngine.ts), clampChromaToGamut reduces C at fixed L/H, per-channel clipping avoided. Untouched by the token rename.

Stale/wrong:
- Minor link/term inconsistency: prose '12-step ramp' vs link the-12-stop-ramp.md (stop vs step) — cosmetic.

### [KEEP] relative-spine.md (medium)
Matches code-truth's hue-path description: light ramp uses RELATIVE drift — capped (0.55) partial travel along the spine SHAPE relative to scaleL, weighted by wDrift and an off-path gaussian; same machinery feeds light/dark/illustration (dark+illus via torsionedHue hard band). torsionedHue and the off-path gaussian are real.

Stale/wrong:
- Verify symbol names offPathG and __setSpineSourceForAnalysis still exist (code-truth names torsionedHue and the off-path gaussian; the analysis hook not spot-checked).

### [KEEP] relative-spine.md (medium)
Matches code-truth's hue-path description: light ramp uses RELATIVE drift — capped (0.55) partial travel along the spine SHAPE relative to scaleL, weighted by wDrift and an off-path gaussian; same machinery feeds light/dark/illustration (dark+illus via torsionedHue hard band). torsionedHue and the off-path gaussian are real.

Stale/wrong:
- 'sigma ~20deg' and the 'nano/ireland' defect-class term are internal/unverified against current constants — not contradicted.

### [KEEP] stop-ladder.md (high)
Accurate: fixed shared lightness ladder for stops 1-8 (LIGHT_STOPS rootL), calibrated to median OKLCH lightness of Radix's 11 chromatic scales, REFERENCE_H=245, step 9 = brand anchor exception, 10-12 dark end, yellow lift gaussian. rootL values and YELLOW_L_LIFT consistent with code-truth section B.

Stale/wrong:
- Step 9 framed as in-scale exception — true, but cross-reference the cta/highlight role model so it stays consistent post-rename (same note as lineage/the-12-stop-ramp).

### [KEEP] stop-ladder.md (high)
Accurate: fixed shared lightness ladder for stops 1-8 (LIGHT_STOPS rootL), calibrated to median OKLCH lightness of Radix's 11 chromatic scales, REFERENCE_H=245, step 9 = brand anchor exception, 10-12 dark end, yellow lift gaussian. rootL values and YELLOW_L_LIFT consistent with code-truth section B.

Stale/wrong:
- Confirm rootL array [0.993...0.738] and YELLOW_L_LIFT params (+0.03 by stop 8, center H92, sigma 20) against current stopTable.ts — code-truth corroborates the shape; exact values unverified.

### [KEEP] style-lever.md (high)
Matches code-truth C.1: style 'deeper' lever lifts effective mutedness toward 1 inside a hue x u band gate, no-op when unset (DEEPER_STRENGTH * bandGate); flag carried on the brand and threaded through resolveBrand. full-chroma plumbed-but-unimplemented is consistent with the flag existing without wired math.

Stale/wrong:
- Band range 'hue ~55-100deg' should be reconciled with the code's creamGate edge (CREAM_UPPER_H 105, tuned to the fleet's H62-141 gap, code-truth #10/open-q) — the doc's stated band may not exactly match the gate constants; verify.

### [KEEP] warm-hues.md (high)
Consistent with code-truth: gold-spine piecewise-linear hue path drives warm rotation as L drops, solid steps keep brand hue, dark stops rotate toward gold; WARM_TORSION band [40,122] matches the dark/illustration torsionedHue hard band. spineHue/torsionedHue/GOLD_SPINE/WARM_TORSION all real.

Stale/wrong:
- Verify WARM_TORSION values travel 0.55 / capDeg 24 and GOLD_SPINE knots (H110@L0.97 -> H47@L0.30) against current stopTable.ts — code-truth confirms band [40,122] and cap 0.55 travel for the relative spine; exact knot values unverified.

### [KEEP] warm-hues.md (high)
Consistent with code-truth: gold-spine piecewise-linear hue path drives warm rotation as L drops, solid steps keep brand hue, dark stops rotate toward gold; WARM_TORSION band [40,122] matches the dark/illustration torsionedHue hard band. spineHue/torsionedHue/GOLD_SPINE/WARM_TORSION all real.

Stale/wrong:
- Note (already flagged by blind reader): the light ramp uses RELATIVE drift (see relative-spine.md), while the hard fixed-spine description here best fits the dark/illustration torsionedHue path — keep the two docs consistent on which ramp uses which.

### [REWRITE] README.md (high)
The inline Lineage/pipeline section is both typo-laden (inpired, gemoetry, extends then, resovlved, cta) and factually wrong about the engine. Index/TOC scaffold is fine and should be preserved, but the prose pipeline must be redone from code-truth. Has uncommitted working-tree changes already.

Stale/wrong:
- Step 2 says colliding brand colors are 'sheared cool' — preventive shear was DELETED 2026-06-11; resolveBrand returns shearDeg hardcoded 0. The real red separation is render-time applyRedCoolRender rotating stops 9/10 only, plus rung-1 re-anchor to the dark archetype (in-red-band only).

### [REWRITE] README.md (high)
The inline Lineage/pipeline section is both typo-laden (inpired, gemoetry, extends then, resovlved, cta) and factually wrong about the engine. Index/TOC scaffold is fine and should be preserved, but the prose pipeline must be redone from code-truth. Has uncommitted working-tree changes already.

Stale/wrong:
- 'the brand's cta color is then checked against error red' conflates the role rename: collision is checked on the brand stop-9 fill (the cta role), but the check is the same generateScale collision scan, gated by inRedBand on the RAW hue.

### [REWRITE] README.md (high)
The inline Lineage/pipeline section is both typo-laden (inpired, gemoetry, extends then, resovlved, cta) and factually wrong about the engine. Index/TOC scaffold is fine and should be preserved, but the prose pipeline must be redone from code-truth. Has uncommitted working-tree changes already.

Stale/wrong:
- Pipeline ordering is incomplete/misleading: actual order is generate-raw -> light collision (rung-1) -> separate dark collision (dark collider 'muted') -> warningVariant -> signal-shift overrides -> final applyRedCoolRender. Neutral assignment is not an inline engine step in the core build (build.ts generates pure gray; Radix-family assignment is plugin/demo-only).

### [REWRITE] README.md (high)
The inline Lineage/pipeline section is both typo-laden (inpired, gemoetry, extends then, resovlved, cta) and factually wrong about the engine. Index/TOC scaffold is fine and should be preserved, but the prose pipeline must be redone from code-truth. Has uncommitted working-tree changes already.

Stale/wrong:
- TOC item 14 'Neutral tinting' overstates: the tint curve / generateNeutralScale tinting is wired but NO caller exercises it (pure gray everywhere).

### [REWRITE] README.md (high)
The inline Lineage/pipeline section is both typo-laden (inpired, gemoetry, extends then, resovlved, cta) and factually wrong about the engine. Index/TOC scaffold is fine and should be preserved, but the prose pipeline must be redone from code-truth. Has uncommitted working-tree changes already.

Stale/wrong:
- Heading link is ./the-12-stop-ramp.md but text says '12-step ramp' (stop vs step inconsistency).

