import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SUPPORTED_LANGUAGES } from '../../lib/languages.js';
import { translations, getTranslation as getServerTranslation } from '../../lib/i18n.js';
import {
  CLIENT_TRANSLATIONS,
  loadTranslationLocale,
  getTranslation as getClientTranslation
} from '../../lib/i18nClient.js';

const read = (rel) => fs.readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf8');

test('Step 3 simplify: lib/i18nClient statically holds only English and lazily loads all 15 locales matching server i18n', async () => {
  assert.deepEqual(Object.keys(CLIENT_TRANSLATIONS), ['en']);
  for (const { code } of SUPPORTED_LANGUAGES) {
    await loadTranslationLocale(code);
    const clientT = getClientTranslation(code);
    const serverT = getServerTranslation(code);
    assert.equal(clientT.nav.experiences, serverT.nav.experiences, `${code} nav.experiences`);
    assert.equal(clientT.nav.privateJets, serverT.nav.privateJets, `${code} nav.privateJets`);
    assert.equal(clientT.ai.liveManager, serverT.ai.liveManager, `${code} ai.liveManager`);
    assert.equal(clientT.ai.liveManagerWhatsApp, serverT.ai.liveManagerWhatsApp, `${code} ai.liveManagerWhatsApp`);
    assert.equal(clientT.auth.signInTab, serverT.auth.signInTab, `${code} auth.signInTab`);
    assert.equal(clientT.footer.desc, serverT.footer.desc, `${code} footer.desc`);
  }
});

test('Step 3 simplify: dead legacy i18n sections removed and zero concierge strings remain in any locale values', () => {
  const deadSections = ['categoryDescriptions', 'partnerForm', 'sportsbookPage', 'kosher', 'constellations'];
  const forbidden = /\bconcierge\b|консьерж|консьєрж|conserje|konsjerż|konsiyerj|קונסיירז|كونسيرج|کانسیرج|礼宾|コンシェルジュ|컨시어지/iu;

  const collectStrings = (obj, out = []) => {
    for (const val of Object.values(obj || {})) {
      if (typeof val === 'string') out.push(val);
      else if (val && typeof val === 'object') collectStrings(val, out);
    }
    return out;
  };

  for (const { code } of SUPPORTED_LANGUAGES) {
    const dict = translations[code];
    assert.ok(dict, `missing translations.${code}`);
    for (const dead of deadSections) {
      assert.equal(Object.hasOwn(dict, dead), false, `${code} still has dead section ${dead}`);
    }
    for (const value of collectStrings(dict)) {
      assert.doesNotMatch(value, forbidden, `${code} contains forbidden concierge wording: ${value}`);
    }
  }
});

test('Step 3 simplify: root layout and homepage sever heavy server-catalog and AI-engine static imports', () => {
  const aiDock = read('app/components/ai/AiDock.jsx');
  assert.doesNotMatch(aiDock, /tripProfile\.mjs/);
  assert.doesNotMatch(aiDock, /stage2Copy\.mjs/);
  assert.match(aiDock, /AiDockHandoffButtons/);
  assert.match(aiDock, /lib\/i18nClient/);

  const chatProvider = read('app/components/ai/ChatProvider.jsx');
  assert.doesNotMatch(chatProvider, /^import\s+.*from\s+['"].*(?:conversation\.mjs|tripProfile\.mjs|factGuard\.mjs)/m);
  assert.match(chatProvider, /import\(['"]\.\.\/\.\.\/\.\.\/lib\/ai\/conversation\.mjs['"]\)/);
  assert.match(chatProvider, /import\(['"]\.\.\/\.\.\/\.\.\/lib\/ai\/tripProfile\.mjs['"]\)/);

  const stage2Copy = read('lib/ai/stage2Copy.mjs');
  assert.doesNotMatch(stage2Copy, /factPack\.mjs/);
  assert.match(stage2Copy, /pagePath\.mjs/);

  const conv = read('app/components/ai/AiConversation.jsx');
  assert.match(conv, /stage2Core\.mjs/);
  assert.doesNotMatch(conv, /^import\s+.*stage2Copy\.mjs/m);

  const actionCard = read('app/components/ai/AiActionCard.jsx');
  assert.match(actionCard, /stage2Core\.mjs/);
  assert.doesNotMatch(actionCard, /stage2Copy\.mjs/);

  const homePage = read('app/HomePage.jsx');
  assert.doesNotMatch(homePage, /lib\/homeData/);
  assert.doesNotMatch(homePage, /headoutCatalog\.mjs|headoutCopy\.mjs|privateJetsCopy\.mjs/);
  assert.match(homePage, /lib\/homeSections\.mjs/);
  assert.match(homePage, /lib\/i18nClient/);

  const header = read('app/components/Header.jsx');
  const footer = read('app/components/Footer.jsx');
  assert.match(header, /lib\/i18nClient/);
  assert.match(footer, /lib\/i18nClient/);

  const localeProvider = read('app/components/LocaleProvider.jsx');
  assert.match(localeProvider, /loadTranslationLocale/);

  const pjCopy = read('lib/privateJetsCopy.mjs');
  assert.ok(pjCopy.length < 8000, `lib/privateJetsCopy.mjs should stay lean, got ${pjCopy.length} bytes`);
  assert.match(pjCopy, /privateJetsPageCopy\.mjs/);
});
