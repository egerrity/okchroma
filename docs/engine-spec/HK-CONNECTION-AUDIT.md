# H-K Connection Audit — is the perceptual math actually generating the colors?

> **Status:** OPEN — handoff brief for a fresh troubleshooting agent. Written 2026-06-26 on
> `fix/highlight`. The ONE question: is the Helmholtz–Kohlrausch perceptual math in
> `src/engine/perceptualL.ts` actually driving color generation, or is it bypassed?

## The suspicion (why this exists)

`perceptualL.ts` is the principled H-K engine (Nayatani 1997 apparent-lightness predictor;
`perceptualRungL` solves L, `perceptualDarkC` solves C, `KEEP_LIGHT`/`KEEP_DARK` dials). The
intent is that every scale value **falls out** of that math — no hand-tuned constants. But a
code trace says the math is barely wired into the dark side.

## Findings so far (verify these — don't take them on faith)

| value | how it's actually set | H-K connected? |
|---|---|---|
| **Light L** (all stops) | `perceptualRungL` solves L to an apparent-lightness target | ✅ yes |
| **Dark L** (all stops) | the fixed `DARK_NEUTRAL_L` scaffold (12 hand-blessed numbers), emitted directly | ❌ never solved |
| **Dark chroma magnitude** | `nativeC = brandC · SHAPE_DARK(L)`, and `SHAPE_DARK` is the **Radix** colored-dark distribution | ❌ Radix |
| **Dark chroma per-hue** | `perceptualDarkC` redistributes — but ONLY inside `darkBandWeight` (L 0.22→0.66) | ⚠️ partial |

**The killer detail:** `darkBandWeight(L)` (perceptualL.ts) returns **0 for L ≥ 0.66**. The dark
highlight sits at **L 0.66 / 0.72**, so `perceptualDarkC` returns `nativeC` unchanged for it —
**the dark highlight chroma gets ZERO H-K treatment; it is 100% Radix `SHAPE_DARK` peak.** Same
for dark text (11/12, L 0.80/0.93) and the deepest darks (1–2, L ≤ 0.22). Only stops ~3–8 ever
see the H-K redistribution, and even there the *magnitude* is Radix.

Net: **light lightness is H-K-driven; everything dark is Radix shape + a fixed scaffold, with the
H-K redistribution band-limited to exclude exactly the highlight/text tiers.** That is almost
certainly why the dark highlight chroma keeps fighting and feels disconnected from the H-K work.

Related structural rot found while tracing (confirm + factor into any fix):
- **3 overlapping dark-stop tables:** `DARK_STOPS`, `ACCENT_DARK_STOPS` (both rootL-vestigial;
  chromaMultiplier only read in the non-curve/exact branch), vs the live `DARK_NEUTRAL_L`.
- **The scale isn't defined in one place:** light = `LIGHT_STOPS` (1–8) + `HIGHLIGHT_LIGHT` (9/10)
  + `STOP_11`/`STOP_12`; dark = `DARK_NEUTRAL_L` (L) + `SHAPE_DARK` (chroma) + `HIGHLIGHT_DARK` +
  `DARK_STOP_11/12`. No single full 1–12 scale.
- **The off-scale cta is still stamped `makeStop(9/10)`** — carries stop number 9 though it's off-scale.
- **`SHAPE_DARK` is a surviving Radix artifact:** the "strip Radix" pass deleted the word from its
  comment but kept Radix's numbers (`git log -S SHAPE_DARK`; `docs/engine-spec/_archive/stage10-handoff-dark-greenfield.md`).
- Illustration (`ILLUS_STOPS`) lives in the same `stopTable.ts`.

---

## The brief (give this to the troubleshooting agent)

