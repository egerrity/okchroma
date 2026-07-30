# Handoff — Unify → OKChroma primitive mapping, the comparison artifacts

Written 2026-07-30. **The starting prompt is at the bottom, ready to copy.** Everything above it is
the ground truth a fresh session needs: what the deliverable is, what already exists, and what the
accuracy bar is per artifact.

---

## WHAT THE DELIVERABLE IS

**One page, built to be screenshotted from — and it is the ORPHAN LINK.** The assets belong at
`egerrity.github.io/okchroma/#/unify-compare`, which `demo/index.tsx` gates as *"an ORPHANED exhibit
(owner-bookmarked; linked from nowhere)"*. So this round extends
`demo/unify-compare/UnifyCompare.tsx` rather than creating a new route or a deck — one scrollable
page the owner captures images out of.

⚠️ **THE ORPHAN LINK PUBLISHES FROM `main` ONLY.** `.github/workflows/pages.yml` builds on pushes to
`main`, so work parked on a branch is NOT visible at that URL. The round can develop on a branch,
but she cannot screenshot anything until it merges — plan for a merge when the artifacts are ready
(mid-round merges to `main` are normal here), and verify the deploy from the SITE afterwards, never
from a green workflow.

That framing decides several things:

- **Completeness and accuracy beat portability.** This is explicitly why it is NOT being printed
  into Figma. Do not spend effort on export plumbing at the cost of getting the numbers right.
- SVG export would be nice but is NOT a priority. Worth knowing, and worth telling her: the existing
  charts are already real `<svg viewBox>` elements in the DOM, so they screenshot cleanly at any
  zoom and can be lifted as SVG later with a small helper. Prioritising accuracy costs her nothing
  here.
- Everything must render in **light and dark** where the artifact is mode-dependent, and the dark
  ones must sit on a dark background.

### The accuracy bar is DIFFERENT per artifact. This drives effort allocation.

| artifact | bar | why |
|---|---|---|
| **Perceptual-L graphs** (spaghetti, wobble) | **CRITICAL — must be exactly right** | She cannot manually recreate these. If they are wrong, the error ships and nothing catches it. |
| **Stop contrast plots** | **HIGH** | She *can* build these by hand, but it is prohibitively time-consuming, so an accurate image is acceptable and will be trusted. |
| **Brand-primary fork examples** | **Communicative, not final** | She will REBUILD these in Figma so they can be toggled through modes. They need to convey the mapping unambiguously; they do not need to be the shipped asset. |

Read that table before deciding where to spend the round. The graphs are the part that must be
defended value-by-value; the fork examples are a spec for a Figma rebuild.

---

## The two claims the artifacts have to prove

**1. PREDICTABILITY AND UNIFORMITY.** The ramps are perceptually uniform, so hierarchy is something
you *assign* rather than something that happens to you. Concretely: a chip reads at the same level
in every theme; a component like an avatar takes ONE primitive and lands at the same level across
themes; illustrations can be set globally; and hierarchy holds no matter what colour the brand is.
The claim is testable — that is the point of the apparent-L artifacts.

**2. THE DISTRIBUTION IS A PHILOSOPHY, NOT AN ACCIDENT.** OKChroma clusters the ramp heavily at the
light end, secondarily at the dark end, and leaves little in the middle. That serves colour
minimalism: it removes purely decorative mid-range colour and spends the budget on nuance at the
papers instead. The mid and dark end (highlight → ink) is characterised by CONTRAST REQUIREMENTS
measured against the papers. The washes carry interaction nuance, which is what lets interaction
states be intentional — no more mixing black into a surface element to get a hover.

---

## HOW UNIFY ACTUALLY WORKS — read this before plotting anything

**A brand in Unify is THREE ALIASES, not a ramp.** Per brand, three primitives are aliased into the
semantics:

| Unify alias | comes from |
|---|---|
| accent | stop **50** |
| highlight | stop **200** |
| brand primary | **one of 500–900**, chosen per brand |

That is the entire brand surface. Everything else — buttons, focus rings, coloured text, links,
interaction states — is then piled onto that single **brand primary**, which is exactly what
artifact 4 exists to show.

**Consequence for the data (I had this wrong in the first draft):** the brand ramps carrying only 7
stops — 50, 200, 500, 600, 700, 800, 900 — are **NOT truncated**. That IS the published shape, and
it maps precisely onto the alias scheme above. Eggplant and Violet carry 10 because they hold
additional intermediate stops; the 7-stop set is not a gap and must not be "fixed" by asking her for
more. Plot what is there.

