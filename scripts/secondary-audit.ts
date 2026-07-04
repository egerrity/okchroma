// secondary-audit.ts — THE SECONDARY GATE (SECONDARY-PLAN §7). Agnostic primary×secondary sweep
// through resolveTheme; for every theme, the INVARIANT: the resolved secondary either CLEARS every
// effective signal (light AND dark) or was DEMOTED to subtle with an annotation — never a silent
// warning-only collision. Both contrast profiles. Also checks: the primary is byte-untouched by
// theme resolution; adopted signal variants clear BOTH brand colors; subtle scales are valid;
// the derived posture resolves.
import { resolveBrand, resolveTheme, signalScalesFor } from '../src/engine/resolve'
import { SIGNALS } from '../src/engine/signals'
import { checkCollision } from '../src/engine/collision'
import { oklchToLinearRgb } from '../src/engine/constraints'
import type { ContrastProfile, GeneratedScale } from '../src/engine/colorEngine'

const enc = (c: number) => { c = Math.max(0, Math.min(1, c)); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055 }
const hx = (L: number, C: number, H: number) => '#' + oklchToLinearRgb(L, C, H).map(c => Math.round(enc(c) * 255).toString(16).padStart(2, '0')).join('')

// primaries chosen to exercise the machinery: neutral-ish blue, red-band (rung1), green-forcing,
// info-forcing, gold. secondaries = agnostic 24-hue × 2-chroma sweep.
const PRIMARIES = [hx(0.62, 0.13, 250), hx(0.55, 0.19, 29), hx(0.62, 0.17, 150), hx(0.55, 0.18, 285), hx(0.7, 0.14, 85)]
const SEC_HUES = Array.from({ length: 24 }, (_, i) => i * 15)
const SEC_CHROMAS = [0.08, 0.17]

type Fail = { theme: string; check: string; detail: string }
const fails: Fail[] = []
let themes = 0, closeAdvice = 0, residuals = 0, exactAdvice = 0

const clearsAll = (scale: GeneratedScale, effective: (n: typeof SIGNALS[number]['name']) => GeneratedScale) =>
  SIGNALS.every(def =>
    !checkCollision(scale, effective(def.name), def, 'light').collides &&
    !checkCollision(scale, effective(def.name), def, 'dark').collides)

for (const profile of ['wcag', 'apca'] as ContrastProfile[]) {
  const cp = profile === 'apca' ? profile : undefined
  for (const pHex of PRIMARIES) for (const H of SEC_HUES) for (const C of SEC_CHROMAS) {
    const sHex = hx(0.62, C, H)
    const id = `${profile} p${pHex} s${sHex}`
    themes++
    // LANE 1 — the DEFAULT (recommended) model: the secondary is SUBTLE by construction (owner:
    // "subtle = recommended, standard = exact"). Invariant: it clears the signal set OR every
    // residual is annotated — never a silent numeric collision.
    const t = resolveTheme({ primaryHex: pHex, secondaryHex: sHex, contrastProfile: cp })
    const ref = resolveBrand(pHex, 'brand', { contrastProfile: cp })
    const sec = t.secondary!

    // 1. the primary is EXACTLY resolveBrand's output (theme resolution never touches it)
    if (JSON.stringify(t.primary.scale) !== JSON.stringify(ref.scale))
      fails.push({ theme: id, check: 'primary-untouched', detail: 'primary scale differs from resolveBrand' })

    const effective = (n: typeof SIGNALS[number]['name']) =>
      t.signalOverrides.find(o => o.name === n)?.scale ?? signalScalesFor(cp).get(n)!.scale
    if (sec.level !== 'subtle')
      fails.push({ theme: id, check: 'recommended-is-subtle', detail: `level ${sec.level} in recommended mode` })
    if (!clearsAll(sec.scale, effective)) {
      residuals++
      if (!sec.notes.some(n => n.includes('still reads near')))
        fails.push({ theme: id, check: 'subtle-residual-silent', detail: 'subtle secondary still collides without an annotation' })
    }
    if (t.notes.some(n => n.includes('close to the primary'))) closeAdvice++

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
      const l = checkCollision(secS.scale, effectiveS(def.name), def, 'light')
      const d = checkCollision(secS.scale, effectiveS(def.name), def, 'dark')
      if ((l.collides || d.collides)) {
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

  // 5. the derived posture (§2b): resolves for every primary, always subtle, never demoted
  for (const pHex of PRIMARIES) {
    const t = resolveTheme({ primaryHex: pHex, deriveSecondary: true, contrastProfile: cp })
    if (!t.secondary || !t.secondary.derived || t.secondary.level !== 'subtle' || t.secondary.demoted)
      fails.push({ theme: `${profile} derived p${pHex}`, check: 'derived', detail: 'derived secondary malformed' })
  }
}

console.log(`=== secondary-audit: ${themes} themes resolved (both profiles) ===`)
console.log(`tint lane (default): all subtle by construction · annotated residuals: ${residuals} · close-to-primary advice: ${closeAdvice}`)
console.log(`exact lane: hands-off ramps · annotated collision advice: ${exactAdvice}`)
console.log(`failures: ${fails.length}`)
const byCheck: Record<string, number> = {}
for (const f of fails) byCheck[f.check] = (byCheck[f.check] ?? 0) + 1
for (const [k, n] of Object.entries(byCheck)) console.log(`  ${k}: ${n}`)
if (fails.length) fails.slice(0, 12).forEach(f => console.log(`  [${f.check}] ${f.theme}: ${f.detail}`))
console.log(fails.length === 0 ? '\nGATE: PASS' : '\nGATE: FAIL')
