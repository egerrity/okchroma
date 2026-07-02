// reqtoken-portability.ts — the PORTABILITY gate. Proves the requirement declaration survives a DTCG
// round-trip as the LIVE source of truth:
//   1. round-trip fidelity: emit → JSON → parse → re-resolve is bit-identical to direct resolution
//      (all 12 scale stops + the off-scale cta/cta-hover roles + the on-color booleans)
//   2. $value fallback validity: every frozen fallback equals the resolved color at emit time
//   3. the requirement is LIVE: editing a target in the JSON changes the re-resolved output (and meets it)
//   4. fail-loud: a corrupted bundle throws, never silently falls back
import { resolveRamp } from '../src/reqtoken/resolve'
import { emitDtcgRamp, resolveDtcgRamp, parseToken, EXT_KEY, type DtcgRampGroup, type DtcgRequirementToken } from '../src/reqtoken/dtcg'
import { wcagY, contrastRatio } from '../src/engine/constraints'

const SEEDS = ['#3060c0', '#c03a2b', '#c8a018', '#2a9d5c', '#8a8a8a']  // blue, red, yellow, green, near-gray
let pass = 0, fail = 0
const check = (name: string, ok: boolean, detail = '') => {
  ok ? pass++ : fail++
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`)
}

for (const hex of SEEDS) for (const mode of ['light', 'dark'] as const) {
  const label = `${hex} ${mode}`
  const direct = resolveRamp(hex, mode)

  // emit → serialize to JSON text → parse (a REAL serialization boundary, not object identity)
  const group = emitDtcgRamp(hex, mode, `brand-${mode}`)
  const json = JSON.stringify(group, null, 2)
  const parsed: DtcgRampGroup = JSON.parse(json)

  // 1. round-trip fidelity: stops + roles + ons
  const rt = resolveDtcgRamp(parsed)
  const stopsOk = rt.stops.every((s, i) => s.hex === direct.stops[i].hex)
  const rolesOk = rt.roles.cta.hex === direct.roles.cta.hex && rt.roles.ctaHover.hex === direct.roles.ctaHover.hex
  const onsOk = rt.ons.onFillIsWhite === direct.ons.onFillIsWhite && rt.ons.onHighlightIsWhite === direct.ons.onHighlightIsWhite
  check(`${label} round-trip bit-identical`, stopsOk && rolesOk && onsOk,
    stopsOk && rolesOk && onsOk ? '' : `stops:${stopsOk} roles:${rolesOk} ons:${onsOk}`)

  // 2. $value fallback = resolved value at emit time (stops + roles)
  const fallbacksOk =
    direct.stops.every(s => (parsed[String(s.stop)] as DtcgRequirementToken).$value.hex === s.hex) &&
    (parsed['cta'] as DtcgRequirementToken).$value.hex === direct.roles.cta.hex &&
    (parsed['cta-hover'] as DtcgRequirementToken).$value.hex === direct.roles.ctaHover.hex
  check(`${label} $value fallbacks frozen-correct`, fallbacksOk)
}

// 3. the requirement is LIVE: raise light stop-8's target 3.0 → 4.5 in the JSON, re-resolve, output changes + complies
{
  const hex = '#3060c0'
  const group: DtcgRampGroup = JSON.parse(JSON.stringify(emitDtcgRamp(hex, 'light', 'brand-light')))
  const t8 = group['8'] as DtcgRequirementToken
  const before = resolveDtcgRamp(group)
  ;(t8.$extensions[EXT_KEY] as any).require = { metric: 'wcag', against: 'paper-2', target: 4.5, level: 'AA' }
  const after = resolveDtcgRamp(group)
  const s8 = after.stops.find(s => s.stop === 8)!, p2 = after.stops.find(s => s.stop === 2)!
  const got = contrastRatio(wcagY(s8.L, s8.C, s8.H), wcagY(p2.L, p2.C, p2.H))
  check('edited requirement changes output', s8.hex !== before.stops.find(s => s.stop === 8)!.hex, `stop-8 → ${s8.hex}`)
  check('edited requirement is honored', got >= 4.5 - 1e-3, `contrast ${got.toFixed(2)} vs edited target 4.5`)
}

// 4. fail-loud on corruption
{
  const group: DtcgRampGroup = JSON.parse(JSON.stringify(emitDtcgRamp('#3060c0', 'light', 'brand-light')))
  const t3 = group['3'] as DtcgRequirementToken
  delete (t3.$extensions[EXT_KEY] as any).rootL
  let threw = false
  try { parseToken(t3) } catch { threw = true }
  check('corrupted stop bundle throws (no silent fallback)', threw)
  const cta = group['cta'] as DtcgRequirementToken
  delete (cta.$extensions[EXT_KEY] as any).floorL
  let threwRole = false
  try { parseToken(cta) } catch { threwRole = true }
  check('corrupted role bundle throws', threwRole)
  const t4 = group['4'] as DtcgRequirementToken
  t4.$extensions[EXT_KEY].resolver = 'someone-elses-resolver@9'
  let threw2 = false
  try { parseToken(t4) } catch { threw2 = true }
  check('foreign resolver id rejected', threw2)
}

// show one emitted token so the artifact shape is reviewable
const sample = emitDtcgRamp('#3060c0', 'light', 'brand-light')['cta']
console.log('\n=== sample emitted cta ROLE token (off-scale — no stop number) ===')
console.log(JSON.stringify(sample, null, 2))

console.log(`\n=== portability spike: ${pass} pass, ${fail} fail ===`)
console.log(fail === 0 ? 'SPIKE: PASS' : 'SPIKE: FAIL')