---

## What already exists, verified in the tree

**`demo/unify-compare/unifyData.ts` (753 lines) — the Unify data is ALREADY HERE.** Read it before
asking her for JSON.

| export | contents |
|---|---|
| `UNIFY_RAMPS` | 6 brand ramps: Blue, Eggplant, Green, Orange, Teal, Violet — light + dark hex per stop |
| `UNIFY_SIGNAL_RAMPS` | Lime, Amber, Scarlet — 10 stops each |
| `UNIFY_GRAY` | 12 stops |
| `UNIFY_THEMES` | 7 themes (6 live, 1 archived), each with `primary` / `highlight` / `accent` aliases carrying `{hex, family, stop, darkHex}` — this is the alias scheme above, already encoded |
| `UNIFY_SEMANTIC_CENSUS` | 42 semantic tokens across 7 palettes |

**`demo/unify-compare/UnifyCompare.tsx` (603 lines) — live at
`egerrity.github.io/okchroma/#/unify-compare`.** Already carries three sections and **both graph
types described as "started"**:

- a **dot-per-theme chart** (x = theme, y = apparent L*) — the *wobble* artifact
- a **ramp-shape chart** (x = normalised position along the ramp, y = apparent L*) — the *spaghetti*
- both call `apparentL` from `src/engine/perceptualL`, so **both systems are measured with the same
  ruler**. Keep that. It is the only reason the comparison is fair.
- section 3 already contrasts "three tokens per brand" against a full generated system — which, per
  the alias scheme above, is literally accurate rather than rhetorical

**Not found in the tree:** any contrast-comparison chart (the "started with lime" one) and the
brand-primary fork graphic. If the lime chart exists it is a scratch render outside the repo — ask
rather than rebuilding blind.

---

## The artifacts, in build order

**Build ONE example completely, show the structure, get approval, then build the rest.** Per
artifact type — not once for the whole set.

**1 · Perceptual-L spaghetti graphs (light + dark).** EXISTS — audit for accuracy, do not rebuild.
Check: every Unify stop plotted through the same `apparentL` call as OKChroma's; dark values read
from the dark hex rather than recomputed; and x-axis normalisation honest when the two systems have
different stop counts (7–12 vs 10). **This is a CRITICAL-accuracy artifact.**

**2 · Perceptual-L stop-wobble graphs (light + dark).** EXISTS — same audit, same bar. The current
copy argues the residual wobble in ink-9 is principled (the text register solves a contrast
requirement, contrast is luminance, so equal contrast is not equal apparent L). Re-verify that
against current output before repeating it.

**3 · Stop contrast comparison charts (light + dark).** Three charts:
   1. all Unify signals together vs all OKChroma signals together
   2. Unify Gray vs OKChroma neutral
   3. the four brands — **eggplant, blue-600, orange-500, green-500**

**4 · Brand-primary fork graphic.** The payoff. Unify puts every job on the one `brand primary`
alias; OKChroma forks them:

| the job | where OKChroma puts it |
|---|---|
| focus ring | `highlight-8` |
| buttons | `cta` (+ its own hover/pressed) |
| coloured text | `ink-9` / `ink-10` |
| links, diverging from the brand | `cta-ink` trio |

Layout: one composition containing **a link, a text button, two levels of text, an input with a
focus ring, and a cta** — rendered twice. First, all of them on Unify's single brand primary.
Second, each on its forked token. Pair it with the contrast graph showing what overburdening one
token costs. **She will rebuild this in Figma to toggle modes** — so make the mapping unmistakable;
do not gold-plate the rendering.

---

## The comparison sets

1. **Unify Gray** vs **OKChroma neutral**
2. **Unify Scarlet / Amber / Lime** vs **OKChroma critical / warning / positive**
3. **Brands: eggplant, blue-600, orange-500, green-500**

⚠️ **USE THE UNIFY THEME, NOT `src/brands.ts`.** Brand identities come from `UNIFY_THEMES` aliases
(`primary.family` + `primary.stop`). `src/brands.ts` is a different roster for a different purpose
and using it invalidates the comparison.

---

## Method — non-negotiable

