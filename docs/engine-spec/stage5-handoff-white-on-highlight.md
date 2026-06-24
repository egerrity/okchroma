# Handoff — holistic white-text-on-highlight fix (Stage 5)

Start here. This session's context got long and messy; this doc is the clean entry point.

## The objective

Make **"highlight fills carry white text, except yellow"** a single pipeline step the
value *falls out of* — instead of the four fragmented mechanisms it is today. This is
the actual goal; the whole engine-spec effort (Stages 0–4) was the prerequisite (you
can't tell a bug from intent without a trusted account of the engine).

Branch: **`scope/engine-spec`** — do NOT merge to `main`. Latest commit `f3e8cd2`.

## Read first (memory + spec)

- Memory: `[[product-boundary-and-identity-naming]]`, `[[engine-spec-effort]]`,
  `[[no-corrective-patch-layers]]`, `[[engine-color-rules]]`,
  `[[green-signal-white-text-followup]]`.
- The trusted spec is `docs/guide/` (README is the spine). Investigation record:
  `docs/engine-spec/stage1-code-truth.md`, `stage2-adjudication.md`, `stage3-doc-triage.md`.

## Rules to honor (these caused most of the churn this session)

- **Product = the engine and its OUTPUT** (emitted primitives → plugin/Figma/CSS). The
  **demo is only a preview.** When **labeling a token**, use its **real name**; **preview
  content** (mock dashboards/badges) can say anything.
- **Signals are named by identity**: `red / yellow / green / info-color` (NOT
  error/warning/success/info — renamed at the source this session).
- **No corrective patch layers** — the value must fall out of the pipeline, not be bolted on.
- **Repeat the ask back before acting; grep to prove completeness, never assert "done."**
- **Byte-compat posture**: holistic fixes MAY move output values *with owner visual
  approval* + re-blessed snapshots. NEVER touch the yellow / red-band intentional
  mechanisms (`creamGate`, `yellowLift`, rung-1, cool-render, etc.).

## State at handoff (committed on `scope/engine-spec`)

| commit | what |
|---|---|
| `bee6a69` | signals renamed to identity at the source (`signals.ts` + logic in resolve/collision/signalShift/cssRender; scripts; plugin; CSS regenerated; docs). Name-only, byte-identical output; CSS now matches the Figma path (drift gone). |
| `31588ca` | demo: signals render the full card; added temp "All generated colors" swatch grid under the palette. |
| `f3e8cd2` | demo: each signal its own card block titled by identity; swept invented labels ("High-alert/Med-alert/Positive"). |

Green: `npm run typecheck`, `figma:verify`, `plugin:build`, `audit`, `highlight-audit`.
Note: `demo/shared.tsx:289` `<Badge>Positive</Badge>` is **preview content, intentionally left**.

## The fix — white-on-highlight is enforced 4 ways today (fragmented)

Intent is uniform (white text on highlight, except yellow); the enforcement is not:

| ramp | highlight is… | enforcement today | source |
|---|---|---|---|
| brand / secondary | additive stop 13/14 | **correct** — `rung()` solves L down until white clears 4.5:1 (target 4.6), skips yellow | `colorEngine.ts:622-637` |
| signals (red/green/info) | the stop-9 fill | only **green** pre-darkens via a separate `enforceWhiteFill` flag; red/info rely on canonical L | `resolve.ts:43` |
| neutral | the stop-9 fill | L **hardcoded `0.57`** (mid-gray → white fails → black text) | `colorEngine.ts:740` |
| signal-shift path | swapped stop-9 fill | `enforceWhiteFill` NOT threaded → shifted green can render black (**confirmed bug**) | `signalShift.ts:77,90` |

on-highlight polarity = `!isYellow` at `colorEngine.ts:652`.

**Holistic direction:** promote the brand `rung()` mechanism (solve-L-to-hold-white-except-yellow)
to the single rule for **every** highlight fill — signals' stop-9, neutral's stop-9, and the
shift path — and retire the green-only `enforceWhiteFill`, the neutral `0.57` hardcode, and the
shift-path gap.

**What it moves (needs owner visual approval + re-bless):**
- neutral highlight `0.57` → darker (enough to hold white);
- red/info highlight → darken only if white doesn't already pass (likely small/none);
- yellow → unchanged (the exception).

## Verification surface

- Demo **Palette tab**: per-ramp full cards + the **"All generated colors — temp compare
  grid"** (rows = ramps, cols = stops); flip light/dark with the footer toggle.
  `npm run demo:build` then open `demo/index.html` (served from repo root).
- Value/contrast audits: `scripts/highlight-audit.ts` (`npm run highlight-audit`) is the
  white-on-fill / on-text-polarity checker; `scripts/dark-audit.ts` (`npm run audit`) for
  dark parity. Re-bless with `npm run audit:bless` only after confirming diffs are intended.

## Open question to resolve alongside

**Yellow warming on highlight/cta.** Owner suspects yellow's highlight/cta may not inherit
the warm-hue rotation. Finding so far: the brand highlight `rung` uses the **torsioned**
hue (`colorEngine.ts:627`), and signals get torsion through `generateScale`, so warming
*is* applied in principle — but confirm with **actual computed hues** for the yellow signal's
stop-9 (highlight) and its cta (= highlight duplicate) vs its accent stops. (The cta is an
alias of highlight via the cascade — see `build.ts` signal block — so it tracks highlight.)
