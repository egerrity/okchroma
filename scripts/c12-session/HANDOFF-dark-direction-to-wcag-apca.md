# HANDOFF → the WCAG/APCA session: C12 dark-cta + true-red-direction findings

**Written 2026-07-11.** Investigation-only session — **nothing wired, nothing committed**. The
shipped engine is v8 @ `5e440ff` on main; both bugs below are live there. This hands over because
**every open item here hinges on one variable the wcag/apca session owns: the enforced cta
brightness, which differs per lane (apca Lc60 vs wcag 4.5).** Decide the wcag APCA-clearance
first — it changes how C12 wires.

---

## THE COUPLING (read this first — it's why this is your problem now)

The owner's plan: **add an APCA readability clearance to the WCAG ctas** (today wcag ctas only
enforce a 4.5 contrast ratio, which lets them land dimmer; apca enforces Lc60, which pushes them
brighter). Consequence for the same red seed today:

| lane | red brand cta lands at | on-fill law |
|---|---|---|
| wcag | **L ≈ 0.65** (dimmer) | 4.5 ratio |
| apca | **L ≈ 0.69** (brighter) | Lc60 |

Both C12 open findings turn on that 0.04 difference:

1. **True-red direction** (below) resolves to a **brightness cutoff ~0.67**. wcag lands *below*
   it, apca *above* it — so the owner's marks split cleanly by lane. **If wcag ctas get the APCA
   clearance, wcag brightens to ~0.69 and both lanes cross to the same side → the lane split
   disappears and the true-red rule becomes uniform.** So: wire the brightness cutoff *with a
   per-lane split* only if the clearance is NOT coming; if it IS coming, the rule simplifies to
   one direction for both lanes.
2. **Dark-cta carry** (below) lands deep and leans on a **legibility floor that is lane-specific
   today** (apca Lc60 / wcag 4.5). If wcag gets the APCA clearance, that floor unifies — design
   the dark rule's backstop knowing which world you're in.

**Recommendation: settle the wcag APCA-clearance, then come back to wire C12.** The dark p2
metric (finding 1) is lane-agnostic and can proceed independently.

---

## FINDING 1 — the dark-cta collision is real, and the sweep metric is blind to it

