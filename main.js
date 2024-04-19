import { exec } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { generate } from './src/generate.js'

const rootPath = resolve(import.meta.dirname)
const distPath = resolve(rootPath, 'dist')

await Promise.all([
  mkdir(distPath, { recursive: true })
])

const run = async () => {
  const start = performance.now()
  let time = start
  console.log('- Generating font')

  const font = await generate()

  await font.save(distPath)

  console.log(`PostScript generated in ${performance.now() - time}ms`)
  time = performance.now()

  exec('fontforge -script ./glyph-data/postprocessing.py', (error, stdout, stderr) => {
    if (error != null) {
      console.error('\n> Font postprocessing failed')
    }

    console.error(stderr)
    console.error(stdout)

    console.log(`PostScript to TrueType conversion done in ${performance.now() - time}ms`)
    console.log(`Font generated in ${performance.now() - start}ms`)
  })
}

await run()
