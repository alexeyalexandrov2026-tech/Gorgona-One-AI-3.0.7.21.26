#!/usr/bin/env python3
"""Copies the section photographs the app shows on its Search screen out of
the website's own images, so both use the same pictures.

    python3 ios/scripts/import-world-photos.py

Needs Pillow. Rerun it after replacing one of the source photos on the site.
"""
import json
import pathlib

from PIL import Image

REPO = pathlib.Path(__file__).resolve().parents[2]
CATALOG = REPO / "ios/MiamiElio/Resources/Assets.xcassets"
LONGEST_SIDE = 1400

# Asset name -> the website image it is taken from.
PHOTOS = {
    "WorldCars": "public/images/rentals/lamborghini-urus-se/cover.jpg",
    "WorldYachts": "public/images/home/worlds/yacht-princess.jpg",
    "WorldVillas": "public/images/home/worlds/stay-miami-beach.jpg",
    "WorldEvents": "public/images/home/worlds/events-stage.jpg",
    "WorldDining": "public/images/home/worlds/deco-street.jpg",
    "WorldExperiences": "public/images/home/hero-tower.jpg",
    "WorldTravel": "public/images/home/worlds/travel-wing.jpg",
    "WorldShopping": "public/images/home/worlds/deals-bags.jpg",
}

for name, source in PHOTOS.items():
    folder = CATALOG / f"{name}.imageset"
    folder.mkdir(parents=True, exist_ok=True)
    photo = Image.open(REPO / source).convert("RGB")
    photo.thumbnail((LONGEST_SIDE, LONGEST_SIDE), Image.LANCZOS)
    photo.save(folder / f"{name}.jpg", quality=82, optimize=True, progressive=True)
    (folder / "Contents.json").write_text(
        json.dumps(
            {
                "images": [{"filename": f"{name}.jpg", "idiom": "universal"}],
                "info": {"author": "xcode", "version": 1},
            },
            indent=2,
        )
        + "\n"
    )
    size = (folder / f"{name}.jpg").stat().st_size // 1024
    print(f"{name:18} {photo.size[0]}x{photo.size[1]}  {size} KB  <- {source}")
