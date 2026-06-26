# HANDOFF — Heal the array (make internal index == emitted name)

> **Status:** ready to execute. Owner has authorized this engine change **and** authorized
> breakage if necessary — a representation that reads true is the priority. Read this whole doc,
> then run the prompt at the bottom. Ground in [`ENGINE-SPEC.md §0`](./ENGINE-SPEC.md) (the code-truth
> anchor) and **nothing else** for the model.

## Why this exists (read this or you will repeat the failure)

The engine's emitted output is correct, but its **internal array lies about itself**, and that lie
has cost *hours* — it has fooled humans *and* AI sessions repeatedly into inverting the cta/highlight
model, going in circles. **This is the root fix.** When it's done, the code says what it means and
the circling stops.

**The lie, exactly:** in `colorEngine.ts generateScale`, the internal stop array stores:
- the **CTA** (the brand-identity archetype fill) at **slot 9/10**, and
- the **highlight** rung (the `rootL≈0.62` ladder value) *appended* at **slot 13/14**.

But the **emitted names** are `cta-1/2` (from slot 9/10) and `highlight-9/10` (from slot 13/14). So
**internal index ≠ emitted name.** Anyone who reads `light[8]` ("stop 9") thinks it's `highlight-9`;
it's actually the cta. `tokenNames.stopTokenName` papers over it with a `RampKind` flip
(stop 9 → `cta-1` for brand vs `highlight-9` for neutral) + `EXT_NAMES{13,14}`.

## The target model (this is the truth to make the code match — ENGINE-SPEC §0)

- **`highlight-9/10` = the scale's emphasis rung** at a *targeted* L (`HIGHLIGHT_LIGHT.rootL ≈ 0.62`,
  `stopTable.ts:48`), placed by the **same ladder math as stops 1–8**. Derived, ≥3:1 (holds white
  text), identical-rule across families. **This belongs at the native scale slot 9/10.**
- **`cta-1/2` = the pulled-out, off-scale, archetype-dependent identity fill** (the brand's own L;
  variable). It is **not** a numbered scale stop.

## The change

In `generateScale`: **put the highlight rung into slot 9/10** (where its name already claims to be),
and make the **cta a genuine off-scale `GeneratedScale` field** (its own `cta`/`ctaHover` + dark
equivalents) with **no numbered slot**. Then in `tokenNames`: **delete the `RampKind` 9/10 flip and
`EXT_NAMES{13,14}`** — slot 9/10 always names `highlight-9/10`; the cta is emitted from the off-scale
field. Internal index finally equals emitted name.

---

## BLAST RADIUS (mapped by a 4-agent read-only workflow, verified against code)

### Verdict: byte-identity is PARTIALLY achievable — and that split is the whole plan
- **Emitted output (`dist/brands.css` + Figma `Light.json`/`Dark.json` + every `var(--…)` name) is
  byte-identical-ACHIEVABLE.** Emit order/names are keyed on the **name string** via
  `TOKEN_ORDER`/`tokenOrder` (`cssRender.ts:16`, `figmaRender.ts:57`), **never the slot index** — so
  the same name→hex pairs regenerate from a re-laid-out array, and the cta value math is unchanged
  (only its *destination* moves). **Gate #1** proves this.
- **Internal-array byte-identity is UNAVOIDABLY broken.** Moving highlight into index 8/9 puts it
  *inside* the `slice(0,12)` window, so `dark-audit-snapshot.json`, `smoothness-baseline.json`, and
  `highlight-snapshot.json` **drift at stop 9 and MUST be re-blessed.** There is no layout that both
  puts highlight at internal 9/10 and leaves `slice(0,12)` unchanged — they're contradictory. **Gate
  #2** is a *deliberate, audited* re-bless, not a failure.

