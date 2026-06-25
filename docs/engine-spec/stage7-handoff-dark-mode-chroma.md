# Handoff — dark-mode chroma reduction + paused generated-neutral (Stage 7)

Start here. Branch `scope/engine-spec` (do NOT merge to `main`). This session shipped two
engine commits, then a designed-not-built neutral, then pivoted to the real prize:
**dark mode is currently *louder* than light, and it should be quieter.** The active next
work is an L&H-aware dark-mode chroma reduction — spec drafted, not yet wired.

## Ordering (decided 2026-06-24): finish 2b FIRST, then dark mode

2b is the **background-friendly** half (mechanical wiring, machine-checkable gates); dark mode needs
the owner's eye. And the dark `darkChromaReduce` hook lives at `generateScale`'s dark sites, which the
CURRENT bespoke neutral does NOT pass through — so the neutral can't receive the dark reduction until
2b routes it through `generateScale`. Sequence: **2b → dark-mode reduction (which then covers the
neutral too).**

**Coordination note for the dark-mode pass:** the neutral's curve already lowers dark chroma (its dark
shape is the quiet one). Once the neutral is on the `generateScale` path, the general `darkChromaReduce`
multiplies on top ⇒ possible double-mute. Likely a non-event (the neutral sits near the chroma floor),
but it's an explicit "exempt the neutral, or let it compose?" decision when the dark-mode pass runs.

To run 2b unattended, see **Autonomous-run brief — 2b** below.

## Where the tree is

- **Committed (engine):**
  - `1227a7b` feat(engine): universal highlight holds white — dropped the `isYellow` carve-out
    in the highlight rung; every hue darkens to hold white. Re-blessed.
  - `697f25c` feat(engine): add `chromaCurve` seam — `GenerateOptions.chromaCurve(L, mode)`
    overrides per-stop chroma by lightness; **byte-identical when unset**, adversarially verified
    (every rendered-chroma site wrapped, correct mode).
- **Uncommitted in tree (this commit should add them):**
  - `src/engine/neutralCurve.ts` — the generated-neutral chroma curve (WIP from paused 2b, below).
  - `docs/engine-spec/dark-mode-chroma-reduction-spec-v1.md` — the **starting spec** for the
    dark-mode work (the centerpiece for tomorrow).
  - `scripts/darkmode-chroma-proposal-generator.workflow.js` — the re-runnable proposal generator
    (a Workflow script; edit + re-invoke to regenerate proposals).
- **Gates green** at the committed state: `typecheck`, `highlight-audit`, `dark-audit` (clean),
  `figma:verify`, `plugin:build`.

## Read first (memory)

`[[no-corrective-patch-layers]]` (value falls out of the pipeline; no bolt-on layers),
`[[explain-before-engine-changes]]` (explain what/where/how, get explicit go before ANY engine
add/change/subtract), `[[engine-color-rules]]`, `[[neutral-generation-from-brand-hue]]`,
`[[engine-spec-effort]]`.

## THE ACTIVE WORK — dark-mode chroma reduction (do this next)

**The problem (measured this session):** the engine makes dark mode *more* intense than light.
Worst case: the yellow signal goes from contrast 1.55 vs paper (subtle, light) to **11.23** vs the
dark surface (loud near-white). Best practice (brainy.ink, Builderius, and our own data) says dark
should be **lower-chroma and not louder**. The lever is **chroma**, not lightness.

**The decision: leave lightness/archetypes ALONE, add a dark-only L&H-aware chroma reduction.**
Two web sources corroborate: desaturate accents ~15–25% in dark (more on text/borders), pull chroma
back as lightness rises, reduce harder on hues that glow (blue/violet) and barely on yellow/green
(the gamut already self-clamps them).

**The spec is written:** `docs/engine-spec/dark-mode-chroma-reduction-spec-v1.md`. Headline:
- New dark-only option `darkChromaReduce?: (L, H) => number` on `GenerateOptions`, default `()=>1`
  ⇒ byte-identical. A `darkCAt` wrapper (terminal multiply, **after** `applyChromaFloor` and `cAt`)
  swapped in at the confirmed dark sites (subtle stops 1–8, fill 9/10, text 11/12; rung exempt).
- `reduce(L,H) = clamp(retain(L) · hueFactor(H), MIN_RETAIN, 1.0)` — `retain(L)` concentrates the cut
  on the **hot mid-band L 0.55–0.80** (fills + boosted signal surfaces), NOT the already-quiet deep
  stops; `hueFactor(H)` cuts blue/violet hardest, ~1.0 for green/yellow. Starting numbers + closed
  forms (single `DEPTH` knob) are in the spec.
- The `chromaCurve` seam (697f25c) **cannot** carry this (it replaces, no C/H input) — hence the new
  scaling hook. They compose cleanly.

