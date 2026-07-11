// c12-joint-solve.ts — INSTRUMENT H (grill-settled model, owner 2026-07-10): the JOINT solve.
//   A (brand): if inside the P1 gate, exit via the NEAREST release edge (min travel in the
//     fitted metric — center brands shoot far, edge brands barely move; deep-half brands
//     naturally exit DOWN into burgundy, the region floor is close). Delivery = gate release
//     + a passing pole. No P2 condition on the brand — B is red's job now.
//   B (red): complement — if the pair still vibrates (p2 < bar) red repositions INSIDE her
//     calibrated error range (error-range-checks: core L.45-.55 H24-40 first, lighter edge
//     tier L.65-.75 second), on the OPPOSITE side of the brand, nearest-canonical among
//     passing candidates. Hue latitude H24-40 (the keep-warm rule ignored per owner).
//   Both lanes. ZERO engine edits — exhibit-only; she verdicts ✓/✗+why per row (v3 marks).
import { writeFileSync, mkdirSync } from 'fs'
import { resolveBrand, signalScalesFor } from '/Users/emilygerrity/okchroma/src/engine/resolve'
import { hexToOklch, redGateDist, RED_GATE, maxChromaAt, hueDelta, inRedVividArc, vividSplit } from '/Users/emilygerrity/okchroma/src/engine/colorMath'
import { p2Diff, P2_D, P2_D_UP } from '/Users/emilygerrity/okchroma/src/engine/p2'
import { darkChromaCurve } from '/Users/emilygerrity/okchroma/src/engine/darkChromaCurve'
import { buildContext, whiteTextLcAt, apcaYAt } from '/Users/emilygerrity/okchroma/src/reqtoken/producers'
import { clampChromaToGamut, oklchToLinearRgb, apcaLc, legalRatio } from '/Users/emilygerrity/okchroma/src/engine/constraints'

const hx = (L: number, C: number, H: number) => {
  const c = clampChromaToGamut(L, C, H)
  const [rl, gl, bl] = oklchToLinearRgb(L, c, H)
  const gm = (v: number) => { const x = Math.min(1, Math.max(0, v)); return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055 }
  const ch = (v: number) => Math.round(gm(v) * 255).toString(16).padStart(2, '0')
  return `#${ch(rl)}${ch(gl)}${ch(bl)}`
}
// ── v2 candidates (owner round 2026-07-10 "directions right, distance more"): the true-red
// region WIDENS dark-ward (wDark 0.70 → 0.60 — she called several just-past-the-old-edge
// deeps "still true red"), and the region's LIP is a dead zone — real exits and red
// placements must clear it by a RING margin, never land on the edge. Both = declared
// candidates for her veto; her v2 verdicts refine them.
const WDARK_CAND = 0.60
const RING = 0.020
// ── v3 (owner round 3): the BRICK BAND — rusty-to-brick mid-dark vivid warms still read
// conflict-y ("the mid dark orange-reds are throwing me"); browns (low C) and magentas
// (cool H) at the same depth are fine. Landings must not stop in it: a dark exit that
// would park there gets burgundy-ified (cool + slight desat — "more removed from the
// brand", her acceptance) instead. All bounds = candidates for her veto.
const BRICK = { hLo: 20, hHi: 50, lLo: 0.36, lHi: 0.52, vividMin: 0.55 } as const
const inBrick = (L: number, C: number, H: number): boolean => {
  const h = ((H % 360) + 360) % 360
  return h >= BRICK.hLo && h <= BRICK.hHi && L >= BRICK.lLo && L <= BRICK.lHi &&
    C / Math.max(1e-6, maxChromaAt(L, h)) >= BRICK.vividMin
}
// v4: the DIAGONAL (her shot-2 ruling: "-8 goes too hard on H — diagonal out of that dark
// and back towards its hue"): less terminal cool, slight desat, extra depth instead.
// Gold-side deeps coolest of all ("darker less cool").
const BRICK_COOL = -4
const BRICK_COOL_GOLD = -3
const BRICK_DESAT = 0.85
const BRICK_EXTRA_DEEP = 0.02
const gateV8 = (c: { L: number; C: number; H: number }, red: { L: number; C: number; H: number }): number => {
  const dh = ((c.H - red.H + 540) % 360) - 180
  const meanC = 2 * Math.sqrt(Math.max(0, c.C) * Math.max(0, red.C))
  const arcMag = meanC * Math.sin(Math.abs(Math.min(0, dh)) * Math.PI / 360)
  const arcGold = meanC * Math.sin(Math.max(0, dh) * Math.PI / 360)
  return Math.hypot(
    WDARK_CAND * Math.max(0, red.L - c.L),
    RED_GATE.wLight * Math.max(0, c.L - red.L),
    RED_GATE.wDust * Math.max(0, red.C - c.C),
    Math.max(0, c.C - red.C),
    arcMag,
    RED_GATE.wGoldArc * arcGold,
  )
}
const RELEASE = RED_GATE.G + RING
const poleOk = (L: number, C: number, H: number, apca: boolean): boolean => {
  if (!apca) return true // wcag: one pole always passes 4.5
  if (whiteTextLcAt(L, clampChromaToGamut(L, C, H), H) >= 60) return true
  return Math.abs(apcaLc(apcaYAt(0, 0, 0), apcaYAt(L, clampChromaToGamut(L, C, H), H))) >= 60
}

