import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getRentals } from '../lib/rentalsData.js';

const sitemapFile = process.argv[2] ?? '.next/server/app/sitemap.xml.body';
const sitemap = readFileSync(sitemapFile, 'utf8');
const rentalIndex = 'https://gorgona-one.com/rentals';
const locations = Array.from(sitemap.matchAll(/<loc>([^<]+)<\/loc>/g), match => match[1]);
const publishedRentals = locations.filter(url => url.startsWith(rentalIndex + '/'));
const expectedRentals = getRentals().map(car => rentalIndex + '/' + car.slug);

assert.equal(locations.filter(url => url === rentalIndex).length, 1, 'Expected one /rentals entry');
assert.ok(expectedRentals.length >= 290, 'The source catalogue must retain at least 290 cars');
assert.deepEqual(publishedRentals.sort(), expectedRentals.sort(), 'Built sitemap differs from the rental catalogue');
console.log('Verified /rentals and ' + publishedRentals.length + ' car pages in the built sitemap.');
