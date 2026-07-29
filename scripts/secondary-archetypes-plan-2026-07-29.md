# Plan / handoff — expose the archetypes for the secondary, and turn Custom into Muted

Written 2026-07-29, immediately after C34. **Nothing here is implemented.** This is the agreed
plan for the next round. Owner approved the shape; the decisions section records what she ruled
and what is still open.

Companion: the measurements below were taken this session through the real pipeline. The lift
sweep exhibit was rendered to `render/secondary-lift.html` (gitignored) from a scratchpad script;
it is reproducible from the numbers in §Measurements without re-deriving anything.

---

## Context — the owner's reframe

The round began as "remove the rotation from custom secondaries" (landed as C34: a supplied hex
keeps its hue; a derived one still steps off its parent by 12°). Testing it with a saturated
orange showed the rotation was never the main event — `#FFA200` came back `#F0DCC8`, a pale tan,
because the *lift* had already spent the colour. Her reframe, verbatim:

> maybe a better way to do this is to expose the archetypes instead of changing custom. The only
> reason for us to make a decision like rotate and dull is if there is no secondary. if there IS a
> secondary, I want the brand's color to support not compete. So there can be a muted archetype
> added, but if a brand is inputting a secondary color I don't want to be changing the hue. To be
> clear, I do not want to change how derived from primary is done right now.

The principle: **rotate-and-dull is how you MANUFACTURE a secondary that does not exist.** Applied
to a colour the user chose, it is not derivation, it is overruling. Quietening a supplied colour
is a thing the user may want — so it becomes a thing they pick, not a thing that happens to them.

---

## Decisions taken (owner, 2026-07-29)

| question | ruling |
|---|---|
| Fate of today's "Custom" chip? | **It becomes Muted.** The hidden transform becomes the named one. |
| How much does Muted mute? | **Open — needs her marks.** It does NOT inherit kL .65 / kR .40; see §Open. |
| Derived "From primary"? | **Do not touch it this round.** rot 12 · kL .65 · kR .40 · kC .5 all stand. |
| Hue on a supplied secondary? | **Never rotated.** Already true as of C34. |
| Expose the six anchors for the secondary? | **Yes.** |
| Run it now or plan it? | **Plan it; build next session.** |

---

## The finding that shapes the work

**An `Archetype` is a lightness band, and nothing else.** `src/engine/archetypes.ts`:

```
{ name: 'near-black', min: 0,    max: 0.25, medianL: 0.125 }
… six of them, min/max partitioning L from 0 to 1.00 exhaustively
```

`classifyArchetype(L)` finds the band containing L and depends on that partition being complete
and non-overlapping. An override does exactly one thing (`producers.ts:40–41`):

```js
const archetype = forcedArchetype ?? classifyArchetype(brandL)
const scaleL    = forcedArchetype ? medianLForArchetype(forcedArchetype) : brandL
```

— it replaces the seed's lightness with the band median. Hue and chroma pass through untouched.

**So "muted" cannot be a seventh entry in `ARCHETYPES`.** There is no L range for it to own, and
inventing one would change classification for every seed in the system. Muted is a *chroma* idea
in a list of *lightness* ideas.

It has a natural home elsewhere: `opts.chromaScale` already multiplies the seed's chroma at source
(`producers.ts:35`, `brandC = rawC * (opts?.chromaScale ?? 1)`), and `style: 'full-chroma'` is the
existing precedent for a NAMED CHARACTER OPTION that changes chroma treatment rather than
lightness. **Muted is the mirror of full-chroma, not a sibling of vivid/bright.**

In the dropdown they sit in one list, and that is already the established shape — the primary's
list mixes `Recommended` / `Exact` (modes) with the six anchors (bands). The UI list is an
offering, not a type.

⚠️ **`ctx.archetype` is dead.** It is computed in `buildContext` and placed on the context
(`producers.ts:140`) and NOTHING reads it — the classification only ever reaches the output through
`scaleL`. Confirmed by grep across `src/`. Either delete it or wire it, but do not assume it is
load-bearing.

---

## Measurements this rests on

Through the real pipeline (`resolveTheme` / `defaultSecondarySeed`), WCAG lane.

**Why the dulling is so severe — the ceiling binds, not the halving.** For `#FFA200`
(H 69.1 · L 0.787 · C 0.171):

