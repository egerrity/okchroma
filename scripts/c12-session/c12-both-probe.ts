// c12-both-probe.ts — her BOTH-move category anchors (2026-07-10): #FF7300 … #FF0000 … #FF006F
// ("move brand AND red"). What do they share? OKLCH + vividness (C vs gamut max) + fire/class
// under the wired engine, plus interpolants along the saturated sRGB edge between her anchors.
import { resolveBrand, signalScalesFor } from '/Users/emilygerrity/okchroma/src/engine/resolve'
import { hexToOklch, maxChromaAt, redGateDist, RED_GATE, inRedKeepBox } from '/Users/emilygerrity/okchroma/src/engine/colorMath'
import { p2Diff } from '/Users/emilygerrity/okchroma/src/engine/p2'
import type { ContrastProfile } from '/Users/emilygerrity/okchroma/src/engine/colorEngine'

const EDGE = [
  '#FF7300', '#FF5C00', '#FF4500', '#FF2E00', '#FF1700', '#FF0000',
  '#FF0017', '#FF002E', '#FF0045', '#FF005C', '#FF006F',
]
console.log('hex · OKLCH · C/maxC (vividness) · inKeepBox · fired? class (apca)')
const red = signalScalesFor('apca').get('red')!.scale
for (const hex of EDGE) {
  const o = hexToOklch(hex)
  const vivid = o.C / maxChromaAt(o.L, o.H)
  const box = inRedKeepBox(o.L, o.C, o.H)
  const r = resolveBrand(hex, 'p', { contrastProfile: 'apca' })
  const rv = r.signalOverrides.find(x => x.name === 'red')
  const cls = r.redRepel?.light ? 'self-exit' : rv ? `red-move (${rv.note})` : 'no-fire/untouched'
  const gd = redGateDist(r.scale.cta, (rv?.scale ?? red).cta)
  console.log(`${hex}: L${o.L.toFixed(3)} C${o.C.toFixed(3)} H${o.H.toFixed(1)} · vivid ${vivid.toFixed(2)} · box ${box} · ${cls} · final gate ${gd.toFixed(3)} p2 ${p2Diff(r.scale.cta, (rv?.scale ?? red).cta).toFixed(3)}`)
}
// wcag lane quick pass
console.log('\nwcag classes:')
for (const hex of ['#FF7300', '#FF0000', '#FF006F']) {
  const r = resolveBrand(hex, 'p', { contrastProfile: 'wcag' })
  const rv = r.signalOverrides.find(x => x.name === 'red')
  console.log(`  ${hex}: ${r.redRepel?.light ? 'self-exit' : rv ? `red-move (${rv.note})` : 'no-fire/untouched'}`)
}
