// c12-proposal-exhibit.ts — v2 (post-panel): the judging page, built from proposal-sim2.json
// (REAL pipeline geometry, mirror-validated 12/12; hover=rest rows = v5-shipped hover behavior).
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { whiteTextLcAt, apcaYAt } from '/Users/emilygerrity/okchroma/src/reqtoken/producers'
import { clampChromaToGamut, oklchToLinearRgb, apcaLc } from '/Users/emilygerrity/okchroma/src/engine/constraints'

const sim = JSON.parse(readFileSync('/Users/emilygerrity/okchroma/scripts/c12-session/proposal-sim2.json', 'utf8'))
type P = { L: number; C: number; H: number }
const hx = (p: P) => {
  const c = clampChromaToGamut(p.L, p.C, p.H)
  const [rl, gl, bl] = oklchToLinearRgb(p.L, c, p.H)
  const gm = (v: number) => { const x = Math.min(1, Math.max(0, v)); return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055 }
  const ch = (v: number) => Math.round(gm(v) * 255).toString(16).padStart(2, '0')
  return `#${ch(rl)}${ch(gl)}${ch(bl)}`
}
const white = (p: P) => whiteTextLcAt(p.L, clampChromaToGamut(p.L, p.C, p.H), p.H) >= Math.abs(apcaLc(apcaYAt(0, 0, 0), apcaYAt(p.L, clampChromaToGamut(p.L, p.C, p.H), p.H)))
const btn = (p: P, label: string) => `<div class="btn" style="background:${hx(p)};color:${white(p) ? '#fff' : '#000'}">${label}</div>`
const chip = (p: P) => `<span class="chip" style="background:${hx(p)}"></span>`

const rows = sim.rows.filter((r: any) => r.profile === 'apca')
const RED: P = { L: 0.593, C: 0.194, H: 33.3 }
const m = sim.matrix

const rm = rows.filter((r: any) => r.cls === 'red-move' && r.light?.variant)
const rmRows = rm.map((r: any) => `<div class="row"><div class="rlab">seed ${r.seed}<br><span class="mk">${r.light.side} variant L ${r.light.variant.L.toFixed(2)}${r.light.fell ? ' · bar 0.115' : ''} · p2 ${r.light.p2.toFixed(3)} · vLc ${r.light.vLc.toFixed(0)}</span></div>
  ${chip({ L: r.L, C: r.C, H: r.H })}${btn(r.light.base, 'Primary action')}${btn(r.light.variant, 'Delete')}<span class="xlab">was:</span>${btn(RED, 'Delete')}</div>`).join('')
const rmStuck = rows.filter((r: any) => r.cls === 'red-move' && r.unreachable === 'variant')
const stuckRows = rmStuck.map((r: any) => `<div class="row"><div class="rlab">seed ${r.seed}</div>${chip({ L: r.L, C: r.C, H: r.H })}${btn(r.light?.base ?? { L: r.L, C: r.C, H: r.H }, 'Primary action')}<span class="xlab">no variant fits between your 0.45 floor and the white-text cap</span></div>`).join('')

const sm = (cls: string) => rows.filter((r: any) => r.cls === cls && r.light?.treated).map((r: any) => `<div class="row"><div class="rlab">seed ${r.seed}<br><span class="mk">ΔL ${r.light.dL >= 0 ? '+' : ''}${r.light.dL.toFixed(2)} · p2 ${r.light.p2.toFixed(3)} · Lc ${r.light.lc.toFixed(0)}${r.light.lc < 60 ? ' · SUB-60' : ''}</span></div>
  ${chip({ L: r.L, C: r.C, H: r.H })}<span class="xlab">was</span>${btn(r.light.base, 'Primary action')}<span class="xlab">now</span>${btn(r.light.treated, 'Primary action')}${btn(RED, 'Delete')}</div>`).join('')

const dk = rows.filter((r: any) => r.dark?.treated).map((r: any) => `<div class="row"><div class="rlab">seed ${r.seed} · ${r.cls}<br><span class="mk">ΔC ${r.dark.dC.toFixed(3)} · p2 ${r.dark.p2.toFixed(3)} · Lc ${r.dark.lc.toFixed(0)}</span></div>
  ${chip({ L: r.L, C: r.C, H: r.H })}<span class="xlab">was</span>${btn(r.dark.base, 'Primary action')}<span class="xlab">now</span>${btn(r.dark.treated, 'Primary action')}${btn(RED, 'Delete')}</div>`).join('')

