/// <reference path="./figma-env.d.ts" />

// Plugin v2 — extended collections (Enterprise-only). ONE base collection (`theme`)
// carries the whole semantic set; its MODE COLUMNS are the two schemes, `light` and
// `dark`, solved in the WCAG lane (the APCA pair is retired — see payload.ts; a file
// that still carries those modes keeps them, see staleApcaCols). Each brand is ONE
// ExtendedVariableCollection of it, overriding only what differs from the base, across
// every column ("always both, no picker"). Brand axis = which extension is applied;
// solve axis = the mode. No alias maps, no dedup keys, no profile forks, no sister
// extensions.
//
// THE ZONES: every path payload.ts emits carries an OWNERSHIP-ZONE prefix
// (payload.registerPath) — base/ for the engine-owned rows (base/<fam>/paper-1 …,
// base/<fam>/stamp/*, base/link/*, base/absolute/*, base/alpha/*) and utility/ for the
// team-touchable shelf (utility/shadow-*, utility/opacity/*). The elevation planes are
// code.ts's own rows (payload never emits them), created at utility/surface/*.
// RENAMED_GROUPS' strips (below) recover every earlier spelling — the register-less
// flat vintages, the primitive/ register and the semantic/ era — through
// legacyCandidates; no value import of registerPath here (see the
// zero-engine-in-the-bundle note on the describeToken import).

import type { FlatTok, TokenColumns, Column } from './payload'
import { LEGACY_COLUMN_NAME, RETIRED_COLUMN_NAMES } from './payload'
import { STAMP_LEAF, EXT_NON_OVERRIDABLE, EXT_OVERRIDABLE_SYSTEM } from '../src/engine/tokenNames'
// zero-import text module — safe here, drags nothing of the engine into the sandbox bundle
import { describeToken } from '../src/engine/tokenDescriptions'

figma.showUI(__html__, { width: 720, height: 640, title: 'OKChroma Extended' })

// Base name is the lookup contract; tags make it rename-proof (v1's idiom).
const BASE_NAME = 'theme'
const OWNER_KEY = 'okchroma-ext'          // 'base' | 'brand'
const BRAND_KEY = 'okchroma-ext-brand'
// Each apply stamps its input recipe here (JSON) — what powers the automatic
// collection-wide secondary check and the manual "Re-apply all brands" action.
const SPEC_KEY = 'okchroma-ext-spec'
// Variable identity: the canonical path lives in plugin data — the NAME is display,
// free for the user to edit in the variables panel; every lookup resolves the stamp
// first (the collections' rename-proof idiom, applied to variables).
const PATH_KEY = 'okchroma-ext-path'
// Generation stamp (mirror of plugin/code.ts). The instruments rename's inverted digits
// made two pre-Stage-B INDEX spellings live names again: paper-1 (the same stop in both
// vintages) and paper-3 (index 3 = the 0.95 stop in the index vintage; the 0.97 stop
// here). A row is ours only if it carries the current generation — see ensure().
const GEN_KEY = 'okchroma-ext-gen'
const GEN_CURRENT = 'instruments-2026-08-31'
// The base's solve-column → modeId map (JSON), stamped every apply — the modes'
// rename-proofing: display names are the user's to change, the stored ids are the
// contract (the collections' tag idiom, extended to modes).
const COLS_KEY = 'okchroma-ext-cols'
// the base collection's SEED COLOR (the rebuild feature) — absent on
// files predating it, which means the fixed default (payload.ts BASE_SEED_HEX)
const BASE_SEED_KEY = 'okchroma-ext-base-seed'
// the DESCOPE POSTURE (role-based):
// whether the non-role rows (ramp stops, alpha/abs plumbing) get scopes = [] (hidden
// from every Figma picker) while the state-carrying roles (cta bands, link, surfaces)
// keep ALL_SCOPES. FILE state, not per-brand — the posture is file-wide, so this lives
// on the base collection same as BASE_SEED_KEY, never inside a ThemeSpec recipe.
// Absent = default ON (non-role rows hidden).
const DESCOPE_KEY = 'okchroma-ext-descope'

// the FILE-STATE handshake (the rebuild feature): the UI builds every payload's BASE
// column from the seed, so it must learn the file's stored seed before the first apply —
// a rebuilt base diffed against the DEFAULT seed would churn every brand's overrides.
// Carries the DESCOPE POSTURE too so the UI's checkbox initializes
// from what the file actually has stamped, not a hardcoded default.
;(async () => {
  try {
    const collections = await figma.variables.getLocalVariableCollectionsAsync()
    const base = collections.find(c => c.getPluginData(OWNER_KEY) === 'base')
    figma.ui.postMessage({
      type: 'file-state',
      baseSeedHex: base?.getPluginData(BASE_SEED_KEY) || null,
      descopePrimitives: base?.getPluginData(DESCOPE_KEY) !== 'false',
    })
  } catch { /* fresh file — the UI's default seed stands */ }
})()
// Mirrors payload.COLUMNS (type-only import keeps the engine out of the sandbox bundle).
// Column order IS the mode-dropdown order: the default lane leads, pairs group by prefix.
const COLUMNS: Column[] = ['light', 'dark']
// Mirrors cssRender.OFFSET_ALPHAS — declared locally for the same reason COLUMNS is: a value
// import from payload would drag the engine into the sandbox bundle. Used only to RECOGNISE our
// own decorative strokes when converting a pre-existing raw value to the alias, never to write one.
// 0.12 is the RETIRED rung and stays in the recognise set precisely because
// files in the wild still hold it — dropping it would leave those raw forever.
const RUNG_ALPHAS: Record<string, number> = { 'away-from-bg/06': 0.06, 'away-from-bg/08': 0.08, 'away-from-bg/16': 0.16 }
const RETIRED_RUNG_ALPHA = 0.12

// RETIRED CANONICAL SIGNAL VALUES: base rows are create-once, so an engine value-move
// strands an existing file's SIGNAL rows on the era they were seeded in — a re-apply
// writes fresh per-brand OVERRIDES, but the base "theme" collection keeps shipping the
// stale, unlawful value (the symptom: a warning pen failing on papers in the main
// theme). The offset-08 idiom, extended to values: a raw base value that EXACTLY
// matches a retired canonical is OURS and refreshes to the payload's current value;
// anything else is a designer's edit and is never touched.
// Eras covered: C42 (the clearance law moved the positive/info cta trios) and C44 (the
// shipped-pair law moved the warning/positive pens + the warning/critical highlight-8);
// each hex is a prior round's canonical output for that row. Extend this map whenever
// an engine round moves canonical signal values. Keys are matched against the
// CANONICAL path (the post-migration map key, independent of any user display rename).
// ⚠️ Keys must spell the CURRENT canonical path exactly (zone prefix, flat leaf): a key
// in a retired spelling never matches the post-migration key and disarms silently (C56).
const RETIRED_SIGNAL_VALUES: Record<string, string[]> = {
  'base/critical/highlighter-26': ['#e06146'],
  'base/warning/highlighter-26': ['#c67a00'],
  'base/warning/pencil-47': ['#a56000'],
  'base/positive/pencil-47': ['#1c7e36'],
  'base/positive/stamp/fill': ['#63c373', '#67c777'],
  'base/positive/stamp/fill-hover': ['#52b364', '#77d786'],
  'base/positive/stamp/fill-pressed': ['#42a355', '#87e896'],
  'base/info/stamp/fill': ['#afa3ff'],
  'base/info/stamp/fill-hover': ['#a093ee', '#bfb7ff'],
  'base/info/stamp/fill-pressed': ['#9184dd', '#cfcaff'],
}
// half-8-bit-step tolerance: Figma stores floats; a retired hex must match to the channel
const rgbaMatchesHex = (cur: { r: number; g: number; b: number; a?: number }, hex: string): boolean => {
  if (cur.a !== undefined && cur.a !== 1) return false
  const ch = (i: number) => parseInt(hex.slice(i, i + 2), 16) / 255
  return Math.abs(cur.r - ch(1)) < 1 / 510 && Math.abs(cur.g - ch(3)) < 1 / 510 && Math.abs(cur.b - ch(5)) < 1 / 510
}
const RUNG_FOR_ALPHA = (a: number | undefined): string | undefined =>
  a === undefined ? undefined : Object.keys(RUNG_ALPHAS).find(k => Math.abs(RUNG_ALPHAS[k] - a) < 1e-6)
const DARK_COLUMNS = new Set<Column>(['dark'])
// Descriptions are per-variable (tokenDescriptions.ts), never a one-size stamp: a
// stamp's ratio digits would pollute Figma's picker search, which fuzzy-matches
// descriptions.

