import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL('../../' + path, import.meta.url), 'utf8');

test('Travel shows only the active Ovago offers, without the retired Rentcars.com card', () => {
  const page = read('app/travel/ovago/page.js');
  assert.doesNotMatch(page, /rentcars|linksynergy/i);
  const links = [...page.matchAll(/href: '([^']+)'/g)].map(match => match[1]);
  assert.deepEqual(links, [
    'https://www.dpbolvw.net/click-101825540-15821121',
    'https://www.tkqlhce.com/click-101825540-15820959',
    'https://www.kqzyfj.com/click-101825540-15832128'
  ]);
  assert.equal(fs.existsSync(new URL('../../public/images/brands/rentcars-shopping.webp', import.meta.url)), false);
  assert.doesNotMatch(read('lib/ai/integrations/index.js'), /rentcars/i);
  assert.doesNotMatch(read('i18n/source.json'), /Worldwide car rental deals/);
});
