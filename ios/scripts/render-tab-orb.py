#!/usr/bin/env python3
"""Draws the gold orb that stands for the concierge in the tab bar.

    python3 ios/scripts/render-tab-orb.py

A tab bar icon has to be a picture, so this paints the same sphere as
`ConciergeMark` in `Support/Brand.swift` (same colours, same off-centre
highlight) into the asset catalogue: `TabOrbSelected` at full strength and
`TabOrb`, a muted one for when another tab is showing. Rerun it after
changing the gold in `Support/Theme.swift`. Needs Pillow and NumPy.
"""
import json
import pathlib

import numpy as np
from PIL import Image

CATALOG = pathlib.Path(__file__).resolve().parents[1] / "MiamiElio/Resources/Assets.xcassets"

# Theme.goldLight, Theme.gold, Theme.goldDeep and Theme.paper.
GOLD_LIGHT = (0xF3, 0xE2, 0xB8)
GOLD = (0xC9, 0xA4, 0x5C)
GOLD_DEEP = (0x7A, 0x5C, 0x24)
PAPER = (0x0A, 0x12, 0x18)

POINTS = 26        # The icon's size in the tab bar.
ORB = 23           # The sphere inside it, leaving a little air.
OVERSAMPLE = 4     # Drawn larger, then reduced, for a smooth edge.


def sphere(pixels, strength):
    """An RGBA sphere `pixels` wide. `strength` 1 is the full gold; lower
    values sink it toward the bar's own colour."""
    size = pixels * OVERSAMPLE
    diameter = size * ORB / POINTS
    y, x = np.mgrid[0:size, 0:size].astype(np.float64) + 0.5
    centre = size / 2

    # The highlight sits up and to the left, as ConciergeMark's gradient does.
    left = centre - diameter / 2
    light = np.hypot(x - (left + diameter * 0.34), y - (left + diameter * 0.28))
    t = np.clip((light - diameter * 0.04) / (diameter * 0.74), 0, 1)

    stops = np.array([GOLD_LIGHT, GOLD, GOLD_DEEP], dtype=np.float64)
    lower = np.clip((t * 2).astype(int), 0, 1)
    blend = (t * 2 - lower)[..., None]
    colour = stops[lower] * (1 - blend) + stops[lower + 1] * blend
    colour = colour * strength + np.array(PAPER, dtype=np.float64) * (1 - strength)

    inside = np.hypot(x - centre, y - centre) <= diameter / 2
    rgba = np.dstack([colour, np.where(inside, 255.0, 0.0)])
    image = Image.fromarray(rgba.round().astype(np.uint8), "RGBA")
    return image.resize((pixels, pixels), Image.LANCZOS)


def write(name, strength):
    folder = CATALOG / f"{name}.imageset"
    folder.mkdir(parents=True, exist_ok=True)
    images = []
    for scale in (2, 3):
        filename = f"{name}@{scale}x.png"
        sphere(POINTS * scale, strength).save(folder / filename, optimize=True)
        images.append({"filename": filename, "idiom": "universal", "scale": f"{scale}x"})
    contents = {
        "images": images,
        "info": {"author": "xcode", "version": 1},
        # Shown in its own colours: the tab bar would otherwise flatten it
        # into a single-colour silhouette.
        "properties": {"template-rendering-intent": "original"},
    }
    (folder / "Contents.json").write_text(json.dumps(contents, indent=2) + "\n")
    print(f"Wrote {folder.relative_to(CATALOG.parents[2])}")


write("TabOrbSelected", 1.0)
write("TabOrb", 0.5)
