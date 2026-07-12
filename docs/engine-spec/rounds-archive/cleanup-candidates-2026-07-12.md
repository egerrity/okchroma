# Cleanup candidates — 2026-07-12 fan-out (12-agent classify + adversarial save pass)

**OWNER VERDICT (2026-07-12): "do everything" — Tier A + Tier B removed, c12-session moved to
docs/engine-spec/c12-archive/ (paths in this doc are as-of-decision), sbx/ deleted, dist/ cleared,
4 clean worktrees pruned. Kept: owner marks, decision records, LIVE gates, the 2 DIRTY worktrees
(okchroma-sandbox = requirements-v2 research, p3-master-gamut = P3 calibration work), all branches
(deletes still on owner naming).**

136 tracked files under scripts/ classified: 23 LIVE (gates/baselines/shared modules), 112 RECORD, 1 UNSURE, 0 orphans.
Nothing is unreferenced junk — past sessions deliberately committed session artifacts as records. The removal question is therefore a POLICY cut: git history retains every byte, so removing from HEAD loses only in-tree browsability.

## Tier A — machine-regenerable data dumps + superseded intermediates (17 files, 1021 KB)
Probe/sim outputs whose conclusions live in the kept .md records; owner-marks JSONs are NOT here (those stay — irreplaceable calibration data). Lowest risk.

- `scripts/c12-session/coolreddark-sweep.json` (630 KB) — coolRedDark research sweep data deliberately collected as record (2faa676), cited by coolreddark-research.md.
- `scripts/c12-session/proposal-sim.json` (135 KB) — Sim dataset referenced by HANDOFF.md, panel-findings.md, proposal-draft.md records and read by exhibit scripts.
- `scripts/c12-session/proposal-sim2.json` (66 KB) — Proposal sim data in HANDOFF.md record roster; read by exhibit/compare scripts and proposal-draft.md
- `scripts/c12-session/working-tree-v5-gate.patch` (48 KB) — v5 working-tree snapshot committed in session-records commit a6dff4a (v5 superseded by v6+v8; otherwise unreferenced — borderline JUNK but commit intent is archival)
- `scripts/c12-session/vivid-delivery-probe.json` (25 KB) — Committed in 'v8 session records' 5778f93 and cited by vivid-delivery-note.md
- `scripts/c12-session/vivid-split-probe.json` (19 KB) — Committed in 'v8 session records' 5778f93 (deliberate curation); only its generator references it — weakest record in the set
- `scripts/c12-session/vivid-orange-probe.json` (16 KB) — Instrument output written by c12-vivid-orange.ts, committed in records commit 5778f93
- `scripts/c12-session/truered-dir-probe.json` (14 KB) — F3 true-red probe data written by c12-truered-direction.ts, committed as record in 1ee4dd0 ('marks + probes') backing the pushed f7245df fix
- `scripts/c12-session/joint-solve-probe.json` (12 KB) — Probe backing the settled joint-solve model doc; committed in v8 session-records commit 5778f93
- `scripts/c12-session/dark-carry-probe.json` (12 KB) — Probe data deliberately collected in records commit 1ee4dd0 ('marks + probes'); paired with c12-dark-carry.ts
- `scripts/c12-session/deadzone.json` (11 KB) — Ground-truth dead-zone map cited by owner-corpus.json calibration record; written by c12-groundtruth.ts.
- `scripts/c12-session/dark-solve-probe.json` (10 KB) — Probe output committed with the F1+F2 dark-solve landing (858053e) as part of the session records; c12-dark-solve.ts is its writer.
- `scripts/c12-session/vivid-rule-probe.json` (9 KB) — Owner-blessed instrument data read at runtime by the c12-split-wired-check.ts mirror validation; committed in the 5778f93 records commit.
- `scripts/c12-session/error-overlap-probe.json` (7 KB) — Instrument F output, deliberately committed in 5778f93 'v8 session records — her verdict rounds, instruments, the settled model'
- `scripts/c12-session/confused-pairs-probe.json` (5 KB) — Instrument output committed 5778f93 'docs(c12): v8 session records'; generator c12-confused-pairs.ts is itself named in joint-solve-model.md (borderline JUNK — the calibration record proper = the confused-pairs-*checks.json files).
- `scripts/c12-session/dark-signal-probe.json` (3 KB) — Probe JSON written by c12-dark-signal.ts, collected in session-records commits 1ee4dd0/2faa676
- `scripts/c12-session/vivid-delivery-checks.json` (0 KB) — Marks destination named by vivid-delivery-note.md record; marks object is EMPTY (no verdicts captured) — 49 bytes, borderline JUNK but a record doc points at it.

