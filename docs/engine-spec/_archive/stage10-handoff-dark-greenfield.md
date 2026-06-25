# Handoff — dark-mode GREENFIELD rebuild (Stage 10): blessed achromatic L scaffold + plan

**Supersedes Stage 9.** Stage 9 framed this as a chroma-only fix with "lightness left alone." Owner
re-steered to a **greenfield rebuild**: dark mode was never finished — it was a shipped compromise, so
**every dark rule is up for grabs**. Goals: (1) ground in OKLCH dark-mode research (find the math others
did), (2) flag the bolt-ons that block a good result, (3) propose NEW scaffolding, (4) visual samples to
steer. Branch `scope/dark-chroma` (worktree `~/okchroma-dark`). The option-D terminal multiply stays
**rejected**. Owner decided to **reopen the dark L path**.

## BLESSED — achromatic dark target L scaffold (owner, 2026-06-25, on a dark canvas)
Radix's compressed deep floor (stops 1–6) spliced to Material 3's airy crown (stops 7–12), lower 0.93
ceiling. These are the dark neutral lightness targets the rebuilt engine **emits directly**.

| stop | role | L | achromatic hex | contrast |
|---|---|---|---|---|
| 1 | app background | **0.178** | `#111111` | floor (off-black, not #000) |
| 2 | subtle background | 0.213 | `#191919` | |
| 3 | UI component bg | 0.252 | `#222222` | |
| 4 | hovered UI bg | 0.285 | `#2a2a2a` | compressed low end (Δ≈0.03) |
| 5 | active UI bg | 0.313 | `#313131` | |
| 6 | subtle border | 0.348 | `#3a3a3a` | ◁ Radix floor · Material crown ▷ |
| 7 | UI border | 0.42 | `#4d4d4d` | |
| 8 | focus border | 0.55 | `#717171` | WCAG-3 **3.89** (min 3.0) |
| 9 | solid fill | 0.66 | `#929292` | **provisional** — see fill-pin fork |
| 10 | hover solid | 0.72 | `#a4a4a4` | |
| 11 | low-contrast text | 0.84 | `#cacaca` | APCA **Lc72–74** over step-2 |
| 12 | high-contrast text | 0.93 | `#e8e8e8` | APCA **Lc90–92** (soft ceiling, less halation) |

Validated APCA Lc60/Lc90 (step 11/12 over step-2) + WCAG-3 non-text — all clear with headroom (the old
engine baseline failed both: text Lc57, focus border 2.88). Render: `dist/achromatic-dark-candidates.html`;
generator `scripts/achromatic-dark-candidates.ts` (Ls via `CANDIDATES_JSON`).
**Open:** stop 9 (solid) L is provisional — fill behavior (pin-to-brand vs L-target) is a chromatic-layer
decision. Neutral blessed **pure** (C0); a faint brand-hue tint (≤C0.016, Radix's tinted-gray ceiling) is
deferred.

## The central blocker — reopen the L path (DECIDED)
`darkRefY` luminance-equalization (`colorEngine.ts:525-527, 605-607`, `REFERENCE_H=245`): the dark ramp
**never emits its own `rootL`** — it converts each rootL to a blue-referenced WCAG-Y target, then
`findLForY` **re-solves L** so the brand's actual chroma/hue reproduces *blue's* luminance. A blessed L
ladder fed in would be **silently overwritten for every chromatic brand**. Invisible to prior sweeps and
to Stage 9's chroma-only fence (at C≈0 the solve is a no-op). **Decision: retire `darkRefY`; emit the
blessed target Ls directly.**

## Greenfield bolt-on flags (the re-sweep the last experiment lacked)
| flag | location | verdict |
|---|---|---|
| `darkRefY` blue-referenced L solve overwrites target Ls | `colorEngine.ts:525-527,605-607` | **blocker — retire** |
| Two unrelated chroma *models* (light absolute `LIGHT_BASE_C` ladder vs dark proportional `subtleC×mult`) | `colorEngine.ts:536-538` vs `602-609`; `stopTable.ts:57-84` | **blocker — root of loudness** |
| Four chroma treatments on one ramp; "fills never reduce chroma" is now false (option D regressed it) | `colorEngine.ts:401-402,590-600` | **blocker — no single model** |
| Class-D cliff (brandC 0.0399 vs 0.0401), kept only for blessed-render byte-compat | `colorEngine.ts:409-415` | **delete** (void in greenfield) |
| Dark fill L-lift `max(scaleL, darkFillMinL)` — one-directional clamp over computed L | `colorEngine.ts:595-600`; `stopTable.ts:112-116` | blocker under L-rebuild |
| Per-signal `darkFillMinL` ladder (green 0.75 / info 0.70 / red·yellow 0.63) | `signals.ts`; `resolve.ts:44` | blocker under L-rebuild |
| Dark text 11/12 = raw L pins, **no contrast bound** (light 11/12 are bounded) | `colorEngine.ts:614-620` | asymmetry — fold into target ladder |
| Red-band dark cluster rests on a **false premise** ("dark stop-9 L pinned for everyone" — it's `max(scaleL,floor)`) → lowered ΔE + muted-rose register | `resolve.ts:167-183`; `collision.ts:30-33` | intent survives; **mechanism re-derive** |
| Dark highlight rung `darkHlC` builds from full `brandC` (light uses moderate `HIGHLIGHT_LIGHT.baseC`) | `colorEngine.ts:691` vs `654` | compromise — **fix early** |
| `neutralChromaCurve` = absolute chroma by lightness+mode, gamut-clamped | `neutralCurve.ts`; `colorEngine.ts:387-388` | **principled — the cure to generalize** |

**§C over-bless confirmed:** `stage2-adjudication.md:32` walled off cta + the red-band cluster as
OFF-LIMITS past what `stage1-code-truth.md:127-129` found (cta `[unresolved-pending-spec]`). Do not inherit.

## Chroma model direction (chromatic layer — next phase, not yet built)
- **Generalize the absolute curve.** The engine already has the cure: `neutralChromaCurve` states chroma
  as an absolute function of lightness+mode (gamut-clamped), used by ONE palette. Generalize it to **all**
  palettes → one dark chroma intent that falls out of generation; no terminal multiply, no per-token
  exemptions.
- **Per-hue cap (research).** Modest global surround trim (CIECAM02 dark c≈0.525 vs avg 0.69, ≈0.76×) ×
  a **U-shaped per-hue cap** — deepest on blue/violet (~265°) and red/magenta, near pass-through on
  yellow/green (gamut self-clamps; H-K/Hunt/chromostereopsis weakest there). A flat multiplier is the
  wrong shape. Enforce with gamut-map: hold L+H, binary-search C down; re-check APCA after.
- **Fill-pin fork (decide here):** Radix pins stop 9 to the brand hex (same L/C both modes) vs the current
  engine lifting fills to L0.70. Determines stop 9's real L.
- **Hue:** hold constant down the ramp; keep `WARM_TORSION` gold-spine (the one place sRGB low-L needs it);
  `coolRedDark`/collider *intent* (red↔error separation) survives, *mechanism* re-derived on the new ramp.

## Research consensus (workflow's 4 reports + owner's 3 sources)
Off-black floor ~L0.16–0.18 (never #000); compressed low end (1–5); biggest jump reserved for 10→11
(text headroom); top text ~L0.93–0.95 (never pure white — halation); validate with **APCA Lc60/Lc90**,
not WCAG2; chroma reduced on dark (Radix nuance: surfaces can *gain* chroma as "tinted darks", desaturate
the text). Real disagreement on app-bg depth (0.10 brainy.ink / 0.18 Radix / 0.24 orgpad) — owner chose
the higher 0.178 floor. Sources: Radix (radix-ui/colors dark.ts), Material 3, Apple HIG, Carbon,
Catppuccin, Tailwind, Evil Martians OKLCH, Huetone, Leonardo; orgpad.info, builderius.io, brainy.ink.

## Phases
1. **DONE** — research + greenfield bolt-on sweep + **bless the achromatic L scaffold** (this doc).
2. **Reopen the L path** (engine change → `[[explain-before-engine-changes]]` gate): add the blessed
   `DARK_NEUTRAL_L` ladder constant; retire `darkRefY`; emit target Ls directly; delete the class-D cliff;
   re-bless. Fix the `darkHlC` rung early (use light's moderate construction).
3. **Chromatic layer:** generalize the absolute chroma curve to all palettes + the per-hue U-cap; settle
   the fill-pin fork; visual review on dark canvas.
4. **Re-derive** the red-band/collider mechanism on the new ramp (intent kept).
5. **Re-adjudicate stage-2 §C** honestly; re-bless `dark-audit` + `highlight` snapshots on visual approval.

## Gates (carry forward)
Explain any engine change + get explicit go (`[[explain-before-engine-changes]]`). No bolt-on corrective
layers (`[[no-corrective-patch-layers]]`). Dark review on a dark canvas only (`[[dark-mode-on-dark-bg]]`).
Re-bless only with owner visual approval. Caveman-terse working output; deliverables human-readable.

---

## PHASE 3 — DONE + WIRED into brand/secondary (2026-06-25, owner-blessed)
The dark CHROMA curve is built and **wired into `resolveBrand`** (brand/secondary floor; recommended only,
exact ships raw). Brands now render it live. **Owner blessed the look** in a faithful clone of
`demo/TokenCards.tsx` (full 14-token role set, current-vs-proposed, dark canvas).

**The blessed curve** — `src/engine/darkChromaCurve.ts`:
`darkChromaCurve(L,H,brandC) = brandC × shapeAt(L) × capMix(L,H)`, gamut-clamped by makeStop.
- `SHAPE_DARK` = Radix colored-dark distribution, deep stops bumped to `[0.125,0.16,0.305,…,1,0.94,0.745,0.2]`
  (text collapse → 11/12 tier separation falls out as chroma).
- `capMix` = BAND-LIMITED per-hue loudness cap: `loudnessCap(H)=0.76×U-shape` (blue/violet 265° + red/magenta
  345° troughs, ~1 yellow/green), applied ONLY in the mid-surface band (`bandWeight` 0 at deep darks ≤L0.22
  and above the fill) — deep darks keep tint, text/fill uncapped.
- `darkCtaTrim(H)=1−0.5(1−loudnessCap)` = gentle cta trim. **highlight `flipHl`** (in `colorEngine.ts`): dark
  highlight flips to BLACK on-text, L0.58 (black-legibility floor), chroma 0.7×baseC midpoint.
Seam: dark-only `GenerateOptions.darkChromaCurve` in `colorEngine.ts` (light untouched), applied at dark
stops 1–8 + text 11/12; fill 9/10 = brandC×darkCtaTrim; highlight if-branch.
**Layperson explanation:** `docs/engine-spec/dark-chroma-curve-explained.md` (ladders into the
chroma-vs-neutral graph task).

**Gate status:** typecheck ✓ · sweep ✓ · figma:verify ✓ (cta spot-hex updated `#8b9dce`→`#869cda`) ·
plugin:build ✓ · **dark-audit snapshot RE-BLESSED.**

### REMAINING (next session)
1. **highlight-audit FAILS** — its invariants are the OLD rules; the new design changes them on purpose:
   (a) dark on-highlight is now BLACK (the flip) — audit asserts "universally white" → update to allow
   black-on-highlight in dark; (b) dark highlight hover (hl10 L0.62) is LIGHTER than hl9 (L0.58) — audit
   asserts hover darker, but black-flip can't go below the L0.58 floor → update/rethink the hover/inset L
   (flagged: honey-lemon-secondary, chamomile-secondary). Then `highlight-audit:bless`.
2. **metric D** (dark-audit 11/12 convergence): 8 fails, mostly near-gray/muted (Oat Milk, Hojicha, Earl
   Grey, Lavender Latte) + borderline green — a true gray can't separate text tiers by chroma. Decide:
   relax metric D for near-achromatic brands (brandC < threshold) vs nudge. (Down from 13 in Phase 2.)
3. **Signals** not wired — thread into `SIGNAL_SCALES` + `signalShift`, reconciling `subtleChromaBoost`
   (curve uses brandC, not boosted) → alerts may read quieter; decide.
4. **Real demo** — `npm run build` then view the running demo (preview) for a final in-app pass.
5. **Light mode** unchanged (out of Phase-3 scope) — its own pass later.
6. **Phase 4** (deferred): fill-L-onto-scaffold (retire dark9L lift + per-signal `darkFillMinL`), collider
   mechanism re-derive, class-D cliff delete, honest re-adjudication of stage-2 §C.
