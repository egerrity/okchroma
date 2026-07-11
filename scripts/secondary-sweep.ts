// secondary-sweep.ts — OWNER EYE-CHECK for the secondary work (SECONDARY-PLAN P1 sweeps).
// Decisions on this page: ① the subtle clamp strength (mult 3 / 4.5 / 6) · ② whether the
// collision thresholds over-demote (42% of arbitrary secondaries demote at DELTA_E 0.16/0.10 —
// tuned for primary-vs-signal stakes; borderline cases shown with measured ΔE) · ③ the green
// room rule + a real signal-move example · ④ the derived "subtler archetype" posture (§2b).
// Writes render/secondary.html. Light on light, dark on dark.
import { writeFileSync, mkdirSync } from 'fs'
import { resolveTheme, subtleCtaLFor, type ResolvedTheme } from '../src/engine/resolve'
import { generateSubtleSecondary, SUBTLE_SECONDARY_MULT_CANDIDATES, type GeneratedScale } from '../src/engine/colorEngine'
import { ARCHETYPES } from '../src/engine/archetypes'
import { oklchToLinearRgb, wcagY, contrastRatio, findMaxLForContrast } from '../src/engine/constraints'
import { toHex } from '../src/engine/cssRender'

const enc = (c: number) => { c = Math.max(0, Math.min(1, c)); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055 }
const hx = (L: number, C: number, H: number) => '#' + oklchToLinearRgb(L, C, H).map(c => Math.round(enc(c) * 255).toString(16).padStart(2, '0')).join('')
const stopHex = (s: { r: number; g: number; b: number }) => toHex(s.r, s.g, s.b)

// THE ADAPTIVE STROKE (owner idea + owner round 2 "use stop 8"): every button/chip carries a
// stroke whose DEFAULT is transparent; when the fill reads < 3:1 (WCAG 1.4.11; Lc 30 under the
// apca profile) against its placement bg, the stroke resolves to the family's OWN highlight-8 —
// the stop that already carries the declared 3:1-vs-paper-2 require, so no solving and the
// stroke keeps the family's tint. A conditional ALIAS, not a conditional solve. The border is
// always present (layout-stable) — exactly how the token would ship.
function adaptiveStroke(
  fill: { L: number; C: number; H: number },
  bg: { L: number; C: number; H: number },
  familyStop8: { r: number; g: number; b: number },
): string {
  const by = wcagY(bg.L, bg.C, bg.H)
  if (contrastRatio(wcagY(fill.L, fill.C, fill.H), by) >= 3) return 'transparent'
  return stopHex(familyStop8)
}

