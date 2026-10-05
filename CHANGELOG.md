# Changelog

npm releases of `okchroma`. Dates are npm publish dates (UTC).

**Versioning policy (0.x):** a patch changes only resolved values, internal fixes,
and docs. Any release that adds, renames, or removes token keys, or changes the emit
structure, ships as at least a minor.

Deeper engineering history lives in `docs/engine-spec/CATALOG.md` and the git log.

## 0.8.1 — unpublished

- **Two declaration files leave the package.** 0.7.0 and 0.8.0 carry
  `dist-lib/types/engine/interaction.d.ts` and
  `dist-lib/types/engine/requirements/dtcg.d.ts`: declarations of the interaction register
  and of an earlier requirement-token emitter, whose sources left the engine in 0.7.0. The
  library build wrote into `dist-lib` without emptying it and the package ships that folder
  whole, so the two files stayed on the publishing machine and went out with both releases.
  The build now empties the folder first, and `prepack` runs `npm run audit:lib` after it:
  a pack stops when a file in the folder has no source in the tree, or when an entry file
  `package.json` names is missing.
- **Nothing an import of `okchroma` reaches changes.** The entry declarations refer to
  neither file, and the exports map serves only the package root.
- **What a consumer does.** Nothing, unless a type-only import names one of the two files
  by its path, which only TypeScript's legacy `node10` module resolution allows. Both
  describe functions the package does not have; remove the import.

## 0.8.0 — 2026-10-05

- **A root group on the DTCG documents, opt-in.** `tokensToDtcg(tokens, { rootGroup: 'color' })`
  nests every path under the named group and writes every alias with it
  (`{color.brand.pencil-47}`), for a consumer whose paths start with the category.
  `npm run tokens:emit -- <hex> [slug] --root color` writes the same two files. The group
  is one segment, lower-case words and digits joined by hyphens; anything else throws.
  Without the option the documents are byte for byte what 0.7.0 writes. `COLOR_GROUP`
  exports the word and `DtcgOptions` the option's type. `audit:dtcg` runs every case in
  both forms.
- **No CSS name changes and no value moves.** The custom properties never carry the group.
- **The extended plugin writes its rows under `color/`** where it wrote `base/`
  (`color/brand/pencil-47`). Base versus utility is no longer a word in the path: the
  group is the category, hand-authored color roles can share it, and the plugin knows its
  own rows by the identity it stamps on each. A file applied by an earlier version migrates
  on its next apply: every engine row is renamed in place, so bindings and brand overrides
  stay; a row renamed by hand keeps its name; the Web code syntax does not change; rows the
  engine no longer writes stay under the names they had. The apply stops before it writes
  anything when a variable the plugin did not stamp sits at a name an engine row has to
  move to.
- **The Mapper** looks for its targets under `color/`. On a file not yet re-applied with
  the extended plugin it reports them missing and asks for that re-apply, as it does for
  any missing target.
- **What a consumer does.** Nothing for the CSS, and nothing for documents emitted without
  the option. A Figma file applied with the extended plugin: re-apply once, on a copy of
  the file first. Anything that reads the extended plugin's variable names, or the path it
  stamps on each variable, reads `color/…` after that re-apply.

## 0.7.0 — 2026-09-30

- **The engine emits primitives only.** A primitive is a value the engine calculates from
  the seed: the seven color families with their scale stops and five stamp tokens, the
  neutral's two poles, the two link trios, the two seed absolutes. Everything static or
  aliased leaves every output: the elevation planes, the shadows, the scrim, the disabled
  opacity, the opacity ladder, the alpha ladders with `transparent` and `ink`, the absolute
  black and white rows, and the interaction register (`interactionCss`,
  `interactionTokens` and their exports). `tokens/semantic.css` leaves the package. The
  record of that layer, with its values, its claim and its audit, is in
  `research/semantic-layer/`; the demo keeps its own descendant of the stylesheet. No
  surviving value moves.
