// Candidate ACHROMATIC dark L ladders for visual blessing. Each candidate is 12
// L values (stop1→stop12). For every stop we compute the achromatic hex (C=0,
// H=0) via the engine's own OKLCH→linear-RGB conversion, plus the WCAG contrast
// of each stop vs stop1 (the dark app background). Rendered to ONE dark-canvas
// HTML, grouped by candidate, directly comparable side by side.
import * as fs from 'fs'
import * as path from 'path'
import { oklchToLinearRgb, wcagY, contrastRatio } from '../src/engine/constraints'

// sRGB encode a linear-light channel (clamped) — the engine works in linear RGB.
const srgbEncode = (c: number) => {
  const x = Math.max(0, Math.min(1, c))
  return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055
}
const hexOf = (L: number): string => {
  const [r, g, b] = oklchToLinearRgb(L, 0, 0)
  const ch = (v: number) => Math.round(srgbEncode(v) * 255).toString(16).padStart(2, '0')
  return `#${ch(r)}${ch(g)}${ch(b)}`
}

const ROLES = [
  'app bg', 'subtle bg', 'UI bg', 'hover UI bg', 'active UI bg',
  'subtle border', 'UI border', 'focus border', 'solid fill',
  'hover-solid', 'low-contrast text', 'high-contrast text',
]

interface Candidate { name: string; Ls: number[]; rationale: string; citation: string; source: string }
const CANDIDATES: Candidate[] = JSON.parse(process.env.CANDIDATES_JSON ?? '[]')

interface StopRow { stop: number; role: string; L: number; hex: string; contrastVsAppBg: number }
const buildStops = (c: Candidate): StopRow[] => {
  const bgY = wcagY(c.Ls[0], 0, 0)
  return c.Ls.map((L, i) => ({
    stop: i + 1,
    role: ROLES[i],
    L,
    hex: hexOf(L),
    contrastVsAppBg: Math.round(contrastRatio(wcagY(L, 0, 0), bgY) * 100) / 100,
  }))
}

// Contrast of an L value against a surface L.
const cAgainst = (L: number, surfaceL: number) => contrastRatio(wcagY(L, 0, 0), wcagY(surfaceL, 0, 0))
// On-fill text: white vs stop-1, pick whichever has higher contrast on the fill.
const onFillIsWhite = (fillL: number) =>
  contrastRatio(1, wcagY(fillL, 0, 0)) >= contrastRatio(wcagY(CANDIDATES[0]?.Ls[0] ?? 0.17, 0, 0), wcagY(fillL, 0, 0))

const data = CANDIDATES.map(c => ({ c, stops: buildStops(c) }))

// ── Build a contrast report (text stops 11/12 vs surfaces 1/2/3) ─────────────
const APCA_LIGHT_ON_DARK = (txtL: number, bgL: number) => {
  // APCA Lc magnitude for light text on dark bg, using engine's wcagY proxy is
  // wrong for APCA; recompute APCA Y from achromatic sRGB. Achromatic so r=g=b.
  const lin = oklchToLinearRgb(txtL, 0, 0)[0]
  const linBg = oklchToLinearRgb(bgL, 0, 0)[0]
  const apY = (linChan: number) => Math.max(0, Math.min(1, srgbEncode(linChan))) ** 2.4
  const tY = apY(lin), bY = apY(linBg)
  const fclamp = (Y: number) => (Y > 0.022 ? Y : Y + (0.022 - Y) ** 1.414)
  const t = fclamp(tY), b = fclamp(bY)
  if (t <= b) return 0 // not light-on-dark (text must be lighter than bg)
  // Light text on dark bg = reverse polarity (negative Lc); report magnitude.
  const sapc = (b ** 0.65 - t ** 0.62) * 1.14
  return sapc > -0.1 ? 0 : Math.round(Math.abs((sapc + 0.027) * 100) * 10) / 10
}

