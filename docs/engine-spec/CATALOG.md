# CATALOG — found problems (log, don't fix inline)

Fresh tracker. The previous CATALOG was archived with the whole old docs tree in 560e484
("clean-slate rewrite" 2026-06-27); entries here are code-grounded, logged at find-time,
fixed holistically after owner sign-off.

## C6 — red-cool re-conflict: fixed-direction cool drives warm-of-red brands THROUGH the red signal

**Status:** FIXED on fix/red-orange-cool (owner-approved 2026-07-07 via rendered review —
"orange shift + dark" over the light-archetype cta what-if). The fix: signed
`redRepelShiftDeg` (cool side byte-identical, warm side nearest-exit at the same 10.8°
magnitude, fading by ~H50), repel-band gates to H41.5 with the warm-side cta decoupled from
rung-1 (dark value + warm hue), muted dark collider constrained cool-side only. Measured:
light window ΔH 11–19 / minΔE ≥ 0.006 (meets the #EE3123 bar); dark window ΔH ≈ 9 /
minΔE ≥ 0.009 (accepted "for now" — the warm-spine torsion eats the push at low stops; a
dark-side overshoot remains an open tuning knob). All snapshots re-blessed post-approval.

**Symptom.** A brand entering warm of the red signal hue (input H ≈ 33.5–41 OKLCH) is cooled
back onto the signal's own ramp: the scale stops land nearly identical to red's. Measured via
resolveTheme → themeToFigma (the plugin payload path), agnostic sweep H10–55 × C{.08–.20} ×
L{.55,.65}, all four solve columns (wcag · wcag-dark · apca · apca-dark):

- Worst case: seed #AC543F (H35 C0.12 L0.55) — brand wash-4 **byte-identical** to red wash-4
  (#FFDFD7) in the wcag column.
- Owner's case #EA603E (H35): wash-5 #FFD1C7 vs red #FFD1C6 (ΔE 0.001, ΔH 1.3°); dark scale
  ΔH ≈ 4°. The cta collider (rung-1) DOES fire — and does not rescue the scale stops (it moves
  L only, never the hue of stops 1–10).
- Window: mean scale-ΔH vs red bottoms at 1–3° for input H34–39 light, 2–6° for H34–40 dark;
  healthy on both flanks (H≤32 → ΔH 8–25 because the cool carries them clear; H≥45 → natural
  distance).
- Brands entering cool of the signal are healthy BY the same mechanism: #EE3123 (H29) cools to
  scale H≈17–20, ΔH 11–13 from red.

**Mechanism (all sites).**
- `redCoolWeight(H)` — src/engine/colorMath.ts:76 — soft band-pass
  `sigmoid((H−12)/2) · (1 − sigmoid((H−35.5)/3.5))`; full strength ~H16–30, tapers through
  H35.5 (= RED_TORSION_CENTER_H), ~zero by H45. `RED_COOL_DEG = 10.8` (colorMath.ts:74).
- Applied with a FIXED direction (always minus / cooler) at three sites:
  1. light, every stop: `lightHueAt` — src/reqtoken/producers.ts:76–79
     (`brandH + spine drift − RED_COOL_DEG·wRed`);
  2. dark, every stop: `darkH` — src/reqtoken/producers.ts:81–84, gated by `coolRedDark` AND
     the hard `inRedBand` (12 < H ≤ 35.5) — the H35.5 cliff means an H36 brand gets NO dark
     cool and sits at natural ΔH ≈ 3 from red;
  3. light cta re-cool: `applyRedCoolRender` — src/engine/colorEngine.ts:166, called from
     src/engine/resolve.ts:165–167 (inRedBand && no rung-1).
- The red signal itself generates with `suppressRedCool` (src/engine/resolve.ts:22), so its
  ramp sits at H33.2–34.3 light / H33.3 dark. A warm-side brand's partial cool (the taper)
  drags its ramp backward onto that target instead of past it; the zero crossing
  `brandH − 10.8·w(brandH) ≈ 33.5` sits at input H ≈ 35–38.
- Rescue machinery doesn't cover the window: rung-1 and the dark collider are gated to
  `inRedBand` (H ≤ 35.5) and move L only; H36–41 gets `errorComponentRule` (an annotation)
  while its scale sits on the signal.
- Context pinned during reproduction: the light cta hue is raw brandH (identity —
  src/reqtoken/resolve.ts:211); the shift reaches it only via the applyRedCoolRender post-pass
  (non-rung-1, in-band). The dark cta rides `darkH`. And the light collision metric
  (cta ΔE ≤ 0.16 within the 30° hue gate) fires for the WHOLE orange band — even Chai H48
  reads ΔE 0.112 vs red's cta — so rung-1 eligibility must stay value-gated by `inRedBand`,
  not be widened to the repel band, or every orange brand would regenerate dark. Exact-mode
  brands skip the cta shift and the dark shift (gates) but their light scale DOES carry the
  fixed cool today — a direction fix reaches them too.

**Owner directive (2026-07-07, verbatim: "We basically need a reverse of cool red that would
make tomato orange-er AND dark at the cta").** For brands WARM of the red signal hue (33.3):
(1) the whole ramp shifts WARMER — nearest-exit away from the signal, same magnitude
discipline as the existing cool; (2) the cta KEEPS the red-band dark treatment AND follows
the warm hue (dark tomato, not dark red) — decouple the rung-1-disables-cta-shift quirk on
the warm side, and extend the dark treatment across the warm-side band (today H36–41 gets
neither). Cool-side brands stay byte-identical. Validation bar = #EE3123's separation
(ΔH ≈ 12–13, minΔE 0.006 light / 0.017 dark), full H15–55 agnostic sweep, real pipeline.
Full exploration: ~/Desktop/okchroma-internal/RED-ORANGE-COOL-EXPLORATION.md.

**Interactions to watch when fixing.** Orange-side band (Turmeric #E35205 H40.5 currently
cooled 2.1°; Chai #E8742C H48 ~untouched); warm spine / gold-spine drift (wDrift) already
pushes these stops warm — the signed shift composes with it; smoothness `drift` budget
(scripts/smoothness-audit.ts) will move on the warm side → mechanical re-baseline after
approval; blessed snapshots (dark-audit, divergence, ext-overrides, highlight) re-bless ONLY
after owner eye-check.

## C7 — the collision gate's cta-ΔE proxy doesn't see the wash register (yellow worst; green lane-dependent)

**Status:** OPEN (found 2026-07-07 by the owner via the v2 plugin's lane columns — a green
brand shifting the signal under wcag but not apca exposed the metric).

**The structural problem.** `checkCollision` (src/engine/collision.ts) gates a signal shift
on ONE distance: brand-cta ↔ signal-cta ΔE ≤ 0.16 inside a 30° hue window, on the LANE'S
resolved values. But the wash register's only differentiator is hue (fixed L scaffold,
normalized chroma — same lesson as C6), and the cta is a poor proxy for it wherever the cta
machinery diverges from the ramp:

- **yellow — a hard hole, both lanes:** gold/brown brands H≈60–80 (e.g. #c97a00 H66,
  #9e6200 H69) sit wash-ΔE 0.002 / ΔH 0.5 from the yellow signal — byte-adjacent washes —
  with NO lemon shift, because yellow's loud bright cta vs a gold-brown brand's deep cta
  reads ctaΔE ≈ 0.29–0.31 (≫ 0.16). 27/116 sweep seeds dead. The lemon rule (split H96)
  WOULD apply — the gate never fires.
- **green — bright-register, lane-dependent:** #65C466 (H144, L≈0.73): wcag ctaΔE 0.090 →
  shifts; apca ctaΔE 0.182 (the apca green cta re-solves darker for white on-text) → no
  shift, washes ΔE 0.003–0.010 vs the signal. The collision genuinely differs per lane —
  value-honest, but the file then carries a per-column signal variant AND an unprotected
  wash register in one lane.
- **even a fired shift under-delivers at the wash:** #65C466 wcag post-swap washes sit
  ΔE 0.009–0.023 from the teal-side variant (swap hues are near siblings).
- **info-color:** worst unshifted 0.028 at the hue-gate edge; the green-style
  bright-register hole is untested and likely.
- **red:** protected to the bar (0.007 vs the 0.006 C6 bar) — because C6's fix moves the
  BRAND ramp, which protects every stop by construction.

**The owner's sharper frame (2026-07-07): two collision phenomena, conflated.**
(1) HUE collision — ramp-wide by construction: the L scaffold + normalized chroma make a
near-hue chromatic pair collide at EVERY scaffolded register ("if the hue collides, it's
all going to collide"). Only whole-ramp remedies apply: repel the brand (C6) or swap the
signal. Right gate = hue proximity + sufficient chroma (wash-ΔE is the operational form of
that test — the chroma qualifier built in; muted brands at the signal hue don't
family-collide and must not false-fire). (2) VALUE collision — two specific stops
coinciding (the cta clash) even at distinguishable hues; remedy = a value move (the dark
treatments); right gate = stop ΔE. The bug in one sentence: the code uses metric (2)
(cta ΔE) to decide remedy (1) (signal swap).

**Fix directions (owner to pick; not decided):** (a) split the gate — a type-1 test
(hue+chroma / wash-ΔE) drives swap-or-repel, the type-2 test (cta ΔE) drives value moves
only; (b) generalize C6's brand-repel to the other signal bands (whole-ramp remedy, no
signal swap — but changes brand ramps rather than signals); (c) role-split of both. Also
decide: lane-local vs lane-global shift decisions (a per-column signal variant flips
character when a frame's mode switches).

**Secondaries: same gate, more exposed (owner scoping 2026-07-07).** The secondary's
collision path (resolve.ts:340/353) uses the SAME checkCollision cta-ΔE gate — one
mechanism, two callers; the gate fix covers both. Exposure is WORSE for secondaries:
derived pastels track the primary's hue exactly while their pale ctas sit maximally far
from any signal cta, so the current gate ~never fires for them — and since the plugin's
derive-fallback shipped, every posture-on file carries one derived secondary per brand.
The secondary REMEDY layer (yield-subtle for red/yellow — the mirror of rung-1's darken;
swap-only-if-clears-BOTH for green/info) is owner-decided design (SECONDARY-PLAN §2) and
has a new wrinkle repel can't answer: a derived secondary's hue is SUPPOSED to track its
primary. Plan: C7's sweep measures secondary exposure + how the existing remedies behave
once the corrected gate fires (does yield-subtle wash an already-pastel secondary to
nothing?); remedies get their own owner-decision round ONLY if the measurements say so.

**Measurement:** sweeps in scratchpad wash-sweep.ts/wash-sweep2.ts (session 2ac35f09);
seeds ±35° per signal × L{0.55,0.65} × C{0.12,0.17} — NOTE under-covers the bright register
where the green hole lives; re-sweep with L up to 0.8 + low-chroma seeds + DERIVED-SECONDARY
seeds before fixing.