### A. Engine core — `src/engine/colorEngine.ts` (the real surgery)
| loc | what it is now | change |
|---|---|---|
| `:571-577` light cta push `makeStop(9,light9L…)`/`(10,hoverL…)` | the cta @ slot 9/10 | route cta value (`light9L`, enforce-darken) into `scale.cta`/`ctaHover`, **not** `light[]` |
| `:608-632` dark cta push + dark stop-1–8 loop | dark cta @ slot 9/10 | cta → off-scale dark field; stops 1–8 + new highlight 9/10 stay in `dark[]` |
| `:650-661` dark on-fill polarity + WCAG re-make reads `dark[8]/[9]` **by index** | **MOST DANGEROUS silent break** — binds polarity/contrast to "the cta"; post-move `dark[8]` is the highlight | read the off-scale `ctaDark` field, not `dark[8]` |
| `:665-738` highlight append `placeLegibleRung(13,…)`/`rung(14,…)` (guarded by `opts.highlight`) | highlight @ 13/14 | move rung math UP to produce slots **9/10** (`placeLegibleRung(9,…)`/`rung(10,…)`); tail append disappears |
| `:694-716` `placeLegibleRung` / `:683-686` `rung` helpers | pure fns; `stop` only stamped into `.stop` | callers pass 9/10; **body unchanged → byte-identical at the new stop number** |
| `:758-776` `applyRedCoolRender` `for (const i of [8,9]) scale.light[i]=…` | hardcodes light[8]/[9] as cta | rewrite to mutate `scale.cta`/`ctaHover` (resolve.ts:216 calls it LAST — the field must exist by then; it does) |
| `:237-264` `GeneratedScale` interface + 13/14 layout comment | the type | add off-scale `cta`/`ctaHover`(+dark) fields; **keep** `onFillTextIsWhite`/`onHighlightIsWhite` names; rewrite the comment |
| `:817-830` `generateNeutralScale` | calls `generateScale(…,{highlight:true})` | no code change; flip the comment (slot 9/10 = highlight) |

### B. Engine call sites — safe IF `applyRedCoolRender` is fixed
`resolve.ts:38-46/139/155/173/216`, `signalShift.ts:72-94`, `signals.ts`, `darkChromaCurve.ts`,
`neutralCurve.ts` — **no positional index access**; depend only on the `highlight:true` shape.
Unaffected provided the cta off-scale field is populated before `applyRedCoolRender` runs.

### C. Emitters — must change in LOCKSTEP with colorEngine (gate = `figma:verify`)
| loc | change |
|---|---|
| `tokenNames.ts:56-58` `stopTokenName` 9/10 kind-flip | **invert**: stop 9 → always `highlight-9`, stop 10 → `highlight-10`; kind not consulted for 9/10 |
| `tokenNames.ts:47-50,59` `EXT_NAMES{13,14}` + lookup | **delete**; fold `highlight-9/10` into the unconditional 9/10 branch |
| `tokenNames.ts` `onFillTokenName` + `TOKEN_ORDER` | **unchanged** (already name-driven; cta already listed as trailing pulled-out role) |
| `cssRender.ts:14-37` `brandKindBody`/`stopsToVars`, `:117-126` `mirrorBody` | **inject** `cta-1`/`cta-2`/`on-cta` explicitly from the off-scale field (cta no longer falls out of the stop loop — if you forget this, cta **silently vanishes**) |
| `figmaRender.ts:50-63` `rampGroup`, `:86-112` `build`/`extra` | inject `cta-1`/`cta-2` from the off-scale field via the `extra` object (mirrors how `onHighlightWhite`/`identityHex` already ride) |
| `build.ts` | indirect; recompile + byte-diff `dist/brands.css` |

### D. Cross-area positional readers — the DOMINANT radius (~56 reads; mostly outside the core)
These read `light[8]`/`dark[8]` as **the cta** and `light[12]`/`slice(12)` as **the highlight**, and
will silently return the WRONG color after the move:
- **`demo/CustomTheme.tsx:142/412/453-454`** — ships-as hex + exact-mode WCAG check (BREAKS).
- **`scripts/cta-enforce-blast.ts` (the CTA CANARY)**, `cta-realpath-check.ts:20`, `helmk-ladder.ts:58-59`,
  `suspect-probes.ts`, `color-math-diag.ts` — repoint cta reads to the off-scale field.
- **`scripts/highlight-audit.ts:46/82-83/103/114/116`** — `slice(12)`→9/10, `[8]`→off-scale cta,
  fix the `length===14` assertion; re-bless `highlight-snapshot.json`.
- **`scripts/dark-audit.ts:88/149/159/164`** + `dark-audit-snapshot.json` — repoint `[8]`; re-bless.
- **`scripts/smoothness-audit.ts:149-150/236`** + `smoothness-baseline.json` — re-baseline.
- `scripts/locked-set-check.ts`, `neutral-ref-check.ts`, `neutral-swatches.ts`, `adversarial-*.ts`,
  `dark-emphasis-band.ts`, `deadzone-probe.ts`, `highlight-fallout-*.ts`, `highlight-mechanism.ts`,
  `highlight-misfit.ts` — repoint (diagnostics; printed numbers wrong otherwise).
