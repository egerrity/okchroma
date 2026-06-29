# Follow-up

Work parked after the 2026-06-27 merge to `main` (APCA on-highlight, low-hierarchy
neutral cta, accent→wash/highlight rename, accent→secondary internal rename, stop-8
WCAG 1.4.11 3:1 clamp, dead-code scrub, fresh `scale.md`). Two themes: the **contrast
mode** the engine ships text under, and the **secondary color**.

## 1. Contrast mode — APCA default, opt-in WCAG-compliant shape

### Where it stands (the asymmetry)

On-text legibility is currently split by fill:

- **on-highlight** → judged by **APCA** (body-text Lc 60). `placeRung` with
  `enforce=false` ([`colorEngine.ts`](../src/engine/colorEngine.ts), the `highlight`
  block). The fill is NOT moved to hit a WCAG floor.
- **on-cta** → still enforces **WCAG 4.5** (`onTextIsWhite(…, enforceOnFillContrast)` at
  the `fill9` / `ctaDark` sites), and the cta fill is moved to clear 4.5.
- `ink-11`/`ink-12` → WCAG-floored (`STOP_11_CONTRAST` 4.5 / `STOP_12_CONTRAST_FLOOR` 7).
  `highlight-8` → WCAG 1.4.11 3:1 (`STOP_8_NONTEXT_CONTRAST`).

So the engine is **mixed**: highlight is APCA, everything else is WCAG. Consequence:
~101/124 fleet combos have on-highlight text below WCAG 4.5:1 (worst ~3.17:1) — fine
under APCA, a failure under a strict WCAG 2.x audit.

### Goal

1. **APCA as the default for both cta and highlight** — resolve the asymmetry (make the
   cta judge on-text by APCA like the highlight does, instead of the WCAG enforce + fill
   move). Decide whether ink/stop-8 stay WCAG or also move.
2. **Opt-in WCAG-compliant shape** — a mode where on-cta AND on-highlight clear WCAG
   4.5. This is a *shape* change, not a flag flip: the fill has to leave the WCAG dead
   zone (which is wider than APCA's), so it needs alternate highlight/cta L targets.
   Follow the stop-8 clamp pattern (`STOP_8_NONTEXT_CONTRAST`) — the value must **fall
   out** of the shape, no bolt-on "move the fill to hit the text target" feedback loop
   (that was `placeLegibleRung`, removed on purpose).
3. **Engine decision alerts must reflect the active mode** so they aren't misleading.
   The alerts come from `annotationNote(r)` ([`cssRender.ts`](../src/engine/cssRender.ts))
   + `noteSuffix` ([`build.ts`](../src/build.ts)); today they describe rung-1 / collision
   / component-rule decisions but say nothing about APCA-vs-WCAG. With the WCAG floor
   dropped on the highlight, any alert that implies full WCAG compliance is now wrong —
   surface which contrast mode is active and what it guarantees.

The parked task chip (the WCAG-compliant highlight variant) is a **subset** of this —
expand it to cover the cta and the decision alerts.

### UI surface (demo + plugin)

The mode toggle and the corrected alerts both need to show up in the demo's "Color
engine decisions" panel and in the plugin UI. The alerts are the same `annotationNote`
string in both paths.

## 2. Secondary color

The secondary runs through the **same pipeline** as a primary —
`resolveBrand(secondaryHex, …)` ([`build.ts`](../src/build.ts)), generated as an
independent brand scale. Two gaps:

### 2a. Signals don't shift for the secondary

`collisionStatus(scale)` ([`resolve.ts`](../src/engine/resolve.ts)) checks the signal
scales against the **primary** brand only; every signal decision (`rung1`,
`darkCollider`, `warningVariant`, `pickSignalShift`) runs on the primary. The secondary
is resolved separately and its collisions with the signals are never checked
(`build.ts` says so: "Signals follow the primary only"). So a signal can collide with
the secondary color with no shift.

**Goal:** extend the signal collision/shift to also consider the secondary, so signals
stay distinct from **both** brand colors.

### 2b. No "make it secondary" logic

The secondary is just a second brand scale from its hex — there's no logic to make it
read as *subordinate / related* to the primary (harmonized hue relationship, lower
prominence, distinct-but-not-clashing). Right now a secondary is treated exactly like a
standalone primary.

**Goal:** add logic that optimizes the secondary *relative to* the primary — the "truly
secondary looking" relationship.

## Pointers

- contrast / enforce — [`colorEngine.ts`](../src/engine/colorEngine.ts): `onTextIsWhite`,
  `placeRung`, the cta `enforceOnFillContrast` blocks; targets in
  [`stopTable.ts`](../src/engine/stopTable.ts).
- decision alerts — [`cssRender.ts`](../src/engine/cssRender.ts) `annotationNote`,
  [`build.ts`](../src/build.ts) `noteSuffix`, `ResolvedBrand` fields in
  [`resolve.ts`](../src/engine/resolve.ts).
- signals / collision — [`resolve.ts`](../src/engine/resolve.ts) (`collisionStatus`, the
  resolve flow), [`collision.ts`](../src/engine/collision.ts),
  [`signalShift.ts`](../src/engine/signalShift.ts).
- secondary — [`build.ts`](../src/build.ts), `demo/App.tsx`,
  [`figmaRender.ts`](../src/engine/figmaRender.ts) (`ThemeInput.secondary`),
  [`secondaries.ts`](../src/secondaries.ts).

## Working rules (carried from this session)

- Test against an **agnostic hue × chroma fixture** — the worst-case hue is the bar,
  never the named brand list, never gray.
- On-text has **one** criterion: it passes. Never favor white/black; they're the
  contrast extremes, so if neither clears, move the fill (don't bend the text).
- No bolt-on patch layers — values fall out of the shape.
- Validate via the real pipeline; gates: typecheck, figma:verify, audit,
  highlight-audit, smooth, sweep. Owner visual approval on a **dark** background before
  re-blessing any snapshot.