**Two real decisions for tomorrow (the spec flags both):**
1. **How deep** — start `DEPTH=0.22` L-taper, `0.18` hue; sweep the fleet, dial up if still electric.
2. **Fill exemption** — engine doctrine says "never reduce fill chroma" (it manufactured mustard
   golds historically); the research says blue/violet *fills* are the #1 offender. The spec's posture:
   trim blue/violet fills only (hueFactor gates it), auto-exempt green/yellow/orange. **This deviates
   from doctrine → needs explicit owner sign-off** before it ships (`[[no-corrective-patch-layers]]`,
   `[[explain-before-engine-changes]]`).

**To regenerate/extend proposals:** edit `scripts/darkmode-chroma-proposal-generator.workflow.js`
and re-invoke Workflow with that `scriptPath`. It seeds from the brainy.ink + Builderius findings and
our engine facts (all embedded in the script's `args`).

## Decisions LOCKED this session (don't relitigate)

- **Neutral is always the `'light'` archetype.** Archetypes exist for collision-avoidance, not to
  echo the brand. The neutral does not adopt the brand's range.
- **The neutral cta is the *subtle* button** (near-white in light, subtle dark in dark) — NOT a loud
  near-black one. A brand that wants a loud button uses its **secondary**. (So the "flip the neutral
  cta to near-black" idea is dead.)
- **Dark mode = chroma lever, not lightness.** The lightness/contrast path is a rabbit hole (a real
  contrast-vs-identity tension: preserving a dark brand's contrast forces it near-white and kills the
  brown). If revisited, the principle is a contrast **ceiling** (dark never louder than light), NOT a
  contrast *match* — but it's parked in favor of the chroma reduction above.
- **Generated neutral colors are owner-approved** (the curve output; see 2b below).

## PAUSED — 2b: generate the neutral via `generateScale` (resume after dark-mode lands, or in parallel)

The neutral is being moved off Radix families to a reuse of `generateScale` + the `chromaCurve` seam.
Status: **generation designed + validated, emission/wiring NOT done.**
- `src/engine/neutralCurve.ts` (in tree) — `neutralChromaCurve(brandH, level)` returning the dark/
  light tint curve. Levels: pure / default / branded. **Owner approved the colors** (a dark-mode
  shape bug was caught and fixed: the L-anchor interpolation must be order-agnostic — dark Radix
  anchors ascend, light descend).
- **Still TODO (the wiring), all coupled — typecheck breaks until all done:**
  1. Rewrite `generateNeutralScale(brandH, level)` to call `generateScale(grayHex@brandH, 'neutral',
     'light', { chromaCurve: neutralChromaCurve(...), highlight: true, enforceOnFillContrast: true })`
     and retire the bespoke body (the `0.57` hardcode + `NEUTRAL_TINT_CURVE`).
  2. Emission → neutral becomes **brand-kind** (cta = stop 9, highlight = rung 13/14): emit it via the
     existing `brandKindBody`/`rampGroup` path (kind `'brand'`, minus the identity token); drop
     `cssRender.neutralRadixCss`, `figmaRender.neutralGroup`, `build.generateNeutralCss` (the neutral
     becomes **per-brand**, not the global `:root` block).
  3. Update callers/audits to the new signature (`build.ts`, `figmaRender.ts`, `cssRender.ts`,
     `scripts/highlight-audit.ts`, `scripts/figma-verify.ts`).
  4. Demo `CustomTheme.tsx` + `App.tsx` + `plugin/ui.ts`: family picker → pure/default/branded level
     picker; drop `closestNeutralFamily`/`RADIX_NEUTRALS`.
  5. **Delete** `src/radixNeutrals.ts`; remove `NEUTRAL_TINT_CURVE` from `stopTable.ts`.
  6. Re-bless `highlight-snapshot.json` + dark-audit.
- **Open neutral-cta question:** with lightness left alone, the neutral cta does NOT flip (stays
  near-white, a ghost in light *and* low-contrast). The owner decided that's acceptable for now (it's
  the subtle button). The dark-mode chroma work does not fix it; a future lightness pass would.

## Autonomous-run brief — 2b (the background-friendly task)

For running 2b unattended (a `/loop`, a scheduled run, or a fresh agent). **Objective: get 2b to
~70% in an isolated branch/worktree — all wiring done and verified GREEN, review artifacts generated —
then STOP. The remaining ~30% (visual eye-tuning, re-bless, accepting the non-flipping neutral cta) is
the owner's, by approval, in the branch. Never re-bless, never merge.**

### Step 0 — Pre-flight context (READ THIS FIRST; do not guess-then-read — that burned time last session)
- **Memories:** `[[engine-spec-effort]]`, `[[neutral-generation-from-brand-hue]]`,
  `[[no-corrective-patch-layers]]`, `[[explain-before-engine-changes]]`,
  `[[product-boundary-and-identity-naming]]`, `[[feedback-rtk-caveman]]`.
- **Architecture you must NOT guess — open the files:**
  - Engine source is under `src/engine/` (NOT `src/` top-level). [last session guessed wrong here]
  - **How signals actually work** [last session guessed and had to backtrack — read before touching
    anything signal-adjacent]: canonical scales in `signals.ts` (named by identity
    red/yellow/green/info-color), built via `generateScale` in `resolve.ts` `SIGNAL_SCALES`. An
    OUTPUT-ONLY per-brand override layer in `signalShift.ts` (`pickSignalShift`) nudges
    yellow/green/info away from a colliding brand (yellow→lemon/macaroni; green/info swap a base hex).
    Signals carry `subtleChromaScale = subtleChromaBoost` (1.2–1.45) on stops 1–8. A signal's stop-9
    IS its highlight, and it also carries a `cta` that is a *duplicate* of that highlight
    (`figmaRender.ts` ~129, `build.ts` ~79) — the cta/highlight divergence is a DEFERRED decision,
    explicitly NOT part of 2b. Do not touch it.
  - **The neutral is already HALF-generated** (a prior committed session, not Radix-only): today
    `generateNeutralScale(tint?)` already generates a tinted neutral via a bespoke body (the `0.57`
    hardcode + `NEUTRAL_TINT_CURVE`); `neutralGroup`/`neutralRadixCss` already emit it; the demo +
    plugin still fall back to Radix families for non-branded. 2b *finishes* the move, it doesn't start.
  - The neutral's new curve already exists + colors owner-approved: `src/engine/neutralCurve.ts`.
  - Token mapping: `tokenNames.ts` — a `'brand'`-kind ramp maps stop9→`cta-1`, rung13/14→
    `highlight-1/2`, on-fill→`on-cta`. The new neutral is brand-kind.

### Step 1 — Scope check (BEFORE editing; do NOT blindly trust the order above)
Verify against the actual code that "2b-before-dark-mode" and the 6 wiring steps are still right:
(a) confirm the dark `darkChromaReduce` work would skip the current bespoke neutral (so the neutral
genuinely needs 2b first); (b) confirm the 6 steps in the **PAUSED — 2b** section still match the
code (no caller missed, no symbol moved); (c) confirm nothing in the dark-mode spec changes what the
neutral wiring should be. **If the order or the step list is stale, STOP and report — don't execute a
wrong plan.**

### Step 2 — Execute the wiring (the 6 steps in **PAUSED — 2b**, pre-approved in scope, minus re-bless)
In a branch/worktree. Reuse `generateScale`; value falls out of the pipeline; no bolt-ons. Run
`npm run typecheck` after each milestone. Invariant: **byte-identical for brand/secondary/signals**
until the neutral's new structure lands; then only the *neutral* output moves.

### Step 3 — Verify + produce review artifacts (this is the ~70% line, then STOP)
All gates green: `typecheck` · `audit` (dark) · `highlight-audit` · `figma:verify` · `plugin:build` ·
`demo:build`. Generate clean before/after **neutral swatches from the generated ramps directly** (NOT
the demo — it confounds via signal-shift), across representative hues × levels × light/dark. Then stop.

### STOP-and-present at — never cross these autonomously
- Any **re-bless** (highlight-snapshot, dark-audit) → owner visual sign-off only.
- Any **deviation** from the 6 steps, any **bolt-on** temptation (flag it, don't ship it), any surprise
  the scope check didn't predict.
- **Merging** — never. Leave it in the branch for review.

### Token discipline
Caveman-terse output. Delegate searches + 1–2-file edits to **cavecrew** subagents
(investigator → builder → reviewer) so the compressed results keep main-context lean. Don't re-read
files already summarized; don't narrate options you won't pursue.

## Process rules (carry forward — these caused friction when skipped)

- **Explain what/where/how before ANY engine change; wait for explicit "go."** Never decide
  engine/design unilaterally. (Re-confirmed ~4× this session.)
- **Reuse the generator; value falls out of the pipeline.** No bolt-on force/darken layers.
- **Read-only previews need no permission** — just run and show. (Generate ramps directly; the demo
  confounds via signal-shift, so prefer clean generated-ramp previews to the demo.)
- **Owner is visual** — render swatches/buttons to decide; abstract objectives are hard to judge.
- Re-bless blessed snapshots only with owner visual approval.

## Verification quickref

`npm run typecheck` · `audit` (dark) · `highlight-audit` · `figma:verify` · `plugin:build` ·
`demo:build`. Byte-identical is the invariant for new seams until a caller opts in.