// one theme rendered as real components: primary button + secondary button/badge/wash card
function themeCard(label: string, t: ResolvedTheme, mode: 'light' | 'dark', note = '', strokes = false): string {
  const p = t.primary.scale
  const s = t.secondary!.scale
  const stops = (sc: GeneratedScale) => (mode === 'light' ? sc.light : sc.dark)
  const paper1 = stops(p).find(x => x.stop === 1)!
  const paper2 = stops(p).find(x => x.stop === 2)!
  const ink11 = stops(p).find(x => x.stop === 11)!
  const ink10 = stops(p).find(x => x.stop === 10)!
  const pCta = mode === 'light' ? p.cta : p.ctaDark
  const pOn = (mode === 'light' ? p.onFillTextIsWhite : p.onFillTextIsWhiteDark) ? '#fff' : '#000'
  const sCta = mode === 'light' ? s.cta : s.ctaDark
  const sOn = (mode === 'light' ? s.onFillTextIsWhite : s.onFillTextIsWhiteDark) ? '#fff' : '#000'
  const sWash = stops(s).find(x => x.stop === 4)!
  const sHl = stops(s).find(x => x.stop === 9)!
  const chips = [3, 6, 9, 12].map(n => stops(s).find(x => x.stop === n)!)
  // the stroke token: always present, transparent unless the fill fails 3:1 vs its placement —
  // then it aliases the FAMILY's contrast-gated stop 8 (primary fills → primary-8; secondary
  // fills/badges → the secondary scale's own 8)
  const p8 = stops(p).find(x => x.stop === 8)!
  const s8 = stops(s).find(x => x.stop === 8)!
  const strokeOf = (fill: { L: number; C: number; H: number }, family: 'primary' | 'secondary' = 'secondary') =>
    strokes ? adaptiveStroke(fill, paper2, family === 'primary' ? p8 : s8) : 'transparent'
  return `<div style="flex:1;min-width:230px;max-width:290px">
    <div style="font-size:10.5px;font-weight:650;margin-bottom:4px">${label}</div>
    <div style="background:${stopHex(paper1)};border-radius:10px;padding:10px">
      <div style="background:${stopHex(paper2)};border-radius:8px;padding:10px">
        <div style="color:${stopHex(ink11)};font-size:11.5px;font-weight:700;margin-bottom:6px">Card title</div>
        <div style="display:flex;gap:6px;margin-bottom:7px">
          <span style="background:${stopHex(pCta)};border:1.5px solid ${strokeOf(pCta, 'primary')};color:${pOn};border-radius:6px;padding:4px 9px;font-size:9.5px;font-weight:650">Primary</span>
          <span style="background:${stopHex(sCta)};border:1.5px solid ${strokeOf(sCta)};color:${sOn};border-radius:6px;padding:4px 9px;font-size:9.5px;font-weight:650">Secondary</span>
        </div>
        <span style="background:${stopHex(sHl)};border:1.5px solid ${strokeOf(sHl)};color:${(mode === 'light' ? s.onHighlightIsWhite : s.onHighlightIsWhiteDark) ? '#fff' : '#000'};border-radius:9px;padding:2px 8px;font-size:8.5px;font-weight:650">badge · hl-9</span>
        <div style="background:${stopHex(sWash)};color:${stopHex(ink10)};border-radius:6px;padding:6px 8px;font-size:9px;margin-top:7px">secondary wash-4 inset</div>
      </div>
      <div style="display:flex;gap:4px;margin-top:7px">${chips.map(c => `<div style="flex:1;height:16px;border-radius:3px;background:${stopHex(c)}"></div>`).join('')}</div>
    </div>
    ${note ? `<div style="font-size:9px;opacity:.6;margin-top:4px;line-height:1.35">${note}</div>` : ''}
  </div>`
}

function modeRow(cards: string[], mode: 'light' | 'dark'): string {
  const bg = mode === 'light' ? '#f5f4f2' : '#131316'
  const fg = mode === 'light' ? '#1c1c1e' : '#e8e8ea'
  return `<div style="background:${bg};color:${fg};border-radius:12px;padding:14px;margin:8px 0;display:flex;gap:14px;flex-wrap:wrap">
    <div style="width:100%;font-size:11px;font-weight:700;margin-bottom:2px">${mode.toUpperCase()}</div>${cards.join('')}</div>`
}

