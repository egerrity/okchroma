// GENERATED from the owner's Unify Figma variable export (extract 2026-07-13,
// distilled 2026-07-27 by scratchpad/distill_unify.py — edit the script, not this file).
// Structure mirrors the Unify file: Color modes (Light/Dark primitives), Color
// themes (per-brand aliases: Primary / Primary Highlight / Primary Accent), and
// the Color palettes semantic collection (Signal palette etc.).

export interface UnifyAlias { hex: string; family: string; stop: number; darkHex: string }
export interface UnifyTheme {
  name: string
  archived: boolean
  primary: UnifyAlias
  highlight: UnifyAlias
  accent: UnifyAlias
}
export interface UnifyRampStop { stop: number; light: string; dark: string }
export interface UnifySignalToken { name: string; family: string; stop: number; light: string; dark: string }

export const UNIFY_THEMES: UnifyTheme[] = [
  {
    "name": "Atelio (archived)",
    "archived": true,
    "primary": {
      "hex": "#4F46E5",
      "family": "Violet",
      "stop": 600,
      "darkHex": "#828DF8"
    },
    "highlight": {
      "hex": "#C7D2FE",
      "family": "Violet",
      "stop": 200,
      "darkHex": "#393498"
    },
    "accent": {
      "hex": "#EEF2FF",
      "family": "Violet",
      "stop": 50,
      "darkHex": "#1D1B4B"
    }
  },
  {
    "name": "Blue 600 (white-label)",
    "archived": false,
    "primary": {
      "hex": "#044BAF",
      "family": "Blue",
      "stop": 600,
      "darkHex": "#72A8F3"
    },
    "highlight": {
      "hex": "#8EB9F5",
      "family": "Blue",
      "stop": 200,
      "darkHex": "#034096"
    },
    "accent": {
      "hex": "#E6EFFB",
      "family": "Blue",
      "stop": 50,
      "darkHex": "#011E46"
    }
  },
  {
    "name": "Blue 800 (white-label)",
    "archived": false,
    "primary": {
      "hex": "#023173",
      "family": "Blue",
      "stop": 800,
      "darkHex": "#D0E3FB"
    },
    "highlight": {
      "hex": "#8EB9F5",
      "family": "Blue",
      "stop": 200,
      "darkHex": "#034096"
    },
    "accent": {
      "hex": "#E6EFFB",
      "family": "Blue",
      "stop": 50,
      "darkHex": "#011E46"
    }
  },
  {
    "name": "FIS",
    "archived": false,
    "primary": {
      "hex": "#532371",
      "family": "Eggplant",
      "stop": 800,
      "darkHex": "#C59AE0"
    },
    "highlight": {
      "hex": "#E4D0F1",
      "family": "Eggplant",
      "stop": 200,
      "darkHex": "#451D5E"
    },
    "accent": {
      "hex": "#FBF7FD",
      "family": "Eggplant",
      "stop": 50,
      "darkHex": "#1D0C27"
    }
  },
  {
    "name": "Green 500 (white-label)",
    "archived": false,
    "primary": {
      "hex": "#027935",
      "family": "Green",
      "stop": 500,
      "darkHex": "#5CD18E"
    },
    "highlight": {
      "hex": "#92E2B3",
      "family": "Green",
      "stop": 200,
      "darkHex": "#0A8A41"
    },
    "accent": {
      "hex": "#E6F2EB",
      "family": "Green",
      "stop": 50,
      "darkHex": "#012D14"
    }
  },
  {
    "name": "Orange 500 (white-label)",
    "archived": false,
    "primary": {
      "hex": "#BC3F01",
      "family": "Orange",
      "stop": 500,
      "darkHex": "#F07233"
    },
    "highlight": {
      "hex": "#F39D72",
      "family": "Orange",
      "stop": 200,
      "darkHex": "#913608"
    },
    "accent": {
      "hex": "#F8ECE6",
      "family": "Orange",
      "stop": 50,
      "darkHex": "#3D0509"
    }
  },
  {
    "name": "Teal 600 (white-label)",
    "archived": false,
    "primary": {
      "hex": "#005C7A",
      "family": "Teal",
      "stop": 600,
      "darkHex": "#72D7F8"
    },
    "highlight": {
      "hex": "#91D9F3",
      "family": "Teal",
      "stop": 200,
      "darkHex": "#00779E"
    },
    "accent": {
      "hex": "#E5F0F4",
      "family": "Teal",
      "stop": 50,
      "darkHex": "#002A38"
    }
  }
]

