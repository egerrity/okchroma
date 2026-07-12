# Helmlab-for-collisions research (2026-07-10, owner-requested)

**Question:** can helmlab (v0.14.0, installed; MetricSpace = COMBVD-fit perceptual distance
with embedded Helmholtz-Kohlrausch) do the collision work more intelligently?

**Method:** empirical, against her own marks. Script: `c12-helmlab-research.ts`.
T1 = her 100 P1 conflict marks vs a single helmlab threshold. T2 = her 9 P2 ladder marks
("first truly different", flush side-by-side) as helmlab distances. T3 = does helmlab show
her dark/light asymmetry. T4 = fence cells vs helmlab's observer-noise model.

## Verdict: helmlab is the P2 instrument; her fitted gate is the P1 instrument. The split is real.

### T1 — P1 (error-look): helmlab CANNOT replace the gate
Best single helmlab threshold: **7/100 misclassified** (vs her fitted gate's 0/100), and the
misses are systematic, not noise: all 7 are cells SHE calls conflict that helmlab measures as
FAR (0.109–0.128) — hue-carried C0.14 pairs at L0.60–0.65 and the C0.17 warm rows at L0.55.
A lighter, dustier red is perceptually distant but **still A RED** — "looks like an error
color" is a CATEGORY judgment, not a distance judgment. No metric ball in any perceptual
space reproduces a category boundary; her 5-weight gate is the category model.

### T2 — P2 (truly different, side-by-side): helmlab nails it
Her 9 marked rungs, helmlab `difference` vs red cta: **mean 0.116, CV 12%** — versus CV ~40%
in the gate metric and ~30% in raw OKLab. Split by direction it's tighter still:
- UP marks: ≈ 0.099–0.133 (mean 0.112)
- DOWN vivid marks: **0.126 / 0.128 / 0.133 — CV 2%**
- The dusty column (H36 C0.14, 0.095–0.099) is CENSORED data — she marked rung 1, the
  earliest possible; the true threshold may sit below it. Constancy holds.
This is exactly what COMBVD training data IS: observers rating adjacent pairs — the same task
as her flush strips. **P2 = one declared helmlab radius ≈ 0.115–0.13.**

### T3 — the dark/light asymmetry is NOT perceptual distance
Same raw ΔL up vs down from red cta: helmlab ratio ≈ **1.00 at every distance** (her gate
implies ~2.3× cheaper up). "Dark gets scarier" is invisible to psychophysics — it's danger
semantics. Third independent confirmation that P1 is categorical.

### T4 — fence cells: 0/15 flagged unreliable (all pairs perceptually "reliable" differences)
Her hesitation was about the CATEGORY edge, not perceptual noise. Consistent with T1/T3.

## Design consequence (for the proposal session)
Delivery rule candidate, two declared criteria, each calibrated on the right instrument:
- exit until **outside the P1 gate** (not error-look — her fitted gate, v7) AND
- **helmlab difference ≥ D_p2** vs red's cta (truly different beside it — her ladder marks;
  D_p2 ≈ 0.11 up / 0.13 down, or one 0.12 — fit in proposal)
Her −0.18 down-mark ≈ max(P1 exit −0.135, P2 0.13 ≈ −0.14…−0.18) — the residual is the
"scarier" category pressure; the P1 gate's wDark already encodes it.

## Integration — OWNER RULED 2026-07-10
Her words: "we can use helmlab for collisions, especially if they match, the claims he was
making were not necessarily refuted, and they pass here. my suspicion is that he is getting
lots of people to do color perception tests and aggregating that data."
→ Helmlab is ALLOWED in collision machinery, runtime included; runtime-vs-offline-precompute
is an engineering choice at wiring time (note: `difference` saturates ~0.15 — fine for
thresholds ~0.12; MIT, zero-dep). The lightness-curve verdict is unchanged (Nayatani for L).
**She will send this research to the helmlab author once collisions are figured out.**
