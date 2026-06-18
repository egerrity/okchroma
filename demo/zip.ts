// Minimal, dependency-free ZIP writer (STORE method, no compression) — just
// enough to bundle the two Figma mode files into a single download, since
// browsers (especially locked-down work environments) block multiple
// programmatic downloads from one click. Produces a standard .zip.

const crcTable = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i++) c = crcTable[(c ^ bytes[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

export interface ZipEntry { name: string; content: string }

export function makeZip(entries: ZipEntry[]): Blob {
  const enc = new TextEncoder()
  const chunks: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0

  const u16 = (n: number) => new Uint8Array([n & 0xff, (n >>> 8) & 0xff])
  const u32 = (n: number) => new Uint8Array([n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff])
  const concat = (...parts: Uint8Array[]) => {
    const len = parts.reduce((a, p) => a + p.length, 0)
    const out = new Uint8Array(len)
    let o = 0
    for (const p of parts) { out.set(p, o); o += p.length }
    return out
  }

  for (const e of entries) {
    const name = enc.encode(e.name)
    const data = enc.encode(e.content)
    const crc = crc32(data)
    const local = concat(
      u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), name, data,
    )
    chunks.push(local)
    central.push(concat(
      u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(data.length), u32(data.length),
      u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name,
    ))
    offset += local.length
  }

  const cd = concat(...central)
  const end = concat(
    u32(0x06054b50), u16(0), u16(0), u16(entries.length), u16(entries.length),
    u32(cd.length), u32(offset), u16(0),
  )
  return new Blob([concat(...chunks), cd, end], { type: 'application/zip' })
}
