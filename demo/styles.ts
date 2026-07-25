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
   different clothes; the dashboard is a DESKTOP OF WINDOWS. EMPHASIS LADDER
   (owner spec 2026-07-24) — emphasis lives on the TABLE, everything else recedes:
     L1 hero      titlebar + strong shadow            → Customers table
     L2           same stroke + strong shadow, no bar → Get started
     L3           chunky stroke + light shadow        → Activity, Recent tasks, sidebar
     L4           chunky stroke only                  → metric tiles (compact), plain buttons
     L5 ctas      ink-12 border + ink-10 shadow       → primary/secondary cta buttons
   Shadows carry the brand per owner latitude, mixed toward black so they stay
   SHADOWS (never halos), both themes. */
[data-style="retro"] .dash {
  font-family: "SF Mono", Menlo, ui-monospace, monospace;
  font-variant-numeric: tabular-nums;
  --rt-line: var(--border-default);
  --rt-shadow: color-mix(in srgb, var(--brand-cta) 45%, black);
  --elev-card: 2px 2px 0 var(--rt-shadow);
  --elev-float: 7px 7px 0 var(--rt-shadow);
  background-image: repeating-linear-gradient(0deg, rgba(0,0,0,.02) 0 1px, transparent 1px 3px);
}
[data-style="retro"] [data-theme="dark"] .dash {
  background-image: repeating-linear-gradient(0deg, rgba(255,255,255,.02) 0 1px, transparent 1px 3px);
}
/* hard square corners for EVERYTHING inside the preview — retro has no curves */
[data-style="retro"] .dash, [data-style="retro"] .dash * { border-radius: 0 !important; }
/* L3 default: chunky keyline + LIGHT flat shadow */
[data-style="retro"] .dash .dash-card,
[data-style="retro"] .dash .dash-card-customers,
[data-style="retro"] .dash .dash-side {
  border: 2.5px solid var(--rt-line) !important;
  box-shadow: 2px 2px 0 var(--rt-shadow) !important;
}
/* L1 + L2: the strong shadow */
[data-style="retro"] .dash .dash-card-customers,
[data-style="retro"] .dash .dash-card-getstarted {
  box-shadow: 6px 6px 0 var(--rt-shadow) !important;
}
/* L1 hero ONLY: the action titlebar — BRAND ink-11 fill (owner: bar is a brand
   color), control squares in its wash partner (the active-nav pair, swapped) */
