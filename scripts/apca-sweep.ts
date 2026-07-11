// apca-sweep.ts — OWNER EYE-CHECK: the APCA contrast profile (the same declaration re-solved under Lc
// targets instead of WCAG ratios). The choice = the Lc MAP. Three candidates, each rendered wcag-vs-apca
// side by side in real component context (stop-8 borders/fills, stop-11 body, stop-12 heading on the
// paper-2 card), light on light / dark on dark, plus a 24-hue movement table. Writes render/apca.html.
//
// Empirical baseline (24 hue × 3 chroma, vs each ramp's own resolved paper-2):
//   light — stop 8 reads Lc ≈ 54 (3:1 clamp overshoots the Lc-45 bridge) · 11 ≈ 67–77 · 12 ≈ 92+
//   dark  — stop 8 reads Lc ≈ 24–29 (WCAG under-demands in dark polarity) · 11 ≈ 53–76 · 12 ≈ 89+
// So light barely moves under any candidate; DARK is where the profile bites.
import { writeFileSync, mkdirSync } from 'fs'
import { resolveRamp, type ResolvedRamp, type ResolvedStop } from '../src/reqtoken/resolve'
import { MODE_SPECS } from '../src/reqtoken/spec'
import { withProfile, DEFAULT_APCA_LC_MAP, type LcMap } from '../src/reqtoken/profiles'
import { apcaYAt } from '../src/reqtoken/producers'
import { oklchToLinearRgb, apcaLc, clampChromaToGamut, wcagY, contrastRatio } from '../src/engine/constraints'

const enc = (c: number) => { c = Math.max(0, Math.min(1, c)); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055 }
const hx = (L: number, C: number, H: number) => '#' + oklchToLinearRgb(L, C, H).map(c => Math.round(enc(c) * 255).toString(16).padStart(2, '0')).join('')

type Candidate = { key: string; label: string; note: string; map: LcMap }
// THE RECOMMENDATION (the shipped default of the profile) + the two variants considered and rejected.
const RECOMMENDED: Candidate = {
  key: 'recommended', label: 'recommended: 3:1→Lc 30 · 4.5→Lc 75 · 7→Lc 90', map: DEFAULT_APCA_LC_MAP,
  note: 'Each slot measured against the real resolved output: 30 = APCA solid-UI minimum (45 breaks the dark highlight band); 75 = APCA body-text minimum AND the measured equivalent of the shipped cta enforcement (WCAG 4.5-white lands at Lc≈76–78) — ctas keep their shipped look; 90 already holds.',
}
const VARIANTS: Candidate[] = [
  { key: 'text-60', label: 'variant · 4.5→Lc 60 (rejected as default)', note: 'The large-text bridge value. RELEASES ctas visibly lighter than shipped (white text reads Lc 64–71, WCAG ratio drops to ~3.3–3.9) — a design change smuggled in as a conformance swap.', map: { 3: 30, 4.5: 60, 7: 90 } },
  { key: 'nontext-45', label: 'variant · 3:1→Lc 45 (rejected as default)', note: '⚠ The text-bridge non-text value. Dark stop-8 must rise to L≈0.69 — PAST highlight-9 (0.600): adopting it means re-placing the dark highlight band.', map: { 3: 45, 4.5: 75, 7: 90 } },
]
const CANDIDATES: Candidate[] = [RECOMMENDED, ...VARIANTS]

const SEEDS: [string, string][] = [
  ['saturated green', hx(0.62, 0.17, 150)],
  ['saturated blue', hx(0.62, 0.17, 262)],
  ['yellow', hx(0.62, 0.17, 92)],
  ['red', hx(0.62, 0.17, 25)],
  ['muted warm', hx(0.62, 0.06, 60)],
  ['near-gray', hx(0.62, 0.012, 250)],
]