// Client primitive ramps (only the stops that exist in the file — several
// families never had 100/300/400 picked).
export const UNIFY_RAMPS: Record<string, UnifyRampStop[]> = {
  "Blue": [
    {
      "stop": 50,
      "light": "#E6EFFB",
      "dark": "#011E46"
    },
    {
      "stop": 200,
      "light": "#8EB9F5",
      "dark": "#034096"
    },
    {
      "stop": 500,
      "light": "#045CD7",
      "dark": "#418AF1"
    },
    {
      "stop": 600,
      "light": "#044BAF",
      "dark": "#72A8F3"
    },
    {
      "stop": 700,
      "light": "#03429B",
      "dark": "#A1C5F7"
    },
    {
      "stop": 800,
      "light": "#023173",
      "dark": "#D0E3FB"
    },
    {
      "stop": 900,
      "light": "#02295F",
      "dark": "#E6EFFB"
    }
  ],
  "Eggplant": [
    {
      "stop": 50,
      "light": "#FBF7FD",
      "dark": "#1D0C27"
    },
    {
      "stop": 100,
      "light": "#EFE4F7",
      "dark": "#311442"
    },
    {
      "stop": 200,
      "light": "#E4D0F1",
      "dark": "#451D5E"
    },
    {
      "stop": 300,
      "light": "#D9BDEB",
      "dark": "#592579"
    },
    {
      "stop": 400,
      "light": "#C396DF",
      "dark": "#6D2E94"
    },
    {
      "stop": 500,
      "light": "#AC6FD3",
      "dark": "#8738B7"
    },
    {
      "stop": 600,
      "light": "#9648C7",
      "dark": "#9D53CA"
    },
    {
      "stop": 700,
      "light": "#6D2E94",
      "dark": "#B176D5"
    },
    {
      "stop": 800,
      "light": "#532371",
      "dark": "#C59AE0"
    },
    {
      "stop": 900,
      "light": "#431C5B",
      "dark": "#D9BDEB"
    }
  ],
  "Green": [
    {
      "stop": 50,
      "light": "#E6F2EB",
      "dark": "#012D14"
    },
    {
      "stop": 200,
      "light": "#92E2B3",
      "dark": "#0A8A41"
    },
    {
      "stop": 500,
      "light": "#027935",
      "dark": "#5CD18E"
    },
    {
      "stop": 600,
      "light": "#02642C",
      "dark": "#84DCAA"
    },
    {
      "stop": 700,
      "light": "#015024",
      "dark": "#ABE7C5"
    },
    {
      "stop": 800,
      "light": "#013C1B",
      "dark": "#D3F3E1"
    },
    {
      "stop": 900,
      "light": "#012812",
      "dark": "#EFFBF4"
    }
  ],
  "Orange": [
    {
      "stop": 50,
      "light": "#F8ECE6",
      "dark": "#3D0509"
    },
    {
      "stop": 200,
      "light": "#F39D72",
      "dark": "#913608"
    },
    {
      "stop": 500,
      "light": "#BC3F01",
      "dark": "#F07233"
    },
    {
      "stop": 600,
      "light": "#A73801",
      "dark": "#F49261"
    },
    {
      "stop": 700,
      "light": "#933201",
      "dark": "#F6B493"
    },
    {
      "stop": 800,
      "light": "#7F2B01",
      "dark": "#FAD4C2"
    },
    {
      "stop": 900,
      "light": "#6B2401",
      "dark": "#F8ECE6"
    }
  ],
  "Teal": [
    {
      "stop": 50,
      "light": "#E5F0F4",
      "dark": "#002A38"
    },
    {
      "stop": 200,
      "light": "#91D9F3",
      "dark": "#00779E"
    },
    {
      "stop": 500,
      "light": "#006B8F",
      "dark": "#42C9F5"
    },
    {
      "stop": 600,
      "light": "#005C7A",
      "dark": "#72D7F8"
    },
    {
      "stop": 700,
      "light": "#004D66",
      "dark": "#A3E5FA"
    },
    {
      "stop": 800,
      "light": "#003D52",
      "dark": "#D3F3FD"
    },
    {
      "stop": 900,
      "light": "#002E3D",
      "dark": "#E7F8FE"
    }
  ],
  "Violet": [
    {
      "stop": 50,
      "light": "#EEF2FF",
      "dark": "#1D1B4B"
    },
    {
      "stop": 100,
      "light": "#E0E7FF",
      "dark": "#2E2B6E"
    },
    {
      "stop": 200,
      "light": "#C7D2FE",
      "dark": "#393498"
    },
    {
      "stop": 300,
      "light": "#A5B4FC",
      "dark": "#3B35AC"
    },
    {
      "stop": 400,
      "light": "#818CF8",
      "dark": "#4446D5"
    },
    {
      "stop": 500,
      "light": "#6366F1",
      "dark": "#656BE7"
    },
    {
      "stop": 600,
      "light": "#4F46E5",
      "dark": "#828DF8"
    },
    {
      "stop": 700,
      "light": "#4338CA",
      "dark": "#A0A4F8"
    },
    {
      "stop": 800,
      "light": "#3730A3",
      "dark": "#BDBDFA"
    },
    {
      "stop": 900,
      "light": "#312E81",
      "dark": "#DBDAFC"
    }
  ]
}