- `scripts/gamut-sweep.ts` — count-only, **no change**.

### Snapshots that MUST be re-blessed (gate #2)
`dark-audit-snapshot.json` · `highlight-snapshot.json` · `smoothness-baseline.json`.

---

## EXECUTION SEQUENCE (do not reorder; gate between)

0. **Capture the byte-diff oracle BEFORE touching anything.** `npm run figma:verify` (must PASS),
   `npm run audit`, `npm run highlight-audit`, `npm run smooth`, `npm run sweep` (record green).
   `npm run generate` → copy `dist/brands.css` to a baseline path; emit `Light.json`/`Dark.json` via
   the **real pipeline** (`resolveBrand → themeToFigma`, NEVER a direct `generateScale` call) to a
   baseline path. These are the oracles for gate #1.
1. **Engine — add off-scale fields.** Extend `GeneratedScale` (`:237-264`) with `cta`/`ctaHover`(+dark);
   route the existing cta math (`:571-577`, `:631-632`, the `:650-661` polarity/WCAG block) into the
   new fields instead of `light.push`/`dark.push`. Keep `onFillTextIsWhite`/`onHighlightIsWhite`. **Do
   not move highlight yet.** Build only.
2. **Engine — relocate highlight to 9/10.** `placeLegibleRung(13,…)`/`rung(14,…)` → `(9,…)`/`(10,…)`
   (`:720-736`); tail append disappears. Array is now clean 1–12, highlight at 9/10, cta off-scale.
3. **Engine — fix `applyRedCoolRender` (`:758-776`)** to mutate `scale.cta`/`ctaHover`.
4. **Emitters in lockstep** — `tokenNames` (invert 9/10, delete EXT_NAMES 13/14); `cssRender` +
   `figmaRender` inject `cta-1/2`+`on-cta` from the off-scale field. `on-highlight` stays via the
   existing `onFillTokenName('neutral')` path. `TOKEN_ORDER` unchanged.
5. **GATE #1 — emitted byte-identity (the canary).** `npm run figma:verify` MUST be green (name set,
   canary hexes `#07074f`/`#869cda`, signal cta ≠ highlight). Then `npm run generate` + `diff
   dist/brands.css` vs baseline → **ZERO diff**. Re-emit Figma JSON + byte-diff → **ZERO diff**. Any
   drift = the cta injection wired the wrong field/order. **Do NOT bless any snapshot until this is
   green.**
6. **Cross-area consumers** — `demo/CustomTheme.tsx:142/412/453-454` repoint to the off-scale cta field
   (kept paired with `onFillTextIsWhite`); verify the ships-as arrow + exact-mode a11y rows.
7. **Cross-area scripts** — repoint every positional cta read (`[8]/[9]` → off-scale) and highlight
   read (`[12]/slice(12)` → slot 9/10): cta-enforce-blast (incl. canary), cta-realpath-check,
   highlight-audit (incl. length assertion), dark-audit:88, locked-set/neutral-ref/neutral-swatches,
   the adversarial/diagnostic probes. gamut-sweep needs no change.
8. **GATE #2 — internal snapshots (only AFTER gate #1 locks).** Re-run `audit`/`highlight-audit`/`smooth`
   — they WILL go red at stop 9 (highlight now in the first-12 window). **This is expected.**
   Spot-check the drift is *exactly* the stop-9 highlight-rung values (not a regression elsewhere),
   then re-bless: `npm run audit:bless`, `npm run highlight-audit:bless`, `npm run smooth:baseline`.