## Tier B — struck/superseded exhibit generators with @ts-nocheck HISTORICAL RECORD banners (6 files, 79 KB)
Not runnable against current src (import deleted symbols). Their do-not-resurrect knowledge is duplicated in CATALOG/memory banners; medium risk — the banner text itself is the last in-tree trace.

- `scripts/secondary-sweep.ts` (30 KB) — Explicit '@ts-nocheck — HISTORICAL RECORD' banner (2026-07-12 strike); imports deleted subtleCtaLFor, not runnable
- `scripts/c12-session/coolreddark-sweep.ts` (15 KB) — Explicit '@ts-nocheck — HISTORICAL RECORD' banner; collected 2026-07-11 as coolRedDark research record, do-not-run.
- `scripts/c12-session/c12-repel-only.ts` (13 KB) — @ts-nocheck SESSION ARCHIVE banner — kept verbatim, calls deleted pre-v5 repelCtaL signature, do-not-run
- `scripts/c12-session/c12-dark-carry.ts` (9 KB) — Explicit '⛔ SUPERSEDED — historical record only' banner (dead loudnessFloor(H) calibration page, do-not-resurrect)
- `scripts/p3-d3-exhibit.ts` (6 KB) — @ts-nocheck HISTORICAL RECORD banner — imports subtleCtaLFor deleted in the 2026-07-12 offering strike, not runnable
- `scripts/secondary-dark-depth.ts` (6 KB) — @ts-nocheck HISTORICAL RECORD banner — imports struck muted/vibrant curves + subtleCtaLFor, not runnable; dark-depth ladder that calibrated SUBTLE_DARK_EXTRA_SINK

## Tier C — structural option (not deletion)
- `scripts/c12-session/` (55 files, ~1.6 MB): the whole directory is a deliberate session archive. Option: move to `docs/engine-spec/c12-archive/` so scripts/ holds only live instruments; references in docs/src comments would need a path sweep.

## UNSURE (1)
- `scripts/full-dump.ts` — Runnable byte-parity dump utility kept current through delta-model + renumber commits, but zero references and not gate-wired — reusable tooling vs stale one-off is a judgment call

## Untracked strays (local disk, not in the repo)
- `sbx/` (2.1 MB) — abandoned sandbox, only a July-1 dist/; nothing references it. Delete candidate.
- `dist/` (7.9 MB, 109 files) — gitignored build output full of one-off compiled probes; safe to clear any time, gates rebuild what they need.
- `render/` (3.7 MB, 44 files) — gitignored exhibit HTMLs (the eyeball record surface); regenerable from their committed scripts.
- 6 stray git worktrees (okchroma-reqtoken/-sandbox/-sigcta/-track-a + 2 under .claude/worktrees) parked on old branches; ~19 local branches — several deliberately parked (audit/loudcta, propose/gold-flip); branch deletes stay blocked on owner naming (standing rule).

## Kept (not candidates)
- 23 LIVE: the 13 package.json gates, their runtime baselines/snapshots (divergence/dark/highlight/smoothness/ext), shared `p3-math.ts`, `reqtoken-render.ts` (standing eye-check page).
- Owner-marks JSONs (error-range-checks, joint-solve-v*-checks, confused-pairs*, direction/delivery/ladder/l055/vivid-orange/vivid-split/dark-signal/dark-carry/truered-dir marks, owner-corpus) — her calibration data, several cited in src comments.
- Decision .md records (HANDOFFs, joint-solve-model, panel-findings, research reports, bug-hunt + fix plan) and CATALOG/src-cited exhibit generators.
