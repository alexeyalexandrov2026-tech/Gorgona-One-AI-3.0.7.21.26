#!/usr/bin/env python3
"""
Builds the app's ocean brand art from android/art/miami-elio-ocean.jpg (the
owner's artwork: the gold ME monogram over a deep teal sea with a breaking
wave) and the gold monogram already in the app.

Writes:
  res/drawable-nodpi/launcher_foreground.png  the gold monogram, transparent (adaptive icon foreground)
  res/drawable-nodpi/launcher_ocean.png       the sea behind it (adaptive icon background)
  res/mipmap-*/ic_launcher(_round).png        the same, flattened, for launchers without adaptive icons
  res/drawable-nodpi/brand_monogram.png       the monogram alone, for the splash
  res/drawable-nodpi/splash_ocean.jpg         the sea, upright, for the splash
  art/play-icon-512.png                       the Google Play listing icon

Run from the repository root:  python -I android/scripts/build-brand-art.py
The monogram's source is the first run's foreground, kept as art/monogram-on-dark.png.
"""
import os
import shutil
import sys

from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
ART = os.path.join(ROOT, "art")
RES = os.path.join(ROOT, "app", "src", "main", "res")
NODPI = os.path.join(RES, "drawable-nodpi")

OCEAN = os.path.join(ART, "miami-elio-ocean.jpg")
MONOGRAM_ON_DARK = os.path.join(ART, "monogram-on-dark.png")

# The flat ground the old foreground was drawn on.
DARK = (16, 13, 8)

# Regions of the owner's artwork (1727 x 910) with sea and no lettering: the
# monogram's ring ends near x = 1095, and "MIAMI ELIO" runs from y = 640 to
# 700 and ends near x = 1212.
ICON_SEA = (1100, 0, 1727, 627)
SPLASH_SEA = (1225, 0, 1727, 910)

LEGACY = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}


def monogram_on_transparent(dark):
    """The gold of a monogram drawn on DARK, with DARK made transparent (colour to alpha)."""
    rgb = dark.convert("RGB")
    pixels = rgb.load()
    width, height = rgb.size
    # The fullest gold of the drawing: its brightest pixel.
    gold = max((pixels[x, y] for y in range(0, height, 2) for x in range(0, width, 2)), key=sum)
    out = Image.new("RGBA", rgb.size)
    target = out.load()
    for y in range(height):
        for x in range(width):
            c = pixels[x, y]
            shares = [(c[i] - DARK[i]) / max(gold[i] - DARK[i], 1) for i in range(3)]
            alpha = min(1.0, max(0.0, max(shares)))
            if alpha <= 0.02:
                target[x, y] = (0, 0, 0, 0)
                continue
            colour = tuple(min(255, max(0, round(DARK[i] + (c[i] - DARK[i]) / alpha))) for i in range(3))
            target[x, y] = colour + (round(alpha * 255),)
    return out


def circle(size):
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size - 1, size - 1), fill=255)
    return mask


def main():
    if not os.path.exists(OCEAN):
        sys.exit(f"missing {OCEAN}")
    # The first run keeps the monogram as it was drawn, so later runs start from the same source.
    foreground_path = os.path.join(NODPI, "launcher_foreground.png")
    if not os.path.exists(MONOGRAM_ON_DARK):
        shutil.copyfile(foreground_path, MONOGRAM_ON_DARK)

    ocean = Image.open(OCEAN).convert("RGB")
    monogram = monogram_on_transparent(Image.open(MONOGRAM_ON_DARK))
    size = monogram.size[0]  # 432 px: the 108 dp adaptive canvas at xxxhdpi

    sea = ocean.crop(ICON_SEA).resize((size, size), Image.LANCZOS)
    sea.save(os.path.join(NODPI, "launcher_ocean.png"), optimize=True)
    monogram.save(foreground_path, optimize=True)

    full = sea.convert("RGBA")
    full.alpha_composite(monogram)

    # Legacy icons show the middle 72 dp of the 108 dp canvas.
    inner = full.crop((size // 6, size // 6, size - size // 6, size - size // 6))
    for density, pixels in LEGACY.items():
        folder = os.path.join(RES, f"mipmap-{density}")
        icon = inner.resize((pixels, pixels), Image.LANCZOS)
        icon.convert("RGB").save(os.path.join(folder, "ic_launcher.png"), optimize=True)
        round_icon = Image.new("RGBA", (pixels, pixels), (0, 0, 0, 0))
        round_icon.paste(icon, (0, 0), circle(pixels))
        round_icon.save(os.path.join(folder, "ic_launcher_round.png"), optimize=True)

    # Google Play: a full 512 px square; Play only rounds the corners, so the
    # monogram can be larger than inside a launcher's mask.
    play = sea.resize((512, 512), Image.LANCZOS).convert("RGBA")
    big = round(512 * 1.2)
    larger = monogram.resize((big, big), Image.LANCZOS)
    play.alpha_composite(larger, dest=(0, 0), source=((big - 512) // 2, (big - 512) // 2))
    play.convert("RGB").save(os.path.join(ART, "play-icon-512.png"), optimize=True)

    # The monogram alone, trimmed to its ring, for the splash.
    monogram.crop(monogram.getbbox()).save(os.path.join(NODPI, "brand_monogram.png"), optimize=True)

    # The sea upright for the splash; the screen crops it to fit.
    ocean.crop(SPLASH_SEA).save(os.path.join(NODPI, "splash_ocean.jpg"), quality=88, optimize=True)
    print("brand art written")


if __name__ == "__main__":
    main()