```
You're auditing the okchroma color engine (~/okchroma, branch fix/highlight). ONE question to
answer with evidence: is the Helmholtz–Kohlrausch perceptual math in src/engine/perceptualL.ts
actually generating the colors, or is it bypassed? Read-only investigation + a written report —
do NOT change engine values.

⚠️ FIRST: the half-done experimental work is in a git stash (look: `git stash list` for
"WIP pre-HK-audit"). Audit against the CURRENT committed tree (clean, gates green) — do NOT pop
that stash; it's someone's in-progress experiment, not truth.

Ground in the CODE, not comments (comments here have repeatedly lied — e.g. a "raw grand-mean"
comment that actually describes the Radix distribution). Trust only what the functions compute.

Read: src/engine/perceptualL.ts (the H-K module), src/engine/darkChromaCurve.ts (SHAPE_DARK +
perceptualDarkC wiring), src/engine/colorEngine.ts (generateScale — the light loop, the dark loop,
the highlight block, the text stops), src/engine/stopTable.ts (ALL the stop tables), src/engine/
resolve.ts (which opts each family passes). Validate via the REAL pipeline (resolveBrand →
themeToFigma), never a bare generateScale call.

Produce a STOP-BY-STOP provenance table: for every stop 1–12 in BOTH modes, where does its L come
from and where does its C come from — (a) the H-K solver in perceptualL, (b) the Radix SHAPE_DARK
array, (c) the fixed DARK_NEUTRAL_L scaffold, (d) a fixed per-stop constant, or (e) gamut clamp?
INSTRUMENT it — don't infer: temporarily log inside perceptualRungL / perceptualDarkC / darkChromaCurve
and confirm which stops actually call the solver and what darkBandWeight(L) returns at each stop's L.

Specifically confirm or refute each claim:
1. Light L for every rung is solved by perceptualRungL (H-K).
2. Dark L for every stop is the fixed DARK_NEUTRAL_L scaffold — never solved by the H-K predictor.
3. Dark chroma magnitude = brandC · SHAPE_DARK(L), and SHAPE_DARK is the Radix colored-dark
   distribution (trace its origin in git: git log -S SHAPE_DARK; check docs/engine-spec/_archive/).
4. perceptualDarkC only redistributes within darkBandWeight (L 0.22–0.66), so the dark HIGHLIGHT
   (L 0.66/0.72), TEXT (0.80/0.93), and deep darks (≤0.22) receive ZERO H-K correction — pure Radix.
   Print darkBandWeight at every DARK_NEUTRAL_L value to prove which stops are in vs out of band.

Then answer the design questions:
A. Could dark L be SOLVED from the H-K math the same way light L is (perceptualRungL), instead of a
   hand-blessed DARK_NEUTRAL_L scaffold? What breaks if you try (gamut? contrast floors? the dark
   collider/fill-floor logic)?
B. Could SHAPE_DARK (Radix) be REPLACED by an H-K-derived chroma shape so dark chroma falls out of
   the predictor for ALL stops (incl. highlight/text), not just the mid-band? Sketch how.
C. Why is perceptualDarkC band-limited to exclude the fill/highlight/text tiers — is that a real
   perceptual reason or a workaround? Could the band be removed?
D. Map the 3 dark-stop tables (DARK_STOPS, ACCENT_DARK_STOPS, DARK_NEUTRAL_L): which columns are
   actually read at generation time, which are vestigial, and can they collapse to one source?

Deliverable: the provenance table, the confirmed/refuted claims with the instrumented evidence,
and a concrete recommendation for fully connecting generation to the H-K math (what to replace,
what to delete, expected blast radius). Flag anything you're unsure of rather than guessing.
```

---

## Working-tree state when this was written

The committed tip (`553e05a` "Workstream B") is the trustworthy baseline — gates green
(`typecheck`, `figma:verify`, `audit`, `highlight-audit`, `smooth`, `sweep`), emitted output
byte-identical to pre-array-heal. Everything past it was uncommitted experiment and has been
**stashed** (`git stash list` → "WIP pre-HK-audit"): a "back-to-0" enforcement cut, a
highlight-placement rewire (highlight 9/10 → 0.66/0.72), a reverted `SHAPE_DARK` band-aid, and
half-done `ENGINE-SPEC §1` / `CATALOG` edits. Pop it only when resuming that thread — it makes the
audits go RED by design and is not the state to audit against.
