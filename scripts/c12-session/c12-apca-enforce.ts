// c12-apca-enforce.ts — the apca on-cta clearance exhibit (owner 2026-07-11, opened by her
// #E93D82 eyedropper catch: white read Lc 58 on an external checker). THREE wired pieces:
//   1. FIRE MARGIN (APCA_ENFORCE_MARGIN_LC 2): the enforce fires under 60+2 and solves past
//      it — no cta ships at the Lc-60.0 razor an external toolchain reads as 58.
//   2. POLE-SYMMETRIC ENFORCE: black under-reads → LIGHTEN (the missing solver — the judge
//      always picked the better pole, but better-of-two-failing isn't passing; Lc 54.7
//      greens shipped). Both apca enforcers + both solve poleOks now honor the margin.
//   3. F GATE HARD: dark-audit F = chosen-pole Lc ≥ 60 on the cta, both modes, shipped lane,
//      exit-1 (was: report-only Lc 45 — a headline floor, never a text bar).
// Sweep: 384-cta agnostic apca grid — 222 in the razor band/under before, 0 under 62 after.
// This page: BEFORE (branch tip 858053e) vs AFTER, light rows on light ground, dark rows on
// dark ground, chosen pole rendered, Lc labels. Interplay rows flagged (near-red landings
// rose with the margined poleOk; text flips white→black where fills brightened).
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { clampChromaToGamut, oklchToLinearRgb } from '/Users/emilygerrity/okchroma/src/engine/constraints'

const SP = '/private/tmp/claude-501/-Users-emilygerrity-okchroma/ebd31ad1-e60f-4409-bafd-b31c7e4ee31e/scratchpad'
const before: any[] = JSON.parse(readFileSync(`${SP}/before.json`, 'utf8'))
const after: any[] = JSON.parse(readFileSync(`${SP}/after.json`, 'utf8'))
const hx = (r: any) => {
  const c = clampChromaToGamut(r.L, r.C, r.H)
  const [rl, gl, bl] = oklchToLinearRgb(r.L, c, r.H)
  const gm = (v: number) => { const x = Math.min(1, Math.max(0, v)); return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055 }
  const ch = (v: number) => Math.round(gm(v) * 255).toString(16).padStart(2, '0')
  return `#${ch(rl)}${ch(gl)}${ch(bl)}`
}
const key = (r: any) => `${r.hex}|${r.mode}`
const bMap = new Map(before.map(r => [key(r), r]))

const section = (mode: 'light' | 'dark') => {
  const rows = after.filter(r => r.mode === mode).map(a => {
    const b: any = bMap.get(key(a))
    const moved = Math.abs(a.L - b.L) > 0.004 || a.white !== b.white
    const btn = (r: any, title: string) => `<div class="cell"><div class="clab">${title} · L${r.L.toFixed(2)} · Lc ${r.lc}${r.lc < 60 ? ' ✗' : ''}</div>
<div class="btn" style="background:${hx(r)};color:${r.white ? '#fff' : '#000'}">Primary cta</div></div>`
    return `<div class="row ${moved ? '' : 'same'}"><div class="rid"><div class="idsw" style="background:${a.hex}"></div>
<div class="rmeta"><b>${a.hex}</b> ${a.label}<br>${moved ? `Lc ${b.lc} → <b>${a.lc}</b>${a.white !== b.white ? ` · text ${b.white ? 'white→black' : 'black→white'}` : ''}` : 'unchanged'}</div></div>
<div class="cells">${btn(b, 'BEFORE')}${btn(a, 'AFTER')}</div></div>`
  })
  return rows.join('')
}

const html = `<!doctype html><meta charset="utf-8"><title>C12 — apca on-cta clearance</title>
<style>
  body { font: 14px/1.5 -apple-system, sans-serif; margin:0; background:#faf9f7; color:#1a1a1a; }
  .note { padding:.9rem 1.4rem; background:#f2f0ec; font-size:.86rem; }
  .sect { padding:.5rem 1.4rem; font-weight:700; font-size:.8rem; letter-spacing:.04em; text-transform:uppercase; opacity:.6; }
  .row { display:flex; gap:1.4rem; align-items:center; padding:.55rem 1.4rem; border-bottom:1px solid #e7e4de; }
  .row.same { opacity:.42; }
  .dark-sect { background:#141416; color:#e8e8e8; }
  .dark-sect .row { border-bottom:1px solid #26262b; }
  .rid { display:flex; gap:.6rem; align-items:center; width:300px; flex:0 0 300px; }
  .idsw { width:40px; height:40px; flex:0 0 40px; border-radius:6px; }
  .rmeta { font-size:.72rem; opacity:.85; }
  .cells { display:flex; gap:1.8rem; }
  .cell { display:flex; flex-direction:column; align-items:center; gap:.25rem; }
  .clab { font-size:.6rem; text-transform:uppercase; letter-spacing:.03em; opacity:.55; }
  .btn { width:120px; height:46px; border-radius:23px; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:.8rem; }
</style>
<div class="note"><b>C12 — the apca on-cta clearance: fire margin (60+2) + the missing lighten-for-black solve + F gate hard at Lc 60.</b><br>
Opened by your #E93D82 catch (white read 58 on your checker — we shipped at exactly 60.0-60.2, zero headroom). Every cta now ships its chosen pole at Lc ≥ 62 internal;
the dead-zone fills (greens at black 54.7) lift until black clears. Agnostic sweep: 222/384 razor-or-under → 0. Greyed rows = unchanged.
Interplay: near-red apca landings ride the same margin so a few sit brighter with black text now; dark near-red movers repositioned (all p2-clear vs red, ≥0.117).</div>
<div class="sect">LIGHT — apca lane</div>${section('light')}
<div class="sect dark-sect" style="padding-top:.9rem">DARK — apca lane</div>
<div class="dark-sect">${section('dark')}</div>`

mkdirSync('/Users/emilygerrity/okchroma/render', { recursive: true })
writeFileSync('/Users/emilygerrity/okchroma/render/c12-apca-enforce.html', html)
console.log('written -> render/c12-apca-enforce.html')
