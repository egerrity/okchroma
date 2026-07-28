// Style lever — dressing layers for the PREVIEW dashboard ONLY (owner 2026-07-24:
// the workshop/palette and the app chrome never restyle). RULE (owner, same day):
// every element keeps LITERALLY the same color tokens as Clean — a style may only
// change TREATMENT (type, radius, stroke weight, shadow shape, texture) and
// ARRANGEMENT (density, scale). Where a style adds a feature Clean lacks (retro's
// strokes), it uses the system's existing color for that job (--border-default),
// never a new color assignment. Shadows stay in the achromatic shadow register.
// Clean = the shipped default, zero overrides. Every selector is rooted inside
// .dash so nothing outside the preview is reachable.

export type DemoStyle = 'clean' | 'retro' | 'bubble'
export const STYLE_OPTIONS: Array<[DemoStyle, string]> = [
  ['clean', 'Clean'], ['retro', 'Retro'], ['bubble', 'Bubble'],
]

export const STYLE_CSS = /* css */ `
/* ═══ RETRO — geocities elevated: flat & chunky, no 3D, no curves. Same colors,
   different clothes; the dashboard is a DESKTOP OF WINDOWS. THREE-LEVEL LADDER
   (owner's 2026-07-27 Figma card set — one 4px flat offset everywhere, the
   SHADOW COLOR fades down the ladder and the stroke fades with it):
     +2 hero    titlebar + brand-black shadow + highlight-9 stroke → Customers (pop plane)
     +1 cards   wash-7 grey shadow + highlight-8 stroke            → Get started, Activity, sidebar
     −1 metrics surface-pop shadow (punched in) + wash-4 stroke    → metric tiles (compact)
     ctas       ink-12 border + ink-10 shadow                      → primary/secondary cta buttons
   Every shadow color is a token (or the brand mix), so DARK FALLS OUT of the
   swap — no bespoke dark block (owner ruling 2026-07-27). */
[data-style="retro"] .dash {
  font-family: "SF Mono", Menlo, ui-monospace, monospace;
  font-variant-numeric: tabular-nums;
  --rt-line: var(--border-default);
  --rt-shadow: color-mix(in srgb, var(--brand-cta) 45%, black);
  --elev-card: 4px 4px 0 var(--neutral-wash-7);
  --elev-pop: 4px 4px 0 var(--rt-shadow);
  --elev-float: 7px 7px 0 var(--rt-shadow);
  background-image: repeating-linear-gradient(0deg, rgba(0,0,0,.02) 0 1px, transparent 1px 3px);
}
[data-style="retro"] [data-theme="dark"] .dash {
  background-image: repeating-linear-gradient(0deg, rgba(255,255,255,.02) 0 1px, transparent 1px 3px);
}
/* hard square corners for EVERYTHING inside the preview — retro has no curves */
[data-style="retro"] .dash, [data-style="retro"] .dash * { border-radius: 0 !important; }
/* +1 default: chunky keyline (one stop lighter than the hero's) + grey flat shadow */
[data-style="retro"] .dash .dash-card,
[data-style="retro"] .dash .dash-side {
  border: 2.5px solid var(--neutral-highlight-8) !important;
  box-shadow: var(--elev-card) !important;
}
/* +2 hero: the full-strength keyline + the brand-black shadow */
[data-style="retro"] .dash .dash-card-customers {
  border: 2.5px solid var(--rt-line) !important;
  box-shadow: var(--elev-pop) !important;
}
/* +2 hero ONLY: the action titlebar — BRAND ink-11 fill (owner: bar is a brand
   color), control squares in its wash partner (the active-nav pair, swapped);
   slimmed to 24px in the owner's 2026-07-27 set */
[data-style="retro"] .dash .dash-card-customers { position: relative; padding-top: 24px !important; }
[data-style="retro"] .dash .dash-card-customers::before {
  content: ""; position: absolute; top: 0; left: 0; right: 0; height: 24px;
  background-color: var(--brand-ink-11);
  border-bottom: 2.5px solid var(--rt-line);
  background-image:
    linear-gradient(var(--brand-wash-5), var(--brand-wash-5)),
    linear-gradient(var(--brand-wash-5), var(--brand-wash-5)),
    linear-gradient(var(--brand-wash-5), var(--brand-wash-5));
  background-size: 7px 7px;
  background-position: right 9px center, right 22px center, right 35px center;
  background-repeat: no-repeat;
}
/* the card TITLE lives in the bar (owner) — lifted out of the body flow and
   recolored with the bar's own pair partner; the sub stays in the body */
[data-style="retro"] .dash .dash-hero-head > div > div:first-child {
  position: absolute; top: 0; left: 14px; height: 24px; z-index: 1;
  display: flex; align-items: center;
  color: var(--brand-wash-5);
  font-size: 11px !important; font-weight: 700 !important;
  text-transform: uppercase; letter-spacing: .14em;
}
/* −1: metric tiles PUNCH IN — faint stroke + a surface-pop flat shadow (paper
   token, so it stays a knockout in light and falls out correctly in dark) */
[data-style="retro"] .dash .dash-metric {
  border: 2.5px solid var(--neutral-wash-4) !important;
  box-shadow: 4px 4px 0 var(--surface-pop) !important;
  padding: 10px 12px !important;
}
[data-style="retro"] .dash .dash-metric-value {
  font-size: 18px !important; font-weight: 700 !important; margin: 2px 0 !important;
}
[data-style="retro"] .dash .dash-metrics { gap: 10px; margin-bottom: 12px; }
/* buttons: L4 stroke by default; L5 for the cta tiers — ink-12 border, ink-10
   flat shadow (owner spec), press collapses into the surface */
[data-style="retro"] .dash button { border: 2px solid var(--rt-line); }
[data-style="retro"] .dash .u-btn-primary,
[data-style="retro"] .dash .u-btn-secondary {
  border: 2px solid var(--ink-12) !important;
  box-shadow: 3px 3px 0 var(--brand-ink-10);
  transition: transform 90ms ease, box-shadow 90ms ease;
}
[data-style="retro"] .dash .u-btn-primary:active,
[data-style="retro"] .dash .u-btn-secondary:active {
  transform: translate(3px, 3px); box-shadow: 0 0 0 var(--brand-ink-10);
}
/* INVERTED SELECTION — the active item swaps its own fill/text pair */
[data-style="retro"] .dash .dash-navitem.active {
  background: var(--brand-ink-11) !important;
  color: var(--brand-wash-5) !important;
}
/* terminal grammar */
[data-style="retro"] .dash .dash-navitem {
  text-transform: uppercase; letter-spacing: .08em; font-size: 11px;
}
[data-style="retro"] .dash .dash-search {
  border: 2px solid var(--rt-line);
  text-transform: uppercase; letter-spacing: .1em; font-size: 11px;
}
[data-style="retro"] .dash .dash-search::before { content: "> "; font-weight: 700; }
/* status pills — uppercase mono tags, their own colors (owner: no brackets) */
[data-style="retro"] .dash .dash-pill {
  text-transform: uppercase; letter-spacing: .06em; font-weight: 700; font-size: 10px;
}
/* the customers table reads as a LEDGER — the inset header bar keeps its own
   sink color (owner: don't recolor it), dashed rules, letterspaced heads */
[data-style="retro"] .dash .dash-table td { border-bottom: 2px dashed var(--neutral-wash-5) !important; }
[data-style="retro"] .dash .dash-table th { letter-spacing: .12em; }
/* honest links — underlined, chunky */
[data-style="retro"] .dash a { text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: 3px; }
/* square focus, dotted — the classic */
[data-style="retro"] .dash :focus-visible { outline: 2px dotted var(--rt-line); outline-offset: 2px; }
[data-style="retro"] .dash .dash-grid { gap: 10px; }

/* ═══ BUBBLE (soft-UI/neumorphic; was "skeuo", owner rename 2026-07-24) — soft &
   round, elevation is ALL shadow (owner 4.1); card treatment reworked to the
   owner's 2026-07-27 Figma variant set (her stacks, read back verbatim — the
   brand glazes are gone with it). Same colors: surfaces keep their Clean planes.
   THREE levels:
     +2 hero    PLAIN pop fill + quiet brand-grey shade + spread key light + ambient ring
     +1 cards   lift fill + layered white key light + tight rim + brand-grey shade
     −1 metrics sink→base gradient + COLORED inners (wash tokens) + outer white rim
   No borders, everything pillowed. */
[data-style="bubble"] .dash {
  font-family: ui-rounded, "SF Pro Rounded", -apple-system, system-ui, sans-serif;
  --nm-lt: rgba(255,255,255,.8);
  --nm-dk: rgba(0,0,0,.14);
  --nm-dks: rgba(0,0,0,.09);
  /* the shade — the owner's eyedrop #354d43 (teal seed) kept GENERATIVE: cta
     pulled 70% toward mid-grey, so every brand shades with its own quiet
     warmth. Display-only, no token minted (owner ruling 2026-07-27). */
  --nm-shade: color-mix(in srgb, var(--brand-cta) 30%, #4d4d4d);
  /* +1 — her style=bubble, level=+1 variant */
  --bb-plateau:
    10px 10px 20px color-mix(in srgb, var(--nm-shade) 8%, transparent),
    -10px -10px 16px 4px rgba(255,255,255,.5),
    -2px -2px 8px -1px rgba(255,255,255,1),
    inset 1px 1.5px 3px rgba(255,255,255,1);
  /* +2 — her level=+2 variant. Fill stays PLAIN pop (owner: the lift→pop
     gradient only existed to pop the edge light — revisit if the emphasis
     goes missing). */
  --bb-pop:
    10px 10px 20px color-mix(in srgb, var(--nm-shade) 2%, transparent),
    -10px -10px 14px 10px rgba(255,255,255,.2),
    -2px -2px 8px -1px rgba(255,255,255,.8),
    0 0 8px -2px color-mix(in srgb, var(--nm-shade) 20%, transparent),
    inset 1px 1.5px 3px rgba(255,255,255,1);
  /* −1 — her level=−1 variant: the inners ride the wash TOKENS, so the recess
     colors fall out per theme */
  --bb-recess:
    inset 0 0 10.6px -1px var(--neutral-wash-4),
    inset 0 2px 2px -2px var(--neutral-wash-6),
    0 0 24px 24px rgba(255,255,255,.1),
    0 1px 0 rgba(255,255,255,.7);
  /* recessed physics for the SMALL wells (search, illo, hover) — unchanged:
     shadow INSIDE all around, light on the OUTER edge, never light in a hole */
  --recess: inset 0 2px 5px rgba(0,0,0,.09), inset 0 0 6px rgba(0,0,0,.05), 0 1px 0 rgba(255,255,255,.7);
  --recess-sm: inset 0 1px 3px rgba(0,0,0,.08), inset 0 0 3px rgba(0,0,0,.04), 0 1px 0 rgba(255,255,255,.6);
}
[data-style="bubble"] [data-theme="dark"] .dash {
  --nm-lt: rgba(255,255,255,.03);
  --nm-dk: rgba(0,0,0,.65);
  --nm-dks: rgba(0,0,0,.5);
  --recess: inset 0 2px 6px rgba(0,0,0,.6), inset 0 0 7px rgba(0,0,0,.4), 0 1px 0 rgba(255,255,255,.04);
  --recess-sm: inset 0 1px 3px rgba(0,0,0,.55), inset 0 0 4px rgba(0,0,0,.3), 0 1px 0 rgba(255,255,255,.03);
}
/* +1 default: pillowed cards — her plateau stack, generous radius. LIGHT LOGIC
   (owner): light comes from the TOP-LEFT — key light up-left, shade down-right. */
[data-style="bubble"] .dash .dash-card {
  border: 0 !important; border-radius: 24px !important;
  box-shadow: var(--bb-plateau) !important;
  padding: 20px !important;
}
/* +2 hero = Customers ONLY (owner: Get started is attached — it stays on the
   plateau default above) */
[data-style="bubble"] .dash .dash-card-customers {
  border: 0 !important; border-radius: 24px !important;
  box-shadow: var(--bb-pop) !important;
}
/* −1: metric tiles recede — her recess: the fill shades diagonally toward the
   light (top-left sink → bottom-right base, both plane tokens over the Clean
   sink fill) under the colored inners */
[data-style="bubble"] .dash .dash-metric {
  border: 0 !important;
  box-shadow: var(--bb-recess) !important;
  padding: 20px !important;
  background-image: linear-gradient(109deg, var(--surface-sink) 22%, var(--surface-base)) !important;
}
/* the side menu FLOATS (owner): a lifted container off the ground — margins,
   big radius, the card pillow */
[data-style="bubble"] .dash .dash-side {
  margin: 16px 0 16px 16px; border-radius: 24px;
  box-shadow: var(--bb-plateau);
}
/* DARK (owner principle 2026-07-24, approved that round: treatment amounts
   adjust to the CONTRAST AROUND them — lights whisper, darks strong; near black
   a broad white glow is a halo). The approved dark ladder re-expressed over the
   new stacks; the recess keeps its colored inners (the wash tokens already
   swapped) and DROPS the broad white ring. */
[data-style="bubble"] [data-theme="dark"] .dash .dash-card {
  box-shadow: -1px -1px 3px rgba(255,255,255,.03), 4px 5px 9px rgba(0,0,0,.65), 0 0 4px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.06) !important;
}
[data-style="bubble"] [data-theme="dark"] .dash .dash-card-customers {
  box-shadow: -2px -2px 6px rgba(255,255,255,.05), 6px 8px 16px rgba(0,0,0,.55), 6px 14px 22px -12px rgba(0,0,0,.65), inset 0 1px 0 rgba(255,255,255,.10), inset 0 -1px 0 rgba(255,255,255,.04), inset 0 -2.5px 2px rgba(0,0,0,.55) !important;
}
[data-style="bubble"] [data-theme="dark"] .dash .dash-side {
  box-shadow: -1px -1px 3px rgba(255,255,255,.03), 4px 5px 9px rgba(0,0,0,.65), 0 0 4px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.06);
}
/* the recess DARK (owner correction 2026-07-28: invert the SURFACES, keep the
   LIGHT — the raw wash tokens flip LIGHTER than the dark sink fill, which turned
   the inner shadow into a glow-in-the-hole. The inners keep their wash tint but
   mixed toward dark (shadows are always dark), so the well reads dark with the
   light catching only the outer bottom lip). */
[data-style="bubble"] [data-theme="dark"] .dash .dash-metric {
  box-shadow:
    inset 0 0 10.6px -1px color-mix(in srgb, var(--neutral-wash-4) 25%, rgba(0,0,0,.72)),
    inset 0 2px 2px -2px color-mix(in srgb, var(--neutral-wash-6) 25%, rgba(0,0,0,.85)),
    0 1px 0 rgba(255,255,255,.05) !important;
}
/* selection physics (owner): the SELECTED item pops UP (pillow, keeps its own
   color); HOVER presses IN — colorless, inset only */
[data-style="bubble"] .dash .dash-navitem { border-radius: 999px; }
[data-style="bubble"] .dash .dash-navitem.active {
  box-shadow: -2px -2px 5px var(--nm-lt), 3px 4px 8px var(--nm-dks);
}
[data-style="bubble"] .dash .dash-navitem:hover:not(.active) {
  background: transparent !important;
  box-shadow: var(--recess-sm);
}
/* sunken wells: dual inset — same sink color, deeper treatment */
[data-style="bubble"] .dash .dash-search {
  border: 0 !important; border-radius: 999px;
  box-shadow: var(--recess);
}
/* the pillow buttons, GRADED BY TIER (owner: neutral least → secondary mid →
   primary heaviest) — same sheen/under-curve/drop physics, scaled; press sinks
   into the surface (shade stays dark, never a halo) */
[data-style="bubble"] .dash .u-btn-neutral {
  border: 0 !important;
  box-shadow:
    0 2px 6px -2px rgba(0,0,0,.18),
    inset 0 1px 0 rgba(255,255,255,.35),
    inset 0 -1px 0 rgba(255,255,255,.22),
    inset 0 -1.5px 1.5px rgba(0,0,0,.05);
  transition: box-shadow .15s ease;
}
[data-style="bubble"] .dash .u-btn-secondary {
  border: 0 !important;
  box-shadow:
    0 4px 9px -2px rgba(0,0,0,.26),
    inset 0 1px 0 rgba(255,255,255,.3),
    inset 0 -1px 0 rgba(255,255,255,.2),
    inset 0 -2px 2px rgba(0,0,0,.09);
  transition: box-shadow .15s ease;
}
[data-style="bubble"] .dash .u-btn-primary {
  border: 0 !important;
  box-shadow:
    0 6px 14px -2px rgba(0,0,0,.4),
    inset 0 1.5px 0 rgba(255,255,255,.32),
    inset 0 -1px 0 rgba(255,255,255,.22),
    inset 0 -2px 2px rgba(0,0,0,.14);
  transition: box-shadow .15s ease;
}
[data-style="bubble"] .dash .u-btn-primary:active,
[data-style="bubble"] .dash .u-btn-secondary:active,
[data-style="bubble"] .dash .u-btn-neutral:active {
  box-shadow: inset 0 3px 8px rgba(0,0,0,.28), inset 0 0 6px rgba(0,0,0,.14), 0 1px 0 rgba(255,255,255,.4);
}
/* press DARK: same physics, dark-calibrated amounts (darks strong, lights
   whisper — the light .4 outer lip is a mini-halo on the near-black page) */
[data-style="bubble"] [data-theme="dark"] .dash .u-btn-primary:active,
[data-style="bubble"] [data-theme="dark"] .dash .u-btn-secondary:active,
[data-style="bubble"] [data-theme="dark"] .dash .u-btn-neutral:active {
  box-shadow: inset 0 3px 8px rgba(0,0,0,.55), inset 0 0 6px rgba(0,0,0,.3), 0 1px 0 rgba(255,255,255,.05);
}
/* the alert callout rides the same physics (it IS a cta register) — mid tier */
[data-style="bubble"] .dash .dash-info {
  border-radius: 18px;
  box-shadow:
    0 4px 10px -2px rgba(0,0,0,.28),
    inset 0 1px 0 rgba(255,255,255,.3),
    inset 0 -1px 0 rgba(255,255,255,.2),
    inset 0 -3px 3px rgba(0,0,0,.09);
}
/* soft-embossed status tags + pillowed avatars (their own colors) — !important
   because table avatars carry inline borders/styles that otherwise win */
[data-style="bubble"] .dash .dash-pill {
  box-shadow: var(--recess-sm) !important;
}
[data-style="bubble"] .dash .dash-avatar {
  border: 0 !important;
  box-shadow: -1px -1px 3px var(--nm-lt), 2px 2px 4px var(--nm-dks), inset 0 1px 0 rgba(255,255,255,.25), inset 0 -1px 0 rgba(255,255,255,.15) !important;
}
/* the illustration sits in a true recessed well, and the vector itself gets a
   soft cast shadow so it lives IN the scene (owner: apply the treatment) */
[data-style="bubble"] .dash .dash-illo {
  box-shadow: var(--recess);
  border-radius: 18px !important;
}
[data-style="bubble"] .dash .dash-illo svg {
  filter: drop-shadow(2px 3px 3px rgba(0,0,0,.16));
}
/* status dots become tiny convex BALLS (owner: they were flat) — a speck of top
   light and an under-shadow, same fill token */
[data-style="bubble"] .dash .dash-dot {
  box-shadow:
    inset 0 1px 1px rgba(255,255,255,.55),
    inset 0 -1px 1px rgba(0,0,0,.18),
    0 1px 2px rgba(0,0,0,.25);
}
/* DARK per-element rebalance (owner: fixed alphas turned buttons to chrome —
   lights way down, darks up, tight) */
[data-style="bubble"] [data-theme="dark"] .dash .u-btn-neutral {
  box-shadow:
    0 2px 5px -2px rgba(0,0,0,.5),
    inset 0 1px 0 rgba(255,255,255,.10),
    inset 0 -1px 0 rgba(255,255,255,.05),
    inset 0 -1.5px 1.5px rgba(0,0,0,.25);
}
[data-style="bubble"] [data-theme="dark"] .dash .u-btn-secondary {
  box-shadow:
    0 3px 8px -2px rgba(0,0,0,.6),
    inset 0 1px 0 rgba(255,255,255,.12),
    inset 0 -1px 0 rgba(255,255,255,.06),
    inset 0 -2px 2px rgba(0,0,0,.3);
}
[data-style="bubble"] [data-theme="dark"] .dash .u-btn-primary {
  box-shadow:
    0 5px 12px -2px rgba(0,0,0,.7),
    inset 0 1px 0 rgba(255,255,255,.14),
    inset 0 -1px 0 rgba(255,255,255,.07),
    inset 0 -2px 2px rgba(0,0,0,.35);
}
[data-style="bubble"] [data-theme="dark"] .dash .u-btn-primary:active,
[data-style="bubble"] [data-theme="dark"] .dash .u-btn-secondary:active,
[data-style="bubble"] [data-theme="dark"] .dash .u-btn-neutral:active {
  box-shadow: inset 0 3px 8px rgba(0,0,0,.55), inset 0 0 6px rgba(0,0,0,.3), 0 1px 0 rgba(255,255,255,.05);
}
[data-style="bubble"] [data-theme="dark"] .dash .dash-info {
  box-shadow:
    0 3px 8px -2px rgba(0,0,0,.6),
    inset 0 1px 0 rgba(255,255,255,.12),
    inset 0 -1px 0 rgba(255,255,255,.06),
    inset 0 -2px 2px rgba(0,0,0,.3);
}
[data-style="bubble"] [data-theme="dark"] .dash .dash-avatar {
  box-shadow: -1px -1px 3px var(--nm-lt), 2px 2px 4px var(--nm-dks), inset 0 1px 0 rgba(255,255,255,.07), inset 0 -1px 0 rgba(255,255,255,.04) !important;
}
[data-style="bubble"] [data-theme="dark"] .dash .dash-dot {
  box-shadow:
    inset 0 1px 1px rgba(255,255,255,.15),
    inset 0 -1px 1px rgba(0,0,0,.35),
    0 1px 2px rgba(0,0,0,.5);
}
`
