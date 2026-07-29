# Plan / handoff — collapse the highlight band, renumber the inks, drop APCA from the enterprise plugin

Written 2026-07-29. **Nothing here is implemented.** This is the agreed plan for the next round,
captured so it can be picked up cold. Owner approved the shape; the decisions section records what
she ruled and what was left open.

Companion: `scripts/stop-8-9-drift-handoff-2026-07-29.md` — the measurements this plan rests on.
Do not re-derive them; that doc has the pre-C31 baseline, which needs a worktree at `430d5a8` to
reconstruct.

---

## Context

Three stops sit in the 3:1–4.5 region and **two of them are trying to clear 4.5**:
highlight-9 (4.5 vs paper-3) and ink-10 (4.5 vs paper-3 — the declaration says paper-2, but
`resolve.ts:108` `wcagAnchorStop` overrides ink anchors to paper-3 in the WCAG lane). Identical
target, identical anchor, so they resolve to the same place: **145 of 360 agnostic seeds sit within
0.01, and 50 have highlight-9 fractionally past ink-10.** Pre-C31 they were never closer than 1.11.

The 8/9 distinction exists largely to serve APCA, and **APCA cannot be used in the enterprise
plugin** — the owner is not authorized to use it for design decisions (WCAG only; apca is permitted
only as extra legibility inside the extended plugin, which is exactly what is being removed here).
So the band carries a split it does not need, at the cost of a collision it does have.

Owner's call: collapse it. One highlight stop (the 3:1 ring), one emphasis fill that is also the
first ink. Ship the enterprise plugin WCAG-only with light/dark modes. Deal with dark's spread
afterwards, as its own round.

**Priority order is engine → plugin → demo.** Owner, verbatim: *"the plug in and engine are the
product, the demo is secondary… we need to prioritize the engine and plug in and not adjust work
to fit the demo."*

---

## Decisions taken (owner, 2026-07-29)

| question | ruling |
|---|---|
| What carries the fill after highlight-9 dies? | **ink-10 → new ink-9.** It inherits the 4.5 requirement, so it works as text AND as a substrate for paper-3→paper-0 text. |
| Fate of `on-highlight`? | **Dropped, not renamed.** The on-color for ink-9 is always a paper token, so the engine stops solving one. |
| Rename `highlight-8`? | **No.** It keeps its name, its 3:1 law, and all its consumers. Every rename is breaking and this one buys nothing. |
| Public plugin? | **Being unpublished.** Compile only; no migration table this round. |
| Isolation? | Extended plugin only; do not publish the public one mid-change. |
| Unbounded dark stop 8? | **Known, deferred to phase 2** — see Sequencing. |

---

## The change

### 1. Scale shape

