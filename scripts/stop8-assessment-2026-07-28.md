# Stop 8 · assessment handoff — collapse 8·9, or move 8 off the scale?

Written 2026-07-28, after C28 shipped. This is a **decision document**, not a plan:
it exists to let the owner weigh two shapes against evidence. The full consumer
sweep (engine / both plugins / demo / docs / audits) is in the session memory note
`stop8-collapse-scope`; this doc adds the measurements that distinguish the two
options and states what each one actually buys.

---

## The question

Stops 8 and 9 are the "highlight" band. Two candidate futures:

- **Option A — COLLAPSE.** 8 and 9 become ONE scale stop. The scale loses a rung.
- **Option B — MOVE 8 OFF THE SCALE.** Stop 8 stops being a scale rung and becomes
  a focus-ring / non-text role only. The scale keeps 9; the ring gets its own token.

Prompt for the round: *"they seem so redundant in wcag."* That is measurably true,
and the measurement is the most important input to the decision.

---

## Evidence

### 1. The redundancy is REAL, and it is LANE-SPECIFIC

Distance between stop 8 and stop 9 (oklab ΔE), 170 seeds — agnostic hue×chroma×L
sweep + neutrals + signals:

| lane | mode | min | median | max | near-identical (<.02) |
|---|---|---|---|---|---|
| **wcag** | light | 0.002 | **0.047** | 0.087 | **23/170** |
| **wcag** | dark | 0.000 | **0.047** | 0.087 | **22/170** |
| apca | light | 0.134 | 0.138 | 0.171 | 0/170 |
| apca | dark | 0.173 | 0.174 | 0.182 | 0/170 |

**In wcag the two stops are ~3× closer than in apca, and ~13% of seeds render them
as effectively the same color.** In apca they are never close.

Why: **stop 8's position is lane-dependent, stop 9's is not.**
- Stop 8 is SOLVED to a contrast law. Under wcag that is 3:1 vs paper-2 → lands
  L≈0.642 (neutral, light). Under apca the same declaration becomes Lc 30 → lands
  L≈0.737.
