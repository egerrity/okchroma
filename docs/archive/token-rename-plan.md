# Token rename + role extraction — staged plan

Status: planning complete, ready to implement. Branch: `scope/token-rename-v2`
(off `main`). The earlier attempt `scope/token-rename-extension` is **parked for
reference only** — it over-reached (deleted the demo/illustrations, invented
engine math, shipped a broken `highlight`); do not build on it.

---

## Why this is staged

Two independent changes are being bundled into one vocabulary shift. They have
very different risk profiles, so they ship as separate, independently-green
stages:

- **Rename + role extraction** — pure naming over values that already exist.
  Byte-identical. Low risk.
- **Additive tokens** (`highlight`, `identity`, neutral `cta`) — new computed
  outputs. Touches the engine (append-only). Higher risk, needs real assertions.

Each stage must pass its full acceptance gate before the next begins, so any
regression is localized to the stage that caused it.

---

## The finalized token model

The 1–12 numbered ramp is wrong because the ramp was never linear (the manager's
"9 is darker or lighter than 11" complaint). The fix: a **monotonic surface
scale (1–10)** named by category, plus **role tokens pulled out of the scale**
(the things that never followed the surface ramp's logic — text colors, the
brand button, the literal hex).

| Group | Tokens | Nature |
|---|---|---|
| **Surface scale (1–10)** | `paper-1` `paper-2` · `wash-3` `wash-4` `wash-5` · `accent-6` `accent-7` `accent-8` · `highlight-9` `highlight-10` | monotonic lightness, lightest → darkest fill |
| **Text roles** | `ink` `ink-alt` | contrast-derived, not scale positions |
| **Action role** | `cta` `cta-hover` | brand-variable button |
| **Identity** | `identity` | literal input hex, mode-invariant |
| **On-fill text** | `on-highlight` (universal) · `on-cta` (where `cta` exists) | legible text color for each fill that holds text |

**On-fill text — universal vs. role.** Two fills hold text, so the old single
`on-fill` splits: `on-highlight` is **universal** (every ramp has `highlight`, so
every ramp gets it) — this is the symmetry backbone. `on-cta` is a **role** token,
present only where `cta` is (brand/secondary/neutral). Signals get `on-highlight`
but **no `on-cta`**, because a signal's `highlight` already *is* its button — a
separate signal `cta` would just duplicate it. This makes the "no error button"
rule structural, not conventional, while keeping the scale + `on-highlight` shape
identical across every ramp (universally remappable). Both `on-X` polarities fall
out of work already specified — no new math (see Stage 2).

Numbers survive **only** on the surface scale, where they're honest (lightness
is monotonic). Everything non-linear is pulled out and named, not numbered.

### Per-ramp inventory

| Ramp | Surface 1–10 | Roles | Count |
|---|---|---|---|
| brand (primary & secondary) | paper…accent + **new** `highlight-9/10` | `ink` `ink-alt` `cta` `cta-hover` `identity` | 15 |
| neutral | paper…accent + `highlight-9/10` (rename of old 9/10) | `ink` `ink-alt` + **new** `cta` `cta-hover` | 14 |
| signals (error/warning/success/info) | paper…accent + `highlight-9/10` (rename of old 9/10) | `ink` `ink-alt` | 12 |

### Rename map (old stop → new name)

| Old | New | Status |
|---|---|---|
| 1, 2 | paper-1, paper-2 | rename |
| 3, 4, 5 | wash-3, wash-4, wash-5 | rename |
| 6, 7, 8 | accent-6, accent-7, accent-8 | rename |
| 9 (brand) | `cta` | rename (pulled out) |
| 10 (brand) | `cta-hover` | rename (pulled out) |
| 9 (neutral/signal) | `highlight-9` | rename |
| 10 (neutral/signal) | `highlight-10` | rename |
| 11 | `ink-alt` | rename (pulled out) |
| 12 | `ink` | rename (pulled out) |
| role `accent` | role `secondary` | rename |
| — | brand `highlight-9` / `highlight-10` | **new (Stage 2)** |
| — | brand `identity` | **new (Stage 2)** |
| — | neutral `cta` / `cta-hover` | **new (Stage 2)** |
| `on-fill` (brand/secondary) | `on-cta` | rename |
| `on-fill` (neutral/signal) | `on-highlight` | rename |
| — | `on-highlight` (brand/secondary) | **new (Stage 2)** |
| — | `on-cta` (neutral) | **new (Stage 2)** |

### Emit order (uniform across every ramp)

