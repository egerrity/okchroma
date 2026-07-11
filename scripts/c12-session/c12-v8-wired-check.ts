// c12-v8-wired-check.ts — MIRROR VALIDATION for the v8 joint solve (the recurring trap:
// sim-vs-pipeline drift; mirror-validate ALWAYS). The wired engine vs the owner-ACCEPTED
// 50-row exhibit (joint-solve-probe.json, "we can accept propose"):
//   · rows whose brand MOVED on the page: wired brand cta must land at the page's proposed
//     L/H (the page rendered the raw formula; the pipeline emits the same formula — byte
//     hex compare, small tolerance on L for the 0.002 travel grid).
//   · red side: wired variant (or canonical) must match the page's red position per row.
//   · rows the page kept: wired brand must be unflagged (no repel) — pipeline-normal.
import { readFileSync } from 'fs'
import { resolveBrand, signalScalesFor } from '/Users/emilygerrity/okchroma/src/engine/resolve'
import { clampChromaToGamut, oklchToLinearRgb } from '/Users/emilygerrity/okchroma/src/engine/constraints'

const probe = JSON.parse(readFileSync('/Users/emilygerrity/okchroma/scripts/c12-session/joint-solve-probe.json', 'utf8'))
const hx = (L: number, C: number, H: number) => {
  const c = clampChromaToGamut(L, C, H)
  const [rl, gl, bl] = oklchToLinearRgb(L, c, H)
  const gm = (v: number) => { const x = Math.min(1, Math.max(0, v)); return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055 }
  const ch = (v: number) => Math.round(gm(v) * 255).toString(16).padStart(2, '0')
  return `#${ch(rl)}${ch(gl)}${ch(bl)}`
}

let pass = 0, fail = 0
for (const row of probe.rows) {
  const p = row.profile === 'apca' ? 'apca' as const : undefined
  const rb = resolveBrand(row.hex, 'check', { contrastProfile: p })
  const cta = rb.scale.cta
  const ov = rb.signalOverrides.find((o: any) => o.name === 'red')
  const redCta = ov ? ov.scale.cta : signalScalesFor(p).get('red')!.scale.cta
  const errs: string[] = []

  const pageMoved = !row.aNote.startsWith('kept')
  const wiredMoved = !!rb.redRepel?.light
  if (pageMoved !== wiredMoved) errs.push(`moved mismatch: page ${pageMoved} wired ${wiredMoved}`)
  if (pageMoved && Math.abs(cta.L - row.brandL) > 0.004) errs.push(`brand L ${cta.L.toFixed(3)} != page ${row.brandL}`)
  // the fp carries the page's exact swatch hexes (redHex+brandHex[+a]) — byte compare both
  // sides on moved rows so hue/chroma (the brick diagonal) are asserted, not just L
  const pageRedHex = '#' + row.fp.slice(0, 6)
  const pageBrandHex = '#' + row.fp.slice(6, 12)
  if (pageMoved && hx(cta.L, cta.C, cta.H).toLowerCase() !== pageBrandHex.toLowerCase())
    errs.push(`brand hex ${hx(cta.L, cta.C, cta.H)} != page ${pageBrandHex}`)
  if (hx(redCta.L, redCta.C, redCta.H).toLowerCase() !== pageRedHex.toLowerCase())
    errs.push(`red hex ${hx(redCta.L, redCta.C, redCta.H)} != page ${pageRedHex}`)

  const pageRedMoved = row.bNote !== 'canonical'
  if (pageRedMoved !== !!ov) errs.push(`red-move mismatch: page ${pageRedMoved} wired ${!!ov}`)
  if (Math.abs(redCta.L - row.redL) > 0.004) errs.push(`red L ${redCta.L.toFixed(3)} != page ${row.redL}`)
  if (Math.abs(redCta.H - row.redH) > 0.6) errs.push(`red H ${redCta.H.toFixed(1)} != page ${row.redH}`)

  if (errs.length) { fail++; console.log(`FAIL ${row.profile} ${row.hex} [page: ${row.aNote} | ${row.bNote}] -> wired brand L${cta.L.toFixed(3)} ${hx(cta.L, cta.C, cta.H)}, red L${redCta.L.toFixed(3)} H${redCta.H.toFixed(1)}: ${errs.join(' · ')}`) }
  else pass++
}
console.log(`\n${pass}/${probe.rows.length} pass, ${fail} fail`)
if (fail) process.exit(1)