const reportLines: string[] = []
for (const { c, stops } of data) {
  const s11 = stops[10], s12 = stops[11]
  const surf = [stops[0], stops[1], stops[2]]
  const fmt = (s: StopRow, label: string) =>
    surf.map((sf, i) => {
      const cr = cAgainst(s.L, sf.L)
      const lc = APCA_LIGHT_ON_DARK(s.L, sf.L)
      return `vs stop${i + 1}: WCAG ${cr.toFixed(2)}${cr >= 4.5 ? ' OK' : ' FAIL'} / APCA Lc${lc}`
    }).join(' | ')
  reportLines.push(`${c.name}\n  stop11 (${fmt(s11, '11')})\n  stop12 (${fmt(s12, '12')})`)
}
const contrastReport = reportLines.join('\n')

// ── HTML render ──────────────────────────────────────────────────────────────
const swatchStrip = (stops: StopRow[]) =>
  stops.map(s => `<div class="sw" title="${s.role}">
    <span class="chip" style="background:${s.hex}"></span>
    <span class="swl">${s.stop}</span>
    <span class="swl mono">L${s.L.toFixed(3)}</span>
    <span class="swl mono">${s.hex}</span>
  </div>`).join('')

const mock = (stops: StopRow[]) => {
  const bg = stops[0], cardBg = stops[2], cardBg2 = stops[1], border = stops[6]
  const heading = stops[11], body = stops[10], fill = stops[8]
  const onFillWhite = onFillIsWhite(fill.L)
  const onFill = onFillWhite ? '#ffffff' : bg.hex
  return `<div class="mock" style="background:${bg.hex}">
    <div class="card" style="background:${cardBg.hex};border:1px solid ${border.hex}">
      <div class="mh" style="color:${heading.hex}">High-contrast heading</div>
      <div class="mb" style="color:${body.hex}">Low-contrast body text sits at stop 11. It needs to stay readable over the card surface (stop 3) and the subtle surface (stop 2) underneath.</div>
      <button class="mbtn" style="background:${fill.hex};color:${onFill}">Solid button</button>
      <div class="mb2" style="background:${cardBg2.hex};color:${body.hex}">Nested subtle surface (stop 2)</div>
    </div>
  </div>`
}

const contrastTable = (stops: StopRow[]) => {
  const surf = [stops[0], stops[1], stops[2]]
  const row = (s: StopRow) => `<tr>
    <td>stop${s.stop} ${s.role}</td>
    ${surf.map(sf => {
      const cr = cAgainst(s.L, sf.L)
      return `<td class="${cr >= 4.5 ? 'pass' : cr >= 3 ? 'warn' : 'fail'}">${cr.toFixed(2)}</td>`
    }).join('')}
  </tr>`
  return `<table class="ctab">
    <tr><th>text</th><th>vs stop1</th><th>vs stop2</th><th>vs stop3</th></tr>
    ${row(stops[10])}${row(stops[11])}
  </table>`
}

const candidateBlock = (c: Candidate, stops: StopRow[]) => `
  <section class="cand" style="background:${stops[0].hex}">
    <div class="chead">
      <h2>${c.name}</h2>
      <div class="meta">${c.source} · app bg ${stops[0].hex} (L${stops[0].L.toFixed(3)})</div>
    </div>
    <div class="ramp">${swatchStrip(stops)}</div>
    <div class="cols">
      <div class="col-mock">${mock(stops)}</div>
      <div class="col-tab">
        ${contrastTable(stops)}
        <p class="rat">${c.rationale}</p>
      </div>
    </div>
  </section>`

