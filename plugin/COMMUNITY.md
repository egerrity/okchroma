# Community listing copy (paste into Figma's publish form)

## Name

OKChroma

## Tagline (max ~60 chars)

A full accessibility-solved color system from one brand color

## Description

OKChroma generates a complete, accessibility-solved color system from a single brand color — and writes it into your file as Figma variables.

Pick your primary. The engine resolves a full token scale (paper → wash → highlight → ink), the cta pair with computed on-colors, a brand-tinted neutral, and four signal families (red, yellow, green, info) that are collision-checked against your brand — so a red-adjacent primary never blurs into your error color. Add a secondary: derived from your primary as a pastel by default, or your own hex in Tint, Pastel, Outline, or Exact style.

Everything is solved, not sampled. Text colors are chosen because they pass. Boundary stops carry their non-text contrast contract. And the whole system re-solves under your choice of contrast math: APCA (the default — the perceptual model) or WCAG (the strict ratios, every text color guaranteed to pass). Switching never mixes values — the plugin keeps one profile per collection pair and forks a clearly-labeled second pair if you change your mind mid-file.

What it writes:

- theme + mode collections — semantic tokens aliased onto shared primitives
- per-brand ramps under brand/<name>; neutrals and signals deduplicated across brands
- light + dark values for every token; on-colors aliased to stable poles

Apply it twice with two brand colors and you have a multi-brand system on shared foundations.

## Publish-form checklist

- Icon: 128×128 (the ◈ mark on a brand-cta fill works)
- Cover art: 1920×960 — suggest the demo's swatch matrix on white
- Category: Design tools / Libraries
- Tags: color, variables, design tokens, accessibility, APCA, WCAG, palette, theme
- Network access: already declared `none` in the manifest (fast review)
- After first publish: Figma writes the assigned plugin id into `manifest.json` — commit that change
