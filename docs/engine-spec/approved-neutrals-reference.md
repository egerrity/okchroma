<!-- Regenerated from the committed src/engine/neutralCurve.ts via generateScale. The OWNER-APPROVED generated neutral (2026-06-24): pure/default/branded x 6 representative brand hues x light/dark. default+branded were reviewed visually; pure is flat gray (C=0). Use as the verification target when wiring 2b (the neutral routed through generateScale must reproduce these). Neutral emits BRAND-KIND: stop9=cta-1 (near-white light button), rung13=highlight-1. -->

# Approved generated-neutral reference

Generation recipe (per brand hue, per level):

```
generateScale(grayHex@brandHue(L0.5,C0.006), "neutral", "light", {
  chromaCurve: neutralChromaCurve(brandHue, level),  // pure|default|branded
  highlight: true, enforceOnFillContrast: true,
})
```

Full values (JSON):

```json
[
 {
  "hue": 30,
  "name": "red→mauve",
  "levels": [
   {
    "level": "pure",
    "light": {
     "scale": [
      "#FDFDFD",
      "#F9F9F9",
      "#F2F2F2",
      "#EAEAEA",
      "#DFDFDF",
      "#D1D1D1",
      "#BFBFBF",
      "#AAAAAA",
      "#E6E6E6",
      "#DCDCDC",
      "#6C6C6C",
      "#2E2E2E"
     ],
     "cta": "#E6E6E6",
     "onCtaWhite": false,
     "highlight": "#757575",
     "onHighlightWhite": true
    },
    "dark": {
     "scale": [
      "#121212",
      "#181818",
      "#202020",
      "#292929",
      "#323232",
      "#3C3C3C",
      "#4A4A4A",
      "#5E5E5E",
      "#E6E6E6",
      "#DCDCDC",
      "#AEAEAE",
      "#EBEBEB"
     ],
     "cta": "#E6E6E6",
     "onCtaWhite": false,
     "highlight": "#757575",
     "onHighlightWhite": true
    }
   },
   {
    "level": "default",
    "light": {
     "scale": [
      "#FEFCFC",
      "#FBF8F8",
      "#F4F1F0",
      "#EDE9E8",
      "#E3DDDC",
      "#D6CFCE",
      "#C6BDBB",
      "#B2A7A5",
      "#E9E5E4",
      "#E1DBDA",
      "#736968",
      "#332C2B"
     ],
     "cta": "#E9E5E4",
     "onCtaWhite": false,
     "highlight": "#7D7371",
     "onHighlightWhite": true
    },
    "dark": {
     "scale": [
      "#131111",
      "#1A1817",
      "#22201F",
      "#2B2827",
      "#353130",
      "#403B3A",
      "#4F4948",
      "#645C5A",
      "#E9E5E5",
      "#E0DBDB",
      "#B4ACAA",
      "#EDEAEA"
     ],
     "cta": "#E9E5E5",
     "onCtaWhite": false,
     "highlight": "#7D7371",
     "onHighlightWhite": true
    }
   },
   {
    "level": "branded",
    "light": {
     "scale": [
      "#FFFCFC",
      "#FCF8F7",
      "#F6F0EF",
      "#EFE8E7",
      "#E6DCDA",
      "#DACECB",
      "#CCBBB8",
      "#B8A5A2",
      "#ECE4E3",
      "#E4DAD8",
      "#786764",
      "#372A28"
     ],
     "cta": "#ECE4E3",
     "onCtaWhite": false,
     "highlight": "#83716E",
     "onHighlightWhite": true
    },
    "dark": {
     "scale": [
      "#141110",
      "#1B1717",
      "#231F1F",
      "#2D2726",
      "#37302E",
      "#433938",
      "#534845",
      "#695A57",
      "#EAE5E4",
      "#E2DBD9",
      "#B9AAA7",
      "#EFEAE9"
     ],
     "cta": "#EAE5E4",
     "onCtaWhite": false,
     "highlight": "#83716E",
     "onHighlightWhite": true
    }
   }
  ]
 },
 {
  "hue": 90,
  "name": "amber→sand",
  "levels": [
   {
    "level": "pure",
    "light": {
     "scale": [
      "#FDFDFD",
      "#F9F9F9",
      "#F2F2F2",
      "#EAEAEA",
      "#DFDFDF",
      "#D1D1D1",
      "#BFBFBF",
      "#AAAAAA",
      "#E6E6E6",
      "#DCDCDC",
      "#6C6C6C",
      "#2E2E2E"
     ],
     "cta": "#E6E6E6",
     "onCtaWhite": false,
     "highlight": "#757575",
     "onHighlightWhite": true
    },
    "dark": {
     "scale": [
      "#121212",
      "#181818",
      "#202020",
      "#292929",
      "#323232",
      "#3C3C3C",
      "#4A4A4A",
      "#5E5E5E",
      "#E6E6E6",
      "#DCDCDC",
      "#AEAEAE",
      "#EBEBEB"
     ],
     "cta": "#E6E6E6",
     "onCtaWhite": false,
     "highlight": "#757575",
     "onHighlightWhite": true
    }
   },
   {
    "level": "default",
    "light": {
     "scale": [
      "#FDFDFC",
      "#F9F9F8",
      "#F2F2F0",
      "#EAEAE7",
      "#E0DFDB",
      "#D2D1CD",
      "#C1C0BA",
      "#ACAAA4",
      "#E7E6E3",
      "#DDDDD9",
      "#6D6C66",
      "#2F2E29"
     ],
     "cta": "#E7E6E3",
     "onCtaWhite": false,
     "highlight": "#77756F",
     "onHighlightWhite": true
    },
    "dark": {
     "scale": [
      "#121110",
      "#191817",
      "#21201F",
      "#2A2927",
      "#33312F",
      "#3E3B38",
      "#4D4A46",
      "#615D58",
      "#E7E6E4",
      "#DDDCDA",
      "#B1ADA8",
      "#EBEBE9"
     ],
     "cta": "#E7E6E4",
     "onCtaWhite": false,
     "highlight": "#79746F",
     "onHighlightWhite": true
    }
   },
   {
    "level": "branded",
    "light": {
     "scale": [
      "#FDFDFB",
      "#FAF9F7",
      "#F3F2EE",
      "#EBEAE6",
      "#E1DFD9",
      "#D3D1C9",
      "#C2C0B6",
      "#ADAA9F",
      "#E7E6E1",
      "#DEDDD6",
      "#6E6C62",
      "#302E26"
     ],
     "cta": "#E7E6E1",
     "onCtaWhite": false,
     "highlight": "#78756A",
     "onHighlightWhite": true
    },
    "dark": {
     "scale": [
      "#13110F",
      "#1A1816",
      "#22201E",
      "#2B2825",
      "#35312D",
      "#403B36",
      "#4F4943",
      "#645C54",
      "#E7E6E2",
      "#DEDDD7",
      "#B3ADA4",
      "#ECEBE8"
     ],
     "cta": "#E7E6E2",
     "onCtaWhite": false,
     "highlight": "#7D746A",
     "onHighlightWhite": true
    }
   }
  ]
 },
 {
  "hue": 143,
  "name": "lime→olive",
  "levels": [
   {
    "level": "pure",
    "light": {
     "scale": [
      "#FDFDFD",
      "#F9F9F9",
      "#F2F2F2",
      "#EAEAEA",
      "#DFDFDF",
      "#D1D1D1",
      "#BFBFBF",
      "#AAAAAA",
      "#E6E6E6",
      "#DCDCDC",
      "#6C6C6C",
      "#2E2E2E"
     ],
     "cta": "#E6E6E6",
     "onCtaWhite": false,
     "highlight": "#757575",
     "onHighlightWhite": true
    },
    "dark": {
     "scale": [
      "#111111",
      "#181818",
      "#202020",
      "#292929",
      "#313131",
      "#3C3C3C",
      "#4A4A4A",
      "#5D5D5D",
      "#E6E6E6",
      "#DCDCDC",
      "#AEAEAE",
      "#EBEBEB"
     ],
     "cta": "#E6E6E6",
     "onCtaWhite": false,
     "highlight": "#757575",
     "onHighlightWhite": true
    }
   },
   {
    "level": "default",
    "light": {
     "scale": [
      "#FCFDFC",
      "#F8F9F8",
      "#F0F2F1",
      "#E8EAE8",
      "#DDE0DD",
      "#CED2CE",
      "#BCC1BC",
      "#A6ACA6",
      "#E4E7E4",
      "#DADEDA",
      "#686D68",
      "#2B2F2B"
     ],
     "cta": "#E4E7E4",
     "onCtaWhite": false,
     "highlight": "#717771",
     "onHighlightWhite": true
    },
    "dark": {
     "scale": [
      "#101210",
      "#171917",
      "#1F211F",
      "#272A27",
      "#2F332F",
      "#383D39",
      "#464C46",
      "#586058",
      "#E4E7E4",
      "#DADEDA",
      "#A9B0A9",
      "#E9ECE9"
     ],
     "cta": "#E4E7E4",
     "onCtaWhite": false,
     "highlight": "#6E786F",
     "onHighlightWhite": true
    }
   },
   {
    "level": "branded",
    "light": {
     "scale": [
      "#FCFDFC",
      "#F7FAF8",
      "#F0F3F0",
      "#E7EBE7",
      "#DBE1DB",
      "#CCD3CC",
      "#B9C3BA",
      "#A3ADA3",
      "#E3E8E3",
      "#D9DED9",
      "#656F66",
      "#293029"
     ],
     "cta": "#E3E8E3",
     "onCtaWhite": false,
     "highlight": "#6E786E",
     "onHighlightWhite": true
    },
    "dark": {
     "scale": [
      "#101210",
      "#161916",
      "#1E221E",
      "#252A25",
      "#2D342D",
      "#363E36",
      "#434E43",
      "#546255",
      "#E3E8E3",
      "#D8DFD8",
      "#A5B2A5",
      "#E8ECE8"
     ],
     "cta": "#E3E8E3",
     "onCtaWhite": false,
     "highlight": "#69796A",
     "onHighlightWhite": true
    }
   }
  ]
 },
 {
  "hue": 210,
  "name": "teal→slate",
  "levels": [
   {
    "level": "pure",
    "light": {
     "scale": [
      "#FDFDFD",
      "#F9F9F9",
      "#F2F2F2",
      "#EAEAEA",
      "#DFDFDF",
      "#D1D1D1",
      "#BFBFBF",
      "#AAAAAA",
      "#E6E6E6",
      "#DCDCDC",
      "#6C6C6C",
      "#2E2E2E"
     ],
     "cta": "#E6E6E6",
     "onCtaWhite": false,
     "highlight": "#757575",
     "onHighlightWhite": true
    },
    "dark": {
     "scale": [
      "#111111",
      "#181818",
      "#202020",
      "#292929",
      "#313131",
      "#3C3C3C",
      "#4A4A4A",
      "#5D5D5D",
      "#E6E6E6",
      "#DCDCDC",
      "#AEAEAE",
      "#EBEBEB"
     ],
     "cta": "#E6E6E6",
     "onCtaWhite": false,
     "highlight": "#757575",
     "onHighlightWhite": true
    }
   },
   {
    "level": "default",
    "light": {
     "scale": [
      "#FCFDFD",
      "#F7FAFA",
      "#EFF2F3",
      "#E7EBEB",
      "#DAE0E1",
      "#CBD2D4",
      "#B8C2C4",
      "#A2ACAF",
      "#E2E7E8",
      "#D8DEDF",
      "#646E70",
      "#282F31"
     ],
     "cta": "#E2E7E8",
     "onCtaWhite": false,
     "highlight": "#6D7779",
     "onHighlightWhite": true
    },
    "dark": {
     "scale": [
      "#101213",
      "#161919",
      "#1E2122",
      "#252A2B",
      "#2D3334",
      "#363D3F",
      "#444C4E",
      "#556062",
      "#E3E7E8",
      "#D8DEDF",
      "#A5B0B3",
      "#E8ECEC"
     ],
     "cta": "#E3E7E8",
     "onCtaWhite": false,
     "highlight": "#6A787A",
     "onHighlightWhite": true
    }
   },
   {
    "level": "branded",
    "light": {
     "scale": [
      "#FBFDFE",
      "#F6FAFB",
      "#EDF3F4",
      "#E4EBED",
      "#D7E1E3",
      "#C7D4D6",
      "#B2C3C7",
      "#9BAEB2",
      "#E0E8EA",
      "#D4DFE1",
      "#5E6F73",
      "#233133"
     ],
     "cta": "#E0E8EA",
     "onCtaWhite": false,
     "highlight": "#66787C",
     "onHighlightWhite": true
    },
    "dark": {
     "scale": [
      "#0E1213",
      "#15191A",
      "#1C2123",
      "#232A2C",
      "#2A3436",
      "#323E41",
      "#3E4D50",
      "#4E6165",
      "#E1E8E9",
      "#D5DFE1",
      "#9FB2B6",
      "#E6ECEE"
     ],
     "cta": "#E1E8E9",
     "onCtaWhite": false,
     "highlight": "#62797E",
     "onHighlightWhite": true
    }
   }
  ]
 },
 {
  "hue": 270,
  "name": "blue→slate",
  "levels": [
   {
    "level": "pure",
    "light": {
     "scale": [
      "#FDFDFD",
      "#F9F9F9",
      "#F2F2F2",
      "#EAEAEA",
      "#DFDFDF",
      "#D1D1D1",
      "#BFBFBF",
      "#AAAAAA",
      "#E6E6E6",
      "#DCDCDC",
      "#6C6C6C",
      "#2E2E2E"
     ],
     "cta": "#E6E6E6",
     "onCtaWhite": false,
     "highlight": "#757575",
     "onHighlightWhite": true
    },
    "dark": {
     "scale": [
      "#121212",
      "#181818",
      "#202020",
      "#292929",
      "#323232",
      "#3C3C3C",
      "#4A4A4A",
      "#5E5E5E",
      "#E6E6E6",
      "#DCDCDC",
      "#AEAEAE",
      "#EBEBEB"
     ],
     "cta": "#E6E6E6",
     "onCtaWhite": false,
     "highlight": "#757575",
     "onHighlightWhite": true
    }
   },
   {
    "level": "default",
    "light": {
     "scale": [
      "#FCFDFE",
      "#F8F9FB",
      "#F1F2F4",
      "#E9EAED",
      "#DDDFE4",
      "#CFD1D7",
      "#BDBFC8",
      "#A7AAB4",
      "#E5E6EA",
      "#DBDCE2",
      "#696B74",
      "#2C2D34"
     ],
     "cta": "#E5E6EA",
     "onCtaWhite": false,
     "highlight": "#73757E",
     "onHighlightWhite": true
    },
    "dark": {
     "scale": [
      "#111113",
      "#18181A",
      "#202022",
      "#28292C",
      "#303135",
      "#3A3C41",
      "#494A50",
      "#5B5D65",
      "#E5E6E9",
      "#DBDCE0",
      "#ABADB6",
      "#EAEBED"
     ],
     "cta": "#E5E6E9",
     "onCtaWhite": false,
     "highlight": "#73757F",
     "onHighlightWhite": true
    }
   },
   {
    "level": "branded",
    "light": {
     "scale": [
      "#FCFDFF",
      "#F8F9FD",
      "#F0F1F7",
      "#E8E9F0",
      "#DCDEE8",
      "#CDD0DC",
      "#BBBFCE",
      "#A5A9BB",
      "#E4E6ED",
      "#DADCE6",
      "#676B7B",
      "#2A2D39"
     ],
     "cta": "#E4E6ED",
     "onCtaWhite": false,
     "highlight": "#717585",
     "onHighlightWhite": true
    },
    "dark": {
     "scale": [
      "#111115",
      "#17181B",
      "#1F2024",
      "#27292E",
      "#303138",
      "#393B44",
      "#474A55",
      "#5A5D6B",
      "#E5E6EB",
      "#DADCE3",
      "#AAADBC",
      "#EAEBEF"
     ],
     "cta": "#E5E6EB",
     "onCtaWhite": false,
     "highlight": "#717585",
     "onHighlightWhite": true
    }
   }
  ]
 },
 {
  "hue": 320,
  "name": "pink→mauve",
  "levels": [
   {
    "level": "pure",
    "light": {
     "scale": [
      "#FDFDFD",
      "#F9F9F9",
      "#F2F2F2",
      "#EAEAEA",
      "#DFDFDF",
      "#D1D1D1",
      "#BFBFBF",
      "#AAAAAA",
      "#E6E6E6",
      "#DCDCDC",
      "#6C6C6C",
      "#2E2E2E"
     ],
     "cta": "#E6E6E6",
     "onCtaWhite": false,
     "highlight": "#757575",
     "onHighlightWhite": true
    },
    "dark": {
     "scale": [
      "#121212",
      "#181818",
      "#202020",
      "#292929",
      "#323232",
      "#3C3C3C",
      "#4A4A4A",
      "#5E5E5E",
      "#E6E6E6",
      "#DCDCDC",
      "#AEAEAE",
      "#EBEBEB"
     ],
     "cta": "#E6E6E6",
     "onCtaWhite": false,
     "highlight": "#757575",
     "onHighlightWhite": true
    }
   },
   {
    "level": "default",
    "light": {
     "scale": [
      "#FDFCFD",
      "#FAF8FA",
      "#F3F1F3",
      "#ECE9EC",
      "#E2DDE2",
      "#D5CFD5",
      "#C4BDC5",
      "#B0A7B0",
      "#E8E5E9",
      "#E0DBE0",
      "#716971",
      "#322B32"
     ],
     "cta": "#E8E5E9",
     "onCtaWhite": false,
     "highlight": "#7B737B",
     "onHighlightWhite": true
    },
    "dark": {
     "scale": [
      "#131113",
      "#191819",
      "#222022",
      "#2B282B",
      "#343034",
      "#3F3A3F",
      "#4E494E",
      "#625B62",
      "#E8E5E8",
      "#DFDBDF",
      "#B2ABB2",
      "#ECEAEC"
     ],
     "cta": "#E8E5E8",
     "onCtaWhite": false,
     "highlight": "#7B737B",
     "onHighlightWhite": true
    }
   },
   {
    "level": "branded",
    "light": {
     "scale": [
      "#FEFCFE",
      "#FBF8FB",
      "#F5F0F5",
      "#EDE8ED",
      "#E4DCE4",
      "#D7CDD8",
      "#C8BBC8",
      "#B4A4B4",
      "#EAE4EA",
      "#E2D9E2",
      "#746775",
      "#342A35"
     ],
     "cta": "#EAE4EA",
     "onCtaWhite": false,
     "highlight": "#7F7180",
     "onHighlightWhite": true
    },
    "dark": {
     "scale": [
      "#131113",
      "#1A171A",
      "#221F23",
      "#2C272C",
      "#352F36",
      "#413941",
      "#504750",
      "#655965",
      "#E9E4E9",
      "#E0DAE0",
      "#B5A9B6",
      "#EDEAED"
     ],
     "cta": "#E9E4E9",
     "onCtaWhite": false,
     "highlight": "#7F717F",
     "onHighlightWhite": true
    }
   }
  ]
 }
]
```
