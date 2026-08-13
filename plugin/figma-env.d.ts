declare const __html__: string

declare namespace figma {
  function showUI(html: string, options?: { width?: number; height?: number; title?: string }): void
  function closePlugin(message?: string): void
  /** withFontRetry only — loads a font Figma's unloaded-font error demanded. */
  function loadFontAsync(fontName: { family: string; style: string }): Promise<void>

  const ui: {
    onmessage: ((msg: Record<string, unknown>) => void) | null
    postMessage(msg: unknown): void
  }

  namespace variables {
    function getLocalVariableCollectionsAsync(): Promise<VariableCollection[]>
    function getLocalVariablesAsync(): Promise<Variable[]>
    function createVariableCollection(name: string): VariableCollection
    function createVariable(name: string, collection: VariableCollection, type: 'COLOR'): Variable
    function createVariableAlias(variable: Variable): VariableAlias
  }

  type RGBA = { r: number; g: number; b: number; a?: number }
  interface VariableAlias { type: 'VARIABLE_ALIAS'; id: string }

  interface VariableCollection {
    readonly id: string
    name: string
    readonly modes: ReadonlyArray<{ readonly modeId: string; name: string }>
    addMode(name: string): string
    renameMode(modeId: string, name: string): void
    setPluginData(key: string, value: string): void
    getPluginData(key: string): string
  }

  type VariableScope = 'ALL_SCOPES' | 'ALL_FILLS' | 'FRAME_FILL' | 'SHAPE_FILL' | 'TEXT_FILL' | 'STROKE_COLOR' | 'EFFECT_COLOR'

  interface Variable {
    name: string
    description: string
    getPluginData(key: string): string
    setPluginData(key: string, value: string): void
    scopes: VariableScope[]
    readonly variableCollectionId: string
    readonly valuesByMode: { readonly [modeId: string]: RGBA | VariableAlias }
    setValueForMode(modeId: string, value: RGBA | VariableAlias): void
    setVariableCodeSyntax(platform: 'WEB' | 'ANDROID' | 'iOS', value: string): void
  }
}
