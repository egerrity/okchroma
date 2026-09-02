# The requirement-token schema

A requirement token carries two things at once: a frozen color any DTCG tool can read
(`$value`), and the live requirement the engine solves to produce that color
(`$extensions["org.okchroma.requirement"]`). A requirement-aware resolver ignores the
frozen value and re-resolves from the requirement; everything else uses the fallback. Per
the DTCG Format Module (2025.10), tools MUST preserve `$extensions` entries they don't
understand, so the requirement survives any conformant pipeline.

The field-by-field reference lives on the site:
[Requirement tokens](https://egerrity.github.io/okchroma/#/docs/token-schema). This file
keeps what only makes sense in the repo: where the format is produced, the two checked-in
examples, and the scripts.

## Where it is produced

The declaration source of truth is
[`src/engine/requirements/spec.ts`](../src/engine/requirements/spec.ts) (pure data).
[`src/engine/requirements/dtcg.ts`](../src/engine/requirements/dtcg.ts) serializes it
(`emitDtcgRamp`) and parses it back (`resolveDtcgRamp`); both are exported from the npm
package. No shipped pipeline writes a DTCG file: the CSS and Figma emitters carry values
only. [`research/reqtoken/reqtoken-emit.ts`](../research/reqtoken/reqtoken-emit.ts) writes
a full two-mode document to `out/reqtoken.tokens.json` when run; the last emitted one is
checked in at [`research/reqtoken/reqtoken.tokens.json`](../research/reqtoken/reqtoken.tokens.json).

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

Most stops carry no `require`: the paper and highlighter seams are guaranteed by the
ladder's shape, not by declared floors. The declared requires today: `crayon-26` at 3:1
against `paper-5`, `pencil-47` at 4.5:1 against `paper-3`, `pen-58` at 4.5:1 against
`highlighter-20`, `pen-70` at 7:1 against `paper-3`. In the shipped WCAG lane the resolver
re-anchors the two paper-declared text stops onto `paper-5`; editing `against` on those two
in a bundle is therefore not honored there, while editing `target` is honored everywhere.

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

## Resolution semantics

1. Order is total. Stops resolve in declared order; a `require` references an already
   resolved stop, never a cached value.
2. A requirement is a floor, not a re-placement. A placement that already clears it does
   not move, byte for byte.
3. Fail loud. A requirement the resolver cannot meet yields an explicit `unresolvable`
   marker on the resolved stop. A malformed bundle or a foreign resolver id throws at parse.
4. `$value` is a snapshot. It equals the resolved color at emit time and is the fallback
   for tools that do not resolve; after a hand edit it is stale until re-emitted.

One thing the producer labels do not say: in the shipped pipeline dark is resolved from
the resolved light ramp (the delta carry), which places the paper and highlighter stops by
luminance parity and the crayon by its requirement. The dark `perceptual-lift` and `fixed`
labels on stops 1 to 8 describe what a direct resolver call does without the light ramp in
hand.

## Verification

- `npm run req:audit`, the requirement gate: resolves an agnostic hue × chroma sweep in
  both modes and both profiles and verifies every declared requirement plus the
  structural invariants.
- [`research/reqtoken/reqtoken-portability.ts`](../research/reqtoken/reqtoken-portability.ts),
  the round-trip gate: emit → JSON → parse → re-resolve is bit-identical; an edited target
  is honored; corruption fails loud. Parked research, not part of `npm run req:audit`;
  run by hand (bundle with esbuild, then node) at commit 0359ea5: 25 checks, 0 failures.
