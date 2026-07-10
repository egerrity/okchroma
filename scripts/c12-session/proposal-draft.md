# C12 PROPOSAL — two problems, two regions, two metrics (2026-07-10 deep session)

## ⚡ v2 STATUS (post-adversarial-panel, REAL pipeline geometry — the current truth)
Sim v2 = `c12-proposal-sim2.ts` → proposal-sim2.json (mirror byte-validated vs resolveBrand
12/12; apca enforce Lc75; brand dark floor 0.70 + darkChromaCurve + coolRedDark; hover-policy
matrix). Panel findings + responses: `panel-findings.md`. Exhibit: render/c12-proposal.html.
KEY v2 numbers (hover=rest = shipped hover behavior): 0 confusable · 0 under-P2 · DARK = tiny
dust (45 real fired rows, median ΔC −0.024, 45/45 pass BOTH text bars — the v1 dark story was
phantom geometry) · light 109/115 ≥Lc60 (6 sub-60 listed) · wcag 100% legal · variants: apca
18/18 served (13 deep + light), wcag 11 stuck between her 0.45 floor and the 4.5 cap ·
self-down = 4 rows (her L0.45 all-dark honored, box lLo 0.50) · D_UP 0.11 (dead-zone geometry,
her up-mark mean), D 0.12 elsewhere, 0.115 fallback (4 uses).
HER FORKS (exhibit §5): treated-cta bar 60-vs-75 (the big one; evidence for 60 = her ladder
marks Lc61-64 + approved v5 demo Lc67-70) · hover policy (rest/fire/strict matrix) · box lHi
0.62 (12 load-bearing rows) · wcag variant-stuck 11 (0.42-0.45 band ask) · wiring notes
(hybrid-scale variant w/ pinned cta, C6 exemption re-key, per-brand plugin keys, post-repel
bar gate, paired role-legibility page before wiring).

## (v1 design record below — superseded where v2 differs)

Everything below is derived from owner data (owner-corpus.json). Zero engine edits until her OK.

## The model

Three owner-calibrated objects, each doing ONE job:

| object | question it answers | source | role |
|---|---|---|---|
| **P1 gate** (redGateDist v7, G .090) | "could this be mistaken for the signal at a glance?" | 100 marks, 0/100 | WHO FIRES |
| **Error core** (region) | "could this color BE the error itself?" | Instrument D core checks | WHICH TREATMENT |
| **P2 distance** (helmlab ≥ ~0.12) | "do these read distinct side by side?" | 9 ladder marks, CV 12% | HOW FAR (with P1-exit floor) |

## Treatment assignment (light-mode geometry; class is per-brand)