const by = (r: ResolvedRamp, n: number) => r.stops.find(s => s.stop === n)!
const lcVs = (st: ResolvedStop, p2: ResolvedStop) =>
  Math.abs(apcaLc(apcaYAt(st.L, clampChromaToGamut(st.L, st.C, st.H), st.H), apcaYAt(p2.L, clampChromaToGamut(p2.L, p2.C, p2.H), p2.H)))
const ratioVs = (st: ResolvedStop, p2: ResolvedStop) =>
  contrastRatio(wcagY(st.L, clampChromaToGamut(st.L, st.C, st.H), st.H), wcagY(p2.L, clampChromaToGamut(p2.L, p2.C, p2.H), p2.H))
// the on-fill pole's legibility on the resolved cta, in both metrics
const poleLc = (r: ResolvedRamp) =>
  Math.abs(apcaLc(r.ons.onFillIsWhite ? 1.0 : 0.0, apcaYAt(r.roles.cta.L, r.roles.cta.C, r.roles.cta.H)))
const poleRatio = (r: ResolvedRamp) => {
  const y = wcagY(r.roles.cta.L, r.roles.cta.C, r.roles.cta.H)
  return r.ons.onFillIsWhite ? contrastRatio(1.0, y) : contrastRatio(y, 0)
}

// one column: the ramp rendered as real components on its own paper (page = paper-1, card = paper-2).
// on-colors render as Aa ON their fills (the standing display rule): the cta button carries the on-fill
// pole, highlight-9 carries the on-highlight pole.
function column(tag: string, r: ResolvedRamp): string {
  const p1 = by(r, 1), p2 = by(r, 2), s8 = by(r, 8), s9 = by(r, 9), s10 = by(r, 10), t11 = by(r, 11), t12 = by(r, 12)
  const cta = r.roles.cta
  const onFill = r.ons.onFillIsWhite ? '#ffffff' : '#000000'
  const onHl = r.ons.onHighlightIsWhite ? '#ffffff' : '#000000'
  const chip = (s: ResolvedStop, lbl: string, warn = false, aa = '') =>
    `<div style="flex:1;text-align:center"><div style="height:22px;border-radius:4px;background:${s.hex};${warn ? 'outline:2px solid #ff5d5d;outline-offset:1px;' : ''}${aa ? `color:${aa};font-size:10px;font-weight:650;line-height:22px;` : ''}">${aa ? 'Aa' : ''}</div><div style="font-size:8.5px;opacity:.55;margin-top:2px">${lbl}</div></div>`
  // the structural flag: dark stop-8 riding past the hand-placed highlight-9 (the bridge-45 consequence)
  const broken = r.mode === 'dark' && s8.L > s9.L + 1e-6
  return `<div style="flex:1;min-width:190px">
    <div style="font-size:10px;opacity:.6;margin-bottom:4px;font-weight:650">${tag}</div>
    <div style="background:${p1.hex};border-radius:10px;padding:10px">
      <div style="background:${p2.hex};border-radius:8px;padding:10px 11px">
        <div style="color:${t12.hex};font-size:12.5px;font-weight:700;margin-bottom:3px">Heading ink-12</div>
        <div style="color:${t11.hex};font-size:10.5px;line-height:1.4;margin-bottom:8px">Body ink-11 — the quick brown fox jumps over the paper-2 card.</div>
        <div style="border:1.5px solid ${s8.hex};border-radius:5px;padding:4px 7px;color:${t11.hex};font-size:9.5px;margin-bottom:8px">input border = highlight-8</div>
        <div style="display:flex;gap:6px;align-items:center">
          <span style="display:inline-block;background:${cta.hex};color:${onFill};border-radius:6px;padding:5px 10px;font-size:10px;font-weight:650">Button Aa</span>
          <span style="width:26px;height:15px;border-radius:8px;background:${s8.hex};display:inline-block"></span>
          <span style="color:${t11.hex};font-size:9px">cta + on-cta · toggle = hl-8</span>
        </div>
      </div>
      <div style="display:flex;gap:4px;margin-top:8px">${chip(s8, '8' + (broken ? ' ⚠' : ''), broken)}${chip(s9, '9 + on-hl', false, onHl)}${chip(s10, '10')}</div>
    </div>
  </div>`
}

