// secondary-audit.ts: THE SECONDARY GATE. Agnostic primary×secondary sweep through
// resolveTheme; for every theme, the INVARIANT: the resolved secondary CLEARS every effective
// signal, or the signal was adopted for it, or the collision is ANNOTATED. It is never a
// silent hue-family collision and never a reshape of the secondary itself. "Collides" = the
// TYPE-1 gate (checkHueCollision at the annotation qualifier, CATALOG C7; it reads the light
// AND the dark chalks, and the resolver's notes fire on the same test). Both contrast
// profiles. Also checks: the primary is byte-untouched by theme resolution; every emitted
// stop is a real color; an anchor places the cta; the derived posture resolves. The verdict
// is printed and the exit code does not move (CATALOG C79).
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

// the SECONDARY-COLLIDER law (C45): a collision against the effective set is satisfied by
// EITHER an advice note OR a secondary-driven signal adoption. The merge marks its
// adoptions with the "(for the secondary)" note suffix, and a within-band remedy (the
// lemon) can never pass a hue-distance test, so adopted signals are excluded from the
// collision sweep exactly as the engine excludes them from the note pass.
const adoptedFor = (t: { signalOverrides: Array<{ name: string; note: string }> }) =>
  new Set(t.signalOverrides.filter(o => o.note.endsWith('(for the secondary)')).map(o => o.name))
const clearsAll = (scale: GeneratedScale, effective: (n: typeof SIGNALS[number]['name']) => GeneratedScale, adopted: Set<string>) =>
  SIGNALS.every(def =>
    adopted.has(def.name)
    || !checkHueCollision(scale, effective(def.name), def, { minV: SECONDARY_NOTE_MIN_V }).collides)

for (const profile of ['wcag', 'apca'] as ContrastProfile[]) {
  const cp = profile === 'apca' ? profile : undefined
  for (const pHex of PRIMARIES) for (const H of SEC_HUES) for (const C of SEC_CHROMAS) {
    const sHex = hx(0.62, C, H)
    const id = `${profile} p${pHex} s${sHex}`
    themes++
    // LANE 1: a SUPPLIED secondary with no style resolves to the EXACT posture. Invariant:
    // the hex ships as a standard hands-off ramp and every signal collision is REMEDIED (a
    // secondary-driven signal variant) or ANNOTATED. It is never silent, and never a
    // reshape of the secondary itself.
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
    if (!clearsAll(sec.scale, effective, adoptedFor(t))) {
      residuals++
      if (!sec.notes.some(n => n.includes('reads close to the')))
        fails.push({ theme: id, check: 'custom-residual-silent', detail: 'custom secondary collides with no annotation' })
    }
    if (t.notes.some(n => n.includes('close to the primary'))) closeAdvice++

    // LANE 1b: the 'default' style on a SUPPLIED hex = CUSTOM (C36): the ramp keeps the hex
    // and the cta is generated as a tint of it. Invariants, and they are the MODEL rather
    // than a note-text spot check:
    //   i.   the shape is the default model's (style 'default', subtle, never demoted)
    //   ii.  the RAMP is byte-identical to the exact posture's: the user's colour is
    //        preserved across every stop, papers through pens, so the text register is
    //        the hex's own. This is the guard that catches a transform of the whole ramp.
    //   iii. the CTA is NOT the exact posture's: it is the tint, and it must actually
    //        differ, or the posture has silently collapsed into exact.
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

    // LANE 2: the EXACT style passed explicitly (level 'standard': the user's color ships
    // as a full ramp, hands off). It resolves the same theme as lane 1. The invariant is
    // ADVICE: every signal collision must be annotated, never silently absent and never a
    // reshape.
    const ts = resolveTheme({ primaryHex: pHex, secondaryHex: sHex, secondaryStyle: 'exact', contrastProfile: cp })
    const secS = ts.secondary!
    const effectiveS = (n: typeof SIGNALS[number]['name']) =>
      ts.signalOverrides.find(o => o.name === n)?.scale ?? signalScalesFor(cp).get(n)!.scale
    if (secS.style !== 'exact' || secS.level !== 'standard')
      fails.push({ theme: id, check: 'exact-shape', detail: `style ${secS.style} level ${secS.level}` })
    if (secS.demoted)
      fails.push({ theme: id, check: 'exact-untouched', detail: 'exact secondary was reshaped' })
    const adoptedS = adoptedFor(ts)
    for (const def of SIGNALS) {
      if (adoptedS.has(def.name)) continue
      const h = checkHueCollision(secS.scale, effectiveS(def.name), def, { minV: SECONDARY_NOTE_MIN_V })
      if (h.collides) {
        exactAdvice++
        if (!secS.notes.some(n => n.includes(`the ${def.name} signal`)))
          fails.push({ theme: id, check: 'exact-advice-silent', detail: `${def.name} collision without an advice note` })
      }
    }

    // LANE 3: the SIX ANCHORS on the secondary. They ride the EXACT posture, because what
    // an anchor does is PLACE THE CTA and custom's tint already owns the cta (an anchor
    // replaces Custom, it does not stack on it). Sampled (every 90° at the low chroma) to
    // keep the gate quick. Invariants:
    //   i.   resolveTheme THREADS the anchor: the resolved scale is what a direct
    //        resolveBrand with the same archetypeOverride produces.
    //   ii.  the anchor is what the scale reports, so annotations and the plugin agree
    //        with it.
    //   iii. THE NO-OP GUARD: the anchored light cta lands INSIDE the anchor's band.
    //        Threading and the report (i, ii) both stay true when the anchor does nothing
    //        at all, and a "differs from un-anchored" test fails a seed whose own L
    //        already sits at a median, where a no-op IS the right answer. Band containment
    //        is the anchor's promise: it says which band the button sits in. In the exact
    //        posture nothing moves the fill (on-fill enforcement is off), so the cta sits
    //        on the band's median; the check asserts the band.
    //   iv.  the six anchors produce six distinct ctas.
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
      sec.scale.cta, sec.scale.ctaPressed, sec.scale.ctaDark, sec.scale.ctaPressedDark])
      if (![st.r, st.g, st.b].every(v => v >= -2e-3 && v <= 1 + 2e-3 && Number.isFinite(v)))
        fails.push({ theme: id, check: 'rgb', detail: `secondary stop ${st.stop} out of range` })
  }

  // 5. the derived posture: resolves for every primary, always subtle, never demoted,
  //    and ALWAYS the 'default' seed-transform model, even when a style is passed with
  //    no hex
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
