// secondary-audit.ts — THE SECONDARY GATE (SECONDARY-PLAN §7). Agnostic primary×secondary sweep
// through resolveTheme; for every theme, the INVARIANT: the resolved secondary either CLEARS every
// effective signal (light AND dark) or was DEMOTED to subtle with an annotation — never a silent
// hue-family collision. "Collides" = the TYPE-1 gate (checkHueCollision at the annotation
// qualifier — CATALOG C7 split; the resolver's notes fire on the same test). Both contrast
// profiles. Also checks: the primary is byte-untouched by theme resolution; subtle scales are
// valid; the derived posture resolves.
import { resolveBrand, resolveTheme, signalScalesFor } from '../src/engine/resolve'
import { SIGNALS } from '../src/engine/signals'
import { checkHueCollision, SECONDARY_NOTE_MIN_V } from '../src/engine/collision'
import { ARCHETYPES } from '../src/engine/archetypes'
import { oklchToLinearRgb } from '../src/engine/constraints'
import type { ContrastProfile, GeneratedScale } from '../src/engine/colorEngine'

const enc = (c: number) => { c = Math.max(0, Math.min(1, c)); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055 }
const hx = (L: number, C: number, H: number) => '#' + oklchToLinearRgb(L, C, H).map(c => Math.round(enc(c) * 255).toString(16).padStart(2, '0')).join('')

// primaries chosen to exercise the machinery: neutral-ish blue, red-band (C12 solve), green-forcing,
// info-forcing, gold. secondaries = agnostic 24-hue × 2-chroma sweep.
const PRIMARIES = [hx(0.62, 0.13, 250), hx(0.55, 0.19, 29), hx(0.62, 0.17, 150), hx(0.55, 0.18, 285), hx(0.7, 0.14, 85)]
const SEC_HUES = Array.from({ length: 24 }, (_, i) => i * 15)
const SEC_CHROMAS = [0.08, 0.17]

type Fail = { theme: string; check: string; detail: string }
const fails: Fail[] = []
let themes = 0, closeAdvice = 0, residuals = 0, exactAdvice = 0

const clearsAll = (scale: GeneratedScale, effective: (n: typeof SIGNALS[number]['name']) => GeneratedScale) =>
  SIGNALS.every(def =>
    !checkHueCollision(scale, effective(def.name), def, { minV: SECONDARY_NOTE_MIN_V }).collides)

