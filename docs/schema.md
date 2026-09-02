# The requirement-token format (an experimental export)

`emitDtcgRamp` and `resolveDtcgRamp` are exported from the package but no shipped pipeline
uses them: the CSS and Figma emitters carry values only. They exist to show that the
engine's declaration can travel as data: a DTCG color token that carries a frozen color any
tool can read (`$value`) and the live requirement the engine solved to produce it
(`$extensions["org.okchroma.requirement"]`). A requirement-aware resolver ignores the
frozen value and re-resolves from the requirement; everything else uses the fallback. Per
the DTCG Format Module (2025.10), tools MUST preserve `$extensions` entries they don't
understand, so the requirement survives any conformant pipeline.

This file is the format's reference. The declaration source of truth is
[`src/engine/requirements/spec.ts`](../src/engine/requirements/spec.ts) (pure data);
[`src/engine/requirements/dtcg.ts`](../src/engine/requirements/dtcg.ts) serializes and
parses it. [`research/reqtoken/reqtoken-emit.ts`](../research/reqtoken/reqtoken-emit.ts)
writes a full two-mode document when run; the last emitted one is checked in at
[`research/reqtoken/reqtoken.tokens.json`](../research/reqtoken/reqtoken.tokens.json).

## Document shape

A ramp group per mode:

```
brand.light
├─ seed                  plain color token, the brand input
├─ $extensions           group-level: resolver id + the on-color rule (ons)
├─ "0" … "11"            scale stop tokens, keyed by stop NUMBER (0 = paper-0)
├─ "stamp-fill"          off-scale role tokens, keyed by role NAME
├─ "stamp-fill-hover"    (roles are never numbered; the fill is not a stop)
└─ "stamp-fill-pressed"
```

Bundles emitted before the stamp rename named the roles `cta`, `cta-hover`, `cta-pressed`;
`parseToken` still accepts those words, so an older bundle re-resolves identically.

## Example: a scale stop (light crayon-26, seed #3060c0)

Regenerated from the emitter; components are the 8-bit channels over 255 to four decimals.

```json
{
  "$type": "color",
  "$value": {
    "colorSpace": "srgb",
    "components": [
      0.3451,
      0.5255,
      0.8667
    ],
    "alpha": 1,
    "hex": "#5886dd"
  },
  "$extensions": {
    "org.okchroma.requirement": {
      "resolver": "okchroma-reqtoken@2",
      "seed": "{brand.light.seed}",
      "mode": "light",
      "stop": 8,
      "rootL": 0.738,
      "group": "crayon",
      "produce": {
        "hue": "warm-drift",
        "L": "perceptual",
        "chroma": "ladder"
      },
      "satFraction": 0.78,
      "baseC": 0.142,
      "require": {
        "metric": "wcag",
        "against": "paper-5",
        "target": 3,
        "level": "AA"
      }
    }
  }
}
```

## Example: an off-scale role (dark stamp-fill)

```json
{
  "$type": "color",
  "$value": {
    "colorSpace": "srgb",
    "components": [
      0.251,
      0.4471,
      0.8314
    ],
    "alpha": 1,
    "hex": "#4072d4"
  },
  "$extensions": {
    "org.okchroma.requirement": {
      "resolver": "okchroma-reqtoken@2",
      "seed": "{brand.dark.seed}",
      "mode": "dark",
      "role": "stamp-fill",
      "produce": {
        "hue": "constant",
        "L": "anchor",
        "chroma": "brand"
      },
      "floorL": 0.63,
      "chromaMult": 1
    }
  }
}
```

## Field reference

### Every token

| field | type | meaning |
|---|---|---|
| `$type` | `"color"` | |
| `$value` | `{ colorSpace: "srgb", components: [r, g, b], alpha: 1, hex }` | the frozen fallback: the resolved color at emit time, sRGB clamp-down, components to four decimals. Stale after a hand edit until re-emitted; the requirement, not the fallback, is the source of truth |
| `resolver` | string | the named resolver capability, `okchroma-reqtoken@2`. A resolver must reject a bundle whose id it does not implement, never guess |
| `seed` | DTCG alias | a reference to the group's `seed` token; the producers run from it |
| `mode` | `"light"` \| `"dark"` | which mode this declaration is |

### Scale stops (`stop` present)

| field | type | meaning |
|---|---|---|
| `stop` | number | the scale position, 0 to 11. 0 is `paper-0`, the anchor beyond `paper-1`: white in light, one seam below `paper-1` in dark. Roles are never stops |
| `rootL` | number | the producer's lightness target (the scaffold the solve starts from) |
| `group` | `paper` \| `highlighter` \| `crayon` \| `pencil` \| `pen` | the band, derived from the token name. The resolver reads only text-lane membership (pencil and pen) and accepts the pre-rename words there, so an older bundle re-resolves identically |
| `produce` | object | the named producers, below |
| `satFraction` | number | the ladder producer's envelope share (the per-stop sat) |
| `baseC` | number | the ladder producer's absolute ladder chroma (light) |
| `chromaMult` | number | the brand producer's multiplier on the seed's chroma (the pen stops) |
| `textMaxC` | number | the text register ceiling: chroma = min(chromaMult × seed chroma, textMaxC) |
| `chromaFloor` | number | the dark pen chroma floor, scaled by the floor strength at runtime |
| `require` | object | a declared requirement, below; absent on most stops |

