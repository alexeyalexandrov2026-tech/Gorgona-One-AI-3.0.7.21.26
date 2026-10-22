import fs from 'node:fs';
import path from 'node:path';
import { ROOT, LOCALES, readJSON, readLocale, hash, discoverMessages, messageId, appFiles, parseFile, walk } from './catalogue.mjs';
import { coreMessages } from './core-sources.mjs';
import { ownedMessages } from './owned-inventory.mjs';

export const placeholders = text => [...text.matchAll(/\{([A-Za-z][A-Za-z0-9_]*)\}/g)].map(match => match[1]).sort().join(',');
export function checkCatalogue() {
  const source = readJSON('i18n/source.json'), context = readJSON('i18n/context.json');
  const errors = [], coverage = [];
  for (const [id,text] of Object.entries(source)) {
    if (typeof text !== 'string' || !text.trim()) errors.push(`Empty source: ${id}`);
    if (context[id]?.sourceHash !== hash(text)) errors.push(`Stale context: ${id}`);
  }
  for (const [text] of discoverMessages()) if (source[messageId(text)] !== text) errors.push(`Unextracted UI message: ${text}`);
  for (const [id,text] of coreMessages()) if (source[id] !== text) errors.push(`New or changed core source: ${id}`);
  for (const [id,text] of ownedMessages()) if (source[id] !== text) errors.push(`New or changed owned material: ${id}`);
  for (const locale of LOCALES) {
    const messages = readLocale(locale);
    const basisPath = path.join(ROOT,`i18n/revisions/${locale}.json`);
    const revisions = fs.existsSync(basisPath) ? JSON.parse(fs.readFileSync(basisPath,'utf8')) : {};
    const missing = [];
    for (const [id,text] of Object.entries(source)) {
      const value = messages[id];
      if (typeof value !== 'string' || !value.trim()) { missing.push(id); continue; }
      if (placeholders(text) !== placeholders(value)) errors.push(`Named slots differ: ${locale}/${id}`);
      if (locale === 'en' && value !== text) errors.push(`English source differs: ${id}`);
      if (locale !== 'en' && revisions[id] !== hash(text)) errors.push(`Translation needs update for current source: ${locale}/${id}`);
    }
    const extra = Object.keys(messages).filter(id => !Object.hasOwn(source,id));
    if (extra.length) errors.push(`Obsolete keys in ${locale}: ${extra.join(', ')}`);
    coverage.push({locale,translated:Object.keys(source).length-missing.length,total:Object.keys(source).length,missing:missing.length});
    if (missing.length) errors.push(`Missing ${locale}: ${missing.length} (${missing.slice(0,5).join(', ')}${missing.length > 5 ? ', …' : ''})`);
  }
  // Message wrappers may change visible/accessibility text, never URL,
  // class, enum, form value, iframe attributes or event-handler semantics.
  const displayAttributes = new Set(['placeholder','aria-label','title','alt']);
  for (const file of appFiles()) {
    walk(parseFile(file),(node,parents) => {
      if ((node.type === 'CallExpression' && node.callee.name === 'msg') || (node.type === 'JSXOpeningElement' && node.name.name === 'LocalizedText')) {
        const attr = parents.find(parent => parent.type === 'JSXAttribute');
        const owner = attr && parents[parents.indexOf(attr)+1];
        const richSlots = attr?.name.name === 'values' && owner?.type === 'JSXOpeningElement' && owner.name.name === 'LocalizedText';
        if (attr && !displayAttributes.has(attr.name.name) && !richSlots) errors.push(`Display translation used in functional attribute: ${file}/${attr.name.name}`);
      }
      if (node.type === 'JSXOpeningElement' && node.name.name === 'LocalizedElement') {
        const tag = node.attributes.find(attr => attr.type === 'JSXAttribute' && attr.name.name === 'as')?.value?.value;
        if (tag === 'iframe') errors.push(`Supplier iframe wrapped: ${file}`);
      }
    });
  }
  return {coverage,errors};
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.join(ROOT,'scripts/i18n/check.mjs')) {
  const report = checkCatalogue();
  console.table(report.coverage);
  for (const error of report.errors.slice(0,35)) console.error(error);
  if (report.errors.length > 35) console.error(`…and ${report.errors.length-35} more errors.`);
  if (report.errors.length) process.exitCode = 1;
  else console.log('All 16 saved catalogs match the current sources and named slots.');
}
