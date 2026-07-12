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

    // LANE 1b — the 'default' style on a SUPPLIED hex = FROM BRAND (owner 2026-07-12): the
    // user's color through the SAME model as the derived posture. Invariant: the shape is the
    // default model's (style 'default', subtle, never demoted) — their pick is the seed, not
    // the shipped ramp.
    const tf = resolveTheme({ primaryHex: pHex, secondaryHex: sHex, secondaryStyle: 'default', contrastProfile: cp })
    const secF = tf.secondary!
    if (secF.style !== 'default' || secF.level !== 'subtle' || secF.demoted || secF.derived)
      fails.push({ theme: id, check: 'from-brand-shape', detail: `style ${secF.style} level ${secF.level} demoted ${secF.demoted} derived ${secF.derived}` })
    if (!secF.notes.some(n => n.includes('derived from your color')))
      fails.push({ theme: id, check: 'from-brand-note', detail: 'from-brand secondary missing its model note' })

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

    // 4. validity: every emitted stop is a real color. clampChromaToGamut tolerates ±1e-4 in
    //    LINEAR rgb ≈ ±1.3e-3 gamma-encoded (the space ColorStop carries) — true of ALL production
    //    scales; every emitter clamps at emit. Gate tolerance = 2e-3 encoded.
    for (const st of [...sec.scale.light, ...sec.scale.dark, sec.scale.cta, sec.scale.ctaDark])
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