- Stop 9 is HAND-PLACED at L 0.600 in both lanes (owner ruling: solving it is worse
  than placing it — APCA's body-text dead zone).

So the wcag lane squeezes 8 down toward a fixed 9, and they converge. The
"redundancy" is a lane artifact, not a scale-design flaw.

### 2. Stop 9 does NOT already satisfy stop 8's law

Stop 9 vs paper-2, same 170 seeds:

| lane | mode | worst | seeds under 3:1 |
|---|---|---|---|
| wcag | light | **2.85:1** (H100 C.14 L.6 — yellow-green) | **6/170** |
| wcag | dark | 4.52:1 | 0/170 |
| apca | light | **2.85:1** | **6/170** |
| apca | dark | 7.86:1 | 0/170 |

**This is the load-bearing fact.** If the surviving stop must carry the WCAG 1.4.11
3:1 non-text guarantee, it has to be *solved*, not merely inherited — because the
hand-placed 9 misses the bar for ~3.5% of seeds in light (narrowly: 2.85 vs 3.00,
and only in the yellow-green corner). Any option that keeps a hand-placed 9 as the
ring stop must either accept those 6, or start solving 9 — which reopens the
"hl9 stays hand-placed" ruling.

### 3. What each stop is actually FOR today

- **8** — the non-text boundary stop. Carries WCAG 1.4.11 3:1 vs paper-2 (declared
  `S8`, `STOP_8_NONTEXT_CONTRAST`, permanent gate in highlight-audit §1b). It is
  what focus rings, hover borders, and outline-secondary cta borders alias.
- **9** — the highlight FILL. Hand-placed, carries **on-text** (on-highlight must
  clear the body-text bar). This is why it can't just be solved into place.

They are redundant in *value* under wcag, but they are not redundant in *role*:
one is a boundary that must clear a non-text law, the other is a fill that must
carry legible text.

---

## Option A — collapse 8·9 into one stop

One stop must then do both jobs: clear 3:1 vs paper-2 as a boundary **and** carry
legible on-text as a fill.

**For**
- Kills the wcag redundancy at the root; the band becomes one rung with one job
  description.
- Simplest mental model: "highlight" is one thing.
- The 22–23 near-identical seeds stop being an embarrassment.

**Against**
- The merged stop must be SOLVED (see Evidence 2), which contradicts the standing
  hand-placed-9 ruling and re-enters the APCA dead zone that ruling was protecting
  against. The light side additionally has **no require plumbing** on the highlight
  producer (`placeLightHighlight` takes no maxLFor) — new resolver code.
- In **apca** the two stops are genuinely far apart (ΔE .138–.174). Collapsing them
  discards a real distinction in the *shipped* lane to fix a problem that only
  exists in the opt-in legal lane.
- The ring register moves: everything aliasing 8 lands on a ~0.14-darker value.

## Option B — move 8 off the scale, focus-only

The scale becomes 1–7 + 9–11 (or renumbered). Stop 8's value survives as a
non-scale role — a focus-ring / boundary token — still solved to 3:1.

**For**
- **It dissolves the C28 residual structurally.** The bright-magenta chroma peak
  (28/1800 cells: wash-7 reaches C .189, stop 8's declared register .165) exists
  precisely *because* stop 8 is simultaneously a scale rung with a chroma register
  AND a law-bound stop. Off the scale, wash-7 has nothing to overtake — no seam
  guard, no patch.
- Keeps 9 hand-placed; the standing ruling survives untouched.
- Honest naming: a value whose position is lane-dependent and law-driven is a
  *role*, not a rung. The scale stays a smooth ladder; the law lives beside it.
- The wcag "redundancy" stops mattering — the ring is allowed to sit near 9,
  because it is no longer claiming to be a distinct step in a ladder.

**Against**
- Introduces a role token to both plugins and the demo (additive, but real).
- The scale has a hole (or needs a renumber — see Decision 2 below).
- Consumers that iterate "stops 1–11" need to learn the role exists.

---

## What actually differs between them

Both options remove stop 8 from the ladder. The real difference is **where the 3:1
law lives afterwards**:

- **A** puts the law on the surviving scale stop → forces 9 to be solved → collides
  with the hand-placed ruling and the APCA dead zone.
- **B** puts the law on an off-scale role → 9 stays hand-placed → no collision.

Everything else (ring register moves, plugin migration, docs) is shared. **If the
hand-placed-9 ruling still stands, B is the option that respects it.**

---

## Open decisions (unchanged from the sweep)

1. **Who carries the 3:1 / Lc-30 law** — the axis above. Under B it is the role;
   under A it is the merged stop, and `placeLightHighlight` needs require plumbing.
2. **Sparse vs renumber** — keep 1–7, 9–11 (precedent: the retired stop-10 kept its
   slot) or renumber 9,10,11 → 8,9,10. Renumber = a full RENAMED_LEAVES round in
   BOTH plugins and re-arms the `darkInkChromaAt` stopIndex trap.
3. **The ring register darkens ~0.14 L** if the ring lands on 9 — owner-eyeball, not
   mechanical. (Under B the ring keeps its own solved value, so this may not apply.)
4. **Figma bindings cannot merge.** RENAMED_LEAVES is a bijective rename; a
   deletion strands one binding set whichever way it goes. Under B, the role token
   is *additive*, which is the gentlest migration of the three shapes.

## Traps worth re-reading before implementing

- `plugin/ui.ts:211` and `plugin-ext/ui.ts:233` run `st(8)` (non-null-assert) per
  row *before* any branch → preview throws and blanks if 8 is absent.
- Both `ui-template.html` files hardcode `repeat(18, 1fr)`.
- `plugin/code.ts:472-482` hardcodes the sibling `highlight/8` for the cta/border
  alias — existing files silently alias a frozen stale prim; fresh files fall to
  transparent.
- `figmaRender.ts:177` guards with `if (s8)` → silent wrong emit, not a crash.
- `colorEngine.ts:189` `highlight:false` strips stop 9 — post-collapse that would
  strip the ramp's only required stop.
- Keep the scaffold array slot (stop-10 precedent) or every index above shifts.

## How to verify a candidate

Gates that must stay green: `sweep:collision`, `audit:register`, `req:audit`,
`figma:verify`, `audit`, `audit:divergence`, `highlight-audit`, `audit:ext`,
`smooth`. Re-bless scope: all five snapshots (dark bless only after owner visual).
Rewrites required: highlight-audit §1b (the permanent 3:1 gate), register-audit's
"8·9 share one register" invariant (becomes vacuous), divergence wave loop + §D,
dark-audit windows, reqtoken-audit ladder checks, `reqtoken-portability`'s headline
demo (it edits stop 8's target — swap to ink-10 4.5→7), figma-verify's outline gate.

## Recommendation

**Option B**, on three grounds: it respects the hand-placed-9 ruling rather than
reopening it; it dissolves the C28 residual structurally instead of patching it;
and it is the only shape whose Figma migration is *additive*. Option A's appeal is
real but rests on the wcag lane, and the shipped lane is apca — where the two stops
are not redundant at all.
