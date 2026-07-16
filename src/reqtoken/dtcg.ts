// dtcg.ts — PORTABILITY layer. Serializes the requirement declaration (spec.ts, pure data) into DTCG color
// tokens and parses them back. Each stop/role token carries:
//   $value       — a FROZEN fallback (the resolved color at emit time) so any DTCG tool reads a valid color
//   $extensions['org.okchroma.requirement'] — the live requirement data + a NAMED resolver reference
// A requirement-aware resolver ignores $value and re-resolves from the extension; a dumb tool uses the
// fallback. Per DTCG Format 2025.10, unknown $extensions entries MUST be preserved by tools.
// Scale stops are keyed by number ('1'..'12'); off-scale roles by name ('cta', 'cta-hover') — the numbering
// truth (cta is NOT stop 9) survives serialization.
import type { StopReq, RoleReq, ModeSpec, OnReq } from './spec'
import { resolveRamp, type ResolvedRamp } from './resolve'
import { MODE_SPECS } from './spec'

export const EXT_KEY = 'org.okchroma.requirement'
export const RESOLVER_ID = 'okchroma-reqtoken@2'   // named resolver capability (DTCG "computed source" model)

export type DtcgColorValue = { colorSpace: 'srgb'; components: [number, number, number]; alpha: 1; hex: string }
type ExtCommon = { resolver: string; seed: string; mode: 'light' | 'dark' }
export type DtcgRequirementToken = {
  $type: 'color'
  $value: DtcgColorValue           // fallback: frozen resolved value
  $extensions: { [EXT_KEY]: ExtCommon & (StopReq | RoleReq) }
}
export type DtcgSeedToken = { $type: 'color'; $value: DtcgColorValue }
export type DtcgRampGroup = {
  seed: DtcgSeedToken
  $extensions?: { [EXT_KEY]: { resolver: string; ons: ModeSpec['ons'] } }
  [key: string]: unknown
}

const hexToValue = (hex: string): DtcgColorValue => {
  const h = hex.replace('#', '')
  const c = (i: number) => parseInt(h.slice(i, i + 2), 16) / 255
  return { colorSpace: 'srgb', components: [c(0), c(2), c(4)], alpha: 1, hex: hex.toLowerCase() }
}

// emit a full ramp group: a `seed` token (plain color) + one requirement token per stop and per role,
// fallbacks pre-resolved; the ons declaration rides the group's own $extensions.
export function emitDtcgRamp(hex: string, mode: 'light' | 'dark', groupName: string, spec?: ModeSpec): DtcgRampGroup {
  spec ??= MODE_SPECS[mode]
  const ramp = resolveRamp(hex, mode, spec)
  const seedRef = `{${groupName}.seed}`
  const group: DtcgRampGroup = {
    seed: { $type: 'color', $value: hexToValue(hex) },
    $extensions: { [EXT_KEY]: { resolver: RESOLVER_ID, ons: spec.ons } },
  }
  for (const sp of spec.stops) {
    const st = ramp.stops.find(s => s.stop === sp.stop)!
    group[String(sp.stop)] = { $type: 'color', $value: hexToValue(st.hex), $extensions: { [EXT_KEY]: { resolver: RESOLVER_ID, seed: seedRef, mode, ...sp } } }
  }
  const roleVal = {
    'cta': ramp.roles.cta, 'cta-hover': ramp.roles.ctaHover, 'cta-pressed': ramp.roles.ctaPressed,
    'cta-ink': ramp.roles.ctaInk, 'cta-ink-hover': ramp.roles.ctaInkHover, 'cta-ink-pressed': ramp.roles.ctaInkPressed,
  } as const
  for (const rr of spec.roles) {
    const rv = roleVal[rr.role]
    group[rr.role] = { $type: 'color', $value: hexToValue(rv.hex), $extensions: { [EXT_KEY]: { resolver: RESOLVER_ID, seed: seedRef, mode, ...rr } } }
  }
  return group
}

// parse a token's extension back (throws on a malformed bundle — portability must fail loud)
export function parseToken(token: DtcgRequirementToken): { req: StopReq | RoleReq; seedRef: string; mode: 'light' | 'dark' } {
  const ext = token.$extensions?.[EXT_KEY]
  if (!ext) throw new Error('missing $extensions.' + EXT_KEY)
  if (ext.resolver !== RESOLVER_ID) throw new Error(`unknown resolver "${ext.resolver}" (this resolver is ${RESOLVER_ID})`)
  const { resolver, seed, mode, ...req } = ext
  const isRole = 'role' in req
  if (!isRole) for (const k of ['stop', 'rootL', 'group', 'produce'] as const) if ((req as StopReq)[k] === undefined) throw new Error(`stop requirement missing "${k}"`)
  if (isRole) for (const k of ['role', 'produce', 'floorL', 'chromaMult'] as const) if ((req as RoleReq)[k] === undefined) throw new Error(`role requirement missing "${k}"`)
  return { req: req as StopReq | RoleReq, seedRef: seed, mode }
}

// parse a whole group and RE-RESOLVE from the requirement data (ignoring the frozen $value fallbacks).
export function resolveDtcgRamp(group: DtcgRampGroup): ResolvedRamp {
  const seedHex = group.seed.$value.hex
  const ons = group.$extensions?.[EXT_KEY]?.ons
  if (!ons) throw new Error('missing group-level ons declaration')
  const stops: StopReq[] = []
  const roles: RoleReq[] = []
  let mode: 'light' | 'dark' | undefined
  for (const [k, t] of Object.entries(group)) {
    if (k === 'seed' || k === '$extensions') continue
    const { req, mode: m } = parseToken(t as DtcgRequirementToken)
    mode ??= m
    'role' in req ? roles.push(req) : stops.push(req)
  }
  if (!mode) throw new Error('empty ramp group')
  stops.sort((a, b) => a.stop - b.stop)
  return resolveRamp(seedHex, mode, { stops, roles, ons })
}
