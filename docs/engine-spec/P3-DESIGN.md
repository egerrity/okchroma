# P3 master gamut — design proposal (pre-implementation)

Status: **COMPLETE 2026-07-08** — P3 master live (Phase A 5dd7284, Phase B 7cb2654, gamut-media fix 3c1b5df), owner eye-check approved (D3: keep P3-normalized pastels), one-shot re-bless done, all 12 gates green. The calibration round (CATALOG C7 + the dark-yellow-reads-orange observation) is OPEN. Originally drafted pre-implementation: Successor to P3-KICKOFF.md;
measurements below are from this session's sweeps (scripts in session scratchpad,
grids recorded here per the CATALOG convention). Baseline: main @ acb6a83, all ten
gates green on a fresh worktree.

## 1. What was measured

### 1a. Where P3 actually helps (pure-math headroom, L×H grid)

Max-chroma gain P3 over sRGB, by hue band (avg ΔC / peak ΔC / avg ratio):

| band | avg ΔC | peak ΔC (at L) | p3/srgb |
|---|---|---|---|
| red 20–40 | 0.027 | 0.061 (0.65) | 1.18 |
| orange 40–70 | 0.020 | 0.051 (0.70) | 1.16 |
| gold 70–95 | 0.017 | 0.037 (0.80) | 1.16 |
| yellow-green 95–130 | 0.019 | 0.036 (0.85) | 1.16 |
| green 130–165 | 0.042 | 0.095 (0.85) | 1.29 |
| teal-cyan 165–220 | 0.033 | 0.066 (0.85) | 1.34 |
| blue 220–280 | 0.022 | 0.053 (0.50) | 1.20 |
| violet-magenta 280–330 | 0.013 | 0.028 (0.70) | 1.07 |
| pink-red 330–360 | 0.029 | 0.075 (0.70) | 1.17 |

### 1b. Which emitted stops are pinned at the sRGB boundary today (real pipeline)

Agnostic seed sweep (36 hues × 3 L × 3 C, both profiles) through resolveTheme;
23,408 stops scanned, **6,315 (27%) pinned at the sRGB ceiling with P3 headroom**.

- **yellow signal: ~100% pinned** at light 7–12 and dark 1–12 — the whole ramp rides
  the ceiling. Light stops 8–10 gain ΔC ≈ 0.019–0.021 (~15% over current 0.125–0.134):
  the measured gold-band truncation, exactly.
- green signal dark 1–9 and info-color light 11/12 + both cta pairs: 100% pinned.
- signal light ctas: median headroom ΔC 0.048 — the largest single gain.
- **KICKOFF CORRECTION: "stops 1–8 identical in both gamuts" holds in LIGHT mode only**
  (light wash pinning ≈ 0). Brand DARK paper/wash stops 1–7 are 33–56% pinned — the
  perceptualDarkC saturation already logged against browns. The P3 divergence in dark
  mode is NOT localized to the saturated stops.

### 1c. How far the H-K scaffold moves (perceptualL replicated under both gamuts)

The rung solve clamps its candidate chroma to the gamut *inside* the solve
(solveLForApparent / solveCForApparent / meanBoost), so the master-gamut switch moves
the scaffold itself:

- meanBoost: unchanged below C 0.05 (< 0.005 L*); **+0.3 to +0.72 L\* at C 0.13–0.17**.
- perceptualRungL: **< 0.004 ΔL at wash chroma** (C ≤ 0.06 — paper/wash rungs hold);
  **up to ±0.015 ΔL at highlight/cta chroma** (worst: rootL .95 C .13 H330 −0.0149;
  blue H250 rungs land darker, warm hues lighter).
- perceptualDarkC: dark stops gain +0.005–0.014 C, and — the structural win — **the
  solve CONVERGES where it saturates today**: (L .30, H60 brown) and (L .30–.55, H150
  green) hit the 0.4 search cap under sRGB (= pinned at gamut max regardless of
  identity chroma); under P3 they converge to finite answers (e.g. .30/H60: cap →
  0.081; .40/H150: cap → 0.154). The dark ID-relative redesign parked in CATALOG C7
  becomes well-posed instead of ceiling-clipped.

### 1d. Contrast-math divergence (the step-1 blocker, quantified)

- **wcagY is nearly basis-free in-gamut**: max |wcagY − true XYZ-Y| = 8.3e-5 over the
  in-sRGB grid (coefficient rounding). Negligible for any 4.5/3.0 verdict — but NOT
  byte-identical, so the sRGB lane keeps its existing code path verbatim.
