# CATALOG — found problems (log, don't fix inline)

Fresh tracker. The previous CATALOG was archived with the whole old docs tree in 560e484
("clean-slate rewrite" 2026-06-27); entries here are code-grounded, logged at find-time,
fixed holistically after owner sign-off.

## C6 — red-cool re-conflict: fixed-direction cool drives warm-of-red brands THROUGH the red signal

> **⛔ SUPERSEDED IN PART by C12 v8 (2026-07-10):** the ramp-side `redRepelShiftDeg` cool
> survives (light drift + dark-scale hue), but this entry's cta half is retired — the cta
> render cool (`applyRedRepelRender`, née `applyRedCoolRender`) is DELETED (owner: cta red
> de-collision is C12's alone), rung-1 and the muted dark collider are gone, and the dark
> CTA now rides identity hue (`coolRedDark` is cta-off). Current model =
> `docs/engine-spec/c12-archive/joint-solve-model.md`. Entry kept verbatim as the find-time record.

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

**Re-sweep addendum (2026-07-07, expanded grid — session c7-sweep).** 2,720 primary seeds
(±35° per signal × C{.04–.17} × L{.55–.80} × wcag+apca), 1,200 fine low-chroma, 1,344
supplied-secondary; every seed via resolveTheme with a derived secondary; register ΔE
stop-matched vs the EFFECTIVE (post-shift) signal. Bar below = 0.006, the C6-accepted wash
separation.

- *Unprotected primary holes (nothing fires, wash < bar, chromatic C ≥ .06):*
  **info-color 34/272 (13%) wcag / 32 apca** — dH −13…+13, bright register L .73–.80,
  #a497ff light wash byte-identical #eae9f9 (the "untested-likely" is now the WIDEST hole);
  **yellow 22 (8%) per lane, lane-identical** — gold band dH −17…−3, L .55–.65, worst
  #9f6105 wash 0.0020; **green 1 wcag vs 23 (8%) apca** — dH −9…+9, L .73–.80, #4ec465
  byte-identical #dff3e1 (the lane hole, quantified); **red 3 wcag / 2 apca (1%)** — ONLY
  dH0 bright (#ffa28d L.73–.80): NEW micro-finding — near-pivot UNDER-SHIFT (CORRECTED
  from this addendum's first draft, which mis-called it a zero crossing: the cool branch
  reuses the torsion fade, which sags to ~0.65 at the pivot → −7° exit instead of full,
  and the warm branch's at-pivot 10.3° similarly lands dHueWash ≈ 9.4 after spine drift —
  both under the ΔH 11–13 yardstick), and rung-1 (value move) can't separate a
  hue-coincident ramp: red's dH0 rung-1 seeds sat wash 0.0032 fired.
- *Lane facts:* the wash register is EXACTLY lane-invariant (max wcag↔apca wash-ΔE
  difference 0.00000 over 1,320 same-machinery seed pairs), yet 149/1,320 seeds fire
  DIFFERENT machinery per lane (green shift, componentRule, muted collider). The type-1
  phenomenon is lane-global; the current metric is lane-local — the divergences are gate
  artifacts, not value-honesty.
- *Muted false-fire boundary:* red/green/info separate naturally as chroma falls (wash ΔE
  at |dH|≤8: C.02 → .019–.024, C.06 → .012–.016, C.17 → ≤.007) — a wash-ΔE gate at
  ~.006–.010 excludes muted seeds by itself. YELLOW does not: its wash register is
  degenerate (even C.02–.03 seeds sit ≤ .005 from the yellow washes) — yellow's type-1
  gate needs an explicit seed/ramp-chroma qualifier, wash-ΔE alone false-fires on browns.
- *Existing remedies WOULD clear the primary holes at the accepted bar:* firing the
  current remedies on every hole seed → 100% clear 0.006 (yellow→lemon worst 0.0061,
  green best-variant 0.0069, info 0.0130); none of green/info reach 0.02 (swap hues are
  wash-siblings — fine at the C6 bar, a decision if the owner wants more). Red dH0 has no
  whole-ramp remedy today.
- *Secondaries:* the DERIVED path runs NO collision inspection at all (early return —
  not even the advice notes; resolve.ts:309–324). Measured vs effective signals:
  **green 85 derived-pastel seeds wash < bar** (63 apca / 22 wcag; the primary's own
  machinery fired in just 7 of them), **info-color 40**, red 0 (repel + pastel register
  holds ≥ .006), yellow ~0. The would-be cta gate INVERTS: fires 0% where the green/info
  holes are, 78% on yellow pastels whose washes are fine. Supplied-tint mirror: red notes
  0/168 fired with 100% within .02; yellow notes 168/168 fired with 0% within .02.
- *Secondary remedies under a corrected gate:* yield-subtle WORKS for yellow (exact→tint
  clears every case past .02) and FAILS for red — the tint destination itself sits within
  .02 in 100% / within .006 in 12–21% of near-signal cases (tint wash-5 C .048–.055: a
  visibly pink ramp on red's washes, not washed to nothing), and an already-tint/pastel
  secondary has NO further yield. swap-if-clears-both: every ADOPTABLE variant clears the
  bar for the secondary (green .0069–.0226, info .0130–.0270) but adoptability under the
  current cta semantics is partial (green tint 84/168, exact 51/168; info exact 87/168) —
  the rest stay coincident with no move. ALSO: the remedy layer is DESIGNED but NOT WIRED —
  signalSwapVariants is a dead import in resolve.ts, `demoted` is always false, the
  secondary callers only push advice notes. Remedy round = its own owner decision
  (per the 2026-07-07 scoping).

**FIX IMPLEMENTED (2026-07-07, this branch — owner decisions: split the gate · lane-global
type-1 · keep the tapered repel + full pivot exit, ties cool · 0.006/ΔH 11–13 yardstick ·
secondaries detection+annotation only).**
- `checkHueCollision` (collision.ts): TYPE-1 = wash-register hue distance (min over stops
  3–7, both modes, vs the resolved ramps — spine drift included) ≤ 15° + vividness
  qualifier v = brandC/VIVID_C ≥ 0.5 (PROVISIONAL — owner eye-check strip pending; the
  gold/brown boundary is the owner's call). 15 not 13: the ΔE-per-ΔH slope varies by band
  (violet reaches ΔE .005 at ΔH 13). Lane-global by construction. Wired into
  warningVariant, pickSignalShift, and collisionStatus pending (non-red). Red rung-1 +
  muted collider stay TYPE-2 (cta ΔE) untouched. *(⛔ 2026-07-10: that type-2 half is
  now the C12 v8 joint solve — rung-1 and the muted collider are deleted.)* Secondaries: both supplied paths note on
  type-1 at SECONDARY_NOTE_MIN_V (any real hue); the DERIVED path gains the same notes
  (was: zero inspection).
- `redRepelShiftDeg` (colorMath.ts): near-pivot exit floors both sides
  (RED_PIVOT_EXIT_DEG 14 — spine drift eats ~3° at the wash; sigmoid floors fade into the
  shipped curves, byte-identical cool of ~H31 / warm of ~H34.5).
- **Post-fix sweep (same 2,720/1,200/1,344 grid): ZERO unfired qualified holes at the
  bar, all four signals, both lanes. Over-fire 0. Swap lane-divergence 0 (the 40 residual
  divergences are red's type-2 value moves — legitimately lane-local). No same-machinery
  value regressions.** Named-brand firing changes (ext-overrides audit, re-bless after
  eye-check): GAINED black-currant + butterfly-pea (info, all 4 lanes), peppermint (green,
  the missing wcag lanes), roster vs-green-teal #65C466 (green, the missing apca lanes —
  the owner's original bug case); LOST taro-latte + lavender-latte (muted violets — the
  family rule), mint-julep (wcag-only lane artifact), roster vs-info-magenta #044BAF
  (blue, value-coincidence not family — **roster exemplar needs re-seeding**, plugin-ext
  decision).
- **Residuals (logged, not fixed here):** (1) yellow DARK degeneracy — dark's gold-spine
  torsion collapses hue in the gold region: 46/258 lemon-fired seeds sit under the bar in
  dark VS THE LEMON (they were equally coincident with canonical yellow pre-fix — no
  regression, but the lemon swap cannot deliver dark separation by hue; needs a value-side
  answer → remedy round). (2) red marginals: 2 seeds at 0.0060/0.00596 ≈ the bar
  (dHueWash 11.4, inside the accepted 11–13 window) — OWNER-CLOSED 2026-07-07: red
  differentiation is at its hue-space limit; anything further happens at the SEMANTIC
  stage, not the ramp. (3) yellow muted-under 16 seeds (v < 0.5, wash-close, unfired) — correct per
  the owner's family rule pending the vividness-threshold eye-check. (4) smoothness drift
  at H33 moved (bigger exit = more identity travel) — mechanical re-baseline after
  approval, per the C6 pattern.

**GOLD BOOST → SIGNAL-ONLY (2026-07-07, same branch — owner-decided after the muting
exploration).** The fired-remedy design round (rendered rounds 3–9: multiplicative → delta
→ corridor solve) surfaced that colliding gold brands were FIGHTING the day-one gold-band
chroma lift (`chromaBoost`, producers.ts: 1 + 1.7·gauss(H−90°, σ35) — initial-commit
vintage, pre-dates all systematic H-K work; ~2.4× for browns, ~2.7× at the yellow signal;
its visible footprint is paper/wash — highlights are ceiling-clamped either way, ink never
had it). Measured: the sRGB gamut ceiling TRUNCATES the amplitude (1.7 vs 1.0 near-
indistinguishable on vivid seeds), so fine-tuning now calibrates against a wall the P3
work moves. Owner: interim dullness acceptable ("no one is using it"), ship subtractive
now, tune after P3. LANDED: `goldBoost` opt (GenerateOptions), passed ONLY by signal
generation (buildSignalScales, swapScale, lemonScale) — brands ride identity chroma;
signals keep their shine; subtle secondaries/neutrals were already immune (chromaCurve
bypasses the ladder). Post-change sweep: still ZERO unfired qualified holes; red's
fired-under marginal CLEARED (red-adjacents carried a ~1.3× lift; worst now 0.0067 ≥ bar);
yellow worst-vs-lemon light margin 3×'d (0.0116 → 0.0341). Snapshot drift: 19 named scales
(all light stops, ΔE .016–.028, worst turmeric-latte wash-7) + 1 highlight-audit drift
(lavender-latte-secondary, full-ramp demo secondary) — awaiting owner eye-check before
bless. Affected gold-band named brands: Golden Milk, Chamomile, Honey Lemon.
**SEQUENCING (owner): P3 master-gamut work is NEXT (docs/engine-spec/P3-KICKOFF.md);
the calibration round (brand-side ID-relative boost re-tune · fired-mute corridor solve
t≈0.4 · green-light signal boost · yellow boundary letter · dark ID-relative counterpart ·
paper-2 chroma) queues behind it.**

**P3 MASTER LANDED — CALIBRATION ROUND OPEN (2026-07-08, branch worktree-p3-master-gamut).**
The engine generates in Display-P3 (7cb2654: D1 both-renditions legality · D2 P3 apca
basis · emit = sRGB gamut-map + color(display-p3) @supports+color-gamut overrides;
design/evidence in P3-DESIGN.md). Owner eye-check APPROVED: signals visibly gain
(green strongest — matches the +29–34% band headroom); D3 ruled KEEP the P3-normalized
pastels ("incredibly similar" to the sRGB-normalized register). One-shot re-bless done
with the sign-off. NEW OBSERVATION for the round (owner, at the eye-check): **the
yellow signal reads ORANGE in dark mode** — dark washes read brown-orange and the dark
cta reads amber. Fold into the round's yellow items (vividness boundary letter + the
dark ID-relative counterpart): low-L yellow is physically brown/orange, so the question
is REGISTER (how light the dark-yellow roles sit and how much of the gold-band lift
they carry), not hue drift — measure `darkCtaTrim`/dark rung L at H83–90 against the
owner's read before proposing anything.

**C8 — YELLOW-BAND EYE-CHECK VERDICTS (owner, 2026-07-08, render/yellow-band.html —
white-column/dark-column exhibit, H55–111 + the canonical yellow signal).** Three
verdicts, three mechanisms; fix HOLISTICALLY as one round, not per-symptom:
(1) **"Dark mode as a whole is going too heavy on orange"** — NOT a P3 artifact
(owner verified: pre-existing, and the sRGB emulation doesn't change the read). The
dark torsion tracks the gold spine, which points at H47–59 at low L: every dark stop
in the band renders ~20° warmer than seed (measured: yellow signal dark s1–s10 at
H62–67 vs seed H84). Knob = WARM_TORSION travel in the dark producer.
(2) **Dark ink-11/12 WRONG on yellow/green seeds (owner: "it's not exaggerated,
it's wrong — ink-12 is supposed to read like body text")** — dark ink chroma for the
band is far above the text register (yellow signal ink-11 C 0.179 = 100% of the P3
ceiling at L 0.87; ink-12 C 0.049 at L 0.97 — visibly yellow body text). Pre-existing
over-chroma that the P3 flip AMPLIFIED (these cells were the flip's largest movers —
the H-K dark solve converges past the old ceiling). Owner missed the band in the demo
pass. = the dark ID-relative counterpart, confirmed as a live defect, text register
first.
(3) **Light gold band reads brown (orange side) / olive (green side) at highlight+cta**
— the C7 gold-lift removal (brands ride identity chroma) + the highlight rung sitting
at L .60–.64 where yellow physics reads brown. = the parked brand-side ID-relative
gold-boost re-tune, no longer truncated by the ceiling.

**C8 verdict-1 DESIGN (owner, 2026-07-08): torsion as a HUE CURVE.** "Most important on
oranges, then macaroni yellows, then warmer yellows, dropping off to none for the cool
yellows" — portable/formulaic (no family flags; consistent with the unified model). Her
calibration reads en route: global-flat 0.17 was only the "safe" compromise; lemon reads
most-lemon at zero torsion; the canonical signal can carry near-full travel. Candidates
rendered (render/yellow-torsion-curve.html): falloff = 1 − sigmoid((H − mid)/soft) on the
dark torsion window weight — A mid96/soft5 · B mid90/soft5 · C mid100/soft6. Await pick.

**C8 V3 — CHROMA-LIFT HYPOTHESIS FALSIFIED (owner round, 2026-07-08).** Rendered the
brand-side lift two ways: gold-band gaussian (amp 1.0/1.7/2.4, ID-ramped) and the
owner-directed hue-AGNOSTIC global ID-lift (amp 1.0/1.7, full circle). Verdict: the
gold band DID NOT CHANGE ("look the same at both") while headroom hues went loud —
measured cause: gold-band highlight-9/10 + ink-11 already sit at 85–94% of the P3
ceiling (reds/blues/magentas 48–57%); the lift multiplied into a clamp. The brown/
olive read is a REGISTER problem: at the placed highlight L (.60–.64) even ceiling-
chroma yellow reads brown. The old H90 gaussian earns no brand-side re-introduction;
next lever = highlight-band L (candidates: HIGHLIGHT_LIGHT root +0.05/+0.09 global,
render/highlight-register.html). Ink-11 cannot lighten (pinned by its 4.5 require) —
if the register fix lands, ink-11's read is re-judged after. Exhibit strips now carry
the ID chip (owner: unjudgeable without the brand identity).

**C8 V3 — CLOSED AS MISREAD (owner, 2026-07-08).** With ID chips added to the strips,
the owner's ruling: "the current register is perfectly fine for every color you
displayed" — the light-column brown/olive read was the DISPLAYED IDENTITIES (the
exhibit seeds at L .62–.78 / C .16 in H55–111 are themselves brown/olive/muddy-gold
colors; the ramps rendered them faithfully). NOT an engine defect. The highlight-
register candidates are REJECTED outright ("we aren't even trying to deal with the
highlights"); the chroma-lift falsification measurement stands as data (gold-band
highlights ride 85–94% of the P3 ceiling — useful for any future band work). Exhibit
lesson recorded: never ask for a judgment without the identity chip on every row, and
muddy-ID rows cannot carry a verdict about the engine. V3 leaves NO open engine work.
REMAINING yellow item = V2 only (dark ink-11/12 text register — owner-confirmed
defect). Bright-yellow IDs in light mode were never explicitly judged — open question
for the owner, not an assumed defect.

**C8 V3 — REOPENED (owner, 2026-07-08): the closure was itself a misread.** Her
correction: the actual problem was never examined — the C7 boost removal ("super
strong, pre-P3") left a gap whose replacement must be (1) scaled by THE ID'S CHROMA
(muddy IDs get nothing — the rendered rounds only showed muddy IDs, so nothing could
show) and (2) hue-distributed by THE AMOUNT OF ROOM ("this isn't necessarily a yellow
round — we are talking about adjusting the hue based on the amount of room; yellow
needs the most room"). Design consequence: no gaussian, no flat global lift — the
engine's existing room-relative envelope (brandSat × maxChromaAt(L,H), today ridden
only by MUTED brands via u) is the natural mechanism: extend the blend to vivid IDs
(weight from ID vividness) and the gamut geometry hue-weights automatically (yellow's
light-stop room is the largest, blue's the smallest). Candidates rendered with BRIGHT
IDs + muddy controls: render/id-envelope.html.

**C8 V3 — SHIP REVERTED (3b95398): owner caught the collision interaction.** Her read
("you took the thing keeping signals from clashing and multi-purposed it into the
opposite") measured TRUE: with the 0.35 envelope, a vivid green brand ON the signal
hue drops to worst wash ΔE 0.0059 — BELOW the C6-accepted 0.006 bar (pre-ship 0.0090);
yellow margin −20% (0.0219→0.0174, still 2.9× bar); red/info unchanged; 2 remedy
firings flipped. TWO findings: (1) the envelope (identity expression) and the parked
FIRED-MUTE CORRIDOR (fired-case separation) are one design — shipping the first
without the second breaks separation exactly where remedies fire; the aesthetic pick
(0.35, bright IDs, owner-judged) stands as the target register for that joint round.
(2) GATE HOLE: sweep:collision asserts qualified collisions FIRE remedies but never
asserts POST-REMEDY wash margins ≥ the bar — the collapse passed the gate. Add a
post-remedy margin check to the sweep in the corridor round. Instrument:
scratchpad clash-margin (checkHueCollision vs effective signal set, ±16° per signal).

**C8 V2 — SHIPPED THEN REVERTED (447591f → revert 455109e, owner-directed reset
2026-07-08, HANDOFF §0.5 step 1).** The dark ink text-register caps (ink-12 flat
DARK_INK12_MAX_C 0.040; ink-11 clamped to the sRGB ceiling) shipped past a dropped
objection; the owner directed them back out. Dark ink-11/12 return to the un-capped
P3 register; the V2 defect (dark ink-11/12 far above the text register on yellow/green
seeds — owner-confirmed) stands OPEN, parked for the holistic ink round mapped by C9
(band limit / text discounts / which registers the H-K solve serves — one design, not
piecemeal caps). Post-revert: src vs the 8c2faa3 re-bless = the V1 torsion curve alone
(verified); gates 12/12 green, zero re-bless.

**C9 — WHY THE INKS WENT NEON (owner asked; traced 2026-07-08).** Root cause of C8 V2:
dark ink-11/12 ride perceptualDarkC — a FILL policy (equalize apparent-brightness
boost across hues) that by construction pumps maximum chroma into the lowest-H-K hues
(yellow-green) exactly where near-white sRGB room is biggest (H120 ink-12 ceiling
.216 → solve converged .213 INSIDE sRGB; pre-dates P3; P3 only un-masked ink-11).
TWO archaeology findings: (1) DOC-CODE MISMATCH — perceptualDarkC's own comment says
bloom is "band-limited to the scale mid-band… the fill + text tiers keep their native
chroma — so ink-11/ink-12 keep their separation," but NO band limit exists in the
code; the text-tier exemption was intent that never shipped (same class as the June
dark-L latent bug). (2) DEAD DISCOUNTS — DARK_STOP_11/12 chromaMultipliers (.95/.62)
only apply on darkInkChromaAt's fallback branch; the darkChromaCurve branch every
real brand/signal takes bypasses them (why H120 ink-12 .213 ≈ ink-11 .234 — the
separation never fired). The shipped V2 caps are the declared register standing where
these two lost mechanisms should have been. OPEN DESIGN OPTION (owner call, not
urgent): implement the described band weight and/or re-route the multipliers through
the curve path — could subsume the caps; V2's caps are correct-by-declaration either
way. Log-don't-fix: nothing changed beyond V2's shipped caps. [Recovered 2026-07-08
from stray main-checkout commit 6c55e4a; written before the V2 revert above — its
"shipped caps" references are historical.]

**C8 V2 — POST-REVERT RE-CONFIRMATION (owner, 2026-07-08, on render/state-comparison).**
"In dark, almost all the ink-12s are still problematic for many colors in yellow" —
expected with the caps out. Fresh measurements for the ink round: dark ink-12 C at
L≈0.97 = H90 0.099 · H104 0.114 · lemon-bright 0.125 (yellow signal 0.049; the
reverted body-text cap register was 0.040); ink-11 rides the P3 ceiling (0.201–0.215
across the band). Defect OPEN, parked for the holistic ink round mapped by C9.

**C8 V3 — NEED TERM CORRECTED (owner design input, 2026-07-08).** Her correction to the
envelope's scaling: the paper/wash lift a brand needs depends on the ID being BRIGHT —
"how much hue and chroma the given id color has." Light-mode ranking from her eye-check
of render/state-comparison: the H55–111 sweep seeds (L .78) need ~nothing; Golden Milk
(#ECAD2F, L .79) needs a little; Chamomile/Honey Lemon need more; lemon-bright the most.
MEASURED: the reverted V3 C-only ramp ((brandC−0.13)/0.04) CONTRADICTS this ranking
twice — it gives the sweep seeds MORE than Golden Milk (0.73–0.76 vs 0.50) and gives
Honey Lemon (#FDCB6E, a pastel at C .125) ZERO. The missing term is an ID-BRIGHTNESS
ramp. Candidates rendered through the real pipeline (render/id-need-candidates.html,
patch-dump-restore, hashes distinct): D = min(1, C/0.13) × lRamp(L; .70→.90) at amp
.35/.50; B = brandSat × lRamp at .35 — both reproduce her ranking (Golden Milk ≈ half
of Chamomile/lemon's lift). STRUCTURAL BONUS: red/green/info signals live at mid L
(.54–.65), so their on-hue vivid colliders take lRamp = 0 — green-onhue and Matcha
margins are byte-unchanged under every candidate; the solo-envelope collapse case
(wash 0.0059 < bar) cannot recur by construction. Margin cost at yellow: worst
lemon-bright 0.0161–0.0177 at amp .35 (2.7–3× bar). FLAG: at amp .50 lemon-bright's
washes cross ABOVE the signal register (w5 0.117 vs 0.094 — the pre-C7 failure shape);
B35 is the only candidate keeping every brand at-or-under the signal register
(lemon w5 0.091). Await her pick; the sweep:collision post-remedy margin assertion
(the C8 V3 gate hole) still lands with whatever ships.

## C10 — dark orange-red band: saturation loss + a break read between highlight-8 and 9

**Status:** OPEN (owner eye-check 2026-07-08 on render/state-comparison: "the orange-reds
lose too much of their saturation and it looks like something starts and stops between
8 and 9"; greens read fine). Log-don't-fix — belongs to the dark calibration round.

Measurements (real pipeline, current tip): (1) the dark L scaffold's largest seam is
s7→s8: ΔL 0.130 vs 0.028–0.070 for every other adjacent pair — the solved 1–7 ladder
hands off to the PLACED highlight band (8–10) in one jump (same seam exists in light,
s7 .79 → s8 .65). (2) Orange-reds add hue travel across the band: Turmeric Latte dark
runs H40 flat s1–s7 then s9 H43 · s10 H45 · cta H48 (seed H40.5); Chai s44→s48, cta
H51 — the C6 warm-side exit (owner-approved, with its logged dark-overshoot knob) plus
the V1 torsion curve compose there. (3) The register itself: dark highlight sits at
L .55–.64 where orange pigment physics reads brown even at C .15–.18 (the dark
counterpart of the C8 gold story — same H-K mechanism, one band cooler). Chili Mocha
(true red, H20 everywhere) shows no break — the read is specific to the orange band.
Candidate knobs for the round (owner decides): the s7|s8 scaffold seam · the C6 dark
overshoot · dark highlight-band chroma/L for H35–55. Relates C6 (open knob), C8 V1/V2.

**C8 — LIGHT COOL-YELLOW HUE SNAP (owner question, 2026-07-08: "why does lemon-bright
look orange-brown at that color? it basically has to get olive — what mechanism makes
it jump from the greeny-yellow darkening to golden tan at 8").** Verdicts from the
candidates page first: B (brandSat form) OUT; D 0.35 vs 0.50 read near-identical; and
ONE RULE only — the "Golden Milk half dose" phrasing was my description of where its
L lands on the single brightness ramp, NOT a per-color case (formula is uniform:
0.35 × min(1, C/0.13) × clamp((L−0.70)/0.20)). MECHANISM TRACED: the light warm drift
(wDrift → lightHueAt, producers.ts) bends every ramp toward the gold spine as stops
darken; its hue weight is the day-one gaussian gauss(ΔH from 83, σ28) — still 0.73 at
H105 — so a green-yellow ramp snaps warm exactly at the s7|s8 lightness drop (light
ΔL 0.20). Measured: lemon-bright s7 H100.6 → s8 H85.6 (−15°), then H84–87 across the
highlight band at L .62–.66 / C .11–.14 = golden tan. Band-wide but family-CORRECT for
golds (signal H84: s7 H85 → s8 H68 is the gold path); wrong exactly where V1 said so
in dark — the cool yellows. Dark got the declared falloff (zero by H104); light never
did. WHAT-IF RENDERED (render/lemon-hue-whatif.html, patch-dump-restore, hashes
distinct): wDrift × (1 − ramp(H, 88→104)) — the dark curve's cool-edge knots, one
hue-keyed rule, all scales (the lemon swap variant included, matching dark V1: it now
holds H107 flat instead of snapping to gold at 8). Verified: below H88 byte-identical
(Golden Milk/Honey Lemon own ramps, canonical yellow signal); H104/lemon-bright hold
identity hue at every stop → olive darkening; Chamomile (H92) highlights ~5° less
golden (edge case for her eye). Margins with the falloff + D 0.35 together: worst
lemon-bright 0.0148 = 2.5× the 0.006 bar (tightens because brand AND lemon variant
both hold cool hues). AWAITING: her verdict on the falloff + the amp re-judge
(0.35 vs 0.50) on the fixed page. Nothing shipped.

**C10 — SCOPE CORRECTED (owner, 2026-07-08): "not specific to orange, it shows up in
every ramp. it's just like a big c jump... 8 that much duller than 9."** Measured TRUE
and hue-agnostic: LIGHT s8 chroma = the wash ladder's top constant (LIGHT_BASE_C ends
0.112) while s9/s10 = the highlight machinery's own constant (HIGHLIGHT_LIGHT.baseC
0.142) — a +27% step for EVERY brand at EVERY hue (muted brands carry the same ratio:
Earl Grey .061→.078). Why it reads as a break, not a step: s8's L sits at the 3:1
contrast floor (~.63–.65 = highlight territory, the stop-8 WCAG clamp), so two stops
at near-equal lightness differ by a quarter of their chroma; near yellow s9 is also
LIGHTER than s8 (H104: .64→.67) — darker AND duller. Root shape: the accent re-bucket
(ea0a265) ruled stop 8 INTO the highlight family, but generation still treats it as
top-of-wash — the label seam moved to 7|8, the chroma seam stayed at 8|9. Signals
never show the dip (their boosted s8 is ceiling-pinned — byte-identical under the
what-if). The earlier orange-red framing above stands only for the DARK part (s7|s8
ΔL .130 scaffold seam + warm travel — dark round). WHAT-IF RENDERED
(render/s8-register-whatif.html, hashes distinct, diff-set verified = {stop 8} only):
LIGHT_BASE_C[8] rides the highlight register 0.142; the 3:1 L floor re-solves within
±.01; Earl Grey's s8 lands exactly on its s9; Blue Lagoon's s8 sits a hair above its
gamut-clamped s9. Awaiting owner verdict alongside the falloff + lift picks. Dark's
+5% step and L-seam remain parked for the dark round. Nothing shipped.

## C11 — ink-band apparent-lightness wobble: the H-K promise breaks where requires and ID-relative chroma cross

**Status:** OPEN (owner eye-check 2026-07-09, desaturated render/s8-register-whatif screenshots:
"we should be seeing these colors normalize with hk, but red looks much darker than yellow…
when you desaturate it it's very obvious how much wobble there is"). Log-don't-fix — joins the
C9 holistic ink round. Nothing shipped.

**Measured (scratchpad wobble.ts — 24 seeds: named brands + H0–330 sweep + red/yellow signals;
light stops 8–12; apparent = engine apparentL; pin classification via legalRatio vs own paper-2):**
- s9/s10 (H-K-solved highlight rungs): apparent spread **4.2–4.5 L\*** — equalization WORKING
  (Chili 55.8 / Golden Milk 55.5 / Chamomile 55.5 at s10).
- **s11: spread 10.4 L\*** — 9/24 seeds PINNED at the 4.5 require, 15/24 sit below it. Owner's
  case measured: Chili Mocha s11 apparent 44.1 (L .396, C .180, ratio ≈ 7 — far below the pin)
  vs Golden Milk 52.0 / Chamomile 50.3 (both PINNED at 4.5). Two owners → two registers.
- s12: spread 7.0 L\*, 24/24 below-pin (the 7.0 AAA floor never binds; scaffold+solve own it).
- s8: spread 9.9 L\* (the wash|highlight seam story, C10 — solve-owned with the emit margin).

**Mechanism, two causes compounding:** (1) the 4.5 require CAPS max L per hue — high-luminance
hues (gold band) get sliced at the pin while low-luminance-capable hues (red) solve far darker;
(2) ink chroma is ID-RELATIVE (chromaMult × brandC: Chili .180 vs Chamomile ~.14 at s11, .100
vs .075 at s12), and the H-K solve target moves with the stop's chroma — so even unpinned seeds
land at different apparent registers. Same root as C9's dark neon: ink chroma is unnormalized;
the text register is owned per-ID instead of per-band.

**Options for the owner (the ink round, one design):** (a) accept — the pin is law and the
spread is the cost of ID-relative ink chroma; (b) normalize ink chroma to a text register
(the C9 band-limit/dead-discount design, applied to BOTH modes) — collapses the solve-target
variance and most of the wobble in the same stroke as the dark ink-12 fix; (c) anchor the
light ink apparent target at the pinned register band-wide (pin-aware solve). Exhibit with
desaturated columns queued for the morning summary.

**OVERNIGHT ROUND SHIPPED (2026-07-09, owner asleep — carried per her explicit delegation;
NOTHING PUSHED).** Commits 5df1ac9 · a5fd7e9 · 8bc57b9 (+ lift 5f3bf1b reverted 77526f9):
- **C10 RESOLVED — THE SCALE CHROMA TABLE (5df1ac9):** SCALE_C_LIGHT/SCALE_C_DARK are the
  single declared source of per-stop chroma params; the stitched constants are DELETED.
  Dark byte-identical (verified across brands+signals+overrides); light 8–10 share the
  0.142 register — INCLUDING the signals' own ramps (unified model): red/green/info s8
  closes its own 8|9 break (ΔE .030–.043; green s8 lands exactly on its s9 register).
  Yellow signal untouched (ceiling-pinned). Byte-proof: shipped dump == the owner-judged
  composite, cmp exact.
- **C8 cool-yellow falloff SHIPPED (a5fd7e9):** light wDrift fades H88→H104 (the dark
  curve's cool-edge knots); lemon + the lemon swap variant hold identity hue; below H88
  byte-identical; residual footprint past the edge sub-perceptual (worst ΔE .0024).
- **STRUCTURE GATE audit:register (8bc57b9):** table shape (8–10 one register; bounded
  wash steps) + spec↔table binding + banned reappearance of the deleted constants.
  "The stitching is fixed" now MEANS this gate is green — the owner's make-it-stick ask.
  Plus sweep:collision asserts LIGHT post-remedy wash margins ≥ the bar (the C8 V3 hole).
- **THE ID LIFT IS HELD (5f3bf1b → revert 77526f9), owner decision pending:** the new
  assertion caught it FIRST RUN — the lift grazes the owner-closed red dH0 marginal
  (#ff977e L.80 bright on-hue: wash 0.00604 → 0.00586 < the 0.006 bar, both lanes, 1 seed
  class; measured pre/post, the lift owns the whole delta). Red-on-hue is at its hue-space
  limit per the owner's own C7 ruling — register gap is the only lever there, and the lift
  narrows it. OPTIONS FOR HER: (a) accept 0.00586 within the C7 ruling and encode the
  red-dH0 marginal properly in the gate; (b) the fired-mute corridor round (near-signal
  register discipline restores the margin structurally — the standing V3 coupling, now
  measured to bind the brightness-ramp variant too); (c) reshape the lift. Re-land = one
  revert of 77526f9. The VIVID_LIFT_* constants stay declared (dormant) as the landing pad.
- Gates 13/13 green (incl. audit:register), ZERO re-bless — every drift inside tolerance.
- Morning pages: render/round-before-after (both modes) · wobble-c11 (color vs desaturated
  + C11 numbers; s8 apparent spread widened 9.9→12.7 L* with the register fix — luminance-
  pinned stop, data for the ink round) · room-clamp (the hue-agnostic base measured: 5/24
  highlight stop-cells clamped below the declared register, cyan/blue worst — the
  fraction-of-room semantics flip is the rendered-option answer, owner-gated).

**C8 V3 — RULED (a) AND RE-LANDED (owner, 2026-07-09: "A is acceptable as is").** The
red on-hue bright marginal (0.00604 → 0.00586) is accepted within her C7 hue-space-limit
ruling; the lift is live (re-land c073802) and the exception is a named owner-cited floor
in sweep:collision (RED_ONHUE_ACCEPTED_FLOOR 0.0058, red dH0 only — further erosion still
fails). Gates 13/13, byte-match to the judged composite re-proven on the live tree.
BONUS RESOLUTION: the owner's secondaries observation ("secondaries end up looking more
saturated at times") measured and CLOSED by the same ruling — the derived pastel is
room-relative (35% of ceiling) while the primary rode the absolute ladder, so at big-room
hues the pastel out-saturated its own primary (#FFF700 s3: 0.059 vs 0.022); with the lift
live the primary washes rise past the pastel (s3 0.065, s5 0.103 vs 0.080) — family
hierarchy restored with no secondary-side change. STILL OPEN FOR HER: the ink round
questions (C9/C11 — three questions posed) and the orange-cta reverse exploration
(two candidate shapes offered: fade-the-darkening-by-hue vs flip-who-moves).

**C8 V3 — AMP RULED 0.50 (owner, 2026-07-09).** Live-demo eye-check: "50 looks better";
#fff700 register-cross vs the yellow signal accepted ("acceptable"); red on-hue drift
0.00586 → 0.00580 accepted ("the difference is imperceptible") after render/red-onhue-compare
(magnified closest pairs; 108-seed band scan = ONE seed class under bar, dH0 L.80 C.17 only,
±3° clears). Shipped 6c804e3: VIVID_LIFT_BLEND 0.50 + RED_ONHUE_ACCEPTED_FLOOR 0.0057
(red dH0 only — the ratchet against future erosion). Gates 13/13. The yellow calibration
round's light side is now CLOSED: table + s8 register + falloff + lift all live.

**SEQUENCING (owner, 2026-07-09 after push): branch PUSHED to origin/main (5804023 →
deaffaf) for plugin testing; remaining work = fine-tuning. INK ROUND (C9/C11) DEFERRED
by owner ("skip the wobble in the inks for now" — resourcing). NEXT = red de-collider
round, VISUALIZE FIRST then plan: (1) exact-mode on-text legibility — measured: choice
logic always picks the best pole (0/288 suboptimal), but 34/288 agnostic seed-lanes are
TRUE dead zones (best pole Lc < 60; worst 55.8, mid-vivid pinks/corals) — exact cannot
move the fill, so "guarantee" needs a design answer; (2) "red moves" shape — brand cta
keeps vivid identity, the red signal cta takes the dark treatment per-brand (lemon-swap
family, value axis); (3) outline-cta shape — colliding hues ship cta-border = cta color,
cta-1/2 transparent, label ink-11. Both rendered as buttons-in-context:
render/red-decollider-viz.html. Side task spawned: cta-stroke → cta-border rename
(owner's naming correction; Figma-variable migration question flagged).**

**C9 + C11 — INK ROUND LANDED (owner ruling 2026-07-09: "(b) only" — (c)-alone ruled out
("doesn't solve crazy yellows"); (b) vs (b)+(c) judged imperceptible in rendered context).**
THE FIX (option b, the text-register normalization, both modes — one declared mechanism,
no emit-side caps; the C8-V2 lesson):
- SCALE_C ink entries gain `inkMaxC` (the text-register ceiling): light 11/12 = .150/.080,
  dark 11/12 = .120/.045. Ink chroma = min(inkMult × brandC, inkMaxC) — muted brands sit
  below the ceiling untouched; the ceiling feeds the PLACEMENT SOLVE, so L and apparent
  register fall out of the pipeline.
- TEXT-TIER EXEMPTION (the C9 band limit, realized at the consumer): darkInkChromaAt no
  longer calls the perceptualDarkC fill policy — the dead DARK_STOP_11/12 discounts
  (.95/.62) live again on the only path real brands take, normalized to the register.
  perceptualDarkC's lying comment corrected.
- placeLightText consumes the normalized chroma at every step (anchor solve, require
  clamps, emit).
MEASURED (24-seed instrument + 19-seed yellow range, real pipeline, exhibits
render/ink-round.html + render/ink-round-yellows.html, data render/ink-round-data/):
dark neon DEAD — lemon-bright ink-12 C .166→.045, H120 ink-11 .234→.120, dark s12
apparent spread 1.1→0.0, s11 5.9→2.4; light s11 spread 10.4→8.0, s12 7.0→5.4 (excl
rung-1: 5.8/2.2). Light YELLOWS: all 19 pin at 4.50 exactly — register uniform by law,
byte-identical pre/post; residual 5.6 appL spread = what equal-4.5 reads across the band
(cap-owned). Gates 13/13 green, ZERO re-bless (drift inside tolerance).
NOT TAKEN: option (c) pin-aware solve (perceptualTextRungL, inkRefC) — measured (light
s12 excl-rung-1 0.2; tuned refC .045 → s11 0.8, zero pins) and archived as
render/ink-round-data/option-c.patch / option-bc.patch for a future light-wobble round.
OPEN LEFTOVERS: (1) apca dark s11 under the new register floor-pins 24/24 (spread
5.7→9.2) — the Lc-75 floor × register interaction wants its own look in the apca lane
round; (2) light s11 pin-slice (the 4.5 cap register) stands, cap-owned by design;
(3) dark s11 inkMaxC .120 is an owner-tunable knob (judged acceptable on the yellow
specimens).

## C12 — the red-family collision: a brand cta beside the red signal reads error-look or vibrates

**Found (owner screenshots, 2026-07-09/10):** a brand whose cta lands near the red signal's cta
fails in TWO distinct ways that no one metric covers — (A) **error-look**: the brand cta could be
MISTAKEN for the red signal at a glance (a category, calibrated by her 100 raw button-pair marks →
`redGateDist`, P1); (B) **vibration**: brand cta and red cta read as a clash when ADJACENT (a
perceptual distance — her 9 flush-strip marks sit at one helmlab MetricSpace radius, mean .116,
CV 12% → `p2Diff`, P2). Neither metric can do the other's job (helmlab research record). Earlier
single-mechanism attempts (C6 repel, rung-1, the muted collider, the vivid-arc opposed split)
each covered a slice and left holes.

**LANDED — the v8 JOINT SOLVE (owner-settled 2026-07-10, "as close as we will ever get"; model =
docs/engine-spec/c12-archive/joint-solve-model.md; pushed 5e440ff):**
- **Brand side (`solveBrandExit`, producers):** membership = the cta formula at the seed's own L
  inside the widened region (`redSolveDist ≤ G`, wDark .60) or the warm brick band. Exit = nearest
  release edge (region + ring .020) with a passing pole, under her direction rules: noticeably-
  magenta (dh ≤ −14, not deep) lightens · gold-side vivid flips up to bright orange · on-hue vivid
  takes the big dark throw · else nearest edge. Dark landings inside the brick band (H20–50,
  L.36–.52, vivid ≥ .55) take the DIAGONAL (−4°/−3° soft cool, C×.85, +.02 deep — burgundy, never
  the hard cool). Rung-1, the muted collider, `exitCtaL`/`ctaArcCapL`/`ctaArcTargetL`, and C6's
  `applyRedRepelRender` died with the round.
- **Red side (`redComplementVariant`, engine/resolve):** the red signal complements from her
  calibrated zones — deep core L .45–.49 or the light edge tier .65–.75 (the .50–.58 middle is
  ring territory, canonical lives there) — opposite side of the brand's FINAL cta; cool-first
  beside warm brands; brand-up ⇒ deep red always. Canonical red never lightens.
- **TRUE-RED DIRECTION (2026-07-11, f7245df):** the vivid ≥ .85 carve shipped high-L/less-vivid
  true reds the exact-mode-safety pattern (brand bright salmon + red deep) instead of the dark
  throw. Her 27 marks decode to a BRIGHTNESS cutoff, not vividness: an on-hue red drifting UP
  keeps the bright landing only when the up-exit lands ≥ `trueRedBrightCut` 0.67 (per-lane by
  construction: wcag up-exits ~0.65 → dark; apca ~0.69 → bright). Scoped strictly on-hue — a
  global gate deletion cascaded into pink/orange and was caught; vivid ≥ .85 stays dark (owner-
  approved greys). Movers incl. derived secondaries (butterfly-pea's red accent).
- **DARK (2026-07-11, 858053e): the dark cta falls out like every cta — the same solve on dark
  geometry, keyed on P2.** The prominence floor piled every near-red brand's dark cta at ~L0.70
  beside red's dark cta, and the sweep was BLIND to it: `redGateDist` passes the vibrating pairs
  (0.11–0.20) while p2 reads 0.086–0.109 — the P1/P2 split resurfacing in dark. `solveDarkCtaExit`:
  member = p2 < `P2_D_UP` beside the lane's red dark cta (`ctaSolve.redDark`) → travel the nearest
  direction to p2 ≥ `P2_D` with a passing pole; red dark stays canonical. All movers = apca
  near-reds lifting ~0.70→0.77 (brighter = more prominent); wcag never fires (red dark 0.585 vs
  floor 0.70 already separates). The collision-sweep dark assertion switched `redGateDist` → p2.

**Ruled out on computation (the dark round):** `loudnessFloor(H)` — a hue-keyed floor gives all
reds ONE floor and re-piles same-hue pairs at red's own level (the owner's #FF2600 case WORSENED,
p2 0.087→0.078); "+40% uniform carry" — the delta carry INVERTS lightness and collapses ring-zone
near-reds; carry/variant hybrids — each cleared one lane and failed the other 12/70.

**Measured at landing:** light mirror 50/50 + 26/26 + 70/70 hex-asserted vs the owner-accepted
pages · collision-sweep 2720/2720 both assertions (light P1 release, dark P2 release) · dark
over-fire 3/576 full-wheel (all within dh −4…+8) · signals/exact/secondary byte-identical at
each step · ext/divergence/highlight re-blessed per round (movers only).

**Known-and-accepted:** exact mode is HANDS-OFF (a consumer's true red BECOMES the red signal —
unification is the open follow-up task) · 3 apca dusty-rose ring-zone pairs ship canonical (p2
passes) · the dark P1 gate weights and p2 bars are LIGHT-calibrated (her marks were light pairs);
a dark-native calibration round is queued if her eye disagrees with a passing dark pair.

## C13 — dark mode was a second hand-tuned system: the seed-keyed DARK_L scaffold vs "dark = a function of light"

**Found:** the dark ramp was built from its own hand-placed scaffold (`DARK_L`, the lift,
`perceptualDarkC`, `torsionedHue`, `darkCtaTrim`) — an independent second system that had to be
re-tuned for every light change and drifted from the brand's own light identity (dark washes loud,
blue-recede patches, per-mechanism knobs).

**LANDED (owner rulings 2026-07-09, the delta round):** dark is a LIVE FUNCTION of the resolved
light, by recipe class:
- **Surfaces 1–9 (papers/washes/fill/highlight): the carry.** Chroma + hue carried verbatim from
  the light twin (OKLab C is near-uniform in perceived chroma; a saturation/gamut-ratio floor was
  tried and REJECTED — sRGB gamut geometry made blue→red washes hyper-chromatic). Lightness
  re-referenced to the dark ground (0.178, never absolute black) in APPARENT-lightness space
  (Nayatani H-K — the same space light itself is placed in; a raw-luminance re-reference was tried
  first and REJECTED: it warped light's cadence into dark = measured wobble |Δ²appL| 4.10 vs 3.58,
  and stripped yellow's H-K shine).
- **Requirement stops carry their RECIPE, not a parity.** s8 is placed BY its 3:1-vs-paper-2 law
  against the dark paper-2 exactly (light places s8 by the same law; apparent-parity-then-floor
  was the residual sRGB-shaped hue wobble, floor firing 84/108). All floors move ONLY L — C/H stay
  carried (delta-purity: FULLY PURE, stops 1–9).
- **Band order is carried structure:** the highlight fill (9) sits above its 3:1 rung (8) — free
  geometry in light, inverted 108/108 in dark under apca (the rung's luminance law reads
  hue-dependently in apparent terms). 9 is floored at the rung's apparent + light's own 8→9
  apparent gap. Under apca, hl9 also honors the declared body bar (ons.onHighlight.enforceLc 60,
  raised via the black pole — the band floor could land low-chroma neutrals in the mid dead zone).
- **Inks 11/12 are DARK-NATIVE, never carried:** text INVERTS across modes — no "same color,
  re-referenced" exists for a stop that crosses the paper (carrying a dark-gold ink up ~0.3 L lands
  in a different hue family: gold→orange). The C9/C11 dark text register + T11/T12 requires own
  them (the seed-keyed ink path).
- **The cta is PROMINENCE-FLOORED, never carried:** parity reproduces a bright brand's whisper
  (neon yellow's light cta ≈ white → a near-black dark cta, legible but brand-dead). The dark9L
  floor + darkCtaTrim'd brand chroma anchor it; the legibility enforce stays. (`darkCtaTrim` is
  thereby REPURPOSED from bolt-on to the cta's declared loudness rule.)

**Deleted with the round:** stop 10 (no use case; its shared-token PAIR law + all 9→10 hover
machinery died with it — see the 778d4b4 ledger), the dark require-floor's 1e-3 slack (92e4b6b),
the delta env gates (DELTA_DARK/DELTA_CARRY — the carry IS the model now).

**Ruled out on the A|B bolt-on exhibits:** H-K scaffold placement (perceptualRungL re-anchoring
the per-stop scaffold), perceptualDarkC chroma equalization (the neon mechanism), the lift/recede
floor (the carry's ground re-reference already prevents recede), the dark ink-register-on-carry
hybrid, the 9→10 hover.

**Measured at landing:** req:audit 0/288 both profiles · collision PASS · highlight lanes light
63.6 / dark 60.5 Lc (4.51/4.50 wcag) · stop-8 3:1 both modes (576-pt agnostic) · hue-sweep
smoother than the old scaffold at every stop outside the designed red-repel jump (s7 1.36→0.48) ·
down-ramp wobble 1–7 = 0.72 (old scaffold 3.00) · dark-audit/divergence/highlight/ext/smooth
re-blessed wholesale (the round's expected bless).

**Known-and-accepted:** near-black brands read gray-muted in dark (Hunt territory — owner:
"appropriate for the color"); residual hue-band ripple around orange/yellow exists in LIGHT too
(inherited structure, a future light-side round if ever); the H33 red-repel jump is the shipped
C6 design.

## C14 — the ink renumber: closing the stop-10 gap (ink-11→10, ink-12→11, anchor ink-13→12)

**Found (2026-07-10):** the stop-10 deletion (778d4b4, C-era note at the C12/C13 boundary) left the
numbered scale non-contiguous — `1–9, [hole], 11, 12` — which reads as a bug to anyone meeting the
system fresh, plus stale drift the deletion never cleaned ("12-step scale" in docs/scale.md, "stops
9/10" comments across the engine and sweeps). The deletion entry recorded "no rename cascade" as the
rationale at the time; the owner has since ruled the gap itself confusing and ordered it closed —
this entry supersedes that aside, not the deletion (stop 10's second highlight step stays dead).

**LANDED (owner-approved plan, 2026-07-10):** full renumber, names AND internal stop numbers in sync
(`stopTokenName(10) === 'ink-10'`), one atomic commit:
- **ink-11 → ink-10, ink-12 → ink-11** (the resolved text stops; 4.5:1 / 7:1 requires unchanged,
  `inkMult`/`inkMaxC` registers byte-identical — only the keys moved). `T10`/`T11` requires,
  `STOP_10_CONTRAST`/`STOP_11_CONTRAST_FLOOR`, `stop10DeepenL`/`stop11DeepenL` renamed to match.
- **ink-13 → ink-12** (the universal anchor, #000000/#ffffff mode-flipping literal paired with
  paper-0). Still OFF-scale semantically despite the contiguous number — a constant, not a
  per-brand resolved stop (docs/scale.md carries the callout).
- **Figma migration:** both plugins' `RENAMED_LEAVES` carry the three entries in ascending order
  (the self-deleting migration map makes ascending processing the safety condition — documented at
  the table). plugin/'s legacy `system/ink-13` theme migration retargets to `neutral/ink-12`; the
  STATIC_UTILS anchor seed migrated via getOrMigrate instead of raw get so existing files rename in
  place (bindings survive, no orphans).
- Every hand-duplicated consumer (tokens/semantic.css, demo/*, sweeps/audits' stop predicates)
  renamed in the same commit; snapshots re-blessed name-only (the value-drift gate: any hex/L/C
  delta in the re-bless diff = a mis-keyed register = revert).

## C15 — the on-cta razor + the one-sided enforce: Lc-60.0 ships, dead-zone fills ship the better-of-two-failing pole

**Found (owner eyedropper, 2026-07-11, #E93D82):** white on the pink's dark cta read Lc 58 on her
external checker — the engine shipped it at 60.0–60.2, a razor pass with zero headroom (screenshot
color management, 8-bit rounding, and APCA-version skew each eat ~1–2 Lc). Two structural holes
behind it: (1) the apca enforce FIRED only under 60 and SOLVED to 60.5, so the entire enforced
class landed inside the razor band by construction (agnostic sweep: 222/384 apca ctas in [60,62)
or under); (2) the enforce was WHITE-POLE ONLY — the judge correctly picks the better pole, but
better-of-two-failing isn't passing, and no lighten-for-black solver existed (Lc 54.7 greens
shipped) — the same one-sidedness the wcag-lane clearance (2169337, gated default-OFF) fixed for
light. The only assertion was dark-audit F's report-only "APCA 45" — a very-large/bold headline
minimum by APCA's own guidance, never a text bar, so nothing ever flagged.

**LANDED (284f122, owner-accepted on render/c12-apca-enforce.html):**
- `APCA_ENFORCE_MARGIN_LC` 2: both apca cta enforcers fire under threshold+2 and solve past it
  (+0.5 solve margin) — nothing ships at the bar's edge.
- Pole-symmetric enforce, both modes: black under-reads → LIGHTEN via `findLForBlackTextLc`
  (cap 0.92), each pole fixed in its own direction. Both solve poleOks (`solveBrandExit`,
  `solveDarkCtaExit`) honor the same margin — release landings can't ship the razor either.
- dark-audit F: HARD gate, chosen-pole Lc ≥ 60 on the cta, both modes, shipped lane, exit-1.
  The wcag 4.5 ratio stays the wcag lane's own contract (req:audit asserts per-lane).

**Measured at landing:** 222/384 razor-or-under → 0 under 62 · F 26 standing failures → 0, gate
load-bearing · her 27 C12 marks reproduce · interplay accepted: near-red apca light landings ride
the margin (0.69→0.78, black text takes the pole) and dark p2 movers repositioned, all ≥ 0.117
vs red.

**Known-and-accepted:** the pole judge is P3-basis by owner ruling (D2) — the same physical color
reads up to ~2 Lc apart between bases, which the margin absorbs; external sRGB checkers on a P3
display measure a converted pixel, so razor-adjacent readings will always disagree slightly across
toolchains — the margin, not basis litigation, is the defense.

## C16 — the dark cta's chroma mechanism was undeclared: `darkCtaTrim` + the `loudCta` opt-out lived outside the SCALE_C contract

**Status:** CLOSED (owner ruling 2026-07-12: **(a) declare, don't change** — executed same day,
byte-identical, sha256 hash proof over signals + 72-brand sweep + themes, both lanes).
Audit round 2026-07-09 (owner question out of the C12 round: "why does loudCta still exist?");
exhibit + harness parked on `audit/loudcta` @ b0e1a70.

**What the flag was.** `loudCta` was consumed exactly once (producers.ts buildDarkContext):
`darkC9 = darkChromaCurve && !loudCta ? brandC × darkCtaTrim(darkH) : brandC`. No light-mode
effect. Signals set it (buildSignalScales + the swap/lemon variants); brands never. Shipped
asymmetry: **brand dark ctas chroma-trimmed** (×0.88 generic, ×0.766 near blue 265° / ×0.781
near red-magenta 345°), **signal dark ctas identity** — canonical yellow #ffc53d and red
#d94121 byte-identical light↔dark (the flag's purpose since the unification, ac81b36).

**Measured (2026-07-09 audit, agnostic 12-hue × 3-L sweep at C 0.18, real pipeline,
patch-dump-restore with hash proof, both profiles):** brands untrimmed = 70/72 dark ctas
change (median ΔE 0.026, max 0.139) + two apca rows flip on-cta polarity via the Lc enforce
re-solve; signals trimmed = ΔE 0.018–0.041 (info worst, blue lobe). Gates green in all three
states but collision lane-divergence moves 47→71/58 — the flag was load-bearing at margins.

**The structural finding (the C10 lens).** C10 ruled scale chroma mechanisms must live in one
declared table with a gate — but its scope ended at the scale. The cta is off-scale; its dark
chroma policy was a hidden per-caller boolean branching into undeclared curve constants. The
name compounded it: `loudCta` never made anything loud — it *skipped the brand trim*.

**Resolution (a, executed):**
- `DARK_CTA_C` declared in stopTable.ts beside the SCALE_C tables — brand = trimmed register
  (globalTrim 0.76 + the two lobes, values verbatim), signal = identity. `darkCtaTrim`
  computes from the declared numbers; the local constants are gone.
- The boolean is retired: `GenerateOptions.darkCtaC?: 'brand' | 'signal'` (default 'brand');
  signal callers pass `'signal'`. `loudCta` joins register-audit's banned-names list.
- register-audit §4: (i) binding — `darkCtaTrim` must match the declared register (72-hue
  probe); (ii) identity — yellow/red dark ctas byte-match light through the real pipeline,
  both lanes, ≤1 8-bit step (the C15 apca enforce margin nudges red one step; the trim this
  guards against moves 10+ — policy and enforce noise separate cleanly).
- Instrument drift fixed: divergence-audit's BRAND_FLOOR dropped `loudCta: true` — it now
  measures synthetic brands in the state production ships (trimmed). Snapshot unchanged.

Relates: C6 (warm-side dark cta), C10 (declared-table principle), C12 (the brand-vs-signal
asymmetry the owner saw), C15 (the enforce margin that nudges red-apca one step).

## C17 — the info-color signal renamed to `blue`; the magenta shift is an accepted loss

**Status:** CLOSED (owner 2026-07-13: "info-color can now be named a color name. i think we
can call it blue now that it is only purple-blue or cyan-blue").

**The loss that enabled the name.** The 2026-07-11 seed lift (2169337, apca-legible seeds)
lightened+desaturated the info seed `#6E56CF → #AFA3FF` (hue held ~289). The seed's wash
tints stopped drifting toward blue, so blue-family brands (< splitH 273 — the only class
that takes the magenta side) no longer land within the 15° wash-hue collision window: the
magenta shift became structurally unreachable. Measured: primary gate — roster `#044BAF`
produces zero info overrides (was the magenta exemplar); secondary adoption — 0/288 themes
probed. The loss was observed and blessed at the seed-lift eye-check ("roster exemplar needs
re-seeding") — this entry closes that thread as ACCEPTED, not re-seeded: no natural brand
reaches the magenta half of the post-lift geometry.

**The rename.** With only blue directions remaining (identity ~H289 purple-blue; the swap
variant #6AB5FF cyan-blue), the signal takes its identity name: `info-color` → `blue`
everywhere — def name + union, SHIFT_RULES key, swap notes (`blue → magenta-side` /
`blue → cyan-side`, matching green's -side convention), CSS vars `--info-color-*` →
`--blue-*` (semantic `--info-*` aliases stay, now pointing at blue), demo labels, roster
fixtures (`vs-blue (shifts cyan)`; `#044BAF` relabeled `vs-blue (no shift)`).

**Figma migration.** Both plugins migrate IN PLACE (variable ids survive, bindings hold):
`RENAMED_GROUPS` (`system/info-color/* → system/blue/*`, theme `info-color/* → blue/*`) +
variant-leaf entries for the relabels (`blue-<ctaHex> → cyan-side-<ctaHex>`, both lanes),
composed with the existing leaf renames so a file untouched since before the ink renumber
migrates `system/info-color/ink-11 → system/blue/ink-10` in one lookup.

**Proof.** Values-only sha256 over signals + brand sweep + themes, both lanes: identical
pre/post. Snapshots re-blessed name-normalized (ext + divergence proven name-only;
dark-audit refresh also absorbed 4 pre-existing sub-tolerance numeric staleness entries —
verified present in a pre-rename bless, not from this change).

**The magenta machinery stays** (SHIFT_RULES.below + signalSwapVariants offer) pending an
owner word on deletion — unreachable on both paths today, but removal is a capability cut.

Relates: C7 (collision gates), the 2169337 seed lift, C15 (the apca enforce that motivated it).

## C18 — wcag cta cross-metric dead zones: the APCA clearance is default-ON for brands

**Status:** CLOSED (owner 2026-07-13, ruled on render/cta-deadzone.html: "goal is to pick
closest to id that passes apca on both in dead zone. This looks like candidate 1 in both
apca and wcag OR candidate 1 in wcag, shipped in apca." Signals explicitly excluded —
static-seeded, already apca-legible by the 2169337 seed lifts.)

**The dead zone.** A wcag cta whose ratio-passing pole fails the shipped APCA bar — legally
passing, perceptually weak. Measured pre-fix: 28/96 agnostic sweep seeds (mid-light brands,
black pole at ratio 5.8–9.3:1 reading Lc 40–60); 0/96 in the apca lane (its enforce
guarantees its own bar). Owner case: green #22a559 — wcag black 6.59:1 at Lc 45.3 while
apca ships white Lc 64.2. The default wcag lane had no lighten-for-black and no
darken-and-flip: the pole judge locks the ratio-passing pole before any fill solve.

**Resolution (the owner rule, per lane):** ship the fill closest to identity whose chosen
pole passes the APCA bar. The apca lane already satisfies it (unmoved). The wcag lane now
runs the pole-preserving clearance ALWAYS: `resolveBrand` defaults `apcaClearance` ON →
`ctaDualGateL` after the near-red guard — black pole lightens / white pole darkens until
the pole clears bar + margin (fire/ship at 60+2+0.5, the C15 razor lesson), 4.5 stays the
hard floor. The ±0.16 taste budget is RETIRED (it capped worst-case dead zones short of
legibility); caps are now the pole caps [0.05, 0.92]. Post-fix sweep: 0/96 dead, both lanes.
Green ships #72c681 (black 9.89:1, Lc 62.5) under wcag — candidate 1.

**Interplay (by the clearance design, C15-era):** with the clearance on, the wcag brand-side
red exit (solveBrandExit) is off — the red COMPLEMENT variant de-collides the signal against
the brand's final cleared cta. Collision sweep: zero unfired holes, both lanes, post-change.
Named-brand firing changes re-blessed (hibiscus gains a red variant; turmeric-latte,
roster/L4-vivid, vs-red-warmer no longer need theirs — their cleared ctas stand clean).
Divergence re-bless: 11 scales, all the cta slot, all intended movers. Signals, neutral,
and the entire apca lane hash-identical.

**Scope + residuals:** LIGHT mode wcag. The wcag DARK lane still has only the white-darken
enforce (no lighten-for-black) — dark dead zones unprobed, follow-up. Exact mode untouched
(enforce off). The opts.apcaClearance flag remains as an opt-OUT for instruments.

Relates: C15 (the margin + pole-symmetric apca enforce), the 2169337 clearance/seed-lift
round (whose parked default-on this executes), C12 (the red interplay).

## C19 — the cta family expands to six SEMANTIC tokens: cta / cta-hover / cta-pressed + the cta-ink trio

**Status:** CLOSED (owner rulings at planning, 2026-07-16; diff owner-approved same day).
Phase 1 of the five-phase roadmap (plan: five-lever roadmap 2026-07-16 — the APCA include
toggle, the neutral cta escape, the cta-ink custom-color toggle, and the vividness lever
follow as their own phases).

**The respec.** The cta group grows from two tokens (cta-1/cta-2) to six, and the emitted
names go SEMANTIC (owner: "more understandable, and keeps people from thinking they are
options for different ctas; they are only ever going to be hover and pressed"):

- **Fill trio** — `cta` / `cta-hover` / `cta-pressed`. Pressed = hover's direction,
  DOUBLED (`pressedL`, archetypes.ts: `delta = 2 × 0.03/(L+0.1)`, same lighten-below-0.40
  rule); chroma re-evaluated at the pressed L through the same register, hue constant.
  Pressed tracks every cta re-emit (light single mint; dark base / enforce / p2-exit) and
  the pinned red-complement mint. No dark-chroma policy of its own (register-audit
  untouched). Neutral + subtle-secondary quiet ctas extend their scale-fed rule: rest =
  stop 4, hover = stop 5, pressed = stop 6.
- **Ink trio** — `cta-ink` / `cta-ink-hover` / `cta-ink-pressed`: the family's 4.5
  TEXT-register cta, the link-color escape. Rest MATCHES the resolved ink-10 exactly
  (owner rule; the v1 plugin writes it as an ALIAS to the sibling ink-10 — the
  on-cta→ink-10 idiom — so the relationship stays live in Figma). States derive via the
  same hoverL/pressedL machinery with the stop-10 contrast require held as a FLOOR
  (dark states darken toward the paper; a violating state bisects back toward ink-10's
  own L). Declared as reqtoken ROLES end-to-end (spec → resolver → dtcg), so the portable
  bundle describes what the system emits. Visited: DROPPED (owner).
- **Rename**: cta-1→cta, cta-2→cta-hover ride RENAMED_LEAVES in BOTH plugins (in-place,
  ids/bindings survive — the cta-border/ink-renumber precedent). Outline re-expression:
  cta transparent · cta-hover = highlight-8 @ 0.09 · cta-pressed @ 0.18
  (OUTLINE_PRESSED_ALPHA, pressed-doubles-hover carried to the alpha register) ·
  cta-ink trio untouched (links keep the exact ramp's text register).

**Proof at land:** byte-identity vs d75d357 — 15,410 emitted tokens (31 brands + 32
agnostic seed-cases, both lanes, derived/custom/outline/exact postures) zero value drift,
additions exactly the new family; 67/67 brandCss blocks identical under the name map.
Full gate suite green; highlight + divergence snapshots re-blessed (matrix shape grew to
carry the six roles; values proven unchanged first). reqtoken-audit gains: pressed-travel
(§5b), cta-ink anchor + state floors (§5c, hard — 0/288 fail), and a REPORT-ONLY
pressed-fill pole read (§5d).

**Residuals:** §5d reports 10/288 apca-lane vivid teal/cyan seeds (C0.2, H165–225) where
the rest-chosen pole reads 4.15–4.38 wcag on the PRESSED fill — that lane's law is Lc
(not violated), wcag lane fully clean; owner-visible every run, unruled. The wcag-lane
pressed floor rides the states only for cta-ink; the FILL trio's pressed carries no
contrast requirement of its own (same posture hover always had). Phase-4 (custom link
color) converts the v1 cta-ink alias to raw values when it lands.

Relates: C16 (DARK_CTA_C register — pressed inherits the cta's policy), C12 (red
complement mints the pressed stop pinned), the 2026-07-12 secondary offering (outline
re-expression extended).

## C20 — the SYSTEM LINK + the escape covers ALL the ctas

**Status:** CLOSED (owner rulings 2026-07-16, phase 4 of the five-phase roadmap).

**System link.** Link is a SYSTEM-level color — ONE `link`/`link-hover`/`link-pressed`
trio per theme, never per-family (owner: "link is a system level color… a primitive that
internally aliases the primary ink 10 unless it's being deconflicted from red").
DEFAULT: the primary's cta-ink trio (= ink-10 by construction, C19 — states ride;
plugin v1 aliases `system/link*` → the brand's cta-ink prims; plugin-ext carries values
with a `system/link` carve-out from the invariant skip so extensions override per brand;
CSS `--link*` aliases `var(--brand-cta-ink*)`; `--fg-link` in semantic.css rides
`--link` and is accent-flip-invariant — the old `var(--brand-ink-10)` pair removed).
CUSTOM (the de-conflict): a seed (`DEFAULT_LINK_HEX` #0B57D0 on toggle) through
`resolveLinkTrio` = the seed's own ink-register resolution (stop-10 law per lane/mode,
states + floors free); v1 dedups a shared `system/link/<resolved-hex>` prim (value-keyed,
retune-proof). cta-ink is NOT the link: it is the TEXT-STYLE cta (text buttons — never
underlined; demo/plugin presentation corrected).

**Escape amendment.** The neutral cta escape (C19-era phase 3) now swaps ALL the ctas —
the fill trio AND the cta-ink trio (from the neutral's own cta-ink family) — and RESETS
the red collision to default: canonical red ships, no per-brand variant (reset applied at
every surface: brandCss effOverrides + note, v1 apply signals + both matrices, ext
payload lane, demo CtaRow/signal tags/alerts/checklist). The default link follows the
escaped cta-ink through its alias chain; a custom link overrides independently. v1's
escape post-pass aliases cta→neutral ink-11 AND cta-ink→neutral ink-10 (value-guarded);
writeRaw's cta-ink→sibling-ink-10 alias is value-guarded via the payload lightMap.

**Verified:** figma-verify probes (default link ≡ brand cta-ink · custom #0B57D0 →
#2a5cb4 wcag gamut-mapped · escape → cta-ink ≡ neutral ink-10, link follows, ramp
untouched); full gate suite green; ext snapshot re-blessed (+system/link rows, audit
carve-out); live demo end-to-end both toggles.

**Adversarial review round (2026-07-16, 21 agents, 14 confirmed → all fixed).** The
queued re-run landed; the confirmed classes and their fixes:
- v1 `system/link*` aliased ONLY the applied brand's theme mode — every other pre-existing
  mode held the create-default black. Fixed: first-appearance backfill loops the theme
  modes and aliases each brand's own cta-ink family (ink-10 fallback for pre-C19 brands)
  — the SYSTEM_GLOBALS/backfillSecondary idiom.
- v1 custom-link prim was keyed by the resolved LIGHT hex: distinct seeds collided onto
  one prim (the second brand rode the first's dark trio) and a states/dark-only retune
  reused all six stale values. Fixed: SEED-hex key + the link group alone refreshes its
  values every apply (same seed ⇒ same output, idempotent). Old light-hex prims orphan
  harmlessly (scopes=[], the red-variant class).
- ext: new base ROWS created on an existing base (the C20 link rows; C19 cta-ink was the
  same latent class) seeded from the default seed and never triggered the backfill —
  other extensions inherited #E93D82-register values silently. Fixed: pre-mutation
  new-rows detection → reason-scoped confirm + recipe backfill + status note (the
  missingCols posture, generalized to token-set growth).
- Both plugins: a ticked custom link with an invalid/cleared hex silently applied (and in
  ext, BAKED into the recipe) the default posture. Fixed: Apply blocks with a status
  error (the primary-hex idiom); empty field flags invalid while ticked.
- v1 shared groups (neutral/signals) lost the cta-ink→ink-10 live alias (the value guard
  starved on a missing lightMap). Fixed: lightMap passed in the shared loop.
- figma-verify's escape probe fed the VARIANT red under ctaEscape (the exact forbidden
  state) and asserted nothing about it. Fixed: probe carries the real callers' filtered
  signals and asserts the emitted red group ≡ canonical per leaf.
- demo: the exact-mode red-register warning wasn't escape-gated (contradicted the
  escape-active notice). Fixed: `!escapeOn` guard, matching its siblings.
- custom link shipped no display-p3 rendition while the default posture picked up
  cta-ink's through the alias chain (visibly duller on P3). Fixed: `--link*` P3 lines
  emitted via p3Differs; no cascade-pop hazard (own property, never dropped).
- Informational (no fix, by design): an escaped re-apply leaves the brand's old
  red-variant prims in the mode collection (v1 has no deletion path; scopes=[],
  unbindable; ext self-heals) — same class as the orphaned light-hex link prims above.

Residuals: link is not a DTCG-declared role (product token, not a ramp requirement).
Manual coverage: test plan section K (multi-brand backfill, upgrade confirm, invalid-hex
block, seed-keyed prim).

Relates: C19 (the cta family this rides on), C12 (the red machinery the escape
supersedes when active).

## C21 — the VIVIDNESS LEVER (`style:'full-chroma'`)

**Status:** CLOSED (owner-picked semantics 2026-07-16 "This looks right!", phase 5 of the
five-phase roadmap — the last lever).

**What it releases (two dampeners, one toggle).** Brand ramps are dampened by default to
separate from signals (the toggle's ⓘ copy, owner's words). `full-chroma`:
1. **Light/dark RAMP — the ladder's vividness cap.** Stop chroma's ladder half is
   `min(1, seedC/VIVID_C) × the declared per-stop base register` — every seed above
   C 0.13 rides the SAME ramp chroma. The lever removes the `min(1,·)` cap
   (producers.ts `vSubtle`): the declared shape is untouched, its amplitude scales
   linearly with the seed's true chroma; gamut clamps still bound the emit; the blend
   weights (envW, mutedness) keep the CAPPED v — amplitude releases, geometry doesn't.
   Sub-threshold seeds are byte-stable. The dark ramp follows through the delta model.
   NOT the release (owner-rejected on the exhibit): `envW → 1` — pure room-envelope
   riding ~78–95% of the gamut ceiling and re-placing stops darker through the H-K solve.
2. **Dark CTA — the trim register.** The brand's dark cta REASSIGNS from
   `DARK_CTA_C.brand` (trimmed ×0.77–0.88, deepest at the blue/red-magenta lobes) to the
   IDENTITY policy — the signals' declared register, no new numbers (register-audit
   carries a blue-lobe probe for the reassignment). Measured caveat: at a SATURATED blue
   the sRGB gamut ceiling binds tighter than the trim (both policies clamp to the same
   ceiling — #487bff gains only +8%); the release lives where trim < ceiling (+31% at
   the moderate #4f6eb7).

**Scope.** The PRIMARY only: the derived secondary resolves under its own model, the
neutral keeps its clamp, signals are exempt on both sides (goldBoost / identity policy).
The LIGHT cta is identity chroma already — the lever never touches it (figma-verify
asserts). Exhibit: `render/phase5-vividness-ab.html` (agnostic hue×chroma sweep through
resolveBrand; 182/792 ramp cells move, max ΔE .124; dark cta +31% chroma at H265).

**Wiring.** `resolveBrand`/`resolveTheme` `style:'full-chroma'` (plumbed since the C10
era, first consumer); both plugins ship a "Full vividness" checkbox (default OFF; ext
recipes carry the style so batch re-applies preserve each brand's posture); demo
CustomTheme control. Default-off is byte-identical (hash-proven at landing; snapshot
gates unchanged).

Relates: C10 (the declared SCALE_C tables the cap lives in), C16 (the DARK_CTA_C
register the reassignment reads), C7/C8 (the envelope-blend history the rejected
candidate came from).

## C22 — the dark p2 GREY BAND: split fire/release bars left near-red pairs neither fired nor clean

**Status:** CLOSED (owner-caught 2026-07-16, two live sightings; one-constant fix,
owner-verified live).

**Symptom.** `solveDarkCtaExit` fired only when the brand↔red dark-cta pair sat CLOSER
than `P2_D_UP` (0.11) but released at `P2_D` (0.12) — every pair landing in [0.11, 0.12)
neither fired nor read clean. Two live cases, both owner-caught on the Collision-check
page in dark: (1) wcag `#FF0000` shipped its pair at p2 0.113 (`#ff6553` vs `#d63e1e`,
the confusable Primary-cta/Red-cta chips); (2) the apca `#ff4c4c`–`#ff5c5c` corridor sat
as a HOLE between fired neighbors — sliding the picker jumped between separated and
confusable ("the red stops deconflicting at that spot and both sides next to it don't").

**Fix.** Membership keys on the CLEAN bar: fire when p2 < `P2_D` (producers.ts,
solveDarkCtaExit). One bar gives continuity by construction — travel shrinks toward zero
as a pair approaches the bar. Dark has no second rescue (the red complement is
light-only; dark red ships canonical), so the exit must cover the whole under-bar range.

**Measured blast radius** (near-red fine grid, 1 736 seeds × lane): wcag 0 → 58 fired,
apca 155 → 281 — every new firer drawn exactly from the old grey band (membership is the
only change; p2 ≥ 0.12 is untouched). ZERO roster/signal/neutral snapshot drift (all
gates passed without re-bless — no shipped brand sat in the band). Owner's corridor now
lands `#ff958c/#ff958c/#ff958e` (ΔL ≤ 0.001) across `#FF4242/#FF4747/#FF5757`.

**Honest residual.** At the new boundary the cta APPEARANCE still steps (fired `#ff5c5c`
lands L 0.78 while just-clean `#ff6060` ships L 0.68): the apca pole dead-zone blocks
near travel, so a firing pair jumps through it. Same class and magnitude as the
pre-existing enforce cliff (`#ff7474`→`#ff7878`, shipped build) — both sides of the step
are p2-clean, so it is not a deconfliction hole. Smoothing enforce-class cliffs = its own
round (the queued dark her-marks calibration).

Relates: C12 (the dark solve this calibrates), C18 (the wcag clearance whose bright light
exits made the wcag dark band visible).

## C23 — APCA DECIDES, WCAG FLOORS: the red-collision machinery unifies on one geometry

**Status:** CLOSED (owner ruling 2026-07-16: "In wcag mode, APCA should lead wherever it
isn't a legal requirement, and it shouldn't be influencing the collision avoidance" —
scope confirmed red-only; implemented + owner corridor pending eyeball).

**Symptom.** wcag and apca deconflicted the same seed to visibly different distances
(owner-annotated #FF4747: apca fired the exit → salmon at dist 0.463; wcag never fired —
repel null, shipped `#e3252f` at the seed, dist 0.170). Three per-lane machineries
compounded: (1) each lane judged membership against ITS OWN canonical red, and the lane
reds sit at different L for legal reasons — borderline seeds straddled the two gates;
(2) per-lane pole conditions changed travel distances, flipping the nearest-edge
DIRECTION between lanes (#FF0000: wcag up-bright, apca down-deep); (3) the wcag
complement had NO pole gate (`contrastProfile !== 'apca' ||` short-circuit), picking
different variant zones for the same seed.

**The model.** Collision decisions are PERCEPTUAL; the wcag ratios are LAW. So: the
DECISION (membership, travel distances, direction, zone pick) runs on the apca geometry
in BOTH lanes — the apca canonical red as the reference (`resolveBrand` solveOpt), the
apca Lc bar as the exits' decision pole (`CTA_ONFILL_ENFORCE_LC` + the enforce margin),
the same Lc gate on the complement's zones. The wcag legal composite (4.5 + the
clearance Lc) rides as a LAW EXTENSION only: travel continues ALONG THE DECIDED
DIRECTION until the law also passes; direction flips only if the law is unreachable
in-range on the decided side (dark: keep the shipped floor). Landings now match across
lanes except where the law forces extra travel.

**Everything else already followed the principle** (audited at ruling time): ramp stop
placements differ per lane only by the declared legal requires; on-text pole choices are
perception-first with the 4.5 floor; type-1 swaps are lane-invariant (gated); the lane
reds themselves stay per-lane (wcag red darkened FOR 4.5 — law). Red collision avoidance
was the one gap.

**Measured.** apca lane byte-identical (dump: 0 non-ink diffs across 4 672 apca tokens);
wcag moved exactly 12 near-red cta trios + 1 on-cta re-judge in the 50-case dump; owner
corridor `#FF4747` wcag ≡ apca (`#ff958c`, variant `#b50f12`, dist 0.463 both);
collision-sweep lane divergence 47 → 28 (rest = law-driven); 4 near-red roster scales
re-blessed (tokens 22/25 = the cta landings); ext snapshot re-blessed (`vs-red (warmer)`
wcag now mints its red variant, +3 override rows — the complement aligning). Pole sweep:
cta flips 0/48 both modes. Caveat: `opts.apcaClearance:false` (instrumentation) now also
rides the apca decision pole — the old ungated poleOk is gone.

Relates: C12 (the solve this re-lanes), C18 (the clearance, now cleanly law-only),
C22 (the grey band closed the same day), contrast-profile split (the wcag = legal-mode
charter this completes).

## C24 — the DARK BAND LIFT: dark-surround loudness calibrated into the delta model

**Status:** IMPLEMENTED (owner-calibrated 2026-07-27, marks rounds 1–3 on the
dark-band exhibits; candidate "B · washes"), pending owner eyeball + snapshot re-bless.

**Symptom.** Owner-caught on the Unify comparison chip rows: okchroma's dark tints read
low-contrast beside Unify's hand-flipped dark ramps. Measured: the delta model is
delta-PRESERVING (dark mirrors light's apparent separations exactly — fill-page 3.6/3.6,
border-fill 9.2/9.4 on FIS) while the dark-surround eye compresses contrast
(Bartleson–Breneman; the same physics as the blue-recede = contrast finding). Unify's
hand picks encode ~2× border deltas in dark — too loud (owner), but directionally right.

**The model.** One law extends the delta carry: a dark surface stop's VIRTUAL light twin
sits `DARK_BAND_LIFT[stop]` × the apparent depth below white — L AND C both read from
that twin (C = the light ladder's own chroma-at-depth, sampled by `deltaLiftChroma`; per
seed, per hue — the cross-hue perceptualDarkC equalizer was tried and vetoed, it dusted
strong-H-K hues ~30%). The shipped behavior is the f=1 special case. Calibrated ramp
(owner marks): ×1.25 at stop 2 → ×1.75 at stop 7; stops 1, 8–11 carry no lift — stop 8's
3:1 law re-solves against the lifted paper-2, stop 9 rides its band floor, inks are
dark-native. Vetoed en route: flat ×2 (card·field seams over-separated; 7-over-8 seam
inversion), lifting stop 9 (only 7–11 app of room under ink-10). Landed vs the marked
exhibit: max ΔE 0.032 across the six exemplars.

**Band order, the 8-vs-7 half.** The lifted wash-7 overshot the NEUTRAL's low-riding
achromatic 3:1 solve (45.6 over 43.6 — brand ramps cleared). Stop 8 now carries the
mirror of stop 9's band floor: wash-7's apparent + light's own 7→8 apparent gap
(raising L only adds contrast vs paper-2, so the law is preserved). Neutral s8 → 64.

**Riders.** `darkFlatGapApp` 23 → 44 (owner "scale it with the ramp"): the derived
secondary's flat dark cta keeps its old posture (+3.7 app above wash-7). The dark
neutral quiet-cta POP clearance (C-gate, d6830c3) self-recomputes against the lifted
paper-3. Surface planes widen through the aliases (base pinned, lift/pop rise).

**Measured.** collision-sweep PASS (zero holes; lane divergence 28, swaps lane-global) ·
dark-audit HARD F 0 · register PASS · req:audit PASS (NOTE: its dark lane is seed-keyed —
the delta path is invisible to it, and it sets no exit code; its pass is NOT coverage
for this change) · figma:verify PASS. Awaiting owner eyeball then re-bless: divergence
snapshot (84 scales), dark snapshot (66), highlight snapshot (6 — neutral fed-trio rows +
hl9 tracking s8), ext override path-sets (a few dark `*/highlight/on` pole flips),
smoothness baseline (dark drift 0.0077→0.0085).

**Review round (adversarially verified).** darkFlatGapApp first landed at 44 off a
cross-anchor arithmetic error (a blue probe brand's wash-7 as the "old d7") — corrected
to 40 (= the neutral-anchored posture AND the owner's literal ×1.75 scaling, which agree
at ~40.3); stale delta-model banners in producers/colorEngine/reqtoken-resolve updated.

**Residuals (owner items, measured).** (1) INK-ON-WASH dark contrast thins with the
lift and NO gate watches it (T10/T11 requires read vs paper-2 only): neutral ink-10 vs
wash-7 4.9→2.6, ink-11 vs wash-7 8.1→4.3 (under the wcag 4.5), worst brand ink-11 vs
highlight-8 2.2. Owner register ruling ("wash-7 is an illustration color, not a text
holder") covers the top of the band; wash-4/5 text and TokenCards' ink-11-on-highlight-8
pairing are the open surfaces — accept-and-declare vs a declared ink-vs-wash require is
her call. (2) DARK s8==s9 CONVERGENCE for yellow-band seeds (18/180 byte-identical: s8's
3:1 solve vs the lifted paper-2 rises ~17 app and yellow's s9 band floor equals it;
highlight-audit deliberately does not assert 8/9 ordering) — direct evidence FOR the
owner's open "collapse 8·9 into one 3:1 stop" idea; equality ships, inversion cannot.
(3) The dtcg portability lane stays seed-keyed (pre-existing total bypass; the lift
NARROWS its divergence from shipped — s7 ΔE 0.134→0.049 — it does not widen it).
(4) ext-override audit: 32 wcag-dark path-set moves (on-highlight pole flips incl. the
green signal in two brands) — eyeball the dark wcag signal chips at re-bless. (5) The
queued dark her-marks round remains the safety valve for every apparent-space bar this
round leaned on.

Relates: C13 (the delta model this calibrates), C22/C23 (bars and law-extension
patterns), the divergence-sweep DARK-L solve (the scaffold era this fully supersedes for
stops 2–7).


**C24 addendum — SHINE PARITY (same day).** The uniform lift is hue-flat in apparent
space, and the apparent instrument credits high-H-K hues with shine — so equal-apparent
left blues/purples physically darkest (owner: "blues and purples need to brighten the
most, greens yellows oranges the least"). Landed: per stop, the depth measure blends
toward plain-luminance parity — depth = (1−τ)·apparentDepth + τ·L*depth with
τ = DARK_SHINE_PARITY_T[stop] · cuspDarknessW(hue). T = her per-element marks (papers 1 →
wash-7 0; linear — the H-K credit is only as real as the chroma carrying it). w = the
hue's intrinsic-register darkness from the gamut cusp-lightness curve (pure geometry:
blue .99 · purple .87 · red .63 — her "red is in the middle" prediction exact — orange
.46 · green .22 · yellow .15; the hue-blind shaped candidate over-lifted red via the
Nayatani credit). Wash chroma samples the light ladder's chroma-at-depth at the
EFFECTIVE depth; the table reads the lane-invariant surface band 1–7 only (owner-caught
lane leak: stops 8/9 are lawfully lane-split and forked the washes). deltaDarkPlace owns
the combined placement. Calibration exhibits: dark-chips/washes-shine + shaped-cusp
(per-element groups; marks doctrine per the owner — no click-UI for small rounds).

## C25 — cta-fill STATES: one rule, one apparent step, mode-aware direction

FOUND (owner, unify-compare dark eyeball 2026-07-28): in dark mode hover/pressed
never inverted — every chromatic cta DARKENED into the dark page (receding), only
the neutral lightened, and step sizes disagreed (neutral ±6.5/15.3 app vs signals
~4/8, warning near-imperceptible). Two idioms had forked: loud ctas rode
hoverL/pressedL (archetypes.ts) — direction keyed on the fill's OWN L (<0.40
lighten, else darken) and magnitude 0.03/(L+0.1), a light-mode archetype rule
applied verbatim to dark fills that all sit at the .63–.75 prominence floors —
while the quiet neutral's states were FED (stop-5/6 aliases + uniform pop lift),
inverting correctly only as a side effect of the dark ramp ascending. The cta-INK
trio had been dark-cased long before (reqtoken resolve, "ink-11 sits BRIGHTER");
the fill trio never was.

RULE (owner spec: "they should all do the same thing and move the same amount of
delta away from each other" — refined by two owner corrections on the landing):
`stateFillL` (archetypes.ts). DIRECTION: away from the mode's ground (light
darkens, dark lightens), with THE ARCHETYPE OVERRIDE (correction 1: the original
hoverL 0.40 switch was a deliberate visibility rule, not an accident) — a fill
already in its travel direction's TERMINAL band flips: light mode, L below the
'rich' floor (0.40: FIS, deep seeds, the light escape) lightens; dark mode, L
at/above the 'light' archetype floor (0.85: chamomile dark, the yellow signal at
.854, the dark escape) darkens. Both bounds read from ARCHETYPES. Direction
commits on the pressed budget (the pair can never split at a rail); the rail-fit
backstop also flips dark fills just under the override line (~.79–.85), where the
mirrored deltas outrun the headroom. MAGNITUDE (correction 2: a first cut solved
a FIXED APPARENT-L step, exact on the meter and imperceptible on the near-black
light cta — equal apparent ≠ equal visible; state-change visibility is
crispening-compressed with distance from the page ground, and the original
formula's SHAPE was that compensation): ΔL = k/(nearness-to-ground + 0.1),
nearness = L in light / 1−L in dark, k = 0.03, pressed 2× (doubled, never crosses
back) — the owner-tuned hoverL law, mode-mirrored, zero new constants. The light
lane reproduces the register hoverL always shipped; dark finally gets the mirror
(the "imperceptible warning" was the smallest step where the mirror demands the
biggest). Steps are deliberately UNEQUAL in L and equal in visibility-weighted
terms: small near the page (crispening amplifies), large toward the far pole.
POLE CAP (correction 3, two owner catches on a pure-black cta): the raw law gave
0 → .30 → .60 — pressed read as a DIFFERENT BUTTON; a first fix (flooring nearness
at the near-black median) capped the STEP and killed the hover instead (L .133
renders #080808 — OKLCH is cube-root-compressed near black; the divergence IS what
visibility demands there). Final rule: the steps stay divergent, and for rests in
the NEAR-BLACK archetype (< .25) the trio's ENDPOINT clamps at the override
boundary (.40) — pressed caps there, and a hover that would reach the capped
pressed compresses to the midpoint so the pair stays ordered. Pure black now
0 → .30 (#2e2e2e) → .40 (#484848); rests above the band never travel that far
(FIS .365 → .429/.494, the shipped hoverL register verbatim). Dark side uncapped —
its overridden fills darken off near-white, where the compression works the
other way (escape .926 → .75 → .58). Fleet impact: one family (a near-black rest's
pressed trimmed .403 → .400).

WIRED: every fill-trio mint — reqtoken/resolve.ts light + dark base/enforce/exit,
colorEngine neutral (rest stays FED + pop-lifted; only the states switched) and
subtle-secondary (fed + pinned ctaL paths), engine/resolve red-variant + the
neutral escape. States carry the REST's hue (fed stops are torsioned off brandH —
the raw-H first cut shifted neutral states ~5°). hoverL/pressedL remain for the
cta-ink/link text-register trios only. Non-moves: rests, hl9, stop scales, all
ink trios — verified per-token in the highlight-snapshot diffs (only the 4 state
tokens per family moved at each landing). Net effect vs pre-C25: LIGHT trios are
byte-equivalent to the original hoverL register everywhere except the neutral/
subtle quiet ctas, whose states left the stop-5/6 ladder for the law; DARK trios
all re-derive under the mirror. Re-blessed: highlight, divergence (trio tokens),
ext override sets (+neutral state overrides on exotic-neutral themes). Dark-audit
and smoothness untouched (stops-only instruments). highlight-audit §3 now asserts
the law against stateStepL itself instead of stop-5/6 aliasing.

## C26 — the GENERATED POP PLANE + the INK ANCHOR: chips get their register back

Two owner rounds, one arc (2026-07-28): the canonical chip recipe (paper-3 fill ·
wash-6 stroke · ink-10 text, family the only variable — the unify-compare exhibit
recipe, now THE demo-wide chip) exposed two structural debts.

INK ANCHOR (owner rule: "ink-10 can only be used on papers" — so it must PASS on
all of them): ink requires anchored at paper-2, and the WCAG lane solves exactly
at the bar — so ink-10 on paper-3 dipped to 4.26:1 for 78/216 agnostic seeds
(teal/high-C worst). Fix: in the WCAG lane the ink requires (stops 10-11 + the
cta-ink state floor) anchor at paper-3 — the NEAREST paper (light's darkest,
dark's lightest) — so clearing there clears every paper (resolve.ts
wcagInkAnchorStop). The apca lane keeps paper-2, byte-identical: its Lc solve
already clears paper-3 everywhere (worst 5.28, 0/216). Post-fix wcag worst =
4.50-at-bar; ink-11 untouched (ceiling never binds, worst 10.84); dark inks
untouched (over-clear at 7.13+). Divergence re-blessed (wcag ink-10 tokens);
smoothness baseline regenerated (improvements only).

POP PLANE — RESOLVED: pop = paper-3 STANDS (generated-pop candidate RETIRED,
owner 2026-07-28). The recede that opened this fork was never pop's identity —
it was the paper band's per-hue luminance scatter (C27's subject): dark pop
(neutral paper-3) floated ~30% brighter than the chromatic paper-3 chip fills.
A generated pop (its own value above the lift plane) was built and exhibited as
a candidate alongside "lower all paper-3s"; owner reasserted the band semantics
("paper-3 IS the highest background" — never call it a content tint) and C27's
one-level parity dissolved the problem: with every family's paper-3 on one
photometric level, chips sit flush on pop BY CONSTRUCTION and the height is one
knob for the whole band. The candidate machinery (popDark mint,
DARK_POP_LIFT_APP, --neutral-paper-pop emit, clearance re-anchor) was fully
reverted; --surface-pop dark = neutral-paper-3 as before; the quiet-cta POP
clearance anchors paper-3 again (divergence re-blessed for the round-trip). The
paper-3→wash-3 rename question dissolves with it. Lesson kept: the pop fork was
a MEASURE bug wearing a plane-architecture costume.

## C27 — PAPER PARITY: one photometric level for the highest backgrounds

FOUND (owner, 2026-07-28, judging the pop exhibit): "the pop looks lighter than
all of the other paper-3s" — measured real: neutral dark paper-3 Y .0145 vs the
chromatic families' .0104-.0120 (~30% spread). Cause = H-K contamination in two
places, NOT a skipped neutral (light twins agree, app 94.5-96): (1) the carried
depth reads CREDITED apparent, so tinted light papers measure shallower than the
chroma-free neutral and the C24 lift amplifies the gap ×1.4; (2) C24's parity
blend τ = T·w(hue) let the cusp weight dilute the papers' declared photometric
parity — blue (w .99) got it, yellow (w .15) didn't. The w shaping was calibrated
on WASH marks; composed onto papers it scattered them.

RULE (owner: "papers are backgrounds — one level"; the ladder speaks two dialects,
declared per band, applied identically to every family): at FULL-parity stops
(T=1, the papers) placement is hue-blind AND photometric — every family anchors
to the ACHROMATIC light scaffold's luminance depth (LIGHT_L gray at the stop) and
lands at the SAME Y, tinted by its own C/H. deltaDarkPlace gains the grayLightL
anchor (C27 branch); chroma still samples the τ-blend effective depth (the
approved tint register). Washes 4-7 keep τ = T·w untouched — the credit is real
there. Result: every family, both lanes — dark paper-2 Y .0106, paper-3 Y .0155
exactly. A rejected intermediate (τ hue-blind but per-family light-luminance
depths) preserved the spread (Y .0111-.0173) — the light papers are
apparent-equalized, so one-level REQUIRES the gray-scaffold anchor.

RIDER — the yellow 3→4 seam (open, owner's call): parity raised yellow's paper-3
most while its washes stay apparent-placed low (w .15), pinching dark 3→4 to
ΔE .007 (dark-audit §A reports it; light twin .026). Options: accept the soft
seam, or a 4-vs-3 band-order floor in the C24 8-vs-7 idiom. Re-blessed: dark (51
scales, stops 2-3 band), divergence, smoothness baseline. The pop fork (C26)
re-rendered on the corrected band: A pop=paper-3 (chips flush BY CONSTRUCTION
now) vs B generated-below (chips float); the old "lower all paper-3s" candidate
collapsed into A's height knob.

## C28 — ONE DIALECT: the dark band on the photometric ladder, + the signal warm drift

Two owner rounds landing together, both born from her reading the dark ramp as a
graph: "the graph in dark wobbles up and down, it should just be an arc shape",
and "warning is supposed to be rotating warm".

THE WOBBLE, diagnosed: C27 put the papers on a photometric level while the washes
stayed apparent-placed, so the whole measure-change landed in the 3→4 seam (steps
went 5.2 / 1.1 / 5.4 where they had grown smoothly). Deeper cause: the H-K credit
RAMPS with chroma along the band (red .2 → 11.7 across stops 1–7; yellow and the
neutral, whose credit stays flat, were already smooth in both measures), so any
rule that evens ONE measure automatically un-evens the other.

RULE — ONE DIALECT (supersedes C24's τ·w blend and C27's papers-only branch): the
WHOLE surface band lands on the ACHROMATIC scaffold's photometric ladder, tinted
by its own C/H. Luminance is identical across families at every rung — no hue can
sit physically darker than its neighbours (which was blue/violet sinking) — and
the H-K shine rides ON TOP as visible shine instead of being paid for in
luminance. Steps come out monotone-growing for every family. DARK_SHINE_PARITY_T
and cuspDarknessW leave the band (their record stays in C24). Chroma sampling is
unchanged: the light ladder at the twin's own lift-scaled photometric depth.

THE LIFT RE-MARK (owner, same round): C28 changes what DARK_BAND_LIFT multiplies,
so her 2026-07-27 ×1.25→1.75 — calibrated against APPARENT depth — over-applied
and pushed wash-7 into the highlight band (7→8 seam collapse + a chroma peak at
stop 7). Her ramp SHAPE is unchanged; the amount is halved: ×1.125→1.375 ("half
the lift looks right", chosen from a full/half/quarter exhibit).

THE SIGNAL WARM DRIFT: the warm/gold spine drift is L-DEPENDENT, but the delta
model carries hue verbatim from the light twin — so a dark stop sat at
yellow-for-a-LIGHT-stop and warning read olive, and was chroma-starved at 100% of
the P3 ceiling AT THE WRONG HUE (the spine hue offers ~30% more). Dark SIGNAL
stops now re-derive the same light drift law at their own dark L, at
DARK_SIGNAL_WARM_DRIFT = 1/3 (owner's conservative pick from a four-way exhibit).
SIGNALS ONLY — a brand's identity hue is mode-stable by design (owner: "the brands
shouldn't rotate"); the new `signalWarmDrift` opt is set by the four signal
builders. The LEMON variant self-excludes and is byte-identical: C8's cool-edge
taper zeroes the drift past H104, and the re-derive reuses ctx.lightHueAt (the law
WITH its tapers) rather than the raw spine — which is the reason to go through the
producer. Warning lands at H≈79 (amber, was 88 olive); red/green/blue ~0.

NOT TOUCHED (owner, no time): critical's dark hue. It never rotates today (H 33–34
both modes) because the carry path makes every dark hue correction inert. Cooling
it was measured (−4°/−8°) and the collision math proved SAFE — redGateDist takes
red as a parameter and engine/resolve hands it `apcaRed.cta`/`ctaDark`, which are
off-scale and never rotate — but cooling the washes while the cta holds splits the
family internally (7.5° at −8°), so it wants the whole family moved together, in
its own round. Warning↔critical separation is NOT gated (the sweep is brand-vs-
signal); at the landed settings it sits at .071/.122 (wash-5/wash-7).

RESIDUAL: 28 of 1800 grid cells (bright magenta, H 324–336 at L .85) still peak in
chroma at wash-7 before stop 8's declared register (.189 → .165; not gamut-bound,
ceiling is .243/.301) — light peaks later, at 8. Reported, not patched. Re-blessed:
dark, divergence, highlight, ext, smoothness.

## C29 — THE FLAT DELTA: a state change is a glimmer, the same size on every button

Owner, reading the dark deconfliction row: "the lighten steps are TOO MUCH … it is a
glimmer, and you are moving it so heavily that it is going to be jarring. You are
taking the brand color all the way to white for no reason."

DIAGNOSED: C25's magnitude — ΔL = k/(nearness-to-ground + 0.1) — grows as a fill
approaches the far pole, so the biggest steps landed exactly where the gamut is
narrowest. Dark pressed states ran ΔL* 8.7–28.3 across the fleet and washed
saturated fills out: hibiscus #FFEFED at 14% of its rest chroma, info #E9E8FF at
26%. Its own hover was already ΔL* 11.8 — larger than a whole pressed step should
be. The curve was added the same day as C25 against a real observation (equal
APPARENT-L steps read unequal near black) but applied the remedy in the wrong
currency: OKLCH L is already near-uniform perceptually, so a flat ΔL in L never had
the defect the curve was correcting for.

RULE — ΔL is a CONSTANT: k = 0.05 hover (her mark, over .03 and .04), pressed 2×,
both modes. Restores her original C25 spec verbatim — "they should all do the same
thing and move the same amount of delta away from each other" — now in L rather
than apparent-L. Every family lands ΔL* 11.6–12.7 at pressed, and chroma survives:
hibiscus 14 → 52%, info 26 → 61%.

THE DARK ARCHETYPE OVERRIDE IS RETIRED. Its bound (the 'light' archetype floor,
0.85) declared "no room to lighten" for fills that plainly had 0.11–0.19 L of room;
warning was the casualty, resting at .854 only because yellow is the most luminous
hue, so it flipped and darkened to olive (#A67B00). Under a flat delta the honest
test is the RAIL alone — a fill flips only when its full pressed step would
overshoot, i.e. above STATE_L_MAX − 2k = 0.88. Nothing in the fleet sits there (0
of 66 ctas, both lanes), so dark fills all lighten. The threshold is now a
consequence, not a constant. The light-mode override (near-black lightens, the
original hoverL switch) is unchanged.

The near-black ENDPOINT CAP is DELETED, not carried: it existed because the
diverging Weber steps could push a near-black light pressed state past .40, out of
dark-button territory. A flat 2k = 0.10 cannot — the near-black band tops out at
.25, so pressed lands at .35 worst case. Provably inert.

COST, accepted: warning now lightens rather than flipping, and lightening a gold
runs into the gamut narrowing toward white — 38% chroma at pressed (#FFEECC). No
longer olive, no longer a leap, but the palest pressed in the set; the decorative
stroke for pale ctas is the open follow-up. Neutral moved the other way (ΔL* 8.7 →
11.6). Re-blessed: highlight, divergence — drift confined to ctaHover/ctaHoverDark
in both, with nothing drifting at a scale-stop or cta-rest index.

## C30 — the warm-drift chroma clamp: a gamut guard read before the L was final

Owner, on warning's dark ramp: "why is this happening? is this the gold boost?" —
w7 and hl-8 sitting at 100% of their gamut ceiling, then hl-9 collapsing to a
washed tan between them.

NOT the gold boost. C28's signal warm drift rotates hue, and guarded the rotation
with `C = Math.min(C, clampChromaToGamut(L, C, h))` — don't carry a chroma the new
hue can't hold. Sound intent, but the engine ALREADY clamps at emit (makeStop and
the resolver's own emit() both clampChromaToGamut the final L/C/H), so the guard
re-did a job one layer down — and it ran BEFORE this stop's lightness was final,
which made it wrong exactly where L still moves:

  DRIFT     stop=9  L=0.4992  C 0.16133 -> 0.12736  (ceiling at .4992 IS .12736)
  CARRY-OUT stop=9  L=0.7582                        (ceiling at .7582 is .19330)

21% of warning's chroma discarded against a limit that had already been lifted,
with nothing downstream to rebuild it. Stop 8 hits the same trap harder — clamped
to .053 at the L=0.05 sentinel — but survives because its require solve restores C
from ls.C. Stop 9 carries no require, so the error reached emit.

RULE: the drift rotates HUE ONLY. Guard deleted; emit owns the gamut boundary, as
it does for every other stop. Warning was the only casualty by luck: info and
positive drift exactly zero, and critical's clamp is a no-op (ceiling .1709 vs its
.1647).

MEASURED SCOPE — 2 of 176 stops move, both warning's dark hl-9:
  wcag  #C27D2A -> #C37600      apca  #E79F51 -> #F59920      C .1274 -> .1613
174 byte-identical. Both snapshot gates independently reported the same single
entry (dark-audit `signal:yellow stop 8 (dark)`, divergence `token 19` — the same
dark array index 8). Re-blessed: dark, divergence.

## C31 — THE HIGHLIGHT BAND GETS ITS OWN LAWS: the ring at 3:1, the fill at 4.5

Owner, reading the plugin output: "I am seeing it output lower contrast levels … I was
seeing high threes." Measured, wcag light, hl-9 against WHITE text: neutral 3.96,
warning 3.52, positive 3.53. The floor never fired because `onHighlight.ratioFloor` was
satisfied by FLIPPING THE POLE TO BLACK rather than moving the fill — the ramp read
conformant while white text was unusable.

RULE — hl-9 SEPARATES FROM ITS SURFACE: 4.5 against paper-3, the plane it is drawn on,
the same anchor the ring uses one band louder. Owner's shape, chosen over "4.5 against
its own text" because ONE requirement delivers three things. Forcing 4.5 vs paper-3
lands the fill dark enough that WHITE clears 4.5 for free (agnostic worst 4.91 over 1152
seed×mode cases; dark's own scaffold gives black 5.75), so ON-HIGHLIGHT BECOMES A
CONSTANT — white in light, black in dark — with no second rule to enforce it. Raising
the bar buys nothing: hl-8/hl-9 separation stays 1.00 at every target tried, because
their convergence for luminous hues is a placement property, not a contrast one.
LIGHT ONLY — dark already clears (4.48–7.44) from its hand-placed scaffold, and routing
it through the require solve would abandon that placement for a ≤0.02 shortfall.

RULE — hl-8 IS THE FOCUS RING: its WCAG 1.4.11 3:1 re-anchors from paper-2 to PAPER-3,
the highest background a ring is actually drawn on. Was 2.84–2.89 against paper-3 in
five of six light families — conformant against the stop it was solved for, short
against the one it sits on. LIGHT ONLY: dark already clears by a wide margin (3.37–4.43),
and re-anchoring there pushed hl-8 PAST the hand-placed hl-9 (8/288 agnostic seeds, apca
high-chroma) and cost 680 grid hueStep regressions — a bad trade for a 0.3 Lc gap.

`require.against` IS NOW AUTHORITATIVE (resolve.ts declaredAnchor). It was documentation
while the resolver hardcoded paper-2 in four places; moving an anchor meant editing the
engine rather than the declaration. Verified byte-identical as a standalone refactor
before any declaration moved. The ink stops keep their lane-specific override (wcag
paper-3 / apca paper-2) in the resolver, since that one IS lane-shaped.

APCA IS SCOPED OUT OF THE hl-9 RULE (owner: "let's just not change it for APCA, but APCA
will need to generate the right text for it"). The map's bars are TEXT bars (3 → 30
non-text, 4.5 → 75 body, 7 → 90); a fill separating from its own plane is a fourth kind.
Translating through the 4.5 slot lands Lc 75, where the wcag lane's own placement
measures Lc 65–68 — ~10 Lc past the equivalent, dragging apca's hl-9 visibly darker than
its wcag twin. Rather than invent a calibrated slot, apca keeps its own hl-9 placement
and solves the ON-TEXT for it (max-|Lc| against enforceLc 60) — landing independently on
the same white/black constant. hl-8's 3:1 DOES translate cleanly (Lc 30, the non-text
slot) and applies in both lanes.

SIDE EFFECT, OWNER-ACCEPTED ("commit as is"): moving light hl-9 changes its warm-spine
drift hue, and the dark band carries hue from its light twin — so dark inherits a move
made for light-mode text. 680 grid / 43 fleet `dark.hueStep`+`dark.drift` regressions,
all in the warm band H69–87 (golden-milk .0373 → .0462). Values are small; the detector
is the one that caught the last two mistakes in this area. OPEN: route the dark carry off
the PRE-require light hue so the dark band stops inheriting it.

BONUS, unasked-for: the light highlight band is now near-photometric. L* spread across
families went hl-9 8.7 → 1.96 and hl-8 0.6 → 1.64, because a shared contrast law places
them instead of the apparent-L solve. The washes still spread 10.71 at wash-7 — the
apparent dialect, still parked. Re-blessed: dark, divergence, highlight, ext, smoothness.

## C32 — THE BRAND WARM BELL: the help is declared, not derived from the gamut

Owner-led round, 2026-07-28. The complaint was that brands "wobble around a lot": at the
pale stops the oranges and salmons washed out while yellow-through-cyan ran hot, worst at
stop 3 and acceptable by stop 7. Measured across 120 hues, that severity ranking IS a
metric — the hot ratio (most colourful hue / least, in absolute chroma) reads 4.86× · 3.38×
· 2.81× · 2.26× · 1.74× at stops 3–7, matching her wording rung for rung. 1.74× is a level
she accepts; 4.86× is not.

DIAGNOSIS — THE BRIGHTNESS GATE SELECTED A HUE ARC, NOT BRIGHT BRANDS. C8 V3's lift was
`envW = max(u, 0.50 · min(1, C/0.13) · min(1, (L−0.70)/0.20))`. At full saturation a hue's
lightness is fixed by gamut geometry, so the L term never selected bright *brands* — it
selected H42–H339, permanently, with no user input able to change it. Everything from blue
round to orange fell back to a flat hue-blind ladder (wash-7 pinned at C 0.0860 for 12 of
24 hues) while the arc that cleared the gate rode a gamut-proportional envelope. Removing
the gate alone barely helped (stop-3 hot ratio 4.86× → 4.47×): the envelope itself is
proportional to a ceiling that peaks sharply at yellow, so ANY weight on it tilts the band.

THE STEERING DOESN'T STEER. Multiplying a placed bell onto the envelope moved the emitted
peak by **0°** — declaring centre 75, 95 or 100 all landed the peak at H132/H129/H132. The
ceiling shape and per-brand `brandSat` swamp anything multiplied on top. A curve can only
be placed if it is DECLARED on the hue-blind ladder, not derived from the gamut and nudged.

THE SHAPE. `bellAt(L)` multiplies the ladder in `lightScaleChromaAt` (stops 1–8 only; stop
9 keeps C31's laws): amount 0.6 · gauss(hueDelta(brandH, 95), 55) · S · v · ramp(L) ·
redExcl. Centre 95 is the owner's placement, "between orange and yellow, nearest yellow".
The L ramp (full at 0.95, nothing by 0.76) exists because the ladder grows more chromatic
as the band deepens — a constant multiplier hands out MORE help the darker it gets, which
is backwards; peak help now turns over at stop 6 (13.2 → 23.2 → 27.6 → 28.5 → 23.6, ×1000).
Result: hot ratio 1.60× · 1.60× · 1.52× · 1.42× · 1.27× at stops 3–7, and 1.02× at stop 8.

THE ENVELOPE LIFT IS RETIRED FOR BRANDS — `envW = u`, which is what signals always took, so
this is now one rule for every scale. VIVID_LIFT_BLEND / _L_LO / _L_RANGE are gone.

THE RED EXCLUSION IS NOT A GATE-DODGE. Any amount of bell costs critical its wash
separation: worst unfired red 0.00603 (no bell) → 0.00546, under RED_ONHUE_ACCEPTED_FLOOR
0.0057. Narrowing to 35° or dropping the amount to 0.35 did NOT recover it (0.00561 /
0.00550) — it is not a tuning problem. Tracing #ff977e showed why: the red repel already
holds 10.8° of hue between brand and critical at every wash stop, so HUE was never the
failing axis; the bell walked the brand's wash chroma from 0.0220 to 0.0250 against
critical's 0.0255 — a 0.0005 gap. The bell was spending the separation the repel earns.
`redExcl = 1 − gauss(hueDelta(brandH, 33.3), 30)` keys on the SEED hue, so a brand near
critical is damped across its whole ramp, and restores the margin exactly to the no-bell
value (0.00603). It is ALSO the owner's own eye-call the same round — orange was reading
hot (light H60 wash-5 0.054 → 0.074 un-excluded), so the damping is wanted, not tolerated.
Cost: salmon (H45) keeps 7% of its bell, orange 62%, yellow 94%. Measured, the exclusion
makes that arc SMOOTHER than any alternative including today — worst neighbouring-hue
chroma step across H0–120 at wash-5: today 0.0156, un-excluded 0.0037, excluded 0.0020.

DARK CARRIES, AND IT IS A GREEN FIX. Dark surfaces are delta-keyed from their light twins,
so this lands in dark too. Owner's read: "the only problem in the before swatches is that
green stands out a lot; the only color that looks noticeably better afterwards is green."
Measured agreement — H153 held the loudest dark chroma at every stop 4–7 (0.1495 vs a
quietest 0.084–0.101), and median |ΔC| by band is green/cyan 0.0219 against yellow-orange
0.0013, cyan-blue 0.0001, red-magenta 0.0000, blue-violet 0.0000. Dark hot ratio 3.13× →
1.26× at stop 3. Fleet: warm brands move (golden-milk wash-5 #f5e5b8 → #f7e5b0), cranberry
and butterfly-pea are byte-identical.

LOGGED, NOT FIXED: 336 grid / 23 fleet `smooth` regressions (89 / 3 improvements), all
concentrated at H78–90 L0.85 — the bell's centre — and almost all in `drift`. Second-order:
chroma feeds the apparent-L placement, L moves ~0.002, and the hue spine is a function of
L, so hue moves ~0.2°. Per-stop hue steps at the worst seed go 0.56 0.75 1.06 3.45 17.55 →
0.53 0.77 1.06 3.23 17.76 — two of five improve. Same coupling as C31's open dark-carry
item. Baselines re-blessed (dark, divergence, highlight, smoothness), so this is recorded
here rather than visible to the detector.

Ten gates green. Closes Open 2 of `scripts/highlight-band-handoff-2026-07-28.md`.

## C33 — THE HIGHLIGHT BAND COLLAPSES: one emphasis stop, and the inks renumber

Owner-led round, 2026-07-29. Planned in `scripts/highlight-collapse-plan-2026-07-29.md`,
resting on the measurements in `scripts/stop-8-9-drift-handoff-2026-07-29.md`.

THE BAND CARRIED A SPLIT IT DID NOT NEED. After C31, highlight-9 required 4.5 against
paper-3 and ink-10 required 4.5 against paper-3 as well — the same bar against the same
anchor, because `resolve.ts wcagAnchorStop` overrides the ink anchor to paper-3 in the
WCAG lane. Two stops solving one requirement land in one place: 145 of 360 agnostic seeds
sat within 0.01, and 50 had highlight-9 fractionally past ink-10. Pre-C31 they were never
closer than 1.11. The 8/9 distinction existed largely to serve APCA, and APCA is not
authorised for design decisions — so the split bought nothing and cost a collision.

WHAT SHIPPED. highlight-9 and on-highlight are DELETED; the inks renumber down onto the
gap (ink-10 → ink-9, ink-11 → ink-10, the off-scale anchor ink-12 → ink-11). ink-9 is now
both the emphasis fill and the first text stop — it inherits every highlight-9 role. The
scale is contiguous 1–10 plus the two off-scale anchors. highlight-8 keeps its name, its
3:1 law and all its consumers, and does not move.

THE ON-COLOUR IS DECLARED, NOT SOLVED. `ons.onHighlight` is gone from the spec and the
resolver. C31 had already reduced it to a per-mode constant, so it was an emitted token
carrying no solved value. Its successor is a line in the semantic layer:
`-fg-on-emphasis` → `--paper-0`, the mode-flipping paper extreme. Measured worst over the
360-seed agnostic sweep: 4.96 light / 8.04 dark against ink-9. Every other candidate fails
one mode (pure white 1.72 in dark; pure black 3.21 in light).

`--border-default` IS THE ACCESSIBILITY BORDER (owner ruling mid-round). It rode
highlight-9 — a text-bar stop — and now rides highlight-8, the stop that carries the WCAG
1.4.11 3:1 non-text require, because a border that has to be there is a control border.
Light #6D6C6C → #898888 (4.50 → 3.05 vs paper-3), dark #A7A6A6 → #8B8989 (6.77 → 4.70).
Quieter in both modes, and on the law instead of over-satisfying it. Decorative borders
are `--border-subtle` (wash-5) and the per-family `--*-border-default` (wash-6).

THE INDEX TRAP DID NOT SPRING. `applyChromaFloor`'s dark ink floor is
`(0.02 + 0.02·idx/7)·strength` and `idx` was `sp.stop` reused as an array index — the trap
the 2026-07-10 renumber documented. Moving the inks to 9/10 would have shifted the floor
from 0.0486/0.0514 to 0.0457/0.0486 and silently re-chroma'd every dark ink. It is a
DECLARED field now (`chromaFloorIndex`, SCALE_C_*), pinned at 10/11, with a register-audit
check that fails if anyone tidies it back into agreement with the stop number.
Also load-bearing and NOT touched: `LIGHT_L` / `DARK_L` keep their shape. neutralCurve
interpolates NEUTRAL_SHAPE against those arrays BY POSITION, so splicing a retired slot
would have re-shaped every neutral in the system. Retired slots stay in place.

PROOF THAT NOTHING ELSE MOVED. Name-normalized CSS byte-compare, both lanes, 9 brands +
secondaries + signals + 8 neutral hues: 12,010 lines byte-identical, the 1,001 deleted
declarations being the only difference. Snapshot drift was read before blessing, against a
git worktree at the branch point rather than an assumption — 2,304 divergence values and
518 highlight values, max ΔE exactly 0.00. The enterprise override sets match 94/94 columns
under the rename, and the base row count reconciles exactly: 154 → 140, the 14 dropped
being highlight/9 × 7 + highlight/on × 7.

THE CONSEQUENCE THE OWNER SHOULD OWN. The emphasis fill is a TEXT-register colour now
(`inkMult × brandC`, capped at `inkMaxC`) where highlight-9 was a fill-register one, so it
loses chroma: median 87% retained in light, 86% in dark, min 85%. Light positive goes
#0D811F → #3D7C3E. Lightness barely moves in light; dark lifts ~0.066 L, which reads as
the dark emphasis fills getting lighter (contrast vs paper-3, median 6.01 → 7.72).

TWO INVARIANTS THAT NEVER EXISTED. The ordering of these stops was held by incidental
spacing, which is exactly how highlight-9 drifted onto ink-10 unnoticed. Now declared:
ink-9 clears highlight-8 against the shared paper-3 anchor by BAND_ORDER_MARGIN 1.0
(worst measured 1.41 light / 3.18 dark), and `--paper-0` clears 4.5 on ink-9 (worst 4.93 /
8.08). `req:audit`'s dead `dark-8<9` check is replaced by a both-modes band-order check
stated as contrast rather than L. `highlight-audit`'s stop-8 sweep also now reads its OWN
declared anchor per mode (light paper-3, dark paper-2); it read paper-2 in both, which
since C31 tested the light ring against a lighter plane than its rule names.

APCA LEAVES THE PRODUCT. The enterprise plugin's mode columns were
wcag · wcag-dark · apca · apca-dark; they are `light` · `dark`, solved in the WCAG lane.
The preview lens and the "Include APCA columns" opt-in are gone with them, so the preview
and the apply can no longer disagree. `src/build.ts SHIPPED_PROFILE` flips 'apca' → 'wcag'
so generated CSS matches the lane in use — INDEPENDENT of the collapse and the larger
visual change of the two: the washes are identical between lanes, the ring and the cta are
not (critical ring #ED8368 → #D0684F). The profile machinery stays dormant in
`reqtoken/profiles.ts`, where the wcag path is a passthrough.
Existing enterprise files ADOPT their old columns rather than growing new ones: resolution
falls back to the legacy name and renames the mode in place, so modeIds — and every
binding — survive. The retired apca pair is left for the user to delete; the plugin does
not remove modes it no longer owns.

CAUGHT BY RECONCILIATION, NOT BY TESTS. `plugin-ext/payload.ts` injects the off-scale ink
anchor when it sees the LAST scale ink, keyed by name. After the renumber that trigger
never fired and `neutral/ink/11` silently vanished from the Figma payload. Found only
because the base row count came up one short of what the deleted tokens explained.

LOGGED, NOT FIXED: dark stop 8 loses its upper bound — the deleted stop 9 was what capped
it. Owner-accepted and deferred to the phase-2 dark round, where it belongs with the wash
spread and the 151%/184% overshoot it is part of. Values did not move; only the gate that
would have caught the case is gone. Also open: the public plugin is compile-only by owner
ruling, so `plugin/ui.ts` still reads the deleted `onHighlightIsWhite` and its preview chip
will render a wrong-pole label; `plugin/` is outside the root tsconfig, so nothing catches
it. The demo keeps its own WCAG/APCA toggle — removing APCA was scoped to the plugin.

Ten gates green. The docs-page ramp brackets were ALSO found stale by a hardcoded column
count (spans 2/5/3/2 against a 12-column grid — a band layout two renames old); every
bracket grid in the demo now derives its column count from its own scale and asserts it.

## C34 — THE ROTATION IS FOR DERIVING, NOT FOR TRANSFORMING

Owner-caught, 2026-07-29, immediately after C33: *"I can't add a lighter version of a brand
color without it re-coloring."*

`DEFAULT_SECONDARY.rot` is 12°, applied in `defaultSecondarySeed`. It exists so a secondary
DERIVED FROM THE PRIMARY steps off its parent hue instead of reading as a paler copy of it.
But the 2026-07-12 ruling deliberately unified the two seeds — *"'from brand' custom would
just do the same thing as derived from brand"* — so `resolveDefaultModel` ran the identical
transform whether the seed was the primary or a hex the user typed, and the rotation came
along. Measured across the wheel it moved a supplied hue +9° to +13°: #F27DA8 → #eed2d5,
#2C5FC9 → #b8c0dd, #2E9E3F → #9edeb7. For a colour the user had already chosen, that is not
a derivation, it is re-colouring their pick.

`defaultSecondarySeed(hex, rotate)` — derived passes true, a supplied seed passes false.
One flag, not two paths: everything else about the model is genuinely shared.

THE LIFT AND THE CHROMA DAMP STAY (owner ruling, asked explicitly). They move the supplied
colour much further than the rotation did — #F7B0C8 (L .831, C .088) resolves at L .901,
C .028, 32% of its chroma — but Custom is documented as "your color through the derived
model, lifted", and `exact` is the hands-off path for anyone who wants their hex shipped
untouched. Recorded here because the next person to read the numbers will notice the lift
and should know it was seen and kept, not missed.

Verified through `resolveTheme`, both postures, all three styles: from-primary still steps
+12.9°; custom/default holds hue to within the 8-bit round-trip (≤1.0°, and that residual is
quantisation at C ≈ 0.03, not a rotation); exact and outline are 0.0° as before.

Blast radius is the Custom chip alone. Every audit that builds a secondary either calls
`resolveBrand` directly or lets `secStyle` fall through to `exact`, so ten gates pass with
ZERO snapshot movement — no re-bless, which is itself the evidence that nothing else uses
this path.

## C35 — DARK STOP 8 IS PLACED BY ITS OWN LAW, NOT BY THE STOP BELOW IT

Owner-led round, 2026-07-29 — phase 2 of the dark round scoped in
`scripts/highlight-collapse-plan-2026-07-29.md` §Sequencing, resting on
`scripts/stop-8-9-drift-handoff-2026-07-29.md`. Owner ruling: *"dark stop 8 has the same
requirements as light, it is a 3:1 contrast require on paper 3 so inputs can be placed on
any paper."*

THE OVERSHOOT WAS NEVER DRIFT. The drift handoff recorded dark stop 8 at 151% of its 3:1
target and attributed it to the mechanism it had just named — a require is a floor, the
scaffold already clears it, so the solve never runs. That is not what happens at stop 8.
The require DOES fire and solves to 3.05; it is then overridden by the C24 7→8 band-order
floor. Measured over 366 ramps (360 agnostic brand seeds + 6 neutrals) the floor fired
366/366, supplied 0.056–0.157 of stop 8's L, and accounted for the whole gap between its
law (3.05 vs paper-2) and where it shipped (4.65 brand median, 5.01 neutral). It was not a
guard that occasionally caught an edge case. It was the placement rule.

A GUARD FOR AN INVERSION THAT CANNOT HAPPEN. The floor reads as an inversion guard — C24
added it because a lifted wash-7 could overshoot an achromatic ramp's low-riding 3:1 solve
(the neutral inverted at ×1.75). It is IMPLEMENTED as "carry light's 7→8 apparent gap", and
the 3:1 solve is never near that gap — short by 11.6 apparent-L at the median, 18.1 at the
worst — so the condition held on every ramp and the floor always won. The inversion itself
stopped being possible when C28 halved the lift and nobody re-checked the guard: without
the floor, stop 8 still sits at least 5.35 apparent-L above wash-7 (median 6.85) on all 366
ramps, 0 inverting.

AN ACCESSIBILITY BORDER CHAINED TO AN ILLUSTRATION STOP. wash-7 carries no `semantic.css`
alias, and the owner's ruling is that it is an ILLUSTRATION colour. Through the floor,
moving wash-7 for an illustration reason silently repositioned the stop carrying WCAG
1.4.11 — which since C33 is `--border-default`, the border of every input. Owner:
*"if 8 is getting boosted by 7 and then that is in turn closing it in on 9 that doesn't
make any sense."* It was not closing onto ink-9 to a breaking degree (gap 0.143–0.212 L),
but it was SPENDING that room, which is why it surfaced only as "no ink ceiling tighter
than 150% is available" rather than as a visible defect.

THE PAPER-2 ANCHOR WAS MASKING A REAL FAILURE. `S8_DARK` declared 3:1 against paper-2, on
two grounds that had both expired: that the dark ring already cleared paper-3 from its own
scaffold, and that re-anchoring drove it past the hand-placed hl-9. hl-9 died in C33, and
the paper-3 clearance was the floor's doing, not the scaffold's. In dark the ring is
lighter than every paper, so the LIGHTEST paper is the hardest — with the floor gone and
paper-2 kept, stop 8 lands at 2.86 against paper-3 on ALL 366 ramps: an input border on the
pop plane would fail 1.4.11. Anchored at paper-3 it lands on the law, worst 3.04.

WHAT SHIPPED. `S8_DARK` is deleted and both modes reference one `S8` at paper-3 — one rule,
one anchor, one number. The 7→8 floor in `resolve.ts` is deleted with it. Dark stop 8 is now
bounded by its own law in both directions rather than by whatever the stop below it does,
which CLOSES the "unbounded upward in dark" item C33 deferred to this round — on a premise
that turned out to be wrong, since it was never riding free.

THE GATE COULD NOT HAVE CAUGHT IT. `highlight-audit` §1b hardcoded `dark → paper-2`,
mirroring the old declaration, and paper-2 is the easier plane in dark. It would have gone
on certifying the retired rule against the weaker anchor indefinitely. Now paper-3 in both
modes. `divergence-audit` §D still reads paper-2 and is labelled so its stop-8 row is not
mistaken for the compliance number.

PROOF THAT NOTHING ELSE MOVED. A 4,800-value dump — every brand, secondary, signal and
neutral, both lanes, every stop plus the off-scale roles — bundled against a git worktree at
the branch point AND re-run against the true parent after a concurrent session moved the
branch under it. 150 lines differ; all 150 are dark highlight-8. No light stop, no dark
wash, no ink, no cta role, no on-fill pole. Neutral `#878a8a → #686b6b`, reading 3.05
against paper-3 where it read 4.70. The band-order margin under ink-9 IMPROVES, 3.18 → 3.75
worst. `smooth`: 0 regressions, 406 improvements. Divergence and smoothness re-blessed after
the diff was read; the dark and highlight snapshots came back clean on their own — neither
covers stop 8.

CORRECTIONS TO THE DRIFT HANDOFF. Its ink overshoot figures were measured against the
DECLARED anchor while `wcagAnchorStop` overrides ink requires to paper-3 in the WCAG lane.
Against the anchor that actually binds: dark ink-9 172% (not 184%), dark ink-10 183% (not
195%), light ink-10 170% (not 180%). Same story, lower numbers.

LOGGED, NOT FIXED: the wash lift itself is untouched and still wants the owner's mark — ALL
of dark's excess wash spread is `DARK_BAND_LIFT` (her C28 ramp), and with the lift off the
dark seams sit at light's spacing; the photometric ladder underneath is not the cause. It is
now purely a wash-and-illustration decision, because the lift no longer reaches stop 8 at
all. The ink ceiling is also open: the inks are scaffold-placed (owner's 2026-07-20 pick),
do NOT move with the lift, and only a 150% ceiling survives C33's band-order invariant —
125% fails 97/360 and 100% fails 360/360, inverting the band so the emphasis fill reads
dimmer than the focus ring. Also open: `P_FIXED` on dark stop 8 is now vestigial, since the
require places it from the sentinel on every production ramp; and the APCA lane moved the
other way, slightly lighter (`#7b797a → #7d7b7b`), because there the harder paper-3 anchor
outweighs what the floor contributed.

Ten gates green.

## C36 — CUSTOM KEEPS THE RAMP, THE CTA IS THE TINT; AND THE ANCHORS PLACE THE BUTTON

Owner-reframed, 2026-07-29, the round after C34. C34 kept the lift on a supplied hex and said
so; testing it against a saturated orange showed why that was the wrong call. Her statement of
the offering, verbatim: a secondary is either **derived from primary** (mutes and rotates the
hue), **custom** (*"the id is preserved as is, but the cta is generated as if it was a tint of
the given hex"*), or **exact** (*"whatever hex, and it generates the ramp like a primary"*).

WHAT THE LIFT WAS ACTUALLY COSTING. Applied to the whole ramp it did not just pale the
surfaces, it took the INK — the text colour. Agnostic seeds at 95% of the sRGB gamut, ink-10
chroma, custom-as-shipped vs the hands-off ramp: warm cusp H 69° 0.080 → **0.017**, red H 29°
0.080 → 0.023, blue H 264° 0.080 → 0.024. A saturated orange's text colour came back
gray-brown. The measured cause is C34's: the `kR` ceiling binds at the lifted L, so `kC`'s
halving is not the story — but the round's finding is that the ramp was never the thing that
needed quietening.

TWO MODELS, ONE TRANSFORM — this supersedes the 2026-07-12 "one default model, two seeds"
unification. Derived is MANUFACTURING a secondary that does not exist, so the whole ramp
descends from the rotated, lifted seed; there is no pick to preserve. Custom is QUIETENING one
the user chose, so their hex is the seed for the ramp and only the cta trio comes from the
tinted seed. `resolveCustomModel` resolves the ramp through the EXACT posture's own call, byte
for byte, so "preserved" is literal and gateable — a first cut used the derived opt-set and
210/960 dark ramps diverged, because that set carries `darkCtaFlatApp` and leaves on-fill
enforcement on. `cta-ink` is NOT tinted (owner ruling): it is the text-register cta whose rest
value matches ink-9/ink-10, which under this model are the user's colour.

THE TINT EARNS ITS PLACE BY MEASUREMENT. When someone supplies a secondary on the primary's
own hue, the untinted cta is the SAME BUTTON — cta ΔE vs the primary 0.000, and 0.025 dark for
a near-black navy. The tint lifts that to 0.39 light / 0.24 dark, clear of
`SECONDARY_DISTINCT_DELTA_E`. On-cta label contrast after the splice: 9.93–15.88:1 light,
5.36–6.21:1 dark, every seed.

THE ANCHORS PLACE THE CTA, NOT THE RAMP. The plan doc assumed an anchor pins the ramp's
lightness. Measured, four seeds × six anchors: green, navy and pink move **0 of 20** ramp
stops; only the near-cusp #FFA200 moves 18–19/20, and there because shifting the seed's L
shifts `maxChromaAt` and so the saturation envelope. The cta moves across the full range every
time. That is the engine's core rule showing through — the ladder is shared, the cta is the
per-family differentiator. So an anchor REPLACES the custom posture instead of composing with
it (custom's tint owns the cta): both UIs send `secondaryStyle: 'exact'` alongside an anchor.
Owner's ruling, from the exhibit: picking a band gives **their colour at that lightness**, not
a muted version of it — the alternative flattened #FFA200 to C 0.035 in all six bands, which
is the complaint that started the round, reproduced six times.

THE GATE CAUGHT ITS OWN BLIND SPOT TWICE. `secondary-audit` lane 1b now asserts the MODEL, not
a note-string: the custom ramp equals the exact ramp in both modes, the cta does not, and
cta-ink does not. Lane 3's first cut asserted only that the anchor was threaded and the ramp
preserved — both stay true when the anchor does nothing, which is exactly the bug it shipped
past. Its second cut asserted "cta differs from un-anchored", which false-positives on a seed
whose own L already sits at a median, where a no-op is correct. It now asserts the anchored cta
LANDS ON the band median (±1e-6) and that the six are distinct — the definition, so it can
neither miss nor false-positive.

FIXED IN PASSING, a live crash on main: both chip previews in `plugin-ext/ui.ts` asked for ramp
stop 11, which C33's ink renumber removed from the array (it emits as an off-scale literal). So
`hxs(undefined)` threw on EVERY render, the catch logged an unattributable "Cannot read
properties of undefined (reading 'r')", and the throw skipped the `syncInfoLines()` below it —
the info copy never updated. Now stop 10, and `at()` throws a named error instead of using a
bare non-null assertion. Also: grey is now reserved for the hands-off Exact chip, since an
anchor sends style 'exact' and derived leaves the last style in place — both used to inherit
the grey chip and stop looking like a colour.

Blast radius is the Custom chip and the new anchor entries. Ten gates green with ZERO snapshot
movement and no re-bless — the same evidence C34 rested on.

## C37 — THE DARK WASHES ARE DECLARED AT ONE S, AND THE OLD RAMP SLOPED THE WRONG WAY

Owner-led round, 2026-07-29 — the wash third of the phase-2 dark round
(`scripts/highlight-collapse-plan-2026-07-29.md` §Sequencing). Her framing: dark has
different surfaces, so its needs differ. The washes carry no contrast requirement, but they
still have to READ ON PAPER, and flipped to dark the surfaces move the other way and the
washes recede. *"4–7 probably do need to be higher than they are in light mode, but their
distribution should be more analogous."*

THAT CLAIM IS TESTABLE, AND IT FAILED. Define S as a dark wash's contrast against paper-1
divided by its light twin's. If dark were light RAISED, S would be one number for the whole
band, because multiplying every stop's contrast-vs-paper by a constant cancels in the ratio
between neighbours. Measured over 366 ramps, shipped S ran **1.03 / 1.09 / 1.20 / 1.41**
across washes 4–7 — a 37% spread, identical against paper-1 and paper-2 so not an artifact
of the plane. Dark was light STRETCHED, not light raised.

AND THE RAMP DELIVERED LEAST WHERE THE RECESSION WAS. `DARK_BAND_LIFT` was a RISING ramp
(1.225 → 1.375), but it is a PROPORTIONAL operator on apparent depth from the ground, and
depth is near zero at the top of the band. k × almost nothing stays almost nothing: wash-4
took 3% while wash-7 took 41% — and `-bg-subtle`, the chip fill the owner flagged as washed
out, is wash-5. No multiplier fixes that. Swept far past anything shippable, a FLAT lift
gives wash-4 / wash-7 of 1.03/1.27 at ×1.25, 1.27/2.39 at ×2, and 3.30/9.69 at ×5. Level and
distribution are coupled by the operator's form, so no single number delivers both — with no
lift at all the distribution is already analogous (S 0.97–1.03) but sits at light's level,
which is the thing that was wrong.

SO THE BAND IS DECLARED IN CONTRAST SPACE. Seam contrast between adjacent washes equals
`c_n / c_{n−1}` in BOTH modes, where c is contrast against that mode's own paper. A constant
S therefore cancels and every seam ratio matches light's identically while the whole band
sits S× further off the paper — the distribution comes out analogous by algebra rather than
by calibration. S is the one number; the four per-stop lift values are SOLVED from it by
bisection through the real pipeline, and the shape must DECREASE down the band because of
the operator it feeds.

S = 1.20 IS WASH-6'S OWN CURRENT VALUE. A full S=1.40 was built first and read well on
chips, but the owner saw it in full-ramp context and asked for a lighter touch. Choosing the
pivot at wash-6's existing S makes the change a pure REDISTRIBUTION rather than a boost:
wash-6 does not move at all — its solved lift returns 1.325, byte-identical to shipped,
which is the check that the pivot is real — while 4 and 5 come up and 7 comes down. Contrast
vs paper-1, median: wash-4 1.24→1.45, wash-5 1.45→1.60, wash-6 1.82→1.82, wash-7 2.53→2.16.
Resulting seams 1.105 / 1.137 / 1.186 against light's 1.105 / 1.139 / 1.188.

ACCEPTED COST, THE 3→4 SEAM. The papers stay pinned by C27's one photometric level, so the
entire raise lands on the single seam where the wash band meets paper-3: 1.107 → 1.295,
which is exactly light's 1.082 × S. That is not a side effect, it IS the raise — the band is
light's band translated up, and a translation shows up entirely at the boundary.

BLAST RADIUS. 504 of 4,800 values, measured against a git worktree at the true parent: dark
wash-4/5/7 on all 150 ramps, wash-6 untouched, plus 54 neutral dark cta values because
`--neutral-cta`'s rest tracks the scale's own stop 4 by design (highlight-audit §3). No light
stop, no paper, no highlight-8, no ink, no brand or signal cta. Zero gamut clamping in the
wash band at any S tried up to 1.40. Band order holds with no inversions and no non-monotone
steps; the tightest step in the ramp remains paper-1→paper-2 at 2.41 apparent-L, so no seam
becomes a new bottleneck. `smooth`: 646 improvements against 23 regressions (grid), 23
against 2 (fleet), the regressions all `dark.wobble` / `dark.drift` at C 0.06 in H69–102.

A TOLERANCE WAS WIDENED, DELIBERATELY. `divergence-audit` §A compares a dark stop's chroma
to its SAME-STOP light twin's, but a lifted stop samples the light ladder at the SCALED depth
by design (`deltaLiftChroma`) — so that gap grows with lift size and the tolerance was
quietly doubling as a bound on how much lift is allowed. The steeper wash-4/5 lift took
`branded h270 dark stop 5` to a 0.0042 gap against a 0.004 bar: one stop of 120, on a chroma
of 0.0121 versus 0.0163, one near-neutral gray against another, and the same stops already
read 0.0026–0.0031 at the old lift. PARITY_TOL 0.004 → 0.005, owner-approved. The correct fix
— evaluate `want` against the virtual twin at the scaled depth so the check states the actual
law — is recorded in the file and not done here.

LOGGED, NOT FIXED: the owner is considering flattening the washes in BOTH modes. That is
upstream of S, because light's distribution is the reference this solve copies; if light
flattens, S stays meaningful but the shape it reproduces changes. Its own round. Also still
open, and the last of phase 2: the dark inks. They are scaffold-placed (owner's 2026-07-20
pick), do NOT move with the lift, and now that C35 dropped dark stop 8 the 8→9 gap is the
widest seam in the dark ramp. The earlier finding that only a 150% ink ceiling survives the
band-order invariant PREDATES C35 and must be re-measured, not reused.

Ten gates green.

## C38 — THE POLE CARRIES LEGALITY, SO THE EXACT CTA CAN BE THE HEX

Owner-caught, 2026-07-29, reviewing C36: *"exact mode isn't supposed to be turning off on fill
enforcement, it is just supposed to not do any collision avoidance"* — then, on the first
attempt: *"you should be making the cta literally the hex color, where is it changing?"*

Both statements are right, and together they were incompatible with the declared architecture.
`resolve.ts` read `enforceOnFillContrast: !opts?.exact`, and for `onFill` the enforcement IS the
fill re-solve — spec.ts said so outright: *"onFill's floor is the ENFORCEMENT itself (the fill
re-solves to 4.5-white)"*. So exact had a choice of two wrongs: keep the hex and ship an
illegible label, or enforce and move the hex. It kept the hex.

WHAT THAT COST, measured through resolveTheme: **22 of the 31 shipped brands** had a secondary
whose on-cta label missed 4.5:1 — dark almost universally, 2.54–2.97:1, plus light on ube-latte
2.78, peppermint 3.14, espresso 3.28. Brands carry a real `secondaryHex` with no style, and
`secStyle` defaults to `'exact'`, so the whole fleet's secondaries went down the hands-off path.
Agnostic 240-seed sweep: 45 light + 142 dark failures.

THE RESOLUTION IS THE NEUTRAL'S LAW, which colorEngine already stated for the scale-fed cta:
*"the fill can't re-solve, so the pole flips."* `onFill` was the one requirement with no
`ratioFloor`; it now declares 4.5, `withProfile('apca')` strips it (as spec.ts always claimed it
would — there had never been a floor to strip), and the floor is applied at THE FILL THAT SHIPS,
after every move has settled. Measured sufficient and free: a pole flip alone reaches 4.5 on
240/240 agnostic seeds and 62/62 brand-secondary lanes, and the exact cta now holds the typed hex
on 240/240 seeds — max movement 0.0000 — with zero label failures in either lane.

THE FIRST TWO ATTEMPTS WERE BOTH WRONG, recorded because the shape of the error is the lesson.
(1) `enforceOnFillContrast: true` for exact fixed legibility by MOVING THE HEX — 87/240 seeds,
which is what the owner caught. (2) Flooring the PRE-ENFORCEMENT pole instead: that boolean is an
INPUT to the fill solve (`ctaLightL` darkens for white, `apcaClearance` lightens for black), so
flooring it early re-routed the chain and rewrote brands that were already legal — matcha
`#00873f` white 4.60:1 → `#53c877` black, dragonfruit `#d52f83` → `#ff91bd`, signal:red moved
too. Seven scales drifted and `audit:ext` went to 67 changes. The floor only belongs where the
fill is final.

IT IS A REPAIR, NOT A PREFERENCE. The check flips the pole only when the chosen one misses the
floor AND the other clears it — deliberately narrower than `onTextIsWhite`'s own ratioFloor
branch, which flips whenever the chosen pole misses, including into a pole that also misses. So
it is inert for every fill whose label already passes, which is why the fleet holds still.

BLAST RADIUS: `audit:ext` only, 28 override-set changes, every one `brand-secondary/cta/on` — 22
dark gain the override, 6 light LOSE it because their pole now matches the base. Zero lines of
that snapshot changed on any other path. Brand primaries, signals, divergence and smoothness all
clean; nine gates needed no bless.

STILL OPEN, and it is the other half of the owner's question: `apcaClearance` (`coEnforceLc` 60)
moves the exact fill independently of any of this — 42 of 240 seeds, APCA driving a decision in
the WCAG lane. It is owner-blessed (C18, the 2026-07-13 dead-zone ruling) and untouched here, but
it is the remaining reason an exact cta is ever not the typed hex.

## C39 — THE CTA-BORDER SAFETY: A DECORATIVE STROKE FOR FILLS THAT VIBRATE

Owner-requested, 2026-07-29: *"when a cta is below 3:1 is it possible for us to check it and alias
the next darkest stroke to it's cta border? right now they are all sitting at transparent."* This
reverses the 2026-07-04 removal of the conditional gate (*"filled is filled"*) — knowingly, and on
a different basis: it is **not** a conformance requirement. Her framing: *"it's a safety … maybe I
overstated it. This is for buttons who are so light or so vibrant that they vibrate against the
background instead of sitting on it."* No WCAG claim is made or implied.

THE TRIGGER IS A LIGHTNESS TEST. It took three passes to land, and the wrong turns are worth
recording because each was a plausible misreading of "below 3:1":
  · **3:1 vs paper-3** — the first build. Wrong: she was not describing a contrast requirement.
  · **≈1:1 vs paper-3** — measured, and no seed in the fleet is within 1.15:1 of paper-3, so it
    would have fired on nothing.
  · **cta.L ≥ paper-3.L** — her literal correction, and it INVERTED: 0/186 light, 62/62 dark. In
    light mode paper-3 is the darkest paper and the pale vibrating fills are darker still
    (`#f1e1c8` cta against a `#fcf2e1` paper-3), so the rule excluded exactly its targets.

The landed rule, mode-mirrored on her mark:

```
light: cta.L >= wash-5.L     — vibrates by being too LIGHT, like another sheet of paper
dark:  cta.L <= wash-5.L     — dark surfaces are dark, so it vibrates by being too DARK
```

WHY WASH-5, derived from her own data point rather than picked. She said *"the neutral button as
is falls in this category"*, and the neutral's cta rests exactly on stop 4 (L 0.9216) — paper-3
sits at 0.9479 and misses it. wash-5 also satisfies her second constraint, that this *"mostly
[affects] secondaries"*: a custom secondary's tinted cta lands at L ≈ 0.89, just UNDER wash-4, so
over pale agnostic seeds wash-4 catches 0/96 custom secondaries where wash-5 catches 81/96.
Verified through the shipped helper: neutral BOTH modes, 0/31 primaries, 0/31 exact secondaries.

THE STROKE IS AN ALPHA, NOT A RAMP STOP — 12% black in light, flipped to WHITE in dark, confirmed
on her Figma screenshot of both frames. This was the last thing settled and it mattered more than
it looked: a family-relative source (highlight-8, the outline secondary's precedent) made the
NEUTRAL's border brand-hue-tinted, so it differed per brand and cost **88 new per-brand
overrides**. The brand-independent alpha stays a base row and costs **1**. It also cannot fight
the fill's hue, which a same-family wash stop can. Unlike the shadow set (4/8/12% black in light →
32/48/64% in dark, because near black a light alpha vanishes) this does NOT scale up: a stroke
sits ON the fill rather than bleeding into the ground.

BOTH STATES ARE ALIASES, NEVER RAW (owner: *"the rest of them should get aliased to the transparent
variable instead of being raw"*). New `system/alpha/cta-border` row beside `system/alpha/transparent`;
CSS gains `--alpha-cta-border` / `--alpha-transparent` at the engine's one global `:root`, emitted
<!-- NAMES AS OF C39. The row was renamed `cta-border` → `offset-12` one commit later (5a30f1b,
     never back-written here), and C41 then retired `offset-12` entirely for the 06/08/16 ladder.
     Read the token names in this entry as historical. -->

per scheme because the stroke is scheme-divergent. figmaRender's banner had claimed this aliasing
already happened — it never did. Both rows are created in the early alias-target pass with the abs
poles, because `ensure()` registers into `baseVars` as it creates and a target created later in
payload order would silently fall back to a raw write.

Layout never shifts: components already carried `border: 1.5px solid var(...-cta-border)`
unconditionally against the transparent value, which is why the token survived 2026-07-04.

BLAST RADIUS: `audit:ext` only — base token count 140 → 141 (the new row) and ONE roster entry
gaining `brand-secondary/cta/border`. Nine gates needed no bless. Demo untouched, per her
instruction. Both plugins rebuilt and the extended UI re-verified in a browser.

TRAP FOUND: `npm run generate` runs `node dist/build-script.js` — a PREBUILT bundle. It will
silently emit from stale engine source. Use `npm run build`, which bundles first.

## C40 — C33 LEFT THREE REPORTERS DESCRIBING THE OLD SHAPE

Surfaced 2026-07-29 while double-checking main after a session ran out of context mid-round.
Nothing here is an engine defect — all three are gates that went stale and then lied about the
engine, which is the more dangerous failure because it costs a diagnosis every time.

**`gamut-sweep` had been failing on every one of its 1800 seeds since the highlight collapse.**
The structural check asserted a literal `light.length !== 11` while the scale has carried 10
stops since C33, so each seed reported `MALFORMED … light=10 dark=10` and hit `continue` before
a single real check ran. A gate that fails identically on all inputs reads as broken plumbing,
so nobody read past it — for two rounds, and nothing in CI runs it. The count now derives from
the token name table (`SCALE_STOP_COUNT`).

**Then the un-muted sweep reported two false findings, and the gate was wrong again.** With the
structural check fixed, `#c92359` (L 0.55 C 0.20 H 9) and `#b84c00` (L 0.55 C 0.20 H 51) came
up as brand ctas sitting inside the C12 red gate with no resolution. They are not. C12 v8
resolves a brand/red collision from EITHER side — the brand exits via repel, or red moves to the
deep-core complement — and the check compared the brand cta to CANONICAL red, crediting only
the first mechanism. Both seeds resolve by the second: each ships a `red → coral L0.65`
override, so they sat 0.087 and 0.082 from a red they never ship beside while sitting **0.119**
from the one they do, clear of the 0.09 gate. Now measured against `signalOverrides` red when
present. The engine was right both times.

**`dark-audit`'s drift labeler computed `% 12` over rows holding 10 stops per mode**, renaming
every drift it reported: this session's dark wash-4 surfaced as "stop 2 (dark)", which reads as
a PAPER stop and flatly contradicts C37's own "no paper" — that mislabel is what made a routine
unblessed snapshot look like an engine bug. Per-mode width now derives from the row.
`highlight-audit` reported bare triple indices, so "token 5" had to be hand-decoded back to
`cta-dark`; its triples are named now.

THE PATTERN, which is the reason to log this at all: C33 renumbered the scale and updated the
engine, and three separate reporters kept describing the old shape. Anything holding a hardcoded
stop count, index width, or a canonical-vs-effective comparison is suspect after a renumber.
`sweep` now passes end to end — 1800 seeds, 0 malformed, 0 residuals, 0 shear-induced, 0
unhandled warning collisions — for the first time since C33.

## C41 — THE CTA-BORDER GATE MOVES TO APCA, AND THE STROKE BECOMES A LADDER

Owner-driven, 2026-07-31, off her own edge-case review of C39's output. She was explicit that this
is **two separate problems plus one addition**, and that the stroke caused neither:

1. **hierarchy is not accounted for in edge cases** — a custom secondary can come out reading as
   heavy as, or heavier than, the primary. That is the FILL.
2. **more ctas need the stroke than are getting it** — C39's gate caught almost nothing. In shipped
   `dist` it fired 62 times and every one was the neutral: 0 primaries, 0 secondaries, 0 signals.
3. an **addition**: a rank-ordered ladder, so the stroke can also carry hierarchy.

### APCA IS AUTHORIZED HERE, AS A TASTE INSTRUMENT
Her ruling, verbatim: *"This is NOT an accessibility measure, it is a taste measure. The buttons
don't have a requirement to pass 3:1."* And on the numbers: *"lc 30 is for text, I included that as
a max, 15 is min for visibility... We aren't making something readable, we are adding a stylistic
pop."* So **Lc 15 / Lc 30 is a BAND, not a pair of rival thresholds** — a first build read them as
candidate gate bars and invented a third at 45, which cost a rebuild. This does not reopen the wcag
lane; it is the same carve-out as C36's APCA clearance.

### THE GATE
```
|apcaLc(cta, page)| < 15   →  this family earns a stroke
page = neutral paper-2 in LIGHT, neutral paper-1 in DARK   (the demo's --surface-base)
```
The reference is **the page, not the family's own ramp** — that was C39's mistake and it is why it
under-fired. C39's hand-written light/dark branch is GONE: |Lc| is absolute, so mode-mirroring falls
out instead of being maintained.

`signalsCss()` is the one emitter with no brand in scope (it takes only a profile), so it uses a
canonical neutral plane. Measured spread of each signal's |Lc| across 12 brand hues: **0.76 light /
0.08 dark** — far under the gate's resolution, so the CSS side cannot diverge from the Figma side.

### THE LADDER
| family | rung | |
|---|---|---|
| neutral | `offset-08` | fixed by owner ruling, never solved |
| secondary | `offset-06` | |
| brand + signals | `offset-16` | signals are unreachable at Lc 15 but defined |

Picked off a four-way render of 06\|08 secondary × 16\|20 primary: **06/16 held hierarchy in 36 of
36 cases** with the secondary in band everywhere. 04 bottomed out at Lc 15–16 (*"04 is too low"*);
20 pushed the primary past the Lc 30 ceiling in half the cases. Her hand edit had been 08/12/24 —
12 validated cleanly (Lc 23.5–28.5 across 12 firing secondaries) but 24 missed the ceiling in every
case it fired (34.8–36.2).

**Because 06/16 holds unconditionally there is NO conditional escalation.** Her question — *"when do
we increase the offset on the primary because the secondary is darker?"* — dissolves: the pairing is
the answer.

**A RUNG IS NOT A LOUDNESS.** The same alpha over different fills lands at a different Lc:
`offset-12` reads 26.0 over a pale blue secondary but only 19.2 over a pale green primary. A ladder
ordered as numbers can still invert as pixels, so the three rungs were chosen on the RESULTING Lc.

### THE NEUTRAL IS NOT TOUCHED
Owner ruling. Its cta sits under APCA's own **black-level clamp** — |Lc| reads exactly `0.0` in both
modes, which means "below the reporting floor of Lc 7.3", i.e. genuinely indistinguishable, not a
bug. At 08 its stroke lands Lc 17.1 in light (in band) and 8.7 in dark (under). She accepted the
dark shortfall rather than raise it, calling the rung that would fix it (offset-24) *"too loud"*.

**C39's claim that the alpha never scales up in dark is measurably wrong** and is retired here: at
this gate the dark neutral needs upwards of 32% where light needs 8%.

### SCOPE, MEASURED
Strokes on secondary/primary appear in **light mode only**. By tier: pale → secondary + primary ·
mid → secondary only · deep → nothing. Across 18 brands in dark, the only stroke is the neutral's.
No signal reaches Lc 15 in either mode (nearest: warning-light at 19.4), though per-brand warning
*variants* do dip under and fire.

### MIGRATION — A RENAME MOVES THE NAME, NOT THE VALUE
`offset-12` is retired via `RENAMED_LEAVES` `['offset-12','offset-08']` (owner: *"just rename
offset-12 and adjust the value"*). The neutral was its only consumer, so the rename carries every
existing binding. **But `ensure()` adopts a legacy row by renaming it WITHOUT bumping `createdVars`,
so `seedFresh` never runs and the row arrives still holding 0.12 under its new name** — a token
called offset-08 resolving 12%, which is worse than a raw value because the name lies. A third pass
(the `RUNG_ALPHAS` loop in `plugin-ext/code.ts`) re-values it, conservatively: only an exact pole at
one of our own rung alphas is rewritten, so a designer's edit survives. Deleting that pass silently
un-does the rename. Same class as the 2026-07-30 *"the alpha transparent didn't take"* catch.
`strokeTargetFor` also targets the rung the PAYLOAD wants for a path rather than the one the old
value implies, so a file holding the retired 12% neutral border lands on 08.

### WHAT ELSE THIS ROUND FIXED
- **A gate now asserts `ctaNeedsBorder`** (`figma-verify`). There was none: the only regression
  evidence was an ext-snapshot diff, exactly the blind spot C40 was written about. It checks that
  the two emitters decide identically, that the rung matches the family, and that the gate is
  page-relative — all three of which a plausible refactor breaks silently.
- **The demo wired the token for one of three buttons.** `.u-btn-primary` and `.u-btn-neutral`
  carried `border: 1.5px solid transparent` and never referenced `--*-cta-border`, so a firing brand
  or neutral emitted a stroke nothing drew.
- Stale comments retired: `figmaRender`'s banner named `ctaBorderStop` (never existed) and stated
  the discarded 3:1-vs-paper-3 rule; three files imported `contrastRatio` and never called it.

### PAUSED
**Ask #1 — the secondary shifting lighter — is PAUSED by the owner, not dropped.** Measured for
whenever it resumes: 51% of custom primary/secondary pairs have the secondary heavier; a lift fixes
44% of those and **cannot reach the rest**, because the shipped `minGapApp 10` ground floor caps any
secondary at apparent 90.0 while a pale primary's cta sits at 97.2 — above the secondary's own legal
ceiling. Entirely driven by the primary's lightness (0/72 broken at seed L 0.55 → 72/72 unreachable
at L 0.94). Her screenshot is in the unreachable class, which is why the ladder, not the lift, is
what fixed it.

BLAST RADIUS: `audit:ext` only — base token count 141 → 143 (offset-12 renamed to 08, plus 06 and
16), and 8 roster entries gaining a `cta/border` override (warning variants and roster secondaries),
**all light-mode**. Eleven other gates needed no bless. Instruments:
`scripts/cta-border-sweep.ts`, `cta-border-trio.ts`, `cta-border-hierarchy.ts`.

### C41 addendum — THE OPT-OUT
Owner, same day: *"this should be on by default but optional. when this fires, can we add a check
box to the plugin?"* Added as **"Outline low-contrast buttons"** in the Advanced menu of the
extended plugin and the demo, **checked by default**.

*"When this fires"* resolves to **always**: the neutral's cta reads |Lc| 0.0 against the page in
every theme and both modes, so at least one family always fires and a conditional row would never
be hidden. Shown unconditionally rather than behind a condition that is always true. (Contrast the
`cta-escape` row, which really is hidden outside the red range.)

TWO THINGS THE IMPLEMENTATION LEANS ON:
- **Off is expressed by withholding the PAGE, not by a second branch in the gate.**
  `ctaNeedsBorder` already returns false without a page, so there stays exactly one place that
  decides — "no ruler" and "don't measure" are the same code path.
- **Absent means ON.** The flag serialises as `false | undefined`, never `true`, so every recipe
  stored before it existed replays with its strokes intact. Same reasoning as `ctaEscape` storing
  only its effective value, inverted for a default-on flag.

Layout still never shifts when it is off: the border stays `1.5px solid` against the transparent
variable, verified in the demo (all four buttons `rgba(0,0,0,0) / 1.5px`).

`plugin/` (public v1) does not get the row — stale vintage, pre-C33 names, unpublished since
`8106a92`.

## C42 — THE CLEARANCE BECOMES THE LAW: Lc 65 EVERYWHERE, CRITICAL AT 50, DARK INCLUDED

Owner-driven, 2026-08-02, off the CTA/APCA audit round (the extended plugin's apca option is
retired for organizational reasons — the wcag lane is the only lane anyone ships, and its 4.5
was passing ctas her eye rejected: the coral critical, vibrant cyan/green black-pole fills).

Her rulings, in the order she made them: judge with a buffer over the minimum → red cannot
clear 60 and stay the signal → **the signals are ONE GROUP, not per-surface bars** — critical
is the identity carve-out at a minimum of Lc 50, every other signal holds the cta law →
**Lc 65 for all the ctas besides critical. NOT exact mode.** Dark included (her reversal,
"the findings for light are so narrow" — dark measured 139/144 under 60, never having been
held to any Lc bar). CUSTOM secondaries are IN — "the same as the recommended": their cta is
the engine's tint (resolveCustomModel → the derived register), which inherits the clearance
with no extra wiring. EXACT-style secondaries are the hands-off posture and stay out with
exact mode. (An earlier cut of the audit resolved bare secondaryHex — the EXACT posture —
and mislabeled it custom; her correction 2026-08-02.)

### THE LAW
```
every cta (light AND dark, wcag lane): chosen pole passes 4.5 AND clears Lc 65
critical (the red signal, canonical + variants):  the bar is Lc 50
exact mode, EXACT-style secondaries, neutral: OUTSIDE the law (enforce off / hands-off / own curve)
custom secondaries: IN — the tint-model cta rides the derived register's clearance
apca lane: untouched (coLc is gated on enforceLc === undefined) — dark-audit snapshot clean
```
Ship-above-the-razor (C15) holds: fills land at bar + 2 + 0.5 ≈ 67.5 / 52.5.

### WHERE
- `spec.ts` ONS `coEnforceLc` 60 → **65** (the one-source bar).
- `profiles.ts` **`CRITICAL_CLEARANCE_LC = 50`**; threaded per-call by the new
  `opts.apcaClearanceLc` (colorEngine → buildContext → the coLc read).
- Signals: `buildSignalScales` + `swapScale`/`lemonScale` pass `apcaClearance: true`
  (red adds the 50 override) — reverses C18's "signals excluded (static-seeded)".
- Dark: new `ctaDarkDualGateL` (producers) — the dual-gate on the dark basis — wired after
  the enforce re-solve, before the exit; `solveDarkCtaExit` gains the `coLc` law extension
  (mirrors `solveBrandExit`).
- The coral defect: `redComplementVariant` candidates now judged at the SHIPPABLE pole
  (4.5-floored) under critical's bar, each candidate sliding pole-preserving to the bar
  before the distance gates — the old either-pole gate let a zone be chosen on a pole the
  wcag floor then vetoed (black shipped at Lc 42).

### WHAT MOVED
Canonical green `#63c373`→`#70d07f` · blue `#afa3ff`→`#bcb2ff` (both Lc 67.5) · the corals
land `L0.72` ≈ `#ff6c4d` Lc 52.5 (notes now read `red → coral L0.72` — annotation only, no
token path derives from the note) · every under-bar dark cta lightens to Lc 67.5 (e.g.
dark-roast ctaDark `#869cda`→`#a4bafa`) · red + yellow canonicals untouched (already clear).
Exact mode proven byte-identical on the brand scale (sha256 grid probe, pre == post).

BLAST RADIUS: divergence snapshot (10 roster scales drifted, all cta tokens — the designed
movement; bless follows her visual approval) · figma-verify's pinned dark hex updated · dark-audit,
highlight, smoothness, register, reqtoken, ext-overrides, collision-sweep all clean with no
re-bless. Instrument: `audit:cta-apca` (new this round) verifies the law end-to-end; exact
is out of its scope per her ruling.

## C43 — THE DERIVED SECONDARY IS A QUIET COMPANION, AND ITS BUTTON TEXT IS THE POLE AT ALPHA

Owner-driven, 2026-08-03, the derived-secondary round. Her question opened it: *"if a brand
doesn't have a secondary color, given its primary color, what should its secondary be?"* The
90-pair bank book that the prior round measured describes brands that HAVE secondaries — so
it informs the given-hex postures, and the derived one has no book to match. Her answer to
what it is FOR: **derive a quiet companion without selecting another color.**

Two rulings, one round.

### 1. NO ROTATION — the quiet companion sits on the parent's hue
`rot: 12` existed to stop a derived secondary reading as a paler copy of its parent. Under
the new purpose that is the INTENT, not the failure: tonal (a value step on the same hue) is
the third most common habit in the book and has its tightest pairs. So `rot` is gone from
`DEFAULT_SECONDARY` — not set to 0, removed, with the `rotate` parameter and the
derived/supplied split (C34) removed alongside it. Derived and Custom now run the literally
identical `defaultSecondarySeed`, so **Custom is byte-identical** (it already passed
`rotate=false`); only derived secondaries move, un-rotating 12°. The lift (`kL .65`,
`lRoom .97`) and the chroma damp (`kC .5`) are untouched — she kept the damp deliberately:
*"the quiet stays."*

### 2. THE SOFT ON-CTA — the on-text pole at alpha, not a solid
Her ask: does the companion's cta land light enough to carry the family's own ink and
sharpen the hierarchy? Measured on a 72-probe agnostic sweep (6 L×C classes × 12 hues, WCAG
lane, via `resolveTheme`/`resolveBrand`): **light ink-10 clears 4.5 everywhere** (min 6.98)
but **dark ink-10 fails 53/72** at the blessed `darkFlatGapApp 40`, and a solid tinted ink
collapses on the STATES in dark (hover 3.69, pressed 3.00) because the ink is fixed while
the fill moves. Moving the gap 40 → 38 would clear rest-only and disturbs the C24 register.

The solve is transparency: the text is the **on-text pole at alpha**, composited by the
renderer over whatever the fill's current state is — so hover/pressed carry their own
legibility instead of being abandoned by a fixed ink. Worst-case min alpha across the sweep:
**0.838** under the C42 Lc-65 bar, **0.726** under Lc 60, 0.665 on WCAG alone. She read the
alpha ladder by eye and picked **light .75 · dark .80** — above the Lc-60 floor, so this
pairing answers to the Lc-60 on-cta bar (the one the dark audit's hard lane F already uses),
not C42's Lc 65.

```
--secondary-on-cta = rgba(pole, SECONDARY_ON_CTA_ALPHA[mode])   // style 'default' only
SECONDARY_ON_CTA_ALPHA = { light: 0.75, dark: 0.80 }
measured at the chosen values (72 probes, worst case):
  light   wcag rest/hover/pressed  6.99 / 6.19 / 5.42   ·  Lc rest 61.3
  dark    wcag rest/hover/pressed  7.94 / 8.95 / 7.88   ·  Lc rest 63.6
```

### WHERE
- `resolve.ts` — `DEFAULT_SECONDARY` loses `rot`; `defaultSecondarySeed(hex)` loses the
  `rotate` param; `resolveDefaultModel` likewise. New register `SECONDARY_ON_CTA_ALPHA`.
- `cssRender.ts` — `softOnCta(mode)` emits the rgba after the secondary body (the outline
  idiom, so the cascade takes it); `figmaRender.ts` emits the matching alpha color token.
- Scope is `secondaryStyle === 'default'` ONLY: derived + Custom share the tint register.
  **Exact, outline, and the no-secondary mirror keep their solid on-cta.**
- `cta-apca-audit.ts` — the secondary lane now measures the COMPOSITE the renderer ships
  (alpha-blend in encoded sRGB, then wcag/apca Y from the blended channels), plus a new
  derived-secondary probe pair. Lane n=8, DEAD=0.

### WHAT MOVED
Derived secondaries un-rotate 12° (hue now the primary's, ΔH residue is 8-bit hex rounding
only). Every default-model secondary's `on-cta` becomes an rgba. `audit:ext` moved on 15
rows, all exactly `+brand-secondary/cta/on` — the alpha pole becoming an override for the
secondary-bearing brands — re-blessed. `audit:secondary` (custom lanes 1/1b assert the
custom model), dark-audit incl. lane F, divergence, register, cta-apca all clean with no
re-bless. Both typechecks clean.

OPEN, NOT BUILT: the offering NAMING is unresolved — she read today's chip names as not
matching the functions and asked for a functionality matrix first
(`scratch/personas/secondary-offering-matrix-2026-08-03.md`, internal). Her five secondary
functions: None · quiet companion from the primary (this round) · a companion derived from a
GIVEN hex, with levels drawn from the data · Recommended (all adjustments INCLUDING collision
avoidance, which does not exist today — the secondary paths run `skipCollisionRules`) ·
Exact. The last three are future rounds and are blocked on the naming ruling.

### C43 addendum — THE system/alpha/ink PRIMITIVE (owner-caught + owner-named, 2026-08-03)

C43's Figma emit shipped the soft on-cta as a RAW rgba: the ext plugin's `isPole` rejects
alpha≠1 (correctly), so no aliasing idiom claimed the leaf — and the community plugin's
`cta/on` branch ignored alpha entirely, aliasing the soft value to the abs pole and
SILENTLY DROPPING the alpha. Her catch: *"you did not make a variable for it."*

Her ruling, walked in two questions: ONE token, not two absolutes (`abs-white-80`/
`abs-black-75`) — zero pole flips across 144 derived+custom probes makes a single
mode-resolved row sound, and the offset rows already put the pole flip + alpha inside one
system path. Named to read like a primitive: **`system/alpha/ink`** (her direction
"ink-alpha or something generic"; the group name already carries "alpha", and the
scrim/shadow grammar is one plain word whose value mode-adjusts).

The row: black@.75 light · white@.80 dark (values from `SECONDARY_ON_CTA_ALPHA` in the ext
payload; the community table carries them inline like its shadow rows). Both plugins alias
any `cta/on` leaf holding a POLE AT PARTIAL ALPHA onto it — the cta-border "never a raw
write" idiom — and the ext conversion pass upgrades existing raw C43 writes on re-apply
(exact register alpha at a pure pole only; a designer's own soft text is left alone).
Blast radius: ext base token count 143 → 144 (the row itself), re-blessed; engine values
byte-identical.

**Second owner catch, same day** (*"not seeing these changes come through in the top level
theme"*): the ext plugin has THREE write paths — base seeding, the raw-conversion pass, and
the per-brand EXTENSION OVERRIDE loop — and the first cut wired the router into only the
first two. `brand-secondary/cta/on` is an OVERRIDE row (the base posture is the mirror's
solid pole), and the override loop is the write the APPLIED theme actually shows, so the
soft on-cta kept shipping raw there on every apply. The router now runs in all three.
STRUCTURAL BLIND SPOT, recorded: the ext audit measures override MEMBERSHIP in payload
space — raw-vs-alias in the Figma write is invisible to every gate; only an eye on the
Figma file catches this class. RULE for any future alias router: it goes in all three
write paths, or it isn't in.

## C44 — THE LAW IS THE PAIR THAT SHIPS: THE SHIPPED-PAIR FLOOR AND THE CROSS-FAMILY BOUND

Owner defect report, 2026-08-03: *"I am seeing ink 9's fail on paper 3… 43B02A… 4.47:1."*
Confirmed, and it was two defects stacked. Her follow-up ("check this for highlight as
well") caught the second surface before commit.

### DEFECT 1 — the razor solve loses its margin at the emit
The wcag requires (S8/T9/T10) solve to exactly the bar in ANALYTIC space with a `5e-4`
margin — float-noise insurance — while the sRGB encode + 8-bit hex quantization of BOTH
sides eats up to ~0.08 of real ratio. `legalRatio` covers the fill's renditions, but its
REFERENCE side is the analytic anchor Y, whose "near-neutral, sub-tolerance" assumption
broke when the ink anchor moved to the chromatic paper-3 (2026-07-28) — on a solve that,
unlike the scale solve's `+0.05` idiom, carries no margin at all. On the true shipped-hex
basis 10/72 agnostic probes shipped ink-9 under 4.5 within their own family.

⚠️ MEASUREMENT TRAP (cost this round a wrong first diagnosis): `ColorStop.r/g/b` are
MASTER-GAMUT (P3) encoded components — reading them as sRGB and hexing them measures a
pair that never ships. The true basis is `stopHex`/`srgbEmitChannels`. Any shipped-value
instrument must route through those.

### DEFECT 2 — the own-family paper-3 is not "the nearest paper"
Her actual measured pair was the brand ink-9 on the NEUTRAL paper-3 (4.479). The ink
anchor law ("usable on every paper") anchors at the family's OWN paper-3 assuming it
bounds all papers — false for green-band brands, whose tinted paper carries more Y than
the near-gray neutral at the same L. Highlight-8 had the same hole wider: 26/72 light
probes under its 3:1 (1.4.11) against the worst neutral paper-3 — and highlight-8 is the
focus-ring/border register that sits on neutral surfaces.

### THE FIX — in the resolver's verify step, both modes
1. **The shipped-pair floor**: after placement, every wcag-required stop re-measures on
   the 8-bit sRGB rendition of stop-vs-anchor (`shippedY`, constraints.ts); if under, L
   walks away from the anchor (C/H held — the dark floor's delta-purity idiom; moves are
   ≤ ~0.02 L) until it clears. A stop whose shipped pair already clears does not move.
2. **The cross-family bound** (stops 8+): the floor also clears the worst SHIPPED neutral
   paper-3 any theme can generate — `NEUTRAL_P3_WORST_SHIP_Y` = light 0.845015 (H260
   branded) · dark 0.014247 (H300 default), measured over hue 0..350 × every NeutralLevel.
   RE-DERIVE if the neutral curve or the paper ladder moves. Min-ratio anchor: the binding
   paper is whichever sits nearest in Y.

```
after (72-probe agnostic sweep, true shipped basis, worst paper incl. the neutral bound):
  light  ink-9 min 4.501 · ink-10 min 10.612 · highlight-8 min 3.001   (all 0/72 under)
  dark   ink-9 min 6.791 · ink-10 min 12.295 · highlight-8 min 3.017   (all 0/72 under)
  cta-ink trio rides ink-9's floor: light 4.50/6.71/10.61 · dark 6.79/8.82/12.30
  #43B02A: ink-9 #2d7b1b → 4.66 own p3 / 4.61 neutral p3 · hl-8 #509842 → 3.09 neutral p3
```

WHAT MOVED: 13 roster scales total, every drift an ink or stop-8 token at ΔE 0.015–0.019 —
imperceptible. Divergence re-blessed; dark audit, secondary, register, ext (set unchanged —
values only), req:audit, cta-apca, both typechecks clean.

### C44 addendum — THE STALE BASE: the value heals and the REBUILD action (owner 2026-08-03)

Owner report: *"I am still seeing the warning ink-9 fail on papers … in the main theme."*
The ENGINE was clean — every signal clears every bar against the worst paper — but Figma
base rows are CREATE-ONCE, so each engine value-move (C42's clearance ctas, C44's
shipped-pair inks) strands existing files' base rows on the era they were seeded in.
Re-applies write fresh per-brand OVERRIDES; the base "theme" collection keeps shipping the
stale value (her warning ink-9: `#a56000`, the pre-C44 canonical, vs today's `#9d5b00`).

Three shipped pieces, her rulings:
1. **Ext heal** — `RETIRED_SIGNAL_VALUES` (code.ts): the offset-08 idiom extended to
   values. The 20 rows the two eras moved (derived by diffing SIGNAL_SCALES at
   e8eff89 → dbac539 → HEAD), each with its exact retired hex; a raw base value matching
   one refreshes to the payload's current value on any apply. Extend the map whenever an
   engine round moves canonical signal values.
2. **Community heal** — the signal prims join the LINK prim's refresh rule (its own
   in-code rationale, verbatim applicable: identity-keyed paths survive engine retunes
   while values move; same seed ⇒ same output ⇒ idempotent). Only the neutral stays
   grow-on-demand.
3. **THE REBUILD ACTION** (her redirect: *"we just need a way to redo the main theme …
   no way to refresh it or to change it to a different color"*): "Rebuild base theme" in
   the ext panel — armed two-click, seed-hex field (empty = refresh the current color
   onto today's engine; a hex = re-base the whole theme on it, secondary DERIVED from it
   per her ruling). Rides the re-apply queue: item 0 carries `rebuildBase` (seedFresh
   forced for EVERY base row — the one sanctioned overwrite of base values), the rest
   re-diff against the fresh base. The seed persists as collection pluginData
   (`BASE_SEED_KEY`) with a load-time `file-state` handshake, so every later apply's
   base column builds from THE FILE'S seed — without that, the next apply's diff would
   churn every override. Needs ≥1 applied brand (it rides the recipe queue); the panel
   says so.

⚠️ BUILD TRAP (caught demoing the UI): `npm run build` builds the DEMO only — the plugin
bundles build under `node esbuild.config.js --plugin` / `--plugin-ext` (CI runs them on
push, so deployed zips were always right, but a local "build green" proves nothing about
plugin assembly).

## C45 — THE SECONDARY IS A COLLIDER: SECONDARY-PLAN §2 RESTORED, AT LOWER PRIORITY

Owner report, 2026-08-03: *"the signal collisions aren't respecting exact secondaries."*
Root cause was an ORPHANED REMEDY: `signalSwapVariants` (signalShift.ts) was built for
exactly this — its own comment reads "used by resolveTheme when a SECONDARY collides: a
variant is adopted only if it clears BOTH brand colors" — but its caller died somewhere
after SECONDARY-PLAN §2 (2026-07-04), leaving the import and the advice notes ("expected,
annotated for the remedy round") as the only survivors. Every secondary path runs
`skipCollisionRules`, so an exact secondary on a signal hue shipped the collision.

Her rulings, grilled: **every REAL secondary is a collider** (exact + custom — the custom
ramp is the exact posture's byte-for-byte; derived rides the primary's hue and is covered
indirectly) · **red and yellow move too, WITHIN their band** (the identity law and the C42
critical carve-out stand: red takes the primaries' own pair-calibrated deep-core
complement, yellow the lemon) · **primary wins ties** — an existing primary override is
replaced only by a variant that also clears the primary, and an unresolvable collision
ships as ADVICE, never a forced move ("as much as possible", her row-5 wording).

### THE MERGE (resolveTheme, all three posture branches)
`mergeSecondarySignals(secScale, secSeedHex)` mutates a merged override list seeded from
the primary's:
- **green/blue**: gate = the standard hue-collision bar vs the EFFECTIVE signal (canonical
  or the primary's variant). Remedy = `pickSignalShift` calibrated to the secondary,
  adopted only when it clears BOTH brands; when the secondary collides with the primary's
  own variant, the OTHER swap variant is adopted if it clears both.
- **yellow**: the lemon is a WITHIN-BAND remedy — a hue-distance test can never pass
  inside the band, so (exactly like the primary's own adoption) it trusts the side rule
  and verifies the PRIMARY only.
- **red**: the complement solve IS the gate (the ΔE machinery self-limits to red-adjacent
  registers). Calibrated to the secondary's cta when the primary didn't claim red;
  verified beside the primary's cta via `redCleanBeside` (the distance half of the
  variant's own clean() predicate, split out — zero behavior change to C12).
- Adopted overrides carry the "(for the secondary)" note suffix; `themed` now ships
  `{ ...primary, signalOverrides: merged }`, so every consumer (demo css, both plugins)
  inherits with zero plumbing. The residual-advice pass runs against the POST-MERGE set
  and skips adopted signals (a note would call the adopted fix a failure).

### WHAT MOVED
audit:secondary's advice counts tell the story: annotated residuals fell **188 → 62** per
lane — 126 formerly advice-only collisions are now remedied. audit:ext: 34 rows moved,
every one a signal family JOINING a secondary-colliding roster brand's override set
(+warning ×24, +positive ×6, +critical ×2, +info ×2) — re-blessed. The audit lanes were
taught the new law (remedied-or-annotated, never silent). No-secondary themes are
byte-identical; cta-apca's signal group unchanged (the adopted variants were already in
the law). Demo-verified live: navy + #43B02A secondary → positive ships teal-side #51d291.

## C46 — THE STRONG TEXT-CTA MIRROR: ONE RAW VALUE, EVERYTHING ELSE REFERENCES

Owner ask, 2026-08-04: a stronger neutral text-cta resting on ink-10 ("cta-ink and
cta-ink-strong"). A scale renumber (promote the hover into the ladder as a new ink-10,
shift 10→11, 11→12) was considered and DECLINED: it would be a third renumber vintage that
REVERSES the pre-C33 `ink-12` name in both plugins' migration ladders, and would force a
new declared law for the between value. The alias format ships instead.

### THE LAW
Each family's text-cta system carries exactly ONE raw solved value — the between/hover
(the resolver's doubled step off ink-9, floored by the ink-9 require). Everything else is
a REFERENCE over the family's own registers, and the two trios are mirror images over the
same three values:
- `cta-ink` ascends: enabled ≡ ink-9 · hover = the raw between · pressed ≡ ink-10
- `cta-ink-strong` descends: enabled ≡ ink-10 · hover ≡ cta-ink/hover (the SAME shared
  between — both hovers converge) · pressed ≡ ink-9 (her either/or resolved to the full
  mirror so the press keeps a visible step past hover)

`cta-ink-strong` is **NEUTRAL-ONLY** (figma-verify asserts absence on every other family).
No resolver/engine value moved — the trio is an emit-layer construct: figmaRender sources
it from the neutral's own ink-10 / ctaInkHover / ink-9; cssRender emits the three
`--neutral-cta-ink-strong*` vars as `var()` references (the cta-border idiom; P3 rides
the referenced stops for free).

### THE ALIAS REPRESENTATION (both plugins)
Owner ruling on "is enabled duplicative?": KEEP the token — under the neutral cta escape a
brand's `cta-ink/enabled` carries the NEUTRAL's register while its own ink/9 stays put, so
the leaf is load-bearing — but represent equality as ALIASES. Both plugins now route
(value-guarded per column/mode, so an escaped trio ships raw, never aliasing back to the
red ink): cta-ink/enabled→ink/9 · cta-ink/pressed→ink/10 · strong/enabled→ink/10 ·
strong/hover→cta-ink/hover · strong/pressed→ink/9. plugin-ext converts existing raw rows
holding exactly today's seed on Rebuild base theme + the conversion pass; new rows ride
the ordinary new-base-token confirm/backfill flow.

### STALE-TARGET FIXES FOUND IN THE ROUND (all the same C33-renumber class)
- plugin/code.ts's sibling-alias block targeted `ink/10`/`ink/11` — DEAD since C33 (the
  value guard failed; every trio silently shipped raw). Retargeted 9/10.
- plugin/code.ts's non-pole cta/on alias targeted `ink/10` — post-C33 the outline's
  on-cta rides ink-9, so it aliased the WRONG STOP (live value bug in community files
  with an outline secondary). Retargeted ink/9.
- plugin/ui.ts's matrix still drew stop 9 as "highlight-9" via the DELETED
  onHighlightIsWhite field, and the outline label read st(10). Both re-aligned with the
  ext matrix (ink-9 emphasis-fill cell; ink-9 label).