// Token renames (old leaf → new leaf), migrated IN PLACE on the existing variable —
// Figma keeps the variable id on rename, so user bindings survive (cheap by design; a
// rename is one more entry). Mirrored in plugin/code.ts.
// DOWNWARD renumber entries are safe only because tokens are processed in ladder
// (ascending) order and each migration self-deletes its consumed key. An UPWARD
// renumber (C49) CANNOT ride this table at all — ensure() matches the exact name
// before any candidate, so the ascending walk would hand the vacating row to the
// wrong stop; see the textUpshifts pre-pass in the apply handler.
const RENAMED_LEAVES: Array<[string, string]> = [
  // ── THE CHALK/HIGHLIGHTER RENAME: the tinted band takes the chalk word and the
  // 3:1 stop takes highlighter, the word that also names the translucent state rungs
  // seeded from it. Names only, same indices, same values. CURRENT-name entries
  // stay FIRST: they are exactly what an instruments-vintage file holds as its real
  // variables. Every older vintage below re-targets straight at the new homes (one hop).
  ['highlighter-8', 'chalk-8'],
  ['highlighter-11', 'chalk-11'],
  ['highlighter-15', 'chalk-15'],
  ['highlighter-20', 'chalk-20'],
  ['crayon-26', 'highlighter-26'],
  // ── THE INSTRUMENTS RENAME (the vintage every file applied between the
  // conformance-suffix drop and the chalk rename holds): band words → instruments,
  // the digit inverted (100 − the previous digit; derive → round → invert, never
  // re-rounded). Names only, same indices, same values.
  ['paper-100', 'paper-0'],
  ['paper-99', 'paper-1'],
  ['paper-97', 'paper-3'],
  ['paper-95', 'paper-5'],
  ['wash-92', 'chalk-8'],
  ['wash-89', 'chalk-11'],
  ['wash-85', 'chalk-15'],
  ['wash-80', 'chalk-20'],
  ['wax-74', 'highlighter-26'],
  ['lead-53', 'pencil-47'],
  ['ink-42', 'pen-58'],
  ['ink-30', 'pen-70'],
  ['ink-0', 'pen-100'],
  // ── CONFORMANCE-SUFFIX DROP + FAMILY RENAME: the aa/aaa signifiers are not in
  // the NAMES (the Contrast description lines carry the conformance, so an "aaa"
  // search lands on descriptions); brand-primary → brand
  // and brand-secondary → brand-alt ride RENAMED_GROUPS below. Same indices, same
  // values — a relabel, not a renumber.
  ['mark-74-aa', 'highlighter-26'],
  ['ink-53-aa', 'pencil-47'],
  ['ink-42-aa', 'pen-58'],
  ['ink-30-aaa', 'pen-70'],
  ['absolute/secondary', 'absolute/brand-alt'],
  // ── THE GUARANTEE ROUND, ink-53 → pencil-47: the band-word
  // split the group guarantees need. Name only, same index, same values; older
  // ink-53-vintage sources already point straight at pencil-47 (the one-hop rule).
  ['ink-53', 'pencil-47'],
  // ── THE GUARANTEE ROUND, mark-74 → highlighter-26 (band word mark → highlighter).
  // Name only, same index, same values; older mark-vintage sources already point
  // straight at highlighter-26 (the one-hop rule).
  ['mark-74', 'highlighter-26'],
  // link nesting (the instruments round): the flat trio + the inverse leaves fold
  // into state subgroups — link/{default,inverse}/{enabled,hover,pressed}; enabled
  // is the rest leaf (default is the group word). Vintage link sources below
  // retarget straight at the new homes (one hop).
  ['link/default', 'link/default/enabled'],
  ['link/hover', 'link/default/hover'],
  ['link/pressed', 'link/default/pressed'],
  ['link/inverse', 'link/inverse/enabled'],
  ['link/inverse-hover', 'link/inverse/hover'],
  ['link/inverse-pressed', 'link/inverse/pressed'],
  // the offset ladder's word (the instruments round): direction relative to the page
  // background, two-digit rungs harmonizing with shadow-04/08/12. The vintage
  // offset-XX sources below retarget straight at the new homes (one hop).
  ['alpha/006', 'alpha/away-from-bg/06'],
  ['alpha/008', 'alpha/away-from-bg/08'],
  ['alpha/016', 'alpha/away-from-bg/16'],
  // the identity absolutes carry the family words (the instruments round):
  // primary → brand, alt → brand-alt. The community plugin's system/abs-* rows
  // deliberately DRIFT (the community build is the owner's sharing mirror only).
  ['absolute/primary', 'absolute/brand'],
  ['absolute/alt', 'absolute/brand-alt'],
  // solid → stamp (the instruments round): the solid-rename generation is a vintage;
  // the cta-era sources below already re-target straight to stamp/ (one hop).
  ['solid/fill', 'stamp/fill'],
  ['solid/fill-hover', 'stamp/fill-hover'],
  ['solid/fill-pressed', 'stamp/fill-pressed'],
  ['solid/edge', 'stamp/edge'],
  ['solid/on', 'stamp/on'],
  // ── LINK-INVERSE REGROUP: the inverse trio lives INSIDE the link group; a file
  // applied under the short-lived solo link-inverse group build holds these
  // spellings. Multi-segment leaves — the suffix match carries the group word, so
  // base/link/inverse finds a file's base/link-inverse/default and renames it in
  // place.
  ['link-inverse/default', 'link/inverse/enabled'],
  ['link-inverse/hover', 'link/inverse/hover'],
  ['link-inverse/pressed', 'link/inverse/pressed'],
  // ── SOLID RENAME + OWNERSHIP ZONES: the cta words → the solid/ state group;
  // overlays fold into overlay/; planes sunken|base → dim|mid; scrim → abs-black-060;
  // the offset ladder drops its word; the system rows re-home by zone (leaf reshapes
  // here, zone prefixes in RENAMED_GROUPS). These entries must precede the
  // band-flattening batch below: they are exactly what a band-flattening-vintage
  // file holds as its variables.
  // link/enabled is that vintage's rest leaf; its home is the nested
  // link/default/enabled (same word, one group deeper)
  ['link/enabled', 'link/default/enabled'],
  ['cta/enabled', 'stamp/fill'],
  ['cta/hover', 'stamp/fill-hover'],
  ['cta/pressed', 'stamp/fill-pressed'],
  ['cta/border', 'stamp/edge'],
  ['cta/on', 'stamp/on'],
  // the paper overlays are PARKED — nothing emits or refreshes paper-LL-overlay.
  // These entries consolidate every shipped spelling (the flat original and the
  // short-lived overlay/ subgroup build) onto the parked flat name, the cta-ink
  // precedent: old rows are FOUND and renamed to one recognizable retired home
  // (then orphan-reported) rather than silently left under vintage names.
  ['paper-overlay-99', 'paper-99-overlay'],
  ['paper-overlay-97', 'paper-97-overlay'],
  ['paper-overlay-95', 'paper-95-overlay'],
  ['overlay/paper-1', 'paper-99-overlay'],
  ['overlay/paper-3', 'paper-97-overlay'],
  ['overlay/paper-5', 'paper-95-overlay'],
  ['surface/sunken', 'surface/dim'],
  // ⚠️ the word base has named two different planes (the PAGE plane in the
  // sink|base|lift|pop vintage, the raised plane in the sunken|low|base|high vintage)
  // and is retired: this entry consumes a sunken|low|base|high-vintage file's base
  // row into mid; a sink|base|lift|pop-vintage file's base row (the PAGE plane)
  // belongs to surface/low via the entry further down — ensure ORDER disambiguates
  // (low direct-hits before mid's legacy lookup).
  ['surface/base', 'surface/mid'],
  ['alpha/scrim', 'abs-black-060'],
  ['alpha/offset-06', 'alpha/away-from-bg/06'],
  ['alpha/offset-08', 'alpha/away-from-bg/08'],
  ['alpha/offset-16', 'alpha/away-from-bg/16'],
  ['alpha/shadow-04', 'shadow-04'],
  ['alpha/shadow-08', 'shadow-08'],
  ['alpha/shadow-12', 'shadow-12'],
  ['abs-black', 'absolute/black'],
  ['abs-white', 'absolute/white'],
  ['abs-primary', 'absolute/brand'],
  ['abs-secondary', 'absolute/brand-alt'],
  // ── BAND FLATTENING: ramp leaves sit FLAT in the family group — paper-1, chalk-8,
  // highlighter-26, pencil-47 … (band word + hyphen + level, the engine's own token
  // names). The band nesting (paper/99 …) is a retired vintage; only the state
  // groups (stamp/, link/) nest. These entries MUST precede everything below:
  // candidates are tried in table order and the banded spellings are exactly what a
  // Stage-B-era file holds as its real variables. Entry ORDER stays load-bearing
  // throughout: consumed keys self-delete,
  // which is how one flat spelling (ink-11, ink-12) can mean different stops in
  // different vintages — the earlier-target ensure eats its own vintage's row first,
  // freeing the name for the later one.
  ['paper/100', 'paper-0'],
  ['paper/99', 'paper-1'],
  ['paper/97', 'paper-3'],
  ['paper/95', 'paper-5'],
  ['wash/92', 'chalk-8'],
  ['wash/89', 'chalk-11'],
  ['wash/85', 'chalk-15'],
  ['wash/80', 'chalk-20'],
  ['mark/74-aa', 'highlighter-26'],
  ['ink/53-aa', 'pencil-47'],
  ['ink/42-aa', 'pen-58'],
  ['ink/30-aaa', 'pen-70'],
  ['ink/0', 'pen-100'],
  // ── the pre-banding flat vintage (leaf shapes before the band nesting; every target
  // below points STRAIGHT at the final flat home — the one-hop rule).
  ['paper-2', 'paper-3'],
  ['paper-3', 'paper-5'],
  ['wash-4', 'chalk-8'],
  ['wash-5', 'chalk-11'],
  ['wash-6', 'chalk-15'],
  ['wash-7', 'chalk-20'],
  ['highlight-8', 'highlighter-26'],
  // ── pen flats, the C14-numbering vintage (pre-banding files between the C14
  // renumber and the band nesting). C49 gives the strong pen and the anchor their
  // pre-C33 numbers back, so these map one-hop to homes that are NUMBER-TRUE for this
  // vintage (homing flat ink-10 — this vintage's FIRST text stop — onto a strong
  // ink/10 would be the wrong-by-one latent C46's sweep class predicts).
  ['ink-9', 'pencil-47'],
  ['ink-10', 'pencil-47'],
  ['ink-11', 'pen-70'],
  ['ink-12', 'pen-100'],
  // ── STAGE-B BANDED ENTRIES for the pre-Stage-B banded digit vintage (between the
  // band nesting and Stage B; the flattening batch at the top covers the Stage-B
  // spellings themselves). Ordering: a banded-digit file holds both ink/9 (first
  // text) and ink/10 (the between stop) as two DIFFERENT real variables
  // sharing a leaf-string family with the OLD-KEY 'ink/10' the collapse-era entry
  // further down ALSO targets. Resolving pencil-47 (stop 9) must consume this
  // batch's ink/9 BEFORE the collapse-era ink/10 entry ever gets a chance to
  // (wrongly) claim a real between-stop row.
  ['paper/0', 'paper-0'],
  ['paper/1', 'paper-1'],
  ['paper/2', 'paper-3'],
  ['paper/3', 'paper-5'],
  ['wash/4', 'chalk-8'],
  ['wash/5', 'chalk-11'],
  ['wash/6', 'chalk-15'],
  ['wash/7', 'chalk-20'],
  ['highlight/8', 'highlighter-26'],
  ['ink/9', 'pencil-47'],
  ['ink/10', 'pen-58'],
  ['ink/11', 'pen-70'],
  ['ink/12', 'pen-100'],
  // ── REQUIREMENT-CODE HEAL (names only): a file applied under the short-lived C54
  // build carries the banded r-floor leaves (mark/74-r300, ink/53-r450, ink/42-r650,
  // ink/30-r700) as its real names. One-hop, no chaining: targets follow the final
  // flat homes.
  ['mark/74-r300', 'highlighter-26'],
  ['ink/53-r450', 'pencil-47'],
  ['ink/42-r650', 'pen-58'],
  ['ink/30-r700', 'pen-70'],
  ['cta', 'stamp/fill'],
  ['cta-hover', 'stamp/fill-hover'],
  ['cta-pressed', 'stamp/fill-pressed'],
  ['cta-border', 'stamp/edge'],
  ['on-cta', 'stamp/on'],
  // cta-ink is DEAD (the trio was pure aliases onto the pen stops; the band
  // flattening deleted it). These entries keep their RETIRED banded homes on
  // purpose — the highlight-9 precedent: an old flat row is still FOUND and
  // renamed to a recognizable retired name (then reported as an orphan) rather than
  // silently left. Nothing emits or refreshes cta-ink; an existing row is an alias
  // onto the pen stops and keeps resolving. The footer HEAL converts their node
  // applications to the matching pen stops.
  ['cta-ink', 'cta-ink/enabled'],
  ['cta-ink-hover', 'cta-ink/hover'],
  ['cta-ink-pressed', 'cta-ink/pressed'],
  // ── the oldest vintages, pointed STRAIGHT at the final homes (the
  // one-hop rule). Renumber entries shift names DOWN; safe in ascending order
  // with self-deleting consumed keys — new ink/10 eats old ink-11 first.
  ['cta-stroke', 'stamp/edge'],
  // the decorative stroke's alpha row under its cta-border spelling: it belongs to the
  // alpha ladder beside shadow-04/08/12 and is not cta-specific. Only ever resolves
  // under the alpha/ group, so it cannot collide with the ['cta-border','stamp/edge']
  // entry above — candidates are prefix-scoped. A file that imported the row under
  // this spelling adopts it in place rather than gaining a duplicate.
  ['alpha/cta-border', 'alpha/away-from-bg/08'],
  // ── THE RUNG LADDER (C41). offset-12 is retired: the ladder is 06 for the secondary,
  // 08 for the neutral, 16 for the primary and the signals, and no family lands on 12.
  // In a file carrying offset-12 the NEUTRAL is its only consumer, so 12 → 08 carries
  // every existing binding across in place rather than stranding the row. The
  // cta-border entry above points at the same home (one hop, never a chain).
  //
  // ⚠️ THE RENAME MOVES THE NAME, NOT THE VALUE. ensure() adopts a legacy row by renaming it and
  // does NOT bump createdVars, so seedFresh never runs and the row keeps its 0.12 under the
  // new name — a token called 08 holding 12%. The value-correction pass further down
  // (the RUNG_ALPHAS loop) is what actually re-values it; do not delete one without the other.
  ['alpha/offset-12', 'alpha/away-from-bg/08'],
  // ── THE C33 COLLAPSE, under C49 numbering. highlight/9 and highlight/on are DEAD
  // (they ORPHAN — the plugin reports orphans, it never deletes a user's variables).
  // Only the first of C33's three downshifts needs an entry: C49 gives the strong pen
  // and the anchor their pre-C33 names back, so a pre-C33-banded file's
  // ink/11 and ink/12 rows are ALREADY correctly named — an entry would be an identity
  // mapping at best and a hijack at worst. This entry catches a pre-C33 file's ink/10
  // (that vintage's FIRST TEXT stop), which is a DIFFERENT thing than a banded-era
  // file's ink/10 (the between stop, C49); the Stage-B batch above resolves
  // pencil-47 off such a file's own ink/9 FIRST, so this entry is only ever reached
  // once that candidate is absent — it never gets a chance to steal a real
  // between-stop row.
  ['ink/10', 'pencil-47'],
  // ── pre-banding flat names from BEFORE the C14 renumber (two renumbers back: first
  // text = ink-11, strong = ink-12, anchor = ink-13). Vintage disambiguation vs the
  // C14 flats above is by ensure order + consumption: pencil-47 (ensured first) eats a
  // pre-C14 file's ink-11 — a C14-vintage file's ink-11 survives for pen-70 because
  // pencil-47 consumed that file's ink-10 instead — then pen-70 falls
  // through its own-name candidate to this vintage's ink-12, and pen-100 to ink-13.
  ['ink-11', 'pencil-47'],
  ['ink-12', 'pen-70'],
  ['ink-13', 'pen-100'],
  // blue-signal variant relabels (C17, info-color → blue): variant leaf =
  // label + resolved light-cta hex (variantKey), so the relabel needs per-lane entries.
  ['magenta-de8df6', 'magenta-side-de8df6'],
  ['magenta-e290f9', 'magenta-side-e290f9'],
  ['blue-7cb3f9', 'cyan-side-7cb3f9'],
  ['blue-7eb5fb', 'cyan-side-7eb5fb'],
  // cta semantic rename (states, never options), retargeted to the stamp state
  // homes; no cta-3 — the numbered vintage had no pressed state.
  ['cta-1', 'stamp/fill'],
  ['cta-2', 'stamp/fill-hover'],
  // stop-3 rename (the elevation round) retargeted to its final flat home. Pure
  // relabel, same color.
  ['wash-3', 'paper-5'],
  // ── ELEVATION-PLANE RENAME: sink|base|lift|pop → sunken|low|base|high — "base" on
  // the PAGE plane gave it too much semantic weight when components actually sit on
  // the raised plane. ⚠️ 'base' SURVIVES THE RENAME BUT MOVES PLANES
  // (sink|base|lift|pop's lift — cards/menus — is sunken|low|base|high's base), so
  // ORDER is load-bearing twice over: surface/low must be ENSURED before surface/mid
  // (the ensure() call order in the apply) — an exact-name hit on a file's old base
  // row would otherwise hand the PAGE plane's variable (and its bindings) to the
  // cards name before the low-lookup could consume it.
  ['surface/sink', 'surface/dim'],
  ['surface/base', 'surface/low'],
  ['surface/lift', 'surface/mid'],
  ['surface/pop', 'surface/high'],
  // the two-plane vintage (paper-raised / paper-sunken, before the four-plane ladder):
  // the old pair migrates to its closest role IN PLACE (bindings survive; their light
  // stop shifts one rung per the four-plane ladder — raised p0→p1, sunken p2→p3).
  // These entries point STRAIGHT at the final surface/ homes: legacyCandidates
  // expands one hop only, so a chained old→mid→new table would strand two-plane
  // files on the middle name.
  ['paper-raised', 'surface/mid'],
  ['paper-sunken', 'surface/dim'],
  // system regroup: planes → system/surface/*, alpha-carrying
  // utilities → system/alpha/*, link trio → system/link/* with state leaves.
  // abs-black/abs-white stay at the system root. Same-value moves, no ladder shift.
  ['sink', 'surface/dim'],
  ['base', 'surface/low'],
  ['lift', 'surface/mid'],
  ['pop', 'surface/high'],
  ['transparent', 'alpha/transparent'],
  ['scrim', 'abs-black-060'],
  ['link', 'link/default/enabled'],
  ['link-hover', 'link/default/hover'],
  ['link-pressed', 'link/default/pressed'],
]
// Group renames (old prefix → new), same in-place idiom. The bind-surface rows carry
// ROLE names (critical/warning/positive/info) — the re-pointable in-between tier.
// Theme-side entries point STRAIGHT at the final role homes (legacyCandidates expands
// one group hop only — a chained info-color→blue→info table would strand pre-C17
// files on the middle name). system/info-color → base/blue is DEAD — no file has ever
// carried a blue/* identity group under any register (v1's primitive-lane spelling
// never shipped a real row here) — kept only for cross-plugin path parity in
// legacyCandidates.
//
// THE ZONES: every path carries an ownership-zone prefix (payload.registerPath).
// legacyCandidates' one-hop rule means recovering every vintage needs each old era
// covered from the NEW spelling: the primitive/ register strips (the one-register
// era, when the system rows sat under primitive/system/), the register-less system/
// strips, the universal strip (the root spellings of the system rows — sink, link, …,
// reached via RENAMED_LEAVES' leaf-variant composition), and the semantic/ era — a
// universal register swap for the cta bands and signal roles plus exact entries for
// link and the surfaces, which that era parked OUTSIDE system/ (semantic/link/*,
// semantic/surface/*). The signal-role entries compose with RENAMED_LEAVES to reach
// the oldest flat spellings (e.g. red/highlight-8).
const RENAMED_GROUPS: Array<[string, string]> = [
  // the family rename: brand-primary → brand, brand-secondary → brand-alt
  // (trailing slashes keep base/brand/ from ever matching base/brand-alt/ paths)
  ['base/brand-primary/', 'base/brand/'],
  ['base/brand-secondary/', 'base/brand-alt/'],
  ['system/info-color/', 'base/blue/'],
  // the primitive/ register era — the system rows are split by zone, so BOTH zone
  // targets carry the old prefix (misses are harmless; candidates that never existed
  // simply never hit)
  ['primitive/', 'base/'],
  ['primitive/system/', 'base/'],
  ['primitive/system/', 'utility/'],
  // the pre-A1 system/ spellings (no register)
  ['system/', 'base/'],
  ['system/', 'utility/'],
  // pre-regroup root spellings (sink, scrim, link, … — reached via RENAMED_LEAVES'
  // leaf-variant composition)
  ['', 'base/'],
  ['', 'utility/'],
  // the A1 semantic/ era
  ['semantic/', 'base/'],
  ['semantic/link/', 'base/link/'],
  ['semantic/surface/', 'utility/surface/'],
  // signal-role rename era
  ['info-color/', 'base/info/'],
  ['red/', 'base/critical/'],
  ['yellow/', 'base/warning/'],
  ['green/', 'base/positive/'],
  ['blue/', 'base/info/'],
]
// Every legacy spelling of `path`: old leaf, old group, and old group + old leaf composed
// (a file untouched since before both a group and a leaf rename needs the composed
// lookup — e.g. base/critical/pencil-47 → red/ink-11, through the role rename and the
// leaf relabels).
function legacyCandidates(path: string): string[] {
  const out: string[] = []
  const leafVariants = [path]
  for (const [oldLeaf, newLeaf] of RENAMED_LEAVES) {
    if (path.endsWith(`/${newLeaf}`)) leafVariants.push(path.slice(0, -newLeaf.length) + oldLeaf)
  }
  for (const cand of leafVariants) {
    if (cand !== path) out.push(cand)
    for (const [oldPre, newPre] of RENAMED_GROUPS) {
      if (cand.startsWith(newPre)) out.push(oldPre + cand.slice(newPre.length))
    }
  }
  return out
}

