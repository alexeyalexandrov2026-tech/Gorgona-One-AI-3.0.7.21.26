#!/usr/bin/env node
// Copies Miami's season - the weeks that sell out first, as the home page
// lists them in lib/seasonData.js - into the app, so the concierge screen
// and its reminders show the same weeks and dates as the website.
//
//   node ios/scripts/build-season.mjs           write the file
//   node ios/scripts/build-season.mjs --check   fail if it is out of date
//
// Output: ios/MiamiElio/Resources/season.json. Event records stay in
// English, as the site keeps them in every language.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..', '..');
export const SEASON_FILE = path.join(repo, 'ios', 'MiamiElio', 'Resources', 'season.json');

export async function seasonJSON() {
  const { SEASON, SEASON_CHECKED_AT } = await import(pathToFileURL(path.join(repo, 'lib', 'seasonData.js')).href);
  const events = SEASON.map((event) => ({
    id: event.id,
    name: event.name,
    start: event.start,
    end: event.end,
    place: event.where,
    tip: event.tip.en
  }));
  return `${JSON.stringify({ checked: SEASON_CHECKED_AT, events }, null, 2)}\n`;
}

const runAsScript = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (runAsScript) {
  const content = await seasonJSON();
  const relative = path.relative(repo, SEASON_FILE);
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(SEASON_FILE) || fs.readFileSync(SEASON_FILE, 'utf8') !== content) {
      console.error(`Out of date - run \`node ios/scripts/build-season.mjs\`: ${relative}`);
      process.exit(1);
    }
    console.log(`The app's season matches the website (${JSON.parse(content).events.length} weeks).`);
  } else {
    fs.writeFileSync(SEASON_FILE, content);
    console.log(`Wrote ${relative}.`);
  }
}