// Signal palette (semantic) — each token's spectrum source + resolved values.
export const UNIFY_SIGNALS: UnifySignalToken[] = [
  {
    "name": "Signal Success",
    "family": "Lime",
    "stop": 700,
    "light": "#2A5F26",
    "dark": "#8DDF86"
  },
  {
    "name": "Signal Success Spotlight",
    "family": "Lime",
    "stop": 500,
    "light": "#449938",
    "dark": "#449938"
  },
  {
    "name": "Signal Success Highlight",
    "family": "Lime",
    "stop": 200,
    "light": "#A3DB9E",
    "dark": "#235020"
  },
  {
    "name": "Signal Success Accent",
    "family": "Lime",
    "stop": 50,
    "light": "#EBF5EA",
    "dark": "#132211"
  },
  {
    "name": "Signal Warning",
    "family": "Amber",
    "stop": 700,
    "light": "#804F00",
    "dark": "#FFE680"
  },
  {
    "name": "Signal Warning Spotlight",
    "family": "Amber",
    "stop": 500,
    "light": "#CE6F03",
    "dark": "#FDBE10"
  },
  {
    "name": "Signal Warning Highlight",
    "family": "Amber",
    "stop": 200,
    "light": "#FFE680",
    "dark": "#805100"
  },
  {
    "name": "Signal Warning Accent",
    "family": "Amber",
    "stop": 50,
    "light": "#FFF9E5",
    "dark": "#462D01"
  },
  {
    "name": "Signal Error",
    "family": "Scarlet",
    "stop": 700,
    "light": "#B42318",
    "dark": "#F97167"
  },
  {
    "name": "Signal Error Spotlight",
    "family": "Scarlet",
    "stop": 500,
    "light": "#F04438",
    "dark": "#DE443F"
  },
  {
    "name": "Signal Error Highlight",
    "family": "Scarlet",
    "stop": 200,
    "light": "#FECDCA",
    "dark": "#67181C"
  },
  {
    "name": "Signal Error Accent",
    "family": "Scarlet",
    "stop": 50,
    "light": "#FEF3F2",
    "dark": "#361215"
  }
]

