# P3 master gamut — kickoff

Owner-sequenced 2026-07-07 (C7 round): the gold-band chroma work exposed that several
design ceilings are sRGB artifacts, so the calibration round is parked BEHIND this effort.
"Most of the practical app of this happens on phone screens" — P3 displays are the real
render target; sRGB is the fallback, not the master.

## Direction (owner, 2026-06-29, reaffirmed 2026-07-07)

Generate in P3 as the master gamut; clamp DOWN to sRGB only where the surface requires it
(Figma emitter — verify current Figma P3 support first; the emitter today pins sRGB).
NOT the alternative (sRGB base + additive P3 layer). Desync between the two is small —
only saturated stops differ.

## The work

1. **Contrast math goes gamut-aware** — the hard blocker. `wcagY` / `apcaY`
   (src/engine/constraints.ts) compute luminance from LINEAR sRGB primaries; a P3 color's
   Y needs P3 primaries (or XYZ). Every contrast require, on-text pole choice, and
   enforcement solve rides these. Audit every consumer before switching.
2. **Gamut functions parameterized** — `clampChromaToGamut` / `maxChromaAt` /
   `oklchToLinearRgb` (constraints.ts, colorMath.ts) are sRGB-only. They become
   gamut-parameterized (P3 master, sRGB clamp-down at emit).
3. **Emitters** — cssRender: `color(display-p3 …)` with sRGB fallback; figmaRender:
   verify Figma variable P3 support, else clamp-down path. The plugin payload
   (plugin-ext/payload.ts) rides themeToFigma — confirm document color-space handling.
4. **Snapshot strategy** — every blessed snapshot is sRGB-valued; the P3 switch re-blesses
   everything once. Sequence AFTER the C7 branch lands to avoid compound diffs.

## Parked behind this (the post-P3 calibration round — CATALOG C7)

- **Gold-boost brand-side fine-tune**: the lift went SIGNAL-only on the C7 branch
  (producers.ts `goldBoost`); the brand-side re-introduction is ID-relative
  (amplitude × ramp(seed C, 0.13→0.17), measured direction "1.7 isn't quite there") and
  can only be tuned once the sRGB ceiling stops truncating the amplitude.
- **Fired mute remedy**: corridor solve — muted wash chroma at t ≈ 0.4 between the
  derived secondary's C and the signal's C, per stop, per mode; paper stops included,
  highlights half-reduction, cta untouched. Corridor geometry shifts with the gamut.
- **Green-light signal boost**: green's light washes sit at 0.33–0.53 of sRGB gamut
  (pastel register — no corridor for the mute); the boost headroom question re-opens in P3.
- **Yellow vividness boundary**: the gate's qualifier threshold (currently v ≥ 0.5);
  owner leaned "F (C 0.08) probably shouldn't fire" — re-ask once the remedy is the mute.
- **Paper-1/paper-2 split** (owner 2026-07-07, re-flagged after the boost removal made it
  read WORSE — the paper stops lost their share of the lift too): paper-2 needs more
  chroma ("I was mistaken about paper-1"); measured geometry: light p1 L≈.993/C≈.004,
  p2 L≈.965 at ~2.5× that chroma, and the p1→p2 L gap (.028) exceeds p2→wash-3 (.022) so
  p2 groups with the washes. Owner: wrap this INTO the post-P3 round, not before.
- **Dark ID-relative counterpart** (owner confirmed the parking 2026-07-07): dark has the
  same SYMPTOM as the light gold band — brand dark washes as vivid as the signal's,
  browns pinned at 1.0 of dark gamut regardless of identity chroma — but via
  `perceptualDarkC` (the modern H-K solve), NOT the legacy boost. Nothing to subtract
  now; the ID-relative modulation of dark chroma is a deliberate redesign for this round.
  Interim asymmetry (light brands duller than their own dark) is owner-accepted.

## Measurement artifacts

CATALOG C7 (this folder) carries the full C7 sweep + boost measurements; the sweep
scripts (c7-sweep.ts and friends) live in session scratchpads — re-derive from CATALOG's
recorded grids if needed. Bar = 0.006 wash ΔE (the C6-accepted separation).
