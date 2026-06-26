# Session handoff — highlight / cta "back to 0" (homeostasis)

> Written 2026-06-26 on branch `fix/highlight` (off published `main` = `d87c8bf`).
> For a **parallel session that overlapped on this same branch.** Read this first, then
> ask if you need specifics. **No engine code was changed this session** — only read-only
> analysis scripts + docs were added. The plan below is awaiting the owner's final "go."

---

## TL;DR

The dark **highlight** chip collapses onto `accent-8` in dark mode. Root cause is **not**
the handoff's "fixed L floats" theory — it's a **bolted-on legibility layer that moves the
fill to make white text legible**. The owner's directive: **get the engine back to 0 by
SUBTRACTION** — strip the layers that force a fill to hit a text-contrast target, so the
fill renders from the ramp and the text color is simply picked afterward. Then fix
holistically. **Do not** redesign outputs, predict text colors, or aim for a "uniform"
result.

---

## ⚠️ The owner's framing — READ THIS FIRST (it tripped the session repeatedly)

These are hard constraints from the owner, re-stated several times after I kept importing
stale framing from memory/docs:

1. **Render the ramp/fill FIRST, then pick the text color for it.** There must be **no
   feedback** from text-contrast back into the fill color. "Move the fill to make the text
   legible" is the anti-pattern to remove.
2. **Goal = engine homeostasis by SUBTRACTION.** A lot of corrective layers got bolted on
   instead of relying on the H-K (Helmholtz–Kohlrausch) math. Strip them; let the value
   fall out of the pipeline. (Aligns with the standing `no-corrective-patch-layers` rule.)
3. **We are NOT trying to produce a "uniform" result, and NOT trying to pick the "right"
   text color yet.** Just get back to **0** so issues can be fixed **holistically**.
4. **`highlight` ≠ button.** Don't reason about it as a button or preserve any
   "dark-button / white-text" look.
5. **Audits going RED after the cut is expected and desired** — it surfaces the real issues.
6. **APCA is licensed for this project but the polarity/contrast-model rework is a SEPARATE
   follow-up.** Do not fold it into the back-to-0 cut. (See "out of scope" below.)

> STALE framing to ignore (it misled this session): any note about "uniform white text both
> modes," "owner must decide white vs black," or "lift `HIGHLIGHT_DARK.rootL` to ~0.68."
> Those were my earlier wrong turns, now superseded. The `helmk-research.md:87-88`
> "uniform white-text both modes, owner-approved" line is **stale** per the owner.

---

## The relevant pipeline (code-grounded)

Everything generates in `src/engine/colorEngine.ts :: generateScale`; the real per-brand
entry point is `src/engine/resolve.ts :: resolveBrand` (NOT `generateScale` directly — see
the methodology warning).

Token groups (ENGINE-SPEC §1): **scale** (1–8 surfaces, `highlight-9/10`, `ink-11/12`),
**cta** (`cta-1/2`, the archetype-dependent identity fill), **ons** (`on-cta`,
`on-highlight`, computed text).

- **`cta`** = the **one archetype-dependent fill** (ENGINE-SPEC §1). brand/secondary: cta
  L = the input color's own L → `cta-1` ≈ the input hex. The **archetype** (`archetypes.ts`)
  is a pure **lightness** classifier — it contains **no contrast logic**; it sets contrast
  limits only passively (by fixing L).
- **`highlight`** = a **scale** token (universal, derived, archetype-*independent*).
  cta ≠ highlight — never conflate them (ENGINE-SPEC §1 warns about this explicitly).
- **L per mode:** light L is solved on the H-K perceptual curve (`perceptualRungL`);
  **dark L is the fixed `DARK_NEUTRAL_L` scaffold** + the dark highlight starts at fixed
  `HIGHLIGHT_DARK.rootL = 0.62`. The H-K migration moved **dark chroma only**
  (`perceptualDarkC` / `darkChromaCurve`), never dark L.

---

## The diagnosis (dark highlight) — confirmed by measurement + an adversarial workflow

- It is **not** apparent-L "float": the dark highlight's apparent L is actually *tighter*
  than light's. The defect is **ladder position** — it sits on top of `accent-8`.
- **Mechanism:** `placeLegibleRung` (`colorEngine.ts:692–714`) reads the picked polarity,
  and when `enforceOnFillContrast` is set and the picked side fails WCAG 4.5, it **darkens
  the fill** until it passes. At the 0.62 start APCA picks **white**; white fails WCAG; the
  flip-to-black is blocked by the `blackAPCA |Lc| ≥ 45` floor in `onTextIsWhite`
  (`:389–398`) — the L 0.56–0.65 dead zone — so the loop darkens for white down to
  ~0.55–0.58 = right on dark `accent-8` (`DARK_NEUTRAL_L[7] = 0.55`).
- In **light** the identical operation is harmless (light `accent-8` is at 0.738, far above),
  which is why it only breaks in dark.