- **One grammar.** Every row has one path (`brand/stamp/fill`, `neutral/paper-0`,
  `link/default/enabled`, `absolute/brand`); joined with hyphens it is the CSS custom
  property, joined with slashes the Figma variable and the DTCG token path. Eight CSS
  names rename in place, values unchanged:

  | before | after |
  |---|---|
  | `--paper-0` | `--neutral-paper-0` |
  | `--pen-100` | `--neutral-pen-100` |
  | `--link` | `--link-default-enabled` |
  | `--link-hover` | `--link-default-hover` |
  | `--link-pressed` | `--link-default-pressed` |
  | `--link-inverse` | `--link-inverse-enabled` |
  | `--brand-identity` | `--absolute-brand` |
  | `--brand-alt-identity` | `--absolute-brand-alt` |

  The Figma tree follows: the alt group is `brand-alt`, the signals are keyed by role, the
  link trios sit under `link/default` and `link/inverse` with `enabled`, `hover`, `pressed`
  leaves, the seeds under `absolute/`, and the `system` group is gone. `stamp-edge` is a
  literal in every output (the pole at the family's rung, or `transparent`) instead of a
  reference to an alpha row, and `stamp/on` is the pole itself. The tree's `components`
  are the 8-bit channels over 255, the same color as `hex`.
- **The DTCG documents.** `tokensToDtcg(tokens)` returns one Design Tokens Format Module
  2025.10 document per mode on identical paths: every primitive once, `$type` color, an
  sRGB `$value` (or an alias where the CSS writes a reference) and a `$description`
  written for agents: the requirement, the conformance level with the ground it holds
  against, what clears a ground, a usage line on the stamp tokens, the links and the
  seeds, and the theming. The Figma variable descriptions are unchanged; the grounds render
  from a scope table the guarantee audit asserts it measures. New exports: `tokensToDtcg`,
  `tokenPaths`, `tokenPathOf`, `descriptionPathOf`, `describeDocument`, `GUARANTEE_SCOPE`,
  `BAND_STOPS`, the path helpers (`familyPath`, `linkPath`, `absolutePath`,
  `cssVarName`, `figmaPathOf`) and their types. `npm run tokens:emit -- <hex> [slug]`
  writes both files; `npm run audit:dtcg` holds the documents against the CSS emission and
  the Figma tree over the fixture roster in every posture plus an agnostic sweep. The
  format is in `docs/schema.md`.
- **Removed from the API.** The experimental requirement-token export (`emitDtcgRamp`,
  `resolveDtcgRamp`, `parseToken`, `EXT_KEY`, `RESOLVER_ID` and their types), whose values
  were not the shipped values, moves to `research/reqtoken/`. Also gone: `systemCss`,
  `SYSTEM_LEAF`, `SURFACE_PLANE_LAW`, `OPACITY_RUNGS`, `INTERACTION_RUNGS`,
  `SHADOW_ALPHAS`, `SCRIM_ALPHA`, `DISABLED_OPACITY`, `opacityLeafName`,
  `opacityVarName`, `opacityTokenPath`, `FigmaNumberToken`.
- **The extended plugin** writes the base zone only (no `utility/` shelf, no alpha or
  absolute black and white rows, no planes) and every value as a raw write. An existing
  file keeps the removed rows as orphans; a live row that aliased one of them takes its
  raw value where the alias resolves to exactly what the payload writes now. A brand
  override now exists exactly where the 8-bit hex differs from the base. The community
  plugin reads the new tree at its seam and is otherwise unchanged.
- `README.md` is the complete consumer documentation on its own; `docs/agents.md`,
  `docs/schema.md`, `docs/scale.md` and `docs/architecture.md` follow the cut.

## 0.6.1 — 2026-09-21

- The subtle tier of the interaction register climbs one rung at every state: it rests at
  `012` and reaches `032` when selected, where it rested at `008` and reached `024`. The
  hint tier is unchanged. Only the eight `subtle-bg-*` rows per family move; every other
  emitted value is identical. A patch: resolved values only.

## 0.6.0 — 2026-09-11

- The structured emit: `themeTokens` returns every emitted name with its light and dark
  value, `var()` references resolved and mode-invariant names carried into both modes. It
  reads the CSS emission back, so the two cannot disagree; the CSS output is unchanged.
- The interaction register: `interactionCss` and `interactionTokens` emit the state layer
  as named rows per family, the `solid`, `subtle` and `hint` tiers plus the `fg` rows, on
  nine families including the pole families `neutral-strong` and `neutral-inverse`. The
  translucent rows are `highlighter-26` at an opacity rung, one rung per state, as
  `rgba()` literals per mode. New names only; no existing value moves. A minor when it
  ships.
- `audit:tokens` holds the reader's completeness and the register's body-text bar across
  the fixture roster.
- `docs/agents.md` no longer states a border width for `stamp-edge`; none was ever ruled.

## 0.5.1 — 2026-09-08

- The opacity ladder's Figma value is the percent, Figma's opacity unit: `system/opacity/064`
  holds `64` (0.5.0 emitted `0.64`, which Figma reads as under one percent). The CSS
  `--opacity-NNN` fractions are unchanged. Both plugins write the percent and heal a row a
  0.5.0 apply left at the fraction; a value a designer changed stays.

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
  the community plugin. The CSS carries the fraction (`0.16`); the Figma value is the
  percent (`16`), Figma's opacity unit. The same in both modes. New exports: `OPACITY_RUNGS`,
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