// Invisible-rename normalization (the defect: the base GROUP renamed and restored with
// a trailing space leaves every unstamped row unfindable — the apply then reads as
// "nothing happens", and clicking through the confirm would duplicate the whole
// base). A normalized key matches names differing only by segment-edge whitespace
// or letter case; the token grammar is all-lowercase, so normalization is canonical-
// stable and a genuinely custom name never normalizes onto an engine path. Stamped rows
// and exact names always win — the aliases fill gaps, never shadow.
const normPath = (p: string) => p.split('/').map(s => s.trim()).join('/').toLowerCase()

// Is `name` an ENGINE spelling of `path` — canonical or any legacy vintage? The custom-
// name doctrine's other half: a display name that spells a RETIRED engine path is not
// a user's custom name — it is a stale generation and must follow the rename. Without
// it, an apply during a group-rename window advances the STAMPS but judges the
// shifted names custom, and every later apply protects the stale names under the
// custom-name rule. Only names outside the entire engine grammar are the user's.
const isEngineSpelling = (name: string, path: string): boolean => {
  const n = normPath(name)
  return n === normPath(path) || legacyCandidates(path).some(lp => normPath(lp) === n)
}

const ENTERPRISE_MSG =
  'Extended collections need a Figma Enterprise org — this file’s plan doesn’t expose collection.extend(). '
  + 'The published OKChroma plugin (v1) covers every plan.'

const isExtension = (c: figma.VariableCollection): c is figma.ExtendedVariableCollection => c.isExtension === true

// Map canonical path → variable. Identity = the PATH_KEY stamp; an unstamped row
// (a pre-stamp file) keys by its name — the fallback that finds and heals it. A
// stamped row always wins a key collision, so the stale duplicate a pre-stamp apply
// created next to a hand-renamed variable can never shadow the real one.
async function varsByName(collectionId: string): Promise<Map<string, figma.Variable>> {
  const all = await figma.variables.getLocalVariablesAsync()
  const mine = all.filter(v => v.variableCollectionId === collectionId)
  const map = new Map<string, figma.Variable>()
  for (const v of mine) { const p = v.getPluginData(PATH_KEY); if (p) map.set(p, v) }
  for (const v of mine) { if (!v.getPluginData(PATH_KEY) && !map.has(v.name)) map.set(v.name, v) }
  // pass 3: NORMALIZED aliases for unstamped rows (invisible renames — see normPath).
  // Registered last and only into empty keys, so stamps and exact names always win.
  for (const v of mine) {
    if (v.getPluginData(PATH_KEY)) continue
    const n = normPath(v.name)
    if (n !== v.name && !map.has(n)) map.set(n, v)
  }
  return map
}

