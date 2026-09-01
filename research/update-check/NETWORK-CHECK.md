# Update check over the network (parked 2026-09-01)

Parked half of the extended plugin's update-notification round. The shipped half is
offline: a build identity stamped on the base collection at every apply, compared on
open against the identity compiled into the running plugin. That covers a stale FILE
(re-apply to update) and a stale PLUGIN whenever a collaborator has applied to the
file with a newer build. It cannot cover the third case: your plugin is old and no
newer build has touched the file. Only a network call can, and the plugin currently
declares `networkAccess.allowedDomains: ["none"]` (plugin-ext/manifest.json), so it
is parked here.

## Mechanism, when resumed

Three touch points, all additive:

1. **CI publishes a version file.** In `.github/workflows/pages.yml`, step "Package
   the extended plugin for manual install", write `_site/version.json` beside
   `okchroma-extended.zip`: `{ "version", "sha", "date" }` from the same build
   identity esbuild injects into the bundle (package.json version, `GITHUB_SHA`,
   commit date). The Pages deploy that ships the zip ships the json in the same
   push, so the two can never disagree.

2. **Manifest change.** `plugin-ext/manifest.json`:
   `"allowedDomains": ["none"]` becomes `"allowedDomains": ["https://egerrity.github.io"]`.
   Figma enforces this list as a CSP on the plugin UI iframe; with "none" every
   fetch is blocked before it leaves the sandbox. The manifest is read from disk on
   each run of a manifest-imported plugin, so the change takes effect when the
   installed folder's contents are replaced (the normal update path per
   install.html).

3. **UI fetch on open.** In `plugin-ext/ui.ts`, once at plugin start: fetch
   `https://egerrity.github.io/okchroma/version.json`, compare its `date` against
   the compiled-in build date. Newer means the top-slot notice adds one line:
   a newer build exists, download the zip again from the install page and replace
   the folder contents. Any fetch failure (offline, corporate proxy, org policy,
   CSP) is silent. Nothing else may depend on the response; the offline states must
   render identically whether the fetch succeeds, fails, or never runs.

## Why parked: org visibility

The install context is a Figma Enterprise org (work). Concerns, in order:

- `networkAccess` is declared in the manifest and visible to anyone who inspects
  the plugin folder or the org's plugin surface. An org that allows
  import-from-manifest plugins today may still flag or block one that requests
  network access, and a block there takes the whole plugin down, not just the
  check.
- Whether the org permits it is not knowable from this side. If it is added and
  blocked at the CSP or proxy layer, the silent-failure rule above means the
  plugin keeps working minus the one notice line, but the manifest still shows a
  network grant, which is the part that may draw review.
- Decision 2026-09-01: ship the offline stamp first; this variant only on an
  explicit later go, possibly implemented on the work machine. If it is ever
  rejected at work, revert item 2 alone; items 1 and 3 are inert without it
  (the json is just a static file, the fetch dies silently).

## Handoff notes (for a work-machine session)

- The compiled-in build identity is the prerequisite. If the offline round is not
  merged yet, there is nothing to compare a fetched version against; do that first.
- Exact files: `plugin-ext/manifest.json` (the grant), `.github/workflows/pages.yml`
  (the json, one `cat` line in the packaging step), `plugin-ext/ui.ts` (the fetch,
  next to the existing `file-state` handler around line 792).
- Do not widen the domain list past the one origin, and do not move the check into
  `code.ts`: the sandbox thread has no fetch; network belongs to the UI iframe.
