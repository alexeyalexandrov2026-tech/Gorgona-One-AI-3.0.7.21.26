import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PEREJETS, PRIVATE_JETS, PRIVATE_JET_ROUTES } from '../../lib/privateJets.mjs';
import { getPrivateJetsPageCopy } from '../../lib/privateJetsCopy.mjs';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const LOCALES = ['en', 'ru', 'es', 'he', 'zh', 'pt', 'uk', 'ja', 'ko', 'de', 'ar', 'tr', 'fa', 'it', 'fr', 'pl'];

test('PereJets & PrivateJetFinder partner metadata and 5 verified routes are configured', () => {
  assert.equal(PEREJETS.href, 'https://perejets.com/r/WEBS5K');
  assert.equal(PRIVATE_JETS.href, 'https://www.privatejetfinder.com/?tk=716179668192');
  assert.equal(PRIVATE_JETS.trackerCode, '716179668192');
  assert.equal(PRIVATE_JET_ROUTES.length, 5);
  for (const route of PRIVATE_JET_ROUTES) {
    assert.ok(route.href.startsWith('https://perejets.com/'), `route ${route.id} must link to PereJets`);
    assert.ok(route.href.includes('ref=WEBS5K'), `route ${route.id} must carry ref=WEBS5K`);
    assert.ok(route.priceUsd.startsWith('US$'), `route ${route.id} must show USD guide price`);
  }
});

test('getPrivateJetsPageCopy covers all 16 locales without forbidden concierge wording', () => {
  const enKeys = Object.keys(getPrivateJetsPageCopy('en')).sort();
  for (const locale of LOCALES) {
    const copy = getPrivateJetsPageCopy(locale);
    assert.deepEqual(Object.keys(copy).sort(), enKeys, `key mismatch for ${locale}`);
    const flat = JSON.stringify(copy).toLowerCase();
    assert.equal(flat.includes('concierge'), false, `forbidden word concierge in ${locale}`);
    assert.equal(flat.includes('консьерж'), false, `forbidden word консьерж in ${locale}`);
  }
});

test('PrivateJetsContent keeps PrivateJetFinder iframe lazy-mounted behind user click and wires /api/book', () => {
  const src = fs.readFileSync(path.join(ROOT, 'app', 'private-jets', 'PrivateJetsContent.jsx'), 'utf8');
  assert.ok(src.includes("fetch('/api/book'"), 'form must submit to real /api/book endpoint');
  assert.ok(src.includes('showCalculator &&'), 'white PrivateJetFinder iframe must mount only on explicit click');
  assert.ok(src.includes('PEREJETS.href'), 'must include PereJets direct partner link');
  assert.ok(src.includes('PRIVATE_JETS.href'), 'must include PrivateJetFinder direct partner link');
});

test('Android App Links assetlinks.json is valid JSON with com.miamielio.app and both SHA-256 signing fingerprints', () => {
  const raw = fs.readFileSync(path.join(ROOT, 'public', '.well-known', 'assetlinks.json'), 'utf8');
  const parsed = JSON.parse(raw);
  assert.ok(Array.isArray(parsed) && parsed.length === 1);
  const entry = parsed[0];
  assert.deepEqual(entry.relation, ['delegate_permission/common.handle_all_urls']);
  assert.equal(entry.target.namespace, 'android_app');
  assert.equal(entry.target.package_name, 'com.miamielio.app');
  assert.ok(Array.isArray(entry.target.sha256_cert_fingerprints));
  assert.equal(entry.target.sha256_cert_fingerprints.length, 2);
  for (const fp of entry.target.sha256_cert_fingerprints) {
    assert.match(fp, /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/, `invalid SHA-256 fingerprint format: ${fp}`);
  }
});
