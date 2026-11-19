// node --test tests/content/build.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { LOADER, patchLoader, loaderCrashes, fontExtension } from '../../scripts/build/patch-next-font.mjs';

const root = new URL('../../', import.meta.url);
const CRASHING = "            const ext = /\\.(woff|woff2|eot|ttf|otf)$/.exec(googleFontFileUrl)[1];\n";

test('the font loader patch replaces only the crashing line and is safe to repeat', () => {
  const source = `before\n${CRASHING}after\n`;
  const first = patchLoader(source);
  assert.equal(first.status, 'patched');
  assert.ok(!loaderCrashes(first.source));
  assert.ok(first.source.startsWith('before\n') && first.source.endsWith('after\n'));
  assert.deepEqual(patchLoader(first.source), { status: 'already', source: first.source });
  assert.deepEqual(patchLoader('const ext = fontFile.ext;'), { status: 'upstream', source: 'const ext = fontFile.ext;' });
});

test('the patched line reads the extension or falls back to woff2', () => {
  assert.equal(fontExtension('https://fonts.gstatic.com/s/jost/v20/92zatBhPNqw73oTd4g.woff2'), 'woff2');
  assert.equal(fontExtension('https://fonts.gstatic.com/s/inter/v20/file.ttf'), 'ttf');
  assert.equal(fontExtension('https://fonts.gstatic.com/l/font?kit=92z8tBhPNqw79Ij1E865zBUv7mz9&skey=4145fd5d1d5ac665&v=v20'), 'woff2');
  assert.equal(fontExtension('https://fonts.gstatic.com/s/inter/v20/file.woff?v=2'), 'woff');
  assert.ok(patchLoader(CRASHING).source.includes(`const ext = (${fontExtension})(googleFontFileUrl);`));
});

test('installing dependencies applies the patch, so a build cannot fail on a Google Fonts address', () => {
  const scripts = JSON.parse(readFileSync(new URL('package.json', root), 'utf8')).scripts;
  assert.equal(scripts.postinstall, 'node scripts/build/patch-next-font.mjs');
  const loader = new URL(LOADER, root);
  assert.ok(existsSync(loader), 'Next.js is not installed');
  assert.ok(!loaderCrashes(readFileSync(loader, 'utf8')), 'run `node scripts/build/patch-next-font.mjs`');
});
