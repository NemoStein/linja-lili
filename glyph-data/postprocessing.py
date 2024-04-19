import fontforge

font = fontforge.open('./dist/linja lili.otf')

font.selection.all()
font.autoHint()
font.removeOverlap()
font.simplify()
font.round()

liga = font.gsub_lookups[0]

font.addLookup('cart', 'gsub_single', None, (), liga)
font.addLookupSubtable('cart', 'cart sub-table')

words = []
cartWords = []

for glyph in font.selection.byGlyphs:
  if (glyph.glyphname.find('tp.') == 0 or glyph.glyphname == 'space') and glyph.glyphname.find('.cart') == -1:
    cartName = glyph.glyphname + '.cart'
    glyph.addPosSub('cart sub-table', cartName)

    if (glyph.glyphname != 'tp.startcart' and glyph.glyphname != 'tp.endcart'):
      words.append(glyph.glyphname)
      cartWords.append(cartName)

font.addLookup('chain', 'gsub_contextchain', None, (('calt',(('dflt',('dflt')),)),), 'cart')
font.addContextualSubtable('chain', 'chain sub-table 1', 'class', '1 | 1 @<cart> | 1',
  bclasses=(None, cartWords + ['tp.startcart.cart', 'space.cart']),
  mclasses=(None, words + ['space.cart']),
  fclasses=(None, words + ['space.cart', 'tp.endcart'])
)

font.addContextualSubtable('chain', 'chain sub-table 2', 'class', '| 1 @<cart> | 1',
  mclasses=(None, ['tp.startcart']),
  fclasses=(None, words)
)

font.addContextualSubtable('chain', 'chain sub-table 3', 'class', '1 | 1 @<cart> |',
  bclasses=(None, cartWords),
  mclasses=(None, ['tp.endcart'])
)

font.generate('./dist/linja lili.otf')

# Don't know why, but without this the font doesn't work
font.close()
font = fontforge.open('./dist/linja lili.otf')
font.generate('./dist/linja lili.otf')