| today | after |
|---|---|
| highlight-8 (3:1 vs paper-3) | **highlight-8 — unchanged** |
| highlight-9 (4.5 vs paper-3) | **deleted** |
| on-highlight | **deleted** |
| ink-10 (4.5) | **ink-9** — inherits the 4.5 require, takes over every highlight-9 role |
| ink-11 (7.0) | **ink-10** |
| ink-12 (off-scale #000/#fff anchor) | **ink-11** |

Scale stays contiguous 1–10 plus the off-scale anchor.

**Why ink-9 can be the fill:** it already sits where highlight-9 sits — 4.50 vs 4.67 against
paper-3. That collision *is* the evidence the collapse is visually cheap.

### 2. on-highlight is dropped, not renamed

Remove the `ons.onHighlight` solve and its `ratioFloor` / `enforceLc` plumbing; point the four
`-fg-on-emphasis` aliases at a named paper stop.

⚠️ This removes a solve, not just a name. **Verify the chosen paper clears 4.5 against ink-9
across the agnostic sweep before settling on which paper.**

### 3. Semantic aliases — 1:1 repoint

`tokens/semantic.css`, nine lines currently on `highlight-9`, all → new `ink-9`:
- `--border-default` (line 25 — the global default border for every component)
- `--{critical,warning,positive,info}-bg-emphasis` (4)
- `--{critical,warning,positive,info}-border-emphasis` (4)

Plus `-fg-on-emphasis` × 4 → a paper token (§2). The eight `highlight-8` aliases are untouched.

### 4. Enterprise plugin — WCAG only, light/dark

`plugin-ext/` already defaults to `contrastProfile = 'wcag'` (`ui.ts:22`). The APCA exposure is the
`include-apca` toggle (`ui.ts:83`) which adds `apca` / `apca-dark` columns beside `wcag` /
`wcag-dark`. Remove the toggle and its copy; emit two modes named **light** and **dark**.

Keep `withProfile` / `DEFAULT_APCA_LC_MAP` / `CTA_ONFILL_ENFORCE_LC` in `src/reqtoken/profiles.ts`
**dormant** — the wcag path is a passthrough (`if (profile === 'wcag') return spec`), so the
plumbing costs nothing and preserves any future re-enable.

`src/build.ts:11` `SHIPPED_PROFILE = 'apca'` → `'wcag'`, so generated CSS matches the lane in use.

### 5. Public plugin — compile only

Must still **build** (CI runs `plugin:build`; a failure breaks the Pages workflow) but gets no
`RENAMED_LEAVES` entries this round.

⚠️ Accept explicitly: anyone who already installed it and later updates gets the new token shape
with no migration, so their Figma bindings orphan. Acceptable only because it is being unpublished.
If that changes, the migration table must be written before it ships again.

---

## Files to change

⚠️ **This list is a working map, not a verified sweep.** Two of three exploration agents died
mid-run; the highlight-9 consumer map survived and is solid, the renumber and APCA maps came from
direct greps. Expect gaps in `scripts/` and plugin internals. The name-normalized CSS byte-compare
in Verification §4 is what catches them.

**Engine core**
- `src/engine/tokenNames.ts` — `SHARED_NAMES`, the `stop === 9` special case in `stopTokenName`, `TOKEN_ORDER` (drop `highlight-9` + `on-highlight`, shift inks)
- `src/engine/stopTable.ts` — `SCALE_C_LIGHT` / `SCALE_C_DARK` keys, `LIGHT_L` / `DARK_NEUTRAL_L` indices, `STOP_10_CONTRAST` → the ink-9 target, `STOP_11_CONTRAST_FLOOR`, `HIGHLIGHT_LIGHT` / `HIGHLIGHT_DARK`
- `src/reqtoken/spec.ts` — delete the stop-9 entries (light ~193, dark ~225), retarget `T10`/`T11`, `groupOf`, `ons.onHighlight`
- `src/reqtoken/resolve.ts` — remove the ~6 `sp.stop === 9` special cases (highlight producer dispatch ~212/313, dark band-order floor ~273–306, on-highlight solve ~614–633); update `wcagAnchorStop`'s `stop >= 10` guard and `deepenFor`
- `src/reqtoken/producers.ts` — `lightHighlightChromaAt` / `placeLightHighlight` / `darkHighlightChromaAt` become unreachable
- `src/engine/cssRender.ts`, `figmaRender.ts` — emission order and names
- `src/reqtoken/profiles.ts` — the `s.stop !== 9` APCA carve-out disappears with stop 9

**Tokens + gates**
- `tokens/semantic.css` — §3
- `scripts/highlight-audit.ts` — delete the stop-9 legibility sweep (~74–96), keep the stop-8 3:1 sweep (~98–118)
- `scripts/reqtoken-audit.ts` — the `dark-8<9` check (~72) becomes meaningless; replace with whatever holds order now
- `scripts/figma-verify.ts`, `divergence-audit.ts`, `dark-audit.ts`, `ext-override-audit.ts` — stop indices
- All `scripts/*snapshot*.json` + `smoothness-baseline.json` — re-bless after

**Plugins**
- `plugin-ext/ui.ts` + `code.ts` — §4, plus `RENAMED_LEAVES` entries for ink-10→ink-9, ink-11→ink-10, ink-12→ink-11
- `plugin/` — compile only

**Demo** — after the above, not during.

---

## Traps

**Stop numbers used as array indices do not move with a rename.** The documented trap from the
previous renumber (`1aae676`): `darkInkChromaAt`'s chroma-floor ladder indices deliberately stayed
at their old positions. Re-read that commit message before touching `SCALE_C_*` keys. It was caught
by a name-normalized CSS byte-compare — do the same here.

**`RENAMED_LEAVES` is order-sensitive and self-deleting.** Current-name entries must precede
historical retargets, processed ascending. The table's own comment explains why. A wrong order
silently captures the wrong variable.

**The highlight producer is a separate code path**, not a parametrised variant of the scale
producer — special-cased at ~6 sites in `resolve.ts`. Deleting stop 9 means removing those, not
just deleting a spec row.

**`colorEngine.ts` already has an `opts.highlight` flag** that filters stop 9 out of the compiled
spec when falsy. Every production caller passes `true`. Do not mistake it for the deletion path —
it leaves the numbering intact.

**Dark stop 9 is `P_FIXED` hand-placed with no require**, and the dark band-order floor keeps it
above stop 8. Both disappear with it. Dark stop 8 is require-raised and currently constrained only
by "must not ride past 9" — after the deletion **nothing bounds it upward.**

> **KNOWN AND DELIBERATELY DEFERRED (owner, 2026-07-29).** Do not solve this inside phase 1 and do
> not treat it as a regression when it appears. It belongs to the phase-2 dark round because it is
> the same problem as the spread already measured there — dark stop 8 already sits at **151% of its
> 3:1 target**, and the dark washes already step wider than light at every rung (3→4 1.107 vs
> 1.084, rising to 6→7 **1.389 vs 1.189**). Bounding stop 8 in isolation would be guessing at a
> number the wash/highlight spacing work is about to decide. Carry it forward as an open item.

**Re-blessing hides movement.** Four baselines were re-blessed for C32 already. Re-bless only after
the ten gates are green and the diff has been read.

---

## Verification

1. `npx tsc --noEmit`
2. Ten gates: `audit` · `highlight-audit` · `audit:divergence` · `smooth` · `audit:register` ·
   `audit:ext` · `figma:verify` · `req:audit` · `audit:secondary` · `sweep:collision`
3. **Band order, agnostic sweep** — the invariant that was missing entirely. Assert ink-9 clears
   highlight-8 by a declared margin, both modes, 360 seeds. Baselines in the drift handoff.
4. **Name-normalized CSS byte-compare** against pre-change output: everything except the renamed
   leaves and the deleted stop should be byte-identical. This is what catches the index trap.
5. Build `plugin-ext`, load in Figma from the branch, apply to a scratch collection, confirm two
   modes named light/dark and no apca columns. Existing enterprise smoke test at `plugin-ext/ui.ts:657`.
6. Confirm `npm run plugin:build` still succeeds.
7. Demo last.

Measure through `resolveBrand` / `signalScalesFor` → emitters, never `generateScale`. Agnostic
hue × chroma × L sweeps, not named brands.

## Isolation

**Feature branch off `demo/presentation-polish`; do not merge to `main` until ready.**
`.github/workflows/pages.yml` publishes on every push to `main` — it runs `plugin:build` AND
`plugin-ext:build`, zips both, and drops `okchroma-plugin.zip` + `install.html` on the public site.
Merging mid-change publishes the un-migrated public plugin. Load the extended plugin into Figma
from the local branch build throughout.

## Sequencing

**Phase 1 — this change.** Engine → tokens → gates → plugin-ext. Branch only.

**Phase 2 — the dark band's spread.** Its own round, own decisions. Three things go in together
because they are one problem, not three:

- the **wash spread** — dark steps wider than light at every rung, worst at 6→7 (1.389 vs 1.189)
- the **highlight/ink overshoot** — dark stop 8 at 151% of target, ink stops at 184% / 195%, all
  because the photometric scaffold clears the floors so the requires never fire
- the **unbounded dark stop 8** that phase 1 creates by deleting the stop that was capping it

Expect phase 1 to ship with dark stop 8 uncapped. That is accepted, not overlooked.

⚠️ Constraint carried into phase 2: dark's flat photometric ladder is a **deliberate compromise** —
apparent-L in dark makes blue recede into the background. Clamping dark stops to their targets
pulls them off that ladder. Do not re-propose the apparent dialect for dark as if it were new.

**Phase 3 — demo.**

**Phase 4 — public plugin migration**, only if it is republished.

**Supersedes:** the "ink-10 to 5:1" fix measured earlier (drift handoff, Directions). That
*separated* the two colliding stops; this *merges* them — same collision resolved, one stop fewer.
