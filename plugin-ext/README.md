# OKChroma Extended (plugin-ext)

The shipped Figma front-end. It runs the engine inside Figma and writes the resolved system
into a file as extended variable collections, a Figma Enterprise feature: one base
collection with light and dark modes, plus one extension per brand that overrides only what
differs. On any other plan the plugin detects the missing API and reports it instead of
writing.

It is not listed on Figma Community. Install it by download from the site's install page
(built fresh from `main` on every push) or build it from source; see Install below.

## The two axes

- **Brand = which extension is applied.** One extension collection per brand, so the
  frame-side collection picker stays a flat list (`theme, acme, …`).
- **Mode = the base's columns:** `light` and `dark`, solved in the WCAG lane. Every apply
  writes both; there is no profile picker. Files written when the columns were
  `wcag · wcag-dark · apca · apca-dark` are adopted in place: the first pair is renamed to
  `light` and `dark` (the mode ids survive, so bindings do), and the two APCA columns are
  left untouched and reported; the plugin never writes or recreates them.

## What it writes

Every path carries an ownership zone. `base/` is engine-owned: a hand edit there is
deliberately not rebuilt by a re-apply. `utility/` is team-touchable: rows the engine never
reads back, written last so they shelve together.

- `base/neutral/*`: `paper-0` to `pen-100` in ladder order, the stamp rows.
- `base/brand/*` and, when the file carries a secondary, `base/brand-alt/*`: the eleven
  stops and `stamp/fill`, `stamp/fill-hover`, `stamp/fill-pressed`, `stamp/edge`,
  `stamp/on`. The brand's name lives on the extension; the paths stay generic, so a designer
  binds `base/brand/paper-1` once and re-themes by switching the extension.
- `base/critical/*`, `base/warning/*`, `base/positive/*`, `base/info/*`: the four signals
  under their role names, canonical in the base; a brand's collision-shifted signal becomes
  that brand's override.
- `base/link/default/*` and `base/link/inverse/*`, `base/alpha/*` (transparent, ink, the
  `away-from-bg` rungs), `base/absolute/*` (black, white, brand, brand-alt).
- `utility/surface/dim|low|mid|high` (created by the plugin, aliased onto the neutral's
  papers per the surface plane law), `utility/shadow-04|08|12`, `utility/abs-black-060`.

Values in the base are the documented default seed (`payload.BASE_SEED_HEX`, `#E93D82`),
recommended mode, the derived brand-alt, the default neutral, canonical signals. The base is
populated once; later applies add missing rows, restamp descriptions and scopes, and refresh
a base row only when its value exactly matches a retired canonical value the engine itself
once wrote. Descriptions come from `src/engine/tokenDescriptions.ts`.

With the "Hide primitive scale from pickers" checkbox on (the default), the state-carrying
roles (`stamp/` in every family, the link rows, the surface planes) are pickable in every
Figma color picker and every other row is hidden. Off exposes everything. The posture is
file-wide, stored on the base collection, and re-stamped on every apply.

## Per brand

Each apply builds the brand's full column set from the engine and writes, into the brand's
extension, only the rows whose value differs from the base: the primary ramp and its stamp,
the brand-tinted neutral, a real secondary (or a brand mirror when the file has a secondary
group and this brand does not bring one), the link rows, and signals only where a collision
shifted them. Everything else inherits, and Figma highlights the overrides per mode.

The payload always carries a brand-alt: the brand's own when it brings one, otherwise the
one derived from its primary. Whether brand-alt rows are written is the file's posture: once
any brand in the file has a secondary, the base carries the group and every brand writes
one (derived when absent), so no brand is left blank or inherits the wrong hue.

Every apply stamps its input recipe (brand, hex, mode, secondary, neutral source and level,
link, escape, edge) on the extension. That powers "Re-apply all brands" and the
collection-wide check when a secondary is first added.

## Controls

- **Edit applied theme**: pick an existing brand to load its stored recipe.
- **Brand name**, **primary color** with its mode (recommended or exact, or one of the six
  lightness anchors).
- **Add brand-alt**: a secondary hex with its style (default, outline, exact).
- **Neutral**: the tint source (the primary, the secondary, or a custom hex) and strength.
- **Advanced**: a custom link seed, the stamp escape (offered when the primary sits in the
  red signal's range), the stamp edge opt-out.
- **Apply to Figma**; **Hide primitive scale from pickers**.
- **Re-apply all brands**: rebuilds every extension from its stored recipe (engine updates,
  migrations).
- **Rebuild base theme**: re-seeds every base row from the current engine at a chosen seed
  (overwrites base-row edits), then re-applies every brand against the new base.

## Migrating older files

A variable's identity is its canonical path in plugin data; the display name is the user's.
Renames migrate in place, so bindings survive: `RENAMED_LEAVES` and `RENAMED_GROUPS` in
`code.ts` recover every earlier spelling (the two pre-zone register eras, the pre-rename
band words, the old signal identities), one hop each, straight to the final name. A display name that spells any engine vintage is treated as engine-owned and follows
the rename; only names outside the engine's grammar are the user's. A row the current
payload no longer emits is reported as an orphan and never deleted.

## Install

1. Build: `npm run plugin-ext:build` (repo root), or download `okchroma-extended.zip` from
   the site's `install.html`.
2. Figma desktop → **Plugins → Development → Import plugin from manifest…** → pick
   `plugin-ext/manifest.json` (or the unzipped folder's). The manifest carries a
   Figma-minted `id`; private plugin data (the base and extension tags) needs it, so keep it.
3. Run in a design file on an Enterprise org.

The manifest is the only install path; the plugin never touches the network and stores
nothing outside the file.

## Gates

- `npm run typecheck:ext`: plugin-ext against the extended-API shim (`figma-env.d.ts`).
- `npm run plugin-ext:build`: both threads bundle and the UI inlines.
- `npm run audit:ext`: the per-brand override set per column, against a blessed snapshot.
- `npm run figma:verify` and the engine audits: unchanged by this plugin; it touches no
  engine code.
