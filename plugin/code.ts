/// <reference path="./figma-env.d.ts" />

// zero-import text modules — safe here, drag nothing of the engine into the sandbox bundle
import { describeToken } from '../src/engine/tokenDescriptions'
import { STAMP_LEAF } from '../src/engine/tokenNames'

figma.showUI(__html__, { width: 720, height: 640, title: 'OKChroma' })

type TokenLeaf = { $type: 'color'; $value: { components: [number, number, number]; alpha?: number } }
type TokenNode = TokenLeaf | { [k: string]: TokenNode }

// A per-brand raw ramp, written into the `primitive` collection under
// brand/<brand>/<role>/* (role = primary | secondary).
interface BrandRamp { role: string; light: TokenNode; dark: TokenNode }

// A shared ramp (neutral / signal). Written ONCE into `primitive` at `prim`
// (e.g. system/neutral/default-h330 or system/neutral/pure, system/yellow/lemon) and aliased from the
// `theme` collection's `theme` group (neutral, yellow, …). light/dark are
// only consulted the first time a variant is created (grow-on-demand).
interface SharedRamp { theme: string; prim: string; light: TokenNode; dark: TokenNode }

// Two reserved collections. Names are the lookup contract; the plugin-data
// marker records that the plugin owns them.
// The raw/primitive layer. Named "mode" because this is the collection that
// carries the Light/Dark mode switch designers toggle.
const MODE_NAME = 'mode'
const THEME_NAME = 'theme'
// Each owned collection is tagged with its role ('mode' | 'theme') under this
// key, so we can find it again even after the user renames it. The name is only
// a fallback for the very first run.
const OWNER_KEY = 'okchroma'
// The contrast profile a pair was solved under, tagged per collection (absent =
// wcag: every pre-profile file is wcag by construction). A file never MIXES
// profiles inside a pair — a mismatched apply forks a second, SUFFIXED pair.
// ASYMMETRIC NAMING (owner call): the original pair is NEVER renamed — one-lane
// files keep plain "theme"/"mode" forever and downstream pipelines pointed at
// them never break; only the forked addition carries the suffix. Hyphen +
// lowercase full word ("theme-apca") is slug-safe and a one-line Style
// Dictionary strip (`replace(/-(apca|wcag)$/,'')`) if a consumer wants it gone.
const PROFILE_KEY = 'okchroma-profile'
// The mode collection's Light/Dark modeIds (JSON), stamped every apply — the
// modes' rename-proofing (owner 2026-07-27): display names are the user's to
// change, the stored ids are the contract (the collections' tag idiom).
const MODE_IDS_KEY = 'okchroma-mode-ids'
// Each apply stamps its input recipe here (owner 2026-08-28, the ext SPEC_KEY idiom
// ported): ONE JSON map on the THEME collection, keyed by lower-cased brand — what
// powers "Edit applied theme" and "Re-apply all brands" without retyping. A brand
// applied before recipes existed is RECONSTRUCTED from the file in collect-specs.
const SPEC_KEY = 'okchroma-spec'
// Variable identity (owner 2026-08-10): the canonical path lives in plugin data — the
// NAME is display, free for the user to edit in the variables panel; every lookup
// resolves the stamp first (the modes' rename-proof idiom, applied to variables).
const PATH_KEY = 'okchroma-path'
type Profile = 'wcag' | 'apca'
const profileOf = (c: figma.VariableCollection): Profile => (c.getPluginData(PROFILE_KEY) === 'apca' ? 'apca' : 'wcag')
const pairName = (role: string, profile: Profile) => `${role}-${profile}`
// Legacy posture stamp, now written only into APCA-pair files (their solve lane can't be
// described with WCAG conformance phrases). WCAG files get per-variable descriptions from
// tokenDescriptions.ts — the old shared stamp's ratio digits polluted Figma's picker
// search, which fuzzy-matches descriptions.
const profileStamp = (profile: Profile) =>
  profile === 'apca' ? 'OKChroma · contrast: APCA (Lc 30/75/90)' : 'OKChroma · contrast: WCAG (3:1/4.5/7:1)'

