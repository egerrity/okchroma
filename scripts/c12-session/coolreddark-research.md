# coolRedDark research — what the dark hue shift protects, and what turning it off costs
2026-07-10 · research worktree @ 81f5519 (`orange-red-collision`) · ZERO engine edits, nothing committed
Instruments: `coolreddark-sweep.ts` (275 seeds × 2 lanes, full counterfactuals) + `coolreddark-probe.ts`
(603 seeds × 2 lanes, fine-grid margin check) + `coolreddark-hovercheck.ts` (hover/cross-state pairs)
· data: `coolreddark-sweep.json`

## TL;DR
1. Under the delta model, **dark washes do not ride `coolRedDark` at all** — stops 1–9 carry their hue
   from the resolved LIGHT twin, so the dark wash red-avoidance is the light C6 `redShift`, inherited.
   Turning `coolRedDark` off changes dark washes by **exactly zero** (measured max ΔE 0 across 550 runs).
2. The only tokens that ride `darkH` today: **dark cta + hover** (and their enforce solves + the
   `darkCtaTrim` chroma trim), **dark inks 11/12**, and **dark paper-0**.
3. **Turning the shift off for the dark cta costs nothing**: at identity hue, ZERO dark ctas enter the
   red gate (G .090) in either lane, on both the coarse and the fine grid (0/550, 0/1206). The structure
   that protects them is the prominence floor — brand dark cta L ≥ 0.70 vs red's 0.63 — times the gate's
   lighter-weight (×1.6). No C12-style dark treatment is needed; the "dark never fires" contract holds
   AT IDENTITY HUE, and the existing collision-sweep `ctaSepDark` assert would keep proving it.
4. One flag for the eye-check: the CROSS-STATE pair (brand dark hover vs red's resting dark cta) is
   already inside the gate SHIPPED in the apca lane for the near-red vivid slab (.070–.082 vs G .090)
   and identity hue narrows it to .046–.055 — ungated today, pre-existing, but the turn-off makes it
   ~.02–.03 worse (§Q2 hover note).
5. "Extend to include washes" is moot in the direction asked: the dark-side shift never reached the
   washes; the thing that must NOT be turned off for washes is the **light** `redShift`
   (producers.ts:47,98) — kill that and 63/275 cells (H24–39, C≥.14) fall under the 0.006 wash bar in
   BOTH modes. C7 does not backstop red (red is excluded from type-1 swap remedies by design).

---

## Q1 — MAP: which dark tokens ride darkH

`darkH` is minted once per context: [producers.ts:103–106](src/reqtoken/producers.ts) —
`opts.coolRedDark && !hueIsNoise && brandH > RED_BAND_LO_H(12)` → `brandH + redRepelShiftDeg(brandH)`,
else `brandH`. `resolveBrand` sets `coolRedDark: !exact` ([resolve.ts:185](src/engine/resolve.ts)).
Shift magnitude across the band (max over the sweep grid, signed): −8.1° @H15 · −10.5° @H21 · −8.7° @H30 ·
+12.5° @H33 · +9.9° @H36 · +7.8° @H41.5 · 0 @H12.5 (below the fence).

| dark token | hue source | rides darkH? | where |
|---|---|---|---|
| cta / cta-hover | `ctx.darkH` directly | **YES** | [reqtoken/resolve.ts:329–330](src/reqtoken/resolve.ts:329) |
| cta enforce re-solve (wcag/apca) | solves at `ctx.darkH` | **YES** | [producers.ts:350–353](src/reqtoken/producers.ts:350), [389–393](src/reqtoken/producers.ts:389); re-emit [resolve.ts:336–337](src/reqtoken/resolve.ts:336) |
| cta chroma (`darkC9`) | `darkCtaTrim(ctx.darkH)` | **YES** (trim keyed to shifted hue) | [producers.ts:270](src/reqtoken/producers.ts:270) |
| on-cta pole judge | judged at emitted cta (darkH) | **YES** (derived) | [resolve.ts:331](src/reqtoken/resolve.ts:331) |
| papers 1–2, washes 3–7, s8, highlight 9 | **light twin's hue** (`ls.H`, delta carry) | **NO** | carry [resolve.ts:146–200](src/reqtoken/resolve.ts:146); require-floor keeps `ls.H` [resolve.ts:227–228](src/reqtoken/resolve.ts:227) |
| inks 11/12 | `darkHueAtL(L)` = `torsionedHue(ctx.darkH, …)` (inks are dark-native, never carried) | **YES** | chroma [resolve.ts:132–137](src/reqtoken/resolve.ts:132), placement [resolve.ts:213–216](src/reqtoken/resolve.ts:213) → [producers.ts:271](src/reqtoken/producers.ts:271) |
| paper-0 dark | `darkHueAtL(rootL)` (stop 0 is outside the 1–9 carry window) | **YES** | [resolve.ts:147](src/reqtoken/resolve.ts:147) (`sp.stop >= 1`), spec [spec.ts:149](src/reqtoken/spec.ts:149) |

So "turn it off for ctas" and "keep it for washes" are not in tension: **the washes never had it.**
The dark washes' red-avoidance hue offset is the light `redShift` ([producers.ts:47](src/reqtoken/producers.ts:47),
applied in `lightHueAt` [:98](src/reqtoken/producers.ts:98)), carried verbatim into dark stops 1–9 by the
delta model. (`suppressRedCool` kills that one; `coolRedDark` never touches it.)

