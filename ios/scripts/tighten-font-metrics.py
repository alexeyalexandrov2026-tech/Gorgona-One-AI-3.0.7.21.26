#!/usr/bin/env python3
"""Gives the bundled fonts the line height the website sets them with.

    python3 ios/scripts/tighten-font-metrics.py

As published, Jost asks for lines 1.445 times the type size apart and Bodoni
Moda for 1.525. The website overrides that in CSS (its headings are set at
1 to 1.1), but SwiftUI before iOS 26 has no way to bring lines closer than
the font asks, so a two-line heading in the app came out with half a line of
air between its lines. This rewrites the fonts' own vertical metrics instead,
to just enough room for accented capitals above the baseline and descenders
below it. No letter shape is touched.

Run it again after replacing the files with a fresh download; it is safe to
run twice. The SIL Open Font License allows modified versions, and neither
family reserves a font name. Needs fontTools (`pip install fonttools`).
"""
import pathlib

from fontTools.ttLib import TTFont

FONTS = pathlib.Path(__file__).resolve().parents[1] / "MiamiElio/Resources/Fonts"

# File name pattern -> (room above the baseline, room below it), in ems.
METRICS = {
    "Jost-*.ttf": (0.98, 0.27),          # lines 1.25 em apart
    "BodoniModa*.ttf": (1.0, 0.28),      # lines 1.28 em apart
}

for pattern, (above, below) in METRICS.items():
    for path in sorted(FONTS.glob(pattern)):
        font = TTFont(path)
        em = font["head"].unitsPerEm
        ascent, descent = round(em * above), -round(em * below)
        before = (font["hhea"].ascent - font["hhea"].descent + font["hhea"].lineGap) / em
        # iOS reads the first table; the second is kept in step for other readers.
        font["hhea"].ascent, font["hhea"].descent, font["hhea"].lineGap = ascent, descent, 0
        font["OS/2"].sTypoAscender, font["OS/2"].sTypoDescender, font["OS/2"].sTypoLineGap = ascent, descent, 0
        font.save(path)
        print(f"{path.name}: line height {before:.3f} em -> {(ascent - descent) / em:.3f} em")
