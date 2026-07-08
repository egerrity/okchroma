// p3-parity-dump.ts — byte-identity harness for the Phase-A gamut parameterization
// (P3-DESIGN.md §4A). Dumps the COMPLETE emitted output — themeToFigma JSON (hex +
// components for every token) and the brandCss/neutralCss/signalsCss strings — for an
// agnostic seed grid under both profiles, plus derived-secondary and exact postures.
// Run before and after an engine change and byte-compare:
//   esbuild scripts/p3-parity-dump.ts --bundle --platform=node --outfile=dist/p3-parity-dump.js
//   node dist/p3-parity-dump.js dist/parity-before.json   (at the base commit)
//   node dist/p3-parity-dump.js dist/parity-after.json    (with the change applied)
//   cmp dist/parity-before.json dist/parity-after.json
// Successor to the deleted scripts/engine-parity.ts (8b79504) for gamut work.
import { writeFileSync } from 'fs'
import { resolveTheme, signalScalesFor } from '../src/engine/resolve'
import { themeToFigma } from '../src/engine/figmaRender'
import { brandCss, neutralCss, signalsCss } from '../src/engine/cssRender'
import { SIGNALS } from '../src/engine/signals'
import { clampChromaToGamut } from '../src/engine/constraints'
import { oklchToSrgbUnclamped } from '../src/engine/colorMath'
import type { ContrastProfile } from '../src/engine/colorEngine'

function seedHex(L: number, C: number, H: number): string {
  const c = clampChromaToGamut(L, C, H) * 0.999
  const { r, g, b } = oklchToSrgbUnclamped(L, c, H)
  const q = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')
  return `#${q(r)}${q(g)}${q(b)}`
}

const out: Record<string, unknown> = {}
const HS = Array.from({ length: 36 }, (_, i) => i * 10)

for (const profile of [undefined, 'apca'] as Array<ContrastProfile | undefined>) {
  const pKey = profile ?? 'wcag'
  const sigScales = signalScalesFor(profile)
  for (const H of HS) {
    for (const [L, C] of [[0.55, 0.13], [0.40, 0.18]] as Array<[number, number]>) {
      const hex = seedHex(L, C, H)
      // every third hue exercises the derived secondary; every ninth the exact posture
      const t = resolveTheme({
        primaryHex: hex, name: 'parity', contrastProfile: profile,
        deriveSecondary: H % 30 === 0, exact: H % 90 === 0 || undefined,
      })
      const signals = SIGNALS.map(s => {
        const o = t.signalOverrides.find(x => x.name === s.name)
        return { name: s.name, scale: o?.scale ?? sigScales.get(s.name)!.scale }
      })
      const key = `${pKey}:${hex}:L${L}C${C}`
      out[`${key}:figma`] = themeToFigma(t.themed, {
        secondary: t.secondary?.scale ?? null,
        secondaryStyle: t.secondary?.style,
        neutralLevel: 'default',
        signals,
        contrastProfile: profile,
      })
      out[`${key}:css`] = brandCss('parity', 'Parity', t.themed, t.secondary?.scale ?? null, '', 'default', profile, t.secondary?.style)
    }
  }
  out[`${pKey}:neutralCss`] = neutralCss(':root', 250, 'default', profile)
  out[`${pKey}:signalsCss`] = signalsCss(profile)
}

const target = process.argv[2] ?? 'dist/parity-dump.json'
const json = JSON.stringify(out)
writeFileSync(target, json)
console.log(`written → ${target} (${(json.length / 1024).toFixed(0)} KB, ${Object.keys(out).length} entries)`)
