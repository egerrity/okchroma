# OKChroma — engine guide

> ⚠️ **Source of truth is [`../engine-spec/ENGINE-SPEC.md`](../engine-spec/ENGINE-SPEC.md), not this
> guide.** These pages are human-facing product docs that currently **lag** the engine spec and are
> being aligned (ENGINE-SPEC Phase 4). Until then, do **not** ground engineering decisions here —
> read ENGINE-SPEC and reconcile.

This is the designer/engineer guide: vocabulary, pipeline order, base structure,
and per-palette deviations. Two tracks:

- **Engineering** — one file per topic (mechanic, formula, source pointers, example).
- **Design** — a single consolidated **[For designers](./for-designers.md)**.

This README is the spine; deep math lives in the linked topic docs.

## Lineage

Inspired by [Radix Colors](https://www.radix-ui.com/colors), extended for white-label.

| dimension | Radix | OKChroma |
|---|---|---|
| input | ~30 pre-made scales; pick one | any brand hex |
| scales | hand-tuned per hue | generated from gamut geometry |
| your color | snapped to the nearest scale | reproduced true-to-brand |
| roles | 12-step scale with pre-reserved roles | non-linear collection of pseudo-semantic colors designed to support effortless theming |
| modes | light only | light + dark |
| collisions | unaware | detects + resolves brand↔signal |

## Vocabulary

Named by identity (the color), not by severity/function.

| role | group | name | output |
|---|---|---|---|
| error | signal | `red` | always red |
| warning | signal | `yellow` | always yellow (lemon/macaroni variant) |
| success | signal | `green` | always green |
| info | signal | `info-color` | blue / indigo / violet |
| primary | brand | `brand-primary` | resolved primary brand color* |
| secondary | brand | `brand-secondary` | resolved secondary brand color* |
| neutral | neutral | `neutral` | tinted gray |

*exact mode ships your input color/bypasses the engine

Engine-internal keys are identity too — `red`/`yellow`/`green`/`info-color` end to
end. The `role` column is the *use* (what the color signals), not a name.

## Pipeline

`resolveBrand(hex)` order. Neutral assignment is **not** in `resolveBrand` — it's a
separate step in the consumer (plugin/demo).

| # | step | source |
|---|---|---|
| 1 | Assign archetype from brand L (`classifyArchetype`) → anchor L | colorEngine.ts:362 |
| 2 | Generate base scale (raw hue) | resolve.ts:134 |
| 3 | Light collision vs signals: brand near `red` + red-band → rung-1 (regen, deepen `ink-alt`/`ink`); near `red` + pink/orange → component rule | resolve.ts:142–156 |
| 4 | Dark collision vs `red`: red-band → dark "muted" collider (regen); else component rule | resolve.ts:162–178 |
| 5 | `yellow` variant: lemon (warm) / macaroni (cool) | resolve.ts:189 |
| 6 | Signal shifts (output-only): `yellow`/`green`/`info-color` swap off the brand; `red` never | resolve.ts:194–201 |
| 7 | Red-cool render (last): warm-red brands rotate `cta` cooler | resolve.ts:210–212 |
| — | Neutral family assigned by brand hue (`closestNeutralFamily`) — separate, consumer | plugin/ui.ts |

Every *decision* (collision, red-band, archetype, on-fill polarity) reads the raw brand
hue; render-time presentation (cool rotation, warm-hue drift) never feeds a decision,
which is why the cool render is last. `brand-secondary` (beta) does not shift signals.

## Base palette (light target L)

Stops 1–8 share the same light L across every palette; the emphasis fills and text
follow. Per-palette and dark-mode differences are in *Per-palette deviations*.

| token | light target L |
|---|---|
| `paper-1` | 0.993 |
| `paper-2` | 0.982 |
| `wash-3` | 0.960 |
| `wash-4` | 0.936 |
| `wash-5` | 0.903 |
| `accent-6` | 0.860 |
| `accent-7` | 0.806 |
| `accent-8` | 0.738 |
| `highlight-1` | ~0.57–0.62 (then white-edge darken, exc. yellow) |
| `highlight-2` | `hoverL` of `highlight-1` |
| `ink-alt` | 0.53 |
| `ink` | 0.30 |
| `cta-1` | n/a (= the source color's own L) |
| `cta-2` | n/a (`hoverL` of `cta-1`) |
| `on-cta` | n/a (black/white text) |
| `on-highlight` | n/a (black/white text) |
| `identity` | n/a (verbatim input hex) |

## Per-palette deviations

| palette | scale 1–8 | cta | highlight | identity | dark stops | collision / shift |
|---|---|---|---|---|---|---|
| brand-primary | generated from brand hex | brand's own L | ~0.62 (white-edge) | input hex | `ACCENT_DARK_STOPS` | red-band → rung-1, dark muted collider, cool-render |
| brand-secondary | generated from secondary hex | secondary's own L | ~0.62 | input hex | `ACCENT_DARK_STOPS` | none (beta; no signal shift; mirrors brand if absent) |
| neutral | assigned Radix family | near-black / near-white gray | 0.57 gray | — | `DARK_STOPS` (lower) | — |
| red | generated (canonical + knobs) | = `highlight` | red's own L (white-edge) | — | `ACCENT_DARK_STOPS` | never shifts (collision reference) |
| yellow | generated (canonical + knobs) | = `highlight` | stays bright (black text) | — | `ACCENT_DARK_STOPS` | lemon (warm) / macaroni (cool) |
| green | generated (canonical + knobs) | = `highlight` | green's own L (white-edge) | — | `ACCENT_DARK_STOPS` | swap on collision (teal / yellow-green per side) |
| info-color | generated (canonical + knobs) | = `highlight` | info-color's own L (white-edge) | — | `ACCENT_DARK_STOPS` | swap on collision (magenta / blue per side) |


Neutral's `DARK_STOPS` vs the chromatics' `ACCENT_DARK_STOPS` is a documented deviation —
neutral sits lower so large surfaces don't read milky (revisit candidate). Neutral's
tint-generation machinery is wired but unexercised (generative-neutral opportunity).

## Intentional mechanisms (not bugs)

- **Yellow** — cream-gate, yellow L lift, chroma boost/fade, lemon yield. Tuned and
  load-bearing.
- **Red-band** — rung-1 re-anchor, `ink-alt`/`ink` deepen, cool-render, dark muted
  collider, the red-band watershed. Deliberate brand↔`red` separation.

## Engineering topics

**Foundations** — [Lineage](./lineage.md) · [OKLCH](./oklch.md) ·
[The OKLCH ramp](./the-12-stop-ramp.md) · [Stop ladder](./stop-ladder.md) ·
[Chroma envelope](./chroma-envelope.md) · [Compliance (WCAG + APCA)](./compliance.md)

**Collisions & signals** — [Collisions](./collisions.md) ·
[Accent-collision warning](./accent-warning.md)

**Warm-hue logic** — [Warm hues](./warm-hues.md) · [Relative spine](./relative-spine.md) ·
[Style lever](./style-lever.md)

**Modes & extras** — [Dark mode](./dark-mode.md) · [Illustrations](./illustrations.md) ·
[Neutrals](./neutrals.md) · [Escape hatches](./escape-hatches.md)
