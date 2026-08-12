const esbuild = require('esbuild')
const fs = require('fs')
const { execSync } = require('child_process')
const isWatch = process.argv.includes('--watch')
const isPlugin = process.argv.includes('--plugin')
const isPluginExt = process.argv.includes('--plugin-ext')
const isPluginUnify = process.argv.includes('--plugin-unify')
const isLib = process.argv.includes('--lib')

async function main() {
  if (isLib) {
    await buildLib()
    return
  }
  if (isPlugin) {
    await buildPlugin()
    return
  }
  if (isPluginExt) {
    await buildPluginExt()
    return
  }
  if (isPluginUnify) {
    await buildPluginUnify()
    return
  }

  // 1. Bundle the token generator (Node.js)
  await esbuild.build({
    entryPoints: ['src/build.ts'],
    bundle: true,
    platform: 'node',
    target: 'node18',
    outfile: 'dist/build-script.js',
  })

  // 2. Run the generator to produce signals.css (the only fixed CSS output left —
  // per-brand CSS is generated live in-browser by the demo pages, and the neutral
  // is generated per brand too, so neither is written to disk here).
  console.log('Generating tokens...')
  execSync('node dist/build-script.js', { stdio: 'inherit' })

  // 3. Bundle the demo (browser). The calibration rigs (collision /
  // signal-lab / neutral-lab) were removed 2026-06-11 — engine work done;
  // git history has them if a future calibration pass needs them.
  const demoBuildCtx = await esbuild.context({
    entryPoints: [
      { in: 'demo/index.tsx', out: 'demo' },
    ],
    bundle: true,
    platform: 'browser',
    target: 'es2017',
    jsx: 'automatic',
    outdir: 'dist',
  })

  if (isWatch) {
    await demoBuildCtx.watch()
    console.log('Watching demo...')
  } else {
    await demoBuildCtx.rebuild()
    await demoBuildCtx.dispose()
    console.log('Build complete.')
  }
}

// npm library target (dist-lib/). Self-contained: helmlab (the one runtime
// dependency, P2 adjacency metric) is bundled in, so the published package
// declares no dependencies. Declarations come from tsc -p tsconfig.lib.json
// (run by the build:lib script after this).
async function buildLib() {
  const shared = {
    entryPoints: ['src/index.ts'],
    bundle: true,
    platform: 'neutral',
    target: 'es2020',
  }
  await esbuild.build({ ...shared, format: 'esm', outfile: 'dist-lib/index.mjs' })
  await esbuild.build({ ...shared, format: 'cjs', outfile: 'dist-lib/index.cjs' })
  console.log('Lib built → dist-lib/index.mjs + dist-lib/index.cjs')
}

async function buildPlugin() {
  // Output next to the plugin so manifest paths (relative to manifest.json)
  // resolve to plugin/dist/* — Figma loads main/ui relative to the manifest.
  // Main thread (Figma sandbox) — no DOM, just the Figma plugin globals.
  await esbuild.build({
    entryPoints: ['plugin/code.ts'],
    bundle: true,
    platform: 'browser',
    target: 'es2017',
    outfile: 'plugin/dist/plugin-code.js',
  })

  // UI thread (browser iframe) — imports the engine and drives the form.
  await esbuild.build({
    entryPoints: ['plugin/ui.ts'],
    bundle: true,
    platform: 'browser',
    target: 'es2017',
    outfile: 'plugin/dist/plugin-ui-bundle.js',
  })

  // Inline the bundle into the HTML template so Figma gets one self-contained file.
  const template = fs.readFileSync('plugin/ui-template.html', 'utf8')
  const bundle = fs.readFileSync('plugin/dist/plugin-ui-bundle.js', 'utf8')
  fs.writeFileSync('plugin/dist/plugin-ui.html', template.replace('__BUNDLE__', bundle))
  console.log('Plugin built → plugin/dist/plugin-code.js + plugin/dist/plugin-ui.html')
}

// Plugin v2 (extended collections, internal) — same two-thread build as v1, its own
// manifest/dist so the published plugin is never touched.
async function buildPluginExt() {
  await esbuild.build({
    entryPoints: ['plugin-ext/code.ts'],
    bundle: true,
    platform: 'browser',
    target: 'es2017',
    outfile: 'plugin-ext/dist/plugin-ext-code.js',
  })

  await esbuild.build({
    entryPoints: ['plugin-ext/ui.ts'],
    bundle: true,
    platform: 'browser',
    target: 'es2017',
    outfile: 'plugin-ext/dist/plugin-ext-ui-bundle.js',
  })

  const template = fs.readFileSync('plugin-ext/ui-template.html', 'utf8')
  const bundle = fs.readFileSync('plugin-ext/dist/plugin-ext-ui-bundle.js', 'utf8')
  fs.writeFileSync('plugin-ext/dist/plugin-ext-ui.html', template.replace('__BUNDLE__', bundle))
  console.log('Plugin-ext built → plugin-ext/dist/plugin-ext-code.js + plugin-ext/dist/plugin-ext-ui.html')
}

// The Mapper (Unify -> okchroma converter, stage 1 = inspect) — same two-thread build.
async function buildPluginUnify() {
  await esbuild.build({
    entryPoints: ['plugin-unify/code.ts'],
    bundle: true,
    platform: 'browser',
    target: 'es2017',
    outfile: 'plugin-unify/dist/plugin-unify-code.js',
  })

  await esbuild.build({
    entryPoints: ['plugin-unify/ui.ts'],
    bundle: true,
    platform: 'browser',
    target: 'es2017',
    outfile: 'plugin-unify/dist/plugin-unify-ui-bundle.js',
  })

  const template = fs.readFileSync('plugin-unify/ui-template.html', 'utf8')
  const bundle = fs.readFileSync('plugin-unify/dist/plugin-unify-ui-bundle.js', 'utf8')
  fs.writeFileSync('plugin-unify/dist/plugin-unify-ui.html', template.replace('__BUNDLE__', bundle))
  console.log('Plugin-unify built → plugin-unify/dist/plugin-unify-code.js + plugin-unify/dist/plugin-unify-ui.html')
}

main().catch(e => { console.error(e); process.exit(1) })