const html = `<!doctype html><meta charset="utf-8"><title>C12 — proposal v2</title>
<style>
  body { font: 14px/1.5 -apple-system, sans-serif; margin:0; background:#faf9f7; color:#1a1a1a; }
  .note { padding:.9rem 1.4rem; background:#f2f0ec; font-size:.88rem; }
  h1 { margin:1.6rem 1.4rem .3rem; font-size:1rem; }
  .row { display:flex; align-items:center; gap:.7rem; padding:.4rem 1.4rem; border-bottom:1px solid #e5e2dd; }
  .rlab { width:210px; font-size:.72rem; opacity:.65; }
  .mk { font-size:.64rem; }
  .chip { flex:0 0 26px; width:26px; height:26px; border-radius:6px; }
  .btn { padding:.5rem 1.3rem; border-radius:8px; font-size:.84rem; font-weight:600; white-space:nowrap; }
  .xlab { font-size:.66rem; opacity:.5; }
  .facts { padding:.4rem 1.4rem 1rem; font-size:.84rem; }
  .facts li { margin:.3rem 0; }
  .dark { background:#141416; color:#e8e8e8; }
  .dark .row { border-bottom-color:#2a2a2e; }
  .dark h1 { color:#e8e8e8; }
  .dark .note { background:#1e1e22; color:#d5d5d5; }
  table { margin:.4rem 1.4rem; border-collapse:collapse; font-size:.8rem; }
  td, th { border:1px solid #d8d4cd; padding:.25rem .6rem; text-align:left; }
</style>
<div class="note"><b>C12 PROPOSAL v3 — on your Lc-60 ruling</b> (base ctas enforce to 60; wired in profiles.ts on your go; mirror-validated against resolveBrand 12/12; panel findings folded in — scripts/c12-session/panel-findings.md).
The model: FIRE = your gate (now anchored on red's cta = its seed #E54D2E — your marks' native anchor) · vivid true reds keep their color and <b>the red moves</b> (per-brand variant, declared side rule) · everyone else self-moves up (the deep class no longer fires at all in apca) until clear of your gate AND truly-different (helmlab; up 0.11 = your up-mark mean).
<b>Your bar ruling dissolved dark entirely: ZERO dark collisions</b> — dark ctas sit deeper under Lc-60 enforcement, nothing lands inside the gate. No dark mechanism needed.
Numbers (hover=rest = today's shipped hover behavior): 0 confusable · 0 under the side-by-side bar · light 68/80 ≥ Lc60 (12 SUB-60 listed inline) · wcag lane 100% legal.</div>

<h1>1 · Move the RED (${rm.length} servable of ${rm.length + rmStuck.length} apca)</h1>
${rmRows}
${rmStuck.length ? `<h1>1b · Variant-stuck (${rmStuck.length}) — your call: allow 0.42–0.45 variants, or these self-move up (sub-60 likely)</h1>${stuckRows}` : ''}

<h1>2 · Self-move UP (${rows.filter((r: any) => r.cls === 'self-up').length})</h1>
${sm('self-up')}

${rows.filter((r: any) => r.cls === 'self-down').length ? `<h1>3 · Self-move DOWN — your L0.45 all-dark, honored (${rows.filter((r: any) => r.cls === 'self-down').length})</h1>${sm('self-down')}` : `<h1>3 · Self-move DOWN — empty: under Lc-60 the deep reds no longer fire in apca (your L0.45 all-dark ruling stays on record for wcag's 4 rows)</h1>`}

<div class="dark">
<h1>4 · Dark — ZERO collisions under your Lc-60 ruling (${rows.filter((r: any) => r.fired.dark).length} fired rows). No dark mechanism.</h1>
${dk}
</div>

<h1>5 · Your calls</h1>
<ul class="facts">
<li><b>Text bar: RESOLVED by you — Lc 60, wired.</b> Side effects you should eye at bless: warm/pink base ctas release lighter (red's cta = its seed now); deep brands' DARK ctas sit up to ~0.10 deeper (less enforcement lift) — 45 highlight-snapshot tokens drifted, list at bless. 12 self-up rows still land sub-60 (flagged inline above) — the residual trilemma set; options: accept / shelf them / widen the box.</li>
<li><b>Hover.</b> Rest-state numbers above match today's shipped hover behavior (hover drifts toward red, unasserted — v5 shipped 0.137 and you approved the demo). Strict hover-safety instead: 28 more sub-60 + only 8/36 variants servable. Middle option (hover just stays out of the fire gate) ≈ same as rest.</li>
<li><b>Identity-keep box top 0.62</b> (your checks end 0.58; the L0.60 slice is unruled): 12 rows are red-move only because of the extension — at 0.58 they self-up into the zone. Veto = they join the sub-60 list.</li>
<li><b>Variant-stuck: 0 apca · 11 wcag rows</b> (wcag's white-4.5 cap ≈ L0.66 squeezes the light side; the trapped brands sit at red's own L). Options: allow variants in your unruled 0.42–0.45 band (serves them deep), or those wcag brands self-move up.</li>
<li><b>Variant floor honored at 0.45</b>; 4 variants used the 0.115 fallback bar (your mean mark). H40 C0.2 L0.45 treated as implicit NO (presented, unchecked).</li>
<li><b>Wiring notes</b> (panel): variant ships as hybrid scale (canonical red ramp; light cta pinned to the variant — ctaL-pin precedent; dark side = canonical red verbatim); C6 hue-repel exemption re-keyed to gate-fired so red-move brands are truly untouched; per-brand plugin keying (lemon/macaroni pattern); post-repel bar assert added to gates. Role-legibility check ask: a paired "which one deletes?" page over §1 before wiring.</li>
</ul>`
mkdirSync('/Users/emilygerrity/okchroma/render', { recursive: true })
writeFileSync('/Users/emilygerrity/okchroma/render/c12-proposal.html', html)
console.log(`written -> render/c12-proposal.html (v2: red-move ${rm.length}+${rmStuck.length} stuck · self-up ${rows.filter((r: any) => r.cls === 'self-up').length} · down ${rows.filter((r: any) => r.cls === 'self-down').length} · dark ${rows.filter((r: any) => r.dark?.treated).length})`)
