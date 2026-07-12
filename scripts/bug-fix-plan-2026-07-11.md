# Bug-fix plan — 2026-07-11 hunt (11 confirmed; mechanisms + verification in bug-hunt-2026-07-11.md)

Owner directive: plan all in detail first, then execute in the background in the best order.
Execution split: **three background worktree agents** on file-disjoint clusters (A plugins,
B demo, C signalsCss) + an **inline cluster** (D gates, E resolver) that needs judgment calls
(snapshot re-blesses) or touches files holding the uncommitted secondary round. Each fix =
its own commit in its worktree; I review + merge each before it lands; no pushes without the
owner's word.

---

## Cluster A — plugins (background worktree; files: plugin/ui.ts, plugin-ext/ui.ts, plugin/code.ts, plugin-ext/code.ts)

### A1 [MED] chip-tone stop-12 throw (plugin/ui.ts:239,:249 + plugin-ext/ui.ts:248,:258)
- **Fix:** `at(..., 12)` → `at(..., 11)` (the post-renumber ink tip); the outline chip's
  `at(sl, 11)` → `at(sl, 10)` (pre-renumber ink-11 = today's ink-10; matches
  demo/CustomTheme.tsx:209 `--secondary-ink-10` and renderMatrix's own outline cells).
- **Verify:** grep both ui.ts for any remaining `, 12)` stop lookups; typecheck both plugins
  (`npm run typecheck` + `typecheck:ext`); `plugin:build` + `plugin-ext:build`; assert
  updatePreview no longer throws by exercising the tone block in a node harness (stub the
  template DOM or extract `at`/`hxs` into a pure probe) — a real Figma run stays the owner's
  eye-check, noted in the commit.
- **Risk:** none to engine; UI-only. No blesses.

### A2 [HIGH] red-variant note breaks v1 dedup key (plugin/ui.ts:300)
- **Fix:** the v1 shared-primitive dedup key must key on the RESOLVED per-brand red variant,
  not the note string whose format C12 changed. Recompute the key from the variant's cta hex
  (or brand slug + variant hex), never from note text. Mirror in plugin-ext if the same
  keying exists (finder says v1 only — agent must confirm by grep).
- **Verify:** harness: two colliding brands with different red variants → distinct primitives;
  two brands sharing canonical red → shared primitive (the dedup's actual contract). Add the
  case to the plugin build check if a test scaffold exists; else a probe script committed
  beside the fix.
- **Risk:** medium (Figma variable identity changes for colliding brands). Note for owner:
  existing files re-sync may create new primitives — flag in commit message.

### A3 [MED] staleInk migration anchor hijack (plugin/code.ts:370, mirror in plugin-ext)
- **Fix:** the legacy `system/ink-13`→`neutral/ink-12` migration must not fire while a
  scale `ink-12`… name is still occupied — order the rename map so the anchor migration runs
  only after the scale renames (ascending RENAMED_LEAVES discipline, documented at the table)
  or guard on the target name being free.
- **Verify:** harness the migration map ordering (unit-style probe over a fake variable set
  with a legacy file's names); confirm ascending-order invariant note stays true.
- **Risk:** migration-path only; no engine.

## Cluster B — demo (background worktree; files: demo/*.tsx)

### B1 [MED] gallery Exact toggle drops the contrast lane (demo/App.tsx:123)
- **Fix:** thread the gallery's active profile into the exact recompute:
  `resolveBrand(hex, name, { exact: true, contrastProfile })` for primary AND accent (the
  gallery is shipped-apca; today it silently recomputes wcag).
- **Verify:** in-browser: gallery, APCA, toggle exact on a near-red brand → cta values match
  `resolveBrand({exact:true, contrastProfile:'apca'})` probe; signals stay the apca set.

### B2 [MED] gallery dead tokens (demo/shared.tsx:406 ScaleStrip etc.)
- **Fix:** rename to the post-renumber/post-rename token set (ink-10/11/12, cta-border, no
  phantom 'accent' prefix, named neutrals). Sweep shared.tsx gallery components for every
  var() that no longer exists in dist/brands.css; fix to current names.
- **Verify:** runtime probe in the demo: walk rendered gallery nodes, assert no computed
  `var(--…)` resolves empty (getComputedStyle returns '' for unset custom props).

### B3 [MED] focus-visible ring dead in app-chrome scope (demo/shared.tsx:111)
- **Fix:** the ring var referenced in the chrome scope isn't defined there — alias it from
  the neutral block (or define `--ring` at :root chrome scope from neutral highlight-8, the
  ring's documented source).
- **Verify:** in-browser: tab to footer controls, ring visible both modes.

## Cluster C — emitters (background worktree; file: src/engine/cssRender.ts)

### C1 [HIGH] signalsCss dark loses to later P3 light block
- **Fix (match the outline-fix pattern):** make the P3 blocks' selectors mirror the base
  blocks' specificity relationship. Cleanest: emit signal dark base AND its P3 dark under
  `:root[data-theme="dark"]` (0,1,1) so dark always beats the 0,1,0 P3 light block — OR
  reorder so the P3 light block precedes the dark base block. Prefer the specificity fix
  (`:root[data-theme="dark"]`) — order-independent, and brandCss already relies on compound
  selectors for the same guarantee. Must keep light-mode resolution identical.
- **Verify:** regenerate signalsCss both lanes; programmatic cascade sim: for every var,
  winner under `<html data-theme="dark">` must equal the dark base (or P3 dark where
  emitted); the 11 known leakers flip to dark values; light-mode winners unchanged. Rebuild
  dist/, diff dist/signals.css for the expected selector change only.
- **Risk:** shipped CSS selector change — Pages consumers get the fix on next push.
- **No bless** (CSS emission only; snapshot gates don't cover emitted CSS).

## Cluster D — gates (INLINE; files: scripts/dark-audit.ts, scripts/highlight-audit.ts, scripts/divergence-audit.ts)
Held inline because each widening will surface real standing drift that needs judgment +
re-bless against the CURRENT approved state, and must not entangle the background agents.

### D1 [HIGH] dark-audit E uses redGateDist (P1-blind)
- **Fix:** E's dark assertion → p2Diff ≥ P2_D_UP vs the effective red dark cta (exactly the
  collision-sweep migration pattern from 858053e).
- **Verify:** run audit; expect 0 (the dark solve ships the release); if >0, investigate
  before landing — E sweeps the roster incl secondaries.

### D2 [HIGH] highlight snapshot compares L only
- **Fix:** drift compare = OKLab ΔE over (L,C,H) per token (reuse stopDeltaE), tolerance
  aligned with dark-audit's 0.015.
- **Verify+bless:** run → any surfaced C/H drift triaged: legit movers from today's rounds
  re-blessed once with the widened gate; anything else investigated first.

### D3 [MED] divergence snapshot never compares H
- **Fix:** same ΔE widening; same triage-then-bless discipline.

## Cluster E — resolver (INLINE; file: src/engine/resolve.ts — holds the uncommitted secondary round)

### E1 [MED] redRepel hardcodes dark:false
- **Fix:** `redRepel = (light || dark) ? { light: !!ctaRepelled.light, dark: !!ctaRepelled.dark } : null`.
- **Verify:** the finder's probe (`#c20017` apca → {light:true,dark:true}; dark-only sweep
  seeds → non-null {light:false,dark:true}); consumers render: cssRender note appears for
  dark-only movers; demo chip string can now show 'dark'.
- **Lands with or right after the secondary-round commit** (same file).

## Order + rationale
1. **A, B, C launch now in parallel** (background, worktrees, file-disjoint, no blesses).
2. **D after the secondary round commits** (its movers must be IN the snapshots before the
   widened gates judge drift, or every secondary scale double-flags).
3. **E rides the secondary commit window** (same file).

Merged sequence on the main tree: secondary round → E1 → D1–D3 (+ one honest re-bless) →
merge A/B/C worktree commits after review. Every commit gate-checked; push only on owner word.