- **WCAG lane only.** Every measurement, exhibit and decision. Do not add APCA columns.
- **Measure through the real pipeline** — `resolveBrand` / `resolveTheme` / `signalScalesFor` →
  emitters. Never `generateScale` directly.
- **One ruler for both systems.** `apparentL` for lightness, `contrastRatio(wcagY(...))` for
  contrast. A comparison that measures the two systems differently proves nothing.
- **Dark-mode visuals sit on a dark background**; group comparisons by the axis being chosen.
- **Exhibits ship clean** — no strokes, glyphs or annotations over the thing being assessed.
- **Realistic context, not abstract ramps**, wherever the artifact is about how something is used
  (artifact 4 especially).

---

## Boilerplate — what the comparison is actually claiming

**It is NOT a "fewer tokens" story.** Do not make that argument; the raw counts do not support it
and it is not the point. The claim is **uniformity, and the absence of manual maintenance.**

Measured from the files in this repo, 2026-07-30:

**Unify.** 9 primitive ramps (6 brand + 3 signal) plus Gray = **90 stops**, each carrying a light
AND a dark hex = **180 hand-authored values**, under **42 semantic tokens** across 7 palettes
(Content 4 · Background 5 · Stroke 5 · Signal 12 · Brand 3 · Merge 10 · Skeleton 3). Per brand,
three of those primitives are aliased in (50 → accent, 200 → highlight, one of 500–900 → brand
primary). Every value is a decision someone made, and the Gray ladder (12 stops) is a different
shape from the brand ladders (7–10) — which is itself evidence for claim 1.

**OKChroma.** A **141-token base collection × 2 modes = 282 values, all generated from one hex.** A
brand is not a new ramp; it is an extension carrying only what differs, ~**113 override values**
(median 108, range 72–140). Families: system, neutral, brand-primary, brand-secondary, and the four
signals.

**The framing to use:** adding a brand to Unify means authoring a ramp, choosing which of 500–900
becomes primary, and re-deciding the semantic mappings. Adding a brand to OKChroma means typing one
hex, and the hierarchy is guaranteed by construction rather than by review.

---

## Boilerplate — engine safety

The comparison invites "can you trust the generated values?" The answer is instrumented:

- **Eleven checks, all green on main**: `audit` · `highlight-audit` · `audit:divergence` · `smooth`
  · `audit:register` · `audit:ext` · `figma:verify` · `req:audit` · `audit:secondary` ·
  `sweep:collision` · `sweep`.
- **Agnostic sweeps, not named brands.** `sweep` walks **1800 seeds** (120 hues × 5 L × 3 C) and
  asserts structure, the C12 error-signal gate, shear-induced collisions and warning resolution. The
  bar is the worst-case edge colour.
- **Contrast requirements are DECLARED, not tuned.** Stops carry requires (stop 8 at WCAG 1.4.11 3:1
  against paper-3; the ink stops at 4.5 and 7); the solver hits them or the gate fails.
- **Snapshot discipline.** A change that should not move output is proved by ZERO snapshot movement,
  and a snapshot is re-blessed only after the diff has been read. Four gate fixes landed
  2026-07-29/30 for reporters that went stale after a renumber — CATALOG C40; treat any hardcoded
  stop count or index width as suspect.
- **Every claim in an exhibit is reproducible from a probe** written to the session scratchpad,
  never committed.

---

## Verification before anything is called done

1. `npx tsc --noEmit` and `npx tsc --noEmit -p plugin-ext`
2. **`npm run build`, NOT `npm run generate`** — `generate` runs a prebuilt bundle and will silently
   emit from stale engine source.
3. The eleven checks, if any engine file was touched. This round should touch NONE.
4. Render the page and read it. For the CRITICAL-accuracy graphs, spot-check plotted values against
   a scratchpad probe — do not trust the chart to prove itself.
5. Dark artifacts checked on a dark background.

## Traps

- **`npm run generate` emits from a stale bundle.** Use `npm run build`.
- **`demo/unify-compare/` is shared ground.** Another session has edited `UnifyCompare.tsx`
  (`fix(demo): unify-compare reads the wcag lane`, on main). Check `git log` on that file first, and
  cut a worktree rather than working in `~/okchroma`.
- **The 7-stop brand ramps are correct, not truncated.** See the alias scheme above.
- **A push to `main` DEPLOYS** (demo · install.html · the extended plugin zip). Verify a deploy from
  the SITE, never from a green workflow.

---

