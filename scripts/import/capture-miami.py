"""Capture the public fleet for review, without price/contact/policy content.

Uses only the Python standard library. Does not publish or modify a database.
"""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urlparse
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[2]
HOST = 'https://miami-auto-rental.com'


def fetch(url):
    parsed = urlparse(url)
    if parsed.scheme != 'https' or parsed.netloc != 'miami-auto-rental.com':
        raise ValueError('Unexpected source host')
    with urlopen(Request(url, headers={'User-Agent': 'MiamiElio-InventoryReview/1.0'}), timeout=45) as response:
        data = response.read(5_000_001)
        if response.status != 200 or len(data) > 5_000_000:
            raise ValueError('Unexpected source response')
        return data.decode('utf-8')


class VehiclePage(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.gallery_depth = 0
        self.text_depth = 0
        self.title_depth = 0
        self.photos = []
        self.blocks = []
        self.block = []
        self.title = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'div':
            self.gallery_depth = self.gallery_depth + 1 if self.gallery_depth else int(attrs.get('id') == 'gallery-wrap')
            self.text_depth = self.text_depth + 1 if self.text_depth else int('car-text' in attrs.get('class', '').split())
        if tag == 'h1':
            self.title_depth += 1
        if self.gallery_depth and tag == 'a':
            src = attrs.get('href', '')
            if src.startswith('/images/cars/'):
                src = HOST + src
            if re.fullmatch(r'https://miami-auto-rental\.com/images/cars/[a-z0-9-]+\.jpg', src) and src not in self.photos:
                self.photos.append(src)

    def handle_endtag(self, tag):
        if self.text_depth and (tag in ['p', 'li'] or re.fullmatch('h[1-6]', tag)):
            value = ' '.join(''.join(self.block).split())
            if value:
                self.blocks.append(value)
            self.block = []
        if tag == 'div':
            self.gallery_depth = max(0, self.gallery_depth - 1)
            self.text_depth = max(0, self.text_depth - 1)
        if tag == 'h1':
            self.title_depth = max(0, self.title_depth - 1)

    def handle_data(self, data):
        if self.title_depth:
            self.title.append(data)
        if self.text_depth:
            self.block.append(data)


def capture(url):
    page = VehiclePage()
    page.feed(fetch(url))
    if not page.photos or not page.blocks:
        raise ValueError(f'Missing gallery or description: {url}')
    # Exclude commercial terms and other companies; retain vehicle copy for review.
    clean = [text for text in page.blocks if not re.search(
        r'[$€£]|\b(?:price|pricing|deposit|insurance|rentals?|brooklyn|sixt|book|agency|agencies|per day|per week|per month|mileage|25\+|license)\b', text, re.I)]
    return {'sourceUrl': url, 'sourceTitle': ' '.join(page.title), 'photoUrls': page.photos, 'descriptionBlocks': clean,
            'excluded': 'mercedes-benz-g550-white' in url}


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    urls = json.loads((ROOT / 'scripts/import/miami-source-urls.json').read_text())
    with ThreadPoolExecutor(max_workers=3) as pool:
        vehicles = list(pool.map(capture, urls))
    result = {'schemaVersion': 1, 'capturedAt': datetime.now(timezone.utc).isoformat(), 'source': HOST, 'vehicles': vehicles}
    target = ROOT / 'docs/fleet-import/source-inventory.json'
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
    for vehicle in vehicles:
        print(f"{len(vehicle['photoUrls']):2} photos | {vehicle['sourceTitle']} | excluded={vehicle['excluded']}")
