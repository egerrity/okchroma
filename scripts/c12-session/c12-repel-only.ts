// @ts-nocheck — SESSION ARCHIVE (0.18-era instrument): calls the pre-v5 repelCtaL(…, target, up)
// signature deleted from producers.ts. Kept verbatim for the record; do not run against the live tree.
// c12-repel-only.ts — CONDENSED review page: ONLY the value-repel candidate (owner ask).
// Per seed: one light row + one dark row — repelled cta beside canonical red, dE + move printed.
// Candidate rendered by the exhibit driving engine fns (buildContext/cAt) — NOT wired yet;
// the wiring declares the require on the cta role in both mode specs.
// Rule: exit red's cta register in the seed's own nearest direction (light; dark composes with
// the prominence floor -> up), existing cta formula (chroma rides, hue constant), target dE 0.18.
import { writeFileSync, mkdirSync } from 'fs'
import { resolveBrand, signalScalesFor } from '/Users/emilygerrity/okchroma/src/engine/resolve'
import { type ContrastProfile, type GeneratedScale } from '/Users/emilygerrity/okchroma/src/engine/colorEngine'
import { buildContext, buildDarkContext, onFillIsWhiteDarkAt, repelCtaL, whiteTextLcAt } from '/Users/emilygerrity/okchroma/src/reqtoken/producers'
import { darkChromaCurve } from '/Users/emilygerrity/okchroma/src/engine/darkChromaCurve'
import { DARK_BRAND_FILL_MIN_L } from '/Users/emilygerrity/okchroma/src/engine/stopTable'
import { stopDeltaE } from '/Users/emilygerrity/okchroma/src/engine/collision'
import { clampChromaToGamut, oklchToLinearRgb, apcaY, apcaLc, encodedChannels } from '/Users/emilygerrity/okchroma/src/engine/constraints'
import { hexToOklch } from '/Users/emilygerrity/okchroma/src/engine/colorMath'
import { stopHex } from '/Users/emilygerrity/okchroma/src/engine/cssRender'

const TARGET = 0.18
const hx = (L: number, C: number, H: number) => {
  const c = clampChromaToGamut(L, C, H)
  const [rl, gl, bl] = oklchToLinearRgb(L, c, H)
  const gm = (v: number) => { const x = Math.min(1, Math.max(0, v)); return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055 }
  const ch = (v: number) => Math.round(gm(v) * 255).toString(16).padStart(2, '0')
  return `#${ch(rl)}${ch(gl)}${ch(bl)}`
}
// pole via the ENGINE's on-text judge (raw |Lc| argmax flips white at the L~0.72 crossover
// — owner-caught on the dusty pink; the engine's flip logic says black there)
const pole = (L: number, C: number, H: number) => onFillIsWhiteDarkAt(L, C, H, false)

const SEEDS = [
  { hex: '#e1642d', tag: 'H42 C.17 L.65' },
  { hex: '#cc7552', tag: 'H42 C.12 L.65 dusty' },
  { hex: '#e0661f', tag: 'H46 C.17 L.65' },
  { hex: '#bd4600', tag: 'H46 C.17 L.55 below register' },
  { hex: '#de6907', tag: 'H50 C.17 L.65' },
  { hex: '#ed8b51', tag: 'H50 C.14 L.73 above register' },
  { hex: '#db6c00', tag: 'H55 C.17 L.65' },
  { hex: '#d77000', tag: 'H60 C.17 L.65 band tail' },
  { hex: '#e05a83', tag: 'H4 C.17 L.65 magenta' },
  { hex: '#e15a7b', tag: 'H8 C.17 L.65 magenta' },
  { hex: '#cc6e81', tag: 'H8 C.12 L.65 dusty pink' },
  { hex: '#f18093', tag: 'H10 C.14 L.73 light pink' },
  { hex: '#c03a4f', tag: 'H16 C.17 L.55 wine' },
  { hex: '#d76961', tag: 'H26 C.14 L.65' },
]