// Token renames (old leaf → new leaf), migrated IN PLACE on the existing variable —
// Figma keeps the variable id on rename, so user bindings survive (owner 2026-07-09:
// cheap by design; a future rename is one more entry). Mirrored in plugin-ext/code.ts.
// The ink renumber entries (owner 2026-07-10) shift every name DOWN by one; they are
// safe only because tokens are processed in ladder (ascending) order and each migration
// self-deletes its consumed key — new ink-10 eats old ink-11 BEFORE new ink-11 is looked
// up, so the direct map.get never wrongly hits a stale same-name variable. Any future
// renumber must keep that ascending order.
const RENAMED_LEAVES: Array<[string, string]> = [
  // ── CONFORMANCE-SUFFIX DROP + FAMILY RENAME (owner 2026-08-21): the aa/aaa
  // signifiers leave the NAMES (descriptions keep the conformance lines, so an
  // "aaa" search still lands); brand/secondary → brand/alt rides RENAMED_GROUPS,
  // the per-brand prim groups ride the bespoke mid-segment pass (primByName
  // migration). Same indices, same values — a relabel, not a renumber.
  ['mark-74-aa', 'wax-74'],
  ['ink-53-aa', 'lead-53'],
  ['ink-42-aa', 'ink-42'],
  ['ink-30-aaa', 'ink-30'],
  ['abs-secondary', 'abs-alt'],
  // ── GUARANTEE-ROUND PASS 1 (owner 2026-08-27): ink-53 → lead-53, the band-word
  // split the group guarantees need ("ink is guaranteed on every wash" must not
  // implicate the papers-only stop). Name only, same index, same values; every
  // older ink-53-vintage source above/below already points straight at lead-53
  // (the one-hop rule).
  ['ink-53', 'lead-53'],
  // ── GUARANTEE-ROUND (owner 2026-08-28): mark-74 → wax-74 (band word mark → wax).
  // Name only, same index, same values; every older mark-vintage source below
  // already points straight at wax-74 (the one-hop rule).
  ['mark-74', 'wax-74'],
  // link nesting (owner 2026-08-31, the same round family): the flat trio + the
  // inverse leaves fold into state subgroups — link/{default,inverse}/{enabled,
  // hover,pressed}. The rest word enabled RETURNS (nesting needs a rest leaf;
  // default became the group word). Every vintage link source below retargets
  // straight at the new homes (one hop).
  ['link/default', 'link/default/enabled'],
  ['link/hover', 'link/default/hover'],
  ['link/pressed', 'link/default/pressed'],
  ['link/inverse', 'link/inverse/enabled'],
  ['link/inverse-hover', 'link/inverse/hover'],
  ['link/inverse-pressed', 'link/inverse/pressed'],
  // the offset ladder regains a word (same 2026-08-31 round): direction relative to
  // the page background, two-digit rungs harmonizing with shadow-04/08/12. The
  // vintage offset-XX sources below retarget straight at the new homes (one hop).
  ['alpha/006', 'alpha/away-from-bg/06'],
  ['alpha/008', 'alpha/away-from-bg/08'],
  ['alpha/016', 'alpha/away-from-bg/16'],
  // solid → stamp (same round): the 2026-08-18 solid generation becomes a vintage;
  // the cta-era sources below already re-target straight to stamp/ (one hop).
  ['solid/fill', 'stamp/fill'],
  ['solid/fill-hover', 'stamp/fill-hover'],
  ['solid/fill-pressed', 'stamp/fill-pressed'],
  ['solid/edge', 'stamp/edge'],
  ['solid/on', 'stamp/on'],
  // ── LINK-INVERSE REGROUP (owner 2026-08-20): the inverse trio folds INSIDE the
  // link group (its solo group lasted one day, 2026-08-19..20). Multi-segment
  // leaves — the suffix match carries the group word, so system/link/inverse finds
  // a file's system/link-inverse/default and renames it in place.
  ['link-inverse/default', 'link/inverse/enabled'],
  ['link-inverse/hover', 'link/inverse/hover'],
  ['link-inverse/pressed', 'link/inverse/pressed'],
  // ── SOLID RENAME + REGROUPS (owner 2026-08-18): the cta words → the solid/ state
  // group (fill/fill-hover/fill-pressed/edge/on); the paper overlays fold into the
  // overlay/ subgroup; planes sunken|base → dim|mid; scrim → abs-black-060; the
  // offset ladder drops its word (006/008/016). These CURRENT-name entries must stay
  // FIRST: they are exactly what a 2026-08-12-era file holds as its real variables.
  // the link rest state followed the solid group's word change (owner 2026-08-18:
  // enabled died with the cta words) — and the word RETURNED with the 2026-08-31
  // nesting (default became the group, so the rest leaf is enabled again)
  ['link/enabled', 'link/default/enabled'],
  ['cta/enabled', 'stamp/fill'],
  ['cta/hover', 'stamp/fill-hover'],
  ['cta/pressed', 'stamp/fill-pressed'],
  ['cta/border', 'stamp/edge'],
  ['cta/on', 'stamp/on'],
  // the overlays are PARKED (owner 2026-08-18, third call the same day: "remove them
  // for now and come back") — nothing emits or refreshes paper-LL-overlay any more.
  // These entries KEEP consolidating every shipped spelling (the 08-13 original and
  // the hours-lived overlay/ subgroup build) onto the parked flat name, the cta-ink
  // precedent: old rows are FOUND and renamed to one recognizable retired home
  // (then orphan-reported) rather than silently left under vintage names.
  ['paper-overlay-99', 'paper-99-overlay'],
  ['paper-overlay-97', 'paper-97-overlay'],
  ['paper-overlay-95', 'paper-95-overlay'],
  ['overlay/paper-99', 'paper-99-overlay'],
  ['overlay/paper-97', 'paper-97-overlay'],
  ['overlay/paper-95', 'paper-95-overlay'],
  ['surface/sunken', 'surface/dim'],
  // ⚠️ the word base's THIRD life (page plane pre-08-12 → raised plane to 08-18 →
  // retired): this entry consumes an 08-12-era file's base row into mid. A pre-08-12
  // file's base row (the PAGE plane) still belongs to surface/low via the entry
  // further down — resolution ORDER disambiguates, see the plane-order note there.
  ['surface/base', 'surface/mid'],
  ['alpha/scrim', 'alpha/abs-black-060'],
  ['alpha/offset-06', 'alpha/away-from-bg/06'],
  ['alpha/offset-08', 'alpha/away-from-bg/08'],
  ['alpha/offset-16', 'alpha/away-from-bg/16'],
  // ── BAND FLATTENING (owner 2026-08-12): ramp leaves sit FLAT in the family group
  // again — paper-99, wash-92, wax-74, lead-53 … (band word + hyphen + level, the
  // engine's own token names). The 2026-07-27 band nesting (paper/99 …) is retired; only
  // the cta STATE group still nests. These CURRENT-name entries MUST precede everything
  // below: legacyCandidates tries entries in table order, and the banded spellings are
  // exactly what a Stage-B-era file holds as its real, current variables.
  ['paper/100', 'paper-100'],
  ['paper/99', 'paper-99'],
  ['paper/97', 'paper-97'],
  ['paper/95', 'paper-95'],
  ['wash/92', 'wash-92'],
  ['wash/89', 'wash-89'],
  ['wash/85', 'wash-85'],
  ['wash/80', 'wash-80'],
  ['mark/74-aa', 'wax-74'],
  ['ink/53-aa', 'lead-53'],
  ['ink/42-aa', 'ink-42'],
  ['ink/30-aaa', 'ink-30'],
  ['ink/0', 'ink-0'],
  // ── the pre-banding flat vintage (leaf shapes before 2026-07-27; every target below
  // points STRAIGHT at the final flat home — the one-hop rule). A 07-10-vintage file
  // holds BOTH ink-11 (scale, hyphen flat) and ink-12 (anchor, hyphen flat) —
  // resolving ink-30 must consume ink-11 before the pre-renumber
  // ['ink-12','ink-30'] entry can capture the anchor. Ascending
  // processing + self-deleting consumed keys keep the chains sound, exactly
  // as the renumber round.
  ['paper-0', 'paper-100'],
  ['paper-1', 'paper-99'],
  ['paper-2', 'paper-97'],
  ['paper-3', 'paper-95'],
  ['wash-4', 'wash-92'],
  ['wash-5', 'wash-89'],
  ['wash-6', 'wash-85'],
  ['wash-7', 'wash-80'],
  ['highlight-8', 'wax-74'],
  // highlight-9 / on-highlight are DEAD (the 2026-07-29 collapse orphaned them; no
  // current token answers to either) — kept only so an old file's row is still
  // FOUND (renamed to its retired banded home, then reported as an orphan) rather
  // than silently left under its ancient flat name. No Stage B target: retired
  // before Stage B, no leaf of theirs survives to relabel.
  ['highlight-9', 'highlight/9'],
  // ── ink flats under C49 numbering (mirrors plugin-ext; the 07-10-era flat vintage
  // maps number-true now that the strong ink and anchor have their old numbers back).
  // Targets point straight at the final FLAT homes (band flattening, 2026-08-12).
  // ⚠️ UNSUPPORTED SURFACE NOTE (C49): the upward renumber pre-pass (banded ink/10 →
  // ink/11 on C33-era files, freeing ink/10 for the between stop) is implemented in
  // plugin-ext ONLY. A C33-era community file re-applied here will hand its old
  // strong-ink row to the new stop. Community is currently unsupported; port the
  // inkUpshifts idiom from plugin-ext/code.ts before re-listing.
  ['ink-9', 'lead-53'],
  ['ink-10', 'lead-53'],
  ['ink-11', 'ink-30'],
  // (['ink-12','ink-0'] lives below with the system-root anchor rescue — one merged
  // entry serves both lanes now that the family home is bare ink-0 too)
  // ── STAGE-B BANDED ENTRIES for spellings the flattening batch at the top does not
  // already cover (the pre-Stage-B banded digit vintage, 2026-07-27 → 2026-08-07).
  // Ordering note kept from Stage B: a banded-digit file holds both ink/9 (first
  // text) and ink/10 (the between stop) as two DIFFERENT real variables; resolving
  // lead-53 (stop 9) must consume this batch's ink/9 BEFORE the collapse-era
  // ink/10 entry further down ever gets a chance to (wrongly) claim a real
  // between-stop row.
  ['paper/0', 'paper-100'],
  ['paper/1', 'paper-99'],
  ['paper/2', 'paper-97'],
  ['paper/3', 'paper-95'],
  ['wash/4', 'wash-92'],
  ['wash/5', 'wash-89'],
  ['wash/6', 'wash-85'],
  ['wash/7', 'wash-80'],
  ['highlight/8', 'wax-74'],
  ['ink/9', 'lead-53'],
  ['ink/10', 'ink-42'],
  ['ink/11', 'ink-30'],
  ['ink/12', 'ink-0'],
  // ── REQUIREMENT-CODE HEAL (owner 2026-08-07, names only): C54 shipped the banded
  // r-floor leaves (mark/74-r300, ink/53-r450, ink/42-r650, ink/30-r700) for part of
  // one day; a file applied under that build carries them as its CURRENT names.
  // One-hop, no chaining: targets follow the final flat homes.
  ['mark/74-r300', 'wax-74'],
  ['ink/53-r450', 'lead-53'],
  ['ink/42-r650', 'ink-42'],
  ['ink/30-r700', 'ink-30'],
  ['cta', 'stamp/fill'],
  ['cta-hover', 'stamp/fill-hover'],
  ['cta-pressed', 'stamp/fill-pressed'],
  ['cta-border', 'stamp/edge'],
  ['on-cta', 'stamp/on'],
  ['on-highlight', 'highlight/on'],
  // cta-ink DIED 2026-08-12 (the trio was pure aliases onto the ink stops; deleted
  // with the band flattening). These entries keep their RETIRED banded homes on
  // purpose — the highlight-9 precedent: an ancient flat row is still FOUND and
  // renamed to a recognizable retired name (then reported as an orphan) rather than
  // silently left. Nothing emits or refreshes cta-ink any more; existing rows are
  // aliases onto the ink stops and keep resolving.
  ['cta-ink', 'cta-ink/enabled'],
  ['cta-ink-hover', 'cta-ink/hover'],
  ['cta-ink-pressed', 'cta-ink/pressed'],
  // ── historical retargets, pointed STRAIGHT at the final homes (the
  // one-hop rule — legacyCandidates never chains). The ink renumber entries
  // shift names DOWN; safe because tokens process in ladder (ascending) order
  // and each migration self-deletes its consumed key — new ink/10 eats old
  // ink-11 BEFORE ink/11 is looked up. This entry catches a pre-C33 file's ink/10
  // (that vintage's FIRST TEXT stop) — a DIFFERENT thing than a banded-era file's
  // ink/10 (the between stop, C49); the Stage-B batch above resolves
  // lead-53 off such a file's own ink/9 FIRST, so this entry only fires once
  // that candidate is absent — it never steals a real between-stop row.
  ['cta-stroke', 'stamp/edge'],
  ['ink/10', 'lead-53'],
  ['ink-11', 'lead-53'],
  ['ink-12', 'ink-30'],
  ['ink-13', 'ink-0'],
  // blue-signal variant relabels (2026-07-13, info-color → blue): the variant leaf is
  // label + resolved light-cta hex (variantKey), so the relabel needs per-lane entries.
  ['magenta-de8df6', 'magenta-side-de8df6'],
  ['magenta-e290f9', 'magenta-side-e290f9'],
  ['blue-7cb3f9', 'cyan-side-7cb3f9'],
  ['blue-7eb5fb', 'cyan-side-7eb5fb'],
  // cta semantic rename (owner 2026-07-16: states, never options), retargeted to
  // the cta state homes; cta/pressed is a newer token.
  ['cta-1', 'stamp/fill'],
  ['cta-2', 'stamp/fill-hover'],
  // stop-3 rename (owner 2026-07-24, elevation round) retargeted to its final flat
  // home — it is a surface plane in both themes. Pure relabel, same color.
  ['wash-3', 'paper-95'],
  // the anchor's flat home 'ink-0' (band flattening, 2026-08-12): the family anchor's
  // banded ink/0 home is covered by the flattening batch at the top; its ink-13/ink-12
  // flat vintages ride the ['ink-13','ink-0'] entry above and ['ink-12','ink-0'] here.
  // (The system-root prim lane this entry also served retired 2026-08-28 with the
  // STATIC_UTILS system/ink-0 row — the resolved anchor rides the neutral tint prim;
  // old files' system-root vintages orphan unwritten.)
  ['ink-12', 'ink-0'],
  // ── ELEVATION-PLANE RENAME (owner 2026-08-12): sink|base|lift|pop →
  // sunken|low|base|high — the old "base" gave the PAGE plane too much semantic
  // weight when components actually sit on the raised plane; the two darkest planes
  // are edge cases and read as such now. ⚠️ 'base' SURVIVES BUT MOVES PLANES (the
  // old lift — cards/menus — is the new base), so ORDER is load-bearing twice over:
  // surface/low must be RESOLVED before surface/base wherever these rows are ensured
  // (STATIC_UTILS + SYSTEM_GLOBALS list order below) — an exact-name hit on a file's
  // old base row would otherwise hand the PAGE plane's variable (and its bindings)
  // to the cards name before the low-lookup could consume it.
  ['surface/sink', 'surface/dim'],
  ['surface/base', 'surface/low'],
  ['surface/lift', 'surface/mid'],
  ['surface/pop', 'surface/high'],
  // elevation planes went 2 → 4 (owner spec, 2026-07-24; that round's sink/base/
  // lift/pop names retired by the 2026-08-12 rename above): the old pair migrates to
  // its closest role IN PLACE (bindings survive; their light stop shifts one rung per
  // the new ladder — raised p0→p1, sunken p2→p3). These entries point STRAIGHT at the
  // final surface/ homes: legacyCandidates expands one hop only, so a chained
  // old→mid→new table would strand pre-elevation files on the middle name.
  ['paper-raised', 'surface/mid'],
  ['paper-sunken', 'surface/dim'],
  // system regroup (owner 2026-07-27): planes → system/surface/*, alpha-carrying
  // utilities → system/alpha/*, link trio → system/link/* with state leaves.
  // abs-black/abs-white stay at the system root. Same-value moves, no ladder shift.
  ['sink', 'surface/dim'],
  ['base', 'surface/low'],
  ['lift', 'surface/mid'],
  ['pop', 'surface/high'],
  ['transparent', 'alpha/transparent'],
  ['scrim', 'alpha/abs-black-060'],
  ['link', 'link/default/enabled'],
  ['link-hover', 'link/default/hover'],
  ['link-pressed', 'link/default/pressed'],
]
// Group renames (old path prefix → new), migrated in place like the leaves.
// History: info-color → blue by identity (2026-07-13); then the signal ROLE
// round (owner 2026-07-27) moved the THEME groups to role names — signals are
// the re-pointable in-between tier, so identity names would lie under a future
// info-from-secondary option. The PRIMITIVE lanes keep identity paths
// (system/red/… — machinery, hidden), so the system/info-color entry still
// points at system/blue. Theme-side entries point STRAIGHT at the final role
// homes (legacyCandidates expands one group hop only — a chained
// info-color→blue→info table would strand pre-C17 files on the middle name).
// the offset ladder's rung alphas, keyed by row name (mirrors plugin-ext/code.ts —
// duplicated by the same sandbox rule: an import from cssRender would drag the engine
// into this bundle). Used by the stamp/edge router to turn a leaf's own alpha into
// its system/alpha row.
const RUNG_ALPHAS: Record<string, number> = { 'away-from-bg/06': 0.06, 'away-from-bg/08': 0.08, 'away-from-bg/16': 0.16 }

