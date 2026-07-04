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
resolutions). ✓ DECIDED — subtle's cta = the quiet neutral-style register (stop-4/5 anchor);
the clamp strength still gets a render sweep (2–3 candidates × real components) for the owner's
eye. Note the red case: the demotion carries the rung-1-mirror bias (lighter), per §2.

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