### Roles (`role` present)

| field | type | meaning |
|---|---|---|
| `role` | `stamp-fill` \| `stamp-fill-hover` \| `stamp-fill-pressed` | the role name; the group key is the same |
| `produce` | `{ hue: "constant", L: "anchor" \| "hover" \| "pressed", chroma: "brand" }` | the fill carries the seed's own hue and lightness; hover and pressed derive from the resolved fill |
| `floorL` | number | the anchor floor (0 light, 0.63 dark): a dark fill lifts and never sinks. The floor governs the anchor, not the enforced result |
| `chromaMult` | number | the multiplier on the seed's chroma |

### Producers: names, not formulas

| axis | value | meaning |
|---|---|---|
| `hue` | `warm-drift` | the light hue path: the warm spine drift with its dynamic cap, plus the signed red repel |
| | `warm-torsion` | the dark hue path: the spine torsion anchored at the dark fill |
| | `constant` | the seed's own hue (roles) |
| `L` | `perceptual` | the apparent-lightness solve toward rootL |
| | `perceptual-lift` | the same solve floored at rootL: lift, never sink |
| | `fixed` | exactly rootL |
| | `anchor` \| `hover` \| `pressed` | roles only: the seed's own lightness (floored), and the state steps from the resolved fill |
| `chroma` | `ladder` | the ladder and envelope blend (light), the share ladder with the chroma floor (dark) |
| | `brand` | chromaMult × the seed's chroma |

Producer names are references to versioned resolver capabilities. The implementations (the
Nayatani model, the spine, the aesthetic state) live behind the `resolver` id; putting
twenty aesthetic constants in a token file would be fake portability. A change in producer
behavior is a resolver version bump.

One thing the labels do not say: in the shipped pipeline dark is resolved from the resolved
light ramp (the delta carry, always set by `generateScale`), which places the paper and
highlighter stops by luminance parity and the crayon by its requirement. The dark
`perceptual-lift` and `fixed` labels on stops 1 to 8 describe what a direct `resolveRamp`
call does without the light ramp in hand; a resolver that wants the shipped dark values must
run the carry.

### Requirements: declared floors

| variant | fields | meaning |
|---|---|---|
| WCAG contrast | `{ metric: "wcag", against, target, level }` | the stop must hold `target`:1 against the resolved stop named by `against` (`paper-1` \| `paper-3` \| `paper-5` \| `highlighter-20`). Light clamps lightness down; dark raises it off the ground. Declared today: `crayon-26` at 3 against `paper-5`, `pencil-47` at 4.5 against `paper-3`, `pen-58` at 4.5 against `highlighter-20`, `pen-70` at 7 against `paper-3` |
| minimum separation | `{ metric: "min-separation", against: "paper-1" \| "prev", target }` | an OKLab ΔE floor from a resolved stop. Supported for portable specs; the shipped declaration carries none, since the ladder shape holds every seam open by construction |

**The anchor caveat.** The resolver reads `against`, with one override: a text stop (9 and
up) declared against a paper is solved against `paper-5`, the nearest paper, and every stop
from the crayon up is additionally held against frozen cross-family bounds (the site's
[Guarantees](https://egerrity.github.io/okchroma/#/docs/guarantees/what-every-paper-means)
page). So editing `against` in a bundle changes the result for `crayon-26` but not for the
pen stops; editing `target` is honored everywhere.

### The on-color rule (group level)

| field | meaning |
|---|---|
| `metric: "apca-pole"` | the on-text pole is whichever of white and black reads better on the fill |
| `enforce` | true: the legibility law binds. The chosen pole must pass the floor or the pole flips; the fill moves only when white is preferred and cannot be flipped. On-text never moves a fill otherwise |
| `ratioFloor` | 4.5: the WCAG ratio the chosen pole must clear |
| `coEnforceLc` | 65: the stamp legibility booster. Once the law is met, the fill is nudged until the pole reads at least this APCA Lc (the critical signal rides 50 per call). A nudge, never a claim |

## Resolution semantics

1. Order is total. Stops resolve in declared order; a `require` references an already
   resolved stop, never a cached value.
2. A requirement is a floor, not a re-placement. A placement that already clears it does
   not move, byte for byte.
3. Fail loud. A requirement the resolver cannot meet yields an explicit `unresolvable`
   marker on the resolved stop. A malformed bundle or a foreign resolver id throws at parse.
4. `$value` is a snapshot. It equals the resolved color at emit time and is the fallback
   for tools that do not resolve; after a hand edit it is stale until re-emitted.

## Verification

- `npm run req:audit`, the requirement gate: resolves an agnostic hue × chroma sweep in
  both modes and verifies every declared requirement plus the structural invariants.
- [`research/reqtoken/reqtoken-portability.ts`](../research/reqtoken/reqtoken-portability.ts),
  the round-trip gate: emit → JSON → parse → re-resolve is bit-identical; an edited target
  is honored; corruption fails loud. Parked research, not part of `npm run req:audit`;
  run by hand (bundle with esbuild, then node) at commit 0359ea5: 25 checks, 0 failures.