const RENAMED_GROUPS: Array<[string, string]> = [
  // the 2026-08-21 family rename: the theme-layer role group brand/secondary → brand/alt
  ['brand/secondary/', 'brand/alt/'],
  ['system/info-color/', 'system/blue/'],
  ['info-color/', 'info/'],
  ['red/', 'critical/'],
  ['yellow/', 'warning/'],
  ['green/', 'positive/'],
  ['blue/', 'info/'],
]
// Every legacy spelling of `path` under the rename tables: old leaf, old group, and
// old group + old leaf together (a file untouched since before BOTH renames needs the
// composed lookup — e.g. system/info-color/ink-11 → system/blue/ink/53-aa).
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
// Invisible-rename normalization (owner defect 2026-08-27, ext-plugin mirror: a group
// renamed and restored with a trailing space left every unstamped row unfindable). A
// normalized key matches names differing only by segment-edge whitespace or letter
// case; the token grammar is all-lowercase, so a genuinely custom name never
// normalizes onto an engine path. Stamps and exact names always win.
const normPath = (p: string) => p.split('/').map(s => s.trim()).join('/').toLowerCase()

// Is `name` an ENGINE spelling of `path` — canonical or any legacy vintage? (ext-plugin
// mirror, owner defect 2026-08-27: a display name spelling a RETIRED engine path is a
// stale generation, not a custom name — it must follow the rename. Only names outside
// the entire engine grammar are the user's.)
const isEngineSpelling = (name: string, path: string): boolean => {
  const n = normPath(name)
  return n === normPath(path) || legacyCandidates(path).some(lp => normPath(lp) === n)
}

// Look up `path` in `map`, first as-is, then under each legacy spelling. Every hit is
// (re)stamped with PATH_KEY — that heals unstamped rows found by their name. A legacy
// hit migrates in place (Figma keeps the variable id, so bindings survive); its display
// name follows while it spells ANY engine vintage of the path — a genuinely user-custom
// name stays.
function getOrMigrate(map: Map<string, figma.Variable>, path: string): figma.Variable | undefined {
  const v = map.get(path)
  if (v) {
    if (v.name !== path && isEngineSpelling(v.name, path)) v.name = path
    v.setPluginData(PATH_KEY, path)
    return v
  }
  for (const legacyPath of legacyCandidates(path)) {
    const legacy = map.get(legacyPath)
    if (legacy) {
      if (legacy.name === legacyPath || isEngineSpelling(legacy.name, path)) legacy.name = path
      legacy.setPluginData(PATH_KEY, path)
      map.delete(legacyPath)
      map.set(path, legacy)
      return legacy
    }
  }
  return undefined
}

// Order-aware entries, mirroring figmaRender.ts's groupEntries (NOT imported — code.ts
// stays engine-import-free to keep the sandbox bundle lean, see the header comment; this
// is a small hand-duplicated leaf, same rule as the one payload.ts's flatten() uses).
// JS enumerates integer-index string keys ascending, before any string keys, REGARDLESS
// of insertion order (ECMA-262 OrdinaryOwnPropertyKeys). Since the band flattening
// (owner 2026-08-12) every ramp leaf is band-word-prefixed (paper-99, wash-92, …) so no
// group consists of bare-digit keys any more — but the walker keeps the rule so the
// panel order can't silently reverse again if a digit-keyed group ever returns
// (adversarial-audit-caught 2026-08-07, when paper/wash leaves WERE bare digits).
function orderedEntries(node: TokenNode): Array<[string, TokenNode]> {
  const entries = Object.entries(node) as Array<[string, TokenNode]>
  const digitLeading = (k: string) => /^\d/.test(k)
  if (entries.length > 1 && entries.every(([k]) => digitLeading(k)))
    return entries.sort((a, b) => parseInt(b[0], 10) - parseInt(a[0], 10))
  return entries
}
function flatten(node: TokenNode, prefix = ''): Array<{ path: string; r: number; g: number; b: number; a?: number }> {
  if ('$type' in node) {
    const leaf = node as TokenLeaf
    const [r, g, b] = leaf.$value.components
    return [{ path: prefix, r, g, b, a: leaf.$value.alpha }]
  }
  return orderedEntries(node).flatMap(([k, v]) =>
    flatten(v, prefix ? `${prefix}/${k}` : k)
  )
}

// All collections we own for `role`: plugin-data tag first (survives renames);
// an untagged name match only counts when NO tagged one exists (first run / a
// pre-existing collection) — legacy untagged = wcag.
function ownedFor(collections: figma.VariableCollection[], role: string): figma.VariableCollection[] {
  const tagged = collections.filter(c => c.getPluginData(OWNER_KEY) === role)
  if (tagged.length) return tagged
  const byName = collections.find(c => c.name === role)
  return byName ? [byName] : []
}

// Resolve the collection we own for `role` UNDER `profile`. Each profile gets its
// own pair — a wcag file and its apca fork are separate collections, never mixed.
// `suffixed` = a sibling pair with the other profile exists, so a newly created
// collection takes the suffixed name ("mode-apca") instead of the plain role
// (existing pairs are found by tag and NEVER renamed).
// Always (re)stamps both tags so future lookups are rename-proof.
function resolveOwned(collections: figma.VariableCollection[], role: string, profile: Profile, suffixed: boolean) {
  let coll = ownedFor(collections, role).find(c => profileOf(c) === profile)
  const created = !coll
  if (!coll) coll = figma.variables.createVariableCollection(suffixed ? pairName(role, profile) : role)
  coll.setPluginData(OWNER_KEY, role)
  coll.setPluginData(PROFILE_KEY, profile)
  return { coll, created }
}

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