Full write-up: **`docs/engine-spec/HIGHLIGHT-CTA-ANALYSIS.md`** — but see the caveat in
"Artifacts" below: its **§C (the proposed fix) is partly STALE** (it still carries the
"lift rootL / owner picks white-vs-black" framing that the owner superseded). §A (pipeline)
and §B (diagnosis) are current and rigorous.

---

## The plan: the back-to-0 cut (pending owner's final "go")

Remove every site that **moves a fill to hit a text-contrast target** ("layer #3").
**FOUR sites** (an earlier draft of this doc said three — the 4th was caught in review):

1. **Highlight** — strip the value-move inside `placeLegibleRung` (`colorEngine.ts:692–714`),
   so the rung renders at its ramp L and polarity is just read off it.
2. **cta** — remove the `enforceOnFillContrast` fill-darken (`:570–573` light, `:654–661`
   dark). The owner decided to drop this too (it's leftover pre-H-K logic). NOTE the dark
   block is effectively **dead code** (dark fills are black-text-first, so its white-enforce
   branch never fires).
3. **cta (red-band tail)** — remove the *same* enforce-darken re-applied inside
   `applyRedCoolRender` (`:765–772`) after the cool rotation, for red-band brands. **Only the
   enforce-darken tail goes — the §3.2 cool *rotation* (`:760–763`) stays.**
4. **Success signal** — remove `enforceWhiteFill` / `fillAnchorL` darken (`:440–443`). Same
   pattern; ENGINE-SPEC §4.3 already wanted it retired.

**Leave untouched:** `onTextIsWhite` (the polarity *pick*, including its WCAG flip) — that's
the APCA follow-up, not this cut. After the cut, fills render at their pure ramp/archetype
value and some on-text will be illegible (audits red) — that's the surfaced work.

**Doc reconciliation to land in the SAME change (not just §4.3):**
- **ENGINE-SPEC §4.3** says "`enforceOnFillContrast` still bounds compliance" (keep) — the
  owner's decision **reverses** it. Update §4.3 + the cta canary note.
- **CATALOG `C5`** is marked **KEEP** for this exact flag — flip it to **REMOVE** (this is the
  "C5-KEEP vs homeostasis-strip divergence" already flagged in `CTA-PULLOUT-AUDIT.md`).
- **CATALOG `C3`** (green's `enforceWhiteFill`) — the cut executes it; mark **RESOLVED**.
- **CATALOG `C1`/`F3`** note ("the cta's value-darken stays cta-only") becomes **moot** once
  the darken is gone — tweak it.
- **CATALOG:427** "Verified §3 KEEPS" lists `applyRedCoolRender` — add the caveat that only
  its enforce-darken tail is removed, the rotation stays.

---

## What's untouchable / out of scope

- **cta canary** — `scripts/figma-verify.ts` asserts brand (Dark Roast) `cta-1` = `#07074f`
  light / `#869cda` dark. Dropping the cta enforce was checked to **leave it green** (Dark
  Roast doesn't collide; its light cta is far past 4.5 and its dark cta is black-text-first).
  Keep it green unless deliberately changing cta.
- **`onTextIsWhite` / the polarity-pick model (APCA vs WCAG, the `≥45` floor, the dead
  zone)** = the **owner's separate follow-up**. Not part of back-to-0.
- The `archetype` classifier (`archetypes.ts`) — it has no contrast logic; nothing to do.
- **The generation inversion / `RampKind` name-flip** (cta generated in the 9/10 slot,
  highlight appended at 13/14, `tokenNames.ts:52–54` flipping `stop 9 → 'cta-1'` for brand
  kind vs `'highlight-9'` for neutral kind) is a **different axis** — token placement/naming,
  not contrast enforcement. Out of back-to-0 scope; it's the separate "cta pull-out"
  workstream tracked in `CTA-PULLOUT-AUDIT.md`. The cut leaves slots + names byte-identical.
- **Dark fill L-floors** (`DARK_BRAND_FILL_MIN_L 0.70` / `DARK_STOP_9_MIN_L 0.63`,
  `dark9L = max(scaleL, …)` at `:606`) are **kept** for this cut — a *fixed visibility floor*,
  NOT a text-contrast feedback loop (nothing reads the picked text; it always lifts so the
  dark fill doesn't vanish on a dark bg). The `0.70` value carries a *secondary* on-text
  rationale in its comment, but the mechanism isn't the move-to-target anti-pattern. It is,
  however, the **open owner-visual decision `C8`** (lift-floor vs the `DARK_NEUTRAL_L`
  0.66/0.72 scaffold) — a holistic-pass item, not a verified keep.

---

## ⚠️ CRITICAL methodology lesson (this is the most important thing to inherit)

**Do NOT validate engine behavior by calling `generateScale` directly with a hand-built
options object.** It bypasses `resolveBrand`, which also runs collision detection, **rung-1
archetype re-anchor**, the **dark-collider 'muted' float**, and the final
**`applyRedCoolRender`**. I made this mistake estimating the cta blast radius and it was
wrong for every colliding brand — proven:

| brand | direct `generateScale` light cta-1 | real `resolveBrand` light cta-1 |
|---|---|---|
| Chili Mocha | `#E42418` | **`#680000`** (rung-1 maroon) |
| Cranberry | `#A50034` | **`#66001D`** (rung-1) |
| Hibiscus | `#C61D1B` | **`#680003`** (rung-1) |

Always go through **`resolveBrand` → `themeToFigma`** (`src/engine/figmaRender.ts`) — the
same path the build and `figma-verify` use. Non-exact brands get the new dark rules
(`darkChromaCurve`, `ACCENT_DARK_STOPS`, `DARK_BRAND_FILL_MIN_L`, `coolRedDark`) only through
`resolveBrand` (`resolve.ts:120–135`); **exact** brands ship raw (`darkChromaCurve: undefined`).

**Next concrete step (agreed with owner): establish a NEW full-fleet baseline snapshot via
the real pipeline BEFORE cutting** — so the cut's true blast radius is a clean diff, not a
hand-rolled A/B. Natural anchor = the `themeToFigma` export (it's what `figma-verify` checks
and where the canary lives); cover all families (brand + secondary + neutral + 4 signals),
both modes, full role set. (Existing `dark-audit-snapshot.json` / `highlight-snapshot.json`
are audit-specific, not a full token snapshot.) **This snapshot was not built yet** — it's
where the session was when this handoff was written.

---

## Current repo state

- **No engine source changed.** Gates currently green: `npm run figma:verify`,
  `npm run highlight-audit`, `npm run typecheck`.
- Branch `fix/highlight`; nothing committed this session (all added files are untracked).
- The highlight-audit does **not** assert `accent-8 ↔ highlight` separation (only
  legibility + monotonicity + hover-distinctness) — which is why the defect ships green. A
  separation assertion should be added when we re-bless.

---

## Artifacts (all added this session unless noted)

**Docs:**
- `docs/engine-spec/HIGHLIGHT-CTA-ANALYSIS.md` — the deep analysis. §A/§B current; **§C
  partly STALE** (lift-rootL / owner-decision framing, superseded by back-to-0). Treat §C as
  historical until rewritten to the subtraction plan.
- `docs/engine-spec/HIGHLIGHT-CTA-HANDOFF.md` (pre-existing) — the original handoff; its
  "fixed L floats" hypothesis was **refuted** (see §B of the analysis).
- `docs/engine-spec/CATALOG.md` — entries **C13/C24/C25/C26 are STALE** (retired
  SHAPE_DARK/loudnessCap); don't ground in them.

**Read-only analysis scripts** (bundle with `node_modules/.bin/esbuild scripts/X.ts
--bundle --platform=node --outfile=dist/X.js && node dist/X.js`):
- `highlight-misfit.ts` — apparent-L spread + ladder-position, light vs dark.
- `highlight-mechanism.ts` — proves the value-move drags the rung onto accent-8.
- `deadzone-probe.ts` — the APCA/WCAG dead zone across L (the `≥45` floor).
- `dark-emphasis-band.ts` — where emphasis fills can sit in the dark ladder.
- `highlight-fallout-check.ts` / `highlight-fallout-bothmodes.ts` — what text color is
  legible on the *natural* (un-moved) fill.
- `cta-enforce-blast.ts` — ⚠️ **FLAWED** (uses direct `generateScale`, bypasses
  resolveBrand). Kept only as the cautionary example.
- `cta-realpath-check.ts` — proves the flaw (direct vs resolveBrand divergence table above).
- `adversarial-*.ts` — created by an adversarial-verification workflow that re-derived and
  attacked the diagnosis (mechanism: confirmed; fix: partial — its corrections are why §C is
  stale).

---

## Open items / next steps

1. **Build the real-pipeline baseline snapshot** (resolveBrand → themeToFigma, full fleet,
   both modes). ← session was here.
2. Get the owner's final "go," then make the **4-site** subtraction cut + the ENGINE-SPEC §4.3
   update + the CATALOG reconciliation (C5 flip, C3 resolve, C1/F3 note, the §3-keeps caveat)
   in one change.
3. Re-run the snapshot; the diff is the true blast radius. Expect audits red (by design).
4. Add an `accent-8 ↔ highlight` separation assertion to `highlight-audit.ts` before any
   re-bless.
5. The polarity-pick / APCA model is a **separate** follow-up — don't pull it into the above.

> If the two sessions are editing the same files, **coordinate on `colorEngine.ts`** — the
> cut touches `:440–443`, `:570–573`, `:654–661`, `:692–714`, and `:765–772`
> (`applyRedCoolRender` tail); `onTextIsWhite` at `:389–398` is the deliberately-untouched
> boundary.