For a brand whose cta FIRES (inside the P1 gate vs red's cta):

**A. Brand cta inside the IDENTITY-KEEP region (vibrant near-reds — the brand could BE the
error):** → **MOVE THE RED** (her instinct; the parked C12 design's mechanism). Brand cta
untouched — identity preserved exactly. Red gets a per-brand VARIANT (lemon-swap family
precedent) riding red's own hue/chroma:
- variant DOMAIN = the whole error-ELIGIBLE range along red's hue: her core (L 0.42–0.58,
  go-to error picks) + the lighter edge tier, HARD-CAPPED at the white-text boundary (~0.70).
- variant position = the domain candidate NEAREST canonical red satisfying, vs the brand's
  light cta: P1 release (gate ≥ G+margin) + P2 (helmlab ≥ 0.12; declared fallback 0.115 =
  her mean mark, unused in sim).
- v1.4 sim: every fired-core brand servable; variants land L 0.42–0.695, median 0.47 (DEEP —
  the parked design's red→RICH #a82100 re-derived from her marks); white text ≥ Lc 60.8 on
  every variant → the black-text question DISSOLVES.

**B. Fired but NOT error-core (dusty / pink-side / orange-side / deep near-reds):**
→ **MOVE THE BRAND** (value repel v6):
- DIRECTION (declared from her rulings): seed L < DEEP_PIVOT (0.50) → DOWN (deep keeps
  character); else → UP (lighter reads salmon/pink/orange; dark gets scarier).
- DELIVERY = exit along L (chroma rides the cta formula, hue identity) until BOTH:
  (i) P1 released: gate dist ≥ G + margin — never ship confusable (the v5 floor), AND
  (ii) P2 distinct: helmlab difference vs red cta ≥ D_p2 (up 0.11 / down 0.13).
  max() of the two solves. No release-at-boundary: (ii) is what makes moves visible.

**Key structural consequence:** the colors that needed HUGE up-moves (vivid warm) are
exactly the error-core class — they no longer move at all (red does). The self-move
population releases well before the apca dead zone → the old trilemma dissolves.

## Dark mode — DUST (v1.5; her eye killed P1-release-only: "they don't deconflict anymore")
A light-solved variant can NEVER clear dark (every vivid brand's dark cta sits on the same
prominence anchor L≈0.63 — variant would need L 0.766+), and value moves in dark are squeezed
between the prominence floor and the dead zone. The axis that works (probe:
c12-dark-axes-probe.ts) is **CHROMA**: in dark, every fired brand keeps its dark L (prominence
untouched — floor-yield fork DISSOLVES) and hue, and gives up chroma until gate release AND
helmlab ≥ 0.12 (P2 now ENFORCED in dark too). v1.5 sim: 161/161 solved by dust alone (0
lift-fallbacks), median ΔC −0.048, deepest −0.108, every dark pair ≥ 0.120, 0 sub-bar text.
The treated brand reads as a muted twin of itself beside the fully-vivid red — the deleted
"muted dark collider" instinct re-derived from data. (Echo check at wiring: dark cta chroma
home = darkCtaTrim-adjacent, does not disturb "chroma is the light twin's" for scale stops.)

## Declared regions (fit from her checks — grid-granular, veto cells listed in exhibit)
- IDENTITY-KEEP box: H ∈ [20, 44] × C ≥ 0.18 × L ∈ [0.42, 0.62]. lHi 0.62 (not her 0.58 core
  edge): the vivid L0.60 reds sit on an unruled slice; self-up would strand them sub-bar in
  the dead zone; 0.62 keeps them + stays below her L0.65 "all light" ruling. VETO FLAGS: the
  lHi extension itself + H40 C0.2 L0.45 (1 box cell she never checked).
- VARIANT domain: red's hue, L ∈ [0.42, 0.70] (error-eligible ∩ white-text). Never deeper
  than 0.42 (L0.35 slice empty) — and the deep half IS her core, no edge-permission needed.
- DEEP_PIVOT = 0.50 (between her L0.45 all-dark and L0.55 zero-dark; sensitivity shown).

## Sim v1.4 scoreboard (792 seeds × 2 profiles, 167 fired rows)
populations apca 26 self-up / 18 self-down / 20 red-move (wcag 42/33/28) · post-treatment
inside gate 0 · under P2 (light) 0 · sub-bar text 0 light + 0 dark · unreachable 0 ·
ruling-reproduction 14/14 · variant fallbacks 0.

## What stays untouched
Exact mode (advice only) · secondary (theme rules) · C6 hue repel except fired-in-light
identity-hue rule (already ruled) · warning variant machinery (pattern donor) · hover
formula (proximity = known open knob, measured in sim).

## Verification plan (all scripted, real pipeline)
1. RULING-REPRODUCTION: the rule set must reproduce every direction ruling + both mark
   corpora (fire classification 0/100; L0.45 fired→down, L0.55/0.65 fired→up-or-red-move).
2. Agnostic grid sim (both profiles, both modes): populations per class, move sizes,
   final helmlab separations (≥ D_p2), gate release (0 inside), text poles (0 sub-bar or
   listed for her trilemma ruling), variant positions + their text poles.
3. Collision-sweep/gamut/dark-audit/polebar gates extended at wiring time.

## Open questions for the owner (in the exhibit, not decided silently)
1. Identity-keep box: lHi 0.62 extension + the H40 C0.2 L0.45 cell — veto either?
2. Dark P2: accept as-measured (median 0.115, 62/161 under 0.11) / calibrate a dark round
   later / enforce now (costs the dark dead zone)?
3. Floor-yield: 51 deep-class dark ctas exit below the prominence base (median −0.16,
   quieter) — accept, or up-only in dark?
4. Variant naming (identity, not semantic; deep candidate ≈ the old 'rich') + variant applies
   on all 4 plugin lanes like lemon/macaroni? [mechanically: yes, mirrors warningVariant]
5. DEEP_PIVOT 0.50 ok? (sensitivity in exhibit)
6. D_p2 declared: 0.12 flat (+0.115 fallback) vs per-direction 0.11 up / 0.13 down?
(black-text variant question DISSOLVED by the deep-domain variant — all variants white-text)
