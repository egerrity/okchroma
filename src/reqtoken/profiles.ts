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
//     scale reads only Lc ≈ 24–29 at the scaffold, and Lc 45 would force dark stop-8 to L ≈ 0.69. That
//     used to be "past the hand-placed highlight-9 (0.600) — a structural break"; highlight-9 is gone
//     (2026-07-29) so the break is no longer the argument, but the scaffold reading stands on its own.
//   4.5 → Lc 75 (ink-9) — APCA's body-text minimum. The cta/on-fill enforcement no longer rides
//     this slot: the owner's declared contract (2026-07-10) is on-cta Lc 60 — APCA's large-text bar;
//     cta labels are button text, not body copy — set via CTA_ONFILL_ENFORCE_LC below. Side effects
//     she accepted: enforcement-bound warm/pink ctas release lighter, dark ctas enforce less.
//   7 → Lc 90 (ink-10) — APCA's preferred-body value; the scale already reads ≈ 90+.
export type LcMap = Record<number, number>
export const DEFAULT_APCA_LC_MAP: LcMap = { 3: 30, 4.5: 75, 7: 90 }

function toApca(req: Require, lcMap: LcMap): Require {
  if (req.metric !== 'wcag') return req
  const targetLc = lcMap[req.target]
  if (targetLc === undefined) throw new Error(`apca profile: no Lc mapping for wcag target ${req.target}`)
  return { metric: 'apca', against: req.against, targetLc }
}

// The cta/on-fill enforcement bar — DECOUPLED from the 4.5 text slot. OWNER SPEC (2026-07-10,
// typo-corrected same day): apca = the 7:1 ink Lc 90 · the 4.5 ink Lc 75 · ON-CTA Lc 60; wcag =
// 7:1 · 4.5 · on-cta 4.5. (Those inks are ink-10 / ink-9 since the 2026-07-29 renumber.) The map
// slots carry the inks; this constant carries on-cta. wcag lane unaffected (returns the spec
// unchanged above).
export const CTA_ONFILL_ENFORCE_LC = 60

// C42 (owner 2026-08-02): critical's clearance carve-out. The signal group's law is the
// spec's coEnforceLc (65) — critical alone rides this lower bar (Lc 50): its identity cannot
// survive the higher bars (the 60-ladder lightened coral out of red). Threaded per-call via
// opts.apcaClearanceLc; also the red complement's zone-gate bar (engine/resolve.ts).
export const CRITICAL_CLEARANCE_LC = 50

export function withProfile(spec: ModeSpec, profile: ContrastProfile, lcMap: LcMap = DEFAULT_APCA_LC_MAP): ModeSpec {
  if (profile === 'wcag') return spec
  return {
    ...spec,
    // (The stop-9 CARVE-OUT is gone with the stop, owner 2026-07-29. It existed because
    // highlight-9's require was a fill-vs-its-own-plane bar with no honest slot in a map
    // of TEXT bars — 3 → 30 non-text, 4.5 → 75 body, 7 → 90 — so the apca lane kept its
    // own hl-9 placement instead. Today's stop 9 is an INK stop: 4.5 is a text bar, the
    // 75 slot is its correct translation, and it maps like every other require.)
    stops: spec.stops.map((s): StopReq => (s.require ? { ...s, require: toApca(s.require, lcMap) } : s)),
    ons: {
      ...spec.ons,
      // the ratio floor is STRIPPED here, as spec.ts always documented it would be — the apca
      // law is the Lc bar. Until onFill gained a floor (2026-07-29) there was nothing to strip,
      // so the promise had never been implemented.
      onFill: { ...spec.ons.onFill, enforceLc: CTA_ONFILL_ENFORCE_LC, ratioFloor: undefined },
    },
  }
}
