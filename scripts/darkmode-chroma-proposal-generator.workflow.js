export const meta = {
  name: 'darkmode-chroma-proposal-generator',
  description: 'Research + synthesize + draft candidate dark-mode chroma-reduction proposals grounded in the okchroma engine; outputs a tweakable starting proposal',
  phases: [
    { title: 'Research', detail: 'parallel facets: chroma magnitude/L, hue-dependence, contrast/anti-halo, engine grounding' },
    { title: 'Generate', detail: 'three distinct candidate proposals' },
    { title: 'Synthesize', detail: 'one decision-ready starting proposal + open questions' },
  ],
}

const REPO = args.repo
const SEED = JSON.stringify(args.seed, null, 2)
const GOAL = args.goal

const FACETS = [
  { key: 'chroma-magnitude', q: `How much should chroma be reduced in dark mode, and how should the reduction depend on LIGHTNESS? Find concrete numbers/curves (percent reductions, multipliers by L, elevation-dependent pull-back). Reconcile the seed's two data points (brainy.ink 15-25% accents + more on text/borders + pull back as elevation rises; Builderius symmetric taper). Web-search for additional concrete anchors if useful. Output: concrete reduction magnitudes + an L-dependence shape with numbers.` },
  { key: 'hue-dependence', q: `Which HUES need MORE chroma reduction (or special handling) in dark mode, and why? Cover perceptual reasons (blue/violet glow & vibration on dark, yellow/green can't go dark-saturated, red bloom, gamut limits at low L). Give a per-hue reduction tendency (which hue bands pull harder) with rough factors if the literature supports them. Web-search for perceptual evidence (chromatic glare, abney/bezold-brucke shifts at low luminance) if useful.` },
  { key: 'contrast-antihalo', q: `Lightness/contrast rules for dark mode that interact with chroma: off-white (not pure-white) text & the anti-halo principle, APCA vs WCAG, contrast CEILING (dark not louder than light), shimmer/bloom avoidance. Quantify where possible (e.g. cap text at L~0.90-0.93, fill contrast ceiling). This constrains how aggressive chroma reduction can be before fills go muddy/invisible.` },
]

const groundPrompt = `Read the okchroma dark-chroma machinery in ${REPO} and report the EXACT injection points + current values for a dark-only chroma reduction. Read: src/engine/colorEngine.ts (the dark ramp loop ~lines 575-595, the dark fill dark9L/darkC9 ~568-573, the chromaCurve seam 'cAt' + GenerateOptions.chromaCurve, applyChromaFloor), src/engine/stopTable.ts (DARK_STOPS, ACCENT_DARK_STOPS, DARK_STOP_11/12, the chromaMultiplier convention), src/engine/resolve.ts (which opts each ramp passes; subtleChromaScale for signals). Output: (1) every site where dark chroma is set, with line numbers + the current expression; (2) whether the chromaCurve seam can be reused to SCALE (not just replace) chroma, or whether a new 'darkChromaScale(L,H)' hook is cleaner; (3) the cleanest single place to apply a dark-only L&H reduction so it covers fill + subtle stops + text stops; (4) note the signal subtleChromaScale interaction (don't double-count).`

const PROPOSAL_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    name: { type: 'string' },
    oneLiner: { type: 'string' },
    reductionModel: { type: 'string', description: 'the concrete math: how reduce(L,H) is defined, with numbers — multipliers, curve anchors, per-hue factors' },
    lAnchors: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { L: { type: 'number' }, factor: { type: 'number' } }, required: ['L', 'factor'] }, description: 'chroma-retention factor (0-1) by lightness in DARK mode' },
    hueHandling: { type: 'string', description: 'how hue modulates the reduction, with rough per-hue-band factors' },
    plugsInto: { type: 'string', description: 'exact engine injection point (cite the ground report)' },
    expectedEffect: { type: 'string' },
    tradeoffs: { type: 'array', items: { type: 'string' } },
  },
  required: ['name', 'oneLiner', 'reductionModel', 'lAnchors', 'hueHandling', 'plugsInto', 'expectedEffect', 'tradeoffs'],
}

phase('Research')
const research = await parallel([
  ...FACETS.map(f => () => agent(
    `You are researching one facet of DARK-MODE color math to inform an engine design. Goal: ${GOAL}\n\nSeed data already gathered:\n${SEED}\n\nFACET: ${f.q}\n\nYou may load WebSearch/WebFetch via ToolSearch for additional concrete anchors, but the seed is strong — prioritize CONCRETE, NUMERIC, actionable findings over prose. Cite sources.`,
    { label: `research:${f.key}`, phase: 'Research' }
  )),
  () => agent(groundPrompt, { label: 'research:engine-ground', phase: 'Research' }),
])
const researchBlob = research.filter(Boolean).join('\n\n---\n\n')

phase('Generate')
const ANGLES = [
  { key: 'minimal', lens: `MINIMAL / shippable-tomorrow: a flat-ish dark chroma reduction (e.g. a single ~20-25% accent cut + a steeper cut on text/border stops), L-dependence only, hue held constant. Smallest change, lowest risk. Make it concrete and easy to wire via the chromaCurve seam or a darkChromaScale.` },
  { key: 'l-taper', lens: `L-AWARE TAPER: a chroma-retention curve by lightness (Builderius-style taper adapted to be dark-SPECIFIC, i.e. an extra reduction in dark on top of light), concentrated where we're hot (fill + boosted signal surfaces), conservative where we're already below the curve. No hue term yet.` },
  { key: 'lh-full', lens: `L&H-AWARE (the owner's target): reduce(L,H) with both a lightness-retention curve AND per-hue factors (hues that glow/vibrate in dark pull harder). The most faithful to best-practice; flag the extra calibration it needs.` },
]
const proposals = await parallel(ANGLES.map(a => () => agent(
  `Author ONE candidate dark-mode chroma-reduction proposal for the okchroma engine. Goal: ${GOAL}\n\nResearch + engine-grounding from this run:\n${researchBlob}\n\nSeed:\n${SEED}\n\nYOUR ANGLE: ${a.lens}\n\nBe concrete and numeric — the owner will tweak this tomorrow, so give real starting numbers (retention factors by L, per-hue factors if applicable), name the exact engine injection point, and state the expected visible effect + tradeoffs. Do NOT touch lightness — chroma only.`,
  { label: `generate:${a.key}`, phase: 'Generate', schema: PROPOSAL_SCHEMA }
)))
const valid = proposals.filter(Boolean)

phase('Synthesize')
const synthesis = await agent(
  `Synthesize these three dark-mode chroma-reduction proposals into ONE decision-ready STARTING proposal for the okchroma owner to tweak tomorrow.\n\nProposals (JSON):\n${JSON.stringify(valid, null, 2)}\n\nResearch:\n${researchBlob}\n\nProduce, in clean markdown:\n1. A RECOMMENDED starting point (which proposal or hybrid), with the concrete reduce(L,H) math and starting numbers in a small table.\n2. Exactly where it plugs into the engine (cite the grounding) and how it composes with the existing chromaMultipliers + signal subtleChromaScale WITHOUT double-counting.\n3. What it changes visibly (fill, signal surfaces, text) and what it deliberately leaves alone (lightness).\n4. The open questions / knobs to calibrate tomorrow (per-hue factors, the contrast floor so fills don't go muddy, whether to also cap text at off-white).\nKeep it tight and actionable — this becomes the starting spec.`,
  { label: 'synthesize', phase: 'Synthesize' }
)

return { synthesis, proposals: valid, research: research.filter(Boolean) }
