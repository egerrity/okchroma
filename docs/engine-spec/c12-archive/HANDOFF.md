> **⛔ SUPERSEDED (2026-07-10, same day, C12 v8): DO NOT WORK FROM THIS DOC.** The open item
> below was resolved and the entire v6 treatment model (keep-box, vivid-arc split, exitCtaL,
> redMoveVariant, applyRedRepelRender) was REPLACED by the owner-settled JOINT SOLVE —
> current ground truth = **`scripts/c12-session/joint-solve-model.md`** + the code.
> Kept verbatim below as the historical v6 handoff record.

# C12 HANDOFF — v6 + vivid-arc wired; ONE open design item (2026-07-10, owner-requested wrap)

Committed as-is on `orange-red-collision` at the owner's word ("commit this as is with notes").
NOT pushed. Snapshots NOT blessed. Start the next session from this doc + the plan doc
(`~/.claude/plans/c12-red-orange-cta.md`, top block).

## THE OPEN ITEM — vivid-arc variant delivery (owner's last two catches, unfixed by design)
Her words: *"you are re-conflicting in shot 1"* (orange #FF7300-class brand: the red variant
'coral L0.63' ≈ canonical red renamed) · *"in shot 2 i don't think this goes far enough …
are you shifting in a rich direction or picking the same rich no matter what? it needs to
move dynamically based on the end color."*

Diagnosis (verified): `redMoveVariant` (src/engine/resolve.ts) picks the NEAREST candidate
satisfying gate-release + P2 vs the brand's final cta. For vivid-arc brands that never fired
(arc ends: #FF7300, #FF006F) those conditions hold AT canonical red → the variant barely
moves. For #FF0000 (BOTH class) the deep variant stops at L0.60 — minimal legal move.
The nearest-first solve is RIGHT for the keep-box class (minimal intervention) and WRONG for
the vivid-arc class, whose whole point is vibration relief BEYOND legality.

Next session designs: a vivid-arc-specific DELIVERY rule — distance keyed dynamically to the
brand's end color (her direction). Candidate shapes to explore with her: higher P2 bar for
max-vivid pairs (p2 ≥ 0.13–0.14?) · positional mirror (variant L offset ∝ brand's final L) ·
vividness-scaled distance. Instrument-first; her eye rules.

## What is WIRED and verified (all gates green except snapshot bless)
- **Two-problem model**: P1 = her confusability gate (redGateDist v7-confirmed, G .090) ·
  P2 = helmlab side-by-side distance (src/engine/p2.ts — runtime dep, owner-cleared; bars
  .12 / .11-up / .115-fallback, from her ladder marks).
- **Three treatment shapes** (colorMath.ts declares all regions):
  · RED_KEEP_BOX (H20-44 · C≥.18 · L.50-.62): brand kept, red takes a per-brand variant.
  · RED_VIVID_ARC (H5-50 · vivid≥.85 · L.55-.75 — derived from her anchors #FF7300…#FF006F,
    vividness .88-.90 = the saturated sRGB edge): red variant INDEPENDENT of firing; brand
    also self-exits if fired. ← delivery is the open item above.
  · fired otherwise: self-exit only (exitCtaL, producers.ts — direction declared by
    RED_DEEP_PIVOT .50: deep down, else up; delivery = gate-release AND P2; v5's
    nearest/release-at-boundary deleted).
- **No dark mechanism**: dark never fires under the Lc-60 bar (collision-sweep asserts).
- **Lc-60 on-cta contract** (owner-declared): apca ink-12 90 / ink-11 75 / on-cta 60
  (CTA_ONFILL_ENFORCE_LC, profiles.ts); wcag 7 / 4.5 / 4.5 untouched.
- **applyRedRepelRender quirk FIXED** (colorEngine.ts): the embedded white-only 4.5 solve is
  now profile-aware (Lc-60 in apca) — it was pushing C6-band pinks back into the gate.
- **Variant wiring**: hybrid GeneratedScale (canonical red ramp + PINNED light cta/hover/pole;
  dark side canonical verbatim); names 'rich'/'coral' = PLACEHOLDERS for the owner.
  wcag-stuck brands (white-4.5 cap squeezes the domain) fall back to self-exit.
- **C6 hue repel** re-keyed to fired-or-moved (red-move brands stay truly untouched).
- **Demo**: profile-aware rRec (fixed a pre-existing always-wcag bug), red-move / BOTH
  banners + checklist rows. Verified: #CC2631 keep+variant · #FF0000 BOTH (→#FF8473 +
  red→rich) · lanes legitimately diverge · dark clean.
- **collision-sweep**: measures every brand vs its EFFECTIVE red (variant-aware); red
  excluded from the lane-global invariant (type-2, per-lane by design).

## Owner data in this directory (IRREPLACEABLE — now committed)
c12-gate-fit.ts (her 67 P1 marks) · c12-gate-fit-v7.ts (0/100 winning fit) · l055-range-marks
· direction-marks · delivery-marks (round 1 VOID True-Tone; round 2 = her 9 ladder picks) ·
error-range-checks (error-eligible range; L0.35 empty; L0.65+ = edge tier) · owner-corpus.json
(everything, one file) · two-problems-note.md (P1/P2 split, her words) ·
helmlab-collision-research.md (she plans to SEND this to the helmlab author) ·
panel-findings.md (adversarial panel + responses) · proposal-draft.md + proposal-sim2.json ·
instruments (range-candidates / direction-sort / delivery-ladders / error-range → render/) ·
c12-marks-server.py (port 8324: serves render/ + saves checkbox marks, CORS'd).

## WRAP LIST (next session, with her)
1. Vivid-arc delivery redesign (the open item) — instrument-first.
2. Bless snapshots: highlight 45 drifted + ext (the Lc-60 fleet drift — dark ctas of deep
   brands sit up to ~0.10 deeper; warm/pink base ctas lighter).
3. Variant identity NAMES (rich/coral placeholders) + plugin per-brand variant keying
   (Foundations dedup collides on note-text keys — panel finding).
4. CATALOG entries: C12 v6 · vivid-arc · Lc-60 contract · the applyRedRepelRender quirk fix.
5. Optional: paired role-legibility page ("which one deletes?") over the red-move pairs.
6. Cleanup: wcag-pole-sweep.ts w=74 default (Lc-75-era shadow, report-only script).
7. Push on her word.