// THE TRILEMMA PAGE (owner 2026-07-10): distance 0.18 · text pole >= Lc60 · identity — pick two.
// LIGHT rows: A = shelf (wired; guarantee holds, converges pastel) · B = approved look
// (differentiated L~0.74 exits, text Lc ~55-58 sub-bar) · C = deep exit (down past red;
// white text clears, identity stays warm). DARK is binary (floor blocks down): A shown.
const TRI = (hex: string, profile: ContrastProfile | undefined, red: GeneratedScale) => {
  const o = hexToOklch(hex)
  const r = resolveBrand(hex, 'seed', { contrastProfile: profile })
  const ctx = buildContext(hex, { contrastProfile: profile })
  const cFor = (L: number) => ctx.cAt('light', L, ctx.brandC)
  const mk = (L: number | null) => {
    const LL = L ?? o.L
    const C = clampChromaToGamut(LL, cFor(LL), ctx.brandH)
    return { L: LL, C, H: ctx.brandH, hex: hx(LL, C, ctx.brandH), white: onFillIsWhiteDarkAt(LL, C, ctx.brandH, false) }
  }
  const b = mk(repelCtaL(o.L, cFor, ctx.brandH, red.cta as any, TARGET, o.L >= red.cta.L))
  const c = mk(repelCtaL(o.L, cFor, ctx.brandH, red.cta as any, TARGET, false))
  const aT = adaptiveT(cFor, ctx.brandH, red.cta)
  const ra = mk(repelCtaL(o.L, cFor, ctx.brandH, red.cta as any, aT, o.L >= red.cta.L))
  return {
    Rt: aT,
    R: { hex: ra.hex, white: ra.white, dE: stopDeltaE(ra as any, red.cta), move: ra.L - o.L },
    A: { hex: stopHex(r.scale.cta), white: r.scale.onFillTextIsWhite, dE: stopDeltaE(r.scale.cta, red.cta), move: r.redRepel?.light ? r.scale.cta.L - o.L : 0 },
    B: { hex: b.hex, white: b.white, dE: stopDeltaE(b as any, red.cta), move: b.L - o.L },
    C: { hex: c.hex, white: c.white, dE: stopDeltaE(c as any, red.cta), move: c.L - o.L },
  }
}
// ADAPTIVE (owner rule candidate 2026-07-10): per brand, T = min(0.18, dE@white-boundary - 0.005),
// floored 0.10 — exit as far as the brand's own white-land allows; the declared text bar decides.
const adaptiveT = (cFor: (L: number) => number, H: number, redCta: any) => {
  let lo = 0.3, hi = 0.95
  for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; whiteTextLcAt(m, cFor(m), H) >= 60 ? (lo = m) : (hi = m) }
  const ceil = stopDeltaE({ L: lo, C: clampChromaToGamut(lo, cFor(lo), H), H } as any, redCta)
  return Math.max(0.10, Math.min(TARGET, ceil - 0.005))
}
// dark tightest: up from the enforced base to 0.10 (never enters the zone — lands <= white boundary)
const repelDarkAdapt = (hex: string, profile: ContrastProfile | undefined, red: GeneratedScale) => {
  const ctx = buildContext(hex, { contrastProfile: profile, darkFillMinL: DARK_BRAND_FILL_MIN_L, enforceOnFillContrast: true, coolRedDark: true, darkChromaCurve, highlight: true })
  const d = buildDarkContext(ctx)
  const cFor = (L: number) => ctx.cAt('dark', L, d.darkC9)
  const u = resolveBrand(hex, 'seed', { contrastProfile: profile, skipCollisionRules: true })
  const aT = adaptiveT(cFor, ctx.darkH, red.ctaDark)
  const rl = repelCtaL(u.scale.ctaDark.L, cFor, ctx.darkH, red.ctaDark as any, aT, true)
  const LL = rl ?? u.scale.ctaDark.L
  const C = clampChromaToGamut(LL, cFor(LL), ctx.darkH)
  return { t: aT, hex: hx(LL, C, ctx.darkH), white: onFillIsWhiteDarkAt(LL, C, ctx.darkH, false), dE: stopDeltaE({ L: LL, C, H: ctx.darkH } as any, red.ctaDark), move: LL - u.scale.ctaDark.L }
}
const repelDarkUpAt = (hex: string, profile: ContrastProfile | undefined, red: GeneratedScale, target: number) => {
  const ctx = buildContext(hex, { contrastProfile: profile, darkFillMinL: DARK_BRAND_FILL_MIN_L, enforceOnFillContrast: true, coolRedDark: true, darkChromaCurve, highlight: true })
  const d = buildDarkContext(ctx)
  const cFor = (L: number) => ctx.cAt('dark', L, d.darkC9)
  const u = resolveBrand(hex, 'seed', { contrastProfile: profile, skipCollisionRules: true })
  const rl = repelCtaL(u.scale.ctaDark.L, cFor, ctx.darkH, red.ctaDark as any, target, true)
  const LL = rl ?? u.scale.ctaDark.L
  const C = clampChromaToGamut(LL, cFor(LL), ctx.darkH)
  return { hex: hx(LL, C, ctx.darkH), white: onFillIsWhiteDarkAt(LL, C, ctx.darkH, false), dE: stopDeltaE({ L: LL, C, H: ctx.darkH } as any, red.ctaDark), move: LL - u.scale.ctaDark.L }
}
const repelDark = (hex: string, profile: ContrastProfile | undefined, red: GeneratedScale) => {
  const u = resolveBrand(hex, 'seed', { contrastProfile: profile, skipCollisionRules: true })
  const r = resolveBrand(hex, 'seed', { contrastProfile: profile })
  return { hex: stopHex(r.scale.ctaDark), white: r.scale.onFillTextIsWhiteDark, dE: stopDeltaE(r.scale.ctaDark, red.ctaDark), move: r.scale.ctaDark.L - u.scale.ctaDark.L }
}
// D: dark deep exit — the prominence floor YIELDS to the repel (colliding brands only)
const repelDarkDeep = (hex: string, profile: ContrastProfile | undefined, red: GeneratedScale) => {
  const ctx = buildContext(hex, { contrastProfile: profile, darkFillMinL: DARK_BRAND_FILL_MIN_L, enforceOnFillContrast: true, coolRedDark: true, darkChromaCurve, highlight: true })
  const d = buildDarkContext(ctx)
  const cFor = (L: number) => ctx.cAt('dark', L, d.darkC9)
  const u = resolveBrand(hex, 'seed', { contrastProfile: profile, skipCollisionRules: true })
  const rl = repelCtaL(u.scale.ctaDark.L, cFor, ctx.darkH, red.ctaDark as any, TARGET, false)
  if (rl === null) return null
  const C = clampChromaToGamut(rl, cFor(rl), ctx.darkH)
  return { hex: hx(rl, C, ctx.darkH), white: onFillIsWhiteDarkAt(rl, C, ctx.darkH, false), dE: stopDeltaE({ L: rl, C, H: ctx.darkH } as any, red.ctaDark), move: rl - u.scale.ctaDark.L }
}

