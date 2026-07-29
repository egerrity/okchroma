# Handoff — stops 8 and 9 drift above their targets, and nothing pulls them back

Written 2026-07-29, immediately after C32 landed (`9cc8340`, on `main`, deployed). Prompted
by the owner reading the Unify-vs-OKChroma distribution plot and saying: *"stops 8 and 9 are
supposed to be like clamped to their targets… it was supposed to be a harder setting, not
something that can freely drift once it clears the requirement."*

Everything below is measured through the real pipeline (`resolveBrand` → emitters), WCAG
lane only, 360 agnostic seeds (120 hues × vivid/mid/pale). Nothing here is fixed. No engine
change was made.

---

## The mechanism — a `require` is a FLOOR, not a clamp

[`resolve.ts:172`](../src/reqtoken/resolve.ts:172):

```js
if (measure(placed.L) < target - tol) {
  let lo = 0.05, hi = placed.L            // darker raises contrast against a light paper
  for (let i = 0; i < 40; i++) { … }      // bisect DOWN to the target
  placed = at(lo); clamped = true
}
```

One-directional. If the scaffold position already clears the target, the solve never runs and
the stop stays wherever the ladder put it. So "clamped to 3:1" is only true for the stops whose
scaffold happens to sit *below* 3:1. Everywhere else the target is a floor the stop has already
cleared, and how far past it lands is an accident of the ladder, not a decision.

That is the whole bug class. It explains all three symptoms below.

---

## Measured — every required stop against its OWN declared anchor

`overshoot` = measured ÷ target. 100% means genuinely clamped.

### light

| stop | target | against | min | median | max | median overshoot |
|---|---|---|---|---|---|---|
| highlight-8 | 3.0 | paper-3 | 3.05 | 3.05 | 3.10 | **102%** |
| highlight-9 | 4.5 | paper-3 | 4.50 | 4.66 | 4.83 | **104%** |
| ink-10 | 4.5 | paper-2 | 4.66 | 4.94 | 5.95 | 110% |
| ink-11 | 7.0 | paper-2 | 11.21 | 12.62 | 13.55 | **180%** |

### dark

| stop | target | against | min | median | max | median overshoot |
|---|---|---|---|---|---|---|
| highlight-8 | 3.0 | paper-2 | 3.86 | 4.52 | 5.81 | **151%** |
| **highlight-9** | **none** | — | 5.63 | 6.54 | 8.20 | **no requirement exists** |
| ink-10 | 4.5 | paper-2 | 7.24 | 8.27 | 10.20 | **184%** |
| ink-11 | 7.0 | paper-2 | 13.16 | 13.66 | 14.70 | 195% |

Light 8 and 9 ARE tight — C31 made them so, because it moved their anchor to paper-3 and the
scaffold no longer cleared it, which forced the solve to run. That is the only reason they look
clamped: not because the rule clamps, but because the requirement currently bites.

**Dark highlight-9 has no `require` at all** — [`spec.ts:225`](../src/reqtoken/spec.ts:225) is
`produce: P_FIXED` with no requirement, hand-placed at the dark scaffold. It cannot drift *from*
a target because it has none. Whatever it does is the scaffold's doing.

---

## Symptom 1 — light highlight-9 has closed on ink-10 (introduced by C31)

Gap between highlight-9 and ink-10 measured against paper-3:

| | min | median | max | pairs within 0.01 |
|---|---|---|---|---|
| pre-C31 (`430d5a8`) | 1.113 | 1.219 | 1.607 | **0 / 360** |
| today | **−0.001** | 0.166 | 1.047 | **145 / 360** |

Before C31 the two stops were never closer than 1.11. Now 145 of 360 seeds sit within 0.01, and
50 have highlight-9 fractionally *past* ink-10 — inverted, though by less than a hundredth, so it
reads as convergence rather than a visible flip.

Both stops are now pinned to a 4.5 floor against *different* anchors — highlight-9 vs paper-3,
ink-10 vs paper-2 — and for 40% of brands those two solves resolve to the same place. Neither
stop is wrong on its own terms. The ordering was being held by incidental spacing.

**No gate catches this.** `req:audit` has exactly one band-order check and it is `dark-8<9`
([`reqtoken-audit.ts:72`](reqtoken-audit.ts:72)). There is no light-mode check that ink-10 clears
highlight-9. The constraint was never expressed, so nothing could fail when it stopped holding.

