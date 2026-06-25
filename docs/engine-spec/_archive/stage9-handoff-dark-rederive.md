# Handoff — dark-mode RE-DERIVE: verdict + holistic experiment plan (Stage 9)

**Verdict (owner, 2026-06-25): BACK TO EXPERIMENTAL.** Option D (the `darkChromaReduce`
terminal multiply) is rejected as a corrective bolt-on. Dark loudness will be handled
**inside dark chroma generation** so quietness falls out of the pipeline. This doc is the
experiment plan to derive that **holistically** — measure first, no hand-tuned curve.
Branch `scope/dark-chroma` (worktree `~/okchroma-dark`). Do NOT merge to `scope/engine-spec`
or `main` until the re-derive is reviewed + re-blessed.

## Why D was rejected (the review that triggered the verdict)
- D is a **terminal multiply on already-computed dark chroma** (`colorEngine.ts:393-396`,
  post-`cAt`/post-`applyChromaFloor`) — the forbidden corrective-layer shape
  ([[no-corrective-patch-layers]]). "Seam, byte-identical-off" doesn't change that **every
  recommended brand opts in** (`resolve.ts:129`); in production it's a global post-hoc
  correction carrying ~6 hand-tuned constants (`darkReduce.ts`).
- It layered on the **un-reopened** dark stack — floors + the class-D cliff
  (`colorEngine.ts:409-415`), fill L-lift, `coolRedDark`, collider ×0.55, magic-4.6 — all
  filed **UNRESOLVED** in `stage2-adjudication.md:23-25`, yet treated as fixed scaffold.
- Its **exemption** model (neutral, collider-fill, rung) hid a real bug: the dark rung
  `darkHlC` (`colorEngine.ts:691`) builds from **full `brandC`** while light uses moderate
  `HIGHLIGHT_LIGHT.baseC` (`:654`) → dark highlight is the **loudest** token (magenta rung
  0.142→0.258, above its own dark fill 0.189). It was exempted on a FALSE "it's moderate like
  light" assumption. Per-token exemptions are where wrong assumptions hide.
- The "**0.99× mean → purely perceptual**" premise is a mean over fills that hides the rung
  AND the true cause below.

## Root cause — the chroma MODEL mismatch (Lever 1)
| | light | dark |
|---|---|---|
| stops 1–8 chroma | **absolute** `LIGHT_BASE_C` ladder (caps 0.112) blended to gamut envelope (`colorEngine.ts:536-538`) | **brand-proportional** `subtleC × chromaMultiplier` (`:604`, `stopTable.ts:57-84`) |
| fill 9/10 | `brandC`, vivid already capped upstream by the ladder | **full `brandC`**, L-lifted only |
| vivid brand | CAPPED by the ladder | rides full chroma up the ramp |

Light caps vivid brands; dark doesn't. That is **structural** loudness, not perception — and
the natural place a holistic fix lives.