// same population as the confused-pairs page (+ her three anchors ride along in that list)
const seeds: string[] = ['#BD0000', '#FF3D3D', '#E5484D']
for (const H of [12, 18, 24, 30, 36]) for (const L of [0.44, 0.50, 0.56]) {
  const hex = hx(L, 0.9 * maxChromaAt(L, H), H).toUpperCase()
  if (!seeds.includes(hex)) seeds.push(hex)
}
// + the ARC population (reconciliation rows: joint solve vs the blessed arc rule, side by side)
seeds.push('#FF7300', '#FF0000', '#FF006F')
for (const H of [16, 32, 48]) for (const L of [0.60, 0.70]) {
  const hex = hx(L, 0.9 * maxChromaAt(L, H), H).toUpperCase()
  const o = hexToOklch(hex)
  if (inRedVividArc(o.L, o.C, o.H) && !seeds.includes(hex)) seeds.push(hex)
}

const rows: any[] = []
for (const profile of ['wcag', 'apca'] as const) {
  const p = profile === 'apca' ? 'apca' as const : undefined
  const apca = profile === 'apca'
  const redSig = signalScalesFor(p).get('red')!
  const redCta = redSig.scale.cta
  const rctx = buildContext(redSig.def.hex, {
    highlight: true, darkChromaCurve, loudCta: true, darkFillMinL: redSig.def.darkFillMinL,
    enforceOnFillContrast: true, suppressRedCool: true, goldBoost: true, contrastProfile: p,
  } as any)

  for (const hex of seeds) {
    const seed = hexToOklch(hex)
    const rb = resolveBrand(hex, 'p', { contrastProfile: p })
    const cur = rb.scale.cta
    const curOv = rb.signalOverrides.find(o => o.name === 'red')
    const curRed = curOv ? curOv.scale.cta : redCta
    const bctx = buildContext(hex, {
      highlight: true, darkChromaCurve, loudCta: true, enforceOnFillContrast: true,
      suppressRedCool: true, goldBoost: true, contrastProfile: p,
    } as any)
    const bAt = (L: number) => ({ L, C: clampChromaToGamut(L, bctx.cAt('light', L, bctx.brandC), bctx.brandH), H: bctx.brandH })

    // ── A: brand nearest-exit (base = enforced pipeline cta position, identity anchor) ──
    // Base the solve on the brand's UNTREATED cta (formula at seed L) — the identity anchor.
    let brand = bAt(seed.L)
    let aNote = 'kept (outside gate)'
    let brandWentUp = false
    let brandTravel = 0
    // v4 membership: the warm brick band counts as in-region (her marks: 942400/9F0019/9D0600
    // "still true red" — warm deeps extend the region; magenta-side maroons stay kept)
    const brickMember = inBrick(seed.L, brand.C, brand.H) && hueDelta(seed.H, redCta.H) > -14
    if (gateV8(brand, redCta) <= RED_GATE.G || brickMember) {
      const travel = (dir: 1 | -1): number | null => {
        for (let L = seed.L; L >= 0.28 && L <= 0.92; L += dir * 0.002) {
          const c = bAt(L)
          if (gateV8(c, redCta) >= RELEASE && poleOk(L, c.C, c.H, apca)) return Math.abs(L - seed.L)
        }
        return null
      }
      const dn = travel(-1), up = travel(1)
      // nearest edge wins — EXCEPT noticeably-magenta brands (her Q2 caveat: lightening is
      // the natural exit once the hue reads pink), which take the up edge when its travel
      // is in the same league as down's
      // her Q2 caveat both ways: noticeably-magenta lightens — but the likelihood of light
      // LESSENS the closer to center even if lower, so deep magentas still go dark
      // (her marks: D80050 L0.56 → light · BA0043/BB0034 L0.50 → darker). 0.53 = candidate.
      const dh = hueDelta(seed.H, redCta.H)
      const magentaUp = dh <= -14 && seed.L > 0.53 && up !== null && dn !== null && up <= 2.5 * dn
      const vivid = seed.C / maxChromaAt(seed.L, seed.H)
      // gold-side vivids flip UP to bright orange (her shot 3: "send the bottom to the
      // bright orange flip"); on-hue vivids keep the big dark throw ("read truer dark")
      const goldBright = !magentaUp && vivid >= 0.85 && dh >= 1.5 && seed.L > 0.53 && up !== null
      const vividDown = !magentaUp && !goldBright && vivid >= 0.85 && dh > -14 && dn !== null
      const dir = magentaUp || goldBright ? 1 : vividDown ? -1 : dn !== null && (up === null || dn <= up) ? -1 : 1
      const t = dir === -1 ? dn! : up!
      brandWentUp = dir === 1
      brandTravel = t
      brand = bAt(seed.L + dir * t)
      aNote = `exit ${dir < 0 ? '↓' : '↑'} ${dir < 0 ? '-' : '+'}${t.toFixed(2)} → L${brand.L.toFixed(2)}${magentaUp ? ' (magenta→light)' : goldBright ? ' (gold→bright)' : vividDown && dn! > (up ?? Infinity) ? ' (vivid→dark)' : ''}`
      // brick-band landing exclusion — the DIAGONAL: extra depth + soft cool + slight desat
      if (dir === -1 && inBrick(brand.L, brand.C, brand.H)) {
        const cool = dh >= 1.5 ? BRICK_COOL_GOLD : BRICK_COOL
        const L = brand.L - BRICK_EXTRA_DEEP
        const H = bctx.brandH + cool
        brand = { L, C: clampChromaToGamut(L, bctx.cAt('light', L, bctx.brandC) * BRICK_DESAT, H), H }
        aNote += ` → diagonal ${cool}° C×${BRICK_DESAT} L${L.toFixed(2)}`
      }
    }

    // ── B: red complement inside her range, opposite side, core first, nearest canonical ──
    const rAt = (L: number, H: number) => ({ L, C: clampChromaToGamut(L, rctx.cAt('light', L, rctx.brandC), H), H })
    let red = redCta
    let bNote = 'canonical'
    const bar = (cand: { L: number }) => cand.L < brand.L ? P2_D : P2_D_UP
    const clean = (cand: { L: number; C: number; H: number }) =>
      p2Diff(brand, cand) >= bar(cand) && gateV8(brand, cand) >= RELEASE && poleOk(cand.L, cand.C, cand.H, apca)
    // brand-up pairs ALWAYS take a deep-core red (her D80050 mark: canonical lives in the
    // ring — it cannot stand beside a lightened brand)
    if (brandWentUp || !clean(redCta)) {
      // red's usable zones (her ruling): deep core L .45-.49 or the light edge tier — the
      // .50-.58 middle is the ring/dead zone, never used to de-collide. Cooler-red-first
      // for warm-side brands (her hue rows: "a cooler red would help push these apart").
      const HS = hueDelta(seed.H, redCta.H) <= -15 ? [33.3, 38, 28] : [28, 24, 33.3, 38]
      const CORE = [0.49, 0.47, 0.45]
      const EDGE = [0.65, 0.68, 0.71, 0.75]
      const wantLighter = brand.L <= redCta.L // brand sits/exited below red → red goes lighter
      const tiers = wantLighter ? [EDGE, CORE.filter(l => l > brand.L)] : [CORE, EDGE]
      const ls = (wantLighter ? (a: number[]) => [...a].sort((x, y) => x - y) : (a: number[]) => [...a].sort((x, y) => y - x))
      // candidate order IS the preference (tier → L → cool-first hue): first clean wins
      let best: { c: { L: number; C: number; H: number }; d: number } | null = null as any
      outer: for (const tier of tiers) {
        for (const L of ls(tier)) for (const H of HS) {
          const c = rAt(L, H)
          const onSide = wantLighter ? c.L > brand.L : c.L < brand.L
          if (!onSide || !clean(c)) continue
          best = { c, d: gateV8(c, redCta) }
          break outer
        }
      }
      if (best) {
        red = best.c as any
        bNote = `red → L${best.c.L.toFixed(2)}${Math.abs(best.c.H - 33.3) > 1 ? ` H${best.c.H.toFixed(0)}` : ''}`
      } else {
        bNote = 'NO CLEAN COMPLEMENT (flag)'
      }
    }

    rows.push({
      profile, hex, seed, brand, red, aNote, bNote,
      cur: { brand: cur, red: curRed },
      // ACCEPT = the exact-mode safety (owner ruling): brand demands its bright red →
      // brand untouched, red ships the deep dark-error variant. Shown on big-throw rows.
      accept: brandTravel >= 0.10 ? { brand: bAt(seed.L), red: rAt(0.45, 33.3) } : null,
      // arc reconciliation rows: the blessed arc-rule pair beside the joint solve
      arc: inRedVividArc(seed.L, seed.C, seed.H) ? (() => {
        const sp = vividSplit(hueDelta(seed.H, redCta.H))
        const bL = seed.L + sp.brandDL
        const rL = redCta.L + sp.redDL, rH = redCta.H + sp.redDH
        return { brand: bAt(bL), red: { L: rL, C: clampChromaToGamut(rL, rctx.cAt('light', rL, rctx.brandC), rH), H: rH } }
      })() : null,
      p2: +p2Diff(brand, red).toFixed(3), gate: +redGateDist(brand, red).toFixed(3),
    })
  }
}

