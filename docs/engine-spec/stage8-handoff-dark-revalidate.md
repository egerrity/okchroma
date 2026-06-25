# Handoff — dark-mode re-validation: formal sweep → aggressive review → verdict (Stage 8)

**Start here.** The dark-mode chroma reduction (option D) is wired and all-gates-green on
`scope/dark-chroma` — but owner review caught a real bug the original bolt-on sweep **missed**, which
means the implementation can't be trusted on the sweep's say-so alone. This handoff **pauses at a
decision gate**: re-sweep with new lenses, aggressively review the plan + implementation, then get an
owner **verdict — proceed, or go back to the experimental phase.** Do NOT ship/merge the dark work
until that verdict. Branch `scope/engine-spec` is the integration branch; do NOT merge to `main`.

## TL;DR — the ordered plan for the next session
1. **Read first:** this doc + memories `[[dark-mode-chroma-reduction]]`, `[[engine-spec-effort]]`,
   `[[engine-color-rules]]`, `[[no-corrective-patch-layers]]`, `[[explain-before-engine-changes]]`,
   `[[dark-mode-on-dark-bg]]`, `[[product-boundary-and-identity-naming]]`, `[[feedback-rtk-caveman]]`.
2. **Task 1 — Formal bolt-on RE-SWEEP** (a blind Workflow, one agent per engine area, like Stage 1) —
   but with **TWO NEW LENSES** the old sweep lacked (see Task 1). Goal: find siblings of the rung bug.
3. **Task 2 — Aggressively review** the `scope/dark-chroma` plan + implementation (adversarial).
4. **Task 3 — VERDICT (owner):** proceed with the proposed fix on the current implementation, OR go
   back to the experimental phase and re-derive. **Stop and ask — don't assume proceed.**
5. The **proposed fix** (the dark rung) is in §"Proposed fix" — **gated behind the verdict**, do not
   apply it before Task 3.

## Where the tree is — 3 branches off `scope/engine-spec`, all flat (one-level merges)
| branch / worktree | what | state |
|---|---|---|
| `scope/engine-spec` (`~/okchroma`) | 2b neutral generation **merged** | integration branch |
| `scope/signal-cta` (`~/okchroma-sigcta`) | signal-cta per-brand tracking fix | green, ready to merge, **independent of dark work** |
| `scope/dark-chroma` (`~/okchroma-dark`) | dark-mode D: seam + 4 options + wiring + re-bless | **green but UNDER REVIEW (this handoff)** |

`scope/dark-chroma` commits: `0ac1d41` seam (byte-identical) · `301bc53` 4 options + harness · `6502761`
by-option/button swatch view · `068921b` collider×D view · `7641459` **wire D into fleet** · `068921b`…
Worktrees use a `node_modules` symlink to `~/okchroma`; run gates with `node_modules/.bin/esbuild`.

## What yesterday's audits found — summary (so the next session has it)
The engine-spec effort ran a **Stage-1 code-truth + bolt-on sweep** (`docs/engine-spec/stage1-code-truth.md`,
a blind Workflow, one agent per engine area) and a **Stage-2 owner adjudication**
(`docs/engine-spec/stage2-adjudication.md`). Net result: **the code is a trustworthy spec base** (old
repo not needed). The sweep classified everything into:
- **Confirmed fixes** (real bugs): `enforceWhiteFill` not threaded into signal-shift; `radixNeutralCss`
  numeric token names; `on-highlight ?? true` fallback.
- **Spec decisions** (decide in-context, NOT bolt-ons): the white-enforcement mechanism fragmentation;
  neutral `0.57` hardcode; **dark-mode floors (brand 0.70 vs signal 0.63; per-signal `darkFillMinL`)**;
  `lemonScale` forced-light archetype; the magic-4.6 target; manual unrolled enforce passes (11/12,
  highlight); the 0.0399/0.0401 dark chroma cliff.
- **Intentional, off-limits:** yellow machinery, the red-band cluster (rung-1, cool-render, `coolRedDark`,
  collider), cta brand-true behavior, single un-flipped dark mode.
- **Structural question flagged:** the **cta/highlight asymmetry** ("highlight in every palette, cta not
  in signals; both are roles, never describe by stop number — address head-on, don't paper over").

**The blind spot (this is the point of Task 1):** the sweep checked **per-area behavior + corrective-patch
smell**. It did NOT apply **(a) cross-mode (light vs dark) consistency** or **(b) does this token obey its
own stated role rule**. So a deliberate-looking, commented, single-line parameter choice that makes dark
diverge from light — and contradicts a stated rule — sails straight through. That's exactly what happened
with the rung (below). `stage1-code-truth.md:60` even documents the rung, but only by its white-enforcement
("4-pass L-darkening loop"), and glossed the chroma source. Stage-2 didn't list it at all.

## The finding that triggered this handoff — dark highlight-rung BOOST
- `colorEngine.ts` `darkHlC` (~L691) builds the **dark** highlight rung chroma from **full `brandC`**
  ("saturated like the dark fill"). The **light** rung uses a fixed moderate `HIGHLIGHT_LIGHT.baseC`.
- Measured rung chroma, light → dark: **magenta 0.142 → 0.258** (higher than its own dark fill, 0.189!),
  blue 0.142 → 0.233, red 0.150 → 0.234 (≈1.6–1.8×). So the dark highlight is the **single most-saturated
  token in the dark ramp** — louder than light, and it **contradicts the engine's own rule** (`[[engine-color-rules]]`:
  *highlight is a predictable moderate value; the vivid color lives in the cta*).