function annotations(w: ResolvedRamp, a: ResolvedRamp): string {
  const wp2 = by(w, 2), ap2 = by(a, 2)
  const row = (n: number) => {
    const ws = by(w, n), as = by(a, n)
    const moved = Math.abs(as.L - ws.L) > 5e-4
    return `<tr${moved ? ' style="font-weight:650"' : ' style="opacity:.55"'}><td>stop ${n}</td><td>L ${ws.L.toFixed(3)} → ${as.L.toFixed(3)}</td><td>Lc ${lcVs(ws, wp2).toFixed(1)} → ${lcVs(as, ap2).toFixed(1)}</td><td>ratio ${ratioVs(ws, wp2).toFixed(2)} → ${ratioVs(as, ap2).toFixed(2)}</td></tr>`
  }
  // the cta row measures the ON-TEXT pole on the fill (not the fill vs paper): pole-Lc / pole-ratio
  const ctaRow = () => {
    const moved = Math.abs(a.roles.cta.L - w.roles.cta.L) > 5e-4 || w.ons.onFillIsWhite !== a.ons.onFillIsWhite
    const pole = (x: ResolvedRamp) => (x.ons.onFillIsWhite ? 'w' : 'b') + (x.roles.cta.enforced ? '·enf' : '')
    return `<tr${moved ? ' style="font-weight:650"' : ' style="opacity:.55"'}><td>cta+on</td><td>L ${w.roles.cta.L.toFixed(3)} → ${a.roles.cta.L.toFixed(3)}</td><td>pole-Lc ${poleLc(w).toFixed(1)} → ${poleLc(a).toFixed(1)}</td><td>pole ${pole(w)} → ${pole(a)} · ratio ${poleRatio(w).toFixed(2)} → ${poleRatio(a).toFixed(2)}</td></tr>`
  }
  return `<table style="font-size:9px;border-spacing:8px 1px;margin-top:4px">${[8, 10, 11].map(row).join('')}${ctaRow()}</table>`
}

function modeSection(cand: Candidate, mode: 'light' | 'dark', seeds: [string, string][] = SEEDS): string {
  const bg = mode === 'light' ? '#f5f4f2' : '#131316'
  const fg = mode === 'light' ? '#1c1c1e' : '#e8e8ea'
  const blocks = seeds.map(([name, hex]) => {
    const w = resolveRamp(hex, mode)
    const a = resolveRamp(hex, mode, withProfile(MODE_SPECS[mode], 'apca', cand.map))
    return `<div style="min-width:410px;flex:1;max-width:560px">
      <div style="font-size:11px;font-weight:650;margin-bottom:5px">${name} <span style="opacity:.5;font-weight:400">${hex}</span></div>
      <div style="display:flex;gap:10px">${column('WCAG (shipped)', w)}${column('APCA · ' + cand.key, a)}</div>
      ${annotations(w, a)}
    </div>`
  }).join('')
  return `<div style="background:${bg};color:${fg};border-radius:14px;padding:16px 18px;margin:10px 0">
    <div style="font-size:12px;font-weight:700;margin-bottom:10px">${mode.toUpperCase()}</div>
    <div style="display:flex;gap:22px;flex-wrap:wrap">${blocks}</div>
  </div>`
}

