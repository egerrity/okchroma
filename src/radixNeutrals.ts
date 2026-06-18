// Radix Colors neutral families, verbatim — MIT License,
// (c) WorkOS, https://github.com/radix-ui/colors
// Hand-tuned tinted neutrals; we ship them as-is instead of generating
// tinted grays (2026-06-11: neutrals are too sensitive to tune
// ourselves). The engine still generates the intense 'branded' neutral.

export type NeutralFamily = 'gray' | 'mauve' | 'slate' | 'sage' | 'olive' | 'sand'

export const RADIX_NEUTRALS: Record<NeutralFamily, { light: string[]; dark: string[] }> = {
  gray: {
    light: ["#FCFCFC", "#F9F9F9", "#F0F0F0", "#E8E8E8", "#E0E0E0", "#D9D9D9", "#CECECE", "#BBBBBB", "#8D8D8D", "#838383", "#646464", "#202020"],
    dark: ["#111111", "#191919", "#222222", "#2A2A2A", "#313131", "#3A3A3A", "#484848", "#606060", "#6E6E6E", "#7B7B7B", "#B4B4B4", "#EEEEEE"],
  },
  mauve: {
    light: ["#FDFCFD", "#FAF9FB", "#F2EFF3", "#EAE7EC", "#E3DFE6", "#DBD8E0", "#D0CDD7", "#BCBAC7", "#8E8C99", "#84828E", "#65636D", "#211F26"],
    dark: ["#121113", "#1A191B", "#232225", "#2B292D", "#323035", "#3C393F", "#49474E", "#625F69", "#6F6D78", "#7C7A85", "#B5B2BC", "#EEEEF0"],
  },
  slate: {
    light: ["#FCFCFD", "#F9F9FB", "#F0F0F3", "#E8E8EC", "#E0E1E6", "#D9D9E0", "#CDCED6", "#B9BBC6", "#8B8D98", "#80838D", "#60646C", "#1C2024"],
    dark: ["#111113", "#18191B", "#212225", "#272A2D", "#2E3135", "#363A3F", "#43484E", "#5A6169", "#696E77", "#777B84", "#B0B4BA", "#EDEEF0"],
  },
  sage: {
    light: ["#FBFDFC", "#F7F9F8", "#EEF1F0", "#E6E9E8", "#DFE2E0", "#D7DAD9", "#CBCFCD", "#B8BCBA", "#868E8B", "#7C8481", "#5F6563", "#1A211E"],
    dark: ["#101211", "#171918", "#202221", "#272A29", "#2E3130", "#373B39", "#444947", "#5B625F", "#63706B", "#717D79", "#ADB5B2", "#ECEEED"],
  },
  olive: {
    light: ["#FCFDFC", "#F8FAF8", "#EFF1EF", "#E7E9E7", "#DFE2DF", "#D7DAD7", "#CCCFCC", "#B9BCB8", "#898E87", "#7F847D", "#60655F", "#1D211C"],
    dark: ["#111210", "#181917", "#212220", "#282A27", "#2F312E", "#383A36", "#454843", "#5C625B", "#687066", "#767D74", "#AFB5AD", "#ECEEEC"],
  },
  sand: {
    light: ["#FDFDFC", "#F9F9F8", "#F1F0EF", "#E9E8E6", "#E2E1DE", "#DAD9D6", "#CFCECA", "#BCBBB5", "#8D8D86", "#82827C", "#63635E", "#21201C"],
    dark: ["#111110", "#191918", "#222221", "#2A2A28", "#31312E", "#3B3A37", "#494844", "#62605B", "#6F6D66", "#7C7B74", "#B5B3AD", "#EEEEEC"],
  },
}

// Matching follows Radix's own published pairing guide (red/tomato/
// crimson/pink/purple/violet → mauve; cyan/blue/indigo/iris → slate;
// green/teal/jade/mint → sage; grass/lime → olive; yellow/amber/orange/
// brown → sand), expressed as OKLCH hue bands. Nearest-signature-hue
// matching would mispair reds with sand — warm reds sit between the two
// signatures, but a tinted neutral should echo the UNDERTONE (red's is
// violet-ish), which is what Radix's pairings encode.
// Near-neutral brands (C < 0.03) match gray.
export function closestNeutralFamily(brandH: number, brandC: number): NeutralFamily {
  if (brandC < 0.03) return 'gray'
  const h = ((brandH % 360) + 360) % 360
  if (h >= 50 && h < 115) return 'sand'   // orange, amber, yellow
  if (h >= 115 && h < 145) return 'olive' // lime, grass
  if (h >= 145 && h < 220) return 'sage'  // green, jade, teal, mint
  if (h >= 220 && h < 292) return 'slate' // cyan, blue, indigo, iris
  return 'mauve'                          // violet → purple → pink → red
}

// CSS blocks for a family, scoped to a brand selector
export function radixNeutralCss(selector: string, family: NeutralFamily): string {
  const fam = RADIX_NEUTRALS[family]
  const vars = (hexes: string[]) => hexes.map((h, i) => `  --neutral-${i + 1}: ${h};`).join('\n')
  return [
    `${selector} {`, vars(fam.light), `}`,
    `${selector}[data-theme="dark"] {`, vars(fam.dark), `}`,
  ].join('\n')
}
