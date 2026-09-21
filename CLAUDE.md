# okchroma

okchroma is a color-system engine. One brand hex in (optionally two), a complete light and
dark token system out, with the contrast requirements solved during generation. It emits
CSS custom properties and Figma variables. Published on npm as `okchroma`. This repo is
public, and a push to `main` deploys the demo site and both Figma plugin zips.

The code is the source of truth. Where a doc, a comment, or a memory disagrees with the
code, the code wins.

## Layout

- `src/` the engine. `src/engine/` generation and emitters (`tokenNames.ts` holds the
  vocabulary, `figmaRender.ts` the Figma tree, `stopTable.ts` the ladders). `src/engine/requirements/`
  the requirement resolver. `src/build.ts` writes `dist/signals.css`.
- `demo/` the docs site and preview app. A preview of the output, not the product.
- `plugin/` the community Figma plugin. `plugin-ext/` the extended plugin (say "unlisted",
  never "internal"). `plugin-unify/` the Mapper.
- `tokens/semantic.css` the shipped alias layer (elevation planes, shadows, disabled).
- `scripts/` the audit gates. `docs/` see "Where things live". `research/` is moved,
  never deleted. `scratch/` is gitignored: handoffs, exhibits, personas, employer material.

## Commands

```
npm run build            # bundles the generator, writes dist/signals.css, bundles the demo
npm run dev              # esbuild --watch
npm run typecheck        # tsc --noEmit
npm run req:audit        # every declared requirement, agnostic sweep, both modes
npm run audit:guarantee  # the five band claims on the shipped 8-bit pair
npm run audit            # dark-mode parity + blessed snapshot (:bless to update)
npm run band-audit       # band order, the highlighter's 3:1, the neutral stamp, snapshot
npm run audit:divergence # neutral curve, red hue fidelity, snapshot
npm run smooth           # ramp smoothness against the recorded baseline
npm run figma:verify     # the Figma tree's shape and spot values
npm run audit:ext        # the extended plugin's override sets (:bless to update)
npm run docs:lint        # the docs' vocabulary rules; runs in CI
npm run plugin:build · plugin-ext:build · plugin-unify:build
```

Dev servers are in `.claude/launch.json` (demo on 8322; the sibling PoCs and the portfolio
have their own entries). A `:bless` re-records a snapshot; a snapshot that churns when it
should be stable is a finding, not something to bless.

## Vocabulary

- **The scale**, identical for every family: `paper-1/3/5`, `chalk-8/11/15/20`,
  `highlighter-26`, `pencil-47`, `pen-58/70`. The neutral adds the poles `paper-0` and
  `pen-100`. The instrument word is the job; the number is 100 minus the light rootL,
  bigger is stronger.
- **The stamp**: `stamp-fill`, `stamp-fill-hover`, `stamp-fill-pressed`, `stamp-edge`,
  `stamp-on`. Say "CTA" out loud; write `stamp`. Engine internals still say `cta`.
- **Families**: `neutral`, `brand`, `brand-alt`, `critical`, `warning`, `positive`, `info`.
  Signals are named by role on every emitted surface, never error/success/danger. The
  engine keeps red/yellow/green/blue internally.
- Never use "surface", "surfaces", "fills", or "text" as categories for the scale. The
  elevation planes in `tokens/semantic.css` are aliases onto neutral papers; they are the
  only legitimate "surface" word.
- A token label says the real token name. Preview content is free-form.
- Point at a color by its hex or a description ("a low-chroma warm seed"), never by a
  fixture brand name. The named brands in the fixtures are arbitrary hexes.

## Engine invariants (owner rulings, not bugs)

- The scale is the same across all families. The stamp is the only per-family
  differentiator. The neutral generates on its own curve.
- A role uses the same stop in both modes. A per-theme stop swap means the dark stops
  were generated wrong; file it against the engine. The elevation planes and the paper
  overlays are the owner-shipped exceptions.
- No corrective layers. A value must fall out of the pipeline; fix the source or the
  mapping, never the output.
- On-text is chosen on one criterion: it passes. Never favor, optimize for, or report
  white versus black. Both poles failing is a dead zone and the only reason to move a fill.
- WCAG is the shipped lane (`SHIPPED_PROFILE` in `src/build.ts`). APCA is a booster on
  the stamps (Lc 65 clearance on top of 4.5:1), never "the alternative law". The
  community plugin defaults to APCA on purpose; leave it. Unsure which lane applies? Ask.
- Guarantees read against own family plus neutral only. Blanket any-on-any was rejected;
  do not re-propose it.
- Dark sits on the photometric ladder deliberately. Apparent-lightness dark was tried and
  blue receded; do not propose porting a dialect across modes.
- The yellow machinery and the red-band cluster are intentional and off-limits without
  her word.
