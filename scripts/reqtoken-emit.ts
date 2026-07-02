// reqtoken-emit.ts — Phase 6: emit the FULL first-slice requirement declaration as a DTCG token document.
// Every stop token carries a frozen $value fallback (any DTCG tool reads a valid color) + the live requirement
// in $extensions['org.okchroma.requirement'] (a requirement-aware resolver re-resolves from it — proven by
// scripts/reqtoken-portability.ts). Usage: node dist/reqtoken-emit.js [seedHex]
import { writeFileSync, mkdirSync } from 'fs'
import { emitDtcgRamp, RESOLVER_ID } from '../src/reqtoken/dtcg'

const seed = process.argv[2] ?? '#3060c0'
const doc = {
  $description: `okchroma requirement tokens — resolved fallbacks for seed ${seed}; live requirements in $extensions (resolver: ${RESOLVER_ID})`,
  brand: {
    light: emitDtcgRamp(seed, 'light', 'brand.light'),
    dark: emitDtcgRamp(seed, 'dark', 'brand.dark'),
  },
}

mkdirSync('out', { recursive: true })
const path = 'out/reqtoken.tokens.json'
writeFileSync(path, JSON.stringify(doc, null, 2) + '\n')
const count = (g: object) => Object.keys(g).filter(k => k !== 'seed' && k !== '$extensions').length
console.log(`emitted ${count(doc.brand.light)} light + ${count(doc.brand.dark)} dark requirement tokens for ${seed} → ${path}`)
