import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { root, config, readResources, validateResources } from '../../scripts/i18n/pilot-resources.mjs';

const require = createRequire(import.meta.url);
const { pilotCompiler, isPilotSource } = require('../../i18n/pilot/compiler.cjs');
const snapshots = await readResources();
const source = snapshots.en;

test('pilot translations cover the exact existing locale list and order', async () => {
  const languagesSource = await readFile(path.join(root, 'lib/languages.js'), 'utf8');
  const { SUPPORTED_LANGUAGES } = await import('data:text/javascript;base64,' + Buffer.from(languagesSource).toString('base64'));
  assert.deepEqual([config.defaultLocale, ...config.locales], SUPPORTED_LANGUAGES.map(({ code }) => code));
  assert.ok(Object.keys(source).length > 0);
  assert.deepEqual(validateResources(source, snapshots), { strings: Object.keys(source).length, locales: 16 });
});

test('a new untranslated string blocks qualification instead of using English fallback', () => {
  assert.throws(() => validateResources({ ...source, newHash: 'New section' }, snapshots), /Missing or stale/);
  const incomplete = structuredClone(snapshots);
  delete incomplete.fa[Object.keys(source)[0]];
  assert.throws(() => validateResources(source, incomplete), /Missing or stale/);
});

test('blank, stale and invalid interpolation results are rejected', () => {
  const invalid = structuredClone(snapshots);
  invalid.ru[Object.keys(source)[0]] = ' ';
  assert.throws(() => validateResources(source, invalid), /Empty translation/);
  const small = Object.fromEntries(Object.keys(snapshots).map((locale) => [locale, { hash: 'Hello {name}' }]));
  small.he.hash = 'Hello {price}';
  assert.throws(() => validateResources({ hash: 'Hello {name}' }, small), /interpolation/);
  const stale = structuredClone(snapshots);
  stale.uk.obsoleteHash = 'Old text';
  assert.throws(() => validateResources(source, stale), /Missing or stale/);
});

test('compiler scope excludes existing pages, supplier embeds and path lookalikes', () => {
  for (const file of ['app/layout.js', 'app/page.js', 'app/yachts/YatrCatalog.jsx',
    'app/vacation-rentals/Stay22Browse.jsx', 'app/i18n-pilot/fixtures-copy/Fake.jsx']) {
    assert.equal(isPilotSource(path.join(root, file)), false, file);
  }
  assert.equal(isPilotSource(path.join(root, 'app/i18n-pilot/fixtures/New.jsx')), true);
});

test('new JSX is automatically wrapped and hashed after the Next SWC transform', async () => {
  const plugin = pilotCompiler.raw({}, { framework: 'webpack' });
  const filename = path.join(root, 'app/i18n-pilot/fixtures/New.jsx');
  assert.equal(plugin.transformInclude(filename), true);
  const code = 'export default function NewSection(){return <h2>A new Miami experience</h2>}';
  const { transform } = require('next/dist/build/swc');
  const compiled = await transform(code, {
    filename,
    jsc: { parser: { syntax: 'ecmascript', jsx: true },
      transform: { react: { runtime: 'automatic' } } }
  });
  const transformed = plugin.transform(compiled.code, filename);
  assert.ok(transformed?.code.includes('gt-next'));
  assert.match(transformed.code, /_gt|hash/);
  assert.match(transformed.code, /A new Miami experience/);
});

test('production config keeps redirects and has no GT runtime when pilot is disabled', () => {
  const previous = process.env.MIAMI_I18N_PILOT;
  delete process.env.MIAMI_I18N_PILOT;
  delete require.cache[require.resolve('../../next.config.js')];
  const nextConfig = require('../../next.config.js');
  assert.equal(nextConfig.webpack, undefined);
  assert.equal(nextConfig.i18n, undefined);
  assert.equal(nextConfig.env.MIAMI_I18N_PILOT, '0');
  if (previous !== undefined) process.env.MIAMI_I18N_PILOT = previous;
});