⚠️ During the C31 round the owner was told the order was cleared with room to spare. That was
true of the gap that existed *before* the change and was not re-measured after. Re-measure
band order after any stop moves — the numbers above are the baseline to compare against.

## Symptom 2 — the dark band overshoots badly

Dark highlight-8 sits at 151% of its target and dark ink-10 at 184%. Both have requirements;
neither requirement ever fires, because the dark scaffold already clears them everywhere. The
spec comment at [`spec.ts:226`](../src/reqtoken/spec.ts:226) says this out loud — *"the scaffold
already clears them for every hue (the gate proves it), so values don't move — but the guarantee
is now a rule"* — which is accurate and is also exactly the problem: the rule guarantees a
minimum and says nothing about the maximum.

## Symptom 3 — the dark washes are more spread than light

Contrast of each wash against the stop before it (median):

| step | light | dark |
|---|---|---|
| 3→4 | 1.084 | 1.107 |
| 4→5 | 1.106 | 1.167 |
| 5→6 | 1.139 | 1.258 |
| 6→7 | 1.189 | **1.389** |

Dark steps are larger at every rung and grow faster. Owner's read from the plot: *"I would not
expect there to be so much more room between 4–7 in dark mode."* This is the photometric ladder
(C27/C28 Option D) placing dark by luminance while light is placed on apparent lightness — see
`docs/engine-spec/CATALOG.md` C28. Whether the ladder's spacing is right is a separate question
from the drift above; it is recorded here because it was seen in the same sitting.

---

## Directions to explore

Roughly in order of how much they change.

### A. Give `require` a ceiling as well as a floor

Add an optional `maxTarget` (or `tolerance`) to `Require`, and make the resolver solve in both
directions — bisect *up* when the stop overshoots, the mirror of the existing bisect-down. Then
"3:1" becomes "3:1, and not more than 3.3:1" and the stop is genuinely pinned.

- Smallest conceptual change; the resolver already owns a bisection.
- Needs a decision per stop about how wide the band is. Light 8 currently holds 3.05–3.10
  without being asked to; that spread is a reasonable model for what "tight" means.
- Watch: a ceiling can fight the band-order constraint and the gamut clamp. If a stop is pushed
  up into its neighbour, something must give — decide the precedence before implementing.

### B. Declare the missing constraints instead of relying on spacing

Two are missing outright:
- light: ink-10 must clear highlight-9 by some margin
- dark: highlight-9 has no requirement at all

Expressing these is worth doing regardless of A, because they are the invariants that were
silently holding and are now silently not.

### C. Re-anchor rather than re-clamp

Highlight-9 and ink-10 collide because they are measured against different papers. If both were
declared against the same anchor the collision becomes visible in the declaration instead of
emerging from the arithmetic. Bigger change, touches C31's ruling that `require.against` is
authoritative — do not undo that; this would be choosing different anchors within it.

### D. Leave dark alone until the ladder question is settled

Dark 8/9/10 overshoot because the scaffold clears the floors, and the scaffold is the
photometric ladder the owner deliberately compromised on ([[dark-photometric-is-a-compromise]] —
apparent-L in dark makes blue recede). Clamping dark stops to their targets would pull them off
that ladder. **Do not treat dark's overshoot as the same bug as light's drift** — same
mechanism, but the fix collides with a settled decision.

---

## Gates that would need to exist

None of the ten current gates would have caught any of this.

1. **Overshoot bound** — every required stop within X% of its target, per mode, agnostic sweep.
   The tables above are the baseline.
2. **Light band order** — ink-10 clears highlight-9 by a declared margin. Mirror of the existing
   `dark-8<9` check in `req:audit`.
3. **Dark highlight-9 has a requirement at all** — currently unconstrained.

---

## Traps

**`require` is a floor.** Reading the spec, "target: 3.0" looks like a clamp. It is a minimum
and the solve only runs when the scaffold is below it. Check whether a require actually FIRES
before assuming it binds — a passing gate may only mean the scaffold happened to clear it.

**Different stops use different anchors.** highlight-8/9 → paper-3, ink-10/11 → paper-2, dark
stop 8 → paper-2. Any plot or table that measures everything against one surface will make
correctly-placed stops look wrong by exactly the paper offset. (This produced a false alarm
while making the distribution diagram: highlight-8 measured 3.48 against the page and looked
like it had missed a 3:1 line that was itself drawn in the wrong place.)

