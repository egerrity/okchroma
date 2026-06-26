# De-poison sweep — report (2026-06-26)

No-gloss record of the autonomous cleanup sweep. Scope was **inventory + safe fixes** (no behavior
changes, no token renames, no dark-mode fix); SSOT consolidated into `ENGINE-SPEC.md`. All gates
(`typecheck`, `figma:verify`, `highlight-audit`) were **GREEN before and after** every change — this
sweep touched only comments, docs, and memory, so the engine output is byte-identical.

## The headline finding (this changes the story)

**The engine OUTPUT is already clean and uniform — the "mess" was almost entirely in the
docs/comments/memory, not the code.** Verified against BOTH emitters (`cssRender.ts` +
`figmaRender.ts`): every family (brand, secondary, neutral, all signals) is rendered **brand-kind**
and emits the SAME uniform token set:

`paper-1/2 · wash-3/4/5 · accent-6/7/8 · cta-1/2 + on-cta · highlight-9/10 + on-highlight · ink-11/12`
(brand/secondary also `identity`).

The only per-family difference is the **cta value** (§3.1). This already matches the owner's model.

**The "per-family cta/highlight inversion" does not exist in the output.** It was a poison pellet —
derived from a stale comment (`colorEngine.ts:251-255`) and a **dead `'neutral'` branch** in
`stopTokenName` that the emitters never call. It fooled my own earlier audit *and* one of the three
planning scout agents. The Phase-1/2 unification (already merged to `main`) had quietly made the
output uniform; the docs/comments never caught up. That lag is exactly what kept derailing prior
sweeps.

## What changed (commits on `fix/highlight`)

| commit | what |
|---|---|
| `bed612e` | land the 3 untracked analysis/handoff docs (protect from a stray git op) |
| `73cda28` | land the read-only probe scripts (wip; cta-enforce-blast flagged FLAWED) |
| `0d93420` | **ENGINE-SPEC §0 code-truth anchor** + intro branch-stale fix + 3 stale code comments fixed |
| `ec5e755` | correct `CTA-PULLOUT-AUDIT.md` (no inversion; banner; narrative marked historical) |

Plus **memory** (outside git, auto-saved): rewrote `cta-pullout-audit` to the corrected truth; fixed
the stale "neutrals are hardcoded Radix / `generateNeutralScale` unused" line in `engine-color-rules`
(both emitters generate the neutral now); fixed branch-state in `dark-mode-chroma-reduction`,
`engine-spec-effort`, and the `MEMORY.md` index (scope/dark-chroma merged → main; work on fix/highlight).

### The SSOT anchor (ENGINE-SPEC §0)
New "read first" section: the precedence rule (**code = truth; spec = intent; CATALOG = gaps; all
else defers**), the verified uniform token inventory, the per-family cta rule (with neutral cta value
marked **OPEN**), the internal-index wrinkle, the historical root (cta *was* 9/10), and the open
`highlight-1/2`-vs-`highlight-9/10` naming discrepancy.

### Poison pellets fixed
- `tokenNames.ts:20-22` — "'neutral' covers neutral + signals" → corrected (emitters always brand-kind; `'neutral'` branch unused).
- `colorEngine.ts:251-255` — "neutral appends cta at 13+" → corrected (all families append HIGHLIGHT at 13/14).
- `colorEngine.ts:~350` — "style not yet wired" → corrected (`deeper` IS wired; `full-chroma` declared-but-unimplemented).
- ENGINE-SPEC intro — "Branch scope/dark-chroma; do not merge to main" → corrected (merged to main).
- `CTA-PULLOUT-AUDIT.md` — correction banner; inversion narrative marked historical.

## Resolved contradictions (Phase A)
- **`style` lever:** `deeper` is wired (`colorEngine.ts:~486`); `default` is a no-op; `full-chroma`
  is a declared-but-unimplemented enum value (no handler reads it).
- **Neutral cta source:** the neutral is GENERATED per brand (`generateNeutralScale`) and rendered
  brand-kind — cta at stop 9, highlight appended at 13/14. (Not a hardcoded Radix alias in the engine.)
- **EXT_NAMES:** only `13/14` (`highlight-9/10`). The "dead EXT_NAMES 15/16" referenced by CATALOG
  C18 / a scout is itself stale — there are no 15/16.

## NOT done — deferred, with why (no silent truncation)

1. **CATALOG.md reconcile** — the largest remaining item. Entries need IMPLEMENTED/OPEN tags and
   fixes: C13/C24-C26 (retired SHAPE_DARK/loudnessCap) are stale; C4 (signal split) is DONE;
   C18 references non-existent EXT_NAMES 15/16; C5 should flip **KEEP→REMOVE** (owner resolved).
   Left untouched to avoid a rushed half-reconcile; it deserves its own focused pass.