// ── §0 archetype × derived secondary — the SET-REGISTER question (owner ask) ─
// The current subtle/derived impl literally forces the 'light' archetype (copied from the
// neutral) + the wash-4/5 cta — so EVERY input lands at the same quiet register, whatever its
// own archetype. One color per archetype, with its derived secondary, so the owner can judge
// whether subtle should instead be a DELTA from the input's archetype.
// ── §⓪★ the owner's picks, light DIRECTLY beside dark ─────────────────────────
// Owner-selected per-archetype Δ (2026-07-04, from the curved-delta grid). Each pair renders the
// SAME theme in both modes side by side so the light↔dark relationship is judged per pick.
const DELTA_PICKS: Record<string, number> = {
  'near-black': 0.4, 'dark': 0.3, 'rich': 0.16, 'vivid': 0.24, 'bright': 0.14, 'light': 0.03,
}
// OWNER ROUND 3: in dark mode the deltas REVERSE — a light-archetype primary in dark is a
// near-white fill on near-black paper, i.e. exactly what near-black is in light mode. Two
// formalizations shown side by side:
//   A · archetype MIRROR — dark Δ = the light pick of the mirrored archetype
//       (near-black↔light, dark↔bright, rich↔vivid)
//   B · DISTANCE-FROM-PAPER curve — one mode-agnostic rule: Δ = f(|primary cta L − paper-1 L|),
//       piecewise-linear through the owner's own light picks. Handles the dark floor's
//       flattening (equal distance ⇒ equal Δ) and explains the reversal as a consequence.
const MIRROR: Record<string, string> = {
  'near-black': 'light', 'dark': 'bright', 'rich': 'vivid', 'vivid': 'rich', 'bright': 'dark', 'light': 'near-black',
}
function picksSection(): string {
  const LIGHT_POLE_CAP = 0.985
  // the distance→Δ curve, fitted from the owner's light picks against each theme's real geometry
  const pts = ARCHETYPES.map(a => {
    const t = resolveTheme({ primaryHex: hx(a.medianL, 0.11, 260), deriveSecondary: true })
    const p1 = t.primary.scale.light.find(s => s.stop === 1)!
    return { d: Math.abs(t.primary.scale.cta.L - p1.L), dl: DELTA_PICKS[a.name] }
  }).sort((x, y) => x.d - y.d)
  const distCurve = (d: number): number => {
    if (d <= pts[0].d) return pts[0].dl
    for (let i = 0; i < pts.length - 1; i++)
      if (d >= pts[i].d && d <= pts[i + 1].d) return pts[i].dl + (pts[i + 1].dl - pts[i].dl) * ((d - pts[i].d) / (pts[i + 1].d - pts[i].d))
    return pts[pts.length - 1].dl
  }

  const rows = ARCHETYPES.map(a => {
    const hex = hx(a.medianL, 0.11, 260)
    const dlLight = DELTA_PICKS[a.name]
    const base = resolveTheme({ primaryHex: hex, deriveSecondary: true })
    const p = base.primary.scale
    const dlMirror = DELTA_PICKS[MIRROR[a.name]]
    // B comes straight from the ENGINE's locked curve (resolve.ts subtleCtaLFor) — single source
    const dlDist = p.ctaDark.L - subtleCtaLFor(p).dark
    const card = (mode: 'light' | 'dark', darkDl: number, tag: string) => {
      const t = resolveTheme({ primaryHex: hex, deriveSecondary: true })
      t.secondary!.scale = generateSubtleSecondary(hex, {
        ctaL: { light: Math.min(p.cta.L + dlLight, LIGHT_POLE_CAP), dark: Math.max(p.ctaDark.L - darkDl, 0.22) },
      })
      const bg = mode === 'light' ? '#f5f4f2' : '#131316'
      const fg = mode === 'light' ? '#1c1c1e' : '#e8e8ea'
      const pC = mode === 'light' ? p.cta : p.ctaDark
      const sC = mode === 'light' ? t.secondary!.scale.cta : t.secondary!.scale.ctaDark
      return `<div style="flex:1;background:${bg};color:${fg};border-radius:12px;padding:12px">
        ${themeCard(tag, t, mode, `cta ${pC.L.toFixed(3)} → ${sC.L.toFixed(3)} (Δ ${(sC.L - pC.L).toFixed(3)})`, true)}</div>`
    }
    return `<div style="width:100%">
      <div style="font-size:12px;font-weight:700;margin:14px 0 4px">${a.name} — light Δ${dlLight} · dark A Δ${dlMirror} (mirror: ${MIRROR[a.name]}) · dark B Δ${dlDist.toFixed(2)} (distance)</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        ${card('light', 0, 'LIGHT · your pick')}
        ${card('dark', dlMirror, 'DARK · A archetype mirror')}
        ${card('dark', dlDist, 'DARK · B distance curve — LOCKED (engine default)')}
      </div>
    </div>`
  }).join('')
  // FAMILY-CORRECTNESS PROOF (owner flag): two DIFFERENT hues so the per-family strokes are
  // visible — a light-archetype BLUE primary (its own cta fails the gate → stroke = the BLUE
  // scale's highlight-8) beside a CORAL subtle secondary (stroke = the CORAL scale's own 8).
  const proof = (() => {
    const t = resolveTheme({ primaryHex: hx(0.925, 0.05, 260), secondaryHex: hx(0.62, 0.16, 40), secondaryLevel: 'subtle' })
    return (['light', 'dark'] as const).map(mode => {
      const bg = mode === 'light' ? '#f5f4f2' : '#131316'
      const fg = mode === 'light' ? '#1c1c1e' : '#e8e8ea'
      return `<div style="flex:1;background:${bg};color:${fg};border-radius:12px;padding:12px;min-width:250px;max-width:330px">
        ${themeCard(mode.toUpperCase(), t, mode, 'blue primary → BLUE-8 stroke · coral secondary → CORAL-8 stroke (each family its own gated stop)', true)}</div>`
    }).join('')
  })()
  return `<h2 style="font-size:14px;margin:24px 0 2px">⓪★ your picks + the REVERSED dark side (A: archetype mirror · B: distance-from-paper)</h2>
  <div style="opacity:.65;font-size:11.5px;max-width:880px">Light = your picks (near-black .40 · dark .30 · rich .16 · vivid .24 · bright .14 · light .03). Dark A literally mirrors the archetype axis (light↔near-black…). Dark B is ONE mode-agnostic rule — Δ grows with the primary's distance from the mode's paper — fitted through your light picks; it produces the reversal automatically AND gives the floor-flattened dark primaries equal treatment.</div>
  <div style="font-size:12px;font-weight:700;margin:14px 0 4px">stroke family proof — two hues, each stroke from its OWN scale's stop 8</div>
  <div style="display:flex;gap:10px;flex-wrap:wrap">${proof}</div>
  ${rows}`
}

