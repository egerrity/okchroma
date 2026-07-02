# Continue: requirement-token color engine (compact/handoff)

## ▶ APCA/WCAG contrast-profile spike: DONE — OWNER-APPROVED 2026-07-02 ("yes!" on the recommended map)

**Shipped WCAG output untouched — `npm run audit` snapshot CLEAN with the profile code live.**
All gates green: req:audit (now 288 seed×mode across BOTH profiles, 0 failures) · audit ·
highlight-audit · audit:divergence · figma:verify · plugin:build · typecheck · portability 25/25.

What landed (all in the working tree, show-before-commit):
- `src/reqtoken/spec.ts` — Require union gains `{ metric: 'apca', against: 'paper-2', targetLc }`.
- `src/reqtoken/profiles.ts` (NEW) — `withProfile(spec, 'wcag'|'apca', lcMap?)`: maps wcag→apca
  requires; identity for 'wcag'; min-separation passes through. `DEFAULT_APCA_LC_MAP = {3:30, 4.5:60, 7:90}`.
- `src/reqtoken/producers.ts` — `apcaYAt` + `findMaxLForApcaLc` (bisection in EMIT space: chroma
  gamut-clamped per candidate L — raw-chroma solving lost >1 Lc to the emit trim on saturated
  yellows); `placeLightScale`/`placeLightText` now take a metric-blind `maxLFor` closure (the wcag
  closure calls findMaxLForContrast with the exact old arguments — float-identical, snapshot-proven).
- `src/reqtoken/resolve.ts` — per-metric closures (`maxLForOf`), generalized dark conditional-floor
  bisection (apca measures emit-space; wcag floats untouched), apca verify branch (fail-loud).
- `src/engine/colorEngine.ts` — `contrastProfile?: 'wcag'|'apca'` on GenerateOptions; adapter
  compiles withProfile(). Default 'wcag' = identity.
- `scripts/reqtoken-audit.ts` — the whole sweep runs under both profiles; apca requires verified.
- `scripts/apca-sweep.ts` → `render/apca.html` (NEW) — the owner eye-check: 3 candidate Lc maps ×
  wcag-vs-apca side-by-sides (6 edge seeds, real components, light-on-light/dark-on-dark) +
  24-hue movement table + Lc/ratio annotations per stop.
- docs: schema.md (apca require + profiles section) · architecture.md limitation #1 updated.

**FINDINGS (render/apca.html — now framed as ONE question: "does the APCA column look right?"):**
1. **The Lc map is SETTLED as a recommendation (owner round 3: "why wouldn't we just do the
   recommended?"): DEFAULT_APCA_LC_MAP = {3:30, 4.5:75, 7:90}.** Each slot measured, not copied
   from a bridge table: 30 = APCA solid-UI minimum (45 breaks the dark highlight band); 75 = APCA
   body-text minimum AND the measured equivalent of the shipped cta enforcement (so ctas keep
   their shipped look); 90 already holds. Rejected variants (4.5→60 releases ctas lighter;
   3:1→45 structural break) are footnotes on the render page with one seed-pair each.
2. **Dark stop-8 is the WCAG blind spot:** it reads only Lc 24–29 vs dark paper-2 (ratio 3:1
   passes; APCA says barely visible). Under Lc 30 it lifts modestly (L 0.550→~0.58, all hues).
   **Under Lc 45 it must rise to L≈0.69 — PAST hand-placed highlight-9 (0.600)**: bridge-45 is
   structurally incompatible with the current dark highlight band (marked ⚠ in the render);
   adopting it means re-placing that band.
3. **Light stop-8 RELAXES lighter under apca** (WCAG 3:1 reads Lc≈54 — over-demanding vs either
   candidate): saturated green L 0.624→0.740, ratio drops to ~1.97 (fails 1.4.11 *under the ratio
   metric*, by design — different conformance model). A re-solve moves stops both ways.
4. Light ink 11/12 already read Lc 67–77/92+ → barely move; dark ink lifts only where <60/<90.
5. **ON-TEXT IS IN THE PROFILE (owner call, round 2):** withProfile sets `ons.onFill.enforceLc`
   from the map's 4.5 slot — pole judged pure apca-pole (wcag flip = metric-mixing, provably a
   no-op under one metric; poles differ on 5–6/72 seeds), cta enforcement re-solves to Lc instead
   of 4.5 (producers: whiteTextLcAt/findLForWhiteTextLc/ctaLightLApca/ctaDarkEnforcedLApca, all
   emit-space). **MEASURED BRIDGE FACT: the shipped WCAG 4.5-white enforcement lands ctas at
   Lc ≈ 76–78** → a 4.5→60 map RELEASES fills lighter (white text Lc 64–71, ratio drops to ~3.3–3.9
   by design); a 4.5→75 map REPRODUCES the shipped ctas (ΔL ≤ ~0.02). That's the on-text half of
   the Lc-map decision. Render columns now show the cta button + on-fill Aa and highlight-9 + Aa.
