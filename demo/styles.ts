// Style lever — dressing layers for the PREVIEW dashboard ONLY (owner 2026-07-24:
// the workshop/palette and the app chrome never restyle). RULE (owner, same day):
// every element keeps LITERALLY the same color tokens as Clean — a style may only
// change TREATMENT (type, radius, stroke weight, shadow shape, texture) and
// ARRANGEMENT (density, scale). Where a style adds a feature Clean lacks (retro's
// strokes), it uses the system's existing color for that job (--border-default),
// never a new color assignment. Shadows stay in the achromatic shadow register.
// Clean = the shipped default, zero overrides. Every selector is rooted inside
// .dash so nothing outside the preview is reachable.

export type DemoStyle = 'clean' | 'retro' | 'skeuo'
export const STYLE_OPTIONS: Array<[DemoStyle, string]> = [
  ['clean', 'Clean'], ['retro', 'Retro'], ['skeuo', 'Skeuo'],
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

/* ═══ SKEUO — soft & round, elevation is ALL shadow (owner 4.1). Same colors:
   surfaces keep their Clean planes; only the shadow SHAPE changes (dual soft,
   achromatic — light above, dark below; element shadows subtler than the card's).
   No borders, everything pillowed. */
[data-style="skeuo"] .dash {
  font-family: ui-rounded, "SF Pro Rounded", -apple-system, system-ui, sans-serif;
  --nm-lt: rgba(255,255,255,.8);
  --nm-dk: rgba(0,0,0,.14);
  --nm-dks: rgba(0,0,0,.09);
  --elev-card: -10px -10px 24px var(--nm-lt), 12px 14px 30px var(--nm-dk);
  --elev-float: -12px -12px 28px var(--nm-lt), 14px 18px 38px var(--nm-dk);
}
[data-style="skeuo"] [data-theme="dark"] .dash {
  --nm-lt: rgba(255,255,255,.05);
  --nm-dk: rgba(0,0,0,.5);
  --nm-dks: rgba(0,0,0,.38);
}
/* pillowed cards — same plane, rounder body, softer light (the customers card
   carries its own class, not dash-card — see CustomTheme) */
[data-style="skeuo"] .dash .dash-card,
[data-style="skeuo"] .dash .dash-card-customers {
  border: 0 !important; border-radius: 28px !important;
  box-shadow: var(--elev-card) !important;
}
[data-style="skeuo"] .dash .dash-side {
  box-shadow: inset -2px 0 6px var(--nm-dks);
}
/* sunken wells: dual inset — same sink color, deeper treatment */
[data-style="skeuo"] .dash .dash-search {
  border: 0 !important; border-radius: 999px;
  box-shadow: inset 2px 2px 4px var(--nm-dk), inset -2px -2px 3px var(--nm-lt);
}
[data-style="skeuo"] .dash .dash-navitem { border-radius: 999px; }
`
