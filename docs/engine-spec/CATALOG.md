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
  muted collider stay TYPE-2 (cta ΔE) untouched. Secondaries: both supplied paths note on
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
