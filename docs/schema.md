# The requirement-token schema

A requirement token carries **two things at once**: a frozen color any DTCG tool can read
(`$value`), and the live **requirement** the engine solves to produce that color
(`$extensions["org.okchroma.requirement"]`). A requirement-aware resolver ignores the
frozen value and re-resolves from the requirement; everything else uses the fallback. Per
the DTCG Format Module (2025.10), tools MUST preserve `$extensions` entries they don't
understand — so the requirement survives any conformant pipeline.

**The live-edit guarantee:** editing a requirement in the token file changes the
re-resolved output. Raise a contrast target, tighten a seam separation, deepen a rootL —
the resolver honors the file. This is verified end-to-end by
[`scripts/reqtoken-portability.ts`](../scripts/reqtoken-portability.ts): round-trip
bit-identity, live-edit honoring, and fail-loud on corrupted bundles.

The declaration source of truth in this repo is
[`src/reqtoken/spec.ts`](../src/reqtoken/spec.ts) (pure data);
[`scripts/reqtoken-emit.ts`](../scripts/reqtoken-emit.ts) serializes it to
`out/reqtoken.tokens.json`. All examples below are real emitted tokens.

## Document shape

A **ramp group** per mode:

```
brand.light
├─ seed            plain color token — the brand input
├─ $extensions     group-level: resolver id + the on-color rules (ons)
├─ "0" … "12"      scale stop tokens, keyed by stop NUMBER
├─ "cta"           off-scale role tokens, keyed by role NAME
└─ "cta-hover"     (roles are never numbered — cta is not "stop 9")
```

## Example — a scale stop (light paper-2)

```json
{
  "$type": "color",
  "$value": { "colorSpace": "srgb", "components": [0.941, 0.953, 0.980], "alpha": 1, "hex": "#f0f3fa" },
  "$extensions": {
    "org.okchroma.requirement": {
      "resolver": "okchroma-reqtoken@2",
      "seed": "{brand.light.seed}",
      "mode": "light",
      "stop": 2,
      "rootL": 0.982,
      "group": "paper",
      "produce": { "hue": "warm-drift", "L": "perceptual", "chroma": "ladder" },
      "satFraction": 0.85,
      "baseC": 0.01,
      "require": { "metric": "min-separation", "against": "paper-1", "target": 0.028 }
    }
  }
}
```

## Example — an off-scale role (dark cta)

```json
{
  "$type": "color",
  "$value": { "colorSpace": "srgb", "components": [0.251, 0.447, 0.831], "alpha": 1, "hex": "#4072d4" },
  "$extensions": {
    "org.okchroma.requirement": {
      "resolver": "okchroma-reqtoken@2",
      "seed": "{brand.dark.seed}",
      "mode": "dark",
      "role": "cta",
      "produce": { "hue": "constant", "L": "anchor", "chroma": "brand" },
      "floorL": 0.63,
      "chromaMult": 1
    }
  }
}
```

## Example — the group-level on-color rules

```json
{
  "org.okchroma.requirement": {
    "resolver": "okchroma-reqtoken@2",
    "ons": {
      "onFill":      { "metric": "apca-pole", "enforce": true },
      "onHighlight": { "metric": "apca-pole", "enforce": false }
    }
  }
}
```

## Field reference

### Envelope (every requirement bundle)

| field | type | meaning |
|---|---|---|
| `resolver` | string | Named resolver capability id (`okchroma-reqtoken@2`). A resolver MUST reject a bundle with an id it doesn't implement — never guess. |
| `seed` | DTCG alias | Reference to the group's `seed` token — the brand input the producers run from. |
| `mode` | `light` \| `dark` | Which mode's declaration this is. |

### Scale stop (`stop` present)

| field | type | meaning |
|---|---|---|
| `stop` | number | Scale position, 0–12. `0` = the paper anchor beyond paper-1 (white in light; one seam below paper-1 in dark). Roles are never stops. |
| `rootL` | number | The producer's lightness target (the scaffold). For `anchor` roles it is the floor instead. |
| `group` | `paper` \| `wash` \| `highlight` \| `ink` | The stop's band. |
| `produce` | object | Named producers — see below. |
| `satFraction` | number? | `ladder` chroma param: envelope saturation fraction. |
| `baseC` | number? | `ladder` chroma param (light): absolute base chroma for the ladder/envelope blend. |
| `chromaMult` | number? | `brand` chroma param: multiplier on the seed's chroma. |
| `require` | object? | A declared requirement — see below. |

### Off-scale role (`role` present)

| field | type | meaning |
|---|---|---|
| `role` | `cta` \| `cta-hover` | The role name. Off the numbered scale by design. |
| `produce` | object | `{ hue: "constant", L: "anchor" \| "hover", chroma: "brand" }` — the fill carries the seed's own hue and lightness; `hover` derives from the resolved cta. |
| `floorL` | number | The anchor floor (0 = none). Dark fills must not sink. The on-fill enforcement re-solve may legitimately pass it — the floor governs the anchor, not the enforced result. |
| `chromaMult` | number | Multiplier on the seed's chroma. |

### Producers (`produce`) — names, not formulas