## Q2 — CTA-OFF: identity-hue dark cta, measured

Method: shipped values from `resolveBrand` (real pipeline). Counterfactual from a mirror of the
resolver's dark-cta block (resolve.ts:322–343) built from the REAL producer fns, with `ctx.darkH`
swapped to `brandH` before `buildDarkContext` — so the trim, emit hue, pole judge and enforce re-solve
all key on identity. **Mirror validated first: 550/550 byte-identical to `resolveBrand`'s `ctaDark`
with the swap off** (mirrorFail 0, both lanes). Red reference = canonical red `ctaDark` per lane
(wcag L .585 / apca L .630, C .194, H 33.3).

Grid: H {12.5…41.5 ×11} × C {.08….22 ×5} × L {.30….75 ×5}, both profiles (550 runs).
Fine probe: H step 1.5, C→.28, L→.85 (603 unique seeds/lane).

| lane | metric | shipped (shift on) | identity hue | bar |
|---|---|---|---|---|
| wcag | inside gate (redGateDist ≤ .090) | 0 | **0** (min .1853; probe min .1842) | G .090 |
| wcag | oklabDist < 0.10 | 0 | 0 (min .115) | type-2 dark bar .10 |
| apca | inside gate | 0 | **0** (min .1070; probe min .1062) | G .090 |
| apca | oklabDist < 0.10 | 28 | 57 (min .0665) | type-2 dark bar .10 |

