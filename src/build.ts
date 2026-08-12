import * as fs from 'fs'
import * as path from 'path'
import { signalsCss } from './engine/cssRender'

// WCAG IS THE SHIPPED LANE (owner 2026-07-29). It was 'apca' from 2026-07-04, when the
// two lanes were a real product choice: the page carried the perceptually-solved look and
// wcag was the opt-in legal mode. That choice is closed — the owner is not authorised to
// use APCA for design decisions, and this round removed its last exposure (the enterprise
// plugin's column pair). Generated CSS now matches the lane actually in use.
// ⚠️ This MOVES generated colour, independently of the highlight collapse: the two lanes
// place the focus ring and the cta differently (the washes are identical). withProfile is
// still the identity for 'wcag', so the engine is unchanged — only which lane is emitted.
const SHIPPED_PROFILE = 'wcag' as const

// Per-brand CSS (brands.css) is gone — nothing visible ever consumed it (the demo pages
// generate CSS live in-browser via resolveBrand + cssRender, and the old hidden gallery
// that read it was removed alongside src/brands.ts + src/secondaries.ts). signals.css is
// still real output: it's a fixed, brand-independent block the demo pages link directly.

function run() {
  const distDir = path.join(__dirname, '..', 'dist')
  fs.mkdirSync(distDir, { recursive: true })

  // signals.css
  fs.writeFileSync(path.join(distDir, 'signals.css'), signalsCss(SHIPPED_PROFILE))
  console.log('  signals.css')

  console.log('Token generation complete.')
}

run()
