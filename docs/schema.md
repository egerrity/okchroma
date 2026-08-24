# The requirement-token schema

A requirement token carries **two things at once**: a frozen color any DTCG tool can read
(`$value`), and the live **requirement** the engine solves to produce that color
(`$extensions["org.okchroma.requirement"]`). A requirement-aware resolver ignores the
frozen value and re-resolves from the requirement; everything else uses the fallback. Per
the DTCG Format Module (2025.10), tools MUST preserve `$extensions` entries they don't
understand, so the requirement survives any conformant pipeline.

**The live-edit guarantee:** editing a requirement in the token file changes the
re-resolved output. Raise a contrast target, tighten a seam separation, deepen a rootL:
the resolver honors the file. This is verified end-to-end by
[`research/reqtoken/reqtoken-portability.ts`](../research/reqtoken/reqtoken-portability.ts):
round-trip bit-identity, live-edit honoring, and fail-loud on corrupted bundles. That
script and its sibling emitter are parked research (see [research/README.md](../research/README.md)) —
not run by CI, kept for reference.

The declaration source of truth in this repo is
[`src/engine/requirements/spec.ts`](../src/engine/requirements/spec.ts) (pure data);
[`research/reqtoken/reqtoken-emit.ts`](../research/reqtoken/reqtoken-emit.ts) serializes it
to `out/reqtoken.tokens.json` when run. All examples below are real emitted tokens, from
the parked snapshot at [`research/reqtoken/reqtoken.tokens.json`](../research/reqtoken/reqtoken.tokens.json).

## Document shape

A **ramp group** per mode:

```
brand.light
├─ seed            plain color token, the brand input
├─ $extensions     group-level: resolver id + the on-color rules (ons)
├─ "0" … "11"      scale stop tokens, keyed by stop NUMBER
├─ "cta"           off-scale role tokens, keyed by role NAME
├─ "cta-hover"     (roles are never numbered, cta is not a stop)
└─ "cta-pressed"
```

## Example: a scale stop (light mark-74, seed #3060C0)

```json
{
  "$type": "color",
  "$value": { "colorSpace": "srgb", "components": [0.345, 0.525, 0.867], "alpha": 1, "hex": "#5886dd" },
  "$extensions": {
    "org.okchroma.requirement": {
      "resolver": "okchroma-reqtoken@2",
      "seed": "{brand.light.seed}",
      "mode": "light",
      "stop": 8,
      "rootL": 0.738,
      "group": "highlight",
      "produce": { "hue": "warm-drift", "L": "perceptual", "chroma": "ladder" },
      "satFraction": 0.78,
      "baseC": 0.142,
      "require": { "metric": "wcag", "against": "paper-95", "target": 3, "level": "AA" }
    }
  }
}
```

Most stops carry no `require` at all: the paper/wash seams are guaranteed by the ladder's
shape, not by declared floors. The declared requires today: mark-74 (above) and the
three ink stops.

## Example: an off-scale role (dark cta)

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

## Example: the group-level on-color rules

```json
{
  "org.okchroma.requirement": {
    "resolver": "okchroma-reqtoken@2",
    "ons": {
      "onFill": { "metric": "apca-pole", "enforce": true, "ratioFloor": 4.5, "coEnforceLc": 65 }
    }
  }
}
```

## Field reference

### Envelope (every requirement bundle)

| field | type | meaning |
|---|---|---|
| `resolver` | string | Named resolver capability id (`okchroma-reqtoken@2`). A resolver MUST reject a bundle with an id it doesn't implement, never guess. |
| `seed` | DTCG alias | Reference to the group's `seed` token: the brand input the producers run from. |
| `mode` | `light` \| `dark` | Which mode's declaration this is. |

### Scale stop (`stop` present)

| field | type | meaning |
|---|---|---|
| `stop` | number | Scale position, 0–11. `0` = the paper anchor beyond paper-99 (white in light; one seam below paper-99 in dark). Roles are never stops. |
| `rootL` | number | The producer's lightness target (the scaffold). For `anchor` roles it is the floor instead. |
| `group` | `paper` \| `wash` \| `highlight` \| `ink` | The stop's band. |
| `produce` | object | Named producers (see below). |
| `satFraction` | number? | `ladder` chroma param: envelope saturation fraction. |
| `baseC` | number? | `ladder` chroma param (light): absolute base chroma for the ladder/envelope blend. |
| `chromaMult` | number? | `brand` chroma param: multiplier on the seed's chroma. |
| `require` | object? | A declared requirement (see below). |

### Off-scale role (`role` present)

| field | type | meaning |
|---|---|---|
| `role` | `solid-fill` \| `solid-fill-hover` \| `solid-fill-pressed` | The role name. Off the numbered scale by design. |
| `produce` | object | `{ hue: "constant", L: "anchor" \| "hover" \| "pressed", chroma: "brand" }`: the fill carries the seed's own hue and lightness; `hover`/`pressed` derive from the resolved cta. |
| `floorL` | number | The anchor floor (0 = none). Dark fills must not sink. The on-fill enforcement re-solve may legitimately pass it: the floor governs the anchor, not the enforced result. |
| `chromaMult` | number | Multiplier on the seed's chroma. |

### Producers (`produce`): names, not formulas