| axis | values | meaning |
|---|---|---|
| `hue` | `warm-drift` | The light path: gold-spine drift with a dynamic cap, minus the red-cool. |
| | `warm-torsion` | The dark path: spine torsion anchored at the dark fill rung. |
| | `constant` | The seed's own hue (roles). |
| `L` | `perceptual` | Nayatani apparent-lightness solve toward `rootL`. |
| | `perceptual-lift` | The same solve **floored at `rootL`** — lift, never sink (the dark scale; the blue-recede rule). |
| | `fixed` | Exactly `rootL` (hand-placed bands, the light paper-0 extreme). |
| | `anchor` / `hover` | Roles only: the seed's own lightness (floored) / the hover derivation of the resolved cta. |
| `chroma` | `ladder` | baseC/envelope blend (light) or the multiplier ladder with the chroma floor (dark). |
| | `brand` | `chromaMult` × the seed's chroma. |

Producer names are **references to versioned resolver capabilities**, not portable
formulas. The implementations (the Nayatani model, the gold spine, the aesthetic state)
live behind the `resolver` id — putting twenty aesthetic constants in a token file would
be fake portability. Changing producer behavior requires a resolver version bump.

### Requirements (`require`) — declared floors

| variant | fields | meaning |
|---|---|---|
| WCAG contrast | `{ "metric": "wcag", "against": "paper-2", "target": n, "level": "AA" \| "AAA" }` | The stop must hold `target`:1 against the RESOLVED paper-2. Declared in both modes: light clamps lightness down; dark raises a failing hue off the paper. In use: highlight-8 → 3.0, ink-10 → 4.5, ink-11 → 7.0. |
| APCA contrast | `{ "metric": "apca", "against": "paper-2", "targetLc": n }` | The stop must read \|APCA Lc\| ≥ `targetLc` against the RESOLVED paper-2. Same solve shape as wcag (light clamps down, dark raises off the paper). Never hand-declared in the built-in specs — produced by the contrast-profile compiler (below). |
| Min separation | `{ "metric": "min-separation", "against": "paper-1" \| "prev", "target": n }` | OKLab ΔE floor from the resolved reference stop (`prev` = the stop's predecessor). In use: paper-2 ≥ 0.028 off paper-1; every wash seam ≥ 0.012 off `prev`. |

### Contrast profiles (opt-in)

`withProfile(spec, 'apca')` (`src/reqtoken/profiles.ts`) rewrites every declared wcag require
onto its APCA equivalent — the same declaration re-solved against a different constraint — and
sets `ons.onFill.enforceLc` so the on-text/cta enforcement judges Lc too (measured bridge fact:
the shipped WCAG 4.5-white cta enforcement lands at Lc ≈ 76–78, so a map's 4.5 slot chooses
between releasing fills lighter at Lc 60 or reproducing the shipped ctas at Lc 75).
Exposed as `contrastProfile: 'wcag' | 'apca'` on `GenerateOptions`; the default `'wcag'` is the
identity (byte-identical shipped output). The Lc map (currently 3:1 → Lc 30, 4.5 → 60, 7 → 90)
and any adoption/exposure are pending an owner decision — see `scripts/apca-sweep.ts` →
`scripts/apca-sweep.ts` renders the candidate comparison (a local-only page).

### On-color rules (`ons`, group level)

| field | meaning |
|---|---|
| `metric: "apca-pole"` | The on-text color is whichever pole (white/black) has the larger \|APCA Lc\| on the fill. |
| `enforce` | If true, add the legibility fallback: flip the pole only if the chosen one fails 4.5:1 while the other clears it with \|Lc\| ≥ 45. On-text never moves a fill; a fill only moves when *neither* pole passes (the enforcement re-solve). |
| `enforceLc` | Set by the apca profile compiler (from the map's 4.5 slot): the pole is judged pure apca-pole (the wcag flip is metric-mixing and a no-op under one metric) and the cta enforcement re-solve darkens the fill until the white pole reads ≥ this Lc, replacing the WCAG-4.5 re-solve. Absent under the shipped wcag profile. |

## Resolution semantics

1. **Order matters and is total.** Stops resolve in declared order; a `require` may
   reference any *already-resolved* stop (never a cached value), so a pushed stop
   automatically re-solves everything downstream of it — the seam chain, then 8/10/11.
2. **A requirement is a floor, not a re-placement.** A placement that already clears its
   requirement does not move, byte-for-byte.
3. **Fail loud.** A requirement the resolver cannot meet yields an explicit
   `unresolvable` marker on the resolved stop — never a silent fudge. A malformed bundle
   or foreign resolver id throws at parse.
4. **`$value` is a snapshot.** It equals the resolved color at emit time and is the
   fallback for tools that don't resolve. After hand-editing a requirement, the `$value`
   is stale until re-emitted — the requirement, not the fallback, is the source of truth.

## Verification

- `npm run req:audit` — the requirement gate: resolves an agnostic hue×chroma sweep in
  both modes and verifies every **declared** requirement plus structural invariants.
- `scripts/reqtoken-portability.ts` — the round-trip gate: emit → JSON → parse →
  re-resolve is bit-identical; edited requirements are honored; corruption fails loud.
