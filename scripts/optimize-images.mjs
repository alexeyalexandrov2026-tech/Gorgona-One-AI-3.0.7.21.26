// Re-encodes oversized photos in public/images so listing pages stay light.
//
//   node scripts/optimize-images.mjs            rewrite oversized files in place
//   node scripts/optimize-images.mjs --dry-run  only report what would change
//
// Run it after adding new photos (e.g. a new car's gallery). JPEGs over
// 300 KB are scaled to fit 2222 px - the width most source photos already
// have - and re-encoded with mozjpeg at quality 85, which is visually
// indistinguishable from the originals at 100% zoom. A file is replaced only
// when the result is at least 10% smaller, so re-running is a no-op.
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'images');
const MIN_BYTES = 300 * 1024;
const MAX_EDGE = 2222;
const dryRun = process.argv.includes('--dry-run');

const mb = (bytes) => `${(bytes / 1048576).toFixed(1)} MB`;
const kb = (bytes) => `${Math.round(bytes / 1024)} KB`;

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

let before = 0;
let after = 0;
let changed = 0;

for await (const file of walk(ROOT)) {
  if (!/\.jpe?g$/i.test(file)) continue;
  const { size } = await stat(file);
  if (size < MIN_BYTES) continue;

  // Read into memory first so the file can be overwritten in place.
  const output = await sharp(await readFile(file))
    .rotate() // apply EXIF orientation before the metadata is stripped
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85, mozjpeg: true, progressive: true })
    .toBuffer();
  if (output.length > size * 0.9) continue;

  before += size;
  after += output.length;
  changed += 1;
  console.log(`${path.relative(ROOT, file)}: ${kb(size)} -> ${kb(output.length)}`);
  if (!dryRun) await writeFile(file, output);
}

console.log(`${dryRun ? 'Would rewrite' : 'Rewrote'} ${changed} file(s): ${mb(before)} -> ${mb(after)}`);
