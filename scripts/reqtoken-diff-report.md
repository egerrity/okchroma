# reqtoken ↔ okchroma divergence report (diagnostic, not a gate)

28 seeds × 2 modes, per-stop OKLab ΔE vs the REAL pipeline (resolveBrand, production opts).

## per-stop aggregate (ΔE_OK: mean / max, worst seed)

| stop | mean ΔE | max ΔE | worst seed |
|---|---|---|---|
| dark stop  1 | 0.030 | 0.045 | #a2759d |
| dark stop  2 | 0.029 | 0.048 | #62946c |
| dark stop  3 | 0.030 | 0.053 | #62946c |
| dark stop  4 | 0.030 | 0.058 | #62946c |
| dark stop  5 | 0.031 | 0.061 | #808d55 |
| dark stop  6 | 0.032 | 0.066 | #808d55 |
| dark stop  7 | 0.033 | 0.078 | #617de6 |
| dark stop  8 | 0.032 | 0.101 | #617de6 |
| dark stop  9 | 0.071 | 0.083 | #2255cc (blue (dark-contrast edge)) |
| dark stop 11 | 0.033 | 0.123 | #808d55 |
| dark stop 12 | 0.018 | 0.133 | #808d55 |
| light stop  1 | 0.002 | 0.004 | #c8a018 (saturated yellow (H-K/gamut edge)) |
| light stop  2 | 0.005 | 0.020 | #7b9300 |
| light stop  3 | 0.013 | 0.074 | #7b9300 |
| light stop  4 | 0.023 | 0.128 | #7b9300 |
| light stop  5 | 0.028 | 0.132 | #20a04e |
| light stop  6 | 0.025 | 0.092 | #20a04e |
| light stop  7 | 0.023 | 0.047 | #c8a018 (saturated yellow (H-K/gamut edge)) |
| light stop  8 | 0.017 | 0.053 | #808d55 |
| light stop  9 | 0.038 | 0.248 | #d55948 |
| light stop 11 | 0.007 | 0.079 | #d55948 |
| light stop 12 | 0.004 | 0.055 | #d55948 |

## worst 20 divergences, classified