# THE STARTING PROMPT — copy from here

> We are finishing the Unify → OKChroma primitive-mapping comparison. Read
> `scripts/unify-mapping-handoff-2026-07-30.md` first — file inventory, how Unify's alias scheme
> works, the measured census, and the traps. **The Unify data is already in the repo** at
> `demo/unify-compare/unifyData.ts`. I have diagrams of what each Unify stop is FOR if you want them
> for the mapping.
>
> **The deliverable is ONE PAGE I can screenshot from, and it lives at the orphan link** —
> `#/unify-compare`, which is bookmarked and linked from nowhere. Extend
> `demo/unify-compare/UnifyCompare.tsx`; don't make a new route or a deck. Note that link only
> publishes from `main`, so I can't see anything until it merges — plan for that.
>
> SVG export would be nice but I am deliberately prioritising completeness and accuracy over
> portability — that is why we are not printing this into Figma.
>
> **The accuracy bar differs per artifact and it should drive where you spend time:**
> - The **perceptual-L graphs must be exactly right** — I cannot manually recreate them, so an error
>   there ships unnoticed.
> - The **stop contrast plots must be accurate** — I could build them by hand but it is
>   prohibitively slow, so I will trust the image.
> - The **forking examples only need to communicate the mapping** — I will rebuild those in Figma so
>   they can be toggled through modes. Don't gold-plate them.
>
> The artifacts must prove two things:
>
> **1. Predictability and uniformity.** The ramps are perceptually uniform, so hierarchy is assigned
> intentionally rather than inherited from whatever the brand hex happens to be. A chip reads at one
> level in every theme, a component like an avatar takes one primitive and lands the same across
> themes, illustrations can be set globally, and hierarchy holds regardless of brand colour.
>
> **2. The distribution is a philosophy.** OKChroma clusters heavily at the light end, secondarily
> at the dark end, and leaves little mid-range. That serves colour minimalism — it drops purely
> decorative mid colour and spends the budget on nuance at the papers. Mid and dark (highlight → ink)
> is characterised by contrast requirements measured against the papers. The washes carry interaction
> nuance, which is what lets us be intentional about interaction states instead of mixing black into
> a surface element to get a hover.
>
> Four artifacts. **Build one example, show me the structure, and get approval before building the
> rest** — every time, not once for the whole set.
>
> 1. **Perceptual-L spaghetti graphs** (light + dark) — these exist in unify-compare; audit them for
>    accuracy rather than rebuilding.
> 2. **Perceptual-L stop-wobble graphs** (light + dark) — same, they exist; verify.
> 3. **Stop contrast comparison charts** (light + dark): (a) all Unify signals vs all OKChroma
>    signals, (b) Unify Gray vs OKChroma neutral, (c) the four brands.
> 4. **Brand-primary fork graphic** — Unify aliases only three primitives per brand (50 → accent,
>    200 → highlight, one of 500–900 → brand primary) and then piles buttons, focus rings, coloured
>    text and links onto that one primary. Show it forked: `highlight-8` for focus rings, `cta` for
>    buttons, the inks for coloured text, `cta-ink` for links that diverge from the brand, plus
>    generated interaction states. Build one composition — a link, a text button, two levels of text,
>    an input with a focus ring, and a cta — rendered twice: once with all of them on Unify's single
>    brand primary, once forked. Pair it with a graph showing the contrast pitfalls of overburdening
>    one token.
>
> Comparison sets: Unify Gray vs neutral · Unify Scarlet/Amber/Lime vs critical/warning/positive ·
> brands **eggplant, blue-600, orange-500, green-500**.
>
> **Use the UNIFY THEME for brand identities, not `src/brands.ts`.**
>
> Method: WCAG lane only. Measure through `resolveBrand` / `resolveTheme` → emitters, never
> `generateScale`. Measure BOTH systems with the same ruler (`apparentL`, and WCAG contrast) — the
> comparison is worthless otherwise. Dark artifacts on a dark background. Exhibits ship clean: no
> annotations over the thing being judged. Probes go in the session scratchpad, never the repo.
>
> This should be demo-and-artifact work with **no engine change**. If an engine gate moves, stop and
> tell me.
>
> The census and engine-safety numbers are in the handoff, already measured — use them, don't
> re-derive. And note the framing: this is **not** a "fewer tokens" argument. It is that the system
> is uniform and not manually maintained.
