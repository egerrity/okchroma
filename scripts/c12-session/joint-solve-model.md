# C12 v8 — THE JOINT SOLVE (owner-settled 2026-07-10, "as close as we will ever get")

Grill-established, iterated v1→v4 on render/c12-joint-solve.html against her verdicts
(joint-solve-v{2,3,4}-checks.json + confused-pairs{,-v2}-checks.json = the calibration record).

## The model
Two problems, two movers, one geometry:
- **A (error-look)**: if the brand's cta is inside the true-red region, the BRAND exits via the
  NEAREST release edge — minimum identity cost; center brands shoot far (severity = depth into
  the region), edge brands barely move. No P2 condition on the brand — B is red's job.
- **B (vibration)**: RED complements — positioned inside its own usable zones on the OPPOSITE
  side of the brand, cool-first beside warm brands. Red moves less; brand absorbs the overflow
  (worst case abandons fidelity; hue = small refinement only, never a substitute for L-room).

## The geometry (all owner-blessed candidates)
- Region = her v7 gate metric with **wDark 0.60** (widened dark-ward — her call) + the **RING
  0.020**: the region's lip is a dead zone — nothing lands on it, nothing de-collides from it.
- **BRICK band** (H20–50 · L0.36–0.52 · vivid ≥0.55): rusty-to-brick mid-dark vivid warms still
  read conflict-y; browns (low C) and magentas (cool H) at this depth are fine. Warm brick
  members are IN-REGION (fire); dark landings must not park there → the **DIAGONAL**: cool −4°
  (gold-side −3°), C×0.85, +0.02 deeper — burgundy at near-identity hue ("diagonal out of that
  dark and back towards its hue"; the −8° flat cool was "too hard on H").
- **Direction rules**: noticeably-magenta (dh ≤ −14) + L > 0.53 → LIGHT (pinks lighten) ·
  gold-side vivid (dh ≥ +1.5, vivid ≥ .85, L > .53) → BRIGHT-ORANGE FLIP (up, no cool) ·
  on-hue vivid → the big DARK throw ("read truer dark") · else nearest edge.
- **Red's zones**: deep core L0.45–0.49 or light edge L0.65–0.75 (her density map,
  error-range-checks.json). The 0.50–0.58 middle = ring, NEVER used — canonical itself lives
  there, so brand-up pairs ALWAYS take a deep-core red. Hue latitude H24–40, cool-first (H28)
  beside warm brands; keep-warm rule retired for this machinery.
- **EXACT-MODE safety (owner ruling, corrected)**: when a consumer hits exact mode on a true
  red, THAT COLOR BECOMES THE ERROR COLOR — brand red and signal red unify (one red; context
  differentiates). Fallback if auto-unification isn't feasible: an on/off at intake, in the
  plugin, and on the demo. FOLLOW-UP TASK, not wired with v8. "Proposed" = the engine default
  for recommended mode.

## Wiring addenda (v8 as-shipped; fleet-verified 2026-07-10)
- magentaUp additionally requires up-travel ≤ 2.5× down-travel (magentaUpRatio — from the
  accepted generator); gold-side vivids at L ≤ 0.53 ride vividDown (the dark throw).
- TWO magenta thresholds, both from the accepted generator: dh ≤ −14 (membership guard +
  direction) and dh ≤ −15 (red hue-list fork; magenta-brand order [33.3, 38, 28]).
- **towardRed guard** (wcag): the white-darken may not move a RED-NEIGHBORHOOD brand's cta
  toward red (neighborhood = within 2 rings of the region; scoped after a fleet-caught
  wheel-wide leak) — the pole flips to black instead. Signals + hue-distant brands keep the
  shipped darken (a global pole-floor was tried and REVERTED: it flipped the red signal
  itself to black text; the signal's darken is its identity register).
- Brick diagonal is ONE-SHOT: ~55% of diagonal landings still test brick-positive as fresh
  seeds (region re-entry ZERO — pairs are clean; the band self-membership is a model-purity
  note, not a defect). Known internal inconsistency: darkC9's chroma trim still keys to the
  C6-shifted darkH while the dark cta ships at identity hue (±0.003 absolute C — her call).
- Complement no-clean class: 3 apca dusty-rose cells (dh −17..−20, L .60-.62) ship canonical
  at solveDist .091-.094 (ring-zone) with p2 PASSING .132+ — P1 clear, P2 clear, only the
  ring heuristic unmet; the collision-sweep G-keyed assert doesn't see ring-zone pairs.
- apca cross-state hover-vs-red-dark penetration grows with identity-hue dark ctas
  (170→379 cells; same-state clean, min .11; hover = the standing policy fork).
- Plugin variant keying: two brands can mint the same note at DIFFERENT hues → alias
  collision in shared prims — folds into the standing per-brand-keying follow-up.

## Bars
A = gateV8 ≥ G + RING with a passing pole (pole-agnostic, apca dead zone cleared).
B = p2 (helmlab) ≥ .12 deep / .11 light + gateV8 pair release. Same machinery both lanes,
solved against each lane's own canonical red. Dark side untouched (delta model).

## RESOLVED at wrap (owner 2026-07-10: "we can accept propose")
1. **Arc reconciliation**: PROPOSED WINS — the joint solve owns the arc overlap; the blessed
   arc split (RED_SPLIT/vividSplit) is SUPERSEDED by v8 (constants stay as the calibration
   record behind the direction rules).
2. **Exact-mode red unification** = follow-up task (above).
3. **"Gold is missing"** (owner flag at wrap, scope to clarify) = follow-up task.
4. coolRedDark cta-off (ruled, unwired; research: dark cta never needed the shift — 0/1206)
   — rides the v8 wiring.

## Generators / data
c12-joint-solve.ts (fingerprint-keyed verdicts — unchanged rows carry marks, greyed) ·
joint-solve-probe.json · marks server 8324. Prior instruments: c12-vivid-{delivery,split,
orange,rule}.ts · c12-confused-pairs.ts · c12-error-overlap.ts (unused round).