function archetypeSection(): string {
  // OWNER ROUND 2 (2026-07-04): a CURVED delta — dark inputs need more escape than light ones,
  // and NOBODY flips. Per-archetype candidates from the owner's readings of the flat sweep:
  // near-black/dark "need more than .2 — try .25/.3/.4" · rich "right at .16" · vivid "needs
  // more" · bright "right at .12" · light doesn't flip: it just goes VERY light (tiny +Δ,
  // capped near the pole) — or resolves as an OUTLINE (shown; the adaptive-stroke rule's limit).
  // Dark mode mirrors the same per-archetype Δ downward toward the paper — NOTE the dark floor
  // flattens most primaries to cta 0.700, so "per archetype" vs "per actual dark L" is a live
  // question visible in the cards. Delta = RECOMMENDED-mode behavior; exact ships untouched.
  const DELTA_CANDIDATES: Record<string, number[]> = {
    'near-black': [0.25, 0.3, 0.4],
    'dark': [0.25, 0.3, 0.4],
    'rich': [0.14, 0.16, 0.18],
    'vivid': [0.18, 0.2, 0.24],
    'bright': [0.1, 0.12, 0.14],
    'light': [0.03, 0.05, 0.07],
  }
  const LIGHT_POLE_CAP = 0.985
  const seeds = ARCHETYPES.map(a => ({ a, hex: hx(a.medianL, 0.11, 260) }))
  const rows = (['light', 'dark'] as const).map(mode =>
    modeRow(seeds.flatMap(({ a, hex }) => {
      const cards = DELTA_CANDIDATES[a.name].map(dl => {
        const t = resolveTheme({ primaryHex: hex, deriveSecondary: true })
        const p = t.primary.scale
        const lightL = Math.min(p.cta.L + dl, LIGHT_POLE_CAP)   // no flip — capped at the pole
        const darkL = Math.max(p.ctaDark.L - dl, 0.22)          // no sinking under the dark paper
        t.secondary!.scale = generateSubtleSecondary(hex, { ctaL: { light: lightL, dark: darkL } })
        const pC = mode === 'light' ? p.cta : p.ctaDark
        const sC = mode === 'light' ? t.secondary!.scale.cta : t.secondary!.scale.ctaDark
        return themeCard(`${a.name} · Δ${dl}`, t, mode,
          `primary cta L ${pC.L.toFixed(3)} → secondary ${sC.L.toFixed(3)} (Δ ${(sC.L - pC.L).toFixed(3)})`, true)
      })
      // the OUTLINE resolution for the light archetype: the adaptive-stroke rule taken to its
      // limit — transparent fill, stroke + label in the secondary hue solved to pass 3:1 / 4.5
      if (a.name === 'light') cards.push(outlineCard(hex, mode))
      return cards
    }), mode)
  ).join('')
  return `<h2 style="font-size:14px;margin:24px 0 2px">⓪ the CURVED delta + the adaptive stroke (owner round 2)</h2>
  <div style="opacity:.65;font-size:11.5px;max-width:880px">Per-archetype Δ from your readings (near-black/dark ×.25/.3/.4 · rich .16 · vivid more · bright .12 · light = tiny +Δ, NO flip — or the outline card). <b>Every button/chip now carries the ADAPTIVE STROKE token: transparent by default; when the fill reads &lt; 3:1 vs its placement (Lc 30 under apca), it resolves to the fill's hue solved to pass</b> — WCAG 1.4.11 as a requirement-token; the border is always present so layout never shifts. Watch the quiet secondaries: their strokes fire automatically.</div>${rows}`
}

