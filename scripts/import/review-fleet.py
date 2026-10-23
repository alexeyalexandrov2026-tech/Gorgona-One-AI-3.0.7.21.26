"""Produce review contact sheets from already downloaded files (Pillow)."""
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw, ImageFont
import json
import math

ROOT = Path(__file__).resolve().parents[2]
FONT = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 14)


def sheet(items, output):
    width, height, columns = 300, 228, 4
    canvas = Image.new('RGB', (width * columns, height * math.ceil(len(items) / columns)), 'white')
    draw = ImageDraw.Draw(canvas)
    for i, (label, file) in enumerate(items):
        x, y = (i % columns) * width, (i // columns) * height
        with Image.open(file) as image:
            canvas.paste(ImageOps.fit(image.convert('RGB'), (292, 190)), (x + 4, y))
        draw.text((x + 4, y + 193), label[:37], fill='black', font=FONT)
        draw.text((x + 4, y + 210), label[37:74], fill='black', font=FONT)
    canvas.save(output, quality=88)


if __name__ == '__main__':
    inventory = json.loads((ROOT / 'docs/fleet-import/source-inventory.json').read_text(encoding='utf-8'))
    source = [(str(i) + ': ' + v['photoUrls'][0].rsplit('/', 1)[-1],
               ROOT / 'public/images/rentals/miami-source' / v['photoUrls'][0].rsplit('/', 1)[-1])
              for i, v in enumerate(inventory['vehicles']) if not v['excluded']]
    existing = json.loads((ROOT.parent / 'fleet-existing.json').read_text(encoding='utf-8'))
    sheet(source, ROOT / 'docs/fleet-import/source-contact-sheet.jpg')
    sheet([(v['slug'], ROOT / 'public' / v['image'].lstrip('/')) for v in existing], ROOT / 'docs/fleet-import/existing-contact-sheet.jpg')