**Re-blessed baselines hide movement.** `smooth`, dark, divergence and highlight snapshots were
all re-blessed for C32. Regressions logged in CATALOG C32 rather than visible to the detector.

**Measure through `resolveBrand` / `signalScalesFor` → emitters**, never `generateScale`.

**WCAG lane only** — the owner is not authorized to use APCA for design decisions. (Related and
still open: `demo/unify-compare/UnifyCompare.tsx` renders the okchroma side in the APCA lane at
three call sites, so the published comparison page shows the highlight band visibly lighter than
the WCAG lane. Demo-only, unrelated to the engine.)

## Where the numbers came from

Session scratchpad, not committed: `overshoot.ts` (per-anchor overshoot + wash spacing),
`vs-paper3.ts` / `vs-paper0.ts` (per-stop contrast sweeps), `dist-diagram.ts` + `render-dist.mjs`
(the Unify distribution plot). Pre-C31 figures came from a worktree at `430d5a8`.

---

## Where the session stopped — other threads left open

### The Unify → OKChroma distribution diagrams (owner-requested, in progress)

Purpose: exportable diagrams showing where Unify's stops fall on the new ramps, for a
comparison doc / handoff the owner is assembling. HTML (she screenshots or prints to PDF).

Built and approved for **Lime** only. Renderer works; the other eight families are one
command each. Scratchpad: `dist-diagram.ts` (data) + `render-dist.mjs` (render), driven by
`FAM=Lime SEED_STOP=500`.

Design decisions already settled with her, do not re-litigate:
- **One measured axis** — WCAG contrast against the page — not an ordinal side-by-side.
  Spreading either row to "make room" is an eyeball alignment; the axis makes it a claim.
- **Both rows the same square shape**, stop number *inside* the swatch, no rotated labels.
- Rows are labelled **Current** / **New**.
- Axis spacing is log-of-contrast **square-rooted**; straight log crushes the seven pale
  stops into a fifth of the width. Gridlines carry true values so nothing is misstated.
- Near-coincident stops are **staggered onto a second line** rather than overlapped.
- Threshold lines are drawn at `target × (that paper's distance from the page)`, NOT at the
  bare target — see the anchor trap above. Drawing bare 3.0/4.5 lines makes correctly-placed
  stops look broken.

**Blocked on:** the seed stop per family. Her Figma names some (Orange-500, Green-500,
Blue-600) and not others; Lime defaulted to 500. Ask before generating the remaining eight.

Her Figma source: `Db4o1g3zdu0QoLzbKH7Xat`, page `0:1` — a `light` section and a `dark`
section, nine family frames each (Gray/neutral, Lime/positive, Amber/warning, Scarlet/critical,
Violet/info, Eggplant, Orange-500, Green-500, Blue-600). Reachable via the figma-desktop MCP;
`get_metadata` on the page overflows the token limit, so pull `get_screenshot` per frame.

**Her existing Figma chart is pre-C31.** Its per-stop numbers are contrast against paper-0 and
the paper/wash values still match today, but highlight-8/9 read ~3.27 / ~3.95 against today's
3.54 / 5.22. Those two need updating wherever that chart is reused.

### The unify-compare page renders in the APCA lane

`demo/unify-compare/UnifyCompare.tsx` lines 292, 295, 372 pass `contrastProfile: 'apca'`, with
a comment saying "apca = the shipped lane". The owner is **not authorized to use APCA** for
design decisions — WCAG only, apca only for extra legibility in the extended plugin.

Measured, it matters: washes are identical between lanes, but the highlight band diverges
visibly — Green 500 stop 8 is `#369c54` (wcag) vs `#62c47a` (apca), stop 9 `#067e38` vs
`#329951`. The published page therefore shows the highlight band lighter than the lane she
can actually use.

Demo-only, unrelated to the engine, three call sites. Not fixed — flagged and left.

### Already answered, no action needed

The page derives the okchroma side live from `resolveBrand`, so it picked up C29–C32
automatically when Pages rebuilt. Only `unifyData.ts` is hardcoded, and that is correct — it
is the frozen Unify export, distilled from her Figma variables by
`scratchpad/distill_unify.py`.
