# Continue: requirement-token color engine (compact/handoff)

## ▶▶ THE TRUE WCAG/APCA SPLIT + APCA DEFAULT (2026-07-04, committed bc6a357→deec9b1)

Owner decisions (from render/wcag-pole.html — the flip sweep + shift ledger): the hybrid
(apca-informed polarity under the wcag profile) was "a legal thing, not a my-call thing" →
**each profile carries its own law**, and **APCA is the shipped default** ("so it looks nicer").
- **wcag** = the opt-in LEGAL mode: pole preference stays perceptual, but every chosen on-text
  pole passes 4.5 (`OnReq.ratioFloor` → onTextIsWhite pole flip; no dead zone, fills never
  move). onFill's floor = the existing enforcement (unchanged, byte-identical). **The PAIR
  law:** on-highlight is one token on hl-9 + hover hl-10; straddling hues have NO single pole
  passing both (measured worst 3.94) → the HOVER re-solves toward hl-9 (bisection, wcag only,
  11 fleet scales moved stop-10). Rejected alternative (measured, section ② of the render):
  shifting highlights for white@4.5 = median −0.024/−0.031 L but 24/48 DARK band inversions —
  the room doesn't exist.
- **apca** = the shipped default: withProfile strips the ratio floor; law = the Lc bars
  (enforceLc 75, hl band Lc 60). build.ts SHIPPED_PROFILE='apca' (static css now apca-solved);
  demo toggle + plugin seg default apca; demo re-emits signalsCss under BOTH selections (the
  static signals.css is apca now). Verified live: apca = white highlights everywhere; wcag =
  yellow/green flip black, pink/blue keep white (4.6+ legitimately).
- **Gates:** highlight-audit runs per-profile lanes (apca Lc-60 worst 63.5 · wcag 4.5-floor
  worst 4.52); dark-audit + its snapshot track the SHIPPED profile; dark/highlight/divergence
  snapshots re-blessed (divergence drift = exactly the 11 hover re-solves). All green.
- **Known intentional:** green dark cta reads black at Lc 63 under apca (the standing
  green-white-text follow-up, asserted as black-is-genuinely-better, not gated away).

## ▶▶ ROUND 6b ALSO BUILT (same session): derived=PASTEL + plugin UI = the demo

Owner's two post-review asks, both landed (record = SECONDARY-PLAN ROUND 6b): ① **derived
secondary is now PASTEL by default** (their answer to the derived-redundancy question — the
same-hue tint ramp read redundant next to brand+neutral; pastel differentiates; engine-pinned,
gate-asserted; ⚠ dark-pastel greyishness now sits on the default path). ② **Plugin UI reworked
to the demo's look/behavior** (mockup Frame 1739329230): 720×640, demo controls bar, the
three-state secondary field (+ Add secondary → derived → custom) with the chevron menu, and the
full family matrix replacing the ramp strips. ⚠ Plugin default posture changed derived→NONE
(the mockup shows "+ Add secondary") — awaiting owner veto. Browser-verified (plugin-ui.html
served statically: state machine + matrix + pastel row); demo rebuilt + reverified; ALL gates
green, snapshot clean. Uncommitted (show-before-commit, together with the round-6 pile below).

## ▶▶ OWNER REVIEW EDITS: ✓ ALL BUILT (2026-07-04 post-compact, talked through first)