6. **Demo toggle NOT built (deliberate):** threading the profile through the module-level canonical
   signal scales + the neutral generated inside cssRender/themeToFigma is a real slice — only worth
   doing if the profile is adopted/exposed. Flagged, not started.

Eye-check: `render/apca.html` via the reqtoken-render preview (renders verified in-session, both
modes, break markers visible). Owner picks: Lc map · adoption/exposure · the ons-fallback question.

## Where things stand (2026-07-02, end of the merge day)

- **The requirement-token engine IS production okchroma**: origin/main @ b95864a. History:
  71a66fe → c7542b7 (engine replacement, byte-identical cutover) → 8b79504 (stage-7 cleanup +
  docs + elevation-mirror semantic aliasing) → 93dd626 (neutralCss anchor fix) → 523a9d9
  (blue-recede: 'perceptual-lift' dark producer) → b698527 (paper-0 = resolved stop 0) →
  f2372de (paper-0 dark rootL 0.16) → 6841710 (docs/schema.md) → 48ea5e5 (DocsSite schema
  article, live-emitted tokens) → 2ba478d (plugin: adaptive paper-0 via neutral ramp payload,
  on-fills decoupled to per-mode abs poles, accent→secondary, secondary default OFF) →
  b95864a (elevation anchors renamed paper-raised/paper-sunken).
- **Work in `~/okchroma-reqtoken`** (worktree, branch `reqtoken/color-engine` == origin/main).
  The owner's `~/okchroma` is on main, possibly behind origin — NEVER touch that tree (their
  parallel session lives there; push main via `git push origin reqtoken/color-engine:main`
  after owner approval, exactly as before). Show before commit; verify branch before commits.
- **Docs surfaces:** README · docs/architecture.md (§2b schema concept) · docs/scale.md ·
  docs/schema.md (field reference) · DocsSite "The token schema" (live-emitted). Keep all in
  sync with any spec change. Vocabulary: scale/cta/ons — never "surface" as a category,
  "secondary" never "accent", signals by identity.
- **Open follow-ups besides APCA:** demo "Accent color" input label (same vocab sweep, demo
  side — flagged, owner hasn't called it) · plugin install docs gap (owner raised it, then we
  got pulled onto the plugin globals — the DocsSite Installation article has one thin line;
  README/architecture cover it better; probably wants a proper walkthrough).
- Yellow-in-light: FIXED (owner-confirmed) — off the list.

**STATUS 2026-07-02 (late night): STAGE 7 IMPLEMENTED (uncommitted, awaiting owner review): deleted src/engine/legacy/ + engine-parity + parity-probe + reqtoken-diff(+report) + 18 historical research scripts (helmk-*, census/candidates/probes, workflow generator) + helmlab dep + the parity npm script; YELLOW_L_LIFT → YELLOW_BAND (the lift value was dead; the band definition was live in highlight-audit); "surface" vocab renamed to scale in reqtoken files + TokenCards labels/copy; docs reworked to the schema (README how-it-works, architecture.md §2 pipeline + new §2b "The requirement schema", scale.md stop table w/ declared requirements + new wash rootLs, DocsSite pipeline/scale prose); demo fixes: highlight-8 swatch no longer shows "Aa" (non-text stop), side-nav confirmed neutral-paper-2 NOT wash-3 (measured #f2f4f2 C 0.003 — reads deeper since the 0.028 push). OWNER'S ELEVATION-MIRROR SPEC IMPLEMENTED in tokens/semantic.css: raised/sunken mirror around the paper-1 page via the mode-flipping --paper-0 anchor (light: raised=paper-0/white, sunken=paper-2 · dark: raised=paper-2, sunken=paper-0/black — dark sunken previously sat AT the page level, never sank). Verified both modes in the live preview. All gates green post-rebuild.**

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
