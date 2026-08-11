// Minimal ambient typings for the Mapper's sandbox — READ-side surface only
// (Stage 1 is inspect-only: traversal, paints, bound variables, text segments).
// Standalone like the other two plugins' shims; Stage 2 adds the rebind writers.

declare const __html__: string

declare namespace figma {
  function showUI(html: string, options?: { width?: number; height?: number; themeColors?: boolean }): void
  function closePlugin(message?: string): void
  function notify(message: string, options?: { error?: boolean; timeout?: number }): void
  function loadAllPagesAsync(): Promise<void>
  function getNodeByIdAsync(id: string): Promise<SceneNode | null>

  const ui: {
    onmessage: ((msg: Record<string, unknown>) => void) | null
    postMessage(msg: unknown): void
  }

  /** Sentinel for mixed-valued properties (mixed fills etc.) */
  const mixed: unique symbol

  const currentPage: PageNode
  const root: { readonly children: ReadonlyArray<PageNode> }
  const viewport: { scrollAndZoomIntoView(nodes: ReadonlyArray<SceneNode>): void }

  namespace variables {
    function getVariableByIdAsync(id: string): Promise<Variable | null>
    function getVariableCollectionByIdAsync(id: string): Promise<VariableCollection | null>
  }

  type RGB = { r: number; g: number; b: number }
  interface VariableAlias { type: 'VARIABLE_ALIAS'; id: string }

  interface SolidPaint {
    readonly type: 'SOLID'
    readonly color: RGB
    readonly opacity?: number
    readonly visible?: boolean
    readonly boundVariables?: { readonly color?: VariableAlias }
  }
  /** Non-solid paints only need the discriminant here. */
  interface OtherPaint { readonly type: string; readonly visible?: boolean }
  type Paint = SolidPaint | OtherPaint

  interface StyledTextSegment {
    readonly characters: string
    readonly start: number
    readonly end: number
    readonly fills: ReadonlyArray<Paint>
  }

  interface SceneNode {
    readonly id: string
    readonly name: string
    readonly type: string
    readonly visible?: boolean
    readonly removed?: boolean
    readonly children?: ReadonlyArray<SceneNode>
    readonly fills?: ReadonlyArray<Paint> | typeof mixed
    readonly strokes?: ReadonlyArray<Paint>
    /** Index-aligned with fills/strokes; null holes for unbound paints. */
    readonly boundVariables?: {
      readonly fills?: ReadonlyArray<VariableAlias | null>
      readonly strokes?: ReadonlyArray<VariableAlias | null>
    }
    /** TEXT nodes only. */
    getStyledTextSegments?(fields: ReadonlyArray<'fills'>): ReadonlyArray<StyledTextSegment>
  }

  interface PageNode extends SceneNode {
    selection: ReadonlyArray<SceneNode>
  }

  interface VariableCollection { readonly id: string; readonly name: string }

  interface Variable {
    readonly id: string
    readonly name: string
    readonly key: string
    readonly remote: boolean
    readonly resolvedType: string
    readonly variableCollectionId: string
  }
}