| axis | values | meaning |
|---|---|---|
| `hue` | `warm-drift` | The light path: warm spine drift with a dynamic cap, plus the signed nearest-side red repel. |
| | `warm-torsion` | The dark path: spine torsion anchored at the dark fill rung. |
| | `constant` | The seed's own hue (roles). |
| `L` | `perceptual` | Nayatani apparent-lightness solve toward `rootL`. |
| | `perceptual-lift` | The same solve **floored at `rootL`**: lift, never sink (the dark scale; the blue-recede rule). |
| | `fixed` | Exactly `rootL` (hand-placed bands, the light paper-100 extreme). |
| | `anchor` / `hover` | Roles only: the seed's own lightness (floored) / the hover derivation of the resolved cta. |
| `chroma` | `ladder` | baseC/envelope blend (light) or the multiplier ladder with the chroma floor (dark). |
| | `brand` | `chromaMult` × the seed's chroma. |

Producer names are **references to versioned resolver capabilities**, not portable
formulas. The implementations (the Nayatani model, the gold spine, the aesthetic state)
live behind the `resolver` id: putting twenty aesthetic constants in a token file would
be fake portability. Changing producer behavior requires a resolver version bump.

### Requirements (`require`): declared floors

| variant | fields | meaning |
|---|---|---|
| WCAG contrast | `{ "metric": "wcag", "against": "paper-99" \| "paper-97" \| "paper-95", "target": n, "level": "AA" \| "AAA" }` | The stop must hold `target`:1 against the RESOLVED reference stop named by `against`. Declared in both modes: light clamps lightness down; dark raises a failing hue off the paper. In use: mark-74 at 3.0, ink-53 at 4.5, ink-42 at 6.5, ink-30 at 7.0, each guaranteed on every paper. The anchor actually used by the shipped WCAG lane is not always the one named here; see architecture.md's requirement section for the resolver-level override. |
| APCA contrast | `{ "metric": "apca", "against": …, "targetLc": n }` | The stop must read \|APCA Lc\| ≥ `targetLc` against the RESOLVED reference stop. Same solve shape as wcag. Never hand-declared in the built-in specs; produced by the contrast-profile compiler (below). |
| Min separation | `{ "metric": "min-separation", "against": "paper-99" \| "prev", "target": n }` | OKLab ΔE floor from the resolved reference stop (`prev` = the stop's predecessor). Supported for portable specs; **the shipped spec no longer declares any**: the identity-curve paper/wash shape guarantees the seams instead (see the comment directly above the `LIGHT` export in `spec.ts`). |

### Contrast profiles (opt-in)

`withProfile(spec, 'apca')` (`src/engine/requirements/profiles.ts`) rewrites every declared wcag require
onto its APCA equivalent, the same declaration re-solved against a different constraint, and
sets `ons.onFill.enforceLc` so the on-text/cta enforcement judges Lc instead. Exposed as
`contrastProfile: 'wcag' | 'apca'` on `GenerateOptions`; the default `'wcag'` is the identity.
**WCAG is the shipped lane** (`SHIPPED_PROFILE`, `src/build.ts`, owner 2026-07-29); the apca
lane exists in code, nothing ships through it. The Lc map is `DEFAULT_APCA_LC_MAP`
(`profiles.ts`: 3:1 → Lc 30, 4.5 → 75, 6.5 → 85, 7 → 90).

### On-color rules (`ons`, group level)

| field | meaning |
|---|---|
| `metric: "apca-pole"` | The on-text color is whichever pole (white/black) has the larger \|APCA Lc\| on the fill. |
| `enforce` | If true, the legibility law binds: the chosen pole must pass `ratioFloor`, else the pole flips; a fill only moves when *neither* pole passes (the enforcement re-solve). On-text itself never moves a fill. |
| `ratioFloor` | The wcag-lane law (4.5): the WCAG ratio the chosen pole must clear. Read only in the wcag lane (`enforceLc` undefined). |
| `coEnforceLc` | The C42 co-clearance: alongside the 4.5 floor, the cta fill re-solves until the pole reads ≥ this Lc (65; the critical signal rides 50 via `apcaClearanceLc`). Rides in the wcag lane. |
| `enforceLc` | Set by the apca profile compiler (from the map's 4.5 slot): the apca lane's sole bar. The cta enforcement re-solve moves the fill until the pole reads ≥ this Lc, replacing the WCAG-4.5 re-solve. Absent under the shipped wcag profile; never active together with `ratioFloor`. |

## Resolution semantics

1. **Order matters and is total.** Stops resolve in declared order; a `require` may
   reference any *already-resolved* stop (never a cached value), so a pushed paper
   automatically re-solves everything declared against it (8, then 9/10/11).
2. **A requirement is a floor, not a re-placement.** A placement that already clears its
   requirement does not move, byte-for-byte.
3. **Fail loud.** A requirement the resolver cannot meet yields an explicit
   `unresolvable` marker on the resolved stop, never a silent fudge. A malformed bundle
   or foreign resolver id throws at parse.
4. **`$value` is a snapshot.** It equals the resolved color at emit time and is the
   fallback for tools that don't resolve. After hand-editing a requirement, the `$value`
   is stale until re-emitted: the requirement, not the fallback, is the source of truth.

## Verification

- `npm run req:audit`, the requirement gate: resolves an agnostic hue×chroma sweep in
  both modes and verifies every **declared** requirement plus structural invariants.
- `research/reqtoken/reqtoken-portability.ts`, the round-trip gate: emit → JSON → parse →
  re-resolve is bit-identical; edited requirements are honored; corruption fails loud.
  Parked research, not part of `npm run req:audit`.
