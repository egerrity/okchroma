// c12-wired-check.ts — the wired engine vs the approved proposal, on representative seeds
// (REAL resolveBrand — no mirror). Verifies each class behaves as the exhibit showed.
import { resolveBrand, signalScalesFor } from '/Users/emilygerrity/okchroma/src/engine/resolve'
import { redGateDist, RED_GATE } from '/Users/emilygerrity/okchroma/src/engine/colorMath'
import { p2Diff } from '/Users/emilygerrity/okchroma/src/engine/p2'
import type { ContrastProfile } from '/Users/emilygerrity/okchroma/src/engine/colorEngine'

const seeds: Array<[string, string]> = [
  ['bright true red (red-move)', '#cc2631'],
  ['deep true red (red-move)', '#a90011'],
  ['vivid orange L0.6 (red-move, lHi band)', '#e6300f'],
  ['dusty warm (self-up)', '#ac5346'],
  ['pink vivid (self-up)', '#dc5b92'],
  ['light pink C6 band (quirk fix)', '#ff757a'],
  ['blue (untouched)', '#2255cc'],
]
for (const profile of ['apca', 'wcag'] as ContrastProfile[]) {
  const red = signalScalesFor(profile).get('red')!.scale
  console.log(`== ${profile} · canonical red cta L${red.cta.L.toFixed(3)}`)
  for (const [label, hex] of seeds) {
    const r = resolveBrand(hex, 'chk', { contrastProfile: profile })
    const rv = r.signalOverrides.find(o => o.name === 'red')
    const eff = rv?.scale ?? red
    const gd = redGateDist(r.scale.cta, eff.cta)
    const p2 = p2Diff(r.scale.cta, eff.cta)
    const gdD = redGateDist(r.scale.ctaDark, red.ctaDark)
    console.log(`  ${label} ${hex}: cta L${r.scale.cta.L.toFixed(3)} ${r.redRepel?.light ? 'SELF-EXIT' : rv ? `RED-MOVE (${rv.note})` : 'untouched'} · vs effective red: gate ${gd.toFixed(3)} p2 ${p2.toFixed(3)} · dark gate ${gdD.toFixed(3)}${gd < RED_GATE.G ? ' ** INSIDE' : ''}${gdD < RED_GATE.G ? ' ** DARK INSIDE' : ''}`)
  }
}