// the light-archetype OUTLINE resolution: transparent fill; stroke = the secondary's own
// contrast-gated stop 8 (3:1 by declared rule), label = its ink-11 (4.5 by declared rule) —
// no solving, just the gated tokens doing their jobs
function outlineCard(hex: string, mode: 'light' | 'dark'): string {
  const t = resolveTheme({ primaryHex: hex, deriveSecondary: true })
  const p = t.primary.scale
  const stops = mode === 'light' ? p.light : p.dark
  const paper1 = stops.find(x => x.stop === 1)!
  const paper2 = stops.find(x => x.stop === 2)!
  const ink11 = stops.find(x => x.stop === 11)!
  const pCta = mode === 'light' ? p.cta : p.ctaDark
  const pOn = (mode === 'light' ? p.onFillTextIsWhite : p.onFillTextIsWhiteDark) ? '#fff' : '#000'
  const sec = t.secondary!.scale
  const sStops = mode === 'light' ? sec.light : sec.dark
  const strokeHex = stopHex(sStops.find(x => x.stop === 8)!)
  const textHex = stopHex(sStops.find(x => x.stop === 10)!)
  return `<div style="flex:1;min-width:230px;max-width:290px">
    <div style="font-size:10.5px;font-weight:650;margin-bottom:4px">light · OUTLINE resolution</div>
    <div style="background:${stopHex(paper1)};border-radius:10px;padding:10px">
      <div style="background:${stopHex(paper2)};border-radius:8px;padding:10px">
        <div style="color:${stopHex(ink11)};font-size:11.5px;font-weight:700;margin-bottom:6px">Card title</div>
        <div style="display:flex;gap:6px;margin-bottom:7px">
          <span style="background:${stopHex(pCta)};border:1.5px solid transparent;color:${pOn};border-radius:6px;padding:4px 9px;font-size:9.5px;font-weight:650">Primary</span>
          <span style="background:transparent;border:1.5px solid ${strokeHex};color:${textHex};border-radius:6px;padding:4px 9px;font-size:9.5px;font-weight:650">Secondary</span>
        </div>
        <span style="background:transparent;border:1.5px solid ${strokeHex};color:${textHex};border-radius:9px;padding:2px 8px;font-size:8.5px;font-weight:650">badge · outline</span>
      </div>
    </div>
    <div style="font-size:9px;opacity:.6;margin-top:4px;line-height:1.35">stroke = secondary highlight-8 (${strokeHex}, 3:1 by rule) · label = ink-11 (${textHex}, 4.5 by rule) — the stroke rule's limit case: no fill at all</div>
  </div>`
}

