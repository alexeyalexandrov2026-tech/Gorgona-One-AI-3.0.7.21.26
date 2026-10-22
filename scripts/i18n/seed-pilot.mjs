// One-time migration of existing translations for the qualification fixture.
// This never creates or claims AI translations and rejects unknown source text.
import { access, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { root, config } from './pilot-resources.mjs';

const legacyPath = path.join(root, 'lib/i18n.js');
const legacy = await import('data:text/javascript;base64,' + Buffer.from(await readFile(legacyPath, 'utf8')).toString('base64'));
const source = JSON.parse(await readFile(path.join(root, 'i18n/pilot/locales/en.json'), 'utf8'));
for (const locale of config.locales) {
  const exists = await access(path.join(root, 'i18n/pilot/locales', `${locale}.json`)).then(() => true, () => false);
  if (exists) throw new Error('Pilot already seeded; existing translations are never overwritten by this importer.');
}
function leaves(object, prefix = []) {
  return Object.entries(object).flatMap(([key, value]) => typeof value === 'string'
    ? [[prefix.concat(key), value]] : leaves(value, prefix.concat(key)));
}
const sourcePaths = leaves(legacy.translations.en);
for (const locale of config.locales) {
  const output = {};
  for (const [hash, text] of Object.entries(source)) {
    const candidate = sourcePaths.find(([, value]) => value === text);
    if (!candidate) throw new Error(`New source requires GT translation: ${text}`);
    const translated = candidate[0].reduce((object, key) => object?.[key], legacy.translations[locale]);
    if (typeof translated !== 'string' || !translated.trim()) throw new Error(`Missing legacy translation: ${locale}/${text}`);
    output[hash] = translated;
  }
  await writeFile(path.join(root, 'i18n/pilot/locales', `${locale}.json`), JSON.stringify(output, null, 2) + '\n');
}
console.log('Imported existing translations for the pilot; no AI service used.');