const btn = (bg: string, w: boolean, label: string) => `<div class="btn" style="background:${bg};color:${w ? '#fff' : '#000'}">${label}</div>`

const blocks: string[] = []
for (const [laneLabel, profile] of [['apca (shipped default)', 'apca'], ['wcag', undefined]] as Array<[string, ContrastProfile | undefined]>) {
  const red = signalScalesFor(profile).get('red')!.scale
  const L: string[] = [], D: string[] = []
  for (const { hex, tag } of SEEDS) {
    const t = TRI(hex, profile, red)
    const rd = repelDark(hex, profile, red)
    const rowH = (k: string, v: any) => `<div class="opt"><div class="olabel">${k} ${v.move === 0 ? 'stays' : (v.move > 0 ? '+' : '') + v.move.toFixed(2) + 'L'}<br>ΔE ${v.dE.toFixed(3)}</div>${btn(v.hex, v.white, 'Primary action')}${btn(stopHex(red.cta), red.onFillTextIsWhite, 'Delete')}</div>`
    L.push(`<div class="group"><div class="ghead"><span class="chip" style="background:${hex}"></span><b>${hex}</b> <span class="seed">${tag}</span></div><div class="rcol">${rowH('A shelf', t.A)}${rowH('B look', t.B)}${rowH('C deep', t.C)}${rowH(`R adapt .${Math.round((t as any).Rt * 1000)}`, (t as any).R)}</div></div>`)
    const dd = repelDarkDeep(hex, profile, red)
    const db = repelDarkUpAt(hex, profile, red, TARGET)
    const da = repelDarkAdapt(hex, profile, red)
    D.push(`<div class="group"><div class="ghead">&nbsp;</div><div class="rcol">
    <div class="opt dark"><div class="olabel">A shelf ${rd.move === 0 ? 'stays' : (rd.move > 0 ? '+' : '') + rd.move.toFixed(2) + 'L'}<br>ΔE ${rd.dE.toFixed(3)}</div>${btn(rd.hex, rd.white, 'Primary action')}${btn(stopHex(red.ctaDark), red.onFillTextIsWhiteDark, 'Delete')}</div><div class="opt dark"><div class="olabel">B look ${db.move >= 0 ? '+' : ''}${db.move.toFixed(2)}L<br>ΔE ${db.dE.toFixed(3)}</div>${btn(db.hex, db.white, 'Primary action')}${btn(stopHex(red.ctaDark), red.onFillTextIsWhiteDark, 'Delete')}</div><div class="opt dark"><div class="olabel">C deep ${dd ? dd.move.toFixed(2) + 'L' : 'n/a'}<br>ΔE ${dd ? dd.dE.toFixed(3) : '—'}</div>${dd ? btn(dd.hex, dd.white, 'Primary action') : ''}${dd ? btn(stopHex(red.ctaDark), red.onFillTextIsWhiteDark, 'Delete') : ''}</div><div class="opt dark"><div class="olabel">R adapt .${Math.round(da.t * 1000)} ${da.move >= 0 ? '+' : ''}${da.move.toFixed(2)}L<br>ΔE ${da.dE.toFixed(3)}</div>${btn(da.hex, da.white, 'Primary action')}${btn(stopHex(red.ctaDark), red.onFillTextIsWhiteDark, 'Delete')}</div></div></div>`)
  }
  blocks.push(`<h2>${laneLabel}</h2><div class="cols"><div class="col light"><div class="colhead">light</div>${L.join('\n')}</div><div class="col darkbg"><div class="colhead">dark</div>${D.join('\n')}</div></div>`)
}