// ── §1★ FINALISTS (owner cut: tint ×8 vs pastel k=.35) — the FULL build-out ───────────────────
// One column per model, richer component context per seed. Strokes live (fired ONLY when the
// fill fails 3:1 vs paper-2 — wcag default; the apca profile judges Lc 30 instead).
function finalistCard(tag: string, primaryHex: string, sHex: string | null, model: { mult?: number; pastelK?: number }, mode: 'light' | 'dark'): string {
  // sHex null = the DERIVED posture (the plugin default): the secondary derives from the primary
  const t = sHex
    ? resolveTheme({ primaryHex, secondaryHex: sHex })
    : resolveTheme({ primaryHex, deriveSecondary: true })
  t.secondary!.scale = generateSubtleSecondary(sHex ?? primaryHex, { ...model, ctaL: subtleCtaLFor(t.primary.scale) })
  const p = t.primary.scale
  const s = t.secondary!.scale
  const st = (sc: GeneratedScale) => (mode === 'light' ? sc.light : sc.dark)
  const paper1 = st(p).find(x => x.stop === 1)!
  const paper2 = st(p).find(x => x.stop === 2)!
  const ink11 = st(p).find(x => x.stop === 11)!
  const ink10 = st(p).find(x => x.stop === 10)!
  const pCta = mode === 'light' ? p.cta : p.ctaDark
  const pOn = (mode === 'light' ? p.onFillTextIsWhite : p.onFillTextIsWhiteDark) ? '#fff' : '#000'
  const sCta = mode === 'light' ? s.cta : s.ctaDark
  const sOn = (mode === 'light' ? s.onFillTextIsWhite : s.onFillTextIsWhiteDark) ? '#fff' : '#000'
  const sHl = st(s).find(x => x.stop === 9)!
  const sOnHl = (mode === 'light' ? s.onHighlightIsWhite : s.onHighlightIsWhiteDark) ? '#fff' : '#000'
  const s8 = st(s).find(x => x.stop === 8)!
  const p8 = st(p).find(x => x.stop === 8)!
  const sWash3 = st(s).find(x => x.stop === 3)!
  const sWash4 = st(s).find(x => x.stop === 4)!
  const sInk10 = st(s).find(x => x.stop === 10)!
  const secStroke = adaptiveStroke(sCta, paper2, s8)
  const priStroke = adaptiveStroke(pCta, paper2, p8)
  const ramp = st(s).map(x => `<div style="flex:1;height:14px;border-radius:2px;background:${stopHex(x)}"></div>`).join('')
  return `<div style="flex:1;min-width:280px;max-width:360px">
    <div style="font-size:10.5px;font-weight:650;margin-bottom:4px">${tag}</div>
    <div style="background:${stopHex(paper1)};border-radius:10px;padding:10px">
      <div style="background:${stopHex(paper2)};border-radius:8px;padding:11px 12px">
        <div style="color:${stopHex(ink11)};font-size:12px;font-weight:700">Projects overview</div>
        <div style="color:${stopHex(ink10)};font-size:9.5px;line-height:1.4;margin:3px 0 8px">Primary drives the page; the secondary supports — chips, filters, quiet actions.</div>
        <div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap">
          <span style="background:${stopHex(pCta)};border:1.5px solid ${priStroke};color:${pOn};border-radius:6px;padding:4px 10px;font-size:9.5px;font-weight:650">New project</span>
          <span style="background:${stopHex(sCta)};border:1.5px solid ${secStroke};color:${sOn};border-radius:6px;padding:4px 10px;font-size:9.5px;font-weight:650">Import</span>
          <span style="background:transparent;border:1.5px solid ${stopHex(s8)};color:${stopHex(sInk10)};border-radius:6px;padding:4px 10px;font-size:9.5px;font-weight:650">Export</span>
        </div>
        <div style="display:flex;gap:5px;align-items:center;margin-bottom:8px;flex-wrap:wrap">
          <span style="background:${stopHex(sHl)};color:${sOnHl};border-radius:8px;padding:2px 8px;font-size:8.5px;font-weight:650">Trialing</span>
          <span style="background:${stopHex(sWash4)};color:${stopHex(sInk10)};border-radius:8px;padding:2px 8px;font-size:8.5px;font-weight:650">12 open</span>
          <span style="color:${stopHex(sInk10)};font-size:8.5px;font-weight:650;text-decoration:underline">secondary link</span>
        </div>
        <div style="background:${stopHex(sWash3)};border-radius:6px;padding:6px 8px;font-size:9px;color:${stopHex(ink10)};margin-bottom:6px">selected row · secondary wash-3</div>
        <div style="background:${stopHex(sWash4)};border-radius:6px;padding:6px 8px;font-size:9px;color:${stopHex(ink11)}">inset panel · secondary wash-4</div>
      </div>
      <div style="display:flex;gap:3px;margin-top:7px">${ramp}</div>
    </div>
    <div style="font-size:9px;opacity:.6;margin-top:4px;line-height:1.35">sec cta L ${sCta.L.toFixed(3)} C ${sCta.C.toFixed(3)} · stroke ${secStroke === 'transparent' ? 'not needed (clears 3:1)' : `FIRED → ${secStroke}`}</div>
  </div>`
}

function finalistSection(): string {
  const P = hx(0.55, 0.16, 260)
  const seeds: Array<[string, string | null]> = [
    ['DERIVED (plugin default)', null],
    ['violet', hx(0.55, 0.18, 300)], ['teal', hx(0.6, 0.14, 190)], ['coral', hx(0.62, 0.16, 40)],
    ['gold', hx(0.7, 0.12, 85)], ['green', hx(0.55, 0.15, 150)],
  ]
  const rows = (['light', 'dark'] as const).map(mode =>
    modeRow(seeds.flatMap(([name, sHex]) => [
      finalistCard(`${name} · tint ×8`, P, sHex, { mult: 8 }, mode),
      finalistCard(`${name} · pastel k=.35`, P, sHex, { pastelK: 0.35 }, mode),
    ]), mode)
  ).join('')
  return `<h2 style="font-size:14px;margin:24px 0 2px">①★ FINALISTS — tint ×8 vs pastel k=.35, full build-out</h2>
  <div style="opacity:.65;font-size:11.5px;max-width:880px">Per seed: the two models side by side in fuller context — both ctas, an outline button (secondary-8 stroke + ink-11 label), hl-9 badge, wash-4 chip, secondary link (ink-11), selected-row + inset washes, and the full 12-stop secondary ramp. <b>Strokes fire ONLY when a fill fails 3:1 vs paper-2 (WCAG default; the apca profile judges Lc 30)</b> — the annotation under each card says whether the secondary cta's stroke fired.</div>${rows}`
}

