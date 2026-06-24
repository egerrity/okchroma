// Canonical signal color definitions. Signals run through the same
// generateScale pipeline as brands — stop 9 anchors to the canonical hex,
// everything else derives. This keeps signal ramps on the same luminance
// ladder as brand ramps, and makes brand↔signal collision detection a
// comparison between two generated scales.
//
// Tolerances are the room each signal has to move during collision
// resolution (rung 2 of the escalation ladder): hueShift is how far the
// signal may slide away from a colliding brand before it stops reading as
// itself. Red shifts warm only (toward vermillion H~45) — cooling it
// approaches pink/magenta and weakens severity.

export interface SignalDef {
  name: 'red' | 'yellow' | 'green' | 'info-color'
  hex: string
  // OKLCH of hex, for reference and collision math: stop-9 target
  L: number
  C: number
  H: number
  // degrees of acceptable hue shift during collision resolution
  hueShift: { cool: number; warm: number }
  // Max preventive shear applied to brands near this signal's hue.
  // Principle: signals own the warm, urgent register — brands yield away
  // from them. Yellow's shear is gentler than red's because yellow
  // brands have little gamut room to move within. Green and info-color don't
  // shear brands (info-color is cool by nature; green TBD).
  brandShearMaxDeg: number
  // Signals are alerts — their subtle tier (stops 1–8) runs hotter chroma
  // than a brand ramp would. 1.0 = no boost (info already reads right).
  subtleChromaBoost: number
  // Extra whole-ramp chroma applied when this signal yields (hue-shifts):
  // the cool-shifted lemon warning washes out without it.
  yieldChromaScale: number
  // Dark-mode fill level (stop 9). Without distinct levels three of the
  // four signals resolved within 0.02 L of each other (grayscale
  // check) — the ladder is deliberate: red deepest at the 0.63 default
  // (white text, severity register), info-color 0.70 (black text), green 0.75
  // (black text), yellow naturally at 0.854.
  darkFillMinL?: number
}

export const SIGNALS: SignalDef[] = [
  // #E54D2E — vivid vermillion red
  { name: 'red',        hex: '#E54D2E', L: 0.627, C: 0.194, H: 33.3, hueShift: { cool: 0,  warm: 15 }, brandShearMaxDeg: 10, subtleChromaBoost: 1.2,  yieldChromaScale: 1 },
  // #FFC53D — bright amber (black on-fill text).
  // Yellow inverts the warm principle: the brand keeps
  // the warm gold register and YELLOW flees cool toward caution-tape
  // lemon — orange-shifted yellow read "too orange" and shearing the
  // brand was too noticeable in the sensitive yellow band. warm: 0 (never
  // toward orange). Cool cap 23 = coolest acceptable yellow,
  // HSL(58,100%,69%) = #FFFA61 = oklch H 107.3. NB the reference is also
  // much lighter (L 0.961 vs canonical 0.854) — the yielded lemon's
  // dullness is mostly lightness, hence the bright/light anchor question.
  { name: 'yellow',     hex: '#FFC53D', L: 0.854, C: 0.157, H: 84.1, hueShift: { cool: 23, warm: 0 }, brandShearMaxDeg: 0, subtleChromaBoost: 1.45, yieldChromaScale: 1.15 },
  // #46A758 — bright-leaning green; dark fill brightens to 0.75 (black text)
  { name: 'green',      hex: '#46A758', L: 0.651, C: 0.147, H: 147.4, hueShift: { cool: 15, warm: 10 }, brandShearMaxDeg: 0, subtleChromaBoost: 1.3,  yieldChromaScale: 1, darkFillMinL: 0.75 },
  // #6E56CF — vivid violet (closest to right as-is — no boost);
  // dark fill lifts to 0.70 so black text works
  { name: 'info-color', hex: '#6E56CF', L: 0.542, C: 0.179, H: 288.0, hueShift: { cool: 15, warm: 15 }, brandShearMaxDeg: 0, subtleChromaBoost: 1.0,  yieldChromaScale: 1, darkFillMinL: 0.70 },
]