9. **Final** — full suite green (`figma:verify`, `audit`, `highlight-audit`, `smooth`, `sweep`).
   Rewrite stale layout comments (figma-verify "stop 9 → cta-1", colorEngine/tokenNames/dark-audit,
   ENGINE-SPEC §0's internal-index note). Update `CATALOG.md`. Commit in labeled chunks per step.

## VERIFICATION CHECKLIST
- `figma:verify` PASS (name set incl. `cta-1/2`,`highlight-9/10`,`on-cta`,`on-highlight`,`identity`;
  canary `brand['cta-1']` light `#07074f`/dark `#869cda`; signal `cta-1` ≠ `highlight-9`; identical
  keys across modes).
- `diff dist/brands.css` vs baseline = **ZERO bytes**. Figma `Light.json`/`Dark.json` byte-diff = **ZERO**.
- CTA canary (`cta-enforce-blast.ts`) reads the NEW off-scale field, reports the unchanged cta hex.
- `grep dist/brands.css` for `--brand-cta-1`, `--brand-highlight-9`, `--neutral-highlight-9`,
  `--red-cta-1`, `--red-highlight-9` — all present (cta didn't vanish; highlight names didn't collapse).
- Snapshot drift (audit/highlight-audit/smooth) is **expected, confined to stop 9**, then re-blessed;
  post-bless full suite PASS.
- `demo/CustomTheme.tsx` ships-as arrow + exact-mode a11y rows show the **cta** fill (not highlight).
- `plugin/code.ts:164-176` on-cta/on-highlight flatten still resolves (name-keyed; no change expected).
- `demo/shared.tsx:440` `generateIllustrationScale(generateScale(…))` still compiles (reads scalars + `.stops`).

## GUARDRAILS (the lessons; do not relapse)
- **Reason about stops 8/9/10 from ENGINE-SPEC §0 and the EMITTED names — NEVER from the colorEngine
  generation array.** That array (cta@9/10, highlight@13/14) is the exact trap; reading it as "what is
  stop 9" is what caused the circling. After this refactor the array is safe to read, but until then,
  treat it as off-limits for "what is stop N".
- **The owner's "go" is given for THIS refactor specifically** (byte-identical emitted output + a
  deliberate snapshot re-bless). It does NOT extend to behavior/value changes — if any *emitted* token
  value would change, STOP and flag it; that's not this change.
- **Validate via the real pipeline** (`resolveBrand → themeToFigma`), never a direct `generateScale`
  call (it bypasses collision / rung-1 / cool-render and lies for colliders).
- Commit in small labeled chunks; gate after each.

---

## Workstream B (separate, also needed) — comprehensive comment-truth audit
The targeted de-poison sweep did NOT line-by-line audit engine comments; dense files are full of
present-tense lies. **Exhibit A:** `stopTable.ts ACCENT_DARK_STOPS` — uses the `accent` name we're
killing, presents the **vestigial `rootL` column** as operative, and describes **`subtleChromaBoost`**
(CATALOG C2 / §4.4 bolt-on) as a live feature. **Approach:** a per-engine-file workflow — each agent
classifies every comment `TRUE / STALE / CONTRADICTS-MODEL / VESTIGIAL-AS-LIVE / BOLT-ON-RATIONALE`
against §0 + the code, then fixes. Start with `stopTable.ts`. Run AFTER (or parallel to) the array heal.

**B includes a VOCABULARY SWEEP — code + comments + identifiers, NOT just comments.** The vocabulary
is **scale / cta / ons** (ENGINE-SPEC §7). The words **`surface` / `surfaces` / `fills` / `text`** must
NOT categorize the scale — stops 1–8 are just **scale stops 1–8** (`paper`/`wash`/`accent` by name),
the fill is **cta**, text is **ink**. ~158 `surface` mentions remain (e.g. "surface scale" in
`tokenNames.ts:7/29/53/73`, `cssRender.ts:23/137/139`, `colorEngine.ts:369/666`, `stopTable.ts:41`,
`darkChromaCurve.ts`, `perceptualL.ts`; the **`SURFACE_SCALE` const at `demo/shared.tsx:412`**; the
guide docs). Replace with §1 vocabulary. **NOTE:** the demo's app-chrome CSS vars
`--surface-base/raised/sunken` are the demo's OWN preview UI tokens (semantics don't matter) — separate,
lower priority; don't conflate. Clean fan-out: one agent per file, comments+identifiers only, byte-identical.

## Session context (what's true as of this handoff)
- On branch `fix/highlight` (off `main`, tip `c014abc`+). Recent commits: `0d93420` §0 anchor,
  `ec5e755` CTA-PULLOUT correction, `6b48acc` Radix strip (Radix fully removed from live code/docs/memory).
- **Decisions:** accent re-bucket → leaning **`wash 3-7` / `highlight 8-10`** (owner's contrast/3:1
  taxonomy; endorsed — it's a staged *name* remap, do it AFTER the array heal). Neutral cta value =
  keep generated near-white for now. Emitted token names are canonical (`highlight-9/10`, `ink-11/12`).
- The **back-to-0 enforcement cut** (`SESSION-HANDOFF-highlight-homeostasis.md`) is a SEPARATE behavioral
  track, owner-gated + dark-bg visual review — do it AFTER the array heal (the array heal is byte-identical;
  don't entangle them).
