// The Mapper's Stage-2 mapping table, as a reviewable exhibit: every Unify semantic
// token (values from the owner's 2026-08-11 v1.1 library scan) with proposed okchroma
// candidates. Swatches are rendered from the REAL engine for a #044BAF-primary theme
// (the white-label blue) — light + dark twins per candidate, since converted files
// gain a dark mode Unify never had. Classes: auto (one target), pick (owner chooses
// per group, usage-kind split applies), ignore (never touched). Owner corrections
// bake into plugin-unify/mapping.ts; nothing ships until then.
// Output: render/unify-mapping.html
import * as fs from 'fs'
import * as path from 'path'
import { resolveBrand, signalScalesFor } from '../src/engine/resolve'
import { generateNeutralScale, type GeneratedScale, type ColorStop } from '../src/engine/colorEngine'
import { stopHex, OFFSET_ALPHAS } from '../src/engine/cssRender'

const BRAND_HEX = '#044BAF'
const brand = resolveBrand(BRAND_HEX, 'white-label blue').scale
const neutral = generateNeutralScale(brand.brandH)
const signals = signalScalesFor(undefined)

const NAME_TO_STOP: Record<string, number> = {
  'paper-99': 1, 'paper-97': 2, 'paper-95': 3, 'wash-92': 4, 'wash-89': 5,
  'wash-85': 6, 'wash-80': 7, 'mark-74-aa': 8, 'ink-53-aa': 9, 'ink-42-aa': 10, 'ink-30-aaa': 11,
}

interface Cand { label: string; light: string; dark: string; why?: string }
const at = (arr: ColorStop[], stop: number) => stopHex(arr.find(s => s.stop === stop)!)
const famStop = (s: GeneratedScale, fam: string, name: string): Cand => ({
  label: `${fam}/${name}`, light: at(s.light, NAME_TO_STOP[name]), dark: at(s.dark, NAME_TO_STOP[name]),
})
const paper100: Cand = { label: 'neutral/paper-100', light: stopHex(neutral.paper0!), dark: stopHex(neutral.paper0Dark!) }
const offset = (rung: 8 | 16): Cand => ({
  label: `system/alpha/offset-${String(rung).padStart(2, '0')}`,
  light: `rgba(0,0,0,${OFFSET_ALPHAS[rung]})`, dark: `rgba(255,255,255,${OFFSET_ALPHAS[rung]})`,
})
const sig = (name: 'red' | 'yellow' | 'green') => signals.get(name)!.scale

interface Row {
  token: string; hex: string; alpha?: number; count: string; kinds: string
  cls: 'auto' | 'pick' | 'ignore' | 'suggest'
  cands: Cand[]
  note?: string
}
interface Section { title: string; rows: Row[] }

const n = (name: string) => famStop(neutral, 'neutral', name)
const b = (name: string) => famStop(brand, 'brand', name)

