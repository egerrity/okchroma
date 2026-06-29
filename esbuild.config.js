const esbuild = require('esbuild')
const fs = require('fs')
const { execSync } = require('child_process')
const isWatch = process.argv.includes('--watch')
const isPlugin = process.argv.includes('--plugin')

async function main() {
  if (isPlugin) {
    await buildPlugin()
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

  // 2. Run the generator to produce neutral.css + brands.css
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

main().catch(e => { console.error(e); process.exit(1) })
