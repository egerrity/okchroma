# OKChroma Extended — plugin v2 (extended collections)

The second plugin (owner decision 2026-07-07). The published OKChroma plugin
(`plugin/`) stays on Community untouched; this one is **unlisted for now** — installed
by download, not marked "internal" anywhere (it may become a paid offering later).
It requires a **Figma Enterprise org** — extended collections are Enterprise-plan-gated.
On any other plan the plugin detects the missing API and reports it instead of writing.

## The two axes

- **Brand = which extension is applied.** One `ExtendedVariableCollection` per brand —
  the frame-side collection picker stays a flat, clean list (`theme, kirby, …`; the
  picker flattens hierarchy, so nothing relies on nesting).
- **Solve = the base's mode columns:** `wcag · wcag-dark · apca · apca-dark`.
  A contrast profile is a re-solve of the same tokens — mode-shaped, like light/dark —
  so it lives on the mode axis. **WCAG is this plugin's default** (leads, unmarked);
  apca is the marked extra. Defaults are silent, departures are named — the grammar
  extends to future solve conditions (`wcag-high-contrast`, `wcag-dark-high-contrast`).
  Every apply writes **all four columns** — there is no profile picker and no fork;
  the legal check is a frame's native Mode switch.

## What it writes

- **One base collection `theme`** — the full semantic token set, flat names,
  `ALL_SCOPES` (the base is what users bind — no hidden seed collection):
  - `brand-primary/*`, `brand-secondary/*` (only if the file uses a secondary) — the
    operative `brand-` category is in the token name; the brand's NAME lives on the
    extension, so a designer reads `kirby → brand-primary/paper-1`.
  - `neutral/*` (paper-0 … ink-13 in ladder order), `red/* yellow/* green/* info-color/*`,
    `system/*` (abs poles, transparent, scrim, and the scheme-divergent
    paper-raised/paper-sunken aliases — base-only, never overridden).
  - Values = the documented default seed: okchroma pink `#E93D82`, recommended mode,
    derived-pastel secondary, default neutral, CANONICAL signal ramps — solved per
    column. The base is populated **once**; later applies only add missing variables
    and restamp descriptions.
- **One extension per brand**, overriding **only what differs** from the base in each
  column: the primary ramp + identity, the brand-tinted neutral, a real secondary (or a
  brand-primary mirror when the file has a secondary group and this brand doesn't), and
  signals only where collision-shifted — per column, so a profile-dependent collision
  shift lands only in its own lane. Everything else inherits — Figma highlights
  overrides blue per mode, so the diff is visible and honest.

## Secondary posture (owner 2026-07-07)

Secondary is opt-in and defaults **off**. A base created without it has no
`brand-secondary/*` group. Later applying a brand WITH a secondary confirms, then adds
the group to the base (seeded from the default derived pastel) and writes that brand's
overrides — **existing brands inherit the base default until individually re-applied**
(no auto-backfill; smarter check logic is a follow-up iteration).

## Install (import from manifest — unlisted)

1. Build: `npm run plugin-ext:build` (repo root).
2. Figma desktop → **Plugins → Development → Import plugin from manifest…** →
   pick `plugin-ext/manifest.json` — or download `okchroma-extended.zip` from the demo site’s /install.html (built fresh from main by the Pages workflow).
   The manifest carries no `id` on purpose (development import doesn't need one; an id
   only exists once published, which this plugin isn’t yet). If your Figma build insists
   on an id, create a throwaway via **New plugin…** and copy its generated id in.
3. Run in a design file on an **Enterprise** org.

## First Enterprise run — smoke test first

The plan's §2 verify-first list is executable: open the plugin → **Run Enterprise smoke
test** (the small link under Apply). It probes the API on scratch `okc-smoke-*`
collections (alias-as-override, extend gate, parentModeId mapping, override
set/read/remove, nesting, discovery, pluginData) and removes them afterwards.
The owner's 2026-07-07 hand-built mock already confirmed in the UI: chains work,
overrides ring blue per mode, inheritance flows — the smoke run confirms the same
through the plugin API. §2.4 — the mode/collection picker UX when applying to a frame —
is confirmed: the collection picker flattens hierarchy (which is why v2 uses one flat
extension per brand), and the Mode dropdown carries the solve columns.

Expect one round of fixes after the first real run: everything here typechecks against
the documented API (`figma-env.d.ts`) but has never executed on an Enterprise seat.

## Gates

- `npm run typecheck:ext` — plugin-ext against the extended-API shim
- `npm run plugin-ext:build` — both threads bundle + UI inlines
- `npm run audit:ext` — per-brand override-SET snapshot across all four columns
- `npm run figma:verify` + engine audits — unchanged; v2 touches no engine code
