// Local, versioned display text. Rendering this catalog makes no network or
// translation-provider request. Source/context and coverage are checked in CI.
import en from '../i18n/locales/en.js';
export const SAVED_MESSAGES = { en };

export function registerSavedMessages(messages) { Object.assign(SAVED_MESSAGES, messages); }

const localeModules = {
  ru: () => import('../i18n/locales/ru.js'),
  es: () => import('../i18n/locales/es.js'),
  he: () => import('../i18n/locales/he.js'),
  zh: () => import('../i18n/locales/zh.js'),
  pt: () => import('../i18n/locales/pt.js'),
  uk: () => import('../i18n/locales/uk.js'),
  ja: () => import('../i18n/locales/ja.js'),
  ko: () => import('../i18n/locales/ko.js'),
  de: () => import('../i18n/locales/de.js'),
  ar: () => import('../i18n/locales/ar.js'),
  tr: () => import('../i18n/locales/tr.js'),
  fa: () => import('../i18n/locales/fa.js'),
  it: () => import('../i18n/locales/it.js'),
  fr: () => import('../i18n/locales/fr.js'),
  pl: () => import('../i18n/locales/pl.js')
};
const pending = new Map();
export function loadSavedLocale(locale) {
  if (SAVED_MESSAGES[locale] || !localeModules[locale]) return Promise.resolve();
  if (!pending.has(locale)) pending.set(locale, localeModules[locale]().then(module => {
    SAVED_MESSAGES[locale] = module.default;
  }).catch(error => { pending.delete(locale); throw error; }));
  return pending.get(locale);
}

const sourceKeys = new Map(Object.entries(en).map(([key, text]) => [text.trim(), key]));

export function savedMessage(locale, key, values = {}) {
  const template = SAVED_MESSAGES[locale]?.[key] ?? en[key];
  if (typeof template !== 'string') throw new Error(`Unknown display message: ${key}`);
  return template.replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/g, (token, name) =>
    Object.hasOwn(values, name) ? String(values[name]) : token);
}

// Use only for explicitly marked, site-owned UI literals. Do not apply this
// function to user submissions or supplier event records/documents.
export function savedSource(locale, source, values = {}) {
  if (typeof source !== 'string') return source;
  const key = sourceKeys.get(source.trim());
  if (!key) return source;
  const leading = source.match(/^\s*/)[0];
  const trailing = source.match(/\s*$/)[0];
  return leading + savedMessage(locale, key, values).trim() + trailing;
}

export function savedTree(namespace, base, locale, path = '') {
  if (typeof base === 'string') return savedMessage(locale, `${namespace}.${path}`);
  if (Array.isArray(base)) return base.map((value, index) => savedTree(namespace, value, locale, path ? `${path}.${index}` : String(index)));
  return Object.fromEntries(Object.entries(base).map(([key, value]) => [
    key, savedTree(namespace, value, locale, path ? `${path}.${key}` : key)
  ]));
}

export function savedListing(locale, item, field = 'description') {
  const key = `listing.${item.id || item.slug}.${field}`;
  // Only locally inventoried records are eligible. Supplier/user content is
  // never translated merely because it happens to have a description field.
  return Object.hasOwn(en, key) && en[key] === item[field] ? savedMessage(locale, key) : item[field];
}

export function savedPrice(locale, source) {
  const match = typeof source === 'string' && source.match(/^From \$([\d,]+)$/);
  if (!match) return savedSource(locale, source);
  const amount = new Intl.NumberFormat(locale, { style:'currency', currency:'USD', maximumFractionDigits:0 })
    .format(Number(match[1].replaceAll(',', '')));
  return savedSource(locale, 'From {amount}', { amount });
}
