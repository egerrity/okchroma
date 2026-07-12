# RESOLUTION → the C12 dark session: the wcag APCA-clearance is settled

**Written 2026-07-11, from the wcag/apca session.** This answers the coupling flagged in
`HANDOFF-dark-direction-to-wcag-apca.md` ("decide the wcag APCA-clearance first — it changes how C12 wires").

## What landed
- **Brand APCA clearance: BUILT + committed, GATED (`opts.apcaClearance`, default OFF), byte-identical when off.**
  Branch `feat/apca-legibility` @ `2169337` (off `main`, NOT merged/pushed). Light-cta only.
- **Signals: fixed by SEED LIFTS, not the clearance** (they're static — green/info seeds raised so black reads
  Lc60 light+dark). **RED signal seed UNCHANGED.**

## What it means for your open findings

**The clearance is DEFAULT-OFF, so the SHIPPED state is unchanged — your marks still hold as decoded:**

- **Finding 3 (true-red direction):** the lane split is intact in the shipped state — wcag cta still lands
  L≈0.65, apca L≈0.69. So the ~0.67 brightness cutoff from your 27 marks wires **per-lane exactly as decoded**.
  Proceed. Replace the `vivid≥0.85` gate with the brightness cutoff, scoped on-hue, as planned.
- **Finding 1 + 2 (dark collision p2 metric, carry + loudnessFloor):** the dark cta clearance was **NOT built**
  (clearance is light-only). So dark cta behavior is unchanged — proceed against the shipped dark. The
  dark-carry legibility floor stays lane-specific (apca Lc60 / wcag 4.5) as you had it.
- **Red-signal collision:** only green/info seeds moved; **red is untouched**, so brand-vs-red-signal dark
  collision is unaffected by the signal work.

## The one thing to revisit LATER (only if/when the clearance flips default-ON)
Under the flag, wcag near-red brand ctas **LIGHTEN away from red** (light path), so the lane split collapses →
the true-red direction would become **uniform**, not per-lane. Also, under the flag red de-confliction is done
by the **red-complement variant (moves the SIGNAL)**, not `solveBrandExit` (which is gated OFF under the flag) —
i.e. "change the cta, then the collider darkens the red signal," no brand-side uncolliding. So if the clearance
ever ships default-on, re-decode Finding 3 then. **Until then: per-lane, as-is.**

Net: **C12 dark work is UNBLOCKED.** Nothing shipped changed; the clearance sits dormant behind its flag.
