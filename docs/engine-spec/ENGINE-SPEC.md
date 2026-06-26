# ENGINE-SPEC — the single source of truth

> **Read this, and ONLY this, to understand the engine's intended design.** Everything in
> `docs/engine-spec/_archive/` is HISTORICAL (the stage1–10 handoffs + the dark-mode explorations).
> They captured the journey and contradict each other; do **not** ground a decision in them.
> `docs/guide/*` is human-facing **product** documentation that currently **lags** this spec — it's
> aligned in Phase 4; until then treat it as subordinate (do not ground engineering decisions in
> it). If something here is wrong or missing, fix THIS file.
>
> **Branch:** `scope/dark-chroma` — the superset of `scope/engine-spec` + the dark greenfield (the
> only commit it lacks is `scope/signal-cta`'s `27adbeb`, which the render work below supersedes).
> Do not merge to `main`.
>
> **Status discipline:** every step below carries a Status line. Update it the moment it changes.
>
> **Problem catalog:** [`CATALOG.md`](./CATALOG.md) is the running list of issues found mid-execution.
> Log there as you go and fix them **holistically**, not piecemeal — do not inline-fix a found-problem
> mid-phase.

> ## ▶ Resume here (next session)
> **Where:** `~/okchroma` on `scope/dark-chroma` (the `okchroma-dark` worktree was removed — one
> folder; do not recreate it). **`npm run build` (the `--full` one) is authoritative** — `demo:build`
> / `generate` run a STALE `dist/build-script.js` that clobbers `signals.css` with old `error/warning`
> names; rebuild that bundle or avoid those scripts.
> **Ground in §1–§3 of this file only.** Unification **Phases 1+2 LANDED** (`ac81b36` + floor `8aa3237`);
> next is **Phase 3.5 — the owner-led curve-perceptual pass** (`CATALOG.md` C24–C26: non-perceptual
> `SHAPE_DARK`, the `highlight-2` cliff, red-reads-orange) → THEN re-bless (C21/C22) + the `highlight-audit`
> rewrite (C10). **Honor §7** — explain any engine change and WAIT for the owner's "go"; review on a DARK
> background; re-bless only on owner visual approval.

---

## 1. Vocabulary (use these words; nothing else)

A **family** = one palette: `brand`, `secondary`, `neutral`, or one of the four signals
(`red`, `yellow`, `green`, `info-color`). **mode** = `light` / `dark`.

Every family's tokens fall in exactly three groups:

| group | synonyms | what it is | tokens |
|---|---|---|---|
| **scale** | numbered / steps / stops | **not** archetype-dependent — one universal rule, **identical across every family** (L targets **fixed**; chroma + hue **derived** from the input via the curve) | `paper-1/2`, `wash-3/4/5`, `accent-6/7/8` (1–8); `highlight-1/2` (a "9b/10b"); `ink-alt` (old 11); `ink` (old 12) |
| **cta** | archetype-dependent | the **one** archetype-dependent fill — analogous to Radix 9/10 | `cta-1`, `cta-2` |
| **ons** | calculated text / on-fill text | text-on-fill polarity, **computed** from the fill's luminance — falls out, never forced | `on-cta`, `on-highlight` |

Supporting terms: **identity** = the verbatim input hex (brand/secondary only). **archetype** = the
lightness category that sets the cta (near-black / dark / rich / vivid / bright / light).

**How a value is set** (precise — don't blur these):
- **fixed** = a constant, the same for every family/input (stop 1–8 light L targets, `ink`/`ink-alt` L, the dark `DARK_NEUTRAL_L` targets).
- **derived** = set by a universal curve/rule, so the value **varies by input** (hue, source chroma) but predictably (the scale's chroma + hue, the `highlight` value).
- **archetype-dependent** = the cta's flavor of derived — varies by archetype.
- **computed** = the `ons`, set from the fill's own luminance.

> Note: `highlight` lives in **scale**, not with `cta`. It is a **derived** scale value (predictable,
> not archetype-dependent). The old docs' "emphasis fill" lumped cta+highlight together — that
> obscured the whole model. Don't.

---

## 2. The base scale (the spine — every family inherits this)

Stops 1–8 sit at the same **light L** for every family; `highlight` and the text steps follow.
The scale is **hue-aware** (see §3.2) but otherwise one rulebook for all.

| scale token | light target L |
|---|---|
| `paper-1` | 0.993 |
| `paper-2` | 0.982 |
| `wash-3` | 0.960 |
| `wash-4` | 0.936 |
| `wash-5` | 0.903 |
| `accent-6` | 0.860 |
| `accent-7` | 0.806 |
| `accent-8` | 0.738 |
| `highlight-1` | **derived** ~0.58 (curve-set; e.g. yellow rides higher) — `on-highlight` **computed**, both modes |
| `highlight-2` | `hoverL` of `highlight-1` |
| `ink-alt` | 0.53 |
| `ink` | 0.30 |

Dark mode uses the fixed dark L targets `DARK_NEUTRAL_L` (same spine, dark values) and the dark
chroma curve `brandC · shape(L) · cap(L,H)`. **`ons` (on-cta, on-highlight) are computed from the
fill they sit on** — exactly like on-cta already is at `colorEngine.ts:619`. No forced flip.

---

## 3. Deviations from the base — only four kinds are legitimate

> **The bolt-on test:** a per-color behavior is allowed **only** if it is §3.1 (architectural),
> §3.2 (hue-optimization), §3.3 (collision-avoider), or §3.4 (owner override). Anything else keyed
> to a color is a bolt-on to remove.

### 3.1 Architectural — per-family, always on (this is *what makes a family a family*)
The base scale trickles down to each family unchanged; only the **cta** changes (and neutral also
runs its own curve):

| family | cta rule | curve | identity |
|---|---|---|---|
| **brand / secondary** | **variable** — cta L = the input color's own L (archetype) | base | input hex |
| **neutral** | **fixed light-L** — a near-white low-hierarchy button ('light' archetype, dark on-cta) | **its own low-chroma (clamped near-gray) curve** | — |
| **signal** | **hue-aware L target** — vivid / louder, per stoplight hue | base | — |

### 3.2 Hue-optimizations — unconditional; applied to a hue *range* for everyone, no trigger
Smooth functions of hue *position* baked into the base; not per-family, not per-color.
- **gold-spine hue torsion** (warm band ~40–122°) — warm hues stay gold, not olive, down the ramp.
- **yellow lightness-lift** (`YELLOW_L_LIFT`, ~72–112°) — +0 at stop 1 → up to +0.03 by stop 8, so
  yellow doesn't slide into olive/mud as it darkens. Hue-keyed; fires for any yellow-ish color in
  any family. (NOT the style lever.)
- **yellow chroma-boost + vividness fade** (yellow band).
- **cream gate** (`CREAM_UPPER_H` ~105°) — upper-hue cutoff of the cream/muted-warm blend.
- **warm-red cool-render** (red band 12–35.5°) — warm reds rotate cooler for the whole band,
  render-time, unconditional (non-colliders).
- *(the dark curve's per-hue loudness-cap is the same idea, continuous over all hues.)*

### 3.3 Collision-avoiders — conditional; fire only within a hue range when a real collision is met
Job: keep families distinguishable from each other / from the signals. NOT scale generation.
- **yellow** → lemon (warm-yellow brand) vs macaroni (cool) — the warning variant.
- **red** → rung-1 archetype re-anchor (+ 11/12 text deepen, + dark muted-collider, + orange-side
  outline component rule).
- **green / info-color** → the swap shifts (teal / yellow-green; magenta / blue).

### 3.4 Owner overrides — human-set at intake, not automatic (flagged so they're never mistaken for bolt-ons)
**exact** (ship the hex untouched), **archetype-override**, the **style lever** (`deeper` — pushes
muted warm golds toward the cream register).

---

## 4. What changes (finish the unification; remove the forced patches)

Everything in §3 is KEEP. These four are the unfinished Stage-6 work + the forced-flip patch:

1. **Forced `ons` → computed `ons`.** Delete the dark black-flip (`flipHl`, `colorEngine.ts:686`),
   the hardcoded `onHighlightIsWhite/Dark`, and the light white-enforcement darken-loop. Compute
   `on-highlight` from the `highlight` value's luminance (mirror on-cta). If a family's `on-highlight`
   needs to land a certain way, move the `highlight` **value via the curve** — never force the text.
2. **Signal `cta` = `highlight` duplicate → split.** Today signals copy stop-9 onto cta
   (`figmaRender.ts:108–110`, `build.ts` aliases). Route signals through the scale (`highlight:true`)
   so `highlight` is the scale value and `cta` is the loud archetype value — they diverge.
3. **Retire green's `enforceWhiteFill`** (Stage-6 Step 3). `on-cta` falls out; `enforceOnFillContrast`
   still bounds compliance.
4. **`subtleChromaBoost` as a bespoke signal-surface path → gone.** Signals run the identical base
   scale. Any "alerts run hotter" is a single optional multiplier layered **on top** of the unified
   output (default off) — owner reviews with-vs-without and decides.

---

## 5. Implementation phases

- **Phase 0 — doc hygiene.** Status: **DONE** (commit `6cdbe7b`) — ENGINE-SPEC written; stage1–10 +
  dark-mode explorations archived to `_archive/` with a do-not-ground README; `guide/*` kept but
  subordinated via banner (Phase-4 rewrite pending); owner hand-flags salvaged into Phase 4.
  Worktree consolidated — work now lives in `~/okchroma` on `scope/dark-chroma`.
- **Phase 1 — engine** (`colorEngine.ts`, `resolve.ts`, `signalShift.ts`, `signals.ts`). Status:
  **LANDED** (`ac81b36` + floor `8aa3237`). Computed `ons` (one shared polarity rule, both modes);
  signals through the scale + loud cta; `heat` seam in `cAt` (default 1); dropped `subtleChromaScale`
  + `enforceWhiteFill`. **+ F6:** identity-proportional dark chroma floor folded into `darkChromaCurve`
  (scaled by the resolved cta chroma — fixes the signal-surface washout; **C7 flipped** to KEEP
  `applyChromaFloor` for exact). New flags default off → brand/secondary cta byte-identical
  (`figma-verify` `#07074f`/`#869cda` canary GREEN).
- **Phase 2 — render** (`figmaRender.ts`, `cssRender.ts`, `build.ts`). Status: **LANDED** (`ac81b36`).
  Signals render brand-kind-minus-identity (cta=stop9, highlight=rung); duplicate dropped;
  `on-highlight ?? true` removed. Supersedes `27adbeb`.
- **Phase 3 — guards + re-bless.** Status: **PARTIAL.** `figma-verify` updated (signal cta ≠ highlight)
  — GREEN. The `highlight-audit` rewrite (C10) + snapshot re-bless (`dark-audit-snapshot.json` +
  `highlight-snapshot.json`, C21/C22) are **DEFERRED to the curve-perceptual pass** — blessing now would
  bake in C25's known-wrong `highlight-2`. Re-bless after owner visual approval; brand/secondary cta must NOT drift.
- **Phase 3.5 — curve-perceptual pass (owner-led, NOT yet started).** See `CATALOG.md` **C24–C26**:
  the dark chroma `SHAPE_DARK` is hue-adjusted only by a cap multiplier (not a per-hue shape) and peaks
  at the fill then drops off a cliff (desaturating `highlight-2`); red reads orange in dark. Re-derive
  the curve for perceptual chroma-constancy, then re-bless. Do this BEFORE Phase 4.
- **Phase 4 — final sweep + guide rewrite.** Status: not started. Sweep code against §3; rewrite
  `docs/guide/*` to match (vocabulary §1, baseline→deviations §2–3). **Guide-triage seed** (salvaged
  from the owner's hand-flags before discarding them — incomplete, verify all):
    - `stop-ladder.md` ↔ `the-12-stop-ramp.md` — suspected **redundant**; reconcile or merge.
    - `style-lever.md` — overstates: `full-chroma` was **never implemented** (only `default`/`deeper`); correct it.
    - `escape-hatches.md` — re-check `archetype-override` status (flagged "future improvement").
    - `compliance.md` — a partial rewrite was started (WCAG-vs-APCA framing + role-name vocab
      `text-alt`/`text`/`paper-2` instead of step numbers); keep that direction.
    - Bare revisit-flags (no specifics): `chroma-envelope`, `dark-mode`, `for-designers`,
      `illustrations`, `lineage`, `neutrals`, `collisions`, `warm-hues`.

---

## 6. Verification

On a **DARK background**, in `demo/TokenCards.tsx`, **full role set** — never abstract ramps:
1. `npm run build` in `/Users/emilygerrity/okchroma-dark`.
2. Serve the **worktree** on port 3010 (`demo-dark` config — NOT the main repo; sanity-check
   `http://localhost:3010/dist/signals.css` shows `--red-highlight-1` ≠ `--red-cta-1`).
3. Every family, light AND dark: confirm each `on-highlight` **falls out** correctly (no forcing) and
   signal `cta` (loud) now differs from `highlight` (scale). Include a signal-shifting brand
   (warm-yellow→lemon) and a red-band brand.
4. With-vs-without `heat` on the four signals (dark first) → owner picks.
- Gates green: `typecheck`, `audit`, `highlight-audit`, `figma:verify`, `plugin:build`.

---

## 7. Process rules (these caused the rework — honor them)

- **Explain any engine add/change/subtract — what, where, how — and WAIT for explicit "go."** Never
  decide engine/design unilaterally. Reuse `generateScale`; don't reinvent.
- **No forced corrective layers.** Values fall out; desired outcomes come from **curve adjustment**,
  not from forcing text/fills.
- **Use the §1 vocabulary.** Don't invent categories ("surfaces/fills/text") — it's scale / cta / ons.
- **Review on a dark background, in the demo card, full role set.** Re-bless only with owner approval.
- **Keep THIS doc current.** Every landed step updates its Status line. A confused future session
  should fix this file, not spelunk the archive.