const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Achromatic dark L ladders — candidates for blessing</title>
<style>
  :root { color-scheme: dark; }
  body { font-family:-apple-system,system-ui,sans-serif; margin:0; padding:24px; background:#0c0d0e; color:#e6e6e6; }
  h1 { font-size:20px; margin:0 0 6px; color:#fff; }
  .note { font-size:12px; color:#9aa0a6; max-width:920px; line-height:1.55; margin:0 0 20px; }
  .grid { display:grid; grid-template-columns:1fr 1fr; gap:18px; align-items:start; }
  @media (max-width:1200px){ .grid { grid-template-columns:1fr; } }
  .cand { border:1px solid #2c2f34; border-radius:12px; padding:16px; }
  .chead h2 { font-size:14px; margin:0 0 2px; color:#fff; }
  .chead .meta { font-size:11px; color:#888; font-family:ui-monospace,monospace; margin-bottom:12px; }
  .ramp { display:flex; gap:4px; margin-bottom:14px; flex-wrap:nowrap; }
  .sw { display:flex; flex-direction:column; align-items:center; gap:2px; flex:1; min-width:0; }
  .chip { width:100%; height:40px; border-radius:4px; border:1px solid rgba(255,255,255,.14); }
  .swl { font-size:8.5px; color:#aaa; white-space:nowrap; }
  .swl.mono { font-family:ui-monospace,monospace; font-size:8px; }
  .cols { display:flex; gap:14px; align-items:flex-start; }
  .col-mock { flex:0 0 46%; } .col-tab { flex:1; min-width:0; }
  .mock { border-radius:10px; padding:14px; }
  .card { border-radius:10px; padding:16px; }
  .mh { font-size:15px; font-weight:700; margin-bottom:8px; }
  .mb { font-size:12px; line-height:1.5; margin-bottom:12px; }
  .mbtn { border:none; border-radius:8px; padding:9px 18px; font-size:13px; font-weight:600; cursor:pointer; box-shadow:0 1px 2px rgba(0,0,0,.4); }
  .mb2 { margin-top:12px; border-radius:6px; padding:8px 10px; font-size:11px; }
  .ctab { width:100%; border-collapse:collapse; font-size:10.5px; font-family:ui-monospace,monospace; }
  .ctab th, .ctab td { text-align:left; padding:3px 6px; border-bottom:1px solid rgba(255,255,255,.08); }
  .ctab th { color:#888; font-weight:500; }
  .ctab td.pass { color:#5fd38a; } .ctab td.warn { color:#e8c468; } .ctab td.fail { color:#e86b6b; }
  .rat { font-size:10.5px; color:#8b9096; line-height:1.5; margin:10px 0 0; }
</style></head><body>
<h1>Achromatic dark L ladders — candidates for blessing</h1>
<p class="note">Five candidate dark neutral L ladders (12 stops, all chroma=0, hue=0), computed through
the engine's own OKLCH→sRGB conversion. Dark canvas — each card sits on its own stop-1 app background.
For each: the 12-swatch ramp (L + hex), a real-use mock (card on stop 3, border stop 7, heading stop 12,
body stop 11, solid button stop 9), and WCAG contrast of text stops 11/12 vs surfaces 1/2/3.
Green = WCAG-AA (≥4.5), amber = ≥3.0, red = below. Greenfield dark-mode rebuild — every rule is up for grabs.</p>
<div class="grid">
  ${data.map(d => candidateBlock(d.c, d.stops)).join('')}
</div>
</body></html>`

const out = path.join(process.cwd(), 'dist', 'achromatic-dark-candidates.html')
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, html)

// Emit machine-readable data for the structured return.
const dump = data.map(d => ({ name: d.c.name, source: d.c.source, rationale: d.c.rationale, stops: d.stops }))
fs.writeFileSync(path.join(process.cwd(), 'dist', 'achromatic-dark-candidates.json'), JSON.stringify({ candidates: dump, contrastReport, htmlPath: out }, null, 2))
console.log(`wrote ${out}`)
console.log(`wrote ${path.join(process.cwd(), 'dist', 'achromatic-dark-candidates.json')}`)
console.log('\n=== CONTRAST REPORT ===\n' + contrastReport)
