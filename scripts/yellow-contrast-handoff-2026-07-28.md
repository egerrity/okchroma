# Yellow lost perceived contrast under C28 — add some hue adjustment back

Written 2026-07-28, right after C28 shipped (`229f977`, deployed). Owner call:
**"the monotonic collapsed it too far and we need to add back in some of the hue
adjustment."** This is the handoff for that round. Deal with this BEFORE the
stop-8 assessment (`scripts/stop8-assessment-2026-07-28.md`) — that one can wait.

---

## What happened

C28 put the whole dark surface band on ONE photometric ladder: every family lands
at the same luminance at every rung, and the H-K shine rides on top. That fixed
the wobble and stopped blue/violet sinking. It also **deleted the hue adjustment**
(`DARK_SHINE_PARITY_T` × `cuspDarknessW`) from the band.

The hue adjustment was doing a job nobody was crediting it with: **protecting the
hues that earn no H-K shine.** Yellow is the extreme case — its credit is ~0 at
every stop, so on a pure luminance ladder its *apparent* lightness is exactly its
luminance, while red/blue/violet get 8–12 points of credit for free on top of the
same luminance.

Result: yellow now falls behind perceptually, even though it is photometrically
equal.

## The measurement

Dark band, apparent-L span from paper-1 to wash-7, apca lane:

| family | before C28 | after C28 | change |
|---|---|---|---|
| **yellow** | 26.8 | **31.3** | +4.5 |
| green | 29.2 | 35.8 | +6.6 |
| red | 31.0 | 42.8 | +11.8 |
| blue | 32.2 | 43.0 | +10.8 |

Everyone gained (the ladder is deeper), **but yellow gained the least — so the gap
widened.** Yellow was 83% of blue's span before; it is **73%** now.

Per-step, dark (steps 2→7):

```
before   yellow  2.2  3.2  4.5  6.1  8.8
after    yellow  3.0  4.3  5.3  6.9  9.2
after    blue    4.9  5.7  7.0  9.1 12.1     ← same luminance, bigger perceived steps
```

The photometric side is doing exactly what it was designed to do — ink-on-wash
contrast is now IDENTICAL across families (all ≈6.40 at wash-6, where before it
ranged 7.22 yellow → 8.68 red). That equality is the win. The cost is that equal
luminance ≠ equal perception, and yellow pays it.

## Why this is a real regression, not a taste call

The old τ = `T[stop] · cuspDarknessW(hue)` blend meant **low-credit hues were
apparent-placed** (yellow's w = .15, so τ ≈ 0 → yellow sat at apparent parity with
everything else) while high-credit hues were pulled toward luminance parity. In
other words the retired mechanism *was* the yellow protection. C28 removed it
wholesale because its hue weighting was ALSO what scattered the papers and wobbled
the seam — those were real problems, and the fix was right. It just went further
than it needed to.

## The direction

**Add back a partial hue adjustment — not the old table.** Two constraints from
already-settled rounds bound the search:

1. **Papers stay one level.** The chip/pop work (C27) depends on every family's
   paper-2/3 sharing one luminance. Do not reintroduce hue dependence at the
   papers. (Landed values: paper-2 Y .0106, paper-3 Y .0155, exactly, all
   families.)
2. **Don't recreate the rejected candidate.** An earlier candidate ("C") kept the
   washes fully apparent-placed and was rejected by eye: blue and violet went
   visibly darker than their neighbours. The answer is between that and today's
   full luminance parity — **partial**, not a return.

Shapes worth measuring (in rough order of how much machinery they reintroduce):

- **A single hue-blind fraction.** Blend the placement τ toward apparent by a
  constant (e.g. 0.25–0.5) across the washes, hue-blind. Cheapest; helps every
  low-credit hue; slightly re-darkens the high-credit hues (which is what "C" did
  too much of — the fraction is the safety).
- **Credit-compensated placement.** Place by luminance, then add back a fraction
  of the *credit deficit* relative to the family with the most credit. This
  targets exactly the defect (yellow trails because it has no credit) and leaves
  blue/violet untouched, but it is a new mechanism, not a restored one.
- **Damped `cuspDarknessW`.** Restore the old weight at reduced strength in the
  washes only. Closest to "add back some of the hue adjustment" literally; carries
  the risk that the old table's shape was tuned against the OLD placement model
  and may not mean the same thing now.

The right knob is the owner's eye, as with the lift re-mark: build the same kind of
exhibit (per-candidate groups, all hues combined, dark on dark, with the step table
and the apparent-span numbers visible) and let her mark it.

## Verification for whatever lands

- **Yellow span vs blue span** is the headline number — it was 83% before C28, 73%
  now. Getting it back toward ~80% without re-darkening blue/violet is the target.
- **Papers must stay at Y .0106 / .0155** across families (C27 invariant).
- **Ink-on-wash equality is the thing being traded** — expect it to spread again
  from its current uniform ≈6.40. Decide how much spread is acceptable; that
  number is the real design choice.
- Gates: the usual nine. Watch `smooth` (`wobble` is a chroma-monotonicity
  detector, it caught the last two mistakes in this area) and dark-audit §A (the
  7→8 seam, which the lift re-mark just fixed — don't re-break it).
- Reproduce the before/after numbers with a worktree at `152cb23` (pre-C28
  deployed state) — that's how the table above was produced.

## Where the code is

- `src/engine/requirements/producers.ts` → `deltaDarkPlace` — the C28 placement. The gray
  scaffold anchor is the `grayLightL` branch; that's where a partial blend goes.
- `src/engine/stopTable.ts` → `DARK_BAND_LIFT` (her half-lift re-mark, ×1.125→1.375)
  and the retired `DARK_SHINE_PARITY_T` (still declared, no longer read by the
  band — its record is CATALOG C24).
- `src/engine/colorMath.ts` → `cuspDarknessW` (the hue weight, now unused by the
  band).
- CATALOG C24 has the original marks rounds; C28 has why they were retired.
