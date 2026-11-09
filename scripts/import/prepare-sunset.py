"""Reproducible import of a captured public Sunset car catalogue.

No credentials, bookings, database writes or runtime supplier requests. The input
is captured from fleet_items_public by the supplier's own public inventory page.
Original image bytes are retained in the ignored local archive; bounded WebP
copies serve every photograph without copying 10 GB into the deployment.
"""
from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from hashlib import sha256
from io import BytesIO
import json
from pathlib import Path
import re
import time
from typing import Any, TypedDict
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[2]
DOCS = ROOT / 'docs/sunset-import'
ASSETS = ROOT / 'public/images/rentals/sunset'
ARCHIVE = ROOT / '.cache/sunset-originals'
HOST = 'vvjvoesmujtoyysjyzbj.supabase.co'
PREFIX = '/storage/v1/object/public/fleet-images/'


class Asset(TypedDict):
    sourceUrl: str
    path: str
    preview: str
    thumbnail: str
    sha256: str
    bytes: int
    width: int
    height: int
    publishedSha256: str
    originalArchive: str


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')


def image_name(url: str) -> str:
    parsed = urlparse(url)
    if parsed.scheme != 'https' or parsed.hostname != HOST or parsed.query or parsed.fragment:
        raise ValueError('Unexpected public fleet image URL')
    path = parsed.path.removeprefix('/storage/v1/object/public/')
    if not re.fullmatch(r'(?:fleet-images/(?:covers/)?[a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|webp|avif)|listing-images/photo-vault/[a-f0-9]{64}/[a-f0-9]{64}\.image)', path, re.I):
        raise ValueError('Unexpected image filename')
    return sha256(url.encode()).hexdigest()[:24] + Path(path).suffix.lower()


def photos(vehicle: dict[str, Any]) -> list[str]:
    # Some records also provide a separate responsive cover in their specs.
    extras = [vehicle['specs'].get(k) for k in ('cover_desktop_url', 'cover_mobile_url')]
    return list(dict.fromkeys(vehicle['images'] + [u for u in extras if isinstance(u, str) and u]))


def download(url: str, previous: dict[str, Asset]) -> Asset:
    name = image_name(url)
    target = ARCHIVE / name
    if target.exists():
        data = target.read_bytes()
        if url in previous and sha256(data).hexdigest() != previous[url]['sha256']:
            raise ValueError(f'Cached original checksum mismatch: {name}')
    else:
        for attempt in range(3):
            try:
                with urlopen(Request(url, headers={'User-Agent': 'MiamiElio-CatalogImport/1.0'}), timeout=60) as response:
                    if response.status != 200 or not response.headers.get('Content-Type', '').startswith('image/'):
                        raise ValueError(f'Unexpected image response: {name}')
                    data = response.read(100_000_001)
                break
            except (HTTPError, URLError, TimeoutError) as error:
                if attempt == 2 or isinstance(error, HTTPError) and error.code not in (429, 500, 502, 503, 504):
                    raise
                time.sleep(2 ** attempt)
        if len(data) > 100_000_000:
            raise ValueError(f'Original exceeds import memory bound: {name}')
        with Image.open(BytesIO(data)) as image:
            image.verify()
        target.parent.mkdir(parents=True, exist_ok=True)
        temporary = target.with_suffix(target.suffix + '.part')
        temporary.write_bytes(data)
        temporary.replace(target)
    with Image.open(BytesIO(data)) as image:
        width, height = image.size
        if width < 1 or height < 1 or width * height > 100_000_000:
            raise ValueError(f'Invalid image dimensions: {name}')
        oriented = ImageOps.exif_transpose(image)
        # Keep transparency and proportions; never crop another car into a cover.
        oriented = oriented.convert('RGBA' if 'A' in oriented.getbands() else 'RGB')
        for folder, size, quality in [('previews', 1600, 84), ('thumbs', 360, 78)]:
            destination = ASSETS / folder / (name + '.webp')
            if not destination.exists():
                destination.parent.mkdir(parents=True, exist_ok=True)
                derivative = oriented.copy()
                derivative.thumbnail((size, size), Image.Resampling.LANCZOS)
                derivative.save(destination, 'WEBP', quality=quality, method=4)
    base = '/images/rentals/sunset/'
    published = ASSETS / 'previews' / (name + '.webp')
    return {'sourceUrl': url, 'path': base + 'previews/' + name + '.webp',
            'preview': base + 'previews/' + name + '.webp', 'thumbnail': base + 'thumbs/' + name + '.webp',
            'sha256': sha256(data).hexdigest(), 'bytes': len(data), 'width': width, 'height': height,
            'publishedSha256': sha256(published.read_bytes()).hexdigest(), 'originalArchive':'.cache/sunset-originals/'+name}


