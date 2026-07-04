declare const __html__: string

declare namespace figma {
  function showUI(html: string, options?: { width?: number; height?: number; title?: string }): void
  function closePlugin(message?: string): void

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
    scopes: VariableScope[]
    readonly variableCollectionId: string
    setValueForMode(modeId: string, value: RGBA | VariableAlias): void
  }
}
