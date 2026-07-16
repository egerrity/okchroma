# Manual test plan — C19 cta family + APCA include toggle + neutral cta escape

Follow top to bottom on the work computer. Needs a Figma **Enterprise** org (extended
collections). Load `plugin-ext/dist/` via *Import plugin from manifest* (build is current:
`npm run plugin-ext:build`). Steps marked **[v1]** use the published-plugin codepath
(`plugin/dist/`) instead.

**How to inspect:** Variables panel → the `theme` collection; the mode dropdown at the top
right of the table shows the solve columns; hover a variable for its description stamp.

---

## A. Fresh file, toggle OFF (the new default posture)

1. New file → run plugin-ext. Confirm the **Include APCA columns** checkbox exists under
   *Preview contrast* and is **unchecked**; ⓘ reads "Off: new files get wcag only…".
2. Apply a brand (any hex, e.g. `#0B5FFF`, name `test-a`).
   - ☐ `theme` base has exactly **two** modes: `wcag`, `wcag-dark`.
   - ☐ Variable description stamp reads `OKChroma · modes: wcag 3:1/4.5/7:1 (default)` —
     **no** apca clause.
   - ☐ The cta family is SEMANTIC six: `brand-primary/cta`, `cta-hover`, `cta-pressed`,
     `cta-ink`, `cta-ink-hover`, `cta-ink-pressed` (no `cta-1`/`cta-2` anywhere).
   - ☐ `cta-ink` value equals `ink-10` value in every column; `cta-ink-pressed` equals
     `ink-11` (press lands on the family's stronger text register).
3. Apply a second brand `test-b`. ☐ Still two modes; second extension appears.

## B. Turning APCA on over an existing file (the posture flip)

4. Tick **Include APCA**. ⓘ flips to "On: Apply adds apca columns if missing (asks
   first…)".
5. Apply `test-a` again (same name).
   - ☐ FIRST Apply does **not** run — status warns it will *overwrite "test-a"* **+** *add
     the apca + apca-dark column(s)… regenerate all 2 existing brand extension(s)*.
   - ☐ SECOND Apply runs: base gains `apca` + `apca-dark` modes; status ends with
     `apca+apca-dark column(s) added`; a **backfill** batch then re-applies `test-b`
     automatically.
   - ☐ Spot-check seeding: pick `brand-primary/cta` in the BASE collection — its `apca`
     value must **differ** from its `wcag` value (an unseeded column would show identical
     light-lane copies). Same check on `neutral/wash-5` `apca-dark` vs `wcag`.
   - ☐ Stamp now includes `· apca Lc 30/75/90`.

## C. Deleted stays deleted

6. In the Variables panel, delete **both** `apca` and `apca-dark` modes from the base.
7. Untick **Include APCA**. Apply a new brand `test-c`.
   - ☐ No confirm about columns; base still has only `wcag`/`wcag-dark`.
   - ☐ Re-apply `test-c` once more — columns **stay deleted**.

## D. Half-deletion restores safely (was a silent-corruption bug — now confirmed + seeded)

8. Tick Include APCA → Apply `test-c` twice (flip the file back to four columns).
9. Delete **only** `apca-dark`. Untick the toggle. Apply `test-c` again.
   - ☐ FIRST Apply warns: *add the apca-dark column(s)…* (the surviving `apca` column
     keeps the lane on; the half is restored, never silently).
   - ☐ SECOND Apply restores it. Spot-check `brand-primary/cta` `apca-dark` ≠ `wcag` —
     restored with true dark-lane values, not light copies.

## E. Your own modes are never touched

10. On a **wcag-only** file (redo step 6–7 or new file), hand-add a mode named `print` to
    the base. Tick Include APCA → Apply (confirm → Apply).
    - ☐ `print` keeps its name AND its values.
    - ☐ `apca`/`apca-dark` are NEW modes after it.

## F. Reason-scoped confirm