// ── §1 the AIRY question — the subtle chroma MODEL (owner: "muddy → light and airy") ──────────
const STRENGTH_SEEDS: [string, string][] = [['violet', hx(0.55, 0.18, 300)], ['teal', hx(0.6, 0.14, 190)], ['coral', hx(0.62, 0.16, 40)]]
const PRIMARY_FOR_STRENGTH = hx(0.55, 0.16, 260)
function strengthSection(): string {
  const CANDS: Array<{ tag: string; o: { mult?: number; pastelK?: number } }> = [
    { tag: 'tint ×4.5 · current', o: { mult: 4.5 } },
    { tag: 'tint ×8', o: { mult: 8 } },
    { tag: 'pastel k=.25', o: { pastelK: 0.25 } },
    { tag: 'pastel k=.35', o: { pastelK: 0.35 } },
  ]
  const rows = (['light', 'dark'] as const).map(mode =>
    modeRow(
      STRENGTH_SEEDS.flatMap(([name, sHex]) =>
        CANDS.map(c => {
          const t = resolveTheme({ primaryHex: PRIMARY_FOR_STRENGTH, secondaryHex: sHex })
          t.secondary!.scale = generateSubtleSecondary(sHex, { ...c.o, ctaL: subtleCtaLFor(t.primary.scale) })
          return themeCard(`${name} · ${c.tag}`, t, mode, '', true)
        })
      ), mode)
  ).join('')
  return `<h2 style="font-size:14px;margin:24px 0 2px">① the AIRY question — subtle chroma model (owner: current reads MUDDY; should be light and airy)</h2>
  <div style="opacity:.65;font-size:11.5px;max-width:880px">Same locked delta registers; only the chroma MODEL varies. The neutral tint curve uses tiny ABSOLUTE peaks (designed for near-greys) — at mid L it reads grey-brown. PASTEL = a fraction (k) of the hue's own max chroma at each L — colorful-but-quiet, airier by construction. Adaptive strokes on.</div>${rows}`
}

// ── §2 demotion behavior: the red mirror + gold-vs-yellow ─────────────────────
function demotionSection(): string {
  const redMirror = resolveTheme({ primaryHex: '#D93526', secondaryHex: hx(0.6, 0.17, 20) })
  const gold = resolveTheme({ primaryHex: hx(0.55, 0.16, 260), secondaryHex: hx(0.7, 0.12, 78) })
  const standardGold = resolveTheme({ primaryHex: hx(0.55, 0.16, 260), secondaryHex: hx(0.7, 0.12, 78) })
  // show what the gold WOULD look like un-demoted, for the owner's context judgment
  const goldStd = { ...standardGold, secondary: { ...standardGold.secondary!, scale: (resolveTheme({ primaryHex: hx(0.55, 0.16, 260), secondaryHex: hx(0.7, 0.12, 78), secondaryLevel: 'standard' as const, exact: true }).secondary!.scale) } }
  const rows = (['light', 'dark'] as const).map(mode =>
    modeRow([
      themeCard('red primary + coral secondary', redMirror, mode,
        `MIRROR of the primary red exit: primary cta ${redMirror.primary.redRepel ? 'stepped clear of red (C12 solve)' : 'kept'} · secondary → ${redMirror.secondary!.level}${redMirror.secondary!.demoted ? ' (auto)' : ''} — escapes lighter/quieter, opposite register`),
      themeCard('gold secondary — as demoted (subtle)', gold, mode,
        gold.secondary!.notes.map(n => n).join(' · ') || 'no demotion'),
      themeCard('same gold — undemoted for comparison', goldStd, mode,
        'the raw gold ramp the numbers flagged: does it actually read as the yellow signal in context?'),
    ], mode)
  ).join('')
  return `<h2 style="font-size:14px;margin:24px 0 2px">② demotion in situ — the red mirror + the gold question</h2>${rows}`
}