const rowHtml = rows.map(r => {
  // verdicts key on the OUTPUT fingerprint: unchanged rows keep their marks across regens
  // (rendered greyed/settled), changed rows auto-invalidate — no re-accepting
  const fp = (hx(r.red.L, r.red.C, r.red.H) + hx(r.brand.L, r.brand.C, r.brand.H) + (r.accept ? 'a' : '')).replace(/#/g, '')
  const id = `js|${r.profile}|${r.hex}|${fp}`
  return `<div class="row">
<label class="vd"><input type="checkbox" class="ck right" data-id="${id}|right">✓</label>
<label class="vd"><input type="checkbox" class="ck wrong" data-id="${id}|wrong">✗</label>
<div class="rl"><b>${r.hex}</b> ${r.profile.toUpperCase()} · seed L${r.seed.L.toFixed(2)} H${r.seed.H.toFixed(0)}<br>brand ${r.aNote} · ${r.bNote}<br>p2 ${r.p2} · gate ${r.gate}</div>
<div class="grp"><div class="glabel">now</div><div class="pair dim"><div class="sw" style="background:${hx(r.cur.red.L, r.cur.red.C, r.cur.red.H)}"></div><div class="sw" style="background:${hx(r.cur.brand.L, r.cur.brand.C, r.cur.brand.H)}"></div></div></div>
<div class="grp"><div class="glabel">proposed</div><div class="pair"><div class="sw" style="background:${hx(r.red.L, r.red.C, r.red.H)}"></div><div class="sw" style="background:${hx(r.brand.L, r.brand.C, r.brand.H)}"></div><div class="sw chip" style="background:${r.hex}"></div></div></div>
${r.accept ? `<div class="grp"><div class="glabel">exact-mode safety</div><div class="pair"><div class="sw" style="background:${hx(r.accept.red.L, r.accept.red.C, r.accept.red.H)}"></div><div class="sw" style="background:${hx(r.accept.brand.L, r.accept.brand.C, r.accept.brand.H)}"></div></div></div>` : ''}
${r.arc ? `<div class="grp"><div class="glabel">arc rule (blessed)</div><div class="pair"><div class="sw" style="background:${hx(r.arc.red.L, r.arc.red.C, r.arc.red.H)}"></div><div class="sw" style="background:${hx(r.arc.brand.L, r.arc.brand.C, r.arc.brand.H)}"></div></div></div>` : ''}
<select class="why" data-id="${id}|why">
<option value="">why…</option>
<option>brand is still true red, needs to be darker</option>
<option>brand is still true red, needs to be lighter</option>
<option>brand is still true red, needs to be much darker</option>
<option>brand is still true red, needs to be much lighter</option>
<option>brand is correct, red should move darker</option>
<option>brand is correct, red should move lighter</option>
<option>hue issue, ask me in chat</option>
<option>use the arc rule version</option>
<option>other</option>
</select></div>`
}).join('')

const html = `<!doctype html><meta charset="utf-8"><title>C12 — joint solve proposal</title>
<style>
  body { font: 14px/1.5 -apple-system, sans-serif; margin:0; background:#faf9f7; color:#1a1a1a; }
  .note { padding:.9rem 1.4rem; background:#f2f0ec; font-size:.88rem; }
  .rows { padding:.8rem 1.4rem; display:flex; flex-direction:column; gap:.7rem; }
  .row { display:flex; align-items:center; gap:.6rem; }
  .vd { display:flex; align-items:center; gap:.2rem; font-size:.8rem; }
  .ck { width:16px; height:16px; accent-color:#1a7f37; }
  .ck.wrong { accent-color:#b3261e; }
  .rl { font-size:.62rem; opacity:.6; width:215px; line-height:1.5; }
  .grp { display:flex; flex-direction:column; gap:.1rem; }
  .glabel { font-size:.6rem; text-transform:uppercase; letter-spacing:.05em; opacity:.5; }
  .pair { display:flex; }
  .pair.dim { opacity:.55; }
  .pair.dim .sw { width:80px; height:44px; }
  .sw { width:130px; height:56px; }
  .chip { width:56px; flex:0 0 56px; margin-left:.8rem; }
  .why { display:none; font-size:.72rem; max-width:180px; margin-left:.6rem; }
  .row.no .why { display:inline-block; }
  .row.settled { opacity:.4; }
  #save { position:fixed; right:14px; top:10px; font-size:.75rem; padding:.2rem .5rem; }
  #save.bad { background:#b3261e; color:#fff; font-weight:700; opacity:1; }
</style>
<div id="save"></div>
<div class="note"><b>C12 — the joint solve v4: the DIAGONAL (soft cool ${BRICK_COOL}° / gold ${BRICK_COOL_GOLD}° · C×${BRICK_DESAT} · extra depth) replaces the hard −8° · gold vivids flip UP to bright orange · warm deep maroons now fire (brick band = in-region) · brand-up pairs always get a deep-core red · big-throw rows show the ACCEPT concession (true red + dark error) as a third pair.</b>
Per row: "now" (dimmed) · "proposed" = the engine default (red left, brand middle, ID chip right) · "exact-mode safety" on big-throw rows (brand demands its red — informational) · "arc rule (blessed)" on arc rows for reconciliation. ✓/✗ judges PROPOSED; pick "use the arc rule version" in the why if the arc pair wins.
Saves via <b>http://localhost:8324/c12-joint-solve.html</b>.</div>
<div class="rows">${rowHtml}</div>
<script>
const cks = [...document.querySelectorAll('.ck')]
const whys = [...document.querySelectorAll('.why')]
const state = () => Object.fromEntries([
  ...cks.filter(c => c.checked).map(c => [c.dataset.id, true]),
  ...whys.filter(s => s.value).map(s => [s.dataset.id, s.value]),
])
const save = document.getElementById('save')
const EP = 'http://localhost:8324/marks/joint-solve-v4'
function pairOf(c) { const base = c.dataset.id.replace(/\\|(right|wrong)$/, ''); return cks.filter(o => o !== c && o.dataset.id.startsWith(base + '|')) }
function syncWhy(row) { row.classList.toggle('no', !!row.querySelector('.ck.wrong').checked) }
async function push() {
  try {
    const r = await fetch(EP, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ savedAt: new Date().toISOString(), marks: state() }) })
    if (!r.ok) throw new Error()
    save.textContent = 'saved ✓'; save.className = ''
  } catch (e) { save.textContent = 'NOT SAVED — marks server (8324) down'; save.className = 'bad' }
}
cks.forEach(c => c.addEventListener('change', () => { if (c.checked) pairOf(c).forEach(o => { o.checked = false }); const row = c.closest('.row'); row.classList.remove('settled'); syncWhy(row); push() }))
whys.forEach(s => s.addEventListener('change', push))
fetch(EP).then(r => r.json()).then(d => {
  const m = (d && d.marks) || {}
  cks.forEach(c => { if (m[c.dataset.id]) c.checked = true })
  whys.forEach(s => { if (typeof m[s.dataset.id] === 'string') s.value = m[s.dataset.id] })
  document.querySelectorAll('.row').forEach(row => { syncWhy(row); if ([...row.querySelectorAll('.ck')].some(c => c.checked)) row.classList.add('settled') })
  save.textContent = Object.keys(m).length ? 'restored ' + Object.keys(m).length + ' ✓' : ''
  save.className = ''
}).catch(() => { save.textContent = 'marks server (8324) not reachable — marks will NOT save'; save.className = 'bad' })
</script>`

mkdirSync('/Users/emilygerrity/okchroma/render', { recursive: true })
writeFileSync('/Users/emilygerrity/okchroma/render/c12-joint-solve.html', html)
writeFileSync('/Users/emilygerrity/okchroma/scripts/c12-session/joint-solve-probe.json',
  JSON.stringify({ date: '2026-07-10', rows: rows.map(r => ({ profile: r.profile, hex: r.hex, aNote: r.aNote, bNote: r.bNote, brandL: +r.brand.L.toFixed(3), redL: +r.red.L.toFixed(3), redH: +r.red.H.toFixed(1), p2: r.p2, gate: r.gate, fp: (hx(r.red.L, r.red.C, r.red.H) + hx(r.brand.L, r.brand.C, r.brand.H) + (r.accept ? 'a' : '')).replace(/#/g, '') })) }, null, 1))
console.log(`written -> render/c12-joint-solve.html (${rows.length} rows)`)
for (const r of rows.filter(x => x.profile === 'wcag')) console.log(`${r.hex}: ${r.aNote} | ${r.bNote} | p2 ${r.p2}`)