- **apcaY is NOT basis-free**: the same in-gamut color reads up to **0.0105 different
  apcaY** through P3 primaries vs sRGB primaries (APCA's ^2.4 soft-clamp is
  channel-basis-dependent; e.g. pure sRGB red: 0.213 sRGB-basis vs 0.201 P3-basis).
  That is ≈ 1–1.5 Lc on unchanged colors. A basis switch therefore re-blesses
  everything — planned anyway, but it rules out "swap the implementation silently."
- At FULL P3 headroom on pinned stops: |ΔLc| ≤ ~1.2 typical; **~60 WCAG 4.5:1
  boundary crossings, concentrated at light ctas (27 signal + 10 brand) and highlight
  stops (16 light + 9 dark)**; only 2 on-text pole flips (brand cta H220, both profiles).
  Direction matters: for the green ctas the exact-P3 read is LOWER than the
  sRGB-clamp read (2.50 → 2.44 vs white) — **an enforcement solved only on the sRGB
  clamp-down can leave the P3-rendered cta below the bar** while sRGB-measuring audit
  tools say pass.
- apparentL's XYZ path: the direct OKLab→XYZ matrix vs the engine's composed
  sRGB-matrix path differ by up to 7.1e-4 XYZ (published-matrix rounding) → ≤ 0.13 L*
  apparent-lightness — sub-perceptual, same conclusion: parameterize, never replace.

## 2. Consumer audit (172 call sites, full listing in session transcript)

Everything funnels through **four bakes**; parameterize these and every consumer follows:

1. `oklchToLinearRgb` (constraints.ts:2) — OKLab→linear-sRGB matrix. Used by wcagY,
   clampChromaToGamut, apparentL's XYZ, oklchToSrgbUnclamped.
2. `apcaY` coefficients (constraints.ts:53) — sRGB Rec.709 weights on gamma channels.
3. `apparentL`'s XYZ path (perceptualL.ts:6) — sRGB matrix + Math.max(0,·) crush.
4. `clampChromaToGamut`'s cube (constraints.ts:80) — with `maxChromaAt` riding it.

Classification of the consumers:

- **render-gamut-Y** (must track the rendered P3 color): the whole H-K stack
  (perceptualRungL/perceptualDarkC → darkChromaCurve), on-text pole preference
  (onTextIsWhite max-|Lc|), Lc enforcement solves, reqtoken's apcaYAt chokepoint
  (producers.ts:120 — single fix point covers all apca requires/verifies).
- **legal-sRGB-question** (ONE owner decision resolves all): findLForContrast /
  findMaxLForContrast bodies, onTextIsWhite enforce-flip + ratioFloor, the wcag-profile
  sites in reqtoken (refYOf, resolve.ts:85 closure, ctaLightL/ctaDarkEnforcedL,
  PAIR-law poleRatio, wcag verify), stopTable S8 3:1 / T11 4.5 / T12 7.0 targets, and
  every wcag gate lane in scripts/.
- **gamut-clamp** (parameterize): makeStop's clamp (colorMath.ts:185 — THE master
  fork), maxChromaAt normalizations (brandSat producers.ts:74 — biggest behavioral
  lever: the P3 denominator shifts every envelope; pastelK ceilings — pastels go more
  chromatic, owner eye-check).
- **emit-boundary** (sRGB clamp-down relocates HERE): ColorStop today conflates the
  rendered color and the sRGB encoding in one r/g/b field. Three literal emit paths
  need the same clamp-down: cssRender toHex(:8), the rgba outline(:206), figmaRender
  inline outline(:120). The clamp-down must be **gamut-mapped (chroma-reduce at
  constant L/H — reuse clampChromaToGamut-srgb)**, never per-channel clamping, which
  silently hue-shifts the saturated stops.
