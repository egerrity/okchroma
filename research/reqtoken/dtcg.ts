// dtcg.ts: the requirement-token portability experiment, parked research (CATALOG C68).
// Serializes the requirement declaration (spec.ts, pure data) into DTCG color tokens and
// parses them back. Each stop or role token carries a frozen $value (the color the
// requirement lane resolves at emit time) and, in $extensions['org.okchroma.requirement'],
// the live requirement plus a named resolver reference. Per DTCG Format 2025.10, unknown
// $extensions entries must be preserved by tools.
//
// Not a shipped output: the requirement lane runs the resolver without the dark carry and
// without the policy layer, so its values are not the shipped values (measured: the light
// scale matches, the stamps and everything in dark do not). The shipped DTCG documents come
// from src/engine/dtcgRender.ts. This file is kept runnable by hand: bundle with esbuild,
// then node (see FORMAT.md and reqtoken-portability.ts).
//
// Scale stops are keyed by number ('0'..'11'); off-scale roles by name (stamp-fill /
// stamp-fill-hover / stamp-fill-pressed). Bundles written under the older role words cta /
// cta-hover / cta-pressed still parse.
import type { StopReq, RoleReq, ModeSpec, OnReq, RoleName } from '../../src/engine/requirements/spec'
import { resolveRamp, type ResolvedRamp, type ResolvedRole } from '../../src/engine/requirements/resolve'
import { MODE_SPECS } from '../../src/engine/requirements/spec'
import { STAMP_FILL, STAMP_FILL_HOVER, STAMP_FILL_PRESSED } from '../../src/engine/tokenNames'

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

// the pre-2026-09-02 role words, accepted on parse only (never emitted)
const LEGACY_ROLE_NAMES: Record<string, RoleName> = {
  'cta': STAMP_FILL, 'cta-hover': STAMP_FILL_HOVER, 'cta-pressed': STAMP_FILL_PRESSED,
}

// components are the 8-bit channels over 255, rounded to four decimals: adjacent 8-bit values stay
// distinct (1/255 = 0.0039) and the file stays readable. hex is the exact value; re-resolution reads
// only the seed's hex, so the rounding never enters a solve.
const hexToValue = (hex: string): DtcgColorValue => {
  const h = hex.replace('#', '')
  const c = (i: number) => Math.round((parseInt(h.slice(i, i + 2), 16) / 255) * 1e4) / 1e4
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
  const roleVal: Record<RoleName, ResolvedRole> = {
    [STAMP_FILL]: ramp.roles.cta, [STAMP_FILL_HOVER]: ramp.roles.ctaHover, [STAMP_FILL_PRESSED]: ramp.roles.ctaPressed,
  }
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
  // a bundle written under the old role words re-resolves as the stamp trio
  if (isRole && LEGACY_ROLE_NAMES[(req as RoleReq).role]) (req as RoleReq).role = LEGACY_ROLE_NAMES[(req as RoleReq).role]
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