| seed | mode | stop | ΔL | ΔC | ΔH° | ΔE | classification |
|---|---|---|---|---|---|---|---|
| #d55948 | light | 9 | 0.246 | 0.029 | 0.0 | 0.248 | collision re-solve (bolt-on): okchroma darkens red-family ctas that collide with the red signal; reqtoken has no collision machinery (deferred) |
| #b17469 | light | 9 | 0.237 | 0.000 | 0.0 | 0.237 | collision re-solve (bolt-on): okchroma darkens red-family ctas that collide with the red signal; reqtoken has no collision machinery (deferred) |
| #c8a018 (saturated yellow (H-K/gamut edge)) | light | 9 | -0.164 | -0.028 | 0.0 | 0.166 | cta rules differ (DELIBERATE): okchroma = identity fill + on-fill white-text enforcement + dark min-L 0.70 + dark chroma trim; reqtoken = declared 4.5 vs paper-2 + 0.63 floor |
| #808d55 | dark | 12 | 0.008 | -0.133 | 0.0 | 0.133 | dark chroma floor / darkChromaCurve (okchroma aesthetic, deferred) |
| #20a04e | light | 5 | -0.023 | 0.130 | -0.0 | 0.132 | chroma model gap: okchroma LIGHT_BASE_C absolute curve + boosts vs reqtoken saturation ladder — INSPECT |
| #7b9300 | light | 4 | -0.011 | 0.128 | -0.0 | 0.128 | chroma model gap: okchroma LIGHT_BASE_C absolute curve + boosts vs reqtoken saturation ladder — INSPECT |
| #808d55 | dark | 11 | -0.015 | -0.122 | 0.0 | 0.123 | dark chroma floor / darkChromaCurve (okchroma aesthetic, deferred) |
| #00a38a | light | 9 | -0.109 | -0.020 | 0.0 | 0.111 | cta rules differ (DELIBERATE): okchroma = identity fill + on-fill white-text enforcement + dark min-L 0.70 + dark chroma trim; reqtoken = declared 4.5 vs paper-2 + 0.63 floor |
| #009dbb | light | 9 | -0.106 | -0.019 | 0.0 | 0.108 | cta rules differ (DELIBERATE): okchroma = identity fill + on-fill white-text enforcement + dark min-L 0.70 + dark chroma trim; reqtoken = declared 4.5 vs paper-2 + 0.63 floor |
| #99844b | dark | 11 | -0.030 | -0.101 | 0.9 | 0.106 | dark chroma floor / darkChromaCurve (okchroma aesthetic, deferred) |
| #617de6 | dark | 8 | -0.039 | 0.093 | 0.0 | 0.101 | dark stop-8 hand-placed in okchroma (bolt-on); reqtoken DECLARES 3:1 both modes |
| #00a38a | light | 5 | -0.028 | 0.097 | -0.0 | 0.101 | chroma model gap: okchroma LIGHT_BASE_C absolute curve + boosts vs reqtoken saturation ladder — INSPECT |
| #20a04e | light | 6 | -0.028 | 0.088 | -0.0 | 0.092 | chroma model gap: okchroma LIGHT_BASE_C absolute curve + boosts vs reqtoken saturation ladder — INSPECT |
| #00a38a | light | 4 | -0.017 | 0.084 | -0.0 | 0.086 | chroma model gap: okchroma LIGHT_BASE_C absolute curve + boosts vs reqtoken saturation ladder — INSPECT |
| #7b9300 | light | 5 | -0.005 | 0.086 | -0.0 | 0.086 | chroma model gap: okchroma LIGHT_BASE_C absolute curve + boosts vs reqtoken saturation ladder — INSPECT |
| #7b9300 | dark | 12 | 0.008 | -0.085 | 0.0 | 0.085 | dark chroma floor / darkChromaCurve (okchroma aesthetic, deferred) |
| #2255cc (blue (dark-contrast edge)) | dark | 9 | -0.070 | 0.045 | -0.0 | 0.083 | cta rules differ (DELIBERATE): okchroma = identity fill + on-fill white-text enforcement + dark min-L 0.70 + dark chroma trim; reqtoken = declared 4.5 vs paper-2 + 0.63 floor |
| #d55948 | dark | 9 | -0.070 | 0.032 | 8.9 | 0.080 | cta rules differ (DELIBERATE): okchroma = identity fill + on-fill white-text enforcement + dark min-L 0.70 + dark chroma trim; reqtoken = declared 4.5 vs paper-2 + 0.63 floor |
| #617de6 | dark | 9 | -0.070 | 0.038 | 0.0 | 0.079 | cta rules differ (DELIBERATE): okchroma = identity fill + on-fill white-text enforcement + dark min-L 0.70 + dark chroma trim; reqtoken = declared 4.5 vs paper-2 + 0.63 floor |
| #d55948 | light | 11 | 0.075 | 0.000 | 8.9 | 0.079 | applyRedCoolRender (bolt-on, light-only red cool) |

## classification tally (divergences with ΔE > 0.02)

- **140** × dark chroma floor / darkChromaCurve (okchroma aesthetic, deferred)
- **59** × chroma model gap: okchroma LIGHT_BASE_C absolute curve + boosts vs reqtoken saturation ladder — INSPECT
- **40** × rule-gap candidate — INSPECT
- **30** × cta rules differ (DELIBERATE): okchroma = identity fill + on-fill white-text enforcement + dark min-L 0.70 + dark chroma trim; reqtoken = declared 4.5 vs paper-2 + 0.63 floor
- **15** × dark stop-8 hand-placed in okchroma (bolt-on); reqtoken DECLARES 3:1 both modes
- **9** × applyRedCoolRender (bolt-on, light-only red cool)
- **2** × collision re-solve (bolt-on): okchroma darkens red-family ctas that collide with the red signal; reqtoken has no collision machinery (deferred)

(321/616 stop comparisons agree within ΔE 0.02.)
