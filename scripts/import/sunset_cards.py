"""Card-size cover photos for the Sunset Exotics fleet.

Listing cards, the related-car row and the home showcase draw a 3:2 frame with
object-fit: cover. They used the 360 px gallery thumbnail, which left only about
240x160 real pixels of a portrait cover inside that frame. This module makes one
card file per car from the published 1600 px preview of the same supplier photo:
the same centred 3:2 crop the CSS already shows, downscaled to at most 1200x800.

Nothing is generated or enlarged: every pixel comes from the supplier's original
photograph, and a source smaller than the target keeps its own size.

Usage: python scripts/import/sunset_cards.py  (rewrites lib/sunsetFleetSummary.json
with a "card" path per car and writes public/images/rentals/sunset/cards/).
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / 'public'
SUMMARY = ROOT / 'lib/sunsetFleetSummary.json'
ASSETS = ROOT / 'docs/sunset-import/assets.json'
OVERRIDES = ROOT / 'docs/sunset-import/cover-overrides.json'
CARD_WIDTH, CARD_HEIGHT, QUALITY = 1200, 800, 80


def cover_overrides() -> dict[str, str]:
    """slug -> supplier photo URL picked by hand as a sharper exterior cover."""
    if not OVERRIDES.exists():
        return {}
    return json.loads(OVERRIDES.read_text(encoding='utf-8'))['covers']


def apply_cover_overrides(summaries: list[dict[str, Any]], assets: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Points image/thumbnail at the chosen photo; the photo must be one of the imported supplier assets."""
    by_url = {asset['sourceUrl']: asset for asset in assets}
    overrides, rows = cover_overrides(), []
    for summary in summaries:
        url = overrides.get(summary['slug'])
        if url:
            if url not in by_url:
                raise ValueError(f"Cover override is not an imported photo: {summary['slug']}")
            summary = {**summary, 'image': by_url[url]['preview'], 'thumbnail': by_url[url]['thumbnail']}
        rows.append(summary)
    unknown = set(overrides) - {row['slug'] for row in rows}
    if unknown:
        raise ValueError(f'Cover overrides for unknown cars: {sorted(unknown)}')
    return rows


def card_path(preview: str) -> str:
    if '/rentals/sunset/previews/' not in preview:
        raise ValueError(f'Unexpected Sunset preview path: {preview}')
    return preview.replace('/rentals/sunset/previews/', '/rentals/sunset/cards/')


def make_card(preview: Path, destination: Path) -> tuple[int, int]:
    """Centred 3:2 crop of the preview, downscaled (never enlarged) to the card size."""
    with Image.open(preview) as image:
        image.load()
        width, height = image.size
        if width * 2 > height * 3:  # wider than 3:2: trim the sides
            crop_w, crop_h = round(height * 3 / 2), height
        else:  # taller than 3:2: trim top and bottom
            crop_w, crop_h = width, round(width * 2 / 3)
        left, top = (width - crop_w) // 2, (height - crop_h) // 2
        card = image.crop((left, top, left + crop_w, top + crop_h))
        if crop_w > CARD_WIDTH:
            card = card.resize((CARD_WIDTH, round(crop_h * CARD_WIDTH / crop_w)), Image.Resampling.LANCZOS)
        if card.mode not in ('RGB', 'RGBA'):
            card = card.convert('RGB')
        destination.parent.mkdir(parents=True, exist_ok=True)
        card.save(destination, 'WEBP', quality=QUALITY, method=6)
        return card.size


def with_card(summary: dict[str, Any]) -> dict[str, Any]:
    """The summary row with "card" placed right after "thumbnail"."""
    row: dict[str, Any] = {}
    for key, value in summary.items():
        if key == 'card':
            continue
        row[key] = value
        if key == 'thumbnail':
            row['card'] = card_path(summary['image'])
    return row


def ensure_cards(summaries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Adds "card" to every row and writes the card file when its preview is on disk."""
    rows = [with_card(summary) for summary in summaries]
    for row in rows:
        preview = PUBLIC / row['image'].lstrip('/')
        if preview.exists():
            make_card(preview, PUBLIC / row['card'].lstrip('/'))
    return rows


def main() -> None:
    summaries = json.loads(SUMMARY.read_text(encoding='utf-8'))
    assets = json.loads(ASSETS.read_text(encoding='utf-8'))['assets']
    rows = ensure_cards(apply_cover_overrides(summaries, assets))
    missing = [row['slug'] for row in rows if not (PUBLIC / row['card'].lstrip('/')).exists()]
    if missing:
        raise SystemExit(f'Missing preview for {len(missing)} cars: {missing[:5]}')
    SUMMARY.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
    print(f'{len(rows)} card photos written')


if __name__ == '__main__':
    main()
