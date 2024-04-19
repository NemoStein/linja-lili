import { FontBuilder } from './FontBuilder.js'
import { loadGlyphData } from './loadGlyphData.js'

export const generate = async () => {
  const glyphData = await loadGlyphData()
  const font = new FontBuilder('linja lili', 'lili', '1.0.0')

  for (const [key, data] of Object.entries(glyphData.glyphs)) {
    font.addGlyph(key, data)
  }

  font.build()

  return font
}