// Figma requires every font of any text node an edit forces to re-render to be loaded
// first — including fallback fonts the file never names ("Noto Sans Symbols2" carries
// symbol glyphs). Fonts load lazily per session, so a variable write into a file whose
// bound text hasn't rendered yet can throw mid-apply (owner hit 2026-08-12, batch died
// at one brand and succeeded on manual re-run). Applies are idempotent, so the recovery
// IS the re-run: parse the demanded font out of the error, load it, run the whole
// operation again. Each failing pass names at most one new font; the cap stops a
// pathological file from looping (loadFontAsync's own failure propagates regardless).
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
    const { brand, brandRaw, shared, confirmed, secondary, contrastProfile, ctaEscape, recipe } = msg as {
      type: 'apply'; brand: string; brandRaw: BrandRamp[]; shared: SharedRamp[]
      confirmed?: boolean; secondary?: boolean; contrastProfile?: Profile; ctaEscape?: boolean
      recipe?: unknown
    }
    const secondaryOn = secondary !== false // global secondary switch (default on)
    const profile: Profile = contrastProfile === 'apca' ? 'apca' : 'wcag'
    // the whole apply is one idempotent pass — withFontRetry re-runs it wholesale on
    // Figma's unloaded-font error (see the helper above onmessage)
    const applyOnce = async () => {
      const collections = await figma.variables.getLocalVariableCollectionsAsync()

      // The file's contrast posture, per PAIR: this apply targets the pair solved
      // under ITS profile. A pair for another profile with none for this one =
      // the FORK moment (same idiom as the secondary-posture check): confirm,
      // then create a SUFFIXED pair ("theme-apca"/"mode-apca") for this profile.
      // The existing pair is left completely alone — name, values, bindings —
      // so one-lane files and their downstream pipelines never notice a fork.
      const themePairs = ownedFor(collections, THEME_NAME)
      const themeMatch = themePairs.find(c => profileOf(c) === profile)
      const themeOther = themePairs.find(c => profileOf(c) !== profile)
      const profileFork = !themeMatch && !!themeOther
      // suffixed names whenever the file holds (or is about to hold) both profiles
      const suffixed = profileFork || (!!themeMatch && !!themeOther)

      // Live-detect the pair's secondary posture from ITS theme collection, so
      // manual edits self-heal — there's no stored flag to go stale.
      const existingTheme = themeMatch
      const existingThemeVars = existingTheme ? await varsByName(existingTheme.id) : new Map<string, figma.Variable>()
      // posture detection reads through the rename history — an old file may spell
      // the probe paper-1 or paper/99 (read-only .some, no getOrMigrate writes).
      // The live leaf is flat paper-99 (band flattening, owner 2026-08-12).
      const hasThemePath = (path: string) =>
        existingThemeVars.has(path) || legacyCandidates(path).some(p => existingThemeVars.has(p))
      const fileHasSecondary = hasThemePath('brand/alt/paper-99')
      const brandsExist = hasThemePath('brand/primary/paper-99')

      // Nudge before surprising changes: overwriting an existing brand, flipping
      // the pair's secondary posture, or forking the file's contrast profile.
      // Each needs a second Apply.
      const overwrite = existingTheme?.modes.some(m => m.name === brand) ?? false
      const secondaryMismatch = brandsExist && fileHasSecondary !== secondaryOn
      if (!confirmed && (overwrite || secondaryMismatch || profileFork)) {
        const reasons: string[] = []
        if (overwrite) reasons.push(`overwrite "${brand}"`)
        if (secondaryMismatch && secondaryOn) reasons.push('add a secondary to every brand')
        if (secondaryMismatch && !secondaryOn) reasons.push('mirror brand into secondary (file already uses a secondary)')
        if (profileFork) reasons.push(
          `create a separate ${profile.toUpperCase()} set ("${pairName(THEME_NAME, profile)}" / "${pairName(MODE_NAME, profile)}") — `
          + `this file's existing OKChroma collections are ${profileOf(themeOther!).toUpperCase()}-solved and stay untouched`)
        figma.ui.postMessage({ type: 'confirm', brand, message: `Will ${reasons.join(' + ')} — click Apply again.` })
        return
      }

      // confirmed fork: make the untouched original rename-proof for the future
      // (tag it; legacy pairs found by name may not carry tags yet) — its NAME
      // and values are deliberately left alone.
      if (profileFork) {
        const otherProf = profileOf(themeOther!)
        themeOther!.setPluginData(OWNER_KEY, THEME_NAME)
        themeOther!.setPluginData(PROFILE_KEY, otherProf)
        const modeOther = ownedFor(collections, MODE_NAME).find(c => profileOf(c) === otherProf)
        if (modeOther) {
          modeOther.setPluginData(OWNER_KEY, MODE_NAME)
          modeOther.setPluginData(PROFILE_KEY, otherProf)
        }
      }

      // secondary treatment: real = write this brand's secondary; mirror = alias
      // secondary→primary (no blanks, no extra ramp); none = skip secondary entirely.
      const secondaryMode: 'real' | 'mirror' | 'none' = secondaryOn ? 'real' : (fileHasSecondary ? 'mirror' : 'none')
      // When secondary first appears on a file that already has brands, those brands
      // would be blank in the new group — backfill them with a mirrored secondary.
      const backfillSecondary = secondaryOn && !fileHasSecondary && brandsExist

      // ── theme collection FIRST (owner: theme appears above mode in the panel —
      // the collections list follows creation order) ──────────────────────────
      const th = resolveOwned(collections, THEME_NAME, profile, suffixed)
      let brandMode: string
      if (th.created) {
        brandMode = th.coll.modes[0].modeId
        th.coll.renameMode(brandMode, brand)
      } else {
        const m = th.coll.modes.find(x => x.name === brand)
        brandMode = m ? m.modeId : th.coll.addMode(brand)
      }

      // ── primitive collection: raw values, modes Light / Dark ───────────────
      // Resolved RENAME-PROOF (owner 2026-07-27): stored modeIds first (Figma
      // keeps a modeId across renames), then the canonical names, then POSITION
      // (the historical rule — first adoption of an unstamped file). The plugin
      // only NAMES modes it creates; a user rename ("light"/"dark", "day"/
      // "night") is respected and never reverted (the old code force-renamed
      // both modes every apply).
      const p = resolveOwned(collections, MODE_NAME, profile, suffixed)
      const stamp = profileStamp(profile)
      // Per-variable descriptions in the WCAG lane (the digit-free search fix); a legacy
      // APCA pair keeps the old posture stamp — WCAG conformance phrases would lie there.
      const descFor = (path: string) => (profile === 'apca' ? stamp : describeToken(path))
      // Web code syntax = the hyphenated CURRENT name (owner 2026-08-10) — raw kebab,
      // no var(--…) wrapper; restamped every apply, so it follows a user's panel rename
      const codeSyntaxFor = (name: string) => name.toLowerCase().replace(/[\s/]+/g, '-')
      let storedModes: { light?: string; dark?: string } = {}
      try { storedModes = JSON.parse(p.coll.getPluginData(MODE_IDS_KEY) || '{}') } catch { /* unstamped */ }
      const modeIds = new Set(p.coll.modes.map(m => m.modeId))
      // a mode VALIDLY stored as dark is never claimable by the light fallbacks
      // (review-caught: with Light hand-deleted, the positional fallback would
      // claim the dark survivor and write light values into it)
      const validDark = (storedModes.dark && modeIds.has(storedModes.dark)) ? storedModes.dark : undefined
      const pLight = (storedModes.light && modeIds.has(storedModes.light) && storedModes.light !== validDark) ? storedModes.light
        : (p.coll.modes.find(m => m.name === 'Light' && m.modeId !== validDark)?.modeId
          ?? p.coll.modes.find(m => m.modeId !== validDark)?.modeId
          ?? p.coll.addMode('Light'))
      if (p.created) p.coll.renameMode(pLight, 'Light')
      const pDark = (validDark && validDark !== pLight) ? validDark
        : (p.coll.modes.find(m => m.name === 'Dark' && m.modeId !== pLight)?.modeId
          ?? p.coll.modes.find(m => m.modeId !== pLight)?.modeId
          ?? p.coll.addMode('Dark'))
      p.coll.setPluginData(MODE_IDS_KEY, JSON.stringify({ light: pLight, dark: pDark }))

      const primByName = await varsByName(p.coll.id)
      // the 2026-08-21 family rename: brand/<name>/secondary/ → brand/<name>/alt/.
      // The old word sits MID-path behind a varying brand segment, which neither
      // leaf entries (end-anchored) nor group entries (start-anchored) can express —
      // the bespoke idiom (like the identity migration in ③b). Rename-in-place:
      // same id, every mode's value survives; a custom display name stays (only a
      // name still spelling the old path follows the rename).
      for (const [path, v] of [...primByName]) {
        const seg = path.match(/^(brand\/[^/]+\/)secondary(\/.*)$/)
        if (!seg) continue
        const newPath = `${seg[1]}alt${seg[2]}`
        if (primByName.has(newPath)) continue
        if (v.name === path) v.name = newPath
        v.setPluginData(PATH_KEY, newPath)
        primByName.set(newPath, v); primByName.delete(path)
      }
      const primVar = new Map<string, figma.Variable>() // full path → Variable (alias targets)
      let createdShared = 0

      // Static designer-convenience invariants — identical for every brand, so
      // seeded once into raw/system/* (created if absent, otherwise left as-is).
      // Seeded BEFORE the ramps so on-fill tokens can alias them.
      //   - abs-white / abs-black — mode-INVARIANT poles; on-fill tokens alias
      //     one PER MODE (a flipping on-fill = abs-white in light, abs-black in
      //     dark), so text stays a true pole regardless of the ladder.
      //   - NEITHER anchor is static anymore: the engine resolves both and they ride
      //     the neutral ramp at system/neutral/<tint>/paper-100 and .../ink-0
      //     (paper-100 fell 2026-07-02; ink-0 followed 2026-08-28 — near-black
      //     light / near-white dark, never the literal pole). An existing file's
      //     old system/ink-0 static row orphans in place (scopes [], unbindable —
      //     the red-variant class); its theme alias re-points on re-apply.
      const W = { r: 1, g: 1, b: 1 }
      const K = { r: 0, g: 0, b: 0 }
      // The list order IS the display order in Figma (variables list in creation
      // order; owner's panel layout 2026-07-27: abs poles at the system root, then
      // surface/, then alpha/). The four elevation planes surface/sunken|low|base|high
      // are mode-divergent aliases set later — once the theme's neutral papers exist.
      // `elevation` = "create now for ordering, alias below". (Role names, not ladder
      // numbers — each plane aliases a DIFFERENT ladder position per mode: elevation
      // climbs paper-95→paper-100 in light, paper-100→paper-95 in dark, so a number
      // would lie.) ⚠️ ORDER: surface/low BEFORE surface/base — the 2026-08-12 plane
      // rename moved 'base' onto the old lift row, and getOrMigrate must let the
      // low-lookup consume a file's old base row first (see RENAMED_LEAVES). The alpha/shadow ladder (owner 2026-07-27) is pure black at
      // 4/8/12% light; dark is heavier by necessity — near black a light-mode alpha
      // vanishes — at 32/48/64%.
      const STATIC_UTILS: Array<{ path: string; light?: figma.RGBA; dark?: figma.RGBA; elevation?: boolean }> = [
        { path: 'system/abs-black', light: K, dark: K },
        { path: 'system/abs-white', light: W, dark: W },
        { path: 'system/surface/dim', elevation: true },
        // low MUST precede mid: an 08-12-era file's real low row must direct-hit before
        // mid's legacy lookup consumes that file's base row (the word base moved planes
        // in 08-12 and retired in 08-18 — see the RENAMED_LEAVES plane notes)
        { path: 'system/surface/low', elevation: true },
        { path: 'system/surface/mid', elevation: true },
        { path: 'system/surface/high', elevation: true },
        { path: 'system/alpha/transparent', light: { r: 1, g: 1, b: 1, a: 0 }, dark: { r: 1, g: 1, b: 1, a: 0 } },
        { path: 'system/alpha/abs-black-060', light: { r: 0, g: 0, b: 0, a: 0.6 }, dark: { r: 0, g: 0, b: 0, a: 0.6 } },
        // the SOFT ON-CTA primitive (C43 follow-up, owner-named 2026-08-03): the on-text
        // pole at the engine's SOFT_ON_CTA_ALPHA register — black@.75 light,
        // white@.80 dark. A quiet cta's stamp/on aliases this row wherever the engine
        // ships it soft (since 2026-08-29 that is gated per mode — the derived model
        // ships soft in light, the solid pole in dark).
        { path: 'system/alpha/ink', light: { r: 0, g: 0, b: 0, a: 0.75 }, dark: { r: 1, g: 1, b: 1, a: 0.8 } },
        // the OFFSET LADDER (owner report 2026-08-28: the rungs never reached this
        // plugin — cssRender's comment even said so). Black in light, WHITE in dark,
        // constant alpha per rung (a stroke sits on the fill, so unlike the shadows it
        // does not scale up in dark). The stamp/edge writer below aliases these.
        { path: 'system/alpha/away-from-bg/06', light: { r: 0, g: 0, b: 0, a: 0.06 }, dark: { r: 1, g: 1, b: 1, a: 0.06 } },
        { path: 'system/alpha/away-from-bg/08', light: { r: 0, g: 0, b: 0, a: 0.08 }, dark: { r: 1, g: 1, b: 1, a: 0.08 } },
        { path: 'system/alpha/away-from-bg/16', light: { r: 0, g: 0, b: 0, a: 0.16 }, dark: { r: 1, g: 1, b: 1, a: 0.16 } },
        { path: 'system/alpha/shadow-04', light: { r: 0, g: 0, b: 0, a: 0.04 }, dark: { r: 0, g: 0, b: 0, a: 0.32 } },
        { path: 'system/alpha/shadow-08', light: { r: 0, g: 0, b: 0, a: 0.08 }, dark: { r: 0, g: 0, b: 0, a: 0.48 } },
        { path: 'system/alpha/shadow-12', light: { r: 0, g: 0, b: 0, a: 0.12 }, dark: { r: 0, g: 0, b: 0, a: 0.64 } },
      ]
      for (const u of STATIC_UTILS) {
        // getOrMigrate (not .get): renamed rows (the surface-plane words, historical
        // vintages) are adopted in place instead of orphaned. (The anchor's ink-13→
        // ink-0 case left this loop 2026-08-28 with its STATIC_UTILS entry — the
        // resolved anchor rides the neutral walk now.)
        const existing = getOrMigrate(primByName, u.path)
        // already seeded — enforce the scope rule + restamp the code syntax
        if (existing) { existing.scopes = [] ; existing.setVariableCodeSyntax('WEB', codeSyntaxFor(existing.name)); continue }
        const v = figma.variables.createVariable(u.path, p.coll, 'COLOR')
        v.setPluginData(PATH_KEY, u.path)
        v.description = descFor(u.path)
        v.setVariableCodeSyntax('WEB', codeSyntaxFor(v.name))
        // primitives are NEVER bound directly — hidden from every property picker
        // (the theme aliases carry the scopes); the mode collection is the value store
        v.scopes = []
        primByName.set(u.path, v)
        if (u.light && u.dark) { // elevation entries are aliased below, not value-set
          v.setValueForMode(pLight, u.light)
          v.setValueForMode(pDark, u.dark)
        }
        createdShared++
      }

      // An on-fill is a pure pole — or, since C43, the default-model secondary's soft
      // on-cta: the pole at partial alpha, which aliases system/alpha/ink instead.
      // Solid poles alias PER MODE to abs-white/abs-black
      // (mode-divergent alias, like the elevation pair) instead of duplicating a
      // value. Decoupled from the paper-100/ink-0 anchors on purpose (Stage B leaves;
      // were paper-0/ink-12): BOTH anchors are RESOLVED colors now (paper-100
      // 2026-07-02, ink-0 2026-08-28 — tinted, never the pole) — on-CTA text must
      // stay a true pole, so it aliases the abs rows, never an anchor.
      const isWhite = (c: { r: number; g: number; b: number }) => c.r + c.g + c.b > 1.5
      const absPole = (white: boolean) => primByName.get(white ? 'system/abs-white' : 'system/abs-black')

      // Write a primitive. on-fill leaves ALIAS a shared invariant (always, so
      // pre-existing raw on-fills get converted on re-apply); cta-border leaves ALIAS
      // per mode — system/alpha/transparent when the fill passes the boundary gate, the
      // family's own wax-74 when it doesn't (alpha 0 in the payload = transparent);
      // every other leaf is a raw color, written on create or when `refresh` is set
      // (per-brand ramps).
      // (INK_SIBLING and its value-guarded alias branch DELETED with the cta-ink
      // register, owner 2026-08-12: the payload no longer carries text-cta reference
      // leaves — the text register IS the ink stops.)
      const writeRaw = (
        path: string,
        t: { path: string; r: number; g: number; b: number; a?: number },
        darkMap: Map<string, { r: number; g: number; b: number; a?: number }>,
        refresh: boolean
      ): { v: figma.Variable; created: boolean } => {
        let v = getOrMigrate(primByName, path)
        const created = !v
        if (!v) { v = figma.variables.createVariable(path, p.coll, 'COLOR'); v.setPluginData(PATH_KEY, path); primByName.set(path, v) }
        v.description = descFor(path) // restamped every apply — regenerated, never hand-kept
        v.setVariableCodeSyntax('WEB', codeSyntaxFor(v.name))
        v.scopes = [] // primitives hidden from every picker (re-applies fix older files too)
        const dk = darkMap.get(t.path)
        // a TRUE pole (the engine's on-colors are exactly white or black); an outline
        // secondary's stamp/on is the family's lead-53 instead — alias the sibling, not
        // a pole (C33 renumbered the inks; the old ink/10 target aliased the WRONG stop
        // for a post-renumber outline — fixed 2026-08-04)
        // (the dead 'highlight/on' arm deleted 2026-08-18 — the engine has emitted no
        // highlight token since the 2026-07-29 collapse; the sweep caught the check
        // silently matching nothing. Recognition now rides tokenNames.STAMP_LEAF so a
        // future rename breaks this build instead of disarming the aliasing.)
        const isPole = (c: { r: number; g: number; b: number }) => {
          const sum = c.r + c.g + c.b
          return sum > 2.97 || sum < 0.03
        }
        if (t.path === STAMP_LEAF.ON) {
          const sibling9 = primByName.get(path.slice(0, -STAMP_LEAF.ON.length) + 'lead-53')
          // the SOFT ON-CTA (C43 follow-up, owner 2026-08-03): a POLE AT PARTIAL ALPHA is
          // the default-model secondary's soft text → alias system/alpha/ink. Checked
          // BEFORE the solid-pole case — isPole ignores alpha here, so without this the
          // soft leaf aliased the abs pole and silently DROPPED its alpha.
          const softInk = primByName.get('system/alpha/ink')
          const target = (leaf: { r: number; g: number; b: number; a?: number }) =>
            leaf.a !== undefined && leaf.a > 0 && leaf.a < 1 && isPole(leaf) && softInk
              ? softInk
              : isPole(leaf) ? absPole(isWhite(leaf)) : (sibling9 ?? absPole(isWhite(leaf)))
          const lightTarget = target(t)
          const darkTarget = target(dk ?? t)
          if (lightTarget && darkTarget) {
            v.setValueForMode(pLight, figma.variables.createVariableAlias(lightTarget))
            v.setValueForMode(pDark, figma.variables.createVariableAlias(darkTarget))
          }
        } else if (t.a === 0 && (dk === undefined || dk.a === 0)) {
          // fully-transparent leaf (an outline secondary's rest fill) → alias system/alpha/transparent
          const transparent = primByName.get('system/alpha/transparent')
          if (transparent) {
            v.setValueForMode(pLight, figma.variables.createVariableAlias(transparent))
            v.setValueForMode(pDark, figma.variables.createVariableAlias(transparent))
          }
        } else if (t.path === STAMP_LEAF.EDGE) {
          const sibling8 = primByName.get(path.slice(0, -STAMP_LEAF.EDGE.length) + 'wax-74')
          const transparent = primByName.get('system/alpha/transparent')
          // the OFFSET ROUTER (owner report 2026-08-28, the ext strokeFor idiom): a
          // firing edge carries its family's rung IN ITS OWN ALPHA — a value lookup,
          // no family table to drift from cssRender.ctaBorderRung — and aliases the
          // matching ladder row (created in STATIC_UTILS above, so it exists by now).
          // a=0 stays transparent (the gate passed); an OPAQUE leaf is the outline
          // secondary's posture and keeps its wax-74 alias. Re-aliased every apply,
          // so a pre-ladder file's loud wax-74 edge heals on the next apply.
          const rungRow = (a: number | undefined) => {
            const rung = a === undefined ? undefined
              : Object.keys(RUNG_ALPHAS).find(k => Math.abs(RUNG_ALPHAS[k] - a) < 1e-6)
            return rung ? primByName.get(`system/alpha/${rung}`) : undefined
          }
          const target = (leaf?: { a?: number }) =>
            leaf?.a === 0 ? transparent : (rungRow(leaf?.a) ?? sibling8 ?? transparent)
          const lightTarget = target(t)
          const darkTarget = target(dk ?? t)
          if (lightTarget && darkTarget) {
            v.setValueForMode(pLight, figma.variables.createVariableAlias(lightTarget))
            v.setValueForMode(pDark, figma.variables.createVariableAlias(darkTarget))
          }
        } else if (created || refresh) {
          // carry a real partial alpha through (the outline secondary's cta-2 tinted hover)
          v.setValueForMode(pLight, t.a !== undefined && t.a < 1 ? { r: t.r, g: t.g, b: t.b, a: t.a } : { r: t.r, g: t.g, b: t.b })
          if (dk) v.setValueForMode(pDark, dk.a !== undefined && dk.a < 1 ? { r: dk.r, g: dk.g, b: dk.b, a: dk.a } : { r: dk.r, g: dk.g, b: dk.b })
        }
        return { v, created }
      }

      // per-brand ramps → brand/<brand>/<role>/* (refreshed). primary always;
      // secondary's raw ramp only when we're writing a real secondary for this brand.
      const primaryRamp = brandRaw.find(r => r.role === 'primary')
      const secondaryRamp = brandRaw.find(r => r.role === 'secondary')
      const writeRamp = (role: string, ramp: BrandRamp) => {
        const darkMap = new Map(flatten(ramp.dark).map(t => [t.path, t]))
        for (const t of flatten(ramp.light)) {
          writeRaw(`brand/${brand}/${role}/${t.path}`, t, darkMap, true)
        }
      }
      if (primaryRamp) writeRamp('primary', primaryRamp)
      if (secondaryMode === 'real' && secondaryRamp) writeRamp('alt', secondaryRamp)
      // shared neutral + signals → grown on demand, recorded as alias targets.
      // The LINK prim refreshes (review-caught 2026-07-16): it is seed-keyed, so the
      // path survives an engine retune while its six values move — a stale reuse would
      // serve old hover/pressed/dark values under every theme alias. Same seed ⇒ same
      // engine output, so the refresh is idempotent across brands sharing the prim.
      // The SIGNAL prims join that rule (owner report 2026-08-03: a stale warning
      // lead-53 failing on papers — the create-once base stranded C42/C44 canonical
      // moves): their
      // identity/variant paths survive engine retunes exactly as link's does, and the
      // same idempotence argument holds. The NEUTRAL joined last (owner 2026-08-11, the
      // default-tint retune: a grow-on-demand system/neutral/default-h* would serve the
      // old 1x values forever): its values derive entirely from the level+hue in its
      // key, so the refresh is idempotent for the same reason.
      for (const grp of shared) {
        const darkMap = new Map(flatten(grp.dark).map(t => [t.path, t]))
        for (const t of flatten(grp.light)) {
          const path = `${grp.prim}/${t.path}`
          const { v, created } = writeRaw(path, t, darkMap, true)
          if (created) createdShared++
          primVar.set(path, v)
        }
      }

      // NEUTRAL CTA ESCAPE (Phase 3, owner 2026-07-16): the escaped cta REST anchors at
      // the brand-neutral's ink-30 (strong; was ink-11 pre-Stage-B) by construction,
      // so the primitive ALIASES the neutral's own strong ink (the on-cta→ink idiom — the
      // relationship stays live in Figma; one mode-invariant alias resolves per mode
      // through the neutral prim's Light/Dark).
      // Runs AFTER the shared groups so the target exists. hover/pressed are derived
      // values and stay raw. Escape OFF on a later re-apply: writeRamp's refresh write
      // replaces the alias with the brand's raw cta again — fully reversible.
      // GUARD (review-caught 2026-07-16): alias only when the target's live values equal
      // the freshly written escape cta (both modes); otherwise the raw write already
      // carries the correct values. Since 2026-08-11 the neutral refreshes on every
      // apply, so the stale-strong-ink case this guarded against no longer arises — the
      // value check stays as the cheap invariant it always was.
      if (ctaEscape) {
        const eq = (a: unknown, b: unknown): boolean => {
          const ca = a as figma.RGBA | undefined, cb = b as figma.RGBA | undefined
          if (!ca || !cb || typeof ca !== 'object' || typeof cb !== 'object' || 'type' in ca || 'type' in cb) return false
          const E = 1 / 1024
          return Math.abs(ca.r - cb.r) < E && Math.abs(ca.g - cb.g) < E && Math.abs(ca.b - cb.b) < E
        }
        const neutralPrim = shared.find(g => g.theme === 'neutral')?.prim
        // the whole escape family aliases the neutral's own registers (owner amendment
        // 2026-07-16 "cta AND cta ink", re-specified 2026-08-12 with the cta-ink
        // deletion): fill rest → neutral ink-30 (strong); the brand's INK STOPS →
        // the neutral's same stops (the engine swaps their values under the escape, so
        // the value guard matches and the relationship stays live in Figma). Fill
        // hover/pressed stay raw derived values.
        const pairs: Array<[string, string]> = [
          [STAMP_LEAF.FILL, 'ink-30'],
          ['lead-53', 'lead-53'], ['ink-42', 'ink-42'], ['ink-30', 'ink-30'],
        ]
        for (const [leaf, neutralLeaf] of pairs) {
          const target = neutralPrim ? (primVar.get(`${neutralPrim}/${neutralLeaf}`) ?? primByName.get(`${neutralPrim}/${neutralLeaf}`)) : undefined
          const v = primByName.get(`brand/${brand}/primary/${leaf}`)
          if (v && target
            && eq(target.valuesByMode[pLight], v.valuesByMode[pLight])
            && eq(target.valuesByMode[pDark], v.valuesByMode[pDark])) {
            v.setValueForMode(pLight, figma.variables.createVariableAlias(target))
            v.setValueForMode(pDark, figma.variables.createVariableAlias(target))
          }
        }
      }

      // ── theme collection: aliases, modes = brands (resolved above, before mode) ──
      const themeByName = await varsByName(th.coll.id)
      let aliasCount = 0
      // primTarget accepts a resolved Variable directly — a caller that already holds
      // one must not round-trip through its NAME (custom names aren't map keys)
      const aliasInto = (themePath: string, primTarget: string | figma.Variable, modeId: string = brandMode) => {
        const target = typeof primTarget === 'string' ? (primVar.get(primTarget) ?? primByName.get(primTarget)) : primTarget
        if (!target) return
        let v = getOrMigrate(themeByName, themePath)
        if (!v) { v = figma.variables.createVariable(themePath, th.coll, 'COLOR'); v.setPluginData(PATH_KEY, themePath); themeByName.set(themePath, v) }
        v.description = descFor(themePath)
        v.setVariableCodeSyntax('WEB', codeSyntaxFor(v.name))
        // the THEME aliases are what users bind — visible in every supported property
        // (the mode primitives underneath carry scope NOTHING)
        v.scopes = ['ALL_SCOPES']
        v.setValueForMode(modeId, figma.variables.createVariableAlias(target))
        aliasCount++
      }

      // THEME WRITE ORDER = PANEL ORDER (the groups sidebar follows each group's first
      // variable; fresh files get the owner's layout): system → neutral → brand → signals.
      // Existing collections keep their historical order — no reorder API; drag or re-apply
      // on a fresh file.

      // migration: the anchor used to live under theme system/ink-13 — RENAME moves it
      // into the neutral group with every user binding intact. It parks on the OLD name
      // neutral/ink-13, NOT the final ink-0 (ink-12 pre-Stage-B): on a pre-renumber file
      // that final name is still occupied by the not-yet-migrated old SCALE ink-12, and
      // jumping the anchor there clobbers that map entry — the neutral ladder then
      // hijacks the anchor into scale ink-11 (mode-flipping #000/#fff bindings turn
      // brand-tinted) and orphans the real scale variable. Parking on ink-13 keeps the
      // ascending RENAMED_LEAVES discipline: the ladder frees ink-12 first, then its
      // ['ink-13','ink-0'] entry finishes the anchor's move — the same path files
      // already on neutral/ink-13 take via aliasInto's getOrMigrate. (Guard: never
      // clobber an existing neutral/ink-13.)
      const staleInk = themeByName.get('system/ink-13')
      if (staleInk && !themeByName.has('neutral/ink-13')) {
        if (staleInk.name === 'system/ink-13') staleInk.name = 'neutral/ink-13' // custom names stay
        staleInk.setPluginData(PATH_KEY, 'neutral/ink-13')
        themeByName.set('neutral/ink-13', staleInk)
        themeByName.delete('system/ink-13')
      }

      // ① system globals (brand-independent: every theme mode aliases the same seed;
      // idempotent — backfills pre-existing brand modes the moment the globals appear)
      const SYSTEM_GLOBALS = ['system/abs-black', 'system/abs-white',
        'system/surface/dim', 'system/surface/low', 'system/surface/mid', 'system/surface/high',
        'system/alpha/transparent', 'system/alpha/abs-black-060',
        'system/alpha/shadow-04', 'system/alpha/shadow-08', 'system/alpha/shadow-12']
      for (const path of SYSTEM_GLOBALS) {
        for (const m of th.coll.modes) aliasInto(path, path, m.modeId)
      }

      // ② neutral. ink-0 the anchor is IN the payload group now (engine-resolved off
      // the pole, 2026-08-28 — the paper-100 posture; was a per-mode alias onto the
      // static system/ink-0 pole), already in ladder position after ink-30, so the
      // generic walk aliases it onto the tint prim like every other leaf. A file's
      // existing neutral/ink-0 theme var is the same var — getOrMigrate finds it and
      // this brand's mode re-points from the old pole to the tint prim.
      const neutralGrp = shared.find(g => g.theme === 'neutral')
      if (neutralGrp) {
        for (const t of flatten(neutralGrp.light)) {
          aliasInto(`neutral/${t.path}`, `${neutralGrp.prim}/${t.path}`)
        }
      }

      // ③ brand/primary always; brand/alt depends on the secondary mode.
      // identity is SKIPPED at the theme layer — its bind surface moved to the
      // system absolutes (③b below); the prim keeps brand/<brand>/<role>/identity.
      const stops = primaryRamp ? flatten(primaryRamp.light).filter(t => t.path !== 'identity') : []
      for (const t of stops) {
        aliasInto(`brand/primary/${t.path}`, `brand/${brand}/primary/${t.path}`)
        if (secondaryMode === 'real') {
          aliasInto(`brand/alt/${t.path}`, `brand/${brand}/alt/${t.path}`)
        } else if (secondaryMode === 'mirror') {
          aliasInto(`brand/alt/${t.path}`, `brand/${brand}/primary/${t.path}`) // mirror brand
        }
      }
      // When the brand-alt group first appears, give every pre-existing brand a
      // mirrored alt so none are left blank in the new group.
      if (backfillSecondary) {
        for (const m of th.coll.modes) {
          if (m.name === brand) continue
          for (const t of stops) {
            aliasInto(`brand/alt/${t.path}`, `brand/${m.name}/primary/${t.path}`, m.modeId)
          }
        }
      }

      // ③b the system ABSOLUTES (owner 2026-07-27): identity moves out of the
      // family groups to sit with the poles — system/abs-primary / abs-alt
      // (the absolutes = the unprocessed inputs; the family groups stay pure
      // solve output). These are brand-VARYING system rows, the link idiom:
      // aliased per brand mode to that brand's identity prim, backfilled across
      // pre-existing modes. In-place migration first — bespoke, because a leaf
      // entry can't express two divergent homes for the same 'identity' leaf
      // (the staleInk idiom); the migrated var keeps every mode's alias.
      for (const [oldPath, newPath] of [
        ['brand/primary/identity', 'system/abs-primary'],
        ['brand/secondary/identity', 'system/abs-alt'],
      ] as const) {
        const v = themeByName.get(oldPath)
        if (v && !themeByName.has(newPath)) {
          if (v.name === oldPath) v.name = newPath // custom names stay
          v.setPluginData(PATH_KEY, newPath)
          themeByName.set(newPath, v)
          themeByName.delete(oldPath)
        }
      }
      aliasInto('system/abs-primary', `brand/${brand}/primary/identity`)
      if (secondaryMode === 'real') aliasInto('system/abs-alt', `brand/${brand}/alt/identity`)
      else if (secondaryMode === 'mirror') aliasInto('system/abs-alt', `brand/${brand}/primary/identity`)
      // Backfill runs EVERY apply (review-caught 2026-07-27: gating on absIsNew
      // left a migrated file's inherited create-default black modes standing):
      // any mode still holding a raw value gets its own brand's identity prim
      // (secondary prim when that brand carries one, else its primary — the
      // mirror posture). Never clobbers a mode that already holds an alias, so
      // it is idempotent; a brand applied before identity prims existed stays
      // raw until its own re-apply mints one (the link-idiom posture).
      {
        for (const m of th.coll.modes) {
          if (m.name === brand) continue
          for (const absPath of ['system/abs-primary', 'system/abs-alt'] as const) {
            const themeVar = themeByName.get(absPath)
            if (!themeVar) continue
            const cur = themeVar.valuesByMode[m.modeId]
            if (cur && typeof cur === 'object' && 'type' in cur) continue
            const target = absPath === 'system/abs-alt'
              ? (primByName.get(`brand/${m.name}/alt/identity`) ?? primByName.get(`brand/${m.name}/primary/identity`))
              : primByName.get(`brand/${m.name}/primary/identity`)
            if (target) aliasInto(absPath, target, m.modeId)
          }
        }
      }
      // ④ signals → their shared primitive paths (engine order: red, yellow, green, info-color)
      for (const grp of shared) {
        if (grp === neutralGrp || grp.theme === 'link' || grp.theme === 'link-inverse') continue
        for (const t of flatten(grp.light)) {
          aliasInto(`${grp.theme}/${t.path}`, `${grp.prim}/${t.path}`)
        }
      }

      // ⑤ the SYSTEM LINK trio (Phase 4, owner 2026-07-16: "link is a system level color…
      // a primitive that internally aliases the primary ink 10 unless it's being
      // deconflicted"). ONE trio per theme, per brand mode: DEFAULT aliases this brand's
      // ink stops directly (was the cta-ink trio until its 2026-08-12 deletion — same
      // values by construction, and the neutral escape re-points the link automatically
      // because the escape now swaps the ink stops themselves); CUSTOM (the
      // link payload group, dedup'd by seed hex like signal variants) aliases the shared
      // link primitive instead.
      const linkGrp = shared.find(g => g.theme === 'link')
      // theme leaves live under system/link/* with STATE names (owner regroup
      // 2026-07-27); the shared link PRIM keeps its historical link/link-hover/
      // link-pressed leaves (third column) — prims are hidden and unbound, renaming
      // them buys nothing.
      const LINK_LEAVES = [
        ['link/default/enabled', 'lead-53', 'link'],
        ['link/default/hover', 'ink-42', 'link-hover'],
        ['link/default/pressed', 'ink-30', 'link-pressed'],
      ] as const
      // ANY missing leaf triggers the backfill (review-caught: a hand-deleted
      // link-hover/link-pressed pair used to recreate black in other modes unbackfilled)
      const linkIsNew = LINK_LEAVES.some(([themeLeaf]) => !themeByName.has(`system/${themeLeaf}`))
      for (const [themeLeaf, brandLeaf, primLeaf] of LINK_LEAVES) {
        aliasInto(`system/${themeLeaf}`, linkGrp ? `${linkGrp.prim}/${primLeaf}` : `brand/${brand}/primary/${brandLeaf}`)
      }
      // BACKFILL on first appearance (review-caught 2026-07-16): freshly created theme
      // vars hold the create-default (black) in every OTHER brand mode — the
      // backfillSecondary idiom. Each pre-existing mode gets its own brand's DEFAULT
      // posture (its ink stops; the custom seed belongs to the applying brand only,
      // matching the ext model where each extension overrides with its own). findPrim
      // reads through the rename history, so any vintage's ink rows are found; the
      // ink-42 fallback covers a leaf hand-deleted from an old file (better a
      // static link than black). Later brand applies set their own mode and win over
      // this.
      if (linkIsNew) {
        // resolve prims READ-ONLY through the rename history: an untouched brand's prims
        // still carry pre-renumber leaf names (in-place migration only runs for families
        // the CURRENT apply writes) — a raw lookup missed them and silently left the
        // create-default black in that mode (review-caught 2026-07-16). getOrMigrate is
        // avoided on purpose: renaming another brand's prim here would be a write
        // side-effect on a family this apply doesn't own.
        const findPrim = (path: string): figma.Variable | undefined => {
          const direct = primVar.get(path) ?? primByName.get(path)
          if (direct) return direct
          for (const lp of legacyCandidates(path)) { const v = primByName.get(lp); if (v) return v }
          return undefined
        }
        for (const m of th.coll.modes) {
          if (m.name === brand) continue
          const primary = `brand/${m.name}/primary/`
          for (const [themeLeaf, brandLeaf] of LINK_LEAVES) {
            // never clobber a mode that already holds an ALIAS (a custom link or a prior
            // backfill) — only the raw create-default is fair game
            const themeVar = themeByName.get(`system/${themeLeaf}`)
            const cur = themeVar?.valuesByMode[m.modeId]
            if (cur && typeof cur === 'object' && 'type' in cur) continue
            const target = findPrim(primary + brandLeaf) ?? findPrim(primary + 'ink-42')
            if (target) aliasInto(`system/${themeLeaf}`, target, m.modeId)
          }
        }
      }

      // ⑤bis the INVERSE link trio (owner round 2026-08-19): the link seed re-solved for
      // text on inverted surfaces. NO default-alias posture exists — no brand row carries
      // these values — so the ui ALWAYS ships a seed-keyed prim and every posture aliases
      // it (the custom-link idiom, made unconditional).
      const linkInvGrp = shared.find(g => g.theme === 'link-inverse')
      // theme leaves live INSIDE the link group (owner regroup 2026-08-20):
      // link/inverse·inverse-hover·inverse-pressed, six flat leaves with the trio above
      const LINK_INVERSE_LEAVES = [
        ['link/inverse/enabled', 'link'],
        ['link/inverse/hover', 'link-hover'],
        ['link/inverse/pressed', 'link-pressed'],
      ] as const
      if (linkInvGrp) {
        const invIsNew = LINK_INVERSE_LEAVES.some(([themeLeaf]) => !themeByName.has(`system/${themeLeaf}`))
        for (const [themeLeaf, primLeaf] of LINK_INVERSE_LEAVES) {
          aliasInto(`system/${themeLeaf}`, `${linkInvGrp.prim}/${primLeaf}`)
        }
        // BACKFILL on first appearance (the linkIsNew idiom): freshly created theme vars
        // hold the create-default (black) in every OTHER brand mode. Unlike the link there
        // is no per-brand row to point each mode at — other brands' inverse prims don't
        // exist until they re-apply — so every raw mode takes THIS brand's prim (better a
        // static trio than black; the same tradeoff the link backfill records). A later
        // apply of that brand sets its own mode and wins over this.
        if (invIsNew) {
          for (const m of th.coll.modes) {
            if (m.name === brand) continue
            for (const [themeLeaf, primLeaf] of LINK_INVERSE_LEAVES) {
              const themeVar = themeByName.get(`system/${themeLeaf}`)
              const cur = themeVar?.valuesByMode[m.modeId]
              if (cur && typeof cur === 'object' && 'type' in cur) continue
              aliasInto(`system/${themeLeaf}`, `${linkInvGrp.prim}/${primLeaf}`, m.modeId)
            }
          }
        }
      }

      // Elevation planes — mode-DIVERGENT aliases (owner spec 2026-07-24): both
      // themes use the SAME four neutral stops in REVERSED order, so each plane
      // points at a different stop per mode. Every end is the brand-aware THEME
      // neutral (paper-100 is the engine's RESOLVED anchor — white in light, one seam
      // below paper-99 in dark, never absolute black). Stage B (owner 2026-08-07,
      // names only) relabeled the four leaves; the wiring is unchanged — same stop
      // index maps to the same JS variable, only the lookup string moved:
      //   sink → neutral/paper-95 in light · neutral/paper-100 (deep) in dark    (was paper-3/paper-0)
      //   base → neutral/paper-97 in light · neutral/paper-99 in dark           (was paper-2/paper-1)
      //   lift → neutral/paper-99 in light · neutral/paper-97 in dark           (was paper-1/paper-2)
      //   pop  → neutral/paper-100 (white) in light · neutral/paper-95 in dark  (was paper-0/paper-3)
      // The vars were CREATED in order above; aliases are set HERE because the
      // theme's neutral vars only exist after the alias loop ("the wait"). This
      // mirrors the CSS semantic layer's surface-sunken/low/base/high exactly.
      const themeNeutralP0 = themeByName.get('neutral/paper-100')
      const themeNeutralP1 = themeByName.get('neutral/paper-99')
      const themeNeutralP2 = themeByName.get('neutral/paper-97')
      const themeNeutralP3 = themeByName.get('neutral/paper-95')
      if (themeNeutralP0 && themeNeutralP1 && themeNeutralP2 && themeNeutralP3) {
        const aliasElev = (path: string, light: figma.Variable, dark: figma.Variable) => {
          const v = primByName.get(path) // pre-created in STATIC_UTILS for ordering
          if (!v) return
          v.setValueForMode(pLight, figma.variables.createVariableAlias(light))
          v.setValueForMode(pDark, figma.variables.createVariableAlias(dark))
        }
        aliasElev('system/surface/dim', themeNeutralP3, themeNeutralP0)
        aliasElev('system/surface/low', themeNeutralP2, themeNeutralP1)
        aliasElev('system/surface/mid', themeNeutralP1, themeNeutralP2)
        aliasElev('system/surface/high', themeNeutralP0, themeNeutralP3)
      }

      // stamp the apply's input recipe (the SPEC_KEY map above) — keyed by brand so an
      // overwrite replaces its own entry; the map survives brand ADDS untouched
      if (recipe !== undefined) {
        let specMap: Record<string, unknown> = {}
        try { specMap = JSON.parse(th.coll.getPluginData(SPEC_KEY) || '{}') } catch { /* unstamped */ }
        specMap[brand.toLowerCase()] = recipe
        th.coll.setPluginData(SPEC_KEY, JSON.stringify(specMap))
      }

      figma.ui.postMessage({ type: 'done', brand, aliases: aliasCount, createdShared, secondary: secondaryMode })
    }
    try {
      await withFontRetry(applyOnce)
    } catch (err) {
      figma.ui.postMessage({ type: 'error', message: String(err) })
    }
  } else if (msg.type === 'collect-specs') {
    // "Edit applied theme" + "Re-apply all brands" (owner 2026-08-28 — the ext C52
    // flow ported). Returns each brand mode's STORED recipe; a brand applied before
    // recipes existed gets a RECONSTRUCTION bundle read off the file (the identity
    // prims, the neutral prim's key, the custom-link prim path) that the UI
    // translates into form inputs. The `reason` echoes back verbatim (the C52
    // lesson: the specs reply is SHARED — without the tag the edit picker's refresh
    // could be mistaken for a batch round-trip and start one).
    try {
      const reason = (msg as { reason?: string }).reason
      const collections = await figma.variables.getLocalVariableCollectionsAsync()
      const themes = collections.filter(c => c.getPluginData(OWNER_KEY) === THEME_NAME)
      const prims = collections.filter(c => c.getPluginData(OWNER_KEY) === MODE_NAME)
      const allVars = await figma.variables.getLocalVariablesAsync()
      const varsOf = (collId: string) => {
        const map = new Map<string, figma.Variable>()
        for (const v of allVars) if (v.variableCollectionId === collId) map.set(v.name, v)
        return map
      }
      const specs: unknown[] = []
      const reconstructed: unknown[] = []
      const unstamped: string[] = []
      for (const theme of themes) {
        const profile = profileOf(theme)
        const prim = prims.find(c => profileOf(c) === profile) ?? prims[0]
        const primVars = prim ? varsOf(prim.id) : new Map<string, figma.Variable>()
        const themeVars = varsOf(theme.id)
        let stored: Record<string, unknown> = {}
        try { stored = JSON.parse(theme.getPluginData(SPEC_KEY) || '{}') } catch { /* unstamped */ }
        let primLight: string | undefined
        if (prim) {
          try { primLight = (JSON.parse(prim.getPluginData(MODE_IDS_KEY) || '{}') as { light?: string }).light } catch { /* unstamped */ }
          primLight = primLight ?? prim.modes[0]?.modeId
        }
        const hexOf = (v: figma.Variable | undefined): string | null => {
          const c = v && primLight ? v.valuesByMode[primLight] : undefined
          if (!c || typeof c !== 'object' || !('r' in c)) return null
          const b = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0')
          const rgba = c as figma.RGBA
          return `#${b(rgba.r)}${b(rgba.g)}${b(rgba.b)}`
        }
        for (const m of theme.modes) {
          const spec = stored[m.name.toLowerCase()]
          if (spec !== undefined) { specs.push({ ...(spec as object), brand: m.name }); continue }
          const primaryHex = hexOf(primVars.get(`brand/${m.name}/primary/identity`))
          if (!primaryHex) { unstamped.push(m.name); continue }
          const altHex = hexOf(primVars.get(`brand/${m.name}/alt/identity`))
          const aliasTarget = (path: string): string | null => {
            const v = themeVars.get(path)
            const val = v?.valuesByMode[m.modeId]
            if (!val || typeof val !== 'object' || !('type' in val)) return null
            return allVars.find(x => x.id === (val as figma.VariableAlias).id)?.name ?? null
          }
          const neutralTarget = aliasTarget('neutral/paper-99')
          const neutralKey = neutralTarget?.startsWith('system/neutral/') ? neutralTarget.split('/')[2] : null
          const linkTarget = aliasTarget('link/default/enabled')
          const linkMatch = linkTarget?.match(/^system\/link\/([0-9a-fA-F]{6})\/link$/)
          reconstructed.push({ brand: m.name, primaryHex, altHex, neutralKey, linkSeed: linkMatch?.[1] ?? null, profile })
        }
      }
      figma.ui.postMessage({ type: 'specs', reason, specs, reconstructed, unstamped })
    } catch (err) {
      figma.ui.postMessage({ type: 'error', message: String(err) })
    }
  } else if (msg.type === 'close') {
    figma.closePlugin()
  }
}