- Shadows are dark. A bright or saturated glow is a halo.
- Names carry no conformance. Descriptions carry it as WCAG levels in plain English, never
  as ratios or criterion numbers. The poles carry no letters at all.
- Structure and engine output are frozen (owner, 2026-08-27). Names are rename-in-place
  slots; values do not move for a rename.
- Reverted, never resurrect: the `semantic/` register split, the ink mirror, the escape
  ink de-chroma, C24 signal delivery, gold-flip, the light-wash apparent solve, the
  yellow-contrast follow-up, the cta-ink trios.

## How to work here

- Before any engine addition, change, or subtraction: say what, where, and how, then stop
  and wait for "yes". Reuse the generator; do not reinvent it.
- Exhibit first. The render page is the judging surface; engine edits come after she
  picks a direction on the exhibit.
- Show drafts before committing. Verify the branch right before a commit. Check
  `git diff --cached --stat` before and `git show --stat HEAD` after. A leading space in
  `git status --short` means unstaged. Never chain a commit behind a piped check; stage by
  path.
- Measure through the real pipeline (`resolveTheme` / `resolveBrand` into the emitters),
  never a direct `generateScale` call. Baseline through that path before any subtractive
  change, then diff. A gate alone is not proof; dump and diff.
- Test with agnostic hue by chroma sweeps. The bar is the worst-case chromatic edge, never
  gray and never the named brand list.
- Comments are hypotheses. Verify against code, and clean up the comments in every file
  you change. `docs/architecture.md` is not a safe source for prose claims either.
- Any change to the stop set, scale shape, or leaf shape migrates both plugins' `ui.ts`
  and templates alongside `demo/`, and checks the ladder-order regex in the ext override
  audit first.
- An empty grep is not evidence of absence (the rtk hook can swallow matches). Confirm
  with `rtk run` or a Python read before acting on "no matches".
- Docs and descriptions: utilitarian, no em dashes, mechanism over outcome, no pet names
  as explanations. State a WCAG criterion in plain English and link the clause. Run
  `npm run docs:lint` before showing prose.
- Timing comes from `git log`, or say nothing.
- A dropped objection is not consent. Close the loop before shipping into that area.
- A parked round is hers to resurrect. Never wire one into active work as a dependency.
- Handed material (a site, a doc, a file) means look and plan together, not build from it.
- One option, chosen and derived, plus the baseline it is judged against. No filler spread.
- Public repos carry no employer name. Before a push, grep for the employer's name and
  its prefixes; the private global rules file spells them. `Unify` is a product name and
  stays.

## Exhibits (anything she judges by eye)

- At the start of a round or a PoC, write the exhibit definition before the first build:
  what is judged, on what surface, one element type, background and grouping, the baseline
  and how she answers. Provisional is fine; missing is not. The exhibit is the test harness.
- Restate in one sentence what is being judged and on what surface; get a nod; then build.
- Ship clean: no strokes, glyphs, or annotation on or around the thing assessed. Swatches
  and columns abut, no gaps or borders. Labels sit above, on the page background.
- Dark output on a dark canvas. The light reference goes behind a toggle.
- The full role set in realistic context (the demo's token cards), never abstract ramps.
  On-colors render as `Aa` over their fill.
- One element type per exhibit. Group by the candidate being chosen, every hue inside each
  panel.
- Hand it over in a line and stop. The exhibit is the answer.

## Publishing

- A push to `main` runs `docs:lint`, the demo build, and the three plugin builds, then
  deploys the site with both plugin zips and `install.html`. Never tell her to rebuild
  locally.
- Verify a deploy from the site, never from a green workflow: curl each artefact, fetch
  the page, grep for what should and should not be there.
- She cannot test a plugin before a push. Push to main is the test loop, so pre-push
  verification has to be self-sufficient.
- Publishing to npm is hers. 0.x policy: a patch changes only resolved values, fixes, and
  docs; anything that adds, renames, or removes token keys or changes the emit structure
  is at least a minor. `CHANGELOG.md` dates are npm publish dates.
- An infrastructure-shaped failure: check githubstatus.com before diagnosing the repo.

## Where things live

- `docs/architecture.md` the maintainer's map. `docs/agents.md` the consumer contract
  (what every token name means, for agents in consuming repos). `docs/scale.md` and
  `docs/schema.md`.
- `docs/engine-spec/CATALOG.md` the found-problems ledger: log at find time, fix
  holistically after sign-off, never inline.
- `CHANGELOG.md` npm releases. `research/` prior explorations, kept.
- `scratch/handoffs/` dated session handoffs. `scratch/personas/` stays local and must
  never leak.
- Sibling repos: `../okchroma-material` and `../okchroma-base` (PoCs that consume the
  package from npm and are its test bed), and the owner's portfolio, which has no remote.
- Session conventions (the delegation gate, the chat-output contract) live in the global
  `~/.claude/CLAUDE.md` and are not repeated here.
