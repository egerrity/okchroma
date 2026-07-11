> **⛔ SUPERSEDED (2026-07-10, C12 v8): the arc split described here (RED_SPLIT/vividSplit,
> ctaArcTargetL/ctaArcCapL, arcRedVariant, exitCtaL) was replaced by the JOINT SOLVE — see
> `scripts/c12-session/joint-solve-model.md`. The pole-agnostic / ratioFloor LESSONS carried
> forward; the mechanisms named here are deleted. Her marks and the fitted rule remain the
> calibration record (constants preserved in colorMath.ts as record-only).**

# Vivid-arc delivery — Instrument E + pre-findings (2026-07-10, owner away; zero engine edits)

## ✅ RESOLVED SAME DAY — owner live session, rule CALIBRATED + BLESSED (28/28 holds)
Design correction (her words): the arc de-conflict is an OPPOSED SPLIT — "the brand gets
lighter, the red error gets darker" (red-lighter = dead concept; v1's UP column misread).
Calibration (Instrument E v2 c12-vivid-split + v2b c12-vivid-orange, her picks):
PINK #FF006F brand +0.04 / red −0.08 · RED #FF0000 +0.08 / −0.12 · ORANGE #FF7300 ±0.00 /
−0.08 / hue −5° (−10 ok, −15 "too cool"; darker-only red "leans orange" beside orange).
Fitted rule (c12-vivid-rule.ts, keyed to dh = brand seed hue − red cta hue):
  redDL = −0.10 − 0.04·gauss(dh,7)   ← window shifted .10–.14 across the board (her ask)
  brandDL = +0.08·gauss(dh, dh<0 ? 21.5 : 6)   (gold side never lightens)
  redDH = −5°·sigmoid((dh−9)/2.5)              (cools gold-side only)
Verification: render/c12-vivid-rule.html, 28 arc brands — owner marked ALL HOLD
(vivid-rule-checks.json) + "all good!!".