- Worst identity cells (both lanes): the near-red vivid slab — nominal H27–36, C .22–.24, L .62–.65
  (e.g. #ed3912 → identity dark cta #f86a4f, gate .107 apca). Everything else sits far wider.
- The apca `oklabDist<0.10` rows are **legacy-metric noise**: plain OKLab distance under .10 while the
  owner-calibrated gate reads ≥ .107 — mostly super-red chroma (ΔC above red costs 0 in her gate) and
  the lighter direction (pinkifies out of the family fast). Her gate, not raw ΔE, is the C12 criterion;
  `checkCollision`'s dark .10 bar predates it.
- Why it clears structurally: brand dark cta L = max(scaleL, **0.70**) (DARK_BRAND_FILL_MIN_L), red's
  floor is **0.63**; apca Lc-60 enforcement barely moves in-band ctas (worst enforce landed L .696).
  ΔL ≥ .066 on the LIGHTER side × wLight 1.6 ≈ .106 — released before hue even contributes.
- Hover (`coolreddark-hovercheck.ts`): same-state pairs (brand hover vs red hover) stay outside the gate
  both ways (≥ .112 apca / ≥ .194 wcag). The CROSS-STATE pair — brand hover (L .656–.662) vs red's
  RESTING cta (L .630) — is **already inside the gate SHIPPED** in apca for the near-red vivid slab
  (.070–.082 vs G .090); identity hue deepens it to .046–.055. No machinery gates cross-state pairs
  today (C12 fires on resting-cta vs resting-cta; hover is transient) — pre-existing condition, not a
  turn-off regression, but worth surfacing with the eye-check since turn-off narrows it ~.02–.03.

Identity gain (what the shift costs today) — deep-maroon class (H12–30, L .3–.5): dark ctas render at
the L .70 floor as rose fills, cooled −6…−10.5° toward magenta. Examples (apca lane, shipped → identity):

| seed | shift | shipped dark cta | identity dark cta | ΔE |
|---|---|---|---|---|
| #88002F (H12.5 C.18) | −6.0° | #dd7990 | #df7987 | .013 |
| #890024 (H18 C.18) | −10.2° | #de798e | #e0797e | .023 |
| #8A001E (H21 C.18) | −10.5° | #df798a | #e17979 | .024 |

Warm side (H33–41.5) currently pushed +7.8…+12.5° orange-ward; identity returns those too.
Full per-cell table in the JSON (`identityGain.maroon`, plus `before`/`after` on every row).

## Q3 — WASH fate

- `coolRedDark: false` vs shipped, dark stops 1–9: **max ΔE 0.0000 across all 550 runs** (the carry
  makes them definitionally identical). Dark wash min-ΔE vs red's dark washes: .0063 shipped, .0063 off.
- What actually protects washes: the light `redShift`, carried into dark. Kill it (`suppressRedCool`)
  and the dark wash minimum drops .0063 → .0042 with **63/275 cells under the .006 bar** (H24–39,
  C .14–.22); light washes fail too (68 cells). Same counts both lanes (washes are lane-invariant).
- C7 relation: the split gate does NOT cover red — `hueCollisionPending` skips red by design
  ([resolve.ts:72](src/engine/resolve.ts:72), identity-sacred: no red swap variant exists), so there is
  no fallback remedy behind the light shift. collision-sweep's red wash rows ride the C6-accepted floor
  (RED_ONHUE_ACCEPTED_FLOOR .0057 at dH0) and WOULD go red if the light shift died — the gate catches it.
- The non-cta darkH riders that DO change with `coolRedDark: false` (identity restored, one-time visual
  drift, zero collision exposure): **inks 11/12** — hue up to 21.9° / 25.7° warmer at the warm band edge,
  ΔE ≤ .046 / .018 (bigger than the 14°-max shift itself because the shifted darkH crosses into the
  WARM_TORSION band ≥H40 and picks up gold-spine drift the identity hue doesn't); **paper-0 dark** —
  ≤13.1°, ΔE ≤ .012. Deep-maroon inks are currently cooled ~10° off identity — arguably the same
  identity bug as the cta, but it's her call whether ink/paper-0 drift needs an eye-check before
  a full turn-off (snapshot re-bless required either way: dark-audit + ext).

## Q4 — could a C12-style declared treatment serve the dark side?

**The data says none is needed.** At identity hue nothing fires her gate (0/1206 including the fine
probe, both lanes), because the delta-model constraints she set already do the separating:
- the prominence floor (dark cta ≥ .70) vs red's .63 floor = a built-in ΔL ≥ .066 on the cheap
  (lighter/pinkifying) side of her gate;
- the Lc-60 contract keeps apca enforcement shallow in-band (worst L .696), so nothing sinks to red's L.

Options, with numbers (no recommendation — her call):

| option | mechanics | red-gate cost | identity effect | needs her |
|---|---|---|---|---|
| (a) turn `coolRedDark` off for cta ONLY | split darkH consumers: cta/hover/enforce/trim key on brandH; `darkHueAtL` (inks, paper-0) keeps darkH | 0 fired; min gate .106 apca / .184 wcag | cta identity restored; inks/paper-0 stay cooled | eye-check the near-red vivid slab (#ed3912-class) dark buttons beside red |
| (b) turn `coolRedDark` off entirely | delete the fork at producers.ts:103–106 | same 0 / .106 / .184 (washes provably unchanged) | cta + inks (≤26°, ΔE ≤ .046) + paper-0 (≤13°, ΔE ≤ .012) all return to identity | same eye-check + ink/paper-0 drift check; dark-audit + ext re-bless |
| (c) keep shipped | no change | 0 (status quo) | maroon dark ctas stay −6…−10.5° cooled, warm side +8…+12.5° | — |
| (d) C12-style dark value exit (if her eye ever disagrees with the gate) | `exitCtaL` already generalizes (up-only in dark, P2_D_UP .11); wire a dark member into `ctaRepel` | unused today — 0 cells fire to feed it | — | a DARK-side gate calibration: her P1 marks were light-background pairs; the helmlab research already found "dark-scarier" is categorical and invisible to the distance metric — the light-G .090 cannot be assumed in dark geometry |

Guard either way: collision-sweep's `ctaSepDark` assert (line 98/117) measures the shipped pipeline, so
after any turn-off it re-proves "dark never fires" on every run — the contract stays a gate, not a memo.
If (a)/(b) proceeds, the near-red vivid worst cells for her side-by-side eye-check (dark bg): seeds
#ed3912 / #e94100 / #ee3533 → identity dark ctas #f86a4f / #f46e4a / #f8695e vs red dark cta
(apca #e64e2f at L .630 / wcag #d63e1e at L .585; exact stops in the JSON rows).

## Method notes / caveats
- Real pipeline throughout: shipped = `resolveBrand`; counterfactual scales = `generateScale` at the
  exact `resolveBrand` floor (dark side proven byte-identical to `resolveBrand` first — gsDarkFail 0);
  cta counterfactual = producer-fn mirror, byte-validated 550/550 before the swap.
- Seeds are nominal OKLCH clamped to sRGB hexes (collision-sweep convention); per-cell actual seed
  L/C/H recorded in the JSON.
- Owner's live light-side v7 edits don't reach these numbers: dark producers at 81f5519 are identical
  to main except the dead `darkColliderFill` option (diff-verified); everything measured is dark-side.
- helmlab/P2 was only wired into the (unused) exit sim; no dark P2 bar exists — calibrating one is the
  (d) prerequisite, not something this data can supply.
