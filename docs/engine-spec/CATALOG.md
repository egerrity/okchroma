# CATALOG — problems found during the engine unification

> Running list of defects / open decisions surfaced **while executing** the
> ENGINE-SPEC phases. We do **not** fix these piecemeal — they're batched and
> resolved **holistically** so the engine stays coherent. When you find a
> problem mid-phase, **log it here and keep moving**; don't inline-fix it.
>
> Ground each problem statement against [`ENGINE-SPEC.md`](./ENGINE-SPEC.md)
> (the design SSOT, **LOCKED**). This file is the found-issues tracker, **not** a
> design doc. If code contradicts the spec, the **code** is the problem.
>
> **Status:** OPEN (needs decision/fix) · RESOLVED (done — note the commit).
> **Grouping ≠ execution order.** Order is a separate decision (see each entry's *Deps*).
>
> ⚠️ **Line numbers are approximate** — C2–C23 were assembled by a fan-out audit whose
> refs run a few lines off the live file. **Re-grep before editing.** Verified-live anchors
> in `colorEngine.ts`: `subtleC ~:384`, `fillAnchorL ~:411–414`, on-cta `~:535–546` (light) /
> `~:619–620` (dark), on-highlight `~:670` (light) / `~:685` (dark).

## Index
| ID | Title | Kind | Drift | Conf |
|---|---|---|---|---|
| C1 | `ons` polarity = two rules (on-cta vs on-highlight) | change-to-fall-out | ✓ | high |
| C2 | `subtleChromaScale`/`subtleChromaBoost` per-signal subtle boost | remove-bolt-on | ✓ | high |
| C3 | green's `enforceWhiteFill` forced light-fill darken | remove-forced-layer | ✓ | high |
| C4 | signal cta = highlight duplicate (signals not through the scale) | remove-bolt-on | — | high |
| C5 | `enforceOnFillContrast` WCAG bound on cta fill | **KEEP** | — | high |
| C6 | `on-highlight ?? true` forced-white fallback (cssRender) | change-to-fall-out | ✓ | high |
| C7 | two dark-chroma models split by family (curve vs `applyChromaFloor`) | remove-bolt-on | ✓ | high |
| C8 | dark fill-L lift-floor competes with `DARK_NEUTRAL_L` 9/10 scaffold | drift | ✓ | med |
| C9 | figma-verify asserts signal cta == highlight | guard-rebless | — | high |
| C10 | highlight-audit asserts retired forced on-highlight + "no rung" | guard-rebless | ✓ | high |
| C11 | `darkColliderFill 'muted'` rose register (red dark collision) | **KEEP** | — | high |
| C12 | `darkCtaTrim` per-hue cta trim (contradicts a stale comment) | **KEEP** | ✓ | med |
| C13 | dark highlight rung on a light-derived chroma model | drift | ✓ | high |
| C14 | `signalYieldShift`/`SIGNAL_SHIFT_CAPS`/`YIELD_DIRECTION` dead dup | remove-bolt-on | ✓ | high |
| C15 | `preventiveHueShift`/`brandShearMaxDeg` deprecated dead shear | remove-bolt-on | ✓ | high |
| C16 | yellow warning decision computed twice (split const `96` ×2) | drift | ✓ | high |
| C17 | red rung-1 + yellow lemon/macaroni + yieldChromaScale avoiders | **KEEP** | — | high |
| C18 | neutral inert `enforceOnFillContrast` + dead `EXT_NAMES` 15/16 | remove-bolt-on | ✓ | high |
| C19 | neutral on-highlight universally white via brand rung 0.62 | drift | ✓ | med |
| C20 | stale "forced ons" comments (white-except-yellow / black-flip) | drift | ✓ | high |
| C21 | dark-audit consumes C1 polarity + tolerances tuned to old chroma | guard-rebless | — | med |
| C22 | blessed snapshots encode pre-unification fleet; byte-identity gap | guard-rebless | — | med |
| C23 | COVERAGE GAP — no guard asserts one shared `ons` rule | guard-rebless | ✓ | high |

---

## Triage board (checked off as fixes are recorded — entries flip to RESOLVED only on execution)

> Convention: an entry's **Status stays OPEN until the fix is reviewed *and* executed.** This board
> tracks *cataloging* progress — which items have a recorded engine-route fix pending joint review.

**Fixes recorded (pending joint review):**
- [x] **F1** — signal route → **C2, C3, C4, C7** (guard **C9** rides with it)
- [x] **F2** — dark highlight rung onto the curve → **C13**
- [x] **F3** — `ons` one-rule (same polarity rule for cta + highlight, both modes) → **C1, C6, C23, C20, C10**
- [x] **F4** — delete dead/inert code → **C14, C15, C18**
- [x] **F5** — single-source yellow lemon/macaroni → **C16**

**Owner-visual decisions (not mechanical fixes):** rung-L value · **C8** (dark-cta-L) · **C19** (neutral rung intent).
**Verified keeps (no action, re-verify on execution):** **C5, C11, C12, C17.**
**Execution-time only (re-bless under owner approval):** **C21, C22** (+ the C9 guard re-bless).

**✅ Triage complete — all of C1–C23 bucketed: 5 fixes (F1–F5) · 3 decisions · 4 keeps · 2 re-bless.**

---

## Drift from the handoff intent (the "things that fell out")
The handoff landed the spec and the engine half of computed on-highlight, but **four named §4
changes plus a layer of supporting drift never landed**, and several pieces quietly diverge from
§1–§4. The core pattern: **the engine increasingly computes/derives values while the render layer,
the audits, the comments, and the whole signal path still encode the retired forced/fixed/per-family
model — so the two halves contradict each other.**

1. **One `ons` decision, three formulas** — on-cta (APCA+WCAG-flip) vs on-highlight (pure-APCA) vs dark (black-first <45). C1, extended by C6/C20/C23.
2. **Signals are still a parallel family** — they skip `highlight:true` and the dark curve, so cta is a render-time duplicate of the fill (C4); subtle tier runs a bespoke per-signal boost (C2); dark chroma rides legacy `applyChromaFloor` while brands ride the greenfield curve (C7); dark fill L is a hand-set per-signal ladder outside the continuous loudness cap (C8).
3. **Forced corrective layers survive where the spec says values fall out** — green's `enforceWhiteFill` (C3); cssRender's `on-highlight ?? true` (C6).
4. **Guards assert the bolt-ons** — figma-verify `cta==highlight` (C9); highlight-audit forced-white/black + no-rung (C10) — a green test masks the drift; nothing guards the one-shared-`ons` rule (C23).
5. **Smaller divergences** — dark highlight rung on a light-derived chroma model (C13); `darkCtaTrim` vs the "fill keeps brandC identity" comment (C12); blessed `0.66/0.72` dark fill scaffold unwired (C8); neutral borrows the brand rung's 0.62 so "universally white" is incidental (C19) + inert flag/dead map (C18); two dead duplicate signal engines (C14, C15); the yellow warning decision computed twice with two copies of `96` (C16); stale comments still teach the forced model (C20).

Legit §3 collision-avoiders and hue-optimizations are intact and **kept**: C5, C11, C12, C17.

---

## Entries

### C1 — `ons` polarity computed by two different rules (on-cta vs on-highlight)
**Kind:** change-to-fall-out · **Drift:** ✓ · **Conf:** high · **Surfaced:** Phase 1 step 1
**Where:** on-cta APCA pick `colorEngine.ts:417`, WCAG-bound flip `:535`, dark `:620`; on-highlight `onHighlightIsWhite/Dark` in the `if (opts?.highlight)` block (`~:670` light, `~:685` dark).
**Problem.** on-cta = APCA pick **then a WCAG bound** (flips white→black when white fails 4.5 and black passes). on-highlight = pure-APCA, no bound. Dark on-cta uses a third "black-first <45" threshold. Three formulas for one logical `ons` decision — same fill, different answers.
**Spec.** §1 (ons one group, computed, falls out); §4 item 1.
**Why.** One computation for every `on-*` is the core of the unification; two rules ship a sub-4.5 on-text a cta never would, and duplicated logic drifts.
**Blast radius.** Signals have no rung today, so they don't hit this yet; the moment they route through the scale (C4) they inherit on-highlight's pure-APCA rule. Resolve the one-rule fix before/with signal routing.
**Direction (not committed).** Extract on-cta's polarity resolution into ONE shared function (APCA pick + WCAG-bound flip) both call; polarity-only (the value-darken half stays separate — C5).

### C2 — `subtleChromaScale` / `subtleChromaBoost` — bespoke per-signal subtle-tier chroma boost
**Kind:** remove-bolt-on · **Drift:** ✓ · **Conf:** high
**Where:** `signals.ts:28-30` (field), `:44/:54/:56/:59` (red 1.2 / yellow 1.45 / green 1.3 / info-color 1.0); `resolve.ts:44`; `signalShift.ts:74,:88`; `colorEngine.ts` opt `~:307` → `subtleC = brandC * (subtleChromaScale ?? 1)` `~:384` → flows into stops 1-8, the cream envelope (`brandSat`), and the highlight ladder (`hlLadderC`); `cAt` has no `heat` term `~:386`; `stopTable.ts:67-73` comment narrates the dark-side use.
**Problem.** Each signal multiplies its subtle tier (stops 1-8) chroma — and via the same `subtleC`, the cream envelope and the highlight rung — by a per-signal constant so alerts "read hotter." Wired INTO base generation, so signals do **not** run the identical base scale. `info-color = 1.0` (no-op) proves it's hand-tuned per color. The §4.4 replacement (optional `heat` in `cAt`, default off) **does not exist** — plan and code disagree.
**Spec.** §4.4; §1 (scale identical across families); §3.1 (loudness is the cta's job).
**Why (bolt-on test).** Not §3.1/§3.2/§3.3/§3.4 — keyed per-family with distinct constants. Named verbatim in §4.4 for removal.
**Direction (not committed).** Delete the field + 4 values; stop passing it (resolve:44, signalShift:74,88); stops 1-8 / cream / rung read `brandC`/`v`/`brandSat` directly. If "alerts run hotter" survives review, reintroduce as ONE optional `heat` in `cAt` (default 1). Reconcile `stopTable.ts:67-73` comment.
**Deps.** 4 call sites; couples to C4 (signals through scale) and C7 (dark chroma fork). Re-bless signal snapshots; brand/secondary canary unaffected.

### C3 — green's `enforceWhiteFill` — per-family forced light-fill darken to manufacture white on-cta
**Kind:** remove-forced-layer · **Drift:** ✓ · **Conf:** high
**Where:** `resolve.ts:44` (`enforceWhiteFill: def.name === 'green'`); `colorEngine.ts` opt `~:330-338`, `fillAnchorL` darken branch `~:411-414`, narration `~:407-410` + `~:530-533`; swap/lemon variants (`signalShift.ts:72-92`) do **not** pass it.
**Problem.** For green only, the light fill is darkened (to the 4.6 edge) **before** on-cta polarity is read, so APCA lands white "naturally" and the flip-to-black branch never fires. A fill VALUE move whose sole purpose is to force on-cta = white. Also inconsistent within green: canonical gets it, swap/lemon don't.
**Spec.** §4.3 (retire; `enforceOnFillContrast` still bounds); §1/§7 (ons falls out, no forced layers).
**Why (bolt-on test).** Per-family conditional keyed to `def.name === 'green'` — none of the four categories. The forced-outcome pattern §1/§7 forbid.
**Direction (not committed).** Delete option + branch + comments; green's on-cta computes from the raw fill. Keep `enforceOnFillContrast` (C5) as the WCAG bound. If green must land white, move the fill VALUE via the curve.
**Deps.** `fillAnchorL` precompute + the light9L block; couples to C5 (KEEP) and C1.

### C4 — signal cta = highlight duplicate (signals not routed through the scale)
**Kind:** remove-bolt-on · **Drift:** — · **Conf:** high
**Where:** `resolve.ts:38-46` (SIGNAL_SCALES omits `highlight:true`); `figmaRender.ts:104` (`'neutral'` kind), `:108-110` (`cta-1=highlight-1`, `cta-2=highlight-2`, `on-cta=on-highlight`); `build.ts:49-51` (same alias); comments `figmaRender.ts:105-107` + `build.ts:45-48`.
**Problem.** SIGNAL_SCALES is built without `highlight:true`, so signals never get the highlight-13/14 rung. At render, both emitters synthesize a brand-kind cta by aliasing it byte-identical to the only fill the signal has (stop 9). cta and highlight forced equal in two emitters — one value masquerades as both.
**Spec.** §4.2 (route signals through the scale; cta=loud archetype, highlight=rung, they **diverge**); §1; §5 Phase 2.
**Why (bolt-on test).** Render-time aliasing that invents a per-family token by copying another — not scale generation, none of the four categories. The §4.2 duplicate.
**Direction (not committed).** Route SIGNAL_SCALES (+ swap/lemon) through `generateScale` with `highlight:true`; render signals brand-kind with a loud archetype cta (a `loudCta` flag keeps the dark cta full-chroma); delete the figmaRender/build aliases.
**Deps.** figmaRender + build (twin aliases) + cssRender; signalShift needs `highlight:true` + `loudCta`. **Exposes C1** for every signal. Inverts C9/C10 assertions. Signal entries grow 24→28 stops → re-bless.

### C5 — `enforceOnFillContrast` — WCAG compliance bound on the cta fill (**KEEP**)
**Kind:** keep-verified · **Drift:** — · **Conf:** high
**Where:** `colorEngine.ts` light9L darken `~:535-546`, dark rebuild `~:625-632`; `fillAnchorL ~:411-414`; `applyRedCoolRender` re-applies `~:715-723`; set by `resolve.ts:123` (brands, !exact), `resolve.ts:44` + `signalShift.ts:77,90` (signals); opt comment `~:328-329` ("brands TBD").
**Problem/Status.** When on-cta is white but the fill fails WCAG 4.5, the fill (9/10) darkens to the 4.6 edge. A corrective value move on the **fill** (not the ons). The "brands TBD" comment admits inconsistent per-family application.
**Spec.** §4 item 3 explicit keep ("`enforceOnFillContrast` still bounds compliance"); C1.
**Why KEEP.** Spec preserves it; bounds the fill, not the ons — not the forbidden forced-text layer. Logged as KEEP so the §4 sweep doesn't mistake it for a bolt-on.
**Direction (not committed).** Keep as the compliance bound; ensure C1's unified `ons` reuses **this** bound, not a second divergent one; resolve "brands TBD" so enforcement is uniform. Keep `applyRedCoolRender`'s duplicate darken consistent with C1.
**Deps.** Tied to C1 and C8 (third actor mutating dark fill L).

### C6 — `on-highlight ?? true` forced-white fallback (cssRender)
**Kind:** change-to-fall-out · **Drift:** ✓ · **Conf:** high
**Where:** `cssRender.ts:35` (`onColor(onHl ?? true)` in `brandKindBody`); `figmaRender` on-highlight path `~:60/:94-96` has **no** `?? true` (emitters disagree).
**Problem.** Defaults on-highlight polarity to WHITE whenever the engine value is undefined. Dead today (brand/secondary/neutral all pass `highlight:true`) but a forced default waiting to fire — and §4.2 routes signals here, where a missing rung is exactly the bug this would mask.
**Spec.** §1; §4 item 1; §7.
**Why.** A hardcoded WHITE default — the forced-polarity pattern C1 targets. Folds into C1; logged separately as a discrete render-side removal.
**Direction (not committed).** Drop `?? true`; on-highlight comes straight from the computed flag; treat undefined as a hard error. Align figmaRender + cssRender defaults. Fold into C1.
**Deps.** Shared via `brandKindBody`; part of C1. Removable once signals have a real rung (C4).

### C7 — two competing dark-chroma models, split by family (curve vs `applyChromaFloor`)
**Kind:** remove-bolt-on · **Drift:** ✓ · **Conf:** high
**Where:** `colorEngine.ts` dark-stop ternary `darkChromaCurve ? curve(L,H,brandC) : applyChromaFloor(subtleC, chromaMultiplier, i, darkFloorStrength)` `~:594-615`; brands pass curve (`resolve.ts:129`), signals do **not** (`resolve.ts:44` + `signalShift.ts:73-91`); `applyChromaFloor` + `DARK_FLOOR_*` `~:273-288`, `darkFloorStrength` `~:397-400`; `darkStops`/`ACCENT_DARK_STOPS` rootL columns vestigial — `stopTable.ts:56-83/:93`.
**Problem.** Brands run the new absolute curve (`brandC·shape(L)·cap(L,H)`); signals fall to the OLD proportional path (`applyChromaFloor` + `chromaMultiplier` + subtleChromaBoost). Same engine, two dark-chroma rules selected by caller — a signal and a brand of the same hue get different dark surface chroma. The legacy branch + 16 dead rootL numbers survive only to feed it. *(NB: no `darkReduce.ts` exists — the real second layer is `applyChromaFloor`.)*
**Spec.** §2 (dark chroma = ONE curve for every family); §3.1; §4.4.
**Why (bolt-on test).** A per-family dark-chroma fork — none of the four categories. Vestigial transitional state.
**Direction (not committed).** Route signals (+ swap/lemon) through `darkChromaCurve` (F1); then `applyChromaFloor` + `DARK_FLOOR_*` + the rootL columns go dead and can be deleted; drive the dark loop off `DARK_NEUTRAL_L.length`. Fold "alerts run hotter" into C2's `heat`. Re-bless dark-audit. **Stakeholders confirmed (owner, 2026-06-25):** signals are the floor's only real consumer — **neutral** is exempt (its `chromaCurve` overrides the floor at `cAt` `:387`) and **exact** never applies to signals + ships raw/as-is (its "ship raw" path just resolves to raw hex chroma on deletion). So no pre-deletion verification needed.
**Deps.** Every signal dark ramp + shift overrides. Couples to C2, C4. (Exact/neutral are NOT consumers — see Direction.)

### C8 — dark fill-L lift-floor competes with the blessed `DARK_NEUTRAL_L` 9/10 scaffold
**Kind:** drift-from-intent · **Drift:** ✓ · **Conf:** med
**Where:** `colorEngine.ts` `dark9L = max(scaleL, darkFillMinL ?? DARK_STOP_9_MIN_L)` `~:577`, fill at `dark9L ~:600-601`; `DARK_STOP_9_MIN_L=0.63` + `DARK_BRAND_FILL_MIN_L=0.70`; per-signal `darkFillMinL` `signals.ts:39` (green 0.75, info 0.70, red/yellow 0.63); `DARK_NEUTRAL_L[8..9]=0.66/0.72` never read; `stopTable.ts:96-100` self-flags "NOT yet wired."
**Problem.** Stops 1-8 + 11/12 ride `DARK_NEUTRAL_L` exactly, but the fill (9/10) rides a separate per-family lift-floor (brand 0.70 vs signal 0.63) + a hand-set per-signal ladder; the blessed scaffold's own 9/10 entries are dead. Two mechanisms set dark L in the same ramp. The per-signal pins are a grayscale-ΔE separation rationale frozen into constants, sitting **outside** the §3.2 loudness-cap curve brands get.
**Spec.** §2 (fixed `DARK_NEUTRAL_L` scaffold, lists 9/10); §3.1 vs §3.2 vs §3.3.
**Why.** Half-migrated: "scale L is fixed" holds for 1-8/11-12 but a different lift-floor drives 9-10, with a brand/signal fork + a ΔE ladder substituting for the continuous cap — a deviation fitting none of the four §3 categories cleanly.
**Direction (not committed).** Adjudicate (owner-gated): either wire `DARK_NEUTRAL_L[8/9]=0.66/0.72` as the cta target and express loudness via cta+chroma, OR document why the fill L stays archetype-loud and retire the vestigial entries; if the per-signal pins exist only for separation, express as a §3.3 conditional avoider, not constants. Don't silently keep both.
**Deps.** Every dark fill + dark on-cta polarity; `darkColliderFill` (C11), `darkCtaTrim` (C12), `enforceOnFillContrast`-dark (C5) key off `dark9L`. Couples to C4, C7.

### C9 — figma-verify asserts signal cta == highlight (and the brand-cta canary KEEP)
**Kind:** guard-rebless · **Drift:** — · **Conf:** high
**Where:** `figma-verify.ts:46-50` (asserts `cta-1.hex === highlight-1.hex` …); KEEP canary `:61-62` (brand cta-1 light `#07074f`, dark `#869cda`).
**Problem.** The guard actively asserts the duplication §4.2 removes — the inverse of the §5 Phase-3 canary "signal cta ≠ highlight." It would fail the moment cta diverges. The brand-cta hexes are a **separate legit canary** (§5 Phase 1) to preserve.
**Spec.** §5 Phase 3; §4 item 2; §5 Phase 1 (byte-identity canary).
**Direction (not committed).** Invert `:47-49` to assert signal cta-1 ≠ highlight-1; keep token-presence checks + update comment. **Preserve `#07074f`/`#869cda` unchanged.** Re-bless owner-gated.
**Deps.** Moves in lockstep with C4. Brand/secondary must NOT drift.

### C10 — highlight-audit asserts the retired forced on-highlight model + "signals carry no rung"
**Kind:** guard-rebless · **Drift:** ✓ · **Conf:** high
**Where:** `highlight-audit.ts:66` (`polL===true`), `:67` (`polD===false`), `:60` (dark hover lightens), `:97` (neutral `onHighlightIsWhite===true && …Dark===true`), `:110` (signal scales === 12 stops); comment blocks `:7-9/:45/:62-64`.
**Problem.** Hard-asserts the retired forced-flip model (light always white, dark always black, neutral universally white) as the pass gate, even though the engine now computes on-highlight via APCA. Also asserts signals are exactly 12 stops (no rung). Passes only because current rungs happen to score that polarity (masking divergence) or fails the moment the computed pick lands the other way / signals gain a rung. The comment blocks teach the forced model.
**Spec.** §1/§2 (computed for every family, both modes); §4 item 1; §3.1; §4.2 (signals carry a rung).
**Direction (not committed).** Replace the fixed-polarity pins with "recompute APCA-preferred polarity from the rung luminance, assert the engine flag equals it," keep the per-fill WCAG/APCA floor; assert signals **do** carry a rung; make the dark-hover guard follow the rung's actual polarity; rewrite comments. Re-bless under owner visual approval.
**Deps.** Reads `onHighlightIsWhite/…Dark`. Couples to C1 and C4. Re-bless.

### C11 — `darkColliderFill 'muted'` rose register — red dark collision-avoider (**KEEP**)
**Kind:** keep-verified · **Drift:** — · **Conf:** high
**Where:** `resolve.ts:167-183` (routing: `inRedBand` + `checkCollision(...,'dark').collides`); `colorEngine.ts:580-583` (`dark9L=DARK_COLLIDER_MUTED_L 0.80`, `darkC9=brandC*…CHROMA_SCALE 0.55`); `stopTable.ts:143-144`.
**Status.** When a red-band brand collides with the red signal in dark mode, the cta floats to L 0.80 pastel-rose (chroma ×0.55) + picks up black on-cta as a second differentiation channel. Conditional, gated on `inRedBand` + a real dark ΔE collision.
**Spec.** §3.3 (red dark muted-collider, named).
**Why KEEP.** Legit §3.3: conditional, red-band only, on a real collision, re-registers only the single cta fill. The dark analogue of light rung-1.
**Direction.** Keep. Verify composition once the unified curve lands (the 0.55 is proportional to brandC, a deliberate identity-loss register); note it bypasses `darkCtaTrim` and sets `darkC9` directly — verify `enforceOnFillContrast` (C5) interaction.
**Deps.** Reads `dark9L/darkC9`; couples to C5, C8.

### C12 — `darkCtaTrim` — per-hue cta chroma trim (**KEEP**, fix stale comment)
**Kind:** keep-verified · **Drift:** ✓ · **Conf:** med
**Where:** `colorEngine.ts:579` (`darkC9 = brandC * darkCtaTrim(darkH)` when curve set); `darkChromaCurve.ts:85` (`darkCtaTrim = 1 - 0.5*(1-loudnessCap(H))`); contradicts the GenerateOptions comment "the fill (9/10) keeps brandC identity" `~:366-367`.
**Problem.** On the curve branch the cta fill chroma is brandC trimmed per-hue (half the surface `loudnessCap`), so the dark fill is NOT raw brandC. The trim only exists on the curve branch; signals (legacy branch) keep raw brandC → inconsistency once signals route through the curve.
**Spec.** §3.2 (continuous per-hue loudness-cap); contradicts the `:366-367` comment.
**Why KEEP.** Legit §3.2: continuous per-hue cap (same lobes, half strength), unconditional — the named dark loudness-cap.
**Direction (not committed).** Keep as the §3.2 cap. **Fix the `:366-367` comment.** Ensure signals' cta gets the same trim when routed through the curve.
**Deps.** Tied to C4 and C7.

### C13 — dark highlight rung on a light-derived chroma model, bypassing the dark curve
**Kind:** drift-from-intent · **Drift:** ✓ · **Conf:** high
**Where:** `colorEngine.ts` `darkHlTargetC` uses `hlLadderC` (`~:677-679`, from `HIGHLIGHT_LIGHT.baseC` + `satFraction`) vs dark stops 1-8/11-12 using `darkChromaCurve` `~:594-614`; `HIGHLIGHT_DARK = { rootL: 0.62 }` only (`stopTable.ts:48-49`).
**Problem.** For recommended brands, dark surface + text stops get chroma from `darkChromaCurve` (absolute greenfield), but the dark highlight rung (13/14) gets chroma from `darkHlTargetC` = the **light** rung's proportional construction in the dark hue. Same token group (scale), two chroma models. `HIGHLIGHT_DARK` carrying only `rootL` is the symptom (it was meant to borrow the light params). The comment was true when written, but the greenfield curve moved the neighbors and the rung wasn't revisited. Exact brands skip the curve, so for them rung and stops *do* share the model — another inconsistency axis.
**Spec.** §2 (one dark curve for the spine); §1 (highlight derived by the same universal rule); §4 (greenfield curve).
**Why.** A second, light-derived chroma model for the dark rung that bypasses the curve every other stop uses — the quiet "one rulebook" divergence.
**Direction (not committed).** Route the dark rung chroma through `darkChromaCurve(L,H,brandC)` (it's just another L on the spine); the cta keeps its own loud value (C12) but the highlight is a scale rung. Reconcile `HIGHLIGHT_DARK.rootL` (0.62) against the scaffold on owner visual review. Re-bless highlight-snapshot.
**Deps.** Curve is recommended-only (`resolve.ts:129`, !exact). Couples to C7, C2 (rung chroma also carries subtleChromaScale via `hlLadderC`).

### C14 — `signalYieldShift` / `SIGNAL_SHIFT_CAPS` / `YIELD_DIRECTION` — dead duplicate of signalShift
**Kind:** remove-bolt-on · **Drift:** ✓ · **Conf:** high
**Where:** `collision.ts:131-145/:147-156/:158-193`; **zero callers** outside collision.ts (grep). Live path = `signalShift.ts::pickSignalShift` (`resolve.ts:199-206`).
**Problem.** A full second implementation of signal-yield resolution (per-signal caps, away/cool direction, incremental degree-search), orphaned. The live path uses fixed swap/shift targets; the two quietly diverge.
**Spec.** §4.2/§4.4 (one signal path); fails the §3 bolt-on test (no live trigger).
**Direction (not committed).** Delete all three; signalShift is the single source. No runtime callers — removal is inert.
**Deps.** None — only collision.ts-internal references.

### C15 — `preventiveHueShift` / `PREVENT_SHIFT_*` / `brandShearMaxDeg` — deprecated dead shear
**Kind:** remove-bolt-on · **Drift:** ✓ · **Conf:** high
**Where:** `collision.ts:40-48` (consts + DEPRECATED note "CUT 2026-06-11"), `:56-69` (`preventiveHueShift`); `signals.ts:22-27` (`brandShearMaxDeg`), `:44` red 10 (others 0); no src caller (grep); `resolve.ts:14-20` ordering invariant + `ResolvedBrand.shearDeg='always 0'`.
**Problem.** A per-signal preventive brand-hue shear that moved the brand hue **before** any collision is measured — would run a decision on a shifted hue, violating the raw-hue ordering invariant. Already cut from runtime; field + function are vestigial (kept only for the demo rig's slider). Carrying per-signal shear in SignalDef implies an engine behaviour that no longer exists.
**Spec.** §3.2 (`applyRedCoolRender` is the legit replacement); ordering invariant; fails the bolt-on test.
**Direction (not committed).** Drop `brandShearMaxDeg` + the dead `preventiveHueShift`/`PREVENT_SHIFT_*` once the demo rig is reconciled (rig owns its own slider constant if needed). Low blast radius (no live src path).
**Deps.** Demo collision rig references the slider; no src runtime impact.

### C16 — yellow warning decision computed twice (duplicate split constant `96`)
**Kind:** drift-from-intent · **Drift:** ✓ · **Conf:** high
**Where:** `resolve.ts:193-195` (`warningVariant()` populates the back-compat label) AND `:199-206` (`pickSignalShift` recomputes the identical collision+split); `collision.ts:204 YELLOW_SPLIT_H=96` vs `signalShift.ts:44 splitH:96` (comment says "= collision.YELLOW_SPLIT_H" but doesn't import it).
**Problem.** One collision decision, two implementations and two hard-coded copies of `96`. `warningVariant` is called only to label; `pickSignalShift` independently recomputes the same gate to do the work. The two copies can silently desync.
**Spec.** §4.4/§7 (one path, reuse not reinvent).
**Direction (not committed).** Derive the `.warningVariant` label **from** `pickSignalShift`'s result (its note already encodes lemon/none), or import `YELLOW_SPLIT_H` — single constant, single evaluation. The label survives (read by cssRender, demo, gamut-sweep) but should be derived.
**Deps.** `warningVariant` label consumers; the live avoider (C17) is unaffected.

### C17 — red rung-1 + yellow lemon/macaroni + yieldChromaScale + lemon archetype (**KEEP**)
**Kind:** keep-verified · **Drift:** — · **Conf:** high
**Where:** `resolve.ts:147-161` (rung-1 trigger, `inRedBand`, `RUNG1_ARCHETYPE`, stop11/12DeepenL 0.07/0.05); `colorEngine.ts` lightTextStop deepen `~:556-568`; `collision.ts:204-213` (`YELLOW_SPLIT_H`, warningVariant) via `resolve.ts:193-195`; `signals.ts:33/:54 yieldChromaScale` (yellow 1.15) via `signalShift.ts:87`; `signals.ts:21 hueShift`; lemon `forcedArchetype 'light'` (`signalShift.ts:84-92`).
**Status.** Bundle of conditional, hue-ranged, collision-triggered avoiders: red colliders re-anchor to dark archetype + deepen text 11/12; warm-yellow→lemon vs cool→macaroni on a real yellow collision; `yieldChromaScale 1.15` counters the cool-shifted lemon's wash-out; `hueShift`/lemon 'light' are collision-internal.
**Spec.** §3.3 (named); §3.4 (archetype-override).
**Why KEEP.** Legit §3.3 verbatim: each gates on a raw-hue band + a real measured collision (ordering invariant honored), modifies only the collision output; info/green/red=1.0 no-op on `yieldChromaScale` confirms collision-scope.
**Direction.** Keep. Verify gates still match §3.3 after unification, and the lemon/swap overrides compose once §4.2 routes signals through the scale. (C16 is the drift to fix around `warningVariant`; the variant **logic** is KEEP.)
**Deps.** Shares floor/rung1Opts with C11; bound to collision split + signalShift lemon path.

### C18 — neutral inert `enforceOnFillContrast` flag + dead `EXT_NAMES` 15/16 map
**Kind:** remove-bolt-on · **Drift:** ✓ · **Conf:** high
**Where:** `generateNeutralScale` passes `enforceOnFillContrast:true` (`colorEngine.ts:775`) but neutral's near-white 0.925 fill always computes BLACK on-cta so the darken loop never fires; `tokenNames.ts:40-46` (`EXT_NAMES` 15:'cta-1',16:'cta-2' + "neutral → 15/16"), `:11-12/:18-20` comments lump neutral with signals; both emitters render neutral as `'brand'` kind (`figmaRender.ts:101`, `cssRender.ts:44-51`); no 15/16 emission (grep).
**Problem.** Two stale leftovers: (a) `enforceOnFillContrast` can never act on a fixed-light-L cta (it implies the fixed-L cta might be darkened, which would violate §3.1) — copied from the signal/brand floor; (b) `EXT_NAMES` 15/16 + comments encode an OBSOLETE neutral design (highlight-kind ramp + separate cta at 15/16) no path emits — the live §3.1-correct shape is brand-kind (cta=stop9, highlight=rung).
**Spec.** §3.1; §1 vocabulary; §3 bolt-on test; §7.
**Direction (not committed).** Drop `enforceOnFillContrast` from `generateNeutralScale` (byte-identical — never fires); remove `EXT_NAMES` 15/16 + rewrite the tokenNames comments so neutral is brand-kind. Verify byte-identical.
**Deps.** No emitter reads either. Doc/dead-map level.

### C19 — neutral on-highlight universally white via the brand rung's 0.62 target (intent question)
**Kind:** drift-from-intent · **Drift:** ✓ · **Conf:** med
**Where:** `generateNeutralScale` passes `highlight:true` (`colorEngine.ts:774`) so the brand HIGHLIGHT ladder makes a rung at `HIGHLIGHT_LIGHT/DARK.rootL 0.62`; on-highlight computed from that luminance resolves WHITE for every level/hue both modes; `highlight-audit.ts:97` locks it (C10).
**Problem.** The neutral rides the brand's highlight L-target (0.62) and neutralizes only its chroma, so "universally white on-highlight" is an artifact of borrowing the brand rung, not a neutral-character decision. Mechanically compliant (value falls out, polarity computed) but whether a near-gray neutral should carry a vivid-position highlight at all is an open intent question.
**Spec.** §4 item 1; §1; §3.1.
**Why.** Not a bolt-on (no forcing) but flagged as drift — the neutral's highlight value is the brand ladder's; confirm it's intentional.
**Direction (not committed).** Confirm whether the neutral's rung keeps the brand's 0.62 or gets a neutral-specific target. Either way keep it COMPUTED; if polarity should differ, move the rung via the curve, never force the text.
**Deps.** cssRender/figmaRender consume `onHighlightIsWhite`; couples to C10.

### C20 — stale "forced ons" comments (white-except-yellow / dark black-flip)
**Kind:** drift-from-intent · **Drift:** ✓ · **Conf:** high
**Where:** `colorEngine.ts:257-258` (`GeneratedScale.onHighlightIsWhite` jsdoc "White normally; black within the yellow band…"); `stopTable.ts:46` + neighbours; highlight-audit comment blocks (in C10).
**Problem.** Comments still describe on-highlight as a forced rule (white normally, black in the yellow band; dark black-flip) even though the code computes it from luminance via APCA with no yellow-band special-case. Fossils of the pre-unification model presented as authoritative.
**Spec.** §4 item 1; §1; §7.
**Why.** A future reader trusts the comment and may re-introduce a yellow-band forcing branch — the quiet divergence the owner warned about. Upstream cause of the C10 drift.
**Direction (not committed).** Rewrite comments to "computed from the rung's luminance (mirrors on-cta), both modes." No value change; **do not touch ENGINE-SPEC (locked/correct).** Land with C10's rewrite.
**Deps.** Pure comments; land with C10.

### C21 — dark-audit consumes the C1 on-cta polarity + tolerances tuned to old signal chroma
**Kind:** guard-rebless · **Drift:** — · **Conf:** med
**Where:** `dark-audit.ts:87-99` (check F reads `onFillTextIsWhite/…Dark` — the C1 flags, stop-9 only, no rung coverage); `:24-31` (`ADJ_RATIO 0.48`) + checks A/C over signal scales `~:119-121` tuned while signals still ran subtleChromaScale.
**Problem.** Check F validates on-cta off the C1-asymmetric flags, so it's only as correct as C1's fix, and doesn't cover the highlight rung. The adjacent-step/chroma tolerances were calibrated for old signal chroma; when C2 removes subtleChromaScale, signal stops 1-8 chroma changes and the audit can't distinguish "bespoke path" from "base + heat" — an intended change may read as regression.
**Spec.** §6 (on-fill WCAG 4.5 + APCA 45); §4 item 4; C1.
**Direction (not committed).** After C1, confirm check F references the unified polarity flag; consider extending F to the rung. After C2, re-validate `ADJ_RATIO`/`CHROMA_RETENTION_MIN` against signals-on-base-scale (heat off) + add a with/without-heat comparison the audit reports for owner pick (§6 step 4). Re-bless owner-gated.
**Deps.** Couples to C1, C2. Re-bless.

### C22 — blessed snapshots encode the pre-unification fleet (re-bless discipline + byte-identity gap)
**Kind:** guard-rebless · **Drift:** — · **Conf:** med
**Where:** `dark-audit-snapshot.json` (signal:* = 24 stops, no rung; TOL 0.015) + `highlight-snapshot.json` (brand/secondary/neutral rung pairs; signals absent); written by `dark-audit.ts:145-167` + `highlight-audit.ts:119-128`; the only byte-identity pin today is `figma-verify.ts:61-62` (one brand's two cta hexes).
**Problem.** The snapshots are the frozen OLD model; any unified change registers as DRIFT. They're slated for §5 Phase-3 re-bless, but **only after owner approval, with brand/secondary rows NOT moving** (proving default-off flags inert) — signal rows WILL legitimately change. There's no dedicated "brand/secondary must not drift" guard beyond two spot hexes; a wholesale re-bless could silently lose that proof.
**Spec.** §5 Phase 3 (re-bless after approval; brand/secondary must NOT drift); §5 Phase 1.
**Direction (not committed).** Don't re-bless piecemeal: after the changes, run with brand/secondary diff = clean **as the proof**, then bless signal/highlight rows under owner sign-off. Add a fleet-wide brand/secondary byte-identity check (or a separate non-re-blessed frozen snapshot) so re-blessing signals can't mask brand/secondary drift.
**Deps.** Interacts with C1/C2/C4/C9/C10. Owner-gated.

### C23 — COVERAGE GAP: no guard asserts one shared `ons` computation
**Kind:** guard-rebless · **Drift:** ✓ · **Conf:** high
**Where:** absent across figma-verify / highlight-audit / dark-audit; the asymmetry lives at on-cta light (`~:417-418` + `~:535-546`) vs on-highlight light (`~:670` pure-APCA) and dark on-cta (`~:619-620`) vs dark on-highlight (`~:685`).
**Problem.** No audit asserts on-cta and on-highlight polarity come from the same rule. highlight-audit checks each flag's legibility independently; dark-audit check F checks on-cta only. The C1 two-rule asymmetry (and its light-vs-dark axis) is invisible to the guards — when signals route through the scale they inherit on-highlight's rule while on-cta keeps the WCAG-bounded one, and nothing catches the divergence.
**Spec.** §1; C1.
**Direction (not committed).** Add an assertion (highlight-audit or a shared helper) that for the same fill luminance the on-cta and on-highlight polarity rules are identical across {mode, fill}; fail if they could diverge. Folds into C1's resolution.
**Deps.** Resolves with C1.

---

## Engine-route fixes — for joint review (do NOT execute until reviewed + ordered)

> Each fix is the "way the engine works" route for one or more catalog items, with a red-flag
> screen against just doing the simple thing. Recorded for joint review; **nothing applied.**
> Execution still follows the agreed order: highlights/ctas backgrounds first, signals after.

### F1 — Signal route: generate signals exactly like brands · resolves C2, C3, C4, C7
**The fix (the call).** Generate each canonical signal hex through the brand generation path:
`generateScale(sig.hex, sig.name, undefined, { highlight: true, darkChromaCurve, enforceOnFillContrast: true, loudCta: true })`
— and apply the same to the collision-shift variants (`signalShift.ts` swap/lemon). **Drop** `subtleChromaScale`,
`darkStops: ACCENT_DARK_STOPS`, `enforceWhiteFill`, and the render `cta=highlight` alias (figmaRender `~:108-110`,
build `~:49-51`). cta = the hex (archetype); highlight rung + `ons` fall out; dark via the curve. The cta **already
is** the hex today (modulo green's forced darken) — this just runs the rest of the pipeline so everything else falls out.
**Why it's no-fuss.** A signal is a brand whose input hex is the canonical stoplight color. One pipeline, no bespoke
signal machinery. Signals are static → bake once (only the per-brand lemon/swap variants stay dynamic).
**Red-flag screen.**
- ✓ Red signal must NOT cool-render (it's the reference vermillion) → `coolRedDark` off for red. Config, not a blocker.
- ✓ `loudCta` is a NEW one-line flag (skip `darkCtaTrim`) so the dark cta stays vivid (§3.1/§5 Phase 1). Interplays with C12.
- ✓ Signals emit no `identity` token — suppress it (figma-verify already asserts this).
- ✓ Use `generateScale` + floor, NOT full `resolveBrand` (skip brand-only rung-1/collision/cool-render).
- ✓ Green's cta returns to its hex; on-cta computed, bounded by `enforceOnFillContrast` (C5 keep) → stays compliant.
- ✓ **No exact/neutral entanglement** (was a false residual): exact never applies to signals and ships raw/as-is; neutral's dark chroma comes from its own `chromaCurve`, which **overrides** `applyChromaFloor` at `cAt` ([colorEngine.ts:387](../../src/engine/colorEngine.ts:387)). Signals are the floor's only real consumer → once F1 routes them onto the curve, `applyChromaFloor` + `DARK_FLOOR_*` + the `darkStops` chroma columns are fully dead and removable (exact's "ship raw" resolves to raw hex chroma — an implementation detail, not a blocker).
- ⚠ **Residual (C8):** signals adopting the brand dark-fill-L (0.70 lift) is *part* of C8, but the `0.66/0.72` scaffold-vs-lift question spans brands too — not closed by F1.
- ⚠ Collision-shift variants (lemon/swap) must route through the SAME floor + `loudCta`, or shifted signals diverge from base.
- ◆ **Sequencing:** signals inherit C1's `ons` rule the moment they route through the scale — F1 lands **after/with** C1 (the backgrounds-first track), per C1's blast radius.
**Moves with it:** C9 (invert: signal cta ≠ highlight), C10 (signals carry a rung), C21/C22 (re-bless signal rows). **Keeps unaffected:** C5, C11, C17 (overrides still compose), C12 (via `loudCta`).
**Status:** RECORDED — review together.

### F2 — Dark highlight rung onto the dark curve · resolves C13
**The fix.** In the highlight block, take the dark rung's chroma from `darkChromaCurve(L, H, brandC)` — the SAME
curve dark stops 1-8/11-12 use — instead of `darkHlTargetC` (the light-derived `hlLadderC` construction). The rung
is just another L on the spine; rung L stays `HIGHLIGHT_DARK.rootL` (0.62) + `hoverL` twin. Mirror the dark-stop
pattern: `darkChromaCurve ? curve(L,H,brandC) : <proportional fallback>`.
**Why it's no-fuss.** One token group (scale), one chroma rulebook — the rung stops being the lone exception.
Also dissolves C13's `subtleChromaScale`-via-`hlLadderC` coupling (the curve doesn't touch `hlLadderC`).
**Red-flag screen.**
- ✓ Rung L (0.62) is inside the curve's domain (scaffold L0.18–0.93), above the `capMix` mid-band → near-full shape, sensible chroma falls out.
- ✓ Exact brands (no curve) fall to the proportional fallback — exempt/ship-raw, no special handling.
- ◆ The rung-L **value** itself (0.62 vs scaffold 0.66 fill / 0.55 accent-8) is a separate **background decision** for dark-bg review — F2 fixes the chroma *model*; the L *target* is the owner-visual call (the "rung-L" item in the backgrounds-first track).
- Background fix → precedes the on-highlight text review (backgrounds-before-text).
**Moves with it:** re-bless highlight-snapshot (C22) after owner visual approval.
**Status:** RECORDED — review together.

### F3 — `ons` one-rule: one shared polarity function for cta + highlight · resolves C1, C6 (+ C23, C20, C10)
**The fix.** Extract on-cta's polarity resolution into ONE shared `onText(fill)` function — APCA picks the polarity,
a WCAG bound flips it when the pick fails 4.5 and the other side passes — and call it for **on-cta AND on-highlight,
light AND dark**. Delete the divergent formulas: on-highlight's pure-APCA, the dark "black-first <45" threshold, and
cssRender's `on-highlight ?? true` (C6). One rule applied uniformly → the right polarity falls out for every fill.
**Why it's no-fuss.** The three current formulas are per-token/per-mode approximations of one underlying rule
("pick the legible color, WCAG-bounded"). Write it once, apply to both — nothing to special-case.
**Red-flag screen.**
- ✓ Works for cta + highlight, light + dark — same computation; polarity falls out per fill.
- ✓ Collapsing the dark "black-first <45" into the unified max-|Lc|+WCAG rule may shift a few dark on-cta polarities — that IS the correct unification (review). The cta *value* (canary `#869cda`) is a separate token, untouched.
- ◆ **Polarity-only.** The cta's value-darken (`enforceOnFillContrast`, C5) stays cta-only for the "neither side complies" case; the highlight does NOT darken — it relies on its background being resolved (F2 + the rung-L decision), so the residue never arises. The shared function returns polarity, not a value move.
- ◆ **Sequencing:** F3 (text) lands AFTER the highlight backgrounds (F2 + rung-L), per backgrounds-before-text; and before/with F1 (signals inherit the rule the moment they route through the scale).
- ✓ Rides with F3: **C23** (guard: assert cta & highlight resolve identically for equal fills), **C20** (rewrite the stale forced-ons comments), **C10** (rewrite highlight-audit to assert computed-and-compliant).
**Status:** RECORDED — review together.

### F4 — Delete dead / inert code · resolves C14, C15, C18
**The fix.** Pure removals, all zero-runtime-impact:
- **C14:** delete `signalYieldShift` + `SIGNAL_SHIFT_CAPS` + `YIELD_DIRECTION` (`collision.ts:119-193`) — grep-confirmed **zero callers** (superseded by `pickSignalShift`).
- **C15:** delete `preventiveHueShift` + `PREVENT_SHIFT_*` (`collision.ts:40-69`) + `brandShearMaxDeg` from `SignalDef` + its 4 values (`signals.ts`) — its only consumer is the dead `preventiveHueShift`; grep shows the **demo references neither** (the "demo slider" note is stale). (Minor related vestige: `ResolvedBrand.shearDeg` is always 0 — confirm the demo doesn't display it before removing.)
- **C18:** drop `enforceOnFillContrast` from `generateNeutralScale` (gated on `onFillTextIsWhite`, always false for the near-white neutral cta → never fires); remove `EXT_NAMES` 15/16 (`tokenNames.ts:45-46`, no stop 15/16 is ever generated) + rewrite the stale "neutral = highlight-bearing / 15/16" comments to match the live brand-kind neutral.
**Why no-fuss.** Dead functions, an inert flag, and an unreachable name map. Output **byte-identical** for every family.
**Red-flag screen.** ✓ C14/C15 zero callers (incl. demo). ✓ C18 flag never fires; ✓ 15/16 never emitted. ◆ Confirm `shearDeg` isn't surfaced in the demo before deleting it.
**Status:** RECORDED — review together.

### F5 — Single-source the yellow lemon/macaroni decision · resolves C16
**The fix.** Compute the lemon/macaroni split **once**: derive `warningVariant`'s label from `pickSignalShift`'s result (its note already encodes lemon/none), or have `signalShift` import `collision.YELLOW_SPLIT_H` — so the collision + `96°` split is evaluated in one place. The label survives for all consumers (`cssRender` note, `demo/shared`, `demo/CustomTheme`, `gamut-sweep`).
**Why no-fuss.** Same decision, computed once instead of twice; the two copies agree today so output is identical.
**Red-flag screen.** ✓ Label-only; the live shift (`pickSignalShift`) is unchanged. ✓ Byte-identical (both `96`s agree now). ◆ Verify the derived label matches all current lemon/macaroni outcomes after.
**Status:** RECORDED — review together.

## Notes (not separate entries)
- **sub-4.5 white on the L≈0.62 highlight rung** — a symptom of the un-tuned highlight L, subsumed by C1 (polarity) + the Phase-3 value/curve work. Not its own entry.
- **Verified §3 KEEPS** (do not remove): C5, C11, C12, C17, plus the brand-cta byte-identity canary `#07074f`/`#869cda` (C9); `YELLOW_L_LIFT`, gold-spine torsion, cream gate, `applyRedCoolRender` (§3.2, present + unconditional); the highlight rung block itself carries no residual forcing; neutral's two core deviations (fixed light-L cta + its own low-chroma curve) are exactly §3.1.