2. **ENGINE-SPEC §4-vs-§5 drift** — §4 lists "signal cta=highlight split" as TODO; §5 says it
   LANDED. Flagged in §0; not yet edited in §4 itself.
3. **§6 verification block** — still references the removed `~/okchroma-okchroma-dark` worktree +
   port 3010. Stale path; not fixed.
4. **`docs/guide/*` targeted fixes** — `style-lever.md` (full-chroma), `neutrals.md` (generated vs
   Radix), `for-designers.md`/`README.md` ("emphasis fill = same step, different name"; signal
   "cta = highlight" rows), "step 9 as a role" in `collisions.md`/`dark-mode.md`. Guide is
   subordinate (Phase-4 rewrite); discrepancies catalogued, edits deferred.
5. **Dead-code removal** — the unused `'neutral'` branch of `stopTokenName` and the `full-chroma`
   enum value are annotated as such but NOT removed (removal is safe-but-behaviorless cleanup; left
   for a deliberate gate-verified pass).
6. **Archive tombstones** (`_archive/README`, `docs/archive/*`) — not strengthened.

## Owner questions — RESOLVED (2026-06-26, plugin claim verified by workflow)
- **Plugin neutral — RESOLVED (verified, adversarial pass could not refute):** the plugin
  **GENERATES** the neutral per brand at runtime from the brand hue (`plugin/ui.ts` →
  `resolveBrand`/`themeToFigma` → `generateNeutralScale`; `manifest.json` allows no network).
  **NOT Radix** — the old `src/radixNeutrals.ts` / `closestNeutralFamily()` lookup is **deleted**;
  the only Radix residue is the numeric `neutralCurve.ts` constants once *fit from* Radix families (a
  derivation input). Dedups same-hue brands onto a shared primitive keyed by a rounded hue bucket
  (`system/neutral/<level>-h<round(brandH)>`, or `pure` for grey). **No live engine-vs-plugin
  divergence.** (See ENGINE-SPEC §0.)
- **Naming — RESOLVED:** emitted names canonical (`highlight-9/10` in-scale; `cta-1/2` pulled out by
  name + number). Spec §1/§2 `highlight-1/2`/`ink-alt` text should be updated to the emitted names
  (doc edit, queued).
- **Neutral cta value — still OPEN:** target undecided (may become transparent; must not be a scale alias).

### New poison pellets found during plugin verification — docs referencing DELETED code (FIXED this pass)
- `docs/guide/neutrals.md`, `lineage.md`, `README.md` referenced the **deleted** `src/radixNeutrals.ts`
  + `closestNeutralFamily()` + `neutralRadixCss` (a Radix-family neutral the code no longer has).
- `plugin/code.ts:13` example `system/neutral/sand` was wrong (real key is `<level>-h<H>` / `pure`);
  `figmaRender.ts:37` "neutral families shipped as hex strings" is a fossil (that helper is used only
  for the `identity` token now).

## Radix-framing follow-up (2026-06-26)
Code + docs + memory sweep on Radix framing (adversarial pass confirmed: **Radix is not a dependency**
— no npm dep, no imports, every `radix` in `src/` is a comment):
- **Reframed "built on / extension of Radix"** (a foundation it never was) in `guide/lineage.md`
  (title + concept + how), `guide/for-designers.md`, `guide/README.md` → Radix is a one-time
  reverse-engineering reference; the reserved-12-step convention is the owner's own pre-existing idea.
- **Fixed the remaining false "neutral ships a Radix family"** claims (`guide/neutrals.md:5,18-30`,
  `guide/README.md:99`) the earlier plugin pass missed — the neutral is generated; the Radix-family
  path is deleted.
- **Verified H-K vs Radix:** H-K (`perceptualL.ts`, Nayatani 1997) replaced the hand-tuned per-hue
  patches (`YELLOW_L_LIFT`/`loudnessCap`), but the base constants (`LIGHT_STOPS`, `DARK_NEUTRAL_L`,
  `SHAPE_DARK`, `GOLD_SPINE`/`WARM_TORSION`, `neutralCurve.ts`) are **still Radix-fit and live** —
  recorded in ENGINE-SPEC §0. So "Radix is gone" holds for the dependency + the patches, **not yet**
  for the base skeleton (migrating those off Radix is a next step).
- **Memory reframes:** `MEMORY.md`, `neutral-generation-from-brand-hue`, `no-corrective-patch-layers`,
  `engine-color-rules`, `engine-spec-effort` — "replace/assign Radix" → "deleted the Radix-family
  PICKER; constants fit-from-Radix; Radix not a dependency."
