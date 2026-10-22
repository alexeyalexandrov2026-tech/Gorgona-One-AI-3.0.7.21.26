import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const root = fileURLToPath(new URL('../../', import.meta.url));
export const config = JSON.parse(await readFile(path.join(root, 'gt.config.json'), 'utf8'));

function variables(value) {
  return [...value.matchAll(/\{([A-Za-z_][\w]*)\}/g)].map((match) => match[1]).sort();
}

export function validateResources(source, snapshots) {
  const sourceKeys = Object.keys(source).sort();
  if (!sourceKeys.length) throw new Error('Empty source catalogue');
  const expectedLocales = [config.defaultLocale, ...config.locales];
  if (JSON.stringify(Object.keys(snapshots).sort()) !== JSON.stringify([...expectedLocales].sort())) {
    throw new Error('The translation snapshot must contain exactly all 16 locales');
  }
  for (const locale of expectedLocales) {
    const catalogue = snapshots[locale];
    if (!catalogue || typeof catalogue !== 'object' || Array.isArray(catalogue)) {
      throw new Error(`Invalid catalogue: ${locale}`);
    }
    if (JSON.stringify(Object.keys(catalogue).sort()) !== JSON.stringify(sourceKeys)) {
      throw new Error(`Missing or stale translation hashes: ${locale}`);
    }
    for (const hash of sourceKeys) {
      const value = catalogue[hash];
      if (typeof value !== 'string' || !value.trim()) throw new Error(`Empty translation: ${locale}/${hash}`);
      if (JSON.stringify(variables(source[hash])) !== JSON.stringify(variables(value))) {
        throw new Error(`Changed interpolation variables: ${locale}/${hash}`);
      }
    }
  }
  return { locales: expectedLocales.length, strings: sourceKeys.length };
}

export async function readResources() {
  const entries = await Promise.all([config.defaultLocale, ...config.locales].map(async (locale) => [
    locale, JSON.parse(await readFile(path.join(root, 'i18n/pilot/locales', `${locale}.json`), 'utf8'))
  ]));
  const snapshots = Object.fromEntries(entries);
  validateResources(snapshots[config.defaultLocale], snapshots);
  return snapshots;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const snapshots = await readResources();
  const result = validateResources(snapshots[config.defaultLocale], snapshots);
  const output = path.join(root, 'i18n/pilot/snapshots.json');
  const serialized = JSON.stringify(snapshots, null, 2) + '\n';
  if (process.argv.includes('--write')) {
    await writeFile(output, serialized);
  } else if (await readFile(output, 'utf8') !== serialized) {
    throw new Error('Translation snapshot is stale; run npm run i18n:pilot:snapshot');
  }
  console.log(`Validated ${result.strings} hashes in ${result.locales} locales`);
}
