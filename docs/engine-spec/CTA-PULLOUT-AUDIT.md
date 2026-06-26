# CTA pull-out audit — where the cta/highlight confusion lives, and a plan

> Standalone discovery report (2026-06-26). NOT a fix — every change below needs owner "go"
> per the explain-before-engine-changes rule. Read-only fan-out across the engine + docs.
> Can be folded into [`CATALOG.md`](./CATALOG.md) later; kept separate by request.
> SSOT for the intended model stays [`ENGINE-SPEC.md`](./ENGINE-SPEC.md) §1–2.

## TL;DR

The cta was **renamed at the edge but never actually pulled out of generation.** The engine
still builds the archetype fill into the internal ladder's 9/10 slot, and the scale's own
emphasis rung (`highlight`) is bolted on as an additive extension — and **which internal slot
means "cta" vs "highlight" inverts per family.** That inversion is the root of the confusion
(it's what made me read storage-index 9 as the scale position).

The strongest single piece of evidence: four independent read-only investigators were each given
the *correct* model and still came back **disagreeing with each other** about whether internal
stops 9/10 are cta or highlight. When careful agents can't keep it straight from the code, the
code is the problem.

## Ground truth — internal stop index → role, per family

The naming map ([`tokenNames.ts:43-54`](../../src/engine/tokenNames.ts)) plus the generation
comments ([`colorEngine.ts:251-255`](../../src/engine/colorEngine.ts) and
[`colorEngine.ts:352-356`](../../src/engine/colorEngine.ts)) — both read directly — give:

| family | internal stop 9/10 holds | internal stop 13/14 holds | matches the model? |
|---|---|---|---|
| **brand / secondary** | **cta** (archetype fill) | **highlight** (scale rung, appended via `highlight:true`) | **INVERTED** — the off-scale cta squats in the scale's native slot; the scale's own rung is the bolt-on |
| **neutral** | **highlight** (scale rung) | **cta** (low-hierarchy gray fill, appended) | matches — highlight native at 9/10, cta pulled out |
| **signals** | **highlight = the fill** (no separate append; "a signal's stop-9 IS its highlight") | — | **collapsed** — one value plays both cta and highlight (CATALOG **C4**) |

The model ([ENGINE-SPEC.md](./ENGINE-SPEC.md) §1–2) wants this **uniform across every family**:
`highlight` is always the native scale rung at 9/10 (falls out of the curve like 1–8); `cta` is
always the separately-computed, off-scale, archetype-pinned value with no scale index. **Only
neutral currently does this.** Brands are inside-out; signals fuse the two.

Because the internal slot means different things per family, [`tokenNames.ts:52-54`](../../src/engine/tokenNames.ts)
has to flip the name of stop 9/10 on a `RampKind` switch (`'brand'` → `cta-1`, `'neutral'` →
`highlight-9`). That flip is the naming layer papering over the generation inconsistency — it is a
*symptom*, not the design.

### Why this matters beyond tidiness

`placeLegibleRung` (the highlight legibility value-move) "colonizes the scale's generation logic"
precisely **because** highlight is built as an off-scale bolt-on fill that then needs a correction,
instead of as a native scale rung whose value simply falls out of the curve. Fixing the structure
makes the enforcement strip (below) far cleaner — the two threads are linked.

## Enforcement inventory (the "anywhere something is enforced" sweep)

Sorted by the [ENGINE-SPEC §3](./ENGINE-SPEC.md) bolt-on test. "MOVE-for-text" = the layer moves a
*value* to hit a text/contrast target (the kind your homeostasis principle wants gone) vs. flips
polarity / optimizes hue / avoids a collision (legitimate).

### STRIP — text→fill feedback (value moved to satisfy a contrast target)

| where (line ≈ from audit, confirm before touching) | what | CATALOG |
|---|---|---|
| `colorEngine.ts:~440-446` | `enforceWhiteFill` — pre-darken light fill to the white-WCAG-4.5 edge so on-fill generates white (success signal) | **C3** |
| `colorEngine.ts:~570-573` (light), `~654-661` (dark) | `enforceOnFillContrast` — darken the fill (9/10) to the WCAG edge when APCA picks white but WCAG fails | see C5 note below |
| `colorEngine.ts:~692-714` | `placeLegibleRung` — binary-search the highlight rung's L until on-highlight clears WCAG 4.5 (**the big one**; inverts §4.1 "move the value via the curve, never force the text") | C10/C13-adjacent |
| `colorEngine.ts:~756-774` | `applyRedCoolRender` re-darkens the fill *after* the red-cool hue rotation — enforcement stacked on a hue-op | — |
| `signalShift.ts:~74,89` | signals pass `enforceOnFillContrast:true` into swap/lemon scales | C4 |
| `cssRender.ts` `on-highlight ?? true` | hardcoded white fallback | **C6** |

### ADJUDICATE — owner-blessed text-comfort floors (move-for-text, but you chose them)

| where | what | CATALOG |
|---|---|---|
| `stopTable.ts:128-132` | `DARK_STOP_9_MIN_L` (0.63) / `DARK_BRAND_FILL_MIN_L` (0.70) — dark fill L floors for on-fill text comfort | — |
| `signals.ts:~30` | per-signal `darkFillMinL` overrides (green/info 0.75/0.70) | — |
| `colorEngine.ts:~570-573` polarity flip *(not the value-move)* | choosing black vs white on the fill | **C5 = KEEP** |

> **The C5 divergence to resolve.** CATALOG **C5** marks the cta `enforceOnFillContrast` bound
> **KEEP**, but your updated memory says strip the "cta enforceOnFillContrast darken." These
> reconcile cleanly if we split the layer's two jobs: **keep** the *polarity decision* (pick
> on-text from the fill's luminance) and **strip** the *value-MOVE* (darkening the fill to hit
> WCAG). That's the whole homeostasis idea — render the fill, then read the text off it, with no
> feedback the other way. Needs your explicit call so C5 gets re-scoped rather than contradicted.

