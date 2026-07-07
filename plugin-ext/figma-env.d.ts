// Minimal ambient typings for the Figma plugin sandbox — v2 (extended collections).
// Standalone: plugin v1 keeps its own shim; this one adds the ExtendedVariableCollection
// shape per developers.figma.com/docs/plugins/api/ExtendedVariableCollection/ and the
// theming section of /docs/plugins/working-with-variables/ (both checked 2026-07-07).
// The feature is ENTERPRISE-PLAN-GATED at runtime — hence `extend` is optional and the
// plugin feature-detects it (typeof c.extend === 'function').

declare const __html__: string

declare namespace figma {
  function showUI(html: string, options?: { width?: number; height?: number; title?: string }): void
  function closePlugin(message?: string): void
  function notify(message: string, options?: { error?: boolean; timeout?: number }): void

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
    /** Library-parent variant of extend() — same Enterprise gate. */
    function extendLibraryCollectionByKeyAsync(key: string, name: string): Promise<ExtendedVariableCollection>
  }

  type RGBA = { r: number; g: number; b: number; a?: number }
  interface VariableAlias { type: 'VARIABLE_ALIAS'; id: string }

  interface VariableCollection {
    readonly id: string
    name: string
    readonly modes: ReadonlyArray<{ readonly modeId: string; name: string }>
    /** true only on ExtendedVariableCollection — the discriminant for local-collection lists. */
    readonly isExtension?: boolean
    addMode(name: string): string
    renameMode(modeId: string, name: string): void
    remove(): void
    setPluginData(key: string, value: string): void
    getPluginData(key: string): string
    /** Enterprise-only. Absent (or throwing) on lower plans — always feature-detect. */
    extend?(name: string): ExtendedVariableCollection
  }

  interface ExtendedVariableCollection extends VariableCollection {
    readonly isExtension: true
    readonly parentVariableCollectionId: string
    readonly rootVariableCollectionId: string
    readonly variableIds: string[]
    /** Overrides only — inherited values are absent. Keyed by the EXTENSION's modeIds. */
    readonly variableOverrides: { readonly [variableId: string]: { readonly [extendedModeId: string]: RGBA | VariableAlias } }
    /** Extension modes mirror the parent's; parentModeId is the routing key for overrides. */
    readonly modes: ReadonlyArray<{ readonly modeId: string; name: string; readonly parentModeId: string }>
    removeOverridesForVariable(variable: Variable): void
    removeMode(modeId: string): void
    extend?(name: string): ExtendedVariableCollection
  }

  type VariableScope = 'ALL_SCOPES' | 'ALL_FILLS' | 'FRAME_FILL' | 'SHAPE_FILL' | 'TEXT_FILL' | 'STROKE_COLOR' | 'EFFECT_COLOR'

  interface Variable {
    readonly id: string
    name: string
    description: string
    scopes: VariableScope[]
    readonly variableCollectionId: string
    /** Values keyed by the OWNING collection's modeIds (the base pair for base variables). */
    readonly valuesByMode: { readonly [modeId: string]: RGBA | VariableAlias }
    /** Routing by an EXTENSION's modeId is what makes a call an override. */
    setValueForMode(modeId: string, value: RGBA | VariableAlias): void
    removeOverrideForMode(modeId: string): void
    /** Inherited + overridden values as seen through `collection` (extension modeId keys). */
    valuesByModeForCollectionAsync(collection: VariableCollection): Promise<{ [modeId: string]: RGBA | VariableAlias }>
  }
}
