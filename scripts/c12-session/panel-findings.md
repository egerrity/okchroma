# Adversarial panel findings (5 lenses, 2026-07-10 night) — and the response plan

Full agent outputs: session task witdis6tz. Verdict pattern: **the skeleton survives** (two-metric
delivery binds P2 on 41% of self-moves — not collapsible into v5-with-margin; red-move instinct
sound; every fired-core brand servable) — but the sim was NOT the real pipeline, and several
choices overrode owner rulings without consent flags.

## Blockers → fixes (all go into sim v2 + draft v2)
1. **Wrong enforce bar**: sim used Lc 60; shipped pipeline enforces on-fill at **Lc 75**
   (DEFAULT_APCA_LC_MAP 4.5→75). At 75, NO up-release is bar-legal (white-75 ends L≈0.593).
   BUT: her own delivery-ladder picks sit at Lc 61–64, and the v5 wiring she demo-approved
   ships repelled ctas at Lc ~67–70 — the de-facto owner bar for TREATED ctas is 60-ish.
   → FIX: sim v2 dual-reports both bars; **fork #1 for owner: treated-cta text bar 60 vs 75**
   (with her own marks as evidence for 60). Wiring adds a post-repel bar assert either way.
2. **Dark geometry wrong**: brand dark floor = DARK_BRAND_FILL_MIN_L 0.70 (0.63 is the SIGNAL
   floor); darkCtaTrim + coolRedDark omitted. Real fired-dark population is a different set —
   dark dust conclusions were drawn on phantom bases. → FIX: sim v2 carries resolveBrand's
   exact floor opts; validate mirror byte-vs-resolveBrand on unfired seeds; re-derive dark.
3. **C6 applyRedRepelRender still fires on red-move brands** (exemption keys on repelled-flag,
   not gate-fired) — hue-shift + the embedded white-only 4.5 quirk land on "untouched" brands.
   → FIX: wiring exposes a gate-fired flag for the exemption; sim v2 models C6 on red-move rows.
4. **Hover re-enters the gate**: hoverL ≈ ±0.041 vs release margin 0.005 — 51/63 treated ctas
   + 22/48 variant-pairs re-enter on hover. Draft falsely said "measured". → FIX: release/P2
   solved at BOTH rest and hover positions (costs ~+0.04 on up-moves); hover columns in sim v2.
5. **Variant doesn't survive signal machinery**: enforce re-solve collapses light-half variants
   to ≈canonical red (apca) or drags/flips them (wcag). → FIX: variant ships as a HYBRID
   GeneratedScale (canonical red ramp verbatim; light cta/ctaHover/pole from the PINNED variant
   solve — ctaL-pin precedent exists in generateSubtleSecondary; dark side byte-copied from
   canonical). wcag lane variant cap = white-4.5 boundary (~L0.66), not Lc60.

## Consent/honesty fixes
6. **L0.45 all-dark override**: box lLo 0.42 silently red-moves her ruled-dark cells.
   → FIX: box lLo = 0.50 (DEEP_PIVOT); her all-dark cells keep self-down. If the real-geometry
   sim shows L0.45 doesn't fire at all, report that honestly instead of "reproduced".
7. **Variant floor**: her recorded floor is ~0.45 (L0.45 = lowest checked; 0.42–0.45 unruled).
   → FIX: VAR_DOM_LO = 0.45.
8. **Ruling-reproduction table**: rendered-cta space, per-slice honest counts; no red-move
   escape counted as "pass" at L0.45.
9. **lHi 0.62 is load-bearing** (20/48 red-move rows): exhibit shows BOTH scoreboards (0.58 vs
   0.62) at the veto point. H40 C0.2 L0.45 = implicit NO (presented, unchecked) — box trimmed
   or cell flagged as such.
10. **Gamut-clamp hole**: box membership judged on NOMINAL seed C (not clamped) so vivid warm
    cells at L0.50 H40 don't fall out of the box (they clamp to 0.177 < 0.18).
11. **Variant side rule declared** (not nearest-wins, which flips on 0.02 chroma): brand light
    cta L ≥ red cta L → DEEP variant; below → LIGHT variant. Bimodal split shown, not median.
12. **One D = 0.12 everywhere** (per-direction D double-encodes the categorical asymmetry the
    gate's wDark already carries; helmlab saturates ~0.149 so 0.13 = shoulder). Exhibit shows
    ΔL-equivalents beside every helmlab number + the cells shipping under her marked rungs.
13. **Variant dark contract stated**: variant emits on light lanes only; dark lanes = canonical
    red (explicit, documented delta-model exception); identity-keep brands DO still get dark
    treatment — owner question added.
14. **Plugin dedup**: per-brand continuous variants collide on note-text keys — wiring note:
    key variant primitives per-brand (like lemon/macaroni per-brand overrides), not by note.
15. Stale knobs dict in proposal-sim.json (VAR_L_LO etc.) — regenerate.
16. Role-legibility risk (40/48 kept brands closer to canonical red than their variant; 20/48
    variants outside the red-category gate): inherent to keep-identity; **owner instrument ask**:
    paired "which one deletes?" page over the red-move pairs + optional brand→bright nudge fork
    (the parked design's other half).

## Kept as-is (panel-validated)
Two-metric delivery (P1 gate + helmlab P2) · red-move concept · identity-keep box concept ·
error-eligible variant domain concept · dark-dust DIRECTION (pending re-derivation on real
geometry) · helmlab for P2 (owner-cleared).