for (const profile of ['wcag', 'apca'] as ContrastProfile[]) {
  const cp = profile === 'apca' ? profile : undefined
  for (const pHex of PRIMARIES) for (const H of SEC_HUES) for (const C of SEC_CHROMAS) {
    const sHex = hx(0.62, C, H)
    const id = `${profile} p${pHex} s${sHex}`
    themes++
    // LANE 1 — a SUPPLIED secondary with no style = CUSTOM (owner 2026-07-12 strike: derived
    // or custom, nothing else). Invariant: the hex ships as a standard hands-off ramp and
    // every signal collision is annotated — never silent, never a reshape.
    const t = resolveTheme({ primaryHex: pHex, secondaryHex: sHex, contrastProfile: cp })
    const ref = resolveBrand(pHex, 'brand', { contrastProfile: cp })
    const sec = t.secondary!

    // 1. the primary is EXACTLY resolveBrand's output (theme resolution never touches it)
    if (JSON.stringify(t.primary.scale) !== JSON.stringify(ref.scale))
      fails.push({ theme: id, check: 'primary-untouched', detail: 'primary scale differs from resolveBrand' })

    const effective = (n: typeof SIGNALS[number]['name']) =>
      t.signalOverrides.find(o => o.name === n)?.scale ?? signalScalesFor(cp).get(n)!.scale
    if (sec.style !== 'exact' || sec.level !== 'standard')
      fails.push({ theme: id, check: 'supplied-is-custom', detail: `style ${sec.style} level ${sec.level} for a supplied hex` })
    if (!clearsAll(sec.scale, effective)) {
      residuals++
      if (!sec.notes.some(n => n.includes('reads close to the')))
        fails.push({ theme: id, check: 'custom-residual-silent', detail: 'custom secondary collides with no annotation' })
    }
    if (t.notes.some(n => n.includes('close to the primary'))) closeAdvice++

    // LANE 1b — the 'default' style on a SUPPLIED hex = CUSTOM (owner 2026-07-29, superseding
    // the 2026-07-12 "same model as derived" unification): "the id is preserved as is, but the
    // cta is generated as if it was a tint of the given hex". Invariants, and they are the
    // MODEL rather than a note-text spot check:
    //   i.   the shape is still the default model's (style 'default', subtle, never demoted)
    //   ii.  the RAMP is byte-identical to the exact posture's — the user's colour is preserved
    //        across every stop, papers through inks. This is the guard that catches a
    //        regression back to transforming the whole ramp.
    //   iii. the CTA is NOT the exact posture's — it is the tint, and it must actually differ,
    //        or the posture has silently collapsed into exact.
    //   iv.  cta-ink is NOT tinted (owner ruling): it stays the own ramp's, matching ink-9/10.
    const tf = resolveTheme({ primaryHex: pHex, secondaryHex: sHex, secondaryStyle: 'default', contrastProfile: cp })
    const secF = tf.secondary!
    const secX = resolveTheme({ primaryHex: pHex, secondaryHex: sHex, secondaryStyle: 'exact', contrastProfile: cp }).secondary!
    if (secF.style !== 'default' || secF.level !== 'subtle' || secF.demoted || secF.derived)
      fails.push({ theme: id, check: 'from-brand-shape', detail: `style ${secF.style} level ${secF.level} demoted ${secF.demoted} derived ${secF.derived}` })
    if (!secF.notes.some(n => n.includes('the cta is a tint of it')))
      fails.push({ theme: id, check: 'custom-note', detail: 'custom secondary missing its model note' })
    for (const mode of ['light', 'dark'] as const) {
      if (JSON.stringify(secF.scale[mode]) !== JSON.stringify(secX.scale[mode]))
        fails.push({ theme: id, check: 'custom-ramp-preserved', detail: `${mode} ramp differs from the exact posture — the transform reached past the cta` })
    }
    if (JSON.stringify(secF.scale.cta) === JSON.stringify(secX.scale.cta))
      fails.push({ theme: id, check: 'custom-cta-tinted', detail: 'custom cta equals the exact cta — the tint did not apply' })
    if (JSON.stringify(secF.scale.ctaInk) !== JSON.stringify(secX.scale.ctaInk))
      fails.push({ theme: id, check: 'custom-ctaink-untinted', detail: 'cta-ink was tinted; it must stay the user colour (matches ink-9/10)' })

    // LANE 2 — the EXACT style (the owner model: standard IS exact — user's color ships as a
    // full ramp, hands off): the invariant is ADVICE — every signal collision must be annotated,
    // never silently absent and never a reshape.
    const ts = resolveTheme({ primaryHex: pHex, secondaryHex: sHex, secondaryStyle: 'exact', contrastProfile: cp })
    const secS = ts.secondary!
    const effectiveS = (n: typeof SIGNALS[number]['name']) =>
      ts.signalOverrides.find(o => o.name === n)?.scale ?? signalScalesFor(cp).get(n)!.scale
    if (secS.style !== 'exact' || secS.level !== 'standard')
      fails.push({ theme: id, check: 'exact-shape', detail: `style ${secS.style} level ${secS.level}` })
    if (secS.demoted)
      fails.push({ theme: id, check: 'exact-untouched', detail: 'exact secondary was reshaped' })
    for (const def of SIGNALS) {
      const h = checkHueCollision(secS.scale, effectiveS(def.name), def, { minV: SECONDARY_NOTE_MIN_V })
      if (h.collides) {
        exactAdvice++
        if (!secS.notes.some(n => n.includes(`the ${def.name} signal`)))
          fails.push({ theme: id, check: 'exact-advice-silent', detail: `${def.name} collision without an advice note` })
      }
    }

    // LANE 3 — the SIX ANCHORS, newly exposed for the secondary (owner 2026-07-29). They ride
    // the EXACT posture, because what an anchor does is PLACE THE CTA and custom's tint already
    // owns the cta (owner ruling: the anchor replaces Custom, it does not stack on it).
    // Sampled (every 90° at the low chroma) to keep the gate quick. Invariants:
    //   i.   resolveTheme THREADS the anchor — the resolved scale is what a direct resolveBrand
    //        with the same archetypeOverride produces. This is the whole of the change.
    //   ii.  the anchor is what the scale reports, so annotations and the plugin agree with it.
    //   iii. THE NO-OP GUARD: the anchored cta must land INSIDE the anchor's band. Three cuts to
    //        get here. The first asserted only threading and ramp-preservation, both of which
    //        stay true when the anchor does nothing at all — exactly the bug it shipped past
    //        (anchors were wired onto the custom posture, where the tint overwrote them). The
    //        second asserted "cta differs from un-anchored", which false-positives on a seed
    //        whose own L already sits at a median, where a no-op IS the right answer. The third
    //        asserted the cta lands ON the median — true until exact mode got its on-fill
    //        enforcement back, after which LEGIBILITY legitimately nudges the cta off the median
    //        (vivid 0.573 vs 0.60). Band containment is the anchor's actual promise: it says
    //        which band the button sits in, and the label requirement outranks the exact centre.
    if (C === SEC_CHROMAS[0] && H % 90 === 0) {
      const seen: Array<{ anchor: string; L: number; key: string }> = []
      for (const a of ARCHETYPES) {
        const anchor = a.name
        const tA = resolveTheme({ primaryHex: pHex, secondaryHex: sHex, secondaryStyle: 'exact', secondaryArchetype: anchor, contrastProfile: cp })
        const direct = resolveBrand(sHex, 'secondary', { contrastProfile: cp, exact: true, skipCollisionRules: true, archetypeOverride: anchor })
        if (JSON.stringify(tA.secondary!.scale) !== JSON.stringify(direct.scale))
          fails.push({ theme: id, check: 'anchor-threaded', detail: `${anchor}: resolveTheme output differs from resolveBrand with the same override` })
        if (tA.secondary!.scale.archetype !== anchor)
          fails.push({ theme: id, check: 'anchor-reported', detail: `${anchor}: scale reports ${tA.secondary!.scale.archetype}` })
        const cta = tA.secondary!.scale.cta
        if (cta.L < a.min - 1e-6 || cta.L > a.max + 1e-6)
          fails.push({ theme: id, check: 'anchor-lands-in-band', detail: `${anchor}: cta L ${cta.L.toFixed(4)} outside the band [${a.min}, ${a.max}]` })
        seen.push({ anchor, L: cta.L, key: JSON.stringify(cta) })
      }
      if (new Set(seen.map(s => s.key)).size !== seen.length)
        fails.push({ theme: id, check: 'anchor-distinct', detail: `the six anchors did not produce six distinct ctas: ${seen.map(s => `${s.anchor} L${s.L.toFixed(2)}`).join(' ')}` })
    }

    // 4. validity: every emitted stop is a real color. clampChromaToGamut tolerates ±1e-4 in
    //    LINEAR rgb ≈ ±1.3e-3 gamma-encoded (the space ColorStop carries) — true of ALL production
    //    scales; every emitter clamps at emit. Gate tolerance = 2e-3 encoded.
    for (const st of [...sec.scale.light, ...sec.scale.dark,
      sec.scale.cta, sec.scale.ctaPressed, sec.scale.ctaDark, sec.scale.ctaPressedDark,
      sec.scale.ctaInk, sec.scale.ctaInkPressed, sec.scale.ctaInkDark, sec.scale.ctaInkPressedDark])
      if (![st.r, st.g, st.b].every(v => v >= -2e-3 && v <= 1 + 2e-3 && Number.isFinite(v)))
        fails.push({ theme: id, check: 'rgb', detail: `secondary stop ${st.stop} out of range` })
  }

  // 5. the derived posture (§2b): resolves for every primary, always subtle, never demoted,
  //    and ALWAYS the 'default' seed-transform model (owner 2026-07-12) — even when
  //    a style leaks in from a lingering chip state
  for (const pHex of PRIMARIES) {
    const t = resolveTheme({ primaryHex: pHex, deriveSecondary: true, secondaryStyle: 'tint', contrastProfile: cp })
    if (!t.secondary || !t.secondary.derived || t.secondary.level !== 'subtle' || t.secondary.demoted || t.secondary.style !== 'default')
      fails.push({ theme: `${profile} derived p${pHex}`, check: 'derived', detail: 'derived secondary malformed' })
  }
}

console.log(`=== secondary-audit: ${themes} themes resolved (both profiles) ===`)
console.log(`custom lane (supplied hex, no style): hands-off ramps · annotated residuals: ${residuals} · close-to-primary advice: ${closeAdvice}`)
console.log(`exact lane: hands-off ramps · annotated collision advice: ${exactAdvice}`)
console.log(`failures: ${fails.length}`)
const byCheck: Record<string, number> = {}
for (const f of fails) byCheck[f.check] = (byCheck[f.check] ?? 0) + 1
for (const [k, n] of Object.entries(byCheck)) console.log(`  ${k}: ${n}`)
if (fails.length) fails.slice(0, 12).forEach(f => console.log(`  [${f.check}] ${f.theme}: ${f.detail}`))
console.log(fails.length === 0 ? '\nGATE: PASS' : '\nGATE: FAIL')
