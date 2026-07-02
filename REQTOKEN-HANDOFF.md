# Continue: requirement-token color engine (compact/handoff)

**STATUS 2026-07-02 (night): STAGES 0–6 COMPLETE AND OWNER-APPROVED — committed as one checkpoint on reqtoken/color-engine. Remaining: Stage 7 (cleanup + docs rework — owner: "probably a lot of documentation clean up and rework required").**

Stage-6 final form (all owner-picked from render sweeps):
- paper-2: min-separation ΔE ≥ **0.028** vs paper-1 (light; dark already ~0.035).
- wash 3–7: HOLISTIC re-space (owner's call over my per-seam chain patch — kills the warm-hue inversions at the source): rootLs shifted down by S=0.015 tapering to 0.6·S at stop 7 (uses ~0.009 of the 7↔8 room) → spec.ts LIGHT_WASH_ROOT_L literals.
- wash seam floors: min-separation ΔE ≥ **0.012** vs 'prev' declared on stops 3–7 (the standing anti-collapse guarantee; binds almost nowhere post-re-space). Collapse cases that forced this: muted warm H60 C0.06 AND near-gray (any low-chroma seed — chroma contributes nothing to seam ΔE).
- Isolation proven: dark stops/cta/ons/collision-decisions = 0 diffs vs legacy; light moved exactly at stops 2–8 (+11 where the 4.5 clamp binds). All snapshots re-blessed + smooth re-baselined post owner approval; demo rebuilt and eye-checked.

Replacement summary (plan = ~/.claude/plans/ok-let-s-plan-recursive-shamir.md, all owner decisions honored):
- Stage 0: `src/engine/legacy/` verbatim frozen copies + `scripts/engine-parity.ts` (npm run parity; 12,062 comparisons incl. resolveBrand decisions).
- Stage 1: spec restructured — cta/ctaHover = OFF-SCALE ROLES (numbering fix), highlight 9/10 = scale stops, declared 'on' requirements, C9 4.5 rule dropped, RESOLVER_ID @2.
- Stage 2–3: producers.ts = verbatim engine math (light 'warm-drift' hue producer ≠ torsionedHue!, ladder/envelope chroma blend, aesthetic state, dark floors/curves/collider/enforcement, exact on-boolean asymmetry). `scripts/reqtoken-parity-probe.ts`: 112,944 comparisons float-identical, both modes, 18 opts combos.
- Stage 4 CUTOVER: generateScale body = adapter over resolveRamp. Engine-parity byte-identical; all snapshots CLEAN (zero output change); figma:verify + plugin:build + demo eye-checked both modes.
- Stage 5 dark flip: dark stop-8 3:1 + text 4.5/7 DECLARED (conditional floor: passing hues don't move). FINDING: the hand-placed dark scaffold already satisfies them everywhere probed → zero value drift, pure guarantee, NO re-bless needed. (Blue-recede at WASH stops = separate future declarable, owner to scope.)
- Stage 6: `min-separation` require kind implemented + verified; NOT yet declared — owner picks target from render/paper2.html (candidates 0.020/0.028/0.035; current light median 0.013, dark ~0.035). Downstream requires re-solve automatically (proven in the render: stop-8/11 ripple).
- Stage 7 (pending owner): delete legacy/ + engine-parity + parity-probe + reqtoken-diff + dead YELLOW_L_LIFT; dtcg emit for full role model.
Phases delivered this session: portability spike (`scripts/reqtoken-portability.ts`, 24/24 — round-trip bit-identical, edited-requirement-is-honored, fail-loud), text stops 11/12 + cta/9 in `spec.ts`/`resolve.ts` (producer kinds now: hue warm-torsion|constant, L perceptual|anchor, chroma ladder|brand), gate extended (144 seed×mode, 0 failures incl. cta 4.5 + text 4.5/7.0 BOTH modes), okchroma-diff (`scripts/reqtoken-diff.ts` → `reqtoken-diff-report.md`; 321/616 within ΔE 0.02, rest classified onto bolt-ons/deferred aesthetics + 2 INSPECT buckets: light wash chroma model, misc), DTCG emit (`scripts/reqtoken-emit.ts` → `out/reqtoken.tokens.json`), eye-check render (`scripts/reqtoken-render.ts` → `render/index.html`, served via launch config `reqtoken-render`; all 6 edge seeds valid, dark stop-8 clearly reads off dark paper = blue-recede prevented BY RULE). Engine still byte-identical (`npm run audit` clean).

## STATE (verified working — do not rebuild)
- **Fork:** worktree `~/okchroma-reqtoken`, branch `reqtoken/color-engine` off main `71a66fe`, node_modules symlinked.
  Isolated from `~/okchroma` (owner's PARALLEL session on `research/dark-mode-hk-normalization` — do NOT touch) and `~/okchroma-sandbox` (earlier POC).
- **Plan (approved):** `~/.claude/plans/ok-let-s-plan-recursive-shamir.md` — read it.
- **Built + VERIFIED** (surface stops 1–8, light+dark, ANY seed):
  - `src/reqtoken/spec.ts` — requirement declaration as PURE DATA (the portable artifact).
  - `src/reqtoken/resolve.ts` — resolver: **producer** (warm torsion → chroma ladder → `perceptualRungL` Nayatani) → **require** (contrast clamp, iterated; light = `findMaxLForContrast` down, dark = bisect up) → **refine** (`clampChromaToGamut`). Total (fails loud via `unresolvable`). ~60 lines, reuses real engine funcs.
  - `scripts/reqtoken-audit.ts` — THE GATE. Agnostic 24-hue × 3-chroma sweep. **Result: 144 seed×mode, 0 failures, GATE PASS.** appL uniform ~2–4 (stop-8 = 7.7 light: require overrides producer — CORRECT).
  - 3 behavior-preserving exports added in `src/engine/colorEngine.ts`: `goldSpineHue`, `torsionedHue`, `hexToOklch`. Engine unchanged — confirmed by `npm run audit` → "snapshot regression: clean — matches blessed build".
- **NOT committed** (owner's "show before commit" rule).

## KEY DECISIONS (settled — don't re-litigate)
- **Gate = requirement-satisfaction, NOT okchroma parity.** okchroma = a divergence DIAGNOSTIC only. Matching it would reproduce its bugs.
- **Clean producer:** reproduce only the CORE (perceptualRungL + torsionedHue + contrast + gamut). okchroma's aesthetic machinery (`chromaBoost`/`mutedness`/`red-cool`/collision) is DEFERRED → documented divergence, folded in during a later aesthetics pass. Keeps the resolver small.
- **Red-cool:** important, STAYS — but it's part of the COLLISION machinery, deferred (not this slice).
- **Portability (settled):** requirements = portable data (→ DTCG `$extensions`); the producer (Nayatani/gamut/torsion) is an algorithm + appearance model, NOT a portable formula → a NAMED resolver (the DTCG "computed source" model). Keep `spec.ts` pure data, separated from resolver code, so portability = serialization, no rebuild. Do NOT build a full expression-grammar spec.

## NEXT (plan phases, each gated by reqtoken-audit green)
1. **Portability spike** — one stop's requirement (data) → DTCG `$extensions` token (+ `$value` fallback + named producer ref) → resolver reads it back + resolves. Reuse `figmaRender.ts` DTCG `$type`/`$value` shape.
2. **Text stops 11/12** (contrast-required 4.5 / 7 vs paper-2). Reuse `findMaxLForContrast` + `STOP_11`/`STOP_12` tables.
3. **CTA/fill 9** (contrast-required; brand family; producer L = `scaleL`/archetype median).
4. **okchroma-diff report** — run the ENGINE `resolveBrand` (`src/engine/resolve.ts`) per seed, diff per stop (L/C/H, ΔE) worst-first, classify each divergence vs the 6 bolt-ons: `applyRedCoolRender`, collision re-solve, `pickSignalShift`, dark-highlight placement, dark-stop-8 placement, chroma floor. Report-only.
5. **Emit** full-slice requirements to DTCG `$extensions`.
6. **Eye-check render** — reqtoken ramp for edge seeds (saturated yellow/green/blue, near-gray) via `preview_start` + `preview_screenshot`. Aesthetics deferred; confirm valid.

## REUSE (import, no reproduction)
`perceptualL.ts` (perceptualRungL, apparentL) · `constraints.ts` (wcagY, contrastRatio, findMaxLForContrast, findLForContrast, clampChromaToGamut, oklchToLinearRgb) · `stopTable.ts` (LIGHT_L, DARK_NEUTRAL_L, LIGHT_STOPS, DARK_SUBTLE_CHROMA_MULT, STOP_8/11/12 constants, WARM_TORSION, GOLD_SPINE, DARK_STOP_9_MIN_L) · `colorEngine.ts` (hexToOklch, goldSpineHue, torsionedHue — now exported).
Map reference: `colorEngine.ts:249–513` (generateScale phases) · `scripts/gamut-sweep.ts` + `highlight-audit.ts` (sweep skeleton).

## RUN
Gate: `cd ~/okchroma-reqtoken && npx esbuild scripts/reqtoken-audit.ts --bundle --platform=node --outfile=dist/reqtoken-audit.js && node dist/reqtoken-audit.js`
Engine-unchanged check: `npm run audit`

## CONSTRAINTS
Work ONLY in `~/okchroma-reqtoken`; nothing on `main`; show before commit; verify branch before any commit. Token discipline: caveman-terse subagents + right-size fan-out + rtk auto-on (`~/.claude/CLAUDE.md`). Judge via real output.
