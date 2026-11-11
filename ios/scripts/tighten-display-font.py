#!/usr/bin/env python3
"""Gives the bundled Bodoni Moda the line height the website sets it with.

    python3 ios/scripts/tighten-display-font.py

As published, Bodoni Moda asks for lines 1.525 times the type size apart. The
website overrides that in CSS (headings there are set at 1 to 1.12), but
SwiftUI before iOS 26 has no way to bring lines closer than the font asks, so
native headings came out with half a line of air between their lines. This
rewrites the font's own vertical metrics instead: 1.0 em above the baseline,
enough for accented capitals, and 0.28 em below it, enough for descenders.
Lines then sit 1.28 em apart. No letter shape is touched.

Run it again after replacing the files with a fresh download; it is safe to
run twice. The SIL Open Font License allows modified versions, and Bodoni
Moda reserves no font name. Needs fontTools (`pip install fonttools`).
"""
import pathlib

from fontTools.ttLib import TTFont

FONTS = pathlib.Path(__file__).resolve().parents[1] / "MiamiElio/Resources/Fonts"
ASCENT_EM = 1.0
DESCENT_EM = 0.28

for path in sorted(FONTS.glob("BodoniModa*.ttf")):
    font = TTFont(path)
    em = font["head"].unitsPerEm
    ascent, descent = round(em * ASCENT_EM), -round(em * DESCENT_EM)
    before = (font["hhea"].ascent - font["hhea"].descent + font["hhea"].lineGap) / em
    # iOS reads the first table; the second is kept in step for other readers.
    font["hhea"].ascent, font["hhea"].descent, font["hhea"].lineGap = ascent, descent, 0
    font["OS/2"].sTypoAscender, font["OS/2"].sTypoDescender, font["OS/2"].sTypoLineGap = ascent, descent, 0
    font.save(path)
    print(f"{path.name}: line height {before:.3f} em -> {(ascent - descent) / em:.3f} em")
