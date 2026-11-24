import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {MANAGER_TELEGRAM, managerTelegramUrl, configuredManagerTelegram} from '../../lib/managerContact.mjs';
import {translations} from '../../lib/i18n.js';

test('only plain public Telegram usernames become a t.me link', () => {
  for (const [value, url] of [
    ['@miamielio_concierge', 'https://t.me/miamielio_concierge'],
    ['miamielio_concierge', 'https://t.me/miamielio_concierge'],
    ['https://t.me/miamielio_concierge', 'https://t.me/miamielio_concierge'],
    ['t.me/MiamiElio', 'https://t.me/MiamiElio'],
    ['https://telegram.me/miamielio/', 'https://t.me/miamielio'],
  ]) assert.equal(managerTelegramUrl(value), url, value);
  for (const value of ['', '   ', null, undefined, '@abc', 'http://t.me/miamielio', 'https://evil.example/miamielio', 'https://t.me/miamielio?start=x', 'https://t.me/+invitehash', 'javascript:alert(1)', '@miami elio', '@1miamielio', 'https://t.me/miamielio/123']) {
    assert.equal(managerTelegramUrl(value), null, String(value));
  }
});

test('the configured manager opens t.me, and the button hides without a username', () => {
  assert.equal(managerTelegramUrl(MANAGER_TELEGRAM), 'https://t.me/Avo_ale');
  assert.equal(managerTelegramUrl(''), null);
  const saved = process.env.NEXT_PUBLIC_MANAGER_TELEGRAM;
  try {
    delete process.env.NEXT_PUBLIC_MANAGER_TELEGRAM;
    assert.equal(configuredManagerTelegram(), 'https://t.me/Avo_ale');
    process.env.NEXT_PUBLIC_MANAGER_TELEGRAM = '@miamielio_concierge';
    assert.equal(configuredManagerTelegram(), 'https://t.me/miamielio_concierge');
  } finally {
    if (saved === undefined) delete process.env.NEXT_PUBLIC_MANAGER_TELEGRAM; else process.env.NEXT_PUBLIC_MANAGER_TELEGRAM = saved;
  }
  const source = fs.readFileSync(new URL('../../app/components/ai/ManagerTelegramButton.jsx', import.meta.url), 'utf8');
  assert.match(source, /if \(!href\) return null;/);
  assert.match(source, /rel="noopener noreferrer"/);
  assert.match(source, /isOpen \|\| roomOpen/, 'it steps aside while the chat or the Discovery Room is open');
  assert.match(fs.readFileSync(new URL('../../app/layout.js', import.meta.url), 'utf8'), /<AiSphere \/>\s*<ManagerTelegramButton \/>/);
});

test('every site language labels the button', () => {
  const locales = Object.keys(translations);
  assert.equal(locales.length, 16);
  for (const locale of locales) {
    const label = translations[locale].ai.liveManager;
    assert.ok(typeof label === 'string' && label.length > 5, locale);
    assert.match(label, /Telegram|טלגרם|تيليجرام|تلگرام|텔레그램/, locale);
  }
});

test('the chip reuses the dark-gold surface and sits cleanly above AiSphere', () => {
  const css = fs.readFileSync(new URL('../../app/ai-overlays.css', import.meta.url), 'utf8');
  const rule = css.slice(css.indexOf('.aitg {'), css.indexOf('}', css.indexOf('.aitg {')));
  assert.match(rule, /bottom: 96px/);
  assert.match(css, /\.aitg\[data-ai-theme="dark"\] \{\s*background: rgba\(26, 22, 15, 0\.7\); border: 1px solid rgba\(216, 180, 120, 0\.4\)/);
  assert.match(css, /\.aitg\.is-hidden \{ opacity: 0; pointer-events: none; visibility: hidden; \}/);
});