```
L  0.787 → 0.906    kL 0.65 of the room to L 0.97
C  0.171 → 0.035    kC 0.5 × the seed = 0.086 … but capped at
                    kR 0.4 × the gamut room at the NEW L = 0.035
```

It is not "halve the chroma". It is "lift so high there is no chroma left to have" — at L 0.906
there is barely any room at hue 69°, so 40% of it is nothing. **Any fix that only touches `kC` or
`kR` will disappoint; the lift is the variable that matters.**

**The lift swept** (rotation already removed, so every row holds hue). Seed handed to the ramp:

| | `#FFA200` | L | C | `#F27DA8` | L | C |
|---|---|---|---|---|---|---|
| Exact (untouched) | `#FFA200` | 0.79 | 0.171 | `#F27DA8` | 0.73 | 0.150 |
| today kL .65 · kR .40 | `#F0DCC8` | 0.91 | 0.035 | `#EED1D9` | 0.89 | 0.034 |
| kL .45 · kR .50 | `#F0CDA8` | 0.87 | 0.063 | `#EEBACA` | 0.84 | 0.063 |
| kL .30 · kR .60 | `#F0C28E` | 0.84 | 0.085 | `#E8ABBF` | 0.80 | 0.076 |
| kL .15 · kR .75 | `#E7B985` | 0.81 | 0.086 | `#DCA0B3` | 0.77 | 0.075 |

Note the last two rows: chroma stops climbing at ≈0.086 because `kC 0.5 × seed` takes over as the
binding constraint once the ceiling stops being it. **There is a floor to what any kL/kR pair can
recover while `kC` halves.** Below about kL .30 you buy lightness, not saturation.

**C34's rotation removal, for the record** — from-primary still steps +12.9°; custom/default holds
hue to within the 8-bit round-trip (≤1.0°, which is quantisation at C ≈ 0.03, not a rotation);
exact and outline 0.0°.

---

## The change

### 1. Expose the six anchors for the secondary

The anchors already work for any seed; the secondary simply never offered them. `resolveTheme`
gains a `secondaryArchetype?: Archetype` and passes it as `archetypeOverride` to the secondary's
`resolveBrand`. **No new engine math.**

Note the existing asymmetry to preserve: the primary's chip carries `primaryMode` (recommended /
exact) AND `primaryArchetype` as separate inputs that the UI presents as one list. Mirror that
shape rather than inventing a second one.

### 2. Custom → Muted

**Keep the internal id `'default'`; change the LABEL and the copy.** `SecondaryStyle` is
`'default' | 'outline' | 'exact'` and the id is stored in every plugin recipe
(`SPEC_KEY`, replayed by "Re-apply all brands" and the secondary backfill). Renaming the id means
a recipe migration for no user-visible gain. If the id must change, the legacy value has to be
mapped on read — the same discipline as `LEGACY_COLUMN_NAME` in `plugin-ext/code.ts`.

Copy today reads *"Your color through the derived model — lifted, engine-normal"*, which is
accurate and is exactly what surprised her. Muted's copy should name the effect, not the
mechanism.

### 3. Decide what Muted actually does — the open design question

Two candidate mechanisms, and they are not equivalent:

- **(a) Seed transform, as today.** Move the seed hex (lift + chroma cap), then build a normal
  ramp from it. Every stop inherits the moved seed. This is `defaultSecondarySeed`.
- **(b) `chromaScale`, the existing lever.** Keep the seed where the user put it and damp chroma
  through the ramp — the mirror of `style: 'full-chroma'`, which already releases it.

(b) is the cleaner model and matches "support, not compete" more literally: a supporting colour is
the same colour, quieter. (a) also moves lightness, which is why `#FFA200` stopped being orange.
**Measure both before choosing.** The sweep for her marks should show, per seed:
Exact · (a) at two or three strengths · (b) at two or three strengths, as full ramp rows.

---

## Files to change

**Engine**
- `src/engine/resolve.ts` — `resolveTheme` input gains `secondaryArchetype`; thread to the
  secondary's `resolveBrand` as `archetypeOverride`. The supplied-hex `'default'` branch is where
  Muted resolves (`resolveDefaultModel(hex, false)` today).
- `src/engine/archetypes.ts` — **do NOT add a 'muted' entry.** If mechanism (b) wins, Muted needs
  no change here at all; if (a) wins, its constants live beside `DEFAULT_SECONDARY`, not in
  `ARCHETYPES`.
