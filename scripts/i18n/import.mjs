import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, LOCALES, readJSON, readLocale, writeLocale, hash } from './catalogue.mjs';

// Import explicit saved results only. No inference, paid API or generation.
export function importTranslations(locale, entries) {
  if (!LOCALES.includes(locale) || locale === 'en') throw new Error('A supported target locale is required.');
  const source = readJSON('i18n/source.json');
  const messages = readLocale(locale), revisions = readJSON(`i18n/revisions/${locale}.json`);
  const slots = text => [...text.matchAll(/\{([A-Za-z][A-Za-z0-9_]*)\}/g)].map(m => m[1]).sort().join(',');
  for (const [id,text] of Object.entries(entries)) {
    if (!Object.hasOwn(source,id) || typeof text !== 'string' || !text.trim() || slots(source[id]) !== slots(text)) throw new Error(`Invalid translation: ${locale}/${id}`);
  }
  for (const [id,text] of Object.entries(entries)) { messages[id] = text; revisions[id] = hash(source[id]); }
  writeLocale(locale,messages);
  fs.writeFileSync(path.join(ROOT,`i18n/revisions/${locale}.json`),JSON.stringify(revisions,null,2)+'\n');
  return Object.keys(entries).length;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const locale = process.argv[2];
  const entries = JSON.parse(fs.readFileSync(0,'utf8'));
  console.log(`Imported ${importTranslations(locale,entries)} messages for ${locale}.`);
}