// Parse an extension's stored recipe, resyncing its brand to the collection's LIVE
// name (a rename in the variables panel wins — the picker lists the
// new name, and BRAND_KEY follows so an edit updates this extension instead of
// forking a duplicate). Returns undefined when no recipe is stored or it won't parse.
function recipeOf(e: figma.VariableCollection): unknown | undefined {
  const raw = e.getPluginData(SPEC_KEY)
  if (!raw) return undefined
  try {
    const spec = JSON.parse(raw) as { brand?: unknown }
    if (spec && typeof spec === 'object' && spec.brand !== e.name) {
      spec.brand = e.name
      e.setPluginData(SPEC_KEY, JSON.stringify(spec))
      e.setPluginData(BRAND_KEY, e.name)
    }
    return spec
  } catch { return undefined }
}

// Diff tolerance: values round-trip through Figma's color storage; 1/1024 is far below
// any perceptible step but absorbs float noise.
const EPS = 1 / 1024
const isAlias = (v: figma.RGBA | figma.VariableAlias | undefined): v is figma.VariableAlias =>
  !!v && typeof v === 'object' && 'type' in v
const valEq = (cur: figma.RGBA | figma.VariableAlias | undefined, t: FlatTok): boolean => {
  if (!cur || isAlias(cur)) return false
  return Math.abs(cur.r - t.r) < EPS && Math.abs(cur.g - t.g) < EPS && Math.abs(cur.b - t.b) < EPS
    && Math.abs((cur.a ?? 1) - (t.a ?? 1)) < EPS
}
const toRGBA = (t: FlatTok): figma.RGBA =>
  t.a !== undefined && t.a < 1 ? { r: t.r, g: t.g, b: t.b, a: t.a } : { r: t.r, g: t.g, b: t.b }

