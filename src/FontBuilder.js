import { resolve } from 'node:path'
import { Font, Glyph, Path } from 'opentype.js'

/**
 * @typedef {{
 *  glyph: Glyph
 *  index: number
 *  ligatures?: { sub: string[], by: string }[]
 *  alternate?: { sub: string, by: string }
 * }} GlyphMapping
 */

export class FontBuilder {
  /** @type {Font?} */
  #font = null

  /** @type {Map<string, GlyphMapping>} */
  #glyphs = new Map()

  #index = 1
  #verticalFlipOffset = 6 // TODO: Move this elsewhere when implementing linja lili suli

  unitsPerEm = 1024
  pixelsPerEm = 8

  get #scale () {
    return this.unitsPerEm / this.pixelsPerEm
  }

  /**
   * @param {string} fontName
   * @param {string} styleName
   * @param {string} version
   */
  constructor (fontName, styleName, version) {
    this.fontName = fontName
    this.styleName = styleName
    this.version = version
  }

  /**
   * @param {string} key
   * @param {GlyphData} glyphData
   */
  addGlyph (key, glyphData) {
    const index = glyphData.index ?? this.#index++

    const name = glyphData.name
    const width = glyphData.width ?? 0
    const height = glyphData.height ?? 0
    const offsetX = glyphData.offsetX ?? 0
    const offsetY = glyphData.offsetY ?? 0
    const pixels = glyphData.pixels ?? []
    const unicode = glyphData.unicode
    const advanceWidth = glyphData.zeroWidth ? 0 : this.unitsPerEm

    const path = new Path()

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (pixels[y * width + x]) {
          this.drawPixel(path, x + offsetX, y + offsetY)
        }
      }
    }

    const glyph = new Glyph({
      name,
      advanceWidth,
      unicode,
      index,
      path
    })

    /** @type {GlyphMapping} */
    const mapping = { glyph, index }

    if (glyphData.ligatures != null) {
      mapping.ligatures = []

      for (const ligature of glyphData.ligatures) {
        mapping.ligatures.push({ sub: ligature.split(''), by: name })
      }
    }

    if (glyphData.alternate != null) {
      mapping.alternate = { sub: glyphData.alternate, by: key }
    }

    this.#glyphs.set(key, mapping)
  }

  /**
   * @param {Path} path
   * @param {number} x
   * @param {number} y
   */
  drawPixel (path, x, y) {
    const scale = this.#scale

    y = this.#verticalFlipOffset - y

    path.moveTo((x - 0) * scale, (y - 0) * scale)
    path.lineTo((x + 1) * scale, (y - 0) * scale)
    path.lineTo((x + 1) * scale, (y + 1) * scale)
    path.lineTo((x - 0) * scale, (y + 1) * scale)
  }

  build () {
    /** @type {Glyph[]} */
    const glyphs = []

    /** @type {{ sub: number[], by: number }[]} */
    const fontLigatures = []

    /** @type {{ sub: number, by: [number] }[]} */
    const fontAlternates = []

    for (const { glyph, ligatures, alternate } of this.#glyphs.values()) {
      glyphs.push(glyph)

      if (ligatures != null) {
        for (const ligature of ligatures) {
          const data = {
            sub: ligature.sub.map(char => this.#glyphs.get(char)?.index ?? 0),
            by: this.#glyphs.get(ligature.by)?.index ?? 0
          }

          fontLigatures.push(data)
        }
      }

      if (alternate != null) {
        fontAlternates.push({
          sub: this.#glyphs.get(alternate.sub)?.index ?? 0,
          by: [this.#glyphs.get(alternate.by)?.index ?? 0]
        })
      }
    }

    glyphs.sort((a, b) => a.index - b.index)

    this.#font = new Font({
      designer: 'NemoStein',
      familyName: this.fontName,
      styleName: this.styleName,
      version: this.version,
      unitsPerEm: this.unitsPerEm,
      ascender: this.unitsPerEm,
      descender: 0,
      glyphs
    })

    this.#font.validate()

    fontLigatures.sort(({ sub: a }, { sub: b }) => b.length - a.length)
    for (const ligature of fontLigatures) {
      // @ts-expect-error
      this.#font.substitution.addLigature('liga', ligature)
    }
  }

  /**
   * @param {string} folder
   */
  async save (folder) {
    if (this.#font == null) {
      await this.build()
    }

    const font = /** @type {Font} */ (this.#font)
    font.download(resolve(folder, `${this.fontName}.otf`))
  }
}
