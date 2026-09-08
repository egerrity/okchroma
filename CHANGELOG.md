# Changelog

npm releases of `okchroma`. Dates are npm publish dates (UTC).

**Versioning policy (0.x):** a patch changes only resolved values, internal fixes,
and docs. Any release that adds, renames, or removes token keys, or changes the emit
structure, ships as at least a minor.

Deeper engineering history lives in `docs/engine-spec/CATALOG.md` and the git log.

## 0.5.0 — 2026-09-08

- Two instrument words move. The tinted band `highlighter-8/11/15/20` is renamed
  `chalk-8/11/15/20`, and the 3:1 stop `crayon-26` is renamed `highlighter-26`. Names
  only: every resolved value is byte-identical through the CSS, Figma, and DTCG emit, and
  both Figma plugins rename an existing file's rows in place, ids kept. CSS custom
  properties follow (`--brand-chalk-11`, `--neutral-highlighter-26`), as do the DTCG
  group labels (`chalk`, `highlighter`) and the `against` field of `pen-58` (`chalk-20`).
  The `HueCollisionCheck` fields are `dHueChalk` and `chalkDeltaE`.
- The opacity ladder ships: eight bare numbers, `--opacity-004/008/012/016/024/032/048/064`,
  in the `:root` block `signalsCss` writes, and `system/opacity/NNN` number tokens
  (`$type: "number"`) in `themeToFigma`. Both plugins write them as number variables:
  `utility/opacity/NNN` in the extended plugin, `system/opacity/NNN` with theme aliases in
  the community plugin. The same in both modes. New exports: `OPACITY_RUNGS`,
  `INTERACTION_RUNGS`, `opacityLeafName`, `opacityVarName`, `opacityTokenPath`,
  `OpacityRung`, `FigmaNumberToken`, `FigmaLeaf`.
- `highlighter-26` at the state rungs `008` through `032` is the translucent state layer over
  any paper or inverted ground, and the pen band's 4.5:1 claim covers those composites over
  every paper of the family and of the neutral (`audit:guarantee`). The chalk and
  highlighter descriptions say so; chalk no longer names interactive states.
- The shadows compose with the ladder: `--shadow-04/08/12` in `tokens/semantic.css` read
  `--opacity-004/008/012` in light and `032/048/064` in dark. `SHADOW_ALPHAS` derives from
  `OPACITY_RUNGS`. Values unchanged.
- The scrim's own color row is removed: `--abs-black-060` leaves `:root`,
  `system/alpha/abs-black-060` leaves the Figma tree and both plugins, and `SCRIM_VAR` is
  no longer exported. `--scrim` in `tokens/semantic.css` composes black with
  `--opacity-064`, so the scrim moves from 60% to 64%, onto the ladder. `SCRIM_ALPHA`
  stays exported at the new value. An existing file's row orphans in place.

## 0.4.0 — 2026-09-06

- The scrim ships in CSS: `--abs-black-060` (black at 60%, both modes) in the `:root`
  block `signalsCss` writes, beside the alpha ladders; `tokens/semantic.css` aliases it
  as `--scrim`. The same row was Figma-only before. A new token key, hence a minor.
- The secondary's soft `stamp-on` is declared once. The body writes the pole at alpha
  directly where the quiet-fill rule applies; it used to write the solid pole and then
  re-declare the alpha form after the body. Resolved values are byte-identical.
- `neutralTintHue` and its `NeutralSource` type are exported. The README and Install
  examples that already called it now run.

## 0.3.1 — 2026-09-02

- The declaration names `paper-5` as the ground of `pencil-47` and `pen-70` (it spelled
  `paper-3`, which the resolver mapped onto `paper-5` before solving). Shipped values are
  byte-identical; the DTCG `against` field on those two tokens now reads `paper-5`. The
  dark-parity and band audits' snapshots, which pin the unshipped APCA solve, are re-blessed.

## 0.3.0 — 2026-09-02

- The DTCG requirement tokens name the off-scale roles by their shipped spelling:
  `stamp-fill`, `stamp-fill-hover`, `stamp-fill-pressed` (the group keys and the `role`
  field; they were `cta`, `cta-hover`, `cta-pressed`, the one output that had not taken
  the stamp rename). `parseToken` still accepts the old words, so a bundle emitted before
  this release re-resolves identically. Values do not move.
- The DTCG `$value.components` are rounded to four decimals (they were full doubles of
  the 8-bit channel over 255); `hex` is unchanged and is what re-resolution reads.

## 0.2.2 — 2026-09-01

- The pen and paper contrast guarantees now hold in the neutral's direction too:
  each stop clears the nearest paper of its own family AND the worst paper the
  family's generated neutral can produce (the guarantee is symmetric). Fixes the
  one breach: a neutral pen-58 (light) against a chromatic highlighter-20. The
  neutral pen solve gains a second worst-Y bound; `audit:guarantee` extended to
  measure both directions. Values move only where the bound binds.
- (0.2.1 was version-bumped but never published; 0.2.2 is the same content.)

## 0.2.0 — 2026-09-01

- **The instruments rename.** Names only — no value moves. Band words become
  instruments and the digit inverts to `100 − round(light rootL × 100)`:

  | 0.1.x | 0.2.0 |
  |---|---|
  | paper-100 / -99 / -97 / -95 | paper-0 / -1 / -3 / -5 |
  | wash-92 / -89 / -85 / -80 | highlighter-8 / -11 / -15 / -20 |
  | wax-74 | crayon-26 |
  | lead-53 | pencil-47 |
  | ink-42 / -30 / -0 | pen-58 / -70 / -100 |

  Off-scale families keep their names (`stamp/*`, `system/*`, `link/*`,
  `identity`), as do the family words (neutral, brand, brand/alt, the signals).
  Guarantees are stated in `docs/scale.md`.

## 0.1.5 – 0.1.7 — 2026-08-31

- The pre-rename naming series, published as incremental cuts: the mark band
  becomes wax (`mark-74` → `wax-74`), ink-0 returns to the pole, the
  link/alpha/absolute name restructure, and group labels derive from the token
  names (0.1.7, the band-true labels). Names and labels only.

## 0.1.4 — 2026-08-30

- The disabled opacity ships as a value (`DISABLED_OPACITY`).

## 0.1.3 — 2026-08-30

- The inverse offset ladder: state-layer offsets with the pole flipped for
  inverted grounds.

## 0.1.2 — 2026-08-30

- `themeToFigma` emits the top-level `system` group (surface planes spliced from
  the neutral, absolute poles, alpha and shadow leaves).
- Dark cta states flip above the light-archetype floor; the quiet cta's soft
  on-text is gated per mode in every emitter.

## 0.1.1 — 2026-08-29

- Packaging: `tokens/` joins the published files alongside `dist-lib`.
- The stamp-edge machinery and the token-name rosters are exported for external
  consumers.

## 0.1.0 — 2026-08-28

- First npm release: the engine's JS API — `resolveTheme`, `brandCss`,
  `signalsCss`, `themeToFigma`, and the DTCG requirement tokens — as ESM + CJS
  with TypeScript declarations.