`paper-1 → … → highlight-10` (scale), then `ink-alt`, `ink`, `cta`, `cta-hover`,
`identity`. Tokens a ramp doesn't have are skipped. Uniform output shape was an
explicit requirement of the original concept.

---

## Hard constraints (the line the last attempt crossed)

1. **`cta`/`cta-hover` generation is UNTOUCHED.** They are today's stop 9/10,
   produced by the exact same code (collision re-anchoring, red-cool, exact mode
   and all). We **rename** them; we never reason about or alter the color they
   come out as.
2. **Existing values stay byte-identical.** `npm run audit` must report
   `snapshot regression: clean` after Stage 1 AND after Stage 2 (additions must
   not move any existing stop).
3. **The only engine edit allowed is append-only** (Stage 2 highlight): it adds
   ladder rungs and touches no existing computation. No bespoke parallel math
   path (the last attempt's `brandHighlightPair` mistake).
4. **Out of scope — do not touch:** the illustration subsystem (ignored, not
   deleted), the example-palette gallery and docs views (hidden, not deleted),
   `cta` math, any existing stop's computation.

---

## Stage 0 — blast-radius map (done; read-only)

Where token names are formed and consumed across the clean tree:

**Naming chokepoints (where the rename happens):**
- `src/engine/cssRender.ts` — `stopsToVars(stops, prefix)` builds `--${prefix}-${s.stop}`. The single CSS naming point. Also forms the `accent` prefix (→ `secondary`), `--*-on-fill`, signal prefixes, and `--illus-*` (illustration — leave untouched).
- `src/engine/figmaRender.ts` — `rampGroup()` builds `g[String(s.stop)]` → `brand/9` etc. The Figma naming point. Plus the `accent` field (→ `secondary`).

**Consumers of the primitive names (must be re-pointed in Stage 1):**
- `tokens/semantic.css` — references `--brand-{4,9,10,11,12}`, `--accent-{4,9,…}`, `--neutral-{1,2,12}`, and `--{error,warning,success,info}-{4,9,10,11,12}`. Every reference re-points to the new name (e.g. `--brand-bg-emphasis: var(--brand-cta)`; `--brand-11 → --brand-ink-alt`). The demo's preview reads these semantic names, so it's insulated from the rename.
- `src/build.ts` — orchestrates emit via `stopsToVars` (neutral, signals) and `brandCss` (brands). No name strings of its own; flows through the chokepoints.
- `plugin/code.ts` — **internal-consistency update** (see Stage 1): writes/reads/aliases `brand/primary/<token>`, detects its own prior output via `existingThemeVars.has('brand/primary/1')` and `has('brand/accent/1')`, and the `accent` role. All must move to new names so repeat applies work.
- `demo/shared.tsx` `RampRow` + `demo/CustomTheme.tsx` — the ~9 raw `--brand-N` references (scale display). Updated in Stage 3 when the display is re-skinned.

**Tests referencing emitted names (must update):**
- `scripts/figma-verify.ts` — asserts on `brand/9` literally (`'brand/9 not type color'`). Re-point to `brand/cta`.
- `scripts/dark-audit.ts`, `smoothness-audit.ts`, `locked-set-check.ts` — operate on `GeneratedScale` **stop numbers**, not emitted strings, so they're insulated from the rename; the blessed snapshot stays clean automatically.

---

## Stage 1 — rename + role extraction (byte-identical)

**Changes:**
- Introduce a single source of truth for stop→name mapping (a `tokenNames`
  helper) used by both `cssRender` and `figmaRender`, encoding the per-ramp
  asymmetry (brand 9/10 → `cta`/`cta-hover`; neutral/signal 9/10 →
  `highlight-9/10`; 11 → `ink-alt`; 12 → `ink`).
- Rename role `accent` → `secondary` in `cssRender`, `figmaRender`, `plugin`.
- Split `on-fill`: brand/secondary `on-fill → on-cta`; neutral/signal `on-fill → on-highlight` (byte-identical — same computed polarity, renamed by what stop 9 became).
- Re-point `tokens/semantic.css` to the new primitive names.
- Update `plugin/code.ts` detection + alias references to new names
  (internal consistency — required for repeat applies to work; NOT old-file
  migration, which is dropped — the plugin is not deployed).
- Update `scripts/figma-verify.ts` to the new names.

**Acceptance gate:**
```
npm run audit        # MUST say: snapshot regression: clean — matches blessed build
npm run typecheck    # clean
npm run build && npm run plugin:build && npm run demo:build   # all succeed
npm run figma:verify # passes against renamed output
```
Plus assertions:
- No old numbered primitive name leaks (`brand/primary/9` gone; `brand/primary/cta` present).
- **Role rename complete:** no `accent`-role token names leak in emitted output — `brand/accent/*` (Figma), `--accent-*` (CSS), and plugin alias targets are all `brand/secondary/*` / `--secondary-*`. (Internal code identifiers like `accentMode`/`fileHasAccent` may stay; this checks emitted tokens.)
- **Plugin idempotency:** applying the new plugin twice / two brands to one file recognizes its own vars (no duplication, correct overwrite-nudge + secondary backfill). This is the "naming not broken on reuse" guarantee.

Stage 1 is independently shippable — it answers the manager's feedback on its own.

---

## Stage 2 — additive tokens (append-only engine edit)

### brand `highlight-9` / `highlight-10` — ladder extension

The validated approach (see simulation in session history). Highlight is a
**ladder rung**, generated by the SAME 1–8 loop math (`lightHueAt` + cream/
envelope chroma), by appending two rows to the light-stop tables:

```
highlight-9 :  rootL ≈ 0.62, baseC ≈ 0.142, satFraction ≈ 0.75   (pre-enforcement)
highlight-10:  hover of highlight-9 (hoverL)
```

Rules:
- Computed **inside the resolved scale** (so rung-1 re-anchoring and the red-cool
  drift flow in, exactly as for stops 1–8). Same treatment as the ladder — no
  separate collision pass of its own.
- **White-text enforcement:** darken `highlight-9` to the WCAG-4.5 white edge
  (search 4.6 for rounding) — **except a yellow band** where darkening destroys
  hue meaning (the warning-signal precedent). Reuse `YELLOW_L_LIFT` (center 92,
  σ 20). **Open: the lower band edge** — H 72 split the gold family (`#E4A14E`
  at H 69.5 fell out); likely lower it to ~65 or gate by chroma+hue. Decide at
  implementation start.
- Green needs **no** special-casing — white-enforcement is precisely the fix it
  wanted; the old "collision with stamp-11" dissolved when 11 left the scale.
- **Dark mode:** the sim only covered light. Stage 2 must add the parallel dark
  extension (same append, dark machinery).

### brand `identity`

Literal input hex, mode-invariant. `scale.identityHex = hex.toUpperCase()`.

### neutral `cta` / `cta-hover`

New black button (neutral 9 gray isn't dark enough). Derive from existing
neutral/archetype machinery: a pinned near-black gray in light (`near-black`
median L 0.125), inverting to near-white in dark (`light` median L 0.925),
`cta-hover` = `hoverL`. Validated in sim: light `#060606` holds white text 20:1;
dark `#E6E6E6` holds black text 17:1. Additive, reuses existing helpers, no new
perceptual formula. L targets are tunable.

### on-highlight (all ramps) + on-cta (brand/secondary/neutral)

- `on-highlight` for brand/secondary is **new** here (the existing `on-fill`
  rename covered neutral/signal in Stage 1). Its polarity is exactly the
  white/black decision made by the highlight white-text enforcement above
  (white normally, black for the yellow band) — surfaced as a token, not
  recomputed.
- `on-cta` for **neutral** is **new** here. The dark-mode neutral `cta` is
  near-*white*, so it needs **black** text — distinct from the neutral ramp's
  white default. Polarity: white in light, black in dark (per the sim above).
  Brand/secondary `on-cta` came from the Stage 1 `on-fill` rename.

**Acceptance gate:**
```
npm run audit   # stops 1–12 STILL byte-identical (additions don't perturb existing)
npm run typecheck
```
Plus a new `highlight-audit` (mirrors `dark-audit`), across all 35 scales:
- monotonic surface scale: `accent-8.L > highlight-9.L > highlight-10.L`
- **hover guard:** `highlight-9.L > highlight-10.L` always (pair never inverts)
- white-text holds (WCAG ≥ 4.5) for every non-yellow-band hue
- yellow-band hues correctly excluded, keep black text
- `identity === input hex`
- neutral `cta`: dark-enough-for-white in light, inverts in dark
- `on-highlight` present on every ramp; `on-cta` present on brand/secondary/neutral and **absent on signals**; each `on-X` polarity actually passes (WCAG ≥ 4.5) on its fill in both modes
- Bless a baseline for the new tokens (like `audit:bless`) so future changes
  can't silently move highlight. **Bless only intentionally, after assertions pass.**

---

## Stage 2.5 — green/success signal forced to white text (own re-bless)

Pulled out as its own stage on purpose (decided 2026-06-22). The green success
signal currently lands where it needs **black** text to pass WCAG; the owner
wants it forced darker so **white** passes (consistency with the other signal
fills). This **reuses the highlight `enforceWhite` mechanism built in Stage 2**
(`enforceOnFillContrast` darken-to-white-edge), applied to the success signal's
fill stops.

**Why separate, not folded into Stage 2:** it *moves an existing blessed stop*
(success stop 9's L, its on-fill polarity, likely dark too). Stage 2's gate is
`audit` staying byte-identical — `signal:success` is in that snapshot — so doing
it inside Stage 2 would break Stage 2's own regression guard. It also can't go
*before* Stage 2 (the mechanism doesn't exist yet). So it's the immediate next
stage, with its **own intentional `audit:bless`** after the success change is
visually approved. Stage 2 proves "added without disturbing"; 2.5 proves "moved
exactly success-green and nothing else."

---

## Stage 3 — demo (display/additive only; touches no engine)

**Preserve** the working demo (`CustomTheme`): hex input, secondary/accent 2×2,
signal scales, collision notices, **Figma ZIP export**, suggested pairings. The
preview reads semantic names, so it survives the rename almost untouched.

**Changes:**
- Re-skin the scale display as **categorized cards** (surface scale 1–10 row +
  role chips), replacing the flat 1–12 `RampRow`. This is the manager's fix made
  visible.
- **Hide** the `gallery` (Example palettes) and `docs` views — remove from the
  `VIEWS` array + render switch in `demo/App.tsx`; leave the component code in
  place (reversible, no deletion).
- Scale cards display **both** on-fill text tokens: `on-highlight` on the
  `highlight` chips and `on-cta` on the `cta` chips (the chip's text rendered in
  its actual on-fill polarity).
- **Curated preview with primitive-only tooltips** — each UI element
  demonstrates one primitive; hovering shows the **primitive** token name
  (`cta`, `highlight-9`, `ink`…), never the semantic role (semantic is demo
  scaffolding, not a deliverable — the pitch is "remap these primitives into any
  system"). Some regions need **forced/pinned hover states** so a hover-state
  primitive (`cta-hover`) can be displayed and read without the act of hovering
  changing it. **Preview composition pending a mockup from the owner** — leave as
  a marked placeholder until then.

**Acceptance gate:**
```
npm run demo:build && npm run typecheck   # clean, no dangling imports
```
Plus browser verification (preview tools): no console errors; cards render;
tooltips report **primitive** names; no old numbered names in rendered output;
screenshot as proof.

---

## Decisions log (so these aren't relitigated)

- **"Extend the ramp" = add role tokens, not more stops.** The scale is 1–10.
- **`stamp` → `ink-alt`.** Text family is `ink` (deepest, old 12) + `ink-alt`
  (old 11). No orphan word.
- **Highlight = ladder rung (Option B), append-only**, not a fixed-archetype
  fill and not a bolt-on function.
- **White text on highlight, yellow excluded** (meaning-preservation, mirrors
  the warning signal). Green is NOT excluded.
- **11/12 pulled out of the scale** — they're contrast-derived text, never scale
  positions; this dissolved the green/hover-inversion problem.
- **No backward-compat alias layer, no old-file migration** — no external
  consumers; plugin not deployed. Just update internal references + keep plugin
  self-consistent for repeat applies.
- **Preserve the demo, don't rebuild** — the var reassignment is insulated by
  the semantic layer; rebuilding loses working features (the last attempt's error).
- **`on-fill` splits into universal `on-highlight` + role `on-cta`.** Signals get
  `on-highlight` but no `on-cta` — a signal's `highlight` is already its button,
  so a signal `cta` would be redundant. Makes the "no error button" rule
  structural, keeps scale + `on-highlight` identical across all ramps. No new
  math — both polarities fall out of the highlight enforcement / neutral cta.

## Follow-ups (separate tasks)

- **BEFORE Stage 3: pull the fills out of the scale (decided 2026-06-23).** 9/10
  are the emphasis fills, not scale steps (yellow/signals exposed it). Scale
  becomes 1–8; fills rename to `cta-1/2` + `highlight-1/2` roles (no `fill-`
  prefix; `-2` = hover). Pure rename, no value change. Full spec + rename map +
  per-ramp inventory in [`handoff-2026-06-23.md`](./handoff-2026-06-23.md).
- Green/success **signal** ramp forced darker for white text (same enforcement
  mechanism as highlight).
- Rewrite `docs` view + `README` to the new vocabulary (currently hidden/stale).