## Stage-2 §C over-bless (re-adjudicate honestly during the experiment)
`stage2-adjudication.md:32` blessed "**cta** brand-true" OFF-LIMITS — but
`stage1-code-truth.md:127-129` marks cta `[unresolved-pending-spec]` ("real role, or a patch
around a too-light ladder?") and stage2:43-47 *itself* flags the cta/highlight asymmetry
OPEN. Same over-claim covers the red-band/collider/`coolRedDark` cluster (stage1 "uncertain"
→ stage2 "off-limits"). **Do not inherit §C as untouchable.**

## The experiment — two levers, both INSIDE generation, data-ordered
- **Lever 1 — structural:** give dark the **same chroma structure as light** (absolute ladder
  + envelope blend), so dark can't ride full `brandC` where light can't. Measure how much
  loudness this alone removes.
- **Lever 2 — perceptual residual:** whatever loudness **remains** after the models match is
  the true perceptual glow. Solve the dark ladder values for **perceptual parity with the
  light sibling**, so the hue asymmetry (blue/violet cut hard, yellow/green spared) **falls
  out of an appearance model**, not a hand-drawn cosine.

No terminal multiply. No per-token exemptions: rung, fill, signals, collider all solve through
the same rule (collider's muted offset applied to chroma *before* the solve; rung uses light's
moderate construction — killing that bug). Legitimate dark behaviors become **constraints on
the solver, not separate patches**: fill visibility floor, text contrast (11/12), red↔error
collider separation.

## Phases
**A — Instrument & baseline** (read-only / additive scripts; NO engine change).
`scripts/dark-loudness-probe.ts`, reusing the fleet + engine primitives. Per scale × 24 stops
× mode dump: L,C,H · gamut headroom `C / maxChromaAt(L,H)` · **CAM16 colorfulness M** under
mode-correct surround (Yb from app-bg L≈0.18 dark / paper 0.99 light) · **Helmholtz–Kohlrausch**
brightness boost · cross-mode role-matched ratio. Output JSON/CSV + a **dark-canvas** visual
(extend `dark-swatches.ts`). Plus a synthetic 120-hue sweep (reuse `gamut-sweep.ts` pattern)
for a fleet-independent per-hue picture.

**B — Diagnose + VALIDATE the metric against the eye** (the gate that makes it holistic).
Decompose the bogus 0.99× into a per-hue/per-stop *perceived* map. Then render a small ranked
set on dark canvas and confirm CAM16/H-K ranks loudness the way the **owner** perceives it.
Match ⇒ derivation rests on a standard model (no magic numbers). Fail ⇒ fall back to a target
fit directly to owner swatch-rankings. **The whole derivation rests on this validation.**

**C — Derive the generation rule** (engine change → GATED by [[explain-before-engine-changes]]).
Target dark chroma per stop/hue = perceptual parity (posture decided from data, Phase B/C).
A dark chroma derivation mirroring light's structure, values **solved** from the perceptual
target — replacing `subtleC × chromaMultiplier` + `applyChromaFloor` + the D multiply. Present
the derived rule + sites; get explicit go before editing `colorEngine.ts`.

**D — Review, re-adjudicate, re-bless** (owner gates). Dark-canvas ramps + buttons + real demo,
derived-vs-light-vs-old side by side, **both postures** (match / ceiling) for the eye. Then the
honest re-adjudication of stage-2 §C + the missing cross-mode/role-rule sweep. Then re-bless
`scripts/dark-audit-snapshot.json` + `scripts/highlight-snapshot.json` on owner visual approval.

## Resolved forks (owner, 2026-06-25)
- **Parity posture: DECIDE FROM DATA** — render match AND ceiling (dark ≤ light) on dark
  canvas; owner picks by eye in Phase B/C.
- **Metric basis: APPEARANCE MODEL, eye-validated** (CAM16/H-K; surround = actual bg
  luminance, a physical input). Empirical fit only if validation fails.

## Reuse (don't reinvent)
- Fleet: `src/brands.ts` (33) + `src/secondaries.ts` + `src/engine/signals.ts` (red #E54D2E /
  yellow #FFC53D / green #46A758 / info-color #6E56CF).
- Measure pattern: `scripts/dark-audit.ts` (snapshot = 24 `[L,C,H]`/scale; metrics A–F),
  `scripts/gamut-sweep.ts` (120 hues × 5 L × 3 C envelope), dark-canvas `scripts/dark-swatches.ts`.
- Primitives: `generateScale` (colorEngine), `maxChromaAt`/`makeStop`/`hexToOklch` (colorEngine,
  not yet exported — re-export or wrap), `wcagY`/`contrastRatio`/`apcaY`/`apcaLc`/`findLForY`/
  `clampChromaToGamut` (constraints.ts). Worktrees: run with `node_modules/.bin/esbuild`.

## Cleanup folded into the re-derive
- **Unwind the rejected D wiring**: revert `darkChromaReduce` from `resolve.ts` (floor +
  `SIGNAL_SCALES`) + `signalShift.ts`, and the `darkCAt`/`fillCAt` wrappers + `darkReduce.ts`
  seam — so the branch stops carrying a verdict-rejected approach. **Keep** the measurement
  harness + `darkCurves.ts` exploration registry (now repurposed for the probe).
- **Land the rung de-bolt-on**: `darkHlC` → light's `baseC` construction (correct regardless;
  removes a cross-mode divergence and the rung exemption need).

## Out of scope (decided — do not touch)
Lightness (fill L-lift, dark roots), hue (gold-spine torsion, red-cool). The re-derive is
**chroma-only**, consistent with "lightness left alone."

## Gates (carry forward)
Explain any engine change + get explicit go ([[explain-before-engine-changes]]). No bolt-on
corrective layers ([[no-corrective-patch-layers]]). Dark review on a dark canvas only
([[dark-mode-on-dark-bg]]). Re-bless only with owner visual approval. Caveman-terse working
output; deliverables human-readable ([[feedback-rtk-caveman]]).