- **Symptom (owner, #FF2600 dark mode):** the brand cta and the red-signal cta vibrate — two
  similar reds side by side. Confirmed across the near-red family.
- **Root cause:** the cta is the **one token that opts out of the delta model.** Surfaces (stops
  1–9) delta-*carry* to dark (`deltaDarkTargetL`, producers.ts:325). The cta is
  **prominence-floored** instead (`dark9L = max(scaleL, darkFillMinL)`, ~0.63–0.75, producers.ts:275).
  The floor re-lifts every near-red to ~L0.70, right beside red's dark cta, so the light
  de-collision never survives into dark.
- **The metric is the wrong one.** collision-sweep's `ctaSepDark` uses `redGateDist` (P1,
  "confusable at a glance") — it PASSES every dark pair (0.11–0.20 > 0.09). But the real test is
  **p2 / side-by-side vibration** (the metric calibrated in the light rounds): the dark pairs
  measure **0.087–0.13, at/below the 0.11 bar** (#FF2600 apca **0.087**, #EE3123 apca 0.098). This
  is the **P1/P2 split from the light rounds resurfacing in dark.** → the sweep's dark assertion
  must switch from redGateDist to p2, or it will keep rubber-stamping vibrating reds.
- **Light is fine** (contrast, not luck): light Primary-vs-Red pairs all clear p2 (0.125–0.134),
  because the light solve was built on the owner's marks with p2 as the bar. Only dark vibrates.

## FINDING 2 — the dark fix: carry + a gamut-aware floor (OPEN, owner mid-calibration)

- **Carry inverts lightness** (`deltaDarkTargetL` maps distance-from-white to distance-from-the-
  dark-page): deep light → bright dark, bright light → deep dark. Per-signal carry:
  red L0.63→0.36 · green 0.65→0.43 · info 0.54→0.41 (all good deep buttons) · **yellow L0.88→0.31
  = a dead near-black olive** (its light cta is near white). So **bright-corner hues need the floor.**
- **The agnostic rule (owner's framing):** don't choose floor *or* carry — **combine** them:
  `darkCtaL = max( carry , loudnessFloor(H) )`, where `loudnessFloor(H)` is **hue/gamut-room-based**
  — high near the bright corner (yellow/orange/cyan/green, "high room"), low for deep hues
  (red/blue/magenta) so they carry deep and de-collide for free. Owner's read on the exception:
  "it's probably a gamut thing… light oranges, yellows, cyans, greens."
- **Ruled out:** "+40% carry uniformly, yellow excluded" — measured, it *collapses* ring-zone
  near-reds (the ones that never exited in light carry to the *same* deep as red). p2 worsened.
- **State:** visualize built (`render/c12-dark-carry.html`, dark ground, carry→current ladder,
  56 rows, both lanes) — **awaiting owner marks.** She marks the loud-enough rung per hue; the
  `loudnessFloor(H)` curve is fit from her picks. **This is the main open dark item.**
- **The load-bearing risk at wiring:** re-verify carry preserves dark p2 separation across an
  agnostic sweep — there is no dark remedy if a pair collides.

## FINDING 3 — a true-red DIRECTION bug (light-side, on main), and its decode

- **Symptom (owner, #FB0021 / #FF4041):** for a class of on-hue true reds, recommended mode ships
  the **exact-mode-safety pattern** — brand stays bright + red goes deep — instead of shooting the
  brand dark. A true red losing its identity to a bright salmon while the *signal* becomes the deep
  red is backwards.
- **Cause I introduced:** a `vivid ≥ 0.85` gate on the dark throw (`vividDown`, producers.ts:456;
  sibling on `goldBright`:454). It carved a subset — high-L/less-vivid true reds miss the dark
  throw and take nearest-edge (up). A 0.10 vividness difference flipped the whole treatment. I
  over-encoded the owner's "the vibrant ones read truer dark" language into a hard threshold.
- **First fix attempt was wrong** (owner caught): deleting the gate globally cascaded into pink and
  orange (the nearest-edge fallback rewrote them, dropping correct red-deep treatments). The fix
  must be **scoped to the on-hue band only** (dh between magentaDh and goldDh, ~H19–35).
- **The owner's marks decode to a BRIGHTNESS cutoff, not a vivid gate** (`truered-dir-checks.json`,
  27 marks, complete over the changed set):
  - every **wcag** row (cta lands **L ≈ 0.65**) → **brand dark** (proposed)
  - every **apca** row (cta lands **L ≈ 0.69**) → **brand bright + red deep** (current)
  - → **cutoff ≈ 0.67 on the resulting cta L**: dimmer → shoot brand dark, red stays bright;
    brighter → keep brand bright, red goes deep. **Opposite movers either way** — a bright red
    brand keeps its brightness (its identity), the error takes the deep pole; a dimmer red brand
    goes dark, the error stays bright.
- **This is where the coupling bites** (see top): the split IS the lane brightness difference. The
  APCA-clearance decision determines whether this wires as a per-lane brightness cutoff or one
  uniform direction.
- **The fix = replace the vivid gate with the brightness cutoff, scoped to on-hue.** Not a blanket
  deletion.

## FINDING 4 — exceptions audit (owner asked "did you make others like this?")

- **Subset-carving exceptions I introduced (the kind she didn't intend):** the `vivid ≥ 0.85`
  gates on `vividDown` and `goldBright`; a lesser magenta tie-break guard (`up ≤ 2.5× down`,
  producers.ts:453).
- **Everything else with a number is owner calibration, keep:** the magenta L-split (~0.53, from
  D80050→light / BA0043→dark), the brick-band vivid floor (0.55, "browns are fine"), the
  red-variant zones, the region widening (wDark 0.60), the ring dead-zone (0.020).

---

## OVERLAP QUESTIONS TO SETTLE IN THE WCAG/APCA SESSION
1. **Does adding an APCA clearance to WCAG ctas collapse the true-red lane split?** (Likely yes —
   wcag brightens across the ~0.67 cutoff → both lanes "keep bright + red deep.") If so, the
   true-red direction wires uniform, not per-lane.
2. **Should the dark-carry legibility floor be lane-specific or unified?** Tied to the same
   clearance decision.
3. **Is a per-lane direction difference ever acceptable** (same brand shoots dark in wcag, stays
   bright in apca), or must a brand hold one direction across both lanes? (Owner's marks currently
   imply per-lane; unresolved.)

## ARTIFACTS (this session, all under scripts/c12-session/ + render/)
- **Visualizes:** `render/c12-dark-signal.html` (dark collision A/B/C) · `render/c12-dark-carry.html`
  (carry→floor ladder, **awaiting marks**) · `render/c12-truered-direction.html` (scoped on-hue
  direction, **27 marks in**).
- **Marks:** `truered-dir-checks.json` (the brightness-cutoff decode) · `dark-carry-checks.json`
  (pending) · `dark-signal-checks.json`.
- **Generators/probes:** `c12-dark-signal.ts` · `c12-dark-carry.ts` · `c12-truered-direction.ts` ·
  probe scratch under the session scratchpad (p2-vs-gate, per-signal carry, true-red trace).
- **The settled v8 model (shipped):** `scripts/c12-session/joint-solve-model.md`.
- Marks server: `c12-marks-server.py` port 8324; render on 8323.
