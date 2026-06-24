# Handoff — plugin signal grouping mismatch (`mode` vs `theme`)

Branch: `scope/token-rename-v2`. This is an **independent follow-up**, not part of
the token rename / Stage 3 demo work (all of which is done + committed — see
"State going in" below).

## The bug (owner-confirmed 2026-06-23)

The Figma plugin writes two variable collections:

- **`mode`** collection (the raw **primitive** layer; modes = `Light`/`Dark`)
- **`theme`** collection (semantic **aliases**; modes = brand names)

The **signal/alert ramps are grouped inconsistently** between the two:

| signal | `mode` / primitive path (`signalPrim`) | `theme` group (`themeName`) |
|---|---|---|
| error   | `system/alert/high/<variant>` | `red` |
| warning | `system/alert/med/<variant>`  | `yellow` |
| success | `system/positive/<variant>`   | `green` |
| info    | `system/info/<variant>`       | `info-color` |

In **`mode`**, alert gets its own group and yellow/red are nested under it
(`alert/high/base`, `alert/med/…`). In **`theme`** they're flat, color-named
(`red`, `yellow`, …).

**`theme` is correct (flat color-named, "per the docs"); `mode` is wrong.** The
owner was enforcing the flat color grouping at some point, but it **only landed
in `themeName`, never in `signalPrim`** — so the primitive layer kept the old
`alert/*` taxonomy.

⚠️ **History caveat:** the plugin **travelled in from the old repo** — "it hasn't
always been like this." Local `git blame`/`log` in THIS repo won't show where the
divergence came from (it arrived as-is in the initial import `6e98883`). Don't
waste time on local archaeology; treat the current state as the source of truth.

## Exactly where it lives

`plugin/ui.ts`, lines ~127–137 — both maps are right next to each other:

```ts
// Where each engine signal lands in the primitive taxonomy.   ← the WRONG one
const signalPrim: Record<string, (v: string) => string> = {
  error: v => `system/alert/high/${v}`,
  warning: v => `system/alert/med/${v}`,
  success: v => `system/positive/${v}`,
  info: v => `system/info/${v}`,
}
// Theme-collection group name for each signal (color-named, per the docs).  ← CORRECT
const themeName: Record<string, string> = {
  error: 'red', warning: 'yellow', success: 'green', info: 'info-color',
}
```

These feed the `shared` array (lines ~146–154): `prim: signalPrim[s.name](s.variant)`
sets the **`mode`** grouping; `theme: themeName[s.name]` sets the **`theme`**
grouping. `plugin/code.ts` consumes them — `writeRaw(\`${grp.prim}/${t.path}\`)`
into the `mode` collection, `aliasInto(\`${grp.theme}/${t.path}\`, …)` into `theme`.

## The fix (the task)

Make `signalPrim` produce the **same flat, color-named grouping** as `themeName`,
so the `mode` collection's signal groups match `theme`. Decide the exact
primitive convention with the owner — likely `system/<colorName>/<variant>`:

```ts
const signalPrim = {
  error:   v => `system/red/${v}`,
  warning: v => `system/yellow/${v}`,
  success: v => `system/green/${v}`,
  info:    v => `system/info-color/${v}`,
}
```

Open questions to confirm before coding:
- Keep the `system/` prefix on primitives (neutral uses `system/neutral/<family>`),
  or drop it so primitive groups read exactly like `theme` (`red`, `yellow`)?
- `info-color` is an odd group name (chosen to avoid colliding with a Figma
  reserved word / the `info` signal name?) — confirm it's intentional on both
  sides, or rename both consistently.
- `<variant>` is the yield-variant suffix (`base`, or e.g. `lemon` when warning
  shifts) — keep it as the leaf under the color group.

## Gates / things to check after the change

- Only `plugin/ui.ts` defines `signalPrim` (plus the built `plugin/dist/*` which
  regenerate). No engine/demo/test references the `system/alert/*` paths —
  `figma-verify` runs against `themeToFigma` output, not these plugin paths — but
  re-grep `system/alert`, `system/positive`, `system/info` to be sure.
- `npm run plugin:build`, then **verify in Figma**: the `mode` collection's signal
  groups now read the same as `theme` (flat color names), aliases still resolve,
  repeat-apply still idempotent (detection anchors on `brand/primary/paper-1` /
  `brand/secondary/paper-1` + on-cta/on-highlight — unaffected by this change).
- **Do NOT touch the `theme` side** (`themeName`) — it's correct.
- Changing primitive paths means a re-apply creates variables at the NEW paths
  (old `system/alert/*` vars won't auto-migrate). Plugin is **not deployed**, so
  this only affects fresh applies — no migration needed, but call it out.

## State going in (all committed on `scope/token-rename-v2`)

- `4aa26ba` rename (pull fills out of scale: cta-1/2, highlight-1/2)
- `e442322` Stage 2.5 (green success → white, light only)
- `35f7311` Stage 3 scaffolding (hide gallery/docs, re-point demo to new names)
- `508c22d` Stage 3 TokenCards + compact signal strips (the demo display)

Working tree clean. The plugin's token *names* already track the rename (it
processes paths dynamically; detection literals are `paper-1` + `on-cta`/
`on-highlight`). This grouping bug is orthogonal to the rename.