// Full signal spectrum ramps for context.
export const UNIFY_SIGNAL_RAMPS: Record<string, UnifyRampStop[]> = {
  "Lime": [
    {
      "stop": 50,
      "light": "#EBF5EA",
      "dark": "#132211"
    },
    {
      "stop": 100,
      "light": "#C8E7C6",
      "dark": "#1C3819"
    },
    {
      "stop": 200,
      "light": "#A3DB9E",
      "dark": "#235020"
    },
    {
      "stop": 300,
      "light": "#7BD373",
      "dark": "#28721D"
    },
    {
      "stop": 400,
      "light": "#4BCD3E",
      "dark": "#2A8E25"
    },
    {
      "stop": 500,
      "light": "#449938",
      "dark": "#449938"
    },
    {
      "stop": 600,
      "light": "#237A1F",
      "dark": "#4BCD3E"
    },
    {
      "stop": 700,
      "light": "#2A5F26",
      "dark": "#8DDF86"
    },
    {
      "stop": 800,
      "light": "#1C3819",
      "dark": "#C5EBC2"
    },
    {
      "stop": 900,
      "light": "#0F1B0E",
      "dark": "#EBF5EA"
    }
  ],
  "Amber": [
    {
      "stop": 50,
      "light": "#FFF9E5",
      "dark": "#462D01"
    },
    {
      "stop": 100,
      "light": "#FFF3BF",
      "dark": "#653F00"
    },
    {
      "stop": 200,
      "light": "#FFE680",
      "dark": "#805100"
    },
    {
      "stop": 300,
      "light": "#FFD34F",
      "dark": "#A35A00"
    },
    {
      "stop": 400,
      "light": "#FDAE10",
      "dark": "#D16C00"
    },
    {
      "stop": 500,
      "light": "#CE6F03",
      "dark": "#FDBE10"
    },
    {
      "stop": 600,
      "light": "#A25A02",
      "dark": "#FFD54F"
    },
    {
      "stop": 700,
      "light": "#804F00",
      "dark": "#FFE680"
    },
    {
      "stop": 800,
      "light": "#663F00",
      "dark": "#FFF3BF"
    },
    {
      "stop": 900,
      "light": "#472D00",
      "dark": "#FFF7E0"
    }
  ],
  "Scarlet": [
    {
      "stop": 50,
      "light": "#FEF3F2",
      "dark": "#361215"
    },
    {
      "stop": 100,
      "light": "#FEE4E2",
      "dark": "#4C1519"
    },
    {
      "stop": 200,
      "light": "#FECDCA",
      "dark": "#67181C"
    },
    {
      "stop": 300,
      "light": "#FDA29B",
      "dark": "#8F1E20"
    },
    {
      "stop": 400,
      "light": "#F97066",
      "dark": "#C12525"
    },
    {
      "stop": 500,
      "light": "#F04438",
      "dark": "#DE443F"
    },
    {
      "stop": 600,
      "light": "#D92D20",
      "dark": "#EE5F58"
    },
    {
      "stop": 700,
      "light": "#B42318",
      "dark": "#F97167"
    },
    {
      "stop": 800,
      "light": "#912018",
      "dark": "#FBA2A2"
    },
    {
      "stop": 900,
      "light": "#7A271A",
      "dark": "#FEDDDF"
    }
  ]
}

// The Gray spectrum ramp — the only ramp Unify's text/surface semantics ride.
export const UNIFY_GRAY: UnifyRampStop[] = [
  {
    "stop": 0,
    "light": "#FFFFFF",
    "dark": "#161618"
  },
  {
    "stop": 25,
    "light": "#F9FAFB",
    "dark": "#1B1B1D"
  },
  {
    "stop": 50,
    "light": "#EEEFF2",
    "dark": "#202022"
  },
  {
    "stop": 100,
    "light": "#E2E4E9",
    "dark": "#252528"
  },
  {
    "stop": 200,
    "light": "#CBCFD7",
    "dark": "#3B3C40"
  },
  {
    "stop": 300,
    "light": "#A9AFBC",
    "dark": "#515258"
  },
  {
    "stop": 400,
    "light": "#868FA2",
    "dark": "#67696F"
  },
  {
    "stop": 500,
    "light": "#667085",
    "dark": "#7D8087"
  },
  {
    "stop": 600,
    "light": "#515767",
    "dark": "#95979D"
  },
  {
    "stop": 700,
    "light": "#3B3F49",
    "dark": "#BDBEC2"
  },
  {
    "stop": 800,
    "light": "#25272D",
    "dark": "#E4E5E7"
  },
  {
    "stop": 900,
    "light": "#0E0F10",
    "dark": "#FFFFFF"
  }
]

// Color palettes collection census — tokens per semantic group (42 total; Brand gets 3).
export const UNIFY_SEMANTIC_CENSUS: Record<string, number> = {
  "Content palette": 4,
  "Background palette": 5,
  "Stroke palette": 5,
  "Signal palette": 12,
  "Brand palette": 3,
  "Merge palette": 10,
  "Skeleton loader palette": 3
}