All five demo edits + the plugin per-family port landed in the working tree (SECONDARY-PLAN
ROUND 6 = the full decision record). The talk-through resolved edit #5: the secondary field is
now a THREE-STATE control — "+ Add secondary" button (default; demo still starts with none) →
derived (input tracks the primary hex live, dimmed, passive "from primary" marker, NO style
chip — derived is ALWAYS tint, now engine-enforced) → custom (typing detaches; chip appears).
Chevron menu = From primary / Custom / Remove; sparkles + complementary suggestions deleted.
Also owner-decided (3 rounds): **the cta-stroke RULE IS GONE** — conditional gate deleted from
the engine (needsCtaStroke + fields + re-judge sites); emitters write cta-stroke TRANSPARENT
unconditionally; only the OUTLINE secondary resolves it (own highlight-8); token kept for a
future high-contrast re-solve. **Outline hover re-anchored to highlight-8 @ .09** (9% of the
generated cta was imperceptible). Snapshot legitimately clean (it tracks colors; the stroke
was an alias). Wrench answered: WCAG profile still uses APCA by design for on-text polarity +
the hl Lc-60 bar (see SECONDARY-PLAN ROUND 6b).
Plugin: Engine seg gone, primary mode select (Rec/Exact/archetypes), secondary seg From
primary/Custom/None, style select on custom, neutral renamed default/intense/true grey, and
OUTLINE now crosses themeToFigma (cta-1→transparent alias, cta-2 raw α.09, on-cta→sibling
ink-11 via non-pole detection). All gates green, snapshot clean. NOT yet committed —
show-before-commit; owner was live-driving the rebuilt demo during verification.
REMAINING after this: real-Figma apply/fork test · dark tint/pastel chroma · push call ·
install-docs walkthrough → Community.

## ▶▶ CURRENT STATE 2026-07-04 (write-through before possible compaction — READ THIS FIRST)

