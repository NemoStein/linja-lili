type DeepPartial<T> = T extends object ? {
  [P in keyof T]?: DeepPartial<T[P]>
} : T

interface GlyphData {
  name: string
  width?: number
  height?: number
  offsetX?: number
  offsetY?: number
  pixels?: boolean[]
  unicode?: number
  index?: number
  ligatures?: string[]
  alternate?: string
  zeroWidth?: boolean
  cartouche?: 'open'|'inside'|'close'
}

interface Metadata {
  glyphs: {
    [name: string]: GlyphData
  }
}
