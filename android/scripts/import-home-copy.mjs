#!/usr/bin/env node
// Copies the website's home-hero wording into android/strings.json, in every
// site language, so the app's Today screen says exactly what the site says.
// Source: the site's saved translation catalog on origin/main
// (i18n/locales/<language>.js, flat "home.chips.0" style keys).
// Run `node android/scripts/build-strings.mjs` afterwards.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ref = process.env.SITE_REF || 'origin/main';

// Site catalog key -> app string name. The order is the order in strings.json.
const MAP = [
  ['home.chips.0', 'home_chip_1'], ['home.chips.1', 'home_chip_2'], ['home.chips.2', 'home_chip_3'],
  ['home.chips.3', 'home_chip_4'], ['home.chips.4', 'home_chip_5'],
  ['home.prompts.0', 'home_prompt_1'], ['home.prompts.1', 'home_prompt_2'], ['home.prompts.2', 'home_prompt_3'],
  ['home.prompts.3', 'home_prompt_4'], ['home.prompts.4', 'home_prompt_5'],
  ['home.worldItems.yachts.0', 'home_pick_yachts'], ['home.picks.villas', 'home_pick_villas'],
  ['home.worldItems.cars.0', 'home_pick_cars'], ['home.picks.jets', 'home_pick_jets'],
  ['home.picks.dining', 'home_pick_dining'], ['home.worldItems.events.0', 'home_pick_events'],
  ['home.picks.adventures', 'home_pick_adventures'],
  ['home.picksAsk.jets', 'home_ask_jets'], ['home.picksAsk.adventures', 'home_ask_adventures'],
  ['ui.0f7664c62a90fb50', 'home_concierge_label'],
  ['home.searchGo', 'home_ask'], ['home.beach', 'home_beach'],
];
const AFTER = 'concierge_live_manager';

const { SUPPORTED_LANGUAGES } = await import(pathToFileURL(path.join(repo, 'lib', 'languages.js')).href);
const languages = SUPPORTED_LANGUAGES.map((language) => language.code);

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'miami-elio-copy-'));
async function catalog(code) {
  const source = execFileSync('git', ['show', `${ref}:i18n/locales/${code}.js`], { cwd: repo, encoding: 'utf8', maxBuffer: 64 << 20 });
  const file = path.join(temp, `${code}.mjs`);
  fs.writeFileSync(file, source);
  return (await import(pathToFileURL(file).href)).default;
}

const catalogs = {};
for (const code of languages) catalogs[code] = await catalog(code);
fs.rmSync(temp, { recursive: true, force: true });

const missing = [];
const imported = {};
for (const [siteKey, appKey] of MAP) {
  const english = catalogs.en[siteKey];
  if (typeof english !== 'string' || !english.trim()) throw new Error(`English text missing for ${siteKey}`);
  const entry = {};
  for (const code of languages) {
    const text = catalogs[code]?.[siteKey];
    if (typeof text === 'string' && text.trim()) entry[code] = text.trim();
    else { entry[code] = english.trim(); missing.push(`missing ${code} ${siteKey}`); }
  }
  imported[appKey] = entry;
}

const manifestPath = path.join(repo, 'android', 'strings.json');
const raw = fs.readFileSync(manifestPath, 'utf8');
const manifest = JSON.parse(raw);
if (!(AFTER in manifest.strings)) throw new Error(`${AFTER} not found in strings.json`);
const strings = {};
for (const [key, value] of Object.entries(manifest.strings)) {
  if (key in imported) continue;
  strings[key] = value;
  if (key === AFTER) Object.assign(strings, imported);
}
manifest.strings = strings;
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + (raw.endsWith('\n') ? '\n' : ''));

for (const line of missing) console.log(line);
console.log(`${Object.keys(imported).length} keys imported from ${ref} in ${languages.length} languages.`);