**THE TOPOLOGY (the owner's confusion-killer — there is NO separate forked repo):**
ONE GitHub repo `github.com/egerrity/okchroma`; Pages deploys its `main`. Two local checkouts:
`~/okchroma` = the OWNER's checkout (their session; NEVER touch) · `~/okchroma-reqtoken` = a git
WORKTREE of the same repo where Claude works. "Moving things over" = `git push origin
<branch>:main` — that's how every prior effort shipped.
- **origin/main = 8302363** (public page): EVERYTHING is shipped (pushed 2026-07-04 — rounds 6/6b, the true split, apca default).
- **`reqtoken/color-engine`** (worktree, unpushed +4): 761569a plugin WCAG/APCA seg → f53d3b9
  SECONDARY-PLAN → f6a61d9 plugin profile-fork ("fork, don't mix" + description stamps) →
  3fb20be asymmetric fork naming (theme-apca; original never renamed).
- **`scope/secondary-styles`** (CURRENT branch, contains ALL of the above +5): 9dfd935 engine
  (resolveTheme · tint/pastel/outline/exact styles · distance-curve subtle · cta-stroke tokens ·
  rung-1 mirror) → 8e5e970 plugin (Derived/Custom/Off default Derived, resolveTheme migration,
  cta-stroke aliases) → d3a58d6 demo (per-family mode chips per the owner's mockup, derived chip,
  stroke consumption) → bb1c578 gates+sweeps (audit:secondary two lanes; render/secondary.html =
  the decision record) → 216f516 docs. ALL GATES CERTIFIED GREEN on the committed tip; snapshot
  clean (shipped output untouched). **Pushing scope/secondary-styles:main ships everything (it
  contains the other branch's commits).**

**PLUGIN CHANGES — separate commits, ONE history:** 761569a + f6a61d9 + 3fb20be (contrast
profile posture) and 8e5e970 (secondary postures + stroke aliases) are all ancestors of
scope/secondary-styles. NOT YET BUILT in the plugin: the secondary STYLE chips
(tint/pastel/outline/exact — plugin currently ships tint via Derived/Custom; outline aliases
sketched in SECONDARY-PLAN: cta-1→system/transparent, on-cta→sibling ink-11, cta-2 raw alpha).

**HOW THE OWNER REVIEWS (paths, no git needed):**
- Demo → the `reqtoken-demo` preview (launch config serves `~/okchroma-reqtoken`; open
  `/demo/`). Rebuild first if sources changed: `cd ~/okchroma-reqtoken && npm run build`.
- Decision sweeps → the `reqtoken-render` preview → `/secondary.html` (also `/apca.html`).
- Plugin → Figma desktop → Plugins → Development → **Import plugin from manifest** →
  `/Users/emilygerrity/okchroma-reqtoken/plugin/manifest.json` (build first:
  `npm run plugin:build`). Test on a SCRATCH file: apply once (WCAG, Derived default) → check
  theme/mode collections + descriptions stamped "OKChroma · contrast: …" + brand/secondary
  group + cta-stroke aliases → switch APCA → Apply twice → expect untouched theme/mode PLUS new
  `theme-apca`/`mode-apca`.

**RECOMMENDED SEQUENCE:** ① owner eyeballs demo (chips: primary Recommended/Exact/anchors;
secondary Tint/Pastel/Outline/Exact; derived chip) ② one real-Figma plugin run (above)
③ push `scope/secondary-styles:main` (publishes page; ~/okchroma pulls) ④ then the publish
tail: plugin style chips · dark tint/pastel chroma (owner: "neither look great" — per-style
dark constants now possible) · install-docs walkthrough → Community.

**GATES:** npm run audit (snapshot) · req:audit · audit:secondary · highlight-audit ·
audit:divergence · figma:verify · typecheck · plugin:build. Rules: rtk proxy grep · caveman
subagents · show-before-commit · never touch ~/okchroma · push only via
`git push origin <branch>:main` after owner approval. Memory: [[secondary-collision-plan]],
[[requirements-token-research]].

## ▶ SECONDARY P1 BUILT (2026-07-04, UNCOMMITTED — awaiting owner sweeps): the road to Community publish
Sequencing (owner): lock secondary → demo display → plugin update → PUBLISH to Community; then the
internal-only plugin (repo-local, unpublished) for the owner's workflow needs.
- **Engine:** `resolveTheme` in resolve.ts (primary+signals byte-identical FIRST — snapshot clean;
  secondary vs the POST-shift signal set; per-signal room: red/yellow → auto-subtle, green = one
  move primary-priority, info moves freely but any variant must clear BOTH; residuals annotated
  never silent; P↔S distinctness advice ΔE<0.12 provisional). `generateSubtleSecondary` = the
  neutral tint axis at SUBTLE_SECONDARY_MULT 4.5 (candidates 3/4.5/6) + quiet stop-4/5 cta.
  **resolveBrand gains internal `skipCollisionRules`** — the secondary base skips rung-1 etc.
  (owner rule: red yield goes LIGHTER, the rung-1 MIRROR; supersedes "secondary earns rung 1").
  `deriveSecondary` = the §2b posture (no hex → subtle from the brand hue).
- **Gate:** `npm run audit:secondary` (480 themes, both profiles, PASS): clears-or-demoted
  invariant, variants-clear-primary, annotated residuals, derived validity. **STATS FOR THE OWNER:
  50% of arbitrary secondaries demote at today's thresholds (red 80 · green 90 · info 70 ·
  yellow 0); only 8 signal moves — the 0.16/0.10 thresholds (tuned for PRIMARY stakes) over-fire
  for variants, same pattern as gold-vs-yellow.**
- **Owner sweeps = render/secondary.html** (scripts/secondary-sweep.ts): ① subtle mult pick
  ② red-mirror + gold in situ ③ borderline-demotion calibration cards (the threshold question)
  ④ a real info move ⑤ derived preview. Verified in preview.
- **Demo:** CustomTheme → resolveTheme end-to-end; "Secondary color" (vocab fixed from "Accent"),
  "Secondary style" Standard/Subtle seg, resolution note under the Secondary scale ("Resolved
  subtle (auto) · reads close to info-color (ΔE 0.03) → subtle register"), decision toasts.
  Verified live (green complementary → standard; subtle flip; violet → auto-demote + toast).
- **REMAINING before publish:** owner picks (mult · thresholds · green rule confirm · derived
  default-or-option) → lock + possibly re-tune → plugin secondary path migrates to resolveTheme
  (+ Subtle toggle) → plugin install docs (thin — Community listing needs a walkthrough) → real
  Figma test of the profile fork flow → publish.

## ▶ APCA/WCAG contrast-profile spike: DONE — OWNER-APPROVED 2026-07-02 ("yes!" on the recommended map)

**Shipped WCAG output untouched — `npm run audit` snapshot CLEAN with the profile code live.**
All gates green: req:audit (now 288 seed×mode across BOTH profiles, 0 failures) · audit ·
highlight-audit · audit:divergence · figma:verify · plugin:build · typecheck · portability 25/25.

What landed (all in the working tree, show-before-commit):
- `src/reqtoken/spec.ts` — Require union gains `{ metric: 'apca', against: 'paper-2', targetLc }`.
- `src/reqtoken/profiles.ts` (NEW) — `withProfile(spec, 'wcag'|'apca', lcMap?)`: maps wcag→apca
  requires; identity for 'wcag'; min-separation passes through. `DEFAULT_APCA_LC_MAP = {3:30, 4.5:60, 7:90}`.
- `src/reqtoken/producers.ts` — `apcaYAt` + `findMaxLForApcaLc` (bisection in EMIT space: chroma
  gamut-clamped per candidate L — raw-chroma solving lost >1 Lc to the emit trim on saturated
  yellows); `placeLightScale`/`placeLightText` now take a metric-blind `maxLFor` closure (the wcag
  closure calls findMaxLForContrast with the exact old arguments — float-identical, snapshot-proven).
- `src/reqtoken/resolve.ts` — per-metric closures (`maxLForOf`), generalized dark conditional-floor
  bisection (apca measures emit-space; wcag floats untouched), apca verify branch (fail-loud).
- `src/engine/colorEngine.ts` — `contrastProfile?: 'wcag'|'apca'` on GenerateOptions; adapter
  compiles withProfile(). Default 'wcag' = identity.
- `scripts/reqtoken-audit.ts` — the whole sweep runs under both profiles; apca requires verified.
- `scripts/apca-sweep.ts` → `render/apca.html` (NEW) — the owner eye-check: 3 candidate Lc maps ×
  wcag-vs-apca side-by-sides (6 edge seeds, real components, light-on-light/dark-on-dark) +
  24-hue movement table + Lc/ratio annotations per stop.
- docs: schema.md (apca require + profiles section) · architecture.md limitation #1 updated.

**FINDINGS (render/apca.html — now framed as ONE question: "does the APCA column look right?"):**
1. **The Lc map is SETTLED as a recommendation (owner round 3: "why wouldn't we just do the
   recommended?"): DEFAULT_APCA_LC_MAP = {3:30, 4.5:75, 7:90}.** Each slot measured, not copied
   from a bridge table: 30 = APCA solid-UI minimum (45 breaks the dark highlight band); 75 = APCA
   body-text minimum AND the measured equivalent of the shipped cta enforcement (so ctas keep
   their shipped look); 90 already holds. Rejected variants (4.5→60 releases ctas lighter;
   3:1→45 structural break) are footnotes on the render page with one seed-pair each.
2. **Dark stop-8 is the WCAG blind spot:** it reads only Lc 24–29 vs dark paper-2 (ratio 3:1
   passes; APCA says barely visible). Under Lc 30 it lifts modestly (L 0.550→~0.58, all hues).
   **Under Lc 45 it must rise to L≈0.69 — PAST hand-placed highlight-9 (0.600)**: bridge-45 is
   structurally incompatible with the current dark highlight band (marked ⚠ in the render);
   adopting it means re-placing that band.
3. **Light stop-8 RELAXES lighter under apca** (WCAG 3:1 reads Lc≈54 — over-demanding vs either
   candidate): saturated green L 0.624→0.740, ratio drops to ~1.97 (fails 1.4.11 *under the ratio
   metric*, by design — different conformance model). A re-solve moves stops both ways.
4. Light ink 11/12 already read Lc 67–77/92+ → barely move; dark ink lifts only where <60/<90.
5. **ON-TEXT IS IN THE PROFILE (owner call, round 2):** withProfile sets `ons.onFill.enforceLc`
   from the map's 4.5 slot — pole judged pure apca-pole (wcag flip = metric-mixing, provably a
   no-op under one metric; poles differ on 5–6/72 seeds), cta enforcement re-solves to Lc instead
   of 4.5 (producers: whiteTextLcAt/findLForWhiteTextLc/ctaLightLApca/ctaDarkEnforcedLApca, all
   emit-space). **MEASURED BRIDGE FACT: the shipped WCAG 4.5-white enforcement lands ctas at
   Lc ≈ 76–78** → a 4.5→60 map RELEASES fills lighter (white text Lc 64–71, ratio drops to ~3.3–3.9
   by design); a 4.5→75 map REPRODUCES the shipped ctas (ΔL ≤ ~0.02). That's the on-text half of
   the Lc-map decision. Render columns now show the cta button + on-fill Aa and highlight-9 + Aa.
6. **THE SWITCH IS BUILT + OWNER-APPROVED ("PERFECT", 2026-07-02, committed + pushed):** contrastProfile
   threads end-to-end — resolveBrand opt (floor + profile-matched canonical signals via
   `signalScalesFor(profile)`, lazy apca cache; collision decisions compare like with like),
   pickSignalShift/swap/lemon regenerate under the profile, generateNeutralScale(brandH, level,
   profile) (+ pure apca-pole on-text judgment for the scale-fed neutral cta), cssRender
   brandCss/neutralCss profile params + NEW `signalsCss(profile)` (moved from build.ts, shared),
   figmaRender ThemeInput.contrastProfile, index.ts exports. **Demo: "Contrast standard" WCAG/APCA
   Segmented in CustomTheme's controls bar** — APCA re-resolves brand+accent+neutral and appends
   the apca signal block as an override. Verified live: dark info-color stop-8 #6f68a8 → #7971b4
   (the lift), light stop-8 relaxes, cta ships-hex re-solves (#D92B75→#DA2C76). All gates green
   AFTER the threading (snapshot CLEAN — default untouched). Probe: red-collider brand flips
   darkCollider null→muted under apca (borderline collision, profile-consistent — expected);
   green light cta = the pole-flip case (black text, no white-enforcement darkening).
   STILL OPEN: PaletteGallery (hidden view) not threaded; DocsSite/schema note the profile but
   not the demo toggle.
7. **PLUGIN PROFILE = ONE PER COLLECTION PAIR (owner design, 2026-07-02):** the plugin exposes a
   Contrast WCAG/APCA seg; a file never mixes profiles inside a pair. The first `-apca`-suffix
   dedup approach was REJECTED by the owner ("not create new values… check and warn") and
   replaced: every variable's DESCRIPTION carries the visible stamp ("OKChroma · contrast: …"),
   each collection carries `okchroma-profile` plugin-data, and a mismatched apply goes through
   the existing two-step confirm — confirming FORKS the file. **NAMING = ASYMMETRIC (owner call,
   round 2): the original pair is NEVER renamed** — one-lane files keep plain "theme"/"mode"
   forever (downstream pipelines pointed at them never break); only the forked addition is
   suffixed **"theme-apca"/"mode-apca"** (hyphen + lowercase full word — slug-safe, one-line
   Style Dictionary strip; parens/spaces and -a/-w single letters both rejected). Post-fork,
   applies route silently to their profile's pair by tag.

Eye-check: `render/apca.html` via the reqtoken-render preview (renders verified in-session, both
modes, break markers visible). Owner picks: Lc map · adoption/exposure · the ons-fallback question.

## Where things stand (2026-07-02, end of the merge day)

- **The requirement-token engine IS production okchroma**: origin/main @ b95864a. History:
  71a66fe → c7542b7 (engine replacement, byte-identical cutover) → 8b79504 (stage-7 cleanup +
  docs + elevation-mirror semantic aliasing) → 93dd626 (neutralCss anchor fix) → 523a9d9
  (blue-recede: 'perceptual-lift' dark producer) → b698527 (paper-0 = resolved stop 0) →
  f2372de (paper-0 dark rootL 0.16) → 6841710 (docs/schema.md) → 48ea5e5 (DocsSite schema
  article, live-emitted tokens) → 2ba478d (plugin: adaptive paper-0 via neutral ramp payload,
  on-fills decoupled to per-mode abs poles, accent→secondary, secondary default OFF) →
  b95864a (elevation anchors renamed paper-raised/paper-sunken).
- **Work in `~/okchroma-reqtoken`** (worktree, branch `reqtoken/color-engine` == origin/main).
  The owner's `~/okchroma` is on main, possibly behind origin — NEVER touch that tree (their
  parallel session lives there; push main via `git push origin reqtoken/color-engine:main`
  after owner approval, exactly as before). Show before commit; verify branch before commits.
- **Docs surfaces:** README · docs/architecture.md (§2b schema concept) · docs/scale.md ·
  docs/schema.md (field reference) · DocsSite "The token schema" (live-emitted). Keep all in
  sync with any spec change. Vocabulary: scale/cta/ons — never "surface" as a category,
  "secondary" never "accent", signals by identity.
- **Open follow-ups besides APCA:** demo "Accent color" input label (same vocab sweep, demo
  side — flagged, owner hasn't called it) · plugin install docs gap (owner raised it, then we
  got pulled onto the plugin globals — the DocsSite Installation article has one thin line;
  README/architecture cover it better; probably wants a proper walkthrough).
- Yellow-in-light: FIXED (owner-confirmed) — off the list.

**STATUS 2026-07-02 (late night): STAGE 7 IMPLEMENTED (uncommitted, awaiting owner review): deleted src/engine/legacy/ + engine-parity + parity-probe + reqtoken-diff(+report) + 18 historical research scripts (helmk-*, census/candidates/probes, workflow generator) + helmlab dep + the parity npm script; YELLOW_L_LIFT → YELLOW_BAND (the lift value was dead; the band definition was live in highlight-audit); "surface" vocab renamed to scale in reqtoken files + TokenCards labels/copy; docs reworked to the schema (README how-it-works, architecture.md §2 pipeline + new §2b "The requirement schema", scale.md stop table w/ declared requirements + new wash rootLs, DocsSite pipeline/scale prose); demo fixes: highlight-8 swatch no longer shows "Aa" (non-text stop), side-nav confirmed neutral-paper-2 NOT wash-3 (measured #f2f4f2 C 0.003 — reads deeper since the 0.028 push). OWNER'S ELEVATION-MIRROR SPEC IMPLEMENTED in tokens/semantic.css: raised/sunken mirror around the paper-1 page via the mode-flipping --paper-0 anchor (light: raised=paper-0/white, sunken=paper-2 · dark: raised=paper-2, sunken=paper-0/black — dark sunken previously sat AT the page level, never sank). Verified both modes in the live preview. All gates green post-rebuild.**

Stage-6 final form (all owner-picked from render sweeps):
- paper-2: min-separation ΔE ≥ **0.028** vs paper-1 (light; dark already ~0.035).
- wash 3–7: HOLISTIC re-space (owner's call over my per-seam chain patch — kills the warm-hue inversions at the source): rootLs shifted down by S=0.015 tapering to 0.6·S at stop 7 (uses ~0.009 of the 7↔8 room) → spec.ts LIGHT_WASH_ROOT_L literals.
- wash seam floors: min-separation ΔE ≥ **0.012** vs 'prev' declared on stops 3–7 (the standing anti-collapse guarantee; binds almost nowhere post-re-space). Collapse cases that forced this: muted warm H60 C0.06 AND near-gray (any low-chroma seed — chroma contributes nothing to seam ΔE).
- Isolation proven: dark stops/cta/ons/collision-decisions = 0 diffs vs legacy; light moved exactly at stops 2–8 (+11 where the 4.5 clamp binds). All snapshots re-blessed + smooth re-baselined post owner approval; demo rebuilt and eye-checked.

Replacement summary (plan = ~/.claude/plans/ok-let-s-plan-recursive-shamir.md, all owner decisions honored):
- Stage 0: `src/engine/legacy/` verbatim frozen copies + `scripts/engine-parity.ts` (npm run parity; 12,062 comparisons incl. resolveBrand decisions).
- Stage 1: spec restructured — cta/ctaHover = OFF-SCALE ROLES (numbering fix), highlight 9/10 = scale stops, declared 'on' requirements, C9 4.5 rule dropped, RESOLVER_ID @2.
- Stage 2–3: producers.ts = verbatim engine math (light 'warm-drift' hue producer ≠ torsionedHue!, ladder/envelope chroma blend, aesthetic state, dark floors/curves/collider/enforcement, exact on-boolean asymmetry). `scripts/reqtoken-parity-probe.ts`: 112,944 comparisons float-identical, both modes, 18 opts combos.
- Stage 4 CUTOVER: generateScale body = adapter over resolveRamp. Engine-parity byte-identical; all snapshots CLEAN (zero output change); figma:verify + plugin:build + demo eye-checked both modes.
- Stage 5 dark flip: dark stop-8 3:1 + text 4.5/7 DECLARED (conditional floor: passing hues don't move). FINDING: the hand-placed dark scaffold already satisfies them everywhere probed → zero value drift, pure guarantee, NO re-bless needed. (Blue-recede at WASH stops = separate future declarable, owner to scope.)
- Stage 6: `min-separation` require kind implemented + verified; NOT yet declared — owner picks target from render/paper2.html (candidates 0.020/0.028/0.035; current light median 0.013, dark ~0.035). Downstream requires re-solve automatically (proven in the render: stop-8/11 ripple).
- Stage 7 (pending owner): delete legacy/ + engine-parity + parity-probe + reqtoken-diff + dead YELLOW_L_LIFT; dtcg emit for full role model.
Phases delivered this session: portability spike (`scripts/reqtoken-portability.ts`, 24/24 — round-trip bit-identical, edited-requirement-is-honored, fail-loud), text stops 11/12 + cta/9 in `spec.ts`/`resolve.ts` (producer kinds now: hue warm-torsion|constant, L perceptual|anchor, chroma ladder|brand), gate extended (144 seed×mode, 0 failures incl. cta 4.5 + text 4.5/7.0 BOTH modes), okchroma-diff (`scripts/reqtoken-diff.ts` → `reqtoken-diff-report.md`; 321/616 within ΔE 0.02, rest classified onto bolt-ons/deferred aesthetics + 2 INSPECT buckets: light wash chroma model, misc), DTCG emit (`scripts/reqtoken-emit.ts` → `out/reqtoken.tokens.json`), eye-check render (`scripts/reqtoken-render.ts` → `render/index.html`, served via launch config `reqtoken-render`; all 6 edge seeds valid, dark stop-8 clearly reads off dark paper = blue-recede prevented BY RULE). Engine still byte-identical (`npm run audit` clean).

## STATE (verified working — do not rebuild)
- **Fork:** worktree `~/okchroma-reqtoken`, branch `reqtoken/color-engine` off main `71a66fe`, node_modules symlinked.
  Isolated from `~/okchroma` (owner's PARALLEL session on `research/dark-mode-hk-normalization` — do NOT touch) and `~/okchroma-sandbox` (earlier POC).
- **Plan (approved):** `~/.claude/plans/ok-let-s-plan-recursive-shamir.md` — read it.
- **Built + VERIFIED** (surface stops 1–8, light+dark, ANY seed):
  - `src/reqtoken/spec.ts` — requirement declaration as PURE DATA (the portable artifact).
  - `src/reqtoken/resolve.ts` — resolver: **producer** (warm torsion → chroma ladder → `perceptualRungL` Nayatani) → **require** (contrast clamp, iterated; light = `findMaxLForContrast` down, dark = bisect up) → **refine** (`clampChromaToGamut`). Total (fails loud via `unresolvable`). ~60 lines, reuses real engine funcs.
  - `scripts/reqtoken-audit.ts` — THE GATE. Agnostic 24-hue × 3-chroma sweep. **Result: 144 seed×mode, 0 failures, GATE PASS.** appL uniform ~2–4 (stop-8 = 7.7 light: require overrides producer — CORRECT).
  - 3 behavior-preserving exports added in `src/engine/colorEngine.ts`: `goldSpineHue`, `torsionedHue`, `hexToOklch`. Engine unchanged — confirmed by `npm run audit` → "snapshot regression: clean — matches blessed build".
- **NOT committed** (owner's "show before commit" rule).

## KEY DECISIONS (settled — don't re-litigate)
- **Gate = requirement-satisfaction, NOT okchroma parity.** okchroma = a divergence DIAGNOSTIC only. Matching it would reproduce its bugs.
- **Clean producer:** reproduce only the CORE (perceptualRungL + torsionedHue + contrast + gamut). okchroma's aesthetic machinery (`chromaBoost`/`mutedness`/`red-cool`/collision) is DEFERRED → documented divergence, folded in during a later aesthetics pass. Keeps the resolver small.
- **Red-cool:** important, STAYS — but it's part of the COLLISION machinery, deferred (not this slice).
- **Portability (settled):** requirements = portable data (→ DTCG `$extensions`); the producer (Nayatani/gamut/torsion) is an algorithm + appearance model, NOT a portable formula → a NAMED resolver (the DTCG "computed source" model). Keep `spec.ts` pure data, separated from resolver code, so portability = serialization, no rebuild. Do NOT build a full expression-grammar spec.

## NEXT (plan phases, each gated by reqtoken-audit green)
1. **Portability spike** — one stop's requirement (data) → DTCG `$extensions` token (+ `$value` fallback + named producer ref) → resolver reads it back + resolves. Reuse `figmaRender.ts` DTCG `$type`/`$value` shape.
2. **Text stops 11/12** (contrast-required 4.5 / 7 vs paper-2). Reuse `findMaxLForContrast` + `STOP_11`/`STOP_12` tables.
3. **CTA/fill 9** (contrast-required; brand family; producer L = `scaleL`/archetype median).
4. **okchroma-diff report** — run the ENGINE `resolveBrand` (`src/engine/resolve.ts`) per seed, diff per stop (L/C/H, ΔE) worst-first, classify each divergence vs the 6 bolt-ons: `applyRedCoolRender`, collision re-solve, `pickSignalShift`, dark-highlight placement, dark-stop-8 placement, chroma floor. Report-only.
5. **Emit** full-slice requirements to DTCG `$extensions`.
6. **Eye-check render** — reqtoken ramp for edge seeds (saturated yellow/green/blue, near-gray) via `preview_start` + `preview_screenshot`. Aesthetics deferred; confirm valid.

## REUSE (import, no reproduction)
`perceptualL.ts` (perceptualRungL, apparentL) · `constraints.ts` (wcagY, contrastRatio, findMaxLForContrast, findLForContrast, clampChromaToGamut, oklchToLinearRgb) · `stopTable.ts` (LIGHT_L, DARK_NEUTRAL_L, LIGHT_STOPS, DARK_SUBTLE_CHROMA_MULT, STOP_8/11/12 constants, WARM_TORSION, GOLD_SPINE, DARK_STOP_9_MIN_L) · `colorEngine.ts` (hexToOklch, goldSpineHue, torsionedHue — now exported).
Map reference: `colorEngine.ts:249–513` (generateScale phases) · `scripts/gamut-sweep.ts` + `highlight-audit.ts` (sweep skeleton).

## RUN
Gate: `cd ~/okchroma-reqtoken && npx esbuild scripts/reqtoken-audit.ts --bundle --platform=node --outfile=dist/reqtoken-audit.js && node dist/reqtoken-audit.js`
Engine-unchanged check: `npm run audit`

## CONSTRAINTS
Work ONLY in `~/okchroma-reqtoken`; nothing on `main`; show before commit; verify branch before any commit. Token discipline: caveman-terse subagents + right-size fan-out + rtk auto-on (`~/.claude/CLAUDE.md`). Judge via real output.