[data-style="retro"] .dash .dash-card-customers { position: relative; padding-top: 26px !important; }
[data-style="retro"] .dash .dash-card-customers::before {
  content: ""; position: absolute; top: 0; left: 0; right: 0; height: 26px;
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
  position: absolute; top: 0; left: 14px; height: 26px; z-index: 1;
  display: flex; align-items: center;
  color: var(--brand-wash-5);
  font-size: 11px !important; font-weight: 700 !important;
  text-transform: uppercase; letter-spacing: .14em;
}
/* L4: metric tiles recede — stroke only, compact, quiet type */
[data-style="retro"] .dash .dash-metric {
  box-shadow: none !important;
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

/* ═══ BUBBLE (soft-UI/neumorphic; was "skeuo", owner rename 2026-07-24) — soft & round, elevation is ALL shadow (owner 4.1). Same colors:
   surfaces keep their Clean planes; only the shadow SHAPE changes (dual soft,
   achromatic — light above, dark below; element shadows subtler than the card's).
   No borders, everything pillowed. EMPHASIS LADDER carried over from retro —
   the table is the hero (deepest pillow), metrics recede as sunken coins.
   COLOR comes from OVERLAYS (owner latitude): whisper-alpha glazes of the
   brand's own cta over unchanged grounds — light on top, never a recolor. */
[data-style="bubble"] .dash {
  font-family: ui-rounded, "SF Pro Rounded", -apple-system, system-ui, sans-serif;
  --nm-lt: rgba(255,255,255,.8);
  --nm-lt2: rgba(255,255,255,.95); /* the pop tier's stronger key light */
  --nm-dk: rgba(0,0,0,.14);
  --nm-dks: rgba(0,0,0,.09);
  /* TWO DISTINCT TREATMENTS (owner): PLATEAU = attached — tight hugging dual +
     a faint ambient ring so every edge reads (incl. top-right). POP (hero rule
     below) = separated — key light, tight directional shade, detached drop. */
  --elev-card: -4px -4px 10px var(--nm-lt), 5px 6px 12px var(--nm-dks), 0 0 6px rgba(0,0,0,.05);
  --elev-float: -12px -12px 28px var(--nm-lt), 14px 18px 38px var(--nm-dk);
  /* the brand glaze: ambient colored light over the SAME ground */
  background-image:
    radial-gradient(120% 90% at 18% -10%, color-mix(in srgb, var(--brand-cta) 7%, transparent), transparent 55%),
    radial-gradient(90% 70% at 100% 100%, color-mix(in srgb, var(--brand-cta) 4%, transparent), transparent 60%);
}
/* DARK (owner principle 2026-07-24: treatment amounts adjust to the CONTRAST
   AROUND them — lights MUCH more subtle, darks stronger. Near black, shade has
   no headroom and broad white glows become the dominant signal = halos; so in
   dark, form is carried by thin LIT RIMS + tight concentrated darks + the plane
   ladder, never by glow. Fills untouched, as always.) */
[data-style="bubble"] [data-theme="dark"] .dash {
  --nm-lt: rgba(255,255,255,.03);
  --nm-lt2: rgba(255,255,255,.05);
  --nm-dk: rgba(0,0,0,.65);
  --nm-dks: rgba(0,0,0,.5);
  /* plateau, lights-off: whisper light, tight dark ambient — no 10px+ white blur */
  --elev-card: -1px -1px 3px var(--nm-lt), 4px 5px 9px var(--nm-dk), 0 0 4px rgba(0,0,0,.5);
  background-image:
    radial-gradient(120% 90% at 18% -10%, color-mix(in srgb, var(--brand-cta) 3%, transparent), transparent 55%),
    radial-gradient(90% 70% at 100% 100%, color-mix(in srgb, var(--brand-cta) 2%, transparent), transparent 60%);
}
/* CONVEX EDGES (owner: raised surfaces feel rounded on top, like the cta): every
   lifted card carries the button's edge physics — inset top highlight, dark
   under-curve, AND a thin bottom RIM LIGHT below the curve so both edges read as
   the same thin curved lip (owner-caught: without it the bottom looks wider).
   ELEVATION → TREATMENT MAP (owner spell-out, the skeuo physics ladder):
     pop   → OFF the page, separated        (float shadow — toasts/menus)
     lift  → plateauing out of the ground   (cards: dual shadow + convex edge)
     inset-recede → pressed coin, still lit (metric tiles)
     sink  → receding well                  (search, wells)  */
/* under-curve kept THIN — the bottom lip reads the same depth as the top
   (owner-caught: a wide bottom curve made the edge look thicker) */
[data-style="bubble"] .dash {
  --edge-hi: inset 0 1.5px 0 rgba(255,255,255,.45), inset 0 -1px 0 rgba(255,255,255,.4), inset 0 -2px 2px rgba(0,0,0,.05);
  --edge-hi-strong: inset 0 2px 0 rgba(255,255,255,.55), inset 0 -1px 0 rgba(255,255,255,.5), inset 0 -2.5px 2px rgba(0,0,0,.07);
  /* ATTACHED surfaces have NO crisp lip (owner's neumorphic refs): just a diffuse
     inner light along the lit side — the edge is all soft gradient */
  --edge-soft: inset 1px 1.5px 3px rgba(255,255,255,.5);
  /* recessed physics: shadow INSIDE all around, light on the OUTER edge (a lit rim
     around the depression) — never light inside a hole */
  --recess: inset 0 2px 5px rgba(0,0,0,.09), inset 0 0 6px rgba(0,0,0,.05), 0 1px 0 rgba(255,255,255,.7);
  --recess-sm: inset 0 1px 3px rgba(0,0,0,.08), inset 0 0 3px rgba(0,0,0,.04), 0 1px 0 rgba(255,255,255,.6);
}
[data-style="bubble"] [data-theme="dark"] .dash {
  --edge-hi: inset 0 1px 0 rgba(255,255,255,.06), inset 0 -1px 0 rgba(255,255,255,.03), inset 0 -2px 2px rgba(0,0,0,.45);
  --edge-hi-strong: inset 0 1px 0 rgba(255,255,255,.10), inset 0 -1px 0 rgba(255,255,255,.04), inset 0 -2.5px 2px rgba(0,0,0,.55);
  --edge-soft: inset 0 1px 0 rgba(255,255,255,.06);
  --recess: inset 0 2px 6px rgba(0,0,0,.6), inset 0 0 7px rgba(0,0,0,.4), 0 1px 0 rgba(255,255,255,.04);
  --recess-sm: inset 0 1px 3px rgba(0,0,0,.55), inset 0 0 4px rgba(0,0,0,.3), 0 1px 0 rgba(255,255,255,.03);
}
/* L3 default: pillowed cards — gentle dual shadow + soft convex edge + a faint
   brand glaze drawn INTO the surface (owner: more of the gradient color) */
/* LIGHT LOGIC (owner): light comes from the TOP-LEFT — so colored glaze (bounced
   ambience) sits in the shadowed BOTTOM-RIGHT of raised objects, and in the
   TOP-LEFT of recesses (where the near wall shades the hole). White sheens stay
   top — they ARE the light. */
[data-style="bubble"] .dash .dash-card,
[data-style="bubble"] .dash .dash-card-customers {
  border: 0 !important; border-radius: 24px !important;
  box-shadow: var(--elev-card), var(--edge-soft) !important;
  background-image: radial-gradient(80% 90% at 92% 114%, color-mix(in srgb, var(--brand-cta) 5%, transparent), transparent 58%) !important;
}
[data-style="bubble"] [data-theme="dark"] .dash .dash-card,
[data-style="bubble"] [data-theme="dark"] .dash .dash-card-customers {
  background-image: radial-gradient(80% 90% at 92% 114%, color-mix(in srgb, var(--brand-cta) 2%, transparent), transparent 58%) !important;
}
/* L1 hero = Customers ONLY (owner: Get started is ATTACHED — it falls to the
   plateau default above): the deep pillow + a detached ambient drop BEHIND it */
[data-style="bubble"] .dash .dash-card-customers {
  border-radius: 28px !important;
  box-shadow:
    -12px -12px 26px var(--nm-lt2),
    10px 14px 30px var(--nm-dk),
    10px 26px 40px -22px rgba(0,0,0,.22),
    var(--edge-hi-strong) !important;
}
/* pop, lights-off: separation = concentrated darkness + the strongest lit rim,
   not a key-light glow */
[data-style="bubble"] [data-theme="dark"] .dash .dash-card-customers {
  box-shadow:
    -2px -2px 6px var(--nm-lt2),
    6px 8px 16px rgba(0,0,0,.55),
    6px 14px 22px -12px rgba(0,0,0,.65),
    var(--edge-hi-strong) !important;
}
/* the hero's crown sheen rides ON TOP of its glaze */
[data-style="bubble"] .dash .dash-card-customers {
  background-image:
    linear-gradient(180deg, rgba(255,255,255,.35), transparent 26%),
    radial-gradient(80% 90% at 92% 114%, color-mix(in srgb, var(--brand-cta) 6%, transparent), transparent 58%) !important;
}
[data-style="bubble"] [data-theme="dark"] .dash .dash-card-customers {
  background-image:
    linear-gradient(180deg, rgba(255,255,255,.02), transparent 18%),
    radial-gradient(80% 90% at 92% 114%, color-mix(in srgb, var(--brand-cta) 2%, transparent), transparent 58%) !important;
}
/* L4: metric tiles recede — SUNKEN coins (inset, no lift); the SIGNAL rises into
   each coin as a radial glaze from its bottom corner (--mtone is published by the
   tile — its own tone's emphasis token, overlay only) */
[data-style="bubble"] .dash .dash-metric {
  border: 0 !important;
  box-shadow: var(--recess) !important;
  padding: 16px 18px !important;
  background-image: radial-gradient(70% 85% at 4% -16%, color-mix(in srgb, var(--mtone, transparent) 10%, transparent), transparent 58%) !important;
}
[data-style="bubble"] [data-theme="dark"] .dash .dash-metric {
  background-image: radial-gradient(70% 85% at 4% -16%, color-mix(in srgb, var(--mtone, transparent) 4%, transparent), transparent 58%) !important;
}
[data-style="bubble"] .dash .dash-metrics { gap: 16px; margin-bottom: 16px; }
/* rounder corners want more air (owner): generous card padding + grid gaps —
   the hero keeps its full-bleed table (it isn't .dash-card) */
[data-style="bubble"] .dash .dash-card { padding: 24px !important; }
[data-style="bubble"] .dash .dash-grid { gap: 18px; }
/* the side menu FLOATS (owner): a lifted container off the ground — margins,
   big radius, the card pillow + convex edge, and a doubled brand glaze */
[data-style="bubble"] .dash .dash-side {
  margin: 16px 0 16px 16px; border-radius: 24px;
  box-shadow: var(--elev-card), var(--edge-soft);
  background-image:
    radial-gradient(130% 55% at 85% 108%, color-mix(in srgb, var(--brand-cta) 7%, transparent), transparent 60%);
}
[data-style="bubble"] [data-theme="dark"] .dash .dash-side {
  background-image:
    radial-gradient(130% 55% at 85% 108%, color-mix(in srgb, var(--brand-cta) 2%, transparent), transparent 60%);
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
