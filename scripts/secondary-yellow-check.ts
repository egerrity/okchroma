// secondary-yellow-check.ts — the wobble-fix verification page (owner 2026-07-12: "I would
// need to see that it's no longer doing that in yellow"). Her two cases + true yellows,
// BEFORE (the wobbly shipped f635c4e, captured from a pinned worktree) vs AFTER (the fix).
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { clampChromaToGamut, oklchToLinearRgb } from '/Users/emilygerrity/okchroma/src/engine/constraints'
import { resolveBrand } from '/Users/emilygerrity/okchroma/src/engine/resolve'
const SP = '/private/tmp/claude-501/-Users-emilygerrity-okchroma/ebd31ad1-e60f-4409-bafd-b31c7e4ee31e/scratchpad'
const before: any = JSON.parse(readFileSync(`${SP}/yellow-before.json`, 'utf8'))
const after: any = JSON.parse(readFileSync(`${SP}/yellow-after.json`, 'utf8'))
const hx = (c: any) => {
  const cc = clampChromaToGamut(c.L, c.C, c.H)
  const [rl, gl, bl] = oklchToLinearRgb(c.L, cc, c.H)
  const gm = (v: number) => { const x = Math.min(1, Math.max(0, v)); return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055 }
  const ch = (v: number) => Math.round(gm(v) * 255).toString(16).padStart(2, '0')
  return `#${ch(rl)}${ch(gl)}${ch(bl)}`
}
const LABEL: Record<string,string> = {
  '#E7EA3E|derived|derived': 'HER CASE 1 — #E7EA3E primary, derived secondary (vibrant)',
  '#E7EA3E|#EABC3E|vibrant': 'HER CASE 2 — #EABC3E vibrant (primary #E7EA3E)',
  '#3B82F6|#F5D90A|vibrant': '#F5D90A bright yellow · vibrant',
  '#3B82F6|#FFE100|vibrant': '#FFE100 pure yellow · vibrant',
  '#3B82F6|#EABC3E|vibrant': '#EABC3E gold · vibrant',
  '#3B82F6|#F5D90A|muted': '#F5D90A bright yellow · muted (unchanged — control)',
}
const card = (d: any, title: string, dim = false) => {
  const at = (n: number) => d.light[n - 1]
  const ink11 = hx(at(11)), ink10 = hx(at(10)), hl9 = hx(at(9)), wash3 = hx(at(3))
  const paper1 = hx(at(1))   // owner: the papers are what caught the wobble — cards sit ON paper-1
  const strip = d.light.map((st: any) => `<div class="chip" style="background:${hx(st)}"></div>`).join('')
  return `<div class="card${dim ? ' dim' : ''}" style="background:${paper1}"><div class="ctitle">${title}</div>
<div class="h" style="color:${ink11}">Aa Heading</div>
<div class="b" style="color:${ink10}">Body copy in the ink register.</div>
<div class="btn" style="background:${hx(d.cta)};color:${d.onW ? '#fff' : ink11}">cta-1 button</div>
<div class="insets"><div class="inset" style="background:${wash3};color:${ink10}">wash inset</div>
<div class="inset" style="background:${hl9};color:${hx(at(1))}">highlight inset</div></div>
<div class="strip">${strip}</div></div>`
}
// the PRIMARY application of the same hex — her parity reference (owner ask 2026-07-12)
const primaryCardData = (hex: string) => {
  const b: any = resolveBrand(hex, 'p', { contrastProfile: 'apca' }).scale
  const pick = (c: any) => ({ L: c.L, C: c.C, H: c.H })
  return { light: b.light.map(pick), cta: pick(b.cta), onW: b.onFillTextIsWhite }
}
const rows = Object.keys(LABEL).map(k => {
  const secHex = k.split('|')[1] === 'derived' ? k.split('|')[0] : k.split('|')[1]
  return `<div class="row"><div class="rlab">${LABEL[k]}</div>
<div class="cards">${card(primaryCardData(secHex), `PRIMARY application · ${secHex}`)}${card(before[k], 'BEFORE (the wobble)', true)}${card(after[k], 'AFTER (fixed)')}</div></div>`
}).join('')
const html = `<!doctype html><meta charset="utf-8"><title>Yellow wobble — before/after</title>
<style>
  body { font: 14px/1.5 -apple-system, sans-serif; margin:0; background:#faf9f7; color:#1a1a1a; }
  .note { padding:.9rem 1.4rem; background:#f2f0ec; font-size:.86rem; }
  .row { padding:.8rem 1.4rem; border-bottom:1px solid #e7e4de; }
  .rlab { font-weight:700; font-size:.82rem; margin-bottom:.5rem; }
  .cards { display:flex; gap:1rem; flex-wrap:wrap; }
  .card { width:300px; border:1px solid #e7e4de; border-radius:12px; padding:.8rem; }
  .card.dim { opacity:.75; }
  .ctitle { font-size:.62rem; text-transform:uppercase; letter-spacing:.04em; opacity:.6; margin-bottom:.4rem; }
  .h { font-weight:800; font-size:1.1rem; }
  .b { font-size:.76rem; margin:.15rem 0 .5rem; }
  .btn { display:inline-flex; padding:.45rem .9rem; border-radius:18px; font-weight:700; font-size:.78rem; margin-bottom:.5rem; }
  .insets { display:flex; gap:.4rem; margin-bottom:.5rem; }
  .inset { flex:1; border-radius:8px; padding:.45rem .5rem; font-size:.68rem; }
  .strip { display:flex; gap:2px; }
  .chip { flex:1; height:26px; border-radius:4px; }
</style>
<div class="note"><b>Yellow wobble — BEFORE (shipped f635c4e, from a pinned worktree) vs AFTER (the boost-arc + vividness-ceiling fix).</b>
Light mode, APCA. Her two cases first, then true yellows; the muted control row is byte-identical (muted was never affected).</div>
${rows}`
mkdirSync('/Users/emilygerrity/okchroma/render', { recursive: true })
writeFileSync('/Users/emilygerrity/okchroma/render/secondary-yellow-check.html', html)
console.log('written -> render/secondary-yellow-check.html')