const SECTIONS: Section[] = [
  { title: 'Content palette', rows: [
    { token: 'Content Primary', hex: '#0E0F10', count: '~59.6k', kinds: 'text 34.9k · icon/fill 24.6k', cls: 'pick',
      cands: [n('ink-30-aaa'), n('ink-42-aa'), n('ink-53-aa'), n('mark-74-aa')],
      note: 'The fan-out token. Text (flat hierarchy) → the inks; icons can take mark-74-aa. Picks land per similar-element group, never per file.' },
    { token: 'Content Secondary', hex: '#515767', count: '~26.9k', kinds: 'text', cls: 'pick',
      cands: [n('ink-53-aa'), n('ink-42-aa')] },
    { token: 'Content Tertiary', hex: '#868FA2', count: '~2.4k', kinds: 'text', cls: 'pick',
      cands: [n('ink-53-aa')],
      note: 'Fails 4.5 on white; okchroma has no sub-compliant text rung by design, so tertiary text maps UP.' },
    { token: 'Content Primary Inverse', hex: '#FFFFFF', count: '~7.1k', kinds: 'text + fill', cls: 'auto',
      cands: [paper100] },
  ]},
  { title: 'Background palette', rows: [
    { token: 'Background Primary', hex: '#FFFFFF', count: '~5.3k', kinds: 'fill', cls: 'pick',
      cands: [paper100, n('paper-99')] },
    { token: 'Background Secondary', hex: '#F9FAFB', count: '~21.3k', kinds: 'fill', cls: 'pick',
      cands: [n('paper-99'), n('paper-97')] },
    { token: 'Background Tertiary', hex: '#EEEFF2', count: '~4.7k', kinds: 'fill', cls: 'pick',
      cands: [n('paper-95'), n('wash-92')] },
    { token: 'Background Primary Inverse', hex: '#0E0F10', count: '~0.5k', kinds: 'fill', cls: 'pick',
      cands: [n('ink-30-aaa'), n('ink-42-aa')],
      note: 'The dark plane used as a fill in light mode.' },
    { token: 'Background Scrim', hex: '#000000', alpha: 0.6, count: '9', kinds: 'fill', cls: 'suggest',
      cands: [],
      note: 'No okchroma primitive at this register; leftover list with a runtime suggestion.' },
  ]},
  { title: 'Stroke palette', rows: [
    { token: 'Stroke Primary', hex: '#0E0F10', count: '~0.4k', kinds: 'TEXT 365 (loose Unify usage)', cls: 'pick',
      cands: [n('ink-30-aaa')],
      note: 'Usages are mostly text — the usage-kind split routes them with Content Primary.' },
    { token: 'Stroke Secondary', hex: '#868FA2', count: '~1.8k', kinds: 'stroke + fill', cls: 'pick',
      cands: [n('ink-53-aa'), n('mark-74-aa')] },
    { token: 'Stroke Tertiary', hex: '#CBCFD7', count: '~4.2k', kinds: 'fill + stroke', cls: 'pick',
      cands: [n('mark-74-aa'), n('wash-80')] },
    { token: 'Stroke Quaternary', hex: '#E2E4E9', count: '~21.7k', kinds: 'stroke (the workhorse border)', cls: 'pick',
      cands: [n('wash-92'), n('wash-85'), n('wash-80'), n('mark-74-aa')],
      note: 'Unify quaternary is lighter than okchroma’s 3:1 border register (mark-74-aa); washes keep the decorative read, mark upgrades it to compliant.' },
    { token: 'Stroke Primary Inverse', hex: '#FFFFFF', count: '~1.4k', kinds: 'stroke', cls: 'auto',
      cands: [paper100] },
  ]},
  { title: 'Brand palette (rendered for the white-label blue) — suffix rules: Primary→marks+inks · Highlight→washes · Accent→papers · Spotlight→mark/ink-53', rows: [
    { token: 'Brand Primary', hex: '#044BAF', count: '~24.6k', kinds: 'stroke 19.3k · fill · text', cls: 'pick',
      cands: [b('mark-74-aa'), b('ink-53-aa'), b('ink-42-aa'), b('ink-30-aaa')],
      note: 'Primary = text (flat hierarchy) → the inks; focus rings (brand only) and icons → mark-74-aa. Identity is never a candidate.' },
    { token: 'Brand Primary Highlight', hex: '#8EB9F5', count: '~0.2k', kinds: 'stroke', cls: 'pick',
      cands: [b('wash-92'), b('wash-89'), b('wash-85'), b('wash-80')],
      note: 'Highlight = borders → any wash of the family.' },
    { token: 'Brand Primary Accent', hex: '#E6EFFB', count: '~0.4k', kinds: 'fill', cls: 'pick',
      cands: [b('paper-99'), b('paper-97'), b('paper-95')],
      note: 'Accent → any paper of the family.' },
  ]},
  { title: 'Signal palette (identity mapping: Error→red, Success→green, Warning→yellow) — same suffix rules per family', rows: [
    { token: 'Signal Error', hex: '#B42318', count: '~1.5k', kinds: 'text + fill + stroke', cls: 'pick',
      cands: [famStop(sig('red'), 'red', 'mark-74-aa'), famStop(sig('red'), 'red', 'ink-53-aa'), famStop(sig('red'), 'red', 'ink-42-aa'), famStop(sig('red'), 'red', 'ink-30-aaa')] },
    { token: 'Signal Error Highlight', hex: '#FECDCA', count: '~0.1k', kinds: 'stroke + fill', cls: 'pick',
      cands: [famStop(sig('red'), 'red', 'wash-92'), famStop(sig('red'), 'red', 'wash-89'), famStop(sig('red'), 'red', 'wash-85'), famStop(sig('red'), 'red', 'wash-80')] },
    { token: 'Signal Error Accent', hex: '#FEF3F2', count: '~0.04k', kinds: 'fill', cls: 'pick',
      cands: [famStop(sig('red'), 'red', 'paper-99'), famStop(sig('red'), 'red', 'paper-97'), famStop(sig('red'), 'red', 'paper-95')] },
    { token: 'Signal Success', hex: '#2A5F26', count: '~0.5k', kinds: 'mixed', cls: 'pick',
      cands: [famStop(sig('green'), 'green', 'mark-74-aa'), famStop(sig('green'), 'green', 'ink-53-aa'), famStop(sig('green'), 'green', 'ink-42-aa'), famStop(sig('green'), 'green', 'ink-30-aaa')] },
    { token: 'Signal Success Highlight', hex: '#A3DB9E', count: '~0.07k', kinds: 'stroke + fill', cls: 'pick',
      cands: [famStop(sig('green'), 'green', 'wash-92'), famStop(sig('green'), 'green', 'wash-89'), famStop(sig('green'), 'green', 'wash-85'), famStop(sig('green'), 'green', 'wash-80')] },
    { token: 'Signal Success Accent', hex: '#EBF5EA', count: '~0.06k', kinds: 'fill', cls: 'pick',
      cands: [famStop(sig('green'), 'green', 'paper-99'), famStop(sig('green'), 'green', 'paper-97'), famStop(sig('green'), 'green', 'paper-95')] },
    { token: 'Signal Warning', hex: '#804F00', count: '~0.3k', kinds: 'mixed', cls: 'pick',
      cands: [famStop(sig('yellow'), 'yellow', 'mark-74-aa'), famStop(sig('yellow'), 'yellow', 'ink-53-aa'), famStop(sig('yellow'), 'yellow', 'ink-42-aa'), famStop(sig('yellow'), 'yellow', 'ink-30-aaa')] },
    { token: 'Signal Warning Highlight', hex: '#FFE680', count: '~0.05k', kinds: 'stroke', cls: 'pick',
      cands: [famStop(sig('yellow'), 'yellow', 'wash-92'), famStop(sig('yellow'), 'yellow', 'wash-89'), famStop(sig('yellow'), 'yellow', 'wash-85'), famStop(sig('yellow'), 'yellow', 'wash-80')] },
    { token: 'Signal Warning Accent', hex: '#FFF9E5', count: '~0.07k', kinds: 'fill', cls: 'pick',
      cands: [famStop(sig('yellow'), 'yellow', 'paper-99'), famStop(sig('yellow'), 'yellow', 'paper-97'), famStop(sig('yellow'), 'yellow', 'paper-95')] },
    { token: '(Spotlight-suffixed vintages)', hex: '#B42318', count: '—', kinds: 'wherever a *Spotlight token appears', cls: 'pick',
      cands: [famStop(sig('red'), 'red', 'mark-74-aa'), famStop(sig('red'), 'red', 'ink-53-aa')],
      note: 'Spotlight → mark-74-aa or ink-53-aa of the family (red shown; the rule is per-family). Suffix-matched, so old and new Unify names both route.' },
  ]},
  { title: 'Merge palette (the overlay ladder)', rows: [
    { token: 'Merge Intensity 1–2', hex: '#0E0F10', alpha: 0.05, count: '~2.2k', kinds: 'fill (alphas .05 / .10)', cls: 'pick',
      cands: [offset(8)],
      note: 'Unify’s five-rung ladder lands on okchroma’s two offsets — 1–2 → offset-08.' },
    { token: 'Merge Intensity 3–5', hex: '#0E0F10', alpha: 0.15, count: '~0.2k', kinds: 'fill (alphas .15 / .20 / .25)', cls: 'pick',
      cands: [offset(16)],
      note: '3–5 → offset-16. If the collapse reads wrong anywhere, those spots go to the leftover list.' },
    { token: 'Merge Inverse 1/2/3/5', hex: '#FFFFFF', alpha: 0.1, count: '~0.14k', kinds: 'fill (white at alphas)', cls: 'pick',
      cands: [offset(8), offset(16)],
      note: 'The offsets are mode-flipped by construction (black in light, white in dark) — inverse merges ride the same rows.' },
  ]},
  { title: 'Odds and ignore-classes', rows: [
    { token: 'Skeleton loader Background/Fill', hex: '#E2E4E9', count: '4', kinds: 'fill', cls: 'pick',
      cands: [n('wash-85'), n('paper-95')] },
    { token: '(int) Elevation overlays', hex: '#FFFFFF', alpha: 0.02, count: '~39', kinds: 'fill (white at 0–.04)', cls: 'ignore',
      cands: [], note: 'okchroma elevation is the paper ladder; the overlay idiom drops.' },
    { token: '(int) Spectrum leaks (Gray/0, Eggplant, Absolute/Green)', hex: '#9648C7', count: '~47', kinds: 'doc pages', cls: 'ignore', cands: [] },
    { token: 'Doc systems (1. Color modes, property documentation, Doc Variables, Conversational UI’s own, …)', hex: '#9747FF', count: '~7k', kinds: 'documentation scaffolding', cls: 'ignore',
      cands: [], note: 'These style the documentation, not product UI. Never touched.' },
  ]},
  { title: 'Detached fills (hex-matched, ride the token above them)', rows: [
    { token: '#EEEFF2 detached', hex: '#EEEFF2', count: '2,602', kinds: 'fill', cls: 'pick',
      cands: [n('paper-95'), n('wash-92')], note: 'Rides Background Tertiary’s pick.' },
    { token: '#000000 detached text', hex: '#000000', count: '3,586', kinds: 'text', cls: 'pick',
      cands: [n('ink-30-aaa')], note: 'The detached dark-text mass; rides Content Primary’s pick.' },
    { token: '#FFFFFF detached', hex: '#FFFFFF', count: '433', kinds: 'text + fill + stroke', cls: 'pick',
      cands: [paper100] },
    { token: '#95979D detached text', hex: '#95979D', count: '70', kinds: 'text', cls: 'pick',
      cands: [n('ink-53-aa')], note: 'Rides Content Tertiary’s pick.' },
  ]},
]