def category(vehicle: dict[str, Any]) -> str:
    text = (vehicle['category'] + ' ' + vehicle['title']).lower()
    if any(word in text for word in ('suv', 'truck', 'escalade', 'cullinan', 'dbx', 'g63', 'g550', 'range rover', 'model y', 'model x', 'mach-e', 'equinox', 'vinfast vf9', 'vinfast vf8')):
        return 'SUVs'
    if any(word in text for word in ('convertible', 'spyder', 'spider', 'cabriolet', 'roadster', 'dawn', 'portofino')):
        return 'Convertibles'
    if 'sedan' in text or any(word in text for word in ('ghost', 'lucid air', 'taycan', 'model 3', 'model s')) or 'spectre' not in text and 'maybach s' in text:
        return 'Sedans'
    return 'Sports'


def build(snapshot: dict[str, Any], assets: list[Asset], record_evidence: bool = True) -> None:
    index = {asset['sourceUrl']: asset for asset in assets}
    summaries, details = [], {}
    for vehicle in snapshot['vehicles']:
        slug = 'sunset-' + vehicle['slug']
        gallery = [index[url] for url in photos(vehicle)]
        cover = vehicle['cover_image_index']
        if not isinstance(cover, int) or cover < 0 or cover >= len(vehicle['images']):
            raise ValueError(f'Invalid cover index: {slug}')
        selected = index[vehicle['images'][cover]]
        money = lambda value: f'${value:,.0f}' if value is not None and float(value).is_integer() else f'${value:,.2f}' if value is not None else 'On request'
        summaries.append({'id': slug, 'slug': slug, 'title': vehicle['title'], 'company': 'Sunset Exotics',
            'supplier': 'Sunset Exotics', 'sourceId': vehicle['id'], 'sourceSlug': vehicle['slug'],
            'sourceUpdatedAt': vehicle['updated_at'], 'category': category(vehicle),
            'sourceCategory': vehicle['category'], 'location': vehicle['location'] or 'On request',
            'dailyPrice': money(vehicle['price_per_day']), 'weeklyPrice': money(vehicle['price_per_week']),
            'monthlyPrice': money(vehicle['price_per_month']), 'securityDeposit': 'On request',
            'availability': 'Enquire', 'image': selected['preview'], 'thumbnail': selected['thumbnail'],
            'description': vehicle['description'], 'featured': False})
        details[slug] = {'gallery': [a['preview'] for a in gallery],
            'galleryThumbnails': [a['thumbnail'] for a in gallery], 'originalPhotos': [a['path'] for a in gallery],
            'specs': {k: v for k, v in vehicle['specs'].items() if not k.startswith('cover_')},
            'amenities': vehicle['amenities'], 'didYouKnow': vehicle['did_you_know'],
            'richContent': vehicle['rich_content'], 'includedDailyMileage': vehicle['included_daily_mileage'],
            'overMileageFee': vehicle['over_mileage_fee'], 'noInsuranceRequired': vehicle['no_insurance_required'],
            'chauffeur': {'enabled': vehicle['chauffeur_enabled'], 'hourlyRate': vehicle['chauffeur_hourly_rate'],
                'minimumHours': vehicle['chauffeur_min_hours'], 'capacity': vehicle['chauffeur_capacity'],
                'interiorColor': vehicle['chauffeur_interior_color']},
            'sourceUrl': 'https://sunsetexoticsmiami.com/car/' + vehicle['slug'],
            'sourceSeoTitle': vehicle['seo_title'], 'sourceSeoDescription': vehicle['seo_description'],
            'capturedAt': snapshot['capturedAt']}
    write_json(ROOT / 'lib/sunsetFleetSummary.json', summaries)
    write_json(ROOT / 'lib/server/sunsetFleetDetails.json', details)
    if not record_evidence:
        return
    write_json(DOCS / 'assets.json', {'schemaVersion': 1, 'assets': assets})
    write_json(DOCS / 'report.json', {'schemaVersion': 1, 'source': snapshot['source'],
        'capturedAt': snapshot['capturedAt'], 'generatedAt': datetime.now(timezone.utc).isoformat(),
        'cars': len(summaries), 'sourcePhotos': sum(len(v['images']) for v in snapshot['vehicles']),
        'importedPhotos': len(assets), 'originalBytes': sum(a['bytes'] for a in assets),
        'missingLocations': [v['slug'] for v in snapshot['vehicles'] if not v['location']],
        'failedPhotos': [], 'bookingMode': 'manual-confirmation-and-payment', 'productionPublished': False})


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--workers', type=int, default=6, choices=range(1, 9))
    parser.add_argument('--metadata-only', action='store_true', help='Generate catalogue metadata; does not claim photos downloaded')
    args = parser.parse_args()
    snapshot = json.loads((DOCS / 'source-inventory.json').read_text(encoding='utf-8'))
    vehicles = snapshot['vehicles']
    if snapshot['schemaVersion'] != 1 or not vehicles or len({v['id'] for v in vehicles}) != len(vehicles) or len({v['slug'] for v in vehicles}) != len(vehicles):
        raise ValueError('Invalid snapshot identity')
    for vehicle in vehicles:
        if vehicle['item_type'] != 'car' or vehicle['status'] != 'published' or not re.fullmatch(r'[a-z0-9][a-z0-9-]{0,111}', vehicle['slug']):
            raise ValueError('Invalid car identity')
        if not vehicle['title'] or not vehicle['description'] or not vehicle['images'] or not isinstance(vehicle['price_per_day'], (int, float)) or vehicle['price_per_day'] <= 0:
            raise ValueError(f'Incomplete car: {vehicle["slug"]}')
    urls = sorted({u for vehicle in vehicles for u in photos(vehicle)})
    for url in urls:
        image_name(url)
    if args.metadata_only:
        base = '/images/rentals/sunset/'
        planned = [{'sourceUrl':url,'path':base+'previews/'+image_name(url)+'.webp',
            'preview':base+'previews/'+image_name(url)+'.webp','thumbnail':base+'thumbs/'+image_name(url)+'.webp'} for url in urls]
        build(snapshot, planned, record_evidence=False)
        print(json.dumps({'cars': len(vehicles), 'photoPaths': len(planned), 'photosVerified': False}))
        return
    previous = json.loads((DOCS / 'assets.json').read_text(encoding='utf-8'))['assets'] if (DOCS / 'assets.json').exists() else []
    previous = {a['sourceUrl']: a for a in previous}
    assets, failures = [], []
    print(json.dumps({'cars': len(vehicles), 'photos': len(urls), 'workers': args.workers}), flush=True)
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(download, url, previous): url for url in urls}
        for future in as_completed(futures):
            try:
                assets.append(future.result())
            except Exception as error:
                failures.append({'url': futures[future], 'error': type(error).__name__ + ': ' + str(error)})
            if (len(assets) + len(failures)) % 100 == 0:
                print(json.dumps({'downloaded': len(assets), 'failed': len(failures), 'bytes': sum(a['bytes'] for a in assets)}), flush=True)
    if failures:
        write_json(DOCS / 'download-failures.json', failures)
        raise SystemExit(f'{len(failures)} photos failed; catalogue was not generated')
    build(snapshot, sorted(assets, key=lambda a: a['sourceUrl']))
    failure_log = DOCS / 'download-failures.json'
    if failure_log.exists():
        failure_log.unlink()
    print((DOCS / 'report.json').read_text(encoding='utf-8'), flush=True)


if __name__ == '__main__':
    main()