- **gates**: divergence-audit:66 (chroma-curve parity) and reqtoken-audit:80 (in-gamut
  check) hard-fail the moment the master flips unless parameterized in the same
  change. dark-audit:109 / highlight-audit:42 / wcag-pole-sweep:31 call apcaY on
  ColorStop channels directly and reqtoken-audit:109 parses the emitted hex — all
  re-pointed with the switch. Re-bless set: dark-audit-snapshot, highlight-snapshot,
  divergence-snapshot, ext-overrides-snapshot + smoothness re-baseline + figma-verify
  spot hexes (#07074f/#869cda).
- Housekeeping found in passing: scripts/engine-parity.ts no longer exists (deleted
  in 8b79504) but colorEngine.ts:119 and colorMath.ts:4 still cite it;
  secondary-sweep.ts:11 has a dead findMaxLForContrast import.

## 3. Figma verification (kickoff step 3 — verified, not assumed)

- Variables store raw untagged 0–1 RGBA, **interpreted in the consuming document's
  color profile** (profile-relative, no per-variable gamut tag; REST + plugin APIs
  identical). Out-of-range components are out-of-spec, not "wide gamut".
- Plugins can READ `figma.root.documentColorProfile` ('LEGACY'|'SRGB'|'DISPLAY_P3')
  but **cannot set it**; user-only via File → color profile.
- Pasting values across profiles reinterprets, never converts.
- Consequence: **the Figma emitter keeps the sRGB clamp-down as its contract**
  (colorSpace:'srgb' stays; figma:verify keeps asserting it). Writing true-P3
  coordinates is only correct in a DISPLAY_P3 document and would need a
  documentColorProfile branch in the plugin — plugin-ext work, deferred, out of scope
  for this branch.
- **D6 (owner-ruled 2026-07-08, after the owner's own two-file A/B test): the published
  library stays sRGB clamp-down.** The empirical test + research round established:
  Figma never converts at any boundary (paste, plugin write, or the in-file convert
  action — which documentedly leaves variable values untouched); the library path is
  officially undocumented but mechanism-certain (values are raw and profile-less,
  the consuming file's profile decides) — so P3-published variables render DULL in
  every sRGB consumer file, silently, while hexes look right. No org/admin lever
  exists (file profile is per-file; the only default is a per-USER preference;
  new files default sRGB). The alternative — a gamut dimension as variable modes —
  doubles the extended-collection mode set (wcag · wcag-dark · apca · apca-dark → 8,
  i.e. 4 added modes): rejected as too much collection surface for design-time
  vividness phones already get via the CSS output. Revisit only as a deliberate
  org-wide profile rollout; the owner's own P3-profile authoring document can still
  take true-P3 coordinates via the deferred plugin round.

## 4. Proposed design

**Two-phase, one switch.**

### Phase A — gamut parameterization, byte-identical (no visual change)

- `type Gamut = 'srgb' | 'p3'` in constraints.ts. The four bakes gain a gamut
  parameter **with the sRGB code path preserved verbatim** (measurements 1d show even
  "equivalent" math differs at 1e-4 — byte-identity requires the existing expressions
  untouched). P3 paths: OKLab→XYZ direct (exact matrix) → linear-P3; apcaY with the
  SAPC display-p3 coefficients; clampChromaToGamut against the P3 cube.
- `MASTER_GAMUT: Gamut = 'srgb'` — the flip constant. perceptualL boostCache key
  gains the gamut (instruments run both gamuts in one process). SIGNAL_SCALES stays
  profile-keyed only: generateScale takes no gamut opt, so a non-master pipeline scale
  cannot be requested — gamut-keying it is deferred to whenever that opt exists.
- Byte-identity proven two ways: scripts/p3-parity-dump.ts before/after byte-compare
  (themeToFigma + css emit, 292 entries, both profiles) and the full gate suite.

### Phase B — flip the master to P3 (owner-gated; the flip is a COMMIT, not just the constant)

**LANDED 2026-07-08** (owner "go ahead"): everything below shipped in one commit.
Measured movement vs the pre-flip parity reference: 15,756 emitted hex tokens moved
(9,402 dark / 6,354 light — the pinned dark-wash population, as the sweeps predicted);
largest single move Δ58/255 on dark inks of saturated green/yellow seeds. D1 verified
end-to-end (222/222 enforced white-on-fill ctas clear 4.5 on both renditions). Gate
status: 10 of 11 green (self-consistent gates follow the master; snapshot tolerances
absorb the sub-0.015 moves); **audit:ext red pending the owner re-bless** — the
override sets moved ±1 token where D1's stricter floor flipped near-4.5 on-highlight
poles (the D5-class flips, now live). REMAINING: owner eye-check (D3 decided there) →
one-shot re-bless.

Flipping `MASTER_GAMUT` alone is NOT sufficient — the Phase-A review confirmed two
structural pieces land with the flip commit, before or with the constant change:

- **ColorStop render/emit split + sRGB gamut-map at emit.** Stops carry the master
  gamut's truth; hex/8-bit emit goes through an explicit sRGB gamut-map (chroma-reduce
  at constant L/H) at the emit paths — cssRender toHex(:8) + rgba outline(:206),
  figmaRender colorFromStop/clamp01 + inline outline(:120), reqtoken/resolve.ts:25
  oklchToSrgb. Without this, out-of-sRGB stops get per-channel clamps (hue-distorting).
- **apcaY channel-basis threading.** Every generation-side apcaY consumer feeds
  sRGB-encoded channels today; under the P3 coefficient set that is a mixed basis.
  Route through `encodedChannels(L,C,H,gamut)` (constraints.ts, added Phase A):
  reqtoken apcaYAt (producers.ts:120) + on-text sites (producers.ts:217/225/337,
  colorEngine.ts:241/298) — or the post-split ColorStop channels.
- D1 ruling wired in: every 4.5/3.0 legality floor and enforcement solve requires the
  chosen pole to clear the bar on BOTH the exact-P3 Y and the sRGB-clamp-down Y.
- D2 ruling wired in: apca-profile pole preference and Lc enforcement compute on the
  P3 basis.
- cssRender emits hex (sRGB clamp-down) plus a `color(display-p3 r g b)` override
  under `@supports (color: color(display-p3 1 1 1))`; figmaRender/payload unchanged
  in shape (sRGB clamp-down per §3).
- Gates re-pointed per §2; one-shot re-bless of all snapshots + smoothness
  re-baseline + figma-verify spot hexes, only after the owner eye-check
  (TokenCards, full role sets, dark on dark) — D3 (normalizer re-tune vs pin) is
  decided AT this eye-check.

## 5. Owner decisions — RULED 2026-07-07

All six closed by the owner: **D1 = both renditions must pass. D2 = P3 basis.
D3 = deferred to the Phase-B eye-check. D4 = confirmed (seed input stays sRGB hex).
D5 = strictly-safe** (ruled on the measured numbers; exhibit at
scripts/p3-pole-examples.ts → render/p3-d5-poles.html — only 2 verdict flips exist
in the whole sweep, green brand ctas near L 0.55). **D6 = the Figma library publishes
the sRGB clamp-down** (ruled 2026-07-08 after the owner's two-file gamut A/B test;
evidence + rejected alternatives in §3). Original framing kept below for the record.

- **D1 — legality Y for the wcag lane and every 4.5/3.0 enforcement floor.**
  Options: (a) sRGB clamp-down only (matches sRGB-measuring audit tools; but 1d shows
  the P3-rendered cta can sit below the bar while the sRGB hex passes); (b) exact-P3
  only (true for phones, but the sRGB fallback rendition then goes unchecked);
  **(c) RECOMMENDED: both renditions — the chosen pole must clear the bar under BOTH
  the exact-P3 Y and the sRGB-clamp-down Y** (cheap: two Y evaluations per bisection
  probe; conservative by construction; ~60 boundary crossings in 1d are exactly the
  stops this protects).
- **D2 — APCA basis.** RECOMMENDED: P3 basis for the apca profile (pole preference and
  Lc enforcement should judge the color phones render — the effort's own premise).
  Cost: ±1–1.5 Lc drift on unchanged colors, absorbed by the one-shot re-bless.
  Alternative: keep sRGB basis and only the clamped stops change.
- **D3 — brandSat/pastel normalizers** (maxChromaAt denominators): re-normalize to the
  P3 ceiling (pastels/sat fractions shift → eye-check), or pin to sRGB ceilings as
  design constants. RECOMMENDED: re-normalize — pinning them re-creates the sRGB
  artifact the effort removes.
- **D4 — seed inputs stay sRGB hexes** (unchanged contract; P3 seed input is a
  separate future decision). Gate sweep domains likewise stay sRGB-seeded.
- **D5 — wcag LEGAL profile scope**: whether the wcag profile's ratioFloor pole flip
  also adopts D1's both-renditions rule or stays sRGB-only by definition (it is the
  legal lane; an auditor's tool measures the sRGB hex). Genuinely owner's call;
  no recommendation.

## 6. What this unblocks (the parked calibration round, CATALOG C7)

Gold-boost brand-side amplitude (yellow ramp un-truncates, §1b), fired-mute corridor
geometry (moves with the gamut), green-light boost headroom (green washes gain the
most, §1a), yellow vividness boundary, paper-1/2 split, and the dark ID-relative
counterpart — which §1c shows becomes a convergent solve instead of a pinned ceiling.