- The dark-mode work then **compounded** it: the dark spec (`dark-mode-chroma-reduction-spec-v1.md:71`)
  recommended **exempting** the rung from the reduction, calling it "darkened-to-hold-white identity
  machinery" — which assumed the dark rung was moderate like light. It isn't. The exemption baked that
  wrong assumption in, so D quieted everything *around* the rung and left it as the loudest element.

## Proposed fix — GATED behind the Task-3 verdict (do not apply before it)
1. **Dark rung uses the LIGHT rung's moderate `baseC` construction** (not `brandC`), so the highlight is
   the predictable quiet value in *both* modes — honoring the role rule by construction, and making the
   "exempt the rung from D or not" debate moot (a moderate rung doesn't need the cut).
2. **Keep D on signals** — owner reviewed and *likes* the signal treatment ("info colors look closer to
   right, behave consistently"). Do NOT exempt signals. (Note: the original "loud yellow signal" was a
   *lightness* effect (the fill lift), which we deliberately don't touch — but the owner is fine with the
   signals as they render under D, so leave them.)
3. Re-bless highlight-snapshot after the rung change (brand/secondary dark rung 13/14 move; dark-audit
   stops 1–12 and the neutral don't).
**Also still open from the dark work:** the dark enforce-contrast rebuild now solves against the reduced
chroma (`7641459`) — re-verify it under the rung fix.

## Task 1 — Formal bolt-on RE-SWEEP (the deliverable the owner asked for FIRST)
Run it like Stage 1 — a **blind Workflow, one agent per engine area** (`colorEngine` light path,
`colorEngine` dark path, `resolve`, `signalShift`, `collision`, emission/`cssRender`+`figmaRender`,
`stopTable`/archetypes) — but each agent applies the **two lenses the old sweep lacked**, on top of the
old "corrective-patch smell":
- **Lens A — cross-mode consistency:** for every token/stop, does the **dark** construction diverge from
  the **light** one in a way that makes dark louder / off-character (different chroma source, different
  boost, a swap with another role)? The rung is the known instance; find siblings.
- **Lens B — role-rule consistency:** does each token obey its **own stated role rule** (e.g. "highlight =
  moderate, vivid lives in cta"; "cta = brand-true"; "neutral = light archetype")? Flag any stop whose
  code contradicts its documented role.
Output: a classified list (bug / spec-decision / intentional) **with the lens that caught it**, so the
owner can adjudicate (a Stage-2-style gate). Seed each agent with `stage1-code-truth.md` + `stage2-adjudication.md`
so it doesn't re-report known items — only NEW cross-mode / role-rule findings.

## Task 2 — Aggressively review the plan + the implementation
Adversarial review of `scope/dark-chroma`, assuming the sweep's blind spot may have hidden more:
- **The seam** (`darkReduce.ts`, `darkChromaReduce`/`darkCAt`/`fillCAt` in `colorEngine.ts`): is it
  byte-identical when off? is the chroma-aware input (`dark[8].C`, post-cAt) the right signal? does the
  collider-fill exemption and the enforce-contrast-on-reduced-chroma change hold under all hues?
- **The curve (D)** + the depths: is "loudness is perceptual (mean dark/light fill chroma 0.99×)" actually
  the right framing, or does it deserve another look given the rung finding?
- **The wiring** (`resolve.ts` floor + `SIGNAL_SCALES` + `signalShift.ts`): right sites? exact-mode gating
  correct? anything double-applied?
- **The re-bless** (57 dark scales): re-derive that it's only the intended reduction, no collateral.
- Use the **dark-canvas, by-option, button** swatch view (`scripts/dark-swatches.ts` → `dist/dark-swatches.html`)
  and the real demo on a **dark background** (never white — `[[dark-mode-on-dark-bg]]`).

## Task 3 — VERDICT (owner gate — STOP and ask)
Given the sweep + review, the owner decides:
- **Proceed:** apply the proposed rung fix on the current implementation, re-bless, then it's mergeable.
- **Back to experimental:** the rung bug + any siblings undermine confidence in the D approach as wired →
  re-open the experimental phase (re-derive the dark treatment, possibly rethinking exemptions/curve)
  before any fix. **Do not assume proceed.**

## Process rules (carry forward)
Explain any engine change + get explicit go before doing it (`[[explain-before-engine-changes]]`). No
bolt-on corrective layers — value falls out of the pipeline (`[[no-corrective-patch-layers]]`). Dark-mode
review visuals on a dark canvas only. Owner is visual — render swatches/buttons to decide. Re-bless only
with owner visual approval. Caveman-terse working output; delegate searches/edits to subagents.
