// node --test tests/content/images.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import manifest from '../../lib/imageManifest.js';
import { VARIANT_WIDTHS, variantWidths, variantPath, responsiveImage } from '../../lib/responsiveImage.js';
import { getRentals } from '../../lib/rentalsData.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const onDisk = (src) => `${root}public${src}`;
const walk = (folder) => readdirSync(folder, { withFileTypes: true }).flatMap((entry) =>
  entry.isDirectory() ? walk(`${folder}/${entry.name}`) : [`${folder}/${entry.name}`]);

test('copies are never larger than the original and never nearly the same size twice', () => {
  assert.deepEqual(VARIANT_WIDTHS, [480, 960, 1600]);
  assert.deepEqual(variantWidths(3000), [480, 960, 1600]);
  assert.deepEqual(variantWidths(1600), [480, 960, 1600]);
  assert.deepEqual(variantWidths(1400), [480, 960, 1400]);
  assert.deepEqual(variantWidths(1024), [480, 1024]);
  assert.deepEqual(variantWidths(720), [480, 720]);
  assert.deepEqual(variantWidths(600), [480, 600]);
  for (let width = 600; width <= 4000; width += 37) {
    const widths = variantWidths(width);
    assert.ok(widths.every((w, i) => w <= width && (i === 0 || w > widths[i - 1])), `${width}: ${widths}`);
  }
});

test('addresses outside the manifest pass through unchanged', () => {
  for (const src of ['https://images.unsplash.com/photo-1?auto=format&w=900', '/api/listing-media/a/1/b.jpg', '/images/brands/nike.png', '', undefined, null]) {
    assert.deepEqual(responsiveImage(src, '100vw'), { src });
  }
  assert.deepEqual(responsiveImage('toString', '100vw'), { src: 'toString' });
});

test('a local photo keeps its address and gains lighter copies', () => {
  assert.equal(variantPath('/images/rentals/urus/cover.jpg', 480), '/images/v/rentals/urus/cover-480.webp');
  assert.equal(variantPath('/images/home/a.PNG', 960), '/images/v/home/a-960.webp');
  const image = responsiveImage('/images/rentals/lamborghini-urus-se/cover.jpg', '50vw');
  assert.equal(image.src, '/images/rentals/lamborghini-urus-se/cover.jpg');
  assert.equal(image.sizes, '50vw');
  assert.equal(image.srcSet, [480, 960, 1600].map((w) => `/images/v/rentals/lamborghini-urus-se/cover-${w}.webp ${w}w`).join(', '));
  assert.deepEqual(responsiveImage('/x.jpg', '1px', { '/x.jpg': 720 }).srcSet, '/x-480.webp 480w, /x-720.webp 720w');
});

test('every copy named in the manifest exists at the stated width, with nothing left over', async () => {
  const expected = new Set();
  for (const [src, width] of Object.entries(manifest)) {
    assert.ok(existsSync(onDisk(src)), `original missing: ${src}`);
    assert.ok(Number.isInteger(width) && width >= 600, `${src}: ${width}`);
    for (const target of variantWidths(width)) expected.add(variantPath(src, target));
  }
  const files = walk(`${root}public/images/v`).map((file) => file.slice(`${root}public`.length));
  assert.deepEqual(files.filter((file) => !expected.has(file)), [], 'copies without an original');
  assert.deepEqual([...expected].filter((file) => !files.includes(file)), [], 'missing copies');
  let originals = 0;
  let copies = 0;
  for (const [src, width] of Object.entries(manifest)) {
    originals += statSync(onDisk(src)).size;
    const widths = variantWidths(width);
    for (const target of widths) {
      const copy = onDisk(variantPath(src, target));
      const meta = await sharp(copy).metadata();
      assert.equal(meta.format, 'webp', copy);
      assert.equal(meta.width, target, copy);
    }
    const largest = statSync(onDisk(variantPath(src, widths[widths.length - 1]))).size;
    copies += largest;
  }
  // The point of the exercise: the largest copies together weigh well under half the originals.
  assert.ok(copies < originals * 0.5, `largest copies ${copies} vs originals ${originals}`);
});

test('every photo of the fleet has copies', () => {
  for (const car of getRentals()) {
    const photos = [car.image, car.thumbnail || car.image.replace(/cover\.jpg$/, 'cover-s.jpg'), ...(car.gallery || [])];
    for (const src of photos.filter((photo) => photo.startsWith('/'))) {
      assert.ok(Object.hasOwn(manifest, src), `${car.slug}: ${src} has no copies; run node scripts/images/build-variants.mjs`);
    }
  }
});

test('the manifest matches the photos on disk', () => {
  const result = spawnSync(process.execPath, ['scripts/images/build-variants.mjs', '--check'], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test('shared photo components ask for the lighter copies', () => {
  const read = (file) => readFileSync(`${root}${file}`, 'utf8');
  const ui = read('app/components/g1/ui.jsx');
  assert.match(ui, /\{\.\.\.responsiveImage\(img, CARD_SIZES\)\}/);
  assert.match(ui, /\{\.\.\.responsiveImage\(img, HERO_SIZES\)\}/);
  const gallery = read('app/components/g1/Gallery.jsx');
  assert.match(gallery, /\{\.\.\.responsiveImage\(images\[index\], MAIN_SIZES\)\}/);
  assert.match(gallery, /\{\.\.\.responsiveImage\(src, THUMB_SIZES\)\} alt="" loading="lazy"/);
  assert.match(read('app/components/home/HomeHero.jsx'), /responsiveImage\('\/images\/home\/hero-tower\.jpg'/);
});
