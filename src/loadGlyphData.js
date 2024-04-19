import Aseprite from 'ase-parser'
import { readFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'

const glyphDataPath = resolve(import.meta.dirname, '../glyph-data')

const charsPath = resolve(glyphDataPath, 'chars.aseprite')
const wordsPath = resolve(glyphDataPath, 'words.aseprite')
const metadataPath = resolve(glyphDataPath, 'metadata.js')

export const loadGlyphData = async () => {
  const [charsFile, wordsFile, metadataFile] = await Promise.all([
    readFile(charsPath),
    readFile(wordsPath),
    import(`file://${metadataPath}`)
  ])

  const charsData = new Aseprite(charsFile, basename(charsPath))
  const wordsData = new Aseprite(wordsFile, basename(wordsPath))
  const metadata = /** @type {Metadata} */ (metadataFile.metadata)

  for (const [key, glyph] of Object.entries(metadata.glyphs)) {
    if (glyph.name == null) {
      glyph.name = key
    }
  }

  parseAseprite(charsData, metadata, { autoUnicode: true })
  parseAseprite(wordsData, metadata, { prefix: 'tp.' })

  for (const glyph of Object.values(metadata.glyphs)) {
    if (glyph.name.startsWith('tp.')) {
      if (glyph.ligatures == null) {
        glyph.ligatures = [glyph.name.slice(3)]
      }

      if (glyph.cartouche !== 'inside') {
        const { width, height, offsetX, offsetY, pixels } = /** @type {Required<GlyphData>} */ (glyph)

        const cartWidth = 8
        const cartheight = 7

        /** @type {boolean[]} */
        const cartPixels = new Array(offsetY * cartWidth).fill(false)

        for (let i = 0; i < height; i++) {
          /** @type {boolean[]} */
          const row = new Array(cartWidth - width).fill(false)
          row.splice(offsetX, 0, ...pixels.slice(i * width, (i + 1) * width))

          if (glyph.cartouche === 'close') {
            for (const [i, pixel] of row.entries()) {
              if (pixel) {
                break
              }
              row[i] = true
            }
          } else if (glyph.cartouche === 'open') {
            let flip = false
            for (const [i, pixel] of row.entries()) {
              if (!flip && pixel) {
                flip = true
              }

              if (flip) {
                row[i] = true
              }
            }
          }

          cartPixels.push(...row)
        }

        while (cartPixels.length < cartWidth * cartheight) {
          cartPixels.push(false)
        }

        const flipPixels = glyph.cartouche == null

        const name = `${glyph.name}.cart`

        const cartGlyph = structuredClone(glyph)
        cartGlyph.name = name
        cartGlyph.cartouche = 'inside'
        cartGlyph.width = cartWidth
        cartGlyph.height = cartheight
        cartGlyph.offsetX = 0
        cartGlyph.offsetY = 0
        cartGlyph.unicode = undefined
        cartGlyph.pixels = flipPixels ? cartPixels.map(pixel => !pixel) : cartPixels
        cartGlyph.ligatures = []
        cartGlyph.alternate = glyph.name

        metadata.glyphs[name] = cartGlyph
      }
    }
  }

  return metadata
}

/**
 * @typedef {Partial<{
 *  autoUnicode: boolean
 *  prefix: string
 * }>} ParserOptions
 */

/**
 * @param {Aseprite} aseprite
 * @param {Metadata} metadata
 * @param {ParserOptions} options
 */
const parseAseprite = (aseprite, metadata, options = {}) => {
  aseprite.parse()

  for (const cel of aseprite.frames[0].cels) {
    const layer = aseprite.layers[cel.layerIndex].name

    if (layer.startsWith('--')) {
      continue
    }

    const width = cel.w
    const height = cel.h
    const offsetX = cel.xpos - 1
    const offsetY = cel.ypos - 1

    const pixels = Array.from(cel.rawCelData).map(a => a === 1)

    const name = `${options.prefix ?? ''}${layer}`

    if (metadata.glyphs[name] == null) {
      metadata.glyphs[name] = { name }
    }

    const glyphData = metadata.glyphs[name]

    glyphData.name = glyphData.name ?? name
    glyphData.width = width
    glyphData.height = height
    glyphData.offsetX = offsetX
    glyphData.offsetY = offsetY
    glyphData.pixels = pixels

    if (options.autoUnicode) {
      glyphData.unicode = glyphData.unicode ?? name.charCodeAt(0)
    }
  }
}