11. Apply an existing brand name with the toggle **off** → overwrite warning appears.
12. Before the second Apply, **tick Include APCA**, then Apply.
    - ☐ It does NOT proceed — a fresh confirm lists BOTH reasons (overwrite + columns).
      (The old arm can't authorize the posture you ticked afterwards.)

## G. Batches

13. Wcag-only file, toggle **ON**, click *Apply test roster* once.
    - ☐ Arm copy includes "Include APCA is ON — adds apca columns if the file lacks them."
14. Click again to run. Mid-run, untick the toggle.
    - ☐ The run is unaffected (posture snapshotted at start); final summary reports
      `apca+apca-dark column(s) added`.
15. Arm *Re-apply all brands* with toggle off, then tick the toggle before the second click.
    - ☐ The arm is reset — the second click re-arms (fresh copy) instead of running.

## H. [v1] C19 rename on a legacy file (published-plugin codepath)

16. Open a file previously written by plugin v1 (has `brand/<name>/primary/cta-1` etc.,
    ideally with a component bound to `brand/primary/cta-1`). Load `plugin/dist/`, apply
    the same brand name (confirm the overwrite).
    - ☐ `cta-1`/`cta-2` variables are RENAMED in place to `cta`/`cta-hover` — the bound
      component still resolves (id kept), no orphaned variables, no duplicates.
    - ☐ Six cta tokens per family; `cta-ink` in the mode collection is an **alias** to the
      sibling `ink-10` (shows as alias, not a raw color).

## I. Neutral cta escape (Phase 3 — red-range brands)

17. plugin-ext (or v1), enter a red primary, e.g. `#EA3E3E`, Recommended mode. Open the
    **Advanced** disclosure (collapsed by default — it holds Link color, the escape, and
    the vividness lever).
    - ☐ A "**Use neutral primary cta**" checkbox appears in Advanced (it hides for a blue
      hex — retype `#0B5FFF` to confirm, then back to red; re-entering red should show it
      again, still remembering its checked state).
    - ☐ BUNDLE: ticking it also flips the Link color field to the custom blue (#0B57D0,
      field un-greys). Unticking reverts the link to from-primary — but ONLY if you never
      touched the hex; an edited link survives the untick.
18. Tick it. In the preview matrix, the primary row's three FILL cells go near-black
    (light preview) — the cta-ink text cells and the ramp stay the brand's red.
19. Apply the brand.
    - ☐ `brand-primary/cta` value = the `neutral/ink-11` value exactly (near-black in the
      light column, near-white in the dark column); `cta-hover`/`cta-pressed` step away
      from it; `on-cta` = white in light, black in dark.
    - ☐ ALL the ctas de-red: `cta-ink` = the `neutral/ink-10` value (the text-style cta
      swaps with the fills); the RAMP (washes/inks) stays the brand's red.
    - ☐ The red signal resets to CANONICAL — no per-brand red variant is written
      (`system/red/base`, not a `rich`/`coral` variant path).
    - ☐ **[v1]** `brand/<name>/primary/cta` is an ALIAS to `system/neutral/<key>/ink-11`;
      `…/cta-ink` an alias to `…/ink-10`.
20. Untick and re-apply. ☐ The cta family returns to the brand's red trio (v1: aliases
    replaced by raw values); the red variant returns if the brand had one.
21. plugin-ext only: with the escape applied, run *Re-apply all brands*.
    - ☐ The escaped brand keeps its escape after the batch (the recipe carries it).

## J. System link (one per theme)

22. Any brand: the "**Link color**" field lives in **Advanced** — a GREYED, read-only hex
    showing the primary's resolved text-action color with a "from primary" hint (link is
    system-level, never per-family).
    - ☐ Untouched: the field shows the primary's ink-10 hex greyed; apply →
      theme `system/link` / `link-hover` / `link-pressed` exist. **[v1]** they are ALIASES
      to `brand/<name>/primary/cta-ink*`; **[ext]** they carry the primary's cta-ink
      values and each brand extension overrides them with its own.
23. Click the link hex (takes it over — prefills `#0B57D0`, un-greys, an ↩ appears) and
    apply. ☐ The ↩ returns the field to the greyed from-primary state.
    - ☐ `system/link` ≈ `#2a5cb4` in the light/wcag column (the seed through the ink
      register), a dark-native blue in the dark column. **[v1]** the theme link aliases a
      shared `system/link/<hex>` primitive.
24. Red brand + escape ON + custom link OFF: ☐ the link follows the ESCAPED neutral text
    color. Escape ON + custom link ON: ☐ links are the custom blue while the cta family
    stays neutral.

## K. Link on multi-brand files + upgrade posture (post-review fixes 2026-07-16)

25. **[v1]** File with TWO brands applied by this build (say `alpha`, `bravo`), then delete
    the theme `system/link*` vars by hand and re-apply only `alpha`.
    - ☐ `system/link` is recreated and `bravo`'s MODE also resolves — switch the theme
      collection's mode to `bravo`: links show bravo's own text-action color, never black.
26. plugin-ext: on a file whose base predates the link tokens (or hand-delete the three
    `system/link*` base rows), apply any one brand.
    - ☐ FIRST Apply warns: *add 3 new base token(s) (system/link, …) and regenerate all
      N existing brand extension(s)*.
    - ☐ SECOND Apply runs and a backfill batch re-applies the other brands; afterwards
      each extension's `system/link` shows its OWN brand's color (never the default
      seed's pink).
27. Take over the link hex (click it), then clear the field (or type `#0B57`) and Apply.
    - ☐ Apply BLOCKS with "Enter a valid custom link hex…" — it must never silently ship
      the default link posture while the field reads custom (both plugins).
28. **[v1]** Apply a custom link, note the primitive path: it is keyed by the SEED hex
    (`system/link/0b57d0`), not the resolved color; re-applying refreshes its values.

Anything that reads differently than a checkbox above: screenshot + which step — that's a
bug, not your setup.