### KEEP — legitimate deviations (NOT text-enforcement)

- `darkChromaCurve.ts` `loudnessCap` / `YELLOW_L_LIFT` — Helmholtz–Kohlrausch hue-optimization (§3.2).
- `darkChromaCurve.ts` `FLOOR_FRAC` identity-proportional surface floor — architectural (§3.1).
- `stopTable.ts:143-144` `DARK_COLLIDER_MUTED` — collision-avoider salience split (§3.3).
- `darkCtaTrim` per-hue cta chroma trim — **C12 KEEP** (fix the stale comment only).

## Docs that make it worse (align to SSOT)

- `docs/guide/for-designers.md` & `README.md` — "emphasis fill is cta on brand, highlight on
  signal — same step 9/10, different name." Frames the split as *nomenclature*; per §4.2 they are
  *different fills*. (guide/* is known to lag — Phase 4.)
- `docs/guide/dark-mode.md` — "fills (step 9) keep hue/chroma and only lift" treats step 9 as one
  universal fill; it isn't (cta for brands, highlight for neutral).
- In-code comments that mislabel: [`colorEngine.ts:352-354`](../../src/engine/colorEngine.ts) calls
  the appended pair "highlight-9/10" (it's internal 13/14); [`stopTable.ts:40`](../../src/engine/stopTable.ts)
  "highlight … pulled out of cta" (highlight is the *scale rung*, not extracted from cta);
  [`tokenNames.ts:14-18`](../../src/engine/tokenNames.ts) loosely calls *both* cta and highlight
  "not scale steps" — the line that misled me.

## Proposed plan (each phase: explain → owner go → subtractive change → gate; expect red audits)

0. **Bless the model statement.** Confirm the per-family table above and the target ("highlight =
   native scale 9/10 for all families; cta = pulled-out off-scale for all families"). Resolve the
   **C5 split** decision. *(No code.)*
1. **Unify generation.** Make highlight the native 9/10 scale rung for brand/secondary too (falls
   out of the curve), and generate cta as a separate off-scale value for every family. Route signals
   through the scale so cta (loud) and highlight (quiet) diverge — this *is* CATALOG **C4**. Once
   uniform, delete the `RampKind` 9/10 name-flip in `tokenNames` (it becomes unnecessary).
2. **Strip the text→fill feedback** (STRIP table): remove `placeLegibleRung`'s value-move,
   `enforceWhiteFill`, and `enforceOnFillContrast`'s darken — keep only polarity selection. Compute
   `on-cta`/`on-highlight` from the fallen-out fill luminance (one rule — CATALOG **C1/C6**).
3. **Adjudicate the dark L floors** (ADJUDICATE table) against the bolt-on test, owner-by-owner.
4. **Fix docs** to the unified model (in-code comments now; guide/* at Phase 4).
5. **Re-bless** snapshots after owner visual approval on a dark background (CATALOG C21/C22).

## Method / confidence

- Verified by direct read: the per-family index→role table, the `tokenNames` map, the
  `GenerateOptions` flags (`highlight`, `enforceWhiteFill`, `enforceOnFillContrast`), the stopTable
  floors.
- From the read-only audit (line numbers approximate — **confirm before editing**): the exact
  `placeLegibleRung` / enforce-darken / `applyRedCoolRender` line ranges, and the signal generation
  details (the four agents conflicted on signals specifically — that path needs one careful read).
