# Secondary colors: collision rules + the subtle treatment (PLAN, 2026-07-02)

Owner ask: secondaries don't interact with the collision gates — "we just get a lot of warnings
because we haven't decided any rules on which color wins," and there's no option to automatically
make a secondary "subtle." This is the strategy; decisions marked ⊙ are the owner's.

## 1 · What actually happens today (code facts)

- A secondary runs its OWN `resolveBrand` (build.ts:23, CustomTheme, plugin): it self-adjusts
  exactly like a primary — a red-band secondary earns rung-1 darkening, `errorComponentRule`
  fires, dark-collider logic runs. So the SELF-protective machinery already applies.
- But its **signal consequences are discarded**: `signalOverrides` from the secondary's own
  resolution are thrown away — "signals follow the primary only" (architecture.md limitation #2).
  A secondary sitting on green/info/yellow just produces `pending` → toast advice ("consider a
  more distinct accent"), never a resolution.
- **Nothing ever compares primary and secondary to each other** (limitation #3): no distinctness
  check, no harmonization, no shared context at all — two independent resolveBrand calls.
- The demo surfaces `checkAllCollisions(secondary, signals)` as advisory toasts only.

The gap, precisely: there is no THEME-level resolution — no place where primary, secondary, and
the signal set are decided together.

## 2 · The precedence model (OWNER-SET 2026-07-02: per-signal ROOM, not a flat rule)

The primary never yields to the secondary, and existing primary↔signal machinery is untouched.
For secondary↔signal, who yields depends on how much room the SIGNAL has — the owner's model:

| signal | room | rule when the secondary collides |
|---|---|---|
| red | none — identity sacred | **Secondary yields, in the MIRROR of rung-1**: where a red-colliding primary goes DARK, the secondary goes LIGHTER + lower chroma (the subtle direction). Opposite registers by design — the two brand colors never chase each other into the same corner, and the primary keeps the strong register. |
| yellow | none — no band room | **Secondary yields (subtle).** ⚠ Owner caution: most colliding secondaries are GOLDS that read "obviously different in context though the numbers may bely this" — the yellow check must not over-fire; threshold picked from a sweep, and the annotation should say what was measured. |
| green | some — the two-sided swap exists | Proposal (owner to confirm at the sweep): the signal may spend its swap on the secondary IF the primary didn't need it; otherwise secondary yields subtle. |
| info-color | lots — "not as sacred, as much room as we want" | **The SIGNAL moves.** Info's band is wide; it dodges the secondary even if it already shifted for the primary. |

Yields are always in REGISTER (L/chroma), never hue — the user's hue is identity (standing rule).

## 2b · The "subtler archetype" posture (owner idea, held loosely)

Owner sketch: the secondary ROLE could default to a DERIVED color — a lower-chroma version of the
brand color — so every theme has a secondary even when the user supplies none ("subtler
archetype"). Owner is explicitly not 100% sure (many brands want their exact secondary kept).
Plan: build it as a POSTURE, not a default change —
- secondary supplied → user's color, with the §2 collision rules (today's meaning, now resolved);
- secondary omitted + opted in → derive the subtle secondary from the brand hue (the same subtle
  machinery §3 defines; zero new math).
Whether derived becomes the default posture = a later owner call, after seeing it in the demo.

## 3 · The yield move = the subtle treatment (one mechanism, two doors)

Rather than a ladder of corrective moves (darken → mute → …, the patch-layer smell), ONE move:
**a secondary that can't hold full register goes SUBTLE** — and "subtle" is simultaneously the
user-facing option the owner asked for. Two doors into the same mechanism:

- `secondaryLevel: 'standard' | 'subtle'` — user picks subtle directly (the option), OR
- the theme resolver demotes to subtle when the secondary collides with a resolved signal
  (the automatic rule), always annotated (the existing note/toast vocabulary).

**What subtle IS (concretely):** the neutral precedent — the neutral is already "the secondary
engine + a chroma clamp" on the tint-level axis (pure → default → branded). Subtle-secondary =
the next point on that SAME axis: the secondary hue through a stronger-chroma clamp curve
(a new level above 'branded'), unified scale machinery untouched. Per the unified model the cta
is the per-family differentiator: a subtle secondary's cta drops to the quiet register (the
neutral-style stop-4/5 cta) rather than the loud off-scale fill.

✓ DECIDED 2026-07-02 — auto-subtle + annotate on collision (the engine decides; warnings become
resolutions). Note the red case: the demotion carries the rung-1-mirror bias (lighter), per §2.

**⟳ REVISED 2026-07-04 (owner, from the archetype sweep): the subtle cta is a DELTA from the
primary, not a set register.** The first build anchored every subtle cta at the fixed wash-4/5
register (the neutral pattern, forced 'light' archetype) — the archetype sweep showed that fails
at both ends: a near-black primary gets a feather-light companion (weight-incoherent) and a
light-archetype primary COLLIDES with it (0.907 vs 0.915). Owner direction: **secondary cta =
primary cta ± Δ so every pair reads "the same amount of subtle next to the primary"** —
bright-calibrated Δ ≈ 0.16 (the fixed register read closest-to-right on bright: 0.751 → 0.915);
light mode +Δ toward pale, FLIPPING to −Δ when the primary is near the pole (ceiling ~0.93 —
also fixes the light-archetype collapse); dark mode −Δ toward the paper. **Owner flag: the delta is RECOMMENDED-mode behavior — exact ships untouched.**

**⟳ ROUND 2 (owner, same day): the delta is CURVED, and nobody flips.** Dark inputs need more
escape than light ones. Per-archetype candidates from the owner's readings of the flat sweep
(render §⓪): near-black/dark **0.25 / 0.30 / 0.40** · rich right at **0.16** · vivid needs more
(**0.18 / 0.20 / 0.24**) · bright right at **0.12** · light = tiny +Δ (0.03/0.05/0.07, capped
at the pole ~0.985) — **no flip**; alternatively light resolves as an **OUTLINE**. Dark mode
mirrors the same Δ downward (floored ≥0.22); OPEN question: the dark floor flattens most
primaries to cta 0.700 — should the dark delta key off the archetype or the actual dark L?

**★ THE ADAPTIVE STROKE (owner idea, prototyped in §⓪):** every button/chip carries a stroke
token — **transparent by default; when the fill reads < 3:1 vs its placement (Lc 30 under the
apca profile) it resolves to the fill's hue solved to pass** (WCAG 1.4.11 as a requirement-
token; the border is always present so layout never shifts). This makes the very-light
secondary VIABLE (its stroke fires automatically) and the outline button is the rule's limit
case (no fill at all: stroke solved to 3:1, label to 4.5). Declared form (phase 2):
`{ role: 'stroke', produce: transparent, require: { metric: wcag|apca, against: '@placement',
target: 3.0, onFail: 'solve' } }` — the first CONDITIONAL role in the schema.

**⟳ ROUND 3 (owner): the deltas REVERSE in dark mode** — "the light archetype [in dark] is more
akin to the delta near-black has in light mode." Owner's light picks (from the curved grid):
**near-black .40 · dark .30 · rich .16 · vivid .24 · bright .14 · light .03.** Two formalizations
rendered side by side (render §⓪★, light card + both dark candidates per archetype):
- **A · archetype mirror** — dark Δ = light pick of the mirrored archetype (near-black↔light,
  dark↔bright, rich↔vivid). Produces the reversal literally, BUT collapses where the dark floor
  flattens: near-black-in-dark gets Δ.03 on a 0.700 primary → 0.670 secondary (indistinct pair).
- **B · distance-from-paper curve** — ONE mode-agnostic rule: Δ = f(|primary cta L − paper-1 L|),
  piecewise-linear through the owner's own light picks. The reversal falls out automatically
  (light-in-dark = max distance ⇒ big Δ ≈ .33), and all floor-flattened dark primaries get equal
  treatment (equal distance ⇒ Δ ≈ .16 ⇒ uniform, readable dark pairs). RECOMMENDED.
**✓ LOCKED 2026-07-04: option B** ("b looks appropriate"). WIRED: `subtleDeltaFor` (piecewise
through the owner's six picks, points measured against real geometry) + `subtleCtaLFor` in
resolve.ts drive resolveTheme's derived/demoted/user-subtle paths in BOTH modes (light +Δ
pole-capped 0.985; dark −Δ floored 0.22). audit:secondary re-ran GREEN with the primary-relative
registers; snapshot clean.

**✓ STROKE = STOP 8 (owner): a conditional ALIAS, not a solve.** The adaptive stroke resolves to
the family's OWN highlight-8 — the stop that already carries the declared 3:1-vs-paper-2 require —
so it keeps the family's tint (the solved-grey first cut is dead) and needs no solver. The outline
resolution follows suit: stroke = secondary highlight-8, label = secondary ink-11 (both gated by
existing declared rules — zero new math). Declared form:
`{ role: 'stroke', produce: transparent, require: { against: '@placement', target: 3.0,
onFail: 'alias: highlight-8' } }`.

**✓ CTA-STROKE SHIPPED END-TO-END (2026-07-04):** GeneratedScale carries
`ctaStrokeNeeded/ctaStrokeNeededDark` (profile-aware: 3:1 wcag / Lc 30 apca, judged vs the
scale's own paper-2; re-judged after every cta override — neutral, subtle, red-cool render).
CSS: every family body emits `--<family>-cta-stroke: var(--<family>-highlight-8) | transparent`
(secondary mirror aliases it). Figma: `cta-stroke` rides each ramp group (alpha-0 = transparent);
the plugin re-expresses it as mode-divergent ALIASES → `system/transparent` (owner flag: the
static already existed) or the family's sibling `highlight-8`. Demo: TokenCards cta buttons carry
`border: 1.5px solid var(--…-cta-stroke)` — verified live: brand = transparent, neutral fires
with its brand-tinted own 8 (#94898c under the pink brand). Family-correctness proof card in
render §⓪★ (blue primary → blue-8 stroke · coral secondary → coral-8). Snapshot stays CLEAN
(values unchanged — the stroke is additive css/tokens). All gates green.
STILL OPEN: highlight-stroke (badges/chips on hl-9 fills — same rule, not yet asked-for as a
token) · a semantic-layer name for the stroke.

**✓ ROUND 5 SHIPPED (owner mockup, 2026-07-04): PER-FAMILY MODES — exact decoupled per family,
chips in the fields.** The global Recommended/Exact seg is GONE from the demo. Each field carries
its own mode chip:
- **Primary:** Recommended / Exact / the six archetype anchors (near-black…light — exposes
  `archetypeOverride`). resolveTheme: `primaryMode` + `primaryArchetype`.
- **Secondary:** **Tint / Pastel / Outline / Exact** (`secondaryStyle`; default tint). Tint =
  the subtle machinery ×8 (owner's light pick, `SUBTLE_TINT_MULT`); Pastel = k .35; **Outline =
  the tint ramp with the cta pair RE-RESOLVED: cta-1 → transparent, cta-2 → the resolved cta
  color at `OUTLINE_HOVER_ALPHA` 0.09 (owner: "8–10%" — the tinted transparent hover; the first
  ALPHA value in the ramp vocabulary), on-cta → ink-11, cta-stroke → highlight-8 always.** Same
  four tokens, different resolution — TokenCards renders outline buttons with ZERO component
  changes (verified live). Exact = the hands-off full ramp, signal proximity = advice notes.
- **Label: "Secondary color"** (vocab held — the mockup's "accent" declined).
- **RETIRED:** the per-signal-room demote/variant-move machinery (superseded — nothing is ever
  "standard in recommended" anymore; tint/pastel/outline are subtle by construction with
  annotated residuals; exact is advice-only). audit:secondary lanes: tint (subtle + annotated
  residuals) + exact (untouched + every collision advice-annotated, 247 across the sweep). Git
  history + this doc keep the room-model record.
- **REMAINING:** plugin gets the same style chips (payload + outline aliases: cta-1 →
  system/transparent, on-cta → sibling ink-11, cta-2 = raw alpha value) · dark chroma still
  unresolved for tint/pastel ("neither look great" — per-style dark constants now possible) ·
  real-Figma run · commit checkpoint.

**⟳ ROUND 4 (owner, 2026-07-04): "subtle = recommended, standard = exact — not a second option"
+ the DERIVED posture becomes the plugin default.**
- ✓ resolveTheme: `secondaryLevel` defaults from the mode (`exact ? 'standard' : 'subtle'`);
  explicit param survives for programmatic callers. The demo's "Secondary style" seg is GONE —
  the Recommended/Exact seg carries it. Consequence: the per-signal-room demote machinery is
  live only on the explicit-standard path; the recommended lane is subtle by construction with
  residual ANNOTATIONS (audit:secondary reworked to two lanes — recommended: subtle+annotated
  invariant, 108/480 annotated residuals = threshold-calibration data; standard lane keeps
  clears-or-demoted + variant rules tested).
- ✓ Demo: "Derive from primary" chip in the suggestions popover (demo STARTS EMPTY — owner: "no
  secondary is basically the default" for the demo); chip enters the derived state (field reads
  "Derived from primary", swatch = --secondary-cta-1, typing exits). Verified live.
- ✓ Plugin: secondary seg = **Derived (default) / Custom / Off**; ui.ts migrated resolveBrand →
  resolveTheme (themed overrides + derived/custom/off postures). NOT yet run in real Figma.
- **⟳ OPEN — the AIRY pick, narrowed to FINALISTS (owner): tint ×8 vs pastel k=.35.** Render
  §①★ = the full build-out per seed (both ctas + outline button + hl-9 badge + wash chips +
  secondary link + row/inset washes + full ramp, strokes live). MEASURED TRADE: light — pastel
  is quieter at the cta register (violet C .047 vs tint's .106; every light subtle cta fails 3:1
  → strokes fire, family-tinted); dark — tint ×8 holds color while pastel goes GREYISH (teal
  C .032, gold .038, green .052 vs tint's .093/.076/.120); dark subtle ctas at L .536 all CLEAR
  3:1 → no strokes fire in dark. Stroke semantics confirmed to owner: fires ONLY on gate
  failure; WCAG 3:1 default, Lc 30 under the apca profile.

## 4 · Primary ↔ secondary distinctness

A secondary too close to the primary is not a semantic hazard (same team) — it's a design
blandness problem. ✓ DECIDED 2026-07-02: **advice-only** (annotation with the measured ΔE),
using the same stop-comparison metric as checkCollision, threshold picked from an agnostic
hue×hue sweep. A hard gate (auto-subtle when ΔE < t) stays available later if wanted.

## 5 · The entry point: `resolveTheme`

The missing piece is structural, not algorithmic:

```
resolveTheme({ primary, secondary?, secondaryLevel?, neutralLevel?, exact?, style?, contrastProfile? })
  → { primary: ResolvedBrand,            // exactly today's resolveBrand(primary)
      secondary?: ResolvedSecondary,     // resolved WITH knowledge of primary + post-shift signals
      annotations }                      // which rules fired, in the existing note vocabulary
```

Order inside: (1) primary + signals resolve exactly as today (byte-identical — snapshot-gated);
(2) secondary resolves with its existing self-machinery; (3) secondary is checked against the
POST-SHIFT signal set (checkCollision, light AND dark) → subtle demotion per Decision 2;
(4) primary↔secondary distinctness annotation. `resolveBrand` stays public and untouched;
build.ts / demo / plugin migrate to resolveTheme (they already assemble exactly these pieces by
hand — this centralizes it).

## 6 · Requirement-token alignment (phase 2, the thesis)

`min-separation` requires already exist WITHIN a ramp (paper-2, wash seams). The declared form of
this whole plan is **cross-scale min-separation**: the secondary's cta/highlight declare ΔE floors
against each resolved signal cta and the primary cta, with the declared conflict answer = drop to
the subtle register (fail-loud if even subtle can't satisfy). Phase 1 ships the policy in
resolveTheme using the existing checkCollision; phase 2 re-expresses it as declaration once the
values are owner-blessed. (Same trajectory as stop-8's 3:1: bolt-on first, declared rule after.)

## 7 · Phasing + verification

- **P1 — resolveTheme + rules:** entry point, secondary-vs-signal gate with subtle demotion,
  distinctness annotation, `secondaryLevel` option end-to-end (engine → css/figma emitters →
  demo control → plugin toggle). Gates: snapshot CLEAN (primary path byte-identical), new
  secondary section in reqtoken-audit (agnostic secondary-hue sweep × the 4 signals × 2 modes:
  every emitted theme collision-free or subtle-annotated), figma:verify keys.
- **P1 sweeps for owner picks:** subtle clamp strength (2–3 candidates × real components,
  light+dark) · P↔S distinctness threshold (hue×hue grid) · the yellow-vs-gold collision
  threshold (owner: context separates golds that the numbers flag — calibrate against real
  components, not raw ΔE) · green room rule confirm (§2) · a derived-secondary preview
  (§2b posture, demo-rendered) for the default-or-option call.
- **P2 — declared form** (§6) + drop architecture.md limitations #2/#3.
- **Out of scope:** hue harmonization ("make me a good secondary" generation) — separate idea,
  noted only.
