#!/usr/bin/env node
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SEASON, SEASON_CHECKED_AT } from '../../lib/seasonData.js';

const output = fileURLToPath(new URL('../app/src/main/assets/season.json', import.meta.url));
const ids = new Set();
const events = SEASON.map(({ id, name, start, end, where, tip }) => {
  const isoDay = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(id) || ids.has(id) ||
      !isoDay(start) || !isoDay(end) || end < start || !name || !where || !tip?.en) {
    throw new Error('Invalid season entry: ' + id);
  }
  ids.add(id);
  return { id, name, start, end, place: where, tip: tip.en };
});
const content = JSON.stringify({ checked: SEASON_CHECKED_AT, events }, null, 2) + '\n';

if (process.argv.includes('--check')) {
  if (!fs.existsSync(output) || fs.readFileSync(output, 'utf8').replace(/\r\n/g, '\n') !== content) {
    console.error('Season data is out of date. Run node android/scripts/build-season.mjs.');
    process.exitCode = 1;
  } else {
    console.log('Android season matches the site (' + events.length + ' events).');
  }
} else {
  fs.writeFileSync(output, content);
}
