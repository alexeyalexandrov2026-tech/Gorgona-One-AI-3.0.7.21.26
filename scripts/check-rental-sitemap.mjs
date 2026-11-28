import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getRentals } from '../lib/rentalsData.js';

const sitemapFile = process.argv[2] ?? '.next/server/app/sitemap.xml.body';
const sitemap = readFileSync(sitemapFile, 'utf8');
const rentalIndex = 'https://gorgona-one.com/rentals';
const locations = Array.from(sitemap.matchAll(/<loc>([^<]+)<\/loc>/g), match => match[1]);
const publishedRentals = locations.filter(url => url.startsWith(rentalIndex + '/') && !url.startsWith(rentalIndex + '/brand/'));
const publishedBrands = locations.filter(url => url.startsWith(rentalIndex + '/brand/'));
const expectedRentals = getRentals().map(car => rentalIndex + '/' + car.slug);

assert.equal(locations.filter(url => url === rentalIndex).length, 1, 'Expected one /rentals entry');
assert.ok(expectedRentals.length >= 290, 'The source catalogue must retain at least 290 cars');
assert.deepEqual(publishedRentals.sort(), expectedRentals.sort(), 'Built sitemap differs from the rental catalogue');
assert.ok(publishedBrands.length >= 8, 'Expected exotic car brand pages in built sitemap');
console.log('Verified /rentals, ' + publishedRentals.length + ' car pages, and ' + publishedBrands.length + ' brand pages in the built sitemap.');