const clsChip = (c: Row['cls']) =>
  c === 'auto' ? '<span class="chip auto">auto</span>'
  : c === 'pick' ? '<span class="chip pick">pick</span>'
  : c === 'suggest' ? '<span class="chip sug">suggest</span>'
  : '<span class="chip ign">ignore</span>'

const candHtml = (c: Cand) => `
  <span class="cand">
    <span class="pair"><span class="swl" style="background:${c.light}"></span><span class="swd" style="background:${c.dark}"></span></span>
    <span class="cl">${c.label}</span>
  </span>`

const rowHtml = (r: Row) => `
  <div class="mrow${r.cls === 'ignore' ? ' dim' : ''}">
    <div class="left">
      <span class="usw" style="background:${r.alpha !== undefined && r.alpha < 1 ? `rgba(${parseInt(r.hex.slice(1, 3), 16)},${parseInt(r.hex.slice(3, 5), 16)},${parseInt(r.hex.slice(5, 7), 16)},${r.alpha})` : r.hex}"></span>
      <div class="meta">
        <div class="tk">${r.token}</div>
        <div class="sub">${r.hex}${r.alpha !== undefined && r.alpha < 1 ? ` @ ${r.alpha}` : ''} · ${r.count} · ${r.kinds}</div>
      </div>
    </div>
    ${clsChip(r.cls)}
    <div class="cands">${r.cands.map(candHtml).join('')}</div>
    ${r.note ? `<div class="note">${r.note}</div>` : ''}
  </div>`

