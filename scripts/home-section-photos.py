#!/usr/bin/env python3
"""Cuts the small pictures for the section rail at the top of the home page
(app/components/home/HomeHero.jsx) out of photographs the site already has.

    python3 scripts/home-section-photos.py

The rail shows nine sections at once, so each picture is made at the size it
is shown (96 x 124 CSS pixels, here at three times that) instead of loading
the full photograph nine times over. Rerun after replacing a source photo.
Needs Pillow.
"""
import pathlib

from PIL import Image, ImageOps

REPO = pathlib.Path(__file__).resolve().parents[1]
OUT = REPO / "public/images/home/sections"
SIZE = (288, 372)

# Section id -> (source photograph, where the crop is centred: 0..1 across, 0..1 down).
PHOTOS = {
    "yachts": ("public/images/home/worlds/yacht-princess.jpg", (0.5, 0.5)),
    "villas": ("public/images/home/worlds/stay-miami-beach.jpg", (0.6, 0.5)),
    "cars": ("public/images/rentals/lamborghini-urus-se/cover.jpg", (0.55, 0.6)),
    "experiences": ("public/images/adrenaline365/helicopter-tour.png", (0.5, 0.5)),
    "events": ("public/images/home/worlds/events-stage.jpg", (0.5, 0.5)),
    "dining": ("public/images/home/worlds/deco-street.jpg", (0.5, 0.6)),
    "flights": ("public/images/home/worlds/travel-wing.jpg", (0.5, 0.5)),
    "travel": ("public/images/home/deco-hotel.jpg", (0.5, 0.55)),
    "shopping": ("public/images/home/worlds/deals-bags.jpg", (0.4, 0.5)),
}

OUT.mkdir(parents=True, exist_ok=True)
for name, (source, centre) in PHOTOS.items():
    picture = ImageOps.fit(Image.open(REPO / source).convert("RGB"), SIZE, Image.LANCZOS, centering=centre)
    target = OUT / f"{name}.jpg"
    picture.save(target, quality=80, optimize=True, progressive=True)
    print(f"{target.relative_to(REPO)}  {target.stat().st_size // 1024} KB")
