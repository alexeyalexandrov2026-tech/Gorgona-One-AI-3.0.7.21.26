"""Download reviewed public galleries and generate 720px covers (Pillow).

Original gallery bytes are preserved; no runtime application dependency.
"""
from concurrent.futures import ThreadPoolExecutor
from hashlib import sha256
from io import BytesIO
from pathlib import Path
from urllib.request import Request, urlopen
from PIL import Image, ImageOps
import json
import re

ROOT = Path(__file__).resolve().parents[2]


COVERS = set()


def download(url):
    if not re.fullmatch(r'https://miami-auto-rental\.com/images/cars/[a-z0-9-]+\.jpg', url):
        raise ValueError('Unexpected photo URL')
    local = '/images/rentals/miami-source/' + url.rsplit('/', 1)[-1]
    target = ROOT / 'public' / local.lstrip('/')
    if target.exists():
        data = target.read_bytes()
    else:
        with urlopen(Request(url, headers={'User-Agent': 'MiamiElio-InventoryReview/1.0'}), timeout=45) as response:
            if response.status != 200 or not response.headers.get('Content-Type', '').startswith('image/'):
                raise ValueError(f'Invalid photo response: {url}')
            data = response.read(20_000_001)
        if len(data) > 20_000_000:
            raise ValueError('Photo too large')
        Image.open(BytesIO(data)).verify()
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
    with Image.open(BytesIO(data)) as image:
        width, height = image.size
        small = None
        if url in COVERS:
            thumbnail = ImageOps.exif_transpose(image).convert('RGB')
            thumbnail.thumbnail((720, 720), Image.Resampling.LANCZOS)
            small = local.replace('.jpg', '-s.jpg')
            thumbnail.save(ROOT / 'public' / small.lstrip('/'), quality=82, optimize=True)
        else:
            # Remove only this tool's unused derivative in its dedicated directory.
            unused = target.with_name(target.stem + '-s.jpg')
            if unused.parent.resolve() != (ROOT / 'public/images/rentals/miami-source').resolve():
                raise ValueError('Unexpected thumbnail path')
            if unused.exists():
                unused.unlink()
    return {'sourceUrl': url, 'path': local, 'thumbnail': small, 'sha256': sha256(data).hexdigest(),
            'bytes': len(data), 'width': width, 'height': height}


if __name__ == '__main__':
    inventory = json.loads((ROOT / 'docs/fleet-import/source-inventory.json').read_text(encoding='utf-8'))
    decisions = json.loads((ROOT / 'docs/fleet-import/decisions.json').read_text(encoding='utf-8'))
    COVERS.update(inventory['vehicles'][row['sourceIndex']]['photoUrls'][0] for row in decisions['vehicles'] if row['action'] == 'add')
    urls = sorted({url for v in inventory['vehicles'] if not v['excluded'] for url in v['photoUrls']})
    with ThreadPoolExecutor(max_workers=3) as pool:
        assets = list(pool.map(download, urls))
    (ROOT / 'docs/fleet-import/assets.json').write_text(json.dumps({'schemaVersion': 1, 'assets': assets}, indent=2) + '\n', encoding='utf-8', newline='\n')
    print(json.dumps({'photos': len(assets), 'bytes': sum(a['bytes'] for a in assets),
                      'duplicateHashes': len(assets) - len({a['sha256'] for a in assets})}))
