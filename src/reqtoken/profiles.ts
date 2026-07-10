// profiles.ts — the CONTRAST-PROFILE compiler. A profile is the same declaration re-solved under a
// different contrast metric: withProfile() maps every declared wcag require onto its apca equivalent
// (min-separation requires are metric-agnostic and pass through untouched). Nothing else changes — the
// producers, roles, and ons are identical, so the profile is exactly "re-solve vs a different constraint."
//
// 'wcag' is the shipped default and returns the spec UNCHANGED (same object — byte-identical output is
// the standing guarantee when contrastProfile is unset). 'apca' is OPT-IN: capability + gate + renders
// landed as a spike; the Lc map and any adoption/exposure are the owner's call.
//
// The profile covers ON-TEXT too (owner call 2026-07-02): withProfile sets ons.onFill.enforceLc from the
// map's 4.5 slot, so the cta enforcement judges + re-solves on Lc instead of WCAG 4.5 (the pole choice was
// already apca-pole in both profiles; the wcag-flip fallback is a no-op under a single metric).
import type { ModeSpec, Require, StopReq } from './spec'

export type ContrastProfile = 'wcag' | 'apca'

// wcag ratio → APCA Lc, THE RECOMMENDED MAP (each slot measured against the real resolved output, not
// copied from a bridge table):
//   3:1 → Lc 30 (stop 8, non-text) — APCA's solid-UI-component minimum. NOT the text-bridge 45: the dark
//     scale reads only Lc ≈ 24–29 at the scaffold, and Lc 45 would force dark stop-8 to L ≈ 0.69, past the
//     hand-placed highlight-9 (0.600) — a structural break.
//   4.5 → Lc 75 (ink-11) — APCA's body-text minimum. The cta/on-fill enforcement no longer rides
//     this slot: the owner's declared contract (2026-07-10) is on-cta Lc 60 — APCA's large-text bar;
//     cta labels are button text, not body copy — set via CTA_ONFILL_ENFORCE_LC below. Side effects
//     she accepted: enforcement-bound warm/pink ctas release lighter, dark ctas enforce less.
//   7 → Lc 90 (ink-12) — APCA's preferred-body value; the scale already reads ≈ 90+.
export type LcMap = Record<number, number>
export const DEFAULT_APCA_LC_MAP: LcMap = { 3: 30, 4.5: 75, 7: 90 }

function toApca(req: Require, lcMap: LcMap): Require {
  if (req.metric !== 'wcag') return req
  const targetLc = lcMap[req.target]
  if (targetLc === undefined) throw new Error(`apca profile: no Lc mapping for wcag target ${req.target}`)
  return { metric: 'apca', against: req.against, targetLc }
}

// The cta/on-fill enforcement bar — DECOUPLED from the 4.5 text slot. OWNER SPEC (2026-07-10,
// typo-corrected same day): apca = ink-12 Lc 90 · ink-11 Lc 75 · ON-CTA Lc 60; wcag = ink-12 7:1 ·
// ink-11 4.5 · on-cta 4.5. The map slots carry the inks; this constant carries on-cta. wcag lane
// unaffected (returns the spec unchanged above).
export const CTA_ONFILL_ENFORCE_LC = 60

export function withProfile(spec: ModeSpec, profile: ContrastProfile, lcMap: LcMap = DEFAULT_APCA_LC_MAP): ModeSpec {
  if (profile === 'wcag') return spec
  return {
    ...spec,
    stops: spec.stops.map((s): StopReq => (s.require ? { ...s, require: toApca(s.require, lcMap) } : s)),
    ons: {
      ...spec.ons,
      onFill: { ...spec.ons.onFill, enforceLc: CTA_ONFILL_ENFORCE_LC },
      // the apca law is the Lc bar (band placement + the highlight-audit gate), not the ratio —
      // strip the wcag conformance floor so the pole stays purely perceptual. enforceLc 60 = APCA's
      // body-text bar for the highlight fill (the highlight-audit's HL_BODY; declared here so the dark
      // delta placement can respect it — the band-order floor could land hl9 in the mid dead zone).
      onHighlight: { ...spec.ons.onHighlight, ratioFloor: undefined, enforceLc: 60 },
    },
  }
}
