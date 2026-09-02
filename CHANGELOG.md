# Changelog

npm releases of `okchroma`. Dates are npm publish dates (UTC).

**Versioning policy (0.x):** a patch changes only resolved values, internal fixes,
and docs. Any release that adds, renames, or removes token keys, or changes the emit
structure, ships as at least a minor.

Deeper engineering history lives in `docs/engine-spec/CATALOG.md` and the git log.

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