// Figma requires every font of any text node an edit forces to re-render to be loaded
// first — including fallback fonts the file never names ("Noto Sans Symbols2" carries
// symbol glyphs). Fonts load lazily per session, so a variable write into a file whose
// bound text hasn't rendered yet can throw mid-apply (the failure mode: a batch dies
// at one brand and succeeds on manual re-run). Applies and the heal are idempotent, so
// the recovery IS the re-run: parse the demanded font out of the error, load it, run
// the whole operation again. Each failing pass names at most one new font; the cap
// stops a pathological file from looping (loadFontAsync's own failure propagates
// regardless).
async function withFontRetry<T>(run: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await run()
    } catch (err) {
      const s = String(err)
      const m = s.includes('unloaded font') ? /family:\s*"([^"]+)",\s*style:\s*"([^"]+)"/.exec(s) : null
      if (!m || attempt >= 4) throw err
      await figma.loadFontAsync({ family: m[1], style: m[2] })
    }
  }
}

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'apply') {
    const { brand, brandTokens, baseTokens, retiredNeutral, hasSecondary, confirmed, confirmedToken, spec, rebuildBase, baseSeedHex, renameFrom, descopePrimitives } = msg as unknown as {
      type: 'apply'; brand: string; brandTokens: TokenColumns; baseTokens: TokenColumns
      // the RETIRED default-strength neutral rows for this base seed (= the 'medium'
      // rung, computed live UI-side) — the value-matched heal's "OUR value" reference;
      // optional so an older UI's message still applies
      retiredNeutral?: TokenColumns
      hasSecondary: boolean; confirmed?: boolean; confirmedToken?: string; spec?: unknown
      // the REBUILD flag: force-reseed every base row from this
      // payload — the explicit "redo the main theme" action; rides the armed batch (its
      // first item carries it), so it always arrives confirmed
      rebuildBase?: boolean; baseSeedHex?: string
      // the EDIT PICKER's rename: a loaded theme applied under a new
      // name renames its extension in place instead of creating a sibling
      renameFrom?: string
      // the DESCOPE POSTURE: FILE state, carried on every apply from
      // the UI's own checkbox. A boolean here is freshly stamped onto the base and wins;
      // see the resolution beside BASE_SEED_KEY below for the absent/stored/default chain.
      descopePrimitives?: boolean
    }
    // the whole apply is one idempotent pass — withFontRetry re-runs it wholesale on
    // Figma's unloaded-font error (see the helper above onmessage)
    const applyOnce = async () => {
      const collections = await figma.variables.getLocalVariableCollectionsAsync()
      const locals = collections.filter(c => !isExtension(c))
      const extensions = collections.filter(isExtension)

      // The owned base: tag first (survives renames), then NAME-BLIND ADOPTION
      // (apply must work after any rename — a base renamed to "base", the plugin's
      // own UI word, must not make a literal-'theme' fallback silently target
      // nothing). Ladder: ① the OWNER_KEY tag; ② a collection whose VARIABLES carry
      // the PATH_KEY identity stamps — ours by content, whatever it is called; ③ a
      // collection matching the v2 mode-column contract minus any name requirement
      // (catches provenance that strips pluginData: in-file duplication, API
      // re-creation). Ambiguity never guesses: two candidates at
      // a rung = an error naming them. The collection's display name is never
      // touched (names are the user's; the tag is re-written on adoption, so
      // identity holds from then on). Every non-tagged adoption and every fresh
      // create is figma.notify'd — a wrong target must never read as "nothing
      // happened". A "theme"-named collection that fails every rung still gets
      // the explicit v1/hand-made error rather than a silent shadow create.
      const tagged = locals.find(c => c.getPluginData(OWNER_KEY) === 'base')
      let baseMatch = tagged
      let adoptedHow: 'identity stamps' | 'column layout' | null = null
      if (!baseMatch) {
        const allVars = await figma.variables.getLocalVariablesAsync()
        const stampedColls = new Set(allVars
          .filter(v => v.getPluginData(PATH_KEY) || v.getSharedPluginData('okchroma', PATH_KEY))
          .map(v => v.variableCollectionId))
        const byContent = locals.filter(c => stampedColls.has(c.id))
        if (byContent.length > 1) {
          figma.ui.postMessage({ type: 'error', message:
            `More than one collection carries OKChroma identity stamps (${byContent.map(c => `"${c.name}"`).join(', ')}). `
            + 'Delete or rename the stale copy so only the real base remains, then apply again.' })
          return
        }
        if (byContent.length === 1) { baseMatch = byContent[0]; adoptedHow = 'identity stamps' }
      }
      if (!baseMatch) {
        const isContract = (c: figma.VariableCollection) => {
          const names = c.modes.map(m => m.name).join(',')
          return names === COLUMNS.join(',') || names === COLUMNS.slice(0, 2).join(',')
        }
        const byContract = locals.filter(isContract)
        if (byContract.length > 1) {
          figma.ui.postMessage({ type: 'error', message:
            `More than one collection matches the OKChroma base column layout (${byContract.map(c => `"${c.name}"`).join(', ')}). `
            + 'Delete or rename the copies so only the real base remains, then apply again.' })
          return
        }
        if (byContract.length === 1) { baseMatch = byContract[0]; adoptedHow = 'column layout' }
        else if (locals.some(c => c.name === BASE_NAME)) {
          figma.ui.postMessage({ type: 'error', message:
            `A collection named "${BASE_NAME}" already exists in this file and isn’t an OKChroma Extended base `
            + '(likely plugin v1’s, or hand-made). Use a fresh file, or rename that collection first.' })
          return
        }
      }

      // Mode COLUMNS resolve RENAME-PROOF (an org may require the columns be named
      // "light"/"dark"): each resolved column's modeId is stamped in plugin data and
      // later applies resolve by STORED ID first — Figma keeps a modeId across
      // renames — then by canonical name (legacy / unstamped files). The plugin only
      // NAMES modes it CREATES; a user rename is respected, never reverted. A
      // hand-DELETED mode
      // dangles its stored id → falls to the name check → treated as missing
      // (the delete-to-drop contract survives).
      const storedCols: Partial<Record<Column, string>> = (() => {
        if (!baseMatch) return {}
        try { return JSON.parse(baseMatch.getPluginData(COLS_KEY) || '{}') } catch { return {} }
      })()
      const baseModeIds = new Set(baseMatch ? baseMatch.modes.map(m => m.modeId) : [])
      // ids VALIDLY claimed by some column's stored entry — the name fallback must
      // never capture one of these for a DIFFERENT column (renaming the dark
      // column's display name to "light" would otherwise merge two lanes onto one
      // mode and clobber writes)
      const claimedByStored = new Set(
        Object.values(storedCols).filter((id): id is string => !!id && baseModeIds.has(id)))
      // ADOPT, DON'T DUPLICATE. The APCA-era column identifiers ('wcag'/'wcag-dark',
      // LEGACY_COLUMN_NAME) are a vintage of 'light'/'dark'. A file stamped under the
      // legacy names has neither a stored id under the current key nor a mode named
      // "light", so without this fallback every such base would grow two NEW modes
      // beside its populated ones and leave the real values stranded in the old pair.
      // Resolution
      // order: stored id under the current key → stored id under the LEGACY key → a mode
      // named the current name → a mode named the LEGACY name. An adopted legacy mode is
      // renamed in place below; Figma keeps the modeId across a rename, so bindings live.
      const resolveCol = (c: Column): string | undefined => {
        const stored = storedCols[c] ?? (storedCols as Record<string, string | undefined>)[LEGACY_COLUMN_NAME[c]]
        if (stored && baseModeIds.has(stored)) return stored
        const byName = (n: string) => baseMatch?.modes.find(m => m.name === n && !claimedByStored.has(m.modeId))?.modeId
        return byName(c) ?? byName(LEGACY_COLUMN_NAME[c])
      }
      // The RETIRED APCA pair (the owner is not authorised to use APCA for design
      // decisions, so this plugin never writes or creates it). A file that already
      // carries those modes KEEPS them: the plugin does not delete modes it does not
      // own. They are never updated and
      // are the user's to remove. Reported so the UI can say so, rather than leaving two
      // silently-stale columns sitting in the mode picker looking current.
      const staleApcaCols = baseMatch
        ? RETIRED_COLUMN_NAMES.filter(n => baseMatch!.modes.some(m => m.name === n))
        : []
      const activeCols: Column[] = COLUMNS
      // Columns this apply would have to CREATE on an existing base (positional
      // slot-reuse would hijack hand-deleted halves and user-added modes). The first
      // column adopts the default mode by design on a
      // FRESH collection; the rest must resolve (id or name) or be created.
      const missingCols: Column[] = baseMatch
        ? activeCols.filter(c => !resolveCol(c))
        : []

      // Live-detect the file's posture BEFORE any mutation (the confirm gate fires first).
      const baseVars = baseMatch ? await varsByName(baseMatch.id) : new Map<string, figma.Variable>()
      // posture probe reads through the rename tables (a pre-banding base still
      // spells it brand-secondary/paper-1; read-only, no renames here) —
      // legacyCandidates recovers every older spelling behind the flat leaf.
      const baseHasSecondary = baseVars.has('base/brand-alt/paper-1')
        || legacyCandidates('base/brand-alt/paper-1').some(p => baseVars.has(p))
      const extsOfBase = baseMatch ? extensions.filter(e => e.rootVariableCollectionId === baseMatch!.id) : []
      // case-insensitive identity: "l1-near-black" typed by hand must overwrite
      // L1-near-black, never create a sibling that differs only by case
      const norm = (s: string) => s.trim().toLowerCase()
      const byBrand = (b: string) => extsOfBase.find(e => norm(e.getPluginData(BRAND_KEY)) === norm(b))
        ?? extsOfBase.find(e => norm(e.name) === norm(b))
      const existingExt = byBrand(brand)
      // ── THEME RENAME: the edit picker's loaded theme, applied under a
      // new name. Resolved and GUARDED here; executed only at the extension-selection point
      // below, past every confirm/abort — an apply that bounces must leave the name alone.
      const renaming = !!renameFrom && norm(renameFrom) !== norm(brand)
      const renameExt = renaming ? byBrand(renameFrom!) : undefined
      if (renaming && existingExt) {
        figma.ui.postMessage({ type: 'error', message: `Can’t rename “${renameFrom}” to “${brand}” — a “${brand}” extension already exists. Pick a different name (or delete the other extension first).` })
        return
      }
      if (renaming && !renameExt) {
        figma.ui.postMessage({ type: 'error', message: `Can’t rename “${renameFrom}” — no extension answers to that name (was it deleted or renamed by hand?). Reload the theme from the picker and try again.` })
        return
      }

      // Maps the textUpshift pre-pass's PRE-Stage-B leaf spelling ('ink/10'|'ink/11'|'ink/12'
      // — stop index, not display name) to the CURRENT payload leaf (the flat name), for
      // comparing an upshift's from/to against a fresh payload path below. Index-keyed,
      // not a payload
      // value-import (keeps the engine out of the sandbox bundle — see the header
      // comment). Anything else passes through unchanged.
      const STAGE_B_INK_LEAF: Record<string, string> = { '10': 'pen-58', '11': 'pen-70', '12': 'pen-100' }
      const stageBInkLeaf = (oldSpelling: string): string => {
        const m = /\/pen\/(10|11|12)$/.exec(oldSpelling)
        return m ? oldSpelling.slice(0, -m[0].length) + '/' + STAGE_B_INK_LEAF[m[1]] : oldSpelling
      }

      // ── C49 UPWARD RENUMBER: the strong pen goes ink/10 → ink/11 and
      // the anchor neutral/ink/11 → neutral/ink/12 (their pre-C33 names back), freeing
      // ink/10 for the new between text stop. An upward shift cannot ride RENAMED_LEAVES:
      // ensure() matches the exact name before any legacy candidate, so the ascending
      // ladder would hand the vacating strong row to the new stop. The renames are
      // COMPUTED here — read-only, so the newRows detection and the confirm see the
      // post-rename shape — and EXECUTED only after authorization, right before the
      // ensure ladder (the identity-absolutes idiom). Guards no-op every other vintage:
      // post-C49 files have ink/12; pre-C33 files already hold C49-true names at 11/12.
      // (Detection below stays in the OLD pre-A1, pre-Stage-B spelling on purpose — it
      // targets one narrow vintage that predates both renames; see stageBInkLeaf
      // above for where the comparison against the CURRENT payload path happens.)
      const textUpshifts: Array<[string, string]> = []
      if (baseMatch) {
        if (baseVars.has('neutral/ink/11') && !baseVars.has('neutral/ink/12') && baseVars.has('neutral/ink/10'))
          textUpshifts.push(['neutral/ink/11', 'neutral/ink/12'])
        for (const p of [...baseVars.keys()].filter(k => k.endsWith('/ink/10')).sort()) {
          const fam = p.slice(0, -'/ink/10'.length)
          const strongAlreadyAt11 = baseVars.has(`${fam}/ink/11`)
            && !textUpshifts.some(([from]) => from === `${fam}/ink/11`)
          if (!strongAlreadyAt11) textUpshifts.push([p, `${fam}/ink/11`])
        }
      }

      // New base ROWS this apply would create on an EXISTING base — the token-set-growth
      // posture (without it a new system row appears silently, seeded from the DEFAULT
      // SEED, and every other extension inherits those values until manually
      // re-applied — the class the C20 link rows and the C19 cta-ink rows fell in).
      // Same discipline as missingCols: confirm first, then the recipe backfill
      // regenerates every extension so each brand overrides the new rows with its own.
      // brand-alt/* is excluded (the secondary posture has its own reason +
      // trigger); a legacy name counts as EXISTING (ensure() migrates it in place).
      // Brand-VARYING system rows — the link trio and the identity absolutes — are
      // the only system paths extensions may override.
      // rosters from tokenNames.ts (zero-import — the sandbox-safe single source; a
      // prefix test would disarm silently when a name moves, C56)
      const OVERRIDABLE_SYSTEM = EXT_OVERRIDABLE_SYSTEM
      // one helper so every exclusion site stays in sync
      const isBrandSecondary = (p: string) => p.startsWith('base/brand-alt/')
      // Contract-invariant system rows (every system row except the brand-overridable
      // rows above) are excluded: extensions can never override them (the work loop
      // skips them), so their appearance seeds silently — a confirm promising "each
      // brand carries its own values" would be false and the backfill regeneration
      // pointless (the alpha/shadow rows are the case).
      const newRows: string[] = baseMatch
        ? baseTokens[activeCols[0]]
            .map((t: FlatTok) => t.path)
            .filter((p: string) => !isBrandSecondary(p))
            .filter((p: string) => !EXT_NON_OVERRIDABLE(p))
            // the identity absolutes migrate via the BESPOKE pre-pass, invisible to
            // legacyCandidates — a base still holding the old identity rows must not
            // count them as new; and abs-secondary follows the SECONDARY POSTURE
            // (the ensure loop skips it when off — counting it would fire a confirm
            // + extension backfill on every apply, forever).
            .filter((p: string) => !(p === 'base/absolute/brand' && baseVars.has('brand-primary/identity')))
            .filter((p: string) => !(p === 'base/absolute/brand-alt'
              && (baseVars.has('brand-secondary/identity') || !(baseHasSecondary || hasSecondary))))
            // C49: a path an textUpshift will FILL by rename is not new — and a vacating
            // ink/10 name is new even though a row currently squats on it (the strong
            // pen moves out; the between stop that replaces it needs the full new-row
            // treatment: confirm + extension backfill so every brand carries its own).
            // ⚠️ textUpshifts entries are OLD-spelling ('<fam>/ink/N', pre-register — the
            // vintage this C49 detection targets predates A1) while p here is the
            // zone-prefixed emitted path; pen rows are always base/ (a scale row, never
            // a utility row), so the comparison hardcodes the prefix rather than value-
            // importing payload.registerPath (would drag the engine into the sandbox
            // bundle — see the header comment).
            // Stage B (names only): textUpshifts computes in the PRE-Stage-B leaf
            // spelling above (ink/10, ink/11, ink/12 — stop index, not display name; the
            // detection predates A1, untouched). p, though, is the CURRENT payload path.
            // Map the upshift leaf through the leaf rename before comparing; small local
            // map (index-keyed), no payload value-import (keeps the engine out of the
            // sandbox bundle).
            .filter((p: string) => !textUpshifts.some(([, to]) => 'base/' + stageBInkLeaf(to) === p))
            .filter((p: string) => textUpshifts.some(([from]) => 'base/' + stageBInkLeaf(from) === p)
              || (!baseVars.has(p) && !legacyCandidates(p).some(lp => baseVars.has(lp))))
        : []

      // Nudge before surprising changes (v1's idiom — each needs a second Apply):
      // overwriting a brand, ADDING the file's secondary, or CREATING solve columns on an
      // existing base (restoring a hand-deleted half). The confirm is REASON-SCOPED:
      // the UI echoes back the exact
      // token it confirmed, so an overwrite confirm armed earlier can never authorize a
      // posture flip ticked afterwards. Batch paths pass confirmed:true (their arm step is
      // the confirm — the arm copy names the flip when the toggle is on).
      const overwrite = !!existingExt
      const addingSecondary = hasSecondary && !!baseMatch && !baseHasSecondary
      const reasons: string[] = []
      if (overwrite) reasons.push(`overwrite "${brand}"`)
      if (addingSecondary) reasons.push(
        'add a brand-alt group to the base and update every existing brand with its derived brand-alt')
      if (missingCols.length) reasons.push(
        `add the ${missingCols.join(' + ')} column(s) to the base and regenerate ${extsOfBase.length ? `all ${extsOfBase.length} existing brand extension(s)` : 'the file'} to fill them (existing column values stay untouched)`)
      if (newRows.length) reasons.push(
        `add ${newRows.length} new base token(s) (${newRows.slice(0, 3).join(', ')}${newRows.length > 3 ? ', …' : ''}) and regenerate ${extsOfBase.length ? `all ${extsOfBase.length} existing brand extension(s)` : 'the file'} so each brand carries its own values there`)
      const confirmToken = reasons.join(' | ')
      const authorized = confirmed === true || (typeof confirmedToken === 'string' && confirmedToken === confirmToken)
      if (!authorized && reasons.length) {
        // the duplicate footgun: a mass of "new" base tokens
        // usually means EXISTING rows were not recognized (a renamed group, stripped
        // stamps) — clicking through would duplicate the base. Say so, and make the
        // confirm impossible to miss (the quiet in-panel message read as "nothing
        // happens").
        const massNew = newRows.length > 20
          ? ' If these tokens already exist in the collection under other names, do NOT re-apply — report it instead.' : ''
        figma.ui.postMessage({ type: 'confirm', brand, token: confirmToken, message: `Will ${reasons.join(' + ')} — click Apply again.${massNew}` })
        figma.notify(`OKChroma: confirmation needed — ${reasons.length === 1 ? reasons[0].split(' and ')[0] : reasons.length + ' changes'} (see the plugin panel, then Apply again)`)
        return
      }

      // ── base: find or create ──────────────────────────────────────────────────
      const created = !baseMatch
      const base = baseMatch ?? figma.variables.createVariableCollection(BASE_NAME)
      base.setPluginData(OWNER_KEY, 'base')
      // visibility for every resolution that was NOT the tag (see the ladder above)
      if (adoptedHow) figma.notify(`OKChroma: adopted "${base.name}" as the base collection (matched by ${adoptedHow}); it is tagged now and any name works from here on`)
      else if (created) figma.notify(`OKChroma: created a fresh base collection "${BASE_NAME}" — no existing collection matched`)
      // the rebuild stores its seed as FILE state: every later apply's UI builds the base
      // column from it (the file-state handshake), so diffs stay against THIS base
      if (rebuildBase && typeof baseSeedHex === 'string') base.setPluginData(BASE_SEED_KEY, baseSeedHex)
      // the DESCOPE POSTURE: the UI sends its checkbox on every apply —
      // single, re-apply, rebuild, backfill all carry it — so this branch is the
      // live path; stamp it as this file's new posture and use it. The absent case only
      // guards a hand-crafted message (an older UI build): fall back to
      // whatever is already stamped, defaulting ON (primitives hidden) if nothing ever was.
      // Consumed by ensure() below, so a scope hand-edited in Figma always reverts on the
      // very next apply, whichever path sent it.
      if (typeof descopePrimitives === 'boolean')
        base.setPluginData(DESCOPE_KEY, descopePrimitives ? 'true' : 'false')
      const descopeOn = typeof descopePrimitives === 'boolean'
        ? descopePrimitives
        : base.getPluginData(DESCOPE_KEY) !== 'false'

      // ── feature-detect (plan §2.2): extended collections are Enterprise-only.
      // BEFORE any mode mutation: a failed upgrade must not leave half-flipped,
      // unseeded columns that the live detection would then read as "already on"
      // forever.
      if (typeof base.extend !== 'function') {
        if (created) base.remove() // leave no husk behind on a non-Enterprise file
        figma.ui.postMessage({ type: 'error', message: ENTERPRISE_MSG })
        return
      }

      // ── one mode per ACTIVE solve column, resolved by STORED ID then canonical
      // name (rename-proof; never positional slot-reuse — anything unresolvable is
      // left untouched and the missing column is CREATED, behind the missingCols
      // confirm above). Exactly
      // one exception: a FRESH collection's unnamed default mode is adopted for
      // the first column (it carries the values). The full mapping re-stamps
      // after resolution so future renames stay free.
      const colIds: string[] = []
      const usedCols = new Set<string>() // distinctness guard: a corrupt stamp mapping two columns to one mode must not merge lanes
      for (let i = 0; i < activeCols.length; i++) {
        const name = activeCols[i]
        const resolved = resolveCol(name)
        if (resolved && !usedCols.has(resolved)) {
          // adopted under its LEGACY name → rename in place. The modeId, and therefore
          // every binding, is untouched. A mode the USER renamed is left exactly alone.
          const cur = base.modes.find(m => m.modeId === resolved)
          if (cur && cur.name === LEGACY_COLUMN_NAME[name]) base.renameMode(resolved, name)
          colIds.push(resolved); usedCols.add(resolved); continue
        }
        if (i === 0 && created) {
          base.renameMode(base.modes[0].modeId, name)
          colIds.push(base.modes[0].modeId)
          usedCols.add(base.modes[0].modeId)
          continue
        }
        const added = base.addMode(name)
        colIds.push(added)
        usedCols.add(added)
      }
      base.setPluginData(COLS_KEY, JSON.stringify(Object.fromEntries(activeCols.map((c, i) => [c, colIds[i]]))))

      // ── populate the base: CREATE-ONCE from the default seed ─────────────────
      // Existing base values are never rewritten (extensions diff against them); every
      // apply restamps description + scopes. THE DESCOPE POSTURE (default ON;
      // role-based): the ramp stops and
      // alpha/abs plumbing are implementation detail — the state-carrying roles (the
      // cta bands, the link trio, the surface planes) are what a designer should bind —
      // so descopeOn hides the non-role rows from every picker (scopes = []) while the
      // role rows always keep ALL_SCOPES. Off exposes everything. Re-stamped every
      // apply regardless of rebuildBase, so a scope hand-edited in Figma's own panel
      // always reverts on the next apply.
      // The role-row band list: the stamp/ state band (payload.ROLE_BANDS' one entry)
      // + the surfaces (code.ts's own rows), the opacity ladder and the link group
      // (whose prefix also carries the inverse leaves).
      const isRoleRow = (p: string): boolean =>
        /\/stamp\//.test(p)
        || p.startsWith('base/link/')
        || p.startsWith('utility/surface/')
        || p.startsWith('utility/opacity/') // the numbers a designer binds an opacity to
      const withSecondary = baseHasSecondary || hasSecondary
      const seedByCol = new Map<Column, Map<string, FlatTok>>(
        activeCols.map(c => [c, new Map(baseTokens[c].map(t => [t.path, t]))]))
      let createdVars = 0
      const ensure = (path: string, kind: 'COLOR' | 'FLOAT' = 'COLOR'): figma.Variable => {
        let v = baseVars.get(path)
        // An exact `paper-3` hit that lacks the current generation is a pre-Stage-B
        // index-era row (index stop 3 = the live paper-5), not ours: drop it so the legacy
        // candidates claim paper-2 → paper-3 first. (The old row's own onward move to
        // paper-5 does not follow; CATALOG C63.)
        if (v && path.endsWith('/paper-3') && v.getPluginData(GEN_KEY) !== GEN_CURRENT) v = undefined
        // a direct hit (usually via stamp) whose display name is any ENGINE spelling
        // of this path — a stale generation or invisibly-off — heals to canonical;
        // a genuinely custom name stays (isEngineSpelling, the doctrine's other half)
        if (v && v.name !== path && isEngineSpelling(v.name, path)) v.name = path
        if (!v) for (const legacyPath of legacyCandidates(path)) {
          const legacy = baseVars.get(legacyPath)
          // The same collision from the other side: a `paper-3` candidate that CARRIES
          // the current generation is the live paper-3 (written or claimed this apply),
          // never paper-5's index-era vintage. On a fresh base nothing older answers
          // paper-5's earlier candidates, so without this its lookup consumes the
          // paper-3 row created a moment before and the ramp ships one stop short.
          if (legacy && legacyPath.endsWith('/paper-3') && legacy.getPluginData(GEN_KEY) === GEN_CURRENT) continue
          if (legacy) {
            if (legacy.name === legacyPath || isEngineSpelling(legacy.name, path)) legacy.name = path
            baseVars.delete(legacyPath); baseVars.set(path, legacy); v = legacy; break
          }
        }
        if (!v) { v = figma.variables.createVariable(path, base, kind); baseVars.set(path, v); createdVars++ }
        v.setPluginData(PATH_KEY, path); v.setPluginData(GEN_KEY, GEN_CURRENT) // identity stamp — a panel rename survives future lookups
        // the CROSS-PLUGIN stamp: pluginData is namespaced per plugin,
        // so the Mapper (plugin-unify) can't read the private stamp above. Same identity,
        // shared namespace; restamped every apply exactly like the private one.
        v.setSharedPluginData('okchroma', PATH_KEY, path)
        v.description = describeToken(path) // restamped every apply — regenerated, never hand-kept
        // Web code syntax = the hyphenated display name — follows a rename; raw kebab, no var(--…)
        // zone prefixes stay OUT of dev-facing names: the code
        // syntax matches the CSS var modulo the leading --, and a row migrating zones
        // never breaks an engineer's reference
        v.setVariableCodeSyntax('WEB', v.name.replace(/^(base|utility)\//, '').toLowerCase().replace(/[\s/]+/g, '-'))
        v.scopes = descopeOn && !isRoleRow(path) ? [] : ['ALL_SCOPES']
        return v
      }
      // Pole-aliasing: the on-fill leaves are exact poles by construction — alias them
      // to the base/absolute/* rows so the chip READS as the pole and the poles stay
      // single-source. Emit-layer representation only: a non-pole value (an outline
      // secondary's on-cta rides its pencil-47) falls back to a raw write, so the alias
      // never constrains the solve — the engine still picks the pole per family ×
      // column. (Only the stamp/on leaf: the neutral anchor base/neutral/pen-100 is
      // RESOLVED off the pole by the engine, so it writes raw like any scale leaf. A
      // static-anchor-vintage file's pole ALIAS on that row stands until a base rebuild
      // — create-once is the base contract.)
      const POLE_LEAVES = (path: string) =>
        path.endsWith('/' + STAMP_LEAF.ON)
      // EXACT poles only (per-channel EPS): the engine emits true 0/1 poles, so a
      // loose band buys nothing — and the conversion pass below must never snap a
      // hand-edited near-pole value (#FFFFF8) onto the abs row (a sum-tolerance gate
      // would do exactly that).
      const isPole = (t: { r: number; g: number; b: number; a?: number }) => {
        if (t.a !== undefined && t.a !== 1) return false
        const w = Math.abs(t.r - 1) < EPS && Math.abs(t.g - 1) < EPS && Math.abs(t.b - 1) < EPS
        const k = t.r < EPS && t.g < EPS && t.b < EPS
        return w || k
      }
      const absFor = (t: { r: number; g: number; b: number }) =>
        baseVars.get(t.r + t.g + t.b > 1.5 ? 'base/absolute/white' : 'base/absolute/black')
      // STAMP-EDGE ALIASING ("the rest of them should get aliased to the transparent
      // variable instead of being raw"). BOTH states are aliases, never raw writes:
      // alpha 0 → base/alpha/transparent, the decorative stroke → its rung row
      // (away-from-bg/06/08/16). So the panel reads the token rather than a raw swatch,
      // and the stroke stays single-source. isPole() deliberately rejects alpha≠1, so
      // the poles path can never claim either of these — this is its own rule with its
      // own targets.
      // Takes the path explicitly so BOTH write paths share it — the base seeding below
      // and the per-brand extension overrides ("there is a transparent token that can
      // be aliased to all the rest that are raw"): base rows aliased while overrides go
      // raw is the gap a pole-only router leaves.
      // The rung is carried by the token's own alpha (the engine picks it per family), so the
      // router is a value lookup — no family table to keep in sync with cssRender.ctaBorderRung.
      const strokeFor = (path: string, t: { a?: number }) => {
        if (!path.endsWith('/' + STAMP_LEAF.EDGE)) return undefined
        if (t.a === 0) return baseVars.get('base/alpha/transparent')
        const rung = RUNG_FOR_ALPHA(t.a)
        return rung ? baseVars.get(`base/alpha/${rung}`) : undefined
      }
      // the SOFT ON-CTA (the C43 addendum): a stamp/on leaf carrying a POLE AT PARTIAL
      // ALPHA is the default-model secondary's soft text — alias it onto the
      // base/alpha/ink primitive. isPole() rejects alpha≠1 by design, so without this
      // router these leaves fall through to RAW writes.
      const softInkFor = (path: string, t: { r: number; g: number; b: number; a?: number }) => {
        if (!path.endsWith('/' + STAMP_LEAF.ON)) return undefined
        if (t.a === undefined || t.a >= 1 - EPS || t.a <= EPS) return undefined
        return isPole({ r: t.r, g: t.g, b: t.b }) ? baseVars.get('base/alpha/ink') : undefined
      }
      // (No text-cta sibling aliasing: the payload carries no text-cta reference
      // leaves — the text register IS the pen stops. The footer HEAL converts old
      // files' cta-ink node applications onto those stops.)
      const chEq = (a: { r: number; g: number; b: number; a?: number } | undefined,
        b: { r: number; g: number; b: number; a?: number } | undefined): boolean =>
        !!a && !!b && Math.abs(a.r - b.r) < EPS && Math.abs(a.g - b.g) < EPS
        && Math.abs(a.b - b.b) < EPS && Math.abs((a.a ?? 1) - (b.a ?? 1)) < EPS
      const seedValue = (v: figma.Variable, colId: string, t: FlatTok, col: Column) => {
        // a bare-number row (the opacity ladder) writes its number; nothing aliases it
        if (t.n !== undefined) { v.setValueForMode(colId, t.n); return }
        const target = strokeFor(t.path, t) ?? softInkFor(t.path, t)
          ?? (POLE_LEAVES(t.path) && isPole(t) ? absFor(t) : undefined)
        v.setValueForMode(colId, target ? figma.variables.createVariableAlias(target) : toRGBA(t))
      }
      const seedFresh = (v: figma.Variable, path: string) => {
        for (let i = 0; i < activeCols.length; i++) {
          const seed = seedByCol.get(activeCols[i])!.get(path)
          if (seed) seedValue(v, colIds[i], seed, activeCols[i])
        }
      }
      // C49 upward renumber, EXECUTED (computed + confirmed above): anchor first
      // (its entry is first in the array), then each family's strong pen — the
      // rename keeps the variable id, so user bindings ride to the new name and the
      // vacated ink/10 is created fresh below with the between stop's value.
      for (const [from, to] of textUpshifts) {
        const v = baseVars.get(from)
        if (v && !baseVars.has(to)) {
          if (v.name === from) v.name = to // custom display names stay; the stamp moves identity
          v.setPluginData(PATH_KEY, to); v.setPluginData(GEN_KEY, GEN_CURRENT)
          baseVars.set(to, v); baseVars.delete(from)
        }
      }
      // PANEL ORDER = CREATION ORDER: the team-touchable utility shelf leads so it
      // never buries under the families; the low-usage machinery rows (link, alpha,
      // absolutes) sit LAST in payload order. No alias-target pre-pass: targets create
      // AFTER their consumers, which is safe because seedValue falls back to a raw
      // write when a target is missing and the conversion walk below — which runs
      // after every row exists — re-points every OUR-value raw onto its alias in the
      // same apply. rebuildBase ("redo the main theme") rides the main loop: seedFresh
      // runs for EVERY row — the one sanctioned overwrite of base values (values AND
      // alias idioms).
      ensure('utility/surface/dim')
      // low MUST precede mid: a sunken|low|base|high-vintage file's real low row must
      // direct-hit before mid's legacy lookup consumes that file's base row (the word
      // base has named two planes — see the RENAMED_LEAVES plane notes)
      ensure('utility/surface/low')
      ensure('utility/surface/mid')
      ensure('utility/surface/high')
      // identity re-homes to the system absolutes — bespoke in-place migration
      // (a leaf entry can't express two divergent homes for the same 'identity'
      // leaf); the renamed var keeps its id, bindings and overrides survive. SOURCES
      // stay the old bare spelling ('brand-primary/identity' never carried a register —
      // it is retired by this very migration, not renamed by A1); only the TARGETS carry
      // the base/ zone prefix.
      for (const [oldPath, newPath] of [
        ['brand-primary/identity', 'base/absolute/brand'],
        ['brand-secondary/identity', 'base/absolute/brand-alt'],
      ] as const) {
        const v = baseVars.get(oldPath)
        if (v && !baseVars.has(newPath)) {
          if (v.name === oldPath) v.name = newPath // custom display names stay; the stamp moves identity
          v.setPluginData(PATH_KEY, newPath); v.setPluginData(GEN_KEY, GEN_CURRENT)
          baseVars.set(newPath, v); baseVars.delete(oldPath)
        }
      }
      for (const t of baseTokens[activeCols[0]]) { // all columns share the path set
        if (!withSecondary && (isBrandSecondary(t.path) || t.path === 'base/absolute/brand-alt')) continue
        const before = createdVars
        const v = ensure(t.path, t.n !== undefined ? 'FLOAT' : 'COLOR')
        if (createdVars > before || rebuildBase) seedFresh(v, t.path) // fresh variable (or a rebuild) → seed every active column
      }
      // A base that predates an aliasing idiom holds RAW values: convert a raw value that
      // is exactly what we would have written to the alias (resolution-identical, so the
      // create-once contract is preserved); user-EDITED values are never touched.
      //
      // THIS PASS IS THE OTHER HALF of seedValue's aliasing: seedValue runs only on
      // FRESHLY CREATED variables, so in any real file ensure() finds an existing row,
      // seedFresh never runs, and a raw value would keep its raw form forever ("the
      // alpha transparent didn't take"). Both idioms convert here.
      const strokeTargetFor = (path: string, cur: figma.RGBA, col: Column) => {
        // only OUR values: fully transparent, or a black/white offset at one of our rung alphas
        // (including the RETIRED 0.12, which files in the wild still carry). Anything else is a
        // designer's own border colour and is left exactly alone.
        const a = cur.a ?? 1
        if (Math.abs(a) < EPS) return strokeFor(path, { a: 0 })
        if (!isPole({ r: cur.r, g: cur.g, b: cur.b })) return undefined
        const ours = RUNG_FOR_ALPHA(a) !== undefined || Math.abs(a - RETIRED_RUNG_ALPHA) < EPS
        if (!ours) return undefined
        // target the rung the PAYLOAD wants for this path, not the one the old value implies —
        // a file still holding the retired 12% neutral border must land on 08, not on a 12 row
        // that does not exist.
        const seed = seedByCol.get(col)!.get(path)
        return seed ? strokeFor(path, seed) : undefined
      }
      // A C43-vintage base holds the soft on-cta as a raw rgba (isPole rejects alpha≠1,
      // so neither pole idiom claims it). Convert OUR values only: a pure pole at exactly the
      // alpha the payload wants for this path — a designer's own soft text is left alone.
      const softInkTargetFor = (path: string, cur: figma.RGBA, col: Column) => {
        if (!path.endsWith('/' + STAMP_LEAF.ON)) return undefined
        const seed = seedByCol.get(col)!.get(path)
        if (!seed || !softInkFor(path, seed)) return undefined
        if (!isPole({ r: cur.r, g: cur.g, b: cur.b })) return undefined
        // OUR values only, across both eras: the C43 raw write (alpha = the register) and
        // the PRE-C43 solid pole (alpha 1 — what the base shipped before the soft on-cta
        // existed). Any other alpha is a designer's own soft text and is left alone.
        const a = cur.a ?? 1
        return Math.abs(a - (seed.a ?? 1)) < EPS || Math.abs(a - 1) < EPS ? softInkFor(path, seed) : undefined
      }
      // (No cta-ink raw→alias conversion: cta-ink paths never appear in the payload,
      // so such a pass could never match; an old file's rows stay as they are — the
      // footer HEAL handles their node applications.)
      const retiredNeutralByCol = retiredNeutral && new Map<Column, Map<string, FlatTok>>(
        activeCols.map(c => [c, new Map(retiredNeutral[c].map(t => [t.path, t]))]))
      for (const [path, v] of baseVars) {
        for (let i = 0; i < activeCols.length; i++) {
          const cur = v.valuesByMode[colIds[i]]
          if (!cur) continue
          if (typeof cur === 'number') {
            // a bare-number row (the opacity ladder) has no alias idiom. The unit heal: a
            // row written in the fraction era holds exactly its rung over a hundred and
            // takes the percent, Figma's opacity unit; any other value is a designer's own
            const seed = seedByCol.get(activeCols[i])!.get(path)
            if (seed?.n !== undefined && Math.abs(cur - seed.n / 100) < 1e-6) v.setValueForMode(colIds[i], seed.n)
            continue
          }
          if (isAlias(cur)) {
            // the era-crossing alias ("not updating the main theme"): a base stamp/on
            // seeded PRE-C43 is pole-aliased onto absolute/black|white, and an alias is
            // otherwise never touched — so the base would keep reading the SOLID pole after
            // the payload went soft. OUR abs alias on a path whose seed is soft is exactly the
            // stale half of that migration: re-point it to base/alpha/ink. An
            // alias to any OTHER target is a designer's own wiring and is left alone.
            const seed = seedByCol.get(activeCols[i])!.get(path)
            const soft = seed ? softInkFor(path, seed) : undefined
            const isOurAbs = cur.id === baseVars.get('base/absolute/black')?.id
              || cur.id === baseVars.get('base/absolute/white')?.id
            if (soft && isOurAbs && soft.id !== v.id) v.setValueForMode(colIds[i], figma.variables.createVariableAlias(soft))
            continue
          }
          // the retired-canonical VALUE refresh (see RETIRED_SIGNAL_VALUES): a signal row
          // still holding a prior era's exact canonical takes the payload's current value
          const retired = RETIRED_SIGNAL_VALUES[path]
          if (retired) {
            const seed = seedByCol.get(activeCols[i])!.get(path)
            if (seed && retired.some(h => rgbaMatchesHex(cur, h))) {
              v.setValueForMode(colIds[i], toRGBA(seed))
              continue
            }
          }
          // the retired-DEFAULT neutral refresh (adopt-on-re-apply): a base neutral row
          // still holding exactly the RETIRED default-strength value (shipped as
          // retiredNeutral, = the 'medium' output for this seed) takes the payload's
          // current value. Same conservatism as the signal refresh: any other value is a
          // designer's own and is left alone. Rows from before the tint round hold
          // earlier-era values, don't match, and stay — the explicit rebuild covers them.
          if (retiredNeutralByCol && path.startsWith('base/neutral/')) {
            const old = retiredNeutralByCol.get(activeCols[i])!.get(path)
            const seed = seedByCol.get(activeCols[i])!.get(path)
            if (old && seed && chEq(cur, old) && !chEq(cur, seed)) {
              v.setValueForMode(colIds[i], toRGBA(seed))
              continue
            }
          }
          const target = strokeTargetFor(path, cur, activeCols[i])
            ?? softInkTargetFor(path, cur, activeCols[i])
            ?? (POLE_LEAVES(path) && isPole(cur) ? absFor(cur) : undefined)
          if (target && target.id !== v.id) v.setValueForMode(colIds[i], figma.variables.createVariableAlias(target))
        }
      }
      // ── THE RENAMED ROW'S VALUE ───────────────────────────────────────────────────────────
      // offset-12 → offset-08 is a rename WITH a value change, and ensure() only renames: it
      // adopts the legacy row without bumping createdVars, so seedFresh never runs and the row
      // arrives here still holding 0.12 under its new name. Every cta/border aliasing it then
      // resolves 12% while the token says 08 — the name would lie, which is worse than a raw
      // value. This pass is the other half of that rename; deleting it silently un-does it.
      //
      // Conservative in the same way strokeTargetFor is: only a value that is EXACTLY one of our
      // own rung alphas at a pure pole is rewritten. A designer who re-valued the row keeps it.
      for (const rung of Object.keys(RUNG_ALPHAS)) {
        const v = baseVars.get(`base/alpha/${rung}`)
        if (!v) continue
        for (let i = 0; i < activeCols.length; i++) {
          const cur = v.valuesByMode[colIds[i]]
          if (!cur || typeof cur === 'number' || isAlias(cur)) continue
          const rgba = cur as figma.RGBA
          const a = rgba.a ?? 1
          if (!isPole({ r: rgba.r, g: rgba.g, b: rgba.b })) continue
          const isOurs = RUNG_FOR_ALPHA(a) !== undefined || Math.abs(a - RETIRED_RUNG_ALPHA) < EPS
          if (!isOurs || Math.abs(a - RUNG_ALPHAS[rung]) < EPS) continue
          const seed = seedByCol.get(activeCols[i])!.get(`base/alpha/${rung}`)
          if (seed) v.setValueForMode(colIds[i], toRGBA(seed))
        }
      }
      // Columns CREATED on an existing base (a hand-deleted half being restored —
      // confirmed above): seed them for EVERY base variable, additively. Figma's addMode
      // copies the DEFAULT mode's values into a new mode, so an unseeded new column
      // would silently read the default column's values everywhere. Runs AFTER the
      // ensure loop so legacy names have migrated (cta-1→stamp/fill) and new rows
      // exist; pre-existing columns are never touched (fresh
      // vars were seeded above — re-setting the same seed here is idempotent). Variables
      // whose paths are NOT in the current token set (stale/orphaned) can't be seeded —
      // counted and reported so the default-copy values don't pass silently.
      // NOTE the boundary: only columns THIS apply creates are
      // seeded. A hand-recreated mode carrying the exact canonical name is ADOPTED as-is
      // (values untouched) — the create-once contract cuts that way deliberately:
      // rewriting an adopted column could destroy real user data, and the remedy for a
      // wrong hand-made column is to delete it (the next apply restores it, confirmed +
      // seeded). No withSecondary skip here: this loop only writes vars that already
      // EXIST (it never creates), so a partial secondary group still gets true values
      // instead of addMode's silent default-column copies.
      const addedCols = missingCols
      let orphaned = 0
      if (addedCols.length) {
        const known = new Set(baseTokens[activeCols[0]].map(t => t.path))
        known.add('utility/surface/dim'); known.add('utility/surface/low')
        known.add('utility/surface/mid'); known.add('utility/surface/high')
        for (const p of baseVars.keys()) if (!known.has(p)) orphaned++
        for (const c of addedCols) {
          const idx = activeCols.indexOf(c)
          for (const t of baseTokens[c]) {
            const v = baseVars.get(t.path)
            if (v) seedValue(v, colIds[idx], t, c)
          }
        }
      }
      // Elevation planes — scheme-DIVERGENT aliases, base-only and never overridden:
      // each alias points at the semantic neutral VARIABLE, so under any brand
      // extension it resolves through that brand's paper overrides automatically.
      // Same four stops both schemes, order reversed:
      //   dim  → neutral/paper-5 light · neutral/paper-0 dark
      //   low  → neutral/paper-3 light · neutral/paper-1 dark
      //   mid  → neutral/paper-1 light · neutral/paper-3 dark
      //   high → neutral/paper-0 light · neutral/paper-5 dark
      const p0 = baseVars.get('base/neutral/paper-0')
      const p1 = baseVars.get('base/neutral/paper-1')
      const p2 = baseVars.get('base/neutral/paper-3')
      const p3 = baseVars.get('base/neutral/paper-5')
      if (p0 && p1 && p2 && p3) {
        const planes: Array<[string, figma.Variable, figma.Variable]> = [
          ['utility/surface/dim', p3, p0], ['utility/surface/low', p2, p1],
          ['utility/surface/mid', p1, p2], ['utility/surface/high', p0, p3],
        ]
        for (const [path, light, darkVar] of planes) {
          const v = baseVars.get(path)!
          activeCols.forEach((c, i) => {
            const dark = DARK_COLUMNS.has(c)
            v.setValueForMode(colIds[i], figma.variables.createVariableAlias(dark ? darkVar : light))
          })
        }
      }

      // ── the brand's extension (ONE per brand — the picker stays flat and clean) ──
      // The rename EXECUTES here, past every confirm/abort: the collection keeps its id
      // (bindings + overrides survive); BRAND_KEY and the recipe restamp under the new
      // name just below, so future applies resolve it by the new identity.
      if (renameExt) renameExt.name = brand
      let ext = existingExt ?? renameExt
      if (!ext) {
        try {
          ext = base.extend!(brand)
        } catch (e) {
          if (created) base.remove()
          figma.ui.postMessage({ type: 'error', message: `${ENTERPRISE_MSG} (extend() threw: ${String(e)})` })
          return
        }
      }
      ext.setPluginData(OWNER_KEY, 'brand')
      ext.setPluginData(BRAND_KEY, brand)
      if (spec !== undefined) ext.setPluginData(SPEC_KEY, JSON.stringify(spec)) // the stored recipe
      const extColIds: string[] = []
      for (const baseId of colIds) {
        const m = ext.modes.find(x => x.parentModeId === baseId)
        if (!m) {
          figma.ui.postMessage({ type: 'error', message:
            'The extension’s modes did not map onto the base’s columns (parentModeId) — the extension may predate this base; delete it and re-apply the brand.' })
          return
        }
        extColIds.push(m.modeId)
      }

      // ── overrides: diff every brand token against the LIVE base value, per column ──
      // Equal → ensure NO override (inherit; the blue-highlight story stays honest).
      // Different → setValueForMode routed by the extension's modeId for that column.
      // The contract-invariant system rows are skipped outright (the dim/low/mid/high
      // planes are aliases; the rest are poles every brand shares). The payload always CARRIES a
      // brand-alt (real or derived from the primary); it is WRITTEN only when the
      // file's posture is on — secondary stays opt-in, and once on, every brand derives.
      const secondaryMode: 'real' | 'derived' | 'none' = hasSecondary ? 'real' : (withSecondary ? 'derived' : 'none')
      const brandByCol = new Map<Column, Map<string, FlatTok>>(
        activeCols.map(c => [c, new Map(brandTokens[c].map(t => [t.path, t]))]))
      const work: string[] = []
      for (const t of brandTokens[activeCols[0]]) {
        // The contract-invariant system rows are skipped — EXCEPT the brand-varying
        // rows OVERRIDABLE_SYSTEM names: the link trio (C20: "link is a system
        // level color. It can still be extended" — each brand's extension overrides
        // base/link/* with its own resolved values, its primary's pen stops
        // or its custom link seed) and the identity absolutes.
        if (EXT_NON_OVERRIDABLE(t.path)) continue
        if (secondaryMode === 'none' && (isBrandSecondary(t.path) || t.path === 'base/absolute/brand-alt')) continue
        work.push(t.path)
      }
      // The pole aliases resolve through ONE hop (they point at the raw abs rows) —
      // the diff must compare the brand token against the RESOLVED base color, or
      // every aliased on-fill would read "different" and grow a pointless override.
      const varById = new Map<string, figma.Variable>()
      for (const v of baseVars.values()) varById.set(v.id, v)
      const resolvedBase = (v: figma.Variable, colId: string): figma.RGBA | figma.VariableAlias | undefined => {
        const cur = v.valuesByMode[colId]
        if (typeof cur === 'number') return undefined // number rows never take overrides
        if (isAlias(cur)) {
          const inner = varById.get(cur.id)?.valuesByMode[colId]
          if (inner && typeof inner !== 'number' && !isAlias(inner)) return inner
        }
        return cur
      }
      const overrides = ext.variableOverrides
      let set = 0, removed = 0, inherited = 0
      for (const path of work) {
        const v = baseVars.get(path)
        if (!v) continue
        const cur = overrides[v.id]
        for (let i = 0; i < activeCols.length; i++) {
          const tok = brandByCol.get(activeCols[i])!.get(path)
          if (!tok) continue
          if (valEq(resolvedBase(v, colIds[i]), tok)) {
            if (cur && cur[extColIds[i]] !== undefined) { v.removeOverrideForMode(extColIds[i]); removed++ }
            else inherited++
          } else {
            // a differing override rides the same alias idiom (a flipped on-cta reads
            // "abs-white" in the extension, not an anonymous hex; a cta/border reads
            // "alpha/transparent" or an "alpha/away-from-bg/*" rung rather than a raw invisible swatch;
            // the soft on-cta reads "alpha/ink"). strokeFor/softInkFor come FIRST for the same
            // reason they do at the base seeding: isPole rejects alpha≠1, so the poles rule can
            // never claim an alpha-carrying leaf. ⚠️ THIS is the write path the APPLIED theme
            // shows — brand-alt/stamp/on is an OVERRIDE row (the base posture is the
            // mirror's solid pole), so a router missing HERE ships raw even when the base
            // seeding and the conversion pass both carry it ("not seeing these changes
            // come through in the top level theme").
            const target = strokeFor(path, tok) ?? softInkFor(path, tok)
              ?? (POLE_LEAVES(path) && isPole(tok) ? absFor(tok) : undefined)
            v.setValueForMode(extColIds[i], target ? figma.variables.createVariableAlias(target) : toRGBA(tok))
            set++
          }
        }
      }

      // The posture flips' collection-wide check: this apply just ADDED the secondary
      // group and/or solve columns to an existing base — hand every OTHER extension's
      // stored recipe back to the UI, which re-applies each one (deriving its secondary /
      // filling its new-column overrides). Recipes are stamped per apply; extensions without
      // one are reported for a one-time manual re-apply.
      const secondaryAdded = hasSecondary && !baseHasSecondary && !created
      const rowsAdded = newRows.length > 0 && !created
      const backfill: unknown[] = []
      const unstamped: string[] = []
      if (secondaryAdded || addedCols.length || rowsAdded) {
        for (const e of extsOfBase) {
          if (e.id === ext.id) continue
          const spec = recipeOf(e)
          if (spec === undefined) { unstamped.push(e.name); continue }
          backfill.push(spec)
        }
      }

      // THE APPLY REPORT: every apply ends by SAYING
      // what it did and where — the silent-wrong-target class of failure ("nothing
      // happens") must be impossible to reproduce without a message naming the gap.
      // old-named = rows still answering to a retired spelling after the heal ran;
      // a non-zero count here IS the diagnosis and names its own evidence.
      // stale = stamped identity says one path, the display name spells an ENGINE
      // vintage of it (never a custom name; suffix-matching raw old spellings false-
      // positived on rows like base/alpha/transparent whose CURRENT leaf is also a
      // retired flat source)
      const postVars = (await figma.variables.getLocalVariablesAsync()).filter(v => v.variableCollectionId === base.id)
      const oldNamed = postVars.filter(v => {
        const stamp = v.getPluginData(PATH_KEY)
        return !!stamp && v.name !== stamp && isEngineSpelling(v.name, stamp)
      })
      figma.notify(`OKChroma: applied "${brand}" → collection "${base.name}" · ${createdVars} rows created · ${oldNamed.length} old-named rows left${oldNamed.length ? ` (${oldNamed.slice(0, 3).map(v => v.name).join(', ')}${oldNamed.length > 3 ? ', …' : ''}) — report this message` : ''}`)
      figma.ui.postMessage({ type: 'done', brand, set, removed, inherited, createdVars, baseCreated: created, secondary: secondaryMode, secondaryAdded, addedCols, rowsAdded, orphaned, backfill, unstamped, staleApcaCols })
    }
    try {
      await withFontRetry(applyOnce)
    } catch (err) {
      figma.ui.postMessage({ type: 'error', message: String(err) })
    }
  } else if (msg.type === 'collect-specs') {
    // Manual "Re-apply all brands": return every extension's stored recipe; the UI
    // rebuilds payloads (the engine lives there) and runs them through the apply path.
    try {
      const collections = await figma.variables.getLocalVariableCollectionsAsync()
      const base = collections.filter(c => !isExtension(c)).find(c => c.getPluginData(OWNER_KEY) === 'base')
      const exts = base ? collections.filter(isExtension).filter(e => e.rootVariableCollectionId === base.id) : []
      const specs: unknown[] = []
      const unstamped: string[] = []
      for (const e of exts) {
        const spec = recipeOf(e)
        if (spec === undefined) { unstamped.push(e.name); continue }
        specs.push(spec)
      }
      // the reason echoes back verbatim: the UI routes a 'list' reply to the edit-picker
      // cache and everything else into the batch flows — without the tag, the picker's
      // startup request would START a re-apply batch
      figma.ui.postMessage({ type: 'specs', specs, unstamped, reason: (msg as { reason?: string }).reason })
    } catch (err) {
      figma.ui.postMessage({ type: 'error', message: String(err) })
    }
  } else if (msg.type === 'close') {
    figma.closePlugin()
  }
}