const html = `<!doctype html><meta charset="utf-8"><title>Unify → okchroma mapping — review draft</title>
<body style="margin:0;font-family:-apple-system,sans-serif;background:#fafafa;color:#1a1a1a">
<div style="max-width:980px;margin:0 auto;padding:30px 24px 60px">
<h1 style="font-size:18px;margin:0 0 4px">Unify → okchroma mapping (review draft)</h1>
<p style="color:#777;font-size:13px;margin:0 0 8px">Values from the 2026-08-11 library scan. okchroma swatches rendered by the engine for the white-label blue (#044BAF); each candidate shows its light + dark twin. Nothing here is baked until you correct it.</p>
<p style="color:#777;font-size:13px;margin:0 0 8px"><b>auto</b> = one target, applied when you hit apply · <b>pick</b> = the plugin lists these per group and you choose · <b>suggest</b> = no table row, nearest candidates offered at runtime · <b>ignore</b> = never touched.</p>
<p style="color:#777;font-size:13px;margin:0 0 22px">Suffix rules (owner 2026-08-11): <b>Primary</b> → marks + inks of the family (text · focus rings, brand only · icons) · <b>Highlight</b> → any wash · <b>Accent</b> → any paper · <b>Spotlight</b> → mark-74-aa or ink-53-aa · never identity. Matching is key + suffix based, so old and new Unify names both route. Picks land <b>per similar-element group</b> (token × usage kind × nearest component), never per file or page. Link is parked as the known tricky case.</p>
<style>
.sect{margin:0 0 26px}
.st{font-size:12px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;color:#888;margin:0 0 8px}
.mrow{display:grid;grid-template-columns:300px 64px 1fr;gap:8px 14px;align-items:center;background:#fff;border:1px solid #e8e8ea;border-radius:10px;padding:10px 14px;margin-bottom:6px}
.mrow.dim{opacity:.55}
.left{display:flex;gap:10px;align-items:center;min-width:0}
.usw{width:26px;height:26px;border-radius:6px;border:1px solid rgba(0,0,0,.12);flex-shrink:0}
.tk{font-size:13px;font-weight:600}
.sub{font-size:11px;color:#999}
.chip{font-size:10px;font-weight:700;border-radius:4px;padding:3px 8px;text-align:center}
.chip.auto{background:#e5f3e6;color:#1d7a2c}.chip.pick{background:#efeafd;color:#5d43c9}
.chip.sug{background:#fdf1e2;color:#a05a00}.chip.ign{background:#f0f0f2;color:#999}
.cands{display:flex;flex-wrap:wrap;gap:6px 14px}
.cand{display:inline-flex;align-items:center;gap:6px}
.pair{display:inline-flex;border-radius:5px;overflow:hidden;border:1px solid rgba(0,0,0,.12)}
.swl,.swd{width:17px;height:20px;display:inline-block}
.swd{background-color:#111}
.cl{font-size:11.5px;font-weight:600;color:#444}
.note{grid-column:1/-1;font-size:11.5px;color:#8a6d3b;background:#fdf8ee;border-radius:6px;padding:5px 9px}
</style>
${SECTIONS.map(s => `<div class="sect"><div class="st">${s.title}</div>${s.rows.map(rowHtml).join('')}</div>`).join('')}
</div></body>`

const out = path.join(process.cwd(), 'render', 'unify-mapping.html')
fs.writeFileSync(out, html)
console.log(`wrote ${out}`)
