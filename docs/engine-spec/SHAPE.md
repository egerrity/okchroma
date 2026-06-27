# Scale shape — the L targets in one place

Code-grounded: pulled from the engine and verified against the real pipeline, 2026-06-27.
**The L shape is now a single source — `LIGHT_L` and `DARK_L` in `stopTable.ts`** (every tier —
`LIGHT_STOPS`, `HIGHLIGHT_LIGHT/DARK`, `STOP_11/12` — derives from them). Edit those directly, or
edit §1 below and I'll sync. This is the thing that didn't exist — the whole shape in one place.

---

## 1. L TARGETS — edit these

These are **shared by every family** — brand, secondary, neutral, and the four signals all use the
same L scaffold. (cta-1/cta-2 are OFF-scale and not in this table.)

| stop | group | **light L** | **dark L** | source |
|---|---|---|---|---|
| 1  | paper     | 0.993 | 0.178 | `LIGHT_L[0]`  / `DARK_L[0]`  |
| 2  | paper     | 0.982 | 0.213 | `LIGHT_L[1]`  / `DARK_L[1]`  |
| 3  | wash      | 0.960 | 0.252 | `LIGHT_L[2]`  / `DARK_L[2]`  |
| 4  | wash      | 0.936 | 0.285 | `LIGHT_L[3]`  / `DARK_L[3]`  |
| 5  | wash      | 0.903 | 0.313 | `LIGHT_L[4]`  / `DARK_L[4]`  |
| 6  | accent    | 0.860 | 0.348 | `LIGHT_L[5]`  / `DARK_L[5]`  |
| 7  | accent    | 0.806 | 0.420 | `LIGHT_L[6]`  / `DARK_L[6]`  |
| 8  | accent    | 0.738 | 0.550 | `LIGHT_L[7]`  / `DARK_L[7]`  |
| 9  | highlight | 0.669 | 0.633 | `LIGHT_L[8]`  / `DARK_L[8]`  |
| 10 | highlight | 0.599 | 0.717 | `LIGHT_L[9]`  / `DARK_L[9]`  |
| 11 | ink       | 0.530 | 0.800 | `LIGHT_L[10]` / `DARK_L[10]` |
| 12 | ink       | 0.300 | 0.940 | `LIGHT_L[11]` / `DARK_L[11]` |

Or edit the arrays directly in `stopTable.ts` (stop N = index N−1):
```
LIGHT_L = [0.993, 0.982, 0.960, 0.936, 0.903, 0.860, 0.806, 0.738, 0.669, 0.599, 0.530, 0.300]
DARK_L  = [0.178, 0.213, 0.252, 0.285, 0.313, 0.348, 0.420, 0.550, 0.633, 0.717, 0.800, 0.940]
```

**Positions 0 and 13 are universal** — `paper-0` (white in light / black in dark) and `ink-13`
(black in light / white in dark). They're fixed, hueless, and emitted **once** for all families
(`cssRender` anchors), so they're NOT in the per-family arrays. That's why `LIGHT_L`/`DARK_L` hold
positions 1–12 and the array index runs one behind the stop number (index `i` = stop `i+1`).

**Target vs emitted — important:**
- **Dark:** the target IS the emitted L (placed directly). Edit = exact result.
- **Light:** the H-K solve shifts the emitted L by the rung's *chroma*. High-chroma brands land
  *below* the target; the near-gray neutral lands *at* it. So the light column is the target the
  solver aims at, not the literal output (see §3).
- **Light 11/12** are additionally capped by a contrast floor (4.5 / 7.0 vs paper-2), so they can
  land below their target too.

---

## 2. Where the shape lives (UNIFIED 2026-06-27)

`LIGHT_L` / `DARK_L` are now the single source. The old per-tier constants still exist (so the
engine, scripts, and `shapeAt` keep their interfaces) but **derive** from the two arrays:

- `LIGHT_STOPS` = `LIGHT_L[0..7]` + `LIGHT_SAT` · `HIGHLIGHT_LIGHT` = `LIGHT_L[8]/[9]` · `STOP_11/12` = `LIGHT_L[10]/[11]`
- `HIGHLIGHT_DARK` = `DARK_L[8]/[9]` · `DARK_NEUTRAL_L` = `DARK_L[0..7]` + two chroma anchors (0.66/0.72) + `DARK_L[10]/[11]`
- Edit `LIGHT_L`/`DARK_L`; everything downstream follows. (Landed value-preserving — emitted output byte-identical.)

**Still vestigial / misleading (do not trust the names):**
- `DARK_STOP_11.rootL` = 0.75 and `DARK_STOP_12.rootL` = 0.94 are **UNUSED** — dark 11/12 L comes
  from `DARK_NEUTRAL_L[10]/[11]` (0.80 / 0.93). Only their `chromaMultiplier` is read.
- `DARK_NEUTRAL_L[8]` = 0.66 and `[9]` = 0.72 are **NOT stop lightnesses** — they're chroma
  interpolation anchors for `darkChromaCurve.shapeAt`.

---

## 3. Emitted shape — reference (what actually renders)

Brand = blue `#3B82F6` vs the generated neutral, both modes. `L` then `C`.

| stop | brand L (light) | brand C | neutral L (light) | neutral C | brand L (dark) | brand C | neutral L (dark) | neutral C |
|---|---|---|---|---|---|---|---|---|
| 1  | 0.992 | 0.004 | 0.993 | 0.002 | 0.178 | 0.032 | 0.178 | 0.004 |
| 2  | 0.979 | 0.010 | 0.981 | 0.003 | 0.213 | 0.032 | 0.213 | 0.004 |
| 3  | 0.954 | 0.022 | 0.959 | 0.004 | 0.252 | 0.049 | 0.252 | 0.004 |
| 4  | 0.927 | 0.035 | 0.935 | 0.005 | 0.285 | 0.049 | 0.285 | 0.006 |
| 5  | 0.888 | 0.053 | 0.901 | 0.008 | 0.313 | 0.051 | 0.313 | 0.007 |
| 6  | 0.841 | 0.068 | 0.857 | 0.009 | 0.348 | 0.055 | 0.348 | 0.009 |
| 7  | 0.782 | 0.086 | 0.803 | 0.013 | 0.420 | 0.062 | 0.420 | 0.011 |
| 8  | 0.708 | 0.112 | 0.734 | 0.014 | 0.550 | 0.075 | 0.550 | 0.016 |
| 9  | 0.580 | 0.142 | 0.616 | 0.015 | 0.620 | **0.144** | 0.620 | 0.007 |
| 10 | 0.535 | 0.142 | 0.571 | 0.015 | 0.660 | **0.181** | 0.660 | 0.007 |
| 11 | 0.476 | 0.179 | 0.528 | 0.014 | 0.800 | 0.101 | 0.800 | 0.010 |
| 12 | 0.272 | 0.094 | 0.299 | 0.012 | 0.930 | 0.034 | 0.930 | 0.004 |

What it shows:
- **Dark L identical** brand vs neutral (shared, direct).
- **Light L diverges** (H-K, chroma-driven) — neutral sits higher because it has almost no chroma.
- **Dark chroma 9/10 bump:** 1→8 ramps 0.032→0.075 smoothly, then **9 = 0.144, 10 = 0.181**
  (≈2× the ramp, 10 > 9), then 11 = 0.101. The highlight chroma is off the smooth curve — this is a
  **chroma-shape** fix, separate from the L targets above.
- Neutral chroma is ~flat and tiny (0.004–0.016) with no 9/10 bump — the bump is `brandC × dark
  chroma peak`, which neutral doesn't have.
