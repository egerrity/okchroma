// The package gate: nothing ships without a source.
//
//   npm run audit:lib
//
// package.json `files` ships its folders whole, so every file under them on the packing
// disk is in the tarball. Both halves of build:lib write into dist-lib and neither removes
// a file an earlier build wrote, which is why buildLib (esbuild.config.js) empties the
// folder first. This gate reads what is on disk and builds nothing: a gate that built
// first would empty the folder and could not see a leftover.
//
//   A. every file under a `files` path is a declaration in the declaration folder with
//      its source at the same path under the source root, or, outside that folder, an
//      entry file package.json names (main, module, types, the exports map)
//   B. every entry file package.json names is on disk
//
// The declaration folder and the source root are outDir and rootDir in tsconfig.lib.json.
// A catches a declaration whose source is gone and any other file the build did not
// write. B catches the folder emptied after tsc wrote into it (the halves of build:lib in
// the other order). prepack runs this after build:lib, so a pack or a publish stops on a
// failure. Nothing here is blessed.
import * as fs from 'fs'
import * as path from 'path'

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
const lib = JSON.parse(fs.readFileSync('tsconfig.lib.json', 'utf8')).compilerOptions
const typesDir = path.normalize(lib.outDir)
const srcDir = path.normalize(lib.rootDir)
const shipped: string[] = pkg.files.map((f: string) => path.normalize(f))

const failures: string[] = []
const fail = (msg: string) => failures.push(msg)

// every path package.json serves: main, module, types, and each leaf of the exports map
const entries = new Set<string>()
const collect = (v: unknown): void => {
  if (typeof v === 'string') entries.add(path.normalize(v))
  else if (v && typeof v === 'object') Object.values(v).forEach(collect)
}
for (const key of ['main', 'module', 'types', 'exports']) collect(pkg[key])

const walk = (p: string): string[] =>
  fs.statSync(p).isDirectory() ? fs.readdirSync(p).sort().flatMap(f => walk(path.join(p, f))) : [p]

// A. every shipped file traces to a source
let files = 0, declarations = 0
for (const root of shipped) {
  if (!fs.existsSync(root)) { fail(`${root}: package.json files ships it and it is not on disk; this gate builds nothing, run npm run build:lib first`); continue }
  for (const file of walk(root)) {
    files++
    const rel = path.relative(typesDir, file)
    if (rel.startsWith('..' + path.sep)) {
      if (!entries.has(file)) fail(`${file}: not a declaration, and package.json names no such entry`)
    } else if (!rel.endsWith('.d.ts')) {
      fail(`${file}: in the declaration folder and not a declaration`)
    } else {
      const source = path.join(srcDir, rel.slice(0, -'.d.ts'.length))
      if (fs.existsSync(source + '.ts') || fs.existsSync(source + '.tsx')) declarations++
      else fail(`${file}: no source at ${source}.ts`)
    }
  }
}

// B. every entry file is there
for (const entry of entries)
  if (!fs.existsSync(entry)) fail(`${entry}: package.json names it as an entry and it is not on disk`)

if (failures.length) {
  console.error(`audit:lib FAILED (${failures.length})`)
  for (const f of failures.slice(0, 60)) console.error('  ' + f)
  if (failures.length > 60) console.error(`  ... ${failures.length - 60} more`)
  process.exit(1)
}
console.log(`audit:lib ok: ${files} files under ${shipped.join(', ')}; ${declarations} declarations, each with its source under ${srcDir}; ${entries.size} entry files on disk`)