const html = `<!doctype html><meta charset="utf-8"><title>C12 — repel only</title>
<style>
  body { font: 14px/1.5 -apple-system, sans-serif; margin:0; background:#8a8783; }
  .note { padding:.9rem 1.4rem; background:#f2f0ec; color:#222; font-size:.88rem; }
  h2 { margin:1rem 1.4rem .4rem; font-size:.95rem; color:#f2f0ec; }
  .cols { display:flex; }
  .col { flex:1; padding:1rem 1.2rem 2rem; min-width:0; }
  .col.light { background:#faf9f7; color:#1a1a1a; }
  .col.darkbg { background:#111110; color:#e8e6e1; }
  .colhead { font-size:.72rem; letter-spacing:.06em; text-transform:uppercase; opacity:.6; margin-bottom:.6rem; }
  .group { margin-bottom:.7rem; }
  .ghead { display:flex; align-items:center; gap:.45rem; font-size:.8rem; margin-bottom:.25rem; height:1.4em; }
  .ghead .seed { opacity:.55; font-size:.72rem; }
  .chip { width:15px; height:15px; border-radius:4px; }
  .rcol { display:flex; flex-direction:column; gap:.4rem; }
  .opt { padding:.5rem .7rem; border-radius:8px; background:#fff; display:flex; gap:.5rem; align-items:center; }
  .opt.dark { background:#1c1c1a; }
  .olabel { font-size:.63rem; text-transform:uppercase; letter-spacing:.04em; opacity:.6; width:64px; }
  .col.darkbg .olabel { color:#e8e6e1; }
  .btn { padding:.45rem 1rem; border-radius:999px; font-weight:700; font-size:.8rem; }
</style>
<div class="note"><b>C12 — the value repel, alone.</b> Per seed: the repelled cta beside canonical red, light and dark.
Rule: exit red's register in the seed's own direction (dark: floor blocks down → up), existing cta formula, hue constant, ΔE 0.18.
THE TRILEMMA — distance 0.18 · text ≥ Lc60 · identity: pick two. <b>A shelf</b> = wired now (guarantee, pastel convergence) · <b>B look</b> = differentiated L~0.74 exits, text Lc ~55-58 · <b>C deep</b> = exit down past red (white text clears, warm identity; above-register seeds cross red). Rows aligned per seed, both columns: <b>A shelf</b> · <b>B look</b> · <b>C deep</b> (dark: floor yields) · <b>R adapt</b> (per-brand ceiling target).</div>
${blocks.join('\n')}`

mkdirSync('/Users/emilygerrity/okchroma/render', { recursive: true })
writeFileSync('/Users/emilygerrity/okchroma/render/c12-repel-only.html', html)
console.log('written -> render/c12-repel-only.html')
