

export interface SignalDef {
  name: 'red' | 'yellow' | 'green' | 'blue'
  hex: string

  L: number
  C: number
  H: number

  hueShift: { cool: number; warm: number }

  yieldChromaScale: number

  darkFillMinL?: number
}

export const SIGNALS: SignalDef[] = [

  { name: 'red',        hex: '#E54D2E', L: 0.627, C: 0.194, H: 33.3, hueShift: { cool: 0,  warm: 15 }, yieldChromaScale: 1 },

  { name: 'yellow',     hex: '#FFC53D', L: 0.854, C: 0.157, H: 84.1, hueShift: { cool: 23, warm: 0 }, yieldChromaScale: 1.15 },

  { name: 'green',      hex: '#63C373', L: 0.739, C: 0.146, H: 147.6, hueShift: { cool: 15, warm: 10 }, yieldChromaScale: 1, darkFillMinL: 0.75 },

  { name: 'blue', hex: '#AFA3FF', L: 0.761, C: 0.130, H: 288.9, hueShift: { cool: 15, warm: 15 }, yieldChromaScale: 1, darkFillMinL: 0.70 },
]