## ✅ WIRING OK GIVEN + WIRED (2026-07-10, same session)
Owner approved the wiring proposal and PICKED OPTION (a) for the brand-lighter legality
question ("go with your recommendation"): brand target capped at the white-window top
(ctaArcCapL, profile law). Wired: colorMath RED_SPLIT + vividSplit · colorEngine
ctaArcTargetL opt · reqtoken lighter-only capped delivery · resolve.ts arcRedVariant
(minted, pinned, floored at RED_VARIANT_L_MIN) + arc-over-keep-box precedence (matches the
blessed 28's population) + archetypeOverride suppresses BOTH split halves. Mirror-validated
28/28 byte-match vs the blessed page (c12-split-wired-check.ts). 16-agent verify fleet:
non-arc byte drift ZERO (878k-pt sweep), gates green (drift = the known unblessed classes).

SURFACED, measured (owner saw in-chat):
- apca cap cost up to −0.024 vs the blessed RAW swatches (gold-side near-red: #FF5B00
  target .723 → ships .699), not the ≤0.01 first quoted; 7/28 capped at all.
- wcag lane: white-4.5 caps brand-lighten to ~+0.007 mean — the split is effectively
  RED-ONLY on wcag (legal, gate margins hold; bless was apca-rendered). OWNER FORK at bless.
- wcag variant would mint L .446–.449 on 4/28 — floored at RED_VARIANT_L_MIN (.45), her
  recorded error-eligible bottom.
- ext-drift list shifts vs HANDOFF record (turmeric wcag 43→45 now, on-cta flip gone).
- Stale session scripts vs the split (list, unfixed): c12-wired-check labels ·
  c12-proposal-sim2/exhibit arc modeling · c12-vivid-delivery (records the v6 failure).
- gamut-sweep gate found stale (expects 24 core stops, engine ships 11+11 since stop-10
  deletion; exit-0 always) — PRE-EXISTING, spun off as a separate task.

## ✅ ROUND 2 (2026-07-10, owner screenshots): the white-pole relapse purged from ALL C12 paths
Her catches (BD0000 · FF3D3D shots · "there should not be anything in wcag forcing the text ·
apca you still have to clear the dead zone · not darkening the text at a wide enough range"):
1. ctaArcCapL was white-only → now pole-agnostic: wcag never caps (a pole always passes 4.5),
   apca caps only at the true dead zone (cleared, never parked in).
2. exitCtaL delivery now ALSO requires a passing pole (apca exits that satisfied gate+P2
   inside the dead zone keep going past it — retires the "12 sub-60 residual" class;
   FF3D3D apca now exits to L0.772 black-text pastel).
3. Post-move pole re-judges carry the wcag 4.5 conformance floor (the enforce branch's
   |Lc|≥45 taste guard blocked legally-required black flips: FF3D3D-class shipped white at
   3.53 — now black at 5.96). Same floor on both variant mints (pinned = no enforce-darken).
4. redMoveVariant's ceiling pole-agnostic → wcag variant domain unsqueezed → BD0000-class
   keep-box brands get their variant back (brand KEEPS L0.50 identity, red → coral L0.64)
   instead of the fallback self-exit ("dark red moved lighter, red untouched" — her catch).
Verified: mirror 28/28 still byte-match · collision/req/register/secondary/audit/divergence/
smooth green (same unblessed drift classes) · demo rebuilt + live-DOM checked (#FF3D3D wcag:
brand #ff3c3d BLACK text · red #d63e1e white).
OPEN (her call): FF3D3D-class (vivid ~0.79, below arc vividMin 0.85) gets no split — wcag pair
= two reds ΔL~0.07 with opposite text poles. If her eye still vibrates, the knob = extend
RED_VIVID_ARC vividMin (instrument first). Also flag: BD0000's variant is CORAL (red goes
lighter — the keep-box side rule; arc's red-never-lightens is arc-scoped) — her eye check.

## What exists now
- **Instrument E**: `render/c12-vivid-delivery.html` (open via **http://localhost:8324/c12-vivid-delivery.html**,
  marks server; save round-trip verified). 11 arc brands (her 3 anchors + agnostic sweep H8–48 × L.60/.70,
  vivid .88–.90), each = the brand's REAL final cta (live resolveBrand, apca lane) beside a ladder of
  red-variant candidates, ΔL 0.02 rungs from canonical red's cta, both directions, flush pairs.
  She checks the FIRST clean rung per direction. Marks → `vivid-delivery-checks.json`.
- **Probe data**: `vivid-delivery-probe.json` — full rung tables (dL / p2 / gate / hex per rung, per brand)
  so any delivery rule can be fit offline against her marks. Generator: `c12-vivid-delivery.ts` (typecheck green).

## Ground truth (confirms her catches)
Red cta L0.627 (apca) · variant white-text cap L0.698 (up side = only ~3 rungs; the space is DOWN).
- Arc-END brands under-move exactly as she said: #FF7300 wired ΔL **+0.00** (coral L0.63 = canonical red
  renamed) · #FF006F **0.00** · #FF0000 **−0.025** · H8/H16/H48-L0.7 all 0.00…−0.015.
- Mid-arc BOTH brands move for the wrong reason: their own exit lands them near red, so P2 forces
  distance (H24 −0.105 · H32 −0.165 · H40 −0.14).

## Pre-finding: the p2-bar candidate is geometrically broken for this class
Down-ladder p2 spans over 0.16 raw ΔL: pink end **.004–.005** (saturated flat), orange end .017,
only near-red exited brands have slope (.024–.048). Consequences:
- A stepped-up bar (.13/.14) lands wildly inconsistent dL per brand (0.00 → never) — a knife-edge
  threshold on a flat curve, NOT a delivery rule.
- helmlab saturates on cross-hue pairs → P2 cannot express "keep going" for the very brands she
  flagged. Her instinct (RAW distance, dynamic, keyed to the brand's end color — positional mirror /
  vividness-scaled) is the only lever family the geometry supports. Her ladder marks decide which.

## Next (with her)
1. She marks Instrument E (first clean rung per direction, per brand).
2. Fit the dynamic rule on the marks (rung tables ready); check the fitted rule re-serves keep-box
   (#CC2631 class) without regression, then wcag lane.
3. Then the rest of the HANDOFF wrap list (bless · names · plugin keying · CATALOG · push on word).