// 24-hue movement table (C 0.13): |ΔL| per required stop + the cta (on-text enforcement) under each candidate
function movementTable(): string {
  const HUES = Array.from({ length: 24 }, (_, i) => i * 15)
  const rows = CANDIDATES.map(cand => {
    const cells = (['light', 'dark'] as const).map(mode =>
      [8, 10, 11, 'cta' as const].map(n => {
        const dls = HUES.map(H => {
          const hex = hx(0.62, 0.13, H)
          const w = resolveRamp(hex, mode)
          const a = resolveRamp(hex, mode, withProfile(MODE_SPECS[mode], 'apca', cand.map))
          return n === 'cta' ? Math.abs(a.roles.cta.L - w.roles.cta.L) : Math.abs(by(a, n).L - by(w, n).L)
        }).sort((x, y) => x - y)
        const med = dls[12], max = dls[23]
        const fmt = (v: number) => (v < 5e-4 ? '—' : v.toFixed(3))
        return `<td>${fmt(med)} / ${fmt(max)}</td>`
      }).join('')
    ).join('')
    return `<tr><td style="font-weight:650">${cand.key}</td>${cells}</tr>`
  }).join('')
  return `<table style="border-spacing:14px 3px;font-size:11px">
    <tr style="opacity:.6"><td></td><td colspan="4">light |ΔL| med/max</td><td colspan="4">dark |ΔL| med/max</td></tr>
    <tr style="opacity:.6"><td>candidate</td><td>8</td><td>11</td><td>12</td><td>cta</td><td>8</td><td>11</td><td>12</td><td>cta</td></tr>
    ${rows}</table>`
}

const variantBlocks = `
  <h2 style="font-size:14px;margin:30px 0 2px">variants considered — why they are NOT the recommendation</h2>
  ${VARIANTS.map((c, i) => `
    <h3 style="font-size:12.5px;margin:14px 0 2px">${c.label}</h3>
    <div style="opacity:.65;font-size:11.5px;max-width:860px;margin-bottom:6px">${c.note}</div>
    ${i === 0 ? modeSection(c, 'light', [SEEDS[0]]) : modeSection(c, 'dark', [SEEDS[1]])}
  `).join('')}`

const html = `<!doctype html><meta charset="utf-8"><title>APCA profile — recommended map vs shipped WCAG</title>
<style>body{margin:0;padding:28px;background:#1b1b1e;color:#e8e8ea;font:14px/1.45 -apple-system,system-ui,sans-serif} h1{font-size:16px;font-weight:650} table td{padding:0 2px}</style>
<h1>APCA profile — the recommended map vs shipped WCAG</h1>
<div style="opacity:.65;font-size:12px;max-width:880px;margin-bottom:8px">
  <b>ONE QUESTION: does the APCA column look right?</b> Same declaration, re-solved with the recommended Lc map
  (<code>3:1→30 · 4.5→75 · 7→90</code>) in place of the WCAG ratios. Opt-in <code>contrastProfile:'apca'</code>;
  the shipped WCAG output is untouched (snapshot-proven).
  <br><br>What actually changes under the recommendation: <b>dark stop-8 lifts slightly off the paper</b> (it reads
  only Lc≈24–29 under WCAG — the dark-polarity blind spot; toggle fills and borders read a touch stronger);
  <b>light stop-8 relaxes lighter</b> (the 3:1 clamp reads Lc≈54 — APCA says that over-demanded); <b>ctas keep their
  shipped look</b> (Lc 75 is the measured equivalent of the WCAG 4.5-white enforcement — that match is by design).
  Ink 10/11 already clear their targets and barely move. Bold annotation rows = it moved; Aa on the button = the
  on-text pole; Aa on chip 9 = on-highlight (identical in both profiles — it was already APCA-judged).
</div>
<h2 style="font-size:14px;margin:20px 0 2px">${RECOMMENDED.label}</h2>
<div style="opacity:.65;font-size:11.5px;max-width:860px;margin-bottom:6px">${RECOMMENDED.note}</div>
${modeSection(RECOMMENDED, 'light')}
${modeSection(RECOMMENDED, 'dark')}
${variantBlocks}
<h2 style="font-size:13px;margin:26px 0 4px">movement summary — 24 hues, C 0.13 (— = no movement)</h2>
${movementTable()}`

mkdirSync('render', { recursive: true })
writeFileSync('render/apca.html', html)
console.log('written → render/apca.html · candidates: ' + CANDIDATES.map(c => c.key).join(' · '))