// ── §3 threshold calibration: borderline demotions with measured ΔE ───────────
function calibrationSection(): string {
  const P = hx(0.55, 0.16, 260)
  const rows: string[] = []
  const cases: Array<{ t: ResolvedTheme; hex: string; dE: number; sig: string }> = []
  for (let H = 0; H < 360; H += 15) for (const C of [0.08, 0.17]) {
    const sHex = hx(0.62, C, H)
    const t = resolveTheme({ primaryHex: P, secondaryHex: sHex })
    if (!t.secondary!.demoted) continue
    const m = t.secondary!.notes.join(' ').match(/the (\S+) signal \(ΔE ([\d.]+)\)/)
    if (m) cases.push({ t, hex: sHex, dE: parseFloat(m[2]), sig: m[1] })
  }
  cases.sort((a, b) => b.dE - a.dE) // most-borderline first (largest ΔE still under threshold)
  const top = cases.slice(0, 6)
  const cards = (mode: 'light' | 'dark') => top.map(c =>
    themeCard(`${c.hex} → demoted by ${c.sig}`, c.t, mode, `ΔE ${c.dE.toFixed(2)} (light thr 0.16 / dark 0.10) — should this one really have yielded?`))
  return `<h2 style="font-size:14px;margin:24px 0 2px">③ threshold calibration — the most borderline demotions (fixed primary ${P})</h2>
  <div style="opacity:.65;font-size:11.5px;max-width:880px"><b>At current thresholds 41.7% of arbitrary secondaries demote</b> (sweep: red 40 · green 90 · info 70 · yellow 0 of 480 themes; the thresholds were tuned for PRIMARY-vs-signal confusion stakes). Green/info demote most because a variant must clear BOTH brand colors and the numbers rarely agree — the same "numbers belie context" pattern as gold-vs-yellow. If these borderline cards read fine, the secondary check wants a TIGHTER threshold than the primary's.</div>
  ${(['light', 'dark'] as const).map(mode => modeRow(cards(mode), mode)).join('')}`
}

// ── §4 a real signal move (info dodges the secondary) ─────────────────────────
function signalMoveSection(): string {
  let found: ResolvedTheme | null = null, seed = ''
  for (let H = 250; H < 340 && !found; H += 5) {
    const sHex = hx(0.62, 0.17, H)
    const t = resolveTheme({ primaryHex: hx(0.62, 0.13, 150), secondaryHex: sHex })
    if (t.secondary && !t.secondary.demoted && t.secondary.notes.some(n => n.includes('shifted'))) { found = t; seed = sHex }
  }
  if (!found) return `<h2 style="font-size:14px;margin:24px 0 2px">④ signal move</h2><div style="opacity:.65;font-size:11.5px">No in-range example found in this sweep slice — see audit counts.</div>`
  const sigNote = found.secondary!.notes.find(n => n.includes('shifted'))!
  const rows = (['light', 'dark'] as const).map(mode => modeRow([
    themeCard(`green primary + violet secondary ${seed}`, found!, mode, `${sigNote} — the secondary KEPT its color; the signal moved (owner rule: info isn't sacred)`),
  ], mode)).join('')
  return `<h2 style="font-size:14px;margin:24px 0 2px">④ the signal moves for the secondary (info-color room)</h2>${rows}`
}

const html = `<!doctype html><meta charset="utf-8"><title>secondary — collision rules + subtle sweeps</title>
<style>body{margin:0;padding:28px;background:#1b1b1e;color:#e8e8ea;font:14px/1.45 -apple-system,system-ui,sans-serif} h1{font-size:16px;font-weight:650}</style>
<h1>secondary colors — the owner picks (SECONDARY-PLAN P1)</h1>
<div style="opacity:.65;font-size:12px;max-width:880px">Rules already locked: red/yellow → secondary yields subtle (red = the mirror of the primary red exit) · green = one move, primary priority · info moves freely · auto-demote + annotate · quiet subtle cta · P↔S advice-only. On this page: the set-register-vs-delta question (⓪, live), the clamp strength, and the threshold question.</div>
${finalistSection()}
${picksSection()}
${archetypeSection()}
${strengthSection()}
${demotionSection()}
${calibrationSection()}
${signalMoveSection()}`

mkdirSync('render', { recursive: true })
writeFileSync('render/secondary.html', html)
console.log('written → render/secondary.html')