- `src/reqtoken/producers.ts` — only if `ctx.archetype` is being cleaned up.

**Demo**
- `demo/CustomTheme.tsx` — the secondary `ChipSelect` (~line 381) currently offers
  `from-primary | default | exact | remove`; add the six anchors and relabel `default`.
  `styleLabel` / the info-line copy at ~325.

**Plugins** (both, and they must stay in step — the rule from
`plugin-v2-extended-collections`: stop/scale-shape changes migrate BOTH plugins' `ui.ts` +
templates alongside `demo/`)
- `plugin-ext/ui.ts` — `STYLE_LABEL` / `STYLE_INFO` (~124), `secondaryStyleSelect` options,
  `themeInput` (~171) to send `secondaryArchetype`.
- `plugin-ext/ui-template.html` — the `secondary-style` select's `<option>` list.
- `plugin-ext/payload.ts` — `ThemeSpec` is `Omit<Parameters<typeof resolveTheme>[0], …>`, so a new
  input field flows through automatically. Check the recipe round-trip.
- `plugin/` — public plugin is compile-only by the C33 ruling; confirm it still builds.

**Gates** — no snapshot should move if the defaults are unchanged. That is the check, not an
assumption: C34 shipped with **zero** snapshot movement and that was the evidence it touched
nothing else.

---

## Traps

**Do not put Muted in `ARCHETYPES`.** See §The finding. `classifyArchetype` partitions L
exhaustively; a seventh entry with no band breaks every seed's classification.

**`secondaryStyle: 'default'` is stored in plugin recipes.** Renaming the id silently changes what
a stored recipe replays as. Keep the id, or map the legacy value on read.

**The derived path shares `DEFAULT_SECONDARY`.** `kL` / `kR` / `kC` are read by BOTH postures
today. Tuning them for Muted moves From-primary too — which the owner explicitly ruled out this
round. If mechanism (a) wins, Muted needs its OWN constants, not a re-tune of the shared ones.

**`archetypeOverride` disables the joint solve.** `resolveBrand`:
`solving = collisions && !opts?.archetypeOverride` — "the solve is pair-calibrated; neither half
ships alone". The secondary already passes `skipCollisionRules: true`, so this is probably inert
there, but verify rather than assume before exposing anchors on a path that did not have them.

**An anchor REPLACES the seed's lightness** with the band median — `light` pins L to 0.925
regardless of what the user typed. That is the anchors working as designed, but on a secondary
chip it will read as "it changed my colour" unless the copy says so.

---

## Verification

1. `npx tsc --noEmit` and `npx tsc --noEmit -p plugin-ext`
2. Ten gates: `audit` · `highlight-audit` · `audit:divergence` · `smooth` · `audit:register` ·
   `audit:ext` · `figma:verify` · `req:audit` · `audit:secondary` · `sweep:collision`
3. **Zero snapshot movement** with defaults unchanged — no re-bless. If something moves, the
   change reached further than intended.
4. Agnostic sweep: a supplied hex under every offered option holds its HUE (≤1° round-trip), both
   modes, both lanes.
5. From-primary is byte-identical to this branch. It is the thing that must not move.
6. Both plugins build; `plugin-ext` loaded in Figma from the branch build.
7. Demo last.

Measure through `resolveBrand` / `resolveTheme` → emitters, never `generateScale`.

## Open — needs her marks before anything is built

- **Mechanism (a) or (b)** for Muted — see §3. Wants an exhibit, not an argument.
- **The strength.** Whatever mechanism wins, the number is hers. The lift sweep in §Measurements
  is the starting range for (a); for (b) the equivalent is a `chromaScale` sweep.
- Whether Muted should move lightness AT ALL, or only chroma. "Support, not compete" reads as
  chroma to me, but that is a reading, not a measurement.

## Isolation

Same as C33: feature branch, do not merge to `main` mid-change —
`.github/workflows/pages.yml` publishes on every push to `main` and builds both plugin zips.

## Sequencing

This sits AFTER the phase-2 dark round (dark stop 8's missing upper bound, the wash spread, the
151%/184% overshoot) in the queue unless the owner reorders it — that round is already scoped in
`scripts/highlight-collapse-plan-2026-07-29.md` §Sequencing.
