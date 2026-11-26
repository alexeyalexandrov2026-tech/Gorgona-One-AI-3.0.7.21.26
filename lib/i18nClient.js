// Lightweight browser UI dictionary loader.
// Statically bundles ONLY English (~8 KB) + 16-locale nav labels (~1 KB).
// Non-English dictionaries load on demand via LocaleProvider when selected.
import en from './i18n/en.mjs';
import { NAV_LABELS } from './i18n/navLabels.mjs';

export const CLIENT_TRANSLATIONS = { en };

const localeModules = {
  ru: () => import('./i18n/locales/ru.mjs'),
  es: () => import('./i18n/locales/es.mjs'),
  he: () => import('./i18n/locales/he.mjs'),
  zh: () => import('./i18n/locales/zh.mjs'),
  pt: () => import('./i18n/locales/pt.mjs'),
  uk: () => import('./i18n/locales/uk.mjs'),
  ja: () => import('./i18n/locales/ja.mjs'),
  ko: () => import('./i18n/locales/ko.mjs'),
  de: () => import('./i18n/locales/de.mjs'),
  ar: () => import('./i18n/locales/ar.mjs'),
  tr: () => import('./i18n/locales/tr.mjs'),
  fa: () => import('./i18n/locales/fa.mjs'),
  it: () => import('./i18n/locales/it.mjs'),
  fr: () => import('./i18n/locales/fr.mjs'),
  pl: () => import('./i18n/locales/pl.mjs')
};

const pending = new Map();
const mergedCache = new Map();

export function loadTranslationLocale(locale) {
  if (!locale || locale === 'en' || CLIENT_TRANSLATIONS[locale] || !localeModules[locale]) {
    return Promise.resolve();
  }
  if (!pending.has(locale)) {
    pending.set(
      locale,
      localeModules[locale]()
        .then((mod) => {
          CLIENT_TRANSLATIONS[locale] = mod.default;
          mergedCache.delete(locale);
        })
        .catch((err) => {
          pending.delete(locale);
          throw err;
        })
    );
  }
  return pending.get(locale);
}

function deepMerge(base, override) {
  const result = { ...base };
  for (const key of Object.keys(override || {})) {
    const value = override[key];
    result[key] = value && typeof value === 'object' && !Array.isArray(value)
      ? deepMerge(base[key] || {}, value)
      : value;
  }
  return result;
}

export function getTranslation(locale = 'en') {
  const code = locale && Object.prototype.hasOwnProperty.call(NAV_LABELS, locale) ? locale : 'en';
  const override = CLIENT_TRANSLATIONS[code];
  const cacheKey = override ? code : 'en:' + code;
  if (mergedCache.has(cacheKey)) return mergedCache.get(cacheKey);
  const base = !override || code === 'en' ? deepMerge(en, {}) : deepMerge(en, override);
  const navExtra = NAV_LABELS[code] || NAV_LABELS.en;
  const result = {
    ...base,
    nav: { ...base.nav, experiences: navExtra.experiences, privateJets: navExtra.privateJets },
    discovery: { ...base.discovery, experiences: navExtra.experiences }
  };
  mergedCache.set(cacheKey, result);
  return result;
}
